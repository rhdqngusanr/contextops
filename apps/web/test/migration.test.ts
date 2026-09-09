// =====================================================================
//  마이그레이션을 **실제로 적용해 본다** (SPEC §2 · docs/PLAN.md P1 첫 행)
//
//  ★ 왜 이 시험이 있나 — 「DB 스키마를 만들었다」는 TS 파일이 컴파일된다는 뜻일 뿐이다.
//    SQL 이 진짜 도는지, 인덱스가 진짜 생기는지는 **Postgres 만 안다.**
//    Supabase 계정도 Docker 도 없이 그걸 재려고 PGlite(프로세스 안에서 도는
//    Postgres · WASM)를 쓴다. `drizzle/` 의 SQL 을 그대로 먹인다 — 시험용 DDL 을
//    따로 쓰면 시험은 초록인데 배포는 막히는, 제일 나쁜 종류가 된다.
//
//  ★ 이 시험이 잡는 것 넷:
//    ① SQL 이 Postgres 에서 실제로 돈다 (「적용됨」의 근거)
//    ② TS 스키마와 SQL 이 갈리지 않았다 — 표·컬럼·enum 을 양쪽에서 세서 대조한다
//       (스키마만 고치고 `db:generate` 를 안 돌리면 여기서 빨개진다)
//    ③ 인덱스 5개가 실제로 생긴다 (SPEC §2 마지막 줄)
//    ④ DB enum 이 `@contextops/schema` 의 정본 표와 **같다** — 값을 손으로 적어
//       갈라뜨리면 빨개진다. 그리고 표에 없는 값은 INSERT 가 거부된다
//    ⑤ 🔴 모든 표에 RLS 가 켜져 있다 — 브라우저에 실리는 anon 키가 Supabase Data API 로
//       표를 읽고 쓰는 길의 방어선이다 (2026-09-09 · 마이그레이션 0008)
// =====================================================================

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { getTableColumns, getTableName, is } from 'drizzle-orm'
import { PgTable, isPgEnum, type PgEnum } from 'drizzle-orm/pg-core'

import {
  CONFIDENCE_LEVELS,
  CONFLICT_KINDS,
  CONFLICT_SEVERITIES,
  CONFLICT_STATUSES,
  ITEM_STATUSES,
  ITEM_TYPES,
  PACK_TARGETS,
  PROGRESS_SOURCES,
  PROGRESS_STATUSES,
  REPORTABLE_SYNC_STATUSES,
  SOURCE_DOCUMENT_KINDS,
  TEAM_ROLES,
} from '@contextops/schema'

import * as schema from '../src/db/schema'
import { INDEX_NAMES } from '../src/db/schema'
//  ⚠ 마이그레이션을 읽고 먹이는 절차는 `test/helpers/db.ts` 하나다 — 여기에 다시 적으면
//    API 시험과 갈라져서, 한쪽만 옛 SQL 을 먹이는 상태가 조용히 생긴다.
import { applyMigrations, migrationSql } from './helpers/db'

/**
 * TS 스키마 쪽의 표·enum 목록. 손으로 적은 목록과 대조하지 않는다 — 그러면 둘이 갈린다.
 * ⚠ `unknown[]` 으로 먼저 받는다. 모듈이 표(pgTable)·enum·값 tuple 을 섞어 내보내서
 *   `Object.values` 의 유니온을 그대로 좁히려 하면 타입 검사가 막힌다.
 */
const exported: unknown[] = Object.values(schema)
const tables = exported.filter((v): v is PgTable => is(v, PgTable))
const enums = exported.filter((v): v is PgEnum<[string, ...string[]]> => isPgEnum(v))

/**
 * `@contextops/schema` 에서 그대로 와야 하는 enum.
 * ★ 새 계약 enum 을 DB 에 쓰면 여기 한 줄 — 이 표가 「손으로 베껴 적었나」를 잡는 유일한 자리다.
 */
