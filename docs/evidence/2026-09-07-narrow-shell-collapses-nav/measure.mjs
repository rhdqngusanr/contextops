// 앱 껍데기가 375px 에서 내비를 접나 — FINDINGS 160
// 진짜 브라우저(CDP)로 `demo:db` + `next dev`(3111) 위에서 잰다. 들어간 길은 제품과 같다.
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = 'http://127.0.0.1:3111'
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))

let id = 0
const waiters = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id) }
})
function send(method, params = {}) {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((res) => waiters.set(mid, res))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 400) }
  return r.result?.result?.value
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'))
}
async function goto(url, wait = 4000) {
  await send('Page.navigate', { url })
  await sleep(wait)
}
async function metrics(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
}

//  재는 것 — 「가로로 미나」와 「본문이 몇 px 인가」. 둘 다 숫자다.
const MEASURE = `(() => {
  const de = document.documentElement
  const nav = document.querySelector('.nav')
  const links = document.querySelector('.nav-links')
  const inner = document.querySelector('.main-inner')
  const trigger = document.querySelector('.palette-trigger')
  const cs = (el) => el ? getComputedStyle(el) : null
  const navCs = cs(nav)
  return {
    url: location.pathname,
    viewport: { w: de.clientWidth, h: de.clientHeight },
    docScrollWidth: de.scrollWidth,
    horizontalScroll: de.scrollWidth > de.clientWidth,
    overflowPx: de.scrollWidth - de.clientWidth,
    shellDirection: cs(document.querySelector('.shell'))?.flexDirection ?? null,
    navWidth: nav ? nav.clientWidth : null,
    navDirection: navCs ? navCs.flexDirection : null,
    navLinksDisplay: links ? cs(links).display : null,
    navLinksVisible: links ? links.getClientRects().length > 0 : null,
    mainInnerWidth: inner ? inner.clientWidth : null,
    paletteTriggerVisible: trigger ? trigger.getClientRects().length > 0 : false,
    paletteTriggerText: trigger ? trigger.innerText.replace(/\\s+/g, ' ').trim() : null,
    projectNameVisible: [...document.querySelectorAll('.nav .mono')].some((e) => e.innerText.includes('/')),
  }
})()`

await send('Page.enable')
await send('Runtime.enable')

//  ① 게스트 세션을 붙인다 (제품과 같은 길: /demo → 리다이렉트)
await metrics(1440, 900, false)
await goto(`${BASE}/demo`, 7000)
const landed = await evalJs('location.pathname')

//  ② 넓은 화면 — 이번 변경이 데스크톱을 안 건드렸음을 같이 남긴다
await goto(`${BASE}/t/demo/p/paylab-api/import`, 6000)
const wide = await evalJs(MEASURE)
await shot('01-import-1440')

//  ③ 375px — FINDINGS 160 이 잰 그 자리
await metrics(375, 812, true)
await sleep(1500)
const narrow = await evalJs(MEASURE)
await shot('02-import-375')

//  ④ 접힌 뒤 갈 곳이 실제로 열리나 — ⌘K 팔레트를 눌러 본다 (새 내비를 안 만든 근거)
await evalJs(`(() => { document.querySelector('.palette-trigger')?.click(); return 1 })()`)
await sleep(2500)
const palette = await evalJs(`(() => {
  const dlg = document.querySelector('[role="dialog"]')
  const items = [...document.querySelectorAll('.palette-item')]
  return {
    open: !!dlg,
    dialogWidth: dlg ? dlg.clientWidth : null,
    fitsViewport: dlg ? dlg.getBoundingClientRect().width <= document.documentElement.clientWidth : null,
    itemCount: items.length,
    firstItems: items.slice(0, 5).map((e) => e.innerText.replace(/\\s+/g, ' ').trim()),
  }
})()`)
await shot('03-palette-375')

//  ⑤ 다른 화면도 같은 껍데기인가 (껍데기는 하나다 — 한 화면만 보면 모른다)
await evalJs(`(() => { document.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return 1 })()`)
await goto(`${BASE}/t/demo/p/paylab-api/context`, 6000)
const narrowContext = await evalJs(MEASURE)
await shot('04-context-375')

//  ⑥ 껍데기는 하나다 — 한 화면만 보면 모른다. 앞 화면 전부를 375px 로 돌며 가로로 미는지 센다.
const SCREENS = ['import', 'review', 'context', 'proposals', 'packs', 'packs/1.1.0', 'roadmap', 'sync']
const sweep = []
for (const s of SCREENS) {
  await goto(`${BASE}/t/demo/p/paylab-api/${s}`, 5000)
  const m = await evalJs(MEASURE)
  sweep.push({ screen: s, ...m })
}

const report = { landed, wide, narrow, palette, narrowContext, sweep }
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
ws.close()
