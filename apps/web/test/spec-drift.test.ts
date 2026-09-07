import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { ERROR_CODES } from '@contextops/schema'
import { SYNC_STATUSES } from '@contextops/schema'

// =====================================================================
//  🔴 `docs/SPEC.md` 가 **코드와 다른 말을 하고 있지 않은가**
//
//  ★ 왜 시험인가 — 대장(FINDINGS)에 「SPEC 을 코드에 맞춰라」가 **열두 번** 쌓였다
//    (2 · 3 · 4 · 10 · 11 · 14 · 17 · 21 · 22 · 23 · 27 · 32). 한 번은 실수지만
//    열둘은 **구조**다: SPEC 은 사람만 읽고, 코드는 기계만 읽어서 둘이 갈라져도
//    아무것도 빨개지지 않았다. CLAUDE.md 의 「같은 지적이 두 번 나오면 규칙이 아니라
//    게이트로 올려라」가 정확히 이 자리를 가리킨다.
//
//  🔴 **산문을 읽지 않는다.** 재는 것은 「기계가 셀 수 있는 주장」 다섯뿐이다 —
//     목록 · 트리의 경로 · 버전 숫자 · 절 참조 · 줄바꿈. 산문이 맞는지는 사람이 읽는다.
//     ⚠ 여기에 「문장이 이러이러해야 한다」를 더하지 마라. 그러면 문장을 고칠 때마다
//       빨개지고, 그러면 다음 사람이 게이트를 끈다.
//
//  재는 것:
//    ① §5 의 에러 코드 나열 = `ERROR_CODES` (**차례까지** — 값은 직렬화된다)
//    ② §2 의 `sync_reports.status` = `SYNC_STATUSES`
//    ③ §1.2 에 버전 **숫자**가 없다 · Node 는 `.nvmrc` 와 같다
//    ④ §1.1 트리가 가리키는 경로가 전부 실존한다
//    ⑤ SPEC 안의 `§N.M` 참조가 전부 실제 제목을 가리킨다 (FINDINGS 32 가 이 종류다)
//    ⑥ `.ps1` 이 전부 BOM + CRLF 다 (`.gitattributes` 가 그렇게 적는다 · FINDINGS 14)
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const spec = readFileSync(join(repoRoot, 'docs', 'SPEC.md'), 'utf8')

describe('① §5 의 에러 코드 나열이 ERROR_CODES 와 같다', () => {
  it('차례까지 같다', () => {
    const line = /^에러 코드: (.+)$/m.exec(spec)
    expect(line, 'SPEC §5 에 「에러 코드:」 줄이 없다').not.toBeNull()
    const listed = [...(line?.[1] ?? '').matchAll(/`([A-Z_]+)`/g)].map((m) => m[1])
    //  ⚠ 집합이 아니라 **배열**로 견준다 — 값은 직렬화되므로 차례가 바뀌면 그것도 고장이다.
    expect(listed).toEqual([...ERROR_CODES])
  })
})

