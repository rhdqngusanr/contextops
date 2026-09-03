import { CreateProject } from '@contextops/schema'

import { projects } from '../../../../../../db/schema'
import { fail } from '../../../../../../lib/api/error'
import { requireTeam } from '../../../../../../lib/api/guard'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /teams/{id}/projects` — owner (SPEC §5)
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /teams/{id}/projects', async (ctx) => {
  const actor = await ctx.actor()

  const teamId = pathUuid(ctx.params.id, 'team id')
  await requireTeam(ctx.db, actor, teamId, 'owner')

  const body = await parseBody(ctx.req, CreateProject)

  const [row] = await ctx.db
    .insert(projects)
    .values({ teamId, slug: body.slug, name: body.name, description: body.description ?? null })
    //  slug 는 **팀 안에서** 유일하다 (SPEC §2 `unique(team_id,slug)`).
    .onConflictDoNothing({ target: [projects.teamId, projects.slug] })
    .returning({
      id: projects.id,
      team_id: projects.teamId,
      slug: projects.slug,
      name: projects.name,
      description: projects.description,
      official_version_id: projects.officialVersionId,
    })
  if (!row) fail('VALIDATION_FAILED', '이 팀에 이미 있는 slug 다', [{ path: 'slug', message: '이 팀에 이미 있는 slug 다' }])

  ctx.note({ project_id: row.id })
  return ctx.ok(row, 201)
})
