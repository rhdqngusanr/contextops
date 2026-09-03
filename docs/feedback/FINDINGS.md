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
- **상태**: [PLACEHOLDER] — §5 의 콜론 7군데를 경로 구간으로 고쳤고(표 5줄 + §3.1 한 줄 +
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
- **상태**: 대기 (P3 첫 행이 주인 · 지금 고치지 마라)

### 26. `POST /documents` 가 zip 도 구조화 job 도 아직 안 한다   [구멍]
- **증상**: SPEC §5 는 「multipart(zip) 또는 {title, kind, content} → document + 구조화
  job 시작 (§7.1)」인데, 구현은 JSON 한 쪽뿐이고 job 은 안 건다.
  **일부러 안 걸었다** — 없는 job 을 「대기 중」이라고 응답하면 화면이 영원히 기다린다.
- **근거**: `apps/web/src/app/api/v1/projects/[id]/documents/route.ts` 의 주석 (`0a370d8`)
- **정본**: `docs/SPEC.md` §5 · §7.1 · §11 (zip 상한)
- **고칠 방향**: 구조화 job 은 **P3 첫 행**이 주인이다. zip 업로드는 경로 검사(`..`·절대경로·
  심볼릭)와 파일 2,000개·20MB 상한(SPEC §11)이 **같이** 와야 한다 — 반쯤 검사하는 zip
  경로를 여는 것이 제일 나쁘다. 그 몫을 어느 행이 가질지 정해서 여기 적어라.
- **상태**: 대기

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
- **상태**: 대기 (P1 API 2군 행이 주인 · 지금 고치지 마라)

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

### 8. workflow 항목이 없는 프로젝트에는 진행 보고 규칙이 안 나간다   [구멍]
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
- **상태**: 대기

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
- **상태**: 대기 (P2/P4 행이 주인 · 지금 고치지 마라)

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
