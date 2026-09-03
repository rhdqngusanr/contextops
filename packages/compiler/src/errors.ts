// =====================================================================
//  컴파일 오류 — 정본은 docs/SPEC.md §4.1 1단계.
//  ★ 왜 클래스인가 — 발행 트랜잭션(SPEC §2.1)이 이걸 잡아서 롤백하고 사용자에게
//    「어느 항목이 왜 막았는지」를 보여 준다. 문자열만 던지면 그 화면을 못 만든다.
// =====================================================================

export type CompileIssue = { path: string; message: string }

export class CompileError extends Error {
  readonly code: 'INVALID_ITEM' | 'EMPTY_SNAPSHOT' | 'INVALID_INPUT'
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
