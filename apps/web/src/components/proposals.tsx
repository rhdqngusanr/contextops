import type { ReactNode } from 'react'

import {
  PROPOSAL_ACTIONS, PROPOSAL_DECISIONS, PROPOSAL_NOTE_MAX, PROPOSAL_STATUSES, ROLE_RANK,
  type ContextItemView, type ProposalAction, type ProposalItem, type ProposalStatus, type TeamRole,
} from '@contextops/schema'

import type { WriteDoor } from '../lib/web/actor'
import { diffCounts, lineDiff, wordDiff, type DiffLine, type WordPiece } from '../lib/web/diff'
import type { ProposalDetail, ProposalRow, VersionRow } from '../lib/web/queries'
//  🔴 낱말 `MADE`(「만든」)의 정본은 `lib/web/screens.ts` 다 — 빈 목록 문구(`EMPTY_PLACES`)와
//     같은 하나를 읽어야 세 자리가 안 갈라진다 (FINDINGS 167). 여기서 다시 적지 마라.
import { MADE } from '../lib/web/screens'
import { dateText } from '../lib/web/time'
import { PROPOSAL_STATUS_CHIP, CtxTag, ProposalOperationChip, ProposalStatusChip, VersionPill, Note } from './chips'
import { EvidenceList } from './evidence'
import { FactLine, proposalFact } from './fact-line'
import { ITEM_GIST_KEY, itemGist } from '../lib/web/item-gist'

// =====================================================================
//  화면 6 — Proposals 가 그리는 조각들 (SPEC §9 화면 6 · DESIGN_BRIEF §4 「화면 6」)
//
//  ★ 왜 화면 밖으로 뺐나 — `roadmap.tsx`·`conflict-card.tsx` 와 같은 이유다:
//    훅이 없는 순수 함수라 **시험이 모든 모양을 그려서 마크업을 읽는다.**
//    브라우저가 없는 이 환경에서 눈 판정을 게이트로 올릴 수 있는 유일한 길이다
//    (`test/web-proposals.test.ts`).
//
//  🔴 **버튼을 그릴지 말지는 `PROPOSAL_DECISIONS` 한 표가 정한다** (`@contextops/schema`).
//     여기서 `status === 'submitted' && role === 'owner'` 를 손으로 적지 마라 —
//     서버가 같은 판단을 그 표로 하고 있어서, 둘이 갈리면 **화면이 그린 버튼이 400 을
//     받는다.** 결정이 하나 늘어도 이 파일은 고칠 것이 없다.
//
//  🔴 **「작성자」 칸은 문이 생긴 뒤에 만들었다** (FINDINGS 113 · `lib/api/user.ts`).
//     56바퀴까지 이 칸이 없었던 이유는 응답에 `author_id`(uuid) 뿐이어서다 — uuid 를
//     표에 그리면 아무 뜻도 없는 글자가 남고, 사람은 그걸 「누군가」로 읽는다.
//     ⚠ 지금도 `author` 가 `null` 이면 이름을 **지어내지 않는다** (「—」다).
//     ⚠ P5 와 헷갈리지 마라 — 금지된 것은 개인 생산성 점수·순위지 「누가 냈나」가 아니다.
//
//  ⚠ 항목별 [승인]/[거절] 은 없다 — 서버의 결정은 **제안 한 장 단위**이고
//    (`proposals.status` 한 칸), 항목마다 상태를 담을 자리가 없다. DESIGN_BRIEF §4 화면 6 과
//    SPEC §9 도 이제 같은 말을 한다 (FINDINGS 114 ②) — `ProposalItemCard` 에 버튼을 그리지
//    마라. 누르면 아무 일도 안 하는 버튼이 된다. `test/web-proposals.test.ts` 「결정은 제안
//    한 장 단위다」가 문서 ↔ 스키마 ↔ 이 카드를 대조한다.
// =====================================================================

// ---------------------------------------------------------------------
//  목록 (DESIGN_BRIEF §4 화면 6 「함 목록 테이블」)
// ---------------------------------------------------------------------

/**
 * 상태로 거르는 칩 (DESIGN_BRIEF §4 화면 6 「status 필터」 · FINDINGS 112).
 *
 * 🔴 **거르는 것은 서버다** (`?status` · `ProposalQuery`). 그래서 여기엔 개수가 없다 —
 *    거른 목록만 손에 있는 화면이 「거절됨 3」을 적으면 그건 **지금 보이는 것의 수**이지
 *    그 상태의 수가 아니고, 칩을 누를 때마다 다른 숫자가 된다. 없는 수를 지어내지 않는다.
 * ⚠ 그래서 화면 4 의 종류 칩(`KindFilter`)과 달리 **다섯 종류를 늘 다 그린다** —
 *   한 장도 없는 상태를 숨기려면 그 수를 알아야 하는데, 서버가 거르는 목록에는 그 수가 없다.
 *   대신 눌러서 빈 것은 표가 「이 상태의 제안이 없습니다」로 말한다 (`emptyMessage`).
 * ★ 값도 낱말도 표에서 온다 — `PROPOSAL_STATUSES` · `PROPOSAL_STATUS_CHIP`.
 *   상태가 하나 늘면 칩이 저절로 따라오고, 손으로 적은 다섯째가 조용히 빠지지 않는다.
 */
