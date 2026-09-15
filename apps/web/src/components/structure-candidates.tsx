'use client'

import type { StructureCandidate } from '../lib/web/queries'
import { ITEM_TYPE_LABEL, Note } from './chips'
import { EvidenceList } from './evidence'

// =====================================================================
//  🔴 §7.1 이 낸 항목 후보를 사람이 고르는 카드 — 화면 3 (SPEC §7.1 · FINDINGS 84)
//
//  ★ 왜 이 파일이 생겼나 — **화면이 찾았다고 말하고 아무 데도 안 보냈다.**
//    정리가 끝나면 「항목 후보 6개를 찾았습니다」와 [Context 보기] 가 떴는데,
//    후보는 `ai_jobs.result` 안에만 있었고 Context 는 비어 있었다. 문서를 올리는
//    길로 들어온 사람은 발행까지 갈 수 없었다.
//
//  🔴 **DESIGN_BRIEF §2-4 「AI 결과 카드는 항상 사람의 선택 버튼으로 끝난다」**가
//     이 카드의 정본이다. 그 원칙이 이 화면에서 처음으로 지켜진다.
//
//  ⚠ 그리는 것과 부르는 것을 나눈다 — 상태는 부르는 쪽(화면 3)이 들고 이 컴포넌트는
//    받아서 그리기만 한다. **이 환경에 브라우저가 없어서** 눈 판정을 마크업에서
//    글자를 뽑아서 한다 (`scripts/dump-structure-candidates.tsx`). 상태를 안에 두면
//    「저장 중」·「실패」·「만든 뒤」를 뽑아 볼 수 없다.
// =====================================================================

//  ⚠ 한 줄의 모양(`StructureCandidate`)은 `lib/web/queries.ts` 가 갖는다 — 꺼내는 함수와
//    그리는 카드가 각자 적으면 칸이 빠져도 아무 데서도 안 걸린다. 여기서는 다시 내보낸다.
export type { StructureCandidate }

/**
 * 🔴 **본문 미리보기의 길이.** 이 값은 여기 한 곳에만 산다.
 *
 * ★ 왜 자르나 — 후보가 열 줄이면 본문을 통째로 그린 카드는 스크롤이 되고, 그러면
 *   「고르기」가 「읽기」가 된다. 자른 자리에는 `…` 를 붙여 **잘렸다는 것을 말한다** —
 *   말없이 자르면 사람은 그게 문장의 끝인 줄 안다.
 */
export const CANDIDATE_BODY_CHARS = 120

/** 본문 첫 줄만, 길면 잘라서. 빈 본문은 `null` 이고 그 줄은 아예 안 그린다. */
export function bodyPreview(body: string): string | null {
  const lines = body.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  const first = lines[0]
  if (first === undefined) return null
  if (first.length > CANDIDATE_BODY_CHARS) return `${first.slice(0, CANDIDATE_BODY_CHARS)}…`
  //  뒤에 줄이 더 있으면 그것도 `…` 로 말한다 — 말없이 자르면 그게 문장의 끝인 줄 안다.
  return lines.length > 1 ? `${first}…` : first
}

export interface StructureCandidatesState {
  readonly candidates: readonly StructureCandidate[]
  /** 지금 체크된 후보의 id. 기본은 **아직 Context 에 없는 것 전부**다 (`defaultPicked` · 아래 ★). */
  readonly picked: ReadonlySet<string>
  /**
   * 🔴 **이 프로젝트에 이미 있는 항목 id** (FINDINGS 174). 여기 든 후보는 잠그고 그렇다고 말한다.
   * ★ 왜 — 화면 3 은 이전 문서의 후보로 돌아갈 수 있다. 이미 받은 후보를 또 보내면 서버는
   *   「이미 있다」로 거절하고 카드는 「항목 0개를 만들었습니다」라고 말한다 — 누르기 **전에** 말해야 한다.
   */
  readonly existing: ReadonlySet<string>
  readonly saving: boolean
  /** 실패 문구. `messageOf` 가 만든 것을 그대로 받는다 — 여기서 지어내지 않는다. */
  readonly error: string | null
  /** 만들고 난 뒤의 개수. `null` 이면 아직 안 만들었다. */
  readonly made: number | null
  /** 만들면서 서버가 충돌 탐지 job 을 시작했나 (`acceptJobItems` 의 `job_id` · FINDINGS 174). */
  readonly detecting: boolean
}

