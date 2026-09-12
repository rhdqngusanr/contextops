import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// =====================================================================
//  production 감시(`.github/workflows/watch-prod.yml`)가 **실제로 재는가** (2026-09-13)
//
//  🔴 변수(`PROD_ORIGIN`)만 보던 때는 아무도 그 변수를 안 넣어서, 09-11 부터 모든 실행이 「건너뛴다」로 초록이었다.
//     DEPLOY·제출서는 「30분 감시」라고 적고 있었다 — 적힌 감시와 도는 감시가 갈라진 자리를 잠근다.
// =====================================================================

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const workflow = readFileSync(join(repoRoot, '.github', 'workflows', 'watch-prod.yml'), 'utf8')
const submission = readFileSync(join(repoRoot, 'docs', 'SUBMISSION.md'), 'utf8')

const row = (label: string): string => submission.split('\n').find((line) => line.startsWith(`| ${label} |`)) ?? ''
const origin = /PROD_ORIGIN: \$\{\{(.+)\}\}/.exec(workflow)?.[1]?.trim() ?? ''

describe('watch-prod — 변수 없이도 이 저장소의 production 을 잰다', () => {
  it('변수가 있으면 변수가 먼저다', () => {
    expect(origin.startsWith('vars.PROD_ORIGIN ||')).toBe(true)
  })

  it('🔴 변수가 없으면 이 저장소일 때만 기본 origin 으로 떨어진다 — fork 는 남의 production 을 두드리지 않는다', () => {
    const repo = /github\.com\/([^/>\s)]+\/[^/>\s)]+)/.exec(row('공개 저장소 URL'))?.[1]
    expect(repo).toBeDefined()
    expect(origin).toContain(`github.repository == '${repo}'`)
  })

  it('🔴 기본 origin 이 제출서 🙋 표의 production URL 과 같다 — 둘이 갈라지면 감시가 옛 주소를 잰다', () => {
    const fallback = /'(https:\/\/[^']+)'/.exec(origin)?.[1]
    const url = /https:\/\/[^\s|)]+/.exec(row('production URL'))?.[0]
    expect(fallback).toBeDefined()
    expect(url).toBe(fallback)
  })

  it('값이 비면 건너뛰는 갈래는 fork 를 위해 남아 있다', () => {
    expect(workflow).toContain('if [ -z "${PROD_ORIGIN:-}" ]; then')
  })
})
