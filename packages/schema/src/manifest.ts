import { z } from 'zod'
import { CalendarDate, ItemId, MilestoneId, RepoPath, Sha256 } from './common'

// =====================================================================
//  Manifest — 발행된 Pack 한 벌의 목록표. 정본은 docs/SPEC.md §3.
//
//  ★ manifest_hash = sha256(files 를 path 순 정렬 후 "path\nsha256\n" 연결).
//    계산은 `packages/compiler` 가 한다 — 여기는 **모양**만 정한다.
//    ⚠ 규칙 문장을 컴파일러 쪽에 다시 적지 마라. 갈라지면 재현성 주장이 거짓이 된다.
// =====================================================================

/** Pack 이 나가는 대상 3종 (SPEC §4.1 partition 표의 마지막 줄). */
export const PACK_TARGETS = ['claude', 'agents', 'cursor'] as const
export type PackTarget = (typeof PACK_TARGETS)[number]

/**
 * 🔴 **항목 없이도 나갈 수 있는 Pack 파일의 정본 표 — P7 의 유일한 예외.**
 *
 * 이 경로의 내용은 팀 항목이 아니라 **제품이 넣는 고정 사용법**이다 (SPEC §4.3 의
 * 진행 보고 문단). 그래서 근거가 될 항목이 없고 `source_item_ids` 가 빌 수 있다.
 * 나머지 파일은 여전히 빈 `source_item_ids` 로 막힌다.
 *
 * ★ 왜 표인가 — 예외를 컴파일러 안에 숨기면 다음 예외가 쉬워지고, 「근거 없는 줄이
 *   하나라도 있으면 환각 차단 주장이 무너진다」가 조용히 넓어진다. 여기 **이름으로**
 *   적어 두면 「예외가 무엇이냐」에 한 줄로 답할 수 있다.
 * ★ 여기 한 줄을 더하는 절차: ① 이 표에 경로 ② `packages/compiler` 의 `DOCS` 표에서
 *   그 문서에 `always: true` ③ 그 문서의 고정 텍스트를 `compiler/test/traceability.test.ts`
 *   의 `isTemplateLine` 이 알아보게 한다. ①만 하면 `compiler/test/always.test.ts` 가 빨개진다.
 */
export const PRODUCT_TEXT_PACK_FILES = ['.claude/rules/workflow.md'] as const

export const ManifestFile = z.object({
  path: RepoPath,
  sha256: Sha256,
  size: z.int().min(0),
  target: z.enum(PACK_TARGETS),
  /** 🔴 P7 — 이 파일의 모든 줄은 여기 적힌 항목 ID 로 역추적된다. 비면 근거 없는 파일이다. */
  source_item_ids: z.array(ItemId),
}).strict().refine(
  (f) => f.source_item_ids.length > 0 || (PRODUCT_TEXT_PACK_FILES as readonly string[]).includes(f.path),
  {
    path: ['source_item_ids'],
    message: '근거 없는 파일이다 (P7) — 항목에서 오지 않아도 되는 것은 PRODUCT_TEXT_PACK_FILES 뿐이다',
  },
)

/**
 * Manifest 가 나르는 마일스톤 한 줄 — 화면 8(Roadmap)과 `stop.mjs` 가 읽는 **유일한 마일스톤 정본**이다.
 *
 * ★ 칸을 더하는 절차 (FINDINGS 111 · `due` 가 그 첫 예다): ① 여기 한 줄 ② `packages/compiler` 의
 *   `milestonesOf()` 가 `RoadmapData` 에서 옮기는 한 줄 ③ 라우트 `GET /projects/{id}/roadmap` 이 행에
 *   싣는 한 줄(그대로 나르지 **않는다** — 칸을 하나씩 고른다) ④ `apps/web` 의 `RoadmapMilestone` 형과
 *   `MilestoneRow` ⑤ golden 의 `manifest.json` 갱신 + `COMPILER_VERSION` ⑥ SPEC §3 의 Manifest 정의.
 *   ②만 빠지면 화면은 조용히 「없다」고 그린다 — `compiler/test/liveness.test.ts` 가 값을 뒤집어 센다.
 * ⚠ `manifest_hash` 는 `files` 만 센다 — 여기 칸이 늘어도 해시는 안 변한다 (위 머리 주석).
 */
export const ManifestMilestone = z.object({
  id: MilestoneId,
  /** `RoadmapData.due` 그대로 — 없으면 없다. 화면이 기한을 지어내지 않게 optional 이다 (FINDINGS 111). */
  due: CalendarDate.optional(),
  paths: z.array(RepoPath).max(20).default([]),
  done_when: z.array(z.string().min(3).max(200)).min(1).max(6),
}).strict()

export const ManifestExclusion = z.object({
  item_id: ItemId,
  reason: z.string().min(1).max(200),
}).strict()

export const Manifest = z.object({
  schema_version: z.literal('1.0'),
  compiler_version: z.string().min(1).max(40),
  template_version: z.string().min(1).max(40),
  team_id: z.uuid(),
  project_id: z.uuid(),
  context_version: z.string().min(1).max(40),
  generated_at: z.iso.datetime(),
  snapshot_hash: Sha256,
  files: z.array(ManifestFile).min(1).max(50),
  milestones: z.array(ManifestMilestone).max(50).default([]),
  excluded: z.array(ManifestExclusion).max(200).default([]),
  manifest_hash: Sha256,
}).strict()

export type Manifest = z.infer<typeof Manifest>
export type ManifestFile = z.infer<typeof ManifestFile>
