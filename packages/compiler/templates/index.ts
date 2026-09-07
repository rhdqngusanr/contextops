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

//  1.3 (2026-09-06) — `agents`·`cursor` 거울 문서가 생겼고, scoped_rule 줄이 제 범위(도메인·경로)를
//      끝에 적는다. ★ 왜 — 거울 문서는 여러 파일의 규칙을 **한 장**에 모으므로 「어느 파일에 있었나」가
//      없어진다. 줄이 스스로 범위를 말하지 않으면 경로 규칙이 전역 규칙처럼 읽힌다.
//  1.4 (2026-09-07) — 항목의 `body`(사용자가 적은 설명)가 **모든 절**에서 Pack 에 나간다 (FINDINGS 9).
//      ★ 왜 — 예전엔 `bodyLine()` 을 부르는 절이 넷뿐이라 mission·goal·roadmap·policy·constraint 의
//      `body` 가 조용히 사라졌다. 자리는 이제 `src/sections.ts` 의 `SECTIONS` 표 `body` 칸이 정한다.
export const TEMPLATE_VERSION = '1.4'

/**
 * 🔴 **거울 문서** — 제 항목은 없고 다른 문서의 절을 **그대로** 모아 한 장으로 내는 문서
 * (SPEC §4.1 표의 마지막 줄 「동일 내용」). `agents` = `AGENTS.md` · `cursor` = `.cursor/rules/contextops.mdc`.
 *
 * ★ 새 타깃(예: `.windsurf/rules/…`)을 더하는 절차 — 넷이고, 코드 밖에 없다:
 *   ① `packages/schema` 의 `PACK_TARGETS` **끝에** 값 (직렬화된다 — 중간에 넣지 마라)
 *   ② 여기 `MirrorDocId` 에 이름 하나 + 아래 `DOCS` 에 `compose` 가 있는 항목 하나
 *   ③ `plugin/contextops/src/cli/managed.ts` 의 `MANAGED_PATHS` 에 그 경로 (없으면 sync 가 거부하고 멈춘다)
 *   ④ `test/liveness.test.ts` 「PackTarget」이 `PACK_TARGETS` 를 돌며 「타깃마다 파일이 나온다」를 자동으로 센다
 * ⚠ partition 표는 거울 문서를 **모른다** — `place()` 가 `PlaceableDocId` 만 받아서 타입이 막는다.
 *   항목이 어느 절로 가는지는 한 번만 정해지고, 거울은 그 결과를 읽는다. 그래서 ItemType 이 늘어도 여기는 안 고친다.
 */
export type MirrorDocId = 'agents' | 'cursor'

/** Pack 을 이루는 문서 종류. `domain`·`scoped` 는 slug 마다 파일이 하나씩 생긴다. */
export type DocId = 'claude' | 'architecture' | 'domain' | 'workflow' | 'decisions' | 'scoped' | 'policies' | MirrorDocId

/** partition 이 항목을 놓을 수 있는 문서 — 거울 문서는 뺀다. */
export type PlaceableDocId = Exclude<DocId, MirrorDocId>

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
  /**
   * 🔴 **거울 문서** — 여기 적힌 문서들의 절(블록)을 그대로 모아 이 문서의 절로 삼는다.
   *   slug 가 여럿인 문서(`domain`·`scoped`)는 **모든 slug** 를 slug 순으로 모은다.
   * ★ 왜 partition 에 한 줄 더 넣지 않나 — 그러면 ItemType 을 하나 더할 때 「CLAUDE.md 에도,
   *   AGENTS.md 에도」를 사람이 기억해야 하고, 다음 사람은 반드시 하나를 빠뜨린다.
   *   거울은 표를 **읽기만** 한다 (`src/assemble.ts` 의 `collect`).
   * ⚠ 거울은 분량 규칙(§4.1 5단계)의 대상이 아니다 — 원본 파일들이 이미 각자 한도 안이고,
   *   거울을 나누면 `AGENTS-2.md` 같은 이름이 나와 sync allowlist 밖으로 떨어진다.
   */
  compose?: readonly PlaceableDocId[]
  head: (v: DocVars) => string[]
  slots: readonly Slot[]
  foot?: (v: DocVars) => string[]
}

/**
 * 거울 문서의 재료와 절 순서 — `agents`·`cursor` 가 **같은 것**을 쓴다 (「동일 내용」).
 * CLAUDE.md 의 절 전부 + rules 의 인라인 요약(결정 요약 · 도메인 · 도메인·경로 규칙 · 작업 절차).
 * ⚠ `architecture` 상세와 `adr_full` 은 뺀다 — Quick Map 과 결정 요약이 그 요약이다.
 *   `policies` 는 재료가 아니다 — 분량 규칙이 옮기기 **전**의 `claude` 를 읽으므로 정책은 이미 들어 있다.
 */
