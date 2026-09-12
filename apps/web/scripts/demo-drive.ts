import { connectPage, launchChrome } from '../e2e/chrome'
import { sleep, waitFor, type Cdp } from '../e2e/cdp'
import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { LOCALE_COOKIE, isLocale, type Locale } from '../src/lib/i18n/locale'

// =====================================================================
//  apps/web/scripts/demo-drive.ts — **화면이 스스로 연기하게 한다** (2026-09-12)
//
//  ★ 왜 생겼나 — 데모 영상에서 제일 어려운 것은 촬영이 아니라 **운전**이다. 2분을 한 번에
//    찍으면 마우스가 흔들리고, 로딩이 판마다 다르고, 한 군데 틀리면 처음부터다.
//    이 저장소에는 이미 production 을 **진짜로 클릭해서** 훑는 코드가 있다 (`e2e/gate3.ts` ·
//    6.9초에 네 화면). 그걸 **사람 눈 속도**로 늦춰서 보이는 창에 띄우면, 사람이 할 일은
//    녹화 버튼을 누르는 것뿐이다. 망친 판은 다시 돌리면 그만이다.
//
//  🔴 **이 스크립트는 화면에 아무것도 덧그리지 않는다.** 가짜 커서도, 강조 테두리도,
//     자막도 없다. 찍히는 것은 **제품이 실제로 그리는 것**뿐이다.
//     ★ 왜 — 이 저장소의 규칙이 「화면이 거짓을 말하지 않는다」이고, 그 규칙은 녹화에도
//       그대로다. 설명이 필요하면 **자막을 나중에 얹는다** (`docs/PITCH.md` §6 의 ffmpeg).
//     ⚠ 그래서 커서가 안 보인다. 눈을 끄는 것은 스크롤과 화면 전환이다 — 무음 제품 클립의
//       흔한 모양이고, 가짜 커서보다 정직하다.
//
//  ★ 누르는 방법이 `evalJs(el.click())` 이 아니라 **진짜 마우스 사건**(`Input.dispatchMouseEvent`)인 이유 —
//    그래야 hover·active 상태가 실제로 뜬다. JS 클릭만 하면 버튼이 눌리는 모양이 영상에 안 나온다.
//
//  실행:
//    pnpm --filter web demo:drive                      (production · 한국어)
//    pnpm --filter web demo:drive -- --locale en       (영어 — 레딧용)
//    pnpm --filter web demo:drive -- --origin http://localhost:3000
//    pnpm --filter web demo:drive -- --hold 1.5        (모든 멈춤을 1.5배로 · 내레이션 녹음용)
// =====================================================================

const DEFAULT_ORIGIN = 'https://contextops-rosy.vercel.app'
const CDP_PORT = 9333

/** 창 크기. 세로는 앱 창이라 장식이 없어 그대로 페이지다. 16:10 — 유튜브·레딧 둘 다 무난하다. */
const WINDOW = { width: 1440, height: 900 }

/**
 * 컷 하나. `hold` 는 **그 화면에 머무는 초**다 (도착한 뒤부터 센다).
 *
 * ⚠ 초를 여기서 정하는 이유 — 「몇 초짜리 영상인가」는 자막·편집이 따라야 하는 값이라
 *   한 곳에 있어야 한다. 이 표를 고치면 `docs/PITCH.md` §6 의 자막 시각도 같이 고쳐라
 *   (그 문서가 이 표를 옮겨 적은 것이다).
 */
type Beat = {
  readonly name: string
  /** 이 컷에서 사람이 읽어야 하는 것 — 터미널에만 찍힌다 (화면에는 안 나온다). */
  readonly cue: string
  readonly hold: number
  /** 누를 것. 없으면 그 자리에 머물기만 한다. */
  readonly click?: string
  /** 클릭 전에 여기까지 부드럽게 내려간다 (CSS 선택자 또는 픽셀). */
  readonly scrollTo?: string | number
  /** 도착 판정 — 주소가 이 정규식과 맞아야 다음 컷으로 간다. */
  readonly arriveAt?: RegExp
}

const BASE = `/t/${DEMO_TENANT.teamSlug}/p/${DEMO_TENANT.projectSlug}`

