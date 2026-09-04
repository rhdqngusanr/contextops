import { CONFLICT_KIND_RULES } from '@contextops/schema'
import type {
  ConflictChoice, ConflictKind, ConflictSeverity, ConflictStatus, ItemStatus, SourceRef,
} from '@contextops/schema'

import { conflicts } from '../../db/schema'

// =====================================================================
//  충돌 카드 (SPEC §2 · §5 · §9 화면 4)
//
//  ★ 「질문 카드」는 따로 있는 표가 아니라 `kind = 'open_question'` 인 충돌이다.
//    표를 하나 더 만들면 카드 두 종류가 서로 다른 코드로 갈라진다.
// =====================================================================

/**
 * 🔴 **선택 4개 → 충돌 상태의 정본 표.**
 *
 * ★ 왜 표인가 — 라우트에 `if (choice === 'dismiss')` 를 적으면, 선택이 늘 때
 *   그 `if` 를 찾아야 한다. 표면 한 줄이다.
 * ⚠ `a`·`b`·`both` 는 셋 다 `resolved` 다. **어느 쪽을 골랐는가는 상태가 아니라
 *   `resolution.choice` 에 남는다** — 상태로 접으면 결정의 근거가 사라진다.
 */
export const RESOLUTION_OUTCOME: Record<ConflictChoice, ConflictStatus> = {
  a: 'resolved',
  b: 'resolved',
  both: 'resolved',
  dismiss: 'dismissed',
}

/**
 * 🔴 **선택 4개 → 가리켜진 항목에 무엇을 하나의 정본 표** (SPEC §5 「→ 항목 상태 갱신」).
 *
 * ★ 왜 옆에 표가 하나 더 있나 — 위 표는 「선택 → **충돌**의 다음 상태」고 이 표는
 *   「선택 → **진 쪽 항목**의 다음 상태」다. 둘은 같이 안 움직인다: `both` 와 `dismiss`
 *   는 둘 다 충돌을 닫지만 항목은 하나도 안 건드린다. 한 표에 접으면 그 차이를 적을
 *   자리가 없어서 라우트에 `if (choice === 'both')` 가 다시 생긴다.
 *
 * ★ 새 선택을 더하는 절차 — 넷이고 앞의 둘은 기계가 막아 준다:
 *   ① `CONFLICT_CHOICES` **끝에** 값 추가 (중간에 끼우지 마라 — `resolution.choice` 로 저장된다)
 *   ② `RESOLUTION_OUTCOME` 에 한 줄 ③ **이 표에 한 줄**  ← ①만 하면 여기서 타입 검사가 막는다
 *   ④ `test/api-routes.test.ts` 의 「선택이 항목을 바꾼다」가 그 줄을 요구한다
 *   라우트는 고칠 것이 없다 — 이 표를 읽기만 한다.
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
 *   `CONFLICT_KIND_RULES`(종류)다. 라우트에서 둘을 이으면 종류나 선택이 늘 때
 *   그 조립을 다시 찾아야 한다.
 *
 * ⚠ `anchor` 가 `items` 가 아닌 종류(원문 구간·아무것도 없음)는 바꿀 항목이 **없다.**
 *   `a_ref` 에서 항목을 추측하지 마라 — `SourceRef` 는 원문까지 가는 사슬이지
 *   항목을 가리키는 이름이 아니다. 추측하면 **엉뚱한 항목을 폐기한다.**
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
 * 폐기된 항목의 개정에 남는 근거 한 줄 (`{kind:'manual', note}` · P7).
 *
 * ★ 왜 충돌 id 만 싣나 — 사람이 적은 `resolution.note` 는 길이가 제멋대로라
 *   여기 이어 붙이면 상한(200자)에서 **잘린다.** 근거가 잘리는 것은 근거가 없는 것과
 *   같다. 충돌 id 를 실으면 그 행에 질문·선택·사람·시각이 **전부 그대로** 있다.
 * ⚠ 조사(助詞)를 쓰지 않는다 — id 는 끝 글자가 매번 달라서 「을/를」이 갈린다
 *   (`conflict-card.tsx` 와 같은 판단).
 */
export function resolutionNote(conflictId: string, choice: ConflictChoice): string {
  return `충돌 정리 — ${conflictId} · 선택 ${choice}`
}

