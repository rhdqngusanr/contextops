import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BEFORE_AFTER, HOW_IT_WORKS, INSTALL_STEPS, LANDING_HEAD, TRUST_BOUNDARY,
} from '../src/components/landing'

// =====================================================================
//  🔴 README · KNOWN_LIMITATIONS 가 **랜딩·코드와 다른 말을 하지 않는가** (PLAN P6 둘째 행 · FINDINGS 122)
//
//  ★ 왜 시험인가 — README 는 심사위원이 제일 먼저 읽는 파일이고 랜딩은 두 번째다. 둘이 다른 문장을
//    말하면 어느 쪽이 거짓인지 읽는 사람이 판정해야 한다. 「한쪽을 정본으로 하고 다른 쪽은 그것을
//    읽게 하든지, 시험이 대조하게 해라」(docs/STATUS.md 65바퀴) — README 는 마크다운이라 표를 import
//    할 수 없으므로 **시험이 대조한다.** 정본은 `landing.tsx` 의 표다 (거기가 시드·픽스처와 대조된다).
//
//  재는 것:
//    ① README 의 문장이 랜딩 표와 글자 그대로 같다 — 헤드라인 · Before/After · 3단계 · 신뢰 경계 · 설치 4줄
//    ② README 가 가리키는 경로가 전부 실제로 있다 — 「저장소 지도」 표 · 마크다운 링크
//    ③ README 에 없는 명령(`npx contextops`)과 「실시간」이 없다 (랜딩과 같은 규칙)
//    ④ KNOWN_LIMITATIONS 가 단 `FINDINGS N` 은 전부 **대기**다 — 닫힌 것을 한계라고 적으면 거짓말이다
//    ⑤ KNOWN_LIMITATIONS 가 백틱으로 가리키는 파일이 전부 있다 — 없는 파일을 근거로 삼는 한계는 근거가 없다
//
//  ⚠ 이 시험이 재지 못하는 것: README 의 산문이 **맞는가**. 그건 사람이 읽는다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')

const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8')
const limits = readFileSync(join(repoRoot, 'docs', 'KNOWN_LIMITATIONS.md'), 'utf8')
const findings = readFileSync(join(repoRoot, 'docs', 'feedback', 'FINDINGS.md'), 'utf8')

