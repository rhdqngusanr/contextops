import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compile, manifestHash, normalizeText, snapshotHash } from '../src'
import type { CompileInput } from '../src'

// =====================================================================
//  🔴 P4 — 「같은 snapshot → byte-identical Pack」. 이 제품의 재현성 주장 전부다.
//     SPEC §4.4 의 「항목 순서를 셔플해도 출력 동일」이 여기 있다.
//
//  ⚠ 이 시험이 빨개지면 컴파일러 어딘가에 **입력 순서·시각·난수**가 새어 들어간 것이다.
//    expected 를 고치지 말고 새는 자리를 찾아라.
// =====================================================================

const HERE = dirname(fileURLToPath(import.meta.url))
const GOLDEN = join(HERE, 'golden')
const CASES = readdirSync(GOLDEN).filter((n) => statSync(join(GOLDEN, n)).isDirectory()).sort()

function readInput(name: string): CompileInput {
  return JSON.parse(readFileSync(join(GOLDEN, name, 'input.json'), 'utf8')) as CompileInput
}

/** 결정적인 뒤섞기 3종. `Math.random` 을 쓰지 않는다 — 시험도 매번 같아야 한다. */
const SHUFFLES: Record<string, <T>(items: readonly T[]) => T[]> = {
  뒤집기: (items) => [...items].reverse(),
  회전: (items) => [...items.slice(3), ...items.slice(0, 3)],
  '홀짝 가르기': (items) => [...items.filter((_, i) => i % 2 === 1), ...items.filter((_, i) => i % 2 === 0)],
}

describe.each(CASES)('%s — 순서를 바꿔도 같은 Pack', (name) => {
  const base = compile(readInput(name))

  it.each(Object.keys(SHUFFLES))('%s 를 해도 파일이 byte 로 같다', (how) => {
    const input = readInput(name)
    const shuffled: CompileInput = {
      ...input,
      snapshot: { ...input.snapshot, items: (SHUFFLES[how] as <T>(i: readonly T[]) => T[])(input.snapshot.items) },
    }
    const result = compile(shuffled)
    expect(result.files.map((f) => [f.path, f.text, f.sha256])).toEqual(base.files.map((f) => [f.path, f.text, f.sha256]))
    expect(result.manifest).toEqual(base.manifest)
  })

  it('source map 도 같다 (역추적 색인이 순서에 흔들리면 P7 이 흔들린다)', () => {
    const input = readInput(name)
    const result = compile({ ...input, snapshot: { ...input.snapshot, items: [...input.snapshot.items].reverse() } })
    expect(result.files.map((f) => f.sourcemap)).toEqual(base.files.map((f) => f.sourcemap))
  })
})

describe('해시 규칙 (SPEC §3 · §4.1 7단계)', () => {
  it('manifest_hash 는 path 순 정렬 후 "path\\nsha256\\n" 을 이은 sha256 이다', () => {
    const files = [
      { path: 'b.md', sha256: 'b'.repeat(64) },
      { path: 'a.md', sha256: 'a'.repeat(64) },
    ]
    expect(manifestHash(files)).toBe(manifestHash([...files].reverse()))
  })

  it('snapshot_hash 는 항목 순서에 흔들리지 않고 generated_at 을 담지 않는다', () => {
    const input = readInput(CASES[0] as string)
    const items = input.snapshot.items
    const a = snapshotHash({ project_id: input.snapshot.project_id, context_version: '1.0.0', items })
    const b = snapshotHash({ project_id: input.snapshot.project_id, context_version: '1.0.0', items: [...items].reverse() })
    const c = snapshotHash({ project_id: input.snapshot.project_id, context_version: '9.9.9', items })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('Pack 파일은 LF 로 끝 개행 하나다', () => {
    expect(normalizeText('a\r\nb\r\n\r\n')).toBe('a\nb\n')
    for (const file of compile(readInput(CASES[0] as string)).files) {
      expect(file.text.endsWith('\n')).toBe(true)
      expect(file.text.includes('\r')).toBe(false)
      expect(file.text.endsWith('\n\n')).toBe(false)
    }
  })
})
