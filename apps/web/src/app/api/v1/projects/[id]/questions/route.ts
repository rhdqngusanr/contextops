import { and, asc, eq, inArray } from 'drizzle-orm'
import { AnswerQuestions, ConflictQuery, QUESTION_CONFLICT_KINDS } from '@contextops/schema'
//  ⚠ 정밀한 초안 타입은 따로 온다 — 유니온 스키마의 `z.infer` 는 느슨하다 (item.ts 주석).
import type { ContextItemDraft as Draft } from '@contextops/schema'

import { conflicts } from '../../../../../../db/schema'
import { CONFLICT_COLUMNS, toConflict } from '../../../../../../lib/api/conflict'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { insertDrafts } from '../../../../../../lib/api/item'
import { parseBody, parseQuery, pathUuid, route } from '../../../../../../lib/api/route'
import { SEED_ANSWER_MAX, seedDraft, seedQuestionOf } from '../../../../../../lib/api/seed-questions'

// =====================================================================
//  `GET·POST /projects/{id}/questions` — member (SPEC §5 · §9 화면 3·4)
//
//  ★ 질문 카드는 **충돌 행**이다 (별도 표가 아니다 · conflict.ts). 어느 종류가
//    질문인가는 여기서 세지 않고 `QUESTION_CONFLICT_KINDS` 가 정한다 — 지금은 둘이다:
//    §7.1 이 문서를 읽다 남긴 `open_question` 과, 프로젝트를 만들 때 심는
//    `seed_question` 10장 (`lib/api/seed-questions.ts` · 화면 3 ③).
//
//  🔴 **답변이 항목이 되는 길은 둘이고, 둘 다 서버가 문장을 지어내지 않는다.**
//    ① `draft` 가 오면 그것을 만든다 (부르는 쪽이 구조를 안다).
//    ② 씨앗 질문이면 **표가 정한 자리**로 답변을 그대로 옮긴다 (`seedDraft` · LLM 없음).
//    ⚠ `open_question` 에는 ②가 없다 — 그 답변을 타입별 `data` 로 뜯는 것은 §7.1 의
//      일이고, 여기서 흉내 내면 근거를 지어내게 된다 (FINDINGS 56 이 그 자리의 주인이다).
// =====================================================================

export const dynamic = 'force-dynamic'

/** GET 은 충돌 목록과 같은 질의를 쓰되 `kind` 를 강제한다. */
export const GET = route<{ id: string }>('GET /projects/{id}/questions', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const query = parseQuery(ctx.req, ConflictQuery)

  const where = [eq(conflicts.projectId, projectId), inArray(conflicts.kind, QUESTION_CONFLICT_KINDS)]
  if (query.status) where.push(eq(conflicts.status, query.status))

  const rows = await ctx.db
    .select(CONFLICT_COLUMNS)
    .from(conflicts)
    .where(and(...where))
    .orderBy(asc(conflicts.createdAt))
    .limit(query.limit)
    .offset(query.offset)

  return ctx.ok({ questions: rows.map(toConflict), limit: query.limit, offset: query.offset })
})

export const POST = route<{ id: string }>('POST /projects/{id}/questions', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const body = await parseBody(ctx.req, AnswerQuestions)

  const ids = body.answers.map((a) => a.question_id)
  const open = await ctx.db
    .select({ id: conflicts.id, question: conflicts.question })
    .from(conflicts)
    .where(and(
      eq(conflicts.projectId, projectId),
      inArray(conflicts.kind, QUESTION_CONFLICT_KINDS),
      eq(conflicts.status, 'open'),
      inArray(conflicts.id, ids),
    ))
  const answerable = new Map(open.map((r) => [r.id, r.question]))
  //  하나라도 이 프로젝트의 열린 질문이 아니면 **전부 거부한다.** 일부만 반영하면
  //  화면은 「저장됐다」를 보고 사람은 어느 답이 빠졌는지 모른다.
  const unknown = ids.filter((id) => !answerable.has(id))
  if (unknown.length > 0) {
    fail('NOT_FOUND', '열려 있는 질문이 아니다', unknown.map((id) => ({ path: 'question_id', message: id })))
  }

  //  🔴 **초안을 트랜잭션 밖에서 먼저 만든다.** 안에서 만들다 답변 하나가 목적지 칸보다
  //     길어 400 이 되면, 그때까지 닫힌 질문들이 롤백되면서 사람은 「저장을 눌렀는데
  //     아무 일도 안 일어났다」만 본다. 어느 답이 문제인지를 **먼저** 말한다.
  const drafts = new Map<string, Draft>()
  for (const answer of body.answers) {
    if (answer.draft) {
      drafts.set(answer.question_id, answer.draft as Draft)
      continue
    }
    const seed = seedQuestionOf(answerable.get(answer.question_id) ?? '')
    if (!seed) continue
    const draft = seedDraft(seed, answer.answer)
    if (!draft) {
      fail('VALIDATION_FAILED', `답변은 ${SEED_ANSWER_MAX}자까지입니다`, [
        { path: 'answer', message: `${seed.question} — ${answer.answer.length}자` },
      ])
    }
    drafts.set(answer.question_id, draft)
  }

  const created: string[] = []
  await ctx.db.transaction(async (tx) => {
    for (const answer of body.answers) {
      await tx
        .update(conflicts)
        .set({
          status: 'resolved',
          //  답변 문장이 곧 결정의 근거다. `choice: 'a'` 는 「질문 쪽을 받아들였다」는 뜻이다.
          resolution: { choice: 'a', note: answer.answer },
          resolvedBy: actor.userId,
          resolvedAt: ctx.now,
          updatedAt: ctx.now,
        })
        .where(eq(conflicts.id, answer.question_id))

      const draft = drafts.get(answer.question_id)
      if (!draft) continue

      //  🔴 넣는 코드는 여기 없다 — `insertDrafts()` 하나다 (`lib/api/item.ts`).
      //     이 문이 정하는 것은 `origin` 뿐이다: 사람이 질문에 답해서 만든 항목이다 (SPEC §2).
      //  ⚠ 여기서는 **거절을 400 으로 올린다.** 답변 하나가 조용히 항목이 안 되면
      //     사람은 「저장됐다」를 보고 자기 문장이 어디 갔는지 못 찾는다 —
      //     `batch-draft` 가 항목별로 갈라 받는 것과 정반대의 이유다 (거긴 기계가 보낸다).
      const done = await insertDrafts(tx, {
        projectId, entries: [{ index: 0, draft }], origin: 'manual', createdBy: actor.userId,
      })
      if (done.accepted.length === 0) fail('VALIDATION_FAILED', `이미 있는 항목 id 다: ${draft.id}`)

      created.push(draft.id)
    }
  })

  return ctx.ok({ resolved: ids, created_item_ids: created })
})
