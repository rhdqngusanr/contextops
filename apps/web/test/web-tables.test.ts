import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AI_JOB_STATUSES, CONFIDENCE_LEVELS, CONFLICT_KINDS, CONFLICT_SEVERITIES, ERROR_CODES,
  ITEM_STATUSES, ITEM_TYPES, MILESTONE_STATUSES, PROGRESS_SOURCES, PROPOSAL_OPERATIONS,
  PROPOSAL_STATUSES, SOURCE_DOCUMENT_KINDS, SOURCE_REF_KINDS, SYNC_STATUSES,
  type ErrorCode, type SourceRef,
} from '@contextops/schema'

import { ERROR_HINT, hintFor } from '../src/lib/web/api'
import { JUST_NOW, STALE_REPORT_DAYS, dateText, isStaleReport, sinceText } from '../src/lib/web/time'
import { SEMVER_BUMPS, SEMVER_RULE, nextSemver } from '../src/lib/web/semver'
import { toSlug } from '../src/lib/web/slug'
import { readCallbackHash } from '../src/lib/web/auth'
import {
  AI_JOB_STATUS_CHIP, CONFIDENCE_CHIP, CONFLICT_KIND_CHIP, CONFLICT_SEVERITY_CHIP,
  ITEM_STATUS_CHIP, ITEM_TYPE_ICON, MILESTONE_CHIP, PROGRESS_SOURCE_LABEL,
  PROPOSAL_OPERATION_CHIP, PROPOSAL_STATUS_CHIP, SOURCE_DOCUMENT_KIND_LABEL, SYNC_CHIP,
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

  it('AI job 수명 4종 (SPEC §9 화면 3)', () => {
    assertLiveTable('AI_JOB_STATUS_CHIP', AI_JOB_STATUSES, AI_JOB_STATUS_CHIP,
      (k) => `${AI_JOB_STATUS_CHIP[k].icon}${AI_JOB_STATUS_CHIP[k].label}`)
  })

  it('충돌 종류 6종 (SPEC §7.2 · DESIGN_BRIEF §4 화면 4 필터 칩)', () => {
    assertLiveTable('CONFLICT_KIND_CHIP', CONFLICT_KINDS, CONFLICT_KIND_CHIP,
      (k) => `${CONFLICT_KIND_CHIP[k].icon}${CONFLICT_KIND_CHIP[k].label}`)
  })

  it('마일스톤 상태 4종 (SPEC §5 roadmap · DESIGN_BRIEF §4 화면 8)', () => {
    assertLiveTable('MILESTONE_CHIP', MILESTONE_STATUSES, MILESTONE_CHIP,
      (k) => `${MILESTONE_CHIP[k].icon}${MILESTONE_CHIP[k].label}`)
    //  🔴 `done_candidate` 와 `done` 의 차이가 이 제품의 약속 하나를 통째로 들고 있다 —
    //     「agent 는 스스로 완료를 선언하지 못한다」. 확정 전에는 사람이 할 일이 남았다.
    expect(MILESTONE_CHIP.done_candidate.tone, 'done_candidate 가 ok 로 보이면 확정이 끝난 것처럼 읽힌다')
      .toBe('warn')
    expect(MILESTONE_CHIP.done.tone).toBe('ok')
  })

  it('제안 수명 5종 (SPEC §2 · DESIGN_BRIEF §4 화면 6 상태 chip)', () => {
    assertLiveTable('PROPOSAL_STATUS_CHIP', PROPOSAL_STATUSES, PROPOSAL_STATUS_CHIP,
      (k) => `${PROPOSAL_STATUS_CHIP[k].icon}${PROPOSAL_STATUS_CHIP[k].label}`)
    //  🔴 승인은 「다음 발행에 들어간다」는 약속일 뿐이고, 팀에 배포된 것은 발행 뒤다
    //     (§2.1 7단계). 둘이 같아 보이면 승인만 하고 발행을 안 한 채 「배포됐다」로 읽는다.
    expect(PROPOSAL_STATUS_CHIP.approved.label, 'approved 와 published 가 같은 말로 보인다')
      .not.toBe(PROPOSAL_STATUS_CHIP.published.label)
  })

  it('제안 연산 3종 (SPEC §3 `PROPOSAL_OPERATIONS` · 화면 6 operation 배지)', () => {
    assertLiveTable('PROPOSAL_OPERATION_CHIP', PROPOSAL_OPERATIONS, PROPOSAL_OPERATION_CHIP,
      (k) => `${PROPOSAL_OPERATION_CHIP[k].icon}${PROPOSAL_OPERATION_CHIP[k].label}`)
  })

  it('진행 보고 주체 3종 (SPEC §3 `PROGRESS_SOURCES` · 화면 8 드로어)', () => {
    assertLiveTable('PROGRESS_SOURCE_LABEL', PROGRESS_SOURCES, PROGRESS_SOURCE_LABEL,
      (k) => PROGRESS_SOURCE_LABEL[k])
  })

  it('🔴 충돌 심각도 3단계가 confidence 3단계와 **다르게 보인다** (같은 화면에 같이 뜬다)', () => {
    assertLiveTable('CONFLICT_SEVERITY_CHIP', CONFLICT_SEVERITIES, CONFLICT_SEVERITY_CHIP,
      (k) => `${CONFLICT_SEVERITY_CHIP[k].icon}${CONFLICT_SEVERITY_CHIP[k].label}`)
    //  ⚠ 두 표의 키가 같은 낱말(high/medium/low)이라, 라벨까지 같으면 화면 4 에서
    //    「confidence high」와 「심각도 high」가 한 종류로 보인다.
    for (const k of CONFLICT_SEVERITIES) {
      expect(CONFLICT_SEVERITY_CHIP[k].label, `${k}: confidence 칩과 라벨이 같다`)
        .not.toBe(CONFIDENCE_CHIP[k].label)
    }
  })

  it('🔴 상태를 색만으로 구분하지 않는다 — 아이콘과 라벨이 항상 있다 (DESIGN_BRIEF §3)', () => {
    for (const table of [
      SYNC_CHIP, ITEM_STATUS_CHIP, CONFIDENCE_CHIP, AI_JOB_STATUS_CHIP,
      CONFLICT_KIND_CHIP, CONFLICT_SEVERITY_CHIP, PROPOSAL_STATUS_CHIP, PROPOSAL_OPERATION_CHIP,
    ]) {
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

const designBrief = fileURLToPath(new URL('../../../docs/DESIGN_BRIEF.md', import.meta.url))

/**
 * `docs/DESIGN_BRIEF.md` §5 의 「- <라벨>: \`문장\`」 줄들을 `{라벨: 문장}` 으로 읽는다.
 *
 * ⚠ 이어지는 설명 줄(들여쓴 줄)은 **안 읽는다** — 정본은 불릿 첫 줄의 백틱 문장 하나다.
 */
function briefSection5(): Record<string, string> {
  const md = readFileSync(designBrief, 'utf8')
  const body = /\n## 5\. [^\n]*\n([\s\S]*?)\n## /.exec(md)
  if (!body) throw new Error('DESIGN_BRIEF 에 §5 절이 없다')
  const out: Record<string, string> = {}
  for (const line of (body[1] as string).split('\n')) {
    const m = /^- ([^:]+): `([^`]+)`/.exec(line)
    if (m) out[(m[1] as string).trim()] = m[2] as string
  }
  return out
}

/**
 * 🔴 **에러 코드 → DESIGN_BRIEF §5 불릿의 라벨.** 화면 문구의 정본이 §5 라는 것을
 * 기계가 확인할 수 있는 **유일한 연결선**이다.
 *
 * ★ 새 에러 코드에 §5 가 문장을 정해 주면 여기 한 줄을 더한다 (`ERROR_HINT` 주석의 ⑤ 다음).
 * ⚠ 여기 **없는** 코드는 §5 가 문장을 안 정한 것이다 — 그건 정상이다.
 *   `발행 실패` 는 일부러 뺐다: §5 의 그 줄은 목업용 항목 id(`item_bs_m2`)를 문장 안에
 *   품고 있어서 그대로 쓸 수 없다. `COMPILE_FAILED` 는 「전부 롤백」을 말하는 일반 문장이다.
 */
const BRIEF_5_BULLET: Partial<Record<ErrorCode, string>> = {
  REVISION_CONFLICT: '409(항목 수정)',
  BUDGET_EXCEEDED: '예산 소진',
}

describe('🔴 에러 코드 10종이 전부 화면 문구를 갖는다 (DESIGN_BRIEF §5)', () => {
  it('표의 키가 ERROR_CODES 와 같고 문구가 서로 다르다', () => {
    assertLiveTable('ERROR_HINT', ERROR_CODES, ERROR_HINT, (k) => ERROR_HINT[k])
  })

  it('🔴 DESIGN_BRIEF §5 가 적은 문장을 **그 파일에서 읽어** 대조한다', () => {
    //  ★ 왜 파일을 읽나 — 예전엔 여기에 문장을 **복사해** 두었다. 그러면 같은 문구가
    //    세 곳(문서·코드·시험)에 있고, 문서만 고치면 시험이 안 잡고 시험만 고치면
    //    문서가 뒤처진다. 정본이 DESIGN_BRIEF §5 라면 **거기서 읽어야** 정본이다.
    //  ⚠ 문구를 바꾸려면 DESIGN_BRIEF §5 의 그 줄을 먼저 고쳐라.
    const sentences = briefSection5()
    for (const [code, bullet] of Object.entries(BRIEF_5_BULLET)) {
      const said = sentences[bullet]
      expect(said, `DESIGN_BRIEF §5 에 「${bullet}: \`…\`」 줄이 없다`).toBeDefined()
      expect(ERROR_HINT[code as ErrorCode], `${code} 문구가 §5 와 갈렸다`).toBe(said)
    }
  })

  it('🔴 없는 것을 약속하지 않는다 — 「샘플 결과」 (FINDINGS 66)', () => {
    //  ★ 예산이 소진되면 화면은 「샘플 결과를 표시합니다」라고 말했는데
    //    **표시하는 코드가 0곳**이었다. 사람은 샘플을 찾다가 화면이 고장난 줄 안다.
    //  ⚠ 이 시험을 지우려면 **픽스처를 표시하는 코드가 먼저** 있어야 한다.
    //    SPEC §7.5 는 그 갈래를 §7.4 게스트 데모에만 두기로 정했다 (P7 — 실제
    //    프로젝트에 픽스처 항목을 넣으면 그 줄이 사용자의 원문으로 역추적되지 않는다).
    expect(ERROR_HINT.BUDGET_EXCEEDED).not.toMatch(/샘플|예시 결과/)
    for (const said of Object.values(briefSection5())) expect(said).not.toMatch(/샘플/)
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

describe('🔴 문서 종류 6종이 전부 고를 수 있는 값이다 (SPEC §2 · 화면 3)', () => {
  it('표의 키가 enum 과 같고 라벨이 서로 다르다', () => {
    //  ⚠ DESIGN_BRIEF 는 다섯 개만 적지만 계약은 여섯이다. 화면이 다섯만 그리면
    //    여섯째는 **아무도 고를 수 없는 값**이 된다 — 그게 「정의만 있고 아무 일도
    //    안 하는 것」의 화면 쪽 모양이다.
    assertLiveTable('SOURCE_DOCUMENT_KIND_LABEL', SOURCE_DOCUMENT_KINDS, SOURCE_DOCUMENT_KIND_LABEL,
      (k) => SOURCE_DOCUMENT_KIND_LABEL[k])
  })
})

describe('실패한 job 의 에러 코드가 화면 문구가 된다 (화면 3 · SPEC §7.5)', () => {
  it('네 갈래가 전부 서로 다른 문장을 낸다', () => {
    //  ⚠ 화면 3 이 실제로 만나는 넷이다 (docs/STATUS.md 「키가 없을 때」).
    const codes = ['BUDGET_EXCEEDED', 'RATE_LIMITED', 'AI_OUTPUT_INVALID', 'INTERNAL']
    expect(new Set(codes.map(hintFor)).size).toBe(codes.length)
  })

  it('🔴 모르는 코드도 코드를 그대로 띄우지 않는다', () => {
    //  `AI_OUTPUT_INVALID` 같은 낱말은 팀장에게 아무 뜻이 없다.
    expect(hintFor(null)).toBe(ERROR_HINT.INTERNAL)
    expect(hintFor('WAT')).toBe(ERROR_HINT.INTERNAL)
  })
})

describe('🔴 「마지막 보고: 8분 전」 (DESIGN_BRIEF §2-3 — 「실시간」이라고 쓰지 않는다)', () => {
  const now = new Date('2026-09-04T12:00:00Z')
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString()

  it('단위가 커질수록 말이 갈린다', () => {
    expect(sinceText(ago(59), now)).toBe(JUST_NOW)
    expect(sinceText(ago(60), now)).toBe('1분 전')
    expect(sinceText(ago(8 * 60), now)).toBe('8분 전')
    expect(sinceText(ago(3 * 3600), now)).toBe('3시간 전')
    expect(sinceText(ago(2 * 86400), now)).toBe('2일 전')
  })

  it('🔴 미래도 「방금」이다 — 서버 시계가 앞서면 「-3분 전」이 그려진다', () => {
    expect(sinceText(new Date(now.getTime() + 180_000).toISOString(), now)).toBe(JUST_NOW)
  })

  it('읽을 수 없는 시각에 NaN 을 그리지 않는다', () => {
    expect(sinceText('어제', now)).toBe(JUST_NOW)
  })

  it(`🔴 「${STALE_REPORT_DAYS}일 이상 보고 없음」의 잣대가 하루 차이로 갈린다 (화면 8 타일)`, () => {
    expect(isStaleReport(ago((STALE_REPORT_DAYS - 1) * 86400), now)).toBe(false)
    expect(isStaleReport(ago(STALE_REPORT_DAYS * 86400), now)).toBe(true)
  })

  it('🔴 **보고가 한 번도 없는 것은 「오래됨」이 아니다** — 늦은 게 아니라 시작 전이다', () => {
    //  ⚠ 둘을 한 수에 합치면 「3주 이상 보고 없음 3」이 사실은 「아직 아무도 손 안 댐 3」이
    //    되고, 팀장은 없는 문제를 본다.
    expect(isStaleReport(null, now)).toBe(false)
    expect(isStaleReport('어제', now)).toBe(false)
  })
})

// =====================================================================
//  🔴 「갱신 2026-07-12」 — 경과가 아니라 **날짜**인 자리 (FINDINGS 72③)
//
//  ★ 왜 둘이 따로 있나 — 화면 4 는 두 항목의 날짜를 **나란히 놓고 비교**하게 한다
//    (「어느 쪽이 최신인가」가 `stale` 카드의 질문 그 자체다). 「2달 전 · 1달 전」으로
//    반올림하면 그 비교가 흐려진다. 반대로 job 의 「마지막 걸음」은 절대 시각이
//    아무 뜻이 없다. 그래서 함수가 둘이고, 화면은 고르기만 한다.
// =====================================================================

describe('🔴 「갱신 2026-07-12」 — 날짜로 내는 자리 (DESIGN_BRIEF §4 화면 4·5)', () => {
  it('시각에서 날만 남긴다', () => {
    expect(dateText('2026-07-12T09:00:00.000Z')).toBe('2026-07-12')
  })

  it('🔴 시간대와 무관하게 같은 날이다 — 기기마다 하루씩 갈리면 두 쪽 비교가 뒤집힌다', () => {
    //  UTC 로 자르지 않으면 이 값이 한국(UTC+9)에서는 `2026-07-13` 이 된다.
    expect(dateText('2026-07-12T23:30:00.000Z')).toBe('2026-07-12')
  })

  it('읽을 수 없는 값을 오늘 날짜로 지어내지 않는다', () => {
    expect(dateText('어제')).toBe('어제')
  })
})
