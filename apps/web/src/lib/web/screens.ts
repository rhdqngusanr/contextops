// =====================================================================
//  프로젝트 화면의 **정본 표** — 왼쪽 내비와 명령 팔레트(⌘K)가 같은 이것을 읽는다
//
//  ★ 왜 이 파일이 생겼나 (FINDINGS 132) — 이 표는 원래 `app/t/[team]/p/[project]/layout.tsx`
//    안에 있었다. 팔레트가 「갈 수 있는 화면」을 알아야 하는데, 거기 있으면 팔레트가
//    화면 레이아웃을 import 하거나 **목록을 한 벌 더 적어야** 했다. 목록이 둘이 되는
//    순간 화면 하나가 한쪽에만 생기고, 그 화면은 팔레트에서 영원히 안 보인다.
//
//  🔴 **화면을 하나 더하려면 여기 한 줄이다.** 내비도 팔레트도 안 고친다.
//     ① 이 표에 한 줄 (`path` · `label` · `match` · `keywords`)
//     ② `app/t/[team]/p/[project]/<path>/page.tsx`
//     ③ `docs/SPEC.md` §9 화면 표 · `docs/DESIGN_BRIEF.md` 의 그 화면 절
//     시험(`test/web-command-palette.test.ts`)이 ①만 하면 팔레트에 저절로 나오는지를 센다.
//
//  ⚠ 아직 없는 화면을 표에 적지 마라 — 404 로 가는 줄은 내비에서도 팔레트에서도
//    「고장」으로 읽힌다. 화면을 만들 때 같이 한 줄 더한다 (`docs/PLAN.md` P3·P4 행).
// =====================================================================

export type ProjectScreen = {
  /** 프로젝트 밑의 경로 조각. `href` 는 `screenHref()` 가 만든다 — 화면마다 적지 않는다. */
  readonly path: string
  /** 내비의 탭 이름이자 팔레트의 줄 이름. **한 낱말이 두 곳에 있으면 갈라진다.** */
  readonly label: string
  /** 지금 이 화면인가 (내비의 `aria-current` · 팔레트의 「지금 여기」). */
  readonly match: RegExp
  /**
   * 검색어. 라벨은 자동으로 걸리니 **라벨에 없는 낱말만** 적는다 —
   * 영문 이름(`import`)·다른 말로 부르는 이름(`문서`)처럼 사람이 실제로 치는 것.
   */
  readonly keywords: readonly string[]
}

/** 이 프로젝트에서 **지금 열 수 있는** 화면. 순서가 곧 왼쪽 차례이자 팔레트의 차례다. */
export const PROJECT_SCREENS: readonly ProjectScreen[] = [
  //  ⚠ 차례가 일의 차례다 — 문서를 넣는 화면이 먼저고, 그 결과를 보는 화면이 뒤다.
  { path: 'import', label: '가져오기', match: /\/import$/, keywords: ['import', '문서', '업로드'] },
  //  ⚠ 정리가 Context 앞이다 — 결정을 끝낸 것만 발행으로 간다 (SPEC §9 화면 4 → 5).
  { path: 'review', label: '정리', match: /\/review$/, keywords: ['review', '충돌', '질문'] },
  { path: 'context', label: 'Context', match: /\/context$/, keywords: ['항목', 'item', '컨텍스트'] },
  //  ⚠ 제안은 Context 뒤다 — 승인된 제안은 **발행 트랜잭션 안에서** 항목이 되므로
  //    (SPEC §2.1 2단계), 사람은 지금 항목을 본 다음에 「무엇이 바뀌나」를 읽는다.
  { path: 'proposals', label: '제안', match: /\/proposals(\/|$)/, keywords: ['proposal', '승인', '거절'] },
  //  ⚠ Pack Explorer 는 버전 하나를 가리켜야 열린다. 목록에서는 「최신」으로 보낸다 —
  //    `latest` 는 semver 가 아니라 화면이 versions 를 읽어 고르는 자리다.
  { path: 'packs', label: 'Pack Explorer', match: /\/packs(\/|$)/, keywords: ['pack', '발행', '버전', 'claude.md'] },
  //  ⚠ Roadmap 은 **발행된 Pack 이 있어야** 행이 생긴다 (마일스톤의 정본이 Manifest 다).
  //    그래서 Pack Explorer 뒤다 — 차례가 일의 차례라는 위 규칙 그대로다.
  { path: 'roadmap', label: 'Roadmap', match: /\/roadmap$/, keywords: ['로드맵', '마일스톤', 'milestone'] },
  //  ⚠ Sync 가 마지막이다 — 발행한 Pack 이 **각 기기에 실제로 닿았나**를 보는 자리라
  //    일의 차례에서 제일 끝이다 (발행 → 로드맵이 움직임 → 기기가 받아 감).
  { path: 'sync', label: 'Sync', match: /\/sync$/, keywords: ['동기화', '기기', 'device'] },
]

/** `/t/{team}/p/{project}` + 화면 한 줄 → 실제 주소. 링크를 화면마다 적지 않는다. */
export function screenHref(base: string, screen: ProjectScreen): string {
  return `${base}/${screen.path}`
}

/** 지금 보고 있는 화면인가. 내비의 `aria-current` 와 팔레트의 「지금 여기」가 같은 판정을 쓴다. */
export function isActiveScreen(screen: ProjectScreen, pathname: string): boolean {
  return screen.match.test(pathname)
}

/**
 * 팔레트의 **검색** — 라벨·경로·`keywords` 중 하나에 걸리면 나온다.
 *
 * ⚠ 여기서 순위를 매기지 않는다. 일곱 줄짜리 목록에서 점수 매기기는 표의 차례
 * (= 일의 차례)를 흐트러뜨릴 뿐이다. 목록이 길어지면 그때 정한다.
 */
export function matchScreens(
  query: string,
  screens: readonly ProjectScreen[] = PROJECT_SCREENS,
): ProjectScreen[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...screens]
  return screens.filter((s) =>
    [s.label, s.path, ...s.keywords].some((word) => word.toLowerCase().includes(q)))
}