/**
 * 충돌 한 장을 돌려줄 때 읽는 칸 전부.
 *
 * ⚠ **어느 칸이 비어 있는가는 `kind` 가 정한다** (`CONFLICT_KIND_RULES` 의 `anchor`).
 *   `anchor:'items'` 면 `a_item_id`/`b_item_id` 가 차고 `a_ref`/`b_ref` 가 비고,
 *   `anchor:'document'` 면 반대다. 화면은 그 표를 읽어 무엇을 그릴지 고른다 —
 *   여기서 한쪽으로 접지 마라. 접으면 화면이 근거로 가는 길을 잃는다 (P7).
 *   그 규칙은 DB CHECK 이 강제한다 (`db/schema.ts` 의 `conflictShapeCheck()`).
 */
export const CONFLICT_COLUMNS = {
  id: conflicts.id,
  project_id: conflicts.projectId,
  kind: conflicts.kind,
  a_item_id: conflicts.aItemId,
  b_item_id: conflicts.bItemId,
  a_ref: conflicts.aRef,
  b_ref: conflicts.bRef,
  question: conflicts.question,
  severity: conflicts.severity,
  status: conflicts.status,
  resolution: conflicts.resolution,
  resolved_at: conflicts.resolvedAt,
} as const

type ConflictRow = {
  id: string
  project_id: string
  kind: ConflictKind
  a_item_id: string | null
  b_item_id: string | null
  a_ref: SourceRef | null
  b_ref: SourceRef | null
  question: string
  severity: ConflictSeverity | null
  status: ConflictStatus
  resolution: { choice: ConflictChoice; note?: string } | null
  resolved_at: Date | null
}

/** 응답 모양을 한 자리에서 만든다 — 충돌을 돌려주는 라우트가 셋이다. */
export function toConflict(row: ConflictRow) {
  return {
    id: row.id,
    project_id: row.project_id,
    kind: row.kind,
    a_item_id: row.a_item_id,
    b_item_id: row.b_item_id,
    a_ref: row.a_ref,
    b_ref: row.b_ref,
    question: row.question,
    severity: row.severity,
    status: row.status,
    resolution: row.resolution,
    resolved_at: row.resolved_at === null ? null : row.resolved_at.toISOString(),
  }
}

/**
 * 🔴 **충돌 한 장을 행으로 만드는 유일한 문.** 어느 칸이 차고 어느 칸이 비는지는
 * 부르는 쪽이 아니라 `CONFLICT_KIND_RULES` 가 정한다.
 *
 * ★ 왜 문이 필요한가 — 충돌 행을 만드는 자리는 셋이다 (§7.1 의 `open_questions` ·
 *   §7.2 의 탐지 · 사람이 직접 적는 질문). 자리마다 `kind === 'open_question' ? …`
 *   을 적으면 종류가 늘 때 세 곳을 찾아야 하고, 하나만 빠뜨리면 **반쪽짜리 행**이
 *   들어온다 — 화면에는 「충돌 1건」으로 멀쩡히 뜨고 눌렀을 때 가리킬 것이 없다.
 *
 * ⚠ 이 함수는 표가 「안 쓴다」고 한 칸을 **조용히 null 로 만든다.** 마지막 판정은
 *   여전히 DB CHECK 이다 (`db/schema.ts` 의 `conflictShapeCheck()`) — 표가 「써야
 *   한다」고 한 칸을 안 주면 INSERT 가 거부된다. 여기서 대신 채워 주지 않는다.
 */
export function conflictRow(input: {
  projectId: string
  kind: ConflictKind
  question: string
  aItemId?: string | null
  bItemId?: string | null
  aRef?: SourceRef | null
  bRef?: SourceRef | null
  severity?: ConflictSeverity | null
}) {
  const rule = CONFLICT_KIND_RULES[input.kind]
  const items = rule.anchor === 'items'
  const document = rule.anchor === 'document'
  return {
    projectId: input.projectId,
    kind: input.kind,
    question: input.question,
    aItemId: items ? input.aItemId ?? null : null,
    bItemId: items && rule.needsB ? input.bItemId ?? null : null,
    aRef: document ? input.aRef ?? null : null,
    bRef: document && rule.needsB ? input.bRef ?? null : null,
    severity: rule.detected ? input.severity ?? null : null,
  }
}
