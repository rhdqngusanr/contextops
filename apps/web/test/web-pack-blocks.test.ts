import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { traceLines } from '@contextops/compiler/tag'

import { CtxTag, ITEM_TYPE_LABEL } from '../src/components/chips'
import { formatBytes } from '../src/lib/web/bytes'
import { packBlocks, stripComments } from '../src/lib/web/pack-blocks'

// =====================================================================
//  Pack 파일 → 블록 (2026-09-11) — 줄 → 항목의 정본(`traceLines`)을 묶기만 한다는 것을 골든 파일로 잰다.
// =====================================================================

const golden = join(fileURLToPath(new URL('..', import.meta.url)), '..', '..', 'packages', 'compiler', 'test', 'golden', 'case-1-small', 'expected', 'CLAUDE.md')

describe('packBlocks', () => {
  const content = readFileSync(golden, 'utf8')
  const blocks = packBlocks(content)
  const trace = traceLines(content)

  it('항목 블록의 꼬리표 집합이 traceLines 의 꼬리표 집합과 같다 — 항목이 빠지거나 남지 않는다', () => {
    const fromBlocks = new Set(blocks.filter((b) => b.tag !== null).map((b) => b.tag!.itemId))
    const fromTrace = new Set([...trace.values()].map((t) => t.itemId))
    expect(fromBlocks).toEqual(fromTrace)
  })

  it('항목 블록의 마지막 줄이 그 꼬리표의 줄이다 — 블록을 누르면 옛 줄 보기와 같은 항목이 뜬다', () => {
    for (const b of blocks) {
      if (b.tag === null) continue
      expect(trace.get(b.end)?.itemId, `${b.tag.itemId} @${b.end}`).toBe(b.tag.itemId)
      for (let i = b.start; i <= b.end; i += 1) expect(trace.get(i)?.itemId, `${b.tag.itemId} 줄 ${i}`).toBe(b.tag.itemId)
    }
  })

  it('렌더할 글자에는 HTML 주석(꼬리표)이 없고, 절 머리는 안 속한 블록으로 남는다 — 감추지 않는다', () => {
    for (const b of blocks) expect(b.text, `@${b.start}`).not.toContain('<!--')
    const heads = blocks.filter((b) => b.tag === null).map((b) => b.text)
    expect(heads.some((t) => t.startsWith('## Mission'))).toBe(true)
    expect(heads.some((t) => t.startsWith('# paylab'))).toBe(true)
    expect(stripComments('a <!-- x --> b')).toBe('a b')
  })

  it('한 항목이 여러 줄이면 한 블록이다 (미션의 세 줄 · 로드맵의 done_when 줄)', () => {
    const mission = blocks.find((b) => b.tag?.itemId === 'item_pl_mission')
    expect(mission).toBeDefined()
    expect(mission!.end - mission!.start).toBe(2)
    expect(mission!.text).toContain('> 작년 장애')
    const m1 = blocks.find((b) => b.tag?.itemId === 'item_pl_m1')
    expect(m1!.text).toContain('done_when')
  })

  //  주소에 `#L` 이 없으면 화면이 골라 두는 문단이다 (2026-09-11) — 누르기 전까지 오른쪽이 빈 칸이면
  //  이 화면의 주장(출처가 붙는다)이 첫 3초에 안 보인다. 고르는 규칙만 여기서 잰다.
  it('주소에 줄 번호가 없을 때 골라지는 첫 항목 블록이 문서의 첫 꼬리표 줄을 담는다', () => {
    const firstTagged = blocks.find((b) => b.tag !== null)
    expect(firstTagged).toBeDefined()
    const firstTraced = Math.min(...trace.keys())
    expect(firstTagged!.start).toBeLessThanOrEqual(firstTraced)
    expect(firstTagged!.end).toBeGreaterThanOrEqual(firstTraced)
    //  화면은 `end` 를 고른다 — 옛 줄 보기에서 같은 줄을 누른 것과 같은 항목이 뜬다.
    expect(trace.get(firstTagged!.end)?.itemId).toBe(firstTagged!.tag!.itemId)
    //  그 앞은 전부 안 속한 블록이다 — 「첫 항목」을 건너뛰지 않는다.
    for (const b of blocks.slice(0, blocks.indexOf(firstTagged!))) expect(b.tag).toBeNull()
  })
})

