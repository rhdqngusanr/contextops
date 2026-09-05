import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

// =====================================================================
//  Next 설정 (SPEC §1.2 — Next 15 App Router · Route Handlers)
//
//  ⚠ 여기에 값을 쌓지 마라. 환경변수의 정본은 `.env.example` 이고, 그 값을 읽는
//    자리는 `src/db/client.ts` 처럼 **읽는 코드 옆**이다. next.config 로 끌어오면
//    빌드 시점에 박제돼서 배포마다 다시 빌드해야 한다.
// =====================================================================

/** 모노레포 뿌리. 배포 함수의 파일 추적이 이 자리를 기준으로 상대 경로를 보존한다. */
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))

const config: NextConfig = {
  //  워크스페이스 패키지를 그대로 소스로 읽는다 (둘 다 `src/index.ts` 를 내보낸다 —
  //  빌드 산출물이 없으므로 Next 가 직접 트랜스파일해야 한다).
  transpilePackages: ['@contextops/schema', '@contextops/compiler'],

  //  🔴 데모 리셋 문이 **런타임에** `fixtures/` 를 읽는다 (`src/lib/demo/fixtures.ts`).
  //     Next 는 import 그래프만 따라가 함수에 실을 파일을 고르므로, `readFileSync` 로 읽는
  //     폴더는 여기 적어야 배포 함수 안에 있다. 없으면 그 문은 배포에서 반드시 던진다 —
  //     `fixturesRoot()` 가 「이 줄을 봐라」고 말한다.
  //     ⚠ 키는 **라우트 경로**다. 다른 문이 픽스처를 읽게 되면 여기 한 줄을 더해라.
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    '/api/v1/cron/demo-reset': ['../../fixtures/**/*'],
  },
}

export default config
