import type { ContextItem, ItemType, ScopeKind } from '@contextops/schema'
import type { SectionKey } from '../templates'
import { esc } from './text'

// =====================================================================
//  🔴 **절(section)마다 「한 항목이 어떤 줄이 되나」의 정본 표.**
//     정본은 docs/SPEC.md §4.2. 어느 절이 어느 파일에 오는지는 `templates/index.ts`,
//     어떤 항목이 어느 절로 가는지는 `src/partition.ts` 다. 셋이 각각 하나씩만 안다.
//
//  ⚠ 역추적 태그는 여기서 붙이지 않는다 — `assemble.ts` 가 **블록의 마지막 줄**에
//    한 번만 붙인다. 렌더마다 붙이면 빠뜨리는 절이 생긴다 (P7).
// =====================================================================

type Lines = readonly string[]

/**
 * 절이 받는 타입을 좁혀 준다.
 * ⚠ 캐스트가 안전한 이유 — `assemble` 은 partition 표가 그 절로 보낸 항목만 넘긴다.
 *   그래서 절과 타입이 어긋나면 그건 partition 표의 버그이고, 아래 검사가 던진다.
 */
function forTypes<T extends ItemType>(
  types: readonly T[],
  fn: (item: Extract<ContextItem, { type: T }>) => Lines,
): (item: ContextItem) => Lines {
  return (item) => {
    if (!(types as readonly ItemType[]).includes(item.type)) {
      throw new Error(`절이 받을 수 없는 타입이다: ${item.type} (허용: ${types.join(',')}) — partition 표를 봐라`)
    }
    return fn(item as Extract<ContextItem, { type: T }>)
  }
}

/** 본문(`body`)은 있을 때만 한 줄로 붙인다. 없는 항목이 흔해서 빈 줄을 남기면 안 된다. */
function bodyLine(body: string, indent = ''): Lines {
  const text = esc(body)
  return text.length > 0 ? [`${indent}${text}`] : []
}

/**
 * 🔴 **「이 절에서 항목의 `body` 는 어디로 가나」의 정본 표 값** (FINDINGS 9).
 *
 * ★ 왜 표의 칸으로 올렸나 — 예전엔 `render` 안에서 절마다 손으로 `bodyLine()` 을 불렀고,
 *   부르는 절이 넷(architecture·adr_full·domain·workflow)뿐이었다. 나머지 절에서
 *   **사용자가 적은 설명이 Pack 에서 조용히 사라졌다.** 「부르는 걸 잊었나」는 눈에 안 보이지만
 *   **표의 빈 칸은 보인다.** 그리고 이 칸이 있어야 「어느 절도 body 를 안 버린다」를 기계가 센다
 *   (`test/liveness.test.ts` 「ItemType 10종의 body」).
 *
 * ⚠ 새 절을 더하면 이 칸을 **반드시** 골라야 한다 — 타입이 막는다.
 */
export type BodyStyle =
  /** 블록의 마지막 줄로 한 줄 붙인다 (여러 줄짜리 절). */
  | 'block'
  /** 목록 한 줄 아래에 이어지는 들여쓴 줄로 붙인다 (`spaced: false` 인 목록 절). */
  | 'indent'
  /** 이 절의 `render` 가 **스스로** 자리를 정한다 (절 안에서 위치가 뜻을 갖는 절). */
  | 'own'
  /** 이 절은 요약이고, 같은 항목의 `body` 는 **다른 절**이 낸다 (같은 말을 두 번 적지 않는다). */
  | 'elsewhere'

const BODY_INDENT = '  '

function backticked(paths: readonly string[]): string {
  return paths.map((p) => `\`${p}\``).join(', ')
}

/**
 * 🔴 **enforcement 4종의 표.** 「이 정책을 무엇이 강제하나」를 사람이 읽는 말로 바꾼다.
 * ★ 왜 4종이 다 나오나 — `none` 을 안 적으면 「강제 수단이 없다」와 「아직 안 정했다」가
 *   같은 화면이 된다. 값 4개가 전부 출력을 바꿔야 값이 살아 있는 것이다.
 */
