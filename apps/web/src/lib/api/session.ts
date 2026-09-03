import { createHmac, timingSafeEqual } from 'node:crypto'
import { fail } from './error'

// =====================================================================
//  웹 세션 = Supabase 가 발급한 JWT (SPEC §5 「인증은 (a) 웹 세션(Supabase JWT)」)
//
//  ★ 왜 직접 검증하나 — Supabase Auth 는 HS256 으로 서명한 access_token 을 준다.
//    그걸 확인하는 데 필요한 것은 프로젝트의 JWT secret 하나뿐이고, SDK 를 얹으면
//    「우리 서버가 무엇을 믿는가」가 남의 코드 안으로 숨는다. 여기서는 20줄이고
//    **무엇을 검사하는지 눈으로 읽을 수 있다.**
//
//  ⚠ 검사하는 것은 셋이다: 서명 · `exp` · `sub` 존재. 하나라도 없으면 401 이다.
//    `aud`·`iss` 는 Supabase 프로젝트가 생긴 뒤에 더한다 (🙋 사람 · docs/STATUS.md).
// =====================================================================

/** JWT 의 `sub` = Supabase Auth 의 subject → `users.auth_subject`. */
export type SessionClaims = {
  sub: string
  email?: string
  name?: string
}

const SECRET_ENV = 'SUPABASE_JWT_SECRET'

function b64urlToBuffer(part: string): Buffer {
  return Buffer.from(part, 'base64url')
}

/**
 * 토큰이 우리 프로젝트의 secret 으로 서명됐는지 확인하고 claims 를 돌려준다.
 * `now` 를 인자로 받는다 — 시각을 인자로 받아야 만료를 시험할 수 있다.
 */
export function verifySessionJwt(token: string, now: Date): SessionClaims {
  const secret = process.env[SECRET_ENV]
  //  🔴 secret 이 없으면 **아무도 로그인하지 못한다.** 조용히 통과시키면
  //     그 배포는 서명 없는 토큰을 받는 서버가 된다.
  if (!secret) fail('UNAUTHORIZED', `${SECRET_ENV} 가 없다 — 세션을 확인할 수 없다`)

  const parts = token.split('.')
  if (parts.length !== 3) fail('UNAUTHORIZED', '세션 토큰의 형식이 아니다')
  const [head, body, sig] = parts as [string, string, string]

  let header: { alg?: string }
  let claims: Record<string, unknown>
  try {
    header = JSON.parse(b64urlToBuffer(head).toString('utf8')) as { alg?: string }
    claims = JSON.parse(b64urlToBuffer(body).toString('utf8')) as Record<string, unknown>
  } catch {
    fail('UNAUTHORIZED', '세션 토큰을 읽을 수 없다')
  }

  //  ⚠ alg 를 확인하지 않으면 `alg:none` 토큰이 통과한다 — JWT 의 대표적인 구멍이다.
  if (header.alg !== 'HS256') fail('UNAUTHORIZED', '지원하지 않는 서명 방식이다')

  const expected = createHmac('sha256', secret).update(`${head}.${body}`).digest()
  const actual = b64urlToBuffer(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    fail('UNAUTHORIZED', '세션 서명이 맞지 않는다')
  }

  const exp = claims.exp
  if (typeof exp !== 'number' || exp * 1000 <= now.getTime()) fail('UNAUTHORIZED', '세션이 만료됐다')

  const sub = claims.sub
  if (typeof sub !== 'string' || sub.length === 0) fail('UNAUTHORIZED', '세션에 sub 가 없다')

  return {
    sub,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
  }
}
