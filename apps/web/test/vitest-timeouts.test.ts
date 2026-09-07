import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import base, { HOOK_TIMEOUT_MS, TEST_TIMEOUT_MS } from '../../../vitest.base'

// =====================================================================
//  🔴 vitest 의 **상한 둘**은 한 곳에 산다 — 루트 `vitest.base.ts` (FINDINGS 136 · 153)
//    ① 훅 상한 `HOOK_TIMEOUT_MS`   — `beforeEach`/`afterAll` 따위가 기다리는 것 (PGlite 기동)
//    ② 시험 본문 상한 `TEST_TIMEOUT_MS` — `it` 본문이 기다리는 것 (자식 프로세스 기동)
//  ⚠ 둘은 **다른 개념이다.** 값이 같아도 한쪽을 고칠 때 다른 쪽을 따라 고치지 마라 — 재는 것이 다르다.
//
//  ★ 왜 이름이 `hook-timeout` 이 아닌가 — 이 파일이 이제 **둘 다** 센다. 이름이 세는 것과 다르면
//    다음 사람은 그 이름을 믿고 두 번째 자리를 딴 데 만든다 (같은 이유로 100바퀴가 `import.docs` 를
//    `import.jobs` 로 바꿨다).
//
//  --- 아래는 ① 의 기록이다 (FINDINGS 136) ---
//
//  ★ 왜 시험인가 — 72바퀴에 CI 의 test 층이 코드 변화 0 으로 빨개졌다. 부하(사람의 게임 · CPU 70%)에서
//    32 파일이 한꺼번에 PGlite 를 띄우니 첫 훅이 17~18초가 됐고, 기본 상한 10초를 넘긴 것이다.
//    그때 이미 **7 파일이 저마다 `beforeEach(…, 60_000)` 을 들고 있었고** 나머지는 기본값이었다 —
//    같은 수치가 흩어져 갈린 상태 그대로다. 정본을 하나로 모으고, 다시 흩어지면 여기서 빨개진다.
//
//  재는 것:
//    ① 설정의 `test.hookTimeout` 이 실제로 그 상수다 — 상수만 있고 설정이 안 읽으면 「정의만 있는 것」이다
//    ② 그 값이 잰 최악(부하에서 18초 · docs/evidence/2026-09-06-hook-timeout/)보다 크고 기본값보다 크다
//    ③ 워크스페이스의 모든 `*.test.ts` 에서 훅에 둘째 인자(자기 상한)를 준 곳이 **0** 이다
//
//  ⚠ 이 시험이 재지 못하는 것: 부하에서 실제로 초록인가. 그건 `pnpm --filter web test` 를 부하 있을 때 ·
//    없을 때 각 한 번 돌려 본다 (FINDINGS 136 의 「잠그는 법」).
//
//  --- 아래는 ② 의 기록이다 (FINDINGS 153) ---
//
//  ★ 왜 시험인가 — `plugin/contextops/test/hooks.test.ts` 가 **코드 변화 0 으로 두 번** CI 를 빨갛게 했다
//    (90 · 92바퀴 · 둘 다 `Test timed out in 5000ms`). 기본 5초는 자식 프로세스를 진짜로 띄우는 시험에
//    대해 부하에서 너무 낮다. 수치의 근거는 `vitest.base.ts` 의 주석과 `docs/evidence/2026-09-07-test-timeout/`.
//
//  재는 것:
//    ④ 설정의 `test.testTimeout` 이 실제로 그 상수다
//    ⑤ 그 값이 **관측된 실패(5초)** 보다 크고 vitest 기본(5초)보다 크다
//    ⑥ 워크스페이스의 모든 `*.test.ts` 에서 `it`/`test` 에 셋째 인자(자기 상한)를 준 곳이 **0** 이다
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')

/** 부하에서 잰 첫 훅의 최악값 — `docs/evidence/2026-09-06-hook-timeout/` (72바퀴 17~18초). */
const MEASURED_WORST_HOOK_MS = 18_000
/** vitest 의 기본 `hookTimeout`. 이보다 크지 않으면 설정이 아무 일도 안 한 것이다. */
const VITEST_DEFAULT_HOOK_TIMEOUT_MS = 10_000

/** 실제로 CI 를 빨갛게 한 값 — vitest 가 5초에 죽여서 **진짜 값은 아무도 모른다** (FINDINGS 153). */
const OBSERVED_FAILURE_TEST_MS = 5_000
/** vitest 의 기본 `testTimeout`. 이보다 크지 않으면 설정이 아무 일도 안 한 것이다. */
const VITEST_DEFAULT_TEST_TIMEOUT_MS = 5_000

const HOOKS = new Set(['beforeEach', 'beforeAll', 'afterEach', 'afterAll'])
/** 시험 본문을 여는 이름. `it.only`·`test.each(…)` 처럼 감싸도 뿌리는 이것이다. */
const TESTS = new Set(['it', 'test'])
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.ci'])

function testFiles(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) testFiles(join(dir, ent.name), out)
    } else if (ent.name.endsWith('.test.ts')) {
      out.push(join(dir, ent.name))
    }
  }
  return out
}

