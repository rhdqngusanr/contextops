import { Semver } from '@contextops/schema'

import { fail } from '../../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../../lib/api/guard'
import { packZipBytes, packZipName, versionBySemver } from '../../../../../../../../lib/api/pack'
import { pathUuid, route } from '../../../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/packs/{semver}/zip` — member (SPEC §5)
//  「application/zip (동기 생성)」
//
//  ★ 이 문이 화면 9 의 `manual`(zip 수동 적용)이 **가리키는 실체**다 (SPEC §6).
//    플러그인을 못 까는 기기(CI 러너 · 다른 에디터)가 같은 Pack 을 손으로 받는 길이고,
//    그 안에 `.contextops/manifest.json` 까지 있어서 풀어 놓으면 `status` 가 판정한다.
//
//  ★ 같은 버전은 같은 바이트다 — 시각은 Manifest 의 `generated_at` 이고 순서는 경로순
//    (`lib/api/zip.ts`). 그래서 ETag 가 `manifest_hash` 이고 1년 캐시다 (`{semver}` 는 불변).
//
//  ⚠ 304 는 본문을 만들기 **전에** 갈린다 — zip 을 조립하는 것은 `ctx.cached` 의 함수 안이다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string; semver: string }>(
  'GET /projects/{id}/packs/{semver}/zip',
  async (ctx) => {
    const actor = await ctx.actor()
    const projectId = pathUuid(ctx.params.id, 'project id')
    ctx.note({ project_id: projectId })

    const semver = Semver.safeParse(ctx.params.semver)
    if (!semver.success) fail('VALIDATION_FAILED', 'semver 가 아니다')

    await requireProject(ctx.db, actor, projectId, 'member')
    const version = await versionBySemver(ctx.db, projectId, semver.data)

    //  🔴 **이름만 먼저 읽고, 바이트는 304 가 아닐 때만 만든다** (2026-09-12 · R2).
    //     예전엔 여기서 zip 을 먼저 조립했다 — 「파일 수십 개를 이어 붙이는 일이 DB 왕복
    //     하나보다 싸다」는 이유였는데, **그 비교가 틀렸다.** 304 인 요청에서 옳은 값은
    //     「왕복 하나」가 아니라 **0** 이고, 이 문은 게스트 토큰으로도 열린다.
    const filename = await packZipName(ctx.db, projectId, version)
    return ctx.cached(
      { etag: version.manifest.manifest_hash, cacheControl: version.cacheControl, kind: 'zip', filename },
      () => packZipBytes(ctx.db, version),
    )
  },
)
