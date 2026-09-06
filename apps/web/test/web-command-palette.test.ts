import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  PROJECT_SCREENS, isActiveScreen, matchScreens, screenHref,
  type ProjectScreen,
} from '../src/lib/web/screens'
import {
  PALETTE_EMPTY, PALETTE_HINT, PaletteDialog, isPaletteKey, moveIndex,
} from '../src/components/command-palette'

// =====================================================================
//  🔴 **명령 팔레트(⌘K)가 내비와 같은 표를 읽는다** (FINDINGS 132)
//
//  ★ 왜 이 파일이 생겼나 — 「갈 수 있는 화면」의 목록이 둘이 되면 화면 하나가 한쪽에만
//    생기고, 그 화면은 팔레트에서 **영원히 안 보인다.** 눈으로는 절대 안 잡힌다 —
//    팔레트를 열면 일곱 줄이 멀쩡히 뜨기 때문이다. 기계만 잡는다.
//
//  재는 것 다섯:
//    ① 표가 정본이다 — `layout.tsx` 에 화면 목록이 없고 `PROJECT_SCREENS` 를 읽는다
//    ② 🔴 **표에 한 줄을 더하면 팔레트에 저절로 나온다** (없는 줄을 넣어 그려 본다)
//    ③ 표의 모든 줄이 **실제로 있는 화면**이다 (404 로 가는 줄 0개)
//    ④ 검색이 라벨·경로·keywords 셋 다에 걸리고, 못 찾으면 할 말이 있다
//    ⑤ 고른 줄을 **색만으로** 표시하지 않는다 (DESIGN_BRIEF §3)
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const layoutFile = join(webRoot, 'src', 'app', 't', '[team]', 'p', '[project]', 'layout.tsx')
const BASE = '/t/paylab/p/api'

function render(props: {
  query?: string
  index?: number
  pathname?: string
  screens?: readonly ProjectScreen[]
}): string {
  return renderToStaticMarkup(createElement(PaletteDialog, {
    base: BASE,
    pathname: props.pathname ?? `${BASE}/import`,
    query: props.query ?? '',
    index: props.index ?? 0,
    screens: props.screens,
    onQuery: () => {},
    onIndex: () => {},
    onClose: () => {},
  }))
}

