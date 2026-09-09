import { ERROR_CODES, type ErrorCode } from '@contextops/schema'
import type { CompileErrorCode } from '@contextops/compiler'

import { CREATION_LIMITS, type LimitReason } from '../api/limits'

import type { ActorKind } from '../api/actor-rules'
import { actorKindOf, clearSession, readSession } from './session'

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
  //     이 코드는 `retryable` 이라 화면 3 이 [다시 시도] 를 **실제로 그린다** (INBOX G8) —
  //     「다시 시도해주세요」라고 말하면서 버튼이 없던 자리였다.
  AI_OUTPUT_INVALID: 'AI가 정리한 결과를 읽지 못했습니다. 다시 시도해주세요.',
  //  🔴 사람이 할 일이 「기다리기」가 아니라 **「운영자에게 알리기」**다 — 키가 없는 배포는
  //     시간이 고치지 않는다 (INBOX G9). 「픽스처 결과」를 약속하지 않는다 — 그런 코드는 없다.
  AI_NOT_CONFIGURED: 'AI 기능이 아직 설정되지 않았습니다. 운영자에게 알려주세요.',
}

/**
 * 🔴 **게스트일 때만 덮는 문구** (FINDINGS 121 · DESIGN_BRIEF §5 「403(게스트)」).
 *
 * ★ 왜 표가 따로 있나 — `ERROR_HINT` 는 코드 하나에 문구 하나다. 그런데 같은 403 을
 *   member 는 「owner 가 아니라서」 받고 게스트는 「읽기 전용이라서」 받는다. 게스트에게
 *   「팀 owner만 할 수 있습니다」는 **거짓말**이다 — 로그인해도 그 팀에서는 못 한다.
 *   여기 없는 코드는 `ERROR_HINT` 그대로다. 고르는 자리는 아래 `hintText` 하나.
 * ★ 서버 문구(`route.ts` `refuseWrite` 「읽기 전용으로 둘러보는 중이다 — 바꾸려면 로그인해야
 *   한다」)와 **같은 말**을 사람 말로 적는다. 「로그인」이 아니라 「내 팀으로 시작」인 이유 —
 *   로그인해도 샘플 팀은 여전히 남의 팀이다. 배너의 버튼이 같은 말을 한다 (`demo-banner.tsx`).
 * ⚠ 게스트에게 **보이는 코드**만 여기 둔다. 줄을 늘리기 전에 그 코드가 게스트에게
 *   실제로 오는지 먼저 봐라 — 안 오는 코드의 문구는 아무도 못 보는 문장이다.
 */
export const GUEST_HINT: Partial<Record<ErrorCode, string>> = {
  FORBIDDEN: '읽기 전용으로 둘러보는 중입니다. 바꾸려면 내 팀으로 시작해야 합니다.',
}

/**
 * 코드 → 문구를 **주체 종류**에 따라 고른다. 두 표(`ERROR_HINT` · `GUEST_HINT`)를 읽는 자리는 여기 하나다.
 * 게스트가 아니면 `GUEST_HINT` 는 안 본다 — member 의 403 은 여전히 「owner 만」이 맞다.
 */
export function hintText(code: ErrorCode, actor: ActorKind): string {
  return (actor === 'guest' ? GUEST_HINT[code] : undefined) ?? ERROR_HINT[code]
}

/**
 * 🔴 **서버가 `details.code` 로 덧붙인 원인 → 화면 문장** (INBOX G12 · 2026-09-09).
 *
 * ★ 왜 있나 — 승인 0개로 발행하면 서버는 `VALIDATION_FAILED` + `details.code:'EMPTY_SNAPSHOT'` 을 낸다
 *   (`lib/api/publish.ts` 의 `COMPILE_ERROR_FAULT`). 코드 하나에 문구 하나인 `ERROR_HINT` 는 그것을
 *   「입력한 내용을 다시 확인해주세요」로 뭉갰고, 사람은 **입력을 고치러 갔다** — 정답은 「Context 에서
 *   초안을 승인하라」다. 코드를 하나 더 파지 않는다 (`VALIDATION_FAILED` 갈래를 늘리면 표가 는다 · `ERROR_STATUS`
 *   주석) — 원인은 이미 `details` 에 있으니 **그것을 읽는 표**를 둔다.
 * ★ 키는 컴파일러의 `CompileErrorCode` 다 — 서버가 `err.code` 를 그대로 싣기 때문에 같은 열거를 쓴다.
 *   `null` 인 줄(서버 잘못 · 500)은 여기 오지 않으므로 적지 않는다.
 * ⚠ 게스트 문구(`GUEST_HINT`)보다 **뒤**다 — 게스트는 애초에 발행 문을 못 지난다 (`writeDoor`).
 */
