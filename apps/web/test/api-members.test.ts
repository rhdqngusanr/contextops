import type { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GET as listTeams, POST as createTeam } from '../src/app/api/v1/teams/route'
import { GET as listMembersRoute, POST as inviteRoute } from '../src/app/api/v1/teams/[id]/members/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { GET as listItems } from '../src/app/api/v1/projects/[id]/context-items/route'
import { teamMembers, users } from '../src/db/schema'
import type { Db } from '../src/db/client'
import { INVITE_SUBJECT_PREFIX } from '../src/lib/api/members'
import { CREATION_LIMITS } from '../src/lib/api/limits'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  팀원 초대 · 첫 로그인 승격 · 만들기 상한 (INBOX H9 · H11 · 2026-09-10)
//
//  ★ 심사위원의 두 번째 질문 — 「팀원은 어떻게 합류하나」. 답은 이메일 초대 + 그 이메일로 첫 로그인이다.
//    여기서 그 길을 **라우트로만** 밟는다: 초대 전엔 404(존재도 안 보인다) → 초대 → 로그인 → 200 · member 는 발행 403.
// =====================================================================

let pg: PGlite | undefined
let db: Db

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
})

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

async function seed() {
  const owner = sessionJwt('owner-sub', { email: 'owner@paylab.test' })
  const team = await dataOf(await createTeam(req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }), params({})))
  const teamId = team.id as string
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }), params({ id: teamId }),
  ))
  return { owner, teamId, projectId: project.id as string }
}

const invite = (auth: string, teamId: string, body: unknown) =>
  inviteRoute(req('POST', `/api/v1/teams/${teamId}/members`, { auth, body }), params({ id: teamId }))

describe('초대 전 → 초대 → 첫 로그인 (INBOX H9)', () => {
  it('🔴 아직 로그인한 적 없는 사람 — 초대는 자리표시 행이고, 그 이메일로 처음 로그인하면 그 행이 그 사람이 된다', async () => {
    const { owner, teamId, projectId } = await seed()

    //  초대 — 이 사람은 한 번도 로그인한 적이 없다. 자리표시 행 + `invited`.
    const res = await invite(owner, teamId, { email: 'HaEun@paylab.test', role: 'member' })
    expect(res.status).toBe(201)
    const made = await dataOf(res)
    expect(made).toMatchObject({ role: 'member', status: 'invited' })
    const [placeholder] = await db.select({ subject: users.authSubject }).from(users).where(eq(users.id, made.user_id as string))
    expect(placeholder?.subject).toBe(`${INVITE_SUBJECT_PREFIX}haeun@paylab.test`)

    //  첫 로그인 = 수락 — 아무 라우트나 한 번 지나면 `sessionActor()` 가 승격한다. 대소문자가 달라도 같은 사람이다.
    const newcomer = sessionJwt('haeun-sub', { email: 'haeun@Paylab.test', name: '김하은' })
    const teams = await dataOf(await listTeams(req('GET', '/api/v1/teams', { auth: newcomer }), params({})))
    expect((teams.teams as { slug: string; role: string }[]).map((t) => [t.slug, t.role])).toEqual([['paylab', 'member']])
    const [adopted] = await db.select({ subject: users.authSubject, name: users.name, email: users.email }).from(users).where(eq(users.id, made.user_id as string))
    expect(adopted?.subject).toBe('haeun-sub')
    expect(adopted?.name).toBe('김하은')
    expect(adopted?.email).toBe('haeun@paylab.test')
    const [membership] = await db.select({ status: teamMembers.status }).from(teamMembers)
      .where(eq(teamMembers.userId, made.user_id as string))
    expect(membership?.status).toBe('active')
    //  사람은 하나다 — 같은 이메일의 행이 둘이 아니다.
    expect(await db.select({ id: users.id }).from(users).where(eq(users.email, 'haeun@paylab.test'))).toHaveLength(1)

    //  이제 읽힌다 — 그리고 member 라 발행은 403 이다 (owner 문).
    expect((await listItems(req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: newcomer }), params({ id: projectId }))).status).toBe(200)
    const pub = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: newcomer, body: { semver: '1.0.0', base_version_id: null },
    }), params({ id: projectId }))
    expect(pub.status).toBe(403)
  })

  it('🔴 먼저 로그인해 둔 사람 — 초대 전에는 그 팀이 404 이고, 초대하면 바로 active 라 200 이다', async () => {
    const { owner, teamId, projectId } = await seed()
    const early = sessionJwt('early-sub', { email: 'Early@paylab.test', name: '이서준' })
    //  로그인은 했지만 팀이 없다 — 팀의 존재도 안 보인다 (guard 의 404).
    expect((await listItems(req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: early }), params({ id: projectId }))).status).toBe(404)

    const made = await dataOf(await invite(owner, teamId, { email: 'early@paylab.test' }))
    expect(made).toMatchObject({ name: '이서준', role: 'member', status: 'active' })
    //  자리표시 행을 만들지 않았다 — 로그인 때 소문자로 저장했으므로 초대가 그 사람을 찾았다.
    expect(await db.select({ id: users.id }).from(users).where(eq(users.email, 'early@paylab.test'))).toHaveLength(1)
    expect((await listItems(req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: early }), params({ id: projectId }))).status).toBe(200)
  })

  it('이미 로그인한 적 있는 사람을 초대하면 바로 active 다', async () => {
    const { owner, teamId } = await seed()
    const known = sessionJwt('known-sub', { email: 'known@paylab.test', name: '박지민' })
    await listTeams(req('GET', '/api/v1/teams', { auth: known }), params({}))

    const made = await dataOf(await invite(owner, teamId, { email: 'known@paylab.test' }))
    expect(made).toMatchObject({ name: '박지민', role: 'member', status: 'active' })
  })

  it('같은 사람을 두 번 초대하면 400 이고, member 는 초대할 수 없다(403), 남은 팀은 404 다', async () => {
    const { owner, teamId } = await seed()
    expect((await invite(owner, teamId, { email: 'a@paylab.test' })).status).toBe(201)
    const dup = await invite(owner, teamId, { email: 'A@paylab.test' })
    expect(dup.status).toBe(400)
    expect((await errorOf(dup)).code).toBe('VALIDATION_FAILED')

    const member = sessionJwt('m-sub', { email: 'a@paylab.test' })
    await listTeams(req('GET', '/api/v1/teams', { auth: member }), params({}))
    expect((await invite(member, teamId, { email: 'b@paylab.test' })).status).toBe(403)

    const stranger = sessionJwt('s-sub', { email: 's@paylab.test' })
    expect((await invite(stranger, teamId, { email: 'c@paylab.test' })).status).toBe(404)
  })

  it('목록은 이름·등급·상태뿐이다 — 이메일이 응답 어디에도 없다 (owner 먼저)', async () => {
    const { owner, teamId } = await seed()
    await invite(owner, teamId, { email: 'zed@paylab.test' })
    const res = await listMembersRoute(req('GET', `/api/v1/teams/${teamId}/members`, { auth: owner }), params({ id: teamId }))
    expect(res.status).toBe(200)
    const body = JSON.stringify(await dataOf(res))
    expect(body).not.toContain('@')
    const list = (JSON.parse(body) as { members: { role: string; status: string }[] }).members
    expect(list[0]?.role).toBe('owner')
    expect(list.map((m) => m.status)).toEqual(['active', 'invited'])
  })
})

