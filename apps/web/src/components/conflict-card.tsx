import type { ReactNode } from 'react'
import {
  ANSWER_MAX, ANSWER_SLOT_KEYS, ANSWER_SLOTS, CONFLICT_CHOICES, CONFLICT_KIND_RULES, itemOutcomeOf,
  RESOLUTION_ITEM_OUTCOME, RESOLUTION_NOTE_MAX,
  type AnswerSlotKey, type ConflictAnchor, type ConflictChoice, type ContextItemView,
  type ConflictKind, type DetectedConflictKind,
} from '@contextops/schema'
import type { WriteDoor } from '../lib/web/actor'
import type { ConflictCard as ConflictRow } from '../lib/web/queries'
import { CONFLICT_ASK, FALLBACK_NAMES, SOLO_NAME, sideNames, type SideName, type SideNames } from '../lib/web/conflict-sides'
import { ITEM_GIST_KEY, itemGist } from '../lib/web/item-gist'
import { dateText } from '../lib/web/time'
import {
  AiBadge, ConfidenceChip, ConflictKindChip, ConflictSeverityChip, CtxTag, ITEM_STATUS_CHIP,
  ItemStatusChip,
  Note,
} from './chips'
import { EvidenceLink, EvidenceList } from './evidence'
import { Jargon } from './jargon'
import { ErrorState, ReadOnlyNotice } from './states'

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
/**
 * 🔴 **카드의 첫 줄 — 이 카드가 무엇인지 한 문장** (2026-09-10 · 사용자: 「이런 섹션의 내용이 눈에 확 안 들어와서 뭐를 뜻하는지 안 느껴져」).
 *
 * ★ 왜 — 카드가 AI 가 낸 긴 문단으로 시작하면 사람은 「무엇과 무엇이 부딪히는지」를 문단 안에서 찾아야 한다.
 *   종류마다 한 문장을 먼저 세우고, 그 밑에 두 쪽의 **제목**을 나란히 놓는다. AI 의 질문 문단은 그 아래로 내려간다.
 * ⚠ 종류가 늘면 여기 한 줄 — `Record` 라 빠뜨리면 타입이 막는다. 문장은 판단이 아니라 **모양**만 말한다
 *   (「A 가 맞다」를 여기서 말하지 않는다 — 결정은 사람 몫 · DESIGN_BRIEF §2-4).
 */
export const CONFLICT_HEADLINE: Record<ConflictKind, string> = {
  contradiction: '두 규칙이 서로 다르게 말합니다',
  stale: '한쪽이 오래된 규칙입니다',
  duplicate: '같은 규칙이 둘입니다',
  doc_vs_code: '문서와 코드가 다르게 말합니다',
  //  질문 둘은 **출처**를 말한다 — 종류는 칩(`CONFLICT_KIND_CHIP`)이 이미 말하므로 같은 말을 두 번 하지 않는다 (2026-09-11).
  //  문장은 `api.ts` 의 `madeBy`(§7.1 문서 구조화의 open_questions · 프로젝트를 만들 때 심은 씨앗)와 같은 사실이다.
  open_question: 'AI 가 문서를 읽다 남긴 질문입니다',
  seed_question: '프로젝트를 만들 때 심어 둔 기본 질문입니다',
}

/**
 * 버튼 문구의 **틀**. `{a}`·`{b}` 자리에 두 쪽의 이름(`lib/web/conflict-sides.ts` — 「지금 규칙」「옛 규칙」「문서」「코드」…)이 들어간다
 * (2026-09-10 저녁 · 「A, B 로 하지 말고」). 「쪽」 뒤에 조사를 붙여 이름의 받침과 무관하다. 채우는 문은 `fillSides()` 하나다.
 */
