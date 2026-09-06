// 화면 5(Context) 의 거르개 셋째 칸(scope) placeholder 가 몇 px 모자라는지 잰다 — FINDINGS 158
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
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'))
}
async function goto(url, wait = 3000) {
  await send('Page.navigate', { url })
  await sleep(wait)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

await goto(`${BASE}/demo`, 6000)
await goto(`${BASE}/t/demo/p/paylab-api/context`, 6000)
await shot('01-context')

// scope 칸을 찾아 폭을 잰다. placeholder 의 실제 글자 폭은 canvas 로 같은 폰트에서 잰다.
const MEASURE = `(() => {
  const inputs = [...document.querySelectorAll('input.input')]
  const el = inputs.find((i) => (i.placeholder || '').includes('domain'))
  if (!el) return { found: false, placeholders: inputs.map((i) => i.placeholder) }
  const cs = getComputedStyle(el)
  const c = document.createElement('canvas').getContext('2d')
  c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily
  const textW = c.measureText(el.placeholder).width
  const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight)
  const inner = el.clientWidth - padL - padR
  const label = el.closest('label')
  return {
    found: true,
    placeholder: el.placeholder,
    font: c.font,
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    clientWidth: el.clientWidth,
    offsetWidth: el.offsetWidth,
    scrollWidth: el.scrollWidth,
    paddingLeft: padL,
    paddingRight: padR,
    innerWidth: inner,
    textWidth: Math.round(textW * 100) / 100,
    shortfall: Math.round((textW - inner) * 100) / 100,
    cssWidth: cs.width,
    flexBasis: cs.flexBasis,
    labelWidth: label ? label.clientWidth : null,
    rowWidth: label && label.parentElement ? label.parentElement.clientWidth : null,
    rowGap: label && label.parentElement ? getComputedStyle(label.parentElement).gap : null,
    otherInputs: inputs.map((i) => ({ ph: i.placeholder, w: i.clientWidth })),
  }
})()`
const scope = await evalJs(MEASURE)

// 값을 실제로 넣었을 때도 잘리나 (사람이 치는 가장 긴 예시)
await evalJs(`(() => {
  const el = [...document.querySelectorAll('input.input')].find((i)=> (i.placeholder||'').includes('domain'))
  if (!el) return 0
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, 'domain:billing')
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return 1
})()`)
await sleep(1500)
const typed = await evalJs(`(() => {
  const el = [...document.querySelectorAll('input.input')].find((i)=> (i.value||'').includes('domain'))
  if (!el) return { found: false }
  return { found: true, value: el.value, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clipped: el.scrollWidth > el.clientWidth }
})()`)
await shot('02-context-typed')

const report = { scope, typed }
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
ws.close()
