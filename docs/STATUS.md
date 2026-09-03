# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 7바퀴 · `0a370d8` `5d26744`_

---

## 지금 어디인가

**P1 둘째 행(API 1군)이 끝났다. 다음은 P1 셋째 행(API 2군 + 발행 트랜잭션)이다.**
`apps/web` 이 **진짜 Next 앱**이 됐다 — 라우트 13개가 `next build` 산출 목록에 뜬다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | **API 2군** (proposals · publish · packs · sync · progress · roadmap) |
| `packages/schema` (계약 전부 + **API 계약** · 테스트 95) | 웹 화면 9개 (`app/` 에 `page.tsx` 자리 표시 하나뿐) |
| `packages/compiler` (파이프라인 7단계 · 테스트 112) | Supabase 프로젝트 (🙋 사람) · Vercel |
| **`apps/web` — Next 15 앱 · 라우트 13개 · 테스트 59** | `plugin/contextops` 의 bin·skills·hooks |
| `apps/web/src/db` (표 16 · 인덱스 5 · enum 14 · 마이그레이션 2) | 서버측 AI (`structureDocument`·`detectConflicts`) |
| `fixtures/paylab-*` · `plugin/contextops/schemas/*.json` 7개 | |

검사 층: `principles OK 6 · typecheck OK(멤버 3) · test OK(멤버 3) · build OK 15초 · walkthrough OK`.
🔴 **`build` 가 SKIP 에서 풀렸다.** 지난 바퀴가 「Next 앱이 붙으면 저절로 풀린다 —
안 풀리면 그게 고장이다」라고 적어 뒀고, 실제로 풀렸다.
walkthrough 는 2단계 그대로다 (`api`·`publish`·`payload`·`sync`·`shots` 는 아직 SKIP) —
**API 2군이 붙어야 관통이 늘어난다.**

## 다음 바퀴가 할 일

`docs/PLAN.md` **P1 셋째 행**: API 2군 + 발행 트랜잭션 (proposals · versions:publish ·
packs · sync-reports · progress · roadmap). **SPEC §2.1 · §5 · §6 이 정본이다.**

이번 바퀴가 깔아 둔 것을 그대로 쓴다 — **새 문을 만들지 마라**:

| 필요한 것 | 이미 있는 자리 |
|---|---|
| 요청 body 계약 | `packages/schema/src/api.ts` 의 `API_REQUESTS` 표에 한 줄 (전부 `.strict()`) |
| 에러 응답 | `fail('STALE_BASE')` — 상태는 `ERROR_STATUS` 표가 정한다. **숫자를 적지 마라** |
| 라우트 껍데기 | `route('POST /…', async (ctx) => …)` · `ctx.actor()` · `ctx.ok()` |
| 권한 | `requireProject(ctx.db, actor, id, 'owner'\|'member')` |
| 시험 | `test/helpers/db.ts` 의 `freshDb()`·`sessionJwt()`·`req()`·`params()` |

🔴 **`STALE_BASE`·`COMPILE_FAILED` 를 실제로 내는 순간 `test/error-codes.test.ts` 가
빨개진다.** 고치는 방법은 그 파일의 `WITHOUT_OWNER` 표에서 **그 줄을 지우는 것**이다.
그게 「정의만 있고 아무 일도 안 하는 코드」를 줄이는 장치다 — 표를 늘려서 초록을 만들지 마라.

⚠ **FINDINGS 20~26 은 대부분 「나중 행이 주인」이다.** 지금 열지 마라:
- **20·21·22·23** 은 SPEC 을 코드에 맞추는 **문서 한 줄짜리**다 — 아무 바퀴에서나 값싸다.
  ⚠ 20번(콜론 경로)은 **API 2군을 하기 전에** 닫는 게 낫다. `:submit`·`:publish` 를
  또 만나기 때문이다. 5분이다
- **24**(scan_summary 를 읽는 곳) → P3 둘째 행 · **25**(충돌→항목 상태) → P3 첫 행 ·
  **26**(zip·구조화 job) → P3 첫 행
- **16**(`unknown` 을 만드는 곳) → **바로 다음 행이다.** `GET /sync-status` 가
  보고 없는 기기에 `unknown` 을 매기게 배선하고 「보고 있는 기기 vs 없는 기기가 다른 값」을 잠가라
- **17**(SPEC §2 의 `failed`) · **14**(`.ps1` 두 개가 LF) 는 여전히 값싸다

## 잰 것

