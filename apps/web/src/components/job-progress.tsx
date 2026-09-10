import type { ReactNode } from 'react'
import { ERROR_STATUS, MAX_JOB_REQUEUES, jobRetryMode, type AiJobRetryMode } from '@contextops/schema'

import { hintFor, isErrorCode } from '../lib/web/api'
import type { AiJobSummary } from '../lib/web/queries'
import { sinceText } from '../lib/web/time'
import { AiJobStatusChip } from './chips'

// =====================================================================
//  도는 AI job 한 장을 그리는 자리 (SPEC §9 화면 3 · §2 `ai_jobs`)
//
//  ★ 왜 화면 밖으로 뺐나 — 두 가지다:
//    ① **둘째 사용자가 온다.** 화면 4(정리)가 기다리는 것은 `conflict` job 이고,
//       그 job 도 같은 네 상태·같은 진행률·같은 「멈춤」 판정을 낸다. 화면마다 적으면
//       한쪽에만 `stalled` 가 빠지고, 그 화면은 멈춘 일을 영원히 「도는 중」으로 그린다.
//    ② **눈으로 읽을 수 있게.** 이 파일은 훅이 없는 순수 함수라 시험이 여섯 상태를
//       전부 그려서 마크업을 읽는다 (`test/web-job-progress.test.ts`).
//       브라우저 없이 잴 수 있는 눈 판정은 거기서 게이트가 된다.
//
//  🔴 **여기에 `feature === …` 갈래를 만들지 마라.** 기능마다 다른 것(걸음의 낱말·
//     멈춤의 잣대)은 전부 응답에 실려 온다 — `unit` 은 값이고 `stalled` 는 판정이다.
//     갈래를 하나라도 만들면 §7.3 이 job 이 되는 날 이 파일을 다시 고쳐야 한다.
// =====================================================================

/**
 * job 한 장. `done` 은 **성공했을 때만** 그려지는 것 — 「무엇이 나왔나」는 기능마다
 * 다르고(`result` 의 모양이 다르다) 그것만 부르는 화면이 준다.
 */
export function JobProgress({
  job,
  done,
  now,
  retry,
}: {
  job: AiJobSummary
  done?: ReactNode
  /** ⚠ 시험이 시계를 옮겨 「8분 전」이 갈리는 것을 보기 위한 자리다. */
  now?: Date
  /**
   * 🔴 **[다시 시도] 를 누르면 할 일**. 없으면 버튼을 안 그린다 (FINDINGS 59).
   *
   * ★ 왜 손잡이를 밖에서 받나 — 이 파일은 훅이 없는 순수 함수라 시험이 여섯 상태를
   *   그려서 마크업을 읽는다 (머리 주석 ②). 여기서 fetch 를 부르면 그 성질이 사라진다.
   * ⚠ **버튼을 그릴지는 여기서 정한다** (`canRetryJob`). 부르는 화면이 조건을 다시
   *   적으면 화면마다 갈라지고, 그중 느슨한 쪽이 그린 버튼이 400 을 받는다.
   */
  retry?: { run: () => void; busy: boolean }
}) {
  return (
    <>
      <div className="row wrap">
        <AiJobStatusChip status={job.status} />
        {/* 🔴 「멈춤」은 상태가 아니라 **상태 위의 판정**이라 칩이 하나 더 붙는다.
            서버가 이미 낸 값이다 — 화면이 초를 재지 않는다 (잣대는 서버 전용 표에 있고
            브라우저의 시계는 서버와 어긋난다). */}
        {job.stalled ? (
          <span className="chip tone-warn"><span className="chip-dot" aria-hidden="true" />멈춘 것 같음</span>
        ) : null}
      </div>

      {/* ⚠ **실패한 job 에는 막대를 그리지 않는다.** 아래 `JobFailed` 가 같은 숫자를
          「4조각 중 1에서 멈췄습니다」로 말한다 — 같은 수를 두 번 그리면 사람은 둘이
          다른 것을 세는 줄 알고, 막대는 아직 가는 중인 것처럼 보인다 (눈으로 읽고 뺐다:
          docs/evidence/2026-09-04-screen3/job-panel-states.txt 첫 판 ⑤). */}
      {job.status === 'failed' ? null : <JobBar job={job} />}

      {/* 🔴 판정 옆에 **근거**를 같이 둔다 (DESIGN_BRIEF §2-1). 「멈췄다」만 있으면
          사람은 그 말을 확인할 방법이 없다. 「실시간」이라고 쓰지 않는다 (§2-3).
          ⚠ 아직 한 걸음도 안 간 job 에 「마지막 걸음」이라고 쓰지 않는다 — 그 job 의
            `updated_at` 은 만든 시각이다. 가른 것은 **상태 이름이 아니라 칸**이다. */}
      <span className="meta mono" title={job.updated_at}>
        {job.started_at === null ? '올린 지' : '마지막 걸음'} {sinceText(job.updated_at, now)}
      </span>

      {/* 🔴 멈춘 job 은 **되돌리는 것이 아니라 새로 만드는** 갈래다 (FINDINGS 154).
          그 행은 `running` 이라 되돌리면 아직 살아 있을지 모르는 러너와 둘이 같은 job 을
          굴린다 — 그래서 서버는 그 행을 닫고 같은 문서로 job 을 하나 더 만든다.
          ⚠ 그 갈래를 여기서 고르지 않는다 — `JobRetry` 가 서버와 같은 표를 읽는다. */}
      {job.stalled ? (
        <div className="col-tight">
          <p className="meta">이 일이 한동안 움직이지 않았습니다.</p>
          <JobRetry job={job} retry={retry} />
        </div>
      ) : null}

      {job.status === 'failed' ? <JobFailed job={job} retry={retry} /> : null}
      {job.status === 'succeeded' ? done : null}
    </>
  )
}

