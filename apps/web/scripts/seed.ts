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

/**
 * 픽스처 문서 하나 — **올라간 버전의 uuid 와 원문을 같이** 든다.
 *
 * ★ 왜 원문까지 들고 다니나 — 근거의 `start_char` 를 **문서에서 재려고** 그런다.
 *   손으로 적으면 문서가 한 줄만 바뀌어도 조용히 딴 데를 가리키고, 아무도 안 센다.
 *   실제로 일곱 항목이 전부 `0-400` 을 가리켰고 그중 여섯은 그 범위 안에 그 항목이
 *   주장하는 문장이 없었다 (docs/feedback/FINDINGS.md **90**).
 */
export type FixtureDoc = {
  /** `fixtures/paylab-docs/` 안의 파일 이름. 어긋났을 때 사람이 읽는 이름이다 */
  name: string
  /** 올린 뒤 서버가 준 문서 버전 uuid — 근거가 **어느 문서**를 가리키나 */
  versionId: string
  /** 올린 것과 **같은** 본문. 문장 위치를 여기서 잰다 */
  text: string
}

/**
 * 「이 항목의 근거를 따라가면 원문의 이 문장이 나와야 한다」 — P7 의 기대값.
 *
 * ★ 왜 픽스처 밖으로 내나 — 관통이 「Pack 태그를 따라가면 그 문장이 있나」를 세려면
 *   기대값이 필요한데, 그걸 검사 쪽에 **다시 적으면** 픽스처와 갈라진다.
 *   여기 한 곳에서 나온 것을 검사는 **읽기만** 한다.
 */
export type EvidenceExpectation = {
  itemId: string
  /** 근거 문서의 파일 이름 (`fixtures/paylab-docs/`) */
  docName: string
  documentVersionId: string
  /** 근거 범위 안에 **반드시** 있어야 하는 원문 문장 */
  quote: string
}

/** 씨앗 초안 하나 + 그 근거의 기대값. */
export type PaylabDraft = {
  /** `batch-draft` 에 그대로 싣는 몸 (스키마가 `.strict()` 라 여분의 키를 못 싣는다) */
  draft: Record<string, unknown>
  evidence: EvidenceExpectation
}

/**
 * `index` 가 속한 마크다운 제목 사슬 (`['# 머리', '## 절', '### 항']` 의 글자만).
 *
 * ★ 왜 계산하나 — 손으로 적으면 문서가 바뀔 때 조용히 거짓이 된다. 실제로 일곱 항목의
 *   `heading_path` 가 전부 `['paylab 결제 서비스']` 였고, 그중 하나는 그런 제목이
 *   아예 없는 문서를 가리켰다 (FINDINGS 90).
 */
