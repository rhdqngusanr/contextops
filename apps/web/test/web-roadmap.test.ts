import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MILESTONE_STATUSES, PROGRESS_SOURCES } from '@contextops/schema'

import {
  MilestoneRow, OffRoadmap, ProgressDrawer, RoadmapSummary, evidenceCoverage, evidenceText,
  type MilestoneRowHandlers,
} from '../src/components/roadmap'
import { MILESTONE_CHIP } from '../src/components/chips'
import { STALE_REPORT_DAYS } from '../src/lib/web/time'
import type { ProgressEventView, Roadmap, RoadmapMilestone } from '../src/lib/web/queries'

// =====================================================================
//  🔴 화면 8(Roadmap)의 **모든 모양을 그려서 읽는다** (loop/PROMPT.md ⑦3층)
//
//  ★ 왜 — 브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 「보고가 하나도 없는
//    마일스톤」「3주 넘게 조용한 행」「확정할 것이 있는데 owner 가 아닌 사람」은 사람이
//    손으로 만들기 어려운 상태라, 그냥 두면 **아무도 본 적 없는 채로** 배포된다.
//
//  재는 것 — 전부 이 저장소가 이미 배운 것이다:
//    ① 🔴 **P5** — 행은 마일스톤이고 화면 어디에도 사람이 없다
//    ② 🔴 **done_candidate 와 done 이 달라 보인다** — 그 차이가 「agent 는 스스로 완료를
//      선언하지 못한다」를 통째로 들고 있다
//    ③ 없는 숫자를 만들지 않는다 — 「완료 n/m」이 아니라 **「근거 n/m」**이다
//    ④ 없는 문을 그리지 않는다 — 확정할 것이 없으면 [완료 확인] 이 아예 없고,
//      owner 가 아니면 **버튼 대신 이유**가 나온다 (FINDINGS 59 와 같은 판단)
//    ⑤ 「보고 없음」과 「근거 없음」을 섞지 않는다 (둘은 사람이 할 일이 다르다)
//    ⑥ 🔴 **`PROGRESS_STATUSES` 의 `none` 이 화면에 나타난다** — 「로드맵 외 작업」이
//      없으면 그 보고는 어디에도 안 보인다 (④2-B 「정의만 있고 아무 일도 안 하는 것」)
//    ⑦ 잘린 목록은 잘렸다고 말한다
//    ⑧ 🔴 **P1** — 근거는 경로·줄·커밋뿐이고, 코드 본문이 서버에 없다고 말한다
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴. 그건 캡처가 있어야 한다
//    (`docs/STATUS.md` 「눈 판정 대기」).
// =====================================================================

/** 시계를 고정한다 — 「8분 전」이 매일 갈리면 시험이 아니라 달력이 된다. */
const NOW = new Date('2026-09-06T12:00:00.000Z')
const MINUTES_AGO = new Date(NOW.getTime() - 8 * 60_000).toISOString()
const LONG_AGO = new Date(NOW.getTime() - (STALE_REPORT_DAYS + 3) * 86_400_000).toISOString()

const NOOP: MilestoneRowHandlers = { onToggle: () => {}, onConfirm: () => {}, onEvidence: () => {} }

function event(overrides: Partial<ProgressEventView> = {}): ProgressEventView {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    status: 'criterion_done',
    summary: '재시도 상한을 상수로 뺐다',
    at: MINUTES_AGO,
    source: 'agent',
    context_version: '1.0.0',
    evidence: [{ path: 'src/payment/retry.ts', start_line: 14, end_line: 20, commit_sha: '7d1b0e4aa11bb22cc33dd44ee55ff66aa77bb889' }],
    confirmed_at: null,
    ...overrides,
  }
}

function milestone(overrides: Partial<RoadmapMilestone> = {}): RoadmapMilestone {
  return {
    milestone: 'PL-M1',
    due: '2026-09-20',
    paths: ['src/payment/'],
    done_when: [
      { text: '재시도가 3회에서 멈춘다', evidence_count: 2, last_event: event() },
      { text: '백오프가 지수로 는다', evidence_count: 0, last_event: null },
    ],
    conflicts: 0,
    last_report_at: MINUTES_AGO,
    status: 'in_progress',
    confirmable: null,
    ...overrides,
  }
}

function row(state: Partial<Parameters<typeof MilestoneRow>[0]['state']> = {}): string {
  return renderToStaticMarkup(createElement(MilestoneRow, {
    state: {
      milestone: milestone(),
      expanded: false,
      canConfirm: true,
      busy: false,
      error: null,
      now: NOW,
      ...state,
    },
    on: NOOP,
  }))
}

