---
name: progress
description: Report milestone progress for the work just finished — evidence is paths and line numbers only; no code leaves the machine. The Pack's workflow.md tells you when to run this.
disable-model-invocation: false
allowed-tools: Bash(node:*)
argument-hint: "--milestone <ID> --criterion \"<done_when>\" --evidence <path:start-end> --summary \"<한 줄>\""
---

# 마일스톤 진행을 보고한다

> 🔴 **부르는 것은 사람이 아니라 너(agent)다.** 팀 Pack 의 `.claude/rules/workflow.md` 「ContextOps 진행 보고」
> 문단이 「작업을 마칠 때 이 Skill 을 실행한다」고 가르친다. 이 Skill 은 CLI 의 `progress` 를 대신 불러 준다 —
> 플러그인 CLI 번들의 경로는 Bash 환경에 없어서 직접 칠 수 없다.
>
> 🔴 **P1** — 나가는 근거는 **경로와 줄 번호뿐**이다. 그 줄에 무엇이 적혀 있는지는 계약에 자리가 없다.
> 🔴 **P5** — 보고는 마일스톤에 붙는다. 누가 보고했는지로 사람을 줄 세우지 않는다.

## 1. 인자를 그대로 넘겨 실행한다

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" progress $ARGUMENTS
```

인자의 모양은 둘 중 하나다 (`workflow.md` 의 문단 그대로):

- 해당 있음: `--milestone <ID> --criterion "<done_when 문장>" --evidence <path:start-end> [--evidence ...] --summary "<한 줄>"`
- 해당 없음: `--milestone none --summary "<한 줄>"`

`<ID>` 는 Roadmap 의 마일스톤 id(예: `PL-M1`)이고 `<done_when 문장>` 은 그 마일스톤의 `done_when` 중 **글자 그대로** 하나다.
`--evidence` 는 이번 변경이 실제로 닿은 파일과 줄(`src/psp/client.ts:18-46`)이다 — 확인하지 않은 줄 번호를 적지 마라.

## 2. 종료 코드

| exit | 뜻 | 다음 |
|---|---|---|
| 0 | 보고됐다 — 출력 「보고했다 — <ID> · <status> · 근거 N건 · v<버전>」 | 그 한 줄을 사용자에게 그대로 보여 준다 |
| 2 | 계약 위반(마일스톤 id 모양 · 근거 경로 모양) | 출력의 오류 위치를 고쳐 **한 번만** 다시 |
| 64 | `--milestone` 또는 `--summary` 가 없다 | 둘을 채워 다시 (해당 없으면 `--milestone none`) |
| 30 | 이 저장소가 아직 이어지지 않았다 | `/contextops:setup` 을 안내하고 멈춘다 |
| 20 | 서버에 못 닿았다 | 한 번만 다시 시도하고, 안 되면 그렇게 말하고 멈춘다 — 보고는 다음 세션에 또 기회가 있다 |

⛔ 「끝난 것 같다」(`done_candidate`)를 스스로 붙이지 마라 — 완료는 사람이 웹에서 확인한다. 기본값(기준 하나를 마쳤으면
`criterion_done` · 아니면 `in_progress`)을 그대로 둔다.
