import { and, eq } from 'drizzle-orm'

import { aiJobs } from '../../../../../../../db/schema'
import { AI_JOB_COLUMNS, toAiJob } from '../../../../../../../lib/ai/job'
import { fail } from '../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../lib/api/guard'
import { pathUuid, route } from '../../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/jobs/{jobId}` — member (SPEC §5 · §9 화면 3)
//
//  🔴 **화면 3 이 polling 하는 자리다.** 「구조화 진행 표시(polling)」가 이 한 줄이다.
//
//  ★ 왜 `{id}` 아래에 있나 — job 은 프로젝트에 속한다. 최상위로 두면 job id 하나로
//    남의 팀 결과를 읽을 수 있고, 그 결과에는 문서에서 뽑은 항목 초안이 들어 있다.
//    아래 `requireProject` + `project_id` 조건 **둘 다**가 그 문을 잠근다.
//
//  ⚠ 없는 job 과 **남의 job** 은 같은 404 다 — 갈래를 나누면 job id 를 넣어 보며
//    「그 프로젝트에 그 job 이 있나」를 알아낼 수 있다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string; jobId: string }>('GET /projects/{id}/jobs/{jobId}', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  const jobId = pathUuid(ctx.params.jobId, 'job id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')

  const [row] = await ctx.db
    .select(AI_JOB_COLUMNS)
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.projectId, projectId)))
    .limit(1)
  if (!row) fail('NOT_FOUND', '그 프로젝트의 job 이 아니다')

  return ctx.ok(toAiJob(row))
})
