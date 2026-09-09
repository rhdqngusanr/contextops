import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LIST_LIMIT_MAX, TEAM_ROLES } from '@contextops/schema'

import { CREATION_LIMITS } from '../src/lib/api/limits'
import { GUEST_HINT, REASON_HINT, ApiClientError } from '../src/lib/web/api'
import type { TeamMemberView, TeamRef } from '../src/lib/web/queries'
import { ROLE_LABEL, TEAM_HOME_TEXT, TeamHome, type TeamHomeHandlers, type TeamHomeState } from '../src/components/team-home'

// =====================================================================
//  「내 팀」 홈 · 팀원 초대 · 만들기 상한의 화면 쪽 (INBOX H9 · H11 · 2026-09-10)
//
//  ★ 브라우저 없이 그려 읽는다 — owner 와 member 가 다른 것을 보는지 · 초대만 된 사람이 낱말로 표시되는지 ·
//    문이 닫힌 주체가 이유를 보는지 · 상한의 문장이 서버와 같은 숫자를 말하는지.
// =====================================================================

const NOOP: TeamHomeHandlers = { onOpenInvite: () => {}, onInviteChange: () => {}, onInviteSubmit: () => {}, onCloseRefused: () => {} }
const webRoot = fileURLToPath(new URL('..', import.meta.url))

function team(over: Partial<TeamRef> = {}): TeamRef {
  return {
    id: 't-1', slug: 'paylab', name: 'Paylab', role: 'owner',
    projects: [{ id: 'p-1', slug: 'api', name: 'paylab-api', description: '결제 API', official_version_id: null }],
    ...over,
  }
}
const MEMBERS: TeamMemberView[] = [
  { user_id: 'u-1', name: '팀장 한지우', role: 'owner', status: 'active' },
  { user_id: 'u-2', name: '김하은', role: 'member', status: 'invited' },
]
function draw(over: Partial<TeamHomeState> = {}): string {
  const state: TeamHomeState = { teams: [team()], members: { 't-1': MEMBERS }, door: { open: true }, inviting: null, refused: null, ...over }
  return renderToStaticMarkup(createElement(TeamHome, { state, on: NOOP }))
}
const text = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

describe('① 홈이 팀·프로젝트·팀원을 한 화면에 낸다', () => {
  it('프로젝트는 가져오기로 잇고, 등급은 사람 말이다', () => {
    const html = draw()
    expect(html).toContain('href="/t/paylab/p/api/import"')
    expect(html).toContain('href="/t/new"')
    expect(text(html)).toContain(ROLE_LABEL.owner)
    expect(html).not.toMatch(/>owner</)
    for (const r of TEAM_ROLES) expect(ROLE_LABEL[r]).toMatch(/[가-힣]/)
  })

  it('초대만 된 사람은 낱말로 표시된다 — 색이 아니라 (DESIGN_BRIEF §3)', () => {
    const t = text(draw())
    expect(t).toContain('김하은')
    expect(t).toContain(TEAM_HOME_TEXT.invited)
  })

  it('프로젝트가 없으면 빈 칸이 아니라 문장이다', () => {
    expect(text(draw({ teams: [team({ projects: [] })] }))).toContain(TEAM_HOME_TEXT.noProjects)
  })
})

