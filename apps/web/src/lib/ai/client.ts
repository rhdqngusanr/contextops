import type { ErrorCode } from '@contextops/schema'

import { ApiError } from '../api/error'
import type { AiCall } from './budget'
import { currentModel } from './model'

// =====================================================================
//  apps/web/src/lib/ai/client.ts — 서버측 LLM(Gemini)을 부르는 **유일한 자리** (SPEC §7 · P2 · P3)
//
//  🔴 P2 — 이건 **우리 API 키**다 (`GEMINI_API_KEY`). 사용자의 Claude 구독을
//     대신 부르는 것이 아니다. 사용자의 기계에서 도는 코드(`plugin/`)는 이 파일을
//     import 하지 않는다 — 방향이 한쪽이다 (`schema ← compiler ← web/plugin`).
//     2026-09-06 Anthropic → Gemini 로 바꿨다 (INBOX). P2·P3 의 뜻은 안 바뀐다 —
//     공급자를 안 박아뒀고, 「API 키(종량제)로만 · withBudget() 경유」는 그대로다.
//
//  🔴 P3 — `tools/principles.ps1` 은 `generateContent` 를 부르는 파일을 세고,
//     그 파일에 `withBudget` 이 없으면 FAIL 한다. **이 파일만 예외다.**
//     그래서 여기에는 예산 판단이 없다 — 부르는 쪽이 `withBudget()` 을 거쳐서 온다.
//     ⚠ 여기서 export 하는 것을 라우트가 **직접** 부르면 예산 가드를 우회한다.
//        새 기능은 `withBudget('<기능>', ctx, () => callModel(...))` 로 부른다.
//
//  ★ SDK 가 없는 이유 — 부르는 자리가 하나이고 요청·응답이 JSON 한 벌이라 `fetch` 로
//    충분하다. 의존을 하나 더하면 그 버전을 catalog·SPEC §1.2·lock 세 곳이 들고 다닌다.
//
//  ⚠ SPEC §11 — 프롬프트·응답 본문을 로그에 남기지 않는다. 이 파일은 아무것도 로그하지
//    않는다. 부르는 쪽도 남기지 마라 (`request_id`·route·status·latency 만).
// =====================================================================

/** Gemini `generateContent` 의 엔드포인트. 모델 이름은 경로에 들어간다. */
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * `generateContent` 에 보내는 몸 — 이 제품이 쓰는 칸만 적었다.
 *
 * 🔴 구조화 출력은 `responseMimeType: 'application/json'` + `responseJsonSchema` 다
 *    (Anthropic 의 tool use `input_schema` 와 같은 자리). `responseJsonSchema` 는 **표준 JSON
 *    Schema** 를 받는다 — `packages/schema` 의 `toJsonSchemaOf()` 가 내는 `$defs`·`$ref`·
 *    `additionalProperties` 를 그대로 싣는다. (`responseSchema` 는 OpenAPI 부분집합이라
 *    `$ref` 를 못 받는다 — 그 칸을 쓰지 마라.) 못 받는 키워드 둘은 `toGeminiSchema()` 가 벗긴다.
 */
export interface GenerateBody {
  readonly systemInstruction: { readonly parts: readonly { readonly text: string }[] }
  readonly contents: readonly {
    readonly role: 'user'
    readonly parts: readonly { readonly text: string }[]
  }[]
  readonly generationConfig: {
    readonly responseMimeType: 'application/json'
    readonly responseJsonSchema: Record<string, unknown>
    readonly maxOutputTokens: number
    readonly thinkingConfig: { readonly thinkingLevel: GeminiThinkingLevel }
  }
}

/** Gemini 3.x `thinkingConfig.thinkingLevel` 의 값. `low` 와 `high` 만 모든 3.x 모델이 받는다. */
export type GeminiThinkingLevel = 'low' | 'high'

