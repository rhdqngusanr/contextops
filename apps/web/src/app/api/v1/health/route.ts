import { sql } from 'drizzle-orm'

import { aiConfigured } from '../../../../lib/ai/client'
import { route } from '../../../../lib/api/route'

// =====================================================================
//  `GET /api/v1/health` — 공개 (SPEC §5 마지막 줄 · §11 「Vercel Cron 하루 1회」 — Hobby 는 하루 1회가 상한이다 · `vercel.json`)
//
//  ★ 왜 DB 를 실제로 한 번 두드리나 — 프로세스가 살아 있다는 것과 DB 에 닿는다는 것은
//    다르다. Supabase 무료 플랜은 안 쓰면 재우고, 그때 앱은 멀쩡히 200 을 낸다.
//    Cron 이 이 라우트를 부르는 목적이 **잠들지 않게 하는 것**이라 두드려야 의미가 있다.
//
//  ⚠ 인증이 없다. 그래서 여기서 버전·연결 문자열·환경변수를 흘리지 마라 — `ok`·`db`·`ai`
//    세 boolean 이면 충분하다.
//  ★ `ai` — 서버측 AI 를 부를 수 있는 배포인가 (키 + 표 안의 모델 · INBOX G9). `ok` 에는 안 섞는다:
//    AI 없는 배포도 읽기·발행·sync 는 다 되므로 「살아 있다」가 맞고, 구조화만 `AI_NOT_CONFIGURED` 다.
//    `verify:prod` 가 이 칸을 따로 재서 심사 전에 잡는다.
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
  //  SPEC §5 는 `{ok, db, ai, version}` 이다. `version` 은 Pack 이 아니라 **API 계약 버전**이라
  //  경로(`/api/v1`)와 같은 값이어야 한다 — 두 곳에 적히지 않게 여기 하나로 둔다.
  return ctx.ok({ ok: db, db, ai: aiConfigured(), version: 'v1' }, db ? 200 : 503)
})
