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

/**
 * 태그 안에 넣기 전에 **주석을 닫는 문자열 · 주석을 여는 문자열 · 줄바꿈 · 조각 구분자**를 없앤다 —
 * 태그가 깨지면 역추적이 끊긴다 (INBOX G14 · `test/escape.test.ts` 「경로·근거의 escape」).
 * ★ `,` 는 `%2C` 로 — 근거 조각을 `,` 로 잇기 때문에(`traceTag`) 경로·메모 안의 쉼표 하나가 조각 수를
 *   늘려 `parseTraceTag` 가 근거를 하나 더 읽었다. URL 식으로 적으면 사람이 읽을 수 있고 되돌릴 수 있다.
 * ⚠ 경로도 지난다 — `RepoPath` 계약은 절대경로·`..`·NUL 만 막고 `-->`·`,`·`"` 는 통과시킨다.
 */
function safe(value: string, max: number): string {
  return inline(value).replace(/--+>/g, '').replace(/<!--/g, '').replace(/,/g, '%2C').slice(0, max)
}

/**
 * 🔴 **근거 4종의 태그 표.** 종류마다 **다른 접두사와 다른 몸**이 나온다 — 그래서 4종이
 * 전부 실제로 뭔가를 바꾼다 (`test/liveness.test.ts` 가 잠근다).
 *
 * ★ 새 근거 종류를 더하는 절차: `packages/schema` 의 `SOURCE_REF` 표에 한 줄 → 여기 한 줄.
 *   ①만 하면 여기서 타입 검사가 막힌다.
 *
 * ★ **왜 접두사를 칸으로 뺐나** — 되읽는 쪽(`srcKindOf`)이 「이 조각은 몇 번째 종류인가」를
 *   알아야 하는데, 접두사를 렌더 문자열 안에만 두면 되읽는 쪽이 `'doc'`·`'repo'` 를
 *   **다시 적게 된다.** 두 곳에 적힌 접두사는 한쪽만 고쳐지고, 그러면 역추적이 조용히
 *   끊긴다 (태그는 멀쩡한데 아무도 그 종류를 못 알아본다).
 * ⚠ 접두사에 `:` 를 넣지 마라 — 첫 `:` 까지가 접두사라는 것이 되읽는 쪽의 규칙이다.
 */
export const SRC_TAG = {
  source_document: { prefix: 'doc', body: (r) => `${r.document_version_id}#${r.start_char}-${r.end_char}` },
  repository_path: {
    prefix: 'repo',
    body: (r) => {
      const lines = r.start_line === undefined ? '' : `:${r.start_line}${r.end_line === undefined ? '' : `-${r.end_line}`}`
      //  ⚠ 경로도 `safe` 를 지난다 — `src/a,b/x.ts` · `docs/-->/` 같은 경로가 태그를 깨뜨렸다 (INBOX G14).
      return `${safe(r.repo, 60)}:${safe(r.path, 400)}${lines}`
    },
  },
  proposal: { prefix: 'proposal', body: (r) => r.proposal_id },
  manual: { prefix: 'manual', body: (r) => safe(r.note, 60) },
} as const satisfies {
  [K in SourceRefKind]: { prefix: string; body: (ref: Extract<SourceRef, { kind: K }>) => string }
}

export function srcTag(ref: SourceRef): string {
  // 표를 `ref.kind` 로만 찾기 때문에 이 캐스트는 안전하다.
  const spec = SRC_TAG[ref.kind] as { prefix: string; body: (r: SourceRef) => string }
  return `${spec.prefix}:${spec.body(ref)}`
}

/** 접두사 → 근거 종류. **위 표에서 뒤집어 만든다** — 손으로 적으면 갈라진다. */
const KIND_BY_PREFIX = new Map<string, SourceRefKind>(
  (Object.keys(SRC_TAG) as SourceRefKind[]).map((k) => [SRC_TAG[k].prefix, k]),
)

/**
 * 태그 조각(`doc:…` · `repo:…`) 하나 → 그것을 만든 근거 종류. 모르는 접두사면 `null`.
 *
 * ★ 왜 필요한가 — 「데모 Pack 이 근거 4종 중 몇 갈래를 보여 주나」를 세는 자리가
 *   접두사를 자기가 적으면, 그 검사는 픽스처가 아니라 자기 자신을 재게 된다
 *   (docs/feedback/FINDINGS.md 93). 여기 하나에서 답한다.
 */
export function srcKindOf(fragment: string): SourceRefKind | null {
  const at = fragment.indexOf(':')
  if (at < 0) return null
  return KIND_BY_PREFIX.get(fragment.slice(0, at)) ?? null
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
 * 절 머리(`# 아키텍처`·`## Goals`)·빈 줄·순수 주석 줄(`<!-- ctx:roadmap -->`)은
 * **항목의 몸이 아니다.** 블록은 여기서 끊긴다.
 *
 * 🔴 **`###` 부터는 절 머리가 아니라 항목이 낸 줄이다.** 절 머리를 내는 자리는
 *   `templates/index.ts` 하나뿐이고 거기 값은 전부 `#`·`##` 다 (`head` · `slot.heading`).
 *   `###` 는 항목 렌더러만 낸다 — `architecture`/`adr_full` 의 `### {title}` 과
 *   `domain` 의 `### 용어`·`### 불변식` (`sections.ts`).
 *   예전엔 `startsWith('#')` 로 셋을 한꺼번에 끊어서, **항목이 낸 제목 줄이
 *   「어느 항목에도 안 속한 줄」로 칠해졌다** — 화면 7 에서 그 줄만 근거가 사라진다.
 * ⚠ 템플릿에 `###` 짜리 절 머리를 만들지 마라. 만들려면 이 규칙부터 고쳐라
 *   (`test/tag.test.ts` 의 「`###` 줄은 반드시 칠해진다」가 잡는다).
 */
function isBlockBoundary(line: string): boolean {
  const t = line.trim()
  return t.length === 0 || /^#{1,2} /.test(t) || (t.startsWith('<!--') && t.endsWith('-->'))
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
