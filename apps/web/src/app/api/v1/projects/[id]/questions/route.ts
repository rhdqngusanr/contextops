import { and, asc, eq, inArray } from 'drizzle-orm'
import { ANSWER_MAX, AnswerQuestions, CONFLICT_KIND_RULES, ConflictQuery, QUESTION_CONFLICT_KINDS } from '@contextops/schema'
//  ⚠ 정밀한 초안 타입은 따로 온다 — 유니온 스키마의 `z.infer` 는 느슨하다 (item.ts 주석).
import type { ConflictKind, ContextItemDraft as Draft } from '@contextops/schema'

import { conflicts } from '../../../../../../db/schema'
import { slotDraft } from '../../../../../../lib/api/answer'
import { CONFLICT_COLUMNS, toConflict } from '../../../../../../lib/api/conflict'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { insertDrafts } from '../../../../../../lib/api/item'
import { parseBody, parseQuery, pathUuid, route } from '../../../../../../lib/api/route'
import { seedDraft, seedQuestionOf } from '../../../../../../lib/api/seed-questions'

// =====================================================================
//  `GET·POST /projects/{id}/questions` — member (SPEC §5 · §9 화면 3·4)
//
//  ★ 질문 카드는 **충돌 행**이다 (별도 표가 아니다 · conflict.ts). 어느 종류가
//    질문인가는 여기서 세지 않고 `QUESTION_CONFLICT_KINDS` 가 정한다 — 지금은 둘이다:
//    §7.1 이 문서를 읽다 남긴 `open_question` 과, 프로젝트를 만들 때 심는
//    `seed_question` 10장 (`lib/api/seed-questions.ts` · 화면 3 ③).
//
//  🔴 **답변이 항목이 되는 길은 둘이고, 둘 다 서버가 문장을 지어내지 않는다.**
//     어느 길인가는 여기서 세지 않는다 — `CONFLICT_KIND_RULES[kind].answerSlot` 이 정한다:
//    ① `seeded` — 씨앗 질문. **표가 정한 자리**로 답변을 그대로 옮긴다 (`seedDraft`).
//    ② `ask`    — 열린 질문. 자리를 **사람이 고른다** (`save_as` → `ANSWER_SLOTS`).
//       ⚠ 서버가 대신 고르지 않는다. 자유 문장을 타입별 `data` 로 뜯는 것은 §7.1 의
//         일이고, 여기서 흉내 내면 근거를 지어내게 된다.
//       ⚠ 안 고르면(=`save_as` 없음) 답만 기록하고 질문을 닫는다 — 사람이 「기록만」을
//         고른 것이다. 예전에는 그 길**밖에** 없었고, 그래서 화면 4 의 열린 질문 카드는
//         답을 저장해도 항목이 하나도 안 생겼다 (FINDINGS 105).
//    🔴 **두 길 다 초안을 서버가 짓는다** — `answerDraft()` 하나 (`lib/api/answer.ts`).
//      근거 한 줄(`questionRef`)이 거기서 붙는다: 그 항목의 Pack 줄에서 「사람이 어느
//      질문에 답한 것인가」로 갈 길이 있어야 한다 (P7 · FINDINGS 56).
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
    const slot = CONFLICT_KIND_RULES[row.kind as ConflictKind].answerSlot
    let draft: Draft | undefined

    if (slot === 'seeded') {
      //  ⚠ 이 종류에는 `save_as` 를 받지 않는다. **조용히 무시하지 않는다** — 무시하면
      //     사람은 자기가 고른 자리로 저장된 줄 알고, 실제로는 표가 정한 자리로 간다.
      if (answer.save_as) {
        fail('VALIDATION_FAILED', '이 질문은 저장될 자리가 이미 정해져 있다', [
          { path: 'save_as', message: answer.question_id },
        ])
      }
      const seed = seedQuestionOf(row.question)
      if (!seed) continue
      draft = seedDraft(seed, answer.answer)
    } else {
      //  자리를 안 고른 답은 **기록만** 된다 (질문은 닫힌다).
      if (!answer.save_as) continue
      draft = slotDraft(answer.save_as, {
        questionId: answer.question_id, question: row.question, answer: answer.answer,
      })
    }

    //  ⚠ 초안을 못 만드는 이유는 하나다 — 답변이 목적지 칸보다 길다 (`ANSWER_MAX`).
    //     여기서 400 을 내지 않으면 사람은 「저장됐다」를 보고 자기 문장이 어디 갔는지
    //     못 찾는다 (`batch-draft` 가 항목별로 갈라 받는 것과 정반대의 이유다 —
    //     거긴 기계가 보낸다).
    if (!draft) {
      fail('VALIDATION_FAILED', `답변은 ${ANSWER_MAX}자까지입니다`, [
        { path: 'answer', message: `${row.question} — ${answer.answer.length}자` },
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
      const done = await insertDrafts(tx, {
        projectId, entries: [{ index: 0, draft }], origin: 'manual', createdBy: actor.userId,
      })
      if (done.accepted.length === 0) fail('VALIDATION_FAILED', `이미 있는 항목 id 다: ${draft.id}`)

      created.push(draft.id)
    }
  })

  return ctx.ok({ resolved: ids, created_item_ids: created })
})
