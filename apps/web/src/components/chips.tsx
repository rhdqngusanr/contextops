import {
  AI_JOB_STATUSES, CONFIDENCE_LEVELS, ITEM_STATUSES, ITEM_TYPES, SOURCE_DOCUMENT_KINDS,
  SYNC_STATUSES, type AiJobStatus, type Confidence, type ItemStatus, type ItemType,
  type SourceDocumentKind, type SyncStatus,
} from '@contextops/schema'

// =====================================================================
//  상태 칩 — 화면이 상태를 그리는 **유일한 자리** (DESIGN_BRIEF §3 「공통 컴포넌트」)
//
//  🔴 **상태를 색만으로 구분하지 않는다.** 아이콘 + 라벨 + 색 셋을 항상 같이 낸다.
//     ★ 왜 — 색각 이상뿐 아니라 발표 영상·인쇄된 심사 자료에서 색이 뭉갠다.
//     그래서 아래 표의 행에는 색(`tone`)만 있는 칸이 없다.
//
//  🔴 **표가 여섯이고, 여섯 다 스키마의 enum 을 키로 잡는다** (`Record<ItemType, …>`).
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

/**
 * AI job 의 수명 4종 (SPEC §9 화면 3). **화면 3 이 이 표를 읽기만 한다.**
 *
 * ★ 왜 표인가 — 화면에 `status === 'running' ? … : …` 을 적으면 상태가 늘 때
 *   그 화면이 조용히 빠뜨린다. 여기 한 줄이면 타입 검사가 막고 시험이 다시 막는다.
 * ⚠ 「멈춘 것 같다」(`stalled`)는 여기 없다 — 그건 상태가 아니라 **상태 위의 판정**이고
 *   서버가 낸 별도의 값이다 (`running` 이면서 멈춘 job 이 있다). 다섯째 행으로 만들면
 *   화면이 둘을 하나로 뭉개서, 멈춘 job 이 「도는 중」과 같은 칩으로 보인다.
 */
export const AI_JOB_STATUS_CHIP: Record<AiJobStatus, ChipSpec> = {
  queued: { icon: '◷', label: '차례 기다리는 중', tone: 'neutral' },
  running: { icon: '◐', label: '정리하는 중', tone: 'neutral' },
  succeeded: { icon: '✓', label: '정리 완료', tone: 'ok' },
  failed: { icon: '✕', label: '정리 실패', tone: 'bad' },
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

/**
 * 원본 문서 종류 6종의 사람 말 (SPEC §2 · DESIGN_BRIEF §4 화면 3 「종류」).
 * **화면 3 의 종류 고르개가 이 표를 읽어서 그린다** — `<option>` 을 손으로 적지 않는다.
 *
 * ⚠ DESIGN_BRIEF 는 다섯 개(목표/정책/로드맵/ADR/메모)만 적지만 계약은 **여섯**이다
 *   (`wiki` 가 더 있다 — zip 으로 올린 위키 문서의 자리다). 화면이 다섯만 그리면
 *   여섯째 값은 **아무도 고를 수 없는 값**이 되고, 그게 이 저장소가 매 바퀴 찾는
 *   「정의만 있고 아무 일도 안 하는 것」이다. 그래서 표 전체를 그린다.
 * 🔴 **고른 값이 아직 아무것도 바꾸지 않는다** — 저장되고 되돌아올 뿐 §7.1 프롬프트가
 *   그 값을 모른다 (FINDINGS 65). 라벨을 붙였다고 살아난 것이 아니다.
 */
export const SOURCE_DOCUMENT_KIND_LABEL: Record<SourceDocumentKind, string> = {
  goal: '목표',
  policy: '정책',
  roadmap: '로드맵',
  adr: '결정 (ADR)',
  notes: '메모',
  wiki: '위키 문서',
}

/** 표를 늘릴 때 빠진 키를 시험이 셀 수 있게 목록도 같이 내보낸다. */
export const CHIP_TABLES = {
  sync: { keys: SYNC_STATUSES, table: SYNC_CHIP },
  item_status: { keys: ITEM_STATUSES, table: ITEM_STATUS_CHIP },
  confidence: { keys: CONFIDENCE_LEVELS, table: CONFIDENCE_CHIP },
  ai_job_status: { keys: AI_JOB_STATUSES, table: AI_JOB_STATUS_CHIP },
} as const

export const ITEM_TYPE_KEYS = ITEM_TYPES
export const SOURCE_DOCUMENT_KIND_KEYS = SOURCE_DOCUMENT_KINDS

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

export function AiJobStatusChip({ status }: { status: AiJobStatus }) {
  return <Chip spec={AI_JOB_STATUS_CHIP[status]} />
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
