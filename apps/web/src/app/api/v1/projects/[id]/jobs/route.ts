import { and, desc, eq, type SQL } from 'drizzle-orm'

import { aiJobs } from '../../../../../../db/schema'
import { AI_JOB_COLUMNS, AiJobQuery, toAiJob } from '../../../../../../lib/ai/job'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseQuery, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET /projects/{id}/jobs` — member (SPEC §5 `?feature&status` · §9 화면 3)
//
//  🔴 **id 없이 도는 job 을 다시 찾는 유일한 문이다** (FINDINGS 58).
//     job id 는 `POST /documents`·`batch-draft` 의 **응답에만** 있다. 화면이 그 id 를
//     state 에만 들고 있으면 새로고침 한 번에 길을 잃고, 문서는 올라갔는데 진행 표시는
//     영원히 안 뜬다. 그러면 사람은 문서를 다시 올리고 — 그게 §7.5 의 시간당 5회를
//     태우는 자리다. **화면 3 은 polling 을 시작하기 전에 여기부터 읽는다.**
//
//  ★ 왜 최신순인가 — 화면이 묻는 것은 「지금 무엇이 도나」이고 그 답은 늘 마지막 행이다.
//    `?feature=structure&limit=1` 이 「이 프로젝트의 마지막 구조화 job」이다.
//    정렬은 `ai_jobs_project_created_idx`(project_id, created_at desc)와 같은 순서다.
//
//  ⚠ 남의 프로젝트는 `requireProject` 가 막는다. 여기서 걸러지지 않으면 job id 를
//    몰라도 목록 하나로 남의 결과를 통째로 읽게 된다 — `{jobId}` 라우트보다 넓은 문이다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /projects/{id}/jobs', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const query = parseQuery(ctx.req, AiJobQuery)

  const where: SQL[] = [eq(aiJobs.projectId, projectId)]
  if (query.feature) where.push(eq(aiJobs.feature, query.feature))
  if (query.status) where.push(eq(aiJobs.status, query.status))

  const rows = await ctx.db
    .select(AI_JOB_COLUMNS)
    .from(aiJobs)
    .where(and(...where))
    .orderBy(desc(aiJobs.createdAt))
    .limit(query.limit)
    .offset(query.offset)

  return ctx.ok({ jobs: rows.map(toAiJob), limit: query.limit, offset: query.offset })
})
