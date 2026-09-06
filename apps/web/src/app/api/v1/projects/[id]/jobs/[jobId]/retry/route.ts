import { and, eq } from 'drizzle-orm'
import { jobRetryMode, type AiJobRetryMode } from '@contextops/schema'

import { aiJobs } from '../../../../../../../../db/schema'
import {
  AI_JOB_COLUMNS, createJob, isJobStalled, startJob, toAiJob,
} from '../../../../../../../../lib/ai/job'
import { isAiJobFeature, type AiFeature } from '../../../../../../../../lib/ai/features'
import type { Db } from '../../../../../../../../db/client'
import { fail } from '../../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../../lib/api/guard'
import { pathUuid, route } from '../../../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/jobs/{jobId}/retry` — member (SPEC §5 · §7.5 · §9 화면 3)
//
//  🔴 **막힌 job 을 다시 굴리는 유일한 문이다** (FINDINGS 59 · 154). 이 문이 없을 때
//     예산 초과·빈도 초과로 죽은 job 이나 서버가 중간에 죽어 `running` 인 채 멈춘
//     job 에 사람이 할 수 있는 일이 **문서를 다시 올리는 것**뿐이었다 — 그러면
//     `source_documents` 에 같은 문서가 두 벌 생기고, 그 두 벌이 §7.2 에서 서로를
//     `duplicate` 로 잡는다.
//
//  🔴 **아무 job 이나 다시 굴리지 않고, 갈래도 여기서 고르지 않는다.** 어느 상태가
//     되는지와 그때 무엇을 하는지는 `AI_JOB_RETRY_RULES`(`packages/schema`) **한 표**가
//     정하고, 화면 3 의 [다시 시도] 도 같은 표를 읽는다 (`canRetryJob`). 조건을 화면이
//     다시 적으면 느슨한 쪽이 이겨서 **그린 버튼이 400 을 받는다** (`PROPOSAL_DECISIONS` ·
//     `ACTOR_RULES` 와 같은 모양).
//     ⚠ 되는 줄은 곧 **예산을 태우는 버튼**이다 (P3). 표를 늘리기 전에 「무엇이 저절로
//       달라져서 이번엔 되나」에 답할 수 있어야 한다.
//
//  ★ 왜 갈래가 둘인가 (`RETRY_ACTIONS`) — `runJob()` 은 `queued` 만 집는다.
//    **실패한** 행은 러너가 이미 `finishFailed()` 를 지났으므로 되돌려도(`requeue`)
//    둘이 겹치지 않는다. **멈춘 것 같은 `running`** 행은 그 러너가 아직 살아 있을 수도
//    있어서, 되돌리면 같은 문서를 둘이 읽고 LLM 왕복이 두 배가 된다 — 그래서 그 행은
//    `failed`+`INTERNAL` 로 **닫고 같은 입력으로 job 을 하나 더 만든다**(`fresh`).
//    늙은 러너가 살아 있어도 자기 행에만 쓰므로 새 행과 겹치지 않는다.
//
//  ⚠ 남의 job 은 없는 job 과 같은 404 다 (`jobs/{jobId}` 와 같은 이유).
//  ⚠ 여기서 예산을 미리 세지 않는다 — 다시 굴린 job 도 `withBudget()` 을 그대로
//    지나므로, 아직 예산이 안 풀렸으면 **같은 코드로 다시 실패**한다 (P3).
// =====================================================================

export const dynamic = 'force-dynamic'

interface RetryTarget {
  db: Db
  projectId: string
  jobId: string
  feature: AiFeature
  input: unknown
  now: Date
}

/**
 * 🔴 **갈래마다 무엇을 하나 — 표 하나.** 키는 `AI_JOB_RETRY_RULES` 의 `mode` 다.
 *
 * ★ 갈래를 하나 더하는 절차 — ① 계약 표의 `mode` 에 값 ② 여기 한 줄
 *   (`Record<AiJobRetryMode, …>` 라 ①만 하면 타입이 먼저 막는다) ③ 화면 3 의
 *   `RETRY_NOTE` 에 「무엇이 달라지나」 한 줄.
 *
 * ⚠ 두 갈래 다 **조건부 UPDATE 로 시작한다** — 그게 집기(claim)의 반대다. 둘이 동시에
 *   눌러도 한 쪽만 통과하고 진 쪽은 `undefined` 를 받는다 (`runJob()` 의 첫 UPDATE 와
 *   같은 모양). 조건이 없으면 같은 job 이 두 번 굴러 예산이 두 배로 탄다 (P3).
 *
 * @returns 화면이 그릴 job 의 id — `fresh` 는 **새 행**의 id 다
 */
