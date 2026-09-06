import type { ReactNode } from 'react'

import { SYNC_STATUSES, type SyncStatus } from '@contextops/schema'

import type { DeviceSyncRow, VersionRow } from '../lib/web/queries'
import { sinceText } from '../lib/web/time'
import { SYNC_CHIP, SYNC_MEANING, SyncChip } from './chips'

// =====================================================================
//  화면 9 — Sync 가 그리는 조각들 (SPEC §9 화면 9 · §6 · DESIGN_BRIEF §4 「화면 9」)
//
//  ★ 왜 화면 밖으로 뺐나 — `roadmap.tsx`·`proposals.tsx` 와 같은 이유다: 훅이 없는
//    순수 함수라 **시험이 모든 모양을 그려서 마크업을 읽는다.** 브라우저가 없는 이
//    환경에서 눈 판정을 게이트로 올릴 수 있는 유일한 길이다 (`test/web-sync.test.ts`).
//
//  🔴 **이 화면이 `SYNC_CHIP` 5종을 처음으로 그리는 자리다** (FINDINGS 110).
//     표는 56바퀴까지 있었지만 **읽는 화면이 0곳**이라 아무 일도 안 했다 —
//     이 저장소가 매 바퀴 찾는 「정의만 있고 아무 일도 안 하는 것」의 모양 그대로였다.
//
//  🔴 **「실시간」이라는 낱말이 이 파일에 없다** (SPEC §6). 시각은 전부 `sinceText` 를
//     지나 「8분 전」이 되고, 상태 옆에는 늘 **그 상태를 말한 보고의 시각**이 붙는다.
//
//  ⚠ **P5 와 헷갈리지 마라.** 여기 사람 이름이 있는 이유는 「어느 팀원의 노트북이 낡은
//    규칙을 쓰고 있나」가 팀이 할 일을 정하는 사실이기 때문이다. 금지된 것은 개인
//    생산성 점수·순위다 — 여기에 「이번 주 sync 횟수」류를 더하면 그때가 P5 위반이다.
// =====================================================================

// ---------------------------------------------------------------------
//  상태별 표 둘 — **더하는 자리는 여기 두 줄이다**
//
//  ★ 새 SyncStatus 를 하나 더하려면: ① `packages/schema` 의 `SYNC_STATUSES`
//    ② `components/chips.tsx` 의 `SYNC_CHIP` ③ 아래 `SYNC_ORDER` ④ 아래 `SYNC_APPLY`
//    ⑤ `test/web-tables.test.ts` 의 표 시험. `Record<SyncStatus, …>` 라서 하나라도
//    빠지면 **타입 검사가 먼저 막는다** — 화면을 고칠 일은 없다.
// ---------------------------------------------------------------------

/**
 * 표의 기본 차례 — **사람이 할 일이 있는 것부터** (DESIGN_BRIEF §4 화면 9
 * 「정렬 기본: 상태(outdated 먼저)」).
 *
 * ★ 왜 이 차례인가 — 위에서부터 「낡은 규칙을 쓰고 있다(outdated)」 →
 *   「공식본을 손으로 고쳤다(modified)」 → 「한 번도 안 왔다(unknown)」 →
 *   「zip 으로 붙였다(manual)」 → 「맞다(applied)」다. 앞의 셋은 **그 기기가 지금 다른
 *   규칙으로 일하고 있다**는 뜻이고, 뒤의 둘은 그렇지 않다.
 * ★ 왜 서버가 안 세나 — 라우트는 이름 순으로 낸다(안정적이다). 「무엇이 급한가」는
 *   보는 화면의 기본값이지 데이터의 성질이 아니라서, 서버가 정하면 다른 화면이 다른
 *   차례로 보고 싶을 때 되돌릴 수 없다.
 */
export const SYNC_ORDER: Record<SyncStatus, number> = {
  outdated: 0,
  modified: 1,
  unknown: 2,
  manual: 3,
  applied: 4,
}

