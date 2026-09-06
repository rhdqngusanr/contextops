import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BEFORE_AFTER, HOW_IT_WORKS, INSTALL_STEPS, LANDING_FOOT, LANDING_HEAD, SUBMISSION_IDENTITY, TRUST_BOUNDARY,
} from '../src/components/landing'

// =====================================================================
//  🔴 README · SUBMISSION · KNOWN_LIMITATIONS 가 **랜딩·코드와 다른 말을 하지 않는가**
//     (PLAN P6 둘째 행 · FINDINGS 122 · 126)
//
//  ★ 왜 시험인가 — README 는 심사위원이 제일 먼저 읽는 파일이고 랜딩은 두 번째, 제출서는 심사 양식에
//    그대로 옮겨지는 원문이다. 셋이 다른 문장을 말하면 어느 쪽이 거짓인지 읽는 사람이 판정해야 한다.
//    「한쪽을 정본으로 하고 다른 쪽은 그것을 읽게 하든지, 시험이 대조하게 해라」(docs/STATUS.md 65바퀴) —
//    마크다운은 표를 import 할 수 없으므로 **시험이 대조한다.** 정본은 `landing.tsx` 의 표다
//    (거기가 시드·픽스처와 대조된다). P1~P7 의 문장은 README 가 정본이고 제출서는 그것과 글자 그대로 같다.
//
//  재는 것:
//    ① README·제출서의 문장이 랜딩 표와 글자 그대로 같다 — 헤드라인 · Before/After · 3단계 · 신뢰 경계 · 설치 4줄
//    ② README·제출서가 가리키는 경로가 전부 실제로 있다 — 「저장소 지도」 표 · 마크다운 링크 · 백틱 경로
//    ③ README·제출서에 없는 명령(`npx contextops`)과 「실시간」이 없다 (랜딩과 같은 규칙)
//    ④ KNOWN_LIMITATIONS·README·제출서가 단 `FINDINGS N` 은 전부 **대기**다 — 닫힌 것을 한계라고 적으면 거짓말이다
//    ⑤ KNOWN_LIMITATIONS 가 백틱으로 가리키는 파일이 전부 있다 — 없는 파일을 근거로 삼는 한계는 근거가 없다
//    ⑥ 제출서 — P1~P7 의 문장이 README 와 같다 · Skill·훅 수가 플러그인 디렉터리와 같다 · 없는 기능(질의)을
//       있는 것처럼 적지 않는다 · 🙋 자리가 있다 · 한계는 KNOWN_LIMITATIONS 를 가리킨다
//
//  ⚠ 이 시험이 재지 못하는 것: 산문이 **맞는가**. 그건 사람이 읽는다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const docsRoot = join(repoRoot, 'docs')
const pluginRoot = join(repoRoot, 'plugin', 'contextops')

const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8')
const submission = readFileSync(join(docsRoot, 'SUBMISSION.md'), 'utf8')
const limits = readFileSync(join(docsRoot, 'KNOWN_LIMITATIONS.md'), 'utf8')
const findings = readFileSync(join(docsRoot, 'feedback', 'FINDINGS.md'), 'utf8')

/**
 * 랜딩과 같은 문장을 말해야 하는 문서 둘. 링크의 상대 경로는 그 문서가 있는 디렉터리 기준이다.
 * ★ 문서를 하나 더하면 여기 한 줄 — ①②③④ 가 전부 따라온다.
 */
const DOCS = [
  { name: 'README', text: readme, dir: repoRoot },
  { name: 'SUBMISSION', text: submission, dir: docsRoot },
] as const

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

describe.each(DOCS)('① $name 은 랜딩과 같은 문장을 말한다', ({ name, text }) => {
  it('헤드라인과 작은 줄', () => {
    expect(text).toContain(LANDING_HEAD.title)
    expect(text).toContain(LANDING_HEAD.note)
  })

  it('Before/After — 질문 · 두 답 · Pack 의 그 줄 · 역추적 id', () => {
    expect(text).toContain(BEFORE_AFTER.prompt)
    for (const a of BEFORE_AFTER.before.answers) {
      expect(text).toContain(a.text)
      expect(text).toContain(a.source)
    }
    expect(text).toContain(BEFORE_AFTER.after.text)
    expect(text).toContain(`ctx:${BEFORE_AFTER.after.itemId}`)
    expect(text).toContain(BEFORE_AFTER.before.foot)
    expect(text).toContain(BEFORE_AFTER.after.foot)
  })

  it('「어떻게 동작하나」 3단계의 문장', () => {
    for (const s of HOW_IT_WORKS.steps) {
      expect(text).toContain(s.head)
      expect(text).toContain(s.body)
    }
  })

  it('신뢰 경계 — 아는 것·모르는 것 열이 전부 있다 (P1 의 넷을 문서도 다 말한다)', () => {
    for (const row of TRUST_BOUNDARY.knows.rows) expect(text).toContain(row)
    for (const row of TRUST_BOUNDARY.unknown.rows) expect(text).toContain(row)
  })

  it('설치 4줄이 같은 명령 · 같은 순서이고 마무리 문장도 같다', () => {
    let cursor = 0
    for (const l of INSTALL_STEPS.lines) {
      const at = text.indexOf(l.cmd, cursor)
      expect(at, `${name} 에 없거나 순서가 다르다: ${l.cmd}`).toBeGreaterThanOrEqual(0)
      expect(text.slice(at).split('\n')[0], `설명이 다르다: ${l.cmd}`).toContain(l.note)
      cursor = at + l.cmd.length
    }
    expect(text).toContain(INSTALL_STEPS.foot)
  })
})

