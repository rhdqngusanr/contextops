import { basename } from 'node:path'
import { ApiOrigin, DeviceToken, ProjectConfig } from '@contextops/schema'

import { apiGet } from './api'
import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { saveCredential, writeProjectConfig } from './config'
import { EXIT } from './exit'
import { describeIssues } from './issues'
import { LOCAL_DIR, resolveRoot } from './paths'
import { ensureLocalGitignore } from './sync'

// =====================================================================
//  `contextops setup` — 이 저장소를 프로젝트에 잇는다 (docs/SPEC.md §8.3)
//
//  ★ 이 명령이 남기는 것은 둘뿐이다:
//    ① `<repo>/.contextops/project.json` — **커밋한다.** secret 없음
//    ② `~/.contextops/credentials.json` — **0600.** 저장소 밖
//
//  🔴 **토큰을 project.json 에 적지 마라.** 그 파일은 팀에 퍼진다.
//
//  ⚠ 토큰은 **사람이 웹에서 복사해 온다.** 106바퀴에 웹 화면 9(Sync)에 [기기 추가] 가
//    생겼고, 그 화면이 **이 명령 한 줄을 통째로** 준다 (FINDINGS 36) — 줄의 정본은
//    `packages/schema` 의 `setupCommandLine` 하나이고 `test/setup-command.test.ts` 가
//    「그 줄의 플래그를 이 명령이 전부 받는가」를 센다.
//  ⚠ 콜백 서버는 **아직 만들지 마라.** 화면이 주는 한 줄로 사람이 하는 일은 붙여넣기
//    하나뿐이고, 콜백을 더하면 CLI 가 브라우저와 포트를 다루기 시작한다.
// =====================================================================

export const SETUP_FLAGS: FlagSpecs = {
  'api-origin': { kind: 'value', help: 'ContextOps 서버 주소 (https://…)', env: 'CONTEXTOPS_API_ORIGIN' },
  'project': { kind: 'value', help: '프로젝트 uuid', env: 'CONTEXTOPS_PROJECT_ID' },
  'token': { kind: 'value', help: '기기 토큰 (ctx_…)', env: 'CONTEXTOPS_TOKEN' },
  'device-id': { kind: 'value', help: '토큰 발급 응답의 device_id — 있으면 이 기기만 끊을 수 있다' },
  'team': { kind: 'value', help: '팀 uuid (화면 링크용 · 선택)' },
  'repo-id': { kind: 'value', help: '등록된 레포 uuid (선택)' },
  'repo-name': { kind: 'value', help: '레포 이름 (기본: 폴더 이름)' },
  'dir': { kind: 'value', help: '저장소 루트 (기본: 지금 폴더)' },
  'no-browser': { kind: 'bool', help: '브라우저를 열지 않는다' },
}

/** 플래그 → 환경변수 → 물어보기. 못 물어보면 `undefined` 다 (무인 실행). */
async function need(cli: Cli, flags: Flags, name: string, question: string): Promise<string | undefined> {
  const given = flags.value(name)
  if (given !== undefined && given.length > 0) return given
  const answer = await cli.io.ask(question)
  return answer === undefined || answer.trim().length === 0 ? undefined : answer.trim()
}

