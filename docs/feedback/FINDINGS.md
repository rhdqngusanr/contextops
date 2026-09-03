# FINDINGS — 관통이 찾아 놓은 대장

> **루프가 INBOX 다음으로 읽는 파일이다.** 이번 바퀴의 일은 보통 「다음에 고칠 것」 맨 위에 있다.
>
> ★ 왜 이 파일이 따로 있나 — `STATUS.md` 는 「어디까지 했나」고 이 파일은 「무엇이 고장났나」다.
> 둘을 섞으면 고장 목록이 진행 보고에 묻혀서 안 읽힌다. **쓰기만 하고 읽지 않는 파일은
> 없는 파일과 같다** — 그래서 `loop/PROMPT.md` ②표의 2번이 이 파일을 명시적으로 지목한다.
>
> ⚠ **고친 항목을 지우지 마라.** `✅` 와 커밋 해시를 붙여 남겨라. 지우면 다음 바퀴가
> 같은 것을 다시 찾느라 한 바퀴를 통째로 쓴다.

## 적는 형식

```
### N. <한 줄 제목>   [고장|구멍|격차]
- **증상**: 무엇이 어떻게 안 되나 (재현 방법 한 줄)
- **근거**: 파일:줄 · 캡처 경로 · 응답 코드 — **본 것만 적는다**
- **정본**: docs/SPEC.md §N (이 항목이 어겨진 원칙이 있으면 P번호)
- **상태**: 대기 | 진행 | ✅ <커밋해시>
```

⚠ 근거 캡처를 남길 거면 `.ci/shots/` **밖으로 복사해라** — 다음 관통이 통째로 지운다.
고치는 바퀴와 지우는 바퀴가 같은 바퀴다. **적기 전에 복사부터.**

⚠ 심각도 순서는 항상 **고장 → 구멍 → 격차**다. 발행이 막히는데 랜딩을 예쁘게 만들어 봐야
아무도 그 화면까지 못 간다.

---

## 다음에 고칠 것

### 62. 도는 동안 **진행률이 0 정보**다 — 화면 3 이 보여 줄 것이 「돌고 있음」뿐이다   [격차]
- **증상**: `ai_jobs` 는 `queued → running → succeeded/failed` 만 남긴다. chunk 진행
  (`result.chunks {used,total}`)은 **끝난 뒤에야** 쓰인다 — `runJob()` 이 러너가 돌아온
  다음에 한 번 UPDATE 하기 때문이다. 그래서 12 chunk 짜리 문서를 올리면 화면 3 은
  몇 분 동안 **회전만** 보여 준다. SPEC §9 화면 3 은 「구조화 **진행 표시**(polling)」인데
  지금 polling 이 가져오는 새 정보는 status 한 글자뿐이다.
- **근거**: 이번 바퀴 직접 읽음 — `apps/web/src/lib/ai/job.ts` 의 `runJob()`
  (첫 UPDATE=running · 마지막 UPDATE=succeeded, 그 사이 쓰기 0곳) ·
  `docs/evidence/2026-09-04-jobs-shape/list-vs-detail.txt` 의 `result.chunks`
  는 succeeded 행에만 있다
- **정본**: `docs/SPEC.md` §7.1 · §9 화면 3
- **고칠 방향**: ⚠ **chunk 마다 행을 UPDATE 하는 것이 제일 싼 길이지만, 그러면
  `result` 가 「끝난 것」이 아니게 된다** — `ai_jobs_result_ck`(succeeded 여야 result 가
  있다)와 부딪친다. 값싼 갈래 둘: ① `input` 에 chunk 총수를 미리 넣는다 (문서 글자수는
  올릴 때 안다 — 「12 조각 중」까지는 LLM 없이 말할 수 있다) ② 진행 칸을 따로 둔다
  (`progress jsonb` · CHECK 밖). ①이 먼저다 — 화면이 「몇 조각짜리 일인가」만 알아도
  회전은 막대가 된다. ⚠ 어느 쪽이든 **표의 수명 규칙(`AI_JOB_STATUS_RULES`)을 먼저
  읽어라** — 거기서 CHECK 이 생성된다.
- **상태**: 대기 (화면 3 이 주인)

### 63. job 응답 모양이 **셋**이다 — 만드는 라우트만 `shape` 가 없다   [격차]
- **증상**: 이번 바퀴에 목록(`shape:'summary'`)과 상세(`shape:'full'`)를 갈랐는데,
  job 을 **만드는** 두 라우트(`POST /documents` · `batch-draft`)는 `createJob()` 이
  돌려주는 `{id, status}` 를 그대로 `job` 으로 싣는다 — `shape` 가 없는 셋째 모양이다.
  화면이 그 객체를 job 으로 들고 다니면 `shape` 를 못 찾고, 「summary 인가 full 인가」를
  판단하는 코드가 `undefined` 갈래를 하나 더 갖게 된다.
- **근거**: 이번 바퀴 직접 읽음 —
  `apps/web/src/app/api/v1/projects/[id]/documents/route.ts:67~82` (`job` 을 그대로 실음) ·
  `apps/web/src/lib/ai/job.ts` 의 `createJob()` 반환형 `{id, status}`
- **정본**: `docs/SPEC.md` §5
- **고칠 방향**: 둘 중 하나. ① 이름을 바꿔 **모양이 아니게** 한다 (`job_id`) — 그러면
  화면은 「id 를 받았으니 목록/상세로 읽으러 간다」가 되고 모양은 여전히 둘이다.
  ② `createJob()` 이 `INSERT … returning` 에서 요약 칸을 다 받아 `toAiJob()` 을 태운다 —
  모양은 둘로 유지되고 화면은 첫 응답부터 job 객체를 갖는다. ⚠ ②는 만드는 라우트가
  **응답 계약을 넓히는** 것이라 화면 3 이 그 값을 실제로 쓰는지 보고 정해라 — 안 쓰면
  ①이 더 정직하다 (안 쓰는 칸을 내보내지 않는다).
- **상태**: 대기 (화면 3 이 주인 · 값싸다)

### 60. job 목록이 **`result` 를 통째로 실어 나른다** — polling 이 무거워진다   [격차]
- **증상**: `GET /projects/{id}/jobs` 는 `AI_JOB_COLUMNS` 를 그대로 읽어서 **행마다
  `result` 전부**를 낸다. `result.items` 에는 §7.1 이 문서에서 뽑은 항목 초안이 통째로
  들어 있다 (제목·본문·`data`·`span`). `limit` 상한이 **200**(`LIST_LIMIT_MAX`)이라
  한 요청이 항목 수천 개를 나를 수 있고, 화면 3 이 이 목록을 2초마다 두드리면 그
  payload 가 매번 다시 간다. **찾는 데 필요한 것은 `id`·`feature`·`status` 뿐이다.**
- **근거**: 이번 바퀴 직접 출력해서 읽었다 —
  `docs/evidence/2026-09-04-jobs-list/get-jobs.txt` (job 2개짜리 목록이 이미 47줄 ·
  succeeded 행이 `result` 를 다 싣고 있다) · `packages/schema/src/api.ts:112`
  `LIST_LIMIT_MAX = 200`
- **정본**: `docs/SPEC.md` §5 · §9 화면 3
- **고칠 방향**: 목록에서 `result`(그리고 아마 `input`)를 뺀다 — 전문은 이미
  `GET …/jobs/{jobId}` 가 낸다. ⚠ **칸을 라우트에서 손으로 고르지 마라.**
  `AI_JOB_COLUMNS` 옆에 `AI_JOB_LIST_COLUMNS` 를 두고 **둘 다 `toAiJob()` 이 아는
  모양**이게 해라 — 안 그러면 「목록에는 있는데 상세에는 없는 칸」이 조용히 생긴다.
  응답 모양이 둘이 되므로 화면이 어느 쪽을 받았는지 알 수 있어야 한다.
- **상태**: ✅ `91ede81` — 목록은 `result` 를 안 나른다. 칸을 라우트에서 고르지 않고
  **`AI_JOB_FIELDS` 표 하나에 `heavy` 축**을 두어 거기서 `AI_JOB_COLUMNS`(상세)와
  `AI_JOB_LIST_COLUMNS`(목록)가 생성된다 — 「목록에는 있는데 상세에는 없는 칸」이 생길 자리가
  없다. 응답의 **`shape:'summary'|'full'`** 이 화면에게 어느 쪽을 받았는지 말한다.
  `input` 은 남겼다 — 계약이 **가리키는 id 만** 담게 막고 있고(P1) 화면이 「이게 내 문서의
  job 인가」를 그 칸으로 가른다. 시험 **+5** (220 → 225): 표의 `heavy` 를 뒤집으면 응답이
  갈린다 · 목록 payload 에 항목 초안의 제목도 본문도 0건 · shape 가 갈린다.
  눈으로 읽은 근거: `docs/evidence/2026-09-04-jobs-shape/list-vs-detail.txt` —
  job 2개짜리 목록 **953바이트** vs 같은 job 한 장의 상세 **2063바이트**.

### 61. `VALIDATION_FAILED` 의 문구가 **질의 오류에 안 맞는다**   [격차]
- **증상**: `?feature=ask` 로 물으면 400 이 나는데 message 가 「**요청 본문**이 계약과
  맞지 않는다」다. 본문을 보낸 적이 없다. `details` 는 정확하지만(`path:'feature'`),
  화면이 message 를 그대로 띄우면 사람은 body 를 고치러 간다.
- **근거**: 이번 바퀴 직접 출력 — `docs/evidence/2026-09-04-jobs-list/get-jobs.txt`
  마지막 블록 · `packages/schema/src/api.ts:74` (`ERROR_STATUS`/`ERROR_HINT` 의 그 줄)
- **정본**: `docs/SPEC.md` §5 (에러 코드 표)
- **고칠 방향**: 코드를 나누지 마라 — `VALIDATION_FAILED` 하나로 충분하고 갈래를
  더하면 표가 늘어난다. **문구를 「요청이 계약과 맞지 않는다」로 좁히면** body·query·
  path 셋 다에 참이다. ⚠ 한 곳(`api.ts`)만 고치면 되지만 `packages/schema` 라
  **플러그인 번들이 갈린다** — `pnpm --filter @contextops/plugin build` 를 같이 돌려라
  (`test/bundle.test.ts` 가 표류로 잡는다).
- **상태**: 대기 (값싸다)

### 58. **도는 job 을 다시 찾을 문이 없다** — 새로고침하면 화면 3 이 길을 잃는다   [구멍]
- **증상**: job id 는 `POST /documents` 의 **응답에만** 있다. 화면 3 이 그 id 를 들고
  polling 하는데, 사용자가 새로고침하거나 다른 화면에 갔다 오면 **그 id 를 다시 찾을
  방법이 없다.** `GET /projects/{id}/jobs` (목록)가 없기 때문이다. 그러면 문서는
  올라갔는데 진행 표시는 영원히 안 뜨고, 사람은 「안 됐나 보다」 하고 다시 올린다 —
  그게 §7.5 의 시간당 5회를 태우는 자리다.
- **근거**: 이번 바퀴 직접 만들었다 — 라우트는 `…/jobs/{jobId}` 하나뿐이고
  `ai_jobs` 를 프로젝트로 조회하는 자리가 0곳이다 (인덱스
  `ai_jobs_project_created_idx` 는 그 질의를 위해 미리 만들어 뒀는데 **읽는 코드가 없다**)
- **정본**: `docs/SPEC.md` §5 · §9 화면 3
- **고칠 방향**: `GET /projects/{id}/jobs?feature&status&limit` 한 줄이면 된다 —
  응답 모양은 `toAiJob()` 이 이미 있다. ⚠ **화면 3 을 만드는 바퀴가 이걸 먼저 해라.**
  화면부터 만들면 「응답에서 받은 id 를 state 에 들고 있는」 코드를 짜게 되고,
  그 코드는 새로고침에서 조용히 무너진다.
- **상태**: ✅ `a4a2682` — `GET /projects/{id}/jobs?feature&status&limit&offset` 을 냈다.
  **최신순**이라 `?feature=structure&limit=1` 하나가 「이 프로젝트의 마지막 구조화 job」이다 —
  화면 3 은 polling 을 시작하기 전에 여기부터 읽으면 되고, id 를 state 에 들고 있을 이유가 없다.
  질의 계약 `AiJobQuery` 는 `lib/ai/job.ts` 에 뒀다 (`ListQuery` 를 넓힌다) — `feature` 의 값이
  `AI_JOB_FEATURES` 에서 오는데 그 표를 `packages/schema` 로 올리면 **플러그인 번들에 실려
  사용자 기계로 배포된다** (`features.ts` 머리 주석). 시험 **+7** (213 → 220):
  응답을 잃고도 찾아낸다 · 최신순 · `feature`/`status` 를 뒤집으면 결과가 갈린다 ·
  `limit`/`offset` 이 자른다 · job 이 아닌 기능(`ask`)·없는 상태는 400 · 남의 프로젝트는 404.
  `ai_jobs_project_created_idx` 가 **처음으로 읽는 코드를 가졌다.** SPEC §5 에 같은 줄.

### 59. **실패한 job 을 다시 굴릴 문이 없다**   [격차]
- **증상**: 예산 초과(`BUDGET_EXCEEDED`)·빈도 초과(`RATE_LIMITED`)로 죽은 job 은
  `failed` 로 남고 끝이다. 그 둘은 **시간이 지나면 저절로 풀리는** 실패인데,
  다시 굴릴 문이 없어서 사용자가 할 수 있는 일은 **문서를 다시 올리는 것**뿐이다 —
  그러면 `source_documents` 에 같은 문서가 두 벌 생긴다.
- **근거**: 이번 바퀴 직접 만들었다 — `runJob()` 은 `status='queued'` 인 행만 집는다.
  `failed` → `queued` 로 되돌리는 자리가 0곳이다 (`apps/web/src/lib/ai/job.ts`)
- **정본**: `docs/SPEC.md` §7.5 · §9 화면 3
- **고칠 방향**: ⚠ **아무 실패나 다시 굴리게 하지 마라.** `AI_OUTPUT_INVALID` 는
  다시 불러도 같은 값이 올 확률이 높고, 그러면 재시도 버튼이 예산을 태우는 버튼이 된다.
  「다시 굴려도 되는 코드」를 **표로** 정해라 (`ERROR_CODES` 옆의 한 축이 자연스럽다) —
  그러면 코드를 더할 때 그 판단을 빠뜨릴 수 없다. 화면은 그 표를 읽어 버튼을 그린다.
- **상태**: 대기 (화면 3 이 주인)

### 56. 질문에 답해서 만든 항목이 **그 질문과 이어지지 않는다**   [구멍]
- **증상**: `POST /projects/{id}/questions` 는 답변으로 항목을 만들 수 있는데, 만들어진
  항목과 그 질문(`kind='open_question'` 인 충돌) 사이에 **DB 상의 연결이 하나도 없다.**
  질문 쪽에는 답변 문장만 `resolution.note` 로 남고, 항목 쪽 `source_refs` 는
  **클라이언트가 준 것을 그대로 쓴다** — 아무것도 안 주면 근거 0개인 항목이 생기고,
  그 항목은 Pack 에 나가서 「이 줄은 어디서 왔나」에 답할 수 없다 (P7).
