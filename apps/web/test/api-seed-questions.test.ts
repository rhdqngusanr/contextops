import type { PGlite } from '@electric-sql/pglite'
import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CONFLICT_KIND_RULES } from '@contextops/schema'

import { conflicts, contextItemRevisions, contextItems } from '../src/db/schema'
import type { Db } from '../src/db/client'
import { SEED_ANSWER_MAX, SEED_QUESTIONS, seedDraft, seedQuestionOf } from '../src/lib/api/seed-questions'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { GET as listQuestions, POST as answerQuestions } from '../src/app/api/v1/projects/[id]/questions/route'
import { GET as listItems } from '../src/app/api/v1/projects/[id]/context-items/route'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  🔴 씨앗 질문 10개 — 「문서가 없어도 시작할 수 있다」 (SPEC §9 화면 3 ③ · FINDINGS 67)
//
//  ★ 이 시험이 잡는 것 셋:
//    ① 열 개가 **행으로 생긴다** — 문서를 하나도 안 올려도
//    ② 답변이 **항목이 된다** — 그리고 답을 바꾸면 항목이 달라진다 (죽은 표가 아니다)
//    ③ 표에 줄을 잘못 더하면 빨개진다 — 목적지 칸이 답변보다 좁은 타입을 넣는 순간
//
//  ⚠ ③이 이 파일의 진짜 값이다. ①②만 재면 「오늘 열 줄이 맞다」까지만 말하고,
//    열한째 줄을 더한 사람은 배포하고 나서야 400 을 본다.
// =====================================================================

let pg: PGlite | undefined
let db: Db

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  ;({ pg, db } = await freshDb())
})
afterEach(async () => { await closeDb(pg); pg = undefined })

const owner = sessionJwt('owner-sub')

async function seedProject(): Promise<string> {
  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }),
    params({}),
  ))
  const teamId = team.id as string
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }),
    params({ id: teamId }),
  ))
  return project.id as string
}

async function openQuestions(projectId: string): Promise<{ id: string; question: string }[]> {
  const data = await dataOf(await listQuestions(
    req('GET', `/api/v1/projects/${projectId}/questions?status=open`, { auth: owner }),
    params({ id: projectId }),
  ))
  return data.questions as { id: string; question: string }[]
}

// ---------------------------------------------------------------------
//  표 자체 — DB 없이 잴 수 있는 것
// ---------------------------------------------------------------------

describe('씨앗 질문 표', () => {
  it('DESIGN_BRIEF 가 약속한 대로 열 개다', () => {
    //  화면 3 의 문장이 「10개 질문에 답하면」이다. 아홉이면 그 문장이 거짓이 된다.
    expect(SEED_QUESTIONS).toHaveLength(10)
  })

  it('`id` 도 `question` 도 유일하다 — 문장이 행과 표를 잇는 열쇠다', () => {
    expect(new Set(SEED_QUESTIONS.map((q) => q.id)).size).toBe(SEED_QUESTIONS.length)
    expect(new Set(SEED_QUESTIONS.map((q) => q.question)).size).toBe(SEED_QUESTIONS.length)
    for (const q of SEED_QUESTIONS) expect(seedQuestionOf(q.question)).toBe(q)
    expect(seedQuestionOf('우리가 물어본 적 없는 질문인가요?')).toBeUndefined()
  })

  it('🔴 `SEED_ANSWER_MAX` 길이의 답변이 **모든 줄에서** 통과한다', () => {
    //  ★ 이 시험이 상수를 정직하게 잠근다 — 목적지 칸이 500자보다 좁은 타입을
    //    표에 더하면 여기서 빨개진다 (`WorkflowData.steps` 는 300자다).
    const answer = '가'.repeat(SEED_ANSWER_MAX)
    for (const q of SEED_QUESTIONS) {
      expect(seedDraft(q, answer), `${q.id} 가 ${SEED_ANSWER_MAX}자를 못 담는다`).toBeDefined()
    }
  })

  it('한 글자만 더 길면 초안이 안 만들어진다 — 라우트가 그것으로 400 을 낸다', () => {
    const tooLong = '가'.repeat(SEED_ANSWER_MAX + 1)
    for (const q of SEED_QUESTIONS) expect(seedDraft(q, tooLong)).toBeUndefined()
  })

  it('근거는 `manual` 하나이고 그 note 가 **질문 문장**이다 (P7)', () => {
    //  씨앗 질문은 가리킬 원문이 없다. 없는 문서를 가리키는 근거를 지어내는 대신
    //  「이 질문에 사람이 답했다」를 남긴다 — 답변 원문은 `resolution.note` 다.
    for (const q of SEED_QUESTIONS) {
      const d = seedDraft(q, '이 팀은 결제를 만든다.')!
      expect(d.source_refs).toEqual([{ kind: 'manual', note: q.question }])
      expect(d.id).toBe(`item_seed_${q.id}`)
      expect(d.type).toBe(q.type)
    }
  })
})

