import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

// =====================================================================
//  파일 읽기·쓰기의 자리 하나
//
//  ★ 왜 감싸나 — 「없으면 undefined」와 「JSON 으로 쓴다」와 「secret 은 0600」이
//    명령마다 적히면 반드시 한 곳이 빠진다. 빠진 곳은 **평소엔 잘 돈다** —
//    권한이 틀린 파일은 아무 증상도 없다가 남이 읽어 갈 때만 문제가 된다.
// =====================================================================

/** 없으면 `undefined`. 「없다」와 「읽다 실패했다」를 호출부가 구별하지 않아도 되게. */
export function readTextIfExists(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
}

/** JSON 파일 쓰기. 끝에 개행 하나 — 사람이 열어 고치고 git 이 diff 를 낸다. */
export function writeJsonFile(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

/**
 * 🔴 **본인만 읽을 수 있는 파일의 권한** (SPEC §8.2 「chmod 600」).
 * 숫자를 호출부에 적지 마라 — `credentials.json` 말고 다른 파일이 생겼을 때
 * 한쪽만 0600 이 되는 것이 정확히 이 상수가 막는 사고다.
 */
export const SECRET_FILE_MODE = 0o600

/**
 * 토큰이 든 파일을 쓴다. **만들 때부터** 0600 이고, 이미 있던 파일이면 다시 조인다.
 *
 * ★ 왜 `chmod` 를 주입받나 — Windows 는 POSIX 권한 비트를 저장하지 않아서
 *   `statSync().mode` 로는 **어느 플랫폼에서도 같은 것을 잴 수가 없다.**
 *   시험이 「무엇을 요구했나」를 잴 수 있어야 Windows 에서도 이 줄이 잠긴다
 *   (실제 비트는 리눅스 CI 가 `test/credentials.test.ts` 에서 잰다).
 */
export function writeSecretFile(
  path: string,
  text: string,
  chmod: (path: string, mode: number) => void = chmodSync,
): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text, { encoding: 'utf8', mode: SECRET_FILE_MODE })
  chmod(path, SECRET_FILE_MODE)
}
