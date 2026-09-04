import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'

import { contextItems } from '../src/db/schema'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../src/app/api/v1/projects/[id]/repos/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { POST as batchDraft } from '../src/app/api/v1/projects/[id]/context-items/batch-draft/route'
import { PATCH as updateItem } from '../src/app/api/v1/projects/[id]/context-items/[itemId]/route'
import { getDb } from '../src/db/client'
import { dataOf, params, req, sessionJwt } from '../test/helpers/db'

// =====================================================================
//  🔴 **paylab 씨앗의 정본 하나** (SPEC §10.1)
//
//  ★ 왜 파일로 뺐나 — 이 서사를 쓰는 곳이 둘이 됐다: 관통(`walkthrough-publish.ts`)과
//    화면을 눈으로 보는 개발용 서버(`dev-server.ts`). 각자 적으면 **픽스처 서사가
//    갈린다** — 이 저장소에서 실제로 한 번 일어났던 고장이다
//    (docs/feedback/INBOX.md 「픽스처 서사는 결정 대기가 아니다」).
//    갈리면 관통이 보는 데이터와 사람이 화면에서 보는 데이터가 달라지고,
//    그러면 **화면 눈 판정이 관통을 증명하지 못한다.**
//
//  ★ 여기는 **채우기만** 한다. 「제대로 들어갔나」를 재는 것은 부르는 쪽의 일이다 —
//    관통은 그걸 check 로 세고, 개발용 서버는 그냥 쓴다. 채우는 코드에 판정을 섞으면
//    개발용 서버가 관통의 합격 기준을 짊어지게 된다.
//
//  ⚠ 부르기 전에 `freshDb()` 로 DB 를 꽂아 둬야 한다 (라우트가 `getDb()` 로 집어 간다).
//  ⚠ 서버가 문장을 지어내지 않는다 — 구조화는 §7.1(P3)의 일이다. 여기 있는 항목은
//    **사람이 화면에서 적는 것과 같은 자리**에 손으로 넣는다. 그게 지금 진짜로 도는 길이다.
// =====================================================================

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** 픽스처 문서를 그대로 올린다 (P1 — 문서 본문은 사용자가 **의도적으로** 올리는 것이다). */
function fixtureDoc(name: string): string {
  return readFileSync(join(root, 'fixtures', 'paylab-docs', name), 'utf8')
}

/** 문서에서 온 항목 초안. **근거가 문서의 문자 범위**라 P7 이 원문까지 이어진다. */
function fromDoc(id: string, type: string, versionId: string, extra: Record<string, unknown>) {
  return {
    id,
    type,
    scope: { kind: 'project' },
    priority: 60,
    confidence: 'high',
    tags: ['paylab'],
    source_refs: [{
      kind: 'source_document',
      document_version_id: versionId,
      start_char: 0,
      end_char: 400,
      heading_path: ['paylab 결제 서비스'],
    }],
    ...extra,
  }
}

/**
 * 항목 초안 (SPEC §10.1 의 기대 결과를 낼 재료).
 *
 * ⚠ **개수를 세는 곳을 만들지 마라** — 부르는 쪽은 `SeedResult.drafted` 를 읽는다.
 *   여기 한 줄을 더하면 관통의 검사가 저절로 따라온다. 숫자를 두 곳에 적으면
 *   픽스처를 늘린 사람이 관통을 빨갛게 만들고, 그 다음엔 검사 쪽 숫자를 고친다.
 *
 * ⚠ **문서에 없는 문장을 여기 적지 마라.** 모든 줄은 `source_refs` 로 원문까지
 *   이어져야 한다 (P7). 데모에 필요한 갈래가 있는데 문서에 근거가 없으면,
 *   지어내지 말고 「그 갈래는 이 픽스처로 못 보여 준다」고 남겨라.
 */
