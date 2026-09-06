import { ITEM_TYPES, SourceRef } from '@contextops/schema'
import type {
  AiJobStatus, AnswerSlotKey, ConflictChoice, ConflictKind, ConflictSeverity, ConflictStatus, ContextItemView,
  ItemStatus, ItemType, Manifest, MilestoneStatus, ProgressEvidence, ProgressSource,
  ProgressStatus, ProposalAction, ProposalItem, ProposalStatus, SourceDocumentKind, SyncStatus, TeamRole,
} from '@contextops/schema'

import { apiBlob, apiJson, apiText, patch, post } from './api'

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

/**
 * 🔴 게스트 세션 하나를 받아 온다 (`POST /demo/session` · SPEC §9 「게스트 데모」).
 * ⚠ 어디로 갈지는 **서버가 준 `entry_path`** 다 — 화면이 slug 를 조립하면 데모 주소가
 *   두 곳에 적히고, 한쪽만 바뀌면 배너가 말하는 팀과 실제로 들어가는 팀이 갈린다.
 */
export function startGuestSession(): Promise<{
  access_token: string
  expires_at: number
  entry_path: string
}> {
  //  ⚠ 본문이 없다. 이 문은 「누구인가」를 안 묻는다 — 그게 게스트의 정의다.
  return post('/demo/session', {})
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
): Promise<{ items: ContextItemView[]; limit: number; offset: number }> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filter)) if (v) q.set(k, v)
  const tail = q.toString()
  return apiJson(`/projects/${projectId}/context-items${tail ? `?${tail}` : ''}`)
}

/**
 * 🔴 **항목 하나의 상태를 바꾸는 유일한 문** (화면 5 드로어 · owner 만).
 *
 * ★ 왜 `item.id` 로 부르나 — 그게 `public_id` 이고, 라우트가 받는 이름도 그것이다
 *   (`PATCH /projects/{id}/context-items/{itemId}` · SPEC §5). 화면은 uuid 를 못 본다.
 * ⚠ `revision` 을 같이 보낸다 — 그 사이 남이 고쳤으면 409 `REVISION_CONFLICT` 다.
 *   보낸 값이 화면이 **손에 들고 있던** 개정이어야 잠금이 잠금 노릇을 한다.
 */
