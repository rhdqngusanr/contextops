import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  ContextItemsBatchDraft, PROGRESS_STATUSES, PROPOSAL_OPERATIONS,
  ProgressEvent, Proposal, REPORTABLE_SYNC_STATUSES, SYNC_STATUSES, SyncReport,
} from '../src/upload'
import { toJsonSchema } from '../src/json-schema'
import { sampleDraft } from './fixtures'

// =====================================================================
//  🔴 P1 — 서버가 받는 네 개의 body 를 한 표로 모아 놓고 함께 검사한다.
//  ★ 표로 도는 이유 — 엔드포인트가 늘 때 「그것만 검사를 안 받는」 일이 생기지 않게.
//    새 업로드 스키마는 src/upload.ts 의 절차 주석대로 여기 한 줄을 더한다.
// =====================================================================

const VALID_BATCH_DRAFT = {
  items: [sampleDraft('architecture')],
  repo: 'paylab-api',
  scan_summary: { file_count: 40 },
}

const VALID_PROPOSAL = {
  title: '재시도 횟수 정정',
  summary: '코드가 3회다.',
  base_version_id: '3f9c2e1a-0000-4000-8000-000000000020',
  items: [{
    operation: 'update',
    target_item_id: 'item_paylab_retry',
    evidence: [{ kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts', start_line: 14 }],
    reason: '문서는 5회지만 코드는 3회다.',
  }],
  client_request_id: '3f9c2e1a-0000-4000-8000-000000000021',
}

const VALID_PROGRESS = {
  milestone_id: 'PL-M1',
  status: 'criterion_done',
  criterion: '재시도 횟수가 문서와 코드에서 같다',
  evidence: [{ path: 'src/payment/retry.ts', start_line: 14, end_line: 20 }],
  summary: '재시도 상수를 3으로 맞췄다.',
  context_version: 'v1.3.0',
  source: 'agent',
  client_event_id: '3f9c2e1a-0000-4000-8000-000000000022',
}

const VALID_SYNC_REPORT = {
  version: 'v1.3.0',
  manifest_hash: 'b'.repeat(64),
  status: 'applied',
  files: [{ path: 'CLAUDE.md', sha256: 'c'.repeat(64) }],
}

const UPLOAD_SCHEMAS: Record<string, { schema: z.ZodType; valid: unknown; jsonSchema: string }> = {
  'batch-draft': { schema: ContextItemsBatchDraft, valid: VALID_BATCH_DRAFT, jsonSchema: 'batch-draft' },
  proposals: { schema: Proposal, valid: VALID_PROPOSAL, jsonSchema: 'proposal' },
  progress: { schema: ProgressEvent, valid: VALID_PROGRESS, jsonSchema: 'progress-event' },
  'sync-reports': { schema: SyncReport, valid: VALID_SYNC_REPORT, jsonSchema: 'sync-report' },
}

const ENDPOINTS = Object.keys(UPLOAD_SCHEMAS)

/** 서버가 절대 받지 않는 것들 (SPEC §0.1 P1). tools/principles.ps1 의 목록과 같은 뜻이다. */
const FORBIDDEN_KEYS = [
  'file_content', 'snippet', 'code_body', 'transcript', 'diff', 'patch',
  'memory', 'secret', 'secrets', 'secret_value', 'env_value', 'token_value', 'source_code',
]

function collectPropertyNames(node: unknown, found: Set<string>): void {
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

describe('업로드 allowlist (P1 · SPEC §3.1)', () => {
  it('네 개 엔드포인트가 전부 표에 있다', () => {
    expect(ENDPOINTS).toEqual(['batch-draft', 'proposals', 'progress', 'sync-reports'])
  })

  it.each(ENDPOINTS)('%s 의 정상 payload 는 통과한다', (name) => {
    const entry = UPLOAD_SCHEMAS[name]!
    const result = entry.schema.safeParse(entry.valid)
    expect(result.error?.issues ?? []).toEqual([])
    expect(result.success).toBe(true)
  })

  it.each(ENDPOINTS)('%s 는 모르는 키를 거부한다 (.strict)', (name) => {
    const entry = UPLOAD_SCHEMAS[name]!
    const withExtra = { ...(entry.valid as Record<string, unknown>), file_content: 'export const x = 1' }
    expect(entry.schema.safeParse(withExtra).success).toBe(false)
  })

  // 🔴 심사 첫 질문이 이것이다 — 「업로드 payload 에 코드 본문이 들어갈 자리가 있나?」
  it.each(ENDPOINTS)('%s 의 JSON Schema 어디에도 코드·secret·기억 필드가 없다', (name) => {
    const names = new Set<string>()
    collectPropertyNames(toJsonSchema(UPLOAD_SCHEMAS[name]!.jsonSchema as never), names)
    expect([...names].filter((n) => FORBIDDEN_KEYS.includes(n))).toEqual([])
  })

  it('progress 근거는 경로·줄 번호만 담는다 (본문을 실을 자리가 없다)', () => {
    const names = new Set<string>()
    collectPropertyNames(toJsonSchema('progress-event'), names)
    expect([...names].sort()).toEqual([
      'client_event_id', 'commit_sha', 'context_version', 'criterion', 'end_line',
      'evidence', 'milestone_id', 'path', 'source', 'start_line', 'status', 'summary',
    ])
  })
})

describe('업로드 enum 이 실제로 갈린다', () => {
  it.each(PROPOSAL_OPERATIONS)('%s 는 필요한 짝이 없으면 거부된다', (operation) => {
    const bare = {
      operation,
      evidence: [{ kind: 'manual', note: '근거' }],
      reason: '이유',
    }
    const proposal = { ...VALID_PROPOSAL, items: [bare] }
    expect(Proposal.safeParse(proposal).success).toBe(false)

    const paired = operation === 'add'
      ? { ...bare, draft: sampleDraft('goal') }
      : { ...bare, target_item_id: 'item_paylab_retry' }
    expect(Proposal.safeParse({ ...VALID_PROPOSAL, items: [paired] }).success).toBe(true)
  })

  it.each(PROGRESS_STATUSES)('진행 상태 %s 가 통과한다', (status) => {
    expect(ProgressEvent.safeParse({ ...VALID_PROGRESS, status }).success).toBe(true)
  })

  it('진행 보고는 마일스톤 ID 형식이거나 none 이어야 한다', () => {
    expect(ProgressEvent.safeParse({ ...VALID_PROGRESS, milestone_id: 'none' }).success).toBe(true)
    expect(ProgressEvent.safeParse({ ...VALID_PROGRESS, milestone_id: '아무거나' }).success).toBe(false)
  })

  // ⚠ unknown 은 「보고가 없다」는 서버의 판정이다. 기기가 자칭할 수 있으면 둘이 섞인다.
  it('sync 상태 5종 중 unknown 만 보고할 수 없다', () => {
    expect([...REPORTABLE_SYNC_STATUSES]).toEqual(SYNC_STATUSES.filter((s) => s !== 'unknown'))
    for (const status of REPORTABLE_SYNC_STATUSES) {
      expect(SyncReport.safeParse({ ...VALID_SYNC_REPORT, status }).success).toBe(true)
    }
    expect(SyncReport.safeParse({ ...VALID_SYNC_REPORT, status: 'unknown' }).success).toBe(false)
  })
})