const RETRY_ACTIONS: Record<AiJobRetryMode, (t: RetryTarget) => Promise<string>> = {
  //  같은 행을 처음 만든 모양으로 되돌린다.
  //  ⚠ 네 칸을 **전부** 비운다 — `AI_JOB_STATUS_RULES` 가 만든 CHECK 이
  //    「`queued` 면 넷 다 비어 있다」를 강제한다. 하나라도 남기면 DB 가 거부한다.
  //  ⚠ `progress` 는 CHECK 밖이지만 같이 비운다. 남기면 화면이 아직 아무것도 안 한
  //    job 에 「12조각 중 4」 막대를 그린다 — 그 수는 **지난 판**의 수다.
  requeue: async ({ db, projectId, jobId, now }) => {
    const [row] = await db
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
      .returning({ id: aiJobs.id })
    if (!row) fail('VALIDATION_FAILED', '그 사이 누가 먼저 다시 굴렸다')
    return row.id
  },

  //  멈춘 행은 **닫고** 새로 만든다.
  //  ⚠ `progress` 는 남긴다 — 「4조각 중 1에서 멈췄습니다」가 그 행이 사람에게 할 수
  //    있는 유일한 참말이고, 새 행은 자기 진행률을 처음부터 센다.
  //  ⚠ 닫는 코드는 `INTERNAL` 이다 — 실제로 일어난 일이 그것이다(서버가 중간에 죽었다).
  //    그 코드는 `retryable` 이라 닫힌 행을 나중에 다시 누르면 `requeue` 갈래로 200 이
  //    되는데, 위험하지 않다: 그 행의 러너는 이미 끝났고 화면 3 은 **최신 하나만** 본다.
  fresh: async ({ db, projectId, jobId, feature, input, now }) => {
    const [closed] = await db
      .update(aiJobs)
      .set({ status: 'failed', errorCode: 'INTERNAL', finishedAt: now, updatedAt: now })
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.projectId, projectId), eq(aiJobs.status, 'running')))
      .returning({ id: aiJobs.id })
    if (!closed) fail('VALIDATION_FAILED', '그 사이 그 job 이 움직였다')

    //  DB CHECK 이 job 이 아닌 기능을 막지만, 타입도 표를 읽는 문 하나로만 좁힌다
    //  (`runJob()` 과 같은 자리).
    if (!isAiJobFeature(feature)) fail('INTERNAL', 'job 이 아닌 기능이다')
    //  ⚠ 입력을 **그대로** 옮긴다 — 가리키는 id 뿐이라 본문이 다시 오가지 않는다 (P1).
    //    계약과 어긋나면 `createJob` 이 `INTERNAL` 로 막는다.
    const made = await createJob(db, { projectId, feature, input })
    return made.id
  },
}

export const POST = route<{ id: string; jobId: string }>(
  'POST /projects/{id}/jobs/{jobId}/retry',
  async (ctx) => {
    const actor = await ctx.actor()
    const projectId = pathUuid(ctx.params.id, 'project id')
    const jobId = pathUuid(ctx.params.jobId, 'job id')
    ctx.note({ project_id: projectId })

    await requireProject(ctx.db, actor, projectId, 'member')

    const [job] = await ctx.db
      .select({
        status: aiJobs.status,
        errorCode: aiJobs.errorCode,
        feature: aiJobs.feature,
        input: aiJobs.input,
        updatedAt: aiJobs.updatedAt,
      })
      .from(aiJobs)
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.projectId, projectId)))
      .limit(1)
    if (!job) fail('NOT_FOUND', '그 프로젝트의 job 이 아니다')

    const now = new Date()
    //  🔴 「멈췄나」를 여기서 다시 재지 않는다 — 응답의 `stalled` 를 만드는 함수와
    //     **같은 함수**다 (`isJobStalled`). 둘로 나뉘면 화면이 본 판정과 서버가 쓰는
    //     판정이 갈리고, 사람이 본 버튼이 400 을 받는다.
    const mode = jobRetryMode({
      status: job.status,
      error_code: job.errorCode,
      stalled: isJobStalled({ feature: job.feature, status: job.status, updated_at: job.updatedAt }, now),
    })
    if (!mode) {
      //  코드를 그대로 싣는다 — 이 문구는 사람이 아니라 **화면을 만든 사람**이 읽는다
      //  (사람이 읽는 문구는 `ERROR_HINT` 하나다). 화면이 표를 제대로 읽었으면
      //  이 400 은 애초에 안 온다.
      fail('VALIDATION_FAILED', `다시 굴릴 수 있는 job 이 아니다 (${job.status}/${job.errorCode ?? 'null'})`)
    }

    const targetId = await RETRY_ACTIONS[mode]({
      db: ctx.db, projectId, jobId, feature: job.feature, input: job.input, now,
    })

    //  ⚠ 그리는 것은 **표에서 다시 읽은 행**이다 — 갈래마다 어느 행인지가 다르고
    //    (`fresh` 는 새 행), 응답 칸은 라우트가 고르지 않는다 (`AI_JOB_FIELDS`).
    const [row] = await ctx.db
      .select(AI_JOB_COLUMNS)
      .from(aiJobs)
      .where(eq(aiJobs.id, targetId))
      .limit(1)
    if (!row) fail('INTERNAL', '다시 굴린 job 을 읽지 못했다')

    //  ⚠ 응답을 보낸 **뒤에** 굴린다 (`POST /documents` 와 같은 자리) — 여기서
    //    `await` 하면 재시도 요청이 job 하나만큼 길어진다.
    startJob(targetId)

    return ctx.ok(toAiJob(row, now))
  },
)
