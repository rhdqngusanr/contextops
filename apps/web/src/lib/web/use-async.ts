'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// =====================================================================
//  서버에서 뭔가를 읽는 화면이 쓰는 **한 가지 모양** (DESIGN_BRIEF §5)
//
//  🔴 왜 훅 하나로 묶나 — 화면마다 `useEffect` + `useState` 를 손으로 적으면
//     반드시 어느 화면에서 **error 상태를 안 그린다.** 그러면 서버가 500 을 내도
//     화면은 영원히 skeleton 이고, 사용자는 「느리다」고 생각한다.
//     여기서는 상태가 셋뿐이라 세 갈래를 다 적지 않으면 타입 검사가 막는다.
//
//  ⚠ `useAsync` 는 「실시간」이 아니다 — 다시 읽는 것은 사람이 `reload()` 를 부를
//    때뿐이다. 스스로 다시 읽어야 하는 화면(화면 3 의 job 진행)은 아래 `usePolling`
//    이고, 그것도 **끝나면 멈춘다** (DESIGN_BRIEF §2-3 「실시간이라는 말을 쓰지 않는다」).
// =====================================================================

export type Async<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; error: unknown }

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): {
  result: Async<T>
  reload: () => void
  /** 다시 읽지 않고 손에 든 값만 바꾼다 (예: PATCH 응답으로 한 행을 갈아 끼울 때). */
  put: (data: T) => void
} {
  const [result, setResult] = useState<Async<T>>({ state: 'loading' })
  const [nonce, setNonce] = useState(0)

  //  ⚠ `load` 는 매 렌더 새 함수라 의존성에 넣으면 무한 루프다. 화면이 준 `deps` 만 본다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, [...deps, nonce])

  useEffect(() => {
    let alive = true
    setResult({ state: 'loading' })
    run().then(
      (data) => { if (alive) setResult({ state: 'ready', data }) },
      //  ⚠ 예외를 삼키지 않는다. 삼키면 화면이 영원히 skeleton 이다.
      (error: unknown) => { if (alive) setResult({ state: 'error', error }) },
    )
    //  화면을 떠난 뒤 도착한 응답으로 상태를 바꾸지 않는다 (React 경고 + 깜빡임).
    return () => { alive = false }
  }, [run])

  return {
    result,
    reload: useCallback(() => setNonce((n) => n + 1), []),
    put: useCallback((data: T) => setResult({ state: 'ready', data }), []),
  }
}

// ---------------------------------------------------------------------
//  스스로 다시 읽는 화면 — 화면 3 의 구조화 진행 (SPEC §9 화면 3 「polling」)
// ---------------------------------------------------------------------

/** `document` 에서 이 파일이 쓰는 것 셋 — 시험이 가짜를 꽂을 수 있게 좁혀 둔다. */
export interface VisibilitySource {
  readonly hidden: boolean
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

/**
 * 🔴 **보이지 않는 탭은 두드리지 않는다** (2026-09-13). 보이면 `run` 을 바로 부르고, 숨어 있으면 다시 보이는
 * 순간 **한 번** 부른다. 돌려주는 함수는 그 기다림을 푼다(화면을 떠날 때).
 *
 * ★ 왜 — Roadmap·Sync 는 10초마다 다시 읽는다(`REALTIME_POLL_MS`). 뒤 탭에 열어 둔 화면 하나가 하루 8,640 번
 *   함수를 부르고, 심사 기간 내내 열린 탭 몇 개면 Vercel Hobby 의 한 달 호출 한도(100만)에 닿는다 —
 *   아무도 안 보는 화면을 갱신하느라 모두가 보는 링크를 잃는 자리다.
 * ⚠ 멈추는 것은 **다음 한 번**뿐이다. 돌아온 사람은 기다림이 풀리며 바로 읽은 **지금 값**을 본다.
 * ⚠ `document` 가 없으면(서버 렌더) 그냥 부른다 — 숨을 곳이 없다.
 */
export function whenVisible(page: VisibilitySource | undefined, run: () => void): () => void {
  if (page === undefined || !page.hidden) {
    run()
    return () => {}
  }
  const onChange = (): void => {
    if (page.hidden) return
    page.removeEventListener('visibilitychange', onChange)
    run()
  }
  page.addEventListener('visibilitychange', onChange)
  return () => page.removeEventListener('visibilitychange', onChange)
}

/**
 * 🔴 **다시 읽는 동안 손에 든 값을 버리지 않는다.** `useAsync` + `setInterval(reload)`
 * 로 만들면 2초마다 `loading` 으로 되돌아가 화면이 skeleton 과 막대 사이를 깜빡인다 —
 * 「진행 중」을 보여 주려고 만든 화면이 진행을 못 보여 준다.
 *
 * ★ **언제까지 두드리나를 데이터가 정한다** (`again`). 화면이 `setInterval` 을 걸고
 *   조건을 따로 적으면, 끝난 job 을 영원히 두드리는 자리가 반드시 생긴다.
 *   `again` 이 `null` 을 내면 그 자리에서 멈춘다.
 * ⚠ 실패하면 **더 두드리지 않는다.** 서버가 500 을 내는 중에 2초마다 계속 치면
 *   화면 하나가 그 서버를 마저 쓰러뜨린다. 사람이 `reload()` 로 다시 시작한다.
 */
export function usePolling<T>(
  load: () => Promise<T>,
  deps: unknown[],
  again: (data: T) => number | null,
): { result: Async<T>; reload: () => void } {
  const [result, setResult] = useState<Async<T>>({ state: 'loading' })
  const [nonce, setNonce] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, [...deps, nonce])
  //  ⚠ `again` 은 매 렌더 새 함수다. 의존성에 넣으면 매 렌더 타이머가 끊긴다 —
  //    ref 로 최신 것만 들고 본다.
  const decide = useRef(again)
  decide.current = again

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    //  숨은 탭에서 차례를 기다리는 중이면 그 기다림을 푸는 함수 (`whenVisible`).
    let stopWaiting = (): void => {}
    const page = typeof document === 'undefined' ? undefined : document

    //  ⚠ 첫 번째만 `loading` 이다. 두 번째부터는 손에 든 값을 그대로 두고 갈아 끼운다.
    setResult({ state: 'loading' })
    const tick = (): void => {
      run().then(
        (data) => {
          if (!alive) return
          setResult({ state: 'ready', data })
          const delay = decide.current(data)
          //  🔴 다음 차례는 **보이는 탭에서만** 온다 — 숨어 있으면 다시 보이는 순간까지 미룬다 (`whenVisible`).
          //  ⚠ 첫 읽기는 미루지 않는다 — 뒤 탭으로 열어도 한 번은 그려져 있어야 돌아왔을 때 skeleton 이 아니다.
          if (delay !== null) timer = setTimeout(() => { stopWaiting = whenVisible(page, tick) }, delay)
        },
        (error: unknown) => { if (alive) setResult({ state: 'error', error }) },
      )
    }
    tick()

    return () => { alive = false; stopWaiting(); if (timer !== undefined) clearTimeout(timer) }
  }, [run])

  return { result, reload: useCallback(() => setNonce((n) => n + 1), []) }
}
