// =====================================================================
//  apps/web/src/db/schema.ts — DB 스키마의 정본 (SPEC §2)
//
//  🔴 **enum 값 목록을 여기에 손으로 적지 마라.** 항목 타입·확신도·Pack 타깃·
//     진행 상태·sync 상태는 이미 `@contextops/schema` 에 정본 표가 있다.
//     여기서 다시 적으면 DB 와 계약이 조용히 갈라지고, 갈라진 줄은
//     「INSERT 는 되는데 파싱은 안 되는」 행으로 나타난다 — 제일 늦게 발견되는 종류다.
//     아래 `pgEnum(...)` 은 전부 그 표를 **읽기만** 한다.
//     (`test/migration.test.ts` 가 실제 DB 의 enum 값과 그 표를 대조해서 잠근다)
//
//  ★ 새 테이블/새 enum 을 더하는 절차:
//    ① 값 목록이 계약(업로드·Pack)에도 쓰이면 `packages/schema` 에 먼저 넣고 여기서 읽는다
//       — DB 에만 사는 값이면 아래 「DB 안에서만 사는 값」 절에 tuple 로 둔다
//    ② `pgEnum` 한 줄 · 테이블 한 블록
//    ③ `pnpm --filter web db:generate` 로 마이그레이션 SQL 을 낸다 (손으로 쓰지 마라)
//    ④ 인덱스를 더했으면 `INDEX_NAMES` 에 한 줄 — 그 표가 시험의 기대값이다
//
//  ⚠ 컬럼은 SPEC §2 의 「필수만」을 따른다. 모든 테이블에 `created_at`,
//    갱신이 있는 테이블에 `updated_at`, 삭제가 있는 테이블에 `deleted_at`(soft delete).
// =====================================================================

import { sql, type SQL } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

import {
  CONFIDENCE_LEVELS,
  CONFLICT_KIND_RULES,
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
  type ScanSummary,
  TEAM_ROLES,
  type ConflictChoice,
  type ConflictKindRule,
  type Manifest,
  type Proposal,
  type ProgressEvent,
  type Scope,
  type SourceRef,
} from '@contextops/schema'
import type { Snapshot, SourceMapEntry } from '@contextops/compiler'

//  ⚠ 서버측 AI 의 기능 4종은 **계약이 아니라 서버 전용**이라 `packages/schema` 가 아니라
//    `src/lib/ai/features.ts` 가 정본이다 (그 파일 머리 주석). 여기서는 **읽기만** 한다.
//    그 파일은 의존이 없다 — 순환이 생기지 않는다.
import { AI_FEATURES } from '../lib/ai/features'

// ---------------------------------------------------------------------
//  DB 안에서만 사는 값 목록
//  ★ 왜 여기 있나 — 이 셋은 업로드 payload 에도 Pack 에도 안 나온다. 소비처가
//    DB 와 API 응답뿐이라 정본을 여기 둔다. **API 계약이 이 값을 쓰게 되는 순간
//    `packages/schema` 로 올려라** — 그때가 「둘째 사용자」다 (CLAUDE.md).
// ---------------------------------------------------------------------

/** 팀 참여 상태 2종 (SPEC §2). 초대는 아직 화면이 없어 API 계약에 안 나온다. */
export const TEAM_MEMBER_STATUSES = ['active', 'invited'] as const
/** 항목 개정이 어디서 왔나 4종 (SPEC §2). 서버가 매기는 값이라 payload 에 자리가 없다. */
export const REVISION_ORIGINS = ['doc', 'code', 'manual', 'proposal'] as const
/** Proposal 수명 5종 (SPEC §2 · §5). `published` 는 발행 트랜잭션이 마지막에 찍는다 (§2.1 7단계). */
export const PROPOSAL_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'published'] as const

//  ⚠ `TEAM_ROLES`·`SOURCE_DOCUMENT_KINDS`·`CONFLICT_KINDS`·`CONFLICT_STATUSES` 는
//    여기 있었지만 **API 계약이 그 값을 쓰게 되면서** `@contextops/schema` 로 올라갔다
//    (위 주석의 「둘째 사용자」 규칙). 이제 아래 `pgEnum` 이 그 표를 읽기만 한다.

// ---------------------------------------------------------------------
//  pgEnum — 위 표와 `@contextops/schema` 표를 **읽기만** 한다
// ---------------------------------------------------------------------