describe('만들기 상한 (INBOX H11)', () => {
  it(`팀은 계정당 ${CREATION_LIMITS.TEAM_LIMIT.max}개까지 — 그 다음은 400 TEAM_LIMIT`, async () => {
    const who = sessionJwt('maker-sub', { email: 'maker@paylab.test' })
    for (let i = 0; i < CREATION_LIMITS.TEAM_LIMIT.max; i++) {
      const res = await createTeam(req('POST', '/api/v1/teams', { auth: who, body: { name: `T${i}`, slug: `team-${i}` } }), params({}))
      expect(res.status, `${i + 1}번째`).toBe(201)
    }
    const over = await createTeam(req('POST', '/api/v1/teams', { auth: who, body: { name: 'Over', slug: 'team-over' } }), params({}))
    expect(over.status).toBe(400)
    const err = await errorOf(over)
    expect(err.code).toBe('VALIDATION_FAILED')
    expect((err.details as { code?: string }).code).toBe('TEAM_LIMIT')
  })

  it(`프로젝트는 팀당 ${CREATION_LIMITS.PROJECT_LIMIT.max}개까지 — 그 다음은 400 PROJECT_LIMIT`, async () => {
    const { owner, teamId } = await seed()   // 이미 1개
    for (let i = 1; i < CREATION_LIMITS.PROJECT_LIMIT.max; i++) {
      const res = await createProject(req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: `P${i}`, slug: `p-${i}` } }), params({ id: teamId }))
      expect(res.status, `${i + 1}번째`).toBe(201)
    }
    const over = await createProject(req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'Over', slug: 'p-over' } }), params({ id: teamId }))
    expect(over.status).toBe(400)
    expect(((await errorOf(over)).details as { code?: string }).code).toBe('PROJECT_LIMIT')
  })
})
