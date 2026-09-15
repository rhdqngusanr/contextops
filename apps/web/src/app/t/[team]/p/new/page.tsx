'use client'

import { use, useState } from 'react'

import { writeDoor } from '../../../../../lib/web/actor'
import { messageOf } from '../../../../../lib/web/api'
import { createProject, createRepo, fetchTeams } from '../../../../../lib/web/queries'
import { toSlug } from '../../../../../lib/web/slug'
import { useAsync } from '../../../../../lib/web/use-async'
import { ErrorState, NeedsLogin, ReadOnlyNotice, Skeleton } from '../../../../../components/states'
import { Note } from '../../../../../components/chips'
import { Step, Steps, Why } from '../../../../../components/guide'
import { SETUP_TEXT, SetupSteps, projectWhere } from '../../../../../components/setup-guide'

// =====================================================================
//  화면 2 — 프로젝트 만들기 (DESIGN_BRIEF §4 「화면 2」 · SPEC §5)
//
//  ★ 레포 이름은 **여러 개**다 (태그 입력). 왜 여기서 받나 — 근거(`SourceRef` 의
//    `repository_path`)가 레포 이름을 가리키고, 등록된 이름이 없으면 그 근거는
//    아무것도 안 가리킨다 (`test/helpers/fixtures.ts` 의 같은 주석).
//
//  🔴 **할 일은 번호 걸음, 이유는 접고, 만든 뒤에는 가져오기로 간다** (FINDINGS 176 · 177). 빈 Context 표로 떨어지던
//     동안 처음 온 사람은 다음에 무엇을 할지 몰랐다 — DESIGN_BRIEF 화면 2 는 처음부터 「완료 시 바로 화면 3으로」였다.
//     문장의 정본은 `components/setup-guide.tsx` 의 `SETUP_TEXT`, 모양의 정본은 `components/guide.tsx` 다.
//
//  ⚠ 프로젝트를 만든 뒤 레포를 넣다가 실패해도 **프로젝트는 남는다.** 하나의
//    트랜잭션이 아니다 (라우트가 둘이다). 지금은 그 자리에 오류 문장이 뜬다 —
//    되돌리는 척하지 않는다.
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
      //  🔴 만든 뒤에는 **가져오기**다 — 새 프로젝트의 첫 일은 문서를 넣거나 기본 질문에 답하는 것이다 (FINDINGS 176).
      window.location.assign(`/t/${teamSlug}/p/${project.slug}/import`)
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
          <Note tone="bad">그런 팀을 찾을 수 없습니다.</Note>
          <a className="btn" href="/t/new">팀 만들기</a>
        </div>
      </div>
    )
  }

  return (
    <div className="center">
      <form className="card center-card" onSubmit={(e) => { e.preventDefault(); void submit(team.id) }}>
        <div className="col-tight">
          <SetupSteps current={1} />
          <h1 className="text-section">프로젝트 만들기</h1>
          {/* 주소 조각(`/t/…`)은 개발자에게만 뜻이 있다 — 어느 팀에 만드는지만 말한다. */}
          <p className="ink-3">{projectWhere(team.name)}</p>
          <Why summary={SETUP_TEXT.project.leadWhy}><p>{SETUP_TEXT.project.lead}</p></Why>
        </div>

        <Steps>
          <Step title={SETUP_TEXT.project.nameTitle} htmlFor="p-name">
            {/* ⚠ 예시가 저장소 이름(`paylab-api`)과 같으면 아래 저장소 칸과 헷갈린다 — 서비스 이름으로, 주소 후보가 생기는 영문으로. */}
            <input id="p-name" className="input" value={name} placeholder="Payments" onChange={(e) => setName(e.target.value)} />
            {/* ⚠ 알약으로 그리지 않는다 — 테두리 알약은 이 앱에서 버튼의 얼굴이라 누르면 채워지는 줄 안다(누르면 한글이라 주소 후보도 안 생긴다). */}
            <p className="meta">예: {SETUP_TEXT.projectNameExamples.join(' · ')}</p>
          </Step>

          <Step title={SETUP_TEXT.slugTitle} htmlFor="p-slug">
            <input
              id="p-slug"
              className="input mono"
              value={candidate}
              placeholder="payments"
              onChange={(e) => { setTouchedSlug(true); setSlug(e.target.value) }}
            />
            <span className="meta">주소: <span className="mono">/t/{team.slug}/p/{candidate || '…'}</span></span>
            {/* 한글 이름이면 후보가 비고 버튼이 잠긴다 — 왜 잠겼는지 그 자리에서 말한다 (팀 만들기와 같은 문장 · 접지 않는다). */}
            {candidate.length === 0 && name.length > 0 ? <Note tone="warn">{SETUP_TEXT.noSlug}</Note> : null}
            <Why summary={SETUP_TEXT.slugWhy}><p>{SETUP_TEXT.slugHelp}</p></Why>
          </Step>

          <Step title={SETUP_TEXT.project.descTitle} htmlFor="p-desc" optional={SETUP_TEXT.optional}>
            <input id="p-desc" className="input" value={description} placeholder="결제·환불 서비스" onChange={(e) => setDescription(e.target.value)} />
            <Why summary={SETUP_TEXT.project.descWhy}><p>{SETUP_TEXT.project.descHelp}</p></Why>
          </Step>

          <Step title={SETUP_TEXT.project.repoTitle} htmlFor="p-repo" optional={SETUP_TEXT.optional}>
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
                    <button type="button" className="btn btn-sm" onClick={() => setRepos(repos.filter((x) => x !== r))}>빼기</button>
                  </span>
                ))}
              </div>
            ) : null}
            {/* 「나중에 추가해도 됩니다」는 적지 않는다 — 웹에 그 문이 없다. */}
            <Why summary={SETUP_TEXT.project.repoWhy}><p>{SETUP_TEXT.project.repoHelp}</p></Why>
          </Step>
        </Steps>

        <p className="meta">{SETUP_TEXT.project.next}</p>

        {refused ? <ReadOnlyNotice reason={refused} onClose={() => setRefused(null)} /> : null}
        {error ? <Note tone="bad">{error}</Note> : null}

        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length === 0 || candidate.length < 2}>
          {busy ? '만드는 중' : '프로젝트 만들기'}
        </button>
      </form>
    </div>
  )
}
