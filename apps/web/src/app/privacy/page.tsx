import type { Metadata } from 'next'

import type { Locale } from '../../lib/i18n/locale'

import { LANDING } from '../../components/landing'
import { fill } from '../../lib/i18n/format'
import { pick } from '../../lib/i18n/localized'
import { serverLocale } from '../../lib/i18n/server'
import { SUBMISSION_IDENTITY } from '../../lib/web/submission'
import { PRIVACY_PAGE_WORDS, PRIVACY_WORDS } from '../../lib/web/privacy'


// =====================================================================
//  `/privacy` — 개인정보 처리방침 (INBOX H4 · 2026-09-10)
//
//  ★ 정적이다 — 세션을 읽지 않는다 (랜딩과 같은 「정적」 표). 본문의 정본은 `lib/web/privacy.ts` 하나이고
//    여기는 그것을 그릴 뿐이다. 문장을 고치려면 그 파일을 고쳐라 — 붙여넣기 칸의 고지가 같은 표를 읽는다.
//  ⚠ 링크는 랜딩 푸터(`LANDING_FOOT.privacy`)와 로그인 카드에 있다 — 두 자리가 사람이 처음 오는 곳이다.
// =====================================================================

export async function generateMetadata(): Promise<Metadata> {
  return { title: pick(PRIVACY_WORDS, await serverLocale()).label }
}

export default async function PrivacyPage() {
  return <PrivacyView locale={await serverLocale()} />
}

/**
 * 🔴 **순수하다 — 요청을 안 읽는다.** 그래서 시험이 언어를 직접 주고 그릴 수 있다
 *    (`metadataFor` 와 같은 자리의 판단). 위 페이지는 「이번 요청의 언어」를 알아내는 한 줄이다.
 */
export function PrivacyView({ locale }: { locale: Locale }) {
  const privacy = pick(PRIVACY_WORDS, locale)
  const words = pick(PRIVACY_PAGE_WORDS, locale)
  const foot = pick(LANDING, locale).foot
  return (
    <div className="center">
      <article className="card center-card">
        <header className="col-tight">
          <h1 className="text-section">{privacy.title}</h1>
          {/* 「시험이 대조한다」는 개발자끼리의 말이다 — 읽는 사람에게 뜻이 있는 것은 「코드가 바뀌면 같이 바뀐다」다. */}
          <p className="meta">{fill(words.updated, { on: privacy.updated })}</p>
        </header>

        {privacy.sections.map((section) => (
          <section key={section.heading} className="col-tight">
            {/* 절 머리가 본문(14.5px)보다 작은 라벨(11.5px)이면 30초에 훑는 사람에게 안 보인다. */}
            <h2 className="row-name">{section.heading}</h2>
            {section.lines.map((line) => <p key={line} className="ink-2">{line}</p>)}
          </section>
        ))}

        <footer className="row wrap">
          <a className="btn btn-sm" href="/">{words.toLanding}</a>
          <a className="meta" href={`${SUBMISSION_IDENTITY.repoUrl}/issues`} rel="noreferrer">{words.contact}</a>
          <a className="meta" href={foot.limits.href} rel="noreferrer">{foot.limits.label}</a>
        </footer>
      </article>
    </div>
  )
}
