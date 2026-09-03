# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 10바퀴 · `b85c2c8`_

---

## 지금 어디인가

**P2 첫 행이 끝났다 — 플러그인이 생겼다.** `plugin/contextops` 에 `schemas/*.json` 만
있던 자리에 `.claude-plugin/plugin.json` · `bin/contextops-cli.mjs`(esbuild 번들) ·
`src/cli/` 12파일 · 시험 36개가 들어갔다. **새 레포에서 `setup` → `scan` → `validate` 를
진짜 서버에 붙여 끝까지 돌려 봤다** (`docs/evidence/2026-09-03-plugin/`).

다음은 **P2 둘째 행 — `sync`·`status`·SessionStart 훅**이다. 그 행이 관통의 `sync` 단계와
`payload` 단계를 켠다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | **CLI 명령 5개** — `sync`·`status`·`upload-draft`·`propose`·`progress` |
| `packages/schema` (계약 전부 · 로컬 파일 계약 포함 · 테스트 105) | **훅 2개**(`session-start.mjs`·`stop.mjs`) · **Skill 3개** |
| `packages/compiler` (파이프라인 7단계 · 테스트 124 · 태그 읽기) | Supabase 프로젝트 (🙋 사람) · Vercel |
| `apps/web` — 라우트 28개 · 테스트 **125** | 서버측 AI (`structureDocument`·`detectConflicts`) |
| 웹 화면 5개 (`/login` `/auth/callback` `/t/new` `…/context` `…/packs`) | 웹 화면 **1·3·4·6·8·9** |
| **`plugin/contextops` — 번들 + `setup`·`scan`·`validate` · 테스트 36** | **토큰 발급 화면** (FINDINGS 36 — 지금은 라우트를 손으로 친다) |
| **`scripts/dev-server.ts`** — 화면·API 를 눈으로 볼 수 있는 씨앗 서버 | 충돌을 **만드는** 코드 (P3 · FINDINGS 28) |

검사 층: `principles OK 6 · typecheck 5초·멤버 4 · test 37초·멤버 4 · build 17초 ·
walkthrough 41초` → **GREEN**. 관통 **5단계**(fixture·compile·api·publish·**scan**).
남은 SKIP 셋의 prereq 는 `walkthrough-payload.ts`(P2 셋째 행) ·
`plugin/contextops/src/cli/sync.ts`(P2 둘째 행) · `apps/web/e2e`.

## 다음 바퀴가 할 일

`docs/PLAN.md` **P2 둘째 행**: `sync`(백업·atomic·post-verify) · `status` · SessionStart 훅.
정본은 `SPEC.md` §8.5·§8.6. 완료 기준은 「훅 알림 → sync → `applied` 보고 ·
**hash 불일치에서 중단** · `session-start.mjs` 에 fs write **0건**(P6) · path traversal 거부」다.

**시작하기 전에 아는 것 (이번 바퀴가 깔아 둔 자리):**

- 명령을 더하는 절차는 `src/cli/commands.ts` 의 표 옆 주석에 있다 — **네 걸음**이고
  표 밖에서 할 일은 없다. `src/cli/sync.ts` 를 만드는 순간 **관통의 sync 단계가 켜진다**
  (prereq 를 그 파일로 바꿔 놨다).
- 파일을 쓰는 문은 `src/cli/fsx.ts` 하나다. secret 은 `writeSecretFile`(0600)이고
  숫자는 거기 상수뿐이다. sync 의 atomic 교체도 **이 파일에** 더해라 — 흩으면 갈라진다.
- 서버와 말하는 문은 `src/cli/api.ts` 의 `apiGet` 하나다. 응답은 세 갈래(`ok`·`failed`·
  `unreachable`)이고, `sync` 는 여기에 「본문 바이트를 그대로 받는」 갈래를 더해야 한다
  — **Pack 파일은 봉투가 아니다** (`respond.ts` 의 `packText` 주석을 먼저 읽어라).
