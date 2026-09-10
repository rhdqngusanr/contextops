'use client'

import { use, useState, type FormEvent } from 'react'
import {
  SOURCE_DOCUMENT_KINDS, type AnswerSlotKey, type SourceDocumentKind,
} from '@contextops/schema'

import { writeDoor, type WriteDoor } from '../../../../../../lib/web/actor'
import { hintFor, messageOf } from '../../../../../../lib/web/api'
import { AI_TRANSFER_NOTICE_NOW, PRIVACY_LABEL, PRIVACY_PATH } from '../../../../../../lib/web/privacy'
import { SAMPLE_DOCUMENT } from '../../../../../../lib/web/sample-document'
import {
  JOB_POLL_MS, acceptJobItems, answerQuestions, createDocument, fetchJob, fetchJobs, fetchQuestions,
  retryJob, structureCandidates, structureCounts,
  type AiJobSummary, type ProjectRef, type QuestionRow,
} from '../../../../../../lib/web/queries'
import { useAsync, usePolling, type Async } from '../../../../../../lib/web/use-async'
import { AiBadge, SOURCE_DOCUMENT_KIND_LABEL, Note } from '../../../../../../components/chips'
import { JobProgress } from '../../../../../../components/job-progress'
import { ProjectGate } from '../../../../../../components/project-gate'
import { QuestionStack, type QuestionStackState } from '../../../../../../components/question-stack'
import {
  StructureCandidates, type StructureCandidate,
} from '../../../../../../components/structure-candidates'
import { ErrorState, ReadOnlyNotice, ScreenEmpty, Skeleton } from '../../../../../../components/states'

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
//  ⚠ accent 는 [AI 로 정리하기] 하나뿐이다 (DESIGN_BRIEF §3).
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
  const door = writeDoor()
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
          팀 문서가 있으면 붙여넣고, 없으면 질문에 답하세요. 둘 다 해도 됩니다.
          AI 가 정리한 결과는 「AI 정리 진행」 칸에 나타나고, 무엇을 남길지는 사람이 고릅니다.
        </p>
      </header>

      {/* 🔴 쓰기 문은 **누르기 전에** 서버와 같은 표(`ACTOR_RULES.writes`)를 읽는다 (INBOX H7 · FINDINGS 135).
          세 카드가 같은 문을 받는다 — 게스트가 [AI 로 정리하기]·[저장하기]·[항목으로 만들기] 를 누르면 403 대신 그 자리에 이유가 뜬다. */}
      {/* 🔴 **자리를 격자로 못 박는다** (2026-09-11). `wrap` 이던 동안 카드 셋의 자리가
          폭에 따라 바뀌었고(캡처 09-07 과 09-10 이 서로 다르다), 그래서 「AI 정리 진행」이
          질문 카드 옆에 서서 **질문의 진행**처럼 보였다. 격자에서는 붙여넣기와 그 결과가
          늘 한 줄이고, 「문서가 없어도 되는 길」인 질문 카드가 그 아래 한 줄을 통째로 쓴다.
          ⚠ 자리를 정하는 것은 `globals.css` 의 `.import-grid` 네 줄이다 — 여기서 폭을 적지 마라. */}
      <div className="import-grid">
        <PasteCard projectId={project.id} onCreated={jobs.reload} door={door} />
        <StructureCard base={base} projectId={project.id} jobs={jobs} door={door} />
        <QuestionsCard base={base} projectId={project.id} door={door} />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------
//  ① 문서 붙여넣기
// ---------------------------------------------------------------------

