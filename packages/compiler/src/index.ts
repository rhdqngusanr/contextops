// =====================================================================
//  @contextops/compiler — 공개 API 는 이 파일 하나다.
//  ⚠ 다른 패키지가 `@contextops/compiler/src/assemble` 처럼 안쪽을 직접 import 하기
//    시작하면 리팩터링이 불가능해진다 (CLAUDE.md).
//
//  의존 방향: schema ← compiler ← web/plugin. **여기서 web 을 import 하지 마라.**
// =====================================================================
export { compile, type CompileResult, type PackFile } from './compile'
export { parseCompileInput, type CompileInput, type Snapshot } from './input'
export { CompileError, type CompileIssue } from './errors'
export { type SourceMapEntry, type Excluded } from './assemble'
export { CLAUDE_MD_MAX_CHARS, RULES_MAX_CHARS } from './limits'
export { manifestHash, normalizeText, sha256, snapshotHash } from './hash'
export { TEMPLATE_VERSION } from '../templates'
