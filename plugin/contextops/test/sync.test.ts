import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Manifest, SyncReceiptFile, SyncReport } from '@contextops/schema'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { BACKUP_KEEP, IGNORED_LOCAL_PATHS, LOCAL_DIR, LOCAL_FILES } from '../src/cli/paths'
import {
  fakeCli, failEnvelope, notModified, okEnvelope, tempDir, textBody,
  type FakeCli, type FakeResponse,
} from './helpers/cli'
import { PROJECT, manifestOf, writeLocalManifest } from './helpers/pack'

// =====================================================================
//  `sync` — **이 명령만 사용자 파일을 바꾼다** (docs/SPEC.md §8.5)
//
//  ★ 여기서 재는 것은 「돌았다」가 아니라 **「안 돌아야 할 때 안 돈다」**다:
//    hash 가 다르면 멈춘다 · allowlist 밖이면 멈춘다 · 손으로 고쳐졌으면 멈춘다 ·
//    `--check` 는 한 바이트도 안 쓴다. 그 넷이 이 명령의 안전 전부다.
//
//  ⚠ 응답은 `responses` 큐로 **순서대로** 나간다. sync 의 순서는
//    ① manifest ② 파일마다 본문 ③ sync-reports POST 다.
// =====================================================================

const ORIGIN = 'https://contextops.example.com'
const TOKEN = 'ctx_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'

const CLAUDE_MD = '# 팀 규칙\n\n환불은 7일 안에만 된다.\n<!-- ctx:item_abc:1 -->\n'
const RULE_MD = '# 환불\n\n부분 환불은 금지다.\n<!-- ctx:item_def:1 -->\n'
const PACK: Record<string, string> = { 'CLAUDE.md': CLAUDE_MD, '.claude/rules/domain-refund.md': RULE_MD }

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

/** 빈 저장소와 빈 홈. 아직 `setup` 을 안 한 상태다. */
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

/**
 * `setup` 이 남기는 두 파일을 놓는다 — sync 는 이 전제에서만 돈다.
 * ⚠ `setup` 을 불러서 만들지 않는다. 그러면 sync 시험이 setup 의 갈래에 얽혀서,
 *   setup 이 바뀌는 날 sync 시험이 같이 빨개진다 (원인을 못 가린다).
 */
function connect(repo: string, home: string): void {
  writeJson(join(repo, ...LOCAL_FILES.project.split('/')), { api_origin: ORIGIN, project_id: PROJECT })
  writeJson(join(home, LOCAL_DIR, 'credentials.json'), { [ORIGIN]: { [PROJECT]: { token: TOKEN } } })
}

/** 「최신 Manifest → 파일 본문들 → 보고 200」 한 벌. */
function serve(manifest: Manifest, bodies: Record<string, string>, tail: FakeResponse[] = []): FakeResponse[] {
  return [
    okEnvelope(manifest, { etag: manifest.manifest_hash }),
    ...manifest.files.map((f) => textBody(bodies[f.path] ?? '')),
    ...tail,
  ]
}

function ready(options: { responses: FakeResponse[] }): { cli: FakeCli; repo: string } {
  const { repo, home } = world()
  connect(repo, home)
  return { cli: fakeCli({ cwd: repo, home, responses: options.responses }), repo }
}

const read = (root: string, rel: string): string => readFileSync(join(root, ...rel.split('/')), 'utf8')
const has = (root: string, rel: string): boolean => existsSync(join(root, ...rel.split('/')))

