import { flagHelp, parseArgs, type FlagSpecs, type Flags } from './args'
import type { Cli } from './cli'
import { EXIT } from './exit'
import { SCAN_FLAGS, runScan } from './scan'
import { SETUP_FLAGS, runSetup } from './setup'
import { VALIDATE_FLAGS, runValidate } from './validate'

// =====================================================================
//  🔴 **명령의 정본 표** (docs/SPEC.md §8.3)
//
//  ★ 새 명령을 더하는 절차 — 넷이고, 표 밖에서 할 일은 없다:
//    ① `src/cli/<이름>.ts` 에 `XXX_FLAGS` 와 `runXxx(cli, flags)` 를 만든다
//    ② 이 표에 한 줄 더한다  ← 도움말·인자 검사·종료 코드는 여기서 저절로 따라온다
//    ③ `test/<이름>.test.ts` 로 갈래를 잠근다 (성공 하나 · 실패 하나 이상)
//    ④ SPEC §8.3 의 표와 이 표가 같은지 본다 — 다르면 FINDINGS 에 적는다
//
//  ⚠ **아직 안 만든 명령을 여기 적지 마라.** 표에 있으면 `--help` 가 「할 수 있다」고
//    말하는 것이고, 사람은 그걸 믿고 부른다. SPEC §8.3 에는 8개가 있고 여기 셋뿐인
//    것이 지금의 사실이다 (나머지는 docs/PLAN.md P2 둘째·셋째 행).
// =====================================================================

export type Command = {
  summary: string
  usage: string
  flags: FlagSpecs
  run(cli: Cli, flags: Flags): Promise<number>
}

export const COMMANDS: Record<string, Command> = {
  setup: {
    summary: '이 저장소를 프로젝트에 잇는다 (project.json + 토큰 저장)',
    usage: 'contextops setup [옵션]',
    flags: SETUP_FLAGS,
    run: runSetup,
  },
  scan: {
    summary: '저장소를 결정론으로 훑어 cache/scan.json 을 만든다 (본문 없음)',
    usage: 'contextops scan [옵션]',
    flags: SCAN_FLAGS,
    run: runScan,
  },
  validate: {
    summary: '초안·제안 JSON 이 계약과 맞는지 네트워크 없이 판다',
    usage: 'contextops validate <json> [--schema <이름>]',
    flags: VALIDATE_FLAGS,
    run: runValidate,
  },
}

export function helpText(): string[] {
  const lines = ['contextops — 팀 컨텍스트를 Claude Code 로 나른다', '', '명령:']
  for (const [name, command] of Object.entries(COMMANDS)) {
    lines.push(`  ${name.padEnd(10)} ${command.summary}`)
    lines.push(`      ${command.usage}`)
    lines.push(...flagHelp(command.flags))
  }
  lines.push('', '종료 코드: 0 성공 · 2 계약 위반 · 10 로그인 실패 · 20 네트워크 · 30 설정 · 64 잘못된 사용')
  return lines
}

/**
 * 인자 하나를 명령으로 바꿔 돌린다. **여기가 CLI 의 전부다** — `main.ts` 는
 * 진짜 stdout·stdin·fetch 를 붙여서 이 함수를 부를 뿐이다 (그래야 시험이 돈다).
 */
export async function runCommand(cli: Cli, argv: string[]): Promise<number> {
  const name = argv[0]
  if (name === undefined || name === '--help' || name === '-h' || name === 'help') {
    for (const line of helpText()) cli.io.out(line)
    //  ⚠ 도움말을 **요청해서** 본 것은 성공이다. 명령 없이 부른 것도 여기로 오지만,
    //    그때 0을 내면 스크립트가 「아무 일도 안 했는데 됐다」로 읽는다.
    return name === undefined ? EXIT.USAGE : EXIT.OK
  }

  const command = COMMANDS[name]
  if (command === undefined) {
    cli.io.err(`모르는 명령이다: ${name}`)
    cli.io.err(`쓸 수 있는 명령: ${Object.keys(COMMANDS).join(' · ')}`)
    return EXIT.USAGE
  }

  const parsed = parseArgs(argv.slice(1), command.flags, cli.env)
  if (!parsed.ok) {
    cli.io.err(parsed.message)
    cli.io.err(command.usage)
    return EXIT.USAGE
  }
  return command.run(cli, parsed.flags)
}
