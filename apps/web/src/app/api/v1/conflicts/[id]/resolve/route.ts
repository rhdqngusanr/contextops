import { eq } from 'drizzle-orm'
import { ResolveConflict } from '@contextops/schema'

import { conflicts } from '../../../../../../db/schema'
import { CONFLICT_COLUMNS, RESOLUTION_OUTCOME, toConflict } from '../../../../../../lib/api/conflict'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /conflicts/{id}:resolve` — owner (SPEC §5)
//
//  ⚠ 경로가 `/conflicts/{id}/resolve` 다 — 콜론은 Windows 파일 이름에 못 쓴다
//    (batch-draft 와 같은 이유 · FINDINGS).
//
//  ⚠ SPEC 은 「→ 항목 상태 갱신」이라고 적지만 지금은 **결정만 기록한다.**
//    충돌이 어느 항목을 가리키는지는 §7.2 가 `a_item_id`·`b_item_id` 로 낼 때 정해지고
//    (PLAN P3), 그 전에 `a_ref`(SourceRef)에서 항목을 추측하면 **엉뚱한 항목을 폐기한다.**
//    골라진 값은 `resolution.choice` 에 남아 있어서 그때 그대로 적용할 수 있다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /conflicts/{id}/resolve', async (ctx) => {
  const actor = await ctx.actor()
  const conflictId = pathUuid(ctx.params.id, 'conflict id')

  const [row] = await ctx.db
    .select({ id: conflicts.id, projectId: conflicts.projectId, status: conflicts.status })
    .from(conflicts)
    .where(eq(conflicts.id, conflictId))
    .limit(1)
  if (!row) fail('NOT_FOUND', '충돌을 찾을 수 없다')
  ctx.note({ project_id: row.projectId })

  await requireProject(ctx.db, actor, row.projectId, 'owner')
  //  이미 처리된 충돌을 다시 뒤집지 않는다 — 뒤집으려면 새 충돌이 떠야 한다.
  if (row.status !== 'open') fail('VALIDATION_FAILED', '이미 처리된 충돌이다')

  const body = await parseBody(ctx.req, ResolveConflict)

  const [updated] = await ctx.db
    .update(conflicts)
    .set({
      status: RESOLUTION_OUTCOME[body.choice],
      resolution: body.note === undefined ? { choice: body.choice } : { choice: body.choice, note: body.note },
      resolvedBy: actor.userId,
      resolvedAt: ctx.now,
      updatedAt: ctx.now,
    })
    .where(eq(conflicts.id, conflictId))
    .returning(CONFLICT_COLUMNS)
  if (!updated) fail('INTERNAL', '충돌을 갱신하지 못했다')

  return ctx.ok(toConflict(updated))
})
