import type { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseTraceTag } from '@contextops/compiler'

import { packFiles } from '../src/db/schema'
import type { Db } from '../src/db/client'
import { setAiClientForTest } from '../src/lib/ai/client'
import { stubTransport } from './helpers/ai'
import { runJob } from '../src/lib/ai/job'
import { questionItemId } from '../src/lib/api/answer'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { POST as acceptJobItems } from '../src/app/api/v1/projects/[id]/jobs/[jobId]/items/route'
import { GET as listQuestions, POST as answerQuestions } from '../src/app/api/v1/projects/[id]/questions/route'
import { GET as listItems } from '../src/app/api/v1/projects/[id]/context-items/route'
import { PATCH as updateItem } from '../src/app/api/v1/projects/[id]/context-items/[itemId]/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { closeDb, dataOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  🔴 **화면이 항목을 새로 만드는 문 — 셋이고, 셋 다 Pack 까지 간다** (FINDINGS 35 · P7)
//
//  35 는 「화면에서 항목을 새로 만들 수 없다」였다. 그때 항목이 들어오는 길은
//  플러그인의 `batch-draft` 와 승인된 제안뿐이었고, 웹만 쓰는 팀장은 아무것도 만들 수
//  없었다. 그 뒤로 화면 3·4 가 문을 셋 열었다:
//
//    A. **씨앗 질문에 답한다** — 문서가 0건이어도 열려 있다 (FINDINGS 67 ③)
//    B. **열린 질문에 자리를 골라 답한다** (`save_as`) — §7.1 이 남긴 질문 (FINDINGS 105·106)
//    C. **구조화 후보를 받아들인다** (`POST /jobs/{jobId}/items`) — 문서를 올린 길 (FINDINGS 84)
//
//  ★ 왜 이 시험이 문마다 있는 시험들과 별도로 필요한가 — 그것들은 **행이 생기는 데까지**
//    잰다. 사람이 원하는 것은 행이 아니라 **배포된 Pack 의 한 줄**이고, 그 사이에는
//    승인·컴파일·역추적이 있다. 문 하나가 Pack 앞에서 끊겨도 문 쪽 시험은 초록이다.
//
//  ⚠ 기대는 표에서 파생시키지 않고 **손으로 적는다** (FINDINGS 103) — 표를 읽어 만들면
//    붙이는 코드와 기대가 같이 뒤집혀 아무것도 안 잰다.
//  ⚠ **키가 없어서 진짜 Claude 를 부른 것이 아니다.** §7.1 은 스텁으로 잰다
//    (`ai-job.test.ts` 와 같은 모양).
// =====================================================================

let pg: PGlite | undefined
let db: Db

const owner = sessionJwt('doors-owner')

/** 문 C 가 받아들일 후보 하나 — §7.1 이 냈다고 치는 것. */
const CANDIDATE = {
  id: 'item_doc_refund',
  type: 'policy',
  title: '환불 SLA',
  body: '환불은 접수 후 24시간 안에 종결한다.',
  scope: { kind: 'project' },
  data: { rule: '환불은 접수 후 24시간 안에 종결한다.', severity: 'must', enforcement: 'review' },
  span: { quote: '환불은 접수 후 24시간 안에 종결한다.' },
}
/** 문 B 가 답할 열린 질문 — §7.1 이 「판단이 필요하다」고 남긴 것. */
const OPEN_QUESTION = '재시도 상한이 5회인가 3회인가?'
const OPEN_ANSWER = '재시도는 3회까지만 한다.'
/** 문 A 가 답할 씨앗 질문의 답. */
const SEED_ANSWER = 'PSP 장애가 결제로 번지지 않게 하는 게이트웨이를 만듭니다.'

const DOC = [
  '# 결제 정책',
  '환불은 접수 후 24시간 안에 종결한다.',
  '재시도 상한은 문서마다 다르게 적혀 있다.',
].join('\n')

function stubStructure(): void {
  setAiClientForTest(stubTransport(() => ({
    input: {
      items: [CANDIDATE],
      open_questions: [{ question: OPEN_QUESTION, span: { quote: '재시도 상한은 문서마다 다르게 적혀 있다.' } }],
    },
  })))
}

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  ;({ pg, db } = await freshDb())
  stubStructure()
})
afterEach(async () => {
  setAiClientForTest(undefined)
  await closeDb(pg)
  pg = undefined
})

