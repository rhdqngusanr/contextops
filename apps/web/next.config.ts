import type { NextConfig } from 'next'

// =====================================================================
//  Next 설정 (SPEC §1.2 — Next 15 App Router · Route Handlers)
//
//  ⚠ 여기에 값을 쌓지 마라. 환경변수의 정본은 `.env.example` 이고, 그 값을 읽는
//    자리는 `src/db/client.ts` 처럼 **읽는 코드 옆**이다. next.config 로 끌어오면
//    빌드 시점에 박제돼서 배포마다 다시 빌드해야 한다.
// =====================================================================
const config: NextConfig = {
  //  워크스페이스 패키지를 그대로 소스로 읽는다 (둘 다 `src/index.ts` 를 내보낸다 —
  //  빌드 산출물이 없으므로 Next 가 직접 트랜스파일해야 한다).
  transpilePackages: ['@contextops/schema', '@contextops/compiler'],
}

export default config
