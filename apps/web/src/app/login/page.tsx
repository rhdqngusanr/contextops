'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { authConfig, oauthUrl, sendMagicLink } from '../../lib/web/auth'

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
  const next = params.get('next') ?? '/t/new'
  const config = authConfig()

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
      setError(err instanceof Error ? err.message : '메일을 보내지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <div className="card center-card">
        <div className="col-tight">
          <h1 className="text-section">ContextOps</h1>
          <p className="ink-3">팀의 지식과 Claude의 기억을 같은 방향으로.</p>
        </div>

        {config === null ? (
          //  🔴 「아직 연결되지 않았다」를 그대로 말한다 (DESIGN_BRIEF §2-5).
          <div className="card state-box">
            <span aria-hidden="true" className="ink-warn">⚠</span>
            <p className="ink">로그인 서버가 아직 연결되지 않았습니다.</p>
            <p className="meta">
              <span className="mono">NEXT_PUBLIC_SUPABASE_URL</span> 과{' '}
              <span className="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> 가 필요합니다
              (<span className="mono">apps/web/.env.example</span>).
            </p>
          </div>
        ) : null}

        <a
          className="btn btn-primary text-center"
          aria-disabled={config === null}
          href={config === null ? undefined : oauthUrl(config, 'github', next)}
        >
          GitHub로 계속
        </a>

        <div className="col-tight">
          <label className="label" htmlFor="email">이메일 링크 받기</label>
          <div className="row">
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@team.com"
              value={email}
              disabled={config === null || busy}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={config === null || busy || email.length === 0}
              onClick={magicLink}
            >
              {busy ? '보내는 중' : '보내기'}
            </button>
          </div>
          {sent ? <p className="meta ink-ok">✓ 메일을 보냈습니다. 링크를 열면 로그인됩니다.</p> : null}
          {error ? <p className="meta ink-bad">✕ {error}</p> : null}
        </div>

        <p className="meta">
          {/* ⚠ 게스트 데모(`/demo`)는 PLAN P4 둘째 행이다. 아직 없는 곳으로 링크를
              걸면 404 가 나고, 그건 「고장」으로 읽힌다 — 없는 것은 없다고 적는다. */}
          심사위원이신가요? 샘플 팀 둘러보기는 준비 중입니다.
        </p>
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
