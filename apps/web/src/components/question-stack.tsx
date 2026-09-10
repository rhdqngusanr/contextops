import {
  ANSWER_MAX, ANSWER_SLOT_KEYS, ANSWER_SLOTS, CONFLICT_KIND_RULES,
  type AnswerSlotKey,
} from '@contextops/schema'

import type { QuestionRow } from '../lib/web/queries'
import { ErrorState } from './states'
import { Note } from './chips'

// =====================================================================
//  질문 카드 스택 — 「문서가 없어도 됩니다」의 화면 (DESIGN_BRIEF §4 화면 3 3번 카드)
//
//  ★ 왜 화면 밖의 순수 함수인가 — `job-progress.tsx` 와 같은 이유다. 이 카드가 갖는
//    모양은 열인데(질문 없음·첫 카드·중간·마지막·요약 둘·저장 중·저장 실패·결과 둘)
//    브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 나머지 아홉은 **아무도 본 적
//    없는 채로** 배포되기 딱 좋다. 여기 훅이 없으면 시험이 열을 다 그려서 읽는다
//    (`test/web-question-stack.test.ts`).
//
//  🔴 **여기에 `kind === …` 갈래를 만들지 마라.** 문구는 전부 행에 실려 온다
//     (`question`) — 씨앗 질문이든 §7.1 이 문서에서 남긴 질문이든 같은 카드다.
//     ⚠ **딱 하나 갈리는 것**은 「답이 갈 자리를 사람에게 묻느냐」이고, 그 판정은
//       여기서 세지 않고 **표가 한다**: `CONFLICT_KIND_RULES[kind].answerSlot`.
//       씨앗 질문은 자리가 표에 이미 있고(`seeded`), 열린 질문은 사람이 고른다(`ask`).
//       ★ 왜 표인가 — 종류가 늘 때 이 파일을 찾아야 하고, 못 찾으면 **답 칸만 있고
//         항목이 안 생기는 카드**가 조용히 하나 는다. 그게 FINDINGS 105·106 이었다
//         (105 는 화면 4 에서 닫혔는데 **같은 구멍이 이 화면에 남아 있었다**).
//       ⚠ 씨앗 질문 카드에는 고르는 칸을 그리지 마라 — 서버가 400 을 낸다
//         (`POST /projects/{id}/questions`: 「저장될 자리가 이미 정해져 있다」).
//
//  ⚠ accent 는 이 화면에서 [AI 로 정리하기] 하나다 (DESIGN_BRIEF §3). 그래서 여기 버튼은
//    전부 기본 버튼이다 — 두 카드가 서로 accent 를 다투면 눈이 갈 곳을 잃는다.
// =====================================================================

/** 스택이 그리는 것 전부. 상태는 화면(`import/page.tsx`)이 들고 여기는 **읽기만** 한다. */
export type QuestionStackState = {
  /** 아직 열려 있는 질문들. 순서가 곧 카드 순서다. */
  questions: QuestionRow[]
  /** 지금 몇 번째 카드인가. `questions.length` 면 **요약**이다. */
  index: number
  /** `question_id` → 답. 키가 없으면 **건너뛴 것**이다 (빈 답과 다르다). */
  answers: Record<string, string>
  /**
   * `question_id` → 「이 답을 무엇으로 저장할까요」 (FINDINGS 106).
   *
   * ⚠ 키가 없거나 `''` 면 **안 고른 것**이고, 그때는 답만 저장된다. 기본을
   *   항목으로 두지 않는 이유는 화면 4 와 같다 — 기본값이 있으면 사람이 고르지 않은
   *   타입의 초안이 생기고, 그건 서버가 대신 고른 것과 같다.
   * ⚠ `answerSlot: 'seeded'` 인 카드에는 값이 안 생긴다 (고르는 칸을 안 그린다).
   */
  saveAs: Record<string, AnswerSlotKey | ''>
  /** 지금 칸에 쓰고 있는 글. 카드를 넘길 때 `answers` 로 들어간다. */
  draft: string
  saving: boolean
  error: unknown
  /** 저장이 끝났으면 서버가 낸 것. 여기 값이 있으면 **요약 대신 결과**를 그린다. */
  saved: { resolved: number; created: string[] } | null
}

export type QuestionStackHandlers = {
  onDraft: (value: string) => void
  /** 지금 카드를 `answers` 에 넣고 다음으로. 건너뛰면 넣지 않는다. */
  onNext: (opts: { skip: boolean }) => void
  /** 지금 카드의 답이 갈 자리. `''` 는 「기록만」이다. */
  onSaveAs: (value: AnswerSlotKey | '') => void
  onBack: () => void
  onSave: () => void
}

