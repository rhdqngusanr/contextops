import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ITEM_STATUSES, ITEM_TYPES, SCOPE_KINDS, type ContextItemView } from '@contextops/schema'
import { describe, expect, it } from 'vitest'

import { ITEM_STATUS_CHIP, ITEM_TYPE_LABEL } from '../src/components/chips'
import { ContextDoc, evidenceNote } from '../src/components/context-doc'
import {
  CONTEXT_DOC_ORDER, CONTEXT_SECTION_LEAD, SCOPE_VALUE_EXAMPLE, contextSections, sectionNote,
} from '../src/lib/web/context-doc'

// =====================================================================
//  화면 5 · 문서로 보기 (2026-09-11 · 사용자: 「Context 화면도 문서처럼 읽기 쉽게」)
//  ★ 표는 절 차례·절 머리 한 줄 둘뿐이고, 화면은 읽기만 한다. 여기서 「10종 전부 · 빈 절 없음 · 예외만 표시」를 센다.
// =====================================================================

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
    source_refs: [{ kind: 'manual', note: '팀장이 적음' }],
    tags: [],
    confidence: 'high',
    revision: 3,
    data: { rule: '재시도 5회', severity: 'must', enforcement: 'review' },
    updated_at: '2026-07-12T09:00:00.000Z',
    ...over,
  } as ContextItemView
}

describe('절의 차례와 머리 한 줄', () => {
  it('차례가 ItemType 10종 전부를 한 번씩 담는다 — 빠진 타입은 문서에서 사라진다', () => {
    expect([...CONTEXT_DOC_ORDER].sort()).toEqual([...ITEM_TYPES].sort())
    expect(new Set(CONTEXT_DOC_ORDER).size).toBe(ITEM_TYPES.length)
  })

  it('왜(사명·목표)가 앞이고 아직 못 정한 것(질문)이 끝이다', () => {
    expect(CONTEXT_DOC_ORDER[0]).toBe('mission')
    expect(CONTEXT_DOC_ORDER[1]).toBe('goal')
    expect(CONTEXT_DOC_ORDER[CONTEXT_DOC_ORDER.length - 1]).toBe('open_question')
  })

  it('절 머리 밑 한 줄은 10종 전부 사람 말(존댓말)이고 서로 다르며 개발자 낱말이 없다', () => {
    expect(Object.keys(CONTEXT_SECTION_LEAD).sort()).toEqual([...ITEM_TYPES].sort())
    const leads = Object.values(CONTEXT_SECTION_LEAD)
    expect(new Set(leads).size).toBe(leads.length)
    for (const lead of leads) {
      expect(lead).toMatch(/니다\.$/)
      expect(lead).not.toMatch(/ADR|enum|scope|manifest|snapshot|아키텍처|도메인/i)
    }
  })
})

describe('묶기', () => {
  it('빈 절은 만들지 않고, 있는 절은 차례대로, 절 안은 서버 차례 그대로다', () => {
    const items = [
      item({ id: 'q1', type: 'open_question', data: { question: '환불 기한은?' } }),
      item({ id: 'p2', title: '둘째 규칙' }),
      item({ id: 'm1', type: 'mission', data: { statement: '결제가 선다' } }),
      item({ id: 'p1', title: '첫째 규칙' }),
    ]
    const sections = contextSections(items)
    expect(sections.map((s) => s.type)).toEqual(['mission', 'policy', 'open_question'])
    expect(sections[1]?.items.map((i) => i.id)).toEqual(['p2', 'p1'])
  })

  it('절 머리의 수는 「n개」이고, 적용 중이 아닌 상태가 있을 때만 그 수를 덧붙인다', () => {
    const label = (s: (typeof ITEM_STATUSES)[number]) => ITEM_STATUS_CHIP[s].label
    expect(sectionNote([item(), item()], label)).toBe('2개')
    expect(sectionNote([item(), item({ status: 'draft' }), item({ status: 'deprecated' })], label))
      .toBe(`3개 · ${ITEM_STATUS_CHIP.draft.label} 1 · ${ITEM_STATUS_CHIP.deprecated.label} 1`)
  })
})

describe('근거 발치 한 줄', () => {
  it('0 이면 「근거 없음」이고 경고색, 있으면 수와 확신을 같이 말한다', () => {
    expect(evidenceNote({ source_refs: [], confidence: 'high' })).toEqual({ text: '근거 없음', warn: true })
    expect(evidenceNote(item())).toEqual({ text: '근거 1건 · 근거 확실', warn: false })
    expect(evidenceNote(item({ confidence: 'low' })).warn).toBe(true)
  })
})

