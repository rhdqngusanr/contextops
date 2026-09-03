import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Manifest, SyncReceiptFile, type SyncReport } from '@contextops/schema'

import { apiGet, apiGetText, apiPost } from './api'
import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { EXIT } from './exit'
import { atomicWriteFile, readTextIfExists, sha256OfText, writeJsonFile } from './fsx'
import { checkWritable, judge, readLocalManifest, type LocalStatus } from './managed'
import { readyOrExplain, reportFailure, type Session } from './session'
import {
  BACKUP_DIR, BACKUP_KEEP, CACHE_DIR, IGNORED_LOCAL_PATHS, LOCAL_DIR, LOCAL_FILES,
  repoFile,
} from './paths'

// =====================================================================
//  `contextops sync` — 발행된 Pack 을 이 저장소에 적용한다 (docs/SPEC.md §8.5)
//
//  🔴 **이 명령만 사용자 파일을 바꾼다.** 훅도 Skill 도 안 바꾼다 (P6).
//     그래서 여기 8단계는 순서가 곧 안전이다:
//       ① preflight  ② latest manifest(ETag)  ③ 로컬 hash 대조  ④ 받아서 sha 검증
//       ⑤ backup     ⑥ atomic 교체            ⑦ post-verify     ⑧ 보고
//
//  ★ 왜 「받아서 검증」이 「backup」보다 **앞**인가 — 뒤에 두면 서버가 깨진 바이트를
//    준 날에 우리는 이미 원본을 옮긴 뒤다. 되돌릴 수는 있지만, 되돌릴 필요가
//    없는 게 낫다. **디스크를 건드리기 전에 받을 것을 전부 확보한다.**
//
//  ★ 왜 마지막(보고) 실패가 sync 실패가 아닌가 — 파일은 이미 올바르다. 거기서
//    실패로 되돌리면 **맞는 파일을 되돌리는** 꼴이다. 보고만 미루고 receipt 를 남긴다.
// =====================================================================

export const SYNC_FLAGS: FlagSpecs = {
  'dir': { kind: 'value', help: '저장소 루트 (기본: 지금 폴더)' },
  'check': { kind: 'bool', help: '상태만 본다 — 파일을 하나도 바꾸지 않는다' },
  'force': { kind: 'bool', help: '손으로 바뀐 파일도 덮어쓴다 (backup 은 남는다)' },
}

function preflight(cli: Cli, flags: Flags): Session {
  const session = readyOrExplain(cli, flags)
  if (!session.ok) return session

  //  🔴 디스크 쓰기 가능 확인 (SPEC §8.5 1단계). **여기서 못 쓰면 5단계에서 못 쓴다** —
  //     차이는 그때는 이미 backup 을 만들려던 중이라는 것뿐이다.
  //     ⚠ sync 만 이걸 한다. 읽기만 하는 명령까지 probe 를 하면 읽기 전용
  //       체크아웃에서 `status` 가 못 돈다 (`session.ts` 주석).
  try {
    const probe = join(session.ready.root, ...CACHE_DIR.split('/'), '.writable')
    mkdirSync(dirname(probe), { recursive: true })
    atomicWriteFile(probe, '')
    rmSync(probe, { force: true })
  } catch (err) {
    cli.io.err(`${LOCAL_DIR}/ 에 쓸 수 없다 — ${err instanceof Error ? err.message : '알 수 없는 이유'}`)
    return { ok: false, code: EXIT.CONFIG }
  }

  return session
}

/** 상태 판정을 사람이 읽는 줄로. `status` 도 같은 모양을 쓴다. */
export function printStatus(cli: Cli, s: LocalStatus): void {
  cli.io.out(`${s.status}: ${s.line}`)
  for (const path of s.modified) cli.io.out(`  ✎ ${path} — 손으로 바뀌었다`)
  for (const path of s.missing) cli.io.out(`  ✗ ${path} — 없다`)
}

/**
 * `.contextops/.gitignore` — 우리가 만드는 파일만 우리가 무시한다 (SPEC §8.2 「ignore」).
 *
 * ★ 왜 sync 가 쓰나 — backups/ 를 **만드는 순간**이 이 규칙이 필요한 순간이다.
 *   그 전에는 무시할 것이 없다. (setup 도 부른다 — 첫 scan 이 그 다음이다.)
 * ⚠ 이미 있으면 손대지 않는다. 사람이 줄을 더했을 수 있다.
 */
export function ensureLocalGitignore(root: string): void {
  const path = join(root, LOCAL_DIR, '.gitignore')
  if (readTextIfExists(path) !== undefined) return
  const lines = [
    '# contextops 가 만든 파일들 (SPEC §8.2). manifest.json·project.json 은 커밋한다.',
    ...IGNORED_LOCAL_PATHS,
    '',
  ]
  atomicWriteFile(path, lines.join('\n'))
}

