import { requireProject } from '../../../../../../../../lib/api/guard'
import { latestVersion } from '../../../../../../../../lib/api/pack'
import { pathUuid, route } from '../../../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/packs/latest/manifest` — device/member (SPEC §5)
//  「ETag=manifest_hash, If-None-Match → 304」
//
//  ★ 이 문이 플러그인 `sync` 의 첫 걸음이다. 기기는 세션마다 이걸 부르고, **대개는
//    바뀐 게 없다.** 304 로 끝내지 않으면 팀 전체가 매 세션 Pack 을 통째로 내려받는다.
//  ⚠ 304 는 본문을 만들기 **전에** 갈린다 (`ctx.cached` 가 body 를 함수로 받는 이유).
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /projects/{id}/packs/latest/manifest', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const version = await latestVersion(ctx.db, projectId)

  return ctx.cached(
    { etag: version.manifest.manifest_hash, cacheControl: version.cacheControl, kind: 'json' },
    () => version.manifest,
  )
})
