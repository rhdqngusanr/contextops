import { ERROR_CODES, type ErrorCode } from '@contextops/schema'

import { clearSession, readSession } from './session'

// =====================================================================
//  화면이 서버로 나가는 **문 하나** (SPEC §5)
//
//  ★ 왜 하나인가 — 화면마다 `fetch` 를 적으면 어떤 화면은 토큰을 안 붙이고,
//    어떤 화면은 `{data, meta}` 봉투를 안 벗기고, 어떤 화면은 에러 봉투를
//    「그냥 실패」로 뭉갠다. 그러면 **에러 코드 9종이 화면에서 다시 죽는다.**
//    여기 하나면 빠질 자리가 없다.
//
//  ⚠ 화면에서 `fetch('/api/v1/...')` 를 직접 부르지 마라.
// =====================================================================

/**
 * 🔴 **코드 → 화면 문구의 정본 표** (DESIGN_BRIEF §5 「상태·오류 문구」).
 *
 * ★ 왜 서버 문구를 그대로 안 쓰나 — `ERROR_STATUS` 의 message 는 개발자에게 하는 말이고
 *   (한다체·「기준 버전이 낡았다」), 화면에 나가는 말은 **팀장이 읽는 문장**이다.
 *   서버 문구를 그대로 띄우면 비개발자 사용자가 무엇을 해야 하는지 알 수 없다.
 *
 * ★ 새 에러 코드를 더하는 절차의 다섯째 칸이다 (`packages/schema` 의 `ERROR_STATUS`
 *   주석 ①~④ 다음): **⑤ 이 표에 한 줄.** 빠뜨리면 타입 검사가 막고,
 *   `test/web-tables.test.ts` 가 「문구가 비었다」로 다시 막는다.
 */
export const ERROR_HINT: Record<ErrorCode, string> = {
  UNAUTHORIZED: '로그인이 필요합니다. 다시 로그인해주세요.',
  FORBIDDEN: '이 작업은 팀 owner만 할 수 있습니다.',
  NOT_FOUND: '찾을 수 없습니다. 주소가 바뀌었거나 삭제되었을 수 있습니다.',
  VALIDATION_FAILED: '입력한 내용을 다시 확인해주세요.',
  STALE_BASE: '그 사이 새 버전이 발행되었습니다. 최신 내용을 불러왔어요. 다시 발행해주세요.',
  //  DESIGN_BRIEF §5 「409(항목 수정)」 — 문구를 그대로 쓴다.
  REVISION_CONFLICT: '다른 사람이 먼저 수정했습니다. 최신 내용을 불러왔어요. 다시 저장해주세요.',
  //  🔴 「샘플 결과를 표시합니다」였다 (FINDINGS 66). **표시하는 코드가 0곳이었다** —
  //     화면이 없는 것을 약속하면 사람은 「샘플이 어디 있지」를 찾다가 화면이 고장난 줄 안다.
  //     ⚠ 되살리려면 문구가 아니라 **픽스처를 표시하는 코드가 먼저**다 (SPEC §7.5).
  BUDGET_EXCEEDED: '오늘의 AI 예산이 소진되었습니다. 내일 다시 시도해주세요.',
  RATE_LIMITED: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.',
  //  발행은 **전부 롤백**된다 (SPEC §2.1). 「아무것도 바뀌지 않았다」를 반드시 말한다 —
  //  중간 상태를 의심하게 두면 사용자가 손으로 고치려 든다.
  COMPILE_FAILED: '발행이 취소되었습니다. 아무것도 바뀌지 않았습니다.',
  INTERNAL: '서버에서 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  //  ⚠ 「AI」라고 말한다 — 사용자가 할 수 있는 일이 **다시 시도**밖에 없다는 점에서
  //     INTERNAL 과 같지만, 원인이 다르면 다시 시도의 성공 확률이 다르다 (SPEC §7).
  AI_OUTPUT_INVALID: 'AI가 정리한 결과를 읽지 못했습니다. 다시 시도해주세요.',
}

/** 서버가 낸 실패 봉투를 그대로 들고 다닌다 — 화면이 `code` 로 갈래를 탄다. */
export class ApiClientError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details: unknown
  readonly requestId: string | undefined

  constructor(code: ErrorCode, status: number, details?: unknown, requestId?: string) {
    super(ERROR_HINT[code])
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
    this.requestId = requestId
  }
}

const API = '/api/v1'

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value)
}

function authHeaders(): Record<string, string> {
  const session = readSession()
  //  ⚠ 세션이 없으면 헤더를 **안 붙인다.** 빈 문자열을 붙이면 서버가 「형식이 아니다」로
  //    답하고, 화면은 그걸 「로그인 필요」와 구별하지 못한다.
  return session ? { authorization: `Bearer ${session.access_token}` } : {}
}

/**
 * 실패면 `ApiClientError` 를 던진다. 401 이면 **세션을 지운다** —
 * 만료된 토큰을 들고 계속 두드리면 모든 화면이 같은 오류를 반복한다.
 */
async function raise(res: Response): Promise<never> {
  let code: ErrorCode = 'INTERNAL'
  let details: unknown
  let requestId: string | undefined
  try {
    const json = (await res.json()) as { error?: { code?: unknown; details?: unknown; request_id?: string } }
    if (isErrorCode(json.error?.code)) code = json.error.code
    details = json.error?.details
    requestId = json.error?.request_id
  } catch {
    //  봉투가 아니면 코드를 지어내지 않는다 — `INTERNAL` 이 정직한 답이다.
  }
  if (code === 'UNAUTHORIZED') clearSession()
  throw new ApiClientError(code, res.status, details, requestId)
}

/** 봉투(`{data, meta}`)를 벗겨서 `data` 만 돌려준다. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...authHeaders(),
      ...init.headers,
    },
  })
  if (!res.ok) await raise(res)
  const json = (await res.json()) as { data: T }
  return json.data
}

/**
 * Pack 파일 본문 (`text/plain`). **봉투가 아니다** — 플러그인이 받는 바이트와
 * 같은 것을 화면도 받는다 (SPEC §5 packs 셋째 줄). 그래야 화면에 보이는 것과
 * 기기에 깔리는 것이 같다고 말할 수 있다.
 */
export async function apiText(path: string): Promise<string> {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() })
  if (!res.ok) await raise(res)
  return res.text()
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return apiJson<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return apiJson<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

/**
 * **행에 남은 에러 코드**를 화면 문구로 (`ai_jobs.error_code` 는 `string | null` 이다).
 *
 * ★ 왜 `messageOf` 로 안 되나 — 저것은 **방금 던져진 예외**를 위한 것이고, 이것은
 *   실패한 채로 DB 에 앉아 있는 job 을 나중에 읽을 때다. 둘 다 위 `ERROR_HINT` 표
 *   하나를 읽는다 — 화면이 문구를 지어내는 자리를 만들지 않는다.
 * ⚠ 표에 없는 값이면 `INTERNAL` 이다. 코드를 그대로 화면에 띄우지 마라 —
 *   `AI_OUTPUT_INVALID` 는 팀장에게 아무 뜻이 없다.
 */
export function hintFor(code: string | null): string {
  return isErrorCode(code) ? ERROR_HINT[code] : ERROR_HINT.INTERNAL
}

/** 어떤 예외든 화면에 띄울 한 문장으로 만든다. 스택은 절대 띄우지 않는다. */
export function messageOf(err: unknown): string {
  if (err instanceof ApiClientError) return err.message
  return ERROR_HINT.INTERNAL
}
