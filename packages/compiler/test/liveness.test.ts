import { PACK_TARGETS, SOURCE_REF_KINDS, SourceRef, type ItemType } from '@contextops/schema'
import { describe, expect, it } from 'vitest'
import { compile } from '../src'
import { srcKindOf, srcTag } from '../src/tag'
import { ALL_TYPES, ANCHOR, makeInput, makeItem } from './fixtures'

// =====================================================================
//  🔴 「표의 항목이 **전부 실제로 뭔가를 바꾼다**」를 잠근다 (loop/PROMPT.md ④2-B).
//
//  ★ 왜 이 시험이 필요한가 — 타입은 10종인데 8종을 아무도 안 읽고, 값은 4개인데
//    2개만 출력을 바꾸는 고장은 **눈으로 절대 안 잡힌다.** 화면에는 멀쩡히 뜬다.
//    그래서 「값을 바꾸면 결과가 갈리는가」를 기계가 센다.
//
//  판정법은 하나다: 값만 바꿔 컴파일하고 **산출물 지문이 서로 다른가**를 본다.
// =====================================================================

/** 산출물 전체의 지문 — 파일 내용·제외 목록·해시가 모두 들어간다. */
function fingerprint(items: Parameters<typeof makeInput>[0]): string {
  const result = compile(makeInput(items))
  return JSON.stringify({
    files: result.files.map((f) => [f.path, f.text]),
    excluded: result.excluded,
    manifest_hash: result.manifest.manifest_hash,
    milestones: result.manifest.milestones,
  })
}

