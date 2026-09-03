import { z } from 'zod'
import { CommitSha, ItemId, MilestoneId, RepoPath, Sha256, SourceRef } from './common'
import { ContextItemDraft } from './item'

// =====================================================================
//  업로드 payload allowlist (docs/SPEC.md §3.1 · 원칙 P1)
//
//  🔴 **이 파일이 P1 의 방어선이다.** 서버가 받는 네 개의 body 는 전부 여기서
//    `.strict()` 로 파싱된다 — 스키마에 없는 키는 400 이고, 그래서 코드 본문·secret·
//    개인 기억·대화 기록을 실어 보낼 **통로 자체가 없다.**
//
//  ★ 새 업로드 엔드포인트를 더하는 절차:
//    ① 이 파일에 `.strict()` 스키마 하나
//    ② `json-schema.ts` 의 `JSON_SCHEMA_FILES` 표에 한 줄 (플러그인이 로컬 검증에 쓴다)
//    ③ `test/upload-allowlist.test.ts` 의 `UPLOAD_SCHEMAS` 에 한 줄
//    ③을 빠뜨리면 그 엔드포인트만 P1 검사를 안 받는다 — 그래서 테스트가 표를 돈다.
// =====================================================================

/**
 * `scan` 이 만든 요약 (SPEC §8.3). **경로와 이름만** 담는다 — 파일 본문은 없다.
 * ⚠ `env_keys` 는 **키 이름**이다. 값은 이 스키마에 자리가 없다.
 */
export const ScanSummary = z.object({
  file_count: z.int().min(0),
  languages: z.array(z.string().min(1).max(40)).max(30).default([]),
  entrypoints: z.array(RepoPath).max(50).default([]),
  infra_files: z.array(RepoPath).max(100).default([]),
  env_keys: z.array(z.string().min(1).max(100)).max(200).default([]),
  dependencies: z.array(z.string().min(1).max(200)).max(500).default([]),
  excluded: z.array(z.string().min(1).max(200)).max(100).default([]),
}).strict()

/** `POST /projects/{id}/context-items:batch-draft` (SPEC §5) */
export const ContextItemsBatchDraft = z.object({
  items: z.array(ContextItemDraft).min(1).max(50),
  repo: z.string().min(1).max(100),
  scan_summary: ScanSummary,
}).strict()

// ---------------------------------------------------------------------
//  Proposal
// ---------------------------------------------------------------------

/** 제안 연산 3종 (SPEC §3). 무엇이 필요한지가 셋 다 다르다 — 아래 refine 이 잠근다. */
export const PROPOSAL_OPERATIONS = ['add', 'update', 'deprecate'] as const
export type ProposalOperation = (typeof PROPOSAL_OPERATIONS)[number]

/**
 * ⚠ SPEC §3 은 `draft`·`target_item_id` 를 둘 다 optional 로만 뒀지만, `add` 는 초안이
 *   없으면 만들 것이 없고 `update`·`deprecate` 는 대상이 없으면 고칠 것이 없다.
 *   셋을 실제로 갈리게 하는 규칙이라 여기서 잠근다 (차이는 FINDINGS 에 적었다).
 */
export const ProposalItem = z.object({
  operation: z.enum(PROPOSAL_OPERATIONS),
  target_item_id: ItemId.optional(),
  draft: ContextItemDraft.optional(),
  evidence: z.array(SourceRef).min(1).max(20),
  reason: z.string().min(1).max(500),
}).strict().refine(
  (p) => (p.operation === 'add' ? p.draft !== undefined : p.target_item_id !== undefined),
  { message: 'add 는 draft 가, update·deprecate 는 target_item_id 가 필요하다' },
)

export const Proposal = z.object({
  title: z.string().min(2).max(120),
  summary: z.string().max(1000),
  base_version_id: z.uuid(),
  items: z.array(ProposalItem).min(1).max(20),
  relates_to: z.array(MilestoneId).max(10).default([]),
  client_request_id: z.uuid(),
}).strict()

// ---------------------------------------------------------------------
//  ProgressEvent
// ---------------------------------------------------------------------

/** 진행 보고 상태 4종 (SPEC §3). `none` = 이번 작업은 어느 마일스톤에도 해당 없음. */
export const PROGRESS_STATUSES = ['in_progress', 'criterion_done', 'done_candidate', 'none'] as const
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number]

/** 진행 보고를 만든 주체 3종 (SPEC §3). `hook` 은 stop.mjs, `agent` 는 Claude 가 부른 CLI. */
export const PROGRESS_SOURCES = ['agent', 'hook', 'manual'] as const
export type ProgressSource = (typeof PROGRESS_SOURCES)[number]

/** 근거는 **경로와 줄 번호만**이다 — 그 줄에 무엇이 적혀 있는지는 서버가 모른다 (P1). */
export const ProgressEvidence = z.object({
  path: RepoPath,
  start_line: z.int().min(1).optional(),
  end_line: z.int().min(1).optional(),
  commit_sha: CommitSha.optional(),
}).strict()

/** `POST /projects/{id}/progress` (SPEC §5) */
export const ProgressEvent = z.object({
  /** `none` 상태일 때는 마일스톤 ID 대신 `'none'` 이 온다 (SPEC §4.3 의 CLI 사용법). */
  milestone_id: z.union([MilestoneId, z.literal('none')]),
  status: z.enum(PROGRESS_STATUSES),
  criterion: z.string().min(1).max(200).optional(),
  evidence: z.array(ProgressEvidence).max(20).default([]),
  summary: z.string().min(1).max(300),
  context_version: z.string().min(1).max(40),
  source: z.enum(PROGRESS_SOURCES),
  client_event_id: z.uuid(),
}).strict()

// ---------------------------------------------------------------------
//  SyncReport
// ---------------------------------------------------------------------

/**
 * 기기 동일성 상태 5종 (SPEC §6).
 * ⚠ `unknown` 은 **보고가 없을 때 서버가 매기는 값**이라 보고로는 올라오지 않는다.
 *   그래서 아래 `REPORTABLE_SYNC_STATUSES` 와 나뉜다 — 둘이 같아지면 `unknown` 을
 *   기기가 자칭할 수 있게 되고, 「보고 없음」과 「모르겠다고 보고함」이 섞인다.
 */
export const SYNC_STATUSES = ['applied', 'outdated', 'modified', 'manual', 'unknown'] as const
export type SyncStatus = (typeof SYNC_STATUSES)[number]

export const REPORTABLE_SYNC_STATUSES = ['applied', 'outdated', 'modified', 'manual'] as const
export type ReportableSyncStatus = (typeof REPORTABLE_SYNC_STATUSES)[number]

/** `POST /projects/{id}/sync-reports` (SPEC §5) */
export const SyncReport = z.object({
  version: z.string().min(1).max(40),
  manifest_hash: Sha256,
  status: z.enum(REPORTABLE_SYNC_STATUSES),
  files: z.array(z.object({ path: RepoPath, sha256: Sha256 }).strict()).max(50),
}).strict()

export type ScanSummary = z.infer<typeof ScanSummary>
export type Proposal = z.infer<typeof Proposal>
export type ProgressEvent = z.infer<typeof ProgressEvent>
export type SyncReport = z.infer<typeof SyncReport>
export type ContextItemsBatchDraft = z.infer<typeof ContextItemsBatchDraft>
