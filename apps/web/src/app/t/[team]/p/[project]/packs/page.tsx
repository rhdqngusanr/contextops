'use client'

import { use } from 'react'

import { fetchVersions, type ProjectRef } from '../../../../../../lib/web/queries'
import { useAsync } from '../../../../../../lib/web/use-async'
import { ProjectGate } from '../../../../../../components/project-gate'
import { ErrorState, ScreenEmpty, Skeleton } from '../../../../../../components/states'
import { VersionHistory } from '../../../../../../components/versions'

// =====================================================================
//  Pack 고르기 — 화면 7 은 **버전 하나**를 가리켜야 열린다 (`…/packs/{semver}`)
//
//  ★ 왜 별도 화면인가 — 좌측 내비의 「Pack Explorer」 탭이 갈 곳이 있어야 한다.
//    `latest` 라는 경로를 만들지 않은 이유는, 주소가 가리키는 것이 **바뀌면**
//    「이 주소를 공유하면 같은 것을 본다」가 거짓이 되기 때문이다 (SPEC §6 「버전은 불변」).
//
//  ⚠ 목록을 그리는 코드는 화면 5 의 버전 히스토리와 **같은 컴포넌트**다.
// =====================================================================

export default function PacksPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const { team, project } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ project: p }) => <PackList base={`/t/${team}/p/${project}`} project={p} />}
    </ProjectGate>
  )
}

function PackList({ base, project }: { base: string; project: ProjectRef }) {
  const { result, reload } = useAsync(() => fetchVersions(project.id), [project.id])

  return (
    <>
      <header className="col-tight">
        <h1 className="text-section">Pack Explorer</h1>
        {/* 낱말 풀이가 먼저 (2026-09-10 저녁) — 「Pack」은 이 화면에서 처음 만나는 낱말이다. */}
        <p className="ink-2">Pack 은 팀이 승인한 규칙을 AI 가 읽는 파일 묶음(CLAUDE.md 등)입니다.</p>
        <p className="meta">발행된 버전을 골라 열면, 파일의 모든 줄이 어느 항목에서 왔는지 볼 수 있습니다.</p>
      </header>
      <section className="card">
        {result.state === 'loading' ? <div className="pad"><Skeleton rows={3} /></div> : null}
        {result.state === 'error' ? <ErrorState error={result.error} retry={reload} /> : null}
        {result.state === 'ready' ? (
          <VersionHistory
            versions={result.data.versions}
            packHref={(semver) => `${base}/packs/${semver}`}
            empty={<ScreenEmpty slot="packs.versions" base={base} />}
          />
        ) : null}
      </section>
    </>
  )
}
