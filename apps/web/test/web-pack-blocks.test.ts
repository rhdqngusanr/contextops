import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { traceLines } from '@contextops/compiler/tag'

import { packBlocks, stripComments } from '../src/lib/web/pack-blocks'

// =====================================================================
//  Pack 파일 → 블록 (2026-09-11) — 줄 → 항목의 정본(`traceLines`)을 묶기만 한다는 것을 골든 파일로 잰다.
// =====================================================================

const golden = join(fileURLToPath(new URL('..', import.meta.url)), '..', '..', 'packages', 'compiler', 'test', 'golden', 'case-1-small', 'expected', 'CLAUDE.md')

describe('packBlocks', () => {
  const content = readFileSync(golden, 'utf8')
  const blocks = packBlocks(content)
  const trace = traceLines(content)

  it('항목 블록의 꼬리표 집합이 traceLines 의 꼬리표 집합과 같다 — 항목이 빠지거나 남지 않는다', () => {
    const fromBlocks = new Set(blocks.filter((b) => b.tag !== null).map((b) => b.tag!.itemId))
    const fromTrace = new Set([...trace.values()].map((t) => t.itemId))
    expect(fromBlocks).toEqual(fromTrace)
  })

  it('항목 블록의 마지막 줄이 그 꼬리표의 줄이다 — 블록을 누르면 옛 줄 보기와 같은 항목이 뜬다', () => {
    for (const b of blocks) {
      if (b.tag === null) continue
      expect(trace.get(b.end)?.itemId, `${b.tag.itemId} @${b.end}`).toBe(b.tag.itemId)
      for (let i = b.start; i <= b.end; i += 1) expect(trace.get(i)?.itemId, `${b.tag.itemId} 줄 ${i}`).toBe(b.tag.itemId)
    }
  })

  it('렌더할 글자에는 HTML 주석(꼬리표)이 없고, 절 머리는 안 속한 블록으로 남는다 — 감추지 않는다', () => {
    for (const b of blocks) expect(b.text, `@${b.start}`).not.toContain('<!--')
    const heads = blocks.filter((b) => b.tag === null).map((b) => b.text)
    expect(heads.some((t) => t.startsWith('## Mission'))).toBe(true)
    expect(heads.some((t) => t.startsWith('# paylab'))).toBe(true)
    expect(stripComments('a <!-- x --> b')).toBe('a b')
  })

  it('한 항목이 여러 줄이면 한 블록이다 (미션의 세 줄 · 로드맵의 done_when 줄)', () => {
    const mission = blocks.find((b) => b.tag?.itemId === 'item_pl_mission')
    expect(mission).toBeDefined()
    expect(mission!.end - mission!.start).toBe(2)
    expect(mission!.text).toContain('> 작년 장애')
    const m1 = blocks.find((b) => b.tag?.itemId === 'item_pl_m1')
    expect(m1!.text).toContain('done_when')
  })
})
