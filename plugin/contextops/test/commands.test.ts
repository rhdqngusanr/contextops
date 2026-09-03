import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { COMMANDS, helpText } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'

// =====================================================================
//  🔴 **SPEC §8.3 의 표와 `COMMANDS` 표가 같은가** — 게이트는 문서보다 강하다
//
//  ★ 왜 필요한가 — 이 저장소의 단골 고장이 「문서에는 있는데 구현이 없다」이고
//    (loop/PROMPT.md ③), CLI 는 그게 제일 잘 숨는 자리다. **`--help` 에 있으면
//    사람은 있다고 믿고**, SPEC 에만 있으면 다음 바퀴가 없는 명령 위에 짓는다.
//    둘 중 하나만 늘어나면 여기가 빨개진다.
//
//  ⚠ 이 시험은 「이름이 같은가」까지다. 「동작이 SPEC 대로인가」는 명령별 시험이 잰다.
// =====================================================================

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const spec = readFileSync(join(repoRoot, 'docs', 'SPEC.md'), 'utf8')

/**
 * SPEC §8.3 표의 첫 칸에서 명령 이름을 뽑는다.
 * ⚠ 표가 끝나는 자리(`###`)까지만 본다 — §8.4 이후의 코드 조각에도 명령 이름이 나온다.
 */
function specCommands(): string[] {
  const from = spec.indexOf('### 8.3 CLI 명령')
  expect(from).toBeGreaterThan(0)
  const until = spec.indexOf('### 8.4', from)
  const section = spec.slice(from, until === -1 ? undefined : until)
  const names = new Set<string>()
  for (const line of section.split('\n')) {
    //  `| `setup` (npx contextops) | … |` 처럼 첫 칸의 백틱 안 첫 낱말이 이름이다.
    const cell = /^\|\s*`([a-z-]+)[^`]*`/.exec(line)
    if (cell?.[1] !== undefined) names.add(cell[1])
  }
  return [...names].sort()
}

describe('명령 표 — SPEC §8.3 과 코드가 같다', () => {
  it('SPEC 에 있는 명령이 전부 구현돼 있다', () => {
    expect(Object.keys(COMMANDS).sort()).toEqual(specCommands())
  })

  it('SPEC 표에서 여덟을 읽어 낸다 — 파서가 조용히 0개를 읽으면 위 시험이 무의미하다', () => {
    expect(specCommands()).toHaveLength(8)
  })
})

describe('도움말 — 표가 곧 도움말이다', () => {
  const text = helpText().join('\n')

  it.each(Object.keys(COMMANDS))('%s 가 도움말에 있다', (name) => {
    expect(text).toContain(name)
  })

  it('종료 코드 표의 값이 전부 도움말 한 줄에 있다', () => {
    //  ★ 왜 — 이 숫자를 읽는 것은 Skill 과 훅이다. 도움말에만 있고 코드에 없거나
    //    그 반대면, 스크립트가 없는 코드로 갈래를 탄다.
    for (const code of Object.values(EXIT)) expect(text).toContain(String(code))
  })
})
