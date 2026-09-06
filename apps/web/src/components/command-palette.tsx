'use client'

import { useEffect, useRef, useState } from 'react'

import {
  PROJECT_SCREENS, isActiveScreen, matchScreens, screenHref,
  type ProjectScreen,
} from '../lib/web/screens'

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
//  ⚠ **프로젝트 전환은 없다** — 지금 「내가 볼 수 있는 프로젝트」를 내주는 문이 0곳이다
//    (`/api/v1/teams/{id}/projects` 는 POST 뿐이다). 목록을 손으로 지어내면 남의 팀이
//    보이거나 없는 프로젝트로 간다. 그 문이 생기는 바퀴에 여기 한 묶음이다 (FINDINGS 132).
//
//  ⚠ 색·간격은 전부 `globals.css` 의 토큰이다 (`.palette-*`). 여기에 숫자를 적지 마라.
// =====================================================================

/** 여는 열쇠. 화면의 안내 문구와 실제 판정이 **같은 상수**를 읽는다. */
export const PALETTE_KEY = 'K'
/** 트리거 버튼과 dialog 제목이 같이 쓰는 낱말. mac 도 win 도 이 한 줄을 본다. */
export const PALETTE_HINT = '⌘K'
export const PALETTE_TITLE = '화면 이동'
/** 검색이 아무것도 못 찾았을 때. 빈 상태에도 할 말이 있어야 한다 (DESIGN_BRIEF §5). */
export const PALETTE_EMPTY = '그런 화면이 없습니다'

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
  base: string
  pathname: string
  query: string
  index: number
  screens?: readonly ProjectScreen[]
  onQuery: (q: string) => void
  onIndex: (i: number) => void
  onClose: () => void
}

/**
 * 열린 팔레트 자체 — 상태를 갖지 않아 시험이 **모양 그대로** 그려 볼 수 있다.
 * (`item-status-actions.tsx` 와 같은 결: 표를 읽어 그리는 부분만 따로 둔다.)
 */
export function PaletteDialog({
  base, pathname, query, index, screens = PROJECT_SCREENS, onQuery, onIndex, onClose,
}: DialogProps) {
  const hits = matchScreens(query, screens)
  const active = hits[moveIndex(index, 0, hits.length)]

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); onIndex(moveIndex(index, 1, hits.length)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); onIndex(moveIndex(index, -1, hits.length)); return }
    if (e.key === 'Enter' && active) { e.preventDefault(); window.location.assign(screenHref(base, active)) }
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
            placeholder={`${PALETTE_TITLE} — 화면 이름을 치세요`}
            aria-label={PALETTE_TITLE}
            onChange={(e) => { onQuery(e.target.value); onIndex(0) }}
          />
          <span className="meta mono" aria-hidden="true">esc</span>
        </div>
        {hits.length === 0
          ? <p className="meta">{PALETTE_EMPTY}</p>
          : (
            <div className="palette-list" role="listbox" aria-label={PALETTE_TITLE}>
              {hits.map((screen, i) => (
                <a
                  key={screen.path}
                  className="palette-item"
                  role="option"
                  href={screenHref(base, screen)}
                  aria-selected={screen === active}
                  onMouseEnter={() => onIndex(i)}
                >
                  {/* ⚠ 고른 줄을 **색만으로** 표시하지 않는다 (DESIGN_BRIEF §3) —
                      화살표가 먼저고 배경색은 거들 뿐이다. */}
                  <span aria-hidden="true" className="chip-icon palette-caret">
                    {screen === active ? '›' : ' '}
                  </span>
                  <span className="grow">{screen.label}</span>
                  {isActiveScreen(screen, pathname)
                    ? <span className="meta">지금 여기</span>
                    : <span className="meta mono">{screen.path}</span>}
                </a>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

/** 내비에 앉는 트리거 + 열린 팔레트. 화면은 이것 하나만 그리면 된다. */
export function CommandPalette({ base, pathname }: { base: string; pathname: string }) {
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
          <PaletteDialog
            base={base}
            pathname={pathname}
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
