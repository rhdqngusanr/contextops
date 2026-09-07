import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Manifest, RepoPath, type SyncStatus } from '@contextops/schema'

import { readTextIfExists, hasSymlink, sha256OfFile } from './fsx'
import { CACHE_DIR, LOCAL_FILES, repoFile } from './paths'

// =====================================================================
//  🔴 **sync 가 건드려도 되는 파일의 정본 표** (docs/SPEC.md §8.5 6단계 allowlist)
//
//  ★ 왜 표 하나인가 — 이 목록은 「우리가 남의 저장소에 손대는 범위」다. 규칙이
//    `sync` 안에 흩어져 있으면 다음 사람이 대상을 하나 늘릴 때 **거부 규칙 쪽만**
//    고치고 만다. 그러면 그날부터 우리는 사용자가 허락한 적 없는 파일을 덮어쓴다.
//
//  ★ 새 대상(예: `.windsurf/rules/*.md`)을 더하는 절차 — 셋이고, 표 밖에 없다:
//    ① 이 표에 한 줄 더한다 — `sample` 까지. 그게 시험의 재료다
//    ② `packages/compiler` 의 partition 표가 그 경로를 **내는지** 본다
//       (안 내면 이 줄은 아무 일도 안 한다 — 정의만 있고 안 도는 코드가 된다)
//    ③ `test/managed.test.ts` 의 「표의 모든 줄이 실제로 통과한다」에 자동으로 걸린다
//
//  ⚠ 반대로, Manifest 가 내주는 경로인데 이 표에 없으면 sync 는 **그 파일을 거부하고
//    멈춘다.** 조용히 건너뛰지 않는다 — 건너뛰면 Pack 이 반만 적용된 채 `applied` 로
//    보고되고, 그때부터 팀은 서로 다른 규칙을 읽는다.
// =====================================================================

export type ManagedPattern = {
  /** 저장소 상대 경로에 그대로 맞춰 본다. `/` 로만 쓴다 (Windows 에서도). */
  pattern: RegExp
  what: string
  /**
   * 이 줄이 **실제로 받아들이는** 경로 하나.
   *
   * ★ 왜 표에 적나 — 정규식은 되돌릴 수 없다. 이 값이 없으면 시험은 「이 줄이 무언가를
   *   통과시킨다」를 스스로 만들어 낼 수 없고, 그러면 오타 난 줄이 **아무것도 통과시키지
   *   않으면서 표에 멀쩡히 남는다.** 정의만 있고 아무 일도 안 하는 코드의 전형이다.
   *   `test/managed.test.ts` 가 이 값으로 「받아들인다 · 다른 줄이 이미 덮고 있지 않다」를 잰다.
   */
  sample: string
}

export const MANAGED_PATHS: readonly ManagedPattern[] = [
  { pattern: /^CLAUDE\.md$/, what: 'Claude Code 가 읽는 팀 규칙', sample: 'CLAUDE.md' },
  { pattern: /^AGENTS\.md$/, what: 'AGENTS.md 규약을 읽는 도구들', sample: 'AGENTS.md' },
  {
    pattern: /^\.claude\/rules\/[^/]+\.md$/,
    what: 'Claude Code 의 scoped 규칙',
    sample: '.claude/rules/domain-refund.md',
  },
  { pattern: /^\.cursor\/rules\/[^/]+\.mdc$/, what: 'Cursor 의 규칙', sample: '.cursor/rules/team.mdc' },
  //  ⚠ 우리 자신의 상태 파일. Manifest 의 files 에는 없지만 sync 가 마지막에 쓴다.
  {
    pattern: new RegExp(`^${LOCAL_FILES.manifest.replace(/[.]/g, '\\.')}$`),
    what: '적용된 버전의 Manifest',
    sample: LOCAL_FILES.manifest,
  },
]

export type PathVerdict =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * 이 경로에 써도 되는가. **거부 이유를 문장으로 돌려준다** — 「거부됐다」만으로는
 * 사람이 무엇을 고쳐야 하는지 모르고, 그러면 `--force` 로 넘기려 든다.
 */
export function checkWritable(root: string, path: string): PathVerdict {
  //  ① 경로 모양 — 절대경로·`..` 는 계약이 막는다 (`RepoPath`). 우리가 다시 적지 않는다.
  if (!RepoPath.safeParse(path).success) {
    return { ok: false, reason: '저장소 상대 경로가 아니다 (절대경로·상위 이동 금지)' }
  }
  //  ② 백슬래시는 받지 않는다. Windows 에서 `a\..\b` 가 위 검사를 지나가기 때문이다.
  if (path.includes('\\')) return { ok: false, reason: '경로 구분자는 / 하나다' }
  //  ③ allowlist
  if (!MANAGED_PATHS.some((m) => m.pattern.test(path))) {
    return { ok: false, reason: 'sync 가 관리하는 파일이 아니다 (SPEC §8.5 allowlist)' }
  }
  //  ④ 심볼릭 링크 — 여기까지 와야 디스크를 본다.
  if (hasSymlink(root, path)) return { ok: false, reason: '심볼릭 링크다 — 저장소 밖을 가리킬 수 있다' }
  return { ok: true }
}

// =====================================================================
//  로컬이 지금 어떤 상태인가 (SPEC §6 · 상태 5종)
//
//  ★ `sync --check` · `status` · 관통이 **같은 함수**를 부른다. 셋이 따로 세면
//    「status 는 applied 라는데 sync 는 뭔가를 내려받는」 상태가 생긴다.
// =====================================================================