describe('그리기', () => {
  const html = renderToStaticMarkup(createElement(ContextDoc, {
    items: [
      item({ id: 'm1', type: 'mission', title: '결제가 흔들리지 않는다', data: { statement: '밖이 실패해도 결제가 선다' } }),
      item({ id: 'p1', title: '첫째 규칙' }),
      item({ id: 'p2', title: '아직 승인 안 된 규칙', status: 'draft', source_refs: [] }),
      item({ id: 'r1', title: '환불 규칙', scope: { kind: 'domain', value: 'refund' } }),
    ],
    selected: null,
    onSelect: () => {},
  }))

  it('절 머리는 타입의 사람 말이고, 각 항목은 누를 수 있는 블록이다', () => {
    expect(html).toContain(ITEM_TYPE_LABEL.mission)
    expect(html).toContain(ITEM_TYPE_LABEL.policy)
    expect((html.match(/role="button"/g) ?? []).length).toBe(4)
    //  타입의 영어 값은 화면에 없다.
    expect(html).not.toMatch(/>mission<|>policy<|>open_question</)
  })

  it('「적용 중」이 아닌 항목에만 상태 칩과 색 괘선이 붙는다 — 예외만 눈에 띈다', () => {
    expect(html.split(ITEM_STATUS_CHIP.draft.label).length - 1).toBe(2)   // 절 머리의 「초안 1」 + 칩 하나
    expect(html).not.toContain(ITEM_STATUS_CHIP.active.label)
    expect((html.match(/data-tone="neutral"/g) ?? []).length).toBe(1)
  })

  it('한 줄(이름표 + 값) · 설명 · 근거 · 범위 · 꼬리표가 블록 안에 있다', () => {
    expect(html).toContain('밖이 실패해도 결제가 선다')
    expect(html).toContain('재시도는 지수 백오프로 5회까지 한다.')
    expect(html).toContain('근거 없음')
    //  범위는 낱말 · 값 — 표와 같은 모양이다.
    expect(html).toContain('업무<span class="mono"> · refund</span>')
    expect(html).toContain('개정 3')
    //  프로젝트 전체 범위는 적지 않는다 — 기본이라 소리가 없다.
    expect(html).not.toContain('프로젝트 전체')
    //  특수문자 아이콘은 없다.
    expect(html).not.toMatch(/[✓✕●§¶⚠◌]/)
  })
})

