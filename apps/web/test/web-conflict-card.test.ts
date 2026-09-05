import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ANSWER_MAX, ANSWER_SLOT_KEYS, ANSWER_SLOTS,
  CONFLICT_ANCHORS, CONFLICT_CHOICES, CONFLICT_KINDS, CONFLICT_KIND_RULES,
  RESOLUTION_ITEM_OUTCOME, RESOLUTION_NOTE_MAX,
  type ConflictKind, type ContextItemView, type DetectedConflictKind, type SourceRef,
} from '@contextops/schema'

import {
  CHOICE_LABEL, CONFLICT_SIDES, ConflictCard, choiceItemEffect,
  type ConflictCardHandlers, type ConflictCardState,
} from '../src/components/conflict-card'
import type { ConflictCard as ConflictRow } from '../src/lib/web/queries'

// =====================================================================
//  🔴 충돌 카드의 **모든 모양을 그려서 읽는다** (loop/PROMPT.md ⑦3층)
//
//  ★ 왜 — 브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 「가리키는 항목을 못
//    찾은 카드」「결정 저장이 실패한 카드」「답했는데 항목이 안 생긴 카드」는 사람이
//    손으로 만들기 어려운 상태라, 그냥 두면 **아무도 본 적 없는 채로** 배포된다.
//
//  재는 것 — 전부 DESIGN_BRIEF·이 저장소가 이미 배운 것이다:
//    ① 종류마다 갈리는 것이 **표에서만** 온다 (`anchor`·`detected`·`byAi`)
//    ② 없는 것을 지어내지 않는다 (못 찾은 항목 · 항목 0개면 「만들어졌습니다」 금지)
//    ③ 없는 문을 그리지 않는다 (결정된 카드에 버튼이 없다)
//    ④ 근거가 판정 **옆에** 있다 (P7 · DESIGN_BRIEF §2-1)
//    ⑤ 상한을 화면이 손으로 적지 않는다 (`ANSWER_MAX` · `RESOLUTION_NOTE_MAX`)
//    ⑥ 「실시간」이라는 낱말이 없다 (DESIGN_BRIEF §2-3) · 사람 이름·점수가 없다 (P5)
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴. 그건 캡처가 있어야 한다
//    (`docs/STATUS.md` 「눈 판정 대기」).
// =====================================================================

const NOOP: ConflictCardHandlers = { onDraft: () => {}, onSaveAs: () => {}, onChoose: () => {}, onAnswer: () => {} }

const DOC_REF: SourceRef = {
  kind: 'source_document',
  document_version_id: '3f9c2e1a-0000-4000-8000-000000000000',
  start_char: 120,
  end_char: 480,
  heading_path: ['결제', '재시도'],
}

const CODE_REF: SourceRef = {
  kind: 'repository_path',
  repo: 'paylab-api',
  path: 'src/payment/retry.ts',
  start_line: 14,
  end_line: 30,
}

function item(over: Partial<ContextItemView> = {}): ContextItemView {
  return {
    id: 'item_retry_policy',
    project_id: '00000000-0000-4000-8000-000000000000',
    type: 'policy',
    title: '결제 재시도는 5회까지',
    body: '재시도는 지수 백오프로 5회까지 한다.',
    status: 'active',
    scope: { kind: 'project' },
    priority: 50,
    source_refs: [DOC_REF],
    tags: [],
    confidence: 'high',
    revision: 3,
    data: { rule: '재시도 5회', severity: 'must', enforcement: 'review' },
    updated_at: '2026-07-12T09:00:00.000Z',
    ...over,
  } as ContextItemView
}

/** 종류가 정한 칸만 채운 행을 만든다 — DB CHECK 과 같은 규칙을 시험이 흉내 낸다. */
function row(kind: ConflictKind, over: Partial<ConflictRow> = {}): ConflictRow {
  const rule = CONFLICT_KIND_RULES[kind]
  return {
    id: `c-${kind}`,
    project_id: '00000000-0000-4000-8000-000000000000',
    kind,
    a_item_id: rule.anchor === 'items' ? 'item_retry_policy' : null,
    b_item_id: rule.anchor === 'items' && rule.needsB ? 'item_retry_code' : null,
    a_ref: rule.anchor === 'document' ? DOC_REF : null,
    b_ref: rule.anchor === 'document' && rule.needsB ? CODE_REF : null,
    question: '어느 쪽이 현재 상태인가요?',
    severity: rule.detected ? 'high' : null,
    status: 'open',
    resolution: null,
    resolved_at: null,
    ...over,
  }
}

