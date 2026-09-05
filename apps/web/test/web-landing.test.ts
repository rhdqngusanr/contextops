import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  BEFORE_AFTER, INSTALL_STEPS, LANDING_HEAD, Landing, TRUST_BOUNDARY, skillNamesIn,
} from '../src/components/landing'
import { DEMO_PROPOSALS } from '../scripts/demo-seed'
import { paylabDrafts } from '../scripts/seed'

// =====================================================================
//  🔴 화면 1(랜딩)을 **그려서 읽는다** (loop/PROMPT.md ⑦3층 · DESIGN_BRIEF §4 「화면 1」)
//
//  재는 것:
//    ① 🔴 **정적이다** — 세션을 읽는 코드가 0줄이다. 시크릿 창의 첫 화면이 하나뿐이어야
//      GATE 3 이 선다 (SPEC §9 표의 「상태」 칸)
//    ② A·B·C 가 전부 있다 — 헤드라인 · Before/After · [샘플 팀으로 둘러보기]
//    ③ 🔴 accent 는 **하나**이고 그것이 `/demo` 로 간다 (그 화면이 실제로 있다)
//    ④ 누르면 아무 일도 안 하는 것이 없다 — `href="#"` 도 `<button>` 도 없다
//      (영상이 없으니 [2분 영상 보기] 도 없다)
//    ⑤ 🔴 **Before/After 는 픽스처의 사실이다** — After 의 답은 게스트가 v1.1.0 에서 보는
//      `item_policy_retry` 의 `data.rule`(승인된 제안 · `DEMO_PROPOSALS`)과 글자 그대로 같고,
//      Before 의 두 답은 씨앗 초안의 근거 둘(문서 §3.1 · `retry.ts:11`)이 실제로 말하는
//      것이다. 첫 화면부터 근거 없는 줄이 없어야 한다 (P7 의 정신)
//    ⑥ 신뢰 경계 표의 「모르는 것」이 P1 의 넷을 전부 덮는다
//    ⑦ 설치 줄의 `/contextops:…` 는 실제 Skill 이고, 부르는 CLI 파일이 실제로 있다
//    ⑧ 「실시간」이라는 낱말이 없다 · 표와 코드는 `scroll-x` 안이다
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴·「스크롤 없이 첫 화면에 보이나」.
//    그건 브라우저 캡처가 있어야 한다 (docs/STATUS.md 「눈 판정 대기」).
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const fixtures = join(repoRoot, 'fixtures')

function html(): string {
  return renderToStaticMarkup(createElement(Landing))
}

/** 랜딩이 말하는 항목을 씨앗과 **같은 함수**로 만든다 — 손으로 다시 적으면 갈린다. */
function retryDraft() {
  const goalsText = readFileSync(join(fixtures, 'paylab-docs', 'goals.md'), 'utf8')
  const retryText = readFileSync(join(fixtures, 'paylab-api', 'src', 'payment', 'retry.ts'), 'utf8')
  const drafts = paylabDrafts(
    { file: 'paylab-docs/goals.md', versionId: 'landing-test', text: goalsText },
    { repo: 'paylab-api', path: 'src/payment/retry.ts', text: retryText },
  )
  const found = drafts.find((d) => (d.draft as { id?: string }).id === BEFORE_AFTER.after.itemId)
  if (!found) throw new Error(`씨앗에 ${BEFORE_AFTER.after.itemId} 가 없다`)
  return { ...found, retryText }
}

