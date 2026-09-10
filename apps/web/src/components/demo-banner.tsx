'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { DEMO_TENANT, demoBannerText } from '../lib/demo/tenant'
import { PROJECT_SCREENS, screenHref } from '../lib/web/screens'
import { readSession } from '../lib/web/session'
import { DEMO_TOUR, tourIndexOf } from '../lib/web/tour'

// =====================================================================
//  게스트 데모 배너 (DESIGN_BRIEF §4 「게스트 데모 배너」 — 모든 앱 화면 상단)
//
//    샘플 팀 "…"을 둘러보는 중입니다 · 읽기 전용 · 매일 03:00 초기화
//    ① 정리 ② Pack Explorer ③ Roadmap ④ Sync   ← 3분 코스 (`lib/web/tour.ts`) · 지금 걸음의 「볼 것」 한 줄
//
//  ★ 왜 배너가 필요한가 — 게스트는 **버튼을 눌렀을 때 403 을 받는다.** 그 사실을
//    미리 말하지 않으면 심사위원은 제품이 고장났다고 읽는다. 이 한 줄이 403 을
//    「막힌 것」이 아니라 「원래 그런 것」으로 만든다.
//  ★ 왜 코스가 배너에 있나 (2026-09-10) — 게스트는 표에 떨어져서 무엇을 봐야 할지 몰랐다. 코스의 정본은
//    `lib/web/tour.ts` 하나이고, 라벨·주소는 화면 표(`PROJECT_SCREENS`)에서 온다 — 여기서 지어내지 않는다.
//
//  ⚠ **[AI 한 번 실행해보기] 버튼은 아직 없다.** DESIGN_BRIEF 는 그 버튼을 적지만
//    부르는 문(`POST /demo/ai-once` · §7.4)이 0곳이다 (FINDINGS 117 과 같은 결).
//    누르면 아무 일도 안 하는 버튼을 두지 않는다 — 그 문이 생기는 바퀴에 여기 한 줄이다.
//  ⚠ 읽는 값은 `session.guest` 하나이고 그건 **표시용**이다. 못 바꾸게 하는 것은
//    서버다 (`lib/api/auth.ts` 의 `ACTOR_RULES.writes`).
// =====================================================================

export function DemoBanner() {
  //  ⚠ 서버 렌더에서는 `localStorage` 가 없다. 처음 그림은 배너 없이 그리고 마운트
  //    뒤에 정한다 — 안 그러면 hydration 이 어긋나서 화면이 한 번 깜빡인다.
  const [guest, setGuest] = useState(false)
  useEffect(() => { setGuest(readSession()?.guest === true) }, [])
  const pathname = usePathname()

  if (!guest) return null
  const base = `/t/${DEMO_TENANT.teamSlug}/p/${DEMO_TENANT.projectSlug}`
  const here = tourIndexOf(pathname)
  const current = here >= 0 ? DEMO_TOUR.stops[here] : undefined
  return (
    <div className="banner col-tight" role="status">
      <div className="row wrap">
        <span className="grow">{demoBannerText()}</span>
        <a className="btn btn-sm" href="/login">내 팀으로 시작하기</a>
      </div>
      <ol className="tour" aria-label={DEMO_TOUR.title}>
        <li className="tour-title">{DEMO_TOUR.title}</li>
        {DEMO_TOUR.stops.map((stop, i) => {
          const screen = PROJECT_SCREENS.find((s) => s.path === stop.path)
          if (screen === undefined) return null
          return (
            <li key={stop.path}>
              <a className="tour-step" href={screenHref(base, screen)} aria-current={i === here ? 'step' : undefined}>
                <span className="mono">{i + 1}</span> {screen.label}
              </a>
            </li>
          )
        })}
      </ol>
      {current ? <p className="tour-see ink">{current.see}</p> : null}
    </div>
  )
}
