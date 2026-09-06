import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// =====================================================================
//  🔴 **비주얼 토큰의 게이트** (docs/DESIGN_BRIEF.md §3 · loop/PROMPT.md ⑦3층)
//
//  ★ 왜 시험인가 — 「§3 토큰만 쓴다」는 규칙은 **문서에만 있으면 반드시 깨진다.**
//    급한 화면 하나가 즉석 색을 찍고, 그때부터 두 번째 방언이 생긴다.
//    눈 판정으로는 `#EDEFF3` 과 `#ECEEF2` 를 구별할 수 없다 — 기계만 잡는다.
//    **게이트는 문서보다 강하다** (CLAUDE.md).
//
//  재는 것 넷:
//    ① DESIGN_BRIEF §3 색 표 == `globals.css` 의 `:root` (양방향)
//    ② 화면 코드 어디에도 색 리터럴(`#rrggbb`·`rgb(`·`hsl(`)이 없다
//    ③ `padding`·`margin`·`gap` 은 `var(--sp-*)` 나 `0` 뿐이다 (간격 4/8/12/16/24/32/48)
//    ④ `ink-4`(표에서 용도가 **비활성** 한 낱말이다)로 **읽어야 하는 글자**를 그리지 않는다
//
//  ⚠ 새 색이 필요하면 **DESIGN_BRIEF §3 표에 먼저 한 줄**을 더하고 `:root` 에 같은 값을
//    적어라. 시험을 고쳐서 통과시키지 마라 — 그건 정본을 코드로 옮기는 것이다.
// =====================================================================

const webSrc = fileURLToPath(new URL('../src', import.meta.url))
const globalsCss = join(webSrc, 'app', 'globals.css')
const designBrief = fileURLToPath(new URL('../../../docs/DESIGN_BRIEF.md', import.meta.url))

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sourceFiles(full, found)
    else if (/\.(ts|tsx|css)$/.test(full)) found.push(full)
  }
  return found
}

/** DESIGN_BRIEF §3 의 색 표: `| \`bg\` | \`#08090B\` | 용도 |` */
function briefColors(): Record<string, string> {
  const md = readFileSync(designBrief, 'utf8')
  const out: Record<string, string> = {}
  for (const line of md.split('\n')) {
    const m = /^\|\s*`([a-z0-9-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/.exec(line)
    if (m) out[m[1] as string] = (m[2] as string).toUpperCase()
  }
  return out
}

/** `globals.css` 의 첫 `:root { … }` 안에서 색 값만 (`#`으로 시작하는 것). */
function rootColors(): Record<string, string> {
  const css = readFileSync(globalsCss, 'utf8')
  const block = /:root\s*\{([\s\S]*?)\}/.exec(css)
  if (!block) throw new Error('globals.css 에 :root 블록이 없다')
  const out: Record<string, string> = {}
  for (const m of (block[1] as string).matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
    out[m[1] as string] = (m[2] as string).toUpperCase()
  }
  return out
}

describe('🔴 색 토큰의 정본은 DESIGN_BRIEF §3 하나다', () => {
  it('표의 토큰과 :root 의 변수가 정확히 같다 (이름도 값도)', () => {
    const brief = briefColors()
    const root = rootColors()
    expect(Object.keys(brief).length, 'DESIGN_BRIEF §3 색 표를 읽지 못했다').toBeGreaterThan(10)
    //  ⚠ 양방향이다. 한쪽만 재면 「문서에만 있는 토큰」이나 「코드에만 있는 색」이 산다.
    expect(root).toEqual(brief)
  })
})

describe('🔴 화면 코드에 임의 색이 없다 (DESIGN_BRIEF §3 「임의 색·간격 금지」)', () => {
  //  16진 색만 잡는다. `/^#/` 같은 정규식이나 `doc:…#0-400` 은 걸리지 않는다.
  const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?(?![0-9a-zA-Z_-])/
  const FN = /\b(?:rgba?|hsla?|oklch|color-mix)\(/

  it('globals.css 를 뺀 어느 파일에도 색 리터럴이 없다', () => {
    const hits: string[] = []
    for (const file of sourceFiles(webSrc)) {
      if (file === globalsCss) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (HEX.test(line) || FN.test(line)) hits.push(`${file.slice(webSrc.length + 1)}:${i + 1}`)
      })
    }
    expect(hits, `색은 var(--토큰) 으로만 쓴다: ${hits.join(' · ')}`).toEqual([])
  })

  it('globals.css 안에서도 색 함수는 쓰지 않는다 — 값은 :root 의 표뿐이다', () => {
    const css = readFileSync(globalsCss, 'utf8')
    expect(FN.test(css), 'globals.css 에 rgb()/hsl() 이 있다').toBe(false)
  })
})

describe('🔴 간격은 토큰뿐이다 (DESIGN_BRIEF §3 「간격 4/8/12/16/24/32/48」)', () => {
  it('padding·margin·gap 에 px 리터럴이 없다', () => {
    const hits: string[] = []
    for (const file of sourceFiles(webSrc)) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        //  ⚠ `:root` 의 `--sp-1: 4px;` 는 선언이지 사용이 아니다 — 이름이 `--` 로 시작한다.
        const m = /(?:^|[;{\s])(padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?\s*:\s*([^;}]+)/.exec(line)
        if (!m) return
        if (/\d+(?:\.\d+)?(px|rem|em)\b/.test(m[2] as string)) {
          hits.push(`${file.slice(webSrc.length + 1)}:${i + 1} — ${m[1]}: ${(m[2] as string).trim()}`)
        }
      })
    }
    expect(hits, `간격은 var(--sp-*) 로만 쓴다: ${hits.join(' · ')}`).toEqual([])
  })

  it('간격 토큰의 값이 DESIGN_BRIEF 의 눈금과 같다', () => {
    const css = readFileSync(globalsCss, 'utf8')
    const scale = [...css.matchAll(/--sp-\d:\s*(\d+)px;/g)].map((m) => Number(m[1]))
    expect(scale).toEqual([4, 8, 12, 16, 24, 32, 48])
  })
})

