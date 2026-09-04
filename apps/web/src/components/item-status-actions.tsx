'use client'

import { ITEM_STATUS_EXCLUDE_REASON, ITEM_STATUSES, type ItemStatus } from '@contextops/schema'

import { ITEM_STATUS_CHIP } from './chips'

// =====================================================================
//  🔴 항목의 상태를 바꾸는 문 — 화면 5 드로어 (SPEC §5 · DESIGN_BRIEF §4 화면 5)
//
//  ★ 왜 이 파일이 생겼나 — **화면에 초안을 승인할 문이 아예 없었다** (FINDINGS 79).
//    씨앗 질문 10장에 답하면 항목이 `draft` 로 생기는데, 발행은 `active` 만 담는다
//    (`ITEM_STATUS_EXCLUDE_REASON`). 그래서 사람은 열 개에 다 답하고 [발행하기] 를
//    눌러도 **자기 답이 하나도 없는 Pack** 을 받았다. PLAN P3 둘째 행의 완료 기준
//    「문서 없이 질문만으로 v1.0 발행 가능」이 그 자리에서 막혀 있었다.
//
//  🔴 **버튼 밑의 캡션을 손으로 적지 마라.** 「누르면 다음 Pack 이 어떻게 되나」는
//     `ITEM_STATUS_EXCLUDE_REASON`(계약 패키지)이 이미 알고 있고, 그 표가 곧
//     컴파일러가 실제로 하는 일이다. 여기서 문장을 베껴 적으면 표가 바뀌는 날
//     화면만 옛말을 하게 된다 — 그게 「화면이 거짓말하는」 첫걸음이다 (FINDINGS 74·76).
// =====================================================================

/** 한 상태에서 사람이 누를 수 있는 문 하나. */
export interface ItemStatusAction {
  readonly to: ItemStatus
  /** 버튼 문구. **무엇을 하는지**만 적는다 — 결과는 아래 캡션이 표에서 읽어 낸다. */
  readonly label: string
}

/**
 * 🔴 **「이 상태에서 어디로 갈 수 있나」의 정본 표.**
 *
 * ★ 새 상태를 더하는 절차 — 셋이고 앞의 둘은 기계가 막아 준다:
 *   ① `ITEM_STATUSES` 끝에 값 추가 (중간에 끼우지 마라 — 직렬화된다)
 *   ② 이 표에 한 줄 · `ITEM_STATUS_CHIP` 에 한 줄  ← ①만 하면 타입 검사가 막는다
 *   ③ `test/web-item-status.test.ts` 는 고칠 것이 없다 — 표를 돌면서 잰다
 *
 * ⚠ **줄을 비우지 마라.** 나가는 문이 없는 상태는 드로어에서 막다른 골목이 되고,
 *   사람은 자기가 잘못 눌렀다고 생각한다. 시험이 그것을 잠근다.
 * ⚠ 서버에는 아직 전이 검사가 없다 — 이 표는 **화면이 무엇을 그리나**의 정본이지
 *   「무엇이 허용되나」의 정본이 아니다. SPEC §5 가 전이를 정하지 않아서 지어내지
 *   않았다 (docs/feedback/FINDINGS.md 79 에 적었다).
 */
export const ITEM_STATUS_ACTIONS = {
  draft: [
    { to: 'active', label: '승인' },
    { to: 'review', label: '검토 요청' },
    { to: 'deprecated', label: '버리기' },
  ],
  review: [
    { to: 'active', label: '승인' },
    { to: 'draft', label: '초안으로 되돌리기' },
  ],
  active: [
    { to: 'deprecated', label: '폐기' },
  ],
  deprecated: [
    { to: 'active', label: '되살리기' },
  ],
} as const satisfies Record<ItemStatus, readonly ItemStatusAction[]>

/**
 * 그 상태가 되면 **다음 Pack** 이 어떻게 되나. 표를 읽어서 답한다 — 화면이 세지 않는다.
 * ⚠ 문장을 늘리려면 `ITEM_STATUS_EXCLUDE_REASON` 을 봐라. 갈래가 둘인 이유는
 *   그 표의 값이 `null`(나간다) 아니면 문장(빠진다)이기 때문이다.
 */
export function packEffectOf(status: ItemStatus): string {
  return ITEM_STATUS_EXCLUDE_REASON[status] === null
    ? '다음 Pack 에 나갑니다'
    : '다음 Pack 에서 빠집니다'
}

/**
 * 버튼 밑에 붙는 한 줄 — 「누르면 무엇이 되고, 다음 Pack 이 어떻게 되나」.
 *
 * ⚠ **버튼 문구가 이미 그 상태의 이름을 담고 있으면 이름을 또 적지 않는다.**
 *   눈으로 읽고 고쳤다 — 「폐기 | 폐기 · 다음 Pack 에서 빠집니다」처럼 같은 낱말이
 *   두 줄에 겹쳐 서면 캡션이 새 사실을 안 주는 것처럼 읽힌다
 *   (`docs/evidence/2026-09-04-item-status/` 첫 판).
 */
export function actionCaption(action: ItemStatusAction): string {
  const name = ITEM_STATUS_CHIP[action.to].label
  const effect = packEffectOf(action.to)
  return action.label.includes(name) ? effect : `${name} · ${effect}`
}

export interface ItemStatusActionsState {
  readonly status: ItemStatus
  /** 저장하는 중인 목적지. 있으면 버튼을 전부 잠근다 (두 번 누르면 409 다). */
  readonly busy: ItemStatus | null
  /** 실패 문구. `messageOf` 가 만든 것을 그대로 받는다 — 여기서 지어내지 않는다. */
  readonly error: string | null
}

export function ItemStatusActions({
  state,
  onChange,
}: {
  state: ItemStatusActionsState
  onChange: (to: ItemStatus) => void
}) {
  const actions = ITEM_STATUS_ACTIONS[state.status]

  return (
    <div className="col-tight">
      <span className="label">상태 바꾸기</span>
      <div className="row items-start wrap">
        {actions.map((action) => (
          <div key={action.to} className="col-tight">
            <button
              type="button"
              className="btn btn-sm"
              disabled={state.busy !== null}
              onClick={() => onChange(action.to)}
            >
              {action.label}
            </button>
            {/* 🔴 **누른 뒤에 무엇이 되는지**를 적는다. 상태 이름만 적으면(「폐기」)
                그것이 배포에 무슨 뜻인지 팀장은 모른다 — Pack 이 어떻게 되는지가 본론이다. */}
            <span className="meta">{actionCaption(action)}</span>
          </div>
        ))}
        {state.busy === null ? null : <span className="meta">저장하는 중입니다…</span>}
      </div>
      {state.error === null ? null : <p className="meta ink-warn">⚠ {state.error}</p>}
    </div>
  )
}

/** 표가 `ITEM_STATUSES` 를 전부 덮는지 화면 밖에서도 셀 수 있게 내보낸다 (시험이 쓴다). */
export const ITEM_STATUS_ACTION_KEYS = ITEM_STATUSES
