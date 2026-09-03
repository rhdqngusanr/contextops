import { describe, expect, it } from 'vitest'
import {
  CONFIDENCE_LEVELS, ERROR_CODES, ITEM_STATUSES, ITEM_TYPES, SOURCE_REF_KINDS, SYNC_STATUSES,
  type SourceRef,
} from '@contextops/schema'

import { ERROR_HINT } from '../src/lib/web/api'
import { SEMVER_BUMPS, SEMVER_RULE, nextSemver } from '../src/lib/web/semver'
import { toSlug } from '../src/lib/web/slug'
import { readCallbackHash } from '../src/lib/web/auth'
import {
  CONFIDENCE_CHIP, ITEM_STATUS_CHIP, ITEM_TYPE_ICON, SYNC_CHIP,
} from '../src/components/chips'
import { SRC_ICON, SRC_LABEL } from '../src/components/evidence'

// =====================================================================
//  🔴 화면의 표들이 **정의만 있고 아무 일도 안 하는 자리**가 되지 않게 잠근다
//     (loop/PROMPT.md ④2-B · CLAUDE.md 「표의 항목이 전부 실제로 뭔가를 바꾼다」)
//
//  ★ 재는 것은 두 단계다. 첫 단계만 하면 아무것도 증명하지 않는다:
//    ① 표의 키가 스키마 enum 과 **정확히 같다** (하나도 안 빠졌다)
//    ② 값을 바꾸면 **결과가 갈린다** — 라벨·아이콘이 서로 달라서 화면에서 구별된다
//    ②가 없으면 10종 중 8종이 같은 아이콘이어도 초록이다. 화면에는 멀쩡히 뜬다.
//
//  ⚠ 표를 늘려서 초록을 만들지 마라. 값이 필요 없으면 enum 에서 지우는 게 맞다.
// =====================================================================

/** 표 하나를 두 단계로 잰다. `render` 는 그 키가 화면에 내는 것을 문자열로 낸다. */
function assertLiveTable<K extends string>(
  what: string,
  keys: readonly K[],
  table: Record<K, unknown>,
  render: (key: K) => string,
): void {
  expect(Object.keys(table).sort(), `${what}: 표의 키가 enum 과 다르다`).toEqual([...keys].sort())
  const rendered = keys.map(render)
  expect(new Set(rendered).size, `${what}: 서로 다른 값이 같은 것을 낸다 — ${rendered.join(' / ')}`)
    .toBe(keys.length)
}

describe('🔴 상태 칩 표 — 키가 enum 과 같고, 종류마다 다르게 보인다', () => {
  it('sync 5종 (SPEC §6)', () => {
    assertLiveTable('SYNC_CHIP', SYNC_STATUSES, SYNC_CHIP, (k) => `${SYNC_CHIP[k].icon}${SYNC_CHIP[k].label}`)
  })

  it('항목 상태 4종 (SPEC §3)', () => {
    assertLiveTable('ITEM_STATUS_CHIP', ITEM_STATUSES, ITEM_STATUS_CHIP,
      (k) => `${ITEM_STATUS_CHIP[k].icon}${ITEM_STATUS_CHIP[k].label}`)
  })

  it('confidence 3단계 (SPEC §3)', () => {
    assertLiveTable('CONFIDENCE_CHIP', CONFIDENCE_LEVELS, CONFIDENCE_CHIP,
      (k) => `${CONFIDENCE_CHIP[k].icon}${CONFIDENCE_CHIP[k].label}`)
  })

  it('🔴 상태를 색만으로 구분하지 않는다 — 아이콘과 라벨이 항상 있다 (DESIGN_BRIEF §3)', () => {
    for (const table of [SYNC_CHIP, ITEM_STATUS_CHIP, CONFIDENCE_CHIP]) {
      for (const [key, spec] of Object.entries(table) as [string, { icon: string; label: string }][]) {
        expect(spec.icon.length, `${key}: 아이콘이 없다`).toBeGreaterThan(0)
        expect(spec.label.length, `${key}: 라벨이 없다`).toBeGreaterThan(0)
      }
    }
  })

  it('항목 타입 10종의 아이콘이 서로 다르다 (SPEC §3)', () => {
    assertLiveTable('ITEM_TYPE_ICON', ITEM_TYPES, ITEM_TYPE_ICON, (k) => ITEM_TYPE_ICON[k])
  })
})

