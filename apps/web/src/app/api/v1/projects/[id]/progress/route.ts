import { eq } from 'drizzle-orm'
import { ProgressEvent } from '@contextops/schema'

import { progressEvents } from '../../../../../../db/schema'
import { fail } from '../../../../../../lib/api/error'
import { requireDevice, requireProject } from '../../../../../../lib/api/guard'
import { PROGRESS_COLUMNS, toProgressEvent } from '../../../../../../lib/api/progress'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/progress` — device (SPEC §5) → 202
//  「client_event_id 중복은 200 idempotent」
//
//  ★ 왜 멱등이 필수인가 — 이걸 부르는 것은 Stop 훅과 agent 다. 둘 다 재시도하고,
//    사람이 보고 있지 않다. 중복이 쌓이면 Roadmap 의 근거 개수가 부풀고, 그러면
//    「근거 3건」이 사실은 같은 커밋 하나가 된다 — P7 이 말이 안 되는 상태다.
//
//  🔴 P1 — `evidence` 는 **경로와 줄 번호만**이다. 그 줄에 무엇이 적혀 있는지는
//     서버가 모르고, 계약에 담을 자리도 없다 (`ProgressEvidence`).
//  🔴 P5 — 이 이벤트는 **마일스톤에 붙는다.** 사람에게 붙는 점수가 아니다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/progress', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  const device = requireDevice(actor)
  await requireProject(ctx.db, actor, projectId, 'member')
  const body = await parseBody(ctx.req, ProgressEvent)

  const [existing] = await ctx.db
    .select(PROGRESS_COLUMNS)
    .from(progressEvents)
    .where(eq(progressEvents.clientEventId, body.client_event_id))
    .limit(1)
  //  ⚠ 같은 프로젝트의 것일 때만 돌려준다 — 아니면 event id 하나로 남의 보고를 읽는다.
  if (existing) {
    if (existing.project_id !== projectId) fail('VALIDATION_FAILED', '이미 쓰인 client_event_id 다')
    return ctx.ok(toProgressEvent(existing), 200)
  }

  const [created] = await ctx.db
    .insert(progressEvents)
    .values({
      projectId,
      deviceId: device.deviceId,
      milestoneId: body.milestone_id,
      criterion: body.criterion ?? null,
      status: body.status,
      evidence: body.evidence,
      summary: body.summary,
      contextVersion: body.context_version,
      source: body.source,
      clientEventId: body.client_event_id,
    })
    .returning(PROGRESS_COLUMNS)
  if (!created) fail('INTERNAL', '진행 보고를 저장하지 못했다')

  return ctx.ok(toProgressEvent(created), 202)
})
