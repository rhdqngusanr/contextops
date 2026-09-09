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
//    ⑤ 🔴 **`.enableRLS()` 를 끝에 붙인다.** 모든 표는 RLS 가 켜져 있다(정책 없음 = anon/authenticated
//       전면 거부). 브라우저에 실리는 anon 키가 Supabase Data API 로 표를 읽고 쓰는 길을 막는
//       방어선이다 — 서버는 표 소유자 역할로 직결이라 영향이 없다 (2026-09-09 · 마이그레이션 0008 ·
//       `test/migration.test.ts` 가 「꺼진 표 0」을 잰다 · Data API 자체는 docs/DEPLOY.md 걸음에서 끈다)
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
  AI_JOB_STATUSES,
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
  PROPOSAL_STATUSES,
  REPORTABLE_SYNC_STATUSES,
  SOURCE_DOCUMENT_KINDS,
  type ScanSummary,
  TEAM_ROLES,
  type AiJobStatus,
  type ConflictChoice,
  type ConflictKindRule,
  type Manifest,
  type Proposal,
  type ProgressEvent,
  type Scope,
  type SourceRef,
} from '@contextops/schema'
import type { Snapshot } from '@contextops/compiler'

//  ⚠ 서버측 AI 의 기능 4종은 **계약이 아니라 서버 전용**이라 `packages/schema` 가 아니라
//    `src/lib/ai/features.ts` 가 정본이다 (그 파일 머리 주석). 여기서는 **읽기만** 한다.
//    그 파일은 의존이 없다 — 순환이 생기지 않는다.
import { AI_FEATURES, AI_JOB_FEATURES } from '../lib/ai/features'

// ---------------------------------------------------------------------
//  DB 안에서만 사는 값 목록
//  ★ 왜 여기 있나 — 이 셋은 업로드 payload 에도 Pack 에도 안 나온다. 소비처가
//    DB 와 API 응답뿐이라 정본을 여기 둔다. **API 계약이 이 값을 쓰게 되는 순간
//    `packages/schema` 로 올려라** — 그때가 「둘째 사용자」다 (CLAUDE.md).
// ---------------------------------------------------------------------

/** 팀 참여 상태 2종 (SPEC §2). 초대는 아직 화면이 없어 API 계약에 안 나온다. */
export const TEAM_MEMBER_STATUSES = ['active', 'invited'] as const
/**
 * 항목 개정이 어디서 왔나 4종 (SPEC §2). 서버가 매기는 값이라 payload 에 자리가 없다.
 *
 * 🔴 **넷 다 찍는 자리가 있다 — 그 자리는 라우트가 아니라 `insertDrafts()` 의 인자다**
 *   (`lib/api/item.ts`): `doc` = 구조화 후보를 사람이 받아들인 문(§7.1) ·
 *   `code` = scan 이 올린 초안(`batch-draft`) · `manual` = 씨앗 질문 답변과 부분 갱신 ·
 *   `proposal` = 발행 트랜잭션. ★ 값을 하나 더하면 **넣는 자리를 같이 만들어라** —
 *   찍는 곳이 0곳인 값은 그 값을 읽는 판정(§7.2 의 `doc_vs_code`)을 영원히 0건으로
 *   만든다 (FINDINGS 31·84).
 */
export const REVISION_ORIGINS = ['doc', 'code', 'manual', 'proposal'] as const
export type RevisionOrigin = (typeof REVISION_ORIGINS)[number]
/** 수명 한 칸이 「어느 칸을 채우고 있어야 하는가」. */
export interface AiJobStatusRule {
  /** 누군가 집어 갔나 (`started_at` 이 찼나). */
  readonly started: boolean
  /** 끝났나 (`finished_at` 이 찼나). */
  readonly finished: boolean
  /** 결과가 있나 (`result`). */
  readonly result: boolean
  /** 에러 코드가 있나 (`error_code`). */
  readonly error: boolean
}

