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

### 92. `tsc` 가 `apps/web/scripts/` 를 **한 번도 안 본다** — 관통을 만드는 코드가 검사 밖이다   [구멍]
- **증상**: `apps/web/tsconfig.json` 의 `include` 가 `["*.ts", "src", "test", …]` 다.
  `"*.ts"` 는 **맨 위 한 층**이라 `scripts/` 는 안 들어온다. 그래서 `ci.ps1` 의
  `typecheck` 층이 초록이어도 `seed.ts`·`walkthrough-publish.ts`·`dev-server.ts`·
  `dump-*.ts` 는 **타입을 한 번도 안 본 코드**다. 이 파일들이 관통을 만든다 —
  「제품이 진짜로 도는가」를 증명하는 자리가 검사에서 빠져 있다.
- **근거**: 이번 바퀴에 직접 쟀다.
  `cd apps/web; npx tsc --noEmit --listFiles | grep -c "scripts/"` → **0**.
  `include` 에 `"scripts"` 한 줄을 넣고 돌려 본 결과는 **에러 3개뿐이고 전부 미사용 변수**다:
  `dump-resolve-effect.ts(74,10) 'loser'` · `walkthrough-publish.ts(19,58) 'sessionJwt'` ·
  `walkthrough-publish.ts(128,15) 'db'` (TS6133). **타입 에러는 0개다** — 지금 켜도
  거의 안 아프다는 뜻이고, 그래서 더더욱 꺼져 있을 이유가 없다.
- **정본**: `docs/SPEC.md` §12(테스트 매트릭스) · `tsconfig.base.json`(`noUnusedLocals` 정본)
- **고칠 방향**: `apps/web/tsconfig.json` 의 `include` 에 `"scripts"` 를 더하고 위 셋을 지운다.
  ⚠ `next build` 가 `scripts/` 를 들여다보게 되는지 확인해라 — `include` 는 `tsc` 와
  next 가 같이 읽는다. 아프면 `tsconfig.scripts.json` 을 따로 두고 `ci.ps1` 의
  `typecheck` 층이 **두 프로젝트를 다 돌게** 하는 것이 다음 갈래다.
  ⚠ 다른 패키지(`packages/*` · `plugin`)의 `include` 도 같이 봐라 — 같은 모양이면
  거기도 스크립트가 빠져 있다.
- **상태**: ✅ `95c525e` — **폴더 이름을 세는 것을 그만뒀다.** `include` 를 네 곳 다
  글로브(`["**/*.ts", "**/*.tsx"]`)로 바꿨다. 「`scripts` 한 줄을 더한다」로 끝내면
  **다음 폴더에서 똑같이 빠진다** — 잊을 자리 자체를 없앴다. 빼는 것은 `exclude` 에
  적는다(빼는 것은 눈에 보이고, 빠뜨리는 것은 안 보인다).
  측정: `tsc --listFilesOnly | grep -c apps/web/scripts/` → **0 에서 10**.
  **게이트를 세웠다** — `tools/tsconfig-coverage.mjs` 가 저장소의 모든 TS 소스가
  어떤 tsconfig 에는 들어 있는지 세고, `pnpm typecheck` 이 tsc 보다 **먼저** 부른다
  (그래서 `tools/ci.ps1` 과 `.github/workflows/ci.yml` 이 둘 다 자동으로 받는다 —
  검사 명령의 정본은 루트 `package.json` 하나다).
  include/exclude 규칙을 다시 구현하지 않고 **`tsc --listFilesOnly` 에게 묻는다**;
  프로젝트 목록도 적지 않고 `tsconfig.json` 을 **찾는다**(목록을 손으로 들면
  새 패키지가 조용히 검사 밖에 선다 — 이 게이트가 막으려는 고장 그 자체다).
  🔴 **빨개지는 것을 두 번 봤다**: ① include 를 옛 모양으로 되돌리니 빠진 파일 10개를
  이름으로 전부 짚었다 ② 면제 목록의 경로를 없는 것으로 바꾸니 「죽은 면제를 지워라」로
  FAIL 했다. 면제는 `fixtures/` 하나이고 이유가 옆에 적혀 있다.
  미사용 변수 3개(TS6133)도 지웠다. 덮임 = 프로젝트 5개 · TS 소스 **208개 전부**.
  ⚠ **다른 패키지에는 빠진 폴더가 없었다** — `schema`·`plugin` 은 이미 `"scripts"` 가
  있었고 `compiler` 는 그 폴더가 없다. 그래도 같은 글로브로 맞췄다(다음 폴더를 위해).
  `next build` 는 `include` 를 tsc 와 같이 읽는데 **아프지 않았고**(19초 OK)
  tsconfig 를 다시 쓰지도 않았다 — `next-env.d.ts`·`.next/types` 두 줄을 남겨 둔 덕이다.

### 93. 데모 Pack 이 **근거 4종 중 둘 · scope 3종 중 둘**만 보여 준다   [격차]
- **증상**: **89 와 같은 모양의 고장이고, 89 는 표 하나(`enforcement`)만 고쳤다.**
  표는 살아 있다(아래 93-B 가 ②단계까지 쟀다). 그런데 **심사자가 읽는 종이**에는:
  ① `SourceRef` 4종 중 **`doc` 14개 · `proposal` 1개**뿐 — `repo`(코드가 근거)와
     `manual`(사람이 정리한 근거)은 데모에 한 번도 안 나온다.
     제일 아픈 것은 `repo` 다. 「이 규칙이 코드 어디에 걸려 있나」가 제품의 말인데
     그 말이 종이에 없다.
  ② `scope.kind` 3종 중 **`project`·`domain`** 뿐 — `path` 가 없어서
     `.claude/rules/scoped-*.md` 라는 **Pack 파일 갈래 하나가 데모에 통째로 없다.**
- **근거**: 이번 바퀴 눈 판정. `.ci/walkthrough-pack/` 네 파일의 태그를 셌다 —
  `grep -oh "src:[^ ]*" … | tr ',' '\n' | sed 's/:.*//' | sort | uniq -c` → `14 doc` · `1 proposal`.
  `ls .ci/walkthrough-pack/.claude/rules/` → `domain-refund.md` · `workflow.md` 둘뿐.
  ⚠ `conf:` 는 여기 안 적는다 — **91-B 가 이미 보고 「고칠 것이 아니다」로 닫았다**
  (씨앗은 사람이 손으로 옮긴 것이라 `high` 가 사실이고, `medium`·`low` 는 AI 구조화의 값이다).
- **정본**: `docs/SPEC.md` §10.1(paylab 픽스처) · §10.5(발표 2:40) ·
  `packages/schema/src/common.ts`(`SOURCE_REF_KINDS` · `SCOPE_KINDS`)
- **고칠 방향**: **둘 다 문서·저장소에 진짜 근거가 있다 — 지어낼 필요가 없다.**
  - `path` scope: goals.md §3.5 「웹훅은 서명 검증 후에만 처리한다」가 `src/webhook/` 에
    걸리는 규칙이다 (§7 아키텍처 그림이 그 경로를 적어 둔다). `scope: {kind:'path', value:'src/webhook'}`
    로 항목 하나를 더하면 `scoped-*.md` 가 데모에 선다.
  - `repo` 근거: `fixtures/paylab-api` 가 실제로 있고 `src/payment/retry.ts` 에
    `MAX_RETRY=3` 고정 간격 코드가 있다 (SPEC §10.1). **`item_policy_retry` 의 근거로
    코드 한 칸을 더하는 것**이 서사에 맞는다 — 「문서는 5회 백오프인데 코드는 3회 고정」이
    이 데모의 충돌 서사 자체다. 근거가 둘이면 태그가 `doc:…,repo:…` 로 나온다.
  - `manual` 근거: 충돌을 **정리**하면 붙는다 (`conflicts/{id}/resolve` 가 넣는다).
    관통은 지금 씨앗 → 발행으로 **바로 간다** — 발표 타임라인(§10.5)의 「1:10 충돌 카드 →
    2:00 정리·발행」에서 **가운데 한 칸을 건너뛴다.** 이게 셋 중 제일 큰 일이다.
  ⚠ **게이트를 같이 올려라.** 89 가 `enforcement` 하나만 세게 만들었다
  (`PACK_ENFORCEMENT_MIN`). **표마다 따로 세는 상수를 늘리지 말고**, 「데모가 이 표의 몇
  갈래를 보여 주나」를 **표 하나로** 모아라 — 안 그러면 표가 늘 때마다 관통에 검사 한 벌씩
  복사하게 된다 (`CLAUDE.md` 「확장은 표에 한 줄」).
- **상태**: ✅ `ed30a89` — **두 축을 다 채웠고 셋 다 지어내지 않았다.**
  근거 종류 **2 → 4** (`doc` 15 · `repo` 2 · `proposal` 1 · `manual` 2) ·
  scope **2 → 3** · Pack 파일 **4 → 5** (`.claude/rules/scoped-src-webhook.md`).
  ① `path` scope — goals.md §3.5 로 `item_policy_webhook_sig` 하나를 더했다
     (경로 `src/webhook` 의 근거는 §7 아키텍처 그림).
  ② `repo` 근거 — `item_policy_retry` 에 `src/payment/retry.ts:11-14` 를 한 칸 더했다.
     태그가 `doc:…,repo:…` 로 나오고, **「문서는 5회 백오프 · 코드는 3회 고정」이 한 줄
     안에서 눈에 보인다.** 🔴 줄 번호는 **적지 않고 잰다**(`withRepo`) — 손으로 적으면
     90 을 코드 쪽에 그대로 다시 만든다. 코드 본문은 서버로 안 간다 (P1).
  ③ `manual` 근거 — 🔴 **이 항목이 적은 「충돌 정리가 붙인다」는 틀렸다.**
     `conflicts/{id}/resolve` 가 붙이는 `manual` 은 **진 항목**에 붙고 진 항목은
     `deprecated` 라 Pack 에서 빠진다 (`ITEM_STATUS_EXCLUDE_REASON`). 그 길로는
     이 갈래가 **영원히 종이에 안 선다.** 종이에 서는 길은 **씨앗 질문 답변**이다
     (`questions` → `seedDraft` → `manual` 근거 · LLM 없음). 관통이 이제 그 한 칸을
     밟는다 — 「문서가 없어도 답만 하면 항목이 된다」(화면 3 ③)가 관통에서 처음 돌았다.
  **게이트를 표 하나로 모았다** — `apps/web/scripts/pack-coverage.ts` 의 `PACK_COVERAGE`
  네 줄(enforcement · SourceRef · scope.kind · **ItemType**)이 정본이고 관통은 **읽기만**
  한다. 89 가 만든 `PACK_ENFORCEMENT_MIN` 은 지웠다. 각 줄에 「지금 몇 갈래이고 왜 그
  수인가」가 적혀 있고, `all` 은 정본 패키지 배열을 그대로 쓴다 (베끼면 표가 늘어도
  초록으로 남는다). **94 는 이제 「그 표의 ItemType 줄 `min` 을 올리는 것」이다.**
  표가 갈라질 자리 둘도 없앴다 — `SRC_TAG` 를 `{prefix, body}` 로 바꾸고 `srcKindOf()` 를
  그 표에서 **뒤집어** 만들었다(왕복을 `liveness.test.ts` 가 잠근다) · `byScope` 의 if
  사슬을 `SCOPE_DOC` 표로 바꾸고 `scopePackPath()` 를 내보냈다.
  **관통이 코드 근거도 따라간다** — `repo:` 태그의 줄 범위를 픽스처 파일에서 잘라 보고
  그 줄이 있는지 센다. 기대값은 (항목 × 근거 종류) 단위로 센다 — 항목 단위로 세면
  한 항목의 **둘째 근거만** 빠지는 것이 안 보인다.
  🔴 **빨개지는 것을 봤다**: 고장 셋을 되돌려 넣으니 넷이 FAIL 했다 —
  path scope 제거 → 「적용 범위 2갈래(없는 갈래: path)」 · 질문 답변 제거 →
  「근거 종류 3갈래(없는 갈래: manual)」+ 씨앗 질문 검사 · 줄 번호를 손으로 적기 →
  「`retry.ts:1-2` 안에 그 줄이 없다」.
  관통 publish 검사 **21 → 25**.
  📎 눈 판정: `docs/evidence/2026-09-04-pack-coverage/coverage.md` (`.ci/` 밖 · 종이 사본 2개)

### 93-B. 2-B 이번 라운드 — `SourceRef` 4종 · `scope.kind` 3종 다 살아 있다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 — 둘 다 **②단계(값을 바꾸면 결과가 달라지나)까지** 통과한다:
  ① **`SourceRef` 4종.** 소비처가 셋이고 셋 다 종류별로 **다른 것을 낸다**:
     `compiler/src/tag.ts:26`(`SRC_TAG` — 태그 문자열) ·
     `apps/web/src/components/evidence.tsx:25`(`SRC_LABEL` — 화면 글자) ·
     `schema/src/common.ts:160`(`SOURCE_REF` — 종류마다 다른 `.strict()` 스키마).
     `compiler/test/liveness.test.ts:92` 가 「4종이 서로 다른 태그를 낸다」를 지문으로 잰다.
     쓰는 자리도 넷 다 있다 — `publish.ts:349`(proposal) · `resolve/route.ts:126`(manual) ·
     `walkthrough-payload.ts:133`(repository_path) · 씨앗(source_document).
  ② **`scope.kind` 3종.** `compiler/src/partition.ts:68`(`byScope`)이 셋을 **서로 다른
     Pack 파일**로 보낸다 (`CLAUDE.md` / `domain-{slug}.md` / `scoped-{slug}.md`) 하고
     `sort.ts:17` 이 정렬에도 쓴다. `liveness.test.ts:81` 이 세 파일 경로를 그대로 잰다.
  ⚠ **살아 있는 것과 데모가 보여 주는 것은 다른 질문이다** — 뒤의 것이 **93** 이다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: sync 상태 5종(**69** — `manual` 을 찍는 코드가 0곳) ·
  `ItemType` 10종 · `enforcement` 4종
- **상태**: [기록]

### 95. 관통이 「검사 몇 개를 돌았나」를 **아무 데도 안 찍는다** — 세 바퀴가 초를 개수로 적었다   [구멍]
- **증상**: `tools/ci.ps1` 의 walkthrough 층은 `"$($r.sec)초"` 를 찍고
  `tools/walkthrough.ps1` 의 단계 `note` 도 **경과 초**다. 검사 개수를 내는 줄이 없다.
  그래서 이 루프가 `STATUS.md` 에 적어 온 「관통 검사 N개」가 **전부 초**였다 —
  38바퀴 「72개 → 73개」·39바퀴 「73개 → 75개」가 그것이고, 실제 publish 단계 검사는
  그때 **20개 안팎**이었다. 숫자가 커서 그럴듯하게 읽히는 종류의 거짓말이다.
- **근거**: 이번 바퀴에 직접 쟀다. `tools/ci.ps1:204` → `Add-Layer "walkthrough" "OK" "$($r.sec)초"` ·
  `tools/walkthrough.ps1:113` → `note = "$($sec)초"`.
  `.ci/walkthrough.json` 의 `stages[].note` 를 열어 보면 `'0초'·'2초'·'64초'…` 다
  (칸 이름이 `note` 라 개수처럼 읽힌다). 반면 `.ci/walkthrough-publish.json` 의
  `checks` 는 **25개**이고 이 바퀴 전에는 **21개**였다
  (`git show HEAD~1:apps/web/scripts/walkthrough-publish.ts | grep -c "check("` → 21).
- **정본**: `loop/PROMPT.md` ④8 (「한 일이 아니라 **잰 것**을 써라」) · `tools/walkthrough.ps1`
- **고칠 방향**: 단계가 **자기 검사 수를 내게** 하고 관통이 그것을 합쳐 찍는다.
  publish 단계는 이미 `.ci/walkthrough-publish.json` 에 `checks` 를 쓴다 —
  다른 단계(vitest)는 그 출력에 `Tests N passed` 가 있다. **초와 개수를 같은 칸에 담지
  마라** — 지금 고장이 정확히 그것이다 (`note` 한 칸에 초를 넣고 다음 사람이 개수로 읽었다).
  ⚠ **숫자를 두 곳에 적지 마라.** 검사 수의 정본은 각 단계의 산출물이고 관통은 **읽기만**
  한다 (89 가 `=== 6` 두 곳을 하나로 모은 것과 같은 이유).
  ⚠ 지난 STATUS 의 틀린 숫자는 **고치지 마라** — 그때 무엇을 봤는지의 기록이다.
  대신 이 항목이 「그 숫자는 초였다」를 남긴다.
- **상태**: ✅ `843bfd1` — **단계가 자기 검사 수를 내고, 관통은 읽기만 한다.**
  단계 표(`tools/walkthrough.ps1`)에 칸 하나를 더했다 — `count_json`(산출물 JSON 의
  `checks` 배열 길이 · publish·payload·sync) / `count_log`(그 단계 로그의 정규식 첫
  캡처 그룹 · fixture·vitest·scan). **수의 정본은 각 단계의 산출물**이고 관통에는
  수를 한 번도 적지 않았다.
  🔴 **초와 개수를 다른 칸에 담았다** — `.ci/walkthrough.json` 이 이제
  `stages[].sec`(초) 와 `stages[].checks`(개수) 를 따로 내고 맨 위에 합계 `checks` 를 낸다.
  `note` 는 실패·SKIP 사유만 담는다. 이 고장은 한 칸에 담아서 났다.
  **게이트를 세웠다** — 단계가 지났는데 **몇 개를 쟀는지 말을 못 하면 FAIL** 이다.
  0 으로 떨어뜨리면 「검사가 0개였다」와 「셀 줄 몰랐다」가 같아 보인다(이 항목의 고장과
  같은 종류의 침묵이다). 그래서 새 단계를 더하는 사람은 이 칸을 반드시 채우게 된다.
  🔴 **빨개지는 것을 봤다**: fixture 의 정규식을 안 맞는 것으로 바꾸니
  「검사 수를 못 셌다 — 이 단계의 count_json/count_log 를 표에 적어라」로 FAIL ·
  뒤 단계 전부 SKIP · exit 1.
  ⚠ **이번 관통이 낸 것만 센다** — 단계를 돌리기 전에 그 단계의 산출물 JSON 을 지운다.
  남아 있으면 막힌 단계가 **지난 바퀴의** 검사 수를 자기 것처럼 보고한다.
  `walkthrough-scan.ts` 는 자기 검사 수를 찍게 했다(그 단계 산출물은 CLI 가 쓰는
  `ScanResult` 라 `checks` 를 담을 자리가 없다). 수는 손으로 안 적고 파일 목록에서 센다.
  `ci.ps1` 의 walkthrough 층 note 도 「검사 N개 · M초」다 — 못 읽으면 `?` 다
  (0 은 「검사가 없었다」로 읽힌다).
  잰 것: 관통 검사 **639개** — fixture 20 · compile 142 · api 377 · publish 25 ·
  scan 49 · payload 10 · sync 16 · shots SKIP.
  ⚠ **이 639를 「관통 시나리오 검사」로 읽지 마라.** 단위가 섞여 있다 —
  compile·api 는 vitest 테스트 수이고, publish·payload·sync 는 관통 단계의 검사 수다.
  그래서 합계만 적지 말고 **단계별로** 적어라 (`.ci/walkthrough.json` 이 그렇게 낸다).

### 94. 데모 Pack 이 `ItemType` **10종 중 다섯**만 보여 준다 — 그리고 빠진 셋은 픽스처 문서에 이미 적혀 있다   [격차]
- **증상**: **89·93 과 같은 모양의 셋째 표다.** 표는 살아 있다(아래 94-B 가 ②단계까지 쟀다).
  그런데 심사자가 읽는 종이에 서는 타입은 **다섯**뿐이다 —
  `mission` · `goal` · `roadmap` · `policy`(3개) · `constraint`.
  **안 나오는 다섯**: `architecture` · `domain` · `adr` · `workflow` · `open_question`.
  🔴 제일 아픈 것은 **셋(`architecture`·`domain`·`open_question`)의 원문이
  픽스처 문서에 **이미 있는데 아무도 안 읽는다**는 것이다. 지어낼 필요가 없다 —
  씨앗이 goals.md 의 §5·§6·§7 을 그냥 건너뛴다.
  ⚠ **`.claude/rules/domain-refund.md` 를 「`domain` 타입이 나온 증거」로 읽지 마라.**
  그 파일은 `scope.kind='domain'` 이 만든 것이고 ItemType `domain` 과 **다른 축**이다.
  이름이 같아서 세다가 틀리기 쉽다.
  ⚠ `.claude/rules/workflow.md` 도 마찬가지다 — 그 파일은 **템플릿이 늘 찍는 진행 보고
  안내문**이고 `workflow` 타입 항목이 만든 것이 아니다 (열어 보면 `ctx:` 태그가 한 줄도 없다).
