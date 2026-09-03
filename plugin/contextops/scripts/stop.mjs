#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

// =====================================================================
//  Stop 훅 (docs/SPEC.md §8.6)
//
//  🔴 **P6 — 이 파일이 쓸 수 있는 자리는 `hooks/hooks.json` 의 `_writes` 에 선언한
//     하나뿐이다**: `.contextops/pending-proposal.json`. 그 경로는 우리가 만든
//     `.contextops/.gitignore` 안이라 **git 이 그 변화를 보지 못한다** — 사용자가
//     커밋하거나 리뷰하는 파일은 한 바이트도 바뀌지 않는다.
//     ★ 왜 이 예외가 필요한가 — 훅이 아는 것은 「무엇이 바뀌었나」뿐이고 그건
//       **세션이 끝나는 지금**만 알 수 있다. 다음 세션에 전하려면 어딘가 남겨야 한다.
//       서버에 두는 길도 있었지만, 힌트 하나 때문에 세션 종료가 네트워크를 기다리게
//       된다 (선택의 대가는 docs/feedback/FINDINGS.md 42 에 적었다).
//     ⚠ `tools/principles.ps1` 과 `test/hooks.test.ts` 가 **둘 다** 이 경계를 잰다.
//       새 경로에 쓰고 싶으면 코드가 아니라 `_writes` 표부터 고쳐라.
//
//  🔴 **LLM 호출이 없다.** 훅은 무엇이 바뀌었는지만 알고 **왜 바뀌었는지는 모른다.**
//     그래서 제안 본문을 짓지 않고 경로 목록과 한 줄 힌트만 남긴다 (P7).
//
//  🔴 **조용한 것이 기본이다.** 연결 안 됨·오프라인·예외·해당 없음 전부 무출력이다.
//
//  ⚠ 번들이 아니다 — Claude Code 가 `node <경로>` 로 그대로 부른다. **의존이 하나도
//    없어야 한다** (`@contextops/schema` 도 못 쓴다). 그래서 계약을 파싱하지 않고
//    필요한 칸만 조심스럽게 읽는다.
// =====================================================================

/** hooks.json 의 timeout(5초)보다 짧아야 한다. 세션 종료를 막는 훅이 제일 나쁘다. */
const NETWORK_TIMEOUT_MS = 2500
/** git 한 번에 주는 시간. 큰 저장소에서도 이 안에 끝난다. */
const GIT_TIMEOUT_MS = 1500
/** 한 번에 볼 변경 경로 수 (`PendingProposalFile.changed_paths` 상한과 같다). */
const MAX_PATHS = 50

const LOCAL_DIR = '.contextops'

/**
 * 🔴 「팀 규칙에 영향을 주는 변경」의 정본 표 (SPEC §8.6).
 * ★ 왜 표인가 — 여기 한 줄을 더하는 것이 이 훅을 넓히는 유일한 방법이어야 한다.
 *   조건문이 흩어지면 다음 사람은 무엇이 감지되는지 코드를 다 읽어야 안다.
 * ⚠ 넓게 잡지 마라. 매 세션 뜨는 알림은 사흘이면 안 읽힌다.
 */
const POLICY_GLOBS = [
  'migrations/**',
  '**/migrations/**',
  'infra/**',
  '**/*.config.*',
  '.github/workflows/**',
  'Dockerfile*',
]

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