// ---------------------------------------------------------------------
//  ④ 비활성 색으로 **글자**를 그리지 않는다 (FINDINGS 88)
//
//  ★ 왜 이 시험이 생겼나 — 위의 ②는 「임의 색을 찍었나」만 센다. 토큰을 제대로 썼는데
//    **용도가 틀린** 경우는 아무도 안 셌고, 그래서 `ink-4` 로 그린 문장이 다섯 자리 쌓였다.
//    그중 둘은 제품의 주장 그 자체였다 — P1 을 설명하는 문장(「코드 본문은 서버에 없습니다」)과
//    P7 을 눈으로 재는 Pack 줄 번호다. 카드 바탕 위 대비가 1.6:1 이라 발표 영상·인쇄된
//    심사 자료에서는 **글자가 없는 것과 같다.** `toContain` 은 색을 안 센다 —
//    시험이 전부 초록인 채로 안 보이는 화면이 나갔다 (FINDINGS 86 의 눈 판정에서 잡혔다).
//
//  규칙은 하나다: **`ink-4` 는 비활성(`:disabled`)과 장식(`aria-hidden`)에만.**
//    읽어야 하는 보조 글자는 `meta`/`ink-3`(표에서 「라벨·메타·보조」)다.
//  ⚠ 「아주 옅은 보조」가 정말로 필요해지면 DESIGN_BRIEF §3 표에 **먼저** 한 줄을 더하고
//    써라 (`bad-bg` 가 그렇게 들어왔다). 이 시험을 고쳐서 통과시키지 마라.
// ---------------------------------------------------------------------
describe('🔴 비활성 색(`ink-4`)으로 읽어야 하는 글자를 그리지 않는다', () => {
  it('`className` 의 `ink-4` 는 같은 줄에 `aria-hidden` 이 있어야 한다 (장식만 허용)', () => {
    //  주석은 안 센다 — `className="… ink-4 …"` 속만 본다.
    const CLASS_INK4 = /className="[^"]*\bink-4\b[^"]*"/
    const hits: string[] = []
    for (const file of sourceFiles(webSrc)) {
      if (!file.endsWith('.tsx')) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (CLASS_INK4.test(line) && !line.includes('aria-hidden')) {
          hits.push(`${file.slice(webSrc.length + 1)}:${i + 1}`)
        }
      })
    }
    expect(hits, `읽어야 하는 글자는 meta/ink-3 로 그린다: ${hits.join(' · ')}`).toEqual([])
  })

  it('`globals.css` 의 `var(--ink-4)` 는 `.ink-4` 유틸리티와 `:disabled` 규칙에만 있다', () => {
    const hits: string[] = []
    readFileSync(globalsCss, 'utf8').split('\n').forEach((line, i) => {
      if (!line.includes('var(--ink-4)')) return
      //  ⚠ 한 줄 규칙만 통과시킨다. 여러 줄로 적으면 여기서 걸린다 — 그때 다시 생각해라.
      if (/^\.ink-4\s*\{/.test(line.trim()) || line.includes(':disabled')) return
      hits.push(`globals.css:${i + 1} — ${line.trim()}`)
    })
    expect(hits, `ink-4 는 비활성과 장식에만 쓴다: ${hits.join(' · ')}`).toEqual([])
  })
})

