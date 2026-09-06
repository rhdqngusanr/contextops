import { randomUUID } from 'node:crypto'
import { ZodError, type ZodType, type z } from 'zod'

import { getDb, type Db } from '../../db/client'
import { actorWrites, readBearer, resolveActor, type Actor } from './auth'
import { ApiError } from './error'
import { describeError, logError, logRequest } from './log'
import { failure, matchesEtag, noContent, notModified, ok, packText, packZip, quoteEtag } from './respond'

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
  /**
   * 누가 부르고 있나 (SPEC §5). 라우트의 첫 줄이다.
   * ★ 순서가 규칙이다 — **헤더를 먼저 읽고 그 다음에 DB 를 연다.** 반대로 하면
   *   자격증명이 없다는 사실이 DB 상태에 달리고, DB 가 없는 서버가 401 대신 500 을 낸다.
   * ★ 한 요청에 한 번만 판정한다 (두 번 불러도 같은 주체 · 세션 upsert 도 한 번).
   */
  actor(): Promise<Actor>
  ok(data: unknown, status?: number, headers?: Record<string, string>): Response
  noContent(): Response
  /**
   * ETag 가 붙는 응답을 한 번에 낸다 (SPEC §5 packs 세 줄).
   * `If-None-Match` 가 맞으면 **본문을 만들지 않고** 304 를 돌려준다 —
   * 그래서 `body` 는 값이 아니라 함수다. 안 그러면 304 인데도 Pack 을 조립한다.
   */
  //  ★ 본문의 **종류가 표**다 — `json`(봉투) · `text`(Pack 파일 그대로) · `zip`(파일로 저장).
  //    새 종류를 더하는 절차: ① 여기 `CachedOpts` 에 갈래 ② `respond.ts` 에 만드는 함수
  //    ③ 아래 `cached` 의 분기 한 줄. 라우트는 종류만 말하고 `Response` 를 만들지 않는다.
  cached(opts: CachedOpts, body: () => unknown): Response
  /** 로그에 남길 식별자를 붙인다 (SPEC §11 — id 만, 이름·본문 금지). */
  note(fields: { user_id?: string; project_id?: string }): void
}

export type CachedOpts =
  | { etag: string; cacheControl: string; kind: 'json' | 'text' }
  //  zip 은 저장될 **파일 이름**까지 응답이 정한다 (`respond.ts` 의 `packZip`).
  | { etag: string; cacheControl: string; kind: 'zip'; filename: string }

export type Handler<P> = (ctx: RouteContext<P>) => Promise<Response>

/** Next 15 의 Route Handler 두 번째 인자. `params` 가 Promise 다. */
type NextContext<P> = { params: Promise<P> }

/**
 * `name` 은 로그에 남는 **라우트 모양**이다 (`POST /projects/{id}/repos`).
 * ⚠ 실제 경로를 로그에 남기지 마라 — id 가 로그에 흩어지면 지울 수가 없다.
 */
