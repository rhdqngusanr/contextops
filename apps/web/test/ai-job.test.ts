import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type Anthropic from '@anthropic-ai/sdk'
import type { PGlite } from '@electric-sql/pglite'
import { asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CONFLICT_KIND_RULES, DETECTED_CONFLICT_KINDS } from '@contextops/schema'

import {
  AI_JOB_STATUSES,
  AI_JOB_STATUS_RULES,
  aiJobs,
  conflicts,
  type AiJobStatus,
} from '../src/db/schema'
import type { Db } from '../src/db/client'
import { setAiClientForTest } from '../src/lib/ai/client'
import { AI_FEATURES, AI_FEATURE_LIMITS, AI_JOB_FEATURES } from '../src/lib/ai/features'
import {
  AI_JOB_COLUMNS,
  AI_JOB_FIELDS,
  AI_JOB_LIST_COLUMNS,
  AI_JOB_RUNNERS,
  AI_JOB_SHAPES,
  createJob,
  runJob,
} from '../src/lib/ai/job'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { POST as batchDraft } from '../src/app/api/v1/projects/[id]/context-items/batch-draft/route'
import { GET as readJob } from '../src/app/api/v1/projects/[id]/jobs/[jobId]/route'
import { GET as listJobs } from '../src/app/api/v1/projects/[id]/jobs/route'
import { GET as listConflicts } from '../src/app/api/v1/projects/[id]/conflicts/route'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../src/app/api/v1/projects/[id]/repos/route'
import {
  closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, startedJobIds, TEST_JWT_SECRET,
} from './helpers/db'
import { batchBody, draft } from './helpers/fixtures'

// =====================================================================
//  AI job (SPEC §7.1·§7.2 · §9 화면 3) — 「도나」가 아니라 **「무엇이 갈리는가」**를 잰다
//
//  🔴 여기서 재는 것 다섯:
//    ① 표가 목록을 정한다 — `AI_FEATURE_LIMITS.job` → `AI_JOB_FEATURES` → `AI_JOB_RUNNERS`
//    ② 수명 4종이 **DB 에서 서로 다른 모양**이다 (CHECK 이 실제로 문다)
//    ③ **집기(claim)는 한 번뿐**이다 — 같은 job 을 두 번 굴려도 LLM 은 한 번만 돈다
//    ④ 낸 것이 **행이 된다** — §7.2 는 충돌 카드로, §7.1 의 열린 질문은 질문 카드로
//    ⑤ 실패도 **코드 하나로** 남는다 (본문·스택은 어디에도 없다 · P1)
//
//  ⚠ **키가 없어서 진짜 Claude 를 부른 것이 아니다.** 스텁 클라이언트로 잰다.
// =====================================================================

let pg: PGlite | undefined
let db: Db

const PAYLAB_GOALS = readFileSync(
  fileURLToPath(new URL('../../../fixtures/paylab-docs/goals.md', import.meta.url)),
  'utf8',
)

// ---------------------------------------------------------------------
//  스텁 클라이언트 — `ai-conflict.test.ts` 와 같은 모양이다
// ---------------------------------------------------------------------

interface StubReply {
  input?: unknown
  inputTokens?: number
  outputTokens?: number
}

let calls = 0

function stubAi(reply: (n: number) => StubReply): void {
  calls = 0
  setAiClientForTest({
    messages: {
      create: async (r: { tools: { name: string }[] }) => {
        const answer = reply(calls++)
        return {
          content: [{ type: 'tool_use', name: r.tools[0]!.name, input: answer.input }],
          usage: {
            input_tokens: answer.inputTokens ?? 100,
            output_tokens: answer.outputTokens ?? 50,
          },
        }
      },
    },
  } as unknown as Anthropic)
}

// ---------------------------------------------------------------------
//  씨앗 — 전부 **라우트를 거쳐** 만든다 (핸들러 안을 베껴 쓰지 않는다)
// ---------------------------------------------------------------------

async function seed() {
  const owner = sessionJwt('job-owner')
  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }),
    params({}),
  ))
  const teamId = team.id as string
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }),
    params({ id: teamId }),
  ))
  const projectId = project.id as string
  await createRepo(
    req('POST', `/api/v1/projects/${projectId}/repos`, { auth: owner, body: { name: 'paylab-api' } }),
    params({ id: projectId }),
  )
  return { owner, teamId, projectId }
}

