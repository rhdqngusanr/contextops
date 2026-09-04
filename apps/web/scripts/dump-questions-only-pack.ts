import { eq } from 'drizzle-orm'

import { packFiles } from '../src/db/schema'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { GET as listQuestions, POST as answerQuestions } from '../src/app/api/v1/projects/[id]/questions/route'
import { PATCH as updateItem } from '../src/app/api/v1/projects/[id]/context-items/[itemId]/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { closeDb, dataOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from '../test/helpers/db'

// =====================================================================
//  🔴 **문서 없이 질문만으로 만든 Pack 을 눈으로 읽는다** (PLAN P3 둘째 행의 완료 기준)
//
//  ★ 왜 스크립트인가 — 시험은 「내 답이 Pack 에 있나」까지만 말한다. 그 Pack 을
//    **사람이 읽고 「팀 규칙으로 배포할 만한가」**를 판정하는 것은 눈이 해야 한다
//    (loop/PROMPT.md ⑦3층).
//  실행: pnpm --filter web exec tsx scripts/dump-questions-only-pack.ts
// =====================================================================

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
const { pg, db } = await freshDb()
const owner = sessionJwt('owner-sub')

//  답변 열 개 — 짧은 팀이 실제로 쓸 법한 문장으로. 지어낸 것이지만 **사람이 쓴 자리**다.
const ANSWERS = [
  'PSP 장애가 가맹점 결제로 번지지 않게 하는 결제 게이트웨이를 만듭니다.',
  '재시도 정책을 하나로 통일하고 정산 대사를 자동화합니다.',
  '고정 간격 재시도 호출이 0건이고, 일 배치 후 원장 대사 차액이 0원이면 끝난 것입니다.',
  '2026년 6월 30일까지, 백엔드 두 명으로 해야 합니다.',
  'NestJS · PostgreSQL · Redis 를 씁니다. 새 언어는 도입하지 않습니다.',
  '프론트엔드 리뉴얼과 신규 PSP 연동은 이번 분기에 손대지 않습니다.',
  '카드 원본 정보를 저장하면 안 됩니다 — 토큰만 받습니다.',
  '배포 전에 결제 회귀 테스트와 스테이징 대사 결과 확인을 지나야 합니다.',
  '에러를 삼키고 null 을 돌려주는 코드가 리뷰에서 늘 지적됩니다.',
  '새로 온 사람은 금액을 float 으로 다루다가 틀립니다 — 정수 minor unit 입니다.',
]

const team = await dataOf(await createTeam(
  req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }), params({}),
))
const project = await dataOf(await createProject(
  req('POST', `/api/v1/teams/${team.id as string}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }),
  params({ id: team.id as string }),
))
const projectId = project.id as string

const open = (await dataOf(await listQuestions(
  req('GET', `/api/v1/projects/${projectId}/questions?status=open`, { auth: owner }), params({ id: projectId }),
))).questions as { id: string; question: string }[]

const answered = await dataOf(await answerQuestions(
  req('POST', `/api/v1/projects/${projectId}/questions`, {
    auth: owner,
    body: { answers: open.map((q, i) => ({ question_id: q.id, answer: ANSWERS[i] ?? '(답 없음)' })) },
  }),
  params({ id: projectId }),
))
const created = answered.created_item_ids as string[]

const lines: string[] = [
  '문서 0건 · 질문 10장에 답해서 만든 v1.0.0 (PLAN P3 둘째 행의 완료 기준)',
  '',
  '① 답한 질문 열 장 → 만들어진 초안 항목',
]
for (let i = 0; i < open.length; i += 1) {
  lines.push(`  ${String(i + 1).padStart(2)}. ${open[i]!.question}`)
  lines.push(`      → ${ANSWERS[i]}`)
}
lines.push('', `② 만들어진 초안: ${created.length}개 — ${created.join(', ')}`)

//  화면 5 드로어의 [승인] 이 누르는 그 문이다.
for (const itemId of created) {
  await updateItem(req('PATCH', `/api/v1/projects/${projectId}/context-items/${itemId}`, {
    auth: owner, body: { revision: 1, changes: { status: 'active' } },
  }), params({ id: projectId, itemId }))
}
lines.push(`③ 전부 [승인] 을 눌렀다 (draft → active)`)

const version = await dataOf(await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
  auth: owner, body: { semver: '1.0.0', base_version_id: null, change_summary: '질문 10장으로 만든 첫 버전' },
}), params({ id: projectId })))
lines.push(`④ 발행: v${version.semver as string} · 파일 ${version.file_count as number}개 `
  + `· snapshot ${(version.snapshot_hash as string).slice(0, 12)}`, '')

const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
  lines.push(`===== ${f.path} =====`, f.content, '')
}

process.stdout.write(`${lines.join('\n')}\n`)
await closeDb(pg)
