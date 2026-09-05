'use client'

import { use, useState } from 'react'

import {
  REALTIME_POLL_MS, confirmProgress, fetchRoadmap,
  type ProgressEventView, type ProjectRef,
} from '../../../../../../lib/web/queries'
import { usePolling } from '../../../../../../lib/web/use-async'
import { ProjectGate } from '../../../../../../components/project-gate'
import { MilestoneRow, OffRoadmap, ProgressDrawer, RoadmapSummary } from '../../../../../../components/roadmap'
import { EmptyState, ErrorState, Skeleton } from '../../../../../../components/states'

// =====================================================================
//  화면 8 — Roadmap (SPEC §9 화면 8 · DESIGN_BRIEF §4 「화면 8」 · 원칙 P5)
//
//  ★ 이 화면이 「팀장이 매일 여는 화면」이다. 여기서 보이는 것은 **마일스톤이
//    어디까지 왔나**이고, 그 근거는 agent·훅이 보낸 진행 보고다 (`POST …/progress`).
//
//  🔴 **P5 — 행은 마일스톤이다.** 사람별 표도, 개인 점수도, 순위도 없다.
//     그리는 조각들(`components/roadmap.tsx`)도 서버 응답도 그 칸을 아예 안 가진다 —
//     「안 그리면 된다」가 아니라 **가진 적이 없다**.
//
//  🔴 **「Realtime」은 폴링이다** (SPEC §14 절삭 순서 8 「Realtime(폴링 10초)」).
//     ⚠ 화면 3·4 의 job 폴링과 **끝나는 조건이 다르다.** job 은 끝나면 멈추지만
//       로드맵은 끝나는 일이 아니라서 화면을 열어 둔 내내 돈다 — 그래서 `again` 이
//       늘 `REALTIME_POLL_MS` 다. (실패하면 `usePolling` 이 스스로 멈춘다. 500 을 내는
//       서버를 10초마다 계속 치면 화면 하나가 그 서버를 마저 쓰러뜨린다.)
//
//  ⚠ accent 가 이 화면에 하나도 없다. [완료 확인] 은 마일스톤마다 있어서
//    「화면당 주요 액션 하나」가 될 수 없고 (DESIGN_BRIEF §3), 빈 상태의
//    [Context로 이동] 만이 다음 걸음이다.
// =====================================================================

export default function RoadmapPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const { team, project } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ team: t, project: p }) => (
        //  🔴 확정은 owner 만이다 (`POST /progress/{id}/confirm`). 화면이 그것을 알아야
        //     member 에게 누를 때마다 403 을 내는 버튼을 그리지 않는다.
        <RoadmapView base={`/t/${team}/p/${project}`} project={p} canConfirm={t.role === 'owner'} />
      )}
    </ProjectGate>
  )
}

function RoadmapView({
  base,
  project,
  canConfirm,
}: {
  base: string
  project: ProjectRef
  canConfirm: boolean
}) {
  const road = usePolling(() => fetchRoadmap(project.id), [project.id], () => REALTIME_POLL_MS)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [offOpen, setOffOpen] = useState(false)
  const [selected, setSelected] = useState<ProgressEventView | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, unknown>>({})

  function confirm(milestone: string, eventId: string): void {
    setBusy(milestone)
    setErrors((prev) => ({ ...prev, [milestone]: null }))
    confirmProgress(eventId).then(
      () => {
        setBusy(null)
        //  🔴 응답 하나를 손에 든 값에 갈아 끼우지 않는다 — 확정이 바꾸는 것은 그 보고
        //     한 줄이 아니라 **마일스톤의 상태**이고, 그것을 접는 표는 서버에 있다
        //     (`rollupMilestone`). 화면이 여기서 접으면 두 곳이 같은 규칙을 갖는다.
        road.reload()
      },
      (error: unknown) => {
        setBusy(null)
        setErrors((prev) => ({ ...prev, [milestone]: error }))
      },
    )
  }

  return (
    <>
      <header className="col-tight">
        <h1 className="text-section">Roadmap</h1>
        {/* 🔴 「지금 이렇다」고 말하지 않는다 (DESIGN_BRIEF §2-3). 이 화면이 아는 것은
            언제나 **마지막 보고**이고, 다시 읽는 간격을 같이 말해야 사람이 무엇을 보고
            있는지 안다. */}
        <p className="meta">
          마일스톤이 어디까지 왔는지는 각 기기가 보낸 <strong className="ink">마지막 보고</strong> 기준입니다.
          이 화면은 {REALTIME_POLL_MS / 1000}초마다 다시 읽습니다.
        </p>
      </header>

      {road.result.state === 'loading' ? <Skeleton rows={6} /> : null}
      {road.result.state === 'error' ? <ErrorState error={road.result.error} retry={road.reload} /> : null}

      {road.result.state === 'ready' ? (
        road.result.data.context_version === null ? (
          //  ⚠ 「마일스톤 0개」와 구별한다 — 발행 전에는 로드맵이 **있을 수가 없다**
          //    (마일스톤의 정본은 발행된 Manifest 다 · 라우트 주석).
          <EmptyState
            message="아직 발행된 버전이 없습니다. 로드맵은 발행된 Pack의 마일스톤에서 옵니다."
            action={<a className="btn btn-primary" href={`${base}/context`}>Context로 이동</a>}
          />
        ) : (
          <>
            <RoadmapSummary roadmap={road.result.data} />

            {road.result.data.milestones.length === 0 ? (
              <EmptyState message="공식 Pack에 마일스톤이 없습니다. roadmap 타입 항목을 만들면 여기 행이 생깁니다." />
            ) : null}

            <div className="row items-start">
              <div className="col grow">
                {road.result.data.milestones.map((m) => (
                  <MilestoneRow
                    key={m.milestone}
                    state={{
                      milestone: m,
                      expanded: expanded[m.milestone] ?? false,
                      canConfirm,
                      busy: busy === m.milestone,
                      error: errors[m.milestone] ?? null,
                    }}
                    on={{
                      onToggle: () => setExpanded((prev) => ({ ...prev, [m.milestone]: !(prev[m.milestone] ?? false) })),
                      onConfirm: () => { if (m.confirmable) confirm(m.milestone, m.confirmable.id) },
                      onEvidence: setSelected,
                    }}
                  />
                ))}

                <OffRoadmap
                  events={road.result.data.off_roadmap}
                  total={road.result.data.off_roadmap_total}
                  expanded={offOpen}
                  onToggle={() => setOffOpen((v) => !v)}
                  onEvidence={setSelected}
                />
              </div>

              {selected === null
                ? null
                : <ProgressDrawer event={selected} onClose={() => setSelected(null)} />}
            </div>
          </>
        )
      ) : null}
    </>
  )
}
