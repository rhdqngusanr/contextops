import { PublishVersion } from '@contextops/schema'

import { requireProject } from '../../../../../../../lib/api/guard'
import { publishVersion } from '../../../../../../../lib/api/publish'
import { parseBody, pathUuid, route } from '../../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/versions/publish` — owner (SPEC §5 · §2.1)
//
//  ⚠ 경로가 SPEC 의 옛 표기 `versions:publish` 가 아니다 — App Router 의 경로는 폴더
//    이름이고 Windows 는 `:` 를 못 쓴다. SPEC §5 를 고쳤다 (FINDINGS 20).
//
//  ★ 이 파일이 얇은 것이 의도다. 여덟 단계는 전부 `lib/api/publish.ts` 의 **한 트랜잭션**
//    안에 있다 — 한 줄이라도 라우트로 새면 「실패하면 전부 롤백」이 거짓이 된다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/versions/publish', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  //  🔴 owner 다. 기기 토큰은 owner 의 것이어도 member 까지라(`ACTOR_MAX_ROLE`)
  //     여기서 막힌다 — 파일에 저장된 문자열 하나가 팀의 공식 버전을 바꾸지 못하게.
  await requireProject(ctx.db, actor, projectId, 'owner')
  const body = await parseBody(ctx.req, PublishVersion)

  const version = await publishVersion({ db: ctx.db, actor, projectId, body, now: ctx.now })
  return ctx.ok(version, 201)
})