describe('sync — 처음 받는다', () => {
  it('파일을 쓰고 manifest 를 남기고 applied 로 보고한다', async () => {
    const manifest = manifestOf(PACK)
    const { cli, repo } = ready({ responses: serve(manifest, PACK, [okEnvelope({ ok: true })]) })

    const code = await runCommand(cli, ['sync'])

    expect(code).toBe(EXIT.OK)
    expect(read(repo, 'CLAUDE.md')).toBe(CLAUDE_MD)
    expect(read(repo, '.claude/rules/domain-refund.md')).toBe(RULE_MD)
    //  적용한 버전을 남긴다 — 다음 바퀴의 판정이 이 파일에 걸려 있다.
    expect(Manifest.parse(JSON.parse(read(repo, LOCAL_FILES.manifest))).manifest_hash)
      .toBe(manifest.manifest_hash)

    //  보고는 **경로와 해시뿐**이다 (P1). 본문이 실리면 여기서 걸린다.
    const report = cli.sent.at(-1)
    expect(report?.method).toBe('POST')
    expect(report?.url).toContain(`projects/${PROJECT}/sync-reports`)
    const body = SyncReport.parse(JSON.parse(report?.body ?? '{}'))
    expect(body.status).toBe('applied')
    expect(body.manifest_hash).toBe(manifest.manifest_hash)
    expect(report?.body).not.toContain('환불은 7일')
  })

  it('원본을 backups/ 에 남기고 `.contextops/.gitignore` 를 만든다', async () => {
    const manifest = manifestOf(PACK)
    const { cli, repo } = ready({ responses: serve(manifest, PACK, [okEnvelope({ ok: true })]) })
    writeFileSync(join(repo, 'CLAUDE.md'), '# 내가 쓰던 규칙\n', 'utf8')

    await runCommand(cli, ['sync'])

    const backups = readdirSync(join(repo, LOCAL_DIR, 'backups'))
    expect(backups).toHaveLength(1)
    expect(readFileSync(join(repo, LOCAL_DIR, 'backups', backups[0]!, 'CLAUDE.md'), 'utf8'))
      .toBe('# 내가 쓰던 규칙\n')

    //  FINDINGS 37 — 아무도 안 만들면 기계마다 다른 cache/scan.json 이 커밋된다.
    const rules = read(repo, `${LOCAL_DIR}/.gitignore`)
      .split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'))
    expect(rules).toEqual([...IGNORED_LOCAL_PATHS])
    //  🔴 `manifest.json` 은 **커밋 선택**이다 — 무시하면 팀이 적용 버전을 못 공유한다.
    expect(rules).not.toContain('manifest.json')
  })

  it('훅이 네트워크 없이 읽을 최신 Manifest 를 cache 에 남긴다 (SPEC §8.6)', async () => {
    const manifest = manifestOf(PACK)
    const { cli, repo } = ready({ responses: serve(manifest, PACK, [okEnvelope({ ok: true })]) })

    await runCommand(cli, ['sync'])

    expect(Manifest.parse(JSON.parse(read(repo, LOCAL_FILES.latestCache))).manifest_hash)
      .toBe(manifest.manifest_hash)
  })
})