- **근거**: 이번 바퀴 눈 판정. `.ci/walkthrough-pack/` 다섯 파일 전체에서 태그를 세고
  씨앗과 대조했다 — `grep -nE "fromDoc\('[a-z_]+', '[a-z_]+'" apps/web/scripts/seed.ts`
  → 7줄 · `policy` 3 · `mission`/`goal`/`constraint`/`roadmap` 각 1 = **5종**.
  `cat .ci/walkthrough-pack/.claude/rules/workflow.md` → `ctx:` 태그 0개(템플릿 문구).
  빠진 셋의 원문 자리도 직접 찾았다 (`fixtures/paylab-docs/goals.md`):
  **§5 「아직 정하지 못한 것」**(115–122줄 · 미결 4건 — `open_question` 그 자체다) ·
  **§6 「용어」**(128–136줄 · PSP·승인·매입·종결·원장 5개 — `domain` 이다) ·
  **§7 「아키텍처 한 장」**(138–150줄 · payment→psp→PSP · webhook · ledger · refund —
  `architecture` 이고, 93 이 쓰려는 `path` scope 의 근거와 **같은 문단**이다).
  `adr` 과 `workflow` 는 픽스처에 원문이 **없다** — 이 둘은 문서를 먼저 늘려야 한다(89 의 규칙).
- **정본**: `docs/SPEC.md` §10.1(paylab 픽스처) · §4.1(partition) ·
  `packages/schema/src/common.ts`(`ITEM_TYPES`) · `packages/schema/src/item.ts`(`ITEM_DATA`)
- **고칠 방향**: 🔴 **93 과 같은 게이트다. 세는 상수를 셋째로 늘리지 마라.**
  89 가 `PACK_ENFORCEMENT_MIN` 을 만들었고 93 이 `SourceRef`·`scope.kind` 를 더한다.
  여기까지 오면 축이 넷이다 — 「데모가 이 표의 몇 갈래를 보여 주나」를 **표 하나**
  (`Record<축이름, {값들, 최소치, 왜}>`)로 모으고 관통이 그 표를 **읽기만** 하게 해라.
  안 그러면 표가 늘 때마다 관통에 검사 한 벌씩 복사된다 (`CLAUDE.md` 「확장은 표에 한 줄」).
  ⚠ **최소치를 10종 전부로 잡지 마라.** `adr`·`workflow` 는 원문이 없고, 원문 없이
  채우면 P7 이 깨진다. 표의 각 줄에 **「지금 몇 갈래이고 왜 그 수인가」**를 적어라 —
  89 가 `permission`·`none` 을 비워 둔 이유를 상수 옆에 적은 것과 같은 모양이다.
- **상태**: ✅ `8b96ef5` — **종이에 서는 타입 5 → 7 · Pack 파일 4 → 6.**
  ⚠ **커밋 `8b96ef5` 의 메시지는 Pack 파일을 「5 → 7」로 적었는데 틀렸다.** manifest 를
  직접 세면 **4 → 6** 이다(`.claude/rules/` 5개 + `CLAUDE.md`). 93 의 「4 → 5」를
  안 세고 이어 적어서 났다 — **95 가 고친 고장(숫자를 안 재고 이어 적기)과 같은 종류다.**
  🔴 **이 항목이 적은 고칠 방향 하나가 틀렸다 — `open_question` 은 §5 에 원문이 있어도
     Pack 에 절대 안 선다.** `compiler/src/partition.ts:118` 이 그 타입을 `exclude` 로
     보낸다(「답이 없는 질문을 규칙처럼 배포하지 않는다」 — 고장이 아니라 설계다).
     그래서 **이 축의 최대치는 10 이 아니라 9** 이고, 씨앗에 넣어 봐야 축이 안 움직인다.
     그 이유를 `PACK_COVERAGE` 의 그 줄 옆에 적었다 — 다음 사람이 넣어 보고
     「왜 안 오르지」로 한 바퀴를 쓰지 않게.
  ① **`architecture` 5종** — goals.md §7 「아키텍처 한 장」의 다섯 줄을 그대로 올렸다
     (payment·psp·webhook·refund·ledger). CLAUDE.md 에 `## Quick Map` 절이 서고
     `.claude/rules/architecture.md` 라는 **Pack 파일 갈래 하나가 처음 생겼다.**
     ★ 다섯을 다 넣은 이유 — §7 은 **한 장짜리 그림**이다. 둘만 넣으면 Quick Map 이
       그림의 일부만 그리고, 빠진 셋이 없는 건지 안 옮긴 건지 심사자가 모른다.
     ★ `ARCHITECTURE` **표 하나**로 모았다 (다섯이 글자만 다르고 모양이 같다).
       구성요소를 하나 더하는 절차는 「이 표에 한 줄」이다.
  ② **`domain` 1종** — goals.md §6 용어 표에서 왔다 (`domain-payment.md`).
     glossary 5개·불변식 2개가 전부 그 표 안에 **글자 그대로** 있다.
     ⚠ `scope.kind='domain'` 이 만드는 `domain-refund.md` 와 **다른 축**이다 —
     이제 두 파일이 나란히 나와서 두 축이 이름만 같다는 것이 종이에서 보인다
     (그리고 그 나란함이 **97** 을 드러냈다).
  ③ **경로를 적지 않고 잰다** — `fixtureDir()` 이 `fixtures/paylab-api/src/{component}`
     가 정말 있는지 보고 없으면 던진다. 손으로 적으면 픽스처가 바뀌었을 때 조용히
     없는 폴더를 가리킨다 (90 과 같은 고장의 **코드 쪽 판**).
  **축을 늘리지 않았다** — 93 이 만든 `PACK_COVERAGE` 의 ItemType 줄 `min` 을 5 → 7 로
  올린 것이 전부다. 관통(`walkthrough-publish.ts`)은 한 줄도 안 고쳤다.
  🔴 **빨개지는 것을 두 번 봤다**: ① 구성요소 이름을 없는 폴더로 바꾸니
  「`paylab-api/src/ledgerX` 폴더가 픽스처에 없다」로 씨앗이 던졌다 ② architecture 항목을
  빼니 「Pack 이 항목 종류(ItemType) 를 **6갈래**로 보여 준다 (최소 7) — 없는 갈래:
  architecture · adr · workflow · open_question」로 FAIL · exit 1.
  잰 것: 씨앗 항목 9 → 15 · 관통 검사 639개(단계별로 그대로 · 새 `check()` 를 안 더했다).
  📎 눈 판정: `docs/evidence/2026-09-04-itemtype-coverage/` (`.ci/` 밖 · Pack 사본 3개)

### 96. 관통 스크립트 셋이 `check()` 를 **각자 복사해서 들고 있다**   [격차]
- **증상**: `walkthrough-publish.ts:45` · `walkthrough-payload.ts:42` ·
  `walkthrough-sync.ts:34` 가 **글자까지 같은** 6줄
  (`const checks: {name;ok;detail}[]` + `function check()`)을 각각 들고 있다.
  「검사 N개 · 실패 M개」를 찍는 줄도 둘이 따로 적혀 있고 publish 는 아예 안 찍는다.
  95 를 고치면서 관통(`tools/walkthrough.ps1`)이 **그 JSON 의 `checks` 모양에
  의존**하게 됐는데, 그 모양의 정본이 되는 파일이 없다 — 한 곳만 이름을 바꾸면
  그 단계는 조용히 「검사 수를 못 셌다」로 FAIL 한다(게이트가 잡기는 한다).
- **근거**: 이번 바퀴 직접 확인.
  `grep -n "function check" apps/web/scripts/*.ts plugin/contextops/scripts/*.ts` → 3곳.
  세 파일의 산출물 키는 각각 `{checks, coverage, versions, pack_dir}` ·
  `{checks, failed}` · `{at, pack, checks}` 로 **`checks` 만 같고 나머지가 다르다**.
- **정본**: `CLAUDE.md` 「개념 하나 = 정본 파일 하나」 · `tools/walkthrough.ps1`(단계 표)
- **고칠 방향**: 관통 단계가 공유하는 것은 **`check()` 와 그 산출물 모양** 둘이다.
  ⚠ 그런데 세 파일은 **패키지가 둘**이다(`apps/web` · `plugin/contextops`).
  공용 자리를 만들려면 `packages/schema` 나 새 패키지가 되는데, 그건 **의존 방향**
  (`schema ← compiler ← web/plugin`)에 개발 도구를 얹는 것이다 — 값이 그만한지 먼저 재라.
  값싼 갈래는 `checks` 배열의 모양만 `packages/schema` 의 타입 하나로 못 박고
  (그건 이미 계약이 사는 자리다) `check()` 복사는 그대로 두는 것이다.
  ⚠ **셋을 하나로 합치겠다고 관통 스크립트를 한 파일로 모으지 마라** — 단계가 갈라져
  있는 것이 관통의 계약이다 (`walkthrough.ps1` 의 단계 표).
- **상태**: 대기

### 97. `domain-{slug}.md` 가 **어느 도메인인지 본문에 한 번도 안 적는다**   [구멍]
- **증상**: `.ci/walkthrough-pack/.claude/rules/domain-refund.md` 를 열면 본문이
  「`# 도메인`」 → 「`## 이 도메인의 규칙`」 → 규칙 한 줄이다. **「refund」라는 낱말이
  파일 안에 하나도 없다.** 어느 도메인인지 아는 길은 **파일 이름뿐**이고, Pack 을
  붙여넣기·인용·발췌하는 순간(심사자가 화면에 한 파일만 띄우는 순간) 사라진다.
  ⚠ **94 를 고치기 전에는 이게 안 보였다.** 이번에 `domain-payment.md` 가 옆에 생겼는데
  그 파일은 `## payment` 로 이름을 적는다 — 같은 갈래의 파일 둘이 **한쪽만 이름을 말한다.**
- **근거**: 이번 바퀴 눈 판정. 사본 두 개를 `.ci/` 밖에 뒀다 —
  `docs/evidence/2026-09-04-itemtype-coverage/domain-refund.md`(이름 없음) 와
  같은 폴더의 `domain-payment.md`(`## payment` 있음).
  ⚠ 원인은 명확하다: 이름을 찍는 자리가 **`domain` ItemType 항목의 절 하나뿐**이다
  (`compiler/src/sections.ts:155` → `## ${d.name}`). `scope.kind='domain'` 만 있고
  그 도메인의 `domain` 항목이 없으면 이름을 찍을 사람이 아무도 없다.
  `templates/index.ts` 의 `DOCS.domain.head` 는 **일부러** 이름을 안 적는다
  (「제목은 절이 갖는다 — 머리말에 또 적으면 같은 이름이 두 줄 겹친다」).
  그 판단은 `domain` 항목이 **있을 때**만 맞다.
- **정본**: `packages/compiler/templates/index.ts`(`DOCS.domain`) ·
  `packages/compiler/src/sections.ts`(`domain` 절) · `docs/SPEC.md` §4.2 — **P7 은 아니다**
  (태그는 멀쩡하다. 사람이 읽는 종이에서 **무엇에 관한 규칙인지**가 빠진 것이다)
- **고칠 방향**: 머리말이 이름을 아는 재료를 **이미 들고 있다** — `DocVars.title` 이
  `byScope()` 에서 채워진다(`partition.ts:83`). 그런데 `head` 가 안 쓴다.
  ⚠ **「무조건 머리말에도 찍기」로 고치지 마라** — 그러면 `domain` 항목이 있는 파일에서
  이름이 두 줄 겹친다(주석이 경고하는 그것이다). 겹치지 않게 하는 길이 둘이다:
  ① 머리말을 `# 도메인 — {title}` 로 하고 절의 `## {name}` 은 그대로 둔다
     (겹쳐 보이지만 층이 다르다 — 다른 Pack 파일의 머리말과 모양이 같아진다) ·
  ② `domain` 항목이 없을 때만 머리말이 이름을 찍는다 (조건이 늘어난다 — 값싸지 않다).
  ①이 값싸고 다른 문서(`scoped` 는 이미 `# 경로 규칙 — {title}` 이다)와 **모양이 같다.**
  ⚠ 템플릿을 고치면 `TEMPLATE_VERSION` 을 올리고 golden 의 expected 를 갱신한 이유를
  커밋 메시지에 적어라 (`loop/PROMPT.md` ⑤).
- **상태**: ✅ `7ba2feb` — ①로 고쳤다. `# 도메인 — refund` · `# 도메인 — payment`.
  🔴 **이 지적은 세 번째다 — 30(9바퀴) → 91(39바퀴) → 97(43바퀴).** 셋 다 같은 줄이고
  셋 다 「고칠 방향」까지 같았다. 세 바퀴가 **적기만 하고 안 고쳤다.** 그래서 이번에는
  고치고 **게이트로 올렸다** (`CLAUDE.md` 「같은 지적이 두 번 나오면 규칙이 아니라 게이트로」).
  게이트는 `packages/compiler/test/naming.test.ts` 이고 재는 것이 둘이다:
  ① **표에서 대상을 찾는다** — `DOCS[id].path('a') !== DOCS[id].path('b')` 인 문서,
     즉 **파일 이름이 정보를 나르는 문서**가 전부 대상이다. 이름으로 목록을 들지 않는다
     (목록을 손으로 들면 다음 문서 종류에서 똑같이 빠진다 — 이게 세 번 난 이유다).
     그 문서의 `head` 가 `title` 을 적는지 본다. ⚠ `paths` 를 제목과 **다르게** 줘서
     scoped 의 frontmatter 가 우연히 초록을 만드는 것을 막았다.
  ② **91·97 의 조건을 그대로 컴파일한다** — `scope.kind:'domain'` 규칙만 있고 그 도메인의
     `domain` 항목은 없는 snapshot. 이름을 적을 사람이 아무도 없던 바로 그 경우다.
  🔴 **빨개지는 것을 봤다**: `head` 를 옛 모양(`'# 도메인'`)으로 되돌리니 2개 FAIL
  (머리말 시험 + 컴파일 시험). 표에서 찾으므로 `scoped` 도 같이 잠긴다.
  `TEMPLATE_VERSION` **1.1 → 1.2** · golden 3케이스의 `input.json` 도 같이 올렸다
  (`CompileInput.templateVersion` 이 `z.literal` 이라 안 올리면 INVALID_INPUT 이다).
  golden 이 바뀐 것은 domain 파일 3개의 **첫 줄과 그 sha256·manifest_hash** 뿐이다.
  CI: principles OK · typecheck OK · test OK · build OK · walkthrough 검사 **644개** → GREEN.
  📎 눈 판정: `docs/evidence/2026-09-05-domain-name/` (`.ci/` 밖 · 사본 3개)

### 98. 아키텍처 다섯 줄이 §7 그림의 **흐름 순서를 잃고 이름 순**으로 나온다   [격차]
- **증상**: 새로 선 `## Quick Map` 과 `.claude/rules/architecture.md` 의 다섯 줄 순서가
  **ledger → payment → psp → refund → webhook** 이다. 원문(goals.md §7)은
  **payment → psp → webhook → refund → ledger** 로 **돈이 흐르는 순서**이고, 그 순서가
  그 문단의 뜻이다(「`payment` 는 PSP 를 직접 부르지 않고 `psp` 를 거친다」).
  종이에서는 그 화살표가 사라지고 알파벳 목록이 된다.
- **근거**: 이번 바퀴 눈 판정 — `docs/evidence/2026-09-04-itemtype-coverage/CLAUDE.md`
  24–29줄. 원인은 정렬이다: `compiler/src/sort.ts:16` 이 `priority` → `scope` →
  `title` 순으로 재는데 씨앗의 다섯 항목이 **전부 `priority: 60`** 이라
  (`seed.ts` `fromDoc` 의 기본값) 제목 코드포인트 순으로 떨어진다.
- **정본**: `docs/SPEC.md` §4.1 3단계(정렬) · `packages/compiler/src/sort.ts`
- **고칠 방향**: **컴파일러를 고치지 마라 — 정렬은 P4 의 심장이고 지금 맞다.**
  순서를 말하는 자리는 이미 있다: `priority` 다. 씨앗의 `ARCHITECTURE` 표에 우선순위
  칸을 더하고 §7 그림 순서대로 내림차순으로 주면 된다 (표에 한 줄 더하는 모양 그대로).
  ⚠ 그러면 「우선순위」라는 낱말이 **중요도**가 아니라 **읽는 순서**로 쓰이게 된다 —
  그게 이 필드의 뜻이 맞는지 SPEC §3 을 먼저 읽어라. 아니면 이 항목은 **닫지 말고
  「그 값은 그런 뜻이 아니다」로 남겨라** (억지로 고치면 다음 사람이 더 헷갈린다).
- **상태**: 대기

### 99. 아키텍처 블록이 **같은 문장을 연달아 두 번** 적는다 — 네 줄이 사실 둘이다   [격차]
- **증상**: `.claude/rules/architecture.md` 의 다섯 블록이 전부 이 모양이다 —
  ```
  ### ledger — append only 다. 여기서 계산이 틀리면 정산이 틀린다
  - 구성요소: `ledger`
  - 책임: append only 다. 여기서 계산이 틀리면 정산이 틀린다
  ```
  **네 줄이 말하는 사실은 둘**(구성요소 이름 · 책임)이고, 둘 다 **글자까지 똑같이**
  두 번 나온다. 사람이 읽으면 「왜 같은 말을 또 하지」로 읽히고, agent 에게는 같은
  문장을 두 번 실어 보내는 것이다. 다섯 블록 × 두 겹 = 종이의 절반이 메아리다.
- **근거**: 이번 바퀴 눈 판정 — `.ci/walkthrough-pack/.claude/rules/architecture.md`
  (사본: `docs/evidence/2026-09-05-domain-name/` 옆 바퀴 것은 `2026-09-04-itemtype-coverage/`).
  원인은 **씨앗의 제목**이다: `apps/web/scripts/seed.ts:396` 이
  ``title: `${component} — ${responsibility}` `` 로 제목을 만들고,
  절 템플릿(`compiler/src/sections.ts:115`)은 `### {title}` 과 `- 구성요소:` ·
  `- 책임:` 을 **각각** 낸다. 둘 다 혼자서는 맞다 — 겹치는 것은 조합이다.
- **정본**: `docs/SPEC.md` §10.1(paylab 픽스처) · `packages/compiler/src/sections.ts`
  (`architecture` 절) — **P7 은 아니다** (태그는 멀쩡하다)
- **고칠 방향**: 갈래가 둘이고 **씨앗 쪽이 값싸다.**
  ① 씨앗의 `ARCHITECTURE` 표에 **제목 칸을 더한다** — 사람이 읽는 한 줄
     (예: 「원장은 append only」)로 두면 `### 제목` 과 `- 책임:` 이 서로 다른 말을 한다.
     ⚠ 제목은 근거 원문일 필요가 없다 (P7 은 **줄의 태그**를 요구하지, 제목의 출처를
     요구하지 않는다). 표에 칸 하나 = 「표에 한 줄」 모양 그대로다.
  ② 템플릿에서 `- 구성요소:`/`- 책임:` 중 하나를 뺀다 — **이 갈래를 먼저 고르지 마라.**
     제목이 「구성요소 — 책임」인 것은 **이 픽스처의 선택**이고, 다른 팀의 항목은
     제목이 다를 수 있다. 템플릿을 씨앗에 맞춰 깎으면 다음 팀의 종이가 얇아진다.
  ⚠ ①을 하면 golden 은 **안 깨진다**(golden 입력은 별도 파일이다) — 관통 Pack 만 바뀐다.
- **상태**: 대기

### 98-B. 2-B 이번 라운드 — `DocId` 7종 · `SectionKey` 12종 다 살아 있다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
  ★ 이번에는 **schema 의 표 말고 컴파일러의 표**를 돌았다 — 지금까지 라운드가
  `packages/schema` 쪽에만 몰려 있었고, 이번 바퀴에 고친 것(97)이 바로 그 표였다.
