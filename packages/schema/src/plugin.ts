import { z } from 'zod'
import { DeviceToken, MilestoneId, RepoName, RepoPath } from './common'
import { ContextItemDraft } from './item'
import { MAX_DRAFT_ITEMS, PROGRESS_STATUSES, Proposal, SCAN_LIMITS, ScanSummary, SyncReport } from './upload'

// =====================================================================
//  플러그인이 **로컬 디스크에 두는 파일들**의 계약 (docs/SPEC.md §8.2)
//
//  ★ 왜 여기(`packages/schema`)에 있나 — 이 파일들은 CLI 에게 **외부 입력**이다.
//    사람이 손으로 고치고, 다른 바퀴의 CLI 가 쓰고, git 으로 팀에 퍼진다.
//    「우리가 쓴 파일이니 믿는다」로 두면 계약이 바뀐 뒤 옛 파일이 조용히 이상하게
//    해석된다. 파싱하는 자리를 하나로 둔다 (CLAUDE.md 「모든 외부 입력은 schema 로」).
//
//  ⚠ 여기 있는 것들은 **올라가지 않는다.** 업로드 allowlist 는 `upload.ts` 다.
//    그래서 토큰이 이 파일에 나오는 것이 P1 위반이 아니다 — 토큰은 로컬에만 산다.
//
//  ★ 새 로컬 파일을 더하는 절차: ① 이 파일에 `.strict()` 스키마 하나
//    ② `plugin/contextops/src/cli/paths.ts` 의 `LOCAL_FILES` 표에 한 줄 (자리의 정본)
//    ③ 읽는 쪽은 반드시 이 스키마로 판다 — `JSON.parse` 결과를 그대로 쓰지 마라
// =====================================================================

/**
 * API 서버의 **origin** (`https://호스트[:포트]`). 경로도 끝 슬래시도 없다.
 * ★ 왜 origin 까지만인가 — CLI 는 여기에 `/api/v1/...` 을 이어 붙인다. 끝 슬래시가
 *   섞이면 `//api/v1` 이 되고, 서버에 따라 404 와 301 로 갈린다.
 */
