import { decisionRoute } from '../../../../../../lib/api/proposal'

// =====================================================================
//  `POST /proposals/{id}/reject` — SPEC §5
//  ⚠ 로직을 여기 적지 마라. 누가 · 어떤 상태에서 · 무엇으로 바꾸는지는
//    `lib/api/proposal.ts` 의 `PROPOSAL_DECISIONS` 표 하나가 정한다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = decisionRoute('reject')
