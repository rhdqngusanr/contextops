import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { Manifest } from '@contextops/schema'

import { contextItems } from '../src/db/schema'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../src/app/api/v1/projects/[id]/repos/route'
import { POST as createToken } from '../src/app/api/v1/projects/[id]/tokens/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { POST as batchDraft } from '../src/app/api/v1/projects/[id]/context-items/batch-draft/route'
import { PATCH as updateItem } from '../src/app/api/v1/context-items/[id]/route'
import { POST as createProposal } from '../src/app/api/v1/projects/[id]/proposals/route'
import { POST as submitProposal } from '../src/app/api/v1/proposals/[id]/submit/route'
import { POST as approveProposal } from '../src/app/api/v1/proposals/[id]/approve/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { GET as latestManifest } from '../src/app/api/v1/projects/[id]/packs/latest/manifest/route'
import { GET as packFile } from '../src/app/api/v1/projects/[id]/packs/[semver]/files/[...path]/route'
import { POST as syncReport } from '../src/app/api/v1/projects/[id]/sync-reports/route'
import { GET as syncStatus } from '../src/app/api/v1/projects/[id]/sync-status/route'
import { POST as postProgress } from '../src/app/api/v1/projects/[id]/progress/route'
import { GET as roadmap } from '../src/app/api/v1/projects/[id]/roadmap/route'
import { closeDb, dataOf, errorOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from '../test/helpers/db'

// =====================================================================
//  관통 2단계 — 픽스처 문서 → 항목 → 발행 → Pack 파일 (SPEC §2.1 · §5)
//    tools/walkthrough.ps1 의 `publish` 단계가 이 파일을 부른다.
//
//  ★ 왜 시험이 있는데 또 이게 있나 — 시험은 **조각**을 잰다. 여기서 재는 것은
//    「픽스처를 넣고 한 번도 안 멈추고 Pack 까지 가는가」다. 단위 시험이 전부 초록인데
//    제품이 안 도는 상태가 실제로 생긴다 (loop/PROMPT.md ④).
//
//  ★ **산출물을 밖에 남긴다** — `.ci/walkthrough-pack/`. 눈 판정(⑦ 3층)의 재료는
//    숫자가 아니라 「사람이 읽는 CLAUDE.md」다. 사람이 읽을 것을 파일로 안 남기면
//    다음 바퀴는 또 못 읽는다.
//    ⚠ `.ci/shots/` 와 달리 이 폴더는 관통이 지우지 않는다 — 여기서만 지운다.
//
//  ⚠ `test/helpers/db.ts` 를 들여온다. 마이그레이션을 읽고 PGlite 에 먹이는 절차는
//    이 저장소에 **하나뿐**이어야 한다 — 여기서 다시 쓰면 「시험은 초록인데 관통은
//    다른 DDL 을 보는」 상태가 생긴다.
// =====================================================================

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const outDir = join(root, '.ci', 'walkthrough-pack')

const checks: { name: string; ok: boolean; detail: string }[] = []
function check(name: string, ok: boolean, detail = ''): void {
  checks.push({ name, ok, detail })
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** 픽스처 문서 하나를 그대로 올린다 (P1 — 문서 본문은 사용자가 의도적으로 올린다). */
function fixtureDoc(name: string): string {
  return readFileSync(join(root, 'fixtures', 'paylab-docs', name), 'utf8')
}

/**
 * 문서에서 온 항목 초안. **근거가 문서의 문자 범위**라 P7 이 원문까지 이어진다.
 * ⚠ 문장을 서버가 지어내지 않는다 — 구조화는 §7.1(P3)의 일이고, 여기서는 사람이 적은
 *   것과 같은 자리에 손으로 넣는다. 그게 지금 진짜로 도는 경로다.
 */
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

async function main(): Promise<void> {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const { pg, db } = await freshDb()

  try {
    const owner = sessionJwt('walkthrough-owner')

    // ── ① 팀 · 프로젝트 · 레포 ─────────────────────────────────────────
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

    // ── ② 픽스처 문서 2개를 올린다 ─────────────────────────────────────
    const goals = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
      auth: owner, body: { title: '팀 목표와 규칙', kind: 'goal', content: fixtureDoc('goals.md') },
    }), params({ id: projectId })))
    const roadmapDoc = await dataOf(await createDocument(req('POST', `/api/v1/projects/${projectId}/documents`, {
      auth: owner, body: { title: '지난 분기 로드맵', kind: 'roadmap', content: fixtureDoc('old-roadmap.md') },
    }), params({ id: projectId })))
    check('픽스처 문서 2개가 들어갔다', typeof goals.current_version_id === 'string' && typeof roadmapDoc.current_version_id === 'string')

    const goalsVersion = goals.current_version_id as string
    const roadmapVersion = roadmapDoc.current_version_id as string

    // ── ③ 항목 초안 → 전부 active ──────────────────────────────────────
    const drafts = [
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

    const batch = await dataOf(await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
      auth: owner,
      body: { items: drafts, repo: 'paylab-api', scan_summary: { file_count: 42, languages: ['ts'] } },
    }), params({ id: projectId })))
    const rejected = batch.rejected as { index: number; issues: unknown[] }[]
    check('초안 6개가 전부 받아들여졌다', (batch.accepted as unknown[]).length === drafts.length,
      rejected.length > 0 ? JSON.stringify(rejected) : `accepted ${(batch.accepted as unknown[]).length}`)

    const itemRows = await db.select({ id: contextItems.id }).from(contextItems).where(eq(contextItems.projectId, projectId))
    for (const row of itemRows) {
      await updateItem(req('PATCH', `/api/v1/context-items/${row.id}`, {
        auth: owner, body: { revision: 1, changes: { status: 'active' } },
      }), params({ id: row.id }))
    }

    // ── ④ 발행 ────────────────────────────────────────────────────────
    const first = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.0.0', base_version_id: null, change_summary: '첫 정본' },
    }), params({ id: projectId }))
    check('발행이 201 이다', first.status === 201, first.status === 201 ? '' : JSON.stringify(await errorOf(first)))
    const v1 = await dataOf(first)

    // ── ⑤ Manifest 를 받아 계약으로 되판다 ─────────────────────────────
    const manifestRes = await latestManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/latest/manifest`, { auth: owner }), params({ id: projectId }),
    )
    const manifest = Manifest.parse(await dataOf(manifestRes))
    check('latest manifest 가 계약을 지킨다', manifest.manifest_hash === v1.manifest_hash,
      `files ${manifest.files.length} · ${manifest.manifest_hash.slice(0, 12)}`)

    const etag = manifestRes.headers.get('etag') ?? ''
    const notModified = await latestManifest(req('GET', `/api/v1/projects/${projectId}/packs/latest/manifest`, {
      auth: owner, headers: { 'if-none-match': etag },
    }), params({ id: projectId }))
    check('같은 ETag 로 다시 부르면 304 다', notModified.status === 304)

    // ── ⑥ Pack 파일을 하나씩 받아 **해시를 다시 재고** 밖에 남긴다 ─────
    rmSync(outDir, { recursive: true, force: true })
    let hashMismatch = 0
    let untagged = 0
    for (const f of manifest.files) {
      const res = await packFile(
        req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/files/${f.path}`, { auth: owner }),
        params({ id: projectId, semver: '1.0.0', path: f.path.split('/') }),
      )
      const text = await res.text()
      if (sha256(text) !== f.sha256) hashMismatch++
      //  🔴 P7 — 근거 없는 파일이 없다. 태그가 하나도 없는 파일은 역추적이 끊긴 것이다.
      if (!text.includes('ctx:')) untagged++

      const target = join(outDir, f.path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, text, 'utf8')
    }
    check('받은 본문의 sha256 이 Manifest 와 전부 같다', hashMismatch === 0, `파일 ${manifest.files.length}개`)
    check('🔴 P7 — 모든 Pack 파일에 역추적 태그가 있다', untagged === 0)
    check('🔴 P7 — Manifest 의 모든 파일이 항목에서 왔다',
      manifest.files.every((f) => f.source_item_ids.length > 0))

    // ── ⑦ 낡은 기준으로 발행하면 409 ───────────────────────────────────
    const stale = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: null },
    }), params({ id: projectId }))
    check('낡은 base 는 409 STALE_BASE 다', stale.status === 409 && (await errorOf(stale)).code === 'STALE_BASE')

    // ── ⑧ 제안 → 승인 → 둘째 발행 ─────────────────────────────────────
    const proposal = await dataOf(await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '정산 오차 0원을 목표로 더한다',
        summary: 'G3 를 항목으로 올린다',
        base_version_id: v1.id,
        items: [{
          operation: 'add',
          draft: fromDoc('item_goal_settlement', 'goal', goalsVersion, {
            title: '정산 오차 0원',
            body: '일 배치 후 원장 대사 차액으로 잰다.',
            data: { outcome: '정산 오차 0원', metric: '일 배치 후 원장 대사 차액', deadline: '2026-06-30' },
          }),
          evidence: [{ kind: 'source_document', document_version_id: goalsVersion, start_char: 0, end_char: 200, heading_path: ['2. 올해의 목표'] }],
          reason: '문서에는 있는데 항목에 없었다',
        }],
        relates_to: ['PL-M1'],
        client_request_id: randomUUID(),
      },
    }), params({ id: projectId })))
    const proposalId = proposal.id as string
    await submitProposal(req('POST', `/api/v1/proposals/${proposalId}/submit`, { auth: owner }), params({ id: proposalId }))
    await approveProposal(req('POST', `/api/v1/proposals/${proposalId}/approve`, { auth: owner }), params({ id: proposalId }))

    const second = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: v1.id, change_summary: '정산 목표 추가' },
    }), params({ id: projectId }))
    check('승인된 제안이 붙은 둘째 발행이 201 이다', second.status === 201,
      second.status === 201 ? '' : JSON.stringify(await errorOf(second)))
    const v2 = await dataOf(second)

    const claude2 = await packFile(
      req('GET', `/api/v1/projects/${projectId}/packs/1.1.0/files/CLAUDE.md`, { auth: owner }),
      params({ id: projectId, semver: '1.1.0', path: ['CLAUDE.md'] }),
    )
    const claude2Text = await claude2.text()
    check('제안이 만든 항목이 실제로 Pack 에 나온다', claude2Text.includes('ctx:item_goal_settlement'))
    check('발행마다 manifest_hash 가 달라진다', v1.manifest_hash !== v2.manifest_hash)

    mkdirSync(join(outDir, 'v1.1.0'), { recursive: true })
    writeFileSync(join(outDir, 'v1.1.0', 'CLAUDE.md'), claude2Text, 'utf8')

    // ── ⑨ 기기 둘 · 하나만 보고 → applied / unknown ────────────────────
    const reporting = await dataOf(await createToken(
      req('POST', `/api/v1/projects/${projectId}/tokens`, { auth: owner, body: { device_name: 'mac-report' } }),
      params({ id: projectId }),
    ))
    await createToken(
      req('POST', `/api/v1/projects/${projectId}/tokens`, { auth: owner, body: { device_name: 'win-silent' } }),
      params({ id: projectId }),
    )
    await syncReport(req('POST', `/api/v1/projects/${projectId}/sync-reports`, {
      auth: reporting.token as string,
      body: { version: '1.1.0', manifest_hash: v2.manifest_hash, status: 'applied', files: [] },
    }), params({ id: projectId }))

    const status = await dataOf(await syncStatus(
      req('GET', `/api/v1/projects/${projectId}/sync-status`, { auth: owner }), params({ id: projectId }),
    ))
    const byName = Object.fromEntries((status.devices as { device_name: string; status: string }[])
      .map((d) => [d.device_name, d.status]))
    check('🔴 보고한 기기는 applied · 안 한 기기는 unknown 이다 (FINDINGS 16)',
      byName['mac-report'] === 'applied' && byName['win-silent'] === 'unknown',
      JSON.stringify(byName))

    // ── ⑩ 진행 보고 → roadmap 이 갈린다 ────────────────────────────────
    const before = await dataOf(await roadmap(req('GET', `/api/v1/projects/${projectId}/roadmap`, { auth: owner }), params({ id: projectId })))
    await postProgress(req('POST', `/api/v1/projects/${projectId}/progress`, {
      auth: reporting.token as string,
      body: {
        milestone_id: 'PL-M1',
        status: 'criterion_done',
        criterion: '재시도가 지수 백오프로 통일된다',
        evidence: [{ path: 'src/payment/retry.ts', start_line: 14, end_line: 31 }],
        summary: '고정 간격 호출을 백오프로 바꿨다',
        context_version: '1.1.0',
        source: 'agent',
        client_event_id: randomUUID(),
      },
    }), params({ id: projectId }))
    const after = await dataOf(await roadmap(req('GET', `/api/v1/projects/${projectId}/roadmap`, { auth: owner }), params({ id: projectId })))

    type Row = { milestone: string; status: string; last_report_at: string | null; done_when: { evidence_count: number }[] }
    const b = (before.milestones as Row[])[0]
    const a = (after.milestones as Row[])[0]
    check('보고 하나가 roadmap 을 실제로 바꾼다',
      b?.status === 'not_started' && a?.status === 'in_progress' && (a?.done_when[0]?.evidence_count ?? 0) === 1,
      `${b?.status} → ${a?.status}`)
    check('🔴 P5 — roadmap 의 행이 마일스톤이다 (사람이 아니다)',
      a?.milestone === 'PL-M1' && !JSON.stringify(a).includes('user_id'))

    // ── 요약 ──────────────────────────────────────────────────────────
    const failed = checks.filter((c) => !c.ok)
    writeFileSync(join(root, '.ci', 'walkthrough-publish.json'), JSON.stringify({
      checks,
      versions: [
        { semver: '1.0.0', manifest_hash: v1.manifest_hash, files: v1.file_count },
        { semver: '1.1.0', manifest_hash: v2.manifest_hash, files: v2.file_count },
      ],
      pack_dir: '.ci/walkthrough-pack',
    }, null, 2), 'utf8')

    console.log('')
    console.log(`  Pack 을 남겼다: .ci/walkthrough-pack/ (${manifest.files.length}개 + v1.1.0/CLAUDE.md)`)
    console.log('  ⚠ 통과는 「안 막혔다」지 「좋다」가 아니다 — 저 CLAUDE.md 를 사람이 읽어라.')
    if (failed.length > 0) {
      console.error(`\n  관통이 ${failed.length}곳에서 막혔다: ${failed.map((f) => f.name).join(' · ')}`)
      process.exitCode = 1
    }
  } finally {
    await closeDb(pg)
  }
}

await main()
