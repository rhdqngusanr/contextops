import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ScanResult } from '@contextops/schema'

import { plantEnv } from '../../../tools/walkthrough-stage'

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
//
//  ★ 왜 픽스처를 **임시 사본**에서 훑나 (FINDINGS 125) — 픽스처의 `.env.example` 은
//    값이 0건이어야 한다(`tools/fixtures.mjs` ③). 그래서 그 파일의 값만 재던 예전 검사는
//    **잰 값이 0개**인 채로 초록이었다. 사본에 값이 든 `.env` 를 심고(정본은
//    `tools/walkthrough-stage.ts` 의 `PLANTED_ENV` — payload 단계와 같은 값), 심은 값이
//    산출물에 없고 **키 이름은** 있는지 둘 다 본다. **잰 값이 0개면 FAIL 이다.**
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageRoot, '..', '..')
const fixture = join(repoRoot, 'fixtures', 'paylab-api')
const outPath = join(repoRoot, '.ci', 'walkthrough-scan.json')

//  사본의 폴더 이름은 난수라 `--repo-name` 으로 픽스처 이름을 고정한다 — 산출물이
//  관통마다 다른 `repo` 를 찍으면 증거 문서에 복사한 것과 어긋난다.
const repo = mkdtempSync(join(tmpdir(), 'ctx-scan-'))
let code = 1
try {
  cpSync(fixture, repo, { recursive: true })
  const planted = plantEnv(repo)

  execFileSync(
    process.execPath,
    [join(packageRoot, 'bin', 'contextops-cli.mjs'), 'scan',
      '--dir', repo, '--repo-name', 'paylab-api', '--out', outPath],
    { encoding: 'utf8', stdio: 'inherit' },
  )

  const text = readFileSync(outPath, 'utf8')
  const result = ScanResult.parse(JSON.parse(text))

  //  ① 목록에 오른 파일마다 — 가장 긴 줄이 산출물에 없다.
  const leaked: string[] = []
  for (const file of result.files) {
    const body = readFileSync(join(repo, ...file.path.split('/')), 'utf8')
    const longest = body.split('\n').map((l) => l.trim()).sort((a, b) => b.length - a.length)[0] ?? ''
    //  짧은 줄(`}` 같은 것)은 우연히 겹치므로 재지 않는다.
    if (longest.length >= 30 && text.includes(longest)) leaked.push(`${file.path}: ${longest.slice(0, 40)}…`)
  }

  //  ② `.env*` 는 목록에 없다 — 심은 값(과 `.env.example` 의 값)이 산출물에 없다.
  //     ⚠ 잰 값이 0개면 그것도 실패다 — 「잴 것이 없어서 초록」이 이 검사가 났던 고장이다.
  const envLeaked = planted.values.filter((value) => text.includes(value))
  const envFailed: string[] = planted.values.length === 0
    ? ['env 값을 하나도 안 쟀다 — plantEnv 가 값을 안 심었다']
    : envLeaked.map((value) => `.env 값이 산출물에 있다: ${value.slice(0, 24)}…`)

  //  ③ 심은 키 이름은 **있어야** 한다 — 스캐너가 `.env` 를 열어 키만 꺼냈다는 증거.
  //     없으면 「값을 안 읽었다」가 아니라 「파일을 안 열었다」이고, 그건 다른 주장이다.
  const summary = result.summary
  const keyMissing = planted.keys.filter((k) => !summary.env_keys.includes(k))
  const keyFailed = keyMissing.length === 0 ? [] : [`심은 .env 의 키가 산출물에 없다: ${keyMissing.join(' · ')}`]

  process.stdout.write(`\n  파일 ${summary.file_count} · 언어 ${summary.languages.length} · env 키 ${summary.env_keys.length}\n`)

  //  ★ 관통(tools/walkthrough.ps1)이 「이 단계가 검사 몇 개를 돌았나」를 이 줄에서 읽는다.
  //    이 단계의 산출물은 CLI 가 쓰는 ScanResult 라 `checks` 배열을 담을 자리가 없다.
  //    ⚠ 수를 손으로 적지 마라 — 목록에 오른 파일마다 본문을 한 번씩 잰 것이 그대로 개수이고
  //      (거기에 env 값 한 번 · 심은 키 한 번), 손으로 적으면 픽스처가 늘어도 이 수가 안 따라온다.
  const failures = [...leaked, ...envFailed, ...keyFailed]
  process.stdout.write(`  검사 ${result.files.length + 2}개 · 실패 ${failures.length}개\n`)

  if (failures.length > 0) {
    process.stderr.write('\n🔴 P1 위반 — 산출물에 본문·값이 실렸거나, 검사가 아무것도 안 쟀다:\n')
    for (const line of failures) process.stderr.write(`   ${line}\n`)
  } else {
    process.stdout.write(
      `  코드 본문 0건 · env 값 0건 (잰 값 ${planted.values.length}개 · 심은 키 ${planted.keys.length}개 산출물에 있음) (P1)\n`,
    )
    code = 0
  }
} finally {
  rmSync(repo, { recursive: true, force: true })
}

process.exit(code)
