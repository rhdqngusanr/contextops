// =====================================================================
//  @contextops/compiler — 공개 API 는 이 파일 하나다.
//  ⚠ 다른 패키지가 `@contextops/compiler/src/assemble` 처럼 안쪽을 직접 import 하기
//    시작하면 리팩터링이 불가능해진다 (CLAUDE.md).
//
//  의존 방향: schema ← compiler ← web/plugin. **여기서 web 을 import 하지 마라.**
// =====================================================================
export { compile, type CompileResult, type PackFile } from './compile'
export { parseCompileInput, type CompileInput, type Snapshot } from './input'
export { CompileError, type CompileErrorCode, type CompileIssue } from './errors'
export { type SourceMapEntry, type Excluded } from './assemble'
export { CLAUDE_MD_MAX_CHARS, RULES_MAX_CHARS } from './limits'
export { manifestHash, normalizeText, sha256, snapshotHash } from './hash'
//  🔴 역추적 태그를 **되읽는** 문 (P7). 쓰는 함수(`traceTag`)와 같은 파일이라 형식이
//     두 곳으로 갈라지지 않는다.
//     ⚠ 브라우저(화면 7)는 이 index 가 아니라 `@contextops/compiler/tag` 로 들여온다 —
//       여기는 node:crypto 를 재수출한다. 이유는 package.json 의 `_comment_exports`.
export { parseTraceTag, srcKindOf, traceLines, type TraceTag } from './tag'
//  🔴 「이 scope 의 규칙은 Pack 의 어느 파일로 나오나」 (SPEC §4.1 partition 표).
//     ⚠ 관통이 이걸 들여오는 이유는 하나다 — 「데모가 scope 3종을 다 보여 주나」를
//       세려면 파일 이름이 필요한데, 그 이름을 검사 쪽에 적으면 표가 갈라진다.
export { scopePackPath } from './partition'
//  🔴 「이 정책을 무엇이 강제하나」의 **말 정본** (`enforcement` 4종 · SPEC §3).
//     ⚠ 이 문자열들을 밖에 **복사하지 마라.** 관통이 이걸 들여오는 이유는 하나다 —
//       「데모 Pack 이 표의 몇 갈래를 실제로 보여 주나」를 세려면 네 갈래의 말을
//       알아야 하는데, 그 말을 검사 쪽에 다시 적으면 표가 두 곳으로 갈라진다.
export { ENFORCEMENT_LABEL } from './sections'
export { COMPILER_VERSION } from './version'
export { TEMPLATE_VERSION } from '../templates'
//  🔴 Pack 이 agent 에게 가르치는 **CLI 사용법** (SPEC §4.3). 플러그인 쪽 시험이
//     「여기 적힌 플래그를 CLI 가 실제로 받는가」를 잰다 — 갈리면 팀 전체의 진행
//     보고가 **조용히** 멈춘다 (실패를 보는 사람이 아무도 없다).
export { PROGRESS_REPORT } from '../templates/progress-report'
