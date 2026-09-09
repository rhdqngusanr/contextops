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

// =====================================================================
//  경로·근거의 escape (INBOX G14 · 2026-09-09) — 태그 **안**으로 들어가는 값 다섯 표본
//
//  🔴 `RepoPath` 계약은 절대경로·`..`·NUL 만 막는다. `-->` · `,` · `"` · `<!--` 는 통과하고, 그중
//     `-->` 하나로 역추적 태그가 그 자리에서 닫혀 **뒤의 근거가 전부 사라졌다.** `,` 는 근거 조각의
//     구분자라 조각 수를 늘렸고(`parseTraceTag` 가 근거를 하나 더 읽는다), `"` 는 scoped frontmatter 의
//     YAML 문자열을 깨뜨려 그 규칙 파일 전체가 안 읽혔다.
//  ⚠ 방어선만 세운다 — 계약을 좁히지 않는다. 그런 경로는 실제로 있다 (Windows 의 `a,b` 폴더 등).
// =====================================================================

import { parseTraceTag, traceTag } from '../src/tag'

describe('경로·근거의 escape (INBOX G14)', () => {
  const REF = { kind: 'repository_path' as const, repo: 'paylab-api' }
  const SAMPLES: { what: string; ref: Record<string, unknown> }[] = [
    { what: '① 경로에 주석 닫기', ref: { ...REF, path: 'docs/-->/x.md' } },
    { what: '② 경로에 쉼표', ref: { ...REF, path: 'src/a,b/x.ts', start_line: 3 } },
    { what: '③ 경로에 주석 열기', ref: { ...REF, path: 'src/<!--/x.ts' } },
    { what: '④ 메모에 쉼표', ref: { kind: 'manual', note: '팀장 확인, 8/4' } },
    { what: '⑤ 레포 이름에 주석 닫기', ref: { kind: 'repository_path', repo: 'a-->b', path: 'x.ts' } },
  ]

  it.each(SAMPLES.map((s) => [s.what, s.ref] as const))('%s — 태그가 왕복하고 근거 수가 그대로다', (_what, ref) => {
    //  근거 둘 — 표본 하나 + 멀쩡한 것 하나. 표본이 태그를 깨뜨리면 둘째가 사라지거나 셋이 된다.
    const item = makeItem('policy', { source_refs: [ref, { kind: 'manual', note: '표본' }] })
    const tag = traceTag(item)
    //  태그는 문자열 끝에서 **한 번만** 닫힌다.
    expect(tag.indexOf('-->')).toBe(tag.length - 3)
    expect(tag.indexOf('<!--')).toBe(0)
    const parsed = parseTraceTag(tag)
    expect(parsed).not.toBeNull()
    expect(parsed?.src).toHaveLength(2)
    //  쉼표는 `%2C` 로 살아 있다 — 지운 것이 아니라 읽을 수 있게 바꾼 것이다.
    if (JSON.stringify(ref).includes(',b') || JSON.stringify(ref).includes('확인,')) expect(parsed?.src[0]).toContain('%2C')
  })

  it('scoped frontmatter 의 `paths:` 가 따옴표·역슬래시가 든 경로에서도 YAML 로 산다', () => {
    //  scope 는 `{kind:'path', value:<glob>}` 하나다 (`packages/schema` 의 `Scope`). 따옴표와 역슬래시를 한 경로에 넣는다.
    const glob = 'src\\say "hi"\\**'
    const scoped = makeItem('policy', { id: 'item_t_scoped', scope: { kind: 'path', value: glob } })
    const out = compile(makeInput([ANCHOR, scoped]))
    const file = out.files.find((f) => f.path.startsWith('.claude/rules/scoped-'))
    expect(file, 'scoped 규칙 파일이 안 나왔다').toBeDefined()
    const head = file!.text.split('\n').slice(0, 4)
    expect(head[0]).toBe('---')
    expect(head[1]).toBe('paths:')
    //  JSON 문자열 = 유효한 YAML 큰따옴표 문자열이다. 되읽어서 원래 경로가 나와야 한다 —
    //  예전 `"${p}"` 는 여기서 `"src\say "hi"\**"` 가 되어 YAML 이 그 파일을 통째로 거부했다.
    expect(head[2]!.startsWith('  - "')).toBe(true)
    expect(JSON.parse(head[2]!.trim().slice(2))).toBe(glob)
    expect(head[3]).toBe('---')
  })
})
