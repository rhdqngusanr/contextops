import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ITEM_TYPES, type SourceRef } from '@contextops/schema'

import { ITEM_TYPE_LABEL } from '../src/components/chips'
import { SRC_LABEL } from '../src/components/evidence'
import {
  bodyPreview, CANDIDATE_BODY_CHARS, StructureCandidates, type StructureCandidatesState,
} from '../src/components/structure-candidates'
import { structureCandidates, type StructureCandidate } from '../src/lib/web/queries'

// =====================================================================
//  🔴 **AI 결과 카드가 사람의 선택 버튼으로 끝난다** (DESIGN_BRIEF §2-4 · FINDINGS 84)
//
//  ★ 왜 이 파일이 생겼나 — 정리가 끝나면 화면이 「항목 후보 6개를 찾았습니다」라고
//    말하고 [Context 보기] 로 보냈는데, **Context 는 비어 있었다.** 후보를 받아들이는
//    문이 서버에도 화면에도 0곳이었다.
//
//  재는 것 — 앞의 둘만으로는 아무것도 증명하지 않는다:
//    ① job 의 `result` 에서 후보를 꺼내는 함수가 **모양이 다른 것을 안 만든다**
//    ② 고른 수가 버튼에 따라오고, 0개면 버튼이 잠긴다
//    🔴 ③ 만든 뒤 문구가 **「승인」이 아니라 「초안」**이라고 말한다 — 여기서 「발행됐다」로
//       읽히면 사람은 Context 화면의 승인을 건너뛰고 자기 규칙이 안 나간 Pack 을 받는다
//    🔴 ④ **한 줄에 근거가 붙는다** (FINDINGS 86 · DESIGN_BRIEF §2-1) — 제목·타입 셋만
//       있으면 사람은 「재시도 정책 · policy」 다섯 글자만 보고 체크를 남기고, 그 항목은
//       다음 Pack 에 나갈 초안이 된다. 「근거 없는 숫자·판정은 화면에 없다」
// =====================================================================

const REF: SourceRef = {
  kind: 'source_document',
  document_version_id: '11111111-1111-4111-8111-111111111111',
  start_char: 120,
  end_char: 260,
  heading_path: ['결제', '재시도'],
}

const CANDIDATES: StructureCandidate[] = [
  {
    id: 'item_doc_retry', type: 'policy', title: '재시도 정책',
    body: 'PSP 호출은 최대 3회까지만 재시도한다.', evidence: REF,
  },
  {
    id: 'item_doc_card', type: 'constraint', title: '카드 원본 금지',
    body: '카드 원본 정보를 저장하지 않는다.', evidence: REF,
  },
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
        { id: 'item_ok_one', type: 'policy', title: '괜찮은 줄', body: '본문', source_refs: [REF] },
        { id: 'item_bad_type', type: 'not_a_type', title: '표에 없는 타입' },
        { id: 'item_no_title', type: 'policy' },
        null,
      ],
    })
    expect(out).toEqual([
      { id: 'item_ok_one', type: 'policy', title: '괜찮은 줄', body: '본문', evidence: REF },
    ])
  })

  it('ItemType 10종이 전부 지나간다 — 한 종류가 조용히 빠지면 그 항목은 못 고른다', () => {
    const items = ITEM_TYPES.map((type, i) => ({ id: `item_t_${i}`, type, title: type }))
    expect(structureCandidates({ items }).map((c) => c.type)).toEqual([...ITEM_TYPES])
  })
})

// =====================================================================
//  🔴 FINDINGS 86 — **근거가 후보 옆에 있다**
//
//  ★ 근거는 이미 데이터에 있었다 — `structureDocument()` 가 chunk offset 을 문서
//    offset 으로 바꿔 `source_refs` 를 채워 둔다. **화면이 안 꺼냈을 뿐이다.**
//    그래서 재는 것은 두 단계다: ① 꺼내는가 ② 그 값이 화면 글자를 **바꾸는가**.
// =====================================================================

