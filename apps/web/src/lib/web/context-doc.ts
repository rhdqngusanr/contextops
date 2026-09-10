import {
  ITEM_STATUSES, ITEM_TYPES, type ContextItemView, type ItemStatus, type ItemType, type ScopeKind,
} from '@contextops/schema'

// =====================================================================
//  화면 5 를 **문서로 읽기** — 표 30줄 대신 절(타입)별로 묶인 읽는 글 (2026-09-11 · 사용자: 「Context 화면도 문서처럼 읽기 쉽게」)
//
//  ★ 왜 — 표는 「몇 개 · 어떤 상태」를 훑기엔 좋지만 **무엇이 적혀 있나**는 못 읽는다. 심사위원은 이 화면에서
//    「이 팀의 규칙이 무엇인가」를 읽어야 하고, 그건 Pack(CLAUDE.md)이 항목을 놓는 차례 그대로 절을 세우면 된다.
//    화면 7 의 「문서로 보기」와 같은 장치다 — 블록 하나가 항목 하나이고 끝에 꼬리표 칩이 선다 (P7 은 그대로).
//  🔴 절 차례와 절 머리 밑 한 줄은 **여기 표 하나**다. 화면은 읽기만 한다. 새 ItemType 은 두 표에 한 줄씩 —
//     `Record` 라 안 더하면 타입이 막고, `test/web-context-doc.test.ts` 가 「차례가 10종 전부를 한 번씩 담는다」를 센다.
//  ⚠ 판단을 말하지 않는다 — 절 머리의 한 줄은 「이 절이 무엇인가」이지 「잘 됐다/부족하다」가 아니다.
// =====================================================================

/**
 * 읽는 차례 — 왜(사명·목표) → 무엇을(로드맵) → 어떻게(정책·제약) → 어디에(구조·업무 용어) → 왜 그렇게(기술 결정·절차) → 아직 못 정한 것(질문).
 * Pack 의 CLAUDE.md 가 절을 놓는 차례(`packages/compiler/templates` 의 slots)와 같다 — 화면 5 에서 읽은 차례로 화면 7 에도 나온다.
 */
export const CONTEXT_DOC_ORDER: readonly ItemType[] = [
  'mission', 'goal', 'roadmap', 'policy', 'constraint', 'architecture', 'domain', 'adr', 'workflow', 'open_question',
]

/** 절 머리 밑의 한 줄 — 처음 온 사람에게 이 절이 **무엇인가**. 개발자 낱말 없이. */
export const CONTEXT_SECTION_LEAD: Record<ItemType, string> = {
  mission: '이 팀이 무엇을 위해 있는지 한 문장입니다.',
  goal: '언제까지 무엇이 되어야 하는지입니다.',
  roadmap: '어떤 차례로 만들고, 무엇이 되면 끝인지입니다.',
  policy: '지켜야 하는 규칙입니다. Claude Code 가 코드를 쓸 때 따릅니다.',
  constraint: '넘으면 안 되는 선입니다. 규칙보다 셉니다.',
  architecture: '무엇이 어디에 있고 무슨 일을 맡는지입니다.',
  domain: '이 팀이 쓰는 낱말의 뜻과, 늘 참이어야 하는 것입니다.',
  adr: '왜 그렇게 하기로 했는지, 기술 결정과 그 이유입니다.',
  workflow: '무슨 일이 생기면 어떤 순서로 하는지입니다.',
  open_question: '아직 답이 없는 것입니다. 팀이 정해야 합니다.',
}

export type ContextSection = { readonly type: ItemType; readonly items: readonly ContextItemView[] }

/** 항목을 읽는 차례의 절로 묶는다. **빈 절은 만들지 않는다** — 없는 것을 있는 척하지 않는다. 절 안의 차례는 서버가 준 차례다. */
export function contextSections(items: readonly ContextItemView[]): ContextSection[] {
  const byType = new Map<ItemType, ContextItemView[]>()
  for (const item of items) {
    const bucket = byType.get(item.type)
    if (bucket === undefined) byType.set(item.type, [item])
    else bucket.push(item)
  }
  return CONTEXT_DOC_ORDER.flatMap((type) => {
    const bucket = byType.get(type)
    return bucket === undefined ? [] : [{ type, items: bucket }]
  })
}

/**
 * 절 머리 옆의 수 — 「9개」 또는 「9개 · 초안 3」. **적용 중이 아닌 상태만** 적는다 — 문서는 승인된 것이 기본이고 예외만 표시한다.
 * 낱말은 `label` 로 받는다 (`lib/web` 은 `components/` 를 못 읽는다 — 칩 표는 화면이 넘긴다).
 */
export function sectionNote(items: readonly ContextItemView[], label: (status: ItemStatus) => string): string {
  const counts = new Map<ItemStatus, number>()
  for (const item of items) counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
  const rest = ITEM_STATUSES
    .filter((s) => s !== 'active' && (counts.get(s) ?? 0) > 0)
    .map((s) => `${label(s)} ${counts.get(s) ?? 0}`)
    .join(' · ')
  return rest === '' ? `${items.length}개` : `${items.length}개 · ${rest}`
}

/** 시험이 「차례가 10종 전부를 한 번씩 담는다」를 셀 때 쓰는 정본 목록. */
export const CONTEXT_DOC_TYPES = ITEM_TYPES

/**
 * 화면 5 범위 거르개의 **값 칸 예시** — 범위 종류를 고른 뒤 값을 적는 칸의 placeholder (2026-09-11 · `project · domain:billing` 이라는
 * `?scope=` 문법을 비개발자에게 가르치고 있었다). 빈 문자열이면 **값 칸이 없다** — 「프로젝트 전체」에는 값이 없다.
 * 🔴 예시는 데모 씨앗에 실제로 있는 값이다 (`lib/demo/seed.ts` 의 `domain:refund` · `path:src/webhook`) — 쳐 보면 뭔가 걸린다.
 * ⚠ 자리는 `components/chips.tsx` 의 `SCOPE_KIND_LABEL` 옆이 맞다 — `lib/web` 은 `components/` 를 못 읽어 우선 여기 둔다.
 *    옮길 때는 이 표 한 덩이와 `context/page.tsx`·`test/design-tokens.test.ts` 의 import 한 줄씩이다.
 *    글자 수는 `--filter-input-ch`(globals.css) 안이어야 한다 — `design-tokens.test.ts` ⑧ 이 가장 긴 예시로 잰다.
 */
export const SCOPE_VALUE_EXAMPLE: Record<ScopeKind, string> = {
  project: '',
  domain: '예: refund',
  path: '예: src/webhook',
}