/** 훅 호출에 둘째 인자(상한)를 준 자리 — `파일:줄`. 문자열 안의 글자에 속지 않게 TS 로 파싱한다. */
function hookTimeoutsIn(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const visit = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      HOOKS.has(n.expression.text) &&
      n.arguments.length >= 2
    ) {
      const { line } = src.getLineAndCharacterOfPosition(n.getStart(src))
      found.push(`${relative(repoRoot, file).replace(/\\/g, '/')}:${line + 1}`)
    }
    ts.forEachChild(n, visit)
  }
  visit(src)
  return found
}

/**
 * `it`/`test` 호출에 **셋째** 인자(상한)를 준 자리 — `파일:줄`.
 * ⚠ 훅과 자리가 다르다: 훅은 `(fn, ms)` 지만 시험은 `(이름, fn, ms)` 다. 둘째를 세면 전부 걸린다.
 * `it.only(…)` · `it.each([…])(…)` 처럼 감싼 것도 잡으려고 **호출 사슬의 뿌리 이름**을 본다.
 */
function testTimeoutsIn(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const rootName = (node: ts.Expression): string | undefined => {
    let at: ts.Node = node
    for (;;) {
      if (ts.isIdentifier(at)) return at.text
      if (ts.isPropertyAccessExpression(at) || ts.isCallExpression(at)) { at = at.expression; continue }
      return undefined
    }
  }
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && n.arguments.length >= 3) {
      const name = rootName(n.expression)
      if (name !== undefined && TESTS.has(name)) {
        const { line } = src.getLineAndCharacterOfPosition(n.getStart(src))
        found.push(`${relative(repoRoot, file).replace(/\\/g, '/')}:${line + 1}`)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(src)
  return found
}

/** 워크스페이스의 모든 `*.test.ts`. 걷기가 조용히 0 을 찾는 상태를 막으려고 표본을 확인한다. */
function allTestFiles(): string[] {
  const files = ['apps', 'packages', 'plugin'].flatMap((d) => testFiles(join(repoRoot, d)))
  expect(files.some((f) => f.endsWith('api-routes.test.ts'))).toBe(true)
  expect(files.some((f) => f.endsWith('golden.test.ts'))).toBe(true)
  //  🔴 153 이 난 자리다 — 이 파일이 목록에 없으면 이 시험은 아무것도 안 지킨다.
  expect(files.some((f) => f.endsWith(`plugin${sep}contextops${sep}test${sep}hooks.test.ts`))).toBe(true)
  expect(files.length).toBeGreaterThan(30)
  return files
}

describe('🔴 훅 상한은 vitest.base.ts 한 곳에 산다 (FINDINGS 136)', () => {
  it('① 설정의 test.hookTimeout 이 HOOK_TIMEOUT_MS 다 — 상수만 있고 안 읽는 상태가 아니다', () => {
    const cfg = base as { test?: { hookTimeout?: number } }
    expect(cfg.test?.hookTimeout).toBe(HOOK_TIMEOUT_MS)
  })

  it('② 그 값이 부하에서 잰 최악(18초)보다 크고 vitest 기본(10초)보다 크다', () => {
    expect(HOOK_TIMEOUT_MS).toBeGreaterThan(MEASURED_WORST_HOOK_MS)
    expect(HOOK_TIMEOUT_MS).toBeGreaterThan(VITEST_DEFAULT_HOOK_TIMEOUT_MS)
  })

  it('③ 워크스페이스의 어떤 시험 파일도 훅에 자기 상한을 주지 않는다', () => {
    const scattered = allTestFiles().flatMap(hookTimeoutsIn)
    expect(
      scattered,
      `훅에 자기 상한을 준 시험 파일이 있다 — 수치는 루트 vitest.base.ts 의 HOOK_TIMEOUT_MS 하나다:\n  ${scattered.join('\n  ')}`,
    ).toEqual([])
  })
})

describe('🔴 시험 본문 상한도 vitest.base.ts 한 곳에 산다 (FINDINGS 153)', () => {
  it('④ 설정의 test.testTimeout 이 TEST_TIMEOUT_MS 다 — 상수만 있고 안 읽는 상태가 아니다', () => {
    const cfg = base as { test?: { testTimeout?: number } }
    expect(cfg.test?.testTimeout).toBe(TEST_TIMEOUT_MS)
  })

  it('⑤ 그 값이 관측된 실패(5초)보다 크고 vitest 기본(5초)보다 크다', () => {
    expect(TEST_TIMEOUT_MS).toBeGreaterThan(OBSERVED_FAILURE_TEST_MS)
    expect(TEST_TIMEOUT_MS).toBeGreaterThan(VITEST_DEFAULT_TEST_TIMEOUT_MS)
  })

  it('⑥ 워크스페이스의 어떤 시험 파일도 it/test 에 자기 상한을 주지 않는다', () => {
    const scattered = allTestFiles().flatMap(testTimeoutsIn)
    expect(
      scattered,
      `시험에 자기 상한을 준 파일이 있다 — 수치는 루트 vitest.base.ts 의 TEST_TIMEOUT_MS 하나다:\n  ${scattered.join('\n  ')}`,
    ).toEqual([])
  })
})
