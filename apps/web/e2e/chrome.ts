// =====================================================================
//  헤드리스 Chrome 을 띄우고 CDP 로 붙는 **정본 한 곳**
//
//  ★ 왜 파일이 따로 생겼나 — 이 절차의 사용자가 **둘**이 됐다:
//    ① `shots.ts` (관통의 `shots` 단계 · `next dev` 를 찍는다)
//    ② `production.ts` (배포된 production 을 밟는다 · PLAN P5 첫 행)
//    하나뿐일 때는 `shots.ts` 안에 있는 것이 맞았다. 둘째가 생겼으니 **그때 정본으로
//    올린다** (CLAUDE.md 「경계에는 인터페이스를 두되, 사용자가 하나뿐이면 만들지 마라」).
//    베껴 두면 Chrome 경로 후보나 대기 시간이 한쪽에서만 늘어난다.
//
//  ⚠ 여기는 **브라우저를 띄우는 일**만 한다. 무엇을 누르고 무엇을 재는지는 부르는 쪽의
//    일이다 — 재는 것까지 여기로 끌어오면 둘의 요구가 이 파일에서 부딪힌다.
//  ⚠ 자식 프로세스를 여기서 죽이지 않는다. 죽이는 책임은 자식을 모아 두는 쪽(`track`)에
//    있고, 그 쪽이 `next dev` 도 같이 들고 있다 — 죽이는 자리가 둘이면 하나가 샌다.
// =====================================================================

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { type Cdp, connectCdp, waitFor } from './cdp'

/**
 * 이 기계에 설치된 Chrome. 없으면 **크게 실패한다** — 조용히 건너뛰면
 * 「캡처 0장으로 통과」가 되고, 그건 이 단계가 막으려는 바로 그 상태다.
 * ⚠ 새 자리를 더할 때는 `CHROME_PATH` 로 먼저 넘겨 보고, 그래도 잦으면 여기 한 줄이다.
 */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter((p): p is string => typeof p === 'string' && p.length > 0)

/** 설치된 Chrome 의 경로. 못 찾으면 던진다 — 건너뛰지 않는다. */
export function findChrome(): string {
  const chrome = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (chrome === undefined) {
    throw new Error('Chrome 을 못 찾았다 — CHROME_PATH 로 알려 줘라 (헤드리스 캡처에 필요하다)')
  }
  return chrome
}

export type LaunchedChrome = {
  /** 죽이는 것은 부르는 쪽의 일이다 (`track()` 에 넣어라) */
  readonly child: ChildProcess
  /** Chrome 이 죽은 **뒤에** 지울 임시 프로필 폴더 — 살아 있으면 EBUSY 다 */
  readonly profileDir: string
}

export type LaunchOpts = {
  /**
   * 창을 **보이게** 띄운다 (기본은 헤드리스).
   * ★ 왜 생겼나 (2026-09-12) — 셋째 사용자가 왔다: `scripts/demo-drive.ts` 가 화면 녹화용으로
   *   **사람이 보는 창**을 몰아야 한다. 헤드리스는 녹화할 창이 없다.
   *   ⚠ 함수를 베끼지 않고 인자를 하나 더한 이유는 이 파일 머리말 그대로다 — 베끼면
   *     Chrome 경로 후보나 기다림이 한쪽에서만 늘어난다.
   */
  readonly headed?: boolean
  /** 창 크기. 녹화는 이 크기가 곧 영상 해상도다 — 헤드리스에서도 뷰포트가 된다. */
  readonly windowSize?: { readonly width: number; readonly height: number }
  /**
   * **앱 창**으로 연다 (`--app=<url>`) — 탭 줄도 주소창도 없는 창이다.
   * ★ 왜 — 녹화에 브라우저 장식이 같이 찍히면 제품이 아니라 「브라우저 스크린샷」으로 보인다.
   *   앱 창이면 창 전체가 곧 페이지라, 녹화할 때 자를 것이 없다.
   * ⚠ 이 값이 첫 주소가 된다. 뒤에 `Page.navigate` 로 옮겨 다니는 것은 그대로 된다.
   */
  readonly appUrl?: string
  /**
   * 브라우저의 **언어** (`--lang`). 페이지 언어와 맞춰 두면 번역 풍선이 아예 안 뜬다.
   * ⚠ `--disable-features=Translate` 는 이 Chrome 에서 **안 먹었다** (2026-09-12 실측 · 풍선이 그대로 떴다).
   *   뜨는 진짜 이유는 「브라우저는 한국어인데 페이지가 영어」라서이므로, 언어를 맞추는 쪽이 원인을 없앤다.
   *   덤으로 `Accept-Language` 도 같이 바뀌어서, 우리 앱의 자동 감지와도 앞뒤가 맞는다.
   */
  readonly lang?: string
}

