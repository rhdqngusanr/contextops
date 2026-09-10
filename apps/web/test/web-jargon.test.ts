import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Jargon } from '../src/components/jargon'
import { DEMO_PROPOSALS } from '../src/lib/demo/seed-demo'
import { RECORDED_CONFLICTS, STALE_RULES, paylabDrafts } from '../src/lib/demo/seed'
import { JARGON, explain } from '../src/lib/web/jargon'

// =====================================================================
//  낱말 풀이 표가 **실제로 데모의 글자에 나오는 낱말만** 담는다 (2026-09-10 저녁)
//  ★ 왜 — 아무 데도 안 나오는 풀이는 「정의만 있고 아무 일도 안 하는 것」이다 (CLAUDE.md). 씨앗이 바뀌어 낱말이 사라지면
//    여기서 빨개진다 — 그때 표에서도 지운다.
// =====================================================================

const fixtures = join(fileURLToPath(new URL('..', import.meta.url)), '..', '..', 'fixtures')

/** 데모가 화면에 올리는 글자 전부 — 항목(제목·설명·규칙·근거 인용) · 폐기 규칙 · 제안 · 실측 충돌 질문. */
function corpus(): string {
  const goals = readFileSync(join(fixtures, 'paylab-docs', 'goals.md'), 'utf8')
  const roadmap = readFileSync(join(fixtures, 'paylab-docs', 'old-roadmap.md'), 'utf8')
  const retry = readFileSync(join(fixtures, 'paylab-api', 'src', 'payment', 'retry.ts'), 'utf8')
  const drafts = paylabDrafts(
    { file: 'paylab-docs/goals.md', versionId: 'jargon-test', text: goals },
    { repo: 'paylab-api', path: 'src/payment/retry.ts', text: retry },
    { file: 'paylab-docs/old-roadmap.md', versionId: 'jargon-test-old', text: roadmap },
  )
  return [JSON.stringify(drafts), JSON.stringify(STALE_RULES), JSON.stringify(DEMO_PROPOSALS), JSON.stringify(RECORDED_CONFLICTS)].join('\n')
}

describe('낱말 풀이 표', () => {
  it('모든 낱말이 데모의 글자에 실제로 나온다 — 죽은 풀이가 없다', () => {
    const text = corpus()
    for (const j of JARGON) expect(j.match.test(text), `「${j.term}」는 데모 어디에도 안 나온다 — 표에서 지워라`).toBe(true)
  })

  it('낱말과 뜻이 비어 있지 않고, 뜻은 사람 말(한글)이다', () => {
    for (const j of JARGON) {
      expect(j.term.length).toBeGreaterThan(0)
      expect(j.means, j.term).toMatch(/[가-힣]/)
    }
    expect(new Set(JARGON.map((j) => j.term)).size).toBe(JARGON.length)
  })

  it('나오는 차례로, 한 번씩 — 없으면 빈 목록', () => {
    const hits = explain('네트워크 오류와 5xx 만 재시도한다 — PSP 호출은 지수 백오프 · 5xx 다시')
    expect(hits.map((h) => h.term)).toEqual(['5xx', 'PSP', '지수 백오프'])
    expect(explain('여기엔 아무 개발자 낱말도 없다')).toEqual([])
  })

  it('조각은 낱말이 없으면 아무것도 안 그리고, 있으면 「낱말 풀이」 이름표로 그린다', () => {
    expect(renderToStaticMarkup(createElement(Jargon, { text: '그냥 문장' }))).toBe('')
    const html = renderToStaticMarkup(createElement(Jargon, { text: 'PSP 호출은 최대 5회' }))
    expect(html).toContain('낱말 풀이')
    expect(html).toContain('<b>PSP</b>')
    expect(html).toContain('결제사')
  })
})
