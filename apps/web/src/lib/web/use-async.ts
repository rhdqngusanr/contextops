'use client'

import { useCallback, useEffect, useState } from 'react'

// =====================================================================
//  서버에서 뭔가를 읽는 화면이 쓰는 **한 가지 모양** (DESIGN_BRIEF §5)
//
//  🔴 왜 훅 하나로 묶나 — 화면마다 `useEffect` + `useState` 를 손으로 적으면
//     반드시 어느 화면에서 **error 상태를 안 그린다.** 그러면 서버가 500 을 내도
//     화면은 영원히 skeleton 이고, 사용자는 「느리다」고 생각한다.
//     여기서는 상태가 셋뿐이라 세 갈래를 다 적지 않으면 타입 검사가 막는다.
//
//  ⚠ 「실시간」이 아니다 — 폴링하지 않는다. 다시 읽는 것은 사람이 `reload()` 를
//    부를 때뿐이다 (DESIGN_BRIEF §2-3).
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
