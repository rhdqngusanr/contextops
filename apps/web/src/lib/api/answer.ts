import {
  ANSWER_SLOTS, ITEM_ID_BODY_MAX, ITEM_TITLE_MAX, parseContextItemDraft,
  type AnswerSlotKey, type ContextItemDraft, type ItemType,
} from '@contextops/schema'

import { clip, questionRef } from './conflict'

// =====================================================================
//  🔴 **답변 한 문장 → 항목 초안.** 두 길이 여기 하나로 모인다 (FINDINGS 105)
//
//    ① 씨앗 질문 10장 — 자리를 **표가** 정한다 (`seed-questions.ts` · 질문마다 다르다)
//    ② 열린 질문     — 자리를 **사람이** 고른다 (`ANSWER_SLOTS` · `save_as`)
//
//  ★ 왜 한 함수인가 — 두 길이 각자 초안을 조립하면 「근거 한 줄을 붙였나」·「confidence 가
//    무엇인가」·「scope 가 무엇인가」가 두 곳에서 갈린다. 실제로 그렇게 갈렸던 자리가
//    FINDINGS 56 이었다 — 한쪽만 질문을 근거로 들고 있었다.
//
//  🔴 **여기에 LLM 이 없다.** 답변을 목적지 칸으로 옮기기만 한다 (SPEC §5).
// =====================================================================

/**
 * 질문 하나가 만드는 항목의 `id`.
 *
 * ★ 왜 질문 id 에서 짓나 — 같은 질문에 두 번 답해도 같은 id 다. 라우트가 이미 열린
 *   질문만 받으므로 두 번 오지 않지만, 오면 **조용히 둘째 항목을 만드는 대신** 400 이다
 *   (`insertDrafts` 가 이미 있는 id 를 거절한다).
 * ⚠ uuid 의 `-` 를 `_` 로 바꾸는 것은 `ItemId` 가 `[a-z0-9_]` 만 받기 때문이다.
 *   `q_` + 36자 = 38자로 `ITEM_ID_BODY_MAX`(40) 안이다 — 그 여유를 아래에서 잰다.
 */
export function questionItemId(questionId: string): string {
  const body = `q_${questionId.replace(/-/g, '_')}`
  //  ⚠ 상한을 넘으면 파싱에서 터지는 대신 여기서 자른다 — id 는 잘려도 유일하다
  //    (uuid 앞자리만으로도 한 프로젝트 안에서 겹치지 않는다).
  return `item_${body.slice(0, ITEM_ID_BODY_MAX)}`
}

/**
 * 🔴 **초안을 짓는 유일한 자리.** 계약(`ContextItemDraft`)으로 **파싱해서** 낸다 —
 * 표가 만든 것이라고 검사를 건너뛰면, 표에 줄을 잘못 더한 날 그 항목이 그대로 들어간다.
 *
 * ⚠ `source_refs` 는 `manual` 하나다. 답변은 가리킬 원문이 없고 **답변이 곧 원문**이다 —
 *   그 원문은 충돌 행의 `resolution.note` 에 남는다 (P7 의 끝점). 그 한 줄을 여기서
 *   짓지 않는다 — `questionRef()` 하나다 (`conflict.ts`).
 * ⚠ 질문이 물고 있는 `a_ref`(원문 구간)를 물려주지 않는 이유도 거기 적혀 있다.
 * ⚠ **`body` 는 비운다** (FINDINGS 9 · 2026-09-07). 답변 문장은 이미 `data`(rule·statement…)로
 *   서고, 종이의 절은 그 `data` 를 그린다. 같은 문장을 `body` 에도 넣으면 **Pack 이 한 항목에서
 *   같은 문장을 두 줄 적는다** — 관통의 메아리 검사(`pack-echo.ts` · FINDINGS 99·100)가 그걸 잡는다.
 *   ★ 예전엔 `body` 를 컴파일러가 버려서 이 겹침이 안 보였을 뿐이다.
 *
 * @returns 파싱에 실패하면 `undefined` (답변이 목적지 칸보다 길 때 — 부르는 쪽이 400 을 낸다)
 */
export function answerDraft(input: {
  id: string
  title: string
  type: ItemType
  data: unknown
  /** 사람이 답한 그 질문. 제목이 아니라 **근거**로 쓰인다. */
  question: string
}): ContextItemDraft | undefined {
  try {
    return parseContextItemDraft({
      id: input.id,
      type: input.type,
      title: input.title,
      body: '',
      scope: { kind: 'project' },
      priority: 50,
      tags: [],
      //  사람이 직접 답한 문장이다 — 추측이 아니다.
      confidence: 'high',
      source_refs: [questionRef(input.question)],
      data: input.data,
    })
  } catch {
    return undefined
  }
}

/**
 * 🔴 **열린 질문의 답 → 항목** — 자리는 사람이 고른 것(`save_as`)이 정한다.
 *
 * ★ 왜 제목이 질문 문장인가 — 목록에서 읽히는 것이 제목인데, 이 항목의 제목이 될
 *   만한 것은 답변(그건 본문이다)이 아니라 **무엇에 답한 것인가**다. 씨앗 질문이
 *   제목을 답변이 아니라 질문에서 가져오는 것과 같은 판단이다.
 * ⚠ 질문은 최대 500자이고 제목은 `ITEM_TITLE_MAX` 다 — 길면 머리를 남기고 자른다.
 */
export function slotDraft(
  key: AnswerSlotKey,
  input: { questionId: string; question: string; answer: string },
): ContextItemDraft | undefined {
  const slot = ANSWER_SLOTS[key]
  return answerDraft({
    id: questionItemId(input.questionId),
    title: clip(input.question, ITEM_TITLE_MAX),
    type: slot.type,
    data: slot.data(input.answer),
    question: input.question,
  })
}
