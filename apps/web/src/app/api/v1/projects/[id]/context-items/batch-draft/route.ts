import { and, eq, inArray } from 'drizzle-orm'
import { ContextItemDraft, ContextItemsBatchDraftEnvelope } from '@contextops/schema'
//  ⚠ 값과 **타입**을 따로 들여온다. 유니온 스키마의 `z.infer` 는 느슨해서 `unknown` 이
//    되고, 정밀한 타입은 `packages/schema` 가 mapped type 으로 따로 낸다 (item.ts 주석).
import type { ContextItemDraft as Draft } from '@contextops/schema'

import { contextItemRevisions, contextItems, repos } from '../../../../../../../db/schema'
import { createJob, startJob } from '../../../../../../../lib/ai/job'
import { requireProject } from '../../../../../../../lib/api/guard'
import { issuesOf, parseBody, pathUuid, route } from '../../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/context-items:batch-draft` — member/device (SPEC §5)
//
//  ⚠ 경로가 SPEC 의 `:batch-draft` 가 아니라 `/batch-draft` 다. 콜론은 **Windows 의
//    파일 이름에 못 쓰고**, App Router 의 경로는 폴더 이름이다. SPEC 쪽을 고쳐야 한다
//    (docs/feedback/FINDINGS.md).
//
//  ★ 항목별로 받는다 (`{accepted, rejected[{index, issues}]}`). 40개 중 하나가
//    어긋났다고 전부 버리면 scan 결과는 영원히 안 들어간다.
//
//  🔴 SPEC §5 「… · **충돌 탐지 job 시작**(§7.2)」. 들어온 항목이 하나도 없으면
//     job 을 만들지 않는다 — 빈 탐지는 §7.5 의 시간당 상한만 태운다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/context-items/batch-draft', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const body = await parseBody(ctx.req, ContextItemsBatchDraftEnvelope)

  //  근거의 `repo` 가 등록된 이름을 가리키는지 확인한다 — 오타 하나면 P7 이 끊긴다.
  const [repo] = await ctx.db
    .select({ id: repos.id })
    .from(repos)
    .where(and(eq(repos.projectId, projectId), eq(repos.name, body.repo)))
    .limit(1)
  if (!repo) {
    return ctx.ok({
      accepted: [],
      rejected: body.items.map((_, index) => ({
        index,
        issues: [{ path: 'repo', message: `등록되지 않은 레포다: ${body.repo}` }],
      })),
    }, 200)
  }

  type Rejected = { index: number; issues: { path: string; message: string }[] }
  const rejected: Rejected[] = []
  const drafts: { index: number; draft: Draft }[] = []

  body.items.forEach((raw, index) => {
    const parsed = ContextItemDraft.safeParse(raw)
    if (parsed.success) drafts.push({ index, draft: parsed.data as Draft })
    else rejected.push({ index, issues: issuesOf(parsed.error) })
  })

  //  같은 batch 안의 중복도, 이미 DB 에 있는 id 도 거부한다 — 조용히 덮어쓰면
  //  scan 을 두 번 돌린 사람이 남의 항목을 지우게 된다. 고치는 문은 부분 갱신이다.
  const seen = new Set<string>()
  const wanted: typeof drafts = []
  for (const entry of drafts) {
    const id = entry.draft.id
    if (seen.has(id)) {
      rejected.push({ index: entry.index, issues: [{ path: 'id', message: '같은 요청 안에서 중복된 id 다' }] })
      continue
    }
    seen.add(id)
    wanted.push(entry)
  }

  const existing = wanted.length === 0
    ? []
    : await ctx.db
      .select({ publicId: contextItems.publicId })
      .from(contextItems)
      .where(and(
        eq(contextItems.projectId, projectId),
        inArray(contextItems.publicId, wanted.map((e) => e.draft.id)),
      ))
  const taken = new Set(existing.map((r) => r.publicId))

  const accepted: { index: number; id: string }[] = []
  await ctx.db.transaction(async (tx) => {
    for (const { index, draft } of wanted) {
      if (taken.has(draft.id)) {
        rejected.push({ index, issues: [{ path: 'id', message: '이미 있는 항목 id 다' }] })
        continue
      }
      const [item] = await tx
        .insert(contextItems)
        .values({
          projectId,
          publicId: draft.id,
          type: draft.type,
          //  🔴 `status` 는 서버가 정한다. 초안은 언제나 draft 다 — 승인 없이
          //     active 가 되면 발행 절차가 무의미해진다 (계약에도 자리가 없다).
          status: 'draft',
          currentRevision: 1,
          scope: draft.scope,
          priority: draft.priority,
          ownerId: draft.owner_id ?? null,
        })
        .returning({ id: contextItems.id })
      if (!item) continue

      await tx.insert(contextItemRevisions).values({
        itemId: item.id,
        revision: 1,
        title: draft.title,
        body: draft.body,
        tags: draft.tags,
        validFrom: draft.valid_from ?? null,
        validUntil: draft.valid_until ?? null,
        data: draft.data,
        sourceRefs: draft.source_refs,
        confidence: draft.confidence,
        createdBy: actor.userId,
        //  scan 이 코드를 훑어 만든 초안이다 (SPEC §2 `origin`).
        origin: 'code',
      })
      accepted.push({ index, id: draft.id })
    }

    //  scan 요약을 버리지 않는다 — 버리면 보내는데 아무도 안 읽는 필드가 된다.
    await tx
      .update(repos)
      .set({ lastScan: body.scan_summary, lastScanAt: ctx.now })
      .where(eq(repos.id, repo.id))
  })

  rejected.sort((a, b) => a.index - b.index)

  //  🔴 **바뀐 항목 묶음 하나 = 탐지 한 번**이다 (§7.2 · `features.ts` 의 `conflict` 칸).
  //     받아들인 것이 없으면 부를 것도 없다.
  const job = accepted.length === 0 ? null : await createJob(ctx.db, {
    projectId,
    feature: 'conflict',
    input: { changed_item_ids: accepted.map((a) => a.id) },
  })
  if (job) startJob(job.id)

  return ctx.ok({ accepted, rejected, job })
})
