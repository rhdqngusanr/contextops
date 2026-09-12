// =====================================================================
//  apps/web/src/lib/ai/features.ts — 서버측 AI 의 **정본 표** (SPEC §7 · P3)
//
//  🔴 P3 는 「서버측 LLM 은 API 키로만 · **4개 기능 한정** · withBudget() 경유」다.
//     그 「4개」가 이 파일의 `AI_FEATURES` 다. 여기 없는 이름으로는 부를 수 없다 —
//     `withBudget()` 의 첫 인자가 이 유니온이기 때문이다.
//
//  ★ 왜 `packages/schema` 가 아니라 여기인가 — 이 값들은 업로드 payload 에도 Pack 에도
//    안 나온다. 소비처가 서버뿐이다. 그리고 `packages/schema` 는 플러그인 번들에
//    **통째로** 들어가서(`bin/contextops-cli.mjs`), 서버 전용 표를 거기 두면 사용자
//    기계로 배포된다. API 계약이 이 값을 쓰게 되는 순간 올려라 — 그때가 「둘째 사용자」다
//    (CLAUDE.md 「경계에만 인터페이스」).
//
//  ⚠ 이 파일은 **의존이 없다.** `db/schema.ts` 가 enum 을 만들려고 읽고,
//    `budget.ts` 가 한도를 읽는다. 여기서 db 나 client 를 import 하면 순환이 된다.
// =====================================================================

/**
 * 🔴 **서버측 LLM 이 하는 일 4종.** SPEC §7.1~§7.4 와 한 줄씩 맞는다.
 *
 * ★ 기능을 하나 더하는 절차 — 넷이고, 앞의 둘은 기계가 막아 준다:
 *   ① 이 목록 **끝에** 값 추가 (중간에 끼우지 마라 — `ai_usage.feature` 로 직렬화된다)
 *   ② 아래 `AI_FEATURE_LIMITS` 에 한 줄  ← ①만 하면 여기서 타입 검사가 막힌다
 *   ③ `pnpm --filter web db:generate` — enum 값이 늘었으므로 마이그레이션이 필요하다
 *   ④ 그 기능을 **실제로 부르는 자리**를 만든다 (`withBudget('<이름>', …)`)
 *      ← ④를 안 하면 `test/ai-budget.test.ts` 의 「죽은 기능」 시험이 빨개진다
 *
 * ⚠ P3 가 「4개 한정」이라고 못 박은 이유는 예산이다. 다섯째를 더하려면
 *   `docs/SPEC.md` §7 을 먼저 고쳐라 — 여기 한 줄이 곧 예산을 쓸 권리다.
 */
export const AI_FEATURES = ['structure', 'conflict', 'ask', 'demo'] as const
export type AiFeature = (typeof AI_FEATURES)[number]

/** 호출 빈도 상한. `scope` 는 「무엇마다 세나」다 (SPEC §7.5 Rate limit). */
export interface AiRateLimit {
  /** 창(window) 안에서 허용되는 호출 수. */
  readonly calls: number
  /** 창의 길이(초). */
  readonly windowSeconds: number
  /** `project` = 프로젝트마다 · `actor` = 사용자/게스트마다. */
  readonly scope: 'project' | 'actor'
}

export interface AiFeatureLimit {
  /** 이 기능의 정본 § — 고치기 전에 읽을 곳. */
  readonly spec: string
  /** `null` 이면 빈도 제한이 없다 (하루 예산만 막는다). 왜인지 주석에 적어라. */
  readonly rate: AiRateLimit | null
  /**
   * 🔴 **한 요청 안에서 끝나는가.** `true` 면 `ai_jobs` 행으로 돌고 화면은 polling 한다
   * (SPEC §9 화면 3 「구조화 진행 표시(polling)」).
   *
   * ★ 왜 이 축이 여기 있나 — 「job 으로 도는 기능」 목록을 따로 만들면 그 목록과
   *   이 표가 갈라진다. 여기 한 줄이 곧 `AiJobFeature` 유니온이고, 그 유니온이
   *   `AI_JOB_RUNNERS`(`lib/ai/job.ts`)의 키다 — **`true` 로 바꾸면 러너를 만들 때까지
   *   타입 검사가 막힌다.**
   * ★ 왜 §7.1·§7.2 만 `true` 인가 — 12 chunk 짜리 문서도 40개 항목의 탐지도 한 요청
   *   안에서 안 끝난다. §7.3(`ask`)·§7.4(`demo`)는 사람이 눌러 놓고 기다리는 한 번이라
   *   job 으로 만들면 기다림만 늘어난다.
   */
  readonly job: boolean
}

