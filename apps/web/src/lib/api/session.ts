import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
  type JsonWebKey,
} from 'node:crypto'
import { fail } from './error'

// =====================================================================
//  웹 세션 = Supabase 가 발급한 JWT (SPEC §5 「인증은 (a) 웹 세션(Supabase JWT)」)
//
//  ★ 왜 직접 검증하나 — 필요한 것은 「어느 키로 서명됐나」를 확인하는 것뿐이고, SDK 를 얹으면
//    「우리 서버가 무엇을 믿는가」가 남의 코드 안으로 숨는다. 여기서는 몇십 줄이고
//    **무엇을 검사하는지 눈으로 읽을 수 있다.**
//
//  🔴 서명 방식은 **표 하나**(`VERIFIERS`)다 (2026-09-09 · INBOX 블로커 3).
//     · `HS256` — 프로젝트의 JWT secret(`SUPABASE_JWT_SECRET`). 옛 Supabase 프로젝트와
//       **우리 자신이 서명하는 세션**(게스트 · 시드 · `signSessionJwt`)이 이 갈래다.
//     · `ES256` — 새 Supabase 프로젝트의 비대칭 서명키. 공개키는 프로젝트의 JWKS
//       (`<NEXT_PUBLIC_SUPABASE_URL>/auth/v1/.well-known/jwks.json`)에서 `kid` 로 고른다.
//       2026-09-09 실측: 이 프로젝트의 JWKS 는 ES256 키 하나뿐이었고, HS256 만 받던 검증기로는
//       진짜 로그인 토큰이 전부 401 이었다 — 「로그인은 됐는데 모든 화면이 로그인하러 가기」 고리.
//     ⚠ 표에 없는 alg(`none` 포함)는 401 이다. 헤더의 alg 를 **믿지 않고** 표에서 고른 검증기가
//       자기 키 종류로만 확인한다 — alg 혼동 공격(공개키를 HMAC secret 으로 쓰기)이 안 되는 이유다.
//
//  ⚠ 검사하는 것은 여섯이다: 서명 · `exp` · `sub` · `aud`(= authenticated) · `iss`(우리 프로젝트
//    또는 우리 자신) · alg 가 표에 있음. 하나라도 어긋나면 401 이다.
//  ⚠ 여기서 네트워크를 타는 것은 JWKS 하나뿐이고 1시간 캐시한다 (`globalThis` — Next dev 는
//    라우트마다 모듈을 다시 평가한다 · FINDINGS 127 과 같은 이유).
// =====================================================================

/** JWT 의 `sub` = Supabase Auth 의 subject → `users.auth_subject`. */
export type SessionClaims = {
  sub: string
  email?: string
  name?: string
}

const SECRET_ENV = 'SUPABASE_JWT_SECRET'
const URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL'

/** Supabase 가 access_token 에 넣는 `aud`. 우리 자신이 서명하는 세션도 같은 값을 쓴다 — 검사가 한 갈래다. */
export const SESSION_AUDIENCE = 'authenticated'
/** `signSessionJwt` 가 쓰는 `iss`. Supabase 의 `iss` 는 `<url>/auth/v1` 이다. */
export const SELF_ISSUER = 'contextops'
/** JWKS 캐시 수명. 키 회전은 드물고, `kid` 가 캐시에 없으면 한 번 다시 받는다. */
const JWKS_TTL_MS = 60 * 60 * 1000
/** `kid` 가 없을 때 다시 받는 최소 간격 — 모르는 kid 로 두드려 JWKS 를 매번 받게 하지 못하게. */
const JWKS_REFETCH_MIN_MS = 60 * 1000

type JwtHeader = { alg?: string; kid?: string }
type Jwk = JsonWebKey & { kid?: string; alg?: string }
export type Jwks = { keys: Jwk[] }
type JwksFetcher = (url: string) => Promise<Jwks>

type Verifier = (signed: string, sig: Buffer, header: JwtHeader) => Promise<void>

function b64urlToBuffer(part: string): Buffer {
  return Buffer.from(part, 'base64url')
}

// ---------------------------------------------------------------------
//  서명 방식 표
//  ★ 방식을 하나 더하는 절차: ① 아래 함수 하나 ② 이 표에 한 줄 ③ `test/session-jwt.test.ts` 에
//    통과 1 · 실패 1. 표 밖에서 alg 를 비교하는 코드를 만들지 마라.
// ---------------------------------------------------------------------

