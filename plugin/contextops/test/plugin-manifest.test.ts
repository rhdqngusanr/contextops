import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { JSON_SCHEMA_FILES, SCHEMA_OUT_DIR } from '@contextops/schema'

// =====================================================================
//  플러그인 레이아웃 (SPEC §8.1 · Claude Code 공식 레이아웃)
//
//  ★ `claude plugin validate` 가 진짜 판정이지만, 그 CLI 는 CI 에 없다.
//    여기서는 **그 도구가 요구하는 최소 모양**과 우리가 두 곳에 적은 값이
//    갈라지지 않는지를 잰다 (버전이 그 예다).
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (...parts: string[]): Record<string, unknown> =>
  JSON.parse(readFileSync(join(packageRoot, ...parts), 'utf8')) as Record<string, unknown>

describe('plugin 레이아웃', () => {
  it('.claude-plugin/plugin.json 이 SPEC §8.1 의 모양이다', () => {
    const manifest = readJson('.claude-plugin', 'plugin.json')
    expect(manifest['name']).toBe('contextops')
    expect(typeof manifest['version']).toBe('string')
    expect(typeof manifest['description']).toBe('string')
  })

  it('버전이 package.json 과 같다 — 두 곳에 적혀 있으니 갈라질 수 있다', () => {
    expect(readJson('package.json')['version']).toBe(readJson('.claude-plugin', 'plugin.json')['version'])
  })

  it('schemas/ 가 `JSON_SCHEMA_FILES` 표와 정확히 같다', () => {
    const onDisk = readdirSync(join(packageRoot, 'schemas')).sort()
    const expected = Object.keys(JSON_SCHEMA_FILES).map((name) => `${name}.json`).sort()
    expect(onDisk).toEqual(expected)
  })

  it('스키마 산출 위치가 이 폴더를 가리킨다', () => {
    //  산출기(`packages/schema/scripts`)가 다른 곳을 보고 있으면 위 시험이
    //  **옛 파일을 보며 초록**이 된다. 자리 자체를 잠근다.
    expect(SCHEMA_OUT_DIR).toBe('plugin/contextops/schemas')
  })
})
