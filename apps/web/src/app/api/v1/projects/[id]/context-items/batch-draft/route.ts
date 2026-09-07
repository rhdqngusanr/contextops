import { and, eq } from 'drizzle-orm'
import { ContextItemDraft, ContextItemsBatchDraftEnvelope, ContextItemsBatchDraftResult } from '@contextops/schema'
//  ⚠ 값과 **타입**을 따로 들여온다. 유니온 스키마의 `z.infer` 는 느슨해서 `unknown` 이
//    되고, 정밀한 타입은 `packages/schema` 가 mapped type 으로 따로 낸다 (item.ts 주석).
import type { ContextItemDraft as Draft } from '@contextops/schema'

import { repos } from '../../../../../../../db/schema'
import { createJob, startJob } from '../../../../../../../lib/ai/job'
import { requireProject } from '../../../../../../../lib/api/guard'
import { insertDrafts, type DraftEntry, type DraftInsertResult } from '../../../../../../../lib/api/item'
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
    return ctx.ok(ContextItemsBatchDraftResult.parse({
      accepted: [],
      rejected: body.items.map((_, index) => ({
        index,
        issues: [{ path: 'repo', message: `등록되지 않은 레포다: ${body.repo}` }],
      })),
      job_id: null,
    }), 200)
  }

  const rejected: DraftInsertResult['rejected'] = []
  const entries: DraftEntry[] = []

  body.items.forEach((raw, index) => {
    const parsed = ContextItemDraft.safeParse(raw)
    if (parsed.success) entries.push({ index, draft: parsed.data as Draft })
    else rejected.push({ index, issues: issuesOf(parsed.error) })
  })

  const accepted: DraftInsertResult['accepted'] = []
  await ctx.db.transaction(async (tx) => {
    //  🔴 넣는 코드는 여기 없다 — `insertDrafts()` 하나다 (`lib/api/item.ts`).
    //     이 문이 정하는 것은 `origin` 뿐이다: scan 이 코드를 훑어 만든 초안이다 (SPEC §2).
    const done = await insertDrafts(tx, {
      projectId, entries, origin: 'code', createdBy: actor.userId,
    })
    accepted.push(...done.accepted)
    rejected.push(...done.rejected)

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

  //  🔴 **계약으로 한 번 파싱해서 낸다** (FINDINGS 44). 손으로 만든 객체를 그대로 내면
  //     계약이 **받는 쪽에서만** 강제되고, 칸이 하나 어긋난 순간 시험은 초록인데
  //     `upload-draft` 만 「서버 응답이 계약과 맞지 않는다」로 죽는다 — 실제로 그랬다.
  return ctx.ok(ContextItemsBatchDraftResult.parse({ accepted, rejected, job_id: job?.id ?? null }))
})
