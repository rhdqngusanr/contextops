import { register } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라 tsx(esbuild)가 JSX 를
//    옛 방식(`React.createElement`)으로 바꾼다 — 전역에 꽂은 뒤에 불러온다 (`dump-sync.tsx`).
;(globalThis as { React?: unknown }).React = React
//  ⚠ 랜딩은 `landing.module.css` 를 들여온다 — Node 는 `.css` 를 모른다. 여기서만
//    클래스 이름을 그대로 돌려주는 빈 모듈로 바꿔 끼운다 (vitest 는 스스로 그렇게 한다).
register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, next) {
  if (url.endsWith('.css')) {
    return { format: 'module', shortCircuit: true,
      source: 'export default new Proxy({}, { get: (_, k) => String(k) })' }
  }
  return next(url, context)
}`)}`)
const { Landing, BEFORE_AFTER, INSTALL_STEPS } = await import('../src/components/landing')

// =====================================================================
//  🔴 **랜딩이 실제로 말하는 것을 글자로 뽑는다** (loop/PROMPT.md ④2 · ⑦3층)
//
//  ★ 이 환경에 브라우저가 없다. 캡처 대신 마크업을 글자로 펴서 **문장 순서대로** 읽는다 —
//    「심사위원이 10초 안에 문제를 이해하나」는 문장의 차례가 정한다.
//  ⚠ 이 덤프가 못 재는 것: 간격·색·「스크롤 없이 첫 화면에 A·B·C 가 보이나」.
//    그건 사람이 시크릿 창에서 한 번 밟아야 한다 (GATE 3 · docs/STATUS.md 「눈 판정 대기」).
//
//  실행: pnpm --filter web exec tsx scripts/dump-landing.tsx
// =====================================================================

function text(html: string): string {
  return html
    .replace(/<\/(h1|h2|h3|p|li|tr|section|header|footer|pre|div)>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 0).join('\n')
}

function head(title: string): void {
  console.log('')
  console.log(`◆ ${title}`)
  console.log('─'.repeat(72))
}

const html = renderToStaticMarkup(<Landing />)

head('랜딩 `/` — 문장 순서대로')
for (const line of text(html).split('\n')) console.log(`  ${line}`)

head('잰 것')
console.log(`  accent(btn-primary) 수: ${(html.match(/btn-primary/g) ?? []).length}`)
console.log(`  <button> 수: ${(html.match(/<button/g) ?? []).length} · href="#" 수: ${(html.match(/href="#"/g) ?? []).length}`)
console.log(`  「실시간」: ${String(html.includes('실시간'))} · 「영상」: ${String(html.includes('영상'))} · 「npx contextops」: ${String(html.includes('npx contextops'))}`)
console.log(`  After 의 답 = 데모 v1.1.0 의 item_policy_retry (시험이 잰다): ${BEFORE_AFTER.after.text}`)
console.log(`  설치 줄 ${INSTALL_STEPS.lines.length}개 · 링크: ${[...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]).join(' · ')}`)
console.log(`  마크업 길이: ${html.length}자`)