/**
 * 🔴 **수명 4종의 뜻을 문장이 아니라 표로 적는다.** 아래 `aiJobs` 의 CHECK 제약
 * 넷이 이 표에서 **생성된다** — 그래서 네 상태가 전부 서로 다른 모양을 강제한다.
 *
 * ★ 왜 제약까지 가나 — 「succeeded 인데 result 가 없는 행」은 화면에 「끝남」으로
 *   멀쩡히 뜨고 눌렀을 때 보여 줄 것이 없다. 그게 이 저장소가 매 바퀴 찾는
 *   「정의만 있고 아무 일도 안 하는 것」이 job 에서 나타나는 모양이다.
 * ★ 상태를 더하는 절차: ① `AI_JOB_STATUSES` **끝에** 값 ② 이 표에 한 줄
 *   ③ `pnpm --filter web db:generate` — CHECK 이 따라온다.
 */
export const AI_JOB_STATUS_RULES: Record<AiJobStatus, AiJobStatusRule> = {
  queued: { started: false, finished: false, result: false, error: false },
  running: { started: true, finished: false, result: false, error: false },
  succeeded: { started: true, finished: true, result: true, error: false },
  failed: { started: true, finished: true, result: false, error: true },
}

//  ⚠ `TEAM_ROLES`·`SOURCE_DOCUMENT_KINDS`·`CONFLICT_KINDS`·`CONFLICT_STATUSES`·
//    **`AI_JOB_STATUSES`**·**`PROPOSAL_STATUSES`** 는 여기 있었지만
//    **화면·계약이 그 값을 쓰게 되면서**
//    `@contextops/schema` 로 올라갔다 (위 주석의 「둘째 사용자」 규칙).
//    이제 아래 `pgEnum` 이 그 표를 읽기만 한다.
//    ⚠ 수명 **규칙**(`AI_JOB_STATUS_RULES`)은 안 올라갔다 — 그 표는 CHECK 제약을
//      만드는 DB 의 말이고, 화면은 그 판정(`stalled`)을 서버가 낸 값으로 받는다.

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
/** AI job 의 수명 4종 (SPEC §9 화면 3). 위 `AI_JOB_STATUSES` 가 정본이다. */
export const aiJobStatus = pgEnum('ai_job_status', AI_JOB_STATUSES)

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
}).enableRLS()

export const teams = pgTable('teams', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  /** `{auto_apply:boolean, auto_submit:boolean}` (SPEC §2). */
  settings: jsonb('settings').$type<{ auto_apply: boolean; auto_submit: boolean }>().notNull()
    .default({ auto_apply: false, auto_submit: false }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS()

export const teamMembers = pgTable('team_members', {
  teamId: uuid('team_id').notNull().references(() => teams.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: teamRole('role').notNull(),
  status: teamMemberStatus('status').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [primaryKey({ columns: [t.teamId, t.userId] })]).enableRLS()

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
}, (t) => [unique('projects_team_slug_uq').on(t.teamId, t.slug)]).enableRLS()

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
}).enableRLS()

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
}).enableRLS()

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
}, (t) => [unique('source_document_versions_doc_rev_uq').on(t.documentId, t.revision)]).enableRLS()

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
]).enableRLS()

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
}, (t) => [primaryKey({ columns: [t.itemId, t.revision] })]).enableRLS()

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
  return shapeCheck({
    table: 'conflicts',
    by: 'kind',
    column,
    all: CONFLICT_KINDS,
    filled: CONFLICT_KINDS.filter((k) => needs(CONFLICT_KIND_RULES[k])),
  })
}

/**
 * 🔴 **「어느 값일 때 이 칸이 차는가」를 표에서 DB CHECK 으로 내리는 공용 문.**
 *
 * ★ 원래 `conflicts` 전용이었다. `ai_jobs` 가 **둘째 사용자**가 되어 정본으로 올렸다
 *   (CLAUDE.md 「둘째 사용자가 생기면 그때 정본으로 올린다」). 셋째가 오면 그대로 쓴다.
 *
 * @param by      종류를 가르는 컬럼 (`kind` · `status`)
 * @param column  채워져야 하는가를 잴 컬럼
 * @param all     `by` 컬럼이 가질 수 있는 값 전부
 * @param filled  그중 이 칸이 **차야 하는** 값들 — 표에서 걸러 온 것이지 손으로 적은 게 아니다
 */
