import { and, desc, eq } from 'drizzle-orm'

import { conflicts, contextVersions, progressEvents, projects } from '../../../../../../db/schema'
import { requireProject } from '../../../../../../lib/api/guard'
import { rollupMilestone } from '../../../../../../lib/api/progress'
import { pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/roadmap` — member (SPEC §5 · §9 화면 8)
//  → `[{milestone, done_when:[{text, evidence_count, last_event}], conflicts,
//      last_report_at, status}]`
//
//  🔴 **P5 — 행은 마일스톤이다.** 사람 이름이 행이 되는 순간 이건 감시 도구다.
//     여기서 `device_id`·`user_id` 를 집계하지 마라.
//
//  ★ 마일스톤 목록의 정본은 **발행된 Manifest** 다 (`manifest.milestones`), DB 질의가
//    아니다. 왜 — 화면이 보여 주는 것은 「지금 배포된 규칙이 말하는 마일스톤」이어야
//    한다. 아직 발행 안 된 초안 roadmap 항목이 섞이면, 기기가 받은 Pack 에는 없는
//    마일스톤에 대고 진행을 보고하라는 화면이 된다.
//
//  ⚠ 「실시간」이라는 말을 쓰지 않는다 (SPEC §6). 그래서 `last_report_at` 이 같이 나간다 —
//    화면은 "마지막 보고: 8분 전" 으로 적는다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /projects/{id}/roadmap', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')

  const [official] = await ctx.db
    .select({ manifest: contextVersions.manifest, semver: contextVersions.semver })
    .from(projects)
    .innerJoin(contextVersions, eq(contextVersions.id, projects.officialVersionId))
    .where(eq(projects.id, projectId))
    .limit(1)

  //  발행 전에는 **빈 목록**이다. 「아직 없다」를 화면이 구별할 수 있게 `context_version`
  //  을 null 로 같이 낸다 — 빈 배열만 주면 「마일스톤이 0개인 프로젝트」와 같아 보인다.
  if (!official) return ctx.ok({ context_version: null, milestones: [] })

  const events = await ctx.db
    .select({
      milestoneId: progressEvents.milestoneId,
      criterion: progressEvents.criterion,
      status: progressEvents.status,
      summary: progressEvents.summary,
      evidence: progressEvents.evidence,
      confirmedAt: progressEvents.confirmedAt,
      createdAt: progressEvents.createdAt,
    })
    .from(progressEvents)
    .where(eq(progressEvents.projectId, projectId))
    .orderBy(desc(progressEvents.createdAt))

  //  ⚠ 열린 충돌은 **프로젝트 단위**로만 셀 수 있다 — 충돌 행에 마일스톤을 가리키는
  //    칸이 아직 없다. 마일스톤별로 갈라 보이려면 그 칸이 먼저다 (FINDINGS).
  const openConflicts = await ctx.db
    .select({ id: conflicts.id })
    .from(conflicts)
    .where(and(eq(conflicts.projectId, projectId), eq(conflicts.status, 'open')))

  const milestones = official.manifest.milestones.map((m) => {
    const mine = events.filter((e) => e.milestoneId === m.id)
    const lastReport = mine[0]?.createdAt ?? null

    return {
      milestone: m.id,
      paths: m.paths,
      done_when: m.done_when.map((text) => {
        //  완료 조건 하나에 붙은 보고 — `criterion` 이 그 문장과 같은 것만 센다.
        const forCriterion = mine.filter((e) => e.criterion === text)
        const last = forCriterion[0]
        return {
          text,
          //  근거의 **개수**다 (경로·줄 번호만 · P1). 근거 없는 보고는 세지 않는다 — P7.
          evidence_count: forCriterion.reduce((n, e) => n + e.evidence.length, 0),
          last_event: last === undefined ? null : {
            status: last.status,
            summary: last.summary,
            at: last.createdAt.toISOString(),
          },
        }
      }),
      conflicts: openConflicts.length,
      last_report_at: lastReport === null ? null : lastReport.toISOString(),
      status: rollupMilestone(mine),
    }
  })

  return ctx.ok({ context_version: official.semver, milestones })
})
