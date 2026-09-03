import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { BUNDLE_OUT, bundleText } from '../scripts/build'
import { EXIT } from '../src/cli/exit'

// =====================================================================
//  커밋된 번들이 소스와 **같은지** (SPEC §1.2 「esbuild 단일 ESM 번들」)
//
//  🔴 왜 이 시험이 필요한가 — `bin/contextops-cli.mjs` 는 커밋되는 산출물이다.
//    플러그인을 깐 사람은 그 파일만 받고 `src/` 는 보지도 않는다. 소스만 고치고
//    빌드를 잊으면 **시험은 전부 초록인데 사용자는 옛 CLI 를 돌린다.**
//    빌드를 잊는 것은 시간 문제이므로, 잊으면 여기가 빨개진다.
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('bin/contextops-cli.mjs', () => {
  it('소스에서 방금 만든 번들과 바이트가 같다 — 아니면 `pnpm --filter @contextops/plugin build`', async () => {
    const committed = readFileSync(join(packageRoot, BUNDLE_OUT), 'utf8')
    expect(await bundleText()).toBe(committed)
  })

  it('노드가 그대로 실행한다 — 의존성 설치 없이 (`--help` 는 exit 0)', () => {
    const out = execFileSync(process.execPath, [join(packageRoot, BUNDLE_OUT), '--help'], { encoding: 'utf8' })
    expect(out).toContain('contextops')
    expect(out).toContain('setup')
  })

  it('모르는 명령은 exit 64 로 끝난다 — 프로세스까지 이어지는지 잰다', () => {
    let status = 0
    try {
      execFileSync(process.execPath, [join(packageRoot, BUNDLE_OUT), 'nope'], { encoding: 'utf8', stdio: 'pipe' })
    } catch (err) {
      status = (err as { status?: number }).status ?? 0
    }
    expect(status).toBe(EXIT.USAGE)
  })
})
