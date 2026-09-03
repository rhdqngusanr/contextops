import { ITEM_TYPES, parseContextItem, type ContextItem, type ItemType } from '@contextops/schema'
import { TEMPLATE_VERSION, type CompileInput } from '../src'

// =====================================================================
//  테스트 표본. golden 은 `test/golden/*/input.json` 이 정본이고, 여기는 **성질**을
//  재는 시험(결정성·escape·liveness)이 쓰는 최소 재료다.
//
//  ⚠ 여기 값을 늘릴 때는 golden 을 건드리지 않는지 확인해라 — golden 은 파일이 정본이다.
// =====================================================================

const PROJECT = 'c0ffee00-0000-4000-8000-000000000002'

export const SAMPLE_DATA = {
  mission: { statement: '결제를 안전하게 만든다.' },
  goal: { outcome: '결제 실패율 1% 미만' },
  roadmap: { milestone_id: 'M1', paths: ['src/pay'], done_when: ['문서와 코드가 같다'], dependencies: [] },
  architecture: { component: 'gateway', responsibility: 'PG 연동', paths: ['src/pay'] },
  domain: { name: 'payment', glossary: [{ term: 'Intent', meaning: '결제 요청 한 건' }], invariants: ['환불 <= 결제'] },
  policy: { rule: '환불은 3일 안에', severity: 'must', enforcement: 'review' },
  adr: { decision: '재시도 3회', context: '5회는 중복을 만들었다', consequences: '중복이 사라진다', adr_status: 'accepted' },
  workflow: { trigger: '결제를 고쳤을 때', steps: ['테스트를 돌린다'], done_when: [] },
  constraint: { statement: 'PII 를 로그에 남기지 않는다' },
  open_question: { question: 'SLA 를 3일로 둘 것인가?' },
} as const satisfies Record<ItemType, Record<string, unknown>>

/** 타입별로 겹치지 않는 항목 ID (ID 는 `item_[a-z0-9_]{3,40}`). */
const ID: Record<ItemType, string> = {
  mission: 'item_t_mission', goal: 'item_t_goal', roadmap: 'item_t_roadmap',
  architecture: 'item_t_arch', domain: 'item_t_domain', policy: 'item_t_policy',
  adr: 'item_t_adr', workflow: 'item_t_workflow', constraint: 'item_t_constraint',
  open_question: 'item_t_question',
}

export function makeItem(type: ItemType, over: Record<string, unknown> = {}): ContextItem {
  return parseContextItem({
    id: ID[type],
    project_id: PROJECT,
    type,
    title: `${type} 표본`,
    body: '',
    status: 'active',
    scope: { kind: 'project' },
    priority: 50,
    source_refs: [{ kind: 'manual', note: '표본' }],
    tags: [],
    confidence: 'medium',
    revision: 1,
    data: SAMPLE_DATA[type],
    ...over,
  })
}

/** 미션 하나 — 「이 항목이 있고 없고」를 재는 시험의 기준선. Pack 이 비면 컴파일이 실패한다. */
export const ANCHOR = makeItem('mission')

export function makeInput(items: readonly ContextItem[], over: Partial<CompileInput> = {}): CompileInput {
  return {
    snapshot: {
      team_id: 'c0ffee00-0000-4000-8000-000000000001',
      project_id: PROJECT,
      context_version: '1.0.0',
      generated_at: '2026-09-03T00:00:00.000Z',
      items: [...items],
    },
    project: { name: '표본 프로젝트' },
    templateVersion: TEMPLATE_VERSION,
    compilerVersion: 'test',
    ...over,
  }
}

export const ALL_TYPES: readonly ItemType[] = ITEM_TYPES
