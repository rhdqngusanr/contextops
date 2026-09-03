import { defineConfig } from 'vitest/config'

// 전 패키지 공통 vitest 설정의 정본.
// ★ 새 패키지는 vitest.config.ts 에 한 줄만 쓴다:
//     export { default } from '../../vitest.base.js'
//   값을 패키지 쪽에 적기 시작하면 패키지마다 갈라진다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // 아직 테스트가 없는 패키지도 초록이어야 한다 (docs/PLAN.md P0 첫 행의 완료 기준).
    // ⚠ 이 옵션은 「테스트를 안 짜서 초록」도 같이 가려 준다. 테스트가 있어야 할
    //   패키지인지는 tools/ci.ps1 의 test 층 로그(.ci/logs/test.txt)에서 개수를 봐라.
    passWithNoTests: true,
  },
})
