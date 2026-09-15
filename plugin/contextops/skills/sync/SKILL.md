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
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" sync --check
```

출력의 첫 낱말이 상태다:

| 상태 | 뜻 | 다음 |
|---|---|---|
| `applied` | 공식 버전이 그대로 적용돼 있다 | 할 일이 없다. 그렇게 말하고 끝낸다 |
| `outdated` | 새 버전이 나왔다 | 2단계로 |
| `modified` | **관리 파일이 손으로 바뀌었거나 없어졌다** (exit 1 — 실패가 아니다) | 3단계로 (`✎`(바뀜)·`✗`(없음) 으로 표시된 경로를 그대로 보여 준다) |
| `manual` | 파일은 그 버전과 맞지만 `sync` 가 아니라 손으로 놓였다 (zip) | 줄 끝이 「공식 v… 이 나왔다」면 2단계로. 「최신이다」면 바뀔 내용이 없다고 말한다 — 사용자가 원하면 2단계의 `sync` 로 한 번 받아 두면 그 뒤로 `applied` 가 된다 |
| `unknown` | 아직 한 번도 받지 않았다 | 2단계로 |

- **서버에 못 닿아도 exit 0 이다.** 먼저 `서버에 닿지 못했다 — …` 줄이 나오고, 상태 줄은 로컬만 보고 판정해
  끝에 `(서버에 못 닿아 최신 여부는 모른다)` 나 `(서버에도 못 닿았다)` 가 붙는다 (`modified` 여도 0 이다).
  이 줄들이 보이면 오프라인이라고 말하고, 상태 줄과 `✎`·`✗` 줄을 그대로 보여 준 뒤 멈춘다 — 재시도를 반복하지 마라.
- exit 30 이면 출력 문장을 그대로 전하고 멈춘다. 그 문장이 `/contextops:setup` 을 실행하라고 하면(설정 파일·토큰이
  없거나 토큰이 거절됐다) setup 을 안내하고, `서버에 그런 것이 없다` 면 아직 발행된 버전이 없다는 뜻이니 웹에서
  첫 버전을 발행하라고 말한다.
- exit 20 이면 서버가 답은 했지만 받을 수 없는 응답이었다 (서버 오류 · 계약과 다른 Manifest). 출력 그대로 전하고
  멈춘다 — 재시도를 반복하지 마라.

## 2. 무엇이 바뀌는지 보여 주고 확인을 받는다

`--check` 의 상태 줄(적용 버전 → 공식 버전)을 **그대로** 보여 준다. `--check` 는 바뀔 파일 목록을 내지 않는다 —
`sync` 가 쓸 수 있는 파일은 Pack 이 관리하는 것뿐이고(`CLAUDE.md` · `AGENTS.md` · `.claude/rules/*.md` ·
`.cursor/rules/*.mdc`), 실제로 바꾼 경로는 적용 뒤 `✓` 줄로 나온다. 그 사실을 말하고 확인을 받은 뒤:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" sync
```

- exit 0 → 적용됐다. `✓` 로 나온 경로를 **요약하지 말고** 전부 보여 주고, 백업 위치(`.contextops/backups/<시각>-…`)를 알려 준다.
- exit 20 → 받은 바이트가 Manifest 의 sha256 과 달랐거나 서버에 못 닿았다.
  **이때 파일은 하나도 바뀌지 않았다.** 그대로 전한다.
- exit 1 → 3단계다. 첫 sync 가 저장소에 **이미 있던** 파일(우리가 놓지 않은 `CLAUDE.md` 등)을 덮으려 할 때도 1 이다 —
  출력된 경로를 그대로 보여 주고 3단계처럼 묻는다.

## 3. `modified` — 손으로 바꾼 파일이 있다

먼저 **어느 파일이 바뀌었는지** 보여 주고, 그 변경을 잃어도 되는지 묻는다.

- 팀 규칙에 반영할 내용이라면 **먼저 `/contextops:propose`** 를 권한다 —
  덮어쓰면 그 사람의 판단이 사라진다.
- 사용자가 덮어쓰기로 결정했을 때만:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" sync --force
```

⚠ `--force` 도 백업은 남긴다 (`.contextops/backups/`). 그 경로를 반드시 알려 줘라.

⛔ 사용자가 답하기 전에 `--force` 를 부르지 마라. 이 명령은 되돌리기가 백업뿐이다.
