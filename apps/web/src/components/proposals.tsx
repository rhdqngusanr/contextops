import {
  PROPOSAL_ACTIONS, PROPOSAL_DECISIONS, PROPOSAL_NOTE_MAX, PROPOSAL_STATUSES, ROLE_RANK,
  type ContextItemView, type ProposalAction, type ProposalItem, type ProposalStatus, type TeamRole,
} from '@contextops/schema'

import { diffCounts, lineDiff, type DiffLine } from '../lib/web/diff'
import type { ProposalDetail, ProposalRow, VersionRow } from '../lib/web/queries'
import { dateText } from '../lib/web/time'
import { PROPOSAL_STATUS_CHIP, CtxTag, ProposalOperationChip, ProposalStatusChip, TypeIcon, VersionPill } from './chips'
import { EvidenceList } from './evidence'

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
 */
export function proposalEmptyMessage(status: ProposalStatus | null, whenAll: string): string {
  if (status === null) return whenAll
  return `「${PROPOSAL_STATUS_CHIP[status].label}」 상태의 제안이 없습니다. [전체] 를 누르면 모두 봅니다.`
}

export function ProposalTable({
  proposals,
  hrefOf,
  emptyMessage,
}: {
  proposals: readonly ProposalRow[]
  hrefOf: (proposal: ProposalRow) => string
  emptyMessage: string
}) {
  if (proposals.length === 0) {
    return (
      <div className="state-box">
        <span aria-hidden="true" className="ink-4">◌</span>
        <p>{emptyMessage}</p>
      </div>
    )
  }
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
            <th>올라온 날</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {proposals.map((p) => (
            <tr key={p.id}>
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
                      {p.relates_to.map((m) => <span key={m} className="ctx-tag">{m}</span>)}
                    </span>
                  )}
              </td>
              {/* 항목 수는 「무엇이 몇 개 바뀌나」다 — 모노로 그려야 표에서 세로로 읽힌다. */}
              <td className="mono">{p.items.length}</td>
              <td className="mono">{dateText(p.created_at)}</td>
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
}: {
  proposal: ProposalDetail
  /** 기준 버전 행. 못 찾으면 `null` — **uuid 를 대신 그리지 않는다.** */
  base: VersionRow | null
}) {
  return (
    <section className="card pad col">
      <div className="row-between wrap">
        <h2>{proposal.title}</h2>
        <ProposalStatusChip status={proposal.status} />
      </div>

      {proposal.summary === ''
        ? null
        : <p className="ink">{proposal.summary}</p>}

      <div className="row wrap">
        <span className="label">기준 버전</span>
        {base === null
          ? (
            //  ⚠ 「기준이 없다」와 「못 찾았다」를 같은 말로 그리지 않는다.
            <span className="meta ink-warn">
              {proposal.base_version_id === null ? '기준 버전 없음' : '⚠ 기준 버전을 찾을 수 없습니다'}
            </span>
          )
          : <VersionPill semver={base.semver} hash={base.snapshot_hash} official={base.is_official} />}
      </div>

      {proposal.relates_to.length === 0 ? null : (
        <div className="row wrap">
          <span className="label">관련 마일스톤</span>
          {proposal.relates_to.map((m) => <span key={m} className="ctx-tag">{m}</span>)}
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
      <span className="meta mono">
        <span className="ink-ok">+{counts.added}</span>{' '}
        <span className="ink-bad">−{counts.removed}</span>
        {counts.added === 0 && counts.removed === 0 ? ' · 본문이 그대로다' : ''}
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
  const draftType = item.draft?.type

  return (
    <section className="card pad col">
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
          {draftType === undefined
            ? null
            : <span className="row"><TypeIcon type={draftType} />{' '}<span className="meta">{draftType}</span></span>}
        </div>
        {item.target_item_id !== undefined && target === undefined
          ? (
            //  🔴 발행이 이 제안에서 막힌다 (`applyProposals` 가 `NOT_FOUND` 로 롤백한다).
            //     화면이 그것을 미리 말한다 — 승인해 놓고 발행에서 처음 아는 것보다 낫다.
            <span className="meta ink-warn">⚠ 대상 항목을 찾을 수 없습니다</span>
          )
          : null}
      </div>

      {item.draft === undefined
        ? null
        : <p className="ink">{item.draft.title}</p>}

      {'missing' in sides
        ? <span className="meta">{DIFF_MISSING_TEXT[sides.missing]}</span>
        : <DiffView before={sides.before} after={sides.after} />}

      <div className="col-tight">
        <span className="label">이 제안의 근거</span>
        {/* 🔴 P7 — 제안의 줄도 근거에서 온다. 근거가 0건이면 그렇게 말한다. */}
        <EvidenceList refs={item.evidence} />
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
  published: '이미 발행된 제안입니다. 팀의 공식 Pack에 들어가 있습니다.',
}

/** 누를 것이 없을 때 **왜 없는지**. 빈 칸으로 두면 사람은 화면이 덜 그려졌다고 읽는다. */
export function noActionText(status: ProposalRow['status']): string {
  //  ⚠ `submitted` 인데 누를 것이 없다 = 등급이 모자란 것뿐이다 (표의 `role`).
  if (status === 'submitted') return '승인·거절은 owner만 할 수 있습니다.'
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
  const actions = availableActions(state.status, state.role)
  const noteEmpty = state.note.trim() === ''
  const needsNote = actions.some((a) => PROPOSAL_DECISIONS[a].noteRequired)

  if (actions.length === 0) {
    return (
      <section className="card pad col-tight">
        <span className="label">결정</span>
        {/* ⚠ 「할 수 있는 것이 없다」를 빈 칸으로 두지 않는다 — 사람은 화면이 덜
            그려졌다고 읽는다. 왜 없는지가 다음 걸음을 정한다. */}
        <p className="meta">{noActionText(state.status)}</p>
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
