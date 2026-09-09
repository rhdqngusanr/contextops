# DEPLOY — production 을 세우는 절차 (PLAN P5 첫 행)

> **이 파일이 배포 절차의 정본이다.** 지금까지 이 절차는 `.env.example` 의 주석 ·
> `apps/web/src/lib/api/vercel.ts` 머리 주석 · `docs/PLAN.md` 의 P5 행에 **흩어져** 있었다 (`vercel.json` 자체에는 주석을 둘 수 없다 — Vercel 이 모르는 키를 거부한다 · 2026-09-10).
> 흩어져 있으면 다음 사람은 반드시 하나를 빠뜨린다 (CLAUDE.md 「확장은 표에 한 줄」).
>
> 🙋 **표시가 있는 걸음은 계정이 필요해서 사람만 할 수 있다.** 나머지는 명령 한 줄이다.
>
> ⚠ **값을 여기에 적지 마라.** 키의 정본 목록은 `apps/web/.env.example`,
> 실제 값은 각자 기계의 `.env.local` 과 `.env.vercel`(둘 다 `.gitignore` 대상)에만 산다 (P1).
>
> 문서가 코드와 갈라지지 않게 `apps/web/test/deploy-doc.test.ts` 가 잰다 — 환경변수 키 전부의 결정 ·
> Cron 경로 · 명령 이름 · 가리키는 경로의 실존.

---

## 완료 기준

**`pnpm --filter web verify:prod -- --url https://<production>` 이 `0 failed` 다.**

✅ **2026-09-10 충족** — <https://contextops-rosy.vercel.app> · 44 passed · 0 failed · 첫 리셋 7.6초 · 근거 `docs/evidence/2026-09-10-production/`. 밟으며 만난 것 둘은 그 README 에 적었다 (`vercel.json` 의 `_comment` 거부 · Import 가 자동 감지한 빈 env). 남은 손 걸음은 ⑥-b 의 로그인 실측과 GitHub 변수 **PROD_ORIGIN** 이다.

그 명령이 재는 것은 `apps/web/e2e/production.ts` 의 머리말에 있다 — 배포만이 증명하는
넷(DB 에 닿는가 · Cron 자물쇠가 걸렸나 · 데모가 심어졌나 · GATE 3 가 production 속도로도
지나는가)이다. **눈으로 한 번 밟는 것으로 두지 않는 이유**도 거기 적혀 있다.

---

## 🔴 가장 빠른 길 — 순서와 예상 시간 (2026-09-09 감사에서 정리)

| # | 걸음 | 누가 | 예상 | 끝났다는 증거 |
|---|---|---|---|---|
| 0 | **코드 쪽 조건은 이미 저장소에 있다** — cron 하루 1회 · 함수 리전 서울 · 오래 도는 문의 시간 상한 · RLS(마이그레이션 0008). 정본은 `apps/web/vercel.json` 과 `apps/web/src/lib/api/vercel.ts`. CI 초록을 확인하고 push | Claude → 사람 push | 10분 | origin/main == 로컬 |
| 1 | ① Supabase 상태 — `pnpm --filter web db:status` 가 pending 0 · rls 18/18 | 사람 | 10분 (pending 이면 +10분) | 그 출력 |
| 2 | ①-b 🙋 Supabase Auth 걸음 넷 + Data API 끄기 | 사람 | 30분 | GitHub 공급자 ON · URL 등록 · Data API OFF |
| 3 | ② 🙋 Vercel Import (Root Directory `apps/web` · Fluid compute 켜짐 확인) | 사람 | 20분 + 첫 빌드 | 프로젝트 생성 |
| 4 | ③ 🙋 환경변수 Import | 사람 | 10분 | 여덟 키 |
| 5 | ④ 첫 배포 로그 — 실패하면 원인 한 줄을 `docs/STATUS.md` 에 적고 재배포 (흔한 원인은 아래 ④) | 사람 | 30분~2시간 | production URL |
| 6 | ⑤ 🙋 첫 데모 리셋 curl + 소요 초 기록 | 사람 | 10분 | `items` 27 |
| 7 | ⑥ 검증기 0 failed | 사람 | 10분 | verify.json |
| 8 | ⑥-b anon 키 REST 거부 확인 · 로그인 실측(GitHub → 팀 생성 201) | 사람 | 20분 | 캡처 2장 |
| 9 | ⑦ 근거 복사 · `docs/SUBMISSION.md`·README 머리에 URL | 사람 + Claude | 20분 | 🙋 표에 https:// |
| 10 | ⑧ 🙋 새 PC fresh install | 사람 | 2시간 | transcript |

