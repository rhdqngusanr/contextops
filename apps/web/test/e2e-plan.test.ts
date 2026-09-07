import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { PUBLISHED_SHOTS, SHOT_PLAN } from '../e2e/plan'
import { copySummary, shotsSummary } from '../e2e/report'
import { PROJECT_SCREENS } from '../src/lib/web/screens'

// =====================================================================
//  관통의 캡처 두 단계(`shots` · `shotcopy`)를 **글자가 아니라 짝으로** 잠근다
//  (FINDINGS 131 · 103바퀴)
//
//  ★ 무엇이 조용히 갈라지나 — 셋이다:
//    ① 화면 표(`PROJECT_SCREENS`)에 한 줄이 늘었는데 캡처 계획이 안 늘어난다
//       → 새 화면은 **영원히 안 찍힌다**. 눈으로는 절대 안 보인다.
//    ② 스크립트가 찍는 요약 줄과 `tools/walkthrough.ps1` 의 `count_log` 정규식이
//       갈라진다 → 관통이 「검사 수를 못 셌다」로 FAIL 한다 (95 · 96 이 겪은 종류).
//    ③ 랜딩에 쓸 캡처(`publish`)에 대체텍스트가 없다 → 그림만 있고 말이 없는 자리가 된다.
// =====================================================================

const walkthrough = readFileSync(
  join(fileURLToPath(new URL('../../..', import.meta.url)), 'tools', 'walkthrough.ps1'),
  'utf8',
)

/** 관통 표에서 한 단계의 `count_log` 정규식을 꺼낸다 — 수를 두 곳에 적지 않기 위해서다 */
function countLogOf(stage: string): RegExp {
  const block = walkthrough.split(`name = "${stage}"`)[1]
  expect(block, `${stage} 단계가 walkthrough 표에 없다`).toBeDefined()
  const m = /count_log = '([^']+)'/.exec(block ?? '')
  expect(m, `${stage} 단계에 count_log 가 없다`).not.toBeNull()
  return new RegExp(m?.[1] ?? '')
}

describe('캡처 계획 (e2e/plan.ts)', () => {
  it('화면 표의 모든 화면이 계획에 있다 — 화면을 더하면 캡처도 는다', () => {
    for (const screen of PROJECT_SCREENS) {
      const shot = SHOT_PLAN.find((s) => s.path.endsWith(`/${screen.path}`))
      expect(shot, `${screen.path} 화면의 캡처가 계획에 없다`).toBeDefined()
    }
    //  랜딩 둘(1440 · 375) + 화면 표 전부
    expect(SHOT_PLAN.length).toBe(PROJECT_SCREENS.length + 2)
  })

  it('캡처 이름이 겹치지 않는다 — 겹치면 한 장이 다른 장을 덮는다', () => {
    const names = SHOT_PLAN.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('랜딩으로 넘길 캡처는 파일 이름과 대체텍스트를 둘 다 가진다', () => {
    expect(PUBLISHED_SHOTS.length).toBeGreaterThan(0)
    for (const shot of PUBLISHED_SHOTS) {
      expect(shot.publish, `${shot.name}`).toMatch(/\.png$/)
      expect(shot.alt.length, `${shot.name} 의 대체텍스트`).toBeGreaterThan(0)
    }
  })
})

describe('관통 표와 요약 줄의 짝', () => {
  it('shots 단계의 정규식이 실제 요약 줄에서 수를 읽는다', () => {
    const re = countLogOf('shots')
    const m = re.exec(shotsSummary(25, 0))
    expect(m?.[1]).toBe('25')
  })

  it('shotcopy 단계의 정규식이 실제 요약 줄에서 수를 읽는다', () => {
    const re = countLogOf('shotcopy')
    const m = re.exec(copySummary(10, 0, 'C:\\x\\public\\shots'))
    expect(m?.[1]).toBe('10')
  })

  it('두 단계가 실제로 있는 파일을 부른다 — prereq 가 없으면 단계는 조용히 SKIP 이다', () => {
    expect(walkthrough).toContain('prereq = "apps\\web\\e2e"')
    expect(walkthrough).toContain('prereq = "apps\\web\\e2e\\publish-shots.ts"')
    expect(walkthrough).toContain('cmd = "pnpm --filter web test:e2e"')
  })
})
