import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sleep } from '../e2e/cdp'
import { connectPage, launchChrome } from '../e2e/chrome'
import { SITE } from '../src/lib/web/site'

// =====================================================================
//  `public/og.png` 를 그린다 — 링크 미리보기 이미지 1200×630 (INBOX H2 · 2026-09-10)
//
//    pnpm --filter web og:image
//
//  ★ 왜 스크립트로 그리나 (런타임 `ImageResponse` 가 아니라) — ① Satori 는 CSS 변수를 못 읽어 색을
//    hex 로 적어야 하는데 `test/design-tokens.test.ts` 가 `src/` 의 hex 리터럴을 막는다 ② 기본 글꼴에
//    한글이 없어 요청마다 글꼴을 받아 와야 한다(네트워크에 기대는 빌드·요청). 여기서는 `globals.css`
//    의 `:root` 를 **그대로 읽어** HTML 에 넣고, 관통이 쓰는 것과 같은 헤드리스 Chrome(CDP)으로 찍는다 —
//    색의 정본은 여전히 하나다.
//  ★ 문장은 `lib/web/site.ts` 에서 온다 — 랜딩 머리·`<head>` 와 같은 문장이다.
//  ⚠ 산출물은 커밋한다 (`apps/web/public/og.png`). 문장·색을 바꾸면 다시 돌려라 —
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

function page(): string {
  const { width, height } = SITE.ogImage
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
${rootTokens()}
html,body{margin:0;width:${width}px;height:${height}px;background:var(--bg);color:var(--ink);font-family:var(--font-sans)}
.card{box-sizing:border-box;width:${width}px;height:${height}px;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;
  background:linear-gradient(135deg,var(--bg) 0%,var(--surface-hi) 100%);border-bottom:10px solid var(--accent)}
.eyebrow{font-family:var(--font-mono);font-size:26px;letter-spacing:.08em;color:var(--accent-ink);text-transform:uppercase}
h1{margin:18px 0 0;font-size:66px;line-height:1.18;font-weight:800;letter-spacing:-.02em;color:var(--ink);text-wrap:balance}
p{margin:26px 0 0;font-size:29px;line-height:1.5;color:var(--ink-3);max-width:980px}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:26px;color:var(--ink-2)}
.brand{display:flex;align-items:center;gap:18px;font-weight:700}
.mark{width:44px;height:44px;border-radius:11px;background:var(--surface);border:2px solid var(--line-hi);position:relative}
.mark i{position:absolute;left:11px;height:4px;border-radius:2px;background:var(--ink)}
.mark i:nth-child(1){top:11px;width:22px}.mark i:nth-child(2){top:20px;width:16px;background:var(--ink-3)}.mark i:nth-child(3){top:29px;width:12px;background:var(--accent-ink)}
.event{color:var(--ink-3)}
</style></head><body><div class="card">
<div><div class="eyebrow">${SITE.eyebrow}</div><h1>${SITE.tagline}</h1><p>${SITE.description}</p></div>
<div class="foot"><div class="brand"><span class="mark"><i></i><i></i><i></i></span>${SITE.name}</div><div class="event">${SITE.event}</div></div>
</div></body></html>`
}

async function main(): Promise<void> {
  const launched = await launchChrome(CDP_PORT)
  try {
    const cdp = await connectPage(CDP_PORT)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: SITE.ogImage.width, height: SITE.ogImage.height, deviceScaleFactor: 1, mobile: false,
    })
    await cdp.send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(page())}` })
    //  글꼴이 놓일 시간 — 시스템 글꼴뿐이라 길지 않다.
    await sleep(800)
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: SITE.ogImage.width, height: SITE.ogImage.height, scale: 1 },
    }) as { data: string }
    writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
    console.log(`og:image — ${OUT} (${SITE.ogImage.width}×${SITE.ogImage.height})`)
  } finally {
    launched.child.kill()
    try { rmSync(launched.profileDir, { recursive: true, force: true }) } catch { /* Chrome 이 아직 잡고 있으면 다음에 */ }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