/**
 * 🔴 **기능별 한도의 정본 표.** `withBudget()` 은 이 표를 **읽기만** 한다.
 *
 * ⚠ 값은 SPEC §7.5 에서 왔다. 여기 숫자를 바꾸면 SPEC 도 같이 고쳐라 —
 *   두 곳에 적힌 수치는 반드시 갈라진다 (CLAUDE.md).
 */
export const AI_FEATURE_LIMITS = {
  //  §7.5 「문서 구조화는 프로젝트당 시간당 5회」
  structure: { spec: '§7.1', job: true, rate: { calls: 5, windowSeconds: 3600, scope: 'project' } },
  //  §7.5 「충돌 탐지는 프로젝트당 시간당 10회」 — **§7.2 를 만든 바퀴가 정했다.**
  //  ★ 왜 프로젝트·시간인가 — 이 기능은 사람이 누르는 것이 아니라 **항목이 바뀐
  //    묶음마다** 서버가 부른다 (`detectConflicts()` 한 번 = 장부 한 줄). 그러니
  //    세는 열쇠는 사람이 아니라 프로젝트이고, 창은 structure 와 같은 한 시간이다 —
  //    두 기능이 다른 창을 쓰면 「이 프로젝트가 이번 시간에 AI 를 얼마나 썼나」를
  //    한 눈으로 볼 수 없다.
  //  ★ 왜 10인가 — 한 프로젝트가 한 시간에 열 번 넘게 항목 묶음을 바꿔 올리는 것은
  //    사람의 작업 리듬이 아니라 **루프**다. 그리고 10회면 하루 예산($3)보다
  //    먼저 걸리지 않는다 — 이 상한은 예산을 대신하는 것이 아니라 폭주를 끊는 것이다.
  conflict: { spec: '§7.2', job: true, rate: { calls: 10, windowSeconds: 3600, scope: 'project' } },
  //  §7.5 「IP·사용자당 분당 3회(`/ask`, `/demo`)」
  ask: { spec: '§7.3', job: false, rate: { calls: 3, windowSeconds: 60, scope: 'actor' } },
  //  §7.4 「게스트 IP당 일 5회」 — 분당 3회(§7.5)보다 이쪽이 좁아서 이 값을 쓴다.
  demo: { spec: '§7.4', job: false, rate: { calls: 5, windowSeconds: 86_400, scope: 'actor' } },
  //  ⚠ `as const` 가 필요하다 — 그래야 `job` 이 `boolean` 이 아니라 `true`/`false`
  //     **리터럴**로 남고, 아래 `AiJobFeature` 가 이 표에서 유니온을 뽑아낼 수 있다.
  //     `satisfies` 는 기능이 하나라도 빠지면 여기서 막는다.
} as const satisfies Record<AiFeature, AiFeatureLimit>

/**
 * 🔴 **job 으로 도는 기능** — 위 표의 `job: true` 에서 **뽑아낸다.** 손으로 안 적는다.
 *
 * ★ 기능 하나를 job 으로 바꾸는 절차는 한 줄이다: 표의 `job` 을 뒤집는다.
 *   그러면 `AI_JOB_RUNNERS`(`lib/ai/job.ts`)가 러너 없는 키로 타입 검사에서 막히고,
 *   `ai_jobs.feature` 의 CHECK 제약도 `db:generate` 로 따라온다.
 */
export type AiJobFeature = {
  [K in AiFeature]: (typeof AI_FEATURE_LIMITS)[K]['job'] extends true ? K : never
}[AiFeature]

/**
 * 기능 하나가 job 인가를 묻는 **유일한 문.** 이름을 손으로 세는 자리를 만들지 않는다.
 * ⚠ 표를 읽는 순간 `job` 이 `boolean` 으로 넓어져서 TS 가 이 좁힘을 스스로 증명하지
 *   못한다. 위 타입과 **같은 표**를 보고 있으므로 뜻은 어긋날 수 없다
 *   (`packages/schema` 의 `DETECTED_CONFLICT_KINDS` 와 같은 자리의 판단이다).
 */
export function isAiJobFeature(f: AiFeature): f is AiJobFeature {
  return AI_FEATURE_LIMITS[f].job
}

