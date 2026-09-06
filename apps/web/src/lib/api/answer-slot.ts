import {
  ANSWER_MAX, CONFLICT_KIND_RULES,
  type AnswerSlotKey, type AnswerSlotMode, type ConflictKind, type ContextItemDraft as Draft,
} from '@contextops/schema'

import { slotDraft } from './answer'
import { fail } from './error'
import { seedDraft, seedQuestionOf } from './seed-questions'

// =====================================================================
//  🔴 **답 하나가 어느 길로 가나 — `answerSlot` 값마다 한 줄인 표** (SPEC §5 · FINDINGS 108)
//
//  ★ 왜 표인가 — 라우트가 `if (slot === 'seeded') … else …` 로 읽었더니 표의 세 값 중
//    `none` 이 `ask` 와 **같은 갈래**였다. 「이 종류에는 자리를 안 묻는다」가 서버에서는
//    「자리를 고르면 고른 대로 만든다」와 같은 뜻이었다. 지금은 `none` 인 질문 종류가
//    없어 안 터지지만, 셋째 종류가 `none` 으로 생기는 날 조용히 항목을 짓는다.
//    `satisfies Record<AnswerSlotMode, …>` 라서 값이 늘면 **여기가 타입 검사에서 막힌다.**
//
//  🔴 **어느 줄도 문장을 지어내지 않는다.** `seeded` 는 표(`seed-questions.ts`)가,
//     `ask` 는 사람(`save_as`)이 자리를 정하고, `none` 은 항목을 만들지 않는다.
//     초안을 짓는 것은 셋 다 `answerDraft()` 하나다 (`answer.ts`).
//
//  ⚠ 값을 더하는 절차는 `ANSWER_SLOT_MODES` 옆에 있다 (`packages/schema/src/api.ts`).
// =====================================================================

/** 라우트가 열린 질문 행과 사람의 답에서 뽑아 넘기는 것. 이 밖의 것은 표가 모른다. */
export interface AnswerInput {
  readonly questionId: string
  readonly kind: ConflictKind
  readonly question: string
  readonly answer: string
  /** 사람이 고른 자리 (`AnswerQuestions.save_as`). 없으면 「기록만」이다. */
  readonly saveAs?: AnswerSlotKey
}

/**
 * 한 줄의 계약. `undefined` 는 **「항목을 만들지 않는다」**(답만 기록하고 질문은 닫힌다)이고,
 * 거절은 `fail()` 로 던진다 — 조용히 무시하는 길은 없다.
 */
export type AnswerDrafter = (input: AnswerInput) => Draft | undefined

/**
 * 초안을 못 만드는 이유는 하나다 — 답변이 목적지 칸보다 길다 (`ANSWER_MAX`).
 * 여기서 400 을 내지 않으면 사람은 「저장됐다」를 보고 자기 문장이 어디 갔는지 못 찾는다
 * (`batch-draft` 가 항목별로 갈라 받는 것과 정반대의 이유다 — 거긴 기계가 보낸다).
 */
function orTooLong(input: AnswerInput, draft: Draft | undefined): Draft {
  if (draft) return draft
  return fail('VALIDATION_FAILED', `답변은 ${ANSWER_MAX}자까지입니다`, [
    { path: 'answer', message: `${input.question} — ${input.answer.length}자` },
  ])
}

export const ANSWER_SLOT_DRAFTERS = {
  //  ① 씨앗 질문 — **표가 정한 자리**로 답을 그대로 옮긴다.
  seeded: (input) => {
    //  ⚠ 이 종류에는 `save_as` 를 받지 않는다. **조용히 무시하지 않는다** — 무시하면
    //     사람은 자기가 고른 자리로 저장된 줄 알고, 실제로는 표가 정한 자리로 간다.
    if (input.saveAs) {
      fail('VALIDATION_FAILED', '이 질문은 저장될 자리가 이미 정해져 있다', [
        { path: 'save_as', message: input.questionId },
      ])
    }
    const seed = seedQuestionOf(input.question)
    if (!seed) return undefined
    return orTooLong(input, seedDraft(seed, input.answer))
  },
  //  ② 열린 질문 — 자리를 **사람이 고른다**. 안 고르면(=`save_as` 없음) 기록만 된다.
  //     서버가 대신 고르지 않는다 — 자유 문장을 타입별 `data` 로 뜯는 것은 §7.1 의 일이다.
  ask: (input) => {
    if (!input.saveAs) return undefined
    return orTooLong(input, slotDraft(input.saveAs, {
      questionId: input.questionId, question: input.question, answer: input.answer,
    }))
  },
  //  ③ 자리가 없는 종류 — 답은 기록되지만 **항목이 되지 않는다.** 자리를 골라 보냈다면
  //     화면이 이 표와 다른 말을 한 것이라 400 이다 (`seeded` 와 같은 이유).
  none: (input) => {
    if (input.saveAs) {
      fail('VALIDATION_FAILED', '이 질문은 답을 항목으로 만들지 않습니다', [
        { path: 'save_as', message: input.questionId },
      ])
    }
    return undefined
  },
} as const satisfies Record<AnswerSlotMode, AnswerDrafter>

/**
 * 🔴 **라우트가 부르는 유일한 문.** 종류 → `answerSlot` → 표의 줄. 여기서 `kind` 를
 * 세지 않는다 — `CONFLICT_KIND_RULES` 가 정한다.
 */
export function draftForAnswer(input: AnswerInput): Draft | undefined {
  return ANSWER_SLOT_DRAFTERS[CONFLICT_KIND_RULES[input.kind].answerSlot](input)
}
