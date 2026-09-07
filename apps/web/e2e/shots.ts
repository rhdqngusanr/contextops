// =====================================================================
//  관통의 `shots` 단계 — **진짜 브라우저로 화면을 찍고, 그려졌는지 센다**
//
//    pnpm --filter web test:e2e          (tools/walkthrough.ps1 의 `shots` 단계가 부른다)
//
//  ★ 왜 있나 — 랜딩에 넣을 「제품이 움직이는 그림」은 **손으로 만들면 안 된다**
//    (FINDINGS 131). 관통이 실제로 띄운 제품에서 나온 캡처여야 그림이 낡는 순간
//    관통이 먼저 안다. 그리고 그 캡처는 눈 판정(loop/PROMPT.md ⑦3층)의 재료다.
//
//  ★ 들어가는 길은 제품과 같다 — 인증을 우회하는 문을 만들지 않는다:
//    ① `scripts/demo-server.ts`(PGlite → TCP)를 띄우고
//    ② `next dev` 를 그 `DATABASE_URL` 로 띄우고
//    ③ 헤드리스 Chrome 을 CDP 로 몰아 `/demo` 로 게스트 세션을 받은 뒤 화면을 돈다.
//    ⚠ `--window-size=375` 는 크롬 최소 창 폭 때문에 ~504 를 잘라낸 그림이다.
//      진짜 뷰포트는 `Emulation.setDeviceMetricsOverride` 로만 만든다.
//
//  🔴 무엇을 세나 — 캡처 한 장마다 **검사 넷**이다: ① 그 화면의 selector 가 보이나
//     ② **로딩이 끝났나**(skeleton 0 — 껍데기만 뜬 그림은 쓸 수 없다)
//     ③ 가로로 밀지 않나(`scrollWidth == clientWidth`) ④ 캡처가 빈 파일이 아닌가.
//     그리고 마지막에 **GATE 3** 을 밟는다 (`e2e/gate3.ts`) — 빈 창에서 링크만으로
//     화면 5·6·8·9 를 3분 안에. 캡처가 끝난 뒤인 이유는 그 파일의 머리말에 있다.
//
//     끝에 `e2e: N passed, M failed` 를 찍는다 — 관통이 그 수를 읽는다
//     (`tools/walkthrough.ps1` 의 `count_log`). ⚠ 그 줄의 모양을 바꾸면 관통이
//     「검사 수를 못 셌다」로 FAIL 한다. 같이 고쳐라.
// =====================================================================

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TEST_JWT_SECRET } from '../test/helpers/db'
import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { type Cdp, connectCdp, sleep, waitFor } from './cdp'
import { runGate3 } from './gate3'
import { DEMO_BASE, SHOT_PLAN } from './plan'
import { shotsSummary } from './report'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const shotsDir = join(repoRoot, '.ci', 'shots')

//  ⚠ 사람이 띄워 둔 개발 서버(3000 · 55432 · 9222)와 **겹치지 않는 포트**를 쓴다.
//    겹치면 관통이 남의 DB 를 찍고, 그 화면은 이 저장소의 씨앗이 아니다.
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3112)
const DB_PORT = Number(process.env.E2E_DB_PORT ?? 55442)
const INFO_PORT = Number(process.env.E2E_INFO_PORT ?? 55443)
const CDP_PORT = Number(process.env.E2E_CDP_PORT ?? 9223)
const BASE = `http://127.0.0.1:${WEB_PORT}`

