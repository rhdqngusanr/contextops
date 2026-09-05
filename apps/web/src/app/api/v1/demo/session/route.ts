import { and, eq, isNull } from 'drizzle-orm'

import { projects, teamMembers, teams, users } from '../../../../../db/schema'
import { fail } from '../../../../../lib/api/error'
import { route } from '../../../../../lib/api/route'
import { signSessionJwt } from '../../../../../lib/api/session'
import { DEMO_ENTRY_PATH, DEMO_GUEST_SUBJECT, DEMO_SESSION_TTL_SEC, DEMO_TENANT } from '../../../../../lib/demo/tenant'

// =====================================================================
//  `POST /demo/session` — **인증 없이** 부르는 유일한 쓰기 문 (SPEC §9 「게스트 데모」)
//  → `{access_token, expires_at, entry_path}`
//
//  ★ 이 문이 하는 일은 하나다: 「데모 테넌트가 실제로 심어져 있으면, 그것을 읽을 수 있는
//    수명 짧은 세션을 하나 서명해서 준다.」 만드는 것은 **아무것도 없다** —
//    `users` 행도 팀 소속도 시드가 만든다 (`lib/demo/seed-demo.ts` · Cron 이 부르는
//    `GET /cron/demo-reset` 이 그 시드를 돌린다).
//
//  🔴 **심어져 있지 않으면 404 다.** 「일단 토큰은 주고 화면에서 404 를 보게」 하면
//     심사위원이 보는 것은 빈 화면이고 원인은 화면에 안 적힌다. 없는 것은 여기서 말한다.
//
//  ⚠ POST 인 이유 — 세션을 **발급**한다. GET 으로 두면 브라우저·프록시가 캐시할 수 있고,
//    캐시된 토큰은 만료가 지난 뒤에도 화면에 남는다.
//  ⚠ 이 응답에 이메일·사람 이름이 없다. 게스트는 데모 팀의 읽기 권한 하나만 받는다.
//  ⚠ 빈도 제한은 아직 없다 — 이 문은 LLM 을 안 부르고 행을 안 만든다 (서명 한 번).
//    돈이 드는 쪽(§7.4 `/demo/ai-once`)은 `withBudget()` 이 세는 자리이고, 그 문은
//    아직 없다 (FINDINGS 117 · P3).
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route('POST /demo/session', async (ctx) => {
  //  ⚠ `ctx.actor()` 를 부르지 않는다 — 이 문은 자격증명을 요구하지 않는다.
  //    그래서 로그의 `user_id` 도 비어 있다 (SPEC §11 — 없는 것을 지어내지 않는다).

  //  데모 팀 · 그 안의 프로젝트 · 게스트 행이 **셋 다** 있어야 들어갈 수 있다.
  const [team] = await ctx.db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.slug, DEMO_TENANT.teamSlug))
    .limit(1)
  if (!team) fail('NOT_FOUND', '데모 테넌트가 심어져 있지 않다')

  const [project] = await ctx.db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.teamId, team.id),
      eq(projects.slug, DEMO_TENANT.projectSlug),
      isNull(projects.deletedAt),
    ))
    .limit(1)
  if (!project) fail('NOT_FOUND', '데모 프로젝트가 심어져 있지 않다')

  const [guest] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.authSubject, DEMO_GUEST_SUBJECT))
    .limit(1)
  if (!guest) fail('NOT_FOUND', '데모 게스트가 심어져 있지 않다')

  //  🔴 **소속까지 확인한다.** 게스트 행만 있고 팀 소속이 없으면 토큰은 멀쩡한데
  //     모든 화면이 404 다 — 그 상태는 화면에서 「데모가 고장났다」로 보인다.
  const [membership] = await ctx.db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, guest.id),
      eq(teamMembers.status, 'active'),
    ))
    .limit(1)
  if (!membership) fail('NOT_FOUND', '데모 게스트가 팀에 속해 있지 않다')

  //  claims 는 `sub` 하나다 — 게스트에게 이메일·이름은 없다 (`signSessionJwt` 의 주석).
  const { token, expiresAt } = signSessionJwt({ sub: DEMO_GUEST_SUBJECT }, ctx.now, DEMO_SESSION_TTL_SEC)
  ctx.note({ project_id: project.id })

  return ctx.ok({
    access_token: token,
    expires_at: expiresAt,
    //  어디로 가야 하나를 **서버가 말한다** — 화면이 팀·프로젝트 slug 를 따로 조립하면
    //  데모 주소가 두 곳에 적히고, 한쪽만 바뀌면 배너와 실제 팀이 갈린다.
    entry_path: DEMO_ENTRY_PATH,
  }, 201)
})
