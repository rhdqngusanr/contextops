import type { ContextItem, ItemType } from '@contextops/schema'
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
function bodyLine(body: string): Lines {
  const text = esc(body)
  return text.length > 0 ? [text] : []
}

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
}

export const SECTIONS = {
  mission: {
    spaced: true,
    render: forTypes(['mission'], (item) => [
      esc(item.data.statement),
      ...(item.data.rationale === undefined ? [] : [`> ${esc(item.data.rationale)}`]),
    ]),
  },

  goal: {
    spaced: false,
    render: forTypes(['goal'], (item) => {
      const d = item.data
      const metric = d.metric === undefined ? '' : ` · 지표: ${esc(d.metric)}`
      const deadline = d.deadline === undefined ? '' : ` · 기한: ${d.deadline}`
      return [`- **${esc(item.title)}** — ${esc(d.outcome)}${metric}${deadline}`]
    }),
  },

  roadmap: {
    spaced: false,
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

  policy: { spaced: false, render: policyLine },
  constraint: { spaced: false, render: constraintLine },

  quickmap: {
    spaced: false,
    render: forTypes(['architecture'], (item) => {
      const d = item.data
      const paths = d.paths.length === 0 ? '' : ` (${backticked(d.paths)})`
      return [`- ${esc(d.component)}: ${esc(d.responsibility)}${paths}`]
    }),
  },

  architecture: {
    spaced: true,
    render: forTypes(['architecture'], (item) => {
      const d = item.data
      return [
        `### ${esc(item.title)}`,
        `- 구성요소: \`${esc(d.component)}\``,
        `- 책임: ${esc(d.responsibility)}`,
        ...(d.paths.length === 0 ? [] : [`- 경로: ${backticked(d.paths)}`]),
        ...bodyLine(item.body),
      ]
    }),
  },

  adr_summary: {
    spaced: false,
    render: forTypes(['adr'], (item) => [
      `- **${esc(item.title)}** — ${esc(item.data.decision)} (${item.data.adr_status})`,
    ]),
  },

  adr_full: {
    spaced: true,
    render: forTypes(['adr'], (item) => {
      const d = item.data
      return [
        `## ${esc(item.title)} (${d.adr_status})`,
        `- 결정: ${esc(d.decision)}`,
        `- 배경: ${esc(d.context)}`,
        `- 결과: ${esc(d.consequences)}`,
        ...bodyLine(item.body),
      ]
    }),
  },

  domain: {
    spaced: true,
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
    render: forTypes(['workflow'], (item) => {
      const d = item.data
      return [
        `## ${esc(item.title)}`,
        `- 트리거: ${esc(d.trigger)}`,
        '- 절차:',
        ...d.steps.map((s, n) => `  ${n + 1}. ${esc(s)}`),
        ...(d.done_when.length === 0 ? [] : [`- 완료 조건: ${d.done_when.map(esc).join(' · ')}`]),
        ...bodyLine(item.body),
      ]
    }),
  },

  // 경로·도메인에 매인 규칙은 policy 와 constraint 둘 다 온다 — 줄 모양은 위와 같은 것을 쓴다.
  scoped_rule: {
    spaced: false,
    render: (item) => (item.type === 'policy' ? policyLine(item) : constraintLine(item)),
  },
} as const satisfies Record<SectionKey, SectionSpec>
