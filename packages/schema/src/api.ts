import { z } from 'zod'
import {
  CalendarDate, CONFIDENCE_LEVELS, ITEM_STATUSES, ITEM_TYPES, ItemId,
  Question, RepoName, Scope, Semver, SourceRef, SOURCE_REFS_MAX,
} from './common'
import type { ItemStatus } from './common'
import { ANSWER_SLOT_KEYS } from './item'
import { ContextItemsBatchDraft, MAX_DRAFT_ITEMS, ProgressEvent, Proposal, SyncReport } from './upload'

// =====================================================================
//  API 계약 (docs/SPEC.md §5)
//
//  ★ 왜 이 파일이 `packages/schema` 에 있나 — 라우트가 자기 자리에서 body 를 손으로
//    검사하면 한 곳만 빠져도 P1 방어선이 뚫린다. **서버가 받는 모든 body 는 여기서
//    파싱된다.** 응답 봉투와 에러 코드도 같이 둔다 — 요청만 정본이고 응답이 흩어지면
//    화면이 라우트마다 다른 모양을 받는다.
//
//  ⚠ 의존 방향은 한쪽이다 (`schema ← compiler ← web/plugin`). 이 파일은 웹을 모른다 —
//    HTTP 상태 숫자까지만 안다. `Response` 를 만드는 것은 `apps/web/src/lib/api` 다.
// =====================================================================

// ---------------------------------------------------------------------
//  에러 코드 — SPEC §5 마지막 줄이 정본이었고, 이제 이 표가 정본이다
// ---------------------------------------------------------------------

/**
 * 🔴 **에러 코드의 정본 목록.** SPEC §5 는 아홉을 한 줄로 나열만 했고, 그동안
 *   코드 어디에도 이 이름이 없었다 — 라우트를 쓰는 사람이 문자열을 손으로 적게 되고,
 *   오타가 조용히 통과한다 (docs/feedback/FINDINGS.md 12번).
 *
 * ⚠ 직렬화된다 (에러 응답의 `code`). **끝에만 더하고 중간을 지우지 마라.**
 */
export const ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'STALE_BASE',
  'REVISION_CONFLICT',
  'BUDGET_EXCEEDED',
  'RATE_LIMITED',
  'COMPILE_FAILED',
  //  ⚠ SPEC §5 의 나열에는 없다. **잡히지 않은 예외도 봉투로 나가야** 해서 더했다 —
  //     안 그러면 그 한 응답만 `{error:{code,…}}` 가 아니고, 화면은 그 모양을 못 읽는다.
  //     스택·본문은 절대 싣지 않는다 (SPEC §11 로그 규칙과 같은 이유).
  'INTERNAL',
  //  ⚠ SPEC §7 공통 규약의 마지막 갈래다 — 「출력은 Zod 로 재검증, 실패 시 오류 위치를
  //     넣어 1회 재시도, 재실패 시 `AI_OUTPUT_INVALID`」. `INTERNAL`(500)로 내면
  //     「AI 가 계약과 다른 걸 냈다」와 「서버가 터졌다」가 화면에서 구별되지 않는다
  //     (docs/feedback/FINDINGS.md 48번).
  'AI_OUTPUT_INVALID',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

/**
 * 🔴 **코드 → HTTP 상태 + 기본 문구의 정본 표.**
 *
 * ★ 새 에러 코드를 더하는 절차 — 넷이고, 앞의 둘은 기계가 막아 준다:
 *   ① 위 `ERROR_CODES` **끝에** 값 추가 (중간에 끼우지 마라 — 직렬화된다)
 *   ② 이 표에 한 줄  ← ①만 하면 여기서 타입 검사가 막힌다
 *   ③ 그 코드를 **실제로 내는 자리**를 만든다 (라우트나 가드)
 *   ④ `apps/web/test/error-codes.test.ts` 의 「아직 주인이 없는 코드」 표에서 지운다
 *      ← ③을 안 하면 그 시험이 「소비처가 0곳」이라며 빨개진다
 *
 * ★ 왜 상태 숫자가 여기 있나 — 라우트마다 `return new Response(..., 403)` 을 적으면
 *   같은 코드가 곳에 따라 다른 상태로 나간다. 화면은 상태로 갈래를 타는데 그러면
 *   조용히 갈라진다. **한 코드는 한 상태다.**
 *
 * ⚠ 상태가 겹치는 것은 정상이다 (409 둘 · 429 둘). 화면이 구별하는 근거는 `code` 다.
 */
export const ERROR_STATUS: Record<ErrorCode, { status: number; message: string }> = {
  UNAUTHORIZED: { status: 401, message: '인증이 필요하다' },
  FORBIDDEN: { status: 403, message: '이 작업을 할 권한이 없다' },
  NOT_FOUND: { status: 404, message: '대상을 찾을 수 없다' },
  VALIDATION_FAILED: { status: 400, message: '요청 본문이 계약과 맞지 않는다' },
  //  발행 요청의 base 가 지금의 공식 버전이 아니다 (SPEC §2.1 1단계).
  STALE_BASE: { status: 409, message: '기준 버전이 낡았다 — 다시 읽고 보내라' },
  //  항목 부분 갱신에서 `revision` 이 현재와 다르다 (SPEC §5).
  REVISION_CONFLICT: { status: 409, message: '항목이 그 사이 바뀌었다 — 다시 읽고 보내라' },
  BUDGET_EXCEEDED: { status: 429, message: '오늘 AI 예산을 다 썼다' },
  RATE_LIMITED: { status: 429, message: '요청이 너무 잦다' },
  COMPILE_FAILED: { status: 500, message: 'Pack 컴파일에 실패했다' },
  INTERNAL: { status: 500, message: '서버에서 처리하지 못했다' },
  //  ⚠ 502 다 — 우리가 터진 게 아니라 **상류가 계약을 어겼다.** 500 으로 내면
  //     운영자가 우리 스택을 뒤지고, 화면은 「다시 해 보세요」를 못 고른다 (SPEC §7).
  AI_OUTPUT_INVALID: { status: 502, message: 'AI 응답이 계약과 맞지 않는다' },
}

