// =====================================================================
//  `verify:prod` — **배포된 production 에서 발표 시나리오를 1회 완주한다**
//  (PLAN P5 첫 행의 완료 기준 · `docs/DEPLOY.md` 의 마지막 걸음)
//
//  ★ 왜 이 파일이 생겼나 — P5 첫 행의 완료 기준이 「production 으로 발표 시나리오 1회
//    완주」인데, 그걸 **사람이 한 번 눈으로 밟는 것**으로 두면 두 가지가 무너진다:
//    ① 무인 루프는 영원히 그 행을 못 닫는다 ② 사람이 밟아도 **다음 배포에서 깨지면
//    아무도 모른다.** GATE 3 을 관통에 넣은 것과 같은 이유다 (105바퀴 · `gate3.ts`).
//
//  🔴 **`next dev` 가 아니라 배포만이 증명하는 것을 잰다.** 관통(`shots.ts`)이 이미
//     재는 것을 여기서 또 재지 않는다. 여기서만 알 수 있는 것은 넷이다:
//     ① 배포 함수가 **DB 에 닿는가** (`/health` 의 `db`) — 로컬은 PGlite 라 늘 참이다
//     ② `CRON_SECRET` 자물쇠가 **배포 환경에 실제로 걸렸나** — 변수를 안 넣으면 401 이
//        아니라 500 이고, 그 배포는 누구나 데모를 리셋할 수 있다 (FINDINGS 120)
//     ③ **데모 테넌트가 production DB 에 심어져 있나** — Cron 을 한 번도 안 불렀으면 404 다
//     ④ 그 위에서 **GATE 3**(빈 창 · 링크만 · 3분)이 production 응답 속도로도 지나는가
//     ⑤ **Supabase 프로젝트 쪽**(2026-09-09 · INBOX 블로커 3) — GitHub 로그인 공급자가 켜져 있나 ·
//        JWKS 의 서명 방식이 검증기 표(`VERIFIER_ALGS`)에 있나 · **anon 키로 Data API 가 표를 내주지
//        않나**. 셋 다 실측에서 어긋나 있었고 코드로는 못 고치는(대시보드) 것이라 검증기가 잰다.
//        `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL`·`ANON_KEY` 로 두드린다 — 없으면 FAIL 로 적는다.
//     ⑥ 로그인 화면에 [GitHub로 계속] 이 **실제로 그려지나** — 클라이언트 렌더라 HTML 텍스트로는
//        못 재고 GATE 3 의 Chrome 으로 본다
//
//  🔴 **걸음을 더하려면**: 아래 `DOORS` 표에 한 줄이다. `vercel.json` 의 cron 이 늘면
//     ①의 검사가 「표에 없다」로 **빨개진다** — 문이 늘었는데 아무도 안 재는 상태가
//     조용히 생기지 않게 한 것이다.
//
//  쓰는 법:
//    pnpm --filter web verify:prod -- --url https://<production>
//    (또는 PRODUCTION_URL 환경변수)
//
//  ⚠ 이 명령은 **읽기만 한다.** 데모를 리셋하지 않는다 — 리셋은 `CRON_SECRET` 을 든
//    사람이 `docs/DEPLOY.md` 의 걸음 ⑤ 에서 한 번 부른다. 검증기가 자격증명을 들면
//    「자물쇠가 걸렸나」를 자기가 열어 보고 판정하는 꼴이 된다.
// =====================================================================

import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { VERIFIER_ALGS } from '../src/lib/api/session'
import { DEMO_ENTRY_PATH, DEMO_TENANT } from '../src/lib/demo/tenant'
import { connectCdp, sleep, waitFor, type Cdp } from './cdp'
import { connectBrowser, launchChrome } from './chrome'
import { runGate3 } from './gate3'
import { DEMO_BASE } from './plan'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const outDir = join(repoRoot, '.ci', 'production')

