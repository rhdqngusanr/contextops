import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'

import { setDbForTest, type Db } from '../../src/db/client'
import { setJobStarterForTest } from '../../src/lib/ai/job'
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

/**
 * 🔴 라우트가 `startJob()` 으로 굴린 job 의 id 들 — **굴리지는 않고 적어만 둔다.**
 *
 * ★ 왜 시험에서는 안 굴리나 — 배포에서 job 은 응답을 보낸 **뒤에** 돈다. 시험이
 *   그걸 흉내 내면 어느 시험이든 뒤에서 LLM 스텁이 도는 셈이 되고, DB 를 닫은 뒤에
 *   쓰기가 남아 조용히 갈라진다. **job 을 재는 시험은 `runJob()` 을 직접 부른다.**
 */
export function startedJobIds(): string[] {
  return [...started]
}

let started: string[] = []

/** 라우트가 `getDb()` 로 집어 갈 연결까지 꽂아 준다. */
export async function freshDb(): Promise<{ pg: PGlite; db: Db }> {
  const pg = new PGlite()
  await applyMigrations(pg)
  const db = drizzle(pg, { schema }) as unknown as Db
  setDbForTest(db)
  started = []
  setJobStarterForTest((jobId) => { started.push(jobId) })
  return { pg, db }
}

export async function closeDb(pg: PGlite | undefined): Promise<void> {
  setDbForTest(undefined)
  setJobStarterForTest(undefined)
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
//
//  🔴 정본은 `src/lib/demo/inproc.ts` 다 — 데모 시드가 제품 코드(Cron 의 리셋 문)가
//     되면서 **둘째 사용자**가 생겨 그리로 올렸다. 여기서는 다시 내보내기만 한다.
//     ⚠ 여기에 같은 함수를 다시 적지 마라 — 시험이 부르는 라우트와 시드가 부르는 라우트가
//       다른 모양의 요청을 받게 된다.
// ---------------------------------------------------------------------

export { bodyOf, dataOf, params, req } from '../../src/lib/demo/inproc'
import { bodyOf } from '../../src/lib/demo/inproc'

/** 실패 응답의 `error` 를 꺼낸다. */
export async function errorOf(
  res: Response,
): Promise<{ code: string; message: string; request_id: string; details?: unknown }> {
  const json = await bodyOf(res)
  if (!('error' in json)) throw new Error(`실패 봉투가 아니다: ${JSON.stringify(json)}`)
  //  ⚠ `details` 는 optional 이다 — 있는 에러만 싣는다 (SPEC §5). 재는 쪽이 모양을 안다.
  return json.error as { code: string; message: string; request_id: string; details?: unknown }
}
