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

// ---------------------------------------------------------------------
//  읽는 쪽 — **쓰는 함수 바로 옆에 둔다**
//
//  ★ 왜 여기인가 — Pack Explorer(SPEC §9 화면 7)는 이 태그를 되읽어서 「이 줄은 어느
//    항목에서 왔나」를 보여 준다. 그게 P7 을 사람이 눈으로 확인하는 유일한 자리다.
//    파싱을 화면 쪽에 적으면 **형식이 두 곳에 살게 되고**, 태그를 한 글자 바꾸는 순간
//    역추적이 조용히 끊긴다 — 화면은 「해당 없음」을 태연히 표시한다.
//    같은 파일에 두면 `test/tag.test.ts` 가 쓰고 되읽어서 왕복을 잠글 수 있다.
//
//  ⚠ 컴파일러는 순수 함수다 (P4). 여기 있는 것은 정규식뿐이다 — 시각·난수·네트워크 없음.
// ---------------------------------------------------------------------

/**
 * 태그는 **줄 끝에 붙는다** (본문 뒤에 이어서). 그래서 줄 전체가 아니라 줄 **안에서** 찾는다.
 * ⚠ `<!-- ctx:roadmap -->` 처럼 `rev:`·`conf:`·`src:` 가 없는 절 표시는 태그가 아니다 —
 *   여기서 안 걸리는 것이 맞다. 걸리면 절 머리가 항목 하나로 보인다.
 * ⚠ `g` 플래그를 붙이지 마라 — `lastIndex` 가 남아서 두 번째 호출이 조용히 실패한다.
 */
const TRACE_TAG_RE = /<!--\s*ctx:(\S+)\s+rev:(\d+)\s+conf:(\S+)\s+src:(.*?)\s*-->/

export type TraceTag = {
  itemId: string
  revision: number
  confidence: string
  /** `srcTag` 가 만든 조각들. 화면은 이걸 그대로 보여 주고 항목 ID 로 원문을 찾는다. */
  src: string[]
}

/** 태그 한 줄 → 조각. 태그가 아니면 `null` (지어내지 않는다). */
export function parseTraceTag(line: string): TraceTag | null {
  const m = TRACE_TAG_RE.exec(line)
  if (!m) return null
  const [, itemId, revision, confidence, src] = m as unknown as [string, string, string, string, string]
  return {
    itemId,
    revision: Number(revision),
    confidence,
    //  `src:` 가 비어 있을 수 있다 (근거 0개인 항목). 그때 `['']` 이 되지 않게 거른다.
    src: src.length === 0 ? [] : src.split(','),
  }
}

/**
 * 절 머리(`## Goals`)·빈 줄·순수 주석 줄(`<!-- ctx:roadmap -->`)은 **항목의 몸이 아니다.**
 * 블록은 여기서 끊긴다.
 */
function isBlockBoundary(line: string): boolean {
  const t = line.trim()
  return t.length === 0 || t.startsWith('#') || (t.startsWith('<!--') && t.endsWith('-->'))
}

/**
 * 🔴 파일 본문 → **줄 번호마다 어느 항목에서 왔나** (P7 을 화면에서 재는 자리).
 *
 * ★ 태그는 항목 블록의 **마지막 줄 끝**에 붙는다 (`assemble.ts`). 한 항목이 여러 줄일 수
 *   있어서(로드맵의 `done_when` 줄 등) 태그 줄에서 **위로** 칠한다 —
 *   절 머리·빈 줄·순수 주석 줄에서 멈춘다.
 *   ⚠ 아래로 훑으면 블록의 첫 줄들이 **앞 항목**의 것으로 칠해진다. 그건 P7 이
 *     보장하는 것과 정반대다 — 화면이 남의 근거를 이 줄의 근거라고 말하게 된다.
 *
 * 반환은 **0-기반 줄 인덱스 → 태그**다. 머리말처럼 어느 항목에도 안 속한 줄은 키가 없다 —
 * 「근거 없는 줄」을 화면이 근거 있는 것처럼 그리지 않게.
 */
export function traceLines(content: string): Map<number, TraceTag> {
  const lines = content.split('\n')
  const byLine = new Map<number, TraceTag>()
  for (let i = 0; i < lines.length; i++) {
    const tag = parseTraceTag(lines[i] ?? '')
    if (!tag) continue
    byLine.set(i, tag)
    for (let j = i - 1; j >= 0 && !isBlockBoundary(lines[j] ?? ''); j--) {
      //  ⚠ 이미 칠해진 줄은 덮지 않는다 — 앞 항목의 태그 줄에 부딪히면 거기서 멈춘다.
      if (byLine.has(j)) break
      byLine.set(j, tag)
    }
  }
  return byLine
}
