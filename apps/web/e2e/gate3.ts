// =====================================================================
//  GATE 3 — **시크릿 창에서 링크만으로 3분 체험** (SPEC §13 9/13 · PLAN P4 둘째 행의 완료 기준)
//
//  ★ 왜 이 파일이 생겼나 (105바퀴) — P4 둘째 행의 격차는 다 닫혔는데 **완료 기준 하나**가
//    아홉 바퀴째 남아 있었다. 「사람이 시크릿 창에서 한 번 밟는다」로 두면 무인 루프는
//    영원히 못 닫고, 사람이 밟아도 **다음에 깨지면 아무도 모른다.** 그래서 관통이 매번
//    밟는다 — 게이트는 문서보다 강하다.
//
//  🔴 무엇이 「밟았다」인가 — 넷을 동시에 만족해야 한다:
//    ① **빈 창**이다 — 새 브라우저 컨텍스트(시크릿과 같은 것)라 앞선 캡처가 받아 둔
//       게스트 세션이 없다. 시작할 때 `localStorage` 가 0칸인 것으로 잰다.
//    ② **링크만으로** 간다 — 주소를 치는 것은 **첫 `/` 하나뿐**이고, 그 뒤는 전부
//       화면에 보이는 것을 **누른다.** (`Page.navigate` 호출 수를 세서 잠근다)
//    ③ **화면 5·6·8·9 가 진짜로 그려진다** — 껍데기가 아니라 skeleton 0 까지.
//    ④ **3분 안에** 끝난다 (`GATE3_BUDGET_MS`).
//
//  🔴 **걸음을 하나 더하려면**: 아래 `GATE3_SCREENS` 에 화면 `path` 한 줄이다.
//     낱말(내비 라벨)도 주소도 여기 적지 마라 — `PROJECT_SCREENS` 에서 온다.
//     `apps/web/test/e2e-gate3.test.ts` 가 「표의 화면이 실재하나」를 센다.
//
//  ⚠ 이 걸음은 `shots.ts` 가 캡처를 **다 찍은 뒤에** 부른다. `next dev` 는 화면을 처음
//    열 때 컴파일하므로, 앞에서 안 데워 놓으면 여기서 재는 3분이 「제품이 느린 것」이
//    아니라 「개발 서버가 컴파일하는 것」이 된다. 그러면 이 게이트는 아무 말도 못 한다.
// =====================================================================

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { PROJECT_SCREENS, screenHref } from '../src/lib/web/screens'
import { type Cdp, connectCdp, sleep, waitFor } from './cdp'
import { APP_SHELL, DEMO_BASE } from './plan'

/**
 * 🔴 GATE 3 의 예산 — **3분** (SPEC §13 「시크릿 창에서 링크만으로 3분 체험」).
 * ⚠ 이 수를 늘려서 초록을 만들지 마라. 넘으면 **어느 걸음이 오래 걸렸나**가 결과에
 *   남는다(`.ci/gate3.json`) — 고칠 곳은 그 걸음이다.
 */
export const GATE3_BUDGET_MS = 180_000

/**
 * 심사위원이 도는 화면 — SPEC §9 의 **화면 5·6·8·9**
 * (Context · 제안 · Roadmap · Sync). 차례는 일의 차례다(`PROJECT_SCREENS` 와 같다).
 * ⚠ 여기 적는 것은 **`path` 뿐**이다. 라벨과 주소는 화면 표가 정한다.
 */
export const GATE3_SCREENS: readonly string[] = ['context', 'proposals', 'roadmap', 'sync']

export type GateStep = {
  /** 사람이 읽는 걸음 이름 */
  readonly name: string
  /** 결과 파일과 캡처의 이름 조각 (ascii) */
  readonly slug: string
  /** **누를 것.** 주소를 치는 걸음이 아니다 — 화면에 보이는 것을 고른다 */
  readonly click: string
  /** 그 링크에 보여야 하는 글자. `null` 이면 글자를 안 잰다 */
  readonly label: string | null
  /** 눌렀을 때 도착해야 하는 주소 */
  readonly expect: RegExp
  /** 도착한 화면이 그려졌다는 증거 */
  readonly needs: string
}

