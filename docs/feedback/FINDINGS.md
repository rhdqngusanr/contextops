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

### 37. 아무도 `.contextops/` 의 **ignore 규칙을 만들지 않는다**   [구멍]
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
- **상태**: 대기 (P2 둘째 행에서 sync 가 backups 를 만들 때 같이 하면 값이 두 배다)

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
- **상태**: 대기

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
- **상태**: 대기

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
- **상태**: 대기 (P3 첫 행이 주인 · 지금 고치지 마라)

### 29. `roadmap` 의 `conflicts` 는 마일스톤별이 아니라 **프로젝트 전체 수**다   [구멍]
- **증상**: SPEC §5 의 roadmap 응답은 마일스톤 줄마다 `conflicts` 를 갖는데, 충돌 행에
  **마일스톤을 가리키는 칸이 없다.** 그래서 모든 줄이 같은 숫자(프로젝트의 열린 충돌 수)를
  달고 나간다 — 마일스톤이 셋이면 화면에 같은 숫자가 세 번 뜬다.
- **근거**: `apps/web/src/app/api/v1/projects/[id]/roadmap/route.ts` 의 `openConflicts` ·
  `apps/web/src/db/schema.ts` `conflicts` 에 milestone 칸 없음 (`e5f61c8`)
- **정본**: `docs/SPEC.md` §2 · §5 · §9(화면 8)
- **고칠 방향**: FINDINGS 25 와 **같이** 정해라 — 충돌이 무엇을 가리키는지(항목? 마일스톤?)를
  §7.2 가 정할 때 한 번에 결정한다. 지금 `relates_to` 로 억지로 이으면 그때 다시 짠다.
- **상태**: 대기 (P3 첫 행이 주인 · 지금 고치지 마라)

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
