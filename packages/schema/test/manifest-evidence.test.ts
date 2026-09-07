import { describe, expect, it } from 'vitest'
import { Manifest, ManifestFile, PRODUCT_TEXT_PACK_FILES, toJsonSchema } from '../src'

// =====================================================================
//  🔴 P7 의 **예외가 하나뿐인가**를 잠근다 (SPEC §4.3 · FINDINGS 43).
//
//  ★ 왜 — 「근거 없는 파일 금지」를 `min(1)` 하나로 두던 자리를 예외 표로 바꿨다.
//    표가 있으면 예외가 넓어졌는지 아무도 모르게 된다 — 그래서 「표 밖의 경로는
//    여전히 막힌다」를 기계가 센다. 이게 없으면 다음 예외가 조용히 들어온다.
// =====================================================================

const FILE = {
  path: 'CLAUDE.md',
  sha256: 'a'.repeat(64),
  size: 10,
  target: 'claude',
  source_item_ids: ['item_sample'],
} as const

describe('ManifestFile.source_item_ids (P7)', () => {
  it('표 밖의 파일은 근거가 비면 막힌다', () => {
    const result = ManifestFile.safeParse({ ...FILE, source_item_ids: [] })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('source_item_ids')
  })

  it.each([...PRODUCT_TEXT_PACK_FILES])('%s 는 근거가 비어도 지난다 (제품이 넣는 고정 텍스트)', (path) => {
    expect(ManifestFile.safeParse({ ...FILE, path, source_item_ids: [] }).success).toBe(true)
  })

  it('예외 표에 있는 파일도 근거가 있으면 그대로 지난다', () => {
    const path = PRODUCT_TEXT_PACK_FILES[0]
    expect(ManifestFile.safeParse({ ...FILE, path }).success).toBe(true)
  })

  it('예외는 표에 적힌 것뿐이다 — 늘어났으면 여기서 알린다', () => {
    expect([...PRODUCT_TEXT_PACK_FILES]).toEqual(['.claude/rules/workflow.md'])
  })

  it('Manifest 안에서도 같은 규칙이 걸린다 (파일 하나만 검사하는 게 아니다)', () => {
    const base = {
      schema_version: '1.0',
      compiler_version: '0.1.0',
      template_version: '1.1',
      team_id: 'b1a7d9e0-0000-4000-8000-000000000001',
      project_id: 'b1a7d9e0-0000-4000-8000-000000000002',
      context_version: '1.0.0',
      generated_at: '2026-09-03T00:00:00.000Z',
      snapshot_hash: 'b'.repeat(64),
      files: [{ ...FILE, source_item_ids: [] }],
      manifest_hash: 'c'.repeat(64),
    }
    expect(Manifest.safeParse(base).success).toBe(false)
  })
})

// =====================================================================
//  🔴 **배포되는 JSON Schema 도 같은 규칙을 말한다** (FINDINGS 47)
//
//  ★ 왜 따로 재나 — 위 시험은 Zod 로 잰다. 그런데 우리가 플러그인과 함께 **나눠 주는**
//    계약 문서는 `plugin/contextops/schemas/manifest.json` 이고, `z.toJSONSchema` 는
//    `.refine()` 을 **조용히 버린다.** 실제로 `minItems: 1` 이 사라진 채 배포됐고,
//    그 파일만으로 재면 **아무 경로나 빈 `source_item_ids` 로 지나갔다.**
//
//  ⚠ 그 규칙은 `json-schema.ts` 의 `applyP7Rule()` 이 **손으로** 넣는다 — JSON Schema 를
//    손으로 짜는 유일한 자리다. 「Zod 정본과 일치한다」를 재는 `json-schema.test.ts` 는
//    이 자리에서 아무것도 못 재므로, **예외 목록이 표와 같은지**를 여기서 센다.
//    예외를 하나 더하면 이 시험이 먼저 빨개진다.
// =====================================================================
describe('P7 규칙이 JSON Schema 로도 나간다', () => {
  const schema = toJsonSchema('manifest')

  /** `$defs` 로 접혀서 이름이 `__schemaN` 이다 — **모양**으로 찾는다. */
  function manifestFileNode(): Record<string, unknown> {
    const defs = (schema['$defs'] ?? {}) as Record<string, Record<string, unknown>>
    const found = Object.values(defs).find((node) => {
      const props = node['properties']
      return typeof props === 'object' && props !== null
        && 'source_item_ids' in (props as object) && 'sha256' in (props as object)
    })
    expect(found, 'manifest.json 에서 파일 한 줄의 정의를 못 찾았다').toBeDefined()
    return found as Record<string, unknown>
  }

  it('「비지 않았거나 · 예외 경로거나」가 anyOf 로 들어 있다', () => {
    const node = manifestFileNode()
    const anyOf = node['anyOf'] as { properties?: Record<string, Record<string, unknown>> }[] | undefined
    expect(anyOf, 'refine 이 버려졌다 — 배포되는 계약이 실제보다 느슨하다').toHaveLength(2)
    expect(anyOf?.[0]?.properties?.['source_item_ids']?.['minItems']).toBe(1)
  })

  it('예외 목록이 `PRODUCT_TEXT_PACK_FILES` 와 **글자 그대로** 같다', () => {
    const node = manifestFileNode()
    const anyOf = node['anyOf'] as { properties?: Record<string, Record<string, unknown>> }[]
    expect(anyOf[1]?.properties?.['path']?.['enum']).toEqual([...PRODUCT_TEXT_PACK_FILES])
  })
})
