import { readdirSync } from 'node:fs'
import { basename as pathBasename, extname, isAbsolute, join } from 'node:path'
import { RepoPath, SCAN_LIMITS, ScanResult } from '@contextops/schema'

import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { readProjectConfig } from './config'
import { EXIT } from './exit'
import { readTextIfExists, writeJsonFile } from './fsx'
import { LOCAL_FILES, repoFile, resolveRoot } from './paths'
import {
  DEPENDENCY_READERS, ENTRY_BASENAMES, ENTRY_MAX_DEPTH, EXCLUDED_DIRS,
  INFRA_BASENAMES, INFRA_PREFIXES, INFRA_SUFFIXES, LANGUAGE_BY_EXT,
  NOISE_PATTERNS, SECRET_PATTERNS, declaredEntrypoints, envKeysOf,
} from './scan-tables'

// =====================================================================
//  `contextops scan` 의 몸통 — 결정론 스캔 (docs/SPEC.md §8.3)
//
//  🔴 **산출물에 파일 본문이 없다** (P1). 이 함수가 파일을 여는 것은 딱 두 가지다:
//    ① 의존성 매니페스트 → 이름만  ② `.env*` → 키 이름만.
//    나머지 파일은 **이름과 크기조차 읽지 않는다** — 경로만 센다.
//
//  🔴 **같은 저장소 → 같은 JSON.** 시각도 난수도 없고 정렬은 코드포인트 순이다.
//    ★ 왜 — `scan.json` 이 매번 달라지면 git 이 매 세션 변경으로 보이고, 사람은
//      그걸 무시하는 법을 배운다. 그러면 진짜 변화도 같이 안 보인다.
//    ⚠ `localeCompare` 를 쓰지 마라 — 기계의 로케일에 따라 순서가 갈린다.
// =====================================================================

//  ⚠ 상한 숫자는 여기 없다 — 정본은 `packages/schema` 의 `SCAN_LIMITS` 표다.
//    스키마가 400 을 내는 기준과 스캐너가 자르는 기준이 갈리면, 로컬에서는 멀쩡한
//    scan.json 이 업로드에서만 막힌다.

const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const sorted = (values: Iterable<string>): string[] => [...new Set(values)].sort(byCodePoint)

/**
 * 제외 사유 한 줄. `ScanSummary.excluded` 의 200자 상한 안으로 자른다.
 * ★ 왜 함수인가 — 상한을 넘기면 스키마가 던지고 **스캔 전체가 실패한다.**
 *   경로 하나가 길다는 이유로 스캔이 안 도는 것이 제일 이상한 고장이다.
 */
const note = (text: string): string =>
  (text.length <= SCAN_LIMITS.note_chars ? text : `${text.slice(0, SCAN_LIMITS.note_chars - 3)}...`)

type Walked = {
  /** 목록에 실리는 파일 (secret·noise 제외). */
  files: string[]
  /** 실제로 걸린 제외 규칙만. 안 걸린 규칙을 적으면 「무엇을 못 봤나」가 흐려진다. */
  excluded: Set<string>
  /** `.env*` 로 판정돼 목록에서 빠진 파일 — 키 이름만 꺼내려고 자리를 기억한다. */
  envFiles: string[]
}

