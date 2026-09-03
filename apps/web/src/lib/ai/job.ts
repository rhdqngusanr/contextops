import { after } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { ItemId, ListQuery, type ErrorCode } from '@contextops/schema'

import { getDb, type Db } from '../../db/client'
import {
  AI_JOB_STATUSES,
  aiJobs,
  conflicts,
  sourceDocumentVersions,
  sourceDocuments,
  type AiJobStatus,
} from '../../db/schema'
import { conflictRow } from '../api/conflict'
import { ApiError, fail } from '../api/error'
import { detectConflicts } from './conflict'
import { AI_JOB_FEATURES, isAiJobFeature, type AiJobFeature } from './features'
import { structureDocument } from './structure'

// =====================================================================
//  apps/web/src/lib/ai/job.ts — **한 요청 안에서 안 끝나는 AI 일** (SPEC §7.1·§7.2 · §9 화면 3)
//
//  🔴 **왜 job 이 필요한가** — 12 chunk 짜리 문서 구조화도, 40개 항목의 충돌 탐지도
//     HTTP 요청 하나가 살아 있는 동안 끝나지 않는다. SPEC §9 화면 3 이
//     「구조화 진행 표시(polling)」라고 적은 것이 그 뜻이다. 그래서 라우트는
//     **행 하나를 만들고 즉시 답하고**, 화면은 그 행을 읽는다.
//
//  🔴 **구조화와 탐지가 같은 자리를 쓴다.** 다른 것은 「무엇을 읽나(`input`)」와
//     「무엇을 냈나(`result`)」 둘뿐이고, 그 둘의 모양은 아래 `AI_JOB_RUNNERS` 표가
//     정한다. 기능마다 표를 만들면 화면이 polling 할 자리가 기능 수만큼 늘어난다.
//
//  🔴 **낸 것을 행으로 옮기는 것이 여기 있다.** `structureDocument()`·`detectConflicts()`
//     는 값을 낼 뿐 DB 에 쓰지 않는다 (그 두 파일의 주석). 쓰는 자리가 이 파일 하나다 —
//     그래서 「탐지는 도는데 충돌 표는 영원히 0건」이 될 수 없다.
//
//  ⚠ P1 — `input` 에 들어가는 것은 **가리키는 id** 뿐이다 (문서 버전 uuid · `item_<slug>`).
//    본문은 여기에도 `ai_jobs` 에도 들어가지 않는다. 실패해도 남기는 것은 **에러 코드
//    하나**이고 모델의 응답이나 드라이버 메시지는 남기지 않는다 (SPEC §11).
// =====================================================================

/** 러너가 보는 job — 자기 행의 id 와 어느 프로젝트인지가 전부다. */
export interface AiJobRef {
  readonly id: string
  readonly projectId: string
}

export interface AiJobRunContext<I> {
  readonly db: Db
  readonly job: AiJobRef
  /** `input` 스키마로 이미 판 값이다. 러너가 다시 파싱하지 않는다. */
  readonly input: I
}

/**
 * job 한 종류가 하는 일. **`run` 이 낸 것이 그대로 `ai_jobs.result` 가 된다.**
 *
 * ⚠ `run` 은 메서드 문법이다 (화살표가 아니다) — 그래야 구체적인 `I` 를 가진 러너를
 *   `AiJobRunner`(=`unknown`) 자리에 담을 수 있다. 표의 값은 종류마다 입력이 다르다.
 */
export interface AiJobRunner<I = unknown> {
  /** 이 job 의 정본 § — 고치기 전에 읽을 곳. */
  readonly spec: string
  /** `ai_jobs.input` 의 계약. **id 만 담는다** (P1). */
  readonly input: z.ZodType<I>
  run(ctx: AiJobRunContext<I>): Promise<unknown>
}

// ---------------------------------------------------------------------
//  §7.1 문서 구조화
// ---------------------------------------------------------------------

/** ⚠ 문서 **본문**이 아니라 버전 id 다. 본문은 러너가 DB 에서 읽는다 (P1). */
export const StructureJobInput = z.object({ document_version_id: z.uuid() }).strict()