function base(over: Partial<ConflictCardState> = {}): ConflictCardState {
  return {
    conflict: row('contradiction'),
    canDecide: true,
    a: item(),
    //  ⚠ 두 쪽의 갱신 날짜가 **서로 다르다** — 같게 두면 「그 칸이 항목을 따라간다」를
    //    시험이 증명하지 못한다 (DESIGN_BRIEF §4 「A 갱신 2026-07-12 · B 갱신 2026-08-04」).
    b: item({
      id: 'item_retry_code', title: '코드의 재시도는 3회', source_refs: [CODE_REF], revision: 1,
      updated_at: '2026-08-04T09:00:00.000Z',
    }),
    draft: '',
    saveAs: '',
    busy: false,
    error: null,
    created: null,
    ...over,
  }
}

function draw(over: Partial<ConflictCardState> = {}): string {
  return renderToStaticMarkup(createElement(ConflictCard, { state: base(over), on: NOOP }))
}

/** 태그를 지우고 사람이 읽는 글자만 남긴다. */
function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim()
}

const SHAPES: { what: string; over: Partial<ConflictCardState> }[] = [
  { what: '① 모순 — 두 항목이 다 있다', over: {} },
  { what: '② 오래됨 — 다른 버튼 문구', over: { conflict: row('stale') } },
  { what: '③ 중복', over: { conflict: row('duplicate') } },
  { what: '④ 문서↔코드', over: { conflict: row('doc_vs_code') } },
  { what: '⑤ 가리키는 항목을 못 찾았다', over: { a: null, b: null } },
  { what: '⑥ 메모를 쓰는 중', over: { draft: '팀장이 8/4 에 확인함' } },
  { what: '⑦ 저장 중', over: { busy: true } },
  { what: '⑧ 저장 실패', over: { error: new Error('서버가 500 을 냈다') } },
  {
    what: '⑨ 결정됨 (메모 있음)',
    over: {
      conflict: row('contradiction', {
        status: 'resolved', resolution: { choice: 'b', note: '8/4 QC 결과가 최신이다' },
      }),
    },
  },
  {
    what: '⑩ 무시됨',
    over: { conflict: row('contradiction', { status: 'dismissed', resolution: { choice: 'dismiss' } }) },
  },
  { what: '⑪ 열린 질문 (원문을 가리킨다)', over: { conflict: row('open_question'), a: null, b: null } },
  {
    what: '⑪-B 열린 질문 — 자리를 골랐다',
    over: {
      conflict: row('open_question'), a: null, b: null,
      draft: '기존 장비가 MQTT 만 지원한다.', saveAs: 'policy_must',
    },
  },
  { what: '⑫ 씨앗 질문 (가리킬 것이 없다)', over: { conflict: row('seed_question'), a: null, b: null } },
  {
    what: '⑬ 답 저장됨 — 항목이 생겼다',
    over: {
      conflict: row('seed_question', { status: 'resolved', resolution: { choice: 'a', note: '결제를 안전하게.' } }),
      a: null, b: null, created: ['item_seed_mission'],
    },
  },
  {
    what: '⑭ 답 저장됨 — 항목이 안 생겼다',
    over: {
      conflict: row('open_question', { status: 'resolved', resolution: { choice: 'a', note: 'MQTT 를 골랐다.' } }),
      a: null, b: null, created: [],
    },
  },
  { what: '⑮ member 가 본 탐지 카드', over: { canDecide: false } },
]

describe('충돌 카드 — 모든 모양을 그려서 읽는다', () => {
  it('열여섯 모양이 전부 그려지고, 서로 다르다', () => {
    const drawn = SHAPES.map((s) => draw(s.over))
    for (const [i, html] of drawn.entries()) {
      expect(text(html).length, `${SHAPES[i]!.what}: 빈 카드다`).toBeGreaterThan(20)
    }
    expect(new Set(drawn).size, '서로 다른 모양이 같은 마크업을 낸다').toBe(SHAPES.length)
  })

  it('🔴 「실시간」이라는 낱말이 없다 · 사람 이름도 점수도 없다 (DESIGN_BRIEF §2-3 · P5)', () => {
    for (const s of SHAPES) {
      const t = text(draw(s.over))
      expect(t, s.what).not.toContain('실시간')
      expect(t, s.what).not.toMatch(/점수|순위|랭킹/)
    }
  })
})

