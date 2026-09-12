import { describe, expect, it } from 'vitest'

import { LANDING_EN } from '../src/components/landing.en'
import { LANDING_KO, LANDING_NAV, NAV_SECTION_IDS } from '../src/components/landing'
import { LOCALES } from '../src/lib/i18n/locale'
import { SITE_TEXT } from '../src/lib/web/site'

// =====================================================================
//  🔴 **랜딩의 두 벌을 묶는 게이트** (2026-09-12 · 영어 모드)
//
//  ★ 왜 시험인가 — 언어가 둘이 되면 새 문구를 더할 때 **한쪽만** 더하게 된다. 그러면 그
//    화면은 다른 언어에서 `undefined` 를 그리거나 한국어를 그대로 보여 준다. 둘 다
//    **그 언어로 열어 보기 전에는 아무도 모르는** 종류의 고장이다 (CLAUDE.md 「같은 지적이
//    두 번 나오면 게이트로 올려라」).
//
//  ★ 잠그는 것 셋:
//    ① 모양이 같다 — 키도, 배열 길이도
//    ② 영어 쪽에 한글이 없다 — 일부러 남긴 것만 `EN_KEEPS_KOREAN` 에 이유와 함께
//    ③ `EN_KEEPS_KOREAN` 이 낡지 않았다 — 번역된 줄이 목록에 남아 있으면 빨개진다
// =====================================================================

/**
 * 🔴 **영어 한 벌에서 일부러 한국어로 두는 자리.** 값은 「왜」다.
 *
 * ⚠ 새 줄을 더하기 전에 한 번 더 물어라 — 「이건 번역할 수 없는 값인가, 내가 아직 안 한 건가?」
 *   여기 적으면 게이트가 통과하므로, 게으름의 출구로 쓰면 이 시험이 아무것도 안 지킨다.
 */
const EN_KEEPS_KOREAN: Record<string, string> = {
  //  🔴 이 문장은 **데모가 실제로 발행하는 Pack 의 그 줄**이다 (`DEMO_PROPOSALS` 의 `data.rule`).
  //     `web-landing.test.ts` 가 글자 그대로 대조한다 — 영어로 적으면 랜딩이 「팀은 이렇게
  //     답한다」며 보여 주는 문장이 실제 Pack 에 없는 문장이 된다 (P7 의 정신).
  'beforeAfter.after.text': '데모 Pack v1.1.0 의 실제 규칙 문장 — 화면과 글자가 같아야 한다',
  //  🔴 씨앗(`lib/demo/seed.ts` 의 `paylabDrafts()`)에 심긴 마일스톤 조건이다. 영어로 적으면
  //     랜딩과 실제 Roadmap 화면이 다른 문장을 말한다.
  'replay.milestone.done_when.0': '데모 DB 에 심긴 PL-M1 의 조건 — Roadmap 화면과 같은 문장',
  'replay.milestone.done_when.1': '데모 DB 에 심긴 PL-M1 의 조건 — Roadmap 화면과 같은 문장',
  'replay.milestone.done_when.2': '데모 DB 에 심긴 PL-M1 의 조건 — Roadmap 화면과 같은 문장',
  //  사람이 적어 준 제출 팀 이름이다 (고유명사 · `SUBMISSION_IDENTITY.team`).
  'foot.team.name': '제출 팀 이름 — 고유명사라 번역하지 않는다',
}

const HANGUL = /[가-힣]/

/** 값이 있는 잎(leaf)마다 `a.b.0.c` 꼴의 경로를 만든다. */
function leaves(value: unknown, path: string[] = []): { path: string; value: string }[] {
  if (typeof value === 'string') return [{ path: path.join('.'), value }]
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, [...path, String(i)]))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, [...path, k]))
  }
  return []
}

const koLeaves = leaves(LANDING_KO)
const enLeaves = leaves(LANDING_EN)

describe('① 두 벌의 모양이 같다', () => {
  it('🔴 키와 배열 길이가 글자 그대로 같다 — 한쪽에만 있는 칸은 그 언어에서 빈 화면이다', () => {
    const koPaths = koLeaves.map((l) => l.path).sort()
    const enPaths = enLeaves.map((l) => l.path).sort()

    const onlyKo = koPaths.filter((p) => !enPaths.includes(p))
    const onlyEn = enPaths.filter((p) => !koPaths.includes(p))
    expect(onlyKo, '한국어에만 있다 — 영어 한 벌(landing.en.ts)에 같은 칸을 더해라').toEqual([])
    expect(onlyEn, '영어에만 있다 — 한국어 표에 없는 칸이다').toEqual([])
  })

  it('걷는 코드가 고장 나면 이 파일이 조용히 통과한다 — 그것부터 막는다', () => {
    expect(koLeaves.length).toBeGreaterThan(80)
    expect(koLeaves.length).toBe(enLeaves.length)
  })
})

