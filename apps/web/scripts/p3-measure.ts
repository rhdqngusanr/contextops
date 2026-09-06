// =====================================================================
//  scripts/p3-measure.ts — PLAN P3 첫 행의 완료 기준을 **진짜 Gemini 로** 잰다.
//  `pnpm --filter web p3:measure`
//
//  완료 기준 (docs/PLAN.md P3 첫 행): 「paylab 문서 → 항목 12 + 충돌 3 · 모든 AI 호출이
//  `withBudget()` 경유 · `source_ref` offset 이 문서 범위 안」.
//
//  ★ 왜 이 파일인가 (81바퀴 · 2026-09-06) — 시험은 전부 스텁이라 프롬프트가 진짜 모델에서
//    어떤 품질인지 말하지 못한다. 이 문은 **제품이 도는 길 그대로**(라우트 → `ai_jobs` 러너 →
//    `withBudget` → `callModel`)를 PGlite 위에서 한 번 굴리고 수를 남긴다.
//    실측 기록: `docs/evidence/<날짜>-p3-gemini/probe.json`.
//
//  시나리오 — 픽스처의 설계(SPEC §10.1) 그대로다:
//    ① `old-roadmap.md`(폐기된 로드맵 · stale 탐지용)를 §7.1 로 구조화 → 후보 전부 받아 **active**
//    ② `goals.md` 를 §7.1 로 구조화 → 항목 수 · 열린 질문 수 · offset 범위 → 후보 전부 받아 draft
//    ③ ② 의 항목을 「바뀐 묶음」으로 §7.2 탐지 job → 충돌 행 수 · 종류
//
//  ⚠ 돈이 든다(왕복 서너 번 · 토큰 수천) — CI 는 부르지 않는다. 키는 `.env.local` 의
//    `GEMINI_API_KEY`·`GEMINI_MODEL` **둘만** process 로 올린다 (`DATABASE_URL` 은 안 읽는다 —
//    DB 는 `freshDb()` 의 PGlite 다). 출력에 키·프롬프트는 없다. 응답에서 남기는 것은
//    픽스처 문서(공개 합성 자료)의 인용 구간뿐이다 (SPEC §11).
//  ⚠ `runJob()` 을 직접 부른다 — 시험 helper 가 `startJob` 을 적어만 두기 때문이다 (`test/helpers/db.ts`).
// =====================================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { CONFLICT_KIND_RULES, type SourceDocumentKind, type SourceRef } from '@contextops/schema'

import { aiUsage } from '../src/db/schema'
import { createJob, runJob } from '../src/lib/ai/job'
import { fixtureText } from '../src/lib/demo/fixtures'
import { seedSession } from '../src/lib/demo/seed'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { GET as readJob } from '../src/app/api/v1/projects/[id]/jobs/[jobId]/route'
import { POST as acceptJobItems } from '../src/app/api/v1/projects/[id]/jobs/[jobId]/items/route'
import { PATCH as updateItem } from '../src/app/api/v1/projects/[id]/context-items/[itemId]/route'
import { GET as listConflicts } from '../src/app/api/v1/projects/[id]/conflicts/route'
import { closeDb, dataOf, freshDb, params, req, TEST_JWT_SECRET } from '../test/helpers/db'

// ---------------------------------------------------------------------
//  .env.local 에서 GEMINI_* 둘만
// ---------------------------------------------------------------------

const ENV_KEYS = ['GEMINI_API_KEY', 'GEMINI_MODEL'] as const