- **근거**: 이번 바퀴 직접 확인 — 둘 다 **②단계(값을 바꾸면 결과가 달라지나)까지** 통과한다:
  ① **`DocId` 7종** (`templates/index.ts` 의 `DOCS`). 일곱이 전부 **다른 파일 경로**를
     내고, 여섯은 한 번의 컴파일에서 같이 나온다 — `CLAUDE.md` ·
     `.claude/rules/{architecture,decisions,workflow}.md` · `domain-*.md` · `scoped-*.md`.
     일곱째 `policies` 는 **CLAUDE.md 가 12,000자를 넘을 때만** 나오고, 그 경우가
     golden `case-3-overflow` 에 있다 (`expected/.claude/rules/policies.md`).
     ⚠ 즉 「평소 컴파일에 안 나온다」가 「죽었다」가 아니다 — **조건이 있는 문서**다.
  ② **`SectionKey` 12종** (`src/sections.ts` 의 `SECTIONS`). 열둘이 전부
     ⓐ `DOCS` 의 어떤 slot 에 있고(슬롯에 없는 절 **0개**) ⓑ `PARTITION` 이 실제로
     항목을 보내는 절이다(아무 항목도 못 가는 절 **0개**). 줄 모양도 서로 다르다 —
     같은 `architecture` 항목이 `quickmap` 에서는 한 줄(`- ledger: …`)이고
     `architecture` 절에서는 네 줄 블록이다. `adr` 도 요약/전문 둘로 갈린다.
     ⚠ 하나 예외를 적어 둔다: `scoped_rule` 의 렌더는 `policy`·`constraint` 절과
     **같은 함수**를 부른다 (`sections.ts:180` 의 주석이 그 이유를 적어 뒀다).
     그 절이 다른 것은 **줄 모양이 아니라 파일**이다 — `scope.kind` 가 그 갈래를 잠근다
     (`liveness.test.ts` 「3종이 서로 다른 파일로 간다」).
- **정본**: `packages/compiler/templates/index.ts` · `packages/compiler/src/sections.ts`
- **상태**: 기록 — 고칠 것 없음

### 97-B. 2-B 이번 라운드 — `MILESTONE_STATUSES` 4종은 살아 있다 · `PROGRESS_SOURCES` 3종은 **85-B 그대로**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인.
  ① **`MILESTONE_STATUSES` 4종 — ②단계까지 통과한다.** 소비처의 정본은
     `lib/api/progress.ts:72`(`RANK` — `Record<MilestoneStatus, number>` 라 한 줄만
     빠져도 타입 검사가 막는다)이고 `rollupMilestone()` 이 그 표만 읽는다.
     네 값이 전부 **실제로 나온다**: 보고가 없으면 `not_started`(`:86` 초기값) ·
     `PROGRESS_EFFECT` 가 `in_progress`·`done_candidate` 를 내고 ·
     `done` 은 **표 밖에서** 온다(`:88` — `confirmedAt !== null` 이면 무조건 `done`).
     🔴 `done` 이 `PROGRESS_EFFECT` 에 **없는 것**이 P5 의 자리다 — agent 는 스스로
     완료를 선언하지 못하고 owner 의 `POST /progress/{id}/confirm` 이 있어야 한다
     (`confirm/route.ts:41` 이 `done_candidate` 아닌 보고의 확정을 막는다).
     시험이 넷을 다 잰다: `progress-rollup.test.ts:50`(빈 목록 → `not_started`) ·
     `:24`(값마다 갈림) · `:35`·`:36`(같은 보고가 확정 전후로 갈린다).
     소비자는 `roadmap/route.ts:90` 하나다 — **화면은 아직 없다** (PLAN 「웹 화면 6·8」).
  ② **`PROGRESS_SOURCES` 3종 — 값으로 갈리는 코드가 여전히 0곳이다** (85-B 그대로).
     ①단계는 지난다: `upload.ts:144`(z.enum — 모르는 값을 막는다) ·
     `db/schema.ts:155`(pgEnum) · `cli/progress.ts:38`(도움말 — 표시용이라 뺀다).
     ②단계에서 멈춘다: 값을 읽는 코드가 `lib/api/progress.ts:23`(컬럼 나열) 과
     `toProgressEvent()` 의 **그대로 되돌려주기**뿐이다. 세 값 어느 것으로 바꿔도
     저장되고 그대로 나온다 — **갈리는 곳이 없다.**
     ⚠ 그런데 **쓰는 자리는 둘이 진짜로 있다**: `hook`(`plugin/contextops/scripts/stop.mjs:166`) ·
     `agent`(`cli/progress.ts:98` 기본값). `manual` 만 쓰는 자리가 없다.
     🔴 **새 항목을 만들지 않는다 — 이건 죽은 표가 아니라 「읽을 화면이 아직 없는」 것이다.**
     이 값을 읽을 자리는 화면 8(Realtime)의 「무엇이 이 보고를 만들었나」이고
     `docs/PLAN.md` 「웹 화면 6·8 — Proposal · Roadmap · Realtime」이 `- [ ]` 로 있다.
     8·69 와 같은 갈래다. **그 행을 할 때 이 셋이 화면에서 갈리는지 같이 잠가라.**
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: 에러 코드 9종(94-B 가 후보로 적었는데 아직 안 쟀다) ·
  `SYNC_LIMITS`/`SCAN_LIMITS` 상수 · `CONFLICT_CHOICES` 4종 · `AI_JOB_STATUSES`
  (`ItemType`·sync 상태는 94-B · `ITEM_STATUSES`·`PACK_TARGETS` 는 95-B ·
  `CONFLICT_KINDS`·`PROGRESS_STATUSES` 는 96-B 가 닫았다)
- **상태**: [기록]

### 96-B. 2-B 이번 라운드 — `CONFLICT_KINDS` 6종 · `PROGRESS_STATUSES` 4종 다 살아 있다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 — 둘 다 **②단계(값을 바꾸면 결과가 달라지나)까지** 통과한다:
  ① **`CONFLICT_KINDS` 6종.** 정본 표는 `schema/src/api.ts:261`(`CONFLICT_KIND_RULES` ·
     `as const satisfies Record<ConflictKind, …>` 라 한 줄만 빠져도 타입 검사가 막는다)이고,
     그 표에서 **타입으로 파생되는** 목록이 둘이다 — `DETECTED_CONFLICT_KINDS` 4종
     (`api.ts:321`)과 `QUESTION_CONFLICT_KINDS` 2종(`api.ts:316`). 손으로 다시 안 적는다.
     갈래마다 다른 것을 낸다: `lib/ai/conflict.ts:120`(§7.2 도구 스키마의 enum 과
     종류별 hint — `detected:false` 는 아예 안 실린다) ·
     `questions/route.ts:40`(질문 카드는 `QUESTION_CONFLICT_KINDS` 만) ·
     `components/chips.tsx:150`(칩 라벨·아이콘) · `db/schema.ts:142`(pgEnum).
     `anchor` 도 셋으로 갈린다(`items` 4 · `document` 1 · `none` 1).
     시험이 ②단계를 잰다: `web-tables.test.ts:67`(6종이 **서로 다른** 칩을 낸다) ·
     `web-conflict-card.test.ts:182·246·286`(detected 인가 아닌가로 카드가 갈린다) ·
     `api-routes.test.ts:618`(질문 카드에 탐지 종류가 안 섞인다).
  ② **`PROGRESS_STATUSES` 4종.** 소비처의 정본은 `lib/api/progress.ts:64`(`PROGRESS_EFFECT`
     — 보고 상태가 마일스톤 상태로 어떻게 접히나)이고 `rollupMilestone()` 이 그 표만 읽는다.
     `progress-rollup.test.ts:28` 이 「네 값이 **세 갈래**로 갈린다」를 잰다
     (`in_progress`·`criterion_done` → `in_progress` · `done_candidate` → `done_candidate` ·
     `none` → `not_started`). 둘이 같은 결과로 접히는 것은 **의도**이고 표에 이유가 적혀 있다
     (완료 조건 하나가 끝난 것은 아직 마일스톤이 끝난 게 아니다).
     🔴 표에 `done` 이 **없는 것**이 P5 의 자리다 — 보고만으로는 done 이 안 되고
     owner 의 `confirm` 이 있어야 한다. `:32` 가 그걸 잰다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `MILESTONE_STATUSES` 4종 · `PROGRESS_SOURCES` 3종(85-B 가
  「아무도 안 읽는다」로 적었다 — **다시 재라**) · `SYNC_LIMITS`/`SCAN_LIMITS` 상수
  (`SOURCE_DOCUMENT_KINDS` 는 82·65·81-B 가 이미 「골라도 같다」로 닫아 뒀다 —
  같은 것을 또 캐지 마라)
- **상태**: [기록]

### 94-B. 2-B 이번 라운드 — `ItemType` 10종은 살아 있다 · sync 상태 5종은 **69 그대로**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인.
  ① **`ItemType` 10종 — ②단계까지 통과한다.** 소비처가 갈래마다 다른 것을 낸다:
     `schema/src/item.ts:139`(`ITEM_DATA` — 타입마다 다른 `.strict()` data 스키마 ·
     `satisfies Record<ItemType, …>` 라 한 줄만 빠져도 타입 검사가 막는다) ·
     `compiler/src/partition.ts`(어느 Pack 파일로 갈 것인가) · `compiler/src/sections.ts`.
     `compiler/test/liveness.test.ts:33` 이 **10종을 하나씩 넣어 산출물 지문이 서로
     전부 다른지**를 잰다(`allDistinct`) — 「두 타입이 같은 줄을 내면 하나는 죽은 것」.
     더하는 절차 5단계도 `ITEM_DATA` 표 옆 주석에 적혀 있다.
     ⚠ **살아 있는 것과 데모가 보여 주는 것은 다른 질문이다** — 뒤의 것이 **94** 다.
  ② **sync 상태 5종 — 69 에서 달라진 것이 없다.** 다시 쟀다:
     `grep -rn "'manual'" plugin/contextops/src` → **0건**(여전히 아무도 안 찍는다) ·
     찍는 자리는 `cli/managed.ts:145·163·168·171·174`(`unknown`·`modified`·`applied`×2·
     `outdated`) · 서버는 `lib/api/sync.ts:16` 의 `NO_REPORT_STATUS='unknown'` 하나.
     🔴 **새 항목을 만들지 않는다 — 69 가 이미 그 자리에 있다.** 69 는 고장이 아니라
     **제품 결정 대기**다(「Pack zip 을 내려받는 길을 만드나」). 같은 것을 또 캐지 마라.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: 에러 코드 9종 · `ITEM_STATUSES` 4종 · `PACK_TARGETS` 3종
  (`enforcement` 4종은 88-B, `SourceRef`·`scope.kind` 는 93-B, `confidence` 는 91-B 가 닫았다)
- **상태**: [기록]

### 95-B. 2-B 이번 라운드 — `ITEM_STATUSES` 4종은 살아 있다 · `PACK_TARGETS` 3종은 **8 그대로**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인.
  ① **`ITEM_STATUSES` 4종 — ②단계까지 통과한다.** 소비처가 셋이고 갈래마다 다른 것을 낸다:
     `schema/src/common.ts:37`(`ITEM_STATUS_EXCLUDE_REASON` — `active` 만 `null`) ·
     `compiler/src/partition.ts:129`(그 표로 Pack 에서 뺀다) ·
     `components/item-status-actions.tsx`(누르면 다음 Pack 이 어떻게 되는지).
     `apps/web/test/web-item-status.test.ts:62` 가 **「네 상태가 서로 다른 화면을 낸다」**를
     지문으로 재고(`new Set(drawn).size === 4`), `:57` 이 「네 상태에 전부 갈 수 있나」를 잰다.
  ② **`PACK_TARGETS` 3종 — 나오는 것은 `claude` 하나다.** 값은 컴파일러 →
     manifest → DB 까지 실려 가지만(`assemble.ts:155` · `publish.ts:189` ·
     `db/schema.ts:473`) **그 값으로 갈리는 코드가 없다.**
     🔴 **새 항목을 만들지 않는다 — FINDINGS 8 이 이미 그 자리에 있고 게이트도 서 있다.**
     `compiler/test/liveness.test.ts` 가 `['claude']` 를 못 박고 주석에
     「P5 행을 하면 여기가 빨개진다 — 그때 이 시험을 고치면서 FINDINGS 를 닫아라」라고
     적혀 있다. 이건 **죽은 표가 아니라 아직 안 만든 기능**이다 (docs/PLAN.md P5).
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `CONFLICT_KINDS` 6종 · `CONFLICT_CHOICES` 4종 ·
  `SOURCE_DOCUMENT_KINDS` · `AI_JOB_STATUSES`
  (에러 코드·`confidence` 는 91-B · `enforcement` 는 88-B · `SourceRef`·`scope.kind` 는
  93-B · `ItemType`·sync 상태는 94-B 가 닫았다)
- **상태**: [기록]

### 90. 픽스처의 **근거 범위가 원문을 안 가리킨다** — 역추적을 따라가면 그 문장이 없다   [구멍]
- **증상**: `seed.ts` 의 `fromDoc()` 이 **모든** 항목에 같은 근거를 붙인다 —
  `start_char: 0, end_char: 400`, `heading_path: ['paylab 결제 서비스']`.
  그래서 Pack 의 역추적 태그가 전부 `src:doc:<uuid>#0-400` 이다. **일곱 중 여섯은 그 범위
  안에 그 항목이 주장하는 문장이 없다.** 맞는 하나(`item_mission_paylab`)도 범위가 넓어서
  우연히 들어온 것이다. 제일 아픈 것은 `item_road_m1` — 근거가 **폐기된 `old-roadmap.md`**
  를 가리키는데 내용(`M1 — 재시도 정책 통일` · `paths: src/payment`)은 `goals.md` §4 의
  M1 이다. 그 문서의 M1 은 「웹훅 수신 v1」이고 경로도 `src/webhook/` 다. **문서가 다르다.**
- **근거**: 이번 바퀴에 문서에서 문장 위치를 직접 찾아 쟀다 —
  `docs/evidence/2026-09-04-fixture-offsets/offsets.md` (표 하나 · `.ci/` 밖이다).
  예: 「최대 5회까지 재시도」는 goals.md **856자**, 「24시간 안에 종결」은 **1154자**,
  「어떤 로그에도」는 **1437자**인데 셋 다 근거는 0–400 이라고 적혀 있다.
  ⚠ 이번 바퀴가 더한 `item_policy_pii_log` 도 **일부러 같은 자리를 가리키게 뒀다** —
  하나만 정확하게 만들면 나머지 여섯이 안 보인다. 일곱 줄을 한 번에 고쳐라.
- **정본**: `docs/SPEC.md` §10.1(픽스처) · §3(SourceRef) — **P7**.
- **고칠 방향**: `fromDoc()` **하나**를 고친다 — 지금 근거를 손으로 적는 자리가 거기뿐이다.
  받는 인자에 **원문에서 찾을 문장**을 더하고 `start_char` 를 `문서.indexOf(문장)` 으로
  계산해라. 못 찾으면 **던져라** — 조용히 0 으로 떨어지면 지금과 같은 상태가 된다.
  `item_road_m1` 은 근거 문서를 `goalsVersion` 으로 옮기는 게 맞다 (내용이 거기서 왔다).
  ⚠ **게이트를 같이 올려라.** 관통은 지금 「태그가 붙어 있나」(`untagged === 0`)까지만 세고
  **「그 태그를 따라가면 그 문장이 있나」는 아무도 안 센다.** 발표 2:40 이 「Pack Explorer
  역추적」이다 (SPEC §10.5) — 심사자가 한 번만 따라가 보면 걸린다.
- **상태**: ✅ `800372f` — **일곱 줄을 한 번에 고쳤다.** `fromDoc()` 이 이제
  **문장을 받아 위치를 잰다** — `문서.indexOf(quote)` 로 `start_char` 를 계산하고,
  `heading_path` 도 그 위치의 제목 사슬로 계산한다 (손으로 적은 `['paylab 결제 서비스']`
  일곱 개가 사라졌다). 못 찾거나 **두 번 이상** 나오면 던진다 — 어느 쪽을 뜻했는지
  우리가 모르면 심사자가 따라갔을 때 우리 자리가 아닐 수 있다.
  `item_road_m1` 은 근거 문서를 `goals.md` §4 로 옮기고 **제목·경로·완료 기준도
  그 문단이 말하는 것으로** 맞췄다 — 근거만 옮기고 글자를 두면 태그는 맞는 자리를
  가리키는데 읽어 보면 딴 소리가 적혀 있다.
  **관통이 들고 있던 둘째 `fromDoc()` 사본도 지웠다** — 제안 초안(`item_goal_settlement`)
  도 씨앗과 같은 문으로 만든다. 근거를 손으로 적는 자리가 둘이면 한 곳만 고쳐진다.
  **게이트를 올렸다** — 관통이 태그의 `doc:<uuid>#start-end` 를 **원문 파일에서
  잘라 보고** 그 안에 그 문장이 있는지를 센다 (`followEvidence()` · 근거 14개 · 항목 8개).
  기대 문장은 씨앗이 내는 `SeedResult.evidence` 를 **읽기만** 한다 — 검사 쪽에
  다시 적으면 픽스처를 고친 사람이 검사 쪽 문장을 고쳐서 초록을 만든다.
  `start_char: 0, end_char: 400` 을 되돌려 넣어 **실제로 빨개지는 것을 봤다** —
  12곳 FAIL · `item_mission_paylab` 하나만 통과(0-400 이 넓어서 우연히 들어왔다).
  📎 근거: `docs/evidence/2026-09-04-evidence-follow/follow.md` — 여덟 줄의 태그를
  전부 따라가 원문을 잘라 뒀다 (`.ci/` 밖이다).

### 89. 데모 Pack 이 `ENFORCEMENT_LABEL` **넷 중 하나만** 보여 준다   [격차]
- **증상**: 관통이 낸 Pack 세 파일에 있는 정책 줄이 전부 `강제: 리뷰에서 본다` 다.
  나머지 셋(`Hook 이 막는다` · `권한 설정으로 막는다` · `강제 수단 없음 — 사람이 지킨다`)은
  **사람이 읽는 산출물에 한 번도 안 나온다.** 죽은 코드는 아니다 — 아래 88-B 가 재듯이
  네 값이 다 Pack 을 바꾸고 시험이 그걸 잠근다. 그런데 **심사자가 실제로 읽는 종이에는
  한 갈래만 있다.** 「이 정책을 무엇이 강제하나」가 제품의 말인데, 그 말이 네 갈래라는 것을
  데모가 안 보여 준다.
- **근거**: 이번 바퀴 2-B 에서 밟았다. `.ci/walkthrough-pack/` 세 파일의 정책 줄 3개가
  전부 `강제: 리뷰에서 본다`. 출처는 `apps/web/scripts/seed.ts:78`·`:98` 둘 다
  `enforcement: 'review'` 다. 쓰는 자리는 셋인데(`batch-draft` · `jobs/items` ·
  `questions`) 그중 `questions` 길은 `seed-questions.ts:66` 이 **`'review'` 로 못 박는다**
  (그 주석의 판단은 맞다 — 사람이 말로 답한 것을 hook 이 강제한다고 적으면 거짓이다).
  남는 길은 플러그인 초안뿐이고 픽스처가 그 값을 안 쓴다.
- **정본**: `docs/SPEC.md` §10.1(paylab 픽스처) · `packages/compiler/src/sections.ts`
  (`ENFORCEMENT_LABEL`)
- **고칠 방향**: `seed.ts` 의 정책 둘 중 하나를 `hook` 으로 바꾸는 것이 제일 싸다 —
  paylab 서사에 맞는 것이 있다(`item_policy_retry` 는 리뷰가 맞고, **PAN·CVC 를 로그에
  안 남긴다** 같은 제약은 hook 이 막는 쪽이 사실이다). ⚠ **서사와 안 맞는 값을 억지로
  넣지 마라** — 데모가 거짓말을 하면 「강제 수단」이라는 말 자체를 못 믿게 된다.
  값을 바꾸면 `.ci/walkthrough-pack/` 의 golden 이 따라 바뀌는지 확인해라.
