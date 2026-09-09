import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { ERROR_CODES } from '@contextops/schema'
import { describe, expect, it } from 'vitest'

import {
  BEFORE_AFTER, HOW_IT_WORKS, INSTALL_STEPS, LANDING_FOOT, LANDING_HEAD, SUBMISSION_IDENTITY, TRUST_BOUNDARY,
} from '../src/components/landing'
import { AI_MODELS } from '../src/lib/ai/features'
import { ERROR_HINT } from '../src/lib/web/api'

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
    //  Node 요구 문장도 같아야 하고, 그 숫자는 `.nvmrc` 와 같아야 한다 (숫자가 두 곳이면 갈린다).
    expect(text).toContain(INSTALL_STEPS.requires)
    const nvmrc = readFileSync(join(repoRoot, '.nvmrc'), 'utf8').trim()
    expect(/Node (\d+)/.exec(INSTALL_STEPS.requires)?.[1], 'INSTALL_STEPS.requires 의 Node 숫자').toBe(nvmrc)
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

  it('아직 없는 값(production URL · 영상 · 슬라이드 · 참가 접수)은 🙋 자리표시자이거나 진짜 https 링크다 — 없는 것을 있는 것처럼 적지 않는다', () => {
    for (const k of ['production URL', '2분 영상 링크', '슬라이드 링크', '참가 접수']) {
      const row = identityRow(k)
      //  값이 생기면 🙋 대신 https:// 가 온다 — 그 사이(자리표시자도 링크도 아닌 글)는 없다.
      expect(row.includes('| 🙋') || /\| https:\/\/\S+/.test(row), `${k}: 🙋 도 https 링크도 아니다`).toBe(true)
    }
  })

  it('🔴 production URL 이 오면 「production 이 아직 없」이 세 문서에 0건이다 (INBOX 블로커 6)', () => {
    const row = identityRow('production URL')
    const live = /\| https:\/\/\S+/.test(row)
    const stale = [readme, submission, limits].map((t) => (t.match(/production ?이 아직 없/g) ?? []).length)
    if (live) expect(stale, 'URL 이 있는데 「production 이 아직 없」 문장이 남았다 (README · SUBMISSION · KNOWN_LIMITATIONS 순)').toEqual([0, 0, 0])
    //  아직 🙋 면 그 문장이 **있어야** 정직하다 — 둘 다 없는 상태(있는 척)를 막는다.
    else expect(stale[1]! + stale[2]!, '🙋 인데 「production 이 아직 없」 문장이 어디에도 없다').toBeGreaterThan(0)
  })

  it('🔴 대회 규정 원문 절이 있고 두 마감(접수 9/18 · 제출 9/20)을 적는다', () => {
    const start = submission.indexOf('\n## 대회 규정 원문')
    expect(start).toBeGreaterThan(0)
    const section = submission.slice(start + 1).split(/\n## /)[0] as string
    expect(section).toContain('2026-09-18')
    expect(section).toContain('2026-09-20')
    expect(section).toContain('서비스 링크(정상 작동 필수)')
  })

  it('🔴 제출 폼 원문의 각 칸이 적어 둔 상한 안이다 — 마감일에 급히 자르다 차별점이 빠지지 않게', () => {
    const start = submission.indexOf('\n## 제출 폼 원문')
    expect(start).toBeGreaterThan(0)
    const section = submission.slice(start + 1).split(/\n## /)[0] as string
    //  `### <칸 이름> (≤ N자)` 머리 아래의 본문이 그 칸의 원문이다. 상한이 없는 머리(서비스 링크)는 길이를 안 잰다.
    const blocks = section.split('\n### ').slice(1).map((chunk) => {
      const nl = chunk.indexOf('\n')
      const head = nl === -1 ? chunk : chunk.slice(0, nl)
      const body = nl === -1 ? '' : chunk.slice(nl + 1).trim()
      const m = /^(.+?) \(≤ (\d+)자\)$/.exec(head)
      return m ? { label: m[1] as string, cap: Number(m[2]), body } : { label: head, cap: undefined, body }
    })
    const capped = blocks.filter((b) => b.cap !== undefined)
    for (const must of ['한 줄', '해결하고자 한 문제', 'AI 활용 방식', '사용한 AI 툴']) {
      expect(capped.map((b) => b.label), `폼 칸 「${must}」 이 없거나 상한이 없다`).toContain(must)
    }
    for (const b of capped) {
      expect(b.body.length, `「${b.label}」 이 비었다`).toBeGreaterThan(0)
      expect(b.body.length, `「${b.label}」 이 상한 ${b.cap}자를 넘는다 (${b.body.length}자)`).toBeLessThanOrEqual(b.cap as number)
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

// =====================================================================
//  ⑦ 설치 첫 줄의 **마켓플레이스 이름**이 셋에서 같고, 그 목록 파일이 실재한다
//     (FINDINGS 140)
//
//  ★ 왜 시험인가 — 이름이 사는 자리가 셋이다: 랜딩(`SUBMISSION_IDENTITY.marketplaceRef`) ·
//    플러그인 `setup` 이 찍는 안내(웹을 import 할 수 없어 **글자**로 적힌다) · README·제출서
//    (마크다운이라 import 를 못 한다). 저장소를 옮기면 한쪽만 바뀌고, 그때 사람이 처음
//    치는 명령이 조용히 실패한다 — 그건 「고장」으로 읽힌다.
//
//  ⚠ 이름이 맞아도 **목록 파일이 없으면** `claude plugin marketplace add` 는 실패한다.
//    그래서 파일의 존재와 `plugins[0].source` 가 진짜 폴더인지도 같이 잰다.
// =====================================================================
describe('⑦ 마켓플레이스 이름과 목록 파일 (FINDINGS 140)', () => {
  const ref = SUBMISSION_IDENTITY.marketplaceRef

  it('이름은 저장소 URL 에서 파생된다 — 손으로 또 적지 않는다', () => {
    expect(ref).toBe(new URL(SUBMISSION_IDENTITY.repoUrl).pathname.slice(1))
    expect(ref).not.toContain('<')
  })

  it('랜딩 설치 첫 줄이 그 이름을 쓴다', () => {
    expect(INSTALL_STEPS.lines[0]?.cmd).toBe(`claude plugin marketplace add ${ref}`)
  })

  it('플러그인 setup 이 찍는 줄도 같은 이름이다 (웹을 import 못 하므로 글자로 적힌다)', () => {
    const setup = readFileSync(join(repoRoot, 'plugin', 'contextops', 'src', 'cli', 'setup.ts'), 'utf8')
    expect(setup).toContain(`const MARKETPLACE_REF = '${ref}'`)
    expect(setup).not.toContain('<marketplace>')
  })

  it('README·제출서에도 자리표시자가 남아 있지 않다', () => {
    for (const text of [readme, submission]) {
      expect(text).not.toContain('<marketplace>')
      expect(text).toContain(`claude plugin marketplace add ${ref}`)
    }
  })

  it('목록 파일이 있고 가리키는 폴더가 실재한다', () => {
    const path = join(repoRoot, '.claude-plugin', 'marketplace.json')
    expect(existsSync(path), '.claude-plugin/marketplace.json 이 없다 — add 가 목록을 못 찾는다').toBe(true)
    const market = JSON.parse(readFileSync(path, 'utf8')) as { plugins?: { name: string; source: string }[] }
    const first = market.plugins?.[0]
    expect(first?.name).toBe('contextops')
    expect(existsSync(join(repoRoot, first?.source ?? '')), `source 가 없는 폴더다: ${String(first?.source)}`).toBe(true)
    //  그 폴더가 진짜 플러그인인지 — manifest 가 있어야 `install` 이 된다.
    expect(existsSync(join(repoRoot, first?.source ?? '', '.claude-plugin', 'plugin.json'))).toBe(true)
  })
})

// =====================================================================
//  ⑧ 문서가 **없는 갈래를 약속하지 않는다** (INBOX G9 · 2026-09-09)
//
//  ★ 왜 시험인가 — 「키가 없으면 픽스처 결과로 떨어진다」가 README·제출서·.env.example·
//    KNOWN_LIMITATIONS 네 곳에 있었고, **그 코드는 어디에도 없었다.** 실제는 job 이 `INTERNAL` 로
//    끝나 화면이 「잠시 후 다시」를 띄웠다. 문서가 코드에 없는 행동을 적으면 심사위원이 그 장면을
//    찾다가 「고장」으로 읽는다. 같은 문장이 네 번 적혔으니 규칙이 아니라 게이트다 (CLAUDE.md).
//
//  ⚠ 부정문(「…갈래는 없다」)은 통과다 — 같은 줄이나 다음 줄에 「없다/없었다/않는다」가 있어야 한다.
//    문서는 줄을 접으므로 두 줄을 이어 본다.
// =====================================================================
describe('⑧ 「픽스처 결과로 떨어진다」를 어느 문서도 긍정문으로 적지 않는다 (INBOX G9)', () => {
  const HONEST = [
    ['README.md', readme],
    ['docs/SUBMISSION.md', submission],
    ['docs/KNOWN_LIMITATIONS.md', limits],
    ['docs/DEPLOY.md', readFileSync(join(docsRoot, 'DEPLOY.md'), 'utf8')],
    ['docs/SPEC.md', readFileSync(join(docsRoot, 'SPEC.md'), 'utf8')],
    ['docs/DESIGN_BRIEF.md', readFileSync(join(docsRoot, 'DESIGN_BRIEF.md'), 'utf8')],
    ['apps/web/.env.example', readFileSync(join(webRoot, '.env.example'), 'utf8')],
  ] as const

  it.each(HONEST.map(([name, text]) => [name, text] as const))('%s', (_name, text) => {
    const lines = text.split('\n')
    const offenders: string[] = []
    lines.forEach((line, i) => {
      if (!/픽스처[^\n]{0,20}떨어|떨어[^\n]{0,20}픽스처/.test(line)) return
      const window = `${line} ${lines[i + 1] ?? ''}`
      if (!/없다|없었다|않는다|없습니다/.test(window)) offenders.push(`${i + 1}: ${line.trim().slice(0, 80)}`)
    })
    expect(offenders, '「픽스처 결과로 떨어진다」는 코드에 없는 갈래다 — 문장을 사실로 고쳐라').toEqual([])
  })

  it('키 없는 배포의 코드가 실제로 있고, 화면 문구가 「운영자에게」다', () => {
    expect(ERROR_CODES).toContain('AI_NOT_CONFIGURED')
    expect(ERROR_HINT.AI_NOT_CONFIGURED).toContain('운영자')
    //  README·제출서가 그 코드 이름으로 말한다 — 「픽스처」 대신.
    expect(readme).toContain('AI_NOT_CONFIGURED')
    expect(submission).toContain('AI_NOT_CONFIGURED')
  })
})

// =====================================================================
//  ⑨ 숫자와 「없다」가 코드와 같다 (INBOX G15 · H1 · 2026-09-09)
//
//  ★ 왜 시험인가 — README 가 「관통 7단계」(실제 9) · 「표 16 · enum 14」(실제 18 · 17) 를 적고 있었고,
//    KNOWN_LIMITATIONS 는 「e2e 폴더가 없다」고 적었는데 `apps/web/e2e/` 에 파일이 아홉이었다. 숫자와
//    부정문은 코드가 자라면 **저절로 거짓이 된다** — 사람이 다시 세지 않는다. 그래서 코드에서 센 값과 대조한다.
// =====================================================================
describe('⑨ 문서의 숫자·「없다」가 코드와 같다 (INBOX G15 · H1)', () => {
  const schema = readFileSync(join(webRoot, 'src', 'db', 'schema.ts'), 'utf8')
  const tables = (schema.match(/pgTable\(/g) ?? []).length
  const enums = (schema.match(/= pgEnum\(/g) ?? []).length
  const walkthrough = readFileSync(join(repoRoot, 'tools', 'walkthrough.ps1'), 'utf8')
  const stages = (walkthrough.match(/@\{ name = "/g) ?? []).length

  it('README 의 표·enum 수가 `schema.ts` 와 같다', () => {
    expect(tables).toBeGreaterThan(0)
    expect(readme).toContain(`(표 ${tables} · enum ${enums}`)
  })

  it('README·제출서의 「관통 N단계」가 `tools/walkthrough.ps1` 의 단계 표와 같다', () => {
    expect(stages).toBeGreaterThan(0)
    for (const { name, text } of DOCS) {
      const said = [...text.matchAll(/(\d+)단계/g)].map((m) => Number(m[1]))
      expect(said.length, `${name}: 「N단계」가 한 번도 없다`).toBeGreaterThan(0)
      for (const n of said) expect(n, `${name}: 관통은 ${stages}단계인데 ${n}단계라고 적혀 있다`).toBe(stages)
    }
  })

  it('「`경로` 가 없다」고 적은 저장소 경로는 실제로 없어야 한다 — 실존하면 그 한계는 낡은 것이다', () => {
    const offenders: string[] = []
    for (const [name, text] of [['README', readme], ['SUBMISSION', submission], ['KNOWN_LIMITATIONS', limits]] as const) {
      for (const m of text.matchAll(/`([^`\n]+)`\s*(?:폴더|파일)?\s*(?:가|이|는|은)?\s*없다/g)) {
        const token = m[1] as string
        if (!REPO_DIRS.some((d) => token.startsWith(d))) continue
        if (existsSync(join(repoRoot, token.replace(/\/$/, '')))) offenders.push(`${name}: ${token}`)
      }
    }
    expect(offenders, '없다고 적은 경로가 실존한다').toEqual([])
    //  산문의 부정문도 하나는 직접 본다 — `apps/web/e2e/` 가 있는 한 이 문장은 거짓이다.
    expect(existsSync(join(webRoot, 'e2e'))).toBe(true)
    expect(limits).not.toContain('e2e 폴더가 없다')
    expect(limits).not.toContain('브라우저 e2e 가 없다')
  })
})

// =====================================================================
//  ⑩ 「AI 활용」의 숫자는 근거 JSON 에서 다시 계산한 값과 같다 (INBOX H3 · 2026-09-10)
//
//  ★ 왜 시험인가 — 제출서의 「실측: 3,900자 · 항목 16 · 약 20초 · 약 $0.02」는 어느 파일에서도 다시 셀 수
//    없는 숫자였고, 정가를 고치자(G10) 비용은 네 배가 됐다. 숫자는 사람이 옮겨 적는 순간 낡는다 — 근거
//    JSON(`docs/evidence/…/probe-87-run3.json`)과 정가 표(`AI_MODELS`)에서 표의 줄을 **만들어** 문서에 그 줄이 있는지 본다.
// =====================================================================
describe('⑩ 「AI 활용」 실측 표가 근거 JSON 과 같다 (INBOX H3)', () => {
  type Probe = {
    model: string
    goals: { chars: number; items: unknown[]; open_questions: unknown[]; latencyMs: number; refsTotal: number; refsInRange: number }
    roadmap: { chars: number; items: unknown[]; latencyMs: number; refsTotal: number; refsInRange: number }
    conflict: { count: number; latencyMs: number }
    usage: { inputTokens: number; outputTokens: number }[]
  }
  const probe = JSON.parse(readFileSync(join(docsRoot, 'evidence', '2026-09-07-p3-gemini', 'probe-87-run3.json'), 'utf8')) as Probe
  const fmt = (n: number): string => n.toLocaleString('en-US')
  const price = AI_MODELS[probe.model]!
  const tokensIn = probe.usage.reduce((a, u) => a + u.inputTokens, 0)
  const tokensOut = probe.usage.reduce((a, u) => a + u.outputTokens, 0)
  const costUsd = (tokensIn * price.inputPerMTokUsd + tokensOut * price.outputPerMTokUsd) / 1_000_000
  const seconds = Math.round((probe.goals.latencyMs + probe.roadmap.latencyMs + probe.conflict.latencyMs) / 1000)
  const items = probe.goals.items.length + probe.roadmap.items.length
  const rows = [
    `| 입력 | goals.md ${fmt(probe.goals.chars)}자 + old-roadmap.md ${fmt(probe.roadmap.chars)}자 (문서 둘) |`,
    `| 항목 후보 | ${items} (goals ${probe.goals.items.length} · roadmap ${probe.roadmap.items.length}) · 열린 질문 ${probe.goals.open_questions.length} |`,
    `| 충돌 카드 | ${probe.conflict.count} (전부 contradiction · 판정 없이 질문으로) |`,
    `| 인용 일치 | ${probe.goals.refsInRange + probe.roadmap.refsInRange}/${probe.goals.refsTotal + probe.roadmap.refsTotal} (모델이 낸 인용을 서버가 원문에서 찾았다) |`,
    `| 시간 | 약 ${seconds}초 (구조화 둘 + 충돌 탐지) |`,
    `| 토큰 | 입력 ${fmt(tokensIn)} · 출력 ${fmt(tokensOut)} |`,
    `| 비용(정가) | 약 $${costUsd.toFixed(2)} (${probe.model} · 입력 ${price.inputPerMTokUsd.toFixed(2)} · 출력 ${price.outputPerMTokUsd.toFixed(2)} USD/M) |`,
  ]

  it.each(DOCS.map((d) => [d.name, d.text] as const))('%s 의 표가 JSON 에서 만든 줄과 같다', (_name, text) => {
    for (const row of rows) expect(text, row).toContain(row)
  })

  it('제출 폼 600자 칸의 「실측:」 문장도 같은 숫자다', () => {
    const line = /실측: [^\n]+/.exec(submission)?.[0] ?? ''
    expect(line).toContain(`${fmt(probe.goals.chars + probe.roadmap.chars)}자`)
    expect(line).toContain(`항목 후보 ${items}`)
    expect(line).toContain(`충돌 ${probe.conflict.count}`)
    expect(line).toContain(`약 ${seconds}초`)
    expect(line).toContain(`약 $${costUsd.toFixed(2)}`)
  })

  it('비용은 이 저장소의 정가 표로 센 값이다 — 정가가 바뀌면 문서의 비용도 따라 바뀌어야 한다', () => {
    expect(price.inputPerMTokUsd).toBeGreaterThan(0)
    //  🔴 실측 셋(1,126+2,686+2,109 · 1,840+5,783+663) — 예전 문서의 「약 $0.02」는 2.5 Flash 의 정가로 센 값이었다.
    expect(costUsd).toBeGreaterThan(0.05)
  })
})
