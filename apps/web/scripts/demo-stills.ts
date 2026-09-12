import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { connectPage, launchChrome } from '../e2e/chrome'
import { sleep, waitFor, type Cdp } from '../e2e/cdp'
import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { LOCALE_COOKIE, isLocale, type Locale } from '../src/lib/i18n/locale'

// =====================================================================
//  apps/web/scripts/demo-stills.ts — **읽히는 컷**을 고해상으로 찍는다 (2026-09-13)
//
//  🔴 왜 화면 녹화를 버렸나 — 앞서 만든 38초 클립은 **480px 에서 제품 글자를 한 자도
//     못 읽었다.** 전체 페이지(1424×860)를 한 번에 담으니 정작 중요한 「5회 vs 3회」가
//     화면의 1% 였다. 자막은 「AI 마다 답이 다릅니다」라고 말하는데 눈은 그 근거를
//     찾을 수가 없다 — 말과 그림이 같은 데를 가리키지 않는 영상이었다.
//
//  ★ 그래서 규칙이 하나다: **한 컷에 한 생각, 그리고 그것만 화면에.**
//    아래 표의 한 줄이 한 컷이고, `clip` 이 그 생각을 담은 **요소 하나**를 가리킨다.
//    페이지를 찍고 나중에 자르는 것이 아니라, **처음부터 그 요소만** 찍는다.
//
//  ★ `scale: 2` 로 찍는다 — 후처리에서 느린 줌을 넣어도 흐려지지 않는다.
//    화면 녹화로는 이걸 못 한다 (모니터의 물리 픽셀이 천장이다). 그게 스틸로 옮긴 둘째 이유다.
//
//  ⚠ 여기는 **찍기만** 한다. 움직임·자막·이어붙이기는 `tools/make-video.ps1` 이다 —
//    한 파일이 둘을 다 하면 컷을 하나 고칠 때마다 영상 전체를 다시 만들어야 한다.
//
//  실행:
//    pnpm --filter web demo:stills                  (한국어 · production)
//    pnpm --filter web demo:stills -- --locale en
// =====================================================================

const DEFAULT_ORIGIN = 'https://contextops-rosy.vercel.app'
const CDP_PORT = 9334

/** 레이아웃 기준 폭. 이 폭에서 카드가 두 열로 서므로 컷의 구도가 예측 가능하다. */
const VIEWPORT = { width: 1440, height: 900 }

/** 찍는 배율. 2 면 640px 짜리 카드가 1280px 로 남아 1080p 안에서 확대해도 선명하다. */
const SCALE = 2

const BASE = `/t/${DEMO_TENANT.teamSlug}/p/${DEMO_TENANT.projectSlug}`

/**
 * 🔴 **컷 표 — 이 파일의 전부다.** 한 줄이 한 컷이고, 차례가 곧 이야기다.
 *
 * ★ 이야기: 질문 하나 → A 는 5회 → B 는 3회 → 둘 다 맞았는데 팀은 갈렸다 →
 *   승인된 한 줄 → AI 는 판정하지 않고 묻는다 → 진행은 근거와 함께 → 기기마다 같은 버전.
 *   **추상적인 주장을 먼저 하지 않는다** — 장면을 보여 주고 자막이 이름을 붙인다.
 *
 * ⚠ `clip` 의 선택자가 없어지면 **크게 실패한다.** 조용히 건너뛰면 컷이 빠진 영상이
 *   만들어지고, 그건 보기 전에는 모른다.
 * ⚠ 컷을 더하면 `tools/make-video.ps1` 의 자막 표에도 한 줄이다 — 그 표가 초를 정한다.
 */