- **상태**: ✅ `5858fbb` — **값을 바꾸지 않고 항목을 하나 더했다.** 둘 다 고칠 자리가
  맞았지만 `item_policy_retry`·`item_policy_refund` 는 **지금 값이 사실이다**
  (리뷰어가 diff 에서 볼 수 있는 규칙이다). 대신 SPEC §10.1 이 말하는 「의도된 어긋남
  3곳」 중 셋째(**PII 로그 금지** · goals.md §3.3)가 **항목으로 아예 없었다** —
  그걸 `item_policy_pii_log`(`enforcement: 'hook'`)로 더했다. `hook` 인 이유는 그 자리
  주석에 있다: 로그 호출은 저장소에 흩어져 있어 리뷰어가 매번 전부 볼 수 없고,
  자동으로 막을 수 있는 것은 hook 뿐이다.
  ⚠ **`permission`·`none` 은 일부러 안 넣었다.** 픽스처의 모든 줄은 문서까지
  역추적된다(P7) — 갈래를 채우겠다고 goals.md 에 없는 규칙을 씨앗에 적으면 근거 없는
  줄이 생긴다. **넷을 다 보이려면 문서를 먼저 늘려야 한다.** 그 판단을 관통의 기준
  상수(`PACK_ENFORCEMENT_MIN` = 2) 옆에 적어 뒀다.
  **게이트를 올렸다** — 관통 `publish` 단계가 「Pack 이 강제 수단을 몇 갈래로 보여 주나」를
  센다 (`walkthrough-publish.ts`). `liveness.test.ts:72` 는 「네 값이 서로 다른 줄을
  낸다」를 재고 여러 바퀴 초록이었다 — **표가 살아 있는 것과 데모가 그걸 보여 주는 것은
  다른 질문**이고 뒤의 것은 아무도 안 세고 있었다. 네 갈래의 말을 검사 쪽에 복사하지
  않으려고 `ENFORCEMENT_LABEL` 을 `packages/compiler/src/index.ts` 로 내보냈다.
  📎 결과: `.ci/walkthrough-pack/CLAUDE.md` 에 `강제: Hook 이 막는다` 한 줄 ·
  `.claude/rules/domain-refund.md` 에 `강제: 리뷰에서 본다` — **두 갈래가 종이에 있다.**

### 88. `ink-4`(비활성 색)로 그린 **문장**이 다섯 자리에 있다 — 읽으라고 낸 글이 안 보인다   [격차]
- **증상**: `DESIGN_BRIEF` §3 토큰 표에서 `ink-4` 의 용도는 **「비활성」** 한 낱말이다.
  그런데 화면 **다섯 자리**가 그 색으로 읽어야 하는 것을 그린다. 카드 바탕 위 대비가
  1.6:1 이라 발표 영상·인쇄된 심사 자료에서는 **글자가 아예 없는 것과 같다.**
  제일 아픈 둘은 근거 쪽이다 — 하나는 **P1 을 설명하는 문장**이고
  (「코드 본문은 서버에 없습니다」 · 심사 첫 질문의 답이다), 하나는 **P7 을 눈으로 재는 값**이다
  (화면 7 Pack 본문의 줄 번호 — 역추적 태그가 몇 줄째인지 그것으로 센다).
- **근거**: 이번 바퀴 눈 판정에서 86 을 고치다 밟았다 (`b1d2190` — 나도 같은 실수를 했다).
  `grep -rn "ink-4" apps/web/src` 열한 자리 중 **장식이 아닌 것 다섯**:
  ① `components/evidence.tsx:73` 「코드 본문은 서버에 없습니다 — 로컬에서 열어 보세요.」
  ② `packs/[semver]/page.tsx:187` Pack 본문 줄 번호 (`pack-lineno ink-4`)
  ③ `packs/[semver]/page.tsx:120` 파일 sha 앞 4자
  ④ `context/page.tsx:419` 「첫 발행은 등급과 무관하게 v1.0.0 입니다 (SPEC §6).」
  ⑤ `components/chips.tsx:219` `· rev 3`
  (나머지 여섯은 `aria-hidden` 인 `◌` 와 빈 칸 `—` 라 **장식이 맞다.**)
- **정본**: `docs/DESIGN_BRIEF.md` §3 색 표 (`ink-4` = 비활성) · §2-1
- **고칠 방향**: 둘 중 하나만 —
  ① **쓰는 쪽을 고친다** — 다섯 자리를 `meta`(ink-3 · 「라벨·메타·보조」)로 옮긴다.
     제일 싸고, 토큰 표를 안 건드린다.
  ② **표에 값을 더한다** — 「아주 옅은 보조」가 정말 필요하면 `ink-4` 와 `ink-3` 사이의
     토큰을 §3 표에 **먼저 더하고** 쓴다 (`bad-bg` 가 그렇게 들어왔다).
  ⚠ **게이트를 같이 올려라.** `design-tokens.test.ts` 는 지금 「임의 색 리터럴이 없나」만
    센다 — 「비활성 색으로 글자를 그리지 않았나」는 아무도 안 센다. 그래서 여섯 자리가
    조용히 쌓였다. 같은 지적이 두 번 나오면 게이트다 (`CLAUDE.md`).
- **상태**: ✅ `6f06881` — **①(쓰는 쪽을 고친다)** 을 골랐다. 토큰 표는 안 건드렸다:
  「아주 옅은 보조」가 정말 필요한 자리가 다섯 중 하나도 없었다.
  다섯 자리를 `meta`/`ink-3` 로 옮겼고(`chips.tsx` 는 `.ctx-tag` 가 이미 ink-3 라
  클래스를 **뺐다** — 색을 두 곳에 적으면 갈린다), `versions.tsx:51` 의 빈 칸 `—` 에는
  `aria-hidden` 을 붙여 **왜 장식인지를 마크업이 말하게** 했다.
  게이트 두 줄을 `design-tokens.test.ts` 에 올렸다 — ① `.tsx` 의 `className` 에
  `ink-4` 가 있으면 같은 줄에 `aria-hidden` 이 있어야 한다 · ② `globals.css` 의
  `var(--ink-4)` 는 `.ink-4` 유틸리티와 `:disabled` 규칙에만. `evidence.tsx:73` 을
  되돌려 넣어 **실제로 빨개지는 것을 봤다.**
  📎 근거: `docs/evidence/2026-09-04-ink4-contrast/ink4.md` —
  대비를 계산해 뒀다. `ink-4` 는 `surface` 위에서 **1.85:1**(항목 본문의 「1.6:1」은
  어림이었다. 결론은 같다 — AA 4.5:1 은커녕 큰 글자 3:1 도 못 넘는다),
  `ink-3` 은 **8.64:1**.

### 87. 근거 글자가 **어느 문서인지**를 말하지 않는다   [격차]
- **증상**: `SRC_LABEL.source_document` 가 내는 것은 `문서 §결제 › 재시도 · 1240–1520자` 다.
  **문서 이름도 `document_version_id` 도 없다.** 화면 3(방금 올린 문서 하나)에서는
  안 헷갈리지만, 화면 5·7 에서는 항목마다 **다른 문서**에서 온 근거가 나란히 놓인다 —
  그때 「문서 §보안 · 2100–2260자」 둘은 서로 구별되지 않는다. P7 은 「항목 ID → 원문」이고,
  원문이 어느 문서인지 못 말하면 그 사슬이 사람 눈앞에서 끊긴다.
- **근거**: 이번 바퀴 눈 판정 —
  `docs/evidence/2026-09-04-candidate-evidence/card.txt` ①. 다섯 줄 중 넷이 근거를 내는데
  넷 다 「문서」로 시작한다. `components/evidence.tsx:20~24` 가 그 문자열을 만드는 자리이고
  `document_version_id` 를 안 읽는다. `repository_path` 쪽은 `repo/path` 를 내므로
  **같은 표 안에서 두 종류의 상세함이 갈려 있다.**
- **정본**: `docs/DESIGN_BRIEF.md` §2-1 · `docs/SPEC.md` §3(SourceRef) — P7 의 화면 쪽 면.
- **고칠 방향**: `SRC_LABEL` **하나**를 고친다 — 화면마다 조립하면 어디선가 빠진다.
  첫 걸음은 `document_version_id` 앞 8자를 `mono` 로 붙이는 것이다 (`proposal` 이
  이미 그 모양이다: `제안 c0ffee00`). 문서 **제목**까지 가려면 화면이 그 이름을 알아야
  하는데 응답에 없다 — **문서 목록을 내는 문이 필요하고 지금은 없다.**
  ⚠ 표를 고치면 화면 3·4·5·7 이 한꺼번에 바뀐다. `web-tables.test.ts` 의
  「4종이 서로 다른 문자열을 낸다」가 그 표의 게이트다.
- **상태**: 대기

### 91. 도메인 규칙 파일이 **어느 도메인인지 말하지 않는다**   [격차]
- **증상**: `.claude/rules/domain-refund.md` 를 열면 본문이 이렇다 —
  `# 도메인` / `## 이 도메인의 규칙` / 규칙 한 줄. **「환불」이라는 말이 파일 안에 없다.**
  도메인 이름이 파일 **이름에만** 있다. 도메인이 둘이 되면 두 파일의 본문 머리가
  글자 하나 안 틀리고 같아진다 — 사람도 agent 도 붙여 놓고 보면 구별 못 한다.
- **근거**: 이번 바퀴 눈 판정. `.ci/walkthrough-pack/.claude/rules/domain-refund.md` 전문이
  네 줄이고 그 안에 「환불」이 0번 나온다. 템플릿은 `packages/compiler/templates/index.ts:118`
  (`head: (v) => ['# 도메인', notice(v)]`)이고, 그 위 주석이 이유를 적어 뒀다 —
  **「제목은 절이 갖는다(`## {도메인 이름}`)」.** 그 절은 `domain` **ItemType 항목**이
  채우는데, paylab 픽스처에는 `domain` 항목이 없다. 그래서 이름을 아무도 안 적는다.
  ⚠ 즉 **고장이 아니라 가정이 어긋난 것**이다: 템플릿은 「domain 항목이 있다」를 전제하고,
  파일이 생기는 조건은 「`scope.kind:'domain'` 인 항목이 하나라도 있다」다. 둘이 다르다.
- **정본**: `docs/SPEC.md` §4.2(절·템플릿) · `packages/compiler/templates/index.ts`
- **고칠 방향**: 파일을 만드는 쪽이 이미 **slug 를 안다** (`path: (slug) => …`).
  `head` 도 그 slug 를 받게 해서 `# 도메인 — refund` 처럼 적는 것이 제일 싸다.
  ⚠ 더 나은 것은 **이름**(`환불`)이지만 그건 `domain` 항목이 있어야 나온다 — 없을 때
  slug 로 떨어지는 길을 먼저 만들어라. ⚠ 템플릿을 고치면 **golden 이 깨진다.**
  `loop/PROMPT.md` ③ 의 「템플릿 버전을 올리고 expected 를 갱신한 이유를 커밋에」를 읽어라.
- **상태**: ✅ `7ba2feb` — **97 과 같은 항목이다** (그리고 30 과도 같다). 97 에 전말을 적었다.
  ⚠ 이 줄이 세 번 따로 적힌 것 자체가 기록이다 — **대장에 적는 것만으로는 안 고쳐진다.**

### 91-B. 2-B 이번 라운드 — `confidence` 3단계 · 에러 코드 **11종**(9종이 아니다) 다 살아 있다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 — 둘 다 **②단계(값을 바꾸면 결과가 달라지나)까지** 통과한다:
  ① **`confidence` 3단계** (**73** 「찍히기만 한다」의 축) — 소비처는 둘이고 둘 다 값을 쓴다:
     `packages/compiler/src/tag.ts:50` 이 역추적 태그에 `conf:` 로 찍고,
     `components/chips.tsx:148` 의 `CHIP_TABLES.confidence` 가 화면에 칩으로 그린다.
     `compiler/test/liveness.test.ts:60` 이 **세 값의 산출물 지문이 서로 다른지**를 잰다.
     ⚠ **데모 Pack 은 `conf:high` 한 갈래뿐이다**(`grep -o "conf:[a-z]*"` → 12개 전부 high).
     **그런데 이건 89 와 달리 고칠 것이 아니다** — 씨앗의 항목은 사람이 문서를 보고 손으로
     옮긴 것이라 `high` 가 사실이다. `medium`·`low` 는 **AI 구조화**(§7.1)가 내는 값이고
     그 길은 키가 필요해 관통에 없다 (84 가 남긴 것). 억지로 낮추면 데모가 거짓말을 한다.
  ② **에러 코드 — 9종이 아니라 11종이다.** `packages/schema/src/api.ts:33` 이 정본이고
     `INTERNAL`·`AI_OUTPUT_INVALID` 가 나중에 들어왔다 (각각 그 자리에 왜가 적혀 있다).
     ⚠ `loop/PROMPT.md` ④2-B 와 `CLAUDE.md` 의 후보 목록이 아직 **「9종」**이라고 적혀 있다 —
     세는 쪽이 아니라 **적어 둔 숫자가 낡았다.** 게이트는 정확하다:
     `error-codes.test.ts` 가 ⓐ 코드를 바꾸면 응답의 status·code·message 가 표를 따라
     갈리는지, ⓑ **11종 전부 `fail('X')`/`new ApiError('X')` 로 내는 자리를 가졌는지**를
     소스에서 세고, 「주인 없음」 표(`WITHOUT_OWNER`)는 **지금 비어 있다.**
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: sync 상태 5종(**69** — `manual` 을 찍는 코드가 0곳) ·
  `PROGRESS_SOURCES` 3종(**85-B** — 화면 8 이 주인) · `SourceRef` 4종(**87** 이 그 축이다) ·
  `PACK_TARGETS` 3종(**7** · 주인이 `docs/PLAN.md` P5 첫 행이다)
- **상태**: ✅ 이번 바퀴에 확인함

### 88-B. 2-B 이번 라운드 — `enforcement` 4종 · `ItemType` 10종 다 살아 있다 (데모는 한 갈래뿐 → **89**)   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 — 둘 다 **②단계(값을 바꾸면 결과가 달라지나)까지** 통과한다:
  ① **`enforcement` 4종** (**한 번도 안 팠던 축이다**) — 정본은
     `packages/schema/src/item.ts:98`(`PolicyData`, 기본값 `'review'`)이고 소비처는
     `packages/compiler/src/sections.ts:48` 의 `ENFORCEMENT_LABEL` 표 하나다.
     그 표를 `policyLine`(`:56`)이 읽어 정책 줄에 `· 강제: …` 로 찍는다.
     `compiler/test/liveness.test.ts:72` 가 **네 값의 산출물 지문이 서로 다른지**를 잰다.
     쓰는 길도 막혀 있지 않다 — 플러그인 초안(`upload-draft.ts` → `batch-draft`)이
     `ContextItemDraftFile` 로 파싱되어 네 값 아무거나 실려 온다.
     ⚠ 다만 **데모가 `review` 하나만 낸다** — 그것만 따로 **89** 로 냈다.
  ② **`ItemType` 10종 재확인** — `liveness.test.ts:31` 이 두 겹으로 잠근다:
     열 종류 각각이 `ANCHOR` 만 있는 산출물을 바꾸는지, 그리고 **열의 산출물이 서로
     전부 다른지**(두 타입이 같은 줄을 내면 하나는 죽은 것이다). 여전히 초록이다.
  ③ (참고) **`SourceRef` 4종은 이번에 안 팠지만** 88 을 고치며 `SRC_LABEL` 넷을 읽었다 —
     `web-tables.test.ts` 의 「4종이 서로 다른 문자열을 낸다」가 그 표의 게이트이고,
     `repository_path` 만 `repo/path`(§8)를 내고 나머지 셋은 그러지 않는 **상세함의
     갈림**이 87 의 내용이다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `confidence` 3단계(**73** 「찍히기만 한다」 — 컴파일러 쪽은
  잠겨 있으니 **쓰는 자리**를 봐라) · sync 상태 5종(**69**) ·
  `PROGRESS_SOURCES` 3종(**85-B** — 화면 8 이 주인) · 에러 코드 9종 재확인
- **상태**: ✅ 이번 바퀴에 확인함

### 87-B. 2-B 이번 라운드 — `CONFLICT_ANCHORS` 3종 · `CONFLICT_CHOICES` 4종 · `SCOPE_KINDS` 3종 다 살아 있다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 — 셋 다 **②단계(값을 바꾸면 결과가 달라지나)까지** 통과한다:
  ① **`CONFLICT_ANCHORS` 3종** — 소비처가 둘이고 둘 다 값을 쓴다:
     `db/schema.ts:342` 가 `anchor` 로 어느 칸이 차야 하는지를 골라 **CHECK 제약**을 만들고,
     `components/conflict-card.tsx:198` 의 `ANCHOR_BODY`(`Record<ConflictAnchor, …>`)가
     본문을 세 갈래로 그린다. `web-conflict-card.test.ts:243` 이 축마다 대표 종류를 뽑아
     **셋이 서로 다른 본문**을 내는지 잰다.
  ② **`CONFLICT_CHOICES` 4종** — `web-conflict-card.test.ts:227` 이 `CHOICE_LABEL` 넷이
     **서로 다른 문자열**을 내는지, `:397` 이 `choiceItemEffect` 넷이 갈리는지 잰다.
     `RESOLUTION_ITEM_OUTCOME` 가 그 축의 정본이다.
  ③ **`SCOPE_KINDS` 3종** — `packages/compiler/src/partition.ts:68~69` 가 세 갈래로 갈리고
     `compiler/test/liveness.test.ts:81` 이 **셋이 서로 다른 파일로 간다**를 잰다
     (`CLAUDE.md` · `.claude/rules/domain-payment.md` · `.claude/rules/scoped-payment.md`).
  ④ (참고) **`PACK_TARGETS` 3종은 안 팠다** — **7** 이 이미 그 항목이고 주인이
     `docs/PLAN.md` P5 첫 행이다. 지금 고치면 그 행의 liveness 시험과 부딪힌다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `ItemType` 10종 재확인 · `enforcement` 4종 (`PolicyData` —
  아직 한 번도 안 팠다) · `confidence` 3단계(**73** 「찍히기만 한다」) ·
  sync 상태 5종(**69**) · `PROGRESS_SOURCES` 3종(**85-B** — 화면 8 이 주인)
- **상태**: ✅ 이번 바퀴에 확인함

### 86. 후보 줄에 **근거가 없다** — 사람은 어디서 온 문장인지 모른 채 팀 규칙으로 받아들인다   [격차]
- **증상**: 84 가 낸 후보 고르기 카드가 한 줄에 **아이콘 · 제목 · 타입** 셋만 낸다.
  그 후보가 **문서 어디에서 나온 문장인지**도, 본문이 무엇인지도 안 보인다.
  사람은 「재시도 정책 · policy」 다섯 글자만 보고 체크를 남겨 두고, 그 항목은
  다음 Pack 에 나갈 초안이 된다. DESIGN_BRIEF §2-1 이 정한 것과 정반대다 —
  「항목·문장·상태 옆에는 원문 링크가 붙는다. **근거 없는 숫자·판정은 화면에 없다.**」
- **근거**: 이번 바퀴 눈 판정 —
  `docs/evidence/2026-09-04-structure-candidates/card.txt` ① 을 읽었다.
  한 줄이 `[v] | § | 재시도 정책 | policy` 로 끝난다.
  ⚠ **후보에는 근거가 이미 있다** — `structureDocument()` 가 chunk offset 을 문서
  offset 으로 바꿔 `source_refs:[{kind:'source_document', document_version_id, …}]` 를
  채워 두었고(§7.1), 받아들인 항목의 근거가 그것이라는 것을 `ai-job.test.ts` 가 잰다.
  **화면이 그것을 안 꺼낼 뿐이다** — `structureCandidates()`(`lib/web/queries.ts`)가
  `id`·`type`·`title` 셋만 낸다.
- **정본**: `docs/DESIGN_BRIEF.md` §2-1 · `docs/SPEC.md` §7.1 — P7 의 화면 쪽 면이다.
- **고칠 방향**: `structureCandidates()` 가 `body` 한 줄과 **첫 근거**를 같이 내고,
  카드가 제목 밑에 인용 한 줄 + `EvidenceLink` 를 그린다.
  ⚠ **초안 전체를 화면 상태로 들고 오지 마라** — 그러면 다음 사람이 그것을 고쳐서
  되보내는 문을 만들게 되고, 그 항목의 근거는 여전히 원문 구간을 가리켜
  **원문에 없는 문장이 원문을 근거로 배포된다** (P7 · `AcceptJobItems` 주석).
  읽기 전용으로 **보여 주기만** 하는 칸을 늘리는 것이 이 항목의 답이다.
  ⚠ 원문 인용을 보여 주려면 문서 본문을 가져올 문이 필요하다 — 지금은 없다.
  근거의 `document_version_id#start-end` 를 **글자로** 내는 것이 첫 걸음이고
  (화면 7 의 `EvidenceLink` 와 같은 모양), 인용은 그 다음이다.