// ---------------------------------------------------------------------

describe('🔴 P5 — 행은 마일스톤이다. 화면 어디에도 사람이 없다', () => {
  it('마일스톤 행에 사람·기기를 가리키는 낱말이 없다', () => {
    const html = row({ expanded: true, milestone: milestone({ confirmable: event({ status: 'done_candidate' }) }) })
    for (const word of ['user_id', 'device_id', 'confirmed_by', '담당', '팀원', '순위', '점수']) {
      expect(html, `${word} 가 화면에 있다 — P5 가 깨진다`).not.toContain(word)
    }
    //  행의 이름은 마일스톤 id 다.
    expect(html).toContain('PL-M1')
  })

  it('보고 드로어도 「누가」가 아니라 「무엇이」를 말한다', () => {
    for (const source of PROGRESS_SOURCES) {
      const html = renderToStaticMarkup(createElement(ProgressDrawer, {
        event: event({ source }), onClose: () => {}, now: NOW,
      }))
      expect(html).not.toContain('confirmed_by')
      expect(html).not.toContain('device')
    }
  })
})

describe('🔴 done_candidate 와 done 이 화면에서 다르다 (제품의 약속 하나)', () => {
  it('마일스톤 상태 4종이 서로 다른 글자를 낸다', () => {
    const seen = MILESTONE_STATUSES.map((status) => {
      const html = row({ milestone: milestone({ status }) })
      const label = MILESTONE_CHIP[status].label
      expect(html, `${status}: 칩이 안 그려졌다`).toContain(label)
      return label
    })
    expect(new Set(seen).size, '두 상태가 같은 낱말을 낸다').toBe(MILESTONE_STATUSES.length)
  })

  it('🔴 「완료 확인 대기」와 「완료」가 같은 말이 아니다', () => {
    expect(MILESTONE_CHIP.done_candidate.label).not.toBe(MILESTONE_CHIP.done.label)
    //  확정 전에는 사람이 할 일이 남았다 — 그래서 ok 가 아니다.
    expect(MILESTONE_CHIP.done_candidate.tone).toBe('warn')
    expect(MILESTONE_CHIP.done.tone).toBe('ok')
  })
})

describe('없는 문을 그리지 않는다 — [완료 확인]', () => {
  it('확정할 보고가 없으면 버튼도 안내도 없다', () => {
    const html = row({ milestone: milestone({ confirmable: null }) })
    expect(html).not.toContain('완료 확인')
  })

  it('확정할 보고가 있고 owner 면 버튼이 나오고, 그 보고가 무엇인지 옆에 있다', () => {
    const html = row({
      canConfirm: true,
      milestone: milestone({ status: 'done_candidate', confirmable: event({ status: 'done_candidate', summary: '재시도 정책을 다 지켰다' }) }),
    })
    expect(html).toContain('완료 확인')
    //  🔴 근거 없는 버튼을 두지 않는다 — 무엇을 확정하는지가 버튼 옆에 있다.
    expect(html).toContain('재시도 정책을 다 지켰다')
    expect(html).toContain('8분 전')
  })

  it('🔴 owner 가 아니면 **버튼 대신 이유**가 나온다 (403 을 내는 버튼을 두지 않는다)', () => {
    const html = row({
      canConfirm: false,
      milestone: milestone({ status: 'done_candidate', confirmable: event({ status: 'done_candidate' }) }),
    })
    expect(html).toContain('owner 만')
    expect(html).not.toContain('<button type="button" class="btn btn-sm" >완료 확인')
    expect(html).not.toContain('>완료 확인<')
  })

  it('확정하는 중에는 버튼이 잠기고, 실패하면 다음 걸음을 말한다', () => {
    const withConfirm = milestone({ status: 'done_candidate', confirmable: event({ status: 'done_candidate' }) })
    expect(row({ busy: true, milestone: withConfirm })).toContain('disabled')
    expect(row({ error: new Error('x'), milestone: withConfirm })).toContain('다시 시도')
  })
})

