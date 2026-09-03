// =====================================================================
//  명령이 바깥 세상과 만나는 곳 (stdout · stdin · 브라우저 · 네트워크)
//
//  ★ 왜 인자로 받나 — 이 넷을 명령 안에서 직접 부르면 시험이 **프로세스를 띄워야만**
//    돈다. 그러면 「토큰이 401 이면 exit 10」 같은 갈래를 잴 수가 없다 (서버가 없다).
//    사용자는 둘이다: 진짜 프로세스(`main.ts`)와 시험(`test/helpers/cli.ts`).
//    ⚠ 여기에 편의 함수를 늘리지 마라 — 늘리면 시험이 세상을 흉내 내게 된다.
// =====================================================================

export type Io = {
  /** 사람이 읽는 줄. 개행은 여기서 붙인다. */
  out(line: string): void
  /** 진단·오류. **파이프로 넘길 값은 여기 적지 마라.** */
  err(line: string): void
  /**
   * 한 줄 물어본다. **입력이 사람이 아니면 `undefined`** 를 돌려준다.
   * ★ 왜 — 무인 실행(훅·CI)에서 `setup` 이 영원히 기다리면 세션이 통째로 멈춘다.
   *   못 물어보면 「무엇을 넘겨야 하는지」를 알려 주고 끝나는 것이 낫다.
   */
  ask(question: string): Promise<string | undefined>
}

export type Cli = {
  /** 명령을 부른 자리. `--dir` 이 없으면 이게 저장소 루트다. */
  cwd: string
  /** `~` — `credentials.json` 이 사는 곳. */
  home: string
  env: Record<string, string | undefined>
  io: Io
  fetch: typeof globalThis.fetch
  /** 기본 브라우저로 연다. 열지 못해도 던지지 않는다 — 주소는 이미 출력했다. */
  openUrl(url: string): void
}
