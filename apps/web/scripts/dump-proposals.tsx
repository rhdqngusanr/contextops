import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PROPOSAL_STATUSES, TEAM_ROLES, type ContextItemDraft, type ContextItemView, type ProposalItem } from '@contextops/schema'

import type { ProposalDetail, ProposalRow, VersionRow } from '../src/lib/web/queries'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라, tsx(esbuild)가 JSX 를
//    **옛 방식**(`React.createElement`)으로 바꾼다. 그 모듈에는 `React` import 가 없어서
//    전역에 꽂아 준 뒤에 불러온다 (`dump-roadmap.tsx` 와 같은 이유).
;(globalThis as { React?: unknown }).React = React
const { ProposalDecisions, ProposalHead, ProposalItemCard, ProposalTable } =
  await import('../src/components/proposals')

// =====================================================================
//  화면 6(Proposals)의 모든 모양을 **글자로** 뽑는다 (loop/PROMPT.md ④2 「눈으로 읽는다」)
//
//  ★ 왜 스크립트인가 — 이 환경에 브라우저가 없다. 시험은 「이 문자열이 있나」까지만
//    말하고, **문장이 어색한지·같은 수를 두 번 그리는지·옆 화면의 말과 어긋나는지**는
//    사람이 읽어야 보인다.
//  실행: pnpm --filter web exec tsx scripts/dump-proposals.tsx
// =====================================================================

const BASE_VERSION_ID = '00000000-0000-4000-8000-0000000000b1'

const DRAFT: ContextItemDraft = {
  id: 'item_retry_policy',
  type: 'policy',
  title: '결제 재시도 정책',
  body: '재시도는 3회까지.\n간격은 지수 백오프.\nPII 는 로그에 남기지 않는다.',
  scope: { kind: 'project' },
  priority: 50,
  source_refs: [{ kind: 'manual', note: '팀 결정' }],
  tags: [],
  confidence: 'high',
  data: { rule: '재시도는 3회까지', severity: 'must', enforcement: 'review' },
}

function item(over: Partial<ProposalItem> = {}): ProposalItem {
  return {
    operation: 'update',
    target_item_id: 'item_retry_policy',
    draft: DRAFT,
    evidence: [{
      kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts',
      start_line: 14, end_line: 20, commit_sha: '7d1b0e4aa11bb22cc33dd44ee55ff66aa77bb889',
    }],
    reason: '코드가 3회에서 멈춘다 — 문서를 코드에 맞춘다',
    ...over,
  }
}

const TARGET = {
  id: 'item_retry_policy',
  project_id: '00000000-0000-4000-8000-0000000000c1',
  type: 'policy',
  title: '결제 재시도 정책',
  body: '재시도는 5회까지.\n간격은 고정 500ms.\nPII 는 로그에 남기지 않는다.',
  status: 'active',
  scope: { kind: 'project' },
  priority: 50,
  source_refs: [{ kind: 'manual', note: '문서에서' }],
  tags: [],
  confidence: 'medium',
  revision: 3,
  updated_at: '2026-08-04T00:00:00.000Z',
  data: { rule: '재시도는 5회까지', severity: 'must', enforcement: 'review' },
} as ContextItemView

function row(over: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: '00000000-0000-4000-8000-0000000000a1',
    project_id: '00000000-0000-4000-8000-0000000000c1',
    author_id: '00000000-0000-4000-8000-0000000000d1',
    status: 'submitted',
    title: '재시도 정책을 코드에 맞춘다',
    summary: '문서는 5회인데 코드가 3회다.',
    base_version_id: BASE_VERSION_ID,
    items: [item()],
    relates_to: ['PL-M1'],
    client_request_id: '00000000-0000-4000-8000-0000000000e1',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: '2026-09-05T02:00:00.000Z',
    ...over,
  }
}

function detail(over: Partial<ProposalDetail> = {}): ProposalDetail {
  return { ...row(), targets: [TARGET], ...over }
}

