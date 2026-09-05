import { and, desc, eq } from 'drizzle-orm'

import { conflicts, contextVersions, progressEvents, projects } from '../../../../../../db/schema'
import { requireProject } from '../../../../../../lib/api/guard'
import { OFF_ROADMAP_MAX, rollupMilestone } from '../../../../../../lib/api/progress'
import { pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/roadmap` — member (SPEC §5 · §9 화면 8)
//  → `{context_version, milestones:[{milestone, paths, done_when:[{text,
//      evidence_count, last_event}], conflicts, last_report_at, status, confirmable}],
//      off_roadmap:[…]}`
//
//  🔴 **P5 — 행은 마일스톤이다.** 사람 이름이 행이 되는 순간 이건 감시 도구다.
//     여기서 `device_id`·`user_id` 를 집계하지 마라. 아래 `select` 에 그 칸이 없는 것이
//     그 약속의 전부다 — 「안 쓰면 된다」가 아니라 **읽지 않는다.**
//
//  ★ 마일스톤 목록의 정본은 **발행된 Manifest** 다 (`manifest.milestones`), DB 질의가
//    아니다. 왜 — 화면이 보여 주는 것은 「지금 배포된 규칙이 말하는 마일스톤」이어야
//    한다. 아직 발행 안 된 초안 roadmap 항목이 섞이면, 기기가 받은 Pack 에는 없는
//    마일스톤에 대고 진행을 보고하라는 화면이 된다.
//
//  🔴 **`confirmable` 이 「agent 가 스스로 완료를 선언하지 못한다」의 화면 쪽 절반이다.**
//     `POST /progress/{id}/confirm` 은 **보고 하나의 id** 로 부르는데, 그 id 를 내는
//     문이 하나도 없었다 — 그래서 화면 8 의 [완료 확인] 버튼은 만들 수가 없었다
//     (보고를 만든 것은 기기이고, 그 응답은 사람의 브라우저에 안 온다).
//     여기서 내는 것은 **지금 확정할 수 있는 보고 하나**뿐이다: 아직 확정되지 않은
//     제일 최근 `done_candidate`. ⚠ 목록으로 내지 마라 — 여러 개를 내면 화면이
//     「어느 것을 확정하나」를 스스로 고르게 되고, 그 규칙이 서버와 갈린다.
//
//  🔴 **`off_roadmap` 은 `PROGRESS_STATUSES` 의 `none` 이 처음으로 무언가를 바꾸는
//     자리다.** 전에는 「어느 마일스톤도 아니다」라고 보고하면 그 보고가 **어디에도
//     안 보였다** — `PROGRESS_EFFECT.none` 이 `undefined` 라 접히지도 않고, 마일스톤
//     행에도 안 붙는다. 화면 8 하단의 「로드맵 외 작업 N」이 그 자리다
//     (DESIGN_BRIEF §4 화면 8).
//     ⚠ 가르는 규칙은 **하나**다 — 「지금 Manifest 의 마일스톤 id 가 아닌 것」.
//       `'none'` 은 마일스톤 id 가 될 수 없어서(§3 `MilestoneId`) 같은 규칙에 걸리고,
//       **지난 Pack 에만 있던 마일스톤**도 같이 걸린다. 갈래를 둘로 만들면 뒤엣것이
//       조용히 사라진다.
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
  //  ⚠ `off_roadmap` 도 같이 빈다: 무엇이 「로드맵 밖」인지는 **발행된 로드맵**이 있어야
  //    말할 수 있다. 없는데 전부 밖이라고 하면 그 화면은 거짓말을 한다.
  //  ⚠ 칸을 빼지 마라 — 모양이 갈래마다 다르면 화면이 `off_roadmap_total` 을
  //    `undefined` 로 받아 「잘렸다」를 못 그린다.
  if (!official) {
    return ctx.ok({ context_version: null, milestones: [], off_roadmap: [], off_roadmap_total: 0 })
  }

  const events = await ctx.db
    .select({
      id: progressEvents.id,
      milestoneId: progressEvents.milestoneId,
      criterion: progressEvents.criterion,
      status: progressEvents.status,
      summary: progressEvents.summary,
      evidence: progressEvents.evidence,
      source: progressEvents.source,
      contextVersion: progressEvents.contextVersion,
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

  type Event = (typeof events)[number]

  /**
   * 보고 한 건이 화면에 나가는 모양. **`device_id`·`confirmed_by` 가 없다** (P5) —
   * 근거를 보는 드로어에 필요한 것은 「무엇을 근거로, 어느 버전에서, 누가 아니라
   * 무엇이(agent/hook) 보고했나」다 (DESIGN_BRIEF §4 화면 8 「근거 클릭 → 드로어」).
   */
  const toEvent = (e: Event): Record<string, unknown> => ({
    id: e.id,
    status: e.status,
    summary: e.summary,
    at: e.createdAt.toISOString(),
    source: e.source,
    context_version: e.contextVersion,
    //  🔴 P1 — 근거는 경로·줄·커밋뿐이다. 그 줄에 무엇이 적혀 있는지는 서버가 모른다.
    evidence: e.evidence,
    confirmed_at: e.confirmedAt === null ? null : e.confirmedAt.toISOString(),
  })

  const milestoneIds = new Set(official.manifest.milestones.map((m) => m.id))

  const milestones = official.manifest.milestones.map((m) => {
    const mine = events.filter((e) => e.milestoneId === m.id)
    const lastReport = mine[0]?.createdAt ?? null
    //  아직 확정 안 된 제일 최근 `done_candidate` — 이것 하나만 확정할 수 있다.
    //  ⚠ `events` 가 최신순이라 `find` 가 곧 「제일 최근」이다. 여기서 다시 정렬하면
    //    두 곳이 순서를 정하게 되고, 한쪽만 고쳐지는 날이 온다.
    const candidate = mine.find((e) => e.status === 'done_candidate' && e.confirmedAt === null)

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
          last_event: last === undefined ? null : toEvent(last),
        }
      }),
      conflicts: openConflicts.length,
      last_report_at: lastReport === null ? null : lastReport.toISOString(),
      status: rollupMilestone(mine),
      confirmable: candidate === undefined ? null : toEvent(candidate),
    }
  })

  //  ⚠ 상한을 둔다 — 한 프로젝트의 「로드맵 밖」 보고는 상한 없이 는다 (agent 가
  //    부르는 문이라 사람이 안 보고 있다). 접이식 목록 하나에 다 실으면 응답이 그
  //    보고 수만큼 커진다. 잘랐다는 사실은 화면이 `off_roadmap_total` 로 말한다.
  const off = events.filter((e) => !milestoneIds.has(e.milestoneId))

  return ctx.ok({
    context_version: official.semver,
    milestones,
    off_roadmap: off.slice(0, OFF_ROADMAP_MAX).map(toEvent),
    off_roadmap_total: off.length,
  })
})