- **상태**: ✅ `c6905df` + `b1d2190` — **`structureCandidates()` 가 `body` 와 첫 근거를
  같이 낸다.** 근거는 손으로 칸을 세지 않고 **`SourceRef` 스키마로 판다** — `kind` 마다
  모양이 달라서 손으로 세면 `EvidenceLink` 가 `undefined` 를 글자로 그린다.
  ⚠ 나가는 `body`·`evidence` 는 **읽기 전용**이다 — 되보내는 자리가 없다
  (`acceptJobItems` 는 여전히 id 만 싣는다 · P7).
  ⚠ 근거만 어긋난 줄은 **줄째로 버리지 않고** `evidence:null` 로 남긴다 —
  그때 카드는 「⚠ 근거 없음」이라고 말한다 (`EvidenceList` 가 이미 그 문장을 갖고 있다).
  ⚠ 근거를 그리는 함수는 **화면 7 과 같은 하나**다 (`components/evidence.tsx`) —
  화면마다 문자열을 조립하면 어디선가 줄 번호가 빠진다.
  **한 줄의 모양(`StructureCandidate`)을 `lib/web/queries.ts` 로 옮겼다** —
  꺼내는 함수와 그리는 카드가 각자 적으면 칸이 빠져도 아무 데서도 안 걸린다
  (`ConflictCard`·`QuestionRow`·`VersionRow` 가 거기 있는 것과 같은 이유다).
  **게이트는 2-B ②단계다**: `web-structure-candidates.test.ts` `it` 12 → **23** — 근거 값을 뒤집으면
  (`start_char`·`heading_path`) 카드 글자가 **서로를 배제하는지**, 근거 없는 후보가
  「근거 없음」을 내는지, 본문이 문자열이 아닐 때 `undefined` 대신 빈 문자열인지,
  미리보기가 잘렸다는 것을 `…` 로 말하는지. 웹 시험 **375** 초록.
  🔴 **눈 판정에서 한 번 더 고쳤다** (`b1d2190`) — 본문을 `meta ink-4` 로 그렸는데
  토큰 표에서 `ink-4` 의 용도는 **비활성**이고 카드 바탕 위 대비가 1.6:1 이다.
  사람이 고르라고 낸 문장을 안 보이게 그리면 이 항목을 안 고친 것과 같다. `meta` 로 바꿨다.
  ⚠ 처음 적은 주석에 색 리터럴을 넣었더니 `design-tokens.test.ts` 가 빨개졌다 —
  **그 게이트는 주석까지 센다.**
  **눈으로 읽은 것**: `docs/evidence/2026-09-04-candidate-evidence/card.txt` (일곱 상태).
  거기서 나온 새 항목이 **88**(`ink-4` 로 그린 문장들)이다.
  ⚠ **남은 것**: 근거 글자가 「어느 문서인지」를 말하지 않는다 → **87**.

### 84. 문서를 구조화한 **「항목 후보 N개」가 항목이 되는 문이 없다** — 화면은 「찾았습니다」라고 말하고 Context 는 비어 있다   [고장]
- **증상**: 화면 3 에 문서를 붙여넣고 [구조화하기] 를 누르면 §7.1 이 돌고, 끝나면
  **「✓ 항목 후보 6개 · 질문 2개를 찾았습니다.」** 와 **[Context 보기]** 버튼이 뜬다.
  그 버튼을 누르면 **Context 가 비어 있다.** 질문 2개만 충돌 행이 됐고, 항목 후보 6개는
  `ai_jobs.result` JSON 안에만 있다 — 꺼낼 문이 서버에도 화면에도 **하나도 없다.**
  문서를 올리는 길로 들어온 사람은 **발행까지 갈 수 없다.** 「문서를 올리면 팀 규칙이
  된다」가 제품의 첫 문장인데 그 길이 중간에 끊겨 있다.
- **근거**: 이번 바퀴 직접 확인 —
  ① 만드는 자리 — `lib/ai/job.ts:174` 의 `structureJob.run` 이 `items` 를 `result` 에만
     담는다 (주석도 「항목 초안은 **행으로 만들지 않는다**」라고 적혀 있다).
  ② 🔴 **꺼내는 자리가 0곳이다.** `grep -rn "structureCounts" apps/web/src` →
     `import/page.tsx:289` 하나뿐이고, 그건 **개수만 센다**
     (`lib/web/queries.ts:229` — `items.length`). 후보 자체를 읽는 코드가 없다.
  ③ 🔴 **라우트도 없다.** `find apps/web/src/app/api -name route.ts` 29개 중
     초안을 항목으로 만드는 문은 `context-items/batch-draft`(scan 전용 ·
     `repo`+`scan_summary` 필수 · `origin:'code'` 고정) 와 `questions`(씨앗 질문 전용)
     둘뿐이다. **문서에서 온 후보가 지나갈 문이 아니다.**
  ④ 화면이 유도까지 한다 — `import/page.tsx:297~299` 가 「찾았습니다」 바로 밑에
     `[Context 보기]` 를 놓는다. 거기엔 그 6개가 없다.
- **정본**: `docs/SPEC.md` §7.1 마지막 줄(「사람이 화면 4 에서 고르기 전에
  `context_items` 에 넣지 않는다」) · §5 — ⚠ **SPEC 은 「사람이 고른다」고만 적고
  고르는 문을 §5 표에 안 적었다.** 코드가 SPEC 을 어긴 게 아니라 **둘 다 비어 있다**
  (82 와 같은 모양이다).
- **⚠ 31 이 이것의 뒷면이다**: 문서에서 온 항목이 없으니 `origin:'doc'` 을 찍는 자리도
  0곳이고, 그래서 `doc_vs_code` 충돌이 실데이터로 절대 안 난다. **이 문을 만들면
  31 도 같이 닫힌다.**
- **고칠 방향**: **문을 만든다.** SPEC §7.1 이 「사람이 고른다」이므로 job 결과에서
  **고른 것만** 항목이 되는 라우트 하나다. 자리는 job 아래가 맞다 —
  후보는 job 의 산출물이고, 남의 job 을 못 읽게 하는 조건이 이미 그 경로에 있다.
  ⚠ **`batch-draft` 를 넓히지 마라** — `repo`·`scan_summary` 는 문서에는 없는 칸이고,
  `origin` 이 `code` 로 고정돼 있다. 대신 **넣는 코드는 한 자리로 모아라** —
  지금 초안을 행으로 만드는 코드가 `batch-draft`·`questions` 두 곳에 베껴져 있다.
- **상태**: ✅ `c57b3fb` — **문을 냈다.**
  ① `POST /projects/{id}/jobs/{jobId}/items` (member). body 는 `AcceptJobItems` 이고
     오는 것은 후보의 **id 뿐**이다 — 본문을 같이 받으면 화면이 모델 출력을 고쳐
     되보낼 수 있고 근거는 여전히 원문 구간을 가리킨다 (P7). 자리를 job 아래로 둔
     이유는 「남의 job 을 못 읽는다」를 지키는 조건이 이미 그 경로에 있어서다.
  ② **넣는 코드를 한 자리로 모았다** — `insertDrafts()` (`lib/api/item.ts`).
     `batch-draft`·`questions`·새 문 셋이 그것을 부르고 **다른 것은 `origin` 한 칸**뿐이다.
     ⚠ `status` 는 일부러 **인자가 아니다** — 인자로 두면 「초안은 언제나 draft」가
     부르는 쪽 셋의 합의가 되고 하나만 어긋나도 승인 없이 `active` 가 생긴다.
  ③ 화면 3 의 성공 카드가 **고르는 자리**로 끝난다
     (`components/structure-candidates.tsx` · DESIGN_BRIEF §2-4 가 이 화면에서 처음
     지켜졌다). 기본은 전부 선택 — 빼는 것이 고르는 것보다 싸야 그 화면이 쓰인다.
  **게이트는 2-B ②단계다**: `ai-job.test.ts` +8 (job 이 끝나도 항목 0건 · 고른 것만
  행이 됨 · 같은 프로젝트에서 `doc` 과 `code` 가 갈림 · 근거가 문서 버전 uuid 를 뭄 ·
  후보 아닌 id 거절 · 둘째는 「이미 있다」 · 안 끝난 job 과 탐지 job 400 · 남의 job 404),
  `web-structure-candidates.test.ts` +12. SPEC §5 표에 한 줄 · §7.1 마지막 줄을 고쳤다.
  **눈으로 읽은 것**: `docs/evidence/2026-09-04-structure-candidates/card.txt` (일곱 상태).
  거기서 나온 새 항목이 **86**(후보 줄에 근거가 없다)이다.
  ⚠ **31 이 같이 닫혔다.**

### 85-B. 2-B 이번 라운드 — `PROPOSAL_OPERATIONS`·`CONFLICT_SEVERITIES` 는 살아 있다 · `PROGRESS_SOURCES` 3종은 **아무도 안 읽는다**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`PROPOSAL_OPERATIONS` 3종 — 살아 있다.** 소비처가 둘이고 둘 다 값을 **쓴다**:
     계약 쪽은 `packages/schema/src/upload.ts:102` 의 `refine` 이 `add` 에는 `draft` 를,
     `update`·`deprecate` 에는 `target_item_id` 를 **요구**해서 셋이 서로 다른 body 가
     되고, 발행 쪽은 `lib/api/publish.ts:262·290·303` 이 세 갈래로 갈린다.
  ② **`CONFLICT_SEVERITIES` 3종 — 살아 있다.** `CONFLICT_SEVERITY_RANK` 를
     `review/page.tsx:207`(카드 정렬)과 `lib/ai/conflict.ts:230`(§7.2 출력 정렬)이 읽고,
     값이 바뀌면 **순서가 갈린다**. 화면은 `CONFLICT_SEVERITY_CHIP` 으로 따로 그린다.
  ③ 🔴 **`PROGRESS_SOURCES` 3종 — 만들기는 하는데 읽는 자리가 0곳이다.**
     만드는 쪽은 둘 다 산다 — CLI 기본값이 `agent`(`cli/progress.ts:98`), 훅이
     `hook`(`scripts/stop.mjs:166`), 사람이 `--source manual`. DB 에도 들어간다
     (`progress_source` pgEnum). **그런데 값을 보고 갈리는 코드가 하나도 없다**:
     `PROGRESS_EFFECT`(마일스톤 상태)는 `status` 축만 읽고, `roadmap/route.ts:47~53` 은
     `source` 를 **select 조차 안 한다.** 나가는 자리는 `PROGRESS_EVENT_COLUMNS:23` 의
     POST 응답 한 곳이고 **그 값을 그리는 화면이 없다.**
     ⚠ 82(`SourceDocumentKind`)와 **같은 모양**이다 — 「저장되고 응답에 실리지만
     아무도 안 읽는다」. 다만 82 는 사람이 **고르는 칸**이라 거짓말이었고, 이쪽은
     기계가 자동으로 찍는 값이라 사람을 속이지는 않는다. 그래서 [격차]도 아직 아니고
     **화면 8(Roadmap)이 주인**이다 — 「이 보고는 훅이 남긴 것인가 사람이 남긴 것인가」는
     그 화면이 물을 질문이다. 그 화면을 만드는 바퀴가 ①살린다/②지운다를 고른다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `PACK_TARGETS` 3종(**7** — `agents`·`cursor` 가 안 나온다) ·
  `CONFLICT_ANCHORS` 3종 · `CONFLICT_CHOICES` 4종 · `SCOPE_KINDS` 3종 재확인 ·
  `ItemType` 10종 재확인
- **상태**: ✅ 이번 바퀴에 확인함

### 82. `source_documents.kind` 6종은 **골라도 아무것도 안 달라진다**   [구멍]
- **증상**: 화면 3 의 업로드 폼이 「목표 · 정책 · 로드맵 · ADR · 노트 · 위키」 여섯 중
  하나를 고르게 하고, 그 값은 DB 에 저장되고 응답으로도 나간다. 그런데 **그 뒤에
  아무도 안 읽는다.** 같은 문서를 「정책」으로 올리든 「회의록」으로 올리든 구조화
  결과도, 나오는 항목도, Pack 도 **완전히 같다.** 사람은 분류한 줄 알고 고른다.
- **근거**: 이번 바퀴 직접 확인 (2-B) —
  ① 쓰는 자리는 하나 — `app/api/v1/projects/{id}/documents/route.ts:38` 이
     `body.kind` 를 `sourceDocuments` 에 넣고 응답에 실어 낸다.
  ② 🔴 **읽는 자리가 0곳이다.** `grep -rn "sourceDocuments" apps/web/src` 의 나머지
     둘은 `lib/ai/job.ts:135`(프로젝트 소유 확인 join)뿐이고 `kind` 를 안 본다.
     §7.1 프롬프트(`lib/ai/structure.ts`)에 `kind` 가 **없다** — 문서 종류가 모델에
     전달되지 않는다. 되돌려 **보여 주는 화면도 없다**: `SOURCE_DOCUMENT_KIND_LABEL`
     의 유일한 소비처가 업로드 폼의 `<select>` 다 (`import/page.tsx:145`).
  ③ ⚠ 표 자체는 죽지 않았다 — `web-tables.test.ts:249` 가 여섯 줄이 서로 다른 글자를
     내는 것을 잰다. 죽은 것은 **값의 효과**다 (2-B ②단계 불합격).
- **정본**: `docs/SPEC.md` §5(POST /documents) · §7.1 — ⚠ SPEC 도 「프롬프트가 `kind` 를
  쓴다」고 적지 않았다. 코드가 SPEC 을 어긴 게 아니라 **둘 다 비어 있다.**
- **고칠 방향**: 둘 중 하나만 —
  ① **살린다** — §7.1 프롬프트에 문서 종류를 한 줄 싣는다(「이 문서는 *정책 문서*다」).
     그러면 「정책 문서에서 goal 을 뽑는」 종류의 헛수고가 준다. 게이트는 「kind 만 바꾸면
     프롬프트가 달라진다」로 잠근다 — 픽스처 결과로 재면 LLM 없이 잰다.
  ② **지운다** — `SOURCE_DOCUMENT_KINDS`·pgEnum·폼의 `<select>` 를 같이 지운다.
     ⚠ pgEnum 은 마이그레이션이 붙는다. 지우려면 그 값이 **정말** 다시 안 필요한지
     먼저 정해라 — 직렬화된 값이다.
- **상태**: ✅ `5fe0068` — **①을 골랐다(살린다).** 표는 `apps/web/src/lib/ai/structure.ts` 의
  `SOURCE_DOCUMENT_KIND_BRIEF` 하나이고, chunk 프롬프트 **머리 한 줄**이 그 표를 읽어서
  나간다. 러너(`lib/ai/job.ts`)가 join 한 `source_documents.kind` 를 읽어 넘긴다 —
  `kind` 는 버전이 아니라 **문서**의 칸이라 개정마다 갈리지 않는다.
  ⚠ **`StructureInput.kind` 에 기본값을 두지 않았다.** 기본값을 주면 부르는 자리가
  잊어도 조용히 돌고, 그게 이 값이 죽어 있던 방식 그대로다 — 지금은 타입이 막는다.
  ⚠ **화면 라벨(`SOURCE_DOCUMENT_KIND_LABEL`)과 일부러 다른 표다.** 저쪽은 사람이 고를
  때 읽는 낱말이고 이쪽은 모델이 읽는 문장이다. 한 표로 합치면 화면 문구를 다듬는
  바퀴가 §7.1 결과를 조용히 바꾼다.
  **게이트는 2-B ②단계다** — 「소비처가 생겼다」에서 멈추지 않았다:
  ① `ai-structure.test.ts` — 여섯 값을 각각 돌려 프롬프트 머리말을 모으고, 각 값의
     문장이 실려 있고 **여섯이 서로 다르다**를 잰다 (겹치면 그 값은 골라도 같은 값이다).
     시간을 한 시간씩 밀어 §7.5 「시간당 5회」를 피한다 — 재는 것은 빈도가 아니다.
  ② `ai-job.test.ts` — 「메모」로 **라우트를 거쳐** 올린 문서로 job 을 굴려, LLM 이 받은
     user 프롬프트에 notes 문장이 있고 **goal 문장이 없다**를 잰다 (DB → 프롬프트 배선).
  SPEC §7.1 에 이 줄을 넣었다 — 코드가 SPEC 을 어긴 게 아니라 **둘 다 비어 있었다.**
  시험: 웹 342 → **347**. 눈으로 읽은 것:
  `docs/evidence/2026-09-04-doc-kind/prompt-heads.txt` (여섯 종류의 실제 프롬프트).
  ⚠ **65 가 같은 것의 옛 항목이다** — 같이 닫는다.

### 83-B. 2-B 이번 라운드 — `AI_JOB_STATUS_RULES` 4종 · `TeamRole` 2종 다 살아 있다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`AI_JOB_STATUS_RULES` 4종 — 살아 있다.** 소비처가 둘이고 둘 다 값을 **쓴다**:
     `db/schema.ts:617` 이 네 줄에서 **CHECK 제약 4개**를 만들고, `lib/ai/job.ts:492` 가
     `finished` 축으로 「멈춘 job 인가」를 가른다. 2단계도 통과한다 —
     `ai-job.test.ts:199` 가 상태마다 칸 하나를 **뒤집어 넣어** INSERT 가 거부되는지
     보고, `:975` 가 `finished` 를 뒤집으면 `stalled` 가 갈리는 것을 잰다.
  ② **`TeamRole` 2종 — 살아 있다.** `ROLE_RANK` 를 `lib/api/guard.ts:42` 와
     `lib/api/auth.ts:101` 이 읽고, `api-auth.test.ts:128` 이 **같은 body·같은
     프로젝트**로 member 는 403 · owner 는 201 인 것을 잰다 (2단계 통과).
  ③ **`SourceDocumentKind` 6종은 이번 바퀴에 살렸다** → **82**.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `origin` 4종을 **고치는** 쪽으로 (**31** — `doc` 을 쓰는 자리가
  0곳이라 `doc_vs_code` 충돌이 실데이터로 안 난다) · `ItemType` 10종 재확인 ·
  `SourceRef` 4종(**68**) · sync 상태 5종(**69**) · `confidence` 3단계(**73** 「찍히기만 한다」)
- **상태**: ✅ 이번 바퀴에 확인함

### 81-B. 2-B 이번 라운드 — `origin` 4종 중 **`doc` 은 아무도 안 쓴다** · `SourceDocumentKind` 6종은 **골라도 같다**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① 🔴 **`origin` 4종 중 `doc` 이 쓰이는 자리가 0곳이다** (**31** 이 적어 둔 그대로 ·
     이번에 **결과**까지 짚었다). 쓰는 자리는 넷뿐이다 —
     `batch-draft:124`(`code`) · `questions:146`(`manual`) · `context-items/[itemId]:84`
     (`manual`) · `conflicts/[id]/resolve:151`(`manual`) · `lib/api/publish.ts:377`
     (`proposal`). 문서에서 온 항목이 `doc` 으로 들어가는 길은 **없다**:
     `lib/ai/job.ts:165` 가 「항목 초안은 행으로 만들지 않는다」고 적고 실제로 안 만든다.
     ⚠ **그래서 `doc_vs_code` 충돌이 실데이터로는 절대 안 나온다** —
     읽는 쪽은 살아 있다(`lib/ai/conflict.ts:68`·`ITEM_BRIEF_COLUMNS` 가 `origin` 을
     프롬프트에 싣고, `api.ts:276` 의 hint 가 그 이름을 쓴다). 한쪽 값이 없으니
     「문서에서 온 것과 코드에서 온 것이 다른 말을 한다」의 절반이 영원히 비어 있다.
     → **31** 이 이것의 주인이다. 다음에 고칠 때 「살린다/지운다」를 그 항목에서 고른다.
  ② **`SourceDocumentKind` 6종 — 골라도 결과가 같다.** → 위의 **82**.
  ③ (참고) **68**·**69** 가 닫은 `SourceRef` 4종·sync 상태 5종은 이번에 다시 안 팠다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `origin` 4종을 **고치는** 쪽으로 (**31**) · `SourceRef` 4종
  재확인(**68**) · sync 상태 5종(**69**) · `AI_JOB_STATUS_RULES` 4종 · `TeamRole` 2종
- **상태**: ✅ 이번 바퀴에 확인함

### 80. 승인된 항목이 **0건이어도 발행이 201** 이다 — 사람은 규칙 한 줄 없는 v1.0.0 을 받는다   [고장]
- **증상**: 씨앗 질문 10장에 답하면 항목이 `draft` 로 생긴다. 그 상태에서 [발행하기] 를
  누르면 **막히지 않고 201 이 난다.** 나오는 Pack 은 `.claude/rules/workflow.md` **한 장**
  뿐이고 팀 규칙은 한 줄도 없다. 그런데 화면은 「v1.0.0 을 발행했습니다」라고 말하고,
  공식 버전이 그리로 옮겨 가며, 기기들이 그 빈 Pack 을 `applied` 로 받아 간다.
  사람은 자기가 답한 열 문장이 배포됐다고 믿는다.
- **근거**: 이번 바퀴 직접 확인 —
  `apps/web/test/api-seed-questions.test.ts` 「승인하기 **전에는** 내 답이 Pack 에 하나도
  없다」가 그 201 을 지금 **사실로 잠그고 있다** (초안이 안 새는 것을 재는 시험이라
  201 자체는 못 막는다) · 빈 snapshot 을 컴파일한 결과는
  `docs/evidence/2026-09-04-questions-only/pack.txt` 의 `workflow.md` 한 장과 같다
