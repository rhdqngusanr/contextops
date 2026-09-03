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
  | { kind: 'ok'; status: number; data: unknown }
  /** 서버가 봉투로 답했다 — 무엇이 잘못됐는지 서버가 안다. */
  | { kind: 'failed'; status: number; code: ErrorCode | 'UNKNOWN'; message: string }
  /** 서버에 닿지 못했거나 봉투가 아니었다. */
  | { kind: 'unreachable'; message: string }

/** `https://origin` + `/api/v1/...`. 슬래시를 여기 한 곳에서만 붙인다. */
export function apiUrl(origin: string, path: string): string {
  return `${origin}/api/v1/${path.replace(/^\//, '')}`
}

export async function apiGet(cli: Cli, origin: string, path: string, token: string): Promise<ApiOutcome> {
  let response: Response
  try {
    response = await cli.fetch(apiUrl(origin, path), {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    })
  } catch (err) {
    return { kind: 'unreachable', message: err instanceof Error ? err.message : '알 수 없는 이유' }
  }

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

  if (response.ok) return { kind: 'ok', status: response.status, data: body }

  const failure = ApiFailure.safeParse(body)
  return failure.success
    ? { kind: 'failed', status: response.status, code: failure.data.error.code, message: failure.data.error.message }
    : { kind: 'failed', status: response.status, code: 'UNKNOWN', message: `${response.status} 응답` }
}
