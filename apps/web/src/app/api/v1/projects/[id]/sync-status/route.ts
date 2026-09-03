import { and, desc, eq, isNull } from 'drizzle-orm'

import { contextVersions, devices, syncReports } from '../../../../../../db/schema'
import { requireProject } from '../../../../../../lib/api/guard'
import { pathUuid, route } from '../../../../../../lib/api/route'
import { statusOfDevice } from '../../../../../../lib/api/sync'

// =====================================================================
//  `GET /projects/{id}/sync-status` — member (SPEC §5 · §6)
//  → `[{device, user, version, status, reported_at}]`
//
//  🔴 **여기가 `unknown` 을 만드는 유일한 자리다** (FINDINGS 16). 목록의 기준은
//    **보고가 아니라 기기**다 — 기기부터 세고 거기에 마지막 보고를 붙인다.
//    ★ 왜 그 순서인가 — 보고부터 세면 **한 번도 보고하지 않은 기기가 목록에서 사라진다.**
//      그 기기가 정확히 화면이 보여 줘야 할 것이다 (「Pack 을 안 받은 사람이 있다」).
//
//  ⚠ P5 — 이 목록은 기기와 버전의 상태지 사람의 성적이 아니다. 여기에 「누가 제일
//    자주 sync 했나」류를 더하지 마라.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /projects/{id}/sync-status', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')

  //  살아 있는 기기만 (취소된 토큰은 목록에서 뺀다 — 없어진 노트북이 영원히 빨간 줄로 남는다).
  const deviceRows = await ctx.db
    .select({ id: devices.id, name: devices.name, userId: devices.userId })
    .from(devices)
    .where(and(eq(devices.projectId, projectId), isNull(devices.revokedAt)))

  const rows = await Promise.all(deviceRows.map(async (d) => {
    const [last] = await ctx.db
      .select({
        status: syncReports.status,
        manifestHash: syncReports.manifestHash,
        reportedAt: syncReports.reportedAt,
        semver: contextVersions.semver,
      })
      .from(syncReports)
      .leftJoin(contextVersions, eq(contextVersions.id, syncReports.versionId))
      .where(eq(syncReports.deviceId, d.id))
      //  인덱스(`sync_reports_project_device_reported_idx`)가 이 순서다.
      .orderBy(desc(syncReports.reportedAt))
      .limit(1)

    return statusOfDevice({
      device_id: d.id,
      device_name: d.name,
      user_id: d.userId,
      last: last === undefined ? undefined : {
        status: last.status,
        version: last.semver,
        manifest_hash: last.manifestHash,
        reported_at: last.reportedAt.toISOString(),
      },
    })
  }))

  rows.sort((a, b) => a.device_name.localeCompare(b.device_name))
  return ctx.ok({ devices: rows })
})