/** 같은 것의 런타임 목록. DB CHECK 과 시험이 이 값을 읽는다. */
export const AI_JOB_FEATURES: readonly AiJobFeature[] = AI_FEATURES.filter(isAiJobFeature)

/**
 * 🔴 **아직 부르는 자리가 없는 기능** — 표에는 있는데 `withBudget('<이름>')` 호출처가 **0곳**이다.
 *
 * ★ 왜 이 목록이 필요한가 (2026-09-12 · R3) — CLAUDE.md 가 「정의만 있고 아무 일도 안 하는
 *   코드가 이런 저장소의 단골 고장」이라고 못 박은 바로 그 모양이 여기 있었다. `AI_FEATURE_LIMITS`
 *   는 네 기능의 빈도 상한을 적어 두었지만 실제로 `withBudget()` 을 지나는 것은 `structure`·
 *   `conflict` 둘뿐이고, `ask`·`demo` 는 **읽는 코드가 없다.** 표만 보면 넷 다 도는 것처럼 읽힌다.
 *
 * ★ 왜 표에서 지우지 않나 — `ai_feature` 는 **DB enum** 이다. CLAUDE.md: 「enum 값은
 *   직렬화된다 — 끝에만 더하고 중간을 지우지 마라」. 지우는 대신 **안 도는 것을 적어 둔다.**
 *
 * 🔴 이 목록은 **양쪽으로** 잠겨 있다 (`test/ai-features-wired.test.ts`):
 *   ① 여기 없는 기능은 호출처가 **있어야** 한다 — 새 기능을 표에만 더하고 안 부르면 빨개진다
 *   ② 여기 있는 기능은 호출처가 **없어야** 한다 — 나중에 그 문을 만들면 이 줄을 지워야 초록이다
 *   그래서 이 목록은 저절로 낡지 않는다.
 */
export const AI_FEATURES_NOT_WIRED: Partial<Record<AiFeature, string>> = {
  //  SPEC §5 는 `POST /projects/{id}/ask` 를 적어 두었지만 그 라우트는 없다.
  ask: '§7.3 `POST /projects/{id}/ask` 라우트가 아직 없다',
  //  SPEC §5 는 `POST /demo/ai-once` 를 적어 두었지만 그 라우트는 없다 (FINDINGS 117).
  demo: '§7.4 `POST /demo/ai-once` 라우트가 아직 없다 (INBOX B5③ — 조건부)',
}

// ---------------------------------------------------------------------
//  모델과 값
// ---------------------------------------------------------------------

/** 100만 토큰당 USD. 예산을 세는 유일한 근거다. */
export interface AiModelPrice {
  readonly inputPerMTokUsd: number
  readonly outputPerMTokUsd: number
}

/**
 * 🔴 **모델 → 정가 표.** `GEMINI_MODEL` 은 **이 표 안의 이름만** 받는다.
 *
 * ★ 왜 allowlist 인가 — 모르는 모델 이름이 오면 값을 셀 수 없고, 값을 못 세면
 *   하루 예산이 조용히 무한이 된다. 그건 P3 가 막으려던 것 자체다.
 *   그래서 표에 없는 이름은 **켜질 때 크게 죽는다** (.env.example ③).
 *
 * ★ 모델을 더하는 절차: ① 여기 한 줄(정가 포함) ② `.env.example` 의 주석
 *
 * 2026-09-06 Anthropic → Gemini (INBOX). claude-* 줄은 지웠다 — `client.ts` 가 더는 그 문을
 * 못 부르는데 표에 남기면 「쓸 수 있는 이름」이 거짓말을 한다.
 *
 * 🔴 **정가의 출처 — https://ai.google.dev/gemini-api/docs/pricing · 2026-09-10 읽음** (유료 티어 ·
 *    표준 컨텍스트 · USD / 100만 토큰). 예전엔 2.5 Flash 의 값(0.30 · 2.50)을 임시로 적어 두었고,
 *    그 값은 실제의 **1/5(입력) · 1/3.6(출력)** 이라 「$3 가드」가 실제로는 $11~15 를 통과시켰다
 *    (INBOX G10). 예산 가드는 **비싼 쪽으로 틀리는 것이 안전**하다 (P3).
 *    - gemini-3.5-flash: 입력 1.50 · 출력 9.00
 *    - gemini-3.6-flash: 입력 0.75 · 출력 3.75 — **2026-12-31 까지의 도입가**이고 2027-01-01 부터
 *      1.50 · 7.50 이다. 해가 바뀌면 이 두 줄을 올려라 (`test/ai-budget.test.ts` 가 날짜를 본다).
 *    ⚠ 0 으로 두면 하루 예산이 조용히 무한이 되므로 모르는 값이라도 0 은 안 된다.
 */