describe('🔴 근거 4종이 서로 다른 한 줄을 낸다 (SPEC §3 · DESIGN_BRIEF §3 EvidenceLink)', () => {
  const SAMPLES: Record<(typeof SOURCE_REF_KINDS)[number], SourceRef> = {
    source_document: {
      kind: 'source_document',
      document_version_id: '3f9c2e1a-0000-4000-8000-000000000000',
      start_char: 0, end_char: 400, heading_path: ['검색 API'],
    },
    repository_path: {
      kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts',
      start_line: 14, end_line: 30, commit_sha: 'a'.repeat(40),
    },
    proposal: { kind: 'proposal', proposal_id: '00000000-0000-4000-8000-000000000001' },
    manual: { kind: 'manual', note: '팀장이 확인함' },
  }

  it('표의 키가 enum 과 같고 라벨이 서로 다르다', () => {
    assertLiveTable('SRC_LABEL', SOURCE_REF_KINDS, SRC_LABEL, (k) => SRC_LABEL[k](SAMPLES[k]))
    assertLiveTable('SRC_ICON', SOURCE_REF_KINDS, SRC_ICON, (k) => SRC_ICON[k])
  })

  it('값을 바꾸면 라벨이 갈린다 — 종류 이름만 찍는 게 아니다', () => {
    //  ⚠ `SourceRef` 는 유니온이라 객체 리터럴을 그대로 넘기면 잉여 속성 검사에 걸린다.
    //    좁은 타입으로 먼저 받고 넘긴다 (docs/STATUS.md 「유니온 Zod 스키마」와 같은 함정).
    const repoRef = SAMPLES.repository_path as Extract<SourceRef, { kind: 'repository_path' }>
    const a = SRC_LABEL.repository_path(repoRef)
    const b = SRC_LABEL.repository_path({ ...repoRef, path: 'src/refund/policy.ts' })
    expect(a).not.toBe(b)
    //  줄 번호가 없으면 `:14-30` 을 지어내지 않는다.
    const bare: Extract<SourceRef, { kind: 'repository_path' }> = { kind: 'repository_path', repo: 'r', path: 'a.ts' }
    expect(SRC_LABEL.repository_path(bare)).toBe('r/a.ts')
  })
})

describe('🔴 에러 코드 10종이 전부 화면 문구를 갖는다 (DESIGN_BRIEF §5)', () => {
  it('표의 키가 ERROR_CODES 와 같고 문구가 서로 다르다', () => {
    assertLiveTable('ERROR_HINT', ERROR_CODES, ERROR_HINT, (k) => ERROR_HINT[k])
  })

  it('DESIGN_BRIEF §5 가 정한 문장을 그대로 쓴다', () => {
    //  ⚠ 문구를 바꾸려면 DESIGN_BRIEF §5 를 먼저 고쳐라 — 화면 문구의 정본은 거기다.
    expect(ERROR_HINT.REVISION_CONFLICT)
      .toBe('다른 사람이 먼저 수정했습니다. 최신 내용을 불러왔어요. 다시 저장해주세요.')
    expect(ERROR_HINT.BUDGET_EXCEEDED).toContain('오늘의 AI 예산이 소진되었습니다')
  })

  it('서버 문구를 그대로 쓰지 않는다 — 화면 문구는 존댓말이다', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_HINT[code], code).toMatch(/(습니다|하세요|해주세요)/)
    }
  })
})

describe('semver 후보 (SPEC §6)', () => {
  it('세 등급이 서로 다른 값을 낸다', () => {
    assertLiveTable('SEMVER_RULE', SEMVER_BUMPS, SEMVER_RULE, (k) => SEMVER_RULE[k].why)
    expect(SEMVER_BUMPS.map((b) => nextSemver('1.2.3', b))).toEqual(['1.2.4', '1.3.0', '2.0.0'])
  })

  it('첫 발행은 등급과 무관하게 1.0.0 이다', () => {
    for (const b of SEMVER_BUMPS) expect(nextSemver(null, b)).toBe('1.0.0')
  })

  it('semver 가 아니면 지어내지 않는다', () => {
    expect(nextSemver('v1.2', 'minor')).toBeNull()
  })
})

describe('slug 후보 (SPEC §5 CreateTeam)', () => {
  it('영문 이름은 후보가 나온다', () => {
    expect(toSlug('Paylab API')).toBe('paylab-api')
    expect(toSlug('  --Fun People!!  ')).toBe('fun-people')
  })

  it('🔴 한글 이름은 빈 문자열이다 — 음차를 지어내지 않는다', () => {
    expect(toSlug('재미난사람들')).toBe('')
  })
})

describe('로그인 되돌아오기 (SPEC §5 인증 (a))', () => {
  const now = new Date('2026-09-03T12:00:00Z')

  it('조각에서 토큰과 만료 시각을 꺼낸다', () => {
    const r = readCallbackHash('#access_token=abc.def.ghi&expires_in=3600&token_type=bearer', now)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.access_token).toBe('abc.def.ghi')
    //  ⚠ 「몇 초 남았다」가 아니라 「언제까지」로 저장한다 — 아니면 새로고침마다 살아난다.
    expect(r.expires_at).toBe(Math.floor(now.getTime() / 1000) + 3600)
  })

  it('오류가 오면 토큰이 없어도 조용히 통과시키지 않는다', () => {
    expect(readCallbackHash('#error=access_denied', now).ok).toBe(false)
    expect(readCallbackHash('', now).ok).toBe(false)
  })
})
