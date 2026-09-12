'use client'

import type { ReactNode } from 'react'

import { ApiClientError, ERROR_HINT_WORDS, messageOf } from '../lib/web/api'
import { NO_ACCOUNT_HINT } from '../lib/web/auth'
import { APP_CHROME } from '../lib/web/chrome'
import { EMPTY_PLACES, EMPTY_WORDS, emptyNextHref, type EmptySlot } from '../lib/web/screens'
import { localized, pick } from '../lib/i18n/localized'
import { useLocale } from '../lib/i18n/provider'
import { Note } from './chips'

/**
 * 세 상태가 같이 쓰는 낱말. 문장이 아니라 **버튼과 이름표**라 여기 있다.
 * ⚠ 화면별 문구는 `EMPTY_WORDS`(자리별)다 — 여기 쌓지 마라.
 */
export const STATE_WORDS = localized({
  ko: {
    retry: '다시 시도',
    requestId: '문의할 때 이 번호를 알려 주세요 · 요청 번호',
    goSignIn: '로그인하러 가기',
    startMyTeam: '내 팀으로 시작하기',
    close: '닫기',
  },
  en: {
    retry: 'Try again',
    requestId: 'Quote this number when you contact us · request id',
    goSignIn: 'Go to sign-in',
    startMyTeam: 'Start with my own team',
    close: 'Close',
  },
})

// =====================================================================
//  loading / empty / error — **세 상태를 전부** 그리는 자리 (DESIGN_BRIEF §5)
//
//  ★ 왜 컴포넌트로 묶나 — 화면마다 손으로 적으면 반드시 하나가 빠지고, 빠진 화면은
//    빈 채로 멀쩡해 보인다. 「데모도 실제 상태를 숨기지 않는다」(DESIGN_BRIEF §2-5)를
//    지키려면 세 상태가 **한 벌**로 와야 한다.
//
//  ⚠ loading 은 skeleton 이고 **문구가 없다** (DESIGN_BRIEF §5 첫 줄).
//    「불러오는 중…」을 적지 마라 — 매번 다르게 적히고 화면이 시끄러워진다.
// =====================================================================

export function Skeleton({ rows = 3 }: { rows?: number }) {
  //  ⚠ 보이는 글자가 아니라 화면 낭독기가 읽는 이름이다 — 그래도 언어를 탄다.
  const chrome = pick(APP_CHROME, useLocale())
  return (
    <div className="col-tight" aria-busy="true" aria-label={chrome.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="state-box">
      <p>{message}</p>
      {action}
    </div>
  )
}

/**
 * 🔴 **빈 상태는 여기로만 그린다** (FINDINGS 133) — 문구도 다음 행동도 표에서 온다
 * (`lib/web/screens.ts` 의 `EMPTY_PLACES`).
 *
 * ★ 왜 — 「항목이 없습니다」에서 갈 곳이 없으면 첫 사용자가 거기서 막힌다. 화면마다
 *   손으로 적으면 **한 화면만 버튼이 없는 채로** 남고, 비어 있을 뿐 멀쩡해 보인다.
 * ⚠ `message` 는 **상태에 따라 달라지는 문장**만 넘긴다 (제안 목록의 필터 같은 것).
 *   화면의 기본 문구를 여기서 덮어쓰면 표가 정본이 아니게 된다.
 */
export function ScreenEmpty({ slot, base, message }: { slot: EmptySlot; base: string; message?: string }) {
  //  🔴 **구조는 표에서 · 글자는 이 언어의 한 벌에서** (`screens.ts` 의 두 표).
  //     버튼이 어디로 가는지(`next.to`)는 언어가 없고, 문장만 언어를 탄다.
  const place = EMPTY_PLACES[slot]
  const words = pick(EMPTY_WORDS, useLocale())[slot]
  const next = place.next
  return (
    <EmptyState
      message={message ?? words.message}
      action={next ? (
        <a
          className={next.tone === 'accent' ? 'btn btn-primary' : 'btn'}
          href={emptyNextHref(base, next)}
        >
          {words.nextLabel ?? next.label}
        </a>
      ) : undefined}
    />
  )
}

/**
 * 오류는 **무엇을 해야 하는지**로 끝난다. 스택도 서버 문구도 띄우지 않는다.
 * ⚠ `request_id` 는 보여 준다 — 그게 사용자가 문의할 때 우리가 로그를 찾는 유일한 열쇠다
 *   (SPEC §11 은 로그에 `request_id` 만 남긴다).
 */
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const words = pick(STATE_WORDS, useLocale())
  const requestId = error instanceof ApiClientError ? error.requestId : undefined
  return (
    <div className="state-box">
      <Note tone="bad">{messageOf(error)}</Note>
      {retry ? <button type="button" className="btn btn-sm" onClick={retry}>{words.retry}</button> : null}
      {/* `request_id` 는 로그의 열 이름이다 — 왜 보여 주는지(문의용)를 같이 말한다 (2026-09-11). 값은 그대로. */}
      {requestId ? <span className="meta">{words.requestId} <span className="mono">{requestId}</span></span> : null}
    </div>
  )
}

/**
 * 로그인이 없어서 못 여는 화면. 오류가 아니라 **다음 걸음**을 보여 준다.
 * ★ 두 번째 문이 있다 — 게스트 세션이 만료된 심사위원이 여기 온다 (INBOX H2). 「로그인하러 가기」만 있으면
 *   계정이 없는 사람은 막다른 길이다. 문구·주소의 정본은 로그인 화면과 같은 `NO_ACCOUNT_HINT` 다.
 */
export function NeedsLogin({ next }: { next: string }) {
  const words = pick(STATE_WORDS, useLocale())
  const hint = pick(ERROR_HINT_WORDS, useLocale())
  return (
    <div className="state-box">
      <p className="ink">{hint.UNAUTHORIZED}</p>
      <span className="row">
        <a className="btn btn-sm" href={`/login?next=${encodeURIComponent(next)}`}>{words.goSignIn}</a>
        <a className="btn btn-sm" href={NO_ACCOUNT_HINT.href}>{NO_ACCOUNT_HINT.link}</a>
      </span>
    </div>
  )
}

/**
 * 🔴 읽기 전용 주체가 쓰기 버튼을 눌렀을 때 **모달 대신 그 자리에** 뜨는 이유 (FINDINGS 121·135).
 * ★ 왜 모달이 아닌가 — 모달은 「진행할 수 있다」는 모양이다. 못 하는 일에 그 모양을 주면
 *   사람은 칸을 다 채운 뒤에야 403 을 본다. 이유는 누른 자리 바로 밑에, 다음 걸음과 같이.
 * ★ `role="status"` — 배너(`demo-banner.tsx`)와 같은 종류의 말이고, 오류가 아니다 (서버를 부르지 않았다).
 * ⚠ 문장은 여기서 짓지 않는다 — `reason` 은 `writeDoor()` 가 `GUEST_HINT` 에서 읽어 온 것이다.
 */
export function ReadOnlyNotice({ reason, onClose }: { reason: string; onClose?: () => void }) {
  const words = pick(STATE_WORDS, useLocale())
  return (
    <div className="card pad-sm row-between" role="status">
      <Note tone="warn">{reason}</Note>
      <span className="row">
        <a className="btn btn-sm" href="/login">{words.startMyTeam}</a>
        {onClose ? <button type="button" className="btn btn-sm" onClick={onClose}>{words.close}</button> : null}
      </span>
    </div>
  )
}
