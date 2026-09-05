import { describe, expect, it } from 'vitest'
import { CLAUDE_MD_MAX_CHARS, RULES_MAX_CHARS, compile } from '../src'
import { ANCHOR, makeInput, makeItem } from './fixtures'

// =====================================================================
//  분량 (SPEC §4.1 5단계) — CLAUDE.md 12,000자 · rules 파일 30,000자.
//
//  ⚠ 한도 숫자를 여기 적지 마라. 상수를 import 해서 쓴다 — 두 곳에 적으면
//    한쪽만 고쳐지고 시험이 「고쳐진 쪽」만 지킨다.
//  ★ golden case-3 은 12,000자 규칙을 파일로 잠근다. 30,000자 분할은 픽스처가
//    너무 커져서 여기서 프로그램으로 만든다.
// =====================================================================

const LONG_RULE = '결제 요청은 idempotency key 를 함께 보내고 같은 key 는 한 번만 청구한다. '.repeat(6).slice(0, 480)

function policies(count: number, scope: Record<string, unknown>) {
  return Array.from({ length: count }, (_, i) =>
    makeItem('policy', {
      id: `item_bulk_${String(i).padStart(3, '0')}`,
      title: `규칙 ${i}`,
      scope,
      data: { rule: `[${i}] ${LONG_RULE}`, severity: 'must', enforcement: 'review' },
    }),
  )
}

describe('CLAUDE.md 12,000자', () => {
  const result = compile(makeInput([ANCHOR, ...policies(40, { kind: 'project' })]))
  const claude = result.files.find((f) => f.path === 'CLAUDE.md')?.text as string

  it('넘으면 정책이 .claude/rules/policies.md 로 옮겨진다', () => {
    expect(claude.length).toBeLessThanOrEqual(CLAUDE_MD_MAX_CHARS)
    expect(result.files.map((f) => f.path)).toContain('.claude/rules/policies.md')
  })

  it('옮겼다는 사실이 경고로 남는다 (조용히 옮기면 아무도 모른다)', () => {
    expect(result.warnings.join(' ')).toContain('policies.md')
  })

  it('한 줄도 잃지 않는다', () => {
    const all = result.files.map((f) => f.text).join('\n')
    for (let i = 0; i < 40; i++) expect(all).toContain(`ctx:item_bulk_${String(i).padStart(3, '0')} `)
  })

  it('한도 아래면 옮기지 않는다', () => {
    const small = compile(makeInput([ANCHOR, ...policies(3, { kind: 'project' })]))
    expect(small.files.map((f) => f.path)).not.toContain('.claude/rules/policies.md')
    expect(small.warnings).toEqual([])
  })

  //  🔴 거울 문서(AGENTS.md)는 분량 규칙의 대상이 아니다 — 「CLAUDE.md 본문 + rules 인라인」이
  //     한 장이어야 하므로, 정책이 policies.md 로 옮겨진 뒤에도 거울에는 **그대로** 있다.
  it('CLAUDE.md 가 정책을 policies.md 로 옮겨도 AGENTS.md 에는 정책이 그대로 있다', () => {
    const agents = result.files.find((f) => f.path === 'AGENTS.md')?.text as string
    expect(agents.length).toBeGreaterThan(CLAUDE_MD_MAX_CHARS)     // 12,000자 규칙을 안 받는다
    for (let i = 0; i < 40; i++) expect(agents).toContain(`ctx:item_bulk_${String(i).padStart(3, '0')} `)
    expect(result.files.filter((f) => f.path.startsWith('AGENTS'))).toHaveLength(1)   // 나뉘지 않는다
  })
})

describe('rules 파일 30,000자', () => {
  const result = compile(makeInput([ANCHOR, ...policies(90, { kind: 'domain', value: 'payment' })]))
  const parts = result.files.filter((f) => f.path.startsWith('.claude/rules/domain-payment'))

  it('넘으면 항목 경계에서 파트로 나뉜다', () => {
    expect(parts.map((f) => f.path)).toEqual(['.claude/rules/domain-payment-2.md', '.claude/rules/domain-payment.md'])
    for (const part of parts) expect(part.text.length).toBeLessThanOrEqual(RULES_MAX_CHARS)
  })

  it('나뉜 파일에도 안내가 붙는다', () => {
    for (const part of parts) expect(part.text).toContain('나뉘었다')
    expect(result.warnings.join(' ')).toContain('domain-payment.md')
  })

  it('거울(AGENTS.md)은 30,000자를 넘어도 나뉘지 않는다 — AGENTS-2.md 는 sync allowlist 밖이다', () => {
    const mirrors = result.files.filter((f) => f.path.startsWith('AGENTS'))
    expect(mirrors.map((f) => f.path)).toEqual(['AGENTS.md'])
    expect((mirrors[0]?.text.length ?? 0) > RULES_MAX_CHARS).toBe(true)
  })

  it('항목이 잘리지 않고 전부 어느 한 파트에 있다', () => {
    const ids = parts.flatMap((p) => p.sourcemap.map((s) => s.item_id))
    expect(new Set(ids).size).toBe(90)
    for (const part of parts) {
      // 블록의 마지막 줄에 태그가 있다 = 블록이 통째로 그 파트 안에 있다
      const lines = part.text.split('\n')
      for (const entry of part.sourcemap) expect(lines[entry.end_line - 1]).toContain(`ctx:${entry.item_id} `)
    }
  })
})