/** 문서 하나를 라우트로 올리고, 그 응답이 낸 job 을 돌려준다. */
async function uploadDoc(owner: string, projectId: string, content = PAYLAB_GOALS) {
  const data = await dataOf(await createDocument(
    req('POST', `/api/v1/projects/${projectId}/documents`, {
      auth: owner, body: { title: '목표', kind: 'goal', content },
    }),
    params({ id: projectId }),
  ))
  return data as { current_version_id: string; job: { id: string; status: AiJobStatus } }
}

/** 항목 둘을 올리고 그 응답이 낸 탐지 job 을 돌려준다. */
async function uploadItems(owner: string, projectId: string) {
  const data = await dataOf(await batchDraft(
    req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner,
      body: batchBody([draft('item_retry_new'), draft('item_retry_old')]),
    }),
    params({ id: projectId }),
  ))
  return data as { accepted: { id: string }[]; job: { id: string; status: AiJobStatus } | null }
}

async function jobRow(jobId: string) {
  const [row] = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1)
  return row!
}

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  delete process.env.AI_DAILY_BUDGET_USD
  delete process.env.ANTHROPIC_MODEL
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
}, 60_000)

afterEach(async () => {
  setAiClientForTest(undefined)
  await closeDb(pg)
  pg = undefined
})

// =====================================================================
describe('🔴 표가 목록을 정한다 — 손으로 적은 job 목록이 한 곳도 없다', () => {
  it('`AI_JOB_RUNNERS` 의 키가 `AI_FEATURE_LIMITS.job` 에서 나온 목록과 같다', () => {
    expect(Object.keys(AI_JOB_RUNNERS).sort()).toEqual([...AI_JOB_FEATURES].sort())
    //  ①만 재면 아무것도 증명하지 않는다 — 표의 축이 실제로 갈리는지 같이 본다.
    expect(AI_JOB_FEATURES).toEqual(AI_FEATURES.filter((f) => AI_FEATURE_LIMITS[f].job))
    expect(AI_FEATURES.filter((f) => !AI_FEATURE_LIMITS[f].job)).toEqual(['ask', 'demo'])
  })

  it('러너마다 정본 § 이 다르고, 그게 기능 표의 § 과 같다', () => {
    const specs = AI_JOB_FEATURES.map((f) => AI_JOB_RUNNERS[f].spec)
    expect(new Set(specs).size).toBe(AI_JOB_FEATURES.length)
    for (const f of AI_JOB_FEATURES) expect(AI_JOB_RUNNERS[f].spec).toBe(AI_FEATURE_LIMITS[f].spec)
  })

  it('러너의 `input` 계약이 서로 다르다 — 한쪽 입력을 다른 쪽에 넣으면 판이 실패한다', () => {
    const structureInput = { document_version_id: '11111111-1111-4111-8111-111111111111' }
    const conflictInput = { changed_item_ids: ['item_retry'] }
    expect(AI_JOB_RUNNERS.structure.input.safeParse(structureInput).success).toBe(true)
    expect(AI_JOB_RUNNERS.structure.input.safeParse(conflictInput).success).toBe(false)
    expect(AI_JOB_RUNNERS.conflict.input.safeParse(conflictInput).success).toBe(true)
    expect(AI_JOB_RUNNERS.conflict.input.safeParse(structureInput).success).toBe(false)
  })

  it('🔴 `input` 계약에 **본문을 담을 칸이 없다** (P1)', () => {
    for (const f of AI_JOB_FEATURES) {
      const bad = f === 'structure'
        ? { document_version_id: '11111111-1111-4111-8111-111111111111', content: '문서 본문' }
        : { changed_item_ids: ['item_retry'], body: '항목 본문' }
      expect(AI_JOB_RUNNERS[f].input.safeParse(bad).success, `${f}: 본문이 통과했다`).toBe(false)
    }
  })
})