**7바퀴 · P1 둘째 행 — API 1군** (`0a370d8` · `5d26744`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK 6 / typecheck OK 5초 / test OK 26초·멤버 3 / **build OK 15초** / walkthrough OK |
| 라우트 | **13개** (`next build` 가 전부 `ƒ (Dynamic)` 로 낸다 — 컴파일만 된 파일이 아니다) |
| 새 시험 | **+72개** — web 11 → **59** · schema 71 → **95**. 전체 194 → **266** |
| 새 파일 | `packages/schema/src/api.ts` · `apps/web/src/lib/api/*` 8개 · 라우트 13개 · 시험 4개 |
| 마이그레이션 | `drizzle/0001_far_doctor_spectrum.sql` — 컬럼 9개 + 유일 제약 1 (drizzle-kit 산출물) |

**시험이 라우트를 「그대로」 부른다.** `route.ts` 의 export 를 표준 `Request` 와
`{params: Promise<…>}` 로 호출한다. 그러려면 DB 를 갈아 끼울 수 있어야 해서
`src/db/client.ts` 에 `setDbForTest()` 문을 하나 뒀고, `Db` 타입을 드라이버가 아니라
**드라이버들의 공통 조상**(`PgDatabase<PgQueryResultHKT, typeof schema>`)으로 잡았다.
★ 왜 중요한가 — 구체 타입으로 잡으면 라우트가 postgres-js 에만 맞아서 **시험에서 진짜
라우트를 못 부른다.** 그러면 핸들러 로직을 베낀 시험이 되고, 그건 배포되는 코드를 안 잰다.

**「빌드한 서버를 띄워서」 눈으로 봤다 — 그리고 거기서 고장을 하나 찾았다.**
`next start` 후 curl:

| 요청 | 고치기 전 | 고친 뒤 |
|---|---|---|
| 헤더 없이 `POST /teams` | **`INTERNAL` 500** | `UNAUTHORIZED` 401 |
| 헤더 없이 `GET /projects/{uuid}/context-items` | **`INTERNAL` 500** | `UNAUTHORIZED` 401 |
| `Bearer ctx_abc` (DB 없음) | `INTERNAL` 500 | `INTERNAL` 500 (**옳다** — 기기 토큰은 DB 가 있어야 판정한다) |
| `GET /health` | 503 `{ok:false,db:false}` | 그대로 |

원인은 라우트가 `requireActor(ctx.db, …)` 를 부르면서 **인자 평가 시점에 DB 를 먼저 연**
것이었다. 「자격증명이 없다」를 아는 데 DB 가 필요할 이유가 없다 → `ctx.actor()` 를
감싸기로 옮겨 **헤더 파싱(순수) → DB** 순서를 강제했다 (`5d26744`, FINDINGS 19).

**요청 로그를 실제로 열어 봤다** (P1 · SPEC §11):
```
{"kind":"request","request_id":"…","route":"GET /projects/{id}/context-items",
 "method":"GET","status":401,"latency_ms":0}
```
body·토큰·문서 본문이 없는 것은 물론이고 **경로의 uuid 조차 없다** — `route` 는 실제 경로가
아니라 **라우트 모양**이다. id 가 로그에 흩어지면 나중에 지울 수가 없다.

**게이트가 갈리는지 4번 확인했다** (전부 되돌렸다):

| 무엇을 뒤집었나 | 결과 |
|---|---|
| `[id]` 라우트에 `claude -p` 한 줄 | `P2 FAIL … devices\[id]\route.ts:39` — **고치기 전이면 초록이었다** |
| 같은 파일을 옛 방식(`Get-Content <경로>`)으로 읽어 봄 | **glob 0줄 / literal 39줄** — 침묵의 정체를 숫자로 봤다 |
| `error.ts` 에 `fail('STALE_BASE')` 한 줄 | `이제 내는 자리가 생겼다 — WITHOUT_OWNER 에서 지워라: STALE_BASE` |
| 시험의 항목 id 를 `item_ok` 로 (slug 3자 미만) | 계약이 거부해서 accepted 가 0 — `ItemId` 정규식이 실제로 막는다 |

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| **에러 코드 9종** | `ERROR_STATUS` 표 + 라우트 6곳 | 코드마다 상태·문구가 표를 따라간다 | **살렸다** → FINDINGS 12 ✅ |
| `CONFLICT_CHOICES` 4종 | `RESOLUTION_OUTCOME` 표 | 4개 선택 → **2가지 상태** · `choice` 는 그대로 남는다 | **살아 있다** |
| `SOURCE_DOCUMENT_KINDS` 6종 | `CreateDocument` | 표에 없는 `kind` 는 400 | **살아 있다** |
| `TEAM_ROLES` 2종 | `ROLE_RANK`·`ACTOR_MAX_ROLE` | 같은 요청이 member 403 / owner 201 | **살아 있다** |
| `devices.last_seen_at` | 인증 경로가 채운다 | 토큰을 쓰기 전 null → 쓴 뒤 값이 찬다 | **살렸다** |
| **`scan_summary`** | `repos.last_scan` 에 **쓰기만** 한다 | 읽는 코드가 0곳 | **절반** → FINDINGS 24 |
| `STALE_BASE` 등 4종 | 아직 0곳 | — | **주인을 표에 적어 뒀다** (다음 행이 지운다) |

**설계에서 한 판단 셋** — 다음 바퀴가 되돌리지 않게 이유를 남긴다:
- **기기 토큰은 owner 의 것이어도 member 까지다** (`ACTOR_MAX_ROLE` 표). 토큰은 파일에
  저장된 문자열이다. 주운 사람이 승인·발행까지 하면 토큰 하나가 팀 전체를 바꾼다.
  플러그인이 하는 일(batch-draft·proposal·progress·sync)은 SPEC §5 상 전부 member 다.
- **팀 밖의 사람에게 프로젝트는 403 이 아니라 404 다.** 403 이면 404/403 의 차이로
  「그 프로젝트가 존재하는가」를 캐낼 수 있다.
- **질문에 답할 때 `draft` 를 주면 항목이 생기고 안 주면 안 생긴다.** SPEC 은
  「답변 → 항목 생성」이라고만 적지만, 자유 문장을 타입별 `data` 로 구조화하는 것은
  §7.1(P3)의 일이다. **서버가 문장을 지어내지 않는다.**

**루프 실주행 기준선** — `logs/cycles/*.jsonl` 의 **마지막** result 줄 · `duration_api_ms`

| | dry001·002 | c001 | c002 | c003 `8e02f48` | c004 `84ce3ea` |
|---|---|---|---|---|---|
| 시간 | 0.3분 · 0.3분 | 15.1분 | **result 줄 없음** | 30.2분 | **7.1분** |
| 턴 | 7 · 7 | 77 | (잘렸다) | 92 | **46** |
| 비용 | $0.42 · $0.41 | $6.28 | | $13.90 | **$3.05** |

⚠ **5·6·7바퀴는 `logs/cycles/` 에 파일이 없다.** 루프 러너가 아니라 직접 연 세션으로 돌았다.
다음 바퀴가 러너로 돌면 이 표를 이어 적어라 (기준: 마지막 result · `duration_api_ms`).

## 눈 판정 대기

_(없음)_

**이번 바퀴에 눈으로 본 것** — 산출물이 API 라 **빌드한 서버를 띄워서** 봤다:
- `next build` 산출 목록에 라우트 13개가 전부 `ƒ (Dynamic)` 로 뜬다 — 파일만 있고
  라우트가 아닌 상태가 아니다
- 위 표의 curl 4종을 직접 읽었다. 봉투(`{data,meta}` / `{error}`)가 두 갈래 다 맞고,
  `request_id` 가 응답과 로그에 **같은 값**으로 있다
- 요청 로그 4줄을 열어 P1 을 확인했다 (위 참고)
- 화면은 만들지 않았다. `app/page.tsx` 는 「API 는 `/api/v1` 아래에 있다」한 줄짜리
  자리 표시다 — 없으면 `/` 가 404 라 「배포가 깨졌다」로 읽힌다.
  **`DESIGN_BRIEF` 토큰을 아직 하나도 쓰지 않았다** (화면은 P1 넷째 행이다)
- `packages/` 는 `schema` 에만 손댔고 컴파일러는 한 줄도 안 건드렸다 — golden 은 그대로고
  3바퀴의 Pack 눈 판정이 그대로 선다

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

- 🔴 **PowerShell 은 `[id]` 를 와일드카드로 읽는다.** Next 의 동적 구간 폴더가 정확히
  그 모양이다. `Get-Content <...>/[id]/route.ts` 는 **0줄**을 읽고, `-ErrorAction
  SilentlyContinue` 와 만나면 **조용히 통과**한다 — 그 라우트들만 P1·P2 검사를 안 받는다.
  `-Raw` 는 FileSystem 공급자의 동적 매개변수라 「Raw 라는 매개변수가 없다」는 엉뚱한
  오류로 죽는다(그나마 시끄러워서 낫다). → **경로는 언제나 `-LiteralPath`.** (FINDINGS 18)
- 🔴 **bash 도 `[id]` 를 글로브로 읽는다.** `git checkout -- apps/.../[id]/route.ts` 가
  `did not match any file(s)` 로 죽는다 — **따옴표로 감싸라.**
- **파이썬은 Git Bash 의 `/tmp` 를 못 본다.** Git Bash 의 `/tmp` 는
  `%TEMP%` 로 매핑되는데 네이티브 파이썬은 `/tmp` 를 `C:\tmp` 로 읽는다. bash 로 쓴 임시
  파일을 파이썬으로 읽으면 `FileNotFoundError` 다 — **저장소 안에 쓰고 지워라.**
- **`python - <<'PY'` 안에서 한글을 `print` 하면 죽는다** (`cp949` 인코딩 오류).
  `python -X utf8` 로 부르거나 한글을 찍지 마라. ⚠ **쓰기는 이미 끝난 뒤에 죽는다** —
  파일은 고쳐졌는데 오류만 보고 「실패했다」고 판단하지 마라.
- **워크스페이스 패키지의 의존성은 그 패키지에 적어야 한다.** `apps/web` 이
  `@contextops/schema` 를 통해 zod 타입을 쓰는데 `zod` 를 직접 안 적었더니
  `Cannot find module 'zod'` 하나가 **파일 전체를 `any` 로 만들어** 엉뚱한 오류
  20줄이 났다. pnpm 은 유령 의존성을 허용하지 않는다.
- **유니온 Zod 스키마의 `z.infer` 는 느슨하다** (`ContextItemDraft` → `unknown`).
  정밀한 타입은 `packages/schema` 가 mapped type 으로 **따로** 내보낸다.
  → 값과 타입을 따로 들여와라: `import { X }` + `import type { X as XType }`.
- **`ItemId` 는 `item_` 뒤에 3자 이상**이다 (`/^item_[a-z0-9_]{3,40}$/`).
  시험 픽스처를 `item_ok`·`item_p1` 로 짓다가 두 시험이 빨개졌다 — **계약이 실제로 막았다.**
- **`tools/ci.ps1` 을 하위 디렉터리에서 부르면 가짜 RED 였다** (`7f904a2`).
  ⚠ 이번 바퀴에도 밟았다 — Bash 도구의 cwd 는 `cd` 후에도 **남는다.**
  다음 명령이 엉뚱한 자리에서 돌아 「파일이 없다」가 난다. `cd` 를 쓴 다음 명령은
  절대 경로로 시작해라.
- **`Object.values(모듈)` 로 drizzle 표를 걸러내면 타입 검사가 막힌다.**
  → `const exported: unknown[] = Object.values(schema)` 로 **먼저 받고** 좁혀라.
- **PGlite 는 Docker 없이 마이그레이션을 실제로 적용한다.** `pg.exec(sql)` 은 여러 문장을
  한 번에 받는다. drizzle 의 `--> statement-breakpoint` 는 그냥 주석이라 **통째로** 먹여라.
  ⚠ 마이그레이션을 읽고 먹이는 절차는 이제 `apps/web/test/helpers/db.ts` **하나**다.
- 🔴 **파일을 셸 heredoc(`<<'EOF'`) 으로 쓰면 `\\` 가 `\` 로 접힌다.** 코드 파일은
  **Write 도구로 써라.**
- **heredoc 을 여러 개 이어 붙이면 통째로 죽고 파일이 하나도 안 생긴다.**
  ⚠ 이번 바퀴에도 밟았다 — `cat > a <<EOF … EOF` 와 `python - <<PY` 를 한 명령에 넣었더니
  **앞의 것이 안 만들어졌다.** 한 명령에 heredoc 하나.
- **`tools/principles.ps1` 은 주석도 센다.** `packages/compiler/src` 에서는
  `Date.now(`·`Math.random(`·`process.env` 를 **주석에도** 쓰면 안 된다.
  ⚠ **`packages/schema/src` 에서는 `patch`·`diff`·`memory`·`secret:` 등이 금지어다** —
  주석에도 못 쓴다. 그래서 SPEC 의 `patch` 필드를 코드는 `changes` 라고 부른다 (FINDINGS 22).
  게이트를 똑똑하게 만들려 하지 마라 — 무딘 게이트가 우회할 구멍이 없다.
  (⚠ `fixtures/` 와 `test/` 는 P1 검사 대상이 아니다. `apps/web/src` 는 P3 대상이다)
- **`.ps1` 을 고칠 때는 BOM 과 줄바꿈을 지켜라.** 파이썬으로 고칠 거면
  `encoding='utf-8-sig'` + `newline=''` **둘 다** 줘라. 확인은 `file`·`grep` 이 아니라 바이트로:
  `python -c "d=open(p,'rb').read(); print(d[:3]==b'\xef\xbb\xbf', d.count(b'\r\n'))"`.
- **`git commit` 이 「Author identity unknown」으로 죽었다.** 이 저장소에 로컬로 박아 뒀다
  (`git config user.email …`). 새 기계에서 루프를 켜면 제일 먼저 확인해라.
- **`pnpm -r` 은 멤버가 0개면 조용히 exit 0 이다** (FINDINGS 1). **pnpm 11 의 설치 스크립트
  허용 키는 `allowBuilds` 다** (FINDINGS 6). **`z.toJSONSchema` 는 기본이 인라인이다** —
  `reused: 'ref'`. **`as const satisfies Record<K,V>` 는 표를 읽는 쪽을 망가뜨린다** —
  표는 `const X: Record<K, V> = {…}` 로 타입을 명시해라.
