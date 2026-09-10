import type { ReactNode } from 'react'

import type { ProgressEventView, Roadmap, RoadmapMilestone } from '../lib/web/queries'
import { STALE_REPORT_DAYS, isStaleReport, sinceText } from '../lib/web/time'
import { PROGRESS_STATUS_LABEL, MilestoneChip, PROGRESS_SOURCE_LABEL } from './chips'
import { FactLine, roadmapFact } from './fact-line'

// =====================================================================
//  화면 8 — Roadmap 이 그리는 조각들 (SPEC §9 화면 8 · DESIGN_BRIEF §4 「화면 8」)
//
//  🔴 **P5 가 이 파일의 전부다. 행은 마일스톤이다.**
//     여기에 사람·기기별 무엇도 그리지 마라 — 서버가 그 칸을 안 싣는 것과 짝이다
//     (`roadmap/route.ts` 의 `toEvent`). 「팀장이 매일 여는 화면」이 사람별 표가 되는
//     순간 이건 감시 도구고, 감시 도구는 아무도 안 쓴다.
//
//  ★ 왜 화면 밖으로 뺐나 — `job-progress.tsx`·`conflict-card.tsx` 와 같은 이유다:
//    훅이 없는 순수 함수라 **시험이 모든 모양을 그려서 마크업을 읽는다.**
//    브라우저가 없는 이 환경에서 눈 판정을 게이트로 올릴 수 있는 유일한 길이다
//    (`test/web-roadmap.test.ts`).
//
//  🔴 **없는 숫자를 만들지 않는다.** 「완료 3/3」이라고 쓰지 않는다 — 완료 조건 하나가
//     끝났는지를 재는 값이 서버에 **없다.** 서버가 조건마다 내는 것은 `evidence_count`
//     하나이므로 화면도 「근거 있는 기준 n / m」이라고만 쓴다. 그게 잰 것이다
//     (DESIGN_BRIEF §2-1 「근거 없는 숫자·판정은 화면에 없다」).
//
//  ⚠ 「지금 이렇다」라고 쓰지 마라 (DESIGN_BRIEF §2-3). 이 화면이 말할 수 있는 것은 늘
//    「마지막 보고가 언제인가」다 — 그래서 모든 시각이 `sinceText` 를 지난다.
// =====================================================================

/** 완료 조건 하나가 「근거를 가졌나」. **이 판정의 자리는 여기 하나다.** */
function hasEvidence(criterion: { evidence_count: number }): boolean {
  return criterion.evidence_count > 0
}

/** 로드맵 전체에서 「근거 있는 기준 n / 전체 m」을 센다. */
export function evidenceCoverage(milestones: readonly RoadmapMilestone[]): { with: number; total: number } {
  let withEvidence = 0
  let total = 0
  for (const m of milestones) {
    for (const c of m.done_when) {
      total += 1
      if (hasEvidence(c)) withEvidence += 1
    }
  }
  return { with: withEvidence, total }
}

// ---------------------------------------------------------------------
//  상단 요약 4타일 (DESIGN_BRIEF §4 화면 8) — **사람 수·개인 지표 없음** (P5)
// ---------------------------------------------------------------------

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card pad-sm col-tight grow">
      <span className="label">{label}</span>
      <span className="mono ink text-sub">{value}</span>
      {hint === undefined ? null : <span className="meta">{hint}</span>}
    </div>
  )
}

