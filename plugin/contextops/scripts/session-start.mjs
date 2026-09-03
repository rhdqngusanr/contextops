#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// =====================================================================
//  SessionStart 훅 (docs/SPEC.md §8.6)
//
//  🔴 **P6 — 이 파일은 저장소를 하나도 바꾸지 않는다.** 읽기와 stdout 뿐이다.
//     ★ 왜 절대 원칙인가 — 훅은 사용자가 세션을 열 때마다 **묻지도 않고** 돈다.
//       거기서 파일을 고치는 도구는 「내 저장소를 몰래 고치는 것」이고, 그걸 아는
//       순간 아무도 안 깐다. 바꾸는 것은 사람이 `/contextops:sync` 를 부를 때만이다.
//     ⚠ `tools/principles.ps1` 의 P6 검사가 이 파일에서 쓰기 API 이름을 찾는다.
//       **주석에도 그 이름을 적지 마라** — 게이트는 주석도 센다 (일부러 그렇게 뒀다).
//
//  🔴 **조용한 것이 기본이다.** 아래 넷은 전부 무출력이다:
//     ① 연결 안 된 저장소  ② 최신  ③ 오프라인  ④ 무엇이든 예외
//     ★ 왜 — 매 세션 뜨는 줄은 사흘이면 안 읽힌다. 그러면 진짜 알림도 같이 죽는다.
//
//  ⚠ 번들이 아니다. Claude Code 가 `node <경로>` 로 그대로 부르므로
//    **의존이 하나도 없어야 한다** (`@contextops/schema` 도 못 쓴다).
//    그래서 여기서는 계약을 파싱하지 않고 **필요한 칸 두 개만** 조심스럽게 읽는다.
// =====================================================================

/** SPEC §8.6 「5분 내 cache 있으면 재사용」. 숫자는 여기 한 곳이다. */
const CACHE_MAX_AGE_MS = 5 * 60 * 1000
/** SPEC §8.6 「2초 timeout」. hooks.json 의 timeout(3초)보다 짧아야 한다. */
const NETWORK_TIMEOUT_MS = 2000
/** SPEC §8.6 「6줄 이내」. 넘치면 자른다 — 세션 머리를 우리 줄로 덮지 않는다. */
const MAX_LINES = 6

const LOCAL_DIR = '.contextops'

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

function ageMs(path) {
  try {
    return Date.now() - statSync(path).mtimeMs
  } catch {
    return Infinity
  }
}

async function latestManifest(config, token, localHash) {
  //  ① 최근 캐시가 있으면 네트워크를 아예 안 탄다. 세션 시작을 2초 늦추지 않는 값이다.
  const cachePath = join(LOCAL_DIR, 'cache', 'latest-manifest.json')
  if (ageMs(cachePath) < CACHE_MAX_AGE_MS) {
    const cached = readJson(cachePath)
    if (cached !== undefined) return cached
  }

  //  ② 2초 안에 안 오면 포기한다. **세션 시작을 막는 훅이 제일 나쁘다.**
  const timer = AbortSignal.timeout(NETWORK_TIMEOUT_MS)
  try {
    const response = await fetch(
      `${config.api_origin}/api/v1/projects/${config.project_id}/packs/latest/manifest`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
          ...(localHash === undefined ? {} : { 'if-none-match': localHash }),
        },
        signal: timer,
      },
    )
    //  304 = 우리가 가진 것이 최신이다. 할 말이 없다.
    if (response.status === 304) return 'same'
    if (!response.ok) return undefined
    const body = await response.json()
    return body?.data
  } catch {
    //  오프라인·타임아웃·주소 오류 — 전부 무출력이다 (SPEC §8.6).
    return undefined
  }
}

async function main() {
  const root = process.cwd()
  const config = readJson(join(root, LOCAL_DIR, 'project.json'))
  //  연결 안 된 저장소에서는 **한 글자도 내지 않는다.** 대부분의 저장소가 여기다.
  if (config?.api_origin === undefined || config?.project_id === undefined) return

  const credentials = readJson(join(homedir(), LOCAL_DIR, 'credentials.json'))
  const token = credentials?.[config.api_origin]?.[config.project_id]?.token
  if (typeof token !== 'string') return

  const local = readJson(join(root, LOCAL_DIR, 'manifest.json'))
  const official = await latestManifest(config, token, local?.manifest_hash)
  if (official === undefined) return
  if (official === 'same') return

  const lines = []
  if (local?.manifest_hash === official?.manifest_hash) {
    //  최신이다 — 여기서도 무출력이다 (캐시로 왔을 때 이 갈래를 탄다).
  } else if (local === undefined) {
    lines.push(`ContextOps: 팀 컨텍스트 v${official?.context_version} 이 있는데 아직 받지 않았다.`)
    lines.push(`  파일 ${official?.files?.length ?? 0}개 · /contextops:sync 로 받는다`)
  } else {
    lines.push(`ContextOps: 적용 v${local.context_version} · 공식 v${official?.context_version}`)
    lines.push(`  파일 ${official?.files?.length ?? 0}개 · /contextops:sync 로 갱신한다`)
  }

  //  Stop 훅이 남긴 초안이 있으면 같이 알린다 (SPEC §8.6). **읽기만 한다.**
  if (readJson(join(root, LOCAL_DIR, 'pending-proposal.json')) !== undefined) {
    lines.push('  초안 1건이 대기 중이다 — /contextops:propose')
  }

  if (lines.length === 0) return
  lines.push('  Hook은 파일을 변경하지 않습니다.')
  process.stdout.write(`${lines.slice(0, MAX_LINES).join('\n')}\n`)
}

//  ⚠ 어떤 예외도 세션을 막지 않는다. 훅이 죽으면 Claude Code 가 그 줄을 보여 준다 —
//    사용자는 우리 도구가 고장 났다고 읽는다. 조용히 0 으로 끝나는 것이 낫다.
main().catch(() => {})
