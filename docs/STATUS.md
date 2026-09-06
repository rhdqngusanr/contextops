# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-07 · 루프 83바퀴 · 코드 `5be2611`(FINDINGS 143 ✅ — 규칙 목록은 줄마다 항목 · 부정형도 규칙 · 진짜 Gemini 로 환불 줄이 policy · 충돌 3/3 한 번 · 0/3 한 번 → 146 기록) · 문서는 그 다음 커밋_

---

## 지금 어디인가

**이번 바퀴(83)는 FINDINGS 143 — 격차(old-roadmap.md 「운영 규칙」 3줄 중 환불 줄이 항목이 안 돼 충돌이 3 이 못 된다)를 닫았다** (`5be2611`). INBOX 「할 것」비어 있음 · 관통 7단계 OK(998) · 고장 0 · 143 은 PLAN P3 첫 행의 완료 기준 「충돌 3」의 절반이라 ④3 ② 와 어긋나지 않는다.
**프롬프트만 바꿨다** — `structure.ts` SYSTEM 에 `RULE_LIST_LINES` 두 줄(규칙을 나열한 절은 **줄마다** 항목 하나 · 문서 종류가 로드맵·메모여도 그 안의 규칙은 policy · 「기한은 따로 두지 않는다」 같은 **부정형도 규칙**). 종류 표(`SOURCE_DOCUMENT_KIND_BRIEF`)가 아니라 SYSTEM 인 이유는 여섯 종류 전부에 해당해서다.
기준은 안 낮췄다 · `conflict.ts`·스키마·화면은 손대지 않았다. 시험 +1(SYSTEM 에 그 문장이 산다 — 표를 읽어서 센다). `p3:measure` 가 항목의 **scope** 를 기록하게 했다 (아래 146 의 이유).

🔴 **잰 것** (`docs/evidence/2026-09-07-p3-gemini/probe.txt` · 진짜 gemini-3.5-flash · 같은 코드 `5be2611` 로 **두 번**):

| | 전 (`3b6ebef` · 82바퀴) | 후 1회차 (`probe-run1.json`) | 후 2회차 (`probe.json`) |
|---|---|---|---|
| old-roadmap 항목 | 5 (roadmap 3 · policy 2) | **6** (policy 3) | **6** (policy 3) |
| 환불 줄 | 항목 없음 | `item_refund_handling_sla` · 인용 「- 환불은 담당자가 확인하는 대로 처리한다. 기한은 따로 두지 않는다.」 | `item_refund_sla_none` · 같은 줄 |
| goals 항목 · 질문 | 12 · 4 | 18 · 4 (policy 7 · architecture 5) | 14 · 4 (policy 7 · domain 1) |
| 인용 (첫 줄 = 제목의 문장) | 21/21 | 24/24 범위 안 · 눈으로 24 | 24/24 · 눈으로 24 (M1~M3 는 `###` 제목 줄부터) |
| accept 거절 | 1 (`item_psp_retry_policy` 같은 slug) | 1 (같은 slug) | 1 (같은 slug) → **145 그대로** |
| 탐지 후보 `{used,total}` | 2/2 | **0/0** | **3/3** |
| 충돌 | 1/3 | **0/3** | **3/3** — PII 금지 vs payload 로그 7일 · 고정 간격 금지 vs 0.5초 고정 · 24h 종결 vs 기한 없음 · 전부 contradiction high · 질문형(판정 없음) |
| 장부 | 3행 | 3행 ≈ $0.019 | 3행 ≈ $0.019 |
| 시험 · CI | ai-structure 26 · GREEN 23:55 | — | ai-structure **30/30** · CI **GREEN 00:31** (principles OK 9 · test 88초 · build 19초 · walkthrough **999** · docs OK) |

⚠ **PLAN 행은 열어 뒀다** — 3/3 을 봤지만 **같은 코드의 직전 실행이 0/3** 이다. 1회차의 후보 0 은 `detectConflicts()` 가 「같은 type **이고 같은 scope**」만 후보로 싣는데 scope 를 모델이 항목마다 고르기 때문이다 — 2회차는 policy 6개가 전부 `project` 라 3 이었고, 1회차는 probe 가 scope 를 안 적어 어느 쪽이 갈렸는지 못 봤다 (마일스톤은 두 번 다 `path:src/…`). → **146**(구멍 · 145 와 같은 종류 · 「충돌 3」이 모델의 선택에 달려 있다). 행의 ⑥ 에 수치를 적었다.
⚠ **안 한 것** — 145(기존 id 를 `uniqueId` 의 `taken` 에)는 안 건드렸다 — 두 번 다 재시도 규칙 후보가 거절됐고 셋째 충돌은 「고정 간격 금지」 항목이 대신 짝을 섰다. 146 은 적기만 했다. 화면 3 은 여전히 브라우저로 안 봤다.

🔴 **배운 것 둘** — ① 프롬프트 한 줄이 진짜 모델에서 항목을 하나 더 냈다 — 두 번 다, 같은 줄을. 「기준을 낮추지 않는다」는 지켜졌다. ② **한 번 3 이 나왔다고 닫지 마라** — 같은 코드로 직전은 0 이었다. 완료 기준을 재는 문은 **원인을 가를 열을 같이 적어야** 한다 (scope 를 안 적은 1회차는 증거가 아니라 숫자였다). 이제 `p3:measure` 는 scope 를 적는다.

🔴 **2-B 이번 라운드 — `RULE_LIST_LINES`** ① 소비처 SYSTEM 하나 ② 뒤집으면 갈림: 진짜 모델에서 환불 줄 policy 0 → 1 (두 번 다) — 스텁은 못 가르므로 시험은 문장 존재만 센다. `ItemType` 10종 중 이번 두 실행은 **5종 · 4종**(goal·policy·roadmap·architecture/domain) — 37바퀴 이후 안 판 10종 전수는 다음 라운드.

**다음 바퀴의 일 — FINDINGS 145**

<!-- 🔴 이 줄이 **다음 할 일을 말하는 유일한 자리**다 (FINDINGS 102).
     모양을 지켜라: `**다음 바퀴의 일 — FINDINGS <번호>**` (대기가 없으면 「FINDINGS 없음」).
     `tools/status-shape.mjs` 가 ① 이런 줄이 **하나**인지 ② 그 번호가 FINDINGS 에서
     **대기**인지를 센다. 닫힌 항목을 가리키면 `tools/ci.ps1` 의 `docs` 층이 FAIL 이다.
     ⚠ 「다음 할 일」을 여기 말고 다른 데 또 적지 마라 — 그게 102 의 고장이었다.
     ⚠ 지나간 바퀴의 지목은 **다른 낱말**로 적어라 (「그 바퀴가 다음으로 지목한 것」). -->

🔴 145 는 PLAN P3 첫 행의 몫이다 — 구멍이고 「충돌 3」이 실행마다 갈리는 원인의 절반이라 「PLAN 이 먼저」와 어긋나지 않는다. 그 뒤 **146**(나머지 절반 · 후보의 scope) → 144 → `p3:measure` 가 **두 번 연속** 충돌 3/3 이면 행을 닫는다. 그 다음 격차 119 → 118 → 116 → 112 → 59 → 100 → 131 → 132 → 133 → 134 → 137, 구멍 140 은 P5 둘째 행(🙋 새 PC)과 같이.

