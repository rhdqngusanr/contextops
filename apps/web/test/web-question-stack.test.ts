import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ANSWER_MAX } from '@contextops/schema'

import { QuestionStack, type QuestionStackHandlers, type QuestionStackState } from '../src/components/question-stack'
import { SEED_QUESTIONS } from '../src/lib/api/seed-questions'
import type { QuestionRow } from '../src/lib/web/queries'

// =====================================================================
//  🔴 질문 카드 스택의 **열 모양을 전부 그려서 읽는다** (loop/PROMPT.md ⑦3층)
//
//  ★ 왜 — 브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 「답이 하나도 없는 요약」
//    「저장 실패」「항목이 하나도 안 만들어진 결과」는 사람이 손으로 만들기 어려운
//    상태라, 그냥 두면 **아무도 본 적 없는 채로** 배포된다.
//
//  재는 것 — 전부 DESIGN_BRIEF·이 저장소가 이미 배운 것이다:
//    ① 없는 것을 약속하지 않는다 (항목 0개면 「만들어졌습니다」라고 안 한다 · FINDINGS 66)
//    ② 없는 문을 그리지 않는다 (첫 카드에 [이전] 이 없다 · FINDINGS 59 와 같은 판단)
//    ③ 「실시간」이라는 낱말이 없다 — DESIGN_BRIEF §2-3
//    ④ 진행은 **몇 번째인가**다 — 사람 이름도 점수도 없다 (P5)
//    ⑤ 답 칸의 상한을 화면이 손으로 적지 않는다 (`ANSWER_MAX` 를 읽는다)
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴. 그건 캡처가 있어야 한다
//    (`docs/STATUS.md` 「눈 판정 대기」).
// =====================================================================

const NOOP: QuestionStackHandlers = {
  onDraft: () => {},
  onNext: () => {},
  onBack: () => {},
  onSave: () => {},
}

const QUESTIONS: QuestionRow[] = SEED_QUESTIONS.map((q, i) => ({
  id: `0000000${i}-0000-4000-8000-000000000000`,
  kind: 'seed_question',
  question: q.question,
  status: 'open',
}))

function base(over: Partial<QuestionStackState> = {}): QuestionStackState {
  return {
    questions: QUESTIONS,
    index: 0,
    answers: {},
    draft: '',
    saving: false,
    error: null,
    saved: null,
    ...over,
  }
}

function draw(over: Partial<QuestionStackState> = {}): string {
  return renderToStaticMarkup(createElement(QuestionStack, {
    state: base(over),
    on: NOOP,
    contextHref: '/t/paylab/p/api/context',
  }))
}

/** 답한 것 n개를 만든다 — 요약이 세는 것이 그 수다. */
function answered(n: number): Record<string, string> {
  return Object.fromEntries(QUESTIONS.slice(0, n).map((q) => [q.id, '그렇게 한다.']))
}

const SHAPES: { what: string; over: Partial<QuestionStackState> }[] = [
  { what: '답할 것이 없다', over: { questions: [] } },
  { what: '첫 카드', over: { index: 0, draft: '' } },
  { what: '중간 카드 (쓰는 중)', over: { index: 2, draft: '결제를 안전하게 만든다.', answers: answered(2) } },
  { what: '마지막 카드', over: { index: QUESTIONS.length - 1, draft: '그렇다.', answers: answered(9) } },
  { what: '요약 (3개 답하고 7개 건너뜀)', over: { index: QUESTIONS.length, answers: answered(3) } },
  { what: '요약 (하나도 안 답했다)', over: { index: QUESTIONS.length, answers: {} } },
  { what: '저장 중', over: { index: QUESTIONS.length, answers: answered(3), saving: true } },
  { what: '저장 실패', over: { index: QUESTIONS.length, answers: answered(3), error: new Error('망가짐') } },
  { what: '결과 — 항목이 생겼다', over: { saved: { resolved: 3, created: ['item_seed_mission'] } } },
  { what: '결과 — 항목이 하나도 안 생겼다', over: { saved: { resolved: 2, created: [] } } },
]