- **근거**: 이번 바퀴 직접 읽음 —
  `apps/web/src/app/api/v1/projects/[id]/questions/route.ts:106~124`
  (`sourceRefs: draft.source_refs` · 만든 항목 id 는 응답에만 있고 충돌 행에 안 남는다) ·
  `SOURCE_REF_KINDS` 4종에 「질문/충돌」이 없다 (`packages/schema/src/common.ts:35`)
- **정본**: `docs/SPEC.md` §3(`SourceRef`) · §5 · P7
- **고칠 방향**: ⚠ **`SOURCE_REF` 에 「충돌」 종류를 더하지 마라** — 그러면 항목의 근거가
  항목·충돌을 가리킬 수 있게 되고 원문까지 가는 사슬이 끊긴다 (이번 바퀴에 §7.2 를
  두고 같은 판단을 했다 · `CONFLICT_ANCHORS` 주석). 남는 길 둘이다:
  ① 질문이 물고 있던 **`a_ref`(원문 구간)를 만들어지는 항목의 `source_refs` 로 물려준다**
     — 질문은 §7.1 이 문서를 읽다 남긴 것이라 원문 구간을 이미 갖고 있다. 사슬이 이어진다
  ② 그 위에 「어느 질문에서 나왔나」가 필요하면 `conflicts.resolution` 에 항목 id 를 더한다
     (결정의 기록이지 근거의 사슬이 아니다 — 방향이 반대라 P7 을 안 건드린다)
  ①이 먼저다. ②만 하면 항목은 여전히 근거가 0개다.
- **상태**: 대기 (화면 4 를 만드는 바퀴가 주인 · P3 둘째 행)

### 57. `b_ref` 는 이제 **어느 종류도 채울 수 없다**   [격차]
- **증상**: 이번 바퀴에 만든 CHECK 이 `conflicts_b_ref_shape_ck = ("b_ref" is null)` 이다.
  `anchor:'document'` 이면서 `needsB` 인 종류가 표에 0줄이라 그렇다 — 즉 **컬럼은
  있는데 어떤 행도 채울 수 없다.** 이 저장소가 매 바퀴 찾는 「정의만 있고 아무 일도
  안 하는 것」이 하나 새로 생긴 셈이다.
- **근거**: `apps/web/drizzle/0003_fluffy_jean_grey.sql` 마지막에서 둘째 줄 (직접 읽음)
- **정본**: `docs/SPEC.md` §2
- **고칠 방향**: ⚠ **그냥 지우지 마라.** 지우면 `needsB` 가 `anchor:'document'` 인
  종류에게 **아무 뜻도 없는 칸**이 되고, 그 조합을 더한 다음 사람이 잘못을 알 방법이
  사라진다 (지금은 CHECK 이 그 자리를 지키고 있다 — 「아직 아무도 안 쓴다」를 기계가
  말하는 상태다). 둘 중 하나로 끝내라:
  ① 그대로 둔다 — 대신 이 사실을 시험 한 줄로 잠가서 **일부러 그런 것임**을 못 잊게 한다
  ② 지운다 — 그러면 `ConflictKindRule.needsB` 를 `anchor:'items'` 전용으로 좁히고
     타입으로 그 조합을 못 쓰게 막아야 한다 (표에 못 적으면 잊을 수도 없다)
- **상태**: 대기 (값싸다)

### 54. `conflicts` 표가 §7.2 의 출력을 **담지 못한다** — 그리고 부르는 자리가 없다   [구멍]
- **증상**: 이번 바퀴에 `detectConflicts()` 를 만들었고 시험 24개가 잰다. 그런데
  `grep -rn "detectConflicts" apps/web/src | grep -v lib/ai/` → **0건**이다.
  게다가 낸 것을 **저장할 칸이 없다**: DB 의 `conflicts` 는 `a_ref`/`b_ref` 가
  `SourceRef` 인데 §7.2 가 내는 것은 `a_item_id`/`b_item_id`(`item_<slug>`)이고,
  `severity` 는 **칸 자체가 없다.** 즉 FINDINGS 28(충돌 행을 만드는 코드 0곳)이
  **한 겹 위로 올라갔을 뿐** 화면의 충돌 수는 여전히 항상 0이다.
- **근거**: 이번 바퀴 직접 grep · `apps/web/src/db/schema.ts` 의 `conflicts`
  (`aRef`/`bRef` 는 `jsonb().$type<SourceRef>()` · severity 칸 없음) ·
  `apps/web/src/lib/api/conflict.ts` 의 `CONFLICT_COLUMNS`
- **정본**: `docs/SPEC.md` §2 · §5 · §7.2
- **고칠 방향**: 🔴 **FINDINGS 25·29 와 한 묶음이다 — 셋을 같은 바퀴에 정해라.**
  이번 바퀴에 깔아 둔 근거는 이것이다: `CONFLICT_KINDS` 5종 중 §7.2 가 내는 **넷은
  전부 항목 대 항목**이고(`CONFLICT_KIND_RULES[k].needsB` 가 넷 다 `true`),
  `open_question` **하나만** 항목이 아니라 **문서 구간**을 가리킨다 (§7.1 이 만든다).
  그래서 「`a_ref` 에 항목 종류를 더한다」는 **`SOURCE_REF` 를 넓히는 것**이 되는데,
  그러면 항목의 `source_refs` 가 다른 항목을 가리킬 수 있게 되고 **원문까지 가는 사슬이
  끊긴다** (P7). 남는 길은 `conflicts` 에 `a_item_id`·`b_item_id`·`severity` 칸을
  더하고 `a_ref` 는 `open_question` 전용으로 **좁히는** 쪽이다 — 어느 칸이 어느 종류에
  필요한지는 이미 `CONFLICT_KIND_RULES` 표가 안다.
  ⚠ 부르는 자리는 SPEC §5 가 이미 적었다 — `batch-draft` 가 「충돌 탐지 job 시작」이다.
  그건 §7.1 과 **같은 job 자리**를 기다린다 (FINDINGS 52).
- **상태**: ✅ `8cde1f5` — **표 절반은 닫혔다.** `conflicts` 에 `a_item_id`·`b_item_id`·
  `severity` 를 더하고 `a_ref` 는 `anchor:'document'` 인 종류 전용으로 좁혔다.
  `CONFLICT_KIND_RULES` 에 축 하나(`anchor`)를 더해 **종류별로 어느 칸이 차는지를
  표 한 줄로** 만들고, `db/schema.ts` 의 `conflictShapeCheck()` 가 그 표를 읽어
  **CHECK 제약 5개를 생성**한다 — 종류를 더하면 `db:generate` 한 번으로 따라온다.
  `(project_id, a_item_id)` 복합 FK 가 없는 항목을 가리키는 카드를 막는다 (P7).
  마이그레이션 `0003` · 시험 190→194 (제약이 실제로 무는지 재는 3개 + 응답 1개).
  SPEC §2·§7.2 도 같게 고쳤다 (FINDINGS 25 가 적은 「SPEC 안에서 갈렸다」의 원인).
  🔴 나머지 절반(부르는 자리·INSERT)은 FINDINGS 28 이 들고 있었고 **`a1f0a79` 에서
  같이 닫혔다** — 이제 표는 담고, 담는 코드도 있다.

### 55. §7 공통 금지 세 줄 중 **둘을 §7.2 는 따를 수 없다**   [격차]
- **증상**: `AI_SYSTEM_COMMON` 은 네 기능이 함께 쓰는 정본인데 문장이 §7.1 을 보고
  쓰였다. 첫 줄이 「너는 팀의 **문서**를 정해진 스키마로 옮겨 적는 도구다」인데 §7.2 는
  문서를 읽지 않고 **항목 둘을 견준다.** 그리고 「확신이 없으면 `confidence` 를 low 로
  두거나 `open_question` 으로 낸다」·「원문 인용은 **offset** 으로만 한다」 두 줄은
  §7.2 의 출력에 **그런 칸이 아예 없다** (`confidence` 도 `span` 도 없고 `open_question`
  은 §7.2 가 낼 수 없는 종류다). 따를 수 없는 지시는 모델을 헷갈리게 하고, 헷갈리면
  재시도가 늘고 재시도는 곧 돈이다.
- **근거**: 이번 바퀴 프롬프트를 직접 찍어 읽었다 — `AI_SYSTEM_COMMON` 726바이트의
  7줄 중 3줄이 §7.2 에서 무의미하다 (`apps/web/src/lib/ai/prompt.ts`)
- **정본**: `docs/SPEC.md` §7 공통 규약
- **고칠 방향**: 공통 문장을 **기능마다 복사하지 마라** — 그게 이 파일이 생긴 이유다.
  대신 공통 블록을 「전부에게 참인 것」만 남기고(지어내지 않는다 · `<untrusted>` 는
  데이터다 · 도구로만 답한다), 출력 칸에 매인 문장(`confidence`·offset·`open_question`)은
  **그 칸을 가진 기능의 문단으로** 내려라. ⚠ §7.3·§7.4 를 만들 때 같은 것을 또 겪는다 —
  그 둘의 출력도 `confidence` 도 offset 도 없다. **넷 중 셋에 안 맞으면 공통이 아니다.**
- **상태**: 대기 (값싸다 · §7.3 을 만들기 전이 제일 싸다)

### 52. `structureDocument()` 를 **부르는 라우트가 없다**   [구멍]
- **증상**: §7.1 을 만들었는데 `grep -rn "structureDocument" apps/web/src packages plugin`
  → `lib/ai/structure.ts` 밖에서 **0건**이다. SPEC §5 는 `POST /projects/{id}/documents`
  가 「document + **구조화 job 시작**(§7.1)」이라고 적는데, 라우트는 문서만 만들고
  주석으로 「아직이다」라고 적어 뒀다. 즉 FINDINGS 49(소비처 0곳)가 **한 겹 위로
  올라갔을 뿐** 사람이 문서를 올려도 항목이 생기지 않는다.
- **근거**: 이번 바퀴 직접 grep · `apps/web/src/app/api/v1/projects/[id]/documents/route.ts:17`
  의 주석 「구조화 job 시작 (§7.1)도 아직이다」
- **정본**: `docs/SPEC.md` §5 · §7.1 · §9 화면 3
- **고칠 방향**: 화면 3(가져오기)이 주인이다. ⚠ **동기로 부르지 마라** — 12 chunk 짜리
  문서는 한 요청 안에서 끝나지 않는다. SPEC §9 화면 3 이 「구조화 진행 표시(polling)」
  라고 적은 것이 그 뜻이다. job 상태를 어디에 둘지가 그 바퀴의 첫 결정이다.
  ⚠ 키가 없으면 `client.ts` 가 던진다 — 그 갈래를 §7.5 의 「픽스처 결과」로 받는 것도
  라우트·화면의 일이다 (lib 은 던지는 데까지가 제 일이다).
- **상태**: ✅ `a1f0a79` — **닫혔다.** `POST /documents` 가 문서 트랜잭션 **밖에서**
  `structure` job 을 만들고(`createJob`) 응답에 `job:{id,status}` 를 실은 뒤
  `startJob()` 으로 굴린다. 동기로 부르지 않는다 — 굴리는 것은 `after()`(Next 15)이고,
  요청 문맥이 없는 자리(`scripts/dev-server.ts`·관통)에서는 그냥 띄운다.
  화면이 읽을 자리는 `GET /projects/{id}/jobs/{jobId}` 다.
  ⚠ 키가 없으면 job 이 `failed`·`error_code='INTERNAL'` 로 끝난다 — §7.5 의
  「픽스처 결과로 떨어지는」 갈래를 **고르는 것은 아직 아무도 안 한다** (화면 3 의 몫).

### 53. 도구 `input_schema` 의 `$defs` 이름이 **아무 뜻이 없다**   [격차]
- **증상**: §7.1 이 모델에게 주는 JSON Schema 는 `z.toJSONSchema(..., {reused:'ref'})`
  가 낸 것이라 재사용 조각의 이름이 `__schema0` ~ `__schema23` 이다. **이 파일은
  모델이 읽는 지시서**인데(SPEC §7 「input_schema = 해당 Zod 의 JSON Schema」)
  이름이 뜻을 하나도 안 나른다. 「`__schema4` 를 채워라」는 「scope 를 채워라」보다
  약한 지시다 — 출력 품질이 떨어지면 재시도가 늘고 재시도는 곧 돈이다.
- **근거**: 이번 바퀴 직접 출력 — `$defs` 24개 · 전체 11,485바이트 ·
  `items.items.$ref = "#/$defs/__schema0"` · `span` 정의는 `__schema15` 를 다시 참조
- **정본**: `docs/SPEC.md` §7
- **고칠 방향**: Zod 의 `.meta({ id: 'Scope' })` 로 이름을 주면 `$defs` 키가 그 이름이
  된다. ⚠ **`packages/schema` 를 고치면 `plugin/contextops/schemas/*.json` 이 통째로
  바뀐다** (같은 `toJsonSchemaOf` 를 쓴다) — `json-schema.test.ts` 가 표류로 잡으므로
  산출물을 같이 커밋해야 한다. ⚠ 이름은 **모델에게 주는 힌트**라서 바꾸면
  「진짜로 나아졌나」를 잴 방법이 지금은 없다 (키가 없다). 키가 생긴 뒤에 해라.
- **상태**: 대기 (🙋 API 키 다음)

### 48. ✅ SPEC §7 이 쓰라는 `AI_OUTPUT_INVALID` 가 **에러 코드 표에 없다**   [구멍]
- **증상**: §7 공통 규약은 「출력은 Zod 로 재검증, 실패 시 오류 위치를 넣어 1회 재시도,
  재실패 시 `AI_OUTPUT_INVALID`」다. 그런데 `ERROR_CODES` 10종에 그 이름이 없다
  (`UNAUTHORIZED`·`FORBIDDEN`·`NOT_FOUND`·`VALIDATION_FAILED`·`STALE_BASE`·
  `REVISION_CONFLICT`·`BUDGET_EXCEEDED`·`RATE_LIMITED`·`COMPILE_FAILED`·`INTERNAL`).
  그래서 §7.1 을 만드는 사람은 **재실패를 낼 코드가 없다** — `INTERNAL`(500)로 내면
  「AI 가 계약과 다른 걸 냈다」와 「서버가 터졌다」가 화면에서 구별되지 않는다.
- **근거**: `docs/SPEC.md` §7 첫 문단 · `packages/schema/src/api.ts` 의 `ERROR_CODES`
  (이번 바퀴 직접 대조) · `apps/web/test/error-codes.test.ts` 는 지금 **10종 전부**
  소비처가 있다고 잰다 — 즉 표에 없는 이름은 시험도 못 잡는다
