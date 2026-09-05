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

/**
 * 🔴 **세션을 우리가 서명해서 내준다** — 부르는 자리는 **둘**뿐이다.
 *
 *   ① `POST /demo/session` — 게스트 세션 (SPEC §9 「게스트 데모」). claims 는 `sub` 하나다.
 *   ② 데모 리셋(`lib/demo/seed*.ts`) — 시드가 **라우트를 진짜로 부르기 위한** 팀장·팀원의
 *      세션. 이름·이메일을 claims 에 싣는다 (`sessionActor` 가 로그인 때마다 `users.name`
 *      을 claims 로 덮으므로, 이름의 정본이 claims 를 타야 한다 — `seed-demo.ts` 의 주석).
 *      원래 시험 도우미(`test/helpers/db.ts` 의 `sessionJwt`)가 시험용 secret 으로 하던
 *      일이다. 시드가 제품 코드가 되면서 **둘째 사용자**가 생겨 여기로 올렸다.
 *
 * ★ 왜 같은 secret 인가 — 세션을 확인하는 자리를 하나로 두기 위해서다.
 *   둘째 secret 을 두면 `verifySessionJwt` 가 두 갈래가 되고, 그 갈래 중 하나만
 *   `alg`·`exp` 를 검사하는 날이 온다. 게스트 토큰이 진짜 사람의 것과 섞이지 않는 이유는
 *   secret 이 달라서가 아니라 **`sub` 가 우리 `users` 표에만 있는 값**이라서다
 *   (`lib/demo/tenant.ts` 의 `DEMO_GUEST_SUBJECT`).
 *
 * ⚠ 게스트에는 `email` 을 싣지 않는다. 없는 것을 지어내면 그 문자열이 `users` 행에
 *   그대로 앉는다 (P1 과 같은 결의 이야기다). 시드가 싣는 이메일은 `.invalid` 도메인이다.
 * ⚠ 셋째 자리를 만들지 마라 — 서명 함수가 여기저기서 불리면 「누가 세션을 만들 수 있나」가
 *   코드 전체로 흩어진다. 위 둘 다 **서버가 자기 자신을 위해** 만드는 세션이고, 둘 다
 *   사람의 브라우저로 나가는 것은 ① 뿐이다.
 */
export function signSessionJwt(claims: SessionClaims, now: Date, ttlSec: number): { token: string; expiresAt: number } {
  const secret = process.env[SECRET_ENV]
  if (!secret) fail('INTERNAL', `${SECRET_ENV} 가 없다 — 세션을 만들 수 없다`)

  const exp = Math.floor(now.getTime() / 1000) + ttlSec
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  //  ⚠ 없는 칸은 **안 적는다.** `email: undefined` 를 JSON 이 빼 주긴 하지만, 그걸 믿고 두면
  //    「게스트 토큰에 email 이 없다」가 우연이 된다.
  const body = Buffer.from(JSON.stringify({
    sub: claims.sub,
    ...(claims.email === undefined ? {} : { email: claims.email }),
    ...(claims.name === undefined ? {} : { name: claims.name }),
    exp,
  })).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
  return { token: `${head}.${body}.${sig}`, expiresAt: exp }
}
