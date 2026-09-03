import { CreateToken } from '@contextops/schema'

import { devices } from '../../../../../../db/schema'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'
import { mintToken, tokenExpiry } from '../../../../../../lib/api/token'

// =====================================================================
//  `POST /projects/{id}/tokens` — member (SPEC §5 · §11)
//
//  🔴 **응답의 `token` 은 이 한 번뿐이다.** DB 에는 sha256 만 들어가서 다시 만들 수 없다.
//     잃어버리면 새로 발급받는다 — 그게 「DB엔 sha256만」의 대가이고, 그 대가를
//     치르는 이유는 DB 가 새도 남의 기기가 되지 않기 때문이다.
//
//  ⚠ 기기 토큰으로 또 토큰을 만들 수 없다. 토큰 하나가 무한히 번식하면
//     하나를 취소해도 소용이 없다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/tokens', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  if (actor.kind === 'device') fail('FORBIDDEN', '기기 토큰으로는 토큰을 발급할 수 없다')
  await requireProject(ctx.db, actor, projectId, 'member')

  const body = await parseBody(ctx.req, CreateToken)
  const { token, hash } = mintToken()

  const [row] = await ctx.db
    .insert(devices)
    .values({
      userId: actor.userId,
      projectId,
      name: body.device_name,
      tokenHash: hash,
      expiresAt: tokenExpiry(ctx.now),
    })
    .returning({ id: devices.id, expiresAt: devices.expiresAt })
  if (!row) fail('INTERNAL', '기기 행을 만들지 못했다')

  return ctx.ok({ token, device_id: row.id, expires_at: row.expiresAt.toISOString() }, 201)
})
