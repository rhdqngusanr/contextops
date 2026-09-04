import { and, eq } from 'drizzle-orm'
import {
  ITEM_DATA, SOURCE_REFS_MAX,
  type ContextItem, type ItemType, type Scope, type SourceRef,
} from '@contextops/schema'

import { contextItemRevisions, contextItems } from '../../db/schema'

// =====================================================================
//  DB 두 행(항목 + 현재 개정) → 계약의 `ContextItem` 하나 (SPEC §2 · §3)
//
//  ★ 왜 한 자리에 모으나 — 항목을 돌려주는 라우트가 넷 이상이다. 각자 조립하면
//    어떤 응답에는 `tags` 가 빠지고, 화면은 그걸 런타임에야 안다.
//    **조립하는 함수가 하나면 빠질 자리가 없다.**
//
//  ⚠ 응답의 `id` 는 uuid 가 아니라 `public_id`(`item_<slug>`)다 — 계약과 Pack 이
//    쓰는 이름이 그것이고, P7 의 역추적이 그 이름으로 이어진다.
// =====================================================================

/** 항목 + 그 항목의 **현재** 개정만 고른다. 옛 개정이 섞이지 않게 조건이 둘이다. */
export const CURRENT_REVISION_JOIN = and(
  eq(contextItemRevisions.itemId, contextItems.id),
  eq(contextItemRevisions.revision, contextItems.currentRevision),
)

/** `select({...})` 에 그대로 펴 넣는다 — 컬럼 목록이 라우트마다 갈리지 않게. */
export const ITEM_COLUMNS = {
  uuid: contextItems.id,
  id: contextItems.publicId,
  project_id: contextItems.projectId,
  type: contextItems.type,
  status: contextItems.status,
  scope: contextItems.scope,
  priority: contextItems.priority,
  owner_id: contextItems.ownerId,
  revision: contextItems.currentRevision,
  title: contextItemRevisions.title,
  body: contextItemRevisions.body,
  tags: contextItemRevisions.tags,
  valid_from: contextItemRevisions.validFrom,
  valid_until: contextItemRevisions.validUntil,
  confidence: contextItemRevisions.confidence,
  source_refs: contextItemRevisions.sourceRefs,
  data: contextItemRevisions.data,
} as const

type ItemJoinRow = {
  uuid: string
  id: string
  project_id: string
  type: ItemType
  status: ContextItem['status']
  scope: Scope
  priority: number
  owner_id: string | null
  revision: number
  title: string
  body: string
  tags: string[]
  valid_from: string | null
  valid_until: string | null
  confidence: ContextItem['confidence']
  source_refs: SourceRef[]
  data: unknown
}

/**
 * ⚠ `null` 인 optional 은 **키째로 뺀다.** 계약(SPEC §3)의 그 필드들은 `optional` 이지
 *   `nullable` 이 아니라서, `owner_id: null` 을 그대로 실으면 응답이 자기 계약을
 *   통과하지 못한다 (`test/api-*.test.ts` 가 `ContextItem.parse` 로 잰다).
 */
export function toContextItem(row: ItemJoinRow): ContextItem {
  const item: Record<string, unknown> = {
    id: row.id,
    project_id: row.project_id,
    type: row.type,
    title: row.title,
    body: row.body,
    status: row.status,
    scope: row.scope,
    priority: row.priority,
    source_refs: row.source_refs,
    tags: row.tags,
    confidence: row.confidence,
    revision: row.revision,
    data: row.data,
  }
  if (row.owner_id !== null) item.owner_id = row.owner_id
  if (row.valid_from !== null) item.valid_from = row.valid_from
  if (row.valid_until !== null) item.valid_until = row.valid_until
  return item as ContextItem
}

/** 타입별 `data` 를 그 타입의 표로 다시 판다 (전부 `.strict()` — P1 allowlist). */
export function parseItemData(type: ItemType, data: unknown): unknown {
  return ITEM_DATA[type].parse(data)
}

/**
 * 🔴 **개정에 근거를 한 칸 더 붙인다. 자리가 없으면 `undefined` — 몰래 버리지 않는다.**
 *
 * ★ 왜 한 자리에 모으나 — 서버가 근거를 **더 붙이는** 자리가 둘이다: 발행이
 *   `{kind:'proposal'}` 을 붙이고 (`lib/api/publish.ts` · FINDINGS 68), 충돌 정리가
 *   `{kind:'manual'}` 을 붙인다 (`conflicts/{id}/resolve` · FINDINGS 71). 각자
 *   `refs.length >= SOURCE_REFS_MAX` 를 적으면 한쪽만 고쳐지고, 안 고쳐진 쪽은
 *   **조용히 근거를 하나 버린다** — 그 항목의 역추적이 한 칸 짧아지는 것을 아무도
 *   못 본다. 그게 P7 이 제일 싫어하는 모양이다.
 * ★ 새 붙이는 자리가 생기면 여기를 부르고, 자리가 없을 때 무엇을 답할지만 정해라
 *   (발행은 그 항목을 실패로 돌리고, 충돌 정리는 400 이다). **버리는 갈래는 없다.**
 *
 * @param same 이미 같은 근거가 있는가를 재는 함수. 있으면 그대로 돌려준다 —
 *             같은 근거가 둘이면 Pack 줄의 태그만 길어지고 뜻은 안 는다.
 */
export function appendSourceRef(
  refs: SourceRef[],
  ref: SourceRef,
  same: (r: SourceRef) => boolean,
): SourceRef[] | undefined {
  if (refs.some(same)) return refs
  if (refs.length >= SOURCE_REFS_MAX) return undefined
  return [...refs, ref]
}
