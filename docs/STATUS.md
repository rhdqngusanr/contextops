# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-04 · 루프 24바퀴 · `4cb1ce8`_

---

## 지금 어디인가

**이번 바퀴는 화면이 하던 거짓말 하나를 지웠다** (FINDINGS 66 · `4cb1ce8`).
예산이 소진되면 화면 3 이 「샘플 결과를 표시합니다」라고 말했는데 **표시하는 코드가
0곳**이었다. 문구를 「…내일 다시 시도해주세요.」로 바꾸고, **②(픽스처를 만든다)는
「안 만든다」로 닫았다** — 실제 프로젝트에 픽스처 항목을 넣으면 그 줄이 사용자의
원문으로 역추적되지 않아 **P7 이 끊긴다** (§7.4 게스트 데모는 픽스처가 곧 원문이라
안 끊긴다). SPEC §7.5 에 그 결정과 이유를 적었다.
그리고 문구의 정본이 셋(문서·코드·시험)이던 것을 **하나로** 만들었다 —
시험이 `docs/DESIGN_BRIEF.md` §5 를 **읽어서** 대조한다.

**화면 3(가져오기)이 생겼다 — 지난 다섯 바퀴가 낸 문을 두드리는 화면이다.**
`…/import` 에서 문서를 붙여넣으면 `POST /documents` 가 구조화 job 을 만들고,
화면이 `GET …/jobs?feature=structure&limit=1` 을 2초마다 두드려 **진행을 그린다.**
그 다섯 문(job 자리 · 목록 · 목록 경량화 · 진행률 · 멈춤 판정)이 처음으로
**사람이 보는 것**이 됐다.

화면이 지킨 것 셋 — 전부 지난 바퀴들이 「화면이 이렇게 해야 한다」고 적어 둔 것이다:
`progress:null` 은 회전 · 있으면 막대이고 가운뎃말은 `unit` 을 그대로 쓴다 ·
`stalled` 는 서버가 낸 판정이라 화면이 다시 재지 않고 근거(`updated_at`)를 옆에 낸다 ·
「끝났나」는 `finished_at` 으로 본다(상태 이름을 손으로 세지 않는다).
**결과: 화면 코드 어디에도 `feature ===` 갈래가 없다.**

**여섯 모양을 눈으로 읽고 둘을 고쳤다** (`docs/evidence/2026-09-04-screen3/job-panel-states.txt`):
실패한 칸이 막대와 문장으로 **같은 수를 두 번** 그렸고(`✕` 도 둘이었다),
아직 한 걸음도 안 간 job 에 **「마지막 걸음 방금」**이라고 썼다(그 행의 `updated_at` 은
만든 시각이다 → 「올린 지」로 갈랐고, **가른 것은 상태 이름이 아니라 `started_at` 칸**이다).
그리고 읽은 것을 **게이트로 올렸다** (`test/web-job-progress.test.ts` · 15개).

⚠ **캡처로 본 적은 없다** — 이 환경에 브라우저가 없다. 아래 「눈 판정 대기」를 읽어라.
⚠ **여전히 진짜 Claude 를 부른 적이 없다.** 키가 없어 스텁으로만 쟀다 (🙋 사람).
⚠ **화면 3 은 세 길 중 하나만 그린다** — zip 도 질문 카드 10장도 없다 (**67**).
   🔴 그래서 **P3 둘째 행의 완료 기준(「문서 없이 질문만으로 v1.0 발행」)이 아직 막혀 있다.**
⚠ **화면 4(정리)는 아직 없다.**
✅ **화면이 거짓말을 하던 자리는 닫았다** (**66** · `4cb1ce8`).
⚠ **제안이 만든 줄이 그 제안으로 역추적되지 않는다** — `SourceRef` 의 `proposal` 을
   **만드는 제품 코드가 0곳**이다 (**68**). 골든은 `src:proposal:…` 를 갖고 있어서
   **Pack 형식은 그것을 약속하는데** 진짜 발행은 그 모양을 못 만든다 (P7).

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | 웹 화면 **1·4·6·8·9** |
| `packages/schema` (계약 전부 · 로컬 파일 **8종** · 테스트 **113**) | Supabase 프로젝트 (🙋 사람) · Vercel |
| `packages/compiler` (파이프라인 7단계 · 테스트 **136** · 태그 읽기) | **질문 카드 10장 · zip 업로드** (FINDINGS **67** — 화면 3 의 나머지 두 길) |
| `apps/web` — 라우트 **30개** · 테스트 **259** | **실패·멈춘 job 을 되살리는 문** (FINDINGS 59+64) |
| 🔴 **예산 가드** — `lib/ai/{features,budget,client,model}.ts` · `ai_usage` 표 · 시험 18 | ~~§7.5 「픽스처 결과」~~ — **안 만들기로 정했다** (66 ✅ · P7 이 끊긴다 · §7.4 전용) |
| 🔴 **문서 구조화** — `lib/ai/{structure,prompt}.ts` · `AiStructureOutput` · 시험 24 | **문서 종류를 읽는 코드** (FINDINGS 65 — `kind` 6종을 이제 고를 수는 있는데 골라도 안 바뀐다) · **토큰 발급 화면** (FINDINGS 36) |
| 🔴 **충돌 탐지** — `lib/ai/conflict.ts` · `CONFLICT_KIND_RULES` 표 · 시험 24 | `ask`·`demo` 를 부르는 자리 (기능 표의 나머지 둘 · §7.3·§7.4) |
| 🔴 **`conflicts` 표가 §7.2 를 담는다** — CHECK 5개 · 복합 FK · 마이그레이션 `0003` | 질문 → 만들어진 항목의 **근거 사슬** (FINDINGS 56) |
| 🔴 **job 자리** — `ai_jobs` 표(`progress`·`stalled` 판정) · `AI_JOB_RUNNERS` · 라우트 **4개** | `origin='doc'` 을 찍는 코드 (FINDINGS 31 — 없으면 `doc_vs_code` 가 영원히 0건) |
| 🔴 **화면 3 (가져오기)** — `…/import` · `usePolling` · `components/job-progress.tsx` · 시험 **15** | Anthropic API 키 (🙋 사람) · 실데이터 픽스처(`brain`) 판단 (🙋 사람) |
| 웹 화면 6개 (`/login` `/auth/callback` `/t/new` `…/import` `…/context` `…/packs`) | **브라우저 캡처** (이 환경에 없다 — 「눈 판정 대기」) |
| 🔴 **`plugin/contextops` — CLI 8/8 · Skill 3 · 훅 2 · 테스트 174** | **`{kind:'proposal'}` 근거를 붙이는 코드** (FINDINGS **68** — 발행이 `origin:'proposal'` 만 찍는다) |
| **`apps/web/scripts/dev-server.ts`** — 화면·API 를 눈으로 볼 수 있는 씨앗 서버 | |

검사 층: `principles OK 9 · typecheck 5초·멤버 4 · test 49초·멤버 4 · build 15초 ·
walkthrough 54초` → **GREEN**. 관통 **7단계**
(fixture·compile·api·publish·scan·payload·sync). 남은 SKIP 하나(`shots`)의 prereq 는
`apps/web/e2e`. ⚠ 관통은 §7.1·§7.2 를 **지나지 않는다** — 키가 없다.
시험 합계 **682** (schema 113 · compiler 136 · plugin 174 · web 259).
DB 는 **`0005`** 까지다 — 표 18개 · 인덱스 8개. **이번 바퀴는 DB 를 안 건드렸다.**

## 다음 바퀴가 할 일

🔴 **FINDINGS 67.** (66 은 닫았다 — `4cb1ce8`.) 68 은 그 다음이다.

**67 이 먼저인 이유** — 🔴 **P3 둘째 행의 완료 기준이 그것이다.**
「문서 없이 **질문만으로** v1.0 발행 가능」인데, 지금은 `open_question` 행을 만드는
자리가 §7.1 러너 하나뿐이라 **문서를 올려야 질문이 생긴다.**
정할 것은 「열 개 질문의 정본이 어디인가」 하나다 (FINDINGS 67 의 갈래 ⓐ·ⓑ).

**68 이 그 다음인 이유** — P7 이 반만 이어져 있다. 제안이 만든 개정은
`origin:'proposal'` 을 찍는데 `source_refs` 에는 **어느 제안인지가 없다.** 골든은
`src:proposal:…` 를 갖고 있어서 형식은 그것을 약속하는데 진짜 발행은 그 모양을
못 만든다. 고치는 자리는 `lib/api/publish.ts` 의 `insertRevision()` 한 곳이고
호출부가 이미 제안 id 를 들고 있다.

**시작하기 전에 아는 것:**

- 🔴 **화면 3 은 이미 있다.** `app/t/[team]/p/[project]/import/page.tsx` —
  카드 하나를 더 붙이는 자리이지, 새로 만들 화면이 아니다.
  ⚠ **누르면 아무 일도 없는 카드를 두지 마라.** 지금 하나만 그린 이유가 그것이다.
- 🔴 **job 한 장을 그리는 자리는 `components/job-progress.tsx` 하나다.**
  화면 4 가 `conflict` job 을 기다릴 때 **그것을 그대로 쓴다** — 화면 4 에서 진행률을
  다시 짜지 마라. 낱말(`조각`·`묶음`)은 응답의 `unit` 이 정하므로 고칠 것이 없다.
  ⚠ 거기에 `feature === …` 갈래를 만들면 §7.3 이 job 이 되는 날 다시 짜야 한다.
- 🔴 **여섯 모양을 그려 보는 시험이 있다** (`test/web-job-progress.test.ts`).
  화면 4 를 만들 때 **거기에 상태를 더 넣어라** — 브라우저 없이 잴 수 있는 눈 판정이
  거기 다 모여 있다 (색만으로 안 가른다 · 판정 옆에 근거 · 「실시간」 낱말 없음 ·
  없는 버튼 없음). 그리고 마크업을 **눈으로 읽어라** — 이번 바퀴에 고친 둘은
  시험이 아니라 그 글자를 읽어서 나왔다.
- **화면이 서버에 대해 아는 것은 `lib/web/queries.ts` 가 전부다.** 새 엔드포인트를
  화면 안에서 `apiJson('/…')` 로 조립하지 마라.
- **`usePolling(load, deps, again)`** — `again` 이 `null` 을 내면 멈춘다. 실패하면
  더 두드리지 않는다 (사람이 `reload()` 로 다시 시작한다).
- **화면 4(정리)는 볼 것이 있다** — 충돌 카드가 실제로 행으로 들어온다.
  `anchor` 가 `items` 면 항목 두 장, `document` 면 원문 구간이다. 화면이 그 표를
  **읽어서** 무엇을 그릴지 골라야 한다 (한쪽으로 접으면 P7 이 끊긴다).
- **job 을 재는 본보기는 `test/ai-job.test.ts` 다.** 「도는 도중」은 스텁 LLM 의
  `messages.create` 안에서 행을 읽어 붙잡고, 「시간이 지났다」는 기다리지 말고
  `updated_at` 을 뒤로 민다 (`toAiJob(row, now)` 의 둘째 인자로 시계를 옮긴다).
- **DB 는 `0005` 까지다.** 표 18개 · 인덱스 8개.

⚠ **P1 첫 행(DB·Supabase)은 사람이 막고 있다** — 루프 몫은 끝났다 (`389c7f2`).
⚠ **Anthropic API 키도 사람이 준다.**

**값싼 것들 (아무 바퀴에서나)**: FINDINGS **21·22·23·17·32·44·57·61·63** 은
문서·한 줄짜리다. **14**(`.ps1` 두 개가 LF)도 그렇다. **55**(공통 프롬프트)는 §7.3 전이 제일 싸다.
🔴 **30 과 46 은 한 묶음이다** — 둘 다 템플릿 `head` 한 줄이고 둘 다 golden 을 깬다.
🔴 **50 은 여전히 값싸고 더 급해졌다** — `callClaude()` 를 부르는 제품 파일이 둘이고
그 게이트는 예산 가드를 건너뛰는 새 파일을 못 잡는다.

