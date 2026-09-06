import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  EMPTY_PLACES, PROJECT_SCREENS, emptyNextHref,
  type EmptyNext, type EmptySlot,
} from '../src/lib/web/screens'
import { ScreenEmpty } from '../src/components/states'

// =====================================================================
//  🔴 **빈 상태에 다음 행동이 있다** (FINDINGS 133)
//
//  ★ 왜 이 파일이 생겼나 — 로딩·오류는 잘 돼 있는데(아이콘 + 문장 + [다시 시도] +
//    `request_id`) **빈 상태에서 갈 곳이 없었다.** 첫 사용자가 거기서 막힌다.
//    화면마다 문구와 버튼을 손으로 적으면 **한 화면만 버튼이 없는 채로** 남고,
//    그 화면은 비어 있을 뿐 멀쩡해 보인다 — 눈으로는 안 잡힌다.
//
//  재는 것 넷:
//    ① 표가 정본이다 — 화면이 빈 상태 문구를 손으로 적지 않는다
//    ② 🔴 **표에 한 줄을 더하면 그 화면의 빈 상태에 저절로 나온다**
//    ③ 🔴 **모든 목적지가 실제로 있는 화면이다** (404 로 가는 버튼 0개)
//    ④ 버튼이 없는 자리는 **왜 없는지**를 적었다 (빠뜨린 것과 구별한다)
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const BASE = '/t/paylab/p/api'
const SLOTS = Object.keys(EMPTY_PLACES) as EmptySlot[]

/** 프로젝트 밑의 모든 화면 파일 — 「어느 화면도 문구를 손으로 안 적었다」를 세는 데 쓴다. */
const PAGES: string[] = (function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name)
    if (e.isDirectory()) return walk(full)
    return e.name.endsWith('.tsx') ? [full] : []
  })
})(join(webRoot, 'src', 'app', 't', '[team]', 'p', '[project]'))

function html(slot: EmptySlot, message?: string): string {
  return renderToStaticMarkup(createElement(ScreenEmpty, { slot, base: BASE, message }))
}

describe('① 표가 정본이다 — 화면이 문구를 손으로 적지 않는다', () => {
  it('표의 모든 문구가 그 자리에서 그대로 나온다', () => {
    for (const slot of SLOTS) expect(html(slot), slot).toContain(EMPTY_PLACES[slot].message)
  })

  it('🔴 상태에 따라 달라지는 문장만 덮어쓴다 — 그때도 다음 행동은 표의 것이다', () => {
    const markup = html('proposals.list', '「거절됨」 상태의 제안이 없습니다.')
    expect(markup).toContain('「거절됨」 상태의 제안이 없습니다.')
    expect(markup).not.toContain(EMPTY_PLACES['proposals.list'].message)
    expect(markup).toContain(`${BASE}/context`)
  })
})

describe('② 표에 한 줄을 더하면 저절로 나온다', () => {
  it('🔴 화면 코드에 빈 상태 문구가 **0건**이다 — 자리마다 `if` 가 생기면 그게 133 이었다', () => {
    for (const slot of SLOTS) {
      const { message } = EMPTY_PLACES[slot]
      for (const file of PAGES) {
        expect(readFileSync(file, 'utf8'), `${slot} ← ${file}`).not.toContain(message)
      }
    }
  })

  it('빈 상태를 그리는 자리는 `ScreenEmpty` 하나다 — 화면이 `EmptyState` 를 직접 부르지 않는다', () => {
    for (const file of PAGES) expect(readFileSync(file, 'utf8'), file).not.toContain('<EmptyState')
  })

  it('🔴 `DESIGN_BRIEF` §5 가 그 표를 정본으로 가리킨다 — 문서와 코드가 갈리지 않게', () => {
    const brief = readFileSync(join(webRoot, '..', '..', 'docs', 'DESIGN_BRIEF.md'), 'utf8')
    expect(brief).toContain('EMPTY_PLACES')
    expect(brief).toContain('ScreenEmpty')
  })

  it('주소는 `emptyNextHref` 하나가 짓는다', () => {
    const next: EmptyNext = { label: '가져오기로', to: 'import', tone: 'plain' }
    expect(emptyNextHref(BASE, next)).toBe(`${BASE}/import`)
  })
})

describe('③ 🔴 모든 목적지가 실제로 있는 화면이다 (404 로 가는 버튼 0개)', () => {
  const paths = new Set(PROJECT_SCREENS.map((s) => s.path))

  it('`to` 는 전부 `PROJECT_SCREENS` 의 `path` 다', () => {
    for (const slot of SLOTS) {
      const next = EMPTY_PLACES[slot].next
      if (!next) continue
      expect(paths, `${slot} → ${next.to}`).toContain(next.to)
    }
  })

  it('그 화면의 `page.tsx` 가 저장소에 실제로 있다', () => {
    for (const slot of SLOTS) {
      const next = EMPTY_PLACES[slot].next
      if (!next) continue
      const file = join(webRoot, 'src', 'app', 't', '[team]', 'p', '[project]', next.to, 'page.tsx')
      expect(existsSync(file), `${slot} → ${next.to}/page.tsx`).toBe(true)
    }
  })

  it('버튼의 주소는 넘겨받은 `base` 밑이다 — 주소를 화면이 짓지 않는다', () => {
    for (const slot of SLOTS) {
      const next = EMPTY_PLACES[slot].next
      if (!next) continue
      expect(html(slot), slot).toContain(`href="${BASE}/${next.to}"`)
      expect(html(slot), slot).toContain(next.label)
    }
  })
})

describe('④ 버튼이 없는 자리는 왜 없는지를 적었다', () => {
  it('`next` 가 없으면 `noNext` 에 이유가 있다 (타입이 강제하고, 여기서 빈 문자열을 막는다)', () => {
    for (const slot of SLOTS) {
      const place = EMPTY_PLACES[slot]
      if (place.next) continue
      expect(place.noNext.trim().length, slot).toBeGreaterThan(10)
    }
  })

  it('🔴 갈 곳이 없는 자리에는 버튼을 그리지 않는다 — 아무 데도 안 가는 버튼 금지', () => {
    for (const slot of SLOTS) {
      if (EMPTY_PLACES[slot].next) continue
      expect(html(slot), slot).not.toContain('<a ')
    }
  })

  it('`accent` 는 그 화면의 주요 액션이 하나뿐일 때만 (DESIGN_BRIEF §3)', () => {
    //  ★ Context 는 머리에 [발행하기] 가 이미 accent 다 — 빈 상태의 버튼은 outline 이어야 한다.
    expect(EMPTY_PLACES['context.items'].next?.tone).toBe('plain')
    expect(html('context.items')).not.toContain('btn-primary')
    //  한 화면(`slot` 의 앞 조각)에서 accent 는 최대 하나다.
    const accentPerScreen = new Map<string, number>()
    for (const slot of SLOTS) {
      if (EMPTY_PLACES[slot].next?.tone !== 'accent') continue
      const screen = slot.split('.')[0]!
      accentPerScreen.set(screen, (accentPerScreen.get(screen) ?? 0) + 1)
    }
    for (const [screen, count] of accentPerScreen) expect(count, screen).toBe(1)
  })
})