export function ProposalStatusFilter({
  value,
  onChange,
}: {
  value: ProposalStatus | null
  onChange: (status: ProposalStatus | null) => void
}) {
  return (
    <div className="row wrap" role="group" aria-label="상태로 거르기">
      <button type="button" className="btn btn-sm" aria-pressed={value === null} onClick={() => onChange(null)}>
        전체
      </button>
      {PROPOSAL_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          className="btn btn-sm"
          aria-pressed={value === status}
          onClick={() => onChange(value === status ? null : status)}
        >
          <ProposalStatusChip status={status} />
        </button>
      ))}
    </div>
  )
}

/**
 * 거른 목록이 비었을 때 표가 말할 문장. **어느 상태가 비었는지 이름을 말한다** —
 * 「제안이 없습니다」만 적으면 사람은 그것이 칩 때문인지 진짜 빈 것인지 못 가린다.
 *
 * ⚠ 거르지 않았으면 `undefined` 다 — 그때의 문구는 `EMPTY_PLACES['proposals.list']` 가
 *   정본이다 (FINDINGS 133). 여기서 기본 문장을 한 번 더 적으면 둘이 갈린다.
 */
export function proposalEmptyMessage(status: ProposalStatus | null): string | undefined {
  if (status === null) return undefined
  return `「${PROPOSAL_STATUS_CHIP[status].label}」 상태의 제안이 없습니다. [전체] 를 누르면 모두 봅니다.`
}

/**
 * 🔴 **날짜 칸의 머리와 값은 한 자리에서 나온다** (FINDINGS 165).
 *
 * 111바퀴까지 머리는 「올라온 날」(= 제출한 날)인데 그리는 값은 `created_at`(만든 날)이었다.
 * 넷이 전부 제출된 것이던 동안에는 둘이 사실상 같았는데, 163 이 `draft` 행을 세우자
 * **아직 안 올라온 제안에 「올라온 날 2026-09-01」** 이 붙었다. 화면이 말하는 것과 값이 갈린다.
 *
 * ⚠ **제출 시각을 그리고 싶으면 머리 글자만 바꾸지 마라** — `proposals` 표에 그 칸이 없다
 *   (`db/schema.ts` · `decided_at` 은 「이 상태로 옮긴 시각」이라 `draft` 에선 늘 `null` 이다).
 *   표 → `packages/schema` → 라우트 → 여기 순으로 **같은 바퀴에** 칸을 만들어야 한다.
 * ★ 그래서 머리와 값을 이 한 줄에 묶었다 — 한쪽만 고치면 시험이 먼저 빨개진다.
 */
export const PROPOSAL_DATE_COLUMN = {
  head: `${MADE} 날`,
  of: (proposal: ProposalRow) => proposal.created_at,
} as const

/**
 * 🔴 **목록 위 한 줄은 「만든 것」과 「올린 것」을 갈라 말한다** (FINDINGS 166).
 *
 * 113바퀴까지 이 문장은 「`contextops propose` 로 **올라온** 변경 제안입니다」였다.
 * 165 가 날짜 칸에서 고친 것과 **같은 거짓말**이 여기 한 번 더 있었다 — 163 이 세운
 * `draft` 행은 `propose` 가 만들어 놓기만 하고 **아직 안 올린 것**이라, 「초안」 칩을
 * 눌러 그 한 장만 봐도 화면은 「올라온 제안입니다」라고 적었다.
 *
 * ★ 왜 화면 밖으로 뺐나 — 이 문장이 `page.tsx` 안에 있던 동안에는 165 의 게이트가
 *   **표 머리만** 물었다. 시험이 그리는 것은 조각들이지 페이지가 아니라서다.
 *   여기로 옮겨야 같은 시험이 머리와 이 문장을 **함께** 읽는다.
 * ⚠ 「올린」을 이 문장에서 지우지 마라 — 「만든 것 중 올린 것만 승인 대기로 간다」가
 *   두 낱말이 갈라져 있다는 사실 자체이고, 시험이 그 갈라짐을 잰다.
 */