/** `backups/` 를 최근 몇 개만 남긴다. 이름이 시각순이라 사전순 정렬이 곧 시각순이다. */
function pruneBackups(root: string): void {
  const dir = join(root, ...BACKUP_DIR.split('/'))
  let names: string[]
  try {
    names = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  } catch {
    return
  }
  for (const name of names.slice(0, Math.max(0, names.length - BACKUP_KEEP))) {
    rmSync(join(dir, name), { recursive: true, force: true })
  }
}

/** `20260903T221416Z` — 파일 이름에 쓸 수 있는 모양 (`:` 는 Windows 가 못 받는다). */
function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
}

export async function runSync(cli: Cli, flags: Flags): Promise<number> {
  const pre = preflight(cli, flags)
  if (!pre.ok) return pre.code
  const { root, config, token } = pre.ready
  const origin = config.api_origin
  const projectPath = `projects/${config.project_id}`

  // ── ② 서버의 최신 Manifest (ETag) ─────────────────────────────────
  const local = readLocalManifest(root)
  const outcome = await apiGet(cli, origin, `${projectPath}/packs/latest/manifest`, token,
    local === undefined ? undefined : { 'if-none-match': local.manifest_hash })

  let official: Manifest | undefined
  if (outcome.kind === 'unreachable') {
    //  오프라인. **아는 것만 말하고 아무것도 안 바꾼다.**
    cli.io.err(`서버에 닿지 못했다 — ${outcome.message}`)
    printStatus(cli, judge(root, local, undefined))
    return flags.bool('check') ? EXIT.OK : EXIT.NETWORK
  }
  if (outcome.kind === 'failed') return reportFailure(cli, outcome.code, outcome.message)
  if (outcome.kind === 'not_modified') {
    //  304 는 「네가 가진 것이 최신이다」는 뜻이다 — 그래서 로컬 Manifest 가 곧 공식이다.
    official = local
  } else {
    const parsed = Manifest.safeParse(outcome.data)
    if (!parsed.success) {
      cli.io.err('서버가 준 Manifest 가 계약과 맞지 않는다 — 서버 버전을 확인해라.')
      return EXIT.NETWORK
    }
    official = parsed.data
  }
  if (official === undefined) {
    //  304 인데 로컬 Manifest 가 없다 = 우리가 보낸 적 없는 ETag 에 서버가 304 를 줬다.
    cli.io.err('서버가 304 로 답했는데 비교할 로컬 Manifest 가 없다 — 캐시를 지우고 다시 시도해라.')
    return EXIT.NETWORK
  }

  // ── ③ 로컬 대조 ───────────────────────────────────────────────────
  const status = judge(root, local, official)
  if (flags.bool('check')) {
    printStatus(cli, status)
    cli.io.out('  (--check 였다 — 파일을 하나도 바꾸지 않았다)')
    //  ⚠ 캐시조차 쓰지 않는다. `--check` 가 「하나도 안 바꾼다」고 말했으면 그래야 한다 —
    //    한 파일이라도 예외를 두면 다음 사람이 두 번째 예외를 둔다.
    return status.status === 'modified' ? EXIT.MODIFIED : EXIT.OK
  }

  //  훅이 네트워크 없이 읽는 자리 (SPEC §8.6). 훅은 **읽기만** 한다 (P6).
  writeJsonFile(repoFile(root, 'latestCache'), official)

  if (status.status === 'modified' && !flags.bool('force')) {
    printStatus(cli, status)
    cli.io.err('손으로 바뀐 파일이 있다 — 확인하고 --force 로 다시 실행해라 (원본은 backups/ 에 남는다).')
    return EXIT.MODIFIED
  }
  if (status.status === 'applied' && local !== undefined) {
    printStatus(cli, status)
    return await report(cli, root, origin, token, config.project_id, official, 'applied')
  }

  // ── ④ 받아서 sha256 검증 — **디스크를 건드리기 전에 전부 확보한다** ──
  const semver = official.context_version
  const wanted: { path: string; text: string }[] = []
  for (const file of official.files) {
    const verdict = checkWritable(root, file.path)
    if (!verdict.ok) {
      //  🔴 서버가 준 경로라도 믿지 않는다 (SPEC §8.5 6단계).
      cli.io.err(`Pack 의 경로를 거부했다: ${file.path} — ${verdict.reason}`)
      return EXIT.NETWORK
    }
    const got = await apiGetText(cli, origin, `${projectPath}/packs/${semver}/files/${file.path}`, token)
    if (got.kind === 'unreachable') {
      cli.io.err(`${file.path} 를 받지 못했다 — ${got.message}`)
      return EXIT.NETWORK
    }
    if (got.kind === 'failed') return reportFailure(cli, got.code, got.message)

    const actual = sha256OfText(got.text)
    if (actual !== file.sha256) {
      //  🔴 즉시 중단 (SPEC §8.5 4단계). 아직 아무것도 안 바꿨다.
      cli.io.err(`받은 내용의 해시가 Manifest 와 다르다: ${file.path}`)
      cli.io.err(`  기대 ${file.sha256.slice(0, 12)} · 실제 ${actual.slice(0, 12)}`)
      return EXIT.NETWORK
    }
    wanted.push({ path: file.path, text: got.text })
    //  SPEC §8.5 4단계 — 받은 것을 cache 에 남긴다. 무엇을 적용했는지 나중에 볼 수 있다.
    atomicWriteFile(join(root, ...CACHE_DIR.split('/'), semver, ...file.path.split('/')), got.text)
  }

  // ── ⑤ backup ──────────────────────────────────────────────────────
  ensureLocalGitignore(root)
  const from = local?.context_version ?? 'none'
  const backupRel = `${BACKUP_DIR}/${stamp(new Date())}-${from}-to-${semver}`
  const backupDir = join(root, ...backupRel.split('/'))
  //  바꿀 파일 + 우리 manifest.json 까지. 되돌릴 때 **버전 표시도 같이** 되돌아야 한다.
  const backedUp: { path: string; text: string }[] = []
  for (const rel of [...wanted.map((w) => w.path), LOCAL_FILES.manifest]) {
    const before = readTextIfExists(join(root, ...rel.split('/')))
    if (before === undefined) continue
    atomicWriteFile(join(backupDir, ...rel.split('/')), before)
    backedUp.push({ path: rel, text: before })
  }

  // ── ⑥ atomic 교체 ─────────────────────────────────────────────────
  for (const file of wanted) atomicWriteFile(join(root, ...file.path.split('/')), file.text)
  atomicWriteFile(repoFile(root, 'manifest'), `${JSON.stringify(official, null, 2)}\n`)

  // ── ⑦ post-verify → 실패하면 **전부** 되돌린다 ────────────────────
  const after = judge(root, official, official)
  if (after.status !== 'applied') {
    cli.io.err('적용 뒤 다시 잰 해시가 맞지 않는다 — backup 에서 전부 되돌린다.')
    for (const b of backedUp) atomicWriteFile(join(root, ...b.path.split('/')), b.text)
    //  원래 없던 파일은 지운다 — 되돌린다는 것은 「전과 같아진다」는 뜻이다.
    const had = new Set(backedUp.map((b) => b.path))
    for (const w of wanted) if (!had.has(w.path)) rmSync(join(root, ...w.path.split('/')), { force: true })
    if (!had.has(LOCAL_FILES.manifest)) rmSync(repoFile(root, 'manifest'), { force: true })
    cli.io.err(`되돌렸다. 받은 내용은 ${backupRel}/ 옆의 ${CACHE_DIR}/${semver}/ 에 있다.`)
    return EXIT.NETWORK
  }
  pruneBackups(root)

  cli.io.out(`v${from} → v${semver} · 파일 ${wanted.length}개를 적용했다`)
  for (const file of wanted) cli.io.out(`  ✓ ${file.path}`)
  cli.io.out(`  원본은 ${backupRel}/ 에 남겼다`)

  // ── ⑧ 보고 ────────────────────────────────────────────────────────
  return await report(cli, root, origin, token, config.project_id, official, 'applied')
}

