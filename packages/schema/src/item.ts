import { z } from 'zod'
import {
  CalendarDate, CONFIDENCE_LEVELS, ITEM_STATUSES, ITEM_TYPES, ItemId,
  MilestoneId, Question, RepoPath, Scope, SourceRef, SOURCE_REFS_MAX, type ItemType,
} from './common'
import { nonEmpty } from './table'

// =====================================================================
//  ContextItem — 항목 하나. 정본은 docs/SPEC.md §3.
//
//  구조는 「공통 Base + 타입별 data」다. 타입별로 갈리는 것은 **아래 표 하나**에만
//  있고, 화면·컴파일러는 그 표를 **읽기만** 한다.
// =====================================================================

/**
 * 제목의 길이 상한.
 * ★ 왜 상수인가 — 질문에 답해서 만드는 항목의 제목은 **질문 문장**이고 (`ANSWER_SLOTS`),
 *   그 문장(최대 500자)을 자를 자리가 「몇 글자까지 되나」를 알아야 한다.
 *   두 곳에 120 을 적으면 조용히 갈라진다.
 */
export const ITEM_TITLE_MAX = 120

/** 모든 타입이 공유하는 필드. 서버가 채우는 것(project_id·status·revision)도 여기 있다. */
const ItemBase = z.object({
  id: ItemId,
  project_id: z.uuid(),
  title: z.string().min(2).max(ITEM_TITLE_MAX),
  body: z.string().max(2000),
  status: z.enum(ITEM_STATUSES),
  scope: Scope,
  //  🔴 **`priority` 는 「먼저」다 — 그리고 같은 타입 안에서만 견줘진다** (FINDINGS 98).
  //     읽는 곳이 둘이고 둘 다 타입 안에서만 본다:
  //     ① Pack 의 **읽는 순서** — 절(section)은 타입별로 갈려 있고 그 안에서 priority
  //        내림차순이다 (SPEC §4.1 3단계 · `compiler/src/sort.ts`)
  //     ② 못 다 실을 때 **남는 순서** — 「150개 상한, 초과 시 **type별** priority 상위」
  //        (SPEC §7.3 · `apps/web/src/lib/ai/conflict.ts`)
  //  ⚠ 그래서 이 값을 「중요도」가 아니라 「그 타입 안에서 몇 번째로 읽히나」로 써도 된다.
  //    아키텍처 다섯 줄이 §7 그림 순서로 서는 것이 그 예다 (`apps/web/scripts/seed.ts`).
  priority: z.int().min(0).max(100).default(50),
  source_refs: z.array(SourceRef).min(1).max(SOURCE_REFS_MAX),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  owner_id: z.uuid().optional(),
  valid_from: CalendarDate.optional(),
  valid_until: CalendarDate.optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).default('medium'),
  revision: z.int().min(1),
})

/**
 * 초안이 서버에 올라올 때는 서버가 매기는 셋(`project_id`·`status`·`revision`)을 뺀다.
 * ★ 왜 빼나 — 클라이언트가 `status: 'active'` 를 실어 보내면 승인 없이 공식 항목이 된다.
 *   보내지 못하게 하는 자리는 스키마 하나여야 한다 (SPEC §3.1 allowlist).
 */
const DraftBase = ItemBase.omit({ project_id: true, status: true, revision: true })

/**
 * 🔴 **화면이 받는 모양** — `ContextItem` 에 「마지막으로 바뀐 때」 한 칸을 더한 것이다.
 *
 * ★ 왜 `ItemBase` 에 넣지 않나 — 컴파일러가 받는 snapshot 의 항목이 `ContextItem` 이고
 *   `snapshotHash()` 가 그 항목들을 **통째로** 잰다 (`packages/compiler/src/hash.ts`).
 *   시각이 항목 안에 있으면 내용이 같은 묶음이 매번 다른 지문을 갖고, 「같은 snapshot
 *   인가」를 물어볼 수 없게 된다 — `generated_at` 을 지문에서 뺀 것과 같은 이유다.
 *   Pack 은 이 값을 **쓰지 않는다.** 읽는 것은 화면뿐이다 (화면 4 의 「갱신 2026-07-12」 ·
 *   화면 5 표의 「갱신」 칸 · DESIGN_BRIEF §4).
 * ★ 그래서 서버에도 조립하는 함수가 둘이다 — 발행은 `toContextItem()`, 응답은
 *   `toContextItemView()` (`apps/web/src/lib/api/item.ts`). 둘이 갈리는 것은 이 한 칸이다.
 * ⚠ 변형이 셋이 됐다(항목·초안·화면). 넷째를 더하기 전에 **정말 다른 계약인지** 물어라 —
 *   같은 것을 다르게 **보여 주는** 것뿐이라면 화면이 골라 그리는 것이 맞다.
 */
