'use client'

import { use, useState, type FormEvent } from 'react'
import { SOURCE_DOCUMENT_KINDS, type SourceDocumentKind } from '@contextops/schema'

import { hintFor } from '../../../../../../lib/web/api'
import {
  JOB_POLL_MS, createDocument, fetchJob, fetchJobs,
  type AiJobSummary, type ProjectRef,
} from '../../../../../../lib/web/queries'
import { sinceText } from '../../../../../../lib/web/time'
import { useAsync, usePolling, type Async } from '../../../../../../lib/web/use-async'
import { AiBadge, AiJobStatusChip, SOURCE_DOCUMENT_KIND_LABEL } from '../../../../../../components/chips'
import { ProjectGate } from '../../../../../../components/project-gate'
import { EmptyState, ErrorState, Skeleton } from '../../../../../../components/states'
import styles from './import.module.css'

// =====================================================================
//  화면 3 — 가져오기 (SPEC §9 화면 3 · DESIGN_BRIEF §4 「화면 3」)
//
//  ★ 이 화면이 제품의 **입구**다. 여기서 문서가 들어가고, §7.1 이 그것을 항목 후보와
//    질문으로 뜯고, 그 결과를 사람이 화면 4·5 에서 고른다.
//
//  🔴 **DESIGN_BRIEF 의 세 카드 중 하나만 그린다** — 「문서 붙여넣기」다.
//     zip 드롭존은 서버에 경로 검사·개수·용량 상한이 아직 없고(SPEC §11 · FINDINGS 26),
//     질문 카드 10장은 그 열 개를 만드는 코드가 없다. **누르면 아무 일도 없는 카드를
//     두지 마라** — 있는 것과 없는 것이 구별되지 않으면 화면 전체가 못 미더워진다
//     (`components/versions.tsx` 의 「롤백 발행」과 같은 판단이다).
//
//  🔴 **진행 표시는 새로고침을 견딘다.** job id 를 state 에만 들고 있으면 새로고침
//     한 번에 길을 잃고, 사람은 문서를 다시 올린다 — 그게 §7.5 의 시간당 5회를 태우는
//     자리다 (FINDINGS 58). 그래서 이 화면은 **언제나 `GET …/jobs?feature=structure
//     &limit=1` 부터 읽는다.** 방금 올렸든 어제 올렸든 그리는 것은 그 한 줄이다.
//
//  ⚠ accent 는 [구조화하기] 하나뿐이다 (DESIGN_BRIEF §3).
// =====================================================================

/**
 * ⚠ 낱말을 여기 적는 이유 — 기능 목록(`AI_FEATURES`)은 **서버 전용 표**라 화면이
 *   import 할 수 없다 (`lib/ai/features.ts` 머리 주석: 계약 패키지로 올리면 플러그인
 *   번들로 사용자 기계에 배포된다). 화면이 아는 것은 「내가 기다리는 일의 이름」
 *   하나뿐이고, 그 일이 **무엇을 어떻게 세는지**(`unit`·`stallAfterSec`)는 전부
 *   응답에 실려 온다 — 그래서 아래 어디에도 `feature ===` 갈래가 없다.
 */
const STRUCTURE = 'structure'

export default function ImportPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const { team, project } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ project: p }) => <ImportView base={`/t/${team}/p/${project}`} project={p} />}
    </ProjectGate>
  )
}

