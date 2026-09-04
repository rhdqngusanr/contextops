import type { ReactNode } from 'react'
import {
  CONFLICT_CHOICES, CONFLICT_KIND_RULES, RESOLUTION_NOTE_MAX,
  type ConflictAnchor, type ConflictChoice, type ContextItem, type DetectedConflictKind,
} from '@contextops/schema'

import { SEED_ANSWER_MAX } from '../lib/api/seed-questions'
import type { ConflictCard as ConflictRow } from '../lib/web/queries'
import {
  AiBadge, ConfidenceChip, ConflictKindChip, ConflictSeverityChip, CtxTag, ItemStatusChip, TypeIcon,
} from './chips'
import { EvidenceLink, EvidenceList } from './evidence'
import { ErrorState } from './states'

// =====================================================================
//  충돌 카드 한 장 (DESIGN_BRIEF §4 화면 4 · SPEC §9 화면 4)
//
//  ★ 왜 화면 밖의 순수 함수인가 — `job-progress.tsx`·`question-stack.tsx` 와 같은
//    이유다. 이 카드가 갖는 모양은 열 몇 개인데(종류 6 × 결정 전/후 × 실패…) 브라우저
//    로는 그때 마침 그 모양인 하나밖에 못 본다. 여기 훅이 없어야 시험이 전부 그려서
//    읽는다 (`test/web-conflict-card.test.ts`).
//
//  🔴 **여기에 `kind === …` 갈래를 만들지 마라.** 종류마다 갈리는 것은 셋이고
//     셋 다 **표 하나**에서 온다:
//       ① 무엇을 그리나  → `CONFLICT_KIND_RULES[kind].anchor` → 아래 `ANCHOR_BODY`
//       ② 무엇을 물어보나 → `CONFLICT_KIND_RULES[kind].detected`
//          (`true` = 결정 버튼 4개 · `false` = 답 칸 — `POST /questions` 가 받는 종류가
//           정확히 그 `false` 쪽이다 · `QUESTION_CONFLICT_KINDS`)
//       ③ 누가 만들었나  → `CONFLICT_KIND_RULES[kind].byAi` → `AI 제안` 배지
//     ★ 새 충돌 종류를 더할 때 이 파일에서 할 일: **`CONFLICT_SIDES` 에 한 줄**
//       (탐지 종류일 때만 — A·B 버튼의 문구다). 나머지는 표를 읽어서 따라온다.
//
//  🔴 **없는 것을 지어내지 않는다.** 가리키는 항목을 목록에서 못 찾으면 빈 칸을 그리지
//     말고 「못 찾았다」고 말한다 — 빈 카드는 근거 없는 카드와 화면에서 같아진다 (P7).
//
//  ⚠ accent 버튼이 여기 없는 것은 실수가 아니다. 선택 넷은 **서로 같은 무게**여야 한다 —
//    하나를 accent 로 만들면 화면이 사람의 결정을 미는 것이 된다.
// =====================================================================

/**
 * 🔴 **탐지 종류마다 A·B 가 무엇인가** (DESIGN_BRIEF §4 화면 4 의 버튼 문구).
 *
 * ★ 왜 표인가 — 「A가 맞음」 하나로 뭉치면 `doc_vs_code` 카드가 「A가 맞음」이라고
 *   묻는다. 사람은 A 가 문서인지 코드인지 다시 위를 봐야 한다. DESIGN_BRIEF 가
 *   종류마다 다른 문장을 적어 둔 이유가 그것이다.
 * ⚠ `both`·`dismiss` 는 여기 없다 — 종류와 무관해서 아래 `CHOICE_LABEL` 이 낸다.
 * ⚠ 지금 탐지 4종은 전부 두 쪽이 있다(`needsB: true`). 한쪽짜리 탐지 종류가 생기면
 *   여기 `b` 를 비우지 말고 `CONFLICT_KIND_RULES[kind].needsB` 를 읽어 B 버튼을 빼라 —
 *   빈 문자열은 「이름 없는 버튼」이 되어 화면에 그대로 뜬다.
 */
export const CONFLICT_SIDES: Record<DetectedConflictKind, { a: string; b: string }> = {
  contradiction: { a: 'A가 맞음', b: 'B가 맞음' },
  //  ⚠ 「맞음」이 아니라 「최신」이다 — 오래됨은 옳고 그름이 아니라 **시점**의 문제다
  //    (`CONFLICT_KIND_RULES.stale.hint`: 「어느 쪽이 맞는지는 판단하지 마라」).
  stale: { a: 'A가 최신', b: 'B가 최신' },
  duplicate: { a: 'A로 합침', b: 'B로 합침' },
  //  DESIGN_BRIEF §4 화면 4 「문서↔코드 카드」의 문장 그대로다.
  doc_vs_code: { a: '문서가 맞음 (코드 수정 필요)', b: '코드가 맞음 (문서 갱신)' },
}

