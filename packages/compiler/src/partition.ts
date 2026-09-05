import { ITEM_STATUS_EXCLUDE_REASON, type ContextItem, type ItemType, type ScopeKind } from '@contextops/schema'
import { DOCS, type DocId, type PlaceableDocId, type SectionKey } from '../templates'
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

//  ⚠ `PlaceableDocId` — 거울 문서(`agents`·`cursor`)에는 항목을 놓을 수 없다. 거울은 `collect` 가
//    이 표의 결과를 읽어 만든다 (`templates/index.ts` 의 `compose`). 여기서 막지 않으면 같은 항목이
//    두 번 놓여 AGENTS.md 에 두 번 나온다.
function place(doc: PlaceableDocId, section: SectionKey, opts?: { slug?: string; title?: string; paths?: readonly string[] }): Placement {
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
 * 🔴 **scope 3종 → 그 규칙이 사는 문서의 정본 표.**
 *   project → CLAUDE.md · domain → domain-{slug}.md · path → scoped-{slug}.md
 *
 * ★ 왜 표인가 — 읽는 쪽이 **둘**이다: 배치(`byScope`)와 「이 scope 의 규칙은 어느 파일로
 *   나오나」(`scopePackPath`). 두 곳에 `if (kind === 'domain')` 을 적으면 scope 가 늘 때
 *   한쪽만 고쳐지고, 그러면 규칙은 만들어지는데 아무도 그 파일을 못 찾는다.
 * ⚠ SPEC §4.1 표는 project 와 path 만 적었다. domain scope 를 CLAUDE.md 로 보내면
 *   도메인 규칙이 전역 규칙처럼 보인다 — 그래서 그 도메인 파일로 보낸다.
 */
const SCOPE_DOC = {
  project: 'claude',
  domain: 'domain',
  path: 'scoped',
} as const satisfies Record<ScopeKind, DocId>

/** scope 로 갈리는 규칙(policy·constraint)의 배치. **3종이 전부 다른 파일**이다. */
function byScope(item: ContextItem, projectSection: SectionKey): Placement {
  const value = item.scope.value ?? ''
  const doc = SCOPE_DOC[item.scope.kind]
  if (item.scope.kind === 'project') return place(doc, projectSection)
  //  `paths:` frontmatter 는 경로 scope 만 갖는다 — 도메인 이름은 경로가 아니다.
  const paths = item.scope.kind === 'path' ? [value] : []
  return place(doc, 'scoped_rule', { slug: slugify(value), title: value, paths })
}

/**
 * 「이 scope 의 규칙은 Pack 의 **어느 파일**로 나오나」 — 위 표와 `DOCS` 를 잇는 유일한 문.
 *
 * ★ 왜 내보내나 — 관통이 「데모가 scope 3종을 다 보여 주나」를 세려면 파일 이름을 알아야
 *   하는데, 그 이름을 검사 쪽에 적으면 표가 두 곳으로 갈라진다 (FINDINGS 93).
 * ⚠ slug 를 모르고 갈래만 셀 때는 `'*'` 를 넣어 glob 으로 쓴다.
 */
export function scopePackPath(kind: ScopeKind, slug: string): string {
  return DOCS[SCOPE_DOC[kind]].path(slug)
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
 * 🔴 **status 4종의 정본 표는 `packages/schema` 에 있다** (`ITEM_STATUS_EXCLUDE_REASON`).
 * ⚠ 여기로 되돌리지 마라 — 읽는 쪽이 둘이다(컴파일러 · 화면 5 의 상태 버튼).
 *   화면은 이 패키지를 import 할 수 없다 (`node:crypto` 재수출).
 */

/** 항목 하나의 배치를 정한다. status 가 먼저다 — 폐기된 항목은 타입을 볼 것도 없다. */
export function placeItem(item: ContextItem): Placement[] {
  const byStatus = ITEM_STATUS_EXCLUDE_REASON[item.status]
  if (byStatus !== null) return [{ kind: 'exclude', reason: byStatus }]
  return PARTITION[item.type](item)
}
