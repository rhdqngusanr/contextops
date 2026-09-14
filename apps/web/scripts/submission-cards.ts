import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { sleep } from '../e2e/cdp'
import { connectPage, launchChrome } from '../e2e/chrome'
import { fontFaces, rootTokens } from './page-style'

// =====================================================================
//  제출 갤러리용 그림 — 위에 **제목 한 줄**, 아래에 캡처의 **핵심 부분만 크게** (2026-09-14)
//
//    pnpm --filter web exec tsx scripts/submission-cards.ts [--only 2-review-ai]
//
//  ★ 왜 있나 — 원티드 과제 화면은 스크린샷을 작은 칸(아래 줄 ≈ 300px · 큰 칸 ≈ 800px)으로 줄여 보여 준다.
//    앱 화면 전체(1600×900 · 왼쪽 메뉴·여백 포함)를 그대로 올리면 글자가 점으로 보인다 — 사용자가 제출한 뒤 화면에서 확인했다.
//  ★ 모양은 사용자가 골랐다 — 후보 셋(확대만 · 밝은 제목 띠 · 어두운 제목 띠)을 같은 화면으로 그려 보였고 「밝은 제목 띠」.
//    작게 줄어도 제목이 무슨 화면인지 말하고, 창 안의 캡처는 메뉴·여백을 잘라 글자가 커진다.
//  ★ 다시 찍지 않는다 — `submission-shots.ts` 가 두 배(3200×1800)로 찍어 둔 원본을 자른다. 두 배 안쪽 확대는 선명하다.
//  ★ 색·글꼴은 제품의 것이다 — `page-style.ts` 가 `globals.css` 의 토큰과 저장소 글꼴을 그대로 넣는다.
//  ⚠ 제목 띠의 숫자(초 · 값 · 기기 수)는 **그 원본 캡처에 찍힌 값**이다. 원본을 다시 찍으면 여기 문장도 다시 본다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const SHOTS = join(repoRoot, 'docs', 'evidence', '2026-09-14-submission-form')
const OUT = join(SHOTS, 'cards')
const CDP_PORT = Number(process.env.CARDS_CDP_PORT ?? 9251)

/** 폼이 요구하는 16:9. */
const CARD = { width: 1920, height: 1080 } as const
/** 원본 캡처의 CSS 폭 — `submission-shots.ts` 의 VIEW 와 같다 (그 두 배로 찍혔다). */
const SOURCE_CSS_WIDTH = 1600
const PAD = 72
/** 제목 띠 아래의 그림 창 — 이 비율로 원본을 자른다. */
const WINDOW = { x: PAD, y: 300, w: CARD.width - PAD * 2, h: CARD.height - 300 - 56 } as const

type CardSpec = {
  /** 원본 캡처 이름 (`submission-shots.ts` 의 SHOT_NAMES) */
  readonly shot: string
  /** 올릴 그림 이름 */
  readonly name: string
  readonly eyebrow: string
  readonly title: string
  readonly sub: string
  /** 원본(1600×900 CSS px)에서 창에 담을 틀의 왼쪽 위와 폭 — 높이는 창의 비율이 정한다. 가장자리에 반쯤 걸린 요소가 없게 잰다. */
  readonly crop: { readonly x: number; readonly y: number; readonly w: number }
}

/** ★ 그림을 하나 더하려면 여기 한 줄. 좌표는 원본 캡처를 열어 잰다 (2000px 로 줄여 보면 × 0.8 이 CSS px). */
const CARDS: readonly CardSpec[] = [
  {
    shot: '1b-landing-compare',
    name: '1-landing-compare',
    eyebrow: 'ContextOps · Claude Code를 쓰는 팀의 공용 규칙',
    title: '같은 질문인데 팀원마다 AI 답이 다릅니다',
    sub: '결제 재시도를 물으면 문서를 읽은 AI는 5번, 코드를 읽은 AI는 3번. 팀장이 승인한 하나로 맞춥니다.',
    crop: { x: 196, y: 158, w: 1208 },
  },
  {
    shot: '2-review-ai',
    name: '2-review-ai',
    eyebrow: '정리 화면 · 로그인 없이 데모에서 직접',
    title: 'AI가 새 규칙과 부딪히는 기존 규칙을 찾아 물어봅니다',
    sub: '2.2초, 약 $0.004. 결과는 저장되지 않고 답은 팀장이 고릅니다.',
    //  위쪽 설명 문단의 마지막 줄(≈272)이 창 가장자리에 반쯤 걸리지 않게 그 아래에서 시작한다.
    crop: { x: 254, y: 277, w: 1196 },
  },
  {
    shot: '3-pack-trace',
    name: '3-pack-trace',
    eyebrow: 'Pack Explorer',
    title: '배포된 규칙이 어느 문서에서 왔는지 바로 보입니다',
    sub: '문단을 누르면 출처가 뜹니다. CLAUDE.md부터 Cursor 규칙까지 8개 파일이 같은 판입니다.',
    crop: { x: 236, y: 226, w: 1232 },
  },
  {
    shot: '4-roadmap',
    name: '4-roadmap',
    eyebrow: 'Roadmap',
    title: '계획이 어디까지 왔는지 근거와 함께 봅니다',
    sub: '개발자의 AI가 보고한 파일이 완료 조건의 근거가 되고, 완료 확인은 팀장이 합니다.',
    crop: { x: 236, y: 234, w: 1232 },
  },
  {
    shot: '5-sync',
    name: '5-sync',
    eyebrow: 'Sync',
    title: '누구 기기가 옛 규칙을 쓰고 있는지 한눈에 보입니다',
    sub: '기기 14대 중 9대가 최신 판입니다. 나머지는 /contextops:sync 한 번이면 맞춰집니다.',
    //  아래 가장자리에 여덟째 줄(≈760 부터)이 반쯤 걸리지 않게 — 일곱째 줄까지만 담고, 위쪽 「공식 v1.1.0 기준」은 온전히 넣는다.
    crop: { x: 236, y: 244, w: 1232 },
  },
]

