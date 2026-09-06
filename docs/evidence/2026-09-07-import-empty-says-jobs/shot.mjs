// 헤드리스 Chrome 을 CDP 로 몰아 데모 화면 3 의 「구조화 진행」 빈 상태를 찍고 읽는다
// (FINDINGS 159 눈 판정 · 98바퀴의 `2026-09-07-demo-no-phantom-job/shot.mjs` 를 그대로 이어 쓴다)
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

// ① /demo → 게스트 세션을 받고 리다이렉트 (제품과 같은 길)
await goto(`${BASE}/demo`, 5000)
const afterDemo = await evalJs('location.pathname')

// ② 화면 3 (가져오기) — 「구조화 진행」 칸까지 굴린다
await goto(`${BASE}/t/demo/p/paylab-api/import`, 6000)
await evalJs(`
  const h = [...document.querySelectorAll('h2')].find(e => e.textContent.includes('구조화 진행'))
  if (h) h.scrollIntoView({ block: 'center' })
  'ok'
`)
await sleep(800)
await shot('01-structure-panel')

// ③ 그 칸이 무엇을 말하나 · 문서는 몇 건인가 (진짜 HTTP 로 다시 센다)
const panelText = await evalJs(`
  (() => {
    const h = [...document.querySelectorAll('h2')].find(e => e.textContent.includes('구조화 진행'))
    return h ? h.closest('section').innerText : '(칸을 못 찾았다)'
  })()
`)
const counts = await evalJs(`
  (async () => {
    const pid = document.body.innerHTML.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0] ?? null
    if (!pid) return { note: 'project id 를 화면에서 못 읽었다' }
    const g = async (p) => (await (await fetch('/api/v1/projects/' + pid + p)).json())
    const docs = await g('/documents')
    const jobs = await g('/jobs?feature=structure&limit=50')
    return {
      project_id: pid,
      documents: docs.data?.documents?.length ?? docs.data?.items?.length ?? null,
      structure_jobs: jobs.data?.jobs?.length ?? null,
    }
  })()
`)

console.log(JSON.stringify({
  afterDemo,
  panelText,
  saysUploadedDocs: panelText.includes('아직 올린 문서가 없습니다'),
  saysStructuring: panelText.includes('구조화 중인 문서가 없습니다'),
  counts,
}, null, 2))
ws.close()
