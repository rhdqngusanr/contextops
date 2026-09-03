import { isAbsolute, join } from 'node:path'
import { JSON_SCHEMA_FILES, type JsonSchemaName } from '@contextops/schema'

import type { FlagSpecs, Flags } from './args'
import type { Cli } from './cli'
import { EXIT } from './exit'
import { readTextIfExists } from './fsx'
import { describeIssues } from './issues'

// =====================================================================
//  `contextops validate <json>` — 보내기 **전에** 로컬에서 판다 (docs/SPEC.md §8.3)
//
//  ★ 왜 있나 — Skill 이 쓴 초안이 계약과 다르면 서버는 400 한 줄을 준다. 그걸 보고
//    모델이 고치려면 **어느 칸이 왜 틀렸는지**가 필요하다. 네트워크 없이 같은 판정을
//    여기서 낸다.
//
//  🔴 **판정하는 것은 `schemas/*.json` 이 아니라 번들에 들어간 Zod 정본이다.**
//    SPEC §8.3 은 「schemas/*.json 으로 검증」이라고 적었지만, JSON Schema 는
//    `.refine()` 을 못 옮긴다 (`ProposalItem` 의 「add 는 draft 가 필요하다」가
//    통째로 사라진다). 약한 검사로 통과시키고 서버에서 막히면 사람은 이유를 모른다.
//    ⚠ 두 벌이 아니다 — `schemas/*.json` 도 **같은 Zod 에서 뽑는다**
//      (`packages/schema/src/json-schema.ts`). 표류는 그쪽 시험이 잡는다.
//
//  ★ 검사할 수 있는 이름은 `JSON_SCHEMA_FILES` 표가 정한다 — 여기 목록을 따로
//    적지 않는다. 표에 한 줄 더하면 이 명령이 저절로 그 이름을 받는다.
// =====================================================================

/** 이름을 안 주면 이것으로 판다 — init Skill 이 쓰는 파일이다 (SPEC §8.4 4단계). */
export const DEFAULT_SCHEMA: JsonSchemaName = 'draft'

export const VALIDATE_FLAGS: FlagSpecs = {
  'schema': { kind: 'value', help: `계약 이름 (기본: ${DEFAULT_SCHEMA})` },
}

const SCHEMA_NAMES = Object.keys(JSON_SCHEMA_FILES) as JsonSchemaName[]

function isSchemaName(value: string): value is JsonSchemaName {
  return (SCHEMA_NAMES as string[]).includes(value)
}

export async function runValidate(cli: Cli, flags: Flags): Promise<number> {
  const target = flags.positional[0]
  if (target === undefined) {
    cli.io.err('검사할 파일을 넘겨라: contextops validate <json>')
    return EXIT.USAGE
  }
  const name = flags.value('schema') ?? DEFAULT_SCHEMA
  if (!isSchemaName(name)) {
    cli.io.err(`모르는 계약이다: ${name}`)
    cli.io.err(`쓸 수 있는 이름: ${SCHEMA_NAMES.join(' · ')}`)
    return EXIT.USAGE
  }

  const path = isAbsolute(target) ? target : join(cli.cwd, target)
  const text = readTextIfExists(path)
  if (text === undefined) {
    cli.io.err(`파일이 없다: ${path}`)
    return EXIT.USAGE
  }

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    //  ⚠ 파서 메시지에는 위치만 있고 본문은 없다 — 그대로 보여도 된다.
    cli.io.err(`JSON 이 아니다: ${err instanceof Error ? err.message : '파싱 실패'}`)
    return EXIT.INVALID
  }

  const parsed = JSON_SCHEMA_FILES[name].safeParse(raw)
  if (!parsed.success) {
    const problems = describeIssues(parsed.error)
    cli.io.err(`${path} 가 ${name} 계약과 맞지 않는다 — ${problems.length}곳:`)
    for (const line of problems) cli.io.err(`  ${line}`)
    return EXIT.INVALID
  }

  cli.io.out(`${path} — ${name} 계약과 맞는다.`)
  return EXIT.OK
}
