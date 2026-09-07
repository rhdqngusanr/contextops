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


// =====================================================================
//  팔레트가 그리는 **줄** — 화면과 프로젝트 두 묶음 (FINDINGS 157)
//
//  ★ 왜 지금 이 모양이 생겼나 — 94바퀴까지 팔레트의 줄은 **한 종류**(화면)뿐이어서
//    `ProjectScreen` 을 그대로 그렸다. 둘째 종류(프로젝트 전환)가 온 **지금**이
//    묶는 자리다 — 셋째가 온 뒤가 아니다. 팔레트는 `PaletteEntry` 하나만 알고,
//    「무엇이 줄이 되나」는 이 파일의 두 빌더가 정한다.
//
//  🔴 **묶음을 하나 더하려면**: ① `PaletteGroup` 에 이름 ② `PALETTE_GROUP_TITLES` 에 제목
//     (`Record` 라 빠뜨리면 타입이 먼저 막는다) ③ 줄을 만드는 빌더 함수 하나
//     ④ `CommandPalette` 가 그 빌더를 부른다. 팔레트의 **그리는 부분은 안 고친다.**
//
//  ⛔ 목록을 손으로 지어내지 마라 — 프로젝트 줄은 **서버가 준 `GET /teams` 응답만**
//    그린다 (그 문은 본인이 속한 팀만 낸다). 지어내면 남의 팀이 보이거나
//    없는 곳으로 가는 줄이 생긴다.
// =====================================================================

export type PaletteGroup = 'screen' | 'project'

/** 묶음의 제목. 차례는 아래 `PALETTE_GROUP_ORDER` 가 정한다. */
export const PALETTE_GROUP_TITLES: Record<PaletteGroup, string> = {
  screen: '화면',
  project: '프로젝트',
}

/** 그리는 차례 — 지금 프로젝트 안에 있는 사람이라 가까운 것(화면)이 먼저다. */
export const PALETTE_GROUP_ORDER: readonly PaletteGroup[] = ['screen', 'project']

export type PaletteEntry = {
  /** React 의 `key` 이자 시험의 이름. 묶음이 달라도 겹치지 않는다. */
  readonly key: string
  readonly group: PaletteGroup
  readonly label: string
  readonly href: string
  /** 오른쪽에 붙는 짧은 말 — 화면은 경로, 프로젝트는 `팀/프로젝트`. 검색에도 걸린다. */
  readonly hint: string
  /** 라벨도 `hint` 도 아닌 낱말로 찾을 수 있게. */
  readonly keywords: readonly string[]
  /** 지금 보고 있는 자리인가 (「지금 여기」). */
  readonly here: boolean
}

/** 화면 묶음 — `PROJECT_SCREENS` 표를 그대로 줄로 바꿈. */
export function screenEntries(
  base: string,
  pathname: string,
  screens: readonly ProjectScreen[] = PROJECT_SCREENS,
): PaletteEntry[] {
  return screens.map((screen) => ({
    key: `screen:${screen.path}`,
    group: 'screen' as const,
    label: screen.label,
    href: screenHref(base, screen),
    hint: screen.path,
    keywords: screen.keywords,
    here: isActiveScreen(screen, pathname),
  }))
}

/** `GET /teams` 응답에서 **이 팔레트가 쓰는 칸만**. 응답 타입을 import 하지 않는다 — 의존 방향. */
export type TeamLike = {
  readonly slug: string
  readonly name: string
  readonly projects: readonly { readonly slug: string; readonly name: string }[]
}

/**
 * 지금 주소가 가리키는 화면. 모르면 `undefined` 다.
 * ★ 프로젝트를 옮길 때 **보던 화면을 그대로 들고 간다** — Sync 를 보다 옆
 *   프로젝트로 옮기는 사람은 거기서도 Sync 를 보려는 것이다.
 */
export function currentScreen(
  pathname: string,
  screens: readonly ProjectScreen[] = PROJECT_SCREENS,
): ProjectScreen | undefined {
  return screens.find((s) => isActiveScreen(s, pathname))
}

/**
 * 프로젝트 묶음 — **서버가 준 팀 목록만** 줄로 바꿈 (FINDINGS 157).
 *
 * ⚠ 주소는 slug 다 (SPEC §9). uuid 를 쓰지 않는다 — 화면의 주소와 같은 말이어야
 *   사람이 주소창에서 본 것과 팔레트가 말하는 것이 같다.
 */
