import { describe, expect, it } from 'vitest'
import { ITEM_TYPES, type ItemType } from '../src/common'
import { ContextItem, ContextItemDraft, ITEM_DATA, parseContextItem } from '../src/item'
import { ALL_TYPES, SAMPLE_DATA, sampleDraft, sampleItem } from './fixtures'

// =====================================================================
//  ItemType 10종이 **전부 실제로 뭔가를 바꾼다**를 잠근다 (loop/PROMPT.md ④2-B).
//  타입은 10종인데 8종을 아무도 안 읽는 고장은 눈으로 절대 안 잡힌다.
// =====================================================================

describe('ItemType 표', () => {
  it('ITEM_TYPES 는 10종이고 ITEM_DATA·표본이 같은 키를 같은 순서로 덮는다', () => {
    expect(ITEM_TYPES).toHaveLength(10)
    expect(Object.keys(ITEM_DATA)).toEqual([...ITEM_TYPES])
    expect(Object.keys(SAMPLE_DATA)).toEqual([...ITEM_TYPES])
  })

  it('10종이 전부 파싱된다', () => {
    for (const type of ALL_TYPES) {
      const item = parseContextItem(sampleItem(type))
      expect(item.type).toBe(type)
    }
  })

  // 🔴 여기가 핵심이다. 표의 한 줄을 지우거나 두 타입이 같은 data 를 쓰면 빨개진다.
  it('한 타입의 data 는 **그 타입에서만** 통과한다 (표의 줄마다 결과가 갈린다)', () => {
    const accepted: Record<string, ItemType[]> = {}
    for (const owner of ALL_TYPES) {
      accepted[owner] = ALL_TYPES.filter(
        (candidate) => ContextItem.safeParse({ ...sampleItem(owner), type: candidate }).success,
      )
    }
    for (const owner of ALL_TYPES) {
      expect({ [owner]: accepted[owner] }).toEqual({ [owner]: [owner] })
    }
  })

  it('data 에 모르는 키가 있으면 거부한다 (P1 — 통로를 열어 두지 않는다)', () => {
    const bad = sampleItem('goal')
    bad['data'] = { ...SAMPLE_DATA.goal, file_content: 'export const x = 1' }
    expect(ContextItem.safeParse(bad).success).toBe(false)
  })

  it('항목 최상위에 모르는 키가 있으면 거부한다', () => {
    expect(ContextItem.safeParse({ ...sampleItem('goal'), snippet: 'raw code' }).success).toBe(false)
  })

  it('body 2000자 초과는 거부한다 (SPEC §3.1)', () => {
    expect(ContextItem.safeParse({ ...sampleItem('goal'), body: 'x'.repeat(2001) }).success).toBe(false)
    expect(ContextItem.safeParse({ ...sampleItem('goal'), body: 'x'.repeat(2000) }).success).toBe(true)
  })

  it('source_refs 가 비면 거부한다 (P7 — 근거 없는 항목은 없다)', () => {
    expect(ContextItem.safeParse({ ...sampleItem('goal'), source_refs: [] }).success).toBe(false)
  })
})

describe('ContextItemDraft', () => {
  it('10종 전부 파싱된다', () => {
    for (const type of ALL_TYPES) {
      expect(ContextItemDraft.safeParse(sampleDraft(type)).success).toBe(true)
    }
  })

  // ★ 초안이 status·revision·project_id 를 실어 보낼 수 있으면 승인 없이 공식 항목이 된다.
  it.each(['project_id', 'status', 'revision'] as const)('초안은 서버가 매기는 %s 를 거부한다', (field) => {
    const withServerField = { ...sampleDraft('goal'), [field]: field === 'revision' ? 9 : 'active' }
    expect(ContextItemDraft.safeParse(withServerField).success).toBe(false)
  })
})