describe('기한(due) — Manifest 가 나른 날짜 그대로, 없으면 칸이 없다 (FINDINGS 111)', () => {
  it('due 가 있으면 행 머리에 `due YYYY-MM-DD` 가 선다', () => {
    const html = row()
    expect(html).toContain('due 2026-09-20')
  })

  it('🔴 값을 뒤집으면 글자가 갈린다 — 표시용이 아니라 실제로 읽는 칸이다', () => {
    const a = row({ milestone: milestone({ due: '2026-09-20' }) })
    const b = row({ milestone: milestone({ due: '2026-10-01' }) })
    expect(a).not.toBe(b)
    expect(b).toContain('due 2026-10-01')
    expect(b).not.toContain('2026-09-20')
  })

  it('🔴 due 가 없으면 「기한 없음」도 「-」도 적지 않는다 — 없는 날짜를 지어내지 않는다', () => {
    const html = row({ milestone: milestone({ due: null }) })
    expect(html).not.toContain('due ')
    expect(html).not.toContain('기한')
    //  나머지는 그대로 그려진다 — 칸 하나가 없다고 행이 달라지지 않는다.
    expect(html).toContain('PL-M1')
    expect(html).toContain('근거 1 / 2')
  })
})

describe('🔴 없는 숫자를 만들지 않는다 — 「완료 n/m」이 아니라 「근거 n/m」', () => {
  it('진행 바가 세는 것은 근거 있는 완료 조건이다', () => {
    const html = row()
    expect(html).toContain('근거 1 / 2')
    //  ⚠ 조건 하나가 「끝났나」를 재는 값이 서버에 없다 — 그렇게 말하면 거짓이다.
    expect(html).not.toContain('완료 1 / 2')
  })

  it('완료 조건이 0개여도 NaN 이 안 나온다', () => {
    const html = row({ milestone: milestone({ done_when: [] }) })
    expect(html).not.toContain('NaN')
    expect(html).toContain('근거 0 / 0')
  })

  it('evidenceCoverage 가 여러 마일스톤을 가로질러 센다', () => {
    expect(evidenceCoverage([milestone(), milestone({ milestone: 'PL-M2' })])).toEqual({ with: 2, total: 4 })
    expect(evidenceCoverage([])).toEqual({ with: 0, total: 0 })
  })
})

describe('「보고 없음」과 「근거 없음」을 섞지 않는다', () => {
  it('보고가 한 번도 없는 마일스톤은 「오래됨」이 아니라 「아직 없음」이다', () => {
    const html = row({ milestone: milestone({ last_report_at: null, status: 'not_started' }) })
    expect(html).toContain('아직 보고가 없습니다')
    expect(html).not.toContain('전 ⚠')
  })

  it(`마지막 보고가 ${STALE_REPORT_DAYS}일을 넘기면 경고 표시가 붙는다`, () => {
    const html = row({ milestone: milestone({ last_report_at: LONG_AGO }) })
    expect(html).toContain('마지막 보고')
    expect(html).toContain('⚠')
  })

  it('완료 조건 줄: 보고가 없는 줄과 근거가 있는 줄이 다르게 나온다', () => {
    const html = row({ expanded: true })
    expect(html).toContain('보고 없음')
    expect(html).toContain('근거 2 · 8분 전')
    //  상태를 색만으로 말하지 않는다 — 아이콘이 같이 나간다 (DESIGN_BRIEF §3).
    expect(html).toContain('✓')
    expect(html).toContain('○')
  })

  it('접혀 있으면 완료 조건 줄이 없다 (아코디언)', () => {
    expect(row({ expanded: false })).not.toContain('재시도가 3회에서 멈춘다')
    expect(row({ expanded: true })).toContain('재시도가 3회에서 멈춘다')
  })
})

describe('상단 요약 4타일 — 전부 잰 것이다 (P5 · 사람 수 없음)', () => {
  function summary(over: Partial<Roadmap> = {}): string {
    const road: Roadmap = {
      context_version: '1.0.0',
      milestones: [milestone(), milestone({ milestone: 'PL-M2', last_report_at: LONG_AGO })],
      off_roadmap: [],
      off_roadmap_total: 0,
      ...over,
    }
    return renderToStaticMarkup(createElement(RoadmapSummary, { roadmap: road, now: NOW }))
  }

  it('네 타일이 다 있고, 근거 덮개와 오래된 행 수가 실제로 갈린다', () => {
    const html = summary()
    expect(html).toContain('마일스톤')
    expect(html).toContain('2 / 4')
    expect(html).toContain('열린 충돌')
    expect(html).toContain(`${STALE_REPORT_DAYS}일 이상 보고 없음`)
    //  PL-M2 하나만 오래됐다.
    expect(html).toContain('>1<')
  })

  it('🔴 열린 충돌을 행 수만큼 부풀리지 않는다 (프로젝트 단위의 수다)', () => {
    const html = summary({ milestones: [milestone({ conflicts: 3 }), milestone({ milestone: 'PL-M2', conflicts: 3 })] })
    expect(html).toContain('>3<')
    expect(html).not.toContain('>6<')
  })

  it('보고가 한 번도 없는 마일스톤은 따로 센다 (늦은 것이 아니라 시작 전이다)', () => {
    const html = summary({ milestones: [milestone({ last_report_at: null })] })
    expect(html).toContain('아직 보고가 없는 마일스톤 1')
  })

  it('🔴 마일스톤이 0개일 때 「전부 한 번은 보고됐습니다」라고 하지 않는다 (거짓말이다)', () => {
    //  ⚠ 덤프를 읽어서 잡은 자리다 — 시험 문자열만 봤을 때는 안 보였다.
    const html = summary({ milestones: [] })
    expect(html).not.toContain('전부 한 번은 보고됐습니다')
    expect(html).toContain('아직 마일스톤이 없습니다')
  })
})

