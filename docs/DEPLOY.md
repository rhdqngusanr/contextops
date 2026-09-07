# DEPLOY — production 을 세우는 절차 (PLAN P5 첫 행)

> **이 파일이 배포 절차의 정본이다.** 지금까지 이 절차는 `.env.example` 의 주석 ·
> `apps/web/vercel.json` 의 `_comment` · `docs/PLAN.md` 의 P5 행에 **흩어져** 있었다.
> 흩어져 있으면 다음 사람은 반드시 하나를 빠뜨린다 (CLAUDE.md 「확장은 표에 한 줄」).
>
> 🙋 **표시가 있는 걸음은 계정이 필요해서 사람만 할 수 있다.** 나머지는 명령 한 줄이다.
>
> ⚠ **값을 여기에 적지 마라.** 키의 정본 목록은 `apps/web/.env.example`,
> 실제 값은 각자 기계의 `.env.local` 과 `.env.vercel`(둘 다 `.gitignore` 대상)에만 산다 (P1).

---

## 완료 기준

**`pnpm --filter web verify:prod -- --url https://<production>` 이 `0 failed` 다.**

그 명령이 재는 것은 `apps/web/e2e/production.ts` 의 머리말에 있다 — 배포만이 증명하는
넷(DB 에 닿는가 · Cron 자물쇠가 걸렸나 · 데모가 심어졌나 · GATE 3 가 production 속도로도
지나는가)이다. **눈으로 한 번 밟는 것으로 두지 않는 이유**도 거기 적혀 있다.

---

## 걸음

### ① Supabase — 이미 있다

프로젝트는 이미 서 있고 마이그레이션도 돌았다 (71바퀴 `adac632` · PostgreSQL 17.6 ·
**표 18 · 인덱스 8**). 확인은 한 줄이다:

```bash
pnpm --filter web db:status
```

**새 Supabase 프로젝트로 갈아탈 때만** 마이그레이션을 다시 돌린다:

```bash
pnpm --filter web db:migrate
```

⚠ 마이그레이션은 **Transaction pooler(6543)로 돌리지 마라.** 직결(5432) 또는
Session pooler(5432 · 사용자명 `postgres.<PROJECT_REF>`)여야 한다. 직결은 IPv6 전용이라
IPv4 망에서는 Session pooler 가 유일한 길이다 (실측 2026-09-06 · `.env.example` 의 그 줄).
그래서 `.env.local`(Session pooler)과 `.env.vercel`(Transaction pooler)의
`DATABASE_URL` 이 **일부러 다르다.**

### ② 🙋 Vercel 프로젝트를 만든다

- 저장소를 Import 한다
- **Root Directory 를 `apps/web` 으로 둔다** — 모노레포다. 이 값이 틀리면
  `apps/web/vercel.json` 이 안 읽혀서 **Cron 이 통째로 없는 배포**가 된다 (그 파일 머리 주석)
- Framework 는 Next.js (자동 인식)

### ③ 🙋 환경변수를 넣는다

Vercel → Project → Settings → Environment Variables → **Import `.env`** 로
`apps/web/.env.vercel` 을 통째로 넣는다. 그 파일이 「배포에 무엇을 넣고 무엇을 안 넣는지」의
정본이다 — 줄마다 왜인지가 적혀 있다.

키의 정본 목록은 `apps/web/.env.example` 이고, 배포에 필요한 것은 이 일곱이다:

| 키 | 없으면 |
|---|---|
| `DATABASE_URL` | 켜질 때 죽는다 (`src/db/client.ts`) |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 로그인 화면이 못 선다 |
| `SUPABASE_JWT_SECRET` | **아무도 로그인하지 못한다** — 조용히 통과시키지 않는 것이 의도다 |
| `CRON_SECRET` | 데모 리셋 문이 **401** 이다 (의도) — 넣어야 ⑤ 를 부를 수 있다 |
| `GEMINI_API_KEY` · `GEMINI_MODEL` · `AI_DAILY_BUDGET_USD` | 서버측 AI 가 픽스처 결과로 떨어진다 (P3) |

**넣지 않는 것 둘** — `.env.example` 의 키는 여기서 전부 한 번씩 결정된다
(`test/deploy-doc.test.ts` 가 「결정 안 된 키」를 FAIL 로 만든다. 새 변수가 생기면
배포에 넣을지 말지를 **여기서** 정하게 하는 자리다):

| 키 | 왜 안 넣나 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 코드에 소비처가 **0곳**이다 — 안 쓰는 비밀값이 배포 환경에 남는다 (`.env.vercel` 의 마지막 절) |
| `AI_MAX_INPUT_TOKENS` | 기본값이 있다 (`src/lib/ai/features.ts` 의 `DEFAULT_MAX_INPUT_TOKENS`). 바꿀 이유가 생기면 그때 넣는다 |

### ④ 🙋 배포한다

Vercel 이 push 마다 배포한다. 첫 배포가 끝나면 production URL 이 나온다.

### ⑤ 🙋 첫 데모 리셋을 손으로 한 번 부른다

Cron 은 매일 18:00 UTC(= 03:00 KST)에만 돈다. **그때까지 기다리면 `/demo` 가 비어 있다** —
데모 테넌트를 심는 것이 그 문이기 때문이다.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<production>/api/v1/cron/demo-reset
```

응답은 `{team_slug, existed, official_version, items, members, devices, reports, progress, proposals}` 다.
`items` 가 0 이면 심기가 안 된 것이다 — 그 문은 심다가 던지면 **다시 지운다**
(반쯤 심긴 데모보다 없는 데모가 낫다).

### ⑥ 검증한다 — **이 걸음이 완료 기준이다**

```bash
pnpm --filter web verify:prod -- --url https://<production>
```

`0 failed` 여야 한다. 빨간 줄이 나오면 그 줄이 어느 걸음을 안 했는지 말한다
(예: 게스트 세션 404 → 걸음 ⑤ 를 아직 안 했다).

### ⑦ 근거를 밖으로 복사한다

검증기는 `.ci/production/` 에 캡처와 `verify.json` 을 남긴다.
**`.ci/` 는 관통이 매번 통째로 지운다** — 그러니 적기 전에 복사부터 한다:

```bash
cp -r .ci/production docs/evidence/$(date +%Y-%m-%d)-production
```

### ⑧ 🙋 새 PC fresh install

다른 기계에서 README 의 설치 4줄만 보고 플러그인이 서는지 밟는다.
그 4줄의 정본은 `apps/web/src/components/landing.tsx` 의 `INSTALL_STEPS` 이고
README 와 글자 그대로 같다 (`test/readme.test.ts` 가 잰다).

---

## 배포 뒤에 열리는 것들

이 절차가 끝나야 닫을 수 있는 항목들이다 — **배포 전에는 재는 것이 불가능하다.**

| 무엇 | 어디 |
|---|---|
| 보안 캡처 증거 (브라우저 네트워크 탭) | `docs/PLAN.md` P5 첫 행 ② · `docs/evidence/2026-09-06-p1-payload/` |
| Vercel 함수 로그가 `src/lib/api/log.ts` 의 필드만 남기는가 | `docs/KNOWN_LIMITATIONS.md` |
| `queued` 로 남는 job 이 실제로 생기는가 | `docs/feedback/FINDINGS.md` 156 |
| 제출서의 production URL | `docs/SUBMISSION.md` 의 🙋 자리 |