/**
 * 「적용 방식」 칸 (DESIGN_BRIEF §4 화면 9 「적용 방식(플러그인/zip 수동)」).
 *
 * 🔴 **없는 것을 지어내지 않는다.** 보고가 없는 기기(`unknown`)는 **어떻게 적용했는지도
 *   모른다** — 거기에 「플러그인」이라고 적으면 화면이 사실이 아닌 것을 말한다.
 * ★ 왜 별도의 DB 칸이 아닌가 — `manual` 이 곧 「zip 수동 적용」이다 (SPEC §6). 방식을
 *   따로 담는 칸을 만들면 상태와 방식이 갈릴 수 있고(=`applied` 인데 방식이 `manual`),
 *   그러면 어느 쪽이 참인지 정할 방법이 없다.
 */
export const SYNC_APPLY: Record<SyncStatus, string> = {
  applied: '플러그인',
  outdated: '플러그인',
  modified: '플러그인',
  manual: 'zip 수동',
  unknown: '—',
}

/** 화면 기본 차례로 세운 사본 — 같은 상태끼리는 기기 이름 순이다(같은 입력 → 같은 차례). */
export function sortDevices(devices: readonly DeviceSyncRow[]): DeviceSyncRow[] {
  return [...devices].sort((a, b) => {
    const byStatus = SYNC_ORDER[a.status] - SYNC_ORDER[b.status]
    return byStatus !== 0 ? byStatus : a.device_name.localeCompare(b.device_name)
  })
}

/** 상태별 기기 수 — 화면 위쪽의 「applied 9 · outdated 2 · manual 1」이 이것이다. */
export function countByStatus(devices: readonly DeviceSyncRow[]): Record<SyncStatus, number> {
  const counts = Object.fromEntries(SYNC_STATUSES.map((s) => [s, 0])) as Record<SyncStatus, number>
  for (const d of devices) counts[d.status] += 1
  return counts
}

/**
 * 「이 Pack 을 받은 기기 9 / 12」(DESIGN_BRIEF §4 화면 7 상단 우측).
 *
 * ★ 「받았다」의 기준은 **보고한 manifest_hash 가 이 Pack 의 것인가** 하나다 — 상태를 안 본다.
 *   `modified` 도 받은 뒤 손으로 고친 것이고, `manual` 도 받은 것이다. 상태로 세면
 *   「받았는데 안 받은 것으로 세는」 갈래가 생기고 그 규칙이 화면 9 와 갈린다.
 * ⚠ 보고가 없는 기기(`manifest_hash: null`)는 못 센다 — 지어내지 않는다.
 */
export function countReceived(devices: readonly DeviceSyncRow[], manifestHash: string): number {
  return devices.filter((d) => d.manifest_hash === manifestHash).length
}

// ---------------------------------------------------------------------
//  요약 — 0 인 상태는 그리지 않는다
// ---------------------------------------------------------------------

/**
 * 「그래서 무엇으로 맞춰야 하나」— 요약 맨 앞의 한 칸 (FINDINGS 118).
 *
 * ★ 왜 여기인가 — 표는 기기마다 `v1.1.0 · outdated` 를 그리지만, **공식이 지금 무엇인지**가
 *   없으면 사람은 「낡았다」까지만 알고 다음 걸음을 모른다. 화면 8 의 요약 타일이 적는
 *   `공식 v1.0.0 기준` 과 **같은 낱말**이다 — 두 화면이 다른 말을 하지 않게.
 * ★ 왜 화면이 `fetchVersions()` 를 한 번 더 부르나 — sync-status 응답에 넣으면 기기 목록
 *   라우트가 버전 표까지 알게 된다(대장의 「고르지 마라」). 문은 이미 있다.
 * 🔴 없는 것을 지어내지 않는다 — 공식이 없으면 `v—` 가 아니라 **없다고** 말하고, 아직 못
 *   읽었으면 아무것도 안 적는다(`undefined`). `null` 과 `undefined` 가 여기서 다른 뜻이다.
 */
export const OFFICIAL_HINT = {
  of: (semver: string) => `공식 v${semver} 기준`,
  none: '아직 발행된 버전이 없습니다.',
} as const

