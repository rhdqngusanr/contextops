import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type Cdp, sleep, waitFor } from '../e2e/cdp'
import { connectPage, launchChrome } from '../e2e/chrome'
import { APP_SHELL, DEMO_BASE } from '../e2e/plan'

// =====================================================================
//  제출 폼의 스크린샷 다섯 장 — production 을 **16:9** 로 찍는다 (2026-09-14)
//
//    pnpm --filter web exec tsx scripts/submission-shots.ts --url https://<production>
//
//  ★ 왜 있나 — 실제 제출 폼(`event.wanted.co.kr/ai-championship/2026/apply`)의 「스크린샷 등록」이
//    필수이고 「16:9 비율 · 최대 5개」다. 관통이 찍는 그림(`e2e/shots.ts`)은 1440×900(16:10)이라 그대로 못 쓴다.
//    손으로 찍으면 화면이 바뀐 날 아무도 모르므로 스크립트로 둔다 — 다시 돌리면 같은 이름으로 덮인다.
//    `docs/SUBMISSION.md` 「스크린샷」 칸이 그 이름을 가리키고 `test/readme.test.ts` 가 파일이 있고 16:9 인지 잰다.
//  ★ 들어가는 길은 심사위원과 같다 — `/demo` 로 게스트 세션을 받는다. 인증을 우회하는 문을 쓰지 않는다.
//  ⚠ 둘째 장은 **진짜 AI 를 한 번 부른다** (게스트 체험 `POST /demo/ai-once` · 저장 안 됨 · IP 하루 상한 안 · 한 번에 약 $0.003).
//  ⚠ 주소를 지어내지 않는다 — Pack 은 목록 화면의 「Pack 보기」를 **눌러서** 연다 (판 번호를 여기 적지 않는다).
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')

function arg(name: string, fallback?: string): string {
  const at = process.argv.indexOf(`--${name}`)
  const value = at === -1 ? fallback : process.argv[at + 1]
  if (value === undefined) throw new Error(`--${name} 이 필요하다`)
  return value
}

const ORIGIN = arg('url').replace(/\/$/, '')
const OUT = join(repoRoot, arg('out', 'docs/evidence/2026-09-14-submission-form'))
const CDP_PORT = Number(process.env.SUBMISSION_CDP_PORT ?? 9241)
/** 폼이 요구하는 16:9. 두 배로 찍어 글자가 뭉개지지 않게 한다 (3200×1800). */
const VIEW = { width: 1600, height: 900, deviceScaleFactor: 2 } as const

/**
 * 그 화면의 표지가 보이고, skeleton 이 0 이고, **화면 안의** 그림·글꼴을 다 받을 때까지 — 고정 초를 세지 않는다.
 * ⚠ 화면 밖 그림은 세지 않는다 — 랜딩 아래쪽 그림은 `loading="lazy"` 라 스크롤 전엔 영영 안 받는다(첫 판이 60초를 다 쓰고 죽었다).
 */
async function settled(page: Cdp, needs: string): Promise<void> {
  await waitFor(`${needs} 가 보인다`, async () =>
    (await page.evalJs<boolean>(`document.querySelector(${JSON.stringify(needs)}) !== null`)) === true, 60_000)
  const inView = `[...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight })`
  await waitFor('로딩이 끝났다 (skeleton 0 · 화면 안 그림을 다 받았다)', async () =>
    (await page.evalJs<boolean>(`document.querySelectorAll('.skeleton').length === 0 && ${inView}.every((i) => i.complete)`)) === true, 60_000)
  await page.evalJs('document.fonts.ready.then(() => true)')
  await sleep(800)
}

async function open(page: Cdp, path: string, needs: string): Promise<void> {
  await page.send('Page.navigate', { url: `${ORIGIN}${path}` })
  await sleep(500)
  await settled(page, needs)
}