- **정본**: `docs/SPEC.md` §7 · §5
- **고칠 방향**: `ERROR_CODES` **끝에** `AI_OUTPUT_INVALID` 를 더하고 `ERROR_STATUS` 에
  한 줄(502 가 맞다 — 우리 잘못이 아니라 상류가 계약을 어긴 것이다). 절차는 그 표 옆
  주석의 넷이고, ④(`WITHOUT_OWNER` 에서 지우기)는 **§7.1 을 만드는 바퀴**가 한다.
  ⚠ `packages/schema` 를 고치면 **번들이 갈린다** — `pnpm --filter @contextops/plugin build`
  와 `schemas` 를 같이 돌리고 커밋해라 (docs/STATUS.md).
- **왜 이번 바퀴에 안 했나**: 이번 바퀴의 일은 예산 가드였고, 코드를 더하면 소비처가
  없는 채로 `WITHOUT_OWNER` 에 한 줄이 새로 생긴다 — 방금 비운 표를 도로 채우게 된다.
  **§7.1 과 같은 바퀴에 해라.**
- **상태**: ✅ `34eb766` — `ERROR_CODES` 끝에 한 줄 · `ERROR_STATUS` 502(상류가 계약을
  어긴 것이지 우리가 터진 게 아니다) · `ERROR_HINT` 화면 문구. **소비처와 같은 바퀴에
  넣었다** — `lib/ai/structure.ts` 가 재시도 뒤에 던지므로 `WITHOUT_OWNER` 는 여전히
  비어 있고 에러 코드 **11종 전부**가 내는 자리를 가졌다.

### 49. ✅ `withBudget()` 에 **소비처가 0곳**이다   [구멍]
- **증상**: 이번 바퀴에 예산 가드를 만들었고 시험 18개가 잰다. 그런데
  `grep -rn "withBudget" apps/web/src | grep -v lib/ai/` → **0건**이다.
  라우트도 서비스도 아직 아무도 안 부른다. `AI_FEATURES` 4종(`structure`·`conflict`·
  `ask`·`demo`) 전부 실제 호출부가 없다 — 지금은 시험만 부르는 문이다.
- **근거**: 이번 바퀴 직접 확인 · `tools/principles.ps1` 의 P3 는 「2개 호출부」로 초록인데
  그 둘은 `lib/ai/client.ts`(예외)와 `lib/ai/budget.ts`(주석에 글자가 있어 세어졌다)다
  — **제품 경로에는 한 건도 없다**
- **정본**: `docs/SPEC.md` §7.1 · §7.2
- **고칠 방향**: PLAN P3 첫 행의 ②(`structureDocument`)·③(`detectConflicts`)가 주인이다.
  그 둘이 `withBudget('structure'|'conflict', …)` 로 부르면 닫힌다.
  ⚠ 지금 소비처를 급히 만들지 마라 — 부를 내용(프롬프트·Zod 출력 계약)이 §7.1 의 일이다.
- **상태**: ✅ `34eb766` — `structureDocument()` 가 `withBudget('structure', …)` 로 부른다.
  ⚠ **아직 `conflict`·`ask`·`demo` 는 부르는 자리가 없다** (③·§7.3·§7.4). 그리고 라우트가
  `structureDocument` 를 아직 안 부른다 — 같은 구멍이 한 겹 위에 남았다 (**FINDINGS 52**).

### 50. `principles.ps1` 의 P3 가 **주석의 글자**를 호출부로 센다   [격차]
- **증상**: P3 검사는 `messages\.create|messages\.stream` 이 **문자열로** 나오는 파일을
  호출부로 세고, 그 파일에 `withBudget` 이라는 **글자**가 있으면 통과시킨다. 그래서
  ①주석에 그 이름을 적은 파일이 호출부로 세어지고(이번 바퀴에 「2개 호출부」가 됐다),
  ②반대로 **진짜 호출부가 주석에만 `withBudget` 을 적어도 통과한다.**
  두 번째가 위험한 쪽이다 — 「급해서 임시로」 부른 자리가 주석 한 줄로 초록이 된다.
- **근거**: `tools/principles.ps1` 132~165줄 · 이번 바퀴 `principles.ps1` 출력의
  「P3 OK · 2개 호출부」 (실제 `messages.create` 호출은 `lib/ai/client.ts` **한 곳**)
- **정본**: `docs/SPEC.md` §0.1 P3
- **고칠 방향**: 셀 때 주석 줄을 빼라(`^\s*(//|\*|/\*)` 로 시작하는 줄 제거 후 검사).
  ⚠ 게이트를 좁히는 변경이므로 **갈리는 것을 보고** 넣어라 — 주석만 고쳐서 FAIL 이
  나는지, 진짜 호출부를 만들어서 OK 가 되는지 둘 다 확인한 뒤 커밋한다.
  ⚠ 같은 무딤이 P2 검사에도 있다 (`Get-SourceFiles` 를 그대로 쓴다) — 같이 봐라.
- **🔴 이번 바퀴에 더 위험해졌다** (`34eb766`): 이제 `lib/ai/client.ts` 의 `callClaude()`
  를 부르는 **제품 파일이 생겼다**(`structure.ts`). P3 검사는 `messages.create` 라는
  **글자**가 있는 파일만 호출부로 세므로 `structure.ts` 는 아예 세어지지 않는다 —
  즉 **누구든 `callClaude()` 를 직접 부르면서 `withBudget` 을 건너뛰어도 게이트가
  초록이다.** 고칠 때 셀 대상을 `messages\.create` 에서 `callClaude|messages\.create`
  로 넓혀라 (예외는 `lib/ai/{client,budget}.ts` 그대로).
- **상태**: 대기 (값싸다 · 게이트는 문서보다 강하다 · **이제 급하다**)

### 51. ✅ SPEC §7.5 에 **충돌 탐지의 빈도 상한이 없다**   [격차]
- **증상**: §7.5 의 Rate limit 은 `/ask`·`/demo`(분당 3회)와 문서 구조화(프로젝트당
  시간당 5회) 셋뿐이다. §7.2 충돌 탐지에는 아무 숫자도 없다. 이번 바퀴의
  `AI_FEATURE_LIMITS` 는 그 칸을 `rate: null`(빈도 제한 없음)로 두고 이유를 주석에 적었다 —
  **지어내지 않았다.** 그래도 하루 예산 말고는 그 기능을 막는 것이 없다.
- **근거**: `docs/SPEC.md` §7.5 · `apps/web/src/lib/ai/features.ts` 의 `conflict` 칸 ·
  `apps/web/test/ai-budget.test.ts` 「conflict 는 빈도 상한이 없다」(12회 연속 통과를 잰다)
- **정본**: `docs/SPEC.md` §7.2 · §7.5
- **고칠 방향**: §7.2 를 만드는 바퀴가 「무엇마다 세나」를 먼저 정해라 — 이 기능은 사람이
  누르는 게 아니라 **항목이 바뀔 때 서버가 부르는** 것이라 창 단위가 무엇인지가 답의
  절반이다. 정하면 `AI_FEATURE_LIMITS` 의 그 칸 하나만 고치면 되고, SPEC §7.5 에도
  같은 줄을 적어라 (수치를 두 곳에 적으면 갈린다).
- **상태**: ✅ `7cf9d50` — **탐지 한 번(= 바뀐 항목 묶음 하나)**이 세는 단위이고 열쇠는
  프로젝트다. `conflict: { calls: 10, windowSeconds: 3600, scope: 'project' }` ·
  SPEC §7.5 에 같은 줄. 왜 10인가는 `features.ts` 의 그 칸 주석에 적었다 —
  한 프로젝트가 시간당 열 번 넘게 항목 묶음을 바꿔 올리는 것은 사람의 리듬이 아니라
  **루프**다. ⚠ 이 상한은 예산을 대신하지 않는다. 돈을 막는 것은 여전히 하루 예산이다.

### 43. ✅ `workflow` 항목이 없으면 **agent 가 진행 보고를 배우지 못한다**   [구멍]
- **증상**: SPEC §4.3 은 진행 보고 문단이 「`workflow.md` 에 **항상** 포함되는 고정
  텍스트」라고 적는다. 그런데 컴파일러는 `workflow` **타입 항목이 하나라도 있을 때만**
  `.claude/rules/workflow.md` 를 만든다 (`collect()` 이 항목이 배치된 문서만 만든다).
  paylab 픽스처에는 `workflow` 항목이 없어서 **이번 관통이 만든 Pack 에 workflow.md 가
  아예 없다** — 파일 셋(`CLAUDE.md`·`domain-refund.md`·`manifest.json`)뿐이다.
  즉 이번 바퀴에 만든 `progress` 명령을 **아무도 배우지 못한다.** Roadmap 은 영원히
  agent 보고 0건이고, 화면은 「아직 보고가 없다」로 멀쩡히 뜬다.
- **근거**: `.ci/walkthrough-pack/` 에 `.claude/rules/workflow.md` 없음 (이번 바퀴
  직접 확인 — `find .ci/walkthrough-pack -type f`) ·
  `packages/compiler/src/assemble.ts:47` `collect()` · `templates/index.ts:111` 의
  `workflow` 칸 `foot: () => [...PROGRESS_REPORT]`
- **정본**: `docs/SPEC.md` §4.3 · §4.1
- **고칠 방향**: **둘 중 하나만** 해라 (loop/PROMPT.md ④2-B).
  ① 「항상」을 지킨다 — `workflow` 문서를 **항목이 없어도** 만든다. 그러면 진행 보고
     문단 하나만 든 `workflow.md` 가 늘 나간다. ⚠ 그 파일의 `source_item_ids` 가
     비게 되는데 `ManifestFile.source_item_ids` 는 `.min(1)` 이다 (P7 — 근거 없는
     파일을 금지하는 자리다). 그러니 **이 문단이 왜 근거 없이 나가도 되는지**를
     계약에 명시해야 한다 (「제품이 넣는 사용법」은 팀 항목이 아니다).
  ② 문단을 `CLAUDE.md` 로 옮긴다 — CLAUDE.md 는 언제나 나가고 모든 세션이 읽는다.
     ⚠ 대신 12,000자 예산을 상시로 먹고, `relieveClaudeMd()` 가 옮길 수 있는 대상이
     하나 늘어난다.
  ⚠ 어느 쪽이든 **golden 이 빨개진다** — `TEMPLATE_VERSION` 을 올리고 왜 갱신했는지
  커밋 메시지에 적어라 (loop/PROMPT.md ③).
- **왜 이번 바퀴에 안 했나**: PLAN P2 셋째 행(GATE 2)의 완료 기준이 아니고, 위 ①은
  **P7 계약을 건드리는 결정**이라 한 바퀴에 둘을 만지면 실패 원인을 못 가린다.
- **🔴 결정 — ①을 골랐다** (`bc08125`): ②(CLAUDE.md 로 옮김)는 SPEC §4.3 을 뒤집고
  12,000자 예산을 상시로 먹는데, **CLAUDE.md 도 항목이 없으면 안 나가므로** 같은 고장이
  한 겹 아래에서 다시 난다. ①의 대가였던 `source_item_ids.min(1)` 은 **풀지 않고 좁혔다** —
  `packages/schema` 에 `PRODUCT_TEXT_PACK_FILES` 표를 두고 「이 경로만 근거 없이 나갈 수
  있다」로 바꿨다. 표 밖의 파일이 빈 근거로 오면 여전히 막힌다.
- **상태**: ✅ `bc08125` — `DocSpec.always` 한 칸 · 관통 publish 가 「workflow 항목 0개인데도
  workflow.md 가 나왔나 · 진행 보고 5줄이 다 있나」를 잰다. `TEMPLATE_VERSION` 1.0 → 1.1

### 44. `batch-draft` 응답을 서버가 **계약으로 내지 않는다**   [격차]
- **증상**: 이번 바퀴에 `ContextItemsBatchDraftResult` 를 계약으로 올렸고 **플러그인은
  그걸로 판다.** 그런데 라우트는 여전히 손으로 만든 객체를 `ctx.ok(...)` 로 낸다 —
  즉 계약이 **한쪽에서만** 강제된다. 서버가 칸 이름을 바꾸면 시험은 초록인데
  `upload-draft` 만 「서버 응답이 계약과 맞지 않는다」로 죽는다.
- **근거**: `apps/web/src/app/api/v1/projects/[id]/context-items/batch-draft/route.ts`
  의 `return ctx.ok({ accepted, rejected })` · `packages/schema/src/upload.ts` 의
  `ContextItemsBatchDraftResult` (이번 바퀴 추가)
- **정본**: `docs/SPEC.md` §5
- **고칠 방향**: 라우트가 낼 때 그 계약으로 한 번 파싱한다(`ctx.ok(Result.parse(...))`).
  ⚠ 응답 계약을 **표로** 올릴 거면 `API_REQUESTS` 옆에 `API_RESPONSES` 를 두고
  「표의 모든 줄이 실제로 어느 라우트에서 쓰인다」를 시험으로 잠가라 — 안 그러면
  응답 계약이 정확히 「정의만 있고 아무 일도 안 하는 것」이 된다.
- **상태**: 대기 (값싸다)

### 45. 훅이 쓰는 파일 이름 규칙이 **두 곳에 손으로 적혀 있다**   [격차]
- **증상**: `progress-<session>.json` 의 이름 규칙이 `src/cli/paths.ts` 의
  `progressMarkerFile()` 과 `scripts/stop.mjs` 의 `alreadyReported()` 에 **각각** 있다.
  훅은 번들이 아니라 `@contextops/schema` 도 `src/` 도 import 할 수 없어서다.
  지금은 `test/hooks.test.ts` 가 「CLI 가 쓴 파일을 훅이 찾는가」로 둘을 잇지만,
  **규칙이 갈리면 훅이 못 찾고 중복 보고를 한다** — 그건 근거 개수를 부풀려 P7 을
  거짓말로 만드는 자리다.
- **근거**: `plugin/contextops/src/cli/paths.ts` 의 `progressMarkerFile()` ·
  `plugin/contextops/scripts/stop.mjs` 의 `alreadyReported()` (`eaae9f5`)
- **정본**: `docs/SPEC.md` §8.6
- **고칠 방향**: 훅에도 「의존 없는 공용 조각」을 하나 두는 길이 있다
  (`scripts/hook-shared.mjs` — 훅끼리만 import). ⚠ 그러면 `tools/principles.ps1` 의
  P6 검사가 **hooks.json 이 가리키는 파일만** 세므로 그 조각이 검사를 안 받는다 —
  검사 대상을 「훅과 훅이 import 하는 것」으로 넓혀야 같이 잠긴다.
  지금은 시험 하나가 잇고 있으므로 급하지 않다.
- **상태**: 대기

### 46. 항목 없는 `workflow.md` 의 제목이 **내용과 어긋난다**   [격차]
- **증상**: 이번 바퀴부터 workflow 항목이 0개여도 `.claude/rules/workflow.md` 가 나간다.
  그런데 머리말이 `# 작업 절차`인데 본문은 **ContextOps 진행 보고 규칙 하나**뿐이다 —
  사람이 열면 「작업 절차라더니 왜 우리 도구 사용법만 있나」로 읽힌다. 팀 규칙으로
  배포할 만한 파일인가를 묻는 자리(loop/PROMPT.md ⑦ 3층)에서 걸린다.
