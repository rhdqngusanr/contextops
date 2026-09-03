'use client'

import { Suspense, useEffect, useState } from 'react'

import { readCallbackHash } from '../../../lib/web/auth'
import { writeSession } from '../../../lib/web/session'

// =====================================================================
//  로그인 되돌아오는 자리 (화면 2 의 뒷면 · SPEC §5 인증 (a))
//
//  ★ 토큰은 URL **조각(`#`)** 으로 온다. 조각은 브라우저가 서버로 안 보낸다 —
//    그래서 액세스 토큰이 우리 서버 로그에 남을 수가 없다 (SPEC §11 · P1).
//    ⚠ 저장한 다음 **주소에서 조각을 지운다.** 안 지우면 뒤로 가기·공유로 토큰이 샌다.
//
//  ★ 이 페이지가 세션을 만드는 **유일한 자리**다. 저장은 `lib/web/session.ts` 하나.
// =====================================================================

function Callback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const result = readCallbackHash(window.location.hash, new Date())
    if (!result.ok) {
      setError(result.message)
      return
    }
    writeSession({ access_token: result.access_token, expires_at: result.expires_at })

    const next = new URL(window.location.href).searchParams.get('next') ?? '/t/new'
    //  ⚠ 바깥 주소로는 못 보낸다. `next` 는 그냥 문자열이고, 검사 없이 쓰면
    //    로그인 링크 하나로 남의 사이트로 보내는 문이 된다 (오픈 리다이렉트).
    const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/t/new'
    window.location.replace(safe)
  }, [])

  if (error) {
    return (
      <div className="center">
        <div className="card center-card">
          <p className="ink">✕ {error}</p>
          <a className="btn" href="/login">로그인으로 돌아가기</a>
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

export default function CallbackPage() {
  return <Suspense fallback={null}><Callback /></Suspense>
}
