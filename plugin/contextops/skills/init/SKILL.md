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

## 1. 저장소를 훑는다

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" scan
```

`.contextops/cache/scan.json` 이 생긴다. 그 파일을 읽어라 — 파일 목록·언어·엔트리·
인프라 파일·**env 키 이름**(값이 아니다)·의존성·제외 목록이 있다.

- exit 30 이면 이 저장소는 아직 이어지지 않았다 → `contextops setup` 을 안내하고 멈춘다.

## 2. 읽을 파일을 고른다 — **최대 15개**

`scan.json` 의 `files` 에서 entrypoints·infra·의존성 매니페스트·docs 후보를 고른다.

- ⛔ **읽지 마라**: `.env*` · `*secret*` · `*.pem` · `node_modules` · `dist`
  (스캐너가 이미 목록에서 뺐다 — 목록에 없는 것을 굳이 찾아 읽지 마라)
- 15개를 넘기지 마라. 넘기면 초안이 저장소 요약이 되고, 팀 규칙이 아니게 된다.

## 3. 초안을 쓴다

`$CLAUDE_PLUGIN_ROOT/schemas/context-item-draft.json` 이 **작성 안내서**다
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
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" validate .contextops/cache/draft.json
```

- exit 0 → 5단계로
- exit 2 → 출력된 **오류 위치**를 고쳐 **한 번만** 다시 시도한다. 두 번째도 실패하면
  무엇이 막혔는지 사용자에게 보여 주고 멈춘다 (계속 고치면 사실이 아닌 초안이 된다).

## 5. 무엇이 나가는지 보여 주고 **명시적 확인**을 받는다

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" upload-draft --dry-run
```

이 출력이 **실제로 보낼 payload 에서 뽑은 것**이다 — 항목 수·항목 id·근거 경로 수·
「코드 본문 0건」. 요약하지 말고 그대로 보여 준 뒤 사용자에게 물어라.

⛔ 확인 없이 6단계로 가지 마라.

## 6. 올린다

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" upload-draft
```

- exit 0 → 받아들여진 항목 수와 웹 링크를 그대로 보여 준다.
- exit 2 → 항목별 거절 사유가 나온다. 고쳐서 4단계부터 다시.
- exit 20 → 네트워크다. 잠시 뒤 6단계만 다시 하면 된다 (초안은 그대로 있다).
- exit 30 → 토큰·설정 문제다. `contextops setup` 을 안내한다.

마지막으로 **웹에서 검토·발행이 필요하다**는 것을 알린다 — 초안은 아직 팀 규칙이 아니다.
