'use client'

import { useEffect, useState } from 'react'

import { writeDoor } from '../../../lib/web/actor'
import { messageOf } from '../../../lib/web/api'
import { createTeam } from '../../../lib/web/queries'
import { readSession } from '../../../lib/web/session'
import { toSlug } from '../../../lib/web/slug'
import { NeedsLogin, ReadOnlyNotice } from '../../../components/states'
import { Note } from '../../../components/chips'
import { Step, Steps, Why } from '../../../components/guide'
import { SETUP_TEXT, SetupSteps } from '../../../components/setup-guide'

// =====================================================================
//  화면 2 — 팀 만들기 (DESIGN_BRIEF §4 「화면 2」 · SPEC §5 `POST /teams`)
//
//  ★ slug 는 이름에서 **자동으로 만들고 편집 가능**하다. 사람이 한 번 손대면
//    그 뒤로는 이름을 고쳐도 slug 를 덮지 않는다 — 덮으면 방금 적은 것이 사라진다.
//
//  🔴 **할 일은 번호 걸음, 이유는 접는다** (FINDINGS 176 · 177) — 칸 이름과 placeholder 뿐이던 동안 처음 온 사람은
//     「팀」이 무엇인지부터 막혔고, 설명을 칸마다 붙이자 이번엔 긴 설명문처럼 읽혔다. 문장의 정본은
//     `components/setup-guide.tsx` 의 `SETUP_TEXT`, 모양의 정본은 `components/guide.tsx` 다.
//
//  ⚠ 실패 문구는 필드 옆에 붙인다. 서버가 주는 `details` 가 `[{path, message}]` 라
//    어느 칸이 문제인지 말할 수 있다 (`lib/api/route.ts` 의 `issuesOf`).
// =====================================================================

export default function NewTeamPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touchedSlug, setTouchedSlug] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  //  ⚠ 세션은 브라우저에만 있다 — 서버 렌더 때 읽으면 언제나 「없음」이다.
  useEffect(() => { setSignedIn(readSession() !== null) }, [])

  const candidate = touchedSlug ? slug : toSlug(name)

  //  🔴 게스트도 세션이 있어 이 화면이 열린다 — 누르기 전에 서버와 같은 표를 읽는다 (INBOX H7 · FINDINGS 135).
  const [refused, setRefused] = useState<string | null>(null)

  async function submit() {
    const door = writeDoor()
    if (!door.open) { setRefused(door.reason); return }
    setBusy(true)
    setError(null)
    try {
      const team = await createTeam({ name: name.trim(), slug: candidate })
      window.location.assign(`/t/${team.slug}/p/new`)
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  if (signedIn === null) return <div className="center"><div className="card center-card"><div className="skeleton" /></div></div>
  if (!signedIn) return <div className="center"><div className="card center-card"><NeedsLogin next="/t/new" /></div></div>

  return (
    <div className="center">
      <form className="card center-card" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <div className="col-tight">
          <SetupSteps current={0} />
          <h1 className="text-section">팀 만들기</h1>
          <Why summary={SETUP_TEXT.team.leadWhy}>
            <p>{SETUP_TEXT.team.lead}</p>
            <p>{SETUP_TEXT.team.invite}</p>
          </Why>
        </div>

        <Steps>
          <Step title={SETUP_TEXT.team.nameTitle} htmlFor="team-name">
            <input
              id="team-name"
              className="input"
              value={name}
              //  예시대로 적으면 주소 후보가 실제로 생기는 이름이어야 한다 — 한글 예시는 `toSlug` 가 빈 문자열을 낸다 (FINDINGS 158 의 결).
              placeholder="Paylab"
              onChange={(e) => setName(e.target.value)}
            />
            <Why summary={SETUP_TEXT.team.nameWhy}><p>{SETUP_TEXT.team.nameHelp}</p></Why>
          </Step>
          <Step title={SETUP_TEXT.slugTitle} htmlFor="team-slug">
            <input
              id="team-slug"
              className="input mono"
              value={candidate}
              placeholder="paylab"
              onChange={(e) => { setTouchedSlug(true); setSlug(e.target.value) }}
            />
            <span className="meta">주소: <span className="mono">/t/{candidate || '…'}</span></span>
            {candidate.length === 0 && name.length > 0
              //  한글 이름은 후보가 비어 있다 — 지어내지 않는다 (`lib/web/slug.ts`). 잠긴 버튼의 이유라 접지 않는다.
              ? <Note tone="warn">{SETUP_TEXT.noSlug}</Note>
              : null}
            <Why summary={SETUP_TEXT.slugWhy}><p>{SETUP_TEXT.slugHelp}</p></Why>
          </Step>
        </Steps>

        {refused ? <ReadOnlyNotice reason={refused} onClose={() => setRefused(null)} /> : null}
        {error ? <Note tone="bad">{error}</Note> : null}

        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length === 0 || candidate.length < 2}>
          {busy ? '만드는 중' : '팀 만들기'}
        </button>
      </form>
    </div>
  )
}