describe('🔴 답이 갈 자리를 사람이 고른다 (FINDINGS 105)', () => {
  //  ★ 왜 표를 도나 — 「어느 카드가 자리를 묻나」를 시험이 손으로 적으면, 질문 종류가
  //    늘 때 이 시험은 **늘 초록인 채로** 새 종류를 안 본다. 그게 105 의 모양이었다.
  it('자리를 묻는 카드는 `answerSlot: ask` 인 종류뿐이다', () => {
    for (const kind of CONFLICT_KINDS) {
      const html = draw({ conflict: row(kind), a: null, b: null })
      const asks = CONFLICT_KIND_RULES[kind].answerSlot === 'ask'
      expect(html.includes('이 답을 무엇으로 저장할까요'), `${kind}`).toBe(asks)
    }
  })

  it('고를 수 있는 자리가 `ANSWER_SLOTS` 그대로 그려진다 — 화면이 목록을 손으로 안 적는다', () => {
    const html = draw({ conflict: row('open_question'), a: null, b: null })
    for (const key of ANSWER_SLOT_KEYS) {
      expect(html, `${key} 가 빠졌다`).toContain(`value="${key}"`)
      expect(text(html), `${key} 의 라벨이 없다`).toContain(ANSWER_SLOTS[key].label)
    }
  })

  //  🔴 **없는 것을 약속하지 않는다** (FINDINGS 66 과 같은 금지).
  it('고르기 전에는 「기록만」이라고 말하고, 고른 뒤에만 항목을 약속한다', () => {
    const before = text(draw({ conflict: row('open_question'), a: null, b: null, saveAs: '' }))
    expect(before).toContain('기록으로만 남습니다')
    expect(before).not.toContain('초안 항목 한 개가 됩니다')

    const after = text(draw({ conflict: row('open_question'), a: null, b: null, saveAs: 'goal' }))
    expect(after).toContain(ANSWER_SLOTS.goal.label)
    expect(after).toContain('초안 항목 한 개가 됩니다')
    expect(after).not.toContain('기록으로만 남습니다')
  })

  //  ⚠ 씨앗 질문은 자리가 표에 있어서 물을 것이 없다 — 물으면 사람이 고른 자리와
  //    서버가 쓰는 자리가 달라진다 (라우트는 그 요청을 400 으로 막는다).
  it('씨앗 질문 카드에는 고르는 칸도 약속 문장도 없다', () => {
    const t = text(draw({ conflict: row('seed_question'), a: null, b: null }))
    expect(t).not.toContain('이 답을 무엇으로 저장할까요')
    expect(t).not.toContain('기록으로만 남습니다')
  })
})

