'use client'

import { use, useState } from 'react'
import type { ProposalAction, TeamRole } from '@contextops/schema'

import {
  decideProposal, fetchProposal, fetchVersions,
  type ProjectRef, type VersionRow,
} from '../../../../../../../lib/web/queries'
import { writeDoor } from '../../../../../../../lib/web/actor'
import { useMilestoneTitles } from '../../../../../../../lib/web/milestone-titles'
import { useAsync } from '../../../../../../../lib/web/use-async'
import { ProjectGate } from '../../../../../../../components/project-gate'
import { ProposalDecisions, ProposalHead, ProposalItemCard } from '../../../../../../../components/proposals'
import { ErrorState, Skeleton } from '../../../../../../../components/states'

// =====================================================================
//  화면 6 상세 — 제안 한 장 (SPEC §9 화면 6 · DESIGN_BRIEF §4 「화면 6」)
//
//  🔴 **주소가 제안 하나를 가리킨다** (`…/proposals/{id}`) — 그래서 목록에서 골라
//     그리지 않고 `GET /proposals/{id}` 를 따로 읽는다. 목록은 `?limit=50` 이라
//     51번째 제안의 상세는 목록으로 영원히 못 연다 (라우트 주석).
//
//  ★ 버전 목록을 같이 읽는 이유는 **기준 버전의 이름** 하나 때문이다 — 제안이 들고
//    있는 것은 uuid 이고, 사람이 읽어야 하는 것은 `v1.2.0` 이다. 못 찾으면 그렇게
//    말한다 (uuid 를 대신 그리지 않는다).
//    ⚠ 이 목록도 `?limit=50` 이다 — 51번째 발행보다 오래된 기준은 못 찾고, 그때 화면은
//      「기준 버전을 찾을 수 없습니다」라고 **사실대로** 말한다. 여기서 지어내지 않는 것이
//      맞고, 이름이 꼭 필요해지면 문은 `GET /proposals/{id}` 쪽에 붙는다 (대상 항목과
//      같은 이유 — 서버는 필요한 것만 골라 읽는다).
//
//  ⚠ 결정 뒤에 손에 든 값을 갈아 끼우지 않고 **다시 읽는다** — 결정이 바꾸는 것은
//    상태 한 칸이 아니라 「이제 무엇을 누를 수 있나」이고, 그 판단은 서버가 준 상태로
//    다시 해야 한다 (화면 8 이 확정 뒤에 다시 읽는 것과 같은 이유).
// =====================================================================

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ team: string; project: string; id: string }>
}) {
  const { team, project, id } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ team: t, project: p }) => (
        <ProposalDetailView base={`/t/${team}/p/${project}`} project={p} proposalId={id} role={t.role} />
      )}
    </ProjectGate>
  )
}

function ProposalDetailView({
  base,
  project,
  proposalId,
  role,
}: {
  base: string
  project: ProjectRef
  proposalId: string
  role: TeamRole
}) {
  const detail = useAsync(() => fetchProposal(proposalId), [proposalId])
  const versions = useAsync(() => fetchVersions(project.id), [project.id])
  //  「관련 마일스톤」의 제목 — 목록 화면과 같은 표를 읽는다 (`lib/web/milestone-titles.ts`).
  const titles = useMilestoneTitles(project.id)

  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<ProposalAction | null>(null)
  const [failed, setFailed] = useState<unknown>(null)

  function decide(action: ProposalAction): void {
    setBusy(action)
    setFailed(null)
    decideProposal(proposalId, action, note.trim() === '' ? undefined : note.trim()).then(
      () => {
        setBusy(null)
        setNote('')
        detail.reload()
      },
      (error: unknown) => {
        setBusy(null)
        setFailed(error)
      },
    )
  }

  const versionOf = (id: string | null): VersionRow | null => {
    if (id === null || versions.result.state !== 'ready') return null
    return versions.result.data.versions.find((v) => v.id === id) ?? null
  }

  return (
    <>
      <header className="col-tight">
        {/* 화살표 기호를 쓰지 않는다 — 특수문자 아이콘은 이 저장소 어디에도 없다 (DESIGN_BRIEF §3 · 2026-09-11). */}
        <a className="meta" href={`${base}/proposals`}>제안 목록으로 돌아가기</a>
        <h1 className="text-section">제안 상세</h1>
      </header>

      {detail.result.state === 'loading' ? <div className="card pad"><Skeleton rows={6} /></div> : null}
      {detail.result.state === 'error'
        ? <div className="card"><ErrorState error={detail.result.error} retry={detail.reload} /></div>
        : null}

      {detail.result.state === 'ready' ? (
        <>
          <ProposalHead proposal={detail.result.data} base={versionOf(detail.result.data.base_version_id)} titles={titles} />

          {detail.result.data.items.map((item, i) => (
            <ProposalItemCard
              key={`${item.operation}-${i}`}
              item={item}
              index={i}
              target={detail.result.state === 'ready'
                ? detail.result.data.targets.find((t) => t.id === item.target_item_id)
                : undefined}
            />
          ))}

          <ProposalDecisions
            //  🔴 게스트(문 닫힘)에겐 등급 문장이 전부 거짓이다 — 서버와 같은 표를 읽어 이유를 말한다 (INBOX G13).
            state={{ status: detail.result.data.status, role, note, busy, door: writeDoor() }}
            onNote={setNote}
            onDecide={decide}
          />
          {/* ⚠ 실패는 결정 칸 **옆**에 남긴다 — 위로 올리면 사람이 누른 자리에서 안 보인다. */}
          {failed === null ? null : <div className="card"><ErrorState error={failed} /></div>}
        </>
      ) : null}
    </>
  )
}