// ---------------------------------------------------------------------
//  문 셋을 순서대로 지난다 — 전부 **라우트를 부른다** (화면이 부르는 그 문들이다)
// ---------------------------------------------------------------------

interface Doors {
  projectId: string
  /** 문 A 가 만든 항목 id (씨앗 질문). */
  seedItemId: string
  /** 문 B 가 만든 항목 id (열린 질문 + `save_as`). */
  answerItemId: string
  /** 문 A 가 답한 씨앗 질문의 문장 — 그 항목의 근거가 된다 (P7). */
  seedQuestion: string
}

async function walkDoors(): Promise<Doors> {
  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }), params({}),
  ))
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${team.id as string}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }),
    params({ id: team.id as string }),
  ))
  const projectId = project.id as string

  //  ── 문 C 의 앞부분: 문서를 올리면 §7.1 job 이 선다. 그 job 이 후보와 열린 질문을 낸다.
  const doc = await dataOf(await createDocument(
    req('POST', `/api/v1/projects/${projectId}/documents`, {
      auth: owner, body: { title: '결제 정책', kind: 'policy', content: DOC },
    }),
    params({ id: projectId }),
  ))
  const jobId = (doc.job as { id: string }).id
  expect(await runJob(jobId)).toBe('succeeded')

  //  ── 문 C: 사람이 고른 후보만 항목이 된다.
  const accepted = await dataOf(await acceptJobItems(
    req('POST', `/api/v1/projects/${projectId}/jobs/${jobId}/items`, {
      auth: owner, body: { item_ids: [CANDIDATE.id] },
    }),
    params({ id: projectId, jobId }),
  ))
  expect(accepted.accepted).toEqual([{ index: 0, id: CANDIDATE.id }])

  //  ── 질문 목록에는 이제 **씨앗 10장 + 열린 질문 1장**이 섞여 있다 (FINDINGS 106 의 그 스택).
  const open = (await dataOf(await listQuestions(
    req('GET', `/api/v1/projects/${projectId}/questions?status=open`, { auth: owner }),
    params({ id: projectId }),
  ))).questions as { id: string; question: string; kind: string }[]
  const asked = open.find((q) => q.question === OPEN_QUESTION)
  expect(asked, '§7.1 이 남긴 열린 질문이 스택에 없다').toBeDefined()
  const seeded = open.find((q) => q.question !== OPEN_QUESTION)!

  //  ── 문 A(씨앗 · 자리를 안 고른다)와 문 B(열린 질문 · 자리를 고른다)를 한 번에 보낸다.
  //     화면 3 의 스택이 마지막에 보내는 것이 이 모양이다.
  const answered = await dataOf(await answerQuestions(
    req('POST', `/api/v1/projects/${projectId}/questions`, {
      auth: owner,
      body: {
        answers: [
          { question_id: seeded.id, answer: SEED_ANSWER },
          { question_id: asked!.id, answer: OPEN_ANSWER, save_as: 'constraint' },
        ],
      },
    }),
    params({ id: projectId }),
  ))
  const made = answered.created_item_ids as string[]
  expect(made).toHaveLength(2)

  return {
    projectId,
    seedItemId: made.find((id) => id !== questionItemId(asked!.id))!,
    answerItemId: questionItemId(asked!.id),
    seedQuestion: seeded.question,
  }
}

/** 화면 5 드로어의 [승인] 이 누르는 그 문이다. */
async function approve(projectId: string, itemId: string): Promise<void> {
  const res = await updateItem(req('PATCH', `/api/v1/projects/${projectId}/context-items/${itemId}`, {
    auth: owner, body: { revision: 1, changes: { status: 'active' } },
  }), params({ id: projectId, itemId }))
  expect(res.status, itemId).toBe(200)
}

async function publishFirst(projectId: string) {
  return publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
    auth: owner,
    body: { semver: '1.0.0', base_version_id: null, change_summary: '화면에서 만든 항목만으로' },
  }), params({ id: projectId }))
}

async function packOf(versionId: string): Promise<string> {
  const files = await db.select().from(packFiles).where(eq(packFiles.versionId, versionId))
  return files.map((f) => f.content).join('\n')
}

