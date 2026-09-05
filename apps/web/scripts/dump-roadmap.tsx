import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { STALE_REPORT_DAYS } from '../src/lib/web/time'
import type { ProgressEventView, Roadmap, RoadmapMilestone } from '../src/lib/web/queries'
import type { MilestoneRowHandlers, MilestoneRowState } from '../src/components/roadmap'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라, tsx(esbuild)가 JSX 를
//    **옛 방식**(`React.createElement`)으로 바꾼다. 그 모듈에는 `React` import 가 없어서
//    전역에 꽂아 준 뒤에 불러온다 (`dump-question-stack.tsx` 와 같은 이유).
;(globalThis as { React?: unknown }).React = React
const { MilestoneRow, OffRoadmap, ProgressDrawer, RoadmapSummary } = await import('../src/components/roadmap')

// =====================================================================
//  화면 8(Roadmap)의 모든 모양을 **글자로** 뽑는다 (loop/PROMPT.md ④2 「눈으로 읽는다」)
//
//  ★ 왜 스크립트인가 — 이 환경에 브라우저가 없다. 시험은 「이 문자열이 있나」까지만
//    말하고, **문장이 어색한지·같은 수를 두 번 그리는지·옆 화면의 말과 어긋나는지**는
//    사람이 읽어야 보인다 (54바퀴가 그렇게 거짓이 된 문장 하나를 잡았다).
//  실행: pnpm --filter web exec tsx scripts/dump-roadmap.tsx
// =====================================================================

const NOW = new Date('2026-09-06T12:00:00.000Z')
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString()

const NOOP: MilestoneRowHandlers = { onToggle: () => {}, onConfirm: () => {}, onEvidence: () => {} }

function event(over: Partial<ProgressEventView> = {}): ProgressEventView {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    status: 'criterion_done',
    summary: '재시도 상한을 상수로 뺐다',
    at: ago(8 * 60),
    source: 'agent',
    context_version: '1.0.0',
    evidence: [{ path: 'src/payment/retry.ts', start_line: 14, end_line: 20, commit_sha: '7d1b0e4aa11bb22cc33dd44ee55ff66aa77bb889' }],
    confirmed_at: null,
    ...over,
  }
}

