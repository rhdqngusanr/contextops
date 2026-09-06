# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-06 · 루프 72바퀴 · 코드 커밋 없음(문서만) · 제출서는 `4f90239`(67바퀴)_

---

## 지금 어디인가

**이번 바퀴(72)는 INBOX 순서 3 — FINDINGS 126(제출서)을 닫았다. 그런데 만든 게 아니라 「이미 있었다」를 확인한 바퀴다.**
`docs/SUBMISSION.md` 는 67바퀴가 `4f90239`(06:30)로 올렸다 — 그 바퀴는 INBOX 의 고장(127)이 위여서 대장의 상태 줄 · PLAN · INBOX 를 안 닫았고,
68~71 네 바퀴가 STATUS 의 「다음은 126」을 그대로 물려받았다. `tools/status-shape.mjs` 는 「대기를 가리키나」만 세므로 내내 초록이었다.
**코드 0줄 · 문서만.** PLAN 은 안 움직였다 — P6 둘째 행은 🙋 값(URL · 팀명 · 영상)이 와야 닫힌다.

🔴 **잰 것 — 제출서가 지금 코드와 맞는가.** 06:30 이후 다섯 바퀴(풀 · 오류 로그 · keep-all · focus-visible · Supabase 마이그레이션)가 지났으니
낡았을 수 있어 주장을 하나씩 코드에서 다시 봤다.

| 무엇 | 잰 값 |
|---|---|
| `docs/SUBMISSION.md` | 있음 · `4f90239` 는 HEAD 의 조상(`git merge-base --is-ancestor`) · 153줄 · README 저장소 지도에 한 행 |
| `apps/web/test/readme.test.ts` | **32/32** 초록 — README·제출서를 `DOCS` 표로 묶어 ①~④ 둘 다 + ⑥ 제출서 전용 7 |
| 크론 「매일 03:00(KST) 초기화」 | `apps/web/vercel.json` `0 18 * * *` UTC = 03:00 KST · `demo-reset.test.ts` 가 `DEMO_TENANT.resetAt` 과 대조 |
| 「관통 7단계」 | `.ci/walkthrough.json` ran **7** · failed 0 · checks 946 (16:46 · 71바퀴) |
| 「golden 3종」 | `packages/compiler/test/golden/` case-1-small · case-2-domains · case-3-overflow = **3** |
| 「principles 가 P1·P2·P3·P4·P6·P7 을 센다」 | `tools/principles.ps1` 에 P7 행(템플릿 태그 자리) 있음 — P5 만 눈 판정, README·KNOWN_LIMITATIONS 와 같은 말 |
| 「Skill 3(init · sync · propose) · 훅 2(SessionStart · Stop)」 | `plugin/contextops/skills/` 3 · `hooks.json` 이벤트 2 — 시험 ⑥ 이 디렉터리와 대조 |
| 「Claude API tool use · `withBudget()`」 | `lib/ai/client.ts` `tools:[…]` + `tool_choice:{type:'tool'}` · `budget.ts` 있음 |
| 「TypeScript 5 / Node 22 · Next 15 · Drizzle · PGlite · Zod · MIT」 | `engines.node >=22` · `@anthropic-ai/sdk`·`drizzle-orm`·`@electric-sql/pglite`·`zod` 의존 · `LICENSE` 첫 줄 MIT |
| 「production 이 아직 없다 · 모든 관통·데모·캡처는 PGlite 위」 | 그대로 참 — 71 은 Supabase 에 **마이그레이션만** 적용했고 그 위에서 화면을 연 적은 없다 (「눈 판정 대기」) |
| 제출서가 단 FINDINGS 번호 | 122 · 117 — 둘 다 **대기** (시험 ④). 126 은 제출서 본문에 없다 — 닫아도 안 빨개진다 |
| INBOX 순서 3 의 요구 「🙋 자리표시자를 명시」 | 머리의 🙋 표 **5행**(제출 팀명 · 공개 저장소 URL · production URL · 2분 영상 · 슬라이드) · 각 행에 「어디에도 같이 적나」 |
| 어긋난 곳 | **0** — 고칠 줄이 없어 제출서는 손대지 않았다 |
| 장부 | FINDINGS 126 ✅ `4f90239` · PLAN P6 둘째 행 ② · INBOX 순서 3 → 「끝난 것」 · 66 바퀴 기록을 `docs/history/cycles.md` 로 |
| CI | principles OK 9 · typecheck OK · **test FAIL** · build SKIP · walkthrough SKIP · docs OK → **RED** (17:06 · 17:10 두 번) — 아래 🔴 「CI 가 빨간 이유」. 코드 변화 0 · 같은 트리의 16:46(71바퀴)은 GREEN |

🔴 **CI 가 빨간 이유 — 코드가 아니라 부하다. 그래도 RED 는 RED 라 FINDINGS 136(고장)으로 적었다.** `apps/web` 32 파일 중 같은 10 파일의
**첫 시험**만 `Hook timed out in 10000ms` — 전부 `beforeEach` 의 `freshDb()`(PGlite 기동) 자리다. 16:50:55 에 사람의 게임 클라이언트가 떠서
CPU 74~80% 였고(16 논리코어 중 6코어쯤 · 사람이 쓰는 중이라 건드리지 않았다), 32 파일이 한꺼번에 PGlite wasm 을 띄우니(import 90~147초) 첫 훅이
17~18초가 됐다. **그 10 파일만 따로 돌리면 10/10 · 181개 초록 · 82초.** `vitest.base.ts` 에 `hookTimeout`·`maxWorkers` 가 없어 기본 10초다.
⚠ **이 바퀴는 코드 0줄 · 문서만이라 커밋했다** — 빨간 층이 재는 코드는 71 의 `adac632` 그대로이고, 이 바퀴가 바꾼 것을 재는 `docs` 층은 OK 다.
「검사를 통과하면 커밋」의 예외로 읽지 마라 — 코드를 바꾼 바퀴였다면 커밋하지 않았을 것이다. 다음 바퀴는 136 을 먼저 닫아야 CI 가 다시 말을 한다.

🔴 **배운 것 — 「고친 커밋」과 「장부를 닫는 커밋」은 다른 커밋이고, 둘째를 빼먹으면 게이트가 못 잡는다.** 67바퀴는 코드 커밋(`4f90239`)을
올리고 바로 INBOX 의 고장(127)으로 갔다. status-shape 의 ② 는 「가리키는 항목이 대기인가」이지 「대기인 항목이 실은 이미 커밋됐는가」가
아니다. 같은 일이 한 번 더 나면 게이트로 올린다 — 「FINDINGS N 이 대기인데 `git log` 의 메시지에 `FINDINGS N)` 이 든 커밋이 HEAD 에
있으면 FAIL」. 지금은 한 번이라 규칙만 적는다 (`loop/PROMPT.md` ④3 「고친 항목은 지우지 말고 ✅ 와 커밋 해시를 적는다」가 이미 그 규칙이다).

🔴 **2-B 이번 라운드 — `enforcement` 4종은 살아 있고 잠겨 있다.** ① 소비처: `packages/compiler/src/sections.ts` 의 `ENFORCEMENT_LABEL`
표(4/4 값 → 말) 를 policy 줄 「강제: …」 가 읽는다 ② `packages/compiler/test/liveness.test.ts:77` 이 hook·review·permission·none 넷을
전부 돌려 출력이 갈리는지 잰다 · golden 입력은 셋(review·hook·permission)을 덮는다. 새로 적을 것 없음.

**다음 바퀴의 일 — FINDINGS 136**

<!-- 🔴 이 줄이 **다음 할 일을 말하는 유일한 자리**다 (FINDINGS 102).
     모양을 지켜라: `**다음 바퀴의 일 — FINDINGS <번호>**` (대기가 없으면 「FINDINGS 없음」).
     `tools/status-shape.mjs` 가 ① 이런 줄이 **하나**인지 ② 그 번호가 FINDINGS 에서
     **대기**인지를 센다. 닫힌 항목을 가리키면 `tools/ci.ps1` 의 `docs` 층이 FAIL 이다.
     ⚠ 「다음 할 일」을 여기 말고 다른 데 또 적지 마라 — 그게 102 의 고장이었다.
     ⚠ 지나간 바퀴의 지목은 **다른 낱말**로 적어라 (「그 바퀴가 다음으로 지목한 것」). -->

🔴 **136 이 먼저다 — 고장(CI RED)은 INBOX 순서보다 위다 (④3 ①).** `vitest.base.ts` 한 곳에 `hookTimeout`(또는 `maxWorkers`) — 이유를 옆에 적고,
부하 있을 때·없을 때 각 한 번 `pnpm --filter web test` 초록이면 닫는다. ⚠ 파일마다 상한을 흩지 마라. 게임이 꺼져 있어 첫 CI 가 그냥 초록이어도
**136 은 닫히지 않는다** — 재현이 안 되면 `Start-Job` 으로 CPU 를 바쁘게 만들어서라도 「부하에서도 초록」을 한 번 봐라.

그 다음이 **INBOX 순서 4 — 미해결 FINDINGS 를 구멍 → 격차 순으로.** 구멍 중 **122** 는 🙋 두 값(공개 저장소 URL · 제출 팀명)이 와야 하고,
**117**(`POST …/ask`)은 SPEC §14 **절삭 1번**이자 P3(🙋 Anthropic 키)의 몫이라 지금 만들면 픽스처 답만 내는 문이 된다 — 그래서 그 다음 구멍
**115**(CLI 가 찍는 제안 주소가 앱에 없는 `/p/{id}/…` 라 눌러도 404)부터. 115 의 「고칠 방향」 ①(주소를 안 찍고 「웹의 제안 탭에서 볼 수 있다」)이
싸고 주소 정본(slug)을 하나로 지킨다 — ② 전달 라우트는 주소를 둘로 만든다. 그 다음 구멍 114 · 113 · 111 · 110 · 108 · 106 · 105 · 104 · 103
→ 격차 121+135 · 119 · 118 · 116 · 112 · 131 · 132 · 133 · 134.

> **115 를 하는 법** — `plugin/contextops/src/cli/propose.ts`(번들 `bin/contextops-cli.mjs` 는 빌드 산출물 · 직접 고치지 마라)에서
> `${config.api_origin}/p/${config.project_id}/proposals/${id}` 줄을 찾아 정본은 SPEC §8.4 · §9(주소는 slug). 시험은 `plugin/contextops/test/`
> 의 `propose.test.ts` 에 「찍은 출력에 `/p/` 주소가 없다」 한 줄. 번들은 `plugin/contextops/package.json` 의 `build`(`tsx scripts/build.ts`) 로 다시 만든다.

- PLAN 의 `- [ ]` 중 남은 것 다섯: P3 첫 행(🙋 Anthropic 키) · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 🙋 URL·팀명).
  **루프가 혼자 닫을 수 있는 PLAN 행은 이제 없다** — 그래서 INBOX 순서 4 가 이 바퀴 뒤의 일이다.
- 대장의 대기(**136 고장** · 122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 113 · 112 · 111 · 110 · 108 · 131~135 …) — 136 만 고장이고 나머지는
  **PLAN 을 막지 않는다.**

---

### 지난 바퀴 (71) — 마이그레이션을 Supabase 에 실제로 · 표 18 · 인덱스 8 (INBOX 순서 2 · PLAN P1 첫 행 · `adac632`)

**71바퀴는 INBOX 순서 2 — PLAN P1 첫 행(DB 스키마 · Drizzle 마이그레이션 + Supabase 연결)을 닫았다** (`adac632`). P0 부터 열려 있던 행이다 —
루프 몫(PGlite 적용 · `389c7f2`)은 끝나 있었고 「Supabase 연결」 한 조각이 사람 몫이었는데, 사람이 `.env.local` 에 값을 꽂아 줘서 이번에 **배포 DB 에
실제로 적용**했다. **PLAN 이 한 칸 움직였다 — P1 은 전부 `- [x]`.** INBOX 의 다음은 순서 3(FINDINGS 126 · 제출서)이다.

🔴 **잰 것 — Supabase 가 말하는 수다.** 짐작이 아니라 `information_schema.tables` · `pg_indexes` · `pg_type` 에서 셌다
(`docs/evidence/2026-09-06-supabase-migrate/` — `status-before.txt` · `migrate.txt` · `status-after.txt` · `migrate-again.txt`).

