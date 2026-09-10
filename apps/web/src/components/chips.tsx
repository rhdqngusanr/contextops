import { type ScopeKind, type ProgressStatus,
  AI_JOB_STATUSES, CONFIDENCE_LEVELS, CONFLICT_KINDS, CONFLICT_SEVERITIES, ITEM_STATUSES,
  ITEM_TYPES, MILESTONE_STATUSES, PROGRESS_SOURCES, PROPOSAL_OPERATIONS, PROPOSAL_STATUSES,
  SOURCE_DOCUMENT_KINDS, SYNC_STATUSES,
  type AiJobStatus, type Confidence, type ConflictKind, type ConflictSeverity, type ItemStatus,
  type ItemType, type MilestoneStatus, type ProgressSource, type ProposalOperation,
  type ProposalStatus, type SourceDocumentKind, type SyncStatus,
} from '@contextops/schema'

// =====================================================================
//  상태 칩 — 화면이 상태를 그리는 **유일한 자리** (DESIGN_BRIEF §3 「공통 컴포넌트」)
//
//  🔴 **상태를 색만으로 구분하지 않는다.** 라벨 **글자**가 상태를 말하고 색점(`.chip-dot` · CSS 원)이 거든다.
//     특수문자 아이콘(✓ ● § ¶ …)은 없다 (2026-09-10 저녁 · 사용자: 「이런 특수문자들이 마음에 안 든다」).
//     ★ 왜 — 색각 이상뿐 아니라 발표 영상·인쇄된 심사 자료에서 색이 뭉갠다.
//     그래서 아래 표의 행에는 색(`tone`)만 있는 칸이 없다.
//
//  🔴 **표가 열이고, 열 다 스키마의 enum 을 키로 잡는다** (`Record<ItemType, …>`).
//     ★ 왜 이 모양인가 — 화면에 `switch (type)` 을 흩으면 타입이 늘 때 화면을 고쳐야
//       하고, 반드시 한 곳을 빠뜨린다. 여기서는 enum 에 값을 더하면 **타입 검사가
//       막고**, `test/web-tables.test.ts` 가 「표의 키가 enum 과 다르다」로 다시 막는다.
//     ⚠ 화면은 이 표를 **읽기만** 한다. 화면 안에서 라벨을 지어내지 마라.
//
//  ★ 새 ItemType 을 더하는 절차 (화면 몫): `ITEM_TYPE_LABEL` 에 한 줄 — 라벨은 사람 말이고 서로 달라야 한다
//    (시험이 중복을 잡는다).
// =====================================================================

/** 색 이름은 `globals.css` 의 `.tone-*` 하나뿐이다 — 화면이 색을 고르지 않는다. */
export type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'llm'

export type ChipSpec = { label: string; tone: Tone }

/**
 * 기기 동일성 5종 (SPEC §6 · `SYNC_STATUSES`).
 * ⚠ DESIGN_BRIEF §3 은 여기에 `failed` 를 하나 더 적지만 **코드 정본에는 없다**
 *   (FINDINGS 17). 없는 값을 위해 행을 만들지 않는다 — 만들면 아무도 안 만드는
 *   여섯째 칩이 영원히 화면 코드에 남는다.
 */
export const SYNC_CHIP: Record<SyncStatus, ChipSpec> = {
  //  라벨은 사람 말이다 (2026-09-10 · 「비개발자가 봐도」). 값(SPEC §6 의 영어 상태 이름)은 그대로고 툴팁(`SYNC_MEANING`)이 뜻을 푼다.
  applied: { label: '적용됨', tone: 'ok' },
  outdated: { label: '옛 버전', tone: 'warn' },
  modified: { label: '손으로 고침', tone: 'warn' },
  manual: { label: '수동 적용', tone: 'neutral' },
  //  보고가 없는 기기다 — 서버가 매긴다. 「offline」이라고 쓰지 않는다 (DESIGN_BRIEF §5).
  unknown: { label: '보고 없음', tone: 'neutral' },
}

/**
 * 그 상태가 **무슨 뜻인가** — 정본은 SPEC §6 「동일성 판정(sync 보고 기준)」이다.
 * 툴팁(`SyncChip`)과 화면 9 의 각주가 **같은 이 표**를 읽는다.
 *
 * ★ 왜 `SYNC_CHIP` 과 다른 표인가 — 칩의 `label` 은 **좁은 칸에 들어가는 이름**이고
 *   이건 **문장**이다. 한 표로 합치면 표 안에 긴 글이 들어가거나, 각주가 이름만
 *   나열해서 아무것도 설명하지 못한다.
 * ⚠ 문장을 화면에 손으로 적지 마라 — DESIGN_BRIEF §4 화면 9 가 요구하는 툴팁과
 *   각주가 갈리면, 같은 칩이 자리마다 다른 뜻으로 읽힌다.
 */
