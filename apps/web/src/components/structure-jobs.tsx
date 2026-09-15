'use client'

import type { AiJobSummary } from '../lib/web/queries'
import { sinceText } from '../lib/web/time'
import { useChips } from './chips'

// =====================================================================
//  화면 3 오른쪽 칸의 **문서 고르기** — 올린 문서가 둘 이상일 때 (SPEC §9 화면 3 · FINDINGS 174)
//
//  ★ 왜 생겼나 — 오른쪽 칸이 **마지막 구조화 job 한 줄**만 읽던 동안, 첫 문서의 후보를
//    받기 전에 둘째 문서를 올리면 첫 문서의 후보가 화면에서 사라졌다 (2026-09-15 production
//    한 바퀴 · API 로만 받을 수 있었다). 후보는 그 job 의 `result` 에만 산다.
//
//  ⚠ 상태를 들지 않는다 — 고른 값은 부르는 쪽(화면 3)이 들고 여기는 그리기만 한다
//    (`job-progress.tsx` 와 같은 배치). 그래서 시험이 여러 모양을 브라우저 없이 그려 읽는다
//    (`test/web-structure-jobs.test.ts`).
//  ⚠ 문서 **제목**은 못 쓴다 — job 요약에는 `document_version_id` 뿐이고 제목을 내는 문이 없다.
//    그래서 이름표는 「언제 올렸나」이고, 어느 문서인지는 고른 뒤 후보의 근거 줄(문서의 첫 제목)이 말한다.
// =====================================================================

/**
 * 한 번에 불러오는 구조화 job 수 — 고르는 줄에 서는 문서의 상한이다.
 * ★ 왜 5 인가 — 오른쪽 칸(`--drawer-w`)에 버튼이 두어 줄 안에 선다. 그리고 목록은 도는 동안
 *   2초마다 다시 읽는 자리라(`JOB_POLL_MS`) 한 번에 싣는 줄이 늘면 polling 이 그만큼 무거워진다.
 * ⚠ 더 오래된 문서의 후보는 여기서 못 고른다 — 그 사실을 줄 밑에서 말한다.
 */
export const RECENT_STRUCTURE_JOBS = 5

/** 사람이 고른 문서. **고를 때 가장 새 job 이 무엇이었는지**를 같이 적는다 (`focusedJob`). */
export interface JobPick {
  readonly id: string
  readonly newest: string
}

/**
 * 지금 오른쪽 칸이 그릴 job. 고르지 않았으면 가장 새 것이다.
 *
 * 🔴 **새 문서가 올라오면 고른 것이 저절로 풀린다** — 고를 때의 가장 새 job 과 지금의 가장 새 job 이
 *   다르면 고른 것을 버린다. 방금 올린 사람이 보려는 것은 그 문서의 진행이다.
 *   ★ 효과(`useEffect`)로 되돌리지 않는 이유 — 그러면 한 번은 옛 문서를 그린 뒤에 바뀐다.
 * ⚠ 고른 job 이 목록에 없으면 역시 가장 새 것이다 — 없는 문서를 그리지 않는다.
 */
export function focusedJob(jobs: readonly AiJobSummary[], pick: JobPick | null): AiJobSummary | undefined {
  const newest = jobs[0]
  if (newest === undefined) return undefined
  if (pick === null || pick.newest !== newest.id) return newest
  return jobs.find((j) => j.id === pick.id) ?? newest
}

/**
 * 올린 문서가 **둘 이상일 때만** 선다 — 하나뿐인데 고르는 줄을 그리면 누를 것이 없는 버튼이다.
 * 가장 새 것이 맨 앞이다 (목록 문이 최신순이다 · SPEC §5 `GET …/jobs`).
 */
export function StructureJobPicker({
  jobs,
  focused,
  onPick,
  now,
}: {
  jobs: readonly AiJobSummary[]
  /** 지금 그리는 job 의 id (`focusedJob`). */
  focused: string | null
  onPick: (jobId: string) => void
  /** ⚠ 시험이 시계를 옮겨 「8분 전」이 갈리는 것을 보기 위한 자리다 (`JobProgress` 와 같다). */
  now?: Date
}) {
  const chips = useChips()
  if (jobs.length < 2) return null
  return (
    <div className="col-tight">
      <span className="label">올린 문서 {jobs.length}개 · 최근 것부터</span>
      <div className="row wrap">
        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            className="btn btn-sm"
            aria-pressed={job.id === focused}
            onClick={() => onPick(job.id)}
          >
            {/* 끝난 문서는 「언제」만 말한다 — 아직 끝나지 않았거나 실패한 문서만 상태를 붙인다 (칩과 같은 표).
                ⚠ 한 문자열로 만든다 — 조각으로 두면 글자 사이에 주석 마디가 끼어 이름표를 한 덩어리로 못 읽는다. */}
            {`${sinceText(job.created_at, now)} 올린 문서${job.status === 'succeeded' ? '' : ` · ${chips.aiJobStatus[job.status].label}`}`}
          </button>
        ))}
      </div>
      {jobs.length >= RECENT_STRUCTURE_JOBS ? (
        <span className="meta">최근 {RECENT_STRUCTURE_JOBS}개 문서까지 여기서 고를 수 있습니다.</span>
      ) : null}
    </div>
  )
}
