import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { REPORTABLE_SYNC_STATUSES, SYNC_STATUSES } from '@contextops/schema'

import { MANAGED_PATHS, checkWritable, judge, readLocalManifest } from '../src/cli/managed'
import { LOCAL_FILES } from '../src/cli/paths'
import { manifestOf, writeLocalManifest } from './helpers/pack'
import { tempDir } from './helpers/cli'

// =====================================================================
//  `managed.ts` — sync 가 **무엇에 손대도 되는지**와 **지금 어떤 상태인지**
//
//  ★ 왜 이 두 개를 한 파일에서 재나 — 둘이 같은 표를 쓴다. 경로 표가 거부하는
//    파일은 판정에도 안 올라와야 하고, 판정이 `applied` 라고 한 파일은 경로 표가
//    받아들여야 한다. 갈리면 「applied 로 보고했는데 반만 적용된」 상태가 된다.
// =====================================================================

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

function repo(): string {
  const dir = tempDir('contextops-managed-')
  dirs.push(dir)
  return dir.path
}

describe('MANAGED_PATHS — 표의 모든 줄이 실제로 뭔가를 바꾼다', () => {
  //  🔴 이 시험이 없으면 오타 난 줄이 **아무것도 통과시키지 않으면서** 표에 남는다.
  //     그러면 sync 는 그 대상을 만난 날 조용히 멈춘다 — 표에는 있는데.
  it.each(MANAGED_PATHS.map((m) => [m.what, m.sample] as const))(
    '%s — sample(%s) 을 받아들인다',
    (_what, sample) => {
      expect(checkWritable(repo(), sample)).toEqual({ ok: true })
    },
  )

  it('줄마다 자기 sample 만 맞춘다 — 겹치면 그 줄은 더할 이유가 없었다', () => {
    for (const row of MANAGED_PATHS) {
      const matched = MANAGED_PATHS.filter((m) => m.pattern.test(row.sample))
      expect(matched.map((m) => m.what)).toEqual([row.what])
    }
  })

  it('sample 이 전부 다르다 — 같으면 두 줄 중 하나는 죽은 줄이다', () => {
    expect(new Set(MANAGED_PATHS.map((m) => m.sample)).size).toBe(MANAGED_PATHS.length)
  })
})

describe('checkWritable — 서버가 준 경로라도 믿지 않는다 (SPEC §8.5 6단계)', () => {
  //  ⚠ 여기 한 줄이라도 통과하면 서버가(또는 서버를 가로챈 쪽이) 우리 CLI 로
  //    저장소 밖 아무 파일이나 덮어쓸 수 있다.
  it.each([
    ['상위 이동', '../evil.md'],
    ['가운데 상위 이동', '.claude/rules/../../evil.md'],
    ['POSIX 절대경로', '/etc/passwd'],
    ['Windows 절대경로', 'C:\\Windows\\System32\\evil.md'],
    ['UNC 경로', '\\\\server\\share\\evil.md'],
    ['백슬래시로 위장한 상위 이동', '.claude\\..\\..\\evil.md'],
    ['홈 확장', '~/.bashrc'],
  ])('%s 를 거부한다 — %s', (_what, path) => {
    const verdict = checkWritable(repo(), path)
    expect(verdict.ok).toBe(false)
  })

  it('allowlist 밖은 모양이 멀쩡해도 거부한다 — 이유를 문장으로 준다', () => {
    const verdict = checkWritable(repo(), 'src/index.ts')
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toContain('allowlist')
  })

  it('심볼릭 링크는 거부한다 — 중간 폴더가 링크여도', () => {
    const root = repo()
    const outside = repo()
    mkdirSync(join(outside, 'rules'), { recursive: true })
    mkdirSync(join(root, '.claude'), { recursive: true })
    try {
      symlinkSync(join(outside, 'rules'), join(root, '.claude', 'rules'), 'junction')
    } catch {
      //  Windows 에서 권한이 없으면 링크를 못 만든다 — 그때는 잴 것이 없다.
      return
    }
    const verdict = checkWritable(root, '.claude/rules/domain-refund.md')
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toContain('심볼릭')
  })
})