/**
 * 기본 선택 — **아직 Context 에 없는 후보 전부**다 (FINDINGS 174).
 * ⚠ 이미 있는 것을 넣으면 돌아온 사람이 전부 선택된 목록을 그대로 눌러 거절만 받는다.
 */
export function defaultPicked(
  candidates: readonly StructureCandidate[],
  existing: ReadonlySet<string>,
): Set<string> {
  return new Set(candidates.filter((c) => !existing.has(c.id)).map((c) => c.id))
}

/**
 * 🔴 **고른 후보만 항목이 된다** (SPEC §7.1 · `POST /jobs/{jobId}/items`).
 *
 * ★ 왜 기본이 「전부 선택」인가 — 사람이 문서를 올린 뜻은 「이걸 규칙으로 만들어
 *   달라」다. 기본이 빈 선택이면 열 개를 하나씩 눌러야 하고, 그 화면은 안 쓰인다.
 *   **빼는 것이 고르는 것보다 싸야 한다.** (단 이미 Context 에 있는 것은 뺀다 — `defaultPicked`.)
 * ⚠ 만든 항목은 `draft` 다 — 받아들였다고 Pack 에 나가지 않는다. 다음 문은 화면 5 의
 *   승인이다 (FINDINGS 79). 캡션이 그 사실을 **누르기 전에** 말한다 — 누른 뒤에만
 *   말하면 사람은 「발행됐다」고 믿고 화면을 떠난다.
 */
