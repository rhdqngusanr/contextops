import { createHash } from 'node:crypto'
import { canonicalJson, compareCodepoints } from './text'
import type { ContextItem } from '@contextops/schema'

// =====================================================================
//  해시와 줄바꿈 정규화 — 정본은 docs/SPEC.md §3(manifest_hash) · §4.1 7단계.
//
//  🔴 **해시 규칙이 사는 곳은 여기 하나다.** 플러그인 sync 가 같은 규칙으로 다시 재고
//    (SPEC §8.5), 서버가 발행 때 재고, 여기가 만든다 — 셋이 갈라지면
//    「hash 불일치에서 sync 가 멈춘다」가 오작동이 된다.
// =====================================================================

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * Pack 파일의 정규형 (SPEC §4.1 7단계): CRLF·CR → LF · 끝 개행 **정확히 하나**.
 * ★ 왜 — Windows 에서 만든 Pack 과 Linux 에서 만든 Pack 의 해시가 갈리면
 *   sync 가 매번 `modified` 를 보고한다.
 */
export function normalizeText(text: string): string {
  return `${text.replace(/\r\n?/g, '\n').replace(/\n+$/, '')}\n`
}

/** UTF-8 바이트 길이. `size` 는 문자 수가 아니라 바이트다 (Manifest). */
export function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

/**
 * `manifest_hash = sha256(files 를 path 순 정렬 후 "path\nsha256\n" 연결)` (SPEC §3).
 * ⚠ 이 문장을 다른 파일에 다시 적지 마라.
 */
export function manifestHash(files: readonly { path: string; sha256: string }[]): string {
  const body = [...files]
    .sort((a, b) => compareCodepoints(a.path, b.path))
    .map((f) => `${f.path}\n${f.sha256}\n`)
    .join('')
  return sha256(body)
}

/**
 * snapshot_hash — 「무엇을 컴파일했나」의 지문.
 * ⚠ `generated_at` 은 **넣지 않는다.** 넣으면 같은 항목 묶음이 매번 다른 지문을 갖고,
 *   「같은 snapshot 인가」를 물어볼 수 없게 된다. 항목 순서에도 흔들리지 않는다.
 */
export function snapshotHash(input: {
  project_id: string
  context_version: string
  items: readonly ContextItem[]
}): string {
  const items = [...input.items].sort((a, b) => compareCodepoints(a.id, b.id))
  return sha256(canonicalJson({
    project_id: input.project_id,
    context_version: input.context_version,
    items,
  }))
}
