import { sql } from 'drizzle-orm'

import { route } from '../../../../lib/api/route'

// =====================================================================
//  `GET /api/v1/health` — 공개 (SPEC §5 마지막 줄 · §11 「Vercel Cron 6시간마다」)
//
//  ★ 왜 DB 를 실제로 한 번 두드리나 — 프로세스가 살아 있다는 것과 DB 에 닿는다는 것은
//    다르다. Supabase 무료 플랜은 안 쓰면 재우고, 그때 앱은 멀쩡히 200 을 낸다.
//    Cron 이 이 라우트를 부르는 목적이 **잠들지 않게 하는 것**이라 두드려야 의미가 있다.
//
//  ⚠ 인증이 없다. 그래서 여기서 버전·연결 문자열·환경변수를 흘리지 마라 — `ok` 와
//    `db` 두 boolean 이면 충분하다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const GET = route('GET /health', async (ctx) => {
  let db = false
  try {
    await ctx.db.execute(sql`select 1`)
    db = true
  } catch {
    //  실패를 200 으로 덮지 않는다 — 아래에서 상태가 갈린다.
    db = false
  }
  //  SPEC §5 는 `{ok, db, version}` 이다. `version` 은 Pack 이 아니라 **API 계약 버전**이라
  //  경로(`/api/v1`)와 같은 값이어야 한다 — 두 곳에 적히지 않게 여기 하나로 둔다.
  return ctx.ok({ ok: db, db, version: 'v1' }, db ? 200 : 503)
})
