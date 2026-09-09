'use client'

import { use, useState } from 'react'
import {
  CONFLICT_KIND_RULES, CONFLICT_SEVERITY_RANK, itemOutcomeOf,
  type AnswerSlotKey, type ConflictChoice, type ConflictKind, type ContextItemView,
} from '@contextops/schema'

import {
  JOB_POLL_MS, answerQuestions, fetchConflicts, fetchItems, fetchJobs, resolveConflict,
  type AiJobSummary, type ConflictCard as ConflictRow, type ProjectRef,
} from '../../../../../../lib/web/queries'
import { writeDoor } from '../../../../../../lib/web/actor'
import { useAsync, usePolling, type Async } from '../../../../../../lib/web/use-async'
import { AiBadge, ConflictKindChip } from '../../../../../../components/chips'
import { ConflictCard } from '../../../../../../components/conflict-card'
import { JobProgress } from '../../../../../../components/job-progress'
import { ProjectGate } from '../../../../../../components/project-gate'
import { ErrorState, ScreenEmpty, Skeleton } from '../../../../../../components/states'

// =====================================================================
//  화면 4 — 정리 (SPEC §9 화면 4 · DESIGN_BRIEF §4 「화면 4」)
//
//  ★ 이 화면이 **결정이 일어나는 자리**다. 화면 3 이 넣은 것과 플러그인이 훑어 온 것이
//    여기서 사람의 판단을 받고, 그 판단이 화면 5 의 발행으로 간다.
//
//  🔴 **머리의 숫자를 `kind` 로 가른다.** `GET /conflicts` 는 §7.2 탐지가 만든 카드와
//     **사람이 미리 물어 둔 씨앗 질문 10장**을 같이 낸다. 한 수로 합쳐 「AI 가 찾은
//     결정이 필요한 것 14건」이라고 쓰면 그 문장은 거짓이다 — 열 장은 AI 가 찾은 것이
//     아니다. 가르는 기준은 `CONFLICT_KIND_RULES[kind].byAi` 하나다 (배지도 같은 축).
//
//  🔴 **결정한 카드를 목록에서 지우지 않는다.** 응답으로 온 행을 손에 든 목록에 갈아
//     끼운다 — 지우면 방금 누른 사람이 자기가 무엇을 골랐는지 확인할 자리를 잃는다.
//
//  ⚠ accent 가 이 화면에 하나도 없다. 선택 넷은 서로 같은 무게여야 하고
//    (`conflict-card.tsx` 머리 주석), 빈 상태의 [Context로 이동] 만이 다음 걸음이다.
// =====================================================================

/**
 * ⚠ 낱말을 여기 적는 이유는 화면 3 과 같다 — 기능 목록(`AI_FEATURES`)은 서버 전용
 *   표라 화면이 import 할 수 없다. 화면이 아는 것은 「내가 기다리는 일의 이름」뿐이고,
 *   그 일이 무엇을 세는지는 전부 응답에 실려 온다.
 */
const CONFLICT = 'conflict'

export default function ReviewPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const { team, project } = use(params)
  return (
    <ProjectGate team={team} project={project}>
      {({ team: t, project: p }) => (
        //  🔴 결정은 owner 만 할 수 있다 (`POST :resolve`). 화면이 그것을 알아야
        //     member 에게 누를 때마다 403 을 내는 버튼을 그리지 않는다.
        <ReviewView base={`/t/${team}/p/${project}`} project={p} canDecide={t.role === 'owner'} />
      )}
    </ProjectGate>
  )
}

