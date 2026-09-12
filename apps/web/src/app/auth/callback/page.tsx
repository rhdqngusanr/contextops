'use client'

import { Suspense, useEffect, useState } from 'react'

import { Note } from '../../../components/chips'
import { CALLBACK_WORDS, NO_ACCOUNT_HINT, NO_ACCOUNT_WORDS, readCallbackHash } from '../../../lib/web/auth'
import { pick } from '../../../lib/i18n/localized'
import { useLocale } from '../../../lib/i18n/provider'
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
  //  ⚠ 문장이 아니라 **갈래**(`reason`)를 들고 있는다 — 문장은 그리는 자리에서 이 언어로 고른다.
  const [error, setError] = useState<{ reason: 'incomplete' | 'no_token'; code?: string } | null>(null)
  const locale = useLocale()
  const words = pick(CALLBACK_WORDS, locale)
  const guest = pick(NO_ACCOUNT_WORDS, locale)

  useEffect(() => {
    const result = readCallbackHash(window.location.hash, new Date())
    if (!result.ok) {
      setError({ reason: result.reason, code: result.code })
      return
    }
    writeSession({ access_token: result.access_token, expires_at: result.expires_at })

    const next = new URL(window.location.href).searchParams.get('next') ?? '/t'
    //  ⚠ 바깥 주소로는 못 보낸다. `next` 는 그냥 문자열이고, 검사 없이 쓰면
    //    로그인 링크 하나로 남의 사이트로 보내는 문이 된다 (오픈 리다이렉트).
    const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/t'
    window.location.replace(safe)
  }, [])

  if (error) {
    //  ⚠ 원인은 사람 말(`CALLBACK_CODE_HINT`)로 먼저, 코드는 mono 로 뒤에 — 심사위원은 「내가 취소했구나」를,
    //    운영자는 「공급자가 꺼져 있다」(validation_failed)를 화면만 보고 가른다. 그리고 심사위원에게는 로그인
    //    없이 볼 수 있는 문(`/demo`)을 그 자리에서 준다.
    return (
      <div className="center">
        <div className="card center-card">
          <Note tone="bad">{words[error.reason]}</Note>
          {error.code ? <p className="meta">{words.codeHint[error.code] ?? words.unknownCause} <span className="mono">{error.code}</span></p> : null}
          <div className="row">
            <a className="btn" href="/login">{words.backToLogin}</a>
            <a className="btn" href={NO_ACCOUNT_HINT.href}>{guest.link}</a>
          </div>
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
