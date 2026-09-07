import type { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AI_JOB_STATUSES, SYNC_STATUSES } from '@contextops/schema'

import { ACTOR_RULES } from '../src/lib/api/auth'
import { DEMO_ENTRY_PATH, DEMO_GUEST_SUBJECT, DEMO_TENANT, demoBannerText } from '../src/lib/demo/tenant'
import { POST as demoSession } from '../src/app/api/v1/demo/session/route'
import { GET as listTeams, POST as createTeam } from '../src/app/api/v1/teams/route'
import { GET as listItems } from '../src/app/api/v1/projects/[id]/context-items/route'
import { GET as syncStatus } from '../src/app/api/v1/projects/[id]/sync-status/route'
import { GET as roadmap } from '../src/app/api/v1/projects/[id]/roadmap/route'
import { GET as listProposals } from '../src/app/api/v1/projects/[id]/proposals/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { GET as listJobs } from '../src/app/api/v1/projects/[id]/jobs/route'
import { POST as createToken } from '../src/app/api/v1/projects/[id]/tokens/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { seedDemo, readDemoSeedFile, demoGuestMembership, type DemoSeedResult } from '../src/lib/demo/seed-demo'
import { seedSession, UNFINISHED_JOB_STATUSES } from '../src/lib/demo/seed'
import { AI_JOB_STATUS_RULES } from '../src/db/schema'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  🔴 **게스트 데모** — 링크 하나로 들어와서 **읽기만** 한다 (SPEC §9 · GATE 3)
//
//  ★ 이 시험이 재는 것은 셋이다:
//    ① 데모 테넌트가 **실제로 심어진다** (팀원·기기·보고·제안·발행 두 번)
//    ② `/demo/session` 이 낸 토큰으로 **아홉 화면의 문이 열린다**
//    ③ 그 토큰으로는 **아무것도 못 바꾼다** — 메서드가 GET 이 아니면 전부 403
//
//  ⚠ ③ 을 라우트 하나로만 재면 안 된다. 막는 자리가 `route()` 하나라는 것이 이 설계의
//    전부라서, **여러 라우트가 같은 답을 내는 것**이 그 주장의 증거다.
//  ⚠ 「심어져 있지 않으면 404」도 잰다 — 데모를 안 심은 배포에서 화면이 빈 채로 도는
//    것이 제일 나쁜 실패다.
// =====================================================================

let pg: PGlite | undefined
let seeded: DemoSeedResult

//  ⚠ 시각을 인자로 넣는다 — 「4일 전」이 진짜로 4일 전인지 재려면 기준이 필요하다.
const NOW = new Date('2026-09-06T09:00:00.000Z')

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const fresh = await freshDb()
  pg = fresh.pg
})

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

/** 게스트 세션 하나를 진짜 라우트로 받아 온다. */
async function guestToken(): Promise<string> {
  const data = await dataOf(await demoSession(req('POST', '/api/v1/demo/session'), params({})))
  return data.access_token as string
}

describe('데모 테넌트가 심어져 있지 않을 때', () => {
  it('`/demo/session` 이 404 다 — 빈 화면 대신 없다고 말한다', async () => {
    const res = await demoSession(req('POST', '/api/v1/demo/session'), params({}))
    expect(res.status).toBe(404)
    expect((await errorOf(res)).code).toBe('NOT_FOUND')
  })

  it('데모 슬러그의 팀만 있고 게스트가 없으면 여전히 404 다', async () => {
    await createTeam(req('POST', '/api/v1/teams', {
      auth: sessionJwt('someone'), body: { name: DEMO_TENANT.teamName, slug: DEMO_TENANT.teamSlug },
    }), params({}))
    //  ⚠ 프로젝트가 없으니 「데모 프로젝트가 없다」에서 걸린다 — 셋 다 있어야 들어간다.
    expect((await demoSession(req('POST', '/api/v1/demo/session'), params({}))).status).toBe(404)
  })
})

