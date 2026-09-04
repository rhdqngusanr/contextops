import { SEED_ANSWER_MAX } from '../lib/api/seed-questions'
import type { QuestionRow } from '../lib/web/queries'
import { ErrorState } from './states'

// =====================================================================
//  질문 카드 스택 — 「문서가 없어도 됩니다」의 화면 (DESIGN_BRIEF §4 화면 3 3번 카드)
//
//  ★ 왜 화면 밖의 순수 함수인가 — `job-progress.tsx` 와 같은 이유다. 이 카드가 갖는
//    모양은 열인데(질문 없음·첫 카드·중간·마지막·요약 둘·저장 중·저장 실패·결과 둘)
//    브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 나머지 아홉은 **아무도 본 적
//    없는 채로** 배포되기 딱 좋다. 여기 훅이 없으면 시험이 열을 다 그려서 읽는다
//    (`test/web-question-stack.test.ts`).
//
//  🔴 **여기에 「어느 질문인가」에 따른 갈래를 만들지 마라.** 문구는 전부 행에 실려
//     온다 (`question`). 씨앗 질문이든 §7.1 이 문서에서 남긴 질문이든 같은 카드다 —
//     다른 것은 답이 항목이 되느냐뿐이고, 그건 서버가 정한다.
//
//  ⚠ accent 는 이 화면에서 [구조화하기] 하나다 (DESIGN_BRIEF §3). 그래서 여기 버튼은
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
        {answered > 0 ? (
          <p className="meta">
            답한 것은 <strong>초안 항목</strong>으로 만들어집니다. 초안은 발행 전까지 팀 규칙이 아닙니다.
          </p>
        ) : null}
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
          maxLength={SEED_ANSWER_MAX}
          onChange={(e) => on.onDraft(e.target.value)}
          placeholder="한두 문장이면 충분합니다."
        />
        {/* ⚠ 상한을 여기 손으로 적지 않는다 — 서버가 답을 담는 칸의 크기가 정본이다
            (`lib/api/seed-questions.ts` 의 `SEED_ANSWER_MAX`). */}
        <span className="meta mono">{state.draft.length} / {SEED_ANSWER_MAX}자</span>
      </label>

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
      <p className="ink-ok">✓ 답 {saved.resolved}개를 저장했습니다.</p>
      {/* ⚠ 「항목이 만들어졌습니다」를 답의 수로 말하지 마라 — 답했는데 항목이 안 되는
          질문이 있다 (§7.1 이 문서에서 남긴 질문은 구조화가 따로 필요하다).
          서버가 낸 수를 그대로 쓴다. */}
      <p className="meta">
        {saved.created.length > 0
          ? `초안 항목 ${saved.created.length}개가 만들어졌습니다. 발행하면 팀의 첫 버전이 됩니다.`
          : '이 답들은 기록으로 남았습니다. 항목은 만들어지지 않았습니다.'}
      </p>
      {/* ⚠ 두 수가 다르면 **왜 다른지** 말한다. 「답 3개 · 항목 2개」만 있으면 사람은
          하나가 사라진 줄 안다 (눈으로 읽고 넣었다: 첫 판 ⑨ 에 이 줄이 없었다). */}
      {saved.created.length > 0 && saved.created.length < saved.resolved ? (
        <span className="meta">
          문서를 읽다 나온 질문은 기록으로만 남습니다 — 그 답을 항목으로 만드는 것은 정리 화면의 일입니다.
        </span>
      ) : null}
      <a className="btn btn-sm" href={contextHref}>Context 보기</a>
    </div>
  )
}
