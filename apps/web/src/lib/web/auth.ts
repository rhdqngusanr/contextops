// =====================================================================
//  로그인 — Supabase Auth 를 **HTTP 로 직접** 부른다 (SPEC §5 인증 (a) · §9 화면 2)
//
//  ★ 왜 SDK 를 안 쓰나 — 서버쪽 `lib/api/session.ts` 가 JWT 를 손으로 검증하는 것과
//    같은 이유다: 우리가 무엇을 믿고 무엇을 저장하는지가 **눈에 보여야** 한다.
//    필요한 것은 두 번의 요청뿐이고, SDK 를 얹으면 세션 저장 자리가 하나 더 생겨서
//    `session.ts` 와 갈라진다.
//
//  ★ 흐름 (Supabase 의 implicit flow):
//    ① `/auth/v1/authorize?provider=github&redirect_to=…/auth/callback` 로 **이동**
//    ② 돌아올 때 토큰이 **URL 조각(`#`)** 에 실려 온다 — 조각은 서버로 안 간다
//    ③ `/auth/callback` 이 그걸 `session.ts` 에 저장하고 조각을 지운다
//
//  🔴 설정이 없으면 **조용히 되는 척하지 않는다.** `authConfig()` 가 `null` 이고
//     화면은 「아직 연결되지 않았다」를 그대로 보여 준다 (DESIGN_BRIEF §2-5).
// =====================================================================

export type AuthConfig = { url: string; anonKey: string }

/** 로그인 제공자 — 화면 2 의 버튼과 1:1 이다. 늘리려면 여기 한 줄 + 버튼 한 줄. */
export const OAUTH_PROVIDERS = ['github'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

/**
 * ⚠ `process.env.NEXT_PUBLIC_*` 는 빌드 시점에 **문자열로 박힌다.** 변수로 감싸서
 *   읽으면 Next 가 못 알아보고 `undefined` 가 된다 — 반드시 이 모양 그대로 적는다.
 */
export function authConfig(): AuthConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url: url.replace(/\/+$/, ''), anonKey }
}

/** 로그인 뒤 돌아올 자리. `next` 는 원래 가려던 화면이다. */
export function callbackUrl(next: string): string {
  const cb = new URL('/auth/callback', window.location.origin)
  cb.searchParams.set('next', next)
  return cb.toString()
}

/** ① OAuth 는 **이동**이다 — fetch 로는 못 한다 (제공자 화면을 사람이 봐야 한다). */
export function oauthUrl(config: AuthConfig, provider: OAuthProvider, next: string): string {
  const u = new URL(`${config.url}/auth/v1/authorize`)
  u.searchParams.set('provider', provider)
  u.searchParams.set('redirect_to', callbackUrl(next))
  return u.toString()
}

/**
 * 이메일 매직 링크. 성공해도 세션은 **아직 없다** — 메일을 열어야 ①③ 이 일어난다.
 * ⚠ 응답 본문을 화면에 그대로 띄우지 마라. Supabase 의 오류 문구는 「그 이메일이
 *   가입돼 있는가」를 흘린다.
 */
export async function sendMagicLink(config: AuthConfig, email: string, next: string): Promise<void> {
  const res = await fetch(`${config.url}/auth/v1/otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: config.anonKey },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: callbackUrl(next) } }),
  })
  if (!res.ok) throw new Error('메일을 보내지 못했습니다. 주소를 다시 확인해주세요.')
}

export type CallbackResult =
  | { ok: true; access_token: string; expires_at: number }
  | { ok: false; message: string }

/**
 * ③ URL 조각을 세션으로 바꾼다. **여기만 조각을 읽는다.**
 *
 * ⚠ `expires_in`(초)을 받아서 `expires_at`(epoch 초)로 바꾼다 — 저장하는 값은
 *   「언제까지」여야 한다. 「몇 초 남았다」를 저장하면 새로고침마다 다시 살아난다.
 */
export function readCallbackHash(hash: string, now: Date): CallbackResult {
  const q = new URLSearchParams(hash.replace(/^#/, ''))
  const error = q.get('error_description') ?? q.get('error')
  if (error) return { ok: false, message: '로그인이 완료되지 않았습니다. 다시 시도해주세요.' }

  const token = q.get('access_token')
  if (!token) return { ok: false, message: '로그인 정보를 찾을 수 없습니다. 다시 시도해주세요.' }

  const expiresIn = Number(q.get('expires_in') ?? '3600')
  const expiresAt = Number(q.get('expires_at') ?? '0')
  return {
    ok: true,
    access_token: token,
    expires_at: expiresAt > 0 ? expiresAt : Math.floor(now.getTime() / 1000) + expiresIn,
  }
}
