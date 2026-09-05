# P1 근거 — 서버는 코드 본문·secret·개인 Memory·대화 transcript 를 받지 않는다

> 루프 64바퀴 · PLAN P5 둘째 행 「보안 캡처 증거」의 코드 쪽 절반.
> **관통(`tools/walkthrough.ps1`)이 매번 재는 것**을 사람이 읽는 표로 굳힌 것이다 — 손으로 쓴 수는 없다.
> 옆의 `walkthrough-payload.json` · `walkthrough-scan.json` 은 그 관통이 남긴 산출물을 **그대로 복사**한 것
> (`.ci/` 는 관통마다 지워져서 밖으로 옮겼다 — CLAUDE.md).
>
> ⚠ **배포(Vercel)에서 찍은 네트워크 탭이 아니다.** 아래는 **배포되는 번들**(`plugin/contextops/bin/contextops-cli.mjs`)이
> 진짜 저장소 사본에서 **진짜 소켓**으로 보낸 바이트를 받아서 판 것이다. 브라우저 네트워크 탭 캡처는 🙋 Vercel 연결 뒤
> (`docs/STATUS.md` 「막힌 것」).

## 0. 한 줄 답

**사용자 기기에서 서버로 나가는 body 는 네 종류이고, 넷 다 `.strict()` 계약으로만 나간다. 계약에 코드 본문·secret 값·
Memory·transcript 를 담을 칸이 없고, 계약에 없는 키를 넣으면 요청이 소켓을 타기 전에 죽는다 (exit 2 · 요청 0건).**

## 1. 나가는 body 네 종류 (SPEC §3.1) — 무엇이 나가고 무엇이 **없는가**

| 엔드포인트 | 계약 (`packages/schema/src/upload.ts`) | 나가는 것 | **없는 것** (칸 자체가 없다) | 누가 잰다 |
|---|---|---|---|---|
| `POST …/context-items/batch-draft` | `ContextItemsBatchDraft` | 항목 초안(제목·한 줄 본문·타입별 `data`·`source_refs` 의 **경로와 줄 번호**) · `repo` 이름 · `scan_summary`(파일 **수**·언어·엔트리포인트 **경로**·인프라 파일 **경로**·env **키 이름**·의존성 **이름**·제외 사유) | 파일 본문 · 파일 목록(경로 48개도 안 나간다 — 수만) · env **값** · 토큰 | payload 단계 ①②③⑤ |
| `POST …/proposals` | `Proposal` | 제목·요약·항목별 `operation`/대상 id/근거(**경로·줄**)/이유 · `base_version_id` · `client_request_id` | 코드 diff · 파일 본문 | payload 단계 ① |
| `POST …/progress` | `ProgressEvent` | 마일스톤 id · 상태 · 기준 문장 · 근거(**경로·줄·commit**) · 요약 · 적용 버전 · `source` | 그 줄에 무엇이 적혀 있는지 (서버는 모른다) · diff | payload 단계 ① · 훅은 **경로만** 보낸다 (줄 번호조차 없다 — `scripts/stop.mjs`) |
| `POST …/sync-reports` | `SyncReport` | 적용 버전 · `manifest_hash` · 상태 · 파일별 **경로와 sha256** | Pack 본문 (해시만) | sync 단계 「🔴 P1 — 보고 payload 에 문서 본문이 0건」 |

- 넷 다 `.strict()` 다 — 모르는 키는 서버에서 400 이고, **플러그인은 보내기 전에 같은 계약으로 먼저 판다** (아래 §3).
- 새 업로드 문을 더하는 절차 셋은 `upload.ts` 머리에 있다. ③(`test/upload-allowlist.test.ts` 의 표)을 빠뜨리면 그 문만 P1 검사를 안 받는다 — 그래서 시험이 표를 돈다.
- `POST /documents` 의 `content`(팀 **문서** 본문)는 의도적으로 올라간다 — 코드가 아니라 팀장이 올리는 규칙 문서다 (SPEC §5 · `tools/principles.ps1` 의 P1 금지어 주석).

