'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { DEMO_TENANT, demoBarText, demoResetText } from '../lib/demo/tenant'
import { PROJECT_SCREENS, screenHref } from '../lib/web/screens'
import { readSession } from '../lib/web/session'
import { TOUR, tourIndexOf } from '../lib/web/tour'
import { useText } from '../lib/i18n/provider'

// =====================================================================
//  게스트 데모 안내 — **두 조각** (DESIGN_BRIEF §4 「게스트 데모 배너」)
//
//    본문 위 : <DemoBar/>   `"Paylab (샘플 팀)" · 읽기 전용으로 둘러보는 중입니다`  [내 팀 만들기]
//    본문 아래: <DemoTour/>  3분 코스 ① 정리 ② Pack Explorer ③ Roadmap ④ Sync · 지금 걸음의 「볼 것」 · 리셋 안내
//
//  🔴 **왜 갈랐나 (2026-09-11 · 사용자: 「데모로 좀 더 사용자 친화적으로」).**
//    한 덩어리였을 때 휴대폰(375×812)에서 안내문 2줄 + 버튼 + 투어 칩 4줄 + 볼 것 3줄이
//    **약 690px** 을 먹었고, 그 위의 내비 머리글 250px 과 화면 머리글 250px 을 더하면
//    **첫 카드 제목이 y≈1280** 이었다 — 즉 **첫 화면에 제품이 0픽셀**이고 스크롤 두 번을
//    해야 무엇을 만드는 제품인지 보였다. 투표하러 온 사람은 거기서 나간다.
//    게다가 맨 위에서 제일 먼저 요구하는 것이 **「3분이면 됩니다」** 였다.
//
//  ★ 가른 기준은 「**403 을 만나기 전에 알아야 하나**」 하나다.
//    - `읽기 전용` → **위.** 이걸 모르면 게스트는 버튼을 눌러 받은 403 을 고장으로 읽는다.
//    - 코스·볼 것·리셋 시각 → **아래.** 화면을 다 본 **다음**에 찾는 것들이다.
//      (코스는 「다음에 어디로」이므로 원래 본문 끝이 제자리다.)
//
//  ⚠ **둘 다 뼈대(layout)가 그린다** — 화면마다 적으면 한 화면이 빠지고, 빠진 화면에서
//    403 이 고장으로 읽힌다. 그래서 `DemoTour` 도 화면이 아니라 layout 이 `children` **뒤에** 둔다.
//  ⚠ **[AI 한 번 실행해보기] 버튼은 아직 없다.** DESIGN_BRIEF 는 그 버튼을 적지만
//    부르는 문(`POST /demo/ai-once` · §7.4)이 0곳이다 (FINDINGS 117 과 같은 결).
//    누르면 아무 일도 안 하는 버튼을 두지 않는다 — 그 문이 생기는 바퀴에 여기 한 줄이다.
//  ⚠ 읽는 값은 `session.guest` 하나이고 그건 **표시용**이다. 못 바꾸게 하는 것은
//    서버다 (`lib/api/auth.ts` 의 `ACTOR_RULES.writes`).
// =====================================================================

/**
 * 게스트인가. ⚠ 서버 렌더에는 `localStorage` 가 없다 — 처음 그림은 안내 없이 그리고
 * 마운트 뒤에 정한다. 안 그러면 hydration 이 어긋나서 화면이 한 번 깜빡인다.
 *
 * ★ 왜 훅인가 — 위·아래 두 조각이 **같은 판단**을 해야 한다. 각자 읽으면 한쪽만
 *   나오는 조합이 생기고, 그건 아무도 안 잰다.
 */
function useGuest(): boolean {
  const [guest, setGuest] = useState(false)
  useEffect(() => { setGuest(readSession()?.guest === true) }, [])
  return guest
}

/** 본문 **위** 한 줄 — 읽기 전용이라는 사실 하나만. */
export function DemoBar() {
  const guest = useGuest()
  if (!guest) return null
  return (
    <div className="demo-bar" role="status">
      <span className="grow">{demoBarText()}</span>
      {/* 「시작하기」는 게스트가 아직 아무것도 안 본 자리에서 가입을 재촉했다 — 무엇이 생기는지로 바꿨다 (2026-09-11). */}
      <a className="demo-bar-link" href="/login">내 팀 만들기</a>
    </div>
  )
}

/** 본문 **아래** — 코스 넷과 지금 걸음의 「볼 것」, 그리고 리셋 안내. */
export function DemoTour() {
  const guest = useGuest()
  const pathname = usePathname()
  //  ⚠ 훅은 이른 반환보다 **위**다 — 아래로 내리면 게스트가 아닐 때만 훅 수가 달라져서 React 가 죽는다.
  const tour = useText(TOUR)
  if (!guest) return null
  const base = `/t/${DEMO_TENANT.teamSlug}/p/${DEMO_TENANT.projectSlug}`
  const here = tourIndexOf(pathname)
  const current = here >= 0 ? tour.stops[here] : undefined
  return (
    <aside className="demo-tour col-tight" aria-label={tour.title}>
      {/* 지금 걸음의 「볼 것」이 먼저다 — 이 사람은 방금 그 화면을 본 참이다. */}
      {current ? <p className="tour-see ink">{current.see}</p> : null}
      <ol className="tour">
        <li className="tour-title">{tour.title}</li>
        {tour.stops.map((stop, i) => {
          const screen = PROJECT_SCREENS.find((s) => s.path === stop.path)
          if (screen === undefined) return null
          return (
            <li key={stop.path}>
              <a className="tour-step" href={screenHref(base, screen)} aria-current={i === here ? 'step' : undefined}>
                <span className="mono">{i + 1}</span> {screen.label}
                {/* 「Pack Explorer」가 무엇인지 알약만 보고는 몰랐다 — 내비의 설명 한 줄을 여기도 (2026-09-11). */}
                <span className="meta tour-step-describe">{screen.describe}</span>
              </a>
            </li>
          )
        })}
      </ol>
      <p className="meta">{demoResetText()}</p>
    </aside>
  )
}
