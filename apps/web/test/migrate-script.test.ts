import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { INDEX_NAMES } from '../src/db/schema'
import { migrateDatabase } from '../scripts/migrate'
import { applyMigrations, migrationSql } from './helpers/db'

// =====================================================================
//  `scripts/migrate.ts` — 진짜 서버에 마이그레이션을 적용하는 문을 **소켓 위에서** 잰다
//  (docs/PLAN.md P1 첫 행 · SPEC §2)
//
//  ★ 왜 시험이 있나 — 이 스크립트는 Supabase 에 **실제로 쓴다.** 「두 번 돌려도 무해한가」를
//    배포 DB 에서 처음 확인하면 늦다. 여기서 postgres-js → TCP → Postgres 라는 **같은 길**로
//    빈 DB 에 세 번 부른다: 읽기만 → 적용 → 다시 적용.
//
//  ★ 무엇을 재나 —
//    ① `--status`(dryRun) 는 아무것도 안 만든다 — 표 0 · 남은 수 = 파일 수
//    ② 적용하면 파일 수만큼 장부에 적히고 표·인덱스가 TS 스키마와 같다
//    ③ **다시 돌리면 0개를 적용한다** — 장부(`drizzle.__drizzle_migrations`)가 막는다
//    ④ migrator 가 만든 DB 와 시험 helper(`applyMigrations` · 파일을 통째로 먹인다)가 만든 DB 의
//       표·컬럼·인덱스·enum 이 **같다** — migrator 는 `--> statement-breakpoint` 로 쪼개 먹이므로
//       두 길이 다른 모양을 만들면 「시험은 초록인데 배포는 다르다」가 된다
// =====================================================================

let pg: PGlite
let socket: PGLiteSocketServer
let url: string

beforeAll(async () => {
  pg = new PGlite()
  socket = new PGLiteSocketServer({ db: pg, port: 0, host: '127.0.0.1' })
  const listening = new Promise<number>((resolve) => {
    socket.addEventListener('listening', (e) => resolve((e as CustomEvent<{ port: number }>).detail.port))
  })
  await socket.start()
  const port = await listening
  url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`
})

afterAll(async () => {
  await socket.stop()
  await pg.close()
})

/** 스키마의 모양을 한 줄씩 — 두 DB 를 대조할 때 쓴다. */
async function shapeOf(db: PGlite): Promise<string[]> {
  const columns = await db.query<{ line: string }>(`
    select table_name || '.' || column_name || ':' || data_type as line
      from information_schema.columns where table_schema = 'public'`)
  const indexes = await db.query<{ line: string }>(`
    select 'idx ' || indexname as line from pg_indexes where schemaname = 'public'`)
  const enums = await db.query<{ line: string }>(`
    select 'enum ' || t.typname || '=' || e.enumlabel as line
      from pg_enum e join pg_type t on t.oid = e.enumtypid`)
  const rls = await db.query<{ line: string }>(`
    select 'rls ' || tablename || '=' || rowsecurity::text as line from pg_tables where schemaname = 'public'`)
  return [...columns.rows, ...indexes.rows, ...enums.rows, ...rls.rows].map((r) => r.line).sort()
}

describe('scripts/migrate.ts — 소켓 위의 Postgres 에 적용한다', () => {
  it('① --status 는 읽기만 한다 — 표 0 · 남은 수 = 파일 수', async () => {
    const r = await migrateDatabase(url, { dryRun: true })
    expect(r.journal).toBe(migrationSql().length)
    expect(r.appliedBefore).toBe(0)
    expect(r.pendingBefore).toBe(r.journal)
    expect(r.appliedNow).toBe(0)
    expect(r.tables.db).toBe(0)
    expect(r.indexes.present).toEqual([])
    //  장부 표조차 만들지 않았다 — 「읽기만」이다
    const ledger = await pg.query<{ exists: string | null }>(
      `select to_regclass('drizzle.__drizzle_migrations')::text as exists`,
    )
    expect(ledger.rows[0]?.exists).toBeNull()
  })

  it('② 적용하면 파일 수만큼 장부에 적히고 표·인덱스가 TS 스키마와 같다', async () => {
    const r = await migrateDatabase(url)
    expect(r.appliedNow).toBe(r.journal)
    expect(r.pendingAfter).toBe(0)
    expect(r.drifted).toBe(0)
    expect(r.tables.db).toBe(r.tables.ts)
    expect(r.indexes.missing).toEqual([])
    expect(r.indexes.present).toEqual([...INDEX_NAMES])
    expect(r.enums).toBeGreaterThan(0)
    //  RLS 가 전 표에 켜졌다 — 진짜 서버에서 0008 이 빠지면 `db:migrate` 가 FAIL 로 말하는 근거다
    expect(r.rls.total).toBe(r.tables.ts)
    expect(r.rls.on).toBe(r.rls.total)
  })

  it('③ 다시 돌리면 0개를 적용한다 — 장부가 막는다 (Supabase 에 두 번 돌려도 무해하다)', async () => {
    const r = await migrateDatabase(url)
    expect(r.appliedBefore).toBe(r.journal)
    expect(r.pendingBefore).toBe(0)
    expect(r.appliedNow).toBe(0)
    expect(r.pendingAfter).toBe(0)
    expect(r.tables.db).toBe(r.tables.ts)
  })

  it('④ migrator 가 만든 모양과 시험 helper 가 만든 모양이 같다', async () => {
    const viaHelper = new PGlite()
    try {
      await applyMigrations(viaHelper)
      expect(await shapeOf(pg)).toEqual(await shapeOf(viaHelper))
    } finally {
      await viaHelper.close()
    }
  })
})