describe('①-B 제출 정체(팀명 · 공개 저장소 URL)는 정본 하나에서 온다 (INBOX 2026-09-06 · FINDINGS 122)', () => {
  //  ★ 왜 — 값이 README·랜딩·제출서 세 곳에 든다. 마크다운은 상수를 import 못 하므로 시험이 대조한다.
  //    한 곳에서만 고치면 나머지 둘이 여기서 빨개진다.
  it.each(DOCS)('$name 머리에 팀명과 저장소 URL 이 글자 그대로 있다', ({ text }) => {
    expect(text).toContain(SUBMISSION_IDENTITY.team)
    expect(text).toContain(SUBMISSION_IDENTITY.repoUrl)
  })

  it('랜딩 푸터의 셋(팀명 · GitHub · Known limitations)이 그 정본을 읽는다', () => {
    expect(LANDING_FOOT.team.name).toBe(SUBMISSION_IDENTITY.team)
    expect(LANDING_FOOT.github.href).toBe(SUBMISSION_IDENTITY.repoUrl)
    expect(LANDING_FOOT.limits.href).toBe(`${SUBMISSION_IDENTITY.repoUrl}/blob/main/${SUBMISSION_IDENTITY.limitsPath}`)
    expect(existsSync(join(repoRoot, SUBMISSION_IDENTITY.limitsPath))).toBe(true)
  })

  it('팀명은 사람이 적어 준 그대로다 — 앞뒤·중간에 공백을 넣거나 빼지 않았다', () => {
    expect(SUBMISSION_IDENTITY.team).toBe(SUBMISSION_IDENTITY.team.trim())
    expect(SUBMISSION_IDENTITY.team).not.toMatch(/\s/)
  })

  it('저장소 URL 은 이 저장소의 origin 과 같다 — 다른 저장소를 가리키면 심사위원이 다른 코드를 본다', () => {
    const gitConfig = readFileSync(join(repoRoot, '.git', 'config'), 'utf8')
    expect(gitConfig).toContain(`url = ${SUBMISSION_IDENTITY.repoUrl}`)
  })

  it.each(DOCS)('$name 이 「공개 저장소 URL … 아직 없습니다」라고 더는 말하지 않는다', ({ text }) => {
    expect(text).not.toMatch(/저장소 URL[^\n]*아직 없/)
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

  it.each(DOCS)('$name 의 마크다운 링크의 상대 경로 (그 문서의 디렉터리 기준)', ({ name, text, dir }) => {
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)]
      .map((m) => m[1] as string)
      .filter((h) => !h.startsWith('http') && !h.startsWith('#') && !h.startsWith('/'))
    expect(links.length).toBeGreaterThan(5)
    for (const h of links) expect(existsSync(join(dir, h)), `${name} 링크: ${h}`).toBe(true)
  })

  it.each(DOCS)('$name 본문의 백틱 경로 (저장소 루트 기준)', ({ name, text }) => {
    const paths = repoPathsIn(text)
    expect(paths.length).toBeGreaterThan(10)
    for (const p of paths) expect(existsSync(join(repoRoot, p)), `${name}: ${p}`).toBe(true)
  })
})