// ---------------------------------------------------------------------
//  화면 7 의 낱말 — 파일 크기 · 꼬리표 툴팁 · 안 들어간 항목 (2026-09-11 의 지적 한 벌).
//  ★ 값은 그대로 두고 낱말만 사람 말로 바꾼 자리들이라, 「값이 안 바뀌었나」를 같이 잰다.
// ---------------------------------------------------------------------

describe('파일 크기의 낱말', () => {
  it('1024 미만은 그대로 B, 그 위는 소수 한 자리로 KB · MB 다', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(6310)).toBe('6.2 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
  })

  it('가장 큰 단위에서 멈춘다 — 이름 없는 단위를 지어내지 않는다', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1024.0 MB')
  })
})

describe('꼬리표 칩의 툴팁', () => {
  it('항목 제목을 알면 툴팁 앞에 붙고, 칩의 글자는 그대로 항목 id 다', () => {
    const html = renderToStaticMarkup(createElement(CtxTag, { itemId: 'item_x', revision: 3, title: '정책 · PSP 재시도' }))
    expect(html).toContain('정책 · PSP 재시도')
    expect(html).toContain('item_x')
    expect(html).toContain('개정 3')
  })

  it('제목을 모르면 지어내지 않는다 — 툴팁에 항목 이름 자리가 없다', () => {
    const html = renderToStaticMarkup(createElement(CtxTag, { itemId: 'item_x' }))
    expect(html).toContain('item_x')
    expect(html).not.toContain('「')
  })
})

describe('화면 7 page.tsx 의 글자', () => {
  const page = readFileSync(
    fileURLToPath(new URL('../src/app/t/[team]/p/[project]/packs/[semver]/page.tsx', import.meta.url)), 'utf8',
  )

  it('안 들어간 항목은 제목·종류가 먼저 서고, 이유 원문은 그대로 남는다', () => {
    const excluded = page.slice(page.indexOf('function Excluded'))
    expect(excluded).toContain('{item.title}')
    expect(excluded).toContain('{ITEM_TYPE_LABEL[item.type]}')
    //  「적용 중」이 아닌 항목에만 상태 칩 — 화면 5 문서 보기와 같은 규칙이다.
    expect(excluded).toContain("item.status !== 'active'")
    //  이유 원문은 확인표에 박힌 기록이라(P4) 바꾸지도 감추지도 않는다.
    expect(excluded).toContain('{e.reason}')
    //  못 찾은 항목은 예전 모양 그대로 — 제목을 지어내지 않는다.
    expect(excluded).toContain('byItemId.get(e.item_id)')
  })

  it('세 자리의 꼬리표가 같은 툴팁 표(ctxTitle)를 읽는다 — 문단 끝 · 출처 패널 · 안 들어간 항목', () => {
    expect((page.match(/title=\{ctxTitle\(/g) ?? []).length).toBe(3)
    //  타입의 영어 값은 화면에 없다 — 라벨 표를 거친다.
    expect(page).not.toContain('>open_question<')
    expect(ITEM_TYPE_LABEL.open_question).toBe('답이 필요한 질문')
  })

  it('누르는 단위의 낱말은 표 하나다 — 문서 보기는 문단, 원본 보기는 줄', () => {
    expect(page).toContain("const UNIT: Record<'doc' | 'raw', string> = { doc: '문단', raw: '줄' }")
    expect(page).toContain('unit={UNIT[mode]}')
    expect(page).toContain('이 {unit}의 출처')
    //  배너의 낱말도 기본 보기와 같다.
    expect(page).toContain('아무 문단이나 누르면')
    expect(page).not.toContain('아무 줄이나 누르면')
  })

  it('파일 크기·확인값은 사람 말 낱말이고, 알고리즘 이름은 툴팁에만 남는다', () => {
    expect(page).toContain('확인값 <span className="mono">{file.sha256.slice(0, 8)}</span> · {formatBytes(file.size)}')
    expect(page).toContain('title={`sha256 ${file.sha256}`}')
    expect(page).not.toContain('{file.size}B')
  })
})
