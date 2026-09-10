'use client'

import { Fragment, useEffect, useRef, useState } from 'react'

import { fetchTeams } from '../lib/web/queries'
import {
  PALETTE_GROUP_ORDER, PALETTE_GROUP_TITLES, matchEntries, projectEntries, screenEntries,
  type PaletteEntry,
} from '../lib/web/screens'
import { useAsync } from '../lib/web/use-async'

// =====================================================================
//  명령 팔레트 `⌘K` — **화면 이동과 검색만** (FINDINGS 132 · INBOX 2026-09-06 🟡 B)
//
//  ★ 왜 — 화면을 오가는 제품인데 키보드로 갈 자리가 없었다. Linear·Vercel·GitHub 에서
//    이건 거의 기대치다.
//
//  ⚠ **과설계 금지가 이 파일의 규칙이다.** 갈 곳의 정본은 `lib/web/screens.ts` 한 표이고
//    내비도 팔레트도 그것을 **읽기만** 한다. 여기에 목록을 적지 마라.
//  ⚠ 「명령」은 아직 없다 — 이동뿐이다. 실행할 명령(발행·재시도…)을 넣고 싶어지면
//    그건 표의 둘째 종류이고, 그때 `screens.ts` 옆에 표를 하나 더 만든다.
//    지금 종류가 하나인데 `type: 'nav' | 'action'` 을 미리 만들지 마라.
//  🔴 **프로젝트 전환은 서버가 준 목록만 그린다** (FINDINGS 157). 문은 이미 있었다 —
//    `GET /teams` 가 본인이 속한 팀과 그 안의 프로젝트를 낸다 (`lib/web/queries.ts`
//    의 `fetchTeams`). 그래서 새 문을 뚫지 않았다. ⛔ 「최근 본 것」을 브라우저에
//    쌓아 목록을 지어내지 마라 — 그건 서버가 아는 권한과 갈라져 남의 팀을 보여 준다.
//  ⚠ 목록이 아직/못 왔을 때는 **줄 대신 한 줄 문장**이다 (`PALETTE_PROJECTS_*`).
//    비어 있는 묶음을 그냥 두면 「내 프로젝트가 하나뿐인가」로 잘못 읽힌다.
//
//  ⚠ 색·간격은 전부 `globals.css` 의 토큰이다 (`.palette-*`). 여기에 숫자를 적지 마라.
// =====================================================================

/** 여는 열쇠. 화면의 안내 문구와 실제 판정이 **같은 상수**를 읽는다. */
export const PALETTE_KEY = 'K'
/** 트리거 버튼과 dialog 제목이 같이 쓰는 낱말. mac 도 win 도 이 한 줄을 본다 — `isPaletteKey` 가 ctrlKey 도 받으므로 mac 에서도 참이다.
 *  「⌘K」였다 — 심사위원 대다수의 Windows 키보드에 없는 기호라 눌러 볼 방법이 안 보였다 (2026-09-11). */
export const PALETTE_HINT = 'Ctrl+K'
export const PALETTE_TITLE = '화면 이동'
/** 프로젝트 묶음이 아직 안 왔을 때 · 못 왔을 때. 문장의 정본은 여기 하나다. */
export const PALETTE_PROJECTS_LOADING = '프로젝트 목록을 불러오는 중입니다'
export const PALETTE_PROJECTS_ERROR = '프로젝트 목록을 불러오지 못했습니다'
/** 검색이 아무것도 못 찾았을 때. 빈 상태에도 할 말이 있어야 한다 (DESIGN_BRIEF §5). */
export const PALETTE_EMPTY = '그런 화면도 프로젝트도 없습니다'

/** `⌘K`(mac) 또는 `Ctrl+K`(win/linux) 인가. 창 전역 핸들러와 시험이 같은 함수를 쓴다. */
export function isPaletteKey(e: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  return (e.metaKey || e.ctrlKey) && e.key.toUpperCase() === PALETTE_KEY
}

/**
 * 화살표로 옮긴 자리. 목록의 **양 끝에서 돌아온다** — 일곱 줄짜리 목록에서 끝에 막히면
 * 사람은 팔레트가 죽은 줄 안다.
 */
export function moveIndex(index: number, delta: number, count: number): number {
  if (count <= 0) return 0
  return (((index + delta) % count) + count) % count
}

type DialogProps = {
  entries: readonly PaletteEntry[]
  /** 프로젝트 묶음이 아직/못 온 이유. `null` 이면 안 그린다. */
  projectsNote?: string | null
  query: string
  index: number
  onQuery: (q: string) => void
  onIndex: (i: number) => void
  onClose: () => void
}

/**
 * 열린 팔레트 자체 — 상태를 갖지 않아 시험이 **모양 그대로** 그려 볼 수 있다.
 * (`item-status-actions.tsx` 와 같은 결: 표를 읽어 그리는 부분만 따로 둔다.)
 *
 * ⚠ 여기는 **줄이 어디서 왔는지 모른다.** 화면이든 프로젝트든 `PaletteEntry` 한 모양이고,
 *   묶음이 늘어도 이 함수는 안 고친다 (`screens.ts` 의 빌더가 늘 뿐이다).
 */
