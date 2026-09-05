import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  PROPOSAL_ACTIONS, PROPOSAL_DECISIONS, PROPOSAL_STATUSES, ROLE_RANK, TEAM_ROLES,
  type ContextItemDraft, type ContextItemView, type ProposalItem, type TeamRole,
} from '@contextops/schema'

import {
  DECIDED_TEXT, DIFF_MISSING_TEXT, DiffView, ProposalDecisions, ProposalHead, ProposalItemCard, ProposalTable,
  availableActions, diffSidesOf,
} from '../src/components/proposals'
import { PROPOSAL_STATUS_CHIP } from '../src/components/chips'
import { diffCounts, lineDiff } from '../src/lib/web/diff'
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

  it('바뀐 것이 없으면 화면이 그렇게 말한다', () => {
    const markup = html(createElement(DiffView, { before: '같다', after: '같다' }))
    expect(markup).toContain('본문이 그대로다')
    expect(markup).toContain('+0')
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
    expect(markup).toContain('rev 3')
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
    expect(markup).toContain('owner만')
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
      emptyMessage: '없다',
    }))
    for (const status of PROPOSAL_STATUSES) expect(markup).toContain(PROPOSAL_STATUS_CHIP[status].label)
  })

  it('🔴 작성자를 **이름으로** 그린다 — uuid 는 표에 없다 (FINDINGS 113)', () => {
    //  ★ 57바퀴까지 이 시험은 「작성자 칸이 **없다**」를 잠그고 있었다. 이름을 내는 문이
    //    없었기 때문이다 (`lib/api/user.ts` 가 생기면서 뒤집혔다). 뒤집을 때 uuid 를
    //    안 그린다는 절반은 **그대로 둔다** — 그게 이 칸이 없던 이유였다.
    const markup = html(createElement(ProposalTable, { proposals: [row()], hrefOf: href, emptyMessage: '없다' }))
    expect(markup).toContain('작성자')
    expect(markup).toContain('박제안')
    expect(markup).not.toContain('00000000-0000-4000-8000-0000000000d1')
  })

  it('🔴 주인 없는 제안의 이름을 지어내지 않는다 — 「—」다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [row({ author: null })], hrefOf: href, emptyMessage: '없다',
    }))
    expect(markup).toContain('작성자')
    expect(markup).not.toContain('박제안')
    //  「알 수 없음」·「(삭제된 사용자)」 같은 말을 서버도 화면도 지어내지 않는다.
    expect(markup).not.toContain('알 수 없')
  })

  it('항목 수와 올라온 날을 센다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [row({ items: [item(), item()] })], hrefOf: href, emptyMessage: '없다',
    }))
    expect(markup).toContain('>2<')
    expect(markup).toContain('2026-09-05')
  })

  it('빈 목록은 다음 걸음을 말한다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [], hrefOf: href, emptyMessage: '아직 올라온 제안이 없습니다.',
    }))
    expect(markup).toContain('아직 올라온 제안이 없습니다.')
  })

  it('관련 마일스톤이 없는 제안도 칸을 비우지 않는다', () => {
    const markup = html(createElement(ProposalTable, {
      proposals: [row({ relates_to: [] })], hrefOf: href, emptyMessage: '없다',
    }))
    expect(markup).toContain('—')
  })
})

/** 등급 표를 손으로 다시 적지 않았는지 — 타입이 갈리면 여기서 먼저 빨개진다. */
const _roleCheck: TeamRole[] = [...TEAM_ROLES]
void _roleCheck
