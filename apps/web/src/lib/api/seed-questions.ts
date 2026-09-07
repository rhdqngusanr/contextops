import { ANSWER_SLOTS, type ContextItemDraft, type ItemType } from '@contextops/schema'

import { answerDraft } from './answer'

// =====================================================================
//  🔴 씨앗 질문 10개 — 「문서가 없어도 시작할 수 있다」의 정본
//  (SPEC §9 화면 3 ③ · DESIGN_BRIEF §4 「화면 3」 3번 카드 · docs/PLAN.md P3 둘째 행)
//
//  ★ 왜 이 파일이 있나 — 화면 3 은 「문서가 없어도 됩니다. 10개 질문에 답하면 첫
//    버전이 만들어집니다」라고 약속한다. 그런데 질문 카드는 `conflicts` 행이고,
//    그 행을 만드는 자리가 §7.1 러너 하나뿐이라 **문서를 올려야 질문이 생겼다.**
//    그래서 그 약속은 거짓이었다 (FINDINGS 67). 이 표가 그 열 개의 정본이다.
//
//  🔴 **여기에 LLM 이 없다.** 답변 한 문장 → 항목 하나는 이 표가 정한 자리로 그대로
//     옮기는 것뿐이다. 서버가 문장을 지어내지 않는다 —
//     지어내는 순간 그 항목은 사람이 하지 않은 말을 팀 규칙으로 배포한다.
//
//  ★ 새 씨앗 질문을 더하는 절차 — 여기 한 줄이다:
//    ① 아래 표 끝에 줄 하나 (`id`·`question`·`title`·`type`·`data`)
//    ② `test/api-seed-questions.test.ts` 는 고칠 것이 없다 — 표를 돌면서 잰다
//    ⚠ ①에서 `id` 와 `question` 은 **행으로 직렬화된다** (아래 주의를 읽어라).
//    ⚠ `data` 는 **`ANSWER_SLOTS` 의 것을 쓴다** (`packages/schema`). 여기서 새로
//      조립하지 마라 — 「답변이 어느 칸으로 가나」를 아는 표가 둘이 되면, 열린 질문
//      쪽(`save_as`)과 이쪽이 조용히 다른 항목을 만든다 (FINDINGS 105).
//      그 표에 없는 타입은 **한 문장으로 필수 칸이 안 차는 타입**이다 (아래 ⚠ 와 같은 이유).
//
//  🔴 **`question` 문장을 고치지 마라 — 행에 그대로 저장된다.**
//     심긴 행과 이 표를 잇는 열쇠가 그 문장이다 (`conflicts` 에 씨앗 id 칸이 없다).
//     문장을 고치면 이미 만들어진 프로젝트의 답변이 **항목을 못 만들고 조용히
//     답변만 남는다.** 고칠 일이 생기면 문장을 바꾸지 말고 **줄을 하나 더해라.**
//
//  ⚠ **DESIGN_BRIEF 의 예시 넷 중 둘은 타입을 바꿔 담았다.** 지어내지 않으려고 그랬다:
//    · 「이번 분기 마일스톤 3개는?」 → `roadmap` 이 아니라 `goal` 이다. `RoadmapData` 는
//      `milestone_id`(`BS-M1` 꼴)와 `done_when` 을 **필수**로 받는데, 한 문장에서
//      그 둘을 뽑으려면 서버가 마일스톤 id 를 지어내야 한다.
//    · 「배포 절차는?」 → `workflow` 가 아니라 `policy` 다. `WorkflowData` 는
//      `trigger` 와 단계 배열을 요구하고, 한 문장을 단계로 쪼개는 것은 §7.1 의 일이다.
//    둘 다 「그 타입이 요구하는 칸을 답변 하나로는 정직하게 채울 수 없다」가 이유다.
// =====================================================================

/** 씨앗 질문 한 줄. `data` 는 답변을 그 타입의 칸으로 **옮기기만** 한다. */
export interface SeedQuestion {
  /** 만들어질 항목의 `id` 가 된다 (`item_seed_…`). 직렬화된다 — 바꾸지 마라. */
  readonly id: string
  /** 사람이 보는 문장. 🔴 행에 저장된다 — 바꾸지 마라 (위 주의). */
  readonly question: string
  /** 만들어질 항목의 제목. 답변이 아니라 **질문**이 정한다 (제목은 목록에서 읽힌다). */
  readonly title: string
  readonly type: ItemType
  /** 답변 → 그 타입의 `data`. 답변에 없는 값을 넣지 마라. */
  readonly data: (answer: string) => Record<string, unknown>
}


