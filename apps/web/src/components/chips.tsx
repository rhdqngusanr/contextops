import {
  AI_JOB_STATUSES, CONFIDENCE_LEVELS, CONFLICT_KINDS, CONFLICT_SEVERITIES, ITEM_STATUSES,
  ITEM_TYPES, MILESTONE_STATUSES, PROGRESS_SOURCES, SOURCE_DOCUMENT_KINDS, SYNC_STATUSES,
  type AiJobStatus, type Confidence, type ConflictKind, type ConflictSeverity, type ItemStatus,
  type ItemType, type MilestoneStatus, type ProgressSource, type SourceDocumentKind,
  type SyncStatus,
} from '@contextops/schema'

// =====================================================================
//  상태 칩 — 화면이 상태를 그리는 **유일한 자리** (DESIGN_BRIEF §3 「공통 컴포넌트」)
//
//  🔴 **상태를 색만으로 구분하지 않는다.** 아이콘 + 라벨 + 색 셋을 항상 같이 낸다.
//     ★ 왜 — 색각 이상뿐 아니라 발표 영상·인쇄된 심사 자료에서 색이 뭉갠다.
//     그래서 아래 표의 행에는 색(`tone`)만 있는 칸이 없다.
//
//  🔴 **표가 열이고, 열 다 스키마의 enum 을 키로 잡는다** (`Record<ItemType, …>`).
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

/**
 * 충돌 종류 6종 (SPEC §7.2 · DESIGN_BRIEF §4 화면 4 「필터 칩」).
 * **화면 4 의 거르개가 이 표를 읽어서 그린다** — 칩을 손으로 적지 않는다.
 *
 * ⚠ DESIGN_BRIEF 는 다섯(충돌/오래됨/중복/문서↔코드/열린 질문)만 적지만 계약은
 *   **여섯**이다 — 씨앗 질문이 뒤에 생겼다 (FINDINGS 67 ③). 다섯만 그리면 여섯째는
 *   **아무도 못 거르는 종류**가 되고, 그게 이 저장소가 매 바퀴 찾는 「정의만 있고
 *   아무 일도 안 하는 것」이다.
 * ⚠ 「이 종류를 누가 만들었나」는 여기 없다 — `CONFLICT_KIND_RULES[kind].byAi` 가
 *   정본이다. 라벨 옆에 손으로 적으면 두 곳이 갈린다.
 */
export const CONFLICT_KIND_CHIP: Record<ConflictKind, ChipSpec> = {
  contradiction: { icon: '⚡', label: '충돌', tone: 'bad' },
  stale: { icon: '⌛', label: '오래됨', tone: 'warn' },
  duplicate: { icon: '⧉', label: '중복', tone: 'neutral' },
  doc_vs_code: { icon: '⇄', label: '문서↔코드', tone: 'warn' },
  open_question: { icon: '?', label: '열린 질문', tone: 'neutral' },
  seed_question: { icon: '✎', label: '씨앗 질문', tone: 'neutral' },
}

/**
 * 충돌 심각도 3단계 (SPEC §7.2 `CONFLICT_SEVERITIES`).
 * ⚠ 라벨에 「심각도」를 붙이는 이유 — 같은 화면에 `CONFIDENCE_CHIP`(high/medium/low)이
 *   같이 뜬다. 낱말이 같으면 두 칩이 한 종류로 보인다.
 */
export const CONFLICT_SEVERITY_CHIP: Record<ConflictSeverity, ChipSpec> = {
  high: { icon: '▲', label: '심각도 높음', tone: 'bad' },
  medium: { icon: '◆', label: '심각도 보통', tone: 'warn' },
  low: { icon: '▽', label: '심각도 낮음', tone: 'neutral' },
}

/**
 * 마일스톤 상태 4종 (SPEC §5 roadmap · DESIGN_BRIEF §4 화면 8 「상태 chip」 · P5).
 *
 * 🔴 **`done_candidate` 와 `done` 이 화면에서 반드시 달라 보여야 한다.** 그 둘의 차이가
 *    이 제품의 약속 하나를 통째로 들고 있다 — 「agent 는 스스로 완료를 선언하지
 *    못한다」. 보고가 아무리 쌓여도 `완료 확인 대기` 까지고, `완료` 는 owner 가
 *    [완료 확인] 을 눌러야 붙는다 (`POST /progress/{id}/confirm`).
 *    그래서 앞엣것은 warn(사람이 할 일이 남았다)이고 뒤엣것만 ok 다.
 * ⚠ 「보고 없음」을 여기 다섯째 행으로 만들지 마라 — 그건 마일스톤의 상태가 아니라
 *   `last_report_at` 이 `null` 인 것이고, 화면은 그 칸을 따로 그린다 (`RoadmapRow`).
 */
