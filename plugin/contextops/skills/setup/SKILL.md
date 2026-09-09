---
name: setup
description: Connect this repository to a ContextOps project using the one-line command copied from the web's Sync screen (token stays outside the repo).
disable-model-invocation: true
allowed-tools: Bash(node:*)
argument-hint: "--api-origin <url> --project <uuid> --token ctx_… --device-id <uuid>"
---

# 이 저장소를 ContextOps 프로젝트에 잇는다

> 🔴 **이 Skill 이 하는 일은 CLI 의 `setup` 을 대신 불러 주는 것 하나다.** 플러그인의 CLI 번들은
> 플러그인 설치 폴더의 `bin/` 아래에 있는데, 그 경로는 사용자의 터미널에 없다 —
> 그래서 사람은 웹이 준 한 줄을 **Claude Code 에** 붙여 넣고, 이 Skill 이 경로를 채워 실행한다.
>
> ⚠ 인자에 기기 토큰(`ctx_…`)이 들어 있다. **토큰을 되풀이해 말하지 마라** — 출력에서도 요약에서도.
> 계약상 토큰은 `~/.contextops/credentials.json`(저장소 밖) 에만 저장된다.

## 1. 인자를 그대로 넘겨 실행한다

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" setup $ARGUMENTS --no-browser
```

인자가 비어 있으면 실행하지 말고 이렇게 안내한다: 웹의 **Sync 화면 → [기기 추가]** 가 발급하는 한 줄
(`/contextops:setup --api-origin … --project … --token … --device-id …`)을 그대로 붙여 넣으라고.
`--no-browser` 는 이 Skill 이 늘 붙인다 — 사람은 이미 웹에 있다.

## 2. 종료 코드로 갈래를 탄다

| exit | 뜻 | 다음 |
|---|---|---|
| 0 | 이어졌다 — `.contextops/project.json`(커밋됨 · secret 없음) 과 `~/.contextops/credentials.json`(저장소 밖) 이 생겼다 | 출력의 두 경로를 그대로 보여 주고 **`/contextops:init`** 을 권한다 (첫 항목을 올리는 Skill) |
| 10 | 토큰이 없거나 모양이 아니거나 서버가 거절했다(만료·취소) | 웹에서 **다시 발급**받아 새 한 줄로 다시 붙여 넣으라고 한다 |
| 30 | 서버 주소나 프로젝트 uuid 가 없거나 잘못됐다 | 한 줄을 통째로 복사했는지 확인하라고 한다 — 손으로 옮기면 uuid 가 잘린다 |
| 20 | 서버에 닿지 못했다 | 주소와 네트워크를 확인하고 같은 줄로 다시 |
| 64 | 모르는 플래그 | 웹이 준 줄이 아니다 — 다시 복사 |

⛔ 실패 출력에 토큰이 섞여 있으면 그 줄은 옮기지 않는다. 종료 코드와 CLI 의 안내 문장만 전한다.
