import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ERROR_CODES, ERROR_STATUS, type ErrorCode } from '@contextops/schema'

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
 * 지금은 API 1군까지 왔고, 아래 넷은 뒤 행이 주인이다.
 */
const WITHOUT_OWNER: Partial<Record<ErrorCode, string>> = {
  STALE_BASE: 'PLAN P1 셋째 행 — 발행 트랜잭션 (SPEC §2.1 1단계)',
  COMPILE_FAILED: 'PLAN P1 셋째 행 — 발행 트랜잭션 (SPEC §2.1 5단계)',
  BUDGET_EXCEEDED: 'PLAN P3 첫 행 — 서버측 AI 예산 가드 (SPEC §7.5)',
  RATE_LIMITED: 'PLAN P3 첫 행 — 게스트 데모의 IP당 상한 (SPEC §7.4)',
}

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

  it('API 1군이 쓰는 여섯은 실제로 내는 자리가 있다', () => {
    const live = ERROR_CODES.filter((code) => callersOf(code).length > 0)
    expect([...live].sort()).toEqual([
      'FORBIDDEN', 'INTERNAL', 'NOT_FOUND', 'REVISION_CONFLICT', 'UNAUTHORIZED', 'VALIDATION_FAILED',
    ])
  })
})