function allDistinct(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

describe('ItemType 10종', () => {
  it.each(ALL_TYPES)('%s 를 넣으면 산출물이 달라진다 (배치되거나 제외되거나)', (type: ItemType) => {
    const base = fingerprint([ANCHOR])
    const withType = fingerprint(type === 'mission' ? [makeItem('mission', { title: '다른 미션 표본' })] : [ANCHOR, makeItem(type)])
    expect(withType).not.toBe(base)
  })

  it('10종의 산출물이 서로 전부 다르다 (두 타입이 같은 줄을 내면 하나는 죽은 것이다)', () => {
    const prints = ALL_TYPES.map((type) => fingerprint(type === 'mission' ? [ANCHOR] : [ANCHOR, makeItem(type)]))
    expect(allDistinct(prints)).toBe(true)
  })
})

describe('항목 status 4종', () => {
  // active 만 Pack 에 나가고, 나머지 셋은 **서로 다른 이유**로 제외된다.
  it('4종이 서로 다른 결과를 낸다', () => {
    const prints = (['active', 'draft', 'review', 'deprecated'] as const).map((status) =>
      fingerprint([ANCHOR, makeItem('policy', { status })]),
    )
    expect(allDistinct(prints)).toBe(true)
  })

  it('active 가 아니면 Pack 에 없고 excluded 에 이유가 남는다', () => {
    const result = compile(makeInput([ANCHOR, makeItem('policy', { status: 'draft' })]))
    expect(result.files.some((f) => f.text.includes('item_t_policy'))).toBe(false)
    expect(result.excluded).toContainEqual({ item_id: 'item_t_policy', reason: expect.stringContaining('초안') })
  })
})

describe('confidence 3단계', () => {
  it('3단계가 역추적 태그를 바꾼다', () => {
    const prints = (['high', 'medium', 'low'] as const).map((confidence) => fingerprint([makeItem('mission', { confidence })]))
    expect(allDistinct(prints)).toBe(true)
  })

  it('태그에 conf: 가 적힌다', () => {
    const result = compile(makeInput([makeItem('mission', { confidence: 'low' })]))
    expect(result.files.find((f) => f.path === 'CLAUDE.md')?.text).toContain('conf:low')
  })
})

describe('enforcement 4종', () => {
  it('4종이 정책 줄을 바꾼다', () => {
    const prints = (['hook', 'review', 'permission', 'none'] as const).map((enforcement) =>
      fingerprint([ANCHOR, makeItem('policy', { data: { rule: '환불은 3일 안에', severity: 'must', enforcement } })]),
    )
    expect(allDistinct(prints)).toBe(true)
  })
})

describe('scope.kind 3종', () => {
  it('3종이 서로 다른 파일로 간다', () => {
    const paths = (['project', 'domain', 'path'] as const).map((kind) => {
      const scope = kind === 'project' ? { kind } : { kind, value: 'payment' }
      const result = compile(makeInput([ANCHOR, makeItem('policy', { scope })]))
      return result.files.find((f) => f.text.includes('item_t_policy'))?.path
    })
    expect(paths).toEqual(['CLAUDE.md', '.claude/rules/domain-payment.md', '.claude/rules/scoped-payment.md'])
  })
})

describe('SourceRef 4종', () => {
  const SAMPLES = {
    source_document: { kind: 'source_document', document_version_id: 'c0ffee00-0000-4000-8000-0000000000a1', start_char: 1, end_char: 9, heading_path: ['미션'] },
    repository_path: { kind: 'repository_path', repo: 'paylab-api', path: 'src/pay.ts', start_line: 3, end_line: 9 },
    proposal: { kind: 'proposal', proposal_id: 'c0ffee00-0000-4000-8000-0000000000b1' },
    manual: { kind: 'manual', note: '회의 합의' },
  } as const

  it('표본이 4종을 모두 덮는다', () => {
    expect(Object.keys(SAMPLES)).toEqual([...SOURCE_REF_KINDS])
  })

  it('4종이 서로 다른 태그를 낸다', () => {
    const prints = SOURCE_REF_KINDS.map((kind) => fingerprint([makeItem('mission', { source_refs: [SAMPLES[kind]] })]))
    expect(allDistinct(prints)).toBe(true)
  })

  //  🔴 쓰고 되읽는 왕복을 잠근다. 접두사가 `SRC_TAG` 와 `srcKindOf` 두 곳으로 갈라지면
  //     태그는 멀쩡한데 **아무도 그 종류를 못 알아본다** — 그러면 「데모가 근거 몇 갈래를
  //     보여 주나」를 세는 관통(FINDINGS 93)이 조용히 0 을 세게 된다.
  it('낸 태그를 되읽으면 같은 종류가 나온다', () => {
    //  ⚠ 표본은 `as const` 라 그대로는 `SourceRef` 가 아니다. 계약으로 **파싱해서** 넘긴다 —
    //    캐스트로 밀어 넣으면 표본이 계약을 어겨도 이 시험이 초록으로 남는다.
    const parsed = SOURCE_REF_KINDS.map((kind) => SourceRef.parse(SAMPLES[kind]))
    expect(parsed.map((ref) => srcKindOf(srcTag(ref)))).toEqual([...SOURCE_REF_KINDS])
  })

  it('모르는 접두사는 지어내지 않는다', () => {
    expect(srcKindOf('mystery:1-2')).toBeNull()
    expect(srcKindOf('접두사가 없다')).toBeNull()
  })
})

describe('PackTarget 3종', () => {
  // ⚠ 지금 나오는 타깃은 `claude` 하나다. `agents`·`cursor` 는 docs/PLAN.md P5 행이고
  //   docs/feedback/FINDINGS.md 에 [구멍]으로 올려 뒀다. 그 행을 하면 여기가 빨개진다 —
  //   **그때 이 시험을 고치면서 FINDINGS 를 닫아라.** 빨개지는 것이 알림이다.
  it('아직 claude 타깃만 나온다 (agents·cursor 는 P5 행 · FINDINGS 8)', () => {
    const result = compile(makeInput([ANCHOR, makeItem('domain'), makeItem('adr'), makeItem('workflow')]))
    expect([...new Set(result.files.map((f) => f.target))]).toEqual(['claude'])
    expect(PACK_TARGETS).toEqual(['claude', 'agents', 'cursor'])
  })
})
