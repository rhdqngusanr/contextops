import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// =====================================================================
//  🔴 `docs/DEPLOY.md` 가 **코드와 다른 절차를 적고 있지 않은가** (PLAN P5 첫 행)
//
//  ★ 왜 시험인가 — 배포 절차는 **1년에 몇 번만 밟는 글**이다. 코드가 앞서 가도 아무도
//    모르고, 알아채는 순간은 늘 「배포가 안 되는 날」이다. 그래서 문서로 두지 않고
//    **잰다** (CLAUDE.md 「같은 지적이 두 번 나오면 게이트로 올려라 — 게이트는 문서보다 강하다」).
//
//  재는 것:
//    ① `.env.example` 의 **모든 키**가 DEPLOY.md 에서 「넣는다」 또는 「안 넣는다」로
//       한 번씩 결정된다 — 새 환경변수가 배포에서 조용히 빠지는 것이 이 저장소의 단골 고장이다
//    ② DEPLOY.md 에 `.env.example` 에 없는 키를 넣으라고 적지 않았다 (없는 것 위에 짓지 않는다)
//    ③ DEPLOY.md 가 부르는 Cron 경로가 `vercel.json` 의 스케줄과 같다
//    ④ DEPLOY.md 가 적는 `pnpm --filter web <script>` 가 전부 실제 스크립트다
//    ⑤ DEPLOY.md 가 백틱으로 가리키는 저장소 경로가 전부 실제로 있다
//       (`readme.test.ts` ②와 같은 잣대 — 없는 파일을 근거로 삼는 절차는 근거가 없다)
//
//  ⚠ 이 시험이 재지 못하는 것: 절차가 **먹히는가**. 그건 사람이 한 번 밟아야 안다 —
//    밟은 결과를 재는 것은 `pnpm --filter web verify:prod` 다 (`e2e/production.ts`).
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')

const deploy = readFileSync(join(repoRoot, 'docs', 'DEPLOY.md'), 'utf8')
const envExample = readFileSync(join(webRoot, '.env.example'), 'utf8')
const vercel = JSON.parse(readFileSync(join(webRoot, 'vercel.json'), 'utf8')) as
  { crons?: { path: string; schedule: string }[] }
const pkg = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf8')) as
  { scripts?: Record<string, string> }

/** `.env.example` 이 정본이다 — 주석이 아닌 `KEY=` 줄의 키. */
const envKeys = envExample
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l !== '' && !l.startsWith('#'))
  //  ⚠ `split` 은 늘 한 조각 이상을 낸다 — `?? ''` 는 타입을 좁히는 자리이지 값이 비는 자리가 아니다.
  .map((l) => l.split('=')[0] ?? '')

describe('① .env.example 의 모든 키가 DEPLOY.md 에서 한 번씩 결정된다', () => {
  it('키를 하나도 안 빠뜨리고 적는다', () => {
    expect(envKeys.length).toBeGreaterThan(0)
    const undecided = envKeys.filter((k) => !deploy.includes(`\`${k}\``))
    expect(undecided, '이 키를 배포에 넣을지 말지가 DEPLOY.md 에 없다').toEqual([])
  })
})

describe('② DEPLOY.md 가 없는 환경변수를 넣으라고 하지 않는다', () => {
  it('백틱 안의 대문자 키가 전부 .env.example 에 있다', () => {
    //  `ABC_DEF` 모양(대문자·숫자·밑줄 · 밑줄 하나 이상)만 환경변수로 본다.
    const mentioned = [...deploy.matchAll(/`([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)`/g)]
      .flatMap((m) => (m[1] === undefined ? [] : [m[1]]))
    const unknown = [...new Set(mentioned)].filter((k) => !envKeys.includes(k))
    //  ⚠ 코드 안의 상수(`DEFAULT_MAX_INPUT_TOKENS` 등)는 환경변수가 아니다 — 면제한다.
    const constants = ['DEFAULT_MAX_INPUT_TOKENS', 'INSTALL_STEPS']
    expect(unknown.filter((k) => !constants.includes(k))).toEqual([])
  })
})

