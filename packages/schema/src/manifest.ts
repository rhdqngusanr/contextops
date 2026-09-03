import { z } from 'zod'
import { ItemId, MilestoneId, RepoPath, Sha256 } from './common'

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

export const ManifestFile = z.object({
  path: RepoPath,
  sha256: Sha256,
  size: z.int().min(0),
  target: z.enum(PACK_TARGETS),
  /** 🔴 P7 — 이 파일의 모든 줄은 여기 적힌 항목 ID 로 역추적된다. 비면 근거 없는 파일이다. */
  source_item_ids: z.array(ItemId).min(1),
}).strict()

export const ManifestMilestone = z.object({
  id: MilestoneId,
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
