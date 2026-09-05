import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

// =====================================================================
//  `fixtures/` 를 찾아 읽는 문 하나 (SPEC §10.1 · §10.3)
//
//  ★ 왜 찾나 — 시드는 원래 `scripts/` 에 살았고 `import.meta.url` 에서 세 단을 올라가
//    저장소 뿌리를 잡았다. 제품 코드가 되면서 그 길이 둘 다 무너진다: 파일의 자리가 다르고,
//    배포 번들에서는 `import.meta.url` 이 소스의 자리를 말하지 않는다.
//    그래서 **cwd 에서 위로 올라가며** `fixtures/paylab-docs` 가 있는 폴더를 찾는다 —
//    저장소 뿌리에서 돌든(`tools/ci.ps1`), `apps/web` 에서 돌든(`pnpm --filter web`),
//    배포 함수 안(`/var/task` 아래에 뿌리 기준으로 복사된 파일들)이든 같은 규칙이다.
//
//  🔴 **배포 번들에 픽스처가 실리는 것은 `next.config.ts` 의 `outputFileTracingIncludes`
//     가 정한다.** 그 줄이 없으면 이 함수는 배포에서 반드시 던진다 — 조용히 빈 데모를
//     심지 않는다. (던지는 문구가 곧 「그 줄을 봐라」다.)
//
//  ⚠ 문서와 코드가 **같은 문**인 이유 — 근거를 따라가는 쪽(관통)은 둘 다 「`fixtures/`
//    아래 이 경로를 잘라 보면 그 문장이 있나」로 잰다. 읽는 문이 둘이면 경로를 적는
//    방식이 갈라지고, 갈라지면 검사가 한쪽만 따라간다.
//  ⚠ 문서 본문은 사용자가 **의도적으로** 올리는 것이다 (P1). 코드 본문은 올라가지
//    않는다 — `repository_path` 근거가 싣는 것은 **repo·경로·줄 번호뿐**이다.
// =====================================================================

/** 이 폴더가 있으면 거기가 `fixtures/` 의 부모다. 관통 첫 단계의 prereq 와 같은 이름이다. */
const FIXTURES_MARKER = join('fixtures', 'paylab-docs')

/** cwd 에서 몇 단까지 올라가 보나. 모노레포 뿌리는 `apps/web` 에서 두 단 위다 — 여유를 둔다. */
const MAX_ASCENT = 4

let cached: string | undefined

/**
 * `fixtures/` 폴더의 절대 경로. 못 찾으면 **던진다** — 어디를 뒤졌는지 문구에 남긴다.
 */
export function fixturesRoot(): string {
  if (cached) return cached
  const tried: string[] = []
  let dir = process.cwd()
  for (let i = 0; i <= MAX_ASCENT; i += 1) {
    tried.push(dir)
    if (existsSync(join(dir, FIXTURES_MARKER))) {
      cached = join(dir, 'fixtures')
      return cached
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(
    `[fixtures] ${FIXTURES_MARKER} 를 못 찾았다 — 뒤진 곳: ${tried.join(' · ')}. `
    + '배포라면 next.config.ts 의 outputFileTracingIncludes 가 fixtures/ 를 싣는지 봐라',
  )
}

/** `fixtures/` 아래 파일 하나를 그대로 읽는다. */
export function fixtureText(rel: string): string {
  return readFileSync(join(fixturesRoot(), rel), 'utf8')
}

/**
 * 픽스처 레포에 그 폴더가 **정말 있는지 재고** 경로를 돌려준다. 없으면 **던진다.**
 *
 * ★ 왜 재는가 — `architecture` 항목의 `paths` 는 「이 구성요소의 코드가 여기 산다」다.
 *   손으로 적으면 픽스처가 바뀌었을 때 **조용히 없는 폴더를 가리킨다** — 태그는 멀쩡히
 *   붙어 있고 심사자가 따라가면 아무것도 없다 (FINDINGS 90 과 같은 고장, 코드 쪽 판).
 * ⚠ 던지는 이유는 `seed.ts` 의 `locate()` 와 같다 — 조용히 넘어가면 아무도 안 센다.
 */
export function fixtureDir(repo: string, rel: string): string {
  const at = join(fixturesRoot(), repo, rel)
  if (!existsSync(at) || !statSync(at).isDirectory()) {
    throw new Error(`[seed] ${repo}/${rel} 폴더가 픽스처에 없다 — 경로를 적지 말고 픽스처를 봐라`)
  }
  return rel
}

/** `fixtures/` 아래 JSON 하나를 **판 것이 아니라 날것으로** 읽는다 — 파는 것은 부르는 쪽의 계약이다. */
export function fixtureJson(rel: string): unknown {
  return JSON.parse(fixtureText(rel)) as unknown
}
