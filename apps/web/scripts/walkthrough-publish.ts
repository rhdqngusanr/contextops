import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Manifest, PRODUCT_TEXT_PACK_FILES } from '@contextops/schema'
import { ENFORCEMENT_LABEL, parseTraceTag, PROGRESS_REPORT } from '@contextops/compiler'

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
import { fromDoc, seedPaylab, type EvidenceExpectation } from './seed'

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

/**
 * 데모 Pack 이 보여 줘야 하는 **강제 수단의 최소 갈래 수** (FINDINGS 89).
 * ★ 왜 2 인가 — 1 이면 「이 정책을 무엇이 강제하나」가 상수처럼 읽힌다. 사람은 같은 말이
 *   모든 줄에 붙어 있으면 그게 값이 아니라 장식인 줄 안다. 둘부터 값으로 읽힌다.
 * ★ 왜 4(전부)가 아닌가 — 픽스처의 줄은 전부 문서까지 역추적된다(P7). 문서에 근거가 없는
 *   갈래는 **지어내면 안 된다.** 넷을 다 보이려면 goals.md 를 먼저 늘려야 한다.
 */
const PACK_ENFORCEMENT_MIN = 2

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

/** 픽스처 문서 하나를 그대로 읽는다 — 근거를 **따라가는** 쪽이 원문을 여기서 본다. */
function fixtureDoc(name: string): string {
  return readFileSync(join(root, 'fixtures', 'paylab-docs', name), 'utf8')
}

/** 태그 조각 `doc:<uuid>#<start>-<end>` 하나. 나머지 3종(repo·proposal·manual)은 문서가 아니다. */
const DOC_SRC_RE = /^doc:([0-9a-fA-F-]{36})#(\d+)-(\d+)$/

/**
 * 🔴 **역추적을 실제로 따라간다** (P7 · FINDINGS 90).
 *
 * Pack 의 태그에서 `doc:<uuid>#start-end` 를 꺼내 **원문 파일을 그 범위로 잘라 보고**,
 * 그 안에 항목이 주장하는 문장이 있는지 센다. 문서가 다르면(uuid) 거기서도 걸린다.
 *
 * ★ 왜 「태그가 붙어 있나」(`untagged === 0`)로 부족한가 — 일곱 항목이 전부 `#0-400` 을
 *   달고 있었고 그중 여섯은 그 범위 안에 그 문장이 **없었다.** 태그 수만 세면 초록이다.
 *   발표 2:40 이 「Pack Explorer 역추적」이다 (SPEC §10.5) — 심사자가 한 번만 따라가 보면
 *   종이가 가리킨 자리에 그 문장이 없다.
 *
 * ⚠ 기대 문장을 여기 적지 마라 — 씨앗이 낸 `SeedResult.evidence` 를 **읽기만** 한다.
 *   두 곳에 적으면 픽스처를 고친 사람이 검사 쪽 문장을 고쳐서 초록을 만든다.
 */
