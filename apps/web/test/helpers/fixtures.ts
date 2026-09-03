import type { ItemType } from '@contextops/schema'

// =====================================================================
//  API 시험이 보내는 초안 표본
//
//  ⚠ `packages/schema/test/fixtures.ts` 를 그대로 쓰지 않는다 — 그건 그 패키지의
//    **내부** 시험 자산이고, 다른 패키지가 `test/` 안쪽을 import 하기 시작하면
//    공개 API(`index.ts`) 규칙이 무너진다 (CLAUDE.md). 여기 것은 훨씬 작다:
//    API 시험은 항목 10종을 재지 않고 **라우트가 초안을 어떻게 다루는가**를 잰다.
// =====================================================================

const DATA: Partial<Record<ItemType, Record<string, unknown>>> = {
  policy: { rule: '환불은 영업일 3일 안에 처리한다', severity: 'must', enforcement: 'review' },
  constraint: { statement: 'PII 를 로그에 남기지 않는다' },
  mission: { statement: '결제를 안전하고 예측 가능하게 만든다.' },
}

/** `repo` 는 등록된 레포 이름과 같아야 한다 — 그래야 근거가 무언가를 가리킨다. */
export function draft(
  id: string,
  type: ItemType = 'policy',
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    type,
    title: '결제 재시도 정책',
    body: '재시도는 3회까지 한다.',
    scope: { kind: 'project' },
    priority: 60,
    source_refs: [{ kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts', start_line: 14 }],
    tags: ['payment'],
    confidence: 'high',
    data: DATA[type],
    ...overrides,
  }
}

export function batchBody(items: Record<string, unknown>[], repo = 'paylab-api'): Record<string, unknown> {
  return {
    items,
    repo,
    //  🔴 경로와 **이름만**이다. 파일 본문도 env 값도 이 스키마에 자리가 없다 (P1).
    scan_summary: { file_count: 42, languages: ['ts'], env_keys: ['STRIPE_KEY'] },
  }
}