function html(card: CardSpec): string {
  const scale = WINDOW.w / card.crop.w
  const src = pathToFileURL(join(SHOTS, `${card.shot}.png`)).toString()
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
${fontFaces()}
${rootTokens()}
html,body{margin:0;width:${CARD.width}px;height:${CARD.height}px;overflow:hidden;background:var(--bg);font-family:var(--font-sans);word-break:keep-all}
.band{position:absolute;left:${PAD}px;right:${PAD}px;top:64px}
.eyebrow{font-size:26px;color:var(--ink-3)}
h1{margin:14px 0 0;font-family:var(--font-display);font-weight:600;font-size:58px;line-height:1.15;letter-spacing:-.02em;color:var(--ink);white-space:nowrap}
.sub{margin:16px 0 0;font-size:28px;color:var(--ink-2);white-space:nowrap}
.win{position:absolute;left:${WINDOW.x}px;top:${WINDOW.y}px;width:${WINDOW.w}px;height:${WINDOW.h}px;overflow:hidden;border-radius:18px;background:var(--bg);box-shadow:0 0 0 1px var(--line-hi),0 24px 60px rgba(9,9,11,.10)}
.win img{position:absolute;left:${-card.crop.x * scale}px;top:${-card.crop.y * scale}px;width:${SOURCE_CSS_WIDTH * scale}px;height:auto}
</style></head><body><div class="band"><div class="eyebrow">${card.eyebrow}</div><h1>${card.title}</h1><div class="sub">${card.sub}</div></div><div class="win"><img src="${src}" alt=""></div></body></html>`
}

async function main(): Promise<void> {
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : undefined
  if (only !== undefined && !CARDS.some((c) => c.name === only)) throw new Error(`--only «${only}» 는 CARDS 표에 없다`)
  mkdirSync(OUT, { recursive: true })
  const temp = join(tmpdir(), `ctxops-card-${process.pid}.html`)
  const chrome = await launchChrome(CDP_PORT)
  try {
    const page = await connectPage(CDP_PORT)
    await page.send('Emulation.setDeviceMetricsOverride', { width: CARD.width, height: CARD.height, deviceScaleFactor: 1, mobile: false })
    for (const card of CARDS.filter((c) => only === undefined || c.name === only)) {
      writeFileSync(temp, html(card))
      await page.send('Page.navigate', { url: pathToFileURL(temp).toString() })
      await sleep(500)
      //  글꼴 조각과 원본 그림을 다 받을 때까지 — 반쯤 받은 그림을 찍지 않는다.
      await page.evalJs('Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => undefined))]).then(() => true)')
      //  ⚠ 제목·부제는 한 줄이다(white-space:nowrap) — 띠를 넘치면 창을 덮는다. 넘치면 멈춘다.
      const overflow = await page.evalJs<boolean>(`[...document.querySelectorAll('.band h1, .band .sub')].some((e) => e.scrollWidth > e.clientWidth + 1)`)
      if (overflow === true) throw new Error(`${card.name}: 제목이나 부제가 한 줄을 넘는다 — 문장을 줄여라`)
      await sleep(300)
      const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: CARD.width, height: CARD.height, scale: 1 } })
      if (typeof shot.data !== 'string') throw new Error(`${card.name}: 캡처가 비었다`)
      const file = join(OUT, `${card.name}.png`)
      writeFileSync(file, Buffer.from(shot.data, 'base64'))
      console.log(`  cards/${card.name}.png · ${Math.round(statSync(file).size / 1024)}KB`)
    }
    page.close()
  } finally {
    spawn('taskkill', ['/pid', String(chrome.child.pid), '/T', '/F'], { stdio: 'ignore' })
    await sleep(1500)
    try { rmSync(temp, { force: true }) } catch { /* 임시 파일 */ }
    try { rmSync(chrome.profileDir, { recursive: true, force: true }) } catch { /* 아직 쥐고 있으면 임시 폴더에 남긴다 */ }
  }
}

main().then(() => process.exit(0), (error: unknown) => {
  console.error(error)
  process.exit(1)
})