/** 저장소 안 경로처럼 보이는 백틱 토큰만 고른다 — `POST /documents` 같은 것은 경로가 아니다. */
const REPO_DIRS = ['apps/', 'packages/', 'plugin/', 'fixtures/', 'tools/', 'docs/', 'loop/']
function repoPathsIn(text: string): string[] {
  return [...text.matchAll(/`([^`\n]+)`/g)]
    .map((m) => m[1] as string)
    .filter((t) => REPO_DIRS.some((d) => t.startsWith(d)) || t === 'CLAUDE.md' || t === 'LICENSE')
    .filter((t) => !t.includes('*') && !t.includes(' ') && !t.includes('…'))
}

/** FINDINGS 의 `### N.` 항목에서 첫 `- **상태**:` 값을 읽는다. 없으면 undefined. */
function findingStatus(n: string): string | undefined {
  const at = new RegExp(`^### ${n}\\. `, 'm').exec(findings)
  if (!at) return undefined
  const st = /^- \*\*상태\*\*: *(.+)$/m.exec(findings.slice(at.index))
  return st?.[1]?.trim()
}

describe('① README 는 랜딩과 같은 문장을 말한다', () => {
  it('헤드라인과 작은 줄', () => {
    expect(readme).toContain(LANDING_HEAD.title)
    expect(readme).toContain(LANDING_HEAD.note)
  })

  it('Before/After — 질문 · 두 답 · Pack 의 그 줄 · 역추적 id', () => {
    expect(readme).toContain(BEFORE_AFTER.prompt)
    for (const a of BEFORE_AFTER.before.answers) {
      expect(readme).toContain(a.text)
      expect(readme).toContain(a.source)
    }
    expect(readme).toContain(BEFORE_AFTER.after.text)
    expect(readme).toContain(`ctx:${BEFORE_AFTER.after.itemId}`)
    expect(readme).toContain(BEFORE_AFTER.before.foot)
    expect(readme).toContain(BEFORE_AFTER.after.foot)
  })

  it('「어떻게 동작하나」 3단계의 문장', () => {
    for (const s of HOW_IT_WORKS.steps) {
      expect(readme).toContain(s.head)
      expect(readme).toContain(s.body)
    }
  })

  it('신뢰 경계 — 아는 것·모르는 것 열이 전부 있다 (P1 의 넷을 README 도 다 말한다)', () => {
    for (const row of TRUST_BOUNDARY.knows.rows) expect(readme).toContain(row)
    for (const row of TRUST_BOUNDARY.unknown.rows) expect(readme).toContain(row)
  })

  it('설치 4줄이 같은 명령 · 같은 순서이고 마무리 문장도 같다', () => {
    let cursor = 0
    for (const l of INSTALL_STEPS.lines) {
      const at = readme.indexOf(l.cmd, cursor)
      expect(at, `README 에 없거나 순서가 다르다: ${l.cmd}`).toBeGreaterThanOrEqual(0)
      expect(readme.slice(at).split('\n')[0], `설명이 다르다: ${l.cmd}`).toContain(l.note)
      cursor = at + l.cmd.length
    }
    expect(readme).toContain(INSTALL_STEPS.foot)
  })
})

describe('② README 가 가리키는 경로가 전부 있다', () => {
  it('「저장소 지도」 표의 첫 칸', () => {
    //  「## 저장소 지도」 절만 본다 — CLI 표의 첫 칸(`scan` …)은 경로가 아니다.
    const start = readme.indexOf('\n## 저장소 지도')
    expect(start).toBeGreaterThan(0)
    const section = readme.slice(start + 1).split(/\n##? /)[0] as string
    const rows = section.split('\n').filter((l) => /^\| `[^`]+` \|/.test(l))
    expect(rows.length).toBeGreaterThan(20)
    for (const row of rows) {
      const p = /^\| `([^`]+)` \|/.exec(row)?.[1] as string
      expect(existsSync(join(repoRoot, p)), `README 저장소 지도: ${p}`).toBe(true)
    }
  })

  it('마크다운 링크의 상대 경로', () => {
    const links = [...readme.matchAll(/\]\(([^)]+)\)/g)]
      .map((m) => m[1] as string)
      .filter((h) => !h.startsWith('http') && !h.startsWith('#') && !h.startsWith('/'))
    expect(links.length).toBeGreaterThan(5)
    for (const h of links) expect(existsSync(join(repoRoot, h)), `README 링크: ${h}`).toBe(true)
  })

  it('본문의 백틱 경로', () => {
    const paths = repoPathsIn(readme)
    expect(paths.length).toBeGreaterThan(10)
    for (const p of paths) expect(existsSync(join(repoRoot, p)), `README: ${p}`).toBe(true)
  })
})

describe('③ README 에 없는 것을 적지 않는다', () => {
  it('npx contextops 는 npm 에 없다', () => {
    expect(readme).not.toContain('npx contextops')
  })

  it('「실시간」이라는 낱말이 없다 (SPEC §6 · KNOWN_LIMITATIONS)', () => {
    expect(readme).not.toContain('실시간')
  })

  it('「루프와 명세만 있다」는 옛 문장이 없다 — 제품 코드가 있다', () => {
    expect(readme).not.toContain('명세만')
  })
})

describe('④ KNOWN_LIMITATIONS 가 단 FINDINGS 번호는 전부 대기다', () => {
  it('닫힌 항목을 한계라고 적지 않는다', () => {
    const refs = [...new Set([...limits.matchAll(/FINDINGS (\d+)/g)].map((m) => m[1] as string))]
    expect(refs.length).toBeGreaterThan(0)
    for (const n of refs) {
      const st = findingStatus(n)
      expect(st, `FINDINGS ${n} 이 대장에 없거나 상태 줄이 없다`).toBeDefined()
      expect(st?.startsWith('대기'), `FINDINGS ${n} 은 이미 「${st}」— KNOWN_LIMITATIONS 의 그 줄을 지워라`).toBe(true)
    }
  })

  it('README 가 단 FINDINGS 번호도 같다', () => {
    const refs = [...new Set([...readme.matchAll(/FINDINGS(?:\.md`)? (\d+)/g)].map((m) => m[1] as string))]
    for (const n of refs) expect(findingStatus(n)?.startsWith('대기'), `README → FINDINGS ${n}`).toBe(true)
  })
})

describe('⑤ KNOWN_LIMITATIONS 가 가리키는 파일이 전부 있다', () => {
  it('백틱 경로', () => {
    const paths = repoPathsIn(limits)
    expect(paths.length).toBeGreaterThan(8)
    for (const p of paths) expect(existsSync(join(repoRoot, p)), `KNOWN_LIMITATIONS: ${p}`).toBe(true)
  })

  it('P1 근거 문서 §7 의 두 줄이 들어 있다 — 계약이 못 막는 body · 배포에서 찍은 것이 아니다', () => {
    expect(limits).toContain('계약은 못 막는다')
    expect(limits).toContain('배포에서 찍은 것이 아니다')
  })
})
