import { describe, expect, it } from 'vitest'
import {
  ANSWER_SLOT_MODES, CONFLICT_KINDS, CONFLICT_KIND_RULES, DETECTED_CONFLICT_KINDS, QUESTION_CONFLICT_KINDS,
} from '../src/api'
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

describe('🔴 충돌 종류 표의 두 축이 갈라지지 않는다 (FINDINGS 105)', () => {
  //  ★ 왜 재나 — `answerSlot` 은 `detected` 와 **다른 것을 말하는 축**이지만, 지금은
  //    「탐지가 낸 것 = 답이 아니라 선택으로 정리하는 것」이 참이다. 그 둘이 조용히
  //    갈라지면 라우트는 답을 받는데 화면은 답 칸을 안 그리는(또는 그 반대) 종류가 생긴다.
  //  ⚠ 여기가 빨개졌다면 표가 틀린 게 아니라 **뜻이 바뀐 것**일 수 있다 —
  //    그때는 이 시험을 고치기 전에 `QUESTION_CONFLICT_KINDS` 의 파생 규칙을 다시 봐라.
  it('`answerSlot: none` 인 줄이 곧 탐지 종류다', () => {
    const none = CONFLICT_KINDS.filter((k) => CONFLICT_KIND_RULES[k].answerSlot === 'none')
    expect(none).toEqual([...DETECTED_CONFLICT_KINDS])
  })

  it('사람에게 묻는 종류는 전부 답이 갈 자리를 말한다', () => {
    for (const kind of QUESTION_CONFLICT_KINDS) {
      expect(['seeded', 'ask'], kind).toContain(CONFLICT_KIND_RULES[kind].answerSlot)
    }
  })

  //  🔴 값 목록의 정본은 `ANSWER_SLOT_MODES` 다 (FINDINGS 108) — 표의 모든 줄이 그 안에 있고,
  //     목록의 세 값이 전부 표에 **쓰인다.** 안 쓰이는 값은 라우트 표에 줄만 남긴다.
  it('표의 `answerSlot` 은 전부 `ANSWER_SLOT_MODES` 안이고, 세 값이 다 쓰인다', () => {
    expect(ANSWER_SLOT_MODES).toEqual(['seeded', 'ask', 'none'])
    const used = new Set(CONFLICT_KINDS.map((k) => CONFLICT_KIND_RULES[k].answerSlot))
    expect(used).toEqual(new Set(ANSWER_SLOT_MODES))
  })

  //  🔴 두 값이 **둘 다 살아 있어야** 한다 — 하나만 쓰이면 그 축은 이름만 남는다.
  it('`seeded` 와 `ask` 가 각각 적어도 한 줄씩 있다', () => {
    const slots = QUESTION_CONFLICT_KINDS.map((k) => CONFLICT_KIND_RULES[k].answerSlot)
    expect(slots).toContain('seeded')
    expect(slots).toContain('ask')
  })
})
