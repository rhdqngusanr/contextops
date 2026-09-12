'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { LOGIN_WORDS, NO_ACCOUNT_HINT, NO_ACCOUNT_WORDS, authConfig, oauthUrl, sendMagicLink } from '../../lib/web/auth'
import { pick } from '../../lib/i18n/localized'
import { useLocale } from '../../lib/i18n/provider'
import { PRIVACY_PATH, PRIVACY_WORDS } from '../../lib/web/privacy'
import { Note } from '../../components/chips'

// =====================================================================
//  화면 2 — 로그인 (SPEC §9 · DESIGN_BRIEF §4 「화면 2」)
//
//  ★ 상태가 셋이다 (DESIGN_BRIEF §5): 기본 · 보내는 중(버튼 비활성) · 오류.
//    loading 은 여기서 skeleton 이 아니다 — 기다리는 것이 **목록이 아니라 내 동작**이라
//    누른 버튼 자리에서 말해 주는 편이 맞다.
//
//  🔴 **설정이 없으면 되는 척하지 않는다.** Supabase 프로젝트는 사람이 만든다
//    (docs/STATUS.md 「막힌 것」). 값이 없으면 버튼을 비활성으로 두고 **왜인지** 적는다.
//    ★ 왜 — 눌러도 아무 일이 없으면 「고장」으로 읽힌다. 아직 없는 것과 고장 난 것은
//      달라야 한다 (`app/page.tsx` 의 같은 주석).
//
//  ⚠ accent 는 화면당 주요 액션 하나다 (DESIGN_BRIEF §3) — [GitHub로 계속] 뿐이다.
// =====================================================================

function LoginCard() {
  const params = useSearchParams()
  //  로그인 뒤의 기본 목적지는 「내 팀」 홈이다 (INBOX H9) — 팀이 없으면 홈이 팀 만들기로 보낸다.
  const next = params.get('next') ?? '/t'
  const config = authConfig()
  const locale = useLocale()
  const words = pick(LOGIN_WORDS, locale)
  const guest = pick(NO_ACCOUNT_WORDS, locale)

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function magicLink() {
    if (!config) return
    setBusy(true)
    setError(null)
    try {
      await sendMagicLink(config, email, next)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : words.sendFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <div className="card center-card">
        <div className="col-tight">
          <h1 className="text-section">ContextOps</h1>
          {/* 슬로건은 랜딩의 것이다 — 이 카드는 첫 3초에 「로그인」이라고 말해야 한다 (2026-09-11). */}
          <p className="plain-line">{words.lead}</p>
        </div>

        {config === null ? (
          //  🔴 「아직 연결되지 않았다」를 그대로 말한다 (DESIGN_BRIEF §2-5).
          <div className="card state-box">
            <Note tone="warn">{words.notConnected}</Note>
            <p className="meta">
              <span className="mono">NEXT_PUBLIC_SUPABASE_URL</span> {words.envAnd}{' '}
              <span className="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> {words.needsEnv}
              (<span className="mono">apps/web/.env.example</span>).
            </p>
          </div>
        ) : null}

        {/* 🔴 설정이 없으면 **비활성 버튼**이지 accent 링크가 아니다.
            ★ 왜 — `<a>` 에는 `:disabled` 가 안 먹어서, 눌러도 아무 일 없는 파란 버튼이
              남는다. 그건 「아직 없다」가 아니라 「고장」으로 읽힌다 (눈으로 확인했다:
              .ci/shots/s2-login.png 첫 판). 태그 자체를 바꿔야 상태가 보인다. */}
        {config === null ? (
          <button type="button" className="btn text-center" disabled>{words.github}</button>
        ) : (
          <a className="btn btn-primary text-center" href={oauthUrl(config, 'github', next)}>
            {words.github}
          </a>
        )}

        {/* 🔴 이메일 문은 플래그 뒤다 (`lib/web/auth.ts` 머리) — 기본 SMTP 로는 심사위원에게 메일이
            절대 안 가서, 열어 두면 「보냈습니다」 뒤에 아무것도 안 오는 문이 된다. */}
        {config?.emailLogin ? (
          <div className="col-tight">
            <label className="label" htmlFor="email">{words.emailLabel}</label>
            <div className="row">
              <input
                id="email"
                className="input"
                type="email"
                placeholder="you@team.com"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                disabled={busy || email.length === 0}
                onClick={magicLink}
              >
                {busy ? words.sending : words.send}
              </button>
            </div>
            {sent ? <Note tone="ok">{words.sent}</Note> : null}
            {error ? <Note tone="bad">{error}</Note> : null}
          </div>
        ) : null}

        <div className="col-tight">
          {/* DESIGN_BRIEF 화면 2 「심사위원이신가요? 샘플 팀으로 둘러보기」 — 문구의 정본은
              `NO_ACCOUNT_HINT` 하나다(GitHub 계정이 없는 사람에게도 같은 문이다).
              주소는 랜딩과 같은 `/demo` 하나다 — 게스트 세션을 받는 자리가 둘이 되면 안 된다.
              ★ 심사위원의 문이 화면에서 제일 작은 글자면 GitHub 계정이 없는 사람은 검정 버튼 앞에서 멈춘다 —
                outline 버튼으로 세운다. accent 는 [GitHub로 계속] 하나 그대로다. */}
          <p className="meta">{guest.text}</p>
          <a className="btn text-center" href={NO_ACCOUNT_HINT.href}>{guest.link}</a>
        </div>
        {/* 로그인 전에 읽을 수 있어야 한다 — 무엇을 받고 AI 가 무엇을 보는지 (INBOX H4). */}
        <p className="meta"><a href={PRIVACY_PATH}>{pick(PRIVACY_WORDS, locale).label}</a></p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  //  ⚠ `useSearchParams` 는 Suspense 경계가 있어야 정적 렌더에서 빌드가 막히지 않는다.
  return (
    <Suspense fallback={<div className="center"><div className="card center-card"><div className="skeleton" /></div></div>}>
      <LoginCard />
    </Suspense>
  )
}
