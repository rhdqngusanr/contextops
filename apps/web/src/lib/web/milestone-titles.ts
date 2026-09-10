'use client'

import type { ContextItemView } from '@contextops/schema'

import { fetchItems } from './queries'
import { useAsync } from './use-async'

// =====================================================================
//  마일스톤 id → 제목 (2026-09-11 · 「PL-M3」는 우리가 붙인 내부 이름이라 심사위원은 어느 마일스톤인지 모른다)
//
//  ★ 왜 여기 하나인가 — 로드맵 응답과 제안의 `relates_to` 는 둘 다 **id 만** 나른다 (정본은 Manifest).
//    제목은 그 id 를 가진 roadmap 항목에 있다. 화면 6(제안 목록·상세)이 같은 찾기를 읽고,
//    화면 8(`roadmap/page.tsx`)의 인라인 찾기도 여기로 합친다 — 두 곳이 따로 접으면 한쪽만 고쳐진다.
//  🔴 못 읽으면 **빈 표**다 — 화면은 id 만 세운다. 제목을 지어내지 않는다.
// =====================================================================

/** roadmap 항목 목록을 `{ 'PL-M1': '재시도·타임아웃 정리', … }` 로 접는다. 다른 종류의 항목은 무시한다. */
export function milestoneTitlesOf(items: readonly ContextItemView[]): Record<string, string> {
  const titles: Record<string, string> = {}
  for (const it of items) {
    if (it.type === 'roadmap') titles[it.data.milestone_id] = it.title
  }
  return titles
}

/** 프로젝트의 roadmap 항목을 읽어 제목 표를 돌려준다. 읽는 중·실패면 빈 표. */
export function useMilestoneTitles(projectId: string): Record<string, string> {
  const items = useAsync(() => fetchItems(projectId, { type: 'roadmap' }), [projectId])
  return items.result.state === 'ready' ? milestoneTitlesOf(items.result.data.items) : {}
}
