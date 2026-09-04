import { execFile } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ContextItemsBatchDraft, ProgressEvent, Proposal, ScanResult,
} from '@contextops/schema'

import { openStage } from '../../../tools/walkthrough-stage'

// =====================================================================
//  관통 한 단계 — 🔴 **업로드 payload 에 코드 본문이 0건인가** (P1 · 심사 첫 질문)
//    tools/walkthrough.ps1 의 `payload` 단계가 이 파일을 부른다.
//
//  ★ 왜 단위 시험으로 끝내지 않나 — 시험은 `src/` 를 부르고 `fetch` 를 가짜로 준다.
//    「무엇이 실제로 소켓을 타고 나갔나」는 **바이트를 받아 봐야** 안다. 여기서는
//    **배포되는 번들**(`bin/contextops-cli.mjs`)을 진짜 저장소 픽스처에서 돌리고,
//    나간 요청의 body 를 전부 받아 둔 뒤 그 바이트를 판다.
//
//  ★ 무엇을 재나 — 넷이고, 넷 다 「본 것」이다:
//    ① 나간 body 가 전부 업로드 allowlist 계약을 지난다 (SPEC §3.1)
//    ② 픽스처 파일의 **가장 긴 줄**이 어느 body 에도 없다 (본문 유출)
//    ③ `.env.example` 의 **값**이 어느 body 에도 없다 (secret 유출)
//    ④ 기기 토큰이 body 에 없다 — 토큰은 헤더로만 간다
//    ⚠ 고정 금지 문자열을 쓰지 않는다. 픽스처가 바뀌면 조용히 아무것도 안 재게 된다.
//
//  ⚠ 서버는 여기서 띄우는 짧은 것이다. 라우트가 SPEC §5 형식으로 답하는지는 `api`·
//    `publish` 단계가 이미 잰다 — 이 단계가 재는 것은 **나가는 바이트**다.
// =====================================================================

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(webRoot, '..', '..')
const fixture = join(repoRoot, 'fixtures', 'paylab-api')
const cliPath = join(repoRoot, 'plugin', 'contextops', 'bin', 'contextops-cli.mjs')

const TOKEN = 'ctx_walkthroughpayloadtoken0123456789'
const PROJECT = '11111111-2222-4333-8444-555555555555'
const VERSION = '22222222-3333-4444-8555-666666666666'
const REQUEST_ID = '00000000-0000-4000-8000-000000000000'

//  잰 것을 쌓고 산출물을 쓰는 문은 하나다 — `tools/walkthrough-stage.ts` (FINDINGS 96).
const stage = openStage('payload')
const { check } = stage

// ── 나간 요청을 전부 모으는 서버 ────────────────────────────────────
type Sent = { path: string; body: string }
const sent: Sent[] = []

function envelope(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ data, meta: { request_id: REQUEST_ID } }))
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname

  //  제안이 기준 삼을 공식 버전 (GET). body 가 없으므로 모으지 않는다.
  if (path.endsWith('/versions')) {
    envelope(res, 200, { versions: [], official_version_id: VERSION, limit: 1, offset: 0 })
    return
  }

  let raw = ''
  req.on('data', (chunk) => { raw += String(chunk) })
  req.on('end', () => {
    sent.push({ path, body: raw })
    if (path.endsWith('/context-items/batch-draft')) {
      const items = (JSON.parse(raw) as { items: { id: string }[] }).items
      envelope(res, 200, { accepted: items.map((item, index) => ({ index, id: item.id })), rejected: [] })
      return
    }
    if (path.endsWith('/proposals')) { envelope(res, 201, { id: 'p1' }); return }
    envelope(res, 202, { id: 'e1' })
  })
}

// ── 임시 저장소: 픽스처를 그대로 복사해 **진짜 코드가 있는 레포**로 만든다 ──
const repo = mkdtempSync(join(tmpdir(), 'contextops-payload-repo-'))
const home = mkdtempSync(join(tmpdir(), 'contextops-payload-home-'))

function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    execFile(process.execPath, [cliPath, ...args], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, USERPROFILE: home },
      timeout: 60_000,
    }, (error, stdout, stderr) => {
      //  ⚠ 못 띄운 경우(spawn 실패·timeout)는 `code` 가 숫자가 아니다 —
      //    그때는 `error.message` 가 유일한 단서다 (docs/STATUS.md 「밟은 함정」).
      const code = typeof (error as { code?: unknown } | null)?.code === 'number'
        ? (error as unknown as { code: number }).code
        : (error === null ? 0 : -1)
      resolve({ code, out: stdout, err: stderr + (error === null ? '' : `\n${error.message}`) })
    })
  })
}