| | 전 (`db:status` · 돌리기 전) | 후 (`db:migrate`) | 다시 (`db:status` → `db:migrate`) |
|---|---|---|---|
| 서버 | PostgreSQL **17.6** · `aws-0-ap-northeast-2.pooler.supabase.com:5432` (Session pooler · IPv4 — 직결은 IPv6 전용이라 이 망에서 안 뚫린다) | 같음 | 같음 |
| `drizzle.__drizzle_migrations` 장부 | **없음** (표 자체가 없다) | **7** 행 (+7) | 7 (+0) → 7 (+0) |
| 남은 마이그레이션 (drizzle 의 셈법 — 장부 마지막 시각보다 뒤인 파일) | 7 | **0** | 0 → 0 |
| `information_schema.tables` (public · BASE TABLE) | 0 | **18** = `src/db/schema.ts` 의 `pgTable` 18 (손으로 센 수가 아니라 `is(v, PgTable)` 로) | 18 |
| `pg_indexes` ∩ `INDEX_NAMES` | 0/8 | **8/8** | 8/8 |
| enum (`pg_type` typtype = e) | 0 | **17** | 17 |
| 장부 hash ≠ 파일 hash (drifted) | 0 | 0 | 0 |
| NOTICE | — | **1** — `source_documents_current_version_id_source_document_versions_id_fk` 66자 → Postgres 가 63자로 자른다 (참조하는 곳 0 · PGlite 도 같다 · 기능 영향 없음 · FINDINGS 로 안 올렸다) | — |
| 문 | `db:generate` 뿐 (migrate 없음) | `db:status`(**읽기만**) · `db:migrate` — `apps/web/scripts/migrate.ts` 하나 · 접속 문자열은 호스트:포트/DB 까지만 찍는다 (P1) | |
| 시험 | 0 — 이 길(postgres-js migrator)을 지나는 시험 없음 | `test/migrate-script.test.ts` **4** — pglite-socket → TCP → postgres-js 로 ① dryRun 은 장부 표조차 안 만든다 ② 적용 7 · 표 = TS · 인덱스 8/8 ③ **다시 돌리면 +0** ④ migrator(`--> statement-breakpoint` 로 쪼갬)와 시험 helper(통째로)가 만든 컬럼·인덱스·enum 이 같다 | |
| 웹 시험 파일 | 92 | **93** | |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough 946 · docs → GREEN (`adac632`) | |

🔴 **「표 16 · 인덱스 5」는 낡은 수였다.** INBOX·PLAN 완료 기준의 수치는 P0(`389c7f2`) 때 것이고, P3 가 `ai_usage`·`ai_jobs` 표와 인덱스 셋을
더해 정본 `INDEX_NAMES` 는 8, 표는 18 이다 (`test/migration.test.ts` 가 이미 18·8 을 센다). 요청서의 수를 그대로 「확인했다」고 적지 않고
정본과 대조했다 — 요청서가 낡을 수 있다는 것도 「SPEC 은 의도, 코드는 현실」의 한 갈래다.

🔴 **`drizzle-kit migrate` 가 아니라 drizzle-orm 의 migrator 다.** kit 는 config 에 `dbCredentials` 가 있어야 하고 그러면 `generate` 까지 env 를
요구한다. orm 의 migrator 는 같은 `drizzle/` 폴더·같은 journal 을 읽고 `drizzle.__drizzle_migrations` 에 적는다 — 그래서 **두 번 돌려도 +0**
이고, 스크립트는 거기에 「적용된 파일의 hash 가 장부와 다르면 멈춘다」(drizzle 자신은 마지막 시각만 본다)를 더했다. `.env.example` 의
「pooler 로 돌리지 마라」는 반만 맞았다 — Transaction pooler(6543)만 안 되고 **Session pooler(5432)는 된다.** 고쳤다.

🔴 **INBOX 가 그 사이 다섯을 더 적었다** (🟡 A~E · Linear·Vercel·Stripe 와 나란히 본 것). **FINDINGS 131~135** 로 옮겼다 — 전부 [격차] ·
주인 PLAN P4 둘째 행. **손대지 않았다** — INBOX 순서 3(126) → 4(구멍 → 격차)가 먼저다. 70바퀴가 눈에 걸렸다고만 적은 「게스트에게 발행 모달이
열린다」도 135(E) 안에 넣었다 (121 과 같은 바퀴에 닫는다).

⚠ **안 한 것** — Supabase 위에서 `next dev` 를 띄워 화면을 연 적은 없다 (마이그레이션만 · 표는 비어 있다 — 데모 테넌트는 Cron 리셋 문이 심는다).
`SUPABASE_JWT_SECRET` 도 꽂혀 있으니 **실제 Supabase Auth 로그인**이 이제 돌 수 있는 상태다 — 「눈 판정 대기」에 적었다.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 126(제출서) → 72바퀴가 닫았다 — 만든 게 아니라 `4f90239`(67바퀴)에 **이미 있던 것**을 확인하고
장부를 닫았다. 아래는 71 이 남긴 지목의 원문이다.

🔴 **INBOX 순서 3 이 126 이다** — 제출서(SPEC §16)를 `docs/SUBMISSION.md` 로 · 🙋 공개 저장소 URL · 팀명 · 영상 링크는 **자리표시자**로 두고 그 자리를
명시한다. 126 은 구멍이고 주인은 PLAN P6 둘째 행이라 ④3 ② 로도 맞다 (P3·P5 의 남은 행은 🙋 키·계정). 그 다음 순서 4: 미해결 FINDINGS
**구멍**(122 · 117 · 115 · 114 · 113 · 111 · 110 · 108 · 106 · 105 · 104 · 103 …) → **격차**(121+135 · 119 · 118 · 116 · 112 · 131 · 132 · 133 · 134 …).

> **126 을 하는 법** — 재료는 `docs/SPEC.md` §16 과 README(66바퀴가 랜딩과 글자 그대로 대조해 둔 것 · `apps/web/test/readme.test.ts` 15개).
> §16 의 「(4) 승인 항목만 근거로 답하는 질의」는 **문이 없다**(FINDINGS 117 · `POST …/ask` 0곳) — 빼거나 `docs/KNOWN_LIMITATIONS.md` 를 가리켜라.
> 없는 것을 적지 않는다. readme.test 의 대조(랜딩 문장 · 경로 실존 · FINDINGS 번호가 대기인가)를 제출서에도 넓혀라. **한 바퀴에 하나.**

- PLAN 의 `- [ ]` 중 남은 것 다섯: P3 첫 행(🙋 Anthropic 키) · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행.
  **P1 은 전부 닫혔다.** 사람이 막는 것은 「막힌 것」 표 — Supabase 행은 이번에 지웠다.
- 대장의 대기(126 · 122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 113 · 112 · 111 · 110 · 108 · 131~135 …)는 **PLAN 을 막지 않는다** — 고장은 없다.


---

### 지난 바퀴 (70) — 키보드 포커스 링 한 곳 · 탭을 눌러 찍었다 (INBOX 2026-09-06 ④ · FINDINGS 130 · `1bc1da3`)

**이번 바퀴(70)는 INBOX 순서 ④ — FINDINGS 130(격차 · 키보드 포커스가 안 보인다)을 닫았다** (`1bc1da3`). INBOX 가 옮겨 준 결함 넷
(127·128·129·130)이 **전부 닫혔다.** PLAN 은 이 바퀴에 안 움직였다 — INBOX 의 다음은 순서 2(PLAN P1 첫 행 · 마이그레이션을 Supabase 에 실제로)다.

🔴 **잰 것 — `:focus-visible` 한 줄로 34개 요소가 탭에 링을 얻었고 마우스엔 안 뜬다.** 짐작이 아니라 **탭을 눌러** 찍었다
(`docs/evidence/2026-09-06-focus-visible/` · `focus-cdp.mjs` 가 CDP 로 Tab 을 보내고 `activeElement.matches(':focus-visible')` 과 계산된 outline 을
읽는다 · Node 22 내장 WebSocket 뿐 · 프로필은 매번 새것 = 시크릿 창).

| | 전 (`0a3535e`) | 후 (`1bc1da3`) |
|---|---|---|
| `:focus-visible` 규칙 (스타일시트에서 셈 · 사람이 잰 방법 그대로) | **0** | **2** (`:focus-visible` · `.pack-line:focus-visible`) |
| `:focus-visible` 없이 `outline: none` 인 규칙 | **1** (`.input:focus, .textarea:focus, .select:focus`) | **0** — 입력은 테두리 색만 바꾼다 |
| 탭으로 간 요소 (landing 3 · context 9 · packs 22) | 링 없음 | **34/34** `focus-visible=true` · `outline solid 2px rgb(123,156,255)`(= accent-ink) · offset 2px |
| `.scroll-x` 안의 폭 100% 행(`.pack-line`) | — | offset **-2px** 안쪽 링 — 네 변이 다 보인다 (`packs/p2-tab-18.png`) |
| accent 바탕의 주요 버튼 · 선택된 내비(accent-soft) 위 | — | 2px 간격에 bg 가 보여 링이 갈린다 (`landing/tab-02.png` · `context/tab-03.png`) |
| 마우스 대조군 (포커스 없던 [발행하기] 를 클릭) | — | `focus-visible=false` · outline none (`control/mouse-click.png`) — `:focus` 였으면 떴다 |
| 정본 | DESIGN_BRIEF §3 에 없음 | §3 「접근성」 절 — 시험이 문서 ↔ 코드 양방향 대조 |
| 시험 | `design-tokens.test.ts` 10 | **13** (+3) — `outline: none` 을 되살리면 ② 가 빨갛다 (직접 확인) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough 942 · docs → GREEN (`1bc1da3`) |

🔴 **127 의 「브라우저로는 아직 안 봤다」를 부분으로 닫았다.** 같은 서버(`demo:db` + `next dev`)에서 **새 프로필**(= 시크릿 창)로 `/demo` 를
열자 `POST /demo/session` 201 → context 가 **항목 15개 표 · v1.1.0 공식 칩** 으로 그려졌고(`context/tab-09.png`), packs/1.1.0 은 파일 8 ·
CLAUDE.md 본문 · 「받은 기기 10 / 12」. next 로그 5xx **0** · `kind:"error"` **0** · `GET /teams` 4~9ms(전엔 30초 500) · demo:db 「줄을 섰다」 **0**.
⚠ 못 본 것: proposals · roadmap(aria-busy 가 내려오나) · sync — 같은 스크립트의 둘째 url 만 바꾸면 된다 (「눈 판정 대기」).
⚠ 눈에 걸린 것 하나: 게스트(읽기 전용)가 [발행하기] 를 누르면 **발행 모달이 열린다** (`control/mouse-click.png`). 서버는 막겠지만(`ACTOR_RULES` 의
`writes`) 화면이 먼저 「할 수 있다」고 말한다 — 격차다. 새 FINDINGS 로 적지 않았다: 한 바퀴에 하나고, 주인은 PLAN P4 둘째 행이다. 다음에 그 행을 볼 때.

**그 바퀴가 다음으로 지목한 것 = INBOX 순서 2 · PLAN P1 첫 행** → 71바퀴가 닫았다 (`adac632`). 아래는 70 이 남긴 지목의 원문이다.


🔴 **「없음」은 고장이 없다는 뜻이다 — 대기 항목은 있다(126 · 122 · …).** INBOX 순서가 그 위다: 130 까지 닫혔으니 다음 바퀴의 일은
**INBOX 순서 2 · PLAN P1 첫 행**(마이그레이션을 Supabase 에 실제로 돌려 표 16 · 인덱스 5 를 확인하고 행을 닫는다 · INBOX 가 「`.env.local` 에
값이 꽂혀 있고 접속도 확인됐다」고 한다) → 순서 3 · FINDINGS 126(제출서) → 미해결 FINDINGS 구멍 → 격차.
⚠ P1 첫 행이 실패하면 **원인을 적고 멈춘다** — 지어내지 마라. 54·64바퀴도 같은 뜻으로 「없음」을 썼다.

> **P1 첫 행을 하는 법** — 마이그레이션 파일은 `apps/web/drizzle/*.sql` 7개 · 설정은 `apps/web/drizzle.config.ts`. package.json 에는
> `db:generate`(drizzle-kit generate)뿐이고 **migrate script 가 없다** — `drizzle-kit migrate` 를 `.env.local` 의 `DATABASE_URL`(Session pooler ·
> IPv4 · 비밀번호 `%40` 인코딩)로 부르거나 script 를 한 줄 더한다. SPEC §2 는 의도, `src/db/schema*.ts` 가 현실 — 먼저 코드를 봐라.
> 끝나면 `information_schema.tables` 로 표 16 · `pg_indexes` 로 인덱스 5 를 **세어** STATUS 에 적고 PLAN 행을 `- [x]` 로.
> ⚠ Supabase 에 실제로 쓴다 — 같은 값을 두 번 돌려도 무해한지(`__drizzle_migrations` 표) 먼저 확인해라.

- PLAN 의 `- [ ]` 중 **위의 셋은 사람이 막고 있다** (🙋 Supabase — 값은 꽂혔다고 한다 · 🙋 Anthropic 키 · GATE 3).
- 대장의 대기(126 · 122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 112 · 111 · 108 · 69 · 25 · 33 …)는
  **PLAN 을 막지 않는다** — 고장은 없다.


---

### 지난 바퀴 (69) — 한글 keep-all · 68 의 미커밋 올림 (INBOX 2026-09-06 ③ · FINDINGS 129 · `0a3535e`)

**이번 바퀴(69)는 둘을 했다.** ① 68바퀴가 CI 를 배경으로 띄운 채 끝나 **커밋하지 못한** FINDINGS 128(오류 로그의 표)을 같은 트리에서
앞단 CI(GREEN · 관통 936)를 돌려 그대로 올렸다 (`9319617` 코드 · `a1a26af` 문서). ② INBOX 순서 ③ — **FINDINGS 129(격차 · 한글이 낱말
중간에서 잘린다)** 를 닫았다 (`0a3535e`). INBOX 가 PLAN 보다 위고, 129 는 격차지만 INBOX 가 「이번만 PLAN P4 둘째 행의 몫으로」라고 했다.
PLAN 은 이 바퀴에 안 움직였다.

🔴 **잰 것 — `body` 한 줄로 헤드라인과 에러 카드가 낱말 경계에서 접힌다.** 짐작이 아니라 찍었다 (`docs/evidence/2026-09-06-keep-all/`).

