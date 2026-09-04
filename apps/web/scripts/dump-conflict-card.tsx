import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CONFLICT_KIND_RULES,
  type ConflictKind, type ContextItem, type SourceRef,
} from '@contextops/schema'

import type { ConflictCardHandlers, ConflictCardState } from '../src/components/conflict-card'
import type { ConflictCard as ConflictRow } from '../src/lib/web/queries'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라, tsx(esbuild)가 JSX 를
//    **옛 방식**(`React.createElement`)으로 바꾼다. 그 모듈에는 `React` import 가 없어서
//    전역에 꽂아 준 뒤에 불러온다 (`dump-question-stack.tsx` 와 같은 함정).
//    ⛔ 제품 코드에 이 짓을 하지 마라. 여기는 눈으로 읽으려고 도는 스크립트다.
;(globalThis as { React?: unknown }).React = React
const { ConflictCard } = await import('../src/components/conflict-card')

// =====================================================================
//  화면 4 의 충돌 카드 모양을 **글자로** 뽑는다 (loop/PROMPT.md ④2 「눈으로 읽는다」)
//
//  ★ 왜 스크립트인가 — 이 환경에 브라우저가 없다. 시험은 「이 문자열이 있나」까지만
//    말하고, **문장이 어색한지·같은 수를 두 번 그리는지**는 사람이 읽어야 보인다.
//  실행: pnpm --filter web exec tsx scripts/dump-conflict-card.tsx
// =====================================================================

const NOOP: ConflictCardHandlers = { onDraft: () => {}, onChoose: () => {}, onAnswer: () => {} }

const DOC_REF: SourceRef = {
  kind: 'source_document',
  document_version_id: '3f9c2e1a-0000-4000-8000-000000000000',
  start_char: 120, end_char: 480, heading_path: ['결제', '재시도'],
}
const CODE_REF: SourceRef = {
  kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts', start_line: 14, end_line: 30,
}

//  SPEC §10.1 의 paylab 픽스처가 만드는 어긋남 그대로다 (문서 5회 / 코드 3회).
function item(over: Partial<ContextItem> = {}): ContextItem {
  return {
    id: 'item_retry_doc',
    project_id: '00000000-0000-4000-8000-000000000000',
    type: 'policy',
    title: '결제 재시도는 5회까지',
    body: '결제 재시도는 지수 백오프로 최대 5회까지 한다.',
    status: 'active', scope: { kind: 'project' }, priority: 50,
    source_refs: [DOC_REF], tags: [], confidence: 'high', revision: 3,
    data: { rule: '결제 재시도 5회', severity: 'must', enforcement: 'review' },
    ...over,
  } as ContextItem
}

const CODE_ITEM = item({
  id: 'item_retry_code',
  title: '코드의 재시도는 3회',
  body: 'MAX_RETRY = 3 · 고정 500ms 대기.',
  source_refs: [CODE_REF],
  confidence: 'medium',
  revision: 1,
})

function row(kind: ConflictKind, over: Partial<ConflictRow> = {}): ConflictRow {
  const rule = CONFLICT_KIND_RULES[kind]
  return {
    id: `c-${kind}`,
    project_id: '00000000-0000-4000-8000-000000000000',
    kind,
    a_item_id: rule.anchor === 'items' ? 'item_retry_doc' : null,
    b_item_id: rule.anchor === 'items' && rule.needsB ? 'item_retry_code' : null,
    a_ref: rule.anchor === 'document' ? DOC_REF : null,
    b_ref: rule.anchor === 'document' && rule.needsB ? CODE_REF : null,
    question: '재시도 횟수 — 문서 5회 / 코드 3회. 어느 쪽이 맞나요?',
    severity: rule.detected ? 'high' : null,
    status: 'open', resolution: null, resolved_at: null,
    ...over,
  }
}

function base(over: Partial<ConflictCardState>): ConflictCardState {
  return {
    conflict: row('doc_vs_code'), canDecide: true, a: item(), b: CODE_ITEM,
    draft: '', busy: false, error: null, created: null, ...over,
  }
}

/** 태그를 지우고 사람이 읽는 글자만 남긴다 — 칸 사이는 ` | ` 로 가른다. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' | ')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/(\s*\|\s*)+/g, ' | ')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim()
}

const SHAPES: [string, Partial<ConflictCardState>][] = [
  ['① 문서↔코드 — 두 항목이 다 있다', {}],
  ['② 모순 (다른 버튼 문구)', { conflict: row('contradiction') }],
  ['③ 오래됨', { conflict: row('stale') }],
  ['④ 중복', { conflict: row('duplicate') }],
  ['⑤ 가리키는 항목을 못 찾았다', { a: null, b: null }],
  ['⑥ 메모를 쓰는 중', { draft: '8/4 QC 결과를 봤다.' }],
  ['⑦ 저장 중', { busy: true }],
  ['⑧ 저장 실패', { error: new Error('서버가 500 을 냈다') }],
  ['⑨ 결정됨 (메모 있음)', {
    conflict: row('doc_vs_code', {
      status: 'resolved', resolution: { choice: 'b', note: '코드가 맞다 — 문서를 고친다.' },
    }),
  }],
  ['⑩ 무시됨', {
    conflict: row('doc_vs_code', { status: 'dismissed', resolution: { choice: 'dismiss' } }),
  }],
  ['⑪ 열린 질문 (원문을 가리킨다)', {
    conflict: row('open_question', { question: 'MQTT 를 선택한 이유가 있나요?' }), a: null, b: null,
  }],
  ['⑫ 씨앗 질문 (가리킬 것이 없다)', {
    conflict: row('seed_question', { question: '이 프로젝트가 만드는 것은 무엇인가요?' }), a: null, b: null,
  }],
  ['⑬ 답 저장됨 — 항목이 생겼다', {
    conflict: row('seed_question', {
      question: '이 프로젝트가 만드는 것은 무엇인가요?',
      status: 'resolved', resolution: { choice: 'a', note: '결제를 안전하고 예측 가능하게 만든다.' },
    }),
    a: null, b: null, created: ['item_seed_mission'],
  }],
  ['⑭ 답 저장됨 — 항목이 안 생겼다', {
    conflict: row('open_question', {
      question: 'MQTT 를 선택한 이유가 있나요?',
      status: 'resolved', resolution: { choice: 'a', note: '기존 장비가 MQTT 만 지원한다.' },
    }),
    a: null, b: null, created: [],
  }],
  ['⑮ member 가 본 탐지 카드 (결정은 owner 몫)', { canDecide: false }],
]

const lines: string[] = ['화면 4 — 충돌 카드의 열다섯 모양 (마크업에서 글자만 뽑은 것)', '']
for (const [what, over] of SHAPES) {
  lines.push(what)
  lines.push(`  ${text(renderToStaticMarkup(createElement(ConflictCard, { state: base(over), on: NOOP })))}`)
  lines.push('')
}

lines.push('충돌 종류 6종 — 표가 정하는 것 셋 (anchor · detected · byAi)')
for (const [kind, rule] of Object.entries(CONFLICT_KIND_RULES)) {
  lines.push(`  ${kind.padEnd(14)} anchor=${rule.anchor.padEnd(9)} `
    + `물어보는 것=${rule.detected ? '결정 버튼 4개' : '답 칸'.padEnd(6)}  `
    + `배지=${rule.byAi ? 'AI 제안' : '없음'}`)
}

process.stdout.write(`${lines.join('\n')}\n`)
