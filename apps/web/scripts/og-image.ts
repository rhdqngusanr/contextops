import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { sleep } from '../e2e/cdp'
import { connectPage, launchChrome } from '../e2e/chrome'
import { SITE } from '../src/lib/web/site'

// =====================================================================
//  `public/og.png` 를 그린다 — 링크 미리보기 이미지 1200×630 (INBOX H2 · 2026-09-10)
//
//    pnpm --filter web og:image
//
//  ★ 왜 스크립트로 그리나 (런타임 `ImageResponse` 가 아니라) — ① Satori 는 CSS 변수를 못 읽어 색을
//    hex 로 적어야 하는데 `test/design-tokens.test.ts` 가 `src/` 의 hex 리터럴을 막는다 ② 글꼴을 요청마다
//    받아 와야 한다(네트워크에 기대는 빌드·요청). 여기서는 `globals.css` 의 `:root` 를 **그대로 읽어**
//    HTML 에 넣고, 관통이 쓰는 것과 같은 헤드리스 Chrome(CDP)으로 찍는다 — 색의 정본은 여전히 하나다.
//  ★ 글꼴도 저장소의 것이다 — `src/app/fonts.css` 의 `/fonts/…` 를 `file://…/public/fonts/…` 로 바꿔 넣는다
//    (DESIGN_BRIEF §3 「타이포」). 그래서 HTML 을 `data:` 가 아니라 **임시 파일**로 두고 연다 — `data:` 문서는
//    `file://` 글꼴을 못 받는다.
//  ★ 문장은 `lib/web/site.ts` 에서 온다 — 랜딩 머리·`<head>` 와 같은 문장이다. 모양은 랜딩 머리와 같은
//    웜 화이트 한 벌이다 (오프화이트 · 표제체 큰 글자 · 검정 마크 · DESIGN_BRIEF §3 「테마」).
//  ⚠ 산출물은 커밋한다 (`apps/web/public/og.png`). 문장·색·글꼴을 바꾸면 다시 돌려라 —
//    `test/web-metadata.test.ts` 는 크기(1200×630)만 잰다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const CDP_PORT = Number(process.env.OG_CDP_PORT ?? 9231)
const OUT = join(webRoot, 'public', 'og.png')

/** `globals.css` 의 첫 `:root { … }` — 토큰을 복사하지 않고 통째로 넣는다. */
function rootTokens(): string {
  const css = readFileSync(join(webRoot, 'src', 'app', 'globals.css'), 'utf8')
  const block = /:root\s*\{[\s\S]*?\}/.exec(css)
  if (!block) throw new Error('globals.css 에 :root 블록이 없다')
  return block[0]
}

/** `fonts.css` 의 `@font-face` — 조각 주소만 저장소의 `public/fonts/` 절대 `file://` 로 편다. */
function fontFaces(): string {
  const css = readFileSync(join(webRoot, 'src', 'app', 'fonts.css'), 'utf8')
  const publicUrl = pathToFileURL(join(webRoot, 'public')).toString()
  return css.replace(/url\(\/fonts\//g, `url(${publicUrl}/fonts/`)
}

/** 브랜드 마크 — `public/icon.svg` 와 같은 그림. 색은 토큰이다 (아이콘 파일은 값이고 여기는 var). */
const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="16" fill="var(--ink)"/><path d="M19 33.5l8.5 8.5L45 24" fill="none" stroke="var(--on-accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

function page(): string {
  const { width, height } = SITE.ogImage
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
${fontFaces()}
${rootTokens()}
html,body{margin:0;width:${width}px;height:${height}px;background:var(--bg);color:var(--ink);font-family:var(--font-sans);word-break:keep-all}
.card{box-sizing:border-box;width:${width}px;height:${height}px;padding:56px 80px 52px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:14px;font-family:var(--font-display);font-weight:600;font-size:28px;letter-spacing:-.02em;color:var(--ink)}
.brand svg{width:40px;height:40px;display:block}
.eyebrow{font-family:var(--font-mono);font-size:21px;letter-spacing:.04em;color:var(--ink-3)}
h1{margin:16px 0 0;font-family:var(--font-display);font-size:74px;line-height:1.08;font-weight:600;letter-spacing:-.03em;color:var(--ink);max-width:12em;text-wrap:balance}
p{margin:26px 0 0;font-size:27px;line-height:1.55;color:var(--ink-2);max-width:880px}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:22px;color:var(--ink-3);border-top:1px solid var(--line-hi);padding-top:22px}
</style></head><body><div class="card">
<div class="brand">${MARK}${SITE.name}</div>
<div><div class="eyebrow">${SITE.eyebrow}</div><h1>${SITE.tagline}</h1><p>${SITE.description}</p></div>
<div class="foot"><span>${SITE.event}</span><span>${SITE.name}</span></div>
</div></body></html>`
}

async function main(): Promise<void> {
  const html = join(tmpdir(), `ctxops-og-${process.pid}.html`)
  writeFileSync(html, page())
  const launched = await launchChrome(CDP_PORT)
  try {
    const cdp = await connectPage(CDP_PORT)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: SITE.ogImage.width, height: SITE.ogImage.height, deviceScaleFactor: 1, mobile: false,
    })
    await cdp.send('Page.navigate', { url: pathToFileURL(html).toString() })
    //  저장소 글꼴이 놓일 때까지 — `document.fonts.ready` 가 조각 로딩까지 기다린다.
    await sleep(500)
    await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 1)', awaitPromise: true })
    await sleep(300)
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: SITE.ogImage.width, height: SITE.ogImage.height, scale: 1 },
    }) as { data: string }
    writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
    console.log(`og:image — ${OUT} (${SITE.ogImage.width}×${SITE.ogImage.height})`)
  } finally {
    launched.child.kill()
    try { rmSync(html, { force: true }) } catch { /* 임시 파일 */ }
    try { rmSync(launched.profileDir, { recursive: true, force: true }) } catch { /* Chrome 이 아직 잡고 있으면 다음에 */ }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