export const MILESTONE_CHIP: Record<MilestoneStatus, ChipSpec> = {
  not_started: { icon: '○', label: '시작 전', tone: 'neutral' },
  in_progress: { icon: '◐', label: '진행 중', tone: 'neutral' },
  done_candidate: { icon: '◷', label: '완료 확인 대기', tone: 'warn' },
  done: { icon: '✓', label: '완료', tone: 'ok' },
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
 * 🔴 **고른 값은 §7.1 프롬프트를 바꾼다** (FINDINGS 82 · `lib/ai/structure.ts` 의
 *   `SOURCE_DOCUMENT_KIND_BRIEF`). 여기 있는 것은 **사람이 고를 때 읽는 낱말**이고
 *   모델이 읽는 한 줄은 그 표다 — 둘은 일부러 따로다. 이 낱말을 다듬는다고 구조화
 *   결과가 바뀌면 안 된다.
 */
export const SOURCE_DOCUMENT_KIND_LABEL: Record<SourceDocumentKind, string> = {
  goal: '목표',
  policy: '정책',
  roadmap: '로드맵',
  adr: '결정 (ADR)',
  notes: '메모',
  wiki: '위키 문서',
}

/**
 * 진행 보고를 만든 주체 3종 (SPEC §3 `PROGRESS_SOURCES` · DESIGN_BRIEF §4 화면 8
 * 「드로어: … source(agent/hook)」).
 *
 * 🔴 **여기가 신뢰 경계를 읽는 자리다.** 같은 「근거 2건」이라도 그것을 적은 것이
 *    Claude 인지(`agent`) 세션이 끝날 때 훅이 자동으로 적은 것인지(`hook`) 사람이
 *    손으로 적은 것인지(`manual`)에 따라 사람이 얼마나 믿을지가 다르다.
 * ⚠ **사람 이름을 여기 붙이지 마라** (P5). 이 표가 답하는 것은 「누가」가 아니라
 *   「무엇이」다 — 보고 행의 `device_id` 는 응답에 실리지도 않는다 (roadmap 라우트).
 */
export const PROGRESS_SOURCE_LABEL: Record<ProgressSource, string> = {
  agent: 'Claude 가 보고',
  hook: '세션 종료 훅이 보고',
  manual: '사람이 적음',
}

/** 표를 늘릴 때 빠진 키를 시험이 셀 수 있게 목록도 같이 내보낸다. */
export const CHIP_TABLES = {
  sync: { keys: SYNC_STATUSES, table: SYNC_CHIP },
  item_status: { keys: ITEM_STATUSES, table: ITEM_STATUS_CHIP },
  confidence: { keys: CONFIDENCE_LEVELS, table: CONFIDENCE_CHIP },
  ai_job_status: { keys: AI_JOB_STATUSES, table: AI_JOB_STATUS_CHIP },
  conflict_kind: { keys: CONFLICT_KINDS, table: CONFLICT_KIND_CHIP },
  conflict_severity: { keys: CONFLICT_SEVERITIES, table: CONFLICT_SEVERITY_CHIP },
  milestone: { keys: MILESTONE_STATUSES, table: MILESTONE_CHIP },
} as const

export const ITEM_TYPE_KEYS = ITEM_TYPES
export const PROGRESS_SOURCE_KEYS = PROGRESS_SOURCES
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

export function ConflictKindChip({ kind }: { kind: ConflictKind }) {
  return <Chip spec={CONFLICT_KIND_CHIP[kind]} title={kind} />
}

export function ConflictSeverityChip({ severity }: { severity: ConflictSeverity }) {
  return <Chip spec={CONFLICT_SEVERITY_CHIP[severity]} />
}

export function MilestoneChip({ status }: { status: MilestoneStatus }) {
  return <Chip spec={MILESTONE_CHIP[status]} />
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
      {revision === undefined ? null : <span>· rev {revision}</span>}
    </span>
  )
}

/** AI 가 만든 것에만 붙는다 (DESIGN_BRIEF §3 — 사람이 정한 것에 붙이면 신뢰 경계가 흐려진다). */
export function AiBadge() {
  return <span className="chip tone-llm"><span className="chip-icon" aria-hidden="true">✳</span>AI 제안</span>
}
