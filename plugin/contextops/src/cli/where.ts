// =====================================================================
//  CLI 가 「웹의 어디서 보나」를 말하는 자리 — **한 곳** (docs/SPEC.md §8.3 · §9)
//
//  🔴 CLI 는 웹 화면의 주소를 조립하지 않는다. `project.json` 에는 uuid 만 있고
//    (`ProjectConfig` · SPEC §8.2) 웹의 주소는 **slug** 다 (`/t/{team}/p/{project}/…` · §9).
//    uuid 로 주소를 지으면 그럴듯한 줄이 찍히지만 누르면 404 다 — FINDINGS 115 가
//    그것이었고, 같은 줄이 propose · upload-draft **두 곳**에 있었다.
//    그래서 찍는 것은 「origin + 탭 이름」까지다. origin 은 설정에 있는 진짜 값이고,
//    탭은 사람이 로그인한 뒤 프로젝트 안에서 누르는 이름이다.
//
//  ★ 주소를 찍게 되는 날 — 서버가 `GET /projects/{id}` 로 slug 를 내주거나 설정에
//    slug 가 생기면, **이 파일만** 고친다. 명령 쪽은 이 함수를 읽기만 한다.
//    (test/where.test.ts 가 「origin 뒤에 경로를 붙이는 곳은 api.ts 하나」를 센다)
//
//  ⚠ 탭 이름은 웹의 탭 표(`apps/web …/p/[project]/layout.tsx` 의 `TABS`)가 보여 주는
//    글자 그대로다. 플러그인은 웹을 import 하지 못하므로(의존 방향 `schema ← compiler ←
//    web/plugin`) 여기 적고, test/where.test.ts 가 그 파일에서 같은 label 이 있는지 잰다.
//    새 탭을 가리키려면: ① 웹의 `TABS` 에 있는 label 인지 확인 ② 아래 표에 한 줄.
// =====================================================================

/** CLI 가 가리키는 웹 탭. 값은 웹이 보여 주는 label 그대로다. */
export const WEB_TABS = {
  context: 'Context',
  proposals: '제안',
} as const

export type WebTab = keyof typeof WEB_TABS

/**
 * 「웹의 어디서 보나」 한 줄. 경로 없이 **origin 과 탭 이름**만 말한다.
 * `what` 은 그 탭에서 무엇을 찾을지(제안 제목 · 항목 수 같은 것) — 사람이 목록에서 고르는 단서다.
 */
export function whereOnWeb(origin: string, tab: WebTab, what?: string): string {
  const tail = what === undefined ? '' : ` — ${what}`
  return `  → 웹 ${origin} 에 로그인해 이 프로젝트의 「${WEB_TABS[tab]}」 탭에서 볼 수 있다${tail}`
}
