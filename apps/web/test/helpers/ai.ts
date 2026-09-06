import type { AiTransport, GenerateBody } from '../../src/lib/ai/client'

// =====================================================================
//  test/helpers/ai.ts — Gemini 응답 모양을 아는 **유일한 스텁** (SPEC §7 · P3)
//
//  ★ 왜 한 곳인가 — 스텁이 다섯 시험 파일에 각자 있으면 공급자를 바꿀 때(2026-09-06
//    Anthropic → Gemini) 다섯 곳이 갈린다. 시험은 「무엇을 보냈나」와 「무엇을 답할까」만
//    말하고, 그것이 `generateContent` 의 어느 칸인지는 여기만 안다.
//  ⚠ 이 스텁은 네트워크를 흉내 내지 않는다 — `client.ts` 의 `AiTransport` 를 그대로 꽂는다.
//    그래서 `callModel()` 의 파싱·토큰 셈은 **진짜 코드**가 돈다.
// =====================================================================

/** `callModel()` 이 보낸 것 — 시험이 프롬프트·스키마를 여기서 읽는다. */
export interface SentRequest {
  readonly system: string
  readonly user: string
  /** `responseJsonSchema` — 옛 tool use 의 `input_schema` 자리다. */
  readonly schema: Record<string, unknown>
  readonly maxOutputTokens: number
}

export interface StubReply {
  /** 구조화 출력. `text` 를 주면 무시된다. */
  input?: unknown
  /** 모델이 JSON 대신 산문을 낸 경우를 흉내 낼 때 (옛 스텁의 `blocks: [{type:'text'}]`). */
  text?: string
  /** `candidates[0].finishReason`. 안 주면 `STOP` — 잘린 응답은 `MAX_TOKENS` 로 (FINDINGS 144). */
  finishReason?: string
  inputTokens?: number
  outputTokens?: number
}

const DEFAULT_FINISH_REASON = 'STOP'

const DEFAULT_INPUT_TOKENS = 100
const DEFAULT_OUTPUT_TOKENS = 50

function sentOf(body: GenerateBody): SentRequest {
  return {
    system: body.systemInstruction.parts.map((p) => p.text).join(''),
    user: body.contents[0]!.parts.map((p) => p.text).join(''),
    schema: body.generationConfig.responseJsonSchema,
    maxOutputTokens: body.generationConfig.maxOutputTokens,
  }
}

/**
 * `reply(보낸 것, 회차)` 가 그 회차의 응답을 정하는 스텁 transport.
 * 회차는 0 부터 — 재시도(SPEC §7 「1회 재시도」)는 1 번으로 온다.
 */
export function stubTransport(reply: (sent: SentRequest, n: number) => StubReply | Promise<StubReply>): AiTransport {
  let n = 0
  return {
    async generate(_model, body) {
      const r = await reply(sentOf(body), n++)
      const text = r.text ?? JSON.stringify(r.input)
      return {
        candidates: [{ content: { parts: [{ text }] }, finishReason: r.finishReason ?? DEFAULT_FINISH_REASON }],
        usageMetadata: {
          promptTokenCount: r.inputTokens ?? DEFAULT_INPUT_TOKENS,
          candidatesTokenCount: r.outputTokens ?? DEFAULT_OUTPUT_TOKENS,
        },
      }
    },
  }
}