describe('sync — 멈춰야 할 때 멈춘다', () => {
  it('🔴 받은 본문의 hash 가 Manifest 와 다르면 중단하고 **아무것도 안 바꾼다**', async () => {
    const manifest = manifestOf(PACK)
    //  서버가 준 바이트 한 글자만 다르다. 해시는 진짜로 재므로 실제로 갈린다.
    const broken = { ...PACK, 'CLAUDE.md': `${CLAUDE_MD}한 줄이 더 붙었다\n` }
    const { cli, repo } = ready({ responses: serve(manifest, broken) })

    const code = await runCommand(cli, ['sync'])

    expect(code).toBe(EXIT.NETWORK)
    //  ★ 「디스크를 건드리기 전에 전부 확보한다」가 지켜졌다는 증거다.
    expect(has(repo, 'CLAUDE.md')).toBe(false)
    expect(has(repo, LOCAL_FILES.manifest)).toBe(false)
    expect(has(repo, `${LOCAL_DIR}/backups`)).toBe(false)
    expect(cli.err.join('\n')).toContain('해시가 Manifest 와 다르다')
    //  보고를 보내지 않았다 — 적용하지 않았으니 보고할 것이 없다.
    expect(cli.sent.some((s) => s.method === 'POST')).toBe(false)
  })

  it('🔴 Manifest 가 allowlist 밖 경로를 담으면 받기도 전에 거부한다 (path traversal)', async () => {
    const manifest = manifestOf({ 'CLAUDE.md': CLAUDE_MD })
    //  계약(`RepoPath`)이 막는 모양은 Manifest.parse 가 이미 거부한다. 여기서 재는 것은
    //  **모양은 멀쩡한데 우리 관리 대상이 아닌** 경로다 — 서버만 믿으면 통과할 자리다.
    const evil = { ...manifest, files: [{ ...manifest.files[0]!, path: 'src/index.ts' }] }
    const { cli, repo } = ready({ responses: [okEnvelope(evil, { etag: manifest.manifest_hash })] })

    const code = await runCommand(cli, ['sync'])

    expect(code).toBe(EXIT.NETWORK)
    expect(cli.err.join('\n')).toContain('Pack 의 경로를 거부했다')
    expect(has(repo, 'src/index.ts')).toBe(false)
    //  파일 본문을 받으러 가지도 않았다 — 요청은 manifest 하나뿐이다.
    expect(cli.sent).toHaveLength(1)
  })

  it('손으로 고쳐진 파일이 있으면 --force 없이는 안 덮는다 (exit 1)', async () => {
    const local = manifestOf(PACK)
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    writeFileSync(join(repo, 'CLAUDE.md'), '# 사람이 고쳤다\n', 'utf8')
    const next = manifestOf({ ...PACK, 'CLAUDE.md': '# v2\n' }, { context_version: '1.1.0' })
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(next, { etag: local.manifest_hash })] })

    const code = await runCommand(cli, ['sync'])

    expect(code).toBe(EXIT.MODIFIED)
    expect(read(repo, 'CLAUDE.md')).toBe('# 사람이 고쳤다\n')
    expect(cli.err.join('\n')).toContain('--force')
  })

  it('--force 면 덮되 원본은 backup 에 남는다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    writeFileSync(join(repo, 'CLAUDE.md'), '# 사람이 고쳤다\n', 'utf8')
    const next = manifestOf({ ...PACK, 'CLAUDE.md': '# v2\n<!-- ctx:item_abc:1 -->\n' }, { context_version: '1.1.0' })
    const bodies = { ...PACK, 'CLAUDE.md': '# v2\n<!-- ctx:item_abc:1 -->\n' }
    const cli = fakeCli({ cwd: repo, home, responses: serve(next, bodies, [okEnvelope({ ok: true })]) })

    const code = await runCommand(cli, ['sync', '--force'])

    expect(code).toBe(EXIT.OK)
    expect(read(repo, 'CLAUDE.md')).toBe('# v2\n<!-- ctx:item_abc:1 -->\n')
    const backups = readdirSync(join(repo, LOCAL_DIR, 'backups'))
    expect(readFileSync(join(repo, LOCAL_DIR, 'backups', backups[0]!, 'CLAUDE.md'), 'utf8'))
      .toBe('# 사람이 고쳤다\n')
  })

  it('setup 을 안 한 저장소에서는 exit 30 이고 요청을 하나도 안 보낸다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home })

    expect(await runCommand(cli, ['sync'])).toBe(EXIT.CONFIG)
    expect(cli.requests).toHaveLength(0)
  })

  it('토큰이 401 이면 exit 30 이고 setup 을 가리킨다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const cli = fakeCli({
      cwd: repo, home,
      responses: [failEnvelope(401, 'UNAUTHORIZED', '알 수 없는 토큰이다')],
    })

    expect(await runCommand(cli, ['sync'])).toBe(EXIT.CONFIG)
    expect(cli.err.join('\n')).toContain('setup')
  })
})

describe('sync --check — 한 바이트도 안 쓴다', () => {
  it('outdated 를 보고만 하고 파일·캐시를 만들지 않는다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    const next = manifestOf({ ...PACK, 'CLAUDE.md': '# v2\n' }, { context_version: '1.1.0' })
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(next, { etag: local.manifest_hash })] })

    const code = await runCommand(cli, ['sync', '--check'])

    expect(code).toBe(EXIT.OK)
    expect(cli.out.join('\n')).toContain('outdated')
    expect(read(repo, 'CLAUDE.md')).toBe(CLAUDE_MD)
    //  ⚠ 캐시조차 안 쓴다. 한 파일이라도 예외를 두면 다음 사람이 두 번째 예외를 둔다.
    expect(has(repo, LOCAL_FILES.latestCache)).toBe(false)
    expect(cli.sent).toHaveLength(1)
  })

  it('modified 면 exit 1 — CI 가 이 숫자로 갈린다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    writeFileSync(join(repo, 'CLAUDE.md'), '# 사람이 고쳤다\n', 'utf8')
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope(local, { etag: local.manifest_hash })] })

    expect(await runCommand(cli, ['sync', '--check'])).toBe(EXIT.MODIFIED)
  })
})