export function paylabDrafts(goalsVersion: string, roadmapVersion: string): Record<string, unknown>[] {
  return [
    fromDoc('item_mission_paylab', 'mission', goalsVersion, {
      title: 'PSP 가 흔들려도 결제는 흔들리지 않는다',
      body: '가맹점이 우리를 쓰는 이유는 하나다 — 밖이 실패해도 결제가 선다.',
      data: { statement: 'PSP 장애가 가맹점 결제로 번지지 않게 한다.', rationale: '가맹점이 우리를 쓰는 유일한 이유다.' },
    }),
    fromDoc('item_goal_success_rate', 'goal', goalsVersion, {
      title: '결제 승인 성공률 99.5%',
      body: 'PSP 장애 구간을 포함한 주간 성공률로 잰다.',
      data: { outcome: '결제 승인 성공률 99.5%', metric: '주간 승인 성공률', deadline: '2026-06-30' },
    }),
    fromDoc('item_policy_retry', 'policy', goalsVersion, {
      title: 'PSP 재시도는 지수 백오프 5회',
      body: '고정 간격 재시도는 금지한다 — 모든 인스턴스가 같은 박자로 다시 때린다.',
      data: { rule: 'PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다', severity: 'must', enforcement: 'review' },
    }),
    //  🔴 goals.md §3.3 — SPEC §10.1 이 말하는 「의도된 어긋남 3곳」의 셋째다
    //     (재시도 / 환불 SLA / **PII 로그 금지**). 앞의 둘만 항목이었고 이건 없었다.
    //  ★ **`enforcement: 'hook'` 인 이유** — 이 규칙은 사람 눈으로 못 지킨다.
    //    로그 호출은 저장소 전체에 흩어져 있어서 리뷰어가 매번 전부 볼 수 없다.
    //    자동으로 막을 수 있는 것은 hook 뿐이고, 그게 팀이 선언한 수단이다
    //    (M3 「PII 마스킹과 감사 로그」가 그걸 만드는 마일스톤이다).
    //    ⚠ 지금 픽스처 코드에 위반이 1곳 남아 있는 것과 모순이 아니다 — 강제 수단을
    //      선언한 것과 이미 있던 위반을 걷어낸 것은 다른 일이고, 그 차이가 M3 다.
    fromDoc('item_policy_pii_log', 'policy', goalsVersion, {
      title: '로그에 PII 를 남기지 않는다',
      body: '애플리케이션 로그·접근 로그·에러 리포트·웹훅 수신 덤프 전부 해당한다.',
      data: {
        rule: '카드번호·CVC·개인정보를 어떤 로그에도 남기지 않는다 — 결제 ID 와 이벤트 ID 만 남긴다',
        severity: 'must',
        enforcement: 'hook',
      },
    }),
    fromDoc('item_constraint_card', 'constraint', goalsVersion, {
      title: '카드 정보를 저장하지 않는다',
      body: '토큰만 받는다.',
      data: { statement: '카드 원본 정보를 저장하지 않는다 — 토큰만 받는다.' },
    }),
    fromDoc('item_road_m1', 'roadmap', roadmapVersion, {
      title: 'M1 — 재시도 정책 통일',
      body: '',
      data: {
        milestone_id: 'PL-M1',
        paths: ['src/payment'],
        done_when: ['재시도가 지수 백오프로 통일된다', '고정 간격 호출이 0건이다'],
      },
    }),
    fromDoc('item_policy_refund', 'policy', goalsVersion, {
      title: '환불은 24시간 안에 종결한다',
      body: '승인률과 부딪히면 환불 속도가 우선이다.',
      scope: { kind: 'domain', value: 'refund' },
      data: { rule: '환불 접수→종결을 24시간 안에 끝낸다', severity: 'must', enforcement: 'review' },
    }),
  ]
}

export type SeedResult = {
  /** owner 의 세션 JWT. 부르는 쪽이 그대로 `Authorization: Bearer` 로 쓴다. */
  owner: string
  teamId: string
  teamSlug: string
  projectId: string
  projectSlug: string
  goalsVersion: string
  roadmapVersion: string
  /** `batch-draft` 가 거부한 것들. 관통은 이게 비었는지를 잰다. */
  rejected: { index: number; issues: unknown[] }[]
  accepted: number
  /**
   * 보낸 초안의 수. **부르는 쪽은 개수를 자기가 적지 말고 이걸 읽어라** —
   * `paylabDrafts()` 에 한 줄을 더했을 때 검사가 저절로 따라오게 하려는 칸이다.
   */
  drafted: number
  /** active 로 바꾼 항목의 uuid 들. */
  itemUuids: string[]
}

/**
 * 팀 → 프로젝트 → 레포 → 문서 2개 → `paylabDrafts()` 전부 → 전부 `active`.
 * **발행은 하지 않는다** — 발행이 무엇을 하는지가 관통이 재는 것이고,
 * 여기서 미리 해 버리면 그 단계가 씨앗에 묻힌다.
 */
export async function seedPaylab(ownerSub: string): Promise<SeedResult> {
  const owner = sessionJwt(ownerSub)

  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }), params({}),
  ))
  const teamId = team.id as string

  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'paylab-api', slug: 'paylab-api' } }),
    params({ id: teamId }),
  ))
  const projectId = project.id as string

  await createRepo(
    req('POST', `/api/v1/projects/${projectId}/repos`, { auth: owner, body: { name: 'paylab-api' } }),
    params({ id: projectId }),
  )

  const goals = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
    auth: owner, body: { title: '팀 목표와 규칙', kind: 'goal', content: fixtureDoc('goals.md') },
  }), params({ id: projectId })))
  const roadmapDoc = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
    auth: owner, body: { title: '지난 분기 로드맵', kind: 'roadmap', content: fixtureDoc('old-roadmap.md') },
  }), params({ id: projectId })))

  const goalsVersion = goals.current_version_id as string
  const roadmapVersion = roadmapDoc.current_version_id as string

  const drafts = paylabDrafts(goalsVersion, roadmapVersion)
  const batch = await dataOf(await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
    auth: owner,
    body: { items: drafts, repo: 'paylab-api', scan_summary: { file_count: 42, languages: ['ts'] } },
  }), params({ id: projectId })))

  //  ⚠ 초안은 `draft` 로 들어온다. `active` 가 아니면 snapshot 에 안 들어가서
  //    **Pack 에 한 줄도 안 나온다** (SPEC §4.1 · docs/STATUS.md 의 같은 판단).
  const itemRows = await getDb()
    .select({ id: contextItems.id, publicId: contextItems.publicId })
    .from(contextItems)
    .where(eq(contextItems.projectId, projectId))
  for (const row of itemRows) {
    await updateItem(req('PATCH', `/api/v1/projects/${projectId}/context-items/${row.publicId}`, {
      auth: owner, body: { revision: 1, changes: { status: 'active' } },
    }), params({ id: projectId, itemId: row.publicId }))
  }

  return {
    owner,
    teamId,
    teamSlug: 'paylab',
    projectId,
    projectSlug: 'paylab-api',
    goalsVersion,
    roadmapVersion,
    rejected: batch.rejected as { index: number; issues: unknown[] }[],
    accepted: (batch.accepted as unknown[]).length,
    drafted: drafts.length,
    itemUuids: itemRows.map((r) => r.id),
  }
}
