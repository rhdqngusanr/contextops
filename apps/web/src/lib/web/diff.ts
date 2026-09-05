// =====================================================================
//  줄 단위 diff — 화면 6 의 before/after (DESIGN_BRIEF §4 「화면 6」)
//
//  ★ 왜 손으로 만드나 — 붙일 만한 라이브러리는 전부 렌더까지 같이 들고 온다.
//    여기서 필요한 것은 **줄의 목록** 하나이고, 색·기호는 화면이 정한다
//    (`components/proposals.tsx`). 그래야 시험이 마크업 없이 이 함수만 잰다.
//
//  🔴 **순수 함수다.** 시각·난수·네트워크가 없다 — 같은 두 문자열은 언제나 같은 줄
//     목록을 낸다. 화면이 「지금 무엇이 달라지나」를 말하는 자리라 그 말이 열 때마다
//     달라지면 안 된다.
//
//  ⚠ 이 파일은 **화면의 것**이다. Pack 의 diff(화면 7 의 「이전 버전과 diff」)와 섞지
//    마라 — 그건 파일 본문이고 서버가 낸 것을 그대로 그린다.
// =====================================================================

/** 한 줄이 어느 쪽 것인가. `same` 은 양쪽에 다 있는 줄이다. */
export type DiffMark = 'same' | 'add' | 'del'

export interface DiffLine {
  readonly mark: DiffMark
  readonly text: string
  /** before 쪽 줄 번호 (1부터). 추가된 줄에는 없다. */
  readonly beforeNo: number | null
  /** after 쪽 줄 번호 (1부터). 지워진 줄에는 없다. */
  readonly afterNo: number | null
}

/**
 * 빈 본문은 **0줄**이다.
 * ⚠ `''.split('\n')` 은 `['']` 이라 그냥 쓰면 「빈 줄 하나가 지워졌다」가 된다 —
 *   항목을 새로 만드는 제안(`add`)이 늘 「1줄 삭제」로 보이게 된다.
 */
function linesOf(text: string): string[] {
  return text === '' ? [] : text.split('\n')
}

/**
 * 두 본문의 **공통 줄 표**(LCS 길이). `[i][j]` = `a[i…]` 와 `b[j…]` 의 공통 줄 수.
 * ★ 왜 LCS 인가 — 앞에서부터 짝 맞추기만 하면 줄 하나가 끼었을 때 **그 아래가 전부
 *   달라진 것으로** 보인다. 사람은 그 diff 를 믿지 않는다.
 * ⚠ 본문 상한이 2000자(`ItemBase.body`)라 n·m 이 작다 — 여기서 더 영리해질 이유가 없다.
 */
function lcsTable(a: readonly string[], b: readonly string[]): Int32Array[] {
  const table: Int32Array[] = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] = a[i] === b[j]
        ? table[i + 1]![j + 1]! + 1
        : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
    }
  }
  return table
}

/**
 * before → after 의 줄 목록.
 * ⚠ 같은 자리에서 삭제와 추가가 같이 나면 **삭제를 먼저** 낸다 — 사람이 위에서
 *   아래로 「무엇이 빠지고 무엇이 들어왔나」로 읽는 순서다.
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = linesOf(before)
  const b = linesOf(after)
  const table = lcsTable(a, b)

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ mark: 'same', text: a[i]!, beforeNo: i + 1, afterNo: j + 1 })
      i += 1
      j += 1
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      out.push({ mark: 'del', text: a[i]!, beforeNo: i + 1, afterNo: null })
      i += 1
    } else {
      out.push({ mark: 'add', text: b[j]!, beforeNo: null, afterNo: j + 1 })
      j += 1
    }
  }
  for (; i < a.length; i += 1) out.push({ mark: 'del', text: a[i]!, beforeNo: i + 1, afterNo: null })
  for (; j < b.length; j += 1) out.push({ mark: 'add', text: b[j]!, beforeNo: null, afterNo: j + 1 })
  return out
}

/** 「+3 −1」을 그릴 수 있게 센다. 바뀐 것이 없으면 둘 다 0 이다. */
export function diffCounts(lines: readonly DiffLine[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const line of lines) {
    if (line.mark === 'add') added += 1
    if (line.mark === 'del') removed += 1
  }
  return { added, removed }
}
