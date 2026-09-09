import { rmSync } from 'node:fs'
import { Manifest, SyncReceiptFile } from '@contextops/schema'

import { apiGet, apiPost } from './api'
import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { findCredential, readCredentials, readProjectConfig } from './config'
import { EXIT } from './exit'
import { readTextIfExists } from './fsx'
import { judge, readLocalManifest } from './managed'
import { LOCAL_FILES, repoFile, resolveRoot } from './paths'
import { printStatus } from './sync'

// =====================================================================
//  `contextops status` — 지금 무엇이 적용돼 있나 (docs/SPEC.md §8.3)
//
//  🔴 **파일을 하나도 바꾸지 않는다.** 그래서 훅이 안내한 뒤 사람이 제일 먼저
//     안심하고 부를 수 있는 명령이다. 바꾸는 것은 `sync` 하나다.
//     ⚠ 예외가 하나 있다: **못 보낸 보고를 다시 보낸다** (SPEC §8.5 8단계).
//       그건 서버로 가는 것이고 저장소 파일이 아니다 — 성공하면 receipt 를 지운다.
//
//  ★ 왜 `sync --check` 가 있는데 또 있나 — 뜻이 다르다.
//    `status` 는 **아무 준비 없이** 부를 수 있어야 한다 (오프라인·토큰 없음·미설정).
//    `sync --check` 는 sync 의 앞부분이라 그 전제를 전부 요구한다.
//    ⚠ 판정 자체는 나누지 않았다 — `managed.ts` 의 `judge()` 하나다.
// =====================================================================

export const STATUS_FLAGS: FlagSpecs = {
  'dir': { kind: 'value', help: '저장소 루트 (기본: 지금 폴더)' },
  'offline': { kind: 'bool', help: '서버에 묻지 않는다 — 로컬 파일만 본다' },
}

export async function runStatus(cli: Cli, flags: Flags): Promise<number> {
  const root = resolveRoot(cli.cwd, flags.value('dir'))

  const config = readProjectConfig(root)
  if (config.state === 'missing') {
    //  ⚠ 이건 고장이 아니다 — 아직 잇지 않은 저장소다. 0 으로 끝내되 길을 알려 준다.
    cli.io.out('이 저장소는 ContextOps 에 연결돼 있지 않다 — /contextops:setup 을 실행해라.')
    return EXIT.OK
  }
  if (config.state === 'invalid') {
    cli.io.err(`${LOCAL_FILES.project} 이 계약과 맞지 않는다:`)
    for (const line of config.problems) cli.io.err(`  ${line}`)
    return EXIT.CONFIG
  }

  const local = readLocalManifest(root)
  const credentials = readCredentials(cli.home)
  const token = credentials.state === 'ok'
    ? findCredential(credentials.value, config.value.api_origin, config.value.project_id)?.token
    : undefined

  let official: Manifest | undefined
  if (!flags.bool('offline') && token !== undefined) {
    const outcome = await apiGet(cli, config.value.api_origin,
      `projects/${config.value.project_id}/packs/latest/manifest`, token)
    if (outcome.kind === 'ok') {
      const parsed = Manifest.safeParse(outcome.data)
      official = parsed.success ? parsed.data : undefined
      if (!parsed.success) cli.io.err('서버가 준 Manifest 가 계약과 맞지 않는다 — 최신 여부는 모른다.')
    } else if (outcome.kind === 'failed') {
      //  ⚠ 실패해도 로컬 판정은 낸다. 「서버가 안 된다」와 「내 파일이 어떻다」는 다른 질문이다.
      cli.io.err(`서버가 거절했다 — ${outcome.code}: ${outcome.message}`)
    } else if (outcome.kind === 'unreachable') {
      cli.io.err(`서버에 닿지 못했다 — ${outcome.message}`)
    }
  }

  const verdict = judge(root, local, official)
  printStatus(cli, verdict)
  if (verdict.status === 'outdated') cli.io.out('  → contextops sync 로 받아라')
  if (verdict.status === 'modified') cli.io.out('  → 확인 후 contextops sync --force')

  if (token !== undefined) await resendReceipt(cli, root, token)

  //  ⚠ `modified` 만 1 이다 (SPEC §8.3 표). `outdated` 를 실패로 내면 CI 가
  //    「팀 규칙이 갱신됐다」는 이유로 빨개진다 — 그건 고장이 아니다.
  return verdict.status === 'modified' ? EXIT.MODIFIED : EXIT.OK
}

/**
 * 지난번에 못 보낸 보고를 다시 보낸다 (SPEC §8.5 8단계).
 * ⚠ 또 실패하면 **조용히 둔다.** 파일은 그대로 남아서 다음에 다시 시도한다 —
 *   여기서 오류를 내면 오프라인인 사람은 매번 빨간 줄을 본다.
 */
async function resendReceipt(cli: Cli, root: string, token: string): Promise<void> {
  const text = readTextIfExists(repoFile(root, 'syncReceipt'))
  if (text === undefined) return
  let receipt: SyncReceiptFile
  try {
    const parsed = SyncReceiptFile.safeParse(JSON.parse(text))
    if (!parsed.success) return
    receipt = parsed.data
  } catch {
    return
  }
  const sent = await apiPost(cli, receipt.api_origin,
    `projects/${receipt.project_id}/sync-reports`, token, receipt.report)
  if (sent.kind !== 'ok') return
  rmSync(repoFile(root, 'syncReceipt'), { force: true })
  cli.io.out(`  밀렸던 보고 1건을 보냈다 (v${receipt.report.version} · ${receipt.report.status})`)
}
