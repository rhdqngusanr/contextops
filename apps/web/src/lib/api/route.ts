import { randomUUID } from 'node:crypto'
import { ZodError, type ZodType, type z } from 'zod'

import { getDb, type Db } from '../../db/client'
import { ApiError } from './error'
import { logRequest } from './log'
import { failure, noContent, ok } from './respond'

// =====================================================================
//  Route Handler 를 감싸는 자리 하나 (SPEC §5 · §11)
//
//  ★ 이 감싸기가 하는 일 넷 — 라우트마다 적으면 반드시 하나씩 빠진다:
//    ① `request_id` 를 만들고 응답과 로그에 **같은 값**으로 남긴다
//    ② 던져진 `ApiError`·`ZodError` 를 봉투로 바꾼다 (상태는 `ERROR_STATUS` 표가 정한다)
//    ③ 예상 못 한 예외를 `INTERNAL` 로 덮는다 — **스택이 응답으로 새지 않게**
//    ④ 요청 로그를 남긴다. 필드는 `log.ts` 의 표뿐이다 (P1)
//
//  ⚠ 라우트 안에서 `new Response(...)` 를 만들지 마라. 만들면 그 응답만 봉투가 아니다.
// =====================================================================

export type RouteContext<P> = {
  /** ⚠ 처음 읽을 때 연결한다. `/health` 는 DB 없이도 답해야 해서 미리 열지 않는다. */
  db: Db
  req: Request
  params: P
  requestId: string
  /** 요청 하나 안에서는 「지금」이 하나다 — 만료 판정과 기록 시각이 갈리지 않게. */
  now: Date
  ok(data: unknown, status?: number): Response
  noContent(): Response
  /** 로그에 남길 식별자를 붙인다 (SPEC §11 — id 만, 이름·본문 금지). */
  note(fields: { user_id?: string; project_id?: string }): void
}

export type Handler<P> = (ctx: RouteContext<P>) => Promise<Response>

/** Next 15 의 Route Handler 두 번째 인자. `params` 가 Promise 다. */
type NextContext<P> = { params: Promise<P> }

/**
 * `name` 은 로그에 남는 **라우트 모양**이다 (`POST /projects/{id}/repos`).
 * ⚠ 실제 경로를 로그에 남기지 마라 — id 가 로그에 흩어지면 지울 수가 없다.
 */
export function route<P extends Record<string, string> = Record<string, never>>(
  name: string,
  handle: Handler<P>,
): (req: Request, next: NextContext<P>) => Promise<Response> {
  return async (req, next) => {
    const requestId = randomUUID()
    const started = Date.now()
    const noted: { user_id?: string; project_id?: string } = {}
    let response: Response

    try {
      const params = (await next.params) ?? ({} as P)
      response = await handle({
        get db() { return getDb() },
        req,
        params,
        requestId,
        now: new Date(),
        ok: (data, status) => ok(data, requestId, status),
        noContent,
        note: (fields) => Object.assign(noted, fields),
      })
    } catch (err) {
      response = failure(toApiError(err), requestId)
    }

    logRequest({
      request_id: requestId,
      route: name,
      method: req.method,
      status: response.status,
      latency_ms: Date.now() - started,
      ...noted,
    })
    return response
  }
}

/**
 * 무엇이 던져졌든 아홉 + 하나의 코드 중 하나로 만든다.
 * ⚠ 마지막 갈래에서 `err` 의 문구를 응답에 넣지 마라 — DB 드라이버의 메시지에는
 *   질의문이 통째로 들어 있고, 그건 P1 이 막는 것이 새는 자리다.
 */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof ZodError) {
    return new ApiError('VALIDATION_FAILED', undefined, issuesOf(err))
  }
  //  ⚠ 예외의 **이름만** 남긴다. 드라이버 예외의 message 에는 질의문과 매개변수가
  //    통째로 들어 있고, 그건 P1 이 막는 것이 로그로 새는 자리다 (SPEC §11).
  console.error(JSON.stringify({ kind: 'unhandled', error: err instanceof Error ? err.name : 'unknown' }))
  return new ApiError('INTERNAL')
}

/** 화면이 필드 옆에 붙일 수 있는 모양으로만 낸다. 값은 싣지 않는다. */
export function issuesOf(err: ZodError): { path: string; message: string }[] {
  return err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
}

/** body 를 계약으로 파싱한다. **라우트에서 손으로 검사하지 마라** (P1). */
export async function parseBody<T extends ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError('VALIDATION_FAILED', 'JSON 본문이 아니다')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED', undefined, issuesOf(parsed.error))
  return parsed.data as z.output<T>
}

/** `?limit=&offset=` 같은 질의를 같은 방식으로 판다. */
export function parseQuery<T extends ZodType>(req: Request, schema: T): z.output<T> {
  const raw = Object.fromEntries(new URL(req.url).searchParams)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED', undefined, issuesOf(parsed.error))
  return parsed.data as z.output<T>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 경로 조각이 uuid 인지 **질의 전에** 확인한다.
 * ★ 왜 — 아니면 Postgres 가 `invalid input syntax for type uuid` 로 죽고, 그 문구가
 *   `INTERNAL` 500 이 된다. 400 이어야 하는 것을 500 으로 보고하면 운영 지표가 거짓말한다.
 */
export function pathUuid(value: string | undefined, what: string): string {
  if (!value || !UUID_RE.test(value)) throw new ApiError('VALIDATION_FAILED', `${what} 가 uuid 가 아니다`)
  return value
}
