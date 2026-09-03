# 근거 — 새 레포에서 `setup` · `scan` · `validate` (루프 10바퀴 · PLAN P2 첫 행)

> `.ci/` 는 관통마다 지워진다. **적기 전에 밖으로 복사했다** (CLAUDE.md).
> ⚠ 토큰은 `ctx_…` 로 가렸다. 실제 값은 그때의 PGlite 안에만 있었고 프로세스와 함께 사라졌다.

## 어떻게 세웠나

```
pnpm --filter web dev:db                     # PGlite(TCP) + paylab 씨앗 + v1.0.0 발행
pnpm --filter web build && next start :3000  # DATABASE_URL=…?max=1 · SUPABASE_JWT_SECRET=…
POST /api/v1/projects/{id}/tokens            # 201 → ctx_… + device_id
```

⚠ **`next dev` 로는 안 됐다.** 렌더 워커가 죽고 나면 API 라우트가 500(HTML)을 낸다
(`Jest worker encountered 2 child process exceptions`). `next build` → `next start` 로 갈아탄 뒤
health 부터 끝까지 200 이었다. 다음에 API 를 손으로 두드릴 때는 처음부터 `next start` 로 가라.

## ① `setup` — 브랜드 뉴 레포 (`git init` 만 한 폴더)

```
$ node bin/contextops-cli.mjs setup --api-origin http://127.0.0.1:3000 \
      --project eed22ea6-… --token ctx_… --device-id b9c60eae-… --no-browser
① 브라우저에서 로그인한다:
     http://127.0.0.1:3000/login
② 프로젝트를 고르고 기기 토큰을 발급받아 아래에 붙여 넣는다 (ctx_ 로 시작한다).

설정을 저장했다: …\newrepo\.contextops\project.json
토큰을 저장했다: …\fakehome\.contextops\credentials.json (본인만 읽기)

다음 (아직 안 깔았다면):
  claude plugin marketplace add <marketplace>
  claude plugin install contextops

Claude Code 를 열고 /contextops:init 을 실행하세요.
EXIT=0
```

**저장소 안 (`project.json` · 커밋한다):**

```json
{
  "api_origin": "http://127.0.0.1:3000",
  "project_id": "eed22ea6-3a20-4661-8c11-e261769ece66",
  "repo_name": "newrepo"
}
```

**저장소 밖 (`~/.contextops/credentials.json` · 0600):**

```json
{ "http://127.0.0.1:3000": { "eed22ea6-…": { "token": "ctx_…", "device_id": "b9c60eae-…" } } }
```

🔴 `grep -r "ctx__bU7" <newrepo>` → **0건.** 토큰은 저장소에 한 글자도 없다.

## ② 토큰이 틀리면 — 진짜 서버의 401

```
$ … setup --token ctx_thisTokenDoesNotExistAtAll_00000000000 --dir …/newrepo2
토큰이 유효하지 않다 (만료·취소됐을 수 있다) — 웹에서 다시 발급받아라.
EXIT=10
```

`newrepo2` 는 만들어지지 않았다 — **확인 전에는 아무것도 쓰지 않는다.**

## ③ `scan` — 같은 레포 (`.env` 에 `API_KEY=super-secret-value-123`)

```
$ node bin/contextops-cli.mjs scan
…\newrepo\.contextops\cache\scan.json
  파일 2개 · 언어 json, typescript
  엔트리포인트 1 · 인프라 0 · 의존성 1
  env 키 이름 1개 (값은 읽지 않았다) · 제외 3종
```

```json
{
  "repo": "newrepo",
  "files": [{ "path": "package.json", "language": "json" },
            { "path": "src/main.ts", "language": "typescript" }],
  "summary": {
    "file_count": 2, "languages": ["json", "typescript"],
    "entrypoints": ["src/main.ts"], "infra_files": [],
    "env_keys": ["API_KEY"], "dependencies": ["zod"],
    "excluded": [".contextops/", ".env (키 이름만 읽었다 — 값은 안 읽는다)", ".git/"]
  }
}
```

🔴 `API_KEY` **이름**은 있고 `super-secret-value-123` **값**은 없다.
`src/main.ts` 의 본문도 없다 — 경로와 언어뿐이다 (P1).

## ④ `validate` — 초안 하나

```
$ node bin/contextops-cli.mjs validate .contextops/cache/draft.json
…\draft.json — draft 계약과 맞는다.
EXIT=0
```

## ⑤ `claude plugin validate`

`claude-plugin-validate.txt` 참고 — Claude Code 2.1.233 · **Validation passed**.
