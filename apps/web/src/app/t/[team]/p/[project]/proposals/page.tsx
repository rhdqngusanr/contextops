'use client'

import { use } from 'react'

import { fetchProposals, type ProjectRef } from '../../../../../../lib/web/queries'
import { useAsync } from '../../../../../../lib/web/use-async'
import { ProjectGate } from '../../../../../../components/project-gate'
import { ProposalTable } from '../../../../../../components/proposals'
import { ErrorState, Skeleton } from '../../../../../../components/states'

// =====================================================================
//  화면 6 — Proposals 목록 (SPEC §9 화면 6 · DESIGN_BRIEF §4 「화면 6」)
//
//  ★ 이 화면이 「함」이다 — 기기(플러그인 `contextops propose`)가 올린 제안이 여기
//    쌓이고, owner 가 승인한 것만 다음 발행에 들어간다 (SPEC §2.1 2단계).
//
//  ⚠ 필터(status/author)는 아직 없다. **문이 없어서다** — 목록 라우트가 받는 질의는
//    `limit`·`offset` 뿐이고, `author` 는 이름을 내는 문이 아예 없다. 누르면 아무 일도
//    안 하는 칩을 두지 않는다 (FINDINGS 에 적었다).
//  ⚠ accent 가 이 화면에 하나도 없다 — 목록에서 사람이 할 일은 **고르는 것**이고,
//    결정은 상세에서 한다 (DESIGN_BRIEF §3 「화면당 주요 액션 하나」).
// =====================================================================

export default function ProposalsPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const { team, project } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ project: p }) => <ProposalList base={`/t/${team}/p/${project}`} project={p} />}
    </ProjectGate>
  )
}

function ProposalList({ base, project }: { base: string; project: ProjectRef }) {
  const { result, reload } = useAsync(() => fetchProposals(project.id), [project.id])

  return (
    <>
      <header className="col-tight">
        <h1 className="text-section">제안</h1>
        <p className="meta">
          Claude Code에서 <span className="mono ink">contextops propose</span> 로 올라온 변경 제안입니다.
          승인된 제안만 다음 발행에 들어갑니다.
        </p>
      </header>

      <section className="card">
        {result.state === 'loading' ? <div className="pad"><Skeleton rows={4} /></div> : null}
        {result.state === 'error' ? <ErrorState error={result.error} retry={reload} /> : null}
        {result.state === 'ready' ? (
          <ProposalTable
            proposals={result.data.proposals}
            hrefOf={(p) => `${base}/proposals/${p.id}`}
            emptyMessage="아직 올라온 제안이 없습니다. Claude Code에서 /contextops:propose 를 실행하면 여기에 쌓입니다."
          />
        ) : null}
      </section>
    </>
  )
}
