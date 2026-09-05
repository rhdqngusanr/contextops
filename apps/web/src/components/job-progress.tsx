import type { ReactNode } from 'react'

import { hintFor } from '../lib/web/api'
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
}: {
  job: AiJobSummary
  done?: ReactNode
  /** ⚠ 시험이 시계를 옮겨 「8분 전」이 갈리는 것을 보기 위한 자리다. */
  now?: Date
}) {
  return (
    <>
      <div className="row wrap">
        <AiJobStatusChip status={job.status} />
        {/* 🔴 「멈춤」은 상태가 아니라 **상태 위의 판정**이라 칩이 하나 더 붙는다.
            서버가 이미 낸 값이다 — 화면이 초를 재지 않는다 (잣대는 서버 전용 표에 있고
            브라우저의 시계는 서버와 어긋난다). */}
        {job.stalled ? (
          <span className="chip tone-warn"><span className="chip-icon" aria-hidden="true">⚠</span>멈춘 것 같음</span>
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

      {/* ⚠ 여기에 [다시 시도] 를 두지 마라 — 멈춘 job 을 `queued` 로 되돌리는 문이
          아직 없다 (FINDINGS 59+64 가 한 묶음이다). 없는 버튼을 그리면 누른 사람은
          자기가 뭘 잘못한 줄 안다. */}
      {job.stalled ? <p className="meta">이 일이 한동안 움직이지 않았습니다. 문서를 다시 올려 주세요.</p> : null}

      {job.status === 'failed' ? <JobFailed job={job} /> : null}
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
export function JobFailed({ job }: { job: AiJobSummary }) {
  return (
    <div className="col-tight">
      {/* 코드를 그대로 띄우지 않는다 — 문구의 정본은 `ERROR_HINT` 표 하나다.
          ⚠ 여기에 `✕` 를 또 붙이지 마라 — 위 상태 칩이 이미 그 아이콘을 달고 있다
            (눈으로 읽고 뺐다: 한 칸에 `✕` 가 둘이었다). */}
      <p className="ink-bad">{hintFor(job.error_code)}</p>
      {job.progress ? (
        <span className="meta">{job.progress.total}{job.progress.unit} 중 {job.progress.done}에서 멈췄습니다.</span>
      ) : null}
    </div>
  )
}