// =====================================================================
describe('🔴 수명 4종이 DB 에서 서로 다른 모양이다 (AI_JOB_STATUS_RULES → CHECK)', () => {
  const COLUMNS = ['started_at', 'finished_at', 'result', 'error_code'] as const
  type Column = (typeof COLUMNS)[number]

  /** 그 상태에서 그 칸이 차야 하는가 — 표가 답한다. */
  function needs(status: AiJobStatus, column: Column): boolean {
    const rule = AI_JOB_STATUS_RULES[status]
    return column === 'started_at' ? rule.started
      : column === 'finished_at' ? rule.finished
      : column === 'result' ? rule.result
      : rule.error
  }

  const FILLED: Record<Column, string> = {
    started_at: 'now()',
    finished_at: 'now()',
    result: `'{}'::jsonb`,
    error_code: `'INTERNAL'`,
  }

  async function insert(projectId: string, status: AiJobStatus, flip?: Column): Promise<void> {
    const values = COLUMNS.map((c) => {
      const filled = needs(status, c) !== (c === flip)
      return filled ? FILLED[c] : 'null'
    })
    await pg!.query(
      `insert into ai_jobs (project_id, feature, status, input, ${COLUMNS.join(', ')})
       values ($1, 'structure', '${status}', '{}'::jsonb, ${values.join(', ')})`,
      [projectId],
    )
  }

  it('표대로 채운 행은 4종 다 들어가고, 칸 하나만 뒤집으면 **전부** 거부된다', async () => {
    const { projectId } = await seed()
    for (const status of AI_JOB_STATUSES) {
      await insert(projectId, status)
      for (const column of COLUMNS) {
        await expect(insert(projectId, status, column), `${status}/${column} 이 통과했다`).rejects.toThrow()
      }
    }
    const rows = await db.select({ status: aiJobs.status }).from(aiJobs)
    expect(rows.length).toBe(AI_JOB_STATUSES.length)
  })

  it('job 이 아닌 기능(`ask`)은 행이 될 수 없다 — `ai_jobs_feature_ck`', async () => {
    const { projectId } = await seed()
    await expect(pg!.query(
      `insert into ai_jobs (project_id, feature, status, input) values ($1, 'ask', 'queued', '{}'::jsonb)`,
      [projectId],
    )).rejects.toThrow()
  })
})