describe('질문 카드 스택 — 열 모양을 그려서 읽는다', () => {
  it('열 모양이 **서로 다르게** 보인다', () => {
    const drawn = SHAPES.map((s) => draw(s.over))
    expect(new Set(drawn).size).toBe(SHAPES.length)
  })

  it('어느 모양에도 「실시간」이 없다 (DESIGN_BRIEF §2-3)', () => {
    for (const s of SHAPES) expect(draw(s.over), s.what).not.toContain('실시간')
  })

  it('진행은 「n / 10」이다 — 사람 이름도 점수도 없다 (P5)', () => {
    expect(draw({ index: 2 })).toContain(`3 / ${QUESTIONS.length}`)
    expect(draw({ index: 0 })).toContain(`1 / ${QUESTIONS.length}`)
  })

  it('질문 문구는 **행에 실려 온 것**이다 — 화면이 갖고 있지 않다', () => {
    const html = draw({ index: 4 })
    expect(html).toContain(QUESTIONS[4]!.question)
    expect(html).not.toContain(QUESTIONS[0]!.question)
  })

  it('답 칸의 상한을 화면이 손으로 적지 않는다', () => {
    const html = draw({ index: 0, draft: '가나다' })
    expect(html).toContain(`maxLength="${ANSWER_MAX}"`)
    expect(html).toContain(`3 / ${ANSWER_MAX}자`)
  })

  it('없는 문을 그리지 않는다 — 첫 카드에 [이전] 이 없다', () => {
    expect(draw({ index: 0 })).not.toContain('이전')
    expect(draw({ index: 1 })).toContain('이전')
  })

  it('빈 답으로는 다음으로 못 간다 — 건너뛰기는 언제나 열려 있다', () => {
    //  ⚠ 「답하고 다음」이 비활성인 것과 「건너뛰기」가 있는 것은 한 쌍이다.
    //    건너뛰기가 없으면 모르는 질문 앞에서 사람은 아무 말이나 지어낸다.
    const empty = draw({ index: 0, draft: '   ' })
    expect(empty).toMatch(/답하고 다음<\/button>/)
    expect(empty).toContain('disabled')
    expect(empty).toContain('건너뛰기')
  })

  it('마지막 카드의 버튼이 다르게 말한다', () => {
    expect(draw({ index: QUESTIONS.length - 1, draft: '그렇다.' })).toContain('답하고 마치기')
    expect(draw({ index: 0, draft: '그렇다.' })).toContain('답하고 다음')
  })

  it('요약이 답한 수와 건너뛴 수를 **둘 다** 말한다', () => {
    const html = draw({ index: QUESTIONS.length, answers: answered(3) })
    expect(html).toContain('3개')
    expect(html).toContain('7개는 건너뛰었습니다')
    expect(html).toContain('3개 저장하기')
  })

  it('답한 것이 없으면 저장 버튼이 잠기고 **왜인지** 말한다', () => {
    const html = draw({ index: QUESTIONS.length, answers: {} })
    expect(html).toContain('disabled')
    expect(html).toContain('답한 것이 하나도 없어서 저장할 것이 없습니다')
  })

  it('저장 실패는 요약 자리에서 보인다 — 저장 버튼이 그대로 남는다', () => {
    //  답을 다 쓴 사람을 첫 카드로 되돌리면 그 답은 사라진다. 다시 누를 문이
    //  그 자리에 있어야 한다 — `ErrorState` 의 [다시 시도] 를 따로 두지 않는 이유다.
    const html = draw({ index: QUESTIONS.length, answers: answered(3), error: new Error('x') })
    expect(html).toContain('3개 저장하기')
    expect(html).toContain('ink-bad')
  })

  it('🔴 답한 것이 0개면 「초안 항목으로 만들어집니다」라고 하지 않는다 (FINDINGS 66)', () => {
    //  만들어질 것이 없는데 만들어진다고 말하면 그게 없는 것을 약속하는 화면이다.
    expect(draw({ index: QUESTIONS.length, answers: {} })).not.toContain('만들어집니다')
    expect(draw({ index: QUESTIONS.length, answers: answered(1) })).toContain('만들어집니다')
  })

  it('저장한 답 수와 만들어진 항목 수가 다르면 **왜 다른지** 말한다', () => {
    const html = draw({ saved: { resolved: 3, created: ['item_seed_mission', 'item_seed_goal_done'] } })
    expect(html).toContain('초안 항목 2개가 만들어졌습니다')
    expect(html).toContain('기록으로만 남습니다')
    //  수가 같으면 그 설명이 없다 — 없는 차이를 설명하면 사람은 무언가 빠진 줄 안다.
    expect(draw({ saved: { resolved: 2, created: ['a', 'b'] } })).not.toContain('기록으로만 남습니다')
  })

  it('🔴 항목이 하나도 안 생겼으면 「만들어졌습니다」라고 하지 않는다 (FINDINGS 66)', () => {
    const none = draw({ saved: { resolved: 2, created: [] } })
    expect(none).toContain('답 2개를 저장했습니다')
    expect(none).not.toContain('만들어졌습니다')
    expect(none).toContain('항목은 만들어지지 않았습니다')

    const some = draw({ saved: { resolved: 3, created: ['item_seed_mission', 'item_seed_goal_quarter'] } })
    expect(some).toContain('초안 항목 2개가 만들어졌습니다')
  })

  it('답할 것이 없을 때 카드도 저장 버튼도 안 그린다', () => {
    const html = draw({ questions: [] })
    expect(html).not.toContain('건너뛰기')
    expect(html).not.toContain('저장하기')
    expect(html).toContain('답을 기다리는 질문이 없습니다')
  })
})
