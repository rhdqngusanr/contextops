import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getTableColumns } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  PROPOSAL_ACTIONS, PROPOSAL_DECISIONS, PROPOSAL_STATUSES, ROLE_RANK, TEAM_ROLES,
  ProposalItem as ProposalItemSchema,
  type ContextItemDraft, type ContextItemView, type ProposalItem, type ProposalStatus, type TeamRole,
} from '@contextops/schema'

import {
  DECIDED_TEXT, DIFF_MISSING_TEXT, DiffView, ProposalDecisions, ProposalHead, ProposalItemCard,
  PROPOSAL_DATE_COLUMN, ProposalListIntro, ProposalStatusFilter, ProposalTable, availableActions,
  diffSidesOf,
  proposalEmptyMessage,
} from '../src/components/proposals'
import { PROPOSAL_STATUS_CHIP } from '../src/components/chips'
import { ScreenEmpty } from '../src/components/states'
import { EMPTY_PLACES, MADE } from '../src/lib/web/screens'
import { milestoneTitlesOf } from '../src/lib/web/milestone-titles'
import { diffCounts, lineDiff } from '../src/lib/web/diff'
import { dateText } from '../src/lib/web/time'
import { proposals } from '../src/db/schema'
import type { ProposalDetail, ProposalRow, VersionRow } from '../src/lib/web/queries'

// =====================================================================
//  🔴 화면 6(Proposals)의 **모든 모양을 그려서 읽는다** (loop/PROMPT.md ⑦3층)
//
//  ★ 왜 — 브라우저로는 그때 마침 그 모양인 하나밖에 못 본다. 「대상 항목이 지워진
//    제안」「본문이 없는 update」「거절 사유를 안 적은 owner」는 사람이 손으로 만들기
//    어려운 상태라, 그냥 두면 **아무도 본 적 없는 채로** 배포된다.
//
//  재는 것:
//    ① 🔴 **버튼은 `PROPOSAL_DECISIONS` 표가 정한다** — 화면이 조건을 다시 적지 않았다
//      (상태 5종 × 등급 2종 열 갈래를 전부 표와 대조한다)
//    ② 🔴 **거절은 사유가 없으면 못 누른다** (`noteRequired`) — 서버도 같은 표로 막는다
//    ③ 없는 것을 그리지 않는다 — 기준 버전을 못 찾으면 uuid 를 대신 그리지 않는다 ·
//      대상 항목이 없으면 「빈 before」가 아니라 **그렇게 말한다**
//    ④ 🔴 **P7** — 항목 카드마다 근거가 붙고, 근거 0건은 「근거 없음」이라고 말한다
//    ⑤ 🔴 **P1** — 화면 어디에도 코드 본문이 없다 (근거는 경로·줄뿐)
//    ⑥ diff 가 사람이 믿을 만한가 — 줄 하나가 끼어도 그 아래가 전부 바뀌지 않는다
//    ⑦ 빈 목록·빈 상태를 그린다
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴. 그건 캡처가 있어야 한다
//    (`docs/STATUS.md` 「눈 판정 대기」).
// =====================================================================

const PROPOSAL_ID = '00000000-0000-4000-8000-0000000000a1'
const BASE_VERSION_ID = '00000000-0000-4000-8000-0000000000b1'

function row(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: PROPOSAL_ID,
    project_id: '00000000-0000-4000-8000-0000000000c1',
    author: { id: '00000000-0000-4000-8000-0000000000d1', name: '박제안' },
    status: 'submitted',
    title: '재시도 정책을 코드에 맞춘다',
    summary: '문서는 5회인데 코드가 3회다.',
    base_version_id: BASE_VERSION_ID,
    items: [item()],
    relates_to: ['PL-M1'],
    client_request_id: '00000000-0000-4000-8000-0000000000e1',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: '2026-09-05T02:00:00.000Z',
    ...overrides,
  }
}

function detail(overrides: Partial<ProposalDetail> = {}): ProposalDetail {
  return { ...row(), targets: [target()], ...overrides }
}

/** 초안 하나. **타입을 명시한다** — `ContextItemDraft` 는 타입별로 `data` 가 갈리는
 *  union 이라, 주석 없이 적으면 TS 가 엉뚱한 갈래로 좁힌다. */
const DRAFT: ContextItemDraft = {
  id: 'item_retry_policy',
  type: 'policy',
  title: '결제 재시도 정책',
  body: '재시도는 3회까지.\n간격은 지수 백오프.',
  scope: { kind: 'project' },
  priority: 50,
  source_refs: [{ kind: 'manual', note: '팀 결정' }],
  tags: [],
  confidence: 'high',
  data: { rule: '재시도는 3회까지', severity: 'must', enforcement: 'review' },
}

