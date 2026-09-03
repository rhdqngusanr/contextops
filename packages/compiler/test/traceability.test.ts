import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ContextItem } from '@contextops/schema'
import { describe, expect, it } from 'vitest'
import { compile } from '../src'
import type { CompileInput, PackFile } from '../src'
import { PROGRESS_REPORT } from '../templates/progress-report'

// =====================================================================
//  🔴 P7 — 「모든 Pack 줄은 항목 ID → 원문으로 역추적된다」.
//     근거 없는 줄이 하나라도 있으면 「환각 차단」 주장이 무너진다.
//
//  기계가 재는 것은 셋이다:
//    ① 항목이 만든 모든 블록이 태그로 끝난다
//    ② manifest 의 `source_item_ids` 가 그 파일의 태그와 정확히 같다
//    ③ **태그가 안 붙은 줄은 전부 템플릿이 넣은 줄이다** (항목 내용이 아니다)
//  ③ 이 없으면 「렌더가 슬쩍 한 줄 더 뱉었는데 아무도 모르는」 구멍이 남는다.
// =====================================================================

const HERE = dirname(fileURLToPath(import.meta.url))
const GOLDEN = join(HERE, 'golden')
const CASES = readdirSync(GOLDEN).filter((n) => statSync(join(GOLDEN, n)).isDirectory()).sort()

function readInput(name: string): CompileInput {
  return JSON.parse(readFileSync(join(GOLDEN, name, 'input.json'), 'utf8')) as CompileInput
}

/** 템플릿이 스스로 넣는 줄인가 — 항목에서 온 줄이 아니어야 한다. */
function isTemplateLine(line: string): boolean {
  if (line === '' || line === '---' || line === 'paths:') return true
  if (line.startsWith('#')) return true                       // 제목
  if (line.startsWith('> ')) return true                      // 꼬리말·파트 안내
  if (line.startsWith('  - "')) return true                   // scoped frontmatter 의 paths
  if (line.startsWith('<!--')) return true                    // 생성 안내 · 절 태그
  return (PROGRESS_REPORT as readonly string[]).includes(line) // SPEC §4.3 고정 텍스트
}

function taggedIds(file: PackFile): string[] {
  return [...file.text.matchAll(/<!-- ctx:(item_[a-z0-9_]+) /g)].map((m) => m[1] as string)
}

describe.each(CASES)('%s — 역추적 (P7)', (name) => {
  const input = readInput(name)
  const result = compile(input)
  const known = new Set(input.snapshot.items.map((i) => i.id))

  it('파일이 하나 이상 나온다', () => {
    expect(result.files.length).toBeGreaterThan(0)
  })

  it.each(result.files.map((f) => f.path))('%s — 모든 블록이 태그로 끝난다', (path) => {
    const file = result.files.find((f) => f.path === path) as PackFile
    const lines = file.text.split('\n')
    for (const entry of file.sourcemap) {
      const last = lines[entry.end_line - 1] as string
      expect(last).toContain(`<!-- ctx:${entry.item_id} rev:${entry.revision} `)
    }
    // 태그 개수 = 블록 개수. 한 블록이 태그를 둘 달거나 하나도 안 달면 여기서 갈린다.
    expect(taggedIds(file)).toHaveLength(file.sourcemap.length)
  })

  it.each(result.files.map((f) => f.path))('%s — 태그 없는 줄은 전부 템플릿 줄이다', (path) => {
    const file = result.files.find((f) => f.path === path) as PackFile
    const covered = new Set<number>()
    for (const entry of file.sourcemap) {
      for (let n = entry.start_line; n <= entry.end_line; n++) covered.add(n)
    }
    const orphans = file.text.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter((l) => !covered.has(l.n) && !isTemplateLine(l.line))
    expect(orphans).toEqual([])
  })

  it('manifest 의 source_item_ids 가 파일의 태그와 같고, 전부 snapshot 에 있다', () => {
    for (const file of result.files) {
      const fromTags = [...new Set(taggedIds(file))].sort()
      const declared = result.manifest.files.find((f) => f.path === file.path)?.source_item_ids
      expect(declared).toEqual(fromTags)
      for (const id of fromTags) expect(known.has(id)).toBe(true)
    }
  })

  it('제외된 항목은 Pack 어디에도 없다', () => {
    for (const gone of result.excluded) {
      for (const file of result.files) expect(file.text).not.toContain(`ctx:${gone.item_id} `)
    }
  })

  it('마일스톤은 Pack 에 남은 roadmap 항목에서만 온다', () => {
    const gone = new Set(result.excluded.map((e) => e.item_id))
    const alive = input.snapshot.items.filter(
      (i): i is Extract<ContextItem, { type: 'roadmap' }> => i.type === 'roadmap' && !gone.has(i.id),
    )
    expect(result.manifest.milestones.map((m) => m.id).sort())
      .toEqual([...new Set(alive.map((i) => i.data.milestone_id))].sort())
  })
})