/**
 * 걸음표 — 첫 줄은 랜딩의 accent 하나, 나머지는 내비의 링크다.
 *
 * ⚠ 첫 줄의 `label` 이 `null` 인 이유 — 랜딩의 accent 낱말의 정본은 `landing.tsx` 의
 *   `LANDING_HEAD.cta` 인데, 그 파일은 CSS 모듈을 import 하는 **화면 코드**라 여기서
 *   불러오면 e2e 하네스가 화면을 빌드해야 돌아간다. 낱말 대신 **「이 화면의 유일한
 *   accent」**(`.btn-primary`)로 고른다 — 그 「하나뿐」은 이미 랜딩 시험이 잠근다.
 */
export function gate3Route(base: string = DEMO_BASE): readonly GateStep[] {
  return [
    {
      name: '랜딩의 accent 를 누른다 → 게스트 세션이 붙는다',
      slug: 'demo',
      click: '.btn-primary',
      label: null,
      expect: new RegExp(`^${base}/`),
      needs: APP_SHELL,
    },
    ...GATE3_SCREENS.map((path): GateStep => {
      const screen = PROJECT_SCREENS.find((s) => s.path === path)
      //  ⚠ 표에 없는 화면을 걸음으로 두면 404 로 가는 걸음이 된다. 조용히 건너뛰지 않는다.
      if (screen === undefined) throw new Error(`GATE3_SCREENS 의 «${path}» 가 화면 표에 없다`)
      return {
        name: `내비에서 「${screen.label}」 링크`,
        slug: screen.path,
        click: `a.nav-link[href="${screenHref(base, screen)}"]`,
        label: screen.label,
        expect: screen.match,
        needs: APP_SHELL,
      }
    }),
  ]
}

/** 한 걸음의 실측 — 결과 파일과 화면 출력이 같은 것을 읽는다 */
export type GateStepResult = { readonly name: string; readonly ms: number; readonly ok: boolean; readonly at: string }

export type Gate3Result = {
  readonly budget_ms: number
  readonly total_ms: number
  readonly within_budget: boolean
  readonly navigations: number
  readonly steps: readonly GateStepResult[]
}

type Options = {
  /** browser 끝점 연결 — 빈 컨텍스트를 만드는 것은 브라우저의 일이다 */
  readonly browser: Cdp
  readonly cdpPort: number
  /** `http://127.0.0.1:3112` */
  readonly origin: string
  readonly base: string
  /** 캡처를 남길 폴더 (`.ci/shots`) */
  readonly shotsDir: string
  /** 실측을 남길 파일 (`.ci/gate3.json`) */
  readonly jsonPath: string
  readonly check: (name: string, ok: boolean, detail?: string) => void
}

/**
 * 빈 창을 하나 열고 걸음표대로 눌러 본다. 검사는 넘겨받은 `check` 장부에 적는다 —
 * 관통이 세는 수(`e2e: N passed`)가 하나이기 때문이다.
 */
