import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Cli, Io } from '../../src/cli/cli'

// =====================================================================
//  시험용 세상 — 진짜 프로세스를 띄우지 않고 명령을 부른다
//
//  ★ 왜 있나 — 「토큰이 401 이면 exit 10」 같은 갈래는 서버 없이는 못 재고,
//    프로세스를 띄우면 stdout 문자열만 보게 된다. `Cli` 를 손으로 만들면
//    **명령의 반환값(종료 코드)** 을 그대로 잴 수 있다.
// =====================================================================

export type FakeCli = Cli & {
  out: string[]
  err: string[]
  opened: string[]
  /** 실제로 요청이 나간 URL 들. 「안 불렀다」도 잴 수 있어야 한다. */
  requests: string[]
}

export type FakeResponse = { status: number; body: unknown } | { throws: string }

/** 임시 폴더 하나. `afterEach` 에서 `cleanup()` 을 부른다. */
export function tempDir(prefix = 'contextops-'): { path: string; cleanup(): void } {
  const path = mkdtempSync(join(tmpdir(), prefix))
  return { path, cleanup: () => rmSync(path, { recursive: true, force: true }) }
}

export function fakeCli(options: {
  cwd: string
  home: string
  env?: Record<string, string | undefined>
  /** 물어보면 이 줄들을 차례로 준다. 비면 「사람이 없다」(undefined). */
  answers?: string[]
  responses?: FakeResponse[]
}): FakeCli {
  const out: string[] = []
  const err: string[] = []
  const opened: string[] = []
  const requests: string[] = []
  const answers = [...(options.answers ?? [])]
  const responses = [...(options.responses ?? [])]

  const io: Io = {
    out: (line) => { out.push(line) },
    err: (line) => { err.push(line) },
    ask: async () => answers.shift(),
  }

  const fetchStub = async (input: string | URL | Request): Promise<Response> => {
    requests.push(String(input))
    const next = responses.shift()
    if (next === undefined) throw new Error(`예상하지 못한 요청이다: ${String(input)}`)
    if ('throws' in next) throw new Error(next.throws)
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { 'content-type': 'application/json' },
    })
  }

  return {
    cwd: options.cwd,
    home: options.home,
    env: options.env ?? {},
    io,
    fetch: fetchStub as unknown as typeof globalThis.fetch,
    openUrl: (url) => { opened.push(url) },
    out, err, opened, requests,
  }
}

/** 성공 봉투. 라우트가 내는 모양 그대로다 (SPEC §5). */
export const okEnvelope = (data: unknown): FakeResponse =>
  ({ status: 200, body: { data, meta: { request_id: '00000000-0000-4000-8000-000000000000' } } })

/** 실패 봉투. `code` 로 갈래를 잰다. */
export const failEnvelope = (status: number, code: string, message = '안 된다'): FakeResponse =>
  ({ status, body: { error: { code, message, request_id: '00000000-0000-4000-8000-000000000000' } } })
