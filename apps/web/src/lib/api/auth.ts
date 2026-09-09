import { eq } from 'drizzle-orm'
import { ROLE_RANK, type TeamRole } from '@contextops/schema'

import type { Db } from '../../db/client'
import { devices, users } from '../../db/schema'
import { DEMO_GUEST_SUBJECT } from '../demo/tenant'
import { ACTOR_RULES, type ActorKind } from './actor-rules'
import { fail } from './error'
import { verifySessionJwt } from './session'
import { TOKEN_PREFIX, hashToken } from './token'

// =====================================================================
//  누가 부르고 있나 (SPEC §5 「인증은 (a) 웹 세션(Supabase JWT) 또는
//  (b) `Authorization: Bearer ctx_<token>`」)
//
//  ★ 문이 하나인 이유 — 두 인증을 **같은 헤더**로 받고 `ctx_` 접두사로 가른다.
//    라우트는 「누가」를 스스로 캐지 않는다. 캐기 시작하면 라우트마다 다른
//    조건으로 통과시키게 되고, 한 곳만 느슨해도 그게 구멍이다.
// =====================================================================

export type Actor =
  | { kind: 'user'; userId: string }
  | { kind: 'device'; userId: string; deviceId: string; projectId: string }
  //  🔴 게스트 = `/demo` 로 들어온 사람. `users` 행은 시드가 만든 데모 팀의 member 다
  //     (`lib/demo/tenant.ts`). 사람인 것은 맞지만 **아무것도 바꿀 수 없다.**
  | { kind: 'guest'; userId: string }

/**
 * 🔴 **주체별 권한 표** — 정본은 `./actor-rules.ts` 다 (import 없는 파일 · 화면도 읽는다).
 *   여기서는 되내보내기만 한다 — 시험과 라우트 주석이 이 이름으로 부른다.
 *
 * ★ 왜 있나 — 기기 토큰은 사람의 것이지만 **파일에 저장된 문자열**이다. 그 문자열을
 *   주운 사람이 승인·발행까지 할 수 있으면 토큰 하나가 팀 전체를 바꾼다.
 *   그래서 기기는 owner 인 사람의 토큰이라도 member 까지만 할 수 있다.
 *   플러그인이 하는 일(batch-draft·proposal·progress·sync)은 전부 member 다 (SPEC §5).
 *
 * 🔴 **`writes` 축이 왜 등급이 아니라 따로 있나** — 「읽기 전용」을 등급 사다리
 *   (`ROLE_RANK`)에 한 칸 더 파는 방법도 있었다. 그러면 **모든 GET 라우트가 요구 등급을
 *   같이 낮춰야** 하고(지금은 전부 `member`), 서른 곳 중 한 곳만 안 낮추면 게스트가
 *   그 화면에서만 빈손이 된다 — 반대로 한 곳을 잘못 낮추면 **P1 의 방어선에 구멍**이다.
 *   축을 하나 더 두면 라우트는 한 줄도 안 고친다. 등급은 「무엇을 볼 수 있나」,
 *   `writes` 는 「바꿀 수 있나」로 뜻이 갈리는 것이 맞다.
 *
 * ★ 새 주체를 더하는 절차는 `./actor-rules.ts` 머리에 있다.
 */
export { ACTOR_RULES }

//  🔴 `Actor['kind']` 와 표의 키(`ACTOR_KINDS`)가 **같은 집합**인지 타입으로 잠근다.
//     한쪽에만 값을 더하면 여기서 typecheck 가 막는다 — 표에 줄이 없는 주체는 `actorWrites` 가 못 판정한다.
type SameKinds = [Actor['kind']] extends [ActorKind] ? ([ActorKind] extends [Actor['kind']] ? true : never) : never
const _actorKindsMatchTable: SameKinds = true
void _actorKindsMatchTable

/**
 * 헤더에서 자격증명 문자열만 꺼낸다. **DB 를 만지지 않는다.**
 * ★ 왜 따로 있나 — 붙여 두면 「자격증명이 없다」가 DB 상태에 달리게 된다.
 *   실제로 그랬다: `DATABASE_URL` 이 없는 서버에서 인증 없는 요청이 401 이 아니라
 *   INTERNAL 500 을 냈다 (빌드한 서버를 띄워 눈으로 봤다). 없는 헤더를 알아내는 데
 *   DB 가 필요할 이유가 없다.
 */
