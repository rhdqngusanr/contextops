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
//
//  🔴 이메일 매직링크는 **플래그 뒤**에 있다 (2026-09-09 · INBOX 블로커 3). Supabase 의 기본
//     SMTP 는 프로젝트 팀 멤버 주소로만 보내고 시간당 몇 통이라, 심사위원이 그 문을 누르면
//     「✓ 메일을 보냈습니다」 뒤에 아무것도 오지 않는다. 커스텀 SMTP 를 붙이기 전에는 문을
//     닫아 두고 `/demo` 를 안내한다 — 눌러도 아무 일 없는 문은 「고장」으로 읽힌다.
// =====================================================================

export type AuthConfig = {
  url: string
  anonKey: string
  /** 이메일 매직링크 문을 그리나 — `NEXT_PUBLIC_AUTH_EMAIL_LOGIN=1` 일 때만 (커스텀 SMTP 가 있을 때) */
  emailLogin: boolean
}

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
  return {
    url: url.replace(/\/+$/, ''),
    anonKey,
    emailLogin: process.env.NEXT_PUBLIC_AUTH_EMAIL_LOGIN === '1',
  }
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
 * 🔴 심사위원·투표자가 GitHub 계정이 없을 때 보내는 곳 — 로그인 없이 같은 앱을 본다.
 * ⚠ 주소는 랜딩과 같은 `/demo` 하나다. 게스트 세션을 받는 자리가 둘이 되면 안 된다.
 */
export const NO_ACCOUNT_HINT = {
  text: 'GitHub 계정이 없거나 심사위원이신가요?',
  link: '샘플 팀으로 둘러보기',
  href: '/demo',
} as const

/**
 * 이메일 매직 링크. 성공해도 세션은 **아직 없다** — 메일을 열어야 ①③ 이 일어난다.
 * ⚠ 응답 본문을 화면에 그대로 띄우지 마라. Supabase 의 오류 문구는 「그 이메일이
 *   가입돼 있는가」를 흘린다.
 * ⚠ 실패의 가장 흔한 이유는 사용자의 오타가 아니라 **기본 SMTP 의 수신자 제한**이다 —
 *   그래서 문구가 「주소를 다시 확인하라」가 아니라 「이 주소로는 보낼 수 없다」다.
 */
export const MAGIC_LINK_FAILED = `이 주소로는 메일을 보낼 수 없습니다. 심사위원이시면 ${NO_ACCOUNT_HINT.link}(${NO_ACCOUNT_HINT.href})를 쓰세요.`

export async function sendMagicLink(config: AuthConfig, email: string, next: string): Promise<void> {
  const res = await fetch(`${config.url}/auth/v1/otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: config.anonKey },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: callbackUrl(next) } }),
  })
  if (!res.ok) throw new Error(MAGIC_LINK_FAILED)
}

export type CallbackResult =
  | { ok: true; access_token: string; expires_at: number }
  /** `code` 는 Supabase 가 조각에 실어 준 `error_code`(없으면 `error`) — 화면이 mono 로 보여 준다 */
  | { ok: false; message: string; code?: string }

/**
 * ③ URL 조각을 세션으로 바꾼다. **여기만 조각을 읽는다.**
 *
 * ⚠ `expires_in`(초)을 받아서 `expires_at`(epoch 초)로 바꾼다 — 저장하는 값은
 *   「언제까지」여야 한다. 「몇 초 남았다」를 저장하면 새로고침마다 다시 살아난다.
 * ⚠ 실패의 **원인 코드**는 남긴다 (예: `validation_failed` = 공급자가 꺼져 있다 ·
 *   `access_denied` = 사람이 GitHub 에서 취소했다). 「다시 시도해주세요」만으로는 운영자가
 *   무엇을 고칠지 모른다 (2026-09-09 실측: 공급자가 꺼진 채 이 문구만 보였다).
 */
export function readCallbackHash(hash: string, now: Date): CallbackResult {
  const q = new URLSearchParams(hash.replace(/^#/, ''))
  const error = q.get('error_description') ?? q.get('error')
  if (error) {
    return {
      ok: false,
      message: '로그인이 완료되지 않았습니다. 다시 시도해주세요.',
      code: q.get('error_code') ?? q.get('error') ?? undefined,
    }
  }

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
