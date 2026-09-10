import { ERROR_HINT } from '../lib/web/api'
import { NO_ACCOUNT_HINT } from '../lib/web/auth'

// =====================================================================
//  없는 주소 (2026-09-11) — Next 기본 영어 화면(「404 | This page could not be found.」)이 떴다.
//  문구는 `ERROR_HINT.NOT_FOUND` 하나, 갈 곳은 첫 화면과 샘플 팀 — 새 문자열을 만들지 않는다.
// =====================================================================

export default function NotFound() {
  return (
    <div className="center">
      <div className="card center-card state-box">
        <p className="ink">{ERROR_HINT.NOT_FOUND}</p>
        <span className="row wrap">
          <a className="btn btn-sm" href="/">첫 화면으로</a>
          <a className="btn btn-sm" href={NO_ACCOUNT_HINT.href}>{NO_ACCOUNT_HINT.link}</a>
        </span>
      </div>
    </div>
  )
}