export function QuestionStack({
  state,
  on,
  contextHref,
}: {
  state: QuestionStackState
  on: QuestionStackHandlers
  /** 다 끝났을 때 갈 곳. 「만들어졌다」로 끝내지 않고 **볼 수 있게** 한다. */
  contextHref: string
}) {
  const { questions, index, answers, saved } = state
  const total = questions.length

  if (saved) return <Saved saved={saved} contextHref={contextHref} />

  if (total === 0) {
    return (
      <p className="meta">
        답을 기다리는 질문이 없습니다. 문서를 올리면 판단이 필요한 것이 다시 질문으로 남습니다.
      </p>
    )
  }

  const answered = Object.keys(answers).length
  //  ⚠ 마지막 카드를 넘기면 `index === total` 이다. 그때 그리는 것은 질문이 아니라 요약이다.
  if (index >= total) {
    return (
      <div className="col">
        <p className="ink">
          {total}개 중 <strong>{answered}개</strong>에 답했습니다.
          {answered < total ? ` ${total - answered}개는 건너뛰었습니다.` : ''}
        </p>
        {/* 🔴 **저장하기 전에 무엇이 만들어지는지 말한다.** 「첫 버전이 만들어집니다」로만
            끝내면 사람은 무엇이 생기는지 모른 채 누른다 (DESIGN_BRIEF §2-1).
            ⚠ 답한 것이 0개면 이 문장을 그리지 않는다 — 만들어질 것이 없는데 「만들어집니다」
              라고 말하면 그게 없는 것을 약속하는 화면이다 (FINDINGS 66 과 같은 고장).
              눈으로 읽고 뺐다: docs/evidence/2026-09-04-screen3-questions/ 첫 판 ⑥. */}
        {answered > 0 ? <Becoming answered={answered} becoming={becomingItems(state)} /> : null}
        {state.error ? <ErrorState error={state.error} /> : null}
        <div className="row">
          <button type="button" className="btn" onClick={on.onBack} disabled={state.saving}>
            돌아가서 고치기
          </button>
          <button type="button" className="btn" onClick={on.onSave} disabled={state.saving || answered === 0}>
            {answered}개 저장하기
          </button>
          {state.saving ? <span className="meta">저장하는 중입니다…</span> : null}
        </div>
        {answered === 0 ? <span className="meta">답한 것이 하나도 없어서 저장할 것이 없습니다.</span> : null}
      </div>
    )
  }

  const current = questions[index]!
  const last = index === total - 1
  //  ⚠ 종류를 세지 않는다 — 표가 답한다 (머리 주석). 씨앗 질문이면 `seeded` 라 안 묻는다.
  const asks = CONFLICT_KIND_RULES[current.kind].answerSlot === 'ask'
  const pick = state.saveAs[current.id] ?? ''
  const slot = pick === '' ? null : ANSWER_SLOTS[pick]
  return (
    <div className="col">
      {/* 진행은 **몇 번째인가**다 (DESIGN_BRIEF 「3 / 10」). 사람 이름도 점수도 없다 (P5). */}
      <span className="meta mono">{index + 1} / {total}</span>
      <p className="ink text-section">{current.question}</p>

      <label className="field">
        <span className="label">답</span>
        <textarea
          className="textarea"
          rows={4}
          value={state.draft}
          maxLength={ANSWER_MAX}
          onChange={(e) => on.onDraft(e.target.value)}
          placeholder="한두 문장이면 충분합니다."
        />
        {/* ⚠ 상한을 여기 손으로 적지 않는다 — 서버가 답을 담는 칸의 크기가 정본이다
            (`packages/schema` 의 `ANSWER_MAX` · `ANSWER_SLOTS` 옆). */}
        <span className="meta mono">{state.draft.length} / {ANSWER_MAX}자</span>
      </label>

      {/* 🔴 **자리를 사람이 고른다** (FINDINGS 106 · 화면 4 와 같은 칸).
          묻는 카드인가는 표가 정한다 — 위 머리 주석의 이유를 읽어라.
          ⚠ 목록을 손으로 적지 않는다: `ANSWER_SLOT_KEYS` 에 한 줄이 늘면 여기 따라온다. */}
      {asks ? (
        <label className="field">
          <span className="label">이 답을 무엇으로 저장할까요</span>
          <select
            className="select"
            value={pick}
            onChange={(e) => on.onSaveAs(e.target.value as AnswerSlotKey | '')}
          >
            {/* ⚠ 「저장하지 않고」라고 해 놓고 [저장하기] 를 누르게 하면 사람은 자기가
                무엇을 하는지 모른다 (2026-09-11). 답은 **언제나 저장된다** — 갈리는 것은
                그 답이 항목까지 되느냐뿐이라 그것만 말한다. */}
            <option value="">항목으로 만들지 않고 답만 저장합니다</option>
            {ANSWER_SLOT_KEYS.map((key) => (
              <option key={key} value={key}>{ANSWER_SLOTS[key].label}</option>
            ))}
          </select>
          {/* 🔴 **고른 뒤에만** 무엇이 생기는지 약속한다. 안 고른 카드는 「안 만들어진다」를
              말한다 — 두 줄이 서로 다른 약속을 해야 사람이 고른 것이 뜻을 갖는다. */}
          <span className="meta">
            {slot === null
              ? '답만 저장됩니다. 항목은 만들어지지 않습니다.'
              : `이 답이 「${slot.label}」 초안 항목 한 개가 됩니다.`}
          </span>
        </label>
      ) : null}

      <div className="row">
        <button type="button" className="btn" onClick={() => on.onNext({ skip: false })} disabled={state.draft.trim().length === 0}>
          {last ? '답하고 마치기' : '답하고 다음'}
        </button>
        {/* DESIGN_BRIEF: 각 카드에 [건너뛰기]. **모르는 것을 지어내지 않게** 하는 문이다. */}
        <button type="button" className="btn btn-sm" onClick={() => on.onNext({ skip: true })}>
          건너뛰기
        </button>
        {index > 0 ? (
          <button type="button" className="btn btn-sm" onClick={on.onBack}>이전</button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * 🔴 **답한 것 중 「항목이 될 것」의 수** (FINDINGS 106).
 *
 * ★ 왜 세는가 — 씨앗 질문만 있던 때는 「답한 것 = 항목」이라 요약이 그냥 「만들어집니다」
 *   라고 말해도 참이었다. 문서를 올린 뒤에는 §7.1 이 남긴 열린 질문이 같은 스택에
 *   섞이고, 그중 **자리를 안 고른 것은 답만 저장된다.** 그래서 「몇 개가 항목이
 *   되나」를 저장 **전에** 말해야 한다 — 저장한 뒤에 수가 줄면 사람은 하나가 사라진
 *   줄 안다 (`Saved` 가 두 수를 갈라 말하는 것과 같은 이유).
 * ⚠ 판정을 여기서 세지 않는다: `seeded` 는 자리가 표에 이미 있어 서버가 옮기고,
 *   `ask` 는 사람이 고른 것이 있을 때만 간다.
 */
function becomingItems(state: QuestionStackState): number {
  return state.questions.filter((q) => {
    if (state.answers[q.id] === undefined) return false
    const slot = CONFLICT_KIND_RULES[q.kind].answerSlot
    if (slot === 'seeded') return true
    return slot === 'ask' && (state.saveAs[q.id] ?? '') !== ''
  }).length
}

/** 요약에서 「무엇이 만들어지나」를 말하는 한 줄. 수가 갈리면 **왜 갈리는지**까지. */
function Becoming({ answered, becoming }: { answered: number; becoming: number }) {
  if (becoming === 0) {
    return (
      <p className="meta">
        답한 {answered}개는 모두 <strong>답만 저장</strong>됩니다.
        자리를 고르지 않으면 항목은 만들어지지 않습니다.
      </p>
    )
  }
  return (
    <p className="meta">
      {becoming === answered
        ? <>답한 것은 <strong>초안 항목</strong>으로 만들어집니다.</>
        : <>그중 <strong>{becoming}개</strong>가 초안 항목으로 만들어집니다.
            나머지 {answered - becoming}개는 자리를 안 골라서 답만 저장됩니다.</>}
      {' '}초안은 발행 전까지 팀 규칙이 아닙니다.
    </p>
  )
}

/** 저장이 끝난 뒤. **몇 개가 생겼는지**를 말하고 볼 수 있는 데로 보낸다. */
function Saved({
  saved,
  contextHref,
}: {
  saved: { resolved: number; created: string[] }
  contextHref: string
}) {
  return (
    <div className="col-tight">
      <Note tone="ok">답 {saved.resolved}개를 저장했습니다.</Note>
      {/* ⚠ 「항목이 만들어졌습니다」를 답의 수로 말하지 마라 — 답했는데 항목이 안 되는
          질문이 있다 (§7.1 이 문서에서 남긴 질문은 구조화가 따로 필요하다).
          서버가 낸 수를 그대로 쓴다. */}
      <p className="meta">
        {saved.created.length > 0
          ? `초안 항목 ${saved.created.length}개가 만들어졌습니다. 발행하면 팀의 첫 버전이 됩니다.`
          : '답만 저장됐습니다. 항목은 만들어지지 않았습니다.'}
      </p>
      {/* ⚠ 두 수가 다르면 **왜 다른지** 말한다. 「답 3개 · 항목 2개」만 있으면 사람은
          하나가 사라진 줄 안다 (눈으로 읽고 넣었다: 첫 판 ⑨ 에 이 줄이 없었다).
          🔴 이유가 바뀌었다 (FINDINGS 106) — 예전에는 「열린 질문은 여기서 항목이 될 수
             없다」였고 그래서 「정리 화면의 일」이라고 적혀 있었다. 이제는 이 화면에서도
             자리를 고를 수 있으므로, 수가 갈리는 이유는 **안 고른 것**뿐이다. */}
      {saved.created.length > 0 && saved.created.length < saved.resolved ? (
        <span className="meta">
          자리를 고르지 않은 답은 답만 저장됩니다 — 정리 화면에서 다시 답하면 항목으로 만들 수 있습니다.
        </span>
      ) : null}
      <a className="btn btn-sm" href={contextHref}>Context 보기</a>
    </div>
  )
}
