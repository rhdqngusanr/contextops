import type { ReactNode } from 'react'

import './globals.css'

// =====================================================================
//  루트 레이아웃
//
//  ★ 색·간격·글꼴의 정본은 `globals.css` 의 `:root` 하나다 (docs/DESIGN_BRIEF.md §3).
//    여기에 style 을 적지 마라 — 두 곳이 되는 순간 갈라진다.
//
//  ⚠ 다크 고정이다. `color-scheme: dark` 를 선언해야 브라우저 기본 스크롤바·폼
//    컨트롤이 밝은 색으로 튀지 않는다 (라이트 모드는 만들지 않는다).
// =====================================================================

export const metadata = {
  title: 'ContextOps',
  description: '팀의 합의된 컨텍스트를 버전으로 배포한다',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" style={{ colorScheme: 'dark' }}>
      <body>{children}</body>
    </html>
  )
}
