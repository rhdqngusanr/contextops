import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Manifest } from '@contextops/schema'

import { sha256OfText } from '../../src/cli/fsx'
import { LOCAL_FILES } from '../../src/cli/paths'

// =====================================================================
//  시험용 Pack 한 벌 — **해시는 진짜로 잰다**
//
//  ★ 왜 고정 해시를 안 쓰나 — 고정값을 적으면 sync 의 4단계(받은 것의 sha256 을
//    Manifest 와 대조)가 **언제나 맞거나 언제나 틀리게** 된다. 그러면 그 단계는
//    시험되지 않는다. 여기서는 본문에서 실제로 재고, 「틀린 바이트」는 본문을
//    바꿔서 만든다 (`brokenBytes`).
//
//  ⚠ `manifest_hash` 규칙은 계약(`packages/schema/src/manifest.ts`)이 적어 둔 대로
//    sha256(path 순 정렬 후 "path\nsha256\n" 연결)이다. 서버가 준 값을 우리가 다시
//    계산하지는 않지만, 시험에서 **내용이 다르면 hash 도 달라야** outdated 가 나온다.
// =====================================================================

export const TEAM = '99999999-8888-4777-8666-555555555555'
export const PROJECT = '11111111-2222-4333-8444-555555555555'

/** `<경로>: <본문>` 한 벌 → Manifest. 파일은 쓰지 않는다. */
export function manifestOf(
  files: Record<string, string>,
  overrides: Partial<Manifest> = {},
): Manifest {
  const entries = Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1))
  const manifestFiles = entries.map(([path, text], index) => ({
    path,
    sha256: sha256OfText(text),
    size: Buffer.byteLength(text, 'utf8'),
    target: 'claude' as const,
    source_item_ids: [`item_fixture${index}`],
  }))
  const hashInput = manifestFiles.map((f) => `${f.path}\n${f.sha256}\n`).join('')

  return Manifest.parse({
    schema_version: '1.0',
    compiler_version: '0.1.0',
    template_version: '0.1.0',
    team_id: TEAM,
    project_id: PROJECT,
    context_version: '1.0.0',
    generated_at: '2026-09-04T00:00:00.000Z',
    snapshot_hash: sha256OfText(hashInput + 'snapshot'),
    files: manifestFiles,
    milestones: [],
    excluded: [],
    manifest_hash: sha256OfText(hashInput),
    ...overrides,
  })
}

/**
 * 이미 sync 를 한 저장소를 만든다 — 파일들 + `.contextops/manifest.json`.
 * @param onDisk `false` 면 Manifest 만 쓴다 (파일이 없어진 상태 = missing).
 */
export function writeLocalManifest(
  root: string,
  files: Record<string, string>,
  options: { onDisk?: boolean; overrides?: Partial<Manifest> } = {},
): Manifest {
  const manifest = manifestOf(files, options.overrides ?? {})
  if (options.onDisk !== false) {
    for (const [path, text] of Object.entries(files)) {
      const target = join(root, ...path.split('/'))
      mkdirSync(join(target, '..'), { recursive: true })
      writeFileSync(target, text, 'utf8')
    }
  }
  const manifestPath = join(root, ...LOCAL_FILES.manifest.split('/'))
  mkdirSync(join(manifestPath, '..'), { recursive: true })
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}
