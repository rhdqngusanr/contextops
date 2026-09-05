import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SYNC_STATUSES, type SyncStatus } from '@contextops/schema'

import { DeviceTable, SYNC_APPLY, SYNC_ORDER, SyncLegend, SyncSummary, countByStatus, sortDevices } from '../src/components/sync'
import { SYNC_CHIP, SYNC_MEANING } from '../src/components/chips'
import type { DeviceSyncRow } from '../src/lib/web/queries'

// =====================================================================
//  🔴 화면 9(Sync)의 **모든 모양을 그려서 읽는다** (loop/PROMPT.md ⑦3층)
//
//  ★ 왜 — 브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 「한 번도 보고하지 않은
//    기기」「zip 으로 붙인 기기」「공식본을 손으로 고친 기기」는 사람이 만들기 어려운
//    상태라, 그냥 두면 **아무도 본 적 없는 채로** 배포된다.
//
//  재는 것:
//    ① 🔴 상태 5종이 **전부 실제로 화면에 나온다** — 이게 FINDINGS 110 의 본체다
//      (표는 있었지만 그리는 화면이 0곳이었다 · ④2-B)
//    ② 🔴 **「실시간」이라는 낱말이 없다** (SPEC §6) — 화면이 말하는 것은 늘 마지막 보고다
//    ③ 없는 것을 지어내지 않는다 — 보고가 없으면 버전도 시각도 적용 방식도 「모른다」다
//    ④ 상태를 **색만으로** 구분하지 않는다 — 각주가 다섯 상태의 뜻을 글자로 적는다
//    ⑤ 급한 것이 위다 (`SYNC_ORDER` — DESIGN_BRIEF §4 「정렬 기본: outdated 먼저」)
//    ⑥ 🔴 **P1** — 표에 파일 본문이 없다. 기기가 보낸 것은 경로와 해시뿐이다
//    ⑦ ⚠ **P5 의 경계** — 사람 **이름**은 그린다(팀이 할 일을 정하는 사실이다).
//      「횟수·점수·순위」는 안 그린다
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴. 그건 캡처가 있어야 한다.
// =====================================================================

/** 시계를 고정한다 — 「8분 전」이 매일 갈리면 시험이 아니라 달력이 된다. */
const NOW = new Date('2026-09-06T12:00:00.000Z')
const MINUTES_AGO = new Date(NOW.getTime() - 8 * 60_000).toISOString()
const DAYS_AGO = new Date(NOW.getTime() - 4 * 86_400_000).toISOString()

function device(overrides: Partial<DeviceSyncRow> = {}): DeviceSyncRow {
  return {
    device_id: '00000000-0000-4000-8000-000000000001',
    device_name: 'mac-노트북',
    user: { id: '00000000-0000-4000-8000-0000000000aa', name: '김결제' },
    status: 'applied',
    version: '1.2.0',
    manifest_hash: 'a'.repeat(64),
    reported_at: MINUTES_AGO,
    ...overrides,
  }
}

/** 5종을 한 줄씩 — 「그 상태인 기기가 실제로 있는 표」를 만든다. */
function oneOfEach(): DeviceSyncRow[] {
  return SYNC_STATUSES.map((status, i) => device({
    device_id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    device_name: `기기-${status}`,
    user: { id: `00000000-0000-4000-8000-0000000000b${i}`, name: `팀원${i}` },
    status,
    version: status === 'unknown' ? null : '1.2.0',
    manifest_hash: status === 'unknown' ? null : 'a'.repeat(64),
    reported_at: status === 'unknown' ? null : MINUTES_AGO,
  }))
}

function table(devices: readonly DeviceSyncRow[], now: Date = NOW): string {
  return renderToStaticMarkup(createElement(DeviceTable, { devices, emptyMessage: '아직 등록된 기기가 없습니다.', now }))
}

describe('🔴 상태 5종이 전부 화면에 나온다 (FINDINGS 110 · ④2-B)', () => {
  it('다섯 상태의 칩이 표에 그려진다 — 표만 있고 그리는 자리가 없던 것이 고장이었다', () => {
    const html = table(oneOfEach())
    for (const status of SYNC_STATUSES) {
      expect(html, `${status} 칩이 표에 없다`).toContain(SYNC_CHIP[status].label)
      expect(html, `${status} 아이콘이 표에 없다`).toContain(SYNC_CHIP[status].icon)
    }
  })

  it('상태마다 「적용 방식」이 갈린다 — 값을 바꾸면 결과가 달라진다', () => {
    const manual = table([device({ status: 'manual' })])
    const applied = table([device({ status: 'applied' })])
    expect(manual).toContain('zip 수동')
    expect(applied).toContain('플러그인')
    expect(applied).not.toContain('zip 수동')
  })

  it('요약은 **있는 상태만** 센다 — 0인 칸을 다섯 개 세워 두지 않는다', () => {
    const html = renderToStaticMarkup(createElement(SyncSummary, {
      devices: [device({ status: 'applied' }), device({ status: 'applied' }), device({ status: 'outdated' })],
    }))
    expect(html).toContain('기기 3')
    expect(html).toContain(SYNC_CHIP.applied.label)
    expect(html).toContain(SYNC_CHIP.outdated.label)
    expect(html).not.toContain(SYNC_CHIP.modified.label)
  })
})

