import type { PGlite } from '@electric-sql/pglite'
import { and, asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CONFLICT_CHOICES, CONFLICT_KIND_RULES, CONFLICT_KINDS, ContextItem, QUESTION_CONFLICT_KINDS,
  RESOLUTION_ITEM_OUTCOME, SOURCE_REFS_MAX,
  type ConflictChoice, type ConflictKind, type SourceRef,
} from '@contextops/schema'

import { conflicts, contextItemRevisions, contextItems, repos, sourceDocumentVersions, sourceDocuments } from '../src/db/schema'
import type { Db } from '../src/db/client'
import { RESOLUTION_OUTCOME } from '../src/lib/api/conflict'
import { SEED_QUESTIONS } from '../src/lib/api/seed-questions'
import { GET as listTeams, POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../src/app/api/v1/projects/[id]/repos/route'
import { POST as createToken } from '../src/app/api/v1/projects/[id]/tokens/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { GET as listItems } from '../src/app/api/v1/projects/[id]/context-items/route'
import { POST as batchDraft } from '../src/app/api/v1/projects/[id]/context-items/batch-draft/route'
import { PATCH as updateItem } from '../src/app/api/v1/context-items/[id]/route'
import { GET as listConflicts } from '../src/app/api/v1/projects/[id]/conflicts/route'
import { POST as resolveConflict } from '../src/app/api/v1/conflicts/[id]/resolve/route'
import { GET as listQuestions, POST as answerQuestions } from '../src/app/api/v1/projects/[id]/questions/route'
import { GET as health } from '../src/app/api/v1/health/route'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'
import { batchBody, draft } from './helpers/fixtures'

// =====================================================================
//  API 1군 — teams · projects · repos · documents · context-items ·
//  conflicts · questions (SPEC §5 · docs/PLAN.md P1 둘째 행)
//
//  ★ 응답을 계약으로 되판다 (`ContextItem.parse`). 「200 이 났다」는 「옳은 것을
//    돌려줬다」가 아니다 — 모양이 갈리면 화면이 런타임에 깨진다.
// =====================================================================

let pg: PGlite | undefined
let db: Db

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
})

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

/** owner · 팀 · 프로젝트 · 레포까지 전부 **라우트를 거쳐** 만든다. */
async function seed() {
  const owner = sessionJwt('owner-sub')
  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: 'paylab' } }),
    params({}),
  ))
  const teamId = team.id as string
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'API', slug: 'api' } }),
    params({ id: teamId }),
  ))
  const projectId = project.id as string
  await createRepo(
    req('POST', `/api/v1/projects/${projectId}/repos`, { auth: owner, body: { name: 'paylab-api' } }),
    params({ id: projectId }),
  )
  return { owner, teamId, projectId }
}

describe('health — 공개 · DB 를 실제로 두드린다', () => {
  it('DB 가 붙어 있으면 200 · ok 와 db 가 참이다', async () => {
    const res = await health(req('GET', '/api/v1/health'), params({}))
    expect(res.status).toBe(200)
    expect(await dataOf(res)).toEqual({ ok: true, db: true, version: 'v1' })
  })

  it('DB 가 없으면 503 이다 — 200 으로 덮지 않는다', async () => {
    await closeDb(pg)
    pg = undefined
    const res = await health(req('GET', '/api/v1/health'), params({}))
    expect(res.status).toBe(503)
    expect((await dataOf(res)).db).toBe(false)
  })
})