export function StructureCandidates({
  state,
  base,
  onToggle,
  onAccept,
}: {
  state: StructureCandidatesState
  /** `…/t/{team}/p/{project}` — [Context 보기] · [정리 보기] 가 갈 곳. */
  base: string
  onToggle: (id: string) => void
  onAccept: () => void
}) {
  if (state.candidates.length === 0) {
    //  ⚠ 「0개를 찾았다」와 「못 읽었다」는 부르는 쪽에서 이미 갈렸다. 여기는 진짜 0개다.
    return <p className="meta">받아들일 항목 후보가 없습니다. 질문 카드부터 답해 보세요.</p>
  }

  if (state.made !== null) {
    return (
      <div className="col-tight">
        <Note tone="ok">항목 {state.made}개를 Context 에 만들었습니다.</Note>
        {/* ⚠ 「Pack」은 이 문장에서 **갈 곳 이름**으로 읽힌다 — 비개발자는 거기서 멈춘다.
            「버전」은 이 화면의 다른 자리(빈 상태의 「아직 발행된 버전이 없습니다」)와 같은 낱말이다 (2026-09-11). */}
        <span className="meta">아직 초안입니다 — Context 화면에서 승인해야 다음 버전에 들어갑니다.</span>
        {/* 🔴 받아들인 것이 있으면 서버가 충돌 탐지를 같이 시작했다 (FINDINGS 174) — 결과가 뜨는 곳을 여기서 말한다.
            ⚠ 무엇과 견주는지를 부풀리지 않는다: 방금 만든 초안끼리, 그리고 이미 승인된 규칙과다 (§7.2 · 같은 종류끼리). */}
        {state.detecting ? (
          <span className="meta">
            방금 만든 초안끼리, 그리고 이미 승인된 규칙과 어긋나는 곳이 있는지 AI 가 찾기 시작했습니다. 결과는 정리 화면에 뜹니다.
          </span>
        ) : null}
        <div className="row wrap">
          <a className="btn btn-sm" href={`${base}/context`}>Context 보기</a>
          {state.detecting ? <a className="btn btn-sm" href={`${base}/review`}>정리 보기</a> : null}
        </div>
      </div>
    )
  }

  //  🔴 **이미 전부 받은 문서** (FINDINGS 174) — 고를 것이 없으니 버튼 대신 그 사실을 **한 번** 말하고 갈 곳을 준다.
  //  ⚠ 목록은 지우지 않는다 — AI 가 문서에서 무엇을 뽑았고 어디서 왔는지는 받은 뒤에도 읽을 거리다. 샘플 팀의 화면 3 이
  //    정확히 이 모양이다(씨앗이 goals 후보를 전부 Context 에 넣어 둔다 · `lib/demo/seed.ts`) — 목록을 지우면 심사위원이
  //    이 제품의 첫 AI 결과를 못 본다. 체크 칸과 줄마다의 「이미 있습니다」는 안 그린다 — 같은 말이 스무 번 서면 목록이 이름표로 덮인다.
  const allInContext = state.candidates.every((c) => state.existing.has(c.id))

  return (
    <div className="col-tight">
      {allInContext ? (
        <Note tone="ok">이 문서의 항목 후보 {state.candidates.length}개는 모두 Context 에 있습니다.</Note>
      ) : (
        <span className="label">항목으로 만들 것 고르기</span>
      )}
      {/* 목록이 제 안에서 구른다 — 25장이면 카드가 3,000px 로 늘어나 옆 칸이 빈 채로 남았다 (2026-09-11 · 높이는 `--pick-list-h`). */}
      <div className="col-tight pick-list">
        {state.candidates.map((c) => {
          const preview = bodyPreview(c.body)
          //  이미 Context 에 있는 후보 — 잠근다. 다시 보내면 서버가 「이미 있다」로 거절한다 (FINDINGS 174).
          const inContext = state.existing.has(c.id)
          //  ⚠ `div` 다 — `EvidenceList` 가 `div` 를 내므로 `span` 안에 두면 잘못된 중첩이다.
          const body = (
            <div className="grow col-tight">
              <span className="row items-start">
                <span className="grow">{c.title}</span>
                <span className="meta">{ITEM_TYPE_LABEL[c.type]}</span>
              </span>
              {inContext && !allInContext ? <span className="meta">이미 Context 에 있습니다</span> : null}
              {/* 🔴 무엇이 될 문장인지 · 어디서 온 문장인지 (DESIGN_BRIEF §2-1 · FINDINGS 86). */}
              {/* ⚠ `ink-4` 를 쓰지 마라 — 토큰 표(DESIGN_BRIEF §3)에서 그 값의 용도는
                  **비활성**이고 카드 바탕 위 대비가 1.6:1 이다. 사람이 고르라고 낸
                  문장을 안 보이게 그리면 이 항목을 안 고친 것과 같다. 보조 글자는 `meta`(ink-3)다. */}
              {preview === null ? null : <span className="meta">{preview}</span>}
              {/* 머리(「근거」)는 안 단다 — 25줄에 같은 이름표가 25번 서면 목록이 이름표로 덮인다 (2026-09-11). */}
              <EvidenceList refs={c.evidence === null ? [] : [c.evidence]} heading={null} />
            </div>
          )
          //  전부 있으면 고를 칸이 없는 **읽기 전용** 줄이다.
          if (allInContext) return <div key={c.id} className="row items-start">{body}</div>
          return (
            <label key={c.id} className="row items-start">
              <input
                type="checkbox"
                checked={!inContext && state.picked.has(c.id)}
                onChange={() => onToggle(c.id)}
                disabled={state.saving || inContext}
              />
              {body}
            </label>
          )
        })}
      </div>
      {allInContext ? (
        <div className="row wrap">
          <a className="btn btn-sm" href={`${base}/context`}>Context 보기</a>
        </div>
      ) : (
        <div className="row items-start wrap">
          <button
            type="button"
            className="btn btn-sm"
            disabled={state.saving || state.picked.size === 0}
            onClick={onAccept}
          >
            {state.saving ? '만드는 중…' : `고른 ${state.picked.size}개를 항목으로 만들기`}
          </button>
          {/* 🔴 누르기 **전에** 무엇이 되는지 말한다 — 「승인」이 아니라 「초안」이다. */}
          <span className="meta">초안으로 들어갑니다 · 승인은 Context 화면에서 합니다</span>
        </div>
      )}
      {state.error === null ? null : <Note tone="warn">{state.error}</Note>}
    </div>
  )
}
