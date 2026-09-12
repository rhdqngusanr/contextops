import { cookies, headers } from 'next/headers'

import { LOCALE_COOKIE, resolveLocale, type Locale } from './locale'

// =====================================================================
//  서버가 「이번 요청은 어느 언어인가」를 정하는 자리 (2026-09-12)
//
//  ★ 부르는 곳은 `app/layout.tsx` **하나**다. 거기서 정한 값을 `<html lang>` 에 쓰고
//    `LocaleProvider` 로 내려보낸다 — 페이지마다 다시 물으면 한 화면 안에서 두 언어가
//    섞이는 자리가 생긴다.
//
//  ⚠ `cookies()`·`headers()` 를 읽으면 그 라우트는 **동적 렌더**가 된다. 랜딩이 정적이던
//    것을 맞바꿨다 — 언어를 서버가 알아야 첫 그림이 깜빡이지 않고(`locale.ts` 의 쿠키 주석),
//    이 사이트의 크기에서 그 비용은 눈에 띄지 않는다. 되돌리려면 `/en` 경로로 가르는 수밖에 없다.
// =====================================================================

/** 쿠키(사람이 고른 것) → `Accept-Language`(브라우저) → 기본값. 순서의 정본은 `resolveLocale`. */
export async function serverLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()])
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language'),
  })
}