export function readBearer(req: Request): string {
  const header = req.headers.get('authorization')
  if (!header) fail('UNAUTHORIZED', '인증 헤더가 없다')
  const [scheme, ...rest] = header.split(' ')
  const value = rest.join(' ').trim()
  if (scheme?.toLowerCase() !== 'bearer' || value.length === 0) {
    fail('UNAUTHORIZED', 'Authorization: Bearer 형식이어야 한다')
  }
  return value
}

async function deviceActor(db: Db, token: string, now: Date): Promise<Actor> {
  const hash = hashToken(token)
  const [row] = await db.select().from(devices).where(eq(devices.tokenHash, hash)).limit(1)
  //  ⚠ 없음·취소됨·만료됨을 **같은 문구로** 돌려주지 않는다. 셋은 운영자가 구별해야
  //    하는 상태이고, 토큰의 존재 여부는 이미 해시를 아는 사람에게만 드러난다.
  if (!row) fail('UNAUTHORIZED', '알 수 없는 토큰이다')
  if (row.revokedAt !== null) fail('UNAUTHORIZED', '취소된 토큰이다')
  if (row.expiresAt.getTime() <= now.getTime()) fail('UNAUTHORIZED', '만료된 토큰이다')

  //  기기가 살아 있다는 유일한 근거다 (SPEC §9 화면 9 「마지막 보고」의 재료).
  await db.update(devices).set({ lastSeenAt: now }).where(eq(devices.id, row.id))

  return { kind: 'device', userId: row.userId, deviceId: row.id, projectId: row.projectId }
}

/**
 * 게스트 세션 — **행을 만들지 않고 찾기만 한다.**
 * ★ 왜 upsert 가 아닌가 — 데모를 안 심은 배포에서도 세션이 통과하면 아무 팀에도 없는
 *   유령 게스트가 생기고, 그 사람은 모든 화면에서 404 를 본다. 「데모가 없다」를
 *   401 로 먼저 말하는 편이 정직하다.
 */
async function guestActor(db: Db, sub: string): Promise<Actor> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.authSubject, sub)).limit(1)
  if (!row) fail('UNAUTHORIZED', '데모 테넌트가 심어져 있지 않다')
  return { kind: 'guest', userId: row.id }
}

async function sessionActor(db: Db, jwt: string, now: Date): Promise<Actor> {
  const claims = await verifySessionJwt(jwt, now)
  //  🔴 게스트인지는 **sub 하나로** 갈린다 (`lib/demo/tenant.ts` 의 주석).
  //     이 갈래가 email 검사보다 위인 이유 — 게스트 토큰에는 email 이 없고, 있어서도 안 된다.
  if (claims.sub === DEMO_GUEST_SUBJECT) return guestActor(db, claims.sub)

  const email = claims.email
  if (!email) fail('UNAUTHORIZED', '세션에 email 이 없다')

  //  ★ 처음 로그인한 사람의 행을 여기서 만든다. 별도의 「가입」 절차를 두면
  //    OAuth 로 들어온 사람이 어디에도 없는 상태가 생긴다.
  const name = claims.name ?? email.split('@')[0] ?? email
  const [row] = await db
    .insert(users)
    .values({ authSubject: claims.sub, email, name })
    .onConflictDoUpdate({ target: users.authSubject, set: { email, name, updatedAt: now } })
    .returning({ id: users.id })
  if (!row) fail('INTERNAL', '사용자 행을 만들지 못했다')

  return { kind: 'user', userId: row.id }
}

/**
 * 자격증명 하나에서 주체를 정한다. 실패는 전부 401 이다.
 * ⚠ 라우트는 이걸 직접 부르지 않는다 — `ctx.actor()` 가 순서(헤더 먼저, DB 나중)를 지킨다.
 */
export async function resolveActor(db: Db, credential: string, now: Date): Promise<Actor> {
  return credential.startsWith(TOKEN_PREFIX)
    ? deviceActor(db, credential, now)
    : sessionActor(db, credential, now)
}

/** 이 주체가 `role` 등급의 일을 할 수 있나 — 상한 표를 거쳐 판정한다. */
export function actorCan(actor: Actor, role: TeamRole): boolean {
  const cap = ROLE_RANK[ACTOR_RULES[actor.kind].maxRole]
  const rank = ROLE_RANK[role]
  return cap >= rank
}

/**
 * 이 주체가 **무언가를 바꿀 수** 있나.
 * ⚠ 부르는 자리는 `lib/api/route.ts` 하나다 — 라우트마다 부르면 새 라우트가
 *   빠뜨리고, 빠뜨린 라우트는 게스트에게만 뚫린 문이 된다.
 */
export function actorWrites(actor: Actor): boolean {
  return ACTOR_RULES[actor.kind].writes
}