async function capture(page: Cdp, name: string): Promise<void> {
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  if (typeof shot.data !== 'string') throw new Error(`${name}: 캡처가 비었다`)
  const file = join(OUT, `${name}.png`)
  writeFileSync(file, Buffer.from(shot.data, 'base64'))
  console.log(`  ${name}.png · ${Math.round(statSync(file).size / 1024)}KB`)
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  const chrome = await launchChrome(CDP_PORT, { lang: 'ko' })
  try {
    const page = await connectPage(CDP_PORT)
    await page.send('Emulation.setDeviceMetricsOverride', { ...VIEW, mobile: false })
    //  헤드리스 창의 스크롤 막대는 제품이 아니라 브라우저의 것이다 — 제출 그림 오른쪽 끝에 회색 띠로 남는다.
    await page.send('Emulation.setScrollbarsHidden', { hidden: true })

    //  ① 첫 화면 — 문제(같은 질문에 사람마다 다른 답)가 보이는 자리
    await open(page, '/', '.btn-primary')
    await capture(page, '1-landing')

    //  게스트 세션 — 심사위원과 같은 길 (`/demo` → 정리 화면)
    await page.send('Page.navigate', { url: `${ORIGIN}/demo` })
    await waitFor('게스트 세션', async () =>
      ((await page.evalJs<string>('location.pathname')) ?? '').startsWith(DEMO_BASE), 60_000)

    //  ② 정리 — 고른 메모 하나로 AI 에게 지금 찾게 한다
    await open(page, `${DEMO_BASE}/review`, '[data-demo-ai]')
    const pressed = await page.evalJs<boolean>(
      `(() => { const b = document.querySelector('[data-demo-ai] .row.wrap button'); if (!b) return false; b.click(); return true })()`)
    if (pressed !== true) throw new Error('AI 체험 칸의 메모 버튼이 없다')
    const phaseJs = `document.querySelector('[data-demo-ai]')?.getAttribute('data-demo-ai') ?? ''`
    await waitFor('AI 결과', async () => ['done', 'failed'].includes((await page.evalJs<string>(phaseJs)) ?? ''), 90_000)
    const phase = await page.evalJs<string>(phaseJs)
    if (phase !== 'done') throw new Error(`AI 체험이 끝나지 않았다 (${phase ?? '?'}) — 오늘 상한이면 내일 다시 돌려라`)
    await sleep(800)
    await capture(page, '2-review-ai')

    //  ③ Pack Explorer — 목록에서 첫 「Pack 보기」(공식 판)를 눌러 연다
    await open(page, `${DEMO_BASE}/packs`, APP_SHELL)
    const opened = await page.evalJs<boolean>(`(() => {
      const el = [...document.querySelectorAll('a, button')].find((e) => (e.textContent ?? '').trim() === 'Pack 보기')
      if (!el) return false
      el.click()
      return true
    })()`)
    if (opened !== true) throw new Error('「Pack 보기」가 없다')
    await settled(page, '.pack-doc')
    //  첫 파일(기본으로 열리는 CLAUDE.md)의 **첫 문단**을 눌러 출처를 띄운다.
    //  ⚠ 코드 줄까지 근거로 붙은 문단(재시도 정책)을 고르고 싶었지만 그 문단은 화면 아래에 있고, 출처 패널은 스크롤을 따라오지 않는다
    //    (sticky 가 아니다 · 2026-09-14 실측: 파일 8개 어디에서도 그 문단이 화면 위쪽에 없었다). 끌어올리면 패널이 화면 밖으로 나가 그림이 말을 못 한다.
    const picked = await page.evalJs<boolean>(`(() => { const el = document.querySelector('.pack-block'); if (!el) return false; el.click(); return true })()`)
    if (picked !== true) throw new Error('누를 문단이 없다')
    await waitFor('출처 패널', async () =>
      (await page.evalJs<boolean>(`document.querySelector('.pack-side h3') !== null`)) === true, 30_000)
    await sleep(600)
    await capture(page, '3-pack-trace')

    //  ④ Roadmap · ⑤ Sync
    await open(page, `${DEMO_BASE}/roadmap`, APP_SHELL)
    await capture(page, '4-roadmap')
    await open(page, `${DEMO_BASE}/sync`, APP_SHELL)
    await capture(page, '5-sync')
    page.close()
  } finally {
    //  Windows 는 자식의 자식까지 죽여야 포트·프로필이 풀린다 (`e2e/shots.ts` 의 killAll 과 같은 이유).
    spawn('taskkill', ['/pid', String(chrome.child.pid), '/T', '/F'], { stdio: 'ignore' })
    await sleep(1500)
    try { rmSync(chrome.profileDir, { recursive: true, force: true }) } catch { /* 아직 쥐고 있으면 임시 폴더에 남긴다 */ }
  }
}

main().then(() => process.exit(0), (error: unknown) => {
  console.error(error)
  process.exit(1)
})
