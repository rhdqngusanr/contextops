import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { is } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { PgTable } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import drizzleConfig from '../drizzle.config'
import * as schema from '../src/db/schema'
import { INDEX_NAMES } from '../src/db/schema'

// =====================================================================
//  🔴 **마이그레이션을 진짜 Postgres 에 적용하는 문 하나** (SPEC §2 · docs/PLAN.md P1 첫 행)
//
//    pnpm --filter web db:status     # 읽기만 — 붙는가 · 몇 개가 적용됐고 몇 개가 남았나
//    pnpm --filter web db:migrate    # 남은 것을 적용하고 표·인덱스·enum 을 센다
//
//  ★ 왜 스크립트인가 — `drizzle.config.ts` 는 `generate` 전용이라 접속 정보가 없다(거기 주석).
//    `drizzle-kit migrate` 를 쓰려면 설정에 `dbCredentials` 를 넣어야 하고, 그러면 `generate`
//    까지 env 를 요구하게 된다. 대신 **drizzle-orm 의 migrator** 를 부른다 — 같은 `drizzle/`
//    폴더, 같은 journal 을 읽고, 적용한 것을 `drizzle.__drizzle_migrations` 에 적어서
//    **두 번 돌려도 두 번째는 아무것도 안 한다.** 손으로 SQL 을 먹이면 그 장부가 없다.
//
//  ★ 무엇을 재나 — 「돌렸다」가 아니라 **DB 가 말하는 수**를 낸다:
//    journal 의 파일 수 · 장부의 적용 수 · 남은 수 · 이번에 적용한 수 · `information_schema`
//    의 표 수(TS 스키마의 표 수와 대조) · `INDEX_NAMES` 중 `pg_indexes` 에 있는 것/없는 것 ·
//    enum 수. `test/migration.test.ts` 가 PGlite 에서 재는 것과 같은 자리를 진짜 서버에서 센다.
//
//  ⚠ **적용된 파일이 바뀌었으면 멈춘다** — 장부의 hash 와 파일의 hash 가 다르면 그 위에 새것을
//    쌓지 않는다. drizzle 자신은 이걸 안 본다(마지막 시각만 본다). 파일이 바뀐 채로 배포에
//    올라가면 「시험은 초록인데 배포 DB 는 다른 모양」이 된다 — 이 저장소가 제일 경계하는 상태다.
//
//  🔴 접속 문자열은 절대 찍지 않는다 — 호스트·포트·DB 이름까지만 (P1 · 비밀번호가 그 안에 있다).
//  ⚠ Supabase 는 **Session pooler(5432) 또는 직결**로 돌린다. Transaction pooler(6543 ·
//    `?pgbouncer=true`)는 트랜잭션 밖의 상태를 못 들고 있어서 마이그레이션에 못 쓴다.
//  🔴 배포용이 아니다 — `scripts/` 는 제품에 안 들어간다. 제품 코드는 `getDb()` 만 안다.
// =====================================================================

const webRoot = fileURLToPath(new URL('../', import.meta.url))

/** 마이그레이션 폴더 — 정본은 `drizzle.config.ts` 의 `out` 하나다. 여기 다시 적지 마라. */
const MIGRATIONS_FOLDER = resolve(webRoot, drizzleConfig.out ?? failOut())

function failOut(): never {
  throw new Error('drizzle.config.ts 에 out 이 없다 — 마이그레이션 폴더를 모른다')
}

/** TS 스키마가 말하는 표 수 — `test/migration.test.ts` 와 같은 방법으로 센다 (손으로 적은 수가 아니다). */
const TS_TABLE_COUNT = Object.values(schema as Record<string, unknown>).filter((v) => is(v, PgTable)).length

