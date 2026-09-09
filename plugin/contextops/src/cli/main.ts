import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { homedir } from 'node:os'

import type { Cli } from './cli'
import { runCommand } from './commands'
import { EXIT } from './exit'
import { nodeVersionWarning } from './node'

// =====================================================================
//  진짜 세상을 `Cli` 에 붙이는 자리 — **여기 말고 어디에도 `process` 가 없다**
//
//  ★ 왜 한 곳인가 — 명령 안에서 `process.stdout` 을 부르면 그 명령은 시험에서
//    프로세스를 띄워야만 돌게 된다. 갈래(401·오프라인·잘못된 설정)를 잴 수 없으면
//    그 갈래는 사실상 검사되지 않는다.
//
//  ⚠ 이 파일은 esbuild 로 `bin/contextops-cli.mjs` 하나로 묶인다 (SPEC §1.2).
//    번들에는 런타임 의존이 없다 — 플러그인을 깐 사람은 pnpm install 을 하지 않는다.
// =====================================================================

/** 브라우저를 여는 명령. OS 마다 다르고, **실패해도 던지지 않는다.** */
function openUrl(url: string): void {
  const [command, args] = process.platform === 'win32'
    //  ⚠ Windows 의 `start` 는 첫 인용 인자를 **창 제목**으로 먹는다. 빈 제목을 먼저 준다.
    ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]]
  try {
    const child = spawn(command as string, args as string[], { stdio: 'ignore', detached: true })
    //  브라우저가 없는 기계(서버·컨테이너)에서도 CLI 는 계속 가야 한다 — 주소는 이미 찍었다.
    child.on('error', () => {})
    child.unref()
  } catch {
    /* 열지 못해도 진행한다 */
  }
}

const cli: Cli = {
  cwd: process.cwd(),
  home: homedir(),
  env: process.env,
  io: {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
    ask: async (question) => {
      //  🔴 사람이 없으면 **묻지 않는다.** 훅·CI 에서 물어보면 세션이 통째로 멈춘다.
      if (!process.stdin.isTTY) return undefined
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      try {
        return await new Promise<string>((resolve) => rl.question(question, resolve))
      } finally {
        rl.close()
      }
    },
  },
  fetch: globalThis.fetch,
  openUrl,
}

//  낮은 Node 는 문법 오류로 여기까지 못 올 수도 있다 — 왔다면 한 줄로 말하고 진행한다 (`node.ts`).
const nodeWarning = nodeVersionWarning(process.versions.node)
if (nodeWarning !== undefined) process.stderr.write(`${nodeWarning}\n`)

runCommand(cli, process.argv.slice(2))
  .then((code) => { process.exitCode = code })
  .catch((err: unknown) => {
    //  ⚠ 스택을 찍지 마라 — 경로와 토큰이 섞여 나온다 (P1 · SPEC §11).
    process.stderr.write(`${err instanceof Error ? err.message : '알 수 없는 오류'}\n`)
    process.exitCode = EXIT.CONFIG
  })