- 종료 코드는 `src/cli/exit.ts` 의 표다. `sync` 의 「1 = modified」가 이미 그 표에 있다.
- 🔴 **`bin/contextops-cli.mjs` 는 커밋되는 산출물이다.** 소스만 고치고 빌드를 잊으면
  사용자는 옛 CLI 를 돈다 — `test/bundle.test.ts` 가 방금 빌드한 바이트와 대조해서
  빨개진다. 고쳤으면 `pnpm --filter @contextops/plugin build` 를 부르고 **같이 커밋해라.**

**API 를 손으로 두드릴 일이 생기면** — `pnpm --filter web dev:db` 로 씨앗 DB 를 띄우고
`http://127.0.0.1:55433` 에서 `project_id` 와 세션 토큰을 받는다. 그 다음은
`pnpm --filter web build` → `next start` 다. **`next dev` 를 쓰지 마라** (아래 함정).

**값싼 것들 (아무 바퀴에서나)**: FINDINGS **21·22·23·17·32·38·39** 는 SPEC 을 코드에
맞추는 **문서 한 줄**짜리다. **14**(`.ps1` 두 개가 LF)도 그렇다. **30**(domain 파일 제목)은
템플릿 한 줄인데 **golden 이 빨개진다** — `TEMPLATE_VERSION` 을 올려라.

⚠ FINDINGS **24·25·26·28·29·31·33·35** 는 **P3 가**, **36** 은 **P4 화면 9** 가 주인이다.
**37**(`.contextops/.gitignore`)은 **P2 둘째 행**에서 backups 를 만들 때 같이 하면 값이 두 배다.

## 잰 것

