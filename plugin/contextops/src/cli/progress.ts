import { randomUUID } from 'node:crypto'
import {
  PROGRESS_SOURCES, PROGRESS_STATUSES, ProgressEvent, ProgressMarkerFile,
  type ProgressStatus,
} from '@contextops/schema'

import { apiPost } from './api'
import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { EXIT } from './exit'
import { writeJsonFile } from './fsx'
import { describeIssues } from './issues'
import { readLocalManifest } from './managed'
import { progressMarkerFile } from './paths'
import { readyOrExplain, reportFailure } from './session'

// =====================================================================
//  `contextops progress` — 마일스톤 진행을 보고한다 (docs/SPEC.md §8.3 · §4.3)
//
//  🔴 **부르는 것은 사람이 아니라 agent 다.** 인자 모양의 정본은 Pack 에 들어가는
//     고정 문단(`packages/compiler/templates/progress-report.ts`)이다 — 거기 적힌
//     대로 Claude 가 그대로 친다. **둘이 갈라지면 그날부터 진행 보고가 조용히 멈춘다.**
//     ⚠ 플래그 이름을 바꾸려면 그 템플릿을 같이 고치고 `TEMPLATE_VERSION` 을 올려라.
//
//  🔴 P1 — 나가는 근거는 **경로와 줄 번호뿐이다** (`ProgressEvidence`). 그 줄에
//     무엇이 적혀 있는지는 계약에 담을 자리가 없다.
//  🔴 P5 — 이 보고는 **마일스톤에 붙는다.** 누가 보고했는지로 사람을 줄 세우지 않는다.
// =====================================================================

export const PROGRESS_FLAGS: FlagSpecs = {
  'dir': { kind: 'value', help: '저장소 루트 (기본: 지금 폴더)' },
  'milestone': { kind: 'value', help: '마일스톤 ID (해당 없으면 none)' },
  'criterion': { kind: 'value', help: 'done_when 문장 하나' },
  'evidence': { kind: 'list', help: '근거 <path> · <path:12> · <path:12-30> (여러 번)' },
  'commit': { kind: 'value', help: '근거가 가리키는 커밋 sha (40자)' },
  'summary': { kind: 'value', help: '한 줄 요약 (필수)' },
  'status': { kind: 'value', help: `상태 (${PROGRESS_STATUSES.join('·')} · 기본은 아래 표)` },
  'source': { kind: 'value', help: `보고 주체 (${PROGRESS_SOURCES.join('·')} · 기본 agent)` },
  'session': { kind: 'value', help: '세션 id — 같은 세션에서 Stop 훅이 겹쳐 보고하지 않게', env: 'CLAUDE_SESSION_ID' },
}

/**
 * 🔴 **상태를 안 주면 무엇인가** — 표 하나다.
 *
 * ★ 왜 기본값이 있나 — 부르는 것은 agent 이고, 고정 문단(SPEC §4.3)은 `--status` 를
 *   가르치지 않는다. 기본이 없으면 그 문단대로 친 명령이 전부 실패한다.
 * ⚠ `done_candidate` 는 기본이 될 수 없다 — 「끝난 것 같다」는 **사람이 확인할 것**이지
 *   agent 가 자칭할 것이 아니다 (`POST /progress/{id}/confirm` 이 그래서 따로 있다).
 */
function defaultStatus(milestone: string, criterion: string | undefined): ProgressStatus {
  if (milestone === 'none') return 'none'
  return criterion === undefined ? 'in_progress' : 'criterion_done'
}

/**
 * `path` · `path:12` · `path:12-30` 을 근거 하나로 푼다.
 * ⚠ 마지막 `:` 뒤가 숫자 모양일 때만 줄 번호로 읽는다 — 경로에 `:` 가 있는 저장소가
 *   있고, 거기서 경로를 잘라 버리면 근거가 **없는 파일**을 가리키게 된다.
 */
