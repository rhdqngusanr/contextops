import { ITEM_TYPES, type ItemType } from '../src/common'

/**
 * 항목 타입별 **완전한** data 표본 — optional 필드까지 전부 채운다.
 * ★ 왜 전부 채우나 — liveness 검사가 「이 표본을 다른 타입으로 파싱하면 실패하는가」다.
 *   optional 을 비우면 mission({statement}) 과 constraint({statement}) 처럼 겹쳐서
 *   「표의 항목이 실제로 뭔가를 바꾼다」를 증명하지 못한다.
 */
export const SAMPLE_DATA = {
  mission: { statement: '결제를 안전하고 예측 가능하게 만든다.', rationale: '장애의 대부분이 결제에서 났다.' },
  goal: { outcome: '결제 실패율 1% 미만', metric: 'payment_failure_rate', deadline: '2026-12-31' },
  roadmap: {
    milestone_id: 'PL-M1',
    due: '2026-10-15',
    paths: ['src/payment/retry.ts'],
    done_when: ['재시도 횟수가 문서와 코드에서 같다'],
    dependencies: ['PL-M0'],
  },
  architecture: { component: 'payment-gateway', responsibility: 'PG 연동과 재시도', paths: ['src/payment'] },
  domain: {
    name: 'payment',
    glossary: [{ term: 'PaymentIntent', meaning: '결제 요청 한 건' }],
    invariants: ['환불 금액은 결제 금액을 넘지 않는다'],
  },
  policy: { rule: '환불은 영업일 3일 안에 처리한다', severity: 'must', enforcement: 'review' },
  adr: {
    decision: 'PG 재시도는 3회로 고정한다',
    context: '5회는 중복 결제를 만들었다',
    consequences: '실패율이 소폭 오르지만 중복이 사라진다',
    adr_status: 'accepted',
  },
  workflow: {
    trigger: '결제 코드를 고쳤을 때',
    steps: ['테스트를 돌린다', '재시도 횟수를 문서와 대조한다'],
    done_when: ['CI 가 초록이다'],
  },
  constraint: { statement: 'PII 를 로그에 남기지 않는다', expiry: '2027-01-01' },
  open_question: {
    question: '환불 SLA 를 3일로 유지할 것인가?',
    owner_id: '3f9c2e1a-0000-4000-8000-000000000002',
    due: '2026-10-01',
  },
} as const satisfies Record<ItemType, Record<string, unknown>>

/** 공통 Base 표본. 타입·data 는 테스트가 붙인다. */
export const SAMPLE_BASE = {
  id: 'item_paylab_retry',
  project_id: '3f9c2e1a-0000-4000-8000-000000000001',
  title: '결제 재시도 정책',
  body: '재시도는 3회까지 한다.',
  status: 'active',
  scope: { kind: 'project' },
  priority: 60,
  source_refs: [{ kind: 'manual', note: '팀장 승인 2026-09-01' }],
  tags: ['payment'],
  confidence: 'high',
  revision: 1,
} as const

export function sampleItem(type: ItemType): Record<string, unknown> {
  return { ...SAMPLE_BASE, type, data: SAMPLE_DATA[type] }
}

/** 화면이 받는 모양 — 항목 표본에 「마지막으로 바뀐 때」 한 칸 (`ContextItemView`). */
export function sampleView(type: ItemType): Record<string, unknown> {
  return { ...SAMPLE_BASE, type, data: SAMPLE_DATA[type], updated_at: '2026-08-04T09:00:00.000Z' }
}

export function sampleDraft(type: ItemType): Record<string, unknown> {
  const { project_id: _p, status: _s, revision: _r, ...rest } = SAMPLE_BASE
  return { ...rest, type, data: SAMPLE_DATA[type] }
}

export const ALL_TYPES: readonly ItemType[] = ITEM_TYPES

// ---------------------------------------------------------------------
//  P1 검사에 쓰는 공용 도구
//  ★ 왜 여기 있나 — 업로드 payload(플러그인)와 API body(웹)를 **다른 시험 파일**이
//    재는데, 「무엇이 금지인가」는 하나여야 한다. 두 곳에 적으면 한쪽만 늘어난다.
//  ⚠ `tools/principles.ps1` 의 목록과 같은 뜻이다. 한쪽을 늘리면 다른 쪽도 늘려라.
// ---------------------------------------------------------------------

/** 서버가 절대 받지 않는 것들 (SPEC §0.1 P1). */
export const FORBIDDEN_KEYS = [
  'file_content', 'snippet', 'code_body', 'transcript', 'diff', 'patch',
  'memory', 'secret', 'secrets', 'secret_value', 'env_value', 'token_value', 'source_code',
]

/** JSON Schema 를 훑어 `properties` 아래의 **모든** 필드 이름을 모은다. */
export function collectPropertyNames(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collectPropertyNames(child, found)
    return
  }
  if (node === null || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'properties' && value !== null && typeof value === 'object') {
      for (const name of Object.keys(value as Record<string, unknown>)) found.add(name)
    }
    collectPropertyNames(value, found)
  }
}