// ---------------------------------------------------------------------
//  ⑤ 한글은 낱말 중간에서 안 접는다 (FINDINGS 129 · INBOX 2026-09-06 ③ · DESIGN_BRIEF §3 「타이포」)
//
//  ★ 왜 이 시험이 생겼나 — 사람이 브라우저에서 잰 것: `body *` 중 `word-break: keep-all` 인 요소가
//    **0개**였고 헤드라인이 「같 / 은 방향으로」, 에러 카드가 「다시 시 / 도해주세요」로 그려졌다.
//    시안(`design/*.dc.html`)의 `body` 에는 있었는데 구현으로 옮길 때 빠졌다 — 색 토큰처럼
//    「문서 ↔ 코드」를 기계가 대조하지 않으면 이런 한 줄은 다시 빠진다.
//  ⚠ 코드·경로·해시는 예외다 — `.tree-item`(break-all) · `.pack-linetext`·`.diff-text`(break-word).
//    그 예외가 `keep-all` 로 바뀌면 해시가 한 줄에 못 들어가고 경로가 잘린다. 같이 잠근다.
// ---------------------------------------------------------------------
describe('🔴 한글은 낱말 중간에서 안 접는다 — `body` 의 keep-all', () => {
  const css = () => readFileSync(globalsCss, 'utf8')

  /** `html, body { … }` 블록의 본문. */
  function bodyRule(): string {
    const m = /(?:^|\n)html,\s*body\s*\{([\s\S]*?)\}/.exec(css())
    if (!m) throw new Error('globals.css 에 `html, body { … }` 규칙이 없다')
    return m[1] as string
  }

  it('`html, body` 규칙에 `word-break: keep-all` 과 `overflow-wrap: break-word` 가 있다', () => {
    const rule = bodyRule()
    expect(rule).toMatch(/word-break:\s*keep-all\s*;/)
    expect(rule).toMatch(/overflow-wrap:\s*break-word\s*;/)
  })

  it('DESIGN_BRIEF §3 「타이포」 가 같은 값을 정본으로 적고 있다 (문서 ↔ 코드 양방향)', () => {
    const md = readFileSync(designBrief, 'utf8')
    const typo = /### 타이포([\s\S]*?)\n### /.exec(md)
    expect(typo, 'DESIGN_BRIEF §3 에 「### 타이포」 절이 없다').not.toBeNull()
    expect(typo![1]).toContain('word-break: keep-all')
    expect(typo![1]).toContain('overflow-wrap: break-word')
  })

  it('코드·경로·해시의 예외는 그대로다 — `.tree-item` break-all · `.pack-linetext`·`.diff-text` break-word', () => {
    const text = css()
    const ruleOf = (selector: string): string => {
      const m = new RegExp(`(?:^|\\n)${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(text)
      if (!m) throw new Error(`globals.css 에 \`${selector}\` 규칙이 없다`)
      return m[1] as string
    }
    expect(ruleOf('.tree-item')).toMatch(/word-break:\s*break-all\s*;/)
    expect(ruleOf('.pack-linetext')).toMatch(/word-break:\s*break-word\s*;/)
    expect(ruleOf('.diff-text')).toMatch(/word-break:\s*break-word\s*;/)
    //  ⚠ mono 규칙 안에 `keep-all` 이 들어오면 여기서 걸린다.
    for (const sel of ['.tree-item', '.pack-linetext', '.diff-text', 'code, pre, .mono']) {
      expect(ruleOf(sel), `${sel} 에 keep-all 을 걸지 마라`).not.toContain('keep-all')
    }
  })
})