export const CONFLICT_SIDES: Record<DetectedConflictKind, { a: string; b: string }> = {
  contradiction: { a: '{a} 쪽이 맞음', b: '{b} 쪽이 맞음' },
  //  ⚠ 「맞음」이 아니라 「최신」이다 — 오래됨은 옳고 그름이 아니라 **시점**의 문제다
  //    (`CONFLICT_KIND_RULES.stale.hint`: 「어느 쪽이 맞는지는 판단하지 마라」).
  stale: { a: '{a} 쪽이 최신', b: '{b} 쪽이 최신' },
  //  ⚠ 「합침」이 아니라 **「만 남김」**이다 — 서버가 하는 일은 진 쪽을 `deprecated` 로
  //    보내는 것뿐이고 (`RESOLUTION_ITEM_OUTCOME`), 이긴 쪽으로 **아무것도 옮겨 오지
  //    않는다.** 「A로 합침」이라고 물으면 사람은 B 에만 있던 문장이 A 에 남는다고 믿고
  //    누른다 — 그리고 되돌릴 문이 없다 (`:resolve` 가 이미 처리된 충돌을 400 으로 막는다).
  //    표가 정말로 합치게 되면(진 쪽 `source_refs` 를 이긴 쪽에 이어 붙이면) 그때
  //    문구를 되돌려라 — `test/web-conflict-card.test.ts` 가 그 자리를 잡아 준다 (FINDINGS 76).
  duplicate: { a: '{a} 쪽만 남김', b: '{b} 쪽만 남김' },
  //  DESIGN_BRIEF §4 화면 4 「문서↔코드 카드」의 문장 그대로다.
  doc_vs_code: { a: '문서 쪽이 맞음 (코드 수정 필요)', b: '코드 쪽이 맞음 (문서 갱신)' },
}