- **근거**: `.ci/walkthrough-pack/.claude/rules/workflow.md` (이번 바퀴 직접 읽음 — 8줄) ·
  `packages/compiler/templates/index.ts` 의 `DOCS.workflow.head`
- **정본**: `docs/SPEC.md` §4.3
- **고칠 방향**: **FINDINGS 30 과 한 묶음이다** — 둘 다 `head` 한 줄이고 둘 다 golden 을
  깬다. 같이 하면 `TEMPLATE_VERSION` 을 한 번만 올린다. ⚠ 제목을 항목 유무로 갈라
  쓰지 마라(`slots` 가 비면 다른 제목) — 같은 파일이 저장소마다 다른 제목을 갖게 되고
  `always` 를 표 한 칸으로 만든 뜻이 없어진다.
- **상태**: 대기 (값싸다 · 30 과 같이)

### 47. 배포되는 **JSON Schema 가 P7 의 근거 규칙을 표현하지 못한다**   [격차]
- **증상**: `source_item_ids` 의 `.min(1)` 을 `PRODUCT_TEXT_PACK_FILES` 예외 표로 바꾸면서
  규칙이 Zod `.refine` 이 됐다. `z.toJSONSchema` 는 refine 을 **표현하지 못하고 조용히
  버린다** — 그래서 `plugin/contextops/schemas/manifest.json` 에서 `"minItems": 1` 이
  사라졌고 대신할 규칙이 들어가지 않았다. 그 JSON Schema 만으로 재면 **아무 경로나
  빈 `source_item_ids` 로 지나간다.**
- **근거**: `git show HEAD~1:plugin/contextops/schemas/manifest.json` 에는
  `"source_item_ids": {"minItems": 1, …}` · 지금은 `{"type":"array","items":…}` 뿐
  (이번 바퀴 직접 대조) · `packages/schema/src/manifest.ts` 의 `.refine`
- **정본**: `docs/SPEC.md` §3 (P7)
- **얼마나 급한가**: **런타임은 안 샌다.** 플러그인은 `Manifest.parse`(Zod)로 판다 —
  `schemas/*.json` 을 manifest 검증에 쓰는 코드는 0곳이다(`grep` 확인). 새는 것은
  「우리가 배포하는 계약 문서가 실제 계약보다 느슨하다」는 사실이다.
- **고칠 방향**: `toJsonSchema` 의 `override` 로 그 자리에 `anyOf`(비지 않거나 · 경로가
  예외 표에 있거나)를 손으로 넣는다. ⚠ 그러면 **JSON Schema 를 손으로 짜는 자리**가
  하나 생긴다 — 「Zod 정본과 일치한다」를 재는 `json-schema.test.ts` 가 그 자리에서는
  아무것도 못 재게 되므로, 예외를 넣었다는 사실 자체를 시험으로 잠가라.
- **상태**: 대기

### 36. `setup` 이 가리키는 **토큰 발급 화면이 없다**   [구멍]
- **증상**: `contextops setup` 은 「브라우저에서 로그인하고 **기기 토큰을 발급받아**
  붙여 넣어라」고 안내한다. 그런데 웹에 그 화면이 없다 — 토큰을 만드는 길은
  `POST /projects/{id}/tokens` 를 **손으로 부르는 것**뿐이다. 이번 바퀴의 관통도
  `node -e` 로 그 라우트를 직접 쳐서 토큰을 얻었다
  (`docs/evidence/2026-09-03-plugin/setup-new-repo.md`).
- **근거**: `apps/web/src/app` 에 tokens 화면 0개 (라우트는 있다) ·
  `plugin/contextops/src/cli/setup.ts` 의 ② 안내 문구 (`b85c2c8`)
- **정본**: `docs/SPEC.md` §8.3 · §9 (화면 9 「Sync·기기」)
- **고칠 방향**: 화면 9(기기 목록)가 주인이다 — 거기에 「기기 추가」 버튼과
  **발급 직후 한 번만 보이는 값**을 두고, 그 아래에 `contextops setup --api-origin …
  --project … --token … --device-id …` **한 줄을 통째로 복사**하게 해라.
  그러면 사람이 uuid 를 손으로 옮기지 않아도 되고 `device_id` 도 같이 온다
  (지금은 optional 이라 「이 기기만 끊기」가 안 된다).
  ⚠ 그 전에 CLI 에 콜백 서버를 만들지 마라 — 부를 화면이 없으면 죽은 코드다.
- **상태**: 대기 (P4 화면 9 가 주인)

### 37. ✅ 아무도 `.contextops/` 의 **ignore 규칙을 만들지 않는다**   [구멍]
- **증상**: SPEC §8.2 는 `cache/`·`backups/`·`pending-proposal.json` 을 「ignore」라고
  적는데, 그걸 **쓰는 코드가 0곳**이다. 그래서 `scan` 을 처음 돌린 사람은
  `.contextops/cache/scan.json` 을 그대로 커밋한다 — 그 파일은 기계마다 다르고
  매 스캔 바뀐다. 이번 바퀴의 새 레포 실험에서 실제로 그 상태가 됐다.
- **근거**: `grep -rn "gitignore" plugin/contextops/src` → 0건 (이번 바퀴 확인) ·
  `docs/SPEC.md` §8.2 표의 「ignore」 칸
- **정본**: `docs/SPEC.md` §8.2
- **고칠 방향**: `setup` 이 `<repo>/.contextops/.gitignore` 를 쓴다 (`cache/`·`backups/`·
  `pending-proposal.json` 세 줄). 폴더 안에 두면 **사용자의 루트 `.gitignore` 를 안 건드린다** —
  남의 파일을 고치지 않는 것이 이 제품의 습관이다. ⚠ P6 위반이 아니다: 훅이 아니라
  사람이 부른 `setup` 이 쓴다. 이미 있으면 덮지 마라.
- **상태**: ✅ `9c4d5d2` (P2 둘째 행과 같이 했다 — 예상대로 값이 두 배였다)
  정본은 `plugin/contextops/src/cli/paths.ts` 의 `IGNORED_LOCAL_PATHS` 한 줄이고,
  쓰는 함수는 `sync.ts` 의 `ensureLocalGitignore()` 하나다. **`setup` 과 `sync` 가 같이
  부른다** — `setup` 은 첫 `scan` 보다 앞이라서, `sync` 는 `backups/` 를 **만드는 순간**이라서.
  이미 있으면 손대지 않는다 (사람이 줄을 더했을 수 있다). `manifest.json` 은 **일부러
  목록에 없다** — 무시하면 팀이 적용 버전을 못 공유한다. 시험이 그 셋을 잠근다
  (`test/sync.test.ts`: 규칙 줄이 `IGNORED_LOCAL_PATHS` 와 정확히 같고 manifest 는 없다).

### 38. SPEC §8.3 은 `validate` 가 `schemas/*.json` 을 쓴다는데 코드는 **Zod 정본**으로 판다   [격차]
- **증상**: 구현은 번들에 들어간 Zod 로 검증한다. JSON Schema 로는 `.refine()` 을 옮길 수
  없어서다 — `ProposalItem` 의 「add 는 draft 가, update 는 target_item_id 가 필요하다」가
  통째로 사라진다. 약하게 통과시키고 서버에서 400 을 받으면 사람은 이유를 모른다.
  `schemas/*.json` 은 **init Skill 이 「이 모양으로 써라」고 지목하는 작성 안내서**로 남는다.
- **근거**: `plugin/contextops/src/cli/validate.ts` 머리 주석 ·
  `packages/schema/src/json-schema.ts` 머리 주석 (`b85c2c8`)
- **정본**: `docs/SPEC.md` §8.3 · §8.4
- **고칠 방향**: §8.3 의 `validate` 칸을 「같은 Zod 계약으로 로컬 검증(번들 포함),
  오류 위치 출력」으로 고치고, §8.4 3단계의 `schemas/*.json` 은 **작성 안내서**라고 한 줄
  덧붙여라. 계약은 여전히 한 벌이다 — 둘 다 같은 Zod 에서 나온다.
- **상태**: ✅ `9179ffc` (둘 다 고쳤다)

### 39. SPEC §8.3 의 exit 표에 「잘못 쓴 명령」의 자리가 없다   [격차]
- **증상**: 표의 코드는 0·1·2·10·20·30 이다. 모르는 명령·모르는 플래그·인자 없음에
  맞는 것이 없어서 `EXIT.USAGE = 64`(sysexits `EX_USAGE`)를 **목록 끝에** 더했다.
  없으면 그런 실수가 0(성공)이나 30(설정 문제)으로 나가고, 둘 다 거짓말이다.
  (에러 코드에 `INTERNAL` 을 더한 FINDINGS 21 과 같은 모양이다)
- **근거**: `plugin/contextops/src/cli/exit.ts` · `test/validate.test.ts`
  「파일이 없으면 exit 64 — 계약 위반과 구별한다」 (`b85c2c8`)
- **정본**: `docs/SPEC.md` §8.3
- **고칠 방향**: §8.3 표 아래에 「64 = 잘못된 사용(명령·플래그·인자)」 한 줄. 값은
  직렬화된다 — 순서를 바꾸지 마라.
- **상태**: ✅ `9179ffc` — 같은 바퀴에 게이트도 올렸다. `test/commands.test.ts` 가
  SPEC §8.3 표의 명령 이름과 `COMMANDS` 표를 대조하고, 도움말에 `EXIT` 표의 값이
  전부 있는지 잰다 (문서에만 있는 명령 위에 다음 바퀴가 짓지 않게).

### 40. `sync` 는 **변경 파일만** 받지 않고 Manifest 의 파일을 전부 받는다   [격차]
- **증상**: SPEC §8.5 4단계는 「**변경 파일만** `cache/<semver>/` 로 다운로드」다.
  코드는 `official.files` 를 **전부** 받는다. 파일 2개인 지금은 차이가 안 보이지만,
  Manifest 상한은 50개다 — 한 파일이 바뀌어도 50번 받는다.
- **근거**: `plugin/contextops/src/cli/sync.ts` ④단계 `for (const file of official.files)` ·
  관통 `sync` 단계의 「Pack 파일이 바이트 그대로 놓였다 — 2/2」 (`.ci/walkthrough-sync.json`)
- **정본**: `docs/SPEC.md` §8.5 4단계
- **왜 지금 그렇게 뒀나**: 「무엇이 변경 파일인가」의 답이 두 개다 — ①로컬 해시가 다른 것
  ②공식 Manifest 에서 항목이 바뀐 것. 전부 받으면 그 판단이 필요 없고, ⑦(post-verify)이
  **모든 파일**을 대조하므로 반만 적용된 상태가 원리적으로 안 생긴다. 적게 받는 최적화가
  「덜 검사하는」 최적화가 되기 쉬운 자리다.
- **고칠 방향**: 받을 목록을 `judge()` 가 이미 계산하는 `modified`·`missing` + 「공식과
  로컬 Manifest 의 sha256 이 다른 파일」로 좁힌다. ⚠ 좁히면 **⑦이 여전히 전부를
  대조하는지** 확인해라 — 안 받은 파일을 검사에서도 빼면 그때부터 반만 적용된 Pack 이
  `applied` 로 보고된다. 시험은 「파일 3개 중 1개만 바뀐 Manifest → 요청이 1건」이다.
- **상태**: 대기 (파일 50개짜리 Pack 이 실제로 생길 때가 값이 나는 때다)

### 41. SPEC §8.5 1단계의 「manifest 서명(sha256) 확인」이 preflight 에 없다   [격차]
- **증상**: preflight 는 project.json·토큰·디스크 쓰기 가능 셋만 본다. 「manifest 서명」에
  해당하는 코드가 없다 — Manifest 스키마에 서명 칸 자체가 없고(`packages/schema/src/manifest.ts`),
  로컬 파일의 해시 대조는 3단계(`judge()`)가 한다.
- **근거**: `plugin/contextops/src/cli/sync.ts` 의 `preflight()` · `Manifest` 스키마에
  `signature` 없음 (이번 바퀴 확인)
- **정본**: `docs/SPEC.md` §8.5 1단계
- **고칠 방향**: 문서 한 줄이다 — 1단계에서 「manifest 서명(sha256)」을 지우고
  「로컬 manifest.json 이 계약과 맞나」로 바꾼다 (`readLocalManifest` 가 하는 일이다).
  ⚠ 진짜 서명(발행자 키)을 넣을 생각이면 그건 §2.1·§3 을 건드리는 별개의 일이다 —
  여기 한 줄로 있으면 「이미 있다」고 오해된다.
- **상태**: ✅ `9179ffc` (「발행자 키 서명은 아직 없다」를 §8.5 1단계에 명시했다)

### 42. P6 의 원칙 문장과 검증 칸이 다르고, §8.6 의 `stop.mjs` 는 **파일을 쓴다**   [격차]
- **증상**: SPEC §0.1 P6 의 문장은 「**Hook 은** 파일을 변경하지 않는다」인데 검증 칸은
  「`session-start.mjs` 에 fs write 없음」 — 훅 **하나**만 지목한다. 그리고 §8.6 의
  `stop.mjs` 는 `pending-proposal.json` 에 저장한다고 적혀 있다. 즉 **정본 안에서
  P6 의 범위가 갈려 있다.** 다음 행(P2 셋째)이 `stop.mjs` 를 만드는 순간 부딪힌다.
- **근거**: `docs/SPEC.md:23` (P6 행) · `docs/SPEC.md` §8.6 `stop.mjs` 설명 ·
  `tools/principles.ps1` 의 P6 검사는 이번 바퀴부터 **hooks.json 이 가리키는 것 전부**를
  센다 (`9c4d5d2`) — `stop.mjs` 를 그 표에 적으면 **CI 가 빨개진다.** 일부러 그렇게 뒀다.
- **정본**: `docs/SPEC.md` §0.1 P6 · §8.6
- **고칠 방향**: **먼저 결정하고, SPEC 한 줄과 게이트를 같이** 바꿔라. 둘 중 하나다:
  ① `.contextops/cache/` **안(= 우리가 만든 파일)만** 예외로 명문화하고 게이트를 그 경로로
     좁힌다 — 「사용자 저장소의 파일」과 「우리 캐시」는 다른 것이라는 입장이다.
     ⚠ 그러면 P6 의 한 줄 요약을 「Hook 은 **사용자 파일을** 변경하지 않는다」로 고쳐야
     한다. 지금 문장 그대로 두고 예외를 코드에만 두면 심사에서 첫 질문에 걸린다.
  ② 초안을 파일이 아니라 **서버**에 두고 SessionStart 가 읽어 온다 — P6 을 안 건드린다.
     ⚠ 대신 Stop 훅이 네트워크를 타고, 세션 종료가 2초 늦어질 수 있다.