describe('🔴 종류마다 갈리는 것이 표에서만 온다', () => {
  it('`CONFLICT_SIDES` 의 키가 탐지 종류와 같고, A·B 문구가 서로 다르다', () => {
    const detected = CONFLICT_KINDS.filter((k) => CONFLICT_KIND_RULES[k].detected)
    expect(Object.keys(CONFLICT_SIDES).sort()).toEqual([...detected].sort())
    const labels = detected.flatMap((k) => {
      const sides = CONFLICT_SIDES[k as DetectedConflictKind]
      return [sides.a, sides.b]
    })
    expect(new Set(labels).size, `A·B 문구가 겹친다 — ${labels.join(' / ')}`).toBe(labels.length)
  })

  //  🔴 **버튼이 표에 없는 일을 약속하지 않는다** (FINDINGS 76).
  //
  //  ★ 왜 낱말 목록인가 — 29바퀴에 버튼 밑에 결과 줄을 붙였더니 중복 카드에서
  //    `A로 합침 | B 항목 → 「폐기」` 가 한 줄에 나란히 섰다. 서버는 **합치지 않는다** —
  //    진 쪽을 폐기할 뿐이고 이긴 쪽으로는 본문도 근거도 안 옮겨 온다. 사람은 B 에만
  //    있던 문장이 남는다고 믿고 누르는데 되돌릴 문이 없다.
  //  ★ 왜 표를 같이 재나 — 이 금지는 **표가 폐기만 하는 동안**만 옳다. 진 쪽
  //    `source_refs` 를 이긴 쪽에 이어 붙이는 갈래가 생기면 「합침」은 참말이 된다.
  //    그때 첫 `expect` 가 먼저 빨개져서 **여기로 데려온다** — 문구를 다시 정하는 자리다.
  const MERGE_WORDS = ['합침', '합치', '병합', '통합']

  it('🔴 표가 「진 쪽 폐기」뿐인 동안 버튼이 「합친다」고 말하지 않는다 (FINDINGS 76)', () => {
    const merges = CONFLICT_CHOICES.filter((c) => {
      const rule = RESOLUTION_ITEM_OUTCOME[c]
      return rule !== null && rule.status !== 'deprecated'
    })
    expect(
      merges,
      '표가 넓어졌다 — `MERGE_WORDS` 금지와 `CONFLICT_SIDES` 문구를 다시 정해라',
    ).toEqual([])

    for (const kind of Object.keys(CONFLICT_SIDES) as DetectedConflictKind[]) {
      const sides = CONFLICT_SIDES[kind]
      for (const label of [sides.a, sides.b]) {
        for (const word of MERGE_WORDS) {
          expect(
            label,
            `${kind}: 「${label}」 — 서버는 진 쪽을 폐기할 뿐 합치지 않는다`,
          ).not.toContain(word)
        }
      }
    }
  })

  it('선택 4개가 서로 다른 문구를 낸다 (`CHOICE_LABEL`)', () => {
    const sides = CONFLICT_SIDES.doc_vs_code
    const made = CONFLICT_CHOICES.map((c) => CHOICE_LABEL[c](sides))
    expect(Object.keys(CHOICE_LABEL).sort()).toEqual([...CONFLICT_CHOICES].sort())
    expect(new Set(made).size, made.join(' / ')).toBe(CONFLICT_CHOICES.length)
  })

  it('🔴 탐지 4종의 카드가 **서로 다른 버튼 문구**를 그린다 — 종류가 실제로 화면을 바꾼다', () => {
    const rendered = (['contradiction', 'stale', 'duplicate', 'doc_vs_code'] as DetectedConflictKind[])
      .map((k) => text(draw({ conflict: row(k) })))
    for (const [i, t] of rendered.entries()) {
      const kind = (['contradiction', 'stale', 'duplicate', 'doc_vs_code'] as DetectedConflictKind[])[i]!
      expect(t, kind).toContain(CONFLICT_SIDES[kind].a)
      expect(t, kind).toContain(CONFLICT_SIDES[kind].b)
    }
    expect(new Set(rendered).size).toBe(rendered.length)
  })

  it('🔴 `anchor` 3종이 서로 다른 본문을 그린다 (근거로 가는 길이 갈린다 · P7)', () => {
    //  종류가 아니라 `anchor` 로 고른다 — 축마다 대표 한 종류.
    const perAnchor = CONFLICT_ANCHORS.map((anchor) => {
      const kind = CONFLICT_KINDS.find((k) => CONFLICT_KIND_RULES[k].anchor === anchor)
      expect(kind, `${anchor} 를 쓰는 종류가 없다`).toBeDefined()
      return {
        anchor,
        html: draw({
          conflict: row(kind!),
          a: item(),
          b: item({ id: 'item_retry_code', source_refs: [CODE_REF] }),
        }),
      }
    })

    const items = perAnchor.find((p) => p.anchor === 'items')!.html
    const document = perAnchor.find((p) => p.anchor === 'document')!.html
    const none = perAnchor.find((p) => p.anchor === 'none')!.html

    //  ① 항목을 가리키는 카드는 **항목 태그와 그 근거**를 그린다.
    expect(text(items)).toContain('item_retry_policy')
    expect(text(items)).toContain('paylab-api/src/payment/retry.ts')
    //  ② 원문을 가리키는 카드는 **문서 구간**을 그린다 (항목 태그가 아니다).
    expect(text(document)).toContain('120–480자')
    expect(text(document)).not.toContain('item_retry_policy')
    //  ③ 가리킬 것이 없는 카드는 **아무 근거도 지어내지 않는다.**
    expect(text(none)).toContain('가리킬 문서도 항목도 없습니다')
    expect(text(none)).not.toContain('item_retry_policy')
    expect(text(none)).not.toContain('120–480자')
  })

  it('🔴 `byAi` 가 배지를 가른다 — 열린 질문에는 붙고 씨앗 질문에는 안 붙는다', () => {
    //  ⚠ 둘 다 `detected: false` 다. `detected` 로 배지를 달면 이 시험이 빨개진다.
    expect(CONFLICT_KIND_RULES.open_question.detected).toBe(false)
    expect(CONFLICT_KIND_RULES.seed_question.detected).toBe(false)

    const open = text(draw({ conflict: row('open_question'), a: null, b: null }))
    const seed = text(draw({ conflict: row('seed_question'), a: null, b: null }))
    expect(open).toContain('AI 제안')
    expect(seed).not.toContain('AI 제안')
  })

  it('질문 카드에는 선택 버튼이 없고 답 칸이 있다 (`POST /questions` 가 받는 종류다)', () => {
    for (const kind of CONFLICT_KINDS.filter((k) => !CONFLICT_KIND_RULES[k].detected)) {
      const t = text(draw({ conflict: row(kind), a: null, b: null }))
      expect(t, kind).toContain('답 저장하기')
      expect(t, kind).not.toContain('둘 다 보류')
    }
    for (const kind of CONFLICT_KINDS.filter((k) => CONFLICT_KIND_RULES[k].detected)) {
      const t = text(draw({ conflict: row(kind) }))
      expect(t, kind).toContain('둘 다 보류')
      expect(t, kind).not.toContain('답 저장하기')
    }
  })

  it('탐지가 안 만드는 종류에는 심각도 칩이 없다 (재지 않은 값을 그리지 않는다)', () => {
    expect(text(draw({ conflict: row('contradiction') }))).toContain('심각도 높음')
    expect(text(draw({ conflict: row('seed_question'), a: null, b: null }))).not.toContain('심각도')
  })
})

