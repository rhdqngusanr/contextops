import type { ReactNode } from 'react'

import { ApiClientError, ERROR_HINT, messageOf } from '../lib/web/api'

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
  return (
    <div className="col-tight" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="state-box">
      <span aria-hidden="true" className="ink-4">◌</span>
      <p>{message}</p>
      {action}
    </div>
  )
}

/**
 * 오류는 **무엇을 해야 하는지**로 끝난다. 스택도 서버 문구도 띄우지 않는다.
 * ⚠ `request_id` 는 보여 준다 — 그게 사용자가 문의할 때 우리가 로그를 찾는 유일한 열쇠다
 *   (SPEC §11 은 로그에 `request_id` 만 남긴다).
 */
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const requestId = error instanceof ApiClientError ? error.requestId : undefined
  return (
    <div className="state-box">
      <span aria-hidden="true" className="ink-bad">✕</span>
      <p className="ink">{messageOf(error)}</p>
      {retry ? <button type="button" className="btn btn-sm" onClick={retry}>다시 시도</button> : null}
      {requestId ? <span className="meta mono">request_id {requestId}</span> : null}
    </div>
  )
}

/** 로그인이 없어서 못 여는 화면. 오류가 아니라 **다음 걸음**을 보여 준다. */
export function NeedsLogin({ next }: { next: string }) {
  return (
    <div className="state-box">
      <span aria-hidden="true" className="ink-4">◌</span>
      <p className="ink">{ERROR_HINT.UNAUTHORIZED}</p>
      <a className="btn btn-sm" href={`/login?next=${encodeURIComponent(next)}`}>로그인하러 가기</a>
    </div>
  )
}
