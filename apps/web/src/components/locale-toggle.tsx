'use client'

import { useState } from 'react'

import { useLocale } from '../lib/i18n/provider'
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_LABEL,
  LOCALE_SHORT,
  LOCALES,
  type Locale,
} from '../lib/i18n/locale'
import styles from './locale-toggle.module.css'

// =====================================================================
//  KO / EN 토글 — 머리글의 한 자리 (2026-09-12)
//
//  ★ 왜 링크가 아니라 버튼인가 — 언어는 **주소가 아니라 사람의 설정**이다. `/en` 으로
//    가르면 같은 화면이 주소 둘을 갖고, 공유된 링크가 상대의 언어를 덮어쓴다.
//
//  ★ 누르면 쿠키를 쓰고 **페이지를 다시 연다.** 랜딩은 서버 컴포넌트라 서버가 다시 그려야
//    글자가 바뀌고, 클라이언트 화면은 `LocaleProvider` 의 값이 따라 바뀐다.
//
//  ⚠ `useRouter().refresh()` 를 **일부러 안 쓴다** (2026-09-12). 그쪽이 UX 는 부드럽지만
//    `next/navigation` 이 앱 라우터 문맥을 요구해서, Next 밖에서 그리는 자리가 전부 죽는다 —
//    이 저장소에는 그런 자리가 둘 있다: `scripts/dump-landing.tsx`(문장을 글자로 뽑는 덤프)와
//    OG 이미지 그리기. 언어 전환은 사람이 한 번 누르는 일이라 전체 새로고침으로 충분하다.
//
//  ⚠ 언어가 셋이 되면 이 컴포넌트는 **고치지 않아도 된다** — `LOCALES` 를 돌기 때문이다.
//    다만 머리글이 좁으므로 넷부터는 `<select>` 로 바꿔라 (그때 이 주석을 지워라).
// =====================================================================

export function LocaleToggle() {
  const current = useLocale()
  const [pending, setPending] = useState(false)

  const choose = (next: Locale): void => {
    if (next === current) return
    //  ⚠ `path=/` 가 없으면 쿠키가 지금 경로에만 붙어서, 랜딩에서 고른 언어가 앱 화면에서 풀린다.
    //  ⚠ `SameSite=Lax` — 언어 설정은 남의 사이트에서 바뀔 이유가 없다.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`
    setPending(true)
    window.location.reload()
  }

  return (
    <div className={styles.group} role="group" aria-label={ARIA_LABEL[current]}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          className={styles.option}
          //  🔴 눌린 상태를 **글자와 함께** 말한다 — 색만으로 말하면 화면 낭독기가 못 읽는다.
          aria-pressed={locale === current}
          //  ⚠ 이름은 그 언어로 적는다 (`LOCALE_LABEL` 의 주석) — 한국어를 못 읽는 사람이
          //    자기 언어를 찾는 유일한 단서다.
          aria-label={LOCALE_LABEL[locale]}
          disabled={pending}
          onClick={() => { choose(locale) }}
        >
          {LOCALE_SHORT[locale]}
        </button>
      ))}
    </div>
  )
}

/**
 * 묶음 자체의 이름. 문구가 둘뿐이라 표를 따로 파일로 빼지 않았다 —
 * ⚠ 여기에 문장을 더 쌓지 마라. 셋째가 생기면 `localized()` 표로 올려라.
 */
const ARIA_LABEL: Record<Locale, string> = {
  ko: '화면 언어',
  en: 'Display language',
}
