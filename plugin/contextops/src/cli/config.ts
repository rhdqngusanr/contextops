import { CredentialsFile, ProjectConfig, type DeviceCredential } from '@contextops/schema'

import { readTextIfExists, writeJsonFile, writeSecretFile } from './fsx'
import { describeIssues } from './issues'
import { credentialsFile, repoFile } from './paths'

// =====================================================================
//  로컬 설정을 읽고 쓰는 자리 하나 (docs/SPEC.md §8.2)
//
//  ★ 왜 「없다」와 「깨졌다」를 나누나 — 둘의 답이 정반대다. 없으면 `setup` 을
//    안내하면 되고, 깨졌으면 **어디가 깨졌는지** 말해야 한다. 하나로 뭉치면
//    손으로 고치다 오타 낸 사람에게 「setup 을 하세요」라고 답하게 되고,
//    그 사람은 이미 한 setup 을 또 한다.
// =====================================================================

export type Loaded<T> =
  | { state: 'ok'; value: T }
  | { state: 'missing' }
  | { state: 'invalid'; problems: string[] }

function loadJson<T>(path: string, parse: (raw: unknown) => Loaded<T>): Loaded<T> {
  const text = readTextIfExists(path)
  if (text === undefined) return { state: 'missing' }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { state: 'invalid', problems: ['JSON 이 아니다'] }
  }
  return parse(raw)
}

/** `<repo>/.contextops/project.json`. */
export function readProjectConfig(root: string): Loaded<ProjectConfig> {
  return loadJson(repoFile(root, 'project'), (raw) => {
    const parsed = ProjectConfig.safeParse(raw)
    return parsed.success
      ? { state: 'ok', value: parsed.data }
      : { state: 'invalid', problems: describeIssues(parsed.error) }
  })
}

export function writeProjectConfig(root: string, config: ProjectConfig): string {
  const path = repoFile(root, 'project')
  //  ⚠ 쓰기 전에 한 번 더 판다. 호출부가 만든 객체가 계약과 다르면 **여기서** 죽는 것이
  //    낫다 — 파일로 나가면 그 다음 바퀴가 「내 설정이 왜 안 읽히지」를 쫓게 된다.
  writeJsonFile(path, ProjectConfig.parse(config))
  return path
}

/** `~/.contextops/credentials.json`. 없으면 빈 표다 — 첫 `setup` 이 정상 경로다. */
export function readCredentials(home: string): Loaded<CredentialsFile> {
  return loadJson(credentialsFile(home), (raw) => {
    const parsed = CredentialsFile.safeParse(raw)
    return parsed.success
      ? { state: 'ok', value: parsed.data }
      : { state: 'invalid', problems: describeIssues(parsed.error) }
  })
}

/**
 * 토큰 하나를 **합쳐서** 저장한다 (같은 파일에 다른 서버·다른 프로젝트가 산다).
 *
 * 🔴 파일 권한은 `writeSecretFile` 하나가 정한다 (0600). 여기서 숫자를 적지 마라.
 * ⚠ 기존 파일이 깨져 있으면 **덮어쓰지 않고 던진다.** 남의 토큰이 든 파일을
 *   「어차피 못 읽으니」라며 지우면 그 사람은 다시 발급받아야 한다.
 */
export function saveCredential(
  home: string,
  origin: string,
  projectId: string,
  credential: DeviceCredential,
  chmod?: (path: string, mode: number) => void,
): string {
  const existing = readCredentials(home)
  if (existing.state === 'invalid') {
    throw new Error(`credentials.json 을 읽을 수 없다 (${existing.problems.join(' · ')}) — 손으로 고치거나 옮겨라`)
  }
  const all: CredentialsFile = existing.state === 'ok' ? existing.value : {}
  const forOrigin = { ...(all[origin] ?? {}), [projectId]: credential }
  const next = CredentialsFile.parse({ ...all, [origin]: forOrigin })

  const path = credentialsFile(home)
  writeSecretFile(path, `${JSON.stringify(next, null, 2)}\n`, chmod)
  return path
}

/** 그 서버의 그 프로젝트로 쓸 토큰. 없으면 `undefined`. */
export function findCredential(
  credentials: CredentialsFile,
  origin: string,
  projectId: string,
): DeviceCredential | undefined {
  return credentials[origin]?.[projectId]
}