// ---------------------------------------------------------------------
//  응답 봉투 (SPEC §5 공통)
// ---------------------------------------------------------------------

export const ApiMeta = z.object({ request_id: z.uuid() }).strict()

/** 성공 봉투. `data` 는 엔드포인트마다 달라서 스키마를 받아 감싼다. */
export function apiOk<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: ApiMeta }).strict()
}

/** 실패 봉투. 라우트가 만드는 모든 에러 응답이 이 모양이어야 한다. */
export const ApiFailure = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string().min(1),
    details: z.unknown().optional(),
    request_id: z.uuid(),
  }).strict(),
}).strict()
export type ApiFailure = z.infer<typeof ApiFailure>

/** 목록 공통 질의 (SPEC §5 「목록은 `?limit=50&offset=`」). */
export const LIST_LIMIT_DEFAULT = 50
export const LIST_LIMIT_MAX = 200
export const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  offset: z.coerce.number().int().min(0).default(0),
}).strict()
export type ListQuery = z.infer<typeof ListQuery>

// ---------------------------------------------------------------------
//  DB·API 가 함께 쓰는 값 목록
//  ★ 왜 여기로 올라왔나 — 넷 다 `apps/web/src/db/schema.ts` 에만 있었다. 그 파일의
//    주석이 「API 계약이 그 값을 쓰게 되는 순간 packages/schema 로 올려라」고 적었고,
//    아래 요청·질의 스키마가 그 **둘째 사용자**다 (CLAUDE.md 「경계에만 인터페이스」).
// ---------------------------------------------------------------------

/** 팀 권한 2단계 (SPEC §5). owner 는 member 가 할 수 있는 것을 전부 할 수 있다. */
export const TEAM_ROLES = ['owner', 'member'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

/**
 * 권한 서열. 라우트는 「최소 몇 등급이 필요한가」만 적고 비교는 이 표가 한다.
 * ★ 등급을 더하려면 여기 한 줄 — 라우트는 고칠 것이 없다.
 */
export const ROLE_RANK: Record<TeamRole, number> = { member: 0, owner: 1 }

/** 원본 문서 종류 6종 (SPEC §2 · §5 POST /documents). */
export const SOURCE_DOCUMENT_KINDS = ['goal', 'policy', 'roadmap', 'adr', 'notes', 'wiki'] as const
export type SourceDocumentKind = (typeof SOURCE_DOCUMENT_KINDS)[number]

/**
 * AI job 의 수명 4종 (SPEC §2 · §9 화면 3 「구조화 진행 표시(polling)」).
 *
 * ★ 왜 여기로 올라왔나 — **둘째 사용자가 생겼다.** `apps/web/src/db/schema.ts` 에
 *   있을 때 소비처는 DB 하나였는데, 화면 3 이 이 값마다 다른 칩을 그리게 되면서
 *   화면도 `Record<AiJobStatus, …>` 를 갖게 됐다 (`components/chips.tsx`).
 *   그 표의 키를 화면이 손으로 적으면 상태가 늘 때 조용히 하나가 빠진다.
 * ⚠ **기능 목록(`AI_FEATURES`)은 여기로 올리지 마라.** 이 패키지는 플러그인 번들에
 *   통째로 실려 사용자 기계로 배포된다 (`lib/ai/features.ts` 머리 주석). 수명 4종은
 *   이미 job 응답의 `status` 로 나가는 값이라 숨길 것이 없지만, 서버가 어떤 AI 기능을
 *   가졌는지는 그렇지 않다.
 * ⚠ 직렬화된다 (`ai_job_status` pgEnum) — 끝에만 더하고 중간을 지우지 마라.
 */
export const AI_JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed'] as const
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number]

/**
 * 마일스톤 한 줄이 화면에서 가질 수 있는 상태 4종 (SPEC §5 roadmap · §9 화면 8 · P5).
 *
 * ★ 왜 여기로 올라왔나 — **둘째 사용자가 생겼다.** `apps/web/src/lib/api/progress.ts`
 *   에 있을 때 소비처는 `rollupMilestone()` 하나였는데, 화면 8 이 이 값마다 다른 칩을
 *   그리게 되면서 화면도 `Record<MilestoneStatus, …>` 를 갖게 됐다
 *   (`components/chips.tsx` 의 `MILESTONE_CHIP`). 그 표의 키를 화면이 손으로 적으면
 *   상태가 늘 때 조용히 하나가 빠진다 — `AI_JOB_STATUSES` 가 올라온 것과 같은 이유다.
 * ⚠ 화면은 이 목록을 **읽기만** 한다. 「무엇이 이 상태로 접히나」는 여전히 서버 전용
 *   표(`PROGRESS_EFFECT`)이고 여기로 올리지 않는다 — 그건 응답으로 나가는 값이 아니다.
 * 🔴 `done` 은 **보고로는 될 수 없다.** owner 가 `POST /progress/{id}/confirm` 을
 *   눌러야 한다 — 그게 「agent 가 스스로 완료를 선언하지 못한다」의 전부다.
 * ⚠ 직렬화되지는 않지만(DB enum 이 아니다) 응답으로 나간다 — 화면이 모르는 값이
 *   생기지 않게 끝에만 더해라.
 */
export const MILESTONE_STATUSES = ['not_started', 'in_progress', 'done_candidate', 'done'] as const
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]