/**
 * 선택 4개의 문구. A·B 는 종류가 정하고(`CONFLICT_SIDES`) 나머지 둘은 종류와 무관하다.
 * ⚠ 선택이 늘면(`CONFLICT_CHOICES`) 여기 한 줄이고, 안 더하면 타입 검사가 막는다.
 */
export const CHOICE_LABEL: Record<ConflictChoice, (sides: { a: string; b: string }) => string> = {
  a: (sides) => sides.a,
  b: (sides) => sides.b,
  //  ⚠ 「둘 다 맞음」이 아니다 — 결정을 미루는 문이고, 그래서 상태가 `resolved` 다.
  both: () => '둘 다 보류',
  dismiss: () => '무시',
}

/** 카드가 그리는 것 전부. 상태는 화면(`review/page.tsx`)이 들고 여기는 **읽기만** 한다. */
export type ConflictCardState = {
  conflict: ConflictRow
  /**
   * `anchor:'items'` 인 종류가 가리키는 두 항목. **못 찾으면 `null`** 이고, 그때 카드는
   * 빈 칸이 아니라 「못 찾았다」를 그린다.
   */
  a: ContextItem | null
  b: ContextItem | null
  /**
   * 🔴 **이 사람이 결정을 눌러도 되나.** `POST /conflicts/{id}:resolve` 는 **owner** 만
   * 받고 (`requireProject(…, 'owner')`), 질문에 답하는 문은 member 도 받는다.
   *
   * ★ 왜 화면이 이걸 아는가 — 모르면 member 에게 버튼 넷을 그려 놓고, 누르는 족족
   *   403 을 낸다. 「눌러도 되는 것만 그린다」가 이 저장소의 규칙이다
   *   (`versions.tsx` 의 「롤백 발행」 · 화면 3 의 zip 카드와 같은 판단).
   * ⚠ 이건 **보안이 아니라 안내**다 — 막는 것은 서버의 guard 다.
   */
  canDecide: boolean
  /** 지금 칸에 쓰고 있는 글 — 탐지 카드는 **메모**, 질문 카드는 **답**이다. */
  draft: string
  busy: boolean
  error: unknown
  /**
   * 방금 이 답으로 만들어진 초안 항목들. **질문 카드에서만** 찬다.
   * ⚠ `null`(아직 저장 안 함)과 `[]`(저장했는데 항목이 안 생겼다)는 다르다 —
   *   둘을 같게 그리면 「만들어졌습니다」를 0개에도 말하게 된다 (FINDINGS 66).
   */
  created: string[] | null
}

export type ConflictCardHandlers = {
  onDraft: (value: string) => void
  /** 탐지 카드의 결정. `dismiss` 만 `dismissed` 로 가고 나머지는 `resolved` 다. */
  onChoose: (choice: ConflictChoice) => void
  /** 질문 카드의 답 저장 (`POST /projects/{id}/questions`). */
  onAnswer: () => void
}

export function ConflictCard({ state, on }: { state: ConflictCardState; on: ConflictCardHandlers }) {
  const { conflict } = state
  const rule = CONFLICT_KIND_RULES[conflict.kind]

  return (
    <article className="card pad col">
      <div className="row-between wrap">
        <div className="row wrap">
          <ConflictKindChip kind={conflict.kind} />
          {/* ⚠ 탐지가 만들지 않는 종류는 `severity` 가 `null` 이다 (DB CHECK).
              「보통」으로 채우지 마라 — 재지 않은 값을 그리는 것이다. */}
          {conflict.severity ? <ConflictSeverityChip severity={conflict.severity} /> : null}
        </div>
        {/* 🔴 AI 가 만든 것에만 배지를 단다. `detected` 로 가르면 §7.1 이 문서에서
            남긴 열린 질문만 배지를 잃는다 — 그건 사람이 적은 것처럼 보인다. */}
        {rule.byAi ? <AiBadge /> : null}
      </div>

      <p className="ink text-section">{conflict.question}</p>

      {/* 표를 읽어서 무엇을 그릴지 고른다 — 여기에 종류 이름이 나오지 않는다. */}
      {ANCHOR_BODY[rule.anchor](state)}

      {state.error ? <ErrorState error={state.error} /> : null}

      {conflict.status === 'open'
        ? (rule.detected
          ? (state.canDecide
            ? <Decision state={state} on={on} />
            //  ⚠ 「권한이 없습니다」로 끝내지 않는다 — 누구에게 말해야 하는지를 같이 낸다.
            : <p className="meta">이 결정은 팀 owner 가 합니다. 아래 근거를 owner 에게 보여 주세요.</p>)
          : <Answer state={state} on={on} />)
        : <Decided state={state} />}
    </article>
  )
}

