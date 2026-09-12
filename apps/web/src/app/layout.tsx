import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LOCALE_HTML_LANG, type Locale } from '../lib/i18n/locale'
import { pick } from '../lib/i18n/localized'
import { LocaleProvider } from '../lib/i18n/provider'
import { serverLocale } from '../lib/i18n/server'
import { SITE, SITE_TEXT, siteOrigin } from '../lib/web/site'
import './fonts.css'
import './globals.css'

// =====================================================================
//  루트 레이아웃
//
//  ★ 색·간격·글꼴의 정본은 `globals.css` 의 `:root` 하나다 (docs/DESIGN_BRIEF.md §3).
//    여기에 style 을 적지 마라 — 두 곳이 되는 순간 갈라진다.
//
//  ⚠ 뉴트럴 모노크롬 한 벌 · 라이트 고정이다 (DESIGN_BRIEF §3 「테마」 · 2026-09-10). `color-scheme: light` 를 선언해야
//    다크 OS 에서도 브라우저 기본 스크롤바·폼 컨트롤이 검게 튀지 않는다 (다크 모드는 만들지 않는다).
//  ⚠ `fonts.css` 가 `globals.css` 보다 먼저다 — 토큰이 가리키는 글꼴 이름이 그 전에 선언돼야 한다.
//
//  🔴 **링크 미리보기** (INBOX H2 · 2026-09-10) — 예선은 온라인 투표가 20% 다. 링크가 카카오톡·슬랙·X 에
//     붙었을 때 제목 한 줄과 회색 상자만 보이면 아무도 안 누른다. 문장의 정본은 `lib/web/site.ts` 하나이고
//     랜딩 머리와 같은 문장이다 (`test/web-metadata.test.ts` 가 대조한다). 이미지는 `public/og.png`
//     (`pnpm --filter web og:image` 가 그린다) · 아이콘은 `public/icon.svg`.
// =====================================================================

/**
 * 🔴 **탭 제목·링크 미리보기도 언어를 탄다** (2026-09-12). `metadata` 상수에서
 *    `generateMetadata()` 로 바꾼 이유가 그것이다 — 상수는 요청을 모르고, 언어는 요청마다 다르다.
 *
 * ⚠ `og.png` 는 **한 장뿐이라 한국어다.** 언어별로 그리려면 `og:image` 도 언어를 타야 하는데,
 *   그 그림을 만드는 스크립트가 파일 하나를 덮어쓰는 모양이다 (`scripts/og-image.ts`).
 *   지금은 그림의 글자만 한국어이고 제목·설명은 언어를 따라간다 — 영어 링크 미리보기에서
 *   **읽히는 글자는 제목·설명**이라 이 상태로도 뜻이 통한다. 언어별 그림이 필요해지면
 *   `og-<locale>.png` 두 장을 그리고 이 자리에서 고르면 된다.
 */
export async function generateMetadata(): Promise<Metadata> {
  return metadataFor(await serverLocale())
}

/**
 * 🔴 **순수 함수다 — 요청을 안 읽는다.** 그래서 시험이 언어를 직접 주고 잴 수 있다
 *    (`test/web-metadata.test.ts`). 위 `generateMetadata` 는 「이번 요청의 언어」를 알아내는
 *    한 줄일 뿐이고, 무엇을 내는지는 전부 여기 있다.
 * ⚠ 여기서 `cookies()`·`headers()` 를 부르지 마라 — 부르는 순간 시험이 Next 요청 문맥을
 *   흉내 내야 하고, 그 흉내가 실제와 갈리면 시험은 초록인데 배포는 틀린다.
 */
export function metadataFor(locale: Locale): Metadata {
  const text = pick(SITE_TEXT, locale)
  const title = `${SITE.name} — ${text.tagline}`

  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: title, template: `%s · ${SITE.name}` },
    description: text.description,
    applicationName: SITE.name,
    icons: { icon: SITE.icon },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title,
      description: text.description,
      locale: OG_LOCALE[locale],
      images: [{ url: SITE.ogImage.path, width: SITE.ogImage.width, height: SITE.ogImage.height, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: text.description,
      images: [SITE.ogImage.path],
    },
  }
}

/** OG 가 요구하는 모양은 `ko_KR` 이지 `ko` 가 아니다 (`<html lang>` 과 다른 표라 따로 둔다). */
const OG_LOCALE: Record<Locale, string> = { ko: 'ko_KR', en: 'en_US' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  //  🔴 언어를 정하는 자리는 여기 **하나**다 (`lib/i18n/server.ts` 의 주석). 페이지마다 다시
  //     물으면 한 화면 안에서 두 언어가 섞인다.
  const locale = await serverLocale()
  return (
    <html lang={LOCALE_HTML_LANG[locale]} style={{ colorScheme: 'light' }}>
      {/* 클라이언트 화면 26개가 이 값을 `useLocale()` 로 읽는다 — prop 으로 타고 내려가지 않는다. */}
      <body><LocaleProvider locale={locale}>{children}</LocaleProvider></body>
    </html>
  )
}