/**
 * 충돌 종류 6종 (SPEC §2 · §7.2).
 *
 * ⚠ 뒤의 **둘은 「사람에게 묻는 것」**이고 탐지가 만들지 않는다 (`detected: false`).
 *   `open_question` 은 §7.1 이 문서를 읽다 남긴 질문이고, `seed_question` 은
 *   프로젝트를 만들 때 심는 **씨앗 질문 10개**다 (§9 화면 3 ③ — 문서가 없어도
 *   시작할 수 있게 하는 자리). 그 둘을 한데 모은 목록이 `QUESTION_CONFLICT_KINDS` 다.
 * ⚠ 직렬화된다 (`conflict_kind` pgEnum) — 끝에만 더하고 중간을 지우지 마라.
 */
export const CONFLICT_KINDS = ['contradiction', 'stale', 'duplicate', 'doc_vs_code', 'open_question', 'seed_question'] as const
export type ConflictKind = (typeof CONFLICT_KINDS)[number]

/** 충돌 처리 상태 3종 (SPEC §2). */
export const CONFLICT_STATUSES = ['open', 'resolved', 'dismissed'] as const
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number]

/**
 * 충돌 카드의 선택 버튼 4개 (SPEC §5 · §9 화면 4).
 * ⚠ `dismiss` 만 충돌을 `dismissed` 로 보내고 나머지 셋은 `resolved` 다 —
 *   그 갈래는 `apps/web` 의 `RESOLUTION_OUTCOME` 표 하나에만 있다.
 */
export const CONFLICT_CHOICES = ['a', 'b', 'both', 'dismiss'] as const
export type ConflictChoice = (typeof CONFLICT_CHOICES)[number]

// ---------------------------------------------------------------------
//  §7.2 충돌 탐지가 내는 모양 — 종류별로 갈리는 것은 **아래 표 하나**에만 있다
//
//  ⚠ 이 계약은 **외부 입력**이다 (LLM 응답). 그래서 라우트 body 와 같은 곳에 둔다 —
//    「모든 외부 입력은 packages/schema 로 파싱한다」(CLAUDE.md). §7.1 의
//    `AiStructureOutput`(item.ts)과 같은 이유다.
// ---------------------------------------------------------------------

/**
 * 충돌 한 장이 **무엇을 가리키나** 3종.
 *
 * ⚠ `items` 를 `SOURCE_REF` 의 종류로 더하지 마라. 그러면 항목의 `source_refs` 가
 *   다른 항목을 가리킬 수 있게 되고, 원문까지 가는 사슬이 한 칸 끊긴다 (P7).
 *   충돌이 항목을 가리키는 것과 항목이 원문을 가리키는 것은 **다른 관계**다.
 * 🔴 `none` 은 「아직 가리킬 것이 없다」다 — 씨앗 질문이 그렇다. 문서도 항목도 없는
 *   프로젝트에 심기 때문에 **네 칸이 전부 빈다.** `document` 로 눙치면 `a_ref` 를
 *   지어내야 하고, 그 순간 그 근거는 아무 원문도 가리키지 않는 거짓이 된다 (P7).
 */
export const CONFLICT_ANCHORS = ['items', 'document', 'none'] as const
export type ConflictAnchor = (typeof CONFLICT_ANCHORS)[number]

/** 충돌 종류 하나의 규칙. 프롬프트·검증·DB 제약·화면이 이 표를 **읽기만** 한다. */
export interface ConflictKindRule {
  /**
   * §7.2 **탐지가 이 종류를 낼 수 있나.** `false` 면 다른 곳이 만든다 —
   * 어디가 만드는지는 `madeBy` 에 적는다.
   *
   * 🔴 `severity` 는 §7.2 가 매기는 값이다 — 이 칸이 `true` 인 종류만 갖는다.
   */
  readonly detected: boolean
  /**
   * 🔴 이 종류가 **무엇을 가리키나.** 충돌 행의 어느 칸이 채워지는지가 여기서 갈린다:
   *   - `items`    → `a_item_id` (·`needsB` 면 `b_item_id`) · `a_ref`/`b_ref` 는 비어야 한다
   *   - `document` → `a_ref` (·`needsB` 면 `b_ref`) · `a_item_id`/`b_item_id` 는 비어야 한다
   *   - `none`     → 넷 다 비어야 한다 (가리킬 것이 아직 없는 질문)
   *
   * ★ 그 규칙은 문서가 아니라 **DB 제약**이다 — `apps/web/src/db/schema.ts` 의
   *   `conflictShapeCheck()` 가 이 표를 읽어 CHECK 을 만든다. 여기 한 줄을 고치고
   *   `db:generate` 를 돌리면 제약이 따라온다.
   */
  readonly anchor: ConflictAnchor
  /** 어긋나는 **두 쪽**이 있는 종류인가. `true` 면 b 쪽 칸이 **있어야** 한다. */
  readonly needsB: boolean
  /**
   * 🔴 **이 종류를 AI 가 만들었나.** 화면이 `AI 제안` 배지를 다는 기준이고,
   * 화면 4 의 「AI 가 찾은 결정이 필요한 것 N건」이 세는 기준이다 (§9 화면 4).
   *
   * ★ 왜 `detected` 로 갈음할 수 없나 — `open_question` 은 §7.2 **탐지**가 낸 것이
   *   아니라 §7.1 구조화가 문서를 읽다 남긴 것이라 `detected: false` 지만
   *   **AI 가 만든 것이다.** `detected` 로 배지를 달면 그 열린 질문만 배지를 잃고,
   *   화면에서 사람이 적은 질문처럼 보인다.
   * ⚠ 사람이 정한 것에 이 배지를 붙이지 마라 — 신뢰 경계가 흐려진다
   *   (DESIGN_BRIEF §3 「AiBadge」).
   */
  readonly byAi: boolean
  /**
   * 🔴 **이 질문에 답하면 그 답이 어디로 가나** (SPEC §5 · FINDINGS 105).
   *   - `seeded` → 자리가 **이미 정해져 있다.** 씨앗 질문 10장은 질문마다 타입·제목이
   *     표에 적혀 있다 (`lib/api/seed-questions.ts`). 사람에게 더 물을 것이 없다.
   *   - `ask`    → 자리를 **사람에게 묻는다.** §7.1 이 문서를 읽다 남긴 질문은 그 표에
   *     없으므로, 화면 4 가 `ANSWER_SLOTS` 를 그려 고르게 하고 그 값이 `save_as` 로 온다.
   *   - `none`   → 질문이 아니다 (탐지된 충돌은 답이 아니라 **선택**으로 정리한다).
   *
   * ★ 왜 축을 더했나 — 이 값이 없을 때 화면은 「이 카드에 자리를 물어야 하나」를
   *   `kind === 'seed_question'` 으로 셌어야 한다. 종류가 늘면 그 `if` 를 찾아야 하고,
   *   못 찾으면 **답 칸만 있고 항목이 안 생기는 카드**가 조용히 하나 는다 (FINDINGS 105).
   * ⚠ `none` 인 줄은 정확히 `detected: true` 인 줄이다 — 둘이 갈라지지 않는지는
   *   `test/scope-and-enums.test.ts` 가 잰다. 손으로 맞추지 마라.
   */
  readonly answerSlot: 'seeded' | 'ask' | 'none'
  /** 이 종류를 만드는 자리 한 줄. `detected` 가 `false` 인 줄이 특히 중요하다. */
  readonly madeBy: string
  /**
   * 모델에게 주는 한 줄 정의. **§7.2 의 프롬프트가 이 문장을 그대로 싣는다** —
   * 여기 없는 종류는 모델이 배우지 못하고, 배우지 못한 종류는 영원히 0건이다.
   */
  readonly hint: string
}