| | 전 (`a1a26af`) | 후 (`0a3535e`) |
|---|---|---|
| `globals.css` 의 `html, body` | `word-break` 없음(= normal) — 한글이 글자 사이 아무 데서나 접힌다 | `word-break: keep-all; overflow-wrap: break-word` — 시안 `design/*.dc.html` 의 `body` 와 같은 값 |
| 랜딩 헤드라인 (1280) | 「…기억을 같 / 은 방향으로」 (INBOX 가 본 것) | 「팀의 지식과 Claude의 기억을 / 같은 방향으로」 (`landing-1280.png`) |
| 랜딩 (375 · iframe) | — | 「팀의 지식과 / Claude의 기억을 / 같은 방향으로」 · 본문·카드 전부 낱말 경계 · 가로 넘침 0 (`landing-375-frame.png`) |
| 에러 카드 (1280) | 「잠시 후 다시 시 / 도해주세요」 | 「잠시 후 다시 / 시도해주세요.」 (`demo-1280.png`) |
| mono 예외 (`.tree-item` break-all · `.pack-linetext`·`.diff-text` break-word) | 그대로 | 그대로 — 시험이 거기 `keep-all` 이 안 들어왔음을 센다 |
| 정본 | DESIGN_BRIEF §3 에 없음 (시안에만) | DESIGN_BRIEF §3 「타이포」 한 줄 — 시험이 문서 ↔ 코드 양방향으로 대조 |
| 시험 | `design-tokens.test.ts` 7 | **10** (+3) — CSS 를 stash 하고 돌리면 ① 이 빨갛다 (직접 확인) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough 939 · docs → GREEN (`0a3535e`) |

🔴 **128 의 「`next dev` 에서 다시 찍지 않았다」도 닫았다.** 같은 서버(DATABASE_URL 을 닫힌 포트 `127.0.0.1:1` 로 — Supabase 를 안 건드리고
에러 카드를 보려고)에서 `/demo` 를 열자 stdout 에 `{"kind":"error",…"name":"DrizzleQueryError","message":"(질의문이 든 message 는 남기지 않는다 — P1)",
…"cause":{…"code":"ECONNREFUSED"…}}` 가 찍혔고 `request_id` 가 화면의 에러 카드와 같았다. 배포 드라이버(postgres-js) 길에서도 모양이 같다
(`docs/evidence/2026-09-06-keep-all/probe.txt`).

⚠ **못 본 것** — 375 의 에러 카드(iframe 안의 fetch 가 virtual-time 안에 안 끝나 스켈레톤만 찍혔다 · 1280 으로 판정했다) · 진짜 `demo:db` 위의
데모(127 의 「눈 판정 대기」는 그대로다).

**그 바퀴가 다음으로 지목한 것 = FINDINGS 130** → 70바퀴가 닫았다 (`1bc1da3`).


🔴 **INBOX 가 정한 순서다** — 130(격차 · `:focus-visible` 0개) → PLAN P1 첫 행(마이그레이션을 Supabase 에 실제로) → 126(제출서) →
미해결 FINDINGS 구멍 → 격차. 130 은 격차지만 INBOX 가 「이번만 PLAN P4 둘째 행의 몫으로 같이 닫아라」고 했다 — 랜딩·데모가 심사의 첫 화면이다.

> **130 을 고치는 법** — `globals.css` 의 `.input:focus, .textarea:focus, .select:focus { outline: none; … }` 을 `:focus-visible` 로 바꾸고,
> 토큰 옆 한 곳에 `:focus-visible { outline: 2px solid var(--accent-ink); outline-offset: 2px }` (버튼·링크·입력·행이 읽게). 시험은
> `test/design-tokens.test.ts` 에 「`:focus-visible` 규칙이 있고 `outline: none` 이 `:focus-visible` 없이 홀로 있는 선택자가 0개」 — 129 의
> ⑤ 블록 옆이 그 자리다. 화면은 headless Chrome 으로 찍을 수 있다 (「밟은 함정」의 375 함정을 보라) — 탭 포커스는 `--screenshot` 으로
> 못 잡으니 규칙의 존재는 시험이, 모양은 사람이 본다. **한 바퀴에 하나씩.**

- PLAN 의 `- [ ]` 중 **위의 셋은 사람이 막고 있다** (🙋 Supabase · 🙋 Anthropic 키 · GATE 3). INBOX 2번(P1 첫 행)은 「`.env.local` 에
  Supabase 값이 꽂혀 있고 접속도 확인됐다」고 한다 — 130 다음에 그 행이다. ⚠ 실패하면 원인을 적고 멈춘다.
- 대장의 대기(130 · 126 · 122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 112 · 111 · 108 · 69 · 25 · 33 …)는
  **PLAN 을 막지 않는다** — 고장은 없다.

---


### 지난 바퀴 (68) — 오류 로그의 표 · 원인은 남고 질의문은 안 남는다 (INBOX 2026-09-06 ② · FINDINGS 128 · `9319617`)

**68바퀴는 INBOX 순서 ② — FINDINGS 128(고장 · 오류 로그에 메시지도 스택도 없다)을 닫았다** (`9319617`).
INBOX 가 PLAN 보다 위고, 128 은 사람이 고장으로 분류했다(127 에서 그 대가를 치렀다). PLAN 은 이 바퀴에 안 움직였다 —
INBOX 의 다음은 129(`keep-all`) → 130(`:focus-visible`) → PLAN P1 첫 행(마이그레이션을 Supabase 에) → 126(제출서) 다.

🔴 **잰 것 — 127 의 로그 `{"kind":"unhandled","error":"Error"}` 에서 「Error」는 drizzle `DrizzleQueryError` 의 기본 name 이었다.**
drizzle 0.45 는 **모든** 드라이버 예외를 `DrizzleQueryError(query, params, cause)` 로 감싸고 `this.name` 을 안 정한다. 그래서 저 한 낱말은
「DB 질의가 죽었다」였고 원인(`CONNECT_TIMEOUT`)은 `cause` 에 있었는데 아무도 못 읽었다. 그리고 그 껍데기의 **message 가
`Failed query: <sql>
params: <값>`** 이다 — `console.error(err)` 한 줄로 고쳤으면 질의문이 로그로 새는 P1 사고였다.
그 사이의 자리가 `lib/api/log.ts` 의 **오류 로그 표**다 (`docs/evidence/2026-09-06-error-log/probe.txt`).

| | 전 (`2134011`) | 후 (`9319617`) |
|---|---|---|
| 500 이 될 예외의 로그 | `{"kind":"unhandled","error":"Error"}` — 이름 한 낱말 | `{"kind":"error", request_id, route, error:{name, code?, message, stack[≤3], cause?{…}}}` — `request_id` 가 바로 다음 `request` 줄과 같다 |
| drizzle 껍데기의 `name` | `Error` (클래스가 `this.name` 을 안 정한다) | 클래스 이름 `DrizzleQueryError` (`name` 이 기본값이면 `constructor.name`) |
| 원인 | 어디에도 없음 | `error.cause` — ① 없는 표: `code: "42P01"` + `relation "no_such_table" does not exist` ② 연결: `code: "CONNECT_TIMEOUT"` + `write CONNECT_TIMEOUT 127.0.0.1:5432` |
| 질의문·매개변수 | 0 (이름만 남겨서) | **0** — 껍데기의 message 는 자기 `query` 를 품어서 통째로 뺀다(뺐다고 표시) · `query`·`params`·`parameters`·`detail`·`hint`·`where`·`internal_query` 는 `drop` · 시험이 **직렬화된 한 줄 전체**에 `select`·매개변수·`Failed query` 가 없음을 잰다 |
| 표 | 없음 (`toApiError()` 안의 `console.error` 한 줄) | `ERROR_FIELD_RULES` **12행** — keep 2 · scrub 1 · frames 1 · chain 1 · drop 7 · 표에 없는 필드는 안 남는다(allowlist). `toApiError()` 는 `logError(describeError(err))` 만 부른다 |
| 시험 | 0 | `test/error-log.test.ts` **21개** — 진짜 drizzle 질의(PGlite)로 죽인 라우트 1 · 연결 오류 2 · **표의 행마다 「값을 넣으면 로그가 갈린다」 12** · allowlist · scrub 양면 · 200자 · cause 깊이 3(순환) · non-Error · 4xx 는 error 줄 0 |
| 상수 | — | `MESSAGE_MAX_CHARS` 200 · `STACK_FRAMES` 3 · `CAUSE_DEPTH` 3 · `MESSAGE_SCRUBBED` — 한 곳 |
| SPEC §11 | 「로그: request_id·route·status·latency·id 만」 | 오류 로그 한 줄 추가 — 남기는 것·안 남기는 것·표의 자리 |
| 웹 시험 파일 | 91 | **92** |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough 936 · docs → GREEN (`9319617` · 69바퀴가 앞단에서 돌려 확인) |

🔴 **PGlite 의 예외는 name 이 소문자 `error` 다** — 로그의 `cause.name: "error"` 는 오타가 아니다. 배포(postgres-js)에서는 `PostgresError` 다.

⚠ **`next dev` 서버에서 다시 찍지는 않았다** (68바퀴 시점). → **69바퀴가 찍었다** — 같은 모양 · `cause.code: ECONNREFUSED` · `request_id` 가 화면의 에러 카드와 같다 (`docs/evidence/2026-09-06-keep-all/probe.txt`). 아래는 68 의 원문이다. 위 두 줄은 vitest 프로세스 안에서 같은 `route()` → 같은 `log.ts` 로 찍은 것이다
(INBOX 가 본 로그는 `next dev` stdout). 같은 코드 길이라 모양은 같지만, 「눈 판정 대기」에 한 줄 남겼다 — 129·130 을 브라우저로 볼 때
`demo:db` 를 끄고 화면을 열어 보면 `kind:"error"` 줄에 `CONNECT_TIMEOUT` 이 찍히는지 같이 보면 된다.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 129(한글 `keep-all`). 69바퀴가 닫았다 (`0a3535e`). 68 자신은 CI 를 배경으로 띄운 채 끝나
커밋을 못 했고, 69 가 같은 트리로 올렸다 (`9319617` · `a1a26af`).


---



### 지난 바퀴 (67) — 게스트 데모의 30초 500 · 풀을 프로세스에 하나로 (INBOX 2026-09-06 ① · FINDINGS 127 · `2134011`)

**67바퀴는 INBOX(2026-09-06 · 사람이 브라우저로 QC 한 결함 넷)를 FINDINGS 127~130 으로 옮기고, ① 을 닫았다** (`2134011`).
INBOX 가 PLAN·FINDINGS 보다 위고, 127 은 **고장**(GATE 3 의 첫 화면이 빈 화면)이라 ④3 의 ① 이다. PLAN 은 이 바퀴에 안 움직였다 —
`- [ ]` 중 위의 셋은 사람이 막고 있고(🙋 Supabase · 🙋 Anthropic 키 · GATE 3), INBOX 가 그 다음 순서(P1 첫 행 마이그레이션 →
126 제출서 → 미해결 FINDINGS)를 적어 두었다.

🔴 **잰 것 — 게스트 데모의 500 은 「동시 요청」이 아니라 「라우트마다 풀 하나」였다.** 짐작이 아니라 재현했다
(`docs/evidence/2026-09-06-db-pool/probe.txt`).

| | 전 (`eb7794c`) | 후 (`2134011`) |
|---|---|---|
| `demo:db` + `next dev` · `POST /demo/session` 뒤 `GET /teams` 순차 3번 | **500 · 30.0초 × 3** (INBOX 는 「단독은 200」이라 했지만 순차도 죽었다) | 200 · 625 / 18 / 19ms |
| `GET /teams` 동시 8번 | 500 · 30/60/90/120/150초 (postgres-js 가 한 풀 안에서 줄을 서고 매번 30초 CONNECT_TIMEOUT) | 전부 200 · 27~64ms |
| 화면 5·7 이 던지는 문 5개 동시 (각각 첫 컴파일) | — | 전부 200 · 1.4초 |
| next 로그 | `{"kind":"unhandled","error":"Error"}` 만 반복 (FINDINGS 128) | unhandled 0 · 5xx 0 |
| `demo:db` 로그 | (아무 말 없음) | 「둘째 소켓이 줄을 섰다」 0 — 새로 찍는 경고 |
| 풀이 사는 곳 | `client.ts` 모듈 변수 `let cached` — Next dev 가 **라우트마다** 모듈을 새로 평가해 컴파일된 라우트 수만큼 `postgres()` 풀 | `globalThis[Symbol.for('contextops.db')]` — 프로세스에 하나 |
| 잠근 시험 | 0 (모든 시험이 `setDbForTest` 로 PGlite 를 직접 꽂아 `postgres()` 를 만드는 길을 한 번도 안 지났다) | `test/db-pool.test.ts` 2개 — PGlite → pglite-socket → TCP → postgres-js `?max=1` → 진짜 라우트. ① 동시 5번 ② `vi.resetModules()` 뒤 새 모듈 인스턴스. **고치기 전 코드로 돌리면 ② 가 26ms 만에 빨갛다**(직접 확인) · ① 은 전에도 초록 |
| 웹 시험 파일 | 90 | **91** |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough 915 · docs → GREEN (`2134011`) |

