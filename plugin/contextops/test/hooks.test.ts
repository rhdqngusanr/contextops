import { execFile, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { ProgressEvent } from '@contextops/schema'

import { LOCAL_DIR, LOCAL_FILES, progressMarkerFile } from '../src/cli/paths'
import { tempDir } from './helpers/cli'
import { PROJECT, manifestOf, writeLocalManifest } from './helpers/pack'

// =====================================================================
//  훅 둘 (docs/SPEC.md §8.6) — SessionStart 는 알리고, Stop 은 다음 세션에 남긴다
//
//  ★ 왜 프로세스로 띄워서 재나 — 이 파일은 번들이 아니다. Claude Code 가
//    `node <경로>` 로 **그대로** 부른다. import 해서 재면 `@contextops/schema` 를
//    쓰는 실수가 시험에서만 통과한다 (테스트 러너는 워크스페이스를 아니까).
//
//  🔴 **P6 을 행동으로 잰다.** `tools/principles.ps1` 은 쓰기 API 이름을 grep 하고
//     「선언(`hooks.json` 의 `_writes`)이 ignore 목록 안인가」까지 본다. 그건 정적이다.
//     여기서는 훅을 **진짜로 돌린 뒤** 바뀐 경로를 세어 **선언한 것과 정확히 같은지**
//     본다 — 어떤 쓰기 API 를 썼든, 어떤 경로로 새든 걸린다.
//
//  ⚠ 서버를 띄우지 않는다. 알림 갈래는 **cache** 로 들어간다 (SPEC §8.6 「5분 내
//    cache 있으면 재사용」) — 그 길이 실제 사용자의 대부분이기도 하다.
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const HOOK = join(packageRoot, 'scripts', 'session-start.mjs')
const STOP = join(packageRoot, 'scripts', 'stop.mjs')

/**
 * 🔴 **P6 의 선언표** (`hooks/hooks.json` 의 `_writes`). 여기서 읽어서 재는 것이
 * 요점이다 — 시험에 경로를 손으로 적으면 표를 넓혀도 시험이 안 빨개진다.
 */
const DECLARED_WRITES: Record<string, string[]> = JSON.parse(
  readFileSync(join(packageRoot, 'hooks', 'hooks.json'), 'utf8'),
)._writes ?? {}

/**
 * 선언표의 `<session>` 자리에 실제 세션 id 를 넣는다 — 그 이름 규칙의 정본은 `progressMarkerFile()` 이라
 * **그 함수로** 채운다. 훅이 다른 규칙으로 이름을 지으면 여기서 어긋난다.
 * ⚠ 선언에 `<session>` 이 있는데 그 자리에 무엇이 들어가는지 시험이 손으로 적으면, 훅과 CLI 가
 *   서로 다른 이름을 내도 둘 다 초록이다.
 */
function declaredWrites(hook: string, repo: string, sessionId: string): string[] {
  const marker = relative(repo, progressMarkerFile(repo, sessionId)).split(sep).join('/')
  return (DECLARED_WRITES[hook] ?? []).map((p) => (p.includes('<session>') ? marker : p))
}

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

/**
 * Stop 훅을 진짜로 돌린다. 세션 id 는 **stdin JSON** 으로 온다 (Claude Code 규약).
 *
 * 🔴 **`execFileSync` 를 쓰지 마라.** 아래 시험은 같은 프로세스에서 http 서버를
 *    띄우는데, 동기 호출이 이벤트 루프를 잡으면 서버가 응답을 못 한다 — 훅은
 *    timeout 까지 기다렸다 「오프라인」으로 물러서고, 증상은 **「보고가 0건」**이라
 *    원인이 하나도 안 보인다 (docs/STATUS.md 「밟은 함정」).
 */
function runStop(repo: string, home: string, sessionId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [STOP], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, USERPROFILE: home },
      timeout: 20_000,
    }, (err, stdout) => { if (err) reject(err); else resolve(stdout) })
    child.stdin?.end(JSON.stringify({ session_id: sessionId }))
  })
}