export const SYNC_MEANING: Record<SyncStatus, string> = {
  //  사람 말이다 (2026-09-10 저녁 · 「데모 텍스트도 이해되게」) — 「해시」·「manifest」·「로컬」을 쓰지 않는다.
  applied: '마지막 보고 때 받은 파일이 공식 판과 전부 같음 (확인표로 대조)',
  outdated: '이 기기의 판이 공식 판보다 오래됨',
  modified: '판은 같지만 파일을 이 기기에서 손으로 고침',
  manual: '플러그인 없이 zip 을 내려받아 손으로 적용함',
  unknown: '이 기기에서 아직 보고가 오지 않음',
}

/** 항목 수명 4종 (SPEC §3). `active` 만 Pack 에 들어간다 — 그래서 ok 는 하나뿐이다. */
export const ITEM_STATUS_CHIP: Record<ItemStatus, ChipSpec> = {
  draft: { label: '초안', tone: 'neutral' },
  review: { label: '검토 중', tone: 'warn' },
  active: { label: '적용 중', tone: 'ok' },
  deprecated: { label: '폐기', tone: 'bad' },
}

/** 근거의 확실성 3단계 (SPEC §3). 낮을수록 사람이 봐야 하므로 low 가 warn 이다. */
export const CONFIDENCE_CHIP: Record<Confidence, ChipSpec> = {
  //  라벨은 사람 말이다 (2026-09-10) — 「근거가 얼마나 확실한가」.
  high: { label: '근거 확실', tone: 'ok' },
  medium: { label: '근거 보통', tone: 'neutral' },
  low: { label: '근거 약함', tone: 'warn' },
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
  queued: { label: '차례 기다리는 중', tone: 'neutral' },
  running: { label: '정리하는 중', tone: 'neutral' },
  succeeded: { label: '정리 완료', tone: 'ok' },
  failed: { label: '정리 실패', tone: 'bad' },
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
  contradiction: { label: '충돌', tone: 'bad' },
  stale: { label: '오래됨', tone: 'warn' },
  duplicate: { label: '중복', tone: 'neutral' },
  doc_vs_code: { label: '문서↔코드', tone: 'warn' },
  //  라벨은 사람 말이다 (2026-09-10 저녁) — 「열린」·「씨앗」은 개발자 낱말이었다. 값(kind)은 그대로다.
  open_question: { label: '답이 필요한 질문', tone: 'neutral' },
  seed_question: { label: '팀에게 묻는 질문', tone: 'neutral' },
}

/**
 * 충돌 심각도 3단계 (SPEC §7.2 `CONFLICT_SEVERITIES`).
 * ⚠ 라벨에 「심각도」를 붙이는 이유 — 같은 화면에 `CONFIDENCE_CHIP`(high/medium/low)이
 *   같이 뜬다. 낱말이 같으면 두 칩이 한 종류로 보인다.
 */
export const CONFLICT_SEVERITY_CHIP: Record<ConflictSeverity, ChipSpec> = {
  high: { label: '심각도 높음', tone: 'bad' },
  medium: { label: '심각도 보통', tone: 'warn' },
  low: { label: '심각도 낮음', tone: 'neutral' },
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
  not_started: { label: '시작 전', tone: 'neutral' },
  in_progress: { label: '진행 중', tone: 'neutral' },
  done_candidate: { label: '완료 확인 대기', tone: 'warn' },
  done: { label: '완료', tone: 'ok' },
}

/**
 * 제안 수명 5종 (SPEC §2 · §5 · DESIGN_BRIEF §4 화면 6 「상태 chip」).
 *
 * 🔴 **`approved` 와 `published` 가 화면에서 달라야 한다.** 승인은 「다음 발행에
 *    들어간다」는 약속일 뿐이고, 그 제안이 실제로 팀에 배포된 것은 발행이 끝난
 *    뒤다 (§2.1 7단계가 `published` 를 찍는다). 둘이 같아 보이면 사람은 승인만
 *    하고 발행을 안 한 채 「배포됐다」고 읽는다.
 * ⚠ `draft` 는 아직 아무도 안 낸 것이다 — 그래서 ok 가 아니라 neutral 이다.
 */
export const PROPOSAL_STATUS_CHIP: Record<ProposalStatus, ChipSpec> = {
  draft: { label: '초안', tone: 'neutral' },
  submitted: { label: '승인 대기', tone: 'warn' },
  approved: { label: '승인됨 · 발행 대기', tone: 'ok' },
  rejected: { label: '거절됨', tone: 'bad' },
  published: { label: '발행됨', tone: 'ok' },
}

/**
 * 제안 항목의 연산 3종 (SPEC §3 `PROPOSAL_OPERATIONS` · DESIGN_BRIEF §4 화면 6
 * 「operation 배지」).
 *
 * ⚠ 셋이 **요구하는 것이 다르다** — `add` 는 초안이, `update`·`deprecate` 는 대상이
 *   있어야 한다 (`ProposalItem` 의 refine). 그래서 화면도 셋에 다른 것을 그린다:
 *   `add` 는 before 가 없고, `deprecate` 는 after 가 없다.
 */
