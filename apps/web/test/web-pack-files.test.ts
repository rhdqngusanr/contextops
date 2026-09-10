import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Manifest } from '@contextops/schema'
import { describe, expect, it } from 'vitest'

import { orderPackFiles, PACK_ENTRY, splitPackPath } from '../src/lib/web/pack-files'

// =====================================================================
//  화면 7 파일 트리의 차례와 이름 (2026-09-11) — 「맨 윗줄 = 처음 여는 파일」이 한 함수에서 나온다.
// =====================================================================

const golden = join(fileURLToPath(new URL('..', import.meta.url)), '..', '..', 'packages', 'compiler', 'test', 'golden', 'case-1-small', 'expected', 'manifest.json')

describe('orderPackFiles', () => {
  it('현관(CLAUDE.md) → 루트 파일 → 폴더 파일이고, 묶음 안은 코드포인트순이다', () => {
    const files = ['.claude/rules/a.md', 'AGENTS.md', 'CLAUDE.md', '.cursor/rules/x.mdc'].map((path) => ({ path }))
    expect(orderPackFiles(files).map((f) => f.path)).toEqual(['CLAUDE.md', 'AGENTS.md', '.claude/rules/a.md', '.cursor/rules/x.mdc'])
  })

  it('입력 배열은 그대로다 — 확인표(manifest.files)의 차례는 서버 것이다 (P4)', () => {
    const files = ['b.md', 'CLAUDE.md', 'a.md'].map((path) => ({ path }))
    const before = files.map((f) => f.path)
    orderPackFiles(files)
    expect(files.map((f) => f.path)).toEqual(before)
  })

  it('골든 Pack 의 첫 줄도 현관이다 — 화면이 처음 여는 파일과 맨 윗줄이 같다', () => {
    const manifest = Manifest.parse(JSON.parse(readFileSync(golden, 'utf8')))
    const ordered = orderPackFiles(manifest.files)
    expect(ordered[0]?.path).toBe(PACK_ENTRY)
    expect(ordered.length).toBe(manifest.files.length)
    //  폴더 파일은 루트 파일 뒤에 온다.
    const firstFolder = ordered.findIndex((f) => f.path.includes('/'))
    for (let i = firstFolder; i < ordered.length; i += 1) expect(ordered[i]!.path).toContain('/')
  })
})

describe('splitPackPath', () => {
  it('폴더와 이름 둘로 가른다 — 루트 파일은 폴더가 빈 글자다', () => {
    expect(splitPackPath('CLAUDE.md')).toEqual({ dir: '', name: 'CLAUDE.md' })
    expect(splitPackPath('.claude/rules/architecture.md')).toEqual({ dir: '.claude/rules/', name: 'architecture.md' })
    expect(splitPackPath('.cursor/rules/contextops.mdc')).toEqual({ dir: '.cursor/rules/', name: 'contextops.mdc' })
  })

  it('둘을 이으면 원래 경로다 — 이름이 낱말 가운데서 잘리지 않는다', () => {
    for (const path of ['CLAUDE.md', '.claude/rules/domain-payment.md', '.claude/rules/scoped-src-webhook.md']) {
      const { dir, name } = splitPackPath(path)
      expect(dir + name).toBe(path)
      expect(name).not.toContain('/')
    }
  })
})
