// FINDINGS 121·135 — 게스트가 쓰기 버튼을 **실제 브라우저에서 눌러** 본다 (78바퀴).
// ① /demo 로 들어가 게스트 세션을 받고 context 로 간다 ② [발행하기] 를 마우스로 누른다 →
//    모달(role=dialog)이 0 이고 이유(role=status)가 그 자리에 떠야 한다 (135)
// ③ /import 의 질문 스택에 답을 적고 [저장하기] 를 누른다 → 서버가 403 을 내고, 화면 문구가
//    「owner」가 아니라 「읽기 전용」이어야 한다 (121)
// Node 22 내장 WebSocket 만 · 의존성 0 (70바퀴의 focus-cdp.mjs 와 같은 뼈대).
//
// 사용: node guest-door-cdp.mjs <출력폴더> <origin>
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const [outDir, origin = 'http://127.0.0.1:3000'] = process.argv.slice(2)
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9223
mkdirSync(outDir, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'ctxops-cdp-'))

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pageTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch { /* 아직 안 떴다 */ }
    await sleep(200)
  }
  throw new Error('Chrome 이 안 떴다')
}

const target = await pageTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
let seq = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
}
function send(method, params = {}) {
  const id = ++seq
  return new Promise((resolve, reject) => {
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)))
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  return r.result.value
}
async function shot(file) {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, file), Buffer.from(r.data, 'base64'))
  return file
}
async function waitFor(js, ms = 60_000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await evaluate(js).catch(() => false)) return true
    await sleep(400)
  }
  return false
}
async function open(url) {
  await send('Page.navigate', { url })
  await sleep(1500)
}
/** 보이는 요소 중 글자가 `text` 로 시작하는 첫 버튼의 가운데. */
const findButton = (text, tag = 'button') => `(() => {
  for (const el of document.querySelectorAll(${JSON.stringify(tag)})) {
    if (el.disabled) continue
    if (!(el.innerText || '').trim().startsWith(${JSON.stringify(text)})) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: (el.innerText || '').trim().slice(0, 40) }
  }
  return null
})()`
async function click(t) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: t.x, y: t.y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: t.x, y: t.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: t.x, y: t.y, button: 'left', clickCount: 1 })
  await sleep(500)
}
const SCENE = `(() => ({
  url: location.href,
  dialogs: document.querySelectorAll('[role="dialog"]').length,
  status: [...document.querySelectorAll('[role="status"]')].map((e) => (e.innerText || '').replace(/\\s+/g, ' ').trim()),
  stateBoxes: [...document.querySelectorAll('.state-box')].map((e) => (e.innerText || '').replace(/\\s+/g, ' ').trim()),
  ownerWord: (document.body.innerText || '').match(/owner/gi)?.length ?? 0,
}))()`

const log = []

// ① /demo → context (게스트 세션은 /demo 가 localStorage 에 심는다)
await open(`${origin}/demo`)
const ready = await waitFor(`location.pathname.endsWith('/context') && !!document.querySelector('table.table tbody tr')`)
log.push({ step: 'context', ready, scene: await evaluate(SCENE), shot: await shot('01-context-before.png') })
console.log('context ready:', ready, JSON.stringify(log.at(-1).scene))

// ② [발행하기] 를 마우스로 누른다
const publish = await evaluate(findButton('발행하기'))
if (!publish) throw new Error('[발행하기] 가 없다')
await click(publish)
const after = await evaluate(SCENE)
log.push({ step: 'publish-click', clicked: publish.text, scene: after, shot: await shot('02-context-after-publish-click.png') })
console.log('after [발행하기]:', JSON.stringify(after))

// ②-b 항목 하나를 열어 드로어 캡션을 읽는다
const row = await evaluate(`(() => { const r = document.querySelector('table.table tbody tr'); if (!r) return null; const b = r.getBoundingClientRect(); return { x: Math.round(b.x + 200), y: Math.round(b.y + b.height / 2) } })()`)
if (row) {
  await click(row)
  const drawer = await evaluate(`(() => { const d = document.querySelector('aside.drawer'); return d ? (d.innerText || '').replace(/\\s+/g, ' ').trim().slice(-160) : null })()`)
  log.push({ step: 'drawer', tail: drawer, shot: await shot('03-context-drawer.png') })
  console.log('drawer tail:', drawer)
}

// ③ /import — 문서 붙여넣기 → [구조화하기] → 서버 403 → 화면 문구 (121)
//    ⚠ 질문 스택이 아니라 문서 폼이다 — 데모 프로젝트엔 열린 질문이 없어서(시드가 다 답했다) 스택은 비어 있다.
await open(`${origin}${new URL(after.url).pathname.replace(/\/context$/, '/import')}`)
const form = await waitFor(`!!document.querySelector('textarea') && !!document.querySelector('input.input')`)
console.log('import form ready:', form)
if (form) {
  await evaluate(`(() => { document.querySelector('input.input').focus(); return true })()`)
  await send('Input.insertText', { text: '게스트가 붙여 본 문서' })
  await evaluate(`(() => { document.querySelector('textarea').focus(); return true })()`)
  await send('Input.insertText', { text: '읽기 전용 게스트가 적어 본 본문이다. 서버는 이 요청을 403 으로 거절해야 한다.' })
  await sleep(300)
  const btn = await evaluate(findButton('구조화하기'))
  if (!btn) throw new Error('[구조화하기] 가 없거나 잠겨 있다')
  await click(btn)
  const shown = await waitFor(`/읽기 전용으로 둘러보는 중입니다|owner/.test(document.body.innerText)`, 20_000)
  await evaluate(`(() => { const e = [...document.querySelectorAll('.ink-bad')].at(-1); if (e) e.scrollIntoView({ block: 'center' }); return true })()`)
  await sleep(300)
  const scene = await evaluate(SCENE)
  const errorText = await evaluate(`(() => [...document.querySelectorAll('.ink-bad')].map((e) => (e.innerText || '').trim()).filter(Boolean))()`)
  log.push({ step: 'structure-403', shown, errorText, scene, shot: await shot('04-import-after-structure-click.png') })
  console.log('after [구조화하기]:', shown, JSON.stringify(errorText), 'ownerWord=', scene.ownerWord)
}

writeFileSync(join(outDir, 'scene.json'), JSON.stringify(log, null, 2))
ws.close()
chrome.kill()
await sleep(500)
try { rmSync(profile, { recursive: true, force: true }) } catch { /* 잠겨 있으면 둔다 */ }
