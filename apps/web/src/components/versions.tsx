import type { VersionRow } from '../lib/web/queries'
import { VersionPill } from './chips'

// =====================================================================
//  버전 히스토리 — 세로 타임라인 (DESIGN_BRIEF §4 화면 5 마지막 줄)
//
//  ★ 왜 컴포넌트로 빼나 — 화면 5(히스토리)와 Pack 목록이 **같은 목록**을 그린다.
//    두 곳에 적으면 한쪽에만 `is_official` 이 빠지고, 그 화면은 어느 것이 공식인지
//    말하지 못한다.
//
//  ⚠ 「롤백 발행」 버튼은 아직 없다 (SPEC §6 「롤백 = 새 버전 발행」). 누르면 아무 일도
//    없는 버튼을 두지 마라 — 있는 것과 없는 것이 구별되지 않는다.
// =====================================================================

export function VersionHistory({
  versions,
  packHref,
  emptyMessage,
}: {
  versions: VersionRow[]
  packHref: (semver: string) => string
  emptyMessage: string
}) {
  if (versions.length === 0) {
    return (
      <div className="state-box">
        <span aria-hidden="true" className="ink-4">◌</span>
        <p>{emptyMessage}</p>
      </div>
    )
  }
  return (
    <div className="scroll-x">
      <table className="table">
        <thead>
          <tr>
            <th>버전</th>
            <th>snapshot</th>
            <th>발행 시각</th>
            <th>변경 요약</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id}>
              <td><VersionPill semver={v.semver} official={v.is_official} /></td>
              {/* 해시는 앞 8자만 + 전체는 title 로 (DESIGN_BRIEF §3 「타이포」). */}
              <td className="mono" title={v.snapshot_hash}>{v.snapshot_hash.slice(0, 8)}</td>
              <td className="mono">{v.published_at.replace('T', ' ').slice(0, 16)}</td>
              <td>{v.change_summary ?? <span className="ink-4">—</span>}</td>
              <td><a className="btn btn-sm" href={packHref(v.semver)}>Pack 보기</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