describe('🔴 없는 것을 지어내지 않는다', () => {
  it('가리키는 항목을 못 찾으면 빈 칸이 아니라 「못 찾았다」를 그린다', () => {
    const t = text(draw({ a: null, b: null }))
    expect(t).toContain('이 항목을 목록에서 찾지 못했습니다')
    //  ⚠ 그래도 **어느 항목이었는지**는 남긴다 — 그게 없으면 사람이 찾아갈 데가 없다 (P7).
    expect(t).toContain('item_retry_policy')
  })

  it('🔴 답했는데 항목이 0개면 「만들어졌습니다」라고 말하지 않는다 (FINDINGS 66)', () => {
    const none = text(draw({
      conflict: row('open_question', { status: 'resolved', resolution: { choice: 'a', note: '그렇다.' } }),
      a: null, b: null, created: [],
    }))
    expect(none).toContain('항목은 만들어지지 않았습니다')
    expect(none).not.toContain('개가 만들어졌습니다')

    const some = text(draw({
      conflict: row('seed_question', { status: 'resolved', resolution: { choice: 'a', note: '그렇다.' } }),
      a: null, b: null, created: ['item_seed_mission'],
    }))
    expect(some).toContain('초안 항목 1개가 만들어졌습니다')
  })

  it('아직 저장 안 한 질문 카드는 무엇이 생기는지 **약속하지 않는다**', () => {
    //  ★ 답이 항목이 되는 질문과 기록으로만 남는 질문이 섞여 있고, 그 판정은 서버가 한다.
    const t = text(draw({ conflict: row('seed_question'), a: null, b: null }))
    expect(t).not.toContain('만들어집니다')
    expect(t).not.toContain('만들어지지 않았습니다')
  })

  it('결정된 카드에는 버튼이 없고, 무엇을 골랐는지가 남는다', () => {
    const html = draw({
      conflict: row('stale', { status: 'resolved', resolution: { choice: 'b', note: '8/4 가 최신' } }),
    })
    expect(html).not.toContain('<button')
    const t = text(html)
    expect(t).toContain('B가 최신')
    expect(t).toContain('8/4 가 최신')
  })

  it('🔴 한쪽뿐인 카드에 「A」를 붙이지 않는다 — 없는 짝을 찾게 만든다', () => {
    //  열린 질문은 `needsB: false` 라 가리키는 원문이 하나다.
    const one = text(draw({ conflict: row('open_question'), a: null, b: null }))
    expect(one).toContain('근거')
    expect(one).not.toMatch(/(^| )A( |$)/)
    //  두 쪽이 있는 카드는 A·B 를 붙인다 — 그래야 버튼의 「A가 맞음」이 무엇인지 안다.
    const two = text(draw())
    expect(two).toMatch(/(^| )A( |$)/)
    expect(two).toMatch(/(^| )B( |$)/)
  })

  it('🔴 owner 가 아니면 결정 버튼을 그리지 않는다 — 누르면 403 인 버튼을 두지 않는다', () => {
    const html = draw({ canDecide: false })
    expect(html).not.toContain('<button')
    const t = text(html)
    expect(t).toContain('이 결정은 팀 owner 가 합니다')
    //  🔴 그래도 **근거는 그대로 보인다** — owner 에게 보여 주려면 봐야 한다 (P7).
    expect(t).toContain('paylab-api/src/payment/retry.ts')
  })

  it('member 도 질문에는 답할 수 있다 (`POST /questions` 는 member 다)', () => {
    const t = text(draw({ conflict: row('seed_question'), canDecide: false, a: null, b: null }))
    expect(t).toContain('답 저장하기')
    expect(t).not.toContain('이 결정은 팀 owner 가 합니다')
  })

  it('🔴 결정 문구에 조사를 붙이지 않는다 — 버튼 문구마다 받침이 다르다', () => {
    //  ⚠ 「무시」+「으로」가 됐던 자리다. 넷 다 그려서 어색한 조사가 없는지 본다.
    for (const choice of CONFLICT_CHOICES) {
      const t = text(draw({
        conflict: row('contradiction', { status: 'resolved', resolution: { choice } }),
      }))
      expect(t, choice).not.toMatch(/」(으로|로|을|를|이|가) /)
    }
  })
})

