import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { decodePng } from '../e2e/png'
import { metadataFor } from '../src/app/layout'
import { LANDING_HEAD } from '../src/components/landing'
import { NeedsLogin } from '../src/components/states'
import { NO_ACCOUNT_HINT } from '../src/lib/web/auth'
import { DEMO_SESSION_TTL_SEC } from '../src/lib/demo/tenant'
import { SITE, SITE_TEXT, siteOrigin } from '../src/lib/web/site'

// =====================================================================
//  링크 미리보기 · 아이콘 · 게스트 재입장 (INBOX H2 · 2026-09-10)
//
//  ★ 왜 시험인가 — `<head>` 는 아무 화면 시험도 안 그린다. metadata 가 title 한 줄뿐이던 채로 배포되면
//    링크가 카카오톡·슬랙에 회색 상자로 붙는데, 그건 브라우저로 앱을 눌러 보는 사람이 절대 못 보는 고장이다.
//    예선의 20% 가 온라인 투표다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))

//  ⚠ 언어를 **직접 준다** — `generateMetadata()` 는 요청을 읽으므로 시험에서 못 부른다.
//    무엇을 내는지는 전부 `metadataFor` 안에 있어서, 이 한 줄이 그 전부를 잰다.
const KO_METADATA = metadataFor('ko')

describe('① `<head>` 의 미리보기 — 문장은 랜딩 머리와 같고, 이미지·아이콘이 실재한다', () => {
  it('제목·설명이 `SITE` 에서 오고, 랜딩 머리가 같은 문장을 읽는다 (두 곳이 아니다)', () => {
    expect(LANDING_HEAD.title).toBe(SITE_TEXT.ko.tagline)
    expect(LANDING_HEAD.subtitle).toBe(SITE_TEXT.ko.description)
    expect(LANDING_HEAD.eyebrow).toBe(SITE_TEXT.ko.eyebrow)
    expect(KO_METADATA.description).toBe(SITE_TEXT.ko.description)
    const title = KO_METADATA.title as { default: string; template: string }
    expect(title.default).toContain(SITE.name)
    expect(title.default).toContain(SITE_TEXT.ko.tagline)
    expect(title.template).toContain('%s')
  })

  it('OpenGraph · Twitter 카드가 있고 이미지가 `public/og.png` 이며 1200×630 이다', () => {
    const og = KO_METADATA.openGraph as { images: { url: string; width: number; height: number }[]; siteName: string; locale: string }
    expect(og.siteName).toBe(SITE.name)
    expect(og.locale).toBe('ko_KR')
    expect(og.images[0]?.url).toBe(SITE.ogImage.path)
    const tw = KO_METADATA.twitter as { card: string; images: string[] }
    expect(tw.card).toBe('summary_large_image')
    expect(tw.images[0]).toBe(SITE.ogImage.path)

    const png = join(webRoot, 'public', SITE.ogImage.path)
    expect(existsSync(png), 'public/og.png 가 없다 — `pnpm --filter web og:image` 를 돌려라').toBe(true)
    const decoded = decodePng(readFileSync(png))
    expect([decoded.width, decoded.height]).toEqual([SITE.ogImage.width, SITE.ogImage.height])
    expect([SITE.ogImage.width, SITE.ogImage.height]).toEqual([1200, 630])
  })

  it('아이콘이 실재하는 SVG 이고, 색은 DESIGN_BRIEF §3 의 토큰 값뿐이다', () => {
    const icons = KO_METADATA.icons as { icon: string }
    expect(icons.icon).toBe(SITE.icon)
    const svg = readFileSync(join(webRoot, 'public', SITE.icon), 'utf8')
    expect(svg.trimStart().startsWith('<svg')).toBe(true)
    //  아이콘은 `src/` 밖이라 색 게이트가 안 본다 — 그래서 여기서 토큰 표와 대조한다.
    const brief = readFileSync(join(webRoot, '..', '..', 'docs', 'DESIGN_BRIEF.md'), 'utf8')
    const tokens = new Set([...brief.matchAll(/`(#[0-9A-Fa-f]{6})`/g)].map((m) => (m[1] as string).toUpperCase()))
    const used = [...svg.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase())
    expect(used.length).toBeGreaterThan(0)
    for (const hex of used) expect(tokens.has(hex), `${hex} 는 DESIGN_BRIEF §3 에 없는 색이다`).toBe(true)
  })

  it('`metadataBase` — 사람이 정한 origin → Vercel production 호스트 → 로컬 순이다', () => {
    expect(siteOrigin({ NEXT_PUBLIC_SITE_ORIGIN: 'https://contextops.example/' })).toBe('https://contextops.example')
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'contextops.vercel.app' })).toBe('https://contextops.vercel.app')
    expect(siteOrigin({})).toBe('http://localhost:3000')
    expect(KO_METADATA.metadataBase).toBeInstanceOf(URL)
  })
})

describe('② 게스트 재입장 — 만료된 심사위원이 막다른 길에 서지 않는다', () => {
  it('`NeedsLogin` 이 로그인 문과 함께 샘플 팀 문을 낸다 (문구·주소의 정본은 `NO_ACCOUNT_HINT`)', () => {
    const html = renderToStaticMarkup(createElement(NeedsLogin, { next: '/t/paylab/p/api/roadmap' }))
    expect(html).toContain('href="/login?next=%2Ft%2Fpaylab%2Fp%2Fapi%2Froadmap"')
    expect(html).toContain(`href="${NO_ACCOUNT_HINT.href}"`)
    expect(html).toContain(NO_ACCOUNT_HINT.link)
    expect(NO_ACCOUNT_HINT.href).toBe('/demo')
  })

  it('게스트 세션은 하루다 — 리셋 주기와 같고, 그보다 길면 리셋 뒤의 팀에 옛 세션이 남는다', () => {
    expect(DEMO_SESSION_TTL_SEC).toBe(60 * 60 * 24)
  })
})