function headingPathAt(text: string, index: number): string[] {
  const path: (string | undefined)[] = []
  let at = 0
  for (const line of text.split('\n')) {
    if (at > index) break
    const m = /^(#{1,6})\s+(.+)$/.exec(line)
    if (m?.[1] !== undefined && m[2] !== undefined) {
      const depth = m[1].length
      path.length = Math.min(path.length, depth - 1)
      path[depth - 1] = m[2].trim().slice(0, 200)
    }
    at += line.length + 1
  }
  //  `##` 없이 `###` 가 나오면 가운데가 빈다 — 빈 칸을 글자로 그리지 않는다.
  return path.filter((h): h is string => h !== undefined)
}

/**
 * 문서에서 온 항목 초안. **근거가 문서의 문자 범위**라 P7 이 원문까지 이어진다.
 *
 * 🔴 `quote` 는 **원문에 그대로 있는 문장**이다. 범위는 그 문장을 문서에서 찾아 잰다 —
 *    적는 게 아니라 재는 것이라 문서가 바뀌면 따라 움직이거나, 못 찾고 **던진다.**
 * ⚠ 못 찾을 때 조용히 `0` 으로 떨어지면 FINDINGS 90 과 똑같은 상태가 된다 —
 *   태그는 멀쩡히 붙어 있고 따라가면 딴 문장이 나온다. 그래서 던진다.
 * ⚠ 두 번 이상 나오는 문장도 던진다 — 어느 쪽을 가리키는지 우리가 모르면
 *   심사자가 따라갔을 때 우리가 뜻한 자리가 아닐 수 있다.
 */
export function fromDoc(
  id: string, type: string, doc: FixtureDoc, quote: string, extra: Record<string, unknown>,
): PaylabDraft {
  const start = doc.text.indexOf(quote)
  const head = quote.split('\n')[0] ?? quote
  if (start < 0) throw new Error(`[seed] ${id}: 근거 문장을 ${doc.name} 에서 못 찾았다 — "${head}"`)
  if (doc.text.indexOf(quote, start + 1) >= 0) {
    throw new Error(`[seed] ${id}: 근거 문장이 ${doc.name} 에 두 번 이상 있다 — "${head}"`)
  }
  return {
    draft: {
      id,
      type,
      scope: { kind: 'project' },
      priority: 60,
      confidence: 'high',
      tags: ['paylab'],
      source_refs: [{
        kind: 'source_document',
        document_version_id: doc.versionId,
        start_char: start,
        end_char: start + quote.length,
        heading_path: headingPathAt(doc.text, start),
      }],
      ...extra,
    },
    evidence: { itemId: id, docName: doc.name, documentVersionId: doc.versionId, quote },
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
 *
 * 🔴 넷째 인자가 **원문에서 그대로 잘라 온 문장**이다. 근거 범위는 그 문장을 문서에서
 *    찾아 잰다 — 손으로 적는 숫자가 아니다 (FINDINGS 90). 문서를 고쳤는데 여기를
 *    안 고치면 씨앗이 **던져서** 관통이 그 자리에서 멈춘다.
 *
 * ⚠ `old-roadmap.md` 에서 오는 항목은 **하나도 없다.** 그 문서는 「폐기된 로드맵
 *   (stale 탐지용)」이고 (SPEC §10.1), 지금 항목이 주장하는 M1 은 goals.md §4 에서 왔다.
 *   전에는 `item_road_m1` 이 old-roadmap.md 를 가리켰는데 그 문서의 M1 은
 *   「웹훅 수신 v1」이라 **내용이 아예 다른 문서**를 근거라고 적고 있었다.
 */
export function paylabDrafts(goals: FixtureDoc): PaylabDraft[] {
  return [
    fromDoc('item_mission_paylab', 'mission', goals,
      '가맹점이 우리를 쓰는 이유는\n하나다 — **PSP 가 흔들려도 결제가 흔들리지 않는 것.**', {
        title: 'PSP 가 흔들려도 결제는 흔들리지 않는다',
        body: '가맹점이 우리를 쓰는 이유는 하나다 — 밖이 실패해도 결제가 선다.',
        data: { statement: 'PSP 장애가 가맹점 결제로 번지지 않게 한다.', rationale: '가맹점이 우리를 쓰는 유일한 이유다.' },
      }),
    fromDoc('item_goal_success_rate', 'goal', goals,
      '| G1 | 결제 승인 성공률 99.5% | PSP 장애 구간을 포함한 주간 성공률 | 2026-06-30 |', {
        title: '결제 승인 성공률 99.5%',
        body: 'PSP 장애 구간을 포함한 주간 성공률로 잰다.',
        data: { outcome: '결제 승인 성공률 99.5%', metric: '주간 승인 성공률', deadline: '2026-06-30' },
      }),
    fromDoc('item_policy_retry', 'policy', goals,
      'PSP 호출이 실패하면 **최대 5회까지 재시도**한다. 재시도 간격은 **지수 백오프**로\n'
      + '1초 → 2초 → 4초 → 8초 → 16초로 늘리고, 각 간격에 ±20% 지터를 더한다.\n\n'
      + '**고정 간격 재시도는 금지한다.**', {
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
    fromDoc('item_policy_pii_log', 'policy', goals,
      '다음은 **어떤 로그에도** 남기지 않는다. 애플리케이션 로그·접근 로그·에러 리포트·\n'
      + '웹훅 수신 덤프 전부 해당한다.', {
        title: '로그에 PII 를 남기지 않는다',
        body: '애플리케이션 로그·접근 로그·에러 리포트·웹훅 수신 덤프 전부 해당한다.',
        data: {
          rule: '카드번호·CVC·개인정보를 어떤 로그에도 남기지 않는다 — 결제 ID 와 이벤트 ID 만 남긴다',
          severity: 'must',
          enforcement: 'hook',
        },
      }),
    fromDoc('item_constraint_card', 'constraint', goals,
      '우리는 카드 정보를 저장하지 않는다. 토큰만 받는다.', {
        title: '카드 정보를 저장하지 않는다',
        body: '토큰만 받는다.',
        data: { statement: '카드 원본 정보를 저장하지 않는다 — 토큰만 받는다.' },
      }),
    //  🔴 근거는 **goals.md §4 의 M1** 이다 (전에는 폐기된 old-roadmap.md 를 가리켰다 —
    //     그 문서의 M1 은 「웹훅 수신 v1」이고 경로도 `src/webhook/` 라 딴 마일스톤이었다).
    //  ⚠ 그래서 제목·경로·완료 기준도 **그 문단이 말하는 것**으로 맞췄다. 근거만 옮기고
    //    글자를 그대로 두면 태그는 맞는 자리를 가리키는데 읽어 보면 딴 소리가 적혀 있다.
    fromDoc('item_road_m1', 'roadmap', goals,
      '### M1 — 재시도·타임아웃 정리 (2026-04-30)\n\n'
      + '- 경로: `src/payment/`, `src/psp/`\n'
      + '- 완료 기준:\n'
      + '  - PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다\n'
      + '  - 모든 외부 호출에 타임아웃이 걸려 있다\n'
      + '  - 재시도 횟수와 간격이 설정값으로 빠져 있다 (배포 없이 바꾼다)', {
        title: 'M1 — 재시도·타임아웃 정리',
        body: '',
        data: {
          milestone_id: 'PL-M1',
          paths: ['src/payment', 'src/psp'],
          done_when: [
            'PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다',
            '모든 외부 호출에 타임아웃이 걸려 있다',
            '재시도 횟수와 간격이 설정값으로 빠져 있다',
          ],
        },
      }),
    fromDoc('item_policy_refund', 'policy', goals,
      '환불 요청은 **접수 후 24시간 안에 종결**한다.', {
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
  /**
   * 올린 픽스처 문서 둘. **uuid 와 원문을 같이** 든다 —
   * 관통이 「Pack 태그의 `#start-end` 를 원문에서 잘라 보면 그 문장이 있나」를 잰다 (P7).
   */
  goals: FixtureDoc
  roadmap: FixtureDoc
  /** `batch-draft` 가 거부한 것들. 관통은 이게 비었는지를 잰다. */
  rejected: { index: number; issues: unknown[] }[]
  accepted: number
  /**
   * 보낸 초안의 수. **부르는 쪽은 개수를 자기가 적지 말고 이걸 읽어라** —
   * `paylabDrafts()` 에 한 줄을 더했을 때 검사가 저절로 따라오게 하려는 칸이다.
   */
  drafted: number
  /**
   * 초안마다 「근거를 따라가면 원문의 이 문장이 나와야 한다」.
   * **부르는 쪽은 기대 문장을 자기가 적지 말고 이걸 읽어라** — 두 곳에 적으면 갈라지고,
   * 갈라지면 검사가 픽스처가 아니라 자기 자신을 재게 된다.
   */
  evidence: EvidenceExpectation[]
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

  //  ⚠ 올린 본문을 그대로 들고 있는다 — 근거 범위를 **이 글자들 위에서** 잰다.
  //    문서를 다시 읽어 재면 올린 것과 다른 글자를 잴 위험이 생긴다.
  const goalsText = fixtureDoc('goals.md')
  const roadmapText = fixtureDoc('old-roadmap.md')

  const goalsDoc = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
    auth: owner, body: { title: '팀 목표와 규칙', kind: 'goal', content: goalsText },
  }), params({ id: projectId })))
  const roadmapDoc = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
    auth: owner, body: { title: '지난 분기 로드맵', kind: 'roadmap', content: roadmapText },
  }), params({ id: projectId })))

  const goals: FixtureDoc = { name: 'goals.md', versionId: goalsDoc.current_version_id as string, text: goalsText }
  const roadmap: FixtureDoc = { name: 'old-roadmap.md', versionId: roadmapDoc.current_version_id as string, text: roadmapText }

  const drafts = paylabDrafts(goals)
  const batch = await dataOf(await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
    auth: owner,
    body: { items: drafts.map((d) => d.draft), repo: 'paylab-api', scan_summary: { file_count: 42, languages: ['ts'] } },
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
    goals,
    roadmap,
    rejected: batch.rejected as { index: number; issues: unknown[] }[],
    accepted: (batch.accepted as unknown[]).length,
    drafted: drafts.length,
    evidence: drafts.map((d) => d.evidence),
    itemUuids: itemRows.map((r) => r.id),
  }
}
