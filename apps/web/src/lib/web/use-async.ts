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

    //  ⚠ 첫 번째만 `loading` 이다. 두 번째부터는 손에 든 값을 그대로 두고 갈아 끼운다.
    setResult({ state: 'loading' })
    const tick = (): void => {
      run().then(
        (data) => {
          if (!alive) return
          setResult({ state: 'ready', data })
          const delay = decide.current(data)
          if (delay !== null) timer = setTimeout(tick, delay)
        },
        (error: unknown) => { if (alive) setResult({ state: 'error', error }) },
      )
    }
    tick()

    return () => { alive = false; if (timer !== undefined) clearTimeout(timer) }
  }, [run])

  return { result, reload: useCallback(() => setNonce((n) => n + 1), []) }
}
