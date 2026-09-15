import { and, eq } from 'drizzle-orm'
import { AcceptJobItems, ContextItemDraft, ContextItemsBatchDraftResult } from '@contextops/schema'
//  ⚠ 값과 **타입**을 따로 들여온다 — 유니온 스키마의 `z.infer` 는 느슨하다 (item.ts 주석).
import type { ContextItemDraft as Draft } from '@contextops/schema'

import { aiJobs } from '../../../../../../../../db/schema'
import { createJob, startJob } from '../../../../../../../../lib/ai/job'
import { fail } from '../../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../../lib/api/guard'
import { insertDrafts, type DraftEntry, type DraftInsertResult } from '../../../../../../../../lib/api/item'
import { parseBody, pathUuid, route } from '../../../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/jobs/{jobId}/items` — member (SPEC §5 · §7.1 · §9 화면 3)
//
//  🔴 **§7.1 이 낸 항목 후보가 항목이 되는 유일한 문이다** (FINDINGS 84).
//    이 문이 없을 때 구조화 결과는 `ai_jobs.result` 안에서 끝났다 — 화면은
//    「항목 후보 6개를 찾았습니다」라고 말하는데 Context 는 비어 있었고, 문서를
//    올리는 길로 들어온 사람은 발행까지 갈 수 없었다.
//
//  ★ 왜 job 아래인가 — 후보는 job 의 산출물이고 다른 데 없다. 그리고 「남의 job 을
//    읽지 못한다」를 지키는 조건(`requireProject` + `project_id`)이 이미 이 경로에 있다.
//    최상위로 두면 job id 하나로 남의 팀 문서에서 뽑은 초안을 자기 프로젝트에 심을 수 있다.
//
//  🔴 **사람이 고른 것만 만든다** (§7.1 마지막 줄). 서버가 후보를 전부 넣으면
//    「모델이 뽑은 것」과 「사람이 승인한 것」이 같은 뜻이 되고, 승인 절차가 사라진다.
//    body 에 오는 것은 후보의 **id 뿐**이다 — 본문이 같이 오면 화면이 모델 출력을
//    고쳐 되보낼 수 있고, 그 항목의 근거는 여전히 원문 구간을 가리켜서 **원문에 없는
//    문장이 원문을 근거로 배포된다** (P7 · `AcceptJobItems` 주석).
//
//  ⚠ 넣는 코드는 여기 없다 — `insertDrafts()` 하나다. 이 문이 정하는 것은
//    `origin: 'doc'` 뿐이고, 그래서 §7.2 의 `doc_vs_code` 가 실데이터로 날 수 있게 된다
//    (FINDINGS 31 — 그 값을 찍는 자리가 여기가 생기기 전까지 0곳이었다).
//
//  🔴 **받아들인 것이 있으면 충돌 탐지 job 을 시작한다** (§7.2 · FINDINGS 174).
//    이 문이 탐지를 안 부르던 동안 탐지를 시작하는 문은 플러그인의 `batch-draft` 하나였다 —
//    웹에서 문서만 올리는 팀은 정리 화면에 AI 가 찾은 충돌 카드가 **한 장도** 안 떴다
//    (2026-09-15 production 한 바퀴). 「바뀐 항목 묶음 하나 = 탐지 한 번」은 어느 문으로
//    들어왔든 같다. 그래서 응답도 `batch-draft` 와 **같은 계약**(`ContextItemsBatchDraftResult`)이다.
// =====================================================================

export const dynamic = 'force-dynamic'
//  ⚠ 응답 뒤 `after()` 에서 충돌 탐지 job 이 돈다 — 상한의 정본과 이유는 `lib/api/vercel.ts`. 리터럴이어야 Next 가 읽는다.
export const maxDuration = 300

/** job 의 `result` 에서 **항목 후보만** 꺼낸다. 모양이 다르면 `undefined` 다. */
function candidatesOf(result: unknown): unknown[] | undefined {
  if (typeof result !== 'object' || result === null) return undefined
  const items = (result as { items?: unknown }).items
  return Array.isArray(items) ? items : undefined
}