/**
 * 🔴 **25초 무음 클립의 컷 표** — 제품의 이야기를 여섯 장면으로.
 *
 * ★ 차례가 곧 주장이다: 문제(같은 팀 다른 답) → AI 가 어긋남을 **질문으로** → 사람이 승인한 규칙 →
 *   진행이 **근거와 함께** → 기기마다 같은 버전. 마지막 장면이 「그래서 무엇이 달라지나」다.
 * ⚠ 컷을 더하면 초가 는다 — 25초는 레딧·투표 페이지에서 끝까지 보는 한계에 맞춘 값이다.
 *   2분짜리가 필요하면 컷을 늘리지 말고 `--hold` 를 키워라 (내레이션이 들어갈 자리가 그것이다).
 */
const BEATS: readonly Beat[] = [
  {
    name: '랜딩 · 머리',
    cue: '한 줄이 무엇을 하는 물건인지 말한다',
    hold: 4,
  },
  {
    name: '랜딩 · Before/After',
    cue: '같은 질문에 두 사람의 AI 가 다른 답을 한다 → 승인된 한 줄',
    scrollTo: '#landing-compare',
    hold: 6,
  },
  {
    name: '정리 화면',
    cue: '[샘플 팀으로 둘러보기] → AI 가 찾은 충돌 카드',
    click: '.btn-primary',
    arriveAt: /\/review(\/|$)/,
    hold: 5,
  },
  {
    name: 'Context',
    cue: '팀장이 승인한 규칙 목록',
    click: `a.nav-link[href="${BASE}/context"]`,
    arriveAt: /\/context$/,
    hold: 4,
  },
  {
    name: 'Roadmap',
    cue: '마일스톤이 근거로 채워진다 · 완료 확인은 사람',
    click: `a.nav-link[href="${BASE}/roadmap"]`,
    arriveAt: /\/roadmap$/,
    hold: 4,
  },
  {
    name: 'Sync',
    cue: '기기마다 어느 버전을 받았나',
    click: `a.nav-link[href="${BASE}/sync"]`,
    arriveAt: /\/sync$/,
    hold: 4,
  },
]

