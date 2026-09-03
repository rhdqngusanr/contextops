import { defineConfig } from 'drizzle-kit'

// =====================================================================
//  drizzle-kit 설정 (SPEC §2)
//
//  ⚠ 마이그레이션 SQL 을 손으로 쓰지 마라. `pnpm --filter web db:generate` 가
//    src/db/schema.ts 를 읽어 drizzle/ 에 낸다. 손으로 쓰면 스키마와 SQL 이
//    조용히 갈라지고, 갈라진 것은 배포 때 처음 발견된다.
//
//  ⚠ 여기에 접속 정보를 적지 마라 — `generate` 는 DB 에 붙지 않는다.
//    `push`·`migrate` 를 쓰게 되면 그때 `DATABASE_URL` 을 env 에서 읽는다
//    (.env.example 참고 · 값은 저장소에 들어오지 않는다 · P1).
// =====================================================================
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
})