export async function runGate3(opts: Options): Promise<void> {
  const { browser, cdpPort, origin, base, shotsDir, jsonPath, check } = opts

  //  ① 빈 브라우저 컨텍스트 = 시크릿 창. 앞 캡처가 받아 둔 게스트 세션이 안 따라온다.
  const ctx = await browser.send('Target.createBrowserContext', { disposeOnDetach: false })
  const browserContextId = ctx.browserContextId as string | undefined
  check('GATE 3: 시크릿 창(빈 컨텍스트)이 열렸다', typeof browserContextId === 'string', String(browserContextId))
  if (browserContextId === undefined) return

  const created = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId })
  const targetId = created.targetId as string | undefined
  if (targetId === undefined) {
    check('GATE 3: 빈 창에 탭이 생겼다', false)
    return
  }
  const page = await connectCdp(`ws://127.0.0.1:${cdpPort}/devtools/page/${targetId}`)
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  })

  const steps: GateStepResult[] = []
  let navigations = 0
  const startedAt = Date.now()

  try {
    //  ② 사람이 받은 링크 하나 — **여기서만 주소를 친다.**
    navigations++
    await page.send('Page.navigate', { url: `${origin}/` })
    let landingShown = false
    try {
      await waitFor('랜딩', async () => {
        landingShown = (await page.evalJs<boolean>(
          `(() => { const el = document.querySelector('.btn-primary'); return !!el && el.getClientRects().length > 0 })()`,
        )) === true
        return landingShown
      }, 120_000)
    } catch { /* 아래 검사가 FAIL 로 적는다 */ }
    check('GATE 3: 링크 하나로 랜딩이 열린다', landingShown, `${origin}/`)

    //  ⚠ **빈 창인지는 여기서만 잴 수 있다** — 한 걸음만 더 가면 게스트 세션이 저장된다.
    const carried = await page.evalJs<number>('window.localStorage.length')
    check('GATE 3: 들고 온 것이 없다 (localStorage 0칸)', carried === 0, `${String(carried)}칸`)

    //  ③ 걸음표대로 **누른다**
    for (const step of gate3Route(base)) {
      const at = Date.now()

      const found = await page.evalJs<{ visible: boolean; text: string; href: string }>(`(() => {
        const el = document.querySelector(${JSON.stringify(step.click)})
        if (!el) return { visible: false, text: '', href: '' }
        return {
          visible: el.getClientRects().length > 0,
          text: (el.textContent || '').trim(),
          href: el.getAttribute('href') || '',
        }
      })()`)
      check(`GATE 3 · ${step.name}: 누를 것이 화면에 보인다`, found?.visible === true, step.click)
      if (step.label !== null) {
        //  ⚠ 낱말을 e2e 가 따로 적으면 내비가 라벨을 바꿔도 게이트가 모른다.
        check(`GATE 3 · ${step.name}: 링크의 글자가 화면 표와 같다`, found?.text === step.label,
          `«${String(found?.text)}» vs «${step.label}»`)
      }
      if (found?.visible !== true) {
        steps.push({ name: step.name, ms: Date.now() - at, ok: false, at: '' })
        continue
      }

      await page.evalJs(`(() => { document.querySelector(${JSON.stringify(step.click)}).click(); return 1 })()`)

      let where = ''
      let arrived = false
      try {
        await waitFor(`${step.slug} 도착`, async () => {
          where = (await page.evalJs<string>('location.pathname')) ?? ''
          arrived = step.expect.test(where)
          return arrived
        }, 120_000)
      } catch { /* 아래 검사가 FAIL 로 적는다 */ }
      check(`GATE 3 · ${step.name}: 도착했다`, arrived, `${where} ~ ${String(step.expect)}`)

      //  껍데기가 떴다 ≠ 화면이 열렸다. 로딩이 끝나야 사람이 「봤다」다 (`shots.ts` 와 같은 잣대).
      let drawn = false
      try {
        await waitFor(`${step.slug} 그려짐`, async () => {
          drawn = (await page.evalJs<boolean>(`(() => {
            const el = document.querySelector(${JSON.stringify(step.needs)})
            return !!el && el.getClientRects().length > 0 && document.querySelectorAll('.skeleton').length === 0
          })()`)) === true
          return drawn
        }, 60_000)
      } catch { /* 아래 검사가 FAIL 로 적는다 */ }
      check(`GATE 3 · ${step.name}: 화면이 다 그려졌다 (skeleton 0)`, drawn)

      //  ⚠ 개발 서버의 배지는 제품이 아니다 — 눈 판정 재료에서 걷어낸다 (`shots.ts` 와 같은 이유).
      await page.evalJs(`(() => { document.querySelectorAll('nextjs-portal').forEach((e) => e.remove()); return 1 })()`)
      const png = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      const data = png.data as string | undefined
      if (typeof data === 'string') {
        writeFileSync(join(shotsDir, `gate3-${step.slug}.png`), Buffer.from(data, 'base64'))
      }

      steps.push({ name: step.name, ms: Date.now() - at, ok: arrived && drawn, at: where })
    }
  } finally {
    page.close()
    await browser.send('Target.disposeBrowserContext', { browserContextId })
    await sleep(200)
  }

  const total = Date.now() - startedAt
  const result: Gate3Result = {
    budget_ms: GATE3_BUDGET_MS,
    total_ms: total,
    within_budget: total <= GATE3_BUDGET_MS,
    navigations,
    steps,
  }
  writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')

  //  ⚠ 「주소를 친 것이 하나뿐」이 곧 **링크만으로**다. 이걸 안 세면 다음 사람이
  //    막히는 걸음을 `Page.navigate` 로 건너뛰고 초록을 만든다 — 그러면 게이트가 없다.
  check('GATE 3: 주소를 친 것은 첫 링크 하나뿐이다 (나머지는 눌렀다)', navigations === 1, `navigate ${navigations}회`)
  check(`GATE 3: ${Math.round(GATE3_BUDGET_MS / 1000)}초 예산 안에 화면 5·6·8·9 를 다 봤다`,
    result.within_budget,
    `${(total / 1000).toFixed(1)}초 · ${steps.map((s) => `${s.name.replace('내비에서 ', '')} ${(s.ms / 1000).toFixed(1)}s`).join(' · ')}`)
}