> **145 를 하는 법** — `structureDocument()` 에 `takenIds?: readonly string[]` 를 받아 `uniqueId()` 의 `taken` 을 그것으로 시작한다(문서 안 중복과 같은 `_2` 규칙 · 프롬프트는 안 바뀐다). 넣는 자리는 러너 하나 — `lib/ai/job.ts` `AI_JOB_RUNNERS.structure` 가 프로젝트의 `context_items.public_id` 를 한 번 조회해 넘긴다(status 무관 — unique 제약이 status 를 안 본다). 시험은 `ai-structure` 에 「기존 id 와 같은 후보는 `_2` 가 된다」 한 개 + `ai-job` 에 「러너가 기존 id 를 넘긴다」 한 개. 합격은 `p3:measure` 의 `goals.accepted.rejected` 가 **0** 이고 후보 `total` 이 5 이상.

- PLAN 의 `- [ ]` 중 남은 것 다섯: **P3 첫 행(143 ✅ — 145·146·144 가 남았다 · 다음)** · P4 둘째 행(GATE 3 · 눈 판정) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(146 · 145 · 144 · 140 · 119 · 118 · 117 · 116 · 112 · 100 · 59 · 131~134 · 137) — **고장 0** · 143 ✅.

### 지난 바퀴 (82) — 모델은 `quote` 를 내고 서버가 `indexOf` 로 offset 을 계산 · 진짜 Gemini 인용 21/21 · 145 기록 (FINDINGS 142 · `3b6ebef`)

