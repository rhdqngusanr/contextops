import { isAbsolute, join } from 'node:path'

// =====================================================================
//  로컬 파일이 어디 사는가 (docs/SPEC.md §8.2)
//
//  ★ 왜 표 하나인가 — 이 경로들은 CLI·훅·Skill·문서가 전부 가리킨다. 문자열을
//    쓰는 자리마다 적으면 한 곳만 옮겨도 나머지가 조용히 **없는 파일을 읽는다**
//    (없으면 「설정이 없다」로 보여서 고장으로 안 보인다).
//
//  ★ 새 로컬 파일을 더하는 절차: ① `packages/schema/src/plugin.ts` 에 계약 하나
//    ② 이 표에 한 줄 ③ 커밋 여부를 아래 주석에 적는다 (팀에 퍼지는 파일인가).
// =====================================================================

/** 저장소 안의 모든 로컬 상태가 이 폴더 하나에 산다. */
export const LOCAL_DIR = '.contextops'

/**
 * 저장소 상대 경로. 커밋 여부는 SPEC §8.2 의 표가 정한다:
 * `project.json` 커밋 권장 · `manifest.json` 선택 · 나머지 셋은 ignore.
 */
export const LOCAL_FILES = {
  project: `${LOCAL_DIR}/project.json`,
  manifest: `${LOCAL_DIR}/manifest.json`,
  scan: `${LOCAL_DIR}/cache/scan.json`,
  draft: `${LOCAL_DIR}/cache/draft.json`,
  pendingProposal: `${LOCAL_DIR}/pending-proposal.json`,
} as const

export type LocalFile = keyof typeof LOCAL_FILES

/**
 * `--dir` 을 절대 경로로 편다. 상대 경로는 **명령을 부른 자리** 기준이다.
 * ★ 왜 함수인가 — 명령마다 풀면 하나는 `process.cwd()` 를 직접 보게 되고,
 *   그 명령만 시험에서 임시 폴더를 못 쓰게 된다.
 */
export function resolveRoot(cwd: string, dir: string | undefined): string {
  if (dir === undefined) return cwd
  return isAbsolute(dir) ? dir : join(cwd, dir)
}

/** 저장소 루트 기준 절대 경로. */
export function repoFile(root: string, which: LocalFile): string {
  return join(root, ...LOCAL_FILES[which].split('/'))
}

/**
 * `~/.contextops/credentials.json` — **저장소 밖**이다.
 * ★ 왜 밖인가 — 토큰은 사람의 것이지 저장소의 것이 아니다. 저장소 안에 두면
 *   실수로 커밋되는 날이 오고, 그 하루가 P1 의 전부를 지운다.
 */
export function credentialsFile(home: string): string {
  return join(home, LOCAL_DIR, 'credentials.json')
}
