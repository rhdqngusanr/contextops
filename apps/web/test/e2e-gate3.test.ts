import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { GATE3_BUDGET_MS, GATE3_SCREENS, gate3Route } from '../e2e/gate3'
import { APP_SHELL, DEMO_BASE } from '../e2e/plan'
import { PROJECT_SCREENS, screenHref } from '../src/lib/web/screens'

// =====================================================================
//  GATE 3 걸음표를 **글자가 아니라 짝으로** 잠근다 (PLAN P4 둘째 행의 완료 기준 · 105바퀴)
//
//  ★ 무엇이 조용히 갈라지나 — 넷이다:
//    ① 걸음표가 **없는 화면**을 가리킨다 → 게이트가 404 를 밟고, 그 실패는 「제품이
//       고장났다」로 읽힌다 (진짜 원인은 표 한 줄이다).
//    ② 걸음이 **주소를 친다** → 링크가 끊겨도 게이트가 초록이다. 그러면 GATE 3 이
//       재려던 「링크만으로」가 사라진다.
//    ③ 내비의 라벨·주소가 바뀌었는데 걸음표가 옛 낱말을 들고 있다 → 표가 둘이 된다.
//    ④ 예산 3분이 슬그머니 늘어난다 → 넘는 걸 못 잡는다.
// =====================================================================

const gate3Source = readFileSync(
  join(fileURLToPath(new URL('..', import.meta.url)), 'e2e', 'gate3.ts'),
  'utf8',
)

describe('GATE 3 걸음표 (e2e/gate3.ts)', () => {
  it('도는 화면이 전부 화면 표에 실재한다 — 404 로 가는 걸음 0', () => {
    for (const path of GATE3_SCREENS) {
      expect(PROJECT_SCREENS.some((s) => s.path === path), `«${path}» 가 화면 표에 없다`).toBe(true)
    }
  })

  it('SPEC §9 의 화면 5·6·8·9 를 돈다 — Context · 제안 · Roadmap · Sync', () => {
    expect([...GATE3_SCREENS]).toEqual(['context', 'proposals', 'roadmap', 'sync'])
  })

  it('차례가 화면 표의 차례와 같다 — 일의 차례를 거꾸로 밟지 않는다', () => {
    const order = PROJECT_SCREENS.map((s) => s.path)
    const seen = GATE3_SCREENS.map((p) => order.indexOf(p))
    expect(seen).toEqual([...seen].sort((a, b) => a - b))
  })

  it('걸음은 랜딩 accent 하나 + 화면 수만큼이다', () => {
    expect(gate3Route().length).toBe(GATE3_SCREENS.length + 1)
  })

  it('첫 걸음은 랜딩의 **유일한 accent** 이고 낱말을 따로 적지 않는다', () => {
    const first = gate3Route()[0]
    expect(first?.click).toBe('.btn-primary')
    //  낱말의 정본은 `landing.tsx` 의 `LANDING_HEAD.cta` 다 — 여기 베끼면 둘이 갈린다.
    expect(first?.label).toBeNull()
  })

  it('화면 걸음의 라벨과 주소가 화면 표에서 온다 — 손으로 적은 낱말 0', () => {
    const steps = gate3Route(DEMO_BASE).slice(1)
    steps.forEach((step, i) => {
      const screen = PROJECT_SCREENS.find((s) => s.path === GATE3_SCREENS[i])
      expect(screen).toBeDefined()
      if (screen === undefined) return
      expect(step.label).toBe(screen.label)
      expect(step.click).toBe(`a.nav-link[href="${screenHref(DEMO_BASE, screen)}"]`)
      expect(step.expect.source).toBe(screen.match.source)
    })
  })

  it('도착 판정은 앱 껍데기 하나를 본다 — selector 를 두 곳에 적지 않는다', () => {
    for (const step of gate3Route()) expect(step.needs).toBe(APP_SHELL)
  })

  it('걸음의 이름·파일 조각이 겹치지 않는다 — 겹치면 캡처가 서로를 덮는다', () => {
    const slugs = gate3Route().map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('예산은 3분이다 (SPEC §13 GATE 3)', () => {
    expect(GATE3_BUDGET_MS).toBe(3 * 60 * 1000)
  })

  it('주소를 치는 자리는 **첫 링크 하나뿐**이다 — 걸음 안에 Page.navigate 가 없다', () => {
    //  ⚠ 걸음이 막혔을 때 `Page.navigate` 로 건너뛰면 게이트가 초록인데 링크는 끊겨 있다.
    //    하네스가 주소를 치는 곳은 `runGate3` 의 첫 `/` 한 줄이어야 한다.
    //  ⚠ 주석은 빼고 센다 — 「왜 하나뿐인가」를 설명하는 줄까지 세면 설명을 못 적는다.
    const code = gate3Source
      .split(/\r?\n/)
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n')
    const navigates = code.match(/Page\.navigate/g) ?? []
    expect(navigates.length).toBe(1)
  })
})
