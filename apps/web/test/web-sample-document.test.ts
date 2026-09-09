import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SOURCE_DOCUMENT_KINDS } from '@contextops/schema'

import { SAMPLE_DOCUMENT } from '../src/lib/web/sample-document'

// =====================================================================
//  화면 3 의 [예시 문서 붙여넣기] (INBOX H5 · 2026-09-10)
//
//  ★ 브라우저는 `fixtures/` 를 못 읽어 글자를 코드에 옮겨 둔다. 옮긴 글자가 원본과 갈리면 데모에서 본 것과
//    실측이 잰 것이 다른 문서가 된다 (P7 과 같은 뿌리) — 그래서 byte 로 대조한다.
//    갈렸으면 `pnpm --filter web sample:sync` 가 다시 만든다.
// =====================================================================

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))

describe('SAMPLE_DOCUMENT 는 정본 픽스처 goals.md 와 byte 로 같다', () => {
  it('본문이 같다', () => {
    const fixture = readFileSync(join(repoRoot, 'fixtures', 'paylab-docs', 'goals.md'), 'utf8')
    expect(SAMPLE_DOCUMENT.content).toBe(fixture)
    expect(SAMPLE_DOCUMENT.content.length).toBeGreaterThan(1000)
  })

  it('종류는 계약의 값이고 제목이 「예시」임을 말한다', () => {
    expect(SOURCE_DOCUMENT_KINDS).toContain(SAMPLE_DOCUMENT.kind)
    expect(SAMPLE_DOCUMENT.title).toContain('예시')
  })

  it('가져오기 화면이 그것을 채우는 버튼을 실제로 그린다 — 서버를 부르지 않는 버튼이다', () => {
    const page = readFileSync(join(repoRoot, 'apps', 'web', 'src', 'app', 't', '[team]', 'p', '[project]', 'import', 'page.tsx'), 'utf8')
    expect(page).toContain('예시 문서 붙여넣기')
    const fn = page.slice(page.indexOf('function fillSample'), page.indexOf('async function submit'))
    expect(fn).toContain('SAMPLE_DOCUMENT.content')
    expect(fn).not.toMatch(/createDocument|fetch\(/)
  })
})
