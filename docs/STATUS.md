# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 6바퀴 · `389c7f2` `7f904a2`_

---

## 지금 어디인가

**P1 첫 행(DB)의 루프 몫이 끝났다. 다음은 P1 둘째 행(API 1군)이다.**
`apps/web` 이 생겼다 — 아직 Next 앱은 아니고 **DB 층만** 있다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | **Next 앱**(`apps/web` 에 `app/` 도 `build` 스크립트도 없다) |
| `packages/schema` (계약 전부 · 테스트 71) | Supabase 프로젝트 (🙋 사람) · Vercel |
| `packages/compiler` (파이프라인 7단계 · 테스트 112) | `plugin/contextops` 의 bin·skills·hooks |
| **`apps/web/src/db` (표 16 · 인덱스 5 · enum 14 · 테스트 11)** | 서버측 AI (`structureDocument`·`detectConflicts`) |
| `fixtures/paylab-api`(TS 42) · `fixtures/paylab-docs`(151줄) | API 라우트 (`app/api/v1` 이 없다) |
| `plugin/contextops/schemas/*.json` 7개 | |

검사 층: `principles OK 6 · typecheck OK(멤버 3) · test OK(멤버 3) · build SKIP · walkthrough OK`.
**멤버가 2 → 3개가 됐다.** `build` 는 여전히 SKIP 인데 **이유가 바뀌었다** —
「apps/web 없음」이 아니라 「apps/web 에 build 스크립트 없음」이다. Next 앱이 붙으면 저절로 풀린다.
walkthrough 는 2단계 그대로다 (`api`·`publish`·`payload`·`sync`·`shots` 는 아직 SKIP).

## 다음 바퀴가 할 일

`docs/PLAN.md` **P1 둘째 행**: API 1군 (teams · projects · repos · tokens · documents ·
context-items · conflicts · questions). SPEC §5 가 정본이다.

🔴 **그 행을 할 때 FINDINGS 12번(에러 코드 9종)을 반드시 같이 닫아라.** 다섯 바퀴째
「주인은 API 1군 행」이라고 미뤄 온 항목이고, **이번이 그 행이다.** `packages/schema` 에
`ERROR_CODES` 표를 정본으로 두고 에러 응답 Zod 계약이 그 enum 을 쓰게 한 다음,
**9종이 전부 실제로 쓰이는지**를 liveness 시험으로 잠근다.

⚠ 그 전에 **Next 앱을 세워야 한다.** 지금 `apps/web` 에는 `app/` 이 없다 —
라우트를 쓰려면 `next`·`react` 의존성과 `app/` 트리가 먼저다. 그게 붙는 순간
`tools/ci.ps1` 의 build 층이 SKIP 에서 풀린다 (**안 풀리면 그게 고장이다**).

⚠ **FINDINGS 맨 위 둘(16·17)과 7·13 은 주인이 뒤 행이라 지금 고치지 마라.**
- 16번(`unknown` 을 만드는 곳이 없다) → P1 「API 2군」 행 · 7번 → P5 · 13번 → P2/P4
- 17번(SPEC §2 의 `failed`)은 **문서 한 줄**이라 아무 바퀴에서나 값싸게 닫을 수 있다

값싼 것: FINDINGS **14번**(`.ps1` 두 개가 LF · 5분) · **17번**(SPEC §2 한 줄).

## 잰 것