const VERSION: VersionRow = {
  id: BASE_VERSION_ID,
  semver: '1.2.0',
  snapshot_hash: '3f9c2e1a'.repeat(8),
  published_by: '00000000-0000-4000-8000-0000000000f1',
  published_at: '2026-09-01T00:00:00.000Z',
  change_summary: null,
  is_official: true,
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

const lines: string[] = ['화면 6 — Proposals 의 모든 모양 (마크업에서 글자만 뽑은 것)', '']

lines.push('◆ 목록')
lines.push(`  ① 상태 5종 — ${text(renderToStaticMarkup(createElement(ProposalTable, {
  proposals: PROPOSAL_STATUSES.map((status, i) => row({ id: `p${i}`, status, title: `${status} 인 제안` })),
  hrefOf: (p: ProposalRow) => `/t/a/p/b/proposals/${p.id}`,
  emptyMessage: '없다',
})))}`)
lines.push(`  ② 빈 목록 — ${text(renderToStaticMarkup(createElement(ProposalTable, {
  proposals: [],
  hrefOf: (p: ProposalRow) => `/t/a/p/b/proposals/${p.id}`,
  emptyMessage: '아직 올라온 제안이 없습니다. Claude Code에서 /contextops:propose 를 실행하면 여기에 쌓입니다.',
})))}`)
lines.push('')

lines.push('◆ 상세 머리')
const HEADS: [string, ProposalDetail, VersionRow | null][] = [
  ['③ 기준 버전을 찾음', detail(), VERSION],
  ['④ 기준 버전을 못 찾음', detail(), null],
  ['⑤ 기준이 아예 없음', detail({ base_version_id: null }), null],
  ['⑥ 거절됨 · 사유', detail({
    status: 'rejected', decision_note: '근거가 한 건뿐이다. 코드 쪽 근거를 하나 더 붙여 주세요.',
    decided_at: '2026-09-05T03:00:00.000Z',
  }), VERSION],
]
for (const [what, proposal, base] of HEADS) {
  lines.push(`  ${what}`)
  lines.push(`    ${text(renderToStaticMarkup(createElement(ProposalHead, { proposal, base })))}`)
}
lines.push('')

lines.push('◆ 항목 카드 — 연산 3종 · 없는 것들')
const ITEMS: [string, ProposalItem, ContextItemView | undefined][] = [
  ['⑦ update — 지금 항목과 견준다', item(), TARGET],
  ['⑧ add — before 가 없다', item({ operation: 'add', target_item_id: undefined }), undefined],
  ['⑨ deprecate — after 가 없다', item({ operation: 'deprecate', draft: undefined }), TARGET],
  ['⑩ 대상을 못 찾았다', item(), undefined],
  ['⑪ 바꿀 본문이 없다', item({ draft: undefined }), TARGET],
  ['⑫ 근거가 0건이다', item({ evidence: [] }), TARGET],
  ['⑬ 본문이 그대로다', item({ draft: { ...DRAFT, body: TARGET.body } }), TARGET],
]
for (const [what, one, target] of ITEMS) {
  lines.push(`  ${what}`)
  lines.push(`    ${text(renderToStaticMarkup(createElement(ProposalItemCard, { item: one, target, index: 0 })))}`)
}
lines.push('')

lines.push('◆ 결정 — 상태 5종 × 등급 2종')
for (const status of PROPOSAL_STATUSES) {
  for (const role of TEAM_ROLES) {
    lines.push(`  ${status} / ${role} — ${text(renderToStaticMarkup(createElement(ProposalDecisions, {
      state: { status, role, note: '', busy: null },
      onNote: () => {}, onDecide: () => {},
    })))}`)
  }
}
lines.push(`  submitted / owner · 사유를 적은 뒤 — ${text(renderToStaticMarkup(createElement(ProposalDecisions, {
  state: { status: 'submitted', role: 'owner', note: '근거가 한 건뿐이다', busy: null },
  onNote: () => {}, onDecide: () => {},
})))}`)
lines.push(`  submitted / owner · 보내는 중 — ${text(renderToStaticMarkup(createElement(ProposalDecisions, {
  state: { status: 'submitted', role: 'owner', note: '사유', busy: 'approve' },
  onNote: () => {}, onDecide: () => {},
})))}`)

process.stdout.write(`${lines.join('\n')}\n`)
