import type { PackTarget } from '@contextops/schema'
import { PROGRESS_REPORT } from './progress-report'

// =====================================================================
//  🔴 **문서 골격의 정본 표.** Pack 이 어떤 파일들로 이루어지고 각 파일이 어떤 절을
//     어떤 순서로 갖는지가 전부 아래 `DOCS` 한 곳에 있다. 정본은 docs/SPEC.md §4.1·§4.2.
//
//  ★ 왜 표인가 — 파일 목록이 partition 코드·렌더 코드·테스트에 흩어지면 파일 하나를
//    더할 때마다 세 군데를 고쳐야 하고, 다음 사람은 반드시 하나를 빠뜨린다.
//    여기는 **문서의 모양**만 안다. 어떤 항목이 어느 절로 가는지는 `src/partition.ts`,
//    한 항목이 어떤 줄이 되는지는 `src/sections.ts` 다.
//
//  ⚠ 템플릿을 고치면 `TEMPLATE_VERSION` 을 올리고 golden 의 expected 를 갱신한 이유를
//    커밋 메시지에 적어라 (loop/PROMPT.md ⑤). 말없이 expected 를 덮으면 게이트가
//    게이트가 아니게 된다.
// =====================================================================

export const TEMPLATE_VERSION = '1.1'

/** Pack 을 이루는 문서 종류. `domain`·`scoped` 는 slug 마다 파일이 하나씩 생긴다. */
export type DocId = 'claude' | 'architecture' | 'domain' | 'workflow' | 'decisions' | 'scoped' | 'policies'

/**
 * 문서 안의 절. 한 절은 **한 가지 모양의 줄**만 담는다 (`src/sections.ts` 의 표).
 * ★ 새 절을 더하는 절차: ① 여기 값 추가 ② `SECTIONS` 에 렌더 한 줄 ③ 아래 `DOCS` 의 slots 에 한 줄.
 */
export type SectionKey =
  | 'mission' | 'goal' | 'roadmap' | 'policy' | 'constraint' | 'quickmap'
  | 'architecture' | 'adr_summary' | 'adr_full' | 'domain' | 'workflow' | 'scoped_rule'

export type DocVars = {
  projectName: string
  /** 발행 버전 (`v1.3`). */
  version: string
  /** snapshot_hash 앞 8자 — 사람이 「어느 스냅샷인가」를 눈으로 대조하는 용도. */
  snapshotShort: string
  /** domain·scoped 문서의 제목 (도메인 이름 · 경로 glob). 나머지 문서는 빈 문자열. */
  title: string
  /** scoped 문서 frontmatter 의 `paths:`. */
  paths: readonly string[]
}

export type Slot = {
  section: SectionKey
  /** 그 절에 항목이 하나도 없으면 제목째로 빠진다 — 빈 제목만 남은 Pack 을 만들지 않는다. */
  heading?: string
  /** 제목 바로 아래 한 줄 (예: Roadmap 의 절 태그). */
  lead?: string
}

export type DocSpec = {
  path: (slug: string) => string
  target: PackTarget
  /**
   * 🔴 **항목이 하나도 없어도 이 문서를 만든다** (SPEC §4.3).
   *
   * ★ 왜 필요한가 — 이 문서의 `foot` 은 팀 항목에서 온 것이 아니라 **제품이 넣는
   *   사용법**이다. 항목이 있을 때만 만들면 그 사용법을 배우는 저장소와 못 배우는
   *   저장소가 갈린다 (FINDINGS 8 · 43 — Roadmap 이 영원히 보고 0건이 된다).
   * ★ 켜는 절차: ① 여기 `always: true` ② `packages/schema` 의
   *   `PRODUCT_TEXT_PACK_FILES` 에 그 경로 (P7 의 예외를 계약에 이름으로 적는다)
   *   ③ `test/traceability.test.ts` 의 `isTemplateLine` 이 그 고정 텍스트를 알아보게.
   *   ①만 하면 `test/always.test.ts` 가 빨개진다.
   * ⚠ `slug` 가 여럿인 문서(`domain`·`scoped`)에는 켤 수 없다 — 어느 slug 를
   *   만들지 정할 수 없다.
   */
  always?: true
  head: (v: DocVars) => string[]
  slots: readonly Slot[]
  foot?: (v: DocVars) => string[]
}