export async function runSetup(cli: Cli, flags: Flags): Promise<number> {
  const root = resolveRoot(cli.cwd, flags.value('dir'))

  // ── ① 서버 주소 ────────────────────────────────────────────────
  const originInput = await need(cli, flags, 'api-origin', 'ContextOps 서버 주소 (예: https://contextops.example.com): ')
  if (originInput === undefined) {
    cli.io.err('서버 주소가 없다. --api-origin 으로 넘기거나 CONTEXTOPS_API_ORIGIN 을 설정해라.')
    return EXIT.CONFIG
  }
  const origin = ApiOrigin.safeParse(originInput.replace(/\/+$/, ''))
  if (!origin.success) {
    cli.io.err(`서버 주소가 잘못됐다 — ${describeIssues(origin.error).join(' · ')}`)
    return EXIT.CONFIG
  }

  // ── ② 로그인 안내 ──────────────────────────────────────────────
  //  ⚠ 우리가 대신 로그인하지 않는다. 브라우저에서 사람이 하고, 우리는 결과만 받는다.
  const loginUrl = `${origin.data}/login`
  cli.io.out('')
  cli.io.out('① 브라우저에서 로그인한다:')
  cli.io.out(`     ${loginUrl}`)
  cli.io.out('② 프로젝트의 Sync 화면에서 [기기 추가] 를 눌러 토큰을 발급받는다.')
  cli.io.out('   그 화면이 주는 명령 한 줄을 그대로 붙여넣으면 이 물음은 건너뛴다.')
  cli.io.out('')
  if (!flags.bool('no-browser')) cli.openUrl(loginUrl)

  // ── ③ 프로젝트와 토큰 ──────────────────────────────────────────
  const projectId = await need(cli, flags, 'project', '프로젝트 uuid: ')
  if (projectId === undefined) {
    cli.io.err('프로젝트 uuid 가 없다. --project 로 넘겨라.')
    return EXIT.CONFIG
  }
  const token = await need(cli, flags, 'token', '기기 토큰 (ctx_…): ')
  if (token === undefined) {
    cli.io.err('토큰이 없다. --token 으로 넘기거나 CONTEXTOPS_TOKEN 을 설정해라.')
    return EXIT.LOGIN_FAILED
  }
  if (!DeviceToken.safeParse(token).success) {
    cli.io.err('토큰 모양이 아니다 — ctx_ 로 시작하는 값을 통째로 붙여 넣어라.')
    return EXIT.LOGIN_FAILED
  }

  //  설정 파일을 만들기 **전에** 계약으로 판다. 여기서 걸러야 uuid 오타가
  //  「서버가 404 를 준다」는 엉뚱한 증상으로 나오지 않는다.
  const draft = ProjectConfig.safeParse({
    api_origin: origin.data,
    project_id: projectId,
    ...(flags.value('team') === undefined ? {} : { team_id: flags.value('team') }),
    ...(flags.value('repo-id') === undefined ? {} : { repo_id: flags.value('repo-id') }),
    repo_name: flags.value('repo-name') ?? basename(root),
  })
  if (!draft.success) {
    cli.io.err(`설정이 계약과 맞지 않는다:\n  ${describeIssues(draft.error).join('\n  ')}`)
    return EXIT.CONFIG
  }

  // ── ④ 토큰이 진짜 그 프로젝트의 것인지 서버에 물어본다 ──────────
  //  ★ 왜 확인하나 — 안 하면 setup 은 늘 성공하고, 처음 실패하는 것은 며칠 뒤
  //    `sync` 다. 그때 사람은 sync 를 의심한다.
  const probe = await apiGet(cli, origin.data, `projects/${projectId}/sync-status`, token)
  if (probe.kind === 'unreachable') {
    cli.io.err(`서버에 닿지 못했다 — ${probe.message}`)
    return EXIT.NETWORK
  }
  if (probe.kind === 'failed') {
    if (probe.code === 'UNAUTHORIZED') {
      cli.io.err('토큰이 유효하지 않다 (만료·취소됐을 수 있다) — 웹에서 다시 발급받아라.')
      return EXIT.LOGIN_FAILED
    }
    if (probe.code === 'NOT_FOUND' || probe.code === 'FORBIDDEN') {
      cli.io.err('이 토큰으로는 그 프로젝트를 볼 수 없다 — 프로젝트 uuid 를 다시 확인해라.')
      return EXIT.CONFIG
    }
    cli.io.err(`서버가 거절했다 — ${probe.code}: ${probe.message}`)
    return EXIT.NETWORK
  }

  // ── ⑤ 두 파일을 쓴다 ───────────────────────────────────────────
  const deviceId = flags.value('device-id')
  const configPath = writeProjectConfig(root, draft.data)
  //  🔴 `.contextops/.gitignore` 를 **여기서** 만든다 (SPEC §8.2 「ignore」 칸).
  //     안 만들면 처음 `scan` 을 돌린 사람이 기계마다 다른 cache/scan.json 을 커밋하고,
  //     그 뒤로 팀원 전원이 매 세션 충돌을 본다 (docs/feedback/FINDINGS.md 37).
  ensureLocalGitignore(root)
  let credentialPath: string
  try {
    credentialPath = saveCredential(cli.home, origin.data, projectId, {
      token,
      ...(deviceId === undefined ? {} : { device_id: deviceId }),
    })
  } catch (err) {
    cli.io.err(err instanceof Error ? err.message : '토큰을 저장하지 못했다')
    return EXIT.CONFIG
  }

  cli.io.out(`설정을 저장했다: ${configPath}`)
  cli.io.out(`  ${LOCAL_DIR}/.gitignore 도 만들었다 (cache·backups 는 커밋하지 않는다)`)
  cli.io.out(`토큰을 저장했다: ${credentialPath} (본인만 읽기)`)
  if (deviceId === undefined) {
    cli.io.out('  ⚠ device_id 를 안 받았다 — 나중에 이 기기만 끊으려면 --device-id 로 다시 setup 해라.')
  }
  cli.io.out('')
  cli.io.out('다음 (아직 안 깔았다면):')
  cli.io.out('  claude plugin marketplace add <marketplace>')
  cli.io.out('  claude plugin install contextops')
  cli.io.out('')
  cli.io.out('Claude Code 를 열고 /contextops:init 을 실행하세요.')
  return EXIT.OK
}
