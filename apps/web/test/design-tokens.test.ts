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
//  재는 것 셋:
//    ① DESIGN_BRIEF §3 색 표 == `globals.css` 의 `:root` (양방향)
//    ② 화면 코드 어디에도 색 리터럴(`#rrggbb`·`rgb(`·`hsl(`)이 없다
//    ③ `padding`·`margin`·`gap` 은 `var(--sp-*)` 나 `0` 뿐이다 (간격 4/8/12/16/24/32/48)
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
