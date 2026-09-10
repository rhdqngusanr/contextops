import type { FormEvent } from 'react'
import { ROLE_RANK, TEAM_ROLES, type TeamRole } from '@contextops/schema'

import type { WriteDoor } from '../lib/web/actor'
import type { TeamMemberView, TeamRef } from '../lib/web/queries'
import { ReadOnlyNotice } from './states'
import { Note } from './chips'

// =====================================================================
//  「내 팀」 홈 — 로그인한 사람이 처음 서는 자리 (INBOX H9 · 2026-09-10 · SPEC §9 화면 2)
//
//  ★ 왜 있나 — 로그인 뒤의 기본 목적지가 `/t/new`(팀 만들기)였다. 이미 팀이 있는 사람도, 초대받은 사람도
//    「팀을 만드세요」를 봤다. 그리고 둘째 사람이 들어오는 문(초대)이 화면에 없었다 — 심사위원의 두 번째 질문이다.
//  ★ 그리는 것은 표뿐이다 — 상태는 `app/t/page.tsx` 가 들고, 여기는 **읽기만** 한다 (다른 화면과 같은 배치 ·
//    시험이 브라우저 없이 그려 본다).
//  ⚠ 초대 메일은 없다 — 초대한 사람이 링크를 전한다. 화면이 그 사실을 **누르기 전에** 말한다.
// =====================================================================

export const TEAM_HOME_TEXT = {
  title: '내 팀',
  lead: '팀 하나에 프로젝트가 여러 개 들어갑니다. 프로젝트를 열면 가져오기부터 시작합니다.',
  /** 쓰기 문이 닫힌 사람(게스트)에게 — 「이게 내 팀인가」를 첫 줄이 답한다 (2026-09-11). */
  leadGuest: '샘플 팀을 둘러보는 중입니다 · 읽기 전용. 내 팀을 만들려면 GitHub 로 로그인하세요.',
  newTeam: '팀 만들기',
  newProject: '새 프로젝트',
  openProject: '열기',
  /** 「팀원」 제목 아래 「팀장」이 서면 낱말이 부딪힌다 — 등급을 가리지 않는 낱말로. */
  members: '구성원',
  invite: '팀원 초대',
  inviteLead: '초대 메일은 보내지 않습니다. 이 이메일로 GitHub 로그인하면 바로 팀원이 됩니다 — 로그인 주소를 직접 전해 주세요.',
  invited: '초대됨 · 아직 로그인 전',
  // 등급 낱말의 정본은 ROLE_LABEL — 여기 영어 값(owner/member)이 죽은 채 남아 있었다 (2026-09-11 삭제)
  noProjects: '아직 프로젝트가 없습니다.',
  onlyOwnerInvites: '팀원 초대는 팀장이 합니다.',
} as const

/** 등급 낱말 — enum 값을 화면에 그대로 내지 않는다 (`ITEM_TYPE_LABEL` 과 같은 판단). */
export const ROLE_LABEL: Record<TeamRole, string> = { owner: '팀장', member: '팀원' }

export type TeamHomeState = {
  readonly teams: TeamRef[]
  /** 팀별 팀원 목록 — 아직 안 읽었으면 없다. */
  readonly members: Record<string, TeamMemberView[]>
  readonly door: WriteDoor
  /** 초대 폼 — 팀 하나만 열린다. */
  readonly inviting: { teamId: string; email: string; role: TeamRole; busy: boolean; error: string | null; done: string | null } | null
  readonly refused: string | null
}

export type TeamHomeHandlers = {
  onOpenInvite: (teamId: string) => void
  onInviteChange: (patch: { email?: string; role?: TeamRole }) => void
  onInviteSubmit: () => void
  onCloseRefused: () => void
}

