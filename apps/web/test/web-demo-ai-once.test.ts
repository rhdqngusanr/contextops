import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DEMO_AI_WORDS, DemoAiOnceView, demoAiMeta, type DemoAiOnceState } from '../src/components/demo-ai-once'
import { DEMO_AI_PRESETS } from '../src/lib/demo/ai-presets'
import { ApiClientError } from '../src/lib/web/api'
import type { DemoAiOnceResult } from '../src/lib/web/queries'

// =====================================================================
//  🔴 게스트의 「AI 한 번」 조각 — **모양 넷을 전부 그려서 읽는다** (`components/demo-ai-once.tsx` · 2026-09-13)
//
//  ★ 왜 — 브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 「상한에 닿았다」「못 찾았다」는 사람이 손으로 만들기 어려운
//    상태라 그냥 두면 아무도 본 적 없는 채로 배포된다.
//  재는 것: 버튼이 표에서 온다 · 도는 동안 잠긴다 · 결과가 짝·질문·쓴 값을 그대로 말한다 · 못 찾으면 지어내지 않는다 ·
//    상한이면 [다시 시도] 대신 기록 카드를 가리킨다 · 「저장되지 않음」을 말한다 · 「실시간」이라는 낱말이 없다.
// =====================================================================

const html = (state: DemoAiOnceState): string =>
  renderToStaticMarkup(createElement(DemoAiOnceView, { state, onPick: () => {} }))

const RESULT: DemoAiOnceResult = {
  preset: 'refund_three_days',
  conflicts: [{
    kind: 'contradiction', severity: 'high', question: '환불 기한이 24시간인가요, 3영업일인가요?',
    other: { id: 'item_policy_refund', title: '환불은 24시간 안에 종결한다' },
  }],
  compared: 7,
  model: 'gemini-3.5-flash',
  input_tokens: 2109,
  output_tokens: 663,
  cost_usd: 0.009131,
  duration_ms: 4230,
}

describe('게스트의 AI 한 번 — 모양 넷', () => {
  it('처음: 메모 버튼이 표의 수만큼 서고, 누를 수 있고, 저장하지 않는다고 먼저 말한다', () => {
    const out = html({ phase: 'idle' })
    for (const p of DEMO_AI_PRESETS) expect(out).toContain(p.label)
    expect(out.match(/<button/g)?.length).toBe(DEMO_AI_PRESETS.length)
    expect(out).not.toContain('disabled')
    expect(out).toContain('저장되지 않고')
  })

  it('도는 중: 버튼이 전부 잠기고, 무엇을 넣었는지와 기다릴 시간을 말한다', () => {
    const out = html({ phase: 'running', preset: 'refund_three_days' })
    expect(out.match(/disabled=""/g)?.length).toBe(DEMO_AI_PRESETS.length)
    expect(out).toContain(DEMO_AI_WORDS.running)
    expect(out).toContain(DEMO_AI_PRESETS[0].title)
  })

  it('🔴 찾았음: 부딪히는 규칙 · AI 의 질문 · 무엇을 얼마나 썼는지가 그대로 보인다', () => {
    const out = html({ phase: 'done', preset: 'refund_three_days', result: RESULT })
    expect(out).toContain('환불은 24시간 안에 종결한다')
    expect(out).toContain('환불 기한이 24시간인가요, 3영업일인가요?')
    expect(out).toContain('gemini-3.5-flash')
    expect(out).toContain('4.2초')
    expect(out).toContain('2,109')
    expect(out).toContain(DEMO_AI_WORDS.notSaved)
    expect(out).toContain('data-severity="high"')
    //  결정 칸이 없다 — 저장되지 않는 결과에 결정 버튼을 그리면 누른 사람은 결정이 남은 줄 안다.
    expect(out.match(/<button/g)?.length).toBe(DEMO_AI_PRESETS.length)
  })

  it('못 찾음: 지어내지 않고 못 찾았다고 말한다 — 카드가 0장이고 쓴 값은 그대로 말한다', () => {
    const empty = { ...RESULT, conflicts: [] }
    const out = html({ phase: 'done', preset: 'float_money', result: empty })
    expect(out).toContain(DEMO_AI_WORDS.none)
    expect(out).not.toContain('<article')
    expect(out).toContain(demoAiMeta(empty))
  })

  it('오늘 상한: [다시 시도] 대신 아래 기록 카드를 보라고 말한다', () => {
    for (const code of ['RATE_LIMITED', 'BUDGET_EXCEEDED'] as const) {
      const out = html({ phase: 'failed', preset: 'refund_three_days', error: new ApiClientError(code, 429) })
      expect(out).toContain(DEMO_AI_WORDS.capped)
      expect(out).not.toContain('다시 시도')
    }
  })

  it('그 밖의 실패: 오류 문장과 [다시 시도] 가 선다', () => {
    const out = html({ phase: 'failed', preset: 'refund_three_days', error: new ApiClientError('AI_OUTPUT_INVALID', 502) })
    expect(out).toContain('다시 시도')
    expect(out).not.toContain(DEMO_AI_WORDS.capped)
  })

  //  ⚠ 질문 속 id → 이름의 규칙 시험은 `ai-conflict.test.ts` 로 옮겼다 — 변환이 두 탐지 문이 같이 지나는 `askModel` 로 갔다 (FINDINGS 175).

  it('어느 모양에도 「실시간」이라는 낱말이 없다 (DESIGN_BRIEF §2-3)', () => {
    const states: DemoAiOnceState[] = [
      { phase: 'idle' },
      { phase: 'running', preset: 'refund_three_days' },
      { phase: 'done', preset: 'refund_three_days', result: RESULT },
      { phase: 'failed', preset: 'refund_three_days', error: new ApiClientError('RATE_LIMITED', 429) },
    ]
    for (const state of states) expect(html(state)).not.toContain('실시간')
  })
})
