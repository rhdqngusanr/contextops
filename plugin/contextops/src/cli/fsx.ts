import { createHash } from 'node:crypto'
import { chmodSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

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

// =====================================================================
//  아래는 `sync` 가 쓰는 자리 — **파일을 바꾸는 절차는 여기 하나다** (SPEC §8.5)
//
//  ★ 왜 여기 모으나 — 「같은 볼륨 temp → rename」과 「쓰기 전에 backup」이 명령마다
//    적히면 한 곳이 반드시 부분 쓰기를 남긴다. 부분 쓰기는 **읽을 수는 있는 CLAUDE.md**
//    라서 아무 증상 없이 팀에 퍼진다.
// =====================================================================

/** 파일 내용의 sha256. 없으면 `undefined` — 「없다」와 「비었다」는 다르다. */
export function sha256OfFile(path: string): string | undefined {
  const text = readTextIfExists(path)
  return text === undefined ? undefined : sha256OfText(text)
}

/**
 * 🔴 **Manifest 의 sha256 과 같은 방식으로 잰다** — 컴파일러가 UTF-8 바이트로 재므로
 * 여기서도 바이트로 잰다. `readFileSync(path,'utf8')` 로 읽은 문자열을 다시 utf8 로
 * 인코딩하는 것이라 왕복이 안전하다 (BOM·CRLF 는 Pack 에 없다).
 */
export function sha256OfText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * 같은 폴더의 temp 로 쓴 뒤 `rename` 으로 바꿔치기한다.
 *
 * ★ 왜 같은 폴더인가 — `rename` 이 atomic 인 것은 **같은 볼륨 안**에서다.
 *   `os.tmpdir()` 에 썼다가 옮기면 Windows·도커에서 볼륨을 넘어 복사가 되고,
 *   그러면 중간에 죽었을 때 반쯤 쓰인 파일이 남는다 (SPEC §8.5 6단계).
 * ⚠ temp 이름에 pid 를 넣지 않는다 — 같은 파일을 두 sync 가 동시에 쓰는 상황은
 *   backup 이 갈려서 어차피 못 구한다. 이름이 고정이면 죽은 뒤 남은 찌꺼기를 덮어쓴다.
 */
export function atomicWriteFile(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.contextops-tmp`
  writeFileSync(temp, text, 'utf8')
  renameSync(temp, path)
}

/**
 * 심볼릭 링크로 저장소 밖을 가리키는 자리인가 (SPEC §8.5 6단계 「심볼릭 링크 거부」).
 * 최종 경로뿐 아니라 **중간 폴더도** 본다 — `.claude` 가 링크면 그 아래 전부가 밖이다.
 */
export function hasSymlink(root: string, relative: string): boolean {
  const parts = relative.split('/')
  let at = root
  for (const part of parts) {
    at = join(at, part)
    try {
      if (lstatSync(at).isSymbolicLink()) return true
    } catch {
      //  없는 자리는 링크가 아니다 — 새로 만들 파일이다.
      return false
    }
  }
  return false
}
