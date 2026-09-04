import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compile } from '../src'
import type { CompileInput } from '../src'
import { parseTraceTag, traceLines, traceTag } from '../src/tag'

// =====================================================================
//  🔴 역추적 태그의 **왕복**을 잠근다 (P7 · SPEC §4.1 4단계)
//
//  ★ 왜 이 시험이 필요한가 — 태그를 **쓰는 쪽**(`traceTag`)은 이미 golden 이 잠근다.
//    이제 **읽는 쪽**(`parseTraceTag`·`traceLines`)이 생겼고, 그건 화면 7 이
//    「이 줄은 어느 항목에서 왔나」를 말하는 근거다. 둘이 갈라지면 화면은
//    **조용히 「해당 없음」을 표시한다** — 아무도 빨간 줄을 못 본다.
//    그래서 여기서 쓴 것을 그대로 되읽어 본다.
//
//  ⚠ 이 시험이 빨개졌다면 태그 형식을 바꾼 것이다. 형식을 바꾸면 이미 발행된 Pack 의
//    역추적이 끊긴다 — `TEMPLATE_VERSION` 을 올리고 이유를 커밋 메시지에 써라.
// =====================================================================

const HERE = dirname(fileURLToPath(import.meta.url))
const GOLDEN = join(HERE, 'golden')
const CASES = readdirSync(GOLDEN).filter((n) => statSync(join(GOLDEN, n)).isDirectory()).sort()

function readInput(name: string): CompileInput {
  return JSON.parse(readFileSync(join(GOLDEN, name, 'input.json'), 'utf8')) as CompileInput
}

describe('쓴 태그를 그대로 되읽는다', () => {
  it.each(CASES)('%s — 모든 항목의 태그가 왕복한다', (name) => {
    const input = readInput(name)
    for (const item of input.snapshot.items) {
      const parsed = parseTraceTag(traceTag(item))
      expect(parsed, `${item.id} 의 태그를 못 읽었다`).not.toBeNull()
      expect(parsed?.itemId).toBe(item.id)
      expect(parsed?.revision).toBe(item.revision)
      expect(parsed?.confidence).toBe(item.confidence)
      //  근거 개수가 그대로여야 한다 — 하나라도 잃으면 화면이 근거를 덜 보여 준다.
      expect(parsed?.src.length).toBe(item.source_refs.length)
    }
  })

  it('태그가 아닌 줄은 null 이다 — 절 표시(`<!-- ctx:roadmap -->`)도 아니다', () => {
    expect(parseTraceTag('## Goals')).toBeNull()
    expect(parseTraceTag('')).toBeNull()
    //  🔴 절 표시에 rev·conf·src 가 없다. 여기서 걸리면 절 머리가 항목 하나로 보인다.
    expect(parseTraceTag('<!-- ctx:roadmap -->')).toBeNull()
  })

  it('값을 바꾸면 읽은 값도 갈린다 — 표시용 상수가 아니다', () => {
    const base = readInput(CASES[0] as string).snapshot.items[0]
    if (!base) throw new Error('golden 첫 케이스에 항목이 없다')
    const flipped = { ...base, revision: base.revision + 1, confidence: 'low' as const }
    expect(parseTraceTag(traceTag(flipped))?.revision).toBe(base.revision + 1)
    expect(parseTraceTag(traceTag(flipped))?.confidence).toBe('low')
    expect(parseTraceTag(traceTag(base))?.confidence).not.toBe('low')
  })
})

describe('🔴 traceLines — 줄마다 어느 항목에서 왔나 (화면 7 이 P7 을 보이는 근거)', () => {
  it.each(CASES)('%s — 태그가 붙은 줄은 자기 항목으로 칠해진다', (name) => {
    const result = compile(readInput(name))
    for (const file of result.files) {
      const lines = file.text.split('\n')
      const painted = traceLines(file.text)
      for (let i = 0; i < lines.length; i++) {
        const tag = parseTraceTag(lines[i] as string)
        if (tag) expect(painted.get(i)?.itemId, `${file.path}:${i + 1}`).toBe(tag.itemId)
      }
    }
  })

  it.each(CASES)('%s — 절 머리·빈 줄은 칠해지지 않는다 (남의 근거를 붙이지 않는다)', (name) => {
    const result = compile(readInput(name))
    for (const file of result.files) {
      const lines = file.text.split('\n')
      const painted = traceLines(file.text)
      for (let i = 0; i < lines.length; i++) {
        const t = (lines[i] as string).trim()
        //  ⚠ 자기 자신이 태그 줄인 경우는 빼고 본다 (`<!-- ctx:… rev:… -->` 는 칠해진다).
        if (parseTraceTag(lines[i] as string)) continue
        if (t.length === 0 || /^#{1,2} /.test(t) || (t.startsWith('<!--') && t.endsWith('-->'))) {
          expect(painted.has(i), `${file.path}:${i + 1} 「${t}」 가 칠해졌다`).toBe(false)
        }
      }
    }
  })

  //  🔴 **`###` 는 절 머리가 아니라 항목이 낸 줄이다.** 예전엔 `startsWith('#')` 로
  //     한꺼번에 끊어서 `### payment — …`(architecture 의 제목 줄)이 **어느 항목에도
  //     안 속한 줄**로 남았다 — 화면 7 에서 그 줄만 근거가 사라진다.
  //  ⚠ 이 시험이 빨개지면 템플릿이 `###` 짜리 절 머리를 만들었다는 뜻이다.
  //     그때는 `isBlockBoundary` 의 규칙부터 고쳐라 (둘이 갈리면 조용히 어긋난다).
  //  ⚠ 케이스마다 나누지 마라 — `###` 을 한 줄도 안 내는 케이스가 있다
  //    (`case-3-overflow`). 그러면 그 케이스는 「아무것도 안 재고 초록」이 된다.
  it('`###` 줄은 반드시 어느 항목의 것으로 칠해진다', () => {
    let seen = 0
    for (const name of CASES) {
      for (const file of compile(readInput(name)).files) {
        const lines = file.text.split('\n')
        const painted = traceLines(file.text)
        for (let i = 0; i < lines.length; i++) {
          if (!(lines[i] as string).startsWith('### ')) continue
          seen++
          expect(painted.get(i)?.itemId, `${name}/${file.path}:${i + 1} 「${lines[i]}」`).toBeTruthy()
        }
      }
    }
    //  ⚠ 「`###` 이 한 줄도 없어서 초록」을 막는다 — 그건 재지 않은 것이다.
    expect(seen, '골든 어디에도 ### 줄이 없다 — 이 시험이 아무것도 안 쟀다').toBeGreaterThan(0)
  })

  it('여러 줄짜리 블록은 태그 줄 위까지 함께 칠해진다', () => {
    //  로드맵 항목이 두 줄이다: 제목 줄 + `done_when:` 줄(끝에 태그).
    const body = [
      '## Roadmap',
      '<!-- ctx:roadmap -->',
      '- **PL-M1 재시도 통일**',
      '  done_when: 백오프로 통일된다 <!-- ctx:item_road_m1 rev:2 conf:high src:manual:손으로 -->',
      '',
    ].join('\n')
    const painted = traceLines(body)
    expect(painted.get(3)?.itemId).toBe('item_road_m1')
    expect(painted.get(2)?.itemId).toBe('item_road_m1')
    //  절 표시와 절 머리는 아니다.
    expect(painted.has(1)).toBe(false)
    expect(painted.has(0)).toBe(false)
  })
})
