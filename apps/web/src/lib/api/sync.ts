import type { SyncStatus } from '@contextops/schema'

// =====================================================================
//  동일성 판정 — 정본은 docs/SPEC.md §6 (「동일성 판정(sync 보고 기준)」).
//
//  🔴 **`unknown` 을 만드는 자리는 여기 하나다.** 5종 중 넷은 기기가 보고하고
//    (`REPORTABLE_SYNC_STATUSES`), 다섯째는 **서버가 매긴다** — 보고가 없는 기기다.
//    DB enum 에 `unknown` 이 없는 것이 그 이유다: 기기가 「모르겠다」고 자칭할 수 있으면
//    「보고 없음」과 섞여서 화면이 둘을 구별할 수 없다 (FINDINGS 16).
//
//  ⚠ 「실시간」이라는 말을 쓰지 마라 (SPEC §6). 화면 문구는 언제나
//    "마지막 보고: 8분 전, v1.3, applied" — **보고 시각이 같이 나가는 것**이 규칙이다.
// =====================================================================

/** 보고가 하나도 없는 기기의 상태. 서버만 매길 수 있다. */
export const NO_REPORT_STATUS: SyncStatus = 'unknown'

export type DeviceSyncRow = {
  device_id: string
  device_name: string
  user_id: string
  /** 마지막 보고. 없으면 `undefined` — 그때가 `unknown` 이다. */
  last?: {
    status: SyncStatus
    version: string | null
    manifest_hash: string
    reported_at: string
  }
}

export type DeviceSyncStatus = {
  device_id: string
  device_name: string
  user_id: string
  status: SyncStatus
  version: string | null
  manifest_hash: string | null
  reported_at: string | null
}

/**
 * 기기 하나의 상태. **보고가 없으면 `unknown`.**
 * ★ 왜 함수 하나인가 — 「보고가 없다」를 화면 쪽에서 판정하게 두면 화면마다 다르게 쓴다
 *   (어디는 빈칸, 어디는 `applied`). 상태를 매기는 자리가 하나면 갈릴 곳이 없다.
 */
export function statusOfDevice(row: DeviceSyncRow): DeviceSyncStatus {
  if (!row.last) {
    return {
      device_id: row.device_id,
      device_name: row.device_name,
      user_id: row.user_id,
      status: NO_REPORT_STATUS,
      version: null,
      manifest_hash: null,
      reported_at: null,
    }
  }
  return {
    device_id: row.device_id,
    device_name: row.device_name,
    user_id: row.user_id,
    status: row.last.status,
    version: row.last.version,
    manifest_hash: row.last.manifest_hash,
    reported_at: row.last.reported_at,
  }
}
