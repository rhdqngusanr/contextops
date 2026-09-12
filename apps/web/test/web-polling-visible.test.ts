import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { whenVisible } from '../src/lib/web/use-async'

// =====================================================================
//  보이지 않는 탭은 두드리지 않는다 (`src/lib/web/use-async.ts` 의 `whenVisible` · 2026-09-13)
//
//  ★ 왜 — Roadmap·Sync 는 10초마다 다시 읽는다. 뒤 탭에 열어 둔 화면 하나가 하루 8,640 번 함수를 부르고,
//    그게 모이면 Vercel Hobby 의 한 달 호출 한도에 닿는다 (심사 기간에 링크를 잃는 자리).
//  ⚠ 훅은 서버 렌더로 그려 읽는 이 저장소의 화면 시험에서 효과가 안 돈다 — 그래서 결정을 순수 함수로 빼서 잰다.
// =====================================================================

function fakePage(hidden: boolean) {
  const listeners = new Set<() => void>()
  const page = {
    hidden,
    addEventListener: (_type: 'visibilitychange', listener: () => void) => { listeners.add(listener) },
    removeEventListener: (_type: 'visibilitychange', listener: () => void) => { listeners.delete(listener) },
  }
  const fire = (nowHidden: boolean): void => {
    page.hidden = nowHidden
    for (const listener of [...listeners]) listener()
  }
  return { page, listeners, fire }
}

describe('whenVisible — 보이지 않는 탭은 두드리지 않는다', () => {
  it('보이는 탭이면 바로 한 번 부르고 기다림을 걸지 않는다', () => {
    const { page, listeners } = fakePage(false)
    let calls = 0
    whenVisible(page, () => { calls += 1 })
    expect(calls).toBe(1)
    expect(listeners.size).toBe(0)
  })

  it('🔴 숨은 탭이면 부르지 않고, 다시 보이는 순간 한 번 부른다 — 그 뒤로는 기다리지 않는다', () => {
    const { page, listeners, fire } = fakePage(true)
    let calls = 0
    whenVisible(page, () => { calls += 1 })
    expect(calls).toBe(0)

    fire(false)
    expect(calls).toBe(1)
    expect(listeners.size).toBe(0)

    fire(true)
    fire(false)
    expect(calls).toBe(1)
  })

  it('숨은 채로 visibilitychange 가 와도 부르지 않는다', () => {
    const { page, fire } = fakePage(true)
    let calls = 0
    whenVisible(page, () => { calls += 1 })
    fire(true)
    expect(calls).toBe(0)
  })

  it('화면을 떠나면 기다림이 풀린다 — 떠난 뒤 탭이 보여도 부르지 않는다', () => {
    const { page, listeners, fire } = fakePage(true)
    let calls = 0
    const stop = whenVisible(page, () => { calls += 1 })
    stop()
    expect(listeners.size).toBe(0)
    fire(false)
    expect(calls).toBe(0)
  })

  it('document 가 없는 서버 렌더에서는 그냥 부른다', () => {
    let calls = 0
    whenVisible(undefined, () => { calls += 1 })
    expect(calls).toBe(1)
  })

  it('🔴 usePolling 이 다음 차례를 이 문으로 건다 — 문만 있고 안 쓰는 모양을 막는다', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'web', 'use-async.ts'), 'utf8')
    const body = source.slice(source.indexOf('export function usePolling'))
    expect(body).toContain('whenVisible(page, tick)')
    //  예전 모양(숨어 있어도 곧장 다시 부르는 타이머)이 남아 있지 않다.
    expect(body).not.toContain('setTimeout(tick, delay)')
  })
})