describe.each(DOCS)('③ $name 에 없는 것을 적지 않는다', ({ text }) => {
  it('npx contextops 는 npm 에 없다', () => {
    expect(text).not.toContain('npx contextops')
  })

  it('「실시간」이라는 낱말이 없다 (SPEC §6 · KNOWN_LIMITATIONS)', () => {
    expect(text).not.toContain('실시간')
  })

  it('「루프와 명세만 있다」는 옛 문장이 없다 — 제품 코드가 있다', () => {
    expect(text).not.toContain('명세만')
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

  it.each(DOCS)('$name 이 단 FINDINGS 번호도 같다', ({ name, text }) => {
    const refs = [...new Set([...text.matchAll(/FINDINGS(?:\.md`)? (\d+)/g)].map((m) => m[1] as string))]
    for (const n of refs) expect(findingStatus(n)?.startsWith('대기'), `${name} → FINDINGS ${n}`).toBe(true)
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

describe('⑥ 제출서(docs/SUBMISSION.md) — README·코드와 같은 말을 한다 (FINDINGS 126)', () => {
  /** `| **P1** | 원칙 | 무엇이 잰다 |` 행을 번호 → 행 전체로. */
  function principleRows(text: string): Map<string, string> {
    const rows = new Map<string, string>()
    for (const m of text.matchAll(/^\| \*\*(P[1-7])\*\* \|.*$/gm)) rows.set(m[1] as string, m[0])
    return rows
  }

  it('P1~P7 의 행이 README 와 글자 그대로 같다 — 일곱 다', () => {
    const fromReadme = principleRows(readme)
    const fromSubmission = principleRows(submission)
    expect([...fromReadme.keys()]).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'])
    expect([...fromSubmission.keys()]).toEqual([...fromReadme.keys()])
    for (const [p, row] of fromReadme) expect(fromSubmission.get(p), `${p} 행이 README 와 다르다`).toBe(row)
  })

  it('Skill · 훅 수가 플러그인 디렉터리 · hooks.json 과 같다', () => {
    const skills = readdirSync(join(pluginRoot, 'skills')).filter((n) =>
      existsSync(join(pluginRoot, 'skills', n, 'SKILL.md')))
    const hooks = JSON.parse(readFileSync(join(pluginRoot, 'hooks', 'hooks.json'), 'utf8')) as { hooks: Record<string, unknown> }
    const events = Object.keys(hooks.hooks)
    expect(submission).toContain(`Skill ${skills.length}(`)
    expect(submission).toContain(`훅 ${events.length}(`)
    for (const n of skills) expect(submission).toContain(n)
    for (const e of events) expect(submission).toContain(`\`${e}\``)
  })

  it('없는 기능(질의 · §7.3)을 있는 것처럼 적지 않는다 — 「질의」가 든 줄은 전부 「없다」를 말한다', () => {
    const lines = submission.split('\n').filter((l) => l.includes('질의'))
    expect(lines.length).toBeGreaterThan(0)
    for (const l of lines) expect(l, `있는 기능처럼 읽힌다: ${l}`).toMatch(/없/)
  })

  it('AI 활용은 셋만 번호를 단다 — (4) 는 없다', () => {
    const start = submission.indexOf('\n## AI 활용')
    expect(start).toBeGreaterThan(0)
    const section = submission.slice(start + 1).split(/\n## /)[0] as string
    expect(section.match(/^\d\. \*\*/gm)?.length).toBe(3)
  })

  /** `| 항목 | 값 | … |` 표의 한 행. */
  function identityRow(k: string): string {
    const row = submission.split('\n').find((l) => l.startsWith(`| ${k} |`))
    expect(row, `🙋 표에 ${k} 행이 없다`).toBeDefined()
    return row as string
  }

  it('아직 없는 값(production URL · 영상 · 슬라이드)은 🙋 자리표시자 그대로다 — 없는 것을 있는 것처럼 적지 않는다', () => {
    for (const k of ['production URL', '2분 영상 링크', '슬라이드 링크']) {
      expect(identityRow(k)).toContain('| 🙋')
    }
  })

  it('생긴 값(제출 팀명 · 공개 저장소 URL)은 정본 SUBMISSION_IDENTITY 와 글자 그대로 같고 🙋 가 아니다 (FINDINGS 122)', () => {
    const team = identityRow('제출 팀명')
    expect(team).toContain(`| ${SUBMISSION_IDENTITY.team} |`)
    expect(team).not.toContain('🙋')
    const repo = identityRow('공개 저장소 URL')
    expect(repo).toContain(SUBMISSION_IDENTITY.repoUrl)
    expect(repo).not.toContain('🙋')
  })

  it('한계는 KNOWN_LIMITATIONS 를 가리키고, 거기 있는 문장을 옮긴다', () => {
    expect(submission).toContain('](KNOWN_LIMITATIONS.md)')
    expect(submission).toContain('계약은 못 막습니다')
    expect(limits).toContain('계약은 못 막는다')
    expect(submission).toContain('서버측 AI 4종 중 둘')
    expect(limits).toContain('서버측 AI 4종 중 둘')
  })
})
