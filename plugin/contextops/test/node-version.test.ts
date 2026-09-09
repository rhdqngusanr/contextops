import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { BUNDLE_OPTIONS } from '../scripts/build'
import { MIN_NODE_MAJOR, nodeVersionWarning } from '../src/cli/node'

// =====================================================================
//  Node 최소 버전 — 숫자가 사는 자리 셋(`.nvmrc` · `src/cli/node.ts` · esbuild target)이 같은 값인가
//  (2026-09-09 · INBOX 블로커 4: 설치 안내 어디에도 Node 요구가 없어 네이티브 Claude Code 사용자가
//  매 세션 훅 오류 줄을 볼 수 있었다).
// =====================================================================

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const nvmrc = readFileSync(join(repoRoot, '.nvmrc'), 'utf8').trim()

describe('Node 최소 버전의 정본은 .nvmrc 하나다', () => {
  it('MIN_NODE_MAJOR 가 .nvmrc 와 같다', () => {
    expect(String(MIN_NODE_MAJOR)).toBe(nvmrc)
  })

  it('번들 target 도 같은 메이저다 — 낮은 Node 는 문법부터 죽는다', () => {
    expect(BUNDLE_OPTIONS.target).toBe(`node${nvmrc}`)
  })

  it('낮은 버전에는 한 줄로 말하고, 같거나 높은 버전에는 조용하다', () => {
    expect(nodeVersionWarning(`${MIN_NODE_MAJOR - 2}.19.0`)).toContain(`Node ${MIN_NODE_MAJOR} 이상`)
    expect(nodeVersionWarning(`${MIN_NODE_MAJOR}.0.0`)).toBeUndefined()
    expect(nodeVersionWarning(`${MIN_NODE_MAJOR + 2}.1.0`)).toBeUndefined()
    //  이상한 문자열에는 거짓 경고를 내지 않는다
    expect(nodeVersionWarning('')).toBeUndefined()
  })
})
