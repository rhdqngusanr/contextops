import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ShotsManifest } from '@contextops/schema'

import { PRODUCT_SHOTS, PRODUCT_TOUR, Landing } from '../src/components/landing'
import { PUBLISHED_SHOTS } from '../e2e/plan'
import { PROJECT_SCREENS } from '../src/lib/web/screens'

// =====================================================================
//  🔴 랜딩 B-2 「제품 화면」의 게이트 (FINDINGS 131 ③ · DESIGN_BRIEF 화면 1 B-2)
//
//  ★ 왜 시험인가 — 이 절이 막으려는 고장은 **눈으로 안 보인다.** 그림이 낡아도 랜딩은
//    멀쩡히 뜨고, 파일 이름이 화면 코드에 박혀도 화면은 똑같다. 갈라진 것은
//    「계획에 한 줄을 더했을 때 랜딩이 따라오는가」뿐이고 그건 기계만 잰다.
//
//  재는 것:
//    ① 🔴 **화면 코드에 파일 이름이 없다** — `landing.tsx` 에 `.png` 도 `screen-` 도 0건
//    ② 🔴 **랜딩이 읽는 것 == 관통이 옮기기로 한 것** (`e2e/plan.ts` 의 `PUBLISHED_SHOTS`).
//      계획에 한 줄을 더하면 랜딩이 저절로 따라온다 — 여기가 그 짝을 잡는 자리다
//    ③ manifest 의 그림이 **실제로 있고 빈 파일이 아니다** (커밋된 바이너리)
//    ④ `src`(근거로 적는 주소)가 화면 표(`PROJECT_SCREENS`)의 실재하는 화면이다
//    ⑤ 그려 보면 `<img>` 가 장수만큼 있고 alt·width·height 가 다 붙어 있다
//    ⑥ 계약이 빈 목록·모르는 필드를 **거부한다** (`ShotsManifest`)
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const landingSrc = readFileSync(join(webRoot, 'src', 'components', 'landing.tsx'), 'utf8')

function html(): string {
  return renderToStaticMarkup(createElement(Landing, { locale: 'ko' }))
}

describe('🔴 ① 화면 코드에 캡처 파일 이름이 없다', () => {
  //  주석은 뺀다 — 「파일 이름을 적지 마라」는 주석 자체가 걸리면 안 된다.
  const code = landingSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('`.png` 가 한 자도 없다', () => {
    expect(code).not.toContain('.png')
  })

  it('캡처 이름의 머리(`screen-`)가 없다', () => {
    expect(code).not.toContain('screen-')
  })

  it('`public/shots/manifest.json` 하나만 읽는다', () => {
    const reads = [...code.matchAll(/from '([^']*shots[^']*)'/g)].map((m) => m[1])
    expect(reads).toEqual(['../../public/shots/manifest.json'])
  })
})

describe('🔴 ② 랜딩이 읽는 것과 관통이 옮기기로 한 것이 같다', () => {
  it('장수가 같다', () => {
    expect(PRODUCT_SHOTS.length).toBe(PUBLISHED_SHOTS.length)
  })

  it.each(PUBLISHED_SHOTS.map((s) => [s.name, s] as const))('%s 의 파일·대체텍스트·크기가 계획과 같다', (_name, shot) => {
    const found = PRODUCT_SHOTS.find((s) => s.file === `/shots/${shot.publish}`)
    expect(found, `계획에 있는데 manifest 에 없다 — 관통(shotcopy)을 다시 돌려라`).toBeDefined()
    expect(found?.alt).toBe(shot.alt)
    expect(found?.src).toBe(shot.path)
    expect(found?.width).toBe(shot.width)
    expect(found?.height).toBe(shot.height)
  })

  it('manifest 에만 있는 줄이 없다 — 계획에서 뺀 그림이 랜딩에 남지 않는다', () => {
    const planned = new Set(PUBLISHED_SHOTS.map((s) => `/shots/${s.publish}`))
    expect(PRODUCT_SHOTS.filter((s) => !planned.has(s.file)).map((s) => s.file)).toEqual([])
  })
})

