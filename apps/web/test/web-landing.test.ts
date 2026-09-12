import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  AI_USE, BEFORE_AFTER, HOW_IT_WORKS, INSTALL_STEPS, LANDING_FOOT, LANDING_HEAD, Landing, REPLAY_FRAMES,
  TERMINAL_REPLAY, TRUST_BOUNDARY, WHY_NOT_GIT, skillNamesIn,
} from '../src/components/landing'
import { SUBMISSION_IDENTITY } from '../src/lib/web/submission'
import { LOCALE_LABEL, LOCALES } from '../src/lib/i18n/locale'
import { DEMO_PROPOSALS } from '../src/lib/demo/seed-demo'
import { paylabDrafts } from '../src/lib/demo/seed'

// =====================================================================
//  🔴 화면 1(랜딩)을 **그려서 읽는다** (loop/PROMPT.md ⑦3층 · DESIGN_BRIEF §4 「화면 1」)
//
//  재는 것:
//    ① 🔴 **정적이다** — 세션을 읽는 코드가 0줄이다. 시크릿 창의 첫 화면이 하나뿐이어야
//      GATE 3 이 선다 (SPEC §9 표의 「상태」 칸)
//    ② A·B·C 가 전부 있다 — 헤드라인 · Before/After · [샘플 팀으로 둘러보기]
//    ③ 🔴 accent 는 **하나**이고 그것이 `/demo` 로 간다 (그 화면이 실제로 있다)
//    ④ 누르면 아무 일도 안 하는 것이 없다 — `href="#"` 는 없고, `<button>` 은 언어 토글 둘뿐이다
//      (영상이 없으니 [2분 영상 보기] 도 없다)
//    ⑤ 🔴 **Before/After 는 픽스처의 사실이다** — After 의 답은 게스트가 v1.1.0 에서 보는
//      `item_policy_retry` 의 `data.rule`(승인된 제안 · `DEMO_PROPOSALS`)과 글자 그대로 같고,
//      Before 의 두 답은 씨앗 초안의 근거 둘(문서 §3.1 · `retry.ts:11`)이 실제로 말하는
//      것이다. 첫 화면부터 근거 없는 줄이 없어야 한다 (P7 의 정신)
//    ⑥ 신뢰 경계 표의 「모르는 것」이 P1 의 넷을 전부 덮는다
//    ⑦ 설치 줄의 `/contextops:…` 는 실제 Skill 이고, 부르는 CLI 파일이 실제로 있다
//    ⑧ 「실시간」이라는 낱말이 없다 · 표와 코드는 `scroll-x` 안이다
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴·「스크롤 없이 첫 화면에 보이나」.
//    그건 브라우저 캡처가 있어야 한다 (docs/STATUS.md 「눈 판정 대기」).
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const fixtures = join(repoRoot, 'fixtures')

function html(): string {
  return renderToStaticMarkup(createElement(Landing, { locale: 'ko' }))
}

/** 랜딩이 말하는 항목을 씨앗과 **같은 함수**로 만든다 — 손으로 다시 적으면 갈린다. */
function retryDraft() {
  const goalsText = readFileSync(join(fixtures, 'paylab-docs', 'goals.md'), 'utf8')
  const retryText = readFileSync(join(fixtures, 'paylab-api', 'src', 'payment', 'retry.ts'), 'utf8')
  const drafts = paylabDrafts(
    { file: 'paylab-docs/goals.md', versionId: 'landing-test', text: goalsText },
    { repo: 'paylab-api', path: 'src/payment/retry.ts', text: retryText },
  )
  const found = drafts.find((d) => (d.draft as { id?: string }).id === BEFORE_AFTER.after.itemId)
  if (!found) throw new Error(`씨앗에 ${BEFORE_AFTER.after.itemId} 가 없다`)
  return { ...found, retryText }
}

