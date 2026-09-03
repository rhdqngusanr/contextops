import { ApiError } from './error'

// =====================================================================
//  응답 봉투를 만드는 유일한 자리 (SPEC §5 공통 규약)
//
//  ★ 왜 한 자리인가 — 라우트마다 `Response.json(...)` 을 적으면 어떤 응답에는
//    `meta.request_id` 가 빠지고, 화면은 그걸 런타임에야 안다. 봉투를 만드는
//    함수가 둘이 되는 순간 갈라진다. **`new Response` 를 라우트에 적지 마라.**
// =====================================================================

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

/**
 * 🔴 **캐시 머리의 정본 표** (SPEC §5 packs 세 줄).
 *
 * ★ 왜 표인가 — 같은 라우트 안에서 `max-age` 숫자를 손으로 적으면 `latest` 와 `{semver}`
 *   가 조용히 같은 값을 갖게 된다. 그 둘은 **정반대**여야 한다:
 *   `latest` 는 가리키는 대상이 바뀌므로 캐시하면 안 되고, `{semver}` 는 불변이라
 *   1년을 캐시해도 된다. 이름이 뜻을 말하게 두면 라우트가 고를 것이 하나뿐이다.
 */
export const CACHE_CONTROL = {
  /** 가리키는 버전이 발행마다 바뀐다 — ETag 로만 아낀다. */
  mutable: 'no-cache',
  /** 버전은 불변이다 (SPEC §5 「immutable, max-age=31536000」). */
  immutable: 'public, max-age=31536000, immutable',
} as const

/** 성공 봉투 `{ data, meta:{ request_id } }`. */
export function ok(
  data: unknown,
  requestId: string,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ data, meta: { request_id: requestId } }), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  })
}

/** 본문 없는 성공 (SPEC §5 `DELETE /devices/{id}` → 204). */
export function noContent(): Response {
  return new Response(null, { status: 204 })
}

/**
 * Pack 파일 본문 (SPEC §5 `GET …/packs/{semver}/files/{path}` → `text/plain`, ETag=sha256).
 *
 * ⚠ 이것만 봉투(`{data, meta}`)가 아니다. 그래야 하는 이유가 있다 — 플러그인 `sync` 가
 *   받은 바이트를 **그대로 파일로 쓰고 그 해시를 다시 잰다** (SPEC §8.5). 봉투에 담으면
 *   JSON 이스케이프가 섞여서 「서버가 준 sha256」과 「파일의 sha256」이 영원히 다르다.
 *   ★ `request_id` 는 헤더로 나간다 — 봉투가 없어도 로그와 이을 수 있게.
 */
export function packText(
  body: string,
  requestId: string,
  opts: { etag: string; cacheControl: string },
): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      etag: quoteEtag(opts.etag),
      'cache-control': opts.cacheControl,
      'x-request-id': requestId,
    },
  })
}

/** `If-None-Match` 가 맞았다 → 304. 본문이 없어야 하므로 봉투도 없다. */
export function notModified(
  requestId: string,
  opts: { etag: string; cacheControl: string },
): Response {
  return new Response(null, {
    status: 304,
    headers: {
      etag: quoteEtag(opts.etag),
      'cache-control': opts.cacheControl,
      'x-request-id': requestId,
    },
  })
}

/**
 * ETag 는 큰따옴표로 감싼 값이다 (RFC 9110). 감싸지 않으면 프록시가 조용히 무시한다.
 * ⚠ 비교는 `matchesEtag` 하나로만 한다 — 라우트마다 문자열을 자르면 한 곳은
 *   따옴표를 벗기고 한 곳은 안 벗겨서 304 가 어떤 라우트에서만 안 난다.
 */
export function quoteEtag(value: string): string {
  return `"${value}"`
}

/** `If-None-Match` 머리(`"a", W/"b"` 도 온다)에 이 값이 있나. */
export function matchesEtag(header: string | null, value: string): boolean {
  if (!header) return false
  if (header.trim() === '*') return true
  return header
    .split(',')
    .map((raw) => raw.trim().replace(/^W\//, '').replace(/^"|"$/g, ''))
    .includes(value)
}

/**
 * 실패 봉투 `{ error:{ code, message, details?, request_id } }`.
 * 상태는 `ApiError` 가 `ERROR_STATUS` 표에서 읽는다 — 여기서 숫자를 정하지 않는다.
 */
export function failure(err: ApiError, requestId: string): Response {
  const body: Record<string, unknown> = {
    code: err.code,
    message: err.message,
    request_id: requestId,
  }
  if (err.details !== undefined) body.details = err.details
  return new Response(JSON.stringify({ error: body }), {
    status: err.status,
    headers: JSON_HEADERS,
  })
}
