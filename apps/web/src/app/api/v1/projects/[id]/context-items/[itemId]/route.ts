import { and, eq, isNull } from 'drizzle-orm'
import { ContextItemUpdate, ContextItemView, ItemId } from '@contextops/schema'

import { contextItemRevisions, contextItems } from '../../../../../../../db/schema'
import { fail } from '../../../../../../../lib/api/error'
import { requireProject } from '../../../../../../../lib/api/guard'
import {
  CURRENT_REVISION_JOIN, ITEM_COLUMNS, parseItemData, toContextItemView, ITEM_OWNER_JOIN, itemOwners
} from '../../../../../../../lib/api/item'
import { parseBody, pathUuid, route } from '../../../../../../../lib/api/route'

// =====================================================================
//  `PATCH /projects/{id}/context-items/{itemId}` 부분 갱신 — owner (SPEC §5)
//
//  🔴 **항목을 지목하는 이름은 `public_id`(`item_<slug>`)다 — uuid 가 아니다.**
//     ★ 왜 옮겼나 — 예전 문은 `/context-items/{uuid}` 였고, **화면은 uuid 를 모른다.**
//       항목을 내는 문(`GET /projects/{id}/context-items`)이 돌려주는 `id` 가
//       `public_id` 이기 때문이다 (`lib/api/item.ts` 머리 주석 · P7 의 역추적이 그
//       이름으로 이어진다). 그래서 화면에는 **초안을 승인할 문이 아예 없었다** —
//       씨앗 질문에 답해 만든 항목은 `draft` 로 남고 `active` 만 Pack 에 나가서
//       (`EXCLUDE_BY_STATUS`), 「질문만으로 v1.0 발행」이 불가능했다 (FINDINGS 79).
//     ⚠ `public_id` 는 **프로젝트 안에서만** 유일하다 (`unique(project_id, public_id)`).
//       그래서 이 문은 프로젝트 밑에 있어야 한다 — 전역 경로로는 지목이 안 된다.
//
//  ★ 왜 개정을 **새로 쌓나** — 옛 개정을 덮으면 이미 발행된 버전의 snapshot 이
//    가리키는 내용이 뒤에서 바뀐다. 그러면 「같은 버전·같은 해시」가 거짓이 된다 (P4).
//
//  ★ 낙관적 잠금 — 요청은 자기가 본 `revision` 을 같이 낸다. 그 사이에 남이 고쳤으면
//    409 `REVISION_CONFLICT` 다. 마지막에 쓴 사람이 이기게 두면 두 사람이 같은 항목을
//    고칠 때 한쪽의 변경이 **아무 표시 없이** 사라진다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const PATCH = route<{ id: string; itemId: string }>(
  'PATCH /projects/{id}/context-items/{itemId}',
  async (ctx) => {
    const actor = await ctx.actor()
    const projectId = pathUuid(ctx.params.id, 'project id')
    ctx.note({ project_id: projectId })

    //  ⚠ 질의 **전에** 모양을 본다 — `pathUuid` 와 같은 이유다 (형식 오류는 400 이지 500 이 아니다).
    const publicId = ItemId.safeParse(ctx.params.itemId)
    if (!publicId.success) fail('VALIDATION_FAILED', '항목 id 가 `item_<slug>` 모양이 아니다')

    await requireProject(ctx.db, actor, projectId, 'owner')

    const [current] = await ctx.db
      .select(ITEM_COLUMNS)
      .from(contextItems)
      .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
      //  담당자 이름 (FINDINGS 168). **left** 다 — 담당자 없는 항목이 정상이다.
      .leftJoin(itemOwners, ITEM_OWNER_JOIN)
      .where(and(
        eq(contextItems.projectId, projectId),
        eq(contextItems.publicId, publicId.data),
        isNull(contextItems.deletedAt),
      ))
      .limit(1)
    if (!current) fail('NOT_FOUND', '항목을 찾을 수 없다')

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
        itemId: current.uuid,
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
        .where(eq(contextItems.id, current.uuid))
    })

    const [updated] = await ctx.db
      .select(ITEM_COLUMNS)
      .from(contextItems)
      .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
      //  담당자 이름 (FINDINGS 168). **left** 다 — 담당자 없는 항목이 정상이다.
      .leftJoin(itemOwners, ITEM_OWNER_JOIN)
      .where(eq(contextItems.id, current.uuid))
      .limit(1)
    if (!updated) fail('INTERNAL', '갱신한 항목을 다시 읽지 못했다')

    //  응답이 계약을 지키는지 **서버가 먼저 확인한다.** 여기서 빨개지면 표와 응답이
    //  갈린 것이고, 그건 화면이 아니라 여기서 잡아야 한다.
    return ctx.ok(ContextItemView.parse(toContextItemView(updated)))
  },
)
