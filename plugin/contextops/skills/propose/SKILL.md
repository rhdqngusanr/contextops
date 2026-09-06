---
name: propose
description: Draft a change proposal to the team context from what actually changed in this repository.
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git diff:*), Bash(git status:*), Read, Glob, Grep
---

# 팀 컨텍스트에 낼 제안을 만든다

> 🔴 **제안은 승인 전까지 아무것도 바꾸지 않는다.** 그리고 **근거 없는 줄을 쓰지 마라** —
> 제안 항목마다 `evidence` 가 하나 이상 있어야 하고, 그건 이 저장소의 `path:line` 이다.

## 1. 무엇이 바뀌었나

`.contextops/pending-proposal.json` 이 있으면 **그것이 출발점**이다 (Stop 훅이 남긴
`{changed_paths, hint}`). 읽고, 그 경로들의 변경을 본다.

없으면 직접 본다 (기본은 working tree · 사용자가 범위를 주면 그것):

```bash
git status --short
git diff
```

바뀐 경로 중 **팀 규칙에 영향을 주는 것**만 고른다 — 마이그레이션·인프라·설정·
정책이 걸린 경로다. 리팩터링이나 오탈자는 제안거리가 아니다.

## 2. 제안 초안을 쓴다

`.contextops/cache/proposal.json` 에 저장한다. 모양은
`$CLAUDE_PLUGIN_ROOT/schemas/proposal-draft.json` 이 안내한다:

```json
{
  "title": "…", "summary": "…",
  "items": [{
    "operation": "add | update | deprecate",
    "target_item_id": "item_…",
    "draft": { "…": "add 일 때만" },
    "evidence": [{"kind":"repository_path","repo":"…","path":"…","start_line":12}],
    "reason": "왜 이 변경이 필요한가"
  }],
  "relates_to": ["M1"]
}
```

🔴 **규칙 넷**:

1. `add` 는 `draft` 가, `update`·`deprecate` 는 `target_item_id` 가 **필요하다**.
   기존 항목 id 는 웹의 Context 화면이나 적용된 Pack 의 역추적 태그(`<!-- ctx:item_…:N -->`)에 있다.
2. `evidence` 는 **이 저장소의 실제 경로와 줄**이다. 확인하지 않은 줄 번호를 적지 마라.
3. `reason` 은 **관찰한 것**이다. 사람의 의도를 추측해 적지 마라.
4. `base_version_id` 와 `client_request_id` 는 **적지 않는다.** 둘 다 네가 알 수 없는
   값이고 `propose` 가 서버에 물어 채운다. 적으면 계약 위반으로 막힌다.

## 3. 계약과 맞는지 판다

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" validate .contextops/cache/proposal.json --schema proposal-draft
```

exit 2 면 오류 위치를 고쳐 **한 번만** 다시 시도한다.

## 4. 보여 주고 확인을 받는다

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" propose --dry-run
```

제목·연산별 대상·근거 수가 나온다. 그대로 보여 주고 물어라.
⛔ 확인 없이 5단계로 가지 마라 — 제안은 팀의 승인 목록에 뜬다.

## 5. 올린다

```bash
# pending-proposal.json 에서 시작했으면 --from-pending 을 붙인다 (보낸 뒤 힌트를 치운다)
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" propose --from-pending
```

- exit 0 → 「웹의 어디서 보나」 줄(주소 · 「제안」 탭 · 제목 · id)을 그대로 보여 주고, **승인은 owner 가 웹에서 한다**고 알린다.
  ⚠ 화면 주소를 지어서 붙이지 마라 — CLI 는 uuid 만 알고 웹 주소는 slug 라, 지은 주소는 404 다.
- exit 2 → 계약 위반이다. 사유를 보여 주고 2단계로 돌아간다.
- exit 30 → 아직 공식 버전이 없다(첫 발행 전)거나 토큰 문제다. 출력 그대로 전한다.
- exit 20 → 네트워크다. 초안은 그대로 있으니 나중에 5단계만 다시 하면 된다.