describe('🔴 결정이 항목에 무엇을 하는지 카드가 말한다 (FINDINGS 74)', () => {
  it('선택 4개마다 **그 버튼이 항목에 하는 일**이 버튼 밑에 있다', () => {
    const t = text(draw())
    //  ⚠ 표에서 뽑은 기대값과 카드가 같은 말을 하는지 본다 — 카드가 손으로 적은
    //     문구를 갖고 있으면 표를 고쳤을 때 여기서 갈린다.
    for (const choice of CONFLICT_CHOICES) {
      expect(t, choice).toContain(choiceItemEffect(base().conflict, choice))
    }
    //  🔴 그리고 **지금 표가 무엇인지**를 글자로 못 박는다. 표를 고치면 이 줄이
    //     빨개지고, 고치는 사람은 화면 문구가 같이 바뀌는 것을 눈으로 본다.
    expect(t, 'a 를 고르면 B 가 진다').toContain('B 항목 → 「폐기」')
    expect(t, 'b 를 고르면 A 가 진다').toContain('A 항목 → 「폐기」')
    expect(t, 'both·dismiss 는 항목을 안 건드린다').toContain('항목은 그대로')
  })

  it('🔴 표의 네 줄이 **서로 다른 결과**를 낸다 — 값을 바꾸면 화면이 갈린다', () => {
    const made = CONFLICT_CHOICES.map((c) => choiceItemEffect(base().conflict, c))
    //  a·b 는 서로 다른 쪽을 폐기하고, `null` 인 둘은 같은 말을 한다 (그게 뜻이다).
    const moving = CONFLICT_CHOICES.filter((c) => RESOLUTION_ITEM_OUTCOME[c] !== null)
    const still = CONFLICT_CHOICES.filter((c) => RESOLUTION_ITEM_OUTCOME[c] === null)
    expect(new Set(moving.map((c) => choiceItemEffect(base().conflict, c))).size).toBe(moving.length)
    expect(new Set(still.map((c) => choiceItemEffect(base().conflict, c))).size).toBe(1)
    expect(new Set(made).size, made.join(' / ')).toBe(moving.length + 1)
  })

  it('🔴 폐기가 일어나는 카드에서만 「되돌릴 수 없다」를 말한다', () => {
    //  ⚠ 지금은 사실이다 — `:resolve` 가 「이미 처리된 충돌」을 400 으로 막는다.
    expect(text(draw())).toContain('되돌릴 수 없습니다')
    expect(text(draw())).toContain('다음 Pack 에 들어가지 않습니다')
    //  가리키는 항목이 행에 안 적혀 있으면 아무것도 안 없어진다 — 겁주지 않는다.
    const empty = text(draw({ conflict: row('contradiction', { a_item_id: null, b_item_id: null }) }))
    expect(empty).not.toContain('되돌릴 수 없습니다')
    expect(empty).toContain('바꿀 항목이 적혀 있지 않음')
    expect(empty).not.toContain('→ 「폐기」')
  })

  it('질문 카드는 여전히 무엇이 생기는지 **약속하지 않는다** (27바퀴 게이트)', () => {
    for (const kind of CONFLICT_KINDS.filter((k) => !CONFLICT_KIND_RULES[k].detected)) {
      const t = text(draw({ conflict: row(kind), a: null, b: null }))
      expect(t, kind).not.toContain('폐기')
      expect(t, kind).not.toContain('되돌릴 수 없습니다')
    }
  })

  it('🔴 결정된 카드가 **무엇이 일어났는지**를 남긴다 — 누르기 전과 같은 문장이다', () => {
    const decided = text(draw({
      conflict: row('contradiction', { status: 'resolved', resolution: { choice: 'a' } }),
    }))
    expect(decided).toContain('B 항목 → 「폐기」')
    //  ⚠ 결정된 카드에는 「되돌릴 수 없습니다」를 다시 말하지 않는다 — 버튼이 이미 없다.
    expect(decided).not.toContain('되돌릴 수 없습니다')

    const dismissed = text(draw({
      conflict: row('contradiction', { status: 'dismissed', resolution: { choice: 'dismiss' } }),
    }))
    expect(dismissed).toContain('항목은 그대로')
    expect(dismissed).not.toContain('→ 「폐기」')
  })
})

