// =====================================================================
//  인자 파싱 — 명령이 **선언한 것만** 받는다
//
//  ★ 왜 모르는 플래그를 오류로 내나 — `--api-orgin` 같은 오타를 조용히 무시하면
//    setup 은 「origin 을 안 줬다」고 말한다. 사람은 방금 줬다고 믿는다.
//    받을 수 있는 것을 명령이 표로 적고, 그 표가 그대로 `--help` 가 된다.
// =====================================================================

export type FlagSpec = {
  kind: 'value' | 'bool'
  help: string
  /** 플래그가 없을 때 볼 환경변수. **자리는 여기 한 곳뿐이다.** */
  env?: string
}

export type FlagSpecs = Record<string, FlagSpec>

export type Flags = {
  /** 플래그 → 환경변수 → `undefined` 순으로 찾는다. */
  value(name: string): string | undefined
  bool(name: string): boolean
  /** 플래그가 아닌 인자들 (`validate <file>` 의 파일 경로 같은 것). */
  positional: string[]
}

export type ParseResult =
  | { ok: true; flags: Flags }
  | { ok: false; message: string }

export function parseArgs(argv: string[], specs: FlagSpecs, env: Record<string, string | undefined>): ParseResult {
  const values = new Map<string, string>()
  const bools = new Set<string>()
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? ''
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    //  `--name=value` 와 `--name value` 를 둘 다 받는다. 셸마다 쓰는 버릇이 다르고,
    //  한쪽만 받으면 그 사람에게는 이 CLI 가 고장 난 것이다.
    const eq = arg.indexOf('=')
    const name = (eq === -1 ? arg.slice(2) : arg.slice(2, eq))
    const spec = specs[name]
    if (!spec) return { ok: false, message: `모르는 플래그다: --${name}` }

    if (spec.kind === 'bool') {
      if (eq !== -1) return { ok: false, message: `--${name} 은 값을 받지 않는다` }
      bools.add(name)
      continue
    }
    const inline = eq === -1 ? undefined : arg.slice(eq + 1)
    const next = inline ?? argv[++i]
    if (next === undefined || next.startsWith('--')) {
      return { ok: false, message: `--${name} 에 값이 없다` }
    }
    values.set(name, next)
  }

  return {
    ok: true,
    flags: {
      value: (name) => {
        const given = values.get(name)
        if (given !== undefined) return given
        const envName = specs[name]?.env
        if (envName === undefined) return undefined
        const fromEnv = env[envName]
        return fromEnv === undefined || fromEnv.length === 0 ? undefined : fromEnv
      },
      bool: (name) => bools.has(name),
      positional,
    },
  }
}

/** `--help` 본문. 표가 곧 도움말이라 둘이 갈라질 수가 없다. */
export function flagHelp(specs: FlagSpecs): string[] {
  return Object.entries(specs).map(([name, spec]) => {
    const shape = spec.kind === 'bool' ? `--${name}` : `--${name} <값>`
    const env = spec.env === undefined ? '' : ` (환경변수 ${spec.env})`
    return `    ${shape.padEnd(22)} ${spec.help}${env}`
  })
}