export const ENFORCEMENT_LABEL = {
  hook: 'Hook 이 막는다',
  review: '리뷰에서 본다',
  permission: '권한 설정으로 막는다',
  none: '강제 수단 없음 — 사람이 지킨다',
} as const satisfies Record<Extract<ContextItem, { type: 'policy' }>['data']['enforcement'], string>

const policyLine = forTypes(['policy'], (item) => [
  `- [${item.data.severity}] ${esc(item.data.rule)} · 강제: ${ENFORCEMENT_LABEL[item.data.enforcement]}`,
])

const constraintLine = forTypes(['constraint'], (item) => {
  const expiry = item.data.expiry === undefined ? '' : ` (${item.data.expiry} 까지)`
  return [`- ${esc(item.data.statement)}${expiry}`]
})

export type SectionSpec = {
  render: (item: ContextItem) => Lines
  /** 블록 사이에 빈 줄을 넣나. 여러 줄짜리 블록은 붙여 놓으면 어디서 끊기는지 안 보인다. */
  spaced: boolean
  /** 항목의 `body`(사용자가 적은 설명)가 이 절에서 어디로 가나. 위 `BodyStyle` 참조. */
  body: BodyStyle
}

/**
 * 절 하나가 만드는 줄 전부 — `render` 의 결과에 `body` 칸이 말하는 자리를 더한다.
 * ⚠ `assemble` 은 이 문 하나로만 절을 그린다. `SECTIONS[...].render` 를 직접 부르지 마라 —
 *   그러면 `body` 칸이 다시 조용히 무시된다 (FINDINGS 9 의 고장 그대로).
 */
export function renderSection(section: SectionKey, item: ContextItem): Lines {
  const spec = SECTIONS[section]
  const lines = spec.render(item)
  if (spec.body === 'block') return [...lines, ...bodyLine(item.body)]
  if (spec.body === 'indent') return [...lines, ...bodyLine(item.body, BODY_INDENT)]
  return lines                                   // 'own' 은 render 가 이미 넣었고, 'elsewhere' 는 다른 절이 낸다
}