/**
 * 🔴 **충돌 종류별 규칙의 정본 표** (SPEC §7.2 「kind 규칙」).
 *
 * ★ 새 종류를 더하는 절차 — 넷이고, 앞의 둘은 기계가 막아 준다:
 *   ① `CONFLICT_KINDS` **끝에** 값 추가 (중간에 끼우지 마라 — `conflicts.kind` 로 직렬화된다)
 *   ② 이 표에 한 줄  ← ①만 하면 여기서 타입 검사가 막힌다
 *   ③ `pnpm --filter web db:generate` — pgEnum 값이 늘고, **`anchor`·`needsB`·`detected`
 *      에서 나오는 CHECK 제약이 같이 바뀐다** (`db/schema.ts` 의 `conflictShapeCheck()`)
 *   ④ `detected: true` 로 더했으면 `test/scope-and-enums.test.ts` 의 「탐지 종류는
 *      전부 프롬프트에 실린다」가 그 줄을 요구한다
 *   화면·라우트는 고칠 것이 없다 — 이 표를 읽기만 하기 때문이다.
 *
 * ⚠ `detected` 가 `false` 인 줄은 **§7.2 의 출력 enum 에서 빠진다.** 모델이 낼 수
 *   없는 종류를 도구 스키마에 실으면, 모델은 그 이름을 골라 놓고 우리 검증에서
 *   버려진다 — 재시도가 늘고 재시도는 곧 돈이다.
 */
export const CONFLICT_KIND_RULES = {
  contradiction: {
    detected: true, anchor: 'items', needsB: true, byAi: true, answerSlot: 'none', madeBy: '§7.2 탐지',
    hint: '양립할 수 없다 — 둘 다 지키면 모순이 되는 두 항목이다.',
  },
  stale: {
    detected: true, anchor: 'items', needsB: true, byAi: true, answerSlot: 'none', madeBy: '§7.2 탐지',
    hint: '한쪽의 날짜·버전이 다른 쪽에 의해 무효가 됐다. **어느 쪽이 맞는지는 판단하지 마라.**',
  },
  duplicate: {
    detected: true, anchor: 'items', needsB: true, byAi: true, answerSlot: 'none', madeBy: '§7.2 탐지',
    hint: '같은 개념을 두 항목이 각각 적었다.',
  },
  doc_vs_code: {
    detected: true, anchor: 'items', needsB: true, byAi: true, answerSlot: 'none', madeBy: '§7.2 탐지',
    hint: '문서에서 온 항목(origin=doc)과 코드에서 온 항목(origin=code)이 서로 다른 말을 한다.',
  },
  //  ⚠ 이 종류만 `detected: false` 이고 이 종류만 `anchor: 'document'` 다. §7.1 이
  //     문서를 읽다 「판단이 필요하다」고 남긴 질문이고, 두 항목이 어긋난 것이 아니라
  //     **한쪽도 아직 없는** 것이다 — 가리킬 항목이 없으니 원문 구간을 가리킨다.
  open_question: {
    detected: false, anchor: 'document', needsB: false, byAi: true, answerSlot: 'ask',
    madeBy: '§7.1 문서 구조화의 `open_questions`',
    hint: '',
  },
  //  ⚠ 이 종류만 `anchor: 'none'` 이다. 프로젝트를 만드는 순간 심기 때문에 가리킬
  //     문서도 항목도 없다 — 답변이 곧 원문이고, 그 답변은 `resolution.note` 에 남는다.
  seed_question: {
    detected: false, anchor: 'none', needsB: false, byAi: false, answerSlot: 'seeded',
    madeBy: '프로젝트를 만들 때 심는 씨앗 질문 (`lib/api/seed-questions.ts`)',
    hint: '',
  },
  //  ⚠ `as const` 여야 `detected` 가 `true`/`false` **리터럴**로 남고, 아래
  //     `DetectedConflictKind` 가 표에서 타입으로 파생될 수 있다. `satisfies` 는
  //     빠진 줄을 그대로 막아 준다 (`Record` 주석과 같은 보호다).
} as const satisfies Record<ConflictKind, ConflictKindRule>

