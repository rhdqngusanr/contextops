import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { LOCAL_DIR, LOCAL_FILES } from '../../src/cli/paths'
import { PROJECT } from './pack'
import { tempDir } from './cli'

// =====================================================================
//  「이어진 저장소」 하나를 만드는 자리
//
//  ★ 왜 모았나 — 명령이 여덟이 되면서 `project.json` + `credentials.json` 을 놓는
//    코드가 시험 파일마다 생겼다. 경로 규칙이 바뀌는 날 한 곳만 고쳐지면, 안 고쳐진
//    시험은 **없는 설정으로 「연결 안 됨」 경로를 재면서 초록**이 된다.
// =====================================================================

export const ORIGIN = 'https://contextops.example.com'
export const TOKEN = 'ctx_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export function repoPath(root: string, which: keyof typeof LOCAL_FILES): string {
  return join(root, ...LOCAL_FILES[which].split('/'))
}

/** 임시 저장소와 임시 홈. `dirs` 에 담아 `afterEach` 에서 지운다. */
export function world(dirs: { cleanup(): void }[]): { repo: string; home: string } {
  const repo = tempDir('contextops-repo-')
  const home = tempDir('contextops-home-')
  dirs.push(repo, home)
  return { repo: repo.path, home: home.path }
}

/** setup 을 마친 저장소로 만든다 (설정 + 토큰). */
export function connect(repo: string, home: string, origin = ORIGIN): void {
  writeJson(repoPath(repo, 'project'), { api_origin: origin, project_id: PROJECT })
  writeJson(join(home, LOCAL_DIR, 'credentials.json'), { [origin]: { [PROJECT]: { token: TOKEN } } })
}
