//  ⚠ `@contextops/compiler` 가 아니라 `/tag` 다 — index 는 node:crypto 를 재수출해서 브라우저 번들에 못 들어간다.
import { traceLines, type TraceTag } from '@contextops/compiler/tag'

// =====================================================================
//  Pack 파일 → **블록** (2026-09-11 · 사용자: 「여기 md 문서로 제대로 볼 수 있게 하는 건 어려울까?」)
//
//  ★ 왜 — 화면 7 은 소스 그대로 줄 번호를 달아 보여 줬다. P7(역추적)을 눈으로 재는 자리라서였지만, 심사위원에게는
//    `<!-- ctx:… -->` 꼬리표와 `**` 가 그대로 보이는 글자 벽이었다. 그래서 **문서로 렌더하되 항목 단위로 누른다**:
//    같은 꼬리표를 가진 줄들(`traceLines` 가 칠한 것)이 한 블록이고, 블록을 누르면 그 꼬리표의 항목이 오른쪽에 뜬다.
//    꼬리표 자체는 렌더에서 빼고(HTML 주석) 블록 끝에 작은 칩으로 다시 단다 — 역추적은 여전히 눈에 보인다.
//  🔴 줄 → 항목의 정본은 그대로 `traceLines` 다. 여기는 그 표를 **묶기만** 한다 — 어느 줄이 어느 항목인지 다시 정하지 않는다.
//  ⚠ 어느 항목에도 안 속한 줄(절 머리 · 머리말)은 `tag: null` 블록이다 — 누를 수 없고, 그렇다고 감추지도 않는다.
// =====================================================================

export interface PackBlock {
  /** 0-기반 첫 줄. */
  readonly start: number
  /** 0-기반 마지막 줄(포함) — 항목 블록이면 꼬리표가 있는 줄이다. 화면이 「고른 줄」로 쓴다. */
  readonly end: number
  readonly tag: TraceTag | null
  /** 렌더할 마크다운 — HTML 주석(꼬리표 포함)은 뺐다. */
  readonly text: string
}

/** HTML 주석을 뺀다 — 꼬리표는 렌더 밖에서 칩으로 그린다. */
export function stripComments(text: string): string {
  return text.replace(/\s*<!--[\s\S]*?-->/g, '')
}

export function packBlocks(content: string): PackBlock[] {
  const lines = content.split('\n')
  const trace = traceLines(content)
  const out: PackBlock[] = []
  let start = 0
  let current: TraceTag | null = trace.get(0) ?? null
  const flush = (end: number): void => {
    const text = lines.slice(start, end + 1).map((l) => stripComments(l).replace(/\s+$/, '')).join('\n').trim()
    if (text !== '') out.push({ start, end, tag: current, text })
  }
  for (let i = 1; i <= lines.length; i += 1) {
    const tag = i < lines.length ? (trace.get(i) ?? null) : null
    const boundary = i === lines.length
      //  꼬리표가 바뀌면 블록이 끝난다. 항목 블록끼리는 꼬리표 **객체**가 다르다 (`traceLines` 가 같은 객체를 칠한다).
      || tag !== current
      //  안 속한 줄들 사이의 빈 줄도 블록을 끊는다 — 절 머리마다 한 블록.
      || (current === null && (lines[i] ?? '').trim() === '')
    if (boundary) {
      flush(i - 1)
      start = i
      current = tag
    }
  }
  return out
}
