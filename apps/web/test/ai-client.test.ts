import { describe, expect, it, afterEach, vi } from 'vitest'
import { AiConflictOutput, AiStructureOutput, ERROR_STATUS, toJsonSchemaOf } from '@contextops/schema'

import {
  GEMINI_HTTP_ERROR_CODES,
  GEMINI_THINKING_LEVEL,
  GEMINI_TRUNCATED_FINISH_REASON,
  GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS,
  callModel,
  geminiTransport,
  setAiClientForTest,
  toGeminiSchema,
  type GenerateBody,
} from '../src/lib/ai/client'
import { ApiError } from '../src/lib/api/error'
import { stubTransport } from './helpers/ai'

// =====================================================================
//  서버측 LLM 의 문 하나 — Gemini `generateContent` (SPEC §7 · P3 · 2026-09-06 INBOX)
//
//  ★ 무엇을 재나 — ① 보내는 스키마에서 Gemini 가 못 받는 키워드가 **모든 깊이에서** 빠졌나
//    ② 그 밖의 키워드는 손대지 않았나 (계약이 약해지지 않는다) ③ 응답의 텍스트를 JSON 으로
//    읽고 토큰을 `usageMetadata` 에서 세나 ④ JSON 이 아니면 던지지 않고 `undefined` 인가
//    (부르는 쪽의 Zod 가 잡아 1회 재시도로 간다).
//  ⚠ 진짜 API 는 부르지 않는다 — 실측은 `docs/evidence/2026-09-06-gemini/` 에 있다.
// =====================================================================

function keywordsIn(node: unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => keywordsIn(n, acc))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      acc.add(k)
      keywordsIn(v, acc)
    }
  }
  return acc
}

describe('toGeminiSchema — 못 받는 키워드만 벗긴다', () => {
  it.each([
    ['AiStructureOutput', AiStructureOutput],
    ['AiConflictOutput', AiConflictOutput],
  ])('%s: 원본에는 있고 보낸 것에는 없다 — 모든 깊이', (_name, zod) => {
    const raw = toJsonSchemaOf(zod)
    const before = keywordsIn(raw)
    const after = keywordsIn(toGeminiSchema(raw))
    for (const k of GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS) expect(after.has(k), `${k} 가 남았다`).toBe(false)
    //  `const` 는 `enum` 이 된다 — 항목 10종의 discriminator 가 그것이다 (아래 시험이 실제 값을 본다).
    expect(after.has('const')).toBe(false)
    //  그 셋 말고는 하나도 안 빠졌다 — `$defs`·`$ref`·`additionalProperties` 는 실측으로 받는다.
    for (const k of before) {
      if (!GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS.includes(k) && k !== 'const') {
        expect(after.has(k), `${k} 가 사라졌다`).toBe(true)
      }
    }
  })

  it('원본 AiStructureOutput 에 벗길 것이 실제로 있다 — 없으면 위 시험은 공짜 통과다', () => {
    const before = keywordsIn(toJsonSchemaOf(AiStructureOutput))
    for (const k of [...GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS, 'const']) expect(before.has(k), k).toBe(true)
  })

  it('discriminator `type: { const }` 가 `enum: [값]` 이 된다 — 모델이 지키는 쪽으로', () => {
    const out = toGeminiSchema({ oneOf: [{ properties: { type: { const: 'policy' } } }, { properties: { type: { const: 'goal' } } }] })
    expect(JSON.stringify(out)).toBe(JSON.stringify({ oneOf: [{ properties: { type: { enum: ['policy'] } } }, { properties: { type: { enum: ['goal'] } } }] }))
  })

  it('순수 함수다 — 입력을 바꾸지 않는다', () => {
    const raw = toJsonSchemaOf(AiStructureOutput)
    const snapshot = JSON.stringify(raw)
    toGeminiSchema(raw)
    expect(JSON.stringify(raw)).toBe(snapshot)
  })
})

