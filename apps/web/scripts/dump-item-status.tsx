import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ITEM_STATUSES, ITEM_STATUS_EXCLUDE_REASON, type ItemStatus } from '@contextops/schema'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라, tsx(esbuild)가 JSX 를
//    **옛 방식**(`React.createElement`)으로 바꾼다. 그 모듈에는 `React` import 가 없어서
//    전역에 꽂아 준 뒤에 불러온다 (`dump-conflict-card.tsx` 와 같은 함정).
//    ⛔ 제품 코드에 이 짓을 하지 마라. 여기는 눈으로 읽으려고 도는 스크립트다.
;(globalThis as { React?: unknown }).React = React
const { ItemStatusActions, ITEM_STATUS_ACTIONS } = await import('../src/components/item-status-actions')

// =====================================================================
//  화면 5 드로어의 **상태 바꾸기** 모양을 글자로 뽑는다 (loop/PROMPT.md ④2)
//
//  ★ 왜 스크립트인가 — 이 환경에 브라우저가 없다. 시험은 「이 문자열이 있나」까지만
//    말하고, **네 상태의 문구가 나란히 놓였을 때 읽히는지**는 사람이 읽어야 보인다.
//  실행: pnpm --filter web exec tsx scripts/dump-item-status.tsx
// =====================================================================

/** 태그를 지우고 사람이 읽는 글자만 남긴다 — 칸 사이는 ` | ` 로 가른다. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' | ')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/(\s*\|\s*)+/g, ' | ')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim()
}

function draw(status: ItemStatus, busy: ItemStatus | null = null, error: string | null = null): string {
  return text(renderToStaticMarkup(createElement(ItemStatusActions, {
    state: { status, busy, error }, onChange: () => {},
  })))
}

const lines: string[] = ['화면 5 드로어 — 상태 바꾸기 (마크업에서 글자만 뽑은 것)', '']

for (const status of ITEM_STATUSES) {
  lines.push(`지금 상태: ${status}`)
  lines.push(`  ${draw(status)}`)
  lines.push('')
}

lines.push('저장 중 · 실패')
lines.push(`  ${draw('draft', 'active')}`)
lines.push(`  ${draw('active', null, '항목이 그 사이 바뀌었다 — 다시 읽고 보내라')}`)
lines.push('')

lines.push('표가 정하는 것 — 어디로 갈 수 있나 · 그러면 Pack 이 어떻게 되나')
for (const status of ITEM_STATUSES) {
  const to = ITEM_STATUS_ACTIONS[status].map((a) => `${a.label}→${a.to}`).join(' · ')
  lines.push(`  ${status.padEnd(11)} ${to}`)
}
lines.push('')
lines.push('Pack 정본 (`ITEM_STATUS_EXCLUDE_REASON` · 컴파일러가 읽는 그 표)')
for (const status of ITEM_STATUSES) {
  const reason = ITEM_STATUS_EXCLUDE_REASON[status]
  lines.push(`  ${status.padEnd(11)} ${reason === null ? '(나간다)' : reason}`)
}

process.stdout.write(`${lines.join('\n')}\n`)
