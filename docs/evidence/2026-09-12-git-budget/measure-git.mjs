// git 기동 시간을 잰다 — 한가할 때 vs 동시 부하. FINDINGS 「먼저 재라」.
import { execFileSync, execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'gitmeasure-'))
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' })
  writeFileSync(join(root, 'README.md'), '# x\n', 'utf8')
  mkdirSync(join(root, 'migrations'), { recursive: true })
  writeFileSync(join(root, 'migrations', '001.sql'), 'create table t();\n', 'utf8')
  return root
}

/** stop.mjs 가 실제로 부르는 두 명령을 그대로. 반환은 두 번 합친 ms. */
function timeBothGitCalls(root) {
  const t0 = process.hrtime.bigint()
  for (const args of [['diff', '--name-only', 'HEAD'], ['ls-files', '--others', '--exclude-standard']]) {
    try {
      execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { /* HEAD 없음 등 — 기동 시간만 재면 된다 */ }
  }
  return Number(process.hrtime.bigint() - t0) / 1e6
}

/** 각 git 호출을 따로 — 어느 쪽이 느린지 */
function timeEachGitCall(root) {
  const out = []
  for (const args of [['diff', '--name-only', 'HEAD'], ['ls-files', '--others', '--exclude-standard']]) {
    const t0 = process.hrtime.bigint()
    try {
      execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch { /* ignore */ }
    out.push(Number(process.hrtime.bigint() - t0) / 1e6)
  }
  return out
}

const mode = process.argv[2] ?? 'idle'
const n = Number(process.argv[3] ?? 10)
const repo = makeRepo()

if (mode === 'idle') {
  const both = []
  const each = []
  for (let i = 0; i < n; i++) { both.push(timeBothGitCalls(repo)); each.push(timeEachGitCall(repo)) }
  const sorted = [...both].sort((a, b) => a - b)
  console.log(JSON.stringify({
    mode, n,
    both_min: +sorted[0].toFixed(0),
    both_median: +sorted[Math.floor(n / 2)].toFixed(0),
    both_max: +sorted[n - 1].toFixed(0),
    first_call_max: +Math.max(...each.map((e) => e[0])).toFixed(0),
    second_call_max: +Math.max(...each.map((e) => e[1])).toFixed(0),
  }))
} else {
  //  부하: CPU 를 먹는 자식 여러 개를 띄운 채로 잰다 (CI 가 멤버 4개를 동시에 돌리는 상황).
  const load = Number(process.argv[4] ?? 8)
  const burners = []
  for (let i = 0; i < load; i++) {
    burners.push(execFile(process.execPath, ['-e', 'const e=Date.now()+25000;let x=0;while(Date.now()<e){x+=Math.sqrt(x+1)}'], () => {}))
  }
  await new Promise((r) => setTimeout(r, 800))
  const both = []
  for (let i = 0; i < n; i++) both.push(timeBothGitCalls(repo))
  for (const b of burners) b.kill()
  const sorted = [...both].sort((a, b) => a - b)
  console.log(JSON.stringify({
    mode, n, load,
    both_min: +sorted[0].toFixed(0),
    both_median: +sorted[Math.floor(n / 2)].toFixed(0),
    both_max: +sorted[n - 1].toFixed(0),
  }))
}
