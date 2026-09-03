import { CreateRepo } from '@contextops/schema'

import { repos } from '../../../../../../db/schema'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/repos` — owner (SPEC §5)
//
//  ★ 레포를 등록해 두는 이유 — `batch-draft` 의 `repo` 와 `source_refs` 의 `repo` 가
//    **여기 이름을 가리킨다.** 등록 없이 아무 이름이나 받으면 오타 하나로 근거가
//    아무 데도 가리키지 않게 되고, 그건 P7(역추적) 이 조용히 끊기는 자리다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/repos', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'owner')
  const body = await parseBody(ctx.req, CreateRepo)

  const [row] = await ctx.db
    .insert(repos)
    .values({
      projectId,
      name: body.name,
      remoteUrl: body.remote_url ?? null,
      pathPrefix: body.path_prefix ?? null,
      //  기본 브랜치의 기본값은 DB 쪽 하나뿐이다 — 여기서 'main' 을 적으면 두 곳이 된다.
      ...(body.default_branch === undefined ? {} : { defaultBranch: body.default_branch }),
    })
    .returning({
      id: repos.id,
      project_id: repos.projectId,
      name: repos.name,
      remote_url: repos.remoteUrl,
      default_branch: repos.defaultBranch,
      path_prefix: repos.pathPrefix,
    })

  return ctx.ok(row, 201)
})