describe('🔴 로드맵 외 작업 — `none` 보고가 화면에 나타나는 유일한 자리', () => {
  function off(events: ProgressEventView[], total: number, expanded = true): string {
    return renderToStaticMarkup(createElement(OffRoadmap, {
      events, total, expanded, onToggle: () => {}, onEvidence: () => {}, now: NOW,
    }))
  }

  it('한 건도 없으면 아예 안 그린다', () => {
    expect(off([], 0)).toBe('')
  })

  it('`status:"none"` 보고가 요약과 근거 수를 달고 나온다', () => {
    const html = off([event({ status: 'none', summary: '로그인 리팩터링', evidence: [] })], 1)
    expect(html).toContain('로드맵 외 작업 1')
    expect(html).toContain('로그인 리팩터링')
    expect(html).toContain('근거 0')
  })

  it('접혀 있으면 수만 말하고 목록은 없다', () => {
    const html = off([event({ summary: '빌드 스크립트 정리' })], 1, false)
    expect(html).toContain('로드맵 외 작업 1')
    expect(html).not.toContain('빌드 스크립트 정리')
  })

  it('🔴 잘렸으면 잘렸다고 말한다 (안 말하면 「전부 봤다」로 읽힌다)', () => {
    const html = off([event({ summary: '하나' })], 25)
    expect(html).toContain('25건 중 1건만 보입니다')
  })
})

describe('🔴 P1 — 근거는 경로·줄·커밋뿐이고, 코드 본문은 서버에 없다', () => {
  it('근거 한 줄이 `path:line–line · commit7` 로 나온다', () => {
    expect(evidenceText({ path: 'src/a.ts', start_line: 14, end_line: 20, commit_sha: '7d1b0e4aa11bb22cc33dd44ee55ff66aa77bb889' }))
      .toBe('src/a.ts:14–20 · 7d1b0e4')
    //  없는 것을 `?` 로 채우지 않는다 — 그러면 근거가 있는 척이 된다.
    expect(evidenceText({ path: 'src/a.ts' })).toBe('src/a.ts')
    expect(evidenceText({ path: 'src/a.ts', start_line: 9 })).toBe('src/a.ts:9')
  })

  it('드로어가 「로컬에서 열어 보세요」를 말한다', () => {
    const html = renderToStaticMarkup(createElement(ProgressDrawer, { event: event(), onClose: () => {}, now: NOW }))
    expect(html).toContain('src/payment/retry.ts:14–20')
    expect(html).toContain('코드 본문은 서버에 없습니다')
    //  그때 받은 Pack 이 같이 나온다 — 「어느 규칙을 보고 한 보고인가」가 근거의 일부다.
    expect(html).toContain('v1.0.0')
  })

  it('근거 없는 보고는 「근거 없음」이라고 말한다 (0 을 감추지 않는다)', () => {
    const html = renderToStaticMarkup(createElement(ProgressDrawer, {
      event: event({ evidence: [] }), onClose: () => {}, now: NOW,
    }))
    expect(html).toContain('근거 없음')
    expect(html).not.toContain('로컬에서 열어')
  })

  it('확정된 보고는 확정됐다고 말한다', () => {
    const html = renderToStaticMarkup(createElement(ProgressDrawer, {
      event: event({ status: 'done_candidate', confirmed_at: MINUTES_AGO }), onClose: () => {}, now: NOW,
    }))
    expect(html).toContain('확정됨')
  })
})
