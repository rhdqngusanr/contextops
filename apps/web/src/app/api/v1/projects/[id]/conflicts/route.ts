import { and, desc, eq, type SQL } from 'drizzle-orm'
import { ConflictQuery } from '@contextops/schema'

import { conflicts } from '../../../../../../db/schema'
import { requireActor } from '../../../../../../lib/api/auth'
import { CONFLICT_COLUMNS, toConflict } from '../../../../../../lib/api/conflict'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseQuery, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/conflicts` — member (SPEC §5 `?status`)
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /projects/{id}/conflicts', async (ctx) => {
  const actor = await requireActor(ctx.db, ctx.req, ctx.now)
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ user_id: actor.userId, project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const query = parseQuery(ctx.req, ConflictQuery)

  const where: SQL[] = [eq(conflicts.projectId, projectId)]
  if (query.status) where.push(eq(conflicts.status, query.status))
  if (query.kind) where.push(eq(conflicts.kind, query.kind))

  const rows = await ctx.db
    .select(CONFLICT_COLUMNS)
    .from(conflicts)
    .where(and(...where))
    .orderBy(desc(conflicts.createdAt))
    .limit(query.limit)
    .offset(query.offset)

  return ctx.ok({ conflicts: rows.map(toConflict), limit: query.limit, offset: query.offset })
})
