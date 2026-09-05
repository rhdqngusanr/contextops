import { z } from 'zod'
import { nonEmpty } from './table'

// =====================================================================
//  공통 조각 — 항목·업로드·Manifest 가 함께 쓰는 원자들.
//  정본은 docs/SPEC.md §3 이다. 여기 있는 enum 값은 전부 DB·Pack·JSON Schema 로
//  **직렬화된다** — 끝에만 더하고 중간을 지우지 마라.
// =====================================================================

/**
 * 항목 타입 10종 (SPEC §3).
 * ★ 새 타입을 더하는 절차는 `item.ts` 의 `ITEM_DATA` 표 옆 주석에 있다.
 *   여기만 고치면 `ITEM_DATA` 가 키를 잃어 **타입 검사에서 막힌다** — 그게 의도다.
 */
export const ITEM_TYPES = [
  'mission', 'goal', 'roadmap', 'architecture', 'domain',
  'policy', 'adr', 'workflow', 'constraint', 'open_question',
] as const
export type ItemType = (typeof ITEM_TYPES)[number]
export const ItemType = z.enum(ITEM_TYPES)

/** 항목 수명 상태 4종 (SPEC §3). */
export const ITEM_STATUSES = ['draft', 'review', 'active', 'deprecated'] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

/**
 * 🔴 **status 4종의 정본 표. `active` 만 Pack 에 나간다** (SPEC §4.1).
 * 값은 「왜 빠지나」를 사람이 읽는 말로 적은 것이고, `null` 이 「나간다」다.
 *
 * ★ 왜 표인가 — 「승인 안 된 초안이 팀 규칙으로 배포됐다」가 이 제품에서 제일 나쁜
 *   고장이다. 조건을 `if (status !== 'active')` 로 흩뿌리면 한 곳만 빠져도 샌다.
 * ★ 왜 계약 패키지에 있나 — 읽는 쪽이 **둘**이다: 컴파일러의 partition(무엇을 뺄지)과
 *   화면 5 의 상태 버튼(누르면 다음 Pack 이 어떻게 되는지). 컴파일러에 두면 화면이
 *   그 문장을 **베껴 적게** 되고, 베낀 문장은 표가 바뀔 때 같이 안 바뀐다.
 *   ⚠ 화면은 컴파일러를 import 할 수 없다 — 그 패키지는 `node:crypto` 를 재수출한다.
 */
export const ITEM_STATUS_EXCLUDE_REASON = {
  active: null,
  draft: '초안(draft)이다 — 승인 전에는 Pack 에 나가지 않는다',
  review: '검토 중(review)이다 — 승인 전에는 Pack 에 나가지 않는다',
  deprecated: '폐기(deprecated)됐다 — 이력은 웹에 남고 Pack 에서는 빠진다',
} as const satisfies Record<ItemStatus, string | null>

/** 근거의 확실성 3단계 (SPEC §3). */
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const
export type Confidence = (typeof CONFIDENCE_LEVELS)[number]

/** 적용 범위 3종 (SPEC §3). 컴파일러의 partition 표(SPEC §4.1)가 이 값으로 갈린다. */
export const SCOPE_KINDS = ['project', 'domain', 'path'] as const
export type ScopeKind = (typeof SCOPE_KINDS)[number]

/** 근거 종류 4종 (SPEC §3). */
export const SOURCE_REF_KINDS = ['source_document', 'repository_path', 'proposal', 'manual'] as const
export type SourceRefKind = (typeof SOURCE_REF_KINDS)[number]

// ---------------------------------------------------------------------
//  문자열 원자 — 형식이 두 곳에 적히면 조용히 갈라진다. 여기가 정본이다.
// ---------------------------------------------------------------------

/**
 * 저장소 **상대** 경로. 절대경로와 `..` 를 거부한다 (SPEC §3 · §8.5 6단계).
 * ★ 왜 스키마에 있나 — sync 가 이 경로로 파일을 쓴다. 경계에서 막지 않으면
 *   나중에 「경로를 검사하는 곳」이 라우트마다 흩어진다.
 */
export const RepoPath = z.string().min(1).max(400)
  .regex(/^(?!\/)(?!.*\.\.)(?![a-zA-Z]:)[^\0]+$/, '저장소 상대 경로여야 한다 (절대경로·상위 이동 금지)')