function followEvidence(packTexts: string[], expected: EvidenceExpectation[]): {
  followed: number; items: Set<string>; broken: string[]
} {
  const want = new Map(expected.map((e) => [e.itemId, e]))
  const broken: string[] = []
  const items = new Set<string>()
  let followed = 0

  for (const text of packTexts) {
    for (const line of text.split('\n')) {
      const tag = parseTraceTag(line)
      if (!tag) continue
      const e = want.get(tag.itemId)
      if (!e) {
        broken.push(`${tag.itemId}: Pack 에 있는데 기대 문장이 없다`)
        continue
      }
      for (const src of tag.src) {
        const m = DOC_SRC_RE.exec(src)
        //  문서 근거가 아닌 조각(`proposal:` 등)은 여기서 잴 것이 없다 — 건너뛴다.
        if (!m?.[1] || !m[2] || !m[3]) continue
        followed++
        items.add(tag.itemId)
        if (m[1] !== e.documentVersionId) {
          broken.push(`${tag.itemId}: 태그가 딴 문서를 가리킨다 (${e.docName} 이어야 한다)`)
          continue
        }
        const cut = fixtureDoc(e.docName).slice(Number(m[2]), Number(m[3]))
        if (!cut.includes(e.quote)) {
          broken.push(`${tag.itemId}: ${e.docName}#${m[2]}-${m[3]} 안에 그 문장이 없다`)
        }
      }
    }
  }
  return { followed, items, broken }
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

    check('픽스처 문서 2개가 들어갔다', seed.goals.versionId.length > 0 && seed.roadmap.versionId.length > 0)
    //  ⚠ 개수를 여기 적지 마라 — 씨앗이 낸 `drafted` 와 견준다. 픽스처에 한 줄을 더한
    //    사람이 이 파일까지 고치게 만들면, 그 사람은 검사 쪽 숫자를 고쳐서 초록을 만든다.
    check(`초안 ${seed.drafted}개가 전부 받아들여졌다`, seed.accepted === seed.drafted && seed.rejected.length === 0,
      seed.rejected.length > 0 ? JSON.stringify(seed.rejected) : `accepted ${seed.accepted}`)
    check('초안이 전부 active 가 됐다 — 아니면 Pack 에 한 줄도 안 나온다', seed.itemUuids.length === seed.drafted)

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
    /** 받은 Pack 본문 전부. **사람이 읽는 종이**를 재는 검사들이 이걸 읽는다. */
    const packTexts: string[] = []
    for (const f of manifest.files) {
      const res = await packFile(
        req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/files/${f.path}`, { auth: owner }),
        params({ id: projectId, semver: '1.0.0', path: f.path.split('/') }),
      )
      const text = await res.text()
      packTexts.push(text)
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

    //  🔴 **데모가 표의 한 갈래로 몰리지 않는다** (FINDINGS 89).
    //  ★ 왜 이게 따로 필요한가 — `compiler/test/liveness.test.ts` 는 「네 값이 서로 다른
    //    줄을 낸다」를 재고 여러 바퀴 초록이었다. 그런데 **심사자가 실제로 읽는 종이**에는
    //    `review` 한 갈래뿐이었다. **표가 살아 있는 것과 데모가 그걸 보여 주는 것은
    //    다른 질문이고, 뒤의 것은 아무도 안 세고 있었다.**
    //  ⚠ 기준이 「넷 전부」가 아닌 이유 — 픽스처의 모든 줄은 goals.md 까지 역추적된다(P7).
    //    갈래를 채우겠다고 문서에 없는 규칙을 씨앗에 적으면 근거 없는 줄이 생긴다.
    //    갈래를 늘리려면 **문서를 먼저** 늘려라 (SPEC §10.1 이 그 문서의 정본이다).
    const labels = Object.values(ENFORCEMENT_LABEL)
    const shown = labels.filter((label) => packTexts.some((t) => t.includes(label)))
    check(`Pack 이 강제 수단을 ${shown.length}갈래로 보여 준다 (표는 ${labels.length}갈래 · 최소 ${PACK_ENFORCEMENT_MIN})`,
      shown.length >= PACK_ENFORCEMENT_MIN, shown.join(' · '))

    // ── ⑦ 낡은 기준으로 발행하면 409 ───────────────────────────────────
    const stale = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver: '1.1.0', base_version_id: null },
    }), params({ id: projectId }))
    check('낡은 base 는 409 STALE_BASE 다', stale.status === 409 && (await errorOf(stale)).code === 'STALE_BASE')

    // ── ⑧ 제안 → 승인 → 둘째 발행 ─────────────────────────────────────
    //  ⚠ 이 초안도 씨앗과 **같은 문**(`fromDoc`)으로 만든다. 근거를 손으로 적는 자리를
    //    여기 다시 만들면 그 자리만 조용히 `0-400` 으로 남는다 — FINDINGS 90 이 정확히
    //    그거였고, 관통 자신이 그 고장을 하나 더 들고 있었다.
    const settlement = fromDoc('item_goal_settlement', 'goal', seed.goals,
      '| G3 | 정산 오차 0원 | 일 배치 후 원장 대사 차액 | 2026-06-30 |', {
        title: '정산 오차 0원',
        body: '일 배치 후 원장 대사 차액으로 잰다.',
        data: { outcome: '정산 오차 0원', metric: '일 배치 후 원장 대사 차액', deadline: '2026-06-30' },
      })
    const proposal = await dataOf(await createProposal(req('POST', `/api/v1/projects/${projectId}/proposals`, {
      auth: owner,
      body: {
        title: '정산 오차 0원을 목표로 더한다',
        summary: 'G3 를 항목으로 올린다',
        base_version_id: v1.id,
        items: [{
          operation: 'add',
          draft: settlement.draft,
          //  제안의 근거는 초안의 근거와 **같은 것**이다. 따로 적으면 둘이 갈라진다.
          evidence: settlement.draft.source_refs,
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

    //  🔴 **P7 을 끝까지 따라간다** (FINDINGS 90). 위의 `untagged === 0` 은 「태그가
    //     붙어 있나」까지다. 여기서는 그 태그의 `#start-end` 를 **원문에서 잘라 보고**
    //     항목이 주장하는 문장이 그 안에 있는지 센다.
    packTexts.push(claude2Text)
    const expected = [...seed.evidence, settlement.evidence]
    const followed = followEvidence(packTexts, expected)
    check(`🔴 P7 — 태그를 따라가면 원문에 그 문장이 있다 (근거 ${followed.followed}개)`,
      followed.broken.length === 0, followed.broken.join(' · '))
    //  ⚠ 위 검사는 **본 것만** 센다 — 항목이 Pack 에서 통째로 빠지면 셀 것이 없어서 초록이다.
    //    그래서 「기대한 항목이 전부 종이에 있었나」를 따로 센다.
    const missing = expected.filter((e) => !followed.items.has(e.itemId)).map((e) => e.itemId)
    check(`기대한 항목 ${expected.length}개가 전부 Pack 에서 역추적됐다`, missing.length === 0, missing.join(' · '))

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
        //  ⚠ 씨앗의 `item_road_m1.done_when[0]` 과 **글자가 같아야** 그 기준이 채워진다.
        //    그 글자는 goals.md §4 M1 에서 왔다 (FINDINGS 90 으로 근거 문서를 옮겼다).
        criterion: 'PSP 호출 재시도 정책이 공용 모듈 한 곳에만 있다',
        evidence: [{ path: 'src/payment/retry.ts', start_line: 14, end_line: 31 }],
        summary: '고정 간격 호출을 공용 백오프 모듈로 모았다',
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
