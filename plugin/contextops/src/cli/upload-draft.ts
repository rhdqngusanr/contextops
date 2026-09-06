import { isAbsolute, join } from 'node:path'
import {
  ContextItemDraftFile, ContextItemsBatchDraftResult, ScanResult,
  type ContextItemsBatchDraft, type ContextItemDraft,
} from '@contextops/schema'

import { apiPost } from './api'
import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { EXIT } from './exit'
import { readTextIfExists } from './fsx'
import { describeIssues } from './issues'
import { LOCAL_FILES, repoFile } from './paths'
import { readyOrExplain, reportFailure } from './session'
import { whereOnWeb } from './where'

// =====================================================================
//  `contextops upload-draft <json>` — 초안을 서버로 올린다 (docs/SPEC.md §8.3 · §8.4 6단계)
//
//  🔴 **P1 이 걸린 명령이다.** 이 명령이 만드는 body 가 저장소에서 서버로 나가는
//     가장 큰 payload 다. 그래서 여기서 지키는 것이 셋이다:
//     ① 보내는 것은 `ContextItemsBatchDraft` **뿐이다** — 만들고 나서 그 계약으로
//        다시 파싱한다. 계약에 없는 키는 여기서 죽는다 (`.strict()`).
//     ② `scan_summary` 와 `repo` 는 **모델이 쓴 파일에서 오지 않는다.** `scan.json`
//        (결정론 스캔이 잰 값)에서 온다. 그래서 모델이 스캔 결과를 지어낼 수 없다.
//     ③ `--dry-run` 이 **보낼 것을 그대로** 보여 준다 — init Skill 5단계의
//        「사용자 확인」이 모델의 서술이 아니라 실제 payload 가 되게.
//
//  ★ 왜 초안 파일과 스캔 파일이 나뉘어 있나 — 초안은 **모델이 쓰고**, 스캔은
//    **기계가 잰다.** 한 파일이면 모델이 잰 값을 고칠 수 있다 (schema/plugin.ts 주석).
// =====================================================================

export const UPLOAD_DRAFT_FLAGS: FlagSpecs = {
  'dir': { kind: 'value', help: '저장소 루트 (기본: 지금 폴더)' },
  'scan': { kind: 'value', help: `스캔 결과 (기본: ${LOCAL_FILES.scan})` },
  'dry-run': { kind: 'bool', help: '보내지 않는다 — 보낼 payload 요약만 낸다' },
}

/** 파일 하나를 계약으로 판다. 「없다」와 「계약과 다르다」를 사람에게 다르게 말한다. */
function readContract<T>(
  cli: Cli, path: string, what: string,
  parse: (raw: unknown) => { success: true; data: T } | { success: false; error: unknown },
): T | number {
  const text = readTextIfExists(path)
  if (text === undefined) {
    cli.io.err(`${what} 이 없다: ${path}`)
    return EXIT.CONFIG
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    cli.io.err(`${path} 가 JSON 이 아니다 — ${err instanceof Error ? err.message : '파싱 실패'}`)
    return EXIT.INVALID
  }
  const parsed = parse(raw)
  if (!parsed.success) {
    cli.io.err(`${path} 가 계약과 맞지 않는다:`)
    //  ⚠ 위치와 이유만 낸다. 값을 찍으면 로그에 본문이 남는다 (P1 · SPEC §11).
    for (const line of describeIssues(parsed.error as never)) cli.io.err(`  ${line}`)
    return EXIT.INVALID
  }
  return parsed.data
}

const isCode = (value: unknown): value is number => typeof value === 'number'

/**
 * 보낼 body. `ContextItemsBatchDraft` 의 `z.infer` 는 유니온이라 항목이 `unknown` 이다 —
 * 정밀한 항목 타입은 `packages/schema` 가 mapped type 으로 따로 낸다 (item.ts 주석).
 * ⚠ 계약이 느슨해진 것이 **아니다.** 파싱은 `ContextItemDraftFile` 이 이미 했다.
 */
type Payload = Omit<ContextItemsBatchDraft, 'items'> & { items: ContextItemDraft[] }

