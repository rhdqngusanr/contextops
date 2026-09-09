import { and, eq, like } from 'drizzle-orm'
import type { TeamRole } from '@contextops/schema'

import type { Db } from '../../db/client'
import { teamMembers, users } from '../../db/schema'
import { fail } from './error'

// =====================================================================
//  팀원 — 목록 · 초대 · 첫 로그인 승격 (INBOX H9 · 2026-09-10 · SPEC §5 `GET/POST /teams/{id}/members`)
//
//  ★ 왜 이제야 있나 — 팀은 만든 사람 하나로 시작했고, 둘째 사람이 들어오는 문이 **없었다.** 심사위원의 두 번째
//    질문이 「팀원은 어떻게 합류하나」인데 답이 「DB 에 행을 넣는다」였다.
//
//  🔴 **초대는 이메일로, 합류는 첫 로그인으로.** 새 표를 만들지 않는다 — `team_members.status` 에 이미 `invited` 가
//     있고(SPEC §2) `users` 행이 FK 로 필요하다. 아직 로그인한 적 없는 사람은 **자리표시 행**(`auth_subject` 가
//     `invite:<email>`)으로 만들고, 그 이메일로 처음 로그인하는 순간 `sessionActor()` 가 그 행을 진짜 subject 로
//     바꾸고 `invited` 를 `active` 로 올린다 (`adoptInvitedUser`). 별도의 「수락」 화면이 없다 — owner 가 부른 사람이
//     로그인한 것이 수락이다.
//  ⚠ 이메일은 로그인 공급자가 준 것과 **소문자로** 맞춘다 — GitHub 은 대소문자를 섞어 준다.
//  ⚠ 초대 메일은 **보내지 않는다** — 발신 SMTP 가 없다 (DEPLOY ①-b). 초대한 사람이 링크(`/login`)를 직접 전한다.
//     화면이 그 사실을 말한다.
// =====================================================================

/** 아직 로그인한 적 없는 초대 대상의 `auth_subject` 머리. 진짜 subject(OAuth)는 이 모양이 아니다. */
export const INVITE_SUBJECT_PREFIX = 'invite:'

export type TeamMemberView = {
  user_id: string
  name: string
  role: TeamRole
  status: 'active' | 'invited'
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** 팀의 사람들 — 이메일은 내지 않는다 (이름·등급·상태뿐 · P1 의 태도). */
export async function listMembers(db: Db, teamId: string): Promise<TeamMemberView[]> {
  const rows = await db
    .select({ user_id: users.id, name: users.name, role: teamMembers.role, status: teamMembers.status })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId))
  //  owner 먼저 · 그 다음 이름순 — 화면이 정렬을 다시 하지 않는다.
  return rows
    .map((r) => ({ ...r, status: r.status as TeamMemberView['status'] }))
    .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name, 'ko') : a.role === 'owner' ? -1 : 1))
}

/**
 * 이메일로 초대한다. 이미 로그인한 적 있는 사람이면 바로 `active`, 아니면 자리표시 행 + `invited`.
 * ⚠ 이미 팀원이면 400 — 같은 사람을 두 번 넣지 않는다 (pk 가 막지만 문장은 여기서 낸다).
 */
export async function inviteMember(
  db: Db, teamId: string, rawEmail: string, role: TeamRole, now: Date,
): Promise<TeamMemberView> {
  const email = normalizeEmail(rawEmail)
  return db.transaction(async (tx) => {
    //  🔴 진짜 사람이 먼저다 — 같은 이메일로 로그인한 행이 있으면 그 사람이다 (자리표시 행보다 우선).
    const existing = await tx.select({ id: users.id, name: users.name, subject: users.authSubject })
      .from(users).where(eq(users.email, email))
    const real = existing.find((u) => !u.subject.startsWith(INVITE_SUBJECT_PREFIX))
    const placeholder = existing.find((u) => u.subject.startsWith(INVITE_SUBJECT_PREFIX))

    let user = real ?? placeholder
    let status: TeamMemberView['status'] = real ? 'active' : 'invited'
    if (!user) {
      const [made] = await tx.insert(users)
        .values({ authSubject: `${INVITE_SUBJECT_PREFIX}${email}`, email, name: email.split('@')[0] ?? email })
        .returning({ id: users.id, name: users.name, subject: users.authSubject })
      if (!made) fail('INTERNAL', '초대 자리표시 행을 만들지 못했다')
      user = made
      status = 'invited'
    }

    const [inserted] = await tx.insert(teamMembers)
      .values({ teamId, userId: user.id, role, status, createdAt: now, updatedAt: now })
      .onConflictDoNothing({ target: [teamMembers.teamId, teamMembers.userId] })
      .returning({ userId: teamMembers.userId })
    if (!inserted) fail('VALIDATION_FAILED', '이미 이 팀의 팀원이다', [{ path: 'email', message: '이미 이 팀의 팀원이다' }])

    return { user_id: user.id, name: user.name, role, status }
  })
}

/**
 * 첫 로그인 승격 — 이 이메일의 자리표시 행이 있으면 진짜 subject 를 물려주고 `invited` 를 `active` 로.
 * `sessionActor()` 가 upsert **전에** 부른다. 자리표시 행이 없으면 아무것도 안 한다 (대부분의 로그인).
 * ⚠ 같은 subject 의 진짜 행이 이미 있는데 자리표시 행도 있으면(다른 팀이 나중에 초대) 자리표시 행의 멤버십을
 *   진짜 행으로 옮기고 자리표시 행을 지운다 — 사람은 하나여야 한다.
 */
export async function adoptInvitedUser(db: Db, subject: string, rawEmail: string, now: Date): Promise<void> {
  const email = normalizeEmail(rawEmail)
  const placeholders = await db.select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), like(users.authSubject, `${INVITE_SUBJECT_PREFIX}%`)))
  if (placeholders.length === 0) return

  await db.transaction(async (tx) => {
    const [real] = await tx.select({ id: users.id }).from(users).where(eq(users.authSubject, subject)).limit(1)
    for (const ph of placeholders) {
      if (real) {
        //  진짜 행이 이미 있다 — 멤버십을 옮기고 자리표시 행을 지운다.
        const memberships = await tx.select({ teamId: teamMembers.teamId, role: teamMembers.role })
          .from(teamMembers).where(eq(teamMembers.userId, ph.id))
        for (const m of memberships) {
          await tx.insert(teamMembers)
            .values({ teamId: m.teamId, userId: real.id, role: m.role, status: 'active', createdAt: now, updatedAt: now })
            .onConflictDoNothing({ target: [teamMembers.teamId, teamMembers.userId] })
        }
        await tx.delete(teamMembers).where(eq(teamMembers.userId, ph.id))
        await tx.delete(users).where(eq(users.id, ph.id))
      } else {
        //  자리표시 행이 그 사람이 된다 — id 가 그대로라 멤버십이 따라온다.
        await tx.update(users).set({ authSubject: subject, updatedAt: now }).where(eq(users.id, ph.id))
        await tx.update(teamMembers).set({ status: 'active', updatedAt: now })
          .where(and(eq(teamMembers.userId, ph.id), eq(teamMembers.status, 'invited')))
      }
    }
  })
}
