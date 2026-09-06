// =====================================================================
//  요청 로그 · 오류 로그 (SPEC §11 · 원칙 P1)
//
//  🔴 **남기는 것은 아래 표의 필드뿐이다.** body·토큰·문서 본문·질의 문자열은 남기지 않는다.
//     P1 은 「받지 않는다」이지 「받아서 안 쓴다」가 아니다 — 로그에 남으면 이미 받은 것이다.
//
//  ★ 왜 표를 고정했나 — `console.log(req)` 한 줄이면 헤더의 Authorization 이 통째로
//    로그에 남는다. 찍는 자리를 하나로 두고 **필드를 열거**하면 그 사고가 안 난다.
//    새 필드를 더하려면 여기 한 줄 — 그리고 그게 P1 을 어기지 않는지 그 자리에서 판단하게 된다.
// =====================================================================

export type RequestLog = {
  request_id: string
  route: string
  method: string
  status: number
  latency_ms: number
  /** 식별자만이다. 이름·이메일은 안 남긴다. */
  user_id?: string
  project_id?: string
}

export function logRequest(entry: RequestLog): void {
  //  한 줄 JSON — 배포 환경(Vercel)의 로그 수집이 그대로 읽는다.
  console.log(JSON.stringify({ kind: 'request', ...entry }))
}

// ---------------------------------------------------------------------
//  🔴 오류 로그의 표 — 예외 객체의 **어떤 필드를 남기고 무엇을 안 남기나** (FINDINGS 128)
//
//  ★ 왜 생겼나 — 예전엔 예외의 **이름만** 남겼다 (`{"kind":"unhandled","error":"Error"}`).
//    FINDINGS 127 의 500 은 그 한 줄로는 원인을 알 수 없었고, 서버를 다시 띄워 소켓을 세어
//    본 뒤에야 `CONNECT_TIMEOUT` 이 나왔다. 운영에서 이걸 못 보면 아무것도 못 고친다.
//    P1 이 막는 것은 「body·토큰·문서 본문·질의문」이지 「에러 메시지」가 아니다.
//
//  ★ 왜 allowlist 인가 — 드라이버 예외는 질의문을 **필드로도, message 로도** 실어 온다:
//    · drizzle `DrizzleQueryError` — message 가 `Failed query: <sql>\nparams: <값>` 이고
//      `query`·`params` 필드가 따로 있다. 원인(드라이버 예외)은 `cause` 에 있다.
//    · postgres-js `PostgresError` — `query`·`parameters` 필드. message 는 서버가 준 짧은 문장.
//    · postgres-js 연결 오류 — `code: 'CONNECT_TIMEOUT'` · message `write CONNECT_TIMEOUT host:port`.
//    표에 없는 필드는 **남기지 않는다.** `drop` 행은 「왜 안 남기나」를 적는 자리다 —
//    지우면 다음 사람이 「없길래 더했다」고 다시 넣는다.
//
//  ★ 규칙 넷 —
//    `keep`   문자열·숫자면 그대로 (`MESSAGE_MAX_CHARS` 로 자른다)
//    `scrub`  message — 같은 예외의 `query` 가 message 안에 있으면 message 를 **통째로** 뺀다.
//             자르기만 하면 앞 200자가 질의문이다. 원인 문장은 `cause` 사슬이 대신 말한다
//    `frames` stack — 「at …」 줄만 `STACK_FRAMES` 개. 첫 줄(`name: message`)은 message 를
//             또 실으므로 안 쓴다
//    `chain`  cause — 같은 표로 다시 읽는다 (`CAUSE_DEPTH` 까지)
//    `drop`   남기지 않는다
//
//  새 필드를 더하는 절차: ① 여기 한 줄 (규칙과 **왜**) ② `test/error-log.test.ts` 의 표 대조가
//  그 필드를 실제로 남기거나/빼는지 잰다 — 표의 행마다 「값을 넣으면 로그가 갈린다」가 시험이다.
// ---------------------------------------------------------------------

export type ErrorFieldRule = 'keep' | 'scrub' | 'frames' | 'chain' | 'drop'

export const ERROR_FIELD_RULES = {
  name: 'keep',
  /** postgres-js `CONNECT_TIMEOUT`·`ECONNRESET` · Postgres SQLSTATE(`42P01`) · Node `errno` 코드 */
  code: 'keep',
  message: 'scrub',
  stack: 'frames',
  cause: 'chain',
  /** drizzle · postgres-js — 질의문 그 자체 (P1) */
  query: 'drop',
  /** postgres-js — 바인딩된 값 */
  parameters: 'drop',
  /** drizzle — 바인딩된 값 */
  params: 'drop',
  /** Postgres — `Key (slug)=(…) already exists` 처럼 값이 든다 */
  detail: 'drop',
  /** Postgres — 값이 들 수 있다 (`Perhaps you meant …`) */
  hint: 'drop',
  /** Postgres — PL/pgSQL 함수 본문 줄 */
  where: 'drop',
  /** Postgres — 함수 안에서 실패한 질의문 */
  internal_query: 'drop',
} as const satisfies Record<string, ErrorFieldRule>

