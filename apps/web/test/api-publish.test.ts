import type { PGlite } from '@electric-sql/pglite'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Manifest, SOURCE_REFS_MAX, SYNC_STATUSES } from '@contextops/schema'
import { parseTraceTag } from '@contextops/compiler'

import type { Db } from '../src/db/client'
import { conflicts, contextItems, packFiles } from '../src/db/schema'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../src/app/api/v1/projects/[id]/repos/route'
import { POST as createToken } from '../src/app/api/v1/projects/[id]/tokens/route'
import { POST as batchDraft } from '../src/app/api/v1/projects/[id]/context-items/batch-draft/route'
import { PATCH as updateItem } from '../src/app/api/v1/context-items/[id]/route'
import { GET as listProposals, POST as createProposal } from '../src/app/api/v1/projects/[id]/proposals/route'
import { POST as submitProposal } from '../src/app/api/v1/proposals/[id]/submit/route'
import { POST as approveProposal } from '../src/app/api/v1/proposals/[id]/approve/route'
import { POST as rejectProposal } from '../src/app/api/v1/proposals/[id]/reject/route'
import { POST as resolveConflict } from '../src/app/api/v1/conflicts/[id]/resolve/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { GET as listVersions } from '../src/app/api/v1/projects/[id]/versions/route'
import { GET as latestManifest } from '../src/app/api/v1/projects/[id]/packs/latest/manifest/route'
import { GET as semverManifest } from '../src/app/api/v1/projects/[id]/packs/[semver]/manifest/route'
import { GET as packFile } from '../src/app/api/v1/projects/[id]/packs/[semver]/files/[...path]/route'
import { POST as syncReport } from '../src/app/api/v1/projects/[id]/sync-reports/route'
import { GET as syncStatus } from '../src/app/api/v1/projects/[id]/sync-status/route'
import { POST as postProgress } from '../src/app/api/v1/projects/[id]/progress/route'
import { POST as confirmProgress } from '../src/app/api/v1/progress/[id]/confirm/route'
import { GET as roadmap } from '../src/app/api/v1/projects/[id]/roadmap/route'
import { conflictRow } from '../src/lib/api/conflict'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'
import { batchBody, draft } from './helpers/fixtures'

// =====================================================================
//  API 2군 — proposals · versions/publish · packs · sync · progress · roadmap
//  (SPEC §5 · §2.1 · §6 · docs/PLAN.md P1 셋째 행)
//
//  ★ 이 파일이 재는 것은 「200 이 났다」가 아니라 **관통**이다:
//    손으로 넣은 항목 → 발행 → Pack 파일이 나오고, 그 Pack 을 다시 내려받을 수 있다.
//    라우트는 전부 `route.ts` 의 export 를 **그대로** 부른다 (핸들러 로직을 베끼지 않는다).
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

const ROADMAP_DATA = {
  milestone_id: 'PL-M1',
  paths: ['src/payment'],
  done_when: ['재시도가 3회에서 멈춘다', '실패가 로그에 남는다'],
}

//  ⚠ 한 시험 안에서 `seeded()` 를 두 번 부르는 것이 있다 (승인/반려를 나란히 본다).
//    slug 는 유일해서 고정값이면 둘째가 400 이 된다 — 부를 때마다 번호를 올린다.
let seedNo = 0

/** owner · 팀 · 프로젝트 · 레포 · 항목 4개(전부 active)까지 **라우트를 거쳐** 만든다. */
async function seeded() {
  const n = ++seedNo
  const owner = sessionJwt(`pub-owner-${n}`)
  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: `paylab-${n}` } }),
    params({}),
  ))
  const teamId = team.id as string
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'API', slug: `api-${n}` } }),
    params({ id: teamId }),
  ))
  const projectId = project.id as string
  await createRepo(
    req('POST', `/api/v1/projects/${projectId}/repos`, { auth: owner, body: { name: 'paylab-api' } }),
    params({ id: projectId }),
  )

  await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
    auth: owner,
    body: batchBody([
      draft('item_mission_one', 'mission'),
      draft('item_policy_one', 'policy'),
      draft('item_road_one', 'roadmap', { data: ROADMAP_DATA }),
      //  ★ domain scope 는 `.claude/rules/domain-*.md` 로 간다 — Pack 에 **하위 경로**
      //    파일이 하나는 있어야 catch-all 경로 검사가 무언가를 잰다 (partition 표).
      draft('item_policy_dom', 'policy', { scope: { kind: 'domain', value: 'billing' } }),
    ]),
  }), params({ id: projectId }))

  //  🔴 초안은 발행에 안 들어간다 (snapshot 은 active 만). owner 가 공식으로 올린다.
  const rows = await db.select({ id: contextItems.id }).from(contextItems).where(eq(contextItems.projectId, projectId))
  for (const row of rows) {
    await updateItem(req('PATCH', `/api/v1/context-items/${row.id}`, {
      auth: owner, body: { revision: 1, changes: { status: 'active' } },
    }), params({ id: row.id }))
  }

  return { owner, teamId, projectId }
}

