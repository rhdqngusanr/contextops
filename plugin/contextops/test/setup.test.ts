import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CredentialsFile, ProjectConfig } from '@contextops/schema'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { failEnvelope, fakeCli, okEnvelope, tempDir } from './helpers/cli'

// =====================================================================
//  `setup` — 갈래마다 **다른 종료 코드** (SPEC §8.3 「0/10 로그인 실패/30 config」)
//
//  ★ 왜 코드를 재나 — 이 숫자를 읽는 것은 사람이 아니라 Skill 과 스크립트다.
//    전부 1 로 나가면 「토큰이 틀렸다」와 「서버가 죽었다」를 구별할 수 없고,
//    그러면 재시도 규칙을 쓸 수가 없다.
// =====================================================================

const ORIGIN = 'https://contextops.example.com'
const PROJECT = '11111111-2222-4333-8444-555555555555'
const DEVICE = '66666666-7777-4888-8999-aaaaaaaaaaaa'
const TOKEN = 'ctx_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

function world() {
  const repo = tempDir('contextops-repo-')
  const home = tempDir('contextops-home-')
  dirs.push(repo, home)
  return { repo: repo.path, home: home.path }
}

const baseArgs = ['setup', '--api-origin', ORIGIN, '--project', PROJECT, '--token', TOKEN, '--no-browser']

describe('contextops setup', () => {
  it('두 파일을 쓴다 — project.json 에는 토큰이 없고 credentials 에는 있다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope([])] })

    const code = await runCommand(cli, [...baseArgs, '--device-id', DEVICE])

    expect(code).toBe(EXIT.OK)
    const configText = readFileSync(join(repo, '.contextops', 'project.json'), 'utf8')
    expect(configText).not.toContain(TOKEN)
    const config = ProjectConfig.parse(JSON.parse(configText))
    expect(config.api_origin).toBe(ORIGIN)
    expect(config.project_id).toBe(PROJECT)

    const credentials = CredentialsFile.parse(
      JSON.parse(readFileSync(join(home, '.contextops', 'credentials.json'), 'utf8')),
    )
    expect(credentials[ORIGIN]?.[PROJECT]).toEqual({ token: TOKEN, device_id: DEVICE })
  })

  it('토큰이 유효한지 서버에 물어본다 — 401 이면 exit 10 이고 아무것도 쓰지 않는다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home, responses: [failEnvelope(401, 'UNAUTHORIZED', '알 수 없는 토큰이다')] })

    const code = await runCommand(cli, baseArgs)

    expect(code).toBe(EXIT.LOGIN_FAILED)
    expect(cli.requests[0]).toBe(`${ORIGIN}/api/v1/projects/${PROJECT}/sync-status`)
    expect(() => readFileSync(join(repo, '.contextops', 'project.json'), 'utf8')).toThrow()
  })

  it('남의 프로젝트면 exit 30 — 「설정이 틀렸다」지 「로그인 실패」가 아니다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home, responses: [failEnvelope(404, 'NOT_FOUND')] })

    expect(await runCommand(cli, baseArgs)).toBe(EXIT.CONFIG)
  })

  it('서버에 못 닿으면 exit 20 — 오프라인과 권한 문제를 섞지 않는다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home, responses: [{ throws: 'getaddrinfo ENOTFOUND' }] })

    const code = await runCommand(cli, baseArgs)

    expect(code).toBe(EXIT.NETWORK)
    expect(cli.err.join(' ')).toContain('ENOTFOUND')
  })

  it('토큰 모양이 아니면 요청을 아예 보내지 않는다 (exit 10)', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home })

    const code = await runCommand(cli, ['setup', '--api-origin', ORIGIN, '--project', PROJECT, '--token', 'abc', '--no-browser'])

    expect(code).toBe(EXIT.LOGIN_FAILED)
    expect(cli.requests).toEqual([])
  })

  it('사람이 없고 값도 없으면 물어보지 않고 exit 30 으로 끝난다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home })

    const code = await runCommand(cli, ['setup', '--no-browser'])

    expect(code).toBe(EXIT.CONFIG)
    expect(cli.err.join(' ')).toContain('CONTEXTOPS_API_ORIGIN')
  })

  it('환경변수로도 받는다 — 표에 적힌 이름 그대로', async () => {
    const { repo, home } = world()
    const cli = fakeCli({
      cwd: repo,
      home,
      env: { CONTEXTOPS_API_ORIGIN: ORIGIN, CONTEXTOPS_PROJECT_ID: PROJECT, CONTEXTOPS_TOKEN: TOKEN },
      responses: [okEnvelope([])],
    })

    expect(await runCommand(cli, ['setup', '--no-browser'])).toBe(EXIT.OK)
  })

  it('물어볼 수 있으면 물어본다 — 붙여 넣기 흐름이 이 갈래다', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home, answers: [ORIGIN, PROJECT, TOKEN], responses: [okEnvelope([])] })

    const code = await runCommand(cli, ['setup', '--no-browser'])

    expect(code).toBe(EXIT.OK)
    expect(readFileSync(join(repo, '.contextops', 'project.json'), 'utf8')).toContain(PROJECT)
  })

  it('브라우저는 로그인 화면을 연다 — 우리가 대신 로그인하지 않는다 (P2)', async () => {
    const { repo, home } = world()
    const cli = fakeCli({ cwd: repo, home, responses: [okEnvelope([])] })

    await runCommand(cli, ['setup', '--api-origin', ORIGIN, '--project', PROJECT, '--token', TOKEN])

    expect(cli.opened).toEqual([`${ORIGIN}/login`])
  })

  it('다른 서버·다른 프로젝트의 토큰을 덮지 않는다', async () => {
    const { repo, home } = world()
    const other = 'https://other.example.com'
    const first = fakeCli({ cwd: repo, home, responses: [okEnvelope([])] })
    await runCommand(first, ['setup', '--api-origin', other, '--project', PROJECT, '--token', TOKEN, '--no-browser'])

    const second = fakeCli({ cwd: repo, home, responses: [okEnvelope([])] })
    await runCommand(second, baseArgs)

    const credentials = CredentialsFile.parse(
      JSON.parse(readFileSync(join(home, '.contextops', 'credentials.json'), 'utf8')),
    )
    expect(Object.keys(credentials).sort()).toEqual([ORIGIN, other].sort())
  })
})
