import { and, eq, isNull } from 'drizzle-orm'
import { ContextItem, ContextItemUpdate } from '@contextops/schema'

import { contextItemRevisions, contextItems } from '../../../../../db/schema'
import { fail } from '../../../../../lib/api/error'
import { requireProject } from '../../../../../lib/api/guard'
import { CURRENT_REVISION_JOIN, ITEM_COLUMNS, parseItemData, toContextItem } from '../../../../../lib/api/item'
import { parseBody, pathUuid, route } from '../../../../../lib/api/route'

// =====================================================================
//  `/context-items/{id}` 부분 갱신 — owner (SPEC §5) · `revision` 불일치는 409
//
//  ★ 왜 개정을 **새로 쌓나** — 옛 개정을 덮으면 이미 발행된 버전의 snapshot 이
//    가리키는 내용이 뒤에서 바뀐다. 그러면 「같은 버전·같은 해시」가 거짓이 된다 (P4).
//
//  ★ 낙관적 잠금 — 요청은 자기가 본 `revision` 을 같이 낸다. 그 사이에 남이 고쳤으면
//    409 `REVISION_CONFLICT` 다. 마지막에 쓴 사람이 이기게 두면 두 사람이 같은 항목을
//    고칠 때 한쪽의 변경이 **아무 표시 없이** 사라진다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const PATCH = route<{ id: string }>('PATCH /context-items/{id}', async (ctx) => {
  const actor = await ctx.actor()
  const itemUuid = pathUuid(ctx.params.id, 'item id')

  const [current] = await ctx.db
    .select(ITEM_COLUMNS)
    .from(contextItems)
    .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
    .where(and(eq(contextItems.id, itemUuid), isNull(contextItems.deletedAt)))
    .limit(1)
  if (!current) fail('NOT_FOUND', '항목을 찾을 수 없다')
  ctx.note({ project_id: current.project_id })

  await requireProject(ctx.db, actor, current.project_id, 'owner')
  const body = await parseBody(ctx.req, ContextItemUpdate)
  if (body.revision !== current.revision) {
    fail('REVISION_CONFLICT', undefined, { current_revision: current.revision })
  }

  const c = body.changes
  //  타입별 `data` 는 그 타입의 표(`.strict()`)로 다시 판다 — 계약 밖의 키는 여기서 막힌다.
  const nextData = c.data === undefined ? current.data : parseItemData(current.type, c.data)
  const nextRevision = current.revision + 1

  await ctx.db.transaction(async (tx) => {
    await tx.insert(contextItemRevisions).values({
      itemId: itemUuid,
      revision: nextRevision,
      title: c.title ?? current.title,
      body: c.body ?? current.body,
      tags: c.tags ?? current.tags,
      validFrom: c.valid_from === undefined ? current.valid_from : c.valid_from,
      validUntil: c.valid_until === undefined ? current.valid_until : c.valid_until,
      data: nextData,
      sourceRefs: c.source_refs ?? current.source_refs,
      confidence: c.confidence ?? current.confidence,
      createdBy: actor.userId,
      //  사람이 화면에서 고친 것이다 (SPEC §2 `origin`).
      origin: 'manual',
    })

    await tx
      .update(contextItems)
      .set({
        currentRevision: nextRevision,
        status: c.status ?? current.status,
        scope: c.scope ?? current.scope,
        priority: c.priority ?? current.priority,
        ownerId: c.owner_id === undefined ? current.owner_id : c.owner_id,
        updatedAt: ctx.now,
      })
      .where(eq(contextItems.id, itemUuid))
  })

  const [updated] = await ctx.db
    .select(ITEM_COLUMNS)
    .from(contextItems)
    .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
    .where(eq(contextItems.id, itemUuid))
    .limit(1)
  if (!updated) fail('INTERNAL', '갱신한 항목을 다시 읽지 못했다')

  //  응답이 계약을 지키는지 **서버가 먼저 확인한다.** 여기서 빨개지면 표와 응답이
  //  갈린 것이고, 그건 화면이 아니라 여기서 잡아야 한다.
  return ctx.ok(ContextItem.parse(toContextItem(updated)))
})
