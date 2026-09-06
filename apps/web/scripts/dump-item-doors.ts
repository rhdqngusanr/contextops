import { eq } from 'drizzle-orm'

import { packFiles } from '../src/db/schema'
import { setAiClientForTest } from '../src/lib/ai/client'
import { stubTransport } from '../test/helpers/ai'
import { runJob } from '../src/lib/ai/job'
import { questionItemId } from '../src/lib/api/answer'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { POST as acceptJobItems } from '../src/app/api/v1/projects/[id]/jobs/[jobId]/items/route'
import { GET as listQuestions, POST as answerQuestions } from '../src/app/api/v1/projects/[id]/questions/route'
import { PATCH as updateItem } from '../src/app/api/v1/projects/[id]/context-items/[itemId]/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { closeDb, dataOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from '../test/helpers/db'

// =====================================================================
//  🔴 **화면이 항목을 만드는 문 셋을 다 지나서 나온 Pack 을 눈으로 읽는다**
//     (FINDINGS 35 — 「화면에서 항목을 새로 만들 수 없다」를 닫으려고 재는 자리)
//
//  ★ 왜 스크립트인가 — `test/web-item-doors.test.ts` 는 「세 줄이 있나 · 역추적되나」
//    까지만 말한다. 그 Pack 을 **사람이 읽고 「팀 규칙으로 배포할 만한가」**를 판정하는
//    것은 눈이 해야 한다 (loop/PROMPT.md ⑦3층).
//  ⚠ 짝은 `dump-questions-only-pack.ts`(문 A 하나로 v1.0) 다 — 이쪽은 **셋을 섞는다.**
//  ⚠ §7.1 은 스텁이다 (키가 없다). 문 C 가 받는 후보와 문 B 가 답하는 질문은
//    「모델이 이렇게 냈다고 치는」 값이다.
//  실행: pnpm --filter web exec tsx scripts/dump-item-doors.ts
// =====================================================================

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
const { pg, db } = await freshDb()
const owner = sessionJwt('doors-owner')

const DOC = [
  '# 결제 정책',
  '',
  '환불은 접수 후 24시간 안에 종결한다. 승인 취소도 같은 시한을 따른다.',
  '재시도 상한은 문서마다 다르게 적혀 있어 확인이 필요하다.',
].join('\n')

const CANDIDATE = {
  id: 'item_doc_refund',
  type: 'policy',
  title: '환불 SLA',
  body: '환불은 접수 후 24시간 안에 종결한다.',
  scope: { kind: 'project' },
  data: { rule: '환불은 접수 후 24시간 안에 종결한다.', severity: 'must', enforcement: 'review' },
  span: { quote: '환불은 접수 후 24시간 안에 종결한다.' },
}
const OPEN_QUESTION = '재시도 상한이 5회인가 3회인가?'
const OPEN_ANSWER = '재시도는 3회까지만 한다 — 그 뒤는 수동 처리다.'
const SEED_ANSWER = 'PSP 장애가 가맹점 결제로 번지지 않게 하는 결제 게이트웨이를 만듭니다.'

setAiClientForTest(stubTransport(() => ({
  input: {
    items: [CANDIDATE],
    open_questions: [{ question: OPEN_QUESTION, span: { quote: '재시도 상한은 문서마다 다르게 적혀 있어 확인이 필요하다.' } }],
  },
})))

const lines: string[] = ['화면만으로 만든 v1.0.0 — 항목 셋이 서로 **다른 문**으로 들어왔다 (FINDINGS 35)', '']

const team = await dataOf(await createTeam(
  req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }), params({}),
))
const project = await dataOf(await createProject(
  req('POST', `/api/v1/teams/${team.id as string}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }),
  params({ id: team.id as string }),
))
const projectId = project.id as string

//  ── 문 C 의 앞부분 — 화면 3 의 「문서 붙여넣기」
const doc = await dataOf(await createDocument(
  req('POST', `/api/v1/projects/${projectId}/documents`, {
    auth: owner, body: { title: '결제 정책', kind: 'policy', content: DOC },
  }),
  params({ id: projectId }),
))
const jobId = (doc.job as { id: string }).id
lines.push(`① 문서 1건을 올렸다 — §7.1 job ${jobId.slice(0, 8)} → ${await runJob(jobId)}`)

//  ── 문 C — 고른 후보만 항목이 된다
const accepted = await dataOf(await acceptJobItems(
  req('POST', `/api/v1/projects/${projectId}/jobs/${jobId}/items`, {
    auth: owner, body: { item_ids: [CANDIDATE.id] },
  }),
  params({ id: projectId, jobId }),
))
lines.push(`② 문 C — 구조화 후보를 받아들였다: ${JSON.stringify(accepted.accepted)}`)

const open = (await dataOf(await listQuestions(
  req('GET', `/api/v1/projects/${projectId}/questions?status=open`, { auth: owner }),
  params({ id: projectId }),
))).questions as { id: string; question: string; kind: string }[]
const asked = open.find((q) => q.question === OPEN_QUESTION)!
const seeded = open.find((q) => q.question !== OPEN_QUESTION)!
lines.push(
  `③ 질문 스택에는 ${open.length}장이 섞여 있다 — 씨앗 ${open.length - 1}장 + §7.1 이 남긴 열린 질문 1장`,
  `     씨앗: ${seeded.question} (${seeded.kind})`,
  `     열린: ${asked.question} (${asked.kind})`,
)

//  ── 문 A(자리를 안 고른다) · 문 B(자리를 고른다) — 화면 3 스택이 마지막에 보내는 모양
const answered = await dataOf(await answerQuestions(
  req('POST', `/api/v1/projects/${projectId}/questions`, {
    auth: owner,
    body: {
      answers: [
        { question_id: seeded.id, answer: SEED_ANSWER },
        { question_id: asked.id, answer: OPEN_ANSWER, save_as: 'constraint' },
      ],
    },
  }),
  params({ id: projectId }),
))
const made = answered.created_item_ids as string[]
const answerItemId = questionItemId(asked.id)
lines.push(
  `④ 문 A — 씨앗 질문에 답했다 → ${made.find((id) => id !== answerItemId)}`,
  `⑤ 문 B — 열린 질문에 **자리를 골라**(constraint) 답했다 → ${answerItemId}`,
  '',
)

//  ── 화면 5 드로어의 [승인]
for (const itemId of [CANDIDATE.id, ...made]) {
  await updateItem(req('PATCH', `/api/v1/projects/${projectId}/context-items/${itemId}`, {
    auth: owner, body: { revision: 1, changes: { status: 'active' } },
  }), params({ id: projectId, itemId }))
}
lines.push(`⑥ 셋 다 [승인] 을 눌렀다 (draft → active)`)

const version = await dataOf(await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
  auth: owner, body: { semver: '1.0.0', base_version_id: null, change_summary: '화면에서 만든 항목만으로' },
}), params({ id: projectId })))
lines.push(`⑦ 발행: v${version.semver as string} · 파일 ${version.file_count as number}개`, '')

const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
  lines.push(`===== ${f.path} =====`, f.content, '')
}

process.stdout.write(`${lines.join('\n')}\n`)
setAiClientForTest(undefined)
await closeDb(pg)
