// =====================================================================
//  workflow.md 에 **항상** 들어가는 고정 텍스트 — 정본은 docs/SPEC.md §4.3.
//
//  ★ 왜 파일이 따로인가 — 이 문단만 성격이 다르다. 팀 항목에서 온 것이 아니라
//    **제품이 넣는 사용법**이고, CLI 인자가 바뀌면 여기만 고친다 (SPEC §8.3).
//  ⚠ 이 문단이 Pack 에서 빠지면 agent 가 진행 보고를 안 한다 — Roadmap 이 멈춘다.
// =====================================================================

/** 이 문단이 지목하는 마일스톤은 Roadmap 항목들이다 — 그래서 workflow.md 의 근거가 된다. */
export const PROGRESS_REPORT: readonly string[] = [
  '## ContextOps 진행 보고 (필수)',
  '작업을 마칠 때 이번 변경이 Roadmap 의 어느 마일스톤 done_when 에 해당하는지 판단하고 아래를 실행한다. 코드 본문은 전송되지 않는다.',
  '- 해당 있음: `node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" progress --milestone <ID> --criterion "<done_when 문장>" --evidence <path:start-end> [--evidence ...] --summary "<한 줄>"`',
  '- 해당 없음: `... progress --milestone none --summary "<한 줄>"`',
  '- 팀 정책·아키텍처·용어에 영향을 주는 변경이면 사용자에게 `/contextops:propose` 실행을 권한다. 직접 실행하지 않는다.',
]
