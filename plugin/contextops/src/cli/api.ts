import { ApiFailure, type ErrorCode } from '@contextops/schema'

import type { Cli } from './cli'

// =====================================================================
//  서버와 말하는 문 하나 (docs/SPEC.md §5 의 봉투 규약)
//
//  ★ 왜 감싸나 — 응답은 세 갈래인데 명령마다 풀면 반드시 하나를 빠뜨린다:
//    ① 성공 봉투 `{data, meta}` ② 실패 봉투 `{error:{code,…}}` ③ **서버에 못 닿음**.
//    ③을 ②로 뭉치면 「오프라인」과 「권한 없음」이 같은 문구로 나가고, 사람은
//    없는 권한 문제를 쫓는다.
//
//  ⚠ 응답 본문을 로그로 찍지 마라 (P1 · SPEC §11). 나가는 것은 코드와 문구뿐이다.
// =====================================================================

export type ApiOutcome =
  /**
   * `data` 는 **봉투를 벗긴 안쪽**이다 — `{data,meta}` 가 아니라 그 `data`.
   * ★ 왜 여기서 벗기나 — 봉투를 그대로 넘기면 명령마다 `(body as {data}).data` 를
   *   적게 되고, 그 캐스트는 **틀려도 타입 검사를 통과한다.** 실제로 그렇게 뒀다가
   *   `sync` 가 Manifest 자리에서 봉투를 파싱해 「계약과 맞지 않는다」로 죽었다.
   *   벗기는 자리는 하나여야 한다 (SPEC §5 봉투 규약).
   */
  | { kind: 'ok'; status: number; data: unknown; etag: string | undefined }
  /**
   * `If-None-Match` 가 맞았다 — **본문이 없다.**
   * ★ 왜 따로인가 — 이걸 `failed` 로 뭉치면 sync 의 정상 경로(「바뀐 게 없다」)가
   *   오류로 보인다. 반대로 `ok` 로 뭉치면 호출부가 없는 body 를 판다.
   */
  | { kind: 'not_modified' }
  /** 서버가 봉투로 답했다 — 무엇이 잘못됐는지 서버가 안다. */
  | { kind: 'failed'; status: number; code: ErrorCode | 'UNKNOWN'; message: string }
  /** 서버에 닿지 못했거나 봉투가 아니었다. */
  | { kind: 'unreachable'; message: string }

/**
 * Pack 파일 본문. **봉투가 아니다** — 받은 바이트를 그대로 파일로 쓰고 sha256 을
 * 다시 재서 Manifest 와 대조한다 (SPEC §8.5 4단계).
 * 🔴 JSON 으로 감싸면 그 대조가 영원히 어긋난다.
 */
export type TextOutcome =
  | { kind: 'ok'; text: string }
  | { kind: 'failed'; status: number; code: ErrorCode | 'UNKNOWN'; message: string }
  | { kind: 'unreachable'; message: string }

/** `https://origin` + `/api/v1/...`. 슬래시를 여기 한 곳에서만 붙인다. */
export function apiUrl(origin: string, path: string): string {
  return `${origin}/api/v1/${path.replace(/^\//, '')}`
}

type Sent = { response: Response } | { unreachable: string }

async function send(
  cli: Cli, method: string, origin: string, path: string, token: string,
  init: { headers?: Record<string, string>; body?: unknown } = {},
): Promise<Sent> {
  try {
    const response = await cli.fetch(apiUrl(origin, path), {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(init.headers ?? {}),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    })
    return { response }
  } catch (err) {
    return { unreachable: err instanceof Error ? err.message : '알 수 없는 이유' }
  }
}

/** 봉투 응답 하나를 갈래로 푼다. `apiGet`·`apiPost` 가 같은 규칙을 쓴다. */
async function envelope(response: Response): Promise<ApiOutcome> {
  //  ⚠ 304 는 본문이 없다. `text()` 를 먼저 부르면 빈 문자열을 JSON 으로 파싱하려다
  //    「봉투가 아니다」로 튄다 — 정상 경로가 오류로 보이는 자리다.
  if (response.status === 304) return { kind: 'not_modified' }

  const text = await response.text().catch(() => '')
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return {
      kind: 'unreachable',
      message: `${response.status} 응답이 JSON 봉투가 아니다 — 이 주소가 ContextOps 서버가 맞나`,
    }
  }

  if (response.ok) {
    //  🔴 봉투를 여기서 벗긴다. `data` 칸이 없으면 이 주소는 우리 서버가 아니다 —
    //     그걸 `ok` 로 넘기면 호출부가 `undefined` 를 계약 위반으로 오해해서,
    //     「서버 주소가 틀렸다」가 「서버 버전이 낡았다」로 보고된다.
    if (typeof body !== 'object' || body === null || !('data' in body)) {
      return {
        kind: 'unreachable',
        message: `${response.status} 응답에 data 봉투가 없다 — 이 주소가 ContextOps 서버가 맞나`,
      }
    }
    return {
      kind: 'ok',
      status: response.status,
      data: (body as { data: unknown }).data,
      etag: response.headers.get('etag') ?? undefined,
    }
  }

  const failure = ApiFailure.safeParse(body)
  return failure.success
    ? { kind: 'failed', status: response.status, code: failure.data.error.code, message: failure.data.error.message }
    : { kind: 'failed', status: response.status, code: 'UNKNOWN', message: `${response.status} 응답` }
}

export async function apiGet(
  cli: Cli, origin: string, path: string, token: string,
  headers?: Record<string, string>,
): Promise<ApiOutcome> {
  const sent = await send(cli, 'GET', origin, path, token, { headers: headers ?? {} })
  if ('unreachable' in sent) return { kind: 'unreachable', message: sent.unreachable }
  return envelope(sent.response)
}

export async function apiPost(cli: Cli, origin: string, path: string, token: string, body: unknown): Promise<ApiOutcome> {
  const sent = await send(cli, 'POST', origin, path, token, { body })
  if ('unreachable' in sent) return { kind: 'unreachable', message: sent.unreachable }
  return envelope(sent.response)
}

/**
 * `text/plain` 본문을 **그대로** 받는다 (Pack 파일).
 * ⚠ 여기서 텍스트를 다듬지 마라 — trim 한 글자에 sha256 이 통째로 갈린다.
 */
export async function apiGetText(cli: Cli, origin: string, path: string, token: string): Promise<TextOutcome> {
  const sent = await send(cli, 'GET', origin, path, token)
  if ('unreachable' in sent) return { kind: 'unreachable', message: sent.unreachable }
  const { response } = sent
  const text = await response.text().catch(() => '')
  if (response.ok) return { kind: 'ok', text }

  //  실패는 봉투로 온다 (`route()` 가 그렇게 답한다). 못 풀면 상태 코드만 말한다.
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return { kind: 'failed', status: response.status, code: 'UNKNOWN', message: `${response.status} 응답` }
  }
  const failure = ApiFailure.safeParse(body)
  return failure.success
    ? { kind: 'failed', status: response.status, code: failure.data.error.code, message: failure.data.error.message }
    : { kind: 'failed', status: response.status, code: 'UNKNOWN', message: `${response.status} 응답` }
}
