'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { DEFAULT_LOCALE, type Locale } from './locale'
import { pick, type Localized } from './localized'

// =====================================================================
//  클라이언트 화면이 언어를 아는 자리 (2026-09-12)
//
//  ★ 왜 context 인가 — 앱 화면 26개가 `'use client'` 다. 서버가 정한 언어를 prop 으로
//    타고 내려가게 하면 **모든 컴포넌트의 서명에 `locale` 이 한 칸씩 붙는다.** 화면을 하나
//    더할 때마다 그 칸을 빠뜨릴 자리가 생기고, 빠뜨린 화면은 조용히 기본 언어로 뜬다.
//
//  ★ 값은 **서버가 넣는다** (`app/layout.tsx`). 클라이언트가 스스로 `navigator.language` 를
//    읽지 않는다 — 그러면 서버가 그린 첫 글자와 달라져서 hydration 이 어긋난다.
// =====================================================================

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

/** 지금 화면의 언어. */
export function useLocale(): Locale {
  return useContext(LocaleContext)
}

/**
 * 언어별 표에서 **이 화면의 몫**을 꺼낸다. 화면이 표를 읽는 문이다.
 *
 * ```tsx
 * const t = useText(CONTEXT_SCREEN)
 * return <h1>{t.title}</h1>
 * ```
 */
export function useText<T>(table: Localized<T>): T {
  return pick(table, useContext(LocaleContext))
}