/**
 * 🔴 `progress` 가 `null` 이면 **회전**, 있으면 **막대**다.
 * `null` 은 「0 걸음 갔다」가 아니라 「아직 총수를 모른다」이고, 그 둘을 같게 그리면
 * 「4조각 중 0」과 「몇 조각인지도 모름」이 화면에서 같아진다 (FINDINGS 62).
 * ⚠ 가운뎃말(`조각`·`묶음`)은 값에 실려 온 `unit` 을 **그대로** 쓴다 — 화면이 고르지 않는다.
 */
export function JobBar({ job }: { job: AiJobSummary }) {
  if (!job.progress) {
    return (
      <div className="col-tight">
        <div className="skeleton" />
        {/* ⚠ 「몇 조각」이라고 쓰지 않는다 — 걸음의 낱말(`unit`)은 진행률과 같이 오는
            값이라, 진행률이 없는 지금은 **그 낱말도 모른다.** */}
        <span className="meta">몇 걸음짜리 일인지 아직 모릅니다.</span>
      </div>
    )
  }
  const { done, total, unit } = job.progress
  //  ⚠ `total` 이 0 인 job 은 없어야 하지만, 0 으로 나누면 화면이 `NaN%` 가 된다.
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="col-tight">
      <div
        className="bar"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${total}${unit} 중 ${done}`}
      >
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="meta mono">{total}{unit} 중 {done} · {pct}%</span>
    </div>
  )
}

/**
 * 실패해도 **어디까지 갔는지는 남는다** — `progress` 는 수명 CHECK 밖이라 지워지지 않는다.
 * 「4조각 중 1에서 멈췄습니다」가 실패 화면이 사람에게 할 수 있는 유일한 참말이다.
 */
export function JobFailed({
  job,
  retry,
}: {
  job: AiJobSummary
  retry?: { run: () => void; busy: boolean }
}) {
  return (
    <div className="col-tight">
      {/* 코드를 그대로 띄우지 않는다 — 문구의 정본은 `ERROR_HINT` 표 하나다.
          ⚠ 여기에 `✕` 를 또 붙이지 마라 — 위 상태 칩이 이미 그 아이콘을 달고 있다
            (눈으로 읽고 뺐다: 한 칸에 `✕` 가 둘이었다). */}
      <p className="ink-bad">{hintFor(job.error_code)}</p>
      {job.progress ? (
        <span className="meta">{job.progress.total}{job.progress.unit} 중 {job.progress.done}에서 멈췄습니다.</span>
      ) : null}
      {/* 되는 코드였는데 상한에 닿아 버튼이 사라진 자리 — 빈 칸으로 두면 「고장」으로 읽힌다 (INBOX G8). */}
      {retryExhausted(job) ? <span className="meta">{RETRY_EXHAUSTED}</span> : null}
      <JobRetry job={job} retry={retry} />
    </div>
  )
}

/** 「되는 코드로 죽었는데 되돌릴 횟수를 다 썼다」 — 서버와 같은 두 표(`ERROR_STATUS` · `MAX_JOB_REQUEUES`)를 읽는다. */
export function retryExhausted(job: Pick<AiJobSummary, 'status' | 'error_code' | 'requeues'>): boolean {
  return job.status === 'failed'
    && isErrorCode(job.error_code) && ERROR_STATUS[job.error_code].retryable
    && job.requeues >= MAX_JOB_REQUEUES
}

/**
 * 🔴 갈래마다 **무엇이 달라지는지** 한 줄. 키는 `AI_JOB_RETRY_RULES` 의 `mode` 다.
 *
 * ★ 왜 버튼 옆에 적나 — 이 버튼은 LLM 을 한 번 더 부르므로(P3) 사람이 헛되이 누르는
 *   자리가 되면 안 된다. 그리고 이 문이 없던 동안 사람이 하던 일이 **문서를 다시
 *   올리는 것**이라 그 습관이 남아 있다 (DESIGN_BRIEF 화면 3).
 * ⚠ `Record<AiJobRetryMode, …>` 라 갈래가 늘면 여기서 타입이 먼저 막는다.
 */
const RETRY_NOTE: Record<AiJobRetryMode, string> = {
  requeue: '올린 문서를 그대로 다시 읽습니다. 문서를 다시 올릴 필요는 없습니다.',
  fresh: '멈춘 일은 실패로 닫고, 같은 문서로 일을 새로 만듭니다. 문서를 다시 올릴 필요는 없습니다.',
}

/**
 * 🔴 **[다시 시도] 를 그리는 유일한 자리** — 실패한 job 과 멈춘 job 이 같은 버튼을 쓴다
 * (FINDINGS 59 · 154). 그릴지·무엇이 달라지는지는 **서버와 같은 표**가 정한다
 * (`jobRetryMode` · `packages/schema`).
 *
 * ⚠ accent 를 쓰지 않는다 — 화면 3 의 주요 액션은 [구조화하기] 하나다 (DESIGN_BRIEF §3).
 */
export function JobRetry({
  job,
  retry,
}: {
  job: AiJobSummary
  retry?: { run: () => void; busy: boolean }
}) {
  const mode = jobRetryMode(job)
  if (!retry || !mode) return null
  return (
    <div className="col-tight">
      <button type="button" className="btn" onClick={retry.run} disabled={retry.busy}>
        {retry.busy ? '다시 굴리는 중…' : '다시 시도'}
      </button>
      <span className="meta">{RETRY_NOTE[mode]}{mode === 'requeue' ? ` ${requeuesLeftText(job)}` : ''}</span>
    </div>
  )
}

/**
 * 「같은 일을 몇 번 더 되돌릴 수 있나」 — 숫자의 정본은 `MAX_JOB_REQUEUES`(서버와 같은 표)다.
 * ★ 왜 말하나 — 이 버튼은 LLM 을 한 번 더 부른다 (P3). 마지막 한 번임을 모르고 누른 사람은
 *   다음에 버튼이 사라진 것을 「고장」으로 읽는다. 상한에 닿은 뒤의 말은 `RETRY_EXHAUSTED` 다.
 */
export function requeuesLeftText(job: Pick<AiJobSummary, 'requeues'>): string {
  const left = MAX_JOB_REQUEUES - job.requeues
  return `같은 일은 ${MAX_JOB_REQUEUES}번까지 다시 굴릴 수 있습니다 (남은 ${left}번).`
}

/**
 * 🔴 상한에 닿은 실패 — 버튼 대신 **다음 걸음**을 말한다 (INBOX G8).
 * 비결정 실패(`AI_OUTPUT_INVALID`)가 `MAX_JOB_REQUEUES` 번 연속이면 모델이 아니라 문서 쪽이다 —
 * 길이를 줄이거나 나눠 올리는 것이 사람이 할 수 있는 유일한 일이다.
 */
export const RETRY_EXHAUSTED = `같은 일을 ${MAX_JOB_REQUEUES}번 다시 굴렸지만 또 실패했습니다. 문서를 더 짧게 나눠 새로 올려보세요.`

/**
 * 🔴 **[다시 시도] 를 그릴 수 있나** — 서버의 재시도 라우트와 **같은 표**를 읽는다
 * (`AI_JOB_RETRY_RULES` · FINDINGS 59 · 154).
 *
 * ★ 왜 화면이 조건을 다시 적으면 안 되나 — 둘이 갈리면 느슨한 쪽이 이긴다.
 *   화면이 넓으면 그린 버튼이 400 을 받고, 좁으면 되는 재시도를 사람이 못 한다.
 * ⚠ 여기서 상태 이름을 손으로 세지 않는다 — 실패한 job 만이던 조건에 멈춘 job 이
 *   붙었을 때, 이 함수가 자기 조건을 갖고 있었으면 두 곳을 같이 고쳐야 했다.
 * ⚠ `error_code` 는 `string | null` 이다 (DB 는 `text`) — 캐스팅하지 않고
 *   표를 읽는 문(`jobRetryMode`)에 그대로 넘긴다.
 */
export function canRetryJob(job: AiJobSummary): boolean {
  return jobRetryMode(job) !== null
}
