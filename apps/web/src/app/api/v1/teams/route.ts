import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { CreateTeam, type TeamRole } from '@contextops/schema'

import { projects, teamMembers, teams } from '../../../../db/schema'
import { fail } from '../../../../lib/api/error'
import { parseBody, route } from '../../../../lib/api/route'

// =====================================================================
//  `/teams` — 내 팀 목록(GET) · 팀 만들기(POST) (SPEC §5)
//
//  ★ `GET` 이 왜 생겼나 — SPEC §5 표에는 `POST /teams` 만 있었다. 그런데 화면의 주소는
//    **slug** 다 (`/t/{team}/p/{project}/context` — SPEC §9). 라우트는 전부 uuid 를
//    받으므로, 브라우저가 slug 를 uuid 로 바꿀 문이 없으면 **로그인 다음 화면으로
//    갈 수가 없다.** SPEC 과 코드의 차이는 FINDINGS 에 적었다.
//
//  ★ 프로젝트를 같이 싣는 이유 — 좌측 내비가 「팀/프로젝트 스위처」다
//    (DESIGN_BRIEF §3 「레이아웃」). 팀마다 한 번씩 더 부르면 화면이 열릴 때
//    요청이 N+1 이 되고, 그 N 은 팀 수라서 늘어난다.
//
//  ⚠ 이 문은 **본인이 속한 팀만** 낸다. 목록에 없는 팀은 존재 자체가 안 보인다
//    (`lib/api/guard.ts` 의 「없으면 404 · 남의 것이면 403」과 같은 이유).
// =====================================================================

export const dynamic = 'force-dynamic'

type TeamRow = {
  id: string
  slug: string
  name: string
  role: TeamRole
  projects: { id: string; slug: string; name: string; description: string | null; official_version_id: string | null }[]
}

export const GET = route('GET /teams', async (ctx) => {
  const actor = await ctx.actor()
  //  기기 토큰은 프로젝트 안의 물건이다 — 팀 목록을 읽는 열쇠가 되면 토큰 하나로
  //  팀 전체의 구조가 드러난다 (`ACTOR_RULES` 과 같은 이유).
  if (actor.kind === 'device') fail('FORBIDDEN', '기기 토큰으로는 팀 목록을 볼 수 없다')

  const memberships = await ctx.db
    .select({ id: teams.id, slug: teams.slug, name: teams.name, role: teamMembers.role })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(eq(teamMembers.userId, actor.userId), eq(teamMembers.status, 'active')))
    .orderBy(asc(teams.slug))

  const byTeam = new Map<string, TeamRow>(
    memberships.map((t) => [t.id, { ...t, projects: [] }]),
  )

  //  ⚠ 소속이 없으면 `inArray(…, [])` 를 보내지 않는다 — 빈 배열은 드라이버마다
  //    다르게 나가고, 여기서는 물어볼 것이 없다.
  if (byTeam.size > 0) {
    const rows = await ctx.db
      .select({
        id: projects.id,
        team_id: projects.teamId,
        slug: projects.slug,
        name: projects.name,
        description: projects.description,
        official_version_id: projects.officialVersionId,
      })
      .from(projects)
      .where(and(inArray(projects.teamId, [...byTeam.keys()]), isNull(projects.deletedAt)))
      .orderBy(asc(projects.slug))

    for (const { team_id, ...p } of rows) byTeam.get(team_id)?.projects.push(p)
  }

  return ctx.ok({ teams: [...byTeam.values()] })
})

// =====================================================================
//  `POST /teams` — 로그인한 사람이면 누구나 (SPEC §5)
//
//  ★ 만든 사람이 곧 owner 다. 트랜잭션인 이유 — 팀만 생기고 멤버가 안 생기면
//    **아무도 손댈 수 없는 팀**이 남는다. 지울 방법도 없다 (owner 가 없으니).
// =====================================================================

export const POST = route('POST /teams', async (ctx) => {
  const actor = await ctx.actor()
  //  기기 토큰으로는 팀을 만들 수 없다 — 토큰은 프로젝트 안의 물건이다.
  if (actor.kind === 'device') fail('FORBIDDEN', '기기 토큰으로는 팀을 만들 수 없다')

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