export const POST = route<{ id: string; jobId: string }>(
  'POST /projects/{id}/jobs/{jobId}/items',
  async (ctx) => {
    const actor = await ctx.actor()
    const projectId = pathUuid(ctx.params.id, 'project id')
    const jobId = pathUuid(ctx.params.jobId, 'job id')
    ctx.note({ project_id: projectId })

    await requireProject(ctx.db, actor, projectId, 'member')
    const body = await parseBody(ctx.req, AcceptJobItems)

    //  ⚠ 없는 job 과 **남의 job** 은 같은 404 다 (`jobs/{jobId}` 와 같은 이유).
    const [job] = await ctx.db
      .select({ feature: aiJobs.feature, status: aiJobs.status, result: aiJobs.result })
      .from(aiJobs)
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.projectId, projectId)))
      .limit(1)
    if (!job) fail('NOT_FOUND', '그 프로젝트의 job 이 아니다')

    //  🔴 §7.1 말고 다른 기능의 job 에는 항목 후보가 없다. 「없어서 0건」과
    //     「애초에 물을 것이 아닌 job」을 같은 답으로 내면 화면이 갈래를 못 만든다.
    if (job.feature !== 'structure') {
      fail('VALIDATION_FAILED', `항목 후보를 내는 job 이 아니다 (${job.feature})`)
    }
    if (job.status !== 'succeeded') {
      fail('VALIDATION_FAILED', `아직 끝나지 않은 job 이다 (${job.status})`)
    }

    const candidates = candidatesOf(job.result)
    if (!candidates) fail('AI_OUTPUT_INVALID', '이 job 의 결과에서 항목 후보를 읽지 못했다')

    //  후보를 id 로 찾는다. 🔴 **본문은 job 의 것을 쓴다** — 요청이 준 것이 아니다.
    const byId = new Map<string, unknown>()
    for (const raw of candidates) {
      const id = (raw as { id?: unknown }).id
      if (typeof id === 'string') byId.set(id, raw)
    }

    const rejected: DraftInsertResult['rejected'] = []
    const entries: DraftEntry[] = []
    body.item_ids.forEach((id, index) => {
      const raw = byId.get(id)
      if (raw === undefined) {
        rejected.push({ index, issues: [{ path: 'item_ids', message: `이 job 의 후보가 아니다: ${id}` }] })
        return
      }
      //  ⚠ 후보도 **다시 판다.** 모델이 낸 것이고 `result` 는 job 이 도는 동안 만들어졌다 —
      //     그 사이에 계약이 좁아졌으면 여기서 걸러야 한다 (P1 allowlist 는 한 벌이다).
      const parsed = ContextItemDraft.safeParse(raw)
      if (parsed.success) entries.push({ index, draft: parsed.data as Draft })
      else rejected.push({ index, issues: [{ path: 'item_ids', message: `후보가 계약과 맞지 않는다: ${id}` }] })
    })

    const accepted: DraftInsertResult['accepted'] = []
    if (entries.length > 0) {
      await ctx.db.transaction(async (tx) => {
        const done = await insertDrafts(tx, {
          projectId, entries, origin: 'doc', createdBy: actor.userId,
        })
        accepted.push(...done.accepted)
        rejected.push(...done.rejected)
      })
    }

    rejected.sort((a, b) => a.index - b.index)

    //  🔴 **바뀐 항목 묶음 하나 = 탐지 한 번**이다 (§7.2 · `batch-draft` 와 같은 줄).
    //     받아들인 것이 없으면 부를 것도 없다 — 빈 탐지는 §7.5 의 시간당 상한만 태운다.
    //  ⚠ 트랜잭션 **밖에서** 만든다 — 안에서 만들면 러너가 아직 커밋되지 않은 항목을 읽으러 간다.
    const detection = accepted.length === 0 ? null : await createJob(ctx.db, {
      projectId,
      feature: 'conflict',
      input: { changed_item_ids: accepted.map((a) => a.id) },
    })
    if (detection) startJob(detection.id)

    //  계약으로 한 번 파싱해서 낸다 — 손으로 만든 객체는 계약을 받는 쪽에서만 강제한다 (FINDINGS 44).
    return ctx.ok(ContextItemsBatchDraftResult.parse({ accepted, rejected, job_id: detection?.id ?? null }), 201)
  },
)
