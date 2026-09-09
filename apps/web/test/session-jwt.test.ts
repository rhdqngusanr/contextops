import { createHmac, generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  SELF_ISSUER,
  SESSION_AUDIENCE,
  VERIFIER_ALGS,
  setJwksFetcherForTest,
  signSessionJwt,
  verifySessionJwt,
} from '../src/lib/api/session'
import { TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  세션 검증기의 서명 방식 표 (`lib/api/session.ts` · INBOX 블로커 3 · 2026-09-09)
//
//  ★ 왜 이 파일이 생겼나 — 실제 Supabase 프로젝트의 JWKS 는 ES256 키 하나였는데 검증기는
//    HS256 만 받았다. 「로그인은 됐는데 모든 화면이 로그인하러 가기」 고리를 배포 첫날에야
//    보게 될 고장이었다. 표에 갈래를 더했으니 **통과 하나 · 실패 하나씩** 잠근다.
//
//  재는 것:
//    ① HS256 — secret 으로 통과 · secret 없으면 401 · 서명 틀리면 401
//    ② ES256 — 프로젝트 JWKS 의 공개키로 통과 · kid 가 없으면 401 · 다른 키의 서명은 401
//    ③ 표 밖 alg(none) 은 401 — 헤더가 무엇이라 말하든
//    ④ aud·iss — Supabase 발급자와 우리 자신만 통과 · 다른 프로젝트의 iss 는 401
//    ⑤ `signSessionJwt` 가 낸 토큰은 같은 검증을 지난다 (게스트·시드 세션)
// =====================================================================

const NOW = new Date('2026-09-09T12:00:00Z')
const SUPABASE_URL = 'https://test-project.supabase.co'

const b64 = (v: string | Buffer): string => Buffer.from(v).toString('base64url')

function hs256(claims: Record<string, unknown>, secret = TEST_JWT_SECRET): string {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64(JSON.stringify(claims))
  return `${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`
}

/** ES256 키쌍 하나 — Supabase 가 JWKS 로 내는 것과 같은 모양(`kid` · `alg`)으로 공개키를 낸다. */
function es256Pair(kid: string) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'ES256', use: 'sig' }
  const signer = (claims: Record<string, unknown>, headerKid = kid): string => {
    const head = b64(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: headerKid }))
    const body = b64(JSON.stringify(claims))
    const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key: privateKey, dsaEncoding: 'ieee-p1363' })
    return `${head}.${body}.${b64(sig)}`
  }
  return { jwk, signer }
}

const claimsOk = (over: Record<string, unknown> = {}) => ({
  sub: 'user-1',
  email: 'user-1@example.test',
  aud: SESSION_AUDIENCE,
  iss: `${SUPABASE_URL}/auth/v1`,
  exp: Math.floor(NOW.getTime() / 1000) + 3600,
  ...over,
})

beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
})

afterEach(() => {
  setJwksFetcherForTest(undefined)
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
})

const rejects = (token: string) => expect(verifySessionJwt(token, NOW)).rejects.toMatchObject({ status: 401 })

describe('① HS256 — 프로젝트 secret', () => {
  it('secret 으로 서명된 토큰이 통과한다', async () => {
    await expect(verifySessionJwt(hs256(claimsOk()), NOW)).resolves.toEqual({
      sub: 'user-1', email: 'user-1@example.test', name: undefined,
    })
  })
  it('secret 이 없으면 401 이다 — 조용히 통과시키지 않는다', async () => {
    delete process.env.SUPABASE_JWT_SECRET
    await rejects(hs256(claimsOk()))
  })
  it('다른 secret 의 서명은 401 이다', async () => {
    await rejects(hs256(claimsOk(), 'not-our-secret'))
  })
})