// =====================================================================
describe('🔴 낸 것이 행이 된다 — 충돌 표가 처음으로 찬다 (SPEC §7.2)', () => {
  it('탐지 결과가 `conflicts` 행이 되고, 종류마다 표가 말한 칸만 찬다', async () => {
    const { owner, projectId } = await seed()
    const { accepted, job } = await uploadItems(owner, projectId)
    expect(accepted.length).toBe(2)
    expect(job).not.toBeNull()

    //  탐지 종류 넷을 전부 낸다 — 넷 다 항목 대 항목이다.
    stubAi(() => ({
      input: {
        conflicts: DETECTED_CONFLICT_KINDS.map((kind, i) => ({
          kind,
          a_item_id: 'item_retry_new',
          b_item_id: 'item_retry_old',
          question: `${kind} 인가?`,
          severity: i === 0 ? 'high' : 'low',
        })),
      },
    }))

    expect(await runJob(job!.id)).toBe('succeeded')

    const rows = await db.select().from(conflicts)
      .where(eq(conflicts.projectId, projectId)).orderBy(asc(conflicts.kind))
    expect(rows.length).toBe(DETECTED_CONFLICT_KINDS.length)
    for (const row of rows) {
      const rule = CONFLICT_KIND_RULES[row.kind]
      //  표가 `anchor:'items'` 라고 했으므로 항목 칸이 차고 원문 칸은 비어 있다.
      expect(rule.anchor).toBe('items')
      expect(row.aItemId).toBe('item_retry_new')
      expect(row.bItemId).toBe('item_retry_old')
      expect(row.aRef).toBeNull()
      expect(row.severity).not.toBeNull()
    }

    //  결과가 job 에도 남는다 — 화면 4 가 어느 카드가 이번에 생겼는지 안다.
    const done = await jobRow(job!.id)
    expect((done.result as { conflict_ids: string[] }).conflict_ids.length)
      .toBe(DETECTED_CONFLICT_KINDS.length)
    expect(done.errorCode).toBeNull()
  })

  it('충돌 화면이 그 행을 그대로 읽는다 — 「충돌 N건」이 0 이 아니게 된다', async () => {
    const { owner, projectId } = await seed()
    const { job } = await uploadItems(owner, projectId)
    stubAi(() => ({
      input: {
        conflicts: [{
          kind: 'contradiction',
          a_item_id: 'item_retry_new',
          b_item_id: 'item_retry_old',
          question: '재시도는 3회인가 5회인가?',
          severity: 'high',
        }],
      },
    }))
    await runJob(job!.id)

    const data = await dataOf(await listConflicts(
      req('GET', `/api/v1/projects/${projectId}/conflicts`, { auth: owner }),
      params({ id: projectId }),
    ))
    const list = data.conflicts as { kind: string; a_item_id: string; severity: string }[]
    expect(list.length).toBe(1)
    expect(list[0]).toMatchObject({ kind: 'contradiction', a_item_id: 'item_retry_new', severity: 'high' })
  })

  it('열린 질문은 **질문 카드**가 된다 — `a_ref` 만 차고 항목 칸은 빈다 (SPEC §7.1)', async () => {
    const { owner, projectId } = await seed()
    const { job } = await uploadDoc(owner, projectId)
    stubAi(() => ({
      input: {
        items: [],
        open_questions: [{ question: '재시도 상한이 5회인가 3회인가?', span: { start_char: 5, end_char: 30 } }],
      },
    }))

    expect(await runJob(job.id)).toBe('succeeded')

    const [row] = await db.select().from(conflicts).where(eq(conflicts.projectId, projectId))
    expect(row!.kind).toBe('open_question')
    expect(CONFLICT_KIND_RULES.open_question.anchor).toBe('document')
    expect(row!.aItemId).toBeNull()
    expect(row!.severity).toBeNull()
    expect(row!.aRef).not.toBeNull()
    //  근거가 원문 구간을 가리킨다 — 근거 없는 질문 카드는 없다 (P7).
    expect((row!.aRef as { kind: string }).kind).toBe('source_document')
  })

  it('항목 초안은 행이 되지 않는다 — 사람이 고르기 전에 `context_items` 에 넣지 않는다', async () => {
    const { owner, projectId } = await seed()
    const { job } = await uploadDoc(owner, projectId)
    stubAi(() => ({
      input: {
        items: [{
          id: 'item_refund_sla',
          type: 'policy',
          title: '환불 SLA',
          body: '문서에 적힌 규칙을 그대로 옮겼다.',
          scope: { kind: 'project' },
          data: { rule: '환불은 접수 후 24시간 안에 종결한다', severity: 'must', enforcement: 'review' },
          span: { start_char: 0, end_char: 20 },
        }],
        open_questions: [],
      },
    }))
    await runJob(job.id)

    const done = await jobRow(job.id)
    expect((done.result as { items: unknown[] }).items.length).toBe(1)
    const items = await dataOf(await readJob(
      req('GET', `/api/v1/projects/${projectId}/jobs/${job.id}`, { auth: owner }),
      params({ id: projectId, jobId: job.id }),
    ))
    expect((items.result as { items: { id: string }[] }).items[0]!.id).toBe('item_refund_sla')
  })
})

// =====================================================================
describe('🔴 집기(claim)는 한 번뿐이다 — 예산이 두 배로 타지 않는다', () => {
  it('같은 job 을 두 번 굴려도 LLM 은 한 번만 돌고, 둘째는 `undefined` 다', async () => {
    const { owner, projectId } = await seed()
    const { job } = await uploadDoc(owner, projectId)
    stubAi(() => ({ input: { items: [], open_questions: [] } }))

    expect(await runJob(job.id)).toBe('succeeded')
    const after = calls
    expect(after).toBeGreaterThan(0)

    //  이미 끝난 job 은 `queued` 가 아니라 집히지 않는다.
    expect(await runJob(job.id)).toBeUndefined()
    expect(calls).toBe(after)
  })

  it('없는 job 을 굴려도 죽지 않는다 — `undefined` 다', async () => {
    await seed()
    expect(await runJob('11111111-1111-4111-8111-111111111111')).toBeUndefined()
  })
})