export function projectEntries(
  teams: readonly TeamLike[],
  here: { team: string; project: string; pathname: string },
  screens: readonly ProjectScreen[] = PROJECT_SCREENS,
): PaletteEntry[] {
  //  ★ 어느 화면으로 내려놓나 — 보던 화면, 모르면 표의 첫 줄이다.
  //    ⚠ 표 밖의 경로를 지어내면 404 로 간다.
  const landing = currentScreen(here.pathname, screens) ?? screens[0]
  const entries: PaletteEntry[] = []
  for (const team of teams) {
    for (const project of team.projects) {
      const base = `/t/${team.slug}/p/${project.slug}`
      entries.push({
        key: `project:${team.slug}/${project.slug}`,
        group: 'project',
        label: project.name,
        href: landing ? screenHref(base, landing) : base,
        hint: `${team.slug}/${project.slug}`,
        //  팀 이름으로도 찾는다 — 사람은 「그 팀의 그것」으로 기억한다.
        keywords: [team.name, project.slug, team.slug],
        here: team.slug === here.team && project.slug === here.project,
      })
    }
  }
  return entries
}

/**
 * 팔레트의 **검색** — 라벨·오른쪽 짧은 말(`hint`)·`keywords` 중 하나에 걸리면 나온다.
 *
 * ⚠ 여기서 순위를 매기지 않는다. 묶음의 차례(화면 → 프로젝트)가 곧 목록의 차례이고,
 * 그것이 일의 차례다. 목록이 길어지면 그때 정한다.
 */
export function matchEntries(
  query: string,
  entries: readonly PaletteEntry[],
): PaletteEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...entries]
  return entries.filter((e) =>
    [e.label, e.hint, ...e.keywords].some((word) => word.toLowerCase().includes(q)))
}


// =====================================================================
//  빈 상태의 **다음 행동** — 화면마다 「어디로 가면 되나」의 정본 표 (FINDINGS 133)
//
//  ★ 왜 표인가 — 빈 상태는 첫 사용자가 제일 먼저 보는 화면이다. 문구와 목적지를
//    화면마다 손으로 적으면 **한 화면만 갈 곳이 없는 채로 남고**, 그 화면은 비어 있을
//    뿐 멀쩡해 보인다. 여기 한 줄이면 `ScreenEmpty` 가 저절로 그린다.
//
//  🔴 **빈 자리를 하나 더하려면**: ① `EmptySlot` 에 이름(`화면.무엇`) ② 이 표에 한 줄
//     (`Record` 라 빠뜨리면 타입이 먼저 막는다) ③ 화면에서 `<ScreenEmpty slot="…" base={base} />`
//     ④ 문구가 새로우면 `docs/DESIGN_BRIEF.md` §5. 시험(`test/web-empty-states.test.ts`)이
//     ①만 하면 저절로 나오는지와 **목적지가 실제로 있는 화면인지**를 센다.
//
//  ⚠ 목적지는 `PROJECT_SCREENS` 의 `path` 여야 한다 — 주소를 손으로 지으면 404 로 가는
//    버튼이 생기고, 그건 갈 곳이 없는 것보다 나쁘다.
//  ⚠ `accent` 는 **화면당 주요 액션 하나**다 (DESIGN_BRIEF §3). 그 화면에 이미 accent 가
//    있으면(예: Context 의 [발행하기]) `plain` 이다.
//  ⚠ 갈 곳이 화면 밖(CLI·같은 화면의 다른 칸)이면 버튼을 만들지 말고 `noNext` 에 이유를
//    적는다 — 타입이 둘 중 하나를 **반드시** 쓰게 한다. 「아무 데도 안 가는 버튼」 금지.
// =====================================================================

export type EmptySlot =
  | 'import.jobs'
  | 'context.items'
  | 'context.versions'
  | 'review.cards'
  | 'proposals.list'
  | 'packs.versions'
  | 'pack.files'
  | 'roadmap.versions'
  | 'roadmap.milestones'
  | 'sync.devices'

