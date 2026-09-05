import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Manifest, ProgressEvent, ReplayFrames, SyncReport, type ReplayFrame } from '@contextops/schema'

import { openStage } from '../../../tools/walkthrough-stage'

// =====================================================================
//  관통 한 단계 — **배포되는 번들**이 발행된 Pack 을 받아 적용하고
//  `applied` 로 보고한다 (docs/SPEC.md §8.5)
//
//  ★ 왜 단위 시험으로 끝내지 않나 — 시험은 `src/` 를 부르고 `fetch` 를 가짜로 준다.
//    사용자가 돌리는 것은 `bin/contextops-cli.mjs` 이고, 그것이 진짜 소켓으로 말한다.
//    번들에 빠진 모듈·잘못된 헤더·HTTP 규약 차이는 **여기서만** 잡힌다.
//
//  ★ Manifest 와 본문은 **앞 단계(publish)가 진짜 서버에서 받아 남긴 것**이다
//    (`.ci/walkthrough-pack/`). 여기서 지어내면 「서버가 준 것을 플러그인이
//    받아들이나」가 아니라 우리가 만든 것을 우리가 읽는 시험이 된다.
//
//  ⚠ 서버는 여기서 띄우는 30줄짜리다. 라우트가 SPEC §5 형식으로 답하는지는 `api`
//    단계가 이미 잰다 — 이 단계가 재는 것은 **플러그인 쪽 절차**다.
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageRoot, '..', '..')
const packDir = join(repoRoot, '.ci', 'walkthrough-pack')
const cliPath = join(packageRoot, 'bin', 'contextops-cli.mjs')

const TOKEN = 'ctx_walkthroughtoken0123456789'
const REQUEST_ID = '00000000-0000-4000-8000-000000000000'

//  잰 것을 쌓고 산출물을 쓰는 문은 하나다 — `tools/walkthrough-stage.ts` (FINDINGS 96).
const stage = openStage('sync')
const { check } = stage

// ── 앞 단계가 남긴 Pack ──────────────────────────────────────────────
const manifest = Manifest.parse(JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8')))
const bodies = new Map<string, string>()
for (const file of manifest.files) {
  bodies.set(file.path, readFileSync(join(packDir, ...file.path.split('/')), 'utf8'))
}

// ── 서버 30줄 ────────────────────────────────────────────────────────
type Received = { reports: SyncReport[]; etags: (string | undefined)[]; progress: ProgressEvent[] }
const received: Received = { reports: [], etags: [], progress: [] }

/** 한 파일의 첫 바이트를 바꿔서 「서버가 깨진 것을 줬다」를 만든다. */
let corrupt = false

function envelope(res: ServerResponse, status: number, data: unknown, etag?: string): void {
  if (etag !== undefined) res.setHeader('etag', etag)
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ data, meta: { request_id: REQUEST_ID } }))
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const path = url.pathname

  if (path.endsWith('/packs/latest/manifest')) {
    received.etags.push(req.headers['if-none-match'] as string | undefined)
    if (req.headers['if-none-match'] === manifest.manifest_hash) {
      res.writeHead(304).end()
      return
    }
    envelope(res, 200, manifest, manifest.manifest_hash)
    return
  }

  const fileMatch = /\/packs\/[^/]+\/files\/(.+)$/.exec(path)
  if (fileMatch !== null) {
    const wanted = decodeURIComponent(fileMatch[1]!)
    const text = bodies.get(wanted)
    if (text === undefined) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: '없다', request_id: REQUEST_ID } }))
      return
    }
    //  Pack 파일은 **봉투가 아니다** (SPEC §5 text/plain).
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(corrupt ? `${text}서버가 한 줄을 더 붙였다\n` : text)
    return
  }

  if (path.endsWith('/sync-reports') && req.method === 'POST') {
    let raw = ''
    req.on('data', (chunk) => { raw += String(chunk) })
    req.on('end', () => {
      //  🔴 P1 — 여기 들어온 것에 코드 본문이 있으면 아래 검사가 잡는다.
      received.reports.push(SyncReport.parse(JSON.parse(raw)))
      envelope(res, 201, { ok: true })
    })
    return
  }

  if (path.endsWith('/progress') && req.method === 'POST') {
    let raw = ''
    req.on('data', (chunk) => { raw += String(chunk) })
    req.on('end', () => {
      //  🔴 P1 — 근거는 경로·줄뿐이다. 계약(`ProgressEvent` · strict)이 그 밖의 칸을 400 으로 막는다.
      received.progress.push(ProgressEvent.parse(JSON.parse(raw)))
      envelope(res, 201, { ok: true })
    })
    return
  }

  res.writeHead(404, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: '없다', request_id: REQUEST_ID } }))
}

