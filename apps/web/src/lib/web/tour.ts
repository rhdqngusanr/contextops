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

export type TourStop = {
  /** `PROJECT_SCREENS` 의 `path` */
  readonly path: string
  /** 그 화면에서 볼 것 — 한 문장. 배너와 랜딩 캡처 밑에 그대로 나간다. */
  readonly see: string
}

export const DEMO_TOUR = {
  title: '3분이면 됩니다',
  lead: '샘플 팀 Paylab 은 결제 서비스를 만드는 가상의 팀입니다. 아래 네 화면을 차례로 보세요 — 전부 실제로 도는 화면입니다.',
  stops: [
    {
      path: 'review',
      see: 'AI 가 찾은 충돌 3건이 카드로 서 있습니다. 문서끼리, 문서와 코드가 다르게 말하는 자리를 질문으로 올렸고, 결정 버튼은 사람 몫입니다.',
    },
    {
      path: 'packs',
      see: '발행된 CLAUDE.md 를 열어 아무 줄이나 누르면, 그 줄이 어느 문서 몇 절·어느 코드 몇 줄에서 왔는지 보입니다.',
    },
    {
      path: 'roadmap',
      see: '마일스톤이 「근거 n / 3」으로 채워집니다. 개발자의 AI 가 보고한 파일 경로가 근거이고, 완료 확인은 사람이 합니다.',
    },
    {
      path: 'sync',
      see: '기기 14대가 어느 버전을 받았는지 보입니다. 같은 버전은 같은 해시라 「적용됐다」가 그대로 검증됩니다.',
    },
  ],
} as const satisfies { title: string; lead: string; stops: readonly TourStop[] }

/** 지금 보는 화면이 코스의 몇째 걸음인가 (0부터). 코스 밖 화면이면 -1. */
export function tourIndexOf(pathname: string): number {
  return DEMO_TOUR.stops.findIndex((s) => new RegExp(`/${s.path}(/|$)`).test(pathname))
}