// =====================================================================
describe('🔴 실패는 코드 하나로 남는다 (P1 · SPEC §7)', () => {
  it('계약과 다른 응답이 두 번 오면 `AI_OUTPUT_INVALID` 로 끝난다 — `result` 는 비어 있다', async () => {
    const { owner, projectId } = await seed()
    const { job } = await uploadDoc(owner, projectId)
    stubAi(() => ({ input: { items: [{ id: 'nope' }], open_questions: [] } }))

    expect(await runJob(job.id)).toBe('failed')
    const row = await jobRow(job.id)
    expect(row.errorCode).toBe('AI_OUTPUT_INVALID')
    expect(row.result).toBeNull()
    expect(row.finishedAt).not.toBeNull()
  })

  it('키가 없으면 `INTERNAL` 로 끝난다 — 고장이 아니라 화면이 받을 갈래다 (SPEC §7.5)', async () => {
    const { owner, projectId } = await seed()
    const { job } = await uploadDoc(owner, projectId)
    //  스텁을 꽂지 않는다 — `client.ts` 가 「키가 없다」로 던진다.
    delete process.env.ANTHROPIC_API_KEY

    expect(await runJob(job.id)).toBe('failed')
    expect((await jobRow(job.id)).errorCode).toBe('INTERNAL')
  })

  it('🔴 남의 프로젝트 문서를 가리키는 job 은 `NOT_FOUND` 로 죽는다 (P7)', async () => {
    const { owner, projectId } = await seed()
    const mine = await uploadDoc(owner, projectId)

    //  다른 팀·다른 프로젝트를 만들고, 그 프로젝트의 job 이 **내 문서**를 가리키게 한다.
    const other = sessionJwt('other-owner')
    const otherTeam = await dataOf(await createTeam(
      req('POST', '/api/v1/teams', { auth: other, body: { name: 'Other', slug: 'other' } }),
      params({}),
    ))
    const otherProject = await dataOf(await createProject(
      req('POST', `/api/v1/teams/${otherTeam.id as string}/projects`, { auth: other, body: { name: 'Xray', slug: 'xray' } }),
      params({ id: otherTeam.id as string }),
    ))
    const stolen = await createJob(db, {
      projectId: otherProject.id as string,
      feature: 'structure',
      input: { document_version_id: mine.current_version_id },
    })

    stubAi(() => ({ input: { items: [], open_questions: [] } }))
    expect(await runJob(stolen.id)).toBe('failed')
    expect((await jobRow(stolen.id)).errorCode).toBe('NOT_FOUND')
    //  LLM 을 아예 부르지 않았다 — 남의 문서는 프롬프트에 실리지도 않는다.
    expect(calls).toBe(0)
  })
})