/**
 * 🔴 **생각(thinking) 의 양 — 모든 호출이 이 값 하나를 쓴다.**
 *
 * ★ 왜 박아 두나 (81바퀴 · 2026-09-06 실측 · `docs/evidence/2026-09-06-p3-gemini/probe.txt`) —
 *   Gemini 3.x 는 생각 토큰을 **`maxOutputTokens` 안에서** 센다. 기본값(high)으로 §7.1 을 부르면
 *   조각 하나에 생각만 7,677 토큰을 써서 8,000 상한에 걸려(`finishReason: MAX_TOKENS`) JSON 이
 *   중간에 잘렸고, 재시도도 같은 자리에서 잘려 **두 픽스처 문서 모두 `AI_OUTPUT_INVALID`** 였다.
 *   `low` 로 같은 프롬프트: goals.md 가 항목 13 · 질문 4 · 14초 (두 번 같음). high + 상한 32,000 은
 *   항목 17 · 58초 · 생각 12,576 토큰 — 네 배 값에 네 배 시간이라 완료 기준(12)을 넘는 `low` 를 쓴다.
 * ⚠ 이 값을 올리면 `structure.ts`·`conflict.ts` 의 출력 상한을 같이 봐라 — 생각이 그 상한을 먹는다.
 */
export const GEMINI_THINKING_LEVEL: GeminiThinkingLevel = 'low'

/** `generateContent` 의 응답 — 읽는 칸만 적었다. 나머지는 모른 척한다. */
export interface GenerateResponse {
  readonly candidates?: readonly {
    readonly content?: { readonly parts?: readonly { readonly text?: string }[] }
    /** `STOP` · `MAX_TOKENS` · … — `callModel()` 이 `GEMINI_TRUNCATED_FINISH_REASON` 과 견줘 `truncated` 를 낸다 (FINDINGS 144). */
    readonly finishReason?: string
  }[]
  readonly usageMetadata?: {
    readonly promptTokenCount?: number
    readonly candidatesTokenCount?: number
  }
}

/**
 * 「모델 하나에 몸 하나를 보내고 응답을 받는다」 — 네트워크가 사는 유일한 자리.
 * 시험은 이 모양을 스텁으로 꽂는다 (`test/helpers/ai.ts`).
 */
export interface AiTransport {
  generate(model: string, body: GenerateBody): Promise<GenerateResponse>
}

let cached: AiTransport | undefined

/**
 * 🔴 **이 배포가 서버측 AI 를 부를 수 있나** — `/api/v1/health` 의 `ai` 칸이 이 답이다 (INBOX G9).
 *
 * ★ 왜 health 에 내나 — 키가 없는 배포는 200 을 내고 멀쩡히 돌다가 **구조화를 누른 순간** 실패한다.
 *   심사 기간에 그것을 처음 보는 사람이 심사위원이면 늦다. `verify:prod` 가 이 칸을 읽어 배포 직후에 잡는다.
 * ⚠ 키의 **값**은 물론 길이도 내지 않는다 — boolean 하나다. 모델 이름이 표 밖이면 `currentModel()` 이
 *   던지므로 그것도 「설정 안 됨」이다 (부르면 어차피 거기서 죽는다).
 */
export function aiConfigured(): boolean {
  if (!process.env.GEMINI_API_KEY) return false
  try {
    currentModel()
    return true
  } catch {
    return false
  }
}

/**
 * 진짜 Gemini 로 가는 transport. `callModel()` 은 이것을 한 번 만들어 붙들고 쓴다.
 * ⚠ 제품 코드는 이것을 직접 부르지 않는다 — 부르면 예산 가드를 우회한다 (P3).
 *   밖에서 쓰는 곳은 `scripts/p3-measure.ts` 하나다: 진짜 응답을 **기록만** 하는 껍데기로
 *   감싸 `setAiClientForTest` 로 꽂는다 (실패한 job 의 이유는 P1 때문에 DB 에 없다 · 84바퀴).
 */