export const SECTIONS = {
  mission: {
    spaced: true,
    body: 'block',
    render: forTypes(['mission'], (item) => [
      esc(item.data.statement),
      ...(item.data.rationale === undefined ? [] : [`> ${esc(item.data.rationale)}`]),
    ]),
  },

  goal: {
    spaced: false,
    body: 'indent',
    render: forTypes(['goal'], (item) => {
      const d = item.data
      const metric = d.metric === undefined ? '' : ` · 지표: ${esc(d.metric)}`
      const deadline = d.deadline === undefined ? '' : ` · 기한: ${d.deadline}`
      return [`- **${esc(item.title)}** — ${esc(d.outcome)}${metric}${deadline}`]
    }),
  },

  roadmap: {
    spaced: false,
    body: 'indent',
    render: forTypes(['roadmap'], (item) => {
      const d = item.data
      const due = d.due === undefined ? '' : ` \`due: ${d.due}\``
      const paths = d.paths.length === 0 ? '' : ` \`paths: ${d.paths.join(', ')}\``
      const deps = d.dependencies.length === 0 ? '' : ` \`deps: ${d.dependencies.join(', ')}\``
      return [
        `- **${esc(d.milestone_id)} ${esc(item.title)}**${due}${paths}${deps}`,
        `  done_when: ${d.done_when.map(esc).join(' · ')}`,
      ]
    }),
  },

  policy: { spaced: false, body: 'indent', render: policyLine },
  constraint: { spaced: false, body: 'indent', render: constraintLine },

  quickmap: {
    //  한 줄 요약이다 — 같은 항목의 `body` 는 architecture 절(상세 파일)이 낸다.
    spaced: false,
    body: 'elsewhere',
    render: forTypes(['architecture'], (item) => {
      const d = item.data
      const paths = d.paths.length === 0 ? '' : ` (${backticked(d.paths)})`
      return [`- ${esc(d.component)}: ${esc(d.responsibility)}${paths}`]
    }),
  },

  architecture: {
    spaced: true,
    body: 'block',
    render: forTypes(['architecture'], (item) => {
      const d = item.data
      return [
        `### ${esc(item.title)}`,
        `- 구성요소: \`${esc(d.component)}\``,
        `- 책임: ${esc(d.responsibility)}`,
        ...(d.paths.length === 0 ? [] : [`- 경로: ${backticked(d.paths)}`]),
      ]
    }),
  },

  adr_summary: {
    //  결정 요약 한 줄이다 — 같은 항목의 `body` 는 adr_full 절(결정 기록)이 낸다.
    spaced: false,
    body: 'elsewhere',
    render: forTypes(['adr'], (item) => [
      `- **${esc(item.title)}** — ${esc(item.data.decision)} (${item.data.adr_status})`,
    ]),
  },

  adr_full: {
    spaced: true,
    body: 'block',
    render: forTypes(['adr'], (item) => {
      const d = item.data
      return [
        `## ${esc(item.title)} (${d.adr_status})`,
        `- 결정: ${esc(d.decision)}`,
        `- 배경: ${esc(d.context)}`,
        `- 결과: ${esc(d.consequences)}`,
      ]
    }),
  },

  domain: {
    //  🔴 `own` — 도메인 설명은 **용어·불변식보다 먼저** 와야 읽힌다. 자리가 뜻을 가지므로
    //     표가 끝에 붙이게 두지 않는다 (`render` 안의 `bodyLine` 이 그 자리다).
    spaced: true,
    body: 'own',
    render: forTypes(['domain'], (item) => {
      const d = item.data
      return [
        `## ${esc(d.name)}`,
        ...bodyLine(item.body),
        ...(d.glossary.length === 0 ? [] : ['### 용어', ...d.glossary.map((g) => `- **${esc(g.term)}** — ${esc(g.meaning)}`)]),
        ...(d.invariants.length === 0 ? [] : ['### 불변식', ...d.invariants.map((i) => `- ${esc(i)}`)]),
      ]
    }),
  },

  workflow: {
    spaced: true,
    body: 'block',
    render: forTypes(['workflow'], (item) => {
      const d = item.data
      return [
        `## ${esc(item.title)}`,
        `- 트리거: ${esc(d.trigger)}`,
        '- 절차:',
        ...d.steps.map((s, n) => `  ${n + 1}. ${esc(s)}`),
        ...(d.done_when.length === 0 ? [] : [`- 완료 조건: ${d.done_when.map(esc).join(' · ')}`]),
      ]
    }),
  },

  // 경로·도메인에 매인 규칙은 policy 와 constraint 둘 다 온다 — 줄 모양은 위와 같은 것에
  // **범위**를 끝에 붙인다 (`SCOPE_INLINE_LABEL`).
  scoped_rule: {
    spaced: false,
    body: 'indent',
    render: (item) => {
      const [line] = item.type === 'policy' ? policyLine(item) : constraintLine(item)
      if (item.scope.kind === 'project') return [line as string]   // partition 이 여기로 보내지 않는다 — 방어선
      return [`${line as string} · ${SCOPE_INLINE_LABEL[item.scope.kind]}: ${esc(item.scope.value ?? '')}`]
    },
  },
} as const satisfies Record<SectionKey, SectionSpec>

/**
 * 🔴 **scoped_rule 줄이 제 범위를 말하는 표** — `project` 는 없다 (그 규칙은 CLAUDE.md 본문에 서서
 * 파일 자체가 범위다). ★ 왜 줄에 적나 — 거울 문서(`AGENTS.md`)는 domain-*·scoped-* 파일의 규칙을
 * **한 절**에 모은다. 파일 이름·frontmatter 가 나르던 범위가 거기서 사라지므로 줄이 스스로 말해야 한다.
 * ⚠ 이 값들을 밖에 복사하지 마라 — 시험(`test/liveness.test.ts`)은 이 표를 import 해서 잰다.
 */
export const SCOPE_INLINE_LABEL = {
  domain: '도메인',
  path: '경로',
} as const satisfies Record<Exclude<ScopeKind, 'project'>, string>
