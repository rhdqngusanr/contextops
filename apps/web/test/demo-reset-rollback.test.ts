import type { PGlite } from '@electric-sql/pglite'
import { eq, inArray } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as schema from '../src/db/schema'
import { GET as demoReset } from '../src/app/api/v1/cron/demo-reset/route'
import { POST as demoSession } from '../src/app/api/v1/demo/session/route'
import { demoSubjects } from '../src/lib/demo/seed-demo'
import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { closeDb, errorOf, freshDb, params, req, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  🔴 **심다가 던지면 지운다** (`lib/demo/reset.ts` — 「반쯤 심긴 데모보다 없는 데모가 낫다」)
//
//  ★ 어떻게 재나 — `seedDemo` 를 「paylab 씨앗(팀·프로젝트·항목)까지 심고 던지는」 것으로
//    갈아 끼운다. 그러면 리셋은 **팀이 생긴 뒤에** 실패한다 — 진짜로 반쯤 심긴 상태다.
//    그 뒤 데모 팀이 0 이고 `/demo/session` 이 404 여야 한다. 반쯤 남으면 링크는 열리는데
//    화면이 비고 원인은 화면에 안 적힌다.
//  ⚠ 파일이 따로인 이유 — `vi.mock` 은 파일 전체에 걸린다. 다른 시험은 진짜 시드를 써야 한다.
// =====================================================================

vi.mock('../src/lib/demo/seed-demo', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/lib/demo/seed-demo')>()
  const { seedPaylab } = await import('../src/lib/demo/seed')
  const { DEMO_TENANT: tenant } = await import('../src/lib/demo/tenant')
  return {
    ...original,
    seedDemo: async () => {
      await seedPaylab(tenant.ownerSubject, {
        teamName: tenant.teamName, teamSlug: tenant.teamSlug,
        projectName: tenant.projectName, projectSlug: tenant.projectSlug,
      })
      throw new Error('[test] 씨앗 뒤에서 일부러 던진다')
    },
  }
})

const CRON_SECRET = 'contextops-test-cron-secret'
let pg: PGlite | undefined

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  process.env.CRON_SECRET = CRON_SECRET
  pg = (await freshDb()).pg
})

afterEach(async () => {
  delete process.env.CRON_SECRET
  await closeDb(pg)
  pg = undefined
})

describe('리셋이 심다가 실패하면', () => {
  it('🔴 500 이고, 팀이 생겼었는데도 지워져 있다 — /demo/session 은 404 로 「없다」고 말한다', async () => {
    const res = await demoReset(req('GET', '/api/v1/cron/demo-reset', { auth: CRON_SECRET }), params({}))
    expect(res.status).toBe(500)
    expect((await errorOf(res)).code).toBe('INTERNAL')

    const db = (await import('../src/db/client')).getDb()
    const teams = await db.select({ id: schema.teams.id }).from(schema.teams).where(eq(schema.teams.slug, DEMO_TENANT.teamSlug))
    expect(teams).toHaveLength(0)
    //  항목·문서·프로젝트도 남지 않았다 — 팀만 지우고 FK 로 막혔으면 여기 남는다.
    expect(await db.select({ id: schema.projects.id }).from(schema.projects)).toHaveLength(0)
    expect(await db.select({ id: schema.contextItems.id }).from(schema.contextItems)).toHaveLength(0)
    expect(await db.select({ id: schema.users.id }).from(schema.users)
      .where(inArray(schema.users.authSubject, demoSubjects()))).toHaveLength(0)

    const session = await demoSession(req('POST', '/api/v1/demo/session'), params({}))
    expect(session.status).toBe(404)
  })
})
