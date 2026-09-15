import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AI_JOB_STATUS_CHIP } from '../src/components/chips'
import { RECENT_STRUCTURE_JOBS, StructureJobPicker, focusedJob } from '../src/components/structure-jobs'
import type { AiJobSummary } from '../src/lib/web/queries'

// =====================================================================
//  🔴 화면 3 — **이전 문서의 후보로 돌아갈 수 있다** (FINDINGS 174)
//
//  ★ 2026-09-15 production 한 바퀴에서 본 것 — 오른쪽 칸이 마지막 구조화 job 한 줄만 읽어서,
//    첫 문서의 후보를 받기 전에 둘째 문서를 올리면 첫 문서의 후보가 화면에서 사라졌다.
//
//  재는 것:
//    ① 고르지 않았으면 가장 새 문서다 · 고르면 그 문서다
//    🔴 ② **새 문서가 올라오면 고른 것이 풀린다** — 방금 올린 사람이 보려는 것은 그 문서의 진행이다
//    ③ 문서가 하나뿐이면 고르는 줄이 없다 — 누를 것이 없는 버튼을 그리지 않는다
//    ④ 끝나지 않은 문서는 이름표에 상태를 붙인다 · 상한에 닿으면 그렇다고 말한다
// =====================================================================

const NOW = new Date('2026-09-15T06:30:00Z')
const ago = (seconds: number): string => new Date(NOW.getTime() - seconds * 1000).toISOString()

function job(id: string, over: Partial<AiJobSummary> = {}): AiJobSummary {
  return {
    shape: 'summary',
    id,
    project_id: '22222222-2222-4222-8222-222222222222',
    feature: 'structure',
    status: 'succeeded',
    progress: { done: 1, total: 1, unit: '조각' },
    input: { document_version_id: '33333333-3333-4333-8333-333333333333' },
    error_code: null,
    requeues: 0,
    started_at: ago(600),
    finished_at: ago(540),
    created_at: ago(600),
    updated_at: ago(540),
    stalled: false,
    ...over,
  }
}

//  최신순 — 목록 문(`GET …/jobs`)이 내는 차례 그대로다.
const NEWEST = job('job-new', { status: 'running', created_at: ago(30), started_at: ago(30), finished_at: null, updated_at: ago(5) })
const OLDER = job('job-old', { created_at: ago(8 * 60) })
const OLDEST = job('job-oldest', { created_at: ago(3 * 3600) })
const LIST = [NEWEST, OLDER, OLDEST]

function draw(jobs: AiJobSummary[], focused: string | null): string {
  return renderToStaticMarkup(createElement(StructureJobPicker, { jobs, focused, onPick: () => {}, now: NOW }))
}

describe('① 무엇을 그리나', () => {
  it('목록이 비었으면 아무것도 없다', () => {
    expect(focusedJob([], null)).toBeUndefined()
    expect(focusedJob([], { id: 'job-old', newest: 'job-new' })).toBeUndefined()
  })

  it('고르지 않았으면 가장 새 문서다', () => {
    expect(focusedJob(LIST, null)?.id).toBe('job-new')
  })

  it('고르면 그 문서다 — 이전 문서의 후보로 돌아간다', () => {
    expect(focusedJob(LIST, { id: 'job-oldest', newest: 'job-new' })?.id).toBe('job-oldest')
  })
})

describe('🔴 ② 새 문서가 올라오면 고른 것이 풀린다', () => {
  it('고를 때의 가장 새 job 과 지금의 가장 새 job 이 다르면 가장 새 것을 그린다', () => {
    const pick = { id: 'job-oldest', newest: 'job-new' }
    const uploaded = [job('job-newer', { created_at: ago(1) }), ...LIST]
    expect(focusedJob(uploaded, pick)?.id).toBe('job-newer')
  })

  it('고른 job 이 목록에 없으면 가장 새 것이다 — 없는 문서를 그리지 않는다', () => {
    expect(focusedJob(LIST, { id: 'job-gone', newest: 'job-new' })?.id).toBe('job-new')
  })
})

describe('③ 문서가 하나뿐이면 고르는 줄이 없다', () => {
  it('하나거나 없으면 빈 마크업이다', () => {
    expect(draw([OLDER], 'job-old')).toBe('')
    expect(draw([], null)).toBe('')
  })

  it('둘 이상이면 문서마다 버튼이 하나고, 지금 그리는 것 하나만 눌려 있다', () => {
    const html = draw(LIST, 'job-old')
    expect(html.match(/<button/g)).toHaveLength(LIST.length)
    expect(html).toContain(`올린 문서 ${LIST.length}개`)
    const pressed = html.split('<button').filter((b) => b.includes('aria-pressed="true"'))
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toContain('8분 전 올린 문서')
  })
})

describe('④ 이름표', () => {
  it('끝난 문서는 「언제」만 말하고, 끝나지 않았거나 실패한 문서는 상태를 붙인다 — 칩과 같은 표에서 온다', () => {
    const failed = job('job-failed', { status: 'failed', error_code: 'RATE_LIMITED', created_at: ago(2 * 86400) })
    const html = draw([...LIST, failed], null)
    expect(html).toContain(`방금 올린 문서 · ${AI_JOB_STATUS_CHIP.running.label}<`)
    expect(html).toContain('8분 전 올린 문서<')
    expect(html).toContain('3시간 전 올린 문서<')
    expect(html).toContain(`2일 전 올린 문서 · ${AI_JOB_STATUS_CHIP.failed.label}<`)
  })

  it(`${RECENT_STRUCTURE_JOBS}개에 닿으면 더 오래된 문서는 여기서 못 고른다고 말한다`, () => {
    const full = Array.from({ length: RECENT_STRUCTURE_JOBS }, (_, i) => job(`job-${i}`, { created_at: ago(60 * (i + 1)) }))
    expect(draw(full, null)).toContain(`최근 ${RECENT_STRUCTURE_JOBS}개 문서까지`)
    expect(draw(full.slice(0, RECENT_STRUCTURE_JOBS - 1), null)).not.toContain('문서까지')
  })
})