export type EmptyNext = {
  readonly label: string
  /** `PROJECT_SCREENS` 의 `path`. 시험이 실재를 센다. */
  readonly to: string
  /** `accent` 는 그 화면에 다른 주요 액션이 없을 때만. */
  readonly tone: 'accent' | 'plain'
}

export type EmptyPlace =
  | { readonly message: string; readonly next: EmptyNext; readonly noNext?: undefined }
  //  버튼이 없는 자리는 **왜 없는지**를 적는다 — 다음 사람이 「빠뜨린 것」과 구별한다.
  | { readonly message: string; readonly next?: undefined; readonly noNext: string }

export const EMPTY_PLACES: Record<EmptySlot, EmptyPlace> = {
  //  ⚠ 이 칸이 세는 것은 **문서가 아니라 job** 이다 (FINDINGS 159).
  //     데모에는 문서가 2건 있는데도 「아직 올린 문서가 없습니다」라고 말해서,
  //     화면이 사실이 아닌 것을 말하고 있었다. 이름도 `import.jobs` 로 바꿈 — 자리 이름이
  //     세는 것과 다르면 다음 사람이 같은 문구를 다시 쓴다.
  'import.jobs': {
    message: '구조화 중인 문서가 없습니다. 왼쪽에 문서를 붙여넣고 [구조화하기] 를 눌러 보세요.',
    noNext: '다음 행동이 같은 화면 왼쪽 칸이다 — 옮길 곳이 없다.',
  },
  'context.items': {
    message: '아직 항목이 없습니다. 가져오기에서 문서를 올리거나 질문에 답해보세요.',
    next: { label: '가져오기로 이동', to: 'import', tone: 'plain' },
  },
  'context.versions': {
    message: '아직 발행된 버전이 없습니다. 항목을 확인하고 [발행하기]를 눌러보세요.',
    noNext: '[발행하기] 가 같은 화면 머리에 있다 — 같은 걸음을 두 번 그리지 않는다.',
  },
  'review.cards': {
    message: '결정할 것이 없습니다. 발행할 준비가 됐어요.',
    next: { label: 'Context로 이동', to: 'context', tone: 'accent' },
  },
  'proposals.list': {
    message: '아직 올라온 제안이 없습니다. Claude Code에서 /contextops:propose 를 실행하면 여기에 쌓입니다.',
    //  ⚠ 제안을 만드는 곳은 CLI 다 — 화면에 「만들기」 버튼을 두면 거짓말이다.
    //    갈 수 있는 곳은 지금 항목을 보는 Context 이고, 그래서 `plain` 이다.
    next: { label: 'Context 항목 보기', to: 'context', tone: 'plain' },
  },
  'packs.versions': {
    message: '아직 발행된 버전이 없습니다. Context 화면에서 [발행하기]를 눌러보세요.',
    next: { label: 'Context로 이동', to: 'context', tone: 'accent' },
  },
  'pack.files': {
    message: '이 Pack에는 파일이 없습니다.',
    next: { label: 'Pack 목록으로', to: 'packs', tone: 'plain' },
  },
  'roadmap.versions': {
    message: '아직 발행된 버전이 없습니다. 로드맵은 발행된 Pack의 마일스톤에서 옵니다.',
    next: { label: 'Context로 이동', to: 'context', tone: 'accent' },
  },
  'roadmap.milestones': {
    message: '공식 Pack에 마일스톤이 없습니다. roadmap 타입 항목을 만들면 여기 행이 생깁니다.',
    next: { label: 'Context로 이동', to: 'context', tone: 'plain' },
  },
  //  ⚠ 「웹에 그 문이 없다」였다 (FINDINGS 36). **이제 있다** — 같은 화면 머리의
  //     [기기 추가] 가 토큰을 발급하고 `contextops setup` 한 줄을 통째로 준다.
  'sync.devices': {
    message: '아직 등록된 기기가 없습니다. 위 [기기 추가] 로 토큰을 발급하고, 그 저장소에서 붙여넣은 한 줄을 실행하세요.',
    noNext: '다음 행동이 같은 화면 머리의 [기기 추가] 다 — 같은 걸음을 두 번 그리지 않는다.',
  },
}

/** 빈 상태의 버튼이 갈 주소. 목적지는 표의 `to` 이고 주소는 여기서만 지어진다. */
export function emptyNextHref(base: string, next: EmptyNext): string {
  return `${base}/${next.to}`
}
