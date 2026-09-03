import { and, desc, eq } from 'drizzle-orm'
import { ListQuery, Proposal } from '@contextops/schema'

import { contextVersions, proposals } from '../../../../../../db/schema'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { PROPOSAL_COLUMNS, toProposal } from '../../../../../../lib/api/proposal'
import { parseBody, parseQuery, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/proposals` — member/device (SPEC §5)
//  `GET  /projects/{id}/proposals` — member (SPEC §9 화면 6 의 목록)
//
//  ★ 같은 요청이 두 번 와도 제안은 하나다 (`client_request_id`). 플러그인은 네트워크가
//    끊기면 재시도하는데, 그때마다 제안이 하나씩 늘면 owner 의 승인 목록이 쓰레기가 된다.
//    ⚠ 두 번째 요청은 **201 이 아니라 200** 이다 — 「만들었다」와 「이미 있다」는 다르다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/proposals', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const body = await parseBody(ctx.req, Proposal)

  //  이미 같은 요청이 들어왔나 — 만들기 **전에** 본다.
  const [existing] = await ctx.db
    .select(PROPOSAL_COLUMNS)
    .from(proposals)
    .where(eq(proposals.clientRequestId, body.client_request_id))
    .limit(1)
  if (existing) {
    //  ⚠ 남의 프로젝트의 제안을 `client_request_id` 하나로 읽어 갈 수 없게 막는다.
    //    uuid 를 맞히기는 어렵지만, 「어렵다」는 방어가 아니다.
    if (existing.project_id !== projectId) fail('VALIDATION_FAILED', '이미 쓰인 client_request_id 다')
    return ctx.ok(toProposal(existing), 200)
  }

  //  기준 버전이 이 프로젝트의 것인가. FK 에게 맡기면 드라이버 예외가 INTERNAL 500 이 되고
  //  화면은 「무엇이 잘못됐나」를 못 읽는다.
  const [base] = await ctx.db
    .select({ id: contextVersions.id })
    .from(contextVersions)
    .where(and(eq(contextVersions.id, body.base_version_id), eq(contextVersions.projectId, projectId)))
    .limit(1)
  if (!base) fail('VALIDATION_FAILED', '이 프로젝트의 버전이 아니다: base_version_id')

  const [created] = await ctx.db
    .insert(proposals)
    .values({
      projectId,
      authorId: actor.userId,
      //  🔴 상태는 서버가 정한다. 계약에 `status` 자리가 없는 것이 그 이유다 —
      //     클라이언트가 `approved` 를 실어 보내면 승인 절차가 통째로 없는 것이 된다.
      status: 'draft',
      title: body.title,
      summary: body.summary,
      baseVersionId: body.base_version_id,
      items: body.items,
      relatesTo: body.relates_to,
      clientRequestId: body.client_request_id,
    })
    .returning(PROPOSAL_COLUMNS)
  if (!created) fail('INTERNAL', '제안 행을 만들지 못했다')

  return ctx.ok(toProposal(created), 201)
})

export const GET = route<{ id: string }>('GET /projects/{id}/proposals', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const query = parseQuery(ctx.req, ListQuery)

  const rows = await ctx.db
    .select(PROPOSAL_COLUMNS)
    .from(proposals)
    .where(eq(proposals.projectId, projectId))
    //  인덱스(`proposals_project_status_created_idx`)가 이 순서다 — 최신이 위다.
    .orderBy(desc(proposals.createdAt))
    .limit(query.limit)
    .offset(query.offset)

  return ctx.ok({ proposals: rows.map(toProposal), limit: query.limit, offset: query.offset })
})