const structureJob: AiJobRunner<z.infer<typeof StructureJobInput>> = {
  spec: '§7.1',
  input: StructureJobInput,
  async run({ db, job, input }) {
    //  🔴 **그 프로젝트의 문서인지 여기서 확인한다.** 안 하면 job 의 input 하나로
    //     남의 팀 문서를 읽게 된다 — 근거가 남의 원문을 가리키는 자리다 (P7).
    const [version] = await db
      .select({ id: sourceDocumentVersions.id, content: sourceDocumentVersions.content })
      .from(sourceDocumentVersions)
      .innerJoin(sourceDocuments, eq(sourceDocuments.id, sourceDocumentVersions.documentId))
      .where(and(
        eq(sourceDocumentVersions.id, input.document_version_id),
        eq(sourceDocuments.projectId, job.projectId),
      ))
      .limit(1)
    if (!version) fail('NOT_FOUND', '그 프로젝트의 문서 버전이 아니다')

    const out = await structureDocument({
      projectId: job.projectId,
      documentVersionId: version.id,
      content: version.content,
    })

    //  🔴 열린 질문은 **질문 카드 = `kind:'open_question'` 인 충돌 행**이다
    //     (`lib/api/conflict.ts` 머리 주석 — 카드 표를 둘로 만들지 않는다).
    //     ⚠ `anchor:'document'` 라서 `a_ref` 만 찬다. 그 판정은 `conflictRow()` 가
    //        표를 읽어서 하고 DB CHECK 이 막는다.
    const rows = out.open_questions.map((q) => conflictRow({
      projectId: job.projectId,
      kind: 'open_question',
      question: q.question,
      aRef: q.source_ref,
    }))
    const made = rows.length === 0
      ? []
      : await db.insert(conflicts).values(rows).returning({ id: conflicts.id })

    //  ⚠ 항목 초안은 **행으로 만들지 않는다.** 사람이 화면 4 에서 고르기 전에
    //     `context_items` 에 넣으면 승인 절차가 무의미해진다 (batch-draft 의 주석과 같은 자리).
    return {
      items: out.items,
      merge_candidates: out.merge_candidates,
      chunks: out.chunks,
      open_question_ids: made.map((r) => r.id),
    }
  },
}

// ---------------------------------------------------------------------
//  §7.2 충돌 탐지
// ---------------------------------------------------------------------

/** ⚠ 항목 **본문**이 아니라 `item_<slug>` 목록이다. 본문은 §7.2 가 DB 에서 읽는다 (P1). */
export const ConflictJobInput = z.object({ changed_item_ids: z.array(ItemId).min(1) }).strict()

const conflictJob: AiJobRunner<z.infer<typeof ConflictJobInput>> = {
  spec: '§7.2',
  input: ConflictJobInput,
  async run({ db, job, input }) {
    const out = await detectConflicts({
      projectId: job.projectId,
      changedItemIds: input.changed_item_ids,
    })

    //  🔴 여기가 **`conflicts` 표에 쓰는 첫 코드**다. §7.2 가 내는 넷은 전부
    //     `anchor:'items'` 라 `a_item_id`·`b_item_id`·`severity` 만 찬다 —
    //     `a_ref` 를 같이 주면 DB 가 거부한다 (일부러 그렇게 만들었다).
    const rows = out.conflicts.map((c) => conflictRow({
      projectId: job.projectId,
      kind: c.kind,
      question: c.question,
      aItemId: c.a_item_id,
      bItemId: c.b_item_id ?? null,
      severity: c.severity,
    }))
    const made = rows.length === 0
      ? []
      : await db.insert(conflicts).values(rows).returning({ id: conflicts.id })

    return { candidates: out.candidates, conflict_ids: made.map((r) => r.id) }
  },
}

/**
 * 🔴 **job 종류의 정본 표.** 키는 `AI_FEATURE_LIMITS` 의 `job: true` 에서 나온다 —
 * 손으로 적은 목록이 아니다.
 *
 * ★ 기능 하나를 job 으로 만드는 절차 — 셋이고, 앞의 둘은 기계가 막아 준다:
 *   ① `AI_FEATURE_LIMITS` 의 그 줄에서 `job: false` → `true`
 *   ② 이 표에 한 줄  ← ①만 하면 여기서 타입 검사가 막힌다
 *   ③ `pnpm --filter web db:generate` — `ai_jobs_feature_ck` 가 따라온다
 *      ← ③을 안 하면 그 기능의 job 행은 DB 가 거부한다
 */
