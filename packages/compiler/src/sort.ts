import type { ContextItem, ScopeKind } from '@contextops/schema'
import { compareCodepoints } from './text'

// =====================================================================
//  정렬 — 정본은 docs/SPEC.md §4.1 3단계.
//
//  🔴 여기가 P4(「같은 snapshot → byte-identical Pack」)의 심장이다.
//    비교가 **전순서(total order)** 가 아니면 입력 순서가 결과에 새어 들어가고,
//    항목을 셔플했을 때 다른 Pack 이 나온다. 그래서 마지막 열쇠는 항목 ID(유일값)다.
// =====================================================================

/** 좁은 규칙이 뒤에 온다 — 전역 → 도메인 → 경로. */
export const SCOPE_ORDER = { project: 0, domain: 1, path: 2 } as const satisfies Record<ScopeKind, number>

export function compareItems(a: ContextItem, b: ContextItem): number {
  if (a.priority !== b.priority) return b.priority - a.priority          // 높은 우선순위 먼저
  const scope = SCOPE_ORDER[a.scope.kind] - SCOPE_ORDER[b.scope.kind]
  if (scope !== 0) return scope
  const title = compareCodepoints(a.title, b.title)                       // 로케일 독립 (§4.1)
  if (title !== 0) return title
  return compareCodepoints(a.id, b.id)                                    // 유일값 — 여기서 반드시 갈린다
}

export function sortItems(items: readonly ContextItem[]): ContextItem[] {
  return [...items].sort(compareItems)
}
