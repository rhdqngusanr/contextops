// =====================================================================
//  apps/web/src/lib/web/submission.ts — 제출 정체의 정본 (2026-09-12 에 랜딩에서 옮겨 옴)
//
//  ★ 왜 옮겼나 — 랜딩의 영어 한 벌(`components/landing.en.ts`)이 이 값을 읽는데, 그 파일이
//    `landing.tsx` 에서 값을 들여오면 **실행시 순환 import** 가 된다 (landing → landing.en → landing).
//    값이 언어와 무관하므로 문구 파일 밖으로 뺐다. 뜻은 그대로다.
// =====================================================================

/**
 * 🔴 제출 정체 — **공개 저장소 URL 과 제출 팀명의 정본은 여기 하나다** (INBOX 2026-09-06 · FINDINGS 122).
 *
 * 랜딩 푸터(`LANDING_FOOT`)는 이 값을 읽고, README 머리 · `docs/SUBMISSION.md` 의 🙋 표 는 마크다운이라
 * import 를 못 하므로 **글자 그대로** 적되 `test/readme.test.ts` 가 세 곳이 같은 문자열인지 센다.
 * 값을 바꿀 때는 여기 한 줄 → 시험이 빨개지는 문서를 따라 고친다. 문서에서 먼저 고치면 갈린다.
 *
 * ⚠ 팀명은 사람이 적어 준 그대로다 — 띄어쓰기를 넣거나 빼지 마라.
 * ⚠ 아직 없는 값(production URL · 영상)은 여기 두지 않는다 — 없는 것을 있는 것처럼 적지 않는다.
 */
export const SUBMISSION_IDENTITY = {
  team: '퇴직했는데저좀이직시켜주세요',
  repoUrl: 'https://github.com/rhdqngusanr/contextops',
  /**
   * `claude plugin marketplace add` 가 받는 이름 — **저장소 URL 에서 파생시킨다** (FINDINGS 140).
   * 손으로 또 적으면 저장소를 옮길 때 한쪽만 바뀌고, 그러면 설치 첫 줄이 조용히 실패한다.
   * ⚠ 이 이름이 먹히려면 저장소 뿌리에 `.claude-plugin/marketplace.json` 이 있어야 한다
   *   (`plugins[0].source` → `./plugin/contextops`). 없으면 「목록을 못 찾는다」로 끝난다.
   */
  get marketplaceRef(): string {
    return new URL(this.repoUrl).pathname.slice(1)
  },
  /** Known limitations 는 앱에 페이지를 또 만들지 않는다 — 같은 문서가 두 곳이 된다. 저장소의 그 파일로 건다. */
  limitsPath: 'docs/KNOWN_LIMITATIONS.md',
} as const
