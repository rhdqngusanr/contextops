import { ERROR_STATUS, type ErrorCode } from '@contextops/schema'

// =====================================================================
//  API 에러 (SPEC §5)
//
//  ★ 왜 예외로 던지나 — 권한 검사는 라우트의 **첫 줄**에서 일어나야 하는데,
//    반환값으로 실어 나르면 호출부마다 `if (!ok) return ...` 을 적게 되고
//    한 곳만 빠뜨려도 그 라우트는 검사 없이 통과한다. 던지면 빠뜨릴 수 없다.
//
//  ⚠ 상태 숫자를 여기 적지 마라. 정본은 `@contextops/schema` 의 `ERROR_STATUS` 다.
// =====================================================================

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly details: unknown

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? ERROR_STATUS[code].message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }

  get status(): number {
    return ERROR_STATUS[this.code].status
  }
}

/**
 * 던지는 쪽을 한 글자로 만든다 — `throw` 를 적을 필요가 없게 `never` 를 돌려준다.
 * 그래서 `if (!row) fail('NOT_FOUND')` 뒤에서 TS 가 `row` 를 좁혀 준다.
 */
export function fail(code: ErrorCode, message?: string, details?: unknown): never {
  throw new ApiError(code, message, details)
}