// =====================================================================
describe('🔴 라우트가 job 을 만들고, 화면이 그것을 polling 한다 (SPEC §5 · §9 화면 3)', () => {
  it('`POST /documents` 가 구조화 job 을 만들고 응답에 실어 준다', async () => {
    const { owner, projectId } = await seed()
    const doc = await uploadDoc(owner, projectId)
    expect(doc.job.status).toBe('queued')
    //  응답을 보낸 **뒤에** 굴린다 — 라우트는 그 id 를 `startJob()` 에 넘겼다.
    expect(startedJobIds()).toEqual([doc.job.id])

    const data = await dataOf(await readJob(
      req('GET', `/api/v1/projects/${projectId}/jobs/${doc.job.id}`, { auth: owner }),
      params({ id: projectId, jobId: doc.job.id }),
    ))
    expect(data).toMatchObject({
      id: doc.job.id, project_id: projectId, feature: 'structure', status: 'queued',
      result: null, error_code: null, started_at: null, finished_at: null,
    })
  })

  it('`batch-draft` 는 받아들인 항목이 있을 때만 탐지 job 을 만든다', async () => {
    const { owner, projectId } = await seed()
    const good = await uploadItems(owner, projectId)
    expect(good.job).not.toBeNull()
    expect(startedJobIds()).toEqual([good.job!.id])

    //  등록되지 않은 레포면 전부 거절이다 — 부를 것이 없으니 job 도 없다.
    const none = await dataOf(await batchDraft(
      req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
        auth: owner, body: batchBody([draft('item_ghost')], 'not-registered'),
      }),
      params({ id: projectId }),
    ))
    expect(none.job ?? null).toBeNull()
    expect(startedJobIds().length).toBe(1)
  })

  it('🔴 `ai_jobs` 어디에도 문서 본문이 없다 (P1 · 심사 첫 질문)', async () => {
    const { owner, projectId } = await seed()
    const doc = await uploadDoc(owner, projectId)
    stubAi(() => ({ input: { items: [], open_questions: [] } }))
    await runJob(doc.job.id)

    const rows = await db.select().from(aiJobs)
    const dumped = JSON.stringify(rows)
    //  픽스처 문서의 첫 문단이 통째로도, 한 문장도 job 행에 없다.
    for (const line of PAYLAB_GOALS.split('\n').filter((l) => l.trim().length > 20)) {
      expect(dumped.includes(line.trim()), `job 행에 문서 본문이 있다: ${line.slice(0, 20)}`).toBe(false)
    }
  })

  it('남의 프로젝트 job 은 404 다 — 없는 job 과 같은 답이다', async () => {
    const { owner, projectId } = await seed()
    const doc = await uploadDoc(owner, projectId)

    const other = sessionJwt('peeper')
    const otherTeam = await dataOf(await createTeam(
      req('POST', '/api/v1/teams', { auth: other, body: { name: 'Other', slug: 'other' } }),
      params({}),
    ))
    const otherProject = await dataOf(await createProject(
      req('POST', `/api/v1/teams/${otherTeam.id as string}/projects`, { auth: other, body: { name: 'Xray', slug: 'xray' } }),
      params({ id: otherTeam.id as string }),
    ))
    const otherId = otherProject.id as string

    const res = await readJob(
      req('GET', `/api/v1/projects/${otherId}/jobs/${doc.job.id}`, { auth: other }),
      params({ id: otherId, jobId: doc.job.id }),
    )
    expect(res.status).toBe(404)
    expect((await errorOf(res)).code).toBe('NOT_FOUND')
  })
})

