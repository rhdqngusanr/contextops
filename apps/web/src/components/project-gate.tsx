'use client'

import type { ReactNode } from 'react'

import { ApiClientError } from '../lib/web/api'
import { fetchTeams, resolveSlugs, type ProjectRef, type TeamRef } from '../lib/web/queries'
import { useAsync } from '../lib/web/use-async'
import { ErrorState, NeedsLogin, Skeleton } from './states'

// =====================================================================
//  주소의 slug → 실제 프로젝트 (SPEC §9 의 주소는 slug, 라우트는 uuid)
//
//  ★ 왜 컴포넌트로 묶나 — 화면 5·7 이 **똑같은** 네 갈래를 탄다:
//    loading · 로그인 없음 · 그런 프로젝트 없음 · 서버 오류.
//    화면마다 적으면 한 화면에서 한 갈래가 빠지고, 빠진 화면은 빈 채로 멀쩡해 보인다.
//
//  ⚠ 401 을 「오류」로 그리지 않는다. 로그인이 없는 것은 고장이 아니라 **다음 걸음**이다.
// =====================================================================

export function ProjectGate({
  team,
  project,
  children,
}: {
  team: string
  project: string
  children: (ctx: { team: TeamRef; project: ProjectRef }) => ReactNode
}) {
  const { result, reload } = useAsync(() => fetchTeams(), [team, project])
  const here = `/t/${team}/p/${project}`

  if (result.state === 'loading') return <div className="card pad"><Skeleton rows={5} /></div>
  if (result.state === 'error') {
    if (result.error instanceof ApiClientError && result.error.code === 'UNAUTHORIZED') {
      return <div className="card"><NeedsLogin next={here} /></div>
    }
    return <div className="card"><ErrorState error={result.error} retry={reload} /></div>
  }

  const found = resolveSlugs(result.data.teams, team, project)
  if (!found) {
    //  ⚠ 「없다」와 「권한이 없다」를 구별해 주지 않는다 — 서버의 guard 와 같은 이유다
    //    (`lib/api/guard.ts`: 404/403 의 차이로 존재를 캐낼 수 있다).
    return (
      <div className="card state-box">
        <p className="ink">그런 프로젝트를 찾을 수 없습니다.</p>
        <a className="btn btn-sm" href="/t">내 팀으로</a>
      </div>
    )
  }
  return <>{children(found)}</>
}
