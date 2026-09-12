import { describe, expect, it } from 'vitest'

import { poolOptionsFor } from '../src/db/client'

// =====================================================================
//  DB 연결 옵션 — 서버리스에서 연결을 붙잡지 않는다 (`src/db/client.ts` 의 `poolOptionsFor` · 2026-09-13)
//
//  ★ 왜 시험이 있나 — 이 값들은 배포에서만 효과가 보인다(얼려 둔 인스턴스의 열린 연결 · 풀러의 클라이언트 상한).
//    로컬·시험은 PGlite 라 옵션을 지워도 전부 초록이다. 그래서 **옵션 자체**를 잠근다.
// =====================================================================

describe('DB 연결 옵션', () => {
  it('prepared statement 를 끄고, 쉬는 연결은 돌려주고, 못 붙으면 빨리 실패하고, 인스턴스당 천장이 있다', () => {
    const options = poolOptionsFor('postgres://user:pass@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres')
    expect(options).toEqual({ prepare: false, idle_timeout: 20, connect_timeout: 10, max: 5 })
  })

  it('🔴 URL 이 max 를 말하면 옵션이 덮지 않는다 — 개발용 DB(pglite-socket)는 소켓 하나만 받는다', () => {
    //  postgres.js 는 옵션 객체를 URL 의 질의보다 먼저 본다. 여기서 max 를 주면 `?max=1` 이 지워지고
    //  개발 서버의 둘째 소켓이 30초 줄을 서다 500 이 된다 (FINDINGS 127 과 같은 모양).
    const options = poolOptionsFor('postgres://postgres:postgres@127.0.0.1:55432/postgres?max=1')
    expect(options.max).toBeUndefined()
    expect(options.prepare).toBe(false)
  })

  it('모양이 낯선 연결 문자열이어도 던지지 않고 기본 천장을 준다', () => {
    expect(poolOptionsFor('not a url').max).toBe(5)
  })
})
