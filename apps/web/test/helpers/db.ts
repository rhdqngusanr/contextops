import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'

import { setDbForTest, type Db } from '../../src/db/client'
import * as schema from '../../src/db/schema'

// =====================================================================
//  시험용 DB 와 자격증명 (docs/PLAN.md P1)
//
//  🔴 **시험용 DDL 을 따로 쓰지 않는다.** `drizzle/` 의 SQL 을 그대로 먹인다 —
//     따로 쓰면 시험은 초록인데 배포는 막히는, 제일 나쁜 종류가 된다.
//
//  ★ 그리고 라우트를 **진짜로 부른다.** 핸들러 안의 로직을 베껴 쓴 시험은
//    배포되는 코드를 재지 않는다 (`src/db/client.ts` 의 `setDbForTest` 주석).
// =====================================================================

type Journal = { entries: { idx: number; tag: string }[] }

const migrationsDir = new URL('../../drizzle/', import.meta.url)

/** 마이그레이션 파일을 journal 의 순서대로 읽는다 — 파일 이름 정렬에 기대지 않는다. */
export function migrationSql(): { tag: string; sql: string }[] {
  const journal = JSON.parse(
    readFileSync(new URL('meta/_journal.json', migrationsDir), 'utf8'),
  ) as Journal
  return [...journal.entries]
    .sort((a, b) => a.idx - b.idx)
    .map((e) => ({ tag: e.tag, sql: readFileSync(new URL(`${e.tag}.sql`, migrationsDir), 'utf8') }))
}

export async function applyMigrations(pg: PGlite): Promise<void> {
  for (const m of migrationSql()) {
    //  ⚠ `--> statement-breakpoint` 는 SQL 주석이라 그대로 먹여도 된다.
    //    파일을 쪼개지 마라 — 쪼개는 순간 「우리가 만든 SQL」을 시험하게 된다.
    await pg.exec(m.sql)
  }
}

/** 라우트가 `getDb()` 로 집어 갈 연결까지 꽂아 준다. */
export async function freshDb(): Promise<{ pg: PGlite; db: Db }> {
  const pg = new PGlite()
  await applyMigrations(pg)
  const db = drizzle(pg, { schema }) as unknown as Db
  setDbForTest(db)
  return { pg, db }
}

export async function closeDb(pg: PGlite | undefined): Promise<void> {
  setDbForTest(undefined)
  await pg?.close()
}

// ---------------------------------------------------------------------
//  세션 JWT — Supabase 가 주는 것과 **같은 모양**으로 우리가 만든다
//  ★ 왜 — 그래야 `verifySessionJwt` 의 서명·만료·alg 검사를 실제로 지나간다.
//    검사를 우회하는 시험용 인증 문을 만들면 그 문이 배포에도 남는다.
// ---------------------------------------------------------------------

export const TEST_JWT_SECRET = 'contextops-test-jwt-secret'

function b64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

export function sessionJwt(
  sub: string,
  opts: { email?: string; name?: string; expiresInSec?: number; alg?: string } = {},
): string {
  const header = b64url(JSON.stringify({ alg: opts.alg ?? 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    sub,
    email: opts.email ?? `${sub}@example.test`,
    name: opts.name ?? sub,
    exp: Math.floor(Date.now() / 1000) + (opts.expiresInSec ?? 3600),
  }))
  const sig = createHmac('sha256', TEST_JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

// ---------------------------------------------------------------------
//  요청 만들기 — 라우트가 받는 것과 같은 표준 `Request` 다
// ---------------------------------------------------------------------

const ORIGIN = 'http://localhost:3000'

export function req(
  method: string,
  path: string,
  //  `headers` 는 ETag 조건부 요청(`if-none-match`) 때문에 있다 — SPEC §5 packs 세 줄이
  //  304 를 약속하고, 그건 머리를 보내 봐야만 잴 수 있다.
  opts: { auth?: string; body?: unknown; raw?: string; headers?: Record<string, string> } = {},
): Request {
  const headers: Record<string, string> = { ...opts.headers }
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`
  const hasBody = opts.body !== undefined || opts.raw !== undefined
  if (hasBody) headers['content-type'] = 'application/json'
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  })
}

/**
 * Next 15 의 Route Handler 두 번째 인자.
 * ⚠ 값이 `string | string[]` 인 이유 — catch-all 구간(`[...path]`)은 배열로 온다
 *   (`src/lib/api/route.ts` 의 같은 주석). `string` 으로만 잡으면 그 라우트를 시험에서
 *   못 부르고, 그때 `as any` 로 뚫게 된다.
 */
export function params<P extends Record<string, string | string[]>>(value: P): { params: Promise<P> } {
  return { params: Promise.resolve(value) }
}

export async function bodyOf(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

/** 성공 응답의 `data` 를 꺼낸다 — 봉투 모양(`{data, meta}`)도 같이 확인한다. */
export async function dataOf(res: Response): Promise<Record<string, unknown>> {
  const json = await bodyOf(res)
  if (!('data' in json)) throw new Error(`성공 봉투가 아니다: ${JSON.stringify(json)}`)
  const meta = json.meta as { request_id?: string } | undefined
  if (!meta?.request_id) throw new Error('meta.request_id 가 없다')
  return json.data as Record<string, unknown>
}

/** 실패 응답의 `error` 를 꺼낸다. */
export async function errorOf(res: Response): Promise<{ code: string; message: string; request_id: string }> {
  const json = await bodyOf(res)
  if (!('error' in json)) throw new Error(`실패 봉투가 아니다: ${JSON.stringify(json)}`)
  return json.error as { code: string; message: string; request_id: string }
}
