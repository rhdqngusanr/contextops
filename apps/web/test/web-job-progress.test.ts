import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AI_JOB_STATUSES, ERROR_CODES, ERROR_STATUS, type AiJobStatus } from '@contextops/schema'
import { describe, expect, it } from 'vitest'

import { JobProgress, canRetryJob } from '../src/components/job-progress'
import { structureCounts, type AiJobSummary } from '../src/lib/web/queries'

// =====================================================================
//  🔴 **눈 판정을 기계가 잴 수 있는 데까지 잰다** (loop/PROMPT.md ⑦3층 · CLAUDE.md)
//
//  ★ 왜 필요한가 — 화면 3 의 오른쪽 칸은 여섯 모양(대기·회전·막대·멈춤·실패·완료)이
//    있는데, 브라우저로는 그중 하나(그때 마침 그 상태인 job)밖에 못 본다.
//    나머지 다섯은 **아무도 본 적 없는 채로** 배포되기 딱 좋은 자리다.
//    여기서는 여섯을 다 그려서 마크업을 읽는다.
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴·시안 대조. 그건 캡처가 있어야 한다
//    (`docs/STATUS.md` 「눈 판정 대기」). **여기가 초록이라고 화면을 본 것이 아니다.**
//
//  재는 것 넷 — 전부 DESIGN_BRIEF 의 문장이다:
//    ① 상태를 **색만으로** 구분하지 않는다 (아이콘 + 라벨 병기) — §3
//    ② 근거 없는 숫자·판정이 없다 (`stalled` 옆에 `updated_at` 이 있다) — §2-1
//    ③ 「실시간」이라는 낱말이 없다 — §2-3
//    ④ 없는 문을 그리지 않는다 — 되살리기 버튼은 **되살릴 수 있는 실패에만** 있다
//       (`ERROR_STATUS[code].retryable` · FINDINGS 59) · 멈춘 job 에는 아직 없다 (154)
// =====================================================================

const NOW = new Date('2026-09-04T12:00:00Z')
const ago = (seconds: number): string => new Date(NOW.getTime() - seconds * 1000).toISOString()

function job(over: Partial<AiJobSummary> = {}): AiJobSummary {
  return {
    shape: 'summary',
    id: '11111111-1111-4111-8111-111111111111',
    project_id: '22222222-2222-4222-8222-222222222222',
    feature: 'structure',
    status: 'running',
    progress: null,
    input: { document_version_id: '33333333-3333-4333-8333-333333333333' },
    error_code: null,
    started_at: ago(30),
    finished_at: null,
    created_at: ago(40),
    updated_at: ago(30),
    stalled: false,
    ...over,
  }
}

function draw(over: Partial<AiJobSummary> = {}): string {
  return renderToStaticMarkup(createElement(JobProgress, { job: job(over), now: NOW }))
}

/** 손잡이를 **들려 준** 판 — 화면 3 이 그러듯이. 버튼을 그릴지는 컴포넌트가 정한다. */
function drawWithRetry(over: Partial<AiJobSummary> = {}, busy = false): string {
  return renderToStaticMarkup(createElement(JobProgress, {
    job: job(over), now: NOW, retry: { run: () => {}, busy },
  }))
}

/** 그 코드로 죽은 실패 job 한 장. */
const failedWith = (code: string): Partial<AiJobSummary> => ({
  status: 'failed', error_code: code, finished_at: ago(5),
  progress: { done: 1, total: 4, unit: '조각' },
})

/** 화면 3 의 오른쪽 칸이 실제로 만나는 여섯 모양. */
const STATES: { what: string; over: Partial<AiJobSummary> }[] = [
  { what: '차례 기다림', over: { status: 'queued', started_at: null } },
  { what: '회전 (총수를 아직 모른다)', over: { status: 'running', progress: null } },
  { what: '막대', over: { status: 'running', progress: { done: 1, total: 4, unit: '조각' } } },
  { what: '멈춤', over: { status: 'running', stalled: true, updated_at: ago(8 * 60) } },
  {
    what: '실패',
    over: {
      status: 'failed', error_code: 'BUDGET_EXCEEDED', finished_at: ago(5),
      progress: { done: 1, total: 4, unit: '조각' },
    },
  },
  {
    what: '완료',
    over: {
      status: 'succeeded', finished_at: ago(5),
      progress: { done: 4, total: 4, unit: '조각' },
    },
  },
]

