import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { JSON_SCHEMA_FILES, SCHEMA_OUT_DIR, toJsonSchemaText, type JsonSchemaName } from '../src/json-schema'

// =====================================================================
//  플러그인에 배포되는 JSON Schema 가 Zod 정본과 **어긋나지 않는지** 잠근다.
//  ⚠ 빨개지면 expected 를 덮지 말고 산출기를 돌려라:
//      pnpm --filter @contextops/schema schemas
// =====================================================================

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const outDir = join(root, SCHEMA_OUT_DIR)
const NAMES = Object.keys(JSON_SCHEMA_FILES) as JsonSchemaName[]

describe('JSON Schema 산출', () => {
  it('두 번 뽑아도 같은 바이트다 (산출이 결정론이다)', () => {
    for (const name of NAMES) {
      expect(toJsonSchemaText(name)).toBe(toJsonSchemaText(name))
    }
  })

  it.each(NAMES)('%s.json 이 Zod 정본과 일치한다', (name) => {
    const onDisk = readFileSync(join(outDir, `${name}.json`), 'utf8')
    expect(onDisk).toBe(toJsonSchemaText(name))
  })

  it('폴더에 표 밖의 파일이 없다', () => {
    const onDisk = readdirSync(outDir).filter((f) => f.endsWith('.json')).sort()
    expect(onDisk).toEqual(NAMES.map((n) => `${n}.json`).sort())
  })

  it('플러그인 init Skill 이 이름으로 지목하는 파일이 있다 (SPEC §8.4)', () => {
    expect(NAMES).toContain('context-item-draft')
  })
})