// =====================================================================
describe('🔴 새로고침해도 도는 job 을 다시 찾는다 (FINDINGS 58 · SPEC §5 · §9 화면 3)', () => {
  /** 화면이 하는 그대로 — **id 를 하나도 모르는 채로** 목록 라우트만 두드린다. */
  async function list(auth: string, projectId: string, query = '') {
    const data = await dataOf(await listJobs(
      req('GET', `/api/v1/projects/${projectId}/jobs${query}`, { auth }),
      params({ id: projectId }),
    ))
    return data as { jobs: { id: string; feature: string; status: string }[]; limit: number; offset: number }
  }

  it('🔴 응답을 잃어버려도 마지막 구조화 job 을 찾아낸다 — 문서를 다시 올릴 이유가 없다', async () => {
    const { owner, projectId } = await seed()
    const doc = await uploadDoc(owner, projectId)

    //  화면 3 이 새로고침 뒤에 하는 질의가 이것 하나다.
    const found = await list(owner, projectId, '?feature=structure&limit=1')
    expect(found.jobs.length).toBe(1)
    expect(found.jobs[0]!.id).toBe(doc.job.id)
    expect(found.jobs[0]!.status).toBe('queued')
  })

  it('최신순이다 — 문서를 둘 올리면 **나중 것**이 첫 행이다', async () => {
    const { owner, projectId } = await seed()
    const first = await uploadDoc(owner, projectId, '# 목표 하나\n첫 문서다.')
    const second = await uploadDoc(owner, projectId, '# 목표 둘\n나중 문서다.')

    const found = await list(owner, projectId, '?feature=structure')
    expect(found.jobs.map((j) => j.id)).toEqual([second.job.id, first.job.id])
  })

  it('🔴 `feature` 를 뒤집으면 결과가 갈린다 — 구조화와 탐지가 같은 표에 있어도 섞이지 않는다', async () => {
    const { owner, projectId } = await seed()
    const doc = await uploadDoc(owner, projectId)
    const items = await uploadItems(owner, projectId)

    expect((await list(owner, projectId, '?feature=structure')).jobs.map((j) => j.id)).toEqual([doc.job.id])
    expect((await list(owner, projectId, '?feature=conflict')).jobs.map((j) => j.id)).toEqual([items.job!.id])
    //  거르지 않으면 둘 다 나온다 — 필터가 실제로 줄인 것이지 원래 하나였던 게 아니다.
    expect((await list(owner, projectId)).jobs.length).toBe(2)
  })

  it('🔴 `status` 를 뒤집으면 결과가 갈린다 — 끝난 것과 도는 것을 화면이 가른다', async () => {
    const { owner, projectId } = await seed()
    const done = await uploadDoc(owner, projectId, '# 끝날 문서\n하나.')
    stubAi(() => ({ input: { items: [], open_questions: [] } }))
    expect(await runJob(done.job.id)).toBe('succeeded')
    const waiting = await uploadDoc(owner, projectId, '# 기다리는 문서\n둘.')

    expect((await list(owner, projectId, '?status=queued')).jobs.map((j) => j.id)).toEqual([waiting.job.id])
    expect((await list(owner, projectId, '?status=succeeded')).jobs.map((j) => j.id)).toEqual([done.job.id])
    expect((await list(owner, projectId, '?status=running')).jobs).toEqual([])
  })

  it('`limit`·`offset` 이 실제로 자른다', async () => {
    const { owner, projectId } = await seed()
    const first = await uploadDoc(owner, projectId, '# 하나\n첫째.')
    const second = await uploadDoc(owner, projectId, '# 둘\n둘째.')

    const page = await list(owner, projectId, '?limit=1&offset=1')
    expect(page).toMatchObject({ limit: 1, offset: 1 })
    expect(page.jobs.map((j) => j.id)).toEqual([first.job.id])
    expect((await list(owner, projectId, '?limit=1')).jobs.map((j) => j.id)).toEqual([second.job.id])
  })

  it('계약 밖 질의는 400 이다 — job 이 아닌 기능도, 없는 상태도 물을 수 없다', async () => {
    const { owner, projectId } = await seed()
    for (const q of ['?feature=ask', '?status=zzz', '?limit=0', '?document_id=1']) {
      const res = await listJobs(
        req('GET', `/api/v1/projects/${projectId}/jobs${q}`, { auth: owner }),
        params({ id: projectId }),
      )
      expect(res.status, `질의 ${q}`).toBe(400)
      expect((await errorOf(res)).code).toBe('VALIDATION_FAILED')
    }
  })

  it('🔴 남의 프로젝트 목록은 404 다 — 목록은 `{jobId}` 보다 넓은 문이라 여기서 막아야 한다', async () => {
    const { owner, projectId } = await seed()
    await uploadDoc(owner, projectId)

    const other = sessionJwt('peeper')
    const res = await listJobs(
      req('GET', `/api/v1/projects/${projectId}/jobs`, { auth: other }),
      params({ id: projectId }),
    )
    expect(res.status).toBe(404)
    expect((await errorOf(res)).code).toBe('NOT_FOUND')
  })
})

