import type { ContextItem, SourceRef, SourceRefKind } from '@contextops/schema'
import { inline } from './text'

// =====================================================================
//  🔴 **역추적 태그 (P7).** Pack 의 모든 항목 블록은 마지막 줄에 이 태그를 달고,
//     태그 하나로 항목 ID → 원문까지 되짚을 수 있어야 한다. 정본은 docs/SPEC.md §4.1 4단계.
//
//     <!-- ctx:item_pl_retry rev:6 conf:high src:doc:{uuid}#1840-1961,repo:paylab-api:src/billing/fee.ts:14-30 -->
//
//  ⚠ 태그가 없는 줄이 Pack 에 하나라도 있으면 「환각 차단」 주장이 무너진다.
//    그걸 재는 것은 `test/traceability.test.ts` 다.
// =====================================================================

/** 태그 안에 넣기 전에 주석을 닫는 문자열과 줄바꿈을 없앤다 — 태그가 깨지면 역추적이 끊긴다. */
function safe(value: string, max: number): string {
  return inline(value).replace(/--+>/g, '').replace(/<!--/g, '').slice(0, max)
}

/**
 * 🔴 **근거 4종의 태그 표.** 종류마다 **다른 문자열**이 나온다 — 그래서 4종이
 * 전부 실제로 뭔가를 바꾼다 (`test/liveness.test.ts` 가 잠근다).
 *
 * ★ 새 근거 종류를 더하는 절차: `packages/schema` 의 `SOURCE_REF` 표에 한 줄 → 여기 한 줄.
 *   ①만 하면 여기서 타입 검사가 막힌다.
 */
export const SRC_TAG = {
  source_document: (r) => `doc:${r.document_version_id}#${r.start_char}-${r.end_char}`,
  repository_path: (r) => {
    const lines = r.start_line === undefined ? '' : `:${r.start_line}${r.end_line === undefined ? '' : `-${r.end_line}`}`
    return `repo:${safe(r.repo, 60)}:${r.path}${lines}`
  },
  proposal: (r) => `proposal:${r.proposal_id}`,
  manual: (r) => `manual:${safe(r.note, 60)}`,
} as const satisfies { [K in SourceRefKind]: (ref: Extract<SourceRef, { kind: K }>) => string }

export function srcTag(ref: SourceRef): string {
  // 표를 `ref.kind` 로만 찾기 때문에 이 캐스트는 안전하다.
  const render = SRC_TAG[ref.kind] as (r: SourceRef) => string
  return render(ref)
}

/**
 * 항목 하나의 역추적 태그.
 * ⚠ `conf:` 는 SPEC §4.1 의 예시에 없다 — **3단계가 전부 출력을 바꾸게** 하려고 넣었다.
 *   low 일 때만 적으면 high 와 medium 이 구별되지 않고, 그러면 값 하나가 죽는다
 *   (loop/PROMPT.md ④2-B). 차이는 docs/feedback/FINDINGS.md 에 적었다.
 */
export function traceTag(item: ContextItem): string {
  const src = item.source_refs.map(srcTag).join(',')
  return `<!-- ctx:${item.id} rev:${item.revision} conf:${item.confidence} src:${src} -->`
}