/** glob → 정규식. `**` 는 경로 구분자를 넘고 `*` 는 안 넘는다. */
function globToRegExp(glob) {
  let out = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        //  `**/` 는 「없어도 된다」로 읽는다 — `**/migrations/**` 가 루트의 것도 잡게.
        if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; continue }
        out += '.*'; i += 1; continue
      }
      out += '[^/]*'
      continue
    }
    if (c === '?') { out += '[^/]'; continue }
    out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${out}$`)
}

const MATCHERS = POLICY_GLOBS.map(globToRegExp)

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: GIT_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    //  git 이 없거나 저장소가 아니다 — 조용히 「변경 없음」이다.
    return ''
  }
}

/** 바뀐 경로들 (추적 중 + untracked). 우리가 만든 파일은 뺀다. */
function changedPaths(root) {
  const lines = [
    ...git(root, ['diff', '--name-only', 'HEAD']).split('\n'),
    ...git(root, ['ls-files', '--others', '--exclude-standard']).split('\n'),
  ]
  const paths = new Set()
  for (const line of lines) {
    const path = line.trim()
    //  ⚠ 우리 폴더는 세지 않는다 — 안 그러면 훅이 자기가 쓴 파일을 보고 또 알린다.
    if (path.length === 0 || path.startsWith(`${LOCAL_DIR}/`)) continue
    paths.add(path)
  }
  return [...paths].sort().slice(0, MAX_PATHS)
}

/** stdin 으로 오는 훅 payload (`{session_id, ...}`). 없으면 빈 객체다. */
async function readStdin() {
  if (process.stdin.isTTY) return {}
  try {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

async function postProgress(config, token, body) {
  try {
    const response = await fetch(`${config.api_origin}/api/v1/projects/${config.project_id}/progress`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    })
    return response.ok
  } catch {
    //  오프라인·타임아웃 — 조용히 물러선다. 진행 보고는 다음 세션에 또 기회가 있다.
    return false
  }
}

async function main() {
  const root = process.cwd()
  const config = readJson(join(root, LOCAL_DIR, 'project.json'))
  //  연결 안 된 저장소에서는 아무것도 하지 않는다. 대부분의 저장소가 여기다.
  if (config?.api_origin === undefined || config?.project_id === undefined) return

  const paths = changedPaths(root)
  if (paths.length === 0) return

  const payload = await readStdin()
  const manifest = readJson(join(root, LOCAL_DIR, 'manifest.json'))

  // ── ① 진행 보고 — 바뀐 경로가 어느 마일스톤의 paths 안인가 ────────────
  const milestone = (manifest?.milestones ?? []).find((m) =>
    (m?.paths ?? []).some((glob) => paths.some((p) => globToRegExp(glob).test(p))))

  if (milestone !== undefined && !alreadyReported(root, payload.session_id)) {
    const credentials = readJson(join(homedir(), LOCAL_DIR, 'credentials.json'))
    const token = credentials?.[config.api_origin]?.[config.project_id]?.token
    if (typeof token === 'string') {
      await postProgress(config, token, {
        milestone_id: milestone.id,
        status: 'in_progress',
        //  🔴 P1 — 근거는 **경로뿐이다.** 줄 번호조차 훅은 모른다 (diff 를 안 읽는다).
        evidence: paths.slice(0, 20).map((path) => ({ path })),
        summary: `이 세션에서 ${paths.length}개 경로가 바뀌었다`,
        context_version: manifest?.context_version ?? 'unknown',
        //  이 보고를 만든 것은 사람도 agent 도 아니다 (SPEC §3 의 source 3종).
        source: 'hook',
        client_event_id: randomUUID(),
      })
    }
  }

  // ── ② 제안 힌트 — 정책·아키텍처 경로가 바뀌었나 ───────────────────────
  const scoped = scopedPaths(manifest)
  const touched = paths.filter((p) =>
    MATCHERS.some((re) => re.test(p)) || scoped.some((re) => re.test(p)))
  if (touched.length === 0) return

  //  🔴 여기가 이 훅이 쓰는 **유일한 파일**이다 (hooks.json 의 `_writes`).
  writeHint(root, {
    changed_paths: touched,
    hint: `정책·아키텍처에 걸린 경로 ${touched.length}곳이 바뀌었다 — /contextops:propose 로 제안을 검토해라`,
  })
}

/**
 * 같은 세션에서 agent 가 이미 보고했나 (SPEC §8.6).
 * ⚠ 세션 id 를 모르면 **보고했다고 본다.** 중복 보고는 근거 개수를 부풀려 P7 을
 *   거짓말로 만든다 — 누락이 낫다.
 */
function alreadyReported(root, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return true
  //  ⚠ 이름 규칙의 정본은 `src/cli/paths.ts` 의 `progressMarkerFile()` 이다.
  //    여기는 번들이 아니라 import 를 못 해서 규칙을 옮겨 적었다 —
  //    둘이 같은 이름을 내는지는 `test/hooks.test.ts` 의 「같은 세션에 agent 가 이미
  //    보고했으면 보내지 않는다」가 잰다 (그 시험은 progressMarkerFile() 로 파일을 쓴다).
  //    고칠 때 둘을 같이 고쳐라 — 갈리면 훅이 못 찾고 **중복 보고**를 한다.
  const safe = sessionId.replace(/[^A-Za-z0-9_-]/g, '_')
  return existsSync(join(root, LOCAL_DIR, 'cache', `progress-${safe}.json`))
}

/** rules 에 scoped 된 경로들 (`scope.kind === 'path'` 인 항목이 만든 파일의 대상). */
function scopedPaths(manifest) {
  const globs = []
  for (const milestone of manifest?.milestones ?? []) {
    for (const glob of milestone?.paths ?? []) globs.push(glob)
  }
  return globs.map(globToRegExp)
}

function writeHint(root, value) {
  const path = join(root, LOCAL_DIR, 'pending-proposal.json')
  //  ⚠ 이미 있으면 덮어쓴다 — 힌트는 **가장 최근 세션의 것**이어야 한다.
  //    합치면 이미 처리한 경로가 영원히 남는다.
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

//  ⚠ 어떤 예외도 세션 종료를 막지 않는다. 훅이 죽으면 사용자는 우리 도구가 고장 났다고
//    읽는다. 조용히 0 으로 끝나는 것이 낫다.
main().catch(() => {})