- **정본**: `docs/SPEC.md` §2.1(발행 트랜잭션) · §4.3(항상 나가는 문서) · §5
- **왜 여기서 드러났나**: `packages/compiler/src/compile.ts:57` 의 `EMPTY_SNAPSHOT` 이
  바로 이 경우를 막으려고 있는데 **절대 안 걸린다** — `assemble.ts:55` 가 `always` 문서를
  **먼저** 만들어서 `files.length` 가 0 이 될 수 없기 때문이다. 즉 가드는 있는데
  가드가 재는 값이 틀렸다 (파일 수가 아니라 **항목 수**를 재야 한다).
- **고칠 방향**: 둘 중 하나만 골라라 —
  ① **컴파일러가 막는다** — `EMPTY_SNAPSHOT` 의 조건을 「Pack 파일이 0개」가 아니라
     「`source_item_ids` 가 하나도 없다」로 바꾼다. 그러면 발행이 500 `COMPILE_FAILED` 다.
     ⚠ 500 은 「서버가 터졌다」로 읽힌다 — 사람 잘못을 5xx 로 내면 안 된다.
  ② **발행 라우트가 막는다** (이쪽이 맞아 보인다) — snapshot 의 `active` 항목이 0개면
     `VALIDATION_FAILED` 로 400. 문구는 「승인된 항목이 없습니다 — Context 에서 초안을
     승인한 뒤 발행하세요」. 화면 5 에 이제 그 문이 있다 (**79**).
  ⚠ 어느 쪽이든 **`EMPTY_SNAPSHOT` 을 살리거나 지워라.** 지금은 정의만 있고 아무 일도
    안 하는 코드다 (2-B) — 시험도 0건이다.
  ⚠ 게이트는 「400 이 난다」 하나로 끝내지 마라. **「승인 0건으로 만든 버전이 공식이
    되지 않는다」**까지 재라 — 막는 자리가 라우트 한 곳이 아닐 수 있다.
- **상태**: ✅ `f9962cb` — **②를 골랐지만 판정 자체는 컴파일러에 뒀다.** 이유는 하나다:
  라우트가 「active 항목이 0개」를 세면 **「항목은 있는데 전부 제외된」 경우를 놓친다**
  (초안·검토·폐기·`open_question`). 재야 하는 것은 입력이 아니라 **나온 Pack** 이라
  가드의 조건을 `files.length === 0` → `files.every(f => f.source_item_ids.length === 0)`
  으로 바꿨다 (P7 의 그 칸이 「팀의 것이 한 줄이라도 있나」의 답이다).
  ⚠ 그래서 `EMPTY_SNAPSHOT` 은 **지우지 않고 살렸다.**
  500 걱정은 표 하나로 풀었다 — `lib/api/publish.ts` 의 `COMPILE_ERROR_FAULT`
  (`Record<CompileErrorCode, …>`)가 「컴파일 실패 중 사람 잘못인 것」을 정한다.
  `EMPTY_SNAPSHOT` → 400 `VALIDATION_FAILED` 「승인된 항목이 하나도 없습니다 —
  Context 에서 초안을 승인한 뒤에 발행하세요」, 나머지 둘은 그대로 500 이다.
  넷째 컴파일 코드가 생기면 그 표에서 타입 검사가 막는다 (`CompileErrorCode` 를
  compiler 가 이름으로 내보낸다).
  **게이트는 「400 이 난다」에서 멈추지 않았다** — 끝난 뒤 DB 로 잰다:
  `context_versions` 0행 · `pack_files` 0행 · `official_version_id` 가 여전히 null ·
  버전 목록이 비어 있음. 그리고 「하나만 승인하면 201 이고 그 항목이 Pack 에 있다」로
  가드가 **너무 많이 막지 않는 것**까지 잰다.
  ⚠ 201 을 사실로 잠그던 `api-seed-questions.test.ts` 의 그 시험을 **둘로 나눴다** —
  「승인 0건이면 막힌다」와 「승인한 것만 나간다(나머지 아홉 장은 한 줄도 없다)」.
  초안이 새지 않는 것을 계속 재면서 새 가드도 잰다.
  시험: 컴파일러 136 → **140** · 웹 338 → **342**.
  눈으로 읽은 것: `docs/evidence/2026-09-04-empty-publish/publish-guard.txt` —
  세 경우(초안만·빈 snapshot·한 장 승인)를 찍었다. ③이 함정을 그대로 보여 준다:
  `workflow.md` 는 **근거 0개**로 나가 있고, Pack 이 「비지 않았다」고 말하게 하던 것이
  바로 그 한 장이었다.

### 81. 2-B 이번 라운드 — `enforcement`·`scope.kind`·에러 코드 11종은 살아 있다 · `EMPTY_SNAPSHOT` 은 **죽어 있다**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`enforcement` 4종 — 살아 있다.** 표는 `compiler/src/sections.ts:48`
     (`ENFORCEMENT_LABEL`)이고 policy 줄의 「강제: …」가 값마다 다르다. golden
     `case-2-domains`·`case-3-overflow` 의 input 이 네 값을 **다 쓴다** — 값을 바꾸면
     golden 이 빨개진다 (2단계 통과). 생산자도 있다: §7.1 의 `AiContextItemDraft` 가
     타입별 `data` 를 그대로 받는다.
  ② **`scope.kind` 3종 — 살아 있다.** `partition.ts:68-69` 가 셋을 **다른 파일**로
     보내고 `compiler/test/liveness.test.ts:81` 이 세 경로가 갈리는 것을 잠근다.
  ③ **에러 코드 11종 — 살아 있다.** `error-codes.test.ts` 의 `WITHOUT_OWNER` 표가
     **비어 있다** — 열한 코드가 전부 내는 자리를 가졌다는 뜻이고, 코드를 바꾸면
     상태와 봉투가 갈리는 것도 같은 파일이 잰다.
  ④ 🔴 **`EMPTY_SNAPSHOT` — 죽어 있다.** `compile.ts:57` 이 던지는데 그 조건
     (`files.length === 0`)이 **절대 참이 될 수 없다** (`always` 문서가 먼저 들어간다).
     소비처도 0곳, 시험도 0건이다. → **80** 이 이것의 주인이다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `SourceRef` 4종(**68** 이 닫았으니 재확인) · `origin` 4종
  (**31** — `doc` 이 여전히 0곳) · sync 상태 5종(**69**) · `SourceDocumentKind` 6종(**65**)
- **상태**: ✅ 이번 바퀴에 확인함

### 79. 화면에 **항목을 승인하는 문이 하나도 없다** — 질문에 답해 만든 항목은 영원히 Pack 밖이다   [구멍]
- **증상**: 씨앗 질문 10장에 답하면 항목이 `status:'draft'` 로 생기고, 발행은 `active`
  만 담는다 (`publish.ts:102` · `EXCLUDE_BY_STATUS`). 그런데 **어느 화면도 항목의 상태를
  바꾸지 못했다.** 그래서 PLAN P3 둘째 행의 완료 기준 **「문서 없이 질문만으로 v1.0
  발행 가능」이 지금 불가능**했다 — 사람은 열 개에 다 답하고 [발행하기] 를 눌러도
  자기 답이 한 줄도 없는 Pack 을 받는다.
- **근거**: 이번 바퀴 직접 확인 —
  ① `grep -rn "apiPatch\|patch(" apps/web/src/app apps/web/src/components` **0건** —
     `lib/web/api.ts:130` 의 `patch()` 에 소비처가 없었다.
  ② 🔴 **부를 수가 없었다.** 라우트는 `PATCH /context-items/{uuid}` 인데 항목을 내는 문이
     돌려주는 `id` 는 `public_id` 다 (`lib/api/item.ts` 머리 주석) — **화면은 uuid 를
     볼 수 없다.** `seed.ts` 만 DB 를 직접 읽어서 그 문을 썼다.
- **정본**: `docs/SPEC.md` §5 · §4.1 · `docs/PLAN.md` P3 둘째 행
- **상태**: ✅ `1aebc22` — 세 가지를 했다:
  ① **문을 옮겼다.** `PATCH /projects/{id}/context-items/{itemId}` 이고 `{itemId}` 는
     `public_id` 다. 전역 `/context-items/{uuid}` 는 지웠다 — 두 문을 두면 화면과 서버가
     서로 다른 이름으로 같은 항목을 부르게 된다. `public_id` 는 프로젝트 안에서만
     유일해서(`unique(project_id, public_id)`) 이 문은 프로젝트 밑이어야 한다.
     SPEC §5 의 그 줄을 같이 고쳤다.
  ② **화면 5 드로어에 상태 버튼**을 냈다 (`components/item-status-actions.tsx`).
     어디로 갈 수 있나는 `ITEM_STATUS_ACTIONS` 표 하나가 정하고, 버튼 밑의
     「무엇이 되나」는 **계약 패키지의 `ITEM_STATUS_EXCLUDE_REASON` 을 읽어서** 그린다 —
     그 표가 곧 컴파일러가 실제로 하는 일이다 (`partition.ts` 에 있던 것을
     `packages/schema` 로 올렸다 · 둘째 사용자가 생겼다).
     owner 가 아니면 버튼을 안 그린다 (누르면 403 인 문을 두지 않는다).
  ③ 🔴 **PLAN P3 둘째 행의 완료 기준을 처음으로 쟀다** —
     `api-seed-questions.test.ts` 「열 장에 답하고 → 승인하고 → 발행하면 **내 답이 Pack 에
     있다**」. 문서 0건으로 v1.0.0 이 나오고 열 문장이 전부 그 안에 있으며 줄마다
     `src:manual:<질문 문장>` 으로 역추적된다 (P7).
  게이트 셋: 캡션이 **컴파일러가 하는 일과 같다**(같은 항목의 `status` 만 뒤집어 컴파일해
  Pack 에 그 줄이 있는지로 잰다) · 나가는 문이 없는 상태가 없다 · 캡션이 버튼 문구를
  되풀이하지 않는다. 웹 시험 313 → **338**, 시험 파일 16 → **17**.
  눈으로 읽은 것: `docs/evidence/2026-09-04-item-status/status-actions.txt` (네 상태의
  버튼 · 저장 중 · 실패) — 거기서 **하나를 고쳤다** (「폐기 | 폐기 · …」가 같은 낱말을
  두 줄에 겹쳐 적었다 → `actionCaption()`) · 그리고
  `docs/evidence/2026-09-04-questions-only/pack.txt` (문서 0건으로 만든 v1.0.0 전문) —
  **거기서 새 고장 하나가 나왔다** (→ **80**: 승인 0건인데도 발행이 201 이다).
  ⚠ 서버에는 **전이 검사를 넣지 않았다.** SPEC §5 가 상태 전이를 정하지 않아서 지어내지
  않았다 — 지금 이 표는 「화면이 무엇을 그리나」의 정본이지 「무엇이 허용되나」의
  정본이 아니다. 그 결정이 필요해지는 날은 **80** 을 고치는 날이다.

### 78. 2-B 이번 라운드 — `ItemStatus` 4종·`ChipSpec` 표 8개 다 살아 있다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`ItemStatus` 4종 — 살아 있다.** `packages/compiler/src/partition.ts:102` 의
     `EXCLUDE_BY_STATUS` 가 정본이고 `active` 만 Pack 에 나간다. 나머지 셋은 **서로 다른
     이유 문장**으로 빠지고, `compiler/test/liveness.test.ts:46` 이 「네 값이 서로 다른
     Pack 지문을 낸다」를 잠근다 — 2단계 통과.
  ② **`ChipSpec` 표 8개 — 전부 잠겨 있다.** `web-tables.test.ts` 의 `assertLiveTable`
     이 여덟 표(`SYNC_CHIP`·`ITEM_STATUS_CHIP`·`CONFIDENCE_CHIP`·`AI_JOB_STATUS_CHIP`·
     `CONFLICT_KIND_CHIP`·`CONFLICT_SEVERITY_CHIP`·`ITEM_TYPE_ICON`·
     `SOURCE_DOCUMENT_KIND_LABEL`)의 **줄마다 다른 글자**를 재고, 여덟 중 일곱은
     그리는 화면이 있다. ⚠ **`SYNC_CHIP` 하나만 그리는 화면이 0곳**이고 그건
     **77** 그대로다 (아직 안 온 화면 9).
  ③ 이번 바퀴가 더한 `ContextItemView` 도 같은 잣대로 잠갔다 — 값이 없으면 응답이
     계약을 못 지나고, 값을 바꾸면 카드의 날짜가 바뀐다 (**72③**).
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `SourceRef` 4종(**31**·**68** 과 같이) · 에러 코드 11종 ·
  `enforcement` 4종 · `scope.kind` 3종 · `origin` 4종(**31** — `doc` 이 여전히 0곳)
- **상태**: ✅ 이번 바퀴에 확인함 (`a45cef0` 바퀴)

### 76. 「A로 합침」은 **합치지 않는다** — 중복 카드의 버튼이 없는 일을 약속한다   [고장]
- **증상**: `duplicate` 카드의 버튼은 「A로 합침」·「B로 합침」인데 서버가 하는 일은
  **진 쪽을 `deprecated` 로 보내는 것뿐**이다 (`RESOLUTION_ITEM_OUTCOME`). 이긴 쪽에는
  진 쪽의 본문도 태그도 근거도 옮겨 오지 않는다. 사람은 「합쳤다」고 믿고 B 에만 있던
  문장을 잃는다 — 그리고 되돌릴 문이 없다 (`:resolve` 가 400 이다).
- **근거**: 이번 바퀴에 74 를 고치면서 결과 줄을 붙였더니 **한 줄 안에서 드러났다** —
  `docs/evidence/2026-09-04-screen4-effect/conflict-card-effect.txt` ④:
  `A로 합침 | B 항목 → 「폐기」`. 표는 `packages/schema/src/api.ts` 의
  `RESOLUTION_ITEM_OUTCOME` 이고 종류별 갈래가 없다 — 넷이 전부 「진 쪽 폐기」다.
- **정본**: `docs/DESIGN_BRIEF.md` §4 화면 4(중복 카드) · `docs/SPEC.md` §5
- **고칠 방향**: 갈래는 둘이고 **둘 중 하나만** 골라라 —
  ① **문구를 사실에 맞춘다** (싸다): `CONFLICT_SIDES.duplicate` 를 「A만 남김」·「B만 남김」
     으로. 한 줄이고 시험이 따라온다. ⚠ DESIGN_BRIEF 의 「같음, 용어: ___」과 갈리므로
     그쪽도 같이 고쳐야 한다.
  ② **정말로 합친다** (계약을 넓힌다): 진 쪽의 `source_refs` 를 이긴 쪽에 이어 붙이는
     일이고, `appendSourceRef()` 가 그 자리다. ⚠ `SOURCE_REFS_MAX`(20)에서 넘치는
     갈래를 정해야 하고, 그때 **버리는 갈래는 없다**(=400)가 지금 규칙이다.
     ⚠ 72① (「용어: ___」 담을 칸)과 **같은 자리**다 — 같이 정하는 것이 맞다.
  🔴 **①을 고르면 「합침」이라는 낱말을 화면에서 지워라.** 반만 고치면 DESIGN_BRIEF 와
     화면이 갈려서 다음 바퀴가 어느 쪽이 정본인지 못 가린다.
- **상태**: ✅ `a39419c` — **①(문구를 사실에 맞춘다)** 을 골랐다.
  `CONFLICT_SIDES.duplicate` = 「A만 남김」·「B만 남김」. 표는 안 넓혔다 — 정말로 합치는
  것은 `SOURCE_REFS_MAX` 에서 넘칠 때의 갈래를 정해야 하고 **72① 과 같은 자리**다.
  게이트는 낱말 금지 하나가 아니라 **둘**이다: 「`RESOLUTION_ITEM_OUTCOME` 에
  `deprecated` 아닌 결말이 없다」 + 「버튼 문구에 합침·합치·병합·통합이 없다」.
  ★ 왜 둘인가 — 낱말만 막으면 **표가 넓어진 뒤에도 참말을 막는다.** 표를 같이 재면
  그날 첫 `expect` 가 먼저 빨개져서 문구를 다시 정하는 자리로 데려온다.
  문구를 「A로 합침」으로 되돌려 시험이 **실제로 빨개지는 것**을 확인했다.
  DESIGN_BRIEF §4 병합 카드에 「지금 화면의 버튼은 넷이고 「같음, 용어: ___」은 아직
  담을 칸도 문도 없다」를 적었다 (72① 로 이어진다).
  눈으로 읽은 것: `docs/evidence/2026-09-04-screen4-merge/duplicate-card-wording.txt` —
  탐지 4종 버튼 줄을 나란히 놓았고 「합침」류 낱말이 하나도 없다.

### 77. 2-B 이번 라운드 — `ConflictStatus`·`PRODUCT_TEXT_PACK_FILES` 는 살아 있다 · `SYNC_CHIP` 은 **그리는 화면이 0곳**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`ConflictStatus` 3종 — 살아 있다.** `open` 은 DB default 이고 넷이 읽는다
     (`review/page.tsx:69`·`questions/route.ts:68`·`roadmap/route.ts:64` 필터 ·
     `resolve/route.ts:52` 가드). `resolved`·`dismissed` 는 `RESOLUTION_OUTCOME` 이
     찍고 `api-routes.test.ts:441` 이 **라우트를 지나 응답이 갈리는 것**을 잠근다 —
     2단계 통과. ⚠ 다만 **둘을 갈라 읽는 소비처는 0곳**이다 (화면은 `=== 'open'`,
     라우트는 `!== 'open'` 하나뿐). 「무시한 것만 다시 보기」 같은 문이 생기기 전까지
     그 차이는 **기록으로만** 산다 — 지금은 그것으로 충분하다 (되돌릴 문의 재료다).
  ② **`PRODUCT_TEXT_PACK_FILES` — 살아 있다.** 표가 아니라 **면제 목록**이고
     `manifest.ts:40` 의 `superRefine` 이 읽는다 — 여기 없는 경로가 근거 0개면
     Manifest 파싱이 실패한다 (P7). 뒤집는 시험 둘이 있다
     (`manifest-evidence.test.ts:27·32` · `compiler/test/always.test.ts:27`).
  ③ **`SYNC_CHIP` 5종 — 표는 살아 있으나 그리는 화면이 0곳.** `web-tables.test.ts:48`
     의 `assertLiveTable` 이 다섯 줄이 서로 다른 글자를 내는 것을 잠그고,
     `SyncChip` 컴포넌트도 있는데 **어느 페이지도 부르지 않는다.** 기기별 상태를
     그리는 **화면 9 가 아직 없기 때문**이다 (`docs/PLAN.md` 「웹 화면 9」 행).
     ⚠ 이건 죽은 코드가 아니라 **아직 안 온 화면**이다 — 지우면 그 화면을 만들 때
     다섯 값을 다시 정해야 한다. `manual` 만 아무도 안 찍는 문제는 **69** 그대로다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `ItemType` 10종(다시) · `SourceRef` 4종(**31** 과 같이) ·
  에러 코드 9종 · `enforcement` 4종 · `scope.kind` 3종
- **상태**: ✅ 이번 바퀴에 확인함 (`a39419c` 바퀴)

### 74. 화면 4 는 「A가 맞음」이 **B를 폐기한다**는 걸 안 알린다   [격차]
- **증상**: 71 을 고치면서 버튼의 뜻이 바뀌었다 — 어제까지 「A가 맞음」은 `conflicts`
  행만 바꿨고 **아무것도 안 지웠다.** 이제 누르면 B 항목이 `deprecated` 로 가고
  **다음 Pack 에서 사라진다.** 화면은 그 말을 한 마디도 안 한다. 되돌리는 문도 없다
  (`:resolve` 가 「이미 처리된 충돌」을 400 으로 막는다 — 27바퀴가 정한 것).
- **근거**: 이번 바퀴 직접 확인 — `components/conflict-card.tsx` 의 `CONFLICT_SIDES` 는
  버튼 문구 넷뿐이고 결과를 적는 칸이 없다 · 결정 뒤 문장은
  `정했습니다 — 「A가 맞음」` 하나다 · 실제로 일어나는 일은
  `docs/evidence/2026-09-04-resolve-effect/pack-before-after.txt` 에 있다