describe('🔴 ① 랜딩은 정적이다 — 세션을 읽지 않는다', () => {
  it.each(['src/app/page.tsx', 'src/components/landing.tsx'])('%s 에 클라이언트 코드가 없다', (file) => {
    //  주석은 뺀다 — 「여기엔 'use client' 가 없다」는 주석 자체가 걸리면 안 된다.
    const src = readFileSync(join(webRoot, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(src).not.toContain("'use client'")
    expect(src).not.toMatch(/readSession|useEffect|useState|localStorage/)
  })
})

describe('② 첫 화면에 A·B·C 가 있다', () => {
  it('헤드라인 · 부제 · 작은 줄', () => {
    const out = html()
    expect(out).toContain(LANDING_HEAD.title)
    expect(out).toContain(LANDING_HEAD.subtitle)
    expect(out).toContain(LANDING_HEAD.note)
  })

  it('Before 의 두 답과 After 의 답이 전부 그려진다', () => {
    const out = html()
    for (const a of BEFORE_AFTER.before.answers) expect(out).toContain(a.text)
    expect(out).toContain(BEFORE_AFTER.after.text)
    expect(out).toContain(BEFORE_AFTER.before.foot)
    expect(out).toContain(BEFORE_AFTER.after.foot)
    //  After 에는 역추적 태그가 보인다 — 「이 답은 어디서 왔나」가 첫 화면에 있다 (P7).
    expect(out).toContain(`ctx:${BEFORE_AFTER.after.itemId}`)
  })

  it('답마다 「무엇을 읽었나」와 「쉬운 말로」 줄이 붙고, 질문은 한 번만 그려진다 (2026-09-10 저녁)', () => {
    //  ★ 왜 — 비개발자는 답의 문장이 아니라 「5번 · 3번 · 5번」을 견준다. 그 줄이 빠지면 이 그림은 다시 개발자 전용이다.
    const out = html()
    for (const a of BEFORE_AFTER.before.answers) {
      expect(out).toContain(a.name)
      expect(out).toContain(a.read)
      expect(out).toContain(a.plain.count)
      expect(out).toContain(a.plain.how)
    }
    expect(out).toContain(BEFORE_AFTER.after.name)
    expect(out).toContain(BEFORE_AFTER.after.read)
    expect(out).toContain(BEFORE_AFTER.after.plain.how)
    for (const e of BEFORE_AFTER.after.evidence) expect(out).toContain(e)
    //  질문은 한 번 — 두 세계가 같은 질문을 받았다는 그림이라 두 번 찍지 않는다.
    expect(out.split(BEFORE_AFTER.prompt).length - 1).toBe(1)
  })
})

describe('🔴 ③ accent 는 하나 — [샘플 팀으로 둘러보기] → /demo', () => {
  it('btn-primary 가 정확히 하나이고 href 가 /demo 다', () => {
    const out = html()
    const primaries = out.match(/class="btn btn-primary"/g) ?? []
    expect(primaries).toHaveLength(1)
    expect(out).toContain(`<a class="btn btn-primary" href="${LANDING_HEAD.cta.href}">${LANDING_HEAD.cta.label}</a>`)
    expect(LANDING_HEAD.cta.href).toBe('/demo')
  })

  it('그 주소에 화면이 실제로 있다 — 없는 곳으로 보내면 「고장」으로 읽힌다', () => {
    expect(existsSync(join(webRoot, 'src', 'app', 'demo', 'page.tsx'))).toBe(true)
  })

  it('로그인 화면의 「심사위원이신가요?」도 같은 주소로 간다 (게스트 입구는 하나다)', () => {
    //  문구·주소의 정본은 `lib/web/auth.ts` 의 `NO_ACCOUNT_HINT` 하나다 (로그인 카드와 콜백 오류 카드가
    //  같이 읽는다 · 2026-09-09). 화면이 그 상수를 쓰고, 그 상수가 랜딩과 같은 `/demo` 를 가리키는지 둘 다 본다.
    const login = readFileSync(join(webRoot, 'src', 'app', 'login', 'page.tsx'), 'utf8')
    const auth = readFileSync(join(webRoot, 'src', 'lib', 'web', 'auth.ts'), 'utf8')
    expect(login).toContain('href={NO_ACCOUNT_HINT.href}')
    expect(auth).toMatch(/NO_ACCOUNT_HINT = \{[\s\S]*?href: '\/demo'/)
    expect(login).not.toContain('준비 중')
  })
})

describe('④ 누르면 아무 일도 안 하는 것이 없다', () => {
  it('href="#" 이 없다 — 가리키는 곳이 없는 링크는 누르면 아무 일도 안 한다', () => {
    expect(html()).not.toContain('href="#"')
  })

  /**
   * 🔴 **버튼은 언어 토글 둘뿐이다** (2026-09-12 · 영어 모드).
   *
   * ★ 예전엔 「`<button>` 이 아예 없다」였다. 그 규칙의 **뜻**은 「누르면 아무 일도 안 하는
   *   것이 없다」이지 「버튼이라는 태그를 쓰지 마라」가 아니다 — 랜딩이 정적이던 시절에는
   *   둘이 같은 말이었을 뿐이다. 언어 토글은 실제로 쿠키를 쓰고 페이지를 다시 연다.
   * ⚠ 그래서 「없다」를 「이것 둘뿐이다」로 좁혔다. 넓히지 마라 — 셋째 버튼이 생기면
   *   여기서 걸리고, 그때 「그 버튼은 정말 무언가를 하는가」를 한 번 묻게 된다.
   */
  it('🔴 <button> 은 언어 토글 둘뿐이고, 둘 다 실제로 무언가를 한다', () => {
    const out = html()
    const buttons = [...out.matchAll(/<button[^>]*>/g)].map((m) => m[0])
    expect(buttons.length, '랜딩의 버튼이 둘이 아니다 — 새 버튼이 생겼다면 정말 무언가를 하는지 먼저 확인해라').toBe(2)
    //  언어 수만큼이다 — 언어가 늘면 이 수도 는다 (`LOCALES`).
    expect(buttons.length).toBe(LOCALES.length)
    //  ⚠ 눌린 상태를 색이 아니라 **글자로도** 말한다 — 화면 낭독기가 어느 쪽이 켜졌는지 알아야 한다.
    expect(buttons.filter((b) => b.includes('aria-pressed="true"')).length).toBe(1)
    for (const locale of LOCALES) expect(out).toContain(`aria-label="${LOCALE_LABEL[locale]}"`)
  })

  it('영상이 없으니 [2분 영상 보기] 도 없다', () => {
    expect(html()).not.toContain('영상')
  })

  it('모든 링크가 앱 안 주소이거나 공개 저장소(SUBMISSION_IDENTITY.repoUrl) 아래다 — 다른 밖 주소는 없다', () => {
    const hrefs = [...html().matchAll(/href="([^"]*)"/g)].map((m) => m[1] as string)
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) {
      if (h.startsWith('/')) continue
      expect(h, h).toMatch(new RegExp(`^${SUBMISSION_IDENTITY.repoUrl}(/|$)`))
    }
  })

  it('푸터에 제출 팀명 · GitHub · Known limitations 가 있다 (DESIGN_BRIEF 화면 1 C-6 · FINDINGS 122)', () => {
    const out = html()
    const foot = out.slice(out.indexOf('<footer'))
    expect(foot).toContain(LANDING_FOOT.team.name)
    expect(foot).toContain(`href="${LANDING_FOOT.github.href}"`)
    expect(foot).toContain(`href="${LANDING_FOOT.limits.href}"`)
    //  밖으로 나가는 링크 둘만 rel="noreferrer" — 앱 안 링크에는 붙지 않는다.
    expect(foot.match(/rel="noreferrer"/g)?.length).toBe(2)
  })
})

describe('🔴 ⑤ Before/After 는 paylab 픽스처의 사실이다 (SPEC §10.1 · src/lib/demo/seed.ts)', () => {
  it('After 의 답은 데모 v1.1.0 에 실린 승인 제안의 data.rule 과 글자 그대로 같다', () => {
    //  ★ 씨앗(v1.0.0)이 아니라 **published 제안**이다 — 게스트가 여는 판이 v1.1.0 이고,
    //    그 판에서는 이 항목이 제안의 문장으로 바뀌어 있다. 첫 화면과 앱이 같은 문장이어야 한다.
    const published = DEMO_PROPOSALS.find(
      (p) => p.target === BEFORE_AFTER.after.itemId && p.decision === 'published',
    )
    expect(published, 'v1.1.0 에 실린 제안이 이 항목을 고쳐야 한다').toBeDefined()
    const data = (published as NonNullable<typeof published>).data as { rule: string; severity: string }
    expect(BEFORE_AFTER.after.text).toBe(data.rule)
    //  세기는 사람 말 뒤 괄호 안의 값이다 — 픽스처의 severity 가 바뀌면 여기가 빨개진다.
    expect(BEFORE_AFTER.after.detail).toContain(`(${data.severity})`)
    //  제목의 버전이 데모가 실제로 발행하는 버전이다.
    const m = /v(\d+\.\d+\.\d+)/.exec(BEFORE_AFTER.after.title)
    expect(m).not.toBeNull()
    expect(readFileSync(join(webRoot, 'src', 'lib', 'demo', 'seed-demo.ts'), 'utf8')).toContain(`'${(m as RegExpExecArray)[1]}'`)
  })

  it('씨앗 초안(v1.0.0)도 같은 규칙을 말한다 — 제안은 문장을 구체화했지 뒤집지 않았다', () => {
    const { draft } = retryDraft()
    const data = (draft as { data: { rule: string } }).data
    expect(data.rule).toContain('5회')
    expect(BEFORE_AFTER.after.text).toContain('5회')
    expect(BEFORE_AFTER.after.text).toContain('지수 백오프')
  })

  it('Before A(문서)와 B(코드)는 그 초안의 근거 둘이 실제로 말하는 것이다', () => {
    const { draft, evidence, retryText } = retryDraft()
    const refs = (draft as { source_refs: Array<Record<string, unknown>> }).source_refs
    const doc = refs.find((r) => r.kind === 'source_document') as { heading_path: string[] }
    const repo = refs.find((r) => r.kind === 'repository_path') as {
      repo: string; path: string; start_line: number; end_line: number
    }
    const [a, b] = BEFORE_AFTER.before.answers

    //  A — 문서 §3.1. 제목 사슬의 마지막이 「3.1 …」 이고, 답의 낱말이 인용 안에 있다.
    expect(doc.heading_path.at(-1)).toMatch(/^3\.1/)
    expect(a.source).toContain('goals.md §3.1')
    const docQuote = evidence.find((e) => e.kind === 'source_document')?.quote ?? ''
    expect(docQuote).toContain('최대 5회')
    expect(docQuote).toContain('지수 백오프')
    expect(docQuote).toContain('고정 간격 재시도는 금지')

    //  B — 코드 `retry.ts:11`. 줄 번호는 씨앗이 잰 값이고, 답의 수치는 픽스처 본문에 있다.
    expect(b.source).toBe(`${repo.repo}/${repo.path}:${repo.start_line}`)
    expect(retryText).toContain('MAX_RETRY = 3')
    expect(retryText).toContain('RETRY_DELAY_MS = 500')

    //  After 의 근거 줄은 두 근거를 **둘 다** 가리킨다 — 하나만 적으면 코드 쪽이 사라진다.
    expect(BEFORE_AFTER.after.evidence).toContain(`${repo.repo}/${repo.path}:${repo.start_line}–${repo.end_line}`)
    expect(BEFORE_AFTER.after.evidence.some((e) => e.includes('goals.md §3.1'))).toBe(true)
  })
})

describe('⑥ 신뢰 경계 표 — 「모르는 것」이 P1 의 넷을 전부 덮는다 (SPEC §0.1)', () => {
  it('코드 본문 · secret · 개인 Memory · 대화', () => {
    const unknown = TRUST_BOUNDARY.unknown.rows.join(' ')
    expect(unknown).toMatch(/코드 본문/)
    expect(unknown).toMatch(/secret/)
    expect(unknown).toMatch(/Memory/)
    expect(unknown).toMatch(/대화/)
  })

  it('두 열이 색만이 아니라 색점 + 글자로 갈린다 (기호 ✓/✕ 는 없다 · 2026-09-11)', () => {
    const out = html()
    expect(out).toContain(`<span class="note tone-ok"><span class="chip-dot" aria-hidden="true"></span><span>${TRUST_BOUNDARY.knows.head}</span></span>`)
    expect(out).toContain(`<span class="note tone-bad"><span class="chip-dot" aria-hidden="true"></span><span>${TRUST_BOUNDARY.unknown.head}</span></span>`)
    //  ⚠ 터미널 녹화(`TerminalReplay`)는 CLI 가 실제로 찍는 글자(`✓ 파일`)를 그대로 보여 준다 — 그건 화면 장식이 아니라 기록이다. 표 머리만 잰다.
    expect(out).not.toMatch(/<th>[^<]*[✓✕]/)
  })
})

describe('⑦ 설치 줄은 지금 실제로 도는 명령만 적는다 (SPEC §8.3)', () => {
  const plugin = join(repoRoot, 'plugin', 'contextops')

  it('/contextops:… 는 전부 실제 Skill 이다', () => {
    const names = [
      ...INSTALL_STEPS.lines.flatMap((l) => skillNamesIn(l.cmd)),
      ...skillNamesIn(INSTALL_STEPS.foot),
    ]
    expect(names.length).toBeGreaterThan(0)
    for (const n of names) {
      expect(existsSync(join(plugin, 'skills', n, 'SKILL.md')), `skills/${n}`).toBe(true)
    }
  })

  it('설치 줄은 CLI 경로를 직접 적지 않고, 그 줄의 Skill 이 부르는 CLI 파일과 명령이 실제로 있다', () => {
    //  🔴 설치 줄에 `node "$CLAUDE_PLUGIN_ROOT/bin/…"` 를 적으면 안 된다 — 그 변수는 사용자 터미널에 없다
    //    (2026-09-09 감사). 경로를 아는 자리는 Skill 본문뿐이고, 설치 줄은 Skill 이름만 적는다.
    expect(INSTALL_STEPS.lines.some((l) => l.cmd.includes('contextops-cli.mjs') || l.cmd.includes('CLAUDE_PLUGIN_ROOT'))).toBe(false)
    const bin = join(plugin, 'bin', 'contextops-cli.mjs')
    expect(existsSync(bin)).toBe(true)
    const bundle = readFileSync(bin, 'utf8')
    let invocations = 0
    for (const n of INSTALL_STEPS.lines.flatMap((l) => skillNamesIn(l.cmd))) {
      const skill = readFileSync(join(plugin, 'skills', n, 'SKILL.md'), 'utf8')
      for (const m of skill.matchAll(/contextops-cli\.mjs" (\S+)/g)) {
        expect(bundle, `skills/${n} 이 부르는 명령 ${m[1]}`).toContain(m[1] as string)
        invocations++
      }
    }
    expect(invocations, '설치 줄의 Skill 이 CLI 를 한 번도 안 부른다').toBeGreaterThan(0)
  })

  it('없는 명령(npx contextops)을 적지 않는다', () => {
    expect(html()).not.toContain('npx contextops')
  })
})

describe('⑧ 낱말과 컨테이너', () => {
  it('「실시간」이라는 낱말이 없다 (SPEC §6 · KNOWN_LIMITATIONS)', () => {
    expect(html()).not.toContain('실시간')
  })

  it('표와 코드 블록은 scroll-x 안에 있다', () => {
    const out = html()
    expect(out).toMatch(/class="scroll-x"><table/)
    expect(out).toMatch(/scroll-x[^>]*><pre/)
  })
})

// ---------------------------------------------------------------------
//  ⑨ 밑의 절도 이해되게 (2026-09-10 저녁 · 사용자: 「저 섹션 말고도 밑의 섹션들도 저렇게 이해되게」)
//
//  ★ 왜 — 비개발자 심사위원이 읽는 층은 제품의 문장이 아니라 그 밑의 한 줄이다: 낱말 풀이 · 「예를 들면」 · 「쉬운 말로」 ·
//    「AI → 사람」 손바뀜 · 「무슨 일이 일어나나」 · 「개발자만 합니다」. 그 층이 빠지면 화면은 다시 개발자 전용이다.
//    숫자를 말하는 줄(터미널 밑의 넷)은 녹화와 대조한다 — 설명이 녹화보다 오래되면 첫 화면이 거짓말을 한다.
// ---------------------------------------------------------------------
describe('⑨ 밑의 절도 이해되게 — 낱말 풀이 · 예를 들면 · 쉬운 말로 · 손바뀜 · 무슨 일이 일어나나', () => {
  const out = html()

  it('02 — 낱말 풀이 셋과 주장마다 「예를 들면」이 그려진다', () => {
    expect(WHY_NOT_GIT.glossary.length).toBeGreaterThanOrEqual(2)
    for (const g of WHY_NOT_GIT.glossary) {
      expect(out).toContain(g.term)
      expect(out).toContain(g.means)
    }
    for (const c of WHY_NOT_GIT.cards) expect(out).toContain(c.example)
  })

  it('03 — 걸음마다 「쉬운 말로」와 누가·어디서 칩이 그려진다', () => {
    for (const s of HOW_IT_WORKS.steps) {
      expect(out).toContain(s.plain)
      expect(s.actors.length).toBeGreaterThanOrEqual(1)
      for (const a of s.actors) expect(out).toContain(a)
    }
  })

  it('04 — 줄마다 「누가 → 누가」 손바뀜이 있고, 사람이 반드시 한 자리에 있다 (결정은 사람 · P4)', () => {
    for (const r of AI_USE.rows) {
      expect(r.hand.length).toBeGreaterThanOrEqual(2)
      for (const h of r.hand) expect(out).toContain(h.does)
      expect(r.hand.some((h) => h.who === 'human'), r.head).toBe(true)
    }
    for (const label of Object.values(AI_USE.who)) expect(out).toContain(label)
  })

  it('05 — 「무슨 일이 일어나나」 넷이 녹화와 같은 숫자를 말한다 (v0.9.0 → v1.0.0 · 파일 8개 · 근거 n / 3)', () => {
    const text = TERMINAL_REPLAY.legend.join(' ')
    const frames = REPLAY_FRAMES.map((f) => f.text).join(' ')
    for (const tok of ['v0.9.0', 'v1.0.0', '파일 8개']) {
      expect(frames, `녹화에 ${tok} 가 없다`).toContain(tok)
      expect(text, `설명에 ${tok} 가 없다`).toContain(tok)
    }
    expect(text).toContain(`/ ${TERMINAL_REPLAY.milestone.done_when.length}`)
    for (const l of TERMINAL_REPLAY.legend) expect(out).toContain(l)
    for (const g of TERMINAL_REPLAY.glossary) expect(out).toContain(g.means)
  })

  it('06 — 표의 칸마다 「쉬운 말로」가 있고 줄 수가 같다', () => {
    expect(TRUST_BOUNDARY.knows.plain).toHaveLength(TRUST_BOUNDARY.knows.rows.length)
    expect(TRUST_BOUNDARY.unknown.plain).toHaveLength(TRUST_BOUNDARY.unknown.rows.length)
    for (const p of [...TRUST_BOUNDARY.knows.plain, ...TRUST_BOUNDARY.unknown.plain]) expect(out).toContain(p)
  })

  it('07 — 「개발자만 합니다」 한 줄과 줄마다 어디서(터미널 / Claude Code 안)가 그려지고, Skill 줄은 Claude Code 안이다', () => {
    expect(out).toContain(INSTALL_STEPS.who)
    for (const l of INSTALL_STEPS.lines) {
      expect(out).toContain(l.where)
      //  `/contextops:…` 는 터미널이 아니라 Claude Code 안이다 — 어디서가 틀리면 첫 시도가 실패한다 (2026-09-09 감사).
      expect(l.where, l.cmd).toBe(l.cmd.startsWith('/contextops:') ? 'Claude Code 안' : '터미널')
    }
  })
})