⚠ FINDINGS **24·25·29·31·33·35·56·59·63·65·67** 은 **P3 둘째 행**이, **68** 은
**발행(§2.1)**이, **36** 은
**P4 화면 9** 가, **53** 은 **API 키가 생긴 뒤**가 주인이다.
**26** 은 절반(구조화 job)이 닫혔고 zip 만 남았다 (**67** 과 같은 자리다).

## 잰 것

**24바퀴 · FINDINGS 66 — 화면이 없는 것을 약속하던 문장을 지웠다** (`4cb1ce8`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 5초 / test 49초 / build 15초 / walkthrough 54초 7단계 |
| 새 시험 | **+1** — web 258 → **259**. 합계 **682** |
| 바꾼 문구 | `ERROR_HINT.BUDGET_EXCEEDED` — 「…샘플 결과를 표시합니다.」 → 「…내일 다시 시도해주세요.」. `RATE_LIMITED`(「잠시 후」)와 **다른 문장**이라 사람이 둘을 구별한다 |
| 같이 고친 자리 | DESIGN_BRIEF §5(문구 정본) · **§4 화면 8 질의창 배지**(같은 약속을 복사하고 있었다 — 반만 고치면 화면 8 을 만드는 바퀴가 그 거짓말을 되살린다) · SPEC §7.5 |
| 정본을 셋 → 하나로 | `web-tables.test.ts` 가 문구를 **복사해** 갖고 있었다. 이제 `docs/DESIGN_BRIEF.md` §5 를 **읽어서** 대조한다 (`briefSection5()` · 연결선은 `BRIEF_5_BULLET` 표 한 줄). 문서만 고쳐도, 코드만 고쳐도 빨개진다 |
| DB | **안 건드렸다.** `0005` 그대로 · 표 18 · 인덱스 8 |
| 🔴 눈으로 읽었나 | **읽었다.** `docs/evidence/2026-09-04-budget-hint/job-failed-hints.txt` — 실패 **네 갈래**(예산·빈도·AI 출력·서버)가 전부 다른 문장을 내고, 어느 것도 없는 것을 약속하지 않는다. `ERROR_HINT` 11줄도 같이 찍어 두었다 |
| 게이트로 올린 것 | 「샘플」을 약속하는 문장이 **코드에도 §5 에도 없다**. 지우려면 픽스처를 표시하는 코드가 먼저 있어야 한다 |
| 닫은 FINDINGS | **66** |
| 새 FINDINGS | **68**(`SourceRef` 의 `proposal` 을 만드는 제품 코드가 0곳 · 구멍) |
| 2-B 확인 (죽은 정의 찾기) | `confidence` **3단계 — 살아 있다**: 값이 Pack 태그(`conf:`)로 직렬화되어 **바꾸면 바이트가 달라지고**, 골든에 `high`·`medium`·`low` 가 전부 있다 (`case-1-small` · `case-2-domains`) · `SourceRef` **4종 — 절반이 죽어 있다**: 만드는 자리가 `source_document`(§7.1 구조화)와 `repository_path`(플러그인 propose/init) **둘뿐**이고, `proposal` 은 **0곳**(→ FINDINGS 68), `manual` 도 제품 코드에 0곳이다. ⚠ `manual` 은 화면 5(손으로 항목 추가)와 질문 답변(FINDINGS 56)이 주인이라 68 과 같이 만들지 마라 — 근거를 지어내게 된다 |

**🔴 결정 — 「예산 소진 시 픽스처 결과」를 §7.4 게스트 데모 전용으로 못 박았다**

FINDINGS 66 이 갈래 둘(①문구를 줄인다 · ②픽스처를 만든다)을 남겨 뒀다. SPEC §7.5 를
다시 읽고 **②를 안 만들기로** 정했다. 이유 둘:
① **P7 이 끊긴다** — 실제 프로젝트에 픽스처 항목을 넣으면 그 Pack 줄은 사용자의
원문으로 역추적되지 않는다. §7.4 는 픽스처가 **곧 원문**이라 안 끊긴다. 그래서 같은
문장처럼 보여도 두 자리는 다르다.
② **job 이 셋째 수명 모양을 갖게 된다** — 「실패도 성공도 아닌 것」. 예산이 없어서 못 한
일을 `succeeded` 로 적는 것은 `AI_JOB_STATUS_RULES` 의 뜻과 어긋나고, 그 표에서 DB
CHECK 이 생성되므로 값 하나가 아니라 제약이 늘어난다.
→ SPEC §7.5 에 결정과 이유를 적었다. **문서가 코드보다 커 보이는 약속을 남기지 않는다.**

**23바퀴 · P3 둘째 행 ④ — 웹 화면 3 (가져오기)** (`85c6ac2` + `0173c96`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 7초 / test 50초 / build 15초 / walkthrough 54초 |
| 새 시험 | **+22** — web 236 → **258** (`web-tables` +7 · **`web-job-progress` +15**). 합계 **681** |
| 새 화면 | `…/import` — 좌측 내비 탭 **한 줄**로 붙었다 (표가 링크를 만든다). 웹 화면 5개 → **6개** |
| 새 컴포넌트 | `components/job-progress.tsx` — job 한 장을 그리는 **유일한 자리**. 훅이 없어 시험이 여섯 모양을 다 그린다. 둘째 사용자는 화면 4 의 `conflict` job 이다 |
| 새 훅 | `usePolling(load, deps, again)` — 다시 읽는 동안 **손에 든 값을 안 버린다**(2초마다 skeleton 으로 되돌아가면 진행을 보여 주려는 화면이 진행을 못 보여 준다) · **언제까지 두드리나를 데이터가 정한다** · 실패하면 더 안 두드린다 |
| 표에 한 줄로 늘어난 것 | `AI_JOB_STATUS_CHIP`(수명 4종) · `SOURCE_DOCUMENT_KIND_LABEL`(종류 6종) — 둘 다 `web-tables.test.ts` 가 「키가 enum 과 같고 서로 다르게 보인다」로 잠근다 |
| 계약으로 올린 것 | `AI_JOB_STATUSES`/`AiJobStatus` → `packages/schema`. **둘째 사용자가 생겼다**(DB 하나였는데 화면이 `Record<AiJobStatus,…>` 를 갖게 됐다). 수명 **규칙**(`AI_JOB_STATUS_RULES`)과 **기능 목록**(`AI_FEATURES`)은 안 올렸다 — 앞의 것은 CHECK 을 만드는 DB 의 말이고, 뒤의 것은 플러그인 번들로 사용자 기계에 배포된다 |
| DB | **안 건드렸다.** `0005` 그대로 · 표 18 · 인덱스 8 |
| 갈리는 것을 봤나 | **봤다.** 여섯 모양이 전부 다른 마크업을 낸다 · `progress:null`(회전)과 `0/4`(막대)가 **다른 말**을 한다 · 같은 컴포넌트에 `conflict` job 을 넣으면 낱말만 `묶음`으로 갈린다(화면에 갈래가 없다는 증거) · `total:0` 에도 `NaN%` 가 없다 |
| 🔴 눈으로 읽었나 | **읽었다 — 그리고 둘을 고쳤다.** `docs/evidence/2026-09-04-screen3/job-panel-states.txt` (여섯 모양 + `conflict` job 하나). ① 실패한 칸이 막대 `4조각 중 1 · 25%` 와 문장 `4조각 중 1에서 멈췄습니다` 로 **같은 수를 두 번** 그렸고 `✕` 도 둘이었다 → 실패면 막대를 안 그린다 ② `queued` 인 job 에 **「마지막 걸음 방금」** 이라고 썼다(가지도 않은 걸음이다) → 「올린 지」로 갈랐고 **가른 것은 `started_at` 칸**이다 |
| 게이트로 올린 것 | `test/web-job-progress.test.ts` — 브라우저 없이 잴 수 있는 눈 판정: 여섯이 서로 다르게 보인다 · 상태를 **색만으로** 안 가른다 · 판정 옆에 근거가 있다 · 「실시간」 낱말이 없다 · **없는 문(되살리기 버튼)을 안 그린다** · 실패해도 걸음이 남는다 |
| 닫은 FINDINGS | **없다** — 이번 바퀴는 FINDINGS 가 아니라 `docs/PLAN.md` P3 둘째 행 ④ 를 했다 (58·60·62·63·64 가 미리 적어 둔 「화면이 이렇게 해야 한다」를 화면이 전부 지켰다) |
| 새 FINDINGS | **66**(`BUDGET_EXCEEDED` 문구가 없는 것을 약속한다 · 구멍) · **67**(화면 3 의 세 길 중 둘이 없다 · 구멍) |
| 2-B 확인 (죽은 정의 찾기) | **둘 다 살아 있다.** `enforcement` 4종 — `compiler/src/sections.ts` 의 `ENFORCEMENT_LABEL` 이 정책 줄에 「강제: …」로 찍고 `liveness.test.ts` 가 네 값이 **서로 다른 지문**을 내는지 잠근다 · `scope.kind` 3종 — `compiler/src/partition.ts` 가 셋을 **서로 다른 파일**로 보내고(`claude`/`domain-{slug}`/`scoped-{slug}`) `sort.ts` 의 `SCOPE_ORDER` 도 읽는다. ⚠ 화면 쪽에서 **새 위험 하나**를 만들 뻔했다 — `SOURCE_DOCUMENT_KIND_LABEL` 을 DESIGN_BRIEF 대로 다섯만 적으면 여섯째(`wiki`)가 **아무도 못 고르는 값**이 된다. 표 전체를 그리고 시험으로 잠갔다 |

**🔴 결정 — 세 카드 중 하나만 그렸다**

DESIGN_BRIEF §4 화면 3 은 큰 카드 셋(zip · 붙여넣기 · 질문 10장)이다. **②만** 그렸다.
①은 서버에 zip 경로 검사·개수·용량 상한이 없고(SPEC §11), ③은 그 열 개를 만드는
코드가 0곳이다. **누르면 아무 일도 없는 카드를 두면 있는 것과 없는 것이 구별되지 않고,
그때 화면 전체가 못 미더워진다** (`components/versions.tsx` 의 「롤백 발행」과 같은 판단).
→ 대신 FINDINGS **67** 로 적었다. **그 행의 완료 기준이 거기 걸려 있다.**

**🔴 결정 — 「끝났나」를 `finished_at` 으로 본다 (상태 이름을 안 센다)**

polling 을 멈추는 조건을 `status === 'succeeded' || status === 'failed'` 로 적으면
수명이 늘 때 이 화면이 **영원히 두드린다.** `finished_at` 은 그 판정의 결과가 이미
칸으로 나온 것이다 — 그 칸의 CHECK 이 `AI_JOB_STATUS_RULES` 에서 **생성되기** 때문에
표와 갈라질 수 없다. 서버가 `stalled` 를 값으로 내보낸 것과 같은 판단이고,
결과도 같다: **화면에 상태 이름을 손으로 적은 자리가 없다.**

**🔴 결정 — job 그리는 자리를 화면 밖으로 뺐다 (사용자가 아직 하나인데도)**

「사용자가 하나뿐이면 만들지 마라」와 부딪치는 것처럼 보인다. 이유 둘로 뺐다:
① **둘째 사용자가 이미 정해져 있다** — 화면 4 는 `conflict` job 을 기다리고, 그 job 도
같은 네 상태·같은 진행률·같은 「멈춤」을 낸다 (`AI_JOB_RUNNERS` 에 둘이 있다).
② **훅이 없어야 시험이 여섯 모양을 다 그릴 수 있다** — 화면 안에 두면 브라우저로
그때 마침 그 상태인 하나밖에 못 보고, 나머지 다섯은 **아무도 본 적 없는 채로** 배포된다.
이건 과설계가 아니라 **눈 판정을 가능하게 만드는 배치**다.

**22바퀴 · P3 둘째 행 ③ 앞 — 멈춘 job 을 알아본다** (`1bc1116`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 59초 / build 17초 / walkthrough OK |
| 새 시험 | **+5** — web 231 → **236** (`ai-job.test.ts`). 합계 **659** |
| 새 응답 칸 | `updated_at`(근거) · **`stalled`**(판정). 목록·상세 **둘 다** — `AI_JOB_FIELDS` 에 한 줄 넣었더니 두 모양이 따라왔고 **라우트는 안 고쳤다** |
| 새 표 칸 | `AiJobRunner.stallAfterSec` — structure **180**초 · conflict **300**초. 「한 걸음」의 낱말(`unit`)이 이미 그 표에 있어서 길이도 같은 자리에 뒀다 |
| DB | **안 건드렸다.** `0005` 그대로 · 표 18 · 인덱스 8 — `updated_at` 은 이미 있던 칸이다 (쓰기만 하고 안 읽던 칸) |
| 갈리는 것을 봤나 | **봤다.** 같은 행에서 **시각 하나만** 밀면 `stalled` 가 뒤집힌다(잣대 −5초 → `false`, +5초 → `true`) · **같은 경과인데 기능이 다르면 답이 다르다**(240초는 structure 에겐 멈춤이고 conflict 에겐 아니다) · 수명 4종 중 `finished` 인 둘은 **하루가 지나도** `false` (상태 이름을 손으로 안 세고 `AI_JOB_STATUS_RULES` 를 읽는다) |
| 타입이 잡은 것 | `rows.map(toAiJob)` — `map` 의 둘째 인자는 **번호**인데 `toAiJob` 의 둘째 인자는 **기준 시각**이다. 그대로 뒀으면 목록 둘째 행부터 1970년을 기준으로 쟀다. 시각을 인자로 받는 함수를 `map` 에 그냥 넘기지 마라 |
| 눈으로 읽었나 | **읽었다** — `docs/evidence/2026-09-04-jobs-stalled/stalled.txt`. 같은 job 한 줄이 `queued(stalled:false, updated_at==created_at)` → **`queued(stalled:true, 8분 전)`** → `running(150초 전 · false)` → `succeeded(false)` 로 간다. 목록 572바이트 → 상세도 같은 두 칸 |
| 닫은 FINDINGS | **64**(`updated_at` 을 아무도 읽지 않는다) |
| 새 FINDINGS | **65**(`source_documents.kind` 6종이 아무것도 안 바꾼다 · 격차) |
| 2-B 확인 (죽은 정의 찾기) | 🔴 **하나 찾았다** — `source_documents.kind` **6종**의 소비처가 INSERT·응답 되싣기·pgEnum 셋뿐이고 **읽어서 무언가를 바꾸는 코드가 0곳**이다. §7.1 프롬프트가 그 값을 모른다 → FINDINGS **65**. **에러 코드 11종 — 살아 있다**: 열한 값 전부 `fail()`/`throw new ApiError()` 하는 자리가 있다 (외톨이 넷도 진짜다 — `STALE_BASE`·`COMPILE_FAILED`=`lib/api/publish.ts`, `REVISION_CONFLICT`=`context-items/[id]/route.ts:39`, `RATE_LIMITED`=`lib/ai/budget.ts:167`) |

**🔴 결정 — 잣대를 `AI_FEATURE_LIMITS` 가 아니라 `AI_JOB_RUNNERS` 에 뒀다**

FINDINGS 64 는 「`AI_FEATURE_LIMITS` 옆처럼 기능 표에」라고 적었다. 러너 표를 골랐다.
① **「한 걸음」이라는 개념이 이미 거기 산다** — `unit`(걸음의 낱말)이 러너 표의 칸이다.
같은 개념의 **이름과 길이**가 다른 표에 있으면 하나만 고쳐지고 조용히 갈라진다.
② `AI_FEATURE_LIMITS` 는 **네 기능 전부**의 표인데 `ask`·`demo` 는 job 이 아니라
그 칸이 뜻이 없다 — 값이 있어야 하는데 아무도 안 읽는 칸을 둘 만드는 것은 이 저장소가
매 바퀴 찾아 없애는 것 자체다.

**🔴 결정 — 판정을 서버가 해서 값으로 내보냈다 (잣대를 화면에 주지 않았다)**

화면에 초를 주고 재게 하면 둘이 어긋난다: ① 잣대가 `features.ts` 계열의 **서버 전용
표**라 계약 패키지로 올리면 플러그인 번들에 실려 **사용자 기계로 배포된다**
(19바퀴가 `feature` 목록을 두고 한 판단과 같다). ② 브라우저의 시계는 서버와 어긋난다 —
경과를 재는 쪽은 **시각 둘을 다 가진 쪽**이어야 한다. `unit` 을 값에 실은 것과 같은 판단이고,
결과도 같다: **화면에 `feature ===` 갈래가 없다.**
대신 판정만 내지 않고 **근거(`updated_at`)를 옆에 같이 낸다** — 그래야 화면이
「멈춤」이라고만 하지 않고 「8분째 그대로다」라고 말할 수 있다 (DESIGN_BRIEF
「근거 없는 숫자는 화면에 없다」).

**🔴 결정 — 되살리는 문은 안 만들었다**

FINDINGS 64 가 「되살리는 문은 59 와 한 묶음」이라고 적어 뒀고 그 말이 맞다.
`running` → `queued` 로 되돌리는 것과 `failed` → `queued` 는 **같은 문**이고,
같은 질문(누가 · 몇 번까지 · 예산은 누가 무나)에 답해야 한다. 반쯤 만든 되살리기가
제일 나쁘다 — 두 번 집혀서 LLM 을 두 번 부르는 자리가 거기다.

**21바퀴 · P3 둘째 행 ③ 앞 — 도는 동안의 진행률** (`82b886b`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 8초 / test 56초 / build 18초 / walkthrough 61초 |
| 새 시험 | **+6** — web 225 → **231** (`ai-job.test.ts`). 합계 **654** |
| 새 칸 | `ai_jobs.progress jsonb` — 마이그레이션 **`0005`**. 표 18개 그대로 · 인덱스 8개 그대로 |
| 새 계약 | `AiJobProgress {done,total,unit}` (`lib/ai/job.ts`) — 쓰기 전에 이 계약으로 판다 |
| 새 표 칸 | `AiJobRunner.unit` — 한 걸음의 낱말(`조각`·`묶음`)이 **표**에 있다. 값에 실려 나가므로 화면에 `feature ===` 갈래가 없다 |
| 쓰는 자리 | **하나** — `runJob()` 의 `ctx.report(done,total)`. 러너는 숫자 둘만 주고 `structure.ts` 는 여전히 DB 에 안 쓴다 (`onProgress`) |
| 갈리는 것을 봤나 | **봤다.** 스텁 LLM 이 **부르기 전에 행을 읽어** 도는 도중을 붙잡는다 — `0/3 → 1/3 → 2/3` 로 자란다 · 안 굴린 job 은 `null`(「0 걸음」과 다르다) · 실패한 job 은 `result` 가 **비어 있는데** `progress` 는 `1/3` 로 **남는다** · 낱말이 기능마다 갈리고 그 값이 러너 표에서 온다 |
| 눈으로 읽었나 | **읽었다** — `docs/evidence/2026-09-04-jobs-progress/polling.txt`. 4조각짜리 문서(28,175자)를 올리고 화면 3 이 할 polling 을 **여섯 번** 찍었다: `queued(progress:null) → running 0/4 → 1/4 → 2/4 → 3/4 → succeeded 4/4`. 목록 한 줄이 500 → 592바이트로 늘었을 뿐이다 |
| 닫은 FINDINGS | **62**(도는 동안 진행률이 0 정보) |
| 새 FINDINGS | **64**(`ai_jobs.updated_at` 을 아무도 읽지 않는다 · 격차) |
| 2-B 확인 (죽은 정의 찾기) | 🔴 **하나 찾았다** — `ai_jobs.updated_at` 은 쓰는 자리가 **넷**(이번 바퀴에 다섯째가 늘었다)인데 **읽는 자리가 0곳**이다 (`AI_JOB_FIELDS` 에 없어서 응답에도 안 나간다) → FINDINGS **64**. `confidence` 3단계 — **살아 있다** (`compiler/src/tag.ts` 의 `conf:` 로 Pack 지문에 들어간다 · `liveness.test.ts`) |

**🔴 결정 — FINDINGS 62 의 ① 이 아니라 ② 를 골랐다**

62 는 「①(`input` 에 chunk 총수를 미리 넣는다)이 먼저다」로 적혀 있었다. 안 골랐다.
①은 **총수만** 알려 주고 「지금 어디인가」는 여전히 모른다 — 회전이 「4조각짜리 회전」이
될 뿐이고, 사람이 새로고침을 누르는 이유(「멈춘 것 같다」)를 하나도 없애지 못한다.
게다가 `input` 은 **「가리키는 id 만」**이라는 규칙이 붙은 칸이라(P1 · `job.ts` 머리 주석)
파생 수치를 넣으면 그 규칙이 흐려진다 — 다음 사람이 「글자수도 넣지 뭐」로 간다.

**🔴 결정 — `progress` 는 수명 CHECK(`AI_JOB_STATUS_RULES`) 밖이다**

그 표는 「이 상태면 이 칸이 차 있어야 한다」인데 진행률은 그렇게 못 적는다:
`running` 이어도 러너가 문서를 나눠 보기 전까지는 비어 있고, `succeeded`·`failed` 에도
**남아 있어야 한다**. 「9/12 에서 죽었다」가 실패 화면이 사람에게 할 수 있는 유일한 말이다.
수명이 정하는 칸이 아니라 **수명과 나란히 흐르는 칸**이라 CHECK 을 안 걸었다 —
그 이유를 `db/schema.ts` 의 그 칸 주석과 SPEC §2 에 적었다 (다음 사람이 「CHECK 이
빠졌네」 하고 채우지 않게).

**20바퀴 · P3 둘째 행 ③ — 목록을 가볍게** (`91ede81`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 51초 / build 17초 / walkthrough 54초 |
| 새 시험 | **+5** — web 220 → **225** (`ai-job.test.ts`). 합계 **648** |
| 새 표 | `AI_JOB_FIELDS`(`lib/ai/job.ts`) — 칸마다 `heavy` 한 축. `AI_JOB_COLUMNS`(상세)와 `AI_JOB_LIST_COLUMNS`(목록)가 **그 표에서 생성된다** — 라우트가 칸을 손으로 고르는 자리가 0곳이다 |
| 새 응답 칸 | `shape: 'summary' \| 'full'` — 목록이 낸 것인지 상세가 낸 것인지를 **응답이 스스로 말한다.** 화면이 「`result` 가 없다」와 「아직 안 받았다」를 가르는 근거 |
| 갈리는 것을 봤나 | **봤다.** 표의 `heavy` 를 뒤집으면 응답이 갈린다 (시험이 표를 돌며 「무거운 칸은 목록에 없고 상세에 있다 · 가벼운 칸은 둘 다에 있다」를 잰다) · 목록 payload 에 항목 초안의 제목도 본문도 **0건**인데 상세에는 **그대로** 있다 · 목록 `shape='summary'`, 상세 `shape='full'` |
| 눈으로 읽었나 | **읽었다** — `docs/evidence/2026-09-04-jobs-shape/list-vs-detail.txt`. job **2개**짜리 목록이 **953바이트**인데 같은 job **한 장**의 상세가 **2063바이트**다. 그 상세의 `result.items` 는 **2개**짜리다 — §7.1 이 진짜 문서 하나에서 뽑는 항목은 이보다 훨씬 많다 |
| 남긴 것 | `input` — 계약이 **가리키는 id 만** 담게 막고 있어 무겁지 않고(P1), 화면이 「이게 내 문서의 job 인가」를 그 칸으로 가린다 |
| 닫은 FINDINGS | **60**(목록이 `result` 를 통째로 나른다) |
| 새 FINDINGS | **62**(도는 동안 진행률이 0 정보 · 격차) · **63**(job 응답 모양이 셋 · 격차) |
| 2-B 확인 (죽은 정의 찾기) | `confidence` 3단계·`enforcement` 4종 — **살아 있다** (`compiler/test/liveness.test.ts` 가 값마다 Pack 지문이 갈리는 것을 잠근다) · sync 상태 5종 — **살아 있다** (넷은 플러그인 `managed.ts` 가 계산하고 다섯째 `unknown` 은 서버가 매긴다 · `managed.test.ts:141` 이 계약과 맞춘다) · `ITEM_TYPES` 10종 — **살아 있다** (같은 liveness) · `ERROR_HINT` 11종 — **살아 있다** (`web-tables.test.ts` 가 표 전체를 잰다). **이번 라운드에서 죽은 것은 못 찾았다** |

**🔴 결정 — 목록에서 뺀 것은 `result` 하나다**

FINDINGS 60 은 「`result`(그리고 아마 `input`)를 뺀다」였다. `input` 은 남겼다.
그 칸의 크기는 **계약이 이미 막고 있다** — `StructureJobInput` 은 uuid 하나,
`ConflictJobInput` 은 `item_<slug>` 목록이고 본문은 담을 칸이 없다 (P1). 반대로 그 칸을
빼면 화면이 「이 목록의 job 중 무엇이 **내가 방금 올린 문서**의 것인가」를 목록만으로
가릴 수 없어 상세를 N번 두드리게 된다 — polling 을 가볍게 하려다 요청 수를 늘린다.

**🔴 결정 — 응답에 `shape` 를 실었다 (칸의 유무로 눈치채게 두지 않았다)**

모양이 둘이 되면 화면은 「`result` 가 `null` 이다」와 「`result` 칸이 없다」를 구별해야
한다. 키의 유무로 가르는 코드(`'result' in job`)는 **JSON 을 한 번 거치면 조용히
틀린다** (직렬화·복사·기본값). 그래서 값으로 말하게 했다. 값 목록은 `AI_JOB_SHAPES`
두 개뿐이라 화면이 셋째 값을 만날 일이 없다.

**19바퀴 · P3 둘째 행 ② — 도는 job 을 다시 찾는 문** (`a4a2682`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 7초 / test 49초 / build 18초 / walkthrough 74초 |
| 새 시험 | **+7** — web 213 → **220** (`ai-job.test.ts`). 합계 **643** |
| 새 라우트 | `GET /projects/{id}/jobs?feature&status&limit&offset` — 라우트 29 → **30**. 최신순 |
| 계약 | `AiJobQuery`(`lib/ai/job.ts`) = `ListQuery` 를 `feature`·`status` 로 넓힌 것. **`packages/schema` 에 두지 않았다** — `feature` 의 값이 `AI_JOB_FEATURES`(서버 전용 표)에서 오고, 그 표를 계약 패키지로 올리면 플러그인 번들에 실려 **사용자 기계로 배포된다** (`features.ts` 머리 주석) |
| 갈리는 것을 봤나 | **봤다.** `feature` 를 뒤집으면 structure/conflict 가 갈린다 (안 거르면 둘 다 나온다 — 필터가 줄인 것이지 원래 하나였던 게 아니다) · `status` 셋(queued/succeeded/running)이 갈린다 · `limit=1&offset=1` 이 둘째 행만 낸다 |
| 새로고침을 쟀나 | **쟀다.** 시험이 **job id 를 하나도 모르는 채로** 목록만 두드려 방금 만든 job 을 찾아낸다 — 그게 화면 3 이 새로고침 뒤에 하는 일 그대로다 |
| 막는 것을 쟀나 | **쟀다.** job 이 아닌 기능(`ask`)·없는 상태·`limit=0`·모르는 질의 키는 **400** · 남의 프로젝트 목록은 **404** (목록은 `{jobId}` 보다 넓은 문이라 여기서 막는다) |
| 눈으로 읽었나 | **읽었다** — `docs/evidence/2026-09-04-jobs-list/get-jobs.txt` (200 응답 두 벌 + 400 한 벌을 직접 출력해서 읽었다). 거기서 격차 둘이 나왔다 |
| 닫은 FINDINGS | **58**(도는 job 을 다시 찾을 문이 없다) |
| 새 FINDINGS | **60**(목록이 `result` 를 통째로 나른다 · 격차) · **61**(질의 오류인데 문구가 「요청 **본문**」 · 격차) |
| 2-B 확인 (죽은 정의 찾기) | `SourceRef` 4종 — **살아 있다** (`compiler/src/tag.ts` 의 `SRC_TAG` 가 종류마다 **다른 문자열**을 내고 `compiler/test/liveness.test.ts` 가 잠근다). ⚠ 다만 `proposal`·`manual` 을 **만드는 제품 코드는 아직 0곳**이다 — 클라이언트가 보낼 수 있을 뿐이다 · `scope.kind` 3종 — **살아 있다** (`partition.ts:68~70` 이 셋을 서로 다른 Pack 파일로 보낸다 · liveness 가 `CLAUDE.md`/`domain-payment.md`/`scoped-payment.md` 셋을 잠근다) · `INDEX_NAMES` 8개 — **이제 8개 전부 읽는 코드가 있다** (`ai_jobs_project_created_idx` 가 이번 바퀴에 마지막으로 채워졌다) |

**🔴 결정 — 질의 계약을 `packages/schema` 로 올리지 않았다**

「모든 외부 입력은 `packages/schema` 로 파싱한다」가 규칙이고, 그 규칙의 이유는
「라우트마다 손으로 검사하면 한 곳만 빠져도 P1 방어선이 뚫린다」다. 여기서는 손으로
검사하지 않는다 — `ListQuery`(계약)를 넓힌 Zod 하나로 `parseQuery` 가 판다.
반대로 `feature` 의 값 목록을 계약 패키지로 올리면 **서버측 AI 기능 이름이 플러그인
번들로 사용자 기계에 배포된다** (`features.ts` 가 명시적으로 금한 것이다).
그래서 값 목록은 서버에 두고, **수치(`limit` 상한·기본값)만** 계약에서 읽는다 —
수치가 두 곳에 갈리는 것이 이 규칙이 진짜로 막으려는 것이다.

**🔴 결정 — 최신순 하나만 낸다 (`?order=` 를 만들지 않았다)**

화면이 묻는 것은 「지금 무엇이 도나」이고 그 답은 늘 마지막 행이다. 정렬 축을
질의로 열면 인덱스(`project_id, created_at desc`)를 안 타는 질의가 생기고,
그때 느려지는 것은 **2초마다 도는 polling** 이다. 둘째 사용자가 생기면 그때 연다.

**18바퀴 · P3 둘째 행 ① — job 자리 · §7.1·§7.2 를 부르는 첫 코드** (`a1f0a79`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 7초 / test 49초 / build 19초 / walkthrough 55초 |
| 새 시험 | **+19** — web 194 → **213** (`ai-job.test.ts`). 합계 **636** |
| 마이그레이션 | `0003` → **`0004`** (`0004_cooing_nextwave.sql`). 표 17 → **18** · 인덱스 7 → **8** |
| 새 표 | `ai_jobs` — `feature`(기존 `ai_feature` enum) · `status`(새 pgEnum `ai_job_status` 4종) · `input`·`result` jsonb · `error_code` · `started_at`·`finished_at` |
| 새 제약 | CHECK **5개**. `ai_jobs_feature_ck` 는 `AI_JOB_FEATURES` 에서, 나머지 넷은 `AI_JOB_STATUS_RULES` 에서 **생성된다** — 마이그레이션 SQL 에 손으로 적은 상태 이름이 0곳이다 |
| 계약 | `AI_FEATURE_LIMITS` 에 축 하나: **`job`**. 표를 `as const satisfies` 로 바꿔 거기서 `AiJobFeature` 유니온을 **뽑아낸다** (`DETECTED_CONFLICT_KINDS` 와 같은 수법). `job:true` 로 바꾸면 러너를 만들 때까지 타입 검사가 막힌다 |
| 새 파일 | `src/lib/ai/job.ts`(`AI_JOB_RUNNERS`·`createJob`·`runJob`·`startJob`) · 라우트 `GET /projects/{id}/jobs/{jobId}` |
| 새 문 | `conflictRow()`(`lib/api/conflict.ts`) — 충돌 행을 만드는 유일한 자리. `CONFLICT_KIND_RULES` 를 읽어 어느 칸을 비울지 정한다 |
| 정본으로 올린 것 | `shapeCheck()` — `conflicts` 전용이었는데 `ai_jobs` 가 **둘째 사용자**가 됐다 (CLAUDE.md 규칙대로 그때 올렸다) |
| 갈리는 것을 봤나 | **봤다.** 수명 4종 × 칸 4개 = **16갈래가 전부 DB 에서 거부된다** (표대로 채운 4행은 통과) · job 이 아닌 기능(`ask`)은 행이 못 된다 · 러너의 `input` 을 서로 바꿔 넣으면 판이 실패한다 · 본문을 담으려 하면 `.strict()` 가 막는다 |
| 행이 실제로 생기나 | **생긴다.** 탐지 종류 넷을 넣으면 `conflicts` 행 **넷**이 생기고 종류마다 `a_item_id`·`b_item_id`·`severity` 만 찬다 (`a_ref` 는 null). `GET /conflicts` 가 그 행을 그대로 읽는다 — **「충돌 N건」이 0 이 아니게 됐다** |
| 질문 카드도 생기나 | **생긴다.** §7.1 의 `open_questions` → `kind:'open_question'` 행. `a_ref.kind === 'source_document'` 이고 항목 칸은 비어 있다 (P7) |
| 두 번 굴리면 | **한 번만 돈다.** 조건부 UPDATE(`status='queued'`)로 집는다 — 둘째 호출은 `undefined` 이고 LLM 호출 수가 그대로다 |
| 실패를 쟀나 | **쟀다.** 두 번 다 계약과 다른 출력 → `failed`·`AI_OUTPUT_INVALID`·`result` null · 키 없음 → `INTERNAL` · **남의 프로젝트 문서를 가리키는 job → `NOT_FOUND` 이고 LLM 을 아예 안 부른다** (P7) |
| P1 을 쟀나 | **쟀다.** 픽스처 문서(`fixtures/paylab-docs/goals.md`)의 **모든 문장**이 `ai_jobs` 행 어디에도 없다. `input` 계약에는 본문을 담을 칸 자체가 없다 |
| 닫은 FINDINGS | **52**(부르는 라우트 0곳) · **28**(충돌 행 만드는 코드 0곳) · **26 절반**(구조화 job) |
| 새 FINDINGS | **58**(도는 job 을 다시 찾을 문이 없다 · 구멍) · **59**(실패한 job 재시도가 없다 · 격차) |
| 2-B 확인 (죽은 정의 찾기) | `CONFLICT_KINDS` 5종 — **이제 다섯 다 살아 있다** (넷은 탐지 러너가, `open_question` 은 구조화 러너가 만든다. 그전까지는 시험이 손으로 넣는 행뿐이었다) · `INDEX_NAMES` — 8개 중 **`ai_jobs_project_created_idx` 만 읽는 코드가 없다** → FINDINGS 58 |

**🔴 결정 — job 표를 기능마다 만들지 않고 하나로 뒀다**

구조화(§7.1)와 탐지(§7.2)는 「무엇을 읽나」만 다르고 **수명이 같다**
(queued → running → succeeded|failed). 둘을 따로 만들면 화면 3 이 polling 할 자리가
둘이 되고, §7.3·§7.4 가 job 이 되는 날 넷이 된다. 기능마다 다른 것은 `input`·`result`
**두 칸의 내용**뿐이고, 그 모양은 `AI_JOB_RUNNERS` 표가 Zod 로 정한다.

**🔴 결정 — 「어느 기능이 job 인가」를 새 목록이 아니라 기존 표의 축으로 뒀다**

`AI_JOB_FEATURES` 를 손으로 적으면 그 목록과 `AI_FEATURE_LIMITS` 가 반드시 갈라진다.
대신 축 하나(`job`)를 더하고 **거기서 유니온·런타임 목록·DB CHECK 셋을 전부 뽑아냈다.**
기능을 job 으로 바꾸는 절차가 「표의 `false` 를 `true` 로」 한 줄이 됐고, 그 다음은
타입 검사와 `db:generate` 가 밀어 준다.

**🔴 결정 — 굴리는 것은 `after()` 이고, 시험은 그것을 흉내 내지 않는다**

서버리스는 응답을 보내면 함수를 얼린다 — 떠 있는 promise 는 거기서 죽고 job 은 영원히
`queued` 로 남는다. 그래서 `after()`(Next 15)를 쓴다. 요청 문맥이 없는 자리
(`scripts/dev-server.ts` · 관통)에서는 `after()` 가 던지므로 그때만 그냥 띄운다 —
거기엔 얼어붙을 서버리스가 없다. **시험은 `startJob()` 을 「적어만 두는」 것으로 갈아
끼우고 `runJob()` 을 직접 부른다** — 안 그러면 어느 시험이든 뒤에서 스텁이 돌고,
DB 를 닫은 뒤에 쓰기가 남아 조용히 갈라진다.

**🔴 결정 — 실패는 코드 하나만 남긴다**

`error_message` 칸을 **일부러 만들지 않았다.** 드라이버 예외의 message 에는 질의문이
통째로 들어 있고, 모델의 응답에는 문서 본문이 들어 있다. 「받아서 안 쓴다」가 아니라
**담을 칸이 없어야** P1 이다 (§11 의 로그 규칙과 같은 자리).

**17바퀴 · P3 둘째 행 ⓪ — `conflicts` 표가 §7.2 의 출력을 담는다** (`8cde1f5`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 44초 / build 28초 / walkthrough 52초 |
| 새 시험 | **+4** — web 190 → **194**. 합계 **617** |
| 마이그레이션 | `0002` → **`0003`** (`0003_fluffy_jean_grey.sql` · 12줄). DB 를 처음으로 다시 건드렸다 |
| 새 칸 | `conflicts.a_item_id`·`b_item_id`(text · `item_<slug>`) · `severity`(새 pgEnum `conflict_severity`). `a_ref` 는 `NOT NULL` 을 **잃었다** — 문서를 가리키는 종류 전용이 됐다 |
| 새 제약 | CHECK **5개** + 복합 FK **2개**. CHECK 은 전부 `CONFLICT_KIND_RULES` 에서 **생성된다** — 마이그레이션 SQL 의 kind 이름은 표에서 나온 것이고 손으로 적은 곳이 0곳이다 |
| 계약 | `ConflictKindRule` 에 축 하나 추가: **`anchor: 'items' | 'document'`** (+`CONFLICT_ANCHORS`). 이제 종류 하나가 세 축을 갖는다 — `detected`(severity 를 갖나) · `anchor`(항목인가 원문인가) · `needsB`(b 쪽이 필요한가) |
| 갈리는 것을 봤나 | **봤다.** b 쪽 없는 `contradiction` · severity 없는 `contradiction` · 원문 구간까지 문 `contradiction` · 항목을 가리키는 `open_question` · severity 를 문 `open_question` · a_ref 없는 `open_question` · 없는 항목을 가리키는 FK — **일곱 갈래가 전부 DB 에서 거부된다.** 반대편(옳은 모양)은 통과한다 |
| 응답을 쟀나 | **쟀다.** `CONFLICT_KINDS` 5종을 다 넣고 `GET /conflicts` 를 읽어, **표가 말한 칸만** 차 있는지 종류마다 대조한다 (`a_item_id`·`b_item_id`·`a_ref`·`severity` 넷) |
| 번들 | `bin/contextops-cli.mjs` 814,385 → **814,558바이트** (`packages/schema` 를 고쳐 다시 빌드 — `test/bundle.test.ts` 가 표류로 잡았다). `schemas/*.json` **10개는 안 바뀌었다** (`CONFLICT_KIND_RULES` 는 Zod 가 아니다) |
| SPEC | §2 의 `conflicts` 줄과 §7.2 를 **코드와 같게** 고쳤다 — FINDINGS 25 가 「SPEC 안에서 갈렸다」고 적은 그 자리다 |
| 닫은 FINDINGS | **54** 의 절반 (표가 못 담는다). 나머지 절반(쓰는 코드 0곳)은 **28** 이 그대로 들고 있다 |
| 새 FINDINGS | **56**(답변으로 만든 항목이 질문과 안 이어진다 · 구멍) · **57**(`b_ref` 를 이제 어느 종류도 못 채운다 · 격차). **25·28·29 에 「막고 있던 것이 없어졌다」를 적었다** |
| 2-B 확인 (죽은 정의 찾기) | `enforcement` 4종 — **살아 있다** (`compiler/test/liveness.test.ts` 가 4종의 Pack 지문이 서로 다름을 잠갔다) · `confidence` 3단계 — **살아 있다** (`tag.ts` 가 역추적 태그에 `conf:` 로 찍는다 = 값을 바꾸면 Pack byte 가 갈린다) |

**🔴 결정 — `SOURCE_REF` 를 넓히지 않고 `conflicts` 에 항목 칸을 더했다**

FINDINGS 54 가 갈래 둘을 적어 뒀다: ①`a_ref` 에 「항목」 종류를 더한다 ②`conflicts` 에
항목 칸을 더한다. **①을 버렸다.** `SOURCE_REF` 는 항목이 **원문까지 가는 사슬**이고,
거기에 「항목」이 들어가면 항목의 근거가 다른 항목을 가리킬 수 있게 된다 — 사슬이 한 칸
끊기고 그게 P7 이 무너지는 자리다. **충돌이 항목을 가리키는 것과 항목이 원문을 가리키는
것은 다른 관계다.** 그래서 축 이름을 `anchor` 로 두고 둘을 갈랐다.

**🔴 결정 — 모양 검사를 서비스 코드가 아니라 DB 에 뒀다**

충돌 행을 만드는 자리는 앞으로 **셋**이다 (§7.1 의 `open_questions` · §7.2 의 탐지 ·
사람이 직접 적는 질문). 검사를 서비스에 두면 자리마다 베껴야 하고, 하나만 빠뜨려도
**반쪽짜리 행**이 들어온다 — 그 행은 화면에 「충돌 1건」으로 멀쩡히 뜨고 눌렀을 때
가리킬 것이 없다. DB 는 빠뜨릴 수 없다. 그리고 제약을 **표에서 생성**해서, 종류를
더할 때 이 파일에 손댈 것이 없게 했다 (`db:generate` 한 번).

⚠ **부작용 하나를 그대로 남겼다** — `b_ref` 의 CHECK 이 `b_ref is null` 이 됐다
(`anchor:'document' && needsB` 인 종류가 0줄이라서). 지우면 `needsB` 가 그 조합에서
아무 뜻도 없어지므로 **일부러 남겼고** FINDINGS 57 에 적었다.

**16바퀴 · P3 첫 행 ③ — 충돌 탐지 `detectConflicts()`** (`7cf9d50`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 5초 / test 42초 / build 17초 / walkthrough 52초 |
| 새 시험 | **+24** — web 166 → **190** (`ai-conflict.test.ts`). 합계 **613** |
| 새 파일 | `src/lib/ai/conflict.ts`(§7.2) — 새 프롬프트 파일은 **안 만들었다** (`prompt.ts` 를 그대로 쓴다) |
| 계약 | `CONFLICT_KIND_RULES` 표 하나가 **프롬프트·도구 스키마·검증 셋을 전부** 정한다. `AiConflict`·`AiConflictOutput`·`CONFLICT_SEVERITIES`·`Question`(§7.1 과 공유) |
| 빈도 상한 | `conflict` 가 `rate: null` → **프로젝트당 시간당 10회.** 세는 단위는 「탐지 한 번」이다 (FINDINGS 51 닫음) |
| 갈리는 것을 봤나 | **봤다.** 지어낸 id → 재시도 프롬프트에 `item_invented` 가 실림 → 두 번째가 맞으면 통과 / 두 번 다 틀리면 `AI_OUTPUT_INVALID`(호출 정확히 2회) · severity 를 뒤집으면 결과 순서가 뒤집힘 · type·scope 가 다르거나 active 가 아니면 후보 0 이고 **호출이 0회** · 11회째 `RATE_LIMITED`, 창이 지나면 다시 통과 |
| 눈으로 읽었나 | **읽었다.** 도구 스키마 **711바이트 · `$defs` 2개**(§7.1 은 11,485바이트 · 24개) · 시스템 프롬프트에 탐지 4종이 표에서 한 줄씩 실리고 `open_question` 은 없다 · 사용자 턴이 `<untrusted>` 로 열린다 |
| P7 을 실제로 쟀나 | **쟀다.** 프롬프트에 실리지 않은 항목 id 가 오면 **결과가 아니라 재시도**로 간다 — 모델이 지어낸 근거가 카드가 되는 길을 막았다 |
| 번들 | `bin/contextops-cli.mjs` 812,036 → **814,385바이트** (schema 를 고쳐 다시 빌드 — `test/bundle.test.ts` 가 표류로 잡았다). `schemas/*.json` **10개는 안 바뀌었다** |
| 마이그레이션 | **없다** — DB 를 안 건드렸다 (여전히 `0002` 까지) |
| 닫은 FINDINGS | **51**(§7.5 에 충돌 빈도 상한 없음) |
| 새 FINDINGS | **54**(`conflicts` 표가 §7.2 출력을 못 담고 부르는 자리도 없다 · 구멍) · **55**(공통 금지 7줄 중 3줄이 §7.2 에서 무의미 · 격차). **31 에 한 줄 더했다** — `origin='doc'` 이 0곳이라 `doc_vs_code` 는 영원히 0건이다 |
| 2-B 확인 (죽은 정의 찾기) | `scope.kind` 3종 — **살아 있다.** `partition.ts` 가 셋을 서로 다른 파일로 보내고 `compiler/test/liveness.test.ts` 가 「3종이 서로 다른 파일로 간다」로 잠갔다 |

**🔴 결정 — 탐지 한 번이 `withBudget` 한 번이고 LLM 왕복도 한 번이다**

§7.1 은 문서 하나 안에 chunk 호출이 최대 12번 있다. §7.2 는 **한 번**으로 뒀다 —
후보 40개 × 300자면 프롬프트가 한 번에 다 들어가고, 나누는 순간 §7.5 의 상한이
「탐지 N회」가 아니라 「묶음 N개」가 되어 항목이 많은 프로젝트가 상한을 넘긴다.
그래서 빈도 상한의 뜻이 **「이 프로젝트가 이번 시간에 탐지를 몇 번 돌렸나」**로 고정된다.

**🔴 결정 — 종류별로 갈리는 것을 표 하나(`CONFLICT_KIND_RULES`)로 모았다**

`CONFLICT_KINDS` 5종은 있었지만 「무엇이 무엇을 만드나」가 코드 어디에도 없었다.
표에 넣은 것은 셋이다: `detected`(§7.2 가 내는가) · `needsB`(두 쪽이 필요한가) ·
`hint`(모델에게 주는 한 줄). 그래서 **종류를 더하면 프롬프트·도구 스키마·검증이 따라온다.**

- `open_question` 만 `detected:false` 라 **도구 스키마의 enum 에서 빠진다** — 모델이
  고를 수 없는 이름을 실어 놓고 우리가 버리면 재시도가 늘고 재시도는 곧 돈이다.
- 시험이 그 뜻을 잠근다: 「탐지 종류는 **전부** 프롬프트에 한 줄씩 실린다」·
  「`- open_question:` 줄은 없다」·「도구 스키마에 `open_question` 이 없다」.

**🔴 결정 — `severity` 의 값을 지어내지 않고 이미 있는 사다리를 빌렸다**

SPEC §7.2 는 `severity` 라는 **이름만** 적고 값을 적지 않았다. `CONFIDENCE_LEVELS` 와
같은 낱말(`high`·`medium`·`low`)을 쓰되 **상수는 따로 뒀다** — 확신 단계가 늘어야 할
이유와 충돌 심각도가 늘어야 할 이유는 상관이 없고, 하나로 묶으면 한쪽 때문에 다른 쪽이
바뀐다. 그리고 이 값이 **실제로 무언가를 바꾸게** 했다: 결과를 심각도 내림차순으로 낸다
(화면 4 는 카드 10장만 보여 준다). 시험이 값을 뒤집어 순서가 갈리는 것을 잰다.

**🔴 Zod 로 못 재는 셋을 손으로 잰다 — 여기가 P7 의 자리다**

①프롬프트에 없던 항목 id ②표가 두 쪽을 요구하는데 `b_item_id` 가 없음 ③같은 짝의 중복
(앞뒤가 뒤집혀도 같은 짝이다). 셋 다 **버리지 않고 재시도**로 보낸다 — 오류 위치를
프롬프트에 실어야 두 번째가 나아진다 (SPEC §7).

⚠ **못 본 것**: 진짜 Claude 응답. 프롬프트가 진짜 충돌을 잘 찾는지, 「판단하지 말고
질문만 만들어라」를 모델이 지키는지는 **이 바퀴가 말하지 않는다.** 키가 생기면
paylab 픽스처(충돌 3건이 이미 있다)로 「충돌 3」(PLAN 완료 기준)을 실제로 확인해라.

**15바퀴 · P3 첫 행 ② — 문서 구조화 `structureDocument()`** (`34eb766`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 46초 / build 30초 / walkthrough 67초 |
| 새 시험 | **+24** — web 142 → **166** (`ai-structure.test.ts`). 전체 559 → **583** |
| 새 파일 | `src/lib/ai/structure.ts`(§7.1) · `src/lib/ai/prompt.ts`(§7 공통 금지 · §11 `<untrusted>`) |
| 계약 | `AiStructureOutput` — `ITEM_DATA` 표에서 **파생**했다. 항목 타입을 더해도 여기 고칠 것이 없다 |
| 에러 코드 | 10 → **11종.** `AI_OUTPUT_INVALID`(502) 를 §7.1 이 낸다 — `WITHOUT_OWNER` 표는 여전히 **비었다** |
| 갈리는 것을 봤나 | **봤다.** 조각 밖 span → 재시도 프롬프트에 `item_bad` 가 실림 → 두 번째가 맞으면 통과 / 두 번 다 틀리면 `AI_OUTPUT_INVALID` (호출 정확히 2회) · 문서 5개까지 통과, 6번째 `RATE_LIMITED` · 예산 0 이면 **호출이 0회** |
| 눈으로 읽었나 | **읽었다.** paylab `goals.md` = **3,513자 · 한 조각** · 도구 스키마 11,485바이트 / `$defs` 24개 / 항목 변형 **10종**(전부 `type` const + `additionalProperties:false`) · 사용자 턴이 `<untrusted>` 로 열리고 본문이 그 뒤에 있다 |
| P7 을 실제로 쟀나 | **쟀다.** 픽스처의 실제 문장 offset 을 스텁이 내면 `content.slice(ref.start_char, ref.end_char)` 가 그 문장 그대로다 |
| 번들 | `bin/contextops-cli.mjs` 810,874 → **812,036바이트** (schema 를 고쳐 다시 빌드). `schemas/*.json` **10개는 안 바뀌었다** |
| 마이그레이션 | **없다** — DB 를 안 건드렸다 (여전히 `0002` 까지) |
| 닫은 FINDINGS | **48**(`AI_OUTPUT_INVALID`) · **49**(withBudget 소비처 0곳) |
| 새 FINDINGS | **52**(라우트가 `structureDocument` 를 안 부른다 · 구멍) · **53**(도구 스키마의 `$defs` 이름이 `__schema0` · 격차). **50 에 한 줄 더했다** — 이제 그 게이트가 `callClaude()` 직접 호출을 못 잡는다 |

**🔴 결정 — chunk 마다가 아니라 문서 하나에 `withBudget` 한 번**

`withBudget` 은 장부(`ai_usage`)의 **행 수**로 빈도를 센다. chunk 마다 부르면 SPEC §7.5 의
「문서 구조화는 프로젝트당 시간당 5회」가 **문서 5개가 아니라 chunk 5개**가 되어,
6조각짜리 문서 **하나**가 상한을 넘긴다. 그래서 한 문서의 모든 호출을 문 하나 안에 넣고
장부에 **합계 토큰으로 한 줄**을 남긴다. 시험이 그 뜻을 잠근다 —
「3조각을 읽어도 장부는 한 줄」·「시간당 5회가 문서를 센다」.

- 12 chunk × 10,000자 ≈ 48,000 토큰이라 `AI_MAX_INPUT_TOKENS`(60k) **안이다** —
  두 숫자가 맞물려 있으니 한쪽을 고치면 다른 쪽을 같이 봐라 (SPEC §7.1 에 적었다).
- 대가: 도중에 실패하면 그때까지 쓴 **실제** 토큰 대신 추정치가 장부에 남는다.
  추정치가 더 크므로 예산을 적게 세지는 않는다.
- §7.5 의 「60k/호출」을 「60k/`withBudget` 한 번」으로 고쳤다 — 안 고치면 문구와 코드가 갈린다.

**🔴 결정 — AI 출력 계약을 `packages/schema` 에 뒀다 (예산 표와 반대로)**

14바퀴는 `AI_FEATURES`·`AI_MODELS` 를 `apps/web` 에 뒀다. 이번엔 반대로 했다. 이유가 다르다:
**LLM 응답은 외부 입력**이고 「모든 외부 입력은 `packages/schema` 로 파싱한다」가 P1 의
방어선이다. 그리고 이 계약은 `ContextItemDraft` 에서 **파생**해야 하는데(`DraftBase` ·
`ITEM_DATA` 표), 밖에서 파생하려면 그 내부를 공개해야 한다 — 그게 더 나쁘다.
정가표와 달리 출력 계약은 사용자 기계에 배포돼도 새는 것이 없다 (번들 +1,162바이트).

**🔴 결정 — 모델에게 `document_version_id` 와 `owner_id` 를 묻지 않는다**

둘 다 uuid 다. 모델이 지어내면 **근거가 남의 문서를 가리킨다** — P7 이 거짓말이 되는
자리가 정확히 여기다. 그래서 `AiContextItemDraft` 는 초안에서 그 둘과 `source_refs` 를
빼고 **chunk 기준 `span` 하나**만 받는다. 문서 offset 으로의 변환과 uuid 채우기는
서버가 한다. 범위를 벗어난 span 은 SPEC §7.1 대로 **재시도**로 간다.

⚠ **못 본 것**: 진짜 Claude 응답. API 키가 없어 스텁(`setAiClientForTest`)으로만 쟀다.
프롬프트가 좋은 항목을 뽑는지, 도구 스키마의 `$defs`/`oneOf` 를 모델이 잘 따르는지는
**이 바퀴가 말하지 않는다.** 키가 생기면 paylab 문서로 「항목 12개」(PLAN 완료 기준)를
실제로 확인해라.

**14바퀴 · P3 첫 행 ① — 예산 가드 `withBudget()`** (`fdf098b`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 44초 / build 21초 / walkthrough 50초 |
| `principles.ps1` | **OK 7 → OK 9.** `P3`(모든 LLM 호출이 withBudget 경유)와 `P3b`(예산 가드 파일 존재)가 **SKIP 에서 켜졌다** — 대상이 생겼는데 SKIP 이던 자리가 닫혔다 |
| 새 시험 | **+18** — web 124 → **142** (`ai-budget.test.ts`). 전체 541 → **559** |
| 새 파일 | `src/lib/ai/` 4개 (`features` 표 · `budget` 문 · `client` 경계 · `model` 이름) |
| 마이그레이션 | **0002** — `ai_usage` 표(10칸) · enum `ai_feature`(4) · 인덱스 2. 표 16 → **17**, 인덱스 5 → **7** |
| 갈리는 것을 봤나 | **봤다.** 예산 0 → 던짐 / 3 → 통과 · 모델 opus↔haiku 로 같은 토큰의 값이 5배 갈림 · ask 4번째 호출에서 `RATE_LIMITED`, 다른 actor 는 통과 · 창이 지나면 다시 통과 |
| 잡은 고장 | **시계가 둘이었다.** 창 계산은 `ctx.now`, 장부 행은 `defaultNow()` → 빈도 제한이 안 걸렸다. 시험 3개가 잡았고 `created_at` 을 같은 `now` 로 묶어 고쳤다 |
| 에러 코드 | `WITHOUT_OWNER` 표가 **비었다** — 10종 전부 내는 자리를 가졌다 (`BUDGET_EXCEEDED`·`RATE_LIMITED` 를 예산 가드가 낸다) |
| 번들 | **안 건드렸다** — `packages/schema` 를 고치지 않았다 (서버 전용 표는 `apps/web` 에 뒀다) |
| 새 FINDINGS | **48**(`AI_OUTPUT_INVALID` 가 표에 없다 · 구멍) · **49**(withBudget 소비처 0곳 · 구멍) · **50**(P3 검사가 주석을 호출부로 센다 · 격차) · **51**(§7.5 에 conflict 빈도 상한 없음 · 격차) |

**🔴 결정 — 서버 AI 표를 `packages/schema` 가 아니라 `apps/web` 에 뒀다**

`AI_FEATURES`·`AI_FEATURE_LIMITS`·`AI_MODELS` 는 업로드 payload 에도 Pack 에도 안 나온다.
소비처가 서버뿐이다. 그리고 `packages/schema` 는 **플러그인 번들에 통째로** 들어가서
(`bin/contextops-cli.mjs` 810KB), 거기 두면 서버 전용 정가표가 **사용자 기계로 배포된다.**
API 계약이 이 값을 쓰게 되는 순간 올린다 — 그때가 「둘째 사용자」다 (CLAUDE.md).

**🔴 결정 — 하루치를 메모리가 아니라 DB 표로 센다**

서버리스에서 메모리로 세면 인스턴스마다 따로 세고 콜드 스타트마다 0으로 돌아간다.
그러면 「하루 $3」은 문서에만 있는 숫자다. 대신 표를 하나 더했고(SPEC §2 에도 적었다),
**본문이 들어갈 칸을 안 만들었다** — 행에 있는 것은 「어느 기능이·언제·토큰 몇 개를·
얼마어치 썼나」뿐이고 행위자는 sha256 이다 (P1 · §11). 시험이 그 칸 없음을 잰다.

**🔴 결정 — 실패한 호출도 장부에 남긴다 (추정치로)**

안 남기면 계속 실패하는 루프가 **장부 밖에서** 예산을 태운다. 기록이 실패해도
원래 오류를 덮지 않는다.

**모델을 `claude-sonnet-4-5` → `claude-opus-5` 로 바꿨다** (SPEC §1.2 · `.env.example`).
정가를 아는 모델이어야 예산을 셀 수 있고, `AI_MODELS` 표 밖의 이름은 **켜질 때 죽는다** —
표에 없으면 정가를 몰라서 하루 예산이 조용히 무한이 되기 때문이다.

**13바퀴 · FINDINGS 43·8 — workflow 항목이 0개여도 `workflow.md` 를 낸다** (`bc08125`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 7** / typecheck 6초 / test 42초 / build 21초 / walkthrough 49초 |
| 새 시험 | **+11** — compiler 124 → **130**(`always.test.ts` 6) · schema 108 → **113**(`manifest-evidence.test.ts` 5). 전체 530 → **541** |
| 관통 검사 | publish 단계에 **+2** (「workflow 항목 0개인데도 파일이 나왔나」·「진행 보고 5줄이 다 있나」) — 둘 다 OK |
| 관통이 낸 Pack | 파일 **3 → 4개** (`.claude/rules/workflow.md` 770바이트가 새로 나간다) |
| `TEMPLATE_VERSION` | 1.0 → **1.1** (golden 3케이스의 `input.json`·`expected/manifest.json` 갱신 · case-2·3 에 `workflow.md` 신규) |
| 번들 | `bin/contextops-cli.mjs` **810,874바이트** (schema 가 바뀌어 다시 빌드해 같이 커밋했다) |
| 마이그레이션 | **없다** — DB 를 안 건드렸다 |
| 닫은 FINDINGS | **43 · 8** (같은 구멍이 두 번 적혀 있었다) |
| 새 FINDINGS | **46**(항목 없는 workflow.md 의 제목 · 격차) · **47**(JSON Schema 가 P7 규칙을 못 담는다 · 격차) |

**🔴 결정 — P7 의 예외를 「푸는」 대신 「이름 붙였다」**

FINDINGS 43 의 선택지 ①(항목이 없어도 `workflow.md` 를 만든다)은
`ManifestFile.source_item_ids` 의 `.min(1)` 과 부딪혔다. 그 `.min(1)` 이 P7 의
「근거 없는 파일 금지」다.

**푼 방법**: `.min(1)` 을 지우고 `packages/schema` 에 `PRODUCT_TEXT_PACK_FILES` 표를 두고
「이 경로만 근거 없이 나갈 수 있다」로 좁혔다. 지금 그 표에 있는 것은
`.claude/rules/workflow.md` 하나다.

- 왜 ②(CLAUDE.md 로 옮김)가 아닌가 — SPEC §4.3 을 뒤집고 12,000자 예산을 상시로 먹는데,
  **CLAUDE.md 도 항목이 없으면 안 나간다.** 같은 고장이 한 겹 아래에서 다시 난다.
- 왜 픽스처를 고치지 않았나 (FINDINGS 8 의 ①) — 그건 제품의 일을 사용자 데이터에 시키는 것이다.
  픽스처를 고쳐도 **남의 저장소는 그대로다.**
- 예외가 넓어지는 것을 무엇이 막나 — 시험 5개. 「표 밖의 경로는 빈 근거로 막힌다」·
  「표에 이름이 늘면 빨개진다」·「Manifest 안에서도 같은 규칙이 걸린다」.

**갈리는 것을 봤다** — 되돌려 보지 않고 관통 산출물로 확인했다:
`.ci/walkthrough-pack/` 이 파일 3개(`CLAUDE.md`·`domain-refund.md`·`manifest.json`)에서
**4개**가 됐고, `manifest.json` 의 새 줄은
`.claude/rules/workflow.md · 770 · source_item_ids: []` 다. 진행 보고 5줄이 그 안에 다 있다.
paylab 픽스처에는 **workflow 항목이 없다** — 그래서 이 검사가 의미가 있다.

**12바퀴 · P2 셋째 행 = 🔴 GATE 2 — CLI 3 · Skill 3 · Stop 훅 · 관통 payload 단계**
(`9179ffc` `bfc9d60` `eaae9f5` `f688724`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 7** / typecheck 6초 / test 44초 / build 19초 / walkthrough 47초 |
| 새 시험 | **+77** — 플러그인 99 → **174**(`upload-draft` 10 · `progress` 13 · `propose` 10 · `commands` 5 · `skills` 25 · `hooks` +8 · 기타) · schema 106 → **108**. 전체 453 → **530** (schema 108 · compiler 124 · plugin 174 · web 124) |
| 관통 단계 | 6 → **7개** (`payload` 가 켜졌다) · 그 단계 안의 검사 **10개 전부 OK** |
| CLI 명령 | 5 → **8개** (SPEC §8.3 의 여덟이 다 됐다) |
| Skill | 0 → **3개** (`init`·`sync`·`propose`) |
| 훅 | 1 → **2개** (`session-start.mjs` · **`stop.mjs`**) |
| 번들 | `bin/contextops-cli.mjs` 793KB → **810KB** (같이 커밋했다) |
| 마이그레이션 | **없다** — DB 를 안 건드렸다 |
| 닫은 FINDINGS | **38 · 39 · 41 · 42** (42 는 결정이 필요한 것이었다) |

**🔴 GATE 2 의 절반을 눈으로 봤다** (`.ci/walkthrough-payload.json` · 검사 10개 · 실패 0):

- **배포되는 번들**(`bin/contextops-cli.mjs`)을 **픽스처를 통째로 복사한 진짜 저장소**에서
  돌린다 (scan → upload-draft → progress → propose). 나간 요청 body 를 **진짜 소켓으로**
  받아 바이트를 판다.
- 나간 3건이 전부 업로드 allowlist 계약(`ContextItemsBatchDraft`·`ProgressEvent`·
  `Proposal`)을 지난다.
- **픽스처 48개 파일의 「가장 긴 줄」이 payload 어디에도 없다.** 고정 금지 문자열이
  아니라 파일에서 뽑으므로 픽스처가 바뀌어도 계속 잰다.
- `.env.example` 의 **값** 0건 · env **키 이름**은 실제로 나갔다(14개) —
  안 나가면 `scan_summary` 가 빈 채로 올라간다는 뜻이라 그것도 고장이다.
- 기기 토큰이 **body 에 0건** (헤더로만 간다).
- 🔴 초안에 `file_body` 를 끼워 넣으면 **exit 2 이고 요청이 아예 안 나간다.**
  「서버의 400 에 기대지 않는다」가 여기서 잠긴다.
- **갈리는 것을 봤다** — 초안 body 에 실제 소스 1500자를 넣으니
  「src/main.ts: new ValidationPipe({ whitelist: true, fo…」로 빨개졌다.

⚠ **GATE 2 의 나머지 절반(「Claude Code 에서 `init`」)은 아직 사람이 해 봐야 한다.**
Skill 은 모델이 실행하는 문서라 무인 세션이 스스로 재는 것은 여기까지다.

**🔴 첫 결정 — P6 의 경계를 「선언표」로 정했다 (FINDINGS 42)**

SPEC §0.1 P6 의 문장(「Hook 은 파일을 변경하지 않는다」)과 §8.6 의 `stop.mjs`
(`pending-proposal.json` 을 쓴다)가 서로 어긋나 있었다. 앞 바퀴가 P6 게이트를
hooks.json 이 가리키는 것 **전부**로 넓혀 뒀으므로, `stop.mjs` 를 그냥 더하면 CI 가
빨개진다 — 그게 의도였다.

**골라서 SPEC 한 줄과 게이트를 같이 바꿨다** (예외를 코드에 숨기지 않았다):

> Hook 은 **사용자의 파일**을 변경하지 않는다. 훅이 쓸 수 있는 자리는 `.contextops/` 의
> **git 이 무시하는 경로**(`IGNORED_LOCAL_PATHS`)뿐이고, 훅마다 `hooks/hooks.json` 의
> `_writes` 표에 **선언한** 경로로 한정된다.

★ ②(초안을 서버에 두기)를 안 고른 이유 — 힌트 하나 때문에 **세션 종료가 네트워크를
기다린다.** 그리고 우리가 쓰는 경로는 우리가 만든 `.contextops/.gitignore` 안이라
**git 이 그 변화를 아예 못 본다** — 사용자가 커밋하거나 리뷰하는 파일은 한 바이트도
안 바뀐다. 그게 P6 이 지키려던 것 자체다.

**설계에서 한 판단 다섯** — 다음 바퀴가 되돌리지 않게:

- **「모델이 알 수 없는 값은 CLI 가 붙인다」.** `ProposalDraftFile` 에는
  `base_version_id`·`client_request_id` 칸이 **없다** — 기준 버전은 `GET /versions` 의
  `official_version_id` 로 채운다. ★ 왜 — uuid 는 **지어낼 수 있는 모양**이고, 지어낸
  기준 버전으로 올라온 제안은 승인 화면에서 남의 버전과 대조된다. **눈으로 절대 못 잡는다.**
  (`ContextItemDraftFile` 이 `scan_summary` 를 빼는 것과 같은 이유다.)
- **`--evidence` 를 받으려고 args 에 `kind: 'list'` 를 더했다.** `value` 로 받으면
  앞의 근거가 **조용히 사라진다** — 근거가 사라지는 것은 P7 이 끊기는 것이라
  「마지막 것이 이긴다」로 뭉갤 수 없다.
- **`progress` 의 기본 status 는 표 하나다** (`none`→none · criterion 있으면
  `criterion_done` · 아니면 `in_progress`). ⚠ `done_candidate` 는 기본이 될 수 없다 —
  「끝난 것 같다」는 사람이 확인할 것이지 agent 가 자칭할 것이 아니다.
- **Stop 훅은 세션 id 를 모르면 보고하지 않는다.** 중복 보고는 근거 개수를 부풀려
  P7 을 거짓말로 만든다 — **누락이 낫다.**
- **`--from-pending` 은 힌트로 제안을 만들어 주지 않는다.** 「보낸 뒤 힌트를 치운다」는
  뜻뿐이다. 힌트에는 `{changed_paths, hint}` 뿐이라 거기서 제안을 지으면 근거 없는 줄이 된다.

**게이트를 넷 더했다 — 「같은 지적이 두 번 나오면 게이트로」**:

| 게이트 | 무엇을 막나 | 갈리는지 확인했나 |
|---|---|---|
| 관통 `payload` 단계 (검사 10개) | 나가는 **바이트**에 코드 본문·secret·토큰이 있나 · 계약에 없는 키가 소켓을 타나 | **예** — 초안 body 에 실제 소스를 넣어 빨개지는 것을 봤다 |
| `test/skills.test.ts` | SKILL.md 가 **없는 명령·플래그·계약·종료 코드**를 가르치나 (모델이 그대로 실행한다) | **예** — `--check` 를 `--chek` 로 바꿔 빨개지는 것을 봤다 |
| `test/commands.test.ts` | SPEC §8.3 표와 `COMMANDS` 표가 갈리나 | 표에서 8개를 실제로 읽어 내는지도 같이 잰다 (파서가 0개를 읽으면 무의미하다) |
| `principles.ps1` P6 + `test/hooks.test.ts` | 훅이 **선언 밖**에 쓰나 · 선언이 ignore 밖을 가리키나 | **예** — 선언을 지워도 FAIL · 선언을 `CLAUDE.md` 로 바꿔도 FAIL |
| `test/progress.test.ts` 의 마지막 절 | Pack 이 가르치는 고정 문단(SPEC §4.3)의 플래그를 CLI 가 실제로 받나 | 갈리면 진행 보고가 **조용히** 멈춘다 — 그래서 플러그인이 compiler 를 시험 전용으로 들여온다 |

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| **`PROGRESS_SOURCES` 3종** | `agent` = CLI 기본 · `hook` = stop.mjs · `manual` = 웹 | 시험이 `agent`·`hook` 두 갈래를 **실제 요청**으로 낸다 (hooks.test 가 `source: 'hook'` 을 잰다) | **살렸다** — `manual` 은 화면 6·8(P4)이 주인 |
| **`PROGRESS_STATUSES` 4종** | `progress` 의 기본값 표 + `--status` | `none`·`in_progress`·`criterion_done` 이 시험에서 갈린다 | **거의 다** — `done_candidate` 는 `POST /progress/{id}/confirm` 이 주인이고 그 화면이 아직 없다 |
| **`ProgressEvidence.commit_sha`** | `progress --commit` 이 채운다 | — | **절반** — 플래그는 있는데 그 값을 **읽는 화면이 없다** (P4) |
| **`LOCAL_FILES` 8칸** | `draft`·`proposalDraft`·`pendingProposal` 을 이번에 배선했다 | 셋 다 시험이 파일을 놓고 명령/훅이 읽는 것을 잰다 | **다 살았다** (8/8) |
| **`ERROR_CODES` 의 `VALIDATION_FAILED`** | `session.ts` 의 `reportFailure` 가 **exit 2** 로 옮긴다 | 시험이 「서버가 계약 위반이라 하면 2」를 잰다 (재시도가 아니라 수정이다) | **살렸다 — 이제 CLI 도 읽는다** |
| **`DeviceCredential.device_id`** | `setup --device-id` 로만 들어온다 · **읽는 곳 0곳** | — | **여전히 절반** — `DELETE /devices/{id}` 를 부르는 명령이 아직 없다 |
| 🔴 **`PROGRESS_REPORT` 고정 문단** | `templates/index.ts` 의 `workflow` 칸 `foot` | **`workflow` 항목이 없으면 그 파일이 아예 안 나간다** | **죽어 있다 (조건부)** — FINDINGS 43 |

**11바퀴 · P2 둘째 행 — `sync` · `status` · SessionStart 훅** (`9c4d5d2`)

⚠ 이 바퀴는 **앞 바퀴가 멈춘 자리에서 이어받았다.** 워킹트리에 `sync.ts`·`status.ts`·
`managed.ts`·`session-start.mjs`·`hooks.json` 이 커밋 없이 있었고 **시험은 0개**였다.
타입 검사는 초록이었다 — 그래서 「다 됐다」로 보였다. 실제로는 아래 ①이 살아 있었다.

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 7** / typecheck 5초 / test 37초 / build 32초 / walkthrough OK |
| 새 시험 | **+62** — 플러그인 37 → **99** (`sync` 19 · `status` 9 · `managed` 20 · `hooks` 12 · schema +1). 전체 393 → **455** |
| 관통 단계 | 5 → **6개** (`sync` 가 켜졌다) · 그 단계 안의 검사 **16개 전부 OK** |
| CLI 명령 | 3 → **5개** (SPEC §8.3 의 8개 중 다섯) |
| 훅 | 0 → **1개** (`session-start.mjs`) · `plugin.json` 이 `hooks/hooks.json` 을 가리킨다 |
| 번들 | `bin/contextops-cli.mjs` 771KB → **793KB** (같이 커밋했다) |
| 마이그레이션 | **없다** — DB 를 안 건드렸다 |

**고친 고장 둘 (둘 다 시험이 없어서 안 보였다)**:

- ① 🔴 **`apiGet` 이 봉투를 벗기지 않았다.** `{data,meta}` 를 그대로 넘겼고, 유일한 옛
  호출부(`setup`)가 `data` 를 안 읽어서 **타입 검사도 시험도 초록**이었다. `sync` 는
  그 자리에서 Manifest 를 파싱하다 「계약과 맞지 않는다」→ exit 20 으로 죽는다.
  **진짜 서버에서도 똑같이 죽었을 것이다.** 벗기는 자리를 `envelope()` 하나로 정했고,
  `data` 칸이 없으면 `unreachable` 이다 (「주소가 틀렸다」가 「서버 버전이 낡았다」로
  보고되지 않게).
- ② 관통 `sync` 단계가 **이 저장소에서** `sync --check` 를 부르게 돼 있었다. 여기는
  ContextOps 에 이어진 저장소가 아니라서 preflight 에서 끝난다 — 관통이 아니다.

**끝까지 돌려 본 것** (`.ci/walkthrough-sync.json` · 검사 16개 · 실패 0):

- **배포되는 번들**(`bin/contextops-cli.mjs`)을 `node` 로 띄워 **진짜 소켓**으로 말한다.
  Manifest 는 앞 단계(publish)가 **진짜 서버에서 받아 남긴 것**을 그대로 쓴다
  (그래서 `walkthrough-publish.ts` 가 `.ci/walkthrough-pack/manifest.json` 을 같이 남긴다).
- 파일 2개가 **바이트 그대로** 놓였고 `.contextops/manifest.json` 의 `manifest_hash` 가
  서버 값과 같다 · `applied` 로 보고했다 · **보고 payload 에 문서 본문 0건**(P1 —
  각 Pack 파일의 가장 긴 줄을 뽑아 없는지 봤다).
- 두 번째 `sync` 는 **ETag 를 보내 304** 를 받고 파일을 하나도 안 바꿨다.
- 🔴 서버가 한 줄 덧붙인 바이트를 주면 **exit 20 이고 Pack 파일을 하나도 안 썼다**
  (「디스크를 건드리기 전에 전부 확보한다」의 증거다).
- 훅이 `적용 v0.9.0 · 공식 v1.0.0` 을 알리고 **저장소의 모든 바이트가 그대로다**(P6).

**설계에서 한 판단 넷** — 다음 바퀴가 되돌리지 않게:

- **P6 을 두 겹으로 잰다.** `tools/principles.ps1` 은 쓰기 API **이름**을 세고
  (이제 파일 이름을 박지 않고 **hooks.json 이 가리키는 것 전부**를 센다),
  `test/hooks.test.ts` 는 훅을 **프로세스로 띄운 뒤 모든 파일의 바이트와 mtime** 을
  대조한다. 이름만 세면 새 쓰기 API(예: `fs/promises` 의 다른 이름)에 그대로 뚫린다.
- **`MANAGED_PATHS` 의 줄마다 `sample` 을 둔다.** 정규식은 되돌릴 수 없어서, 이게 없으면
  시험이 「이 줄이 무언가를 통과시킨다」를 스스로 만들 수 없다 — 오타 난 줄이 **아무것도
  통과시키지 않으면서 표에 멀쩡히 남는다.** 「자기 sample 만 맞춘다」도 같이 잰다
  (겹치면 그 줄은 더할 이유가 없었다).
- **`sync --check` 는 캐시조차 쓰지 않는다.** 한 파일이라도 예외를 두면 다음 사람이
  두 번째 예외를 둔다. 「하나도 안 바꾼다」고 말했으면 그래야 한다.
- **보고(8단계) 실패는 sync 실패가 아니다.** 파일은 이미 맞다 — 되돌리면 **맞는 파일을
  되돌리는** 꼴이다. `cache/sync-receipt.json` 에 남기고 다음 `status` 가 재전송한다.
  ⚠ 재전송은 보낼 값을 **다시 조립하지 않는다** (`SyncReceiptFile` 이 `SyncReport` 를
  그대로 품는다). 두 번 조립하면 재전송된 보고가 원래와 달라지고 화면이 거짓말한다.

**게이트를 셋 더했다 — 「같은 지적이 두 번 나오면 게이트로」**:

| 게이트 | 무엇을 막나 | 갈리는지 확인했나 |
|---|---|---|
| 관통 `sync` 단계 (검사 16개) | 번들이 진짜 소켓으로 Pack 을 받아 적용하고 보고하나 · **깨진 바이트에서 멈추나** | **예** — 서버가 한 줄 덧붙이게 해서 exit 20 과 「파일 0개 씀」을 봤다 |
| `test/hooks.test.ts` P6 | 훅이 **어떻게든** 파일을 건드리면 (바이트·mtime 대조) | 알릴 때·조용할 때 두 갈래 다 잰다 |
| `principles.ps1` P6 대상 = hooks.json | 새 훅이 **검사를 안 받고** 들어오는 것 · 없는 파일을 가리키는 것 | **예** — `stop.mjs` 를 적으면 빨개진다 (FINDINGS 42) |

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| **sync 상태 5종** | `judge()` 하나가 매기고 `sync --check`·`status`·관통이 같이 읽는다 | 시험이 5종 중 **4종을 실제 입력으로** 낸다 (`unknown`·`applied`·`outdated`·`modified`) | **살렸다** — `manual` 은 사람이 웹에서 고르는 값이라 CLI 가 안 낸다 (시험이 그 관계를 잠근다) |
| **`MANAGED_PATHS` 5줄** | `checkWritable()` → `sync` ④단계 | 줄마다 `sample` 이 있고 「자기 것만 맞춘다」를 잰다 | **살렸다** — 단 `AGENTS.md`·`.cursor/*.mdc` 는 **컴파일러가 아직 안 낸다** (FINDINGS 7) |
| **`LOCAL_FILES` 7칸** | `syncReceipt`·`latestCache` 를 이번에 배선했다 | receipt 는 보고 실패 시 생기고 재전송 후 지워진다 (시험 2개) | **거의 다** — `draft`·`pendingProposal` 은 P2 **셋째** 행이 주인 |
| `enforcement` 4종 | `packages/compiler/src/sections.ts` 의 `ENFORCEMENT_LABEL` | golden case-2·3 에 **4종이 다 들어 있고** 출력 문구가 셋 다 다르다 (`강제: Hook 이 막는다`·`권한 설정으로 막는다`·`강제 수단 없음`·`리뷰에서 본다`) | **살아 있다** (이번에 확인만) |
| `confidence` 3단계 | 태그(`conf:`) → `parseTraceTag` → 화면 7 · `CONFIDENCE_CHIP` | golden 에 `conf:high`·`medium`·`low` 가 다 나온다 · `web-tables.test.ts` 가 표와 enum 을 대조 | **살아 있다** (이번에 확인만) |
| **`DeviceCredential.device_id`** | `setup --device-id` 로만 들어온다 · **읽는 곳 0곳** | — | **여전히 절반** — `DELETE /devices/{id}` 를 부르는 명령이 아직 없다 |

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

| | dry001·002 | c001 | c002 | c003 `8e02f48` | c004 `84ce3ea` | 11바퀴 `9c4d5d2` | **12바퀴 `f688724`** |
|---|---|---|---|---|---|---|---|
| 시간 | 0.3분 · 0.3분 | 15.1분 | **result 줄 없음** | 30.2분 | 7.1분 | 21.7분 | **32.4분** |
| 턴 | 7 · 7 | 77 | (잘렸다) | 92 | 46 | 129 | **194** |
| 비용 | $0.42 · $0.41 | $6.28 | | $13.90 | $3.05 | $13.56 | **$30.35** |

⚠ 12바퀴가 **역대 최대**다 (턴 194 · $30). GATE 2 한 바퀴에 CLI 3 · Skill 3 · 훅 · 관통
단계를 다 넣었기 때문이다 — 「한 바퀴에 하나」를 넓게 잡으면 값이 이만큼 뛴다.

⚠ **5~10바퀴는 `logs/cycles/` 에 파일이 없다.** 루프 러너가 아니라 직접 연 세션으로 돌았다.
11바퀴의 값은 `logs/cycles/2026-09-04_c001.jsonl` 의 마지막 `result` 줄에서 읽었다.

12바퀴의 값은 `logs/cycles/2026-09-04_c002.jsonl` 에서 읽어 위 표에 이어 적었다.

🔴 **13바퀴(이 바퀴)는 `logs/cycles/2026-09-04_c003.jsonl` 이다.**
`result` 줄은 세션이 **끝난 뒤에** 붙으므로 그 바퀴 자신은 자기 값을 못 읽는다.
**다음 바퀴가 그 파일의 마지막 `result` 줄을 읽어 이 표에 `13바퀴 bc08125` 열로 이어 적어라**
(기준: `duration_api_ms` · `num_turns` · `total_cost_usd`). 안 적으면 기준선이 여기서 끊긴다.

## 눈 판정 대기

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