async function verifyHs256(signed: string, sig: Buffer): Promise<void> {
  const secret = process.env[SECRET_ENV]
  //  🔴 secret 이 없으면 **HS256 세션은 아무것도 통과하지 못한다.** 조용히 통과시키면
  //     그 배포는 서명 없는 토큰을 받는 서버가 된다.
  if (!secret) fail('UNAUTHORIZED', `${SECRET_ENV} 가 없다 — 세션을 확인할 수 없다`)
  const expected = createHmac('sha256', secret).update(signed).digest()
  if (expected.length !== sig.length || !timingSafeEqual(expected, sig)) {
    fail('UNAUTHORIZED', '세션 서명이 맞지 않는다')
  }
}

async function verifyEs256(signed: string, sig: Buffer, header: JwtHeader): Promise<void> {
  const jwk = await jwkFor(header.kid)
  const key = createPublicKey({ key: jwk, format: 'jwk' })
  //  ⚠ JOSE 서명은 r‖s 64바이트다 — DER 이 아니라 `ieee-p1363` 로 읽어야 한다.
  const ok = verifySignature('sha256', Buffer.from(signed, 'utf8'), { key, dsaEncoding: 'ieee-p1363' }, sig)
  if (!ok) fail('UNAUTHORIZED', '세션 서명이 맞지 않는다')
}

const VERIFIERS = {
  HS256: verifyHs256,
  ES256: verifyEs256,
} as const satisfies Record<string, Verifier>

/** 표의 이름 — 배포 검증기(`e2e/production.ts`)가 프로젝트 JWKS 의 alg 와 대조한다. */
export const VERIFIER_ALGS: readonly string[] = Object.keys(VERIFIERS)

function isKnownAlg(alg: string | undefined): alg is keyof typeof VERIFIERS {
  return alg !== undefined && Object.prototype.hasOwnProperty.call(VERIFIERS, alg)
}

// ---------------------------------------------------------------------
//  JWKS — 프로세스에 하나 (Next dev 의 모듈 재평가를 넘어서 `globalThis` 에 둔다)
// ---------------------------------------------------------------------

type JwksCache = { url: string; fetchedAt: number; keys: Jwk[] }
const JWKS_SLOT = Symbol.for('contextops.jwks')
const FETCHER_SLOT = Symbol.for('contextops.jwksFetcher')
type Slots = { [JWKS_SLOT]?: JwksCache; [FETCHER_SLOT]?: JwksFetcher }

async function defaultFetcher(url: string): Promise<Jwks> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`JWKS ${res.status}`)
  return (await res.json()) as Jwks
}

/** Supabase 프로젝트의 발급자 주소 — `iss` 와 JWKS 의 뿌리. env 가 없으면 `undefined`. */
export function supabaseIssuer(): string | undefined {
  const url = process.env[URL_ENV]
  return url ? `${url.replace(/\/+$/, '')}/auth/v1` : undefined
}

async function jwkFor(kid: string | undefined): Promise<Jwk> {
  const issuer = supabaseIssuer()
  if (!issuer) fail('UNAUTHORIZED', `${URL_ENV} 가 없다 — ES256 세션의 공개키를 받을 곳을 모른다`)
  const url = `${issuer}/.well-known/jwks.json`
  const slots = globalThis as unknown as Slots
  const fetcher = slots[FETCHER_SLOT] ?? defaultFetcher

  const pick = (cache: JwksCache | undefined): Jwk | undefined =>
    cache?.url === url ? cache.keys.find((k) => k.kid === kid) : undefined

  let cache = slots[JWKS_SLOT]
  const now = Date.now()
  const stale = cache === undefined || cache.url !== url || now - cache.fetchedAt > JWKS_TTL_MS
  const missing = pick(cache) === undefined && (cache === undefined || now - cache.fetchedAt > JWKS_REFETCH_MIN_MS)
  if (stale || missing) {
    let jwks: Jwks
    try {
      jwks = await fetcher(url)
    } catch (err) {
      //  ⚠ 받지 못하면 401 이다 — 500 으로 내면 「서버가 터졌다」로 읽히고 재시도가 몰린다.
      fail('UNAUTHORIZED', `JWKS 를 받지 못했다 (${err instanceof Error ? err.message : String(err)})`)
    }
    cache = { url, fetchedAt: now, keys: Array.isArray(jwks.keys) ? jwks.keys : [] }
    slots[JWKS_SLOT] = cache
  }
  const jwk = pick(cache)
  if (!jwk) fail('UNAUTHORIZED', '세션의 서명키(kid)를 프로젝트 JWKS 에서 찾지 못했다')
  return jwk
}

