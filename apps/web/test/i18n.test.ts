import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isLocalized } from '../src/lib/i18n/localized'
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../src/lib/i18n/locale'

// =====================================================================
//  🔴 **모든 언어 표를 한 자리에서 잠근다** (2026-09-12)
//
//  ★ 왜 표마다 시험을 쓰지 않나 — 그러면 **다음 표에서 반드시 빠뜨린다.** 빠뜨린 표는
//    조용히 한국어로 뜨고, 그 상태는 그 화면을 영어로 열기 전에는 아무도 모른다.
//    여기 있는 검사는 `localized()` 를 지난 표 **전부**에 저절로 걸린다.
//
//  ★ 잠그는 것 넷:
//    ① 등록이 빠지지 않는다 — `localized(` 를 쓰는 파일은 전부 아래 `MODULES` 에 있어야 한다
//    ② 모양이 같다 — 언어마다 키와 배열 길이가 같다
//    ③ 영어 쪽에 한글이 없다 — 일부러 남긴 것만 `KEEPS_KOREAN` 에 **이유와 함께**
//    ④ 그 예외 목록이 낡지 않는다 — 번역된 줄이 남아 있으면 빨개진다
//
//  ⚠ 새 언어 표를 만들면 `MODULES` 에 한 줄. 안 적으면 ①이 빨개진다 — 잊을 수가 없다.
// =====================================================================

/**
 * 언어 표를 내보내는 모듈. **열쇠는 `src/` 아래 경로**(확장자 없이)다 — ①이 그 경로로 대조한다.
 * ⚠ 정적 import 가 아니라 함수인 이유 — 화면 컴포넌트는 CSS 를 들여오므로 필요할 때만 연다.
 */
const MODULES: Record<string, () => Promise<Record<string, unknown>>> = {
  'lib/web/site': () => import('../src/lib/web/site'),
  'lib/web/tour': () => import('../src/lib/web/tour'),
  'lib/web/screens': () => import('../src/lib/web/screens'),
  'lib/web/privacy': () => import('../src/lib/web/privacy'),
  'lib/web/api': () => import('../src/lib/web/api'),
  'lib/web/chrome': () => import('../src/lib/web/chrome'),
  'lib/web/auth': () => import('../src/lib/web/auth'),
  'components/landing': () => import('../src/components/landing'),
  'components/states': () => import('../src/components/states'),
  'components/command-palette': () => import('../src/components/command-palette'),
}

/**
 * 🔴 **영어 쪽에 일부러 한국어로 두는 자리.** 열쇠는 `<모듈>#<내보낸 이름>.<경로>`, 값은 「왜」다.
 *
 * ⚠ 여기 적으면 게이트가 통과한다 — **게으름의 출구로 쓰지 마라.** 적기 전에 물어라:
 *   「이건 번역할 수 없는 값인가, 내가 아직 안 한 건가?」
 */
const KEEPS_KOREAN: Record<string, string> = {
  //  데모가 실제로 발행하는 Pack 의 규칙 문장이다 — 화면과 글자가 같아야 한다 (P7 의 정신).
  'components/landing#LANDING.en.beforeAfter.after.text': '데모 Pack v1.1.0 의 실제 규칙 — 화면과 글자가 같아야 한다',
  //  씨앗(`lib/demo/seed.ts`)에 심긴 PL-M1 의 완료 조건. 영어로 적으면 랜딩과 Roadmap 이 다른 문장을 말한다.
  'components/landing#LANDING.en.replay.milestone.done_when.0': '데모 DB 에 심긴 PL-M1 의 조건 — Roadmap 화면과 같은 문장',
  'components/landing#LANDING.en.replay.milestone.done_when.1': '데모 DB 에 심긴 PL-M1 의 조건 — Roadmap 화면과 같은 문장',
  'components/landing#LANDING.en.replay.milestone.done_when.2': '데모 DB 에 심긴 PL-M1 의 조건 — Roadmap 화면과 같은 문장',
  //  사람이 적어 준 제출 팀 이름 (고유명사).
  'components/landing#LANDING.en.foot.team.name': '제출 팀 이름 — 고유명사라 번역하지 않는다',
}

const HANGUL = /[가-힣]/