const ViewBase = ItemBase.extend({ updated_at: z.iso.datetime() })

// ---------------------------------------------------------------------
//  타입별 data
// ---------------------------------------------------------------------

export const MissionData = z.object({
  statement: z.string().min(3).max(500),
  rationale: z.string().max(1000).optional(),
}).strict()

export const GoalData = z.object({
  outcome: z.string().min(3).max(500),
  metric: z.string().max(200).optional(),
  deadline: CalendarDate.optional(),
}).strict()

export const RoadmapData = z.object({
  milestone_id: MilestoneId,
  due: CalendarDate.optional(),
  paths: z.array(RepoPath).max(20).default([]),
  done_when: z.array(z.string().min(3).max(200)).min(1).max(6),
  dependencies: z.array(MilestoneId).max(10).default([]),
}).strict()

export const ArchitectureData = z.object({
  component: z.string().min(1).max(100),
  responsibility: z.string().min(3).max(500),
  paths: z.array(RepoPath).max(20).default([]),
}).strict()

export const DomainData = z.object({
  name: z.string().min(1).max(100),
  glossary: z.array(z.object({
    term: z.string().min(1).max(100),
    meaning: z.string().min(1).max(500),
  }).strict()).max(50).default([]),
  invariants: z.array(z.string().min(3).max(300)).max(20).default([]),
}).strict()

/** `enforcement` 는 「이 정책을 무엇이 강제하나」다 (SPEC §3). */
export const PolicyData = z.object({
  rule: z.string().min(3).max(500),
  severity: z.enum(['must', 'should', 'may']),
  enforcement: z.enum(['hook', 'review', 'permission', 'none']).default('review'),
}).strict()

export const AdrData = z.object({
  decision: z.string().min(3).max(500),
  context: z.string().min(3).max(2000),
  consequences: z.string().min(3).max(2000),
  adr_status: z.enum(['proposed', 'accepted', 'superseded']),
}).strict()

export const WorkflowData = z.object({
  trigger: z.string().min(3).max(200),
  steps: z.array(z.string().min(3).max(300)).min(1).max(20),
  done_when: z.array(z.string().min(3).max(200)).max(6).default([]),
}).strict()

export const ConstraintData = z.object({
  statement: z.string().min(3).max(500),
  expiry: CalendarDate.optional(),
}).strict()

export const OpenQuestionData = z.object({
  question: z.string().min(3).max(500),
  owner_id: z.uuid().optional(),
  due: CalendarDate.optional(),
}).strict()

/**
 * 🔴 **항목 타입의 정본 표.** 타입별로 갈리는 것은 전부 여기 한 줄이다.
 *
 * ★ 새 ItemType 을 더하는 절차 — 다섯 곳이고, 앞의 둘은 기계가 막아 준다:
 *   ① `common.ts` 의 `ITEM_TYPES` **끝에** 값 추가 (중간에 끼우지 마라 — 직렬화된다)
 *   ② 이 표에 `<type>: <Type>Data` 한 줄  ← ①만 하면 여기서 타입 검사가 막힌다
 *   ③ `packages/compiler` 의 partition 표에 한 줄 (SPEC §4.1 — 어느 파일로 갈 것인가)
 *   ④ `packages/compiler/templates` 에 그 타입을 그릴 자리
 *   ⑤ `test/item-type.test.ts` 의 `SAMPLE_DATA` 에 한 줄 ← 빠뜨리면 liveness 테스트가 빨개진다
 *   화면은 고칠 것이 없다 — 이 표를 읽기만 하기 때문이다.
 *
 * ⚠ 전부 `.strict()` 다. 모르는 키가 data 안으로 새어 들어오면 그게 P1 의 구멍이다.
 */
