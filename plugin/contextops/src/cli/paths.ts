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
  /** propose Skill 이 쓰는 제안 초안 (`ProposalDraftFile`). 보내고 나면 남겨 둔다 — 사람이 다시 읽는다. */
  proposalDraft: `${LOCAL_DIR}/cache/proposal.json`,
  pendingProposal: `${LOCAL_DIR}/pending-proposal.json`,
  /** 보내지 못한 sync 보고. 다음 `status` 가 재전송한다 (SPEC §8.5 8단계). */
  syncReceipt: `${LOCAL_DIR}/cache/sync-receipt.json`,
  /** 훅이 네트워크 없이 읽는 최신 Manifest (SPEC §8.6 「5분 내 cache 재사용」). */
  latestCache: `${LOCAL_DIR}/cache/latest-manifest.json`,
} as const

export type LocalFile = keyof typeof LOCAL_FILES

/**
 * 🔴 SPEC §8.2 표의 **「ignore」 칸**이 이 목록이다 — `.contextops/.gitignore` 의 정본.
 *
 * ★ 왜 필요한가 — `cache/scan.json` 은 기계마다 다르고 매 스캔 바뀐다. 아무도 규칙을
 *   안 만들면 처음 `scan` 을 돌린 사람이 그걸 그대로 커밋하고, 그 뒤로 팀원 모두가
 *   매 세션 충돌을 본다 (docs/feedback/FINDINGS.md 37 — 새 레포 실험에서 실제로 그랬다).
 * ★ 왜 저장소 루트의 `.gitignore` 가 아니라 `.contextops/.gitignore` 인가 —
 *   **남의 파일을 안 고치기 위해서다.** 루트 `.gitignore` 는 사용자의 것이고,
 *   거기에 줄을 끼워 넣으면 우리가 사용자 저장소를 몰래 고치는 도구가 된다.
 *
 * ⚠ 여기 한 줄을 더하면 `LOCAL_FILES` 표에서 그 파일이 ignore 인지 다시 봐라.
 *   `manifest.json` 은 **커밋 선택**이라 여기 없다 — 넣으면 팀이 못 공유한다.
 */
export const IGNORED_LOCAL_PATHS = ['cache/', 'backups/', 'pending-proposal.json'] as const

/** `.contextops/backups/<ts>-<from>-to-<to>/` — sync 가 바꾸기 전 원본 (SPEC §8.2). */
export const BACKUP_DIR = `${LOCAL_DIR}/backups`

/** 보관 개수 (SPEC §8.2 「최근 5개 보관」). 숫자를 호출부에 적지 마라. */
export const BACKUP_KEEP = 5

/** 내려받은 Pack 파일이 잠시 머무는 자리 (SPEC §8.5 4단계). */
export const CACHE_DIR = `${LOCAL_DIR}/cache`

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
 * `<repo>/.contextops/cache/progress-<session>.json` — 「이번 세션은 이미 보고했다」 (SPEC §8.6).
 *
 * ⚠ 이름이 세션마다 다르므로 `LOCAL_FILES` 표에 못 넣는다. 자리를 아는 곳은 이 함수
 *   하나이고, **훅도 같은 규칙으로 찾는다** (`scripts/stop.mjs` — 번들이 아니라
 *   import 를 못 해서 규칙을 그쪽에도 적었다. 고칠 때 둘을 같이 고쳐라 ·
 *   둘이 **같은 이름을 내는지**는 `test/hooks.test.ts` 의 「같은 세션에 agent 가 이미
 *   보고했으면 보내지 않는다」가 잰다 — 그 시험은 이 함수로 표시 파일을 쓰고 훅이
 *   그것을 찾게 한다. 이름이 갈리면 훅이 **못 찾고 중복 보고**를 하며 초록으로 남는다).
 * ⚠ 세션 id 는 사람이 준 문자열이다 — 경로 구분자를 쓰면 캐시 폴더 밖을 가리킬 수 있다.
 *   그래서 안전한 글자만 남긴다.
 */
export function progressMarkerFile(root: string, sessionId: string): string {
  return join(root, ...CACHE_DIR.split('/'), `progress-${sessionId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`)
}

/**
 * `~/.contextops/credentials.json` — **저장소 밖**이다.
 * ★ 왜 밖인가 — 토큰은 사람의 것이지 저장소의 것이 아니다. 저장소 안에 두면
 *   실수로 커밋되는 날이 오고, 그 하루가 P1 의 전부를 지운다.
 */
export function credentialsFile(home: string): string {
  return join(home, LOCAL_DIR, 'credentials.json')
}
