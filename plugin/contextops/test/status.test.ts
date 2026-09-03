import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SyncReceiptFile } from '@contextops/schema'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { LOCAL_DIR, LOCAL_FILES } from '../src/cli/paths'
import { fakeCli, failEnvelope, okEnvelope, tempDir } from './helpers/cli'
import { PROJECT, manifestOf, writeLocalManifest } from './helpers/pack'

// =====================================================================
//  `status` — **파일을 하나도 바꾸지 않는다** (docs/SPEC.md §8.3)
//
//  ★ 왜 그게 시험할 거리인가 — 훅이 「/contextops:status 를 해 봐라」로 안내하는
//    첫 명령이다. 여기서 뭔가를 쓰면 사용자는 「보기만 했는데 내 저장소가 바뀌었다」를
//    겪는다. 그 한 번으로 이 도구는 끝난다.
//
//  ⚠ 예외 하나는 **못 보낸 보고의 재전송**이다. 그건 서버로 가는 것이고 저장소 파일이
//    아니다 — 성공하면 receipt 를 지우는 것까지가 그 예외의 전부다.
// =====================================================================

const ORIGIN = 'https://contextops.example.com'
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
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function connect(repo: string, home: string): void {
  writeJson(join(repo, ...LOCAL_FILES.project.split('/')), { api_origin: ORIGIN, project_id: PROJECT })
  writeJson(join(home, LOCAL_DIR, 'credentials.json'), { [ORIGIN]: { [PROJECT]: { token: TOKEN } } })
}

describe('contextops status', () => {
  it('연결 안 된 저장소에서도 0 이다 — 고장이 아니라 아직 안 이은 것이다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['status'])).toBe(EXIT.OK)
    expect(cli.out.join('\n')).toContain('setup')
    expect(cli.requests).toHaveLength(0)
  })

  it('최신이면 applied 이고 0 이다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(local)] })

    expect(await runCommand(cli, ['status'])).toBe(EXIT.OK)
    expect(cli.out.join('\n')).toContain('applied')
  })

  it('공식이 새로 나오면 outdated 인데 **0 이다** — 갱신은 고장이 아니다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    const next = manifestOf({ 'CLAUDE.md': '# v2\n' }, { context_version: '1.1.0' })
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(next)] })

    //  ⚠ 여기서 1 을 내면 팀 규칙이 갱신됐다는 이유로 남의 CI 가 빨개진다.
    expect(await runCommand(cli, ['status'])).toBe(EXIT.OK)
    expect(cli.out.join('\n')).toContain('sync 로 받아라')
  })

  it('손으로 고쳐졌으면 exit 1 이고 --force 를 가리킨다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    writeFileSync(join(repo, 'CLAUDE.md'), '# 사람이 고쳤다\n', 'utf8')
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(local)] })

    expect(await runCommand(cli, ['status'])).toBe(EXIT.MODIFIED)
    expect(cli.out.join('\n')).toContain('--force')
  })

  it('--offline 은 서버에 묻지 않는다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['status', '--offline'])).toBe(EXIT.OK)
    expect(cli.requests).toHaveLength(0)
    expect(cli.out.join('\n')).toContain('applied')
  })

  it('서버가 거절해도 로컬 판정은 낸다 — 다른 질문이기 때문이다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    const cli = fakeCli({ cwd: repo, home, responses: [failEnvelope(500, 'INTERNAL', '서버가 아프다')] })

    expect(await runCommand(cli, ['status'])).toBe(EXIT.OK)
    expect(cli.err.join('\n')).toContain('INTERNAL')
    expect(cli.out.join('\n')).toContain('applied')
  })

  it('파일을 하나도 바꾸지 않는다 — 저장소 목록이 그대로다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    const before = readFileSync(join(repo, 'CLAUDE.md'), 'utf8')
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(local)] })

    await runCommand(cli, ['status'])

    expect(readFileSync(join(repo, 'CLAUDE.md'), 'utf8')).toBe(before)
    //  🔴 `sync` 가 쓰는 두 자리가 status 로는 생기지 않는다.
    expect(existsSync(join(repo, ...LOCAL_FILES.latestCache.split('/')))).toBe(false)
    expect(existsSync(join(repo, LOCAL_DIR, 'backups'))).toBe(false)
  })
})

describe('status — 밀렸던 보고를 다시 보낸다 (SPEC §8.5 8단계)', () => {
  function leaveReceipt(repo: string, manifestHash: string): void {
    writeJson(join(repo, ...LOCAL_FILES.syncReceipt.split('/')), SyncReceiptFile.parse({
      project_id: PROJECT,
      api_origin: ORIGIN,
      report: { version: '1.0.0', manifest_hash: manifestHash, status: 'applied', files: [] },
    }))
  }

  it('보내지면 receipt 를 지운다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    leaveReceipt(repo, local.manifest_hash)
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(local), okEnvelope({ ok: true })] })

    expect(await runCommand(cli, ['status'])).toBe(EXIT.OK)
    expect(existsSync(join(repo, ...LOCAL_FILES.syncReceipt.split('/')))).toBe(false)
    expect(cli.out.join('\n')).toContain('밀렸던 보고')
  })

  it('또 실패하면 **조용히** 남겨 둔다 — 오프라인인 사람이 매번 빨간 줄을 보지 않게', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    leaveReceipt(repo, local.manifest_hash)
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(local), { throws: 'ECONNRESET' }] })

    expect(await runCommand(cli, ['status'])).toBe(EXIT.OK)
    expect(existsSync(join(repo, ...LOCAL_FILES.syncReceipt.split('/')))).toBe(true)
    expect(cli.err.join('\n')).not.toContain('보고')
  })
})
