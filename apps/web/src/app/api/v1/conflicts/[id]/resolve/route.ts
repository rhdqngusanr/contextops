import { and, eq, isNull } from 'drizzle-orm'
import { itemOutcomeOf, ResolveConflict, SOURCE_REFS_MAX } from '@contextops/schema'
import type { ItemStatus } from '@contextops/schema'

import type { Db } from '../../../../../../db/client'
import { conflicts, contextItemRevisions, contextItems } from '../../../../../../db/schema'
import { CONFLICT_COLUMNS, RESOLUTION_OUTCOME, resolutionNote, toConflict } from '../../../../../../lib/api/conflict'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { appendSourceRef, CURRENT_REVISION_JOIN, ITEM_COLUMNS, ITEM_OWNER_JOIN, itemOwners } from '../../../../../../lib/api/item'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /conflicts/{id}:resolve` — owner (SPEC §5 「→ 항목 상태 갱신」)
//
//  ⚠ 경로가 `/conflicts/{id}/resolve` 다 — 콜론은 Windows 파일 이름에 못 쓴다
//    (batch-draft 와 같은 이유 · FINDINGS).
//
//  🔴 **결정은 충돌 행과 항목을 같이 바꾼다** (FINDINGS 71). 예전에는 `conflicts` 행만
//    바꿔서, 사람이 「A가 맞음」을 눌러도 Context 화면에서 **아무 변화도 못 봤다.**
//    ⚠ 트랜잭션 하나여야 한다 — 충돌만 닫히면 아래 「이미 처리된 충돌」 검사 때문에
//      **다시 누를 문이 없다.**
//    ⚠ 무엇이 지고 그것이 어디로 가는지는 여기서 정하지 않는다. 표 둘이 정한다
//      (`RESOLUTION_ITEM_OUTCOME` · `CONFLICT_KIND_RULES`) — 그 둘을 잇는 문이
//      `itemOutcomeOf()` 다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /conflicts/{id}/resolve', async (ctx) => {
  const actor = await ctx.actor()
  const conflictId = pathUuid(ctx.params.id, 'conflict id')

  const [row] = await ctx.db
    .select({
      id: conflicts.id,
      projectId: conflicts.projectId,
      status: conflicts.status,
      //  🔴 어느 항목이 걸려 있는지를 같이 읽는다 — 이게 없으면 결정이 갈 데가 없다.
      kind: conflicts.kind,
      aItemId: conflicts.aItemId,
      bItemId: conflicts.bItemId,
    })
    .from(conflicts)
    .where(eq(conflicts.id, conflictId))
    .limit(1)
  if (!row) fail('NOT_FOUND', '충돌을 찾을 수 없다')
  ctx.note({ project_id: row.projectId })

  await requireProject(ctx.db, actor, row.projectId, 'owner')
  //  이미 처리된 충돌을 다시 뒤집지 않는다 — 뒤집으려면 새 충돌이 떠야 한다.
  if (row.status !== 'open') fail('VALIDATION_FAILED', '이미 처리된 충돌이다')

  const body = await parseBody(ctx.req, ResolveConflict)
  const outcome = itemOutcomeOf({
    kind: row.kind, aItemId: row.aItemId, bItemId: row.bItemId, choice: body.choice,
  })

  const updated = await ctx.db.transaction(async (tx) => {
    if (outcome) {
      await retireItem(tx, {
        projectId: row.projectId,
        publicId: outcome.publicId,
        status: outcome.status,
        note: resolutionNote(conflictId, body.choice),
        actorId: actor.userId,
        now: ctx.now,
      })
    }

    const [next] = await tx
      .update(conflicts)
      .set({
        status: RESOLUTION_OUTCOME[body.choice],
        resolution: body.note === undefined ? { choice: body.choice } : { choice: body.choice, note: body.note },
        resolvedBy: actor.userId,
        resolvedAt: ctx.now,
        updatedAt: ctx.now,
      })
      .where(eq(conflicts.id, conflictId))
      .returning(CONFLICT_COLUMNS)
    if (!next) fail('INTERNAL', '충돌을 갱신하지 못했다')
    return next
  })

  return ctx.ok(toConflict(updated))
})

/**
 * 🔴 **결정에서 진 항목을 다음 상태로 옮긴다 — 개정을 하나 쌓으면서.**
 *
 * ★ 왜 상태만 덮지 않나 — 상태를 덮으면 「누가 언제 왜 폐기했나」가 **어디에도 안 남는다.**
 *   개정에는 `created_by` 와 `{kind:'manual', note}` 근거가 붙어서, 그 항목의 마지막
 *   Pack 줄에서 충돌 행까지 되짚어 갈 수 있다 (P7 · `/context-items/{id}` PATCH 와 같은 모양).
 *
 * ⚠ **이미 그 상태면 아무것도 안 한다.** 바뀌는 것이 없는 개정을 쌓으면 `revision` 만
 *   올라서, 남이 들고 있던 낙관적 잠금이 이유 없이 409 가 된다.
 * ⚠ **지워진 항목(soft delete)은 건너뛴다.** 이미 Pack 밖이라 결정의 뜻은 이뤄져 있고,
 *   여기서 400 을 내면 그 충돌은 영원히 못 닫힌다.
 * ⚠ 근거 자리가 없으면 **400 이다.** 몰래 하나를 버리면 그 항목의 역추적이 조용히
 *   한 칸 짧아진다 (`appendSourceRef` 주석 · 발행이 내리는 판단과 같다).
 */
async function retireItem(tx: Db, args: {
  projectId: string
  publicId: string
  status: ItemStatus
  note: string
  actorId: string
  now: Date
}): Promise<void> {
  const [current] = await tx
    .select(ITEM_COLUMNS)
    .from(contextItems)
    .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
    //  담당자 이름 (FINDINGS 168). **left** 다 — 담당자 없는 항목이 정상이고, inner 면 목록에서 사라진다.
    .leftJoin(itemOwners, ITEM_OWNER_JOIN)
    .where(and(
      eq(contextItems.projectId, args.projectId),
      eq(contextItems.publicId, args.publicId),
      isNull(contextItems.deletedAt),
    ))
    .limit(1)
  if (!current) return
  if (current.status === args.status) return

  const sourceRefs = appendSourceRef(
    current.source_refs,
    { kind: 'manual', note: args.note },
    (r) => r.kind === 'manual' && r.note === args.note,
  )
  if (!sourceRefs) {
    fail('VALIDATION_FAILED', `근거가 ${SOURCE_REFS_MAX}개라 왜 폐기했는지를 붙일 자리가 없다`, [
      { path: 'item_id', message: args.publicId },
    ])
  }

  const revision = current.revision + 1
  await tx.insert(contextItemRevisions).values({
    itemId: current.uuid,
    revision,
    //  본문은 그대로 옮긴다 — 바뀌는 것은 **상태와 근거**뿐이다. 여기서 제목이나 본문을
    //  손대면 「폐기했다」가 아니라 「고쳤다」가 되고, 옛 Pack 과 대조가 안 된다.
    title: current.title,
    body: current.body,
    tags: current.tags,
    validFrom: current.valid_from,
    validUntil: current.valid_until,
    data: current.data,
    sourceRefs,
    confidence: current.confidence,
    createdBy: args.actorId,
    //  사람이 화면에서 고른 결정이다 (SPEC §2 `origin`).
    origin: 'manual',
  })

  await tx
    .update(contextItems)
    .set({ currentRevision: revision, status: args.status, updatedAt: args.now })
    .where(eq(contextItems.id, current.uuid))
}