export function ProposalListIntro() {
  return (
    <>
      {/* 사람 말이 먼저 (2026-09-10 저녁) — 아래 문장은 낱말이 시험에 잠겨 있어 그대로 둔다. */}
      <p className="ink-2">개발자가 「이 규칙을 이렇게 바꾸자」고 올린 것입니다. 팀장이 승인하면 다음 발행에 들어갑니다.</p>
      {/* 「승인된 제안만 다음 발행에 들어갑니다」는 윗줄이 이미 말한다 — 두 줄이 같은 말이었다 (2026-09-11). */}
      <p className="meta">
        Claude Code에서 <span className="mono ink">contextops propose</span> 로 {MADE} 변경 제안입니다.
        올린 것만 승인 대기로 갑니다.
      </p>
    </>
  )
}

/** 사실 한 줄 — 「제안 5개 — 승인 대기 1 · … 팀장이 볼 것은 승인 대기 1개입니다.」 문장의 정본은 `fact-line.tsx`. */
export function ProposalFact({ proposals }: { proposals: readonly ProposalRow[] }) {
  return <FactLine parts={proposalFact(proposals.map((p) => p.status))} />
}

/**
 * 관련 마일스톤 하나 — 「PL-M3」 만으로는 심사위원이 어느 마일스톤인지 모른다 (2026-09-11).
 * 제목을 알면 id 옆에 붙이고, 못 읽었으면 id 만 선다 — **지어내지 않는다.** 제목 표의 정본은 `lib/web/milestone-titles.ts`.
 */
export function MilestoneRef({ id, titles }: { id: string; titles?: Record<string, string> }) {
  const title = titles?.[id]
  return (
    <span className="row">
      <span className="ctx-tag">{id}</span>
      {title === undefined ? null : <span className="ink">{title}</span>}
    </span>
  )
}

