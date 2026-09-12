import type { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Db } from '../src/db/client'
import { rateHits } from '../src/db/schema'
import { ApiError } from '../src/lib/api/error'
import {
  bucketOf,
  checkRateLimit,
  clientIp,
  DEFAULT_LIMIT,
  HTTP_RATE_LIMITS,
  limitFor,
  sweepRateHits,
} from '../src/lib/api/rate-limit'
import { closeDb, freshDb } from './helpers/db'

// =====================================================================
//  HTTP 빈도 제한 (SPEC §5 · R1 · 2026-09-12)
//
//  ★ 이 파일이 지키는 것 — 「세는 문이 실제로 끊는가」와 「표의 줄이 죽어 있지 않은가」.
//    후자가 없으면 열쇠 오타 하나로 그 라우트가 조용히 기본값으로 돌아간다.
// =====================================================================

let pg: PGlite | undefined
let db: Db

beforeEach(async () => {
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
})

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

const NOW = new Date('2026-09-12T10:00:00.000Z')

/** 실제 라우트가 받는 것과 같은 표준 `Request` — 다만 **IP 머리를 우리가 정한다**. */
function from(ip: string): Request {
  return new Request('https://contextops.example/api/v1/demo/session', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  })
}

/** 한 번 세고 「끊겼나」를 돌려준다. */
async function hit(route: string, ip: string, now = NOW): Promise<{ blocked: boolean; code?: string }> {
  try {
    await checkRateLimit(() => db, route, from(ip), now)
    return { blocked: false }
  } catch (err) {
    if (err instanceof ApiError) return { blocked: true, code: err.code }
    throw err
  }
}

describe('빈도 제한 — 세고 끊는다', () => {
  it('🔴 한도까지는 지나고, 한 번 더 하면 429 RATE_LIMITED 다', async () => {
    const route = 'POST /demo/session'
    const limit = limitFor(route)
    expect(limit.calls).toBe(20)

    for (let i = 0; i < limit.calls; i += 1) {
      const r = await hit(route, '203.0.113.7')
      expect(r.blocked, `${i + 1}번째 요청이 끊겼다 — 한도(${limit.calls}) 안인데`).toBe(false)
    }

    const over = await hit(route, '203.0.113.7')
    expect(over.blocked).toBe(true)
    expect(over.code).toBe('RATE_LIMITED')
  })

  it('🔴 IP 가 다르면 따로 센다 — 한 사람이 막혔다고 남이 막히지 않는다', async () => {
    const route = 'POST /demo/session'
    for (let i = 0; i < 20; i += 1) await hit(route, '203.0.113.7')
    expect((await hit(route, '203.0.113.7')).blocked).toBe(true)

    //  같은 순간, 다른 IP 는 처음부터 센다.
    expect((await hit(route, '198.51.100.2')).blocked).toBe(false)
  })

  it('🔴 라우트가 다르면 따로 센다 — 좁은 문 하나가 나머지를 잠그지 않는다', async () => {
    for (let i = 0; i < 20; i += 1) await hit('POST /demo/session', '203.0.113.7')
    expect((await hit('POST /demo/session', '203.0.113.7')).blocked).toBe(true)
    expect((await hit('GET /health', '203.0.113.7')).blocked).toBe(false)
  })

  it('🔴 창이 지나면 저절로 풀린다 — 「0으로 되돌리는」 코드가 없어도', async () => {
    const route = 'POST /demo/session'
    for (let i = 0; i < 20; i += 1) await hit(route, '203.0.113.7')
    expect((await hit(route, '203.0.113.7')).blocked).toBe(true)

    //  창은 600초다. 그만큼 뒤면 `bucket` 문자열이 달라져서 새 창이다.
    const later = new Date(NOW.getTime() + 601 * 1000)
    expect((await hit(route, '203.0.113.7', later)).blocked).toBe(false)
  })

  it('🔴 표에 없는 라우트는 기본값(600/분)으로 잠겨서 태어난다', () => {
    expect(HTTP_RATE_LIMITS['GET /health']).toBeUndefined()
    expect(limitFor('GET /health')).toEqual(DEFAULT_LIMIT)
    expect(DEFAULT_LIMIT.calls).toBe(600)
    expect(DEFAULT_LIMIT.windowSeconds).toBe(60)
  })
})