type Shot = {
  /** 파일 이름이 된다. 앞의 번호가 곧 차례다. */
  readonly name: string
  /** 열 주소 (`/` 이거나 프로젝트 화면). */
  readonly path: string
  /** 이 컷의 주인공 — **이 요소만** 찍는다. */
  readonly clip: string
  /** 주인공 주위에 남길 여백(px). 너무 딱 맞게 자르면 답답하다. */
  readonly pad?: number
  /** 찍기 전에 눌러야 하면. */
  readonly click?: string
  /**
   * 선택자가 여럿을 잡을 때 **몇 번째**인가 (0부터).
   * ⚠ `:nth-of-type` 을 쓰지 마라 — CSS 모듈이 이름을 해시해서 `[class*="reply"]` 가
   *   `_reply_`·`_replyBody_`·`_replyMeta_` 를 **다 물고**, 거기에 `:nth-of-type` 을 걸면
   *   엉뚱한 안쪽 요소가 잡힌다 (2026-09-13 에 304×122 짜리 컷이 그렇게 나왔다).
   */
  readonly nth?: number
  /**
   * 🔴 **이 컷만 좁은 폭에서 찍는다** (CSS px · 2026-09-13).
   *
   * ★ 왜 필요한가 — 가로로 긴 것(버튼 줄·질문 한 줄·표)은 1440 폭에서 1100px 이 넘는다.
   *   그걸 1920 캔버스에 맞추면 **오히려 축소**되고, 480px 로 볼 때 글자가 5px 이 된다.
   *   폭을 좁히면 같은 내용이 **접혀서** 작은 덩이가 되고, 확대해도 남는다.
   * ★ 기준: **잡는 CSS 폭이 600px 쯤**이면 1680 칸에 2.8배로 확대돼 480px 에서도 읽힌다.
   *   좁은 칸(Before/After 카드 ~490px)이 잘 읽힌 이유가 그것이다.
   */
  readonly viewport?: number
  /**
   * 클립 높이의 상한 (CSS px). 넘으면 **아래를 자른다.**
   * ★ 왜 — 표처럼 긴 것은 다 담으면 세로에 갇혀 글자가 작아진다. 잘린 표는
   *   「목록이 더 있다」로 읽히므로 거짓이 아니다.
   */
  readonly maxH?: number
}

const SHOTS: readonly Shot[] = [
  //  ── 문제: 같은 질문, 다른 답 ────────────────────────────────────
  //  질문 한 줄만. 이 컷이 영상의 전제다 — 「이걸 물었다」.
  //  ⚠ 좁은 폭에서 찍는다 — 1440 에서는 이 한 줄이 1184px 이라 확대가 안 된다 (`viewport` 주석).
  { name: '01-question', path: '/', clip: '[class*="ask_"]', pad: 8, viewport: 620 },
  //  A(5회)와 B(3회)를 **따로** 찍는다. 같이 담으면 둘 다 작아져서 못 읽는다.
  //  ⚠ `thread` 의 **직계 자식**으로 고른다 — 안쪽 `replyBody`·`replyMeta` 가 안 잡히게.
  //  ⚠ `.thread` 는 Before·After 두 곳에 있다. 앞의 둘이 Before 의 A·B 다 (DOM 차례).
  { name: '02-answer-a', path: '/', clip: '[class*="thread_"] > div', nth: 0, pad: 10 },
  { name: '03-answer-b', path: '/', clip: '[class*="thread_"] > div', nth: 1, pad: 10 },
  //  「둘 다 틀리지 않았는데 팀은 둘로 갈립니다」 — 문제를 닫는 한 줄.
  { name: '04-split', path: '/', clip: '[class*="paneBefore"] [class*="paneFoot"]', pad: 14 },

  //  ── 답: 승인된 한 줄, 그리고 그 근거 ───────────────────────────
  //  🔴 승인 카드를 **둘로 갈랐다** (2026-09-13). 한 카드에 「규칙 문장」과 「근거 목록」이라는
  //     두 생각이 있어서, 통째로 찍으면 1036px 짜리가 세로 칸에 갇혀 글자가 작아진다.
  //     한 컷에 한 생각이면 둘 다 읽힌다.
  { name: '05-approved', path: '/', clip: '[class*="paneAfter"] [class*="thread_"]', pad: 14 },
  { name: '06-evidence', path: '/', clip: '[class*="paneAfter"] [class*="evidence"]', pad: 18 },

  //  ── 어떻게: AI 는 묻고, 사람이 고른다 ──────────────────────────
  //  ⚠ 충돌 카드도 통째로 찍지 않는다 — 어긋난 규칙과 결정 버튼은 다른 생각이다.
  //    이 둘이 이 제품의 주장(「AI 는 판정하지 않는다」)을 나눠 들고 있다.
  //  🔴 **두 열 비교(`.sides`)는 쓰지 않는다** (2026-09-13 · 두 번 시도하고 버렸다) —
  //     1440 폭에서 1121px 짜리라 1920 캔버스에서 1.5배가 천장이고, 480px 로 볼 때 0.37배가
  //     되어 글자가 죽는다. 좁은 폭에서 찍으면 두 열이 위아래로 접혀 836px 짜리 세로 덩이가
  //     되고 그것도 안 읽힌다. **폭이 필요한 비교는 이 캔버스에 안 들어간다.**
  //     ★ 대신 제품이 이미 갖고 있는 **쉬운 말 한 줄**을 쓴다 — 그 문장이 충돌을 글로 말한다
  //       (「지금 적용 중인 규칙은 …5번까지…, 옛 문서에는 …」). 좁고 읽힌다.
  { name: '07-conflict', path: `${BASE}/review`, clip: '.conflict-card .conflict-plain', pad: 10, viewport: 700 },
  //  ⚠ 버튼 줄은 넓다 — 좁은 폭에서 접히게 해야 글자가 남는다.
  { name: '08-decide', path: `${BASE}/review`, clip: '.conflict-card .row.items-start.wrap', pad: 22, viewport: 760 },

  //  ── 결과: 근거로 채워지는 계획, 기기마다 같은 버전 ─────────────
  { name: '09-roadmap', path: `${BASE}/roadmap`, clip: '[class*="milestone"]', pad: 20, viewport: 860 },
  //  ⚠ 표는 아래를 자른다 — 다 담으면 세로에 갇혀 글자가 작아진다. 잘린 표는 「더 있다」로 읽힌다.
  { name: '10-sync', path: `${BASE}/sync`, clip: 'table', pad: 20, viewport: 880, maxH: 280 },
]

