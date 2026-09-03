import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { JSON_SCHEMA_FILES } from '@contextops/schema'

import { runCommand } from '../src/cli/commands'
import { EXIT } from '../src/cli/exit'
import { DEFAULT_SCHEMA } from '../src/cli/validate'
import { fakeCli, tempDir } from './helpers/cli'

// =====================================================================
//  `validate` — 보내기 전에 같은 판정을 로컬에서 낸다 (SPEC §8.3)
//
//  ★ 재는 것: ① 맞는 초안은 0 ② 틀리면 2 **와 함께 어디가 틀렸는지**
//    ③ 이름 표(`JSON_SCHEMA_FILES`)가 실제로 갈래를 바꾼다
// =====================================================================

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

const GOOD_DRAFT = {
  items: [{
    type: 'policy',
    id: 'item_retry_policy',
    title: '결제 재시도 정책',
    body: '실패한 결제는 3회까지 재시도한다.',
    scope: { kind: 'project' },
    source_refs: [{ kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts' }],
    data: { rule: '실패한 결제는 3회까지 재시도한다', severity: 'must' },
  }],
}

function withFile(name: string, content: string): { cwd: string; home: string } {
  const dir = tempDir('contextops-validate-')
  dirs.push(dir)
  writeFileSync(join(dir.path, name), content, 'utf8')
  return { cwd: dir.path, home: dir.path }
}

describe('contextops validate', () => {
  it('계약과 맞는 초안은 exit 0', async () => {
    const world = withFile('draft.json', JSON.stringify(GOOD_DRAFT))
    const cli = fakeCli(world)

    expect(await runCommand(cli, ['validate', 'draft.json'])).toBe(EXIT.OK)
    expect(cli.out.join(' ')).toContain(DEFAULT_SCHEMA)
  })

  it('틀리면 exit 2 이고 **어느 칸이** 틀렸는지 찍는다', async () => {
    const bad = { items: [{ ...GOOD_DRAFT.items[0], data: { rule: 'x', severity: 'must' } }] }
    const world = withFile('draft.json', JSON.stringify(bad))
    const cli = fakeCli(world)

    expect(await runCommand(cli, ['validate', 'draft.json'])).toBe(EXIT.INVALID)
    expect(cli.err.join('\n')).toContain('items.0.data.rule')
  })

  it('JSON 이 아니면 exit 2', async () => {
    const world = withFile('draft.json', '{ 아니다')
    expect(await runCommand(fakeCli(world), ['validate', 'draft.json'])).toBe(EXIT.INVALID)
  })

  it('파일이 없으면 exit 64 — 계약 위반과 구별한다', async () => {
    const world = withFile('other.json', '{}')
    expect(await runCommand(fakeCli(world), ['validate', 'draft.json'])).toBe(EXIT.USAGE)
  })

  it('인자가 없으면 exit 64', async () => {
    const world = withFile('draft.json', '{}')
    expect(await runCommand(fakeCli(world), ['validate'])).toBe(EXIT.USAGE)
  })

  it('--schema 는 표에 있는 이름만 받고, 이름이 판정을 바꾼다', async () => {
    const world = withFile('draft.json', JSON.stringify(GOOD_DRAFT))

    const unknown = fakeCli(world)
    expect(await runCommand(unknown, ['validate', 'draft.json', '--schema', 'nope'])).toBe(EXIT.USAGE)
    expect(unknown.err.join(' ')).toContain(Object.keys(JSON_SCHEMA_FILES)[0] as string)

    //  같은 파일이 다른 계약으로는 틀려야 한다 — 안 그러면 `--schema` 가 아무 일도 안 한다.
    const other = fakeCli(world)
    expect(await runCommand(other, ['validate', 'draft.json', '--schema', 'manifest'])).toBe(EXIT.INVALID)
  })

  it('표의 이름을 전부 받는다 — 표에 한 줄 더하면 이 명령이 저절로 안다', async () => {
    const world = withFile('empty.json', '{}')
    for (const name of Object.keys(JSON_SCHEMA_FILES)) {
      const cli = fakeCli(world)
      const code = await runCommand(cli, ['validate', 'empty.json', '--schema', name])
      //  `{}` 는 어느 계약과도 안 맞는다 — 중요한 것은 USAGE(64)가 아니라는 것이다.
      expect(code, name).toBe(EXIT.INVALID)
    }
  })
})