describe('sync — 서버와의 갈래', () => {
  it('304 는 정상 경로다 — 「내가 가진 것이 최신」이라 받지 않고 applied 로 보고한다', async () => {
    const { repo, home } = world()
    connect(repo, home)
    const local = writeLocalManifest(repo, PACK)
    const cli = fakeCli({ cwd: repo, home, responses: [notModified(), okEnvelope({ ok: true })] })

    const code = await runCommand(cli, ['sync'])

    expect(code).toBe(EXIT.OK)
    //  ETag 를 실제로 보냈는가 — 안 보내면 서버는 304 를 줄 수 없다.
    expect(cli.sent[0]?.headers['if-none-match']).toBe(local.manifest_hash)
    //  파일을 받으러 가지 않았다: manifest + 보고 둘뿐이다.
    expect(cli.sent).toHaveLength(2)
    expect(cli.out.join('\n')).toContain('applied')
  })

  it('오프라인이면 아무것도 안 바꾸고 아는 것만 말한다 (exit 20)', async () => {
    const { repo, home } = world()
    connect(repo, home)
    writeLocalManifest(repo, PACK)
    const cli = fakeCli({ cwd: repo, home, responses: [{ throws: 'ECONNREFUSED' }] })

    const code = await runCommand(cli, ['sync'])

    expect(code).toBe(EXIT.NETWORK)
    expect(read(repo, 'CLAUDE.md')).toBe(CLAUDE_MD)
    expect(cli.out.join('\n')).toContain('applied')
  })

  it('보고만 실패하면 sync 는 성공이다 — receipt 를 남긴다', async () => {
    const manifest = manifestOf(PACK)
    const { cli, repo } = ready({ responses: serve(manifest, PACK, [{ throws: 'ECONNRESET' }]) })

    const code = await runCommand(cli, ['sync'])

    //  ★ 파일은 이미 올바르다. 여기서 실패로 되돌리면 **맞는 파일을 되돌리는** 꼴이다.
    expect(code).toBe(EXIT.OK)
    expect(read(repo, 'CLAUDE.md')).toBe(CLAUDE_MD)
    const receipt = SyncReceiptFile.parse(JSON.parse(read(repo, LOCAL_FILES.syncReceipt)))
    expect(receipt.report.manifest_hash).toBe(manifest.manifest_hash)
    expect(receipt.report.status).toBe('applied')
  })

  it(`backups/ 를 최근 ${BACKUP_KEEP}개만 남긴다`, async () => {
    const { repo, home } = world()
    connect(repo, home)
    //  같은 sync 를 여러 번 돌린다 — 매번 새 backup 이 생긴다.
    for (let i = 0; i < BACKUP_KEEP + 2; i++) {
      const version = `1.${i}.0`
      const body = `# v${i}\n<!-- ctx:item_abc:1 -->\n`
      const manifest = manifestOf({ 'CLAUDE.md': body }, { context_version: version })
      const cli = fakeCli({
        cwd: repo, home,
        responses: serve(manifest, { 'CLAUDE.md': body }, [okEnvelope({ ok: true })]),
      })
      expect(await runCommand(cli, ['sync'])).toBe(EXIT.OK)
    }

    //  ⚠ 첫 바퀴는 되돌릴 원본이 없어서 backup 폴더가 안 생긴다 — 그래서 이하다.
    expect(readdirSync(join(repo, LOCAL_DIR, 'backups')).length).toBeLessThanOrEqual(BACKUP_KEEP)
  })
})