function walk(root: string): Walked {
  const out: Walked = { files: [], excluded: new Set(), envFiles: [] }
  const stack: string[] = ['']

  while (stack.length > 0) {
    const rel = stack.pop() ?? ''
    let entries
    try {
      entries = readdirSync(join(root, rel), { withFileTypes: true })
    } catch {
      //  읽을 수 없는 폴더는 없는 것으로 센다. 스캔이 권한 하나로 멈추면
      //  「우리 저장소에서는 안 된다」가 된다.
      out.excluded.add(note(`${rel || '.'}/ (읽을 수 없음)`))
      continue
    }
    //  들어간 순서가 결과를 바꾸지 않게 여기서 정렬한다.
    for (const entry of [...entries].sort((a, b) => byCodePoint(a.name, b.name))) {
      const path = rel === '' ? entry.name : `${rel}/${entry.name}`
      //  ⚠ 심볼릭 링크는 따라가지 않는다 — 저장소 밖으로 나가거나 순환한다.
      if (entry.isSymbolicLink()) {
        out.excluded.add(note(`${path} (심볼릭 링크)`))
        continue
      }
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.includes(entry.name)) {
          out.excluded.add(`${entry.name}/`)
          continue
        }
        stack.push(path)
        continue
      }
      if (!entry.isFile()) continue

      if (SECRET_PATTERNS.some((re) => re.test(path))) {
        //  ⚠ 사유를 정확히 적는다. `.env*` 는 **열되 키 이름만** 꺼내고, 나머지는
        //    아예 안 연다. 둘을 같은 문구로 적으면 산출물이 거짓말을 한다.
        const isEnv = /(^|\/)\.env($|\.)/.test(path)
        out.excluded.add(note(`${path} (${isEnv ? '키 이름만 읽었다 — 값은 안 읽는다' : 'secret 후보 — 열지 않는다'})`))
        if (isEnv) out.envFiles.push(path)
        continue
      }
      if (NOISE_PATTERNS.some((re) => re.test(path))) {
        out.excluded.add(note(`${path} (생성물·바이너리)`))
        continue
      }
      //  ⚠ 경로 모양이 계약(`RepoPath`)과 안 맞으면 **목록에서 뺀다.** 담아 두면
      //    파일 하나 때문에 `ScanResult.parse` 가 던져 스캔 전체가 실패한다
      //    (이름에 `..` 가 든 파일 하나로 그렇게 된다).
      if (!RepoPath.safeParse(path).success) {
        out.excluded.add(note(`${path} (경로 모양이 계약과 다르다)`))
        continue
      }
      out.files.push(path)
    }
  }

  out.files.sort(byCodePoint)
  if (out.files.length > SCAN_LIMITS.files) {
    out.excluded.add(note(`(파일이 ${SCAN_LIMITS.files}개를 넘어 뒤를 잘랐다 — 총 ${out.files.length}개)`))
    out.files.length = SCAN_LIMITS.files
  }
  return out
}

const depthOf = (path: string): number => path.split('/').length
const basename = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

function isInfra(path: string): boolean {
  const name = basename(path).toLowerCase()
  if (INFRA_BASENAMES.includes(name)) return true
  if (INFRA_SUFFIXES.some((s) => name.endsWith(s))) return true
  return INFRA_PREFIXES.some((p) => path.startsWith(p))
}

/**
 * 저장소 하나를 훑는다. 결과는 **반드시 `ScanResult` 로 파싱해서** 돌려준다 —
 * 상한을 넘겼거나 경로 모양이 이상하면 파일로 쓰기 **전에** 여기서 죽는 것이 낫다.
 */
