import { describe, expect, it } from 'vitest'
import { AnswerQuestions } from '../src/api'
import { ITEM_TYPES } from '../src/common'
import { ANSWER_MAX, ANSWER_SLOT_KEYS, ANSWER_SLOTS, ITEM_DATA } from '../src/item'

// =====================================================================
//  🔴 **답이 갈 자리 표가 살아 있는가** (loop/PROMPT.md ④2-B · FINDINGS 105)
//
//  ★ 왜 이 시험이 있나 — 이 표는 「답변 한 문장 → 항목 하나」의 정본이고, 줄이 하나
//    죽으면 화면에는 **고를 수 있는 항목으로 멀쩡히 뜬다.** 고르면 500 이거나,
//    더 나쁘게는 아무 일도 안 일어난다. 그 종류의 고장은 눈으로 안 잡힌다.
//
//  재는 것:
//    ① 값 목록과 표가 같은 키를 덮는다
//    ② 줄마다 **결과가 다르다** (같으면 그 줄은 있으나 마나다)
//    ③ 낸 `data` 가 그 타입의 계약을 **실제로 통과한다** (상한 길이의 답변으로)
//    ④ 계약(`AnswerQuestions.save_as`)이 이 목록만 받는다
// =====================================================================

const LONG = '가'.repeat(ANSWER_MAX)

describe('ANSWER_SLOTS — 답이 갈 자리 표', () => {
  it('값 목록과 표가 같은 키를 덮는다', () => {
    expect(Object.keys(ANSWER_SLOTS)).toEqual([...ANSWER_SLOT_KEYS])
  })

  it('전부 실재하는 ItemType 을 가리킨다', () => {
    for (const key of ANSWER_SLOT_KEYS) {
      expect(ITEM_TYPES, key).toContain(ANSWER_SLOTS[key].type)
    }
  })

  //  🔴 ②— 「표의 항목이 전부 실제로 뭔가를 바꾼다」 (CLAUDE.md).
  //     `policy_must`·`policy_should` 는 타입이 같아서 **낸 값**으로 갈려야 한다.
  it('줄마다 내는 것이 서로 다르다 — 같은 답을 줘도', () => {
    const made = ANSWER_SLOT_KEYS.map((key) => JSON.stringify({
      type: ANSWER_SLOTS[key].type, data: ANSWER_SLOTS[key].data('같은 답을 줬다.'),
    }))
    expect(new Set(made).size, `겹치는 줄이 있다 — ${made.join(' / ')}`).toBe(made.length)
  })

  //  🔴 ③— `ANSWER_MAX` 를 손으로 지키지 않는다. 목적지 칸이 더 좁은 줄을 더하면
  //     여기가 빨개진다 (그 줄은 사람의 답을 잘라 먹는다).
  it.each(ANSWER_SLOT_KEYS)('%s — 상한 길이의 답변이 그 타입의 data 로 통과한다', (key) => {
    const slot = ANSWER_SLOTS[key]
    const parsed = ITEM_DATA[slot.type].safeParse(slot.data(LONG))
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
  })

  it('답변에 없는 값을 지어내지 않는다 — 답변 글자가 낸 값 안에 그대로 있다', () => {
    for (const key of ANSWER_SLOT_KEYS) {
      const data = ANSWER_SLOTS[key].data('환불은 7일 안에 처리한다.')
      expect(Object.values(data), key).toContain('환불은 7일 안에 처리한다.')
    }
  })

  it('라벨이 비어 있지 않고 서로 다르다 — 화면이 이 문구로 고르게 한다', () => {
    const labels = ANSWER_SLOT_KEYS.map((key) => ANSWER_SLOTS[key].label)
    for (const label of labels) expect(label.length).toBeGreaterThan(1)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('AnswerQuestions.save_as — 계약이 이 표만 받는다', () => {
  const id = '3f9c2e1a-0000-4000-8000-000000000001'

  it.each(ANSWER_SLOT_KEYS)('%s 를 받는다', (key) => {
    expect(AnswerQuestions.safeParse({
      answers: [{ question_id: id, answer: '그렇다.', save_as: key }],
    }).success).toBe(true)
  })

  it('표에 없는 값은 거부한다', () => {
    for (const key of ['roadmap', 'workflow', 'adr', 'open_question', '']) {
      expect(AnswerQuestions.safeParse({
        answers: [{ question_id: id, answer: '그렇다.', save_as: key }],
      }).success, key).toBe(false)
    }
  })

  //  🔴 초안 본문을 실어 보내는 길은 **없다** (P7 · `AcceptJobItems` 와 같은 이유).
  //     오는 것은 고른 자리의 이름뿐이고, 답변을 그 칸으로 옮기는 것은 서버다.
  it('초안(`draft`)을 실어 보내면 거부한다', () => {
    expect(AnswerQuestions.safeParse({
      answers: [{
        question_id: id, answer: '그렇다.',
        draft: { id: 'item_x', type: 'policy', title: '제목', body: '', data: {} },
      }],
    }).success).toBe(false)
  })

  it('자리를 안 고른 답도 받는다 — 그때는 기록만 된다', () => {
    expect(AnswerQuestions.safeParse({ answers: [{ question_id: id, answer: '그렇다.' }] }).success).toBe(true)
  })
})