export type MigrateReport = {
  /** `select version()` 의 앞부분 — 「PostgreSQL 17.6」 */
  server: string
  /** `drizzle/meta/_journal.json` 의 항목 수 */
  journal: number
  /** 돌리기 전 `drizzle.__drizzle_migrations` 의 행 수 (장부가 없으면 0) */
  appliedBefore: number
  /** 돌리기 전 남은 수 — drizzle 과 같은 셈법(장부의 마지막 시각보다 뒤인 파일) */
  pendingBefore: number
  /** 장부의 hash 와 파일의 hash 가 다른 것의 수 — 0 이 아니면 적용하지 않는다 */
  drifted: number
  /** 이번에 적용한 수 (dryRun 이면 0) */
  appliedNow: number
  /** 돌린 뒤 남은 수 */
  pendingAfter: number
  tables: { db: number; ts: number }
  indexes: { present: string[]; missing: string[] }
  enums: number
}

type Ledger = { hash: string; created_at: string | number }

/**
 * 붙어서 세고, `dryRun` 이 아니면 남은 것을 적용한 뒤 다시 센다.
 * ⚠ 연결은 여기서 열고 여기서 닫는다 — 호출자는 문자열만 준다.
 */
export async function migrateDatabase(url: string, opts: { dryRun?: boolean } = {}): Promise<MigrateReport> {
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER })
  //  prepare: false — `src/db/client.ts` 와 같은 이유(pooler). max: 1 — 마이그레이션은 한 줄로 간다.
  const sql = postgres(url, { prepare: false, max: 1 })
  try {
    const [row] = await sql<{ version: string }[]>`select version()`
    const version = row?.version ?? '(version 없음)'
    const server = version.split(' on ')[0] ?? version

    const before = await ledger(sql)
    const drifted = countDrift(before, migrations)
    const pendingBefore = countPending(before, migrations)

    if (drifted > 0 && !opts.dryRun) {
      throw new Error(
        `적용된 마이그레이션 ${drifted}개의 파일이 장부의 hash 와 다르다 — 그 위에 쌓지 않는다. ` +
          `어느 파일이 바뀌었는지 git log 로 찾아라 (drizzle/ 는 생성물이다 · 손으로 고치지 마라)`,
      )
    }

    let appliedNow = 0
    if (!opts.dryRun && pendingBefore > 0) {
      await migrate(drizzle(sql, { schema }), { migrationsFolder: MIGRATIONS_FOLDER })
      appliedNow = (await ledger(sql)).length - before.length
    }
    const after = await ledger(sql)

    return {
      server,
      journal: migrations.length,
      appliedBefore: before.length,
      pendingBefore,
      drifted,
      appliedNow,
      pendingAfter: countPending(after, migrations),
      tables: { db: await countTables(sql), ts: TS_TABLE_COUNT },
      indexes: await checkIndexes(sql),
      enums: await countEnums(sql),
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/** 장부를 오래된 순으로. 장부 표가 아직 없으면 빈 배열 — 「한 번도 안 돌린 DB」다. */
async function ledger(sql: postgres.Sql): Promise<Ledger[]> {
  const [row] = await sql<{ exists: string | null }[]>`
    select to_regclass('drizzle.__drizzle_migrations')::text as exists`
  if (!row?.exists) return []
  return sql<Ledger[]>`select hash, created_at from drizzle.__drizzle_migrations order by created_at asc`
}

/** drizzle 의 셈법 그대로 — 장부의 **마지막 시각**보다 뒤인 파일만 남은 것이다 (`PgDialect.migrate`). */
function countPending(rows: Ledger[], migrations: ReturnType<typeof readMigrationFiles>): number {
  const last = rows.at(-1)
  if (!last) return migrations.length
  const lastMillis = Number(last.created_at)
  return migrations.filter((m) => lastMillis < m.folderMillis).length
}

/** 적용된 순서대로 파일과 짝지어 hash 를 대조한다 — 다르면 적용 뒤에 파일이 바뀐 것이다. */
function countDrift(rows: Ledger[], migrations: ReturnType<typeof readMigrationFiles>): number {
  let drifted = 0
  rows.forEach((row, i) => {
    const file = migrations[i]
    if (file && file.hash !== row.hash) drifted++
  })
  return drifted
}

async function countTables(sql: postgres.Sql): Promise<number> {
  const [row] = await sql<{ n: string }[]>`
    select count(*)::text as n from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'`
  return Number(row?.n ?? 0)
}

async function checkIndexes(sql: postgres.Sql): Promise<{ present: string[]; missing: string[] }> {
  const rows = await sql<{ indexname: string }[]>`select indexname from pg_indexes where schemaname = 'public'`
  const inDb = new Set(rows.map((r) => r.indexname))
  const present = INDEX_NAMES.filter((name) => inDb.has(name))
  const missing = INDEX_NAMES.filter((name) => !inDb.has(name))
  return { present: [...present], missing: [...missing] }
}

async function countEnums(sql: postgres.Sql): Promise<number> {
  const [row] = await sql<{ n: string }[]>`
    select count(*)::text as n from pg_type t
      join pg_namespace ns on ns.oid = t.typnamespace
     where ns.nspname = 'public' and t.typtype = 'e'`
  return Number(row?.n ?? 0)
}

// ---------------------------------------------------------------------
//  CLI — `tsx scripts/migrate.ts [--status]`
// ---------------------------------------------------------------------

/** `DATABASE_URL` 이 없으면 `.env.local` 을 읽는다 — Next 가 하는 것과 같은 파일이다. */
function loadEnv(): string {
  if (!process.env.DATABASE_URL) {
    const envLocal = resolve(webRoot, '.env.local')
    if (existsSync(envLocal)) process.loadEnvFile(envLocal)
  }
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL 이 없다 — apps/web/.env.example 을 보고 .env.local 을 만들어라')
  return url
}

/** 호스트·포트·DB 이름까지만 — 사용자명·비밀번호는 찍지 않는다 (P1). */
function describeUrl(url: string): string {
  const u = new URL(url)
  return `${u.hostname}:${u.port || '5432'}${u.pathname}`
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--status')
  const url = loadEnv()
  console.log(`${dryRun ? 'status' : 'migrate'} → ${describeUrl(url)}`)
  console.log(`migrations: ${MIGRATIONS_FOLDER}`)

  const r = await migrateDatabase(url, { dryRun })
  console.log(`server        ${r.server}`)
  console.log(`journal       ${r.journal}`)
  console.log(`applied       ${r.appliedBefore} → ${r.appliedBefore + r.appliedNow}  (+${r.appliedNow})`)
  console.log(`pending       ${r.pendingBefore} → ${r.pendingAfter}`)
  console.log(`drifted       ${r.drifted}`)
  console.log(`tables        ${r.tables.db} in db · ${r.tables.ts} in src/db/schema.ts`)
  console.log(`indexes       ${r.indexes.present.length}/${INDEX_NAMES.length}${r.indexes.missing.length ? ` · missing: ${r.indexes.missing.join(', ')}` : ''}`)
  console.log(`enums         ${r.enums}`)

  if (dryRun) return
  const problems: string[] = []
  if (r.pendingAfter > 0) problems.push(`남은 마이그레이션 ${r.pendingAfter}개`)
  if (r.tables.db !== r.tables.ts) problems.push(`표 수가 다르다 (db ${r.tables.db} · ts ${r.tables.ts})`)
  if (r.indexes.missing.length > 0) problems.push(`없는 인덱스 ${r.indexes.missing.length}개`)
  if (problems.length > 0) {
    console.error(`FAIL: ${problems.join(' · ')}`)
    process.exitCode = 1
  } else {
    console.log('OK')
  }
}

//  vitest 가 `migrateDatabase` 를 들여올 때는 돌지 않는다 — 직접 실행했을 때만.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err: unknown) => {
    //  ⚠ 드라이버 오류의 message 에 접속 문자열이 섞일 수 있다 — name 과 code 만 찍는다.
    const e = err as { name?: string; code?: string; message?: string }
    const safe = e.message && !e.message.includes('://') ? e.message : '(message 에 접속 문자열이 들어 있어 뺐다)'
    console.error(`FAIL: ${e.name ?? 'Error'}${e.code ? ` ${e.code}` : ''} — ${safe}`)
    process.exitCode = 1
  })
}
