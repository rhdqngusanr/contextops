import {
  CONFIDENCE_LEVELS, ITEM_STATUSES, ITEM_TYPES, SYNC_STATUSES,
  type Confidence, type ItemStatus, type ItemType, type SyncStatus,
} from '@contextops/schema'

// =====================================================================
//  상태 칩 — 화면이 상태를 그리는 **유일한 자리** (DESIGN_BRIEF §3 「공통 컴포넌트」)
//
//  🔴 **상태를 색만으로 구분하지 않는다.** 아이콘 + 라벨 + 색 셋을 항상 같이 낸다.
//     ★ 왜 — 색각 이상뿐 아니라 발표 영상·인쇄된 심사 자료에서 색이 뭉갠다.
//     그래서 아래 표의 행에는 색(`tone`)만 있는 칸이 없다.
//
//  🔴 **표가 넷이고, 넷 다 스키마의 enum 을 키로 잡는다** (`Record<ItemType, …>`).
//     ★ 왜 이 모양인가 — 화면에 `switch (type)` 을 흩으면 타입이 늘 때 화면을 고쳐야
//       하고, 반드시 한 곳을 빠뜨린다. 여기서는 enum 에 값을 더하면 **타입 검사가
//       막고**, `test/web-tables.test.ts` 가 「표의 키가 enum 과 다르다」로 다시 막는다.
//     ⚠ 화면은 이 표를 **읽기만** 한다. 화면 안에서 라벨을 지어내지 마라.
//
//  ★ 새 ItemType 을 더하는 절차 (화면 몫): `ITEM_TYPE_ICON` 에 한 줄.
//    아이콘은 **서로 달라야** 한다 — 같으면 표에서 두 타입이 한 종류로 보인다
//    (시험이 중복을 잡는다).
// =====================================================================

/** 색 이름은 `globals.css` 의 `.tone-*` 하나뿐이다 — 화면이 색을 고르지 않는다. */
export type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'llm'

export type ChipSpec = { icon: string; label: string; tone: Tone }

/**
 * 기기 동일성 5종 (SPEC §6 · `SYNC_STATUSES`).
 * ⚠ DESIGN_BRIEF §3 은 여기에 `failed` 를 하나 더 적지만 **코드 정본에는 없다**
 *   (FINDINGS 17). 없는 값을 위해 행을 만들지 않는다 — 만들면 아무도 안 만드는
 *   여섯째 칩이 영원히 화면 코드에 남는다.
 */
export const SYNC_CHIP: Record<SyncStatus, ChipSpec> = {
  applied: { icon: '✓', label: 'applied', tone: 'ok' },
  outdated: { icon: '⚠', label: 'outdated', tone: 'warn' },
  modified: { icon: '✎', label: 'modified', tone: 'warn' },
  manual: { icon: '⇩', label: 'manual', tone: 'neutral' },
  //  보고가 없는 기기다 — 서버가 매긴다. 「offline」이라고 쓰지 않는다 (DESIGN_BRIEF §5).
  unknown: { icon: '?', label: '보고 없음', tone: 'neutral' },
}

/** 항목 수명 4종 (SPEC §3). `active` 만 Pack 에 들어간다 — 그래서 ok 는 하나뿐이다. */
export const ITEM_STATUS_CHIP: Record<ItemStatus, ChipSpec> = {
  draft: { icon: '·', label: '초안', tone: 'neutral' },
  review: { icon: '◷', label: '검토 중', tone: 'warn' },
  active: { icon: '✓', label: '적용 중', tone: 'ok' },
  deprecated: { icon: '⊘', label: '폐기', tone: 'bad' },
}

/** 근거의 확실성 3단계 (SPEC §3). 낮을수록 사람이 봐야 하므로 low 가 warn 이다. */
export const CONFIDENCE_CHIP: Record<Confidence, ChipSpec> = {
  high: { icon: '●', label: 'high', tone: 'ok' },
  medium: { icon: '◐', label: 'medium', tone: 'neutral' },
  low: { icon: '○', label: 'low', tone: 'warn' },
}