사람 시간은 합쳐 **5~8시간**으로 잡는다 — 첫 배포는 env 오타·픽스처 추적·pnpm 설정 하나로 두세 번 재배포가 난다.
하루에 안 끝나면 5번 이후를 다음 날 오전으로 민다. 링크는 **심사 기간(9/21~10/5 · 본선까지면 10/17) 내내 살아 있어야 한다** —
그 뒤의 운영 걸음은 맨 아래 「배포 뒤에 열리는 것들」.

### Vercel Hobby 한도 — 이 절차가 기대는 것 (확인일 2026-09-09)

| 한도 | 값 | 우리 |
|---|---|---|
| Cron | **하루 1회 이하** · 정각이 아니라 그 시간 안 임의 분(최대 59분 늦음) | health 21:00 UTC · demo-reset 18:00 UTC (`apps/web/vercel.json`). 예전 health `0 */6` 은 배포 자체가 거부될 값이었다 — 시험 ⑥이 「분·시 칸이 숫자 하나」를 잰다 |
| 함수 리전 | 하나 | 서울 icn1 — Supabase 와 같은 도시. 정본은 `apps/web/src/lib/api/vercel.ts` |
| 함수 시간 | Fluid compute **켜짐**: 기본·최대 300초 · 꺼짐: 60초 | 오래 도는 문 4개(데모 리셋 · 문서 구조화 · batch-draft · job 재시도)가 300. **Fluid 가 꺼져 있으면 300 이 배포를 거부한다** — ② 에서 켠다(새 프로젝트는 기본 켜짐) |
| 상업 이용 | 비상업 한정 | 제출서의 사업 모델은 「가설」로만 · 가격·결제 문구 0건 |

---

## 걸음

### ① Supabase — 이미 있다

프로젝트는 이미 서 있고 마이그레이션도 돌았다 (71바퀴 `adac632` · PostgreSQL 17.6 ·
**표 18 · 인덱스 8**). 2026-09-09 에 **RLS 를 켜는 마이그레이션 0008** 이 생겼으므로 배포 전에 한 번 더 본다:

```bash
pnpm --filter web db:status
```

`pending 0` 과 `rls 18/18 표에 켜짐` 이어야 한다. pending 이 있으면 적용한다:

```bash
pnpm --filter web db:migrate
```

⚠ 마이그레이션은 **Transaction pooler(6543)로 돌리지 마라.** 직결(5432) 또는
Session pooler(5432 · 사용자명 `postgres.<ref>`)여야 한다. 직결은 IPv6 전용이라
IPv4 망에서는 Session pooler 가 유일한 길이다 (실측 2026-09-06 · `.env.example` 의 그 줄).
그래서 `.env.local`(Session pooler)과 `.env.vercel`(Transaction pooler)의
`DATABASE_URL` 이 **일부러 다르다.**

⚠ **RLS 와 서버의 관계** — 0008 은 정책 없이 RLS 만 켠다(= anon/authenticated 전면 거부). 서버는
`DATABASE_URL` 의 역할(`postgres`)로 붙는데 그 역할이 **표 소유자**라 RLS 의 영향을 받지 않는다. 마이그레이션을
다른 역할로 돌린 적이 있다면 소유자가 다를 수 있으니 SQL Editor 에서 한 번 확인한다:

```sql
select tablename, tableowner from pg_tables where schemaname = 'public';
```

전부 `postgres` 면 된다. 아니면 그 표는 소유자를 `postgres` 로 바꾼 뒤 진행한다 — 정책 없는 RLS 가 서버까지 막는 유일한 경우다.

