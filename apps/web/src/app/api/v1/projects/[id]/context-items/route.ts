import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm'
import { ContextItemQuery } from '@contextops/schema'

import { contextItemRevisions, contextItems } from '../../../../../../db/schema'
import { requireProject } from '../../../../../../lib/api/guard'
import { CURRENT_REVISION_JOIN, ITEM_COLUMNS, toContextItemView } from '../../../../../../lib/api/item'
import { parseQuery, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/context-items` — member (SPEC §5 `?type&status&scope`)
//
//  ★ 정렬은 `public_id` 순으로 고정한다 — 컴파일러의 snapshot 정렬(SPEC §4.1)과 같은
//    기준이다. 목록 화면과 Pack 의 순서가 다르면 사람이 둘을 못 맞춘다.
// =====================================================================

export const dynamic = 'force-dynamic'

/**
 * `?scope=project` · `?scope=domain:billing` 을 조건으로 바꾼다.
 * ⚠ `scope` 는 jsonb 라 `->>` 로 판다. 값이 없는 질의(`domain`)는 **kind 만** 거른다 —
 *   「도메인 항목 전부」와 「billing 도메인」은 다른 질문이다.
 */
function scopeCondition(raw: string): SQL {
  const [kind, ...rest] = raw.split(':')
  const value = rest.join(':')
  const byKind = sql`${contextItems.scope}->>'kind' = ${kind}`
  if (value.length === 0) return byKind
  return and(byKind, sql`${contextItems.scope}->>'value' = ${value}`) as SQL
}

export const GET = route<{ id: string }>('GET /projects/{id}/context-items', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const query = parseQuery(ctx.req, ContextItemQuery)

  const where: SQL[] = [eq(contextItems.projectId, projectId), isNull(contextItems.deletedAt)]
  if (query.type) where.push(eq(contextItems.type, query.type))
  if (query.status) where.push(eq(contextItems.status, query.status))
  if (query.scope) where.push(scopeCondition(query.scope))

  const rows = await ctx.db
    .select(ITEM_COLUMNS)
    .from(contextItems)
    .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
    .where(and(...where))
    .orderBy(asc(contextItems.publicId))
    .limit(query.limit)
    .offset(query.offset)

  return ctx.ok({
    items: rows.map(toContextItemView),
    limit: query.limit,
    offset: query.offset,
  })
})