async function publishFirst(owner: string, projectId: string, semver = '1.0.0') {
  const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
    auth: owner, body: { semver, base_version_id: null, change_summary: '첫 발행' },
  }), params({ id: projectId }))
  return res
}

/** 기기 토큰 하나. sync·progress 는 기기만 할 수 있다 (SPEC §5). */
async function deviceToken(owner: string, projectId: string, name = 'mac-1') {
  const data = await dataOf(await createToken(
    req('POST', `/api/v1/projects/${projectId}/tokens`, { auth: owner, body: { device_name: name } }),
    params({ id: projectId }),
  ))
  return { token: data.token as string, deviceId: data.device_id as string }
}

// ---------------------------------------------------------------------
//  발행 트랜잭션 (SPEC §2.1) — PLAN P1 셋째 행의 완료 기준 셋
// ---------------------------------------------------------------------

describe('🔴 손으로 넣은 항목이 Pack 으로 나온다 (PLAN P1 셋째 행 완료 기준 ①)', () => {
  it('발행하면 pack_files 행이 생기고 Manifest 가 계약을 지킨다', async () => {
    const { owner, projectId } = await seeded()
    const res = await publishFirst(owner, projectId)
    expect(res.status).toBe(201)

    const version = await dataOf(res)
    expect(version.semver).toBe('1.0.0')
    expect(version.file_count as number).toBeGreaterThan(0)

    const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
    expect(files.length).toBe(version.file_count)
    //  Pack 의 얼굴은 CLAUDE.md 다 (SPEC §4.1).
    expect(files.map((f) => f.path)).toContain('CLAUDE.md')

    const claude = files.find((f) => f.path === 'CLAUDE.md')
    //  P7 — 모든 줄이 역추적된다. 태그가 하나도 없으면 그 파일은 근거가 없는 것이다.
    expect(claude?.content).toContain('ctx:item_mission_one')
    //  source_map 이 비어 있으면 Pack Explorer 가 줄→항목을 못 잇는다.
    expect(claude?.sourceMap.length).toBeGreaterThan(0)
  })

  it('공식 버전이 옮겨 가고, 목록이 is_official 로 그걸 말한다', async () => {
    const { owner, projectId } = await seeded()
    const version = await dataOf(await publishFirst(owner, projectId))

    const list = await dataOf(await listVersions(
      req('GET', `/api/v1/projects/${projectId}/versions`, { auth: owner }), params({ id: projectId }),
    ))
    expect(list.official_version_id).toBe(version.id)
    expect((list.versions as { is_official: boolean }[])[0]?.is_official).toBe(true)
  })

  it('같은 semver 를 두 번 발행할 수 없다', async () => {
    const { owner, projectId } = await seeded()
    const first = await dataOf(await publishFirst(owner, projectId))

    const again = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.0.0', base_version_id: first.id },
    }), params({ id: projectId }))
    expect(again.status).toBe(400)
    expect((await errorOf(again)).message).toContain('이미 발행된 버전이다')
  })

  //  ⚠ 「내용이 안 바뀐 발행」을 막는 검사는 여기 없다. `snapshot_hash` 가 semver 를
  //    품어서 번호만 올리면 언제나 다른 해시가 나오기 때문이다 (FINDINGS 27).
  //    **없는 것을 있는 척하는 시험을 쓰지 마라** — 그게 게이트를 거짓말로 만든다.
})