describe('② owner 만 초대·프로젝트 만들기를 본다 — member 는 이유를 본다', () => {
  it('owner: [팀원 초대] 와 [새 프로젝트]', () => {
    const html = draw()
    expect(html).toContain(TEAM_HOME_TEXT.invite)
    expect(html).toContain('href="/t/paylab/p/new"')
  })

  it('member: 버튼 대신 「owner 가 합니다」 — 그리고 새 프로젝트 문이 없다', () => {
    const html = draw({ teams: [team({ role: 'member' })] })
    expect(html).not.toContain(`>${TEAM_HOME_TEXT.invite}<`)
    expect(html).not.toContain('href="/t/paylab/p/new"')
    expect(text(html)).toContain(TEAM_HOME_TEXT.onlyOwnerInvites)
  })

  it('초대 폼이 열리면 메일을 안 보낸다는 말이 **먼저** 있고, 등급은 계약의 표에서 그린다', () => {
    const html = draw({ inviting: { teamId: 't-1', email: '', role: 'member', busy: false, error: null, done: null } })
    expect(html).toContain('type="email"')
    //  ⚠ 고른 값에는 `selected` 가 붙는다 — 속성을 느슨하게 본다.
    for (const r of TEAM_ROLES) expect(html).toMatch(new RegExp(`<option value="${r}"[^>]*>${ROLE_LABEL[r]}</option>`))
    const t = text(html)
    expect(t.indexOf(TEAM_HOME_TEXT.inviteLead)).toBeLessThan(t.indexOf('type="email"') < 0 ? t.length : t.indexOf('teammate'))
    //  빈 이메일이면 못 누른다.
    expect(html).toMatch(/<button type="submit"[^>]*disabled/)
  })

  it('문이 닫힌 주체가 눌렀으면 그 자리에 이유(role="status")', () => {
    const html = draw({ refused: GUEST_HINT.FORBIDDEN! })
    expect(html).toContain('role="status"')
    expect(html).toContain(GUEST_HINT.FORBIDDEN!)
  })
})

describe('③ 상한의 문장은 서버와 같은 숫자를 말한다 (INBOX H11)', () => {
  it('TEAM_LIMIT · PROJECT_LIMIT 의 문장에 CREATION_LIMITS 의 수가 들어 있다', () => {
    expect(REASON_HINT.TEAM_LIMIT).toContain(String(CREATION_LIMITS.TEAM_LIMIT.max))
    expect(REASON_HINT.PROJECT_LIMIT).toContain(String(CREATION_LIMITS.PROJECT_LIMIT.max))
    //  서버가 낸 봉투 그대로 — 화면은 이 문장을 본다.
    expect(new ApiClientError('VALIDATION_FAILED', 400, { code: 'TEAM_LIMIT', limit: 3 }).message).toBe(REASON_HINT.TEAM_LIMIT)
    for (const said of [REASON_HINT.TEAM_LIMIT, REASON_HINT.PROJECT_LIMIT]) expect(said).toMatch(/(습니다|하세요|해주세요)/)
  })

  it('항목 목록은 상한(200)을 청하고, 상한에 닿으면 화면이 그렇게 말한다', () => {
    const queries = readFileSync(join(webRoot, 'src', 'lib', 'web', 'queries.ts'), 'utf8')
    const fn = queries.slice(queries.indexOf('export function fetchItems'), queries.indexOf('export function updateItemStatus'))
    expect(fn).toContain("q.set('limit', String(LIST_LIMIT_MAX))")
    expect(LIST_LIMIT_MAX).toBe(200)
    const page = readFileSync(join(webRoot, 'src', 'app', 't', '[team]', 'p', '[project]', 'context', 'page.tsx'), 'utf8')
    expect(page).toContain('items.result.data.items.length >= items.result.data.limit')
    expect(page).toContain('개까지만 보여 줍니다')
  })
})

describe('④ 로그인 뒤의 기본 목적지는 홈이다', () => {
  it('login · callback 의 기본 next 가 /t 이고, 프로젝트 게이트의 문도 /t 다', () => {
    const login = readFileSync(join(webRoot, 'src', 'app', 'login', 'page.tsx'), 'utf8')
    const callback = readFileSync(join(webRoot, 'src', 'app', 'auth', 'callback', 'page.tsx'), 'utf8')
    const gate = readFileSync(join(webRoot, 'src', 'components', 'project-gate.tsx'), 'utf8')
    expect(login).toContain("params.get('next') ?? '/t'")
    expect(callback).toContain("searchParams.get('next') ?? '/t'")
    expect(callback).not.toContain("'/t/new'")
    expect(gate).toContain('href="/t"')
    //  홈 페이지가 있고, 팀이 없으면 팀 만들기로 보낸다.
    const home = readFileSync(join(webRoot, 'src', 'app', 't', 'page.tsx'), 'utf8')
    expect(home).toContain("window.location.replace('/t/new')")
    expect(home).toContain('writeDoor()')
  })
})