- **왜 게이트를 먼저 좁히지 않았나**: 좁히면 「지금 지켜지는 것」이 조용히 약해진다.
  빨개지는 쪽으로 두면 다음 사람이 **결정을 하고** 들어간다 (게이트는 문서보다 강하다).
- **상태**: ✅ `eaae9f5` — **①을 골랐고, 예외를 코드에 숨기지 않고 표로 올렸다.**
  새 P6: 「Hook 은 **사용자의 파일**을 변경하지 않는다. 쓸 수 있는 자리는 `.contextops/` 의
  git-ignore 경로뿐이고, 훅마다 `hooks/hooks.json` 의 `_writes` 에 **선언한** 경로로 한정된다.」
  ②(서버에 두기)를 안 고른 이유: 힌트 하나 때문에 세션 종료가 네트워크를 기다린다.
  그리고 우리가 쓰는 경로는 우리가 만든 `.contextops/.gitignore` 안이라 **git 이 그 변화를
  아예 못 본다** — 사용자가 커밋·리뷰하는 파일은 한 바이트도 안 바뀐다. 그게 P6 이
  지키려던 것 자체다. 게이트 둘을 그 경계에 맞췄고 **둘 다 갈리는 것을 봤다**:
  선언을 지우면 `principles.ps1` FAIL · 선언을 `CLAUDE.md` 로 바꿔도 FAIL ·
  `test/hooks.test.ts` 는 훅을 돌린 뒤 **바뀐 경로 집합이 선언과 정확히 같은지** 본다.

### 33. 화면 5 의 「미발행 변경 N건」과 semver 추천을 **계산할 문이 없다**   [구멍]
- **증상**: DESIGN_BRIEF §4 화면 5 는 상단에 「미발행 변경 7건」을, 발행 모달에
  「minor 추천: 항목 추가 5, 변경 2」를 적는다. 그런데 **지금의 항목들과 공식 버전의
  snapshot 을 비교할 API 가 없다** — `GET /versions` 는 `snapshot` 을 일부러 안 싣고
  (목록 한 번이 Pack 전체를 나르지 않게), 항목 응답에는 「마지막 발행 이후 바뀌었나」가 없다.
- **근거**: `apps/web/src/app/api/v1/projects/[id]/versions/route.ts` 의 select 에 snapshot 없음 ·
  SPEC §6 「서버가 Proposal 내용으로 추천」은 구현 0곳 (`grep -rn "recommend" apps/web/src` → 0건)
- **정본**: `docs/SPEC.md` §6 · `docs/DESIGN_BRIEF.md` §4 화면 5
- **지금 한 것**: 화면은 **지어내지 않는다.** 「항목 6개」와 공식 버전·snapshot 해시만
  내고, 발행 모달은 세 후보를 SPEC §6 의 기준과 **나란히** 보여 주고 사람이 고른다
  (`lib/web/semver.ts` 의 주석). 눈으로 확인했다: `docs/evidence/2026-09-03-screens/s5-context.png`
- **고칠 방향**: 주인은 **P3/P4** 다 (제안이 쌓여야 추천할 내용이 생긴다). 문을 만들면
  `SEMVER_RULE` 표의 기본 선택만 바꾸면 된다 — 표는 그대로 쓴다
- **상태**: 대기 (P3·P4 가 주인 · 지금 열지 마라)

### 34. `pack_files.source_map` 을 **내보내는 문이 없다**   [구멍]
- **증상**: 발행 트랜잭션이 `pack_files.source_map`(줄 범위 → 항목 ID)을 저장하는데,
  그걸 **읽는 라우트가 0곳**이다. 화면 7 의 역추적은 본문에 박힌 `<!-- ctx:… -->` 태그를
  되읽어서 한다 (`traceLines`). 즉 저장된 칸이 아무 일도 안 한다.
- **근거**: `grep -rn "sourceMap" apps/web/src` → `lib/api/publish.ts` 의 INSERT 한 곳뿐
  (이번 바퀴 직접 확인) · 화면 7 은 `@contextops/compiler/tag` 로 판다
- **정본**: `docs/SPEC.md` §2 · §4
- **고칠 방향**: **둘 중 하나만** 해라 (loop/PROMPT.md ④2-B). ① 태그 파싱을 없애고
  `GET …/packs/{semver}/files/{path}/map` 을 만들어 화면이 그걸 읽게 하거나,
  ② `source_map` 을 지우고 태그를 정본으로 선언한다.
  ⚠ 지금은 ②가 유력하다 — 태그는 **플러그인이 받는 바이트 안에** 있어서 오프라인에서도
  역추적이 되고, `source_map` 은 서버에 물어봐야만 산다. 지우기 전에 SPEC §2 표에서도 지워라.
- **상태**: 대기

### 35. 화면에서 항목을 **새로 만들 수 없다** — 표에서 보고 고칠 수만 있다   [구멍]
- **증상**: `PATCH /context-items/{id}` 는 있는데 **단건 생성 문이 없다.**
  항목이 들어오는 길은 `POST …/context-items/batch-draft`(플러그인·스크립트)와
  승인된 제안뿐이다. 그래서 웹만 쓰는 팀장은 **문서를 올리거나 질문에 답하는 길**로만
  항목을 만들 수 있는데, 그 화면(3·4)이 아직 없다.
- **근거**: 라우트 28개에 `POST /projects/{id}/context-items` 없음 (이번 바퀴 확인) ·
  화면 5 의 빈 상태 문구가 「가져오기에서 문서를 올리거나 질문에 답해보세요」인데
  **그 화면이 없다** — 갈 곳 없는 안내다
- **정본**: `docs/SPEC.md` §5 · §9 화면 3·4
- **고칠 방향**: 주인은 **PLAN P3 둘째 행**(웹 화면 3·4)이다. 거기서 「문서 붙여넣기」와
  「질문에 답하기」가 생기면 이 구멍이 닫힌다. ⚠ 그 전에 화면 5 에 단건 생성 폼을
  급히 만들지 마라 — 구조화(§7.1)를 안 거친 항목이 들어오는 둘째 문이 생긴다
- **상태**: 대기 (P3 둘째 행이 주인)

### 28. 충돌 행을 **만드는 코드가 0곳**이다 — 충돌 화면 전체가 빈 채로 초록이다   [구멍]
- **증상**: `GET /projects/{id}/conflicts` 와 `POST /conflicts/{id}/resolve` 는 있는데
  `conflicts` 에 INSERT 하는 곳이 없다. 그래서 `CONFLICT_KINDS` 5종 · `CONFLICT_CHOICES`
  4종 · `RESOLUTION_OUTCOME` 표 · `GET /roadmap` 의 `conflicts` 수가 **전부 항상 0** 이다.
  시험은 DB 에 직접 행을 넣어서 재고 있어서, 이 상태로도 영원히 초록이다.
- **근거**: `grep -rn "insert(conflicts)" apps/web/src` → **0건** (이번 바퀴 직접 확인) ·
  관통 산출물의 roadmap 응답에서 `conflicts: 0` (`.ci/walkthrough-publish.json`)
- **정본**: `docs/SPEC.md` §7.2 (충돌 탐지) · §5
- **고칠 방향**: **주인은 PLAN P3 첫 행**(`detectConflicts`)이다. 거기서 만들게 배선하고
  「탐지가 돌면 충돌 수가 0이 아니다」를 관통에서 잠가라. 지금 손으로 넣는 문을 만들지 마라 —
  소비처 없는 라우트가 하나 더 생긴다. ⚠ FINDINGS 25(충돌→항목 상태)와 **같은 행**이다.
  🔴 **담을 칸은 이제 있다 (`8cde1f5` · FINDINGS 54)** — 남은 것은 `detectConflicts()` 의
  결과를 `conflicts` 행으로 옮기는 코드와, 그걸 부르는 job 자리다.
  ⚠ **INSERT 를 손으로 채우지 마라.** 어느 칸이 차는지는 `CONFLICT_KIND_RULES` 가
  정하고 DB CHECK 이 막는다 — 그 표를 읽어서 채우면 종류가 늘어도 따라온다
  (본보기는 `apps/web/test/api-routes.test.ts` 의 `seedConflict()` 다).
- **상태**: ✅ `a1f0a79` — **닫혔다.** `apps/web/src/lib/ai/job.ts` 의 러너 둘이
  `conflicts` 에 INSERT 하는 유일한 자리다: §7.2 의 탐지 결과 넷은 항목 카드로,
  §7.1 의 `open_questions` 는 `kind:'open_question'` 인 질문 카드로 들어간다.
  어느 칸이 차는지는 새 문 `conflictRow()`(`lib/api/conflict.ts`)가
  `CONFLICT_KIND_RULES` 를 읽어 정하고 DB CHECK 이 막는다 — 손으로 적은 곳이 없다.
  시험이 「탐지 종류 넷을 넣으면 행 넷이 생기고 종류마다 표가 말한 칸만 찬다」와
  「`GET /conflicts` 가 그 행을 그대로 읽는다」를 잰다 (`test/ai-job.test.ts`).
  ⚠ **`GET /roadmap` 의 수는 아직 프로젝트 전체 수다** — 그건 FINDINGS 29 다.

### 29. `roadmap` 의 `conflicts` 는 마일스톤별이 아니라 **프로젝트 전체 수**다   [구멍]
- **증상**: SPEC §5 의 roadmap 응답은 마일스톤 줄마다 `conflicts` 를 갖는데, 충돌 행에
  **마일스톤을 가리키는 칸이 없다.** 그래서 모든 줄이 같은 숫자(프로젝트의 열린 충돌 수)를
  달고 나간다 — 마일스톤이 셋이면 화면에 같은 숫자가 세 번 뜬다.
- **근거**: `apps/web/src/app/api/v1/projects/[id]/roadmap/route.ts` 의 `openConflicts` ·
  `apps/web/src/db/schema.ts` `conflicts` 에 milestone 칸 없음 (`e5f61c8`)
- **정본**: `docs/SPEC.md` §2 · §5 · §9(화면 8)
- **고칠 방향**: FINDINGS 25 와 **같이** 정해라 — 충돌이 무엇을 가리키는지(항목? 마일스톤?)를
  §7.2 가 정할 때 한 번에 결정한다. 지금 `relates_to` 로 억지로 이으면 그때 다시 짠다.
  🔴 **이번 바퀴에 정해졌고, 답은 「항목」이다 (`8cde1f5`).** 그래서 마일스톤은 여전히
  **직접 이어져 있지 않다** — 충돌 → 항목까지만 간다. 남는 길: 가리키는 항목이
  `type='roadmap'` 이면 그 항목의 마일스톤으로 세고, 아니면 어느 줄에도 안 붙인다.
  ⚠ 그러면 대부분의 충돌이 어느 마일스톤에도 안 붙는다 — **그 사실을 화면이 말해야
  한다.** 「마일스톤에 안 붙은 충돌 N건」을 로드맵 위에 한 줄로 내라.
  충돌 행에 milestone 칸을 새로 더하는 길은 **마지막에 봐라** (§7.2 가 마일스톤을
  모른다 — 모델에게 안 싣는다).

### 30. domain Pack 파일의 제목이 「# 도메인」이다 — 어느 도메인인지 본문에 없다   [격차]
- ⚠ **9바퀴에 화면에서 다시 봤다.** Pack Explorer 로 `.claude/rules/domain-refund.md` 를
  열면 첫 줄이 그냥 `# 도메인` 이다 (`docs/evidence/2026-09-03-screens/` 첫 판 캡처).
  파일 이름을 가린 채 읽으면 어느 도메인 규칙인지 알 수 없다 — 그게 agent 가 읽는 조건이다.
- **증상**: 관통이 만든 `.claude/rules/domain-refund.md` 의 첫 줄이 `# 도메인` 이다.
  도메인 이름은 **파일 이름에만** 있다. 이 파일은 agent 가 통째로 읽는 것이라, 여러
  도메인 파일이 한 맥락에 들어오면 **어느 규칙이 어느 도메인 것인지 구별할 수 없다.**
  `DocVars.title` 에 도메인 이름이 이미 들어와 있는데 `domain` 템플릿의 `head` 가 안 읽는다
  (`scoped` 템플릿은 읽는다) — 「값은 있는데 아무 일도 안 하는」 자리다.
- **근거**: `.ci/walkthrough-pack/.claude/rules/domain-refund.md` 첫 줄 (재생성:
  `pnpm --filter web exec tsx scripts/walkthrough-publish.ts`) ·
  `packages/compiler/templates/index.ts:104` (`head: (v) => ['# 도메인', notice(v)]`) vs
  `:131` (scoped 는 `# 경로 규칙 — ${v.title}`)
- **정본**: `docs/SPEC.md` §4.1 · §4.2
- **고칠 방향**: `head` 를 `# 도메인 — ${v.title}` 로 고친다. ⚠ **golden 이 빨개진다** —
  `TEMPLATE_VERSION` 을 올리고 expected 를 갱신한 이유를 커밋 메시지에 적어라
  (loop/PROMPT.md ⑤). 옆 줄의 주석(「제목은 절이 갖는다」)은 `domain` **항목**이 있을 때만
  맞는 말이다. domain scope 정책만 있고 domain 항목이 없는 프로젝트가 이 고장을 만든다.
- **상태**: 대기

### 27. `unique(project_id, snapshot_hash)` 는 **절대 걸리지 않는다**   [격차]
- **증상**: SPEC §2 는 `context_versions` 에 `unique(project_id, snapshot_hash)` 를 두어
  「같은 내용을 두 버전으로 발행하지 않는다」를 말하는 것처럼 보인다. 그런데
  `snapshot_hash` 는 `context_version`(=semver)을 **포함해서** 계산된다 — 번호만 올리면
  언제나 다른 해시다. 즉 이 제약은 `unique(project_id, semver)` 의 약한 메아리이고,
  **내용이 하나도 안 바뀐 발행을 막지 못한다.** (이번 바퀴에 그 검사를 넣었다가 시험이
  「막힐 줄 알았는데 201」로 잡아내서 도로 뺐다 — 넣었으면 죽은 코드였다)
- **근거**: `packages/compiler/src/hash.ts` `snapshotHash` 가 `context_version` 을 넣는다 ·
  `apps/web/src/lib/api/publish.ts` 의 4단계 앞 주석 · `test/api-publish.test.ts`
  「같은 semver 를 두 번 발행할 수 없다」 옆의 ⚠ 주석 (`e5f61c8`)
- **정본**: `docs/SPEC.md` §2 · §3(manifest_hash) · §4.1 7단계
- **고칠 방향**: **셋 중 하나를 골라라. 손으로 두 번째 해시를 계산하지 마라** — 해시 규칙이
  두 곳이 되는 것이 P4 가 제일 싫어하는 모양이다.
  ① `snapshot_hash` 에서 `context_version` 을 뺀다 (「무엇을 컴파일했나의 지문」이라는
     그 함수의 주석과 맞는다). ⚠ golden 전부 빨개진다 — 템플릿이 아니라 **해시** 변경이라
     `COMPILER_VERSION` 을 올려라
  ② SPEC §2 에서 그 제약을 지우고 「내용 중복 발행은 막지 않는다」를 한 줄로 적는다
  ③ Manifest 의 `manifest_hash` 로 막는다 (파일 해시만 보므로 semver 를 안 탄다) —
     단 Pack 머리말에 `snapshot:` 앞 8자가 들어가서 이것도 갈린다. **확인하고 골라라**