function ReviewView({
  base,
  project,
  canDecide,
}: {
  base: string
  project: ProjectRef
  canDecide: boolean
}) {
  //  🔴 열린 것만 읽는다. 결정된 카드는 응답을 갈아 끼워서 이 화면에 남지만,
  //     새로고침하면 사라진다 — 「무엇이 남았나」가 이 화면의 질문이기 때문이다.
  const cards = useAsync(() => fetchConflicts(project.id, { status: 'open' }), [project.id])
  //  쓰기 문 — 서버와 같은 표(`ACTOR_RULES.writes`)에서 읽는다. 카드마다 다시 읽지 않는다.
  const door = writeDoor()
  //  카드가 가리키는 항목을 붙이려고 한 번 읽는다. 카드마다 따로 읽으면 20장이면 40번이다.
  const items = useAsync(() => fetchItems(project.id, {}), [project.id])
  const jobs = usePolling(
    () => fetchJobs(project.id, { feature: CONFLICT, limit: 1 }),
    [project.id],
    //  끝났으면 멈춘다 — 판정은 `finished_at` 이다 (상태 이름을 손으로 세지 않는다).
    (data) => (data.jobs[0] && data.jobs[0].finished_at === null ? JOB_POLL_MS : null),
  )

  const [filter, setFilter] = useState<ConflictKind | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  //  🔴 「이 답을 무엇으로 저장할까요」 — 열린 질문 카드에서만 고른다 (FINDINGS 105).
  //     ⚠ 기본값은 **고르지 않음**이다 (`''` = 기록만). 기본을 항목으로 두면 사람이
  //       고르지 않은 타입의 초안이 생기고, 그건 서버가 대신 고른 것과 같다.
  const [saveAs, setSaveAs] = useState<Record<string, AnswerSlotKey | ''>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, unknown>>({})
  const [created, setCreated] = useState<Record<string, string[]>>({})

  const all = cards.result.state === 'ready' ? cards.result.data.conflicts : []
  const byId: Map<string, ContextItemView> = new Map(
    (items.result.state === 'ready' ? items.result.data.items : []).map((it) => [it.id, it]),
  )

  /** 손에 든 목록에서 한 장만 갈아 끼운다 — 다시 읽지 않는다 (`useAsync.put`). */
  function replace(row: ConflictRow): void {
    if (cards.result.state !== 'ready') return
    cards.put({
      ...cards.result.data,
      conflicts: cards.result.data.conflicts.map((c) => (c.id === row.id ? row : c)),
    })
  }

  async function act(row: ConflictRow, run: () => Promise<void>): Promise<void> {
    setBusy(row.id)
    setErrors((prev) => ({ ...prev, [row.id]: null }))
    try {
      await run()
    } catch (err) {
      setErrors((prev) => ({ ...prev, [row.id]: err }))
    } finally {
      setBusy(null)
    }
  }

  function choose(row: ConflictRow, choice: ConflictChoice): void {
    void act(row, async () => {
      const note = (drafts[row.id] ?? '').trim()
      const updated = await resolveConflict(row.id, note.length > 0 ? { choice, note } : { choice })
      replace(updated)
      //  🔴 결정이 **항목을 옮겼으면** 항목 목록을 다시 읽는다. 안 읽으면 카드가
      //     「B 항목 → 「폐기」」라고 말하면서 바로 그 옆에 「적용 중」 칩을 그대로 그린다 —
      //     한 카드가 서로 다른 두 말을 한다.
      //  ⚠ 무엇이 옮겨졌나를 여기서 세지 않는다. 표가 답한다 (`itemOutcomeOf`) —
      //     `both`·`dismiss` 는 아무것도 안 옮기므로 다시 읽지 않는다.
      if (itemOutcomeOf({
        kind: row.kind, aItemId: row.a_item_id, bItemId: row.b_item_id, choice,
      })) {
        items.reload()
      }
    })
  }

  function answer(row: ConflictRow): void {
    void act(row, async () => {
      const value = (drafts[row.id] ?? '').trim()
      //  ⚠ 고른 자리가 없으면 칸 자체를 안 싣는다 — `''` 를 보내면 계약이 400 이다.
      const pick = saveAs[row.id]
      const res = await answerQuestions(project.id, [
        pick ? { question_id: row.id, answer: value, save_as: pick } : { question_id: row.id, answer: value },
      ])
      //  🔴 「항목이 만들어졌다」를 답의 수로 말하지 않는다 — 서버가 낸 수를 그대로 쓴다
      //     (화면 3 이 같은 자리에서 배운 것이다).
      setCreated((prev) => ({ ...prev, [row.id]: res.created_item_ids }))
      //  라우트가 `resolution` 에 답변 문장을 남긴다 — 응답이 행을 안 돌려주므로 같은 모양을 만든다.
      replace({ ...row, status: 'resolved', resolution: { choice: 'a', note: value } })
    })
  }

  const byAi = all.filter((c) => CONFLICT_KIND_RULES[c.kind].byAi)
  const asked = all.filter((c) => !CONFLICT_KIND_RULES[c.kind].byAi)
  const shown = (filter === null ? all : all.filter((c) => c.kind === filter)).slice().sort(bySeverity)

  return (
    <>
      <header className="col-tight">
        <h1 className="text-section">정리</h1>
        {/* 🔴 두 수를 **따로** 낸다. 합치면 「AI 가 찾았다」가 씨앗 질문까지 삼킨다. */}
        <p className="meta">
          {cards.result.state === 'ready'
            ? `AI가 찾은 결정이 필요한 것 ${byAi.length}건 · 사람이 미리 물어 둔 질문 ${asked.length}장`
            : '결정을 기다리는 것을 세는 중입니다.'}
        </p>
      </header>

      <DetectionPanel jobs={jobs} />

      {cards.result.state === 'loading' ? <Skeleton rows={5} /> : null}
      {cards.result.state === 'error' ? <ErrorState error={cards.result.error} retry={cards.reload} /> : null}
      {/* ⚠ 항목을 못 읽어도 카드는 그린다 — 그때 카드가 「항목을 찾지 못했다」를 말한다.
          카드를 통째로 안 그리면 결정할 것이 없는 것처럼 보인다. */}
      {items.result.state === 'error'
        ? <p className="meta ink-warn">⚠ 항목 목록을 읽지 못해 A·B 의 내용을 못 붙였습니다.</p>
        : null}

      {cards.result.state === 'ready' && all.length === 0 ? (
        <ScreenEmpty slot="review.cards" base={base} />
      ) : null}

      {all.length > 0 ? <KindFilter cards={all} value={filter} onChange={setFilter} /> : null}

      <div className="col">
        {shown.map((row) => (
          <ConflictCard
            key={row.id}
            state={{
              conflict: row,
              canDecide,
              //  🔴 게스트(문 닫힘)에겐 owner 문장도 [답 저장하기] 도 거짓이다 — 표에서 읽은 이유가 먼저다 (INBOX G13).
              door,
              a: row.a_item_id === null ? null : byId.get(row.a_item_id) ?? null,
              b: row.b_item_id === null ? null : byId.get(row.b_item_id) ?? null,
              draft: drafts[row.id] ?? '',
              saveAs: saveAs[row.id] ?? '',
              busy: busy === row.id,
              error: errors[row.id] ?? null,
              created: created[row.id] ?? null,
            }}
            on={{
              onDraft: (value) => setDrafts((prev) => ({ ...prev, [row.id]: value })),
              onSaveAs: (value) => setSaveAs((prev) => ({ ...prev, [row.id]: value })),
              onChoose: (choice) => choose(row, choice),
              onAnswer: () => answer(row),
            }}
          />
        ))}
      </div>
    </>
  )
}

