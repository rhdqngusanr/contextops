import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPage from '../src/app/privacy/page'
import { LANDING_FOOT, Landing } from '../src/components/landing'
import { DEMO_SESSION_TTL_SEC } from '../src/lib/demo/tenant'
import {
  AI_TRANSFER_NOTICE, AI_TRANSFER_NOTICE_NOW, GEMINI_DATA_TIER, PRIVACY, PRIVACY_LABEL, PRIVACY_PATH,
} from '../src/lib/web/privacy'

// =====================================================================
//  개인정보 처리방침 + AI 전송 고지 (INBOX H4 · 2026-09-10)
//
//  ★ 왜 시험인가 — 「어디로 가나」를 적은 문장은 코드가 바뀌면 조용히 거짓이 된다 (티어를 바꾸고 문장을
//    안 고치면 무료 티어 문장이 유료 배포에 남는다). 그래서 문장은 표 하나에 두고, 그 표를 읽는 자리
//    셋(화면 · 붙여넣기 칸 · KNOWN_LIMITATIONS)이 실제로 읽는지와 몇 줄은 코드 값과 대조한다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const read = (rel: string): string => readFileSync(join(webRoot, rel), 'utf8')

describe('① 표가 하나이고 티어가 문장을 고른다', () => {
  it('두 티어의 문장이 다르고 둘 다 「Gemini」·「국외」·「붙여넣지 마세요」를 말한다', () => {
    expect(AI_TRANSFER_NOTICE.free).not.toBe(AI_TRANSFER_NOTICE.paid)
    for (const said of Object.values(AI_TRANSFER_NOTICE)) {
      expect(said).toContain('Gemini')
      expect(said).toContain('국외')
      expect(said).toContain('붙여넣지 마세요')
    }
    //  무료 티어만 「제품 개선에 쓸 수 있다」 — 유료는 「쓰지 않는다」.
    expect(AI_TRANSFER_NOTICE.free).toContain('쓸 수 있습니다')
    expect(AI_TRANSFER_NOTICE.paid).toContain('쓰지 않습니다')
    expect(AI_TRANSFER_NOTICE_NOW).toBe(AI_TRANSFER_NOTICE[GEMINI_DATA_TIER])
  })

  it('지금 티어는 `free` 다 — 🙋 Tier 1 로 바꾸는 날 이 줄과 KNOWN_LIMITATIONS 를 같이 고친다', () => {
    expect(GEMINI_DATA_TIER).toBe('free')
    const limits = readFileSync(join(webRoot, '..', '..', 'docs', 'KNOWN_LIMITATIONS.md'), 'utf8')
    expect(limits).toContain('AI 처리 데이터의 행방')
    expect(limits).toContain('무료 티어')
    expect(limits).toContain('AI_TRANSFER_NOTICE')
  })
})

describe('② 세 자리가 표를 읽는다', () => {
  it('`/privacy` 가 네 절을 다 그리고 전송 고지를 담는다 — 세션을 읽지 않는 정적 화면이다', () => {
    const html = renderToStaticMarkup(createElement(PrivacyPage))
    for (const section of PRIVACY.sections) {
      expect(html).toContain(section.heading)
      for (const line of section.lines) expect(html).toContain(line.replace(/'/g, '&#x27;'))
    }
    expect(html).toContain(AI_TRANSFER_NOTICE_NOW)
    expect(html).toContain(PRIVACY.updated)
    const page = read('src/app/privacy/page.tsx')
    expect(page).not.toMatch(/readSession|useState|'use client'/)
  })

  it('붙여넣기 칸이 문서를 넣기 **전**에 같은 문장을 보여 준다 (화면 3)', () => {
    const importPage = read('src/app/t/[team]/p/[project]/import/page.tsx')
    expect(importPage).toContain('AI_TRANSFER_NOTICE_NOW')
    //  고지가 제출 버튼보다 위에 있다 — 누른 뒤에 읽는 고지는 고지가 아니다.
    expect(importPage.indexOf('AI_TRANSFER_NOTICE_NOW}')).toBeLessThan(importPage.indexOf('AI 로 정리하기</button>'))
    expect(importPage).toContain(`href={PRIVACY_PATH}`)
  })

  it('랜딩 푸터와 로그인 카드가 `/privacy` 로 잇는다', () => {
    expect(LANDING_FOOT.privacy.href).toBe(PRIVACY_PATH)
    const landing = renderToStaticMarkup(createElement(Landing))
    const foot = landing.slice(landing.indexOf('<footer'))
    expect(foot).toContain(`href="${PRIVACY_PATH}"`)
    expect(foot).toContain(PRIVACY_LABEL)
    const login = read('src/app/login/page.tsx')
    expect(login).toContain('PRIVACY_PATH')
  })
})

describe('③ 문장 몇 줄은 코드와 같다', () => {
  const all = PRIVACY.sections.flatMap((s) => s.lines).join('\n')

  it('로그 필드 — SPEC §11 · `lib/api/log.ts` 가 남기는 것만 적혀 있고 「본문·토큰·문서 내용은 남기지 않는다」', () => {
    expect(all).toContain('request_id')
    expect(all).toMatch(/본문 · 토큰 · 문서 내용은 남기지 않습니다/)
    //  남기는 필드의 표가 실재한다 — SPEC §11 이 가리키는 `ERROR_FIELD_RULES`.
    expect(read('src/lib/api/log.ts')).toContain('ERROR_FIELD_RULES')
  })

  it('게스트 수명 · 리셋 시각이 코드의 값과 같다', () => {
    expect(all).toContain(`게스트 세션은 ${DEMO_SESSION_TTL_SEC === 86_400 ? '하루' : `${DEMO_SESSION_TTL_SEC}초`} 뒤 만료`)
    //  리셋 시각의 정본은 vercel.json 의 cron 이다 — 18:00 UTC = 03:00 KST.
    const vercel = JSON.parse(read('vercel.json')) as { crons: { path: string; schedule: string }[] }
    const reset = vercel.crons.find((c) => c.path.includes('demo-reset'))
    expect(reset?.schedule).toBe('0 18 * * *')
    expect(all).toContain('매일 03:00(KST)')
  })
})