### ①-b 🙋 Supabase Auth 걸음 넷 + Data API 끄기

2026-09-09 에 공개 엔드포인트로 실측한 이 프로젝트의 상태: **GitHub 로그인 공급자가 꺼져 있고**(이메일만 켜짐) ·
**서명키는 ES256** 하나 · **Data API 가 열려 있어 anon 키로 REST 가 200** 을 준다(표는 비어 있었다).
로그인 화면의 유일한 파란 버튼이 지금 죽어 있는 상태라, 이 걸음 없이는 ⑥-b 가 반드시 빨갛다.

| 걸음 | 어디 | 무엇 |
|---|---|---|
| GitHub 공급자 켜기 | GitHub → Settings → Developer settings → OAuth Apps → New · Supabase → Authentication → Sign In / Providers → GitHub | Homepage `https://<production>` · Authorization callback URL `https://<ref>.supabase.co/auth/v1/callback` → Client ID · Secret 을 Supabase 에 붙여 넣고 Enable |
| URL 등록 | Supabase → Authentication → URL Configuration | Site URL `https://<production>` · Redirect URLs 에 `https://<production>/auth/callback` 과 `http://localhost:3000/auth/callback` — 없으면 로그인이 조용히 Site URL 로 튕긴다 |
| 세션 길이 | Supabase → Authentication → Sessions | access token 만료를 최대치로 — 세션 갱신 코드가 없어 만료 = 강제 로그아웃이다 (INBOX 블로커 3 · refresh 는 안 만든다) |
| 서명키 종류 기록 | Supabase → Project Settings → JWT Keys | CURRENT 키가 ES256 이든 HS256(legacy secret)이든 검증기(`apps/web/src/lib/api/session.ts`)의 표에 둘 다 있다 — ES256 이면 공개키를 `NEXT_PUBLIC_SUPABASE_URL` 의 JWKS 에서 받으므로 그 변수가 **서버에도** 있어야 한다(`.env.vercel` 에 이미 있다). `SUPABASE_JWT_SECRET` 은 게스트·시드 세션(HS256)에 여전히 필요하다 |
| **Data API 끄기** | Supabase → Project Settings → Data API | 끄거나 Exposed schemas 에서 `public` 을 뺀다. ★ 왜 안전한가 — 제품 코드는 Drizzle 직결만 쓴다(PostgREST 호출 0건). ★ 왜 필요한가 — anon 키는 브라우저 번들에 실리고, RLS 만으로는 SELECT 가 200 + 빈 배열이라 「열려 있다」는 사실이 남는다 |

이메일 매직링크는 Supabase 기본 SMTP 라 **프로젝트 팀 멤버 주소로만** 간다(시간당 소수 건). 심사위원에게는 절대 도착하지
않으므로 심사 기간에는 이메일 문을 숨긴다 — `NEXT_PUBLIC_AUTH_EMAIL_LOGIN` 을 비워 두면 화면이 그 문 대신 `/demo` 를 안내한다.
커스텀 SMTP(Resend 등)를 붙인 뒤에만 `1` 로 켠다.

### ② 🙋 Vercel 프로젝트를 만든다

- 저장소를 Import 한다
- **Root Directory 를 `apps/web` 으로 둔다** — 모노레포다. 이 값이 틀리면
  `apps/web/vercel.json` 이 안 읽혀서 **Cron 도 리전도 없는 배포**가 된다 (그 파일 머리 주석)
- Framework 는 Next.js (자동 인식) · Include source files outside of the Root Directory 는 켜 둔다(기본값 · 워크스페이스 패키지와 `fixtures/` 가 바깥에 있다)
- **Project Settings → Functions → Fluid compute 가 켜져 있는지 본다.** 꺼져 있으면 켠다 — 오래 도는 문의 300초가 이 전제 위에 있다(위 한도 표)

### ③ 🙋 환경변수를 넣는다

