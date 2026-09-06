import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import * as schema from '../src/db/schema'
import { getDb, setDbForTest, type Db } from '../src/db/client'
import { GET as listTeams, POST as createTeam } from '../src/app/api/v1/teams/route'
import { applyMigrations, dataOf, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  🔴 풀은 프로세스에 하나 — **소켓 위에서** 잰다 (FINDINGS 127 · INBOX 2026-09-06 ①)
//
//  ★ 왜 이 시험이 따로 있나 — 다른 시험은 전부 `setDbForTest` 로 PGlite 를 **직접** 꽂는다.
//    그래서 `getDb()` 가 실제로 `postgres()` 를 만드는 길은 아무 시험도 안 지났고, 「라우트마다
//    풀이 하나씩 생긴다」는 고장은 관통(단계를 하나씩 순서대로 부른다)도 못 잡았다.
//    여기서는 개발용 서버(`scripts/dev-server.ts`)와 **같은 길**을 간다: PGlite → pglite-socket
//    → TCP → postgres-js(`DATABASE_URL`) → 진짜 라우트.
//
//  ★ 무엇을 재나 —
//    ① 같은 라우트를 **동시에** 여러 번 불러도 전부 200 이고 소켓은 하나다 (INBOX 가 요구한
//       「동시 요청을 재는 시험」).
//    ② 모듈을 **새로 들여와**(Next dev 가 라우트마다 하는 것) 불러도 둘째 소켓이 안 열린다.
//       고치기 전엔 여기서 둘째 소켓이 줄을 섰고 30초 뒤 CONNECT_TIMEOUT 이었다.
//
//  ⚠ 판정은 「줄을 선 연결이 0」이다 — pglite-socket 은 둘째 소켓을 **즉시** `queuedConnection`
//    으로 알리므로, 30초를 기다리지 않고 그 자리에서 실패시킨다.
// =====================================================================

const OWNER_SUB = 'pool-owner'

let pg: PGlite
let socket: PGLiteSocketServer
let queued = 0
let attached = 0
let queuedRejection: Promise<never>

/** 라우트 호출을 「둘째 소켓이 줄을 섰다」와 경주시킨다 — 30초를 기다리지 않게. */
function race<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, queuedRejection])
}

beforeAll(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

  pg = new PGlite()
  await applyMigrations(pg)

  //  씨앗은 PGlite 를 직접 꽂아 심는다 — 소켓이 붙기 전이어야 한다 (붙으면 PGlite 가 잠긴다).
  setDbForTest(drizzle(pg, { schema }) as unknown as Db)
  await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: sessionJwt(OWNER_SUB), body: { name: 'Pool', slug: 'pool' } }),
    params({}),
  ))
  setDbForTest(undefined)

  socket = new PGLiteSocketServer({ db: pg, port: 0, host: '127.0.0.1' })
  let rejectQueued: (err: Error) => void = () => {}
  queuedRejection = new Promise<never>((_, reject) => { rejectQueued = reject })
  socket.addEventListener('queuedConnection', () => {
    queued++
    rejectQueued(new Error('둘째 소켓이 줄을 섰다 — 풀이 둘 이상이다 (client.ts 의 globalThis 자리가 깨졌나)'))
  })
  socket.addEventListener('connection', () => { attached++ })
  const listening = new Promise<number>((resolve) => {
    socket.addEventListener('listening', (e) => resolve((e as CustomEvent<{ port: number }>).detail.port))
  })
  await socket.start()
  const port = await listening

  //  개발용 서버가 찍어 주는 것과 같은 모양 — `?max=1` 까지 (`scripts/dev-server.ts`).
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?max=1`
//  PGlite 첫 기동 + 마이그레이션이 이 기계에서 수 초다 — 기본 10초로는 모자랄 때가 있다.
}, 60_000)

afterAll(async () => {
  //  postgres-js 풀을 닫는다 — 안 닫으면 소켓 서버가 멈출 때까지 붙어 있다.
  const client = (getDb() as unknown as { $client?: { end(opts?: { timeout?: number }): Promise<void> } }).$client
  await client?.end({ timeout: 1 })
  setDbForTest(undefined)
  delete process.env.DATABASE_URL
  await socket.stop()
  await pg.close()
}, 30_000)

describe('DB 풀은 프로세스에 하나 (소켓 위에서)', () => {
  it('같은 라우트를 동시에 다섯 번 불러도 전부 200 · 소켓은 하나', async () => {
    const owner = sessionJwt(OWNER_SUB)
    const started = Date.now()
    const responses = await race(Promise.all(
      Array.from({ length: 5 }, () => listTeams(req('GET', '/api/v1/teams', { auth: owner }), params({}))),
    ))
    for (const res of responses) {
      expect(res.status).toBe(200)
      const data = await dataOf(res)
      expect((data.teams as { slug: string }[]).map((t) => t.slug)).toEqual(['pool'])
    }
    //  30초(postgres-js connect_timeout)의 그림자도 없어야 한다.
    expect(Date.now() - started).toBeLessThan(10_000)
    expect(queued).toBe(0)
    //  pglite-socket 은 붙을 때 `connection` 을 두 번 알린다 (직접 붙임 + 핸들러 붙임).
    expect(attached).toBeLessThanOrEqual(2)
  }, 15_000)

  it('모듈을 새로 들여와도(Next dev 가 라우트마다 하는 것) 둘째 소켓이 안 열린다', async () => {
    const before = attached
    vi.resetModules()
    //  새 모듈 인스턴스 — `client.ts` 의 모듈 변수는 전부 초기값이다. 풀이 거기 살았다면 여기서 둘째가 생긴다.
    const fresh = await import('../src/app/api/v1/teams/route')
    const freshClient = await import('../src/db/client')
    expect(freshClient.getDb).not.toBe(getDb)

    const res = await race(fresh.GET(req('GET', '/api/v1/teams', { auth: sessionJwt(OWNER_SUB) }), params({})))
    expect(res.status).toBe(200)
    expect(queued).toBe(0)
    expect(attached).toBe(before)
    //  같은 풀 객체다 — 새 인스턴스가 만든 것이 아니라 globalThis 의 것을 집었다.
    expect(freshClient.getDb()).toBe(getDb())
  }, 15_000)
})