## 2. 실제로 나간 body 3건 — payload 단계가 받아 둔 바이트 (`walkthrough-payload.json` 의 `sent`)

관통이 픽스처 `fixtures/paylab-api`(48개 파일)를 임시 폴더에 복사하고, 값이 든 `.env` 를 심은 뒤, 배포되는 번들로
`scan → upload-draft → progress → propose` 를 돌렸다. 나간 요청은 **3건**이고 아래가 그 필드 전부다.

```
/api/v1/projects/{id}/context-items/batch-draft
  items[0]        id · title · body(한 줄) · scope · priority · source_refs[{kind, repo, path, start_line}] · tags · confidence · type · data{component, responsibility, paths}
  repo            "paylab-api"
  scan_summary    file_count 48 · languages 4 · entrypoints ["src/main.ts"] · infra_files 3 · env_keys 15 · dependencies 15 · excluded 3

/api/v1/projects/{id}/progress
  milestone_id · status · criterion · evidence[{path, start_line, end_line}] · summary · context_version · source · client_event_id

/api/v1/projects/{id}/proposals
  title · summary · items[{operation, target_item_id, evidence[{kind, repo, path, start_line}], reason}] · relates_to · base_version_id · client_request_id
```

`scan_summary.excluded` 가 스스로 말한다:

```
".env (키 이름만 읽었다 — 값은 안 읽는다)"
".env.example (키 이름만 읽었다 — 값은 안 읽는다)"
```

## 3. 나가지 **않은** 것 — 검사와 결과 (payload 단계 10검사 · 전부 OK)

| 검사 | 어떻게 잰다 | 결과 |
|---|---|---|
| 계약에 없는 키는 거절되고 **요청이 아예 안 나간다** | 초안에 `file_body: <src/main.ts 전체>` 를 넣어 `upload-draft` | **exit 2 · 새 요청 0건** — 소켓을 타기 전에 죽었다 |
| 나간 요청이 전부 업로드 계약을 지난다 | 받은 body 3건을 `packages/schema` 의 같은 Zod 로 다시 판다 | 3/3 |
| 픽스처 48개 파일의 **본문**이 payload 에 0건 | 파일마다 **가장 긴 줄**(30자 이상)을 꺼내 모든 body 에서 찾는다 — 고정 금지 문자열이 아니라 파일에서 뽑는다 | 0건 |
| env **값**이 payload 에 0건 | 임시 저장소에 심은 `.env` 의 값 2개(`PSP_A_API_KEY` · `SENTRY_DSN`) + `.env.example` 의 값을 모든 body 에서 찾는다. **잰 값이 0개면 FAIL** | **잰 값 2개 · 0건** |
| 기기 토큰이 body 에 0건 | `ctx_…` 토큰을 모든 body 에서 찾는다 — 토큰은 `Authorization: Bearer` 헤더로만 간다 (`src/cli/api.ts`) | 0건 |
| `scan_summary` 가 실제로 실려 나갔다 (키 **이름**만) | 심은 `.env` 에만 있는 키 `SENTRY_DSN` 이 body 에 있나 — 스캐너가 그 파일을 **열어 키만 꺼냈다**는 증거 | env 키 15개 (`.env.example` 14 + 심은 1) |

🔴 **64바퀴가 고친 것 (FINDINGS 124)** — 「env 값이 payload 에 0건」은 63바퀴까지 `.env.example` 의 값만 재고 있었는데,
그 파일은 **값이 0건이어야 한다**(`tools/fixtures.mjs` ③ 이 잠근다). 즉 이 검사는 **잰 값이 0개**인 채로 초록이었다 —
「정의만 있고 아무 일도 안 하는 검사」(loop/PROMPT.md ④2-B). 이제 관통이 값을 심고, 잰 값이 0개면 빨개진다.
⚠ scan 단계(`plugin/contextops/scripts/walkthrough-scan.ts`)의 같은 검사는 **아직 잰 값이 0개다** — FINDINGS 125.

## 4. 스캔 산출물 — 경로와 이름만 (scan 단계 49검사 · `walkthrough-scan.json`)

