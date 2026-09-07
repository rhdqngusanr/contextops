import { defineConfig } from 'vitest/config'

// 전 패키지 공통 vitest 설정의 정본.
// ★ 새 패키지는 vitest.config.ts 에 한 줄만 쓴다:
//     export { default } from '../../vitest.base.js'
//   값을 패키지 쪽에 적기 시작하면 패키지마다 갈라진다.

//  🔴 훅(beforeEach · beforeAll · afterEach · afterAll) 상한 — **전 패키지에 이 하나다** (FINDINGS 136).
//  ★ 왜 vitest 기본 10초가 아닌가 — `apps/web` 시험 32 파일이 저마다 훅에서 PGlite(wasm Postgres)를 새로
//    띄우고 마이그레이션 7개를 먹인다. 한가할 땐 2~3초인데, 사람이 게임을 켜 CPU 70% 인 기계에서 32 파일이
//    한꺼번에 wasm 을 띄우면 첫 훅이 17~18초가 됐고 **코드 변화 0 인데 같은 9~10 파일이 빨개졌다**
//    (72바퀴 · `docs/evidence/2026-09-06-hook-timeout/before.txt`). 거짓 빨강을 내는 게이트는 곧 꺼진다.
//  ★ 왜 30초인가 — 잰 최악(18초)의 1.7배. 「PGlite 가 안 뜬다」(영원히 안 끝남)와 「느리다」는 여전히 갈린다.
//  ★ 왜 `maxWorkers` 로 동시 기동을 줄이지 않았나 — 그건 한가할 때도 늘 느리게 만든다. 상한은 실패 판정선만
//    옮기고 정상 속도는 그대로다.
//  ⚠ 시험 파일에 `beforeEach(…, 30_000)` 처럼 자기 수치를 적지 마라 — 7 파일에 `60_000` 이 흩어져 있었고
//    이 값과 갈렸다. `apps/web/test/vitest-timeouts.test.ts` 가 「훅에 자기 상한을 준 시험 파일 0개」를 센다.
export const HOOK_TIMEOUT_MS = 30_000

//  🔴 **시험 본문** 상한 — 훅과 다른 개념이고, 이것도 **전 패키지에 이 하나다** (FINDINGS 153).
//  ★ 왜 vitest 기본 5초가 아닌가 — `plugin/contextops/test/hooks.test.ts` 가 **코드 변화 0 으로 두 번**
//    CI 를 빨갛게 했다 (90바퀴 `연결 안 된 저장소에서는 아무 일도 하지 않는다` · 92바퀴 `세션 id 를 모르면
//    보내지 않는다`). 둘 다 `Test timed out in 5000ms` 이고, 그 파일만 다시 돌리면 22/22 · 2.5초다.
//  ★ 무엇을 기다리나 (102바퀴가 쟀다 · `docs/evidence/2026-09-07-test-timeout/`) — 파일 I/O 가 아니라
//    **자식 프로세스 기동**이다. 두 시험은 `git init` 과 `node scripts/stop.mjs` 를 진짜로 띄운다
//    (번들이 아니라 Claude Code 가 `node <경로>` 로 그대로 부르는 파일이라 프로세스로 재야 한다).
//    한가할 때 그 둘은 **107~190ms**(3회) · 같은 파일 8개를 동시에 돌린 부하에서 최악 **293ms**,
//    그 파일 안 어떤 시험이든 최악 **338ms** 다. 즉 정상값은 상한 근처에 얼씬도 안 한다.
//  ★ 왜 30초인가 — 실제로 빨개진 두 번은 vitest 가 5초에 **죽여서 진짜 값을 아무도 모른다.** 잰 한가함
//    최악(190ms)의 **26배 이상**이었다는 것만 안다. 프로세스 기동은 부하에서 wasm 기동보다 더 나쁘게
//    늘어난다 — 136 이 같은 기계에서 잰 훅의 배율(2~3초 → 17~18초 · 6~9배)로는 5초를 못 넘기는데
//    넘겼다. 그래서 관측된 실패(5초)의 **6배**로 잡는다. 상한은 **실패 판정선만 옮기고 정상 속도는
//    그대로다** — 한가할 때 그 파일 전체가 2.2초이고 부하에서도 3.1초다.
//  ⚠ `HOOK_TIMEOUT_MS` 와 지금 값이 같은 것은 **우연이다.** 둘은 재는 것이 다르니(훅=PGlite 기동 ·
//    시험 본문=자식 프로세스 기동) 한쪽을 고칠 때 다른 쪽을 따라 고치지 마라.
//  ⚠ 시험 파일에 `it(…, 30_000)` 처럼 자기 수치를 적지 마라 — 136 이 훅에서 겪은 갈라짐이 그대로 온다.
//    `apps/web/test/vitest-timeouts.test.ts` 가 「시험에 자기 상한을 준 파일 0개」를 센다.
export const TEST_TIMEOUT_MS = 30_000

export default defineConfig({
  //  ★ 왜 여기에 JSX 설정이 있나 — `apps/web` 의 화면 코드는 `.tsx` 이고 tsconfig 는
  //    `jsx: "preserve"` 다 (변환은 Next 가 한다). vitest 는 Next 를 안 거치므로
  //    자기가 변환할 줄 알아야 `components/*.tsx` 의 **표**를 시험에서 들여올 수 있다.
  //    ⚠ 이 값을 패키지 쪽 vitest.config.ts 에 적지 마라 — 그 순간 갈라진다.
  //    ⚠ 키는 `esbuild` 가 아니라 `oxc` 다. vite 8 은 oxc 로 변환하고, 둘 다 있으면
  //      「esbuild 옵션은 무시한다」고 경고만 하고 **조용히 안 먹는다.**
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // 아직 테스트가 없는 패키지도 초록이어야 한다 (docs/PLAN.md P0 첫 행의 완료 기준).
    // ⚠ 이 옵션은 「테스트를 안 짜서 초록」도 같이 가려 준다. 테스트가 있어야 할
    //   패키지인지는 tools/ci.ps1 의 test 층 로그(.ci/logs/test.txt)에서 개수를 봐라.
    passWithNoTests: true,
    hookTimeout: HOOK_TIMEOUT_MS,
    testTimeout: TEST_TIMEOUT_MS,
  },
})
