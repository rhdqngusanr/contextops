import { CONFLICT_KIND_RULES } from '@contextops/schema'
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