function ImportView({ base, project }: { base: string; project: ProjectRef }) {
  const jobs = usePolling(
    () => fetchJobs(project.id, { feature: STRUCTURE, limit: 1 }),
    [project.id],
    //  🔴 **끝났으면 멈춘다.** 「끝났나」를 상태 이름으로 세지 않는다 (`succeeded`·
    //     `failed` 를 손으로 적으면 수명이 늘 때 이 화면이 영원히 두드린다).
    //     `finished_at` 이 그 판정의 결과다 — DB CHECK 이 `AI_JOB_STATUS_RULES` 에서
    //     생성되어 「끝난 상태면 이 칸이 찬다」를 강제한다 (`db/schema.ts`).
    (data) => (data.jobs[0] && data.jobs[0].finished_at === null ? JOB_POLL_MS : null),
  )

  return (
    <>
      <header className="col-tight">
        <h1 className="text-section">가져오기</h1>
        <p className="meta">
          있는 것부터 시작하세요. 올린 문서는 팀의 목표·정책·결정 후보로 정리되고,
          결정이 필요한 것만 질문으로 남습니다.
        </p>
      </header>

      <div className="row items-start wrap">
        <PasteCard projectId={project.id} onCreated={jobs.reload} />
        <StructureCard base={base} projectId={project.id} jobs={jobs} />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------
//  ① 문서 붙여넣기
// ---------------------------------------------------------------------

function PasteCard({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<SourceDocumentKind>('goal')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  //  ⚠ 서버 계약(`CreateDocument`)이 `min(1)` 이다. 여기서 먼저 막는 이유는 검증이
  //    아니라 **버튼을 누를 수 있는지**를 사람에게 보여 주기 위해서다 — 서버 계약을
  //    화면에 다시 적지 않는다 (빈 값 하나만 본다).
  const ready = title.trim().length > 0 && content.trim().length > 0

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createDocument(projectId, { title: title.trim(), kind, content })
      //  ⚠ 응답의 `job` 을 들고 다니지 않는다 — 그것은 `{id,status}` 뿐인 **셋째 모양**
      //    이라 진행률도 `stalled` 도 없다 (FINDINGS 63). 옆 카드가 목록에서 다시 읽는다.
      setTitle('')
      setContent('')
      onCreated()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card pad col grow" onSubmit={submit}>
      <div className="col-tight">
        <h2 className="text-section">문서 붙여넣기</h2>
        <p className="meta">목표 문서·정책·회의록 무엇이든 됩니다. 서버가 받는 것은 여기 붙여넣은 글자뿐입니다.</p>
      </div>

      <label className="field">
        <span className="label">제목</span>
        <input
          className="input"
          value={title}
          maxLength={200}
          placeholder="2026 4분기 목표"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">종류</span>
        {/* 표를 읽기만 한다 — `<option>` 을 손으로 적으면 종류가 늘 때 화면이 빠뜨린다. */}
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value as SourceDocumentKind)}>
          {SOURCE_DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>{SOURCE_DOCUMENT_KIND_LABEL[k]}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="label">본문</span>
        <textarea
          className="textarea"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={'# 2026 4분기 목표\n\n- 결제 재시도는 5회까지, 지수 백오프를 쓴다.\n- 환불 SLA 는 24시간이다.'}
        />
        <span className="meta mono">{content.length.toLocaleString()}자</span>
      </label>

      {error ? <ErrorState error={error} /> : null}

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={!ready || busy}>구조화하기</button>
        <span className="meta">
          {busy ? '올리는 중입니다…' : 'AI 가 항목 후보와 질문을 만듭니다. 결정은 사람이 합니다.'}
        </span>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------
//  ② 구조화 진행 — polling (SPEC §9 화면 3)
// ---------------------------------------------------------------------

function StructureCard({
  base,
  projectId,
  jobs,
}: {
  base: string
  projectId: string
  jobs: { result: Async<{ jobs: AiJobSummary[] }>; reload: () => void }
}) {
  const { result } = jobs
  const job = result.state === 'ready' ? result.data.jobs[0] : undefined

  return (
    <section className="card pad col drawer">
      <div className="row-between">
        <h2 className="text-section">구조화 진행</h2>
        <AiBadge />
      </div>

      {result.state === 'loading' ? <Skeleton rows={3} /> : null}
      {result.state === 'error' ? <ErrorState error={result.error} retry={jobs.reload} /> : null}
      {result.state === 'ready' && !job ? (
        <EmptyState message="아직 올린 문서가 없습니다. 왼쪽에 문서를 붙여넣어 보세요." />
      ) : null}
      {job ? <JobPanel base={base} projectId={projectId} job={job} /> : null}
    </section>
  )
}

function JobPanel({ base, projectId, job }: { base: string; projectId: string; job: AiJobSummary }) {
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

      <Progress job={job} />

      {/* 🔴 판정 옆에 **근거**를 같이 둔다 (DESIGN_BRIEF §2-1). 「멈췄다」만 있으면
          사람은 그 말을 확인할 방법이 없다. 「실시간」이라고 쓰지 않는다 (§2-3). */}
      <span className="meta mono" title={job.updated_at}>마지막 걸음 {sinceText(job.updated_at)}</span>

      {job.stalled ? (
        <p className="meta">
          이 일이 한동안 움직이지 않았습니다. 문서를 다시 올려 주세요.
        </p>
      ) : null}

      {job.status === 'failed' ? <Failed job={job} /> : null}
      {job.status === 'succeeded' ? <Succeeded base={base} projectId={projectId} jobId={job.id} /> : null}
    </>
  )
}

/**
 * 🔴 `progress` 가 `null` 이면 **회전**, 있으면 **막대**다.
 * `null` 은 「0 걸음 갔다」가 아니라 「아직 총수를 모른다」이고, 그 둘을 같게 그리면
 * 「4조각 중 0」과 「몇 조각인지도 모름」이 화면에서 같아진다 (FINDINGS 62).
 * ⚠ 가운뎃말(`조각`·`묶음`)은 값에 실려 온 `unit` 을 **그대로** 쓴다 — 화면이 고르지 않는다.
 */
function Progress({ job }: { job: AiJobSummary }) {
  if (!job.progress) {
    return (
      <div className="col-tight">
        <div className="skeleton" />
        {/* ⚠ 「몇 조각」이라고 쓰지 않는다 — 걸음의 낱말(`unit`)은 진행률과 같이
            오는 값이라, 진행률이 없는 지금은 **그 낱말도 모른다.** */}
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
        className={styles.bar}
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${total}${unit} 중 ${done}`}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <span className="meta mono">{total}{unit} 중 {done} · {pct}%</span>
    </div>
  )
}

/**
 * 실패해도 **어디까지 갔는지는 남는다** — `progress` 는 수명 CHECK 밖이라 지워지지 않는다.
 * 「4조각 중 1조각에서 멈췄습니다」가 실패 화면이 사람에게 할 수 있는 유일한 참말이다.
 */
function Failed({ job }: { job: AiJobSummary }) {
  return (
    <div className="col-tight">
      <p className="ink-bad">✕ {hintFor(job.error_code)}</p>
      {job.progress ? (
        <span className="meta">
          {job.progress.total}{job.progress.unit} 중 {job.progress.done}에서 멈췄습니다.
        </span>
      ) : null}
    </div>
  )
}

/** 성공하면 **무엇이 나왔는지**를 센다 — 전문(`shape:'full'`)은 목록에 없다 (FINDINGS 60). */
function Succeeded({ base, projectId, jobId }: { base: string; projectId: string; jobId: string }) {
  const { result, reload } = useAsync(() => fetchJob(projectId, jobId), [projectId, jobId])

  if (result.state === 'loading') return <Skeleton rows={2} />
  if (result.state === 'error') return <ErrorState error={result.error} retry={reload} />

  const counts = structureCounts(result.data.result)
  if (!counts) {
    //  ⚠ 「succeeded 인데 result 가 없다」는 DB CHECK 이 막는 모양이다. 그래도 화면이
    //    빈 칸을 그리지 않게 한 문장을 둔다 — 지어낸 숫자보다 「못 읽었다」가 낫다.
    return <p className="meta">{hintFor(null)}</p>
  }
  return (
    <div className="col-tight">
      <p className="ink-ok">✓ 항목 후보 {counts.items}개 · 질문 {counts.questions}개를 찾았습니다.</p>
      {counts.chunks ? (
        <span className="meta mono">읽은 조각 {counts.chunks.used} / {counts.chunks.total}</span>
      ) : null}
      <a className="btn btn-sm" href={`${base}/context`}>Context 보기</a>
    </div>
  )
}

/**
 * §7.1 이 낸 것에서 **셀 수 있는 것만** 꺼낸다 (`lib/ai/job.ts` 의 `structureJob.run`).
 * ⚠ 모양이 다르면 `null` 이다 — 없는 칸을 0 으로 채우면 「0개를 찾았다」가 되어,
 *   못 읽은 것과 아무것도 못 찾은 것이 화면에서 같아진다.
 */
function structureCounts(result: unknown): {
  items: number
  questions: number
  chunks: { used: number; total: number } | null
} | null {
  if (typeof result !== 'object' || result === null) return null
  const r = result as { items?: unknown; open_question_ids?: unknown; chunks?: unknown }
  if (!Array.isArray(r.items) || !Array.isArray(r.open_question_ids)) return null
  const chunks = r.chunks as { used?: unknown; total?: unknown } | undefined
  return {
    items: r.items.length,
    questions: r.open_question_ids.length,
    chunks: typeof chunks?.used === 'number' && typeof chunks.total === 'number'
      ? { used: chunks.used, total: chunks.total }
      : null,
  }
}