🔴 **관통이 이걸 못 잡은 이유는 동시성이 아니다.** 관통·시험은 라우트를 프로세스 안에서 `setDbForTest` 로 부른다 —
`getDb()` 가 실제로 `postgres()` 를 만드는 길은 **개발용 서버와 배포만** 지났다. 그 길 위의 시험이 이제 하나 있다(`db-pool`).
「시험이 우회하는 문」은 ④2-B 의 「정의만 있고 아무도 안 읽는 것」의 사촌이다 — 정의도 있고 배포도 읽는데 **시험만 안 읽는다.**

🔴 **`?max=1` 은 반이었다.** 풀 하나 안의 연결 수는 막았지만 풀의 수는 못 막는다. 개발용 서버의 주석이 「두 요청이 동시에
나가면」이라고 원인을 잘못 적고 있었다 — 고쳤다. pglite-socket 0.0.14 는 한 번에 한 소켓만 붙이고 둘째부터 60초 줄에 세운다
(`connectionQueueTimeout` 기본값) — postgres-js 의 `connect_timeout` 30초가 먼저 끝나서 30초가 됐다.

⚠ **브라우저로는 아직 안 봤다.** probe 는 API 만 쳤다. 「눈 판정 대기」에 적었다 — 시크릿 창에서 `/demo` 가 열리고 Roadmap 이
`aria-busy` 에서 내려오는지는 사람이 본다.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 128(오류 로그에 메시지·스택 없음). 68바퀴가 닫았다 (`9319617`).

---


## 앞 바퀴들이 남긴 것 — 다음 사람이 알아야 하는 것

> ⛔ **여기에 「다음 할 일」을 적지 마라.** 그 자리는 머리의 **「다음 바퀴의 일 — FINDINGS N」**
> **한 줄뿐**이고, `tools/status-shape.mjs` 가 그 줄이 **하나**인지 센다.
> ★ 왜 (FINDINGS **102**) — 이 절은 원래 「다음 바퀴가 할 일」이었다. 아무도 끝까지 안 읽는
> 자리라 **손이 안 닿았고**, 두 바퀴 전에 닫힌 항목(97)을 계속 가리키고 있었다.
> 규칙을 더해서 고치지 않고 **자리를 없앴다** — 여기는 이제 **지나간 바퀴의 지식**만 산다.
>
> ⚠ 아래의 「시작하기 전에 아는 것 (N)」 블록들은 **그 항목을 고르면 읽을 것**이지
> 「고르라」는 말이 아니다. **그 N 이 아직 대기인지는 `docs/feedback/FINDINGS.md` 에서
> 확인해라** — 여기 있는 것 중에는 이미 닫힌 것도 있다(76 등).

**94 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **FINDINGS 의 「고칠 방향」이 또 틀렸다 — 두 바퀴 연속이다.** 94 는 `open_question`
  을 §5 원문으로 채울 수 있다고 적었는데, `partition.ts:118` 이 그 타입을 **`exclude`**
  로 보낸다. 씨앗에 넣어도 그 축은 영원히 안 오른다. 93 의 `manual` 오독과 같은 모양이다.
  **대장의 방향도 SPEC 과 같은 지위다 — 코드를 먼저 열어라.**
- 🔴 **「표가 살아 있나」와 「데모가 그걸 보여 주나」는 정말로 다른 질문이다.**
  `liveness.test.ts` 는 10종을 여러 바퀴 초록으로 쟀는데 종이에는 다섯이었다.
  이 모양의 고장이 **넷째로 나왔다**(89 enforcement · 93 SourceRef·scope · 94 ItemType).
  표를 새로 만들 때는 「이 표의 갈래가 데모에 몇 개 서나」를 같이 물어라.
- 🔴 **93 이 만든 `PACK_COVERAGE` 가 값을 냈다** — 이번 바퀴에 고친 것은 `min: 5 → 7`
  **한 칸**이고 관통 스크립트는 한 줄도 안 고쳤다. 「축을 더하는 것이 표에 한 줄」이
  실제로 지켜졌다는 뜻이다.
- ⚠ **경로·줄 번호 같은 「밖을 가리키는 값」은 적지 말고 재라.** `fixtureDir()` 이
  세 번째 사례다 (`locate()` 문서 · `withRepo()` 코드 줄 · 이번엔 폴더).
  없으면 **던진다** — 조용히 넘어가면 아무도 안 센다.
- ⚠ **세다가 틀리기 쉬운 자리 둘은 그대로 있다.** `.claude/rules/domain-refund.md` 는
  `scope.kind='domain'` 축이고 `.claude/rules/workflow.md` 는 템플릿 안내문이다
  (`ctx:` 태그가 0개다). ItemType 축으로 세지 마라.

**93 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **FINDINGS 가 적어 둔 「고칠 방향」도 틀릴 수 있다.** 93 은 `manual` 근거가
  「충돌을 정리하면 붙는다」고 적었는데, 그 길이 붙이는 `manual` 은 **진 항목**에 붙고
  진 항목은 `deprecated` 라 **Pack 에서 빠진다.** 코드를 보기 전에 그 방향대로 만들었으면
  한 바퀴를 통째로 버렸다. **대장의 방향도 SPEC 과 같은 지위다 — 코드가 현실이다.**
- 🔴 **「표에 한 줄」로 만들려면 재는 재료도 한 곳에 모아야 한다.** `PACK_COVERAGE` 의
  네 축이 각각 다른 것을 본다(본문 글자 · 파일 경로 · 태그 조각 · 항목 타입). 그 넷을
  `PackView` 한 덩어리로 넘기니 축을 더하는 것이 정말로 한 줄이 됐다.
  축이 늘 때 `PackView` 에 칸이 하나 늘 수는 있고, 그건 그 절차 주석에 적혀 있다.
- 🔴 **접두사·파일 이름처럼 「형식」을 아는 코드가 둘이면 반드시 갈라진다.**
  이번에 둘을 없앴다 — `srcKindOf()` 는 `SRC_TAG` 표를 뒤집어 만들고,
  `scopePackPath()` 는 `SCOPE_DOC` + `DOCS` 를 잇는 유일한 문이다.
  **되읽는 함수는 쓰는 함수 옆에 두고, 왕복을 시험으로 잠가라.**
- ⚠ **근거가 여럿인 항목이 생겼다.** 검사를 항목 단위로 세면 **둘째 근거만 빠지는 것**이
  안 보인다. 이제 (항목 × 근거 종류)로 센다 — 새 근거를 더할 때 이 단위를 지켜라.
- ⚠ **씨앗 질문 표의 `question` 문장은 행에 저장된다.** 관통은 `SEED_QUESTIONS` 에서
  **id 로** 꺼내 문장을 짝짓는다 — 문장을 베끼지 않았으니, 표를 고치면 씨앗이 던진다.

**92 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **「검사가 돌았나」와 「그 검사가 이 파일을 봤나」는 다른 질문이다.** `typecheck` 층은
  여러 바퀴 「tsc 가 exit 0 이었다」를 초록으로 찍었고, 그 사이 관통을 만드는 코드 10개는
  타입을 한 번도 안 봤다. **90 이 남긴 것과 똑같은 모양이다** — 90 은 「태그가 있나」만
  세는 게이트가 「따라가면 그 문장이 있나」를 안 셌다. **두 바퀴 연속으로 같은 함정이다:
  게이트를 만들 때 「무엇을 안 세고 있나」를 반드시 물어라.**
- 🔴 **목록을 손으로 드는 자리는 전부 이 고장의 씨앗이다.** `include` 의 폴더 이름 ·
  게이트의 프로젝트 목록 · 면제 목록 — 셋 다 「한 줄 더하는 것을 잊으면 조용히 빠지는」
  모양이었다. 앞의 둘은 **찾게** 만들어 없앴고, 셋째(면제)는 없앨 수 없어서
  **죽으면 FAIL 하게** 만들었다. 목록을 꼭 들어야 하면 **썩었을 때 빨개지게** 해라.
- ⚠ **`.ci/result` 를 CI 가 끝나기 전에 읽으면 지난 바퀴의 GREEN 을 읽는다.**
  이번에 밟았다 — 층 출력에는 `build` 까지만 있는데 `.ci/result` 에는 `walkthrough OK
  => GREEN` 이 있어서 다 끝난 줄 알 뻔했다. **`.ci/result` 의 타임스탬프를 보고 판단해라**
  (`.ci/logs/*.txt` 의 mtime 이 더 정확하다).

**90 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **근거를 손으로 적지 마라 — 원문에서 재라.** 새 픽스처 항목을 더할 때는
  `fromDoc(id, type, doc, quote, extra)` 의 `quote` 에 **원문에서 잘라 온 문장**을 넣는다.
  숫자를 적을 자리가 이제 없다. 문서를 고쳤는데 문장을 안 고치면 **씨앗이 던져서**
  관통이 그 자리에서 멈춘다 — 그게 알림이다.
- 🔴 **「태그가 있나」와 「따라가면 그 문장이 있나」는 다른 질문이다.** 앞의 것만 세는 게이트가
  여러 바퀴 초록이었고 그 사이 여덟 줄 중 일곱이 엉뚱한 자리를 가리켰다.
  **「있나」를 세는 게이트를 만들면 항상 「맞나」도 셀 수 있는지 물어라.**

**89 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **「표가 살아 있나」와 「데모가 그걸 보여 주나」는 다른 질문이다.** `liveness.test.ts`
  는 여러 바퀴 「네 값이 서로 다른 줄을 낸다」를 재고 초록이었는데, 그 사이 심사자가 읽는
  종이에는 한 갈래만 있었다. **2-B ②단계를 통과한 축도 데모에서 한 갈래일 수 있다** —
  그건 죽은 코드가 아니라 **데모의 구멍**이고, 세는 자리가 다르다(관통이 센다).
- 🔴 **갈래를 채우겠다고 픽스처에 문장을 지어내지 마라.** 픽스처의 모든 줄은 문서까지
  역추적된다(P7). 갈래가 모자라면 **문서를 먼저 늘려라** — SPEC §10.1 이 그 문서의
  정본이다. 이번에 `permission`·`none` 을 비워 둔 이유가 이것이고, 그 판단은
  `PACK_ENFORCEMENT_MIN` 상수 옆에 적혀 있다.
- ⚠ **검사 쪽에 개수를 적지 마라.** 관통이 `=== 6` 을 두 곳에 적고 있어서, 픽스처를
  늘린 사람은 관통이 빨개지는 것을 보고 **검사 쪽 숫자를 고쳐 초록을 만든다.**
  이제 `SeedResult.drafted` 와 견준다 — 픽스처에 한 줄을 더하면 검사가 저절로 따라온다.

**88 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **토큰을 「제대로 썼나」와 「맞는 용도로 썼나」는 다른 질문이다.** `design-tokens.test.ts`
  는 여러 바퀴 동안 앞의 것만 셌고, 그 사이 뒤의 것이 다섯 자리 쌓였다. **표에 용도를
  적었으면 그 용도도 기계가 세게 해라** — 색 이름만 잠그면 반만 잠근 것이다.
- 🔴 **색 고장은 글자만 뽑는 캡처로 안 잡힌다.** 지난 바퀴들의 눈 판정 자료는 태그를
  지우고 글자만 남겼는데, 그러면 `class` 가 통째로 사라진다. **색을 판정할 때는 마크업을
  그대로 두고 읽어라.** 그리고 눈 대신 **대비를 계산해라** — 이 환경엔 브라우저가 없다.
- ⚠ **`ink-4` 를 쓰려면 같은 줄에 `aria-hidden` 이 있어야 한다** (게이트가 그렇게 잠겼다).
  장식이 아닌데 옅게 쓰고 싶으면 `ink-3`(`meta`)다. 정말로 그 사이 값이 필요하면
  `DESIGN_BRIEF` §3 표에 **먼저** 한 줄을 더해라 — `bad-bg` 가 그 길로 들어왔다.
- ⚠ **색 클래스를 두 곳에 적지 마라.** `chips.tsx` 의 `· rev N` 은 부모 `.ctx-tag` 가
  이미 ink-3 라 클래스를 뺐다. 부모가 정한 색을 자식이 또 적으면 한쪽만 고쳐진다.

**86 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **「소비처가 생겼다」로 끝내지 마라.** 86 은 「근거를 화면에 낸다」였는데, 냈지만
  **안 보이는 색**으로 그렸다. 시험 12개가 전부 초록이었고 `toContain` 은 색을 안 센다.
  **캡처를 읽는 단계가 아니었으면 이 바퀴는 「고쳤다」로 끝났을 것이다.**
- 🔴 **꺼내는 함수와 그리는 카드가 각자 모양을 적으면 칸이 빠져도 안 걸린다.**
  화면 한 줄의 모양은 `lib/web/queries.ts` 에 둔다 — 이 저장소의 기존 자리다.
- ⚠ **`design-tokens.test.ts` 는 주석 안의 색 리터럴도 센다.** 왜 그 색을 쓰지 말라고
  적을 때 값을 적지 마라 — **토큰 이름으로 적어라.**

**84 가 남긴 것 (다음 사람이 알아야 하는 것):**
**84 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **초안을 행으로 만드는 자리는 `insertDrafts()` 하나다** (`lib/api/item.ts`).
  새 문을 더하면 고를 것은 **`origin` 한 칸**뿐이고, 절차는 그 함수 옆 주석에 있다.
  ⛔ **라우트 안에서 `insert(contextItems)` 를 다시 적지 마라** — 그게 이번에 걷어낸
  모양이다 (두 라우트가 각자 네 가지를 따로 정하고 있었다).
