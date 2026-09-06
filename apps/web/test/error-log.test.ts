import type { PGlite } from '@electric-sql/pglite'
import { DrizzleQueryError, sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../src/lib/api/error'
import {
  CAUSE_DEPTH,
  ERROR_FIELD_RULES,
  MESSAGE_MAX_CHARS,
  MESSAGE_SCRUBBED,
  STACK_FRAMES,
  describeError,
  type ErrorField,
  type ErrorShape,
} from '../src/lib/api/log'
import { route } from '../src/lib/api/route'
import { closeDb, errorOf, freshDb, params, req } from './helpers/db'

// =====================================================================
//  🔴 오류 로그 — **원인은 남고 질의문은 안 남는다** (FINDINGS 128 · INBOX 2026-09-06 ② · SPEC §11 · P1)
//
//  ★ 왜 이 시험이 있나 — 예전 로그는 `{"kind":"unhandled","error":"Error"}` 한 줄이었고, 그걸로는
//    FINDINGS 127 의 500(postgres-js `CONNECT_TIMEOUT`)을 찾을 수 없었다. 반대로 `console.error(err)`
//    한 줄로 바꾸면 drizzle 의 `DrizzleQueryError` message(`Failed query: <sql>\nparams: <값>`)가
//    통째로 로그에 남는다 — P1 이 막는 것이 새는 자리다. 둘 사이의 자리가 `log.ts` 의 표이고,
//    여기서는 그 표가 **실제로** 그 자리를 지키는지 잰다.
//
//  재는 것 —
//    ① 진짜 라우트가 진짜 drizzle 질의로 죽었을 때 · 로그 한 줄 전체에 `select` 가 없고 · 원인의
//       `code`(SQLSTATE `42P01`)와 문장은 있고 · `request_id` 가 응답과 같다
//    ② 연결 오류(postgres-js 가 주는 모양 그대로)의 `CONNECT_TIMEOUT` 이 로그에 닿는다 — 127 을
//       로그만으로 찾을 수 있었을 모양
//    ③ **표의 행마다** 값을 넣으면 로그가 갈린다 — `drop` 은 사라지고 나머지는 남는다 (④2-B)
//    ④ 4xx(`ApiError`·Zod)는 오류 로그를 안 찍는다 — 요청 로그가 이미 status 를 말한다
// =====================================================================

let pg: PGlite | undefined
let errorLines: string[] = []

beforeEach(async () => {
  const fresh = await freshDb()
  pg = fresh.pg
  errorLines = []
  vi.spyOn(console, 'error').mockImplementation((line: unknown) => { errorLines.push(String(line)) })
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(async () => {
  vi.restoreAllMocks()
  await closeDb(pg)
  pg = undefined
})

type ErrorLine = { kind: string; request_id: string; route: string; error: ErrorShape }

/** `kind: 'error'` 줄만 — 한 요청에 하나여야 한다. */
function errorLogs(): ErrorLine[] {
  return errorLines.map((l) => JSON.parse(l) as ErrorLine).filter((l) => l.kind === 'error')
}

/** postgres-js `Errors.connection` 이 만드는 모양 그대로 (`node_modules/postgres/src/errors.js`). */
function connectionError(code = 'CONNECT_TIMEOUT'): Error {
  return Object.assign(new Error(`write ${code} 127.0.0.1:5432`), { code, errno: code, address: '127.0.0.1', port: 5432 })
}

async function callThrowing(thrown: unknown): Promise<Response> {
  const handler = route('GET /boom', async () => { throw thrown })
  return handler(req('GET', '/api/v1/boom'), params({}))
}

describe('🔴 ① 진짜 drizzle 질의가 죽었을 때 — 원인은 남고 질의문은 안 남는다', () => {
  it('없는 표를 읽는 라우트 → 500 · 로그에 SQLSTATE 는 있고 `select` 는 없다 · request_id 가 응답과 같다', async () => {
    const handler = route('GET /teams', async (ctx) => {
      //  ⚠ 진짜 질의다 — drizzle 이 `DrizzleQueryError(query, params, cause)` 로 감싼다.
      await ctx.db.execute(sql`select * from no_such_table_for_log_test where id = ${'sentinel-param'}`)
      return ctx.ok({})
    })
    const res = await handler(req('GET', '/api/v1/teams'), params({}))
    expect(res.status).toBe(500)
    const body = await errorOf(res)
    expect(body.code).toBe('INTERNAL')

    const logs = errorLogs()
    expect(logs).toHaveLength(1)
    const [line] = logs
    expect(line!.request_id).toBe(body.request_id)
    expect(line!.route).toBe('GET /teams')

    //  겉은 drizzle 의 껍데기 — message 는 뺐다고 **표시**된다 (「없었다」가 아니라 「뺐다」)
    expect(line!.error.name).toBe('DrizzleQueryError')
    expect(line!.error.message).toBe(MESSAGE_SCRUBBED)
    //  속은 드라이버(PGlite)의 원인 — 이게 사람이 읽을 줄이다
    expect(line!.error.cause?.code).toBe('42P01')
    expect(line!.error.cause?.message).toMatch(/no_such_table_for_log_test/)

    //  🔴 한 줄 **전체**에 질의문·매개변수가 없다 — 필드 하나가 아니라 직렬화된 문자열로 잰다
    const raw = errorLines.find((l) => l.includes('"kind":"error"'))!
    expect(raw.toLowerCase()).not.toContain('select')
    expect(raw).not.toContain('sentinel-param')
    expect(raw).not.toContain('Failed query')
  })
})

describe('🔴 ② 연결 오류 — 127 을 로그만으로 찾을 수 있었을 모양', () => {
  it('drizzle 이 감싼 CONNECT_TIMEOUT → 바깥은 껍데기 · 안쪽 cause 에 code 와 문장이 있다', async () => {
    const wrapped = new DrizzleQueryError('select 1 from teams', [], connectionError())
    const res = await callThrowing(wrapped)
    expect(res.status).toBe(500)
    const [line] = errorLogs()
    expect(line!.error.cause).toMatchObject({ name: 'Error', code: 'CONNECT_TIMEOUT', message: 'write CONNECT_TIMEOUT 127.0.0.1:5432' })
    expect(errorLines.join('\n')).not.toContain('select 1')
  })

  it('감싸지 않은 연결 오류도 code 가 닿고 stack 은 「at …」 줄 셋 이하다', async () => {
    await callThrowing(connectionError('ECONNRESET'))
    const [line] = errorLogs()
    expect(line!.error.code).toBe('ECONNRESET')
    expect(line!.error.stack!.length).toBeGreaterThan(0)
    expect(line!.error.stack!.length).toBeLessThanOrEqual(STACK_FRAMES)
    for (const frame of line!.error.stack!) expect(frame).toMatch(/^at /)
  })
})

describe('🔴 ③ 표의 행마다 값을 넣으면 로그가 갈린다 (loop/PROMPT.md ④2-B)', () => {
  const SENTINEL = 'ZZ_SENTINEL_'

  /** 표의 필드 하나에만 표식 값을 넣은 예외. `message` 는 query 를 안 품게 따로 만든다. */
  function errorWith(field: ErrorField): Error {
    const value = `${SENTINEL}${field}`
    const err = new Error(field === 'message' ? value : 'plain message')
    if (field === 'stack') err.stack = `Error: plain message\n    at ${value} (file.ts:1:1)`
    else if (field === 'cause') (err as Error & { cause?: unknown }).cause = new Error(value)
    else if (field !== 'message') Object.assign(err, { [field]: value })
    return err
  }

  for (const [field, rule] of Object.entries(ERROR_FIELD_RULES) as [ErrorField, string][]) {
    it(`${field} → ${rule}`, () => {
      const line = JSON.stringify(describeError(errorWith(field)))
      const marker = `${SENTINEL}${field}`
      if (rule === 'drop') expect(line, `${field} 는 로그에 없어야 한다`).not.toContain(marker)
      else expect(line, `${field} 는 로그에 있어야 한다`).toContain(marker)
    })
  }

  it('표에 없는 필드는 남지 않는다 (allowlist)', () => {
    const err = Object.assign(new Error('x'), { body: `${SENTINEL}body`, token: `${SENTINEL}token` })
    expect(JSON.stringify(describeError(err))).not.toContain(SENTINEL)
  })

  it('scrub — message 가 자기 query 를 품으면 통째로 뺀다 · 안 품으면 그대로 남는다', () => {
    const leaky = Object.assign(new Error('Failed query: select secret from t'), { query: 'select secret from t' })
    expect(describeError(leaky).message).toBe(MESSAGE_SCRUBBED)
    //  postgres-js `PostgresError` 모양 — query 필드는 있지만 message 는 서버 문장이다
    const pgLike = Object.assign(new Error('relation "t" does not exist'), { query: 'select 1 from t', code: '42P01' })
    expect(describeError(pgLike)).toMatchObject({ message: 'relation "t" does not exist', code: '42P01' })
    expect(JSON.stringify(describeError(pgLike))).not.toContain('select 1')
  })

  it(`message 는 ${MESSAGE_MAX_CHARS}자에서 잘린다`, () => {
    const long = 'm'.repeat(MESSAGE_MAX_CHARS * 3)
    const shape = describeError(new Error(long))
    expect(shape.message.length).toBe(MESSAGE_MAX_CHARS + 1)
    expect(shape.message.endsWith('…')).toBe(true)
  })

  it(`cause 사슬은 ${CAUSE_DEPTH} 까지만 — 순환해도 끝난다`, () => {
    const a = new Error('a') as Error & { cause?: unknown }
    const b = new Error('b') as Error & { cause?: unknown }
    a.cause = b
    b.cause = a
    let depth = 0
    for (let s: ErrorShape | undefined = describeError(a); s; s = s.cause) depth++
    expect(depth).toBe(CAUSE_DEPTH)
  })

  it('Error 가 아닌 것을 던져도 종류는 남는다', async () => {
    await callThrowing('a string')
    expect(errorLogs()[0]!.error).toEqual({ name: 'non-error', message: 'string 를 던졌다' })
  })
})

describe('④ 4xx 는 오류 로그를 안 찍는다 — 요청 로그가 이미 status 를 말한다', () => {
  it('ApiError(NOT_FOUND) → 404 · error 줄 0', async () => {
    const res = await callThrowing(new ApiError('NOT_FOUND'))
    expect(res.status).toBe(404)
    expect(errorLogs()).toHaveLength(0)
  })
})
