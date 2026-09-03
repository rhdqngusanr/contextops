// =====================================================================
//  apps/web/src/db/client.ts — DB 로 들어가는 문 하나 (SPEC §2)
//
//  ★ 왜 문이 하나인가 — 라우트마다 연결을 만들면 서버리스에서 커넥션이 터지고,
//    「어디서 DB 를 여는가」가 흩어져서 트랜잭션 경계를 못 잡는다 (§2.1 발행 트랜잭션).
//    새 소비처는 `getDb()` 를 부른다. 여기 말고 다른 곳에서 postgres() 를 부르지 마라.
//
//  ⚠ RLS 를 쓰지 않는다 (SPEC §1.2). 권한은 앱 레벨에서 owner/member 로 검사한다 —
//    그래서 이 연결은 **아무나 못 만지는 서버 코드에서만** 열려야 한다.
// =====================================================================

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

export type Db = ReturnType<typeof create>

let cached: Db | undefined

function create() {
  const url = process.env.DATABASE_URL
  //  🔴 조용히 undefined 로 돌지 않게 여기서 죽인다. 연결 문자열이 없는 채로
  //     뜬 서버는 **첫 요청에서** 알 수 없는 모양으로 실패한다 (.env.example ③).
  if (!url) throw new Error('DATABASE_URL 이 없다 — apps/web/.env.example 을 보고 .env.local 을 만들어라')

  //  prepare: false — Supabase pooler(pgbouncer, transaction mode)는 prepared
  //  statement 를 못 넘긴다. 직결로 붙을 때도 켜 둘 이유가 없다.
  const sql = postgres(url, { prepare: false })
  return drizzle(sql, { schema })
}

/** 프로세스당 한 번만 연결한다. 서버리스에서 모듈이 재사용되는 동안 같은 풀을 쓴다. */
export function getDb(): Db {
  if (!cached) cached = create()
  return cached
}

export * as schema from './schema'
