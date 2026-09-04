// =====================================================================
//  컴파일 오류 — 정본은 docs/SPEC.md §4.1 1단계.
//  ★ 왜 클래스인가 — 발행 트랜잭션(SPEC §2.1)이 이걸 잡아서 롤백하고 사용자에게
//    「어느 항목이 왜 막았는지」를 보여 준다. 문자열만 던지면 그 화면을 못 만든다.
// =====================================================================

export type CompileIssue = { path: string; message: string }

/**
 * 🔴 **컴파일 실패 종류의 정본 목록.**
 *
 * ★ 왜 따로 이름을 두나 — 부르는 쪽(`apps/web` 의 발행 트랜잭션)이 이 셋을 **빠짐없이**
 *   HTTP 상태로 옮겨야 한다. 유니온이 클래스 안에만 있으면 `Record<...>` 로 못 받고,
 *   넷째가 생겼을 때 기계가 아무 말도 안 한다 — 새 종류가 조용히 500 이 된다.
 * ★ 여기 한 줄을 더하는 절차: ① 이 목록에 값 추가 ② `apps/web/src/lib/api/publish.ts`
 *   의 `COMPILE_ERROR_FAULT` 표에 한 줄 (①만 하면 거기서 타입 검사가 막힌다).
 */
export type CompileErrorCode = 'INVALID_ITEM' | 'EMPTY_SNAPSHOT' | 'INVALID_INPUT'

export class CompileError extends Error {
  readonly code: CompileErrorCode
  readonly item_id: string | undefined
  readonly issues: readonly CompileIssue[]

  constructor(code: CompileError['code'], message: string, opts?: { item_id?: string; issues?: readonly CompileIssue[] }) {
    super(message)
    this.name = 'CompileError'
    this.code = code
    this.item_id = opts?.item_id
    this.issues = opts?.issues ?? []
  }
}
