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
  //  ⚠ 차례가 일의 차례다 — 문서를 넣는 화면이 먼저고, 그 결과를 보는 화면이 뒤다.
  { href: (base) => `${base}/import`, label: '가져오기', match: /\/import$/ },
  //  ⚠ 정리가 Context 앞이다 — 결정을 끝낸 것만 발행으로 간다 (SPEC §9 화면 4 → 5).
  { href: (base) => `${base}/review`, label: '정리', match: /\/review$/ },
  { href: (base) => `${base}/context`, label: 'Context', match: /\/context$/ },
  //  ⚠ Pack Explorer 는 버전 하나를 가리켜야 열린다. 목록에서는 「최신」으로 보낸다 —
  //    `latest` 는 semver 가 아니라 화면이 versions 를 읽어 고르는 자리다.
  { href: (base) => `${base}/packs`, label: 'Pack Explorer', match: /\/packs(\/|$)/ },
  //  ⚠ Roadmap 은 **발행된 Pack 이 있어야** 행이 생긴다 (마일스톤의 정본이 Manifest 다).
  //    그래서 Pack Explorer 뒤다 — 차례가 일의 차례라는 위 규칙 그대로다.
  { href: (base) => `${base}/roadmap`, label: 'Roadmap', match: /\/roadmap$/ },
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
        {/* ⚠ 여기에 「상태는 마지막 보고 기준입니다」 같은 안내를 두지 마라 — 그 문장은
            기기 상태를 **보여 주는 화면**(화면 9)의 것이다. 화면에 없는 것을 설명하는
            글은 읽는 사람이 무엇을 보고 있는지 헷갈리게 만든다 (눈으로 확인하고 뺐다). */}
      </nav>
      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  )
}
