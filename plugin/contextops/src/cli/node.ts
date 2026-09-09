// =====================================================================
//  이 CLI 와 훅이 도는 Node 의 최소 메이저 — **숫자의 정본은 저장소의 `.nvmrc`** 다.
//
//  ★ 왜 여기 다시 적나 — 번들(`bin/contextops-cli.mjs`)은 사용자 기계에서 `.nvmrc` 없이 돈다.
//    그래서 값을 들고 다니되, `test/node-version.test.ts` 가 `.nvmrc` 와 같은지 잰다(갈리면 빨개진다).
//    esbuild 의 `target` 도 같은 값이다 (`scripts/build.ts`) — 낮은 Node 에서는 문법부터 죽는다.
//
//  ⚠ 여기서 죽이지 않는다. 낮은 Node 에서도 무엇이 문제인지 **한 줄로 말하고** 진행한다 —
//    설치 안내(README·랜딩 `INSTALL_STEPS.requires`)가 먼저 말하고, 여기는 두 번째 방어선이다.
// =====================================================================

export const MIN_NODE_MAJOR = 22

/** `process.versions.node`(예: `20.11.1`)가 최소 메이저보다 낮으면 경고 문장을, 아니면 `undefined` 를 낸다. */
export function nodeVersionWarning(version: string): string | undefined {
  //  ⚠ 숫자로 시작하지 않는 문자열(빈 값 포함)에는 거짓 경고를 내지 않는다.
  const major = Number(/^(\d+)/.exec(version)?.[1] ?? Number.NaN)
  if (!Number.isFinite(major) || major >= MIN_NODE_MAJOR) return undefined
  return `⚠ Node ${version} 에서 돌고 있다 — ContextOps 의 훅과 CLI 는 Node ${MIN_NODE_MAJOR} 이상이 필요하다 (node -v).`
}