describe('teams · projects — 만든 사람이 owner 다', () => {
  it('팀을 만들면 만든 사람이 owner 로 들어간다 (그래서 바로 프로젝트를 만들 수 있다)', async () => {
    const { projectId } = await seed()
    expect(projectId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('같은 slug 로 팀을 두 번 만들 수 없다', async () => {
    const owner = sessionJwt('dup-sub')
    const body = { name: 'Paylab', slug: 'paylab' }
    expect((await createTeam(req('POST', '/api/v1/teams', { auth: owner, body }), params({}))).status).toBe(201)
    const second = await createTeam(req('POST', '/api/v1/teams', { auth: owner, body }), params({}))
    expect(second.status).toBe(400)
    expect((await errorOf(second)).code).toBe('VALIDATION_FAILED')
  })

  it('계약에 없는 키는 400 이다 — 이게 P1 의 통로가 없다는 뜻이다', async () => {
    const owner = sessionJwt('strict-sub')
    const res = await createTeam(req('POST', '/api/v1/teams', {
      auth: owner, body: { name: 'Paylab', slug: 'paylab', source_code: 'console.log(1)' },
    }), params({}))
    expect(res.status).toBe(400)
    expect((await errorOf(res)).code).toBe('VALIDATION_FAILED')
  })

  it('JSON 이 아니면 400 이다', async () => {
    const owner = sessionJwt('bad-json-sub')
    const res = await createTeam(req('POST', '/api/v1/teams', { auth: owner, raw: '{not json' }), params({}))
    expect(res.status).toBe(400)
  })
})

// =====================================================================
//  `GET /teams` — 화면이 주소의 slug 를 uuid 로 바꾸는 유일한 문 (SPEC §5)
//
//  ★ 이게 없으면 로그인한 사람이 **자기 프로젝트로 갈 수가 없다** — 화면 주소는
//    slug 인데(SPEC §9) 라우트는 전부 uuid 를 받는다.
// =====================================================================

describe('GET /teams — 내 팀과 그 안의 프로젝트', () => {
  it('내가 만든 팀과 프로젝트가 같이 온다 (화면이 두 번 부르지 않게)', async () => {
    const { owner, projectId } = await seed()
    const data = await dataOf(await listTeams(req('GET', '/api/v1/teams', { auth: owner }), params({})))
    const teams = data.teams as { slug: string; role: string; projects: { id: string; slug: string }[] }[]
    expect(teams).toHaveLength(1)
    expect(teams[0]?.slug).toBe('paylab')
    expect(teams[0]?.role).toBe('owner')
    expect(teams[0]?.projects.map((p) => p.id)).toEqual([projectId])
  })

  it('🔴 남의 팀은 목록에 없다 — 존재 자체가 안 보인다', async () => {
    await seed()
    const stranger = sessionJwt('stranger-sub')
    const data = await dataOf(await listTeams(req('GET', '/api/v1/teams', { auth: stranger }), params({})))
    //  ⚠ 소속이 하나도 없어도 500 이 아니라 빈 목록이다 (`inArray(…, [])` 를 안 보낸다).
    expect(data.teams).toEqual([])
  })

  it('인증이 없으면 401 이다', async () => {
    const res = await listTeams(req('GET', '/api/v1/teams'), params({}))
    expect(res.status).toBe(401)
  })

  it('기기 토큰으로는 볼 수 없다 — 토큰은 프로젝트 안의 물건이다', async () => {
    const { owner, projectId } = await seed()
    const token = (await dataOf(await createToken(
      req('POST', `/api/v1/projects/${projectId}/tokens`, { auth: owner, body: { device_name: 'mac' } }),
      params({ id: projectId }),
    ))).token as string
    const res = await listTeams(req('GET', '/api/v1/teams', { auth: token }), params({}))
    expect(res.status).toBe(403)
    expect((await errorOf(res)).code).toBe('FORBIDDEN')
  })
})

describe('documents — 문서 본문은 의도적으로 받는다 (SPEC §5)', () => {
  it('올리면 문서와 개정 1이 생기고 current_version_id 가 이어진다', async () => {
    const { owner, projectId } = await seed()
    const res = await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
      auth: owner, body: { title: 'goals.md', kind: 'goal', content: '재시도는 5회다.' },
    }), params({ id: projectId }))
    expect(res.status).toBe(201)
    const data = await dataOf(res)
    expect(data.content_hash).toMatch(/^[0-9a-f]{64}$/)

    const [doc] = await db
      .select({ current: sourceDocuments.currentVersionId })
      .from(sourceDocuments)
      .where(eq(sourceDocuments.id, data.id as string))
    expect(doc!.current).toBe(data.current_version_id)

    const versions = await db.select({ revision: sourceDocumentVersions.revision }).from(sourceDocumentVersions)
    expect(versions).toEqual([{ revision: 1 }])
  })

  it('kind 표에 없는 값은 400 이다', async () => {
    const { owner, projectId } = await seed()
    const res = await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
      auth: owner, body: { title: 'x', kind: 'blog', content: 'a' },
    }), params({ id: projectId }))
    expect(res.status).toBe(400)
  })
})

