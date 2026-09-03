import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { LOCAL_DIR, LOCAL_FILES } from '../src/cli/paths'
import { tempDir } from './helpers/cli'
import { PROJECT, manifestOf, writeLocalManifest } from './helpers/pack'

// =====================================================================
//  SessionStart 훅 (docs/SPEC.md §8.6)
//
//  ★ 왜 프로세스로 띄워서 재나 — 이 파일은 번들이 아니다. Claude Code 가
//    `node <경로>` 로 **그대로** 부른다. import 해서 재면 `@contextops/schema` 를
//    쓰는 실수가 시험에서만 통과한다 (테스트 러너는 워크스페이스를 아니까).
//
//  🔴 **P6 을 행동으로 잰다.** `tools/principles.ps1` 은 쓰기 API 이름을 grep 하지만,
//     그건 「그 이름을 안 썼다」까지다. 여기서는 훅을 진짜로 돌린 뒤 **저장소의
//     모든 파일 바이트와 mtime 이 그대로인지** 본다 — 어떻게 썼든 걸린다.
//
//  ⚠ 서버를 띄우지 않는다. 알림 갈래는 **cache** 로 들어간다 (SPEC §8.6 「5분 내
//    cache 있으면 재사용」) — 그 길이 실제 사용자의 대부분이기도 하다.
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const HOOK = join(packageRoot, 'scripts', 'session-start.mjs')

const ORIGIN = 'https://contextops.example.com'
/** 닿을 수 없는 자리. 오프라인 갈래를 즉시(연결 거부) 만든다. */
const DEAD_ORIGIN = 'http://127.0.0.1:1'
const TOKEN = 'ctx_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'
const CLAUDE_MD = '# 팀 규칙\n\n환불은 7일 안에만 된다.\n<!-- ctx:item_abc:1 -->\n'
const PACK = { 'CLAUDE.md': CLAUDE_MD }

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

function world(): { repo: string; home: string } {
  const repo = tempDir('contextops-repo-')
  const home = tempDir('contextops-home-')
  dirs.push(repo, home)
  return { repo: repo.path, home: home.path }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function connect(repo: string, home: string, origin = ORIGIN): void {
  writeJson(join(repo, ...LOCAL_FILES.project.split('/')), { api_origin: origin, project_id: PROJECT })
  writeJson(join(home, LOCAL_DIR, 'credentials.json'), { [origin]: { [PROJECT]: { token: TOKEN } } })
}

/** 훅을 진짜로 돌린다. 홈은 임시 폴더로 돌려놓는다 — 개발 기계의 토큰을 안 본다. */
function runHook(repo: string, home: string): string {
  return execFileSync(process.execPath, [HOOK], {
    cwd: repo,
    encoding: 'utf8',
    //  ⚠ `homedir()` 는 POSIX 에서 HOME · Windows 에서 USERPROFILE 을 본다. 둘 다 준다.
    env: { ...process.env, HOME: home, USERPROFILE: home },
    timeout: 15_000,
  })
}

/** 저장소 안의 모든 파일 → `경로: 바이트 · mtime`. P6 을 재는 자로 쓴다. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (at: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      const stat = statSync(full)
      out[relative(root, full).split(sep).join('/')] =
        `${readFileSync(full, 'utf8')}\n@${stat.mtimeMs}`
    }
  }
  walk(root)
  return out
}

/** 방금 받은 것처럼 보이게 한다 (SPEC §8.6 「5분 내」). */
function freshCache(repo: string, value: unknown): void {
  const path = join(repo, ...LOCAL_FILES.latestCache.split('/'))
  writeJson(path, value)
  const now = Date.now() / 1000
  utimesSync(path, now, now)
}

describe('session-start 훅 — 조용한 것이 기본이다', () => {
  it('연결 안 된 저장소에서는 한 글자도 내지 않는다', async () => {
    const { repo, home } = world()
    writeFileSync(join(repo, 'README.md'), '# 남의 저장소\n', 'utf8')

    expect(runHook(repo, home)).toBe('')
  })

  it('토큰이 없으면 조용하다 — project.json 만 clone 받은 사람이 여기다', async () => {
    const { repo, home } = world()
    writeJson(join(repo, ...LOCAL_FILES.project.split('/')), { api_origin: ORIGIN, project_id: PROJECT })

    expect(runHook(repo, home)).toBe('')
  })

  it('서버에 못 닿으면 조용하다 — 캐시도 낡았을 때', async () => {
    const { repo, home } = world()
    connect(repo, home, DEAD_ORIGIN)
    writeLocalManifest(repo, PACK)

    expect(runHook(repo, home)).toBe('')
  })

  it('최신이면 조용하다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    freshCache(repo, local)

    expect(runHook(repo, home)).toBe('')
  })
})

