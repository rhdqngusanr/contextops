# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-04 · 루프 16바퀴 · `7cf9d50`_

---

## 지금 어디인가

**P3 첫 행의 ③(충돌 탐지)이 끝났다. `withBudget()` 의 두 번째 소비처가 생겼다.**
항목 둘이 어긋나는 것을 **질문 카드로 만드는 코드가 돈다** (`lib/ai/conflict.ts` · 시험 24개).
`AI_FEATURES` 4종 중 **둘**(`structure`·`conflict`)이 부르는 자리를 가졌다.

**①②③이 다 끝났는데도 P3 첫 행은 열려 있다** — 완료 기준(「paylab 문서 → 항목 12 +
충돌 3」)은 진짜 키와 라우트가 있어야 잰다. 다음은 **P3 둘째 행 「웹 화면 3·4」**다.

⚠ **여기서 만든 것도 lib 하나다. 부르는 자리가 없다** (FINDINGS 54) —
게다가 **낸 것을 담을 칸도 없다**: `conflicts` 표는 `a_item_id` 도 `severity` 도 없다.
⚠ **진짜 Claude 를 부른 적이 없다.** API 키가 없어 스텁으로만 쟀다 (🙋 사람).

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | **`conflicts` 표에 쓰는 코드** (FINDINGS 54·28) |
| `packages/schema` (계약 전부 · 로컬 파일 **8종** · 테스트 **113**) | Supabase 프로젝트 (🙋 사람) · Vercel |
| `packages/compiler` (파이프라인 7단계 · 테스트 **136** · 태그 읽기) | 웹 화면 **1·3·4·6·8·9** |
| `apps/web` — 라우트 28개 · 테스트 **190** | **`structureDocument`·`detectConflicts` 를 부르는 라우트** (52·54) |
| 🔴 **예산 가드** — `lib/ai/{features,budget,client,model}.ts` · `ai_usage` 표 · 시험 18 | `ask`·`demo` 를 부르는 자리 (기능 표의 나머지 둘 · §7.3·§7.4) |
| 🔴 **문서 구조화** — `lib/ai/{structure,prompt}.ts` · `AiStructureOutput` · 시험 24 | 구조화·탐지 job 상태를 담을 자리 (화면 3 이 polling 한다 · SPEC §9) |
| 🔴 **충돌 탐지** — `lib/ai/conflict.ts` · `CONFLICT_KIND_RULES` 표 · `AiConflictOutput` · 시험 24 | **토큰 발급 화면** (FINDINGS 36 — 지금은 라우트를 손으로 친다) |
| 웹 화면 5개 (`/login` `/auth/callback` `/t/new` `…/context` `…/packs`) | Anthropic API 키 (🙋 사람) · 실데이터 픽스처(`brain`) 판단 (🙋 사람) |
| 🔴 **`plugin/contextops` — CLI 8/8 · Skill 3 · 훅 2 · 테스트 174** | `origin='doc'` 을 찍는 코드 (FINDINGS 31 — 없으면 `doc_vs_code` 가 영원히 0건) |
| **`scripts/dev-server.ts`** — 화면·API 를 눈으로 볼 수 있는 씨앗 서버 | |
| ✅ **모든 Pack 에 `workflow.md`** — 진행 보고 문단이 항상 나간다 (FINDINGS 43·8) | |

검사 층: `principles OK 9 · typecheck 5초·멤버 4 · test 42초·멤버 4 · build 17초 ·
walkthrough 52초` → **GREEN**. 관통 **7단계**
(fixture·compile·api·publish·scan·payload·sync). 남은 SKIP 하나(`shots`)의 prereq 는
`apps/web/e2e`. ⚠ 관통은 §7.1·§7.2 를 **지나지 않는다** — 키가 없고 라우트가 없다.
시험 합계 **613** (schema 113 · compiler 136 · plugin 174 · web 190).
⚠ 15바퀴 STATUS 의 「compiler 130」은 낡은 값이었다 — 직접 세어 **136** 이다.

## 다음 바퀴가 할 일

🔴 **`docs/PLAN.md` P3 둘째 행 — 웹 화면 3·4 (가져오기 · 정리 · 질문 카드).**
그 행이 §7.1·§7.2 를 **처음으로 부르는 자리**다. FINDINGS **52·54·25·29·26** 이
전부 이 행을 기다린다.

**시작하기 전에 아는 것 (두 바퀴가 깔아 둔 자리):**

- 🔴 **첫 결정은 「job 상태를 어디에 두나」다.** 12 chunk 짜리 문서도 40개 항목의 탐지도
  한 요청 안에서 안 끝난다. SPEC §9 화면 3 이 「구조화 진행 표시(polling)」라고 적은 것이
  그 뜻이다. **구조화와 탐지가 같은 자리를 쓴다** — 둘을 따로 만들지 마라.
- 🔴 **둘째 결정은 `conflicts` 표의 모양이다** (FINDINGS **54·25·29** 를 한 묶음으로).
  이번 바퀴가 근거를 깔아 뒀다: §7.2 가 내는 **넷은 전부 항목 대 항목**이고
  (`CONFLICT_KIND_RULES[k].needsB` 가 넷 다 `true`), `open_question` 하나만 문서 구간을
  가리킨다. 그래서 `SOURCE_REF` 를 넓히는 길은 **P7 을 깬다** — 항목의 근거가 다른
  항목을 가리키면 원문까지 가는 사슬이 끊긴다. `conflicts` 에 `a_item_id`·`b_item_id`·
  `severity` 칸을 더하는 쪽이 남는 길이다. 마이그레이션이 `0003` 이 된다.
