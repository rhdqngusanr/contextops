import type { PGlite } from '@electric-sql/pglite'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq, getTableColumns, getTableName, inArray, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import nextConfig from '../next.config'
import * as schema from '../src/db/schema'
import { FUNCTION_MAX_DURATION_SEC, FUNCTION_REGION, LONG_RUNNING_ROUTES } from '../src/lib/api/vercel'
import { GET as demoReset } from '../src/app/api/v1/cron/demo-reset/route'
import { POST as demoSession } from '../src/app/api/v1/demo/session/route'
import { GET as syncStatus } from '../src/app/api/v1/projects/[id]/sync-status/route'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { demoSubjects, readDemoSeedFile } from '../src/lib/demo/seed-demo'
import { PROJECT_SCOPED } from '../src/lib/demo/teardown'
import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  🔴 **데모 리셋 문** — `GET /cron/demo-reset` (SPEC §9 「매일 03:00 리셋(Vercel Cron)」 ·
//  FINDINGS 120)
//
//  ★ 재는 것:
//    ① 자물쇠 — `CRON_SECRET` 이 없거나 틀리면 **401** 이고 아무것도 안 심는다
//    ② 리셋이 실제로 심는다 — 그 뒤 `/demo/session` 이 201 이고 화면 9 가 기기 14 를 본다
//    ③ 🔴 **두 번 돌려도 하나다** — 팀·기기·사람이 늘지 않는다 (지우기가 진짜로 지운다)
//    ④ 지우기는 **데모 팀만** 지운다 — 옆 팀은 그대로다
//    ⑤ 🔴 `project_id` 를 가진 표가 **전부** `PROJECT_SCOPED` 에 있다 — 새 표를 더한 사람이
//       지우는 표를 빠뜨리면 여기서 빨개진다 (빠뜨리면 리셋이 FK 위반으로 500 이 된다)
//    ⑥ `vercel.json` 의 Cron 이 **실제로 있는 라우트**를, `DEMO_TENANT.resetAt` 과 같은
//       시각에 부른다 (UTC ↔ KST 셈) · 🔴 모든 cron 이 **하루 1회 이하**(Vercel Hobby 는 더 잦으면
//       배포를 거부한다) · 함수 리전이 정본(`lib/api/vercel.ts`)과 같다 · 오래 도는 문의
//       `maxDuration` 리터럴이 정본과 같고, `startJob()` 을 부르는 문이 전부 그 표에 있다
//    ⑦ 배포 함수에 `fixtures/` 가 실린다 (`outputFileTracingIncludes`) · `CRON_SECRET` 이
//       `.env.example` 에 있다
//    ⑧ 🔴 `src/` 가 `test/`·`scripts/` 를 import 하지 않는다 — 시드가 제품 코드로 올라온
//       이유가 그 의존을 끊는 것이었다 (FINDINGS 120 「유일한 걸림돌」)
//
//  ⚠ 「심다가 던지면 지운다」는 `demo-reset-rollback.test.ts` 가 따로 잰다 — 모듈을 갈아
//    끼워야 해서 파일이 다르다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
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

function reset(secret?: string): Promise<Response> {
  return demoReset(req('GET', '/api/v1/cron/demo-reset', secret === undefined ? {} : { auth: secret }), params({}))
}

async function demoTeamCount(): Promise<number> {
  const db = (await import('../src/db/client')).getDb()
  return (await db.select({ id: schema.teams.id }).from(schema.teams).where(eq(schema.teams.slug, DEMO_TENANT.teamSlug))).length
}

async function demoUserCount(): Promise<number> {
  const db = (await import('../src/db/client')).getDb()
  return (await db.select({ id: schema.users.id }).from(schema.users)
    .where(inArray(schema.users.authSubject, demoSubjects()))).length
}

describe('① 자물쇠 — CRON_SECRET', () => {
  it('환경변수가 없으면 401 이다 — 맞는 값을 보내도 열리지 않는다 (조용히 통과시키지 않는다)', async () => {
    delete process.env.CRON_SECRET
    const res = await reset(CRON_SECRET)
    expect(res.status).toBe(401)
    expect((await errorOf(res)).code).toBe('UNAUTHORIZED')
    expect(await demoTeamCount()).toBe(0)
  })

  it('머리가 없거나 틀리면 401 이다', async () => {
    expect((await reset()).status).toBe(401)
    expect((await reset('wrong')).status).toBe(401)
    //  길이가 같아도 틀리면 401 — timingSafeEqual 이 길이만 보는 것이 아니다.
    expect((await reset(CRON_SECRET.replace(/.$/, 'X'))).status).toBe(401)
    expect(await demoTeamCount()).toBe(0)
  })

  it('세션 토큰·기기 토큰으로는 열리지 않는다 — 주체가 아니라 자물쇠다', async () => {
    expect((await reset(sessionJwt('someone'))).status).toBe(401)
    expect((await reset('ctx_' + 'a'.repeat(43))).status).toBe(401)
  })
})

describe('② 리셋이 심는다', () => {
  it('200 이고 수가 픽스처와 같다 · 그 뒤 /demo/session 이 201 이고 화면 9 가 기기 14 를 본다', async () => {
    const res = await reset(CRON_SECRET)
    expect(res.status).toBe(200)
    const data = await dataOf(res)
    const file = readDemoSeedFile()
    expect(data.existed).toBe(false)
    expect(data.team_slug).toBe(DEMO_TENANT.teamSlug)
    expect(data.devices).toBe(file.devices.length)
    expect(data.members).toBe(file.members.length)
    expect(data.progress).toBe(file.progress.length)
    expect(data.official_version).toBe('1.1.0')
    //  응답에 토큰·이메일·이름이 없다.
    const text = JSON.stringify(data)
    expect(text).not.toContain('@')
    expect(text).not.toContain('eyJ')

    const session = await demoSession(req('POST', '/api/v1/demo/session'), params({}))
    expect(session.status).toBe(201)
    const guest = (await dataOf(session)).access_token as string
    const projectId = data.project_id
    //  응답은 수뿐이라 project_id 가 없다 — 팀으로 프로젝트를 찾는다.
    expect(projectId).toBeUndefined()
    const db = (await import('../src/db/client')).getDb()
    const [project] = await db.select({ id: schema.projects.id }).from(schema.projects)
      .where(eq(schema.projects.slug, DEMO_TENANT.projectSlug)).limit(1)
    const status = await dataOf(await syncStatus(
      req('GET', `/api/v1/projects/${project?.id}/sync-status`, { auth: guest }),
      params({ id: project?.id as string }),
    ))
    expect(status.devices).toHaveLength(file.devices.length)
  })
})

describe('③④ 지우기', () => {
  it('🔴 두 번 돌려도 팀 하나 · 사람은 늘지 않는다 · 둘째는 existed=true 다', async () => {
    const first = await dataOf(await reset(CRON_SECRET))
    const users1 = await demoUserCount()
    const second = await dataOf(await reset(CRON_SECRET))
    expect(first.existed).toBe(false)
    expect(second.existed).toBe(true)
    expect(await demoTeamCount()).toBe(1)
    expect(await demoUserCount()).toBe(users1)
    //  픽스처의 사람 + 팀장 + 게스트 — 그 이상도 이하도 아니다.
    expect(users1).toBe(demoSubjects().length)
    //  기기·보고도 그대로다 — 옛 기기가 남으면 화면 9 가 24대를 본다.
    expect(second.devices).toBe(first.devices)
    const db = (await import('../src/db/client')).getDb()
    expect((await db.select({ id: schema.devices.id }).from(schema.devices)).length).toBe(first.devices)
  })

  it('데모 팀만 지운다 — 옆 팀과 그 사람은 그대로다', async () => {
    await reset(CRON_SECRET)
    const other = await dataOf(await createTeam(req('POST', '/api/v1/teams', {
      auth: sessionJwt('bystander'), body: { name: '옆 팀', slug: 'bystander-team' },
    }), params({})))
    await reset(CRON_SECRET)
    const db = (await import('../src/db/client')).getDb()
    const [still] = await db.select({ id: schema.teams.id }).from(schema.teams).where(eq(schema.teams.id, other.id as string))
    expect(still).toBeDefined()
    const [person] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.authSubject, 'bystander'))
    expect(person).toBeDefined()
  })
})