// ── 임시 저장소·홈 ───────────────────────────────────────────────────
const temps: string[] = []
function tempPath(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix))
  temps.push(path)
  return path
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

/** `setup` 이 남기는 두 파일. `setup` 자체는 `scan` 단계 앞에서 이미 잰다. */
function connectedRepo(origin: string, home: string): string {
  const repo = tempPath('contextops-wt-repo-')
  writeJson(join(repo, '.contextops', 'project.json'), {
    api_origin: origin,
    project_id: manifest.project_id,
  })
  writeJson(join(home, '.contextops', 'credentials.json'), {
    [origin]: { [manifest.project_id]: { token: TOKEN } },
  })
  return repo
}

/** 저장소 안 모든 파일 → `경로 → 바이트`. 「하나도 안 바뀌었다」를 재는 자다. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (at: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      out[relative(root, full).split(sep).join('/')] = readFileSync(full, 'utf8')
    }
  }
  walk(root)
  return out
}

type Run = { code: number; stdout: string; stderr: string }

/**
 * 자식 프로세스를 띄운다.
 *
 * 🔴 **`execFileSync` 를 쓰지 마라.** 서버가 이 프로세스 안에서 돌기 때문에, 동기
 *    호출은 이벤트 루프를 잡고 서버는 영원히 응답하지 못한다 — CLI 는 timeout 까지
 *    기다렸다가 죽고, 증상은 「이유 없이 exit -1」이다. 여기서 60초를 잃었다.
 */
function run(exe: string, args: string[], options: { cwd?: string; home: string }): Promise<Run> {
  return new Promise((resolve) => {
    execFile(exe, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      //  ⚠ `homedir()` 는 POSIX 에서 HOME · Windows 에서 USERPROFILE 을 본다. 둘 다 준다.
      env: { ...process.env, HOME: options.home, USERPROFILE: options.home },
      timeout: 60_000,
    }, (err, stdout, stderr) => {
      const e = err as (Error & { code?: number | string }) | null
      const code = e === null ? 0 : (typeof e.code === 'number' ? e.code : -1)
      resolve({
        code,
        stdout,
        //  못 띄운 것(code 가 숫자가 아닌 것)은 message 가 유일한 단서다.
        stderr: stderr === '' && e !== null ? e.message : stderr,
      })
    })
  })
}

const runCli = (home: string, args: string[]): Promise<Run> => run(process.execPath, [cliPath, ...args], { home })

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('포트를 못 받았다')
  return address.port
}

