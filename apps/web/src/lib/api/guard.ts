import { and, eq, isNull } from 'drizzle-orm'
import { ROLE_RANK, type TeamRole } from '@contextops/schema'

import type { Db } from '../../db/client'
import { projects, teamMembers } from '../../db/schema'
import { actorCan, type Actor } from './auth'
import { fail } from './error'

// =====================================================================
//  권한 2단계 owner/member (SPEC §5)
//
//  ★ 판정이 이 파일 하나에만 있는 이유 — 「이 사람이 이 프로젝트를 볼 수 있나」를
//    라우트마다 적으면 조건이 갈라진다. 갈라진 쪽이 느슨하면 그게 사고이고,
//    **느슨한 쪽은 리뷰에서 눈에 안 띈다** (한 줄이 빠진 것처럼 보이지 않는다).
//
//  ⚠ 판정 순서가 규칙이다: **없으면 404 · 남의 것이면 403.** 반대로 하면
//    404/403 의 차이로 「그 프로젝트가 존재하는가」를 캐낼 수 있다.
//    그래서 팀 소속이 아니면 프로젝트의 존재 자체를 404 로 돌려준다.
// =====================================================================

export type ProjectAccess = {
  projectId: string
  teamId: string
  role: TeamRole
}

/** 그 팀에서의 역할. 소속이 아니면 `undefined`. */
async function roleInTeam(db: Db, teamId: string, userId: string): Promise<TeamRole | undefined> {
  const [row] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, 'active'),
    ))
    .limit(1)
  return row?.role
}

function assertRank(role: TeamRole, min: TeamRole): void {
  if (ROLE_RANK[role] < ROLE_RANK[min]) fail('FORBIDDEN', `${min} 권한이 필요하다`)
}

/**
 * 기기 토큰**만** 할 수 있는 일 (SPEC §5 `sync-reports`·`progress` 의 권한 칸).
 * ★ 왜 사람을 막나 — 이 둘은 「그 기기에서 무슨 일이 있었나」의 보고다. 사람이 브라우저에서
 *   대신 적을 수 있으면 보고의 주체가 흐려지고, 화면의 "마지막 보고" 가 무엇의 시각인지
 *   말할 수 없게 된다. 사람이 손으로 올리고 싶으면 그것도 기기(CLI)를 통한다 (`source:'manual'`).
 */
export function requireDevice(actor: Actor): Extract<Actor, { kind: 'device' }> {
  if (actor.kind !== 'device') fail('FORBIDDEN', '기기 토큰으로만 할 수 있다')
  return actor
}

/** 팀 단위 작업 (`POST /teams/{id}/projects`). */
export async function requireTeam(db: Db, actor: Actor, teamId: string, min: TeamRole): Promise<TeamRole> {
  //  기기 토큰은 팀 단위 작업을 하지 않는다 — 플러그인이 하는 일은 전부 프로젝트 안이다.
  if (actor.kind === 'device') fail('FORBIDDEN', '기기 토큰으로는 팀을 바꿀 수 없다')
  const role = await roleInTeam(db, teamId, actor.userId)
  if (!role) fail('NOT_FOUND', '팀을 찾을 수 없다')
  if (!actorCan(actor, min)) fail('FORBIDDEN', '이 주체는 그 등급의 일을 할 수 없다')
  assertRank(role, min)
  return role
}

/** 프로젝트 단위 작업. 반환값에 `teamId` 가 있어 호출부가 다시 조회하지 않는다. */
export async function requireProject(
  db: Db,
  actor: Actor,
  projectId: string,
  min: TeamRole,
): Promise<ProjectAccess> {
  //  기기 토큰은 **자기 프로젝트 밖으로 나갈 수 없다.** 토큰 하나가 팀 전체를
  //  읽는 열쇠가 되지 않게 하는 자리다.
  if (actor.kind === 'device' && actor.projectId !== projectId) {
    fail('NOT_FOUND', '프로젝트를 찾을 수 없다')
  }

  const [project] = await db
    .select({ id: projects.id, teamId: projects.teamId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) fail('NOT_FOUND', '프로젝트를 찾을 수 없다')

  const role = await roleInTeam(db, project.teamId, actor.userId)
  if (!role) fail('NOT_FOUND', '프로젝트를 찾을 수 없다')
  if (!actorCan(actor, min)) fail('FORBIDDEN', '이 주체는 그 등급의 일을 할 수 없다')
  assertRank(role, min)

  return { projectId: project.id, teamId: project.teamId, role }
}
