import { defineConfig } from 'vitest/config'

// 전 패키지 공통 vitest 설정의 정본.
// ★ 새 패키지는 vitest.config.ts 에 한 줄만 쓴다:
//     export { default } from '../../vitest.base.js'
//   값을 패키지 쪽에 적기 시작하면 패키지마다 갈라진다.
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
  },
})
