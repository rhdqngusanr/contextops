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
  /** 나간 요청 전부. 헤더(`if-none-match`)와 body 까지 잰다. */
  sent: SentRequest[]
}

export type SentRequest = {
  url: string
  method: string
  headers: Record<string, string>
  body: string | undefined
}

export type FakeResponse =
  | { status: number; body: unknown; headers?: Record<string, string> }
  /** 봉투가 아닌 본문 (Pack 파일). **바이트를 그대로** 돌려준다. */
  | { status: number; text: string }
  | { throws: string }

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
  const sent: SentRequest[] = []
  const answers = [...(options.answers ?? [])]
  const responses = [...(options.responses ?? [])]

  const io: Io = {
    out: (line) => { out.push(line) },
    err: (line) => { err.push(line) },
    ask: async () => answers.shift(),
  }

  const fetchStub = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push(String(input))
    sent.push({
      url: String(input),
      method: (init?.method ?? 'GET').toUpperCase(),
      headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>)
        .map(([k, v]) => [k.toLowerCase(), v])),
      body: typeof init?.body === 'string' ? init.body : undefined,
    })
    const next = responses.shift()
    if (next === undefined) throw new Error(`예상하지 못한 요청이다: ${String(input)}`)
    if ('throws' in next) throw new Error(next.throws)
    if ('text' in next) {
      return new Response(next.text, { status: next.status, headers: { 'content-type': 'text/plain' } })
    }
    //  ⚠ 304 는 본문을 가질 수 없다 (fetch 규약). `null` 로 만들어야 진짜와 같이 군다.
    const body = next.status === 304 ? null : JSON.stringify(next.body)
    return new Response(body, {
      status: next.status,
      headers: { 'content-type': 'application/json', ...(next.headers ?? {}) },
    })
  }

  return {
    cwd: options.cwd,
    home: options.home,
    env: options.env ?? {},
    io,
    fetch: fetchStub as unknown as typeof globalThis.fetch,
    openUrl: (url) => { opened.push(url) },
    out, err, opened, requests, sent,
  }
}

/** 성공 봉투. 라우트가 내는 모양 그대로다 (SPEC §5). */
export const okEnvelope = (data: unknown, headers?: Record<string, string>): FakeResponse =>
  ({ status: 200, body: { data, meta: { request_id: '00000000-0000-4000-8000-000000000000' } }, ...(headers ? { headers } : {}) })

/** `If-None-Match` 가 맞았다 — **본문이 없다.** sync 의 정상 경로다. */
export const notModified = (): FakeResponse => ({ status: 304, body: null })

/** Pack 파일 본문. 봉투가 아니다 (SPEC §5 「text/plain」). */
export const textBody = (text: string): FakeResponse => ({ status: 200, text })

/** 실패 봉투. `code` 로 갈래를 잰다. */
export const failEnvelope = (status: number, code: string, message = '안 된다'): FakeResponse =>
  ({ status, body: { error: { code, message, request_id: '00000000-0000-4000-8000-000000000000' } } })