export const AI_JOB_RUNNERS: { [K in AiJobFeature]: AiJobRunner } = {
  structure: structureJob,
  conflict: conflictJob,
}

// ---------------------------------------------------------------------
//  문 — 만들고 · 굴리고 · 읽는다
// ---------------------------------------------------------------------

/**
 * job 행을 만든다. **아직 아무것도 돌지 않는다** — 굴리는 것은 `startJob()` 이다.
 *
 * ⚠ `input` 이 계약과 다르면 `INTERNAL` 이다 (`VALIDATION_FAILED` 가 아니다).
 *   이 값은 사용자가 보낸 것이 아니라 **서버가 만든 것**이라, 어긋났으면 우리 잘못이다.
 */
export async function createJob(db: Db, opts: {
  projectId: string
  feature: AiJobFeature
  input: unknown
}): Promise<{ id: string; status: AiJobStatus }> {
  const parsed = AI_JOB_RUNNERS[opts.feature].input.safeParse(opts.input)
  if (!parsed.success) fail('INTERNAL', `job input 이 계약과 다르다: ${opts.feature}`)

  const [row] = await db
    .insert(aiJobs)
    .values({ projectId: opts.projectId, feature: opts.feature, input: parsed.data })
    .returning({ id: aiJobs.id, status: aiJobs.status })
  if (!row) fail('INTERNAL', 'job 행을 만들지 못했다')
  return row
}

/**
 * 🔴 job 하나를 **끝까지** 돌린다. 던지지 않는다 — 실패도 행에 남는 것이 결과다.
 *
 * ★ 왜 첫 UPDATE 가 `status='queued'` 를 조건으로 다나 — 그게 **집기(claim)** 다.
 *   두 요청이 같은 job 을 동시에 집으면 LLM 을 두 번 부르고 예산을 두 배로 태운다.
 *   조건부 UPDATE 는 Postgres 가 한 쪽만 통과시킨다. 진 쪽은 `undefined` 를 받는다.
 *
 * @returns 끝난 상태, 또는 이미 누가 집어 갔으면 `undefined`
 */
export async function runJob(jobId: string, now: Date = new Date()): Promise<AiJobStatus | undefined> {
  const db = getDb()
  const [claimed] = await db
    .update(aiJobs)
    .set({ status: 'running', startedAt: now, updatedAt: now })
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.status, 'queued')))
    .returning({
      id: aiJobs.id,
      projectId: aiJobs.projectId,
      feature: aiJobs.feature,
      input: aiJobs.input,
    })
  if (!claimed) return undefined

  //  ⚠ DB CHECK 이 job 이 아닌 기능을 막지만, 타입도 여기서 좁혀야 한다.
  //    표(`AI_FEATURE_LIMITS.job`)를 읽는 문 하나로만 좁힌다 — 이름을 손으로 세지 마라.
  if (!isAiJobFeature(claimed.feature)) return await finishFailed(db, jobId, 'INTERNAL')

  try {
    const runner = AI_JOB_RUNNERS[claimed.feature]
    const result = await runner.run({
      db,
      job: { id: claimed.id, projectId: claimed.projectId },
      input: runner.input.parse(claimed.input),
    })
    await db
      .update(aiJobs)
      .set({ status: 'succeeded', result: result ?? {}, finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(aiJobs.id, jobId))
    return 'succeeded'
  } catch (err) {
    //  🔴 **코드 하나만 남긴다** (P1 · SPEC §11). `AI_OUTPUT_INVALID`·`BUDGET_EXCEEDED`·
    //     `RATE_LIMITED` 는 화면이 갈래를 타는 근거이고, 그 밖의 것(키 없음 포함)은
    //     `INTERNAL` 이다. 예외의 문구는 어디에도 남기지 않는다 — 드라이버 예외의
    //     message 에는 질의문이 통째로 들어 있다.
    return await finishFailed(db, jobId, err instanceof ApiError ? err.code : 'INTERNAL')
  }
}