- 🔴 **`REVISION_ORIGINS` 에 값을 더하면 찍는 자리를 같이 만들어라** (표 옆 주석).
  찍는 곳이 0곳인 값은 그 값을 **읽는 판정**(§7.2 의 `doc_vs_code`)을 영원히 0건으로
  만든다 — 31 이 여러 바퀴 그 상태였다.
- ⚠ **관통은 이 길을 아직 안 지난다.** `walkthrough.ps1` 은 `batch-draft`(scan 길)로만
  항목을 넣어서, 문서 → 후보 → 항목 길이 끊겨 있어도 **7단계 전부 초록**이었다.
  §7.1 이 키를 요구해서 관통에 넣기 어렵다 — 그래서 이 길의 게이트는 스텁을 쓰는
  `ai-job.test.ts` 다. **관통 초록을 「길이 이어졌다」로 읽지 마라.**
- ⚠ **화면 3 의 성공 카드는 이제 컴포넌트다** (`components/structure-candidates.tsx`).
  상태는 화면이 들고 카드는 받아서 그리기만 한다 — 브라우저가 없어서 눈 판정을
  마크업에서 뽑아 하기 때문이다. 상태를 카드 안에 넣으면 「저장 중」·「실패」·
  「만든 뒤」를 뽑아 볼 수 없다.

**빈 Pack 가드가 남긴 것 (80 이 남긴 것):**

- 🔴 **가드가 재는 값이 틀리면 가드가 없는 것보다 나쁘다.** 있으니까 아무도 다시 안 본다.
  `EMPTY_SNAPSHOT` 은 여러 바퀴 동안 「막고 있다」고 믿어졌는데 한 번도 안 걸렸다.
  **2-B 의 ②단계(값을 바꾸면 결과가 달라지나)가 이걸 잡는 유일한 잣대다.**
- 🔴 **판정과 표시를 나눠라.** 「이 snapshot 이 Pack 이 될 수 있나」는 컴파일러 하나가
  정하고, 「사람에게 무엇을 보여 주나」는 `COMPILE_ERROR_FAULT` 표가 정한다. 라우트가
  판정을 다시 하면 두 답이 갈린다 — 라우트가 항목 수를 세면 「항목은 있는데 전부
  제외된」 경우를 놓쳤을 것이다.
- ⚠ **컴파일러 에러를 API 코드로 옮기는 자리는 `lib/api/publish.ts` 한 곳이다.**
  새 `CompileErrorCode` 를 더하면 그 `Record` 가 타입 검사로 막는다.
- ⚠ `error-codes.test.ts` 는 `fail('CODE'` **문자열 리터럴**로 소비처를 센다. 표를 통해
  코드를 내면 그 코드의 「주인」이 사라져 보인다 — `COMPILE_FAILED` 의 리터럴 호출을
  남겨 둔 이유가 그것이다.

**표를 화면과 서버가 같이 읽을 때 아는 것 (79 가 남긴 것):**

- 🔴 **화면은 `packages/compiler` 를 import 할 수 없다** — 그 패키지가 `node:crypto` 를
  재수출한다. 컴파일러가 아는 것을 화면도 알아야 하면 표를 **`packages/schema` 로
  올려라** (`ITEM_STATUS_EXCLUDE_REASON` 이 그렇게 올라갔다).
- 🔴 **화면이 항목을 지목하는 이름은 `public_id` 다.** 응답에 uuid 가 없다 —
  새 라우트를 만들 때 「화면이 이 경로를 만들 수 있나」를 먼저 물어라. 못 만들면
  그 라우트는 있으나 마나다 (79 가 그 상태로 여러 바퀴 있었다).
- ⚠ **버튼 밑 캡션이 버튼 문구를 되풀이하지 않게 하라** (`actionCaption()`).
  「폐기 | 폐기 · …」는 캡션이 새 사실을 안 주는 것처럼 읽힌다.

**69 — sync 상태 `manual` 을 찍는 코드가 0곳이다** (격차). 다섯 중 하나가 죽어 있다.

**시작하기 전에 아는 것 (69):**

- 🔴 **먼저 정할 것은 「Pack zip 을 내려받는 길을 만드나」다** — 그 답이 이 항목의 답이다.
  만든다면 `manual` 은 **그 zip 을 손으로 푼 기기가 보고하는 값**이고, 안 만든다면
  `REPORTABLE_SYNC_STATUSES` 에서 빼고 SPEC §6 의 문장도 같이 지운다.
- ⚠ **`SYNC_STATUSES` 에서는 지우지 마라 — 직렬화된 enum 값이다** (`sync_status` pgEnum).
  중간을 지우면 옛 행을 못 읽는다.
- ⚠ **77·78 이 같이 본 것**: `SYNC_CHIP` 5종은 표가 잠겨 있는데 **그리는 화면이 0곳**이다.
  화면 9(기기별 상태)가 아직 없어서다 — 죽은 코드가 아니라 **아직 안 온 화면**이다.
  69 를 「살린다」로 고르면 그 화면과 같은 바퀴가 자연스럽다.

**72①② — 화면 4 가 DESIGN_BRIEF 의 나머지 두 칸을 안 그린다** (격차). 둘 다 **서버에
담을 자리나 문이 없어서** 안 그렸다. ①「용어: ___」를 담을 칸이 `resolution` 에 없다.
②「담당자 지정」은 충돌 행에 담당자 칸이 없고 사람 목록을 내는 문도 없다.

**시작하기 전에 아는 것 (72①②):**

- 🔴 **①은 이번 바퀴에 닫은 76 과 같은 자리다.** 76 을 「문구를 사실에 맞춘다」로
  닫았으므로, 중복 카드가 「같음/다름 + 용어」를 묻게 하려면 **먼저 서버가 그것을
  받아야 한다** — `resolution` 에 칸이 늘고, 그 값을 무엇이 읽는지도 같이 정해야 한다.
  ⚠ **읽는 곳을 안 정하고 칸만 늘리지 마라** — 그게 이 저장소의 단골 고장이다 (2-B).
- ⚠ **정말로 합치는 갈래**(진 쪽 `source_refs` 를 이긴 쪽에 잇기)를 고르면
  `SOURCE_REFS_MAX`(20) 초과 갈래를 정해야 한다. 지금 규칙은 **버리는 갈래는 없다**(=400).
  그때는 `CONFLICT_SIDES.duplicate` 문구도 같이 되돌리고,
  `web-conflict-card.test.ts` 의 첫 `expect`(표가 폐기만 한다)가 그 자리로 데려간다.

**76 — 「A로 합침」이 합치지 않는다** (고장). 중복 카드의 버튼은 「합침」이라고 묻는데
서버는 **진 쪽을 폐기할 뿐**이다. 이긴 쪽에 본문도 태그도 근거도 안 옮겨 온다.
사람은 합쳤다고 믿고 B 에만 있던 문장을 잃고, 되돌릴 문이 없다.

**시작하기 전에 아는 것 (76):**

- 🔴 **갈래가 둘이고 둘 중 하나만 골라라** — ① 문구를 사실에 맞춘다
  (`CONFLICT_SIDES.duplicate` 한 줄 · 싸다) · ② 정말로 합친다 (`appendSourceRef()` 로
  진 쪽 근거를 이긴 쪽에 잇는다 · 계약을 넓힌다).
- ⚠ **①을 고르면 DESIGN_BRIEF §4 의 「같음, 용어: ___」도 같이 고쳐라.** 반만 고치면
  화면과 정본이 갈려서 다음 바퀴가 어느 쪽이 맞는지 못 가린다.
- ⚠ **②를 고르면 72① 과 같은 자리다** (「용어」를 담을 칸이 `resolution` 에 없다).
  둘은 같이 정하는 것이 맞다. `SOURCE_REFS_MAX`(20)에서 넘치는 갈래도 같이 정해야
  하고, 지금 규칙은 **버리는 갈래는 없다**(=400)다.
- ⚠ **표에 종류별 갈래를 만들지 마라.** `RESOLUTION_ITEM_OUTCOME` 은 선택 축이고
  `duplicate` 만 다르게 하려면 그 축이 아니라 `CONFLICT_KIND_RULES` 에 칸이 는다.
  ①을 고르면 표는 아예 안 건드린다 — 그래서 ①이 싸다.

**표를 화면과 서버가 같이 읽을 때 아는 것 (74 가 남긴 것):**

- 🔴 **표가 `packages/schema` 로 올라가면 플러그인 번들이 갈린다.**
  `pnpm --filter @contextops/plugin build` 를 돌려야 `test/bundle.test.ts` 가 초록이다.
- 🔴 **선택을 하나 더할 때 고칠 자리는 다섯이고 절차는 표 옆 주석에 있다**
  (`RESOLUTION_ITEM_OUTCOME` 위). 앞의 둘은 타입 검사가 막는다.
- ⚠ **결정 전에 보여 준 문장과 결정 후에 남기는 문장은 같은 함수여야 한다.**
  두 문장을 따로 적으면 한쪽만 고쳐지고, 그게 「화면이 거짓말하는」 첫걸음이다.
- ⚠ **화면이 무엇을 다시 읽을지도 표에 물어라.** `if (choice !== 'dismiss')` 를 적으면
  선택이 늘 때 그 `if` 를 찾아야 한다.

**74 — 화면 4 가 「A가 맞음」의 결과를 안 알린다** (격차). 🔴 **이번 바퀴에 버튼의 뜻이
바뀌었다.** 어제까지 「A가 맞음」은 아무것도 안 지웠고, 오늘부터는 B 항목을 폐기해서
**다음 Pack 에서 사라지게 한다.** 화면은 그 말을 한 마디도 안 하고, 되돌리는 문도 없다
(`:resolve` 가 「이미 처리된 충돌」을 400 으로 막는다 — 27바퀴가 정한 것).

**시작하기 전에 아는 것 (74):**

- ⚠ **27바퀴 게이트와 부딪히지 않게 조심해라** — 「저장 **전에는** 무엇이 생기는지
  약속하지 않는다」는 *안 일어날 일을 약속하지 마라*는 뜻이다. 지금은 **일어난다.**
  약속이 아니라 **사실**을 적는 것이고, 그 사실은 표에서 온다.
- 🔴 **문구를 카드에 손으로 적지 마라.** `RESOLUTION_ITEM_OUTCOME`(`lib/api/conflict.ts`)이
  이미 「어느 쪽이 어디로 가나」를 들고 있다. 그 표를 읽어 그리면 선택이 늘어도 따라온다.
- ⚠ **그 표는 지금 서버 쪽에 있다.** 화면이 `lib/api/*` 를 import 하면 의존 방향이
  깨진다 (`schema ← compiler ← web`). **둘째 사용자가 생긴 것**이므로 `packages/schema`
  로 올리는 것이 그 표의 자리다 — 올리면 `pnpm --filter @contextops/plugin build` 가
  필요하다 (`test/bundle.test.ts`).
- ⚠ **모양을 뽑아 읽는 자리는 `scripts/dump-conflict-card.tsx`** 다. 시험을 쓴 뒤에
  **마크업을 직접 읽어라** — 지난 세 바퀴에 고친 여덟 개가 전부 글자를 읽어서 나왔다.

**그때 적어 둔 후보** (지목이 아니다 · 지금의 지목은 머리 한 줄뿐이다): **72**(화면 4 의 안 그린 세 칸 — ③ `updated_at` 이 제일 싸고 화면 5 도
같은 값을 기다린다 · `ITEM_COLUMNS` 에 한 줄이다) · **67 ①**(zip · SPEC §11 상한이 먼저다).

**결정 → 항목을 고칠 때 아는 것 (71 이 남긴 것):**

- 🔴 **표 둘을 접지 마라.** `RESOLUTION_OUTCOME`(선택 → 충돌 상태)과
  `RESOLUTION_ITEM_OUTCOME`(선택 → 진 쪽 항목 상태)은 같이 안 움직인다.
  둘을 잇는 문은 `itemOutcomeOf()` 하나다 — 라우트에 조립을 다시 만들지 마라.
- ⚠ **`anchor` 가 `items` 가 아니면 바꿀 항목이 없다.** `a_ref` 에서 항목을 추측하면
  엉뚱한 항목을 폐기한다 (`SourceRef` 는 원문까지 가는 사슬이지 항목 이름이 아니다).
- ⚠ **이긴 쪽은 안 건드린다.** 이미 `active` 인 항목을 `review` 로 되돌리면 다음
  발행에서 Pack 밖으로 나간다 — 「A가 맞다」의 뜻과 정반대다.
- ⚠ **근거를 더 붙이는 자리는 `appendSourceRef()` 하나다** (`lib/api/item.ts`).
  자리가 없으면 `undefined` 고, 부르는 쪽이 무엇을 답할지만 정한다. **버리는 갈래는 없다.**
- ⚠ **바뀔 것이 없으면 개정을 쌓지 마라.** 이미 `deprecated` 인 항목에 개정을 쌓으면
  `revision` 만 올라서 남이 들고 있던 낙관적 잠금이 이유 없이 409 가 된다.

**화면 4 를 고칠 때 아는 것:**

- 🔴 **종류별 갈래를 카드에 만들지 마라.** 셋 다 `CONFLICT_KIND_RULES` 가 정한다 —
  `anchor`(`ANCHOR_BODY` 3줄) · `detected`(버튼이냐 답 칸이냐) · `byAi`(배지·머리 숫자).
  카드에서 손댈 곳은 `CONFLICT_SIDES`(A·B 버튼 문구) **한 줄**뿐이다.