describe('빈도 제한 — P1 · 원문을 남기지 않는다', () => {
  it('🔴 IP 원문이 표에 들어가지 않는다 (sha256)', async () => {
    const ip = '203.0.113.7'
    await hit('POST /demo/session', ip)

    const rows = await db.select({ bucket: rateHits.bucket }).from(rateHits)
    expect(rows.length).toBe(1)
    expect(rows[0]?.bucket).not.toContain(ip)
    //  열쇠는 `<sha256>:<라우트>:<창시작>` — 라우트 이름은 원문이 아니라 모양이라 그대로 있다.
    expect(rows[0]?.bucket).toContain('POST /demo/session')
    expect(rows[0]?.bucket.split(':')[0]).toMatch(/^[0-9a-f]{64}$/)
  })

  it('`x-forwarded-for` 는 **맨 앞 하나**만 읽는다 — 뒤쪽은 클라이언트가 지어낼 수 있다', () => {
    const req = new Request('https://x.example/', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 172.16.0.9' },
    })
    expect(clientIp(req)).toBe('203.0.113.7')
  })

  it('머리가 없으면 `local` 이다 — 로컬 개발·시험은 한 통을 나눠 쓴다', () => {
    expect(clientIp(new Request('https://x.example/'))).toBe('local')
  })

  it('같은 창 안의 두 요청은 같은 열쇠이고, 창이 바뀌면 달라진다', () => {
    const a = bucketOf('1.2.3.4', 'GET /x', 60, new Date('2026-09-12T10:00:10Z'))
    const b = bucketOf('1.2.3.4', 'GET /x', 60, new Date('2026-09-12T10:00:59Z'))
    const c = bucketOf('1.2.3.4', 'GET /x', 60, new Date('2026-09-12T10:01:00Z'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('빈도 제한 — DB 가 흔들릴 때', () => {
  it('🔴 세는 질의가 던지면 요청을 **통과**시킨다 (fail-open) · 대신 조용하지 않다', async () => {
    const broken = {
      insert: () => { throw new Error('connection terminated') },
    } as unknown as Db

    const seen: unknown[] = []
    //  던지지 않는 것이 이 시험의 전부다 — 빈도 제한이 고장 났다고 사이트가 죽으면 안 된다.
    await expect(
      checkRateLimit(() => broken, 'POST /demo/session', from('203.0.113.7'), NOW, (err) => { seen.push(err) }),
    ).resolves.toBeUndefined()
    expect(seen.length).toBe(1)
  })

  it('🔴 **DB 를 여는 것 자체가 터져도** 통과시킨다 — 이 자리가 실제로 고장났었다', async () => {
    //  ★ 실측 (2026-09-12) — 처음엔 `checkRateLimit(getDb(), …)` 로 **값을** 넘겼다.
    //    그래서 `DATABASE_URL` 이 없는 배포에서 `getDb()` 가 fail-open **밖에서** 터졌고,
    //    「DB 가 없어도 헤더가 없으면 401」·「DB 가 없으면 503」 두 시험이 500 을 받았다.
    //    빈도 제한은 DB 가 없을 때 **가장 조용해야** 하는 문이라 그 갈래를 여기서 잠근다.
    const seen: unknown[] = []
    await expect(
      checkRateLimit(
        () => { throw new Error('DATABASE_URL 이 없다') },
        'POST /demo/session',
        from('203.0.113.7'),
        NOW,
        (err) => { seen.push(err) },
      ),
    ).resolves.toBeUndefined()
    expect(seen.length).toBe(1)
  })
})

describe('빈도 제한 — 지난 창 청소', () => {
  it('Cron 이 만료된 행만 지운다 — 살아 있는 창은 남는다', async () => {
    await hit('POST /demo/session', '203.0.113.7')
    expect((await db.select({ bucket: rateHits.bucket }).from(rateHits)).length).toBe(1)

    //  창(600초)의 두 배가 `expires_at` 이다. 그 전에는 안 지운다.
    expect(await sweepRateHits(db, new Date(NOW.getTime() + 600 * 1000))).toBe(0)
    expect(await sweepRateHits(db, new Date(NOW.getTime() + 1201 * 1000))).toBe(1)
    expect((await db.select({ bucket: rateHits.bucket }).from(rateHits)).length).toBe(0)
  })
})

// ---------------------------------------------------------------------
//  🔴 죽은 줄 금지 — 표의 열쇠가 **실제로 있는 라우트 이름**인가
//
//  ★ 왜 게이트인가 (CLAUDE.md 「정의만 있고 아무 일도 안 하는 코드」) — 열쇠는 문자열이라
//    오타가 타입 검사에 안 걸린다. 오타난 줄은 **아무것도 안 하고**, 그 라우트는 조용히
//    기본값으로 돌아간다. 「좁혀 뒀다」고 믿는 문이 안 좁혀져 있는 상태가 제일 늦게 발견된다.
// ---------------------------------------------------------------------

/** `src/app/api` 밑의 모든 `route.ts` 에서 `route('<이름>'` 의 이름을 걷는다. */
function declaredRouteNames(): Set<string> {
  const root = join(__dirname, '..', 'src', 'app', 'api')
  const names = new Set<string>()

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (entry.name !== 'route.ts') continue
      const source = readFileSync(full, 'utf8')
      //  `route('이름'` · `route<{…}>('이름'` 두 모양을 다 읽는다.
      for (const m of source.matchAll(/\broute(?:<[^>]*>)?\(\s*'([^']+)'/g)) names.add(m[1]!)
    }
  }
  walk(root)
  return names
}

describe('빈도 제한 표 — 죽은 줄 금지', () => {
  it('🔴 `HTTP_RATE_LIMITS` 의 모든 열쇠가 실제 라우트 이름이다', () => {
    const declared = declaredRouteNames()
    //  걷기 자체가 고장 나면 이 시험이 조용히 통과한다 — 먼저 그것부터 막는다.
    expect(declared.size).toBeGreaterThan(20)
    expect(declared).toContain('POST /demo/session')

    const dead = Object.keys(HTTP_RATE_LIMITS).filter((name) => !declared.has(name))
    expect(dead, '표에 있는데 그런 라우트가 없다 — 오타이거나 라우트가 지워졌다').toEqual([])
  })

  it('🔴 자격증명 없이 부를 수 있는 문은 기본값보다 좁다', () => {
    //  `POST /demo/session` 은 `ctx.actor()` 를 부르지 않는 유일한 쓰기 문이다.
    //  ⚠ 그런 문이 또 생기면 여기 한 줄을 더하고 표에도 한 줄을 더해라.
    const open = ['POST /demo/session']
    for (const name of open) {
      const limit = limitFor(name)
      expect(limit, `${name} 이 표에 없다 — 자격증명 없는 문이 기본값으로 열려 있다`).not.toEqual(DEFAULT_LIMIT)
      //  「분당 몇 번인가」로 환산해서 비교한다 — 창의 길이가 서로 달라서.
      const perMinute = (limit.calls / limit.windowSeconds) * 60
      const defaultPerMinute = (DEFAULT_LIMIT.calls / DEFAULT_LIMIT.windowSeconds) * 60
      expect(perMinute).toBeLessThan(defaultPerMinute)
    }
  })
})