export type ReasonCode = CompileErrorCode | LimitReason

export const REASON_HINT: Partial<Record<ReasonCode, string>> = {
  EMPTY_SNAPSHOT: '승인된 항목이 하나도 없습니다. Context 에서 초안을 승인한 뒤에 발행해주세요.',
  //  상한 둘 — 숫자는 서버와 같은 표(`CREATION_LIMITS`)에서 온다 (INBOX H11). 여기 숫자를 적지 않는다.
  TEAM_LIMIT: `팀은 계정당 ${CREATION_LIMITS.TEAM_LIMIT.max}개까지 만들 수 있습니다. 기존 팀에 프로젝트를 더해주세요.`,
  PROJECT_LIMIT: `프로젝트는 팀당 ${CREATION_LIMITS.PROJECT_LIMIT.max}개까지 만들 수 있습니다. 새 팀을 만들거나 기존 프로젝트를 써주세요.`,
}

/** 실패 봉투의 `details.code` — 아는 원인이면 그 코드, 아니면 `undefined`. 지어내지 않는다. */
export function reasonOf(details: unknown): ReasonCode | undefined {
  const code = (details as { code?: unknown } | null | undefined)?.code
  return typeof code === 'string' && Object.hasOwn(REASON_HINT, code) ? (code as ReasonCode) : undefined
}

/** 서버가 낸 실패 봉투를 그대로 들고 다닌다 — 화면이 `code` 로 갈래를 탄다. */
export class ApiClientError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details: unknown
  readonly requestId: string | undefined

  /**
   * @param actor 이 응답을 받은 **주체 종류** — 문구를 고르는 데만 쓴다 (`GUEST_HINT`).
   *   `raise()` 가 세션에서 읽어 넣는다. 시험은 손으로 넣는다.
   */
  constructor(code: ErrorCode, status: number, details?: unknown, requestId?: string, actor: ActorKind = 'user') {
    //  원인이 `details` 에 적혀 있으면 그 문장이 코드의 일반 문장보다 먼저다 (`REASON_HINT` · INBOX G12).
    const reason = reasonOf(details)
    super(reason === undefined ? hintText(code, actor) : REASON_HINT[reason] ?? hintText(code, actor))
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
    this.requestId = requestId
  }
}

const API = '/api/v1'

export function isErrorCode(value: unknown): value is ErrorCode {
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
  //  ⚠ 종류는 세션을 지우기 **전에** 읽는다 — 지운 뒤엔 누구였는지 모른다.
  const actor = actorKindOf(readSession())
  if (code === 'UNAUTHORIZED') clearSession()
  throw new ApiClientError(code, res.status, details, requestId, actor)
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

/**
 * 파일로 저장할 응답 (`application/zip`). 봉투가 아니다 — `apiText` 와 같은 이유다.
 * ★ 파일 이름은 **서버가** 정한다 (`content-disposition`). 화면이 지어내면 같은 zip 이
 *   화면마다 다른 이름으로 저장된다. 머리가 없으면 `undefined` 를 그대로 돌려준다 —
 *   부르는 쪽이 「이름을 모른다」를 알고 고르게.
 */
export async function apiBlob(path: string): Promise<{ blob: Blob; filename: string | undefined }> {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() })
  if (!res.ok) await raise(res)
  const disposition = res.headers.get('content-disposition') ?? ''
  const match = /filename="([^"]+)"/.exec(disposition)
  return { blob: await res.blob(), filename: match?.[1] }
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