export const teamRole = pgEnum('team_role', TEAM_ROLES)
export const teamMemberStatus = pgEnum('team_member_status', TEAM_MEMBER_STATUSES)
export const sourceDocumentKind = pgEnum('source_document_kind', SOURCE_DOCUMENT_KINDS)
export const itemType = pgEnum('item_type', ITEM_TYPES)
export const itemStatus = pgEnum('item_status', ITEM_STATUSES)
export const confidence = pgEnum('confidence', CONFIDENCE_LEVELS)
export const revisionOrigin = pgEnum('revision_origin', REVISION_ORIGINS)
export const conflictKind = pgEnum('conflict_kind', CONFLICT_KINDS)
export const conflictStatus = pgEnum('conflict_status', CONFLICT_STATUSES)
/** 충돌 심각도 3단계 (SPEC §7.2). **탐지가 매기는 값**이라 그 종류에만 있다. */
export const conflictSeverity = pgEnum('conflict_severity', CONFLICT_SEVERITIES)
export const proposalStatus = pgEnum('proposal_status', PROPOSAL_STATUSES)
export const packTarget = pgEnum('pack_target', PACK_TARGETS)
/**
 * ⚠ `unknown` 이 없다 — 그 값은 **보고가 없을 때 서버가 매기는 값**이라 행으로
 *   저장되지 않는다 (`@contextops/schema` 의 `REPORTABLE_SYNC_STATUSES` 주석).
 *   DB 에 넣을 수 있게 하면 「보고 없음」과 「모르겠다고 보고함」이 섞인다.
 */
export const syncStatus = pgEnum('sync_status', REPORTABLE_SYNC_STATUSES)
export const progressStatus = pgEnum('progress_status', PROGRESS_STATUSES)
export const progressSource = pgEnum('progress_source', PROGRESS_SOURCES)
/** 서버측 AI 기능 4종 (SPEC §7 · P3). 정본은 `src/lib/ai/features.ts` 의 `AI_FEATURES` 다. */
export const aiFeature = pgEnum('ai_feature', AI_FEATURES)

// ---------------------------------------------------------------------
//  공통 컬럼
//  ★ 함수로 만든다 — 같은 빌더 객체를 여러 테이블에 나눠 쓰면 drizzle 이
//    한쪽의 설정을 다른 쪽에 흘린다. 호출할 때마다 새 빌더를 만든다.
// ---------------------------------------------------------------------

const id = () => uuid('id').primaryKey().defaultRandom()
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
/** soft delete. 행을 지우지 않는 이유 — 발행된 버전이 그 행을 근거로 가리키기 때문이다 (P7). */
const deletedAt = () => timestamp('deleted_at', { withTimezone: true })

// ---------------------------------------------------------------------
//  테이블
// ---------------------------------------------------------------------