/** 표의 `detected: true` 인 줄만 모은 **타입**. 손으로 다시 적지 마라. */
export type DetectedConflictKind = {
  [K in ConflictKind]: (typeof CONFLICT_KIND_RULES)[K]['detected'] extends true ? K : never
}[ConflictKind]

/**
 * 🔴 **사람에게 묻는 종류.** `GET·POST /projects/{id}/questions` 가 이 목록으로 거른다.
 *
 * ★ 왜 표에서 뽑나 — 라우트에 `kind = 'open_question'` 을 적어 두었더니, 씨앗 질문이
 *   생긴 순간 **질문 카드 화면이 그것을 못 봤다.** 질문 종류가 늘 때 고칠 자리가
 *   여기 하나여야 한다.
 * ⚠ 「탐지가 만들지 않는 것 = 사람에게 묻는 것」이다. 셋째 줄을 더할 때 그 뜻이
 *   아니라면 `ConflictKindRule` 에 축을 하나 더해라 — 여기서 손으로 세지 마라.
 */
export type QuestionConflictKind = {
  [K in ConflictKind]: (typeof CONFLICT_KIND_RULES)[K]['detected'] extends false ? K : never
}[ConflictKind]

export const QUESTION_CONFLICT_KINDS = CONFLICT_KINDS.filter(
  (k): k is QuestionConflictKind => !CONFLICT_KIND_RULES[k].detected,
)

/** 같은 것을 **값**으로. 위 타입과 이 배열은 같은 표에서 나온다. */
export const DETECTED_CONFLICT_KINDS = CONFLICT_KINDS.filter(
  //  ⚠ 표를 읽는 순간 `detected` 가 `boolean` 으로 넓어져서 TS 가 이 좁힘을 스스로
  //     증명하지 못한다. 위 타입과 **같은 표**를 보고 있으므로 뜻은 어긋날 수 없다.
  (k): k is DetectedConflictKind => CONFLICT_KIND_RULES[k].detected,
)

/**
 * 🔴 **선택 4개 → 가리켜진 항목에 무엇을 하나의 정본 표** (SPEC §5 「→ 항목 상태 갱신」).
 *
 * ★ 왜 `packages/schema` 인가 — 사용자가 **둘**이다. 서버는 이 표대로 항목을 옮기고
 *   (`conflicts/{id}/resolve`), 화면 4 는 같은 표를 읽어 **버튼을 누르면 무엇이
 *   일어나는지**를 사람에게 말한다 (FINDINGS 74). `apps/web/src/lib/api` 에 두면
 *   화면이 서버 코드를 import 해야 하고, 그 순간 의존 방향이 깨진다
 *   (`schema ← compiler ← web/plugin`).
 *
 * ★ 왜 `RESOLUTION_OUTCOME`(선택 → **충돌** 상태)과 따로인가 — 둘은 같이 안 움직인다:
 *   `both` 와 `dismiss` 는 둘 다 충돌을 닫지만 항목은 하나도 안 건드린다. 한 표에
 *   접으면 그 차이를 적을 자리가 없어서 라우트에 `if (choice === 'both')` 가 다시 생긴다.
 *   (충돌 쪽 표는 서버만 쓰므로 `apps/web/src/lib/api/conflict.ts` 에 그대로 있다.)
 *
 * ★ 새 선택을 더하는 절차 — 다섯이고 앞의 둘은 기계가 막아 준다:
 *   ① `CONFLICT_CHOICES` **끝에** 값 추가 (중간에 끼우지 마라 — `resolution.choice` 로 저장된다)
 *   ② `RESOLUTION_OUTCOME` 에 한 줄  ③ **이 표에 한 줄**  ← ①만 하면 여기서 타입 검사가 막는다
 *   ④ `conflict-card.tsx` 의 `CHOICE_LABEL` 에 한 줄 (버튼 문구 — 결과 문구는 이 표가 낸다)
 *   ⑤ `test/api-routes.test.ts` 의 「선택이 항목을 바꾼다」와
 *      `test/web-conflict-card.test.ts` 의 「선택마다 결과를 말한다」가 그 줄을 요구한다
 *   라우트도 카드도 고칠 것이 없다 — 이 표를 읽기만 한다.
 *
 * ⚠ **`both` 와 `dismiss` 는 `null` 이다.** 보류(둘 다 남긴다)와 무시는 **결정이 아니다** —
 *   여기서 아무 항목이나 폐기하면 사람은 「아직 안 정했다」를 눌러 놓고 항목을 잃는다.
 * ⚠ 진 쪽만 옮긴다. **이긴 쪽은 안 건드린다** — 이미 `active` 인 항목을 `review` 로
 *   되돌리면 다음 발행에서 Pack 밖으로 나간다. 「A가 맞다」의 뜻과 정반대다.
 */
export const RESOLUTION_ITEM_OUTCOME: Record<
  ConflictChoice,
  { readonly loser: 'a' | 'b'; readonly status: ItemStatus } | null
> = {
  a: { loser: 'b', status: 'deprecated' },
  b: { loser: 'a', status: 'deprecated' },
  both: null,
  dismiss: null,
}