// ---------------------------------------------------------------------
//  라우트 — 문서 없이 질문만으로
// ---------------------------------------------------------------------

describe('🔴 문서를 하나도 안 올려도 질문이 있다', () => {
  it('프로젝트를 만들면 열 장이 열려 있다 — 문서는 0건이다', async () => {
    const projectId = await seedProject()
    const rows = await openQuestions(projectId)
    expect(rows.map((r) => r.question)).toEqual(SEED_QUESTIONS.map((q) => q.question))
  })

  it('씨앗 질문 행은 **네 칸이 다 빈다** — anchor 가 none 이다 (지어낸 근거가 없다)', async () => {
    const projectId = await seedProject()
    expect(CONFLICT_KIND_RULES.seed_question.anchor).toBe('none')
    const rows = await db.select().from(conflicts)
      .where(and(eq(conflicts.projectId, projectId), eq(conflicts.kind, 'seed_question')))
    expect(rows).toHaveLength(SEED_QUESTIONS.length)
    for (const row of rows) {
      expect(row.aItemId).toBeNull()
      expect(row.bItemId).toBeNull()
      expect(row.aRef).toBeNull()
      expect(row.bRef).toBeNull()
      expect(row.severity).toBeNull()
    }
  })

  it('🔴 답하면 항목이 생기고, 답을 바꾸면 **항목이 달라진다**', async () => {
    const projectId = await seedProject()
    const rows = await openQuestions(projectId)
    const mission = rows.find((r) => r.question === SEED_QUESTIONS[0]!.question)!

    const res = await answerQuestions(req('POST', `/api/v1/projects/${projectId}/questions`, {
      auth: owner,
      body: { answers: [{ question_id: mission.id, answer: '결제를 안전하고 예측 가능하게 만든다.' }] },
    }), params({ id: projectId }))
    expect(res.status).toBe(200)
    expect((await dataOf(res)).created_item_ids).toEqual(['item_seed_mission'])

    const data = await dataOf(await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: owner }),
      params({ id: projectId }),
    ))
    const items = data.items as { id: string; type: string; title: string; data: Record<string, unknown> }[]
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'item_seed_mission',
      type: 'mission',
      title: SEED_QUESTIONS[0]!.title,
      data: { statement: '결제를 안전하고 예측 가능하게 만든다.' },
    })

    //  🔴 값을 바꾸면 결과가 달라진다 — 표가 답변을 **읽고** 있다는 증거다.
    const other = seedDraft(SEED_QUESTIONS[0]!, '전혀 다른 답')!
    expect(other.data).not.toEqual(items[0]!.data)
  })

  it('답한 질문은 목록에서 빠진다 — 「3 / 10」이 셀 수 있다', async () => {
    const projectId = await seedProject()
    const rows = await openQuestions(projectId)
    await answerQuestions(req('POST', `/api/v1/projects/${projectId}/questions`, {
      auth: owner,
      body: { answers: rows.slice(0, 3).map((r) => ({ question_id: r.id, answer: '그렇다.' })) },
    }), params({ id: projectId }))

    expect(await openQuestions(projectId)).toHaveLength(SEED_QUESTIONS.length - 3)
  })

  it('답변이 너무 길면 400 이고 **아무 질문도 닫히지 않는다**', async () => {
    const projectId = await seedProject()
    const rows = await openQuestions(projectId)
    const res = await answerQuestions(req('POST', `/api/v1/projects/${projectId}/questions`, {
      auth: owner,
      body: {
        answers: [
          { question_id: rows[0]!.id, answer: '짧은 답' },
          { question_id: rows[1]!.id, answer: '가'.repeat(SEED_ANSWER_MAX + 1) },
        ],
      },
    }), params({ id: projectId }))

    expect(res.status).toBe(400)
    expect((await errorOf(res)).code).toBe('VALIDATION_FAILED')
    //  둘 중 하나만 반영되면 사람은 「저장됐다」를 보고 어느 답이 빠졌는지 모른다.
    expect(await openQuestions(projectId)).toHaveLength(SEED_QUESTIONS.length)
    expect(await db.select().from(contextItems)).toHaveLength(0)
    expect(await db.select().from(contextItemRevisions)).toHaveLength(0)
  })

  it('만들어진 항목은 draft 이고 origin 이 manual 이다 — 승인 없이 공식이 되지 않는다', async () => {
    const projectId = await seedProject()
    const rows = await openQuestions(projectId)
    await answerQuestions(req('POST', `/api/v1/projects/${projectId}/questions`, {
      auth: owner,
      body: { answers: [{ question_id: rows[0]!.id, answer: '결제를 만든다.' }] },
    }), params({ id: projectId }))

    const [item] = await db.select().from(contextItems)
    expect(item!.status).toBe('draft')
    const [rev] = await db.select().from(contextItemRevisions)
    expect(rev!.origin).toBe('manual')
    expect(rev!.confidence).toBe('high')
  })
})
