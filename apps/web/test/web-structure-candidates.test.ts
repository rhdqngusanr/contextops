import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ITEM_TYPES } from '@contextops/schema'

import { ITEM_TYPE_ICON } from '../src/components/chips'
import {
  StructureCandidates, type StructureCandidate, type StructureCandidatesState,
} from '../src/components/structure-candidates'
import { structureCandidates } from '../src/lib/web/queries'

// =====================================================================
//  🔴 **AI 결과 카드가 사람의 선택 버튼으로 끝난다** (DESIGN_BRIEF §2-4 · FINDINGS 84)
//
//  ★ 왜 이 파일이 생겼나 — 구조화가 끝나면 화면이 「✓ 항목 후보 6개를 찾았습니다」라고
//    말하고 [Context 보기] 로 보냈는데, **Context 는 비어 있었다.** 후보를 받아들이는
//    문이 서버에도 화면에도 0곳이었다.
//
//  재는 것 — 앞의 둘만으로는 아무것도 증명하지 않는다:
//    ① job 의 `result` 에서 후보를 꺼내는 함수가 **모양이 다른 것을 안 만든다**
//    ② 고른 수가 버튼에 따라오고, 0개면 버튼이 잠긴다
//    🔴 ③ 만든 뒤 문구가 **「승인」이 아니라 「초안」**이라고 말한다 — 여기서 「발행됐다」로
//       읽히면 사람은 Context 화면의 승인을 건너뛰고 자기 규칙이 안 나간 Pack 을 받는다
// =====================================================================

const CANDIDATES: StructureCandidate[] = [
  { id: 'item_doc_retry', type: 'policy', title: '재시도 정책' },
  { id: 'item_doc_card', type: 'constraint', title: '카드 원본 금지' },
]

function render(over: Partial<StructureCandidatesState> = {}): string {
  const state: StructureCandidatesState = {
    candidates: CANDIDATES,
    picked: new Set(CANDIDATES.map((c) => c.id)),
    saving: false,
    error: null,
    made: null,
    ...over,
  }
  return renderToStaticMarkup(createElement(StructureCandidates, {
    state, base: '/t/paylab/p/api', onToggle: () => {}, onAccept: () => {},
  }))
}

describe('🔴 후보를 꺼내는 함수는 모양이 다른 것을 만들지 않는다', () => {
  it('`items` 가 없거나 배열이 아니면 빈 목록이다 — 지어낸 줄이 화면에 없다', () => {
    expect(structureCandidates(null)).toEqual([])
    expect(structureCandidates({})).toEqual([])
    expect(structureCandidates({ items: 'nope' })).toEqual([])
  })

  it('표에 없는 타입·모양이 어긋난 줄은 **건너뛴다** — 하나 때문에 문서가 막히지 않는다', () => {
    const out = structureCandidates({
      items: [
        { id: 'item_ok_one', type: 'policy', title: '괜찮은 줄' },
        { id: 'item_bad_type', type: 'not_a_type', title: '표에 없는 타입' },
        { id: 'item_no_title', type: 'policy' },
        null,
      ],
    })
    expect(out).toEqual([{ id: 'item_ok_one', type: 'policy', title: '괜찮은 줄' }])
  })

  it('ItemType 10종이 전부 지나간다 — 한 종류가 조용히 빠지면 그 항목은 못 고른다', () => {
    const items = ITEM_TYPES.map((type, i) => ({ id: `item_t_${i}`, type, title: type }))
    expect(structureCandidates({ items }).map((c) => c.type)).toEqual([...ITEM_TYPES])
  })
})

describe('🔴 고른 수가 버튼에 따라온다', () => {
  it('기본(전부 선택)이면 후보 수가 버튼에 그대로 나온다', () => {
    expect(render()).toContain(`고른 ${CANDIDATES.length}개를 항목으로 만들기`)
  })

  it('하나를 빼면 버튼의 수가 준다 — 화면이 따로 세지 않는다', () => {
    expect(render({ picked: new Set(['item_doc_retry']) })).toContain('고른 1개를 항목으로 만들기')
  })

  it('하나도 안 고르면 버튼이 잠긴다 — 빈 요청은 400 이라 눌러도 소용없다', () => {
    expect(render({ picked: new Set() })).toContain('disabled')
  })

  it('만드는 중에는 잠긴다 — 두 번 누르면 둘째는 「이미 있다」로 전부 거절된다', () => {
    const html = render({ saving: true })
    expect(html).toContain('만드는 중…')
    expect(html).toContain('disabled')
  })

  it('타입 아이콘과 **타입 이름**이 같이 나간다 — 색·기호만으로 말하지 않는다', () => {
    const html = render()
    for (const c of CANDIDATES) {
      expect(html).toContain(ITEM_TYPE_ICON[c.type])
      expect(html).toContain(c.title)
      expect(html).toContain(`>${c.type}<`)
    }
  })
})

describe('🔴 무엇이 되는지를 누르기 **전에** 말한다', () => {
  it('버튼 옆 캡션이 「초안」과 「승인은 Context 화면」을 둘 다 말한다', () => {
    const html = render()
    expect(html).toContain('초안으로 들어갑니다')
    expect(html).toContain('승인은 Context 화면에서 합니다')
  })

  it('🔴 만든 뒤에도 「승인」이 아니라 「초안」이라고 말한다', () => {
    const html = render({ made: 3 })
    expect(html).toContain('항목 3개를 Context 에 만들었습니다')
    expect(html).toContain('아직 초안입니다')
    //  ⚠ 「발행」이라는 낱말이 여기 있으면 사람은 다 끝났다고 읽는다.
    expect(html).not.toContain('발행')
  })

  it('실패는 서버가 낸 문장을 그대로 낸다 — 화면이 지어내지 않는다', () => {
    expect(render({ error: '이 작업을 할 권한이 없다' })).toContain('이 작업을 할 권한이 없다')
  })

  it('후보가 0개면 다음에 무엇을 할지 말한다 — 빈 칸을 두지 않는다', () => {
    const html = render({ candidates: [], picked: new Set() })
    expect(html).toContain('받아들일 항목 후보가 없습니다')
    expect(html).not.toContain('<button')
  })
})