- 🔴 **머리의 두 수를 합치지 마라.** `GET /conflicts` 는 씨앗 질문 10장을 같이 낸다 —
  합치면 「AI가 찾은 N건」이 거짓이 된다.
- **결정 버튼은 owner 에게만.** `:resolve` 는 owner, `POST /questions` 는 member 다.
- **모양을 뽑아 읽는 자리는 `scripts/dump-conflict-card.tsx`** 다. 시험을 쓴 뒤에
  **마크업을 직접 읽어라** — 이번 바퀴에 고친 셋도 지난 두 바퀴에 고친 다섯도 전부
  글자를 읽어서 나왔다. (조사·라벨·시제는 시험이 먼저 못 잡는다.)

**앞 바퀴들이 남긴, 아직 유효한 것:**

- 🔴 **개정의 `source_refs` 는 초안의 것이 아니다** (`lib/api/publish.ts` 의
  `withProposalRef()`). 근거 상한은 `SOURCE_REFS_MAX` 다 (`packages/schema` · 20) —
  ⛔ 20 을 손으로 적지 마라.
- 🔴 **씨앗 질문의 정본은 `apps/web/src/lib/api/seed-questions.ts` 표 하나다.**
  ⛔ **`question` 문장을 고치지 마라 — 행에 그대로 저장되고 그 문장이 행과 표를 잇는
  열쇠다.** 고칠 일이 생기면 **줄을 하나 더해라.**
- **화면이 서버에 대해 아는 것은 `lib/web/queries.ts` 가 전부다.** 새 엔드포인트를
  화면 안에서 `apiJson('/…')` 로 조립하지 마라.
- **`usePolling(load, deps, again)`** — `again` 이 `null` 을 내면 멈춘다. 실패하면
  더 두드리지 않는다 (사람이 `reload()` 로 다시 시작한다).
- 🔴 **job 한 장을 그리는 자리는 `components/job-progress.tsx` 하나다.** 화면 4 가
  이번에 그 **둘째 사용자**가 됐다 (`conflict` job) — `feature ===` 갈래 없이 됐다.
- ⚠ **프로젝트를 만드는 라우트가 행 11개를 만든다.** 개수를 세는 시험에
  `SEED_QUESTIONS.length` 를 더해라.
- ⚠ **`packages/schema` 를 고치면 플러그인 번들이 갈린다.** `pnpm --filter
  @contextops/plugin build` 를 돌려야 `test/bundle.test.ts` 가 초록이다
  (이번 바퀴에 `byAi` 를 더해서 실제로 돌렸다).

✅ **P1 첫 행(DB·Supabase)은 닫혔다** (`389c7f2` PGlite · `adac632` Supabase 실제 적용 · 71바퀴). `pnpm --filter web db:status` 가 배포 DB 의 표·인덱스·남은 마이그레이션을 **읽기만 하고** 센다 · `db:migrate` 가 적용한다.
⚠ **Anthropic API 키도 사람이 준다.**

**값싼 것들 (아무 바퀴에서나)**: FINDINGS **21·22·23·17·32·44·57·61·63** 은
문서·한 줄짜리다. **14**(`.ps1` 두 개가 LF)도 그렇다. **55**(공통 프롬프트)는 §7.3 전이 제일 싸다.
🔴 **30 과 46 은 한 묶음이다** — 둘 다 템플릿 `head` 한 줄이고 둘 다 golden 을 깬다.
🔴 **50 은 여전히 값싸고 더 급해졌다** — `callClaude()` 를 부르는 제품 파일이 둘이고
그 게이트는 예산 가드를 건너뛰는 새 파일을 못 잡는다.

⚠ FINDINGS **24·25·29·33·35·56·59·63** 은 **P3 둘째 행**이, **36** 은
**P4 화면 9** 가, **53** 은 **API 키가 생긴 뒤**가, **69** 는 **「Pack zip 을 내려받는
길을 만드나」**가 주인이다. **26** 은 절반(구조화 job)이 닫혔고 zip 만 남았다
(**67 ①** 과 같은 자리다). ✅ **31·65 는 닫혔다** (`c57b3fb`·`5fe0068`).

## 눈 판정 대기

🔴 **Supabase 위에서 화면을 연 적이 없다** (71바퀴 · `adac632`). 마이그레이션만 적용했고 표는 비어 있다. 못 잰 것: ① `.env.local` 그대로 `next dev` 를 띄우고
**실제 Supabase Auth 로 로그인**이 도나 (`SUPABASE_JWT_SECRET` 도 꽂혀 있다 — 지금까지 로그인은 전부 시험용 JWT 였다) ② `CRON_SECRET` 을 `.env.local` 에 넣고(아직 없다 · 아무 난수)
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/v1/cron/demo-reset` 로 데모 테넌트를 심으면 60초 안에 끝나고 시크릿 창의 `/demo` 가 열리나.
둘 다 지나면 P5 둘째 행의 「Supabase 에서 60초 안에 끝나나」도 같이 닫힌다. ⚠ 배포 DB 에 쓰는 일이다 — 리셋은 데모 팀만 지운다지만(`demo-reset.test.ts`) 돌리기 전에 그 시험이 초록인지 본다.

🔴 **게스트 데모 — 고친 뒤 브라우저로 안 봤다** (67바퀴 · FINDINGS 127). → **70바퀴가 부분 봤다** (`docs/evidence/2026-09-06-focus-visible/probe.txt`):
새 프로필로 `/demo` → context 항목 15개 · packs/1.1.0 본문 · 5xx 0 · 「줄을 섰다」 0. **남은 것은 proposals · roadmap · sync** — 같은 폴더의
`focus-cdp.mjs` 둘째 url 만 바꿔 돌리면 된다 (`node focus-cdp.mjs <out> http://127.0.0.1:3000/demo 0 '.nav-link[aria-current="page"]' <url2> <selector2> 1`).
셋 다 지나면 GATE 3 이고 PLAN P4 둘째 행을 `- [x]` 로. 아래는 67 의 원문이다. API 는 잰다(`docs/evidence/2026-09-06-db-pool/probe.txt`:
순차·동시·화면 fan-out 전부 200). 못 잰 것은 **사람이 시크릿 창에서** 본다 (`pnpm --filter web demo:db` → `next dev` 에
`DATABASE_URL=…55432/postgres?max=1` · `SUPABASE_JWT_SECRET=contextops-test-jwt-secret` → `http://localhost:3000/demo`):
- Context 가 「서버에서 처리하지 못했습니다」 대신 항목 15개를 그리나 · Roadmap 이 `aria-busy="true"` 에서 내려오나
- 화면 사이를 오가며(context → packs → proposals → sync) 30초 멈춤이 한 번도 없나 — `demo:db` 터미널에 「둘째 DB 소켓이 줄을
  섰다」가 안 찍히나 (찍히면 풀이 둘이다 — 그 자리에서 고장이다)

🔴 **데모 리셋 — 배포에서 돌린 적이 없다** (63바퀴 · 🙋 Vercel 연결 뒤). PGlite 위에서는 읽었다
(`docs/evidence/2026-09-06-demo-reset/reset.txt`). 못 잰 것 셋: `/var/task` 에서 `fixturesRoot()`
가 `fixtures/` 를 찾나(못 찾으면 500 — Vercel Functions 로그의 `"kind":"error"` 줄에 던진 문구와 stack 「at …」 3줄이
남는다 · 68바퀴 FINDINGS 128 · 그 전엔 `Error` 이름뿐이었다) ·
Supabase 에서 60초 안에 끝나나 · Cron 로그에 200 이 찍히나. 첫 리셋 뒤 시크릿 창에서 `/demo`.

🔴 **화면 1 의 터미널 재생 — 브라우저에서 움직이는 것을 본 적이 없다** (62바퀴). 덤프는 읽었다
(`docs/evidence/2026-09-06-replay/landing.txt` — 17줄 순서 · 패널 1/3). 못 잰 것은 **사람이
브라우저에서** 본다 (`pnpm --filter web demo:db` → `http://localhost:3000/` → 스크롤):
- **타이핑이 실제로 움직이나** — 마운트 뒤 0.8초 비어 있다가 훅 세 줄 → `> /contextops:sync` 가
  글자씩 → 0.6초 뒤 적용 줄들. 명령 줄 끝의 커서(`accent-ink` 막대)가 깜빡이나.
- **보고 줄이 드러나는 순간 오른쪽 첫 기준이 ○ → ✓ 로, 막대가 0 → 33% 로 같이 바뀌나.**
- **재생 전 빈 카드(`min-height: 26em`)가 어색하지 않나** — 어색하면 첫 줄 앞(`lead_ms`)을 줄여라.
- **390px 에서 한 열로 접히나** · 긴 progress 명령이 `pre-wrap` 으로 접혀 본문이 안 밀리나.
- `prefers-reduced-motion` 을 켜면 전부 드러난 채로 서 있나 (OS 설정으로 한 번).

🔴 **화면 7 의 [Pack 다운로드 (.zip)] — 브라우저에서 눌러 본 적이 없다** (60바퀴). zip 자체는
독립 도구로 열었다 (`docs/evidence/2026-09-06-zip/zip.txt`). 못 잰 것: 누르면 저장 대화상자에
`<slug>-v<semver>.zip` 이름이 서는가(`content-disposition` 을 브라우저가 읽는가) ·
「받는 중…」 동안 버튼이 비활성인가 · 실패 문구가 버튼 옆에 서는가 · 「이 Pack을 받은 기기
N / M」이 데모(v1.1.0 · 12대)에서 **9 / 12** 로 서는가 (`pnpm --filter web demo:db` →
`/t/demo/p/paylab-api/packs/1.1.0`). 게스트 토큰도 GET 이라 받을 수 있어야 한다.

🔴 **화면 1 랜딩 — 브라우저로 본 적이 없다** (59바퀴 · 랜딩 v1). 덤프는 읽었다
(`docs/evidence/2026-09-06-landing/landing.txt` — 문장 순서 · accent 1 · 죽은 링크 0).
못 잰 것 셋은 **사람이 시크릿 창에서** 본다 (`pnpm --filter web demo:db` →
`http://localhost:3000/` — 이게 GATE 3 의 첫 걸음이기도 하다):
- **스크롤 없이 A·B·C 가 보이나** — 1440px 에서 헤드라인(좌 3fr)·Before/After 두 카드(우 2fr)·
  [샘플 팀으로 둘러보기] 가 첫 화면 안인가. After 카드가 길어 접히면 `--fs-hero`(44px) 를
  줄이지 말고 카드의 근거 줄을 두 줄로 접어라.
- **390px 에서 한 열로 접히나** (`landing.module.css` 의 `@media (max-width: 900px)`) —
  설치 블록의 긴 명령이 `scroll-x` 안에서 가로 스크롤인가, 본문이 밀리는가.
- **[샘플 팀으로 둘러보기] → `/demo` → `/t/demo/p/paylab-api/context`** 가 3분 안에 끝까지 가나.
  가면 PLAN P4 둘째 행을 `- [x]` 로 바꿔라 (GATE 3).

🔴 **화면 3 의 후보 고르기 카드를 근거까지 넣어 다시 읽었다** (36바퀴 ·
`c6905df`+`b1d2190`). 잰 것: `docs/evidence/2026-09-04-candidate-evidence/card.txt` —
일곱 상태. 읽고 판정한 것:
- ✅ 다섯 줄이 전부 **제목 → 본문 한 줄 → 근거** 순서로 선다 ·
  근거 없는 줄은 「⚠ 근거 없음」이라고 말한다 · 여러 줄짜리 본문이 `…` 로 끝난다 ·
  근거 넷이 서로 다른 §과 글자 범위를 낸다.
- 🔴 **본문이 비활성 색이었다 → 그 자리에서 고쳤다**(`b1d2190`) · 나머지 다섯 자리는
  **FINDINGS 88**.
- 🔴 **근거가 어느 문서인지 안 말한다 → FINDINGS 87.**
못 잰 것 — **브라우저가 없어서 레이아웃은 못 봤다** (35바퀴의 세 가지가 그대로 남았고
근거 줄이 붙어서 **더 급해졌다**):
- **한 줄이 세 줄이 됐다.** 후보 5개면 15줄이고, §7.1 은 chunk 하나에 40개까지 낼 수
  있다 (`AI_MAX_ITEMS_PER_CHUNK`). **120줄짜리 카드**가 어떻게 보이는지 본 적이 없다 —
  접기·스크롤·「전부/해제」 토글 중 무엇이 필요한지는 캡처가 있어야 안다.
- **본문 120자가 한 줄에 안 들어간다.** 카드 폭에서 몇 줄로 접히는지 모른다.
  `CANDIDATE_BODY_CHARS` 는 **글자 수**만 자르고 줄 수는 안 잡는다.
- **체크박스가 `DESIGN_BRIEF` §3 토큰을 따르는지** — `globals.css` 에
  `input[type=checkbox]` 규칙이 여전히 **없다.**

---

🔴 **화면 3 의 후보 고르기 카드는 글자로 읽었고, 하나를 찾아 적었다** (35바퀴 · `c57b3fb`).
잰 것: `docs/evidence/2026-09-04-structure-candidates/card.txt` — 일곱 상태
(기본·부분선택·0개·저장중·실패·만든뒤·빈상태). 읽고 판정한 것:
- ✅ 고른 수가 버튼에 따라온다(5 → 3) · 0개면 버튼이 `disabled` 다 ·
  만든 뒤 문구가 **「승인」이 아니라 「초안」**이라고 말한다 · 타입을 아이콘만으로
  말하지 않는다(이름 병기) · 빈 상태에 다음 할 일이 있다.