**이번 바퀴(82)는 FINDINGS 142 — 구멍(`source_ref` offset 이 「범위 안」인데 가리키는 문장이 틀리다 · P7)을 닫았다** (`3b6ebef`). INBOX 「할 것」비어 있음 · 관통 7단계 OK(994) · 고장 0 · 142 는 PLAN P3 첫 행의 완료 기준 그 자체라 ④3 ② 와 어긋나지 않는다.
계약을 먼저 바꿨다 — `packages/schema` `AiSourceSpan` 에서 `start_char`·`end_char` 를 빼고 **`quote`**(조각의 원문 그대로 · ≤ `AI_QUOTE_MAX_CHARS` 600)를 뒀다. `structure.ts` `toSourceRef()` 가 `chunk.text.indexOf(quote)` 로 문서 offset 을 **계산**하고
0곳(「원문에 없다」)·2곳 이상(「여러 곳」)이면 `OutputInvalid` → 오류 위치를 넣어 1회 재시도. `untrusted()` 의 `</`→`<\` 치환은 되돌려 찾는다. 프롬프트의 「offset」 문장 셋(SYSTEM 두 줄 · 머리말 한 줄 · `prompt.ts` 공통 금지 · SPEC §7)을 「원문 그대로 인용」으로. 화면·`SourceRef`·컴파일러는 손대지 않았다 — 저장되는 모양은 그대로 offset 이다.

🔴 **잰 것** (`docs/evidence/2026-09-06-p3-gemini/probe.txt` §5 · 진짜 gemini-3.5-flash · 세 번째 `p3:measure`):

| | 전 (`314ab0e` · 81바퀴) | 후 (`3b6ebef`) |
|---|---|---|
| 모델에게 묻는 것 | `start_char`·`end_char` (숫자) | **`quote`** (글자) — 보내는 JSON Schema 에 start_char·end_char 0건 (시험이 센다) |
| 인용 → 잘라 낸 원문 | 27/27 「범위 안」인데 G1 항목이 G2 줄 · 웹훅 서명이 §4 제목 · architecture 5개·질문 4개가 같은 구간 | **21/21 이 제목과 같은 문장** — G1 은 G1 표 행 · 웹훅 서명은 「서명 검증 전에는 payload 를 파싱하지도 저장하지도 않는다」 · 질문 4개는 §5 의 네 줄 각각 · old-roadmap 재시도 규칙은 「3회까지 … 0.5초 고정」 그 줄 |
| 재시도 | — | **0** (장부 outputTokens 1,558 · 4,075 = 왕복 1 · 1) — 첫 응답에서 21개가 다 한 곳에만 있는 인용이었다 |
| goals.md 항목 · 질문 | 18 · 4 | **12** (goal 3 · policy 5 · roadmap 3 · domain 1) · **4** — 완료 기준 12 는 넘고, architecture 0 · mission 0 은 같은 프롬프트의 실행 간 흔들림 |
| 충돌 | 2/3 | **1/3** — goals 의 재시도 규칙 후보가 old-roadmap 과 같은 slug(`item_psp_retry_policy`)라 accept 에서 거절 → 탐지 candidates 5 → 2 → **145**(구멍). 81 은 우연히 다른 slug 였다 |
| 시험 | ai-structure 21 | **26** (+5: 스키마에 숫자 칸 없음 · 원문에 없으면 재시도 · 여러 곳이면 재시도 · 두 번 다 없으면 `AI_OUTPUT_INVALID` · `</` 되돌리기) · ai-job·web-item-doors·dump 스텁 여섯 파일이 quote 모양 · 84/84 |
| plugin 번들 | — | **재생성** (`bin/contextops-cli.mjs` 4줄 — schema 를 품는다 · `bundle.test` 가 바이트 대조 · 첫 CI 가 이걸로 빨갰다) |
| CI | GREEN 23:25 | **GREEN 23:55** — principles OK 9 · typecheck 10초 · test 88초 · build 21초 · walkthrough **998** · docs OK |

⚠ **PLAN 행은 열어 뒀다** — 인용 ✅ · 항목 ✅ · 예산 ✅ · 충돌 1/3 ✗ (143 + 145). 행의 ⑤ 에 수치를 적었다.
⚠ **안 한 것** — 프롬프트의 「무엇을 항목으로 내나」는 안 건드렸다(143 의 일) · 145 는 적기만 했다 · 화면 3 을 브라우저로 본 적은 여전히 없다(아래 「눈 판정 대기」 — 이제 인용이 맞으니 볼 만하다).

🔴 **배운 것 둘** — ① 「충돌 3」이 모델의 slug 선택에 달려 있었다. 정확히 충돌하는 두 규칙은 같은 이름을 고르기 쉽다 — 그래서 **충돌일수록 accept 에서 거절돼 탐지에서 빠진다.** 실행마다 갈리는 수는 완료 기준이 못 된다 → 145 를 고쳐야 3/3 이 **안정**된다.
② `packages/schema` 를 한 글자 고치면 `plugin/contextops/bin/contextops-cli.mjs` 가 갈린다 — 번들이 schema 를 품고 `bundle.test` 가 바이트를 대조한다. **schema 커밋에는 `pnpm --filter @contextops/plugin build` 가 딸려 있다** (「앞 바퀴들이 남긴 것」에 이미 세 번 적혀 있다 — 이번에도 밟았다).

🔴 **2-B 이번 라운드 — `AiSourceSpan` 의 `quote`** ① 소비처 `toSourceRef()` 하나 ② 뒤집으면 갈림: 원문에 없는 글자 → 재시도 → `AI_OUTPUT_INVALID` (잠겨 있음) · 여러 곳 → 재시도 (잠겨 있음) · 진짜 모델의 21/21 이 그 문장. `heading_path` 는 비면 chunk 의 것 (그대로). `ItemType` 10종 중 이번 실행은 **4종**(goal·policy·roadmap·domain) — 81 의 6종보다 적다. 다음 라운드는 `ItemType` 10종(37바퀴 이후 안 팠다).

**그 바퀴가 다음으로 지목한 것**: FINDINGS 143 → 83바퀴가 닫았다 (`5be2611`). 아래는 82 가 남긴 지목의 원문이다.

🔴 143 은 PLAN P3 첫 행의 몫이다 — 격차지만 그 행의 완료 기준 「충돌 3」의 절반이라 「PLAN 이 먼저」와 어긋나지 않는다. 그 뒤 **145**(나머지 절반 · 기존 항목 id 를 `uniqueId` 의 `taken` 에) → 144 → `p3:measure` 가 충돌 3/3 이면 행을 닫는다. 그 다음 격차 119 → 118 → 116 → 112 → 59 → 100 → 131 → 132 → 133 → 134 → 137, 구멍 140 은 P5 둘째 행(🙋 새 PC)과 같이.

> **143 을 하는 법** — 프롬프트만이다 (`structure.ts` · 기준을 낮추지 않는다). old-roadmap.md 「운영 규칙」 3줄 중 「환불은 담당자가 확인하는 대로 처리한다. 기한은 따로 두지 않는다」가 policy 로 안 나온다 — `SOURCE_DOCUMENT_KIND_BRIEF.roadmap` 이 「마일스톤과 기한이 주로」라 규칙 절을 가볍게 읽는 듯. 그 한 줄에 「로드맵 문서 안의 운영 규칙도 항목으로 낸다」를 더하거나 SYSTEM 의 「항목 하나 = …」에 「부정형 규칙(하지 않는다 · 기한을 두지 않는다)도 규칙이다」. 시험은 `ai-structure` 의 「여섯 종류가 서로 다른 프롬프트를 만든다」가 이미 표를 읽으니 문장 존재만 한 줄. 합격은 `p3:measure` 의 roadmap items 에 환불 policy 가 있고(6개) 충돌에 환불 SLA 짝이 서는 것 — 145 를 안 고치면 재시도 규칙 짝은 여전히 실행마다 갈린다.

- PLAN 의 `- [ ]` 중 남은 것 다섯: **P3 첫 행(142 ✅ — 143·145·144 가 남았다 · 다음)** · P4 둘째 행(GATE 3 · 눈 판정) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(145 · 144 · 143 · 140 · 119 · 118 · 117 · 116 · 112 · 100 · 59 · 131~134 · 137) — **고장 0** · 142 ✅.

### 지난 바퀴 (81) — PLAN P3 첫 행을 진짜 Gemini 로 잼 · 기본 thinking 이 출력 상한을 먹어 `AI_OUTPUT_INVALID` → `GEMINI_THINKING_LEVEL` · 142·143·144 기록 · `p3:measure` (FINDINGS 141 · `314ab0e`)

**이번 바퀴(81)는 PLAN P3 첫 행 「7.1 문서 구조화 · 7.2 충돌 탐지 · 예산 가드」의 완료 기준을 진짜 Gemini 로 쟀다.** INBOX 「할 것」비어 있음 · 관통 7단계 OK(994) · 고장 0 이라 ④3 ② 대로 PLAN 맨 위 행이었다.
재는 문을 하나 만들었다: `pnpm --filter web p3:measure`(`apps/web/scripts/p3-measure.ts` · CI 밖 · ≈ $0.02) — PGlite 위에서 **제품 길 그대로**(`POST /documents` → `ai_jobs` 러너 → `withBudget` → `callModel` → `jobs/{id}/items` → PATCH active → conflict job)
old-roadmap.md 를 active 로, goals.md 를 draft 로 넣고 탐지까지 굴린 뒤 `docs/evidence/2026-09-06-p3-gemini/probe.json` 에 항목마다 span·인용 첫 줄을 남긴다. `next dev` 는 안 띄웠다(「next dev 로 API 를 두드리지 마라」 · 아래 함정) — 라우트를 프로세스 안에서 부르는 길이 관통과 같다.

🔴 **첫 실행은 두 문서 다 `failed / AI_OUTPUT_INVALID`(각 60초)였다 — 고장(FINDINGS 141).** 제품이 보내는 몸을 그대로 잡아(`setAiClientForTest` 로 가로챔) generationConfig 만 바꿔 다시 보내니 `finishReason: MAX_TOKENS` · 생각 토큰 **7,677 / 상한 8,000**. Gemini 3.x 는 생각을 `maxOutputTokens` 안에서 센다.
`client.ts` 에 `GEMINI_THINKING_LEVEL = 'low'` 상수 하나(`generationConfig.thinkingConfig.thinkingLevel`) — 79바퀴의 `ai:smoke`(2문장)는 생각이 짧아 **우연히** 지났던 것이다.

🔴 **잰 것** (`probe.txt` · 전부 진짜 gemini-3.5-flash · 우리 키):

| 완료 기준 | 전 (`846530a`) | 후 (`314ab0e`) |
|---|---|---|
| goals.md → 항목 12 | job failed · 항목 0 | **18**(mission 1 · goal 3 · policy 5 · roadmap 3 · domain 1 · architecture 5) + 열린 질문 **4**(§5 「아직 정하지 못한 것」 네 줄 그대로) · 20초 · 18 받아들임 · rejected 0 ✅ |
| 충돌 3 | — | **2**(contradiction high 둘 — 재시도 5회/백오프 vs 3회/0.5초 고정 · PII 금지 vs 웹훅 원본 7일 보관 · 「어느 쪽을 따라야 하나」 질문형 · 판정 없음) · candidates 5/5 · 2초. 셋째(환불 SLA)는 탐지가 아니라 **old-roadmap 에서 환불 규칙이 항목으로 안 뽑혀서**다(policy 2/3) → **143** |
| 모든 호출이 `withBudget` 경유 | principles P3 OK | `ai_usage` **3행 = 왕복 3**(structure 879/1,498 · 2,440/5,703 · conflict 2,727/257 토큰 · 합 ≈ $0.02) ✅ |
| `source_ref` offset 이 문서 범위 안 | — | **27/27** 범위 안 — **그러나 인용이 틀리다**: G1 항목이 G2 줄을, PII 항목이 §3.4 를, 웹훅 서명 항목이 §4 제목을 가리킨다 · architecture 5개·질문 4개는 각각 같은 구간 하나 · `heading_path` 는 18/18 맞다 → **142**(구멍 · P7) |
| 실패 경로 | — | 잘린 응답(MAX_TOKENS)과 계약 위반이 같은 재시도 · Gemini 429 는 `INTERNAL` → **144**(구멍) |
| thinking 비교 (같은 몸) | — | low: goals 13 · 13(두 번) · 14초 / high + 상한 32k: 17 · 58초 · 생각 12,576 토큰 / `thinkingBudget 0`: roadmap 3 |
| 시험 | ai-client 9 | ai-client **9**(보내는 몸의 `thinkingConfig` 가 상수와 같은지 — 기존 「제자리」 시험에 한 줄) |
| CI | GREEN 22:14 | **GREEN 23:25** — principles OK 9 · test 89초 · build 29초 · walkthrough **994** · docs OK |

⚠ **PLAN 행은 열어 뒀다** — 항목 18 ✅ · 예산 ✅ · 「범위 안」은 글자로는 ✅ 인데 뜻(P7)으로는 ✗ · 충돌 2/3 ✗. **기준을 낮추지 않는다.** 행의 ④ 에 수치를 적었다.
⚠ **안 한 것** — 화면 3(`/import`)에서 브라우저로 job 을 본 적은 없다(아래 「눈 판정 대기」). 프롬프트(`structure.ts`·`conflict.ts`)는 한 글자도 안 바꿨다 — 그게 142·143 의 일이다. 임시 진단 스크립트(`p3-diag-81.ts`)는 지웠다 · 수치는 probe.txt §2.

🔴 **배운 것 둘** — ① 「범위 안」은 P7 이 아니다. 숫자 검사는 지나고 인용은 틀린다 — **모델이 낸 숫자를 검증하지 말고 모델이 낸 글자로 숫자를 계산해라**(142 의 방향). ② 공급자의 「출력 상한」이 **무엇을 세는지** 확인해라 — 생각을 세면 그건 출력 상한이 아니다. 2문장 스모크는 이걸 못 잡는다 — **완료 기준의 크기로 재라.**

🔴 **2-B 이번 라운드 — `AiSourceSpan` 세 칸(`start_char`·`end_char`·`heading_path`)** ① 소비처 `structure.ts` `toSourceRef()` 하나 ② 뒤집으면 갈림: 범위 밖이면 재시도(잠겨 있음) — **그러나 범위 안의 틀린 숫자는 아무것도 못 가른다**(142). `heading_path` 는 비면 chunk 의 것으로 채운다(살아 있다).
`ItemType` 10종 중 goals.md 하나에서 **6종**이 실제로 나왔다(mission·goal·policy·roadmap·domain·architecture) — adr·workflow·constraint·open_question 넷은 이 문서로는 안 나온다(open_question 은 항목이 아니라 질문 행으로 4개).

**그 바퀴가 다음으로 지목한 것**: FINDINGS 142 → 82바퀴가 닫았다 (`3b6ebef`). 아래는 81 이 남긴 지목의 원문이다.

🔴 142 는 PLAN P3 첫 행의 몫이다 — 구멍이지만 그 행의 완료 기준(「offset 이 범위 안」의 뜻) 그 자체라 「PLAN 이 먼저」와 어긋나지 않는다. 그 뒤 143(프롬프트 · 충돌 3/3) → 144 → `p3:measure` 로 다시 재서 행을 닫는다. 그 다음 격차 119 → 118 → 116 → 112 → 59 → 100 → 131 → 132 → 133 → 134 → 137, 구멍 140 은 P5 둘째 행(🙋 새 PC)과 같이.

> **142 를 하는 법** — 계약이 먼저: `packages/schema` 의 `AiSourceSpan` 에서 `start_char`·`end_char` 를 빼고 `quote`(원문 그대로의 인용 · 줄임 없이)를 둔다(객체 모양이라 enum 의 「중간을 지우지 마라」와 무관 · `AiStructureOutput` 의 JSON Schema 가 따라온다) → `structure.ts` `toSourceRef()` 가 `chunk.text.indexOf(quote)` 로 offset 을 **계산**하고 0번 또는 2번 이상 나오면 `OutputInvalid` 로 1회 재시도 → SYSTEM 의 span 두 문장을 「근거 문장을 원문 그대로 인용한다(한 곳에만 있는 길이로)」로 → `ai-structure.test.ts`·`ai-job.test.ts` 의 스텁 응답을 quote 모양으로. `toGeminiSchema`·화면은 손댈 것 없다(화면은 `SourceRef` 를 읽고 그건 그대로다). 끝나면 `p3:measure` 의 quote 열이 항목 제목과 맞는지 눈으로 본다 — 그게 이 항목의 합격이다.

- PLAN 의 `- [ ]` 중 남은 것 다섯: **P3 첫 행(쟀다 — 142·143·144 가 남았다 · 다음)** · P4 둘째 행(GATE 3 · 눈 판정) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(144 · 143 · 142 · 140 · 119 · 118 · 117 · 116 · 112 · 100 · 59 · 131~134 · 137) — **고장 0** · 141 ✅.

### 지난 바퀴 (80) — 값이 생겼다 · 공개 저장소 URL · 제출 팀명을 정본 하나 `SUBMISSION_IDENTITY` 로 · 푸터 셋 · 140 기록 (INBOX · FINDINGS 122 · `846530a`)

**이번 바퀴(80)는 INBOX 지시 「값이 생겼다」— FINDINGS 122 를 닫았다.** 공개 저장소 URL 과 제출 팀명이 왔고, 관통은 시작부터 7단계 OK(985)라 고장은 없었다.
두 값의 **정본은 `apps/web/src/components/landing.tsx` 의 `SUBMISSION_IDENTITY` 하나**다 — 푸터(`LANDING_FOOT`)는 그것을 읽어 팀명 · GitHub · Known limitations 셋을 내고, README 머리와 `docs/SUBMISSION.md` 의 🙋 표는
마크다운이라 import 를 못 하니 **글자 그대로** 적되 `apps/web/test/readme.test.ts` ①-B 가 세 곳이 같은 문자열인지 센다. Known limitations 는 앱에 페이지를 또 만들지 않고 저장소의 `docs/KNOWN_LIMITATIONS.md` 로 건다 (같은 문서가 두 곳이 되지 않게).

🔴 **잰 것** (전부 시험·grep · 브라우저 픽셀은 아래 「눈 판정 대기」):

| | 전 (`836a0a9`) | 후 |
|---|---|---|
| 우리 저장소 URL 이 든 곳 | README·docs·plugin·web 에 **0건** (122 의 근거 그대로) | `SUBMISSION_IDENTITY.repoUrl` 1 + 그것을 글자로 적는 문서 3(README 머리 · SUBMISSION 🙋 표 · KNOWN_LIMITATIONS 140 줄) — `.git/config` 의 origin 과 같은지 시험이 센다 |
| 랜딩 푸터 (`renderToStaticMarkup`) | brand · event · 서버 상태 | + `팀 퇴직했는데저좀이직시켜주세요` · `GitHub` → repoUrl · `Known limitations` → `${repoUrl}/blob/main/docs/KNOWN_LIMITATIONS.md` · 밖 링크 둘만 `rel="noreferrer"`(정확히 2) |
| 랜딩의 밖 링크 규칙 (`web-landing.test.ts` ④) | 「모든 링크가 `/` 로 시작」 | 「`/` 이거나 repoUrl 아래」— 다른 밖 주소는 여전히 빨갛다 |
| SUBMISSION 🙋 표 | 5행 전부 🙋 | 팀명 · URL 채움(🙋 0) · production URL · 영상 · 슬라이드는 🙋 그대로 — 시험이 「채운 둘은 정본과 같고, 남은 셋은 🙋」를 따로 센다 |
| README 머리 | 「🙋 공개 저장소 URL · 제출 팀명 · production URL 은 아직 없습니다」 | 팀명 · URL · 정본이 어디인지 한 줄 · 🙋 production URL 만 남음 — 「저장소 URL … 아직 없」 문장은 시험이 막는다 |
| `<marketplace>` 자리표시자 | 4곳 (landing `INSTALL_STEPS` · README · SUBMISSION · `setup.ts:150`) | **그대로 4곳** — 저장소에 `.claude-plugin/marketplace.json` 이 **0건**이라 URL 을 넣으면 첫 명령이 죽는다 → FINDINGS **140**(구멍 · 주인 P5 둘째 행) · KNOWN_LIMITATIONS 의 122 줄을 140 줄로 |
| 시험 | readme 32 · web-landing 20 | readme **40** · web-landing **21** (따로 돌려 잰 수 · 둘 다 초록) |
| 눈 (`docs/evidence/2026-09-06-landing-foot/` · `next start` + headless Chrome) | — | 1280: 여섯 항목이 한 줄(글자가 x≈750 에서 끝남) · 375(iframe): 세 줄로 접힘, 팀명이 낱말 중간에서 안 잘림 · 가로 넘침 0 → **통과**. 본 김에: 링크 셋이 밑줄 없는 `meta` 색 — 「서버 상태」가 원래 그랬으니 새 격차는 아님(122-B 에 적음) |
| CI | GREEN 21:56 | **GREEN 22:14** — principles OK 9 · typecheck · test 95초 · build 30초 · walkthrough **994** · docs OK |

⚠ **안 한 것** — ① 푸터 링크의 hover 색은 안 봤다(헤드리스). ② `<marketplace>` 는 못 채웠다 — 값이 없어서가 아니라 **그 값이 가리킬 파일이 없어서**다. 있는 것처럼 적지 않았다.
③ FINDINGS 109(「다음 바퀴의 일」 줄이 PLAN 행을 못 가리킨다)는 이번에도 안 고쳤다 — 그래서 아래 줄이 「없음」인데, 대기가 없다는 뜻이 아니라 **다음 일이 PLAN 행**이라는 뜻이다.

🔴 **배운 것** — 「값이 생겼다」와 「자리를 채울 수 있다」는 다르다. URL 은 왔지만 `<marketplace>` 가 가리키는 건 URL 이 아니라 **그 URL 에 있어야 할 파일**이고, 그 파일은 없다. 채웠으면 심사위원의 첫 명령이 실패했을 것이다.

🔴 **2-B 이번 라운드 — `LANDING_FOOT` 6항목**: ① 소비처 `Foot()`(5) + `Landing()` 머리글(brand) ② 뒤집으면 갈림 — `team.name`·`github.href`·`limits.href` 는 `web-landing` 푸터 시험이 마크업에서 직접 찾고 `readme` ①-B 가 정본과 대조 · `health.href` 는 「모든 링크가 `/` 이거나 repoUrl」 규칙 안. `ItemType` 10종은 여전히 다음 라운드.

**그 바퀴가 다음으로 지목한 것**: PLAN P3 첫 행 (FINDINGS 109 — 그 줄은 PLAN 행을 못 가리켜 「없음」이었다). 81바퀴가 쟀다.

🔴 **「없음」은 대기가 없다는 뜻이 아니다 (FINDINGS 109 — 이 줄은 PLAN 행을 못 가리킨다).** 고장 0 · INBOX 「할 것」비어 있음 → ④3 ② 에 따라 다음은 **PLAN P3 첫 행** 「7.1 문서 구조화 · 7.2 충돌 탐지 · 예산 가드」다.
완료 기준 「paylab 문서 → 항목 12 + 충돌 3 · `source_ref` offset 이 범위 안」을 **진짜 Gemini 로** 잰다 (`demo:db` + `next dev` → `/import` 에 `fixtures/paylab-docs/goals.md` → job `succeeded` → 항목 수·충돌 수·offset · 429 면 픽스처 결과로 떨어지나).
키는 `.env.local` 에 있고 `pnpm --filter web ai:smoke` 가 `callModel()` 까지는 지났다 (79바퀴). 그 행이 닫히면 격차 119 → 118 → 116 → 112 → 59 → 100 → 131 → 132 → 133 → 134 → 137, 구멍 140 은 P5 둘째 행(🙋 새 PC)과 같이.

> **P3 첫 행을 재는 법** — ① `pnpm --filter web demo:db`(PGlite · 씨앗) 와 `next dev` 를 띄운다(`.env.local` 의 `GEMINI_*` 를 읽는다) ② 로그인 없이 되는 길이 없으면 `dev:db` 의 owner 세션으로 ③ `/import` 에서 `goals.md` 를 올려 job 을 만들고 `ai_jobs` 가 `succeeded` 가 될 때까지 폴링
> ④ `structure-candidates` 의 개수 · 충돌 카드 수 · 각 `source_ref.offset` 이 문서 길이 안인지 ⑤ 수치를 `docs/evidence/2026-09-06-p3-gemini/` 에 남기고 PLAN 행의 완료 기준 옆에 적는다. 12+3 에 못 미치면 **프롬프트(`structure.ts`)를 고치는 게 그 바퀴의 일**이지 기준을 낮추는 게 아니다.

- PLAN 의 `- [ ]` 중 남은 것 다섯: **P3 첫 행(키가 생겼다 — 루프가 잴 수 있다 · 다음)** · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(140 · 119 · 118 · 117 · 116 · 112 · 100 · 59 · 131~134 · 137) — **고장 0** · 122 ✅ · 122-B 는 기록.

### 지난 바퀴 (79) — 관통 api RED 를 docs 층 게이트로 (FINDINGS 138 · `bd003a5`) · 서버측 AI Anthropic → Gemini · client.ts 한 문 (INBOX · FINDINGS 139 · `836a0a9`)

**이번 바퀴(79)는 둘이다 — ① 고장 FINDINGS 138(관통이 api 단계에서 빨갛게 시작 · `bd003a5`) ② INBOX 지시 「서버측 AI 를 Anthropic → Gemini」(`836a0a9`).**
시작하자마자 관통이 `api FAIL` 이었다: 78 의 **문서만 고치는 커밋**(`99324a3`)이 121 을 ✅ 로 바꾸며 `docs/KNOWN_LIMITATIONS.md` 의 그 줄을 안 지웠고, 그 커밋은 test 층을 다시 안 돌렸다
(`readme.test.ts` ④ 1 빨강). 줄을 지우고 **같은 검사를 `docs` 층(`tools/status-shape.mjs` ②-B)에도** 뒀다 — 문서만 고치는 커밋이 보는 유일한 층이 거기다. 옛 줄을 되돌리면 `docs:check` 1 빨강.
그 다음 119 로 가려는데 INBOX 에 새 지시가 와 있었다(INBOX 는 PLAN·FINDINGS 보다 위) — Gemini 로 바꿨다. 부르는 자리가 `client.ts` 하나라 「접근은 한 문으로」가 값을 했다.

🔴 **잰 것 — Gemini** (`docs/evidence/2026-09-06-gemini/probe.txt` · 전부 진짜 API · gemini-3.5-flash · 우리 키):

| | 전 (`bd003a5`) | 후 (`836a0a9`) |
|---|---|---|
| 부르는 문 | `@anthropic-ai/sdk` `messages.create` + tool use | **SDK 없이 `fetch`** → `generateContent` · `responseMimeType: application/json` + `responseJsonSchema` (`callClaude` → `callModel` · `ToolCallRequest` 의 죽은 `toolName`·`toolDescription` 둘을 뺐다) |
| 스키마를 받나 | — | `responseJsonSchema` 는 `$schema`·`$defs`·`$ref`·`const`·`oneOf`·`pattern`·`format`·`additionalProperties`·`min/maxLength`·`minimum/maximum`·`default` 전부 받고 **`minItems`·`maxItems` 만 400** (낱개 bisect a~e · `responseSchema` 는 `$ref` 부터 못 받는다) |
| `const` | — | 받지만 **지키지 않는다** — `type` 이 표 밖 낱말로 와서 Zod 「Invalid discriminator value」 → `const` → `enum: [v]` 로 바꾸니 통과 |
| 끝까지 (`pnpm --filter web ai:smoke`) | — | 문서 2문장 → **policy 2 · Zod 통과** · 토큰 83/252 · 11~12초 |
| 변환이 사는 자리 | — | `client.ts` `toGeminiSchema()` 순수 함수 하나 + `GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS` 두 줄 — **스키마(`packages/schema`)는 안 고쳤다**(플러그인 검증·문서 산출이 같이 읽는다) |
| P3 게이트 | `messages\.create|messages\.stream` | `+generateContent` — `withBudget` 없는 rogue 파일을 두고 **FAIL 을 봤다**(OK 8 · FAIL 1) · 지운 뒤 OK 9. ⚠ 첫 probe 는 주석에 「withBudget 없이」라고 적어 게이트가 정당하게 통과시켰다 — 문자열 게이트는 낱말 하나로 만족된다 |
| 모델·정가 | `AI_MODELS` claude-* 3줄 · `ANTHROPIC_MODEL` | `gemini-3.5-flash`·`gemini-3.6-flash` 2줄 · `GEMINI_MODEL` · 🙋 정가는 **2.5 flash 공개가를 임시로**(0 은 예산을 무한으로 만든다 · 아래 「막힌 것」) |
| 시험 스텁 | 다섯 파일이 각자 `messages.create` 를 흉내 | `test/helpers/ai.ts` **한 곳**(`stubTransport`) · 새 `ai-client.test.ts` 9 · 여섯 파일 154/154 |
| 의존 | `@anthropic-ai/sdk` catalog·package·lock | **0** (lock -60줄) |
| 문서 | SPEC §1.2·§7·§16 · README · SUBMISSION 이 「Claude API · tool use」 | Gemini · `responseJsonSchema` · KNOWN_LIMITATIONS 에 **무료 티어 분당 제한** 한 줄 |
| CI | GREEN 21:35 (138 뒤) | **GREEN 21:56** — principles OK 9 · typecheck 11초 · test 92초 · build 22초 · walkthrough **985** · docs OK |

⚠ **안 한 것** — 화면에서 실제 구조화 job 을 Gemini 로 돌려 보지는 않았다 (`ai:smoke` 는 `callModel` 직접 · 아래 「눈 판정 대기」). `structure.ts`·`conflict.ts` 의 프롬프트는 한 글자도 안 바꿨다 —
프롬프트가 Gemini 에서 어떤 품질인지는 **PLAN P3 첫 행의 완료 기준**(「paylab 문서 → 항목 12 + 충돌 3」)을 재는 바퀴가 본다. 그 행은 이제 **루프가 혼자 잴 수 있다** (키가 생겼다).

🔴 **배운 것 둘** — ① 문서만 고치는 커밋도 게이트를 돌려라. 78 은 코드 커밋 앞에 CI 를 봤고 그 뒤 문서 커밋에서 121 을 닫으며 KNOWN_LIMITATIONS 를 안 지웠다. 「닫힌 것을 다음 할 일로 가리킨다」(102)와
「닫힌 것을 한계라고 적는다」(138)는 같은 썩음이라 같은 게이트(`status-shape`)에 뒀다. ② 공급자를 바꿀 때 「스키마를 받나」와 「스키마를 지키나」는 다른 질문이다 — `const` 는 200 인데 안 지켰다. 끝까지 Zod 를 통과시켜 봐야 안다.

🔴 **2-B 이번 라운드 — `AI_MODELS` 표(이제 2줄)와 `GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS`(2줄)** ① 소비처: `currentModel()`·`costMicros()` / `toGeminiSchema()` ② 뒤집으면 갈림: 표에 없는 이름은 죽는다(`ai-budget`) ·
정가 0 이면 시험이 막는다(새) / 키워드를 안 벗기면 진짜 API 가 400(실측 · 시험은 「모든 깊이에서 빠졌나」). `ItemType` 10종은 여전히 다음 라운드.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 122 (INBOX 「값이 생겼다」). 80바퀴가 닫았다.


🔴 **고장은 없다. INBOX 「할 것」에 하나 남았다 — 「값이 생겼다」(공개 저장소 URL · 제출 팀명 · 2026-09-06)** → FINDINGS **122**(+126 의 팀명 자리 · README 머리 문단). INBOX 는 PLAN 보다 위다.
그 다음은 **PLAN P3 첫 행**이 열렸다 — 완료 기준 「paylab 문서 → 항목 12 + 충돌 3 · `source_ref` offset 이 범위 안」을 **진짜 Gemini 로** 잰다 (`demo:db` + `next dev` → `/import` 에 `goals.md` → job `succeeded` →
항목 수·충돌 수·offset). 🙋 없이 루프가 할 수 있는 첫 PLAN 행이다 (FINDINGS 109 — 이 줄은 PLAN 행을 못 가리키므로 122 다음에 여기서 읽어라). 그 뒤 격차 119 → 118 → 116 → 112 → 59 → 100 → 131 → 132 → 133 → 134 → 137.

> **122 를 하는 법** — INBOX 의 값 둘을 **정본 하나**에 둔다: 랜딩 푸터는 `LANDING_FOOT`(`apps/web/src/components/landing.tsx` · 59바퀴가 만든 상수)이 읽고, README·SUBMISSION·KNOWN_LIMITATIONS 의 `<marketplace>`·🙋 자리는
> 그 값을 **글자 그대로** 적되 `readme.test.ts` 가 세 문서와 상수가 같은 문자열인지 센다(지금 「P1~P7 행 동일」을 세는 방식 그대로). README 머리의 「🙋 … 아직 없습니다」 문단은 지운다. production URL·영상은 자리표시자 그대로.
> 팀명은 띄어쓰기까지 그대로 `퇴직했는데저좀이직시켜주세요`. KNOWN_LIMITATIONS 의 122 줄을 지우는 것을 잊지 마라 — `docs:check` 가 잡는다(138).

- PLAN 의 `- [ ]` 중 남은 것 다섯: **P3 첫 행(키가 생겼다 — 루프가 잴 수 있다)** · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다 · 78 이 게스트의 쓰기 버튼 셋을 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · URL·팀명은 왔다 → 122).
- 대장의 대기(122 · 119 · 118 · 117 · 116 · 112 · 100 · 59 · 131~134 · 137) — **고장 0** · 138 ✅ · 139 는 기록.

### 지난 바퀴 (78) — 화면이 서버와 같은 표 `ACTOR_RULES` 를 읽는다 · 게스트 [발행하기] 는 모달 대신 그 자리에 이유 · 403 문구는 `GUEST_HINT` (FINDINGS 121 · 135 · `816420b`)

**78바퀴는 FINDINGS 121 + 135 — 격차 둘(게스트의 403 을 「팀 owner만」이라고 옮긴다 · 게스트가 [발행하기] 를 누르면 발행 모달이 열린다)을 같은 바퀴에 닫았다** (`816420b`).
INBOX 순서 4(구멍 → 격차)의 첫 격차이고 둘 다 「게스트가 누른 뒤에 아는 것」이라 같은 자리다 — 고장 0 · 루프가 혼자 닫을 PLAN 행 없음(아래). 워킹트리는 깨끗한 채로 시작했다.
뿌리는 하나였다: 화면이 「쓸 수 있나」를 읽을 표가 없었다 — `ACTOR_RULES` 가 drizzle·DB 를 import 하는 `lib/api/auth.ts` 안이라 클라이언트가 못 읽었고, 그래서 화면은 `session.guest` 를 보고
**짐작**하거나(배너) 아예 안 보고(발행 버튼) 서버의 403 을 member 의 문구로 옮겼다. 표를 import 없는 `lib/api/actor-rules.ts` 로 옮기고(`auth.ts` 는 되내보내기 · `Actor['kind']` 와 같은 집합인지 타입으로 잠금),
화면은 `lib/web/actor.ts` 의 `writeDoor()` 로 **서버와 같은 표**의 `writes` 를 읽는다. 403 문구는 `lib/web/api.ts` 의 **게스트일 때만 덮는 표** `GUEST_HINT`(지금 `FORBIDDEN` 한 줄) — `ERROR_HINT` 는 코드당 하나 그대로.

🔴 **잰 것** (`docs/evidence/2026-09-06-guest-door/probe.txt` · 실제 브라우저 CDP · 시크릿 프로필):

| | 전 (`13252a6`) | 후 (`816420b`) |
|---|---|---|
| 게스트가 [발행하기] 클릭 | **발행 모달**(`role=dialog`)이 열림 — 버전·요약을 받은 뒤에야 403 (70바퀴 캡처) | `role=dialog` **0** · 헤더 밑 카드(`role=status`) 「⚠ 읽기 전용으로 둘러보는 중입니다. 바꾸려면 내 팀으로 시작해야 합니다. [내 팀으로 시작하기] [닫기]」 (`02-*.png`) |
| 게스트가 받은 403 의 화면 문구 (`/import` [구조화하기] → 서버 403) | 「이 작업은 팀 owner만 할 수 있습니다.」 — 거짓말 | 「읽기 전용으로 둘러보는 중입니다. 바꾸려면 내 팀으로 시작해야 합니다.」 + `request_id` (`04-*.png`) · 세 화면에서 「owner」 낱말 **0** |
| 드로어의 문 없음 캡션 | 「상태를 바꾸는 것은 팀 owner 만 할 수 있습니다.」 | 게스트면 같은 이유 문장 · member 면 여전히 「owner 만」 (`03-*.png`) |
| 화면이 「쓸 수 있나」를 읽는 표 | 없음 (`session.guest` 짐작) | `ACTOR_RULES.writes` — 서버(`refuseWrite`)와 **같은 객체** (시험 `toBe`) |
| 판정의 출처 | — | 🔴 표의 `writes` 를 뒤집으면 같은 게스트 세션에 문이 열린다 — `session.guest` 가 아니라 표가 정한다 |
| 게스트 세션이 통과한 쓰기 | — | **0** — 서버 로그의 non-GET 은 `POST /demo/session` 201 뿐, `POST …/documents` 403 ×2 |
| 시험 | — | `web-write-door` **+11** · 옛 갈래(`hintText` → `ERROR_HINT` 만)로 되돌리면 **4 빨강** (`red-with-old-hint.txt`) |
| 정본 | — | DESIGN_BRIEF §5 「403(게스트)」 줄 · SPEC §9 게스트 데모 「화면도 같은 표를 읽는다」 |
| CI | GREEN 21:00 | **GREEN 21:22** — principles OK · typecheck 10초 · test 89초 · build 21초 · walkthrough **976** · docs OK |

⚠ **안 한 것** — INBOX 🟡 E 의 「다음 리셋까지 남은 시간」은 안 붙였다 (배너가 `매일 03:00 초기화` 를 이미 말한다 · 시각을 화면이 재면 서버와 어긋난다). 버튼은 **숨기지 않았다** —
막는 것은 서버다. 제안(`proposals.tsx` 「승인·거절은 owner만」)·로드맵(`roadmap.tsx` 「완료 확인은 owner 만」)의 등급 캡션은 손대지 않았다 — 게스트는 member 라 등급 문장 자체는 맞고, 121 의 범위는 403 번역이었다.
눈 판정 대기에 **새로 더한 것 없음** — 세 화면 다 캡처를 직접 읽었다 (1280 · 375 는 안 봤다).

🔴 **덤으로 본 것 → FINDINGS 137 [격차]** — 데모 `/import` 의 「구조화 진행」 카드에 시드가 남긴 job 이 「차례 기다리는 중 · ⚠ 멈춘 것 같음 · 올린 지 N분 전」 으로 뜬다 (`04-*.png` 오른쪽 아래).
게스트가 만든 게 아니다(쓰기 403 뿐). 워커 없는 개발용 서버의 `queued` 는 영원히 `queued` 다 — production 데모에서도 같은지는 안 봤다.

🔴 **배운 것 — 「서버와 같은 표」는 import 가 없어야 화면이 읽는다.** `ACTOR_RULES` 는 정본이었지만 DB 를 끌어오는 파일 안에 있어서 화면엔 없는 것과 같았고, 그 자리를 `session.guest` 짐작이 메웠다.
`lib/demo/tenant.ts` 가 같은 이유로 import 없이 사는 것을 그대로 따랐다. 그리고 `api.ts ↔ actor.ts` 순환 import 를 만들었다가 풀었다 — 「세션 → 주체 종류」는 `session.ts` 가, 「코드 → 문구」는 `api.ts` 가 갖고 `actor.ts` 는 둘을 읽기만 한다.

🔴 **2-B 이번 라운드 — `ACTOR_RULES` 3종(`user`·`device`·`guest`)이 그 예다.** ① 소비처: 서버 `actorCan`·`actorWrites` · 화면 `writeDoor` ② 뒤집으면 갈림: `api-auth` 「세 주체가 서로 다른 답」 ·
`web-write-door` 「`writes` 를 뒤집으면 문이 열린다」. 화면 쪽 ② 가 이 바퀴 전에는 **없던 값**이었다(화면이 표를 안 읽었으니). 다음 라운드는 `ItemType` 10종(37바퀴 이후 안 팠다).

**그 바퀴가 다음으로 지목한 것**: FINDINGS 119 → 79바퀴는 거기 못 갔다 — 관통이 api 에서 빨갛게 시작했고(138 · 78 의 문서 커밋이 남긴 것) 그 뒤 INBOX 에 새 지시(Gemini)가 왔다. 아래는 78 이 남긴 지목의 원문이다.

🔴 **고장은 없다. INBOX 순서 4 — 격차를 소진하는 중이다.** 남은 구멍 둘은 루프가 못 연다 — 122 는 🙋 두 값(공개 저장소 URL · 제출 팀명), 117 은 절삭 1번(P3 🙋 키).
격차의 순서: **119**(데모 항목 15 vs SPEC 60) → 118 → 116 → 112 → 59 → 100 → 131 → 132 → 133 → 134 → 137.

> **119 를 하는 법** — 대장의 「고칠 방향」 그대로: **데모용 항목을 지어내지 마라**, 정본은 픽스처 하나다(§10.1). 먼저 판단할 것은 「얇은 Pack 이 심사에서 어떻게 읽히는가」 — 지금 데모 v1.1.0 의
> Pack 을 열어 읽고(`/demo` → Pack Explorer) 팀 규칙으로 보이는 데 15개가 모자란지 적어라. 모자라면 `fixtures/paylab-docs/goals.md`(또는 policy 문서)를 넓히고 `apps/web/src/lib/demo/seed.ts` 의
> `paylabDrafts()` 에 줄을 더한다 — 관통(golden · walkthrough)이 같은 픽스처를 보므로 golden expected 가 갈리면 ⑤ 규칙(TEMPLATE/COMPILER_VERSION · 이유를 커밋에)이다. 안 모자라면 SPEC §10.3 의 수를
> 코드에 맞춰 고치고 그 이유를 적는다(코드가 현실). 어느 쪽이든 **한 바퀴에 하나** · P7 — 새 항목마다 `source_refs` 가 원문 줄을 가리켜야 한다 (FINDINGS 90 이 잰 방식).

- PLAN 의 `- [ ]` 중 남은 것 다섯: P3 첫 행(🙋 Anthropic 키) · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다 · 이 바퀴가 게스트의 쓰기 버튼 셋을 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 🙋 URL·팀명).
  **루프가 혼자 닫을 수 있는 PLAN 행은 없다** — 그래서 INBOX 순서 4 가 이번 뒤의 일이다.
- 대장의 대기(122 · 119 · 118 · 117 · 116 · 112 · 100 · 59 · 131~134 · 137) — **고장 0** · 나머지는 **PLAN 을 막지 않는다.**

---

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

🟡 **화면 3(`/import`)에서 Gemini 구조화 job 을 브라우저로 본 적이 없다** (81·82바퀴 · `3b6ebef`). `pnpm --filter web p3:measure` 는 라우트를 프로세스 안에서 불러 goals.md → `succeeded` · 항목 12 · 질문 4 · 인용 21/21 이 제목과 같은 문장까지 봤다
(`docs/evidence/2026-09-06-p3-gemini/probe.txt` §5). 못 본 것: `demo:db` + `next start`(`.env.local` 의 키를 읽는다) → `/import` 에 goals.md 를 붙여 넣으면 진행 막대가 「1 조각 중 0 → 1」로 가나 · 후보 12장·질문 4장이 화면 4 에 서나 ·
근거 드로어가 잘라 보이는 문장이 제목과 맞나 — 142·143 이 닫혔으니 이제 볼 만하다(83바퀴 2회차는 충돌 3/3 까지 — `docs/evidence/2026-09-07-p3-gemini/probe.txt`). 145·146 뒤에 한 번에.

🟡 **화면 8 의 `due` 칸을 브라우저로 안 봤다** (76바퀴 · `4109f5e` · FINDINGS 111). 글자 모양은 `pnpm --filter web exec tsx scripts/dump-roadmap.tsx` 가 정본이고 13 모양 전부에
`due 2026-09-20` 이 마일스톤 ID 뒤 · chip 앞에 선다 (`docs/evidence/2026-09-06-manifest-due/probe.txt`). 못 본 것: 그 `meta mono` 칸이 375px 에서 chip 과 줄바꿈될 때 어색하지 않은가.
`demo:db` + `next dev` → `/demo` → roadmap 탭에서 PL-M1 행에 `due 2026-04-30` 이 보이면 끝 — 아래 「게스트 데모」 항목(roadmap 미확인)과 같은 스크립트로 한 번에.

🟡 **CLI 의 「어디서 보나」 줄을 진짜 서버에 대고 찍은 적이 없다** (74바퀴 · `4d0ba9a` · FINDINGS 115). 전/후는 fakeCli 의 stdout 이다
(`docs/evidence/2026-09-06-cli-web-hint/probe.txt`) — 코드 길은 같으니 모양은 같다. 확인하려면 `demo:db` + `next dev` 위에서 기기 토큰을 하나 발급해
`.contextops/project.json` 에 꽂고 `node plugin/contextops/bin/contextops-cli.mjs propose` — 마지막 줄이 `→ 웹 http://localhost:3000 에 로그인해 … 「제안」 탭 …` 이고
브라우저의 그 탭에 제목이 같은 제안이 뜨면 끝. 관통이 `propose` 를 안 부르는 것은 그대로다 (부르게 하려면 sync 단계처럼 `scripts/walkthrough-*.ts` 한 파일).

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
| ~~Anthropic API 키~~ → **Gemini 키** | ✅ **2026-09-06 사람이 꽂았다** (`GEMINI_API_KEY`·`GEMINI_MODEL=gemini-3.5-flash` · 79바퀴가 `836a0a9` 로 갈아끼웠다 · 진짜 호출 통과) | 🙋 남은 것 하나: **`gemini-3.5-flash`·`3.6-flash` 의 정가**를 `apps/web/src/lib/ai/features.ts` `AI_MODELS` 에 — 지금은 2.5 flash 공개가(0.30/2.50 USD/M)가 임시로 있다. 틀리면 하루 예산(`AI_DAILY_BUDGET_USD=3`)의 셈이 틀린다. 같은 값을 Vercel 에도 |
| Vercel 프로젝트 연결 · 환경변수 (**Root Directory `apps/web`** · `CRON_SECRET` · `SUPABASE_JWT_SECRET` · `DATABASE_URL`) → 첫 리셋 한 번 (`curl -H "Authorization: Bearer $CRON_SECRET" https://<앱>/api/v1/cron/demo-reset`) → `/demo` 가 열리나 → 브라우저 네트워크 탭에서 `batch-draft`·`progress` 요청 body 캡처 한 장(P1 증거의 나머지 절반 · `docs/evidence/2026-09-06-p1-payload/` 옆에) | 계정 연결이 필요하다 | **🔴 지금.** 코드 쪽(Cron · 리셋 문 · `vercel.json`)은 63바퀴에, P1 증거의 코드 쪽은 64·65바퀴에 다 됐다 — 값만 꽂으면 데모가 production 에서 매일 03:00 KST 에 다시 선다 |
| 실데이터 픽스처(`brain`) 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만 · SPEC §14 절삭 6번) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** 값은 `.env.local` 에만 산다 (P1).
🔴 `SUPABASE_JWT_SECRET` 이 없으면 **아무도 로그인하지 못한다** — 조용히 통과시키지 않는 것이
의도다 (`src/lib/api/session.ts`).

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