describe('🔴 ① 화면 목록의 정본은 `PROJECT_SCREENS` 표 하나다', () => {
  it('내비(layout.tsx)가 그 표를 읽는다 — 목록을 자기 안에 적지 않는다', () => {
    const src = readFileSync(layoutFile, 'utf8')
    expect(src).toContain('PROJECT_SCREENS')
    //  ⚠ 옛 모양(`const TABS: … = [ { href: … } ]`)이 돌아오면 여기서 빨개진다.
    expect(src).not.toMatch(/label:\s*'/)
    for (const screen of PROJECT_SCREENS) {
      expect(src, `${screen.label} 를 내비가 직접 적고 있다`).not.toContain(`'${screen.path}'`)
    }
  })

  it('경로도 이름도 겹치지 않는다 — 같은 자리로 가는 두 줄이 없다', () => {
    expect(new Set(PROJECT_SCREENS.map((s) => s.path)).size).toBe(PROJECT_SCREENS.length)
    expect(new Set(PROJECT_SCREENS.map((s) => s.label)).size).toBe(PROJECT_SCREENS.length)
  })

  it('🔴 `match` 는 자기 화면만 맞힌다 — 내비의 「지금 여기」가 두 줄에 뜨지 않는다', () => {
    for (const here of PROJECT_SCREENS) {
      const path = screenHref(BASE, here)
      const hits = PROJECT_SCREENS.filter((s) => isActiveScreen(s, path))
      expect(hits.map((s) => s.path), path).toEqual([here.path])
    }
  })
})

describe('🔴 ② 표에 한 줄을 더하면 팔레트에 저절로 나온다', () => {
  it('표에 없던 화면을 넣으면 링크가 그려진다 — 팔레트를 안 고쳐도 된다', () => {
    const extra: ProjectScreen = {
      path: 'devices', label: '기기', match: /\/devices$/, keywords: ['device'],
    }
    const html = render({ screens: [...PROJECT_SCREENS, extra] })
    expect(html).toContain(`href="${BASE}/devices"`)
    expect(html).toContain('기기')
  })

  it('지금 표의 일곱 줄이 전부 나온다 (링크와 이름 둘 다)', () => {
    const html = render({})
    for (const screen of PROJECT_SCREENS) {
      expect(html, screen.label).toContain(`href="${screenHref(BASE, screen)}"`)
      expect(html, screen.label).toContain(screen.label)
    }
  })
})

describe('🔴 ③ 표의 모든 줄이 실제로 있는 화면이다 — 404 로 가는 줄 0개', () => {
  it('경로마다 `page.tsx` 가 있다', () => {
    for (const screen of PROJECT_SCREENS) {
      const page = join(webRoot, 'src', 'app', 't', '[team]', 'p', '[project]', screen.path, 'page.tsx')
      expect(existsSync(page), `${screen.label} → ${screen.path}/page.tsx 가 없다`).toBe(true)
    }
  })
})

describe('④ 검색 — 라벨·경로·keywords 셋 다에 걸린다', () => {
  it('빈 검색어는 표 그대로다 (차례도 표의 차례다)', () => {
    expect(matchScreens('').map((s) => s.path)).toEqual(PROJECT_SCREENS.map((s) => s.path))
    expect(matchScreens('   ').length).toBe(PROJECT_SCREENS.length)
  })

  it('라벨로 걸린다 · 대소문자를 안 가린다', () => {
    expect(matchScreens('Sync').map((s) => s.path)).toEqual(['sync'])
    expect(matchScreens('sYnC').map((s) => s.path)).toEqual(['sync'])
  })

  it('🔴 keywords 가 실제로 무언가를 한다 — 라벨에 없는 낱말로 찾아진다', () => {
    //  「문서」는 어느 라벨에도 없다. keywords 가 죽으면 여기서 빨개진다.
    expect(matchScreens('문서').map((s) => s.path)).toEqual(['import'])
    expect(matchScreens('마일스톤').map((s) => s.path)).toEqual(['roadmap'])
    for (const screen of PROJECT_SCREENS) {
      for (const word of screen.keywords) {
        expect(matchScreens(word).map((s) => s.path), word).toContain(screen.path)
      }
    }
  })

  it('경로로도 걸린다', () => {
    expect(matchScreens('proposals').map((s) => s.path)).toEqual(['proposals'])
  })

  it('못 찾으면 할 말이 있다 — 빈 목록이 아니라 문장이다', () => {
    expect(matchScreens('ㅁㄴㅇㄹ')).toEqual([])
    const html = render({ query: 'ㅁㄴㅇㄹ' })
    expect(html).toContain(PALETTE_EMPTY)
    expect(html).not.toContain('role="listbox"')
  })
})

describe('🔴 ⑤ 고른 줄을 색만으로 표시하지 않는다 (DESIGN_BRIEF §3)', () => {
  it('고른 줄에 `aria-selected` 와 화살표가 같이 있다', () => {
    const html = render({ index: 0 })
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('›')
    //  하나만 고를 수 있다.
    expect(html.match(/aria-selected="true"/g)?.length).toBe(1)
  })

  it('index 를 옮기면 다른 줄이 고른 줄이 된다 — 값이 실제로 화면을 바꾼다', () => {
    const first = render({ index: 0 })
    const second = render({ index: 1 })
    expect(first).not.toBe(second)
    const at = (html: string) => /aria-selected="true"[\s\S]*?<span class="grow">([^<]+)</.exec(html)?.[1]
    expect(at(first)).toBe(PROJECT_SCREENS[0]?.label)
    expect(at(second)).toBe(PROJECT_SCREENS[1]?.label)
  })

  it('지금 보고 있는 화면은 「지금 여기」라고 말한다', () => {
    const html = render({ pathname: `${BASE}/sync` })
    expect(html).toContain('지금 여기')
    expect(html.match(/지금 여기/g)?.length).toBe(1)
  })

  it('창 자체가 dialog 다 — 키보드로 연 사람이 무엇이 떴는지 안다', () => {
    const html = render({})
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
  })
})

describe('문서 ↔ 코드 — DESIGN_BRIEF 가 이 컴포넌트를 실제로 말한다', () => {
  //  ★ 왜 — 문서에만 있는 컴포넌트, 문서에 없는 컴포넌트 둘 다 이 저장소의 단골 고장이다.
  const brief = readFileSync(join(webRoot, '..', '..', 'docs', 'DESIGN_BRIEF.md'), 'utf8')

  it('§3 공통 컴포넌트에 CommandPalette 와 여는 열쇠가 적혀 있다', () => {
    expect(brief).toContain('CommandPalette')
    expect(brief).toContain(PALETTE_HINT)
    expect(brief).toContain('Ctrl+K')
  })

  it('못 찾았을 때의 문장이 문서와 코드에서 같다', () => {
    expect(brief).toContain(PALETTE_EMPTY)
  })
})

describe('여는 열쇠와 화살표', () => {
  it('⌘K · Ctrl+K 로 열린다 · 맨 K 나 다른 글쇠로는 안 열린다', () => {
    expect(isPaletteKey({ key: 'k', metaKey: true, ctrlKey: false })).toBe(true)
    expect(isPaletteKey({ key: 'K', metaKey: false, ctrlKey: true })).toBe(true)
    expect(isPaletteKey({ key: 'k', metaKey: false, ctrlKey: false })).toBe(false)
    expect(isPaletteKey({ key: 'j', metaKey: true, ctrlKey: false })).toBe(false)
  })

  it('목록의 양 끝에서 돌아온다 — 끝에 막히면 죽은 줄 안다', () => {
    expect(moveIndex(0, 1, 3)).toBe(1)
    expect(moveIndex(2, 1, 3)).toBe(0)
    expect(moveIndex(0, -1, 3)).toBe(2)
    //  검색이 아무것도 못 찾은 순간에도 안 터진다.
    expect(moveIndex(5, 1, 0)).toBe(0)
  })
})