**10바퀴 · P2 첫 행 — 플러그인 레이아웃 · setup · scan · validate** (`b85c2c8`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK 6 / typecheck 5초 / test 37초 / build 17초 / walkthrough 41초 |
| 워크스페이스 멤버 | 3 → **4개** (`@contextops/plugin` 이 typecheck·test 를 **실제로** 돈다) |
| 새 시험 | **+37** — 플러그인 **36**(1개는 POSIX 전용이라 Windows 에서 skip) + web 1. 전체 356 → **393** |
| 관통 단계 | 4 → **5개** (`scan` 이 켜졌다) |
| CLI 명령 | 0 → **3개** (SPEC §8.3 의 8개 중 셋. 나머지는 표에 **적지 않았다**) |
| 번들 | `bin/contextops-cli.mjs` **771KB**(minify 안 함 — 사람이 열어 볼 수 있어야 한다) |
| 마이그레이션 | **없다** — DB 를 안 건드렸다 |

**끝까지 돌려 본 것** (`docs/evidence/2026-09-03-plugin/setup-new-repo.md`):

- `git init` 만 한 폴더 + 진짜 서버(`next start` + 씨앗 PGlite) + `POST /tokens` 로
  발급한 **진짜 토큰** → `setup` exit 0. `project.json` 에 토큰 **0건**
  (`grep -r ctx__bU7 <repo>` → 0), `credentials.json` 은 홈 밖 폴더에.
- 틀린 토큰 → **서버의 401** → exit 10, 그 레포는 **만들어지지도 않았다**.
- `.env` 에 `API_KEY=super-secret-value-123` 을 두고 `scan` →
  `env_keys: ["API_KEY"]` 이고 **값은 산출물 어디에도 없다.** `src/main.ts` 의 본문도 없다.
- `claude plugin validate` (2.1.233) → **Validation passed**.

**설계에서 한 판단 다섯** — 다음 바퀴가 되돌리지 않게:

- **`validate` 는 `schemas/*.json` 이 아니라 Zod 정본으로 판다** (SPEC §8.3 과 다르다 ·
  FINDINGS 38). JSON Schema 는 `.refine()` 을 못 옮긴다 — `ProposalItem` 의
  「add 는 draft 가 필요하다」가 통째로 사라진다. 계약은 여전히 한 벌이다: `schemas/*.json`
  도 **같은 Zod 에서 뽑고**, 그 파일들은 init Skill 의 **작성 안내서**로 남는다.
- **`draft.json` 은 `batch-draft` body 가 아니다.** 모델이 쓰는 파일에 `scan_summary` 칸을
  두면 **모델이 스캔 결과를 지어낼 수 있다.** 초안은 항목만 적고, `repo`·`scan_summary` 는
  `upload-draft` 가 `scan.json` 에서 붙인다 (`ContextItemDraftFile`).
- **secret 후보는 `files` 목록에서도 뺀다.** 그 목록은 init Skill 이 「무엇을 읽을까」를
  고르는 후보다 — 한 줄이라도 있으면 언젠가 읽힌다. `.env*` 만은 스캐너가 직접 열되
  `=` 왼쪽만 꺼낸다 (`envKeysOf` 가 P1 의 마지막 한 겹이다).
- **상한 숫자는 `packages/schema` 의 `SCAN_LIMITS` 표 하나다.** 스캐너가 자르는 기준과
  서버가 400 내는 기준이 갈리면 **로컬에서 멀쩡한 scan.json 이 업로드에서만 막힌다.**
- **`Cli` 를 인자로 받는다** (stdout·stdin·브라우저·fetch). 명령 안에서 `process` 를
  부르면 그 갈래는 프로세스를 띄워야만 재지고, 그러면 401·오프라인·설정 오류가
  **사실상 검사되지 않는다.** `process` 를 아는 파일은 `main.ts` 하나다.

**게이트를 셋 더했다 — 「같은 지적이 두 번 나오면 게이트로」**:

| 게이트 | 무엇을 막나 | 갈리는지 확인했나 |
|---|---|---|
| `test/bundle.test.ts` | 커밋된 번들이 소스와 **바이트가 같은가** · 노드가 그대로 실행하는가 | **예** — 소스를 고치고 빌드 전에 돌려 빨개지는 것을 봤다 |
| `test/credentials.test.ts` | 0600 을 **요구했는가**(전 플랫폼) + 실제 비트(POSIX) | Windows 에서 첫 시험만 도는 것을 확인했다 (둘째는 skip) |
| 관통 `scan` 단계 | 배포되는 번들의 산출물에 **본문 0건** — 파일마다 가장 긴 줄을 뽑아 없는지 본다 | 고정 문자열이 아니라 픽스처에서 뽑는다 (픽스처가 바뀌어도 산다) |

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| **`ScanSummary` 7칸** | `scan` 이 전부 채우고 `batch-draft` 가 받는다 | 픽스처에 `.tf` 를 하나 넣으면 `infra_files` 가 갈린다 (시험이 잰다) | **살렸다** |
| **`ERROR_CODES` 의 `UNAUTHORIZED`·`NOT_FOUND`·`FORBIDDEN`** | `setup` 이 **셋을 서로 다른 종료 코드**로 옮긴다 | 401→10 · 404/403→30 (시험 3개) | **살렸다 — 이제 CLI 도 읽는다** |
| **`SOURCE_REF_KINDS.repository_path.repo`** | `scan` 의 `repo` → `project.json.repo_name` | 이름이 갈리면 근거가 아무 데도 안 간다 (그래서 `RepoName` 원자로 올렸다) | **살렸다** |
| `LOCAL_FILES` 5칸 | `project`·`scan` 은 쓴다. **`manifest`·`draft`·`pendingProposal` 은 아직 아무도** | — | **절반** — P2 둘째·셋째 행이 주인 |
| `DeviceCredential.device_id` | `setup --device-id` 로만 들어온다 · **읽는 곳 0곳** | — | **절반** — `DELETE /devices/{id}` 를 부르는 명령이 아직 없다 |

**루프 실주행 기준선** — `logs/cycles/*.jsonl` 의 **마지막** result 줄 · `duration_api_ms`

| | dry001·002 | c001 | c002 | c003 `8e02f48` | c004 `84ce3ea` |
|---|---|---|---|---|---|
| 시간 | 0.3분 · 0.3분 | 15.1분 | **result 줄 없음** | 30.2분 | **7.1분** |
| 턴 | 7 · 7 | 77 | (잘렸다) | 92 | **46** |
| 비용 | $0.42 · $0.41 | $6.28 | | $13.90 | **$3.05** |

⚠ **5~10바퀴는 `logs/cycles/` 에 파일이 없다.** 루프 러너가 아니라 직접 연 세션으로 돌았다.
다음 바퀴가 러너로 돌면 이 표를 이어 적어라 (기준: 마지막 result · `duration_api_ms`).

## 눈 판정 대기

_(없음)_ — 이번 바퀴에 만든 것은 화면이 아니라 CLI 다. **터미널 출력과 산출 파일을
직접 읽었고** 근거를 `docs/evidence/2026-09-03-plugin/` 에 남겼다.

**아직 눈으로 못 본 것** (다음에 화면을 건드리면 여기부터):

- 화면 5 의 **발행 모달** · **상세 드로어** — 헤드리스에서 버튼을 못 누른다.
  `apps/web/e2e` 가 생기면 자동으로 찍힌다
- **empty 상태** — 항목이 0개인 프로젝트를 만들어야 본다 (씨앗은 6개를 넣는다)
- 화면 7 의 **제외된 항목 접이식** — 이번 씨앗은 `excluded` 가 비어 있다
- **`setup` 의 물어보기 흐름** — TTY 가 있어야 도는 갈래다. 시험(`answers`)으로는 잠갔지만
  진짜 터미널에서 붙여 넣어 본 적은 없다

⚠ 다섯 다 **코드에는 있고 시험은 초록**이다. 그래서 더 위험하다 —
「컴파일 초록은 최소선이다」(loop/PROMPT.md ①③).

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| Supabase 프로젝트 생성 · `DATABASE_URL` · **`SUPABASE_JWT_SECRET`** | 계정·결제가 필요하다 | **🔴 지금.** 코드는 다 됐다 — 값만 꽂으면 P1 첫 행이 닫히고 실제 로그인이 돈다. 필요한 값은 `apps/web/.env.example` 에 전부 있다 |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 | 계정 연결이 필요하다 | P5 |
| 실데이터 픽스처(`brain`) 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만 · SPEC §14 절삭 6번) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** 값은 `.env.local` 에만 산다 (P1).
🔴 `SUPABASE_JWT_SECRET` 이 없으면 **아무도 로그인하지 못한다** — 조용히 통과시키지 않는 것이
의도다 (`src/lib/api/session.ts`).

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

