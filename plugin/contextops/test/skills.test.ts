import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { JSON_SCHEMA_FILES } from '@contextops/schema'

import { COMMANDS } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'

// =====================================================================
//  🔴 **Skill 은 「모델이 그대로 실행하는 문서」다** (docs/SPEC.md §8.4)
//
//  ★ 왜 시험하나 — 여기 적힌 명령·플래그·계약 이름이 틀리면 **사용자의 기계에서**
//    조용히 실패한다. 우리 CI 는 그걸 절대 못 본다: SKILL.md 는 컴파일되지도,
//    import 되지도 않는 텍스트다. 「정의만 있고 아무 일도 안 하는 것」의 최악
//    형태이고, 화면(=Claude 의 답)에는 멀쩡히 뜬다.
//
//  ★ 그래서 여기서는 **문서에서 명령줄을 뽑아 표와 대조한다.** 문구는 자유지만
//    실행되는 부분은 코드와 같아야 한다.
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillsDir = join(packageRoot, 'skills')

const skillNames = readdirSync(skillsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

const read = (name: string): string => readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8')

/** SKILL.md 안의 `…contextops-cli.mjs" <명령> <나머지>` 한 줄들. */
type Invocation = { skill: string; command: string; rest: string }

function invocations(): Invocation[] {
  const found: Invocation[] = []
  for (const skill of skillNames) {
    for (const line of read(skill).split('\n')) {
      const at = line.indexOf('contextops-cli.mjs')
      if (at === -1) continue
      //  `"` 뒤의 낱말들. 인용부호와 백틱은 떼어 낸다.
      const tail = line.slice(at + 'contextops-cli.mjs'.length).replace(/[`"]/g, '').trim()
      const [command, ...rest] = tail.split(/\s+/)
      if (command === undefined || command.length === 0) continue
      found.push({ skill, command, rest: rest.join(' ') })
    }
  }
  return found
}

describe('Skill 레이아웃 (SPEC §8.4)', () => {
  it('SPEC §8.4 의 셋이 다 있다', () => {
    expect(skillNames).toEqual(['init', 'propose', 'sync'])
  })

  it.each(skillNames)('%s — frontmatter 의 name 이 폴더 이름과 같다', (name) => {
    //  ⚠ 다르면 Claude Code 가 다른 이름으로 등록한다 — 사용자가 안내받은
    //    `/contextops:<이름>` 이 없는 명령이 된다.
    const front = /^---\n([\s\S]*?)\n---/.exec(read(name))?.[1] ?? ''
    expect(front).toContain(`name: ${name}`)
    expect(front).toMatch(/description: \S/)
    //  🔴 사람이 부를 때만 돈다 — 모델이 저 혼자 업로드·발행을 시작하지 않는다.
    expect(front).toContain('disable-model-invocation: true')
  })

  it.each(skillNames)('%s — 번들을 $CLAUDE_PLUGIN_ROOT 로 부른다', (name) => {
    //  상대 경로로 부르면 사용자의 cwd 에 따라 「파일이 없다」가 된다.
    for (const line of read(name).split('\n')) {
      if (line.includes('contextops-cli.mjs')) expect(line).toContain('$CLAUDE_PLUGIN_ROOT')
    }
  })
})

describe('🔴 Skill 이 부르는 것이 실제로 있다', () => {
  const all = invocations()

  it('명령줄을 하나 이상 읽어 냈다 — 0개면 아래 시험이 아무것도 안 잰다', () => {
    expect(all.length).toBeGreaterThan(5)
  })

  it.each(all.map((i) => [`${i.skill}: ${i.command} ${i.rest}`.trim(), i] as const))(
    '%s',
    (_label, invocation) => {
      const command = COMMANDS[invocation.command]
      expect(command, `모르는 명령이다: ${invocation.command}`).toBeDefined()

      //  플래그도 표에 있어야 한다 — 없으면 파서가 「모르는 플래그다」로 exit 64 를 낸다.
      for (const word of invocation.rest.split(/\s+/)) {
        if (!word.startsWith('--')) continue
        const flag = word.slice(2).split('=')[0] ?? ''
        expect(Object.keys(command!.flags), `${invocation.command} 에 없는 플래그다: --${flag}`)
          .toContain(flag)
      }
    },
  )

  it('`--schema <이름>` 으로 지목하는 계약이 전부 있다', () => {
    const names = Object.keys(JSON_SCHEMA_FILES)
    for (const { rest } of all) {
      const asked = /--schema[= ]([a-z-]+)/.exec(rest)?.[1]
      if (asked !== undefined) expect(names).toContain(asked)
    }
  })

  it('Skill 이 말하는 종료 코드가 전부 EXIT 표에 있다', () => {
    //  ★ 왜 — Skill 은 종료 코드로 갈래를 탄다 (「exit 2 면 고쳐서 한 번 더」).
    //    표에 없는 숫자로 갈래를 타면 그 갈래는 영원히 안 돈다.
    const known = new Set(Object.values(EXIT).map(String))
    for (const skill of skillNames) {
      for (const hit of read(skill).matchAll(/exit (\d+)/g)) {
        expect(known, `${skill}: 모르는 종료 코드 ${hit[1]}`).toContain(hit[1])
      }
    }
  })
})