export const ITEM_DATA = {
  mission: MissionData,
  goal: GoalData,
  roadmap: RoadmapData,
  architecture: ArchitectureData,
  domain: DomainData,
  policy: PolicyData,
  adr: AdrData,
  workflow: WorkflowData,
  constraint: ConstraintData,
  open_question: OpenQuestionData,
} as const satisfies Record<ItemType, z.ZodObject>

// ---------------------------------------------------------------------
//  표 → 유니온
// ---------------------------------------------------------------------
//  ⚠ `.map()` 은 원소별 타입을 못 지켜서 런타임 유니온의 추론이 느슨해진다
//    (`data` 가 10종의 합집합이 된다). 그래서 **정밀한 TS 타입은 아래 mapped type**
//    으로 따로 내고, 둘을 잇는 캐스트는 `parseContextItem` 한 곳에만 둔다.
//    런타임 검사는 표대로 정확하다 — 캐스트가 가리는 것은 없다.

const variantsOf = (base: z.ZodObject) =>
  nonEmpty(ITEM_TYPES.map((type) => base.extend({ type: z.literal(type), data: ITEM_DATA[type] }).strict()))

export const ContextItem = z.discriminatedUnion('type', variantsOf(ItemBase))
export const ContextItemDraft = z.discriminatedUnion('type', variantsOf(DraftBase))
export const ContextItemView = z.discriminatedUnion('type', variantsOf(ViewBase))

type BaseOut = z.infer<typeof ItemBase>
type DraftOut = z.infer<typeof DraftBase>
type ViewOut = z.infer<typeof ViewBase>

/** 타입별로 `data` 가 정확히 갈리는 공개 타입. 소비자는 `type` 으로 좁히면 된다. */
export type ContextItem = {
  [K in ItemType]: BaseOut & { type: K; data: z.infer<(typeof ITEM_DATA)[K]> }
}[ItemType]

export type ContextItemDraft = {
  [K in ItemType]: DraftOut & { type: K; data: z.infer<(typeof ITEM_DATA)[K]> }
}[ItemType]

export type ContextItemView = {
  [K in ItemType]: ViewOut & { type: K; data: z.infer<(typeof ITEM_DATA)[K]> }
}[ItemType]

export function parseContextItem(input: unknown): ContextItem {
  return ContextItem.parse(input) as ContextItem
}

export function parseContextItemDraft(input: unknown): ContextItemDraft {
  return ContextItemDraft.parse(input) as ContextItemDraft
}

export function parseContextItemView(input: unknown): ContextItemView {
  return ContextItemView.parse(input) as ContextItemView
}

// ---------------------------------------------------------------------
//  답변 한 문장 → 항목 하나가 되는 **자리 표** (SPEC §5 · §9 화면 4 · FINDINGS 105)
//
//  🔴 **여기에 LLM 이 없다.** 답변을 그 타입의 칸으로 **옮기기만** 한다 —
//     서버가 문장을 지어내는 순간 그 항목은 사람이 하지 않은 말을 팀 규칙으로 배포한다.
//
//  ★ 왜 계약 패키지에 있나 — 읽는 쪽이 **셋**이다:
//    ① `api.ts` 의 `AnswerQuestions.save_as` (요청이 고를 수 있는 값)
//    ② 서버 라우트 (`POST /projects/{id}/questions` — 답을 이 표대로 옮긴다)
//    ③ 화면 4 의 「무엇으로 저장할까요」 (`conflict-card.tsx` — 라벨을 그린다)
//    셋 중 한 곳에만 두면 나머지 둘이 그 목록을 **베껴 적게** 되고, 베낀 목록은
//    표가 바뀔 때 같이 안 바뀐다 (`ITEM_STATUS_EXCLUDE_REASON` 과 같은 판단).
// ---------------------------------------------------------------------