const INLINE_SOURCES: readonly PlaceableDocId[] = ['claude', 'architecture', 'domain', 'scoped', 'workflow']
const INLINE_SLOTS: readonly Slot[] = [
  { section: 'mission', heading: '## Mission' },
  { section: 'goal', heading: '## Goals' },
  { section: 'roadmap', heading: '## Roadmap', lead: '<!-- ctx:roadmap -->' },
  { section: 'policy', heading: '## Policies (must follow)' },
  { section: 'constraint', heading: '## Constraints' },
  { section: 'quickmap', heading: '## Quick Map' },
  { section: 'adr_summary', heading: '## 결정 요약' },
  //  ⚠ `domain`·`workflow` 블록은 제 `## 제목` 을 갖고 시작한다 — 위에 `##` 을 또 얹으면
  //    h2 아래 h2 가 되어 사람이 읽기 어렵다. 대신 어디서 왔는지를 주석 한 줄로 적는다.
  { section: 'domain', lead: '<!-- 도메인 — .claude/rules/domain-*.md 의 본문 -->' },
  { section: 'scoped_rule', heading: '## 도메인·경로 규칙', lead: '<!-- 각 줄 끝의 「도메인:」·「경로:」가 그 규칙의 범위다 -->' },
  { section: 'workflow', lead: '<!-- 작업 절차 — .claude/rules/workflow.md 의 본문 -->' },
]
/** 거울 문서의 꼬리 — 정본이 어디인지 말한다. `> ` 로 시작해야 한다 (템플릿 줄 · P7 시험이 그렇게 알아본다). */
const MIRROR_FOOT = '> 정본은 CLAUDE.md 와 .claude/rules/ 다 — 이 파일은 같은 내용을 한 장으로 옮긴 것이다. 진행 보고는 Claude Code 플러그인이 한다.'

/**
 * `.cursor/rules/*.mdc` 의 frontmatter. Cursor 는 `alwaysApply: true` 인 규칙을 모든 대화에 넣는다.
 * ⚠ 이 줄들은 항목에서 온 것이 아니다 — `test/traceability.test.ts` 의 `isTemplateLine` 이 이 표로 알아본다.
 */
export const CURSOR_FRONTMATTER: readonly string[] = [
  '---',
  'description: ContextOps 가 만든 팀 규칙 — 손으로 고치지 말고 /contextops:propose 로 제안한다',
  'alwaysApply: true',
  '---',
]

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
    //  🔴 머리말이 **어느 도메인인지** 적는다 (FINDINGS 91 · 97).
    //  ★ 왜 — 예전에는 「제목은 절이 갖는다(`## {도메인 이름}`)」로 두었는데, 그 절은
    //    `domain` **ItemType 항목**만 채운다. `scope.kind:'domain'` 규칙만 있고 그
    //    도메인 항목이 없는 파일(`domain-refund.md`)은 이름을 적는 사람이 **아무도 없어서**
    //    본문 어디에도 그 도메인 이름이 안 나왔다 — 아는 길이 파일 이름뿐이라
    //    발췌·인용하는 순간 사라진다. `scoped` 의 `# 경로 규칙 — {title}` 과 모양을 맞췄다.
    //  ⚠ `## {도메인 이름}` 절과 겹쳐 보이지만 **층이 다르다**(파일 제목 · 절 제목).
    //    이 규칙은 `test/naming.test.ts` 가 잠근다 — slug 로 갈라지는 문서는 전부 해당한다.
    head: (v) => [`# 도메인 — ${v.title}`, notice(v)],
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

  // ── 거울 문서 (SPEC §4.1 「동일 내용」) — 항목은 위 문서들에서 온다. `compose` 를 봐라. ──
  agents: {
    path: () => 'AGENTS.md',
    target: 'agents',
    compose: INLINE_SOURCES,
    head: (v) => [`# ${v.projectName} — Team Context v${v.version}`, notice(v)],
    slots: INLINE_SLOTS,
    foot: () => [MIRROR_FOOT],
  },

  cursor: {
    path: () => '.cursor/rules/contextops.mdc',
    target: 'cursor',
    compose: INLINE_SOURCES,
    head: (v) => [...CURSOR_FRONTMATTER, `# ${v.projectName} — Team Context v${v.version}`, notice(v)],
    slots: INLINE_SLOTS,
    foot: () => [MIRROR_FOOT],
  },
}