describe('🔴 화면 3 의 job 칸 — 여섯 모양이 서로 다르게 보인다', () => {
  it('여섯이 전부 다른 마크업을 낸다', () => {
    const drawn = STATES.map((s) => draw(s.over))
    expect(new Set(drawn).size, `같아 보이는 모양이 있다: ${STATES.map((s) => s.what).join(' / ')}`)
      .toBe(STATES.length)
  })

  it('① 상태를 색만으로 구분하지 않는다 — 수명 4종이 라벨을 갖는다 (DESIGN_BRIEF §3)', () => {
    //  ⚠ 색 클래스(`tone-*`)만 갈리고 글자가 같으면 흑백 인쇄·발표 영상에서 한 상태가 된다.
    const labels = AI_JOB_STATUSES.map((status: AiJobStatus) => {
      const html = draw({ status, finished_at: status === 'queued' || status === 'running' ? null : ago(5) })
      const text = html.replace(/<[^>]+>/g, ' ')
      expect(text, status).toMatch(/[가-힣]/)
      return text.replace(/\s+/g, ' ').trim()
    })
    expect(new Set(labels).size).toBe(AI_JOB_STATUSES.length)
  })

  it('② 판정 옆에 근거가 있다 — 「멈춤」에는 언제부터인지가 붙는다 (DESIGN_BRIEF §2-1)', () => {
    const html = draw({ stalled: true, updated_at: ago(8 * 60) })
    expect(html).toContain('멈춘 것 같음')
    //  🔴 판정만 있으면 사람은 그 말을 확인할 수 없다.
    expect(html).toContain('마지막 걸음 8분 전')
  })

  it('🔴 아직 한 걸음도 안 간 job 에 「마지막 걸음」이라고 쓰지 않는다', () => {
    //  `queued` 인 job 의 `updated_at` 은 **만든 시각**이다. 「마지막 걸음 방금」은
    //  가지도 않은 걸음을 말한다 (눈으로 읽고 고쳤다 · 가른 것은 `started_at` 칸이다).
    expect(draw({ status: 'queued', started_at: null })).toContain('올린 지')
    expect(draw({ status: 'queued', started_at: null })).not.toContain('마지막 걸음')
    expect(draw({ status: 'running', started_at: ago(30) })).toContain('마지막 걸음')
  })

  it('③ 「실시간」이라는 낱말이 없다 (DESIGN_BRIEF §2-3)', () => {
    for (const state of STATES) expect(draw(state.over), state.what).not.toContain('실시간')
  })

  it('④ 손잡이를 안 주면 버튼이 없다 — 누르면 아무 일도 없는 버튼은 「고장」으로 읽힌다', () => {
    for (const state of STATES) expect(draw(state.over), state.what).not.toContain('<button')
    expect(draw(failedWith('BUDGET_EXCEEDED'))).not.toContain('<button')
  })

  it('🔴 **화면이 서버와 같은 표를 읽는다** — 되살릴 수 있는 코드에만 버튼이 있다 (FINDINGS 59)', () => {
    //  ⚠ 코드 목록을 손으로 적지 않는다. 표의 축을 뒤집으면 이 시험이 갈린다 —
    //    그게 「표의 항목이 전부 실제로 뭔가를 바꾼다」의 화면 쪽 절반이다.
    for (const code of ERROR_CODES) {
      const html = drawWithRetry(failedWith(code))
      //  ⚠ **버튼**을 센다 — 낱말로 세면 안 된다. `ERROR_HINT` 의 몇 문구가 이미
      //    「다시 시도해주세요」로 끝나서, 버튼이 없는 코드도 그 낱말은 갖고 있다.
      expect(html.includes('<button'), `${code}: 표와 화면이 갈렸다`).toBe(ERROR_STATUS[code].retryable)
    }
    //  판정 문(`canRetryJob`)이 그 표를 그대로 읽는다 — 화면이 조건을 다시 적지 않는다.
    for (const code of ERROR_CODES) {
      expect(canRetryJob(job(failedWith(code))), code).toBe(ERROR_STATUS[code].retryable)
    }
  })

  it('🔴 실패가 아닌 job 에는 버튼이 없다 — 손잡이를 줘도 그리지 않는다', () => {
    for (const state of STATES) {
      if (state.over.status === 'failed') continue
      expect(drawWithRetry(state.over), state.what).not.toContain('<button')
    }
    //  멈춘(`running`) job 도 마찬가지다 — 되돌리면 러너 둘이 같은 job 을 굴린다 (154).
    expect(drawWithRetry({ stalled: true, updated_at: ago(8 * 60) })).not.toContain('<button')
  })

  it('버튼 옆에 **무엇이 달라지는지**가 있고, 누르는 동안 잠긴다', () => {
    const idle = drawWithRetry(failedWith('BUDGET_EXCEEDED'))
    //  🔴 이 버튼은 LLM 을 한 번 더 부른다 (P3). 헛되이 누르는 자리가 되면 안 된다.
    expect(idle).toContain('문서를 다시 올릴 필요는 없습니다')
    expect(idle).not.toContain('disabled')

    const busy = drawWithRetry(failedWith('BUDGET_EXCEEDED'), true)
    expect(busy).toContain('disabled')
    expect(busy).toContain('다시 굴리는 중')
  })
})