export const Sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'sha256 16진수 64자여야 한다')
export const CommitSha = z.string().regex(/^[0-9a-f]{40}$/, 'commit sha 40자여야 한다')

/**
 * 등록된 레포의 이름 (`POST /projects/{id}/repos` 의 `name`).
 * ★ 왜 원자로 올렸나 — 같은 길이 제한이 세 곳(`SOURCE_REF.repository_path.repo` ·
 *   `ContextItemsBatchDraft.repo` · `CreateRepo.name`)에 손으로 적혀 있었다.
 *   한쪽만 늘어나면 근거가 가리키는 이름이 등록된 이름과 안 맞게 된다 (P7 이 끊기는 자리).
 */
export const RepoName = z.string().min(1).max(100)

/**
 * 기기 토큰의 접두사 (SPEC §11). **세션 JWT 와 기기 토큰을 한 헤더에서 가르는 근거**라
 * 발급(`apps/web/src/lib/api/token.ts`)·검증(`auth.ts`)·플러그인이 전부 이 값을 본다.
 * 세 곳에 각각 적혀 있으면 한 글자만 갈려도 「알 수 없는 토큰」으로 조용히 막힌다.
 */
export const TOKEN_PREFIX = 'ctx_'

/**
 * 발급된 기기 토큰의 모양. 값 자체는 `~/.contextops/credentials.json` 에만 산다.
 * ⚠ 길이를 고정하지 않는다 — 발급기(`mintToken`)가 바이트 수를 바꿔도 옛 토큰이
 *   갑자기 「형식이 틀렸다」가 되면 안 된다. 검증은 서버의 sha256 대조가 한다.
 */
export const DeviceToken = z.string().regex(
  new RegExp(`^${TOKEN_PREFIX}[A-Za-z0-9_-]{16,200}$`),
  `${TOKEN_PREFIX} 로 시작하는 기기 토큰이어야 한다`,
)

/**
 * `item_` 뒤에 올 수 있는 글자 수의 상한.
 * ★ 왜 상수인가 — 서버측 AI(§7.1)가 같은 id 를 두 번 내면 뒤에 `_2` 를 붙여 갈라야 하는데,
 *   그 자리가 「몇 글자까지 되나」를 알아야 한다. 두 곳에 40 을 적으면 조용히 갈라진다.
 */
export const ITEM_ID_BODY_MAX = 40

/** `item_<slug>` (SPEC §3). */
export const ItemId = z.string().regex(new RegExp(`^item_[a-z0-9_]{3,${ITEM_ID_BODY_MAX}}$`))

/**
 * 사람에게 보여 줄 **질문 한 줄** (SPEC §7.1 `open_questions` · §7.2 충돌 카드 · §9 화면 4).
 * ★ 왜 원자로 올렸나 — 같은 길이 제한이 §7.1 출력과 §7.2 출력 **두 곳**에 있었다.
 *   한쪽만 넓히면 모델이 낸 긴 질문이 한 기능에서만 통과한다.
 */
export const Question = z.string().min(3).max(500)

/** `BS-M1` 또는 `M1` (SPEC §3 RoadmapData). */
export const MilestoneId = z.string().regex(/^[A-Z]{1,4}-M\d{1,2}$|^M\d{1,2}$/)

/** `YYYY-MM-DD`. */
export const CalendarDate = z.iso.date()

/**
 * 버전 문자열 `1.3.0` (SPEC §6). 세 자리 숫자만이다 — `v` 접두사도 `-rc1` 도 없다.
 * ★ 왜 정규식이 여기 있나 — 발행 요청·Pack 경로·화면 머리말이 전부 이 모양을 쓴다.
 *   세 곳에 각각 적으면 한쪽만 느슨해지고, 느슨한 쪽으로 이상한 값이 들어온다.
 */
export const Semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'major.minor.수정 세 자리여야 한다')

// ---------------------------------------------------------------------
//  Scope
// ---------------------------------------------------------------------

/**
 * ⚠ SPEC §3 은 `value` 를 무조건 optional 로 뒀지만, `domain`·`path` 는 값이 없으면
 *   컴파일러가 파일 이름(`domain-{slug}.md` · `scoped-{slug}.md`)을 만들 수 없다.
 *   그래서 여기서 요구한다 — 차이는 docs/feedback/FINDINGS.md 에 적었다.
 */
