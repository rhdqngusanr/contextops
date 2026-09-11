import type { ReactNode } from 'react'

import { SYNC_STATUSES, setupCommandLine, type SyncStatus } from '@contextops/schema'

import type { DeviceSyncRow, IssuedDevice, VersionRow } from '../lib/web/queries'
import { dateText, sinceText } from '../lib/web/time'
import { SYNC_CHIP, SYNC_MEANING, SyncChip, Note } from './chips'
import { FactLine, syncFact } from './fact-line'
import { ScrollTable } from './scroll-table'
import { ErrorState, ReadOnlyNotice } from './states'

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
 * 「적용 방식」 칸 — 그 기기가 파일을 **어떻게 받았나**를 문장으로 (DESIGN_BRIEF §4 화면 9).
 *
 * ★ 값이 낱말이 아니라 문장인 이유 (2026-09-11) — 「플러그인」「zip 수동」은 낱말 둘을 붙인
 *   약어라 비개발자에게 무엇이 일어났는지 말하지 않았다. 「플러그인이 받음」「zip 을 손으로 풂」은
 *   읽으면 그림이 그려진다.
 * 🔴 **없는 것을 지어내지 않는다.** 보고가 없는 기기(`unknown`)는 **어떻게 적용했는지도
 *   모른다** — 거기에 「플러그인이 받음」이라고 적으면 화면이 사실이 아닌 것을 말한다.
 * ★ 왜 별도의 DB 칸이 아닌가 — `manual` 이 곧 「zip 수동 적용」이다 (SPEC §6). 방식을
 *   따로 담는 칸을 만들면 상태와 방식이 갈릴 수 있고(=`applied` 인데 방식이 `manual`),
 *   그러면 어느 쪽이 참인지 정할 방법이 없다.
 */
export const SYNC_APPLY: Record<SyncStatus, string> = {
  applied: '플러그인이 받음',
  outdated: '플러그인이 받음',
  modified: '플러그인이 받음',
  manual: 'zip 을 손으로 풂',
  unknown: '—',
}

/** 화면 기본 차례로 세운 사본 — 같은 상태끼리는 기기 이름 순이다(같은 입력 → 같은 차례). */
export function sortDevices(devices: readonly DeviceSyncRow[]): DeviceSyncRow[] {
  return [...devices].sort((a, b) => {
    const byStatus = SYNC_ORDER[a.status] - SYNC_ORDER[b.status]
    return byStatus !== 0 ? byStatus : a.device_name.localeCompare(b.device_name)
  })
}

/** 상태별 기기 수 — 요약의 사실 한 줄(「기기 14대 중 9대가 …」)과 다음 걸음이 이것을 읽는다. */
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

/**
 * 「그래서 어떻게 하면 고쳐지나」 — 요약의 사실 한 줄 바로 밑 (2026-09-11).
 *
 * ★ 왜 — 이 화면은 읽는 화면이라 버튼이 없는 것이 맞지만, 그러면 문장이 그 자리를 채워야
 *   한다. 비개발자 팀장은 「옛 버전 2대」를 보고 자기가 뭘 눌러야 하는지, 팀원이 뭘 해야
 *   하는지 모른다. 낱말은 칩 표에서 오고, 명령은 실재한다(`plugin/contextops/skills/sync`).
 * 🔴 손으로 고친 파일을 말없이 덮지 않는다 — Skill 이 **먼저 묻고**, 덮어도 백업을 남긴다.
 *   여기 문장이 그 순서와 달라지면 화면이 거짓말을 한다.
 * ⚠ 볼 것이 없으면(옛 버전·손으로 고침·보고 없음이 전부 0) 그리지 않는다 — 0 은 안 적는 규칙.
 */
export const SYNC_NEXT_STEP = `「${SYNC_CHIP.outdated.label}」·「${SYNC_CHIP.modified.label}」 기기는 그 팀원이 Claude Code 에서 /contextops:sync 를 실행하면 공식 판으로 맞춰집니다 — 손으로 고친 파일은 덮을지 먼저 묻고, 덮어도 백업을 남깁니다. 「${SYNC_CHIP.unknown.label}」 기기는 처음 실행한 뒤부터 상태가 보입니다.`

