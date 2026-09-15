---
name: init
description: Draft team context items from this repository (local analysis; only structured JSON is uploaded).
disable-model-invocation: true
allowed-tools: Bash(node:*), Read, Glob, Grep
---

# 이 저장소에서 팀 컨텍스트 초안을 만든다

> 🔴 **올라가는 것은 구조화된 JSON 뿐이다. 코드 본문은 한 줄도 올라가지 않는다.**
> 계약에 그 자리가 없다 (`schemas/context-item-draft.json`). 5단계에서 사용자에게
> 무엇이 나가는지 **그대로** 보여 주고 확인을 받는다.

## 0. 이어져 있는지 먼저 본다

`.contextops/project.json` 이 있는지 본다 (`setup` 이 만드는 파일이다). **없으면** 이 저장소는 아직
이어지지 않았다 → `/contextops:setup` 을 안내하고 멈춘다. `scan`·`validate` 는 setup 없이도 돌아서,
여기서 안 보면 초안을 다 쓰고 5단계에서야 막힌다.

- 파일이 있어도 이 기기에 토큰이 없으면 5단계가 exit 30 으로 알려 준다.
- ⛔ `~/.contextops/credentials.json` 은 열지 마라 — 토큰이 들어 있다.

## 1. 저장소를 훑는다

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" scan
```

`.contextops/cache/scan.json` 이 생긴다. 그 파일을 읽어라 — 파일 목록·언어·엔트리·
인프라 파일·**env 키 이름**(값이 아니다)·의존성·제외 목록이 있다.

- exit 30 이면 스캔 결과가 계약과 맞지 않았다 (`스캔이 계약과 맞지 않는 결과를 냈다 — …`). 출력 그대로 보여 주고 멈춘다.

## 2. 읽을 파일을 고른다 — **최대 15개**

`scan.json` 의 `files` 에서 entrypoints·infra·의존성 매니페스트·docs 후보를 고른다.

- ⛔ **읽지 마라**: `.env*` · `*secret*` · `*.pem` · `node_modules` · `dist`
  (스캐너가 이미 목록에서 뺐다 — 목록에 없는 것을 굳이 찾아 읽지 마라)
- 15개를 넘기지 마라. 넘기면 초안이 저장소 요약이 되고, 팀 규칙이 아니게 된다.

## 3. 초안을 쓴다

`${CLAUDE_PLUGIN_ROOT}/schemas/context-item-draft.json` 이 **작성 안내서**다
(판정은 4단계의 `validate` 가 한다). `architecture` · `domain` · `constraint` ·
`open_question` 항목을 만들어 `.contextops/cache/draft.json` 에 저장한다:

```json
{ "items": [ { "id": "item_...", "type": "architecture", "...": "..." } ] }
```

🔴 **규칙 넷**:

1. **코드에서 확인한 사실만** 적는다.
2. 항목마다 `repository_path` 근거가 **하나 이상** 있어야 한다 (`{"kind":"repository_path","repo":"<scan.json 의 repo>","path":"...","start_line":N}`).
3. **이유·계획·정책을 지어내지 마라.** 코드만 보고는 알 수 없다 — `open_question` 으로 적어라.
4. `repo` · `scan_summary` 는 **적지 않는다.** `upload-draft` 가 `scan.json` 에서 붙인다
   (그래야 스캔 결과를 모델이 고칠 수 없다).

## 4. 계약과 맞는지 판다

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" validate .contextops/cache/draft.json
```

- exit 0 → 5단계로
- exit 2 → 출력된 **오류 위치**를 고쳐 **한 번만** 다시 시도한다. 두 번째도 실패하면
  무엇이 막혔는지 사용자에게 보여 주고 멈춘다 (계속 고치면 사실이 아닌 초안이 된다).

## 5. 무엇이 나가는지 보여 주고 **명시적 확인**을 받는다

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" upload-draft --dry-run
```

이 출력이 **실제로 보낼 payload 에서 뽑은 것**이다 — 항목 수·항목 id·근거 경로 수·
「코드 본문 0건」. 요약하지 말고 그대로 보여 준 뒤 사용자에게 물어라.

- exit 30 → 출력 문장대로다. 설정 파일이나 이 기기의 토큰이 없으면(`/contextops:setup` 을 실행하라는 문장) setup 을
  안내하고 멈춘다. `초안 이 없다` 면 3단계로, `스캔 결과 이 없다` 면 1단계로 돌아간다.
- exit 2 → 출력이 가리키는 파일을 본다. `scan.json` 이면 손으로 고치지 말고 1단계(`scan`)부터 다시, 초안이면 4단계부터 다시.

⛔ 확인 없이 6단계로 가지 마라.

## 6. 올린다

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs" upload-draft
```

- exit 0 → 받아들여진 항목 수와 「웹의 어디서 보나」 줄(주소 · 「Context」 탭)을 그대로 보여 준다.
  ⚠ 화면 주소를 지어서 붙이지 마라 — CLI 는 uuid 만 알고 웹 주소는 slug 라, 지은 주소는 404 다.
- exit 2 → 항목별 거절 사유가 나온다. 고쳐서 4단계부터 다시.
- exit 20 → 네트워크다. 잠시 뒤 6단계만 다시 하면 된다 (초안은 그대로 있다).
- exit 30 → 토큰·설정 문제다. `/contextops:setup` 을 안내한다.

마지막으로 **웹에서 검토·발행이 필요하다**는 것을 알린다 — 초안은 아직 팀 규칙이 아니다.