export function RoadmapSummary({ roadmap, now }: { roadmap: Roadmap; now?: Date }) {
  const cover = evidenceCoverage(roadmap.milestones)
  //  ⚠ 열린 충돌은 **프로젝트 단위**로만 셀 수 있어서 행마다 같은 수가 실려 온다
  //    (라우트 주석). 그래서 더하지 않고 **한 행에서 읽는다** — 더하면 마일스톤 수만큼
  //    부풀어 「충돌 9」가 사실은 충돌 3 이 된다.
  const conflicts = roadmap.milestones[0]?.conflicts ?? 0
  const stale = roadmap.milestones.filter((m) => isStaleReport(m.last_report_at, now))
  const never = roadmap.milestones.filter((m) => m.last_report_at === null)

  return (
    <div className="col-tight">
      {/* 사실 한 줄 (2026-09-11) — 타일보다 먼저 「3개 중 무엇이 어디까지」가 읽힌다. 문장의 정본은 `fact-line.tsx`. */}
      <FactLine parts={roadmapFact(roadmap.milestones.map((m) => m.status), cover)} />
      <div className="row wrap items-start">
        <Tile label="마일스톤" value={roadmap.milestones.length} hint={`공식 v${roadmap.context_version ?? '—'} 기준`} />
        <Tile
          label="근거가 붙은 완료 조건"
          value={`${cover.with} / ${cover.total}`}
          hint={cover.total === 0 ? '완료 조건이 없습니다' : '어떤 파일 몇 번째 줄인지 근거가 붙은 것'}
        />
        {/* 🔴 0 도 그린다 — 「충돌 없음」을 안 보여 주면 사람은 아직 안 센 줄 안다. */}
        <Tile
          label="열린 충돌"
          value={conflicts}
          hint={conflicts === 0 ? '정리할 것이 없습니다' : '결정을 기다리는 카드 · 정리 화면에서 정합니다'}
        />
        <Tile
          label={`${STALE_REPORT_DAYS}일 이상 보고 없음`}
          value={stale.length}
          //  ⚠ 「한 번도 보고 없음」과 섞지 않는다 — 그건 늦은 게 아니라 시작 전이다.
          //  🔴 마일스톤이 0개일 때 「전부 한 번은 보고됐습니다」라고 쓰면 **거짓이다** —
          //     아무것도 없는데 전부 됐다고 말한다. 덤프를 읽어서 잡았다 (⑮ 55바퀴).
          hint={
            roadmap.milestones.length === 0
              ? '아직 마일스톤이 없습니다'
              : never.length > 0
                ? `아직 보고가 없는 마일스톤 ${never.length}`
                : '전부 한 번은 보고됐습니다'
          }
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
//  마일스톤 한 줄 (아코디언)
// ---------------------------------------------------------------------

export type MilestoneRowState = {
  milestone: RoadmapMilestone
  /** 마일스톤 **제목** — 로드맵 응답에는 id(`PL-M1`)뿐이라 화면이 roadmap 항목에서 찾아 준다. 못 찾으면 id 만 선다 (지어내지 않는다). */
  title?: string | null
  expanded: boolean
  /** owner 인가 — `POST /progress/{id}/confirm` 은 owner 전용이다. */
  canConfirm: boolean
  busy: boolean
  error: unknown
  now?: Date
}

export type MilestoneRowHandlers = {
  onToggle: () => void
  onConfirm: () => void
  /** 근거를 눌렀다 — 드로어에 그 보고를 편다 (DESIGN_BRIEF §4 화면 8). */
  onEvidence: (event: ProgressEventView) => void
}

export function MilestoneRow({ state, on }: { state: MilestoneRowState; on: MilestoneRowHandlers }) {
  const { milestone: m, expanded, canConfirm, busy, error, now } = state
  const cover = evidenceCoverage([m])
  const pct = cover.total > 0 ? Math.round((cover.with / cover.total) * 100) : 0
  const stale = isStaleReport(m.last_report_at, now)
  const confirmable = m.confirmable

  return (
    //  상태는 카드가 스스로 말한다 — 완료 확인 대기는 왼쪽 주황 괘선, 완료는 초록 (`data-status` · globals.css · 2026-09-11).
    <section className="card pad col-tight milestone" data-status={m.status}>
      <div className="row-between wrap">
        <button
          type="button"
          className="btn btn-sm grow tree-item"
          aria-expanded={expanded}
          onClick={on.onToggle}
        >
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          {/* 제목이 제일 크다(표제체 `.row-name`) — 「PL-M1」만으로는 무엇을 하는 일인지 아무도 모른다. id 는 그 옆에 작게 (2026-09-11). */}
          {state.title ? <span className="row-name" style={{ marginLeft: 'var(--sp-2)' }}>{state.title}</span> : null}
          <span className="mono meta" style={{ marginLeft: 'var(--sp-2)' }}>{m.milestone}</span>
        </button>
        <div className="row wrap">
          {/* 기한은 Manifest 가 나른 날짜 **그대로**(`YYYY-MM-DD`) — Pack 본문의 `due:` 와 같은 글자다.
              없으면 칸이 없다 — 「기한 없음」도 「-」도 적지 않는다 (없는 것을 지어내지 않는다 · FINDINGS 111).
              ⚠ 「지났다」를 여기서 판정하지 않는다 — 지났는지는 서버도 화면도 아직 안 잰다. */}
          {m.due === null ? null : <span className="meta mono">기한 {m.due}</span>}
          <MilestoneChip status={m.status} />
          {/* 🔴 「마지막 보고」는 늘 경과다 — 「지금 이렇다」를 말할 수 있는 값이 없다. */}
          <span className={stale ? 'meta mono ink-warn' : 'meta mono'}>
            {m.last_report_at === null
              ? '아직 보고가 없습니다'
              : `마지막 보고 ${sinceText(m.last_report_at, now)}${stale ? ' ⚠' : ''}`}
          </span>
        </div>
      </div>

      <div className="row">
        <div
          className="bar grow"
          role="progressbar"
          aria-valuenow={cover.with}
          aria-valuemin={0}
          aria-valuemax={cover.total}
          aria-label={`완료 조건 ${cover.total}개 중 근거 있는 것 ${cover.with}개`}
        >
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
        {/* ⚠ 「완료 n/m」이 아니라 「근거 n/m」이다 — 잰 것만 말한다 (머리 주석). */}
        <span className="meta mono">근거 {cover.with} / {cover.total}</span>
      </div>

      {/* 🔴 [완료 확인] 은 **서버가 확정할 보고를 줬을 때만** 그린다.
          ★ 왜 화면이 상태를 다시 안 세나 — 확정할 수 있는 것은 「아직 확정 안 된 제일
            최근 done_candidate 하나」이고 그 규칙은 라우트에 있다. 화면이 같은 규칙을
            또 적으면 둘이 갈리고, 갈린 날 이 버튼은 누를 때마다 400 을 낸다.
          ⚠ owner 가 아니면 버튼 대신 **무엇이 기다리는지**를 말한다 — 아무 말 없이
            비면 사람은 화면이 덜 만들어진 줄 안다. */}
      {confirmable === null ? null : canConfirm ? (
        <div className="row wrap">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={on.onConfirm}>
            완료 확인
          </button>
          <span className="meta">
            보고: {confirmable.summary} · {sinceText(confirmable.at, now)}
          </span>
        </div>
      ) : (
        <span className="meta">완료 확인은 팀장만 할 수 있습니다 — 보고: {confirmable.summary}</span>
      )}
      {error === null || error === undefined ? null : (
        <span className="meta ink-bad">✕ 확인하지 못했습니다. 다시 시도해주세요.</span>
      )}

      {expanded ? (
        <div className="col-tight">
          {m.done_when.map((c) => (
            <CriterionLine key={c.text} criterion={c} now={now} onEvidence={on.onEvidence} />
          ))}
          {m.paths.length > 0 ? (
            <div className="row wrap">
              <span className="label">경로</span>
              {m.paths.map((p) => <span key={p} className="ctx-tag">{p}</span>)}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/**
 * 완료 조건 한 줄. **근거 수를 색만으로 말하지 않는다** — 아이콘 + 낱말을 같이 낸다
 * (DESIGN_BRIEF §3 「상태를 색만으로 구분하지 않는다」).
 */
function CriterionLine({
  criterion,
  now,
  onEvidence,
}: {
  criterion: RoadmapMilestone['done_when'][number]
  now?: Date
  onEvidence: (event: ProgressEventView) => void
}) {
  const ok = hasEvidence(criterion)
  const last = criterion.last_event
  return (
    <div className="row-between wrap">
      <span className={ok ? 'row grow' : 'row grow ink-3'}>
        {/* 기호(✓/○) 대신 색점 + 낱말 — 특수문자 없이 (2026-09-11). */}
        <span className={ok ? 'chip tone-ok' : 'chip tone-neutral'}><span className="chip-dot" aria-hidden="true" />{ok ? '근거 있음' : '근거 없음'}</span>
        <span className="grow">{criterion.text}</span>
      </span>
      {last === null ? (
        //  ⚠ 「근거 0」이라고 쓰지 않는다 — 보고 자체가 없는 것과 근거 없는 보고는 다르다.
        <span className="meta ink-warn">⚠ 보고 없음</span>
      ) : (
        <button type="button" className="btn btn-sm" onClick={() => onEvidence(last)}>
          근거 {criterion.evidence_count} · {sinceText(last.at, now)}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
//  근거 드로어 — 보고 하나를 펴서 읽는다 (DESIGN_BRIEF §4 화면 8)
// ---------------------------------------------------------------------

/** `{path, start_line?, end_line?, commit_sha?}` → `src/a.ts:14–20 · 7d1b0e4` */
export function evidenceText(e: ProgressEventView['evidence'][number]): string {
  const lines = e.start_line === undefined ? '' : `:${e.start_line}${e.end_line === undefined ? '' : `–${e.end_line}`}`
  const commit = e.commit_sha === undefined ? '' : ` · ${e.commit_sha.slice(0, 7)}`
  return `${e.path}${lines}${commit}`
}

export function ProgressDrawer({
  event,
  onClose,
  now,
}: {
  event: ProgressEventView
  onClose: () => void
  now?: Date
}) {
  return (
    <aside className="card pad col drawer">
      <div className="row-between">
        <span className="label">진행 보고</span>
        <button type="button" className="btn btn-sm" onClick={onClose}>닫기</button>
      </div>
      <p className="ink">{event.summary}</p>
      <div className="col-tight">
        <span className="label">근거</span>
        {/* 🔴 P1 — 서버가 아는 것은 경로·줄·커밋뿐이다. 코드 본문은 각자 로컬에 있다. */}
        {event.evidence.length === 0 ? (
          <span className="meta ink-warn">⚠ 근거 없음</span>
        ) : (
          <>
            {event.evidence.map((e, i) => (
              <span key={`${e.path}-${i}`} className="mono meta scroll-x">{evidenceText(e)}</span>
            ))}
            <span className="meta">코드 본문은 서버에 없습니다 — 로컬에서 열어 보세요.</span>
          </>
        )}
      </div>
      <div className="col-tight">
        <span className="label">보고</span>
        {/* 🔴 P5 — 「누가」가 아니라 「무엇이」다. 사람 이름은 이 응답에 실리지 않는다. */}
        <span className="meta">{PROGRESS_SOURCE_LABEL[event.source]} · {sinceText(event.at, now)}</span>
        <span className="meta mono">그때 받은 판: v{event.context_version}</span>
        {/* 상태는 사람 말로 (`PROGRESS_STATUS_LABEL`) — `done_candidate` 가 그대로 찍혀 있었다. */}
        <span className="meta">보고 상태: {PROGRESS_STATUS_LABEL[event.status]}</span>
        {event.confirmed_at === null
          ? null
          : <span className="meta ink-ok">✓ 확정됨 · {sinceText(event.confirmed_at, now)}</span>}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------
//  로드맵 외 작업 (DESIGN_BRIEF §4 화면 8 하단)
// ---------------------------------------------------------------------

/**
 * 🔴 **`PROGRESS_STATUSES` 의 `none` 이 화면에 처음 나타나는 자리다.**
 * 「이 작업은 어느 마일스톤도 아니다」라고 보고하면 그 보고는 마일스톤 행에 안 붙는다 —
 * 여기가 없으면 그 보고는 **어디에도 안 보인다**.
 *
 * ⚠ [마일스톤에 연결]·[로드맵에 추가 제안] 을 그리지 않는다 (DESIGN_BRIEF 는 적지만
 *   **부를 문이 없다**). 누를 때마다 아무 일도 안 하는 버튼을 두면 누른 사람은
 *   자기가 뭘 잘못한 줄 안다 (`job-progress.tsx` 의 [다시 시도] 와 같은 판단이다).
 */
export function OffRoadmap({
  events,
  total,
  expanded,
  onToggle,
  onEvidence,
  now,
}: {
  events: readonly ProgressEventView[]
  total: number
  expanded: boolean
  onToggle: () => void
  onEvidence: (event: ProgressEventView) => void
  now?: Date
}) {
  if (total === 0) return null
  return (
    <section className="card pad col-tight">
      <button type="button" className="btn btn-sm tree-item" aria-expanded={expanded} onClick={onToggle}>
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        로드맵 외 작업 {total}
      </button>
      {expanded ? (
        <div className="col-tight">
          {events.map((e) => (
            <div key={e.id} className="row-between wrap">
              <span className="grow">{e.summary}</span>
              <button type="button" className="btn btn-sm" onClick={() => onEvidence(e)}>
                근거 {e.evidence.length} · {sinceText(e.at, now)}
              </button>
            </div>
          ))}
          {/* ⚠ 잘렸으면 잘렸다고 말한다 — 안 말하면 「전부 봤다」로 읽힌다. */}
          {events.length < total
            ? <span className="meta">{total}건 중 {events.length}건만 보입니다.</span>
            : null}
        </div>
      ) : null}
    </section>
  )
}