// =====================================================================
describe('🔴 목록은 무거운 칸을 안 나른다 (FINDINGS 60 · SPEC §5 · §9 화면 3)', () => {
  /** §7.1 이 낸 항목 초안 하나 — **목록에 새면 여기 적은 문장이 payload 에 보인다.** */
  const DRAFT_TITLE = '환불 SLA'
  const DRAFT_BODY = '이 문장이 목록 응답에 있으면 polling 이 초안을 매번 다시 나른 것이다.'

  /** 문서 하나를 올려 구조화 job 을 **끝까지** 굴린다 — `result` 가 찬 행을 만든다. */
  async function succeededJob(owner: string, projectId: string) {
    const { job } = await uploadDoc(owner, projectId)
    stubAi(() => ({
      input: {
        items: [{
          id: 'item_refund_sla',
          type: 'policy',
          title: DRAFT_TITLE,
          body: DRAFT_BODY,
          scope: { kind: 'project' },
          data: { rule: '환불은 접수 후 24시간 안에 종결한다', severity: 'must', enforcement: 'review' },
          span: { start_char: 0, end_char: 20 },
        }],
        open_questions: [],
      },
    }))
    expect(await runJob(job.id)).toBe('succeeded')
    return job.id
  }

  async function listRaw(auth: string, projectId: string) {
    return await dataOf(await listJobs(
      req('GET', `/api/v1/projects/${projectId}/jobs`, { auth }),
      params({ id: projectId }),
    )) as { jobs: Record<string, unknown>[] }
  }

  async function detailRaw(auth: string, projectId: string, jobId: string) {
    return await dataOf(await readJob(
      req('GET', `/api/v1/projects/${projectId}/jobs/${jobId}`, { auth }),
      params({ id: projectId, jobId }),
    )) as Record<string, unknown>
  }

  it('🔴 표가 두 모양을 정한다 — 라우트가 칸을 손으로 고르는 자리가 없다', () => {
    const heavy = Object.entries(AI_JOB_FIELDS).filter(([, f]) => f.heavy).map(([k]) => k)
    //  표에 무거운 칸이 하나도 없으면 이 표는 아무것도 안 가른다 — 그러면 목록도 안 가볍다.
    expect(heavy.length).toBeGreaterThan(0)
    expect(Object.keys(AI_JOB_COLUMNS)).toEqual(Object.keys(AI_JOB_FIELDS))
    expect(Object.keys(AI_JOB_LIST_COLUMNS))
      .toEqual(Object.keys(AI_JOB_FIELDS).filter((k) => !heavy.includes(k)))
  })

  it('🔴 표의 `heavy` 를 뒤집으면 응답이 갈린다 — 목록에 없고 상세에 있다', async () => {
    const { owner, projectId } = await seed()
    const jobId = await succeededJob(owner, projectId)

    const [listed] = (await listRaw(owner, projectId)).jobs
    const detail = await detailRaw(owner, projectId, jobId)

    for (const [name, field] of Object.entries(AI_JOB_FIELDS)) {
      //  무거운 칸: 상세에만 있다. 가벼운 칸: 둘 다에 있다. **표가 응답을 정한다.**
      expect(name in listed!, `목록의 ${name}`).toBe(!field.heavy)
      expect(name in detail, `상세의 ${name}`).toBe(true)
    }
  })

  it('🔴 `shape` 로 화면이 가른다 — 「`result` 가 없다」와 「아직 안 받았다」는 다르다', async () => {
    const { owner, projectId } = await seed()
    const jobId = await succeededJob(owner, projectId)

    expect((await listRaw(owner, projectId)).jobs[0]!.shape).toBe('summary')
    expect((await detailRaw(owner, projectId, jobId)).shape).toBe('full')
    //  `shape` 는 표에 있는 두 값 중 하나다 — 화면이 셋째 값을 만날 일이 없다.
    expect(AI_JOB_SHAPES).toEqual(['summary', 'full'])
  })

  it('🔴 목록 payload 에 항목 초안이 0건이다 — 2초마다 다시 나르던 것이 그것이다', async () => {
    const { owner, projectId } = await seed()
    const jobId = await succeededJob(owner, projectId)

    const listed = JSON.stringify(await listRaw(owner, projectId))
    const detail = JSON.stringify(await detailRaw(owner, projectId, jobId))

    //  초안의 제목도 본문도 목록에는 한 글자도 없다 — 그런데 **상세에는 그대로 있다.**
    expect(listed.includes(DRAFT_TITLE)).toBe(false)
    expect(listed.includes(DRAFT_BODY)).toBe(false)
    expect(detail.includes(DRAFT_TITLE)).toBe(true)
    expect(detail.includes(DRAFT_BODY)).toBe(true)
    //  가벼워진 것을 자릿수로도 잰다 (같은 job 한 장인데 목록이 훨씬 짧다).
    expect(listed.length * 2).toBeLessThan(detail.length)
  })

  it('찾는 데 필요한 칸은 목록에 그대로 있다 — `input` 은 「내 문서의 job 인가」를 가른다', async () => {
    const { owner, projectId } = await seed()
    const doc = await uploadDoc(owner, projectId)

    const [listed] = (await listRaw(owner, projectId)).jobs
    expect(listed).toMatchObject({
      id: doc.job.id,
      feature: 'structure',
      status: 'queued',
      input: { document_version_id: doc.current_version_id },
      error_code: null,
    })
  })
})