describe('③ DEPLOY.md 의 Cron 경로가 vercel.json 과 같다', () => {
  const scheduled = (vercel.crons ?? []).map((c) => c.path)

  it('vercel.json 에 cron 이 있다', () => {
    expect(scheduled.length).toBeGreaterThan(0)
  })

  it('손으로 부르라고 적은 문이 실제로 스케줄에 있는 문이다', () => {
    //  걸음 ⑤ 의 curl 이 부르는 경로
    const called = [...deploy.matchAll(/https:\/\/<production>(\/api\/v1\/[^\s`)]+)/g)].map((m) => m[1])
    expect(called.length, 'DEPLOY.md 가 부르는 문이 없다').toBeGreaterThan(0)
    for (const path of called) expect(scheduled).toContain(path)
  })

  it('그 문의 자물쇠가 코드에도 있다', () => {
    const cron = readFileSync(join(webRoot, 'src', 'lib', 'api', 'cron.ts'), 'utf8')
    expect(cron).toContain('CRON_SECRET')
    expect(deploy).toContain('`CRON_SECRET`')
  })
})

describe('④ DEPLOY.md 가 적는 명령이 실제 스크립트다', () => {
  it('pnpm --filter web <script> 가 전부 package.json 에 있다', () => {
    const names = [...deploy.matchAll(/pnpm --filter web ([a-z:]+)/g)].map((m) => m[1])
    expect(names.length, 'DEPLOY.md 에 명령이 없다').toBeGreaterThan(0)
    for (const name of [...new Set(names)]) {
      expect(Object.keys(pkg.scripts ?? {}), `«${name}» 스크립트가 없다`).toContain(name)
    }
  })

  it('완료 기준의 명령이 verify:prod 다', () => {
    expect(deploy).toContain('pnpm --filter web verify:prod')
    expect(pkg.scripts?.['verify:prod']).toBe('tsx e2e/production.ts')
  })
})

describe('⑤ DEPLOY.md 가 가리키는 경로가 전부 실제로 있다', () => {
  it('백틱 안의 저장소 경로가 실존한다', () => {
    //  `apps/web/vercel.json` · `src/lib/api/log.ts` 처럼 슬래시가 있고 확장자가 있는 것만 본다.
    const paths = [...deploy.matchAll(/`([\w./-]+\/[\w.-]+\.(?:ts|tsx|md|json|example|vercel))`/g)]
      .flatMap((m) => (m[1] === undefined ? [] : [m[1]]))
    expect(paths.length, 'DEPLOY.md 가 가리키는 파일이 없다').toBeGreaterThan(0)

    const missing = [...new Set(paths)].filter((p) => {
      //  경로는 저장소 뿌리 또는 apps/web 기준 둘 중 하나로 적힌다 (문서가 읽기 쉬운 쪽).
      return !existsSync(join(repoRoot, p)) && !existsSync(join(webRoot, p))
    })
    expect(missing, '이 경로가 저장소에 없다').toEqual([])

    //  🔴 있어도 **gitignore 대상이면 GitHub 러너에는 없다** — 2026-09-09 에 `.env.vercel` 을 백틱으로
    //     적었더니 로컬 CI 는 초록이고 GitHub Actions 만 빨갰다. 로컬에서도 같은 판정이 나게 여기서 잰다.
    const ignored = [...new Set(paths)].filter((p) => {
      const rel = existsSync(join(repoRoot, p)) ? p : join('apps', 'web', p)
      try {
        execFileSync('git', ['check-ignore', '-q', rel], { cwd: repoRoot, stdio: 'ignore' })
        return true // exit 0 = ignored
      } catch {
        return false // exit 1 = 추적 대상 (128 = git 없음 → 여기서는 못 재고, 러너의 존재 검사가 잰다)
      }
    })
    expect(ignored, 'gitignore 대상 경로를 백틱으로 가리켰다 — GitHub 러너에는 그 파일이 없다').toEqual([])
  })
})