describe('🔴 충돌을 결정하면 진 항목이 다음 Pack 에서 빠진다 (FINDINGS 71)', () => {
  it('「A가 맞음」으로 정한 뒤 발행하면 B 항목의 줄이 Pack 어디에도 없다', async () => {
    //  ★ 왜 여기서 재나 — 「상태가 deprecated 로 바뀌었다」는 **결과가 아니다.** 사람이
    //    보는 결과는 「그 규칙이 팀에 배포되는 파일에서 사라졌다」다. 그 사이에는
    //    snapshot 의 `status = 'active'` 필터가 있고, 그게 끊기면 결정은 아무 일도 안 한다.
    const { owner, projectId } = await seeded()

    //  §7.2(AI)가 만들 충돌을 시험이 직접 넣는다 — 키가 없다. 어느 칸을 채우는지는
    //  `conflictRow()` 가 `CONFLICT_KIND_RULES` 를 보고 정한다 (손으로 고르지 않는다).
    const [row] = await db.insert(conflicts).values(conflictRow({
      projectId,
      kind: 'contradiction',
      aItemId: 'item_mission_one',
      bItemId: 'item_policy_one',
      question: '재시도는 3회인가 5회인가?',
      severity: 'high',
    })).returning({ id: conflicts.id })
    const id = row!.id

    const resolved = await resolveConflict(
      req('POST', `/api/v1/conflicts/${id}/resolve`, { auth: owner, body: { choice: 'a' } }),
      params({ id }),
    )
    expect(resolved.status).toBe(200)

    const version = await dataOf(await publishFirst(owner, projectId))
    const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
    const everything = files.map((f) => f.content).join('\n')

    //  이긴 쪽과, 이 결정과 상관없는 항목은 그대로 있다.
    expect(everything).toContain('ctx:item_mission_one')
    expect(everything).toContain('ctx:item_policy_dom')
    //  🔴 진 쪽은 **어느 파일에도** 없다. `source_map` 도 그 항목을 안 가리킨다.
    expect(everything).not.toContain('ctx:item_policy_one')
    expect(files.flatMap((f) => f.sourceMap.map((m) => m.item_id))).not.toContain('item_policy_one')
  })
})

describe('🔴 base_version_id 가 낡으면 409 STALE_BASE (완료 기준 ②)', () => {
  it('첫 발행에 base 를 실어 보내면 409 다 — 아직 공식 버전이 없다', async () => {
    const { owner, projectId } = await seeded()
    const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.0.0', base_version_id: randomUUID() },
    }), params({ id: projectId }))
    expect(res.status).toBe(409)
    expect((await errorOf(res)).code).toBe('STALE_BASE')
  })

  it('한 번 발행한 뒤 base=null 로 또 보내면 409 다', async () => {
    const { owner, projectId } = await seeded()
    expect((await publishFirst(owner, projectId)).status).toBe(201)

    const stale = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: null },
    }), params({ id: projectId }))
    expect(stale.status).toBe(409)
    expect((await errorOf(stale)).code).toBe('STALE_BASE')
  })

  it('base_version_id 는 뺄 수 없다 — 「없다」를 명시해야 STALE_BASE 검사가 산다', async () => {
    const { owner, projectId } = await seeded()
    const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.0.0' },
    }), params({ id: projectId }))
    expect(res.status).toBe(400)
    expect((await errorOf(res)).code).toBe('VALIDATION_FAILED')
  })

  it('member 는 발행하지 못한다 — 기기 토큰도 마찬가지다', async () => {
    const { owner, projectId } = await seeded()
    const { token } = await deviceToken(owner, projectId)
    const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: token, body: { semver: '1.0.0', base_version_id: null },
    }), params({ id: projectId }))
    expect(res.status).toBe(403)
  })
})

