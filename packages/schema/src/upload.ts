import { z } from 'zod'
import { CommitSha, ItemId, MilestoneId, RepoName, RepoPath, Sha256, SourceRef } from './common'
import { ContextItemDraft, type ContextItemDraft as ContextItemDraftType } from './item'

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
 * 🔴 **스캔 산출물의 상한표.** 스키마와 **스캐너가 같은 값을 봐야 한다** —
 * 스캐너가 더 많이 담으면 업로드가 400 이고, 덜 담으면 상한이 거짓말이 된다.
 * ★ 스캐너는 `plugin/contextops/src/cli/scan.ts` 에서 이 표를 그대로 읽는다.
 */
export const SCAN_LIMITS = {
  files: 5000,
  languages: 30,
  entrypoints: 50,
  infra_files: 100,
  env_keys: 200,
  dependencies: 500,
  excluded: 100,
  /** 제외 사유 한 줄의 길이. 경로가 길다는 이유로 스캔이 실패하지 않게 자르는 기준. */
  note_chars: 200,
} as const

/**
 * `scan` 이 만든 요약 (SPEC §8.3). **경로와 이름만** 담는다 — 파일 본문은 없다.
 * ⚠ `env_keys` 는 **키 이름**이다. 값은 이 스키마에 자리가 없다.
 */
export const ScanSummary = z.object({
  file_count: z.int().min(0),
  languages: z.array(z.string().min(1).max(40)).max(SCAN_LIMITS.languages).default([]),
  entrypoints: z.array(RepoPath).max(SCAN_LIMITS.entrypoints).default([]),
  infra_files: z.array(RepoPath).max(SCAN_LIMITS.infra_files).default([]),
  env_keys: z.array(z.string().min(1).max(100)).max(SCAN_LIMITS.env_keys).default([]),
  dependencies: z.array(z.string().min(1).max(200)).max(SCAN_LIMITS.dependencies).default([]),
  excluded: z.array(z.string().min(1).max(SCAN_LIMITS.note_chars)).max(SCAN_LIMITS.excluded).default([]),
}).strict()

/**
 * 한 번에 올릴 수 있는 초안 수. `.contextops/cache/draft.json`(`ContextItemDraftFile`)과
 * 이 body 가 **같은 상한**을 봐야 한다 — 로컬 검증은 통과하는데 업로드가 400 이 되면
 * init Skill 은 왜 막혔는지 사람에게 설명할 수 없다.
 */
export const MAX_DRAFT_ITEMS = 50

/** `POST /projects/{id}/context-items:batch-draft` (SPEC §5) */
export const ContextItemsBatchDraft = z.object({
  items: z.array(ContextItemDraft).min(1).max(MAX_DRAFT_ITEMS),
  repo: RepoName,
  scan_summary: ScanSummary,
}).strict()

/**
 * 같은 엔드포인트의 **응답** (SPEC §5 「{accepted, rejected[{index, issues}]}」).
 *
 * ★ 왜 응답까지 계약으로 두나 — 이걸 읽는 것은 사람이 아니라 **플러그인과 Skill** 이다
 *   (`upload-draft` 가 거절 목록을 모델에게 보여 주고 고치게 한다). 손으로 캐스트하면
 *   서버가 모양을 바꾼 날 `undefined.length` 로 죽고, 사람은 「업로드가 깨졌다」로 읽는다.
 * ⚠ `index` 는 **보낸 배열의 자리**다. 항목 id 가 아니다 — 거절 사유가 id 인 경우
 *   (중복·이미 있음) id 를 못 믿기 때문이다.
 */
export const ContextItemsBatchDraftResult = z.object({
  accepted: z.array(z.object({ index: z.int().min(0), id: z.string() }).strict()),
  rejected: z.array(z.object({
    index: z.int().min(0),
    issues: z.array(z.object({ path: z.string(), message: z.string() }).strict()),
  }).strict()),
  /**
   * 받아들인 항목이 있으면 서버가 시작한 **탐지 job 의 id** · 없으면 `null` (§7.2).
   *
   * 🔴 **id 뿐이고 job 객체가 아니다** (FINDINGS 63) — 객체로 실으면 목록(`summary`)·
   *    상세(`full`) 말고 `shape` 도 `progress` 도 `stalled` 도 없는 **셋째 모양**이 생기고,
   *    화면이 그것을 job 으로 들고 다니면 「멈춤」을 `undefined` 로 읽는다(=거짓).
   *    받은 쪽이 할 일은 하나다: 이 id 로 목록·상세를 **읽으러 간다.**
   *
   * ⚠ 이 칸이 없어서 **플러그인이 성공한 업로드를 실패로 보고했다** (FINDINGS 44):
   *   서버는 `job` 을 실어 보내는데 이 계약이 `.strict()` 라 `unrecognized_keys` 로 죽었고,
   *   `upload-draft` 는 「서버 응답이 계약과 맞지 않는다」로 끝났다. 시험의 픽스처가
   *   서버가 **실제로 내는 모양이 아니어서** 초록이었다 — 그래서 라우트가 이 계약으로
   *   한 번 파싱해서 낸다 (`batch-draft/route.ts`).
   */
  job_id: z.string().nullable(),
}).strict()
export type ContextItemsBatchDraftResult = z.infer<typeof ContextItemsBatchDraftResult>

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
//  ⚠ 항목 한 칸의 타입도 같이 내보낸다 — 화면 6 이 제안의 항목마다 카드를 그리는데,
//    그 모양(`{operation, target_item_id?, draft?, evidence, reason}`)을 손으로 다시
//    적으면 계약이 넓어질 때 화면만 조용히 갈라진다 (`ProgressEvidence` 와 같은 이유).
//  🔴 `draft` 만 손으로 갈아 끼운다 — `ContextItemDraft` 는 타입별로 `data` 가 갈리는
//     **공개 타입**이 따로 있고 (`item.ts` 의 mapped type), zod 추론만 쓰면 그 칸이
//     `{}` 로 뭉개져서 화면이 `draft.body` 한 글자도 못 읽는다.
export type ProposalItem = Omit<z.infer<typeof ProposalItem>, 'draft'> & { draft?: ContextItemDraftType }
export type ProgressEvent = z.infer<typeof ProgressEvent>
//  ⚠ 근거 한 칸의 타입도 같이 내보낸다 — 화면 8 이 그 모양을 손으로 다시 적으면
//    (`{path, start_line?…}`) 계약이 넓어질 때 화면만 조용히 갈라진다.
export type ProgressEvidence = z.infer<typeof ProgressEvidence>
export type SyncReport = z.infer<typeof SyncReport>
export type ContextItemsBatchDraft = z.infer<typeof ContextItemsBatchDraft>
