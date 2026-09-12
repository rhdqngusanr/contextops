// =====================================================================
//  심사위원 3분 코스 — 게스트가 **어느 화면에서 무엇을 봐야 하는지**의 정본 (2026-09-10)
//
//  ★ 왜 생겼나 — 사용자: 「데모 예시들이 하나도 안 와닿고, 심사위원 입장에서 3분 만에 이해 못 할 것 같다」.
//    게스트는 [샘플 팀으로 둘러보기]를 누르면 결제 규칙 30줄짜리 표에 떨어졌고, 무엇을 봐야 하는지 아무도
//    말해 주지 않았다. 이 표가 그 말을 한다 — 게스트 배너(`components/demo-banner.tsx`)가 네 걸음을 띄우고,
//    랜딩의 「실제로 도는 화면」 절이 같은 네 걸음을 캡처 밑에 적는다. `/demo` 도 첫 걸음으로 보낸다(`DEMO_ENTRY_PATH`).
//
//  🔴 **걸음은 `path` 로만 화면을 가리킨다** — 라벨·주소는 `screens.ts` 의 `PROJECT_SCREENS` 가 정한다 (두 곳이 되면 갈린다).
//  🔴 **숫자는 씨앗의 사실이다** — 충돌 3건(`RECORDED_CONFLICTS`) · 기기 14대(`fixtures/seed/demo.json`) · 근거 n / 3
//     (PL-M1 의 `done_when`). `test/web-demo-tour.test.ts` 가 씨앗과 대조한다 — 씨앗이 바뀌면 여기가 먼저 빨개진다.
//  ⚠ 걸음을 더하려면 여기 한 줄 + (랜딩에 캡처를 싣고 싶으면) `e2e/plan.ts` 의 `PUBLISHED` 한 줄.
// =====================================================================

import { localized } from '../i18n/localized'

export type TourStop = {
  /** `PROJECT_SCREENS` 의 `path` */
  readonly path: string
  /**
   * 캡처 카드의 **제목** — 랜딩이 그림 밑에 굵게 그리고, 관통이 그림의 대체텍스트로 쓴다.
   *
   * 🔴 정본이 여기로 왔다 (2026-09-12). 예전엔 `e2e/plan.ts` 의 `PUBLISHED` 에 따로 적혀
   *    있었고, 그래서 같은 문장이 두 곳에 살았다 — 시험이 「차례가 같은가」만 재고 있어서
   *    한쪽만 고쳐도 조용히 지나갔다. 이제 `plan.ts` 가 이 값을 **읽는다**.
   * ⚠ 전부 **명사구**로 끝난다 — 설명은 그 밑의 `see`(존댓말)가 맡는다. 「…이다/…한다」로
   *   끝나면 같은 카드 안에서 말투가 두 벌이 된다 (2026-09-11).
   */
  readonly title: string
  /** 그 화면에서 볼 것 — 한 문장. 배너와 랜딩 캡처 밑에 그대로 나간다. */
  readonly see: string
}

export const DEMO_TOUR = {
  title: '3분이면 됩니다',
  lead: '샘플 팀 Paylab 은 결제 서비스를 만드는 가상의 팀입니다. 아래 네 화면을 차례로 보세요 — 전부 실제로 도는 화면입니다.',
  stops: [
    {
      path: 'review',
      title: '정리 화면 — AI 가 찾은 충돌 카드와 사람의 결정 버튼',
      see: 'AI 가 찾은 충돌 3건이 카드로 서 있습니다. 문서끼리, 문서와 코드가 다르게 말하는 자리를 질문으로 올렸고, 결정 버튼은 사람 몫입니다.',
    },
    {
      path: 'packs',
      title: 'Pack Explorer — 발행된 CLAUDE.md 와 각 줄의 출처',
      //  기본 보기가 문단(항목 블록)이라 「줄」이 아니다 (2026-09-11).
      see: '발행된 CLAUDE.md 를 열어 아무 문단이나 누르면, 그 문단이 어느 문서 몇 절·어느 코드 몇 줄에서 왔는지 보입니다.',
    },
    {
      path: 'roadmap',
      title: 'Roadmap — 근거로 채워지는 마일스톤과 완료 확인',
      //  「근거 n / 3」의 n 은 변수 글자였다 — 비개발자는 「근거 엔」으로 읽는다 (2026-09-11). 3 은 씨앗의 완료 조건 수.
      see: '마일스톤마다 완료 조건 3개 중 몇 개에 근거가 붙었는지 보입니다. 근거는 개발자의 AI 가 보고한 파일 경로이고, 완료 확인은 사람이 합니다.',
    },
    {
      path: 'sync',
      title: 'Sync 화면 — 기기마다 받은 버전',
      see: '기기 14대가 어느 버전을 받았는지 보입니다. 받은 파일이 공식 판과 정말 같은지 서버가 한 줄씩 대조하니 「적용됨」을 믿을 수 있습니다.',
    },
  ],
} as const satisfies { title: string; lead: string; stops: readonly TourStop[] }

/**
 * 🔴 **영어 한 벌** (2026-09-12). 한국어 쪽(`DEMO_TOUR`)이 정본이고 이쪽은 같은 모양이다.
 *
 * ⚠ `path` 는 **번역하지 않는다** — 화면 주소다. `tour.test` 가 두 벌의 `path` 가 같은지 센다.
 * ⚠ 숫자(충돌 3건 · 기기 14대 · 조건 3개)는 씨앗의 사실이라 두 벌이 같은 수를 말해야 한다.
 */
export const DEMO_TOUR_EN = {
  title: 'Three minutes, four screens',
  lead: 'Paylab is a made-up team building a payments service. Walk through the four screens below in order — every one of them is the real running app.',
  stops: [
    {
      path: 'review',
      title: 'Review — the conflicts the AI found, and the buttons a person presses',
      see: 'Three conflicts the AI found are standing as cards. Where two documents, or a document and the code, say different things, it raised a question — and the decision buttons belong to a person.',
    },
    {
      path: 'packs',
      title: 'Pack Explorer — the published CLAUDE.md and where each line came from',
      see: 'Open the published CLAUDE.md, click any paragraph, and you see which document section or which lines of code it came from.',
    },
    {
      path: 'roadmap',
      title: 'Roadmap — milestones filling up with evidence, and a human sign-off',
      see: 'For each milestone you see how many of its three completion criteria have evidence attached. The evidence is a file path a developer’s AI reported, and a person confirms completion.',
    },
    {
      path: 'sync',
      title: 'Sync — which version each machine received',
      see: 'You see which version each of the 14 machines received. The server compares the files they got against the official version line by line, so “applied” is something you can trust.',
    },
  ],
} as const satisfies { title: string; lead: string; stops: readonly TourStop[] }

/** 언어별 한 벌. 화면은 `pick(TOUR, locale)` 로 읽는다. */
export const TOUR = localized<{ title: string; lead: string; stops: readonly TourStop[] }>({
  ko: DEMO_TOUR,
  en: DEMO_TOUR_EN,
})

/** 지금 보는 화면이 코스의 몇째 걸음인가 (0부터). 코스 밖 화면이면 -1. */
export function tourIndexOf(pathname: string): number {
  return DEMO_TOUR.stops.findIndex((s) => new RegExp(`/${s.path}(/|$)`).test(pathname))
}