- 🔴 **근거가 없다 → FINDINGS 86** (위에서 적었다).
못 잰 것 — **브라우저가 없어서 레이아웃은 못 봤다**:
- **후보가 12개일 때 카드가 얼마나 길어지는지.** §7.1 은 chunk 하나에 최대 40개까지
  낼 수 있다 (`AI_MAX_ITEMS_PER_CHUNK`). 40줄이 한 카드에 서면 그 화면은 못 쓴다 —
  스크롤·접기·「전부/해제」 토글 중 무엇이 필요한지는 **캡처가 있어야 안다.**
- **체크박스가 `DESIGN_BRIEF` §3 토큰을 따르는지.** `globals.css` 에 `input[type=checkbox]`
  규칙이 **없다** — 브라우저 기본 모양이 다크 바탕에서 어떻게 보이는지 본 적이 없다.
- **버튼이 accent 가 아닌 것이 맞는지.** 이 화면의 accent 는 [구조화하기] 이고
  후보 만들기는 `btn btn-sm` 이다 (화면당 accent 하나 · DESIGN_BRIEF §2). 의도한
  것이지만 사람이 그 버튼을 찾는지는 캡처가 있어야 안다.

---

🔴 **화면 5 드로어의 「상태 바꾸기」는 글자로만 읽었다** (32바퀴 · `1aebc22`).
잰 것: `docs/evidence/2026-09-04-item-status/status-actions.txt` — 네 상태 · 저장 중 ·
실패. 그걸 읽어서 하나를 고쳤다 (「폐기 | 폐기 · …」). 못 잰 것:
- **드로어가 또 길어졌다** — 칩 줄 · 본문 · 근거 · 타입별 값(`<pre>`) 밑에 버튼 줄이
  하나 더 붙었다. 초안 카드는 버튼이 **셋**이고 각각 캡션이 있다. 드로어 폭(360px)에서
  셋이 한 줄에 서는지, `col-tight` 셋이 어떻게 접히는지 **본 적이 없다.**
- **accent 가 여전히 [발행하기] 하나인지** — 상태 버튼은 전부 `btn btn-sm` 이라
  accent 가 아니지만, 셋이 나란히 서면 눈이 그리로 가는지는 봐야 안다.
  ⚠ [승인] 이 이 화면에서 제일 중요한 액션인데 **accent 가 아니다.** 의도한 것이지만
  (화면당 accent 하나 · DESIGN_BRIEF §2) 사람이 그것을 찾는지는 캡처가 있어야 안다.
- **캡션(`meta`)이 버튼 글씨보다 작게 읽히는지** · 「적용 중 · 다음 Pack 에 나갑니다」가
  한 줄에 서는지 두 줄로 접히는지.
- **member 가 볼 때** 「상태를 바꾸는 것은 팀 owner 만 할 수 있습니다.」 한 줄만 남는데,
  그 자리가 비어 보이지 않는지.

---

🔴 **문서 0건으로 만든 v1.0.0 은 글자로 읽었고, 읽을 만했다** (32바퀴 · `1aebc22`).
잰 것: `docs/evidence/2026-09-04-questions-only/pack.txt` — Mission 1 · Goals 2 ·
Policies 4 · Constraints 3 이고 줄마다 `src:manual:<질문 문장>` 이 붙는다 (P7).
읽고 남긴 판단 둘:
- ✅ **팀 규칙으로 배포할 만하다.** 문장이 사람이 쓴 그대로고 지어낸 것이 없다.
- ⚠ **Goals 두 줄의 순서가 뒤집혀 보인다** — 「완료 판정 기준」이 「이번 분기 목표」보다
  **먼저** 나온다 (정렬이 항목 id 순이라 `goal_done` < `goal_quarter`). 씨앗 표의
  순서(질문 순서)가 Pack 에서 사라진다. 사람은 목표 → 판정 기준으로 읽기를 기대한다.
  🔴 **아직 FINDINGS 에 안 적었다** — 정렬 규칙(`compiler/src/sort.ts`)을 건드리는 일이라
  golden 셋과 P4 를 흔든다. 다음에 `sort.ts` 를 여는 바퀴가 같이 판단할 자리다.

---

🔴 **화면 5(Context 표)의 「갱신」 칸은 아무도 본 적이 없다** (31바퀴 · `a45cef0`).
잰 것: typecheck 와 시험뿐이다. 화면 4 는 글자로 읽었다
(`docs/evidence/2026-09-04-screen4-updated/item-updated-at.txt`). 못 잰 것:
- **표에 칸이 하나 더 늘었다** — 여덟 칸(타입·제목·scope·상태·confidence·근거·갱신·rev)이
  좁은 화면에서 가로로 미는지. `overflow-x:auto` 안에 있는지 **눈으로 확인한 적이 없다.**
- **`2026-07-12` 가 `mono meta` 로 나가는데** 옆 칸(`근거`·`rev`)도 mono 라 세 칸이
  한 덩어리로 읽히는지.
- **화면 4 의 「갱신 2026-07-12」이 칩 줄 끝에 붙는다** — 칩 셋(`item_…` 태그·상태·
  confidence) 뒤라 좁은 화면에서 혼자 다음 줄로 넘어가면 어느 항목의 날짜인지 흐려진다.

---

🔴 **중복 카드의 새 문구도 글자로만 읽었다** (30바퀴 · `a39419c`).
잰 것: `docs/evidence/2026-09-04-screen4-merge/duplicate-card-wording.txt` — 탐지 4종의
버튼 줄에 「합침」류 낱말이 하나도 없다. 못 잰 것:
- **「A만 남김」과 「B 항목 → 「폐기」」가 같은 말을 두 번 하는 것처럼 읽히는지.**
  글자로는 짧은데 카드 안에서 두 줄이 붙으면 다르게 보일 수 있다.
- **「A만 남김」이 버튼으로서 짧은 편이라** 네 버튼의 폭이 들쭉날쭉해 보이는지
  (「문서가 맞음 (코드 수정 필요)」와 한 줄에 서면 차이가 크다).

---

🔴 **화면 4 의 「결과 줄」은 글자로만 읽었다** (29바퀴 · `094102b`).
잰 것: `docs/evidence/2026-09-04-screen4-effect/conflict-card-effect.txt` 의 열다섯
모양 — 탐지 4종 전부 버튼마다 결과가 붙고, 질문 카드에는 안 붙는다. 그걸 읽어서
**새 고장 하나**를 찾았다 (FINDINGS 76). 못 잰 것:
- **카드가 또 길어졌다** — 버튼 넷 밑에 캡션이 하나씩 붙었다. 스무 장이 쌓였을 때
  스크롤이 어떤지 여전히 본 적이 없다.
- **캡션(`meta`)이 버튼 글씨보다 작게 읽히는지** · 버튼과 캡션이 한 덩어리로 보이는지
  (좁은 화면에서 `col-tight` 넷이 어떻게 접히는지).
- **마지막 경고 줄(`ink-warn`)이 카드 안에서 너무 세지 않은지** — 이 화면에는 accent 가
  없는데 경고 색이 그 자리를 대신 차지하면 화면이 사람을 밀게 된다.

---

🔴 **화면 4 도 캡처로 본 적이 없다** (27바퀴 · `706e334`). 잰 것은
`docs/evidence/2026-09-04-screen4/conflict-card-states.txt` 의 **열다섯 모양**이고,
그걸 읽어서 셋을 고쳤다 (조사 · 한쪽뿐인 카드의 「A」 라벨 · 시제). 못 잰 것:
- **카드가 세로로 길다** — 항목 두 장 + 근거 + 버튼 넷이 한 카드다. 스무 장이 쌓였을 때
  스크롤이 어떤지 본 적이 없다 (DESIGN_BRIEF 는 「카드 10장」이라고 적는다).
- **A·B 두 칸이 좁은 화면에서 어떻게 접히나** — `.row.items-start.wrap` 이라 접히기는 한다.
- **거르개 칩 안에 칩이 들어 있다** (`<button>` 안 `ConflictKindChip`). 버튼 테두리와
  칩 테두리가 두 겹으로 보이지 않는지 **눈으로 봐야 한다.**
- **accent 가 빈 상태의 [Context로 이동] 하나뿐인 것이 맞는지** — 카드가 있을 때 이
  화면에는 accent 가 **없다.** 의도한 것이지만(선택 넷은 같은 무게여야 한다) 화면이
  「할 일이 없어 보이는지」는 봐야 안다.
- ⚠ **`GET /conflicts` 는 §7.2 가 돌아야 채워진다 — 키가 없어 이 화면을 진짜 데이터로
  본 적이 없다.** 지금 실제로 뜨는 것은 **씨앗 질문 10장뿐**이다.

---

🔴 **화면 3 을 캡처로 본 적이 없다 — 이 환경에 브라우저가 없다.**
`node_modules` 에 playwright·puppeteer 가 없고, 관통의 `shots` 층은 `apps/web/e2e` 가
없어서 여전히 SKIP 이다. 그래서 이번 바퀴의 눈 판정은 **두 층으로 갈렸다**:

**① 잰 것 (초록)** — 마크업을 글자로 읽었다.
`docs/evidence/2026-09-04-screen3/job-panel-states.txt` 에 여섯 모양 + `conflict` job
하나를 그려 놓았고, 그걸 읽어서 **둘을 고쳤다** (같은 수를 두 번 그림 · 가지도 않은
걸음을 「마지막 걸음」이라고 부름). 그 판정은 이제 `test/web-job-progress.test.ts` 가
붙잡는다.

**② 못 잰 것 (🔴 사람이 눈으로 봐야 한다)** — 캡처가 있어야 하는 것들:

- **간격·색·글꼴** — 토큰만 썼는지는 `design-tokens.test.ts` 가 기계로 막지만,
  **그 토큰들이 나란히 놓였을 때 읽히는지**는 못 잰다. 특히 두 칸(붙여넣기 폼 `grow` /
  진행 칸 `drawer` 360px)이 좁은 화면에서 어떻게 접히는지 본 적이 없다
  (`.row.wrap` 이라 접히기는 한다)
- **accent 가 하나인지** — [구조화하기] 하나만 `btn-primary` 로 뒀는데, 진행 막대의
  `--accent-ink` 가 그 옆에서 둘째 accent 로 보이지 않는지 눈으로 봐야 한다
- **`design/*.dc.html` 시안과 나란히 놓고 대조** — 한 번도 못 했다 (브라우저가 없다)
- **회전(`skeleton`)이 막대로 바뀌는 순간** — polling 이 2초마다 갈아 끼울 때
  깜빡이지 않는지. `usePolling` 이 손에 든 값을 안 버리게 만들었지만 **본 적은 없다**
- **긴 문서를 붙여넣었을 때 textarea 와 「N자」 카운터** — 40만 자 상한 근처에서 어떤지

**어떻게 보나** (다음에 브라우저가 생기면 그대로):
`pnpm --filter web dev:db` → 찍히는 `DATABASE_URL`·`SUPABASE_JWT_SECRET` 으로 `next dev` →
`/auth/callback?next=…#access_token=<토큰>&expires_in=3600` 으로 세션을 심고 `…/import`.
⚠ **키가 없으면 붙여넣기 뒤의 job 은 `failed`(`INTERNAL`)로 끝난다** — 그것도 볼 것이다
(실패 화면이 「몇 걸음에서 멈췄나」를 말하는지 보는 자리다).
⚠ `.ci/shots/` 는 관통마다 통째로 지워진다 — 근거로 인용할 거면 **적기 전에 밖으로 복사**해라.

**아직 눈으로 못 본 것** (화면 밖):

- 🔴 **Skill 셋이 Claude Code 안에서 실제로 도는 것** — `/contextops:init` 를 사람이
  한 번 눌러 봐야 한다 (GATE 2 의 나머지 절반). 무인 세션은 SKILL.md 의 **명령줄이
  실재하는지**까지만 잰다 (`test/skills.test.ts`)
- **Stop 훅이 진짜 Claude Code 세션에서 stdin JSON 을 받는 모양** — 시험은
  `{session_id}` 를 우리가 넣어 준다. 실제 payload 의 칸 이름이 다르면 훅은
  **조용히 「세션 id 를 모른다」로 물러선다** (그게 안전한 기본값이라 증상이 없다)
- 화면 5 의 **발행 모달** · **상세 드로어** — 헤드리스에서 버튼을 못 누른다
- 화면 7 의 **제외된 항목 접이식** — 이번 씨앗은 `excluded` 가 비어 있다
- **`setup` 의 물어보기 흐름** — TTY 가 있어야 도는 갈래다

