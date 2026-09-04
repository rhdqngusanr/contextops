import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라, tsx(esbuild)가 JSX 를
//    **옛 방식**(`React.createElement`)으로 바꾼다. 그 모듈에는 `React` import 가 없어서
//    전역에 꽂아 준 뒤에 불러온다 (`dump-item-status.tsx` 와 같은 함정).
//    ⛔ 제품 코드에 이 짓을 하지 마라. 여기는 눈으로 읽으려고 도는 스크립트다.
;(globalThis as { React?: unknown }).React = React
const { StructureCandidates } = await import('../src/components/structure-candidates')
type Candidate = { id: string; type: string; title: string }

// =====================================================================
//  화면 3 의 **후보 고르기 카드** 모양을 글자로 뽑는다 (loop/PROMPT.md ④2 · ⑦3층)
//
//  ★ 왜 스크립트인가 — 이 환경에 브라우저가 없다. 시험은 「이 문자열이 있나」까지만
//    말하고, **다섯 줄이 나란히 놓였을 때 읽히는지**는 사람이 읽어야 보인다.
//    지난 바퀴들에 고친 화면 문구는 전부 이렇게 글자를 읽어서 나왔다.
//  실행: pnpm --filter web exec tsx scripts/dump-structure-candidates.tsx
// =====================================================================

/** 태그를 지우고 사람이 읽는 글자만 남긴다 — 칸 사이는 ` | ` 로 가른다. */
function text(html: string): string {
  return html
    .replace(/<input[^>]*checked[^>]*>/g, ' [v] ')
    .replace(/<input[^>]*>/g, ' [ ] ')
    .replace(/<[^>]+>/g, ' | ')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/(\s*\|\s*)+/g, ' | ')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim()
}

//  §7.1 이 paylab 문서 하나에서 낼 법한 후보 다섯. 타입이 섞여야 아이콘 줄이 읽히는지 보인다.
const CANDIDATES = [
  { id: 'item_doc_mission', type: 'mission', title: 'PSP 장애가 결제로 번지지 않게 한다' },
  { id: 'item_doc_retry', type: 'policy', title: '재시도 정책' },
  { id: 'item_doc_card', type: 'constraint', title: '카드 원본 정보를 저장하지 않는다' },
  { id: 'item_doc_m1', type: 'roadmap', title: 'M1 — 재시도 정책 통일' },
  { id: 'item_doc_ledger', type: 'architecture', title: '원장은 append-only 다' },
] as unknown as Candidate[]

const ALL = new Set(CANDIDATES.map((c) => c.id))

function draw(state: {
  candidates?: Candidate[]
  picked?: Set<string>
  saving?: boolean
  error?: string | null
  made?: number | null
}): string {
  return text(renderToStaticMarkup(createElement(StructureCandidates, {
    state: {
      candidates: (state.candidates ?? CANDIDATES) as never,
      picked: state.picked ?? ALL,
      saving: state.saving ?? false,
      error: state.error ?? null,
      made: state.made ?? null,
    },
    base: '/t/paylab/p/api',
    onToggle: () => {},
    onAccept: () => {},
  })))
}

const lines: string[] = ['화면 3 — 구조화 후보 고르기 (마크업에서 글자만 뽑은 것)', '']

lines.push('① 처음 — 기본은 전부 선택')
lines.push(`  ${draw({})}`)
lines.push('')

lines.push('② 둘을 빼고 셋만 남겼을 때 — 버튼의 수가 따라오나')
lines.push(`  ${draw({ picked: new Set(['item_doc_retry', 'item_doc_card', 'item_doc_m1']) })}`)
lines.push('')

lines.push('③ 하나도 안 고른 상태 — 버튼이 잠기나')
lines.push(`  ${draw({ picked: new Set() })}`)
lines.push('')

lines.push('④ 만드는 중')
lines.push(`  ${draw({ saving: true })}`)
lines.push('')

lines.push('⑤ 실패 — 서버 문장을 그대로 옮긴다')
lines.push(`  ${draw({ error: '이 작업을 할 권한이 없다' })}`)
lines.push('')

lines.push('⑥ 만든 뒤 — 「승인」이 아니라 「초안」이라고 말하나')
lines.push(`  ${draw({ made: 3 })}`)
lines.push('')

lines.push('⑦ 후보가 0개일 때 (빈 상태)')
lines.push(`  ${draw({ candidates: [] })}`)
lines.push('')

console.log(lines.join('\n'))