/**
 * 🔴 **개수가 언어마다 달라도 되는 목록.** 열쇠는 그 배열이 달린 칸 이름이다.
 *
 * ★ 왜 예외가 필요한가 — ②는 「한 언어에만 있는 칸」을 잡는 검사다. 그런데 `keywords` 는
 *   **검색어의 나열**이라 화면에 그려지지 않고, 언어마다 사람이 실제로 치는 낱말 수가 다르다
 *   (한국어는 「문서·업로드」, 영어는 `document·upload·paste`). 개수를 억지로 맞추면
 *   쓸모 있는 검색어를 지우게 된다.
 * ⚠ **그리는 목록을 여기 넣지 마라.** 그리는 목록은 개수가 곧 화면의 줄 수라서,
 *   한쪽이 짧으면 그 언어에서 줄이 사라진다 — ②가 잡아야 하는 바로 그 고장이다.
 */
const FREE_LENGTH_LISTS = new Set(['keywords'])

/** 자유 길이 목록의 첨자를 지워서 「그 칸이 있나」만 견주게 만든다. */
function shapeOf(value: unknown): string[] {
  const collapsed = leaves(value).map((l) =>
    l.path.replace(/([^.]+)\.\d+(?=\.|$)/g, (whole, key: string) => (FREE_LENGTH_LISTS.has(key) ? `${key}[]` : whole)))
  return [...new Set(collapsed)].sort()
}

/** 값이 있는 잎마다 `a.b.0.c` 꼴의 경로를 만든다. RegExp 처럼 속을 안 여는 값은 잎이 아니다. */
function leaves(value: unknown, path: string[] = []): { path: string; value: string }[] {
  if (typeof value === 'string') return [{ path: path.join('.'), value }]
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, [...path, String(i)]))
  if (value instanceof RegExp) return []
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, [...path, k]))
  }
  return []
}

/** 등록된 모듈에서 언어 표를 전부 걷는다. */
async function allTables(): Promise<{ id: string; table: Record<Locale, unknown> }[]> {
  const found: { id: string; table: Record<Locale, unknown> }[] = []
  for (const [name, open] of Object.entries(MODULES)) {
    const mod = await open()
    for (const [exported, value] of Object.entries(mod)) {
      if (isLocalized(value)) found.push({ id: `${name}#${exported}`, table: value as Record<Locale, unknown> })
    }
  }
  return found
}

// ---------------------------------------------------------------------

describe('① 등록이 빠지지 않는다', () => {
  it('🔴 `localized(` 를 쓰는 모든 파일이 `MODULES` 에 있다', () => {
    const root = join(__dirname, '..', 'src')
    const users: string[] = []

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
        //  `localized()` 를 **정의하는** 파일 자신은 사용자가 아니다.
        if (full.endsWith(join('lib', 'i18n', 'localized.ts'))) continue
        //  ⚠ **주석은 뺀다** — 「셋째가 생기면 `localized()` 표로 올려라」는 주석 한 줄이
        //    그 파일을 표 주인으로 만들었다 (2026-09-12 에 `locale-toggle.tsx` 가 실제로 걸렸다).
        const src = readFileSync(full, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '')
        if (!/\blocalized[<(]/.test(src)) continue
        users.push(full.slice(root.length + 1).replace(/\\/g, '/').replace(/\.tsx?$/, ''))
      }
    }
    walk(root)

    expect(users.length, '걷는 코드가 고장 났다 — 아무 파일도 못 찾았다').toBeGreaterThan(0)
    const missing = users.filter((u) => !(u in MODULES))
    expect(missing, '언어 표를 내보내는데 `MODULES` 에 없다 — 한 줄 더해라 (안 그러면 이 파일의 검사를 안 받는다)').toEqual([])
  })

  it('`MODULES` 에 적었는데 표가 하나도 없는 모듈이 없다 — 죽은 줄 금지', async () => {
    const tables = await allTables()
    const withTables = new Set(tables.map((t) => t.id.split('#')[0]))
    const empty = Object.keys(MODULES).filter((m) => !withTables.has(m))
    expect(empty, '`MODULES` 에 있는데 언어 표를 안 내보낸다 — 그 줄을 지워라').toEqual([])
  })
})