//  ⚠ 값이 `string | string[]` 인 이유 — catch-all 구간(`[...path]`)은 배열로 온다
//    (`GET …/packs/{semver}/files/{path}` 의 path 는 `/` 를 품는다). `string` 으로만
//    잡으면 그 라우트가 타입 검사에서 막히고, 그때 `as any` 로 뚫게 된다.
export function route<P extends Record<string, string | string[]> = Record<string, never>>(
  name: string,
  handle: Handler<P>,
): (req: Request, next: NextContext<P>) => Promise<Response> {
  return async (req, next) => {
    const requestId = randomUUID()
    const started = Date.now()
    const noted: { user_id?: string; project_id?: string } = {}
    const now = new Date()
    let resolved: Promise<Actor> | undefined
    let response: Response

    try {
      const params = (await next.params) ?? ({} as P)
      response = await handle({
        get db() { return getDb() },
        req,
        params,
        requestId,
        now,
        actor: () => {
          if (!resolved) {
            //  헤더 먼저 (순수) → 그 다음에 DB.
            const credential = readBearer(req)
            //  로그의 `user_id` 를 라우트가 따로 적지 않게 여기서 채운다 (SPEC §11).
            resolved = resolveActor(getDb(), credential, now).then((a) => {
              noted.user_id = a.userId
              refuseWrite(req.method, a)
              return a
            })
          }
          return resolved
        },
        ok: (data, status, headers) => ok(data, requestId, status, headers),
        noContent,
        cached: (opts, body) => {
          if (matchesEtag(req.headers.get('if-none-match'), opts.etag)) {
            return notModified(requestId, opts)
          }
          const value = body()
          if (opts.kind === 'text') return packText(String(value), requestId, opts)
          if (opts.kind === 'zip') return packZip(value as Uint8Array, requestId, opts)
          //  JSON 쪽은 봉투를 지킨다 — 화면이 `{data, meta}` 하나만 읽게.
          return ok(value, requestId, 200, { etag: quoteEtag(opts.etag), 'cache-control': opts.cacheControl })
        },
        note: (fields) => Object.assign(noted, fields),
      })
    } catch (err) {
      response = failure(toApiError(err, { request_id: requestId, route: name }), requestId)
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
 * 🔴 **읽기만 하는 주체가 바꾸려 들면 여기서 끊는다** (`ACTOR_RULES` 의 `writes` 축).
 *
 * ★ 왜 이 자리인가 — 「바꾸는 요청인가」를 아는 것은 **메서드**이고, 메서드를 아는
 *   자리는 라우트 감싸기 하나뿐이다. 라우트 안에서 세면 새 라우트가 반드시 빠뜨리고,
 *   빠뜨린 라우트는 **게스트에게만 뚫린 문**이 된다 — 그 문은 리뷰에서 눈에 안 띈다.
 * ★ 그리고 `ctx.actor()` 안이라 라우트가 「누가」를 묻는 순간 걸린다. 라우트의 첫 줄이
 *   그 물음이므로, body 를 읽기도 전에 403 이 나간다.
 *
 * ⚠ 판정 기준은 **HTTP 의 안전한 메서드**다. GET·HEAD 는 서버 상태를 안 바꾼다는
 *   약속이고 우리 라우트도 그 약속을 지킨다 (`sync-reports` 조차 POST 다).
 * ⚠ 게스트가 부를 쓰기 문이 나중에 생기면(§7.4 `POST /demo/ai-once` — 그 문은 아직 없다)
 *   여기에 **그 라우트 이름 하나만** 예외로 적어라. 「게스트도 POST 할 수 있다」로
 *   넓히지 마라 — 그러면 이 검사가 사실상 사라진다.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD'])

function refuseWrite(method: string, actor: Actor): void {
  if (SAFE_METHODS.has(method.toUpperCase())) return
  if (actorWrites(actor)) return
  throw new ApiError('FORBIDDEN', '읽기 전용으로 둘러보는 중이다 — 바꾸려면 로그인해야 한다')
}

/**
 * 무엇이 던져졌든 아홉 + 하나의 코드 중 하나로 만든다.
 * ⚠ 마지막 갈래에서 `err` 의 문구를 **응답**에 넣지 마라 — DB 드라이버의 메시지에는
 *   질의문이 통째로 들어 있고, 그건 P1 이 막는 것이 새는 자리다.
 * ★ 로그에는 남긴다 — 단, `log.ts` 의 **오류 로그 표**를 거쳐서 (FINDINGS 128). 예전엔 이름만
 *   남겨서(`{"kind":"unhandled","error":"Error"}`) 500 의 원인을 로그로 알 길이 없었다.
 *   여기서 `console.error(err)` 를 직접 부르지 마라 — 그 순간 표가 없는 것이 된다.
 */
function toApiError(err: unknown, where: { request_id: string; route: string }): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof ZodError) {
    return new ApiError('VALIDATION_FAILED', undefined, issuesOf(err))
  }
  logError({ ...where, error: describeError(err) })
  return new ApiError('INTERNAL')
}

/** 화면이 필드 옆에 붙일 수 있는 모양으로만 낸다. 값은 싣지 않는다. */
export function issuesOf(err: ZodError): { path: string; message: string }[] {
  return err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
}

/** body 를 계약으로 파싱한다. **라우트에서 손으로 검사하지 마라** (P1). */
export async function parseBody<T extends ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  const text = await req.text()
  let raw: unknown
  //  ⚠ 빈 본문은 `{}` 로 읽는다. `{note?}` 처럼 전부 optional 인 요청은 본문 없이 오는 것이
  //    정상이고, 그걸 「JSON 이 아니다」로 막으면 라우트마다 우회 문을 파게 된다.
  //    필수 필드가 있는 스키마는 어차피 여기서 필드별 issues 로 400 이 된다 — 그쪽이
  //    화면에 더 쓸모 있는 답이다.
  if (text.trim().length === 0) raw = {}
  else {
    try {
      raw = JSON.parse(text)
    } catch {
      throw new ApiError('VALIDATION_FAILED', 'JSON 본문이 아니다')
    }
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