function loadGeminiEnv(): void {
  const envLocal = resolve(process.cwd(), '.env.local')
  if (!existsSync(envLocal)) return
  for (const line of readFileSync(envLocal, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (!m) continue
    const key = m[1] as (typeof ENV_KEYS)[number]
    if (ENV_KEYS.includes(key) && !process.env[key]) process.env[key] = m[2]!.trim()
  }
}

// ---------------------------------------------------------------------
//  결과 모양 — 사람이 읽는 것은 probe.json 이다
// ---------------------------------------------------------------------

interface RefCheck {
  readonly start: number
  readonly end: number
  readonly inRange: boolean
  readonly heading_path: readonly string[]
  /** 근거 구간의 첫 줄 (픽스처 문서 · 공개 자료). 사람이 「이 항목이 여기서 왔나」를 본다. */
  readonly quote: string
}

interface ItemCheck {
  readonly id: string
  readonly type: string
  readonly title: string
  readonly refs: readonly RefCheck[]
}

interface StructureRun {
  readonly file: string
  readonly kind: SourceDocumentKind
  readonly chars: number
  readonly jobId: string
  readonly status: string | undefined
  readonly error_code: string | null
  readonly latencyMs: number
  readonly chunks: unknown
  readonly items: readonly ItemCheck[]
  readonly itemTypes: Record<string, number>
  readonly open_questions: readonly { question: string; ref: RefCheck }[]
  readonly refsTotal: number
  readonly refsInRange: number
  readonly merge_candidates: unknown
}

function refCheck(ref: SourceRef, text: string): RefCheck {
  if (ref.kind !== 'source_document') {
    return { start: -1, end: -1, inRange: false, heading_path: [], quote: `(${ref.kind})` }
  }
  const inRange = ref.start_char >= 0 && ref.end_char > ref.start_char && ref.end_char <= text.length
  const quote = inRange ? text.slice(ref.start_char, ref.end_char).split('\n')[0]!.slice(0, 100) : ''
  return { start: ref.start_char, end: ref.end_char, inRange, heading_path: ref.heading_path, quote }
}

function countBy<T>(xs: readonly T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of xs) out[key(x)] = (out[key(x)] ?? 0) + 1
  return out
}

// ---------------------------------------------------------------------
//  본체
// ---------------------------------------------------------------------

