'use client'

import { use, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

// =====================================================================
//  앱 화면의 뼈대 — 좌측 220px 내비 + 본문 최대 1200px (DESIGN_BRIEF §3 「레이아웃」)
//
//  ★ 탭 목록이 **표 하나**다. 화면이 늘면 여기 한 줄이고, 링크를 화면마다 적지 않는다.
//    ⚠ 아직 없는 화면을 표에 적지 마라 — 404 로 가는 탭은 「고장」으로 읽힌다.
//      화면을 만들 때 같이 한 줄 더한다 (`docs/PLAN.md` P3·P4 행).
//
//  ⚠ 폭·색은 전부 `globals.css` 의 토큰이다. 여기에 숫자를 적지 마라.
// =====================================================================

/** 이 프로젝트에서 **지금 열 수 있는** 화면. 순서가 곧 왼쪽 차례다. */
const TABS: { href: (base: string) => string; label: string; match: RegExp }[] = [
  { href: (base) => `${base}/context`, label: 'Context', match: /\/context$/ },
  //  ⚠ Pack Explorer 는 버전 하나를 가리켜야 열린다. 목록에서는 「최신」으로 보낸다 —
  //    `latest` 는 semver 가 아니라 화면이 versions 를 읽어 고르는 자리다.
  { href: (base) => `${base}/packs`, label: 'Pack Explorer', match: /\/packs(\/|$)/ },
]

export default function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ team: string; project: string }>
}) {
  const { team, project } = use(params)
  const path = usePathname()
  const base = `/t/${team}/p/${project}`

  return (
    <div className="shell">
      <nav className="nav">
        <div className="col-tight">
          <span className="label">팀 · 프로젝트</span>
          <span className="mono ink">{team}/{project}</span>
        </div>
        <div className="col-tight">
          {TABS.map((tab) => (
            <a
              key={tab.label}
              className="nav-link"
              href={tab.href(base)}
              aria-current={tab.match.test(path) ? 'page' : undefined}
            >
              {tab.label}
            </a>
          ))}
        </div>
        {/* 「실시간」이라는 말을 쓰지 않는다 (DESIGN_BRIEF §2-3). */}
        <span className="meta ink-4">상태는 각 기기의 마지막 보고 기준입니다.</span>
      </nav>
      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  )
}