// ---------------------------------------------------------------------
//  ① 본문 — `anchor` 3종이 서로 다른 것을 그린다 (P7: 근거로 가는 길)
// ---------------------------------------------------------------------

/**
 * 🔴 **`CONFLICT_ANCHORS` 3종의 정본 표.** 어느 칸이 차 있는지는 종류가 아니라
 * 이 축이 정하고 (DB CHECK 도 같은 축에서 생성된다), 화면은 그 축만 읽는다.
 * ⚠ 셋을 하나로 접지 마라 — 접는 순간 접힌 쪽 카드가 근거를 못 그린다.
 */
const ANCHOR_BODY: Record<ConflictAnchor, (state: ConflictCardState) => ReactNode> = {
  items: (state) => {
    const two = state.conflict.b_item_id !== null
    return (
      <div className="row items-start wrap">
        <ItemSide label={sideLabel(two, 'a')} itemId={state.conflict.a_item_id} item={state.a} />
        {two ? <ItemSide label={sideLabel(two, 'b')} itemId={state.conflict.b_item_id} item={state.b} /> : null}
      </div>
    )
  },
  document: (state) => {
    const two = state.conflict.b_ref !== null
    return (
      <div className="col-tight">
        {state.conflict.a_ref ? <RefSide label={sideLabel(two, 'a')} refValue={state.conflict.a_ref} /> : null}
        {state.conflict.b_ref ? <RefSide label={sideLabel(two, 'b')} refValue={state.conflict.b_ref} /> : null}
      </div>
    )
  },
  //  🔴 가리킬 것이 **아직** 없는 질문이다 (씨앗 질문). 없는 근거를 그리지 않고,
  //     대신 「왜 없는지」와 「그럼 근거는 무엇이 되는지」를 말한다.
  //  ⚠ 「답이 근거가 **됩니다**」로 적지 마라 — 답한 뒤에도 이 줄이 그대로 남는다.
  //     때(時)를 타는 문장을 상태와 무관한 자리에 두면 반드시 한쪽에서 거짓말이 된다.
  none: () => (
    <p className="meta">가리킬 문서도 항목도 없습니다 — 답이 그대로 근거입니다.</p>
  ),
}

/**
 * 어긋난 쪽에 붙는 이름. **두 쪽이 있을 때만 A·B 다.**
 * ⚠ 한쪽뿐인 카드(열린 질문)에 「A」를 붙이면 사람은 B 를 찾는다 — 없는 짝을 그리는 것과 같다.
 *   눈으로 읽고 고쳤다: docs/evidence/2026-09-04-screen4/ 첫 판 ⑪.
 */
function sideLabel(two: boolean, side: 'a' | 'b'): string {
  if (!two) return '근거'
  return side === 'a' ? 'A' : 'B'
}

/** 어긋난 두 항목 중 한쪽. **근거를 제목 옆에 같이 낸다** (DESIGN_BRIEF §2-1 · P7). */
function ItemSide({ label, itemId, item }: { label: string; itemId: string | null; item: ContextItem | null }) {
  return (
    <div className="card pad-sm col-tight grow">
      <span className="label">{label}</span>
      {item === null ? (
        <>
          {itemId === null
            ? <span className="meta ink-warn">⚠ 가리키는 항목이 적혀 있지 않습니다.</span>
            : (
              <>
                <CtxTag itemId={itemId} />
                {/* ⚠ 「없는 항목」이라고 단정하지 않는다 — 목록을 걸러서 읽었을 수도 있다.
                    본 것만 말한다 (loop/PROMPT.md ④2). */}
                <span className="meta ink-warn">⚠ 이 항목을 목록에서 찾지 못했습니다.</span>
              </>
            )}
        </>
      ) : (
        <>
          <div className="row wrap">
            <TypeIcon type={item.type} />
            <span className="ink">{item.title}</span>
          </div>
          <div className="row wrap">
            <CtxTag itemId={item.id} revision={item.revision} />
            <ItemStatusChip status={item.status} />
            <ConfidenceChip confidence={item.confidence} />
          </div>
          <p className="meta">{item.body}</p>
          <EvidenceList refs={item.source_refs} />
        </>
      )}
    </div>
  )
}

/** 항목이 아직 없는 종류(열린 질문)가 가리키는 **원문 구간**. */
function RefSide({ label, refValue }: { label: string; refValue: NonNullable<ConflictRow['a_ref']> }) {
  return (
    <div className="row wrap">
      <span className="label">{label}</span>
      <EvidenceLink ref={refValue} />
    </div>
  )
}

// ---------------------------------------------------------------------
//  ② 결정 — 탐지가 만든 카드 (DecisionBar)
// ---------------------------------------------------------------------

