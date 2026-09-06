import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AI_JOB_RETRY_RULES, AI_JOB_STATUSES, ERROR_CODES, ERROR_STATUS, jobRetryMode, type ErrorCode,
} from '@contextops/schema'

import { ApiError } from '../src/lib/api/error'
import { failure } from '../src/lib/api/respond'

// =====================================================================
//  에러 코드가 **정의만 있고 아무 일도 안 하는 자리**가 되지 않게 잠근다
//  (docs/feedback/FINDINGS.md 12번 · SPEC §5)
//
//  🔴 **이 파일의 핵심은 아래 `WITHOUT_OWNER` 표다.**
//     「코드 9종이 있다」는 검사는 쉽고 아무것도 증명하지 않는다. 여기서 재는 것은
//     **소비처가 있는가**이고, 아직 없는 코드는 「누가 언제 만들 것인가」를 표에
//     적게 한다. 그 행을 만들면 그 코드에 소비처가 생겨서 **이 시험이 빨개지고**,
//     고치는 방법은 표에서 한 줄을 지우는 것뿐이다 — 목록이 저절로 줄어든다.
//
//  ⚠ 표를 늘려서 초록을 만들지 마라. 그건 「이 코드는 안 쓴다」를 선언하는 것이고,
//    그럴 거면 `ERROR_CODES` 에서 지우는 게 맞다.
// =====================================================================

const webSrc = fileURLToPath(new URL('../src', import.meta.url))

/**
 * 아직 **내는 자리가 없는** 코드 → 그 코드를 만들 PLAN 행.
 * ⚠ `STALE_BASE`·`COMPILE_FAILED` 는 발행 트랜잭션이 실제로 내게 되어 여기서 지웠다
 *   (`lib/api/publish.ts` · PLAN P1 셋째 행).
 * ⚠ `BUDGET_EXCEEDED`·`RATE_LIMITED` 도 지웠다 — 예산 가드(`lib/ai/budget.ts`)가
 *   실제로 던진다 (PLAN P3 첫 행 · SPEC §7.5). **표를 늘려서 초록을 만들지 마라.**
 *
 * 🔴 **지금은 비어 있다.** 열 코드가 전부 내는 자리를 가졌다는 뜻이고,
 *    새 코드를 `ERROR_CODES` 에 더하면 이 표에 한 줄 적거나 소비처를 만들어야 한다.
 */
const WITHOUT_OWNER: Partial<Record<ErrorCode, string>> = {}

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sourceFiles(full, found)
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) found.push(full)
  }
  return found
}

/** `fail('X')` / `new ApiError('X')` 로 **실제로 내는** 자리를 센다. */
function callersOf(code: ErrorCode): string[] {
  const needle = new RegExp(`(?:fail|new ApiError)\\(\\s*'${code}'`)
  return sourceFiles(webSrc)
    .filter((f) => needle.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(webSrc.length + 1))
}

