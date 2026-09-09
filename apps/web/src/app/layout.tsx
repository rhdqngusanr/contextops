import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SITE, siteOrigin } from '../lib/web/site'
import './globals.css'

// =====================================================================
//  루트 레이아웃
//
//  ★ 색·간격·글꼴의 정본은 `globals.css` 의 `:root` 하나다 (docs/DESIGN_BRIEF.md §3).
//    여기에 style 을 적지 마라 — 두 곳이 되는 순간 갈라진다.
//
//  ⚠ 다크 고정이다. `color-scheme: dark` 를 선언해야 브라우저 기본 스크롤바·폼
//    컨트롤이 밝은 색으로 튀지 않는다 (라이트 모드는 만들지 않는다).
//
//  🔴 **링크 미리보기** (INBOX H2 · 2026-09-10) — 예선은 온라인 투표가 20% 다. 링크가 카카오톡·슬랙·X 에
//     붙었을 때 제목 한 줄과 회색 상자만 보이면 아무도 안 누른다. 문장의 정본은 `lib/web/site.ts` 하나이고
//     랜딩 머리와 같은 문장이다 (`test/web-metadata.test.ts` 가 대조한다). 이미지는 `public/og.png`
//     (`pnpm --filter web og:image` 가 그린다) · 아이콘은 `public/icon.svg`.
// =====================================================================

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  icons: { icon: SITE.icon },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: 'ko_KR',
    images: [{ url: SITE.ogImage.path, width: SITE.ogImage.width, height: SITE.ogImage.height, alt: `${SITE.name} — ${SITE.tagline}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage.path],
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" style={{ colorScheme: 'dark' }}>
      <body>{children}</body>
    </html>
  )
}