describe('session-start 훅 — 알릴 것이 있을 때만 알린다', () => {
  it('공식이 새로 나오면 버전 둘과 부를 명령을 말한다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    freshCache(repo, manifestOf({ 'CLAUDE.md': '# v2\n' }, { context_version: '1.1.0' }))

    const output = runHook(repo, home)

    expect(output).toContain('1.0.0')
    expect(output).toContain('1.1.0')
    expect(output).toContain('/contextops:sync')
    //  SPEC §8.6 「6줄 이내」 — 세션 머리를 우리 줄로 덮지 않는다.
    expect(output.trimEnd().split('\n').length).toBeLessThanOrEqual(6)
    //  P6 을 사용자에게도 말한다 — 「이 도구가 내 파일을 고치나」가 첫 의심이다.
    expect(output).toContain('Hook은 파일을 변경하지 않습니다')
  })

  it('한 번도 sync 안 했으면 「아직 받지 않았다」다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    freshCache(repo, manifestOf(PACK))

    const output = runHook(repo, home)

    expect(output).toContain('아직 받지 않았다')
    expect(output).toContain('/contextops:sync')
  })

  it('대기 중인 초안이 있으면 같이 알린다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    freshCache(repo, manifestOf({ 'CLAUDE.md': '# v2\n' }, { context_version: '1.1.0' }))
    writeJson(join(repo, ...LOCAL_FILES.pendingProposal.split('/')), { items: [] })

    expect(runHook(repo, home)).toContain('/contextops:propose')
  })

  it('깨진 파일에도 죽지 않는다 — 훅이 죽으면 사용자는 우리 도구가 고장 났다고 읽는다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeFileSync(join(repo, ...LOCAL_FILES.manifest.split('/')), '{ JSON 아님', 'utf8')
    freshCache(repo, '이것도 Manifest 가 아니다')

    //  던지면 execFileSync 가 던진다 — 그게 곧 실패다.
    expect(() => runHook(repo, home)).not.toThrow()
  })
})

describe('🔴 P6 — 훅은 파일을 변경하지 않는다', () => {
  it.each([
    ['알릴 것이 있을 때', true],
    ['조용할 때', false],
  ])('%s 도 저장소의 모든 바이트와 mtime 이 그대로다', async (_what, notify) => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    writeFileSync(join(repo, 'README.md'), '# 남의 파일\n', 'utf8')
    const local = manifestOf(PACK)
    freshCache(repo, notify ? manifestOf({ 'CLAUDE.md': '# v2\n' }, { context_version: '1.1.0' }) : local)

    const before = snapshot(repo)
    runHook(repo, home)
    const after = snapshot(repo)

    //  ★ 새 파일도, 지워진 파일도, 한 바이트 바뀐 파일도 여기서 걸린다.
    expect(after).toEqual(before)
  })
})

describe('hooks.json — 가리키는 것이 전부 있다 (SPEC §8.1)', () => {
  const hooksJson = JSON.parse(readFileSync(join(packageRoot, 'hooks', 'hooks.json'), 'utf8')) as {
    hooks: Record<string, { hooks: { type: string; command: string; timeout?: number }[] }[]>
  }
  const commands = Object.values(hooksJson.hooks).flatMap((entries) => entries.flatMap((e) => e.hooks))

  it('plugin.json 이 이 파일을 가리킨다 — 안 가리키면 훅은 아예 안 돈다', () => {
    const manifest = JSON.parse(
      readFileSync(join(packageRoot, '.claude-plugin', 'plugin.json'), 'utf8'),
    ) as Record<string, unknown>
    expect(manifest['hooks']).toBe('./hooks/hooks.json')
  })

  it('훅이 하나 이상 있다 — 표가 비면 위 검사가 아무것도 안 잰다', () => {
    expect(commands.length).toBeGreaterThan(0)
  })

  it.each(commands.map((c) => [c.command] as const))(
    '가리키는 스크립트가 디스크에 있다 — %s',
    (command) => {
      //  ⚠ 없는 파일을 가리키면 사용자는 **매 세션 오류 줄**을 본다. 그건 고장이다.
      const name = /scripts\/([A-Za-z0-9._-]+\.mjs)/.exec(command)?.[1]
      expect(name).toBeDefined()
      expect(readFileSync(join(packageRoot, 'scripts', name!), 'utf8').length).toBeGreaterThan(0)
    },
  )

  it('timeout 이 훅 안의 네트워크 한도보다 길다 — 짧으면 훅이 늘 강제 종료된다', () => {
    const hookSource = readFileSync(HOOK, 'utf8')
    const networkMs = Number(/NETWORK_TIMEOUT_MS = (\d+)/.exec(hookSource)?.[1] ?? 0)
    expect(networkMs).toBeGreaterThan(0)
    for (const command of commands) {
      expect((command.timeout ?? 0) * 1000).toBeGreaterThan(networkMs)
    }
  })
})