describe('② ES256 — 프로젝트 JWKS', () => {
  it('JWKS 의 공개키로 서명이 확인되면 통과한다 · 표에 ES256 이 있다', async () => {
    expect(VERIFIER_ALGS).toContain('ES256')
    const { jwk, signer } = es256Pair('kid-1')
    let fetched = 0
    setJwksFetcherForTest(async () => { fetched++; return { keys: [jwk] } })
    await expect(verifySessionJwt(signer(claimsOk()), NOW)).resolves.toMatchObject({ sub: 'user-1' })
    //  캐시 — 두 번째는 JWKS 를 다시 받지 않는다
    await expect(verifySessionJwt(signer(claimsOk()), NOW)).resolves.toMatchObject({ sub: 'user-1' })
    expect(fetched).toBe(1)
  })
  it('kid 가 JWKS 에 없으면 401 이다', async () => {
    const { jwk, signer } = es256Pair('kid-1')
    setJwksFetcherForTest(async () => ({ keys: [jwk] }))
    await rejects(signer(claimsOk(), 'kid-unknown'))
  })
  it('다른 키쌍의 서명은 같은 kid 라도 401 이다', async () => {
    const real = es256Pair('kid-1')
    const other = es256Pair('kid-1')
    setJwksFetcherForTest(async () => ({ keys: [real.jwk] }))
    await rejects(other.signer(claimsOk()))
  })
  it('NEXT_PUBLIC_SUPABASE_URL 이 없으면 ES256 은 401 이다 — 공개키를 받을 곳을 모른다', async () => {
    const { jwk, signer } = es256Pair('kid-1')
    setJwksFetcherForTest(async () => ({ keys: [jwk] }))
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    await rejects(signer(claimsOk()))
  })
})

describe('③ 표 밖의 alg', () => {
  it('alg:none 은 401 이다', async () => {
    const head = b64(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    const body = b64(JSON.stringify(claimsOk()))
    await rejects(`${head}.${body}.`)
  })
  it('HS256 헤더에 ES256 공개키를 secret 처럼 쓴 토큰은 401 이다 (alg 혼동)', async () => {
    const { jwk } = es256Pair('kid-1')
    setJwksFetcherForTest(async () => ({ keys: [jwk] }))
    await rejects(hs256(claimsOk(), JSON.stringify(jwk)))
  })
})

describe('④ aud · iss', () => {
  it('aud 가 authenticated 가 아니면 401 이다', async () => {
    await rejects(hs256(claimsOk({ aud: 'anon' })))
  })
  it('다른 Supabase 프로젝트의 iss 는 401 이다', async () => {
    await rejects(hs256(claimsOk({ iss: 'https://other-project.supabase.co/auth/v1' })))
  })
  it('우리 자신의 발급자(SELF_ISSUER)는 통과한다', async () => {
    await expect(verifySessionJwt(hs256(claimsOk({ iss: SELF_ISSUER })), NOW)).resolves.toMatchObject({ sub: 'user-1' })
  })
  it('만료된 토큰은 401 이다', async () => {
    await rejects(hs256(claimsOk({ exp: Math.floor(NOW.getTime() / 1000) - 1 })))
  })
})

describe('⑤ signSessionJwt — 우리가 낸 세션은 같은 검증을 지난다', () => {
  it('게스트 모양(sub 만)도 시드 모양(email·name)도 통과하고, aud·iss 가 실려 있다', async () => {
    const guest = signSessionJwt({ sub: 'guest-sub' }, NOW, 60)
    await expect(verifySessionJwt(guest.token, NOW)).resolves.toEqual({ sub: 'guest-sub', email: undefined, name: undefined })
    const seeded = signSessionJwt({ sub: 'u', email: 'u@demo.invalid', name: '정하은' }, NOW, 60)
    await expect(verifySessionJwt(seeded.token, NOW)).resolves.toEqual({ sub: 'u', email: 'u@demo.invalid', name: '정하은' })
    const payload = JSON.parse(Buffer.from(guest.token.split('.')[1]!, 'base64url').toString('utf8')) as Record<string, unknown>
    expect(payload.aud).toBe(SESSION_AUDIENCE)
    expect(payload.iss).toBe(SELF_ISSUER)
    expect(payload).not.toHaveProperty('email')
  })
})