const CONTRACT_ENUMS: Record<string, readonly string[]> = {
  item_type: ITEM_TYPES,
  item_status: ITEM_STATUSES,
  confidence: CONFIDENCE_LEVELS,
  pack_target: PACK_TARGETS,
  sync_status: REPORTABLE_SYNC_STATUSES,
  progress_status: PROGRESS_STATUSES,
  progress_source: PROGRESS_SOURCES,
  //  ★ 이 넷은 API 계약이 쓰게 되면서 `packages/schema` 로 올라왔다 (schema.ts 주석).
  team_role: TEAM_ROLES,
  source_document_kind: SOURCE_DOCUMENT_KINDS,
  conflict_kind: CONFLICT_KINDS,
  conflict_status: CONFLICT_STATUSES,
  conflict_severity: CONFLICT_SEVERITIES,
}

let pg: PGlite

async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await pg.query<T>(sql, params)
  return r.rows
}

beforeAll(async () => {
  pg = new PGlite()
  await applyMigrations(pg)
})

afterAll(async () => {
  await pg?.close()
})

describe('drizzle 마이그레이션이 Postgres 에서 실제로 적용된다', () => {
  it('마이그레이션 파일이 하나 이상 있다', () => {
    expect(migrationSql().length).toBeGreaterThan(0)
  })

  it('SPEC §2 의 표가 전부 생긴다 · SQL 에만 있는 표는 없다', async () => {
    const created = await rows<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public'`,
    )
    const inDb = created.map((r) => r.table_name).sort()
    const inTs = tables.map(getTableName).sort()
    expect(inTs.length).toBe(18) // SPEC §2 의 표 개수 (+`ai_jobs` · §7.1·§7.2 의 job 자리)
    expect(inDb).toEqual(inTs)
  })

  it('표마다 컬럼이 TS 스키마와 같다 (db:generate 를 안 돌리면 여기서 갈린다)', async () => {
    for (const table of tables) {
      const name = getTableName(table)
      const inDb = (
        await rows<{ column_name: string }>(
          `select column_name from information_schema.columns
             where table_schema = 'public' and table_name = $1`,
          [name],
        )
      ).map((r) => r.column_name).sort()
      const inTs = Object.values(getTableColumns(table)).map((c) => c.name).sort()
      expect(inDb, `${name} 의 컬럼`).toEqual(inTs)
    }
  })

  it('인덱스 8개가 실제로 생긴다 (SPEC §2)', async () => {
    const inDb = (
      await rows<{ indexname: string }>(`select indexname from pg_indexes where schemaname = 'public'`)
    ).map((r) => r.indexname)
    expect(INDEX_NAMES.length).toBe(8)
    for (const name of INDEX_NAMES) expect(inDb, `인덱스 ${name}`).toContain(name)
  })

  it('🔴 모든 표에 RLS 가 켜져 있다 — 브라우저의 anon 키가 Data API 로 두드려도 한 행도 못 읽고 못 쓴다', async () => {
    //  정책이 하나도 없는 RLS = anon/authenticated 전면 거부. 서버는 표 소유자 역할로 붙어 영향이 없다.
    //  (시험의 PGlite 사용자는 superuser 라 이 파일의 INSERT 들은 그대로 지난다 — 그래서 켜짐 여부만 센다)
    const r = await rows<{ tablename: string; rowsecurity: boolean }>(
      `select tablename, rowsecurity from pg_tables where schemaname = 'public'`,
    )
    expect(r.length).toBe(tables.length)
    const off = r.filter((t) => !t.rowsecurity).map((t) => t.tablename)
    expect(off, 'RLS 가 꺼진 표 — schema.ts 에 .enableRLS() 를 빼먹었거나 db:generate 를 안 돌렸다').toEqual([])
  })

  it('DB enum 이 TS 스키마의 값과 같다', async () => {
    for (const e of enums) {
      const inDb = (
        await rows<{ label: string }>(
          `select e.enumlabel as label from pg_enum e
             join pg_type t on t.oid = e.enumtypid
            where t.typname = $1 order by e.enumsortorder`,
          [e.enumName],
        )
      ).map((r) => r.label)
      expect(inDb, `enum ${e.enumName}`).toEqual([...e.enumValues])
    }
  })

  it('계약에서 오는 enum 은 @contextops/schema 의 표와 글자까지 같다', async () => {
    for (const [name, expected] of Object.entries(CONTRACT_ENUMS)) {
      const inDb = (
        await rows<{ label: string }>(
          `select e.enumlabel as label from pg_enum e
             join pg_type t on t.oid = e.enumtypid
            where t.typname = $1 order by e.enumsortorder`,
          [name],
        )
      ).map((r) => r.label)
      expect(inDb, `계약 enum ${name}`).toEqual([...expected])
    }
  })

  it('sync_status 에는 unknown 이 없다 — 「보고 없음」은 행으로 저장되지 않는다', async () => {
    const labels = (
      await rows<{ label: string }>(
        `select e.enumlabel as label from pg_enum e
           join pg_type t on t.oid = e.enumtypid where t.typname = 'sync_status'`,
      )
    ).map((r) => r.label)
    expect(labels).not.toContain('unknown')
  })
})