describe('② §2 의 sync_reports 상태가 SYNC_STATUSES 와 같다', () => {
  it('차례까지 같다', () => {
    const row = /^sync_reports .*status enum\(([^)]*)\)/m.exec(spec)
    expect(row, 'SPEC §2 에 sync_reports 줄이 없다').not.toBeNull()
    const listed = [...(row?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(listed).toEqual([...SYNC_STATUSES])
  })
})

describe('③ §1.2 에 버전 숫자가 없다', () => {
  const nvmrc = readFileSync(join(repoRoot, '.nvmrc'), 'utf8').trim()
  //  §1.2 표만 잘라 본다 — 다른 절의 예시 숫자(`1.2.3` 등)까지 세면 게이트가 시끄러워진다.
  const section = spec.slice(spec.indexOf('### 1.2 '), spec.indexOf('## 2. '))

  it('Node 버전의 정본은 .nvmrc 이고 SPEC 이 그 값과 어긋나지 않는다', () => {
    expect(nvmrc).toMatch(/^\d+$/)
    //  숫자를 적더라도 `.nvmrc` 와 같아야 한다. 다른 Node 메이저가 적혀 있으면 FAIL 이다.
    const nodes = [...section.matchAll(/Node\s*(\d+)/g)].map((m) => m[1])
    for (const n of nodes) expect(n, `SPEC §1.2 의 Node ${n} 이 .nvmrc(${nvmrc}) 와 다르다`).toBe(nvmrc)
  })

  it('의존 버전을 §1.2 가 직접 고정하지 않는다 (정본은 catalog · packageManager)', () => {
    //  `typescript 5.9.3` · `vitest 4.1.11` 처럼 **이름 옆의 숫자**만 본다.
    const pinned = [...section.matchAll(/\b(TypeScript|typescript|vitest|pnpm|drizzle[\w-]*)\s*@?\^?(\d+\.\d+)/g)]
      .map((m) => `${m[1]} ${m[2]}`)
    expect(pinned, '§1.2 가 버전 숫자를 들고 있다 — catalog·packageManager 를 가리켜라').toEqual([])
  })
})

/** `a/{b,c}.ts` → `a/b.ts`, `a/c.ts` (여러 묶음도 푼다) */
function expandBraces(token: string): string[] {
  const m = /\{([^{}]*)\}/.exec(token)
  if (m === null) return [token]
  return m[1]!.split(',').flatMap((piece) =>
    expandBraces(token.slice(0, m.index) + piece.trim() + token.slice(m.index + m[0].length)))
}

describe('④ §1.1 트리가 가리키는 경로가 전부 실존한다', () => {
  it('없는 파일을 지도에 그리지 않는다', () => {
    const block = spec.slice(spec.indexOf('### 1.1 '), spec.indexOf('### 1.2 '))
    const lines = block.split('\n')
    //  ⚠ 트리는 **들여쓰기가 곧 경로**다. 한 칸은 4글자(`│   `·`├── `·`└── `·`    `)다.
    const stack: string[] = []
    const found: string[] = []

    for (const raw of lines) {
      const at = raw.search(/[├└]── /)
      if (at < 0) continue
      const depth = at / 4
      //  이름에서 주석(`# …`)과 꼬리 공백을 뗀다.
      const name = raw.slice(at + 4).split('#')[0]!.trim()
      if (name === '' || name.startsWith('…')) continue
      stack.length = depth
      const isDir = name.endsWith('/')
      const clean = isDir ? name.slice(0, -1) : name
      const full = [...stack, clean].join('/')
      if (isDir) stack[depth] = clean
      //  `…` 이 든 자리는 「여기 아래 더 있다」는 뜻이라 경로가 아니다.
      if (full.includes('…')) continue
      found.push(full)
    }

    expect(found.length, '§1.1 에서 경로를 하나도 못 읽었다 — 트리 모양이 바뀌었나').toBeGreaterThan(20)
    const missing = found
      .flatMap(expandBraces)
      .filter((p) => !existsSync(join(repoRoot, p)))
    expect(missing, '§1.1 이 없는 경로를 가리킨다').toEqual([])
  })
})

describe('⑤ SPEC 의 절 참조가 전부 실제 제목을 가리킨다', () => {
  it('없는 § 을 근거로 삼지 않는다', () => {
    //  실제로 있는 제목 번호를 모은다 (`## 6.` · `### 6.1 `).
    const headings = new Set(
      [...spec.matchAll(/^#{2,3} (\d+(?:\.\d+)?)[. ]/gm)].map((m) => m[1]!),
    )
    expect(headings.size, 'SPEC 에 번호 제목이 없다').toBeGreaterThan(10)

    //  `§6.5` 처럼 **하위 절까지 적은** 참조만 센다 — `§6` 은 위 집합에 `6` 으로 있다.
    const refs = [...spec.matchAll(/§(\d+(?:\.\d+)?)/g)].map((m) => m[1]!)
    const dangling = [...new Set(refs)].filter((r) => !headings.has(r))
    expect(dangling, '이 § 은 SPEC 에 제목이 없다').toEqual([])
  })
})

describe('⑥ .ps1 이 전부 BOM + CRLF 다', () => {
  //  ★ 왜 바이트로 세나 (FINDINGS 14) — `grep`·`file` 은 `\r` 을 삼켜서 거짓말을 한다.
  //    BOM 이 없으면 PS 5.1 이 ANSI 로 읽어 **한글 주석·문자열이 깨지고**, LF 로 두면
  //    `git add` 마다 경고가 떠서 **진짜 경고를 못 본다.**
  const files = ['tools/ci.ps1', 'tools/principles.ps1', 'tools/walkthrough.ps1',
    'loop/loop.ps1', 'loop/ctl.ps1', 'loop/common.ps1', 'loop/relay.ps1', 'loop/env.ps1']

  it.each(files)('%s', (rel) => {
    const buf = readFileSync(join(repoRoot, rel))
    expect(buf.length, `${rel} 이 없다`).toBeGreaterThan(0)
    expect([buf[0], buf[1], buf[2]], `${rel} 에 BOM 이 없다`).toEqual([0xef, 0xbb, 0xbf])
    let bareLf = 0
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0x0a && (i === 0 || buf[i - 1] !== 0x0d)) bareLf++
    }
    expect(bareLf, `${rel} 에 CRLF 아닌 줄이 ${bareLf}개 있다`).toBe(0)
  })
})