/** 항목 타입 10종의 표 아이콘 (SPEC §3 · DESIGN_BRIEF §4 화면 5 「타입 아이콘」). */
export const ITEM_TYPE_ICON: Record<ItemType, string> = {
  mission: '◆',
  goal: '◎',
  roadmap: '▤',
  architecture: '⌗',
  domain: '⬡',
  policy: '§',
  adr: '⚖',
  workflow: '⇄',
  constraint: '▲',
  open_question: '?',
}

/** 표를 늘릴 때 빠진 키를 시험이 셀 수 있게 목록도 같이 내보낸다. */
export const CHIP_TABLES = {
  sync: { keys: SYNC_STATUSES, table: SYNC_CHIP },
  item_status: { keys: ITEM_STATUSES, table: ITEM_STATUS_CHIP },
  confidence: { keys: CONFIDENCE_LEVELS, table: CONFIDENCE_CHIP },
} as const

export const ITEM_TYPE_KEYS = ITEM_TYPES

// ---------------------------------------------------------------------
//  그리는 쪽 — 표를 읽기만 한다
// ---------------------------------------------------------------------

export function Chip({ spec, title }: { spec: ChipSpec; title?: string }) {
  return (
    <span className={`chip tone-${spec.tone}`} title={title}>
      <span className="chip-icon" aria-hidden="true">{spec.icon}</span>
      {spec.label}
    </span>
  )
}

export function SyncChip({ status }: { status: SyncStatus }) {
  //  ⚠ 툴팁 문구는 DESIGN_BRIEF §4 화면 9 가 정한 문장이다.
  return <Chip spec={SYNC_CHIP[status]} title={status === 'applied' ? '마지막 보고 시점의 파일 해시가 공식 manifest와 모두 일치' : undefined} />
}

export function ItemStatusChip({ status }: { status: ItemStatus }) {
  return <Chip spec={ITEM_STATUS_CHIP[status]} />
}

export function ConfidenceChip({ confidence }: { confidence: Confidence }) {
  return <Chip spec={CONFIDENCE_CHIP[confidence]} />
}

export function TypeIcon({ type }: { type: ItemType }) {
  //  아이콘만으로 타입을 말하지 않는다 — 옆 칸에 타입 이름이 같이 나간다.
  return <span className="mono" title={type} aria-label={type}>{ITEM_TYPE_ICON[type]}</span>
}

/** `v1.2.0` 모노 + 해시 앞 8자 (DESIGN_BRIEF §3 「VersionPill」). */
export function VersionPill({ semver, hash, official }: { semver: string; hash?: string; official?: boolean }) {
  return (
    <span className="row">
      {official ? <span className="chip tone-ok"><span className="chip-icon" aria-hidden="true">✓</span>공식</span> : null}
      <span className="mono ink">v{semver}</span>
      {hash ? <span className="mono meta" title={hash}>{hash.slice(0, 8)}</span> : null}
    </span>
  )
}

/**
 * `item_bs_m2 · rev 6` (DESIGN_BRIEF §3 「CtxTag」).
 * 🔴 P7 의 얼굴이다 — Pack 의 한 줄에서 이 칩까지 이어져야 역추적이 성립한다.
 */
export function CtxTag({ itemId, revision }: { itemId: string; revision?: number }) {
  return (
    <span className="ctx-tag">
      {itemId}
      {revision === undefined ? null : <span className="ink-4">· rev {revision}</span>}
    </span>
  )
}

/** AI 가 만든 것에만 붙는다 (DESIGN_BRIEF §3 — 사람이 정한 것에 붙이면 신뢰 경계가 흐려진다). */
export function AiBadge() {
  return <span className="chip tone-llm"><span className="chip-icon" aria-hidden="true">✳</span>AI 제안</span>
}