export function officialOf(versions: readonly VersionRow[]): VersionRow | null {
  return versions.find((v) => v.is_official) ?? null
}

export function SyncSummary({
  devices,
  official,
}: {
  devices: readonly DeviceSyncRow[]
  /** `undefined` = 아직 못 읽었다(아무것도 안 그린다) · `null` = 공식이 없다. */
  official?: VersionRow | null
}) {
  const counts = countByStatus(devices)
  //  ⚠ 0 인 상태를 칩으로 그리지 않는다 — 다섯 칩이 늘 서 있으면 사람은 어느 것이 지금
  //    있는 일인지 못 고른다 (화면 8 의 「열린 충돌 0」과 다르다: 저건 **하나뿐인 수**라
  //    0 도 「셌다」는 뜻이 되지만, 여기서는 다섯 칸 중 하나다).
  const present = SYNC_STATUSES.filter((s) => counts[s] > 0)
  return (
    <div className="row wrap">
      {official === undefined
        ? null
        : official === null
          ? <span className="meta">{OFFICIAL_HINT.none}</span>
          : <span className="mono ink" title={official.snapshot_hash}>{OFFICIAL_HINT.of(official.semver)}</span>}
      <span className="label">기기 {devices.length}</span>
      {present.map((s) => (
        <span key={s} className="row">
          <SyncChip status={s} />
          <span className="mono ink">{counts[s]}</span>
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------
//  표 (DESIGN_BRIEF §4 화면 9 「팀원 | 기기 | 버전 | 상태 | 마지막 보고 | 적용 방식」)
// ---------------------------------------------------------------------

export function DeviceTable({
  devices,
  empty,
  now,
}: {
  devices: readonly DeviceSyncRow[]
  /** 빈 자리는 `ScreenEmpty` 가 그린다 — 문구·다음 행동의 정본은 `EMPTY_PLACES` 다 (FINDINGS 133). */
  empty: ReactNode
  /** 시험이 시계를 고정하려고 넣는다. 화면은 안 넘긴다. */
  now?: Date
}) {
  if (devices.length === 0) return <>{empty}</>
  return (
    <div className="scroll-x">
      <table className="table">
        <thead>
          <tr>
            <th>팀원</th>
            <th>기기</th>
            <th>버전</th>
            <th>상태</th>
            <th>마지막 보고</th>
            <th>적용 방식</th>
          </tr>
        </thead>
        <tbody>
          {sortDevices(devices).map((d) => (
            <tr key={d.device_id}>
              <td className="ink">{d.user.name}</td>
              <td className="mono">{d.device_name}</td>
              {/* 🔴 버전을 못 들었으면 「—」다. `v0.0.0` 같은 기본값을 채우지 않는다 —
                  「아직 아무것도 안 받은 기기」가 「낡은 버전을 쓰는 기기」로 보인다. */}
              <td className="mono">
                {d.version === null ? <span aria-hidden="true" className="ink-4">—</span> : `v${d.version}`}
              </td>
              <td><SyncChip status={d.status} /></td>
              {/* 🔴 상태 옆에는 늘 **그 상태를 말한 보고의 시각**이 붙는다 (SPEC §6). */}
              <td className="mono">
                {d.reported_at === null
                  ? <span className="ink-3">아직 보고가 없습니다</span>
                  : sinceText(d.reported_at, now)}
              </td>
              <td>{SYNC_APPLY[d.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 표 아래 각주 — 칩의 뜻을 색이 아니라 **글자로** 한 번 더 적는다 (DESIGN_BRIEF §2-4
 * 「상태를 색만으로 구분하지 않는다」). 툴팁은 마우스가 있어야 보이고, 발표 영상에는
 * 안 나온다 — 그래서 같은 문장이 화면에도 한 번 있어야 한다.
 */
export function SyncLegend() {
  return (
    <p className="meta">
      {SYNC_STATUSES.map((s) => `${SYNC_CHIP[s].label} = ${SYNC_MEANING[s]}`).join(' · ')}
    </p>
  )
}
