import { createHash } from 'node:crypto'
import { lt, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { rateHits } from '../../db/schema'
import { fail } from './error'

// =====================================================================
//  apps/web/src/lib/api/rate-limit.ts — **HTTP 빈도 제한의 문 하나** (SPEC §5 · §11 · R1)
//
//  🔴 왜 생겼나 (2026-09-12) — 이 서버에서 세는 자리는 `withBudget()` 하나뿐이었다.
//     그건 **LLM 을 부르는 요청**만 센다. 나머지 문은 전부 무제한이었고, 그중
//     `POST /demo/session` 은 **자격증명조차 요구하지 않는다.** `while true; do curl` 하나면
//     Vercel 호출 수와 Supabase 연결이 그대로 올라간다. 심사 기간(9/21~10/5)에 링크가
//     죽으면 그건 대회 규정상 **제외 사유**다 — 그래서 지갑이 아니라 **가용성**이 이 문의 목적이다.
//
//  ★ 왜 라우트 감싸기 안인가 — `refuseWrite()` 와 같은 이유다. 라우트마다 적으면
//    **새 라우트가 반드시 빠뜨리고**, 빠뜨린 라우트가 곧 뚫린 문이 된다. 그래서 기본값이
//    있고(`DEFAULT_LIMIT`) 표는 **더 좁힐 때만** 적는다 — 아무것도 안 적어도 새 문은 잠겨서 태어난다.
//
//  ★ 왜 IP 인가 (주체가 아니라) — 이 검사는 `ctx.actor()` **앞**에서 돌아야 한다.
//    주체를 알아내는 일 자체가 DB 왕복이고 서명 검증이라, 그걸 지나고 세면 「자격증명이
//    틀린 요청을 초당 천 번」이 그대로 통과한다. 막으려는 것이 바로 그 요청이다.
//
//  ★ 왜 표(`rate_hits`)에 세나 — `ai_usage` 와 같은 이유. 프로세스 메모리에 세면
//    서버리스에서 인스턴스마다 따로 세고 콜드 스타트마다 0이 된다 (schema.ts 의 주석).
//
//  ⚠ **고정 창(fixed window)이다.** 창의 경계에서는 짧은 순간 한도의 두 배까지 지날 수 있다.
//    sliding window 로 하면 행마다 시각 목록을 들고 있어야 하고, 우리가 막으려는 것은
//    「초당 수백 번」이지 「한도의 1.5배」가 아니다 — 그 정확도에 표의 크기를 바꾸지 않는다.
//
//  🔴 ⚠ **DB 가 흔들리면 이 문은 열린다** (fail-open). 세는 질의가 던지면 요청을 통과시킨다.
//     ★ 왜 — 빈도 제한이 고장 났다고 사이트 전체가 503 이 되면, 이 문이 막으려던 것(심사
//       기간에 링크가 죽는 것)을 이 문이 직접 일으킨다. 막는 것과 죽이는 것 중 하나를 골라야
//       하면 **막지 못하는 쪽**을 고른다. 대신 조용하지 않게 — `onError` 로 로그에 남긴다.
// =====================================================================

/** 창 안에서 허용되는 호출 수와 창의 길이. `scope` 는 아직 IP 하나다 (위 ★ 참고). */
export interface HttpRateLimit {
  readonly calls: number
  readonly windowSeconds: number
}

/**
 * 🔴 **적지 않은 라우트가 받는 값.** 새 문은 여기에 잠겨서 태어난다.
 *
 * ★ 왜 600/분인가 — 사람을 막지 않을 만큼 넉넉하고, 스크립트는 확실히 걸리는 자리다.
 *   실측 근거: 화면 3 의 job polling 이 2초마다(`JOB_POLL_MS`), 실시간 갱신이
 *   10초마다(`REALTIME_POLL_MS`) 돈다 = 한 탭이 분당 약 36회. 심사위원 여럿이 **회사
 *   NAT 뒤에서 같은 IP 로** 들어오는 경우까지 봐서(탭 여럿 × 사람 여럿) 한 자릿수 배수를 뒀다.
 *   반대쪽: `curl` 반복문은 초당 수십~수백이라 10/초 천장에 즉시 걸린다.
 * ⚠ 이 숫자를 올릴 때는 **왜 사람이 걸렸는지**를 먼저 적어라. 「누가 걸렸다」는 보고 없이
 *   올리면 이 문은 있으나 마나가 된다.
 */
export const DEFAULT_LIMIT: HttpRateLimit = { calls: 600, windowSeconds: 60 }

/**
 * 🔴 **기본값보다 좁혀야 하는 문의 정본 표.** 열쇠는 `route()` 의 첫 인자와 **글자 그대로 같다.**
 *
 * ★ 새 문을 좁히는 절차: ① 여기 한 줄 ② 끝. 화면도 라우트도 안 고친다.
 * ⚠ 열쇠를 오타내면 그 줄은 아무것도 안 하고 기본값이 쓰인다 — `test/api-rate-limit.test.ts`
 *   가 이 표의 모든 열쇠가 **실제로 존재하는 라우트 이름**인지 대조한다 (죽은 줄 금지).
 */
export const HTTP_RATE_LIMITS: Record<string, HttpRateLimit> = {
  //  🔴 **자격증명 없이 부를 수 있는 유일한 쓰기 문**이다 (`app/api/v1/demo/session/route.ts`).
  //  ★ 왜 10분에 20회인가 — 게스트 토큰의 수명이 24시간이라(`DEMO_SESSION_TTL_SEC`) 사람은
  //    하루에 한두 번 부른다. 20회면 「새로고침을 여러 번 한 사람」은 지나고, 토큰을 계속
  //    찍어내는 스크립트는 못 지난다.
  'POST /demo/session': { calls: 20, windowSeconds: 600 },

  //  ★ zip 은 한 번에 파일 수십 개를 메모리에서 이어 붙인다 (`lib/api/zip.ts`). 다른 읽기 문보다
  //    한 번이 비싸서 따로 좁힌다 — 게스트 토큰 하나로 전송량을 증폭시키는 자리가 여기다.
  'GET /projects/{id}/packs/{semver}/zip': { calls: 60, windowSeconds: 60 },
}

/**
 * 요청을 보낸 쪽을 가리키는 문자열. **원문은 여기서만 살고 밖으로 안 나간다** — 돌려주는
 * 값은 바로 `bucketOf()` 에서 sha256 을 지난다 (P1 · SPEC §11).
 *
 * ★ Vercel 은 `x-forwarded-for` 의 **맨 앞**에 실제 클라이언트를 넣는다. 뒤쪽 항목은
 *   클라이언트가 지어낼 수 있으므로 앞의 하나만 읽는다.
 * ⚠ 아무 머리도 없으면(로컬 개발·시험) `local` 이다 — 그 경우 모두가 한 통을 나눠 쓴다.
 *   production 에서는 프록시가 항상 채운다.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'local'
}

/** 「누가 · 어느 문을 · 어느 창에서」 — 이 문자열 하나가 곧 창이다 (schema.ts `rate_hits`). */
export function bucketOf(who: string, route: string, windowSeconds: number, now: Date): string {
  const windowStart = Math.floor(now.getTime() / 1000 / windowSeconds) * windowSeconds
  //  ⚠ IP 원문을 표에 넣지 않는다 — `ai_usage.actor_hash` 와 같은 규칙이다.
  const hashed = createHash('sha256').update(who).digest('hex')
  return `${hashed}:${route}:${windowStart}`
}

/** 이 라우트에 적용되는 한도. 표에 없으면 기본값이다. */
export function limitFor(route: string): HttpRateLimit {
  return HTTP_RATE_LIMITS[route] ?? DEFAULT_LIMIT
}

/**
 * 🔴 **세고, 넘었으면 429 로 끊는다.** 라우트 감싸기가 핸들러 **앞에서** 한 번 부른다.
 *
 * ★ 원자적 UPSERT 한 번이다 — 「읽고 → 판단하고 → 쓰기」로 하면 동시 요청 둘이 같은 값을
 *   읽고 둘 다 지난다. 천장 바로 밑에서 새는 그 자리를 `ai_usage` 는 advisory lock 으로
 *   막았고, 여기서는 **증가와 읽기가 한 문장**이라 잠금이 필요 없다.
 * ⚠ 창이 지나면 `bucket` 문자열이 저절로 달라진다 — 그래서 「0으로 되돌리는」 갈래가 없다.
 */
export async function checkRateLimit(
  //  🔴 **`Db` 가 아니라 「DB 를 여는 함수」를 받는다** (2026-09-12).
  //     ★ 왜 — 값으로 받으면 `getDb()` 가 이 함수 **밖에서** 평가되고, DB 설정이 없는 배포에서는
  //       거기서 터진다. 그러면 아래 fail-open 이 잡지 못해 **「DB 가 없어도 401」·「DB 가 없으면
  //       503」이 둘 다 500 으로 덮인다** — 시험 둘이 실제로 그걸 잡았다. 빈도 제한은 DB 가
  //       없을 때 **가장 조용해야** 하는 문이다.
  openDb: () => Db,
  route: string,
  req: Request,
  now: Date,
  onError?: (err: unknown) => void,
): Promise<void> {
  const limit = limitFor(route)
  const bucket = bucketOf(clientIp(req), route, limit.windowSeconds, now)
  const expiresAt = new Date(now.getTime() + limit.windowSeconds * 2 * 1000)

  let count: number
  try {
    const [row] = await openDb()
      .insert(rateHits)
      .values({ bucket, count: 1, expiresAt })
      .onConflictDoUpdate({
        target: rateHits.bucket,
        set: { count: sql`${rateHits.count} + 1` },
      })
      .returning({ count: rateHits.count })
    count = row?.count ?? 0
  } catch (err) {
    //  🔴 fail-open (머리 주석). 막지 못하는 것이 죽이는 것보다 낫다 — 대신 조용하지 않게.
    onError?.(err)
    return
  }

  if (count > limit.calls) {
    //  ⚠ 화면이 「얼마나 기다리나」를 말할 수 있게 창의 길이를 같이 낸다. 남은 초를 정확히
    //    세지 않는 이유 — 그러려면 창 시작을 응답에 실어야 하고, 그건 통을 세는 열쇠를
    //    밖으로 흘리는 것이다. 창 길이는 이미 공개해도 되는 값이다.
    fail('RATE_LIMITED', '요청이 너무 잦다 — 잠시 후 다시', {
      retry_after_seconds: limit.windowSeconds,
    })
  }
}

/**
 * 지난 창을 쓸어간다. Cron(`GET /cron/demo-reset`)이 하루 한 번 부른다.
 *
 * ★ 왜 Cron 인가 — 요청 경로에서 지우면 **모든 요청이** 쓰기 하나를 더 낸다. 이 표는
 *   창 하나당 한 행이라 하루치가 작고, 하루 한 번이면 충분하다.
 * ⚠ 이 함수가 안 돌면 표가 자란다. 그것 말고는 아무것도 안 깨진다 — 지난 행은
 *   열쇠가 달라서 이미 아무도 안 읽는다.
 */
export async function sweepRateHits(db: Db, now: Date): Promise<number> {
  const deleted = await db.delete(rateHits).where(lt(rateHits.expiresAt, now)).returning({ bucket: rateHits.bucket })
  return deleted.length
}
