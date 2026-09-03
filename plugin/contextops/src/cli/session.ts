import type { ProjectConfig } from '@contextops/schema'

import type { Flags } from './args'
import type { Cli } from './cli'
import { findCredential, readCredentials, readProjectConfig } from './config'
import { EXIT } from './exit'
import { LOCAL_FILES, resolveRoot } from './paths'

// =====================================================================
//  「누구로 어디에 말할 것인가」를 푸는 문 하나
//
//  ★ 왜 모았나 — 서버로 말하는 명령이 다섯이다 (`sync`·`status`·`upload-draft`·
//    `propose`·`progress`). 각자 project.json 과 credentials.json 을 열면
//    **「설정이 없다」와 「토큰이 없다」의 문구와 종료 코드가 명령마다 갈린다.**
//    그러면 Skill 이 종료 코드로 갈래를 못 탄다 (`exit.ts` 주석).
//
//  ⚠ 여기서는 **디스크에 쓰지 않는다.** sync 만 쓰기 가능 확인이 필요하고
//    (SPEC §8.5 1단계), 그건 sync 의 preflight 가 이 문 뒤에 덧붙인다.
//    읽기만 하는 명령이 쓰기 probe 를 하면 읽기 전용 체크아웃에서 못 돈다.
// =====================================================================

/** 여기까지 왔으면 「어느 저장소에서 · 누구로 · 어디에」가 전부 정해졌다. */
export type Ready = { root: string; config: ProjectConfig; token: string }

export type Session = { ok: true; ready: Ready } | { ok: false; code: number }

/**
 * 설정과 토큰을 읽는다. 못 읽으면 **무엇이 없는지**를 말하고 코드를 낸다.
 * ⚠ 「없다」와 「깨졌다」를 뭉치지 마라 — 답이 정반대다 (`config.ts` 주석).
 */
export function readyOrExplain(cli: Cli, flags: Flags): Session {
  const root = resolveRoot(cli.cwd, flags.value('dir'))

  const config = readProjectConfig(root)
  if (config.state === 'missing') {
    cli.io.err(`${LOCAL_FILES.project} 이 없다 — 먼저 contextops setup 을 실행해라.`)
    return { ok: false, code: EXIT.CONFIG }
  }
  if (config.state === 'invalid') {
    cli.io.err(`${LOCAL_FILES.project} 이 계약과 맞지 않는다:`)
    for (const line of config.problems) cli.io.err(`  ${line}`)
    return { ok: false, code: EXIT.CONFIG }
  }

  const credentials = readCredentials(cli.home)
  if (credentials.state === 'invalid') {
    cli.io.err(`credentials.json 을 읽을 수 없다 (${credentials.problems.join(' · ')})`)
    return { ok: false, code: EXIT.CONFIG }
  }
  const credential = credentials.state === 'ok'
    ? findCredential(credentials.value, config.value.api_origin, config.value.project_id)
    : undefined
  if (credential === undefined) {
    cli.io.err(`이 프로젝트의 기기 토큰이 없다 (${config.value.api_origin}) — contextops setup 을 다시 실행해라.`)
    return { ok: false, code: EXIT.CONFIG }
  }

  return { ok: true, ready: { root, config: config.value, token: credential.token } }
}

/**
 * 서버가 준 실패 코드를 **종료 코드**로 옮긴다 (SPEC §8.3 의 exit 표).
 *
 * ★ 왜 한 자리인가 — 이 매핑이 명령마다 있으면 같은 401 이 어디서는 10, 어디서는 20 이
 *   되고, Skill 의 「토큰이 만료됐으면 setup 안내」가 그 명령에서만 조용히 안 돈다.
 * ⚠ 「아직 발행이 없다」(NOT_FOUND)를 네트워크 실패로 내지 마라 — 재시도해도 안 된다.
 */
export function reportFailure(cli: Cli, code: string, message: string): number {
  if (code === 'UNAUTHORIZED') {
    cli.io.err('토큰이 유효하지 않다 (만료·취소됐을 수 있다) — contextops setup 을 다시 실행해라.')
    return EXIT.CONFIG
  }
  if (code === 'FORBIDDEN') {
    cli.io.err('이 프로젝트에 대한 권한이 없다.')
    return EXIT.CONFIG
  }
  if (code === 'NOT_FOUND') {
    cli.io.err('서버에 그런 것이 없다 — 웹에서 먼저 만들어라.')
    return EXIT.CONFIG
  }
  if (code === 'VALIDATION_FAILED') {
    //  🔴 계약 위반은 네트워크 문제가 아니다. 다시 보내도 같은 답이 온다 —
    //     Skill 은 이 코드를 보고 **고쳐서** 다시 보낸다 (재시도가 아니라 수정이다).
    cli.io.err(`서버가 계약 위반으로 거절했다 — ${message}`)
    return EXIT.INVALID
  }
  cli.io.err(`서버가 거절했다 — ${code}: ${message}`)
  return EXIT.NETWORK
}