/** git 이 「무엇이 바뀌었나」를 답할 수 있게 만든다 — 커밋이 없으면 전부 untracked 다. */
function gitRepo(root: string): void {
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' })
}

/** 저장소 안의 모든 파일 → `경로: 바이트 · mtime`. P6 을 재는 자로 쓴다. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (at: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      //  ⚠ `.git/` 는 뺀다 — git 을 **읽기만** 해도 index 의 mtime 이 바뀐다.
      //    그건 훅이 저장소를 고친 것이 아니라 git 이 자기 캐시를 만진 것이다.
      if (entry.name === '.git') continue
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
    writeJson(join(repo, ...LOCAL_FILES.pendingProposal.split('/')), { changed_paths: ['migrations/001.sql'], hint: '마이그레이션이 바뀌었다' })

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

describe('🔴 P6 — 훅은 선언한 자리 밖을 건드리지 않는다', () => {
  it.each([
    ['알릴 것이 있을 때', true],
    ['조용할 때', false],
  ])('session-start 는 %s 도 저장소의 모든 바이트와 mtime 이 그대로다', async (_what, notify) => {
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

  it('stop 이 바꾼 경로가 _writes 선언과 정확히 같다', async () => {
    const { repo, home } = world()
    connect(repo, home, DEAD_ORIGIN)
    gitRepo(repo)
    writeLocalManifest(repo, PACK)
    //  정책 경로 하나를 건드린다 — 이게 훅이 힌트를 남기는 조건이다.
    writeFileSync(join(repo, 'README.md'), '# 남의 파일\n', 'utf8')
    mkdirSync(join(repo, 'migrations'), { recursive: true })
    writeFileSync(join(repo, 'migrations', '001.sql'), 'create table t();\n', 'utf8')

    const before = snapshot(repo)
    await runStop(repo, home, 'sess-1')
    const after = snapshot(repo)

    const changed = Object.keys(after).filter((path) => after[path] !== before[path])
    const removed = Object.keys(before).filter((path) => !(path in after))
    //  🔴 선언 밖의 파일은 **하나도** 바뀌지 않았다. 지워진 것도 없다.
    expect(removed).toEqual([])
    //  ⚠ 마일스톤이 없어 보고는 안 나갔다 — 그래서 표시 파일은 없고 힌트 하나만이다.
    //    선언은 **허가**라 둘 다 쓰지 않아도 된다. 둘 다 쓰는 경우는 아래 진행 보고 절이 잰다.
    const declared = declaredWrites('stop.mjs', repo, 'sess-1')
    expect(changed.length).toBeGreaterThan(0)
    for (const path of changed) expect(declared, `${path} 는 _writes 에 없는 자리다`).toContain(path)
  })

  it('할 말이 없으면 stop 도 아무것도 안 쓴다 — 선언은 허가지 의무가 아니다', async () => {
    const { repo, home } = world()
    connect(repo, home, DEAD_ORIGIN)
    gitRepo(repo)
    //  정책 경로가 아닌 파일만 바뀌었다.
    writeFileSync(join(repo, 'README.md'), '# 오탈자 하나\n', 'utf8')

    const before = snapshot(repo)
    await runStop(repo, home, 'sess-2')

    expect(snapshot(repo)).toEqual(before)
  })
})

describe('stop 훅 — 진행 보고 (SPEC §8.6)', () => {
  /** 훅이 진짜 소켓으로 말하게 한다. 받은 body 를 그대로 돌려준다. */
  async function listen(): Promise<{ origin: string; bodies: string[]; close(): Promise<void> }> {
    const bodies: string[] = []
    const server = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => {
        bodies.push(Buffer.concat(chunks).toString('utf8'))
        res.writeHead(202, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ data: { id: 'e1' }, meta: { request_id: PROJECT } }))
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port
    return {
      origin: `http://127.0.0.1:${port}`,
      bodies,
      close: () => new Promise((resolve) => { server.close(() => resolve()) }),
    }
  }

  /** 바뀐 경로가 이 마일스톤의 paths 안이다. */
  const withMilestone = { milestones: [{ id: 'M1', paths: ['migrations/**'], done_when: ['마이그레이션이 돈다'] }] }

  it('마일스톤 paths 가 걸리면 in_progress 를 보낸다 — 근거는 경로뿐이다 (P1)', async () => {
    const server = await listen()
    try {
      const { repo, home } = world()
      connect(repo, home, server.origin)
      gitRepo(repo)
      writeLocalManifest(repo, PACK, { overrides: withMilestone })
      mkdirSync(join(repo, 'migrations'), { recursive: true })
      writeFileSync(join(repo, 'migrations', '001.sql'), 'create table t();\n', 'utf8')

      await runStop(repo, home, 'sess-a')

      expect(server.bodies).toHaveLength(1)
      //  🔴 훅은 계약을 import 할 수 없다 (번들이 아니다) — body 를 손으로 짓는다.
      //     그래서 **여기서** 계약으로 판다. 아니면 진짜 서버의 400 으로만 드러나고,
      //     그건 훅이 조용히 삼키는 자리라 아무도 못 본다.
      const body = ProgressEvent.parse(JSON.parse(server.bodies[0] ?? '{}')) as unknown as Record<string, unknown>
      expect(body['milestone_id']).toBe('M1')
      expect(body['status']).toBe('in_progress')
      //  🔴 훅이 만든 보고라고 스스로 밝힌다 — agent 의 보고와 섞이면 안 된다.
      expect(body['source']).toBe('hook')
      //  🔴 P1 — 근거의 칸은 **경로 하나뿐이다.** 훅은 diff 를 읽지 않으므로
      //     줄 번호조차 모른다. 키가 하나라도 늘면 여기서 걸린다.
      const evidence = body['evidence'] as Record<string, unknown>[]
      expect(evidence.map((e) => e['path'])).toContain('migrations/001.sql')
      for (const one of evidence) expect(Object.keys(one)).toEqual(['path'])
      //  파일 내용은 payload 어디에도 없다.
      expect(server.bodies[0]).not.toContain('create table')
    } finally {
      await server.close()
    }
  })

  it('🔴 **두 턴 → 보고 1건** — Stop 은 턴마다 돌고, 보낸 뒤엔 자기가 표시를 남긴다 (INBOX G7)', async () => {
    const server = await listen()
    try {
      const { repo, home } = world()
      connect(repo, home, server.origin)
      gitRepo(repo)
      writeLocalManifest(repo, PACK, { overrides: withMilestone })
      mkdirSync(join(repo, 'migrations'), { recursive: true })
      writeFileSync(join(repo, 'migrations', '001.sql'), 'create table t();\n', 'utf8')

      const before = snapshot(repo)
      //  같은 세션의 두 턴 — 예전엔 둘 다 보냈다 (표시를 CLI 만 남겼고, CLI 는 env 이름이 틀려 한 번도 안 남겼다).
      await runStop(repo, home, 'sess-twice')
      await runStop(repo, home, 'sess-twice')
      expect(server.bodies).toHaveLength(1)

      //  🔴 P6 — 보고까지 한 턴이 쓴 것도 **선언한 둘**을 넘지 않는다 (힌트 + 표시).
      const after = snapshot(repo)
      const changed = Object.keys(after).filter((path) => after[path] !== before[path]).sort()
      expect(changed).toEqual([...declaredWrites('stop.mjs', repo, 'sess-twice')].sort())
      //  표시의 모양은 CLI 가 남기는 것과 같은 계약이다 — 읽는 쪽이 하나라서 그래야 한다.
      const marker = JSON.parse(readFileSync(progressMarkerFile(repo, 'sess-twice'), 'utf8')) as Record<string, unknown>
      expect(marker).toEqual({ session_id: 'sess-twice', milestone_id: 'M1', status: 'in_progress' })

      //  다른 세션은 다시 보낸다 — 표시는 세션 단위다.
      await runStop(repo, home, 'sess-other')
      expect(server.bodies).toHaveLength(2)
    } finally {
      await server.close()
    }
  })

  it('못 보냈으면 표시를 남기지 않는다 — 다음 턴에 한 번 더 기회가 있어야 한다', async () => {
    const { repo, home } = world()
    connect(repo, home, DEAD_ORIGIN)
    gitRepo(repo)
    writeLocalManifest(repo, PACK, { overrides: withMilestone })
    mkdirSync(join(repo, 'migrations'), { recursive: true })
    writeFileSync(join(repo, 'migrations', '001.sql'), 'create table t();\n', 'utf8')

    await runStop(repo, home, 'sess-offline')
    expect(existsSync(progressMarkerFile(repo, 'sess-offline'))).toBe(false)
  })

  it('같은 세션에 agent 가 이미 보고했으면 보내지 않는다 — 근거 개수를 부풀리지 않는다 (P7)', async () => {
    const server = await listen()
    try {
      const { repo, home } = world()
      connect(repo, home, server.origin)
      gitRepo(repo)
      writeLocalManifest(repo, PACK, { overrides: withMilestone })
      mkdirSync(join(repo, 'migrations'), { recursive: true })
      writeFileSync(join(repo, 'migrations', '001.sql'), 'create table t();\n', 'utf8')
      //  `progress --session sess-b` 가 남기는 표시 (경로 규칙의 정본은 paths.ts).
      writeJson(progressMarkerFile(repo, 'sess-b'), { session_id: 'sess-b', milestone_id: 'M1', status: 'in_progress' })

      await runStop(repo, home, 'sess-b')

      expect(server.bodies).toHaveLength(0)
    } finally {
      await server.close()
    }
  })

  it('세션 id 를 모르면 보내지 않는다 — 중복 보고보다 누락이 낫다', async () => {
    const server = await listen()
    try {
      const { repo, home } = world()
      connect(repo, home, server.origin)
      gitRepo(repo)
      writeLocalManifest(repo, PACK, { overrides: withMilestone })
      mkdirSync(join(repo, 'migrations'), { recursive: true })
      writeFileSync(join(repo, 'migrations', '001.sql'), 'create table t();\n', 'utf8')

      await runStop(repo, home, '')

      expect(server.bodies).toHaveLength(0)
    } finally {
      await server.close()
    }
  })

  it('연결 안 된 저장소에서는 아무 일도 하지 않는다', async () => {
    const server = await listen()
    try {
      const { repo, home } = world()
      gitRepo(repo)
      mkdirSync(join(repo, 'migrations'), { recursive: true })
      writeFileSync(join(repo, 'migrations', '001.sql'), 'create table t();\n', 'utf8')

      const before = snapshot(repo)
      await runStop(repo, home, 'sess-c')

      expect(server.bodies).toHaveLength(0)
      expect(snapshot(repo)).toEqual(before)
    } finally {
      await server.close()
    }
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

  it.each(commands.map((c) => [c.command, c] as const))(
    'timeout 이 그 훅 자신의 네트워크 한도보다 길다 — 짧으면 훅이 늘 강제 종료된다 · %s',
    (command, entry) => {
      //  ⚠ 훅마다 자기 한도가 있다. 한 훅의 상수로 전부를 재면, 다른 훅이 더 오래
      //    기다리게 바뀐 날 그 훅만 조용히 매번 강제 종료된다.
      const name = /scripts\/([A-Za-z0-9._-]+\.mjs)/.exec(command)?.[1] ?? ''
      const source = readFileSync(join(packageRoot, 'scripts', name), 'utf8')
      const networkMs = Number(/NETWORK_TIMEOUT_MS = (\d+)/.exec(source)?.[1] ?? 0)
      expect(networkMs).toBeGreaterThan(0)
      //  🔴 네트워크 한도만 재면 안 된다 — Stop 훅은 git 을 **두 번** 부르고 그 시간도 timeout 안이다.
      //    1500 × 2 + 2500 = 5500 > 5000 으로 **최악의 경우 매 턴 강제 종료**되던 자리다 (INBOX G7).
      //
      //  🔴 **마감을 선언한 훅은 그 하나가 최악이다** (2026-09-12). 단계마다 고정 한도를 두던 때는
      //     합을 여기서 세야 했고(`네트워크 + git × 호출 수`), 그 합이 git 의 한도를 1500 위로 못 가게
      //     묶어서 **부하에서 git 이 조용히 시간 초과되는 자리**가 됐다 (실측 최악 1235ms · stop.mjs 머리말 표).
      //     이제 `HOOK_BUDGET_MS` 를 선언한 훅은 어떤 단계도 그 마감을 못 넘으므로 **그 수 하나가 곧 최악**이다.
      //     ⚠ 그래서 단계를 하나 더해도 이 시험은 안 고친다 — 마감이 이미 그것을 덮는다.
      //  ⚠ 마감을 선언하지 않은 훅(`session-start.mjs`)은 예전 셈을 그대로 쓴다.
      //    git 호출 수는 소스에서 센다 — 호출을 하나 더하면 이 합이 저절로 는다.
      const budgetMs = Number(/HOOK_BUDGET_MS = (\d+)/.exec(source)?.[1] ?? 0)
      const gitMs = Number(/GIT_TIMEOUT_MS = (\d+)/.exec(source)?.[1] ?? 0)
      const gitCalls = (source.match(/\bgit\(root, \[/g) ?? []).length
      const worstMs = budgetMs > 0 ? budgetMs : networkMs + gitMs * gitCalls
      const how = budgetMs > 0
        ? `마감 ${budgetMs}`
        : `git ${gitCalls}×${gitMs} + 네트워크 ${networkMs}`
      expect((entry.timeout ?? 0) * 1000, `${name}: 최악 ${worstMs}ms (${how})`)
        .toBeGreaterThan(worstMs)

      //  🔴 마감을 선언했으면 **단계 상한이 마감보다 작아야** 뜻이 있다. 상한이 마감보다 크면
      //     그 상한은 한 번도 안 걸리는 죽은 수이고, 다음 사람은 그것을 살아 있는 값으로 읽는다.
      if (budgetMs > 0) {
        for (const [label, capMs] of [['git', gitMs], ['네트워크', networkMs]] as const) {
          expect(capMs, `${name}: ${label} 상한 ${capMs}ms 가 마감 ${budgetMs}ms 보다 크다 — 걸릴 일이 없는 수다`)
            .toBeLessThan(budgetMs)
        }
        //  ⚠ 모든 단계가 마감을 거치는가. 상한 상수를 `withinBudget()` 없이 그대로 넘기면
        //    그 단계만 마감 밖에 서고, 합이 조용히 5초를 넘는다.
        for (const constant of ['GIT_TIMEOUT_MS', 'NETWORK_TIMEOUT_MS']) {
          //  선언(`const X = 1`)은 `(?!\s*=)` 가, 올바른 사용(`withinBudget(X)`)은 lookbehind 가 뺀다.
          const bare = new RegExp(`(?<!withinBudget\\()\\b${constant}\\b(?!\\s*=)`, 'g')
          const uses = [...source.matchAll(bare)]
          expect(uses.length, `${name}: ${constant} 를 withinBudget() 없이 쓴 자리가 있다`).toBe(0)
        }
      }
    },
  )
})