/**
 * 심각도가 높은 것이 먼저다 (SPEC §7.2 · `CONFLICT_SEVERITY_RANK`).
 * ⚠ 심각도가 없는 종류(질문)는 **맨 뒤**다 — 「낮음」으로 치면 재지 않은 값을 재는 것이다.
 */
function bySeverity(a: ConflictRow, b: ConflictRow): number {
  const rank = (row: ConflictRow): number => (row.severity === null ? -1 : CONFLICT_SEVERITY_RANK[row.severity])
  return rank(b) - rank(a)
}

/**
 * 종류로 거르는 칩 (DESIGN_BRIEF §4 화면 4 「필터 칩」).
 * ⚠ **한 장도 없는 종류는 그리지 않는다.** 늘 0인 칩을 그리면 누를 것이 없는 버튼이
 *   여섯 개 생기고, 사람은 그게 고장인지 빈 것인지 모른다.
 */
function KindFilter({
  cards,
  value,
  onChange,
}: {
  cards: ConflictRow[]
  value: ConflictKind | null
  onChange: (kind: ConflictKind | null) => void
}) {
  const counts = new Map<ConflictKind, number>()
  for (const c of cards) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1)

  return (
    <div className="row wrap">
      <button
        type="button"
        className="btn btn-sm"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        전체 {cards.length}
      </button>
      {[...counts.entries()].map(([kind, n]) => (
        <button
          key={kind}
          type="button"
          className="btn btn-sm"
          aria-pressed={value === kind}
          onClick={() => onChange(value === kind ? null : kind)}
        >
          <ConflictKindChip kind={kind} /> {n}
        </button>
      ))}
    </div>
  )
}

/**
 * §7.2 탐지가 도는 중인지. **화면 3 과 같은 컴포넌트**(`JobProgress`)를 쓴다 —
 * 그 파일의 머리 주석이 예고한 「둘째 사용자」가 여기다.
 *
 * ⚠ 돈 적이 없으면 **아무것도 그리지 않는다.** 「탐지한 적 없음」 카드를 그려 봐야
 *   사람이 할 수 있는 일이 없다 (탐지를 시작하는 문은 `batch-draft` 하나이고 그건
 *   플러그인이 두드린다 — 「바뀐 항목 묶음 하나 = 탐지 한 번」 · §7.2).
 * ★ 그래서 여기에 [지금 탐지하기] 도 두지 않는다. 화면에서 부를 문이 없는데 버튼을
 *   그리면 누른 사람은 자기가 뭘 잘못한 줄 안다 (`job-progress.tsx` 의 [다시 시도] 와
 *   같은 판단이다).
 */
function DetectionPanel({ jobs }: { jobs: { result: Async<{ jobs: AiJobSummary[] }>; reload: () => void } }) {
  const { result } = jobs
  if (result.state === 'error') return <ErrorState error={result.error} retry={jobs.reload} />
  if (result.state !== 'ready') return null

  const job = result.data.jobs[0]
  if (!job) return null

  return (
    <section className="card pad col-tight">
      <div className="row-between">
        <h2 className="text-section">충돌 찾는 중</h2>
        <AiBadge />
      </div>
      {/* ⚠ `done` 을 주지 않는다 — 「무엇이 나왔나」는 이 화면에서 **카드 목록 그 자체**다.
          숫자를 또 내면 목록과 두 곳이 세게 되고, 하나만 새로고침되면 서로 어긋난다. */}
      <JobProgress job={job} />
    </section>
  )
}