export const users = pgTable('users', {
  id: id(),
  /** Supabase Auth 의 subject. 로그인 수단이 바뀌어도 이 값으로 같은 사람을 찾는다. */
  authSubject: text('auth_subject').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const teams = pgTable('teams', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** `{auto_apply:boolean, auto_submit:boolean}` (SPEC §2). */
  settings: jsonb('settings').$type<{ auto_apply: boolean; auto_submit: boolean }>().notNull()
    .default({ auto_apply: false, auto_submit: false }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const teamMembers = pgTable('team_members', {
  teamId: uuid('team_id').notNull().references(() => teams.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: teamRole('role').notNull(),
  status: teamMemberStatus('status').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.teamId, t.userId] })])

export const projects = pgTable('projects', {
  id: id(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  /**
   * 지금 「공식」인 버전. 발행 트랜잭션이 마지막에 이 값을 옮긴다 (§2.1 6단계)이고,
   * 요청의 `base_version_id` 와 다르면 409 `STALE_BASE` 다.
   * ⚠ `context_versions.project_id` 와 서로를 가리켜서 순환이다 — 그래서 nullable 이고
   *   `AnyPgColumn` 으로 타입 순환을 끊는다. drizzle-kit 은 FK 를 ALTER TABLE 로 따로 낸다.
   */
  officialVersionId: uuid('official_version_id').references((): AnyPgColumn => contextVersions.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
}, (t) => [unique('projects_team_slug_uq').on(t.teamId, t.slug)])

export const repos = pgTable('repos', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  remoteUrl: text('remote_url'),
  defaultBranch: text('default_branch').notNull().default('main'),
  /** 모노레포에서 이 레포가 차지하는 앞자리. 없으면 저장소 전체다. */
  pathPrefix: text('path_prefix'),
  /**
   * 마지막 `scan` 요약 (SPEC §8.3 · `POST …/context-items:batch-draft` 가 같이 보낸다).
   * 🔴 **경로와 이름만이다** — 파일 본문도 env 값도 자리가 없다 (`ScanSummary` 스키마 · P1).
   * ★ 왜 저장하나 — 안 저장하면 그 payload 가 통째로 버려져서 「보내는데 아무도 안 읽는」
   *   필드가 된다. 화면 3(가져오기)과 §7.1 이 이 값을 읽는다.
   */
  lastScan: jsonb('last_scan').$type<ScanSummary>(),
  lastScanAt: timestamp('last_scan_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const sourceDocuments = pgTable('source_documents', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  kind: sourceDocumentKind('kind').notNull(),
  /** 순환(문서 ↔ 문서 버전)이라 nullable 이다 — projects.official_version_id 와 같은 이유. */
  currentVersionId: uuid('current_version_id').references((): AnyPgColumn => sourceDocumentVersions.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
})

/**
 * ⚠ `content` 는 **팀 문서 본문**이다 — P1 이 막는 것은 코드 본문·secret·개인 기억·
 *   대화 transcript 이고, 문서 본문은 사용자가 의도적으로 올린다 (SPEC §5 POST /documents).
 *   여기 말고 다른 테이블에 본문을 담지 마라.
 */
export const sourceDocumentVersions = pgTable('source_document_versions', {
  id: id(),
  documentId: uuid('document_id').notNull().references((): AnyPgColumn => sourceDocuments.id),
  revision: integer('revision').notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: createdAt(),
}, (t) => [unique('source_document_versions_doc_rev_uq').on(t.documentId, t.revision)])

export const contextItems = pgTable('context_items', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  /**
   * 🔴 계약이 쓰는 항목 ID (`item_<slug>` · SPEC §3 `ItemId`). uuid 와 **따로** 있다.
   * ★ 왜 둘인가 — FK 는 uuid 로 잇는 게 싸지만, Pack 의 역추적 태그(`ctx:{id}`)에
   *   uuid 가 박히면 사람이 읽을 수 없다 (P7 은 「사람이 원문까지 간다」는 주장이다).
   *   프로젝트 안에서 유일하다 — 다른 프로젝트가 같은 slug 를 써도 된다.
   */
  publicId: text('public_id').notNull(),
  type: itemType('type').notNull(),
  status: itemStatus('status').notNull().default('draft'),
  currentRevision: integer('current_revision').notNull().default(1),
  scope: jsonb('scope').$type<Scope>().notNull(),
  priority: integer('priority').notNull().default(50),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
}, (t) => [
  index('context_items_project_status_idx').on(t.projectId, t.status),
  unique('context_items_project_public_id_uq').on(t.projectId, t.publicId),
])

export const contextItemRevisions = pgTable('context_item_revisions', {
  itemId: uuid('item_id').notNull().references(() => contextItems.id),
  revision: integer('revision').notNull(),
  /**
   * 개정마다 바뀌는 본문. SPEC §2 는 「필수만 적는다」라서 이 다섯이 빠져 있었고,
   * 그대로 두면 `ContextItem` 의 절반(`title`·`body`·`tags`·기간)이 **저장될 자리가 없다.**
   * ★ 왜 항목이 아니라 개정에 붙나 — 제목과 본문은 개정마다 달라진다. 항목 쪽에 두면
   *   옛 버전의 Pack 을 다시 그릴 때 지금 제목이 나온다 (P4 의 재현성이 깨진다).
   */
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  tags: text('tags').array().notNull().default([]),
  validFrom: text('valid_from'),
  validUntil: text('valid_until'),
  /** 타입별 필드. 정본은 `@contextops/schema` 의 `ITEM_DATA` 표다. */
  data: jsonb('data').notNull(),
  sourceRefs: jsonb('source_refs').$type<SourceRef[]>().notNull().default([]),
  confidence: confidence('confidence').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  origin: revisionOrigin('origin').notNull(),
  createdAt: createdAt(),
  //  ⚠ SPEC §2 는 `unique(item_id,revision)` 이라고만 적지만 복합 PK 로 둔다 —
  //    같은 유일성이고, PK 가 없으면 개정 행을 한 줄로 지목할 방법이 없다.
}, (t) => [primaryKey({ columns: [t.itemId, t.revision] })])

/**
 * 🔴 **충돌 한 장의 모양을 `CONFLICT_KIND_RULES` 표에서 DB 제약으로 내린다.**
 *
 * ★ 왜 코드가 아니라 DB 인가 — 충돌 행을 만드는 자리는 앞으로 여럿이다 (§7.1 의
 *   `open_questions` · §7.2 의 탐지 · 사람이 직접 적는 질문). 검사를 서비스 코드에
 *   두면 자리마다 베껴야 하고, 하나만 빠뜨려도 **반쪽짜리 행**이 조용히 들어온다.
 *   그 행은 화면에 「충돌 1건」으로 멀쩡히 뜨고, 눌렀을 때 가리킬 것이 없다.
 * ★ 왜 표에서 **생성**하나 — 종류를 하나 더할 때 이 파일에 손댈 것이 없어야 한다.
 *   `CONFLICT_KIND_RULES` 에 한 줄을 더하고 `db:generate` 를 돌리면 제약이 따라온다.
 *   ⚠ 여기에 kind 이름을 손으로 적지 마라. 적는 순간 표가 정본이 아니게 된다.
 *
 * @param column  이 칸이 채워져야 하는가를 잴 컬럼 이름
 * @param needs   표의 한 줄을 보고 「이 종류는 그 칸이 필요한가」를 답한다
 */
function conflictShapeCheck(column: string, needs: (rule: ConflictKindRule) => boolean) {
  const kinds = CONFLICT_KINDS.filter((k) => needs(CONFLICT_KIND_RULES[k]))
  const filled = `"${column}" is not null`
  //  ⚠ `kind in ()` 는 SQL 이 아니다. 아무 종류도 안 쓰는 칸(지금은 `b_ref`)과
  //     모든 종류가 쓰는 칸은 양쪽 끝의 갈래로 따로 낸다.
  const body: string =
    kinds.length === 0 ? `"${column}" is null`
    : kinds.length === CONFLICT_KINDS.length ? filled
    : `(${filled}) = ("kind" in (${kinds.map((k) => `'${k}'`).join(', ')}))`
  //  `sql.raw` 를 쓰는 근거: 이 문자열의 재료는 **전부 우리 표의 상수**다. 외부 입력이
  //  섞이는 자리가 하나도 없다 (컬럼 이름도 아래 호출부가 리터럴로 준다).
  return check(`conflicts_${column}_shape_ck`, sql.raw(body) as SQL)
}

export const conflicts = pgTable('conflicts', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  kind: conflictKind('kind').notNull(),
  /**
   * 🔴 `anchor: 'items'` 인 종류가 가리키는 두 항목 — **`item_<slug>`** 다 (uuid 가
   * 아니다. 모델이 보는 이름이 이것이고 §7.2 의 출력이 이 이름을 낸다).
   * 아래 복합 FK 가 「그 프로젝트에 실제로 있는 항목인가」를 막는다 (P7).
   */
  aItemId: text('a_item_id'),
  bItemId: text('b_item_id'),
  /**
   * 🔴 `anchor: 'document'` 인 종류(지금은 `open_question` 하나)가 가리키는 **원문 구간**.
   * ⚠ 항목을 여기 담지 마라 — `SourceRef` 는 「원문까지 가는 사슬」이고 항목은 그
   *   사슬의 시작점이지 마디가 아니다 (`CONFLICT_ANCHORS` 주석 · P7).
   */
  aRef: jsonb('a_ref').$type<SourceRef>(),
  bRef: jsonb('b_ref').$type<SourceRef>(),
  question: text('question').notNull(),
  /** §7.2 가 매기는 심각도. 화면 4 가 카드 10장을 고르는 순서가 이 칸이다. */
  severity: conflictSeverity('severity'),
  status: conflictStatus('status').notNull().default('open'),
  resolution: jsonb('resolution').$type<{ choice: ConflictChoice; note?: string }>(),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('conflicts_project_status_idx').on(t.projectId, t.status),
  //  ⚠ `(project_id, public_id)` 로 잇는다 — `public_id` 는 프로젝트 안에서만 유일하다.
  //    a/b 가 NULL 이면 Postgres 가 검사를 건너뛴다 (MATCH SIMPLE) — `open_question`
  //    처럼 항목을 안 가리키는 종류가 막히지 않는 이유다.
  foreignKey({
    name: 'conflicts_a_item_fk',
    columns: [t.projectId, t.aItemId],
    foreignColumns: [contextItems.projectId, contextItems.publicId],
  }),
  foreignKey({
    name: 'conflicts_b_item_fk',
    columns: [t.projectId, t.bItemId],
    foreignColumns: [contextItems.projectId, contextItems.publicId],
  }),
  //  🔴 다섯 줄 전부 위 표에서 나온다. 손으로 종류를 세지 마라.
  conflictShapeCheck('a_item_id', (r) => r.anchor === 'items'),
  conflictShapeCheck('b_item_id', (r) => r.anchor === 'items' && r.needsB),
  conflictShapeCheck('a_ref', (r) => r.anchor === 'document'),
  conflictShapeCheck('b_ref', (r) => r.anchor === 'document' && r.needsB),
  conflictShapeCheck('severity', (r) => r.detected),
])

export const proposals = pgTable('proposals', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  authorId: uuid('author_id').references(() => users.id),
  status: proposalStatus('status').notNull().default('draft'),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  baseVersionId: uuid('base_version_id').references((): AnyPgColumn => contextVersions.id),
  items: jsonb('items').$type<Proposal['items']>().notNull(),
  /** 이 제안이 미는 마일스톤 ID 들 (`BS-M1` 형식). */
  relatesTo: text('relates_to').array().notNull().default([]),
  /** 같은 요청이 두 번 와도 제안이 둘 생기지 않게 한다 (SPEC §5 idempotency). */
  clientRequestId: uuid('client_request_id').notNull().unique(),
  decidedBy: uuid('decided_by').references(() => users.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decisionNote: text('decision_note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('proposals_project_status_created_idx').on(t.projectId, t.status, t.createdAt.desc())])

export const contextVersions = pgTable('context_versions', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  semver: text('semver').notNull(),
  /**
   * 🔴 P4 의 자리. 같은 `snapshot_hash` 는 같은 Pack 을 뜻한다 —
   * 그래서 프로젝트당 유일하다. 같은 내용을 두 버전으로 발행할 수 없다.
   */
  snapshotHash: text('snapshot_hash').notNull(),
  snapshot: jsonb('snapshot').$type<Snapshot>().notNull(),
  manifest: jsonb('manifest').$type<Manifest>().notNull(),
  publishedBy: uuid('published_by').references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  changeSummary: text('change_summary').notNull().default(''),
  createdAt: createdAt(),
}, (t) => [
  unique('context_versions_project_semver_uq').on(t.projectId, t.semver),
  unique('context_versions_project_snapshot_uq').on(t.projectId, t.snapshotHash),
])

export const packFiles = pgTable('pack_files', {
  versionId: uuid('version_id').notNull().references(() => contextVersions.id),
  path: text('path').notNull(),
  content: text('content').notNull(),
  sha256: text('sha256').notNull(),
  /** 줄 범위 → 항목 ID. P7 의 역추적이 이 표를 탄다. */
  sourceMap: jsonb('source_map').$type<SourceMapEntry[]>().notNull().default([]),
  target: packTarget('target').notNull(),
  createdAt: createdAt(),
  //  ⚠ `unique(version_id,path)` 은 복합 PK 가 이미 보장한다 (context_item_revisions 와 같다).
}, (t) => [primaryKey({ columns: [t.versionId, t.path] })])

export const devices = pgTable('devices', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  /** 🔴 토큰 원문은 저장하지 않는다 — sha256 만 (SPEC §11). 응답에 1회만 보여 준다. */
  tokenHash: text('token_hash').notNull().unique(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  /**
   * 🔴 만료 시각 (SPEC §11 「만료 90일」). 기한은 `TOKEN_TTL_DAYS` 하나가 정본이고
   * 발급 라우트가 그 값으로 채운다 — 숫자를 두 곳에 적으면 조용히 갈라진다.
   * ⚠ nullable 이 아니다. null 을 허용하면 「영원히 사는 토큰」이 생기고,
   *   그건 만료가 있다는 주장을 조용히 거짓으로 만든다.
   */
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: createdAt(),
})

export const syncReports = pgTable('sync_reports', {
  id: id(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  versionId: uuid('version_id').references(() => contextVersions.id),
  status: syncStatus('status').notNull(),
  manifestHash: text('manifest_hash').notNull(),
  reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [index('sync_reports_project_device_reported_idx').on(t.projectId, t.deviceId, t.reportedAt.desc())])

export const progressEvents = pgTable('progress_events', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  deviceId: uuid('device_id').references(() => devices.id),
  /** `BS-M1` 또는 「어느 마일스톤도 아님」을 뜻하는 `'none'` (SPEC §4.3). */
  milestoneId: text('milestone_id').notNull(),
  criterion: text('criterion'),
  status: progressStatus('status').notNull(),
  /** 🔴 경로와 줄 번호만이다 — 그 줄에 무엇이 적혀 있는지는 서버가 모른다 (P1). */
  evidence: jsonb('evidence').$type<ProgressEvent['evidence']>().notNull().default([]),
  summary: text('summary').notNull(),
  contextVersion: text('context_version').notNull(),
  source: progressSource('source').notNull(),
  /** `done_candidate` 를 사람이 확정했을 때만 찬다 (SPEC §5 POST /progress/{id}:confirm). */
  confirmedBy: uuid('confirmed_by').references(() => users.id),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  /** 같은 이벤트가 두 번 와도 한 행이다 (SPEC §5 — 중복은 200 idempotent). */
  clientEventId: uuid('client_event_id').notNull().unique(),
  createdAt: createdAt(),
}, (t) => [index('progress_events_project_milestone_created_idx').on(t.projectId, t.milestoneId, t.createdAt.desc())])

/**
 * 🔴 **서버측 AI 호출 장부** (SPEC §2 · §7.5 · P3).
 *
 * ★ 왜 표가 필요한가 — 하루 예산과 빈도 제한은 **요청 사이에 남아 있어야** 한다.
 *   프로세스 메모리에 세면 서버리스에서 인스턴스마다 따로 세고, 콜드 스타트마다
 *   0으로 돌아간다. 그러면 「하루 $3」은 문서에만 있는 숫자가 된다.
 *
 * ⚠ **본문을 담지 않는다** (P1 · SPEC §11). 무엇을 물었는지·무엇이 왔는지는 여기 없다.
 *   행에 있는 것은 「어느 기능이 · 언제 · 토큰 몇 개를 · 얼마어치 썼나」뿐이다.
 * ⚠ `actor_hash` 는 sha256 이다 — IP 나 사용자 ID 원문을 저장하지 않는다.
 */
export const aiUsage = pgTable('ai_usage', {
  id: id(),
  /** 게스트 데모(§7.4)는 프로젝트가 없다 — 그래서 nullable 이다. */
  projectId: uuid('project_id').references(() => projects.id),
  feature: aiFeature('feature').notNull(),
  /** 빈도 제한을 `actor` 범위로 세는 열쇠. 원문이 아니라 sha256 이다 (SPEC §11). */
  actorHash: text('actor_hash'),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  /** USD 의 100만분의 1. 정수로 센다 — 부동소수로 하루치를 더하면 조용히 갈라진다. */
  costMicros: integer('cost_micros').notNull(),
  /** UTC 날짜(`YYYY-MM-DD`). 하루 예산의 창(window)이다. */
  day: text('day').notNull(),
  createdAt: createdAt(),
}, (t) => [
  index('ai_usage_day_feature_idx').on(t.day, t.feature),
  index('ai_usage_created_idx').on(t.createdAt),
])

// ---------------------------------------------------------------------
//  인덱스 7개 — SPEC §2 마지막 줄이 정본이다
//  ★ 이 표는 `test/migration.test.ts` 의 기대값이다. 인덱스를 더하면 여기 한 줄.
//    (unique 제약이 만드는 인덱스는 여기 세지 않는다 — 그건 제약의 부산물이다)
// ---------------------------------------------------------------------
export const INDEX_NAMES = [
  'context_items_project_status_idx',
  'proposals_project_status_created_idx',
  'progress_events_project_milestone_created_idx',
  'sync_reports_project_device_reported_idx',
  'conflicts_project_status_idx',
  //  ★ 예산·빈도 검사가 매 AI 호출 앞에서 도는 질의다 (SPEC §7.5).
  'ai_usage_day_feature_idx',
  'ai_usage_created_idx',
] as const