describe('callModel — 요청·응답의 모양', () => {
  afterEach(() => setAiClientForTest(undefined))

  it('시스템·사용자·스키마·상한이 generateContent 의 제자리에 실린다 · 토큰은 usageMetadata 에서', async () => {
    let body: GenerateBody | undefined
    setAiClientForTest({
      async generate(_model, b) {
        body = b
        return {
          candidates: [{ content: { parts: [{ text: '{"items":[],' }, { text: '"open_questions":[]}' }] } }],
          usageMetadata: { promptTokenCount: 321, candidatesTokenCount: 12 },
        }
      },
    })
    const schema = { type: 'object', properties: { items: { type: 'array', minItems: 1, items: { type: 'string' } } } }
    const call = await callModel({ system: 'S', user: 'U', inputSchema: schema, maxTokens: 777 })

    expect(body?.systemInstruction.parts[0]?.text).toBe('S')
    expect(body?.contents[0]?.role).toBe('user')
    expect(body?.contents[0]?.parts[0]?.text).toBe('U')
    expect(body?.generationConfig.responseMimeType).toBe('application/json')
    expect(body?.generationConfig.maxOutputTokens).toBe(777)
    //  🔴 생각의 양이 상수 하나로 실린다 — 없으면 생각이 상한을 먹고 JSON 이 잘린다 (81바퀴 실측 · FINDINGS 141).
    expect(body?.generationConfig.thinkingConfig).toEqual({ thinkingLevel: GEMINI_THINKING_LEVEL })
    expect(JSON.stringify(body?.generationConfig.responseJsonSchema)).not.toContain('minItems')
    //  조각(parts)이 여럿이면 이어 붙여 읽는다.
    expect(call.value).toEqual({ items: [], open_questions: [] })
    expect(call.inputTokens).toBe(321)
    expect(call.outputTokens).toBe(12)
  })

  it('JSON 이 아니면 던지지 않고 undefined 다 — 재시도가 토큰을 잃지 않게 (SPEC §7)', async () => {
    setAiClientForTest(stubTransport(() => ({ text: '네, 정리해 드리겠습니다.', inputTokens: 5, outputTokens: 7 })))
    const call = await callModel({ system: 'S', user: 'U', inputSchema: { type: 'object' }, maxTokens: 10 })
    expect(call.value).toBeUndefined()
    expect(call.inputTokens).toBe(5)
    expect(call.outputTokens).toBe(7)
  })

  it('후보가 없으면 undefined · 토큰 0 — 조용히 0 이지 죽지 않는다', async () => {
    setAiClientForTest({ async generate() { return {} } })
    const call = await callModel({ system: 'S', user: 'U', inputSchema: { type: 'object' }, maxTokens: 10 })
    expect(call.value).toBeUndefined()
    expect(call.inputTokens).toBe(0)
    expect(call.outputTokens).toBe(0)
  })

  it('🔴 finishReason 이 MAX_TOKENS 면 truncated — 값이 undefined 인 것만으로는 「산문」과 구분이 안 된다 (FINDINGS 144)', async () => {
    setAiClientForTest(stubTransport(() => ({ text: '{"items":[{"id":"item_', finishReason: GEMINI_TRUNCATED_FINISH_REASON, inputTokens: 9, outputTokens: 8000 })))
    const call = await callModel({ system: 'S', user: 'U', inputSchema: { type: 'object' }, maxTokens: 8000 })
    expect(call.truncated).toBe(true)
    expect(call.value).toBeUndefined()
    //  잘린 토큰도 장부에 간다.
    expect(call.outputTokens).toBe(8000)
  })

  it('STOP 이거나 finishReason 이 없으면 truncated 가 아니다 — 산문·후보 없음은 여전히 계약 위반의 길이다', async () => {
    setAiClientForTest(stubTransport(() => ({ text: '네, 정리해 드리겠습니다.' })))
    expect((await callModel({ system: 'S', user: 'U', inputSchema: { type: 'object' }, maxTokens: 10 })).truncated).toBe(false)
    setAiClientForTest({ async generate() { return {} } })
    expect((await callModel({ system: 'S', user: 'U', inputSchema: { type: 'object' }, maxTokens: 10 })).truncated).toBe(false)
  })

  it('키가 없으면 켜질 때 죽는다 — 조용히 undefined 로 돌지 않는다 (.env.example ③)', async () => {
    const saved = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    try {
      await expect(callModel({ system: 'S', user: 'U', inputSchema: { type: 'object' }, maxTokens: 10 }))
        .rejects.toThrow(/GEMINI_API_KEY/)
    } finally {
      if (saved !== undefined) process.env.GEMINI_API_KEY = saved
    }
  })
})

describe('geminiTransport — HTTP 상태를 이름으로 (FINDINGS 144 · SPEC §7.5)', () => {
  const KEY = 'GEMINI_API_KEY'
  let saved: string | undefined

  function withStatus(status: number): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(status === 200 ? '{}' : '', { status })))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    if (saved === undefined) delete process.env[KEY]
    else process.env[KEY] = saved
  })

  it('표(GEMINI_HTTP_ERROR_CODES)의 429 는 ApiError RATE_LIMITED — 예산 가드와 같은 코드라 화면이 같은 갈래를 탄다', async () => {
    saved = process.env[KEY]
    process.env[KEY] = 'test-key'
    withStatus(429)
    const body = { systemInstruction: { parts: [] }, contents: [], generationConfig: {} } as unknown as GenerateBody
    const err = await geminiTransport().generate('m', body).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('RATE_LIMITED')
    expect((err as ApiError).status).toBe(ERROR_STATUS.RATE_LIMITED.status)
    //  본문은 오류 메시지에 싣지 않는다 (SPEC §11) — 상태 숫자뿐이다.
    expect((err as ApiError).message).toBe('Gemini generateContent 429')
  })

  it('표에 없는 상태(401 · 500)는 ApiError 가 아니다 — job 은 INTERNAL 로 끝난다 (운영자의 일)', async () => {
    saved = process.env[KEY]
    process.env[KEY] = 'test-key'
    for (const status of [401, 500]) {
      expect(GEMINI_HTTP_ERROR_CODES[status]).toBeUndefined()
      withStatus(status)
      const body = { systemInstruction: { parts: [] }, contents: [], generationConfig: {} } as unknown as GenerateBody
      const err = await geminiTransport().generate('m', body).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(Error)
      expect(err).not.toBeInstanceOf(ApiError)
      expect((err as Error).message).toBe(`Gemini generateContent ${status}`)
    }
  })

  it('표의 값은 전부 실제로 코드를 바꾼다 — 표 한 줄이 곧 갈래다', () => {
    for (const [status, code] of Object.entries(GEMINI_HTTP_ERROR_CODES)) {
      expect(ERROR_STATUS[code].status, `${status} → ${code}`).toBeGreaterThanOrEqual(400)
    }
    expect(Object.keys(GEMINI_HTTP_ERROR_CODES).length).toBeGreaterThan(0)
  })
})