- **정본**: `docs/DESIGN_BRIEF.md` §4 화면 4 · `docs/SPEC.md` §5
- **고칠 방향**: ⚠ **27바퀴 게이트와 부딪히지 않게 조심해라** — 「저장 **전에는**
  무엇이 생기는지 약속하지 않는다」는 *안 일어날 일을 약속하지 마라*는 뜻이고,
  지금은 **일어난다.** 약속이 아니라 **사실**을 적는 것이다.
  🔴 문구를 카드에 손으로 적지 마라 — `RESOLUTION_ITEM_OUTCOME`(`lib/api/conflict.ts`)이
  이미 「어느 쪽이 어디로 가나」를 들고 있다. 그 표를 읽어서 그리면 선택이 늘어도 따라온다.
  ⚠ 표가 서버 쪽에 있다 — 화면이 `lib/api/*` 를 import 하면 의존 방향이 깨진다.
  둘째 사용자가 생긴 것이므로 **`packages/schema` 로 올리는 것**이 맞는 자리다.
- **상태**: ✅ `094102b` — 표(`RESOLUTION_ITEM_OUTCOME`)와 `itemOutcomeOf()` 를
  `packages/schema` 로 올렸고, 카드는 `choiceItemEffect()` 로 그 표를 **읽어서** 그린다.
  버튼 넷 밑에 각각 「B 항목 → 「폐기」」·「항목은 그대로」가 붙고, 폐기가 실제로
  일어나는 카드에만 「다음 Pack 에 들어가지 않습니다 · 이 화면에서 되돌릴 수 없습니다」가
  붙는다. **결정 전과 후가 같은 함수**라 둘이 어긋날 수 없다.
  ⚠ 27바퀴 게이트는 그대로다 — 질문 카드는 아무것도 약속하지 않고, 시험이 다시 잠근다.
  ⚠ 같이 고친 것: 결정 뒤 **항목 목록을 다시 읽는다** (`items.reload()` · 무엇을 다시
  읽을지도 `itemOutcomeOf` 가 답한다). 안 읽으면 카드가 「B 항목 → 「폐기」」라고
  말하면서 그 옆에 「적용 중」 칩을 그대로 그렸다.
  눈으로 읽은 것: `docs/evidence/2026-09-04-screen4-effect/conflict-card-effect.txt` —
  거기서 **새 고장 하나가 나왔다** (→ **76**: 「A로 합침」이 합치지 않는다).

### 75. 2-B 이번 라운드 — `AI_JOB_STATUS` 는 살아 있다 · `origin`·`SourceDocumentKind` 는 **31·65 그대로**   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`AI_JOB_STATUS` 4종 — 살아 있다.** 넷 다 찍는 자리가 있다 (`queued` 는
     `aiJobs.status` 의 default · 나머지 셋은 `lib/ai/job.ts:276·309·324`) 그리고
     `AI_JOB_STATUS_RULES` 가 **DB CHECK 넷을 생성**해서 값마다 채워야 하는 칸이
     다르다 (`started`·`finished`·`result`·`error`). 2단계 통과 — 값을 바꾸면 INSERT 가 갈린다.
  ② **`origin` 4종 — `doc` 이 여전히 0곳** (FINDINGS **31** 그대로).
     `grep -rn "origin: '"` → `manual` **3** (PATCH · 질문 답변 · **이번에 는 충돌 정리**) ·
     `code` 1 · `proposal` 1 · **`doc` 0**. 🔴 §7.1 구조화 러너(`lib/ai/structure.ts`)는
     **개정을 만들지 않는다** — `contextItemRevisions` 를 안 쓴다. 그래서 31 의
     「§7.1 이 항목을 만들 때 `doc` 을 찍는다」는 자리가 **아직 코드에 없다.**
     ⚠ `lib/ai/conflict.ts:99` 는 프롬프트 머리에 `origin=` 을 실어 보낸다 —
     즉 **모델에게는 이미 묻고 있는데 답이 될 값이 데이터에 없다.** `doc_vs_code` 는 0건이다.
  ③ **`SourceDocumentKind` 6종 — `65` 그대로.** 저장되고 화면에서 고를 수 있고
     칩 색이 갈리지만, **어떤 판정도 이 값을 안 읽는다** (`lib/ai/prompt.ts`·
     `structure.ts` 에 `kind` 0건). 2단계 실패 — 값을 바꿔도 결과가 안 달라진다.
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: sync 상태 5종(**69**) · `ConflictStatus` 3종 ·
  `ChipSpec` 표 8개가 전부 그려지나 · `PRODUCT_TEXT_PACK_FILES`
- **상태**: ✅ 이번 바퀴에 확인함 (`a201a51` 바퀴)

### 71. 충돌을 **결정해도 항목이 안 바뀐다** — 화면 4 가 그 구멍을 처음 보이게 했다   [구멍]
- **증상**: 화면 4 에서 「A가 맞음」을 눌러도 `conflicts` 행의 `status`·`resolution` 만
  바뀐다. **가리켜진 두 항목은 그대로**다 — 진 쪽이 `deprecated` 로 가지도, 이긴 쪽이
  `review` 로 오지도 않는다. 사람은 결정을 눌러 놓고 Context 화면에서 **아무 변화도
  못 본다.** SPEC §5 는 이 엔드포인트를 「→ 항목 상태 갱신」이라고 적는다.
- **근거**: 이번 바퀴 직접 확인 —
  `apps/web/src/app/api/v1/conflicts/[id]/resolve/route.ts:16-19` 머리 주석이 **스스로
  적어 두었다**: 「SPEC 은 「→ 항목 상태 갱신」이라고 적지만 지금은 결정만 기록한다 ·
  충돌이 어느 항목을 가리키는지는 §7.2 가 `a_item_id`·`b_item_id` 로 낼 때 정해진다」 ·
  그 라우트의 `update` 는 `conflicts` 만 친다 (`context_items` INSERT·UPDATE 0건)
- **정본**: `docs/SPEC.md` §5(`POST /conflicts/{id}:resolve`) · §2(`context_items`)
- **왜 지금인가**: 🔴 **그 주석이 기다리던 조건이 이미 충족됐다.** `a_item_id`·
  `b_item_id` 는 `0003` 에서 생겼고 (FINDINGS 54 ✅), `conflictRow()` 가 `anchor:'items'`
  인 종류에 그 칸을 채운다. 「엉뚱한 항목을 폐기한다」는 걱정의 근거가 사라졌다.
- **고칠 방향**: 선택 4개 → **항목에 무엇을 하나**를 표로 두어라. `RESOLUTION_OUTCOME`
  (`lib/api/conflict.ts`) 바로 옆이 그 자리다 — 그 표는 이미 「선택 → 충돌 상태」를
  들고 있고, 여기 필요한 것은 「선택 → 진 쪽 항목의 다음 상태」다.
  ⚠ **`both`·`dismiss` 는 항목을 건드리지 않는다** (보류와 무시는 결정이 아니다).
  ⚠ 항목 상태를 바꾸면 **개정이 하나 생긴다** — 그 개정의 `source_refs` 에
  `{kind:'manual', note:…}` 가 붙어야 「누가 왜 폐기했나」가 남는다 (P7 · 68 과 같은 자리).
  ⚠ 트랜잭션 하나여야 한다. 충돌만 닫히고 항목이 안 바뀌면 다시 누를 문이 없다
  (라우트가 「이미 처리된 충돌」을 400 으로 막는다).
- **상태**: ✅ `a201a51` — 표는 `RESOLUTION_ITEM_OUTCOME` + `itemOutcomeOf()`
  (`lib/api/conflict.ts`). 진 항목에 개정이 하나 쌓이고 `{kind:'manual'}` 근거에
  충돌 id 가 들어간다. 잠근 것은 「상태가 바뀌었다」가 아니라 **「그 줄이 Pack 어느
  파일에도 없다」**(`api-publish.test.ts`) — `choice` 를 `both` 로 뒤집어 그 시험이
  빨개지는 것을 확인했다. 눈으로 읽은 것: `docs/evidence/2026-09-04-resolve-effect/`
  (결정 **전** CLAUDE.md 에 모순되는 must 두 줄이 나란히 있었다).
  ⚠ 남은 것 둘 → **74**(화면이 그 결과를 안 알린다) · **72**(안 그린 세 칸)

### 72. 화면 4 가 DESIGN_BRIEF 의 **세 칸을 아직 안 그린다**   [격차]
- **증상**: 이번 바퀴에 만든 화면 4 는 DESIGN_BRIEF §4 화면 4 의 카드 셋 중 본체는
  그리지만 아래 셋이 없다. 셋 다 **서버에 담을 자리나 문이 없어서** 안 그렸다 —
  지어내면 근거 없는 칸이 된다.
  ① **병합 카드의 「용어: ___」** — `duplicate` 카드의 [같음, 용어: ___]. 지금은
     [A로 합침]·[B로 합침] 뿐이다. 고른 용어를 담을 칸이 `resolution` 에 없다
     (`{choice, note}` 뿐이고 `note` 는 자유 문장이다).
  ② **[담당자 지정]** — 열린 질문 카드의 둘째 버튼. `OpenQuestionData.owner_id` 는
     있는데 **충돌 행에는 담당자 칸이 없고**, 사람 목록을 내는 문도 없다.
  ③ **`A 갱신 2026-07-12 · B 갱신 2026-08-04`** — 두 항목의 갱신 시각. `ContextItem`
     응답에 `updated_at` 이 **없다** (`ITEM_COLUMNS` 가 안 뽑는다). 「오래됨」 카드에서
     제일 쓸모 있는 숫자인데 화면이 볼 수가 없다.
- **근거**: 이번 바퀴 직접 확인 — `grep -n "updated_at" apps/web/src/lib/api/item.ts`
  0건 · `resolution` 의 모양은 `db/schema.ts:388` 의 `{ choice: ConflictChoice; note?: string }` ·
  눈으로 읽은 열다섯 모양: `docs/evidence/2026-09-04-screen4/conflict-card-states.txt`
- **정본**: `docs/DESIGN_BRIEF.md` §4 화면 4 · `docs/SPEC.md` §5
- **고칠 방향**: **③이 제일 싸고 제일 쓸모 있다** — `ITEM_COLUMNS` 에 한 줄이고
  화면 5 의 「갱신」 칸도 같은 값을 기다린다 (DESIGN_BRIEF 화면 5 의 표에 그 칸이 있다).
  ①②는 계약을 넓히는 일이라 **71 과 같이** 정하는 것이 맞다 — 셋 다 「결정이 무엇을
  남기나」의 갈래다.
- **상태**: ③ ✅ `a45cef0` · **①② 대기** (76 과 같은 자리 — 아래를 읽어라)
  - ③ — `ContextItemView`(`packages/schema`)를 더했다. `ContextItem` 에 `updated_at`
    한 칸만 더한 것이고, 화면 4 는 항목 옆에 「갱신 2026-07-12」을, 화면 5 표는
    「갱신」 칸을 그린다. 날짜를 만드는 자리는 `lib/web/time.ts` 의 `dateText` 하나다.
    🔴 **그 칸을 `ItemBase` 에 넣지 않은 것이 이 항목의 핵심 판단이다** — 컴파일러가
    받는 snapshot 의 항목이 `ContextItem` 이고 `snapshotHash()` 가 그것을 통째로 재서,
    시각이 섞이면 **내용이 같은 묶음이 매번 다른 지문**을 갖는다 (`generated_at` 을
    지문에서 뺀 것과 같은 이유 · `packages/compiler/src/hash.ts`). 그래서 서버의
    조립 함수도 둘이다 — 발행은 `toContextItem()`, 응답은 `toContextItemView()`.
    게이트 셋: 응답이 `ContextItemView` 로는 파싱되고 `ContextItem` 으로는 **안 된다** ·
    항목의 값을 바꾸면 카드의 날짜가 따라 바뀐다 · `dateText` 가 시간대와 무관하다.
    눈으로 읽은 것: `docs/evidence/2026-09-04-screen4-updated/item-updated-at.txt`.
    ⚠ **화면 5 표의 「갱신」 칸은 아직 눈으로 못 봤다** — 그 화면을 글자로 뽑는
    스크립트가 없다 (`docs/STATUS.md` 「눈 판정 대기」).
  - ①② — 그대로 대기다. 둘 다 「담을 칸이 없다」는 같은 고장이고, ①은 **76** 이
    남긴 그 자리다 (진 쪽 `source_refs` 를 이긴 쪽에 잇는 갈래를 정하는 날 같이 정한다).

### 73. 2-B 이번 라운드 — 셋 다 살아 있다 · `confidence` 는 **찍히기만** 한다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`ItemType` 10종** — `compiler/src/partition.ts`·`sections.ts` 가 읽고
     `compiler/test/liveness.test.ts` 가 「10종이 서로 다른 파일·다른 문장을 낸다」를 잠근다.
  ② **에러 코드 11종** — 열한 종 **전부** 표(`ERROR_HINT`) 밖에 내는 자리가 있다
     (가장 적은 것이 `REVISION_CONFLICT`·`RATE_LIMITED`·`COMPILE_FAILED` 각 1곳).
  ③ **`confidence` 3단계** — 살아 있지만 **찍히기만 한다**: `compiler/src/tag.ts:50` 이
     `conf:{값}` 으로 Pack 줄에 넣고 화면이 칩으로 그린다. 값을 바꾸면 Pack 바이트가
     갈리므로 2단계(「바꾸면 결과가 달라지나」)는 통과다.
     ⚠ **그러나 아무 판정도 이 값을 안 읽는다** — `low` 인 항목이 Pack 에서 빠지지도,
     화면에서 걸러지지도 않는다. SPEC 도 §7 프롬프트의 「확신 없으면 confidence:low」
     한 줄뿐이라 **의도된 소비처가 아직 없다.** 죽은 것은 아니지만 **얇다.**
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: sync 상태 5종(**69**) · `origin` 4종(**31** 이 그 항목이다) ·
  `SourceDocumentKind` 6종(**65**) · `AI_JOB_STATUS` 4종.
- **상태**: ✅ 이번 바퀴에 확인함

### 70. 2-B 이번 라운드 — 살아 있는 것 확인만 하고 새로 죽은 것은 못 찾았다   [기록]
- **증상**: 고장이 아니다. `loop/PROMPT.md` ④2-B 를 돌린 결과를 남긴다 — 안 남기면
  다음 바퀴가 같은 셋을 또 센다.
- **근거**: 이번 바퀴 직접 확인 —
  ① **`SourceRef` 4종** 전부 생산자가 있다 (68 이 마지막 하나를 살렸다).
  ② **`enforcement` 4종** — `packages/compiler/src/sections.ts:53` 의 `ENFORCEMENT_LABEL`
     이 값마다 **다른 문장**을 낸다 (`liveness.test.ts` 가 잠근다).
  ③ **`scope.kind` 3종** — `partition.ts:68·69` 가 **세 값을 서로 다른 파일**로 보낸다
     (`sort.ts:17` 도 `SCOPE_ORDER` 로 읽는다).
- **정본**: `loop/PROMPT.md` ④2-B
- **다음 라운드의 후보**: `ItemType` 10종 · 에러 코드 9종 · `confidence` 3단계 ·
  sync 상태 5종(**69** 가 그 항목이다).
- **상태**: ✅ 이번 바퀴에 확인함 (`e0148d0` 바퀴)

### 69. sync 상태 `manual` 을 **찍는 코드가 0곳**이다 — 다섯 중 하나가 죽어 있다   [격차]
- **증상**: `SYNC_STATUSES` 는 다섯이고 그중 넷이 DB enum(`REPORTABLE_SYNC_STATUSES`)이다.
  넷 중 셋(`applied`·`outdated`·`modified`)은 플러그인이 찍고, `unknown` 은 서버가
  「보고 없음」으로 매긴다. **`manual` 만 아무도 안 찍는다.** SPEC §6 은 그것을
  「zip 수동 적용」이라고 적는데, **Pack zip 을 내려받아 손으로 푸는 길이 아직 없다.**
  그래서 화면 9(기기별 상태)는 영원히 네 값만 그린다.
- **근거**: 이번 바퀴 직접 확인 — `grep -rn "manual" plugin/contextops/src` **0건** ·
  `apps/web/src/lib/api/sync.ts:16` 은 `NO_REPORT_STATUS = 'unknown'` 하나만 매긴다 ·
  찍는 자리 셋은 `plugin/contextops/src/cli/managed.ts:163·168·174`
- **정본**: `docs/SPEC.md` §6(동일성 판정) · §2 `sync_reports`
- **고칠 방향**: ⚠ **지우지 마라 — 직렬화된 enum 값이다** (`sync_status` pgEnum ·
  중간을 지우면 옛 행이 못 읽힌다). 둘 중 하나다:
  ① **살린다** — 화면 7 의 「Pack 다운로드」(zip)가 생기는 날, 그 zip 을 푼 기기가
     보고하는 값이 이것이다. 그때 「이 값을 보고하면 화면이 달라진다」를 시험으로 잠근다.
  ② **끝에서 줄인다** — zip 배포를 안 하기로 정하면 `REPORTABLE_SYNC_STATUSES` 에서
     빼고 SPEC §6 의 문장도 같이 지운다. ⚠ `SYNC_STATUSES` 는 그대로 둔다 (옛 행).
  🔴 **먼저 정할 것은 「Pack zip 을 내려받는 길을 만드나」다** — 그 답이 이 항목의 답이다.
- **상태**: 대기

### 68. `SourceRef` 의 `proposal` 을 **만드는 제품 코드가 0곳**이다 — 제안이 만든 줄이 그 제안으로 역추적되지 않는다   [구멍]
- **증상**: 개발자의 제안이 승인되어 발행되면 `insertRevision()` 이 `origin:'proposal'` 을
  찍는다. 그런데 그 개정의 `source_refs` 는 **클라이언트가 보낸 것 그대로**이고
  (`draft.source_refs` = 제안 Skill 이 만든 `repository_path`), 서버는
  `{kind:'proposal', proposal_id}` 를 **붙이지 않는다.** 그래서 Pack 줄의 태그는
  `src:repo:…` 하나로만 끝나고 **「이 줄은 어느 제안이 만들었나」로는 못 간다.**
  골든 픽스처는 `src:proposal:b1a7d9e0-…,repo:…` 를 갖고 있어서 **Pack 형식은 그것을
  약속하는데**, 진짜 발행은 그 모양을 절대 못 만든다.
- **근거**: 이번 바퀴 직접 확인 —
  `grep -rn "proposal_id" apps/web/src packages/*/src plugin/contextops/src` 의 소비처는
  `components/evidence.tsx:34`(표시)·`compiler/src/tag.ts:32`(직렬화)·
  `schema/src/common.ts:161`(선언) 셋뿐이다 · `kind: 'proposal'` 을 **쓰는** 자리는
  시험·픽스처뿐이다 (`web-tables.test.ts:90` · `compiler/test/liveness.test.ts`) ·
  `apps/web/src/lib/api/publish.ts:295-315` 가 `sourceRefs: draft.source_refs` 를
  그대로 넣는다 · 제안 Skill 은 `repository_path` 만 시킨다
  (`plugin/contextops/skills/propose/SKILL.md:40`)
- **정본**: `docs/SPEC.md` §3(`SourceRef`) · §2.1(발행 트랜잭션) · §4(태그) · **P7**
- **고칠 방향**: `insertRevision()` 이 이미 **어느 제안인지 알고 있다** (호출부가
  `approved` 를 돌고 있다 — `publish.ts:83`·`172`). 인자에 `proposalId` 를 더하고
  `sourceRefs: [...draft.source_refs, {kind:'proposal', proposal_id}]` 로 넣으면
  사슬이 이어진다. ⚠ 잠글 것은 「붙었다」가 아니라 **「제안으로 들어온 항목의 Pack
  줄에 `src:proposal:` 이 있다」**다 — 발행 시험(`api-publish.test.ts`)에서 태그를 읽어라.
  ⚠ 같은 자리에 `manual` 도 생산자가 없다. 그건 **화면 5(손으로 항목 추가)와
  질문 답변(FINDINGS 56)의 몫**이라 여기서 같이 만들지 마라 — 근거를 지어내게 된다.