function milestone(over: Partial<RoadmapMilestone> = {}): RoadmapMilestone {
  return {
    milestone: 'PL-M1',
    paths: ['src/payment/'],
    done_when: [
      { text: '재시도가 3회에서 멈춘다', evidence_count: 2, last_event: event() },
      { text: '실패가 로그에 남는다', evidence_count: 0, last_event: null },
    ],
    conflicts: 1,
    last_report_at: ago(8 * 60),
    status: 'in_progress',
    confirmable: null,
    ...over,
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

function row(over: Partial<MilestoneRowState>): string {
  return text(renderToStaticMarkup(createElement(MilestoneRow, {
    state: {
      milestone: milestone(), expanded: false, canConfirm: true, busy: false, error: null, now: NOW,
      ...over,
    },
    on: NOOP,
  })))
}

const lines: string[] = ['화면 8 — Roadmap 의 모든 모양 (마크업에서 글자만 뽑은 것)', '']

lines.push('◆ 상단 요약 4타일')
const ROADMAPS: [string, Roadmap][] = [
  ['① 보통 — 마일스톤 셋 · 하나는 조용하다', {
    context_version: '1.0.0',
    milestones: [
      milestone(),
      milestone({ milestone: 'PL-M2', last_report_at: ago(2 * 86400), status: 'done_candidate' }),
      milestone({ milestone: 'PL-M3', last_report_at: ago((STALE_REPORT_DAYS + 3) * 86400) }),
    ],
    off_roadmap: [], off_roadmap_total: 0,
  }],
  ['② 아무도 아직 손을 안 댔다', {
    context_version: '1.0.0',
    milestones: [milestone({ last_report_at: null, status: 'not_started', done_when: [{ text: '재시도가 3회에서 멈춘다', evidence_count: 0, last_event: null }] })],
    off_roadmap: [], off_roadmap_total: 0,
  }],
  ['③ 마일스톤이 하나도 없다 (roadmap 항목이 없는 Pack)', {
    context_version: '1.0.0', milestones: [], off_roadmap: [], off_roadmap_total: 0,
  }],
]
for (const [what, road] of ROADMAPS) {
  lines.push(`  ${what}`)
  lines.push(`    ${text(renderToStaticMarkup(createElement(RoadmapSummary, { roadmap: road, now: NOW })))}`)
}
lines.push('')

lines.push('◆ 마일스톤 행')
const ROWS: [string, Partial<MilestoneRowState>][] = [
  ['④ 접힘 · 진행 중', {}],
  ['⑤ 펼침 — 완료 조건마다 근거가 붙는다', { expanded: true }],
  ['⑥ 보고가 한 번도 없다', { milestone: milestone({ last_report_at: null, status: 'not_started', done_when: [{ text: '재시도가 3회에서 멈춘다', evidence_count: 0, last_event: null }] }), expanded: true }],
  [`⑦ ${STALE_REPORT_DAYS}일 넘게 조용하다`, { milestone: milestone({ last_report_at: ago((STALE_REPORT_DAYS + 3) * 86400) }) }],
  ['⑧ 확정 대기 · owner', {
    canConfirm: true,
    milestone: milestone({ status: 'done_candidate', confirmable: event({ status: 'done_candidate', summary: '재시도 정책을 다 지켰다' }) }),
  }],
  ['⑨ 확정 대기 · owner 아님 (버튼 대신 이유)', {
    canConfirm: false,
    milestone: milestone({ status: 'done_candidate', confirmable: event({ status: 'done_candidate', summary: '재시도 정책을 다 지켰다' }) }),
  }],
  ['⑩ 확정하는 중', {
    busy: true,
    milestone: milestone({ status: 'done_candidate', confirmable: event({ status: 'done_candidate' }) }),
  }],
  ['⑪ 확정 실패', {
    error: new Error('서버가 400 을 냈다'),
    milestone: milestone({ status: 'done_candidate', confirmable: event({ status: 'done_candidate' }) }),
  }],
  ['⑫ 확정됨 (done)', { milestone: milestone({ status: 'done' }) }],
  ['⑬ 완료 조건이 하나도 없다', { milestone: milestone({ done_when: [] }), expanded: true }],
]
for (const [what, over] of ROWS) {
  lines.push(`  ${what}`)
  lines.push(`    ${row(over)}`)
}
lines.push('')

lines.push('◆ 근거 드로어')
const EVENTS: [string, ProgressEventView][] = [
  ['⑭ 근거가 있다 (agent)', event()],
  ['⑮ 근거가 없다', event({ evidence: [] })],
  ['⑯ 훅이 보고했다 · 확정됨', event({ source: 'hook', status: 'done_candidate', confirmed_at: ago(60), context_version: '1.1.0' })],
  ['⑰ 사람이 적었다 · 줄 번호 없는 근거', event({ source: 'manual', evidence: [{ path: 'docs/goals.md' }] })],
]
for (const [what, e] of EVENTS) {
  lines.push(`  ${what}`)
  lines.push(`    ${text(renderToStaticMarkup(createElement(ProgressDrawer, { event: e, onClose: () => {}, now: NOW })))}`)
}
lines.push('')

lines.push('◆ 로드맵 외 작업 — `status:"none"` 이 화면에 나타나는 유일한 자리')
const OFF: [string, ProgressEventView[], number, boolean][] = [
  ['⑱ 접힘', [event({ status: 'none', summary: '로그인 리팩터링', evidence: [] })], 2, false],
  ['⑲ 펼침', [
    event({ id: 'a', status: 'none', summary: '로그인 리팩터링', evidence: [] }),
    event({ id: 'b', status: 'none', summary: '빌드 스크립트 정리', at: ago(3 * 3600) }),
  ], 2, true],
  ['⑳ 잘렸다', [event({ id: 'a', status: 'none', summary: '로그인 리팩터링', evidence: [] })], 25, true],
]
for (const [what, events, total, expanded] of OFF) {
  lines.push(`  ${what}`)
  lines.push(`    ${text(renderToStaticMarkup(createElement(OffRoadmap, {
    events, total, expanded, onToggle: () => {}, onEvidence: () => {}, now: NOW,
  })))}`)
}

process.stdout.write(`${lines.join('\n')}\n`)