describe('③ 그림이 실제로 있고 빈 파일이 아니다', () => {
  it.each(PRODUCT_SHOTS.map((s) => [s.file] as const))('%s', (file) => {
    const full = join(webRoot, 'public', file.replace(/^\//, ''))
    expect(existsSync(full), `${full} 이 없다 — 관통을 돌려라`).toBe(true)
    expect(statSync(full).size).toBeGreaterThan(5_000)
  })
})

describe('④ 근거로 적는 주소가 실재하는 화면이다', () => {
  it.each(PRODUCT_SHOTS.map((s) => [s.src] as const))('%s 는 화면 표의 화면이다', (src) => {
    const last = src.split('/').pop()
    expect(PROJECT_SCREENS.map((s) => s.path)).toContain(last)
  })
})

describe('⑤ 그려 보면 그림이 다 있다', () => {
  const out = html()

  it('캡처 `<img>`(`/shots/`) 가 장수만큼 있다 — 그림(`/art/` · `lib/web/art.ts`)은 여기 안 센다', () => {
    expect([...out.matchAll(/<img\b[^>]*src="\/shots\//g)].length).toBe(PRODUCT_SHOTS.length)
  })

  it.each(PRODUCT_SHOTS.map((s) => [s.file, s] as const))('%s 가 alt·width·height 와 함께 실린다', (_file, shot) => {
    expect(out).toContain(`src="${shot.file}"`)
    expect(out).toContain(`alt="${shot.alt}"`)
    expect(out).toContain(`width="${shot.width}"`)
    expect(out).toContain(`height="${shot.height}"`)
    //  근거는 숫자·판정 옆에 있다 — 이 그림이 어느 화면인지 (P7 의 정신)
    expect(out).toContain(shot.src)
  })

  it('절 제목과 설명이 표에서 온다', () => {
    expect(out).toContain(PRODUCT_TOUR.title)
    expect(out).toContain(PRODUCT_TOUR.lead)
    expect(out).toContain(PRODUCT_TOUR.foot)
  })

  it('🔴 히어로 **바로 아래**다 — 「왜 git으로」보다 먼저 나온다', () => {
    expect(out.indexOf('landing-shots')).toBeGreaterThan(out.indexOf('landing-title'))
    expect(out.indexOf('landing-shots')).toBeLessThan(out.indexOf('landing-why'))
  })

  it('accent 버튼을 더하지 않았다 — 이 화면의 accent 는 여전히 하나다', () => {
    expect([...out.matchAll(/btn-primary/g)].length).toBe(1)
  })
})

describe('⑥ 계약이 잘못된 manifest 를 거부한다', () => {
  const one = PRODUCT_SHOTS[0] as Record<string, unknown>

  it('빈 목록을 거부한다 — 그림 0장인 랜딩이 조용히 배포되면 안 된다', () => {
    expect(ShotsManifest.safeParse({ shots: [] }).success).toBe(false)
  })

  it('모르는 필드를 거부한다 (strict)', () => {
    expect(ShotsManifest.safeParse({ shots: [{ ...one, bytes: 1 }] }).success).toBe(false)
  })

  it('빈 대체텍스트를 거부한다', () => {
    expect(ShotsManifest.safeParse({ shots: [{ ...one, alt: '' }] }).success).toBe(false)
  })

  it('`public/shots/` 밖의 파일을 거부한다', () => {
    expect(ShotsManifest.safeParse({ shots: [{ ...one, file: '/img/a.png' }] }).success).toBe(false)
  })

  it('지금 파일은 통과한다', () => {
    expect(ShotsManifest.safeParse({ shots: PRODUCT_SHOTS }).success).toBe(true)
  })
})
