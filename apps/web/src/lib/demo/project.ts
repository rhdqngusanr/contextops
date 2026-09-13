import { and, eq, isNull } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { projects, teams } from '../../db/schema'
import { fail } from '../api/error'
import { DEMO_TENANT } from './tenant'

// =====================================================================
//  데모 팀 · 그 안의 프로젝트를 찾는 **문 하나** (SPEC §9 「게스트 데모」)
//
//  ★ 둘째 사용자가 생겨서 올렸다 (2026-09-13 · CLAUDE.md 「둘째 사용자가 생기면 그때 정본으로」) —
//    게스트 세션(`POST /demo/session`)과 게스트의 AI 한 번(`POST /demo/ai-once`)이 같이 읽는다.
//    각자 적으면 한쪽만 「지운 프로젝트는 빼기」 같은 조건을 빠뜨린다.
//  🔴 **심어져 있지 않으면 404 다** — 「일단 돌리고 화면에서 빈 결과」가 데모에서 제일 나쁜 실패다
//     (`/demo/session` 머리 주석과 같은 이유).
// =====================================================================

export async function findDemoProject(db: Db): Promise<{ teamId: string; projectId: string }> {
  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.slug, DEMO_TENANT.teamSlug))
    .limit(1)
  if (!team) fail('NOT_FOUND', '데모 테넌트가 심어져 있지 않다')

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(
      eq(projects.teamId, team.id),
      eq(projects.slug, DEMO_TENANT.projectSlug),
      isNull(projects.deletedAt),
    ))
    .limit(1)
  if (!project) fail('NOT_FOUND', '데모 프로젝트가 심어져 있지 않다')

  return { teamId: team.id, projectId: project.id }
}
