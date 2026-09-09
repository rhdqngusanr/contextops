// =====================================================================
//  workflow.md 에 **항상** 들어가는 고정 텍스트 — 정본은 docs/SPEC.md §4.3.
//
//  ★ 왜 파일이 따로인가 — 이 문단만 성격이 다르다. 팀 항목에서 온 것이 아니라
//    **제품이 넣는 사용법**이고, CLI 인자가 바뀌면 여기만 고친다 (SPEC §8.3).
//  ⚠ 이 문단이 Pack 에서 빠지면 agent 가 진행 보고를 안 한다 — Roadmap 이 멈춘다.
//
//  🔴 2026-09-09 (INBOX 블로커 4 · TEMPLATE_VERSION 1.6): 명령이 `node "$CLAUDE_PLUGIN_ROOT/…"` 에서
//     **`/contextops:progress` Skill** 로 바뀌었다. 그 변수는 사용자 저장소의 Bash 환경에 없다 —
//     Claude Code 는 `${CLAUDE_PLUGIN_ROOT}` 를 **플러그인 Skill 본문 안에서만** 치환한다. 그래서
//     경로를 아는 자리는 Skill(`plugin/contextops/skills/progress/SKILL.md`) 하나이고, Pack 은 그 Skill 의
//     이름과 인자만 가르친다. 인자 표는 그대로다 — `test/progress.test.ts` 가 CLI 플래그 표와 대조한다.
// =====================================================================

/** 이 문단이 지목하는 마일스톤은 Roadmap 항목들이다 — 그래서 workflow.md 의 근거가 된다. */
export const PROGRESS_REPORT: readonly string[] = [
  '## ContextOps 진행 보고 (필수)',
  '작업을 마칠 때 이번 변경이 Roadmap 의 어느 마일스톤 done_when 에 해당하는지 판단하고 아래 Skill 을 실행한다. 코드 본문은 전송되지 않는다.',
  '- 해당 있음: `/contextops:progress --milestone <ID> --criterion "<done_when 문장>" --evidence <path:start-end> [--evidence ...] --summary "<한 줄>"`',
  '- 해당 없음: `/contextops:progress --milestone none --summary "<한 줄>"`',
  '- 팀 정책·아키텍처·용어에 영향을 주는 변경이면 사용자에게 `/contextops:propose` 실행을 권한다. 직접 실행하지 않는다.',
]