/**
 * Chrome 을 하나 띄우고 CDP 가 열릴 때까지 기다린다.
 * ⚠ 프로필은 매번 새 임시 폴더다 — 앞 판이 받아 둔 쿠키·세션이 따라오면
 *   「빈 창에서 링크만으로」(GATE 3 ①)가 거짓말이 된다.
 */
export async function launchChrome(cdpPort: number, opts: LaunchOpts = {}): Promise<LaunchedChrome> {
  const chrome = findChrome()
  const profileDir = mkdtempSync(join(tmpdir(), 'ctxops-e2e-'))
  const size = opts.windowSize
  const child = spawn(chrome, [
    //  ⚠ 헤드리스일 때만 `--disable-gpu` 다 — 보이는 창에서 GPU 를 끄면 스크롤이 끊겨 보인다(녹화에 그대로 남는다).
    ...(opts.headed === true ? [] : ['--headless=new', '--disable-gpu']),
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check',
    //  🔴 **번역 제안 풍선을 막는다** (2026-09-12). 영어 화면을 한국어 Chrome 으로 열면 오른쪽 위에
    //     「영어 → 한국어」 풍선이 떠서 **머리글을 가린다** — 영어판 녹화 첫 판이 그렇게 망했다.
    //     그건 제품이 아니라 브라우저의 말이라 영상에도 캡처에도 있으면 안 된다.
    //     ⚠ 막는 것은 `lang` 이다 (위 주석) — 플래그로 끄는 길은 안 먹었다.
    '--disable-infobars',
    ...(opts.lang === undefined ? [] : [`--lang=${opts.lang}`]),
    ...(size === undefined ? [] : [`--window-size=${size.width},${size.height}`]),
    //  ⚠ 앱 창이면 첫 주소가 인자로 들어가고, 아니면 빈 탭에서 시작한다.
    opts.appUrl === undefined ? 'about:blank' : `--app=${opts.appUrl}`,
  ], { stdio: 'ignore' })
  return { child, profileDir }
}

/** 처음 열려 있는 page 대상에 붙는다. `Page.*`·`Runtime.*` 은 여기서 부른다. */
export async function connectPage(cdpPort: number): Promise<Cdp> {
  let target: { webSocketDebuggerUrl: string } | undefined
  await waitFor('Chrome', async () => {
    try {
      const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json() as
        { type: string; webSocketDebuggerUrl: string }[]
      target = list.find((t) => t.type === 'page')
      return target !== undefined
    } catch { return false }
  }, 60_000)
  if (target === undefined) throw new Error('Chrome 의 page 대상을 못 찾았다')

  const page = await connectCdp(target.webSocketDebuggerUrl)
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  return page
}

/**
 * **브라우저** 끝점에 붙는다. `Target.createBrowserContext`(= 시크릿 창)는
 * page 연결로는 못 부른다 — 그래서 붙는 자리가 둘이다 (`cdp.ts` 머리말).
 *
 * ⚠ **여기서도 기다린다.** `shots.ts` 는 `connectPage()` 를 먼저 불러서 그 안의 기다림에
 *   업혀 있었지만, `production.ts` 는 page 연결 없이 여기부터 부른다 — 안 기다리면
 *   `launchChrome()` 직후에 `fetch failed` 가 난다 (실측: 첫 판이 그렇게 죽었다).
 *   기다리는 자리가 부르는 쪽에 있으면 **부르는 쪽마다 빠뜨린다.**
 */
export async function connectBrowser(cdpPort: number): Promise<Cdp> {
  let version: { webSocketDebuggerUrl: string } | undefined
  await waitFor('Chrome(browser 끝점)', async () => {
    try {
      version = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json() as
        { webSocketDebuggerUrl: string }
      return typeof version.webSocketDebuggerUrl === 'string'
    } catch { return false }
  }, 60_000)
  if (version === undefined) throw new Error('Chrome 의 browser 끝점을 못 찾았다')
  return connectCdp(version.webSocketDebuggerUrl)
}