function shapeCheck(opts: {
  table: string
  by: string
  column: string
  all: readonly string[]
  filled: readonly string[]
}) {
  const filled = `"${opts.column}" is not null`
  //  ⚠ `kind in ()` 는 SQL 이 아니다. 아무 값도 안 쓰는 칸(지금은 `conflicts.b_ref`)과
  //     모든 값이 쓰는 칸은 양쪽 끝의 갈래로 따로 낸다.
  const body: string =
    opts.filled.length === 0 ? `"${opts.column}" is null`
    : opts.filled.length === opts.all.length ? filled
    : `(${filled}) = ("${opts.by}" in (${opts.filled.map((v) => `'${v}'`).join(', ')}))`
  //  `sql.raw` 를 쓰는 근거: 이 문자열의 재료는 **전부 우리 표의 상수**다. 외부 입력이
  //  섞이는 자리가 하나도 없다 (컬럼 이름도 호출부가 리터럴로 준다).
  return check(`${opts.table}_${opts.column}_shape_ck`, sql.raw(body) as SQL)
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
]).enableRLS()

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
}, (t) => [index('proposals_project_status_created_idx').on(t.projectId, t.status, t.createdAt.desc())]).enableRLS()

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
]).enableRLS()

export const packFiles = pgTable('pack_files', {
  versionId: uuid('version_id').notNull().references(() => contextVersions.id),
  path: text('path').notNull(),
  content: text('content').notNull(),
  sha256: text('sha256').notNull(),
  //  🔴 여기에 `source_map`(줄 범위 → 항목 ID) 칸이 있었다. 지웠다 (FINDINGS 34).
  //     P7 의 역추적 정본은 **본문에 박힌 `<!-- ctx:… -->` 태그**다 — 태그는 플러그인이
  //     받는 바이트 안에 있어서 오프라인에서도 되짚어지고, 칸은 서버에 물어봐야만 살았다.
  //     저장은 하는데 **읽는 라우트가 0곳**이라 아무 일도 안 했다. 되살리지 마라 —
  //     역추적을 두 곳에 두면 둘이 갈리고, 그때 어느 쪽이 맞는지 아무도 모른다.
  target: packTarget('target').notNull(),
  createdAt: createdAt(),
  //  ⚠ `unique(version_id,path)` 은 복합 PK 가 이미 보장한다 (context_item_revisions 와 같다).
}, (t) => [primaryKey({ columns: [t.versionId, t.path] })]).enableRLS()

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
}).enableRLS()

export const syncReports = pgTable('sync_reports', {
  id: id(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  versionId: uuid('version_id').references(() => contextVersions.id),
  status: syncStatus('status').notNull(),
  manifestHash: text('manifest_hash').notNull(),
  reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (t) => [index('sync_reports_project_device_reported_idx').on(t.projectId, t.deviceId, t.reportedAt.desc())]).enableRLS()

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
}, (t) => [index('progress_events_project_milestone_created_idx').on(t.projectId, t.milestoneId, t.createdAt.desc())]).enableRLS()

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
]).enableRLS()

/**
 * 🔴 **한 요청 안에서 안 끝나는 AI 일 하나** (SPEC §7.1·§7.2 · §9 화면 3).
 *
 * ★ 왜 표 **하나**인가 — 구조화(§7.1)와 탐지(§7.2)는 「무엇을 읽나」만 다르고
 *   수명은 같다 (queued → running → succeeded|failed). 둘을 따로 만들면 화면 3 이
 *   polling 할 자리가 둘이 되고, 세 번째 기능이 job 이 될 때 셋이 된다.
 *   기능마다 다른 것은 `input`·`result` **두 칸의 내용**뿐이고, 그 모양의 정본은
 *   `lib/ai/job.ts` 의 `AI_JOB_RUNNERS` 표다 (Zod 로 판 뒤에만 여기 들어온다).
 *
 * ⚠ **본문을 담지 않는다** (P1 · SPEC §11). `input` 은 **가리키는 id** 뿐이다
 *   (`document_version_id` · `item_<slug>` 목록) — 문서 본문도 항목 본문도 아니다.
 *   `error_code` 는 `ERROR_CODES` 의 코드 하나이고, **모델의 응답이나 드라이버
 *   메시지를 여기 적지 마라.** 적으면 P1 이 막는 것이 DB 로 새는 자리가 된다.
 *
 * ⚠ 왜 `feature` 가 `ai_feature`(4종)인데 CHECK 으로 다시 좁히나 — 열은 장부
 *   (`ai_usage`)와 **같은 enum** 이어야 「이 프로젝트가 이번 시간에 무엇을 썼나」를
 *   한 낱말로 잇는다. 그런데 job 으로 도는 것은 그중 둘뿐이고, 그 둘이 어느 것인지는
 *   `AI_FEATURE_LIMITS` 의 `job` 축이 정한다 — 그래서 목록이 아니라 **제약**으로 내린다.
 */
