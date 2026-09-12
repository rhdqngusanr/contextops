// =====================================================================
//  apps/web/src/lib/i18n/locale.ts — **언어의 정본 표 하나** (2026-09-12)
//
//  ★ 왜 생겼나 — 이 제품은 오픈소스로 공개하고 한국 밖 사람도 본다. 화면이 한국어뿐이면
//    링크를 받은 사람이 **무슨 물건인지도 못 읽는다.**
//
//  🔴 **기본은 한국어다.** 원티드 AI 챔피언십 심사위원이 한국인이고, 심사 기간
//     (9/21~10/5)에 첫 화면이 영어면 그건 손해다. 영어는 **브라우저가 영어일 때** 또는
//     **사람이 토글을 누를 때** 나온다.
//
//  ★ 언어를 하나 더하는 절차 — 「표에 한 줄」이 되게 만들어 두었다:
//    ① 아래 `LOCALES` 에 코드 한 줄 ② `LOCALE_LABEL` 에 이름 한 줄
//    ③ 그러면 `Localized<T>` 가 **그 언어의 값이 없는 모든 표에서 타입 검사로 막는다**
//    ④ `test/i18n.test.ts` 가 「en 쪽에 한글이 남았나」와 같은 검사를 그 언어에도 돌린다
//    ⚠ ③이 이 설계의 전부다. 언어를 옵셔널로 두면 번역이 빠진 화면이 **조용히** 한국어로
//      뜨고, 그 상태는 그 화면을 열어 보기 전에는 아무도 모른다.
//
//  ⚠ 이 파일은 **화면 문구를 담지 않는다.** 문구는 각 표(예: `components/landing.tsx`)에
//    그대로 살고, 여기 있는 것은 「언어가 무엇무엇인가」와 「이번 요청은 어느 언어인가」뿐이다.
// =====================================================================

/**
 * 🔴 **쓸 수 있는 언어의 정본.** 첫 값이 기본이다.
 * ⚠ 값은 쿠키에 **직렬화된다** — 끝에만 더하고 중간을 지우지 마라 (CLAUDE.md).
 */
export const LOCALES = ['ko', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** 아무것도 정해지지 않았을 때의 언어. 위 표의 첫 값이다 — 두 곳에 적지 않는다. */
export const DEFAULT_LOCALE: Locale = LOCALES[0]

/**
 * 토글에 그려지는 이름. **그 언어로** 적는다 (`English` 를 「영어」로 적으면
 * 한국어를 못 읽는 사람이 자기 언어를 못 찾는다).
 */
export const LOCALE_LABEL: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
}

/** 토글 버튼의 짧은 글자 — 머리글은 좁다. */
export const LOCALE_SHORT: Record<Locale, string> = {
  ko: 'KO',
  en: 'EN',
}

/** `<html lang>` 에 들어가는 값. 화면 낭독기와 검색엔진이 읽는다. */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en',
}

/**
 * 고른 언어가 사는 쿠키.
 * ★ 왜 쿠키인가 (localStorage 가 아니라) — 랜딩(`app/page.tsx`)이 **서버 컴포넌트**라
 *   서버가 그릴 때 이미 언어를 알아야 한다. localStorage 는 서버가 못 읽어서 첫 그림이
 *   한국어로 나갔다가 자바스크립트가 붙은 뒤 영어로 바뀐다 — 그 깜빡임이 첫인상이다.
 */
export const LOCALE_COOKIE = 'contextops_locale'

/** 1년. 사람이 한 번 고르면 그 뒤로 묻지 않는다. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** 값이 우리가 아는 언어인가. 쿠키·질의는 남이 준 값이라 반드시 이 문을 지난다. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * 🔴 **이번 요청의 언어를 정하는 유일한 자리.** 순서가 규칙이다:
 *   ① 쿠키 — **사람이 직접 고른 것.** 무엇보다 세다
 *   ② `Accept-Language` — 브라우저가 말하는 것 (자동 감지)
 *   ③ `DEFAULT_LOCALE` — 한국어
 *
 * ★ 왜 ①이 ②보다 위인가 — 영어 브라우저를 쓰는 한국인이 [한국어]를 눌렀는데 다음
 *   페이지에서 다시 영어가 되면, 그 토글은 **아무것도 안 한 것**이다.
 */
export function resolveLocale(input: {
  cookie?: string | undefined
  acceptLanguage?: string | null | undefined
}): Locale {
  if (isLocale(input.cookie)) return input.cookie
  const detected = fromAcceptLanguage(input.acceptLanguage)
  return detected ?? DEFAULT_LOCALE
}

/**
 * `Accept-Language` 머리에서 우리가 아는 언어를 고른다 — **q 값이 큰 것부터**.
 *
 * 예: `en-US,en;q=0.9,ko;q=0.8` → `en` · `ko-KR,ko;q=0.9,en;q=0.8` → `ko`
 * ⚠ 지역까지 보지 않는다 (`en-GB` 도 `en`). 지역별 문구가 생기면 그때 표를 넓혀라.
 * ⚠ 머리가 없거나 아는 언어가 하나도 없으면 `undefined` 다 — 기본값은 부르는 쪽이 정한다.
 */
export function fromAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
      //  q 가 없으면 1 이다 (RFC 9110). 숫자가 아니면 0 으로 본다 — 지어낸 값에 순위를 주지 않는다.
      const weight = q === undefined ? 1 : Number.parseFloat(q.slice(2))
      return { base: (tag ?? '').trim().toLowerCase().split('-')[0] ?? '', weight: Number.isFinite(weight) ? weight : 0 }
    })
    .filter((r) => r.base.length > 0 && r.weight > 0)
    //  ⚠ 안정 정렬이라 q 가 같으면 머리에 적힌 차례가 유지된다 — 브라우저가 적은 차례가 곧 선호다.
    .sort((a, b) => b.weight - a.weight)

  for (const { base } of ranked) {
    if (isLocale(base)) return base
  }
  return undefined
}

/** 브라우저에서 쿠키를 읽는다 (클라이언트 토글이 지금 값을 알아야 한다). */
export function readLocaleCookie(cookieHeader: string): Locale | undefined {
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === LOCALE_COOKIE) {
      const value = rest.join('=')
      if (isLocale(value)) return value
    }
  }
  return undefined
}
