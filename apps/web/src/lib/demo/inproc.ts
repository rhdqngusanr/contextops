// =====================================================================
//  라우트를 **프로세스 안에서** 부르는 문 하나 (SPEC §9 「게스트 데모」 · §10.3)
//
//  ★ 왜 제품 코드에 있나 — 데모 테넌트를 심는 것은 **라우트를 부르는 클라이언트**다.
//    화면·플러그인이 HTTP 로 부르는 그 핸들러를, 시드는 같은 프로세스에서 표준 `Request`
//    로 부른다. 핸들러 안의 로직을 베껴 DB 에 직접 넣으면 심어진 데모가 **제품이 만드는
//    것과 다른 모양**이 되고, 그 차이는 화면에서 안 보인다 (계약·트랜잭션·역추적을 다
//    건너뛴다).
//
//  ★ 원래 `test/helpers/db.ts` 에 있었다. 시드가 제품 코드(Cron 이 부르는 리셋 문)로
//    올라오면서 **둘째 사용자**가 생겨 여기로 올렸다 — 시험은 여기 것을 다시 내보낸다.
//    ⚠ 같은 함수를 `test/` 에 다시 적지 마라. 요청의 모양이 두 곳에서 갈리면 시험이 부르는
//      라우트와 시드가 부르는 라우트가 다른 요청을 받는다.
//
//  ⚠ 여기엔 DB 도 인증도 없다 — **요청과 응답의 모양**만이다.
// =====================================================================

/** 프로세스 안에서 부를 때의 origin. 라우트는 경로만 읽는다 — 값 자체는 뜻이 없다. */
const INPROC_ORIGIN = 'http://localhost:3000'

/**
 * 라우트가 받는 것과 같은 표준 `Request` 를 만든다.
 * `headers` 는 ETag 조건부 요청(`if-none-match`) 때문에 있다 — SPEC §5 packs 세 줄이
 * 304 를 약속하고, 그건 머리를 보내 봐야만 잴 수 있다.
 */
export function req(
  method: string,
  path: string,
  opts: { auth?: string; body?: unknown; raw?: string; headers?: Record<string, string> } = {},
): Request {
  const headers: Record<string, string> = { ...opts.headers }
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`
  const hasBody = opts.body !== undefined || opts.raw !== undefined
  if (hasBody) headers['content-type'] = 'application/json'
  return new Request(`${INPROC_ORIGIN}${path}`, {
    method,
    headers,
    body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  })
}

/**
 * Next 15 의 Route Handler 두 번째 인자.
 * ⚠ 값이 `string | string[]` 인 이유 — catch-all 구간(`[...path]`)은 배열로 온다
 *   (`src/lib/api/route.ts` 의 같은 주석). `string` 으로만 잡으면 그 라우트를 부를 수
 *   없고, 그때 `as any` 로 뚫게 된다.
 */
export function params<P extends Record<string, string | string[]>>(value: P): { params: Promise<P> } {
  return { params: Promise.resolve(value) }
}

export async function bodyOf(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

/**
 * 성공 응답의 `data` 를 꺼낸다 — 봉투 모양(`{data, meta}`)도 같이 확인한다.
 * ⚠ 실패 봉투면 **코드와 문구를 실어 던진다.** 시드가 어느 라우트에서 왜 막혔는지가
 *   리셋 로그에 남아야 한다 — 「성공 봉투가 아니다」만으로는 다음 사람이 못 찾는다.
 */
export async function dataOf(res: Response): Promise<Record<string, unknown>> {
  const json = await bodyOf(res)
  if (!('data' in json)) {
    const error = json.error as { code?: string; message?: string } | undefined
    throw new Error(error?.code
      ? `${res.status} ${error.code}: ${error.message ?? ''}`
      : `성공 봉투가 아니다: ${JSON.stringify(json)}`)
  }
  const meta = json.meta as { request_id?: string } | undefined
  if (!meta?.request_id) throw new Error('meta.request_id 가 없다')
  return json.data as Record<string, unknown>
}