/**
 * 🔴 **「이 결정이 어느 항목을 어떤 상태로 옮기나」를 답하는 유일한 문.**
 *
 * ★ 왜 함수인가 — 답은 표 하나가 아니라 **둘**이 정한다: 무엇이 지는가는
 *   `RESOLUTION_ITEM_OUTCOME`(선택), 가리키는 것이 항목이기는 한가는
 *   `CONFLICT_KIND_RULES`(종류)다. 라우트나 화면에서 둘을 이으면 종류나 선택이 늘 때
 *   그 조립을 **두 곳에서** 다시 찾아야 한다.
 *
 * ⚠ `anchor` 가 `items` 가 아닌 종류(원문 구간·아무것도 없음)는 바꿀 항목이 **없다.**
 *   `a_ref` 에서 항목을 추측하지 마라 — `SourceRef` 는 원문까지 가는 사슬이지
 *   항목을 가리키는 이름이 아니다. 추측하면 **엉뚱한 항목을 폐기한다.**
 * ⚠ `undefined` 는 「이 선택은 항목을 안 건드린다」와 「건드릴 항목이 안 적혀 있다」를
 *   **구분하지 않는다.** 둘을 갈라야 하는 쪽(화면)은 `RESOLUTION_ITEM_OUTCOME` 를
 *   먼저 보고 온다 — 여기서 세 갈래를 만들면 라우트가 안 쓰는 갈래를 지게 된다.
 */
export function itemOutcomeOf(input: {
  kind: ConflictKind
  aItemId: string | null
  bItemId: string | null
  choice: ConflictChoice
}): { publicId: string; status: ItemStatus } | undefined {
  const outcome = RESOLUTION_ITEM_OUTCOME[input.choice]
  if (!outcome) return undefined
  if (CONFLICT_KIND_RULES[input.kind].anchor !== 'items') return undefined
  const publicId = outcome.loser === 'a' ? input.aItemId : input.bItemId
  //  한쪽뿐인 종류(`needsB: false`)는 질 쪽이 비어 있다. 빈 칸을 채우지 않는다.
  if (publicId === null) return undefined
  return { publicId, status: outcome.status }
}

/**
 * 충돌 카드의 심각도 3단계.
 *
 * ⚠ SPEC §7.2 는 `severity` 라는 **이름만** 적고 값을 적지 않는다. 지어내는 대신
 *   이 저장소에 이미 있는 3단계 사다리(`CONFIDENCE_LEVELS`)와 **같은 낱말**을 쓴다.
 * ★ 왜 `CONFIDENCE_LEVELS` 를 그대로 재사용하지 않나 — 뜻이 다르다. 확신 단계가
 *   늘어야 할 이유와 충돌 심각도가 늘어야 할 이유는 서로 상관이 없고, 하나로 묶으면
 *   한쪽 때문에 다른 쪽이 바뀐다.
 */
export const CONFLICT_SEVERITIES = ['high', 'medium', 'low'] as const
export type ConflictSeverity = (typeof CONFLICT_SEVERITIES)[number]

/**
 * 심각도 → 정렬 순서 (큰 값이 먼저). **화면 4 는 카드 10장만 보여 준다** —
 * 무엇이 앞에 오는지가 곧 사람이 무엇을 먼저 보는가다.
 */
export const CONFLICT_SEVERITY_RANK: Record<ConflictSeverity, number> = { high: 2, medium: 1, low: 0 }

/** §7.2 한 번이 낼 수 있는 충돌 수 상한 — 넘으면 계약 위반으로 1회 재시도한다. */
export const AI_MAX_CONFLICTS = 20

/** 🔴 §7.2 의 출력 그 자체. 도구(tool use)의 `input_schema` 가 이것에서 나온다. */
export const AiConflict = z.object({
  kind: z.enum(DETECTED_CONFLICT_KINDS),
  //  ⚠ uuid 가 아니라 `item_<slug>` 다. 모델은 프롬프트에 실린 id 만 쓸 수 있고,
  //     실리지 않은 id 는 서버가 「없는 항목」으로 잡아 재시도한다 (P7).
  a_item_id: ItemId,
  b_item_id: ItemId.optional(),
  question: Question,
  severity: z.enum(CONFLICT_SEVERITIES),
}).strict()
export type AiConflict = z.infer<typeof AiConflict>

export const AiConflictOutput = z.object({
  conflicts: z.array(AiConflict).max(AI_MAX_CONFLICTS),
}).strict()
export type AiConflictOutput = z.infer<typeof AiConflictOutput>

// ---------------------------------------------------------------------
//  요청 body — 전부 `.strict()` 다 (P1 · SPEC §3.1)
//
//  ★ 새 엔드포인트를 더하는 절차:
//    ① 여기에 `.strict()` 스키마 하나
//    ② `API_REQUESTS` 표에 한 줄  ← 빠뜨리면 그 body 만 P1 검사를 안 받는다
//    ③ 라우트에서 `parseBody()` 로 파싱 (손으로 검사하지 마라)
// ---------------------------------------------------------------------

const Slug = z.string().min(2).max(60).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, '소문자·숫자·하이픈만')
const Name = z.string().min(1).max(120)

/** `POST /teams` */
export const CreateTeam = z.object({ name: Name, slug: Slug }).strict()

/** `POST /teams/{id}/projects` */
export const CreateProject = z.object({
  name: Name,
  slug: Slug,
  description: z.string().max(1000).optional(),
}).strict()

/** `POST /projects/{id}/repos` */
export const CreateRepo = z.object({
  name: RepoName,
  remote_url: z.url().max(400).optional(),
  default_branch: z.string().min(1).max(100).optional(),
  /** 모노레포에서 이 레포가 차지하는 앞자리. 없으면 저장소 전체다. */
  path_prefix: z.string().min(1).max(200).optional(),
}).strict()

/** `POST /projects/{id}/tokens` — 응답의 토큰 원문은 **한 번만** 보여 준다 (SPEC §11). */
export const CreateToken = z.object({ device_name: z.string().min(1).max(100) }).strict()