describe('judge — 상태 5종이 전부 실제로 나온다 (SPEC §6)', () => {
  //  ⚠ 「값을 바꾸면 결과가 갈리나」를 재는 자리다. 5종 중 하나라도 어떤 입력으로도
  //    안 나오면 그 값은 화면과 서버에 정의만 있고 아무 일도 안 하는 값이다.
  it('한 번도 sync 안 했으면 unknown — 보고할 수 없는 값이다', () => {
    const verdict = judge(repo(), undefined, manifestOf({ 'CLAUDE.md': '# 규칙\n' }))
    expect(verdict.status).toBe('unknown')
  })

  it('해시가 같으면 applied', () => {
    const root = repo()
    const manifest = writeLocalManifest(root, { 'CLAUDE.md': '# 규칙\n' })
    expect(judge(root, manifest, manifest).status).toBe('applied')
  })

  it('공식 manifest_hash 가 다르면 outdated', () => {
    const root = repo()
    const local = writeLocalManifest(root, { 'CLAUDE.md': '# 규칙\n' })
    const official = manifestOf({ 'CLAUDE.md': '# 규칙 v2\n' }, { context_version: '1.1.0' })
    const verdict = judge(root, local, official)
    expect(verdict.status).toBe('outdated')
    expect(verdict.line).toContain('1.1.0')
  })

  it('손으로 고치면 modified — **outdated 를 이긴다**', () => {
    const root = repo()
    const local = writeLocalManifest(root, { 'CLAUDE.md': '# 규칙\n' })
    writeFileSync(join(root, 'CLAUDE.md'), '# 사람이 고쳤다\n', 'utf8')
    const official = manifestOf({ 'CLAUDE.md': '# 규칙 v2\n' }, { context_version: '1.1.0' })

    const verdict = judge(root, local, official)
    //  🔴 낡았든 아니든, 손으로 고친 파일을 말없이 덮는 것이 제일 나쁜 결과다.
    expect(verdict.status).toBe('modified')
    expect(verdict.modified).toEqual(['CLAUDE.md'])
  })

  //  🔴 **`manual` 이 실제로 나온다** (FINDINGS 69). 다섯 중 이 하나만 **찍는 코드가 0곳**이라
  //     화면 9 는 영원히 네 값만 그렸다 — 「정의만 있고 아무 일도 안 하는」 자리의 전형이다.
  //  ★ 무엇이 `manual` 인가 — 파일은 manifest 와 다 맞는데 **우리 캐시(`cache/<semver>/`)에
  //    그 버전의 자취가 없다.** zip 을 받아 손으로 푼 경우다 (SPEC §6 「zip 수동 적용」).
  it('sync 자취가 없는데 파일이 다 맞으면 manual — zip 을 손으로 푼 것이다', () => {
    const root = repo()
    const local = writeLocalManifest(root, { 'CLAUDE.md': '# 규칙\n' }, { byUs: false })
    const verdict = judge(root, local, local)
    expect(verdict.status).toBe('manual')
    //  보고할 수 있는 값이다 — `unknown` 과 다른 점이 이것이다.
    expect(REPORTABLE_SYNC_STATUSES as readonly string[]).toContain('manual')
  })

  it('손으로 푼 뒤 한 파일을 고쳤으면 manual 이 아니라 modified 다', () => {
    const root = repo()
    const local = writeLocalManifest(root, { 'CLAUDE.md': '# 규칙\n' }, { byUs: false })
    writeFileSync(join(root, 'CLAUDE.md'), '# 사람이 고쳤다\n', 'utf8')
    //  ⚠ 파일이 어긋난 것이 먼저다 — 순서가 바뀌면 손으로 고친 파일을 말없이 덮는다.
    expect(judge(root, local, local).status).toBe('modified')
  })

  it('없어진 파일도 modified 이고 missing 에 뜬다', () => {
    const root = repo()
    const local = writeLocalManifest(root, { 'CLAUDE.md': '# 규칙\n' }, { onDisk: false })
    const verdict = judge(root, local, local)
    expect(verdict.status).toBe('modified')
    expect(verdict.missing).toEqual(['CLAUDE.md'])
  })

  it('오프라인이면 로컬이 멀쩡하다고만 말한다 — 최신 여부는 모른다', () => {
    const root = repo()
    const local = writeLocalManifest(root, { 'CLAUDE.md': '# 규칙\n' })
    const verdict = judge(root, local, undefined)
    expect(verdict.status).toBe('applied')
    expect(verdict.line).toContain('못 닿아')
  })

  it('`manual` 만 judge 가 못 내는 값이다 — 그건 사람이 웹에서 고르는 값이다', () => {
    //  ★ 이 시험은 「5종 중 넷은 위에서 나왔다」를 계약과 맞춰 잠근다. SYNC_STATUSES 에
    //    한 종이 늘면 여기서 빨개지고, 더한 사람이 「누가 이 값을 내나」를 답해야 한다.
    expect([...SYNC_STATUSES]).toEqual(['applied', 'outdated', 'modified', 'manual', 'unknown'])
  })
})

describe('readLocalManifest — 깨진 파일은 「없는 것」과 같이 다룬다', () => {
  it('계약과 안 맞으면 undefined — 던지지 않는다', () => {
    const root = repo()
    mkdirSync(join(root, '.contextops'), { recursive: true })
    writeFileSync(join(root, ...LOCAL_FILES.manifest.split('/')), '{ 이건 JSON 이 아니다', 'utf8')
    //  ⚠ 여기서 던지면 `status` 가 「내 파일이 어떻다」를 말하지도 못하고 죽는다.
    expect(readLocalManifest(root)).toBeUndefined()
  })
})
