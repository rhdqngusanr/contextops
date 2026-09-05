import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { SEED_QUESTIONS } from '../src/lib/api/seed-questions'
import type { QuestionStackHandlers, QuestionStackState } from '../src/components/question-stack'
import type { QuestionRow } from '../src/lib/web/queries'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라, tsx(esbuild)가 JSX 를
//    **옛 방식**(`React.createElement`)으로 바꾼다. 그 모듈에는 `React` import 가 없어서
//    전역에 꽂아 준 뒤에 불러온다 — 시험(vitest)은 자동 런타임이라 이 문제가 없다.
//    ⛔ 제품 코드에 이 짓을 하지 마라. 여기는 눈으로 읽으려고 도는 스크립트다.
;(globalThis as { React?: unknown }).React = React
const { QuestionStack } = await import('../src/components/question-stack')

// =====================================================================
//  질문 카드 스택의 열 모양을 **글자로** 뽑는다 (loop/PROMPT.md ④2 「눈으로 읽는다」)
//
//  ★ 왜 스크립트인가 — 이 환경에 브라우저가 없다. 시험은 「이 문자열이 있나」까지만
//    말하고, **문장이 어색한지·같은 수를 두 번 그리는지**는 사람이 읽어야 보인다
//    (23바퀴에 고친 둘이 그렇게 나왔다).
//  실행: pnpm --filter web exec tsx scripts/dump-question-stack.tsx
// =====================================================================

const NOOP: QuestionStackHandlers = {
  onDraft: () => {}, onNext: () => {}, onSaveAs: () => {}, onBack: () => {}, onSave: () => {},
}

const QUESTIONS: QuestionRow[] = SEED_QUESTIONS.map((q, i) => ({
  id: `0000000${i}-0000-4000-8000-000000000000`,
  kind: 'seed_question',
  question: q.question,
  status: 'open',
}))

//  🔴 **문서를 올린 뒤의 스택** — §7.1 이 남긴 열린 질문이 씨앗 질문에 섞인다.
//     이 모양이 FINDINGS 106 이 가리킨 자리다: 씨앗만 있을 때는 「답한 것 = 항목」이
//     참이라 아무도 못 봤다.
const OPEN: QuestionRow[] = [
  { id: 'aaaaaaa0-0000-4000-8000-000000000000', kind: 'open_question', status: 'open',
    question: 'MQTT 를 고른 이유가 있나요?' },
  { id: 'aaaaaaa1-0000-4000-8000-000000000000', kind: 'open_question', status: 'open',
    question: '환불 SLA 는 몇 시간인가요?' },
]
const MIXED: QuestionRow[] = [...QUESTIONS.slice(0, 2), ...OPEN]

function answered(n: number): Record<string, string> {
  return Object.fromEntries(QUESTIONS.slice(0, n).map((q) => [q.id, '그렇게 한다.']))
}

function base(over: Partial<QuestionStackState>): QuestionStackState {
  return {
    questions: QUESTIONS, index: 0, answers: {}, saveAs: {}, draft: '',
    saving: false, error: null, saved: null, ...over,
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

const SHAPES: [string, Partial<QuestionStackState>][] = [
  ['① 답할 것이 없다', { questions: [] }],
  ['② 첫 카드 (빈 칸)', { index: 0 }],
  ['③ 중간 카드 (쓰는 중)', { index: 2, draft: '결제를 안전하고 예측 가능하게 만든다.', answers: answered(2) }],
  ['④ 마지막 카드', { index: QUESTIONS.length - 1, draft: '그렇다.', answers: answered(9) }],
  ['⑤ 요약 (3 답 · 7 건너뜀)', { index: QUESTIONS.length, answers: answered(3) }],
  ['⑥ 요약 (하나도 안 답함)', { index: QUESTIONS.length, answers: {} }],
  ['⑦ 저장 중', { index: QUESTIONS.length, answers: answered(3), saving: true }],
  ['⑧ 저장 실패', { index: QUESTIONS.length, answers: answered(3), error: new Error('서버가 500 을 냈다') }],
  ['⑨ 결과 — 항목이 생겼다', { saved: { resolved: 3, created: ['item_seed_mission', 'item_seed_goal_quarter'] } }],
  ['⑩ 결과 — 항목이 안 생겼다', { saved: { resolved: 2, created: [] } }],
  ['⑪ 열린 질문 카드 — 자리를 안 골랐다 (FINDINGS 106)',
    { questions: MIXED, index: 2, draft: '지연이 낮고 배터리를 덜 쓴다.' }],
  ['⑪-B 열린 질문 카드 — 자리를 골랐다',
    { questions: MIXED, index: 2, draft: '지연이 낮고 배터리를 덜 쓴다.',
      saveAs: { [OPEN[0]!.id]: 'constraint' } }],
  ['⑫ 섞인 요약 — 넷 답하고 하나만 자리를 골랐다',
    { questions: MIXED, index: MIXED.length, saveAs: { [OPEN[0]!.id]: 'goal' },
      answers: Object.fromEntries(MIXED.map((q) => [q.id, '그렇게 한다.'])) }],
  ['⑬ 섞인 요약 — 열린 질문만 답하고 아무 자리도 안 골랐다',
    { questions: OPEN, index: OPEN.length,
      answers: Object.fromEntries(OPEN.map((q) => [q.id, '그렇게 한다.'])) }],
]

const lines: string[] = ['화면 3 ③ — 질문 카드 스택의 열 모양 (마크업에서 글자만 뽑은 것)', '']
for (const [what, over] of SHAPES) {
  lines.push(what)
  lines.push(`  ${text(renderToStaticMarkup(createElement(QuestionStack, {
    state: base(over), on: NOOP, contextHref: '/t/paylab/p/api/context',
  })))}`)
  lines.push('')
}
lines.push('씨앗 질문 10개 — 답이 가는 자리')
for (const q of SEED_QUESTIONS) lines.push(`  ${q.question}  →  ${q.type} · item_seed_${q.id} · 「${q.title}」`)

process.stdout.write(`${lines.join('\n')}\n`)