/**
 * `POST /projects/{id}/documents`
 * ⚠ `content` 는 팀이 **의도적으로 올리는 문서 본문**이다 (SPEC §5). P1 이 막는 것은
 *   코드 본문·비밀값·개인 기억·대화 기록이고, 그 넷은 이 계약 어디에도 자리가 없다.
 */
export const CreateDocument = z.object({
  title: z.string().min(1).max(200),
  kind: z.enum(SOURCE_DOCUMENT_KINDS),
  content: z.string().min(1).max(400_000),
}).strict()

/** `GET /projects/{id}/context-items` 의 질의 (SPEC §5 `?type&status&scope`). */
export const ContextItemQuery = ListQuery.extend({
  type: z.enum(ITEM_TYPES).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  /** `project` · `domain:billing` · `path:src/**` 처럼 `kind` 또는 `kind:value` 다. */
  scope: z.string().max(240).optional(),
}).strict()

/**
 * `/context-items/{id}` 부분 갱신 (SPEC §5).
 *
 * ⚠ SPEC 이 이 필드에 붙인 이름은 **P1 게이트(`tools/principles.ps1`)의 금지어**라
 *   코드에서는 `changes` 다. 그 금지어들은 「코드의 변경분」을 뜻하고, 그것을
 *   서버가 받지 않는다는 게 정확히 P1 이다. 게이트는 일부러 무디다 —
 *   **이름을 바꾸는 편이 게이트에 예외를 파는 것보다 싸다** (FINDINGS).
 *
 * ⚠ `data` 만 `unknown` 이다 — 타입별로 모양이 갈려서 항목의 `type` 을 알아야 잰다.
 *   라우트가 DB 에서 type 을 읽고 `ITEM_DATA[type]`(전부 `.strict()`)으로 다시 파싱한다.
 *   allowlist 는 그대로다.
 */
export const ContextItemUpdate = z.object({
  revision: z.int().min(1),
  changes: z.object({
    title: z.string().min(2).max(120).optional(),
    body: z.string().max(2000).optional(),
    status: z.enum(ITEM_STATUSES).optional(),
    scope: Scope.optional(),
    priority: z.int().min(0).max(100).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    owner_id: z.uuid().nullable().optional(),
    valid_from: CalendarDate.nullable().optional(),
    valid_until: CalendarDate.nullable().optional(),
    confidence: z.enum(CONFIDENCE_LEVELS).optional(),
    source_refs: z.array(SourceRef).min(1).max(SOURCE_REFS_MAX).optional(),
    data: z.unknown().optional(),
  }).strict(),
}).strict()

/** `GET /projects/{id}/conflicts` 의 질의 (SPEC §5 `?status`). */
export const ConflictQuery = ListQuery.extend({
  status: z.enum(CONFLICT_STATUSES).optional(),
  kind: z.enum(CONFLICT_KINDS).optional(),
}).strict()

/**
 * 결정 메모의 상한. **화면 4 의 메모 칸이 이 값을 읽는다** — 숫자가 두 곳에 있으면
 * 화면은 600자를 받고 서버는 400 을 내는 자리가 생긴다.
 */
export const RESOLUTION_NOTE_MAX = 500

/** `/conflicts/{id}/resolve` (SPEC §5) */
export const ResolveConflict = z.object({
  choice: z.enum(CONFLICT_CHOICES),
  note: z.string().max(RESOLUTION_NOTE_MAX).optional(),
}).strict()

/**
 * `POST /projects/{id}/questions` — 질문 카드에 답한다 (SPEC §5 · §9 화면 4).
 *
 * 🔴 **`save_as` 는 「이 답을 무엇으로 저장할까요」다** (FINDINGS 105). 값의 정본은
 *   `ANSWER_SLOTS` 이고, **서버가 그 표대로 답을 옮긴다** — 오는 것은 고른 자리의
 *   이름뿐이고 항목 본문이 아니다.
 *
 * ★ 왜 초안(`ContextItemDraft`)을 통째로 받지 않나 — 그러면 타입별 `data` 를 조립하는
 *   일이 화면으로 내려가고, 「답변이 어느 칸으로 가나」를 아는 표가 **두 곳**이 된다
 *   (`AcceptJobItems` 가 후보의 id 만 받는 것과 같은 판단 · P7). 실제로 그 칸은
 *   계약에만 있고 **보내는 제품 코드가 한 곳도 없었다** — 시험만 부르는 칸이었다.
 * ⚠ 씨앗 질문에는 이 칸을 보내지 마라 — 자리가 표에 이미 있다
 *   (`CONFLICT_KIND_RULES[kind].answerSlot` 이 `seeded` 인 종류). 서버가 400 을 낸다.
 * ⚠ `save_as` 가 없으면 **답만 기록하고 질문을 닫는다.** 사람이 「기록만」을 고른
 *   것이므로 없는 항목을 지어내지 않는다.
 */
export const AnswerQuestions = z.object({
  answers: z.array(z.object({
    question_id: z.uuid(),
    answer: z.string().min(1).max(2000),
    save_as: z.enum(ANSWER_SLOT_KEYS).optional(),
  }).strict()).min(1).max(20),
}).strict()

/**
 * 🔴 `POST /projects/{id}/jobs/{jobId}/items` — **§7.1 이 낸 항목 후보 중 사람이 고른
 * 것만 항목이 된다** (SPEC §5 · §7.1 · §9 화면 3 · FINDINGS 84).
 *
 * ★ 왜 「전부 받아들인다」가 아니라 고른 목록인가 — §7.1 마지막 줄이 「사람이 고르기
 *   전에 `context_items` 에 넣지 않는다」이다. 서버가 다 넣으면 그 문장이 거짓이 되고,
 *   모델이 뽑은 것과 사람이 승인한 것이 같은 뜻이 된다.
 * ⚠ 오는 것은 **후보의 `id` 뿐이다** — 초안 본문이 아니다. 본문을 같이 받으면 화면이
 *   모델의 출력을 고쳐서 되보낼 수 있게 되고, 그 항목의 근거(`source_refs`)는 여전히
 *   원문 구간을 가리켜서 **원문에 없는 문장이 원문을 근거로 배포된다** (P7).
 *   고치는 문은 항목이 된 **뒤**의 부분 갱신(`ContextItemUpdate`)이다.
 */