- 🔴 **FINDINGS 를 ✅ 로 바꾸는 문서 커밋은 `KNOWN_LIMITATIONS.md` 의 그 번호 줄을 같이 지워야 한다 — 그리고 `pnpm docs:check` 를 돌려라** (79바퀴 · 138). 78 의 문서 커밋이 121 을 닫으며 그 줄을 남겨
  다음 바퀴의 관통이 api 단계에서 빨갛게 시작했다. 이제 `docs` 층(`tools/status-shape.mjs` ②-B)이 잡는다 — test 층(85초)까지 안 돌려도 된다.
- **문자열 게이트를 확인할 probe 파일에 게이트가 찾는 낱말을 주석으로도 적지 마라** (79바퀴). `withBudget 없이` 라고 적은 주석이 P3 검사(`-notmatch "withBudget"`)를 통과시켰다. 확인이 「통과」로 끝나면 먼저 probe 를 의심해라.
- **Gemini `responseJsonSchema` 는 `$ref`·`const` 를 받되 `const` 는 안 지키고 `minItems`·`maxItems` 는 이유 없이 400 이다** (79바퀴 · 실측). 새 키워드가 거절되면 `client.ts` 의 `GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS` 한 줄 — 스키마를 고치지 마라. `pnpm --filter web ai:smoke` 가 진짜 호출 한 번의 문이다(돈이 든다 · CI 밖).
- **「부하에서도 초록」을 재야 하는데 부하가 사라졌으면 합성 부하로 잰다** (73바퀴). `Start-Process node -ArgumentList '-e','"while(true){}"' -PassThru` 를
  N 개(16 논리코어에 12개 ≈ 62% · 15개 = 100%) 띄우고 `try { … } finally { Stop-Process }` 로 반드시 거둔다 — 끝난 뒤 `Get-Process node | ? CommandLine -like '*while(true)*'`
  로 0 을 확인해라. 부하는 `(Get-CimInstance Win32_Processor).LoadPercentage` 로 읽는다. ⚠ Bash 도구에서 `cmd.exe /c "pnpm test >> file 2>&1"` 은 **pnpm 을 안 돌리고
  cmd 배너만 찍고 exit 0** 이다(따옴표가 접힌다) — Bash 에서는 그냥 `pnpm test >> file 2>&1`, PowerShell 에서는 `cmd.exe /c` 를 써라.
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
