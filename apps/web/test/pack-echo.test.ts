import { describe, expect, it } from 'vitest'

import { findEchoes } from '../scripts/pack-echo'

// =====================================================================
//  `scripts/pack-echo.ts` — 「종이가 같은 말을 두 번 하지 않는가」의 정본을 잰다
//  (FINDINGS 99 · 100 · **169**)
//
//  ★ 왜 시험이 생겼나 — 이 검사는 관통(`walkthrough-publish.ts`)에서만 불렸다. 즉
//    **무엇을 무는지**를 아무도 안 재고 있었고, 기준을 한 칸 느슨하게 고쳐도 관통은
//    초록이었다. 169 로 규칙을 하나 더하면서 무는 자리를 여기 못 박는다.
//
//  ★ 무엇을 재나 —
//    ① 같은 조각이 두 번 → 메아리 (99·100 이 잡던 것)
//    ② **한 조각이 다른 조각 안에 통째로 들어 있으면** → 메아리 (169 가 더한 것)
//    ③ 말을 바꿔 되풀이하는 것은 **안 문다** — 그건 사람이 읽고 잡는다고 적어 둔 자리라,
//       무는 것으로 바뀌면 이 시험이 알려 준다
//    ④ 파일이 다르면 메아리가 아니다 (요약 절과 본문 절)
// =====================================================================

/** 한 항목의 블록 하나 — 마지막 줄에 역추적 태그를 단다 (`traceLines` 가 읽는 모양). */
function block(itemId: string, lines: readonly string[]): string {
  return `${lines.join('\n')}\n<!-- ctx:${itemId} rev:1 conf:high src:doc:doc-1#0-10 -->\n`
}

describe('pack-echo — 한 항목이 같은 말을 두 번 적는 자리', () => {
  it('같은 조각이 두 번이면 문다', () => {
    const files = new Map([['CLAUDE.md', block('item_a', [
      '- **정산은 하루 1회 배치다** — 가맹점 정산은 하루 1회 배치로만 한다',
      '  가맹점 정산은 하루 1회 배치로만 한다',
    ])]])
    expect(findEchoes(files).map((e) => e.fragment)).toEqual(['가맹점 정산은 하루 1회 배치로만 한다'])
  })

  it('꼬리만 붙인 되풀이도 문다 — 조각이 조각 안에 통째로 들어 있다 (169)', () => {
    const files = new Map([['CLAUDE.md', block('item_goal_success_rate', [
      '- **장애 구간에도 승인이 선다** — 결제 승인 성공률 99.5%',
      '  PSP 장애 구간을 포함한 주간 성공률로 잰다.',
      '  지표: PSP 장애 구간을 포함한 주간 성공률',
    ])]])
    const echoes = findEchoes(files)
    expect(echoes).toHaveLength(1)
    expect(echoes[0]?.fragment).toBe('PSP 장애 구간을 포함한 주간 성공률')
    expect(echoes[0]?.itemId).toBe('item_goal_success_rate')
  })

  it('이름이 제 경로 안에 들어 있는 것은 안 문다 — 짧은 조각은 세지 않는다', () => {
    const files = new Map([['CLAUDE.md', block('item_arch_payment', [
      '### payment',
      '- 경로: `src/payment/`',
    ])]])
    expect(findEchoes(files)).toEqual([])
  })

  it('말을 바꾼 되풀이는 안 문다 — 기준을 낱말까지 내리지 않았다는 뜻이다', () => {
    const files = new Map([['CLAUDE.md', block('item_b', [
      '- **정산은 하루 1회 배치다** — 가맹점 정산은 하루 1회 배치로만 한다',
      '  가맹점 정산은 즉시 일어나지 않는다',
    ])]])
    expect(findEchoes(files)).toEqual([])
  })

  it('파일이 다르면 메아리가 아니다 — 요약 절과 본문 절이다', () => {
    const line = '- 가맹점 정산은 하루 1회 배치로만 한다'
    const files = new Map([
      ['CLAUDE.md', block('item_c', [line])],
      ['.claude/rules/constraints.md', block('item_c', [line])],
    ])
    expect(findEchoes(files)).toEqual([])
  })
})
