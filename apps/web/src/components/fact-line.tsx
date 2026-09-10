import {
  ITEM_STATUSES, MILESTONE_STATUSES, PROPOSAL_STATUSES, SYNC_STATUSES,
  type ItemStatus, type MilestoneStatus, type ProposalStatus, type SyncStatus,
} from '@contextops/schema'

import { ITEM_STATUS_CHIP, MILESTONE_CHIP, PROPOSAL_STATUS_CHIP, SYNC_CHIP } from './chips'

// =====================================================================
//  사실 한 줄 — 표보다 먼저 읽히는 **숫자로 말하는 문장** (2026-09-11 · 사용자: 「다른 화면들도 같은 식으로 다듬어줘」)
//
//  ★ 왜 — 표 30줄을 훑기 전에 「14대 중 9대가 최신 판」 한 줄이 있으면 심사위원은 무엇을 봐야 하는지 안다
//    (랜딩의 「쉬운 말로」·충돌 카드의 머리 문장과 같은 장치). 숫자는 굵다. 0 인 상태는 적지 않는다 — 없는 것을 세지 않는다.
//  🔴 낱말은 칩 표(`chips.tsx`)에서 온다 — 문장이 상태 이름을 지어내지 않는다. 문장은 판단이 아니라 **수**만 말한다.
//  ⚠ 네 화면의 문장이 한 파일에 있다 — 한 화면만 다른 말투가 되지 않게. 화면을 더하면 여기 빌더 하나 + `test/web-fact-line.test.ts` 한 칸.
// =====================================================================

export type FactPart = string | { readonly strong: string }

/** 시험·툴팁용 — 조각을 글자로. */
export function factText(parts: readonly FactPart[]): string {
  return parts.map((p) => (typeof p === 'string' ? p : p.strong)).join('')
}

function countBy<K extends string>(keys: readonly K[], values: readonly K[]): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
  for (const v of values) out[v] += 1
  return out
}

/** 0 이 아닌 상태만 「이름 n단위」로, 표의 차례대로. */
function listed<K extends string>(keys: readonly K[], counts: Record<K, number>, label: (k: K) => string, unit: string): string {
  return keys.filter((k) => counts[k] > 0).map((k) => `${label(k)} ${counts[k]}${unit}`).join(' · ')
}

/** Sync — 「기기 14대 중 9대가 「적용됨」입니다 — 공식 판이 그대로 들어가 있습니다. 옛 버전 2대 · 손으로 고침 1대 · …」 (「최신 판」은 표에 없는 셋째 이름이었다 · 2026-09-11) */
export function syncFact(statuses: readonly SyncStatus[]): FactPart[] {
  if (statuses.length === 0) return ['아직 등록된 기기가 없습니다.']
  const counts = countBy(SYNC_STATUSES, statuses)
  const rest = listed(SYNC_STATUSES.filter((s) => s !== 'applied'), counts, (s) => SYNC_CHIP[s].label, '대')
  return ['기기 ', { strong: `${statuses.length}대` }, ' 중 ', { strong: `${counts.applied}대` }, `가 「${SYNC_CHIP.applied.label}」입니다 — 공식 판이 그대로 들어가 있습니다.`, rest === '' ? '' : ` ${rest}.`]
}

/** Roadmap — 「마일스톤 3개 — 완료 확인 대기 1 · 진행 중 1 · 시작 전 1. 완료 조건 9개 중 3개에 근거가 붙었습니다.」 */
export function roadmapFact(statuses: readonly MilestoneStatus[], cover: { with: number; total: number }): FactPart[] {
  if (statuses.length === 0) return ['아직 마일스톤이 없습니다.']
  const counts = countBy(MILESTONE_STATUSES, statuses)
  return [
    '마일스톤 ', { strong: `${statuses.length}개` }, ' — ', listed(MILESTONE_STATUSES, counts, (s) => MILESTONE_CHIP[s].label, ''), '.',
    ' 완료 조건 ', { strong: `${cover.total}개` }, ' 중 ', { strong: `${cover.with}개` }, '에 근거가 붙었습니다.',
  ]
}

/** 제안 — 「제안 5개 — 승인 대기 1 · … . 팀장이 볼 것은 승인 대기 1개입니다.」 */
export function proposalFact(statuses: readonly ProposalStatus[]): FactPart[] {
  if (statuses.length === 0) return ['아직 제안이 없습니다.']
  const counts = countBy(PROPOSAL_STATUSES, statuses)
  const parts: FactPart[] = ['제안 ', { strong: `${statuses.length}개` }, ' — ', listed(PROPOSAL_STATUSES, counts, (s) => PROPOSAL_STATUS_CHIP[s].label, ''), '.']
  if (counts.submitted > 0) parts.push(' 팀장이 볼 것은 ', { strong: `${PROPOSAL_STATUS_CHIP.submitted.label} ${counts.submitted}개` }, '입니다.')
  return parts
}

/** Context — 「항목 30개 — 적용 중 27 · 초안 3. 발행에 들어가는 것은 「적용 중」 27개입니다.」 */
export function itemsFact(statuses: readonly ItemStatus[]): FactPart[] {
  if (statuses.length === 0) return ['아직 항목이 없습니다.']
  const counts = countBy(ITEM_STATUSES, statuses)
  return [
    '항목 ', { strong: `${statuses.length}개` }, ' — ', listed(ITEM_STATUSES, counts, (s) => ITEM_STATUS_CHIP[s].label, ''), '.',
    ` 발행에 들어가는 것은 「${ITEM_STATUS_CHIP.active.label}」 `, { strong: `${counts.active}개` }, '입니다.',
  ]
}

export function FactLine({ parts }: { parts: readonly FactPart[] }) {
  return (
    <p className="fact-line">
      {parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <b key={i}>{p.strong}</b>))}
    </p>
  )
}
