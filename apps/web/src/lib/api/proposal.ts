import { eq } from 'drizzle-orm'
import { ProposalDecision, type TeamRole } from '@contextops/schema'

import type { Db } from '../../db/client'
import { proposals, PROPOSAL_STATUSES } from '../../db/schema'
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
//    여기 표를 읽기만 하면 세 라우트는 각각 **한 줄**이다.
//
//  ★ 새 결정을 더하는 절차: ① 아래 표에 한 줄 ② 그 이름의 폴더에 `route.ts` 한 줄
//     (`export const POST = decisionRoute('withdraw')`) ③ 시험에 한 줄.
//     상태 값 자체를 더하려면 `db/schema.ts` 의 `PROPOSAL_STATUSES` 가 먼저다.
// =====================================================================

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]
export type ProposalAction = 'submit' | 'approve' | 'reject'

/**
 * 🔴 **결정 → 무엇이 필요하고 무엇이 되나**의 정본 표.
 *
 * `by`: `author` = 제안을 쓴 사람만 · `role` = 그 팀에서 필요한 최소 등급.
 * ⚠ `approve`·`reject` 가 owner 인 것이 이 제품의 승인 절차 전부다. 여기를 member 로
 *   낮추면 「승인 이후 파이프라인」(P4)이 지키는 것이 없어진다.
 */
export const PROPOSAL_DECISIONS: Record<ProposalAction, {
  from: ProposalStatus
  to: ProposalStatus
  role: TeamRole
  by: 'author' | 'anyone'
}> = {
  submit: { from: 'draft', to: 'submitted', role: 'member', by: 'author' },
  approve: { from: 'submitted', to: 'approved', role: 'owner', by: 'anyone' },
  reject: { from: 'submitted', to: 'rejected', role: 'owner', by: 'anyone' },
}

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
