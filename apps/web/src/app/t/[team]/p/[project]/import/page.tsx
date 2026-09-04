'use client'

import { use, useState, type FormEvent } from 'react'
import { SOURCE_DOCUMENT_KINDS, type SourceDocumentKind } from '@contextops/schema'

import { hintFor, messageOf } from '../../../../../../lib/web/api'
import {
  JOB_POLL_MS, acceptJobItems, answerQuestions, createDocument, fetchJob, fetchJobs, fetchQuestions,
  structureCandidates, structureCounts,
  type AiJobSummary, type ProjectRef, type QuestionRow,
} from '../../../../../../lib/web/queries'
import { useAsync, usePolling, type Async } from '../../../../../../lib/web/use-async'
import { AiBadge, SOURCE_DOCUMENT_KIND_LABEL } from '../../../../../../components/chips'
import { JobProgress } from '../../../../../../components/job-progress'
import { ProjectGate } from '../../../../../../components/project-gate'
import { QuestionStack, type QuestionStackState } from '../../../../../../components/question-stack'
import {
  StructureCandidates, type StructureCandidate,
} from '../../../../../../components/structure-candidates'
import { EmptyState, ErrorState, Skeleton } from '../../../../../../components/states'

// =====================================================================
//  화면 3 — 가져오기 (SPEC §9 화면 3 · DESIGN_BRIEF §4 「화면 3」)
//
//  ★ 이 화면이 제품의 **입구**다. 여기서 문서가 들어가고, §7.1 이 그것을 항목 후보와
//    질문으로 뜯고, 그 결과를 사람이 화면 4·5 에서 고른다.
//
//  🔴 **DESIGN_BRIEF 의 세 카드 중 둘을 그린다** — 「문서 붙여넣기」와 「질문에 답하기」다.
//     zip 드롭존은 아직 없다: 서버에 경로 검사·개수·용량 상한이 없다 (SPEC §11 ·
//     FINDINGS 26). **누르면 아무 일도 없는 카드를 두지 마라** — 있는 것과 없는 것이
//     구별되지 않으면 화면 전체가 못 미더워진다 (`components/versions.tsx` 의
//     「롤백 발행」과 같은 판단이다).
//     ⚠ 질문 카드는 열 장이 **프로젝트를 만들 때 심긴다** (`lib/api/seed-questions.ts`).
//       화면이 그 문구를 갖고 있지 않다 — 행에 실려 온 것을 그린다.
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
        <QuestionsCard base={base} projectId={project.id} />
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
//  ② 질문에 답하기 — 「문서가 없어도 됩니다」 (SPEC §9 화면 3 ③ · FINDINGS 67)
//
//  ★ 상태를 여기서만 들고, 그리는 것은 `QuestionStack` 이 한다. 그래야 시험이 그
//    여섯 모양을 브라우저 없이 다 그려 볼 수 있다 (`job-progress.tsx` 와 같은 배치).
// ---------------------------------------------------------------------

function QuestionsCard({ base, projectId }: { base: string; projectId: string }) {
  const { result, reload } = useAsync(() => fetchQuestions(projectId, { status: 'open' }), [projectId])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [saved, setSaved] = useState<{ resolved: number; created: string[] } | null>(null)

  const questions: QuestionRow[] = result.state === 'ready' ? result.data.questions : []

  //  ⚠ 카드를 옮길 때 **그 칸에 이미 쓴 답을 되돌려 놓는다.** 안 하면 [이전] 을 누른
  //    사람이 자기가 쓴 답이 사라진 줄 안다.
  function moveTo(next: number): void {
    setIndex(next)
    const q = questions[next]
    setDraft(q ? answers[q.id] ?? '' : '')
  }

  const state: QuestionStackState = { questions, index, answers, draft, saving, error, saved }

  async function save(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const body = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }))
      const res = await answerQuestions(projectId, body)
      setSaved({ resolved: res.resolved.length, created: res.created_item_ids })
      //  답한 질문은 닫혔다 — 목록을 다시 읽어 두면 새로고침 없이도 남은 것이 맞다.
      reload()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card pad col grow">
      <div className="col-tight">
        <h2 className="text-section">질문에 답하기</h2>
        <p className="meta">문서가 없어도 됩니다. 답한 것이 초안 항목이 되고, 발행하면 첫 버전이 됩니다.</p>
      </div>

      {result.state === 'loading' ? <Skeleton rows={3} /> : null}
      {result.state === 'error' ? <ErrorState error={result.error} retry={reload} /> : null}
      {result.state === 'ready' ? (
        <QuestionStack
          state={state}
          contextHref={`${base}/context`}
          on={{
            onDraft: setDraft,
            onNext: ({ skip }) => {
              const q = questions[index]
              if (!skip && q) setAnswers({ ...answers, [q.id]: draft.trim() })
              moveTo(index + 1)
            },
            onBack: () => moveTo(Math.max(0, Math.min(index, questions.length) - 1)),
            onSave: save,
          }}
        />
      ) : null}
    </section>
  )
}

// ---------------------------------------------------------------------
//  ③ 구조화 진행 — polling (SPEC §9 화면 3)
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
      {job ? (
        <JobProgress job={job} done={<Succeeded base={base} projectId={projectId} jobId={job.id} />} />
      ) : null}
    </section>
  )
}

/**
 * 🔴 **성공하면 「무엇이 나왔는지」에서 멈추지 않는다 — 고르는 자리까지가 이 카드다**
 * (FINDINGS 84).
 *
 * ★ 왜 여기인가 — 이 카드가 「항목 후보 N개를 찾았습니다」라고 말하는 자리다.
 *   그 말만 하고 [Context 보기] 로 보내면 사람은 **아무것도 없는 표**를 본다.
 *   찾았다고 말한 자리가 곧 받아들이는 자리여야 그 말이 사실이 된다.
 * ⚠ 전문(`shape:'full'`)은 목록에 없다 (FINDINGS 60) — 그래서 여기서 한 번 더 읽는다.
 */
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
      <Candidates
        base={base}
        projectId={projectId}
        jobId={jobId}
        candidates={structureCandidates(result.data.result)}
      />
    </div>
  )
}

/**
 * 화면 3 이 후보 카드에 들려 주는 **상태와 손잡이**. 그리는 것은
 * `components/structure-candidates.tsx` 다 (거기 주석이 그 카드의 정본이다).
 */
function Candidates({
  base,
  projectId,
  jobId,
  candidates,
}: {
  base: string
  projectId: string
  jobId: string
  candidates: StructureCandidate[]
}) {
  //  ★ 기본은 **전부 선택**이다 — 왜인지는 카드 쪽 주석에 있다.
  const [picked, setPicked] = useState<Set<string>>(() => new Set(candidates.map((c) => c.id)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [made, setMade] = useState<number | null>(null)

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const accept = async () => {
    setSaving(true)
    setError(null)
    try {
      const done = await acceptJobItems(projectId, jobId, [...picked])
      setMade(done.accepted.length)
    } catch (e) {
      //  ⚠ 지어내지 않는다 — 서버가 낸 문장을 그대로 옮긴다 (`messageOf`).
      setError(messageOf(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <StructureCandidates
      state={{ candidates, picked, saving, error, made }}
      base={base}
      onToggle={toggle}
      onAccept={accept}
    />
  )
}