/**
 * 🔴 **답변 한 줄의 길이 상한.**
 *
 * ★ 왜 계약의 `answer`(2000)보다 좁은가 — 답변이 가는 **목적지 칸**이 500자이기
 *   때문이다 (`MissionData.statement`·`GoalData.outcome`·`PolicyData.rule`·
 *   `ConstraintData.statement`). 여기서 막지 않으면 긴 답변이 파싱에서 터지고,
 *   사람은 다 쓴 뒤에야 그걸 안다.
 * ⚠ 이 숫자를 손으로 지키지 않는다 — `test/answer-slot.test.ts` 가 아래 표를 돌면서
 *   **딱 이 길이의 답변이 모든 줄에서 통과하는지**를 잰다. 목적지 칸이 더 좁은 줄을
 *   표에 더하면 그 시험이 빨개진다.
 */
export const ANSWER_MAX = 500

/**
 * 🔴 **답이 갈 수 있는 자리의 값 목록** (`AnswerQuestions.save_as` 로 직렬화된다 —
 * 끝에만 더하고 중간을 지우지 마라).
 *
 * ⚠ **10종 전부가 여기 있지 않은 것은 실수가 아니다.** 기준은 하나다 —
 *   「한 문장으로 그 타입의 **필수 칸이 전부 차는가**」. 안 차는 타입은 서버가 없는
 *   값을 지어내야 한다: `roadmap` 은 `milestone_id`·`done_when`, `workflow` 는
 *   `trigger`·`steps`, `architecture` 는 `component`, `domain` 은 `name`,
 *   `adr` 는 `context`·`consequences`·`adr_status` 가 더 필요하다. 자유 문장을
 *   그 칸들로 뜯는 것은 **§7.1 의 일**이고, 여기서 흉내 내면 근거를 지어내게 된다.
 *   (`open_question` 은 다르다 — 답을 다시 질문으로 저장하는 것은 답이 아니다.)
 */
export const ANSWER_SLOT_KEYS = [
  'mission', 'goal', 'constraint', 'policy_must', 'policy_should',
] as const
export type AnswerSlotKey = (typeof ANSWER_SLOT_KEYS)[number]

/**
 * 답이 갈 자리 한 줄.
 * @property label 화면 4 의 「무엇으로 저장할까요」에 그려지는 문구
 * @property data  답변 → 그 타입의 `data`. **답변에 없는 값을 넣지 마라.**
 */
export interface AnswerSlot<K extends ItemType = ItemType> {
  readonly label: string
  readonly type: K
  readonly data: (answer: string) => z.input<(typeof ITEM_DATA)[K]>
}

/** 표의 한 줄이 자기 타입의 `data` 를 내는지 **쓰는 자리에서** 잰다. */
const slot = <K extends ItemType>(row: AnswerSlot<K>): AnswerSlot<K> => row

/**
 * 🔴 **답변이 갈 자리의 정본 표.**
 *
 * ★ 새 자리를 더하는 절차 — 넷이고, 앞의 둘은 기계가 막아 준다:
 *   ① `ANSWER_SLOT_KEYS` **끝에** 값 추가 (중간에 끼우지 마라 — 요청으로 직렬화된다)
 *   ② 이 표에 한 줄  ← ①만 하면 여기서 타입 검사가 막힌다
 *   ③ `packages/schema/test/answer-slot.test.ts` 는 고칠 것이 없다 — 표를 돌면서 잰다
 *      (다만 「줄마다 결과가 다르다」를 재므로 **앞 줄과 같은 것을 내면 빨개진다**)
 *   ④ 화면·라우트도 고칠 것이 없다 — 둘 다 이 표를 읽기만 한다
 *
 * ⚠ `policy` 가 두 줄인 이유는 `PolicyData.severity` 에 기본값이 없기 때문이다.
 *   서버가 대신 고르면 그건 사람이 안 한 판단이다 — **사람이 고르게 갈라 놓는다.**
 * ⚠ `enforcement: 'review'` 는 「사람이 리뷰에서 본다」다. 말로 답한 것을 hook 이
 *   강제한다고 적으면 거짓이다 (`seed-questions.ts` 와 같은 판단).
 */