/** 틀에 두 쪽의 이름을 채운다 — 버튼과 「정했습니다 — 「…」」가 같은 문을 쓴다. */
export function fillSides(kind: DetectedConflictKind, names: SideNames): { a: string; b: string } {
  const tpl = CONFLICT_SIDES[kind]
  return { a: tpl.a.replace('{a}', names.a.short), b: tpl.b.replace('{b}', names.b.short) }
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

/**
 * 🔴 **이 선택을 누르면 항목에 무엇이 일어나나** — 한 줄 (FINDINGS 74).
 *
 * ★ 왜 문구를 카드에서 손으로 적지 않나 — 답은 `RESOLUTION_ITEM_OUTCOME`(선택 → 진 쪽)과
 *   `CONFLICT_KIND_RULES`(가리키는 것이 항목이기는 한가)가 정하고, 그 둘을 잇는 문이
 *   `itemOutcomeOf()` 다 (`packages/schema`). 「B 항목이 폐기됩니다」를 여기 적어 두면
 *   표가 바뀌어도 화면은 옛말을 계속 한다 — **화면이 거짓말을 하는 자리**가 된다.
 *
 * ⚠ 세 갈래를 하나로 접지 마라. 「이 선택은 원래 항목을 안 건드린다」(`both`·`dismiss`)와
 *   「건드릴 항목이 이 행에 안 적혀 있다」는 **다른 말**이다. 뒤쪽을 앞쪽처럼 그리면
 *   사람은 반쪽짜리 행을 정상으로 읽는다.
 * ⚠ 상태 이름 뒤에 조사를 붙이지 않는다 — 「초안」·「검토 중」처럼 받침이 갈린다
 *   (`Decided` 의 「」 판단과 같다). 그래서 화살표로 적는다.
 * ⚠ 결정 **전**에도 **후**에도 같은 문장이다 — 시제를 타지 않아야 두 자리에서 같은
 *   함수를 쓸 수 있고, 그래야 「누르기 전에 약속한 것」과 「누른 뒤에 말하는 것」이
 *   어긋날 수 없다.
 */
export function choiceItemEffect(conflict: ConflictRow, choice: ConflictChoice, names: SideNames = FALLBACK_NAMES): string {
  const rule = RESOLUTION_ITEM_OUTCOME[choice]
  if (rule === null) return '항목은 그대로'
  const outcome = itemOutcomeOf({
    kind: conflict.kind,
    aItemId: conflict.a_item_id,
    bItemId: conflict.b_item_id,
    choice,
  })
  if (outcome === undefined) return '바꿀 항목이 적혀 있지 않음'
  //  본문에 붙인 이름과 **같은 이름**으로 부른다 — 한쪽뿐이면 그냥 「항목」이다.
  const label = conflict.b_item_id !== null ? `${names[rule.loser].short} 항목` : '항목'
  return `${label} → 「${ITEM_STATUS_CHIP[outcome.status].label}」`
}

/** 카드가 그리는 것 전부. 상태는 화면(`review/page.tsx`)이 들고 여기는 **읽기만** 한다. */
export type ConflictCardState = {
  conflict: ConflictRow
  /**
   * `anchor:'items'` 인 종류가 가리키는 두 항목. **못 찾으면 `null`** 이고, 그때 카드는
   * 빈 칸이 아니라 「못 찾았다」를 그린다.
   */
  a: ContextItemView | null
  b: ContextItemView | null
  /**
   * 🔴 **이 사람이 결정을 눌러도 되나.** `POST /conflicts/{id}:resolve` 는 **owner** 만
   * 받고 (`requireProject(…, 'owner')`), 질문에 답하는 문은 member 도 받는다.
   *
   * ★ 왜 화면이 이걸 아는가 — 모르면 member 에게 버튼 넷을 **활성**으로 그려 놓고, 누르는 족족
   *   403 을 낸다. 버튼은 그리되 잠근다(`disabled` + 밑에 이유) — 무엇을 고를 수 있는지는 보이고,
   *   누를 수 없으니 403 도 없다 (DESIGN_BRIEF §5 「버튼을 숨기지는 않는다 — 막는 것은 서버다」 · 2026-09-11).
   * ⚠ 이건 **보안이 아니라 안내**다 — 막는 것은 서버의 guard 다.
   */
  canDecide: boolean
  /**
   * 🔴 이 세션이 **쓰기 문**을 지날 수 있나 (`writeDoor()` · INBOX G13). 게스트는 등급이 member 라
   * `canDecide:false` 로 와서 「이 결정은 팀 owner 가 합니다」를 봤다 — 게스트에겐 거짓이다(로그인해도 샘플
   * 팀에서는 못 한다). 그리고 질문 카드의 [답 저장하기] 는 member 문이라 게스트에게 **활성**으로 그려졌다.
   * 닫혀 있으면 결정·답 칸을 전부 잠그고(`disabled`) 그 밑에 서버가 낼 문구(`GUEST_HINT` · `ReadOnlyNotice`)를 말한다.
   * 안 주면 열린 것으로 본다.
   */
  door?: WriteDoor
  /** 지금 칸에 쓰고 있는 글 — 탐지 카드는 **메모**, 질문 카드는 **답**이다. */
  draft: string
  /**
   * 🔴 「이 답을 무엇으로 저장할까요」 — `''` 면 **기록만** 한다 (FINDINGS 105).
   * ⚠ 자리를 묻는 카드인지는 여기서 세지 않는다 —
   *   `CONFLICT_KIND_RULES[kind].answerSlot === 'ask'` 하나가 정한다.
   */
  saveAs: AnswerSlotKey | ''
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
  onSaveAs: (value: AnswerSlotKey | '') => void
  /** 질문 카드의 답 저장 (`POST /projects/{id}/questions`). */
  onAnswer: () => void
}

export function ConflictCard({ state, on }: { state: ConflictCardState; on: ConflictCardHandlers }) {
  const { conflict } = state
  const rule = CONFLICT_KIND_RULES[conflict.kind]

  return (
    //  🔴 심각도 높음은 카드 자체가 말한다 — 왼쪽 빨간 괘선 (`data-severity` · globals.css). 사용자: 「심각도 높으면 좀 더 눈에 잘 보여야」.
    <article className="card pad col conflict-card" data-severity={conflict.severity ?? undefined}>
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

      {/* 첫 줄은 「이 카드가 무엇인지」 한 문장이다 (`CONFLICT_HEADLINE`). 탐지 카드는 그 밑에 A·B 의 제목이 나란히 서고,
          AI 의 질문 문단은 그 아래로 간다 — 질문 카드(탐지가 아닌 것)는 질문 자체가 본문이라 크게 둔다. */}
      <h3 className="conflict-head">{CONFLICT_HEADLINE[conflict.kind]}</h3>
      {/* 사람 말 한 문장 — 두 쪽이 **무엇인지**와 **무엇을 정해 달라는지** (`conflictSentence`). 두 항목이 다 있을 때만. */}
      {rule.detected && state.a !== null && state.b !== null ? (
        <ConflictSentence kind={conflict.kind as DetectedConflictKind} a={state.a} b={state.b} />
      ) : null}
      {rule.detected ? null : <p className="ink text-section">{conflict.question}</p>}

      {/* 표를 읽어서 무엇을 그릴지 고른다 — 여기에 종류 이름이 나오지 않는다. */}
      {ANCHOR_BODY[rule.anchor](state)}

      {rule.detected ? (
        <div className="col-tight">
          <span className="label">AI 가 올린 질문</span>
          {/* 문단 단위로 그린다 — 빈 줄로 갈린 문단(기록물 각주 등)이 한 덩어리로 붙지 않는다. 데모 특수 처리가 아니다 · 어느 AI 질문이든 같다. */}
          {conflict.question.split('\n\n').map((para, i) => <p key={i} className="ink-2">{para}</p>)}
        </div>
      ) : null}

      {state.error ? <ErrorState error={state.error} /> : null}

      {/* 🔴 결정·답 칸은 **누구에게나 그린다** — 못 누르는 사람에겐 전부 `disabled` 이고 그 밑에 이유가 선다 (`Blocked`).
          ★ 왜 숨기지 않나 — 이 화면의 존재 이유가 「AI 는 찾고 사람이 정한다」인데, 게스트(심사위원)에게 한 줄만 남기면
            선택지가 넷이고 하나를 고르면 진 쪽이 폐기된다는 것을 한 번도 못 본다. DESIGN_BRIEF §5: 「버튼을 숨기지는 않는다 —
            막는 것은 서버다」 (`ReadOnlyNotice`). 잠근 버튼은 403 을 낼 수 없다 — 누를 수 없으니까. */}
      {conflict.status === 'open'
        ? (rule.detected
          ? <Decision state={state} on={on} locked={!(state.canDecide && doorOpen(state))} />
          : <Answer state={state} on={on} locked={!doorOpen(state)} />)
        : <Decided state={state} />}
    </article>
  )
}

/**
 * 잠긴 결정·답 칸 밑의 이유. 문이 닫힌 주체(게스트)에겐 서버가 낼 문구 + [내 팀으로 시작하기] (`ReadOnlyNotice` · 다른 쓰기 버튼과
 * 같은 모양) · 문은 열렸는데 등급이 모자란 member 에겐 owner 문장.
 * ⚠ 「권한이 없습니다」로 끝내지 않는다 — 누구에게 말해야 하는지를 같이 낸다. 문장을 고르는 문은 `blockedText` 하나다 (INBOX G13).
 */
function Blocked({ state }: { state: Pick<ConflictCardState, 'door'> }) {
  return doorOpen(state)
    ? <p className="meta">{blockedText(state)}</p>
    : <ReadOnlyNotice reason={blockedText(state)} />
}

/**
 * 머리 밑의 사람 말 한 문장 — 두 쪽의 **이름이 굵다** (사용자: 「지금 문서 / 옛 문서 이런 걸 좀 강조하는 폰트였으면」).
 * 글자는 `conflictSentence()` 와 같다 — 조각은 굵기만 더한다 (시험은 글자를 잰다).
 */
function ConflictSentence({ kind, a, b }: { kind: DetectedConflictKind; a: ContextItemView; b: ContextItemView }) {
  const names = sideNames(a, b)
  return (
    <p className="conflict-plain">
      <b className={`side-${names.a.tone}`}>{names.a.long}</b>은 「{a.title}」, <b className={`side-${names.b.tone}`}>{names.b.long}</b>은 「{b.title}」입니다. {CONFLICT_ASK[kind]}
    </p>
  )
}

/** 쓰기 문이 열려 있나 — `door` 를 안 준 호출은 열린 것으로 본다 (서버가 어차피 막는다). */
function doorOpen(state: Pick<ConflictCardState, 'door'>): boolean {
  return state.door === undefined || state.door.open
}

/** 「이 결정은 팀 owner 가 합니다」의 정본 — 게스트가 아닌 member 에게만 참이다. */
export const OWNER_DECIDES = '이 결정은 팀장이 합니다. 아래 근거를 팀장에게 보여 주세요.'

/**
 * 결정·답 칸 대신 뜨는 한 문장. 문이 닫혔으면(게스트) 서버가 낼 문구(`writeDoor().reason` · `GUEST_HINT`)이고,
 * 열렸는데 등급이 모자라면 owner 문장이다. 두 문장을 한 자리에서 고른다 — 갈래를 카드 곳곳에 흩지 않는다.
 */
export function blockedText(state: Pick<ConflictCardState, 'door'>): string {
  return state.door !== undefined && !state.door.open ? state.door.reason : OWNER_DECIDES
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
    //  두 쪽의 이름은 항목의 사실에서 온다 (`sideNames`) — 「A」「B」가 아니다. 한쪽뿐이면 「근거」다.
    const names = sideNames(state.a, state.b)
    return (
      <div className={two ? 'sides' : 'row items-start wrap'}>
        <ItemSide name={two ? names.a : SOLO_NAME} itemId={state.conflict.a_item_id} item={state.a} />
        {two ? <ItemSide name={names.b} itemId={state.conflict.b_item_id} item={state.b} /> : null}
      </div>
    )
  },
  document: (state) => {
    const two = state.conflict.b_ref !== null
    return (
      <div className="col-tight">
        {state.conflict.a_ref ? <RefSide label={two ? '첫째 원문' : '근거'} refValue={state.conflict.a_ref} /> : null}
        {state.conflict.b_ref ? <RefSide label="둘째 원문" refValue={state.conflict.b_ref} /> : null}
      </div>
    )
  },
  //  🔴 가리킬 것이 **아직** 없는 질문이다 (씨앗 질문). 없는 근거를 그리지 않고,
  //     대신 「왜 없는지」와 「그럼 근거는 무엇이 되는지」를 말한다.
  //  ⚠ 「답이 근거가 **됩니다**」로 적지 마라 — 답한 뒤에도 이 줄이 그대로 남는다.
  //     때(時)를 타는 문장을 상태와 무관한 자리에 두면 반드시 한쪽에서 거짓말이 된다.
  //  ⚠ 「가리킬」「항목」은 이 제품 안의 낱말이라 비개발자에겐 안 읽혔다 — 사람 말로 (2026-09-11).
  none: () => (
    <p className="meta">가리키는 문서가 없어 근거가 따로 없습니다. 답이 그대로 근거입니다.</p>
  ),
}