- **상태**: 대기

### 31. `REVISION_ORIGINS` 의 `doc` 을 만드는 곳이 0곳이다   [구멍]
- **🔴 16바퀴에 값이 올랐다**: §7.2 의 `doc_vs_code` 는 「origin=doc 인 항목과 origin=code 인
  항목이 다른 말을 한다」로 정의된다 (`CONFLICT_KIND_RULES`). `doc` 을 만드는 곳이
  0곳이면 **그 종류는 영원히 0건**이고, 탐지가 도는데도 카드가 안 나오는 이유를
  아무도 못 찾는다. §7.1 의 초안이 항목이 될 때 `doc` 을 찍는 것이 그 자리다.
- **증상**: 4종 중 셋은 이번 바퀴에 전부 살았다 — `code`(batch-draft) · `manual`(PATCH·
  질문 답변) · `proposal`(발행 트랜잭션). **`doc` 만 만드는 코드가 없다.**
- **근거**: `grep -rn "origin: '" apps/web/src packages` → `manual` 2 · `code` 1 ·
  `proposal` 1 · **`doc` 0** (이번 바퀴 직접 확인)
- **정본**: `docs/SPEC.md` §2 · §7.1
- **고칠 방향**: **주인은 PLAN P3 첫 행**(`structureDocument`)이다. 문서에서 구조화된 항목의
  개정이 `doc` 이다. 그 행에서 배선하고 「문서에서 온 항목과 scan 에서 온 항목의 origin 이
  다르다」를 시험으로 잠가라. 지금 억지로 만들지 마라.
- **상태**: 대기 (P3 첫 행이 주인 · 지금 고치지 마라)

### 32. SPEC §2.1 이 가리키는 「§6.5」가 SPEC 에 없다   [격차]
- **증상**: §2.1 4단계가 「semver는 요청값, 추천값은 §6.5」라고 적는데 **§6 에는 하위 절이
  없다.** 그래서 「서버가 Proposal 내용으로 semver 를 추천한다」(§6 첫 줄)를 구현하려는
  다음 사람이 읽을 정본이 없다. 이번 바퀴는 추천을 만들지 않았다 — 없는 § 을 근거로
  숫자를 지어내면 그게 「없는 것 위에 짓는」 것이다.
- **근거**: `docs/SPEC.md` §2.1 4단계 · §6 전체 (하위 절 없음) — 이번 바퀴 직접 확인
- **정본**: `docs/SPEC.md` §6
- **고칠 방향**: §6 에 「6.1 semver 추천 규칙」을 한 절 적는다 — 제안 항목에
  `deprecate` 가 있으면 major, `add`/`update` 가 있으면 minor, 설명만 바뀌면 수정 자리.
  적은 뒤에 `POST /versions/publish` 응답에 `recommended_semver` 를 더할지 정해라.
  (owner 가 조정한다고 §6 이 적으므로 **강제하지는 않는다**)
- **상태**: 대기

### 20. SPEC §5 의 콜론 경로(`:batch-draft`·`:resolve`)는 파일 시스템에 못 만든다   [격차]
- **증상**: SPEC §5 는 `POST /projects/{id}/context-items:batch-draft` ·
  `POST /conflicts/{id}:resolve` · `POST /proposals/{id}:submit` 처럼 콜론을 쓴다.
  App Router 의 경로는 **폴더 이름**이고 **Windows 는 파일 이름에 `:` 를 못 쓴다.**
  코드는 `/context-items/batch-draft` · `/conflicts/{id}/resolve` 로 갔다.
- **근거**: `apps/web/src/app/api/v1/…` 트리 · `next build` 산출 목록 (`0a370d8`)
- **정본**: `docs/SPEC.md` §5
- **고칠 방향**: §5 표의 콜론을 전부 경로 구간으로 고친다. **코드를 되돌리지 마라** —
  되돌릴 방법이 없다. 아직 안 만든 것들(`:submit`·`:approve`·`:reject`·`:publish`·
  `:confirm`)도 같이 고쳐라 — 그래야 API 2군이 두 번 고민하지 않는다.
- **상태**: ✅ `e5f61c8` — §5 의 콜론 7군데를 경로 구간으로 고쳤고(표 5줄 + §3.1 한 줄 +
  §13 WBS 한 줄), §5 머리에 「되살리지 마라」를 두 줄로 남겼다. 같은 바퀴가 만든 API 2군은
  처음부터 `/versions/publish`·`/proposals/{id}/submit` 로 갔다.

### 21. SPEC §5 의 에러 코드가 9종인데 코드는 10종이다 (`INTERNAL` 을 더했다)   [격차]
- **증상**: 잡히지 않은 예외도 `{error:{code,…}}` 봉투로 나가야 하는데, SPEC 의 아홉 중
  거기에 맞는 코드가 없다. `COMPILE_FAILED` 로 덮으면 거짓말이 된다. `INTERNAL`(500)을
  **목록 끝에** 더했다.
- **근거**: `packages/schema/src/api.ts` `ERROR_CODES` · `apps/web/src/lib/api/route.ts`
  `toApiError` 의 마지막 갈래 (`0a370d8`)
- **정본**: `docs/SPEC.md` §5
- **고칠 방향**: §5 의 나열에 `INTERNAL` 을 **끝에** 더한다. 값은 직렬화되므로 순서를
  바꾸지 마라. 「스택·본문은 절대 싣지 않는다」도 한 줄로 남겨라.
- **상태**: 대기

### 22. SPEC §5 의 `patch` 필드를 코드는 `changes` 라고 부른다   [격차]
- **증상**: 항목 부분 갱신의 body 가 SPEC 에서는 `{revision, patch}` 인데 코드는
  `{revision, changes}` 다. 이유는 P1 게이트(`tools/principles.ps1`)가 그 단어를
  `packages/schema/src` 안에서 금지어로 세기 때문이다 — 그 단어는 「코드의 변경분」을
  뜻하고, 그걸 서버가 받지 않는다는 게 정확히 P1 이다.
- **근거**: `packages/schema/src/api.ts` `ContextItemUpdate` · `tools/principles.ps1`
  의 `$p1Banned` (`0a370d8`)
- **정본**: `docs/SPEC.md` §5
- **고칠 방향**: §5 의 그 칸을 `changes` 로 고친다. **게이트에 예외를 파지 마라** —
  무딘 게이트가 우회할 구멍이 없다 (CLAUDE.md). 이름 하나 바꾸는 게 훨씬 싸다.
  ⚠ HTTP 메서드 이름 자체는 그대로다. 금지어는 `packages/schema/src` 안에서만 센다.
- **상태**: 대기

### 23. `context_items` 에 `public_id` 를 더했다 — SPEC §2 는 uuid 하나뿐이었다   [격차]
- **증상**: SPEC §3 의 `ItemId` 는 `item_<slug>` 인데 SPEC §2 의 `context_items.id` 는
  uuid 다. 둘을 같은 것으로 두면 **Pack 의 역추적 태그(`ctx:{id}`)에 uuid 가 박혀서**
  사람이 원문까지 못 간다 (P7 은 「사람이 간다」는 주장이다). uuid PK 는 FK 로 두고
  `public_id text`(프로젝트 안에서 유일)를 따로 뒀다.
  같은 바퀴에 SPEC §2 가 「필수만 적는다」라서 빠져 있던 것들도 더했다 —
  `context_item_revisions.{title,body,tags,valid_from,valid_until}`(없으면 `ContextItem`
  의 절반이 저장될 자리가 없다) · `devices.expires_at`(§11 「만료 90일」의 자리) ·
  `repos.{last_scan,last_scan_at}`(`scan_summary` 가 버려지지 않게).
- **근거**: `apps/web/drizzle/0001_far_doctor_spectrum.sql` · `apps/web/src/db/schema.ts` (`0a370d8`)
- **정본**: `docs/SPEC.md` §2 · §3
- **고칠 방향**: §2 의 `context_items` 줄에 `public_id`(+`unique(project_id,public_id)`)를,
  `context_item_revisions`·`devices`·`repos` 줄에 위 컬럼들을 적는다.
- **상태**: 대기

### 24. `scan_summary` 는 저장되지만 아직 아무도 **읽지** 않는다   [구멍]
- **증상**: `batch-draft` 가 `repos.last_scan` 에 넣는 데까지는 왔다(시험으로 잠갔다).
  하지만 그 값을 읽는 코드가 아직 0곳이다 — 「쓰기만 하고 읽지 않는」 절반 상태다.
- **근거**: `grep -rn "lastScan" apps packages` → 스키마 1 + 라우트 1 + 시험 1 (이번 바퀴)
- **정본**: `docs/SPEC.md` §8.3 · §7.1
- **고칠 방향**: **주인은 PLAN P3 둘째 행(화면 3 가져오기)**이다. 그 행에서 마지막 scan
  요약을 화면에 띄우고 「값을 바꾸면 화면이 달라진다」를 잠근다. 지금 읽는 곳을 억지로
  만들지 마라 — 소비처 없는 표가 하나 더 생긴다.
- **상태**: 대기 (P3 둘째 행이 주인 · 지금 고치지 마라)

### 25. 충돌 해소가 **항목 상태를 갱신하지 않는다**   [구멍]
- **증상**: SPEC §5 는 충돌 해소를 「→ 항목 상태 갱신」이라고 적는데, 구현은 결정만
  기록한다(`status` + `resolution{choice,note}`). 충돌이 **어느 항목**을 가리키는지 알
  방법이 없어서다 — DB 의 `a_ref`/`b_ref` 는 `SourceRef` 이고, 항목 ID 를 담는 것은
  §7.2 의 출력(`a_item_id`·`b_item_id`)이다. **SPEC 안에서 갈렸다.**
- **근거**: `apps/web/src/app/api/v1/conflicts/[id]/resolve/route.ts` ·
  `docs/SPEC.md` §2 (`a_ref jsonb`) vs §7.2 (`a_item_id`)
- **정본**: `docs/SPEC.md` §2 · §5 · §7.2
- **고칠 방향**: **주인은 PLAN P3 첫 행(§7.2 충돌 탐지)**이다. 그때 `conflicts` 에
  `a_item_id`·`b_item_id` 를 둘지, `a_ref` 에 「항목」 종류를 더할지 **먼저 정하고**
  §2 와 §7.2 를 같게 만든 다음, `choice` 가 항목 상태를 바꾸게 배선한다.
  고른 값은 이미 `resolution.choice` 에 남아 있어서 그때 그대로 적용할 수 있다.
  🔴 **막고 있던 것이 없어졌다 (`8cde1f5`)** — `conflicts.a_item_id`·`b_item_id` 가
  생겨서 「어느 항목인가」에 이제 답할 수 있다. 남은 것은 `choice` → 항목 상태의 표
  하나다 (`RESOLUTION_OUTCOME` 옆이 그 자리다).
- **상태**: 대기 (배선만 남았다 · P3 둘째 행)

### 26. `POST /documents` 가 zip 도 구조화 job 도 아직 안 한다   [구멍]
- **증상**: SPEC §5 는 「multipart(zip) 또는 {title, kind, content} → document + 구조화
  job 시작 (§7.1)」인데, 구현은 JSON 한 쪽뿐이고 job 은 안 건다.
  **일부러 안 걸었다** — 없는 job 을 「대기 중」이라고 응답하면 화면이 영원히 기다린다.
- **근거**: `apps/web/src/app/api/v1/projects/[id]/documents/route.ts` 의 주석 (`0a370d8`)
- **정본**: `docs/SPEC.md` §5 · §7.1 · §11 (zip 상한)
- **고칠 방향**: 구조화 job 은 **P3 첫 행**이 주인이다. zip 업로드는 경로 검사(`..`·절대경로·
  심볼릭)와 파일 2,000개·20MB 상한(SPEC §11)이 **같이** 와야 한다 — 반쯤 검사하는 zip
  경로를 여는 것이 제일 나쁘다. 그 몫을 어느 행이 가질지 정해서 여기 적어라.
- **상태**: 절반 ✅ `a1f0a79` — **구조화 job 은 이제 건다** (FINDINGS 52).
  **남은 절반은 zip 뿐이다.** 그 몫은 여전히 주인이 정해지지 않았다 (SPEC §11 의 상한과
  같이 와야 한다).

### 16. `SYNC_STATUSES` 의 `unknown` 은 아직 아무도 만들지 않는다   [구멍]
- **증상**: 5종 중 `unknown` 은 **보고가 없을 때 서버가 매기는 값**인데, 그 「서버」가
  아직 없다. DB enum 에는 일부러 안 넣었고(`REPORTABLE_SYNC_STATUSES` 4종만 · `389c7f2`),
  그래서 지금 `unknown` 을 **만드는 코드가 0곳**이다. 잠근 시험도 「4종 = 5종 − unknown」
  이라는 **관계**만 본다 — `unknown` 이 영원히 안 쓰여도 초록이다.
- **근거**: `grep -rn "SYNC_STATUSES\|SyncStatus" packages apps plugin --include=*.ts`
  → 선언 2줄 + `z.enum` 1줄 + 시험 2줄 + DB 3줄이 전부 (이번 바퀴 직접 확인) ·
  `packages/schema/src/upload.ts:116` · `apps/web/src/db/schema.ts:94`
- **정본**: `docs/SPEC.md` §6 (동일성 판정) · §5 (`GET /projects/{id}/sync-status`)
- **고칠 방향**: **주인은 `docs/PLAN.md` P1 「API 2군」 행**(`sync-reports`·`sync-status`)이다.
  그 행에서 `GET /sync-status` 가 **보고가 없는 기기**에 `unknown` 을 매기게 배선하고,
  「보고 있는 기기 vs 없는 기기가 서로 다른 값을 낸다」를 시험으로 잠근다.
  지금 DB enum 에 `unknown` 을 더하지 마라 — 그러면 기기가 「모르겠다」고 자칭할 수 있게 된다.
- **상태**: ✅ `e5f61c8` — `GET /sync-status` 가 **기기부터 세고** 마지막 보고를 붙인다
  (`lib/api/sync.ts` 의 `statusOfDevice` 하나가 매긴다). 보고부터 세면 한 번도 보고
  안 한 기기가 목록에서 사라진다 — 그게 정확히 화면이 보여 줘야 할 것이다.
  잠근 것: `test/api-publish.test.ts` 「보고한 기기는 applied · 안 한 기기는 unknown」
  + 「기기가 unknown 을 자칭하면 400」. 관통 `publish` 단계도 같은 것을 잰다.
  DB enum 에 `unknown` 은 **안 넣었다** (원래 조언대로).

