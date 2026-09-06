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
//    이 값과 갈렸다. `apps/web/test/hook-timeout.test.ts` 가 「훅에 자기 상한을 준 시험 파일 0개」를 센다.
export const HOOK_TIMEOUT_MS = 30_000

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
  },
})