// ---------------------------------------------------------------------
//  화면 5 본체(`context/page.tsx`)의 글자 — 소스 글자 검사 (design-tokens.test.ts ⑧ 과 같은 방식). 2026-09-11 의 지적 한 벌:
//  거르개 선택지는 사람 말 · 표의 열 · JSON 은 팀장에게만 · 발행 기록은 머리에 접혀서 · 발행 뒤엔 [Pack 보기].
// ---------------------------------------------------------------------
describe('화면 5 page.tsx 의 글자', () => {
  const page = readFileSync(fileURLToPath(new URL('../src/app/t/[team]/p/[project]/context/page.tsx', import.meta.url)), 'utf8')

  it('거르개 세 칸 — 이름표는 「종류·상태·범위」, 선택지는 enum 을 돌되 보이는 글자는 표의 사람 말이다', () => {
    expect(page).toContain('<span className="label">종류</span>')
    expect(page).toContain('<span className="label">상태</span>')
    expect(page).toContain('<span className="label">범위</span>')
    expect(page).toContain('{ITEM_TYPE_LABEL[t]}</option>')
    expect(page).toContain('{ITEM_STATUS_CHIP[s].label}</option>')
    expect(page).toContain('{SCOPE_KIND_LABEL[k]}</option>')
    expect(page).not.toMatch(/value=\{(t|s|k)\}>\{(t|s|k)\}<\/option>/)
    //  「타입」「scope」는 이 화면에 없다 — 표·화면 3 과 같은 낱말 하나다.
    expect(page).not.toContain('<span className="label">타입</span>')
    expect(page).not.toContain('<span className="label">scope</span>')
  })

  it('범위 값의 예시 표 — 종류마다 한 줄, 「프로젝트 전체」는 값이 없고, 있는 값은 데모 씨앗의 값이다', () => {
    expect(Object.keys(SCOPE_VALUE_EXAMPLE).sort()).toEqual([...SCOPE_KINDS].sort())
    expect(SCOPE_VALUE_EXAMPLE.project).toBe('')
    const seed = readFileSync(fileURLToPath(new URL('../src/lib/demo/seed.ts', import.meta.url)), 'utf8')
    for (const kind of SCOPE_KINDS) {
      const example = SCOPE_VALUE_EXAMPLE[kind]
      if (example === '') continue
      expect(example).toMatch(/^예: /)
      //  쳐 보면 실제로 걸리는 값이어야 한다 — 씨앗에 그 `kind`·`value` 쌍이 있다.
      const value = example.slice('예: '.length)
      expect(seed, `${kind} 의 예시 ${value} 가 데모 씨앗에 없다`).toContain(`scope: { kind: '${kind}', value: '${value}' }`)
    }
  })

  it('표 보기 — 열은 「종류 | 제목 | 범위 | 상태 | 근거 확신 | 근거 수 | 갱신」 이고 「개정」 열이 없다 (꼬리표가 말한다)', () => {
    const table = page.slice(page.indexOf('function ItemTable'), page.indexOf('function ItemDrawer'))
    const heads = [...table.matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1])
    expect(heads).toEqual(['종류', '제목', '범위', '상태', '근거 확신', '근거 수', '갱신'])
    expect(table).not.toMatch(/<td className="mono">\{item\.revision\}<\/td>/)
    //  행의 꼬리표에는 개정이 없다 — 드로어의 꼬리표에만 있다.
    expect(table).toContain('<CtxTag itemId={item.id} title={item.title} />')
    const drawer = page.slice(page.indexOf('function ItemDrawer'), page.indexOf('function editCaption'))
    expect(drawer).toContain('<CtxTag itemId={item.id} revision={item.revision} title={item.title} />')
    //  범위는 낱말 · 값 — 문서 보기와 같은 모양.
    expect(table).toContain('<span className="mono"> · {item.scope.value}</span>')
  })

  it('드로어 — 설명은 본문 색(ink-2)이고, 저장된 JSON 은 팀장(canEdit)에게만 「개발자용」으로 접혀 있다', () => {
    const drawer = page.slice(page.indexOf('function ItemDrawer'), page.indexOf('function editCaption'))
    expect(drawer).toContain('<p className="ink-2">{item.body}</p>')
    expect(drawer).not.toContain('<p className="ink-3">{item.body}</p>')
    expect(drawer).toMatch(/\{canEdit \? \(\s*<details>\s*<summary className="meta">저장된 값 그대로 \(개발자용\)<\/summary>/)
    expect(drawer).not.toContain('값 전체 보기')
  })

  it('발행 기록 — 사실 한 줄 바로 밑에 접혀 있고(「발행 기록 n건 · 마지막 날짜」), 「히스토리」는 없다', () => {
    const view = page.slice(page.indexOf('function ContextView'), page.indexOf('function FilterBar'))
    const factAt = view.indexOf('<FactLine')
    const recordAt = view.indexOf('<details className="card">')
    const listAt = view.indexOf('<ContextDoc')
    expect(factAt).toBeGreaterThan(-1)
    expect(recordAt).toBeGreaterThan(factAt)
    expect(listAt).toBeGreaterThan(recordAt)
    expect(view).toMatch(/<summary className="pad-sm text-section">\s*발행 기록 \{versions\.result\.data\.versions\.length\}건 · 마지막 \{dateText\(/)
    //  행이 없을 때는 접지 않고 같은 이름의 카드에서 빈 자리 문구(`context.versions`)를 말한다.
    expect(view).toContain('<h2 className="text-section">발행 기록</h2>')
    expect(view).toContain('<ScreenEmpty slot="context.versions" base={base} />')
    expect(page).not.toContain('버전 히스토리')
  })

  it('발행 직후 — 모달은 결과를 넘기고 화면이 문장을 만들며, 토스트에 [Pack 보기] 가 그 버전으로 간다', () => {
    expect(page).toContain('onDone(published)')
    expect(page).toContain('onDone: (published: Published) => void')
    expect(page).toContain('을 발행했습니다 · 파일 ${published.file_count}개 · 확인표 ${published.manifest_hash.slice(0, 8)}')
    expect(page).toContain('href={`${base}/packs/${toast.semver}`}>Pack 보기</a>')
    //  「manifest」는 화면에 없다 — 화면 7 과 같은 낱말 「확인표」다.
    expect(page).not.toMatch(/`[^`]*manifest [^`]*`/)
  })
})
