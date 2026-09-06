import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { ProposalDraftFile, type Proposal } from '@contextops/schema'

import { apiGet, apiPost } from './api'
import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { EXIT } from './exit'
import { readTextIfExists } from './fsx'
import { describeIssues } from './issues'
import { LOCAL_FILES, repoFile } from './paths'
import { readyOrExplain, reportFailure } from './session'
import { whereOnWeb } from './where'

// =====================================================================
//  `contextops propose [<json>] [--from-pending]` — 제안을 올린다 (docs/SPEC.md §8.3 · §8.4)
//
//  🔴 **이 명령은 제안을 짓지 않는다.** 짓는 것은 propose Skill(사람과 함께)이고,
//     여기는 **모델이 알 수 없는 두 값을 붙여서** 보낼 뿐이다:
//       ① `base_version_id` — 서버에게 「지금 공식이 무엇인가」를 물어서 채운다
//       ② `client_request_id` — 재시도해도 제안이 하나이게 하는 기계값
//     ★ 왜 모델에게 안 맡기나 — uuid 는 **지어낼 수 있는 모양**이다. 지어낸 기준
//       버전으로 올라온 제안은 승인 화면에서 남의 버전과 대조되고, 아무도 그걸
//       눈으로 못 잡는다.
//
//  ★ `--from-pending` 은 Stop 훅이 남긴 힌트를 **치우는** 뜻이다. 힌트로 제안을
//    만들어 주지 않는다 — 힌트에는 `{changed_paths, hint}` 뿐이고 거기서 제안을
//    지으면 근거 없는 줄이 된다 (P7).
// =====================================================================

export const PROPOSE_FLAGS: FlagSpecs = {
  'dir': { kind: 'value', help: '저장소 루트 (기본: 지금 폴더)' },
  'from-pending': { kind: 'bool', help: '보낸 뒤 Stop 훅이 남긴 힌트를 치운다' },
  'dry-run': { kind: 'bool', help: '보내지 않는다 — 보낼 것을 요약만 한다' },
}

export async function runPropose(cli: Cli, flags: Flags): Promise<number> {
  const ready = readyOrExplain(cli, flags)
  if (!ready.ok) return ready.code
  const { root, config, token } = ready.ready

  const target = flags.positional[0]
  const path = target === undefined
    ? repoFile(root, 'proposalDraft')
    : (isAbsolute(target) ? target : join(cli.cwd, target))

  const text = readTextIfExists(path)
  if (text === undefined) {
    cli.io.err(`제안 초안이 없다: ${path}`)
    cli.io.err('  → /contextops:propose 가 이 파일을 쓴다.')
    return EXIT.CONFIG
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    cli.io.err(`${path} 가 JSON 이 아니다 — ${err instanceof Error ? err.message : '파싱 실패'}`)
    return EXIT.INVALID
  }
  const draft = ProposalDraftFile.safeParse(raw)
  if (!draft.success) {
    cli.io.err(`${path} 가 proposal-draft 계약과 맞지 않는다:`)
    for (const line of describeIssues(draft.error)) cli.io.err(`  ${line}`)
    return EXIT.INVALID
  }

  //  사람이 확인할 줄들. **초안에서 뽑는다** — 모델의 설명이 아니라 보낼 내용이다.
  cli.io.out(`제안: ${draft.data.title}`)
  for (const item of draft.data.items) {
    const what = item.operation === 'add' ? (item.draft?.id ?? '새 항목') : (item.target_item_id ?? '?')
    cli.io.out(`  ${item.operation.padEnd(10)} ${what} · 근거 ${item.evidence.length}건`)
  }
  if (draft.data.relates_to.length > 0) cli.io.out(`  마일스톤 ${draft.data.relates_to.join(' · ')}`)

  if (flags.bool('dry-run')) {
    cli.io.out('--dry-run 이라 보내지 않았다.')
    return EXIT.OK
  }

  //  ① 기준 버전 — 서버가 「지금 공식」이라고 말하는 것 하나뿐이다.
  const versions = await apiGet(cli, config.api_origin, `projects/${config.project_id}/versions?limit=1`, token)
  if (versions.kind === 'unreachable') {
    cli.io.err(`서버에 닿지 못했다 — ${versions.message}`)
    return EXIT.NETWORK
  }
  if (versions.kind === 'not_modified') {
    cli.io.err('서버가 304 로 답했다 — 이 요청은 그럴 수 없다.')
    return EXIT.NETWORK
  }
  if (versions.kind === 'failed') return reportFailure(cli, versions.code, versions.message)
  const official = officialVersionId(versions.data)
  if (official === undefined) {
    //  ⚠ 첫 발행 전에는 기준이 없다. 여기서 `null` 을 지어내면 서버가 400 을 내고
    //    사람은 「제안이 왜 안 되지」를 쫓는다. 무엇이 먼저인지 말해 준다.
    cli.io.err('아직 공식 버전이 없다 — 웹에서 첫 버전을 발행한 뒤에 제안할 수 있다.')
    return EXIT.CONFIG
  }

  const body: Proposal = { ...draft.data, base_version_id: official, client_request_id: randomUUID() }
  const sent = await apiPost(cli, config.api_origin, `projects/${config.project_id}/proposals`, token, body)
  if (sent.kind === 'unreachable') {
    cli.io.err(`서버에 닿지 못했다 — ${sent.message}`)
    return EXIT.NETWORK
  }
  if (sent.kind === 'not_modified') {
    cli.io.err('서버가 304 로 답했다 — 이 명령은 그럴 수 없다.')
    return EXIT.NETWORK
  }
  if (sent.kind === 'failed') return reportFailure(cli, sent.code, sent.message)

  const id = idOf(sent.data)
  cli.io.out(`제안을 올렸다 — 항목 ${body.items.length}개 · 기준 v${official.slice(0, 8)}`)
  //  ⚠ 주소를 찍지 않는다 — 설정에는 uuid 뿐이고 웹 주소는 slug 다 (where.ts · FINDINGS 115).
  cli.io.out(whereOnWeb(config.api_origin, 'proposals', `「${draft.data.title}」${id === undefined ? '' : ` · id ${id}`}`))

  //  ② 힌트를 치운다. 안 치우면 SessionStart 가 **이미 처리한 초안**을 계속 알린다.
  if (flags.bool('from-pending')) {
    rmSync(repoFile(root, 'pendingProposal'), { force: true })
    cli.io.out(`  ${LOCAL_FILES.pendingProposal} 을 치웠다.`)
  }
  return EXIT.OK
}

/** `GET /versions` 의 `official_version_id`. 없으면 `undefined` — 첫 발행 전이다. */
function officialVersionId(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const value = (data as { official_version_id?: unknown }).official_version_id
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function idOf(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const value = (data as { id?: unknown }).id
  return typeof value === 'string' ? value : undefined
}
