'use client'

import { use, useState } from 'react'

import type { ProposalStatus } from '@contextops/schema'

import { fetchProposals, type ProjectRef } from '../../../../../../lib/web/queries'
import { useAsync } from '../../../../../../lib/web/use-async'
import { ProjectGate } from '../../../../../../components/project-gate'
import {
  ProposalStatusFilter, ProposalTable, proposalEmptyMessage,
} from '../../../../../../components/proposals'
import { ErrorState, ScreenEmpty, Skeleton } from '../../../../../../components/states'

// =====================================================================
//  화면 6 — Proposals 목록 (SPEC §9 화면 6 · DESIGN_BRIEF §4 「화면 6」)
//
//  ★ 이 화면이 「함」이다 — 기기(플러그인 `contextops propose`)가 올린 제안이 여기
//    쌓이고, owner 가 승인한 것만 다음 발행에 들어간다 (SPEC §2.1 2단계).
//
//  🔴 상태 거르개는 **서버가 건다** (`?status` · FINDINGS 112). 칩을 누르면 목록을 다시
//     읽는다 — 받아 놓은 50장을 화면에서 거르면 51번째 「거절됨」은 걸러도 안 나온다.
//  ⚠ `author` 거르개는 여전히 없다. 고를 이름의 목록을 내는 문이 없어서, 화면이 그릴 수
//    있는 것은 「지금 목록에 우연히 보이는 사람」뿐이다 — 거르개가 자기가 거른 결과를
//    따라가면 그건 거르개가 아니다 (FINDINGS 112 · 대장에 남겨 뒀다).
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
  const [status, setStatus] = useState<ProposalStatus | null>(null)
  const { result, reload } = useAsync(
    () => fetchProposals(project.id, status === null ? {} : { status }),
    [project.id, status],
  )

  return (
    <>
      <header className="col-tight">
        <h1 className="text-section">제안</h1>
        <p className="meta">
          Claude Code에서 <span className="mono ink">contextops propose</span> 로 올라온 변경 제안입니다.
          승인된 제안만 다음 발행에 들어갑니다.
        </p>
      </header>

      <ProposalStatusFilter value={status} onChange={setStatus} />

      <section className="card">
        {result.state === 'loading' ? <div className="pad"><Skeleton rows={4} /></div> : null}
        {result.state === 'error' ? <ErrorState error={result.error} retry={reload} /> : null}
        {result.state === 'ready' ? (
          <ProposalTable
            proposals={result.data.proposals}
            hrefOf={(p) => `${base}/proposals/${p.id}`}
            empty={<ScreenEmpty slot="proposals.list" base={base} message={proposalEmptyMessage(status)} />}
          />
        ) : null}
      </section>
    </>
  )
}
