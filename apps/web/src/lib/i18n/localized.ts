import { LOCALES, type Locale } from './locale'

// =====================================================================
//  apps/web/src/lib/i18n/localized.ts — **언어별 문구를 담는 모양 하나** (2026-09-12)
//
//  ★ 이 파일이 있는 이유는 하나다: **번역이 빠진 것을 조용히 넘어가지 않게.**
//    `Record<Locale, T>` 라서 언어를 하나 더하면 **그 언어의 값이 없는 모든 표에서
//    타입 검사가 막힌다** (`locale.ts` 의 절차 ③). 옵셔널로 두면 번역이 안 된 화면이
//    조용히 한국어로 뜨고, 그 상태는 그 화면을 열기 전에는 아무도 모른다.
//
//  ★ 왜 문구를 이리로 **옮기지** 않았나 — 이 저장소의 결은 「문구의 정본은 그것을 쓰는
//    표」다 (`components/landing.tsx` 머리 주석: 「문구는 전부 아래 표에 산다」). 문장을
//    전부 한 사전 파일로 끌어오면 그 표들이 뜻을 잃고, 시험이 「Before/After 의 답이 실제
//    Pack 규칙과 같은가」 같은 것을 재던 자리도 같이 사라진다. 그래서 **문구는 있던 자리에
//    그대로 두고, 그 자리에서 언어별로 갈라 담는다.**
//
//  ⚠ `localized()` 를 지나지 않은 표는 게이트가 못 본다 (`test/i18n.test.ts`). 화면 문구를
//    담는 표는 반드시 이 함수를 지나게 해라 — 그게 「영어 모드인데 군데군데 한글」을 막는 유일한 문이다.
// =====================================================================

/** 이 객체가 언어별 표라는 표시. 게이트가 이것을 보고 찾아낸다 (열거되지 않는다). */
export const LOCALIZED = Symbol.for('contextops.localized')

/** 언어마다 한 벌씩. **모든 언어가 있어야 한다** — 그게 이 타입의 전부다. */
export type Localized<T> = Record<Locale, T> & { readonly [LOCALIZED]?: true }

/**
 * 언어별 한 벌을 만든다.
 *
 * ```ts
 * export const HEAD = localized({
 *   ko: { title: '팀의 기억과 AI의 기억을 한 방향으로' },
 *   en: { title: 'One shared memory for your team and its AI' },
 * })
 * ```
 *
 * ⚠ 두 쪽의 **모양(키)이 같아야 한다.** 타입이 그것을 강제하고, 게이트가 한 번 더 센다 —
 *   한쪽에만 있는 키는 그 언어에서 화면이 `undefined` 를 그린다.
 */
export function localized<T>(table: Record<Locale, T>): Localized<T> {
  //  ⚠ 열거되지 않게 붙인다 — `Object.keys()`·JSON 직렬화·React prop 확산에 섞이면 안 된다.
  Object.defineProperty(table, LOCALIZED, { value: true, enumerable: false })
  return table as Localized<T>
}

/** 이번 요청의 언어로 고른다. 화면이 표를 읽는 **유일한 문**이다. */
export function pick<T>(table: Localized<T>, locale: Locale): T {
  return table[locale]
}

/** 게이트가 쓰는 판별. 화면 코드가 이걸 부를 일은 없다. */
export function isLocalized(value: unknown): value is Localized<unknown> {
  if (typeof value !== 'object' || value === null) return false
  if ((value as Record<symbol, unknown>)[LOCALIZED] !== true) return false
  return LOCALES.every((l) => l in (value as Record<string, unknown>))
}