describe('🔴 실패하면 전부 롤백된다 (완료 기준 ③)', () => {
  it('제안 하나가 막히면 버전도 Pack 도 항목도 남지 않는다', async () => {
    const { owner, projectId } = await seeded()
    const base = await dataOf(await publishFirst(owner, projectId))

    //  대상이 없는 update 다 — 적용 단계에서 막힌다.
    const proposal = await dataOf(await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '없는 항목을 고친다',
        summary: '',
        base_version_id: base.id,
        items: [{
          operation: 'update',
          target_item_id: 'item_nope_here',
          evidence: [{ kind: 'manual', note: '손으로' }],
          reason: '있을 리 없는 대상',
        }],
        relates_to: [],
        client_request_id: randomUUID(),
      },
    }), params({ id: projectId })))

    await submitProposal(req('POST', `/api/v1/proposals/${proposal.id}/submit`, { auth: owner }), params({ id: proposal.id as string }))
    await approveProposal(req('POST', `/api/v1/proposals/${proposal.id}/approve`, { auth: owner }), params({ id: proposal.id as string }))

    const before = await db.select({ id: contextItems.id }).from(contextItems)
    const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: base.id },
    }), params({ id: projectId }))

    expect(res.status).toBe(400)
    const err = await errorOf(res)
    expect(err.message).toContain('적용하지 못했다')

    //  ★ 여기가 롤백의 증거다 — 버전이 안 늘었고, 항목 수도 그대로다.
    const list = await dataOf(await listVersions(
      req('GET', `/api/v1/projects/${projectId}/versions`, { auth: owner }), params({ id: projectId }),
    ))
    expect((list.versions as unknown[]).length).toBe(1)
    expect(list.official_version_id).toBe(base.id)
    expect((await db.select({ id: contextItems.id }).from(contextItems)).length).toBe(before.length)
  })

  it('승인된 제안의 add 가 적용되면 새 항목이 active 로 Pack 에 들어간다', async () => {
    const { owner, projectId } = await seeded()
    const base = await dataOf(await publishFirst(owner, projectId))

    const proposal = await dataOf(await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '제약을 하나 더한다',
        summary: 'PII 금지',
        base_version_id: base.id,
        items: [{
          operation: 'add',
          draft: draft('item_added_one', 'constraint'),
          evidence: [{ kind: 'manual', note: '팀 결정' }],
          reason: '로그 사고 방지',
        }],
        relates_to: [],
        client_request_id: randomUUID(),
      },
    }), params({ id: projectId })))
    const proposalId = proposal.id as string

    await submitProposal(req('POST', `/api/v1/proposals/${proposalId}/submit`, { auth: owner }), params({ id: proposalId }))
    await approveProposal(req('POST', `/api/v1/proposals/${proposalId}/approve`, { auth: owner }), params({ id: proposalId }))

    const next = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: base.id },
    }), params({ id: projectId }))
    expect(next.status).toBe(201)
    const version = await dataOf(next)
    expect(version.applied_proposal_ids).toEqual([proposalId])

    //  제안은 published 로 넘어갔다 (SPEC §2.1 7단계).
    const list = await dataOf(await listProposals(
      req('GET', `/api/v1/projects/${projectId}/proposals`, { auth: owner }), params({ id: projectId }),
    ))
    expect((list.proposals as { status: string }[])[0]?.status).toBe('published')

    //  ★ 새 항목이 Pack 에 실제로 나왔나 — 「제안이 published 다」는 그 증거가 아니다.
    const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
    expect(files.some((f) => f.content.includes('ctx:item_added_one'))).toBe(true)
  })

  //  🔴 **P7 — 제안이 만든 줄은 그 제안으로 되짚어진다** (FINDINGS 68).
  //    ⚠ 재는 것은 「개정 행에 근거가 붙었다」가 **아니다.** `origin:'proposal'` 은 이미
  //      붙어 있었지만 Pack 줄에서는 안 보였다. 사람이 되짚는 자리는 Pack 태그 하나다.
  it('제안으로 들어온 항목의 Pack 줄에 src:proposal 이 있다 (P7)', async () => {
    const { owner, projectId } = await seeded()
    const base = await dataOf(await publishFirst(owner, projectId))

    const proposal = await dataOf(await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '되짚을 수 있는 항목',
        summary: '',
        base_version_id: base.id,
        items: [{
          operation: 'add',
          draft: draft('item_traced_one', 'constraint'),
          evidence: [{ kind: 'manual', note: '팀 결정' }],
          reason: '역추적을 잰다',
        }],
        relates_to: [],
        client_request_id: randomUUID(),
      },
    }), params({ id: projectId })))
    const proposalId = proposal.id as string

    await submitProposal(req('POST', `/api/v1/proposals/${proposalId}/submit`, { auth: owner }), params({ id: proposalId }))
    await approveProposal(req('POST', `/api/v1/proposals/${proposalId}/approve`, { auth: owner }), params({ id: proposalId }))

    const version = await dataOf(await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: base.id },
    }), params({ id: projectId })))

    const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
    const lines = files.flatMap((f) => f.content.split('\n')).filter((l) => l.includes('ctx:item_traced_one'))
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      const tag = parseTraceTag(line)
      expect(tag?.src).toContain(`proposal:${proposalId}`)
      //  ⚠ 원문 근거를 **밀어내지 않았다.** 제안 근거가 원문을 덮으면 사슬이 반대쪽에서 끊긴다.
      expect(tag?.src.some((x) => x.startsWith('repo:'))).toBe(true)
    }
  })

  //  ⚠ 근거가 상한까지 찬 초안은 **조용히 하나를 버리지 않고** 발행이 막힌다.
  //    버리면 그 항목만 역추적이 한 칸 짧아지고 아무도 모른다.
  it('근거가 상한까지 차 있으면 제안 근거를 붙일 자리가 없다고 400 이 난다', async () => {
    const { owner, projectId } = await seeded()
    const base = await dataOf(await publishFirst(owner, projectId))

    const full = Array.from({ length: SOURCE_REFS_MAX }, (_, i) => ({
      kind: 'repository_path', repo: 'paylab-api', path: `src/payment/f${i}.ts`,
    }))
    const proposal = await dataOf(await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '근거가 꽉 찬 항목',
        summary: '',
        base_version_id: base.id,
        items: [{
          operation: 'add',
          draft: draft('item_full_refs', 'constraint', { source_refs: full }),
          evidence: [{ kind: 'manual', note: '팀 결정' }],
          reason: '상한을 잰다',
        }],
        relates_to: [],
        client_request_id: randomUUID(),
      },
    }), params({ id: projectId })))
    const proposalId = proposal.id as string

    await submitProposal(req('POST', `/api/v1/proposals/${proposalId}/submit`, { auth: owner }), params({ id: proposalId }))
    await approveProposal(req('POST', `/api/v1/proposals/${proposalId}/approve`, { auth: owner }), params({ id: proposalId }))

    const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: base.id },
    }), params({ id: projectId }))
    expect(res.status).toBe(400)
    const err = await errorOf(res)
    const failures = (err.details as { failures: { reason: string }[] }).failures
    expect(failures[0]?.reason).toContain('붙일 자리가 없다')
  })
})

