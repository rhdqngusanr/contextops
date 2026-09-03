// =====================================================================
//  브라우저가 들고 있는 세션 하나 (SPEC §5 「인증은 (a) 웹 세션(Supabase JWT)」)
//
//  ★ 왜 파일 하나인가 — 저장 자리가 둘이 되면 로그아웃이 한쪽만 지운다.
//    그러면 「로그아웃했는데 다음 탭에서 아직 들어가진다」가 된다.
//    **읽기·쓰기·지우기는 여기서만.** 화면은 localStorage 를 직접 만지지 않는다.
//
//  🔴 이 값을 로그·에러 메시지·URL 에 넣지 마라 (SPEC §11). 토큰이 남는 자리는
//     전부 「받아서 안 쓴다」가 아니라 「이미 받은 것」이다.
//
//  ⚠ 서버에서 부르면 `null` 이다 — `window` 가 없다. 화면은 전부 클라이언트
//    컴포넌트라 마운트 이후에만 부른다.
// =====================================================================

const KEY = 'contextops.session'

export type WebSession = {
  access_token: string
  /** epoch 초. Supabase 의 `expires_at` 과 같은 단위다. */
  expires_at: number
  email?: string
}

function storage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    //  쿠키·저장소가 막힌 브라우저(시크릿 모드의 일부 설정)에서도 화면이 죽지 않게.
    return undefined
  }
}

/** 살아 있는 세션만 돌려준다 — 만료된 것은 없는 것과 같다. */
export function readSession(): WebSession | null {
  const raw = storage()?.getItem(KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<WebSession>
    if (typeof value.access_token !== 'string' || typeof value.expires_at !== 'number') return null
    if (value.expires_at * 1000 <= Date.now()) {
      //  ⚠ 만료된 토큰을 남겨 두면 화면이 401 을 받고 「서버가 이상하다」로 읽힌다.
      clearSession()
      return null
    }
    return { access_token: value.access_token, expires_at: value.expires_at, email: value.email }
  } catch {
    return null
  }
}

export function writeSession(session: WebSession): void {
  storage()?.setItem(KEY, JSON.stringify(session))
}

export function clearSession(): void {
  storage()?.removeItem(KEY)
}
