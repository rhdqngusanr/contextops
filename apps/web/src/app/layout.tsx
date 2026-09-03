import type { ReactNode } from 'react'

// =====================================================================
//  루트 레이아웃 — 지금은 화면이 없다. 이 앱의 몸통은 `app/api/v1` 이다.
//
//  ⚠ 화면(SPEC §9 의 9개)은 PLAN P1 넷째 행부터다. 여기에 미리 색·간격을 적지 마라 —
//    토큰의 정본은 `docs/DESIGN_BRIEF.md` §3 이고, 그 전에 임의 값을 심으면
//    나중에 두 곳이 갈라진다.
// =====================================================================

export const metadata = {
  title: 'ContextOps',
  description: '팀의 합의된 컨텍스트를 버전으로 배포한다',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