/** 시험이 JWKS 를 꽂는 문. `undefined` 면 진짜 fetch 로 돌아가고 캐시도 비운다. */
export function setJwksFetcherForTest(fetcher: JwksFetcher | undefined): void {
  const slots = globalThis as unknown as Slots
  slots[FETCHER_SLOT] = fetcher
  delete slots[JWKS_SLOT]
}

// ---------------------------------------------------------------------
//  검증
// ---------------------------------------------------------------------

/**
 * 토큰이 우리 프로젝트의 키로 서명됐는지 확인하고 claims 를 돌려준다.
 * `now` 를 인자로 받는다 — 시각을 인자로 받아야 만료를 시험할 수 있다.
 */
export async function verifySessionJwt(token: string, now: Date): Promise<SessionClaims> {
  const parts = token.split('.')
  if (parts.length !== 3) fail('UNAUTHORIZED', '세션 토큰의 형식이 아니다')
  const [head, body, sig] = parts as [string, string, string]

  let header: JwtHeader
  let claims: Record<string, unknown>
  try {
    header = JSON.parse(b64urlToBuffer(head).toString('utf8')) as JwtHeader
    claims = JSON.parse(b64urlToBuffer(body).toString('utf8')) as Record<string, unknown>
  } catch {
    fail('UNAUTHORIZED', '세션 토큰을 읽을 수 없다')
  }

  //  ⚠ alg 를 확인하지 않으면 `alg:none` 토큰이 통과한다 — JWT 의 대표적인 구멍이다.
  //    표에서 고른 검증기는 자기 키 종류로만 확인하므로, 헤더가 무엇이라 말하든 그 이상은 못 한다.
  if (!isKnownAlg(header.alg)) fail('UNAUTHORIZED', '지원하지 않는 서명 방식이다')
  await VERIFIERS[header.alg](`${head}.${body}`, b64urlToBuffer(sig), header)

  const exp = claims.exp
  if (typeof exp !== 'number' || exp * 1000 <= now.getTime()) fail('UNAUTHORIZED', '세션이 만료됐다')

  //  🔴 `aud`·`iss` — 다른 Supabase 프로젝트나 다른 용도의 토큰(예: 같은 키로 서명된 다른 앱의 것)이
  //     여기 세션으로 앉지 못하게 한다. 우리 자신의 세션은 `SELF_ISSUER` 다.
  const aud = claims.aud
  const audOk = Array.isArray(aud) ? aud.includes(SESSION_AUDIENCE) : aud === SESSION_AUDIENCE
  if (!audOk) fail('UNAUTHORIZED', '세션의 aud 가 다르다')
  const allowedIssuers = [SELF_ISSUER, supabaseIssuer()].filter((v): v is string => v !== undefined)
  if (typeof claims.iss !== 'string' || !allowedIssuers.includes(claims.iss)) {
    fail('UNAUTHORIZED', '세션의 iss 가 우리 프로젝트가 아니다')
  }

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
 * ★ 왜 같은 secret 인가 — 세션을 확인하는 자리를 하나로 두기 위해서다. 검증은 위 표의
 *   HS256 갈래 그대로이고, `aud`·`iss` 도 같은 검사를 지난다(`iss` 만 `SELF_ISSUER`).
 *   게스트 토큰이 진짜 사람의 것과 섞이지 않는 이유는 secret 이 달라서가 아니라
 *   **`sub` 가 우리 `users` 표에만 있는 값**이라서다 (`lib/demo/tenant.ts` 의 `DEMO_GUEST_SUBJECT`).
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
    aud: SESSION_AUDIENCE,
    iss: SELF_ISSUER,
    exp,
  })).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
  return { token: `${head}.${body}.${sig}`, expiresAt: exp }
}