**6바퀴 · P1 첫 행 — DB 스키마 · Drizzle 마이그레이션** (`389c7f2` · `7f904a2`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK 6 / typecheck OK 5초·멤버 3개 / test OK 5초·멤버 3개 / build SKIP / walkthrough OK 2초 |
| 표 | **16개** (SPEC §2 그대로) · 컬럼 전부를 TS↔DB 로 대조 |
| 인덱스 | **5개** — SPEC §2 마지막 줄의 다섯을 이름까지 맞췄다 |
| enum | **14종** · 그중 **7종은 `@contextops/schema` 의 정본 표를 읽기만** 한다 |
| 마이그레이션 | `drizzle/0000_marvelous_storm.sql` 253줄 · **drizzle-kit 산출물**(손으로 안 썼다) |
| 새 시험 | `apps/web/test/migration.test.ts` **11개 초록** · 전체 71+112+11 = **194개** |
| 다른 파일 | `tools/ci.ps1` (+9 · 4층 · cwd) · `pnpm-workspace.yaml` catalog 4줄. `packages/` 는 **0건** |

**「마이그레이션이 로컬에서 적용됨」을 진짜로 쟀다 — PGlite 로.**
★ 왜 이게 중요한가 — 이 행의 완료 기준은 Supabase 계정이 있어야 잴 수 있다고 적혀 있었고,
그 계정은 사람이 만든다. 그래서 **다섯 바퀴 동안 「루프가 못 하는 것」으로 남아 있었다.**
PGlite(프로세스 안에서 도는 Postgres · WASM)는 Docker 도 계정도 없이 `drizzle/` 의 SQL 을
**그대로** 먹인다. 시험용 DDL 을 따로 쓰지 않는 것이 핵심이다 — 따로 쓰면 시험은 초록인데
배포는 막히는, 제일 나쁜 종류가 된다.

**「초록」이 「검사했다」인지 직접 확인했다 — 값을 뒤집어 3번 빨갛게 만들어 봤다.**

| 무엇을 뒤집었나 | 결과 |
|---|---|
| `repos` 에 컬럼 하나 추가하고 `db:generate` 를 **안** 돌림 | `FAIL repos 의 컬럼: Array(8) ≠ Array(9)` |
| `INDEX_NAMES` 의 이름 하나를 어긋나게 | `FAIL 인덱스 conflicts_project_status_WRONG 없음` (DB 인덱스 30개 중) |
| 계약 enum 을 손으로 베낀 것처럼 한 값 뺌 | `FAIL 계약 enum confidence: high,medium,low ≠ high,medium` |

셋 다 원복 후 **11개 초록**. 첫째가 제일 중요하다 — **「스키마만 고치고 마이그레이션을
안 낸」 상태를 잡는다.** 그게 이 층에서 제일 흔한 조용한 고장이다.

**제약이 실제로 막는지도 봤다** (표가 생긴 것과 그 표가 뭔가를 막는 것은 다르다):
없는 enum 값 INSERT 거부 / 같은 프로젝트에 같은 `semver` 두 번 거부 /
같은 `snapshot_hash` 두 버전 거부(P4) / 없는 프로젝트를 가리키는 항목 FK 거부.
같은 자리에 **옳은 값은 들어간다**는 것도 같이 봤다 — 안 그러면 「전부 막는 표」와 구별이 안 된다.

**enum 값을 손으로 적지 않았다.** `item_type`·`item_status`·`confidence`·`pack_target`·
`sync_status`·`progress_status`·`progress_source` 7종은 `@contextops/schema` 의 tuple 을
`pgEnum(...)` 이 **읽기만** 한다. 그리고 시험이 **DB 의 실제 enum 값**과 그 tuple 을
글자까지 대조한다 — 베껴 적어 갈라뜨리면 빨개진다.
DB 에만 사는 값 7종(`team_role`·`conflict_kind` 등)은 소비처가 DB·API 응답뿐이라
`schema.ts` 에 정본을 뒀다. **API 계약이 그 값을 쓰게 되는 순간 `packages/schema` 로 올려라.**

**`sync_status` 에 `unknown` 을 일부러 안 넣었다** — 그 값은 「보고가 없을 때 서버가
매기는 값」이라 행으로 저장되지 않는다. 넣으면 기기가 「모르겠다」고 **자칭**할 수 있게 되고,
「보고 없음」과 「모르겠다고 보고함」이 섞인다. 시험 한 줄로 잠갔다 (→ FINDINGS 16번).

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드 2종**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| `REPORTABLE_SYNC_STATUSES` 4종 | `SyncReport` 스키마 + **DB enum**(이번 바퀴) | 표에 없는 값은 INSERT 가 거부된다 — 시험이 잡는다 | **살아 있다** |
| **`SYNC_STATUSES` 의 `unknown`** | **만드는 코드가 0곳** (`GET /sync-status` 가 아직 없다) | 시험이 「4종 = 5종 − unknown」이라는 **관계**만 본다 | **구멍** → FINDINGS 16번 |

**루프 실주행 기준선** — `logs/cycles/*.jsonl` 의 마지막 result 줄 · `duration_api_ms` 기준

| | dry001·002 | c001 | c002 | c003 `8e02f48` | c004 `84ce3ea` |
|---|---|---|---|---|---|
| 시간 | 0.3분 · 0.3분 | 15.1분 | **result 줄 없음** | 30.2분 | **7.1분** |
| 턴 | 7 · 7 | 77 | (잘렸다) | 92 | **46** |
| 비용 | $0.42 · $0.41 | $6.28 | | $13.90 | **$3.05** |

⚠ **c001 은 이전 기록(9.5분·52턴·$4.02)과 다르다.** 이 표는 `duration_api_ms` 와
**마지막** result 줄을 읽었다 — c001 파일에는 result 가 둘 이상이고(재시도), 이전 바퀴는
다른 값을 봤다. **다음 바퀴는 이 기준(마지막 result · duration_api_ms)으로 이어 적어라.**
⚠ **c002 에는 result 줄이 아예 없다** — 그 바퀴는 끝나지 못하고 잘렸다.
⚠ **5·6바퀴는 `logs/cycles/` 에 파일이 없다.** 루프 러너가 아니라 직접 연 세션으로 돌았다.
c003(30분)이 제일 무거웠고 c004 는 7분으로 내려왔다 — **한 바퀴에 한 행**을 지키면 짧다.

## 눈 판정 대기

_(없음)_

**이번 바퀴에 눈으로 본 것** — 산출물이 SQL 이라 SQL 을 읽었다:
- `drizzle/0000_marvelous_storm.sql` 253줄을 **통째로 읽었다.** SPEC §2 의 표 이름·
  컬럼·enum 이 그대로 있고, 사람이 읽고 「이게 우리 DB 다」라고 말할 만하다
- **FK 가 `CREATE TABLE` 안이 아니라 `ALTER TABLE` 로 따로 나온다** — 그래서
  `projects.official_version_id ↔ context_versions.project_id` 순환이 실제로 만들어진다.
  걱정했던 자리인데 산출물을 열어 보고 확인했다
- `teams.settings` 의 기본값이 `'{"auto_apply":false,"auto_submit":false}'::jsonb` 로
  들어갔다 — 켜진 채로 시작하지 않는다
- 화면은 만들지 않았다. `packages/` 를 한 줄도 안 건드렸으므로 golden 은 그대로고
  3바퀴의 Pack 눈 판정이 그대로 선다

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| Supabase 프로젝트 생성 · `DATABASE_URL` 발급 | 계정·결제가 필요하다 | **🔴 지금.** 스키마·마이그레이션·`.env.example`·클라이언트 배선은 다 됐다 (`389c7f2`). 값만 꽂으면 P1 첫 행이 닫힌다 |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 | 계정 연결이 필요하다 | P5 |
| 실데이터 픽스처(`brain`) 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만 · SPEC §14 절삭 6번) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** 필요한 변수 목록은
`apps/web/.env.example` 에 있다 — 값은 `.env.local` 에만 산다 (P1).

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

