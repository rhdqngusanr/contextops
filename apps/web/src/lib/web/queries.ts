import type { ContextItem, Manifest, TeamRole } from '@contextops/schema'

import { apiJson, apiText, post } from './api'

// =====================================================================
//  화면이 부르는 엔드포인트의 **목록이자 타입** (SPEC §5)
//
//  ★ 왜 한 파일인가 — 화면 안에서 `apiJson('/projects/' + id + '/…')` 를 조립하면
//    경로가 화면마다 흩어지고, 라우트 이름이 바뀔 때 어디를 고쳐야 하는지 알 수 없다.
//    여기 있는 함수 목록이 곧 「화면이 서버에 대해 아는 전부」다.
//
//  ⚠ 응답 타입은 **손으로 적는다.** 라우트가 `ok()` 에 넣는 모양이 계약이고,
//    그 계약이 깨지면 `apps/web/test/api-*.test.ts` 가 먼저 빨개진다 —
//    화면이 런타임에 알게 두지 않는다.
// =====================================================================

export type ProjectRef = {
  id: string
  slug: string
  name: string
  description: string | null
  official_version_id: string | null
}

export type TeamRef = {
  id: string
  slug: string
  name: string
  role: TeamRole
  projects: ProjectRef[]
}

export type VersionRow = {
  id: string
  semver: string
  snapshot_hash: string
  published_by: string
  published_at: string
  change_summary: string | null
  is_official: boolean
}

/** 내 팀과 그 안의 프로젝트. 주소의 slug 를 uuid 로 바꾸는 유일한 문이다. */
export function fetchTeams(): Promise<{ teams: TeamRef[] }> {
  return apiJson('/teams')
}

/**
 * 주소(`/t/{team}/p/{project}/…`)를 실제 행으로 바꾼다.
 * ⚠ 못 찾으면 `null` 이다 — 예외로 만들지 않는다. 「없는 팀」과 「서버가 죽었다」는
 *   화면에서 다르게 보여야 하는데, 둘 다 던지면 구별할 수 없다.
 */
export function resolveSlugs(
  teams: TeamRef[],
  teamSlug: string,
  projectSlug: string,
): { team: TeamRef; project: ProjectRef } | null {
  const team = teams.find((t) => t.slug === teamSlug)
  const project = team?.projects.find((p) => p.slug === projectSlug)
  return team && project ? { team, project } : null
}

export function createTeam(body: { name: string; slug: string }): Promise<{ id: string; slug: string }> {
  return post('/teams', body)
}

export function createProject(
  teamId: string,
  body: { name: string; slug: string; description?: string },
): Promise<ProjectRef> {
  return post(`/teams/${teamId}/projects`, body)
}

export function createRepo(projectId: string, name: string): Promise<{ id: string; name: string }> {
  return post(`/projects/${projectId}/repos`, { name })
}

/** 화면 5 의 표. 필터는 SPEC §5 의 `?type&status&scope` 그대로다. */
export function fetchItems(
  projectId: string,
  filter: { type?: string; status?: string; scope?: string },
): Promise<{ items: ContextItem[]; limit: number; offset: number }> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filter)) if (v) q.set(k, v)
  const tail = q.toString()
  return apiJson(`/projects/${projectId}/context-items${tail ? `?${tail}` : ''}`)
}

export function fetchVersions(projectId: string): Promise<{
  versions: VersionRow[]
  official_version_id: string | null
}> {
  return apiJson(`/projects/${projectId}/versions`)
}

export function publishVersion(
  projectId: string,
  body: { semver: string; base_version_id: string | null; change_summary?: string },
): Promise<{
  id: string
  semver: string
  snapshot_hash: string
  manifest_hash: string
  file_count: number
  published_at: string
  applied_proposal_ids: string[]
}> {
  return post(`/projects/${projectId}/versions/publish`, body)
}

export function fetchManifest(projectId: string, semver: string): Promise<Manifest> {
  return apiJson(`/projects/${projectId}/packs/${semver}/manifest`)
}

/**
 * Pack 파일 본문. `text/plain` 이고 봉투가 아니다 —
 * **플러그인이 파일로 쓰는 바이트와 같은 것**을 화면도 받는다 (SPEC §5 · §8.5).
 */
export function fetchPackFile(projectId: string, semver: string, path: string): Promise<string> {
  //  ⚠ 경로 조각마다 인코딩한다. 통째로 인코딩하면 `/` 까지 `%2F` 가 되어 catch-all 이
  //    한 조각으로 받고, 그 파일은 영원히 404 다.
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return apiText(`/projects/${projectId}/packs/${semver}/files/${encoded}`)
}
