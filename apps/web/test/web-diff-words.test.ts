import { PROPOSAL_STATUSES } from '@contextops/schema'
import { describe, expect, it } from 'vitest'

import { PROPOSAL_STATUS_SENTENCE } from '../src/components/proposals'
import { wordDiff } from '../src/lib/web/diff'

describe('낱말 단위 diff (2026-09-11)', () => {
  it('덧붙은 낱말만 add, 빠진 낱말만 del — 공백은 조각으로 남고 같은 표시는 합쳐진다', () => {
    const pieces = wordDiff('카드 원본 정보를 저장하지 않는다 — 토큰만 받는다.', '카드 원본 정보를 저장하지 않는다 — 토큰만 받는다. 받은 토큰은 90일까지만 보관한다.')
    expect(pieces.filter((p) => p.mark === 'del')).toEqual([])
    const added = pieces.filter((p) => p.mark === 'add').map((p) => p.text).join('')
    expect(added).toBe(' 받은 토큰은 90일까지만 보관한다.')
    expect(pieces.map((p) => p.text).join('')).toBe('카드 원본 정보를 저장하지 않는다 — 토큰만 받는다. 받은 토큰은 90일까지만 보관한다.')
  })

  it('같은 문장은 전부 same · 빈 문장은 전부 add/del', () => {
    expect(wordDiff('같다', '같다')).toEqual([{ mark: 'same', text: '같다' }])
    expect(wordDiff('', '새 문장')).toEqual([{ mark: 'add', text: '새 문장' }])
    expect(wordDiff('옛 문장', '')).toEqual([{ mark: 'del', text: '옛 문장' }])
  })

  it('바뀐 낱말은 del 뒤에 add — 사람이 「무엇이 빠지고 무엇이 들어왔나」로 읽는 차례', () => {
    const marks = wordDiff('재시도는 3회까지', '재시도는 5회까지').map((p) => p.mark)
    expect(marks).toEqual(['same', 'del', 'add'])
  })
})

describe('제안 상태 5종의 「이제 무슨 일이 나나」 한 문장', () => {
  it('키가 enum 과 같고 전부 사람 말이다', () => {
    expect(Object.keys(PROPOSAL_STATUS_SENTENCE).sort()).toEqual([...PROPOSAL_STATUSES].sort())
    for (const st of PROPOSAL_STATUSES) expect(PROPOSAL_STATUS_SENTENCE[st], st).toMatch(/[가-힣]/)
    //  올리기 전 둘은 다음 걸음의 버튼 이름을 말한다.
    expect(PROPOSAL_STATUS_SENTENCE.draft).toContain('[승인 요청]')
    expect(PROPOSAL_STATUS_SENTENCE.submitted).toContain('[모두 승인]')
  })
})