describe('② 언어마다 모양이 같다', () => {
  it('🔴 키와 배열 길이가 모든 언어에서 같다', async () => {
    for (const { id, table } of await allTables()) {
      const base = shapeOf(table[DEFAULT_LOCALE])
      for (const locale of LOCALES) {
        if (locale === DEFAULT_LOCALE) continue
        expect(shapeOf(table[locale]), `${id} 의 ${locale} 쪽 모양이 ${DEFAULT_LOCALE} 와 다르다`).toEqual(base)
      }
    }
  })

  it('걷는 코드가 고장 나면 이 파일이 조용히 통과한다 — 그것부터 막는다', async () => {
    const tables = await allTables()
    expect(tables.length).toBeGreaterThan(3)
    const total = tables.reduce((n, t) => n + leaves(t.table[DEFAULT_LOCALE]).length, 0)
    expect(total, '표는 찾았는데 문장이 거의 없다').toBeGreaterThan(100)
  })

  /**
   * 🔴 **표 안에 함수를 두지 마라** (2026-09-12).
   *
   * ★ 왜 — 값을 끼우는 문장을 `(on) => …` 로 두면 편한데, 함수는 **속을 열 수 없어서**
   *   아래 ③(「영어 쪽에 한글이 남았나」)이 그 문장을 그냥 지나간다. 게이트에 구멍이 나는데
   *   그 구멍은 조용하다. `/privacy` 를 고치다 실제로 그 자리를 만들 뻔했다.
   * ★ 대신 자리표시자 문자열(`'마지막 갱신 {on}'`)과 `fill()` 을 쓴다 (`lib/i18n/format.ts`).
   */
  it('🔴 언어 표에 함수가 없다 — 함수는 ③의 검사를 통째로 빠져나간다', async () => {
    const functions: string[] = []
    const scan = (value: unknown, at: string): void => {
      if (typeof value === 'function') { functions.push(at); return }
      if (Array.isArray(value)) { value.forEach((v, i) => { scan(v, `${at}.${i}`) }); return }
      if (value instanceof RegExp) return
      if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) scan(v, `${at}.${k}`)
      }
    }
    for (const { id, table } of await allTables()) {
      for (const locale of LOCALES) scan(table[locale], `${id}.${locale}`)
    }
    expect(functions, '표에 함수가 있다 — 자리표시자 문자열 + fill() 로 바꿔라 (lib/i18n/format.ts)').toEqual([])
  })
})

describe('③ 기본 언어가 아닌 쪽에 한글이 남아 있지 않다', () => {
  it('🔴 `KEEPS_KOREAN` 에 적지 않은 칸에 한글이 있으면 FAIL', async () => {
    const leaked: string[] = []
    for (const { id, table } of await allTables()) {
      for (const locale of LOCALES) {
        if (locale === DEFAULT_LOCALE) continue
        for (const leaf of leaves(table[locale])) {
          if (!HANGUL.test(leaf.value)) continue
          const key = `${id}.${locale}.${leaf.path}`
          if (key in KEEPS_KOREAN) continue
          leaked.push(`${key}: ${leaf.value.slice(0, 40)}`)
        }
      }
    }
    expect(
      leaked,
      '그 언어의 화면에 한국어가 뜬다 — 번역하거나, 번역할 수 없는 값이면 KEEPS_KOREAN 에 이유와 함께 적어라',
    ).toEqual([])
  })

  it('🔴 `KEEPS_KOREAN` 이 낡지 않았다 — 번역된 줄이 목록에 남아 있으면 FAIL', async () => {
    const live = new Map<string, string>()
    for (const { id, table } of await allTables()) {
      for (const locale of LOCALES) {
        if (locale === DEFAULT_LOCALE) continue
        for (const leaf of leaves(table[locale])) live.set(`${id}.${locale}.${leaf.path}`, leaf.value)
      }
    }
    const stale = Object.keys(KEEPS_KOREAN).filter((k) => {
      const value = live.get(k)
      return value === undefined || !HANGUL.test(value)
    })
    expect(stale, '이제 한글이 아니거나 없는 칸이다 — KEEPS_KOREAN 에서 그 줄을 지워라').toEqual([])
  })

  it('이유가 비어 있지 않다', () => {
    for (const [key, why] of Object.entries(KEEPS_KOREAN)) {
      expect(why.length, `${key} 에 왜 번역 안 했는지가 없다`).toBeGreaterThan(10)
    }
  })
})