//  Chrome 은 이 기계에 설치된 것을 쓴다. 없으면 **크게 실패한다** — 조용히 건너뛰면
//  「캡처 0장으로 통과」가 되고, 그건 이 단계가 막으려는 바로 그 상태다.
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter((p): p is string => typeof p === 'string' && p.length > 0)

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
/** Windows 는 자식의 자식(next 의 워커)까지 죽여야 포트가 풀린다 */
function killAll(): void {
  for (const c of children) {
    if (c.pid === undefined || c.exitCode !== null) continue
    try {
      spawn('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch { /* 이미 죽었다 */ }
  }
}

/** Chrome 이 죽은 뒤에 지울 임시 프로필 */
let profileDir = ''

async function main(): Promise<void> {
  mkdirSync(shotsDir, { recursive: true })

  const chrome = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (chrome === undefined) {
    throw new Error('Chrome 을 못 찾았다 — CHROME_PATH 로 알려 줘라 (헤드리스 캡처에 필요하다)')
  }

  // ① 씨앗 DB (PGlite → TCP). 게스트 데모까지 심는다.
  console.log('e2e: 씨앗 DB 를 띄운다…')
  track(spawn(process.execPath, [join(webRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'scripts/demo-server.ts'], {
    cwd: webRoot,
    stdio: 'ignore',
    //  🔴 `DEV_PIN=1` — id 와 시각을 결정론으로 박는다 (FINDINGS 161 · `test/helpers/pin.ts`).
    //     ★ 왜 여기만 켜나 — 이 그림은 **저장소에 커밋된다.** 안 박으면 매 관통마다
    //       `manifest_hash` 와 발행 시각 글자가 달라져서, 코드를 한 줄도 안 고친 바퀴의
    //       커밋에도 `.png` 두 장이 섞인다 (108바퀴가 픽셀로 재서 확정한 원인이다).
    env: {
      ...process.env,
      DEV_SEED: 'demo', DEV_PIN: '1',
      DEV_DB_PORT: String(DB_PORT), DEV_INFO_PORT: String(INFO_PORT),
    },
  }))
  await waitFor('씨앗 DB', async () => {
    try { return (await fetch(`http://127.0.0.1:${INFO_PORT}`)).ok } catch { return false }
  }, 180_000)

  // ② Next — 배포와 같은 길로 그 DB 를 본다 (`?max=1` 은 pglite-socket 이 한 소켓만 받기 때문)
  console.log('e2e: next dev 를 띄운다…')
  track(spawn(process.execPath, [join(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', String(WEB_PORT)], {
    cwd: webRoot,
    stdio: 'ignore',
    env: {
      ...process.env,
      DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?max=1`,
      SUPABASE_JWT_SECRET: TEST_JWT_SECRET,
    },
  }))
  await waitFor('next dev', async () => {
    try { return (await fetch(BASE)).ok } catch { return false }
  }, 240_000)

  // ③ 헤드리스 Chrome
  const profile = mkdtempSync(join(tmpdir(), 'ctxops-e2e-'))
  track(spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' }))

  let target: { webSocketDebuggerUrl: string } | undefined
  await waitFor('Chrome', async () => {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json() as
        { type: string; webSocketDebuggerUrl: string }[]
      target = list.find((t) => t.type === 'page')
      return target !== undefined
    } catch { return false }
  }, 60_000)
  if (target === undefined) throw new Error('Chrome 의 page 대상을 못 찾았다')

  const page: Cdp = await connectCdp(target.webSocketDebuggerUrl)
  await page.send('Page.enable')
  await page.send('Runtime.enable')

  // ④ 게스트 세션 — 제품과 같은 길이다 (`/demo` → 리다이렉트)
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await page.send('Page.navigate', { url: `${BASE}/demo` })
  let landed = ''
  await waitFor('게스트 세션', async () => {
    landed = (await page.evalJs<string>('location.pathname')) ?? ''
    return landed.includes(`/t/${DEMO_TENANT.teamSlug}/`)
  }, 180_000)
  check('게스트 세션이 붙는다 (/demo → 앱)', landed.includes(`/t/${DEMO_TENANT.teamSlug}/`), landed)

  // ⑤ 계획대로 한 장씩
  for (const shot of SHOT_PLAN) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: shot.width < 700,
    })
    await page.send('Page.navigate', { url: `${BASE}${shot.path}` })

    //  화면이 「그려질 때까지」 기다린다 — 고정 초를 세지 않는다.
    //  ⚠ next dev 는 그 화면을 **처음 열 때 컴파일한다.** 첫 방문이 수십 초일 수 있다.
    const visible = `(() => { const el = document.querySelector(${JSON.stringify(shot.needs)});
      return !!el && el.getClientRects().length > 0 })()`
    let shown = false
    try {
      await waitFor(`${shot.name} 의 ${shot.needs}`, async () => {
        shown = (await page.evalJs<boolean>(visible)) === true
        return shown
      }, 120_000)
    } catch { /* 아래 검사가 FAIL 로 적는다 */ }
    check(`${shot.name}: ${shot.needs} 가 보인다`, shown, shot.path)

    //  🔴 **껍데기가 떴다 ≠ 화면이 찍을 만하다.** 첫 판(103바퀴)이 그랬다 — `.main-inner` 는
    //     즉시 있어서 검사 셋이 다 초록인데, 캡처는 앱 화면 일곱 장이 전부 **skeleton** 이었다
    //     (16.6KB 짜리 거의 같은 그림). 랜딩에 그걸 붙이면 「제품이 도는 그림」이 아니라
    //     회색 막대 그림이다. 그래서 **로딩이 끝날 때까지** 기다리고, 그것도 센다.
    //     ⚠ 정본은 `components/states.tsx` 의 `.skeleton` 이다 (DESIGN_BRIEF §5 — loading 은
    //       문구 없는 skeleton). 다른 이름의 로딩 표시를 만들면 여기도 같이 고쳐라.
    const settled = `(() => document.querySelectorAll('.skeleton').length === 0)()`
    let loaded = false
    try {
      await waitFor(`${shot.name} 의 로딩`, async () => {
        loaded = (await page.evalJs<boolean>(settled)) === true
        return loaded
      }, 60_000)
    } catch { /* 아래 검사가 FAIL 로 적는다 */ }
    check(`${shot.name}: 로딩이 끝났다 (skeleton 0)`, loaded)

    //  ⚠ 「가로로 민다」만 말하면 다음 사람이 **범인을 찾느라** 한 바퀴를 쓴다.
    //    밀 때는 밖으로 나간 요소 셋을 같이 말한다 (101바퀴가 `.drawer` 를 손으로 찾았다).
    //  ⚠ **한 번만 재지 마라.** 랜딩 375px 을 한 번만 쟀더니 `overflowPx=1264` 가 나왔다가
    //    다음 판에 0 이었다 — 터미널 재생이 접히기 **전**을 잰 것이다. 거짓 빨강을 내는
    //    게이트는 곧 꺼진다 (FINDINGS 136 이 같은 이유로 상한을 옮겼다). 그래서 **가라앉을
    //    때까지** 재고, 안 가라앉으면 그때 마지막 값으로 FAIL 한다.
    const OVERFLOW_SETTLE_MS = 8_000
    const measureOverflow = (): Promise<{ px: number; who: string } | undefined> =>
      page.evalJs<{ px: number; who: string }>(`(() => {
      const de = document.documentElement
      const px = de.scrollWidth - de.clientWidth
      if (px <= 0) return { px, who: '' }
      const out = [...document.querySelectorAll('body *')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.width > 0 && x.r.right > de.clientWidth + 1)
        .sort((a, b) => b.r.right - a.r.right)
        .slice(0, 3)
        .map((x) => \`\${x.el.tagName.toLowerCase()}.\${(x.el.className || '').toString().split(' ').join('.')}@\${Math.round(x.r.right)}\`)
      return { px, who: out.join(' · ') }
    })()`)
    let overflow = await measureOverflow()
    const settleUntil = Date.now() + OVERFLOW_SETTLE_MS
    while (overflow?.px !== 0 && Date.now() < settleUntil) {
      await sleep(500)
      overflow = await measureOverflow()
    }
    check(`${shot.name}: 가로로 안 민다`, overflow?.px === 0,
      `overflowPx=${String(overflow?.px)} · ${shot.width}px${overflow?.who ? ` · 밖으로: ${overflow.who}` : ''}`)

    //  ⚠ next dev 는 화면 왼쪽 아래에 **자기 배지**(`<nextjs-portal>`)를 띄운다. 그건 제품이
    //    아니라 개발 서버의 표시라서, 랜딩에 붙일 그림에 들어가면 안 된다. 캡처 직전에만
    //    걷어낸다 — 제품 설정(`next.config.ts`)을 캡처 사정으로 고치지 않는다.
    await page.evalJs(`(() => { document.querySelectorAll('nextjs-portal').forEach((e) => e.remove()); return 1 })()`)
    const png = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const data = png.data as string | undefined
    const file = join(shotsDir, `${shot.name}.png`)
    if (typeof data === 'string') writeFileSync(file, Buffer.from(data, 'base64'))
    const bytes = existsSync(file) ? statSync(file).size : 0
    //  ⚠ 빈 PNG 도 파일은 만들어진다. **크기**를 봐야 「찍혔다」다.
    check(`${shot.name}: 캡처가 남았다`, bytes > 5_000, `${bytes} bytes`)
  }

  // ⑥ GATE 3 — **빈 창에서 링크만으로 3분** (PLAN P4 둘째 행의 완료 기준 · `e2e/gate3.ts`)
  //  ⚠ 여기가 마지막인 이유 — 위 ⑤ 가 화면을 전부 한 번씩 열어 `next dev` 를 데워 놨다.
  //    안 데운 채로 재면 3분의 대부분이 **컴파일 시간**이라 이 게이트가 아무 말도 못 한다.
  //  ⚠ `Target.*` 는 **브라우저** 끝점의 일이다 — 위 page 연결로는 못 부른다 (`cdp.ts`).
  const version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json() as
    { webSocketDebuggerUrl: string }
  const browser = await connectCdp(version.webSocketDebuggerUrl)
  try {
    await runGate3({
      browser,
      cdpPort: CDP_PORT,
      origin: BASE,
      base: DEMO_BASE,
      shotsDir,
      jsonPath: join(repoRoot, '.ci', 'gate3.json'),
      check,
    })
  } finally {
    browser.close()
  }

  //  ⚠ 프로필 폴더는 **Chrome 을 죽인 뒤에** 지운다 — 살아 있으면 EBUSY 다
  //    (첫 판에서 그 EBUSY 하나 때문에 28 초록 뒤에 단계가 빨개졌다).
  profileDir = profile
}

let failedEarly = ''
try {
  await main()
} catch (err) {
  failedEarly = err instanceof Error ? err.message : String(err)
  check('하네스가 끝까지 돌았다', false, failedEarly)
} finally {
  killAll()
  await sleep(1_000)
  if (profileDir !== '') { try { rmSync(profileDir, { recursive: true, force: true }) } catch { /* 남아도 임시 폴더다 */ } }
}

const passed = checks.filter((c) => c.ok).length
const failed = checks.length - passed
console.log('')
//  🔴 관통이 이 줄을 읽는다 (`count_log`). 모양을 바꾸면 walkthrough.ps1 도 같이 고쳐라.
console.log(shotsSummary(passed, failed))
//  ⚠ 자식(next dev)이 남아 있으면 프로세스가 안 끝난다. taskkill 은 비동기라 조금 기다린다.
await sleep(1_500)
process.exit(failed > 0 ? 1 : 0)
