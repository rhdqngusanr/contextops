import { describe, expect, it } from 'vitest'
import { compile } from '../src'
import { ANCHOR, makeInput, makeItem } from './fixtures'

// =====================================================================
//  escape (SPEC §4.1 4단계) — `|` · 선행 `#` · `<!--`.
//
//  🔴 셋 중 `<!--` 가 제일 위험하다. 항목 제목에 그게 있으면 **주석이 열려서 뒤에 오는
//     역추적 태그를 통째로 삼킨다** — Pack 은 멀쩡해 보이는데 P7 이 뚫린다.
// =====================================================================

const NASTY = '# 표 | 열 <!-- 주석 열기'

describe('Markdown escape', () => {
  const result = compile(makeInput([ANCHOR, makeItem('goal', { title: NASTY })]))
  const claude = result.files.find((f) => f.path === 'CLAUDE.md')?.text as string

  it('`<!--` 가 그대로 나가지 않는다 (주석이 열리면 태그가 삼켜진다)', () => {
    const goalLine = claude.split('\n').find((l) => l.includes('주석 열기')) as string
    expect(goalLine).toContain('&lt;!--')
    expect(goalLine.indexOf('<!--')).toBe(goalLine.indexOf('<!-- ctx:'))   // 주석은 태그 하나뿐이다
  })

  it('`|` 가 escape 된다 (표를 깨뜨린다)', () => {
    expect(claude).toContain('\\|')
  })

  it('역추적 태그는 그대로 살아 있다', () => {
    expect(claude).toContain('<!-- ctx:item_t_goal rev:1 conf:medium src:manual:표본 -->')
  })

  it('선행 `#` 는 escape 된다 (본문이 제목으로 승격되면 문서 구조가 뒤집힌다)', () => {
    const mission = compile(makeInput([makeItem('mission', { data: { statement: '# 미션이 아니다' } })]))
    expect(mission.files.find((f) => f.path === 'CLAUDE.md')?.text).toContain('\\# 미션이 아니다')
  })

  it('줄바꿈이 든 본문은 한 줄로 접힌다 (태그는 줄 끝에 하나뿐이어야 한다)', () => {
    const item = makeItem('architecture', { body: '첫 줄\n둘째 줄\n\n셋째 줄' })
    const arch = compile(makeInput([ANCHOR, item])).files.find((f) => f.path === '.claude/rules/architecture.md')?.text as string
    expect(arch).toContain('첫 줄 둘째 줄 셋째 줄')
    expect(arch.split('\n').filter((l) => l.includes('ctx:item_t_arch'))).toHaveLength(1)
  })
})
