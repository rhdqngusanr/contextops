import { z } from 'zod'
import {
  CalendarDate, CONFIDENCE_LEVELS, ITEM_STATUSES, ITEM_TYPES, ItemId,
  MilestoneId, Question, RepoPath, Scope, SourceRef, type ItemType,
} from './common'
import { nonEmpty } from './table'

// =====================================================================
//  ContextItem — 항목 하나. 정본은 docs/SPEC.md §3.
//
//  구조는 「공통 Base + 타입별 data」다. 타입별로 갈리는 것은 **아래 표 하나**에만
//  있고, 화면·컴파일러는 그 표를 **읽기만** 한다.
// =====================================================================

/** 모든 타입이 공유하는 필드. 서버가 채우는 것(project_id·status·revision)도 여기 있다. */
const ItemBase = z.object({
  id: ItemId,
  project_id: z.uuid(),
  title: z.string().min(2).max(120),
  body: z.string().max(2000),
  status: z.enum(ITEM_STATUSES),
  scope: Scope,
  priority: z.int().min(0).max(100).default(50),
  source_refs: z.array(SourceRef).min(1).max(20),
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

type BaseOut = z.infer<typeof ItemBase>
type DraftOut = z.infer<typeof DraftBase>

/** 타입별로 `data` 가 정확히 갈리는 공개 타입. 소비자는 `type` 으로 좁히면 된다. */
export type ContextItem = {
  [K in ItemType]: BaseOut & { type: K; data: z.infer<(typeof ITEM_DATA)[K]> }
}[ItemType]

export type ContextItemDraft = {
  [K in ItemType]: DraftOut & { type: K; data: z.infer<(typeof ITEM_DATA)[K]> }
}[ItemType]

export function parseContextItem(input: unknown): ContextItem {
  return ContextItem.parse(input) as ContextItem
}

export function parseContextItemDraft(input: unknown): ContextItemDraft {
  return ContextItemDraft.parse(input) as ContextItemDraft
}

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
