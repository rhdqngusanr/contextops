// =====================================================================
//  CDP 한 줄기 — **브라우저에 말을 거는 자리의 정본** (의존성 0 · Node 22 내장 WebSocket)
//
//  ★ 왜 따로 나왔나 (105바퀴) — `shots.ts` 안에 `ws`·`send`·`evalJs` 가 **모듈 전역**으로
//    하나씩 있었다. 창이 하나뿐일 때는 그게 제일 짧은 코드다. 그런데 GATE 3 은
//    **빈 창(시크릿)** 을 하나 더 열어야 해서 둘째 연결이 필요해졌고, 전역이면 둘째가
//    첫째를 덮는다. 그래서 「연결 하나 = 값 하나」로 올렸다.
//
//  🔴 연결은 두 종류다 — 자리를 헷갈리면 조용히 아무 일도 안 일어난다:
//     · **page** (`/json/list` 의 `webSocketDebuggerUrl`) — `Page`·`Runtime`·`Emulation`
//     · **browser** (`/json/version` 의 `webSocketDebuggerUrl`) — `Target.*`
//       (빈 브라우저 컨텍스트를 만드는 것은 **브라우저**의 일이라 page 연결로는 못 부른다)
//
//  ⚠ 여기에 제품 지식(주소·selector)을 적지 마라. 이 파일은 「어떻게 말을 거나」만 안다.
// =====================================================================

/** CDP 응답 한 통. `result` 안의 모양은 method 마다 달라서 호출한 쪽이 판다. */
type CdpMessage = { id?: number; result?: Record<string, unknown>; error?: { message?: string } }

export type Cdp = {
  /** `result` 를 그대로 돌려준다 (없으면 빈 객체) */
  send(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>>
  /** 페이지 안에서 식을 하나 굴리고 값을 받는다. 실패·항해 중이면 `undefined` 다 */
  evalJs<T>(expression: string): Promise<T | undefined>
  close(): void
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * `probe()` 가 참이 될 때까지 기다린다. 안 되면 던진다.
 * ★ 고정 초를 세지 않는 이유 — `next dev` 는 화면을 **처음 열 때 컴파일한다.**
 *   첫 방문이 수십 초일 수 있어서, 기다리는 쪽이 초를 지어내면 거짓 빨강이 난다.
 */
export async function waitFor(
  what: string,
  probe: () => Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    if (await probe()) return
    await sleep(500)
  }
  throw new Error(`${what} 이(가) ${Math.round(timeoutMs / 1000)}초 안에 안 됐다`)
}

/** 열려 있는 CDP 끝점 하나에 붙는다. page 든 browser 든 말 거는 법은 같다. */
export async function connectCdp(wsUrl: string): Promise<Cdp> {
  const ws = new WebSocket(wsUrl)
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => { resolve() })
    ws.addEventListener('error', () => { reject(new Error(`CDP 에 못 붙었다: ${wsUrl}`)) })
  })

  let msgId = 0
  const waiters = new Map<number, (msg: CdpMessage) => void>()
  ws.addEventListener('message', (e: MessageEvent) => {
    const msg = JSON.parse(String(e.data)) as CdpMessage
    if (msg.id !== undefined && waiters.has(msg.id)) {
      waiters.get(msg.id)?.(msg)
      waiters.delete(msg.id)
    }
  })

  const send = (method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
    const id = ++msgId
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve) => {
      waiters.set(id, (msg) => { resolve(msg.result ?? {}) })
    })
  }

  return {
    send,
    async evalJs<T>(expression: string): Promise<T | undefined> {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      const inner = r.result as { value?: unknown } | undefined
      return inner?.value as T | undefined
    },
    close(): void {
      try { ws.close() } catch { /* 이미 닫혔다 */ }
    },
  }
}