export function geminiTransport(options: { backoffMs?: number } = {}): AiTransport {
  const apiKey = process.env.GEMINI_API_KEY
  //  🔴 조용히 undefined 로 돌지 않게 여기서 죽인다 (.env.example ③).
  //     ⚠ 키가 없는 배포는 **고장이 아니라 설정이 안 된 것**이다 — 그래서 `INTERNAL` 이 아니라
  //        `AI_NOT_CONFIGURED`(503) 다 (INBOX G9). job 은 그 코드로 끝나고 화면은 「운영자에게」를
  //        말한다. 예전 주석·문서가 말하던 「픽스처 결과로 떨어지는」 갈래는 **코드에 없었다.**
  if (!apiKey) throw new ApiError('AI_NOT_CONFIGURED', 'GEMINI_API_KEY 가 없다 — apps/web/.env.example 을 보고 .env.local 을 만들어라')
  const backoffMs = options.backoffMs ?? GEMINI_429_BACKOFF_MS
  return {
    async generate(model, body) {
      const send = () => fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      })
      let res = await send()
      //  🔴 429 는 **한 번** 기다렸다 다시 보낸다 (INBOX H5). 무료 티어의 분당 제한은 몇 초면 풀리는데,
      //     그 몇 초 때문에 job 이 `RATE_LIMITED` 로 죽고 사람이 [다시 시도] 를 누르는 것은 예산 가드가
      //     막으려던 것도 아니고 사람이 할 일도 아니다. 두 번째 429 는 그대로 코드가 된다 — 세 번째 왕복은 없다.
      //     ⚠ 이 재시도는 `withBudget()` 한 번 안의 일이다 — 429 응답에는 usage 가 없어 장부에 두 줄이 생기지 않는다.
      if (res.status === GEMINI_RATE_LIMIT_STATUS && backoffMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs(res.headers.get('retry-after'), backoffMs)))
        res = await send()
      }
      //  ⚠ 응답 본문을 오류 메시지에 싣지 않는다 — 오류 메시지는 로그로 간다 (SPEC §11).
      //    상태 코드만으로 가른다 — 표(`GEMINI_HTTP_ERROR_CODES`)에 있는 상태는 그 코드의
      //    `ApiError`, 없는 것(키가 틀린 400/403 · 5xx)은 그냥 Error → job 은 `INTERNAL`.
      if (!res.ok) {
        const code = GEMINI_HTTP_ERROR_CODES[res.status]
        if (code) throw new ApiError(code, `Gemini generateContent ${res.status}`)
        throw new Error(`Gemini generateContent ${res.status}`)
      }
      return (await res.json()) as GenerateResponse
    },
  }
}

/** 분당 제한의 HTTP 상태 — `GEMINI_HTTP_ERROR_CODES` 의 `RATE_LIMITED` 줄과 같은 숫자다 (시험이 대조한다). */
export const GEMINI_RATE_LIMIT_STATUS = 429
/** 429 뒤 한 번 기다리는 시간. 무료 티어의 창은 1분이지만 대개 몇 초면 풀린다 — 함수 시간(300초)의 1% 다. */
export const GEMINI_429_BACKOFF_MS = 3000
/** `Retry-After` 를 존중하되 **상한** 안에서만 — 서버가 60 을 줘도 60초를 기다리진 않는다 (그건 두 번째 429 로 끝낸다). */
export const GEMINI_429_BACKOFF_MAX_MS = 10_000

export function retryAfterMs(header: string | null, fallbackMs: number): number {
  const seconds = header === null ? NaN : Number(header)
  if (!Number.isFinite(seconds) || seconds <= 0) return fallbackMs
  return Math.min(seconds * 1000, GEMINI_429_BACKOFF_MAX_MS)
}

