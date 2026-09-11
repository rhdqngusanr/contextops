import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PUBLISHED_SHOTS } from '../e2e/plan'
import { Landing, TERMINAL_REPLAY } from '../src/components/landing'
import { RECORDED_CONFLICTS } from '../src/lib/demo/seed'
import { DEMO_ENTRY_PATH, DEMO_TENANT, demoBarText, demoResetText } from '../src/lib/demo/tenant'
import { PROJECT_SCREENS } from '../src/lib/web/screens'
import { DEMO_TOUR, tourIndexOf } from '../src/lib/web/tour'

// =====================================================================
//  심사위원 3분 코스의 게이트 (`lib/web/tour.ts` · 2026-09-10)
//
//  ★ 왜 시험인가 — 코스는 **숫자를 말한다**(충돌 3건 · 기기 14대 · 근거 n / 3). 씨앗이 바뀌면 코스가
//    거짓말을 하는데 화면은 멀쩡히 뜬다. 근거 없는 숫자는 화면에 없다 (DESIGN_BRIEF §2-1) — 기계가 잰다.
//  재는 것:
//    ① 걸음의 `path` 는 전부 화면 표(`PROJECT_SCREENS`)의 화면이다 · 순서는 표의 차례와 같다
//    ② 문장의 숫자가 씨앗과 같다 — 충돌 · 기기 · 완료 기준
//    ③ `/demo` 는 첫 걸음으로 보낸다 · 랜딩의 캡처는 코스의 걸음과 같은 화면이다
//    ④ 랜딩이 걸음의 「볼 것」을 캡처 밑에 그대로 적는다 · `tourIndexOf` 가 주소를 걸음으로 옮긴다
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const seed = JSON.parse(readFileSync(join(webRoot, '..', '..', 'fixtures', 'seed', 'demo.json'), 'utf8')) as { devices: unknown[] }