describe('🔴 후보에는 근거가 같이 나온다', () => {
  it('첫 근거를 **스키마로 파서** 낸다 — 손으로 칸을 세면 kind 마다 다른 모양을 놓친다', () => {
    const out = structureCandidates({
      items: [{ id: 'item_a', type: 'policy', title: '제목', body: '본문', source_refs: [REF] }],
    })
    expect(out[0]?.evidence).toEqual(REF)
  })

  it('근거가 없거나 모양이 어긋나면 줄을 **버리지 않고** `evidence:null` 로 둔다', () => {
    const items = [
      { id: 'item_none', type: 'policy', title: '근거 없음', body: '본문' },
      { id: 'item_bad', type: 'policy', title: '어긋난 근거', body: '본문', source_refs: [{ kind: 'nope' }] },
    ]
    expect(structureCandidates({ items }).map((c) => [c.id, c.evidence])).toEqual([
      ['item_none', null], ['item_bad', null],
    ])
  })

  it('본문이 문자열이 아니면 빈 문자열이다 — `undefined` 를 글자로 그리지 않는다', () => {
    const items = [{ id: 'item_a', type: 'policy', title: '제목', body: 42 }]
    expect(structureCandidates({ items })[0]?.body).toBe('')
  })

  //  글자 범위(`120–260번째 글자`)는 안 접히는 조각(`.evidence-range`)으로 싸이므로 태그를 벗기고 견준다 (2026-09-11).
  const plain = (html: string) => html.replace(/<[^>]+>/g, '')

  it('🔴 근거가 카드 글자로 나온다 — `EvidenceLink` 와 **같은 표**를 쓴다', () => {
    const html = render()
    expect(plain(html)).toContain(SRC_LABEL.source_document(REF))
  })

  it('🔴 근거 없는 후보는 그렇다고 말한다 — 빈 칸을 두면 근거가 있는 것처럼 읽힌다', () => {
    const html = render({
      candidates: [{ ...CANDIDATES[0]!, evidence: null }],
      picked: new Set([CANDIDATES[0]!.id]),
    })
    expect(html).toContain('근거 없음')
  })

  it('🔴 근거 값이 바뀌면 화면 글자가 바뀐다 (2-B ②단계)', () => {
    const other = { ...REF, start_char: 900, end_char: 950, heading_path: ['환불'] }
    const html = render({ candidates: [{ ...CANDIDATES[0]!, evidence: other }] })
    expect(plain(html)).toContain(SRC_LABEL.source_document(other))
    expect(plain(html)).not.toContain(SRC_LABEL.source_document(REF))
  })

  it('본문 한 줄이 제목 밑에 나온다 — 다섯 글자만 보고 고르지 않게', () => {
    expect(render()).toContain('PSP 호출은 최대 3회까지만 재시도한다.')
  })
})

describe('🔴 본문 미리보기는 잘렸다는 것을 말한다', () => {
  it('빈 본문은 줄을 안 만든다 — 빈 칸을 두면 본문이 있는데 못 읽은 것처럼 읽힌다', () => {
    expect(bodyPreview('')).toBeNull()
    expect(bodyPreview('   \n  ')).toBeNull()
  })

  it('짧은 한 줄은 그대로 나온다 — 멀쩡한 문장에 `…` 를 붙이지 않는다', () => {
    expect(bodyPreview('짧다')).toBe('짧다')
  })

  it(`${CANDIDATE_BODY_CHARS}자를 넘으면 자르고 … 를 붙인다`, () => {
    const long = 'ㄱ'.repeat(CANDIDATE_BODY_CHARS + 10)
    const out = bodyPreview(long)
    expect(out).toBe(`${'ㄱ'.repeat(CANDIDATE_BODY_CHARS)}…`)
  })

  it('줄이 더 있으면 첫 줄 뒤에 … 를 붙인다 — 뒤가 더 있다는 것을 말한다', () => {
    expect(bodyPreview('첫 줄\n둘째 줄')).toBe('첫 줄…')
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

  it('**타입 이름**이 사람 말로 나간다 — 기호로 말하지 않는다 (2026-09-10 저녁)', () => {
    const html = render()
    for (const c of CANDIDATES) {
      expect(html).toContain(c.title)
      //  타입은 사람 말로 나간다 (`ITEM_TYPE_LABEL` · INBOX H7) — enum 값이 화면에 그대로 뜨지 않는다.
      expect(html).toContain(`>${ITEM_TYPE_LABEL[c.type]}<`)
      expect(html).not.toContain(`>${c.type}<`)
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