function item(overrides: Partial<ProposalItem> = {}): ProposalItem {
  return {
    operation: 'update',
    target_item_id: 'item_retry_policy',
    draft: DRAFT,
    evidence: [{
      kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts',
      start_line: 14, end_line: 20, commit_sha: 'a'.repeat(40),
    }],
    reason: '코드가 정본이다',
    ...overrides,
  }
}

function target(overrides: Partial<ContextItemView> = {}): ContextItemView {
  return {
    id: 'item_retry_policy',
    project_id: '00000000-0000-4000-8000-0000000000c1',
    type: 'policy',
    title: '결제 재시도 정책',
    body: '재시도는 5회까지.\n간격은 고정 500ms.',
    status: 'active',
    scope: { kind: 'project' },
    priority: 50,
    source_refs: [{ kind: 'manual', note: '문서에서' }],
    tags: [],
    confidence: 'medium',
    revision: 3,
    updated_at: '2026-08-04T00:00:00.000Z',
    data: { rule: '재시도는 5회까지', severity: 'must', enforcement: 'review' },
    ...overrides,
  } as ContextItemView
}

const VERSION: VersionRow = {
  id: BASE_VERSION_ID,
  semver: '1.2.0',
  snapshot_hash: '3f9c2e1a'.repeat(8),
  published_by: '00000000-0000-4000-8000-0000000000f1',
  published_at: '2026-09-01T00:00:00.000Z',
  change_summary: null,
  is_official: true,
}

