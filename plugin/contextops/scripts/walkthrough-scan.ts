import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ScanResult } from '@contextops/schema'

// =====================================================================
//  관통 한 단계 — **배포되는 번들**이 픽스처 레포를 훑고, 그 산출물에
//  코드 본문이 0건인지 잰다 (P1 · 심사 첫 질문)
//
//  ★ 왜 단위 시험으로 끝내지 않나 — 시험은 `src/` 를 부른다. 사용자가 돌리는 것은
//    `bin/contextops-cli.mjs` 다. 여기서는 **그 파일을 프로세스로 띄워서** 잰다.
//
//  ★ 왜 「고정된 금지 문자열」이 아니라 파일에서 뽑나 — 고정 문자열은 픽스처가
//    바뀌면 조용히 아무것도 안 재게 된다. 목록에 오른 파일마다 **그 파일의 가장 긴
//    줄**을 꺼내 산출물에 없는지 본다. 본문이 한 줄이라도 새면 여기서 걸린다.
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageRoot, '..', '..')
const fixture = join(repoRoot, 'fixtures', 'paylab-api')
const outPath = join(repoRoot, '.ci', 'walkthrough-scan.json')

execFileSync(
  process.execPath,
  [join(packageRoot, 'bin', 'contextops-cli.mjs'), 'scan', '--dir', fixture, '--out', outPath],
  { encoding: 'utf8', stdio: 'inherit' },
)

const text = readFileSync(outPath, 'utf8')
const result = ScanResult.parse(JSON.parse(text))

const leaked: string[] = []
for (const file of result.files) {
  const body = readFileSync(join(fixture, ...file.path.split('/')), 'utf8')
  const longest = body.split('\n').map((l) => l.trim()).sort((a, b) => b.length - a.length)[0] ?? ''
  //  짧은 줄(`}` 같은 것)은 우연히 겹치므로 재지 않는다.
  if (longest.length >= 30 && text.includes(longest)) leaked.push(`${file.path}: ${longest.slice(0, 40)}…`)
}

//  `.env*` 는 목록에 없다 — 값이 샜는지는 파일에서 직접 뽑아 확인한다.
const envExample = join(fixture, '.env.example')
let envLeaked: string[] = []
try {
  envLeaked = readFileSync(envExample, 'utf8')
    .split('\n')
    .map((line) => line.split('=').slice(1).join('=').trim())
    .filter((value) => value.length >= 8 && text.includes(value))
} catch {
  /* 픽스처에 .env.example 이 없으면 잴 것이 없다 */
}

const summary = result.summary
process.stdout.write(`\n  파일 ${summary.file_count} · 언어 ${summary.languages.length} · env 키 ${summary.env_keys.length}\n`)

if (leaked.length > 0 || envLeaked.length > 0) {
  process.stderr.write('\n🔴 P1 위반 — 산출물에 본문이 실렸다:\n')
  for (const line of [...leaked, ...envLeaked]) process.stderr.write(`   ${line}\n`)
  process.exit(1)
}

process.stdout.write('  코드 본문 0건 · env 값 0건 (P1)\n')
