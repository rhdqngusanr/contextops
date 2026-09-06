import { and, asc, eq, inArray } from 'drizzle-orm'
import { AnswerQuestions, ConflictQuery, QUESTION_CONFLICT_KINDS } from '@contextops/schema'
//  ⚠ 정밀한 초안 타입은 따로 온다 — 유니온 스키마의 `z.infer` 는 느슨하다 (item.ts 주석).
import type { ConflictKind, ContextItemDraft as Draft } from '@contextops/schema'

import { conflicts } from '../../../../../../db/schema'
import { draftForAnswer } from '../../../../../../lib/api/answer-slot'
import { CONFLICT_COLUMNS, toConflict } from '../../../../../../lib/api/conflict'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { insertDrafts } from '../../../../../../lib/api/item'
import { parseBody, parseQuery, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET·POST /projects/{id}/questions` — member (SPEC §5 · §9 화면 3·4)
//
//  ★ 질문 카드는 **충돌 행**이다 (별도 표가 아니다 · conflict.ts). 어느 종류가
//    질문인가는 여기서 세지 않고 `QUESTION_CONFLICT_KINDS` 가 정한다 — 지금은 둘이다:
//    §7.1 이 문서를 읽다 남긴 `open_question` 과, 프로젝트를 만들 때 심는
//    `seed_question` 10장 (`lib/api/seed-questions.ts` · 화면 3 ③).
//
//  🔴 **답변이 어느 길로 가는가는 여기서 세지 않는다** — `CONFLICT_KIND_RULES[kind].answerSlot`
//     의 값마다 한 줄인 표 `ANSWER_SLOT_DRAFTERS` 가 정한다 (`lib/api/answer-slot.ts` · FINDINGS 108).
//    ① `seeded` — 씨앗 질문. **표가 정한 자리**로 답변을 그대로 옮긴다 (`seedDraft`).
//    ② `ask`    — 열린 질문. 자리를 **사람이 고른다** (`save_as` → `ANSWER_SLOTS`).
//       ⚠ 안 고르면(=`save_as` 없음) 답만 기록하고 질문을 닫는다 — 사람이 「기록만」을
//         고른 것이다. 예전에는 그 길**밖에** 없었고, 그래서 화면 4 의 열린 질문 카드는
//         답을 저장해도 항목이 하나도 안 생겼다 (FINDINGS 105).
//    ③ `none`   — 자리가 없는 종류. 답은 기록되지만 항목이 되지 않는다. 자리를 고르면 400.
//       ⚠ 지금 이 종류의 질문은 없다 (`QUESTION_CONFLICT_KINDS` 둘은 `seeded`·`ask`) —
//         예전엔 이 갈래가 ② 와 같아서, 셋째 질문 종류가 생기는 날 조용히 항목을 지었다.
//    🔴 **어느 길도 서버가 문장을 지어내지 않는다** — 초안은 `answerDraft()` 하나가 짓는다
//      (`lib/api/answer.ts`). 근거 한 줄(`questionRef`)이 거기서 붙는다: 그 항목의 Pack 줄에서
//      「사람이 어느 질문에 답한 것인가」로 갈 길이 있어야 한다 (P7 · FINDINGS 56).
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
    .select({ id: conflicts.id, kind: conflicts.kind, question: conflicts.question })
    .from(conflicts)
    .where(and(
      eq(conflicts.projectId, projectId),
      inArray(conflicts.kind, QUESTION_CONFLICT_KINDS),
      eq(conflicts.status, 'open'),
      inArray(conflicts.id, ids),
    ))
  const answerable = new Map(open.map((r) => [r.id, r] as const))
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
    const row = answerable.get(answer.question_id)
    if (!row) continue
    //  🔴 갈래는 여기 없다 — `answerSlot` 값마다 한 줄인 표가 정한다 (`answer-slot.ts`).
    //     `undefined` 는 「항목을 만들지 않는다」이고, 거절(자리를 잘못 골랐다 · 답이 길다)은
    //     그 표가 400 으로 던진다.
    const draft = draftForAnswer({
      questionId: answer.question_id, kind: row.kind as ConflictKind,
      question: row.question, answer: answer.answer, saveAs: answer.save_as,
    })
    if (!draft) continue
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
      const done = await insertDrafts(tx, {
        projectId, entries: [{ index: 0, draft }], origin: 'manual', createdBy: actor.userId,
      })
      if (done.accepted.length === 0) fail('VALIDATION_FAILED', `이미 있는 항목 id 다: ${draft.id}`)

      created.push(draft.id)
    }
  })

  return ctx.ok({ resolved: ids, created_item_ids: created })
})
