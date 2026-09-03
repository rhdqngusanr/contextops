import { and, eq } from 'drizzle-orm'
import { RepoPath, Semver } from '@contextops/schema'

import { packFiles } from '../../../../../../../../../db/schema'
import { fail } from '../../../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../../../lib/api/guard'
import { versionBySemver } from '../../../../../../../../../lib/api/pack'
import { pathUuid, route } from '../../../../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/packs/{semver}/files/{path}` — device/member (SPEC §5)
//  「text/plain, ETag=sha256」
//
//  ★ 경로가 catch-all(`[...path]`)인 이유 — Pack 의 경로에는 `/` 가 들어 있다
//    (`.claude/rules/policies.md`). 한 조각으로 받으면 그 파일들을 못 부른다.
//
//  🔴 **본문을 봉투에 담지 않는다.** 플러그인은 받은 바이트를 그대로 파일로 쓰고
//     그 sha256 을 다시 재서 Manifest 와 대조한다 (SPEC §8.5). JSON 으로 감싸면
//     그 대조가 영원히 어긋난다.
//
//  ⚠ 경로는 `RepoPath` 로 판다 — 절대경로·`..` 를 여기서 막는다. 지금은 DB 질의라
//    빠져나가도 행이 없지만, 「지금은 안전하다」는 다음 사람에게 안 남는다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string; semver: string; path: string[] }>(
  'GET /projects/{id}/packs/{semver}/files/{path}',
  async (ctx) => {
    const actor = await ctx.actor()
    const projectId = pathUuid(ctx.params.id, 'project id')
    ctx.note({ project_id: projectId })

    const semver = Semver.safeParse(ctx.params.semver)
    if (!semver.success) fail('VALIDATION_FAILED', 'semver 가 아니다')

    //  Next 가 조각을 percent-decode 해서 배열로 준다. 다시 잇는 자리는 여기 하나다.
    const path = RepoPath.safeParse((ctx.params.path ?? []).join('/'))
    if (!path.success) fail('VALIDATION_FAILED', '저장소 상대 경로가 아니다')

    await requireProject(ctx.db, actor, projectId, 'member')
    const version = await versionBySemver(ctx.db, projectId, semver.data)

    const [file] = await ctx.db
      .select({ content: packFiles.content, sha256: packFiles.sha256 })
      .from(packFiles)
      .where(and(eq(packFiles.versionId, version.id), eq(packFiles.path, path.data)))
      .limit(1)
    if (!file) fail('NOT_FOUND', 'Pack 에 그런 파일이 없다')

    return ctx.cached(
      { etag: file.sha256, cacheControl: version.cacheControl, kind: 'text' },
      () => file.content,
    )
  },
)
