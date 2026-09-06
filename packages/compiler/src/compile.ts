import { Manifest, type ContextItem, type PackTarget } from '@contextops/schema'
import { applyBudget, collect, renderAll, type BaseVars, type Excluded, type SourceMapEntry } from './assemble'
import { CompileError } from './errors'
import { byteLength, manifestHash, sha256, snapshotHash } from './hash'
import { parseCompileInput, type CompileInput } from './input'
import { sortItems } from './sort'
import { compareCodepoints } from './text'

// =====================================================================
//  compile() — 정본은 docs/SPEC.md §4.
//
//  🔴 **이 함수 안에는 LLM 도, 시각도, 난수도, 네트워크도 없다 (P4).**
//    같은 snapshot 을 두 번 넣으면 byte 가 같은 Pack 이 나온다. 그게 「같은 버전·같은
//    해시로 배포」라는 주장의 전부이고, `tools/principles.ps1` 이 기계로 센다.
//    ⚠ 현재 시각이 필요해지면 그건 입력으로 받아야 한다는 신호다 (`generated_at`).
//      시각·난수 함수 이름은 이 폴더에 **주석으로도** 쓰지 마라 — tools/principles.ps1 은
//      줄 단위로 세기 때문에 주석에 적어도 FAIL 이다. 그 무딤이 이 게이트의 힘이다.
// =====================================================================

export type PackFile = {
  path: string
  target: PackTarget
  text: string
  sha256: string
  /** UTF-8 바이트 수. */
  size: number
  source_item_ids: string[]
  /** 6단계 — 이 파일의 어느 줄이 어느 항목에서 왔나 (P7 의 역추적 색인). */
  sourcemap: SourceMapEntry[]
}

export type CompileResult = {
  files: PackFile[]
  manifest: Manifest
  excluded: Excluded[]
  /** 분량 한도 때문에 파일을 옮기거나 나눈 기록 (SPEC §4.1 5단계). */
  warnings: string[]
}

export function compile(input: CompileInput): CompileResult {
  const { snapshot, project, templateVersion, compilerVersion } = parseCompileInput(input)

  const snapshot_hash = snapshotHash(snapshot)
  const base: BaseVars = {
    projectName: project.name,
    version: snapshot.context_version,
    snapshotShort: snapshot_hash.slice(0, 8),
  }

  const collected = collect(snapshot.items)
  const budgeted = applyBudget(collected.docs, base)
  const files: PackFile[] = renderAll(budgeted.docs, base)
    .map((doc) => ({ ...doc, sha256: sha256(doc.text), size: byteLength(doc.text) }))
    .sort((a, b) => compareCodepoints(a.path, b.path))

  //  🔴 **「빈 Pack」은 파일 수가 아니라 근거 수로 잰다.**
  //
  //  ★ 왜 파일 수가 아닌가 — `always` 문서(§4.3)를 `collect` 가 **먼저** 만들어서
  //    `files.length` 는 **0 이 될 수 없다.** 그래서 이 가드는 있는 채로 한 번도 걸리지
  //    않았고, 승인된 항목이 0개인 snapshot 이 「제품이 넣는 고정 텍스트」 한 장짜리
  //    Pack 으로 발행됐다 — 사람은 규칙 한 줄 없는 v1.0.0 을 손에 쥔다
  //    (docs/feedback/FINDINGS.md 80).
  //  ⚠ **입력의 항목 수를 세지 마라.** 항목이 있어도 전부 제외되면(초안·폐기·
  //    open_question) 결과는 똑같이 빈 Pack 이다. 재야 하는 것은 입력이 아니라
  //    **나온 Pack 에 팀의 것이 한 줄이라도 있는가**이고, 그 답은 `source_item_ids` 다 (P7).
  if (files.every((f) => f.source_item_ids.length === 0)) {
    throw new CompileError(
      'EMPTY_SNAPSHOT',
      'Pack 에 항목에서 온 줄이 하나도 없다 (전부 제외됐거나 snapshot 이 비었다)',
    )
  }

  const manifestFiles = files.map((f) => ({
    path: f.path,
    sha256: f.sha256,
    size: f.size,
    target: f.target,
    source_item_ids: f.source_item_ids,
  }))

  // Manifest 는 스키마로 다시 파싱한다 — 근거 없는 파일(`source_item_ids` 빈 배열)이나
  // 규격 밖의 경로가 있으면 **여기서 막힌다.** 계약은 한 곳(packages/schema)이다.
  const manifest = Manifest.parse({
    schema_version: '1.0',
    compiler_version: compilerVersion,
    template_version: templateVersion,
    team_id: snapshot.team_id,
    project_id: snapshot.project_id,
    context_version: snapshot.context_version,
    generated_at: snapshot.generated_at,
    snapshot_hash,
    files: manifestFiles,
    milestones: milestonesOf(snapshot.items, collected.excluded),
    excluded: collected.excluded,
    manifest_hash: manifestHash(manifestFiles),
  })

  return { files, manifest, excluded: collected.excluded, warnings: budgeted.warnings }
}

/** Manifest 의 마일스톤 한 줄 — 칸의 정본은 `packages/schema` 의 `ManifestMilestone` (칸을 더하는 절차도 거기 주석). */
type ManifestMilestoneRow = { id: string; due?: string; paths: string[]; done_when: string[] }

/**
 * Manifest 의 마일스톤 목록 — `stop.mjs` 가 이 `paths` 로 진행 보고를 만든다 (SPEC §8.6) ·
 * 화면 8 이 `due` 를 읽는다 (FINDINGS 111).
 * ⚠ 제외된 항목은 빠진다. 제외 판정을 여기서 다시 쓰지 않고 `collect` 의 결과를 받는다 —
 *   같은 판정이 두 곳에 있으면 조용히 갈라진다.
 */
function milestonesOf(
  items: readonly ContextItem[],
  excluded: readonly Excluded[],
): ManifestMilestoneRow[] {
  const gone = new Set(excluded.map((e) => e.item_id))
  const byId = new Map<string, ManifestMilestoneRow>()
  // ⚠ 정렬한 뒤에 도는 이유 — 같은 milestone_id 가 둘이면 「먼저 온 것」이 이기는데,
  //   그 「먼저」가 입력 순서면 셔플했을 때 Manifest 가 달라진다 (P4).
  for (const item of sortItems(items)) {
    if (item.type !== 'roadmap' || gone.has(item.id)) continue
    if (byId.has(item.data.milestone_id)) continue      // 먼저 온 것이 이긴다 (정렬이 순서를 정한다)
    byId.set(item.data.milestone_id, {
      id: item.data.milestone_id,
      //  기한은 `RoadmapData.due` **그대로** — 없으면 키 자체를 안 만든다 (`undefined` 키가 있으면
      //  JSON 과 toEqual 이 다른 말을 한다 · P4). 본문(`sections.ts`)은 전부터 같은 값을 적었다 (FINDINGS 111).
      ...(item.data.due === undefined ? {} : { due: item.data.due }),
      paths: [...item.data.paths],
      done_when: [...item.data.done_when],
    })
  }
  return [...byId.values()].sort((a, b) => compareCodepoints(a.id, b.id))
}