describe('에러 코드 표가 정본이고, 갈라질 자리가 없다', () => {
  it('목록과 상태 표의 키가 정확히 같다', () => {
    expect(Object.keys(ERROR_STATUS).sort()).toEqual([...ERROR_CODES].sort())
  })

  it('모든 코드가 4xx 또는 5xx 를 낸다', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code].status, code).toBeGreaterThanOrEqual(400)
      expect(ERROR_STATUS[code].status, code).toBeLessThan(600)
      expect(ERROR_STATUS[code].message.length, code).toBeGreaterThan(0)
    }
  })

  it('🔴 **`retryable` 축의 값이 무엇인지 여기 한 번 적혀 있다** (FINDINGS 59)', () => {
    //  ★ 왜 목록을 적나 — 이 축을 읽는 시험(`ai-job` · `web-job-progress`)은 둘 다
    //    **표 자신**을 기대값으로 쓴다 (화면이 서버와 같은 표를 읽는지를 재는 시험이라
    //    그게 맞다). 그러면 표를 잘못 고쳤을 때 아무도 안 막는다 — **닻이 하나 필요하다.**
    //  ⚠ 이 목록을 고치는 것은 「예산을 태우는 버튼을 하나 늘린다」는 결정이다 (P3).
    //    한 줄 늘리기 전에 「무엇이 저절로 달라져서 이번엔 되나」에 답할 수 있어야 한다.
    expect(ERROR_CODES.filter((c) => ERROR_STATUS[c].retryable))
      .toEqual(['BUDGET_EXCEEDED', 'RATE_LIMITED', 'INTERNAL'])
  })

  it('🔴 **어느 수명이 어떻게 다시 굴러가는지도 여기 한 번 적혀 있다** (FINDINGS 154)', () => {
    //  ★ 같은 이유의 닻이다 — 재시도 라우트 시험도 화면 시험도 `AI_JOB_RETRY_RULES`
    //    자신을 기대값으로 쓴다. 표를 잘못 고치면 **양쪽이 사이좋게 따라간다.**
    //  ⚠ `queued` 가 `none` 인 것은 「집히지 않은 채 멈춘 행」을 포기한다는 뜻이 아니다 —
    //    그건 되돌릴 것이 없는 다른 고장이다 (FINDINGS 156).
    expect(AI_JOB_STATUSES.map((s) => [s, AI_JOB_RETRY_RULES[s].mode, AI_JOB_RETRY_RULES[s].needs]))
      .toEqual([
        ['queued', 'none', 'none'],
        ['running', 'fresh', 'stalled'],
        ['succeeded', 'none', 'none'],
        ['failed', 'requeue', 'retryable_error'],
      ])
  })

  it('표를 읽는 문은 모르는 상태·모자란 근거에 `null` 이다', () => {
    //  🔴 `running` 인데 **안 멈춘** job 은 다시 굴릴 수 없다 — 도는 일을 사람이 죽인다.
    expect(jobRetryMode({ status: 'running', error_code: null, stalled: false })).toBeNull()
    expect(jobRetryMode({ status: 'running', error_code: null, stalled: true })).toBe('fresh')
    expect(jobRetryMode({ status: 'failed', error_code: 'BUDGET_EXCEEDED', stalled: false })).toBe('requeue')
    expect(jobRetryMode({ status: 'failed', error_code: 'COMPILE_FAILED', stalled: false })).toBeNull()
    expect(jobRetryMode({ status: 'nope', error_code: null, stalled: true })).toBeNull()
    //  ⚠ `Object.hasOwn` 이라 프로토타입의 이름이 새어 들어오지 않는다.
    expect(jobRetryMode({ status: 'toString', error_code: null, stalled: true })).toBeNull()
  })

  it('코드를 바꾸면 응답이 갈린다 — 상태와 code 가 표를 따라간다', async () => {
    for (const code of ERROR_CODES) {
      const res = failure(new ApiError(code), '3f9c2e1a-0000-4000-8000-000000000000')
      expect(res.status, code).toBe(ERROR_STATUS[code].status)
      const json = (await res.json()) as { error: { code: string; message: string } }
      expect(json.error.code).toBe(code)
      expect(json.error.message).toBe(ERROR_STATUS[code].message)
    }
  })
})

describe('🔴 정의만 있고 아무 일도 안 하는 코드가 없다 (FINDINGS 12)', () => {
  it('소비처가 있는 코드는 「주인 없음」 표에 남아 있으면 안 된다', () => {
    const stale = Object.keys(WITHOUT_OWNER).filter((code) => callersOf(code as ErrorCode).length > 0)
    expect(
      stale,
      `이제 내는 자리가 생겼다 — WITHOUT_OWNER 에서 지워라: ${stale.join(', ')}`,
    ).toEqual([])
  })

  it('소비처가 없는 코드는 「누가 만들 것인가」가 적혀 있어야 한다', () => {
    const orphans = ERROR_CODES
      .filter((code) => callersOf(code).length === 0)
      .filter((code) => WITHOUT_OWNER[code] === undefined)
    expect(
      orphans,
      `내는 자리도 없고 주인도 안 적힌 코드다: ${orphans.join(', ')}`,
    ).toEqual([])
  })

  it('모든 코드가 실제로 내는 자리를 가졌다', () => {
    //  ⚠ 여덟 → 열(예산 가드의 `BUDGET_EXCEEDED`·`RATE_LIMITED`) → **열하나**
    //    (`AI_OUTPUT_INVALID` 를 `lib/ai/structure.ts` 가 낸다 · PLAN P3 첫 행 ②).
    //    이 목록은 `ERROR_CODES` 와 같아야 한다 — 「하나도 죽어 있지 않다」를 통째로 잰다.
    const live = ERROR_CODES.filter((code) => callersOf(code).length > 0)
    expect([...live].sort()).toEqual([...ERROR_CODES].sort())
  })
})