// ---------------------------------------------------------------------
//  ★ 여기부터는 「값을 바꾸면 결과가 갈리는가」를 본다.
//    표가 생겼다는 것만으로는 그 표가 무언가를 **막는지** 알 수 없다.
// ---------------------------------------------------------------------

describe('제약이 실제로 무언가를 막는다', () => {
  /** 팀 → 프로젝트까지 만들어 준다. FK 사슬이 진짜 이어져 있는지도 같이 확인된다. */
  async function seedProject(slug: string): Promise<string> {
    const team = await rows<{ id: string }>(
      `insert into teams (slug, name) values ($1, $2) returning id`,
      [slug, slug],
    )
    const teamId = team[0]!.id
    const project = await rows<{ id: string }>(
      `insert into projects (team_id, slug, name) values ($1, $2, $3) returning id`,
      [teamId, slug, slug],
    )
    return project[0]!.id
  }

  it('item_type 표에 없는 값은 INSERT 가 거부된다', async () => {
    const projectId = await seedProject('t-itemtype')
    await expect(
      pg.query(
        `insert into context_items (project_id, public_id, type, scope)
         values ($1, 'item_bad', 'nonexistent', '{"kind":"project"}')`,
        [projectId],
      ),
    ).rejects.toThrow()
    //  같은 자리에 표 안의 값은 들어간다 — 거부가 「전부 막는다」가 아니라는 확인이다.
    await expect(
      pg.query(
        `insert into context_items (project_id, public_id, type, scope)
         values ($1, 'item_good', 'mission', '{"kind":"project"}')`,
        [projectId],
      ),
    ).resolves.toBeDefined()
  })

  it('한 프로젝트에서 같은 semver 를 두 번 발행할 수 없다', async () => {
    const projectId = await seedProject('t-semver')
    const ins = (hash: string) =>
      pg.query(
        `insert into context_versions (project_id, semver, snapshot_hash, snapshot, manifest)
         values ($1, '1.0.0', $2, '{}', '{}')`,
        [projectId, hash],
      )
    await expect(ins('a'.repeat(64))).resolves.toBeDefined()
    await expect(ins('b'.repeat(64))).rejects.toThrow()
  })

  it('같은 snapshot_hash 를 두 버전으로 발행할 수 없다 (P4)', async () => {
    const projectId = await seedProject('t-snapshot')
    const hash = 'c'.repeat(64)
    const ins = (semver: string) =>
      pg.query(
        `insert into context_versions (project_id, semver, snapshot_hash, snapshot, manifest)
         values ($1, $2, $3, '{}', '{}')`,
        [projectId, semver, hash],
      )
    await expect(ins('1.0.0')).resolves.toBeDefined()
    await expect(ins('1.0.1')).rejects.toThrow()
  })

  //  -------------------------------------------------------------------
  //   충돌 한 장의 모양 — `CONFLICT_KIND_RULES` 에서 나온 CHECK 이 진짜 무는가
  //   ★ 왜 여기서 재나 — 이 제약이 있어야 「충돌 1건」이라고 뜬 카드가 **가리킬 것을
  //     반드시 가진다.** 없으면 반쪽짜리 행이 화면까지 올라가고, 눌렀을 때 아무것도
  //     없다 (P7 이 무너지는 자리).
  //  -------------------------------------------------------------------

  /** 충돌 한 줄을 넣는다. 채울 칸 이름과 값을 그대로 받는다 — 무엇이 막히는지가 보이게. */
  function insertConflict(projectId: string, columns: string, values: string) {
    return pg.query(
      `insert into conflicts (project_id, question, ${columns}) values ($1, '재시도는 3회인가?', ${values})`,
      [projectId],
    )
  }

  async function seedConflictItems(slug: string): Promise<string> {
    const projectId = await seedProject(slug)
    for (const publicId of ['item_x', 'item_y']) {
      await pg.query(
        `insert into context_items (project_id, public_id, type, scope)
         values ($1, $2, 'policy', '{"kind":"project"}')`,
        [projectId, publicId],
      )
    }
    return projectId
  }

  it('항목 대 항목인 종류는 두 항목과 severity 가 **다** 있어야 들어간다', async () => {
    const projectId = await seedConflictItems('t-conflict-items')
    await expect(
      insertConflict(projectId, 'kind, a_item_id, b_item_id, severity', `'contradiction', 'item_x', 'item_y', 'high'`),
    ).resolves.toBeDefined()
    //  needsB — 한쪽만 있으면 「무엇과 어긋났나」에 답할 수 없다
    await expect(
      insertConflict(projectId, 'kind, a_item_id, severity', `'contradiction', 'item_x', 'high'`),
    ).rejects.toThrow()
    //  detected — 심각도는 §7.2 가 매긴다. 없으면 화면 4 가 카드 순서를 못 정한다
    await expect(
      insertConflict(projectId, 'kind, a_item_id, b_item_id', `'contradiction', 'item_x', 'item_y'`),
    ).rejects.toThrow()
    //  anchor='items' 인데 원문 구간을 가리키면 막는다 (P7 — 사슬이 한 칸 끊긴다)
    await expect(
      insertConflict(
        projectId,
        'kind, a_item_id, b_item_id, severity, a_ref',
        `'contradiction', 'item_x', 'item_y', 'high', '{"kind":"manual","note":"문서"}'`,
      ),
    ).rejects.toThrow()
  })

  it('문서를 가리키는 종류(open_question)는 a_ref 만 채운다', async () => {
    const projectId = await seedConflictItems('t-conflict-doc')
    await expect(
      insertConflict(projectId, 'kind, a_ref', `'open_question', '{"kind":"manual","note":"문서"}'`),
    ).resolves.toBeDefined()
    //  가리킬 항목이 아직 없는 종류다 — 항목 id 를 넣으면 막힌다
    await expect(
      insertConflict(projectId, 'kind, a_ref, a_item_id', `'open_question', '{"kind":"manual","note":"문서"}', 'item_x'`),
    ).rejects.toThrow()
    //  §7.1 이 만드는 종류라 severity 가 없다
    await expect(
      insertConflict(projectId, 'kind, a_ref, severity', `'open_question', '{"kind":"manual","note":"문서"}', 'low'`),
    ).rejects.toThrow()
    //  a_ref 없이 질문만 있는 행은 근거 없는 카드다
    await expect(insertConflict(projectId, 'kind', `'open_question'`)).rejects.toThrow()
  })

  it('없는 항목을 가리키는 충돌은 FK 가 막는다 (근거 없는 카드가 없다 · P7)', async () => {
    const projectId = await seedConflictItems('t-conflict-fk')
    await expect(
      insertConflict(projectId, 'kind, a_item_id, b_item_id, severity', `'contradiction', 'item_x', 'item_nope', 'high'`),
    ).rejects.toThrow()
  })

  it('없는 프로젝트를 가리키는 항목은 FK 가 막는다', async () => {
    await expect(
      pg.query(
        `insert into context_items (project_id, public_id, type, scope)
         values ('00000000-0000-0000-0000-000000000000', 'item_orphan', 'goal', '{"kind":"project"}')`,
      ),
    ).rejects.toThrow()
  })
})