export function SyncSummary({
  devices,
  official,
}: {
  devices: readonly DeviceSyncRow[]
  /** `undefined` = 아직 못 읽었다(아무것도 안 그린다) · `null` = 공식이 없다. */
  official?: VersionRow | null
}) {
  const counts = countByStatus(devices)
  //  ⚠ 상태별 칩 줄(「기기 14 · 적용됨 9 · …」)은 지웠다 (2026-09-11) — 바로 밑의 사실 한 줄이
  //    같은 다섯 수를 이미 말해서, 두 줄이 겹치면 사람은 다른 것을 세는 줄인 줄 알고 차이를 찾는다.
  //    0 인 상태를 안 적는 규칙은 `syncFact` 가 그대로 지킨다.
  const needsStep = counts.outdated + counts.modified + counts.unknown > 0
  return (
    <div className="col-tight">
      <div className="row wrap">
        {official === undefined
          ? null
          : official === null
            ? <span className="meta">{OFFICIAL_HINT.none}</span>
            : <span className="mono ink" title={official.snapshot_hash}>{OFFICIAL_HINT.of(official.semver)}</span>}
      </div>
      {/* 사실 한 줄 (2026-09-11) — 표보다 먼저 「14대 중 9대가 「적용됨」」이 읽힌다. 문장의 정본은 `fact-line.tsx`. */}
      <FactLine parts={syncFact(devices.map((d) => d.status))} />
      {/* 다음 걸음 — 볼 것이 있을 때만 (0 은 안 적는다). */}
      {needsStep ? <p className="meta">{SYNC_NEXT_STEP}</p> : null}
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
    <ScrollTable>
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
          {/* 볼 것이 있는 행(옛 판 · 손으로 고침)은 왼쪽 주황 괘선 — 칩의 tone 이 정한다 (2026-09-11). */}
          {sortDevices(devices).map((d) => (
            <tr key={d.device_id} data-tone={SYNC_CHIP[d.status].tone === 'warn' ? 'warn' : undefined}>
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
    </ScrollTable>
  )
}

/**
 * 표 아래 각주 — 칩의 뜻을 색이 아니라 **글자로** 한 번 더 적는다 (DESIGN_BRIEF §2-4
 * 「상태를 색만으로 구분하지 않는다」). 툴팁은 마우스가 있어야 보이고, 발표 영상에는
 * 안 나온다 — 그래서 같은 문장이 화면에도 한 번 있어야 한다.
 *
 * ★ 왜 `dl` 인가 (2026-09-11) — 한 문단에 다섯 정의를 `=` 로 이어 붙이면 「옛 버전」 하나만
 *   찾아 읽을 수 없고, 표의 칩(색점+글자)과 모양이 달라 같은 것인지 눈으로 못 잇는다.
 *   왼쪽에 표와 **같은 칩**, 오른쪽에 뜻 — 격자는 `globals.css` 의 `.legend` 다.
 */
export function SyncLegend() {
  return (
    <dl className="legend">
      {SYNC_STATUSES.map((s) => (
        <div key={s}>
          <dt><SyncChip status={s} /></dt>
          <dd className="meta">{SYNC_MEANING[s]}</dd>
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------------
//  기기 추가 — `setup` 이 가리키던 **없던 화면** (FINDINGS 36 · SPEC §8.3 · §9 화면 9)
//
//  ★ 무엇이 고장이었나 — `contextops setup` 은 「브라우저에서 기기 토큰을 발급받아
//    붙여 넣어라」고 안내하는데 **웹에 그 화면이 없었다.** 토큰을 만드는 길은
//    `POST /projects/{id}/tokens` 를 손으로 부르는 것뿐이었고, 관통조차 `node -e` 로
//    그 라우트를 직접 쳤다. 안내가 가리키는 곳에 아무것도 없는 것이 이 항목이다.
//
//  🔴 **한 줄을 통째로 복사하게 한다.** uuid 둘과 토큰을 사람이 손으로 옮기면 반드시
//     하나를 흘리고, 그 증상은 며칠 뒤 `sync` 의 401 로 나온다. 그리고 그렇게 옮기면
//     `device_id` 가 늘 빠져서(그 값은 발급 응답에만 있다) 「이 기기만 끊기」가 영원히
//     안 된다 — 한 줄로 주면 그 값이 저절로 따라간다.
//  🔴 **줄의 정본은 `packages/schema` 의 `setupCommandLine` 하나다** — 만드는 쪽(여기)과
//     받는 쪽(CLI)이 다른 패키지라, 여기서 플래그 이름을 손으로 적으면 갈린다.
//
//  ⚠ 이 화면의 **accent 는 이제 [기기 추가] 하나**다 (DESIGN_BRIEF §3 「화면당 주요
//    액션 하나」). 다른 accent 를 여기 더하지 마라.
//  ⚠ 훅이 없다 — 상태는 화면(`sync/page.tsx`)이 들고, 여기는 **네 모양을 그리기만**
//    한다. 그래야 시험이 네 모양을 다 그려서 읽는다 (이 파일 머리의 ★ 와 같은 이유).
// ---------------------------------------------------------------------

/**
 * 이 칸의 **문구 정본**. 화면이 문장을 손으로 적지 않는다 — 두 곳에 적히면 한쪽만
 * 고쳐지고, 그때 화면과 시험이 서로 다른 말을 검사한다.
 */
export const ADD_DEVICE = {
  section: '기기 추가',
  open: '기기 추가',
  cancel: '닫기',
  /** 버튼 옆 한 줄 — 누르면 **무슨 일이 일어나는지**를 누르기 전에 말한다. 게스트를 포함해 누구나
   *  보는 자리라 「토큰」「발급」은 카드 안(개발자만 여는 자리)에만 둔다 (2026-09-11). */
  why: '팀원의 새 기기를 이 프로젝트에 연결합니다 — 개발자가 Claude Code 에 붙여넣을 한 줄이 나옵니다.',
  nameLabel: '기기 이름',
  namePlaceholder: 'mac-노트북',
  nameHint: '나중에 Sync 표에서 이 이름으로 보입니다.',
  submit: '토큰 발급',
  busy: '발급하는 중입니다…',
  issuedTitle: '발급된 기기 토큰',
  tokenLabel: '기기 토큰',
  //  🔴 이 문장이 이 칸의 전부다 — 「한 번뿐」을 말 안 하면 사람은 나중에 다시 찾으러 온다.
  once: '이 토큰은 지금 한 번만 보입니다. 서버에는 해시만 남아서 다시 볼 수 없습니다 — 잃어버리면 새로 발급받으세요.',
  //  🔴 붙여 넣는 자리는 터미널이 아니라 **Claude Code** 다 — 머리가 `/contextops:setup` Skill 이고, 그 Skill 이
  //     플러그인 CLI 의 경로를 채워 `setup` 을 부른다 (사용자 터미널에는 그 경로가 없다 · 2026-09-09).
  commandLead: '그 저장소에서 Claude Code 를 열고 이 한 줄을 그대로 붙여넣으세요.',
  copyToken: '토큰 복사',
  copyCommand: '명령 한 줄 복사',
  copied: '복사했습니다',
  expires: (day: string) => `만료 ${day}`,
  done: '닫기',
  /** 닫은 뒤 무엇이 달라지나 — 새 기기는 아직 보고가 없어서 `unknown` 으로 선다. */
  after: '닫으면 위 표에 그 기기가 「보고 없음」으로 섭니다.',
} as const

/** 복사 버튼이 방금 무엇을 복사했나 — `null` 이면 아무것도 안 눌렀다. */
export type CopiedWhat = 'token' | 'command' | null

/**
 * 이 칸의 **네 모양**. 화면이 이 넷 중 하나를 들고 있고, 여기는 그리기만 한다.
 * ★ 모양을 더하려면 여기 한 줄 + 아래 `AddDevice` 의 갈래 + 시험 —
 *   유니온이라 갈래를 빠뜨리면 타입이 먼저 막는다.
 */
export type AddDeviceState =
  | { kind: 'closed' }
  /** 게스트가 눌렀다 — 문의 판정은 `writeDoor()` 표에서 온다 (FINDINGS 135). */
  | { kind: 'denied'; reason: string }
  | { kind: 'form'; name: string; busy: boolean; error: unknown }
  | { kind: 'issued'; issued: IssuedDevice; copied: CopiedWhat }

export type AddDeviceHandlers = {
  open: () => void
  close: () => void
  name: (value: string) => void
  submit: () => void
  copy: (what: Exclude<CopiedWhat, null>, text: string) => void
}

export function AddDevice({
  state,
  apiOrigin,
  projectId,
  on,
}: {
  state: AddDeviceState
  /** `window.location.origin` — CLI 가 서버 주소로 받는 그 값이다 (`ApiOrigin`). */
  apiOrigin: string
  projectId: string
  on: AddDeviceHandlers
}) {
  const closed = state.kind === 'closed'
  //  🔴 발급된 뒤에는 이 줄을 그리지 않는다 — 카드가 자기 [닫기] 를 들고 있어서
  //     같은 일을 하는 버튼이 한 화면에 둘이 됐다 (106바퀴 캡처에서 눈으로 봤다).
  const toggle = state.kind !== 'issued'
  return (
    <section className="col" aria-label={ADD_DEVICE.section}>
      {toggle ? (
        <div className="row wrap">
          <button
            type="button"
            className={closed ? 'btn btn-primary' : 'btn'}
            aria-expanded={!closed}
            onClick={closed ? on.open : on.close}
          >
            {closed ? ADD_DEVICE.open : ADD_DEVICE.cancel}
          </button>
          {/*  ⚠ 무엇을 발급하는지는 **누르기 전에만** 말한다. 열린 뒤에도 계속 있으면
              카드가 같은 말을 두 번 하는 화면이 된다. */}
          {closed ? <span className="meta">{ADD_DEVICE.why}</span> : null}
        </div>
      ) : null}

      {state.kind === 'denied' ? <ReadOnlyNotice reason={state.reason} onClose={on.close} /> : null}

      {state.kind === 'form' ? (
        <div className="card pad col">
          <div className="field">
            <label className="label" htmlFor="add-device-name">{ADD_DEVICE.nameLabel}</label>
            <input
              id="add-device-name"
              className="input"
              value={state.name}
              maxLength={100}
              placeholder={ADD_DEVICE.namePlaceholder}
              onChange={(e) => on.name(e.target.value)}
            />
            <span className="meta">{ADD_DEVICE.nameHint}</span>
          </div>
          {state.error === null ? null : <ErrorState error={state.error} />}
          <div className="row wrap">
            {/*  ⚠ 여기는 accent 가 아니다 — 이 화면의 하나는 위의 [기기 추가] 다. */}
            <button
              type="button"
              className="btn"
              disabled={state.busy || state.name.trim().length === 0}
              onClick={on.submit}
            >
              {ADD_DEVICE.submit}
            </button>
            {state.busy ? <span className="meta">{ADD_DEVICE.busy}</span> : null}
          </div>
        </div>
      ) : null}

      {state.kind === 'issued'
        ? <IssuedDeviceCard issued={state.issued} apiOrigin={apiOrigin} projectId={projectId} copied={state.copied} on={on} />
        : null}
    </section>
  )
}

/**
 * 발급 직후 **한 번만 보이는 값**과 그 아래 통째로 복사하는 한 줄.
 * ⚠ 값을 `title` 이나 링크에 넣지 마라 — 토큰이 브라우저 기록에 남는다.
 */
export function IssuedDeviceCard({
  issued,
  apiOrigin,
  projectId,
  copied,
  on,
}: {
  issued: IssuedDevice
  apiOrigin: string
  projectId: string
  copied: CopiedWhat
  on: Pick<AddDeviceHandlers, 'close' | 'copy'>
}) {
  //  🔴 플래그 이름을 여기서 짓지 않는다 — 정본은 `packages/schema` 하나다.
  const command = setupCommandLine({
    api_origin: apiOrigin,
    project_id: projectId,
    token: issued.token,
    device_id: issued.device_id,
  })
  return (
    <div className="card pad col" aria-label={ADD_DEVICE.issuedTitle}>
      {/*  색점 + 글자 — 상태를 색만으로 말하지 않는다 (DESIGN_BRIEF §2-4). */}
      <Note tone="warn">{ADD_DEVICE.once}</Note>

      <div className="field">
        <span className="label">{ADD_DEVICE.tokenLabel}</span>
        <div className="row wrap">
          <input className="input mono grow" readOnly aria-label={ADD_DEVICE.tokenLabel} value={issued.token} />
          <button type="button" className="btn btn-sm" onClick={() => on.copy('token', issued.token)}>
            {copied === 'token' ? ADD_DEVICE.copied : ADD_DEVICE.copyToken}
          </button>
        </div>
      </div>

      <div className="col-tight">
        <span className="label">{ADD_DEVICE.commandLead}</span>
        {/*  ⚠ 긴 한 줄이다 — 본문을 가로로 밀지 않게 자기 칸 안에서만 넘친다 (⑦3층). */}
        <div className="scroll-x"><code className="mono">{command}</code></div>
        <div className="row wrap">
          <button type="button" className="btn btn-sm" onClick={() => on.copy('command', command)}>
            {copied === 'command' ? ADD_DEVICE.copied : ADD_DEVICE.copyCommand}
          </button>
          <span className="meta mono">{ADD_DEVICE.expires(dateText(issued.expires_at))}</span>
        </div>
      </div>

      <div className="row wrap">
        <button type="button" className="btn" onClick={on.close}>{ADD_DEVICE.done}</button>
        <span className="meta">{ADD_DEVICE.after}</span>
      </div>
    </div>
  )
}
