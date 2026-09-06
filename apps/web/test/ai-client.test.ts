import { describe, expect, it, afterEach } from 'vitest'
import { AiConflictOutput, AiStructureOutput, toJsonSchemaOf } from '@contextops/schema'

import {
  GEMINI_THINKING_LEVEL,
  GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS,
  callModel,
  setAiClientForTest,
  toGeminiSchema,
  type GenerateBody,
} from '../src/lib/ai/client'
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
