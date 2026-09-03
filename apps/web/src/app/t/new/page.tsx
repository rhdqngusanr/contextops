'use client'

import { useEffect, useState } from 'react'

import { messageOf } from '../../../lib/web/api'
import { createTeam } from '../../../lib/web/queries'
import { readSession } from '../../../lib/web/session'
import { toSlug } from '../../../lib/web/slug'
import { NeedsLogin } from '../../../components/states'

// =====================================================================
//  화면 2 — 팀 만들기 (DESIGN_BRIEF §4 「화면 2」 · SPEC §5 `POST /teams`)
//
//  ★ slug 는 이름에서 **자동으로 만들고 편집 가능**하다. 사람이 한 번 손대면
//    그 뒤로는 이름을 고쳐도 slug 를 덮지 않는다 — 덮으면 방금 적은 것이 사라진다.
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

  async function submit() {
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
          <h1 className="text-section">팀 만들기</h1>
          <p className="ink-3">팀 하나에 프로젝트가 여러 개 들어갑니다.</p>
        </div>

        <div className="field">
          <label className="label" htmlFor="team-name">이름</label>
          <input
            id="team-name"
            className="input"
            value={name}
            placeholder="재미난사람들"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="team-slug">slug — 주소에 쓰입니다</label>
          <input
            id="team-slug"
            className="input mono"
            value={candidate}
            placeholder="fun-people"
            onChange={(e) => { setTouchedSlug(true); setSlug(e.target.value) }}
          />
          <span className="meta mono">/t/{candidate || '…'}</span>
          {candidate.length === 0 && name.length > 0
            //  한글 이름은 후보가 비어 있다 — 지어내지 않는다 (`lib/web/slug.ts`).
            ? <span className="meta ink-warn">⚠ 이름에서 slug 를 만들지 못했습니다. 영문·숫자로 직접 적어주세요.</span>
            : null}
        </div>

        {error ? <p className="meta ink-bad">✕ {error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length === 0 || candidate.length < 2}>
          {busy ? '만드는 중' : '팀 만들기'}
        </button>
      </form>
    </div>
  )
}