/** `<repo>/.contextops/manifest.json`. 깨져 있으면 `undefined` — 없는 것과 같이 다룬다. */
export function readLocalManifest(root: string): Manifest | undefined {
  const text = readTextIfExists(repoFile(root, 'manifest'))
  if (text === undefined) return undefined
  try {
    const parsed = Manifest.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

export type FileState = {
  path: string
  /** Manifest 가 말하는 값. */
  expected: string
  /** 디스크에서 잰 값. 파일이 없으면 `undefined`. */
  actual: string | undefined
}

/** Manifest 의 파일들을 디스크와 대조한다. **읽기만 한다.** */
export function inspectFiles(root: string, manifest: Manifest): FileState[] {
  return manifest.files.map((f) => ({
    path: f.path,
    expected: f.sha256,
    actual: sha256OfFile(join(root, ...f.path.split('/'))),
  }))
}

export const isMissing = (s: FileState): boolean => s.actual === undefined
export const isChanged = (s: FileState): boolean => s.actual !== undefined && s.actual !== s.expected

export type LocalStatus = {
  /** 서버에 보고할 수 있는 값 4종 + 아직 한 번도 안 맞춘 `unknown`. */
  status: SyncStatus
  /** 사람이 읽는 한 줄. 화면·훅·CLI 가 같은 문장을 쓴다. */
  line: string
  /** 손으로 고쳐진 파일들 — `--force` 없이는 덮지 않는다. */
  modified: string[]
  /** 없어진 파일들. sync 는 이것도 되살린다. */
  missing: string[]
}

/**
 * 지금 상태를 판정한다.
 *
 * ★ 판정 순서가 곧 뜻이다 — **modified 가 outdated 를 이긴다.** 낡았든 아니든
 *   사람이 손으로 고친 파일을 말없이 덮어쓰는 것이 제일 나쁜 결과다.
 *
 * @param local  마지막으로 적용한 Manifest (없으면 한 번도 sync 한 적 없다)
 * @param official 서버의 최신 Manifest. 오프라인이면 `undefined`
 */
export function judge(root: string, local: Manifest | undefined, official: Manifest | undefined): LocalStatus {
  if (local === undefined) {
    //  ⚠ `unknown` 은 **보고할 수 없는 값**이다 (REPORTABLE_SYNC_STATUSES).
    //    보고하지 않는 것이 맞다 — 우리가 아무것도 적용한 적이 없기 때문이다.
    return {
      status: 'unknown',
      line: official === undefined
        ? '아직 sync 한 적이 없다 (서버에도 못 닿았다)'
        : `아직 sync 한 적이 없다 — 공식 v${official.context_version}`,
      modified: [],
      missing: [],
    }
  }

  const states = inspectFiles(root, local)
  const modified = states.filter(isChanged).map((s) => s.path)
  const missing = states.filter(isMissing).map((s) => s.path)

  if (modified.length > 0 || missing.length > 0) {
    const parts = [
      modified.length > 0 ? `${modified.length}개가 손으로 바뀌었다` : '',
      missing.length > 0 ? `${missing.length}개가 없다` : '',
    ].filter((p) => p.length > 0)
    return { status: 'modified', line: `v${local.context_version} — ${parts.join(' · ')}`, modified, missing }
  }

  //  🔴 **파일은 다 맞는데 우리가 놓은 것이 아니다 → `manual`** (FINDINGS 69 · SPEC §6 「zip 수동 적용」).
  //
  //  ★ 왜 이 판정이 필요한가 — `SYNC_STATUSES` 다섯 중 `manual` 만 **찍는 코드가 0곳**이었다.
  //    화면 9 는 그 값을 그릴 준비가 돼 있는데(`SYNC_APPLY.manual`) 영원히 네 값만 그렸다 —
  //    「정의만 있고 아무 일도 안 하는」 자리의 전형이다.
  //  ★ 무엇으로 아나 — `sync` 는 받은 파일을 반드시 `cache/<semver>/` 에 남긴다
  //    (SPEC §8.5 4단계 · `sync.ts`). 그 폴더가 없는데 파일이 manifest 와 다 맞으면,
  //    그 Pack 은 **우리를 거치지 않고** 놓인 것이다 — zip 을 받아 손으로 푼 경우다
  //    (`GET …/packs/{semver}/zip` 이 `.contextops/manifest.json` 을 그 자리 그대로 담는다).
  //  ⚠ `modified`·`missing` 검사 **뒤**에 온다. 파일이 어긋난 것이 먼저다 — 손으로 푼 뒤
  //    한 파일을 고쳤으면 그건 `manual` 이 아니라 `modified` 다.
  //  ⚠ `unknown` 과 달리 이 값은 **기기가 보고할 수 있다** (`REPORTABLE_SYNC_STATUSES`).
  const appliedByUs = existsSync(join(root, ...CACHE_DIR.split('/'), local.context_version))
  if (!appliedByUs) {
    const tail = official === undefined
      ? ' (서버에 못 닿아 최신 여부는 모른다)'
      : official.manifest_hash === local.manifest_hash ? ' · 최신이다' : ` · 공식 v${official.context_version} 이 나왔다`
    return {
      status: 'manual',
      line: `v${local.context_version} — sync 가 아니라 손으로 놓였다 (zip)${tail}`,
      modified,
      missing,
    }
  }

  if (official === undefined) {
    //  오프라인. 로컬은 멀쩡하니 마지막으로 아는 값을 그대로 말한다.
    return { status: 'applied', line: `v${local.context_version} 적용됨 (서버에 못 닿아 최신 여부는 모른다)`, modified, missing }
  }
  if (official.manifest_hash === local.manifest_hash) {
    return { status: 'applied', line: `v${local.context_version} 최신이다`, modified, missing }
  }
  return {
    status: 'outdated',
    line: `v${local.context_version} → 공식 v${official.context_version} 이 나왔다`,
    modified,
    missing,
  }
}
