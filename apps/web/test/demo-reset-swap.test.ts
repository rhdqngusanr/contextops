import type { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { POST as demoSession } from '../src/app/api/v1/demo/session/route'
import { getDb } from '../src/db/client'
import { teams } from '../src/db/schema'
import { DEMO_STAGING_SLUG, resetDemo } from '../src/lib/demo/reset'
import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { closeDb, freshDb, params, req, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  데모 리셋 — 옆자리에 심고 바꾼다 (INBOX H6 · 2026-09-10)
//
//  ★ 왜 시험인가 — 예전 리셋은 「지우고 심기」라 심기가 죽으면 그날 데모가 없었다. 심사 기간에 그 아침을
//    맞으면 링크가 안 열리고, 규정상 심사에서 빠질 수 있다. 여기서는 실패를 **일부러 만들어** 어제 데모가
//    그대로 사는지, 성공하면 자리가 바뀌는지를 잰다.
// =====================================================================

let pg: PGlite | undefined
const NOW = new Date('2026-09-06T09:00:00.000Z')

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  pg = (await freshDb()).pg
})

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

async function teamIdBySlug(slug: string): Promise<string | undefined> {
  const [row] = await getDb().select({ id: teams.id }).from(teams).where(eq(teams.slug, slug)).limit(1)
  return row?.id
}

/** 게스트 문이 열리나 — 세션 라우트는 「만든 것」이라 201 을 낸다. */
async function guestDoorOpen(): Promise<boolean> {
  const status = (await demoSession(req('POST', '/api/v1/demo/session'), params({}))).status
  return status === 200 || status === 201
}

describe('resetDemo — 옆자리에 심고 바꾼다', () => {
  it('첫 리셋 — 정본 slug 로 팀이 서고 옆자리는 남지 않는다', async () => {
    const result = await resetDemo(NOW)
    expect(result.existed).toBe(false)
    expect(result.seeded.teamSlug).toBe(DEMO_TENANT.teamSlug)
    expect(await teamIdBySlug(DEMO_TENANT.teamSlug)).toBeDefined()
    expect(await teamIdBySlug(DEMO_STAGING_SLUG)).toBeUndefined()
    expect(await guestDoorOpen()).toBe(true)
  })

  it('둘째 리셋 — 새 팀이 자리를 받고 옛 팀은 사라진다 (매일 같은 데모)', async () => {
    await resetDemo(NOW)
    const before = await teamIdBySlug(DEMO_TENANT.teamSlug)

    const result = await resetDemo(new Date(NOW.getTime() + 86_400_000))
    expect(result.existed).toBe(true)
    const after = await teamIdBySlug(DEMO_TENANT.teamSlug)
    expect(after).toBeDefined()
    expect(after).not.toBe(before)
    expect(await teamIdBySlug(DEMO_STAGING_SLUG)).toBeUndefined()
    //  게스트 문은 새 팀으로 이어진다 — 멤버십도 새 팀에 심겼다.
    expect(await guestDoorOpen()).toBe(true)
  })

  it('🔴 심기가 죽으면 어제 데모가 그대로 산다 — 옆자리만 치우고 던진다', async () => {
    await resetDemo(NOW)
    const before = await teamIdBySlug(DEMO_TENANT.teamSlug)

    await expect(resetDemo(NOW, async () => { throw new Error('심기 도중 DB 가 끊겼다') }))
      .rejects.toThrow('심기 도중')

    expect(await teamIdBySlug(DEMO_TENANT.teamSlug)).toBe(before)
    expect(await teamIdBySlug(DEMO_STAGING_SLUG)).toBeUndefined()
    expect(await guestDoorOpen()).toBe(true)
  })

  it('지난 리셋이 옆자리를 남기고 죽었어도 다음 리셋이 치우고 지나간다', async () => {
    //  옆자리에 팀만 하나 남아 있는 상태를 만든다 — 심다 죽은 자취다.
    const { seedDemo } = await import('../src/lib/demo/seed-demo')
    await seedDemo(NOW, { teamSlug: DEMO_STAGING_SLUG })
    expect(await teamIdBySlug(DEMO_STAGING_SLUG)).toBeDefined()

    const result = await resetDemo(NOW)
    expect(result.existed).toBe(false)
    expect(await teamIdBySlug(DEMO_STAGING_SLUG)).toBeUndefined()
    expect(await teamIdBySlug(DEMO_TENANT.teamSlug)).toBeDefined()
  })
})
