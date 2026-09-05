import { type MilestoneStatus, type ProgressStatus } from '@contextops/schema'

import { progressEvents } from '../../db/schema'

// =====================================================================
//  진행 보고 → 마일스톤 상태 (SPEC §5 roadmap · §4.3 · 원칙 P5)
//
//  🔴 **P5 의 자리다.** 여기서 나오는 것은 언제나 **마일스톤의 상태**다.
//    사람·기기별 집계를 여기 더하지 마라 — 그 순간 이 제품은 감시 도구가 되고,
//    그건 기능이 하나 늘어난 게 아니라 **아무도 안 쓰게 되는 것**이다.
// =====================================================================

export const PROGRESS_COLUMNS = {
  id: progressEvents.id,
  project_id: progressEvents.projectId,
  device_id: progressEvents.deviceId,
  milestone_id: progressEvents.milestoneId,
  criterion: progressEvents.criterion,
  status: progressEvents.status,
  evidence: progressEvents.evidence,
  summary: progressEvents.summary,
  context_version: progressEvents.contextVersion,
  source: progressEvents.source,
  confirmed_by: progressEvents.confirmedBy,
  confirmed_at: progressEvents.confirmedAt,
  client_event_id: progressEvents.clientEventId,
  created_at: progressEvents.createdAt,
} as const

type ProgressRow = { [K in keyof typeof PROGRESS_COLUMNS]: unknown }

export function toProgressEvent(row: ProgressRow): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const key of ['confirmed_at', 'created_at']) {
    const value = out[key]
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

//  ⚠ 마일스톤 상태 4종(`MILESTONE_STATUSES`)은 **`packages/schema` 가 정본**이다 —
//    화면 8 이 그 값마다 칩을 그리면서 둘째 사용자가 생겼다. 여기서 다시 적지 마라.

/**
 * 화면 8 하단 「로드맵 외 작업」이 한 번에 싣는 보고의 상한 (SPEC §5 roadmap).
 *
 * ★ 왜 상수인가 — 이 목록의 길이는 **agent 가 정한다**(`POST /progress` 를 부르는 것이
 *   Stop 훅과 agent 다). 상한이 없으면 응답이 보고 수만큼 커지고, 그 화면은 10초마다
 *   자신을 다시 읽는다 (`REALTIME_POLL_MS`).
 * ⚠ 화면에 숫자를 또 적지 마라 — 잘렸는지는 서버가 `off_roadmap_total` 로 말한다.
 */
export const OFF_ROADMAP_MAX = 20

/**
 * 🔴 **진행 보고 상태 4종이 마일스톤 상태로 어떻게 접히나**의 정본 표
 *   (`PROGRESS_STATUSES` — FINDINGS 13 이 「아무것도 안 바꾼다」고 적은 그 넷이다).
 *
 * | 보고 | 마일스톤에 미치는 것 |
 * |---|---|
 * | `in_progress`   | 「손을 대고 있다」 — `in_progress` |
 * | `criterion_done`| 완료 조건 하나가 끝났다 — `in_progress` (전부 끝나야 done 이다) |
 * | `done_candidate`| 「다 된 것 같다」 — 사람이 확정하기 전까지 `done_candidate` |
 * | `none`          | 이 작업은 어느 마일스톤도 아니다 — **아무것도 바꾸지 않는다** |
 *
 * ★ `done` 은 이 표에 없다. **보고로는 done 이 될 수 없기 때문이다** — `done_candidate`
 *   를 owner 가 `POST /progress/{id}/confirm` 으로 확정해야 done 이다 (SPEC §5).
 *   그게 「agent 가 스스로 완료를 선언하지 못한다」는 이 제품의 약속이다.
 *
 * ★ 새 진행 상태를 더하는 절차: ① `packages/schema` 의 `PROGRESS_STATUSES` 끝에
 *   ② `db/schema.ts` 의 pgEnum 은 그 표를 읽으므로 자동 ③ 이 표에 한 줄
 *   ← ①만 하면 여기서 타입 검사가 막힌다 ④ `test/progress-rollup.test.ts` 에 한 줄.
 */
export const PROGRESS_EFFECT: Record<ProgressStatus, MilestoneStatus | undefined> = {
  in_progress: 'in_progress',
  criterion_done: 'in_progress',
  done_candidate: 'done_candidate',
  none: undefined,
}

/** 센 상태일수록 큰 값. 여러 보고가 섞이면 **제일 센 것**이 마일스톤의 상태다. */
const RANK: Record<MilestoneStatus, number> = {
  not_started: 0,
  in_progress: 1,
  done_candidate: 2,
  done: 3,
}

/**
 * 마일스톤 하나의 상태를 접는다.
 * ⚠ `confirmed` 는 보고가 아니라 **사람의 확정**이라 표 밖에서 이긴다 — 무조건 `done`.
 */
export function rollupMilestone(
  events: readonly { status: ProgressStatus; confirmedAt: Date | null }[],
): MilestoneStatus {
  let best: MilestoneStatus = 'not_started'
  for (const e of events) {
    const effect = e.confirmedAt !== null ? 'done' : PROGRESS_EFFECT[e.status]
    if (effect && RANK[effect] > RANK[best]) best = effect
  }
  return best
}