/**
 * sync 보고 (SPEC §8.5 8단계). **실패해도 sync 는 성공이다** — 파일은 이미 맞다.
 * 못 보낸 것은 receipt 로 남기고 다음 `status` 가 다시 보낸다.
 */
export async function report(
  cli: Cli, root: string, origin: string, token: string, projectId: string,
  manifest: Manifest, status: SyncReport['status'],
): Promise<number> {
  const body: SyncReport = {
    version: manifest.context_version,
    manifest_hash: manifest.manifest_hash,
    status,
    //  ⚠ 경로와 해시뿐이다 — 본문은 자리가 없다 (P1). 상한은 계약이 정한다.
    files: manifest.files.slice(0, 50).map((f) => ({ path: f.path, sha256: f.sha256 })),
  }
  const sent = await apiPost(cli, origin, `projects/${projectId}/sync-reports`, token, body)
  if (sent.kind === 'ok') {
    rmSync(repoFile(root, 'syncReceipt'), { force: true })
    cli.io.out(`  서버에 ${status} 로 보고했다`)
    return EXIT.OK
  }
  writeJsonFile(repoFile(root, 'syncReceipt'),
    SyncReceiptFile.parse({ project_id: projectId, api_origin: origin, report: body }))
  //  ⚠ POST 는 304 로 오지 않지만 갈래는 계약에 있다 — 뭉개면 타입이 눈을 가린다.
  cli.io.err(`보고를 보내지 못했다 — ${sent.kind === 'not_modified' ? '서버가 304 로 답했다' : sent.message}`)
  cli.io.err(`  ${LOCAL_FILES.syncReceipt} 에 남겼다. 다음 contextops status 가 다시 보낸다.`)
  return EXIT.OK
}