⚠ 전부 **코드에는 있고 시험은 초록**이다. 그래서 더 위험하다 —
「컴파일 초록은 최소선이다」(loop/PROMPT.md ①③).

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| ~~Supabase 프로젝트 생성 · `DATABASE_URL` · `SUPABASE_JWT_SECRET`~~ | ✅ **2026-09-06 사람이 꽂았다** (`.env.local` · Session pooler · IPv4) | 71바퀴가 마이그레이션을 실제로 적용했다 (`adac632` · 표 18 · 인덱스 8). **표는 비어 있다** — 데모 테넌트는 Cron 리셋 문(`/api/v1/cron/demo-reset`)이 심는다. 같은 값을 Vercel 에도 꽂는 것은 아래 행 |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 (**Root Directory `apps/web`** · `CRON_SECRET` · `SUPABASE_JWT_SECRET` · `DATABASE_URL`) → 첫 리셋 한 번 (`curl -H "Authorization: Bearer $CRON_SECRET" https://<앱>/api/v1/cron/demo-reset`) → `/demo` 가 열리나 → 브라우저 네트워크 탭에서 `batch-draft`·`progress` 요청 body 캡처 한 장(P1 증거의 나머지 절반 · `docs/evidence/2026-09-06-p1-payload/` 옆에) | 계정 연결이 필요하다 | **🔴 지금.** 코드 쪽(Cron · 리셋 문 · `vercel.json`)은 63바퀴에, P1 증거의 코드 쪽은 64·65바퀴에 다 됐다 — 값만 꽂으면 데모가 production 에서 매일 03:00 KST 에 다시 선다 |
| 실데이터 픽스처(`brain`) 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만 · SPEC §14 절삭 6번) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** 값은 `.env.local` 에만 산다 (P1).
🔴 `SUPABASE_JWT_SECRET` 이 없으면 **아무도 로그인하지 못한다** — 조용히 통과시키지 않는 것이
의도다 (`src/lib/api/session.ts`).

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

- 🔴 **CI 가 빨개지면 「무엇이 빨간가」보다 「무엇이 바뀌었나」를 먼저 봐라 — 코드 변화 0 인데 빨가면 기계다.** 72바퀴: 같은 트리가 16:46 GREEN,
  17:06·17:10 RED. 차이는 16:50:55 에 뜬 사람의 게임(CPU 74~80%)뿐이었고, 빨간 10 파일은 전부 `freshDb()` 첫 훅의 10초 상한이었다.
  잰 방법: `Get-Process` 3초 델타로 누가 CPU 를 먹는지 · 게임 프로세스의 `StartTime` · 빨간 파일만 `npx vitest run <files>` 로 따로(10/10 초록).
  ⚠ 사람이 쓰는 프로세스는 죽이지 마라. 게이트 쪽을 고친다 (FINDINGS 136) — 그리고 `loop/PROMPT.md` ③ 「한 번에 하나」처럼 **CI 는 한 번 더
  돌려 보고** 같은 자리에서 같은 모양이면 그때 기계로 본다.
- **탭 포커스·클릭·계산된 스타일은 `--screenshot` 이 아니라 CDP 로 잰다.** headless Chrome 을 `--remote-debugging-port` 로 띄우고 Node 22 의 내장
  WebSocket 으로 `Input.dispatchKeyEvent`(Tab) · `Runtime.evaluate` · `Page.captureScreenshot` — 의존성 0 (`docs/evidence/2026-09-06-focus-visible/focus-cdp.mjs`).
  ⚠ 마우스 대조군으로 **링크**를 누르면 화면이 넘어가 대조군이 없어진다 — 버튼을 눌러라 (70바퀴가 밟았다). `nextjs-portal` 이 탭 순서에 끼는 것은 dev 오버레이다.
- 🔴 **headless Chrome 의 `--window-size=375,…` 는 375 가 아니다.** Windows 의 Chrome 은 창 최소 너비(약 500px)를 강제해서 **~504 뷰포트를
  375 로 자른 그림**이 나온다 — 「모바일에서 넘친다」로 오독하기 딱 좋다 (가운데 정렬 카드가 x=32 에서 시작하면 그 신호다). 좁은 뷰포트는
  **375px iframe 에 넣어** 찍어라 (`docs/evidence/2026-09-06-keep-all/probe.txt` · 미디어 쿼리는 iframe 너비에 반응한다). 단 iframe 안의
  fetch 는 `--virtual-time-budget` 을 안 기다려서 API 를 부르는 화면은 스켈레톤으로 찍힌다 (69바퀴).
- 🔴 **68바퀴는 CI 를 배경으로 띄우고 「알림을 기다리겠다」며 턴을 끝냈다 — 그 턴이 마지막 턴이라 커밋 0.** `loop/PROMPT.md` ⑥ 그대로다.
  69 가 같은 트리에서 앞단 CI 를 돌려 올렸다 (`9319617`). 문서에 자리표시자(`__HASH68__` · `__CI68__`)를 남겨 둔 덕에 채워 넣기만 하면 됐다 —
  그 습관은 지켜라. 그리고 개발 서버를 배경에 띄웠으면 **끝나기 전에** 포트의 PID 를 죽여라 (69 는 `Stop-Process -Id <pid>`).
- 🔴 **Next dev 는 라우트마다 모듈을 새로 평가한다 — 프로세스 단위 자원(DB 풀 · 캐시)을 모듈 변수에 두면 라우트 수만큼 생긴다.**
  `let cached` 가 그랬고 게스트 데모의 모든 화면이 30초 뒤 500 이었다 (FINDINGS 127). 그런 자원은 `globalThis[Symbol.for(…)]` 에
  두고, **시험이 `setDbForTest` 로 우회하는 길이 아니라 진짜 길**(`postgres()` 를 만드는 길)을 하나는 지나게 해라 (`test/db-pool.test.ts`).
- 🔴 **개발용 서버를 배경에서 띄웠다가 멈출 때 pnpm 만 죽고 node 자식이 산다.** 55432·3000 이 잡힌 채로 다음 `demo:db` 가 EADDRINUSE 로
  죽는다. 멈춘 뒤 `Get-NetTCPConnection -State Listen` 으로 포트를 보고 **그 PID 를** 끝내라 (67바퀴).
- 🔴 **「잴 것이 없어서 초록」은 초록이 아니다.** payload 단계의 「env 값이 payload 에 0건」은 픽스처
  `.env.example` 의 값을 찾았는데, 다른 게이트(`fixtures.mjs` ③)가 그 파일에 값을 **금지**한다 — 두 게이트가
  서로를 무효화해 검사가 63바퀴 내내 0개를 재고 OK 를 찍었다 (FINDINGS 124 · 125). **「N 개를 재어 0건」처럼
  잰 수를 detail 에 찍고, 0개면 FAIL 로 만들어라.** 로그에 OK 만 찍히는 검사는 눈으로 절대 못 잡는다.
- 🔴 **PowerShell 도구의 작업 폴더가 바퀴 도중에 옮겨진다 — `-File tools/ci.ps1` 이 「does not exist」로 안 돌았는데 종료 코드는 0 이었다.**
  배경 실행이라 결과 줄만 보면 성공처럼 보인다. CI 는 **절대 경로**(`C:\dev\hackathon\tools\ci.ps1`)로 부르고, 결과는 종료 코드가
  아니라 출력의 `=> GREEN` 줄과 `.ci/result` 의 시각으로 확인해라 (65바퀴).
- 🔴 **여섯 바퀴(58·59·60·61·63·64) CI GREEN 까지 가고 커밋 없이 끝났다.** 64 는 커밋 메시지(`.ci/commit-64.txt`)까지 써 두고
  끝났다 — 65 가 그 메시지 그대로 올렸다. **CI GREEN 이면 STATUS 를 쓰기 전에 커밋해라.** 63 은 STATUS·PLAN·FINDINGS 까지 다 쓴 뒤
  끝났다. 그리고 63 의 함정 메모(「손으로 옮겼다」)는 **옮겨지지 않은 채**였다 — 적은 것과 디스크가 달랐다.
  **적기 전에 `ls` 로 한 번 봐라.** 64 는 CI GREEN 직후 코드·PLAN·FINDINGS 를 첫 커밋으로, STATUS 를 둘째로 했다.
- **`new Date().toISOString().slice(0, 10)` 은 UTC 날짜다.** KST 새벽에 돌린 덤프가 `docs/evidence/`
  에 **어제 날짜** 폴더를 만들었다 (63바퀴 · 64바퀴가 옮겼다). 증거 폴더 이름은
  `toLocaleDateString('sv-SE')` 로 — 다른 덤프 스크립트는 날짜를 손으로 박아서 이 함정이 없다.
- 🔴 **네 바퀴 연속(58·59·60·61) CI GREEN 근처까지 가고 커밋 없이 끝났다.** 61 은 CI 가
  walkthrough 도중에 끊긴 채였다. 62바퀴는 **코드·PLAN·FINDINGS 를 CI GREEN 직후 첫 커밋으로**
  올리고 STATUS 는 둘째 커밋으로 했다 — 이 순서를 지켜라 (loop/PROMPT.md ⑤).
- 🔴 **Bash 도구의 heredoc 이 역슬래시를 한 겹 벗긴다 — 세 번째다.** 이번엔 TS 정규식의
  CR·개행 이스케이프가 진짜 CR·개행이 되어 esbuild 가 「Unterminated regular expression」으로
  죽었다. python heredoc 으로 그 자리를 다시 고치려다 **또** 접혔다(python 이 한 겹 더 벗긴다).
  그리고 heredoc 본문 안의 **작은따옴표**도 도구 쪽 파서에 걸려 「unexpected EOF」로 죽는다.
  **이스케이프나 따옴표가 든 내용은 Edit/Write 도구로 써라** — 긴 python 스크립트도 Write 로
  `.ci/*.py` 에 두고 `python 파일` 로 돌려라. 위에 두 번 적혀 있었는데 또 밟았다.

- 🔴 **두 바퀴 연속(58·59) CI GREEN 까지 가고 커밋 없이 끝났다.** 둘 다 CI 뒤에 STATUS·PLAN·
  FINDINGS 를 길게 쓰다가 바퀴가 끝났다. 다음 바퀴가 주워서 올렸지만 그건 운이다 — 한 번만
  `.ci/` 를 지우는 다른 세션이 끼면 그 작업은 사라진다. **CI 가 GREEN 인 순간 코드·시험·
  PLAN 한 줄만 먼저 커밋하고, STATUS 는 둘째 커밋으로** (loop/PROMPT.md ⑤ 는 이미 그렇게
  적혀 있다 — 지키지 않은 것이 문제다). 60바퀴는 그렇게 했다.
- 🔴 **`next dev` 로 API 를 두드리지 마라.** 렌더 워커가 한 번 죽으면 그 뒤의 모든 라우트가
  **500 을 HTML 로** 낸다 (`Jest worker encountered 2 child process exceptions`).
  JSON 을 기대한 스크립트는 `Unexpected token '<'` 로 죽는다. `pnpm --filter web build` →
  `next start` 로 가라 — 이번 바퀴에 30분을 여기서 썼다.
  ⚠ 그리고 **`next dev` 는 `.next` 를 개발용으로 덮어쓴다.** 그 뒤 `next start` 는
  「production build 가 없다」로 죽는다. 순서는 언제나 **build → start** 다.
- 🔴 **`Get-Content -Raw` 는 PS 5.1 에서 ANSI 로 읽는다** — UTF-8 한글이 깨지고
  `ConvertFrom-Json` 이 「잘못된 배열이 전달되었습니다」로 죽는다. **증상이 원인을 안 가리킨다**
  (이번엔 「hooks.json 의 `_writes` 선언이 없다」로 보였다). JSON 을 읽을 거면
  `[System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)` 를 써라.
- 🔴 **`python - <<'PY'` 안의 `\n` 이 `
`(진짜 개행)으로 접힌다.** 이번에 시험 파일의
  `'# 남의 파일
'` 이 두 줄로 갈라져 TS 가 깨졌다. STATUS 에 이미 있던 함정
  (「heredoc 으로 파일을 쓰면 `\` 가 `\` 로 접힌다」)과 같은 것이다 —
  **파일 편집은 Edit/Write 도구로 해라.** 특히 이스케이프가 든 코드는.
- 🔴 **`Get-Content -Raw` 는 PS 5.1 에서 ANSI 로 읽는다.** UTF-8 한글이 깨지고
  `ConvertFrom-Json` 이 「잘못된 배열이 전달되었습니다」로 죽는다. **증상이 원인을
  하나도 안 가리킨다** — 이번엔 「hooks.json 의 `_writes` 선언이 없다」로 보였다.
  JSON 을 읽을 거면 `[System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)`.
- 🔴 **`python - <<'PY'` 안에서도 역슬래시가 접힌다.** 이번엔 TS 문자열의 개행
  이스케이프가 **진짜 개행**이 되어 시험 파일이 두 줄로 갈라졌다. STATUS 에 이미 있던
  함정(「heredoc 으로 파일을 쓰면 역슬래시가 접힌다」)과 같은 것이다 —
  **이스케이프가 든 코드는 Edit/Write 도구로 써라.** 두 바퀴 연속으로 밟았다.
- 🔴 **서버를 같은 프로세스에서 띄운 채 `execFileSync` 를 부르면 영원히 안 끝난다.**
  동기 호출이 이벤트 루프를 잡아서 서버가 응답을 못 한다 — 자식은 timeout 까지 기다렸다
  죽고, 증상은 **「이유 없이 exit -1, 출력 없음」**이다 (원인이 하나도 안 보인다).
  `execFile` + Promise 로 가라 (`plugin/contextops/scripts/walkthrough-sync.ts`).
- **`execFileSync`·`execFile` 은 실패해도 `stderr` 가 빈 문자열일 수 있다.** 못 띄운
  경우(spawn 실패·timeout)는 `err.message` 가 유일한 단서다. `e.status`(또는 `e.code`)가
  숫자가 아니면 **프로세스가 안 돌았다**는 뜻이니 둘을 구별해서 남겨라.
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
