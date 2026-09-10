// =====================================================================
//  Pack 파일 목록의 **보는 차례**와 **폴더/이름** (2026-09-11 · 화면 7 파일 트리)
//
//  ★ 왜 — 트리가 경로순이라 현관인 `CLAUDE.md` 가 맨 아래, 곁방 `.claude/rules/…` 가 맨 위였고,
//    「처음 여는 파일」은 화면이 `'CLAUDE.md'` 리터럴로 따로 골랐다. 두 자리에서 나오면 반드시 갈린다 —
//    여기서는 **맨 윗줄 = 처음 여는 파일**이 한 함수(`orderPackFiles`)에서 나온다.
//  🔴 `manifest.files` 자체는 건드리지 않는다 (P4 · 확인표의 차례는 서버가 정한 그대로). 여기는 사람이 **보는** 차례만 정한다.
//  ⚠ 경로 목록을 적지 않는다 — 규칙은 `GROUPS` 표 하나다. 묶음을 더하려면 그 표에 한 줄.
// =====================================================================

/** Pack 의 현관 — 사람이 처음 여는 파일이자 트리의 맨 윗줄. */
export const PACK_ENTRY = 'CLAUDE.md'

/**
 * 묶음의 차례 — 앞 묶음이 위에 선다. 각 묶음 안은 코드포인트순(`a.path < b.path`)이다.
 * 새 묶음: 여기 한 줄(먼저 맞는 규칙이 이긴다).
 */
const GROUPS: readonly ((path: string) => boolean)[] = [
  (path) => path === PACK_ENTRY,   // 현관
  (path) => !path.includes('/'),   // 루트 파일 (AGENTS.md …)
  () => true,                      // 폴더 파일 (.claude/rules/… · .cursor/rules/…)
]

function groupOf(path: string): number {
  return GROUPS.findIndex((match) => match(path))
}

/** 보는 차례로 새 배열을 돌려준다 — 입력은 그대로다. `[0]` 이 처음 여는 파일이다. */
export function orderPackFiles<T extends { path: string }>(files: readonly T[]): T[] {
  return [...files].sort((a, b) => {
    const group = groupOf(a.path) - groupOf(b.path)
    if (group !== 0) return group
    if (a.path < b.path) return -1
    if (a.path > b.path) return 1
    return 0
  })
}

/** `.claude/rules/architecture.md` → `{ dir: '.claude/rules/', name: 'architecture.md' }` · `/` 가 없으면 `dir` 은 `''`. 둘을 이으면 원래 경로다. */
export function splitPackPath(path: string): { dir: string; name: string } {
  const at = path.lastIndexOf('/')
  if (at === -1) return { dir: '', name: path }
  return { dir: path.slice(0, at + 1), name: path.slice(at + 1) }
}
