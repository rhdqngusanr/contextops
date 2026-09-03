import { and, eq } from 'drizzle-orm'
import { SyncReport } from '@contextops/schema'

import { contextVersions, syncReports } from '../../../../../../db/schema'
import { fail } from '../../../../../../lib/api/error'
import { requireDevice, requireProject } from '../../../../../../lib/api/guard'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/sync-reports` — device (SPEC §5) → 202
//
//  ★ 202 인 이유 — 이건 요청이 아니라 **보고**다. 서버는 받아 적을 뿐 무엇도 바꾸지
//    않는다 (파일을 고친 것은 이미 기기다). 201 로 답하면 「서버가 뭔가 만들었다」로 읽힌다.
//
//  ⚠ `version` 은 기기가 말하는 semver 다. 우리가 모르는 값일 수 있다 —
//    zip 을 손으로 푼 기기(`manual`)나 삭제된 버전. 그때 `version_id` 는 null 이고
//    **보고는 그대로 저장한다.** 「모르는 버전이라 안 받는다」로 두면 그 기기는
//    영원히 `unknown` 으로 남아서 화면이 「보고가 없다」고 거짓말한다.
//
//  ⚠ `files[]` 는 저장하지 않는다. 보고의 뜻은 `status` + `manifest_hash` 로 끝나고,
//    파일 목록은 그 판정의 재료였을 뿐이다 — 기기별 파일 해시를 쌓아 두면 P1 의
//    「받지 않는다」에 붙는 저장물만 늘어난다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/sync-reports', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  const device = requireDevice(actor)
  await requireProject(ctx.db, actor, projectId, 'member')
  const body = await parseBody(ctx.req, SyncReport)

  const [version] = await ctx.db
    .select({ id: contextVersions.id })
    .from(contextVersions)
    .where(and(eq(contextVersions.projectId, projectId), eq(contextVersions.semver, body.version)))
    .limit(1)

  const [row] = await ctx.db
    .insert(syncReports)
    .values({
      deviceId: device.deviceId,
      projectId,
      versionId: version?.id ?? null,
      status: body.status,
      manifestHash: body.manifest_hash,
      reportedAt: ctx.now,
    })
    .returning({ id: syncReports.id, reportedAt: syncReports.reportedAt })
  if (!row) fail('INTERNAL', '보고를 저장하지 못했다')

  return ctx.ok({
    id: row.id,
    status: body.status,
    version_id: version?.id ?? null,
    reported_at: row.reportedAt.toISOString(),
  }, 202)
})