function Decision({ state, on }: { state: ConflictCardState; on: ConflictCardHandlers }) {
  //  ⚠ `detected` 인 종류만 여기 온다 — 그 좁힘의 근거는 `DetectedConflictKind` 표다.
  const sides = CONFLICT_SIDES[state.conflict.kind as DetectedConflictKind]

  return (
    <div className="col-tight">
      <label className="field">
        <span className="label">메모 (선택)</span>
        <input
          className="input"
          value={state.draft}
          maxLength={RESOLUTION_NOTE_MAX}
          placeholder="왜 그렇게 정했는지 한 줄"
          onChange={(e) => on.onDraft(e.target.value)}
        />
      </label>
      <div className="row wrap">
        {CONFLICT_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            className="btn btn-sm"
            disabled={state.busy}
            onClick={() => on.onChoose(choice)}
          >
            {CHOICE_LABEL[choice](sides)}
          </button>
        ))}
        {state.busy ? <span className="meta">저장하는 중입니다…</span> : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
//  ③ 답 — 사람에게 묻는 카드 (열린 질문 · 씨앗 질문)
// ---------------------------------------------------------------------

function Answer({ state, on }: { state: ConflictCardState; on: ConflictCardHandlers }) {
  return (
    <div className="col-tight">
      <label className="field">
        <span className="label">답</span>
        <textarea
          className="textarea"
          rows={3}
          value={state.draft}
          maxLength={SEED_ANSWER_MAX}
          placeholder="한두 문장이면 충분합니다."
          onChange={(e) => on.onDraft(e.target.value)}
        />
        {/* ⚠ 상한을 손으로 적지 않는다 — 서버가 답을 담는 칸의 크기가 정본이다. */}
        <span className="meta mono">{state.draft.length} / {SEED_ANSWER_MAX}자</span>
      </label>
      <div className="row">
        <button
          type="button"
          className="btn btn-sm"
          disabled={state.busy || state.draft.trim().length === 0}
          onClick={on.onAnswer}
        >
          답 저장하기
        </button>
        {state.busy ? <span className="meta">저장하는 중입니다…</span> : null}
      </div>
      {/* 🔴 저장하기 **전에** 무엇이 생기는지 약속하지 않는다. 답이 항목이 되는 질문과
          기록으로만 남는 질문이 섞여 있고 (§7.1 이 남긴 질문은 구조화가 따로 필요하다),
          그 판정은 서버가 한다. 약속은 저장한 뒤에 **서버가 낸 수**로 한다 (아래). */}
    </div>
  )
}

// ---------------------------------------------------------------------
//  ④ 결정된 뒤 — 무엇을 골랐는지 남긴다
// ---------------------------------------------------------------------

/**
 * 🔴 결정한 카드를 **목록에서 지우지 않는다.** 지우면 방금 누른 사람은 자기가 무엇을
 * 골랐는지 확인할 자리를 잃고, 잘못 눌렀는지도 알 수 없다.
 * ⚠ 되돌리는 버튼은 두지 않는다 — `POST :resolve` 가 「이미 처리된 충돌」을 400 으로
 *   막는다. 없는 문을 그리면 누른 사람은 자기가 뭘 잘못한 줄 안다.
 */
function Decided({ state }: { state: ConflictCardState }) {
  const { conflict, created } = state
  const rule = CONFLICT_KIND_RULES[conflict.kind]
  const choice = conflict.resolution?.choice
  const note = conflict.resolution?.note

  return (
    <div className="col-tight">
      {/* ⚠ 「…「무시」**으로** 정했습니다」가 됐다. 한국어 조사는 앞 낱말의 받침에 따라
          갈리는데 버튼 문구는 넷이 제각각이다 (「무시」·「A가 맞음」). 조사를 고르는
          코드를 만드는 대신 **조사가 필요 없는 자리**로 옮겼다 — 문구가 늘어도 안 깨진다.
          눈으로 읽고 고쳤다: docs/evidence/2026-09-04-screen4/ 첫 판 ⑩. */}
      <p className="ink-ok">
        ✓ {rule.detected && choice
          ? `정했습니다 — 「${CHOICE_LABEL[choice](CONFLICT_SIDES[conflict.kind as DetectedConflictKind])}」`
          : '답을 저장했습니다.'}
      </p>
      {/* 답변 문장이 곧 결정의 근거다 — 라우트가 그것을 `resolution.note` 에 남긴다. */}
      {note ? <p className="meta">{note}</p> : null}
      {/* ⚠ `null`(질문이 아니거나 아직 안 저장)과 `[]`(저장했는데 안 생겼다)를 가른다. */}
      {created === null ? null : created.length > 0 ? (
        <span className="meta">초안 항목 {created.length}개가 만들어졌습니다. 발행 전까지 팀 규칙이 아닙니다.</span>
      ) : (
        <span className="meta">이 답은 기록으로 남았습니다. 항목은 만들어지지 않았습니다.</span>
      )}
    </div>
  )
}
