'use client'

import { use, useEffect, useState } from 'react'

import {
  REALTIME_POLL_MS, createDeviceToken, fetchSyncStatus, fetchVersions, type ProjectRef,
} from '../../../../../../lib/web/queries'
import { writeDoor } from '../../../../../../lib/web/actor'
import { useAsync, usePolling } from '../../../../../../lib/web/use-async'
import { ProjectGate } from '../../../../../../components/project-gate'
import {
  AddDevice, DeviceTable, SyncLegend, SyncSummary, officialOf,
  type AddDeviceState, type CopiedWhat,
} from '../../../../../../components/sync'
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
//  🔴 **이 화면의 accent 는 [기기 추가] 하나다** (DESIGN_BRIEF §3 「화면당 주요 액션
//     하나」 · FINDINGS 36). 106바퀴 전에는 accent 가 하나도 없었다 — 「읽는 화면」이라서
//     맞다고 적어 뒀는데, 그 사이 `contextops setup` 이 가리키는 **토큰 발급 화면이
//     없다**는 것이 대장에 있었다. 그 문이 들어올 자리가 여기다. 다른 accent 를 더하지 마라.
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

  // ── 기기 추가 (FINDINGS 36) ────────────────────────────────────
  //  🔴 상태를 **여기서만** 든다 — 그리는 것은 `AddDevice` 다. 그래야 시험이 네 모양을
  //     브라우저 없이 다 그려서 읽는다 (`components/sync.tsx` 머리의 ★).
  //  🔴 발급된 토큰은 이 상태 말고 어디에도 안 남는다 — `localStorage` 도, 주소도,
  //     로그도 아니다 (P1 · SPEC §11). [닫기] 를 누르면 그대로 사라진다.
  const [add, setAdd] = useState<AddDeviceState>({ kind: 'closed' })
  //  ⚠ `window` 는 프리렌더에 없다. 칸이 열리기 전에 효과가 먼저 돌아서 사람이 보는
  //    한 줄에는 늘 값이 들어 있다.
  const [apiOrigin, setApiOrigin] = useState('')
  useEffect(() => setApiOrigin(window.location.origin), [])

  async function issue(name: string): Promise<void> {
    setAdd({ kind: 'form', name, busy: true, error: null })
    try {
      const issued = await createDeviceToken(project.id, name.trim())
      setAdd({ kind: 'issued', issued, copied: null })
      //  새 기기는 아직 보고가 없다 — 표에 `unknown` 한 줄로 선다.
      sync.reload()
    } catch (error) {
      setAdd({ kind: 'form', name, busy: false, error })
    }
  }

  function copy(what: Exclude<CopiedWhat, null>, text: string): void {
    //  ⚠ 실패해도 아무 말도 하지 않는다 — 값은 화면에 그대로 있고, 사람은 긁어서 복사한다.
    //    「복사 실패」 배너를 띄우면 브라우저 권한 이야기가 이 칸의 주제가 된다.
    void navigator.clipboard?.writeText(text).catch(() => undefined)
    setAdd((prev) => (prev.kind === 'issued' ? { ...prev, copied: what } : prev))
  }

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

      {/*  🔴 게스트는 누른 뒤가 아니라 **누른 자리에서** 이유를 듣는다 (FINDINGS 135) —
           판정은 `writeDoor()` 표에서 오고, 화면이 `session.guest` 를 다시 읽지 않는다. */}
      <AddDevice
        state={add}
        apiOrigin={apiOrigin}
        projectId={project.id}
        on={{
          open: () => {
            const door = writeDoor()
            setAdd(door.open ? { kind: 'form', name: '', busy: false, error: null } : { kind: 'denied', reason: door.reason })
          },
          close: () => setAdd({ kind: 'closed' }),
          name: (name) => setAdd((prev) => (prev.kind === 'form' ? { ...prev, name } : prev)),
          submit: () => { if (add.kind === 'form' && !add.busy) void issue(add.name) },
          copy,
        }}
      />

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