// ---------------------------------------------------------------------
//  Proposal 의 수명 (SPEC §5)
// ---------------------------------------------------------------------

describe('제안 — 표 하나가 누가·언제·무엇으로를 정한다', () => {
  async function aProposal() {
    const { owner, projectId } = await seeded()
    const base = await dataOf(await publishFirst(owner, projectId))
    const proposal = await dataOf(await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '제안 하나',
        summary: '',
        base_version_id: base.id,
        items: [{
          operation: 'add',
          draft: draft('item_prop_one', 'constraint'),
          evidence: [{ kind: 'manual', note: '근거' }],
          reason: '이유',
        }],
        relates_to: [],
        client_request_id: randomUUID(),
      },
    }), params({ id: projectId })))
    return { owner, projectId, proposalId: proposal.id as string, status: proposal.status }
  }

  it('만들면 draft 다 — 클라이언트가 status 를 실어 보낼 자리가 없다', async () => {
    const { status } = await aProposal()
    expect(status).toBe('draft')
  })

  it('같은 client_request_id 는 제안을 늘리지 않는다 (201 다음은 200)', async () => {
    const { owner, projectId } = await seeded()
    const base = await dataOf(await publishFirst(owner, projectId))
    const body = {
      title: '두 번 보낸다',
      summary: '',
      base_version_id: base.id,
      items: [{
        operation: 'add', draft: draft('item_twice_one', 'constraint'),
        evidence: [{ kind: 'manual', note: 'n' }], reason: 'r',
      }],
      relates_to: [],
      client_request_id: randomUUID(),
    }
    const first = await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, { auth: owner, body }), params({ id: projectId }))
    const second = await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, { auth: owner, body }), params({ id: projectId }))
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect((await dataOf(second)).id).toBe((await dataOf(first)).id)
  })

  it('draft 를 바로 승인할 수 없다 — submit 을 지나야 한다', async () => {
    const { owner, proposalId } = await aProposal()
    const res = await approveProposal(req('POST', `/api/v1/proposals/${proposalId}/approve`, { auth: owner }), params({ id: proposalId }))
    expect(res.status).toBe(400)
    expect((await errorOf(res)).message).toContain('submitted')
  })

  it('submit → approve · submit → reject 로 상태가 갈린다', async () => {
    const a = await aProposal()
    await submitProposal(req('POST', `/api/v1/proposals/${a.proposalId}/submit`, { auth: a.owner }), params({ id: a.proposalId }))
    const approved = await dataOf(await approveProposal(
      req('POST', `/api/v1/proposals/${a.proposalId}/approve`, { auth: a.owner, body: { note: '좋다' } }),
      params({ id: a.proposalId }),
    ))
    expect(approved.status).toBe('approved')
    expect(approved.decision_note).toBe('좋다')

    const b = await aProposal()
    await submitProposal(req('POST', `/api/v1/proposals/${b.proposalId}/submit`, { auth: b.owner }), params({ id: b.proposalId }))
    const rejected = await dataOf(await rejectProposal(
      req('POST', `/api/v1/proposals/${b.proposalId}/reject`, { auth: b.owner }), params({ id: b.proposalId }),
    ))
    expect(rejected.status).toBe('rejected')
  })

  it('🔴 rejected 제안의 항목은 Pack 에 들어가지 않는다', async () => {
    const { owner, projectId, proposalId } = await aProposal()
    const base = await dataOf(await listVersions(
      req('GET', `/api/v1/projects/${projectId}/versions`, { auth: owner }), params({ id: projectId }),
    ))
    await submitProposal(req('POST', `/api/v1/proposals/${proposalId}/submit`, { auth: owner }), params({ id: proposalId }))
    await rejectProposal(req('POST', `/api/v1/proposals/${proposalId}/reject`, { auth: owner }), params({ id: proposalId }))

    const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: base.official_version_id },
    }), params({ id: projectId }))
    expect(res.status).toBe(201)
    const version = await dataOf(res)
    //  ★ 승인되지 않은 것은 적용 목록에도, Pack 본문에도 없다.
    expect(version.applied_proposal_ids).toEqual([])
    const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
    expect(files.some((f) => f.content.includes('item_prop_one'))).toBe(false)
    //  항목 자체가 만들어지지 않았다 (제안은 승인 전까지 아무것도 바꾸지 않는다).
    expect((await db.select({ id: contextItems.id }).from(contextItems)
      .where(eq(contextItems.publicId, 'item_prop_one'))).length).toBe(0)
  })

  it('이 프로젝트의 버전이 아닌 base_version_id 는 400 이다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const res = await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '엉뚱한 기준', summary: '', base_version_id: randomUUID(),
        items: [{ operation: 'add', draft: draft('item_bad_base', 'constraint'), evidence: [{ kind: 'manual', note: 'n' }], reason: 'r' }],
        relates_to: [], client_request_id: randomUUID(),
      },
    }), params({ id: projectId }))
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------
//  Pack 을 내려받는 문 (SPEC §5 packs 세 줄)
// ---------------------------------------------------------------------

