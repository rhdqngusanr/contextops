import { describe, expect, it } from 'vitest'
import { Manifest, ManifestFile, PRODUCT_TEXT_PACK_FILES } from '../src'

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
