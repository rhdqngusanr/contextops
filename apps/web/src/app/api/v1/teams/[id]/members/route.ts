import { InviteMember } from '@contextops/schema'

import { requireTeam } from '../../../../../../lib/api/guard'
import { inviteMember, listMembers } from '../../../../../../lib/api/members'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET /teams/{id}/members` (member) · `POST /teams/{id}/members` (owner) — 팀원 목록 · 초대 (INBOX H9 · SPEC §5)
//
//  ★ 이 문이 없을 때 둘째 사람이 팀에 들어오는 길은 DB 뿐이었다. 초대는 이메일 하나이고, 합류는 그 이메일로
//    처음 로그인하는 것이다 (`lib/api/members.ts` 머리 주석). 초대 메일은 보내지 않는다 — 초대한 사람이 링크를 전한다.
//  ⚠ 목록은 이름·등급·상태뿐이다. 이메일은 초대할 때 **들어오기만** 하고 나가지 않는다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /teams/{id}/members', async (ctx) => {
  const actor = await ctx.actor()
  const teamId = pathUuid(ctx.params.id, 'team id')
  await requireTeam(ctx.db, actor, teamId, 'member')
  return ctx.ok({ members: await listMembers(ctx.db, teamId) })
})

export const POST = route<{ id: string }>('POST /teams/{id}/members', async (ctx) => {
  const actor = await ctx.actor()
  const teamId = pathUuid(ctx.params.id, 'team id')
  await requireTeam(ctx.db, actor, teamId, 'owner')
  const body = await parseBody(ctx.req, InviteMember)
  const member = await inviteMember(ctx.db, teamId, body.email, body.role, ctx.now)
  return ctx.ok(member, 201)
})
