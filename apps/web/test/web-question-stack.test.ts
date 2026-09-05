import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ANSWER_MAX, ANSWER_SLOT_KEYS, ANSWER_SLOTS, CONFLICT_KIND_RULES, QUESTION_CONFLICT_KINDS,
} from '@contextops/schema'

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
//    ⑥ **자리를 묻는 카드는 표가 정한다** (`answerSlot` · FINDINGS 106) — 씨앗 질문에
//      그리면 서버가 400 이고, 열린 질문에 안 그리면 답이 기록으로만 남는다
//
//  🔴 **왜 「섞인 스택」을 재나** — 문서를 올리기 전에는 이 스택에 씨앗 질문 10장밖에
//    없어서 「답한 것 = 항목」이 늘 참이었다. §7.1 이 남긴 열린 질문이 섞이는 순간
//    그 말이 거짓이 되는데, **화면은 그대로 초록이다.** 그게 106 이었다.
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴. 그건 캡처가 있어야 한다
//    (`docs/STATUS.md` 「눈 판정 대기」).
// =====================================================================

const NOOP: QuestionStackHandlers = {
  onDraft: () => {},
  onNext: () => {},
  onSaveAs: () => {},
  onBack: () => {},
  onSave: () => {},
}

const QUESTIONS: QuestionRow[] = SEED_QUESTIONS.map((q, i) => ({
  id: `0000000${i}-0000-4000-8000-000000000000`,
  kind: 'seed_question',
  question: q.question,
  status: 'open',
}))

/**
 * 🔴 **문서를 올린 뒤의 스택** — §7.1 이 남긴 열린 질문이 씨앗 질문에 섞인다
 * (`fetchQuestions(status:'open')` 이 종류를 안 가린다).
 */
const OPEN: QuestionRow[] = [
  { id: 'aaaaaaa0-0000-4000-8000-000000000000', kind: 'open_question', status: 'open',
    question: 'MQTT 를 고른 이유가 있나요?' },
  { id: 'aaaaaaa1-0000-4000-8000-000000000000', kind: 'open_question', status: 'open',
    question: '환불 SLA 는 몇 시간인가요?' },
]
const MIXED: QuestionRow[] = [...QUESTIONS.slice(0, 2), ...OPEN]

function base(over: Partial<QuestionStackState> = {}): QuestionStackState {
  return {
    questions: QUESTIONS,
    index: 0,
    answers: {},
    saveAs: {},
    draft: '',
    saving: false,
    error: null,
    saved: null,
    ...over,
  }
}

/** 카드 한 장짜리 스택 — 「이 종류가 자리를 묻나」만 보려고 그린다. */
function oneCard(row: QuestionRow, saveAs: QuestionStackState['saveAs'] = {}): string {
  return renderToStaticMarkup(createElement(QuestionStack, {
    state: base({ questions: [row], index: 0, draft: '그렇다.', saveAs }),
    on: NOOP,
    contextHref: '/t/paylab/p/api/context',
  }))
}

const PICK_LABEL = '이 답을 무엇으로 저장할까요'

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
  { what: '열린 질문 카드 — 자리를 안 골랐다', over: { questions: MIXED, index: 2, draft: '지연이 낮아서다.' } },
  {
    what: '열린 질문 카드 — 자리를 골랐다',
    over: {
      questions: MIXED, index: 2, draft: '지연이 낮아서다.',
      saveAs: { [OPEN[0]!.id]: 'constraint' },
    },
  },
  {
    what: '섞인 요약 — 넷 답하고 하나만 자리를 골랐다',
    over: {
      questions: MIXED, index: MIXED.length, saveAs: { [OPEN[0]!.id]: 'goal' },
      answers: Object.fromEntries(MIXED.map((q) => [q.id, '그렇게 한다.'])),
    },
  },
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

// =====================================================================
//  🔴 FINDINGS 106 — 열린 질문에도 **자리를 묻는다**
//
//  ★ 왜 따로 묶나 — 위의 열 모양은 「씨앗 질문 10장」의 스택이고, 여기서 재는 것은
//    **문서를 올린 뒤** 그 스택에 섞이는 것이다. 105 를 화면 4 에서 닫았을 때 이
//    화면이 그대로 남았던 이유가 「씨앗만 있는 스택은 늘 초록」이었기 때문이다.
// =====================================================================

