import { eq } from 'drizzle-orm'

import { devices } from '../../../../../db/schema'
import { requireActor } from '../../../../../lib/api/auth'
import { fail } from '../../../../../lib/api/error'
import { requireProject } from '../../../../../lib/api/guard'
import { pathUuid, route } from '../../../../../lib/api/route'

// =====================================================================
//  `DELETE /devices/{id}` — 본인 또는 owner (SPEC §5) → 204
//
//  ★ 행을 지우지 않고 `revoked_at` 을 찍는다. sync 보고가 그 기기를 가리키고 있어서
//    지우면 「누가 무엇을 적용했나」의 기록이 통째로 끊긴다 (SPEC §2 의 soft delete 규칙).
// =====================================================================

export const dynamic = 'force-dynamic'

export const DELETE = route<{ id: string }>('DELETE /devices/{id}', async (ctx) => {
  const actor = await requireActor(ctx.db, ctx.req, ctx.now)
  const deviceId = pathUuid(ctx.params.id, 'device id')
  ctx.note({ user_id: actor.userId })

  const [device] = await ctx.db
    .select({ id: devices.id, userId: devices.userId, projectId: devices.projectId, revokedAt: devices.revokedAt })
    .from(devices)
    .where(eq(devices.id, deviceId))
    .limit(1)
  if (!device) fail('NOT_FOUND', '기기를 찾을 수 없다')
  ctx.note({ project_id: device.projectId })

  //  본인이면 member 로 충분하고, 남의 기기를 끄려면 owner 여야 한다.
  const own = device.userId === actor.userId
  await requireProject(ctx.db, actor, device.projectId, own ? 'member' : 'owner')

  //  이미 취소된 기기에 다시 불러도 204 다 (같은 요청을 두 번 보내도 같은 결과여야 한다).
  if (device.revokedAt === null) {
    await ctx.db.update(devices).set({ revokedAt: ctx.now }).where(eq(devices.id, deviceId))
  }
  return ctx.noContent()
})
