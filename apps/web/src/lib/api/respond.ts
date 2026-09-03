import { ApiError } from './error'

// =====================================================================
//  응답 봉투를 만드는 유일한 자리 (SPEC §5 공통 규약)
//
//  ★ 왜 한 자리인가 — 라우트마다 `Response.json(...)` 을 적으면 어떤 응답에는
//    `meta.request_id` 가 빠지고, 화면은 그걸 런타임에야 안다. 봉투를 만드는
//    함수가 둘이 되는 순간 갈라진다. **`new Response` 를 라우트에 적지 마라.**
// =====================================================================

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

/** 성공 봉투 `{ data, meta:{ request_id } }`. */
export function ok(data: unknown, requestId: string, status = 200): Response {
  return new Response(JSON.stringify({ data, meta: { request_id: requestId } }), {
    status,
    headers: JSON_HEADERS,
  })
}

/** 본문 없는 성공 (SPEC §5 `DELETE /devices/{id}` → 204). */
export function noContent(): Response {
  return new Response(null, { status: 204 })
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