export function updateItemStatus(
  projectId: string,
  item: { id: string; revision: number },
  status: ItemStatus,
): Promise<ContextItemView> {
  return patch(`/projects/${projectId}/context-items/${item.id}`, {
    revision: item.revision,
    changes: { status },
  })
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

/**
 * Pack 한 벌을 zip 으로 (`GET …/packs/{semver}/zip` · SPEC §5). 화면 9 의 `manual` 이
 * 가리키는 길이다 — 플러그인을 못 까는 기기가 손으로 받는다.
 * ⚠ 서버가 이름을 안 주면 여기서 하나 짓는다 — 저장 대화상자에 빈 이름이 서면 안 된다.
 */
export async function downloadPackZip(projectId: string, semver: string): Promise<{ blob: Blob; filename: string }> {
  const got = await apiBlob(`/projects/${projectId}/packs/${semver}/zip`)
  return { blob: got.blob, filename: got.filename ?? `pack-v${semver}.zip` }
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
 * 🔴 **실패한 job 을 그대로 다시 굴린다** (`POST /projects/{id}/jobs/{jobId}/retry` ·
 * FINDINGS 59). 문서를 다시 올리지 않는다 — 그러면 같은 문서가 두 벌 생긴다.
 *
 * ⚠ 누를 수 있는지는 화면이 다시 적지 않는다 — `canRetryJob()`(`components/job-progress.tsx`)
 *   이 서버와 **같은 표**(`ERROR_STATUS[code].retryable`)를 읽는다. 그 조건을 안 보고
 *   부르면 `VALIDATION_FAILED` 다.
 * ⚠ 돌아오는 것은 `shape:'full'` 인 **되돌려진 job**(`queued`)이다. 화면은 그것을
 *   들고 있지 않고 목록을 다시 읽는다 (`fetchJobs`) — polling 이 그리는 자리가 하나다.
 */
export function retryJob(projectId: string, jobId: string): Promise<AiJobSummary & { result: unknown }> {
  return post(`/projects/${projectId}/jobs/${jobId}/retry`, {})
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

/**
 * §7.1 이 낸 것에서 **셀 수 있는 것만** 꺼낸다 (`lib/ai/job.ts` 의 `structureJob.run`).
 * ⚠ 모양이 다르면 `null` 이다 — 없는 칸을 0 으로 채우면 「0개를 찾았다」가 되어,
 *   못 읽은 것과 아무것도 못 찾은 것이 화면에서 같아진다.
 */
export function structureCounts(result: unknown): {
  items: number
  questions: number
  chunks: { used: number; total: number } | null
} | null {
  if (typeof result !== 'object' || result === null) return null
  const r = result as { items?: unknown; open_question_ids?: unknown; chunks?: unknown }
  if (!Array.isArray(r.items) || !Array.isArray(r.open_question_ids)) return null
  const chunks = r.chunks as { used?: unknown; total?: unknown } | undefined
  return {
    items: r.items.length,
    questions: r.open_question_ids.length,
    chunks: typeof chunks?.used === 'number' && typeof chunks.total === 'number'
      ? { used: chunks.used, total: chunks.total }
      : null,
  }
}

/**
 * 화면 3 의 **후보 고르기 카드**가 받는 한 줄 (그리는 것은
 * `components/structure-candidates.tsx`).
 *
 * ★ 왜 여기에 사나 — 이 파일이 「화면이 서버에 대해 아는 전부」다. 카드가 자기 모양을
 *   따로 적으면 `structureCandidates()` 가 칸을 하나 뺐을 때 **아무 데서도 안 걸린다**
 *   (`ConflictCard`·`QuestionRow`·`VersionRow` 가 여기 있는 것과 같은 이유다).
 */
export type StructureCandidate = {
  readonly id: string
  readonly type: ItemType
  readonly title: string
  /** §7.1 이 쓴 초안 본문. **빈 문자열일 수 있다** — `ItemBase.body` 에는 하한이 없다. */
  readonly body: string
  /** 첫 근거. 모양이 어긋나면 `null` 이고, 그때 카드는 「⚠ 근거 없음」이라고 말한다. */
  readonly evidence: SourceRef | null
}

/**
 * 🔴 **§7.1 이 낸 항목 후보를 사람이 읽을 만큼만 꺼낸다** (FINDINGS 84·86).
 *
 * ★ 왜 `ContextItemDraft` 를 통째로 내보내지 않나 — 화면이 필요한 것은 **고르는 데
 *   드는 것**과 **그 판단의 근거**뿐이다. 초안 전체를 화면 상태로 들고 있으면 다음 사람이
 *   그것을 **고쳐서 되보내는** 문을 만들게 되고, 그때 그 항목의 근거는 여전히 원문
 *   구간을 가리킨다 — 원문에 없는 문장이 원문을 근거로 배포된다 (P7).
 *   고치는 문은 항목이 된 **뒤**의 부분 갱신이다. 그래서 여기 나가는 `body`·`evidence` 는
 *   **읽기 전용**이다 — 되보내는 자리가 없다 (`acceptJobItems` 는 id 만 싣는다).
 * 🔴 **근거가 같이 나가는 것이 86 의 답이다** — 전에는 `id`·`type`·`title` 셋만
 *   냈고, 사람은 「재시도 정책 · policy」 다섯 글자만 보고 체크를 남겼다.
 *   「근거 없는 숫자·판정은 화면에 없다」(DESIGN_BRIEF §2-1)와 정반대였다.
 *   근거는 이미 데이터에 있었다 — `structureDocument()` 가 chunk offset 을 문서
 *   offset 으로 바꿔 `source_refs` 를 채워 둔다. **화면이 안 꺼냈을 뿐이다.**
 * ⚠ 첫 근거 하나만 낸다. 항목 하나가 들 수 있는 근거는 `SOURCE_REFS_MAX`(20)이지만
 *   §7.1 이 만드는 후보의 근거는 **언제나 한 칸**이다 (`structure.ts` 의 `source_refs`).
 *   목록을 통째로 내면 화면이 안 오는 경우를 그리게 된다.
 * ⚠ 모양이 다른 것은 **버리지 않고 건너뛴다** — 하나가 어긋났다고 나머지를 못 고르면
 *   그 문서는 통째로 막힌다. 근거만 어긋난 줄은 **줄째로 버리지 않고** `evidence:null`
 *   로 남긴다 — 카드가 「⚠ 근거 없음」이라고 말한다 (`EvidenceList`).
 */
export function structureCandidates(result: unknown): StructureCandidate[] {
  if (typeof result !== 'object' || result === null) return []
  const items = (result as { items?: unknown }).items
  if (!Array.isArray(items)) return []
  const out: StructureCandidate[] = []
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue
    const { id, type, title, body, source_refs } = raw as {
      id?: unknown; type?: unknown; title?: unknown; body?: unknown; source_refs?: unknown
    }
    if (typeof id !== 'string' || typeof title !== 'string') continue
    if (typeof type !== 'string' || !(ITEM_TYPES as readonly string[]).includes(type)) continue
    //  ⚠ 근거는 **스키마로 판다.** 손으로 칸을 세면 `kind` 마다 다른 모양을 놓치고,
    //     그러면 `EvidenceLink` 가 `undefined` 를 글자로 그린다.
    const first = Array.isArray(source_refs) ? source_refs[0] : undefined
    const parsed = first === undefined ? undefined : SourceRef.safeParse(first)
    out.push({
      id,
      type: type as ItemType,
      title,
      body: typeof body === 'string' ? body : '',
      evidence: parsed?.success === true ? parsed.data : null,
    })
  }
  return out
}

/**
 * 🔴 **고른 후보만 항목이 된다** (`POST /projects/{id}/jobs/{jobId}/items` · SPEC §7.1).
 * ⚠ 보내는 것은 **id 뿐**이다 — 본문을 실으면 화면이 모델 출력을 고쳐 되보내는 문이 된다.
 */
export function acceptJobItems(
  projectId: string,
  jobId: string,
  itemIds: readonly string[],
): Promise<{
  accepted: { index: number; id: string }[]
  rejected: { index: number; issues: { path: string; message: string }[] }[]
}> {
  return post(`/projects/${projectId}/jobs/${jobId}/items`, { item_ids: itemIds })
}

// ---------------------------------------------------------------------
//  화면 3 ③ · 화면 4 — 질문 카드 (SPEC §5 questions · §9 화면 3·4)
// ---------------------------------------------------------------------

/**
 * 🔴 **충돌 카드 한 장 — `toConflict()` 가 내는 칸 그대로다** (`lib/api/conflict.ts`).
 * 충돌을 돌려주는 라우트가 셋이고 (`/conflicts` · `/questions` · `:resolve`) 셋 다
 * 이 모양을 낸다.
 *
 * ⚠ **어느 칸이 비어 있는가는 `kind` 가 정한다** — `CONFLICT_KIND_RULES[kind].anchor`
 *   가 `items` 면 `a_item_id`/`b_item_id` 가 차고, `document` 면 `a_ref`/`b_ref` 가 차고,
 *   `none` 이면 넷 다 빈다. 화면은 그 표를 **읽어서** 무엇을 그릴지 고른다 —
 *   여기서 한쪽으로 접으면 근거로 가는 길을 잃는다 (P7 · `components/conflict-card.tsx`).
 * ⚠ `a_item_id` 는 uuid 가 아니라 **`item_<slug>`** 다 — `ContextItem.id` 와 같은 값이라
 *   항목 목록과 그대로 이어 붙는다 (`db/schema.ts` 의 복합 FK 가 그 이름을 잠근다).
 */
export type ConflictCard = {
  id: string
  project_id: string
  kind: ConflictKind
  a_item_id: string | null
  b_item_id: string | null
  a_ref: SourceRef | null
  b_ref: SourceRef | null
  question: string
  /** §7.2 가 매긴 심각도. **탐지가 만들지 않는 종류는 `null`** 이다 (DB CHECK). */
  severity: ConflictSeverity | null
  status: ConflictStatus
  resolution: { choice: ConflictChoice; note?: string } | null
  resolved_at: string | null
}

/**
 * 질문 카드 한 장 — **위와 같은 행**에서 화면 3 이 쓰는 칸만 좁힌 것이다.
 * ⚠ 손으로 다시 적지 마라. 두 벌이 되면 한쪽만 서버 응답을 따라가고, 갈린 쪽이
 *   조용히 `undefined` 를 그린다.
 * ⚠ `kind` 를 지우지 마라 — 씨앗 질문(`seed_question`)과 §7.1 이 문서를 읽다 남긴
 *   질문(`open_question`)은 **온 데가 다르고**, 화면 4 가 그 둘에 다른 배지를 단다.
 */
export type QuestionRow = Pick<ConflictCard, 'id' | 'kind' | 'question' | 'status'>

export function fetchQuestions(
  projectId: string,
  query: { status?: ConflictStatus; limit?: number } = {},
): Promise<{ questions: QuestionRow[]; limit: number; offset: number }> {
  const q = new URLSearchParams()
  if (query.status) q.set('status', query.status)
  if (query.limit !== undefined) q.set('limit', String(query.limit))
  const tail = q.toString()
  return apiJson(`/projects/${projectId}/questions${tail ? `?${tail}` : ''}`)
}

/**
 * 답을 보낸다 → **항목 초안이 같이 만들어진다** (SPEC §5 · §9 화면 3 ③ · 화면 4).
 *
 * 🔴 **한 번에 보낸다.** 라우트가 하나라도 어긋나면 전부 거부하는 이유와 같다 —
 *   한 장씩 보내다 중간에서 끊기면 사람은 어디까지 저장됐는지 모른다.
 *
 * 🔴 `save_as` 는 「이 답을 무엇으로 저장할까요」다 (`ANSWER_SLOTS` · FINDINGS 105).
 *   **열린 질문에서만** 싣는다 — 씨앗 질문은 자리가 표에 이미 있고, 실으면 400 이다.
 *   안 실으면 답만 기록되고 질문이 닫힌다.
 * ⚠ 조립한 초안을 보내지 않는다. 보내는 것은 **고른 자리의 이름**뿐이고, 답변을 그
 *   타입의 칸으로 옮기는 것은 서버다 — 그래야 그 표가 한 곳에 남는다.
 */
export function answerQuestions(
  projectId: string,
  answers: { question_id: string; answer: string; save_as?: AnswerSlotKey }[],
): Promise<{ resolved: string[]; created_item_ids: string[] }> {
  return post(`/projects/${projectId}/questions`, { answers })
}

// ---------------------------------------------------------------------
//  화면 4 — 정리 (SPEC §5 conflicts · §9 화면 4)
// ---------------------------------------------------------------------

/**
 * 결정을 기다리는 충돌·질문 전부. **한 번에 다 읽는다** — 종류별 거르기는 화면이 손에
 * 든 것에서 한다.
 *
 * ★ 왜 `?kind=` 로 서버를 다시 두드리지 않나 — 화면 머리가 「AI 가 찾은 것 N건」과
 *   「사람이 미리 물어 둔 질문 M장」을 **같이** 말한다. 걸러서 받으면 그 수가 걸러진
 *   뒤의 수가 되어, 칩을 누를 때마다 머리의 숫자가 바뀐다.
 */
export function fetchConflicts(
  projectId: string,
  query: { status?: ConflictStatus; kind?: ConflictKind; limit?: number } = {},
): Promise<{ conflicts: ConflictCard[]; limit: number; offset: number }> {
  const q = new URLSearchParams()
  if (query.status) q.set('status', query.status)
  if (query.kind) q.set('kind', query.kind)
  if (query.limit !== undefined) q.set('limit', String(query.limit))
  const tail = q.toString()
  return apiJson(`/projects/${projectId}/conflicts${tail ? `?${tail}` : ''}`)
}

/**
 * 충돌 한 장을 결정한다 (owner 만 · SPEC §5).
 * ⚠ 경로가 `:resolve` 가 아니라 `/resolve` 다 — 콜론은 Windows 파일 이름에 못 쓴다.
 * ⚠ 응답은 **갱신된 행 그 자체**다. 화면은 그것을 손에 든 목록에 갈아 끼운다 —
 *   목록에서 지우면 사람은 자기가 무엇을 골랐는지 확인할 자리를 잃는다.
 */
export function resolveConflict(
  conflictId: string,
  body: { choice: ConflictChoice; note?: string },
): Promise<ConflictCard> {
  return post(`/conflicts/${conflictId}/resolve`, body)
}

// ---------------------------------------------------------------------
//  화면 6 — Proposals (SPEC §5 proposals · §9 화면 6)
// ---------------------------------------------------------------------

/**
 * 제안 한 장이 화면에 오는 모양 — 읽는 문이 내는 칸 그대로다
 * (`lib/api/proposal.ts` 의 `PROPOSAL_READ_COLUMNS` · `toProposalWithAuthor()`).
 *
 * 🔴 **`author` 는 이름까지 온다** (FINDINGS 113). `author_id`(uuid) 를 대신한다 —
 *   둘 다 실으면 같은 사람이 두 칸에 앉고 화면이 어느 쪽을 읽을지 고르게 된다.
 *   ⚠ `null` 일 수 있다 (탈퇴·주인 없는 제안). 그때 화면은 uuid 를 대신 그리지 않는다.
 * 🔴 **`decided_by` 도 사람이다** (FINDINGS 116). uuid 를 대신하며, 서버는 `users` 를
 *   `alias(users, 'deciders')` 로 **한 번 더** join 해서 읽는다 (별칭이 없으면 작성자
 *   이름이 이 칸에 들어간다). ⚠ 결정 전이면 `null` 이다 — 화면은 그 칸을 안 그린다.
 * ⚠ `base_version_id` 는 nullable 이다 — 첫 발행 전의 제안이 있을 수 있다.
 */
export type ProposalRow = {
  id: string
  project_id: string
  author: UserRef | null
  status: ProposalStatus
  title: string
  summary: string
  base_version_id: string | null
  items: ProposalItem[]
  relates_to: string[]
  client_request_id: string
  decided_by: UserRef | null
  decided_at: string | null
  decision_note: string | null
  created_at: string
}

/**
 * 🔴 **상세가 목록보다 한 칸 더 든다 — `targets`**(`GET /proposals/{id}`).
 * 그 칸이 diff 의 **before** 다: `target_item_id` 가 가리키는 **지금 항목**이고,
 * 없는 대상은 아예 안 실린다 (화면이 「대상 항목을 찾을 수 없습니다」라고 말한다).
 */
export type ProposalDetail = ProposalRow & { targets: ContextItemView[] }

/**
 * ⚠ `status` 는 **서버가 거른다** (`ProposalQuery` · FINDINGS 112). 받아 놓고 화면에서
 *   거르면 `limit` 안에 우연히 들어온 것만 걸러지고, 51번째 「거절됨」은 영원히 안 보인다.
 */
export function fetchProposals(
  projectId: string,
  query: { limit?: number; status?: ProposalStatus } = {},
): Promise<{ proposals: ProposalRow[]; limit: number; offset: number }> {
  const q = new URLSearchParams()
  if (query.limit !== undefined) q.set('limit', String(query.limit))
  if (query.status !== undefined) q.set('status', query.status)
  const tail = q.toString()
  return apiJson(`/projects/${projectId}/proposals${tail ? `?${tail}` : ''}`)
}

/**
 * 제안 한 장 + 그 제안이 건드리는 항목의 지금 모습.
 * ⚠ 목록에서 골라 쓰지 마라 — 목록은 `?limit=50` 이라 51번째 제안의 상세를 못 연다.
 *   주소가 가리키는 것이 목록의 어느 쪽에 있느냐로 정해지면 그건 주소가 아니다.
 */
export function fetchProposal(proposalId: string): Promise<ProposalDetail> {
  return apiJson(`/proposals/${proposalId}`)
}

/**
 * 🔴 **제안에 사람이 내리는 결정** (`POST /proposals/{id}/submit|approve|reject`).
 *
 * ⚠ 어떤 결정을 **지금 쓸 수 있나**는 화면이 정하지 않는다 — `PROPOSAL_DECISIONS`
 *   (`@contextops/schema`) 한 표가 「어떤 상태에서 · 누가 · 사유가 필요한가」를 전부
 *   말하고, 화면도 서버도 그것을 읽는다. 여기서 조건을 다시 적으면 둘이 갈리고,
 *   **느슨한 쪽이 이긴다** (화면이 그린 버튼이 400 을 받는다).
 */
export function decideProposal(
  proposalId: string,
  action: ProposalAction,
  note?: string,
): Promise<ProposalRow> {
  return post(`/proposals/${proposalId}/${action}`, note === undefined ? {} : { note })
}

// ---------------------------------------------------------------------
//  화면 8 — Roadmap (SPEC §5 roadmap · progress/confirm · §9 화면 8)
// ---------------------------------------------------------------------

/**
 * SPEC §9 가 「Realtime」이라고 적은 두 화면(8 Roadmap · 9 Sync)이 스스로를 다시 읽는
 * 간격 — SPEC §14 절삭 순서 8번의 「Realtime(폴링 10초)」가 이 숫자다.
 *
 * ★ 왜 job 의 2초(`JOB_POLL_MS`)보다 느린가 — 두드리는 것이 **끝나는 일이 아니다.**
 *   구조화 job 은 몇 초 뒤 끝나고 그때 멈추지만, 로드맵과 기기 표는 사람이 화면을 열어
 *   둔 내내 돈다. 촘촘히 치면 팀장이 하루 종일 열어 두는 화면 하나가 DB 를 계속 친다.
 * ★ 왜 화면별 이름이 아닌가 — **둘째 사용자가 생겼다** (화면 9 · 56바퀴까지는 화면 8
 *   하나였다). 화면마다 상수를 따로 두면 한쪽만 고쳐지고, 그러면 같은 「Realtime」이
 *   화면마다 다른 속도가 된다 (CLAUDE.md 「수치를 하드코딩하지 마라」).
 * ⚠ 이 숫자를 화면 안에 적지 마라 — 「실시간」을 흉내 내려고 어느 화면이 500ms 로
 *   내리는 날이 온다. 이 제품이 말할 수 있는 것은 늘 「마지막으로 본 것이 언제인가」다.
 */
export const REALTIME_POLL_MS = 10_000

/**
 * 진행 보고 한 건이 화면에 오는 모양 (roadmap 라우트의 `toEvent`).
 *
 * 🔴 **`device_id`·`confirmed_by` 가 없다** (P5). 서버가 안 싣는다 — 여기에 칸을 만들면
 *   다음 사람이 서버에 그 칸을 더하게 되고, 그 순간 이 화면은 감시 도구가 된다.
 */
export type ProgressEventView = {
  id: string
  status: ProgressStatus
  summary: string
  at: string
  source: ProgressSource
  context_version: string
  /** 🔴 P1 — 경로·줄·커밋뿐이다. 코드 본문은 서버에 없다. */
  evidence: ProgressEvidence[]
  confirmed_at: string | null
}

/** 마일스톤 한 줄 — **행이 마일스톤이다** (P5). 사람이 행이 되면 이 제품은 실패다. */
export type RoadmapMilestone = {
  milestone: string
  /** `YYYY-MM-DD` — 발행된 Manifest 의 `due` 그대로. 없으면 `null` 이고 화면은 그 칸을 비운다 (FINDINGS 111). */
  due: string | null
  paths: string[]
  done_when: { text: string; evidence_count: number; last_event: ProgressEventView | null }[]
  /** 프로젝트 단위의 열린 충돌 수 — 아직 마일스톤별로 못 센다 (라우트 주석). */
  conflicts: number
  last_report_at: string | null
  status: MilestoneStatus
  /**
   * 🔴 **지금 [완료 확인] 을 누를 수 있는 보고 하나.** `null` 이면 그 버튼이 없다 —
   * 「확정할 것이 없다」와 「권한이 없다」는 화면에서 다르게 보여야 한다.
   */
  confirmable: ProgressEventView | null
}

export type Roadmap = {
  /** 발행 전에는 `null` 이다 — 「마일스톤이 0개인 프로젝트」와 구별된다. */
  context_version: string | null
  milestones: RoadmapMilestone[]
  /** 지금 Manifest 의 마일스톤이 아닌 보고 (`status:'none'` 포함 · 상한 있음). */
  off_roadmap: ProgressEventView[]
  /** 자르기 **전**의 수. 화면은 이 둘을 비교해 「N건 중 M건만 보임」을 말한다. */
  off_roadmap_total: number
}

export function fetchRoadmap(projectId: string): Promise<Roadmap> {
  return apiJson(`/projects/${projectId}/roadmap`)
}

/**
 * 🔴 **「agent 는 스스로 완료를 선언하지 못한다」의 사람 쪽 절반** (owner 만 · SPEC §5).
 * ⚠ 경로가 `/progress/{id}/confirm` 이다 — 프로젝트 밑이 아니다 (보고 id 가 전역 uuid).
 * ⚠ `done_candidate` 가 아닌 보고를 보내면 400 이다. 그래서 화면은 서버가 준
 *   `confirmable` 이 있을 때만 버튼을 그린다 — 화면이 상태를 다시 세지 않는다.
 */
export function confirmProgress(eventId: string): Promise<ProgressEventView> {
  return post(`/progress/${eventId}/confirm`, {})
}

// ---------------------------------------------------------------------
//  화면 9 — Sync (SPEC §5 sync-status · §6 동일성 판정 · §9 화면 9)
// ---------------------------------------------------------------------

/** 화면이 사람에 대해 아는 전부 — 서버의 `lib/api/user.ts` 와 같은 모양이다. */
export type UserRef = { id: string; name: string }

/**
 * 기기 한 줄 (`GET /projects/{id}/sync-status`).
 *
 * 🔴 **`status` 를 화면이 다시 세지 않는다.** `unknown` 을 매기는 자리는 서버의
 *   `statusOfDevice()` 하나다 (FINDINGS 16). 화면은 `reported_at === null` 을 보고
 *   「보고 없음」이라고 **다시 판정하지 않는다** — 그러면 판정이 두 곳이 된다.
 * ⚠ `manifest_hash` 는 마지막 보고가 대조한 해시다. 보고가 없으면 `null` 이다.
 */
export type DeviceSyncRow = {
  device_id: string
  device_name: string
  user: UserRef
  status: SyncStatus
  version: string | null
  manifest_hash: string | null
  reported_at: string | null
}

export function fetchSyncStatus(projectId: string): Promise<{ devices: DeviceSyncRow[] }> {
  return apiJson(`/projects/${projectId}/sync-status`)
}
