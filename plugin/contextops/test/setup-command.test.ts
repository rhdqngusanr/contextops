import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CredentialsFile, ProjectConfig,
  SETUP_COMMAND_FLAGS, SETUP_COMMAND_NAME, setupCommandLine,
} from '@contextops/schema'

import { COMMANDS, runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { SETUP_FLAGS } from '../src/cli/setup'
import { fakeCli, okEnvelope, tempDir } from './helpers/cli'

// =====================================================================
//  🔴 **화면 9 가 복사해 주는 한 줄을 `setup` 이 그대로 먹는가** (FINDINGS 36)
//
//  ★ 왜 이 시험이 필요한가 — 그 줄을 **만드는 쪽**은 `apps/web`(화면 9)이고
//    **받는 쪽**은 이 CLI 다. 둘은 다른 패키지라, 플래그 이름 하나가 갈려도
//    타입 검사는 초록이다. 증상은 **화면이 준 줄을 CLI 가 모른다**는 것이고,
//    사람은 그걸 자기 오타로 안다 — 눈으로는 절대 안 잡힌다.
//
//  재는 것은 두 단계다 (loop/PROMPT.md ④2-B):
//    ① 소비처가 있나 — 그 줄의 플래그가 전부 `SETUP_FLAGS` 의 키다 (`--help` 가 아는 이름)
//    ② 실제로 바꾸나 — **그 줄을 그대로 인자로 넘겨** setup 을 돌리면 두 파일이 생기고
//      `project.json` 은 그 프로젝트를, `credentials.json` 은 그 토큰과 `device_id` 를 담는다
// =====================================================================

const ORIGIN = 'https://contextops.example.com'
const PROJECT = '11111111-2222-4333-8444-555555555555'
const DEVICE = '66666666-7777-4888-8999-aaaaaaaaaaaa'
const TOKEN = 'ctx_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'

const LINE = setupCommandLine({
  api_origin: ORIGIN, project_id: PROJECT, token: TOKEN, device_id: DEVICE,
})

describe('① 그 줄의 플래그를 setup 이 전부 받는다', () => {
  it('명령 이름이 `COMMANDS` 표의 usage 와 같은 말이다', () => {
    expect(COMMANDS.setup?.usage).toContain(SETUP_COMMAND_NAME)
  })

  it('🔴 `SETUP_COMMAND_FLAGS` 의 이름이 전부 `SETUP_FLAGS` 의 키다 — 하나만 갈려도 그 줄이 죽는다', () => {
    for (const flag of SETUP_COMMAND_FLAGS) {
      expect(Object.keys(SETUP_FLAGS), `--${flag} 를 setup 이 모른다`).toContain(flag)
      //  값을 받는 플래그여야 한다 — `bool` 이면 뒤의 값이 인자로 새어 나간다.
      expect(SETUP_FLAGS[flag]?.kind, flag).toBe('value')
    }
  })

  it('줄의 모양 — `contextops setup --flag 값` 이고 빠진 값이 없다', () => {
    expect(LINE.startsWith(`${SETUP_COMMAND_NAME} `)).toBe(true)
    for (const flag of SETUP_COMMAND_FLAGS) expect(LINE).toContain(`--${flag} `)
    for (const value of [ORIGIN, PROJECT, TOKEN, DEVICE]) expect(LINE).toContain(value)
  })
})

describe('② 그 줄을 그대로 돌리면 저장소가 이어진다', () => {
  it('🔴 화면이 준 한 줄 → 인자 → setup 성공 · project.json 과 credentials.json 이 그 값을 담는다', async () => {
    const repo = tempDir('contextops-repo-')
    const home = tempDir('contextops-home-')
    try {
      //  사람이 터미널에 붙여넣는 것과 같게 자른다 — 명령 이름 두 낱말은 셸이 먹는다.
      const argv = LINE.split(' ').slice(1)
      expect(argv[0]).toBe('setup')

      const cli = fakeCli({ cwd: repo.path, home: home.path, responses: [okEnvelope([])] })
      const code = await runCommand(cli, [...argv, '--no-browser'])
      expect(code, cli.err.join('\n')).toBe(EXIT.OK)

      const config = ProjectConfig.parse(
        JSON.parse(readFileSync(join(repo.path, '.contextops', 'project.json'), 'utf8')),
      )
      expect(config.api_origin).toBe(ORIGIN)
      expect(config.project_id).toBe(PROJECT)

      const creds = CredentialsFile.parse(
        JSON.parse(readFileSync(join(home.path, '.contextops', 'credentials.json'), 'utf8')),
      )
      //  🔴 `device_id` 가 따라왔다 — 이게 한 줄로 주는 이유다. 사람이 토큰만 옮기면
      //     이 값이 늘 비고, 그러면 「이 기기만 끊기」가 영원히 안 된다.
      expect(creds[ORIGIN]?.[PROJECT]).toEqual({ token: TOKEN, device_id: DEVICE })
    } finally {
      repo.cleanup()
      home.cleanup()
    }
  })
})
