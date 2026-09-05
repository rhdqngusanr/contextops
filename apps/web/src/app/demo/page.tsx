'use client'

import { useEffect, useState } from 'react'

import { ErrorState } from '../../components/states'
import { startGuestSession } from '../../lib/web/queries'
import { writeSession } from '../../lib/web/session'

// =====================================================================
//  `/demo` — 링크 하나로 샘플 팀에 들어가는 자리 (SPEC §9 「게스트 데모」 · GATE 3)
//
//  ★ 화면이 하는 일은 셋이다: 세션을 **받아서** · 저장하고 · 서버가 말한 곳으로 보낸다.
//    판단은 하나도 안 한다 — 데모가 심어져 있는지도, 어디로 가야 하는지도 서버가 안다.
//
//  ⚠ 여기서 세션을 **지어내지 않는다.** 「게스트니까 토큰 없이 다니자」로 두면
//    화면마다 「토큰이 없을 때」 갈래가 하나씩 생기고, 그 갈래는 아무도 안 잰다.
//    게스트도 진짜 세션으로 진짜 라우트를 지난다 — 다른 것은 **쓸 수 없다**는 것뿐이다.
//  ⚠ 실패를 조용히 넘기지 않는다. 데모를 안 심은 배포에서 이 화면이 그냥 도는 것처럼
//    보이면, 심사위원은 빈 앱 화면을 보고 제품이 고장났다고 읽는다.
// =====================================================================

export default function DemoPage() {
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    void startGuestSession()
      .then((session) => {
        if (cancelled) return
        writeSession({
          access_token: session.access_token,
          expires_at: session.expires_at,
          //  🔴 배너를 그리기 위한 표시다. 권한이 아니다 (`lib/web/session.ts` 의 주석).
          guest: true,
        })
        //  ⚠ `replace` 다 — 뒤로 가기로 이 화면에 돌아오면 세션을 또 발급받는다.
        window.location.replace(session.entry_path)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err)
      })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="center">
        <div className="card center-card">
          <ErrorState error={error} />
          <a className="btn btn-sm" href="/">랜딩으로 돌아가기</a>
        </div>
      </div>
    )
  }
  //  loading 은 skeleton 이고 문구가 없다 (DESIGN_BRIEF §5).
  return (
    <div className="center">
      <div className="card center-card"><div className="skeleton" /><div className="skeleton" /></div>
    </div>
  )
}