describe('질문 카드 스택 — 답이 갈 자리를 묻는다 (FINDINGS 106)', () => {
  it('🔴 묻는 카드인가는 **표가 정한다** — 화면이 종류를 세지 않는다', () => {
    for (const kind of QUESTION_CONFLICT_KINDS) {
      const html = oneCard({
        id: 'bbbbbbb0-0000-4000-8000-000000000000', kind, status: 'open', question: '무엇인가요?',
      })
      const asks = CONFLICT_KIND_RULES[kind].answerSlot === 'ask'
      expect(html.includes(PICK_LABEL), `${kind} 의 카드`).toBe(asks)
    }
  })

  it('🔴 씨앗 질문에는 안 묻고 열린 질문에는 묻는다 — 표를 뒤집으면 여기가 빨개진다', () => {
    //  ⚠ 위 시험은 표에서 기대를 **파생**시키므로 표를 통째로 뒤집으면 같이 뒤집힌다
    //    (FINDINGS 103·104-B 가 배운 것). 그래서 두 종류를 **손으로** 적어 잠근다:
    //    씨앗 질문에 그리면 서버가 400 이고 (「저장될 자리가 이미 정해져 있다」),
    //    열린 질문에 안 그리면 답이 기록으로만 남는다 — 둘 다 조용한 고장이다.
    expect(oneCard(QUESTIONS[0]!)).not.toContain(PICK_LABEL)
    expect(oneCard(OPEN[0]!)).toContain(PICK_LABEL)
  })

  it('고를 수 있는 자리가 `ANSWER_SLOTS` 그대로다 — 화면이 목록을 손으로 안 적는다', () => {
    const html = oneCard(OPEN[0]!)
    for (const key of ANSWER_SLOT_KEYS) {
      expect(html, `${key} 의 라벨이 없다`).toContain(ANSWER_SLOTS[key].label)
    }
    //  안 고르는 것도 **하나의 선택**이다 — 그 문을 지우면 사람은 고를 수밖에 없다.
    expect(html).toContain('저장하지 않고 기록만 합니다')
  })

  it('🔴 고르기 전과 후가 **서로 다른 약속**을 한다', () => {
    const before = oneCard(OPEN[0]!)
    expect(before).toContain('이 답은 기록으로만 남습니다')
    expect(before).not.toContain('초안 항목 한 개가 됩니다')

    const after = oneCard(OPEN[0]!, { [OPEN[0]!.id]: 'policy_must' })
    expect(after).toContain(ANSWER_SLOTS.policy_must.label)
    expect(after).toContain('초안 항목 한 개가 됩니다')
    expect(after).not.toContain('이 답은 기록으로만 남습니다')
  })

  it('🔴 요약이 **몇 개가 항목이 되나**를 말한다 — 답한 수로 말하지 않는다', () => {
    const answers = Object.fromEntries(MIXED.map((q) => [q.id, '그렇게 한다.']))
    //  넷 답했지만 열린 질문 둘 중 하나만 자리를 골랐다 → 씨앗 2 + 고른 1 = 3.
    const html = renderToStaticMarkup(createElement(QuestionStack, {
      state: base({ questions: MIXED, index: MIXED.length, answers, saveAs: { [OPEN[0]!.id]: 'goal' } }),
      on: NOOP,
      contextHref: '/t/paylab/p/api/context',
    }))
    expect(html).toContain('4개 저장하기')
    expect(html).toContain('3개')
    expect(html).toContain('자리를 안 골라서 기록으로만 남습니다')
  })

  it('🔴 하나도 자리를 안 골랐으면 「만들어집니다」라고 하지 않는다 (FINDINGS 66 과 같은 판단)', () => {
    const answers = Object.fromEntries(OPEN.map((q) => [q.id, '그렇게 한다.']))
    const html = renderToStaticMarkup(createElement(QuestionStack, {
      state: base({ questions: OPEN, index: OPEN.length, answers }),
      on: NOOP,
      contextHref: '/t/paylab/p/api/context',
    }))
    expect(html).toContain('2개 저장하기')
    expect(html).not.toContain('만들어집니다')
    expect(html).toContain('항목은 만들어지지 않습니다')
  })

  it('씨앗만 있는 스택의 요약은 갈라 말하지 않는다 — 없는 차이를 설명하지 않는다', () => {
    const html = draw({ index: QUESTIONS.length, answers: answered(3) })
    expect(html).toContain('만들어집니다')
    expect(html).not.toContain('자리를 안 골라서')
  })
})