/**
 * 🔴 Gemini 의 HTTP 상태 → 우리 에러 코드. **표에 있는 상태만** `ApiError` 가 된다.
 *
 * ★ 왜 (FINDINGS 144 · 2026-09-07) — 429 가 그냥 `Error` 로 가면 `runJob` 의 catch 가 `INTERNAL`
 *   로 적어 화면이 「서버 오류」를 본다. 분당 제한은 우리 예산 가드(`withBudget` 의 `RATE_LIMITED`)와
 *   **같은 뜻**이라 같은 코드여야 화면이 같은 갈래(「요청이 너무 잦습니다」)를 탄다.
 * ⚠ 401/403(키가 틀렸다)·5xx 는 표에 넣지 않는다 — 그건 운영자의 일이지 사용자가 기다릴 일이 아니다.
 *   새 상태를 가르려면 여기 한 줄이다.
 */
export const GEMINI_HTTP_ERROR_CODES: Readonly<Record<number, ErrorCode>> = { 429: 'RATE_LIMITED' }

/**
 * 출력이 `maxOutputTokens` 에서 잘렸을 때 Gemini 가 적는 `finishReason`.
 * `callModel()` 은 이것을 읽어 `truncated` 를 낸다 — 잘린 JSON 은 어차피 파싱이 안 돼 `value` 가
 * `undefined` 인데, 그것만 보면 「계약과 다르다」와 구분이 안 된다 (FINDINGS 144).
 */
export const GEMINI_TRUNCATED_FINISH_REASON = 'MAX_TOKENS'

/**
 * 🔴 잘린 응답에 대한 재시도 불평 — `structure.ts`·`conflict.ts` 의 재시도 루프가 **같은 문장**을 싣는다.
 *
 * ★ 왜 — 잘린 응답을 「계약과 맞지 않는다」로 불평하면 모델은 같은 길이로 다시 내고 **같은 자리에서
 *   또 잘린다** (81바퀴 첫 실행 · 60초 · 왕복 2 · 둘 다 MAX_TOKENS). 상한은 그대로 두고 모델이
 *   줄일 수 있는 것(본문·인용 길이)을 말한다 — 상한을 올리면 생각 토큰이 그만큼 더 먹는다 (141).
 */
export const OUTPUT_TRUNCATED_COMPLAINT =
  '출력이 상한에서 잘렸다 — 항목 수는 그대로 두고 body 와 인용(span.quote)을 더 짧게 내라'

function transport(): AiTransport {
  if (!cached) cached = geminiTransport()
  return cached
}

/** 시험 전용 문. `db/client.ts` 의 `setDbForTest` 와 같은 이유로 있다. */
export function setAiClientForTest(t: AiTransport | undefined): void {
  cached = t
}

/**
 * 🔴 `responseJsonSchema` 가 **못 받는 JSON Schema 키워드.** 보내기 전에 모든 깊이에서 벗긴다.
 *
 * ★ 실측 (2026-09-06 · gemini-3.5-flash · `AiStructureOutput` 11KB) — `$schema`·`$defs`·`$ref`·
 *   `const`·`oneOf`·`pattern`·`format`·`additionalProperties`·`minLength`·`maxLength`·`minimum`·
 *   `maximum`·`default` 는 전부 받는데 **`minItems`·`maxItems` 가 있으면 400 「invalid argument」** 다
 *   (다른 키워드는 이름을 대며 거절하는데 이 둘만 이유 없이 거절한다).
 * ⚠ 벗겨도 계약은 약해지지 않는다 — 출력은 부르는 쪽이 **같은 Zod 로 다시 판다** (SPEC §7).
 *   모델이 상한을 넘긴 배열을 내면 그 자리에서 「계약과 다르다」로 잡혀 1회 재시도로 간다.
 * ★ 새 키워드가 거절되면 **여기 한 줄**이다 — 스키마(`packages/schema`)를 고치지 마라.
 *   스키마는 플러그인 검증·문서 산출이 같이 읽는다 (`SCHEMA_OUT_DIR`).
 */