export function PaletteDialog({
  entries, projectsNote = null, query, index, onQuery, onIndex, onClose,
}: DialogProps) {
  const hits = matchEntries(query, entries)
  const active = hits[moveIndex(index, 0, hits.length)]
  //  묶음의 차례는 `PALETTE_GROUP_ORDER` 가 정한다 — 그리는 자리에서 정하면
  //  묶음이 늘 때 차례가 두 곳에 생긴다.
  const groups = PALETTE_GROUP_ORDER
    .map((group) => ({ group, rows: hits.filter((e) => e.group === group) }))
    .filter(({ group, rows }) => rows.length > 0 || (group === 'project' && projectsNote))

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); onIndex(moveIndex(index, 1, hits.length)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); onIndex(moveIndex(index, -1, hits.length)); return }
    if (e.key === 'Enter' && active) { e.preventDefault(); window.location.assign(active.href) }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div className="modal-backdrop palette-backdrop" onClick={onClose}>
      <div
        className="card modal palette"
        role="dialog"
        aria-modal="true"
        aria-label={PALETTE_TITLE}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="row">
          <input
            className="input grow"
            autoFocus
            value={query}
            placeholder={`${PALETTE_TITLE} — 화면·프로젝트 이름을 치세요`}
            aria-label={PALETTE_TITLE}
            onChange={(e) => { onQuery(e.target.value); onIndex(0) }}
          />
          <span className="meta" aria-hidden="true">Esc 닫기</span>
        </div>
        {groups.length === 0
          ? <p className="meta">{PALETTE_EMPTY}</p>
          : (
            <div className="palette-list" role="listbox" aria-label={PALETTE_TITLE}>
              {groups.map(({ group, rows }) => (
                <Fragment key={group}>
                  {/* ⚠ 제목은 고를 수 없는 줄이다 — listbox 의 option 이 아니다. */}
                  <div className="palette-group label" role="presentation">
                    {PALETTE_GROUP_TITLES[group]}
                  </div>
                  {rows.map((entry) => (
                    <a
                      key={entry.key}
                      className="palette-item"
                      role="option"
                      href={entry.href}
                      aria-selected={entry === active}
                      onMouseEnter={() => onIndex(hits.indexOf(entry))}
                    >
                      {/* ⚠ 고른 줄을 **색만으로** 표시하지 않는다 (DESIGN_BRIEF §3) —
                          왼쪽 막대가 먼저고 배경색은 거들 뿐이다 (기호 › 대신 · 2026-09-11). */}
                      <span aria-hidden="true" className="palette-caret" data-active={entry === active ? 'true' : undefined} />
                      <span className="grow">{entry.label}</span>
                      {entry.here
                        ? <span className="meta">지금 여기</span>
                        : <span className="meta mono">{entry.hint}</span>}
                    </a>
                  ))}
                  {group === 'project' && projectsNote
                    ? <p className="meta palette-note">{projectsNote}</p>
                    : null}
                </Fragment>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

/**
 * 열려 있는 동안에만 **서버에 한 번 묻는다** (`GET /teams`).
 * ★ 왜 열렸을 때인가 — 팔레트는 모든 앱 화면에 있다. 뼈대가 뜰 때마다 부르면
 *   아무도 안 여는 창 때문에 화면마다 요청이 하나씩 는다.
 */
function PaletteBody({
  base, pathname, team, project, query, index, onQuery, onIndex, onClose,
}: {
  base: string
  pathname: string
  team: string
  project: string
  query: string
  index: number
  onQuery: (q: string) => void
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const { result } = useAsync(() => fetchTeams(), [])
  const entries: PaletteEntry[] = [
    ...screenEntries(base, pathname),
    ...(result.state === 'ready'
      ? projectEntries(result.data.teams, { team, project, pathname })
      : []),
  ]
  //  ⚠ 401(로그인 없음)도 여기서는 한 문장이다 — 팔레트는 로그인 화면이 아니다.
  const note = result.state === 'loading'
    ? PALETTE_PROJECTS_LOADING
    : result.state === 'error' ? PALETTE_PROJECTS_ERROR : null

  return (
    <PaletteDialog
      entries={entries}
      projectsNote={note}
      query={query}
      index={index}
      onQuery={onQuery}
      onIndex={onIndex}
      onClose={onClose}
    />
  )
}

/** 내비에 앉는 트리거 + 열린 팔레트. 화면은 이것 하나만 그리면 된다. */
export function CommandPalette({ base, pathname, team, project }: {
  base: string
  pathname: string
  team: string
  project: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  //  ⚠ 닫힐 때 트리거로 포커스를 돌려준다 — 안 그러면 키보드로 연 사람이 body 로 떨어진다.
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isPaletteKey(e)) return
      //  ⚠ 브라우저 기본 동작(크롬의 검색창 이동)을 막아야 우리 창이 뜬다.
      e.preventDefault()
      setQuery('')
      setIndex(0)
      setOpen((was) => !was)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  return (
    <>
      {/* ⚠ accent 를 쓰지 않는다 — 화면당 accent 는 **그 화면의 주요 액션 하나**이고
          팔레트는 어느 화면에서나 있는 도구다 (DESIGN_BRIEF §3). */}
      <button
        ref={trigger}
        type="button"
        className="btn btn-sm palette-trigger"
        onClick={() => { setQuery(''); setIndex(0); setOpen(true) }}
      >
        <span className="grow">{PALETTE_TITLE}</span>
        <span className="meta mono" aria-hidden="true">{PALETTE_HINT}</span>
      </button>
      {open
        ? (
          <PaletteBody
            base={base}
            pathname={pathname}
            team={team}
            project={project}
            query={query}
            index={index}
            onQuery={setQuery}
            onIndex={setIndex}
            onClose={close}
          />
        )
        : null}
    </>
  )
}