function PasteCard({ projectId, onCreated, door }: { projectId: string; onCreated: () => void; door: WriteDoor }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<SourceDocumentKind>('goal')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  //  읽기 전용 주체가 눌렀을 때 그 자리에 뜨는 이유 (FINDINGS 135 와 같은 모양).
  const [refused, setRefused] = useState<string | null>(null)

  /** [예시 문서 붙여넣기] — 정본 픽스처를 한 번에 채운다 (INBOX H5). 서버를 부르지 않는다 — 게스트도 눌러 볼 수 있다. */
  function fillSample(): void {
    setTitle(SAMPLE_DOCUMENT.title)
    setKind(SAMPLE_DOCUMENT.kind)
    setContent(SAMPLE_DOCUMENT.content)
  }

  //  ⚠ 서버 계약(`CreateDocument`)이 `min(1)` 이다. 여기서 먼저 막는 이유는 검증이
  //    아니라 **버튼을 누를 수 있는지**를 사람에게 보여 주기 위해서다 — 서버 계약을
  //    화면에 다시 적지 않는다 (빈 값 하나만 본다).
  const ready = title.trim().length > 0 && content.trim().length > 0

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!door.open) { setRefused(door.reason); return }
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
    <form className="card pad col import-paste" onSubmit={submit}>
      <div className="col-tight">
        <h2 className="text-section">문서 붙여넣기</h2>
        <p className="meta">문서가 있으면 여기서 시작하세요. 목표 문서·정책·회의록 무엇이든 됩니다. 서버가 받는 것은 여기 붙여넣은 글자뿐입니다.</p>
        {/* 손에 든 문서가 없는 사람(심사위원)을 위한 문 — 정본 픽스처 goals.md 를 채운다. 실측 표가 이 문서로 잰 것이다. */}
        <span className="row"><button type="button" className="btn btn-sm" onClick={fillSample}>예시 문서 붙여넣기</button><span className="meta">샘플 팀의 목표 문서 · {SAMPLE_DOCUMENT.content.length.toLocaleString()}자</span></span>
      </div>

      {refused ? <ReadOnlyNotice reason={refused} onClose={() => setRefused(null)} /> : null}

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

      {/* 🔴 문서를 넣기 **전**에 읽는 문장 — 어디로 가고 누가 볼 수 있나 (INBOX H4). 정본은 `lib/web/privacy.ts`. */}
      <p className="meta">{AI_TRANSFER_NOTICE_NOW} <a href={PRIVACY_PATH}>{PRIVACY_LABEL}</a></p>

      {error ? <ErrorState error={error} /> : null}

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={!ready || busy}>AI 로 정리하기</button>
        {/* 🔴 **왜 못 누르는지를 버튼 옆에서 말한다** (2026-09-11). 잠긴 알약만 서 있으면
            본문만 붙여넣고 제목을 안 적은 사람은 그것을 「고장」으로 읽는다 — 이 화면의
            유일한 accent 버튼이 첫 화면부터 죽어 보이던 자리다.
            ⚠ 제목과 본문을 갈라 말하지 않는다 — 한 문장이면 충분하고, 갈래가 늘면
              화면이 `ready` 의 조건을 두 번 적게 된다. */}
        <span className="meta">
          {busy
            ? '올리는 중입니다…'
            : !ready
              ? '제목과 본문을 채우면 누를 수 있습니다.'
              : 'AI 가 항목 후보와 질문을 만듭니다. 결정은 사람이 합니다.'}
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