export const ApiOrigin = z.string().min(8).max(200)
  .regex(/^https?:\/\/[^\s/?#]+$/, 'http(s)://호스트 형식이어야 한다 (경로·끝 슬래시 없음)')

/**
 * `<repo>/.contextops/project.json` — **커밋한다.** 팀원이 clone 하면 그대로 쓴다.
 *
 * 🔴 **secret 이 들어갈 자리가 없다** (`.strict()`). 토큰은 `CredentialsFile` 로만 산다.
 * ⚠ `team_id`·`repo_id` 는 optional 이다 — 기기 토큰만으로는 알아낼 수 없고
 *   (팀 목록은 사람 세션 전용 · `GET /repos` 는 아직 없다), 없어도 sync 는 돈다.
 *   있으면 화면 링크와 `source_refs.repo` 를 이어 주는 값이다.
 */
export const ProjectConfig = z.object({
  api_origin: ApiOrigin,
  project_id: z.uuid(),
  team_id: z.uuid().optional(),
  repo_id: z.uuid().optional(),
  /** `batch-draft` 의 `repo` 와 근거(`repository_path.repo`)가 가리킬 이름. */
  repo_name: RepoName.optional(),
}).strict()
export type ProjectConfig = z.infer<typeof ProjectConfig>

/**
 * 기기 하나의 자격증명. 원문 토큰은 발급 응답 **한 번**뿐이라 여기 말고는 없다.
 * ⚠ `device_id` 는 optional 이다 — 발급 응답에만 있는 값이라, 사람이 웹에서 토큰만
 *   복사해 오면 알 수 없다. 있으면 `DELETE /devices/{id}` 로 이 기기만 끊을 수 있다.
 */
export const DeviceCredential = z.object({
  token: DeviceToken,
  device_id: z.uuid().optional(),
}).strict()
export type DeviceCredential = z.infer<typeof DeviceCredential>

// ---------------------------------------------------------------------
//  `contextops setup` **한 줄의 정본** (SPEC §8.3 · FINDINGS 36)
//
//  ★ 왜 스키마에 있나 — 이 한 줄을 **만드는 쪽**(웹 화면 9 「기기 추가」)과 **받는 쪽**
//    (플러그인 CLI)이 서로 다른 패키지다. 각자 적으면 플래그 이름이 조용히 갈리고,
//    그때의 증상은 **화면이 복사해 준 줄을 CLI 가 모른다**는 것이다 — 사람은 그걸
//    자기 오타로 안다. 둘 다 여기 하나를 읽으면 갈릴 자리가 없다.
//
//  🔴 **새 플래그를 이 줄에 더하려면**: ① 아래 `SETUP_COMMAND_FLAGS` 에 이름
//     ② `setupCommandLine` 의 값 표에 한 줄(`Record` 라 빠뜨리면 타입이 먼저 막는다)
//     ③ `plugin/contextops/src/cli/setup.ts` 의 `SETUP_FLAGS` 에 그 이름이 있어야 한다
//     — `plugin/contextops/test/setup-command.test.ts` 가 ③ 을 센다.
//
//  ⚠ 토큰이 이 문자열 안에 들어간다. **로그에 찍지 마라** (P1 · SPEC §11) —
//    화면은 사람이 복사할 때까지만 들고 있고, 어디에도 저장하지 않는다.
// ---------------------------------------------------------------------

/** 이 줄이 넘기는 플래그 — **차례가 곧 화면에 그려지는 차례**다. */
export const SETUP_COMMAND_FLAGS = ['api-origin', 'project', 'token', 'device-id'] as const
export type SetupCommandFlag = (typeof SETUP_COMMAND_FLAGS)[number]

/** 명령 이름 — `COMMANDS` 표의 `usage` 와 같은 말이다 (`contextops setup [옵션]`). */
export const SETUP_COMMAND_NAME = 'contextops setup'

export type SetupCommandArgs = {
  api_origin: string
  project_id: string
  token: string
  /** 발급 응답의 `device_id`. 있어야 나중에 **이 기기만** 끊을 수 있다. */
  device_id: string
}

/** `contextops setup --api-origin … --project … --token … --device-id …` 한 줄. */
export function setupCommandLine(args: SetupCommandArgs): string {
  const values: Record<SetupCommandFlag, string> = {
    'api-origin': args.api_origin,
    'project': args.project_id,
    'token': args.token,
    'device-id': args.device_id,
  }
  return [SETUP_COMMAND_NAME, ...SETUP_COMMAND_FLAGS.map((f) => `--${f} ${values[f]}`)].join(' ')
}

/**
 * `~/.contextops/credentials.json` (chmod 600) — `{origin: {project_id: {…}}}`.
 *
 * ★ 왜 두 겹인가 — 한 사람이 여러 서버(사내·클라우드)의 여러 프로젝트를 동시에 쓴다.
 *   파일을 origin 마다 따로 두면 `setup` 이 어느 파일을 고칠지 매번 정해야 하고,
 *   프로젝트 하나만 키로 쓰면 서버가 다른 같은 uuid 가 서로를 덮는다.
 */
export const CredentialsFile = z.record(ApiOrigin, z.record(z.uuid(), DeviceCredential))
export type CredentialsFile = z.infer<typeof CredentialsFile>

/**
 * 스캔이 찾은 파일 하나. **경로와 분류뿐이다** — 본문은 이 스키마에 자리가 없다 (P1).
 * ⚠ `language` 는 확장자 표(`plugin/…/src/cli/scan-tables.ts`)가 정한 이름이다.
 */
export const ScanFile = z.object({
  path: RepoPath,
  language: z.string().min(1).max(40),
}).strict()
export type ScanFile = z.infer<typeof ScanFile>

/**
 * `<repo>/.contextops/cache/scan.json` — `scan` 이 만들고 init Skill 이 읽는다 (SPEC §8.3).
 *
 * 🔴 **`summary` 만 서버로 간다** (`ContextItemsBatchDraft.scan_summary`). `files` 는
 *   Claude 가 「무엇을 읽을지」 고르는 로컬 목록이고 업로드 스키마에 자리가 없다.
 * ★ 그래서 `summary` 를 **모델이 짓지 않는다.** 결정론 스캔이 잰 값이 그대로 올라간다.
 */
export const ScanResult = z.object({
  repo: RepoName,
  files: z.array(ScanFile).max(SCAN_LIMITS.files),
  summary: ScanSummary,
}).strict()
export type ScanResult = z.infer<typeof ScanResult>

/**
 * `<repo>/.contextops/cache/draft.json` — init Skill 이 쓰고 `upload-draft` 가 읽는다.
 *
 * ★ 왜 `ContextItemsBatchDraft` 를 그대로 안 쓰나 — 그 body 에는 `scan_summary` 가 있다.
 *   모델이 쓰는 파일에 그 칸을 두면 **모델이 스캔 결과를 지어낼 수 있다.**
 *   초안은 항목만 적고, 나머지 둘은 `upload-draft` 가 `scan.json` 에서 붙인다.
 */
export const ContextItemDraftFile = z.object({
  items: z.array(ContextItemDraft).min(1).max(MAX_DRAFT_ITEMS),
}).strict()
export type ContextItemDraftFile = z.infer<typeof ContextItemDraftFile>

/**
 * `<repo>/.contextops/cache/sync-receipt.json` — **보내지 못한 sync 보고** (SPEC §8.5 8단계).
 *
 * ★ 왜 파일로 남기나 — 마지막 걸음(보고)이 네트워크다. 거기서 실패했다고 sync 를
 *   실패로 되돌리면 **이미 올바르게 적용된 파일들을 되돌리는** 꼴이 된다. 그래서
 *   적용은 성공으로 끝내고 보고만 미룬다. 다음 `status` 가 이 파일을 보고 다시 보낸다.
 * ⚠ `SyncReport` 를 그대로 품는다 — 보낼 값을 다시 조립하지 않는다. 조립을 두 번 하면
 *   재전송된 보고가 원래 보고와 달라질 수 있고, 그러면 화면이 거짓말한다.
 */
export const SyncReceiptFile = z.object({
  project_id: z.uuid(),
  api_origin: ApiOrigin,
  report: SyncReport,
}).strict()
export type SyncReceiptFile = z.infer<typeof SyncReceiptFile>

/**
 * `<repo>/.contextops/pending-proposal.json` — **Stop 훅이 남긴 힌트** (SPEC §8.6).
 *
 * ★ 왜 제안 그 자체가 아니라 힌트인가 — 훅에는 LLM 이 없다. 무엇이 바뀌었는지만
 *   알고, **왜 바뀌었는지는 모른다.** 제안 본문을 훅이 지어내면 그건 근거 없는 줄이고
 *   P7 이 끊긴다. 그래서 경로 목록과 한 줄짜리 이유만 남기고, 제안은 다음 세션의
 *   propose Skill 이 사람과 함께 쓴다.
 * ⚠ `.strict()` 다 — 훅이 파일 본문을 여기 담을 자리가 없다 (P1).
 */
export const PendingProposalFile = z.object({
  changed_paths: z.array(RepoPath).min(1).max(50),
  hint: z.string().min(1).max(300),
}).strict()
export type PendingProposalFile = z.infer<typeof PendingProposalFile>

/**
 * `<repo>/.contextops/cache/progress-<session>.json` — **이번 세션에 이미 보고했다**는 표시.
 *
 * ★ 왜 있나 — 같은 세션에서 agent 가 `progress` 를 부른 뒤 Stop 훅이 또 보고하면
 *   Roadmap 의 근거 개수가 부풀고 「근거 3건」이 사실은 같은 작업 하나가 된다 (P7).
 *   훅은 이 파일이 있으면 조용히 물러선다 (SPEC §8.6).
 * ⚠ 파일 이름이 세션마다 다르므로 `LOCAL_FILES` 표에 없다 — 자리의 정본은
 *   `plugin/contextops/src/cli/paths.ts` 의 `progressMarkerFile()` 하나다.
 */
export const ProgressMarkerFile = z.object({
  session_id: z.string().min(1).max(200),
  milestone_id: z.union([MilestoneId, z.literal('none')]),
  status: z.enum(PROGRESS_STATUSES),
}).strict()
export type ProgressMarkerFile = z.infer<typeof ProgressMarkerFile>

/**
 * `<repo>/.contextops/cache/proposal.json` — propose Skill 이 쓰고 `propose` 가 읽는다.
 *
 * ★ 왜 `Proposal` 을 그대로 안 쓰나 — 그 body 에는 `base_version_id` 와
 *   `client_request_id` 가 있다. 둘 다 **모델이 알 수 없는 값**이다:
 *   기준 버전은 서버가 「지금 공식이 무엇인가」로 답하고, 요청 id 는 재시도를 위한
 *   기계값이다. 모델이 쓰는 파일에 그 칸을 두면 **지어낸 uuid 로 남의 버전을 기준
 *   삼는** 제안이 생긴다. 초안은 내용만 적고, 둘은 `propose` 가 붙인다.
 *   (`ContextItemDraftFile` 이 `scan_summary` 를 빼는 것과 같은 이유다.)
 */
export const ProposalDraftFile = Proposal.omit({ base_version_id: true, client_request_id: true }).strict()
export type ProposalDraftFile = z.infer<typeof ProposalDraftFile>
