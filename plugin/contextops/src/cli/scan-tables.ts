// =====================================================================
//  스캔이 파일을 분류하는 **표들** (docs/SPEC.md §8.3)
//
//  ★ 왜 표만 따로 있나 — 여기가 「언어를 하나 더 지원한다」의 유일한 자리다.
//    분류 규칙이 `scan.ts` 의 if 문에 섞이면 언어 하나를 더할 때마다 걷는 코드를
//    읽어야 하고, 그때 제외 규칙 한 줄을 같이 망가뜨린다.
//
//  ★ 새 언어를 더하는 절차: `LANGUAGE_BY_EXT` 에 한 줄. 그게 전부다.
//  ★ 새 의존성 매니페스트: `DEPENDENCY_READERS` 에 한 줄 + `test/scan.test.ts` 에 한 줄.
//
//  ⚠ 여기 있는 어떤 규칙도 **파일 본문을 산출물에 넣지 않는다.** 읽는 것은
//    `DEPENDENCY_READERS` 와 `.env` 키 이름뿐이고, 둘 다 **이름만** 꺼낸다 (P1).
// =====================================================================

/** 확장자(소문자, 점 포함) → 언어 이름. 없으면 목록에는 들어가되 언어는 `other`. */
export const LANGUAGE_BY_EXT: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java', '.kt': 'kotlin',
  '.rb': 'ruby', '.php': 'php', '.cs': 'csharp', '.swift': 'swift', '.scala': 'scala',
  '.c': 'c', '.h': 'c', '.cc': 'cpp', '.cpp': 'cpp', '.hpp': 'cpp',
  '.sql': 'sql', '.sh': 'shell', '.ps1': 'powershell',
  '.md': 'markdown', '.mdx': 'markdown',
  '.json': 'json', '.yml': 'yaml', '.yaml': 'yaml', '.toml': 'toml',
  '.css': 'css', '.scss': 'css', '.html': 'html', '.prisma': 'prisma', '.tf': 'terraform',
}

/** 이 이름의 폴더는 통째로 건너뛴다. 값은 **제외 목록에 그대로 실린다.** */
export const EXCLUDED_DIRS: readonly string[] = [
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.turbo',
  'vendor', 'target', '__pycache__', '.venv', 'venv', '.cache', '.contextops',
]

/**
 * 🔴 **읽지도 세지도 않는 파일** — secret 이 사는 자리다 (SPEC §11 · P1).
 *
 * ★ 왜 목록에서까지 빼나 — `scan.json` 의 `files` 는 init Skill 이 「무엇을 읽을까」를
 *   고르는 목록이다. 여기에 `.env` 가 한 줄 있으면 언젠가 그 줄이 읽힌다.
 *   **볼 수 없는 것은 목록에 없어야 한다.**
 * ⚠ `.env*` 만은 스캐너가 직접 열되 **`=` 왼쪽(키 이름)만** 꺼낸다. 값은 어디에도 안 남는다.
 */
export const SECRET_PATTERNS: readonly RegExp[] = [
  /(^|\/)\.env($|\.)/, /\.pem$/, /\.key$/, /(^|\/)id_rsa/, /(^|_|-|\/)secrets?($|\.|_|-)/i,
  /(^|\/)credentials\.json$/, /\.p12$/, /\.pfx$/,
]

/** 커도 사람이 안 읽는 것들. 목록에서 빼되 secret 처럼 위험하지는 않다. */
export const NOISE_PATTERNS: readonly RegExp[] = [
  /-lock\.json$/, /(^|\/)pnpm-lock\.yaml$/, /(^|\/)yarn\.lock$/, /(^|\/)poetry\.lock$/,
  /\.min\.(js|css)$/, /\.map$/, /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|woff2?|ttf|mp4)$/i,
]

/** 이 이름이면 엔트리포인트 후보. 얕은 자리(3단계 이내)에 있을 때만 센다. */
export const ENTRY_BASENAMES: readonly string[] = [
  'main.ts', 'main.js', 'main.mjs', 'main.py', 'main.go', 'main.rs',
  'index.ts', 'index.js', 'index.mjs', 'app.ts', 'app.js', 'app.py',
  'server.ts', 'server.js', 'cli.ts', '__main__.py', 'Program.cs',
]
export const ENTRY_MAX_DEPTH = 3

/** 인프라 파일 — 이름이 정확히 맞거나(basename), 접미사·앞자리가 맞으면. */
export const INFRA_BASENAMES: readonly string[] = [
  'dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'makefile', 'procfile',
  'vercel.json', 'netlify.toml', 'fly.toml', 'nginx.conf', 'schema.prisma',
  'serverless.yml', 'skaffold.yaml', 'helmfile.yaml',
]
export const INFRA_SUFFIXES: readonly string[] = ['.tf', '.tfvars', '.dockerfile']
export const INFRA_PREFIXES: readonly string[] = [
  '.github/workflows/', 'infra/', 'deploy/', 'k8s/', 'charts/', 'terraform/', 'migrations/',
]

/**
 * 의존성 매니페스트 → **이름 목록**. 버전은 싣지 않는다 — 서버가 알아야 하는 것은
 * 「무엇을 쓰는가」지 「어느 판인가」가 아니다 (SPEC §3.1 은 이름만 받는다).
 */
export const DEPENDENCY_READERS: Record<string, (text: string) => string[]> = {
  'package.json': (text) => {
    const json: unknown = safeJson(text)
    if (json === undefined || typeof json !== 'object' || json === null) return []
    const record = json as Record<string, unknown>
    const out: string[] = []
    for (const field of ['dependencies', 'devDependencies']) {
      const deps = record[field]
      if (typeof deps === 'object' && deps !== null) out.push(...Object.keys(deps))
    }
    return out
  },
  'requirements.txt': (text) => text.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('-'))
    //  `pkg[extra]==1.2` → `pkg`
    .map((line) => (line.split(/[=<>!~;[\s]/)[0] ?? '').trim())
    .filter((name) => name.length > 0),
  'go.mod': (text) => text.split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[a-z0-9.\-/]+\s+v\d/.test(line))
    .map((line) => line.split(/\s+/)[0] ?? '')
    .filter((name) => name.length > 0),
}

/** 엔트리포인트를 선언하는 매니페스트. 값이 실제 파일일 때만 센다. */
export function declaredEntrypoints(packageJsonText: string): string[] {
  const json: unknown = safeJson(packageJsonText)
  if (typeof json !== 'object' || json === null) return []
  const record = json as Record<string, unknown>
  const out: string[] = []
  if (typeof record['main'] === 'string') out.push(record['main'])
  const bin = record['bin']
  if (typeof bin === 'string') out.push(bin)
  else if (typeof bin === 'object' && bin !== null) {
    for (const value of Object.values(bin)) if (typeof value === 'string') out.push(value)
  }
  return out.map((p) => p.replace(/^\.\//, ''))
}

/**
 * `.env` 류에서 **키 이름만** 꺼낸다. `=` 오른쪽은 이 함수를 나가지 않는다 (P1).
 * ⚠ 이 함수가 P1 의 마지막 한 겹이다 — 여기서 값을 돌려주면 스키마도 못 막는다
 *   (`env_keys` 는 그냥 문자열 배열이라 값이 들어가도 통과한다).
 */
export function envKeysOf(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^export\s+/, '')
    if (line.length === 0 || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) out.push(key)
  }
  return out
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