describe('데모 테넌트를 심으면', () => {
  beforeEach(async () => {
    seeded = await seedDemo(NOW)
  })

  it('픽스처가 말한 만큼 들어간다 — 기기 14 · 보고 13 · 팀원 5', () => {
    const file = readDemoSeedFile()
    expect(seeded.deviceCount).toBe(file.devices.length)
    expect(seeded.deviceCount).toBe(14)
    expect(seeded.memberCount).toBe(file.members.length)
    //  ⚠ 「보고한 기기 수」는 픽스처가 정한다 — 여기에 숫자를 또 적으면 갈라진다.
    expect(seeded.reportCount).toBe(file.devices.filter((d) => d.report !== null).length)
    expect(seeded.progressCount).toBe(file.progress.length)
  })

  it('발행이 두 번이고 공식은 v1.1.0 이다 — 그 사이에 승인된 제안이 하나 있다', () => {
    expect(seeded.versions.previous.semver).toBe('1.0.0')
    expect(seeded.versions.official.semver).toBe('1.1.0')
    //  두 Manifest 가 다르다 = 승인된 제안이 실제로 Pack 을 바꿨다.
    expect(seeded.versions.official.manifestHash).not.toBe(seeded.versions.previous.manifestHash)
  })

  it('게스트는 팀의 member 다 — 등급이 아니라 주체 종류로 읽기 전용이 된다', async () => {
    const membership = await demoGuestMembership()
    expect(membership?.role).toBe('member')
    expect(ACTOR_RULES.guest).toEqual({ maxRole: 'member', writes: false })
  })

  it('화면 9 가 그릴 것이 있다 — applied 9 · outdated 2 · manual 1 · modified 1 · unknown 1', async () => {
    const token = await guestToken()
    const data = await dataOf(await syncStatus(
      req('GET', `/api/v1/projects/${seeded.projectId}/sync-status`, { auth: token }),
      params({ id: seeded.projectId }),
    ))
    const rows = data.devices as { status: string; version: string | null; reported_at: string | null }[]
    const count = (status: string): number => rows.filter((r) => r.status === status).length
    expect(rows).toHaveLength(14)
    expect(count('applied')).toBe(9)
    expect(count('outdated')).toBe(2)
    expect(count('manual')).toBe(1)
    expect(count('modified')).toBe(1)
    expect(count('unknown')).toBe(1)
    //  🔴 **5종이 전부 화면에 선다** (FINDINGS 162 · loop/PROMPT.md ④2-B).
    //  ★ 왜 위 다섯 줄로 안 끝내나 — 저 다섯은 **오늘의 수**라 `SYNC_STATUSES` 에 여섯째가
    //    붙어도 그대로 초록이다. 종류를 표에서 세어야 「새 상태를 더했는데 데모에는
    //    안 서는」 날 이 시험이 빨개진다. 종류가 늘면 픽스처에 한 줄을 더해라.
    for (const status of SYNC_STATUSES) {
      expect(count(status), `데모가 sync 상태 ${status} 를 한 번도 안 보여 준다`).toBeGreaterThan(0)
    }
    //  🔴 `unknown` 은 **한 번도 보고하지 않은 기기**다 — 버전도 시각도 없다.
    //     여기에 기본값이 채워지면 「아직 아무것도 안 받은 기기」가 「낡은 기기」로 보인다.
    for (const row of rows.filter((r) => r.status === 'unknown')) {
      expect(row.version).toBeNull()
      expect(row.reported_at).toBeNull()
    }
    //  🔴 `modified` 는 **버전은 공식인데 파일이 고쳐진** 기기다 (SYNC_MEANING).
    for (const row of rows.filter((r) => r.status === 'modified')) {
      expect(row.version).toBe(seeded.versions.official.semver)
    }
    //  🔴 `outdated` 는 **앞 버전**을 보고한 기기다. 같은 버전을 보고했는데 outdated 면
    //     화면이 「무엇으로 맞춰야 하나」를 말할 수 없다.
    for (const row of rows.filter((r) => r.status === 'outdated')) {
      expect(row.version).toBe(seeded.versions.previous.semver)
    }
    //  「4일 전」이 진짜로 4일 전인가 (DESIGN_BRIEF §4 화면 9 의 예시 그대로).
    const ages = rows
      .filter((r) => r.reported_at !== null)
      .map((r) => Math.round((NOW.getTime() - new Date(r.reported_at as string).getTime()) / 3_600_000))
    expect(Math.max(...ages)).toBeGreaterThanOrEqual(96)
  })

  it('🔴 사람 칸에 **이름**이 온다 — sub 도 이메일도 아니다', async () => {
    //  ★ 이 시험은 덤프를 눈으로 읽다가 생겼다. 화면 9 의 「팀원」 칸에
    //    `demo-member-haeun` 이 그대로 그려지고 있었다 — `sessionActor()` 가 로그인마다
    //    `users.name` 을 claims 로 덮기 때문이다. 픽스처의 이름이 claims 를 타고
    //    들어가지 않으면 데모가 사람 이름 대신 내부 식별자를 보여 준다.
    const token = await guestToken()
    const data = await dataOf(await syncStatus(
      req('GET', `/api/v1/projects/${seeded.projectId}/sync-status`, { auth: token }),
      params({ id: seeded.projectId }),
    ))
    const names = (data.devices as { user: { name: string } }[]).map((d) => d.user.name)
    const expected = new Set(readDemoSeedFile().members.map((m) => m.name))
    for (const name of names) expect(expected.has(name)).toBe(true)
    //  ⚠ 이메일은 화면에 나가지 않는다 (`USER_REF_COLUMNS` — 나가는 칸은 `{id,name}` 둘뿐).
    expect(JSON.stringify(data)).not.toContain('@')
  })

  it('화면 8 이 그릴 것이 있다 — 완료 조건에 근거가 붙고 확정 후보가 하나 선다', async () => {
    const token = await guestToken()
    const data = await dataOf(await roadmap(
      req('GET', `/api/v1/projects/${seeded.projectId}/roadmap`, { auth: token }),
      params({ id: seeded.projectId }),
    ))
    const rows = data.milestones as {
      milestone: string
      due: string | null
      done_when: { text: string; evidence_count: number }[]
      confirmable: unknown
    }[]
    expect(rows.length).toBeGreaterThan(0)
    //  🔴 데모의 PL-M1 은 기한을 갖는다 — goals.md §4 제목 괄호의 날짜다 (FINDINGS 111). 없으면 화면 8 이 그 칸을 비운다.
    expect(rows.find((m) => m.milestone === 'PL-M1')?.due).toBe('2026-04-30')
    const evidence = rows.flatMap((m) => m.done_when).reduce((sum, c) => sum + c.evidence_count, 0)
    expect(evidence).toBeGreaterThan(0)
    //  🔴 `done_candidate` 보고가 하나 있으니 「완료 확인」 버튼의 재료가 화면에 온다.
    expect(rows.some((m) => m.confirmable !== null)).toBe(true)
    //  🔴 `milestone_id: 'none'` 보고는 **로드맵 외**로 선다 (`PROGRESS_EFFECT.none`).
    expect(data.off_roadmap_total).toBe(1)
  })

  it('화면 6 이 그릴 것이 있다 — 실림·승인 대기·거절·결정 전 네 갈래', async () => {
    const token = await guestToken()
    const data = await dataOf(await listProposals(
      req('GET', `/api/v1/projects/${seeded.projectId}/proposals`, { auth: token }),
      params({ id: seeded.projectId }),
    ))
    const statuses = (data.proposals as { status: string }[]).map((p) => p.status).sort()
    //  ⚠ `published` 와 `approved` 가 **둘 다** 있어야 한다 — 승인은 발행이 아니다.
    expect(statuses).toEqual(['approved', 'published', 'rejected', 'submitted'])
  })

  it('게스트가 보는 팀은 데모 하나뿐이다', async () => {
    //  남의 팀을 하나 만들어 둔다 — 게스트 목록에 섞이면 안 된다.
    await createTeam(req('POST', '/api/v1/teams', {
      auth: sessionJwt('other-owner'), body: { name: '남의 팀', slug: 'other-team' },
    }), params({}))

    const token = await guestToken()
    const data = await dataOf(await listTeams(req('GET', '/api/v1/teams', { auth: token }), params({})))
    const teams = data.teams as { slug: string; projects: { slug: string }[] }[]
    expect(teams.map((t) => t.slug)).toEqual([DEMO_TENANT.teamSlug])
    expect(teams[0]?.projects.map((p) => p.slug)).toEqual([DEMO_TENANT.projectSlug])
  })

  it('세션 응답이 어디로 갈지 말해 준다 — 화면이 주소를 조립하지 않는다', async () => {
    const data = await dataOf(await demoSession(req('POST', '/api/v1/demo/session'), params({})))
    expect(data.entry_path).toBe(DEMO_ENTRY_PATH)
    expect(DEMO_ENTRY_PATH).toContain(`/t/${seeded.teamSlug}/p/${seeded.projectSlug}/`)
  })

  it('게스트 토큰에 이메일이 없다 — 응답 전체에 `@` 가 0건이다', async () => {
    const data = await dataOf(await demoSession(req('POST', '/api/v1/demo/session'), params({})))
    expect(JSON.stringify(data)).not.toContain('@')
    //  토큰의 payload 도 본다 — 서명한 것이 무엇인지가 이 주장의 실제 근거다.
    const payload = JSON.parse(
      Buffer.from((data.access_token as string).split('.')[1] as string, 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    expect(payload.sub).toBe(DEMO_GUEST_SUBJECT)
    expect(payload.email).toBeUndefined()
    expect(payload.name).toBeUndefined()
  })

  // -------------------------------------------------------------------
  //  🔴 화면 3 — 씨앗이 남긴 **가짜 대기**가 없다 (FINDINGS 137)
  //
  //  ★ 왜 이 시험이 있나 — 게스트가 `/demo` 에서 처음 여는 화면 3 에
  //    `차례 기다리는 중 · ⚠ 멈춘 것 같음` 카드가 떠 있었다. 게스트가 만든 것이 아니라
  //    씨앗이 라우트로 문서를 올리며 남긴 job 이고, 키가 없는 서버에서는 영원히 그 상태다.
  //    심사위원은 그걸 「AI 가 안 돈다」로 읽는다.
  // -------------------------------------------------------------------

  it('🔴 씨앗은 끝나지 않은 job 을 안 남긴다 — 화면 3 의 진행 목록이 비어 있다', async () => {
    const token = await guestToken()
    const data = await dataOf(await listJobs(
      req('GET', `/api/v1/projects/${seeded.projectId}/jobs?limit=50`, { auth: token }),
      params({ id: seeded.projectId }),
    ))
    const jobs = data.jobs as { status: string; stalled: boolean }[]
    expect(jobs.filter((j) => UNFINISHED_JOB_STATUSES.includes(j.status as never))).toEqual([])
    //  ⚠ 「멈춘 것 같음」 chip 을 없앤 것이 아니다 — 씨앗이 그 자리를 안 만들 뿐이다.
    expect(jobs.filter((j) => j.stalled)).toEqual([])
  })

  it('지우는 자리는 씨앗뿐이다 — 씨앗 뒤에 올린 문서는 여전히 job 을 만든다', async () => {
    const owner = seedSession(DEMO_TENANT.ownerSubject, DEMO_TENANT.ownerName)
    const id = seeded.projectId
    await dataOf(await createDocument(req('POST', `/api/v1/projects/${id}/documents`, {
      auth: owner, body: { title: '나중에 올린 문서', kind: 'notes', content: '이 문서는 구조화를 기다린다' },
    }), params({ id })))

    const data = await dataOf(await listJobs(
      req('GET', `/api/v1/projects/${id}/jobs?limit=50`, { auth: owner }), params({ id }),
    ))
    const jobs = data.jobs as { status: string; feature: string }[]
    expect(jobs.filter((j) => j.status === 'queued' && j.feature === 'structure')).toHaveLength(1)
  })

  it('「끝났나」를 손으로 세지 않는다 — 수명 표의 `finished` 축이 정본이다', () => {
    expect([...UNFINISHED_JOB_STATUSES]).toEqual(
      AI_JOB_STATUSES.filter((s) => !AI_JOB_STATUS_RULES[s].finished),
    )
    expect([...UNFINISHED_JOB_STATUSES]).toEqual(['queued', 'running'])
  })

  // -------------------------------------------------------------------
  //  ③ 읽기 전용 — 막는 자리가 하나라는 것을 **여러 라우트로** 잰다
  // -------------------------------------------------------------------

  it('게스트는 읽는다 — 항목 목록이 열린다', async () => {
    const token = await guestToken()
    const data = await dataOf(await listItems(
      req('GET', `/api/v1/projects/${seeded.projectId}/context-items?limit=100`, { auth: token }),
      params({ id: seeded.projectId }),
    ))
    expect((data.items as unknown[]).length).toBe(seeded.itemCount)
  })

  it('게스트는 못 바꾼다 — 문서 올리기·토큰 발급·발행·팀 만들기가 전부 403 이다', async () => {
    const token = await guestToken()
    const id = seeded.projectId

    const blocked = [
      await createDocument(req('POST', `/api/v1/projects/${id}/documents`, {
        auth: token, body: { title: '몰래 올린 문서', kind: 'goal', content: '이 줄은 저장되면 안 된다' },
      }), params({ id })),
      await createToken(req('POST', `/api/v1/projects/${id}/tokens`, {
        auth: token, body: { device_name: 'guest-laptop' },
      }), params({ id })),
      await publish(req('POST', `/api/v1/projects/${id}/versions/publish`, {
        auth: token, body: { semver: '2.0.0', base_version_id: null, change_summary: '몰래 발행' },
      }), params({ id })),
      await createTeam(req('POST', '/api/v1/teams', {
        auth: token, body: { name: '게스트 팀', slug: 'guest-team' },
      }), params({})),
    ]

    for (const res of blocked) {
      expect(res.status).toBe(403)
      expect((await errorOf(res)).code).toBe('FORBIDDEN')
    }
  })

  it('막는 자리가 **body 를 읽기 전**이다 — 잘못된 body 여도 400 이 아니라 403 이다', async () => {
    const token = await guestToken()
    const res = await createDocument(req('POST', `/api/v1/projects/${seeded.projectId}/documents`, {
      auth: token, body: { 없는칸: 1 },
    }), params({ id: seeded.projectId }))
    //  ⚠ 400 이면 게스트의 body 가 서버 안으로 한 걸음 들어온 것이다.
    expect(res.status).toBe(403)
  })

  it('로그인한 사람은 같은 문으로 바꾼다 — 막힌 것이 게스트뿐이다', async () => {
    //  ⚠ 이 갈래가 없으면 위 시험들은 「그 라우트가 원래 안 된다」로도 통과한다.
    const res = await createDocument(req('POST', `/api/v1/projects/${seeded.projectId}/documents`, {
      auth: sessionJwt(DEMO_TENANT.ownerSubject),
      body: { title: '팀장이 올린 문서', kind: 'goal', content: '이 줄은 저장된다' },
    }), params({ id: seeded.projectId }))
    expect(res.status).toBe(201)
  })
})

describe('배너 문구', () => {
  it('팀 이름·읽기 전용·리셋 시각을 한 줄에 말한다 (DESIGN_BRIEF §4)', () => {
    const text = demoBannerText()
    expect(text).toContain(DEMO_TENANT.teamName)
    expect(text).toContain('읽기 전용')
    expect(text).toContain(DEMO_TENANT.resetAt)
    //  ⚠ 「실시간」이라는 낱말을 쓰지 않는다 (SPEC §6).
    expect(text).not.toContain('실시간')
  })
})