describe('🔴 ① 랜딩은 정적이다 — 세션을 읽지 않는다', () => {
  it.each(['src/app/page.tsx', 'src/components/landing.tsx'])('%s 에 클라이언트 코드가 없다', (file) => {
    //  주석은 뺀다 — 「여기엔 'use client' 가 없다」는 주석 자체가 걸리면 안 된다.
    const src = readFileSync(join(webRoot, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(src).not.toContain("'use client'")
    expect(src).not.toMatch(/readSession|useEffect|useState|localStorage/)
  })
})

describe('② 첫 화면에 A·B·C 가 있다', () => {
  it('헤드라인 · 부제 · 작은 줄', () => {
    const out = html()
    expect(out).toContain(LANDING_HEAD.title)
    expect(out).toContain(LANDING_HEAD.subtitle)
    expect(out).toContain(LANDING_HEAD.note)
  })

  it('Before 의 두 답과 After 의 답이 전부 그려진다', () => {
    const out = html()
    for (const a of BEFORE_AFTER.before.answers) expect(out).toContain(a.text)
    expect(out).toContain(BEFORE_AFTER.after.text)
    expect(out).toContain(BEFORE_AFTER.before.foot)
    expect(out).toContain(BEFORE_AFTER.after.foot)
    //  After 에는 역추적 태그가 보인다 — 「이 답은 어디서 왔나」가 첫 화면에 있다 (P7).
    expect(out).toContain(`ctx:${BEFORE_AFTER.after.itemId}`)
  })
})

describe('🔴 ③ accent 는 하나 — [샘플 팀으로 둘러보기] → /demo', () => {
  it('btn-primary 가 정확히 하나이고 href 가 /demo 다', () => {
    const out = html()
    const primaries = out.match(/class="btn btn-primary"/g) ?? []
    expect(primaries).toHaveLength(1)
    expect(out).toContain(`<a class="btn btn-primary" href="${LANDING_HEAD.cta.href}">${LANDING_HEAD.cta.label}</a>`)
    expect(LANDING_HEAD.cta.href).toBe('/demo')
  })

  it('그 주소에 화면이 실제로 있다 — 없는 곳으로 보내면 「고장」으로 읽힌다', () => {
    expect(existsSync(join(webRoot, 'src', 'app', 'demo', 'page.tsx'))).toBe(true)
  })

  it('로그인 화면의 「심사위원이신가요?」도 같은 주소로 간다 (게스트 입구는 하나다)', () => {
    const login = readFileSync(join(webRoot, 'src', 'app', 'login', 'page.tsx'), 'utf8')
    expect(login).toContain('href="/demo"')
    expect(login).not.toContain('준비 중')
  })
})

describe('④ 누르면 아무 일도 안 하는 것이 없다', () => {
  it('href="#" 이 없고 <button> 이 없다 (정적 화면에는 링크뿐이다)', () => {
    const out = html()
    expect(out).not.toContain('href="#"')
    expect(out).not.toContain('<button')
  })

  it('영상이 없으니 [2분 영상 보기] 도 없다', () => {
    expect(html()).not.toContain('영상')
  })

  it('모든 링크가 앱 안 주소다', () => {
    const hrefs = [...html().matchAll(/href="([^"]*)"/g)].map((m) => m[1] as string)
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) expect(h, h).toMatch(/^\//)
  })
})

describe('🔴 ⑤ Before/After 는 paylab 픽스처의 사실이다 (SPEC §10.1 · scripts/seed.ts)', () => {
  it('After 의 답은 데모 v1.1.0 에 실린 승인 제안의 data.rule 과 글자 그대로 같다', () => {
    //  ★ 씨앗(v1.0.0)이 아니라 **published 제안**이다 — 게스트가 여는 판이 v1.1.0 이고,
    //    그 판에서는 이 항목이 제안의 문장으로 바뀌어 있다. 첫 화면과 앱이 같은 문장이어야 한다.
    const published = DEMO_PROPOSALS.find(
      (p) => p.target === BEFORE_AFTER.after.itemId && p.decision === 'published',
    )
    expect(published, 'v1.1.0 에 실린 제안이 이 항목을 고쳐야 한다').toBeDefined()
    const data = (published as NonNullable<typeof published>).data as { rule: string; severity: string }
    expect(BEFORE_AFTER.after.text).toBe(data.rule)
    expect(BEFORE_AFTER.after.detail.startsWith(data.severity)).toBe(true)
    //  제목의 버전이 데모가 실제로 발행하는 버전이다.
    const m = /v(\d+\.\d+\.\d+)/.exec(BEFORE_AFTER.after.title)
    expect(m).not.toBeNull()
    expect(readFileSync(join(webRoot, 'scripts', 'demo-seed.ts'), 'utf8')).toContain(`'${(m as RegExpExecArray)[1]}'`)
  })

  it('씨앗 초안(v1.0.0)도 같은 규칙을 말한다 — 제안은 문장을 구체화했지 뒤집지 않았다', () => {
    const { draft } = retryDraft()
    const data = (draft as { data: { rule: string } }).data
    expect(data.rule).toContain('5회')
    expect(BEFORE_AFTER.after.text).toContain('5회')
    expect(BEFORE_AFTER.after.text).toContain('지수 백오프')
  })

  it('Before A(문서)와 B(코드)는 그 초안의 근거 둘이 실제로 말하는 것이다', () => {
    const { draft, evidence, retryText } = retryDraft()
    const refs = (draft as { source_refs: Array<Record<string, unknown>> }).source_refs
    const doc = refs.find((r) => r.kind === 'source_document') as { heading_path: string[] }
    const repo = refs.find((r) => r.kind === 'repository_path') as {
      repo: string; path: string; start_line: number; end_line: number
    }
    const [a, b] = BEFORE_AFTER.before.answers

    //  A — 문서 §3.1. 제목 사슬의 마지막이 「3.1 …」 이고, 답의 낱말이 인용 안에 있다.
    expect(doc.heading_path.at(-1)).toMatch(/^3\.1/)
    expect(a.source).toContain('goals.md §3.1')
    const docQuote = evidence.find((e) => e.kind === 'source_document')?.quote ?? ''
    expect(docQuote).toContain('최대 5회')
    expect(docQuote).toContain('지수 백오프')
    expect(docQuote).toContain('고정 간격 재시도는 금지')

    //  B — 코드 `retry.ts:11`. 줄 번호는 씨앗이 잰 값이고, 답의 수치는 픽스처 본문에 있다.
    expect(b.source).toBe(`${repo.repo}/${repo.path}:${repo.start_line}`)
    expect(retryText).toContain('MAX_RETRY = 3')
    expect(retryText).toContain('RETRY_DELAY_MS = 500')

    //  After 의 근거 줄은 두 근거를 **둘 다** 가리킨다 — 하나만 적으면 코드 쪽이 사라진다.
    expect(BEFORE_AFTER.after.evidence).toContain(`${repo.repo}/${repo.path}:${repo.start_line}–${repo.end_line}`)
    expect(BEFORE_AFTER.after.evidence.some((e) => e.includes('goals.md §3.1'))).toBe(true)
  })
})

describe('⑥ 신뢰 경계 표 — 「모르는 것」이 P1 의 넷을 전부 덮는다 (SPEC §0.1)', () => {
  it('코드 본문 · secret · 개인 Memory · 대화', () => {
    const unknown = TRUST_BOUNDARY.unknown.rows.join(' ')
    expect(unknown).toMatch(/코드 본문/)
    expect(unknown).toMatch(/secret/)
    expect(unknown).toMatch(/Memory/)
    expect(unknown).toMatch(/대화/)
  })

  it('두 열이 색만이 아니라 기호(✓/✕)와 글자로 갈린다', () => {
    const out = html()
    expect(out).toContain(`✓</span> ${TRUST_BOUNDARY.knows.head}`)
    expect(out).toContain(`✕</span> ${TRUST_BOUNDARY.unknown.head}`)
  })
})

describe('⑦ 설치 줄은 지금 실제로 도는 명령만 적는다 (SPEC §8.3)', () => {
  const plugin = join(repoRoot, 'plugin', 'contextops')

  it('/contextops:… 는 전부 실제 Skill 이다', () => {
    const names = [
      ...INSTALL_STEPS.lines.flatMap((l) => skillNamesIn(l.cmd)),
      ...skillNamesIn(INSTALL_STEPS.foot),
    ]
    expect(names.length).toBeGreaterThan(0)
    for (const n of names) {
      expect(existsSync(join(plugin, 'skills', n, 'SKILL.md')), `skills/${n}`).toBe(true)
    }
  })

  it('부르는 CLI 파일이 실제로 있고 그 명령을 안다', () => {
    const bin = join(plugin, 'bin', 'contextops-cli.mjs')
    expect(existsSync(bin)).toBe(true)
    const line = INSTALL_STEPS.lines.find((l) => l.cmd.includes('contextops-cli.mjs'))
    expect(line).toBeDefined()
    const sub = (line as { cmd: string }).cmd.split(' ').at(-1) as string
    expect(readFileSync(bin, 'utf8')).toContain(sub)
  })

  it('없는 명령(npx contextops)을 적지 않는다', () => {
    expect(html()).not.toContain('npx contextops')
  })
})

describe('⑧ 낱말과 컨테이너', () => {
  it('「실시간」이라는 낱말이 없다 (SPEC §6 · KNOWN_LIMITATIONS)', () => {
    expect(html()).not.toContain('실시간')
  })

  it('표와 코드 블록은 scroll-x 안에 있다', () => {
    const out = html()
    expect(out).toMatch(/class="scroll-x"><table/)
    expect(out).toMatch(/scroll-x[^>]*><pre/)
  })
})
