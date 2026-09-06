import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { WEB_TABS, whereOnWeb } from '../src/cli/where'

// =====================================================================
//  CLI 는 웹 화면의 주소를 조립하지 않는다 (FINDINGS 115 · SPEC §8.2 · §9)
//
//  🔴 왜 게이트인가 — 설정에는 uuid 뿐이고 웹 주소는 slug 다. uuid 로 지은 주소는
//    **그럴듯하게 찍히고 누르면 404** 라 시험 초록으로는 안 잡힌다. 같은 줄이 이미
//    두 파일(propose · upload-draft)에 있었다 — 「같은 지적이 두 번이면 게이트」.
//
//  ★ 무엇을 잠그나:
//    ① origin 뒤에 경로를 붙이는 소스는 `api.ts`(`/api/v1`) **하나**다
//    ② CLI 가 이름 부르는 탭은 웹의 탭 표에 **실제로 있는 label** 이다
//    ③ 안내 줄에는 origin 과 탭 이름이 있고 경로(`/p/`·`/t/`)는 없다
// =====================================================================

const here = dirname(fileURLToPath(import.meta.url))
const cliDir = join(here, '..', 'src', 'cli')
/**
 * 웹의 탭 표. 플러그인은 웹을 import 하지 못하므로(의존 방향) 파일을 글자로 읽는다.
 * ⚠ 이 표는 `layout.tsx` 안에 있었는데, 명령 팔레트(⌘K)가 같은 목록을 읽어야 해서
 *   `lib/web/screens.ts` 로 올라갔다 (FINDINGS 132). **정본은 거기 하나다.**
 */
const webScreens = join(here, '..', '..', '..', 'apps', 'web', 'src', 'lib', 'web', 'screens.ts')

/** `${…origin}/` — 템플릿 문자열에서 origin 바로 뒤에 슬래시를 붙이는 자리. */
const ORIGIN_THEN_PATH = /\$\{[^}]*origin\}\//i

describe('where.ts — 웹의 어디서 보나', () => {
  it('① origin 뒤에 경로를 붙이는 소스는 api.ts 하나다', () => {
    const offenders: string[] = []
    for (const file of readdirSync(cliDir).filter((f) => f.endsWith('.ts'))) {
      if (file === 'api.ts') continue
      const lines = readFileSync(join(cliDir, file), 'utf8').split('\n')
      lines.forEach((line, i) => { if (ORIGIN_THEN_PATH.test(line)) offenders.push(`${file}:${i + 1}`) })
    }
    expect(offenders).toEqual([])
    //  api.ts 는 그 자리가 **있어야** 한다 — 정규식이 살아 있다는 뜻이다.
    expect(readFileSync(join(cliDir, 'api.ts'), 'utf8')).toMatch(ORIGIN_THEN_PATH)
  })

  it('② CLI 가 부르는 탭 이름은 웹의 탭 표에 있는 label 그대로다', () => {
    const table = readFileSync(webScreens, 'utf8')
    const labels = [...table.matchAll(/label: '([^']+)'/g)].map((m) => m[1])
    expect(labels.length).toBeGreaterThan(0)
    for (const label of Object.values(WEB_TABS)) expect(labels).toContain(label)
  })

  it('③ 안내 줄에는 origin 과 탭 이름이 있고 경로는 없다', () => {
    const line = whereOnWeb('https://contextops.example.com', 'proposals', '「환불 창」 · id p1')
    expect(line).toContain('https://contextops.example.com')
    expect(line).toContain('「제안」')
    expect(line).toContain('id p1')
    expect(line).not.toMatch(/example\.com\//)
    expect(line).not.toContain('/p/')
    expect(line).not.toContain('/t/')
  })
})
