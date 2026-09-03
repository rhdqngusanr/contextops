import { Semver } from '@contextops/schema'

import { fail } from '../../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../../lib/api/guard'
import { versionBySemver } from '../../../../../../../../lib/api/pack'
import { pathUuid, route } from '../../../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/packs/{semver}/manifest` — device/member (SPEC §5)
//  「immutable, Cache-Control: max-age=31536000」
//
//  ⚠ 경로 조각도 계약으로 판다. 안 그러면 `../` 같은 값이 그대로 질의에 실리고,
//    거부는 되더라도 **왜 거부됐는지가 드라이버 메시지**가 된다 (`pathUuid` 와 같은 이유).
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string; semver: string }>(
  'GET /projects/{id}/packs/{semver}/manifest',
  async (ctx) => {
    const actor = await ctx.actor()
    const projectId = pathUuid(ctx.params.id, 'project id')
    ctx.note({ project_id: projectId })

    const semver = Semver.safeParse(ctx.params.semver)
    if (!semver.success) fail('VALIDATION_FAILED', 'semver 가 아니다')

    await requireProject(ctx.db, actor, projectId, 'member')
    const version = await versionBySemver(ctx.db, projectId, semver.data)

    return ctx.cached(
      { etag: version.manifest.manifest_hash, cacheControl: version.cacheControl, kind: 'json' },
      () => version.manifest,
    )
  },
)
