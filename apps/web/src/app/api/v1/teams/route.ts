import { CreateTeam } from '@contextops/schema'

import { teamMembers, teams } from '../../../../db/schema'
import { requireActor } from '../../../../lib/api/auth'
import { fail } from '../../../../lib/api/error'
import { parseBody, route } from '../../../../lib/api/route'

// =====================================================================
//  `POST /teams` — 로그인한 사람이면 누구나 (SPEC §5)
//
//  ★ 만든 사람이 곧 owner 다. 트랜잭션인 이유 — 팀만 생기고 멤버가 안 생기면
//    **아무도 손댈 수 없는 팀**이 남는다. 지울 방법도 없다 (owner 가 없으니).
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route('POST /teams', async (ctx) => {
  const actor = await requireActor(ctx.db, ctx.req, ctx.now)
  //  기기 토큰으로는 팀을 만들 수 없다 — 토큰은 프로젝트 안의 물건이다.
  if (actor.kind === 'device') fail('FORBIDDEN', '기기 토큰으로는 팀을 만들 수 없다')
  ctx.note({ user_id: actor.userId })

  const body = await parseBody(ctx.req, CreateTeam)

  const team = await ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(teams)
      .values({ slug: body.slug, name: body.name })
      .onConflictDoNothing({ target: teams.slug })
      .returning({ id: teams.id, slug: teams.slug, name: teams.name, settings: teams.settings })
    //  slug 는 전역 유일이다 (SPEC §2). 이미 있으면 만든 척하지 않는다.
    if (!row) fail('VALIDATION_FAILED', '이미 쓰이는 slug 다', [{ path: 'slug', message: '이미 쓰이는 slug 다' }])

    await tx.insert(teamMembers).values({
      teamId: row.id,
      userId: actor.userId,
      role: 'owner',
      status: 'active',
    })
    return row
  })

  return ctx.ok(team, 201)
})