/** 어긋난 두 항목 중 한쪽. **근거를 제목 옆에 같이 낸다** (DESIGN_BRIEF §2-1 · P7). */
function ItemSide({ name, itemId, item }: { name: SideName; itemId: string | null; item: ContextItemView | null }) {
  return (
    //  이 쪽이 **무엇인지**가 제일 크고(표제체 `.side-name`), 색은 사실의 색이다 — 지금 = 초록 위 괘선, 옛 = 주황 위 괘선 + 회색 면 (`side-*`).
    <div className={`card pad-sm col-tight grow side-card side-${name.tone}`}>
      <span className={`side-name side-${name.tone}`}>{name.long}</span>
      {item === null ? (
        <>
          {itemId === null
            ? <Note tone="warn">가리키는 항목이 적혀 있지 않습니다.</Note>
            : (
              <>
                <CtxTag itemId={itemId} />
                {/* ⚠ 「없는 항목」이라고 단정하지 않는다 — 목록을 걸러서 읽었을 수도 있다.
                    본 것만 말한다 (loop/PROMPT.md ④2). */}
                <Note tone="warn">이 항목을 목록에서 찾지 못했습니다.</Note>
              </>
            )}
        </>
      ) : (
        <>
          {/* 제목이 먼저, 크게 — 두 쪽을 나란히 놓고 견주는 자리라 제목이 곧 주장이다. 타입 기호(§ …)는 없다 (2026-09-10 저녁). */}
          <span className="side-title">{item.title}</span>
          {/* 🔴 **부딪히는 문장** — 타입별 한 줄(`lib/web/item-gist.ts`)에 이름표(규칙·제약…)를 달아서. 제목과 같으면 두 번 적지 않는다. */}
          {itemGist(item) === item.title ? null : (
            <p className="key-line"><span className="key">{ITEM_GIST_KEY[item.type]}</span>{itemGist(item)}</p>
          )}
          {item.body === '' ? null : <p className="key-line"><span className="key">설명</span>{item.body}</p>}
          {/* 낱말 풀이 — 카드의 글자 안에 있는 개발자 낱말을 사람 말로. 없으면 안 그린다. */}
          <Jargon text={`${item.title} ${itemGist(item)} ${item.body}`} />
          <div className="row wrap">
            <ItemStatusChip status={item.status} />
            <ConfidenceChip confidence={item.confidence} />
            {/* 🔴 **언제 것인가** — `stale`(오래됨) 카드가 묻는 것이 정확히 이것이다. 「1달 전」이 아니라 날짜다 (`dateText`). */}
            <span className="meta">갱신 {dateText(item.updated_at)}</span>
            <CtxTag itemId={item.id} revision={item.revision} />
          </div>
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

/**
 * @param locked 이 사람이 못 누른다(owner 아님 · 게스트). 칸은 전부 그리되 `disabled` 이고 밑에 이유(`Blocked`)가 선다 —
 *   무엇을 고를 수 있고 고르면 무슨 일이 나는지는 못 누르는 사람에게도 보여야 한다.
 */
function Decision({ state, on, locked }: { state: ConflictCardState; on: ConflictCardHandlers; locked: boolean }) {
  //  ⚠ `detected` 인 종류만 여기 온다 — 그 좁힘의 근거는 `DetectedConflictKind` 표다.
  const names = sideNames(state.a, state.b)
  const sides = fillSides(state.conflict.kind as DetectedConflictKind, names)
  //  이 카드의 선택 중 **정말로 항목을 폐기하는 것**이 하나라도 있나. 표에서 센다.
  const retires = CONFLICT_CHOICES.some((choice) => itemOutcomeOf({
    kind: state.conflict.kind,
    aItemId: state.conflict.a_item_id,
    bItemId: state.conflict.b_item_id,
    choice,
  })?.status === 'deprecated')

  return (
    <div className="col-tight">
      <label className="field">
        <span className="label">메모 (선택)</span>
        <input
          className="input"
          value={state.draft}
          maxLength={RESOLUTION_NOTE_MAX}
          placeholder="왜 그렇게 정했는지 한 줄"
          disabled={locked}
          onChange={(e) => on.onDraft(e.target.value)}
        />
      </label>
      <div className="row items-start wrap">
        {CONFLICT_CHOICES.map((choice) => (
          <div key={choice} className="col-tight">
            <button
              type="button"
              className="btn btn-sm"
              disabled={locked || state.busy}
              onClick={() => on.onChoose(choice)}
            >
              {CHOICE_LABEL[choice](sides)}
            </button>
            {/* 🔴 버튼 밑에 **그 버튼이 항목에 하는 일**을 적는다 (FINDINGS 74).
                27바퀴가 세운 「저장 전에는 약속하지 않는다」와 부딪히지 않는다 — 그건
                *안 일어날 일을 약속하지 마라*는 뜻이고, 이건 표가 **일어난다고 정한 일**이다. */}
            <span className="meta">{choiceItemEffect(state.conflict, choice, names)}</span>
          </div>
        ))}
        {state.busy ? <span className="meta">저장하는 중입니다…</span> : null}
      </div>
      {/* ⚠ 실제로 폐기되는 선택이 있을 때만 경고한다 — 아무것도 안 없어지는 카드에
          이 줄을 붙이면 사람은 누르지 않아도 될 것을 무서워한다. */}
      {retires ? (
        <Note tone="warn">
          「{ITEM_STATUS_CHIP.deprecated.label}」 항목은 다음 발행에 들어가지 않습니다.
          결정은 이 화면에서 되돌릴 수 없습니다.
        </Note>
      ) : null}
      {locked ? <Blocked state={state} /> : null}
    </div>
  )
}

// ---------------------------------------------------------------------
//  ③ 답 — 사람에게 묻는 카드 (열린 질문 · 씨앗 질문)
// ---------------------------------------------------------------------

/** @param locked 문이 닫힌 사람(게스트) — 답 칸은 그리되 전부 `disabled` 이고 밑에 이유(`Blocked`)가 선다. member 는 답할 수 있다. */
function Answer({ state, on, locked }: { state: ConflictCardState; on: ConflictCardHandlers; locked: boolean }) {
  //  🔴 자리를 물어야 하는 카드인가는 **표가 정한다.** `kind === 'open_question'` 이라고
  //     적으면 질문 종류가 늘 때 이 파일을 찾아야 하고, 못 찾으면 답 칸만 있고 항목이
  //     안 생기는 카드가 조용히 하나 는다 (FINDINGS 105 가 그 고장이었다).
  const asks = CONFLICT_KIND_RULES[state.conflict.kind].answerSlot === 'ask'
  const slot = state.saveAs === '' ? null : ANSWER_SLOTS[state.saveAs]

  return (
    <div className="col-tight">
      <label className="field">
        <span className="label">답</span>
        <textarea
          className="textarea"
          rows={3}
          value={state.draft}
          maxLength={ANSWER_MAX}
          placeholder="한두 문장이면 충분합니다."
          disabled={locked}
          onChange={(e) => on.onDraft(e.target.value)}
        />
        {/* ⚠ 상한을 손으로 적지 않는다 — 서버가 답을 담는 칸의 크기가 정본이다. */}
        <span className="meta mono">{state.draft.length} / {ANSWER_MAX}자</span>
      </label>

      {/* 🔴 **자리를 사람이 고른다.** 서버가 대신 고르면 그건 사람이 안 한 판단이고,
          아무도 안 고르게 두면 답은 기록으로만 남는다 — 그게 FINDINGS 105 였다.
          ⚠ 목록을 손으로 적지 않는다: `ANSWER_SLOT_KEYS` 에 한 줄이 늘면 여기 따라온다. */}
      {asks ? (
        <label className="field">
          <span className="label">이 답을 무엇으로 저장할까요</span>
          <select
            className="select"
            value={state.saveAs}
            disabled={locked}
            onChange={(e) => on.onSaveAs(e.target.value as AnswerSlotKey | '')}
          >
            {/* 화면 3 의 같은 고르개와 **한 낱말**이다 (`question-stack.tsx` · 2026-09-11) — 「저장하지 않고」라 해 놓고 [저장하기] 를 누르게 하면 무엇을 하는지 모른다. */}
            <option value="">항목으로 만들지 않고 답만 저장합니다</option>
            {ANSWER_SLOT_KEYS.map((key) => (
              <option key={key} value={key}>{ANSWER_SLOTS[key].label}</option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="row">
        <button
          type="button"
          className="btn btn-sm"
          disabled={locked || state.busy || state.draft.trim().length === 0}
          onClick={on.onAnswer}
        >
          답 저장하기
        </button>
        {state.busy ? <span className="meta">저장하는 중입니다…</span> : null}
      </div>

      {/* 🔴 **고른 뒤에만** 무엇이 생기는지 약속한다. 자리를 묻지 않는 카드(씨앗 질문)는
          여기서 약속하지 않는다 — 그 판정은 서버가 하고, 약속은 저장한 뒤에 **서버가 낸
          수**로 한다 (아래 `Decided`). 안 그러면 「만들어집니다」를 0개에도 말하게 된다. */}
      {asks ? (
        <p className="meta">
          {slot === null
            ? '답만 저장됩니다. 항목은 만들어지지 않습니다.'
            : `이 답이 「${slot.label}」 초안 항목 한 개가 됩니다. 발행 전까지 팀 규칙이 아닙니다.`}
        </p>
      ) : null}
      {locked ? <Blocked state={state} /> : null}
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
  const names = sideNames(state.a, state.b)

  return (
    <div className="col-tight">
      {/* ⚠ 「…「무시」**으로** 정했습니다」가 됐다. 한국어 조사는 앞 낱말의 받침에 따라
          갈리는데 버튼 문구는 넷이 제각각이다 (「무시」·「A가 맞음」). 조사를 고르는
          코드를 만드는 대신 **조사가 필요 없는 자리**로 옮겼다 — 문구가 늘어도 안 깨진다.
          눈으로 읽고 고쳤다: docs/evidence/2026-09-04-screen4/ 첫 판 ⑩. */}
      <Note tone="ok">
        {rule.detected && choice
          ? `정했습니다 — 「${CHOICE_LABEL[choice](fillSides(conflict.kind as DetectedConflictKind, names))}」`
          : '답을 저장했습니다.'}
      </Note>
      {/* 🔴 **무엇이 일어났는지**를 같이 낸다 (FINDINGS 74). 누르기 전에 보여 준
          것과 **같은 함수**라 둘이 어긋날 수 없다. 「정했습니다」만 남기면 사람은 자기가
          방금 항목 하나를 Pack 밖으로 보낸 것을 모른다. */}
      {rule.detected && choice ? <p className="meta">{choiceItemEffect(conflict, choice, names)}</p> : null}
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