/** 🔴 열 개의 정본. 순서가 곧 화면 3 의 카드 순서다 (앞의 것이 답하기 쉬워야 한다). */
export const SEED_QUESTIONS: readonly SeedQuestion[] = [
  {
    id: 'mission',
    question: '이 프로젝트가 만드는 것은 무엇인가요?',
    title: '프로젝트가 만드는 것',
    type: 'mission',
    data: ANSWER_SLOTS.mission.data,
  },
  {
    id: 'goal_quarter',
    question: '이번 분기에 반드시 끝내야 하는 것은 무엇인가요?',
    title: '이번 분기 목표',
    type: 'goal',
    data: ANSWER_SLOTS.goal.data,
  },
  {
    id: 'goal_done',
    //  ⚠ 「그것」이라고 앞 질문을 가리키지 마라 — 카드는 **한 장씩** 보여서 앞 카드가
    //     화면에 없다 (눈으로 읽고 고쳤다: 첫 판 ③ 이 「무엇을 보면 그것이…」였다).
    question: '이번 분기 목표가 끝났다고 무엇을 보고 판단하나요?',
    title: '완료 판정 기준',
    type: 'goal',
    data: ANSWER_SLOTS.goal.data,
  },
  {
    id: 'constraint_now',
    question: '지금 팀을 묶고 있는 제약은 무엇인가요? (기한·인원·예산)',
    title: '지금의 제약',
    type: 'constraint',
    data: ANSWER_SLOTS.constraint.data,
  },
  {
    id: 'constraint_stack',
    question: '이미 쓰기로 정해진 기술·서비스는 무엇인가요?',
    title: '이미 정해진 기술',
    type: 'constraint',
    data: ANSWER_SLOTS.constraint.data,
  },
  {
    id: 'constraint_out',
    question: '이번 분기에 손대지 않기로 한 것은 무엇인가요?',
    title: '이번 분기에 손대지 않는 것',
    type: 'constraint',
    data: ANSWER_SLOTS.constraint.data,
  },
  {
    id: 'policy_never',
    question: '절대 하면 안 되는 것은 무엇인가요?',
    title: '절대 하면 안 되는 것',
    type: 'policy',
    data: ANSWER_SLOTS.policy_must.data,
  },
  {
    id: 'policy_release',
    question: '배포 전에 반드시 지나야 하는 관문은 무엇인가요?',
    title: '배포 전 관문',
    type: 'policy',
    data: ANSWER_SLOTS.policy_must.data,
  },
  {
    id: 'policy_review',
    question: '코드 리뷰에서 늘 지적되는 것은 무엇인가요?',
    title: '리뷰에서 늘 지적되는 것',
    type: 'policy',
    data: ANSWER_SLOTS.policy_should.data,
  },
  {
    id: 'policy_newcomer',
    question: '새로 온 사람이 가장 자주 틀리는 것은 무엇인가요?',
    title: '새로 온 사람이 자주 틀리는 것',
    type: 'policy',
    data: ANSWER_SLOTS.policy_should.data,
  },
]

/**
 * 심긴 행 → 표의 줄. 열쇠가 **질문 문장**인 이유는 `conflicts` 에 씨앗 id 칸이
 * 없기 때문이다. 칸을 하나 더하는 것보다 문장을 안 바꾸는 쪽이 싸다 —
 * 문장이 유일한지는 시험이 잠근다.
 */
const BY_QUESTION = new Map(SEED_QUESTIONS.map((q) => [q.question, q]))

export function seedQuestionOf(question: string): SeedQuestion | undefined {
  return BY_QUESTION.get(question)
}

/**
 * 🔴 **씨앗 질문의 답 → 항목** — 자리를 이 표가 정한다.
 *
 * ⚠ 짓는 것은 여기서 하지 않는다 — `answerDraft()` 하나다 (`answer.ts`).
 *   열린 질문의 답도 같은 함수로 만들어진다 — 여기서 또 조립하면 근거 한 줄을
 *   붙이는 일이 두 곳에서 갈라진다 (FINDINGS 56 이 그 자리였다).
 *
 * @returns 파싱에 실패하면 `undefined` (답변이 목적지 칸보다 길 때 — 부르는 쪽이 400 을 낸다)
 */
export function seedDraft(q: SeedQuestion, answer: string): ContextItemDraft | undefined {
  return answerDraft({
    id: `item_seed_${q.id}`,
    title: q.title,
    type: q.type,
    data: q.data(answer),
    question: q.question,
  })
}
