import { statSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { readCredentials, saveCredential } from '../src/cli/config'
import { SECRET_FILE_MODE } from '../src/cli/fsx'
import { credentialsFile } from '../src/cli/paths'
import { tempDir } from './helpers/cli'

// =====================================================================
//  `credentials.json` 은 **본인만 읽는다** (SPEC §8.2 「chmod 600」)
//
//  🔴 이 시험이 두 겹인 이유 — Windows 는 POSIX 권한 비트를 저장하지 않는다.
//    그래서 「실제 비트」만 재면 개발 기계(Windows)에서는 이 규칙이 **검사되지 않고**
//    초록이 된다. 그건 게이트가 눈을 가리는 모양이다.
//    ① 어느 플랫폼에서나: **0600 을 요구했는가** (chmod 호출을 잡아서 잰다)
//    ② POSIX 에서만: **실제 비트가 0600 인가** (리눅스 CI 가 이쪽을 돈다)
// =====================================================================

const TOKEN = 'ctx_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'
const PROJECT = '11111111-2222-4333-8444-555555555555'
const ORIGIN = 'https://contextops.example.com'

const dirs: { cleanup(): void }[] = []
afterEach(() => { while (dirs.length > 0) dirs.pop()?.cleanup() })

function home(): string {
  const dir = tempDir('contextops-home-')
  dirs.push(dir)
  return dir.path
}

describe('credentials.json', () => {
  it('0600 으로 조인다 — 어느 플랫폼에서나 요구는 같다', () => {
    const dir = home()
    const asked: { path: string; mode: number }[] = []

    saveCredential(dir, ORIGIN, PROJECT, { token: TOKEN }, (path, mode) => { asked.push({ path, mode }) })

    expect(asked).toHaveLength(1)
    expect(asked[0]?.mode).toBe(0o600)
    expect(asked[0]?.mode).toBe(SECRET_FILE_MODE)
  })

  it.runIf(process.platform !== 'win32')('POSIX 에서는 실제 비트가 0600 이다', () => {
    const dir = home()
    const path = saveCredential(dir, ORIGIN, PROJECT, { token: TOKEN })
    expect(statSync(path).mode & 0o777).toBe(0o600)
  })

  it('깨진 파일을 덮어쓰지 않는다 — 남의 토큰이 든 파일일 수 있다', () => {
    const dir = home()
    const path = credentialsFile(dir)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, '{ 이건 JSON 이 아니다', 'utf8')

    expect(() => saveCredential(dir, ORIGIN, PROJECT, { token: TOKEN })).toThrow(/credentials\.json/)
    expect(readCredentials(dir).state).toBe('invalid')
  })

  it('없으면 「없다」다 — 「깨졌다」와 다르다', () => {
    expect(readCredentials(home()).state).toBe('missing')
  })

  it('계약에 없는 토큰 모양은 저장하지 않는다', () => {
    expect(() => saveCredential(home(), ORIGIN, PROJECT, { token: 'not-a-token' })).toThrow()
  })
})
