import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SYNC_STATUSES } from '@contextops/schema'

import type { DeviceSyncRow, VersionRow } from '../src/lib/web/queries'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라, tsx(esbuild)가 JSX 를
//    **옛 방식**(`React.createElement`)으로 바꾼다. 그 모듈에는 `React` import 가 없어서
//    전역에 꽂아 준 뒤에 불러온다 (`dump-proposals.tsx` 와 같은 이유).
;(globalThis as { React?: unknown }).React = React
const { DeviceTable, SyncLegend, SyncSummary } = await import('../src/components/sync')
const { ScreenEmpty } = await import('../src/components/states')

// =====================================================================
//  화면 9(Sync)의 모든 모양을 **글자로** 뽑는다 (loop/PROMPT.md ④2 「눈으로 읽는다」)
//
//  ★ 왜 스크립트인가 — 이 환경에 브라우저가 없다. 시험은 「이 문자열이 있나」까지만
//    말하고, **문장이 어색한지·같은 수를 두 번 그리는지·옆 화면의 말과 어긋나는지**는
//    사람이 읽어야 보인다.
//  실행: pnpm --filter web exec tsx scripts/dump-sync.tsx
// =====================================================================

/** 시계를 고정한다 — 「8분 전」이 매일 갈리면 근거가 아니라 달력이 된다. */
const NOW = new Date('2026-09-06T12:00:00.000Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

function device(over: Partial<DeviceSyncRow> = {}): DeviceSyncRow {
  return {
    device_id: '00000000-0000-4000-8000-000000000001',
    device_name: 'mac-노트북',
    user: { id: '00000000-0000-4000-8000-0000000000aa', name: '김결제' },
    status: 'applied',
    version: '1.2.0',
    manifest_hash: 'a'.repeat(64),
    reported_at: ago(8 * 60_000),
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

//  DESIGN_BRIEF §4 화면 9 의 예시 12행: applied 9 / outdated 2 / manual 1.
//  ⚠ 거기에 **보고 없음 1**을 더한다 — 예시에는 없지만 서버가 실제로 만드는 상태이고
//    (`statusOfDevice`), 화면이 그것을 어떻게 그리는지가 이 덤프의 요점 중 하나다.
const TEAM: DeviceSyncRow[] = [
  ...Array.from({ length: 9 }, (_, i) => device({
    device_id: `a${i}`, device_name: `mac-${i}`, user: { id: `u${i}`, name: `팀원${i}` },
  })),
  device({
    device_id: 'b0', device_name: 'win-회의실', user: { id: 'u9', name: '이정산' },
    status: 'outdated', version: '1.1.0', reported_at: ago(4 * 86_400_000),
  }),
  device({
    device_id: 'b1', device_name: 'wsl-데스크탑', user: { id: 'u10', name: '박환불' },
    status: 'outdated', version: '1.1.0', reported_at: ago(9 * 3600_000),
  }),
  device({
    device_id: 'c0', device_name: 'mac-외주', user: { id: 'u11', name: '최연동' },
    status: 'manual', version: '1.2.0', reported_at: ago(40 * 60_000),
  }),
  device({
    device_id: 'd0', device_name: 'win-신입', user: { id: 'u12', name: '한신입' },
    status: 'unknown', version: null, manifest_hash: null, reported_at: null,
  }),
]

const lines: string[] = ['화면 9 — Sync 의 모든 모양 (마크업에서 글자만 뽑은 것)', '']

//  공식 v1.2.0 — outdated 둘(v1.1.0)이 「무엇으로 맞춰야 하나」를 이 한 칸에서 읽는다 (FINDINGS 118).
const OFFICIAL: VersionRow = {
  id: '00000000-0000-4000-8000-0000000000v1',
  semver: '1.2.0',
  snapshot_hash: 'b'.repeat(64),
  published_by: '00000000-0000-4000-8000-0000000000aa',
  published_at: ago(3 * 86_400_000),
  change_summary: null,
  is_official: true,
}

lines.push('◆ 상단 요약')
lines.push(`  ① 팀 13대 · 공식 v1.2.0 — ${text(renderToStaticMarkup(createElement(SyncSummary, { devices: TEAM, official: OFFICIAL })))}`)
lines.push(`  ② 전부 applied — ${text(renderToStaticMarkup(createElement(SyncSummary, {
  devices: [device(), device({ device_id: '2' })], official: OFFICIAL,
})))}`)
lines.push(`  ③ 기기 0대 · 공식 없음 — ${text(renderToStaticMarkup(createElement(SyncSummary, { devices: [], official: null })))}`)
lines.push(`  ④ 버전 표를 아직 못 읽음 — ${text(renderToStaticMarkup(createElement(SyncSummary, { devices: TEAM })))}`)
lines.push('')

lines.push('◆ 표 — 실제 팀 모양 (급한 것이 위다)')
for (const line of text(renderToStaticMarkup(createElement(DeviceTable, {
  devices: TEAM, empty: null, now: NOW,
}))).split(' | ')) {
  lines.push(`    ${line}`)
}
lines.push('')

lines.push('◆ 상태 5종을 한 줄씩 (값을 바꾸면 무엇이 갈리나)')
for (const status of SYNC_STATUSES) {
  const one = device({
    device_name: `기기-${status}`,
    user: { id: 'u', name: '김결제' },
    status,
    version: status === 'unknown' ? null : '1.2.0',
    manifest_hash: status === 'unknown' ? null : 'a'.repeat(64),
    reported_at: status === 'unknown' ? null : ago(8 * 60_000),
  })
  lines.push(`  ${status} — ${text(renderToStaticMarkup(createElement(DeviceTable, {
    devices: [one], empty: null, now: NOW,
  })))}`)
}
lines.push('')

lines.push('◆ 시각이 지날수록')
for (const [what, ms] of [['방금', 10_000], ['8분', 8 * 60_000], ['9시간', 9 * 3600_000], ['4일', 4 * 86_400_000]] as const) {
  lines.push(`  ${what} — ${text(renderToStaticMarkup(createElement(DeviceTable, {
    devices: [device({ reported_at: ago(ms) })], empty: null, now: NOW,
  })))}`)
}
lines.push('')

lines.push('◆ 빈 상태')
lines.push(`  ${text(renderToStaticMarkup(createElement(DeviceTable, {
  devices: [],
  empty: createElement(ScreenEmpty, { slot: 'sync.devices', base: '/t/paylab/p/api' }),
  now: NOW,
})))}`)
lines.push('')

lines.push('◆ 각주 (색이 아니라 글자로 한 번 더)')
lines.push(`  ${text(renderToStaticMarkup(createElement(SyncLegend)))}`)

process.stdout.write(`${lines.join('\n')}\n`)
