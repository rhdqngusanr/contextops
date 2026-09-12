# 근거 — 플러그인을 실제로 깔아 봤다 (2026-09-13 · FINDINGS 173)

> 사용자의 Claude Code 설정을 건드리지 않으려고 `CLAUDE_CONFIG_DIR` 를 스크래치 폴더로 돌려 깔았다.
> 경로의 사용자 부분은 `<scratch>` 로 가렸다. 출력은 CLI 가 찍은 그대로다(CLI 가 긴 줄을 `…` 로 자른다).

## ① 공개 저장소 main 그대로 — 로드 실패

```
$ CLAUDE_CONFIG_DIR=<scratch>/cc-config claude plugin marketplace add rhdqngusanr/contextops
Adding marketplace…SSH not configured, cloning via HTTPS: https://github.com/rhdqngusanr/contextops.git
Refreshing marketplace cache (timeout: 120s)…
Cloning repository (timeout: 120s): https://github.com/rhdqngusanr/contextops.git
Clone complete, validating marketplace…
Cleaning up old marketplace cache…
✔ Successfully added marketplace: contextops (declared in user settings)

$ CLAUDE_CONFIG_DIR=<scratch>/cc-config claude plugin install contextops@contextops
Installing plugin "contextops@contextops"...✔ Successfully installed plugin: contextops@contextops (scope: user)

$ CLAUDE_CONFIG_DIR=<scratch>/cc-config claude plugin list
Installed plugins:

  ❯ contextops@contextops
    Version: 0.1.0
    Scope: user
    Status: ✘ failed to load
    Error: Hook load failed: Duplicate hooks file detected: ./hooks/hooks.json resolves to already-loaded file <scratch>\cc-config\plugins\cache\contextops\contextops\0.1.0\hooks\hooks.json. The standard hooks/hooks.json is loaded au…
```

같은 파일로 검사기는 통과한다 — 이 충돌은 **깔아서 목록을 봐야만** 보인다:

```
$ claude plugin validate plugin/contextops
Validating plugin manifest: …\plugin\contextops\.claude-plugin\plugin.json

✔ Validation passed
```

## ② `plugin.json` 에서 `hooks` 를 뺀 작업 트리 — 로드됨

```
$ CLAUDE_CONFIG_DIR=<scratch>/cc-config-local claude plugin marketplace add C:/dev/hackathon
Adding marketplace…✔ Successfully added marketplace: contextops (declared in user settings)

$ CLAUDE_CONFIG_DIR=<scratch>/cc-config-local claude plugin install contextops@contextops
Installing plugin "contextops@contextops"...✔ Successfully installed plugin: contextops@contextops (scope: user)

$ CLAUDE_CONFIG_DIR=<scratch>/cc-config-local claude plugin list
Installed plugins:

  ❯ contextops@contextops
    Version: 0.1.0
    Scope: user
    Status: ✔ enabled
```

`pnpm --filter @contextops/plugin test` → 18 파일 · 200 통과 · 1 건너뜀 (뒤집은 시험 포함).

## ③ 못 잰 것

깐 플러그인의 Skill(`/contextops:setup` → `/contextops:sync` → 작업 끝의 `/contextops:progress`)을 **진짜 Claude Code 세션**에서 돌려
서버와 말하게 하는 걸음. 가짜 서버를 띄워 이 세션에서 밟으려 했으나 도구 권한에서 막혔다 — 🙋 새 저장소에서 사람이 한 번
(`docs/PITCH.md` §3 의 세 장면). Skill 본문의 `${CLAUDE_PLUGIN_ROOT}` 치환이 실제로 되는지도 그 걸음에서 처음 보인다.