- 🔴 **키가 없으면 `client.ts` 가 던진다.** lib 은 던지는 데까지가 제 일이다 —
  §7.5 의 「픽스처 결과로 떨어지는」 갈래는 **라우트·화면**이 받는다. 두 lib 이 던지는
  것은 넷이다: `BUDGET_EXCEEDED` · `RATE_LIMITED` · `AI_OUTPUT_INVALID` · 키 없음(`Error`).
  **앞의 셋은 `ApiError` 라 봉투로 나가고, 넷째만 다르다.**
- **베껴라, 새로 짜지 마라** — `structure.ts` 와 `conflict.ts` 가 이제 **같은 모양 둘**이다.
  §7.3(`ask`)·§7.4(`demo`)도 그 모양이다: `withBudget(기능, {projectId, inputChars, actor?, now?},
  async () => { …callClaude… })` → Zod 재검증 → 오류 위치를 넣어 1회 재시도 → `AI_OUTPUT_INVALID`.
  ⚠ **공통 프롬프트는 §7.3 을 만들기 전에 손봐라** (FINDINGS **55**) — 지금 공통 7줄 중
  3줄이 §7.2 에서 무의미하다. 넷 중 셋에 안 맞으면 그건 공통이 아니다.
- **`withBudget` 은 「일 하나」에 한 번이다.** §7.1 은 문서 하나 · §7.2 는 탐지 한 번.
  §7.3·§7.4 도 「무엇마다 한 번인가」를 **먼저** 정해라 — 그게 빈도 상한의 뜻이다.
- **DB 는 안 건드렸다** — 마이그레이션은 여전히 `0002` 까지다.

⚠ **P1 첫 행(DB·Supabase)은 사람이 막고 있다** — 루프 몫은 끝났다 (`389c7f2`).
⚠ **Anthropic API 키도 사람이 준다.**

**값싼 것들 (아무 바퀴에서나)**: FINDINGS **21·22·23·17·32·44** 는 문서·한 줄짜리다.
**14**(`.ps1` 두 개가 LF)도 그렇다. **55**(공통 프롬프트)는 §7.3 전이 제일 싸다.
🔴 **30 과 46 은 한 묶음이다** — 둘 다 템플릿 `head` 한 줄이고 둘 다 golden 을 깬다.
🔴 **50 은 여전히 값싸고 여전히 급하다** — 이제 `callClaude()` 를 부르는 제품 파일이
**둘**이고, 그 게이트는 예산 가드를 건너뛰는 새 파일을 못 잡는다.

⚠ FINDINGS **24·25·26·28·29·31·33·35·52·54** 는 **P3 둘째 행**이, **36** 은 **P4 화면 9** 가,
**53** 은 **API 키가 생긴 뒤**가 주인이다.

## 잰 것

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

_(없음)_ — 이번 바퀴에 만진 것은 화면이 아니라 컴파일러·계약이다.
**관통이 낸 Pack 을 직접 읽었다** (`.ci/walkthrough-pack/` · 파일 4개).
⚠ `.ci/` 는 다음 관통이 통째로 지운다 — 근거로 인용할 거면 **적기 전에 밖으로 복사**해라.

**생성된 Pack 을 사람으로서 읽은 판정**: `CLAUDE.md` 는 여전히 팀 규칙으로 배포할 만하다.
새로 나가는 `.claude/rules/workflow.md` 는 **8줄**이고, 진행 보고 5줄이 다 있다 —
「agent 가 `progress` 를 어디서 배우나」의 답이 이제 모든 Pack 에 있다.
**그런데 그 파일을 읽다 격차 하나를 봤다** — 머리말이 `# 작업 절차`인데 본문은
ContextOps 사용법 하나뿐이라 제목과 내용이 어긋난다 → **FINDINGS 46**.
⚠ `domain-refund.md` 의 제목이 여전히 **「# 도메인」**이라 어느 도메인인지 본문에 없다
(FINDINGS 30). **30 과 46 은 같은 자리(`DOCS` 표의 `head`)라 한 바퀴에 같이 해라** —
둘 다 golden 을 깨므로 `TEMPLATE_VERSION` 을 한 번만 올리면 된다.

**아직 눈으로 못 본 것** (다음에 화면을 건드리면 여기부터):

- 🔴 **Skill 셋이 Claude Code 안에서 실제로 도는 것** — `/contextops:init` 를 사람이
  한 번 눌러 봐야 한다 (GATE 2 의 나머지 절반). 무인 세션은 SKILL.md 의 **명령줄이
  실재하는지**까지만 잰다 (`test/skills.test.ts`)
- **Stop 훅이 진짜 Claude Code 세션에서 stdin JSON 을 받는 모양** — 시험은
  `{session_id}` 를 우리가 넣어 준다. 실제 payload 의 칸 이름이 다르면 훅은
  **조용히 「세션 id 를 모른다」로 물러선다** (그게 안전한 기본값이라 증상이 없다)
- 화면 5 의 **발행 모달** · **상세 드로어** — 헤드리스에서 버튼을 못 누른다.
  `apps/web/e2e` 가 생기면 자동으로 찍힌다
- **empty 상태** — 항목이 0개인 프로젝트를 만들어야 본다 (씨앗은 6개를 넣는다)
- 화면 7 의 **제외된 항목 접이식** — 이번 씨앗은 `excluded` 가 비어 있다
- **`setup` 의 물어보기 흐름** — TTY 가 있어야 도는 갈래다. 시험(`answers`)으로는 잠갔지만
  진짜 터미널에서 붙여 넣어 본 적은 없다

⚠ 여섯 다 **코드에는 있고 시험은 초록**이다. 그래서 더 위험하다 —
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