async function main(server: Server, origin: string): Promise<void> {
  cpSync(fixture, repo, { recursive: true })
  mkdirSync(join(repo, '.contextops'), { recursive: true })
  writeFileSync(
    join(repo, '.contextops', 'project.json'),
    `${JSON.stringify({ api_origin: origin, project_id: PROJECT, repo_name: 'paylab-api' }, null, 2)}\n`,
    'utf8',
  )
  mkdirSync(join(home, '.contextops'), { recursive: true })
  writeFileSync(
    join(home, '.contextops', 'credentials.json'),
    `${JSON.stringify({ [origin]: { [PROJECT]: { token: TOKEN } } }, null, 2)}\n`,
    'utf8',
  )

  // ── ① scan — 결정론 스캔이 초안의 재료를 만든다 ─────────────────
  const scanned = await run(['scan'])
  check('scan 이 지난다', scanned.code === 0, scanned.err.trim().slice(0, 120))
  const scan = ScanResult.parse(JSON.parse(readFileSync(join(repo, '.contextops', 'cache', 'scan.json'), 'utf8')))

  // ── ② 초안 — init Skill 이 쓰는 자리에, Skill 이 시키는 대로 ────
  //     ⚠ 여기서 코드를 **본문에 붙여 넣지 않는다.** 그게 Skill 의 규칙이고,
  //       이 단계가 재는 것은 「규칙대로 썼을 때 파이프라인이 본문을 안 나른다」다.
  const evidencePath = scan.summary.entrypoints[0] ?? scan.files[0]?.path ?? 'package.json'
  writeFileSync(join(repo, '.contextops', 'cache', 'draft.json'), `${JSON.stringify({
    items: [{
      id: 'item_payments_module',
      type: 'architecture',
      title: '결제 모듈이 원장과 분리돼 있다',
      body: '결제 요청과 원장 기록이 서로 다른 모듈이다.',
      scope: { kind: 'project' },
      source_refs: [{ kind: 'repository_path', repo: scan.repo, path: evidencePath, start_line: 1 }],
      data: { component: 'payments', responsibility: '결제 요청을 받아 원장에 남긴다', paths: [evidencePath] },
    }],
  }, null, 2)}\n`, 'utf8')

  const uploaded = await run(['upload-draft'])
  check('upload-draft 가 지난다', uploaded.code === 0, uploaded.err.trim().slice(0, 120))

  // ── ③ 진행 보고 ────────────────────────────────────────────────
  const progressed = await run([
    'progress', '--milestone', 'M1', '--criterion', '결제 모듈이 분리된다',
    '--evidence', `${evidencePath}:1-40`, '--summary', '결제 모듈을 분리했다',
  ])
  check('progress 가 지난다', progressed.code === 0, progressed.err.trim().slice(0, 120))

  // ── ④ 제안 ─────────────────────────────────────────────────────
  writeFileSync(join(repo, '.contextops', 'cache', 'proposal.json'), `${JSON.stringify({
    title: '결제 모듈 분리를 규칙으로 올린다',
    summary: '코드가 이미 그렇게 돼 있다.',
    items: [{
      operation: 'update',
      target_item_id: 'item_payments_module',
      evidence: [{ kind: 'repository_path', repo: scan.repo, path: evidencePath, start_line: 1 }],
      reason: '코드에서 확인했다',
    }],
    relates_to: ['M1'],
  }, null, 2)}\n`, 'utf8')

  const proposed = await run(['propose'])
  check('propose 가 지난다', proposed.code === 0, proposed.err.trim().slice(0, 120))

  // ── ⑤ 🔴 계약에 없는 키는 **소켓을 타지 못한다** (P1 allowlist) ──
  const before = sent.length
  writeFileSync(join(repo, '.contextops', 'cache', 'smuggle.json'), `${JSON.stringify({
    items: [{
      id: 'item_smuggled',
      type: 'architecture',
      title: '몰래 코드를 실어 보낸다',
      body: '계약에 없는 칸으로.',
      scope: { kind: 'project' },
      source_refs: [{ kind: 'repository_path', repo: scan.repo, path: evidencePath, start_line: 1 }],
      data: { component: 'x', responsibility: '무엇이든', paths: [] },
      file_body: readFileSync(join(repo, ...evidencePath.split('/')), 'utf8'),
    }],
  }, null, 2)}\n`, 'utf8')
  const smuggled = await run(['upload-draft', '.contextops/cache/smuggle.json'])
  check('계약에 없는 키는 거절되고 요청이 아예 안 나간다 (P1)',
    smuggled.code === 2 && sent.length === before, `exit ${smuggled.code} · 새 요청 ${sent.length - before}건`)

  server.close()

  // ── ⑥ 나간 바이트를 판다 ────────────────────────────────────────
  const bodies = sent.map((s) => s.body)
  const all = bodies.join('\n')

  //  ① 전부 업로드 계약을 지난다.
  const CONTRACTS: Record<string, { parse(v: unknown): unknown }> = {
    '/context-items/batch-draft': ContextItemsBatchDraft,
    '/progress': ProgressEvent,
    '/proposals': Proposal,
  }
  const offContract: string[] = []
  for (const one of sent) {
    const key = Object.keys(CONTRACTS).find((k) => one.path.endsWith(k))
    if (key === undefined) { offContract.push(`계약이 없는 경로: ${one.path}`); continue }
    try {
      CONTRACTS[key]!.parse(JSON.parse(one.body))
    } catch (err) {
      offContract.push(`${one.path}: ${err instanceof Error ? err.message.slice(0, 80) : '파싱 실패'}`)
    }
  }
  check(`나간 요청 ${sent.length}건이 전부 업로드 계약을 지난다 (SPEC §3.1)`,
    offContract.length === 0, offContract.join(' · '))

  //  ② 픽스처 파일의 본문이 한 줄도 없다.
  const leaked: string[] = []
  for (const file of scan.files) {
    const body = readFileSync(join(repo, ...file.path.split('/')), 'utf8')
    const longest = body.split('\n').map((l) => l.trim()).sort((a, b) => b.length - a.length)[0] ?? ''
    //  짧은 줄(`}` 같은 것)은 우연히 겹치므로 재지 않는다.
    if (longest.length >= 30 && all.includes(longest)) leaked.push(`${file.path}: ${longest.slice(0, 40)}…`)
  }
  check(`픽스처 ${scan.files.length}개 파일의 본문이 payload 에 0건 (P1)`, leaked.length === 0, leaked.join(' · '))

  //  ③ `.env*` 의 값이 없다. (스캐너가 키 이름만 꺼내는지는 `scan` 단계가 잰다)
  let envLeaked: string[] = []
  try {
    envLeaked = readFileSync(join(repo, '.env.example'), 'utf8')
      .split('\n')
      .map((line) => line.split('=').slice(1).join('=').trim())
      .filter((value) => value.length >= 8 && all.includes(value))
  } catch {
    /* 픽스처에 .env.example 이 없으면 잴 것이 없다 */
  }
  check('env 값이 payload 에 0건 (P1)', envLeaked.length === 0, envLeaked.join(' · '))

  //  ④ 토큰은 헤더로만 간다 — body 에 실리면 로그·프록시에 남는다.
  check('기기 토큰이 body 에 0건', !all.includes(TOKEN))

  //  ⑤ env **키 이름**은 나가도 된다 (SPEC §3.1) — 그게 실제로 나갔는지도 본다.
  //     안 나가면 scan_summary 가 빈 채로 올라간다는 뜻이라 그것도 고장이다.
  const draftBody = sent.find((s) => s.path.endsWith('/context-items/batch-draft'))?.body ?? ''
  const someKey = scan.summary.env_keys[0]
  check('scan_summary 가 실제로 실려 나갔다 (키 이름만)',
    someKey !== undefined && draftBody.includes(someKey), `env 키 ${scan.summary.env_keys.length}개`)
}

const server = createServer(handle)
server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as { port: number }).port
  main(server, `http://127.0.0.1:${port}`)
    .catch((err: unknown) => {
      check('관통이 끝까지 갔다', false, err instanceof Error ? err.message : String(err))
    })
    .finally(() => {
      server.close()
      rmSync(repo, { recursive: true, force: true })
      rmSync(home, { recursive: true, force: true })

      process.exit(stage.finish())
    })
})
