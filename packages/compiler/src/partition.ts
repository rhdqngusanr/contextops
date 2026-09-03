import type { ContextItem, ItemStatus, ItemType } from '@contextops/schema'
import type { DocId, SectionKey } from '../templates'
import { slugify } from './text'

// =====================================================================
//  🔴 **partition 정본 표.** 「이 항목은 어느 파일의 어느 절로 가나」가 전부 여기 있다.
//     정본은 docs/SPEC.md §4.1 2단계.
//
//  ★ 새 ItemType 을 더하는 절차 (5곳 · 앞의 둘은 기계가 막아 준다):
//    ① `packages/schema` 의 `ITEM_TYPES` 끝에 값 추가
//    ② `packages/schema` 의 `ITEM_DATA` 표에 data 스키마 한 줄
//    ③ **이 표에 한 줄** ← ①만 하면 여기서 타입 검사가 막힌다
//    ④ `src/sections.ts` 의 `SECTIONS` 에 그 절의 줄 모양 (새 절이 필요할 때만)
//       + `templates/index.ts` 의 `DOCS` slots 에 그 절 한 줄
//    ⑤ `test/liveness.test.ts` 는 자동으로 10종을 돈다 — 배치가 없으면 빨개진다
//
//  ⚠ 분기(`switch (item.type)`)를 다른 파일에 만들지 마라. 타입별로 갈리는 것은
//    이 표와 `SECTIONS` 둘뿐이고, 나머지 코드는 표를 **읽기만** 한다.
// =====================================================================

/** 한 문서를 가리키는 값. `domain`·`scoped` 만 slug 가 여럿이다. */
export type DocRef = {
  doc: DocId
  slug: string
  /** 문서 제목에 쓰는 이름 (도메인 이름 · 경로 glob). */
  title: string
  /** scoped 문서 frontmatter 의 `paths:`. */
  paths: readonly string[]
}

export type Placement =
  | { kind: 'place'; ref: DocRef; section: SectionKey }
  | { kind: 'exclude'; reason: string }

/** 문서 하나를 식별하는 키. `domain-payment` 와 `scoped-payment` 는 다른 문서다. */
export function docKey(ref: DocRef): string {
  return `${ref.doc}:${ref.slug}`
}

function place(doc: DocId, section: SectionKey, opts?: { slug?: string; title?: string; paths?: readonly string[] }): Placement {
  return {
    kind: 'place',
    ref: { doc, slug: opts?.slug ?? '', title: opts?.title ?? '', paths: opts?.paths ?? [] },
    section,
  }
}

/**
 * 표의 값을 타입별로 좁혀 준다.
 * ⚠ 캐스트가 안전한 이유는 **표를 `item.type` 으로만 찾기 때문**이다 (`placeItem` 참조).
 *   표를 다른 방법으로 부르지 마라.
 */
function forType<T extends ItemType>(
  _type: T,
  fn: (item: Extract<ContextItem, { type: T }>) => Placement[],
): (item: ContextItem) => Placement[] {
  return (item) => fn(item as Extract<ContextItem, { type: T }>)
}

/**
 * scope 로 갈리는 규칙(policy·constraint)의 배치. **scope.kind 3종이 전부 다른 파일**이다.
 *   project → CLAUDE.md · domain → domain-{slug}.md · path → scoped-{slug}.md
 * ⚠ SPEC §4.1 표는 project 와 path 만 적었다. domain scope 를 CLAUDE.md 로 보내면
 *   도메인 규칙이 전역 규칙처럼 보인다 — 그래서 그 도메인 파일로 보낸다.
 */
function byScope(item: ContextItem, projectSection: SectionKey): Placement {
  const value = item.scope.value ?? ''
  if (item.scope.kind === 'project') return place('claude', projectSection)
  if (item.scope.kind === 'domain') return place('domain', 'scoped_rule', { slug: slugify(value), title: value })
  return place('scoped', 'scoped_rule', { slug: slugify(value), title: value, paths: [value] })
}

export const PARTITION = {
  mission: () => [place('claude', 'mission')],
  goal: () => [place('claude', 'goal')],
  roadmap: () => [place('claude', 'roadmap')],

  // 아키텍처는 두 곳에 간다 — CLAUDE.md 의 Quick Map(한 줄 요약)과 상세 파일.
  architecture: () => [place('claude', 'quickmap'), place('architecture', 'architecture')],

  domain: forType('domain', (item) => [
    place('domain', 'domain', { slug: slugify(item.data.name), title: item.data.name }),
  ]),

  policy: (item) => [byScope(item, 'policy')],
  constraint: (item) => [byScope(item, 'constraint')],

  // ADR 도 두 곳 — 아키텍처 파일의 한 줄 요약과 결정 기록의 전문.
  adr: () => [place('architecture', 'adr_summary'), place('decisions', 'adr_full')],

  workflow: () => [place('workflow', 'workflow')],

  // Pack 에 나가지 않는 유일한 타입. 답이 없는 질문을 규칙처럼 배포하지 않는다.
  open_question: () => [{ kind: 'exclude', reason: 'open_question 은 Pack 에 나가지 않는다 — 웹에서 답한 뒤 다른 타입으로 승격된다' }],
} as const satisfies Record<ItemType, (item: ContextItem) => Placement[]>

/**
 * 🔴 **status 4종의 정본 표.** `active` 만 Pack 에 나간다.
 * ★ 왜 표인가 — 「승인 안 된 초안이 팀 규칙으로 배포됐다」가 이 제품에서 제일 나쁜 고장이다.
 *   조건을 `if (status !== 'active')` 로 흩뿌리면 한 곳만 빠져도 샌다.
 */
export const EXCLUDE_BY_STATUS = {
  active: null,
  draft: '초안(draft)이다 — 승인 전에는 Pack 에 나가지 않는다',
  review: '검토 중(review)이다 — 승인 전에는 Pack 에 나가지 않는다',
  deprecated: '폐기(deprecated)됐다 — 이력은 웹에 남고 Pack 에서는 빠진다',
} as const satisfies Record<ItemStatus, string | null>

/** 항목 하나의 배치를 정한다. status 가 먼저다 — 폐기된 항목은 타입을 볼 것도 없다. */
export function placeItem(item: ContextItem): Placement[] {
  const byStatus = EXCLUDE_BY_STATUS[item.status]
  if (byStatus !== null) return [{ kind: 'exclude', reason: byStatus }]
  return PARTITION[item.type](item)
}