export const AcceptJobItems = z.object({
  item_ids: z.array(ItemId).min(1).max(MAX_DRAFT_ITEMS),
}).strict()

/**
 * `POST /projects/{id}/context-items:batch-draft` 를 **서버가** 팔 때 쓰는 모양.
 *
 * ★ 왜 `ContextItemsBatchDraft` 와 따로 있나 — 그쪽은 플러그인이 **보내기 전에** 스스로
 *   재는 계약이라 항목 하나라도 어긋나면 전부 거부하는 게 맞다. 서버는 다르다:
 *   SPEC §5 의 응답이 `{accepted, rejected[{index, issues}]}` 라서 **항목별로 갈라
 *   받아야** 한다. 40개 중 하나가 어긋났다고 39개를 버리면 scan 은 영원히 안 들어간다.
 *
 * ⚠ 느슨해진 것은 **바깥 배열뿐**이다. 항목 하나하나는 라우트가 `ContextItemDraft`
 *   (전부 `.strict()`)로 다시 판다 — P1 allowlist 는 그대로다.
 */
export const ContextItemsBatchDraftEnvelope = ContextItemsBatchDraft.extend({
  items: z.array(z.unknown()).min(1).max(50),
}).strict()

// ---------------------------------------------------------------------
//  API 2군 — 제안 · 발행 · Pack · 보고 (SPEC §5 · §2.1 · §6)
// ---------------------------------------------------------------------

/**
 * `POST /proposals/{id}/submit` · `/approve` · `/reject` (SPEC §5)
 *
 * ★ 셋이 같은 body 인 이유 — 셋 다 「누가 무엇을 결정했나」만 남긴다. 결정의 **종류**는
 *   경로가 말하지 상태 필드가 말하지 않는다. body 에 `status` 를 두면 `/approve` 로
 *   `rejected` 를 보낼 수 있게 되고, 그러면 경로가 거짓말한다.
 */
export const ProposalDecision = z.object({
  note: z.string().max(500).optional(),
}).strict()

/**
 * `POST /projects/{id}/versions/publish` (SPEC §5 · §2.1)
 *
 * ⚠ `base_version_id` 는 **nullable 이고 optional 이 아니다.** 첫 발행은 기준이 없어서
 *   `null` 인데, 그걸 「빼도 되는 필드」로 두면 **낡은 기준을 빠뜨린 요청과 구별할 수 없다** —
 *   `STALE_BASE` 검사가 통째로 무력해진다. 「기준이 없다」는 말은 명시적으로 해야 한다.
 */
export const PublishVersion = z.object({
  semver: Semver,
  base_version_id: z.uuid().nullable(),
  change_summary: z.string().max(1000).optional(),
}).strict()

/**
 * 🔴 **서버가 받는 body 의 정본 표.** `test/api-allowlist.test.ts` 가 이 표를 돌면서
 *   ① 전부 `.strict()` 인가 ② 금지 키가 없는가 를 잰다 —
 *   표에 없는 스키마는 **그 검사를 안 받는다.** 새 엔드포인트는 여기 한 줄.
 */
export const API_REQUESTS: Record<string, z.ZodType> = {
  'POST /teams': CreateTeam,
  'POST /teams/{id}/projects': CreateProject,
  'POST /projects/{id}/repos': CreateRepo,
  'POST /projects/{id}/tokens': CreateToken,
  'POST /projects/{id}/documents': CreateDocument,
  'POST /projects/{id}/questions': AnswerQuestions,
  'POST /projects/{id}/jobs/{jobId}/items': AcceptJobItems,
  'POST /conflicts/{id}/resolve': ResolveConflict,
  'context-items 일괄 초안': ContextItemsBatchDraftEnvelope,
  'context-items 부분 갱신': ContextItemUpdate,
  //  API 2군. ⚠ 아래 셋(`Proposal`·`SyncReport`·`ProgressEvent`)은 `upload.ts` 가 정본이다 —
  //  **플러그인도 웹도 같은 body 를 보낸다.** 여기 다시 정의하지 마라. 두 벌이 되는 순간
  //  한쪽만 조여지고, 느슨한 쪽이 P1 의 구멍이 된다.
  'POST /projects/{id}/proposals': Proposal,
  'POST /proposals/{id}/submit|approve|reject': ProposalDecision,
  'POST /projects/{id}/versions/publish': PublishVersion,
  'POST /projects/{id}/sync-reports': SyncReport,
  'POST /projects/{id}/progress': ProgressEvent,
}

export type CreateTeam = z.infer<typeof CreateTeam>
export type CreateProject = z.infer<typeof CreateProject>
export type CreateRepo = z.infer<typeof CreateRepo>
export type CreateToken = z.infer<typeof CreateToken>
export type CreateDocument = z.infer<typeof CreateDocument>
export type ContextItemQuery = z.infer<typeof ContextItemQuery>
export type ContextItemUpdate = z.infer<typeof ContextItemUpdate>
export type AcceptJobItems = z.infer<typeof AcceptJobItems>
export type ConflictQuery = z.infer<typeof ConflictQuery>
export type ResolveConflict = z.infer<typeof ResolveConflict>
export type AnswerQuestions = z.infer<typeof AnswerQuestions>
export type ProposalDecision = z.infer<typeof ProposalDecision>
export type PublishVersion = z.infer<typeof PublishVersion>
