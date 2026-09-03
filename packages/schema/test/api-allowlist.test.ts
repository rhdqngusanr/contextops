import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { API_REQUESTS, ERROR_CODES, ListQuery, LIST_LIMIT_DEFAULT, LIST_LIMIT_MAX } from '../src/api'
import { FORBIDDEN_KEYS, collectPropertyNames } from './fixtures'

// =====================================================================
//  🔴 P1 — **웹 화면이 보내는 body 도** 같은 allowlist 를 받는다
//
//  ★ 왜 `upload-allowlist.test.ts` 와 따로 있나 — 그쪽은 **플러그인이** 보내는 네 개고
//    (JSON Schema 로도 내보낸다), 이쪽은 **웹이** 보내는 것들이다. 검사는 같지만
//    표가 다르다. 표가 하나면 「플러그인 payload 인가 웹 body 인가」가 섞인다.
//
//  ⚠ 새 엔드포인트는 `src/api.ts` 의 `API_REQUESTS` 에 한 줄. 그 표에 없는 스키마는
//    이 검사를 **안 받는다** — 그래서 여기서 표를 돌린다.
// =====================================================================

const ENDPOINTS = Object.keys(API_REQUESTS)

describe('API 요청 계약이 P1 의 allowlist 다', () => {
  it('표가 비어 있지 않다 (표만 만들고 안 채우면 검사가 0건이다)', () => {
    expect(ENDPOINTS.length).toBeGreaterThanOrEqual(8)
  })

  it.each(ENDPOINTS)('%s — 모르는 키는 통과하지 못한다', (name) => {
    const schema = API_REQUESTS[name] as z.ZodType
    const json = z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input', reused: 'ref' })
    //  `.strict()` 는 JSON Schema 에서 `additionalProperties: false` 로 나온다.
    expect(JSON.stringify(json)).toContain('"additionalProperties":false')
  })

  it.each(ENDPOINTS)('%s — 코드·비밀값·기억·대화를 담을 필드가 없다', (name) => {
    const schema = API_REQUESTS[name] as z.ZodType
    const json = z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input', reused: 'ref' })
    const names = new Set<string>()
    collectPropertyNames(json, names)
    const banned = [...names].filter((n) => FORBIDDEN_KEYS.includes(n))
    expect(banned, `${name} 에 금지 필드가 있다`).toEqual([])
  })
})

describe('목록 질의 (SPEC §5 「목록은 ?limit=50&offset=」)', () => {
  it('기본값이 상수를 따른다 — 숫자를 라우트에 적지 않게', () => {
    expect(ListQuery.parse({})).toEqual({ limit: LIST_LIMIT_DEFAULT, offset: 0 })
  })

  it('문자열로 와도 숫자로 판다 (질의는 언제나 문자열이다)', () => {
    expect(ListQuery.parse({ limit: '10', offset: '20' })).toEqual({ limit: 10, offset: 20 })
  })

  it('상한을 넘으면 거부한다 — 한 번에 DB 를 통째로 퍼가지 못하게', () => {
    expect(() => ListQuery.parse({ limit: String(LIST_LIMIT_MAX + 1) })).toThrow()
    expect(() => ListQuery.parse({ limit: '0' })).toThrow()
  })
})

describe('에러 코드 목록', () => {
  it('중복이 없다 — 직렬화되는 값이라 한 번씩만 있어야 한다', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length)
  })

  it('SPEC §5 의 아홉이 전부 들어 있다', () => {
    for (const code of [
      'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_FAILED', 'STALE_BASE',
      'REVISION_CONFLICT', 'BUDGET_EXCEEDED', 'RATE_LIMITED', 'COMPILE_FAILED',
    ]) {
      expect(ERROR_CODES).toContain(code)
    }
  })
})
