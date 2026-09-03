import { and, asc, eq, inArray } from 'drizzle-orm'
import { AnswerQuestions, ConflictQuery } from '@contextops/schema'
//  ⚠ 정밀한 초안 타입은 따로 온다 — 유니온 스키마의 `z.infer` 는 느슨하다 (item.ts 주석).
import type { ContextItemDraft as Draft } from '@contextops/schema'

import { conflicts, contextItemRevisions, contextItems } from '../../../../../../db/schema'
import { CONFLICT_COLUMNS, toConflict } from '../../../../../../lib/api/conflict'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseBody, parseQuery, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `GET·POST /projects/{id}/questions` — member (SPEC §5 · §9 화면 4)
//
//  ★ 질문 카드는 `kind = 'open_question'` 인 충돌이다 (별도 표가 아니다 · conflict.ts).
//
//  ⚠ POST 의 `draft` 는 optional 이다. SPEC 은 「답변 → 항목 생성」이라고만 적는데,
//    자유 문장을 타입별 `data` 로 **구조화하는 것은 §7.1 의 일**이고 그건 PLAN P3 다.
//    초안이 오면 항목을 만들고, 안 오면 답변만 남기고 질문을 닫는다 —
//    **서버가 문장을 지어내지 않는다.**
// =====================================================================

export const dynamic = 'force-dynamic'

/** GET 은 충돌 목록과 같은 질의를 쓰되 `kind` 를 강제한다. */
export const GET = route<{ id: string }>('GET /projects/{id}/questions', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const query = parseQuery(ctx.req, ConflictQuery)

  const where = [eq(conflicts.projectId, projectId), eq(conflicts.kind, 'open_question')]
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
    .select({ id: conflicts.id })
    .from(conflicts)
    .where(and(
      eq(conflicts.projectId, projectId),
      eq(conflicts.kind, 'open_question'),
      eq(conflicts.status, 'open'),
      inArray(conflicts.id, ids),
    ))
  const answerable = new Set(open.map((r) => r.id))
  //  하나라도 이 프로젝트의 열린 질문이 아니면 **전부 거부한다.** 일부만 반영하면
  //  화면은 「저장됐다」를 보고 사람은 어느 답이 빠졌는지 모른다.
  const unknown = ids.filter((id) => !answerable.has(id))
  if (unknown.length > 0) {
    fail('NOT_FOUND', '열려 있는 질문이 아니다', unknown.map((id) => ({ path: 'question_id', message: id })))
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

      const draft = answer.draft as Draft | undefined
      if (!draft) continue

      const [item] = await tx
        .insert(contextItems)
        .values({
          projectId,
          publicId: draft.id,
          type: draft.type,
          status: 'draft',
          currentRevision: 1,
          scope: draft.scope,
          priority: draft.priority,
          ownerId: draft.owner_id ?? null,
        })
        .onConflictDoNothing({ target: [contextItems.projectId, contextItems.publicId] })
        .returning({ id: contextItems.id })
      if (!item) fail('VALIDATION_FAILED', `이미 있는 항목 id 다: ${draft.id}`)

      await tx.insert(contextItemRevisions).values({
        itemId: item.id,
        revision: 1,
        title: draft.title,
        body: draft.body,
        tags: draft.tags,
        validFrom: draft.valid_from ?? null,
        validUntil: draft.valid_until ?? null,
        data: draft.data,
        sourceRefs: draft.source_refs,
        confidence: draft.confidence,
        createdBy: actor.userId,
        //  사람이 질문에 답해서 만든 항목이다 (SPEC §2 `origin`).
        origin: 'manual',
      })
      created.push(draft.id)
    }
  })

  return ctx.ok({ resolved: ids, created_item_ids: created })
})
