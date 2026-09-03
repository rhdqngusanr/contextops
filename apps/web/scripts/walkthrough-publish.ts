import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Manifest, PRODUCT_TEXT_PACK_FILES } from '@contextops/schema'
import { PROGRESS_REPORT } from '@contextops/compiler'

import { POST as createToken } from '../src/app/api/v1/projects/[id]/tokens/route'
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
import { seedPaylab } from './seed'

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

/** 항목에서 오지 않아도 되는 파일인가 — 판정의 정본은 `packages/schema` 의 표다 (P7 의 예외). */
function isProductText(path: string): boolean {
  return (PRODUCT_TEXT_PACK_FILES as readonly string[]).includes(path)
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
    // ── ①②③ 팀·프로젝트·문서·항목 — 씨앗은 `scripts/seed.ts` 하나다 ────
    //  ⚠ 여기서 다시 적지 마라. 같은 서사를 개발용 서버(dev-server.ts)도 쓴다 —
    //    갈리면 **관통이 보는 데이터와 사람이 화면에서 보는 데이터가 달라진다.**
    const seed = await seedPaylab('walkthrough-owner')
    const { owner, projectId } = seed

    check('픽스처 문서 2개가 들어갔다', seed.goalsVersion.length > 0 && seed.roadmapVersion.length > 0)
    check('초안 6개가 전부 받아들여졌다', seed.accepted === 6 && seed.rejected.length === 0,
      seed.rejected.length > 0 ? JSON.stringify(seed.rejected) : `accepted ${seed.accepted}`)
    check('초안이 전부 active 가 됐다 — 아니면 Pack 에 한 줄도 안 나온다', seed.itemUuids.length === 6)

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
      //     예외는 계약에 **이름으로** 적힌 제품 고정 텍스트뿐이다 (SPEC §4.3).
      if (!text.includes('ctx:') && !isProductText(f.path)) untagged++

      const target = join(outDir, f.path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, text, 'utf8')
    }
    check('받은 본문의 sha256 이 Manifest 와 전부 같다', hashMismatch === 0, `파일 ${manifest.files.length}개`)

    //  🔴 **다음 단계(sync)가 이 Manifest 를 그대로 쓴다.** 여기서 남기지 않으면
    //     sync 단계는 자기가 Manifest 를 지어내야 하고, 그러면 「서버가 준 것을
    //     플러그인이 받아들이나」를 재는 게 아니라 우리가 만든 것을 우리가 읽는 꼴이다.
    writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    check('🔴 P7 — 모든 Pack 파일에 역추적 태그가 있다 (예외 표 밖에서)', untagged === 0)
    check('🔴 P7 — Manifest 의 모든 파일이 항목에서 왔다 (예외 표 밖에서)',
      manifest.files.every((f) => f.source_item_ids.length > 0 || isProductText(f.path)))
    //  🔴 SPEC §4.3 — 진행 보고 문단이 **이 Pack 에 실제로 있다.** 없으면 agent 는
    //     `progress` 를 배우지 못하고 Roadmap 이 영원히 0건이다 (FINDINGS 43).
    //     ⚠ paylab 픽스처에는 workflow 항목이 없다 — 그래서 이 검사가 의미가 있다.
    const workflowPath = PRODUCT_TEXT_PACK_FILES[0]
    const workflowText = readFileSync(join(outDir, workflowPath), 'utf8')
    check(`🔴 workflow 항목이 0개인데도 ${workflowPath} 가 나왔다 (SPEC §4.3)`,
      manifest.files.some((f) => f.path === workflowPath))
    check('그 파일이 진행 보고 문단을 전부 담는다', PROGRESS_REPORT.every((line) => workflowText.includes(line)),
      `${PROGRESS_REPORT.length}줄`)

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
          draft: fromDoc('item_goal_settlement', 'goal', seed.goalsVersion, {
            title: '정산 오차 0원',
            body: '일 배치 후 원장 대사 차액으로 잰다.',
            data: { outcome: '정산 오차 0원', metric: '일 배치 후 원장 대사 차액', deadline: '2026-06-30' },
          }),
          evidence: [{ kind: 'source_document', document_version_id: seed.goalsVersion, start_char: 0, end_char: 200, heading_path: ['2. 올해의 목표'] }],
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
