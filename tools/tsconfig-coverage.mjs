// =====================================================================
//  tools/tsconfig-coverage.mjs — 저장소의 모든 TS 소스가 **어떤 tsconfig 에는**
//  들어 있는지 센다. 루트 package.json 의 `typecheck` 스크립트가 tsc 보다 먼저 부른다.
//
//  ★ 왜 있나 (FINDINGS 92) — `typecheck` 층은 「tsc 가 exit 0 이었다」만 말하고
//    **「무엇을 봤나」는 아무도 안 셌다.** apps/web/tsconfig.json 의 include 가
//    ["*.ts", "src", "test", …] 였고 `*.ts` 는 맨 위 한 층이라 `scripts/` 가 통째로
//    빠져 있었다 — 관통을 만드는 코드(seed·walkthrough-publish·dev-server·dump-*)가
//    여러 바퀴 동안 타입을 한 번도 안 봤는데 CI 는 계속 초록이었다.
//    **「검사가 돌았나」와 「그 검사가 이 파일을 봤나」는 다른 질문이다.**
//    앞의 것만 세는 게이트는 눈을 가린 채 초록을 찍는다.
//
//  ★ 왜 tsc 에게 물어보나 — include/exclude 의 글로브 규칙을 여기서 다시 구현하면
//    그 구현이 tsc 와 갈리는 순간 이 게이트가 거짓말을 한다. `--listFilesOnly` 는
//    타입 검사 없이 **tsc 가 실제로 읽은 파일 목록**을 그대로 낸다 — 정본이 하나다.
//
//  ★ 프로젝트 목록을 여기에 적지 않는다 — `tsconfig.json` 을 저장소에서 **찾는다.**
//    목록을 손으로 들면 새 패키지를 더한 사람이 여기에 한 줄을 잊고, 그 패키지는
//    조용히 검사 밖에 선다 (이 게이트가 막으려는 고장 그 자체다).
//    ⚠ tsconfig.json 이 아예 없는 새 패키지도 잡힌다 — 그 소스가 어느 목록에도
//      안 나오므로 「덮이지 않음」으로 빨개진다.
//
//  종료 코드: 0 전부 덮임 · 1 하나라도 빠짐
// =====================================================================
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

//  어디도 안 내려가는 폴더. 우리 소스가 아니거나 빌드 산출물이다.
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.ci', 'dist', 'build'])

//  🔴 **타입 검사를 일부러 안 하는 자리.** 여기 적는 것은 「빠뜨린 것」이 아니라
//     「뺀 것」이고, 뺀 이유가 옆에 있어야 한다.
//     ⚠ 새 줄을 더할 때는 반드시 why 를 같이 적어라. 이유 없는 면제는 다음 사람이
//       「원래 그랬나 보다」로 읽고, 그 순간 이 게이트는 체 구멍이 된다.
//     ⚠ 경로가 사라지면 **FAIL 이다** — 죽은 면제가 남아 있으면 목록이 조용히 썩는다.
const EXEMPT = [
  {
    dir: 'fixtures',
    why: '데모용 가짜 저장소다 (SPEC §10.1 paylab-api). 우리 코드가 아니고 '
       + '우리 컴파일러 옵션으로 돌 이유도 없다 — 자기 tsconfig.json 을 따로 들고 있다.',
  },
]

//  ── 저장소의 TS 소스를 전부 센다 ────────────────────────────────────
function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
  }
  return out
}

//  ── tsc 가 실제로 읽은 파일 목록 ────────────────────────────────────
//  ⚠ `--listFilesOnly` 는 타입 검사를 하지 않는다. 여기서 타입 에러가 나도
//    이 게이트는 통과해야 한다 — 그건 바로 뒤의 tsc 가 낼 말이다.
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')

function filesSeenBy(projectDir) {
  const out = execFileSync(process.execPath, [TSC, '-p', projectDir, '--listFilesOnly'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  })
  return out.split('\n').map((l) => l.trim()).filter(Boolean)
}

//  Windows 는 같은 파일을 드라이브 문자 대소문자만 다르게 낸다. 비교는 정규화해서.
const key = (p) => path.resolve(p).split(path.sep).join('/').toLowerCase()

//  ── 실행 ────────────────────────────────────────────────────────────
const problems = []

//  면제 목록이 썩지 않았는지 먼저 본다.
for (const e of EXEMPT) {
  if (!existsSync(path.join(ROOT, e.dir))) {
    problems.push(`면제 목록의 '${e.dir}' 가 없다 — 죽은 면제를 지워라 (tools/tsconfig-coverage.mjs)`)
  }
}

const exemptKeys = EXEMPT.map((e) => key(path.join(ROOT, e.dir)) + '/')
const isExempt = (f) => exemptKeys.some((p) => key(f).startsWith(p))

//  프로젝트를 찾는다 — 면제된 자리의 tsconfig 는 우리 것이 아니므로 안 돈다.
function findProjects(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      if (!isExempt(path.join(full, 'x'))) findProjects(full, out)
    } else if (name === 'tsconfig.json') {
      out.push(dir)
    }
  }
  return out
}

const projects = findProjects(ROOT, [])

const covered = new Set()
for (const p of projects) {
  for (const f of filesSeenBy(p)) covered.add(key(f))
}

const sources = walk(ROOT, []).filter((f) => !isExempt(f))
const missing = sources.filter((f) => !covered.has(key(f)))

for (const f of missing) {
  problems.push(`어느 tsconfig 에도 없다: ${path.relative(ROOT, f).split(path.sep).join('/')}`)
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/') || '.'
if (problems.length > 0) {
  console.error('tsconfig 덮임 검사 FAIL — 아래 파일은 타입 검사를 받지 않는다:')
  for (const p of problems) console.error(`  · ${p}`)
  console.error('')
  console.error('  고치는 법: 그 파일이 속한 패키지의 tsconfig.json include 가 덮게 하거나,')
  console.error('  일부러 빼는 것이면 tools/tsconfig-coverage.mjs 의 EXEMPT 에 **이유와 함께** 적어라.')
  process.exit(1)
}

console.log(
  `tsconfig 덮임 OK — 프로젝트 ${projects.length}개 [${projects.map(rel).join(', ')}] 가 `
  + `TS 소스 ${sources.length}개를 전부 덮는다 (면제 ${EXEMPT.map((e) => e.dir).join(', ')})`,
)
