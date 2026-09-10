import type { Metadata } from 'next'

import { LANDING_FOOT, SUBMISSION_IDENTITY } from '../../components/landing'
import { PRIVACY, PRIVACY_LABEL } from '../../lib/web/privacy'

// =====================================================================
//  `/privacy` — 개인정보 처리방침 (INBOX H4 · 2026-09-10)
//
//  ★ 정적이다 — 세션을 읽지 않는다 (랜딩과 같은 「정적」 표). 본문의 정본은 `lib/web/privacy.ts` 하나이고
//    여기는 그것을 그릴 뿐이다. 문장을 고치려면 그 파일을 고쳐라 — 붙여넣기 칸의 고지가 같은 표를 읽는다.
//  ⚠ 링크는 랜딩 푸터(`LANDING_FOOT.privacy`)와 로그인 카드에 있다 — 두 자리가 사람이 처음 오는 곳이다.
// =====================================================================

export const metadata: Metadata = { title: PRIVACY_LABEL }

export default function PrivacyPage() {
  return (
    <div className="center">
      <article className="card center-card">
        <header className="col-tight">
          <h1 className="text-section">{PRIVACY.title}</h1>
          {/* 「시험이 대조한다」는 개발자끼리의 말이다 — 읽는 사람에게 뜻이 있는 것은 「코드가 바뀌면 같이 바뀐다」다. */}
          <p className="meta">마지막 갱신 {PRIVACY.updated} · 이 문장은 코드와 같은 저장소에 있어 코드가 바뀌면 같이 바뀝니다.</p>
        </header>

        {PRIVACY.sections.map((section) => (
          <section key={section.heading} className="col-tight">
            {/* 절 머리가 본문(14.5px)보다 작은 라벨(11.5px)이면 30초에 훑는 사람에게 안 보인다. */}
            <h2 className="row-name">{section.heading}</h2>
            {section.lines.map((line) => <p key={line} className="ink-2">{line}</p>)}
          </section>
        ))}

        <footer className="row wrap">
          <a className="btn btn-sm" href="/">랜딩으로</a>
          <a className="meta" href={`${SUBMISSION_IDENTITY.repoUrl}/issues`} rel="noreferrer">Issues 로 연락하기</a>
          <a className="meta" href={LANDING_FOOT.limits.href} rel="noreferrer">{LANDING_FOOT.limits.label}</a>
        </footer>
      </article>
    </div>
  )
}