describe('🔴 진행률 — 「모른다」와 「0 걸음」이 화면에서 갈린다 (FINDINGS 62)', () => {
  it('`progress:null` 은 회전이고 막대가 아니다', () => {
    const spin = draw({ progress: null })
    expect(spin).toContain('몇 걸음짜리 일인지 아직 모릅니다')
    expect(spin).not.toContain('progressbar')
  })

  it('0/4 는 막대다 — 「모른다」와 다른 말을 한다', () => {
    const bar = draw({ progress: { done: 0, total: 4, unit: '조각' } })
    expect(bar).toContain('progressbar')
    expect(bar).toContain('4조각 중 0')
    expect(bar).not.toContain('아직 모릅니다')
  })

  it('🔴 걸음의 낱말은 값에서 온다 — 화면에 기능별 갈래가 없다', () => {
    //  §7.2(충돌 탐지)의 job 을 같은 컴포넌트에 넣으면 낱말만 갈린다.
    expect(draw({ progress: { done: 1, total: 1, unit: '묶음' } })).toContain('1묶음 중 1')
  })

  it('total 이 0 이어도 NaN% 를 그리지 않는다', () => {
    expect(draw({ progress: { done: 0, total: 0, unit: '조각' } })).not.toContain('NaN')
  })

  it('🔴 실패한 job 은 같은 수를 두 번 그리지 않는다 (막대가 없다)', () => {
    //  눈으로 읽고 고친 자리다 — 막대(`4조각 중 1 · 25%`)와 문장(`4조각 중 1에서
    //  멈췄습니다`)이 같이 나오면 둘이 다른 것을 세는 줄 알고, 막대는 아직 가는 중처럼
    //  보인다 (docs/evidence/2026-09-04-screen3/job-panel-states.txt 첫 판 ⑤).
    const html = draw({
      status: 'failed', error_code: 'INTERNAL', finished_at: ago(5),
      progress: { done: 1, total: 4, unit: '조각' },
    })
    expect(html).not.toContain('progressbar')
    expect(html.match(/4조각 중 1/g)).toHaveLength(1)
  })

  it('🔴 실패해도 어디까지 갔는지는 남는다 (`progress` 는 수명 CHECK 밖이다)', () => {
    const html = draw({
      status: 'failed', error_code: 'AI_OUTPUT_INVALID', finished_at: ago(5),
      progress: { done: 1, total: 4, unit: '조각' },
    })
    expect(html).toContain('4조각 중 1에서 멈췄습니다')
    //  ⚠ 에러 **코드**를 그대로 띄우지 않는다 — 팀장에게 아무 뜻이 없다.
    expect(html).not.toContain('AI_OUTPUT_INVALID')
  })
})

describe('§7.1 결과 세기 — 못 읽은 것과 0건이 갈린다', () => {
  it('셋을 센다', () => {
    expect(structureCounts({
      items: [{}, {}], merge_candidates: [], chunks: { used: 4, total: 12 }, open_question_ids: ['a'],
    })).toEqual({ items: 2, questions: 1, chunks: { used: 4, total: 12 } })
  })

  it('🔴 모양이 다르면 `null` 이다 — 0 으로 채우면 「0개를 찾았다」가 된다', () => {
    expect(structureCounts(null)).toBeNull()
    expect(structureCounts({ items: [] })).toBeNull()
    expect(structureCounts('done')).toBeNull()
  })

  it('chunks 가 없어도 항목·질문은 센다', () => {
    expect(structureCounts({ items: [], open_question_ids: [] }))
      .toEqual({ items: 0, questions: 0, chunks: null })
  })
})
