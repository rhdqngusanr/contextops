'use client'

import { use, useState } from 'react'

import { writeDoor } from '../../../../../lib/web/actor'
import { messageOf } from '../../../../../lib/web/api'
import { createProject, createRepo, fetchTeams } from '../../../../../lib/web/queries'
import { toSlug } from '../../../../../lib/web/slug'
import { useAsync } from '../../../../../lib/web/use-async'
import { ErrorState, NeedsLogin, ReadOnlyNotice, Skeleton } from '../../../../../components/states'

// =====================================================================
//  화면 2 — 프로젝트 만들기 (DESIGN_BRIEF §4 「화면 2」 · SPEC §5)
//
//  ★ 레포 이름은 **여러 개**다 (태그 입력). 왜 여기서 받나 — 근거(`SourceRef` 의
//    `repository_path`)가 레포 이름을 가리키고, 등록된 이름이 없으면 그 근거는
//    아무것도 안 가리킨다 (`test/helpers/fixtures.ts` 의 같은 주석).
//
//  ⚠ 프로젝트를 만든 뒤 레포를 넣다가 실패해도 **프로젝트는 남는다.** 하나의
//    트랜잭션이 아니다 (라우트가 둘이다). 그래서 실패해도 「프로젝트는 만들어졌다」를
//    말하고 Context 화면으로 보낸다 — 되돌리는 척하는 것이 더 나쁘다.
// =====================================================================

export default function NewProjectPage({ params }: { params: Promise<{ team: string }> }) {
  const { team: teamSlug } = use(params)
  const { result, reload } = useAsync(() => fetchTeams(), [teamSlug])

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touchedSlug, setTouchedSlug] = useState(false)
  const [description, setDescription] = useState('')
  const [repos, setRepos] = useState<string[]>([])
  const [repoDraft, setRepoDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidate = touchedSlug ? slug : toSlug(name)

  function addRepo() {
    const value = repoDraft.trim()
    if (value.length === 0 || repos.includes(value)) return
    setRepos([...repos, value])
    setRepoDraft('')
  }

  //  게스트도 세션이 있어 이 화면이 열린다 — 누르기 전에 서버와 같은 표를 읽는다 (INBOX H7).
  const [refused, setRefused] = useState<string | null>(null)

  async function submit(teamId: string) {
    const door = writeDoor()
    if (!door.open) { setRefused(door.reason); return }
    setBusy(true)
    setError(null)
    try {
      const project = await createProject(teamId, {
        name: name.trim(),
        slug: candidate,
        ...(description.trim() ? { description: description.trim() } : {}),
      })
      for (const repo of repos) await createRepo(project.id, repo)
      window.location.assign(`/t/${teamSlug}/p/${project.slug}/context`)
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  if (result.state === 'loading') {
    return <div className="center"><div className="card center-card"><Skeleton rows={4} /></div></div>
  }
  if (result.state === 'error') {
    return (
      <div className="center">
        <div className="card center-card">
          {/* 401 은 「오류」가 아니라 「아직 로그인 안 함」이다 — 다음 걸음을 보여 준다. */}
          <ErrorState error={result.error} retry={reload} />
          <NeedsLogin next={`/t/${teamSlug}/p/new`} />
        </div>
      </div>
    )
  }

  const team = result.data.teams.find((t) => t.slug === teamSlug)
  if (!team) {
    return (
      <div className="center">
        <div className="card center-card">
          <p className="ink">✕ 그런 팀을 찾을 수 없습니다.</p>
          <a className="btn" href="/t/new">팀 만들기</a>
        </div>
      </div>
    )
  }

  return (
    <div className="center">
      <form className="card center-card" onSubmit={(e) => { e.preventDefault(); void submit(team.id) }}>
        <div className="col-tight">
          <h1 className="text-section">프로젝트 만들기</h1>
          <p className="ink-3">{team.name} · <span className="mono">/t/{team.slug}</span></p>
        </div>

        <div className="field">
          <label className="label" htmlFor="p-name">이름</label>
          <input id="p-name" className="input" value={name} placeholder="paylab-api" onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label className="label" htmlFor="p-slug">slug</label>
          <input
            id="p-slug"
            className="input mono"
            value={candidate}
            placeholder="api"
            onChange={(e) => { setTouchedSlug(true); setSlug(e.target.value) }}
          />
          <span className="meta mono">/t/{team.slug}/p/{candidate || '…'}</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="p-desc">한 줄 설명</label>
          <input id="p-desc" className="input" value={description} placeholder="결제·환불 서비스" onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field">
          <label className="label" htmlFor="p-repo">레포 이름 — 근거가 가리킬 저장소입니다</label>
          <div className="row">
            <input
              id="p-repo"
              className="input mono grow"
              value={repoDraft}
              placeholder="paylab-api"
              onChange={(e) => setRepoDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRepo() } }}
            />
            <button type="button" className="btn btn-sm" onClick={addRepo}>추가</button>
          </div>
          {repos.length > 0 ? (
            <div className="row wrap">
              {repos.map((r) => (
                <span key={r} className="ctx-tag">
                  {r}
                  <button type="button" className="btn btn-sm" onClick={() => setRepos(repos.filter((x) => x !== r))}>✕</button>
                </span>
              ))}
            </div>
          ) : <span className="meta">나중에 추가해도 됩니다.</span>}
        </div>

        {refused ? <ReadOnlyNotice reason={refused} onClose={() => setRefused(null)} /> : null}
        {error ? <p className="meta ink-bad">✕ {error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length === 0 || candidate.length < 2}>
          {busy ? '만드는 중' : '프로젝트 만들기'}
        </button>
      </form>
    </div>
  )
}