//  ⚠ 관통이 쓰는 포트(9223)와 겹치지 않게 둔다 — 겹치면 둘이 같은 Chrome 을 본다.
const CDP_PORT = Number(process.env.E2E_CDP_PORT ?? 9224)

/**
 * 🔴 **production 에서 두드리는 문의 정본 표.**
 *
 * `cron` 이 참인 줄은 `vercel.json` 의 `crons[].path` 와 짝이다 — 아래 ① 검사가
 * 「스케줄에 있는데 표에 없는 문」을 FAIL 로 만든다. 문이 늘었는데 아무도 안 재는
 * 상태가 조용히 생기는 것을 막는 자리다.
 */
const DOORS = [
  { path: '/api/v1/health', cron: true },
  { path: '/api/v1/cron/demo-reset', cron: true },
] as const

/** 자물쇠가 걸린 문에 **틀린** 자격증명을 내밀 때 쓰는 값. 맞을 리 없는 글자여야 한다. */
const WRONG_SECRET = 'not-the-cron-secret'

// ── 검사 장부 ────────────────────────────────────────────────────
type Check = { name: string; ok: boolean; detail: string }
const checks: Check[] = []
function check(name: string, ok: boolean, detail = ''): void {
  checks.push({ name, ok, detail })
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// ── 자식 프로세스 ────────────────────────────────────────────────
const children: ChildProcess[] = []
function track(child: ChildProcess): ChildProcess {
  children.push(child)
  return child
}
/** Windows 는 자식의 자식까지 죽여야 포트가 풀린다 (`shots.ts` 와 같은 이유) */
function killAll(): void {
  for (const c of children) {
    if (c.pid === undefined || c.exitCode !== null) continue
    try {
      spawn('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch { /* 이미 죽었다 */ }
  }
}

/**
 * 잴 주소. **기본값이 없다** — 없으면 크게 실패한다.
 * ★ 왜 기본값을 안 두나 — `http://localhost:3000` 같은 기본값을 두면 배포를 안 하고도
 *   초록이 나오고, 이 명령이 증명하려던 것(「배포가 산다」)이 사라진다.
 */
function targetOrigin(): string {
  const flag = process.argv.indexOf('--url')
  const raw = (flag >= 0 ? process.argv[flag + 1] : undefined) ?? process.env.PRODUCTION_URL
  if (raw === undefined || raw.trim() === '') {
    throw new Error('잴 주소가 없다 — `--url https://<production>` 또는 PRODUCTION_URL 로 줘라')
  }
  const url = new URL(raw.trim())
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    //  ⚠ production 을 http 로 재면 「배포가 산다」의 뜻이 달라진다 — Vercel 은 https 다.
    throw new Error(`https 가 아니다: ${url.protocol}//${url.host}`)
  }
  return url.origin
}

/**
 * Supabase 프로젝트 쪽 검사에 쓰는 두 값. env 에 없으면 `.env.local` 을 읽는다
 * (`scripts/migrate.ts` 와 같은 파일 · 값은 어디에도 찍지 않는다).
 */
function supabaseEnv(): { url: string; anonKey: string } | undefined {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const envLocal = join(webRoot, '.env.local')
    if (existsSync(envLocal)) process.loadEnvFile(envLocal)
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && anonKey ? { url: url.replace(/\/+$/, ''), anonKey } : undefined
}

/** JSON 을 읽되 못 읽으면 빈 객체 — 검사가 「형식이 아니다」로 FAIL 을 적게. */
async function jsonOf(res: Response): Promise<Record<string, unknown>> {
  try { return (await res.json()) as Record<string, unknown> } catch { return {} }
}

/**
 * ⑤ Supabase 프로젝트 쪽 — 대시보드에서만 고칠 수 있는 셋 (`docs/DEPLOY.md` ①-b).
 * ⚠ anon 키는 브라우저 번들에 실리는 공개 값이지만 여기서도 찍지 않는다.
 */
async function checkSupabaseProject(): Promise<void> {
  const sb = supabaseEnv()
  check('Supabase 검사에 쓸 NEXT_PUBLIC_SUPABASE_URL · ANON_KEY 가 있다 (.env.local)', sb !== undefined,
    sb ? new URL(sb.url).hostname : '없음 — 아래 셋은 잴 수 없다')
  if (!sb) return

  const settings = await jsonOf(await fetch(`${sb.url}/auth/v1/settings`, { headers: { apikey: sb.anonKey } }))
  const external = (settings.external ?? {}) as Record<string, boolean>
  const enabled = Object.entries(external).filter(([, v]) => v).map(([k]) => k)
  check('Supabase 에서 GitHub 로그인 공급자가 켜져 있다 (/auth/v1/settings external.github)',
    external.github === true, `켜진 공급자: ${enabled.join(',') || '없음'}`)

  const jwks = await jsonOf(await fetch(`${sb.url}/auth/v1/.well-known/jwks.json`))
  const keys = Array.isArray(jwks.keys) ? (jwks.keys as { alg?: string; kty?: string }[]) : []
  const algs = keys.map((k) => k.alg ?? k.kty ?? '?')
  check('JWKS 의 서명 방식이 전부 검증기 표에 있다 (legacy HS256 secret 은 JWKS 에 안 나온다)',
    algs.every((a) => VERIFIER_ALGS.includes(a)), `${algs.join(',') || '(키 없음 = HS256 legacy)'} · 표: ${VERIFIER_ALGS.join(',')}`)

  const rest = await fetch(`${sb.url}/rest/v1/users?select=id&limit=1`, {
    headers: { apikey: sb.anonKey, authorization: `Bearer ${sb.anonKey}` },
  })
  check('anon 키로 Data API 가 표를 내주지 않는다 (Data API 를 껐다 · RLS 만으로는 200 + [] 다)',
    rest.status !== 200, `${rest.status}`)
}

/**
 * ⑥ 로그인 화면 — [GitHub로 계속] 이 실제로 그려지는가. `useSearchParams` 때문에 클라이언트 렌더라
 * HTML 텍스트에는 링크가 없다 — GATE 3 가 띄운 Chrome 으로 본다.
 */
async function checkLoginDoor(browser: Cdp, origin: string): Promise<void> {
  const created = await browser.send('Target.createTarget', { url: 'about:blank' })
  const targetId = created.targetId as string | undefined
  if (targetId === undefined) {
    check('로그인 화면: 탭이 생겼다', false)
    return
  }
  const page = await connectCdp(`ws://127.0.0.1:${CDP_PORT}/devtools/page/${targetId}`)
  try {
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    await page.send('Page.navigate', { url: `${origin}/login` })
    let href = ''
    try {
      await waitFor('로그인 화면', async () => {
        href = (await page.evalJs<string>(
          `(() => { const a = document.querySelector('a[href*="/auth/v1/authorize"]'); return a && a.getClientRects().length > 0 ? (a.getAttribute('href') || '') : '' })()`,
        )) ?? ''
        return href !== ''
      }, 60_000)
    } catch { /* 아래 검사가 FAIL 로 적는다 */ }
    check('로그인 화면에 [GitHub로 계속] 이 실제로 그려진다 (Supabase 환경변수가 빌드에 들어갔다)',
      href.includes('provider=github'), href === '' ? '링크 없음 — NEXT_PUBLIC_SUPABASE_* 가 빌드에 없거나 화면이 안 떴다' : new URL(href).origin)
    const sb = supabaseEnv()
    if (sb && href !== '') {
      check('그 링크가 .env.local 과 같은 Supabase 프로젝트를 가리킨다', href.startsWith(sb.url), new URL(href).hostname)
    }
  } finally {
    page.close()
  }
}

/** 응답 하나를 재고, 본문을 문자열로 돌려준다 (검사 세부에 쓴다) */
async function probe(
  origin: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; text: string; json: unknown }> {
  const res = await fetch(`${origin}${path}`, { ...init, redirect: 'manual' })
  const text = await res.text()
  let json: unknown
  try { json = JSON.parse(text) } catch { json = undefined }
  return { status: res.status, text, json }
}

/** `{ data, meta }` 봉투에서 `data` 만 꺼낸다 (SPEC §5 · `lib/api/respond.ts`) */
function envelopeData(json: unknown): Record<string, unknown> | undefined {
  if (typeof json !== 'object' || json === null) return undefined
  const data = (json as { data?: unknown }).data
  if (typeof data !== 'object' || data === null) return undefined
  return data as Record<string, unknown>
}

async function main(origin: string): Promise<void> {
  mkdirSync(outDir, { recursive: true })
  console.log(`verify:prod — ${origin}`)

  // ① `vercel.json` 의 cron 이 전부 이 표에 있다 (문이 늘면 여기서 빨개진다)
  const vercel = JSON.parse(readFileSync(join(webRoot, 'vercel.json'), 'utf8')) as
    { crons?: { path: string }[] }
  const scheduled = (vercel.crons ?? []).map((c) => c.path)
  const covered: readonly string[] = DOORS.filter((d) => d.cron).map((d) => d.path)
  const uncovered = scheduled.filter((p) => !covered.includes(p))
  check('vercel.json 의 cron 문이 전부 이 검사의 표에 있다', uncovered.length === 0,
    uncovered.length === 0 ? `${scheduled.length}개` : `표에 없는 문: ${uncovered.join(' · ')}`)

  // ② 랜딩이 열린다 — 심사위원이 받는 링크가 이것이다
  const landing = await probe(origin, '/')
  check('랜딩이 200 이다', landing.status === 200, `${landing.status}`)

  // ③ health — **배포 함수가 DB 에 닿는다.** 로컬(PGlite)로는 증명할 수 없는 것이다.
  const health = await probe(origin, '/api/v1/health')
  const healthData = envelopeData(health.json)
  check('health 가 200 이다', health.status === 200, `${health.status}`)
  check('health 가 DB 에 닿았다 (db:true)', healthData?.db === true, JSON.stringify(healthData))
  check('health 의 계약 버전이 v1 이다', healthData?.version === 'v1', String(healthData?.version))
  //  🔴 AI 키가 꽂힌 배포인가 (INBOX G9). 없으면 200 을 내고 멀쩡히 돌다가 심사위원이 [구조화하기] 를
  //     누른 순간 `AI_NOT_CONFIGURED` 다 — 그걸 배포 직후에 잡는 자리가 여기다.
  check('health 가 AI 를 부를 수 있다 (ai:true — GEMINI_API_KEY 가 Vercel env 에 있다)', healthData?.ai === true, JSON.stringify(healthData))

  // ④⑤ Cron 자물쇠 — **변수를 안 넣은 배포는 여기서 빨개진다** (500 이거나 200 이다)
  const noAuth = await probe(origin, '/api/v1/cron/demo-reset')
  check('Cron 문이 자격증명 없이는 401 이다', noAuth.status === 401, `${noAuth.status}`)
  const badAuth = await probe(origin, '/api/v1/cron/demo-reset', {
    headers: { authorization: `Bearer ${WRONG_SECRET}` },
  })
  check('Cron 문이 틀린 자격증명에도 401 이다', badAuth.status === 401, `${badAuth.status}`)

  // ⑥ 자물쇠가 걸린 **일반 문**도 401 이다 (500 이면 FINDINGS 127 의 재발이다)
  const teams = await probe(origin, '/api/v1/teams')
  check('보호된 문이 자격증명 없이 401 이다 (500 이 아니다)', teams.status === 401, `${teams.status}`)

  // ⑦ 데모 테넌트가 production DB 에 심어져 있다 — 404 면 Cron 을 아직 한 번도 안 불렀다
  const session = await probe(origin, '/api/v1/demo/session', { method: 'POST' })
  const sessionData = envelopeData(session.json)
  check('게스트 세션 문이 201 이다 (데모 테넌트가 심어져 있다)', session.status === 201,
    session.status === 404 ? '404 — DEPLOY.md 걸음 ⑤(첫 리셋)를 아직 안 했다' : `${session.status}`)
  check('게스트 세션에 토큰이 있다', typeof sessionData?.access_token === 'string')
  check('서버가 들어갈 자리를 말한다 (entry_path)', sessionData?.entry_path === DEMO_ENTRY_PATH,
    `${String(sessionData?.entry_path)} vs ${DEMO_ENTRY_PATH}`)

  // ⑧ P1 — 그 응답에 사람 정보가 없다. **칸 이름을 세서** 잰다 (없는 것을 눈으로 못 본다)
  const keys = Object.keys(sessionData ?? {}).sort()
  check('게스트 응답의 칸이 셋뿐이다 (이름·이메일이 없다)',
    keys.join(',') === 'access_token,entry_path,expires_at', keys.join(','))
  check('게스트 응답 본문에 이메일 글자가 0건이다', !session.text.includes('@'))

  // ⑧-b Supabase 프로젝트 쪽 — 공급자 · 서명키 · Data API (대시보드 걸음이 됐는지)
  await checkSupabaseProject()

  // ⑨ GATE 3 — 빈 창에서 링크만으로 3분 (production 응답 속도로)
  //  ⚠ 여기가 마지막인 이유 — 위 문들이 배포 함수를 한 번씩 깨워 놨다. 서버리스는
  //    첫 요청이 콜드 스타트라, 안 깨우고 재면 3분의 일부가 「배포가 잠에서 깨는 시간」이다.
  const launched = await launchChrome(CDP_PORT)
  track(launched.child)
  const browser = await connectBrowser(CDP_PORT)
  try {
    await runGate3({
      browser,
      cdpPort: CDP_PORT,
      origin,
      base: DEMO_BASE,
      shotsDir: outDir,
      jsonPath: join(outDir, 'gate3.json'),
      check,
    })
    // ⑩ 로그인 화면의 GitHub 버튼 — 같은 Chrome 으로 (GATE 3 뒤라 함수가 깨어 있다)
    await checkLoginDoor(browser, origin)
  } finally {
    browser.close()
  }
  profileDir = launched.profileDir
}

let profileDir = ''
let origin = ''
try {
  origin = targetOrigin()
  await main(origin)
} catch (err) {
  check('검증기가 끝까지 돌았다', false, err instanceof Error ? err.message : String(err))
} finally {
  killAll()
  await sleep(1_000)
  //  ⚠ 프로필 폴더는 Chrome 을 죽인 **뒤에** 지운다 — 살아 있으면 EBUSY 다
  if (profileDir !== '') { try { rmSync(profileDir, { recursive: true, force: true }) } catch { /* 임시 폴더다 */ } }
}

const passed = checks.filter((c) => c.ok).length
const failed = checks.length - passed

//  🔴 근거를 남긴다 — `.ci/` 는 관통이 지우므로 **적기 전에 밖으로 복사해라**
//     (`docs/DEPLOY.md` 걸음 ⑦ · CLAUDE.md 「⚠ 이 환경에서 밟는 함정」).
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'verify.json'), JSON.stringify({
  origin,
  team_slug: DEMO_TENANT.teamSlug,
  at: new Date().toISOString(),
  passed,
  failed,
  checks,
}, null, 2), 'utf8')

console.log('')
console.log(`verify:prod: ${passed} passed, ${failed} failed — 근거는 .ci/production/`)
await sleep(500)
process.exit(failed > 0 ? 1 : 0)
