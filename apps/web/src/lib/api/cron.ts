import { timingSafeEqual } from 'node:crypto'

import { readBearer } from './auth'
import { fail } from './error'

// =====================================================================
//  Cron 이 부르는 문의 자물쇠 (SPEC §11 · §9 「매일 03:00 리셋(Vercel Cron)」)
//
//  ★ Vercel Cron 은 `CRON_SECRET` 환경변수가 있으면 **`Authorization: Bearer <그 값>`** 을
//    붙여 GET 으로 부른다. 그래서 자격증명을 읽는 문은 세션·기기 토큰과 같은
//    `readBearer` 다 — 머리를 읽는 자리가 둘이면 한쪽만 「없으면 401」을 지킨다.
//
//  🔴 **secret 이 없으면 아무도 못 부른다.** `SUPABASE_JWT_SECRET` 과 같은 결이다 —
//     조용히 통과시키면 그 배포는 누구나 데모를 리셋할 수 있는 서버가 되고, 발표 도중에
//     남이 리셋한다 (FINDINGS 120 의 경고).
//  ⚠ 비교는 `timingSafeEqual` 이다 — 길이가 다르면 그 자체로 불일치이고 비교 전에 끊는다.
//  ⚠ 이 자물쇠는 **주체(`Actor`)를 만들지 않는다.** Cron 은 사람도 기기도 아니라
//    `ACTOR_RULES` 에 줄이 없고, 로그의 `user_id` 도 비어 있다 (없는 것을 지어내지 않는다).
// =====================================================================

const SECRET_ENV = 'CRON_SECRET'

/** Cron 의 자격증명이 맞는지 확인한다. 틀리면 401 이다 — 있는지 없는지도 말하지 않는다. */
export function requireCronSecret(req: Request): void {
  const presented = readBearer(req)
  const secret = process.env[SECRET_ENV]
  if (!secret) fail('UNAUTHORIZED', `${SECRET_ENV} 가 없다 — Cron 문이 잠겨 있다`)

  const a = Buffer.from(presented, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) fail('UNAUTHORIZED', 'Cron 자격증명이 맞지 않는다')
}
