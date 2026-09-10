import { ITEM_TYPES, type ItemType } from '@contextops/schema'
import { describe, expect, it } from 'vitest'

import { ITEM_GIST, itemGist } from '../src/lib/web/item-gist'

// =====================================================================
//  항목 타입 10종의 「한 줄」이 전부 실제로 무언가를 낸다 (2026-09-10 저녁)
//  ★ 왜 — 표에 줄은 있는데 빈 문자열을 내면 화면은 멀쩡히 뜨고 아무도 모른다 (CLAUDE.md 「정의만 있고 아무 일도 안 하는 코드」).
// =====================================================================

/** 타입마다 계약(`ITEM_DATA`)을 만족하는 가장 작은 값. 스키마가 바뀌면 여기가 먼저 빨개진다. */
const SAMPLE: Record<ItemType, unknown> = {
  mission: { statement: '결제가 흔들리지 않는 팀' },
  goal: { outcome: '결제 성공률 99.9%', metric: '월간 성공률' },
  roadmap: { milestone_id: 'PL-M1', paths: [], done_when: ['재시도가 한 곳에만 있다'], dependencies: [] },
  architecture: { component: '결제 요청 처리', responsibility: '승인 요청을 받아 결제사에 넘긴다', paths: [] },
  domain: { name: '결제', glossary: [{ term: 'PSP', meaning: '결제사' }], invariants: [] },
  policy: { rule: 'PSP 호출은 최대 5회까지 재시도한다', severity: 'must', enforcement: 'review' },
  adr: { decision: '지수 백오프를 쓴다', context: '고정 간격은 같은 순간에 몰린다', consequences: '재시도가 퍼진다', adr_status: 'accepted' },
  workflow: { trigger: '배포 전', steps: ['검사를 돌린다'], done_when: [] },
  constraint: { statement: '카드 정보를 저장하지 않는다' },
  open_question: { question: '환불 기한은 언제까지인가' },
}

describe('항목 타입 10종의 한 줄', () => {
  it('표의 키가 ItemType 전부이고, 하나도 빈 줄을 내지 않는다', () => {
    expect(Object.keys(ITEM_GIST).sort()).toEqual([...ITEM_TYPES].sort())
    for (const type of ITEM_TYPES) {
      const gist = itemGist({ type, data: SAMPLE[type] } as Parameters<typeof itemGist>[0])
      expect(gist.trim().length, type).toBeGreaterThan(0)
    }
  })

  it('정책은 rule 그대로 · 제약은 statement 그대로 — 부딪히는 문장이 곧 한 줄이다', () => {
    expect(itemGist({ type: 'policy', data: SAMPLE.policy } as Parameters<typeof itemGist>[0])).toBe('PSP 호출은 최대 5회까지 재시도한다')
    expect(itemGist({ type: 'constraint', data: SAMPLE.constraint } as Parameters<typeof itemGist>[0])).toBe('카드 정보를 저장하지 않는다')
  })

  it('없는 값은 적지 않는다 — metric 없는 목표는 outcome 만', () => {
    expect(itemGist({ type: 'goal', data: { outcome: '성공률 99.9%' } } as Parameters<typeof itemGist>[0])).toBe('성공률 99.9%')
  })
})
