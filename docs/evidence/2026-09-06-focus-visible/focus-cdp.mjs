// FINDINGS 130 — 키보드 포커스 링을 **실제 브라우저에서 탭을 눌러** 찍는다 (70바퀴).
// headless Chrome 의 --screenshot 은 탭을 못 누른다. 그래서 CDP(Chrome DevTools Protocol)로
// ① 페이지를 열고 ② Tab 을 N 번 보내고 ③ 매번 activeElement 와 계산된 outline 을 읽고 ④ 캡처한다.
// ⑤ 대조군: 아직 포커스가 없는 버튼을 **마우스로** 누르면 링이 안 떠야 한다 (:focus-visible 의 약속).
// Node 22 의 내장 WebSocket 만 쓴다 — 의존성 0.
//
// 사용: node .ci/focus-cdp.mjs <출력폴더> <url> <탭 수> [기다릴 selector] [둘째 url] [둘째 selector] [둘째 탭 수]
//   둘째 url 은 같은 프로필(=같은 localStorage 세션)로 이어서 연다 — /demo 가 심은 게스트 세션으로 다른 화면을 보려고.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const [outDir, url, tabsArg, waitFor, url2, waitFor2, tabs2Arg] = process.argv.slice(2)
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9222
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
let events = []
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  else if (msg.method) events.push(msg.method)
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

const DESCRIBE = `(() => {
  const el = document.activeElement
  if (!el) return null
  const cs = getComputedStyle(el)
  return {
    tag: el.tagName.toLowerCase(),
    class: el.className && typeof el.className === 'string' ? el.className : '',
    text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 60),
    href: el.getAttribute('href'),
    focusVisible: el.matches(':focus-visible'),
    outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
    outlineOffset: cs.outlineOffset,
    borderColor: cs.borderColor,
    rect: (() => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] })(),
  }
})()`

/** 아직 포커스가 없는, 화면 안에 보이는 첫 **버튼**의 위치 — 마우스 대조군용.
 *  ⚠ 링크는 안 된다 — 누르면 다른 화면으로 가서 대조군이 없어진다 (첫 판에서 밟았다). */
const CONTROL_TARGET = `(() => {
  for (const el of document.querySelectorAll('button.tree-item, button')) {
    if (el === document.activeElement || el.disabled) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || r.y < 0 || r.y + r.height > innerHeight) continue
    return { x: Math.round(r.x + Math.min(r.width / 2, 24)), y: Math.round(r.y + r.height / 2), text: (el.innerText || '').trim().slice(0, 40) }
  }
  return null
})()`

async function open(target, selector) {
  events = []
  await send('Page.navigate', { url: target })
  // 기다린다: 선택자가 있으면 그것이 뜰 때까지(최대 60초), 없으면 load 뒤 2초.
  const deadline = Date.now() + 60_000
  if (selector) {
    while (Date.now() < deadline) {
      const ok = await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`).catch(() => false)
      if (ok) break
      await sleep(500)
    }
  } else {
    while (Date.now() < deadline && !events.includes('Page.loadEventFired')) await sleep(200)
    await sleep(2000)
  }
  await sleep(500)
}

async function tabThrough(prefix, tabs, log) {
  log.push({ step: `${prefix}0`, url: await evaluate('location.href'), title: await evaluate('document.title'), active: await evaluate(DESCRIBE) })
  for (let i = 1; i <= tabs; i++) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 })
    await sleep(150)
    const active = await evaluate(DESCRIBE)
    const file = await shot(`${prefix}tab-${String(i).padStart(2, '0')}.png`)
    log.push({ step: `${prefix}${i}`, url: await evaluate('location.href'), active, shot: file })
    console.log(`${prefix}tab ${i}: <${active?.tag} .${active?.class}> "${active?.text}" focus-visible=${active?.focusVisible} outline=${active?.outline} offset=${active?.outlineOffset}`)
  }
  // 대조군: 포커스가 없던 버튼을 마우스로 누른다 → 링이 **안** 떠야 한다.
  const t = await evaluate(CONTROL_TARGET)
  if (t) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: t.x, y: t.y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: t.x, y: t.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: t.x, y: t.y, button: 'left', clickCount: 1 })
    await sleep(400)
    const active = await evaluate(DESCRIBE)
    const file = await shot(`${prefix}mouse-click.png`)
    log.push({ step: `${prefix}mouse-click`, clicked: t.text, url: await evaluate('location.href'), active, shot: file })
    console.log(`${prefix}mouse on "${t.text}": <${active?.tag} .${active?.class}> "${active?.text}" focus-visible=${active?.focusVisible} outline=${active?.outline}`)
  } else {
    console.log(`${prefix}mouse: 누를 버튼이 화면 안에 없다`)
  }
}

const log = []
await open(url, waitFor)
await tabThrough('', Number(tabsArg ?? 6), log)
if (url2) {
  await open(url2, waitFor2)
  await tabThrough('p2-', Number(tabs2Arg ?? tabsArg ?? 6), log)
}

// 규칙 존재 확인 — 사람이 잰 것과 같은 방법 (스타일시트에서 센다).
const ruleCount = await evaluate(`(() => {
  let fv = 0, none = 0
  for (const ss of document.styleSheets) {
    let rules; try { rules = ss.cssRules } catch { continue }
    for (const r of rules) {
      if (!r.selectorText) continue
      if (r.selectorText.includes(':focus-visible')) fv++
      if (r.style && (r.style.outlineStyle === 'none') && !r.selectorText.includes(':focus-visible')) none++
    }
  }
  return { focusVisibleRules: fv, outlineNoneWithoutFocusVisible: none }
})()`)
log.push({ step: 'stylesheet', ruleCount })
console.log('stylesheet:', JSON.stringify(ruleCount))

writeFileSync(join(outDir, 'focus.json'), JSON.stringify(log, null, 2))
ws.close()
chrome.kill()
await sleep(500)
try { rmSync(profile, { recursive: true, force: true }) } catch { /* 잠겨 있으면 둔다 */ }
