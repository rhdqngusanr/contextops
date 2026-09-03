import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compile, manifestHash } from '../src'
import type { CompileInput } from '../src'

// =====================================================================
//  golden — 정본은 docs/SPEC.md §4.4. 케이스 3종을 **byte 로** 비교한다.
//
//  🔴 여기가 빨개졌다는 것은 「Pack 의 모양이 바뀌었다」는 뜻이다. expected 를 그냥
//    덮지 마라 — `templates/index.ts` 의 `TEMPLATE_VERSION` 을 올리고 **왜 바뀌었는지를
//    커밋 메시지에 적어라.** 말없이 덮으면 게이트가 게이트가 아니게 된다
//    (loop/PROMPT.md ⑤ · 「테스트가 빨개서 테스트를 고쳤다」가 제일 흔한 자멸이다).
//
//  갱신은 한 줄: `UPDATE_GOLDEN=1 pnpm --filter @contextops/compiler test`
//
//  ★ 입력의 정본은 각 케이스의 `input.json` 이다 (손으로 고친다). 생성기를 두지 않는 이유는
//    입력이 두 곳에 살면 어느 쪽이 정본인지 아무도 모르게 되기 때문이다.
// =====================================================================

const HERE = dirname(fileURLToPath(import.meta.url))
const GOLDEN = join(HERE, 'golden')
const UPDATE = process.env['UPDATE_GOLDEN'] === '1'

const CASES = readdirSync(GOLDEN).filter((name) => statSync(join(GOLDEN, name)).isDirectory()).sort()

function readInput(dir: string): CompileInput {
  return JSON.parse(readFileSync(join(dir, 'input.json'), 'utf8')) as CompileInput
}

/** expected/ 아래의 모든 파일을 상대 경로 → 내용으로 읽는다. */
function readExpected(root: string): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (dir: string, prefix: string): void => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry)
      const rel = prefix === '' ? entry : `${prefix}/${entry}`
      if (statSync(full).isDirectory()) walk(full, rel)
      else out.set(rel, readFileSync(full, 'utf8'))
    }
  }
  walk(root, '')
  return out
}

function writeAll(root: string, files: Map<string, string>): void {
  rmSync(root, { recursive: true, force: true })
  for (const [rel, text] of files) {
    const full = join(root, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, text, 'utf8')
  }
}

describe.each(CASES)('golden %s', (name) => {
  const dir = join(GOLDEN, name)
  const result = compile(readInput(dir))

  const produced = new Map<string, string>()
  for (const file of result.files) produced.set(file.path, file.text)
  produced.set('manifest.json', `${JSON.stringify(result.manifest, null, 2)}\n`)

  if (UPDATE) writeAll(join(dir, 'expected'), produced)
  const expected = readExpected(join(dir, 'expected'))

  it('expected 파일 목록이 같다 (파일이 새로 생기거나 사라지면 빨개진다)', () => {
    expect([...produced.keys()].sort()).toEqual([...expected.keys()].sort())
  })

  it.each([...produced.keys()].sort())('%s 의 내용이 byte 로 같다', (path) => {
    expect(produced.get(path)).toBe(expected.get(path))
  })

  it('manifest_hash 가 파일 해시로부터 다시 계산된다 (SPEC §3 의 식)', () => {
    expect(result.manifest.manifest_hash).toBe(manifestHash(result.manifest.files))
  })

  it('두 번 컴파일해도 같다 (P4)', () => {
    const again = compile(readInput(dir))
    expect(again.manifest).toEqual(result.manifest)
    expect(again.files.map((f) => f.text)).toEqual(result.files.map((f) => f.text))
  })
})

describe('golden 케이스 자체', () => {
  // SPEC §4.4 는 3종을 요구한다. tools/principles.ps1 의 P4b 도 3개 미만이면 FAIL 이다.
  it('3종 이상이다', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(3)
  })

  it('갱신 모드로 돌지 않았다 (UPDATE_GOLDEN 을 켠 채 커밋하면 게이트가 없는 것과 같다)', () => {
    expect(UPDATE).toBe(false)
  })
})