export const Scope = z.object({
  kind: z.enum(SCOPE_KINDS),
  /** `domain` 이면 도메인 slug · `path` 면 repo 상대 glob. */
  value: z.string().min(1).max(200).optional(),
}).strict().refine(
  (s) => s.kind === 'project' || s.value !== undefined,
  { message: 'domain·path scope 는 value 가 필요하다', path: ['value'] },
)
export type Scope = z.infer<typeof Scope>

// ---------------------------------------------------------------------
//  SourceRef — 근거 4종
// ---------------------------------------------------------------------

/**
 * 🔴 `{kind:'manual'}` 근거 한 줄의 길이 상한. **이 값은 여기 한 곳에만 산다.**
 *
 * ★ 왜 상수인가 — 서버가 `manual` 근거를 **지어 붙이는** 자리가 셋이다: 충돌 정리
 *   (`conflicts/{id}/resolve`) · 씨앗 질문 답변 · 열린 질문 답변(`questions` 라우트).
 *   그 자리들은 사람이 쓴 문장(질문·메모)을 note 로 옮기므로 **상한에 걸릴 수 있다.**
 *   숫자를 그 자리마다 또 적으면 한쪽만 고쳐지고, 안 고쳐진 쪽은 파싱에서 터진다
 *   (사람 눈에는 500 으로 보인다).
 */
export const MANUAL_NOTE_MAX = 200

/**
 * 🔴 근거 종류의 정본 표. **새 종류를 더하는 절차**:
 *   ① `SOURCE_REF_KINDS` 끝에 값 추가 (중간에 끼우지 마라 — 직렬화된다)
 *   ② 이 표에 한 줄 (`.strict()` 필수 — 그게 P1 방어선이다)
 *   ③ `test/source-ref.test.ts` 의 `SAMPLES` 에 한 줄
 *   ①만 하면 이 표가 키를 잃어 타입 검사가 막고, ③을 빠뜨리면 liveness 테스트가 빨개진다.
 *
 * ⚠ 전부 `.strict()` 다. P1 은 「받지 않는다」이므로 **모르는 키는 통과시키지 않는다** —
 *   코드 본문을 실어 보내려는 여분의 키는 여기서 400 이 된다 (SPEC §3.1).
 */
export const SOURCE_REF = {
  source_document: z.object({
    kind: z.literal('source_document'),
    document_version_id: z.uuid(),
    start_char: z.int().min(0),
    end_char: z.int().min(0),
    heading_path: z.array(z.string().max(200)).max(10).default([]),
  }).strict(),

  repository_path: z.object({
    kind: z.literal('repository_path'),
    repo: RepoName,
    path: RepoPath,
    start_line: z.int().min(1).optional(),
    end_line: z.int().min(1).optional(),
    commit_sha: CommitSha.optional(),
  }).strict(),

  proposal: z.object({
    kind: z.literal('proposal'),
    proposal_id: z.uuid(),
  }).strict(),

  manual: z.object({
    kind: z.literal('manual'),
    note: z.string().min(1).max(MANUAL_NOTE_MAX),
  }).strict(),
} as const satisfies Record<SourceRefKind, z.ZodObject>

/** 표를 그대로 유니온으로 올린다 — 표와 유니온이 갈라질 자리를 만들지 않는다. */
export const SourceRef = z.discriminatedUnion('kind', nonEmpty(SOURCE_REF_KINDS.map((k) => SOURCE_REF[k])))
export type SourceRef = z.infer<(typeof SOURCE_REF)[SourceRefKind]>

/**
 * 🔴 항목 하나가 들 수 있는 근거의 최대 개수. **이 값은 여기 한 곳에만 산다.**
 *
 * ★ 왜 상수인가 — 발행 트랜잭션이 개정을 쌓을 때 `{kind:'proposal'}` 근거를
 *   **한 칸 더 붙인다** (`apps/web/src/lib/api/publish.ts` · P7). 그 자리가 상한을
 *   알아야 「자리가 없다」를 400 으로 답할 수 있는데, 숫자를 거기 또 적으면 한쪽만
 *   고쳐지고 조용히 갈라진다 — 갈라진 결과는 컴파일 단계의 알아보기 힘든 실패다.
 */
export const SOURCE_REFS_MAX = 20