export const aiJobs = pgTable('ai_jobs', {
  id: id(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  feature: aiFeature('feature').notNull(),
  status: aiJobStatus('status').notNull().default('queued'),
  /** 무엇을 대상으로 하는가. 기능마다 다르고 정본은 `AI_JOB_RUNNERS[feature].input` 이다. */
  input: jsonb('input').notNull(),
  /** 성공했을 때만 찬다 (CHECK). 화면 3·4 가 읽는 것이 이 칸이다. */
  result: jsonb('result'),
  /**
   * 🔴 **도는 동안** 러너가 몇 걸음 갔나 (`{done, total, unit}` · 정본은
   * `lib/ai/job.ts` 의 `AiJobProgress`). 화면 3 의 polling 이 읽는 유일한 **새 정보**다.
   *
   * ★ 왜 `result` 로는 안 되나 — `result` 는 `succeeded` 여야 찰 수 있다 (CHECK).
   *   즉 진행을 거기 쓰면 「끝난 것」의 뜻이 무너진다. 그래서 칸을 따로 둔다.
   * ★ 왜 `AI_JOB_STATUS_RULES` 의 축이 **아닌가** — 그 표는 「이 상태면 이 칸이
   *   차 있어야 한다」인데 진행률은 그렇게 못 적는다: `running` 이어도 첫 걸음을
   *   보고하기 전까지는 비어 있고(총수는 러너가 문서를 나눠 봐야 안다),
   *   `succeeded`·`failed` 에도 **남아 있어야 한다** — 「9/12 에서 죽었다」가
   *   실패 화면이 사람에게 할 수 있는 유일한 말이다. 수명이 정하는 칸이 아니라
   *   **수명과 나란히 흐르는 칸**이라 CHECK 밖이다.
   */
  progress: jsonb('progress'),
  /** 실패했을 때만 찬다 (CHECK). `@contextops/schema` 의 `ERROR_CODES` 중 하나다. */
  errorCode: text('error_code'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  //  ★ 화면 3 은 「이 프로젝트의 최근 job」을 읽는다 (polling 이 매번 도는 질의다).
  index('ai_jobs_project_created_idx').on(t.projectId, t.createdAt.desc()),
  //  🔴 job 으로 도는 기능만 행이 될 수 있다 — 목록은 `AI_JOB_FEATURES` 에서 온다.
  check('ai_jobs_feature_ck', sql.raw(`"feature" in (${AI_JOB_FEATURES.map((f) => `'${f}'`).join(', ')})`) as SQL),
  //  🔴 넷 다 `AI_JOB_STATUS_RULES` 에서 생성된다. 손으로 상태 이름을 적지 마라.
  aiJobShapeCheck('started_at', (r) => r.started),
  aiJobShapeCheck('finished_at', (r) => r.finished),
  aiJobShapeCheck('result', (r) => r.result),
  aiJobShapeCheck('error_code', (r) => r.error),
]).enableRLS()

/** `conflictShapeCheck` 와 같은 자리 — 표의 한 줄을 보고 그 상태가 그 칸을 갖는지 답한다. */
function aiJobShapeCheck(column: string, needs: (rule: AiJobStatusRule) => boolean) {
  return shapeCheck({
    table: 'ai_jobs',
    by: 'status',
    column,
    all: AI_JOB_STATUSES,
    filled: AI_JOB_STATUSES.filter((st) => needs(AI_JOB_STATUS_RULES[st])),
  })
}

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
  //  ★ 화면 3 의 polling 이 매번 도는 질의다 (SPEC §9).
  'ai_jobs_project_created_idx',
] as const
