// 헤드리스 Chrome 을 CDP 로 몰아 데모 화면 3(가져오기)을 찍는다 — FINDINGS 137 눈 판정
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
const events = []
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id) }
  else events.push(msg)
})
function send(method, params = {}) {
  const mid = ++id
  ws.send(JSON.stringify({ id: mid, method, params }))
  return new Promise((res) => waiters.set(mid, res))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  return r.result?.result?.value
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'))
}
async function goto(url, wait = 2500) {
  await send('Page.navigate', { url })
  await sleep(wait)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

// ① /demo → 게스트 세션을 받고 리다이렉트
await goto(`${BASE}/demo`, 4000)
const afterDemo = await evalJs('location.pathname')

// ② 화면 3 (가져오기)
await goto(`${BASE}/t/demo/p/paylab-api/import`, 5000)
await shot('01-demo-import')
const text = await evalJs('document.body.innerText')
const jobCards = await evalJs(`JSON.stringify([...document.querySelectorAll('article,section,li')].map(e=>e.innerText).filter(t=>/구조화|job|멈춘/.test(t)).slice(0,5))`)

console.log(JSON.stringify({
  afterDemo,
  hasStalled: text.includes('멈춘 것 같음'),
  hasQueuedWord: text.includes('차례 기다리는 중'),
  jobCards: JSON.parse(jobCards),
  bodyText: text.slice(0, 1200),
}, null, 2))
ws.close()
