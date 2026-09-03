import { describe, expect, it } from 'vitest'
import { CONFIDENCE_LEVELS, ITEM_STATUSES, SCOPE_KINDS, Scope } from '../src/common'
import { ContextItem, PolicyData } from '../src/item'
import { sampleItem } from './fixtures'

describe('scope.kind 3종 (SPEC §3 · 컴파일러 partition 이 이 값으로 갈린다)', () => {
  it('3종이다', () => {
    expect(SCOPE_KINDS).toEqual(['project', 'domain', 'path'])
  })

  it('project 는 value 가 없어도 되고, domain·path 는 있어야 한다', () => {
    expect(Scope.safeParse({ kind: 'project' }).success).toBe(true)
    for (const kind of ['domain', 'path'] as const) {
      expect(Scope.safeParse({ kind }).success).toBe(false)
      expect(Scope.safeParse({ kind, value: 'payment' }).success).toBe(true)
    }
  })

  it('모르는 kind 는 거부한다', () => {
    expect(Scope.safeParse({ kind: 'repo', value: 'x' }).success).toBe(false)
  })
})

describe('그 밖의 enum — 값이 늘거나 줄면 여기서 빨개진다', () => {
  // ⚠ 아래 셋은 **아직 결과를 바꾸지 않는다.** 소비처는 컴파일러(§4.1)와 화면이다.
  //   docs/feedback/FINDINGS.md 에 「배선하거나 지운다」로 올려 두었다.
  //   여기서 재는 것은 「값의 목록이 조용히 갈라지지 않는가」까지다.
  it('항목 상태 4종 · confidence 3단계 · enforcement 4종', () => {
    expect(ITEM_STATUSES).toEqual(['draft', 'review', 'active', 'deprecated'])
    expect(CONFIDENCE_LEVELS).toEqual(['high', 'medium', 'low'])
    expect(PolicyData.shape.enforcement.def.innerType.options)
      .toEqual(['hook', 'review', 'permission', 'none'])
  })

  it.each(CONFIDENCE_LEVELS)('confidence %s 가 통과한다', (confidence) => {
    expect(ContextItem.safeParse({ ...sampleItem('goal'), confidence }).success).toBe(true)
  })

  it.each(ITEM_STATUSES)('상태 %s 가 통과한다', (status) => {
    expect(ContextItem.safeParse({ ...sampleItem('goal'), status }).success).toBe(true)
  })

  it('목록에 없는 값은 거부한다', () => {
    expect(ContextItem.safeParse({ ...sampleItem('goal'), confidence: 'certain' }).success).toBe(false)
    expect(ContextItem.safeParse({ ...sampleItem('goal'), status: 'published' }).success).toBe(false)
  })
})