export async function runUploadDraft(cli: Cli, flags: Flags): Promise<number> {
  const ready = readyOrExplain(cli, flags)
  if (!ready.ok) return ready.code
  const { root, config, token } = ready.ready

  const target = flags.positional[0]
  const draftPath = target === undefined
    ? repoFile(root, 'draft')
    : (isAbsolute(target) ? target : join(cli.cwd, target))
  const scanFlag = flags.value('scan')
  const scanPath = scanFlag === undefined
    ? repoFile(root, 'scan')
    : (isAbsolute(scanFlag) ? scanFlag : join(cli.cwd, scanFlag))

  const draft = readContract(cli, draftPath, '초안', (raw) => ContextItemDraftFile.safeParse(raw))
  if (isCode(draft)) return draft
  const scan = readContract(cli, scanPath, '스캔 결과', (raw) => ScanResult.safeParse(raw))
  if (isCode(scan)) {
    if (scan === EXIT.CONFIG) cli.io.err('  → contextops scan 을 먼저 실행해라.')
    return scan
  }

  //  🔴 나가는 것은 이 객체가 전부다. 계약으로 한 번 더 판다 — 여기서 죽는 편이
  //     서버가 400 을 내고 사람이 이유를 모르는 것보다 낫다.
  //  ⚠ 유니온 스키마의 `z.infer` 는 느슨해서 항목이 `unknown` 이 된다. 정밀한 타입은
  //    `packages/schema` 가 mapped type 으로 따로 낸다 (item.ts 주석) — 여기서 그걸 쓴다.
  const body: Payload = {
    items: draft.items as ContextItemDraft[],
    repo: scan.repo,
    scan_summary: scan.summary,
  }

  //  init Skill 5단계가 사람에게 보여 주는 줄들 — **payload 에서 뽑는다.**
  cli.io.out(`보낼 항목 ${body.items.length}개 · 레포 ${body.repo} · 스캔 파일 ${body.scan_summary.file_count}개`)
  for (const item of body.items) cli.io.out(`  ${item.type.padEnd(14)} ${item.id}`)
  cli.io.out(`근거 경로 ${sourcePaths(body).length}곳 · 코드 본문 0건 (계약에 담을 자리가 없다)`)

  if (flags.bool('dry-run')) {
    cli.io.out('--dry-run 이라 보내지 않았다.')
    return EXIT.OK
  }

  const sent = await apiPost(cli, config.api_origin,
    `projects/${config.project_id}/context-items/batch-draft`, token, body)
  if (sent.kind === 'unreachable') {
    cli.io.err(`서버에 닿지 못했다 — ${sent.message}`)
    return EXIT.NETWORK
  }
  if (sent.kind === 'not_modified') {
    cli.io.err('서버가 304 로 답했다 — 이 명령은 그럴 수 없다.')
    return EXIT.NETWORK
  }
  if (sent.kind === 'failed') return reportFailure(cli, sent.code, sent.message)

  const result = ContextItemsBatchDraftResult.safeParse(sent.data)
  if (!result.success) {
    cli.io.err('서버 응답이 계약과 맞지 않는다 — 서버 버전이 다를 수 있다.')
    return EXIT.NETWORK
  }
  const { accepted, rejected } = result.data
  cli.io.out(`받아들여진 항목 ${accepted.length}개 · 거절 ${rejected.length}개`)
  for (const bad of rejected) {
    const id = body.items[bad.index]?.id ?? `#${bad.index}`
    for (const issue of bad.issues) cli.io.err(`  ✗ ${id} — ${issue.path}: ${issue.message}`)
  }
  //  ⚠ 주소를 찍지 않는다 — 설정에는 uuid 뿐이고 웹 주소는 slug 다 (where.ts · FINDINGS 115).
  if (accepted.length > 0) cli.io.out(whereOnWeb(config.api_origin, 'context', `초안 ${accepted.length}개`))

  //  ⚠ 하나도 안 들어갔으면 성공이 아니다. Skill 이 「고쳐서 한 번 더」를 판단하려면
  //    종료 코드가 갈려야 한다 (SPEC §8.4 4단계와 같은 뜻으로 `2` 를 쓴다).
  return accepted.length === 0 ? EXIT.INVALID : EXIT.OK
}

/** 근거가 가리키는 저장소 경로들 — 사람이 「무엇을 근거로 삼았나」를 눈으로 센다. */
function sourcePaths(body: Payload): string[] {
  const paths = new Set<string>()
  for (const item of body.items) {
    for (const ref of item.source_refs) {
      if (ref.kind === 'repository_path') paths.add(ref.path)
    }
  }
  return [...paths]
}
