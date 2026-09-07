import { z } from 'zod'
import { ContextItem, ContextItemDraft } from './item'
import { Manifest, PRODUCT_TEXT_PACK_FILES } from './manifest'
import { ContextItemDraftFile, PendingProposalFile, ProposalDraftFile } from './plugin'
import { ContextItemsBatchDraft, ProgressEvent, Proposal, SyncReport } from './upload'

// =====================================================================
//  JSON Schema 산출 — 플러그인이 **네트워크 없이** 로컬 검증에 쓴다
//  (`contextops validate <json>` · SPEC §8.3 · init Skill 이 §8.4 에서 이름으로 지목).
//
//  ★ 왜 따로 내보내나 — 계약이 두 벌이 되면 갈라진다. 여기 있는 파일은 전부
//    **같은 Zod 에서 뽑은 것**이고, 표류하면 `test/json-schema.test.ts` 가 빨개진다.
//
//  🔴 **누가 읽나** — init Skill 이 Claude 에게 「이 모양으로 써라」고 지목하는
//    작성 안내서다 (SPEC §8.4 3단계). **판정하는 것은 이 파일이 아니다.**
//    `contextops validate` 는 번들에 들어간 **Zod 정본**으로 판다.
//    ★ 왜 그쪽인가 — JSON Schema 는 `.refine()` 을 못 옮긴다 (`ProposalItem` 의
//      「add 는 draft 가, update 는 target 이 필요하다」가 통째로 사라진다).
//      약한 검사로 통과시키고 서버에서 400 을 받으면 사람은 이유를 모른다.
//      esbuild 가 Zod 를 번들에 넣으므로 「런타임 의존 0」(SPEC §1.2)은 그대로다.
//
//  ★ 새 파일을 더하는 절차: 아래 표에 한 줄 → `pnpm --filter @contextops/schema schemas`.
//    커밋된 파일과 어긋나면 `test/json-schema.test.ts` 가 빨개진다 (표류 방지 게이트).
// =====================================================================

/**
 * 산출 위치 (저장소 루트 기준). 산출기·표류 검사·플러그인 쪽 시험이 **같은 값**을 봐야
 * 한다 — 산출기만 옮기면 나머지가 **옛 파일을 보며 초록**이 된다.
 */
export const SCHEMA_OUT_DIR = 'plugin/contextops/schemas'

/** 파일 이름(확장자 없음) → 스키마. 산출 위치는 위 `SCHEMA_OUT_DIR` 이다. */
export const JSON_SCHEMA_FILES = {
  'context-item': ContextItem,
  'context-item-draft': ContextItemDraft,
  //  init Skill 이 쓰는 `.contextops/cache/draft.json` 그 자체 (`contextops validate` 의 기본).
  'draft': ContextItemDraftFile,
  'batch-draft': ContextItemsBatchDraft,
  //  propose Skill 이 쓰는 `.contextops/cache/proposal.json` (기준 버전·요청 id 는 CLI 가 붙인다).
  'proposal-draft': ProposalDraftFile,
  'proposal': Proposal,
  //  Stop 훅이 남기는 힌트. 사람이 열어 고칠 수 있어야 해서 계약을 같이 낸다.
  'pending-proposal': PendingProposalFile,
  'progress-event': ProgressEvent,
  'sync-report': SyncReport,
  'manifest': Manifest,
} as const

export type JsonSchemaName = keyof typeof JSON_SCHEMA_FILES

/**
 * Zod 하나 → JSON Schema. **표에 없는 스키마도 같은 설정으로** 뽑기 위한 자리다 —
 * 서버측 AI 의 도구 `input_schema`(SPEC §7 「input_schema = 해당 Zod 의 JSON Schema」)가
 * 파일로 나가지 않으면서 이 함수를 쓴다. 설정을 두 곳에 적으면 갈라진다.
 *
 * `io: 'input'` — 플러그인이 검증하는 것은 **보내기 전의 payload** 다.
 * default 가 있는 필드는 입력에서 빠져도 되므로 output 스키마로 재면 멀쩡한 초안이 빨개진다.
 */
/**
 * 🔴 **P7 의 근거 규칙을 JSON Schema 로 다시 적는 유일한 자리** (FINDINGS 47).
 *
 * `ManifestFile` 의 규칙은 Zod `.refine()` 이다 — 「`source_item_ids` 가 비지 않거나,
 * 경로가 `PRODUCT_TEXT_PACK_FILES` 에 있거나」. `z.toJSONSchema` 는 refine 을 **조용히
 * 버린다.** 그래서 배포되는 `schemas/manifest.json` 만으로 재면 **아무 경로나 빈
 * `source_item_ids` 로 지나갔다** — 우리가 나눠 주는 계약 문서가 실제 계약보다 느슨했다.
 *
 * ⚠ **여기가 JSON Schema 를 손으로 짜는 유일한 자리다.** 「Zod 정본과 일치한다」를 재는
 *   `test/json-schema.test.ts` 는 이 자리에서 아무것도 못 재므로, **예외를 넣었다는 사실
 *   자체**를 `manifest-evidence.test.ts` 가 잠근다 (예외 목록이 표와 같은지까지).
 * ⚠ 대상을 이름이 아니라 **모양**으로 고른다 — `$defs` 로 접히면 이름이 `__schema7` 이다.
 */
function applyP7Rule(jsonSchema: Record<string, unknown>): void {
  const props = jsonSchema['properties']
  if (typeof props !== 'object' || props === null) return
  const p = props as Record<string, unknown>
  //  `ManifestFile` 만 이 셋을 같이 갖는다.
  if (!('source_item_ids' in p) || !('sha256' in p) || !('path' in p)) return
  jsonSchema['anyOf'] = [
    { properties: { source_item_ids: { minItems: 1 } } },
    { properties: { path: { enum: [...PRODUCT_TEXT_PACK_FILES] } } },
  ]
}

export function toJsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'input',
    // 겹치는 부분 스키마는 `$defs` 로 한 번만 적는다. 인라인이면 항목 10종이 유니온마다
    // 통째로 복사돼 파일이 100KB 를 넘고, 사람이 열어 볼 수 없게 된다.
    reused: 'ref',
    //  refine 이 버려지는 자리 하나를 되살린다 (위 주석).
    override: (ctx) => { applyP7Rule(ctx.jsonSchema as Record<string, unknown>) },
  }) as Record<string, unknown>
}

export function toJsonSchema(name: JsonSchemaName): Record<string, unknown> {
  return toJsonSchemaOf(JSON_SCHEMA_FILES[name])
}

export function toJsonSchemaText(name: JsonSchemaName): string {
  return `${JSON.stringify(toJsonSchema(name), null, 2)}\n`
}