function QuestionsCard({ base, projectId, door }: { base: string; projectId: string; door: WriteDoor }) {
  const [refused, setRefused] = useState<string | null>(null)
  const { result, reload } = useAsync(() => fetchQuestions(projectId, { status: 'open' }), [projectId])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  //  🔴 「이 답을 무엇으로 저장할까요」 — 열린 질문 카드에서만 고른다 (FINDINGS 106).
  //     ⚠ 답과 **따로** 든다. 한 장씩 넘기는 스택이라 사람은 고른 뒤에 답을 고치거나
  //       [이전] 로 되돌아온다 — 답에 묶어 두면 그때 고른 자리가 사라진다.
  //     ⚠ 기본값은 **고르지 않음**(`''` = 답만 저장)이다. 기본을 항목으로 두면 사람이
  //       고르지 않은 타입의 초안이 생기고, 그건 서버가 대신 고른 것과 같다 (화면 4 와 같은 판단).
  const [saveAs, setSaveAs] = useState<Record<string, AnswerSlotKey | ''>>({})
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

  const state: QuestionStackState = { questions, index, answers, saveAs, draft, saving, error, saved }

  async function save(): Promise<void> {
    if (!door.open) { setRefused(door.reason); return }
    setSaving(true)
    setError(null)
    try {
      //  ⚠ 고른 자리가 없으면 칸 자체를 안 싣는다 — `''` 를 보내면 계약이 400 이다.
      //    씨앗 질문에는 값이 안 생긴다 (카드가 고르는 칸을 안 그린다) — 실으면 서버가
      //    「저장될 자리가 이미 정해져 있다」로 400 을 낸다.
      const body = Object.entries(answers).map(([question_id, answer]) => {
        const pick = saveAs[question_id]
        return pick ? { question_id, answer, save_as: pick } : { question_id, answer }
      })
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
    <section className="card pad col import-questions">
      <div className="col-tight">
        <h2 className="text-section">질문에 답하기</h2>
        <p className="meta">문서가 없어도 됩니다. 답한 것이 초안 항목이 되고, 발행하면 첫 버전이 됩니다.</p>
      </div>

      {refused ? <ReadOnlyNotice reason={refused} onClose={() => setRefused(null)} /> : null}

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
            onSaveAs: (value) => {
              const q = questions[index]
              if (q) setSaveAs({ ...saveAs, [q.id]: value })
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
  door,
}: {
  base: string
  projectId: string
  door: WriteDoor
  jobs: { result: Async<{ jobs: AiJobSummary[] }>; reload: () => void }
}) {
  const { result } = jobs
  const job = result.state === 'ready' ? result.data.jobs[0] : undefined
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<unknown>(null)

  //  🔴 **누를 수 있는지는 여기서 안 본다** — `JobProgress` 가 서버와 같은 표를 읽어
  //     버튼을 그릴지 정한다 (`canRetryJob` · FINDINGS 59). 화면이 조건을 다시 적으면
  //     그 조건이 서버와 갈린다.
  async function retry(jobId: string): Promise<void> {
    setRetrying(true)
    setRetryError(null)
    try {
      await retryJob(projectId, jobId)
      //  ⚠ 응답의 job 을 들고 다니지 않는다 — 그리는 것은 언제나 목록이 낸 한 줄이다
      //    (`PasteCard` 와 같은 판단). `reload` 가 polling 을 다시 켠다.
      jobs.reload()
    } catch (err) {
      setRetryError(err)
    } finally {
      setRetrying(false)
    }
  }

  return (
    <section className="card pad col import-progress">
      <div className="row-between">
        <h2 className="text-section">AI 정리 진행</h2>
        <AiBadge />
      </div>

      {result.state === 'loading' ? <Skeleton rows={3} /> : null}
      {result.state === 'error' ? <ErrorState error={result.error} retry={jobs.reload} /> : null}
      {result.state === 'ready' && !job ? (
        <ScreenEmpty slot="import.jobs" base={base} />
      ) : null}
      {job ? (
        <JobProgress
          job={job}
          done={<Succeeded base={base} projectId={projectId} jobId={job.id} door={door} />}
          retry={{ run: () => { void retry(job.id) }, busy: retrying }}
        />
      ) : null}
      {/* ⚠ 다시 굴리기가 **실패했을 때**의 자리다 — job 자신의 실패(`JobFailed`)와
          다른 것이라 문구를 겹쳐 두지 않는다. 예산이 아직 안 풀렸으면 job 은 다시
          `failed` 로 돌아오고, 그건 여기가 아니라 위 카드가 말한다. */}
      {retryError ? <p className="ink-bad">{messageOf(retryError)}</p> : null}
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
function Succeeded({ base, projectId, jobId, door }: { base: string; projectId: string; jobId: string; door: WriteDoor }) {
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
      <Note tone="ok">항목 후보 {counts.items}개 · 질문 {counts.questions}개를 찾았습니다.</Note>
      {/* ⚠ 숫자만 mono 로 세워 두면 「4 / 12」가 무엇의 넷인지 안 읽힌다 — 문장으로 말한다. */}
      {counts.chunks ? (
        <span className="meta">문서 {counts.chunks.total}조각 중 {counts.chunks.used}조각을 읽었습니다.</span>
      ) : null}
      <Candidates
        base={base}
        projectId={projectId}
        jobId={jobId}
        door={door}
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
  door,
  candidates,
}: {
  base: string
  projectId: string
  jobId: string
  door: WriteDoor
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
    //  읽기 전용 주체 — 403 을 받으러 가지 않고 그 자리에서 이유를 말한다 (INBOX H7). 문구는 서버와 같은 표에서 온다.
    if (!door.open) { setError(door.reason); return }
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