### 17. SPEC §2 의 sync_reports 상태에 `failed` 가 있는데 코드 정본에는 없다   [격차]
- **증상**: SPEC §2 는 `sync_reports.status enum('applied','outdated','modified','failed','manual')`
  라고 적는데, 코드의 정본(`SYNC_STATUSES`)은 `applied·outdated·modified·manual·unknown`
  이다. **`failed` 는 없고 `unknown` 이 있다** — 두 목록이 한 칸씩 어긋나 있다.
  SPEC §6 의 동일성 판정 문단은 코드 쪽(5종에 `unknown`)과 같아서, 어긋난 것은 §2 한 줄이다.
- **근거**: `docs/SPEC.md:143` vs `packages/schema/src/upload.ts:116` ·
  DB enum 은 코드를 따랐다 (`apps/web/src/db/schema.ts:94` · `389c7f2`)
- **정본**: `docs/SPEC.md` §2
- **고칠 방향**: §2 의 그 줄을 코드와 같게 고친다. **`failed` 를 되살리지 마라** —
  sync 가 실패하면 파일을 backup 에서 **전부 복원**하므로(SPEC §8.5) 기기의 상태는
  실패 이전 그대로다. 「실패했다」는 보고의 상태가 아니라 사건이고, 그걸 상태로 저장하면
  다음 보고가 올 때까지 화면이 거짓을 말한다. 대신 §2 에 `unknown` 을 적고
  「보고가 없을 때 서버가 매긴다 · 기기는 자칭할 수 없다」를 한 줄로 남겨라.
- **상태**: 대기

### 7. `agents`·`cursor` 타깃이 아직 하나도 안 나온다   [구멍]
- **증상**: `PACK_TARGETS` 3종 중 컴파일러가 내는 것은 `claude` 하나다. SPEC §4.1
  partition 표의 마지막 줄(「동일 내용 → `AGENTS.md`, `.cursor/rules/contextops.mdc`」)이
  구현돼 있지 않아 enum 값 둘이 아직 아무것도 안 바꾼다.
- **근거**: `packages/compiler/templates/index.ts` 의 `DOCS` 가 전부 `target: 'claude'` ·
  `packages/compiler/test/liveness.test.ts` 의 「아직 claude 타깃만 나온다」 (`8e02f48`)
- **정본**: `docs/SPEC.md` §4.1
- **고칠 방향**: **주인은 `docs/PLAN.md` P5 첫 행**(「AGENTS/cursor 타깃」)이다. 그 행을
  하면 위 liveness 시험이 빨개진다 — **그때 시험을 고치면서 이 항목을 닫아라.**
  (SPEC §14 절삭 순서 4번이라 일정이 밀리면 잘릴 수도 있다. 잘리면 그 결정을 여기 적어라)
- **상태**: 대기 (P5 행이 주인 · 지금 고치지 마라)

### 8. ✅ workflow 항목이 없는 프로젝트에는 진행 보고 규칙이 안 나간다   [구멍]
- **증상**: SPEC §4.3 의 고정 텍스트(진행 보고 CLI 사용법)는 `.claude/rules/workflow.md`
  의 꼬리말이고, 그 파일은 **workflow 항목이 하나라도 있어야** 생긴다. 항목이 0개인
  프로젝트는 Pack 어디에도 진행 보고 방법이 없다 → agent 가 보고를 안 하고 Roadmap 이 안 움직인다.
- **근거**: `packages/compiler/templates/index.ts` 의 `DOCS.workflow.foot` ·
  항목 0개 문서는 만들 수 없다 (`Manifest.files[].source_item_ids` 가 `min(1)` — 근거 없는
  파일을 금지하는 P7 의 자리라 느슨하게 풀면 안 된다)
- **정본**: `docs/SPEC.md` §4.3 · §3(Manifest)
- **고칠 방향**: 셋 중 하나를 **골라서** 한다.
  ① `init` Skill·픽스처가 workflow 항목을 반드시 하나 만들게 한다 (제일 값싸다)
  ② 고정 텍스트를 CLAUDE.md 꼬리말로 옮긴다 (SPEC §4.3 을 고쳐야 한다)
  ③ Manifest 에 「항목에서 오지 않은 파일」을 표현할 자리를 만든다 — **P7 을 넓히는 일이라
     신중해야 한다.** 「근거 없는 줄」의 예외를 한 번 열면 다음 예외가 쉬워진다
- **상태**: ✅ `bc08125` — **③을 골랐다** (43 과 같은 구멍이다). ①(픽스처가 workflow 항목을
  만들게 한다)은 제품의 일을 사용자 데이터에 시킨다 — 픽스처를 고쳐도 남의 저장소는 그대로다.
  ③의 「예외가 쉬워진다」는 걱정은 **예외를 계약의 표 하나**(`PRODUCT_TEXT_PACK_FILES`)로
  묶고, 「표 밖은 여전히 막힌다」·「표에 이름이 늘었으면 알린다」를 schema 시험 5개로 잠가서 막았다

### 9. `tags`·`owner_id`·`valid_from`·`valid_until` 과 짧은 절의 `body` 가 Pack 을 바꾸지 않는다   [구멍]
- **증상**: 컴파일러가 실제로 읽는 Base 필드는 `id`·`title`·`status`·`scope`·`priority`·
  `source_refs`·`confidence`·`revision`·`body`(상세 절만)다. `tags`·`owner_id`·
  `valid_from`·`valid_until` 은 **어디서도 안 읽힌다.** `body` 는 architecture·adr·
  domain·workflow 절에서만 나가고 mission·goal·policy·constraint 절에서는 버려진다 —
  사용자가 적은 설명이 Pack 에서 **조용히 사라진다.**
- **근거**: `grep -rn "tags|owner_id|valid_" packages/compiler/src` → 0건 ·
  `packages/compiler/src/sections.ts` 의 `bodyLine` 호출부 4곳 (`8e02f48`)
- **정본**: `docs/SPEC.md` §3 · §4.1
- **고칠 방향**: 살리거나 지운다 — 어중간하게 두지 마라. 화면(P1~P4 행)이 `tags`·`owner_id`
  를 읽으면 그건 「산 것」이다. `valid_until` 이 지난 항목을 Pack 에서 빼는 것이 제일 값싼
  살리기인데, **그러려면 「오늘」이 필요하고 컴파일러는 시각을 읽을 수 없다** (P4) —
  `generated_at` 을 기준으로 삼아야 한다. 짧은 절의 `body` 는 「웹에서만 보는 설명」이라고
  정하고 화면에 그렇게 적든지, Pack 에 한 줄로 내보내든지 **골라라.**
- **상태**: 대기

### 13. `ProgressEvent.status` 4종 · `source` 3종이 아직 아무것도 바꾸지 않는다   [구멍]
- **증상**: `PROGRESS_STATUSES`(`in_progress`·`criterion_done`·`done_candidate`·`none`)와
  `PROGRESS_SOURCES`(`agent`·`hook`·`manual`)를 **읽는 코드가 `z.enum(...)` 자기 자신뿐이다.**
  잠근 시험도 「4종이 전부 파싱을 통과한다」 하나라서, 4종 중 3종이 아무 일도 안 해도
  영원히 초록이다. 옆의 `REPORTABLE_SYNC_STATUSES` 는 「`unknown` 을 뺀다」는 **차이**를
  시험이 잡고 있어서 대비가 뚜렷하다.
- **근거**: `grep -rn "PROGRESS_STATUSES\|PROGRESS_SOURCES" packages plugin --include=*.ts`
  → 선언 4줄 + `z.enum` 2줄 + 시험 2줄이 전부 (이번 바퀴 직접 확인) ·
  `packages/schema/src/upload.ts:78,82` · `packages/schema/test/upload-allowlist.test.ts:133`
  (「진행 상태 %s 가 통과한다」 — **통과만 본다**)
- **정본**: `docs/SPEC.md` §3 (ProgressEvent) · §8.3 (`progress` CLI) · §9 (Roadmap 화면)
- **고칠 방향**: **주인은 `docs/PLAN.md` P2 셋째 행**(`progress`·Stop 훅)과 **P4 첫 행**
  (Roadmap 화면)이다. 그 행을 할 때 4종이 **서로 다른 결과**를 내게 배선한다 —
  `done_candidate` 는 「완료 확인」 UI 를 띄우고 `criterion_done` 은 기준 하나만 체크하는
  식으로. 그리고 `confidence` 3단계를 잠글 때 쓴 판정법을 그대로 쓴다: **값만 바꾸고
  결과가 갈리는가.** 지금 소비처 없이 시험만 늘리면 FINDINGS 12번과 같은 자리가 하나 더 생긴다.
- **상태**: ✅ `e5f61c8` (절반) — **`status` 4종은 살렸다.** `apps/web/src/lib/api/progress.ts`
  의 `PROGRESS_EFFECT` 표가 4종을 마일스톤 상태로 접고, `GET /roadmap` 이 그 결과를 낸다.
  잠근 것: `test/progress-rollup.test.ts` 「네 값이 **세 갈래**로 갈린다」 ·
  「보고만으로는 done 이 안 된다(사람의 확정이 있어야 한다)」 · 관통이 같은 것을
  `not_started → in_progress` 로 잰다.
  ⚠ **`source` 3종(`agent`·`hook`·`manual`)은 아직 저장만 된다.** 화면이 「누가 보고했나」를
  아이콘으로 가르는 자리(P4 Roadmap 화면)가 주인이다 — 그때 이 항목을 닫아라.

### 10. SPEC §4.2 템플릿 발췌가 코드와 세 곳 다르다 — SPEC 을 코드에 맞춰라   [격차]
- **증상**: 컴파일러를 만들면서 SPEC 대로 두면 **계산이 안 되거나 값이 죽는** 곳이 셋이었다.
  | 어디 | SPEC §4.2 | 코드 | 왜 이렇게 됐나 |
  |---|---|---|---|
  | CLAUDE.md 머리말 | `manifest:{{manifest_hash_short}}` | `snapshot:<앞 8자>` | 🔴 **순환이다.** `manifest_hash` 는 그 파일의 sha256 으로 계산되는데, 그 값을 파일 안에 적으면 계산 자체가 불가능하다. 순환이 없는 `snapshot_hash` 를 적는다 |
  | Mission 절 | `{{body}}` | `data.statement` (+ `rationale` 인용) | `body` 를 쓰면 `MissionData` 를 아무도 안 읽게 된다 — 필드가 죽는다 |
  | 역추적 태그 | `ctx:{id} rev:{n} src:…` | `conf:{level}` 을 더했다 | `confidence` 3단계가 **전부** 출력을 바꾸게 하려고. low 일 때만 적으면 high·medium 이 구별되지 않는다 |
- **근거**: `packages/compiler/templates/index.ts` `notice()` · `src/sections.ts` mission ·
  `src/tag.ts` `traceTag()` · 잠근 시험은 `test/liveness.test.ts` (`8e02f48`)
- **정본**: `docs/SPEC.md` §4.2
- **고칠 방향**: SPEC §4.2 의 세 줄을 코드와 같게 고친다. **코드를 되돌리지 마라** —
  첫째는 계산이 불가능하고, 나머지 둘은 값이 죽는다.
- **상태**: 대기

### 11. SPEC §1.1 저장소 트리가 실제 파일 이름과 다르다   [격차]
- **증상**: 트리가 지목하는 이름으로 파일을 찾으면 없다. 세 곳이다.
  | SPEC §1.1 | 실제 |
  |---|---|
  | `packages/schema/src/{context-item,proposal,progress,manifest,pack,api}.ts` | `{common,item,upload,manifest,json-schema,table,index}.ts` |
  | `packages/compiler/templates/*.md.hbs` | `templates/{index,progress-report}.ts` (핸들바 없음 — 템플릿은 TS 표다) |
  | `test/golden/{case-1,case-2,case-3}/{snapshot.json,expected/*}` | `test/golden/case-{1-small,2-domains,3-overflow}/{input.json,expected/*}` |
- **근거**: 각 경로 (`a4ac92d` · `8e02f48`)
- **정본**: `docs/SPEC.md` §1.1
- **고칠 방향**: §1.1 트리를 실제 이름으로 고친다. **트리는 사람이 길을 찾는 지도라**
  틀리면 없는 파일을 찾다가 새로 만든다. (`snapshot.json` → `input.json` 은 파일이
  snapshot 뿐 아니라 project·버전까지 담아서 그렇다)
- **상태**: 대기

### 4. SPEC §3 이 코드보다 느슨한 곳 3군데 — SPEC 을 코드에 맞춰라   [격차]
- **증상**: `packages/schema` 를 만들면서 SPEC 대로 두면 **뒷 단계가 못 쓰는** 값이 통과한다.
  세 곳을 코드에서 조였고, 정본(SPEC)이 아직 느슨한 채로 남아 있다.
  | 어디 | SPEC | 코드 | 왜 조였나 |
  |---|---|---|---|
  | `Scope.value` | 항상 optional | `domain`·`path` 는 필수 | 값이 없으면 컴파일러가 `domain-{slug}.md`·`scoped-{slug}.md` 파일 이름을 못 만든다 (SPEC §4.1) |
  | `ProposalItem` | `draft`·`target_item_id` 둘 다 optional | `add`→draft 필수 · `update`/`deprecate`→target 필수 | 안 그러면 연산 3종이 아무것도 바꾸지 않는다 |
  | `ProgressEvent.milestone_id` | `z.string()` | `MilestoneId` 정규식 또는 `'none'` | 형식이 두 곳(RoadmapData·ProgressEvent)에서 갈리면 roadmap 대조가 조용히 빗나간다 |
- **근거**: `packages/schema/src/common.ts` Scope · `src/upload.ts` ProposalItem·ProgressEvent ·
  잠근 시험은 `test/scope-and-enums.test.ts` · `test/upload-allowlist.test.ts` (`a4ac92d`)
- **정본**: `docs/SPEC.md` §3
- **고칠 방향**: SPEC §3 의 세 줄을 코드와 같게 고친다. **코드를 되돌리지 마라** — 셋 다
  뒷 단계가 실제로 요구하는 것이고, 시험으로 잠겨 있다.
  (`Scope.value` 는 컴파일러가 실제로 그 값으로 파일 이름을 만들면서 확인됐다 — `8e02f48`)
- **상태**: 대기

### 2. SPEC §1.2 는 Node 20 LTS 인데 실제 실행·CI 는 22 다   [격차]
- **증상**: 개발 기계의 node 가 v22.22.2 다. `.nvmrc` 를 22 로 적었고 GitHub CI 도
  거기서 읽는다. SPEC 과 코드가 갈렸다.
- **근거**: `node --version` → `v22.22.2` · `.nvmrc` = `22` · `docs/SPEC.md` §1.2 표
- **정본**: `docs/SPEC.md` §1.2
- **고칠 방향**: 20 으로 내릴 이유가 없다 — SPEC §1.2 의 「Node 20 LTS」를
  「Node 22 LTS」로 고치고 `.nvmrc` 를 그 정본으로 지목한다. (버전 숫자가 사는 곳은
  `.nvmrc` 하나여야 한다)