Vercel → Project → Settings → Environment Variables → **Import `.env`** 로
`.env.vercel`(apps/web 아래 · gitignore 대상이라 GitHub 에는 없다) 을 통째로 넣는다. 그 파일이 「배포에 무엇을 넣고 무엇을 안 넣는지」의
정본이다 — 줄마다 왜인지가 적혀 있다.

키의 정본 목록은 `apps/web/.env.example` 이고, 배포에 필요한 것은 이 여덟이다:

| 키 | 없으면 |
|---|---|
| `DATABASE_URL` | 켜질 때 죽는다 (`src/db/client.ts`) — 배포용은 Transaction pooler(6543) |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 로그인 화면이 못 선다 |
| `SUPABASE_JWT_SECRET` | 게스트·시드 세션(우리가 HS256 으로 서명)이 **하나도 통과하지 못한다** — `/demo` 가 죽는다. 조용히 통과시키지 않는 것이 의도다. 사람의 로그인 토큰이 ES256 이면 그쪽은 JWKS 로 확인한다(①-b) |
| `CRON_SECRET` | 데모 리셋 문이 **401** 이다 (의도) — 넣어야 ⑤ 를 부를 수 있다 |
| `GEMINI_API_KEY` · `GEMINI_MODEL` · `AI_DAILY_BUDGET_USD` | 서버측 AI job 이 실패로 끝난다 (P3 · 키 없음을 화면이 말하게 하는 것은 INBOX 고장 9) |

**넣지 않는 것 둘** — `.env.example` 의 키는 여기서 전부 한 번씩 결정된다
(`apps/web/test/deploy-doc.test.ts` 가 「결정 안 된 키」를 FAIL 로 만든다. 새 변수가 생기면
배포에 넣을지 말지를 **여기서** 정하게 하는 자리다):

| 키 | 왜 안 넣나 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 코드에 소비처가 **0곳**이다 — 안 쓰는 최고 권한 키가 배포 환경에 남는다 (`.env.vercel` 의 마지막 절) |
| `AI_MAX_INPUT_TOKENS` | 기본값이 있다 (`src/lib/ai/features.ts` 의 `DEFAULT_MAX_INPUT_TOKENS`). 바꿀 이유가 생기면 그때 넣는다 |
| `AI_PROJECT_DAILY_BUDGET_USD` | 기본값이 있다 (`src/lib/ai/features.ts` 의 DEFAULT_PROJECT_DAILY_BUDGET_USD = $1 · 전역 $3 안의 프로젝트별 이중 상한 · INBOX H11). 심사 기간에 한 프로젝트가 하루 열두 장 넘게 구조화하면 그때 올린다 |
| `NEXT_PUBLIC_AUTH_EMAIL_LOGIN` | 비우면 이메일 매직링크 문이 **숨겨진다** — 기본 SMTP 는 팀 멤버 주소로만 보내서 심사위원에게는 안 간다. 커스텀 SMTP(Resend 등)를 붙인 뒤에만 `1` 로 |

### ④ 🙋 배포한다

Vercel 이 push 마다 배포한다. 첫 배포가 끝나면 production URL 이 나온다.

첫 배포가 빨갛게 끝나는 흔한 이유와 답: **Cron 거부**(표현식이 하루 1회보다 잦다 → `apps/web/vercel.json` 을 본다 · 지금은 둘 다 하루 1회) ·
**maxDuration 거부**(Fluid compute 가 꺼져 있다 → ②) · **pnpm 설치 실패**(`package.json` 의 `packageManager` 가 pnpm 메이저를 정한다 · Node 는 `.nvmrc`) ·
**env 오타**(켜질 때 죽는 값은 함수 로그에 이름이 찍힌다). 원인 한 줄을 `docs/STATUS.md` 「막힌 것」에 적고 재배포한다.

### ⑤ 🙋 첫 데모 리셋을 손으로 한 번 부른다

Cron 은 매일 18:00 UTC(= 03:00 KST) 즈음에만 돈다. **그때까지 기다리면 `/demo` 가 비어 있다** —
데모 테넌트를 심는 것이 그 문이기 때문이다.