async function main(): Promise<void> {
  loadGeminiEnv()
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 가 없다 — apps/web/.env.local')
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET

  const { pg, db } = await freshDb()
  const owner = seedSession('p3-owner')
  const P = (projectId: string) => `/api/v1/projects/${projectId}`

  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'P3 measure', slug: 'p3-measure' } }), params({}),
  ))
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${team.id}/projects`, { auth: owner, body: { name: 'paylab-api', slug: 'paylab-api' } }),
    params({ id: team.id as string }),
  ))
  const projectId = project.id as string

  async function structure(file: string, title: string, kind: SourceDocumentKind): Promise<StructureRun> {
    const text = fixtureText(file)
    const doc = await dataOf(await createDocument(req('POST', `${P(projectId)}/documents`, {
      auth: owner, body: { title, kind, content: text },
    }), params({ id: projectId })))
    const jobId = (doc.job as { id: string }).id
    const t0 = Date.now()
    const status = await runJob(jobId)
    const latencyMs = Date.now() - t0
    const job = await dataOf(await readJob(
      req('GET', `${P(projectId)}/jobs/${jobId}`, { auth: owner }), params({ id: projectId, jobId }),
    ))
    const result = (job.result ?? {}) as {
      items?: { id: string; type: string; title: string; source_refs: SourceRef[] }[]
      merge_candidates?: unknown
      chunks?: unknown
      open_question_ids?: string[]
    }
    const items: ItemCheck[] = (result.items ?? []).map((it) => ({
      id: it.id, type: it.type, title: it.title, refs: it.source_refs.map((r) => refCheck(r, text)),
    }))
    //  열린 질문은 행이 됐다 — 문장과 근거는 충돌 목록(kind=open_question)에서 읽는다.
    const oq = await dataOf(await listConflicts(
      req('GET', `${P(projectId)}/conflicts?kind=open_question&limit=200`, { auth: owner }), params({ id: projectId }),
    ))
    const ids = new Set(result.open_question_ids ?? [])
    const open_questions = (oq.conflicts as { id: string; question: string; a_ref: SourceRef | null }[])
      .filter((c) => ids.has(c.id))
      .map((c) => ({ question: c.question, ref: c.a_ref ? refCheck(c.a_ref, text) : refCheck({ kind: 'manual' } as unknown as SourceRef, text) }))
    const refs = [...items.flatMap((i) => i.refs), ...open_questions.map((q) => q.ref)]
    return {
      file, kind, chars: text.length, jobId, status, error_code: (job.error_code as string | null) ?? null, latencyMs,
      chunks: result.chunks, items, itemTypes: countBy(items, (i) => i.type), open_questions,
      refsTotal: refs.length, refsInRange: refs.filter((r) => r.inRange).length,
      merge_candidates: result.merge_candidates,
    }
  }

  async function accept(jobId: string, ids: string[]): Promise<{ accepted: string[]; rejected: unknown[] }> {
    if (ids.length === 0) return { accepted: [], rejected: [] }
    const out = await dataOf(await acceptJobItems(req('POST', `${P(projectId)}/jobs/${jobId}/items`, {
      auth: owner, body: { item_ids: ids },
    }), params({ id: projectId, jobId })))
    return { accepted: (out.accepted as { id: string }[]).map((a) => a.id), rejected: out.rejected as unknown[] }
  }

  // ① 폐기된 로드맵 → active (견줄 상대)
  const roadmap = await structure('paylab-docs/old-roadmap.md', '지난 분기 로드맵', 'roadmap')
  const roadmapAccepted = await accept(roadmap.jobId, roadmap.items.map((i) => i.id))
  let activated = 0
  for (const id of roadmapAccepted.accepted) {
    await dataOf(await updateItem(req('PATCH', `${P(projectId)}/context-items/${id}`, {
      auth: owner, body: { revision: 1, changes: { status: 'active' } },
    }), params({ id: projectId, itemId: id })))
    activated += 1
  }

  // ② 팀장 문서 → draft (바뀐 묶음)
  const goals = await structure('paylab-docs/goals.md', '팀 목표와 규칙', 'goal')
  const goalsAccepted = await accept(goals.jobId, goals.items.map((i) => i.id))

  // ③ 탐지 — batch-draft 가 만드는 것과 같은 job 을 같은 표로 만든다
  let conflictRun: Record<string, unknown> = { skipped: '받아들인 goals 항목이 없다' }
  if (goalsAccepted.accepted.length > 0) {
    const job = await createJob(db, { projectId, feature: 'conflict', input: { changed_item_ids: goalsAccepted.accepted } })
    const t0 = Date.now()
    const status = await runJob(job.id)
    const latencyMs = Date.now() - t0
    const full = await dataOf(await readJob(
      req('GET', `${P(projectId)}/jobs/${job.id}`, { auth: owner }), params({ id: projectId, jobId: job.id }),
    ))
    const all = await dataOf(await listConflicts(
      req('GET', `${P(projectId)}/conflicts?limit=200`, { auth: owner }), params({ id: projectId }),
    ))
    const detected = (all.conflicts as { kind: keyof typeof CONFLICT_KIND_RULES; a_item_id: string | null; b_item_id: string | null; severity: string | null; question: string }[])
      .filter((c) => CONFLICT_KIND_RULES[c.kind].detected)
    conflictRun = {
      jobId: job.id, status, error_code: full.error_code, latencyMs,
      candidates: (full.result as { candidates?: unknown } | null)?.candidates,
      count: detected.length,
      byKind: countBy(detected, (c) => c.kind),
      conflicts: detected.map((c) => ({ kind: c.kind, a: c.a_item_id, b: c.b_item_id, severity: c.severity, question: c.question })),
    }
  }

  const usage = await db
    .select({ feature: aiUsage.feature, model: aiUsage.model, inputTokens: aiUsage.inputTokens, outputTokens: aiUsage.outputTokens, costMicros: aiUsage.costMicros })
    .from(aiUsage)
    .where(eq(aiUsage.projectId, projectId))

  const probe = {
    measured_at: new Date().toISOString(),
    model: process.env.GEMINI_MODEL,
    criteria: {
      'goals.md 항목 ≥ 12': goals.items.length,
      '탐지 충돌 ≥ 3': (conflictRun.count as number | undefined) ?? 0,
      'offset 범위 안 (goals)': `${goals.refsInRange}/${goals.refsTotal}`,
      'offset 범위 안 (old-roadmap)': `${roadmap.refsInRange}/${roadmap.refsTotal}`,
      'withBudget 장부 행': usage.length,
    },
    roadmap: { ...roadmap, accepted: roadmapAccepted, activated },
    goals: { ...goals, accepted: goalsAccepted },
    conflict: conflictRun,
    usage,
  }

  const day = new Date().toLocaleDateString('sv-SE')
  const dir = join(process.cwd(), '..', '..', 'docs', 'evidence', `${day}-p3-gemini`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'probe.json'), JSON.stringify(probe, null, 2), 'utf8')

  console.log(JSON.stringify({
    criteria: probe.criteria,
    roadmap: { status: roadmap.status, error_code: roadmap.error_code, items: roadmap.items.length, types: roadmap.itemTypes, oq: roadmap.open_questions.length, ms: roadmap.latencyMs, activated },
    goals: { status: goals.status, error_code: goals.error_code, items: goals.items.length, types: goals.itemTypes, oq: goals.open_questions.length, ms: goals.latencyMs, accepted: goalsAccepted.accepted.length, rejected: goalsAccepted.rejected.length },
    conflict: { status: conflictRun.status, error_code: conflictRun.error_code, count: conflictRun.count, byKind: conflictRun.byKind, candidates: conflictRun.candidates, ms: conflictRun.latencyMs },
    usage,
    wrote: join(dir, 'probe.json'),
  }, null, 2))

  await closeDb(pg)
}

await main()