export type ErrorField = keyof typeof ERROR_FIELD_RULES

/** message 상한. 드라이버 message 는 짧고(`write CONNECT_TIMEOUT …`), 긴 것은 어차피 사람이 안 읽는다. */
export const MESSAGE_MAX_CHARS = 200
/** stack 에서 남기는 「at …」 줄 수 — 어느 파일의 어느 줄인지는 셋이면 잡힌다. */
export const STACK_FRAMES = 3
/** cause 사슬 깊이 — drizzle(1) → postgres-js(2) 면 충분하고, 순환 참조를 여기서 끊는다. */
export const CAUSE_DEPTH = 3
/** `scrub` 이 message 를 뺐을 때 그 자리에 남기는 표시 — 「없었다」와 「뺐다」를 구별하게. */
export const MESSAGE_SCRUBBED = '(질의문이 든 message 는 남기지 않는다 — P1)'

/** 로그에 남는 예외 하나의 모양. 표의 `keep`·`scrub`·`frames`·`chain` 행만 여기 있다. */
export type ErrorShape = {
  name: string
  code?: string | number
  message: string
  stack?: string[]
  cause?: ErrorShape
}

export type ErrorLog = {
  request_id: string
  route: string
  error: ErrorShape
}

/**
 * 예외를 표대로 읽는다 — **표에 있는 필드만, 표의 규칙으로.**
 * ⚠ `Error` 가 아닌 것(문자열·객체)을 던지는 코드도 있다 — 그때는 종류만 남긴다.
 */
export function describeError(err: unknown, depth = 0): ErrorShape {
  if (!(err instanceof Error)) {
    return { name: 'non-error', message: `${typeof err} 를 던졌다` }
  }
  const raw = err as Error & Record<string, unknown>
  //  `name` 은 보통 prototype 에 있다 — `raw[field]` 는 prototype 까지 읽으므로 표 한 바퀴로 잡힌다.
  const shape: ErrorShape = { name: 'Error', message: '' }
  const out = shape as Record<string, unknown>

  for (const [field, rule] of Object.entries(ERROR_FIELD_RULES) as [ErrorField, ErrorFieldRule][]) {
    const value = raw[field]
    if (value === undefined || value === null) continue
    switch (rule) {
      case 'keep':
        if (typeof value === 'string') out[field] = clip(field === 'name' ? nameOf(err) : value)
        else if (typeof value === 'number') out[field] = value
        break
      case 'scrub':
        if (typeof value === 'string') out[field] = scrubMessage(value, raw)
        break
      case 'frames':
        if (typeof value === 'string') out[field] = frames(value)
        break
      case 'chain':
        if (depth + 1 < CAUSE_DEPTH) out[field] = describeError(value, depth + 1)
        break
      case 'drop':
        break
    }
  }
  return shape
}

/**
 * message 에 같은 예외의 `query` 가 들어 있으면 **통째로** 뺀다.
 * ★ 왜 「자르기」가 아닌가 — `Failed query: select …` 를 200자로 자르면 앞 200자가 질의문이다.
 */
function scrubMessage(message: string, raw: Record<string, unknown>): string {
  const query = raw.query
  if (typeof query === 'string' && query.length > 0 && message.includes(query)) return MESSAGE_SCRUBBED
  return clip(message)
}

/**
 * `name` 이 기본값 `Error` 면 **클래스 이름**을 쓴다.
 * ★ 왜 — drizzle 의 `DrizzleQueryError` 는 `this.name` 을 안 정한다. 그래서 127 의 로그가
 *   `"error":"Error"` 였다 — 그 한 낱말이 「DB 질의가 죽었다」였는데 아무도 읽을 수 없었다.
 */
function nameOf(err: Error): string {
  const ctor = err.constructor?.name
  return err.name === 'Error' && ctor && ctor !== 'Error' ? ctor : err.name
}

function clip(text: string): string {
  return text.length > MESSAGE_MAX_CHARS ? `${text.slice(0, MESSAGE_MAX_CHARS)}…` : text
}

/** 「    at fn (file:line:col)」 줄만 — 첫 줄(`name: message`)과 빈 줄은 버린다. */
function frames(stack: string): string[] {
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '))
    .slice(0, STACK_FRAMES)
}

export function logError(entry: ErrorLog): void {
  //  stderr 한 줄 JSON — 요청 로그와 `request_id` 로 맞춰 읽는다.
  console.error(JSON.stringify({ kind: 'error', ...entry }))
}
