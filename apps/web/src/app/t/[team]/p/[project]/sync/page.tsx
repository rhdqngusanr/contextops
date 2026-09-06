'use client'

import { use } from 'react'

import {
  REALTIME_POLL_MS, fetchSyncStatus, fetchVersions, type ProjectRef,
} from '../../../../../../lib/web/queries'
import { useAsync, usePolling } from '../../../../../../lib/web/use-async'
import { ProjectGate } from '../../../../../../components/project-gate'
import { DeviceTable, SyncLegend, SyncSummary, officialOf } from '../../../../../../components/sync'
import { ErrorState, ScreenEmpty, Skeleton } from '../../../../../../components/states'

// =====================================================================
//  화면 9 — Sync (SPEC §9 화면 9 · §6 · DESIGN_BRIEF §4 「화면 9」)
//
//  ★ 이 화면이 답하는 질문은 하나다: **「지금 누가 낡은 규칙으로 일하고 있나」.**
//    Pack 을 발행해도 각 기기가 받아 가야 실제로 바뀌는데, 56바퀴까지는 그걸 볼
//    자리가 하나도 없었다 (FINDINGS 110 — `SYNC_CHIP` 5종이 아무 데도 안 그려졌다).
//
//  🔴 **「실시간」이 아니다** (SPEC §6). 이 표가 아는 것은 **각 기기의 마지막 보고**뿐이고,
//     그래서 상태 옆에는 늘 그 보고의 시각이 붙는다. 상단 안내 문장이 DESIGN_BRIEF §4
//     화면 9 가 정한 그 문장이다.
//
//  ⚠ **질의창(§7.3)은 여기 없다.** SPEC §14 의 절삭 순서 1번이고, 그것을 부르는 문
//    (`POST /projects/{id}/ask`)이 아직 없다 — 누르면 아무 일도 안 하는 입력칸을 두지
//    않는다. 표가 먼저다.
//  ⚠ accent 가 이 화면에 하나도 없다 (DESIGN_BRIEF §3 「화면당 주요 액션 하나」) —
//    이 화면에서 사람이 할 일은 **읽는 것**이고, 고치는 곳은 그 기기의 터미널이다.
// =====================================================================

export default function SyncPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const { team, project } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ project: p }) => <SyncView base={`/t/${team}/p/${project}`} project={p} />}
    </ProjectGate>
  )
}

function SyncView({ base, project }: { base: string; project: ProjectRef }) {
  //  ⚠ 화면 8 과 같은 폴링이다 — 끝나는 일이 아니라서 `again` 이 늘 같은 값이다
  //    (실패하면 `usePolling` 이 스스로 멈춘다).
  const sync = usePolling(() => fetchSyncStatus(project.id), [project.id], () => REALTIME_POLL_MS)
  //  🔴 「무엇으로 맞춰야 하나」(FINDINGS 118) — 화면 5 와 같은 문을 한 번 더 부른다.
  //    폴링이 아니다: 공식이 바뀌는 것은 발행이고, 그건 이 화면에서 일어나지 않는다.
  //    ⚠ 이 호출이 실패해도 표는 뜬다 — 공식 칸만 비운다(`undefined`). 기기 목록이
  //    버전 표 때문에 죽으면 안 된다.
  const versions = useAsync(() => fetchVersions(project.id), [project.id])
  const official = versions.result.state === 'ready' ? officialOf(versions.result.data.versions) : undefined

  return (
    <>
      <header className="col-tight">
        <h1 className="text-section">Sync</h1>
        {/* 🔴 DESIGN_BRIEF §4 화면 9 가 그대로 적어 둔 문장이다. 바꾸지 마라 —
            이 한 줄이 「이 표가 무엇을 모르는가」를 말한다. */}
        <p className="meta">
          상태는 각 기기의 <strong className="ink">마지막 보고</strong> 기준입니다. 실시간이 아닙니다.
          이 화면은 {REALTIME_POLL_MS / 1000}초마다 다시 읽습니다.
        </p>
      </header>

      {sync.result.state === 'loading' ? <Skeleton rows={5} /> : null}
      {sync.result.state === 'error' ? <ErrorState error={sync.result.error} retry={sync.reload} /> : null}

      {sync.result.state === 'ready' ? (
        <>
          <SyncSummary devices={sync.result.data.devices} official={official} />
          <section className="card">
            <DeviceTable
              devices={sync.result.data.devices}
              empty={<ScreenEmpty slot="sync.devices" base={base} />}
            />
          </section>
          <SyncLegend />
        </>
      ) : null}
    </>
  )
}