describe('🔴 상한을 화면이 손으로 적지 않는다', () => {
  it('답 칸은 `ANSWER_MAX`, 메모 칸은 `RESOLUTION_NOTE_MAX` 를 읽는다', () => {
    expect(draw({ conflict: row('seed_question'), a: null, b: null }))
      .toContain(`maxLength="${ANSWER_MAX}"`)
    expect(draw()).toContain(`maxLength="${RESOLUTION_NOTE_MAX}"`)
  })
})

// =====================================================================
//  🔴 **언제 것인가** — 두 쪽의 갱신 날짜 (FINDINGS 72③ · DESIGN_BRIEF §4 화면 4)
//
//  ★ 왜 이 칸이 필요한가 — `stale`(오래됨) 카드가 묻는 것이 정확히 「어느 쪽이 최신인가」다.
//    날짜가 화면에 없으면 사람은 그 답을 **화면 밖에서** 찾아야 하고, 그러면 카드는
//    질문만 하고 근거는 안 주는 것이 된다 (DESIGN_BRIEF §2-1 · P7 과 같은 이유).
// =====================================================================

describe('🔴 두 쪽이 언제 것인지 카드가 말한다', () => {
  it('두 항목의 갱신 날짜가 나란히 나온다', () => {
    const t = text(draw({ conflict: row('stale') }))
    expect(t).toContain('갱신 2026-07-12')
    expect(t).toContain('갱신 2026-08-04')
  })

  //  🔴 「그려지기만 하는 칸」이 아니다 — 값을 바꾸면 화면이 갈린다 (loop/PROMPT.md ④2-B ②단계).
  it('🔴 항목의 값을 바꾸면 카드의 날짜가 따라 바뀐다', () => {
    const later = text(draw({
      conflict: row('stale'),
      b: item({ id: 'item_retry_code', updated_at: '2027-01-02T00:00:00.000Z' }),
    }))
    expect(later).toContain('갱신 2027-01-02')
    expect(later).not.toContain('갱신 2026-08-04')
  })

  //  ⚠ 항목을 못 찾은 쪽에는 날짜가 없다 — 없는 값을 「-」로 채우면 그건 지어낸 칸이다.
  it('가리키는 항목을 못 찾은 카드에는 날짜가 없다', () => {
    expect(text(draw({ a: null, b: null }))).not.toContain('갱신 ')
  })
})
