import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ITEM_STATUS_CHIP, MILESTONE_CHIP, PROPOSAL_STATUS_CHIP, SYNC_CHIP } from '../src/components/chips'
import { FactLine, factText, itemsFact, proposalFact, roadmapFact, syncFact } from '../src/components/fact-line'

// =====================================================================
//  사실 한 줄 — 수를 세고, 0 인 상태는 적지 않고, 낱말은 칩 표에서 온다 (2026-09-11)
// =====================================================================

describe('사실 한 줄', () => {
  it('Sync — 전체와 「적용됨」 수가 굵고, 낱말은 칩 표에서 오고, 0 인 상태는 안 적는다', () => {
    const parts = syncFact(['applied', 'applied', 'outdated', 'unknown'])
    const text = factText(parts)
    expect(text).toBe(`기기 4대 중 2대가 「${SYNC_CHIP.applied.label}」입니다 — 공식 판이 그대로 들어가 있습니다. ${SYNC_CHIP.outdated.label} 1대 · ${SYNC_CHIP.unknown.label} 1대.`)
    expect(text).not.toContain('최신 판')
    expect(text).not.toContain(SYNC_CHIP.modified.label)
    expect(parts.filter((p) => typeof p !== 'string').map((p) => (p as { strong: string }).strong)).toEqual(['4대', '2대'])
    expect(factText(syncFact([]))).toContain('없습니다')
  })

  it('Roadmap — 상태별 수와 완료 조건의 근거 수', () => {
    const text = factText(roadmapFact(['done_candidate', 'in_progress', 'not_started'], { with: 3, total: 9 }))
    expect(text).toBe(`마일스톤 3개 — ${MILESTONE_CHIP.not_started.label} 1 · ${MILESTONE_CHIP.in_progress.label} 1 · ${MILESTONE_CHIP.done_candidate.label} 1. 완료 조건 9개 중 3개에 근거가 붙었습니다.`)
    expect(factText(roadmapFact([], { with: 0, total: 0 }))).toContain('없습니다')
  })

  it('제안 — 승인 대기가 있을 때만 「팀장이 볼 것」을 말한다', () => {
    const withWait = factText(proposalFact(['submitted', 'published', 'draft']))
    expect(withWait).toContain(`${PROPOSAL_STATUS_CHIP.submitted.label} 1`)
    expect(withWait).toContain('팀장이 볼 것은')
    const noWait = factText(proposalFact(['published', 'rejected']))
    expect(noWait).not.toContain('팀장이 볼 것은')
  })

  it('Context — 발행에 들어가는 수는 「적용 중」의 수다', () => {
    const text = factText(itemsFact(['active', 'active', 'draft', 'review']))
    expect(text).toContain('항목 4개')
    expect(text).toContain(`「${ITEM_STATUS_CHIP.active.label}」 2개`)
    expect(text).toContain(`${ITEM_STATUS_CHIP.review.label} 1`)
  })

  it('조각은 굵은 수를 <b> 로 그린다', () => {
    const html = renderToStaticMarkup(createElement(FactLine, { parts: syncFact(['applied']) }))
    expect(html).toContain('class="fact-line"')
    expect(html).toContain('<b>1대</b>')
  })
})
