import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SETUP_COMMAND_NAME } from '@contextops/schema'

import { COMMAND_IN_TEXT, CommandBox, CommandText, Step, Steps, Why } from '../src/components/guide'
import { ScreenEmpty } from '../src/components/states'
import { EMPTY_PLACES } from '../src/lib/web/screens'

// =====================================================================
//  🔴 안내 문장의 모양 — 할 일은 번호 걸음 · 이유는 접는다 · 명령은 떠 보인다 (FINDINGS 177 · DESIGN_BRIEF §3 「공통 컴포넌트」)
//
//  ★ 2026-09-15 사용자: 「명령들 텍스트를 좀 눈에 잘 보이게 해 줘 — 지금은 엄청 긴 설명문 보는 느낌이야」(범위: 전체적으로).
//    시안 셋 중 「번호 걸음과 접는 설명」을 골랐다. 여기서 재는 것:
//    ① 모양 넷이 그리는 마크업 — 번호를 글자로 안 적는다 · 접힌 채로 시작한다 · 명령은 검은 상자
//    ② 문장 속 명령만 떠 보이고 문장은 그대로다 — 명령 머리는 스키마에서 온다
//    🔴 ③ 모양은 한 곳에서만 짓는다 — 클래스 이름이 `guide.tsx`·`globals.css` 밖에 없다 · 네 자리가 그 모양을 쓴다
//    🔴 ④ 누르기 전에 읽어야 하는 문장은 접지 않는다 (가져오기의 AI 전송 고지 — 기기 추가의 경고는 `web-add-device.test.ts`)
//  ⚠ 이 시험이 재지 **못하는** 것: 번호 원·밑줄·검은 상자가 눈에 실제로 어떻게 보이나 — 캡처가 본다.
// =====================================================================

const webSrc = fileURLToPath(new URL('../src', import.meta.url))
const globalsCss = readFileSync(join(webSrc, 'app', 'globals.css'), 'utf8')
const read = (...parts: string[]): string => readFileSync(join(webSrc, ...parts), 'utf8')
const draw = (node: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(node)
const plain = (html: string): string => html.replace(/<[^>]+>/g, '')

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) sourceFiles(full, found)
    else if (/\.(ts|tsx|css)$/.test(full)) found.push(full)
  }
  return found
}

describe('① 모양 넷이 그리는 마크업', () => {
  it('걸음은 `ol` 이고 번호를 글자로 적지 않는다 — 차례가 곧 번호다(CSS 카운터)', () => {
    const html = draw(createElement(Steps, {
      label: '할 일',
      children: [
        createElement(Step, { key: 'a', title: '팀 이름을 적습니다' }),
        createElement(Step, { key: 'b', title: '주소용 이름을 정합니다' }),
      ],
    }))
    expect(html.startsWith('<ol class="guide-steps" aria-label="할 일">')).toBe(true)
    expect(html.match(/<li class="guide-step">/g)).toHaveLength(2)
    //  글자로 읽으면 제목뿐이다 — 「1.」「2)」 같은 번호가 마크업에 없다.
    expect(plain(html)).toBe('팀 이름을 적습니다주소용 이름을 정합니다')
    expect(globalsCss).toMatch(/\.guide-steps\s*\{[^}]*counter-reset:\s*guide-step/)
    expect(globalsCss).toMatch(/\.guide-step\s*\{[^}]*counter-increment:\s*guide-step/)
    expect(globalsCss).toMatch(/\.guide-step::before\s*\{[^}]*content:\s*counter\(guide-step\)/)
  })

  it('제목에 `htmlFor` 를 주면 그 칸의 이름표(`label for`)이고, 안 주면 문단이다 · 「선택」은 제목 옆에', () => {
    expect(draw(createElement(Step, { title: '한 줄 설명을 적습니다', htmlFor: 'p-desc', optional: '선택' })))
      .toContain('<label class="guide-step-title" for="p-desc">한 줄 설명을 적습니다<span class="guide-optional">선택</span></label>')
    expect(draw(createElement(Step, { title: '그 저장소에서 Claude Code 를 엽니다' })))
      .toContain('<p class="guide-step-title">그 저장소에서 Claude Code 를 엽니다</p>')
  })

  it('접는 설명은 **접힌 채로** 시작한다 — 요약줄은 질문이고, 답은 그 밑에 있다', () => {
    const html = draw(createElement(Why, { summary: '한글도 되나요?', children: createElement('p', null, '한글도 됩니다.') }))
    expect(html).toBe('<details class="guide-why"><summary>한글도 되나요?</summary><div class="guide-why-body"><p>한글도 됩니다.</p></div></details>')
  })

  it('복사할 명령은 검은 상자 안의 `code` 이고, 바깥은 본문을 가로로 밀지 않는 `scroll-x` 다', () => {
    const command = `${SETUP_COMMAND_NAME} --project p-1`
    const html = draw(createElement(CommandBox, {
      command,
      action: createElement('button', { type: 'button', className: 'btn btn-sm' }, '복사'),
    }))
    expect(html).toBe(`<div class="scroll-x"><div class="cmd-box"><code>${command}</code><button type="button" class="btn btn-sm">복사</button></div></div>`)
    expect(globalsCss).toMatch(/\.cmd-box\s*\{[^}]*background:\s*var\(--term-bg\)[^}]*color:\s*var\(--term-ink\)/)
    //  검은 상자 안에서는 검정 포커스 링이 안 보인다 — 색만 바꾼 규칙이 있다.
    expect(globalsCss).toMatch(/\.cmd-box \.btn:focus-visible\s*\{[^}]*outline-color:\s*var\(--term-ink\)/)
  })
})

