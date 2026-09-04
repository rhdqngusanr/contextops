import { parseContextItemDraft, type ContextItemDraft, type ItemType } from '@contextops/schema'

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

/**
 * 🔴 답변 한 줄의 길이 상한.
 *
 * ★ 왜 계약(`AnswerQuestions.answer` = 2000)보다 좁은가 — 답변이 가는 **목적지 칸**이
 *   500자이기 때문이다 (`MissionData.statement`·`GoalData.outcome`·`PolicyData.rule`·
 *   `ConstraintData.statement`). 여기서 막지 않으면 2000자 답변이 스키마 파싱에서
 *   터지고, 사람은 다 쓴 뒤에야 그걸 안다.
 * ⚠ 이 숫자를 손으로 지키지 않는다 — `test/api-seed-questions.test.ts` 가 표를 돌면서
 *   **딱 이 길이의 답변이 전부 통과하는지**를 잰다. 목적지 칸이 더 좁은 타입을
 *   표에 더하면 그 시험이 빨개진다.
 */
export const SEED_ANSWER_MAX = 500

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

const P = (severity: 'must' | 'should') => (answer: string) => ({
  rule: answer,
  severity,
  //  ⚠ `enforcement` 는 「무엇이 이 정책을 강제하나」다. 사람이 말로 답한 것을
  //     hook 이 강제한다고 적으면 거짓이다 — 사람이 리뷰에서 본다가 사실이다.
  enforcement: 'review' as const,
})

/** 🔴 열 개의 정본. 순서가 곧 화면 3 의 카드 순서다 (앞의 것이 답하기 쉬워야 한다). */
export const SEED_QUESTIONS: readonly SeedQuestion[] = [
  {
    id: 'mission',
    question: '이 프로젝트가 만드는 것은 무엇인가요?',
    title: '프로젝트가 만드는 것',
    type: 'mission',
    data: (answer) => ({ statement: answer }),
  },
  {
    id: 'goal_quarter',
    question: '이번 분기에 반드시 끝내야 하는 것은 무엇인가요?',
    title: '이번 분기 목표',
    type: 'goal',
    data: (answer) => ({ outcome: answer }),
  },
  {
    id: 'goal_done',
    question: '무엇을 보면 그것이 끝났다고 할 수 있나요?',
    title: '완료 판정 기준',
    type: 'goal',
    data: (answer) => ({ outcome: answer }),
  },
  {
    id: 'constraint_now',
    question: '지금 팀을 묶고 있는 제약은 무엇인가요? (기한·인원·예산)',
    title: '지금의 제약',
    type: 'constraint',
    data: (answer) => ({ statement: answer }),
  },
  {
    id: 'constraint_stack',
    question: '이미 쓰기로 정해진 기술·서비스는 무엇인가요?',
    title: '이미 정해진 기술',
    type: 'constraint',
    data: (answer) => ({ statement: answer }),
  },
  {
    id: 'constraint_out',
    question: '이번 분기에 손대지 않기로 한 것은 무엇인가요?',
    title: '이번 분기에 손대지 않는 것',
    type: 'constraint',
    data: (answer) => ({ statement: answer }),
  },
  {
    id: 'policy_never',
    question: '절대 하면 안 되는 것은 무엇인가요?',
    title: '절대 하면 안 되는 것',
    type: 'policy',
    data: P('must'),
  },
  {
    id: 'policy_release',
    question: '배포 전에 반드시 지나야 하는 관문은 무엇인가요?',
    title: '배포 전 관문',
    type: 'policy',
    data: P('must'),
  },
  {
    id: 'policy_review',
    question: '코드 리뷰에서 늘 지적되는 것은 무엇인가요?',
    title: '리뷰에서 늘 지적되는 것',
    type: 'policy',
    data: P('should'),
  },
  {
    id: 'policy_newcomer',
    question: '새로 온 사람이 가장 자주 틀리는 것은 무엇인가요?',
    title: '새로 온 사람이 자주 틀리는 것',
    type: 'policy',
    data: P('should'),
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
 * 🔴 **답변 → 항목 초안.** 계약(`ContextItemDraft`)으로 **파싱해서** 낸다 —
 * 표가 만든 것이라고 검사를 건너뛰면, 표에 줄을 잘못 더한 날 그 항목이 그대로 들어간다.
 *
 * ⚠ `source_refs` 는 `manual` 하나다. 씨앗 질문은 가리킬 원문이 없고 **답변이 곧
 *   원문**이다 — 그 원문은 충돌 행의 `resolution.note` 에 남는다 (P7 의 끝점).
 *   여기에 `source_document` 를 지어 넣으면 아무 문서도 안 가리키는 근거가 된다.
 *
 * @returns 파싱에 실패하면 `undefined` (답변이 목적지 칸보다 길 때 — 부르는 쪽이 400 을 낸다)
 */
export function seedDraft(q: SeedQuestion, answer: string): ContextItemDraft | undefined {
  const parsed = parseContextItemDraftSafe({
    id: `item_seed_${q.id}`,
    type: q.type,
    title: q.title,
    body: answer,
    scope: { kind: 'project' },
    priority: 50,
    tags: [],
    //  사람이 직접 답한 문장이다 — 추측이 아니다.
    confidence: 'high',
    source_refs: [{ kind: 'manual', note: q.question }],
    data: q.data(answer),
  })
  return parsed
}

function parseContextItemDraftSafe(input: unknown): ContextItemDraft | undefined {
  try {
    return parseContextItemDraft(input)
  } catch {
    return undefined
  }
}
