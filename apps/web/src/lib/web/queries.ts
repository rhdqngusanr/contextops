import type {
  AiJobStatus, ContextItem, Manifest, SourceDocumentKind, TeamRole,
} from '@contextops/schema'

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

// ---------------------------------------------------------------------
//  화면 3 — 가져오기 (SPEC §5 documents · jobs · §9 화면 3)
// ---------------------------------------------------------------------

/**
 * 도는 job 을 **다시 두드리는 간격**. SPEC §9 화면 3 의 「polling」이 이 숫자다.
 *
 * ★ 왜 여기인가 — 두드릴 문(`fetchJobs`) 바로 옆이다. 화면 안에 적으면 화면이
 *   늘 때마다 다른 숫자가 생기고, 어느 화면은 200ms 로 두드린다.
 * ⚠ 이보다 짧게 만들지 마라 — 목록 질의 하나가 매번 DB 를 친다. 한 걸음(조각 하나)이
 *   몇 초 걸리는 일이라 2초보다 촘촘히 봐야 새로 보이는 것이 없다.
 */
export const JOB_POLL_MS = 2000

/**
 * job 응답의 **요약 모양**(`shape:'summary'`) — 목록이 내는 칸 그대로다.
 * ⚠ `result` 가 없다. 전문이 필요하면 `…/jobs/{jobId}`(`shape:'full'`) 를 따로 읽는다
 *   (`lib/ai/job.ts` 의 `AI_JOB_FIELDS` 표).
 */
export type AiJobSummary = {
  shape: 'summary' | 'full'
  id: string
  project_id: string
  feature: string
  status: AiJobStatus
  /** `null` 은 「0 걸음」이 아니라 **「아직 한 걸음도 보고 안 했다」**(총수를 모른다)다. */
  progress: { done: number; total: number; unit: string } | null
  input: unknown
  error_code: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  /** 마지막으로 이 job 이 **움직인** 시각. 아래 `stalled` 판정의 근거다. */
  updated_at: string
  /** 🔴 **서버가 낸 판정**이다 — 화면이 다시 재지 않는다 (잣대는 서버 전용 표에 있다). */
  stalled: boolean
}

/**
 * 🔴 **새로고침 뒤에 도는 job 을 되찾는 유일한 문**이다 (FINDINGS 58).
 * job id 는 `POST /documents` 의 응답에만 있어서, 화면이 그것만 들고 있으면
 * 새로고침 한 번에 진행 표시를 영원히 잃는다.
 */
export function fetchJobs(
  projectId: string,
  query: { feature?: string; status?: string; limit?: number },
): Promise<{ jobs: AiJobSummary[]; limit: number; offset: number }> {
  const q = new URLSearchParams()
  if (query.feature) q.set('feature', query.feature)
  if (query.status) q.set('status', query.status)
  if (query.limit !== undefined) q.set('limit', String(query.limit))
  const tail = q.toString()
  return apiJson(`/projects/${projectId}/jobs${tail ? `?${tail}` : ''}`)
}

/**
 * job 한 장의 **전문**(`shape:'full'`) — 목록에 없는 `result` 가 여기 있다 (FINDINGS 60).
 * ⚠ polling 이 두드리는 자리가 아니다. 끝난 job 을 **한 번** 읽어 「무엇이 나왔나」를
 *   말할 때만 부른다.
 */
export function fetchJob(projectId: string, jobId: string): Promise<AiJobSummary & { result: unknown }> {
  return apiJson(`/projects/${projectId}/jobs/${jobId}`)
}

/**
 * 문서를 올린다 → **구조화 job 이 같이 시작된다** (SPEC §5 · §7.1).
 * ⚠ 응답의 `job` 은 `{id,status}` 뿐인 **셋째 모양**이라 (FINDINGS 63) 진행 표시에
 *   쓰지 않는다 — 화면은 올린 뒤에도 `fetchJobs()` 가 낸 것만 그린다.
 */
export function createDocument(
  projectId: string,
  body: { title: string; kind: SourceDocumentKind; content: string },
): Promise<{ id: string; current_version_id: string; job: { id: string; status: AiJobStatus } }> {
  return post(`/projects/${projectId}/documents`, body)
}
