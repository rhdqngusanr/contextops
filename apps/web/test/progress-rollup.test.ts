import { describe, expect, it } from 'vitest'
import { PROGRESS_STATUSES, type ProgressStatus } from '@contextops/schema'

import { MILESTONE_STATUSES, PROGRESS_EFFECT, rollupMilestone } from '../src/lib/api/progress'

// =====================================================================
//  🔴 진행 상태 4종이 **정의만 있고 아무 일도 안 하는** 자리가 되지 않게 잠근다
//     (docs/feedback/FINDINGS.md 13번 · loop/PROMPT.md ④2-B)
//
//  ⚠ 「4종이 전부 파싱을 통과한다」는 아무것도 증명하지 않는다. 여기서 재는 것은
//    **값을 바꾸면 결과가 갈리는가**다 — 그래서 검사가 전부 「A 와 B 가 다르다」 꼴이다.
// =====================================================================

const ONE = (status: ProgressStatus, confirmed = false) =>
  [{ status, confirmedAt: confirmed ? new Date('2026-09-03T00:00:00.000Z') : null }]

describe('보고 상태 → 마일스톤 상태 표가 전부 살아 있다', () => {
  it('표의 키가 정본 목록과 정확히 같다 — 하나 더하면 여기서 막힌다', () => {
    expect(Object.keys(PROGRESS_EFFECT).sort()).toEqual([...PROGRESS_STATUSES].sort())
  })

  it.each(PROGRESS_STATUSES)('%s 는 표가 말한 대로 접힌다', (status) => {
    const expected = PROGRESS_EFFECT[status] ?? 'not_started'
    expect(rollupMilestone(ONE(status))).toBe(expected)
  })

  it('네 값이 같은 결과로 뭉개지지 않는다 — 셋은 서로 다른 상태를 낸다', () => {
    const results = PROGRESS_STATUSES.map((s) => rollupMilestone(ONE(s)))
    //  in_progress·criterion_done → in_progress · done_candidate → done_candidate ·
    //  none → not_started. 세 갈래가 나와야 이 표가 무언가를 하는 것이다.
    expect(new Set(results).size).toBe(3)
  })

  it('🔴 보고만으로는 done 이 되지 않는다 — 사람의 확정이 있어야 한다', () => {
    expect(rollupMilestone(ONE('done_candidate'))).toBe('done_candidate')
    expect(rollupMilestone(ONE('done_candidate', true))).toBe('done')
    //  표 어디에도 `done` 이 없다는 것이 그 약속의 자리다.
    expect(Object.values(PROGRESS_EFFECT)).not.toContain('done')
  })

  it('여러 보고가 섞이면 제일 센 것이 이긴다', () => {
    expect(rollupMilestone([
      ...ONE('in_progress'),
      ...ONE('done_candidate'),
      ...ONE('none'),
    ])).toBe('done_candidate')
  })

  it('보고가 하나도 없으면 not_started 다', () => {
    expect(rollupMilestone([])).toBe('not_started')
    expect(MILESTONE_STATUSES).toContain('not_started')
  })
})