const html = (node: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(node)

/** 「본문이 둘 다 있다」를 단언하고 꺼낸다 — 없으면 그 자리에서 시험이 죽는다. */
function sidesOf(item: ProposalItem, target: ContextItemView | undefined): { before: string; after: string } {
  const sides = diffSidesOf(item, target)
  if ('missing' in sides) throw new Error(`본문이 없다: ${sides.missing}`)
  return sides
}

// ---------------------------------------------------------------------
//  ⑥ diff — 화면이 「무엇이 달라지나」라고 말하는 자리
// ---------------------------------------------------------------------

describe('줄 단위 diff (DESIGN_BRIEF §4 화면 6)', () => {
  it('빈 본문은 0줄이다 — 새 항목이 「1줄 삭제」로 보이지 않는다', () => {
    expect(lineDiff('', 'a\nb').map((l) => l.mark)).toEqual(['add', 'add'])
    expect(lineDiff('a\nb', '').map((l) => l.mark)).toEqual(['del', 'del'])
    expect(lineDiff('', '')).toEqual([])
  })

  it('🔴 줄 하나가 끼어도 그 아래가 전부 바뀌지 않는다 (LCS)', () => {
    const lines = lineDiff('a\nb\nc', 'a\nx\nb\nc')
    expect(lines.map((l) => l.mark)).toEqual(['same', 'add', 'same', 'same'])
    expect(diffCounts(lines)).toEqual({ added: 1, removed: 0 })
  })

  it('같은 자리의 삭제가 추가보다 먼저 나온다 — 위에서 아래로 읽는 순서다', () => {
    const lines = lineDiff('old', 'new')
    expect(lines.map((l) => `${l.mark}:${l.text}`)).toEqual(['del:old', 'add:new'])
  })

  it('줄 번호는 있는 쪽에만 붙는다', () => {
    const [del, add] = lineDiff('old', 'new')
    expect(del).toMatchObject({ beforeNo: 1, afterNo: null })
    expect(add).toMatchObject({ beforeNo: null, afterNo: 1 })
  })

  it('바뀐 것이 없으면 화면이 그렇게 말한다 — git 약어(+0 −0)가 아니라 사람 말이다', () => {
    const markup = html(createElement(DiffView, { before: '같다', after: '같다' }))
    expect(markup).toContain('설명 글이 그대로입니다')
    expect(markup).not.toContain('추가')
    expect(markup).not.toContain('+0')

    //  바뀐 줄이 있으면 「추가 n줄 · 삭제 n줄」 — 0인 쪽은 적지 않는다.
    const changed = html(createElement(DiffView, { before: 'a\nb', after: 'a\nx\nb' }))
    expect(changed).toContain('추가 1줄')
    expect(changed).not.toContain('삭제')
  })

  it('🔴 추가·삭제를 색만으로 구분하지 않는다 — 기호와 라벨이 같이 나간다', () => {
    const markup = html(createElement(DiffView, { before: '5회', after: '3회' }))
    expect(markup).toContain('aria-label="추가"')
    expect(markup).toContain('aria-label="삭제"')
    expect(markup).toContain('diff-add')
    expect(markup).toContain('diff-del')
  })
})

// ---------------------------------------------------------------------
//  ③ 연산 3종이 실제로 다른 것을 그린다
// ---------------------------------------------------------------------

describe('🔴 연산 3종이 before/after 를 다르게 가른다 (`diffSidesOf`)', () => {
  it('add 는 before 가 없다', () => {
    const sides = diffSidesOf(item({ operation: 'add', target_item_id: undefined }), undefined)
    expect(sides).toEqual({ before: '', after: '재시도는 3회까지.\n간격은 지수 백오프.' })
  })

  it('deprecate 는 after 가 없다 — 본문이 통째로 빠진다', () => {
    const sides = diffSidesOf(item({ operation: 'deprecate', draft: undefined }), target())
    expect(sides).toEqual({ before: '재시도는 5회까지.\n간격은 고정 500ms.', after: '' })
  })

  it('update 는 지금 항목의 본문이 before 다', () => {
    expect(sidesOf(item(), target()).before).toBe('재시도는 5회까지.\n간격은 고정 500ms.')
  })

  it('🔴 대상을 못 찾으면 그렇게 말한다 — 빈 before 로 그리면 update 가 add 처럼 보인다', () => {
    expect(diffSidesOf(item(), undefined)).toEqual({ missing: 'target' })
  })

  it('🔴 「대상이 없다」와 「바꿀 본문이 없다」를 한 말로 합치지 않는다', () => {
    expect(diffSidesOf(item({ draft: undefined }), target())).toEqual({ missing: 'draft' })
    //  둘은 사람이 할 일이 다르다 — 앞엣것은 발행이 막히는 일이다.
    expect(DIFF_MISSING_TEXT.target).not.toBe(DIFF_MISSING_TEXT.draft)
  })
})

// ---------------------------------------------------------------------
//  ④⑤ 항목 카드
// ---------------------------------------------------------------------

describe('항목 카드 (DESIGN_BRIEF §4 화면 6 「항목별 카드」)', () => {
  it('연산 배지 · 대상 · 근거 · 이유가 다 있다 (P7)', () => {
    const markup = html(createElement(ProposalItemCard, { item: item(), target: target(), index: 0 }))
    expect(markup).toContain('항목 수정')
    expect(markup).toContain('item_retry_policy')
    expect(markup).toContain('개정 3')
    expect(markup).toContain('src/payment/retry.ts:14–20')
    expect(markup).toContain('코드가 정본이다')
  })

  it('🔴 P1 — 근거는 경로·줄·커밋뿐이고 코드 본문이 없다고 말한다', () => {
    const markup = html(createElement(ProposalItemCard, { item: item(), target: target(), index: 0 }))
    expect(markup).toContain('코드 본문은 서버에 없습니다')
  })

  it('근거가 0건이면 「근거 없음」이라고 말한다', () => {
    const markup = html(createElement(ProposalItemCard, {
      item: item({ evidence: [] }), target: target(), index: 0,
    }))
    expect(markup).toContain('근거 없음')
  })

  it('🔴 대상 항목이 없으면 그렇게 말한다 — 발행이 이 제안에서 막힌다', () => {
    const markup = html(createElement(ProposalItemCard, { item: item(), target: undefined, index: 0 }))
    expect(markup).toContain('대상 항목을 찾을 수 없습니다')
    expect(markup).toContain(DIFF_MISSING_TEXT.target)
  })

  it('본문을 안 바꾸는 update 는 사유만 있다고 말한다', () => {
    const markup = html(createElement(ProposalItemCard, {
      item: item({ draft: undefined }), target: target(), index: 0,
    }))
    expect(markup).toContain(DIFF_MISSING_TEXT.draft)
  })
})

// ---------------------------------------------------------------------
//  머리 — 기준 버전
// ---------------------------------------------------------------------

describe('제안 머리 (DESIGN_BRIEF §4 화면 6 「상단 요약 + base v1.2.0」)', () => {
  it('기준 버전을 찾으면 semver 로 그린다', () => {
    const markup = html(createElement(ProposalHead, { proposal: detail(), base: VERSION }))
    expect(markup).toContain('v1.2.0')
    expect(markup).toContain('PL-M1')
  })

  it('🔴 못 찾으면 uuid 를 대신 그리지 않는다', () => {
    const markup = html(createElement(ProposalHead, { proposal: detail(), base: null }))
    expect(markup).toContain('기준 버전을 찾을 수 없습니다')
    expect(markup).not.toContain(BASE_VERSION_ID)
  })

  it('기준이 아예 없는 제안과 못 찾은 제안을 같은 말로 그리지 않는다', () => {
    const markup = html(createElement(ProposalHead, {
      proposal: detail({ base_version_id: null }), base: null,
    }))
    expect(markup).toContain('기준 버전 없음')
  })

  it('🔴 **누가 결정했나**를 그린다 — uuid 가 아니라 이름이다 (FINDINGS 116)', () => {
    const markup = html(createElement(ProposalHead, {
      proposal: detail({
        status: 'approved',
        decided_by: { id: '00000000-0000-4000-8000-0000000000f1', name: '최결정' },
        decided_at: '2026-09-05T03:00:00.000Z',
      }),
      base: VERSION,
    }))
    expect(markup).toContain('승인한 사람')
    expect(markup).toContain('최결정')
    //  🔴 uuid 는 화면에 없다 — 뜻 없는 글자를 사람 이름 자리에 그리지 않는다.
    expect(markup).not.toContain('00000000-0000-4000-8000-0000000000f1')
    //  ⚠ 작성자와 **다른 사람**이다 (서버가 별칭으로 두 번 join 한다).
    expect(markup).toContain('최결정')
  })

  it('🔴 상태마다 그 사람의 이름이 갈린다 (`DECIDED_BY_LABEL` 표) — draft 는 아예 안 그린다', () => {
    const person = { id: '00000000-0000-4000-8000-0000000000f1', name: '최결정' }
    const drawn = (status: ProposalStatus) => html(createElement(ProposalHead, {
      proposal: detail({ status, decided_by: person, decided_at: '2026-09-05T03:00:00.000Z' }),
      base: VERSION,
    }))
    expect(drawn('submitted')).toContain('올린 사람')
    expect(drawn('approved')).toContain('승인한 사람')
    expect(drawn('rejected')).toContain('거절한 사람')
    expect(drawn('published')).toContain('승인한 사람')
    //  🔴 아직 아무도 옮기지 않은 제안에 사람 칸을 만들지 않는다.
    expect(drawn('draft')).not.toContain('최결정')
    //  표가 상태 5종을 전부 덮는가 — 하나라도 빠지면 `Record` 가 타입에서 잡는다.
    expect(PROPOSAL_STATUSES.length).toBe(5)
  })

  it('결정이 아직 없으면 그 칸을 아예 만들지 않는다 — 「올린 사람 —」 은 이름이 지워진 것처럼 읽힌다', () => {
    const markup = html(createElement(ProposalHead, {
      proposal: detail({ status: 'submitted', decided_by: null, decided_at: null }),
      base: VERSION,
    }))
    expect(markup).not.toContain('올린 사람')
  })

  it('🔴 결정자를 못 찾으면 이름을 지어내지 않는다 (탈퇴·기기)', () => {
    const markup = html(createElement(ProposalHead, {
      proposal: detail({ status: 'approved', decided_by: null, decided_at: '2026-09-05T03:00:00.000Z' }),
      base: VERSION,
    }))
    expect(markup).toContain('승인한 사람')
    expect(markup).toContain('—')
    expect(markup).toContain('2026-09-05')
  })

  it('🔴 거절 사유는 결정된 뒤에 화면에 남는다 — 무엇을 고칠지 아는 자리가 여기뿐이다', () => {
    const markup = html(createElement(ProposalHead, {
      proposal: detail({ status: 'rejected', decision_note: '근거가 한 건뿐이다', decided_at: '2026-09-05T03:00:00.000Z' }),
      base: VERSION,
    }))
    expect(markup).toContain('근거가 한 건뿐이다')
    expect(markup).toContain('2026-09-05')
  })
})

// ---------------------------------------------------------------------
//  ①② 결정 — 표가 정한다
// ---------------------------------------------------------------------

describe('🔴 버튼은 `PROPOSAL_DECISIONS` 표가 정한다 (화면이 조건을 다시 적지 않는다)', () => {
  it('상태 5종 × 등급 2종이 전부 표와 같다', () => {
    for (const status of PROPOSAL_STATUSES) {
      for (const role of TEAM_ROLES) {
        const expected = PROPOSAL_ACTIONS.filter((a) => {
          const rule = PROPOSAL_DECISIONS[a]
          return rule.from === status && ROLE_RANK[role] >= ROLE_RANK[rule.role]
        })
        expect(availableActions(status, role), `${status}/${role}`).toEqual(expected)
      }
    }
  })

  it('owner 는 승인 대기 제안에서 [모두 승인]·[거절] 을 본다', () => {
    const markup = html(createElement(ProposalDecisions, {
      state: { status: 'submitted', role: 'owner', note: '', busy: null },
      onNote: () => {}, onDecide: () => {},
    }))
    expect(markup).toContain('모두 승인')
    expect(markup).toContain('거절')
    //  accent 는 화면당 하나다 — 이 화면에서는 [모두 승인] 뿐이다 (DESIGN_BRIEF §3).
    expect(markup.match(/btn-primary/g)?.length).toBe(1)
  })

  it('member 는 같은 제안에서 버튼 대신 **이유**를 본다 (FINDINGS 59 와 같은 판단)', () => {
    const markup = html(createElement(ProposalDecisions, {
      state: { status: 'submitted', role: 'member', note: '', busy: null },
      onNote: () => {}, onDecide: () => {},
    }))
    expect(markup).not.toContain('<button')
    expect(markup).toContain('팀장만')
  })

  it('🔴 거절은 사유가 없으면 못 누른다 (`noteRequired` — 서버도 같은 표로 막는다)', () => {
    const empty = html(createElement(ProposalDecisions, {
      state: { status: 'submitted', role: 'owner', note: '   ', busy: null },
      onNote: () => {}, onDecide: () => {},
    }))
    expect(empty).toContain('거절하려면 사유를 적어주세요')
    //  [모두 승인] 은 눌리고 [거절] 만 막힌다 — 둘 다 막으면 사유 칸이 승인까지 붙잡는다.
    expect(empty.match(/disabled/g)?.length).toBe(1)

    const filled = html(createElement(ProposalDecisions, {
      state: { status: 'submitted', role: 'owner', note: '근거가 한 건뿐이다', busy: null },
      onNote: () => {}, onDecide: () => {},
    }))
    expect(filled).not.toContain('disabled')
  })

  it('보내는 동안에는 아무것도 두 번 눌리지 않는다', () => {
    const markup = html(createElement(ProposalDecisions, {
      state: { status: 'submitted', role: 'owner', note: '사유', busy: 'approve' },
      onNote: () => {}, onDecide: () => {},
    }))
    expect(markup.match(/disabled/g)?.length).toBe(2)
  })

  it('draft 제안은 [승인 요청] 이 있고, 누가 누를 수 있는지 같이 적는다', () => {
    const markup = html(createElement(ProposalDecisions, {
      state: { status: 'draft', role: 'member', note: '', busy: null },
      onNote: () => {}, onDecide: () => {},
    }))
    expect(markup).toContain('승인 요청')
    //  ⚠ 브라우저가 자기 user_id 를 몰라서 미리 가릴 수 없다 — 그래서 말로 적는다.
    expect(markup).toContain('제안을 낸 사람만')
  })

  it('🔴 결정이 끝난 제안은 **다음에 무슨 일이 일어나나**를 말한다 (enum 값을 보여 주지 않는다)', () => {
    for (const status of Object.keys(DECIDED_TEXT) as (keyof typeof DECIDED_TEXT)[]) {
      const markup = html(createElement(ProposalDecisions, {
        state: { status, role: 'owner', note: '', busy: null },
        onNote: () => {}, onDecide: () => {},
      }))
      expect(markup).not.toContain('<button')
      expect(markup).toContain(DECIDED_TEXT[status])
      //  ⚠ 덤프를 눈으로 읽다 잡은 것 — 화면이 `approved` 같은 영어 상태 값을 그대로 그렸다.
      expect(markup).not.toContain(status)
    }
    //  셋이 서로 다른 말이어야 한다 — 같으면 승인과 발행이 한 상태로 읽힌다.
    expect(new Set(Object.values(DECIDED_TEXT)).size).toBe(3)
  })
})

// ---------------------------------------------------------------------
//  ⑦ 목록
// ---------------------------------------------------------------------

describe('제안 목록 (DESIGN_BRIEF §4 화면 6 「함 목록 테이블」)', () => {
  const href = (p: ProposalRow): string => `/t/a/p/b/proposals/${p.id}`

  it('상태 5종이 전부 다른 칩으로 나온다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: PROPOSAL_STATUSES.map((status, i) => row({ id: `${i}`, status })),
      hrefOf: href,
      empty: null,
    }))
    for (const status of PROPOSAL_STATUSES) expect(markup).toContain(PROPOSAL_STATUS_CHIP[status].label)
  })

  it('🔴 거르개가 상태 5종을 **표에서** 그린다 — 손으로 적은 칩이 아니다 (FINDINGS 112)', () => {
    const markup = html(createElement(ProposalStatusFilter, { value: null, onChange: () => {} }))
    expect(markup).toContain('전체')
    //  ★ 표가 늘면 칩도 는다. 하나라도 빠지면 그 상태는 **아무도 못 거르는 값**이 된다.
    for (const status of PROPOSAL_STATUSES) expect(markup, status).toContain(PROPOSAL_STATUS_CHIP[status].label)
    //  🔴 개수를 적지 않는다 — 거른 목록만 손에 있는 화면은 그 수를 모른다.
    expect(markup).not.toMatch(/\d+\s*(장|개)/)
  })

  it('고른 칩만 눌린 상태다 — 색만으로 구분하지 않는다 (`aria-pressed`)', () => {
    const none = html(createElement(ProposalStatusFilter, { value: null, onChange: () => {} }))
    const picked = html(createElement(ProposalStatusFilter, { value: 'rejected' as ProposalStatus, onChange: () => {} }))
    expect(none.match(/aria-pressed="true"/g)?.length).toBe(1)
    expect(picked.match(/aria-pressed="true"/g)?.length).toBe(1)
    expect(none).not.toBe(picked)
  })

  it('🔴 거른 목록이 비면 **어느 상태가 비었는지** 말한다', () => {
    //  ⚠ 거르지 않았을 때의 문구는 여기서 짓지 않는다 — `EMPTY_PLACES` 가 정본이다 (FINDINGS 133).
    expect(proposalEmptyMessage(null)).toBeUndefined()
    for (const status of PROPOSAL_STATUSES) {
      const text = proposalEmptyMessage(status)
      expect(text, status).toContain(PROPOSAL_STATUS_CHIP[status].label)
    }
    const markup = html(createElement(ProposalTable, {
      proposals: [],
      hrefOf: href,
      empty: createElement(ScreenEmpty, {
        slot: 'proposals.list', base: '/t/a/p/b', message: proposalEmptyMessage('rejected'),
      }),
    }))
    expect(markup).toContain(PROPOSAL_STATUS_CHIP.rejected.label)
  })

  it('🔴 작성자를 **이름으로** 그린다 — uuid 는 표에 없다 (FINDINGS 113)', () => {
    //  ★ 57바퀴까지 이 시험은 「작성자 칸이 **없다**」를 잠그고 있었다. 이름을 내는 문이
    //    없었기 때문이다 (`lib/api/user.ts` 가 생기면서 뒤집혔다). 뒤집을 때 uuid 를
    //    안 그린다는 절반은 **그대로 둔다** — 그게 이 칸이 없던 이유였다.
    const markup = html(createElement(ProposalTable, { proposals: [row()], hrefOf: href, empty: null }))
    expect(markup).toContain('작성자')
    expect(markup).toContain('박제안')
    expect(markup).not.toContain('00000000-0000-4000-8000-0000000000d1')
  })

  it('🔴 주인 없는 제안의 이름을 지어내지 않는다 — 「—」다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [row({ author: null })], hrefOf: href, empty: null,
    }))
    expect(markup).toContain('작성자')
    expect(markup).not.toContain('박제안')
    //  「알 수 없음」·「(삭제된 사용자)」 같은 말을 서버도 화면도 지어내지 않는다.
    expect(markup).not.toContain('알 수 없')
  })

  it('항목 수와 날짜를 센다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [row({ items: [item(), item()] })], hrefOf: href, empty: null,
    }))
    expect(markup).toContain('>2<')
    expect(markup).toContain('2026-09-05')
  })

  it('🔴 날짜 칸의 **머리와 값이 같은 것을 말한다** — 초안에 「올라온 날」이 붙지 않는다 (FINDINGS 165)', () => {
    //  ★ 165 는 「머리는 「올라온 날」인데 값은 `created_at`」이었다. 넷이 전부 제출된
    //    것이던 동안에는 안 보이다가, 163 이 `draft` 행을 세우자 **아직 안 올라온
    //    제안에 「올라온 날 2026-09-01」** 이 붙었다.
    const draft = row({ status: 'draft', created_at: '2026-09-01T02:00:00.000Z' })
    const markup = html(createElement(ProposalTable, { proposals: [draft], hrefOf: href, empty: null }))

    //  ① 머리는 표가 정한 그 낱말이고, 값은 그 표가 가리키는 칸이다.
    expect(markup).toContain(PROPOSAL_DATE_COLUMN.head)
    expect(markup).toContain(dateText(PROPOSAL_DATE_COLUMN.of(draft)))
    expect(PROPOSAL_DATE_COLUMN.of(draft)).toBe(draft.created_at)

    //  ② 그 낱말이 「올렸다/제출했다」를 말하면 안 된다 — `draft` 는 안 올라온 것이다.
    expect(PROPOSAL_DATE_COLUMN.head).not.toMatch(/올라온|올린|제출/)
    expect(markup).not.toContain('올라온 날')

    //  ③ 🔴 **게이트의 본체** — 제출 시각을 말하려면 담을 칸이 있어야 한다. 지금
    //     `proposals` 에는 없다. 누가 그 칸을 만드는 날 이 줄이 빨개져서, 머리 낱말을
    //     다시 고를 자리로 데려온다 (「머리만 바꾸면 같은 거짓말이 다시 선다」).
    const columns = Object.keys(getTableColumns(proposals))
    expect(columns).toContain('createdAt')
    expect(columns).not.toContain('submittedAt')
  })

  it('🔴 목록 위 설명도 **만든 것과 올린 것을 갈라 말한다** (FINDINGS 166)', () => {
    //  ★ 166 은 165 와 **같은 거짓말이 한 번 더** 있던 것이다 — 날짜 칸을 「만든 날」로
    //    고친 뒤에도 그 위 한 줄은 「`contextops propose` 로 **올라온** 변경 제안입니다」
    //    였다. 163 이 세운 `draft` 행은 만들어 놓기만 하고 아직 안 올린 것이다.
    //  ⚠ 165 의 게이트는 표 머리만 물었다 — 문장이 `page.tsx` 안에 있어서 시험이 못 읽었다.
    //    그래서 문장을 `ProposalListIntro` 로 옮기고 여기서 함께 읽는다.
    const intro = html(createElement(ProposalListIntro))

    //  ① 어디서 오는 것인지는 그대로 말한다 — 사람이 다음에 칠 명령이 이 한 줄뿐이다.
    expect(intro).toContain('contextops propose')

    //  ② 🔴 **머리와 같은 낱말이다.** 「만든 날」의 그 낱말이 이 문장에도 있어야 한다 —
    //     한쪽만 「올라온」으로 되돌리면 여기서 갈라진다.
    const madeVerb = PROPOSAL_DATE_COLUMN.head.split(' ')[0]
    expect(intro).toContain(`${madeVerb} 변경 제안`)

    //  ③ 안 올라온 것을 「올라온 제안」이라고 부르지 않는다.
    expect(intro).not.toMatch(/올라온|제출된/)

    //  ④ 🔴 **갈라 말한다** — 「만든 것」과 「올린 것」이 다르다는 말이 실제로 있어야 한다.
    //     ③만 있으면 「올린」을 통째로 지워도 초록이고, 그러면 draft 가 왜 승인 대기로
    //     안 가는지 화면이 아무 말도 안 하게 된다.
    expect(intro).toContain('올린 것만')
  })

  it('🔴 **빈 목록도 같은 낱말로 말한다** — 세 자리가 낱말 하나에서 나온다 (FINDINGS 167)', () => {
    //  ★ 167 은 165(날짜 칸) · 166(목록 위 설명)을 고친 뒤에도 **한 자리가 남아** 있던
    //    것이다. 빈 목록은 「아직 올라온 제안이 없습니다」라고 말했는데, 그 낱말이
    //    `components/` 안에 있어서 `lib/web` 의 `EMPTY_PLACES` 가 읽을 수 없었다.
    //    낱말을 `lib/web/screens.ts` 로 내려 셋이 같은 `MADE` 를 읽는다.
    const empty = EMPTY_PLACES['proposals.list'].message

    //  ① 빈 목록의 문장이 그 낱말을 쓴다.
    expect(empty).toContain(`아직 ${MADE} 제안이 없습니다`)

    //  ② 🔴 **세 자리가 같은 하나에서 나온다.** 하나만 되돌리면 여기서 갈라진다.
    const intro = html(createElement(ProposalListIntro))
    expect(PROPOSAL_DATE_COLUMN.head).toContain(MADE)
    expect(intro).toContain(MADE)

    //  ③ 안 올린 `draft` 도 이 목록에 뜬다 — 「올라온 것이 없다」는 조건이 아니다.
    expect(empty).not.toMatch(/올라온|제출된/)
  })

  it('빈 목록은 **넘겨받은 빈 상태를 그대로** 그린다 — 표가 문구를 짓지 않는다 (FINDINGS 133)', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [],
      hrefOf: href,
      empty: createElement(ScreenEmpty, { slot: 'proposals.list', base: '/t/a/p/b' }),
    }))
    expect(markup).toContain(EMPTY_PLACES['proposals.list'].message)
    //  🔴 다음 행동이 같이 온다 — 「없습니다」에서 갈 곳이 없던 것이 133 이었다.
    expect(markup).toContain('/t/a/p/b/context')
  })

  it('관련 마일스톤이 없는 제안도 칸을 비우지 않는다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [row({ relates_to: [] })], hrefOf: href, empty: null,
    }))
    expect(markup).toContain('—')
  })

  it('관련 마일스톤은 제목을 알면 id 옆에 붙이고, 모르면 id 만 — 지어내지 않는다', () => {
    const titles = milestoneTitlesOf([
      { ...target(), id: 'item_m1', type: 'roadmap', title: '재시도·타임아웃 정리', data: { milestone_id: 'PL-M1', done_when: ['a'] } } as ContextItemView,
      //  roadmap 이 아닌 항목은 표에 안 들어간다.
      target(),
    ])
    expect(titles).toEqual({ 'PL-M1': '재시도·타임아웃 정리' })

    const withTitle = html(createElement(ProposalTable, { proposals: [row()], hrefOf: href, empty: null, titles }))
    expect(withTitle).toContain('PL-M1')
    expect(withTitle).toContain('재시도·타임아웃 정리')

    const without = html(createElement(ProposalTable, { proposals: [row()], hrefOf: href, empty: null }))
    expect(without).toContain('PL-M1')
    expect(without).not.toContain('재시도·타임아웃 정리')

    //  상세 머리도 같은 조각을 읽는다.
    const head = html(createElement(ProposalHead, { proposal: detail(), base: VERSION, titles }))
    expect(head).toContain('재시도·타임아웃 정리')
  })
})