`contextops scan` 이 저장소에서 여는 파일은 **둘뿐**이다 — 의존성 매니페스트(이름만) · `.env*`(키 이름만). 나머지 파일은
**경로만** 센다 (`src/cli/scan.ts` 머리). 산출물 `scan.json` 은 로컬 캐시(`.contextops/cache/`)이고 서버로는 그 **요약**만 간다 (§2).

| 잰 것 | 결과 |
|---|---|
| 파일 48개 각각의 가장 긴 줄이 `scan.json` 에 있나 | 0건 |
| `.env.example` 의 값이 `scan.json` 에 있나 | 0건 (⚠ 잰 값 0개 — FINDINGS 125) |
| 산출물 모양 | `{repo, files[{path, language}], summary{…}}` — 본문 칸 없음 (`ScanResult` 계약) |
| 제외 목록 | `.env.example (키 이름만 읽었다 — 값은 안 읽는다)` |

## 5. 서버 쪽 자물쇠 — 받아도 남기지 않는다

| 무엇 | 어디 | 기계 검사 |
|---|---|---|
| 업로드 스키마에 코드·secret·기억·대화 필드 이름이 없다 | `packages/schema/src/*.ts` 10개 파일 · 금지어 `file_content` `snippet` `code_body` `transcript` `diff` `patch` `memory` `secret_value` `env_value` `token_value` `source_code` | `tools/principles.ps1` **P1** OK |
| 업로드 스키마가 `.strict()` 로 잠겨 있다 | 7개 파일 | `tools/principles.ps1` **P1b** OK |
| 요청 로그에 body·토큰·본문이 없다 | `apps/web/src/lib/api/log.ts` — 필드 표 하나: `request_id` `route` `method` `status` `latency_ms` `user_id?` `project_id?` — 찍는 자리가 `logRequest()` 하나 | 표에 없는 필드는 타입이 막는다 |
| 기기 토큰은 sha256 만 저장 | SPEC §11 · `lib/api/token.ts` (`createHash('sha256')` · 원문은 응답 한 번뿐) | `api-auth` 시험 |

## 6. 개인 Memory · 대화 transcript

플러그인 코드(`plugin/contextops/src` · `scripts/stop.mjs` · `scripts/session-start.mjs` · `hooks/hooks.json`)에서
`transcript` · `.claude/projects` · `memory` 를 읽는 자리를 찾았다 — **0곳** (64바퀴 `grep -rni`). 훅이 stdin 으로 받는
Claude Code 의 훅 payload 에서 쓰는 것은 `session_id` 하나다 (같은 세션에 두 번 보고하지 않으려고). 서버 계약에는
그것을 담을 칸조차 없다 (§1).

## 7. 이 문서가 **못** 말하는 것 (정직하게)

- **배포에서 찍은 것이 아니다.** 소켓은 진짜지만 서버는 관통이 띄운 짧은 것이고 DB 는 PGlite 다. Vercel 의 함수 로그가
  실제로 `log.ts` 의 필드만 남기는지는 🙋 배포 뒤 첫 요청에서 본다.
- **scan 단계의 env 값 검사는 아직 잰 값이 0개다** (FINDINGS 125). payload 단계는 고쳤다.
- **`upload-draft` 의 `body` 는 사람(또는 init Skill)이 쓴 한 줄 문장이다.** 거기에 사람이 코드를 붙여 넣으면 계약은 못 막는다
  (2,000자 상한만 있다 — SPEC §3.1). Skill 의 규칙이 「본문에 코드를 붙이지 마라」이고, 관통은 「규칙대로 썼을 때 파이프라인이
  본문을 안 나른다」를 잰다. 붙여 넣은 코드를 서버가 거절하는 검사는 없다 — KNOWN_LIMITATIONS 에 적을 후보다.

## 다시 만드는 법

```
powershell -ExecutionPolicy Bypass -File tools/walkthrough.ps1     # 7단계 · scan·payload·sync 가 위를 다시 잰다
pnpm --filter web exec tsx scripts/walkthrough-payload.ts          # payload 단계만 (.ci/walkthrough-payload.json)
```