```bash
time curl -H "Authorization: Bearer $CRON_SECRET" https://<production>/api/v1/cron/demo-reset
```

응답은 `{team_slug, existed, official_version, items, members, devices, reports, progress, proposals}` 다.
`items` 가 0 이면 심기가 안 된 것이다 — 그 문은 심다가 던지면 **다시 지운다**
(반쯤 심긴 데모보다 없는 데모가 낫다). **소요 초를 적어 둔다** — 300 의 1/3(100초)을 넘으면 씨앗의 기기·보고
루프를 병렬화한다(INBOX 블로커 2). 500 이고 함수 로그가 `fixtures` 경로를 못 찾는다고 하면 `next.config.ts` 의
`outputFileTracingIncludes` 키를 라우트 파일 경로로 바꿔 한 번 재배포한다.

### ⑥ 검증한다 — **이 걸음이 완료 기준이다**

```bash
pnpm --filter web verify:prod -- --url https://<production>
```

`0 failed` 여야 한다. 빨간 줄이 나오면 그 줄이 어느 걸음을 안 했는지 말한다
(예: 게스트 세션 404 → 걸음 ⑤ 를 아직 안 했다).

### ⑥-b 배포만이 증명하는 것 — 검증기가 재는 것과 손으로 재는 것

검증기(`apps/web/e2e/production.ts`)는 `apps/web/.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를
읽어 **Supabase 프로젝트 쪽**도 잰다 — GitHub 공급자가 켜져 있나(`/auth/v1/settings`) · JWKS 의 서명 방식이 검증기 표에 있나 ·
**anon 키로 Data API 가 표를 내주지 않나**(`rest/v1/users` 가 200 이 아니어야 한다 · RLS 만으로는 200 + `[]` 라 Data API 를 꺼야 한다) ·
로그인 화면에 GitHub 버튼이 실제로 그려지나(헤드리스 Chrome). 그 두 변수가 없으면 그 검사들은 FAIL 로 적힌다 — 건너뛰지 않는다.

손으로 재는 것 하나: **실제 로그인이 통과한다** — 시크릿 창에서 `https://<production>/login` → [GitHub로 계속] → `/t/new` 에서
팀 하나 만들기 → 201 이 왔는지(개발자 도구 Network) 캡처. 콜백 화면이 아니라 **로그인 뒤 쓰기 한 번**이 성공 기준이다. 되돌아오면
콜백 화면이 **원인 코드**를 보여 준다(`validation_failed` = 공급자 꺼짐 · `access_denied` = 사람이 취소) — ①-b 를 본다. 로그인은
됐는데 모든 화면이 다시 로그인하러 가면 서명키 갈래(①-b 「서명키 종류」)다.

### ⑦ 근거를 밖으로 복사한다

검증기는 `.ci/production/` 에 캡처와 `verify.json` 을 남긴다.
**`.ci/` 는 관통이 매번 통째로 지운다** — 그러니 적기 전에 복사부터 한다:

```bash
cp -r .ci/production docs/evidence/$(date +%Y-%m-%d)-production
```

그리고 `docs/SUBMISSION.md` 의 🙋 표와 README 머리에 production URL 을 적는다. URL 이 적히면 세 문서(제출서 · README ·
`docs/KNOWN_LIMITATIONS.md`)에서 「production 이 아직 없다」 문장을 지운다 — 남으면 심사의 첫 질문이 된다.

### ⑧ 🙋 새 PC fresh install

다른 기계에서 README 의 설치 4줄만 보고 플러그인이 서는지 밟는다.
그 4줄의 정본은 `apps/web/src/components/landing.tsx` 의 `INSTALL_STEPS` 이고
README 와 글자 그대로 같다 (`test/readme.test.ts` 가 잰다). 셋째 줄은 터미널 명령이 아니라 **Claude Code 안의
`/contextops:setup`** 이다 — 웹 Sync 화면 [기기 추가] 가 준 한 줄을 그대로 붙여 넣는다. 밟은 결과(transcript)는
`docs/evidence/` 에 남긴다 — 이 저장소가 「플러그인」을 주장하는 근거가 된다.

