import { eq, inArray } from 'drizzle-orm'

import type { Db } from '../../db/client'
import {
  aiJobs, aiUsage, conflicts, contextItemRevisions, contextItems, contextVersions, devices, packFiles,
  progressEvents, projects, proposals, repos, sourceDocumentVersions, sourceDocuments, syncReports,
  teamMembers, teams, users,
} from '../../db/schema'

// =====================================================================
//  팀 하나를 **통째로** 지우는 자리 하나 (SPEC §9 「매일 03:00 리셋」)
//
//  ★ 왜 있나 — 데모 테넌트는 매일 다시 심는다. 그런데 `teams.slug` 는 전역 유일이고
//    (`POST /teams` 가 400 으로 막는다) FK 에 cascade 가 없다 (SPEC §2 — 사용자 데이터를
//    실수 한 번에 통째로 잃지 않게). 그래서 지우는 순서를 **아는 자리**가 하나 있어야 한다.
//
//  🔴 **제품에는 「팀 삭제」 문이 없다.** 이 함수를 라우트에 걸지 마라 — 지금 부르는
//     자리는 데모 리셋(`reset.ts`)뿐이고, 그것도 `DEMO_TENANT.teamSlug` 하나만 지운다.
//     사용자 팀을 지우는 기능이 생기면 그때 이 함수가 둘째 사용자를 얻는다.
//
//  ★ 표가 정본이다 — `PROJECT_SCOPED` 는 「프로젝트에 매달린 표」를 **FK 의 자식부터**
//    늘어놓은 순서다. 새 표를 더하는 절차: ① `db/schema.ts` 에 표 ② `project_id` 가 있으면
//    여기 한 줄(그 표를 가리키는 표보다 **앞에**) — `test/demo-reset.test.ts` 가
//    「`project_id` 를 가진 표가 전부 이 목록에 있나」를 세서, 빠뜨리면 빨개진다.
//    ⚠ 프로젝트가 아니라 **다른 표**에 매달린 것(`pack_files`→버전 · `context_item_revisions`
//      →항목 · `source_document_versions`→문서)은 목록이 아니라 아래 함수 본문이 안다 —
//      그것들은 `project_id` 가 없어서 표로 못 센다.
// =====================================================================

/**
 * `project_id` 컬럼으로 프로젝트에 매달린 표들 — **자식이 먼저.**
 * (순환 FK 둘은 본문에서 먼저 끊는다: `projects.official_version_id` ·
 *  `source_documents.current_version_id`)
 */
export const PROJECT_SCOPED = [
  progressEvents,   // → devices · projects · users
  syncReports,      // → devices · projects · context_versions
  devices,          // → users · projects
  proposals,        // → projects · users · context_versions
  aiJobs,           // → projects
  aiUsage,          // → projects (nullable)
  conflicts,        // → projects · users · (project_id, public_id) → context_items
  contextItems,     // → projects · users   (개정은 본문이 먼저 지운다)
  contextVersions,  // → projects · users   (pack_files 는 본문이 먼저 지운다)
  sourceDocuments,  // → projects           (버전은 본문이 먼저 지운다)
  repos,            // → projects
] as const

/**
 * 팀·그 팀의 프로젝트·거기 매달린 전부·팀 소속을 **한 트랜잭션**으로 지운다.
 * 사람(`users`)은 지우지 않는다 — 다른 팀에도 속할 수 있어서다. 데모의 사람은
 * `deleteUsersBySubject` 가 따로 지운다.
 *
 * @returns 지운 프로젝트 수. 팀이 없으면 `undefined` (아무것도 안 했다).
 */
export async function deleteTeamBySlug(db: Db, slug: string): Promise<{ projects: number } | undefined> {
  return db.transaction(async (tx) => {
    const [team] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.slug, slug)).limit(1)
    if (!team) return undefined

    const projectRows = await tx.select({ id: projects.id }).from(projects).where(eq(projects.teamId, team.id))
    const projectIds = projectRows.map((p) => p.id)

    if (projectIds.length > 0) {
      //  ── 순환 FK 를 먼저 끊는다 ──────────────────────────────────────
      await tx.update(projects).set({ officialVersionId: null }).where(inArray(projects.id, projectIds))
      await tx.update(sourceDocuments).set({ currentVersionId: null })
        .where(inArray(sourceDocuments.projectId, projectIds))

      //  ── `project_id` 가 없는 자식 표 셋 — 부모 id 로 고른다 ─────────
      const versionIds = (await tx.select({ id: contextVersions.id }).from(contextVersions)
        .where(inArray(contextVersions.projectId, projectIds))).map((r) => r.id)
      if (versionIds.length > 0) await tx.delete(packFiles).where(inArray(packFiles.versionId, versionIds))

      const itemIds = (await tx.select({ id: contextItems.id }).from(contextItems)
        .where(inArray(contextItems.projectId, projectIds))).map((r) => r.id)
      //  ⚠ 개정은 충돌·제안보다 먼저 지워도 된다 — 아무도 개정 행을 FK 로 가리키지 않는다.
      if (itemIds.length > 0) await tx.delete(contextItemRevisions).where(inArray(contextItemRevisions.itemId, itemIds))

      const documentIds = (await tx.select({ id: sourceDocuments.id }).from(sourceDocuments)
        .where(inArray(sourceDocuments.projectId, projectIds))).map((r) => r.id)
      if (documentIds.length > 0) {
        await tx.delete(sourceDocumentVersions).where(inArray(sourceDocumentVersions.documentId, documentIds))
      }

      //  ── 표의 순서대로 ────────────────────────────────────────────────
      for (const table of PROJECT_SCOPED) {
        await tx.delete(table).where(inArray(table.projectId, projectIds))
      }
      await tx.delete(projects).where(inArray(projects.id, projectIds))
    }

    await tx.delete(teamMembers).where(eq(teamMembers.teamId, team.id))
    await tx.delete(teams).where(eq(teams.id, team.id))
    return { projects: projectIds.length }
  })
}

/**
 * `auth_subject` 로 사람을 지운다. **다른 팀에 아직 속해 있으면 그 사람은 남긴다** —
 * 데모의 sub 는 진짜 로그인과 겹치지 않지만(uuid 가 아니다), 「지우는 문」이 그 가정에
 * 기대면 가정이 틀린 날 사용자 행을 지운다.
 *
 * @returns 지운 사람 수
 */
export async function deleteUsersBySubject(db: Db, subjects: string[]): Promise<number> {
  if (subjects.length === 0) return 0
  return db.transaction(async (tx) => {
    const rows = await tx.select({ id: users.id }).from(users).where(inArray(users.authSubject, subjects))
    if (rows.length === 0) return 0
    const ids = rows.map((r) => r.id)
    const stillMember = new Set((await tx.select({ userId: teamMembers.userId }).from(teamMembers)
      .where(inArray(teamMembers.userId, ids))).map((r) => r.userId))
    const orphan = ids.filter((id) => !stillMember.has(id))
    if (orphan.length === 0) return 0
    await tx.delete(users).where(inArray(users.id, orphan))
    return orphan.length
  })
}