- 🔴 **`next dev` 로 API 를 두드리지 마라.** 렌더 워커가 한 번 죽으면 그 뒤의 모든 라우트가
  **500 을 HTML 로** 낸다 (`Jest worker encountered 2 child process exceptions`).
  JSON 을 기대한 스크립트는 `Unexpected token '<'` 로 죽는다. `pnpm --filter web build` →
  `next start` 로 가라 — 이번 바퀴에 30분을 여기서 썼다.
  ⚠ 그리고 **`next dev` 는 `.next` 를 개발용으로 덮어쓴다.** 그 뒤 `next start` 는
  「production build 가 없다」로 죽는다. 순서는 언제나 **build → start** 다.
- 🔴 **파일을 셸 heredoc(`<<'PY'`)으로 쓰면 `\\` 가 `\` 로 접힌다.** 이번에도 밟았다 —
  `walkthrough.ps1` 의 `plugin\contextops\...` 경로를 파이썬 heredoc 으로 고치려다
  `\c` 가 되어 assert 가 터졌다. **파일 편집은 Edit/Write 도구로 해라.**
- **`.ps1` 중 `walkthrough.ps1` 은 LF 다** (FINDINGS 14). 고칠 때 CRLF 로 바꾸지 마라 —
  줄바꿈만 바뀐 커밋이 전체 파일 diff 로 보인다. BOM 은 있어야 한다.
- 🔴 **Windows 는 POSIX 권한 비트를 저장하지 않는다.** `statSync().mode & 0o777` 로만
  0600 을 재면 개발 기계에서 **그 규칙이 검사되지 않고 초록**이다. 「무엇을 요구했나」를
  잴 수 있게 `chmod` 를 주입받아라 (`writeSecretFile`).
- **vite 8 은 oxc 로 변환한다.** `esbuild: { jsx }` 는 경고만 하고 조용히 안 먹는다.
- 🔴 **`node:crypto` 를 재수출하는 index 는 브라우저 번들에 못 들어간다.**
  `package.json` 의 `exports` 에 문을 하나 더 선언해라 (`./tag`).
- 🔴 **CSS 특이도는 소스 순서로 갈린다.** 유틸리티 클래스는 **아래에** 두어라.
- 🔴 **`<a>` 에는 `:disabled` 가 안 먹는다.** 태그를 바꿔라.
- **pglite-socket 은 연결을 한 번에 하나씩 처리한다** — `?max=1` 을 붙여라.
  ⚠ 클라이언트가 죽으면 ECONNRESET 이 씨앗 서버를 통째로 죽인다 (`dev-server.ts` 가 삼킨다).
- **헤드리스 Chrome 은 `--timeout` 보다 `--virtual-time-budget`** 이 낫다.
  ⚠ 리다이렉트하는 페이지에서는 반대다.
- **PowerShell 로 캡처 경로를 줄 때는 절대 경로여야 한다.**
- 🔴 **`snapshot_hash` 는 semver 를 품는다** — 「같은 내용은 두 번 발행 못 한다」를
  막을 방법이 지금 없다 (FINDINGS 27).
- 🔴 **catch-all 구간(`[...path]`)의 params 는 배열이다** — `string | string[]` 로 넓혀라.
- 🔴 **PowerShell 은 `[id]` 를 와일드카드로 읽는다.** 경로는 언제나 `-LiteralPath`.
  **bash 도 글로브로 읽는다** — `git add 'apps/.../[id]/...'` 는 따옴표로 감싸라.
- **파이썬은 Git Bash 의 `/tmp` 를 못 본다.** 저장소 안에 쓰고 지워라.
- **`python - <<'PY'` 안에서 한글을 `print` 하면 죽는다** (`cp949`) — `python -X utf8`.
  ⚠ **쓰기는 이미 끝난 뒤에 죽는다.**
- **워크스페이스 패키지의 의존성은 그 패키지에 적어야 한다** (유령 의존성 금지).
- **유니온 Zod 스키마의 `z.infer` 는 느슨하다** — 정밀 타입은 mapped type 으로 따로 온다.
- **`ItemId` 는 `item_` 뒤에 3자 이상**이다.
- **한 시험 파일 안에서 seed 를 여러 번 부르면 slug 가 부딪힌다.**
- **`tools/ci.ps1` 을 하위 디렉터리에서 부르면 가짜 RED 였다.**
  ⚠ **Bash 도구의 cwd 는 `cd` 후에도 남는다.** `cd` 를 쓴 다음 명령은 절대 경로로 시작해라.
- **`Object.values(모듈)` 로 drizzle 표를 걸러내면 타입 검사가 막힌다.**
- **PGlite 는 Docker 없이 마이그레이션을 실제로 적용한다** (`test/helpers/db.ts` 하나).
- **`tools/principles.ps1` 은 주석도 센다.** `packages/schema/src` 에서는
  `patch`·`diff`·`memory`·`secret:` 등이 금지어다 — 게이트를 똑똑하게 만들려 하지 마라.
- **`.ps1` 을 고칠 때는 BOM 과 줄바꿈을 지켜라** (`utf-8-sig` + `newline=''` 둘 다).
- **`git commit` 이 「Author identity unknown」으로 죽었다.** 로컬로 박아 뒀다.
- **`pnpm -r` 은 멤버가 0개면 조용히 exit 0 이다** (FINDINGS 1). **pnpm 11 의 설치 스크립트
  허용 키는 `allowBuilds` 다** (FINDINGS 6). **`z.toJSONSchema` 는 기본이 인라인이다** —
  `reused: 'ref'`. **`as const satisfies Record<K,V>` 는 표를 읽는 쪽을 망가뜨린다.**