export const GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS: readonly string[] = ['minItems', 'maxItems']

/**
 * Zod 가 낸 JSON Schema → Gemini 가 받는 모양. **순수 함수** — 입력을 바꾸지 않는다.
 *
 * 하는 일 둘: ① 위 키워드를 모든 깊이에서 벗긴다 ② `const: v` → `enum: [v]`.
 * ★ ② 의 실측 (2026-09-06) — `const` 는 400 없이 받지만 **지키지 않는다.** 항목 10종의
 *   discriminated union 은 `type: { const: 'policy' }` 로 나오는데, 그대로 보내면 모델이 `type` 에
 *   표에 없는 낱말을 적어 Zod 의 「Invalid discriminator value」로 떨어졌다. `enum` 은 지킨다.
 */
export function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const fix = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(fix)
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS.includes(k)) continue
        if (k === 'const') out.enum = [v]
        else out[k] = fix(v)
      }
      return out
    }
    return node
  }
  return fix(schema) as Record<string, unknown>
}

/** 구조화 출력을 받는 한 번의 호출 (SPEC §7 공통 규약). */
export interface ToolCallRequest {
  /** 공통 금지가 들어간 시스템 프롬프트. */
  readonly system: string
  /** 사용자 턴. 문서·항목 본문은 `<untrusted>` 로 감싸서 온다 (SPEC §11 인젝션). */
  readonly user: string
  /** 해당 Zod 계약의 JSON Schema (SPEC §7 「responseJsonSchema = 해당 Zod 의 JSON Schema」). */
  readonly inputSchema: Record<string, unknown>
  readonly maxTokens: number
}

/** `callModel()` 이 내는 것 — 장부가 읽는 `AiCall` 에 「잘렸나」 한 칸을 더했다. */
export interface ModelCall extends AiCall<unknown> {
  /** `finishReason` 이 `GEMINI_TRUNCATED_FINISH_REASON` 이었다. 부르는 쪽은 `value` 를 보기 전에 이것부터 본다. */
  readonly truncated: boolean
}

/**
 * 모델을 한 번 부르고 **구조화된 객체** 와 실제 토큰 사용량을 낸다.
 *
 * ⚠ 반환값은 검증되지 않은 `unknown` 이다. 부르는 쪽이 **해당 Zod 로 다시 판다** —
 *   그게 SPEC §7 의 「출력은 Zod 로 재검증」이고, 그 자리가 P1 의 방어선이다.
 */
export async function callModel(req: ToolCallRequest): Promise<ModelCall> {
  const model = currentModel()
  const res = await transport().generate(model, {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: 'user', parts: [{ text: req.user }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: toGeminiSchema(req.inputSchema),
      maxOutputTokens: req.maxTokens,
      //  🔴 생각을 상한 안에 묶는다 — 없으면 생각이 `maxOutputTokens` 를 먹고 JSON 이 잘린다.
      thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL },
    },
  })

  return {
    //  ⚠ 텍스트가 없거나 JSON 이 아니면 `undefined` 다. **여기서 던지지 않는다** — 부르는
    //    쪽의 Zod 가 「계약과 다르다」로 잡고 SPEC §7 의 1회 재시도를 돌리는 것이 정본
    //    흐름이다. 여기서 던지면 그 재시도가 토큰 사용량을 잃는다 (장부가 0으로 남는다).
    value: parseJsonOrUndefined(res.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')),
    //  🔴 잘렸는지는 `finishReason` 이 말한다 — `value` 가 `undefined` 인 것만으로는 「산문을 냈다」와
    //     같아 보이고, 그러면 재시도 불평이 틀린 것을 고치라고 한다 (FINDINGS 144).
    truncated: res.candidates?.[0]?.finishReason === GEMINI_TRUNCATED_FINISH_REASON,
    model,
    inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
  }
}

function parseJsonOrUndefined(text: string | undefined): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}