async function finishFailed(db: Db, jobId: string, code: ErrorCode): Promise<AiJobStatus> {
  await db
    .update(aiJobs)
    .set({ status: 'failed', errorCode: code, finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(aiJobs.id, jobId))
  return 'failed'
}

/**
 * 🔴 **응답을 보낸 뒤에** job 을 굴린다.
 *
 * ★ 왜 `after()` 인가 — 서버리스는 응답을 보내면 함수를 얼린다. 그냥 떠 있는
 *   promise 는 거기서 죽고, job 은 영원히 `queued` 로 남는다. `after()` 는 그 사이를
 *   벌려 주는 유일한 문이다 (Next 15).
 * ⚠ 여기서 `await` 하지 마라 — 그러면 job 을 만든 뜻이 없어진다 (요청이 다시 길어진다).
 */
export function startJob(jobId: string): void {
  starter(jobId)
}

type JobStarter = (jobId: string) => void

const defaultStarter: JobStarter = (jobId) => {
  try {
    after(async () => { await runJob(jobId) })
  } catch {
    //  ⚠ 요청 문맥이 없는 자리에서도 라우트를 부른다 (`scripts/dev-server.ts` · 관통).
    //     거기서 `after()` 는 던진다. 그 자리에는 **얼어붙을 서버리스가 없으므로**
    //     그냥 띄워 두는 것으로 충분하다. 배포에서는 위 갈래만 탄다.
    void runJob(jobId).catch(() => {})
  }
}

let starter: JobStarter = defaultStarter

/**
 * 시험 전용 문. `setDbForTest`·`setAiClientForTest` 와 같은 이유로 있다 —
 * `after()` 는 요청 문맥 안에서만 도는데 시험은 핸들러를 직접 부른다.
 */
export function setJobStarterForTest(s: JobStarter | undefined): void {
  starter = s ?? defaultStarter
}

// ---------------------------------------------------------------------
//  질의 — 화면 3 이 **도는 job 을 다시 찾는** 자리 (FINDINGS 58)
// ---------------------------------------------------------------------

/**
 * 🔴 `GET /projects/{id}/jobs` 의 질의 (SPEC §5 `?feature&status`).
 *
 * ★ 왜 목록이 필요한가 — job id 는 `POST /documents` 의 **응답에만** 있다. 화면이
 *   그 id 를 state 에만 들고 있으면 새로고침 한 번에 길을 잃고, 사람은 「안 됐나 보다」
 *   하며 문서를 다시 올린다 — 그게 §7.5 의 시간당 5회를 태우는 자리다.
 *   그래서 **id 없이도 다시 찾을 수 있는 문**이 하나 있어야 한다.
 *
 * ★ 왜 `packages/schema` 가 아니라 여기인가 — `feature` 의 값 목록이
 *   `AI_JOB_FEATURES`(서버 전용 표 `features.ts`)에서 온다. 그 표를 계약 패키지로
 *   올리면 플러그인 번들에 통째로 실려 사용자 기계로 배포된다 (`features.ts` 머리 주석).
 *   대신 `ListQuery`(계약)를 **넓히기만** 한다 — `limit`·`offset` 의 뜻과 상한은
 *   다른 목록 라우트와 한 곳에서 갈린다.
 */
export const AiJobQuery = ListQuery.extend({
  feature: z.enum(AI_JOB_FEATURES as readonly [AiJobFeature, ...AiJobFeature[]]).optional(),
  status: z.enum(AI_JOB_STATUSES).optional(),
}).strict()

// ---------------------------------------------------------------------
//  응답 — 모양 **둘**. 목록은 무거운 칸을 안 나른다 (FINDINGS 60)
// ---------------------------------------------------------------------

/**
 * 응답 모양 둘. **화면은 이 값으로 「`result` 가 없다」와 「아직 안 받았다」를 가른다.**
 * 값이 없는데 왜 없는지 모르면 화면은 「실패했나」와 「목록만 읽었나」를 구별할 수 없다.
 */
export const AI_JOB_SHAPES = ['summary', 'full'] as const
export type AiJobShape = (typeof AI_JOB_SHAPES)[number]

/**
 * 🔴 **job 응답 칸의 정본 표.** 상세도 목록도 여기서 나온다 —
 * **라우트가 칸을 손으로 고르지 않는다.** 고르게 두면 「목록에는 있는데 상세에는 없는 칸」이
 * 조용히 생기고, 그때 화면은 두 응답을 같은 것으로 다룬다.
 *
 * ★ `heavy: true` 인 칸은 **목록에서 빠진다.** 왜 — 목록은 화면 3 이 2초마다 두드리는
 *   자리인데 `result.items` 에는 §7.1 이 문서에서 뽑은 항목 초안이 통째로 들어 있다.
 *   `limit` 상한이 `LIST_LIMIT_MAX`(200) 라 한 요청이 항목 수천 개를 나를 수 있다.
 *   목록이 답하는 질문은 「지금 무엇이 도나」뿐이고, 전문은 `…/jobs/{jobId}` 가 낸다.
 *   ⚠ `input` 은 무겁지 않다 — 계약이 **가리키는 id 만** 담게 막고 있고 (P1),
 *     화면이 「이게 내 문서의 job 인가」를 그 칸으로 가른다.
 *
 * ★ 칸을 하나 더하는 절차 — 둘이고 **라우트는 안 고친다**:
 *   ① 이 표에 한 줄 (`heavy` 를 고른다) ② `AiJobSummaryRow`/`toAiJob()` 에 한 줄
 *   ← ①만 하면 ②에서 타입 검사가 막는다
 */
export const AI_JOB_FIELDS = {
  id: { column: aiJobs.id, heavy: false },
  project_id: { column: aiJobs.projectId, heavy: false },
  feature: { column: aiJobs.feature, heavy: false },
  status: { column: aiJobs.status, heavy: false },
  input: { column: aiJobs.input, heavy: false },
  result: { column: aiJobs.result, heavy: true },
  error_code: { column: aiJobs.errorCode, heavy: false },
  started_at: { column: aiJobs.startedAt, heavy: false },
  finished_at: { column: aiJobs.finishedAt, heavy: false },
  created_at: { column: aiJobs.createdAt, heavy: false },
} as const

type AiJobFields = typeof AI_JOB_FIELDS
type HeavyField = {
  [K in keyof AiJobFields]: AiJobFields[K]['heavy'] extends true ? K : never
}[keyof AiJobFields]
type FullColumns = { [K in keyof AiJobFields]: AiJobFields[K]['column'] }
type SummaryColumns = Omit<FullColumns, HeavyField>

function columnsOf(withHeavy: boolean) {
  return Object.fromEntries(
    Object.entries(AI_JOB_FIELDS)
      .filter(([, field]) => withHeavy || !field.heavy)
      .map(([name, field]) => [name, field.column]),
  ) as FullColumns
}

/** job **한 장**을 돌려줄 때 읽는 칸 전부 (`GET …/jobs/{jobId}`). */
export const AI_JOB_COLUMNS: FullColumns = columnsOf(true)
/** **목록**이 읽는 칸 (`GET …/jobs`) — 위 표에서 `heavy` 를 뺀 나머지다. */
export const AI_JOB_LIST_COLUMNS: SummaryColumns = columnsOf(false)

type AiJobSummaryRow = {
  id: string
  project_id: string
  feature: string
  status: AiJobStatus
  input: unknown
  error_code: string | null
  started_at: Date | null
  finished_at: Date | null
  created_at: Date
}
type AiJobFullRow = AiJobSummaryRow & { result: unknown }

/**
 * 응답 모양을 한 자리에서 만든다 — job 을 만드는 라우트가 둘, 읽는 라우트가 둘이다.
 *
 * ★ 두 모양을 **행이 정한다** — 라우트가 고르지 않는다. `result` 칸이 함께 왔으면
 *   `full`, 안 왔으면 `summary` 다. 그래서 라우트가 고르는 것은 **어느 칸 표를
 *   `select()` 에 주나** 하나뿐이고, 응답의 `shape` 는 거기서 저절로 따라온다.
 */
export function toAiJob(row: AiJobSummaryRow | AiJobFullRow) {
  const summary = {
    //  ⚠ 첫 칸이다 — 응답을 눈으로 읽는 사람이 「무엇이 빠졌나」를 먼저 본다.
    shape: ('result' in row ? 'full' : 'summary') as AiJobShape,
    id: row.id,
    project_id: row.project_id,
    feature: row.feature,
    status: row.status,
    input: row.input,
    error_code: row.error_code,
    started_at: row.started_at === null ? null : row.started_at.toISOString(),
    finished_at: row.finished_at === null ? null : row.finished_at.toISOString(),
    created_at: row.created_at.toISOString(),
  }
  return 'result' in row ? { ...summary, result: row.result } : summary
}