// ---------------------------------------------------------------------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/** 요소의 **문서 좌표** 사각형. 스크롤을 더해야 `captureBeyondViewport` 와 자리가 맞는다. */
async function rectOf(page: Cdp, selector: string, pad: number, nth = 0, maxH?: number): Promise<{ x: number; y: number; width: number; height: number }> {
  const r = await page.evalJs<{ x: number; y: number; w: number; h: number } | null>(`(() => {
    const el = document.querySelectorAll(${JSON.stringify(selector)})[${nth}]
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height }
  })()`)
  if (r === null || r === undefined) throw new Error(`컷의 주인공을 못 찾았다: ${selector}`)
  if (r.w < 40 || r.h < 20) throw new Error(`컷의 주인공이 너무 작다 (${Math.round(r.w)}×${Math.round(r.h)}): ${selector}`)
  const height = maxH === undefined ? r.h + pad * 2 : Math.min(r.h + pad * 2, maxH)
  return {
    x: Math.max(0, r.x - pad),
    y: Math.max(0, r.y - pad),
    width: r.w + pad * 2,
    height,
  }
}

async function main(): Promise<void> {
  const origin = (arg('origin') ?? DEFAULT_ORIGIN).replace(/\/$/, '')
  const localeArg = arg('locale') ?? 'ko'
  if (!isLocale(localeArg)) throw new Error(`--locale 은 ko 또는 en 이다 (받은 값: ${localeArg})`)
  const locale: Locale = localeArg

  const outDir = arg('out') ?? join(process.cwd(), '..', '..', '.ci', 'video', `stills-${locale}`)
  mkdirSync(outDir, { recursive: true })
  console.log(`\n  컷 ${SHOTS.length}장 — ${origin} · ${locale} · ${SCALE}배\n  → ${outDir}\n`)

  const { child, profileDir } = await launchChrome(CDP_PORT, {
    windowSize: VIEWPORT,
    lang: locale === 'en' ? 'en-US' : 'ko-KR',
  })
  const page = await connectPage(CDP_PORT)

  try {
    //  🔴 언어는 사람이 토글을 누르는 것과 **같은 길**(쿠키)로 정한다.
    await page.send('Page.navigate', { url: `${origin}/` })
    await sleep(2500)
    await page.evalJs(`(() => {
      document.cookie = ${JSON.stringify(`${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`)}
      return 1
    })()`)

    //  게스트 세션을 받는다 — 앱 화면은 이것 없이 못 연다. 랜딩의 accent 를 누르는 것과 같은 문이다.
    await page.send('Page.navigate', { url: `${origin}/demo` })
    await waitFor('게스트 데모 입장', async () => {
      const here = await page.evalJs<string>('location.pathname')
      return typeof here === 'string' && here.startsWith(BASE)
    }, 60_000)

    let at = ''
    let width = VIEWPORT.width
    for (const shot of SHOTS) {
      //  ⚠ 폭이 바뀌면 레이아웃이 다시 흐르므로 **주소를 다시 열어야** 한다 — 안 그러면
      //    바뀐 폭에 옛 레이아웃이 남아 클립 자리가 어긋난다.
      const want = shot.viewport ?? VIEWPORT.width
      if (want !== width) {
        await page.send('Emulation.setDeviceMetricsOverride', {
          width: want, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false,
        })
        width = want
        at = ''
      }
      if (shot.path !== at) {
        await page.send('Page.navigate', { url: `${origin}${shot.path}` })
        //  ⚠ skeleton 이 사라질 때까지 — 뼈대가 찍히면 그 컷은 「덜 만든 화면」으로 보인다.
        await waitFor(`${shot.name} 그려짐`, async () =>
          (await page.evalJs<number>('document.querySelectorAll(".skeleton").length')) === 0, 45_000)
        await sleep(600)
        at = shot.path
      }
      if (shot.click !== undefined) {
        await page.evalJs(`(() => { document.querySelector(${JSON.stringify(shot.click)})?.click(); return 1 })()`)
        await sleep(800)
      }

      //  🔴 **주인공을 먼저 화면에 들인다** — 그래야 그 자리의 레이지 그림이 받아진다.
      //     ★ 왜 (2026-09-13 에 여기서 죽었다) — 첫 판은 「모든 그림이 complete」를 기다렸는데,
      //       `loading="lazy"` 그림은 스크롤 전엔 **영원히 complete 가 아니다.** 45초를 기다렸다 죽는다.
      await page.evalJs(`(() => {
        const el = document.querySelectorAll(${JSON.stringify(shot.clip)})[${shot.nth ?? 0}]
        if (el) el.scrollIntoView({ block: 'center' })
        return 1
      })()`)
      await sleep(400)
      //  ⚠ 지금 **보이는 자리의** 그림만 기다린다. 빈 칸이 찍힌 컷은 「고장」으로 보인다.
      await waitFor(`${shot.name} 그림`, async () => (await page.evalJs<boolean>(`
        [...document.images]
          .filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight })
          .every((i) => i.complete)
      `)) === true, 30_000)

      const clip = await rectOf(page, shot.clip, shot.pad ?? 20, shot.nth ?? 0, shot.maxH)
      const png = await page.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { ...clip, scale: SCALE },
      })
      const data = png.data as string | undefined
      if (typeof data !== 'string') throw new Error(`${shot.name}: 캡처가 안 왔다`)
      const bytes = Buffer.from(data, 'base64')
      //  ⚠ 빈 PNG 도 파일은 만들어진다. **크기**를 봐야 찍혔다고 할 수 있다.
      if (bytes.length < 5_000) throw new Error(`${shot.name}: 캡처가 너무 작다 (${bytes.length} bytes)`)
      writeFileSync(join(outDir, `${shot.name}.png`), bytes)
      console.log(`  ${shot.name}  ${Math.round(clip.width * SCALE)}×${Math.round(clip.height * SCALE)}  ${(bytes.length / 1024).toFixed(0)} KB`)
    }
    console.log(`\n  됐다 — 다음: tools/make-video.ps1\n`)
  } finally {
    child.kill()
    await sleep(1000)
    try { (await import('node:fs')).rmSync(profileDir, { recursive: true, force: true }) } catch { /* 임시 폴더다 */ }
  }
}

main().catch((err: unknown) => {
  console.error(`\n  컷 찍기 실패: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exitCode = 1
})
