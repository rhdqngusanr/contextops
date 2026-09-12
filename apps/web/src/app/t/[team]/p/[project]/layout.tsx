'use client'

import { use, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { CommandPalette } from '../../../../../components/command-palette'
import { DemoBar, DemoTour } from '../../../../../components/demo-banner'
import { isActiveScreen, screenHref, screensIn } from '../../../../../lib/web/screens'
import { useLocale } from '../../../../../lib/i18n/provider'
import { APP_CHROME } from '../../../../../lib/web/chrome'
import { pick } from '../../../../../lib/i18n/localized'

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
  //  🔴 화면 표를 **이 언어로** 읽는다 — `PROJECT_SCREENS` 를 직접 그리면 이 내비만 한국어로 남는다.
  const locale = useLocale()
  const screens = screensIn(locale)
  const chrome = pick(APP_CHROME, locale)

  return (
    <div className="shell">
      <nav className="nav">
        <div className="col-tight">
          {/* 프로젝트 이름이 머리다 (표제체) — 팀은 그 밑에 작게. `demo/paylab-api` 한 줄 모노는 처음 온 사람에게 주소로 읽혔다 (2026-09-11). */}
          <span className="label">{chrome.project}</span>
          <span className="nav-project">{project}</span>
          {/* 「demo」가 이름표 없이 모노로 혼자 서서 「데모 모드」 표시로 읽혔다 (2026-09-11). */}
          <span className="meta">{chrome.team} <span className="mono">{team}</span></span>
          {/* 「내 팀」 홈 — 다른 프로젝트·팀원 초대는 거기 있다 (INBOX H9). */}
          <a className="meta" href="/t">{chrome.myTeams}</a>
        </div>
        {/* ⚠ `nav-links` 는 **좁은 폭에서 접히는 것**을 가리키는 이름이다 (FINDINGS 160) —
            접는 규칙은 `globals.css` 의 유일한 폭 질의 한 곳에 있다. 여기에 px 를 적지 마라.
            접힌 뒤 갈 곳은 바로 위 ⌘K 팔레트다 (같은 `PROJECT_SCREENS` 표를 읽는다). */}
        <div className="col-tight nav-links">
          {screens.map((screen) => (
            //  지금 화면은 칸 전체가 말한다 — 왼쪽 검정 괘선 + 회색 면 (`data-current` · globals.css). 링크의 글자는 여전히 라벨뿐이다 (GATE 3).
            <div key={screen.path} className="nav-item" data-current={isActiveScreen(screen, path) ? 'true' : undefined}>
              <a
                className="nav-link"
                href={screenHref(base, screen)}
                aria-current={isActiveScreen(screen, path) ? 'page' : undefined}
              >
                {screen.label}
              </a>
              {/* 라벨 밑의 한 줄 — 무엇을 하는 화면인가 (`PROJECT_SCREENS.describe`). ⚠ `<a>` 밖이다 — 프로덕션 검사가
                  링크의 글자와 표의 라벨을 글자 그대로 대조한다 (GATE 3). */}
              <span className="nav-link-hint">{screen.describe}</span>
            </div>
          ))}
        </div>
        {/* ⚠ 내비 안이다 — 「어디로 갈 수 있나」를 말하는 자리가 둘로 갈리지 않게. 목록 **아래**다 — 처음 온 사람은 목록을 먼저 본다 (2026-09-11). */}
        <CommandPalette base={base} pathname={path} team={team} project={project} />
        {/* ⚠ 여기에 「상태는 마지막 보고 기준입니다」 같은 안내를 두지 마라 — 그 문장은
            기기 상태를 **보여 주는 화면**(화면 9)의 것이다. 화면에 없는 것을 설명하는
            글은 읽는 사람이 무엇을 보고 있는지 헷갈리게 만든다 (눈으로 확인하고 뺐다). */}
      </nav>
      <main className="main">
        <div className="main-inner">
          {/* ⚠ 게스트일 때만 그려진다 — 로그인한 사람에게는 아무것도 안 나온다.
              앱 화면 **전부** 에 있어야 해서 화면이 아니라 이 뼈대가 그린다
              (화면마다 적으면 한 화면이 빠지고, 빠진 화면에서 403 이 고장으로 읽힌다).
              🔴 **위는 「읽기 전용」 한 줄뿐이고 코스는 `children` 뒤다** (2026-09-11) —
                 안내를 전부 위에 쌓았더니 휴대폰 첫 화면에 제품이 0픽셀이었다.
                 가른 기준은 `components/demo-banner.tsx` 머리 주석에 있다. */}
          <DemoBar />
          {children}
          <DemoTour />
        </div>
      </main>
    </div>
  )
}