describe('⑤ 지우는 표의 목록이 스키마와 같다', () => {
  it('🔴 project_id 를 가진 표는 전부 PROJECT_SCOPED 에 있다 — 새 표를 빠뜨리면 여기서 빨개진다', () => {
    const scoped = new Set<string>(PROJECT_SCOPED.map((t) => getTableName(t)))
    const tables: PgTable[] = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable))
    const withProjectId = tables
      .filter((t) => 'projectId' in getTableColumns(t))
      .map((t) => getTableName(t))
    expect(withProjectId.length).toBeGreaterThan(5)
    for (const name of withProjectId) expect(scoped.has(name), `${name} 이 PROJECT_SCOPED 에 없다`).toBe(true)
    //  반대로 목록에 스키마에 없는 이름이 있어도 안 된다.
    for (const name of scoped) expect(withProjectId).toContain(name)
  })
})

describe('⑥ vercel.json 의 Cron · 리전 · 함수 상한 — 정본은 lib/api/vercel.ts', () => {
  type Cron = { path: string; schedule: string }
  const vercel = JSON.parse(readFileSync(join(webRoot, 'vercel.json'), 'utf8')) as { crons: Cron[]; regions?: string[] }

  it('🔴 최상위 키가 Vercel 이 아는 것뿐이다 — `_comment` 하나로 Import 가 거부됐다 (2026-09-10)', () => {
    //  Vercel 은 vercel.json 을 스키마로 엄격히 판다 (additionalProperties: false). 주석·메모는 `lib/api/vercel.ts` 머리로.
    const raw = JSON.parse(readFileSync(join(webRoot, 'vercel.json'), 'utf8')) as Record<string, unknown>
    const KNOWN = ['$schema', 'regions', 'crons', 'functions', 'headers', 'redirects', 'rewrites', 'cleanUrls', 'trailingSlash', 'framework', 'buildCommand', 'installCommand', 'outputDirectory']
    const unknown = Object.keys(raw).filter((k) => !KNOWN.includes(k))
    expect(unknown, 'vercel.json 에 Vercel 이 모르는 키가 있다 — Import 가 거부한다').toEqual([])
    expect(Object.keys(raw).some((k) => k.startsWith('_'))).toBe(false)
  })

  it('부르는 경로마다 라우트 파일이 실제로 있다', () => {
    expect(vercel.crons.length).toBeGreaterThan(0)
    for (const cron of vercel.crons) {
      const file = join(webRoot, 'src', 'app', ...cron.path.split('/').filter(Boolean), 'route.ts')
      expect(existsSync(file), `${cron.path} → ${file}`).toBe(true)
    }
  })

  it('데모 리셋은 DEMO_TENANT.resetAt(KST) 과 같은 시각이다 — UTC 로 옮겨 센다', () => {
    const cron = vercel.crons.find((c) => c.path === '/api/v1/cron/demo-reset')
    expect(cron).toBeDefined()
    const [minute, hour, dom, mon, dow] = (cron as Cron).schedule.split(' ')
    expect([dom, mon, dow]).toEqual(['*', '*', '*'])
    const [kstHour, kstMinute] = DEMO_TENANT.resetAt.split(':').map(Number) as [number, number]
    const utcHour = (kstHour - DEMO_TENANT.resetUtcOffsetHours + 24) % 24
    expect(Number(hour)).toBe(utcHour)
    expect(Number(minute)).toBe(kstMinute)
  })

  it('🔴 모든 cron 이 하루 1회 이하다 — Vercel Hobby 는 더 잦은 표현식을 배포 단계에서 거부한다', () => {
    //  분·시 칸이 숫자 하나면 하루 1회다. `*/6`·`*`·`1,13` 은 그보다 잦다
    //  (2026-09-09 감사 · health 가 `0 */6` 이라 첫 배포가 실패할 값이었다 — 그 값을 이 시험이 잠가 두고 있었다).
    for (const cron of vercel.crons) {
      const [minute, hour] = cron.schedule.split(' ')
      expect(minute, `${cron.path} 의 분 칸`).toMatch(/^\d+$/)
      expect(hour, `${cron.path} 의 시 칸`).toMatch(/^\d+$/)
    }
  })

  it('health 가 스케줄에 있고 리셋과 다른 시각이다 (Supabase pause 방지 · SPEC §11)', () => {
    const health = vercel.crons.find((c) => c.path === '/api/v1/health')
    const reset = vercel.crons.find((c) => c.path === '/api/v1/cron/demo-reset')
    expect(health).toBeDefined()
    expect(health?.schedule).not.toBe(reset?.schedule)
  })

  it('함수 리전이 정확히 하나이고 정본(FUNCTION_REGION)과 같다 — Hobby 는 리전 하나 · DB 와 같은 도시', () => {
    expect(vercel.regions).toEqual([FUNCTION_REGION])
  })

  it('오래 도는 문마다 maxDuration 리터럴이 정본(FUNCTION_MAX_DURATION_SEC)과 같다 — Next 는 리터럴만 읽는다', () => {
    for (const rel of LONG_RUNNING_ROUTES) {
      const file = join(webRoot, 'src', 'app', ...rel.split('/'), 'route.ts')
      expect(existsSync(file), `${rel} 의 route.ts 가 없다`).toBe(true)
      const m = /^export const maxDuration = (\d+)$/m.exec(readFileSync(file, 'utf8'))
      expect(m, `${rel} 에 export const maxDuration 리터럴이 없다`).not.toBeNull()
      expect(Number(m?.[1]), rel).toBe(FUNCTION_MAX_DURATION_SEC)
    }
  })

  it('startJob() 을 부르는 문은 전부 LONG_RUNNING_ROUTES 에 있다 — 응답 뒤 after() 가 상한 안에서 돌아야 한다', () => {
    const appRoot = join(webRoot, 'src', 'app')
    const callers: string[] = []
    const visit = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const at = join(dir, name)
        if (statSync(at).isDirectory()) visit(at)
        else if (name === 'route.ts' && readFileSync(at, 'utf8').includes('startJob(')) callers.push(at)
      }
    }
    visit(appRoot)
    const listed = LONG_RUNNING_ROUTES.map((rel) => join(appRoot, ...rel.split('/'), 'route.ts'))
    expect(callers.length).toBeGreaterThan(0)
    expect(callers.filter((c) => !listed.includes(c)), 'startJob() 을 부르는데 표에 없는 문').toEqual([])
  })
})

