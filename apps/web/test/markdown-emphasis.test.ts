import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// =====================================================================
//  🔴 **굵게** 가 굵게 안 되고 별표가 그대로 보이는 자리를 잡는다
//
//  ★ 왜 시험인가 — 2026-09-07 GitHub 에서 README 를 눈으로 보다 찾았다. 랜딩·제출서와 같은 말을 하는지는
//    `readme.test.ts` 가 이미 재지만, **그 문장이 화면에 어떻게 그려지는지는 아무도 안 봤다.**
//    한국어는 조사가 괄호·따옴표·홑낫표 바로 뒤에 붙는다: `**…때(타임아웃)**와`. CommonMark 는 닫는 `**` 의
//    앞이 문장부호이고 뒤가 글자면 그것을 **닫는 자리로 안 쳐서**(right-flanking 규칙) 별표가 날것으로 남는다.
//    심사위원이 제일 먼저 읽는 파일에서 이게 세 군데 나왔다 — 사람 눈에만 맡기면 다음에 또 난다.
//
//  재는 것: 인라인 코드 밖의 `**` 를 CommonMark 대로 「열 수 있나 / 닫을 수 있나」 판정하고 스택으로 짝짓는다.
//          짝을 못 지은 것이 하나라도 있으면 그 별표는 **화면에 그대로 나온다.**
//  고치는 법: 조사를 떼지 말고 `<b>…</b>` 로 감싸라 (`**「먼저」**이고` → `<b>「먼저」</b>이고`).
//
//  ⚠ 이 시험이 재지 못하는 것: 굵게 한 것이 **굵을 만한가**. 그건 사람이 읽는다.
// =====================================================================

const repoRoot = join(fileURLToPath(new URL('..', import.meta.url)), '..', '..')

/**
 * 읽는 사람이 GitHub 에서 여는 문서.
 * ★ 문서를 하나 더하려면 여기 한 줄.
 * ⛔ 대장·기록(`docs/feedback/FINDINGS.md` · `docs/STATUS.md` · `docs/history/cycles.md`)은 뺐다 —
 *    루프가 매 바퀴 덧쓰는 작업 일지라, 잠그면 루프가 제 일지와 싸우느라 정작 할 일을 못 한다.
 */
const PUBLIC_DOCS = [
  'README.md',
  'CLAUDE.md',
  'docs/SPEC.md',
  'docs/SUBMISSION.md',
  'docs/KNOWN_LIMITATIONS.md',
  'docs/PLAN.md',
  'docs/DESIGN_BRIEF.md',
  'loop/README.md',
  'loop/PROMPT.md',
] as const

/** CommonMark 의 「문장부호」 — 유니코드 P 계열 + ASCII 기호 몇 개. */
const PUNCT = /[\p{P}$+<=>^`|~]/u
const isPunct = (c: string) => c !== '' && PUNCT.test(c)
const isSpace = (c: string) => c === '' || /\s/.test(c)

/** 인라인 코드 안은 세지 않는다. */
function codeMask(text: string): boolean[] {
  const mask = new Array<boolean>(text.length).fill(false)
  for (const m of text.matchAll(/`[^`]*`/g)) {
    for (let i = m.index; i < m.index + m[0].length; i += 1) mask[i] = true
  }
  return mask
}

/** 짝을 못 지은 `**` 의 위치. 이것이 화면에 별표로 남는다. */
function unmatched(paragraph: string): number[] {
  const mask = codeMask(paragraph)
  const stack: number[] = []
  const orphan: number[] = []
  for (let i = 0; i < paragraph.length - 1; ) {
    if (paragraph[i] !== '*' || paragraph[i + 1] !== '*' || mask[i]) { i += 1; continue }
    let j = i
    while (j < paragraph.length && paragraph[j] === '*') j += 1
    const prev = i > 0 ? (paragraph[i - 1] as string) : ''
    const next = j < paragraph.length ? (paragraph[j] as string) : ''
    const left = !isSpace(next) && (!isPunct(next) || isSpace(prev) || isPunct(prev))
    const right = !isSpace(prev) && (!isPunct(prev) || isSpace(next) || isPunct(next))
    if (right && stack.length > 0) stack.pop()
    else if (left) stack.push(i)
    else orphan.push(i)
    i = j
  }
  return [...orphan, ...stack]
}

/** 코드 담장 밖의 문단들 — 강조는 빈 줄을 못 넘는다. */
function paragraphs(text: string): { line: number; body: string }[] {
  const out: { line: number; body: string }[] = []
  let buf: string[] = []
  let start = 0
  let fenced = false
  const flush = () => { if (buf.length > 0) out.push({ line: start, body: buf.join('\n') }); buf = [] }
  text.split('\n').forEach((line, idx) => {
    if (line.trimStart().startsWith('```')) { flush(); fenced = !fenced; return }
    if (fenced) return
    if (line.trim() === '') { flush(); return }
    if (buf.length === 0) start = idx + 1
    buf.push(line)
  })
  flush()
  return out
}

describe.each(PUBLIC_DOCS)('%s — 별표가 화면에 그대로 나오지 않는다', (rel) => {
  it('짝을 못 지은 `**` 가 없다', () => {
    const text = readFileSync(join(repoRoot, rel), 'utf8')
    const bad: string[] = []
    for (const p of paragraphs(text)) {
      for (const pos of unmatched(p.body)) {
        const before = p.body.slice(0, pos)
        const line = p.line + (before.match(/\n/g)?.length ?? 0)
        const col = pos - (before.lastIndexOf('\n') + 1)
        const src = p.body.split('\n')[before.match(/\n/g)?.length ?? 0] as string
        bad.push(`${rel}:${line}  …${src.slice(Math.max(0, col - 34), col + 12)}…`)
      }
    }
    expect(bad, `굵게가 안 닫힌다 — 조사를 떼지 말고 <b>…</b> 로 감싸라:\n${bad.join('\n')}`).toEqual([])
  })
})

describe('시험 자체가 이 규칙을 제대로 재는가', () => {
  //  ★ 왜 — 「검사가 아무것도 안 잡는데 초록」이 이 저장소의 단골 고장이다. 실제로 깨진 문장을 넣어 본다.
  it('깨진 것을 잡는다 — 조사가 괄호·따옴표·홑낫표 뒤에 바로 붙은 자리', () => {
    expect(unmatched('경우는 **안 올 때(타임아웃)**와 끝')).not.toEqual([])
    expect(unmatched('**"지켜야 할 것"**을 뽑는다')).not.toEqual([])
    expect(unmatched('`priority` 는 **「먼저」**이고')).not.toEqual([])
  })

  it('멀쩡한 것은 안 잡는다 — 뒤가 공백·문장부호이거나 `<b>` 로 감쌌을 때', () => {
    expect(unmatched('경우는 **안 올 때(타임아웃)** 둘뿐이다')).toEqual([])
    expect(unmatched('경우는 <b>안 올 때(타임아웃)</b>와 끝')).toEqual([])
    expect(unmatched('**`docs/PLAN.md`** — Phase 체크리스트')).toEqual([])
    expect(unmatched('여기 **굵게**이고 조사가 붙어도 앞이 글자면 된다')).toEqual([])
    expect(unmatched('코드 안의 `**별표**` 는 세지 않는다')).toEqual([])
  })
})
