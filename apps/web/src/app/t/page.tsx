'use client'

import { useEffect, useState } from 'react'
import type { TeamRole } from '@contextops/schema'

import { writeDoor } from '../../lib/web/actor'
import { ApiClientError, messageOf } from '../../lib/web/api'
import { fetchMembers, fetchTeams, inviteMember, type TeamMemberView } from '../../lib/web/queries'
import { readSession } from '../../lib/web/session'
import { useAsync } from '../../lib/web/use-async'
import { DemoBanner } from '../../components/demo-banner'
import { ErrorState, NeedsLogin, Skeleton } from '../../components/states'
import { TeamHome, type TeamHomeState } from '../../components/team-home'

// =====================================================================
//  `/t` — 로그인 뒤의 첫 화면 (INBOX H9 · SPEC §9 화면 2)
//
//  ★ 팀이 하나도 없으면 팀 만들기로 보낸다 — 예전 기본 목적지가 그것이었고, 처음 온 사람에겐 여전히 맞다.
//    팀이 있으면 여기서 프로젝트를 고르고, owner 는 팀원을 초대한다.
//  ⚠ 상태는 여기, 그리기는 `components/team-home.tsx` — 시험이 그 컴포넌트를 브라우저 없이 그린다.
// =====================================================================

export default function TeamsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => { setSignedIn(readSession() !== null) }, [])

  if (signedIn === null) return <div className="center"><div className="card center-card"><div className="skeleton" /></div></div>
  if (!signedIn) return <div className="center"><div className="card center-card"><NeedsLogin next="/t" /></div></div>
  return <TeamsView />
}

function TeamsView() {
  const teams = useAsync(() => fetchTeams(), [])
  const [members, setMembers] = useState<Record<string, TeamMemberView[]>>({})
  const [inviting, setInviting] = useState<TeamHomeState['inviting']>(null)
  const [refused, setRefused] = useState<string | null>(null)

  //  팀 목록이 오면 팀마다 팀원을 읽는다 — 홈은 「누가 있나」를 같이 보여 주는 자리다.
  useEffect(() => {
    if (teams.result.state !== 'ready') return
    if (teams.result.data.teams.length === 0) {
      window.location.replace('/t/new')
      return
    }
    for (const team of teams.result.data.teams) {
      void fetchMembers(team.id).then(
        (res) => setMembers((prev) => ({ ...prev, [team.id]: res.members })),
        () => setMembers((prev) => ({ ...prev, [team.id]: [] })),
      )
    }
  }, [teams.result])

  if (teams.result.state === 'loading') return <div className="shell"><main className="main"><div className="main-inner"><div className="card pad"><Skeleton rows={4} /></div></div></main></div>
  if (teams.result.state === 'error') {
    const err = teams.result.error
    if (err instanceof ApiClientError && err.code === 'UNAUTHORIZED') return <div className="center"><div className="card center-card"><NeedsLogin next="/t" /></div></div>
    return <div className="center"><div className="card center-card"><ErrorState error={err} retry={teams.reload} /></div></div>
  }

  async function submitInvite(): Promise<void> {
    if (!inviting) return
    //  🔴 쓰기 문 — 누르기 전에 서버와 같은 표를 읽는다 (게스트도 주소·뒤로가기로 `/t` 에 온다 · 문은 하나다).
    const door = writeDoor()
    if (!door.open) { setRefused(door.reason); return }
    setInviting({ ...inviting, busy: true, error: null, done: null })
    try {
      const made = await inviteMember(inviting.teamId, { email: inviting.email.trim(), role: inviting.role })
      setMembers((prev) => ({ ...prev, [inviting.teamId]: [...(prev[inviting.teamId] ?? []), made] }))
      //  이름을 문장 끝에 두면 「을(를)」 같은 이중 조사가 필요 없다 — 이름은 이메일 @ 앞부분이라 받침을 모른다.
      setInviting({ ...inviting, busy: false, email: '', done: made.status === 'invited' ? `초대했습니다: ${made.name} — GitHub 로 로그인하면 팀원이 됩니다.` : `팀원이 됐습니다: ${made.name}` })
    } catch (err) {
      setInviting({ ...inviting, busy: false, error: messageOf(err) })
    }
  }

  const state: TeamHomeState = {
    teams: teams.result.data.teams,
    members,
    door: writeDoor(),
    inviting,
    refused,
  }

  return (
    <div className="shell">
      <main className="main">
        <div className="main-inner">
          {/* 게스트가 주소·뒤로가기로 여기 오면 다른 앱 화면과 같은 배너를 본다 — 게스트가 아니면 null 이다. */}
          <DemoBanner />
          <TeamHome
            state={state}
            on={{
              onOpenInvite: (teamId) => setInviting({ teamId, email: '', role: 'member' as TeamRole, busy: false, error: null, done: null }),
              onInviteChange: (patch) => setInviting((prev) => (prev ? { ...prev, ...patch } : prev)),
              onInviteSubmit: () => { void submitInvite() },
              onCloseRefused: () => setRefused(null),
            }}
          />
          {/* 초대 절차 문장은 초대 폼 안(`team-home.tsx` 의 이메일 칸 바로 위) 한 곳이 정본이다 — 여기 한 번 더 두면
              초대할 수 없는 팀원·게스트에게도 떠서 「내가 뭘 해야 하나」로 읽혔다 (2026-09-11 삭제). */}
        </div>
      </main>
    </div>
  )
}
