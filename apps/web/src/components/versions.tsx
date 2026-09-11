import type { ReactNode } from 'react'

import type { VersionRow } from '../lib/web/queries'
import { VersionPill } from './chips'
import { ScrollTable } from './scroll-table'

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
  empty,
}: {
  versions: VersionRow[]
  packHref: (semver: string) => string
  /** 빈 자리는 `ScreenEmpty` 가 그린다 — 문구·다음 행동의 정본은 `EMPTY_PLACES` 다 (FINDINGS 133). */
  empty: ReactNode
}) {
  if (versions.length === 0) return <>{empty}</>
  return (
    <ScrollTable>
      <table className="table">
        <thead>
          <tr>
            <th>버전</th>
            <th>발행 시각</th>
            <th>변경 요약</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id}>
              {/* 승인본 해시 칸은 뺐다 — 뜻 없는 8자 코드가 표의 한 칸을 먹었다 (2026-09-11). 전체는 툴팁에 남는다. */}
              <td title={`승인본 ${v.snapshot_hash}`}><VersionPill semver={v.semver} official={v.is_official} /></td>
              <td className="mono">{v.published_at.replace('T', ' ').slice(0, 16)}</td>
              {/* 빈 칸의 `—` 는 **장식이다** — `aria-hidden` 이라야 `ink-4`(비활성 색)를
                  쓸 수 있다. 읽어야 하는 글자에 그 색을 쓰면 design-tokens.test.ts 가 막는다. */}
              {/* `cell-prose` = 줄바꿈해도 되는 **문장** 칸. 좁은 폭에서 최소 폭이 없으면
                  「승인된 / 제안 1건 / 반영 — / 재시도 / 정책」처럼 두세 낱말씩 다섯 줄로
                  쪼개진다 (2026-09-11 · 375px 에서 봤다). */}
              <td className="cell-prose">{v.change_summary ?? <span aria-hidden="true" className="ink-4">—</span>}</td>
              <td><a className="btn btn-sm" href={packHref(v.semver)}>Pack 보기</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  )
}