describe('① 걸음은 화면 표의 화면이고 차례도 표를 따른다', () => {
  it('path 가 전부 PROJECT_SCREENS 에 있다', () => {
    const paths = PROJECT_SCREENS.map((s) => s.path)
    for (const stop of DEMO_TOUR.stops) expect(paths, stop.path).toContain(stop.path)
  })

  it('걸음의 차례가 화면 표의 차례와 같다 (일의 차례 = 표의 차례)', () => {
    const order = DEMO_TOUR.stops.map((s) => PROJECT_SCREENS.findIndex((p) => p.path === s.path))
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})

describe('② 문장의 숫자는 씨앗의 사실이다', () => {
  const text = DEMO_TOUR.stops.map((s) => s.see).join('\n')

  it(`충돌 ${RECORDED_CONFLICTS.length}건`, () => {
    expect(text).toContain(`충돌 ${RECORDED_CONFLICTS.length}건`)
  })

  it(`기기 ${seed.devices.length}대`, () => {
    expect(text).toContain(`기기 ${seed.devices.length}대`)
  })

  it(`완료 조건 ${TERMINAL_REPLAY.milestone.done_when.length}개`, () => {
    expect(text).toContain(`완료 조건 ${TERMINAL_REPLAY.milestone.done_when.length}개`)
  })
})

describe('③ 문과 캡처가 코스를 따른다', () => {
  it('/demo 는 첫 걸음으로 보낸다', () => {
    expect(DEMO_ENTRY_PATH.endsWith(`/${DEMO_TOUR.stops[0].path}`)).toBe(true)
  })

  it('랜딩에 싣는 캡처는 코스의 걸음과 같은 화면이다 (같은 차례)', () => {
    expect(PUBLISHED_SHOTS.map((s) => s.path.split('/').pop())).toEqual(DEMO_TOUR.stops.map((s) => s.path))
  })
})

describe('④ 랜딩과 주소', () => {
  it('랜딩이 걸음의 「볼 것」을 캡처 밑에 그대로 적는다', () => {
    const out = renderToStaticMarkup(createElement(Landing))
    for (const stop of DEMO_TOUR.stops) expect(out).toContain(stop.see)
    expect(out).toContain(DEMO_TOUR.title)
  })

  it('tourIndexOf 가 주소를 걸음으로 옮긴다 (코스 밖은 -1)', () => {
    expect(tourIndexOf('/t/demo/p/paylab-api/review')).toBe(0)
    expect(tourIndexOf('/t/demo/p/paylab-api/packs/1.1.0')).toBe(1)
    expect(tourIndexOf('/t/demo/p/paylab-api/context')).toBe(-1)
  })
})

// ---------------------------------------------------------------------
//  ⑤ 게스트 첫 화면 — 안내가 제품을 밀어내지 않는다 (2026-09-11)
//
//  ★ 왜 게이트인가 — 이건 **조용히 되돌아간다.** 안내를 한 줄 더할 곳으로 배너 위가
//    제일 자연스럽고, 한 줄씩 쌓이면 아무 시험도 안 빨개진 채로 휴대폰 첫 화면이 다시
//    설명으로 가득 찬다. 실제로 그렇게 됐다 — 375×812 에서 첫 카드 제목이 y≈1280 이었고
//    (내비 250 + 배너·투어 690 + 화면 머리글 250), 즉 **첫 화면에 제품이 0픽셀**이었다.
//    사용자 지적: 「demo 로 좀 더 사용자 친화적으로 해야 할 것 같아」.
//  재는 것: 자리(위/아래)가 갈려 있나 · 위 한 줄이 짧게 유지되나.
// ---------------------------------------------------------------------
describe('⑤ 게스트 안내는 본문 위 한 줄과 본문 아래 코스로 갈린다', () => {
  const layout = readFileSync(
    join(webRoot, 'src', 'app', 't', '[team]', 'p', '[project]', 'layout.tsx'), 'utf8',
  )

  it('뼈대가 <DemoBar/> 를 children 앞에, <DemoTour/> 를 뒤에 둔다', () => {
    const bar = layout.indexOf('<DemoBar />')
    const kids = layout.indexOf('{children}')
    const tour = layout.indexOf('<DemoTour />')
    //  ⚠ 셋 다 있어야 한다 — 하나라도 -1 이면 아래 대소 비교가 조용히 통과한다.
    expect(bar, '<DemoBar />').toBeGreaterThan(-1)
    expect(tour, '<DemoTour />').toBeGreaterThan(-1)
    expect(bar).toBeLessThan(kids)
    expect(tour).toBeGreaterThan(kids)
  })

  it('본문 위 한 줄은 375px 에서 한 줄이도록 짧다 — 팀 이름과 「읽기 전용」뿐', () => {
    const bar = demoBarText()
    expect(bar).toContain(DEMO_TENANT.teamName)
    expect(bar).toContain('읽기 전용')
    //  🔴 길이 상한이 이 시험의 전부다. 이 줄에 문장을 더하려거든 **아래 코스로 내려라.**
    //  ⚠ 이 수는 「한 줄에 들어가는 폭」이 아니다 — 그건 글꼴·폭이 정하고 **눈으로** 본다
    //    (`.ci/shots/` 의 375px 캡처). 여기서 막는 것은 **문장이 쌓이는 것**이다.
    //    지금 문구가 30자이고, 한 문장이 더 붙으면 반드시 이 수를 넘는다.
    expect(bar.length, bar).toBeLessThanOrEqual(36)
    //  코스·리셋 시각은 위에 오지 않는다 — 그 둘이 690px 을 먹던 장본인이다.
    expect(bar).not.toContain(DEMO_TOUR.title)
    expect(bar).not.toContain(DEMO_TENANT.resetAt)
  })

  it('리셋 안내는 아래 코스가 말한다 (사라지지는 않는다)', () => {
    expect(demoResetText()).toContain(DEMO_TENANT.resetAt)
  })
})