// ---------------------------------------------------------------------
//  ⑧ 🔴 결정은 **제안 한 장 단위**다 — 문서 ↔ 스키마 ↔ 화면이 같은 말을 한다 (FINDINGS 114 ②)
//
//  ★ 왜 시험인가 — DESIGN_BRIEF 는 56바퀴부터 「항목별 [승인] [거절]」을 적었고 코드는
//    한 번도 그것을 담을 자리가 없었다 (`proposals.status` 한 칸 · `ProposalItem` 에 결정
//    칸 없음). 문서만 고치면 다음 사람이 문서를 보고 **누르면 아무 일도 안 하는 버튼**을
//    그린다. 그래서 셋을 한 자리에서 대조한다 — 항목별 결정을 **정말로** 만드는 바퀴는
//    이 시험이 빨개지고, 그때 §2.1·스키마·문서를 같은 커밋에 고친다 (그게 의도다).
// ---------------------------------------------------------------------

const DESIGN_BRIEF = fileURLToPath(new URL('../../../docs/DESIGN_BRIEF.md', import.meta.url))
const SPEC = fileURLToPath(new URL('../../../docs/SPEC.md', import.meta.url))

/** `### 화면 6 …` 부터 다음 `### ` 전까지. */
function screen6Of(md: string): string {
  const start = md.indexOf('### 화면 6')
  if (start < 0) throw new Error('DESIGN_BRIEF 에 「### 화면 6」 절이 없다')
  const rest = md.slice(start + 1)
  const end = rest.search(/\n### /)
  return end < 0 ? rest : rest.slice(0, end)
}

describe('🔴 결정은 제안 한 장 단위다 — 문서 ↔ 스키마 ↔ 화면 (FINDINGS 114 ②)', () => {
  it('DESIGN_BRIEF §4 화면 6 은 항목별 [승인]/[거절] 을 약속하지 않는다', () => {
    const section = screen6Of(readFileSync(DESIGN_BRIEF, 'utf8'))
    expect(section).toContain('제안 한 장 단위')
    expect(section).toContain('PROPOSAL_DECISIONS')
    //  「항목별 [승인]」이 약속으로 남아 있으면 안 된다. 「없다」고 말하는 줄은 된다.
    for (const line of section.split('\n')) {
      if (/항목별 \[승인\]/.test(line)) expect(line, line).toMatch(/없다/)
    }
  })

  it('SPEC §9 화면 6 행도 같은 말을 한다', () => {
    const row = readFileSync(SPEC, 'utf8').split('\n').find((l) => l.startsWith('| 6 | `…/proposals`'))
    expect(row, 'SPEC §9 화면 표에 6번 행이 없다').toBeDefined()
    expect(row).toContain('제안 한 장 단위')
    expect(row).not.toContain('항목별 승인/거절')
  })

  it('🔴 스키마 — 항목에 결정 칸을 실어 보내면 받지 않는다 (`.strict()`)', () => {
    expect(ProposalItemSchema.safeParse(item()).success).toBe(true)
    for (const extra of ['status', 'decision', 'approved', 'decided_by']) {
      const result = ProposalItemSchema.safeParse({ ...item(), [extra]: 'approved' })
      expect(result.success, `ProposalItem 이 \`${extra}\` 를 받았다 — 항목별 결정 칸이 생겼으면 이 시험과 DESIGN_BRIEF 를 같이 고쳐라`).toBe(false)
    }
  })

  it('🔴 화면 — 항목 카드에는 버튼이 없고, 결정 버튼은 제안 한 장에 한 벌뿐이다', () => {
    const card = html(createElement(ProposalItemCard, { item: item(), target: target(), index: 0 }))
    expect(card).not.toContain('<button')
    expect(card).not.toContain('승인')
    expect(card).not.toContain('거절')

    const decisions = html(createElement(ProposalDecisions, {
      state: { status: 'submitted', role: 'owner', note: '', busy: null },
      onNote: () => {}, onDecide: () => {},
    }))
    const buttons = decisions.match(/<button/g) ?? []
    expect(buttons.length).toBe(availableActions('submitted', 'owner').length)
  })
})

/** 등급 표를 손으로 다시 적지 않았는지 — 타입이 갈리면 여기서 먼저 빨개진다. */
const _roleCheck: TeamRole[] = [...TEAM_ROLES]
void _roleCheck