export const AI_MODELS: Record<string, AiModelPrice> = {
  'gemini-3.5-flash': { inputPerMTokUsd: 1.5, outputPerMTokUsd: 9 },
  'gemini-3.6-flash': { inputPerMTokUsd: 0.75, outputPerMTokUsd: 3.75 },
}

/** `gemini-3.6-flash` 도입가가 끝나는 날 — 이 날이 지나면 위 줄이 낡은 값이다 (시험이 막는다). */
export const GEMINI_36_INTRO_PRICE_UNTIL = '2026-12-31'

/** 환경변수가 없을 때 쓰는 모델 (SPEC §1.2). */
export const DEFAULT_AI_MODEL = 'gemini-3.5-flash'

// ---------------------------------------------------------------------
//  기본 한도 — SPEC §7.5 의 숫자는 전부 여기 한 곳에 있다
// ---------------------------------------------------------------------

/** `AI_DAILY_BUDGET_USD` 의 기본값 (SPEC §7.5). */
export const DEFAULT_DAILY_BUDGET_USD = 3
/**
 * `AI_PROJECT_DAILY_BUDGET_USD` 의 기본값 — **프로젝트 하나**의 하루 상한 (INBOX H11 · 2026-09-10).
 * ★ 왜 이중인가 — 전역 $3 하나뿐이면 한 프로젝트(한 사람의 스크립트)가 아침에 다 태우고 나머지 팀 전부가
 *   「오늘 예산이 소진되었습니다」를 본다. 프로젝트별 상한이 먼저 걸리면 남은 팀은 그대로 돈다.
 *   문서 한 장이 약 $0.08(실측 · SUBMISSION 「실측」 표)이라 $1 이면 하루 열두 장이다.
 */
export const DEFAULT_PROJECT_DAILY_BUDGET_USD = 1
/**
 * `AI_MONTHLY_BUDGET_USD` 의 기본값 — **한 달의 천장** (2026-09-11 · 사용자: 「AI API 한 달 요금 10달러 이상 안 나오게 제대로 처리해줘」).
 * ★ 왜 따로인가 — 하루 $3 × 30일 = $90 이 될 수 있다. 하루 상한은 「하룻밤에 타는 것」을 막고, 달 상한은 **청구서**를 막는다.
 *   달 창(UTC `YYYY-MM`)의 장부 합계 + 이번 호출의 보수적 추정(입력 = 출력)이 이 값을 넘으면 호출이 아예 안 나간다.
 *   Google 쪽에는 지출 상한 API 가 없다 — 서버측 LLM 을 부르는 문은 `withBudget()` 하나뿐이라(P3) 이 천장이 곧 청구서의 천장이다.
 */
export const DEFAULT_MONTHLY_BUDGET_USD = 10
/** `AI_MAX_INPUT_TOKENS` 의 기본값 — 호출 하나의 입력 상한 (SPEC §7.5). */
export const DEFAULT_MAX_INPUT_TOKENS = 60_000

/**
 * 토큰 추정 = 글자수 / 2.5 (SPEC §7.5 「보수적」).
 * ★ 왜 나눗셈 하나인가 — 진짜 토큰 수는 부르기 전에는 모른다. 이 값은 **막을지 말지**를
 *   정하는 데만 쓰고, 실제로 쓴 값은 응답의 `usage` 로 기록한다. 둘을 섞지 마라.
 */
export const KO_CHARS_PER_TOKEN = 2.5

/** 글자수 → 보수적 토큰 추정. */
export function estimateTokens(chars: number): number {
  return Math.ceil(Math.max(0, chars) / KO_CHARS_PER_TOKEN)
}

/**
 * 토큰 사용량 → USD 마이크로(백만분의 1달러) 정수.
 * ★ 왜 정수인가 — 부동소수로 하루치를 더하면 값이 조용히 갈라진다. 돈은 정수로 센다.
 */
export function costMicros(model: string, inputTokens: number, outputTokens: number): number {
  const price = AI_MODELS[model]
  if (!price) throw new Error(`AI_MODELS 표에 없는 모델이다: ${model}`)
  const usd = (inputTokens * price.inputPerMTokUsd + outputTokens * price.outputPerMTokUsd) / 1_000_000
  return Math.ceil(usd * 1_000_000)
}