describe('⑦ 배포 재료', () => {
  it('배포 함수가 fixtures/ 를 싣는다 — 없으면 리셋이 배포에서 던진다', () => {
    const includes = nextConfig.outputFileTracingIncludes ?? {}
    const globs = includes['/api/v1/cron/demo-reset'] ?? []
    expect(globs.some((g) => g.includes('fixtures'))).toBe(true)
    expect(nextConfig.outputFileTracingRoot).toBeDefined()
  })

  it('CRON_SECRET 이 .env.example 에 있다', () => {
    expect(readFileSync(join(webRoot, '.env.example'), 'utf8')).toMatch(/^CRON_SECRET=/m)
  })
})

describe('⑧ src/ 는 test/·scripts/ 를 import 하지 않는다', () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const at = join(dir, name)
      if (statSync(at).isDirectory()) return walk(at)
      return /\.(ts|tsx)$/.test(name) ? [at] : []
    })
  }

  it('🔴 제품 코드에 시험 도우미·개발 도구로 가는 import 가 0 줄이다', () => {
    const offenders: string[] = []
    for (const file of walk(join(webRoot, 'src'))) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/^\s*(?:import|export)[^'"\n]*['"]([^'"]+)['"]/gm)) {
        const spec = m[1] as string
        if (/(^|\/)(test|scripts)\//.test(spec)) offenders.push(`${file}: ${spec}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