export const PROPOSAL_OPERATION_CHIP: Record<ProposalOperation, ChipSpec> = {
  add: { label: '항목 추가', tone: 'ok' },
  update: { label: '항목 수정', tone: 'warn' },
  deprecate: { label: '항목 폐기', tone: 'bad' },
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
  hook: '세션이 끝날 때 플러그인이 보고',
  manual: '사람이 적음',
}

/** 진행 보고의 상태 4종을 사람 말로 (2026-09-10 저녁 — 드로어에 `done_candidate` 가 그대로 찍혔다). enum 이 늘면 여기 한 줄 — `Record` 라 안 더하면 타입이 막는다. */
export const PROGRESS_STATUS_LABEL: Record<ProgressStatus, string> = {
  in_progress: '진행 중',
  criterion_done: '완료 조건 하나를 채움',
  done_candidate: '완료 후보 — 사람 확인 대기',
  none: '진행 없음',
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
  proposal_status: { keys: PROPOSAL_STATUSES, table: PROPOSAL_STATUS_CHIP },
  proposal_operation: { keys: PROPOSAL_OPERATIONS, table: PROPOSAL_OPERATION_CHIP },
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
      <span className="chip-dot" aria-hidden="true" />
      {spec.label}
    </span>
  )
}

export function SyncChip({ status }: { status: SyncStatus }) {
  //  ⚠ 툴팁 문구는 DESIGN_BRIEF §4 화면 9 가 정한 문장이고, 정본은 `SYNC_MEANING` 이다.
  //    (56바퀴까지는 `applied` 하나만 문장이 있었다 — 나머지 넷은 칩만 보고 뜻을 짐작해야
  //    했다. 다섯 다 표에 있으니 자리마다 갈릴 곳이 없다.)
  return <Chip spec={SYNC_CHIP[status]} title={SYNC_MEANING[status]} />
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

export function ProposalStatusChip({ status }: { status: ProposalStatus }) {
  return <Chip spec={PROPOSAL_STATUS_CHIP[status]} title={status} />
}

export function ProposalOperationChip({ operation }: { operation: ProposalOperation }) {
  return <Chip spec={PROPOSAL_OPERATION_CHIP[operation]} title={operation} />
}

/**
 * 항목 타입 10종의 **사람 말** (INBOX H7 · 2026-09-10). 화면 5 의 표·드로어와 화면 3 의 후보 목록이 이 표를 읽는다 —
 * 예전엔 `policy`·`open_question` 같은 enum 값이 그대로 그려졌다. 화면 어디에도 영어 상태 값을 노출하지 않는 것이
 * 이 저장소의 규칙이다 (`DECIDED_TEXT` 와 같은 판단). enum 이 늘면 여기 한 줄이고, 안 더하면 타입이 막는다.
 */
export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  mission: '미션',
  goal: '목표',
  roadmap: '로드맵',
  //  2026-09-10 저녁 — 「아키텍처·도메인·ADR」은 비개발자에게 낱말이 아니다. 뜻으로 적는다.
  architecture: '구조',
  domain: '업무 용어',
  policy: '정책',
  adr: '기술 결정',
  workflow: '작업 절차',
  constraint: '제약',
  open_question: '답이 필요한 질문',
}

/** 범위 3종의 사람 말 (2026-09-10 저녁 — 표에 `project`·`domain:refund` 가 그대로 찍혔다). 값이 있으면 화면이 뒤에 붙인다. */
export const SCOPE_KIND_LABEL: Record<ScopeKind, string> = {
  project: '프로젝트 전체',
  domain: '업무',
  path: '경로',
}

/** `v1.2.0` 모노 + 해시 앞 8자 (DESIGN_BRIEF §3 「VersionPill」). */
export function VersionPill({ semver, hash, official }: { semver: string; hash?: string; official?: boolean }) {
  return (
    <span className="row">
      {official ? <span className="chip tone-ok"><span className="chip-dot" aria-hidden="true" />공식</span> : null}
      <span className="mono ink">v{semver}</span>
      {hash ? <span className="mono meta" title={hash}>{hash.slice(0, 8)}</span> : null}
    </span>
  )
}

/**
 * `item_bs_m2 개정 6` (DESIGN_BRIEF §3 「CtxTag」) — 「· rev」는 개발자 낱말이라 「개정」으로 (2026-09-10 저녁).
 * 🔴 P7 의 얼굴이다 — Pack 의 한 줄에서 이 칩까지 이어져야 역추적이 성립한다.
 */
export function CtxTag({ itemId, revision }: { itemId: string; revision?: number }) {
  return (
    <span className="ctx-tag">
      {itemId}
      {revision === undefined ? null : <span className="ctx-rev">개정 {revision}</span>}
    </span>
  )
}

/** AI 가 만든 것에만 붙는다 (DESIGN_BRIEF §3 — 사람이 정한 것에 붙이면 신뢰 경계가 흐려진다). */
export function AiBadge() {
  return <span className="chip tone-llm"><span className="chip-dot" aria-hidden="true" />AI 제안</span>
}
