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

/** `item_<slug>` (SPEC §3). */
export const ItemId = z.string().regex(/^item_[a-z0-9_]{3,40}$/)

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
    note: z.string().min(1).max(200),
  }).strict(),
} as const satisfies Record<SourceRefKind, z.ZodObject>

/** 표를 그대로 유니온으로 올린다 — 표와 유니온이 갈라질 자리를 만들지 않는다. */
export const SourceRef = z.discriminatedUnion('kind', nonEmpty(SOURCE_REF_KINDS.map((k) => SOURCE_REF[k])))
export type SourceRef = z.infer<(typeof SOURCE_REF)[SourceRefKind]>
