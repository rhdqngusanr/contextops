import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'

import { GET as demoReset } from '../src/app/api/v1/cron/demo-reset/route'
import { POST as demoSession } from '../src/app/api/v1/demo/session/route'
import { devices, teams, users } from '../src/db/schema'
import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { bodyOf, closeDb, freshDb, params, req, TEST_JWT_SECRET } from '../test/helpers/db'

// =====================================================================
//  **Cron 이 보는 것을 글자로 뽑는다** — `GET /cron/demo-reset` (loop/PROMPT.md ④2)
//
//  ★ 시험은 「수가 맞다」까지만 말한다. 여기서 보는 것은 **응답 봉투 그대로**와
//    「두 번 돌린 뒤 DB 에 무엇이 몇 개 남았나」다 — 리셋이 정말 리셋인지를 사람이 읽는다.
//
//  실행: pnpm --filter web exec tsx scripts/dump-demo-reset.ts
//  결과: docs/evidence/<날짜>-demo-reset/reset.txt
// =====================================================================

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
//  ⚠ 지역 날짜다 — `toISOString()` 은 UTC 라 KST 새벽에 돌리면 어제 폴더가 생긴다 (실제로 그랬다).
const day = new Date().toLocaleDateString('sv-SE')
const out = join(root, 'docs', 'evidence', `${day}-demo-reset`)

const lines: string[] = []
function say(text = ''): void {
  lines.push(text)
  console.log(text)
}

async function call(auth?: string): Promise<{ status: number; body: Record<string, unknown>; ms: number }> {
  const t0 = Date.now()
  const res = await demoReset(req('GET', '/api/v1/cron/demo-reset', auth === undefined ? {} : { auth }), params({}))
  return { status: res.status, body: await bodyOf(res), ms: Date.now() - t0 }
}

async function counts(): Promise<string> {
  const db = (await import('../src/db/client')).getDb()
  const t = (await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, DEMO_TENANT.teamSlug))).length
  const d = (await db.select({ id: devices.id }).from(devices)).length
  const u = (await db.select({ id: users.id }).from(users)).length
  return `팀(slug=${DEMO_TENANT.teamSlug}) ${t} · 기기 ${d} · 사람 ${u}`
}

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
const { pg } = await freshDb()
try {
  say(`◆ GET /api/v1/cron/demo-reset — PGlite · ${new Date().toISOString()}`)
  say('─'.repeat(72))

  delete process.env.CRON_SECRET
  const locked = await call('anything')
  say(`CRON_SECRET 없음 + 아무 값     → ${locked.status} ${JSON.stringify(locked.body.error)}`)

  process.env.CRON_SECRET = 'dump-secret'
  const wrong = await call('wrong')
  say(`틀린 값                         → ${wrong.status} ${JSON.stringify((wrong.body.error as { code: string }).code)}`)
  say(`DB: ${await counts()}`)
  say()

  const first = await call('dump-secret')
  say(`맞는 값 (첫 심기)               → ${first.status} · ${first.ms}ms`)
  say(`  ${JSON.stringify(first.body.data)}`)
  say(`DB: ${await counts()}`)
  const s1 = await demoSession(req('POST', '/api/v1/demo/session'), params({}))
  say(`POST /demo/session               → ${s1.status}`)
  say()

  const second = await call('dump-secret')
  say(`맞는 값 (둘째 — 리셋)           → ${second.status} · ${second.ms}ms`)
  say(`  ${JSON.stringify(second.body.data)}`)
  say(`DB: ${await counts()}   ← 첫 심기와 같아야 한다 (지우기가 진짜로 지웠다)`)
  say()
  say('⚠ 배포(Supabase · Vercel)에서 돌린 것이 아니다 — PGlite 위의 같은 라우트다. 배포에서의 시간과')
  say('  `outputFileTracingIncludes` 가 실제로 fixtures/ 를 실었는지는 🙋 Vercel 연결 뒤 첫 리셋에서 본다.')

  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'reset.txt'), lines.join('\n') + '\n', 'utf8')
  console.log('')
  console.log(`→ ${join(out, 'reset.txt')}`)
} finally {
  await closeDb(pg)
}