describe('context-items — batch-draft 는 항목별로 갈라 받는다', () => {
  it('옳은 것은 받고 어긋난 것만 index 와 함께 돌려준다', async () => {
    const { owner, projectId } = await seed()
    const res = await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner,
      body: batchBody([
        draft('item_paylab_refund'),
        { id: 'NOT-AN-ITEM-ID', type: 'policy' },
        draft('item_paylab_pii', 'constraint'),
      ]),
    }), params({ id: projectId }))

    expect(res.status).toBe(200)
    const data = await dataOf(res)
    expect(data.accepted).toEqual([
      { index: 0, id: 'item_paylab_refund' },
      { index: 2, id: 'item_paylab_pii' },
    ])
    const rejected = data.rejected as { index: number }[]
    expect(rejected).toHaveLength(1)
    expect(rejected[0]!.index).toBe(1)
  })

  it('status 를 실어 보내도 서버가 draft 로 만든다 — 승인 없이 active 가 될 길이 없다', async () => {
    const { owner, projectId } = await seed()
    //  계약에 `status` 자리가 없으므로 통째로 거부된다. 통과했다면 그게 구멍이다.
    const res = await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner, body: batchBody([draft('item_sneaky', 'policy', { status: 'active' })]),
    }), params({ id: projectId }))
    expect((await dataOf(res)).accepted).toEqual([])

    await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner, body: batchBody([draft('item_okay')]),
    }), params({ id: projectId }))
    const rows = await db.select({ status: contextItems.status }).from(contextItems)
    expect(rows).toEqual([{ status: 'draft' }])
  })

  it('등록되지 않은 레포 이름이면 전부 거부한다', async () => {
    const { owner, projectId } = await seed()
    const res = await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner, body: batchBody([draft('item_alpha')], 'typo-repo'),
    }), params({ id: projectId }))
    expect((await dataOf(res)).accepted).toEqual([])
    expect(await db.select().from(contextItems)).toHaveLength(0)
  })

  it('scan_summary 가 레포에 저장된다 — 보내는데 아무도 안 읽는 필드가 아니다', async () => {
    const { owner, projectId } = await seed()
    await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner, body: batchBody([draft('item_scan')]),
    }), params({ id: projectId }))
    const [repo] = await db
      .select({ scan: repos.lastScan, at: repos.lastScanAt })
      .from(repos)
      .where(eq(repos.projectId, projectId))
    expect(repo!.scan?.file_count).toBe(42)
    expect(repo!.at).not.toBeNull()
  })

  it('같은 id 를 두 번 보내면 둘째는 거부된다 (요청 안에서도, 요청 사이에서도)', async () => {
    const { owner, projectId } = await seed()
    const twice = await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner, body: batchBody([draft('item_same'), draft('item_same')]),
    }), params({ id: projectId }))
    expect((await dataOf(twice)).accepted).toHaveLength(1)

    const later = await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner, body: batchBody([draft('item_same')]),
    }), params({ id: projectId }))
    expect((await dataOf(later)).accepted).toEqual([])
    expect(await db.select().from(contextItems)).toHaveLength(1)
  })

  it('목록이 계약(ContextItem)을 그대로 지킨다 · 필터가 실제로 갈린다', async () => {
    const { owner, projectId } = await seed()
    await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner,
      body: batchBody([
        draft('item_policy_one', 'policy'),
        draft('item_constraint_one', 'constraint', { scope: { kind: 'domain', value: 'billing' } }),
      ]),
    }), params({ id: projectId }))

    const all = await dataOf(await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items`, { auth: owner }),
      params({ id: projectId }),
    ))
    const items = all.items as unknown[]
    expect(items).toHaveLength(2)
    //  🔴 응답이 계약을 통과해야 한다. 여기서 빨개지면 표와 응답이 갈린 것이다.
    for (const item of items) expect(() => ContextItem.parse(item)).not.toThrow()

    const byType = await dataOf(await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items?type=policy`, { auth: owner }),
      params({ id: projectId }),
    ))
    expect((byType.items as { id: string }[]).map((i) => i.id)).toEqual(['item_policy_one'])

    const byScope = await dataOf(await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items?scope=domain:billing`, { auth: owner }),
      params({ id: projectId }),
    ))
    expect((byScope.items as { id: string }[]).map((i) => i.id)).toEqual(['item_constraint_one'])

    const byStatus = await dataOf(await listItems(
      req('GET', `/api/v1/projects/${projectId}/context-items?status=active`, { auth: owner }),
      params({ id: projectId }),
    ))
    expect(byStatus.items).toEqual([])
  })
})

describe('context-items 부분 갱신 — 낙관적 잠금 (SPEC §5)', () => {
  async function seedItem() {
    const { owner, projectId } = await seed()
    await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner, body: batchBody([draft('item_edit')]),
    }), params({ id: projectId }))
    const [row] = await db.select({ id: contextItems.id }).from(contextItems)
    return { owner, projectId, itemUuid: row!.id }
  }

  it('revision 이 낡으면 409 REVISION_CONFLICT · 맞으면 200 이고 revision 이 오른다', async () => {
    const { owner, itemUuid } = await seedItem()

    const stale = await updateItem(req('PATCH', `/api/v1/context-items/${itemUuid}`, {
      auth: owner, body: { revision: 99, changes: { title: '새 제목' } },
    }), params({ id: itemUuid }))
    expect(stale.status).toBe(409)
    expect((await errorOf(stale)).code).toBe('REVISION_CONFLICT')

    const okRes = await updateItem(req('PATCH', `/api/v1/context-items/${itemUuid}`, {
      auth: owner, body: { revision: 1, changes: { title: '새 제목', status: 'active' } },
    }), params({ id: itemUuid }))
    expect(okRes.status).toBe(200)
    const updated = await dataOf(okRes)
    expect(updated.title).toBe('새 제목')
    expect(updated.status).toBe('active')
    expect(updated.revision).toBe(2)

    //  같은 요청을 그대로 다시 보내면 이제는 낡았다 — 잠금이 실제로 잠근다.
    const replay = await updateItem(req('PATCH', `/api/v1/context-items/${itemUuid}`, {
      auth: owner, body: { revision: 1, changes: { title: '또 다른 제목' } },
    }), params({ id: itemUuid }))
    expect(replay.status).toBe(409)
  })

  it('옛 개정이 남는다 — 덮어쓰지 않는다 (P4 의 재현성)', async () => {
    const { owner, itemUuid } = await seedItem()
    await updateItem(req('PATCH', `/api/v1/context-items/${itemUuid}`, {
      auth: owner, body: { revision: 1, changes: { title: '고친 제목' } },
    }), params({ id: itemUuid }))
    const revisions = await db
      .select({ revision: contextItemRevisions.revision, title: contextItemRevisions.title })
      .from(contextItemRevisions)
      .where(eq(contextItemRevisions.itemId, itemUuid))
      .orderBy(asc(contextItemRevisions.revision))
    //  1은 그대로 남고 2가 쌓인다. 옛 버전의 snapshot 이 가리키는 내용이 뒤에서 바뀌면 안 된다.
    expect(revisions.map((r) => r.revision)).toEqual([1, 2])
    expect(revisions[0]!.title).toBe('결제 재시도 정책')
    expect(revisions[1]!.title).toBe('고친 제목')
  })

  it('타입에 맞지 않는 data 는 400 이다', async () => {
    const { owner, itemUuid } = await seedItem()
    const res = await updateItem(req('PATCH', `/api/v1/context-items/${itemUuid}`, {
      auth: owner, body: { revision: 1, changes: { data: { statement: '이건 policy 가 아니다' } } },
    }), params({ id: itemUuid }))
    expect(res.status).toBe(400)
  })
})

describe('conflicts — 선택 4개가 상태를 가른다', () => {
  let seq = 0

  /**
   * FK(`conflicts_a_item_fk`)가 실제 항목을 요구한다 — 가리킬 항목을 먼저 만든다.
   *
   * 🔴 **개정 1도 같이 넣는다.** 결정은 진 항목에 개정을 하나 쌓는데, 현재 개정이
   *    없으면 그 코드가 조용히 건너뛰어서 **시험이 아무것도 재지 않는다** (FINDINGS 71).
   *    상태도 `active` 다 — `deprecated` 로 옮겨진 것이 보이려면 그 전이 `active` 여야 한다.
   */
  async function seedItemFor(projectId: string, publicId: string) {
    const [item] = await db
      .insert(contextItems)
      .values({ projectId, publicId, type: 'policy', status: 'active', scope: { kind: 'project' } })
      .returning({ id: contextItems.id })
    await db.insert(contextItemRevisions).values({
      itemId: item!.id,
      revision: 1,
      title: '결제 재시도 정책',
      body: '재시도는 3회까지 한다.',
      data: { rule: '재시도는 3회까지 한다', severity: 'must', enforcement: 'review' },
      sourceRefs: [{ kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts' }],
      confidence: 'high',
      origin: 'code',
    })
    return publicId
  }

  /** 항목 한 장의 상태·개정을 그대로 읽는다 — 결정이 무엇을 바꿨는지 보는 자리. */
  async function itemOf(projectId: string, publicId: string) {
    const [row] = await db
      .select({ uuid: contextItems.id, status: contextItems.status, revision: contextItems.currentRevision })
      .from(contextItems)
      .where(and(eq(contextItems.projectId, projectId), eq(contextItems.publicId, publicId)))
    return row!
  }

  /**
   * 충돌은 §7.2(AI)가 만든다. 그 전이라 시험이 행을 직접 넣는다.
   *
   * 🔴 **어느 칸을 채우는지는 `CONFLICT_KIND_RULES` 가 정한다.** DB 의 CHECK 이 같은
   *    표에서 나오므로 여기서 손으로 골라 채우면 표가 바뀌는 순간 갈라진다 —
   *    표를 읽어서 채우면 새 종류가 늘어도 이 시험이 따라온다.
   */
  async function seedConflict(projectId: string, kind: ConflictKind = 'doc_vs_code') {
    const rule = CONFLICT_KIND_RULES[kind]
    const n = ++seq
    const a = rule.anchor === 'items' ? await seedItemFor(projectId, `item_a${n}`) : null
    const b = rule.anchor === 'items' && rule.needsB ? await seedItemFor(projectId, `item_b${n}`) : null
    const [row] = await db.insert(conflicts).values({
      projectId,
      kind,
      aItemId: a,
      bItemId: b,
      aRef: rule.anchor === 'document' ? { kind: 'manual', note: '문서: 재시도 5회' } : null,
      severity: rule.detected ? 'high' : null,
      question: '재시도 횟수는 3회인가 5회인가?',
    }).returning({ id: conflicts.id })
    //  ⚠ 가리켜진 항목 이름을 같이 낸다 — 결정이 **어느 항목**을 바꿨는지 재려면 필요하다.
    return { id: row!.id, a, b }
  }

  it('네 선택이 두 가지 상태로 갈리고, 고른 값은 그대로 남는다', async () => {
    const { owner, projectId } = await seed()
    const seen: Record<ConflictChoice, string> = {} as Record<ConflictChoice, string>

    for (const choice of CONFLICT_CHOICES) {
      const { id } = await seedConflict(projectId)
      const res = await resolveConflict(req('POST', `/api/v1/conflicts/${id}/resolve`, {
        auth: owner, body: { choice, note: `${choice} 로 정했다` },
      }), params({ id }))
      expect(res.status).toBe(200)
      const data = await dataOf(res)
      seen[choice] = data.status as string
      expect((data.resolution as { choice: string }).choice).toBe(choice)
    }

    //  표가 실제로 판정을 바꾼다 — dismiss 만 다른 상태다.
    expect(seen).toEqual({ a: 'resolved', b: 'resolved', both: 'resolved', dismiss: 'dismissed' })
    expect(new Set(Object.values(RESOLUTION_OUTCOME)).size).toBe(2)
  })

  it('🔴 선택이 **항목**을 바꾼다 — 표의 네 줄이 서로 다른 결과를 낸다 (RESOLUTION_ITEM_OUTCOME)', async () => {
    //  ★ 왜 이 시험인가 — 예전에는 결정이 `conflicts` 행만 바꿔서, 사람이 「A가 맞음」을
    //    눌러도 Context 화면에서 **아무 변화도 못 봤다** (FINDINGS 71). 「상태가 바뀐다」가
    //    아니라 **「선택마다 다른 쪽이 진다」**를 잠근다 — 한쪽으로 접히면 여기가 빨개진다.
    const { owner, projectId } = await seed()
    const loser: Record<ConflictChoice, 'a' | 'b' | null> = {} as Record<ConflictChoice, 'a' | 'b' | null>

    for (const choice of CONFLICT_CHOICES) {
      const { id, a, b } = await seedConflict(projectId)
      const res = await resolveConflict(
        req('POST', `/api/v1/conflicts/${id}/resolve`, { auth: owner, body: { choice } }),
        params({ id }),
      )
      expect(res.status).toBe(200)
      const [after, before] = [await itemOf(projectId, a!), await itemOf(projectId, b!)]
      const gone = [after.status === 'deprecated', before.status === 'deprecated']
      //  둘 다 폐기되는 선택은 없다 — 그러면 결정이 아니라 삭제다.
      expect(gone.filter(Boolean).length).toBeLessThan(2)
      loser[choice] = gone[0] ? 'a' : gone[1] ? 'b' : null
    }

    //  🔴 표가 정본이다 — 여기에 답을 손으로 적으면 표를 고쳐도 시험이 안 따라온다.
    for (const choice of CONFLICT_CHOICES) {
      expect(loser[choice], `${choice} 가 폐기하는 쪽`).toBe(RESOLUTION_ITEM_OUTCOME[choice]?.loser ?? null)
    }
    //  네 줄이 **세 가지** 결과를 낸다 (`b` 폐기 · `a` 폐기 · 아무것도 안 함).
    expect(new Set(Object.values(loser)).size).toBe(3)
    //  ⚠ 보류·무시는 결정이 아니다 — 하나라도 항목을 건드리면 여기가 빨개진다.
    expect([loser.both, loser.dismiss]).toEqual([null, null])
  })

  it('🔴 이긴 쪽은 안 건드린다 — 개정도 안 쌓인다', async () => {
    //  ★ 왜 — 이미 `active` 인 항목을 되돌리면 다음 발행에서 Pack 밖으로 나간다.
    //    「A가 맞다」의 뜻과 정반대다.
    const { owner, projectId } = await seed()
    const { id, a } = await seedConflict(projectId)
    await resolveConflict(
      req('POST', `/api/v1/conflicts/${id}/resolve`, { auth: owner, body: { choice: 'a' } }),
      params({ id }),
    )
    expect(await itemOf(projectId, a!)).toMatchObject({ status: 'active', revision: 1 })
  })

  it('🔴 폐기된 항목에 개정이 쌓이고, 그게 어느 충돌에서 왔는지 남는다 (P7)', async () => {
    const { owner, projectId } = await seed()
    const { id, b } = await seedConflict(projectId)
    await resolveConflict(req('POST', `/api/v1/conflicts/${id}/resolve`, {
      auth: owner, body: { choice: 'a', note: '문서 쪽이 맞다' },
    }), params({ id }))

    const item = await itemOf(projectId, b!)
    expect(item).toMatchObject({ status: 'deprecated', revision: 2 })

    const [rev] = await db
      .select()
      .from(contextItemRevisions)
      .where(and(eq(contextItemRevisions.itemId, item.uuid), eq(contextItemRevisions.revision, 2)))
    expect(rev!.origin).toBe('manual')
    //  누가 폐기했는지 — 개정 행에 남는다.
    expect(rev!.createdBy).not.toBeNull()
    //  왜 폐기했는지 — 근거가 충돌 id 를 들고 있어서 그 행의 질문·선택·시각으로 간다.
    const manual = rev!.sourceRefs.find((r: SourceRef) => r.kind === 'manual')
    expect(manual && 'note' in manual ? manual.note : '').toContain(id)
    //  ⚠ 원문 근거를 밀어내지 않는다 — 밀어내면 사슬이 반대쪽에서 끊긴다 (68 과 같은 자리).
    expect(rev!.sourceRefs.some((r: SourceRef) => r.kind === 'repository_path')).toBe(true)
    //  본문은 그대로다. 「폐기했다」가 「고쳤다」가 되면 옛 Pack 과 대조가 안 된다 (P4).
    expect(rev!.title).toBe('결제 재시도 정책')
  })

  it('가리키는 것이 항목이 아닌 종류는 결정해도 바꿀 항목이 없다 (anchor)', async () => {
    //  ⚠ `a_ref` 에서 항목을 추측하면 **엉뚱한 항목을 폐기한다.**
    const { owner, projectId } = await seed()
    const { id } = await seedConflict(projectId, 'open_question')
    const res = await resolveConflict(
      req('POST', `/api/v1/conflicts/${id}/resolve`, { auth: owner, body: { choice: 'a' } }),
      params({ id }),
    )
    expect(res.status).toBe(200)
    expect(await db.select({ id: contextItems.id }).from(contextItems)).toHaveLength(0)
  })

  it('🔴 근거 자리가 없으면 400 이고 **충돌도 안 닫힌다** (트랜잭션 하나)', async () => {
    //  ★ 왜 이 시험인가 — 충돌만 닫히면 라우트가 「이미 처리된 충돌」을 400 으로 막아서
    //    **다시 누를 문이 없다.** 항목은 안 바뀐 채로 결정만 기록되는 상태가 영구가 된다.
    const { owner, projectId } = await seed()
    const { id, b } = await seedConflict(projectId)
    const item = await itemOf(projectId, b!)
    await db
      .update(contextItemRevisions)
      .set({
        sourceRefs: Array.from({ length: SOURCE_REFS_MAX }, (_, i) => ({ kind: 'manual', note: `근거 ${i}` })),
      })
      .where(and(eq(contextItemRevisions.itemId, item.uuid), eq(contextItemRevisions.revision, 1)))

    const res = await resolveConflict(
      req('POST', `/api/v1/conflicts/${id}/resolve`, { auth: owner, body: { choice: 'a' } }),
      params({ id }),
    )
    expect(res.status).toBe(400)
    const [row] = await db.select({ status: conflicts.status }).from(conflicts).where(eq(conflicts.id, id))
    expect(row!.status).toBe('open')
    expect(await itemOf(projectId, b!)).toMatchObject({ status: 'active', revision: 1 })
  })

  it('종류마다 채워지는 칸이 다르고, 그게 응답에 그대로 나온다 (CONFLICT_KIND_RULES)', async () => {
    //  ★ 왜 이 시험인가 — 칸을 더해 놓고 응답에서 빠뜨리면 화면은 「충돌 1건」만 보고
    //    **무엇과 무엇이 어긋났는지 물어볼 데가 없다.** 그건 근거 없는 숫자다 (P7).
    const { owner, projectId } = await seed()
    for (const kind of CONFLICT_KINDS) await seedConflict(projectId, kind)

    const data = await dataOf(await listConflicts(
      req('GET', `/api/v1/projects/${projectId}/conflicts`, { auth: owner }),
      params({ id: projectId }),
    ))
    const rows = data.conflicts as Record<string, unknown>[]
    //  ⚠ 프로젝트를 만들 때 씨앗 질문 10장이 같이 심긴다 (`lib/api/seed-questions.ts`).
    //     그 열 장도 같은 검사를 받아야 한다 — `anchor:'none'` 이라 **네 칸이 다 빈다.**
    expect(rows).toHaveLength(CONFLICT_KINDS.length + SEED_QUESTIONS.length)
    for (const row of rows) {
      const kind = row.kind as ConflictKind
      const rule = CONFLICT_KIND_RULES[kind]
      const isNull = (k: string) => row[k] === null
      expect(isNull('a_item_id'), `${kind} 의 a_item_id`).toBe(rule.anchor !== 'items')
      expect(isNull('b_item_id'), `${kind} 의 b_item_id`).toBe(!(rule.anchor === 'items' && rule.needsB))
      expect(isNull('a_ref'), `${kind} 의 a_ref`).toBe(rule.anchor !== 'document')
      expect(isNull('severity'), `${kind} 의 severity`).toBe(!rule.detected)
    }
  })

  it('이미 처리된 충돌은 다시 못 뒤집는다', async () => {
    const { owner, projectId } = await seed()
    const { id } = await seedConflict(projectId)
    await resolveConflict(req('POST', `/api/v1/conflicts/${id}/resolve`, { auth: owner, body: { choice: 'a' } }), params({ id }))
    const again = await resolveConflict(
      req('POST', `/api/v1/conflicts/${id}/resolve`, { auth: owner, body: { choice: 'b' } }),
      params({ id }),
    )
    expect(again.status).toBe(400)
  })

  it('목록의 status 필터가 갈린다', async () => {
    const { owner, projectId } = await seed()
    const { id: kept } = await seedConflict(projectId)
    const { id: closed } = await seedConflict(projectId)
    await resolveConflict(
      req('POST', `/api/v1/conflicts/${closed}/resolve`, { auth: owner, body: { choice: 'dismiss' } }),
      params({ id: closed }),
    )

    const open = await dataOf(await listConflicts(
      req('GET', `/api/v1/projects/${projectId}/conflicts?status=open`, { auth: owner }),
      params({ id: projectId }),
    ))
    //  씨앗 질문 10장도 `open` 이다 — 필터가 가르는 것은 **상태**이지 종류가 아니다.
    const openIds = (open.conflicts as { id: string }[]).map((c) => c.id)
    expect(openIds).toHaveLength(1 + SEED_QUESTIONS.length)
    expect(openIds).toContain(kept)
    expect(openIds).not.toContain(closed)

    const all = await dataOf(await listConflicts(
      req('GET', `/api/v1/projects/${projectId}/conflicts`, { auth: owner }),
      params({ id: projectId }),
    ))
    expect(all.conflicts).toHaveLength(2 + SEED_QUESTIONS.length)
  })

  it('질문 카드는 **질문 종류**의 충돌만이다 (QUESTION_CONFLICT_KINDS)', async () => {
    //  ★ 왜 종류를 손으로 안 세나 — 라우트에 `kind = 'open_question'` 이 박혀 있던
    //    동안 씨앗 질문 10장은 질문 카드 화면에서 **안 보였다** (FINDINGS 67).
    const { owner, projectId } = await seed()
    const { id: detected } = await seedConflict(projectId, 'doc_vs_code')
    const { id: questionId } = await seedConflict(projectId, 'open_question')

    const data = await dataOf(await listQuestions(
      req('GET', `/api/v1/projects/${projectId}/questions`, { auth: owner }),
      params({ id: projectId }),
    ))
    const rows = data.questions as { id: string; kind: ConflictKind }[]
    //  씨앗 10장 + 방금 심은 열린 질문 하나. 탐지가 만든 것은 안 섞인다.
    expect(rows.map((q) => q.id)).toContain(questionId)
    expect(rows.map((q) => q.id)).not.toContain(detected)
    expect(rows).toHaveLength(SEED_QUESTIONS.length + 1)
    expect(new Set(rows.map((q) => q.kind))).toEqual(new Set(QUESTION_CONFLICT_KINDS))
  })

  it('답을 주면 질문이 닫히고, 초안을 같이 주면 그때만 항목이 생긴다', async () => {
    const { owner, projectId } = await seed()
    const { id: plain } = await seedConflict(projectId, 'open_question')
    const { id: withDraft } = await seedConflict(projectId, 'open_question')

    const res = await answerQuestions(req('POST', `/api/v1/projects/${projectId}/questions`, {
      auth: owner,
      body: {
        answers: [
          { question_id: plain, answer: '3회로 한다.' },
          { question_id: withDraft, answer: 'PII 는 남기지 않는다.', draft: draft('item_from_answer', 'constraint') },
        ],
      },
    }), params({ id: projectId }))

    expect(res.status).toBe(200)
    expect((await dataOf(res)).created_item_ids).toEqual(['item_from_answer'])

    const rows = await db.select({ publicId: contextItems.publicId }).from(contextItems)
    expect(rows).toEqual([{ publicId: 'item_from_answer' }])

    const still = await dataOf(await listQuestions(
      req('GET', `/api/v1/projects/${projectId}/questions?status=open`, { auth: owner }),
      params({ id: projectId }),
    ))
    //  답한 둘은 닫혔고, 아직 아무도 안 건드린 씨앗 질문 10장만 열려 있다.
    expect(still.questions).toHaveLength(SEED_QUESTIONS.length)
  })

  it('남의 프로젝트 질문이 섞이면 하나도 반영하지 않는다', async () => {
    const { owner, projectId } = await seed()
    const { id: mine } = await seedConflict(projectId, 'open_question')
    const res = await answerQuestions(req('POST', `/api/v1/projects/${projectId}/questions`, {
      auth: owner,
      body: {
        answers: [
          { question_id: mine, answer: '괜찮다.' },
          { question_id: '00000000-0000-4000-8000-000000000000', answer: '남의 것' },
        ],
      },
    }), params({ id: projectId }))
    expect(res.status).toBe(404)

    const open = await dataOf(await listQuestions(
      req('GET', `/api/v1/projects/${projectId}/questions?status=open`, { auth: owner }),
      params({ id: projectId }),
    ))
    expect(open.questions).toHaveLength(1 + SEED_QUESTIONS.length)
  })
})
