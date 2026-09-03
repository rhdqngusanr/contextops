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
}

/**
 * 🔴 **기능별 한도의 정본 표.** `withBudget()` 은 이 표를 **읽기만** 한다.
 *
 * ⚠ 값은 SPEC §7.5 에서 왔다. 여기 숫자를 바꾸면 SPEC 도 같이 고쳐라 —
 *   두 곳에 적힌 수치는 반드시 갈라진다 (CLAUDE.md).
 */
export const AI_FEATURE_LIMITS: Record<AiFeature, AiFeatureLimit> = {
  //  §7.5 「문서 구조화는 프로젝트당 시간당 5회」
  structure: { spec: '§7.1', rate: { calls: 5, windowSeconds: 3600, scope: 'project' } },
  //  ⚠ SPEC §7.5 에 충돌 탐지의 빈도 상한이 **없다.** 지어내지 않는다 —
  //    이 기능은 사람이 누르는 것이 아니라 항목이 바뀔 때 서버가 부르는 것이라
  //    창 단위 상한이 무엇을 뜻하는지 §7.2 가 정하기 전에는 답이 없다.
  //    그동안은 하루 예산이 막는다 (docs/feedback/FINDINGS.md).
  conflict: { spec: '§7.2', rate: null },
  //  §7.5 「IP·사용자당 분당 3회(`/ask`, `/demo`)」
  ask: { spec: '§7.3', rate: { calls: 3, windowSeconds: 60, scope: 'actor' } },
  //  §7.4 「게스트 IP당 일 5회」 — 분당 3회(§7.5)보다 이쪽이 좁아서 이 값을 쓴다.
  demo: { spec: '§7.4', rate: { calls: 5, windowSeconds: 86_400, scope: 'actor' } },
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
 * 🔴 **모델 → 정가 표.** `ANTHROPIC_MODEL` 은 **이 표 안의 이름만** 받는다.
 *
 * ★ 왜 allowlist 인가 — 모르는 모델 이름이 오면 값을 셀 수 없고, 값을 못 세면
 *   하루 예산이 조용히 무한이 된다. 그건 P3 가 막으려던 것 자체다.
 *   그래서 표에 없는 이름은 **켜질 때 크게 죽는다** (.env.example ③).
 *
 * ★ 모델을 더하는 절차: ① 여기 한 줄(정가 포함) ② `.env.example` 의 주석
 */
export const AI_MODELS: Record<string, AiModelPrice> = {
  'claude-opus-5': { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  'claude-sonnet-5': { inputPerMTokUsd: 3, outputPerMTokUsd: 15 },
  'claude-haiku-4-5': { inputPerMTokUsd: 1, outputPerMTokUsd: 5 },
}

/** 환경변수가 없을 때 쓰는 모델 (SPEC §1.2). */
export const DEFAULT_AI_MODEL = 'claude-opus-5'

// ---------------------------------------------------------------------
//  기본 한도 — SPEC §7.5 의 숫자는 전부 여기 한 곳에 있다
// ---------------------------------------------------------------------

/** `AI_DAILY_BUDGET_USD` 의 기본값 (SPEC §7.5). */
export const DEFAULT_DAILY_BUDGET_USD = 3
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
