import { describe, expect, it } from 'vitest'
import { SOURCE_REF, SOURCE_REF_KINDS, SourceRef, type SourceRefKind } from '../src/common'

// SourceRef 4종이 전부 살아 있는가 (loop/PROMPT.md ④2-B).
const SAMPLES = {
  source_document: {
    kind: 'source_document',
    document_version_id: '3f9c2e1a-0000-4000-8000-000000000010',
    start_char: 1840,
    end_char: 1961,
    heading_path: ['결제', '재시도'],
  },
  repository_path: {
    kind: 'repository_path',
    repo: 'paylab-api',
    path: 'src/payment/retry.ts',
    start_line: 14,
    end_line: 20,
    commit_sha: 'a'.repeat(40),
  },
  proposal: { kind: 'proposal', proposal_id: '3f9c2e1a-0000-4000-8000-000000000011' },
  manual: { kind: 'manual', note: '팀장 승인 2026-09-01' },
} as const satisfies Record<SourceRefKind, Record<string, unknown>>

describe('SourceRef 표', () => {
  it('4종이고 표·표본이 같은 키를 덮는다', () => {
    expect(SOURCE_REF_KINDS).toHaveLength(4)
    expect(Object.keys(SOURCE_REF)).toEqual([...SOURCE_REF_KINDS])
    expect(Object.keys(SAMPLES)).toEqual([...SOURCE_REF_KINDS])
  })

  it.each(SOURCE_REF_KINDS)('%s 가 파싱된다', (kind) => {
    expect(SourceRef.safeParse(SAMPLES[kind]).success).toBe(true)
  })

  it('모르는 kind 는 거부한다', () => {
    expect(SourceRef.safeParse({ kind: 'auto_memory', note: 'x' }).success).toBe(false)
  })

  // 🔴 P1 — repository_path 는 **어디를 봤는지**만 말한다. 본문을 실을 자리가 없다.
  it.each(['snippet', 'file_content', 'code_body', 'diff', 'patch'])(
    'repository_path 에 %s 키를 얹으면 거부한다 (P1)',
    (key) => {
      const withBody = { ...SAMPLES.repository_path, [key]: 'const MAX_RETRY = 3' }
      expect(SourceRef.safeParse(withBody).success).toBe(false)
    },
  )

  it.each(['/etc/passwd', '../../secrets.env', 'C:/Windows/win.ini', 'a/../../b'])(
    '저장소 밖 경로 %s 는 거부한다 (SPEC §8.5 6단계)',
    (path) => {
      expect(SourceRef.safeParse({ ...SAMPLES.repository_path, path }).success).toBe(false)
    },
  )
})
