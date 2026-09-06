'use client'

import { use, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { CommandPalette } from '../../../../../components/command-palette'
import { DemoBanner } from '../../../../../components/demo-banner'
import { PROJECT_SCREENS, isActiveScreen, screenHref } from '../../../../../lib/web/screens'

// =====================================================================
//  앱 화면의 뼈대 — 좌측 220px 내비 + 본문 최대 1200px (DESIGN_BRIEF §3 「레이아웃」)
//
//  ★ 탭 목록의 정본은 **`lib/web/screens.ts` 의 `PROJECT_SCREENS` 표 하나**다.
//    여기에 목록을 적지 마라 — 명령 팔레트(⌘K)가 같은 표를 읽는다 (FINDINGS 132).
//    화면이 늘면 그 표에 한 줄이고, 내비도 팔레트도 안 고친다.
//
//  ⚠ 폭·색은 전부 `globals.css` 의 토큰이다. 여기에 숫자를 적지 마라.
// =====================================================================

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
        {/* ⚠ 내비 안이다 — 「어디로 갈 수 있나」를 말하는 자리가 둘로 갈리지 않게. */}
        <CommandPalette base={base} pathname={path} team={team} project={project} />
        <div className="col-tight">
          {PROJECT_SCREENS.map((screen) => (
            <a
              key={screen.path}
              className="nav-link"
              href={screenHref(base, screen)}
              aria-current={isActiveScreen(screen, path) ? 'page' : undefined}
            >
              {screen.label}
            </a>
          ))}
        </div>
        {/* ⚠ 여기에 「상태는 마지막 보고 기준입니다」 같은 안내를 두지 마라 — 그 문장은
            기기 상태를 **보여 주는 화면**(화면 9)의 것이다. 화면에 없는 것을 설명하는
            글은 읽는 사람이 무엇을 보고 있는지 헷갈리게 만든다 (눈으로 확인하고 뺐다). */}
      </nav>
      <main className="main">
        <div className="main-inner">
          {/* ⚠ 게스트일 때만 그려진다 — 로그인한 사람에게는 아무것도 안 나온다.
              앱 화면 **전부** 위에 있어야 해서 화면이 아니라 이 뼈대가 그린다
              (화면마다 적으면 한 화면이 빠지고, 빠진 화면에서 403 이 고장으로 읽힌다). */}
          <DemoBanner />
          {children}
        </div>
      </main>
    </div>
  )
}