describe('packs — ETag 가 실제로 304 를 만든다', () => {
  it('latest manifest 는 계약을 지키고, 같은 ETag 로 다시 부르면 304 다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)

    const res = await latestManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/latest/manifest`, { auth: owner }), params({ id: projectId }),
    )
    expect(res.status).toBe(200)
    const manifest = Manifest.parse(await dataOf(res))
    const etag = res.headers.get('etag')
    expect(etag).toBe(`"${manifest.manifest_hash}"`)

    const again = await latestManifest(req('GET', `/api/v1/projects/${projectId}/packs/latest/manifest`, {
      auth: owner, headers: { 'if-none-match': etag as string },
    }), params({ id: projectId }))
    expect(again.status).toBe(304)
    expect(await again.text()).toBe('')
  })

  it('{semver} manifest 는 불변 캐시다 — latest 와 캐시 규칙이 다르다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)

    const pinned = await semverManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/manifest`, { auth: owner }),
      params({ id: projectId, semver: '1.0.0' }),
    )
    expect(pinned.status).toBe(200)
    expect(pinned.headers.get('cache-control')).toContain('immutable')

    const latest = await latestManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/latest/manifest`, { auth: owner }), params({ id: projectId }),
    )
    expect(latest.headers.get('cache-control')).toBe('no-cache')
  })

  it('Pack 파일은 봉투 없는 text/plain 이고, 그 본문의 sha256 이 ETag 다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)

    const res = await packFile(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/files/CLAUDE.md`, { auth: owner }),
      params({ id: projectId, semver: '1.0.0', path: ['CLAUDE.md'] }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')

    const text = await res.text()
    //  🔴 봉투가 아니다 — 플러그인이 이 바이트를 그대로 파일로 쓴다 (SPEC §8.5).
    expect(text.startsWith('{')).toBe(false)
    expect(text).toContain('ctx:')

    const rows = await db.select({ sha256: packFiles.sha256, path: packFiles.path }).from(packFiles)
    const expected = rows.find((r) => r.path === 'CLAUDE.md')?.sha256
    expect(res.headers.get('etag')).toBe(`"${expected}"`)
  })

  it('`/` 를 품은 경로도 그대로 받는다 (catch-all)', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const rows = await db.select({ path: packFiles.path }).from(packFiles)
    const nested = rows.map((r) => r.path).find((p) => p.includes('/'))
    expect(nested, 'Pack 에 하위 경로 파일이 하나도 없다면 이 검사가 아무것도 안 잰다').toBeDefined()

    const res = await packFile(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/files/${nested}`, { auth: owner }),
      params({ id: projectId, semver: '1.0.0', path: (nested as string).split('/') }),
    )
    expect(res.status).toBe(200)
  })

  it('없는 버전·없는 파일은 404 · semver 가 아니면 400 이다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)

    expect((await semverManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/9.9.9/manifest`, { auth: owner }),
      params({ id: projectId, semver: '9.9.9' }),
    )).status).toBe(404)

    expect((await semverManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/latest-ish/manifest`, { auth: owner }),
      params({ id: projectId, semver: 'latest-ish' }),
    )).status).toBe(400)

    expect((await packFile(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/files/nope.md`, { auth: owner }),
      params({ id: projectId, semver: '1.0.0', path: ['nope.md'] }),
    )).status).toBe(404)
  })

  it('발행 전에는 latest 가 404 다 — 빈 Manifest 를 지어내지 않는다', async () => {
    const { owner, projectId } = await seeded()
    const res = await latestManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/latest/manifest`, { auth: owner }), params({ id: projectId }),
    )
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------
//  sync (SPEC §5 · §6) — FINDINGS 16 이 지목한 `unknown` 이 여기서 생긴다
// ---------------------------------------------------------------------

describe('🔴 sync-status — 보고 있는 기기와 없는 기기가 다른 값을 낸다 (FINDINGS 16)', () => {
  it('보고한 기기는 applied · 한 번도 보고 안 한 기기는 unknown 이다', async () => {
    const { owner, projectId } = await seeded()
    const version = await dataOf(await publishFirst(owner, projectId))
    const reported = await deviceToken(owner, projectId, 'mac-보고함')
    await deviceToken(owner, projectId, 'win-조용함')

    const manifest = Manifest.parse(await dataOf(await latestManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/latest/manifest`, { auth: owner }), params({ id: projectId }),
    )))

    const report = await syncReport(req('POST', `/api/v1/projects/${projectId}/sync-reports`, {
      auth: reported.token,
      body: { version: '1.0.0', manifest_hash: manifest.manifest_hash, status: 'applied', files: [] },
    }), params({ id: projectId }))
    expect(report.status).toBe(202)
    expect((await dataOf(report)).version_id).toBe(version.id)

    const status = await dataOf(await syncStatus(
      req('GET', `/api/v1/projects/${projectId}/sync-status`, { auth: owner }), params({ id: projectId }),
    ))
    const devices = status.devices as { device_name: string; status: string; version: string | null }[]
    const byName = Object.fromEntries(devices.map((d) => [d.device_name, d]))

    //  ★ 이 두 줄이 FINDINGS 16 이 요구한 「값을 바꾸면 결과가 갈린다」다.
    expect(byName['mac-보고함']?.status).toBe('applied')
    expect(byName['win-조용함']?.status).toBe('unknown')
    expect(byName['win-조용함']?.version).toBeNull()
    //  `unknown` 은 5종에는 있고 기기가 보고할 수 있는 값에는 없다.
    expect(SYNC_STATUSES).toContain('unknown')
  })

  it('기기가 unknown 을 자칭할 수 없다 — 계약이 거부한다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const { token } = await deviceToken(owner, projectId)
    const res = await syncReport(req('POST', `/api/v1/projects/${projectId}/sync-reports`, {
      auth: token,
      body: { version: '1.0.0', manifest_hash: 'a'.repeat(64), status: 'unknown', files: [] },
    }), params({ id: projectId }))
    expect(res.status).toBe(400)
  })

  it('사람의 세션으로는 보고할 수 없다 — 보고는 기기의 것이다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const res = await syncReport(req('POST', `/api/v1/projects/${projectId}/sync-reports`, {
      auth: owner,
      body: { version: '1.0.0', manifest_hash: 'a'.repeat(64), status: 'applied', files: [] },
    }), params({ id: projectId }))
    expect(res.status).toBe(403)
  })

  it('모르는 버전의 보고도 받는다 — 버리면 그 기기가 영원히 unknown 이 된다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const { token } = await deviceToken(owner, projectId, 'manual-zip')
    const res = await syncReport(req('POST', `/api/v1/projects/${projectId}/sync-reports`, {
      auth: token,
      body: { version: '0.9.0', manifest_hash: 'b'.repeat(64), status: 'manual', files: [] },
    }), params({ id: projectId }))
    expect(res.status).toBe(202)
    expect((await dataOf(res)).version_id).toBeNull()

    const status = await dataOf(await syncStatus(
      req('GET', `/api/v1/projects/${projectId}/sync-status`, { auth: owner }), params({ id: projectId }),
    ))
    const device = (status.devices as { device_name: string; status: string }[]).find((d) => d.device_name === 'manual-zip')
    expect(device?.status).toBe('manual')
  })
})

