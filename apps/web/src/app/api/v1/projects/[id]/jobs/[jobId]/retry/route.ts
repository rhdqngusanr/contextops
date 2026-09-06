import { and, eq } from 'drizzle-orm'
import { isRetryableErrorCode } from '@contextops/schema'

import { aiJobs } from '../../../../../../../../db/schema'
import { AI_JOB_COLUMNS, startJob, toAiJob } from '../../../../../../../../lib/ai/job'
import { fail } from '../../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../../lib/api/guard'
import { pathUuid, route } from '../../../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/jobs/{jobId}/retry` — member (SPEC §5 · §7.5 · §9 화면 3)
//
//  🔴 **실패한 job 을 다시 굴리는 유일한 문이다** (FINDINGS 59). 이 문이 없을 때
//     예산 초과·빈도 초과로 죽은 job 은 `failed` 로 남고 끝이라, 사람이 할 수 있는
//     일이 **문서를 다시 올리는 것**뿐이었다 — 그러면 `source_documents` 에 같은
//     문서가 두 벌 생기고, 그 두 벌이 §7.2 에서 서로 `duplicate` 로 잡힌다.
//
//  🔴 **아무 실패나 다시 굴리지 않는다.** 어느 코드가 되는지는
//     `ERROR_STATUS[code].retryable`(`packages/schema`) **한 표**가 정하고,
//     화면 3 의 [다시 시도] 도 같은 표를 읽는다. 조건을 화면이 다시 적으면
//     느슨한 쪽이 이겨서 **그린 버튼이 400 을 받는다** (`PROPOSAL_DECISIONS` ·
//     `ACTOR_RULES` 와 같은 모양).
//     ⚠ `true` 인 줄은 곧 **예산을 태우는 버튼**이다 (P3). 표를 늘리기 전에
//       「무엇이 저절로 달라져서 이번엔 되나」에 답할 수 있어야 한다.
//
//  ★ 왜 `failed` 만인가 — `runJob()` 은 `queued` 만 집는다. `running` 인 행을
//    되돌리면 아직 살아 있을지 모르는 러너와 **같은 job 을 둘이 굴리게** 되고
//    LLM 왕복이 두 배가 된다. 멈춘 것 같은(`stalled`) `running` 행을 되살리는 것은
//    「정말 죽었나」를 아는 방법이 따로 있어야 하는 다른 일이다 (FINDINGS 64·154).
//
//  ⚠ 남의 job 은 없는 job 과 같은 404 다 (`jobs/{jobId}` 와 같은 이유).
//  ⚠ 여기서 예산을 미리 세지 않는다 — 다시 굴린 job 도 `withBudget()` 을 그대로
//    지나므로, 아직 예산이 안 풀렸으면 **같은 코드로 다시 실패**한다 (P3).
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string; jobId: string }>(
  'POST /projects/{id}/jobs/{jobId}/retry',
  async (ctx) => {
    const actor = await ctx.actor()
    const projectId = pathUuid(ctx.params.id, 'project id')
    const jobId = pathUuid(ctx.params.jobId, 'job id')
    ctx.note({ project_id: projectId })

    await requireProject(ctx.db, actor, projectId, 'member')

    const [job] = await ctx.db
      .select({ status: aiJobs.status, errorCode: aiJobs.errorCode })
      .from(aiJobs)
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.projectId, projectId)))
      .limit(1)
    if (!job) fail('NOT_FOUND', '그 프로젝트의 job 이 아니다')

    //  ⚠ 「아직 안 끝났다」와 「성공했다」를 같은 말로 거절한다 — 둘 다 **되돌릴 것이
    //    없는** 상태이고, 갈래를 나누면 화면이 안 쓰는 문구가 하나 는다.
    if (job.status !== 'failed') {
      fail('VALIDATION_FAILED', `실패한 job 이 아니다 (${job.status})`)
    }
    if (!isRetryableErrorCode(job.errorCode)) {
      //  코드를 그대로 싣는다 — 이 문구는 사람이 아니라 **화면을 만든 사람**이 읽는다
      //  (사람이 읽는 문구는 `ERROR_HINT` 하나다). 화면이 표를 제대로 읽었으면
      //  이 400 은 애초에 안 온다.
      fail('VALIDATION_FAILED', `다시 굴릴 수 있는 실패가 아니다 (${job.errorCode ?? 'null'})`)
    }

    const now = new Date()
    //  🔴 **되돌리는 것이 곧 집기(claim)의 반대다** — 조건에 `status='failed'` 를 달아
    //     둘이 동시에 눌러도 한 쪽만 통과한다. 진 쪽은 `undefined` 를 받는다
    //     (`runJob()` 의 첫 UPDATE 와 같은 모양).
    //  ⚠ 네 칸을 **전부** 비운다 — `AI_JOB_STATUS_RULES` 가 만든 CHECK 이
    //     「`queued` 면 넷 다 비어 있다」를 강제한다. 하나라도 남기면 DB 가 거부한다.
    //  ⚠ `progress` 는 CHECK 밖이지만 같이 비운다. 남기면 화면이 아직 아무것도 안 한
    //     job 에 「12조각 중 4」 막대를 그린다 — 그 수는 **지난 판**의 수다.
    const [row] = await ctx.db
      .update(aiJobs)
      .set({
        status: 'queued',
        startedAt: null,
        finishedAt: null,
        errorCode: null,
        result: null,
        progress: null,
        updatedAt: now,
      })
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.projectId, projectId), eq(aiJobs.status, 'failed')))
      .returning(AI_JOB_COLUMNS)
    if (!row) fail('VALIDATION_FAILED', '그 사이 누가 먼저 다시 굴렸다')

    //  ⚠ 응답을 보낸 **뒤에** 굴린다 (`POST /documents` 와 같은 자리) — 여기서
    //    `await` 하면 재시도 요청이 job 하나만큼 길어진다.
    startJob(jobId)

    return ctx.ok(toAiJob(row, now))
  },
)