describe('② 문장 속 명령만 떠 보인다 — 문장은 그대로', () => {
  it('명령 머리는 스키마의 `SETUP_COMMAND_NAME` 에서 자른다 — 플러그인 이름을 코드에 따로 적지 않는다', () => {
    expect('Claude Code 에서 /contextops:sync 를 실행합니다.'.split(COMMAND_IN_TEXT))
      .toEqual(['Claude Code 에서 ', '/contextops:sync', ' 를 실행합니다.'])
    expect(SETUP_COMMAND_NAME.split(COMMAND_IN_TEXT)).toEqual(['', SETUP_COMMAND_NAME, ''])
    expect(read('components', 'guide.tsx')).not.toMatch(/['"]\/contextops/)
  })

  it('명령이 있으면 모노 칩으로 서고, 없으면 문장에 손대지 않는다', () => {
    expect(draw(createElement(CommandText, { text: '그 팀원이 /contextops:sync 를 실행합니다.' })))
      .toBe('그 팀원이 <code class="cmd-inline">/contextops:sync</code> 를 실행합니다.')
    expect(draw(createElement(CommandText, { text: '결정할 것이 없습니다.' }))).toBe('결정할 것이 없습니다.')
  })

  it('빈 상태 문장 속 명령도 칩으로 서고, 글자로 읽으면 표의 문장 그대로다', () => {
    const html = draw(createElement(ScreenEmpty, { slot: 'proposals.list', base: '/t/a/p/b' }))
    expect(html).toContain('<code class="cmd-inline">/contextops:propose</code>')
    expect(plain(html)).toContain(EMPTY_PLACES['proposals.list'].message)
  })
})

describe('🔴 ③ 모양은 한 곳에서만 짓는다', () => {
  it('모양의 클래스 이름이 `guide.tsx`·`globals.css` 밖에 적혀 있지 않다', () => {
    const SHAPE = /\b(?:guide-steps?|guide-step-(?:body|title)|guide-optional|guide-why(?:-body)?|cmd-box|cmd-inline)\b/
    const hits: string[] = []
    for (const file of sourceFiles(webSrc)) {
      if (file.endsWith(join('components', 'guide.tsx')) || file.endsWith(join('app', 'globals.css'))) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (SHAPE.test(line)) hits.push(`${file.slice(webSrc.length + 1)}:${i + 1}`)
      })
    }
    expect(hits, `모양은 components/guide.tsx 로 그린다: ${hits.join(' · ')}`).toEqual([])
  })

  it('네 자리가 그 모양을 쓴다 — 팀·프로젝트 만들기 · 가져오기 · 기기 추가', () => {
    const places = [
      { name: '팀 만들기', src: read('app', 't', 'new', 'page.tsx') },
      { name: '프로젝트 만들기', src: read('app', 't', '[team]', 'p', 'new', 'page.tsx') },
      { name: '가져오기', src: read('app', 't', '[team]', 'p', '[project]', 'import', 'page.tsx') },
      { name: '기기 추가', src: read('components', 'sync.tsx') },
    ]
    for (const place of places) {
      expect(place.src, place.name).toMatch(/<Steps[\s>]/)
      expect(place.src, place.name).toContain('<Why summary=')
    }
    expect(read('components', 'sync.tsx')).toContain('<CommandBox')
  })
})

describe('🔴 ④ 누르기 전에 읽어야 하는 문장은 접지 않는다', () => {
  it('가져오기의 AI 전송 고지는 어느 `<Why>` 안에도 없다', () => {
    const src = read('app', 't', '[team]', 'p', '[project]', 'import', 'page.tsx')
    const at = src.indexOf('AI_TRANSFER_NOTICE_NOW}')
    expect(at).toBeGreaterThan(-1)
    //  가장 가까운 여는 `<Why` 가 그 앞에서 이미 닫혔다.
    expect(src.lastIndexOf('<Why', at)).toBeLessThanOrEqual(src.lastIndexOf('</Why>', at))
  })
})
