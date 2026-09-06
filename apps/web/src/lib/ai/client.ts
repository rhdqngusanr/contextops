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

function transport(): AiTransport {
  if (cached) return cached
  const apiKey = process.env.GEMINI_API_KEY
  //  🔴 조용히 undefined 로 돌지 않게 여기서 죽인다 (.env.example ③).
  //     ⚠ 키가 없는 배포는 **고장이 아니다** — SPEC §7.5 의 「픽스처 결과로 떨어지는」
  //        갈래가 그 경우를 받는다. 부르는 쪽이 이 오류를 잡아 픽스처로 내려간다.
  if (!apiKey) throw new Error('GEMINI_API_KEY 가 없다 — apps/web/.env.example 을 보고 .env.local 을 만들어라')
  cached = {
    async generate(model, body) {
      const res = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      })
      //  ⚠ 응답 본문을 오류 메시지에 싣지 않는다 — 오류 메시지는 로그로 간다 (SPEC §11).
      //    상태 코드만으로 「키가 틀렸다(400/403)」·「분당 제한(429)」을 가른다.
      if (!res.ok) throw new Error(`Gemini generateContent ${res.status}`)
      return (await res.json()) as GenerateResponse
    },
  }
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

/**
 * 모델을 한 번 부르고 **구조화된 객체** 와 실제 토큰 사용량을 낸다.
 *
 * ⚠ 반환값은 검증되지 않은 `unknown` 이다. 부르는 쪽이 **해당 Zod 로 다시 판다** —
 *   그게 SPEC §7 의 「출력은 Zod 로 재검증」이고, 그 자리가 P1 의 방어선이다.
 */
export async function callModel(req: ToolCallRequest): Promise<AiCall<unknown>> {
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