// ---------------------------------------------------------------------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/** 화면 가운데를 **진짜 마우스 사건**으로 누른다 — hover·active 가 실제로 뜬다. */
async function clickLike(page: Cdp, selector: string): Promise<void> {
  //  🔴 **이미 보이면 스크롤하지 않는다** (2026-09-12).
  //     ★ 왜 — 첫 판이 여기서 죽었다. 내비 링크는 늘 보이는데도 `scrollIntoView` 를 부르면
  //       부드러운 스크롤이 도는 **중에** 좌표를 재게 되고, 재는 순간과 누르는 순간의 자리가
  //       달라 클릭이 허공에 떨어진다. 그러면 「도착 안 함」으로 30초 뒤에 죽는다 —
  //       녹화 중이었다면 테이크가 날아간다.
  //     ⚠ 덤으로 영상도 나아진다: 옆 내비를 누르려고 본문이 덜컥 움직이는 장면이 사라진다.
  const needsScroll = await page.evalJs<boolean>(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return false
    const r = el.getBoundingClientRect()
    return !(r.top >= 0 && r.bottom <= window.innerHeight)
  })()`)
  if (needsScroll === true) {
    await page.evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return 1
    })()`)
    //  ⚠ 부드러운 스크롤이 **끝난 뒤에** 잰다 — 멈춘 것을 확인하고 넘어간다 (초를 지어내지 않는다).
    await waitFor('스크롤이 멈춤', async () => {
      const a = await page.evalJs<number>('window.scrollY')
      await sleep(250)
      const b = await page.evalJs<number>('window.scrollY')
      return a === b
    }, 10_000)
  }

  //  🔴 **좌표에 정말 그것이 있는지 확인한다** (`elementFromPoint`).
  //     ★ 왜 (2026-09-12 에 실제로 걸렸다) — 좌표는 맞는데 그 위에 다른 것이 덮여 있으면
  //       클릭은 「성공」하고 아무 일도 안 일어난다. 그러면 30초 뒤 「도착 안 함」으로만 죽어서
  //       원인이 안 보인다. 무엇이 덮었는지를 여기서 말하게 한다.
  const at = await page.evalJs<{ x: number; y: number; hits: boolean; onTop: string } | null>(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = Math.round(r.left + r.width / 2)
    const y = Math.round(r.top + r.height / 2)
    const top = document.elementFromPoint(x, y)
    const hits = top !== null && (top === el || el.contains(top) || top.contains(el))
    const onTop = top === null ? '(없음)' : top.tagName.toLowerCase() + (top.className ? '.' + String(top.className).split(' ').join('.') : '')
    return { x, y, hits, onTop }
  })()`)
  if (at === null || at === undefined) throw new Error(`누를 것을 못 찾았다: ${selector}`)
  if (!at.hits) throw new Error(`누를 자리를 다른 것이 덮고 있다: ${selector} 위에 «${at.onTop}» (${at.x},${at.y})`)

  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y })
  //  hover 가 눈에 보이게 한 박자 — 영상에서 「눌리는구나」가 읽히는 자리다.
  await sleep(500)
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 })
  }
}

/** skeleton 이 사라질 때까지 — 「다 그려졌다」의 판정은 GATE 3 과 같은 것을 쓴다. */
async function drawn(page: Cdp): Promise<void> {
  await waitFor('화면이 다 그려짐', async () =>
    (await page.evalJs<number>('document.querySelectorAll(".skeleton").length')) === 0, 30_000)
}

async function main(): Promise<void> {
  const origin = (arg('origin') ?? DEFAULT_ORIGIN).replace(/\/$/, '')
  const localeArg = arg('locale') ?? 'ko'
  if (!isLocale(localeArg)) throw new Error(`--locale 은 ko 또는 en 이다 (받은 값: ${localeArg})`)
  const locale: Locale = localeArg
  const holdScale = Number(arg('hold') ?? '1')
  if (!Number.isFinite(holdScale) || holdScale <= 0) throw new Error('--hold 는 양수다')

  const total = BEATS.reduce((s, b) => s + b.hold, 0) * holdScale
  console.log(`\n  ContextOps 데모 운전 — ${origin} · ${locale} · 약 ${Math.round(total)}초\n`)

  const { child, profileDir } = await launchChrome(CDP_PORT, {
    headed: true,
    windowSize: WINDOW,
    //  앱 창으로 연다 — 탭 줄도 주소창도 없다. 창 전체가 곧 페이지라 녹화할 때 자를 것이 없다.
    appUrl: `${origin}/`,
    //  ⚠ 브라우저 언어를 화면 언어와 맞춘다 — 안 맞으면 번역 풍선이 머리글을 가린다 (`chrome.ts` 의 `lang` 주석).
    lang: locale === 'en' ? 'en-US' : 'ko-KR',
  })
  const page = await connectPage(CDP_PORT)

  try {
    //  🔴 언어는 **사람이 토글을 누르는 것과 같은 길**로 정한다 (쿠키). 다른 길을 만들면
    //     녹화에서만 되는 상태가 생기고, 그건 제품이 아니다.
    await page.evalJs(`(() => {
      document.cookie = ${JSON.stringify(`${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`)}
      return 1
    })()`)
    await page.send('Page.reload')
    await sleep(2500)

    //  🔴 **녹화기와 시각을 맞추는 자리** (2026-09-12).
    //     ★ 왜 초를 세지 않나 — 첫 판이 그러다 망했다. 녹화기는 **창이 뜨자마자** 찍기
    //       시작하는데 운전은 그 뒤에도 카운트다운을 세고 있어서, 33초 중 앞 15초가
    //       **가만히 있는 첫 화면**이었다. 초를 양쪽에서 지어내면 반드시 갈라진다.
    //     ★ 그래서 운전이 **신호 파일**을 남기고, 녹화기는 그걸 보고 찍기 시작한다.
    const signal = arg('signal')
    if (signal === undefined) {
      //  사람이 Win+G 로 직접 켜는 길 — 그때는 카운트다운이 맞다.
      const countdown = Number(arg('countdown') ?? '5')
      console.log(`  ⏺  지금 녹화를 시작해라 (Win+G → 녹화). ${countdown}초 뒤 시작한다.\n`)
      await sleep(countdown * 1000)
    } else {
      //  🔴 **뷰포트의 화면 좌표를 브라우저에게 직접 묻는다** (2026-09-12).
      //     ★ 왜 — Win32 의 `GetClientRect` 로는 제목 줄을 못 걷어낸다. Chrome 의 앱 창은
      //       제목 줄을 **클라이언트 영역 안에** 스스로 그리기 때문이다 (커스텀 프레임).
      //       `window.screenX/screenY` 는 **뷰포트**의 왼쪽 위이고 `innerWidth/innerHeight` 가
      //       그 크기라, 이 넷이면 제품 화면만 정확히 잘라낸다.
      //     ⚠ 이 값은 CSS 픽셀이다. 화면 배율이 100% 가 아니면 물리 픽셀과 달라서
      //       `devicePixelRatio` 를 같이 넘긴다 — 자르는 쪽이 곱한다.
      //  ⚠ `screenX/screenY` 는 **창**의 왼쪽 위다 (MDN 은 뷰포트라고 적지만 Chrome 은 창을 준다 ·
      //    2026-09-12 실측: 창 10,10 인데 screenY 도 10 이었고 제목 줄 32px 이 그대로 찍혔다).
      //    그래서 창과 뷰포트의 **크기 차이**로 테두리와 제목 줄을 직접 센다:
      //      가로 테두리 = (outerWidth - innerWidth) / 2      (좌우가 같다)
      //      제목 줄     = outerHeight - innerHeight - 가로 테두리   (아래 테두리를 뺀 나머지)
      const view = await page.evalJs<{ x: number; y: number; w: number; h: number; dpr: number }>(`(() => {
        const border = (window.outerWidth - window.innerWidth) / 2
        const titleBar = window.outerHeight - window.innerHeight - border
        return {
          x: window.screenX + border,
          y: window.screenY + titleBar,
          w: window.innerWidth,
          h: window.innerHeight,
          dpr: window.devicePixelRatio,
        }
      })()`)
      const { writeFileSync } = await import('node:fs')
      writeFileSync(signal, JSON.stringify(view ?? null), 'utf8')
      //  ⚠ 녹화기가 ffmpeg 을 올리는 데 걸리는 짧은 틈 — 이게 없으면 첫 컷의 앞머리가 잘린다.
      console.log('  ⏺  녹화기에 신호를 보냈다 — 2초 뒤 시작.\n')
      await sleep(2000)
    }

    //  🔴 **실제로 몇 초가 걸리는지 잰다.** `hold` 의 합은 「머무는 시간」이고, 그 위에 클릭·도착·
    //     그려짐을 기다리는 시간이 더 붙는다 — 그래서 합만 보고 녹화 길이를 정하면 **끝 컷이 잘린다**
    //     (2026-09-12 에 그랬다: 33초로 찍었더니 마지막 Sync 가 안 들어왔다).
    //     여기 찍히는 초가 `tools/record-demo.ps1` 의 기본 길이와 `docs/PITCH.md` §6 자막 시각의 근거다.
    const startedAt = Date.now()
    const at = (): string => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`

    for (const [i, beat] of BEATS.entries()) {
      console.log(`  ${String(i + 1).padStart(2, '0')}  [${at()}] ${beat.name} — ${beat.cue}`)

      if (typeof beat.scrollTo === 'number') {
        await page.evalJs(`window.scrollTo({ top: ${beat.scrollTo}, behavior: 'smooth' })`)
        await sleep(1200)
      } else if (typeof beat.scrollTo === 'string') {
        await page.evalJs(`(() => {
          const el = document.querySelector(${JSON.stringify(beat.scrollTo)})
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return 1
        })()`)
        await sleep(1500)
      }

      if (beat.click !== undefined) {
        await clickLike(page, beat.click)
        if (beat.arriveAt !== undefined) {
          const want = beat.arriveAt
          await waitFor(`${beat.name} 도착`, async () => {
            const here = await page.evalJs<string>('location.pathname')
            return typeof here === 'string' && want.test(here)
          }, 30_000)
        }
        await drawn(page)
      }

      await sleep(beat.hold * 1000 * holdScale)
    }

    console.log(`\n  ⏹  끝 — 첫 컷부터 ${at()} 걸렸다. 녹화를 멈춰라.`)
    //  ⚠ 바로 안 닫는다 — 마지막 화면이 영상의 끝 프레임이라, 닫는 순간이 찍히면 흰 화면이 남는다.
    await sleep(3000)
  } finally {
    child.kill()
    //  ⚠ Chrome 이 죽은 **뒤에** 지운다 (`chrome.ts` 의 `profileDir` 주석) — 살아 있으면 EBUSY 다.
    await sleep(1000)
    try { (await import('node:fs')).rmSync(profileDir, { recursive: true, force: true }) } catch { /* 임시 폴더다 — 못 지워도 다음 판에 영향 없다 */ }
  }
}

main().catch((err: unknown) => {
  console.error(`\n  데모 운전 실패: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exitCode = 1
})