- **`tools/ci.ps1` 을 하위 디렉터리에서 부르면 가짜 RED 였다.** FINDINGS 15번으로
  올리고 같은 바퀴에 고쳤다 (`7f904a2` — `Push-Location $root`). **가짜 초록만큼은
  아니어도 가짜 빨강도 게이트의 거짓말이다** — 무인 루프는 없는 고장을 한 바퀴 통째로 쫓는다.
- **`Object.values(모듈)` 로 drizzle 표를 걸러내면 타입 검사가 막힌다.** 모듈이
  표(`pgTable`)·enum·값 tuple 을 섞어 내보내서 유니온이 거대해지고,
  `is(v, PgTable)` 같은 타입 술어가 「매개변수 타입에 대입할 수 없다」로 죽는다.
  → `const exported: unknown[] = Object.values(schema)` 로 **먼저 받고** 거기서 좁혀라.
- **PGlite 는 Docker 없이 마이그레이션을 실제로 적용한다.** `new PGlite()` 는 메모리 DB 이고
  `pg.exec(sql)` 은 **여러 문장을 한 번에** 받는다. drizzle 의 `--> statement-breakpoint`
  는 그냥 SQL 주석이라 파일을 **쪼개지 말고 통째로** 먹여라 — 쪼개는 순간
  「배포될 SQL」이 아니라 「우리가 만든 SQL」을 시험하게 된다.
- **`gen_random_uuid()`·`jsonb`·`timestamptz`·enum 타입이 PGlite 에서 전부 돈다.**
  확장을 따로 켤 필요가 없었다 (PG 16 기준 core).
