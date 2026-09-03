import { eq } from 'drizzle-orm'

import { progressEvents } from '../../../../../../db/schema'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { PROGRESS_COLUMNS, toProgressEvent } from '../../../../../../lib/api/progress'
import { pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /progress/{id}/confirm` — owner (SPEC §5 「→ done 확정」)
//
//  🔴 **이 문이 「agent 가 스스로 완료를 선언하지 못한다」의 전부다.** 보고는 아무리
//     많아도 `done_candidate` 까지고, `done` 은 사람이 여기서 찍는다.
//     ⚠ 그래서 `done_candidate` 가 아닌 보고는 확정할 수 없다 — `in_progress` 를
//       확정할 수 있으면 위 문장이 거짓이 된다.
//
//  ⚠ 경로가 `/progress/{id}/confirm` 이다 (SPEC 의 옛 표기 `:confirm` 이 아니다 · FINDINGS 20).
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /progress/{id}/confirm', async (ctx) => {
  const actor = await ctx.actor()
  const eventId = pathUuid(ctx.params.id, 'progress id')

  const [row] = await ctx.db
    .select({
      id: progressEvents.id,
      projectId: progressEvents.projectId,
      status: progressEvents.status,
      confirmedAt: progressEvents.confirmedAt,
    })
    .from(progressEvents)
    .where(eq(progressEvents.id, eventId))
    .limit(1)
  if (!row) fail('NOT_FOUND', '진행 보고를 찾을 수 없다')
  ctx.note({ project_id: row.projectId })

  //  순서: 없으면 404 → 권한 → 상태. 상태를 먼저 보면 남의 프로젝트 보고의 상태가 샌다.
  await requireProject(ctx.db, actor, row.projectId, 'owner')
  if (row.status !== 'done_candidate') {
    fail('VALIDATION_FAILED', `done_candidate 보고만 확정할 수 있다 (지금은 ${row.status})`)
  }
  if (row.confirmedAt !== null) fail('VALIDATION_FAILED', '이미 확정된 보고다')

  const [updated] = await ctx.db
    .update(progressEvents)
    .set({ confirmedBy: actor.userId, confirmedAt: ctx.now })
    .where(eq(progressEvents.id, eventId))
    .returning(PROGRESS_COLUMNS)
  if (!updated) fail('INTERNAL', '보고를 확정하지 못했다')

  return ctx.ok(toProgressEvent(updated))
})
