import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PUBLISHED_SHOTS } from '../e2e/plan'
import { Landing, TERMINAL_REPLAY } from '../src/components/landing'
import { RECORDED_CONFLICTS } from '../src/lib/demo/seed'
import { DEMO_ENTRY_PATH } from '../src/lib/demo/tenant'
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