/**
 * 모든 Pack 파일의 첫 줄들. **손으로 고치지 말라는 경고가 없으면 사용자가 고치고,
 * 다음 sync 가 그걸 덮어쓴다.**
 *
 * ⚠ 여기에 `manifest_hash` 를 적을 수 없다 — manifest_hash 는 **이 파일의 해시로부터**
 *   계산되므로 순환이다 (SPEC §4.2 발췌는 이 순환을 못 보고 적혀 있다 · FINDINGS 참고).
 *   대신 순환이 없는 `snapshot_hash` 앞 8자를 적는다.
 */
function notice(v: DocVars): string {
  return `<!-- ContextOps generated. Do not edit by hand; run /contextops:propose to suggest changes. snapshot:${v.snapshotShort} -->`
}

// ⚠ 타입을 `Record<DocId, DocSpec>` 로 **명시**한다. `as const satisfies` 로만 두면
//   리터럴 타입이 남아서 `heading` 이 없는 문서에서 `slot.heading` 을 못 읽는다 —
//   표를 읽는 쪽이 문서마다 다른 타입을 보게 되면 표가 아니다.
export const DOCS: Record<DocId, DocSpec> = {
  claude: {
    path: () => 'CLAUDE.md',
    target: 'claude',
    head: (v) => [`# ${v.projectName} — Team Context v${v.version}`, notice(v)],
    slots: [
      { section: 'mission', heading: '## Mission' },
      { section: 'goal', heading: '## Goals' },
      { section: 'roadmap', heading: '## Roadmap', lead: '<!-- ctx:roadmap -->' },
      { section: 'policy', heading: '## Policies (must follow)' },
      { section: 'constraint', heading: '## Constraints' },
      { section: 'quickmap', heading: '## Quick Map' },
    ],
    foot: () => ['> 상세 규칙은 .claude/rules/ 를 따른다.'],
  },

  architecture: {
    path: () => '.claude/rules/architecture.md',
    target: 'claude',
    head: (v) => ['# 아키텍처', notice(v)],
    slots: [
      { section: 'architecture', heading: '## 구성요소' },
      { section: 'adr_summary', heading: '## 결정 요약' },
    ],
  },

  domain: {
    path: (slug) => `.claude/rules/domain-${slug}.md`,
    target: 'claude',
    // 제목은 절이 갖는다(`## {도메인 이름}`) — 머리말에 또 적으면 같은 이름이 두 줄 겹친다.
    head: (v) => ['# 도메인', notice(v)],
    slots: [
      { section: 'domain' },
      { section: 'scoped_rule', heading: '## 이 도메인의 규칙' },
    ],
  },

  workflow: {
    path: () => '.claude/rules/workflow.md',
    target: 'claude',
    // 🔴 SPEC §4.3 의 「항상」은 **파일 자체가 항상 나간다**는 뜻이다.
    //    workflow 항목이 0개인 저장소도 진행 보고 방법을 배워야 한다.
    always: true,
    head: (v) => ['# 작업 절차', notice(v)],
    slots: [{ section: 'workflow' }],
    // 🔴 SPEC §4.3 — 이 문단은 항목에서 오지 않는다. 항상 붙는다.
    foot: () => [...PROGRESS_REPORT],
  },

  decisions: {
    path: () => '.claude/rules/decisions.md',
    target: 'claude',
    head: (v) => ['# 결정 기록 (ADR)', notice(v)],
    slots: [{ section: 'adr_full' }],
  },

  scoped: {
    path: (slug) => `.claude/rules/scoped-${slug}.md`,
    target: 'claude',
    // frontmatter `paths:` — Claude Code 가 이 경로를 만질 때만 이 규칙을 읽는다.
    head: (v) => ['---', 'paths:', ...v.paths.map((p) => `  - "${p}"`), '---', `# 경로 규칙 — ${v.title}`, notice(v)],
    slots: [{ section: 'scoped_rule' }],
  },

  // CLAUDE.md 가 12,000자를 넘으면 정책·제약이 여기로 옮겨진다 (SPEC §4.1 5단계).
  policies: {
    path: () => '.claude/rules/policies.md',
    target: 'claude',
    head: (v) => ['# 정책과 제약', notice(v), '> CLAUDE.md 가 길어져 이 파일로 옮겨졌다.'],
    slots: [
      { section: 'policy', heading: '## Policies (must follow)' },
      { section: 'constraint', heading: '## Constraints' },
    ],
  },
}
