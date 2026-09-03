import { desc, eq } from 'drizzle-orm'
import { ListQuery } from '@contextops/schema'

import { contextVersions, projects } from '../../../../../../db/schema'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseQuery, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/versions` — member (SPEC §5)
//
//  ⚠ `snapshot` 과 `manifest` 는 **싣지 않는다.** 목록 한 번이 Pack 전체를 나르면
//    화면 5·7 이 열릴 때마다 수 MB 가 오간다. 자세한 것은 packs 쪽 문으로 간다.
//  ★ `is_official` 을 같이 낸다 — 화면이 「지금 공식은 어느 것인가」를 알아내려고
//    프로젝트를 한 번 더 부르지 않게.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /projects/{id}/versions', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const query = parseQuery(ctx.req, ListQuery)

  const [project] = await ctx.db
    .select({ official: projects.officialVersionId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  const rows = await ctx.db
    .select({
      id: contextVersions.id,
      semver: contextVersions.semver,
      snapshot_hash: contextVersions.snapshotHash,
      published_by: contextVersions.publishedBy,
      published_at: contextVersions.publishedAt,
      change_summary: contextVersions.changeSummary,
    })
    .from(contextVersions)
    .where(eq(contextVersions.projectId, projectId))
    .orderBy(desc(contextVersions.publishedAt))
    .limit(query.limit)
    .offset(query.offset)

  return ctx.ok({
    versions: rows.map((r) => ({
      ...r,
      published_at: r.published_at.toISOString(),
      is_official: r.id === project?.official,
    })),
    official_version_id: project?.official ?? null,
    limit: query.limit,
    offset: query.offset,
  })
})