async function main(): Promise<void> {
  const server = createServer(handle)
  const port = await listen(server)
  const origin = `http://127.0.0.1:${port}`

  try {
    // ── ① 처음 받는다 ─────────────────────────────────────────────
    const home = tempPath('contextops-wt-home-')
    const repo = connectedRepo(origin, home)
    const first = await runCli(home, ['sync', '--dir', repo])
    check('sync 이 0 으로 끝난다', first.code === 0,
      first.code === 0 ? '' : `exit ${first.code} · ${(first.stderr + first.stdout).trim().slice(0, 300)}`)

    let applied = 0
    for (const file of manifest.files) {
      const target = join(repo, ...file.path.split('/'))
      let text = ''
      try { text = readFileSync(target, 'utf8') } catch { /* 없으면 아래에서 걸린다 */ }
      if (text === bodies.get(file.path)) applied++
    }
    check('Pack 파일이 바이트 그대로 놓였다', applied === manifest.files.length,
      `${applied}/${manifest.files.length}`)

    const localManifest = readFileSync(join(repo, '.contextops', 'manifest.json'), 'utf8')
    check('적용한 Manifest 를 남겼다', Manifest.parse(JSON.parse(localManifest)).manifest_hash === manifest.manifest_hash)

    check('applied 로 보고했다', received.reports.at(-1)?.status === 'applied',
      received.reports.at(-1)?.version ?? '보고 없음')

    //  🔴 P1 — 보고에 코드 본문이 실렸는가. Pack 본문에서 **가장 긴 줄**을 뽑아 본다.
    const reportJson = JSON.stringify(received.reports)
    const leaked = manifest.files.flatMap((file) => {
      const longest = (bodies.get(file.path) ?? '').split('\n')
        .map((l) => l.trim()).sort((a, b) => b.length - a.length)[0] ?? ''
      return longest.length >= 30 && reportJson.includes(longest) ? [file.path] : []
    })
    check('🔴 P1 — 보고 payload 에 문서 본문이 0건이다', leaked.length === 0, leaked.join(' · '))

    //  backup 은 첫 적용에서는 되돌릴 원본이 없어 안 생긴다 — 그게 맞는 동작이다.
    check('첫 적용이라 backups/ 가 없다', !readdirSync(join(repo, '.contextops')).includes('backups'))
    const ignore = readFileSync(join(repo, '.contextops', '.gitignore'), 'utf8')
    check('.contextops/.gitignore 를 만들었다 (FINDINGS 37)', ignore.includes('cache/') && ignore.includes('backups/'))

    // ── ② 다시 돌리면 304 로 아무것도 받지 않는다 ─────────────────
    const before = snapshot(repo)
    const again = await runCli(home, ['sync', '--dir', repo])
    check('두 번째 sync 도 0 이다', again.code === 0, again.stderr.trim().slice(0, 160))
    check('ETag 를 실제로 보냈다 — 안 보내면 서버는 304 를 줄 수 없다',
      received.etags.at(-1) === manifest.manifest_hash)
    const afterFiles = snapshot(repo)
    //  ⚠ cache/latest-manifest.json 은 매번 다시 쓴다 (훅이 읽는 자리다) — 그건 제외한다.
    const changed = Object.keys(afterFiles)
      .filter((k) => k !== '.contextops/cache/latest-manifest.json')
      .filter((k) => afterFiles[k] !== before[k])
    check('최신이면 파일을 하나도 안 바꾼다', changed.length === 0, changed.join(' · '))

    // ── ③ status 가 applied 라고 말한다 ───────────────────────────
    const status = await runCli(home, ['status', '--dir', repo])
    check('status 가 0 이고 applied 라고 말한다',
      status.code === 0 && status.stdout.includes('applied'), status.stdout.trim().slice(0, 120))

    // ── ④ 🔴 서버가 깨진 바이트를 주면 **멈춘다** ─────────────────
    corrupt = true
    const home2 = tempPath('contextops-wt-home-')
    const repo2 = connectedRepo(origin, home2)
    const broken = await runCli(home2, ['sync', '--dir', repo2])
    check('hash 불일치에서 0 이 아니다', broken.code !== 0, `exit ${broken.code}`)
    check('중단 이유를 해시로 말한다', broken.stderr.includes('해시가 Manifest 와 다르다'),
      broken.stderr.trim().slice(0, 120))
    const touched = manifest.files.filter((f) => {
      try { statSync(join(repo2, ...f.path.split('/'))); return true } catch { return false }
    })
    //  ★ 「디스크를 건드리기 전에 전부 확보한다」의 증거다.
    check('🔴 중단했을 때 Pack 파일을 하나도 안 썼다', touched.length === 0, touched.map((f) => f.path).join(' · '))
    corrupt = false

    // ── ⑤ SessionStart 훅이 알리고, 아무것도 안 바꾼다 (P6) ───────
    const hookHome = tempPath('contextops-wt-home-')
    const hookRepo = connectedRepo(origin, hookHome)
    //  낡은 버전을 적용한 것처럼 만든다 — 그러면 훅이 알릴 것이 생긴다.
    //  ⚠ cache 를 두지 않는다. 그래야 훅의 **네트워크 갈래**가 실제로 돈다.
    writeJson(join(hookRepo, '.contextops', 'manifest.json'),
      { ...manifest, context_version: '0.9.0', manifest_hash: `${'0'.repeat(63)}1` })
    const hookBefore = snapshot(hookRepo)
    const hook = await run(process.execPath, [join(packageRoot, 'scripts', 'session-start.mjs')], {
      cwd: hookRepo, home: hookHome,
    })
    check('훅이 새 버전을 알린다',
      hook.stdout.includes(manifest.context_version) && hook.stdout.includes('/contextops:sync'),
      hook.stdout.trim().split('\n')[0] ?? '무출력')
    check('🔴 P6 — 훅이 저장소를 하나도 바꾸지 않았다',
      JSON.stringify(snapshot(hookRepo)) === JSON.stringify(hookBefore))

    // ── ⑥ 🔴 녹화 — 랜딩의 「터미널 재생」은 이 stdout 이다 (SPEC §10.4) ──
    //  ★ 왜 관통이 녹화하나 — 손으로 쓴 대사는 CLI 가 문장을 바꾼 날부터 거짓말이 된다.
    //    여기서 **배포되는 번들**을 진짜 소켓으로 돌려 남긴 줄을 `fixtures/replay/sync.json`
    //    과 매번 대조한다 — 다르면 관통이 빨개지고, 그때 새 녹화로 바꾼다 (t_ms 는 안 잰다).
    //  ⚠ 이야기는 「훅 알림 → /contextops:sync → 작업 → 진행 보고」다 (DESIGN_BRIEF 화면 1 C-3).
    //    「작업」은 녹화에 없다 — 사이의 시간은 화면이 설명한다. 지어낸 줄을 넣지 마라.
    const recHome = tempPath('contextops-wt-home-')
    const recRepo = connectedRepo(origin, recHome)
    //  먼저 한 번 받아 둔다 — 그래야 다음 sync 가 「v0.9.0 → v1.0.0」이고 backup 이 실제로 생긴다.
    const primed = await runCli(recHome, ['sync', '--dir', recRepo])
    check('녹화 준비 — 먼저 한 번 받았다', primed.code === 0, primed.stderr.trim().slice(0, 160))
    //  낡은 판을 적용한 것처럼 꾸민다 (⑤ 와 같은 수). 파일 해시는 그대로라 modified 가 아니라 outdated 다.
    writeJson(join(recRepo, '.contextops', 'manifest.json'),
      { ...manifest, context_version: '0.9.0', manifest_hash: `${'0'.repeat(63)}1` })
    rmSync(join(recRepo, '.contextops', 'cache'), { recursive: true, force: true })   // 훅이 네트워크를 타게

    const frames: ReplayFrame[] = []
    const t0 = Date.now()
    const record = (text: string): void => { frames.push({ t_ms: Date.now() - t0, text }) }
    const recordOut = (stdout: string): void => {
      for (const line of stdout.replace(/\r/g, '').trimEnd().split('\n')) record(line)
    }
    /** 사람이 친 모양 그대로 — 빈칸이 든 인자만 따옴표로 싼다 (Pack 의 고정 문단과 같은 꼴). */
    const shellLine = (args: readonly string[]): string =>
      args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')

    const recHook = await run(process.execPath, [join(packageRoot, 'scripts', 'session-start.mjs')], {
      cwd: recRepo, home: recHome,
    })
    recordOut(recHook.stdout)
    record('> /contextops:sync')
    const recSync = await runCli(recHome, ['sync', '--dir', recRepo])
    recordOut(recSync.stdout)

    //  🔴 P7 — 보고하는 완료 기준은 지금 받은 Pack 의 CLAUDE.md 에 **글자 그대로** 있는 문장이다.
    //     근거 경로는 픽스처 저장소(`fixtures/paylab-api`)에 실제로 있는 파일이다.
    const criterion = 'PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다'
    const evidencePath = 'src/psp/psp.client.ts'
    check('🔴 P7 — 녹화의 완료 기준 문장이 Pack 의 CLAUDE.md 에 글자 그대로 있다',
      (bodies.get('CLAUDE.md') ?? '').includes(criterion))
    check('녹화의 근거 경로가 픽스처 저장소에 실제로 있다', (() => {
      try { statSync(join(repoRoot, 'fixtures', 'paylab-api', ...evidencePath.split('/'))); return true } catch { return false }
    })())
    const progressArgs = [
      'progress', '--milestone', 'PL-M1', '--criterion', criterion,
      '--evidence', `${evidencePath}:18-46`, '--summary', '재시도 로직을 psp.client 한 곳으로 모았다',
    ]
    record(`$ node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" ${shellLine(progressArgs)}`)
    const recProgress = await runCli(recHome, [...progressArgs, '--dir', recRepo])
    recordOut(recProgress.stdout)

    check('녹화 — 훅 · sync · progress 가 전부 0 으로 끝났다',
      recHook.code === 0 && recSync.code === 0 && recProgress.code === 0,
      `${recHook.code} · ${recSync.code} · ${recProgress.code} ${(recSync.stderr + recProgress.stderr).trim().slice(0, 160)}`)
    check('녹화 — 훅이 새 버전을 알렸고 sync 가 v0.9.0 → v1.0.0 을 적용했다',
      frames.some((f) => f.text.startsWith('ContextOps: 적용 v0.9.0'))
        && frames.some((f) => f.text.startsWith(`v0.9.0 → v${manifest.context_version} · 파일 ${manifest.files.length}개`)))
    const lastProgress = received.progress.at(-1)
    check('녹화 — progress 가 서버에 닿았다 (PL-M1 · criterion_done · 근거 1건)',
      lastProgress?.milestone_id === 'PL-M1' && lastProgress.status === 'criterion_done'
        && lastProgress.criterion === criterion && lastProgress.evidence.length === 1,
      lastProgress === undefined ? '보고 없음' : `${lastProgress.milestone_id} · ${lastProgress.status}`)

    const parsedFrames = ReplayFrames.safeParse(frames)
    check('녹화가 ReplayFrames 계약을 지난다', parsedFrames.success, `${frames.length}줄`)
    const replayOut = join(repoRoot, '.ci', 'walkthrough-replay.json')
    writeFileSync(replayOut, `${JSON.stringify(frames, null, 2)}\n`, 'utf8')

    //  픽스처와 대조 — backup 폴더 이름의 시각만 가린다 (그건 녹화마다 다르고, 다른 게 맞다).
    const fixturePath = join(repoRoot, 'fixtures', 'replay', 'sync.json')
    const mask = (text: string): string => text.replace(/\d{8}T\d{6}Z/g, '<stamp>')
    const hint = '.ci/walkthrough-replay.json 을 fixtures/replay/sync.json 으로 복사해라'
    let same = false
    let detail = ''
    try {
      const fixture = ReplayFrames.parse(JSON.parse(readFileSync(fixturePath, 'utf8')))
      const a = fixture.map((f) => mask(f.text))
      const b = frames.map((f) => mask(f.text))
      const at = a.findIndex((line, i) => line !== b[i])
      same = a.length === b.length && at === -1
      detail = same ? `${frames.length}줄` : `줄 ${at === -1 ? Math.min(a.length, b.length) + 1 : at + 1} 이 다르다 — ${hint}`
    } catch {
      detail = `fixtures/replay/sync.json 이 없거나 계약과 다르다 — ${hint}`
    }
    check('🔴 fixtures/replay/sync.json 이 지금 CLI 의 출력과 같다 (t_ms 제외 · SPEC §10.4)', same, detail)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    for (const path of temps) rmSync(path, { recursive: true, force: true })
  }

  const code = stage.finish({
    pack: { version: manifest.context_version, files: manifest.files.length, manifest_hash: manifest.manifest_hash },
  })
  if (code !== 0) process.exit(code)
}

await main()