describe('🔴 「실시간」이라고 말하지 않는다 (SPEC §6)', () => {
  it('표 어디에도 「실시간」이 없고, 상태 옆에는 보고 시각이 붙는다', () => {
    const html = table([device({ reported_at: MINUTES_AGO })])
    expect(html).not.toContain('실시간')
    expect(html).not.toContain('offline')
    expect(html).toContain('8분 전')
  })

  it('보고가 오래된 기기는 「4일 전」이다 — 절대 시각을 그리지 않는다', () => {
    const html = table([device({ status: 'outdated', version: '1.1.0', reported_at: DAYS_AGO })])
    expect(html).toContain('4일 전')
    expect(html).not.toContain('2026-09-02')
  })
})

describe('🔴 없는 것을 지어내지 않는다', () => {
  it('보고가 없는 기기는 버전도 시각도 적용 방식도 「모른다」로 나온다', () => {
    const html = table([device({ status: 'unknown', version: null, manifest_hash: null, reported_at: null })])
    //  DESIGN_BRIEF §5 의 문장 그대로 — 「offline」이라고 쓰지 않는다.
    expect(html).toContain('아직 보고가 없습니다')
    //  v0.0.0 같은 기본값을 채우면 「낡은 버전을 쓰는 기기」로 보인다.
    expect(html).not.toContain('v0.0.0')
    expect(html).not.toContain('v1.2.0')
    //  적용 방식도 모른다 — 「플러그인」이라고 적으면 화면이 사실이 아닌 것을 말한다.
    expect(SYNC_APPLY.unknown).not.toContain('플러그인')
  })

  it('기기가 하나도 없으면 다음 걸음을 말한다 (empty 상태)', () => {
    const html = table([])
    expect(html).toContain('아직 등록된 기기가 없습니다.')
    expect(html).not.toContain('<table')
  })
})

describe('🔴 상태를 색만으로 구분하지 않는다 (DESIGN_BRIEF §2-4)', () => {
  it('각주가 다섯 상태의 뜻을 글자로 적는다 — 툴팁은 영상에 안 나온다', () => {
    const html = renderToStaticMarkup(createElement(SyncLegend))
    for (const status of SYNC_STATUSES) {
      expect(html, `${status} 의 뜻이 각주에 없다`).toContain(SYNC_MEANING[status])
    }
  })

  it('칩의 툴팁과 각주가 같은 표를 읽는다 — 자리마다 갈리지 않는다', () => {
    const html = table([device({ status: 'applied' })])
    expect(html).toContain(SYNC_MEANING.applied)
  })
})

describe('급한 것이 위다 (DESIGN_BRIEF §4 「정렬 기본: outdated 먼저」)', () => {
  it('outdated 가 applied 보다 앞이고, 같은 상태끼리는 기기 이름 순이다', () => {
    const sorted = sortDevices([
      device({ device_id: '1', device_name: 'z-mac', status: 'applied' }),
      device({ device_id: '2', device_name: 'b-win', status: 'outdated' }),
      device({ device_id: '3', device_name: 'a-win', status: 'outdated' }),
    ])
    expect(sorted.map((d) => d.device_name)).toEqual(['a-win', 'b-win', 'z-mac'])
  })

  it('차례가 표 하나로 정해진다 — 다섯 상태가 서로 다른 자리를 갖는다', () => {
    expect(Object.keys(SYNC_ORDER).sort()).toEqual([...SYNC_STATUSES].sort())
    expect(new Set(Object.values(SYNC_ORDER)).size).toBe(SYNC_STATUSES.length)
    //  「급한 것」 셋이 「급하지 않은 것」 둘보다 앞이다.
    const urgent: SyncStatus[] = ['outdated', 'modified', 'unknown']
    const calm: SyncStatus[] = ['manual', 'applied']
    for (const u of urgent) for (const c of calm) expect(SYNC_ORDER[u]).toBeLessThan(SYNC_ORDER[c])
  })

  it('세는 것과 그리는 것이 같은 목록을 본다', () => {
    const counts = countByStatus(oneOfEach())
    for (const status of SYNC_STATUSES) expect(counts[status]).toBe(1)
  })
})

describe('🔴 P1 · ⚠ P5 — 표에 무엇이 있고 무엇이 없나', () => {
  it('P1 — 파일 본문도 해시도 표에 없다. 기기가 보낸 것은 경로와 해시뿐이고 표는 그것도 안 그린다', () => {
    const html = table(oneOfEach())
    expect(html).not.toContain('a'.repeat(64))
    for (const word of ['content', '본문', 'CLAUDE.md 내용']) expect(html).not.toContain(word)
  })

  it('⚠ P5 — 이름은 그리고, 점수·순위·횟수는 그리지 않는다', () => {
    const html = table(oneOfEach())
    //  「어느 팀원의 노트북이 낡았나」는 팀이 할 일을 정하는 사실이다 (FINDINGS 113).
    expect(html).toContain('팀원0')
    //  금지된 것은 개인 생산성 지표다 — 그 낱말이 표에 하나도 없다.
    for (const word of ['점수', '순위', '횟수', '1위', '기여']) {
      expect(html, `${word} 가 표에 있다 — P5`).not.toContain(word)
    }
  })

  it('이메일은 화면에 오지 않는다 — 서버가 이름 하나만 낸다 (lib/api/user.ts)', () => {
    const html = table(oneOfEach())
    expect(html).not.toContain('@')
  })
})