// =====================================================================
describe('🔴 화면이 항목을 만드는 문 셋 (FINDINGS 35)', () => {
  it('문 셋이 **각각** 항목을 낳는다 — 플러그인도 제안도 안 거쳤다', async () => {
    const doors = await walkDoors()
    const rows = await dataOf(await listItems(
      req('GET', `/api/v1/projects/${doors.projectId}/context-items`, { auth: owner }),
      params({ id: doors.projectId }),
    ))
    const ids = rows.items as { id: string; type: string }[]

    //  ⚠ 셋뿐이다 — 씨앗 질문 아홉 장은 아직 답이 없으니 항목이 아니다.
    expect(ids.map((i) => i.id).sort()).toEqual([CANDIDATE.id, doors.answerItemId, doors.seedItemId].sort())
    //  문 B 가 고른 자리가 **타입을 정한다** (`save_as: 'constraint'`).
    expect(ids.find((i) => i.id === doors.answerItemId)!.type).toBe('constraint')
    //  문 C 는 후보의 타입을 그대로 쓴다 — 화면이 고쳐 보내지 않는다.
    expect(ids.find((i) => i.id === CANDIDATE.id)!.type).toBe('policy')
  })

  it('🔴 셋을 승인하고 발행하면 **세 줄이 다 Pack 에 있다**', async () => {
    const doors = await walkDoors()
    for (const id of [CANDIDATE.id, doors.answerItemId, doors.seedItemId]) await approve(doors.projectId, id)

    const res = await publishFirst(doors.projectId)
    expect(res.status).toBe(201)
    const pack = await packOf((await dataOf(res)).id as string)

    //  🔴 웹 화면 말고 아무것도 안 썼는데 팀 규칙 세 줄이 배포됐다.
    expect(pack, '문 C 의 줄이 없다').toContain(CANDIDATE.body)
    expect(pack, '문 B 의 줄이 없다').toContain(OPEN_ANSWER)
    expect(pack, '문 A 의 줄이 없다').toContain(SEED_ANSWER)
  })

  it('🔴 세 줄이 **자기 문으로** 역추적된다 (P7) — 근거 없는 줄이 없다', async () => {
    const doors = await walkDoors()
    for (const id of [CANDIDATE.id, doors.answerItemId, doors.seedItemId]) await approve(doors.projectId, id)
    const res = await publishFirst(doors.projectId)
    const pack = await packOf((await dataOf(res)).id as string)

    const tags = new Map(pack.split('\n')
      .map((line) => parseTraceTag(line))
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .map((t) => [t.itemId, t]))

    //  문 C — 근거는 **원문 구간**이다. 문서를 올린 사람은 그 문장이 어디서 왔는지 안다.
    const fromDoc = tags.get(CANDIDATE.id)
    expect(fromDoc, `${CANDIDATE.id} 의 태그가 없다`).toBeDefined()
    expect(fromDoc!.src.some((s) => s.startsWith('doc:'))).toBe(true)

    //  문 B — 근거는 **자기가 나온 질문**이다. 원문 구간을 물려받지 않는다:
    //  사람이 머리로 쓴 문장에 문서 구간을 달면 원문에 없는 말이 원문을 근거로 나간다.
    expect(tags.get(doors.answerItemId)!.src).toEqual([`manual:${OPEN_QUESTION}`])
    //  문 A — 근거는 씨앗 질문 문장이다.
    expect(tags.get(doors.seedItemId)!.src).toEqual([`manual:${doors.seedQuestion}`])
  })

  it('승인하지 않은 문의 줄은 **안 나간다** — 문이 승인을 건너뛰지 않는다', async () => {
    const doors = await walkDoors()
    //  문 A 만 승인한다.
    await approve(doors.projectId, doors.seedItemId)

    const res = await publishFirst(doors.projectId)
    expect(res.status).toBe(201)
    const pack = await packOf((await dataOf(res)).id as string)

    expect(pack).toContain(SEED_ANSWER)
    expect(pack, '문 C 가 승인 없이 나갔다').not.toContain(CANDIDATE.body)
    expect(pack, '문 B 가 승인 없이 나갔다').not.toContain(OPEN_ANSWER)
  })
})