describe('② 영어 한 벌에 한글이 남아 있지 않다', () => {
  it('🔴 `EN_KEEPS_KOREAN` 에 적지 않은 칸에 한글이 있으면 FAIL', () => {
    const leaked = enLeaves
      .filter((l) => HANGUL.test(l.value))
      .filter((l) => !(l.path in EN_KEEPS_KOREAN))
      .map((l) => `${l.path}: ${l.value.slice(0, 40)}`)

    expect(
      leaked,
      '영어 화면에 한국어가 뜬다 — 번역하거나, 번역할 수 없는 값이면 EN_KEEPS_KOREAN 에 이유와 함께 적어라',
    ).toEqual([])
  })

  it('🔴 `EN_KEEPS_KOREAN` 이 낡지 않았다 — 번역된 줄이 목록에 남아 있으면 FAIL', () => {
    const byPath = new Map(enLeaves.map((l) => [l.path, l.value]))
    const stale = Object.keys(EN_KEEPS_KOREAN).filter((p) => {
      const value = byPath.get(p)
      //  그런 칸이 없어졌거나(경로 변경), 이제 한글이 아니면(번역됨) 그 줄은 죽었다.
      return value === undefined || !HANGUL.test(value)
    })
    expect(stale, '이제 한글이 아니거나 없는 칸이다 — EN_KEEPS_KOREAN 에서 그 줄을 지워라').toEqual([])
  })

  it('이유가 비어 있지 않다 — 「왜 번역 안 했나」가 없으면 다음 사람이 판단할 수 없다', () => {
    for (const [path, why] of Object.entries(EN_KEEPS_KOREAN)) {
      expect(why.length, `${path} 에 이유가 없다`).toBeGreaterThan(10)
    }
  })
})

describe('③ 머리글 링크 · 사이트 이름표', () => {
  it('🔴 머리글에 뜨는 절과 `LANDING_NAV` 의 열쇠가 같다 — 한쪽만 늘면 빈 링크가 된다', () => {
    expect(Object.keys(LANDING_NAV).sort()).toEqual([...NAV_SECTION_IDS].sort())
    expect(Object.keys(LANDING_EN.nav).sort()).toEqual([...NAV_SECTION_IDS].sort())
  })

  it('랜딩 머리 세 문장이 `SITE_TEXT` 에서 온다 — 언어마다 `<head>` 와 같은 문장이다', () => {
    for (const locale of LOCALES) {
      const bundle = locale === 'en' ? LANDING_EN : LANDING_KO
      expect(bundle.head.title).toBe(SITE_TEXT[locale].tagline)
      expect(bundle.head.subtitle).toBe(SITE_TEXT[locale].description)
      expect(bundle.head.eyebrow).toBe(SITE_TEXT[locale].eyebrow)
    }
  })

  it('두 벌이 같은 곳을 가리킨다 — 링크 주소는 언어를 타지 않는다', () => {
    expect(LANDING_EN.head.cta.href).toBe(LANDING_KO.head.cta.href)
    expect(LANDING_EN.head.login.href).toBe(LANDING_KO.head.login.href)
    expect(LANDING_EN.foot.github.href).toBe(LANDING_KO.foot.github.href)
    expect(LANDING_EN.foot.privacy.href).toBe(LANDING_KO.foot.privacy.href)
    expect(LANDING_EN.foot.health.href).toBe(LANDING_KO.foot.health.href)
    expect(LANDING_EN.foot.limits.href).toBe(LANDING_KO.foot.limits.href)
  })

  /**
   * 🔴 **실제로 실행되는 부분은 두 벌이 글자 그대로 같다** — 번역하면 그 줄은 안 돈다.
   *
   * ⚠ `<…>` 안은 예외다. 그건 명령이 아니라 **무엇을 채워 넣으라는 설명**이라
   *   (`/contextops:setup <Sync 화면이 준 인자>`) 오히려 번역돼야 한다. 이 시험을
   *   처음 쓸 때 「전부 같아야 한다」로 적었다가 그 자리에서 빨개졌다 — 게이트가 옳았고
   *   기대값이 틀렸다.
   */
  it('🔴 설치 명령의 실행되는 부분이 두 벌 모두 같다 (`<…>` 자리표시자만 번역된다)', () => {
    const runnable = (cmd: string): string => cmd.replace(/<[^>]*>/g, '<…>')
    expect(LANDING_EN.install.lines.map((l) => runnable(l.cmd)))
      .toEqual(LANDING_KO.install.lines.map((l) => runnable(l.cmd)))

    //  그리고 자리표시자는 **정말로** 번역돼 있어야 한다 — 한국어가 남으면 ② 가 잡는다.
    const withPlaceholder = LANDING_EN.install.lines.filter((l) => l.cmd.includes('<'))
    expect(withPlaceholder.length, '자리표시자가 있는 줄이 사라졌다 — 이 시험의 전제가 바뀌었다').toBeGreaterThan(0)
  })

  it('🔴 근거 경로도 두 벌이 같다 — 픽스처의 실제 파일을 가리킨다 (P7)', () => {
    expect(LANDING_EN.beforeAfter.after.itemId).toBe(LANDING_KO.beforeAfter.after.itemId)
    expect(LANDING_EN.beforeAfter.before.answers.map((a) => a.source))
      .toEqual(LANDING_KO.beforeAfter.before.answers.map((a) => a.source))
    expect(LANDING_EN.replay.milestone.id).toBe(LANDING_KO.replay.milestone.id)
  })
})