- **상태**: 대기

### 3. `pnpm` 도 `typescript` 도 SPEC 표에 버전이 없거나 흐리다   [격차]
- **증상**: SPEC §1.2 는 「TypeScript 5.x」·「vitest」라고만 적는다. 실제로 고정한 값은
  `pnpm-workspace.yaml` 의 catalog(typescript ^5.9.3 · vitest ^4.1.11)와
  `package.json` 의 `packageManager` (pnpm@11.25.0) 다.
- **근거**: `pnpm-workspace.yaml` catalog · `package.json` packageManager · SPEC §1.2 표
- **정본**: `docs/SPEC.md` §1.2 (「버전 고정」이라고 제목에 적혀 있다)
- **고칠 방향**: SPEC §1.2 표에서 버전 숫자를 빼고 **「정본은 catalog·packageManager」**
  라고 가리키게 한다. 두 곳에 숫자가 살면 갈라진다.
- **상태**: 대기

### 14. `.ps1` 두 개가 워킹트리에서 LF 다 — `.gitattributes` 는 CRLF 라고 적혀 있다   [격차]
- **증상**: `.gitattributes` 가 `*.ps1 text eol=crlf` 인데 워킹트리의 `tools/walkthrough.ps1`
  과 `tools/principles.ps1` 이 **bare LF** 다. `git add` 때마다
  `LF will be replaced by CRLF the next time Git touches it` 경고가 뜬다.
  지금 도는 데는 지장이 없지만(PS 5.1 은 LF 도 읽는다 · BOM 은 둘 다 있다),
  **경고가 상시로 뜨면 진짜 경고를 못 본다.**
- **근거**: 이번 바퀴 바이트로 셌다 —
  `walkthrough.ps1` BOM ○ · CRLF 0 · bare LF 140 / `principles.ps1` BOM ○ · CRLF 0 · bare LF 271 /
  `ci.ps1` CRLF 202 · `loop/loop.ps1` CRLF 301 (**둘은 CRLF, 둘은 LF 로 갈렸다**) ·
  `git diff tools/walkthrough.ps1` 이 5줄 추가만 내는데도 경고를 같이 낸다
- **정본**: `.gitattributes`
- **고칠 방향**: 두 파일을 CRLF 로 다시 체크아웃한다 (`git rm --cached` 후 재체크아웃 또는
  `git add --renormalize`). 그 뒤 **네 개 전부 CRLF 인지 바이트로 확인**해라 —
  `file`·`grep` 은 `\r` 을 삼켜서 거짓말을 한다(`docs/STATUS.md` 「밟은 함정」).
  ⚠ 파이썬으로 고치지 마라. 텍스트 모드가 CRLF 를 LF 로 접는다 — 그게 이 상태를 만든 원인일 수 있다.
- **상태**: 대기

---

## 고친 것

### 12. 에러 코드 9종이 SPEC §5 에만 있고 코드에는 정본이 없다   [구멍]
- **증상**: SPEC §5 가 `UNAUTHORIZED`·`FORBIDDEN`·`NOT_FOUND`·`VALIDATION_FAILED`·
  `STALE_BASE`·`REVISION_CONFLICT`·`BUDGET_EXCEEDED`·`RATE_LIMITED`·`COMPILE_FAILED`
  **9종을 한 줄에 나열**하는데, 저장소 코드 전체에 이 이름이 **0건**이다. 값 목록이
  문서 문장 안에만 살아 있어서, API 를 만드는 사람이 **손으로 문자열을 적게 된다** —
  9종 중 몇 개가 실제로 쓰이는지 아무도 셀 수 없고 오타가 조용히 통과한다.
- **근거**: `grep -rn "STALE_BASE\|BUDGET_EXCEEDED\|ERROR_CODE" packages apps plugin tools`
  → **0건** (이번 바퀴 직접 확인) · `docs/SPEC.md:348`
- **정본**: `docs/SPEC.md` §5
- **고칠 방향**: **주인은 `docs/PLAN.md` P1 「API 1군」 행이다.** 그 행을 할 때
  `packages/schema` 에 `ERROR_CODES` 표를 정본으로 두고(「개념 하나 = 정본 파일 하나」),
  에러 응답 Zod 계약이 그 enum 을 쓰게 한다. 그리고 **9종이 전부 실제로 쓰이는지**를
  liveness 시험으로 잠근다 — 안 그러면 `ItemType` 10종과 같은 「정의만 있고 아무 일도
  안 하는」 자리가 하나 더 생긴다. 지금 스키마만 먼저 만들면 소비처 없는 표가 된다.
- **상태**: ✅ `0a370d8` — `packages/schema/src/api.ts` 의 `ERROR_CODES`·`ERROR_STATUS`
  표가 정본이 됐다. liveness 는 「9종이 있다」가 아니라 **소비처가 있는가**로 잠갔다
  (`apps/web/test/error-codes.test.ts`) — 아직 주인이 없는 넷은 「어느 PLAN 행이 만드나」를
  표에 적게 했고, 그 행이 오면 시험이 빨개져서 표에서 한 줄을 지우게 된다

### 18. `tools/principles.ps1` 이 `[id]` 폴더 안의 파일을 조용히 안 읽었다   [고장]
- **증상**: Next App Router 의 동적 구간은 폴더 이름이 `[id]` 다. PowerShell 은 대괄호를
  **와일드카드**로 읽어서 `Get-Content <...>/[id]/route.ts` 가 아무것도 못 찾는다.
  `Find-Banned` 는 `-ErrorAction SilentlyContinue` 와 함께 써서 **0줄을 읽고 통과**했다 —
  즉 동적 라우트 8개만 P1·P2 검사를 안 받는 상태였다. P3 쪽은 `-Raw`(FileSystem 공급자의
  동적 매개변수)라 「Raw 라는 매개변수가 없다」는 엉뚱한 오류로 **죽었고**, 그 덕에 발견했다.
- **근거**: 라우트를 붙이고 `tools/ci.ps1` 을 돌리자 `principles FAIL … FAIL 0` —
  위반은 0인데 종료 코드가 1이었다. 직접 부르니
  `Get-Content : 매개 변수 이름 'Raw'과(와) 일치하는 매개 변수를 찾을 수 없습니다`
- **고친 방법**: `principles.ps1` 의 파일 읽기 5곳을 전부 `-LiteralPath` 로. 왜 그래야
  하는지를 `Find-Banned` 옆 주석에 남겼다 (조용히 되돌려지지 않게).
- **갈리는지 확인**: 고친 뒤 P2 가 세는 파일이 **99개**로 늘었다(라우트 포함) · 전 층 GREEN.
- **왜 고장으로 셌나**: **게이트가 눈을 가리는** 모양이다. 시끄럽게 죽은 쪽(P3)이 아니라
  조용히 통과한 쪽(P1·P2)이 진짜 문제다 — 라우트를 아무리 늘려도 검사를 안 받았을 것이다.
- **정본**: `tools/principles.ps1`
- **상태**: ✅ `0a370d8`

### 19. 인증 헤더가 없는데 DB 를 먼저 열어서 401 이 500 이 됐다   [고장]
- **증상**: 빌드한 서버를 `DATABASE_URL` 없이 띄우고 인증 없이 부르면
  `{"error":{"code":"INTERNAL"}}` 500 이었다. 401 이어야 한다. 라우트가
  `requireActor(ctx.db, …)` 를 부르면서 인자 평가 시점에 DB 를 열었기 때문이다.
- **근거**: `next start` → `curl -X POST /api/v1/teams` (본 것) —
  고치기 전 `INTERNAL/500`, 고친 뒤 `UNAUTHORIZED/401`
- **고친 방법**: `ctx.actor()` 를 감싸기(`route.ts`)로 옮겨 **헤더 파싱(순수) → DB** 순서를
  강제했다. 덤으로 라우트 13개의 `ctx.note({user_id})` 보일러플레이트가 사라졌다.
- **갈리는지 확인**: `DATABASE_URL` 을 지우고 헤더 없이 부르면 401 이어야 한다는 시험을 넣었다.
- **정본**: `apps/web/src/lib/api/route.ts`
- **상태**: ✅ `5d26744`

### 15. `tools/ci.ps1` 이 부른 자리에서 pnpm 을 돌려 「가짜 RED」를 낸다   [고장]
- **증상**: `apps/web` 안에서 `powershell -File tools\ci.ps1` 을 부르면 typecheck 층이
  `Command "typecheck" not found` 로 FAIL 이 되고 뒤 층이 전부 「앞 층이 빨갛다」로
  SKIP 된다. **저장소는 멀쩡한데 결과는 RED** 다. 이번 바퀴에 직접 밟았다 —
  `apps/web` 을 만든 뒤 그 안에서 검사를 불렀다.
- **근거**: 재현 로그 — 같은 명령이 cwd 에 따라 `typecheck FAIL … => RED` /
  `typecheck OK 5초 · 멤버 3개 … => GREEN` 으로 갈렸다 · `tools/ci.ps1` 의
  `Invoke-Layer` 는 `$root` 를 안 쓰고 `Get-WorkspaceMembers` 만 `Push-Location` 했다
- **고친 방법**: 층을 돌기 전에 `Push-Location $root`, 결과를 찍기 전에 `Pop-Location`.
- **갈리는지 확인**: 고치기 전 RED 를 낸 **그 명령 그대로** 다시 불러 GREEN 을 봤다.
- **왜 고장으로 셌나**: 가짜 초록만큼은 아니어도 **가짜 빨강도 게이트의 거짓말**이다.
  무인 루프는 물어볼 사람이 없어서 없는 고장을 한 바퀴 통째로 쫓는다.
- **정본**: `tools/ci.ps1`
- **상태**: ✅ `7f904a2`

### 1. 워크스페이스 멤버가 0개여도 typecheck·test 층이 초록이다   [구멍]
- **증상**: `pnpm -r <script>` 는 매칭되는 패키지가 없으면 `No projects matched the filters`
  를 찍고 **exit 0** 이다. `tools/ci.ps1` 은 그걸 `typecheck OK`·`test OK` 로 보고했다 —
  **아무것도 검사하지 않았는데 초록**이었다.
- **근거**: 이번 바퀴에 다시 재현했다. 빈 워크스페이스(`packages/*` glob 만 있고 멤버 없음)
  에서 `pnpm -r test` → `No projects matched the filters` · **`EXIT=0`**.
- **고친 방법**: `tools/ci.ps1` 이 **검사 대상을 먼저 센다.**
  | 함수 | 무엇을 세나 | 0개면 |
  |---|---|---|
  | `Get-WorkspaceMembers` | `pnpm ls -r --depth -1 --json` 에서 **루트를 뺀** 멤버 | typecheck·test 둘 다 `SKIP 워크스페이스 멤버 0개` |
  | `Get-TestableMembers` | 그 중 `scripts.test` 를 **실제로 가진** 멤버 | test 층만 `SKIP test 스크립트를 가진 멤버 0개` |
  둘째를 따로 센 이유 — 멤버 수만 세면 「패키지는 있는데 아무도 테스트를 안 도는」 상태가
  **다시 가짜 OK** 가 된다 (`pnpm-workspace.yaml` 주석의 「셋 중 하나라도 없으면 검사 없이
  초록」과 같은 함정이다). 두 층의 note 에 멤버 수를 남겨서 `.ci/result` **한 줄만 보고도**
  몇 개를 돌고 초록인지 알 수 있게 했다 (`test OK 3초 · 멤버 2개`).
- **갈리는지 확인**: 두 함수를 AST 로 꺼내 두 워크스페이스에 대고 돌렸다 —
  빈 워크스페이스 **0개**(→ SKIP 경로) / 이 저장소 **2개 · testable 2개**(→ OK 경로).
  같은 코드가 실제로 두 갈래로 간다.
- **정본**: `tools/ci.ps1` 2·3층
- **상태**: ✅ `84ce3ea`

### 5. `confidence` 3단계 · `enforcement` 4종 · 항목 `status` 4종이 아직 아무것도 바꾸지 않는다   [구멍]
- **증상**: 값 목록은 있고 파싱도 되지만 **읽는 코드가 없었다.**
- **고친 방법**: 컴파일러 바퀴에서 셋 다 **살렸다** (지우지 않았다).
  | 값 | 어디서 읽나 | 잠근 시험 |
  |---|---|---|
  | `status` 4종 | `src/partition.ts` 의 `EXCLUDE_BY_STATUS` 표 — `active` 만 Pack, 나머지 셋은 **서로 다른 이유**로 `excluded` | 「4종이 서로 다른 결과를 낸다」 |
  | `confidence` 3단계 | `src/tag.ts` 의 역추적 태그 `conf:{level}` | 「3단계가 역추적 태그를 바꾼다」 |
  | `enforcement` 4종 | `src/sections.ts` 의 `ENFORCEMENT_LABEL` 표 → 정책 줄의 「강제: …」 | 「4종이 정책 줄을 바꾼다」 |
  | `scope.kind` 3종 | `src/partition.ts` 의 `byScope` — project/domain/path 가 **다른 파일**로 | 「3종이 서로 다른 파일로 간다」 |
  | `SourceRef` 4종 | `src/tag.ts` 의 `SRC_TAG` 표 | 「4종이 서로 다른 태그를 낸다」 |
  판정법은 하나다 — 값만 바꿔 컴파일하고 **산출물 지문이 갈리는가**를 본다
  (`packages/compiler/test/liveness.test.ts`).
- **정본**: `docs/SPEC.md` §3 (표) · §4.1 (소비처)
- **상태**: ✅ `8e02f48`

### 6. `pnpm` 11 의 설치 스크립트 허용 키는 `allowBuilds` 다 — 다른 이름은 조용히 안 먹는다   [고장]
- **증상**: `tsx`(→`esbuild`)를 넣자 모든 `pnpm install`·`pnpm --filter … run` 이
  `ERR_PNPM_IGNORED_BUILDS` 로 **exit 1** 이 됐다. `pnpm-workspace.yaml` 에
  `ignoredBuiltDependencies` / `onlyBuiltDependencies` 를 적으면 `pnpm config get` 은
  값을 **읽어서 보여 주는데도** 설치는 계속 실패했다 (`--force` 도 소용 없음).
- **근거**: 이 바퀴에서 직접 재현. `pnpm approve-builds esbuild` 를 돌리자
  `pnpm-workspace.yaml` 에 `allowBuilds: { esbuild: true }` 가 **새로 쓰였고** 그때 통과했다.
- **정본**: `pnpm-workspace.yaml` (주석으로 남겨 뒀다)
- **고칠 방향**: 새 의존성이 설치 스크립트를 가지면 **손으로 적지 말고**
  `pnpm approve-builds <pkg>` 를 돌려라. 무인 세션에서 이걸 모르면 install 이 통째로 막힌다.
- **상태**: ✅ `a4ac92d` (막힘은 풀렸다 · 함정은 여기 남긴다)