// ---------------------------------------------------------------------
//  progress · roadmap (SPEC §5 · P5)
// ---------------------------------------------------------------------

describe('progress — 멱등하고, done 은 사람만 찍는다', () => {
  function event(overrides: Record<string, unknown> = {}) {
    return {
      milestone_id: 'PL-M1',
      status: 'criterion_done',
      criterion: '재시도가 3회에서 멈춘다',
      evidence: [{ path: 'src/payment/retry.ts', start_line: 14 }],
      summary: '재시도 상한을 상수로 뺐다',
      context_version: '1.0.0',
      source: 'agent',
      client_event_id: randomUUID(),
      ...overrides,
    }
  }

  it('같은 client_event_id 는 두 번째부터 200 이고 행이 안 는다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const { token } = await deviceToken(owner, projectId)
    const body = event()

    const first = await postProgress(req('POST', `/api/v1/projects/${projectId}/progress`, { auth: token, body }), params({ id: projectId }))
    const second = await postProgress(req('POST', `/api/v1/projects/${projectId}/progress`, { auth: token, body }), params({ id: projectId }))
    expect(first.status).toBe(202)
    expect(second.status).toBe(200)
    expect((await dataOf(second)).id).toBe((await dataOf(first)).id)
  })

  it('done_candidate 가 아닌 보고는 확정할 수 없다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const { token } = await deviceToken(owner, projectId)
    const created = await dataOf(await postProgress(
      req('POST', `/api/v1/projects/${projectId}/progress`, { auth: token, body: event() }), params({ id: projectId }),
    ))
    const res = await confirmProgress(
      req('POST', `/api/v1/progress/${created.id}/confirm`, { auth: owner }), params({ id: created.id as string }),
    )
    expect(res.status).toBe(400)
    expect((await errorOf(res)).message).toContain('done_candidate')
  })

  it('done_candidate 를 owner 가 확정하면 확정 시각이 찍힌다', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const { token } = await deviceToken(owner, projectId)
    const created = await dataOf(await postProgress(req('POST', `/api/v1/projects/${projectId}/progress`, {
      auth: token, body: event({ status: 'done_candidate' }),
    }), params({ id: projectId })))

    const ok = await dataOf(await confirmProgress(
      req('POST', `/api/v1/progress/${created.id}/confirm`, { auth: owner }), params({ id: created.id as string }),
    ))
    expect(ok.confirmed_at).not.toBeNull()

    //  두 번은 안 된다 — 확정은 한 번이다.
    const twice = await confirmProgress(
      req('POST', `/api/v1/progress/${created.id}/confirm`, { auth: owner }), params({ id: created.id as string }),
    )
    expect(twice.status).toBe(400)
  })

  it('🔴 roadmap 의 행은 마일스톤이고, 보고가 근거 개수를 바꾼다 (P5)', async () => {
    const { owner, projectId } = await seeded()
    await publishFirst(owner, projectId)
    const { token } = await deviceToken(owner, projectId)

    const before = await dataOf(await roadmap(req('GET', `/api/v1/projects/${projectId}/roadmap`, { auth: owner }), params({ id: projectId })))
    const beforeRow = (before.milestones as { milestone: string; status: string; done_when: { text: string; evidence_count: number }[] }[])[0]
    expect(before.context_version).toBe('1.0.0')
    expect(beforeRow?.milestone).toBe('PL-M1')
    expect(beforeRow?.status).toBe('not_started')
    expect(beforeRow?.done_when.map((d) => d.evidence_count)).toEqual([0, 0])

    await postProgress(req('POST', `/api/v1/projects/${projectId}/progress`, { auth: token, body: event() }), params({ id: projectId }))

    const after = await dataOf(await roadmap(req('GET', `/api/v1/projects/${projectId}/roadmap`, { auth: owner }), params({ id: projectId })))
    const afterRow = (after.milestones as { status: string; last_report_at: string | null; done_when: { text: string; evidence_count: number }[] }[])[0]
    //  ★ 같은 요청인데 값이 갈렸다 — 보고가 실제로 무언가를 바꾼다.
    expect(afterRow?.status).toBe('in_progress')
    expect(afterRow?.done_when[0]?.evidence_count).toBe(1)
    expect(afterRow?.done_when[1]?.evidence_count).toBe(0)
    expect(afterRow?.last_report_at).not.toBeNull()

    //  P5 — 행에 사람이 없다.
    expect(JSON.stringify(afterRow)).not.toContain('user_id')
  })

  it('발행 전 roadmap 은 빈 목록이고 context_version 이 null 이다', async () => {
    const { owner, projectId } = await seeded()
    const data = await dataOf(await roadmap(req('GET', `/api/v1/projects/${projectId}/roadmap`, { auth: owner }), params({ id: projectId })))
    expect(data).toEqual({ context_version: null, milestones: [] })
  })
})