export function TeamHome({ state, on }: { state: TeamHomeState; on: TeamHomeHandlers }) {
  return (
    <div className="col">
      <header className="row-between wrap">
        <div className="col-tight">
          <h1 className="text-section">{TEAM_HOME_TEXT.title}</h1>
          {/* 화면을 설명하는 한 문장은 본문 크기다 (다른 화면의 ⑪ 과 같다) — 문이 닫힌 사람에겐 그 사실이 먼저다. */}
          <p className="plain-line">{state.door.open ? TEAM_HOME_TEXT.lead : TEAM_HOME_TEXT.leadGuest}</p>
        </div>
        <a className="btn" href="/t/new">{TEAM_HOME_TEXT.newTeam}</a>
      </header>

      {state.refused ? <ReadOnlyNotice reason={state.refused} onClose={on.onCloseRefused} /> : null}

      {state.teams.map((team) => (
        <section key={team.id} className="card pad col">
          <div className="row-between wrap">
            <div className="col-tight">
              {/* 「내 팀」(h1) 아래의 팀 이름은 한 층 작다 — 주소 조각은 개발자에게만 뜻이 있어 적지 않는다. */}
              <h2 className="row-name">{team.name}</h2>
              <span className="meta">나는 이 팀의 {ROLE_LABEL[team.role]}입니다</span>
            </div>
            {/* 프로젝트 만들기는 owner 문이다 (`POST /teams/{id}/projects`) — member 에게는 안 그린다. */}
            {ROLE_RANK[team.role] >= ROLE_RANK.owner
              ? <a className="btn btn-sm" href={`/t/${team.slug}/p/new`}>{TEAM_HOME_TEXT.newProject}</a>
              : null}
          </div>

          {team.projects.length === 0
            ? <p className="meta">{TEAM_HOME_TEXT.noProjects}</p>
            : (
              <ul className="col-tight">
                {team.projects.map((p) => (
                  //  「프로젝트를 열면 가져오기부터」라고 말했으니 여는 버튼이 보여야 한다 — 글자 링크 하나는 안 보였다.
                  <li key={p.id} className="row-between wrap">
                    <span className="col-tight">
                      <span className="row-name">{p.name}</span>
                      {p.description ? <span className="meta">{p.description}</span> : null}
                    </span>
                    <a className="btn btn-sm" href={`/t/${team.slug}/p/${p.slug}/import`}>{TEAM_HOME_TEXT.openProject}</a>
                  </li>
                ))}
              </ul>
            )}

          <Members team={team} state={state} on={on} />
        </section>
      ))}
    </div>
  )
}

function Members({ team, state, on }: { team: TeamRef; state: TeamHomeState; on: TeamHomeHandlers }) {
  const members = state.members[team.id]
  const inviting = state.inviting?.teamId === team.id ? state.inviting : null
  const isOwner = ROLE_RANK[team.role] >= ROLE_RANK.owner

  return (
    <div className="col-tight">
      <span className="label">{TEAM_HOME_TEXT.members}</span>
      {members === undefined ? <div className="skeleton" /> : (
        <ul className="col-tight">
          {members.map((m) => (
            <li key={m.user_id} className="row wrap">
              <span className="ink">{m.name}</span>
              <span className="meta">{ROLE_LABEL[m.role]}</span>
              {/* 초대됐지만 아직 로그인 전인 사람 — 상태를 색이 아니라 낱말로 (DESIGN_BRIEF §3). */}
              {m.status === 'invited' ? <span className="meta">{TEAM_HOME_TEXT.invited}</span> : null}
            </li>
          ))}
        </ul>
      )}

      {isOwner
        ? (inviting === null
          ? <span className="row"><button type="button" className="btn btn-sm" onClick={() => on.onOpenInvite(team.id)}>{TEAM_HOME_TEXT.invite}</button></span>
          : <InviteForm inviting={inviting} on={on} />)
        : <span className="meta">{TEAM_HOME_TEXT.onlyOwnerInvites}</span>}
    </div>
  )
}

function InviteForm({ inviting, on }: { inviting: NonNullable<TeamHomeState['inviting']>; on: TeamHomeHandlers }) {
  function submit(e: FormEvent): void {
    e.preventDefault()
    on.onInviteSubmit()
  }
  return (
    <form className="col-tight" onSubmit={submit}>
      <p className="meta">{TEAM_HOME_TEXT.inviteLead}</p>
      <div className="row wrap">
        <input
          className="input"
          type="email"
          required
          placeholder="teammate@example.com"
          value={inviting.email}
          onChange={(e) => on.onInviteChange({ email: e.target.value })}
        />
        {/* 등급은 계약의 표에서 그린다 — `<option>` 을 손으로 적지 않는다. */}
        <select className="select" value={inviting.role} onChange={(e) => on.onInviteChange({ role: e.target.value as TeamRole })}>
          {TEAM_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button type="submit" className="btn btn-sm" disabled={inviting.busy || inviting.email.trim().length === 0}>
          {inviting.busy ? '초대하는 중…' : TEAM_HOME_TEXT.invite}
        </button>
      </div>
      {inviting.error ? <Note tone="bad">{inviting.error}</Note> : null}
      {inviting.done ? <Note tone="ok">{inviting.done}</Note> : null}
    </form>
  )
}
