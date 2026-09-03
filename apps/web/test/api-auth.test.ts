import type { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ROLE_RANK, TEAM_ROLES } from '@contextops/schema'

import { devices, teamMembers, users } from '../src/db/schema'
import type { Db } from '../src/db/client'
import { ACTOR_MAX_ROLE } from '../src/lib/api/auth'
import { TOKEN_PREFIX } from '../src/lib/api/token'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../src/app/api/v1/projects/[id]/repos/route'
import { POST as createToken } from '../src/app/api/v1/projects/[id]/tokens/route'
import { DELETE as revokeDevice } from '../src/app/api/v1/devices/[id]/route'
import { GET as listItems } from '../src/app/api/v1/projects/[id]/context-items/route'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  인증과 권한 2단계 (SPEC §5 · §11 · docs/PLAN.md P1 「API 1군」)
//
//  ★ 이 파일이 재는 것 — 「막는가」와 「통과시키는가」를 **같은 자리에서 둘 다** 본다.
//    거부만 재면 「전부 막는 서버」와 구별이 안 된다 (test/migration.test.ts 와 같은 규칙).
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

/** owner 한 명 · 그 팀의 프로젝트 하나. 전부 **라우트를 거쳐** 만든다. */
async function seed() {
  const owner = sessionJwt('owner-sub')
  const team = await dataOf(await createTeam(req('POST', '/api/v1/teams', {
    auth: owner, body: { name: 'Paylab', slug: 'paylab' },
  }), params({})))
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${team.id as string}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }),
    params({ id: team.id as string }),
  ))
  return { owner, teamId: team.id as string, projectId: project.id as string }
}

/** 두 번째 사람을 member 로 넣는다 — 초대 엔드포인트는 API 1군에 없다 (SPEC §5). */
async function addMember(teamId: string, sub: string): Promise<string> {
  const jwt = sessionJwt(sub)
  //  로그인 한 번으로 users 행이 생긴다 (JIT). 아무 member 라우트나 한 번 두드린다.
  await listItems(req('GET', '/api/v1/projects/x/context-items', { auth: jwt }), params({ id: 'x' }))
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.authSubject, sub)).limit(1)
  await db.insert(teamMembers).values({ teamId, userId: row!.id, role: 'member', status: 'active' })
  return jwt
}

describe('인증 — 자격증명이 없거나 어긋나면 401 이다', () => {
  it('헤더가 없으면 401 UNAUTHORIZED', async () => {
    const res = await createTeam(req('POST', '/api/v1/teams', { body: { name: 'a', slug: 'a-team' } }), params({}))
    expect(res.status).toBe(401)
    expect((await errorOf(res)).code).toBe('UNAUTHORIZED')
  })

  it('Bearer 가 아니면 401', async () => {
    const raw = new Request('http://localhost/api/v1/teams', {
      method: 'POST',
      headers: { authorization: 'Basic abc', 'content-type': 'application/json' },
      body: '{}',
    })
    expect((await createTeam(raw, params({}))).status).toBe(401)
  })

  it('서명이 다른 세션은 401 — 그리고 같은 요청이 옳은 서명이면 201', async () => {
    const good = sessionJwt('signer')
    const tampered = `${good.split('.').slice(0, 2).join('.')}.${'A'.repeat(43)}`
    const body = { name: 'Paylab', slug: 'paylab' }
    expect((await createTeam(req('POST', '/api/v1/teams', { auth: tampered, body }), params({}))).status).toBe(401)
    expect((await createTeam(req('POST', '/api/v1/teams', { auth: good, body }), params({}))).status).toBe(201)
  })

  it('alg:none 토큰은 통과하지 못한다', async () => {
    const jwt = sessionJwt('none-sub', { alg: 'none' })
    const res = await createTeam(req('POST', '/api/v1/teams', { auth: jwt, body: { name: 'a', slug: 'a-team' } }), params({}))
    expect(res.status).toBe(401)
  })

  it('만료된 세션은 401', async () => {
    const jwt = sessionJwt('old-sub', { expiresInSec: -60 })
    const res = await createTeam(req('POST', '/api/v1/teams', { auth: jwt, body: { name: 'a', slug: 'a-team' } }), params({}))
    expect(res.status).toBe(401)
    expect((await errorOf(res)).message).toContain('만료')
  })

  it('SUPABASE_JWT_SECRET 이 없으면 아무도 못 들어온다', async () => {
    delete process.env.SUPABASE_JWT_SECRET
    const res = await createTeam(req('POST', '/api/v1/teams', {
      auth: sessionJwt('x'), body: { name: 'a', slug: 'a-team' },
    }), params({}))
    expect(res.status).toBe(401)
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  })
})

