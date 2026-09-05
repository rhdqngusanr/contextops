import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

import { contextItemRevisions, contextItems, proposals, users } from '../../../../../db/schema'
import { fail } from '../../../../../lib/api/error'
import { requireProject } from '../../../../../lib/api/guard'
import { CURRENT_REVISION_JOIN, ITEM_COLUMNS, toContextItemView } from '../../../../../lib/api/item'
import {
  PROPOSAL_AUTHOR_JOIN, PROPOSAL_READ_COLUMNS, toProposalWithAuthor,
} from '../../../../../lib/api/proposal'
import { pathUuid, route } from '../../../../../lib/api/route'

// =====================================================================
//  `GET /proposals/{id}` — member (SPEC §5 · §9 화면 6 상세)
//  → 제안 한 장 + **그 제안이 건드리는 항목의 지금 모습**(`targets`)
//
//  🔴 **왜 문을 하나 더 만드나** — 목록(`GET /projects/{id}/proposals`)이 `items` 까지
//     통째로 내므로 상세를 목록으로 그릴 수는 있다. 그러나 목록은 `?limit=50` 이라
//     **51번째 제안의 상세는 영원히 못 연다.** 주소(`…/proposals/{id}`)가 가리키는 것을
//     목록의 어느 쪽에 있느냐가 정하면 그건 주소가 아니다.
//
//  🔴 **`targets` 가 diff 의 「before」다** (DESIGN_BRIEF §4 화면 6 「before/after Diff」).
//     ★ 왜 서버가 같이 내나 — before 는 `target_item_id` 가 가리키는 **지금 항목의 본문**
//       이다. 화면이 그것을 항목 목록에서 찾으면 같은 상한 문제에 다시 걸리고(50개),
//       못 찾은 것을 「빈 before」로 그리면 **update 가 add 처럼 보인다** — 없던 줄이
//       통째로 추가된 것처럼 읽힌다. 서버는 필요한 id 만 골라 읽으므로 상한이 없다.
//     ⚠ 없는 대상은 **안 싣는다** (빈 항목을 지어내지 않는다). 화면은 「대상 항목을
//       찾을 수 없습니다」라고 말한다 — 발행이 그 제안에서 막히는 것과 같은 사실이다
//       (`applyProposals` 가 `NOT_FOUND` 로 롤백한다).
//     ⚠ `add` 는 대상이 없다 — 그건 결핍이 아니라 그 연산의 모양이다.
//
//  ⚠ 검사 순서는 결정 라우트(`decide()`)와 같다: 없으면 404 → 권한.
//    먼저 권한을 보면 「없는 제안」과 「남의 제안」이 다른 코드를 내고, 그 차이로
//    남의 프로젝트에 어떤 제안이 있는지 캐낼 수 있다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route<{ id: string }>('GET /proposals/{id}', async (ctx) => {
  const actor = await ctx.actor()
  const proposalId = pathUuid(ctx.params.id, 'proposal id')

  //  ⚠ 목록과 **같은 칸**을 낸다 (`PROPOSAL_READ_COLUMNS`) — 상세만 좁으면 목록에서
  //    보이던 작성자가 열자마자 사라진다.
  const [row] = await ctx.db
    .select(PROPOSAL_READ_COLUMNS)
    .from(proposals)
    .leftJoin(users, PROPOSAL_AUTHOR_JOIN)
    .where(eq(proposals.id, proposalId))
    .limit(1)
  if (!row) fail('NOT_FOUND', '제안을 찾을 수 없다')

  ctx.note({ project_id: row.project_id })
  await requireProject(ctx.db, actor, row.project_id, 'member')

  //  이 제안이 가리키는 대상만 읽는다 — 목록을 훑지 않는다.
  const targetIds = [...new Set(row.items.flatMap((item) => (item.target_item_id ? [item.target_item_id] : [])))]
  const targets = targetIds.length === 0 ? [] : await ctx.db
    .select(ITEM_COLUMNS)
    .from(contextItems)
    .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
    .where(and(
      eq(contextItems.projectId, row.project_id),
      inArray(contextItems.publicId, targetIds),
      isNull(contextItems.deletedAt),
    ))
    //  ⚠ 순서를 고정한다 — 같은 제안을 두 번 열면 같은 순서여야 사람이 둘을 맞춘다
    //    (항목 목록 라우트가 `public_id` 순인 것과 같은 이유).
    .orderBy(asc(contextItems.publicId))

  return ctx.ok({ ...toProposalWithAuthor(row), targets: targets.map(toContextItemView) })
})
