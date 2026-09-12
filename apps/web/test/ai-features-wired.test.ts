import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { AI_FEATURES, AI_FEATURES_NOT_WIRED } from '../src/lib/ai/features'

// =====================================================================
//  🔴 표의 항목이 **전부 실제로 뭔가를 바꾸는가** (CLAUDE.md · R3 · 2026-09-12)
//
//  ★ 왜 이 시험이 있나 — `AI_FEATURE_LIMITS` 는 네 기능의 빈도 상한을 적어 두었는데
//    실제로 `withBudget()` 을 지나는 것은 둘뿐이었다. 표만 보면 넷 다 도는 것처럼 읽히고,
//    그 상태는 **화면에도 시험에도 안 나타난다.** 「정의만 있고 아무 일도 안 하는 코드」가
//    이런 저장소의 단골 고장이라 표를 만들면 그 표를 시험으로 잠가야 한다.
//
//  ⚠ 이 시험은 **소스를 글자로 읽는다.** `withBudget('structure'` 처럼 기능 이름이
//    리터럴로 적히는 것이 전제다 — 변수로 넘기기 시작하면 여기서 못 본다.
//    그때는 이 주석을 고치고 세는 법을 바꿔라. 조용히 통과시키지 마라.
// =====================================================================

/** `src/` 전체에서 `withBudget('<기능>'` 의 기능 이름을 걷는다 (정의 파일 자신은 뺀다). */
function wiredFeatures(): Set<string> {
  const root = join(__dirname, '..', 'src')
  const found = new Set<string>()

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
      //  `budget.ts` 는 문 자신이고 `features.ts` 는 표 자신이다 — 둘은 「부르는 자리」가 아니다.
      if (full.endsWith(join('lib', 'ai', 'budget.ts'))) continue
      if (full.endsWith(join('lib', 'ai', 'features.ts'))) continue
      const source = readFileSync(full, 'utf8')
      for (const m of source.matchAll(/withBudget\(\s*'([^']+)'/g)) found.add(m[1]!)
    }
  }
  walk(root)
  return found
}

describe('AI 기능 표 — 죽은 줄 금지', () => {
  it('🔴 `NOT_WIRED` 에 없는 기능은 **실제로 부르는 자리가 있다**', () => {
    const wired = wiredFeatures()
    //  걷기가 고장 나면 이 시험이 조용히 통과한다 — 그것부터 막는다.
    expect(wired.size, 'withBudget 호출처를 하나도 못 찾았다 — 걷는 코드가 고장 났다').toBeGreaterThan(0)

    const shouldBeWired = AI_FEATURES.filter((f) => !(f in AI_FEATURES_NOT_WIRED))
    const missing = shouldBeWired.filter((f) => !wired.has(f))
    expect(
      missing,
      '표에 있는데 아무도 안 부른다 — 부르는 자리를 만들거나 AI_FEATURES_NOT_WIRED 에 이유와 함께 적어라',
    ).toEqual([])
  })

  it('🔴 `NOT_WIRED` 에 있는 기능은 **정말로 호출처가 없다** — 목록이 낡지 않게', () => {
    const wired = wiredFeatures()
    const staleRows = Object.keys(AI_FEATURES_NOT_WIRED).filter((f) => wired.has(f))
    expect(
      staleRows,
      '이 기능은 이제 실제로 불린다 — AI_FEATURES_NOT_WIRED 에서 그 줄을 지워라',
    ).toEqual([])
  })

  it('`NOT_WIRED` 의 열쇠는 전부 실제 기능 이름이고, 이유가 비어 있지 않다', () => {
    for (const [name, why] of Object.entries(AI_FEATURES_NOT_WIRED)) {
      expect(AI_FEATURES, `${name} 은 AI_FEATURES 에 없다`).toContain(name)
      expect(String(why).length, `${name} 에 왜 안 도는지가 안 적혀 있다`).toBeGreaterThan(10)
    }
  })

  it('지금 도는 기능은 `structure`·`conflict` 둘이다 — 바뀌면 이 숫자가 말해 준다', () => {
    const wired = [...wiredFeatures()].filter((f) => (AI_FEATURES as readonly string[]).includes(f)).sort()
    expect(wired).toEqual(['conflict', 'structure'])
  })
})