- 🔴 **파일을 셸 heredoc(`<<'EOF'`) 으로 쓰면 `\\` 가 `\` 로 접힌다.** 따옴표를 씌운
  heredoc 인데도 그렇다. `'\\|'` 로 적은 JS 문자열이 파일에는 `'\|'` 로 들어갔고,
  `'\|' === '|'` 이라 **escape 가 아무 일도 안 하게 됐다.** 정규식 안의 홑 백슬래시
  (`/\r\n?/`)는 멀쩡했다 — **`\\` 만 접힌다.**
  → 코드 파일은 **Write 도구로 써라.** 꼭 셸로 써야 하면 `String.raw` 를 쓰고,
  쓴 뒤에 `grep` 으로 백슬래시를 눈으로 확인해라. **조용히 틀리는 종류다.**
- **heredoc 을 여러 개 이어 붙이면 통째로 죽는다 — 그리고 파일이 하나도 안 생긴다.**
  5바퀴에 `cat > a <<'EOF' … cat > h <<'EOF'` 를 8개 이어 보냈다가
  `unexpected EOF while looking for matching '` 로 **8개 전부 0바이트**였다.
  앞의 3~4개는 만들어져 있을 거라고 착각하기 쉽다 — `ls` 로 확인하니 **디렉터리만** 있었다.
  → 코드 파일은 Write 도구로 하나씩. 셸 heredoc 은 **한 번에 한두 개**까지만.
- **`tools/principles.ps1` 은 주석도 센다.** `packages/compiler/src` 안에서는
  `Date.now(`·`Math.random(`·`process.env` 를 **주석에도 쓰면 안 된다** (P4 FAIL).
  게이트를 똑똑하게 만들려 하지 마라 — 무딘 게이트가 우회할 구멍이 없다.
  (⚠ `fixtures/` 는 principles 가 세지 않는다. paylab 코드에 `Date.now()`·`fetch()` 가
  있어도 초록인 게 맞다 — 그건 **픽스처가 흉내 내는 남의 저장소**다.
  ⚠ `apps/web/src` 는 P3 검사 대상이다 — `messages.create` 를 부르는 파일은
  `withBudget` 없이는 FAIL 이다)
- **`git commit` 이 「Author identity unknown」으로 죽었다.** 전역 `.gitconfig` 에
  `user.name` 만 있고 `user.email` 이 없었다. 이 저장소에 로컬로 박아 두고 지나갔다
  (`git config user.email rhdqngusanr@gmail.com`). **무인 세션은 물어볼 사람이 없어서
  여기서 통째로 막힌다** — 새 기계에서 루프를 켜면 제일 먼저 확인해라.
- **`.ps1` 을 고칠 때는 Edit 도구를 써라 — BOM 과 CRLF 를 그대로 둔다.** 6바퀴에
  `ci.ps1` 을 두 번 고치고 바이트로 확인했다: `CRLF 226 · bare LF 0 · BOM True`.
  **확인은 `file`·`grep`·`awk` 로 하지 마라** — Git Bash 의 그 도구들은 `\r` 을 삼켜서
  CRLF 226줄인 파일을 **「CRLF 0줄」로 보고한다.** 바이트로 세라:
  `python -c "d=open(p,'rb').read(); print(d.count(b'\r\n'))"`.
- **파이썬으로 `.ps1` 을 고치면 CRLF 가 LF 로 바뀐다.** `io.open` 은 텍스트 모드로
  읽을 때 줄바꿈을 LF 하나로 번역해 버린다. `.gitattributes` 가 `*.ps1 text eol=crlf`
  라서 `git add` 가 경고로 알려 줬다 — 읽을 때 `newline=''` 를 주고, BOM(`utf-8-sig`)과
  CRLF **둘 다** 지켜야 한다. (⚠ `.ts`·`.md` 를 파이썬으로 고칠 때도 `newline=''` 를
  줘라 — 6바퀴에 시험 파일을 그렇게 잠깐 뒤집었다 되돌렸다)
- **`pnpm -r` 은 멤버가 0개면 조용히 exit 0 이다.** FINDINGS 1번으로 올렸다.
- **pnpm 11 에서 설치 스크립트를 허용하는 키는 `allowBuilds` 다.**
  `onlyBuiltDependencies`·`ignoredBuiltDependencies` 는 `pnpm config get` 에는 보이는데
  **설치를 통과시키지 못한다.** FINDINGS 6번.
- **`z.toJSONSchema` 는 기본이 인라인이다.** 항목 10종 유니온이 통째로 복사돼
  `proposal.json` 이 109KB 가 됐다. `reused: 'ref'` 로 30KB — **산출물을 열어 보지 않으면**
  테스트는 초록인 채로 사람이 못 읽는 파일을 배포한다.
- **`as const satisfies Record<K, V>` 는 표를 읽는 쪽을 망가뜨린다.** 리터럴 타입이 남아서
  optional 필드(`heading` 없는 slot)를 **읽을 수 없다.** 표는 `const X: Record<K, V> = {…}`
  로 **타입을 명시**해라 — 키 누락 검사는 그대로 받고, 읽는 쪽은 한 가지 타입만 본다.
