import { eq } from 'drizzle-orm'
import { PROPOSAL_DECISIONS, ProposalDecision, type ProposalAction } from '@contextops/schema'

import type { Db } from '../../db/client'
import { proposals } from '../../db/schema'
import type { Actor } from './auth'
import { fail } from './error'
import { requireProject } from './guard'
import { parseBody, pathUuid, route } from './route'

// =====================================================================
//  Proposal 의 수명 (SPEC §2 · §5 `POST /proposals/{id}/submit|approve|reject`)
//
//  ★ 왜 표 하나인가 — 세 라우트가 각자 「지금 상태가 X 인가」「이 사람이 owner 인가」를
//    적으면 셋의 조건이 갈라진다. 갈라진 쪽이 느슨하면 **작성자가 자기 제안을 승인**할
//    수 있게 되고, 그건 한 줄이 빠진 것처럼 보이지 않는다.
//    그 표를 읽기만 하면 세 라우트는 각각 **한 줄**이다.
//
//  🔴 **그 표는 이제 `@contextops/schema` 의 `PROPOSAL_DECISIONS` 다** —
//     화면 6 이 「지금 이 제안에 어떤 버튼을 그릴 수 있나」를 물으면서 **둘째 사용자**가
//     됐다 (CLAUDE.md 「둘째가 생기면 그때 정본으로 올린다」). 여기서는 읽기만 한다.
//
//  ★ 새 결정을 더하는 절차: ① `packages/schema` 의 `PROPOSAL_ACTIONS`·
//     `PROPOSAL_DECISIONS` 에 한 줄 ② 그 이름의 폴더에 `route.ts` 한 줄
//     (`export const POST = decisionRoute('withdraw')`) ③ 시험에 한 줄.
// =====================================================================

/** `select({...})` 에 그대로 펴 넣는다 — 응답의 필드가 라우트마다 갈리지 않게. */
export const PROPOSAL_COLUMNS = {
  id: proposals.id,
  project_id: proposals.projectId,
  author_id: proposals.authorId,
  status: proposals.status,
  title: proposals.title,
  summary: proposals.summary,
  base_version_id: proposals.baseVersionId,
  items: proposals.items,
  relates_to: proposals.relatesTo,
  client_request_id: proposals.clientRequestId,
  decided_by: proposals.decidedBy,
  decided_at: proposals.decidedAt,
  decision_note: proposals.decisionNote,
  created_at: proposals.createdAt,
} as const

type ProposalRow = {
  [K in keyof typeof PROPOSAL_COLUMNS]: unknown
}

/** 시각을 ISO 문자열로 바꾼다 — `Date` 를 그대로 실으면 JSON 이 로캘을 탄다. */
export function toProposal(row: ProposalRow): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const key of ['decided_at', 'created_at']) {
    const value = out[key]
    out[key] = value instanceof Date ? value.toISOString() : value
  }
  return out
}

/**
 * 결정 하나를 적용한다. **검사 순서가 규칙이다**: 없으면 404 → 권한 → 상태.
 * ★ 상태를 마지막에 보는 이유 — 먼저 보면 남의 프로젝트 제안의 **상태를 캐낼 수 있다.**
 */
export async function decide(args: {
  db: Db
  actor: Actor
  proposalId: string
  action: ProposalAction
  note: string | undefined
  now: Date
}): Promise<{ projectId: string; proposal: Record<string, unknown> }> {
  const rule = PROPOSAL_DECISIONS[args.action]

  const [row] = await args.db
    .select({ id: proposals.id, projectId: proposals.projectId, authorId: proposals.authorId, status: proposals.status })
    .from(proposals)
    .where(eq(proposals.id, args.proposalId))
    .limit(1)
  if (!row) fail('NOT_FOUND', '제안을 찾을 수 없다')

  await requireProject(args.db, args.actor, row.projectId, rule.role)
  if (rule.by === 'author' && row.authorId !== args.actor.userId) {
    fail('FORBIDDEN', '제안을 낸 사람만 할 수 있다')
  }
  if (row.status !== rule.from) {
    fail('VALIDATION_FAILED', `${rule.from} 상태의 제안만 ${args.action} 할 수 있다 (지금은 ${row.status})`)
  }
  //  🔴 사유가 필수인 결정(거절)은 **서버가 막는다.** 화면만 막으면 플러그인·CLI 로
  //     사유 없는 거절이 들어오고, 그때 제안을 쓴 사람은 무엇을 고쳐야 하는지 알 자리가
  //     아예 없다 (제안은 되돌아오지 않고 새로 쓴다). 조건의 정본은 표 한 칸이다.
  if (rule.noteRequired && (args.note === undefined || args.note.trim() === '')) {
    fail('VALIDATION_FAILED', `${args.action} 에는 사유가 필요하다`)
  }

  const [updated] = await args.db
    .update(proposals)
    .set({
      status: rule.to,
      //  ⚠ `submit` 도 `decided_*` 를 채운다. 「누가 언제 이 상태로 옮겼나」가 하나뿐이면
      //    화면이 그 한 자리만 읽으면 된다 — 상태별로 다른 칸을 보게 하지 않는다.
      decidedBy: args.actor.userId,
      decidedAt: args.now,
      decisionNote: args.note ?? null,
      updatedAt: args.now,
    })
    .where(eq(proposals.id, args.proposalId))
    .returning(PROPOSAL_COLUMNS)
  if (!updated) fail('INTERNAL', '제안을 갱신하지 못했다')

  return { projectId: row.projectId, proposal: toProposal(updated) }
}

/**
 * 결정 라우트 하나를 만든다 — `route.ts` 는 각각 **한 줄**이다.
 * ★ 왜 공장인가 — 세 파일이 같은 열 줄을 베끼면 그중 하나만 고쳐지는 날이 온다.
 *   달라지는 것은 `action` 하나뿐이고, 그 차이는 위 `PROPOSAL_DECISIONS` 표가 안다.
 */
export function decisionRoute(action: ProposalAction) {
  return route<{ id: string }>(`POST /proposals/{id}/${action}`, async (ctx) => {
    const actor = await ctx.actor()
    const proposalId = pathUuid(ctx.params.id, 'proposal id')
    const body = await parseBody(ctx.req, ProposalDecision)

    const { projectId, proposal } = await decide({
      db: ctx.db, actor, proposalId, action, note: body.note, now: ctx.now,
    })
    ctx.note({ project_id: projectId })
    return ctx.ok(proposal)
  })
}