export const ANSWER_SLOTS = {
  mission: slot({
    label: '미션 — 이 프로젝트가 만드는 것',
    type: 'mission',
    data: (answer) => ({ statement: answer }),
  }),
  goal: slot({
    label: '목표 — 이번에 끝내야 하는 것',
    type: 'goal',
    data: (answer) => ({ outcome: answer }),
  }),
  constraint: slot({
    label: '제약 — 팀을 묶고 있는 것',
    type: 'constraint',
    data: (answer) => ({ statement: answer }),
  }),
  policy_must: slot({
    label: '정책(반드시) — 어기면 안 되는 것',
    type: 'policy',
    data: (answer) => ({ rule: answer, severity: 'must', enforcement: 'review' }),
  }),
  policy_should: slot({
    label: '정책(권장) — 되도록 지키는 것',
    type: 'policy',
    data: (answer) => ({ rule: answer, severity: 'should', enforcement: 'review' }),
  }),
} as const satisfies Record<AnswerSlotKey, AnswerSlot>

// ---------------------------------------------------------------------
//  서버측 AI(§7.1)가 내는 모양 — 초안에서 **근거만** chunk 기준으로 바꾼 것
//
//  🔴 **왜 `ContextItemDraft` 를 그대로 안 쓰나** — SPEC §7.1 은
//    「`source_ref.start_char/end_char` 는 **chunk offset** 을 문서 offset 으로 변환해
//    검증」이라고 적는다. 즉 모델이 내는 offset 은 문서 기준이 아니다. 그리고
//    `document_version_id`(uuid)는 **서버가 아는 값**이라 모델이 되풀이할 이유가 없다 —
//    지어내면 근거가 남의 문서를 가리키게 되고 그게 P7 이 무너지는 자리다.
//    `owner_id` 도 같은 이유로 뺐다 (사람의 uuid 를 모델이 알 리 없다).
//
//  ⚠ 타입별 `data` 는 **위 `ITEM_DATA` 표를 그대로 읽는다.** 새 ItemType 을 더할 때
//    여기 고칠 것은 없다 — `variantsOf` 가 표를 도는 자리 하나다.
//
//  ⚠ 이 계약은 **외부 입력**이다 (LLM 응답). 그래서 라우트 body 와 같은 곳에 둔다 —
//    「모든 외부 입력은 packages/schema 로 파싱한다」(CLAUDE.md).
// ---------------------------------------------------------------------

/** chunk 안의 원문 구간. `end_char` 는 exclusive 다 (`slice` 와 같은 뜻). */
export const AiSourceSpan = z.object({
  start_char: z.int().min(0),
  end_char: z.int().min(0),
  heading_path: z.array(z.string().max(200)).max(10).default([]),
}).strict()
export type AiSourceSpan = z.infer<typeof AiSourceSpan>

/** chunk 하나가 낼 수 있는 항목 수 상한 — 넘으면 계약 위반으로 1회 재시도한다. */
export const AI_MAX_ITEMS_PER_CHUNK = 40
/** chunk 하나가 낼 수 있는 열린 질문 수 상한. */
export const AI_MAX_OPEN_QUESTIONS_PER_CHUNK = 20

const AiDraftBase = DraftBase.omit({ source_refs: true, owner_id: true }).extend({ span: AiSourceSpan })

export const AiContextItemDraft = z.discriminatedUnion('type', variantsOf(AiDraftBase))

type AiDraftOut = z.infer<typeof AiDraftBase>

export type AiContextItemDraft = {
  [K in ItemType]: AiDraftOut & { type: K; data: z.infer<(typeof ITEM_DATA)[K]> }
}[ItemType]

/** §7.1 의 출력 스키마 그 자체. 도구(tool use)의 `input_schema` 가 이것에서 나온다. */
export const AiStructureOutput = z.object({
  items: z.array(AiContextItemDraft).max(AI_MAX_ITEMS_PER_CHUNK),
  open_questions: z.array(z.object({
    question: Question,
    span: AiSourceSpan,
  }).strict()).max(AI_MAX_OPEN_QUESTIONS_PER_CHUNK),
}).strict()

export type AiStructureOutput = {
  items: AiContextItemDraft[]
  open_questions: { question: string; span: AiSourceSpan }[]
}