function parseEvidence(raw: string, commit: string | undefined): unknown {
  const at = raw.lastIndexOf(':')
  const tail = at === -1 ? '' : raw.slice(at + 1)
  const lines = /^(\d+)(?:-(\d+))?$/.exec(tail)
  const path = lines === null ? raw : raw.slice(0, at)
  return {
    path,
    ...(lines === null ? {} : { start_line: Number(lines[1]) }),
    ...(lines?.[2] === undefined ? {} : { end_line: Number(lines[2]) }),
    ...(commit === undefined ? {} : { commit_sha: commit }),
  }
}

export async function runProgress(cli: Cli, flags: Flags): Promise<number> {
  const ready = readyOrExplain(cli, flags)
  if (!ready.ok) return ready.code
  const { root, config, token } = ready.ready

  const milestone = flags.value('milestone')
  const summary = flags.value('summary')
  if (milestone === undefined || summary === undefined) {
    cli.io.err('--milestone 과 --summary 는 필수다 (해당 없으면 --milestone none).')
    return EXIT.USAGE
  }
  const criterion = flags.value('criterion')

  //  적용된 Pack 의 버전. **없으면 지어내지 않는다** — 아직 sync 를 안 한 저장소는
  //  실제로 어느 버전 기준인지 모른다. 화면이 그걸 그대로 보여 주는 것이 낫다.
  const local = readLocalManifest(root)
  const contextVersion = local?.context_version ?? 'unknown'

  const candidate = {
    milestone_id: milestone,
    status: flags.value('status') ?? defaultStatus(milestone, criterion),
    ...(criterion === undefined ? {} : { criterion }),
    evidence: flags.list('evidence').map((raw) => parseEvidence(raw, flags.value('commit'))),
    summary,
    context_version: contextVersion,
    source: flags.value('source') ?? 'agent',
    //  ⚠ 서버가 이 값으로 중복을 지운다 (`POST /progress` 는 멱등이다). 여기서 만들면
    //    재시도마다 새 id 가 되지만, 재시도는 실패한 뒤이므로 중복이 아니다.
    client_event_id: randomUUID(),
  }

  //  🔴 나가는 것은 계약을 지난 것뿐이다. 여기서 죽는 편이 서버 400 보다 낫다 —
  //     agent 가 읽을 수 있는 문장으로 어디가 틀렸는지 말해 준다.
  const parsed = ProgressEvent.safeParse(candidate)
  if (!parsed.success) {
    cli.io.err('보고가 계약과 맞지 않는다:')
    for (const line of describeIssues(parsed.error)) cli.io.err(`  ${line}`)
    return EXIT.INVALID
  }
  const body = parsed.data

  const sent = await apiPost(cli, config.api_origin, `projects/${config.project_id}/progress`, token, body)
  if (sent.kind === 'unreachable') {
    cli.io.err(`서버에 닿지 못했다 — ${sent.message}`)
    return EXIT.NETWORK
  }
  if (sent.kind === 'not_modified') {
    cli.io.err('서버가 304 로 답했다 — 이 명령은 그럴 수 없다.')
    return EXIT.NETWORK
  }
  if (sent.kind === 'failed') return reportFailure(cli, sent.code, sent.message)

  cli.io.out(`보고했다 — ${body.milestone_id} · ${body.status} · 근거 ${body.evidence.length}건 · v${body.context_version}`)

  //  이번 세션에 이미 보고했다는 표시 (SPEC §8.6). Stop 훅이 이걸 보고 물러선다.
  //  ⚠ 세션 id 를 모르면 안 남긴다 — 이름을 지어내면 훅이 남의 세션 표시를 읽는다.
  const session = flags.value('session')
  if (session !== undefined && session.length > 0) {
    const marker: ProgressMarkerFile = {
      session_id: session,
      milestone_id: body.milestone_id,
      status: body.status,
    }
    writeJsonFile(progressMarkerFile(root, session), marker)
  }
  return EXIT.OK
}