---

## 심사 기간 런북 (9/20 제출 ~ 심사 종료)

**지키는 것은 하나다 — `https://<production>/demo` 가 열린다.** 규정상 심사 기간에 링크가 안 열리면 심사에서 제외될 수 있다 (`docs/SUBMISSION.md` 「대회 규정 원문」).

| 장치 | 무엇을 하나 | 🙋 사람이 할 것 |
|---|---|---|
| `.github/workflows/watch-prod.yml` | 30분마다 `/` · `/api/v1/health`(db·ai) · `POST /api/v1/demo/session` 을 두드리고 하나라도 아니면 **실패 메일** | 저장소 Settings → Variables 에 **PROD_ORIGIN**(GitHub 변수 · 환경변수 파일이 아니다)을 넣는다 · 만든 날 일부러 틀린 origin 으로 `workflow_dispatch` 해 메일이 오는지 확인 · 확인 뒤 되돌린다 |
| `apps/web/src/lib/demo/reset.ts` (03:00 KST) | `demo-next` 옆자리에 끝까지 심은 뒤에야 옛 팀을 지우고 slug 를 바꾼다 — **심기가 죽으면 어제 데모가 그대로** | 실패 메일을 받으면 `GET /api/v1/cron/demo-reset`(`CRON_SECRET` Bearer)을 손으로 한 번 더 부른다 |
| `verify:prod` | 배포 직후·릴리즈 뒤 한 번 — Supabase 공급자·JWKS·anon 거부·로그인 버튼·health.ai 까지 | 제출 전날(9/19) 한 번, 제출 뒤 코드가 바뀌면 그때마다 |
| 동결 | `release` 브랜치를 Production Branch 로 · Preview 배포 끄기 · 루프 STOP | 9/18 저녁 (INBOX 블로커 6) — 심사 기간엔 main 에 push 해도 production 이 안 바뀐다 |

**메일이 왔을 때 3분 안에 보는 순서** — ① 브라우저로 `/demo` 를 연다 (감시가 틀렸을 수도 있다) ② `https://<production>/api/v1/health` — `db:false` 면 Supabase 대시보드(프로젝트가 잠들었나 · 무료 플랜은 7일 미사용 시 일시정지) · `ai:false` 면 Vercel env 의 `GEMINI_API_KEY` ③ `/demo/session` 이 404 면 리셋을 손으로 부른다 ④ 그래도 안 되면 Vercel 대시보드에서 마지막 성공 배포로 **Instant Rollback**.

## 배포 뒤에 열리는 것들

이 절차가 끝나야 닫을 수 있는 항목들이다 — **배포 전에는 재는 것이 불가능하다.**

| 무엇 | 어디 |
|---|---|
| 보안 캡처 증거 (브라우저 네트워크 탭) | `docs/PLAN.md` P5 첫 행 ② · `docs/evidence/2026-09-06-p1-payload/` |
| Vercel 함수 로그가 `src/lib/api/log.ts` 의 필드만 남기는가 | `docs/KNOWN_LIMITATIONS.md` |
| `queued` 로 남는 job 이 실제로 생기는가 | `docs/feedback/FINDINGS.md` 156 |
| 제출서의 production URL | `docs/SUBMISSION.md` 의 🙋 자리 |
| 심사 기간 링크 유지 — 매일 `/demo` 가 열리는지 · 리셋 실패 시 대응 | 아래 「심사 기간 런북」 — 감시는 `.github/workflows/watch-prod.yml`(30분 · 🙋 GitHub 변수 **PROD_ORIGIN**) · 리셋은 옆자리에 심고 바꾸므로 실패해도 어제 데모가 산다 (`apps/web/src/lib/demo/reset.ts`) — 그래도 아침에 `https://<production>/api/v1/health` 와 `/demo` 를 눈으로 |
| 제출 뒤 동결 — `release` 브랜치를 Production Branch 로 · Preview 배포 끄기 · 루프 STOP | INBOX 블로커 6 (9/18 저녁) |