export function scanRepo(root: string, repoName: string): ScanResult {
  const walked = walk(root)
  const known = new Set(walked.files)

  const languages: string[] = []
  const entrypoints: string[] = []
  const infraFiles: string[] = []
  for (const path of walked.files) {
    const language = LANGUAGE_BY_EXT[extname(path).toLowerCase()]
    if (language !== undefined) languages.push(language)
    if (ENTRY_BASENAMES.includes(basename(path)) && depthOf(path) <= ENTRY_MAX_DEPTH) {
      entrypoints.push(path)
    }
    if (isInfra(path)) infraFiles.push(path)
  }

  //  매니페스트는 **얕은 자리의 것만** 읽는다. 모노레포에서 하위 패키지까지 전부 읽으면
  //  의존성 500개 상한을 순식간에 넘기고, 그때 잘리는 것은 정작 뿌리의 의존성이다.
  const dependencies: string[] = []
  for (const path of walked.files) {
    if (depthOf(path) > 2) continue
    const reader = DEPENDENCY_READERS[basename(path)]
    if (reader === undefined) continue
    const text = readTextIfExists(join(root, path))
    if (text === undefined) continue
    dependencies.push(...reader(text))
    if (basename(path) === 'package.json') {
      entrypoints.push(...declaredEntrypoints(text).filter((p) => known.has(p)))
    }
  }

  const envKeys: string[] = []
  for (const path of walked.envFiles) {
    const text = readTextIfExists(join(root, path))
    if (text !== undefined) envKeys.push(...envKeysOf(text))
  }

  //  ⚠ 상한(`ScanSummary` 의 `.max(...)`)을 넘기면 스키마가 던진다. 넘칠 수 있는 것은
  //    여기서 자르되 **무엇을 잘랐는지 제외 목록에 남긴다** — 조용히 자르지 않는다.
  const excluded = sorted(walked.excluded)
  const cap = <T>(values: T[], max: number, what: string): T[] => {
    if (values.length <= max) return values
    excluded.push(note(`(${what} ${values.length}개 중 ${max}개만 실었다)`))
    return values.slice(0, max)
  }

  return ScanResult.parse({
    repo: repoName,
    files: walked.files.map((path) => ({
      path,
      language: LANGUAGE_BY_EXT[extname(path).toLowerCase()] ?? 'other',
    })),
    summary: {
      file_count: walked.files.length,
      languages: cap(sorted(languages), SCAN_LIMITS.languages, '언어'),
      entrypoints: cap(sorted(entrypoints), SCAN_LIMITS.entrypoints, '엔트리포인트'),
      infra_files: cap(sorted(infraFiles), SCAN_LIMITS.infra_files, '인프라 파일'),
      env_keys: cap(sorted(envKeys), SCAN_LIMITS.env_keys, 'env 키'),
      dependencies: cap(sorted(dependencies), SCAN_LIMITS.dependencies, '의존성'),
      excluded: cap(sorted(excluded), SCAN_LIMITS.excluded, '제외 규칙'),
    },
  })
}

// =====================================================================
//  명령 자리 — 위의 순수 스캔을 파일로 떨어뜨린다
// =====================================================================

export const SCAN_FLAGS: FlagSpecs = {
  'dir': { kind: 'value', help: '저장소 루트 (기본: 지금 폴더)' },
  'out': { kind: 'value', help: `산출 위치 (기본: ${LOCAL_FILES.scan})` },
  'repo-name': { kind: 'value', help: '레포 이름 (기본: project.json 의 값 · 없으면 폴더 이름)' },
}

export async function runScan(cli: Cli, flags: Flags): Promise<number> {
  const root = resolveRoot(cli.cwd, flags.value('dir'))
  //  이름의 정본은 `project.json` 이다 — 근거(`repository_path.repo`)가 그 이름을 가리킨다.
  //  setup 전에도 스캔은 돌아야 하므로(초안을 먼저 보고 싶을 수 있다) 폴더 이름으로 물러선다.
  const config = readProjectConfig(root)
  const repoName = flags.value('repo-name')
    ?? (config.state === 'ok' ? config.value.repo_name : undefined)
    ?? pathBasename(root)

  let result: ScanResult
  try {
    result = scanRepo(root, repoName)
  } catch (err) {
    cli.io.err(`스캔이 계약과 맞지 않는 결과를 냈다 — ${err instanceof Error ? err.message : '알 수 없는 이유'}`)
    return EXIT.CONFIG
  }

  const outFlag = flags.value('out')
  const outPath = outFlag === undefined
    ? repoFile(root, 'scan')
    : (isAbsolute(outFlag) ? outFlag : join(cli.cwd, outFlag))
  writeJsonFile(outPath, result)

  const s = result.summary
  cli.io.out(`${outPath}`)
  cli.io.out(`  파일 ${s.file_count}개 · 언어 ${s.languages.join(', ') || '없음'}`)
  cli.io.out(`  엔트리포인트 ${s.entrypoints.length} · 인프라 ${s.infra_files.length} · 의존성 ${s.dependencies.length}`)
  cli.io.out(`  env 키 이름 ${s.env_keys.length}개 (값은 읽지 않았다) · 제외 ${s.excluded.length}종`)
  cli.io.out('  코드 본문은 담지 않았다 — 경로와 이름만이다 (P1).')
  return EXIT.OK
}
