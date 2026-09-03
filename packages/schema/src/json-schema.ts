import { z } from 'zod'
import { ContextItem, ContextItemDraft } from './item'
import { Manifest } from './manifest'
import { ContextItemsBatchDraft, ProgressEvent, Proposal, SyncReport } from './upload'

// =====================================================================
//  JSON Schema 산출 — 플러그인이 **네트워크 없이** 로컬 검증에 쓴다
//  (`contextops validate <json>` · SPEC §8.3 · init Skill 이 §8.4 에서 이름으로 지목).
//
//  ★ 왜 따로 내보내나 — 계약이 두 벌이 되면 갈라진다. 플러그인은 Zod 를 못 쓰므로
//    (런타임 의존 0 · SPEC §1.2) **같은 Zod 에서 뽑은** JSON Schema 를 배포한다.
//
//  ★ 새 파일을 더하는 절차: 아래 표에 한 줄 → `pnpm --filter @contextops/schema schemas`.
//    커밋된 파일과 어긋나면 `test/json-schema.test.ts` 가 빨개진다 (표류 방지 게이트).
// =====================================================================

/** 파일 이름(확장자 없음) → 스키마. 산출 위치는 `plugin/contextops/schemas/`. */
export const JSON_SCHEMA_FILES = {
  'context-item': ContextItem,
  'context-item-draft': ContextItemDraft,
  'batch-draft': ContextItemsBatchDraft,
  'proposal': Proposal,
  'progress-event': ProgressEvent,
  'sync-report': SyncReport,
  'manifest': Manifest,
} as const

export type JsonSchemaName = keyof typeof JSON_SCHEMA_FILES

/**
 * `io: 'input'` — 플러그인이 검증하는 것은 **보내기 전의 payload** 다.
 * default 가 있는 필드는 입력에서 빠져도 되므로 output 스키마로 재면 멀쩡한 초안이 빨개진다.
 */
export function toJsonSchema(name: JsonSchemaName): Record<string, unknown> {
  return z.toJSONSchema(JSON_SCHEMA_FILES[name], {
    target: 'draft-2020-12',
    io: 'input',
    // 겹치는 부분 스키마는 `$defs` 로 한 번만 적는다. 인라인이면 항목 10종이 유니온마다
    // 통째로 복사돼 파일이 100KB 를 넘고, 사람이 열어 볼 수 없게 된다.
    reused: 'ref',
  }) as Record<string, unknown>
}

export function toJsonSchemaText(name: JsonSchemaName): string {
  return `${JSON.stringify(toJsonSchema(name), null, 2)}\n`
}
