---
name: sync
description: Apply the team's published context Pack to this repository (backup, atomic replace, re-verify).
disable-model-invocation: true
allowed-tools: Bash(node:*), Read
---

# 발행된 팀 컨텍스트를 이 저장소에 적용한다

> 🔴 **파일을 바꾸는 것은 이 Skill 이 부르는 `sync` 하나다.** 훅은 알리기만 한다.
> 그래서 바꾸기 **전에** 사용자에게 무엇이 바뀌는지 보여 주고 확인을 받는다.

## 1. 상태부터 본다 — **파일을 하나도 바꾸지 않는다**

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" sync --check
```

출력의 첫 낱말이 상태다:

| 상태 | 뜻 | 다음 |
|---|---|---|
| `applied` | 공식 버전이 그대로 적용돼 있다 | 할 일이 없다. 그렇게 말하고 끝낸다 |
| `outdated` | 새 버전이 나왔다 | 2단계로 |
| `modified` | **관리 파일이 손으로 바뀌어 있다** | 3단계로 (`✎` 로 표시된 경로를 그대로 보여 준다) |
| `unknown` | 아직 한 번도 받지 않았다 | 2단계로 |

- exit 30 이면 설정·토큰 문제다. `contextops setup` 을 안내하고 멈춘다.
- exit 20 이면 서버에 못 닿았다. 오프라인이라고 말하고 멈춘다 — 재시도를 반복하지 마라.

## 2. 무엇이 바뀌는지 보여 주고 확인을 받는다

`--check` 출력의 버전 둘(적용 / 공식)과 바뀔 파일 목록을 그대로 보여 준다.
**요약하지 말고** 경로를 나열해라 — 사용자가 자기 저장소에서 무엇이 바뀌는지
알아야 한다. 확인을 받은 뒤:

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" sync
```

- exit 0 → 적용됐다. 백업 위치(`.contextops/backups/<시각>-…`)를 알려 준다.
- exit 20 → 받은 바이트가 Manifest 의 sha256 과 달랐거나 서버에 못 닿았다.
  **이때 파일은 하나도 바뀌지 않았다.** 그대로 전한다.
- exit 1 → 3단계다.

## 3. `modified` — 손으로 바꾼 파일이 있다

먼저 **어느 파일이 바뀌었는지** 보여 주고, 그 변경을 잃어도 되는지 묻는다.

- 팀 규칙에 반영할 내용이라면 **먼저 `/contextops:propose`** 를 권한다 —
  덮어쓰면 그 사람의 판단이 사라진다.
- 사용자가 덮어쓰기로 결정했을 때만:

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" sync --force
```

⚠ `--force` 도 백업은 남긴다 (`.contextops/backups/`). 그 경로를 반드시 알려 줘라.

⛔ 사용자가 답하기 전에 `--force` 를 부르지 마라. 이 명령은 되돌리기가 백업뿐이다.