- **상태**: ✅ `e0148d0` — `applyProposalItem()` 이 초안을 판 **직후 한 번만**
  `withProposalRef()` 로 붙인다 (`add`·`update` 두 갈래에 따로 적으면 반쪽 사슬이 된다).
  잠근 것은 「붙었다」가 아니라 **Pack 줄**이다 — `parseTraceTag()` 로 태그를 되읽어
  `proposal:{id}` 와 `repo:…` 가 **둘 다** 있는지 본다 (`api-publish.test.ts` +2).
  눈으로 읽은 줄: `docs/evidence/2026-09-04-p7-proposal/pack-line.txt`
  **같이 정한 것 둘**:
  ① 근거가 상한까지 차 있으면 **몰래 하나를 버리지 않고** 그 항목을 실패로 돌린다 —
     버리면 그 항목만 역추적이 조용히 한 칸 짧아지고 아무도 모른다. SPEC §2.1 2단계에 적었다.
  ② 상한 20 을 `SOURCE_REFS_MAX`(`packages/schema/src/common.ts`)로 올렸다 — 발행이
     「자리가 있나」를 물어야 해서, 숫자가 두 곳이 되면 한쪽만 고쳐지고 조용히 갈라진다.
  ⚠ 조각 **순서**는 골든과 다르다 (골든은 `proposal:` 이 앞, 발행은 뒤). 태그를 읽는
  쪽은 순서를 안 봐서 고치지 않았다 — 맞추려고 골든을 건드리면 P4 게이트만 흔든다.
  🔴 **`SourceRef` 4종이 이제 전부 생산자를 갖는다** — `source_document`(§7.1
  `lib/ai/structure.ts:238`) · `repository_path`(scan → batch-draft) ·
  `proposal`(발행) · `manual`(씨앗 질문 답변 · 손으로 고치기).

### 67. 화면 3 의 **세 길 중 둘이 없다** — 「문서 없이 질문만으로」가 막혀 있다   [구멍]
- **증상**: DESIGN_BRIEF §4 화면 3 은 큰 선택 카드 **셋**이다 — ① wiki zip 올리기
  ② 문서 붙여넣기 ③ 질문 10개에 답하기. 이번 바퀴에 만든 화면은 **②만** 그린다.
  ①은 서버에 zip 경로 검사·개수·용량 상한이 없고 (SPEC §11 · FINDINGS 26 의 남은 절반),
  ③은 **그 열 개를 만드는 코드가 0곳**이다 — `GET /projects/{id}/questions` 는
  `kind='open_question'` 인 충돌 행을 읽는데, 그 행을 만드는 자리가 §7.1 러너 하나뿐이라
  **문서를 올려야 질문이 생긴다.** 「문서가 없어도 됩니다」가 지금은 거짓이다.
- **근거**: 이번 바퀴 직접 확인 — `grep -rn "open_question" apps/web/src` 의 INSERT 는
  `lib/ai/job.ts` 의 `structureJob.run` 한 곳뿐이다 (`questions/route.ts` 는 읽고 닫기만
  한다) · 화면 코드 `app/t/[team]/p/[project]/import/page.tsx` 머리 주석
- **정본**: `docs/SPEC.md` §9 화면 3 · `docs/DESIGN_BRIEF.md` §4 화면 3
- **왜 급한가**: 🔴 **`docs/PLAN.md` P3 둘째 행의 완료 기준이 바로 이것이다** —
  「문서 없이 **질문만으로** v1.0 발행 가능」. ②만으로는 그 행을 못 닫는다.
- **고칠 방향**: ③이 먼저다 (①은 SPEC §11 상한과 한 묶음이라 더 크다). 열 개 질문의
  **정본이 어디인가**부터 정해라 — 갈래 둘이다: ⓐ 씨앗 질문을 `conflicts` 행으로
  심는 코드 (프로젝트를 만들 때 · `POST /teams/{id}/projects` 옆) ⓑ 질문 문구를 표
  하나로 두고 화면이 읽어 그리되 답할 때 행을 만든다.
  ⚠ ⓐ면 「AI 가 만든 것」이 아닌 충돌 행이 처음 생긴다 — `conflicts` 에 그것을 구별할
  칸이 있는지 먼저 봐라 (없으면 화면 4 가 사람이 심은 질문에도 `AI 제안` 배지를 단다).
  ⚠ 어느 쪽이든 답변은 이미 문이 있다 (`POST /projects/{id}/questions` · `draft` optional).
- **상태**: ✅ **③이 닫혔다** — `9f481a0`(서버) + `a24120e`(화면). **①(zip)은 남아 있다.**
  갈래 ⓐ·ⓑ 중 **ⓐ**(프로젝트를 만들 때 심는다)를 골랐다. 이유 둘:
  ① 답변 → 항목 → 발행의 **문이 이미 다 있다** (`POST /questions` 가 답을 받고 항목을
     만든다). ⓑ 는 그 문을 새로 내야 하고, 새 문은 새 계약·새 P1 검사 자리다.
  ② 「3 / 10」이 **새로고침을 견뎌야 한다.** 표만 두고 화면이 그리면 진행이 브라우저
     안에만 있고, 그건 화면 3 이 job 진행에서 이미 한 번 배운 고장이다 (FINDINGS 58).
  ⚠ FINDINGS 가 경고한 「구별할 칸이 있나」는 **새 종류로 풀었다** — `seed_question` 은
  `open_question` 과 다른 `kind` 라 화면 4 가 배지를 다르게 달 수 있다. 같은 종류로
  심었으면 `anchor:'document'` 라서 **없는 문서를 가리키는 `a_ref` 를 지어내야** 했다
  (그래서 `CONFLICT_ANCHORS` 에 `none` 이 생겼다).
  🔴 **그래도 P3 둘째 행은 안 닫힌다** — 「질문만으로 **v1.0 발행**」까지 재려면
  발행을 실제로 눌러 봐야 하고 화면 4 도 없다. **재지 않은 것을 체크하지 마라.**

### 66. `BUDGET_EXCEEDED` 문구가 **없는 것을 약속한다** — 「샘플 결과를 표시합니다」   [구멍]
- **증상**: 예산이 소진되면 화면 3 이 「오늘의 AI 예산이 소진되었습니다. **샘플 결과를
  표시합니다.**」라고 말하는데 **샘플을 표시하는 코드가 0곳**이다. SPEC §7.5 는
  「예산 초과 시 픽스처 결과로 떨어진다」고 적었는데 **그 픽스처가 어디 있는지도,
  고르는 코드도 없다** (FINDINGS 52 가 「화면 3 의 몫」이라고 미뤄 둔 갈래다).
  사람은 「샘플이 어디 있지」를 찾다가 화면이 고장난 줄 안다.
- **근거**: 이번 바퀴 눈으로 읽음 — `docs/evidence/2026-09-04-screen3/job-panel-states.txt`
  ⑤: `✕ 정리 실패 | 오늘의 AI 예산이 소진되었습니다. 샘플 결과를 표시합니다. |
  4조각 중 1에서 멈췄습니다.` — 그 뒤에 아무것도 없다 ·
  `grep -rn "픽스처\|fixture" apps/web/src/lib/ai` 는 0건
- **정본**: `docs/SPEC.md` §7.5 · `docs/DESIGN_BRIEF.md` §5 (문구의 정본) · P3
- **고칠 방향**: 둘 중 하나만 해라 — **어중간하게 두면 이 문장이 계속 거짓말을 한다.**
  ① **약속을 지운다** (싸다) — `ERROR_HINT.BUDGET_EXCEEDED` 를 「오늘의 AI 예산이
  소진되었습니다. 내일 다시 시도해주세요.」로 바꾸고 DESIGN_BRIEF §5 를 같이 고친다.
  ⚠ 문구의 정본은 DESIGN_BRIEF 다 — 표만 고치면 `web-tables.test.ts` 가 막는다.
  ② **픽스처를 만든다** — SPEC §7.5 대로. 그때 정할 것은 「어디에 두나」이고,
  답은 `fixtures/` 다 (`packages/schema` 가 아니다 — 플러그인 번들로 나간다).
  ⚠ 그리고 그 갈래는 **job 이 `failed` 로 끝나면 안 된다** — `succeeded` + `result` +
  「이건 샘플이다」를 말하는 칸이 필요하고, 그 칸은 `AI_JOB_STATUS_RULES` 옆이다.
  🔴 **①이 먼저다.** ②는 P3 예산 가드의 뜻(「탈 것이 없으면 안 탄다」)과 부딪치는
  결정이라 SPEC §7.5 를 다시 읽고 정해야 하고, 그동안에도 화면은 거짓말을 하면 안 된다.
- **상태**: ✅ `4cb1ce8` — **①을 골랐고, ②는 「안 만든다」로 닫았다** (SPEC §7.5 를 다시
  읽고 정했다). 문구는 「…내일 다시 시도해주세요.」다 — `RATE_LIMITED`(「잠시 후」)와
  다른 문장이라 사람이 둘을 구별한다.
  **②를 안 만드는 이유 둘** (SPEC §7.5 에 적었다): ① 실제 프로젝트에 픽스처 항목을
  넣으면 그 줄이 **사용자의 원문으로 역추적되지 않는다 — P7 이 끊긴다.** §7.4 게스트
  데모는 픽스처가 곧 원문이라 안 끊긴다. 그래서 「픽스처로 떨어진다」는 §7.4 전용이다.
  ② job 이 「실패도 성공도 아닌」 **셋째 수명 모양**을 가져야 하는데, 예산이 없어서
  못 한 일을 `succeeded` 로 적는 것은 `AI_JOB_STATUS_RULES` 의 뜻과 어긋난다.
  화면 8 질의창 배지도 같은 약속을 **복사**하고 있어서 같이 고쳤다 — 반만 고치면
  화면 8 을 만드는 바퀴가 그 거짓말을 되살린다.
  게이트로 올렸다: `web-tables.test.ts` 가 문구를 **복사해** 갖고 있었는데
  (정본이 셋이면 정본이 아니다) 이제 `docs/DESIGN_BRIEF.md` §5 를 **읽어서** 대조한다
  (`briefSection5()` · 연결선은 `BRIEF_5_BULLET` 한 줄) · 「샘플」을 약속하는 문장이
  코드에도 §5 에도 없다는 시험 하나. 웹 시험 258 → **259**.
  눈으로 읽은 근거: `docs/evidence/2026-09-04-budget-hint/job-failed-hints.txt`
  (실패 네 갈래가 전부 다른 문장을 내고, 어느 것도 없는 것을 약속하지 않는다)

### 65. `source_documents.kind` **6종이 아무것도 안 바꾼다** — roadmap 과 notes 가 똑같이 구조화된다   [격차]
- **증상**: 문서를 올릴 때 `kind`(`goal`·`policy`·`roadmap`·`adr`·`notes`·`wiki`)를 받아
  행에 저장하고 응답으로 되돌려준다. 그런데 **그 값을 읽어서 무언가를 바꾸는 코드가 0곳**이다.
  특히 §7.1 구조화가 그 값을 **모른다** — `structureDocument()` 가 받는 것은 `content`
  뿐이라, 로드맵 문서와 잡기(notes)가 **똑같은 프롬프트**로 똑같이 뜯긴다. 종류가 6개인데
  동작은 하나다.
- **근거**: 이번 바퀴 직접 확인 —
  `grep -ran "SOURCE_DOCUMENT_KINDS|\.kind" apps/web/src packages/compiler/src` 의 소비처는
  `documents/route.ts:39`(INSERT)·`:78`(응답에 되싣기)·`db/schema.ts:131`(pgEnum) 셋뿐이다 ·
  `lib/ai/prompt.ts`·`lib/ai/structure.ts` 에 `kind` 라는 낱말이 **없다**
  (`structure.ts:238` 의 `kind:'source_document'` 는 `SourceRef` 의 종류라서 다른 것이다)
- **정본**: `docs/SPEC.md` §2 · §7.1
- **고칠 방향**: 둘 중 하나만 해라 (CLAUDE.md 「살린다 아니면 지운다」).
  ① **살린다** — 종류마다 「이 문서에서 주로 나오는 항목 타입」이 다르다 (roadmap → milestone,
  policy → policy/rule, adr → decision). 그 대응을 **표 하나**(`Record<SourceDocumentKind, …>`)로
  두고 §7.1 프롬프트가 읽게 한 뒤, 「종류를 바꾸면 뽑히는 것이 달라진다」를 시험으로 잠근다.
  ⚠ 표를 `packages/schema` 에 둘지 서버에 둘지는 **프롬프트가 유일한 소비처인가**로 정해라
  (`features.ts` 머리 주석의 판단과 같다).
  ② **지운다** — 6종을 2종(`doc`·`notes`)으로 줄이고 왜 줄였는지 커밋에 한 줄.
  ⚠ enum 값은 직렬화된다 — 중간을 지우지 말고 끝에서만 줄여라.
- **상태**: ✅ `5fe0068` — **82 에서 ①(살린다)로 닫았다.** 표는 `SOURCE_DOCUMENT_KIND_BRIEF`
  (서버에 뒀다 — 프롬프트가 유일한 소비처라 `packages/schema` 로 올리지 않았다).
  ⚠ 여기 적어 둔 「종류 → 주로 나오는 항목 타입」까지는 안 갔다. 문서가 무엇인가만
  한 줄로 말한다 — 「roadmap 이면 milestone 을 내라」는 §7 공통 금지(없는 것을 만들지
  않는다)와 싸울 수 있어서, 그 대응이 필요해지면 그때 이 표에 한 칸을 더한다.
- **(옛 상태)**: 대기 — 화면 3 이 생겼고 (`85c6ac2`) **여섯 종류를 다 고를 수 있게** 됐다
  (`SOURCE_DOCUMENT_KIND_LABEL` · 다섯만 그리면 여섯째가 아무도 못 고르는 값이 된다).
  ⚠ **그래도 이 항목은 안 닫힌다** — 라벨이 붙었다고 살아난 것이 아니다. 고른 값이
  여전히 **아무것도 바꾸지 않는다** (§7.1 프롬프트가 그 값을 모른다). 이제 사람이
  종류를 고르는 화면이 있으니 「골랐는데 아무 차이가 없다」가 눈에 보이는 격차가 됐다

### 64. `ai_jobs.updated_at` 을 **아무도 읽지 않는다** — 멈춘 job 과 도는 job 이 같아 보인다   [격차]
- **증상**: `runJob()` 은 집을 때·걸음마다·끝날 때 `updated_at` 을 쓴다 (이번 바퀴에
  진행률까지 그 칸을 건드리게 됐다). 그런데 **읽는 코드가 0곳**이다 — `AI_JOB_FIELDS`
  표에 그 칸이 없어서 목록에도 상세에도 안 나간다. 그래서 화면 3 은 `status:'running'`
  인 job 이 **10초 전에 한 걸음 갔는지 40분째 안 갔는지** 구별할 수 없다.
  서버가 chunk 중간에 죽으면 그 행은 영원히 `running` 이고(집기는 `queued` 만 집는다),
  화면은 영원히 막대를 그린다. FINDINGS 59(재시도)는 `failed` 만 다루므로 이 갈래를
  아무도 안 줍는다.
- **근거**: 이번 바퀴 직접 확인 — `grep -rn "updatedAt" apps/web/src` 는 **쓰는 자리
  14곳뿐**이고 `select` 에 든 곳이 없다 · `docs/evidence/2026-09-04-jobs-progress/polling.txt`
  의 ②~③ 여섯 응답 중 `updated_at` 이 있는 것은 0개다 (`started_at`·`finished_at`·
  `created_at` 셋만 나간다)
- **정본**: `docs/SPEC.md` §2 · §5 · §9 화면 3
- **고칠 방향**: `AI_JOB_FIELDS` 에 `updated_at: { heavy:false }` **한 줄**이면 응답까지
  따라온다 (표가 두 모양을 다 만든다). ⚠ 그것만으로는 「멈춤」을 **판정**하지 않는다 —
  판정을 하려면 넘길 시간(초)이 상수로 한 곳에 있어야 하고, 그 값은 화면이 아니라
  `AI_FEATURE_LIMITS` 옆처럼 **기능 표**에 있어야 한다 (기능마다 한 걸음의 길이가
  다르다). ⚠ 그리고 「멈춘 job 을 되살리는」 문은 FINDINGS 59 와 **한 묶음**이다 —
  `running` 을 `queued` 로 되돌리는 것도 같은 자리다. 둘을 같은 바퀴에 정해라.
- **상태**: ✅ `1bc1116` — 표에 한 줄(`AI_JOB_FIELDS.updated_at`)로 응답까지 따라왔고,
  **판정까지 했다.** 잣대는 `AiJobRunner.stallAfterSec`(러너 표의 한 칸 · structure 180 ·
  conflict 300)이다 — `AI_FEATURE_LIMITS` 가 아니라 **러너 표**를 고른 이유는 「한 걸음」의
  낱말(`unit`)이 이미 거기 있어서다. 같은 개념(한 걸음)의 길이와 이름이 갈라지면 안 된다.
  그리고 §7.3·§7.4 는 job 이 아니라 그 표에는 이 칸이 뜻이 없다.
  판정은 **서버가 해서 값(`stalled`)으로 내보낸다** — 잣대가 서버 전용 표에 있고
  (`features.ts`: 계약 패키지로 올리면 플러그인 번들로 사용자 기계에 배포된다) 화면의
  시계는 서버와 어긋난다. 근거(`updated_at`)를 판정 옆에 같이 낸다.
  「끝났나」는 `AI_JOB_STATUS_RULES.finished` 를 읽는다 — 상태 이름을 손으로 안 센다.
  ⚠ **되살리는 문은 안 만들었다** — FINDINGS 59 와 한 묶음이라고 이 항목이 적어 둔 그대로다.
  시험 **+5** (231 → 236) · 눈으로 읽은 근거:
  `docs/evidence/2026-09-04-jobs-stalled/stalled.txt` (같은 행에서 시각 하나만 밀면
  `stalled` 가 `false → true → false` 로 뒤집힌다)

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
- **상태**: ✅ `82b886b` — **①이 아니라 ②를 골랐다.** ①(`input` 에 chunk 총수를 미리
  넣는다)은 총수만 알려 주고 「지금 어디인가」는 여전히 모른다 — 회전이 「4조각짜리
  회전」이 될 뿐이다. 그리고 `input` 은 「가리키는 id 만」이라는 규칙(P1 주석)이 있는
  칸이라 파생 수치를 넣으면 그 규칙이 흐려진다. 그래서 **`ai_jobs.progress
  {done,total,unit}`** 한 칸을 뒀다 (마이그레이션 `0005`).
  러너가 한 걸음마다 갱신한다 — §7.1 은 chunk 마다, §7.2 는 묶음 하나다.
  **CHECK 밖인 이유**를 표 옆에 적었다: `running` 인데 비어 있을 수 있고(총수는 러너가
  나눠 봐야 안다) `failed` 인데 차 있어야 한다(「9/12 에서 죽었다」). 걸음의 낱말은
  `AiJobRunner.unit` 이 정해 값에 실려 나가므로 **화면에 `feature ===` 갈래가 없다.**
  시험 **+6** (225 → 231) — 스텁 LLM 이 부르기 전에 행을 읽어 **도는 도중**을 붙잡는다.
  눈으로 읽은 근거: `docs/evidence/2026-09-04-jobs-progress/polling.txt` —
  목록 한 줄이 `queued(null) → running 0/4 → 1/4 → 2/4 → 3/4 → succeeded 4/4` 로 자란다.

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
- **🔴 이번 바퀴에 한 칸 더 벌어졌다** (`82b886b`): job 응답에 `progress` 가 생겼는데
  `POST /documents` 가 내는 `{id,status}` 에는 그것도 없다. 화면이 그 객체로 첫 막대를
  그리려 하면 `undefined` 다.
- **🔴 또 벌어졌다** (FINDINGS 64 를 닫으면서): 이제 job 응답에는 `updated_at` 과
  **`stalled`**(서버가 내는 「멈췄나」 판정)까지 있다. `{id,status}` 에는 넷 다 없다 —
  화면이 그 객체를 job 으로 들고 다니면 「멈춤」을 **`undefined` 로 읽는다**(=거짓).
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
- **상태**: ✅ `7ba2feb` — **91·97 과 같은 항목이다.** 이 진단(마지막 두 줄)이 처음부터
  정확했는데 **34바퀴 동안 안 고쳐졌다.** 전말과 게이트는 97 에 적었다.

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
- **상태**: ✅ `c57b3fb` — **84 가 낸 문이 그 자리다.**
  `POST /projects/{id}/jobs/{jobId}/items` 가 §7.1 후보를 받아들일 때
  `insertDrafts({origin:'doc'})` 로 찍는다. 이제 넷 다 찍는 자리가 있다 —
  `doc`(이 문) · `code`(batch-draft) · `manual`(씨앗 질문 답변·부분 갱신) ·
  `proposal`(발행 트랜잭션). 그래서 §7.2 의 `doc_vs_code` 가 **실데이터로 날 수 있다**
  (전에는 한쪽 값이 영원히 0건이라 그 종류가 절대 안 나왔다).
  게이트는 `ai-job.test.ts` 의 「같은 프로젝트에 문서로 하나·scan 으로 하나를 넣고
  `origin` 이 `doc`·`code` 로 갈린다」이다 — 소비처가 생겼다에서 멈추지 않았다.
  ⚠ `REVISION_ORIGINS` 표 옆에 「값을 더하면 찍는 자리를 같이 만들어라」를 적어 두었다.

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
