import type {
  ConflictChoice, ConflictKind, ConflictSeverity, ConflictStatus, SourceRef,
} from '@contextops/schema'
import { CONFLICT_KIND_RULES, MANUAL_NOTE_MAX } from '@contextops/schema'

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

/*
 *  ⚠ `RESOLUTION_ITEM_OUTCOME`(선택 → 진 쪽 항목의 다음 상태)과 `itemOutcomeOf()` 는
 *     **`packages/schema` 로 올라갔다.** 화면 4 가 같은 표를 읽어 「이 버튼을 누르면
 *     무엇이 일어나나」를 말하게 됐고 (FINDINGS 74), 화면이 `lib/api/*` 를 import 하면
 *     의존 방향이 깨진다 (`schema ← compiler ← web/plugin`). 사용자가 둘이 된 표는
 *     정본으로 올린다 — 위 `RESOLUTION_OUTCOME`(선택 → **충돌** 상태)은 서버만 쓰므로
 *     여기 남는다.
 */

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
 * 🔴 **질문에 답해서 만들어진 항목이 그 질문과 이어지는 근거 한 줄** (P7 · FINDINGS 56).
 *
 * ★ 왜 필요한가 — 답변으로 항목이 생기는 길은 둘인데(씨앗 질문 · 초안을 실어 보내는
 *   열린 질문) **뒤의 길은 근거를 부르는 쪽이 통째로 정했다.** 그 항목의 Pack 줄에서
 *   「이 문장은 어디서 왔나」를 물으면 사람이 답한 질문 카드로 갈 길이 없었다.
 *   지금은 서버가 이 한 줄을 붙여서 **어느 길로 왔든 질문까지 간다.**
 *
 * 🔴 **질문의 `a_ref`(원문 구간)를 물려주지 마라** — FINDINGS 56 이 그 길을 ①로 적었지만
 *   그건 §7.1 이 문서를 읽다 **질문을 남긴 자리**이지 답이 적혀 있던 자리가 아니다.
 *   사람이 머리로 쓴 문장에 문서 구간을 근거로 달면 **원문에 없는 문장이 원문을 근거로
 *   배포된다** — SPEC §5 `AcceptJobItems` 가 「본문을 같이 받지 않는」 이유와 같은 고장이다.
 *   답의 출처는 **그 질문에 답한 사람**이고, 질문·답·누가·언제는 충돌 행에 전부 남는다.
 *
 * ⚠ 문장이 상한을 넘으면 **머리를 남기고 자른다** (`…`). 자르는 것이 안전한 이유는
 *   이 note 가 근거 **자체**가 아니라 질문 카드를 가리키는 말이기 때문이다 — 전문과
 *   답변은 `conflicts` 행에 그대로 있다. 씨앗 질문 10장은 상한 안이라 안 잘린다
 *   (`test/api-seed-questions.test.ts` 가 잰다).
 */
export function questionRef(question: string): SourceRef {
  const note = question.length <= MANUAL_NOTE_MAX ? question : `${question.slice(0, MANUAL_NOTE_MAX - 1)}…`
  return { kind: 'manual', note }
}

/** 같은 근거가 이미 있나 — `appendSourceRef` 에 준다. 두 벌이 되면 태그만 길어진다. */
export function sameQuestionRef(ref: SourceRef): (r: SourceRef) => boolean {
  return (r) => r.kind === 'manual' && ref.kind === 'manual' && r.note === ref.note
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