describe('권한 2단계 — 같은 요청이 역할에 따라 갈린다', () => {
  it('member 는 레포를 못 만들고 owner 는 만든다 (같은 body · 같은 프로젝트)', async () => {
    const { owner, teamId, projectId } = await seed()
    const member = await addMember(teamId, 'member-sub')
    const body = { name: 'paylab-api' }

    const asMember = await createRepo(
      req('POST', `/api/v1/projects/${projectId}/repos`, { auth: member, body }),
      params({ id: projectId }),
    )
    expect(asMember.status).toBe(403)
    expect((await errorOf(asMember)).code).toBe('FORBIDDEN')

    const asOwner = await createRepo(
      req('POST', `/api/v1/projects/${projectId}/repos`, { auth: owner, body }),
      params({ id: projectId }),
    )
    expect(asOwner.status).toBe(201)
  })

  it('member 는 목록을 읽는다 — 권한 검사가 「전부 막기」가 아니다', async () => {
    const { teamId, projectId } = await seed()
    const member = await addMember(teamId, 'reader-sub')
    const res = await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: member }),
      params({ id: projectId }),
    )
    expect(res.status).toBe(200)
    expect((await dataOf(res)).items).toEqual([])
  })

  it('팀 밖의 사람에게는 프로젝트가 404 다 — 존재 여부를 403 으로 알려 주지 않는다', async () => {
    const { projectId } = await seed()
    const stranger = sessionJwt('stranger-sub')
    const res = await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: stranger }),
      params({ id: projectId }),
    )
    expect(res.status).toBe(404)
  })

  it('경로가 uuid 가 아니면 400 이다 (500 이 아니다)', async () => {
    const { owner } = await seed()
    const res = await listItems(
      req('GET', '/api/v1/projects/not-a-uuid/context-items', { auth: owner }),
      params({ id: 'not-a-uuid' }),
    )
    expect(res.status).toBe(400)
    expect((await errorOf(res)).code).toBe('VALIDATION_FAILED')
  })
})

describe('기기 토큰 (SPEC §11)', () => {
  async function issueToken() {
    const { owner, teamId, projectId } = await seed()
    const data = await dataOf(await createToken(
      req('POST', `/api/v1/projects/${projectId}/tokens`, { auth: owner, body: { device_name: 'macbook' } }),
      params({ id: projectId }),
    ))
    return { owner, teamId, projectId, token: data.token as string, deviceId: data.device_id as string }
  }

  it('발급된 토큰은 ctx_ 로 시작하고 DB 에는 원문이 없다', async () => {
    const { token } = await issueToken()
    expect(token.startsWith(TOKEN_PREFIX)).toBe(true)
    const rows = await db.select({ hash: devices.tokenHash }).from(devices)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.hash).not.toContain(token)
    expect(rows[0]!.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('토큰으로 member 일은 되고 owner 일은 안 된다 — owner 의 토큰이어도', async () => {
    const { projectId, token } = await issueToken()
    const read = await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: token }),
      params({ id: projectId }),
    )
    expect(read.status).toBe(200)

    const write = await createRepo(
      req('POST', `/api/v1/projects/${projectId}/repos`, { auth: token, body: { name: 'r' } }),
      params({ id: projectId }),
    )
    expect(write.status).toBe(403)
  })

  it('토큰을 쓰면 last_seen_at 이 찬다 — 기기가 살아 있다는 유일한 근거다', async () => {
    const { projectId, token, deviceId } = await issueToken()
    const before = await db.select({ seen: devices.lastSeenAt }).from(devices).where(eq(devices.id, deviceId))
    expect(before[0]!.seen).toBeNull()
    await listItems(req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: token }), params({ id: projectId }))
    const after = await db.select({ seen: devices.lastSeenAt }).from(devices).where(eq(devices.id, deviceId))
    expect(after[0]!.seen).not.toBeNull()
  })

  it('만료된 토큰은 401 — 만료 시각만 뒤로 밀어 확인한다', async () => {
    const { projectId, token, deviceId } = await issueToken()
    await db.update(devices).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(devices.id, deviceId))
    const res = await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: token }),
      params({ id: projectId }),
    )
    expect(res.status).toBe(401)
    expect((await errorOf(res)).message).toContain('만료')
  })

  it('취소하면 204 이고 그 토큰은 더 이상 안 통한다', async () => {
    const { owner, projectId, token, deviceId } = await issueToken()
    const del = await revokeDevice(
      req('DELETE', `/api/v1/devices/${deviceId}`, { auth: owner }),
      params({ id: deviceId }),
    )
    expect(del.status).toBe(204)
    expect(await del.text()).toBe('')

    const after = await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: token }),
      params({ id: projectId }),
    )
    expect(after.status).toBe(401)
    //  두 번 취소해도 204 다 (같은 요청을 두 번 보내도 같은 결과여야 한다).
    const again = await revokeDevice(req('DELETE', `/api/v1/devices/${deviceId}`, { auth: owner }), params({ id: deviceId }))
    expect(again.status).toBe(204)
  })

  it('기기 토큰으로는 토큰을 또 못 만든다', async () => {
    const { projectId, token } = await issueToken()
    const res = await createToken(
      req('POST', `/api/v1/projects/${projectId}/tokens`, { auth: token, body: { device_name: 'copy' } }),
      params({ id: projectId }),
    )
    expect(res.status).toBe(403)
  })
})

describe('권한 표가 실제로 판정을 바꾼다', () => {
  it('ACTOR_MAX_ROLE 의 두 주체가 서로 다른 상한을 낸다', () => {
    expect(ROLE_RANK[ACTOR_MAX_ROLE.user]).toBeGreaterThan(ROLE_RANK[ACTOR_MAX_ROLE.device])
  })

  it('ROLE_RANK 가 TEAM_ROLES 를 하나도 빠뜨리지 않는다', () => {
    expect(Object.keys(ROLE_RANK).sort()).toEqual([...TEAM_ROLES].sort())
  })
})
