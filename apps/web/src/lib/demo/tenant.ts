// =====================================================================
//  🔴 **게스트 데모 테넌트의 정본 하나** (SPEC §9 「게스트 데모」 · §10.3)
//
//    `/demo` → 세션 쿠키로 `demo` 팀 read-only + `/demo/ai-once` 호출 가능.
//    데모 테넌트는 production DB 의 **별도 team_id** 이고, 시드 스크립트로 매일 03:00 리셋.
//
//  ★ 왜 파일 하나인가 — 이 이름들을 읽는 자리가 셋이다: 세션을 내주는 라우트 ·
//    데모를 심는 스크립트 · 화면 위의 배너. 각자 적으면 **배너가 말하는 팀과 실제로
//    들어가는 팀이 갈린다** — 그건 데모에서 제일 나쁜 종류의 거짓말이다.
//
//  🔴 **여기엔 import 가 없다.** 서버 라우트도 클라이언트 배너도 같이 읽어야 해서
//     DB·스키마를 끌어오면 안 된다. 값만 산다.
//
//  ⚠ 테넌트가 **무엇을 담고 있나**(팀원·기기·보고·제안)는 여기가 아니라
//    `fixtures/seed/demo.json` 이다. 여기는 「어느 팀인가」뿐이다 —
//    둘을 합치면 화면이 픽스처를 import 하게 되고, 그러면 데모 데이터가 배포 번들에 실린다.
// =====================================================================

/**
 * 🔴 데모 게스트의 `sub` — 세션 JWT 의 subject 이자 `users.auth_subject` 다.
 *
 * ★ 왜 sub 로 가르나 — 게스트인지 아닌지를 **토큰 안의 한 값**으로 정하면
 *   판정하는 자리가 하나다. 별도의 플래그 claim 을 두면 「플래그는 있는데 sub 는 남의 것」
 *   같은 조합이 생기고, 그 조합을 누가 검사하는지가 흐려진다.
 * ⚠ Supabase 가 주는 sub 는 uuid 다. 이 문자열은 uuid 가 아니라서 **진짜 로그인과
 *   절대 겹치지 않는다** — 겹치면 로그인한 사람이 게스트로 강등된다.
 * ⚠ 이 sub 의 `users` 행은 **시드가 만든다.** 세션 라우트는 만들지 않는다 —
 *   만들면 데모를 안 심은 배포에서도 아무 데도 소속되지 않은 유령 게스트가 생긴다.
 */
export const DEMO_GUEST_SUBJECT = 'contextops-demo-guest'

/**
 * 게스트 세션의 수명(초) — **하루** (INBOX H2 · 2026-09-10). 예전 2시간은 심사위원이 오후에 열어 둔 탭을 저녁에
 * 다시 보면 모든 화면이 「로그인이 필요합니다」였다. 하루면 데모 리셋(03:00 KST) 주기와 같고, 만료돼도
 * `NeedsLogin` 이 [샘플 팀으로 둘러보기] 를 같이 내므로 한 번 눌러 돌아온다. 하루를 넘기지 않는다 —
 * 리셋 뒤의 팀은 다른 행이라 옛 세션의 멤버십이 없다.
 */
export const DEMO_SESSION_TTL_SEC = 60 * 60 * 24

/**
 * 데모 팀·프로젝트의 이름과 주소.
 *
 * ⚠ 데이터는 **paylab 픽스처**다 (SPEC §10.1). `DESIGN_BRIEF` §4 의 「재미난사람들」은
 *   목업 문구이고, 정본 픽스처는 paylab 이라고 이미 정해 두었다
 *   (`docs/feedback/INBOX.md` 「픽스처 서사는 「결정 대기」가 아니다」).
 *   **배너는 이 이름을 읽는다** — 목업 문구를 화면에 적으면 들어간 팀과 다른 이름이 뜬다.
 */
export const DEMO_TENANT = {
  teamSlug: 'demo',
  teamName: 'Paylab (샘플 팀)',
  projectSlug: 'paylab-api',
  projectName: 'paylab-api',
  /** 데모를 소유한 사람의 `sub`. 게스트가 아니라 **시드가 쓰는 owner** 다. */
  ownerSubject: 'contextops-demo-owner',
  /**
   * 그 사람의 **이름**. ⚠ 화면에 나가는 것은 sub 가 아니라 이 값이다 —
   * 「누가 발행했나」·「누가 결정했나」 칸이 uuid → 이름으로 넓어지는 중이라
   * (FINDINGS 113·116), 이름이 없으면 데모가 `contextops-demo-owner` 를 사람으로 그린다.
   */
  ownerName: '팀장 한지우',
  /**
   * 매일 이 시각(**KST**)에 리셋한다 — `GET /cron/demo-reset` 을 Vercel Cron 이 부른다.
   * 배너가 이 문자열을 읽는다. ⚠ Cron 표기(`apps/web/vercel.json`)는 UTC 라 여기와 그
   * 파일이 **같은 시각**인지 `test/demo-reset.test.ts` 가 아래 offset 으로 셈해 잰다.
   */
  resetAt: '03:00',
  /** `resetAt` 의 시간대가 UTC 에서 몇 시간 앞서나 (Asia/Seoul · 서머타임 없음). */
  resetUtcOffsetHours: 9,
} as const

/**
 * 게스트가 들어가서 처음 보는 화면. `/demo` 가 여기로 보낸다.
 * 2026-09-10: Context(표 30줄)가 아니라 **3분 코스의 첫 걸음**(정리 — AI 가 찾은 충돌)이다. 정본은 `lib/web/tour.ts`.
 */
export const DEMO_ENTRY_PATH =
  //  ⚠ 글자로 적는다 — 이 파일은 import 가 없다(머리말). `test/web-demo-tour.test.ts` 가 `DEMO_TOUR.stops[0].path` 와 같은지 잰다.
  `/t/${DEMO_TENANT.teamSlug}/p/${DEMO_TENANT.projectSlug}/review`

/**
 * 배너 문구 (DESIGN_BRIEF §4 「게스트 데모 배너」).
 * ★ 왜 함수인가 — 팀 이름이 여기 한 곳에서만 문장에 들어가게 하려고. 화면이
 *   `샘플 팀 "${name}"` 을 각자 조립하면 화면마다 따옴표와 조사가 갈린다.
 */
export function demoBannerText(): string {
  return `샘플 팀 "${DEMO_TENANT.teamName}"을 둘러보는 중입니다 · 읽기 전용 · 매일 ${DEMO_TENANT.resetAt} 초기화`
}
