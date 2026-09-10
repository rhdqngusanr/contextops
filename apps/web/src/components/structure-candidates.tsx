'use client'

import type { StructureCandidate } from '../lib/web/queries'
import { ITEM_TYPE_LABEL } from './chips'
import { EvidenceList } from './evidence'

// =====================================================================
//  🔴 §7.1 이 낸 항목 후보를 사람이 고르는 카드 — 화면 3 (SPEC §7.1 · FINDINGS 84)
//
//  ★ 왜 이 파일이 생겼나 — **화면이 찾았다고 말하고 아무 데도 안 보냈다.**
//    구조화가 끝나면 「✓ 항목 후보 6개를 찾았습니다」와 [Context 보기] 가 떴는데,
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
  /** 지금 체크된 후보의 id. 기본은 **전부**다 (아래 ★). */
  readonly picked: ReadonlySet<string>
  readonly saving: boolean
  /** 실패 문구. `messageOf` 가 만든 것을 그대로 받는다 — 여기서 지어내지 않는다. */
  readonly error: string | null
  /** 만들고 난 뒤의 개수. `null` 이면 아직 안 만들었다. */
  readonly made: number | null
}

/**
 * 🔴 **고른 후보만 항목이 된다** (SPEC §7.1 · `POST /jobs/{jobId}/items`).
 *
 * ★ 왜 기본이 「전부 선택」인가 — 사람이 문서를 올린 뜻은 「이걸 규칙으로 만들어
 *   달라」다. 기본이 빈 선택이면 열 개를 하나씩 눌러야 하고, 그 화면은 안 쓰인다.
 *   **빼는 것이 고르는 것보다 싸야 한다.**
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
  /** `…/t/{team}/p/{project}` — [Context 보기] 가 갈 곳. */
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
        <p className="ink-ok">✓ 항목 {state.made}개를 Context 에 만들었습니다.</p>
        <span className="meta">아직 초안입니다 — Context 화면에서 승인해야 다음 Pack 에 나갑니다.</span>
        <a className="btn btn-sm" href={`${base}/context`}>Context 보기</a>
      </div>
    )
  }

  return (
    <div className="col-tight">
      <span className="label">항목으로 만들 것 고르기</span>
      <div className="col-tight">
        {state.candidates.map((c) => {
          const preview = bodyPreview(c.body)
          return (
            <label key={c.id} className="row items-start">
              <input
                type="checkbox"
                checked={state.picked.has(c.id)}
                onChange={() => onToggle(c.id)}
                disabled={state.saving}
              />
              {/* ⚠ `div` 다 — `EvidenceList` 가 `div` 를 내므로 `span` 안에 두면 잘못된 중첩이다. */}
              <div className="grow col-tight">
                <span className="row items-start">
                  <span className="grow">{c.title}</span>
                  <span className="meta">{ITEM_TYPE_LABEL[c.type]}</span>
                </span>
                {/* 🔴 무엇이 될 문장인지 · 어디서 온 문장인지 (DESIGN_BRIEF §2-1 · FINDINGS 86). */}
                {/* ⚠ `ink-4` 를 쓰지 마라 — 토큰 표(DESIGN_BRIEF §3)에서 그 값의 용도는
                    **비활성**이고 카드 바탕 위 대비가 1.6:1 이다. 사람이 고르라고 낸
                    문장을 안 보이게 그리면 이 항목을 안 고친 것과 같다. 보조 글자는 `meta`(ink-3)다. */}
                {preview === null ? null : <span className="meta">{preview}</span>}
                <EvidenceList refs={c.evidence === null ? [] : [c.evidence]} />
              </div>
            </label>
          )
        })}
      </div>
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
      {state.error === null ? null : <p className="meta ink-warn">⚠ {state.error}</p>}
    </div>
  )
}
