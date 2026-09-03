import { eq } from 'drizzle-orm'
import { ROLE_RANK, type TeamRole } from '@contextops/schema'

import type { Db } from '../../db/client'
import { devices, users } from '../../db/schema'
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

/**
 * 🔴 **주체별 권한 상한 표.**
 *
 * ★ 왜 있나 — 기기 토큰은 사람의 것이지만 **파일에 저장된 문자열**이다. 그 문자열을
 *   주운 사람이 승인·발행까지 할 수 있으면 토큰 하나가 팀 전체를 바꾼다.
 *   그래서 기기는 owner 인 사람의 토큰이라도 member 까지만 할 수 있다.
 *   플러그인이 하는 일(batch-draft·proposal·progress·sync)은 전부 member 다 (SPEC §5).
 *
 * ★ 새 주체를 더하면 여기 한 줄 — 라우트는 고칠 것이 없다.
 */
export const ACTOR_MAX_ROLE: Record<Actor['kind'], TeamRole> = {
  user: 'owner',
  device: 'member',
}

function bearer(req: Request): string {
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

async function sessionActor(db: Db, jwt: string, now: Date): Promise<Actor> {
  const claims = verifySessionJwt(jwt, now)
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

/** 헤더 하나에서 주체를 정한다. 실패는 전부 401 이다. */
export async function requireActor(db: Db, req: Request, now: Date): Promise<Actor> {
  const credential = bearer(req)
  return credential.startsWith(TOKEN_PREFIX)
    ? deviceActor(db, credential, now)
    : sessionActor(db, credential, now)
}

/** 이 주체가 `role` 등급의 일을 할 수 있나 — 상한 표를 거쳐 판정한다. */
export function actorCan(actor: Actor, role: TeamRole): boolean {
  const cap = ROLE_RANK[ACTOR_MAX_ROLE[actor.kind]]
  const rank = ROLE_RANK[role]
  return cap >= rank
}
