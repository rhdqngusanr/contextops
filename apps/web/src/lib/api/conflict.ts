import type {
  ConflictChoice, ConflictKind, ConflictSeverity, ConflictStatus, SourceRef,
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