export function ProposalTable({
  proposals,
  hrefOf,
  empty,
  titles,
}: {
  proposals: readonly ProposalRow[]
  hrefOf: (proposal: ProposalRow) => string
  /** 빈 자리는 `ScreenEmpty` 가 그린다 — 문구·다음 행동의 정본은 `EMPTY_PLACES` 다 (FINDINGS 133). */
  empty: ReactNode
  /** 마일스톤 id → 제목 (`useMilestoneTitles`). 없으면 id 만 그린다. */
  titles?: Record<string, string>
}) {
  if (proposals.length === 0) return <>{empty}</>
  return (
    <div className="scroll-x">
      <table className="table">
        <thead>
          <tr>
            <th>상태</th>
            <th>제목</th>
            <th>작성자</th>
            <th>관련 마일스톤</th>
            <th>항목</th>
            <th>{PROPOSAL_DATE_COLUMN.head}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {/* 팀장이 볼 것(승인 대기)은 왼쪽 주황 괘선 — 칩의 tone 이 정한다 (2026-09-11). */}
          {proposals.map((p) => (
            <tr key={p.id} data-tone={PROPOSAL_STATUS_CHIP[p.status].tone === 'warn' ? 'warn' : undefined}>
              <td><ProposalStatusChip status={p.status} /></td>
              <td className="ink">{p.title}</td>
              {/* 🔴 없는 이름을 지어내지 않는다 — 주인 없는 제안(탈퇴·기기)이 있다. */}
              <td>
                {p.author === null
                  ? <span aria-hidden="true" className="ink-4">—</span>
                  : p.author.name}
              </td>
              <td>
                {p.relates_to.length === 0
                  ? <span aria-hidden="true" className="ink-4">—</span>
                  : (
                    <span className="row wrap">
                      {p.relates_to.map((m) => <MilestoneRef key={m} id={m} titles={titles} />)}
                    </span>
                  )}
              </td>
              {/* 항목 수는 「무엇이 몇 개 바뀌나」다 — 모노로 그려야 표에서 세로로 읽힌다. */}
              <td className="mono">{p.items.length}</td>
              <td className="mono">{dateText(PROPOSAL_DATE_COLUMN.of(p))}</td>
              <td><a className="btn btn-sm" href={hrefOf(p)}>열기</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------
//  상세 — 머리 (DESIGN_BRIEF §4 화면 6 「상단 요약 + base v1.2.0」)
// ---------------------------------------------------------------------

/**
 * 🔴 **상태마다 `decided_by` 가 다른 사람이다** — 그 칸의 이름은 여기 한 표가 정한다.
 *   `decide()` 는 `submit` 에서도 `decided_*` 를 채운다 (「누가 언제 이 상태로 옮겼나」가
 *   한 칸이다). 그래서 `submitted` 의 그 사람은 **결정자가 아니라 올린 사람**이고,
 *   화면이 그걸 「승인한 사람」이라고 적으면 거짓말이 된다.
 * ⚠ `draft` 는 `null` 이다 — 아직 아무도 옮기지 않았다.
 * ⚠ `published` 는 발행 트랜잭션이 찍는 상태라 `decided_*` 는 **승인 때 것 그대로**다.
 * ★ 상태를 하나 더하면: `PROPOSAL_STATUSES` 에 값 → 이 표에 한 줄 (`Record` 라 빠뜨리면
 *   타입이 빨개진다).
 */
const DECIDED_BY_LABEL: Record<ProposalStatus, string | null> = {
  draft: null,
  submitted: '올린 사람',
  approved: '승인한 사람',
  rejected: '거절한 사람',
  published: '승인한 사람',
}

export function ProposalHead({
  proposal,
  base,
  titles,
}: {
  proposal: ProposalDetail
  /** 기준 버전 행. 못 찾으면 `null` — **uuid 를 대신 그리지 않는다.** */
  base: VersionRow | null
  /** 마일스톤 id → 제목 (`useMilestoneTitles`). 없으면 id 만 그린다. */
  titles?: Record<string, string>
}) {
  return (
    <section className="card pad col">
      <div className="row-between wrap">
        <h2>{proposal.title}</h2>
        <ProposalStatusChip status={proposal.status} />
      </div>
      {/* 상태를 사람 말 한 문장으로 — 「초안」 칩만으로는 다음에 무슨 일이 나는지 모른다 (2026-09-11). */}
      <p className="plain-line">{PROPOSAL_STATUS_SENTENCE[proposal.status]}</p>

      {proposal.summary === ''
        ? null
        : <p className="ink">{proposal.summary}</p>}

      <div className="row wrap">
        <span className="label">기준 버전</span>
        {base === null
          ? (
            //  ⚠ 「기준이 없다」와 「못 찾았다」를 같은 말로 그리지 않는다.
            <span className="meta ink-warn">
              {proposal.base_version_id === null ? '기준 버전 없음' : '기준 버전을 찾을 수 없습니다'}
            </span>
          )
          : (
            //  승인본 8자는 여기서 뺀다 — 이 자리에서 사람이 알아야 하는 것은 「어느 판을 보고 쓴 제안인가」 하나다 (2026-09-11).
            //  ⚠ 숫자 뒤에 조사를 붙이지 않는다 — `v1.0.0을`·`v1.2.0를` 처럼 마지막 숫자마다 을/를이 갈린다.
            <>
              <VersionPill semver={base.semver} official={base.is_official} />
              <span className="meta">이 판을 보고 만든 제안입니다</span>
            </>
          )}
      </div>

      {proposal.relates_to.length === 0 ? null : (
        <div className="row wrap">
          <span className="label">관련 마일스톤</span>
          {proposal.relates_to.map((m) => <MilestoneRef key={m} id={m} titles={titles} />)}
        </div>
      )}

      {/* 🔴 **누가 옮겼나**를 그 시각 옆에 적는다 (FINDINGS 116). 서버가 uuid 대신
          사람을 낸다 — 못 찾으면 「—」다 (이름을 지어내지 않는다). */}
      {DECIDED_BY_LABEL[proposal.status] === null
        //  ⚠ 아무것도 모르면 칸을 만들지 않는다 — 「올린 사람 —」 은 사람에게
        //    「이름이 지워졌다」로 읽힌다. 결정이 있었다는 사실 자체가 없는 상태다.
        || (proposal.decided_by === null && proposal.decided_at === null) ? null : (
        <div className="row wrap">
          <span className="label">{DECIDED_BY_LABEL[proposal.status]}</span>
          {proposal.decided_by === null
            ? <span aria-hidden="true" className="ink-4">—</span>
            : <span className="ink">{proposal.decided_by.name}</span>}
          {proposal.decided_at === null
            ? null
            : <span className="meta mono">{dateText(proposal.decided_at)}</span>}
        </div>
      )}

      {/* 🔴 결정 사유는 **결정된 뒤에** 제일 크게 읽혀야 한다 — 거절당한 사람이 무엇을
          고쳐야 하는지 아는 자리가 이 한 칸뿐이다 (`noteRequired`). */}
      {proposal.decision_note === null ? null : (
        <div className="col-tight">
          <span className="label">결정 사유</span>
          <p className="ink">{proposal.decision_note}</p>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------
//  상세 — 항목 카드 + before/after Diff
// ---------------------------------------------------------------------

/**
 * 항목 하나의 **before / after 본문** — 없으면 **왜 없는지**를 같이 낸다.
 *
 * 🔴 연산마다 없는 쪽이 다르다 — 그 차이를 여기 한 곳에서만 판단한다.
 *    `add` 는 before 가 없고(새 항목), `deprecate` 는 after 가 없다(본문이 통째로 빠진다).
 * 🔴 **없는 이유가 둘이고 사람이 할 일이 다르다.** 대상을 못 찾은 것(`target`)은 발행이
 *    막히는 일이고, 바꿀 본문이 없는 것(`draft`)은 사유만 있는 제안이다. 둘을 한 문장으로
 *    합치면 화면이 「대상이 지워졌다」를 「본문이 없다」로 말하게 된다 (시험이 잡았다).
 * ⚠ `update` 인데 `draft` 가 없는 제안이 있을 수 있다 (`ProposalItem` 은 대상만 요구한다).
 */
export type DiffSides =
  | { readonly before: string; readonly after: string }
  | { readonly missing: 'target' | 'draft' }

export function diffSidesOf(item: ProposalItem, target: ContextItemView | undefined): DiffSides {
  if (item.operation === 'add') {
    return item.draft === undefined ? { missing: 'draft' } : { before: '', after: item.draft.body }
  }
  //  대상 먼저 본다 — 대상이 없으면 초안이 있어도 견줄 것이 없다.
  if (target === undefined) return { missing: 'target' }
  if (item.operation === 'deprecate') return { before: target.body, after: '' }
  return item.draft === undefined ? { missing: 'draft' } : { before: target.body, after: item.draft.body }
}

/** 항목 카드의 머리 문장 — 연산별 한 줄. 「」 안은 대상(없으면 초안)의 제목. `Record` 라 연산이 늘면 타입이 막는다. */
export const PROPOSAL_ITEM_SENTENCE: Record<ProposalItem['operation'], (title: string) => string> = {
  add: (title) => `「${title}」 항목을 새로 올리자는 제안입니다.`,
  update: (title) => `「${title}」 항목을 이렇게 바꾸자는 제안입니다.`,
  deprecate: (title) => `「${title}」 항목을 폐기하자는 제안입니다.`,
}

/** 없는 쪽이 왜 없는지를 사람 말로. **표 하나** — 화면이 문장을 짓지 않는다. */
export const DIFF_MISSING_TEXT: Record<'target' | 'draft', string> = {
  target: '대상 항목이 없어 본문을 견줄 수 없습니다.',
  draft: '바꿀 본문이 없는 제안입니다 — 사유만 있습니다.',
}

/** 줄 하나. **기호 + 색**을 같이 낸다 — 색만으로 구분하지 않는다 (DESIGN_BRIEF §3). */
const DIFF_MARK: Record<DiffLine['mark'], { sign: string; className: string; label: string }> = {
  same: { sign: ' ', className: 'diff-line', label: '그대로' },
  add: { sign: '+', className: 'diff-line diff-add', label: '추가' },
  del: { sign: '-', className: 'diff-line diff-del', label: '삭제' },
}

export function DiffView({ before, after }: { before: string; after: string }) {
  const lines = lineDiff(before, after)
  const counts = diffCounts(lines)

  return (
    <div className="col-tight">
      {/* 「+1 −0」은 git 약어다 — 사람 말로 (2026-09-11). 한글이라 mono 를 쓰지 않는다 (글자 사이가 벌어진다). */}
      <span className="meta">
        {[
          counts.added > 0 ? `추가 ${counts.added}줄` : '',
          counts.removed > 0 ? `삭제 ${counts.removed}줄` : '',
        ].filter(Boolean).join(' · ') || '설명 글이 그대로입니다'}
      </span>
      <div className="scroll-x">
        <div className="diff-body">
          {lines.map((line, i) => (
            <div key={`${line.mark}-${i}`} className={DIFF_MARK[line.mark].className}>
              <span className="diff-sign mono" aria-label={DIFF_MARK[line.mark].label}>
                {DIFF_MARK[line.mark].sign}
              </span>
              {/* 빈 줄도 한 줄이다 — 지우면 위아래가 붙어서 무엇이 바뀌었는지 어긋난다. */}
              <span className="diff-text mono">{line.text === '' ? ' ' : line.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 낱말 단위 표시 — 「지금 규칙」 판에는 빠지는 낱말을 줄 긋고, 「바꾸자는 규칙」 판에는 덧붙는 낱말에 초록 면을 준다.
 * 같은 조각(`wordDiff`)을 두 판이 나눠 그린다 — 한쪽에서만 보이는 낱말은 없다.
 */
function Marked({ pieces, side }: { pieces: readonly WordPiece[]; side: 'before' | 'after' }) {
  const hide = side === 'before' ? 'add' : 'del'
  return (
    <>
      {pieces.filter((p) => p.mark !== hide).map((p, i) => (
        p.mark === 'same'
          ? <span key={i}>{p.text}</span>
          : <span key={i} className={p.mark === 'add' ? 'diff-add-text' : 'diff-del-text'}>{p.text}</span>
      ))}
    </>
  )
}

export function ProposalItemCard({
  item,
  target,
  index,
}: {
  item: ProposalItem
  /** 지금 항목 (`targets`). `add` 는 언제나 없고, 대상이 지워졌으면 없다. */
  target: ContextItemView | undefined
  index: number
}) {
  const sides = diffSidesOf(item, target)
  //  바뀐 낱말만 눈에 띄게 — 두 판이 다 있을 때 규칙 문장·설명을 낱말 단위로 견준다 (`wordDiff`).
  const gistPieces = target !== undefined && item.draft !== undefined ? wordDiff(itemGist(target), itemGist(item.draft)) : null
  const bodyPieces = target !== undefined && item.draft !== undefined ? wordDiff(target.body, item.draft.body) : null

  return (
    //  연산은 카드가 스스로 말한다 — 추가 초록 / 수정 주황 / 폐기 빨강 왼쪽 괘선 (`data-op` · globals.css).
    <section className="card pad col item-card" data-op={item.operation}>
      <div className="row-between wrap">
        <div className="row wrap">
          <span className="label">{index + 1}</span>
          <ProposalOperationChip operation={item.operation} />
          {/* 🔴 P7 — 어느 항목의 이야기인지가 카드마다 있어야 한다. `add` 는 대상이
              없지만 **초안이 받을 id** 가 이미 정해져 있다 (`ContextItemDraft.id`) —
              그 id 로 Pack 의 줄까지 이어진다. 그래서 셋 다 태그가 붙는다. */}
          {item.target_item_id === undefined
            ? (item.draft === undefined ? null : <CtxTag itemId={item.draft.id} />)
            : <CtxTag itemId={item.target_item_id} revision={target?.revision} />}
          {/* 종류 낱말(「제약」)은 여기서 뺐다 — 꼬리표 옆에 홀로 서면 무엇의 이름표인지 모른다.
              종류는 두 판의 key-line 이름표(`ITEM_GIST_KEY`)가 계속 말한다 (2026-09-11). */}
        </div>
        {item.target_item_id !== undefined && target === undefined
          ? (
            //  🔴 발행이 이 제안에서 막힌다 (`applyProposals` 가 `NOT_FOUND` 로 롤백한다).
            //     화면이 그것을 미리 말한다 — 승인해 놓고 발행에서 처음 아는 것보다 낫다.
            <Note tone="warn">대상 항목을 찾을 수 없습니다</Note>
          )
          : null}
      </div>

      {/* 사람 말 한 문장 — 이 카드가 무엇을 하자는 것인지 (연산별 표 `PROPOSAL_ITEM_SENTENCE`). */}
      <p className="conflict-plain">{PROPOSAL_ITEM_SENTENCE[item.operation](target?.title ?? item.draft?.title ?? '')}</p>

      {'missing' in sides
        ? <span className="meta">{DIFF_MISSING_TEXT[sides.missing]}</span>
        : (
          <>
            {/* 두 판 — 「지금 규칙」과 「바꾸자는 규칙」 (충돌 카드의 두 쪽과 같은 모양 · 2026-09-11). 본문(body)만 견주던 줄 diff 는
                규칙 문장(data)의 변화를 못 보여 줬다 — 한 줄 요약(`itemGist`)이 그것을 보여 주고, 줄 diff 는 접어 둔다. */}
            <div className="sides">
              {target === undefined ? null : (
                <div className="card pad-sm col-tight side-card side-neutral">
                  <span className="side-name side-neutral">지금 규칙</span>
                  <span className="ink">{target.title}</span>
                  <p className="key-line"><span className="key">{ITEM_GIST_KEY[target.type]}</span>{gistPieces ? <Marked pieces={gistPieces} side="before" /> : itemGist(target)}</p>
                  {target.body === '' ? null : <p className="key-line"><span className="key">설명</span>{bodyPieces ? <Marked pieces={bodyPieces} side="before" /> : target.body}</p>}
                </div>
              )}
              {item.draft === undefined ? (
                <div className="card pad-sm col-tight side-card side-warn">
                  <span className="side-name side-warn">폐기 뒤</span>
                  <span className="ink-2">이 항목이 다음 발행에서 빠집니다.</span>
                </div>
              ) : (
                <div className="card pad-sm col-tight side-card side-new">
                  <span className="side-name side-new">{target === undefined ? '새로 올리는 규칙' : '바꾸자는 규칙'}</span>
                  <span className="ink">{item.draft.title}</span>
                  <p className="key-line"><span className="key">{ITEM_GIST_KEY[item.draft.type]}</span>{gistPieces ? <Marked pieces={gistPieces} side="after" /> : itemGist(item.draft)}</p>
                  {item.draft.body === '' ? null : <p className="key-line"><span className="key">설명</span>{bodyPieces ? <Marked pieces={bodyPieces} side="after" /> : item.draft.body}</p>}
                </div>
              )}
            </div>
            <details>
              <summary className="meta">설명 글을 줄 단위로 비교</summary>
              <DiffView before={sides.before} after={sides.after} />
            </details>
          </>
        )}

      <div className="col-tight">
        {/* 🔴 P7 — 제안의 줄도 근거에서 온다. 근거가 0건이면 그렇게 말한다. 머리는 EvidenceList 가 든다. */}
        <EvidenceList refs={item.evidence} heading="이 제안의 근거" />
      </div>

      <div className="col-tight">
        <span className="label">이유</span>
        <p className="ink">{item.reason}</p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
//  상세 — 결정 (SPEC §5 `POST /proposals/{id}/submit|approve|reject`)
// ---------------------------------------------------------------------

/**
 * 🔴 **지금 이 제안에 쓸 수 있는 결정** — 판단의 자리는 여기 하나다.
 *
 * ⚠ `by:'author'` 인 결정은 **가릴 수가 없다** — 브라우저가 자기 `user_id` 를 모른다
 *   (세션에 있는 것은 토큰과 이메일뿐이고, 그것을 내는 문도 없다). 그래서 버튼을
 *   그리되 **누가 누를 수 있는지를 옆에 적는다** (`authorOnly`). 감추면 draft 제안이
 *   화면에서 막다른 길이 된다.
 */
export function availableActions(status: ProposalRow['status'], role: TeamRole): ProposalAction[] {
  return PROPOSAL_ACTIONS.filter((action) => {
    const rule = PROPOSAL_DECISIONS[action]
    return rule.from === status && ROLE_RANK[role] >= ROLE_RANK[rule.role]
  })
}

export interface DecisionState {
  readonly status: ProposalRow['status']
  readonly role: TeamRole
  readonly note: string
  readonly busy: ProposalAction | null
  /**
   * 🔴 이 세션이 쓰기 문을 지날 수 있나 (`writeDoor()` · INBOX G13). 게스트는 등급이 member 라
   * `availableActions` 만으로는 [승인 요청] 이 **활성**으로 그려졌고, 「owner 만」·「낸 사람만」 두 문장은
   * 게스트에겐 거짓이었다 — 로그인해도 샘플 팀에서는 못 한다. 닫혀 있으면 버튼 대신 그 이유를 말한다.
   * ⚠ 안 주면 열린 것으로 본다 — 시험이 표를 손으로 짓는 자리가 여덟이라 선택으로 뒀다.
   */
  readonly door?: WriteDoor
}

export const ACTION_LABEL: Record<ProposalAction, string> = {
  submit: '승인 요청',
  approve: '모두 승인',
  reject: '거절',
}

/**
 * 결정이 **끝난** 제안에 하는 말 3종.
 *
 * ★ 왜 표인가 — 여기 문장이 없으면 화면은 `approved` 같은 **enum 값을 사람에게 그대로**
 *   보여 준다 (덤프를 눈으로 읽다 잡았다). 화면 어디에도 영어 상태 값을 노출하지 않는
 *   것이 이 저장소의 규칙이고, 그 낱말의 정본은 칩 표(`PROPOSAL_STATUS_CHIP`)다.
 * ⚠ 「무엇이 되었나」가 아니라 **「이제 무슨 일이 일어나나」**를 적는다 — 상태는 옆의
 *   칩이 이미 말한다.
 */
export const DECIDED_TEXT: Record<'approved' | 'rejected' | 'published', string> = {
  approved: '승인된 제안입니다. 다음 발행 때 항목에 적용됩니다.',
  rejected: '거절된 제안입니다. 사유를 반영해 새 제안으로 올려주세요.',
  published: '이미 발행된 제안입니다. 팀의 공식 판(Pack)에 들어가 있습니다.',
}

/**
 * 상태 5종 전부의 **「이제 무슨 일이 나나」** 한 문장 (2026-09-11 · 사용자: 「눈이 확 안 보여서 어떻게 할지 모르겠어」).
 * 결정이 끝난 셋은 `DECIDED_TEXT` 그대로고, 앞의 둘은 다음 걸음(누가 무엇을 누르나)을 버튼 이름(`ACTION_LABEL`)으로 말한다.
 * 머리 카드와 결정 칸이 같은 문장을 읽는다 — `Record` 라 상태가 늘면 타입이 막는다.
 */
export const PROPOSAL_STATUS_SENTENCE: Record<ProposalRow['status'], string> = {
  draft: `아직 올리지 않은 초안입니다. 만든 사람이 [${ACTION_LABEL.submit}]을 누르면 팀장에게 갑니다.`,
  submitted: `팀장의 결정을 기다립니다. [${ACTION_LABEL.approve}]이면 다음 발행에 들어가고, [${ACTION_LABEL.reject}]이면 사유와 함께 돌아갑니다.`,
  approved: DECIDED_TEXT.approved,
  rejected: DECIDED_TEXT.rejected,
  published: DECIDED_TEXT.published,
}

/** 누를 것이 없을 때 **왜 없는지**. 빈 칸으로 두면 사람은 화면이 덜 그려졌다고 읽는다. */
export function noActionText(status: ProposalRow['status'], door?: WriteDoor): string {
  //  🔴 문이 닫힌 주체(게스트)에겐 등급 문장이 전부 거짓이다 — 서버가 낼 문구(`GUEST_HINT`)가 먼저다 (INBOX G13).
  if (door !== undefined && !door.open && (status === 'submitted' || status === 'draft')) return door.reason
  //  ⚠ `submitted` 인데 누를 것이 없다 = 등급이 모자란 것뿐이다 (표의 `role`).
  if (status === 'submitted') return '승인·거절은 팀장만 할 수 있습니다.'
  //  ⚠ `draft` 는 오늘은 여기까지 오지 않는다 — `submit` 이 member 부터라 늘 버튼이 있다.
  //    표의 `role` 이 owner 로 올라가면 그때 이 줄이 쓰인다 (없으면 빈 칸이 된다).
  if (status === 'draft') return '승인 요청을 할 수 있는 등급이 아닙니다.'
  return DECIDED_TEXT[status]
}

export function ProposalDecisions({
  state,
  onNote,
  onDecide,
}: {
  state: DecisionState
  onNote: (note: string) => void
  onDecide: (action: ProposalAction) => void
}) {
  //  🔴 문이 닫혔으면(게스트) 등급과 무관하게 누를 것이 없다 — 서버가 어차피 403 이다 (`refuseWrite`).
  const actions = state.door !== undefined && !state.door.open ? [] : availableActions(state.status, state.role)
  const noteEmpty = state.note.trim() === ''
  const needsNote = actions.some((a) => PROPOSAL_DECISIONS[a].noteRequired)

  if (actions.length === 0) {
    return (
      <section className="card pad col-tight">
        <span className="label">결정</span>
        {/* ⚠ 「할 수 있는 것이 없다」를 빈 칸으로 두지 않는다 — 사람은 화면이 덜
            그려졌다고 읽는다. 왜 없는지가 다음 걸음을 정한다. */}
        <p className="meta">{noActionText(state.status, state.door)}</p>
        {/* 다음 걸음 — 읽기 전용(게스트)이어도 「여기서 무슨 일이 나는지」는 보여야 한다 (2026-09-11). */}
        {state.status === 'draft' || state.status === 'submitted'
          ? <p className="plain-line">{PROPOSAL_STATUS_SENTENCE[state.status]}</p>
          : null}
      </section>
    )
  }

  return (
    <section className="card pad col">
      <span className="label">결정</span>

      {needsNote ? (
        <label className="field">
          <span className="label">사유 (거절은 필수)</span>
          <textarea
            className="textarea"
            value={state.note}
            maxLength={PROPOSAL_NOTE_MAX}
            placeholder="무엇을 고치면 되는지 적어주세요."
            onChange={(e) => onNote(e.target.value)}
          />
        </label>
      ) : null}

      <div className="row wrap">
        {actions.map((action) => {
          const rule = PROPOSAL_DECISIONS[action]
          const blocked = rule.noteRequired && noteEmpty
          return (
            <button
              key={action}
              type="button"
              //  ⚠ accent 는 화면당 하나다 (DESIGN_BRIEF §3) — 이 화면에서는 [모두 승인] 이다.
              className={action === 'approve' ? 'btn btn-primary' : 'btn'}
              disabled={state.busy !== null || blocked}
              onClick={() => onDecide(action)}
            >
              {ACTION_LABEL[action]}
            </button>
          )
        })}
      </div>

      {actions.some((a) => PROPOSAL_DECISIONS[a].by === 'author')
        ? <span className="meta">승인 요청은 이 제안을 낸 사람만 할 수 있습니다.</span>
        : null}
      {needsNote && noteEmpty
        ? <span className="meta">거절하려면 사유를 적어주세요.</span>
        : null}
    </section>
  )
}
