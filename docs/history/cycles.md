# 지난 바퀴 기록 — `docs/STATUS.md` 에서 내려온 것

> **여기는 「무엇을 했나」의 창고다. 「무엇을 할 것인가」는 여기 없다.**
>
> ★ 왜 이 파일이 있나 (FINDINGS **102**) — `STATUS.md` 는 「다음 바퀴의 유일한 기억」인데,
> 46바퀴 시점에 **200KB · 2,250줄**이 됐고 그중 900여 줄이 10~40바퀴의 기록이었다.
> 아무도 끝까지 안 읽는 파일이 되자 **아래쪽에 손이 안 닿았고**, 거기 있던
> 「다음 바퀴가 할 일」 절이 **두 바퀴 전에 닫힌 항목(97)** 을 계속 가리키고 있었다.
> 머리는 「99」라고 하고 아래는 「97」이라고 하는 파일이 된 것이다.
>
> **그래서 크기가 아니라 「손이 닿는가」로 잘랐다.** STATUS 는 최근 몇 바퀴만 들고,
> 그보다 오래된 것은 여기로 내린다. 지워지는 것이 아니다 — 커밋 메시지와
> `docs/feedback/FINDINGS.md` 의 `✅` 줄에도 같은 내용이 있다.
>
> **옮기는 절차 (한 줄)** — `STATUS.md` 에서 제일 오래된 `### 지난 바퀴 (N)` 블록을
> **잘라서** 이 파일의 머리글 바로 아래(제일 위)에 붙인다. 베끼지 마라 — 게이트가
> 양쪽에 있는 것을 잡는다 (`tools/status-shape.mjs`).
### 지난 바퀴 (75) — 제안 결정은 「한 장 단위」 · DESIGN_BRIEF·SPEC §9 를 코드에 · 게이트 4 · 코드 0줄 (FINDINGS 114 ② · `e7e0513`)

**이번 바퀴(75)는 FINDINGS 114 — 구멍(DESIGN_BRIEF §4 화면 6 이 「항목별 [승인] [거절]」을 약속하는데 서버에 담을 자리가 없다)을 ② 로 닫았다** (`e7e0513`). INBOX 순서 4(구멍 → 격차)의
둘째 항목이다 — 고장 0 · 루프가 혼자 닫을 PLAN 행 없음(아래). 114 의 「고칠 방향」 **②(문서를 코드에)** 를 골랐다 — 코드가 현실이고 관통이 지나는 전체 결정을 그대로 둔다. ① 항목별 결정 표는
§2.1 발행 트랜잭션·`packages/schema`·화면 6·발행 시험을 한 바퀴에 다 건드리므로 **사람이 INBOX 에 적어야 연다.** 열어 보니 **같은 약속이 한 곳 더 있었다** — `docs/SPEC.md` §9 화면 표 6번 행
(「항목별 승인/거절」). 대장은 DESIGN_BRIEF 만 적었지만 같은 개념이라 같이 고쳤다. 코드는 **0줄** 바꿨다 (`proposals.tsx` 는 머리 주석 한 덩이) — 바뀐 것은 문서 두 줄과 **게이트 4개**다.

🔴 **잰 것** (`docs/evidence/2026-09-06-proposal-unit/probe.txt`):

| | 전 (`8dd871a`) | 후 (`e7e0513`) |
|---|---|---|
| DESIGN_BRIEF §4 화면 6 | 「항목별 [승인] [거절] + 전체 [모두 승인] [거절(사유 필수)]」 | 「**결정은 제안 한 장 단위다** — 전체 [모두 승인] / [거절(사유 필수)] · `PROPOSAL_DECISIONS` 표 하나」 + ⚠ 항목별은 없다 · 갈라 받고 싶으면 제안을 나눠 낸다 · 만들려면 §2.1·스키마·이 줄을 같은 바퀴에 |
| SPEC §9 6번 행 | 「… 근거 링크 · 항목별 승인/거절」 | 「… **제안 한 장 단위** 승인/거절(사유 필수 · `PROPOSAL_DECISIONS` §5) — 항목별 결정은 없다」 |
| 코드 (스키마 · 화면) | `ProposalItem` 에 결정 칸 없음 · `ProposalItemCard` 에 버튼 0 · 결정은 `proposals.status` 한 칸 | **그대로** — 처음부터 한 장 단위였다. 문서가 코드보다 넓었던 것 |
| 게이트 `test/web-proposals.test.ts` | 33 | **37** (+⑧ 4개) — ① 화면 6 절에 「제안 한 장 단위」·`PROPOSAL_DECISIONS` 가 있고 「항목별 [승인]」이 든 줄은 「없다」고 말하는 줄뿐 ② SPEC §9 6번 행도 같은 말 ③ `ProposalItem` 이 `status`·`decision`·`approved`·`decided_by` 를 실으면 `.strict()` 가 거절 ④ 항목 카드 마크업에 `<button`·「승인」·「거절」 0 · `ProposalDecisions` 버튼 수 = `availableActions('submitted','owner')` |
| 빨개지는 것을 봤나 | — | **봤다** — 문서 두 줄을 `git stash` 로 옛 문구로 되돌리니 ①② 가 빨갛다 (받은 절이 「항목별 [승인] [거절] …」이라고 찍힌다) · pop 하니 37/37 |
| `proposals.tsx` 머리 주석 | 「DESIGN_BRIEF §4 는 항목별 버튼을 적지만 누르면 아무 일도 안 하는 버튼이 된다」 | 「DESIGN_BRIEF 화면 6 과 SPEC §9 도 이제 같은 말을 한다 — 카드에 버튼을 그리지 마라」 |
| CI | GREEN (17:55) | principles OK 9 · typecheck 11초 · test 87초 · build 21초 · walkthrough **953**(949 + 4) · docs 는 STATUS 의 「다음」이 114 라 이 커밋에서 FAIL → 이 문서 커밋이 닫는다 (18:09) |

⚠ **안 한 것** — 화면 6 을 브라우저로 다시 열지 않았다 (코드가 0줄이라 화면은 74바퀴와 같다 · 70바퀴 캡처 `docs/evidence/2026-09-06-focus-visible/` 에 결정 칸이 있다).
SPEC §2 는 이미 「제안 한 장에 status 하나」라 안 고쳤다. `docs/PLAN.md:343` 의 「114」 언급은 56바퀴의 서사라 그대로 뒀다.

🔴 **배운 것 — 「문서를 코드에 맞춘다」도 게이트가 있어야 닫힌다.** 문서만 고치면 다음 사람이 옛 SPEC 을 보고 항목별 버튼을 다시 그린다 — 이번에도 SPEC §9 에 같은 약속이 **하나 더** 살아 있었다.
그래서 시험 ③ 은 「지금 없다」가 아니라 **「생기면 빨개진다」** 로 짰다 — 항목별 결정을 정말로 만드는 바퀴는 이 시험이 빨개지고, 그때 §2.1·스키마·문서를 같은 커밋에 고친다. 그게 의도다.

🔴 **2-B 이번 라운드 — `scope.kind` 3종은 살아 있고 잠겨 있다.** ① 소비처: `packages/compiler/src/partition.ts` 의 `SCOPE_DOC`(어느 파일로 가나) · `sort.ts` 의 `SCOPE_ORDER`(같은 절 안의 순서) ·
`sections.ts` 의 `SCOPE_INLINE_LABEL`(줄 끝 `· 도메인: payment`) — 표 셋이 다 읽는다 ② `packages/compiler/test/liveness.test.ts` 「scope.kind 3종 · 배치」·「정렬」·「SCOPE_INLINE_LABEL 은 project 를 뺀
전부를 덮는다」가 셋을 돌려 가며 출력이 갈림을 센다. 웹은 `context/page.tsx:266` 이 `kind:value` 로 그린다. 새로 적을 것 없음. 다음 라운드는 `ItemType` 10종(37바퀴 이후 안 팠다).

**그 바퀴가 다음으로 지목한 것 = FINDINGS 111** → 76바퀴가 닫았다 (`4109f5e`). 아래는 75 가 남긴 지목의 원문이다.

🔴 **고장은 없다. INBOX 순서 4 — 구멍 → 격차.** 74바퀴가 적어 둔 「그 다음 구멍 113 · 111 · 110 · 108 …」에서 **113 과 110 은 이미 닫혀 있었다** (`aee5de2` · `8c3e8c5` · 57바퀴 — 대장에 ✅ 가 있다).
122 는 🙋 두 값(공개 저장소 URL · 제출 팀명)이 와야 하고 117 은 절삭 1번(P3 🙋 키)이라 건너뛴다 → 다음 구멍 **111**(Manifest 의 마일스톤에 `due` 가 없다 — 화면 8 이 기한을 말할 수 없다).
그 다음 구멍 108(`answerSlot` 을 두 갈래로만 · 지금은 닿을 수 없어 급하지 않다) → 격차 121+135 · 119 · 118 · 116 · 112 · 59 · 100 · 131 · 132 · 133 · 134.

> **111 을 하는 법** — 컴파일러를 건드리는 일이라 **golden 과 템플릿 버전이 딸려 온다** (`loop/PROMPT.md` ③). `packages/schema/src/manifest.ts` 의 `ManifestMilestone` 에 `due: CalendarDate.optional()`
> 한 줄 → `packages/compiler/src/compile.ts` 의 `milestonesOf()` 에 한 줄(지금은 `id`·`paths`·`done_when` 셋만 옮긴다 · `sections.ts:93` 은 같은 값을 본문에 이미 적는다) → 라우트(`GET /projects/{id}/roadmap`)는
> Manifest 를 그대로 나르니 고칠 것이 없는지 **코드에서 확인** → 화면 8 행에 한 칸(DESIGN_BRIEF §4 화면 8 의 `due 09-20`). ⚠ Manifest 가 바뀌면 `manifest_hash` 가 바뀐다 — 컴파일러/템플릿 버전을 올리고
> golden expected 를 갱신한 **이유를 커밋 메시지에**. 잠그는 시험은 「`due` 를 뒤집으면 Manifest 와 화면 8 의 글자가 갈린다」(2-B ②단계 모양). SPEC §4 의 Manifest 표도 같은 커밋에. **한 바퀴에 하나씩.**

- PLAN 의 `- [ ]` 중 남은 것 다섯: P3 첫 행(🙋 Anthropic 키) · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 🙋 URL·팀명).
  **루프가 혼자 닫을 수 있는 PLAN 행은 없다** — 그래서 INBOX 순서 4 가 이번 뒤의 일이다.
- 대장의 대기(122 · 121 · 119 · 118 · 117 · 116 · 112 · 111 · 108 · 100 · 59 · 131~135) — **고장 0** · 나머지는 **PLAN 을 막지 않는다.**

### 지난 바퀴 (74) — CLI 가 웹 주소를 안 짓는다 · where.ts 한 곳 · upload-draft 의 같은 줄도 (FINDINGS 115 · `4d0ba9a`)


**이번 바퀴(74)는 FINDINGS 115 — 구멍(CLI 가 찍는 제안 주소가 앱에 없는 `/p/{uuid}/…` 라 눌러도 404)을 닫았다** (`4d0ba9a`). INBOX 순서 4(구멍 → 격차)의 첫 항목이다 —
고장 0 · 루프가 혼자 닫을 PLAN 행 없음(아래). 115 의 「고칠 방향」 **①(주소를 안 찍는다)** 을 골랐다 — 설정(`project.json`)에는 uuid 뿐이고 웹 주소는 slug 라(SPEC §8.2 · §9)
CLI 는 그 주소를 **알 수 없다**. ② 전달 라우트는 주소를 둘로 만든다. 열어 보니 **같은 줄이 `upload-draft` 에도 있었다**(`…/p/{project_id}/context 에서 확인해라`) —
대장은 propose 만 적었지만 같은 개념이라 같이 닫았다. 「어디서 보나」 줄은 `plugin/contextops/src/cli/where.ts` **한 곳**이 만들고 두 명령은 읽기만 한다.

🔴 **잰 것** (`docs/evidence/2026-09-06-cli-web-hint/probe.txt` · fakeCli 로 같은 시나리오를 전/후로 찍었다):

| | 전 (`5defaa7`) | 후 (`4d0ba9a`) |
|---|---|---|
| `propose` 성공 뒤 마지막 줄 | `→ https://…/p/11111111-…/proposals/p1` — 앱에 `/p/` 라우트가 없다 → 404 | `→ 웹 https://… 에 로그인해 이 프로젝트의 「제안」 탭에서 볼 수 있다 — 「환불 창을 7일로 좁힌다」 · id p1` |
| `upload-draft` 성공 뒤 마지막 줄 | `→ https://…/p/11111111-…/context 에서 확인해라` — 같은 404 | `→ 웹 https://… 에 로그인해 이 프로젝트의 「Context」 탭에서 볼 수 있다 — 초안 1개` |
| origin 뒤에 경로를 붙이는 CLI 소스 | **3곳** (api.ts · propose.ts:113 · upload-draft.ts:139) | **1곳** (`api.ts` 의 `/api/v1`) — `test/where.test.ts` ① 이 `src/cli/*.ts` 를 훑어 센다 · bait 파일을 넣으면 `_bad.ts:2` 를 집어 빨개진다(직접 확인) |
| CLI 가 부르는 탭 이름 ↔ 웹 `layout.tsx` 의 `TABS` label | — | 「제안」·「Context」 둘 다 있음 — 시험 ② 가 그 파일을 글자로 읽어 센다 (플러그인은 웹을 import 못 한다 · 의존 방향 `schema ← compiler ← web/plugin`) |
| 안내 줄에 경로가 있나 | `/p/` 1 | `/p/` 0 · `/t/` 0 · project uuid 0 — 시험 ③ 과 propose·upload-draft 의 +1 씩 |
| 플러그인 시험 파일 / 시험 | 15 / 173 | **16 / 178** (where 3 · propose +1 · upload-draft +1 · skipped 1 그대로) |
| 번들 `bin/contextops-cli.mjs` | 옛 줄 | 다시 만듦 · `bundle.test` 바이트 동일 |
| Skill 문서 (init · propose) | 「웹 링크를 보여 준다」 · 「링크를 그대로」 | 「어디서 보나 줄」 + ⚠ 화면 주소를 지어 붙이지 마라 |
| SPEC §8.3 | — | ⚠ 한 문단 — CLI 는 웹 주소를 조립하지 않는다 · 만드는 곳은 `where.ts` 하나 · 서버가 slug 를 내주면 거기만 |
| CI | GREEN (17:43) | principles OK 9 · typecheck 9초 · test 89초 · build 21초 · walkthrough **949** · docs → **GREEN** (17:55) |

⚠ **관통은 `propose`·`upload-draft` 를 안 부른다** — 그래서 위 전/후는 관통 산출물이 아니라 시험 helper(fakeCli)의 stdout 이다. 진짜 서버에 대고 찍은 적은 없다 (줄 하나라 모양은 같다).
탭 이름은 사람이 로그인한 뒤 프로젝트 안에서 누르는 글자 그대로다 — 그 탭이 실제로 그 이름으로 뜨는 것은 70바퀴의 캡처(`docs/evidence/2026-09-06-focus-visible/`)에 있다.

🔴 **배운 것 — 「주소를 찍는다」는 「주소를 안다」가 아니다.** uuid 로 지은 주소는 시험에서도 화면에서도 그럴듯하다. 그래서 게이트는 「올바른 주소인가」(CLI 는 알 수 없다)가 아니라
**「origin 뒤에 경로를 붙이는 소스가 `api.ts` 하나인가」**를 센다 — 다음 사람이 세 번째 자리를 만들면 그 파일:줄이 찍힌다. 같은 줄이 이미 두 파일에 있었으니 「두 번이면 게이트」 그대로다.

🔴 **2-B 이번 라운드 — `enforcement` 4종은 살아 있고 잠겨 있다.** ① 소비처: `packages/compiler/src/sections.ts` 의 `ENFORCEMENT_LABEL` 표(4행 · `satisfies Record<…>` 라 하나 빠지면 컴파일이 깨진다)가
policy 줄의 「강제: …」를 만든다 ② `packages/compiler/test/liveness.test.ts` 「enforcement 4종」이 넷을 돌려 가며 fingerprint 가 넷 다 다름을 센다. 새로 적을 것 없음.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 114(항목별 승인/거절을 담을 자리가 서버에 없다 → ② 문서를 코드에). 75바퀴가 닫았다 (`e7e0513`).


🔴 **고장은 없다. INBOX 순서 4 — 구멍 → 격차.** 122 는 🙋 두 값(공개 저장소 URL · 제출 팀명)이 와야 하고 117 은 절삭 1번(P3 🙋 키)이라 건너뛴다 → 다음 구멍 **114**
(항목별 [승인]/[거절] 을 담을 자리가 서버에 없다). 114 는 「둘 중 하나를 **고르고** 손대라」다 — ① 항목별 결정 표(`proposal_item_decisions`)를 만들고 발행 `applyProposals` 를
「승인된 항목만」으로(§2.1 발행 트랜잭션을 건드린다) · ② 안 만든다 — `docs/DESIGN_BRIEF.md` §4 화면 6 의 그 줄을 「제안은 한 장 단위로 승인한다」로 고친다.
**제출일을 보면 ② 다** — 관통이 지나는 전체 결정을 그대로 두고 문서가 코드와 같은 말을 하게 한다(「코드가 현실」). ① 은 §2.1 · `packages/schema` · 화면 6 · 발행 시험을
한 바퀴에 다 건드리므로 **사람이 ① 을 원하면 INBOX 에 한 줄** — 그 전까지는 ②. 그 다음 구멍 113 · 111 · 110 · 108 · 106 · 105 · 104 · 103 → 격차 121+135 · 119 · 118 · 116 · 112 · 131 · 132 · 133 · 134.

> **114 ② 를 하는 법** — `docs/DESIGN_BRIEF.md` §4 화면 6 에서 「항목별 [승인] [거절]」 줄을 찾아 「제안은 한 장 단위 · 전체 [승인] / [거절(사유 필수)]」로 고친다. 정본은 SPEC §5 의
> `PROPOSAL_DECISIONS`(제안 한 장을 옮기는 표 · `packages/schema`). 화면 6(`apps/web/src/app/t/[team]/p/[project]/proposals/[id]/page.tsx`)이 항목별 버튼을 그리지 않는 것을 먼저
> 눈으로 확인하고, `apps/web/test/` 에 DESIGN_BRIEF ↔ 코드를 대조하는 시험이 있으면(`design-tokens.test.ts` 가 그 모양) 같은 모양으로 한 줄 — 「화면 6 에 항목별 결정 버튼 0개」.
> FINDINGS 114 의 상태 줄과 DESIGN_BRIEF 의 줄을 **같은 커밋**에. ⚠ SPEC §2 는 이미 「제안 한 장에 status 하나」라 안 고친다 — 코드와 같다.

- PLAN 의 `- [ ]` 중 남은 것 다섯: P3 첫 행(🙋 Anthropic 키) · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 🙋 URL·팀명).
  **루프가 혼자 닫을 수 있는 PLAN 행은 없다** — 그래서 INBOX 순서 4 가 이번 뒤의 일이다.
- 대장의 대기(122 · 121 · 119 · 118 · 117 · 116 · 114 · 113 · 112 · 111 · 110 · 108 · 106 · 105 · 104 · 103 · 131~135 …) — **고장 0** · 나머지는 **PLAN 을 막지 않는다.**


### 지난 바퀴 (73) — 훅 상한을 vitest.base.ts 한 곳으로 · 부하 100% 에서 33/33 (FINDINGS 136 · `767a33e`)


**이번 바퀴(73)는 FINDINGS 136 — 고장(CI 의 test 층이 부하에서 코드와 무관하게 빨개진다)을 닫았다** (`767a33e`). 고장은 INBOX 순서보다 위라(④3 ①) 먼저 했다.
훅 상한을 `vitest.base.ts` 의 `HOOK_TIMEOUT_MS = 30_000` **한 곳**으로 모았다 — 열어 보니 **이미 7 파일이 저마다 훅에 `60_000`·`30_000` 을 들고 있었다**
(ai-budget · ai-conflict · ai-job · ai-structure · migration · db-pool · migrate-script — 전부 같은 PGlite 기동인데 수치가 흩어져 갈린 상태). 그 9곳을 지웠다.
`apps/web/test/hook-timeout.test.ts` 3개가 ① 설정의 `test.hookTimeout` 이 실제로 그 상수인가(정의만 있는 상태가 아닌가) ② 잰 최악(18초)·vitest 기본(10초)보다 큰가
③ 워크스페이스 전 `*.test.ts` 를 TS 파서로 읽어 훅에 둘째 인자(자기 상한)를 준 곳이 **0** 인가를 센다 — `migration.test.ts` 의 옛 `60_000` 을 되돌리면 그 줄(`:81`)을
집어 빨개진다(직접 확인). **PLAN 은 안 움직였다** — 루프가 혼자 닫을 수 있는 행이 없다 (아래).

🔴 **잰 것 — 부하에서 빨강 → 초록.** 이 바퀴가 시작할 때는 게임 클라이언트가 떠 있어(CPU 79%) 옛 설정으로 **먼저 한 번 더 재현**했고, 고친 뒤에는 게임이
꺼져(17:2x · CPU 8%) 진짜 부하가 사라졌기에 `node -e "while(true){}"` 를 12개·15개 띄운 **합성 부하**로 쟀다 (`docs/evidence/2026-09-06-hook-timeout/`).

| | 전 (`5e3a8a8` · 기본 10초) | 후 (`767a33e` · 30초) |
|---|---|---|
| 실제 게임 부하 (LoadPercentage **79** · 17:18) | **9 failed / 32 files** · `Hook timed out in 10000ms` 9 · 150초 (`before.txt`) | — (게임이 꺼져 못 쟀다) |
| 합성 부하 12 loop (62%) | — | **33/33 · 633/633** · 145초 (`after-under-load.txt`) |
| 합성 부하 15 loop (**100%**) | — | **33/33 · 633/633** · 194초 (`after-under-load-2.txt`) |
| 부하 없음 (CI test 층 · 멤버 4) | 16:46 GREEN (71바퀴) | **OK 84초** |
| 훅에 자기 상한을 준 시험 파일 | **7** (9곳) | **0** — 시험 ③ 이 센다 |
| vitest 파일 / 시험 (apps/web) | 32 / 630 | **33 / 633** |
| 손대지 않은 것 | — | `it(…, 15_000·30_000·60_000)` 시험 **본문** 상한 7곳 — `testTimeout` 이라 다른 개념 (흩어져 있긴 하다 · 필요해지면 같은 모양으로) · `maxWorkers` |
| 합성 부하 프로세스 | — | 끝난 뒤 `while(true)` node **0** (`try/finally` 로 거뒀다) |
| CI | **RED** (17:06 · 17:10) | principles OK 9 · typecheck 10초 · test 84초 · build 27초 · walkthrough **949** · docs → **GREEN** (17:34) |

🔴 **왜 30초이고 왜 `maxWorkers` 가 아닌가** — 잰 최악 18초의 1.7배라 「PGlite 가 안 뜬다」(영원히 안 끝남)와 「느리다」는 여전히 갈린다. `maxWorkers` 는 한가할
때도 늘 느리게 만들고, 상한은 실패 판정선만 옮긴다. 이유는 상수 옆(`vitest.base.ts`)에 적혀 있다 — 다음 사람이 「왜 30」을 묻지 않게.

🔴 **배운 것 — 「한 곳에 두라」는 지시가 왔을 때 그 값이 이미 몇 곳에 있는지 먼저 세라.** 136 의 「고칠 방향」은 「파일마다 붙이지 마라」였는데, 붙어 있는 것이
이미 7 파일이었다. 정본을 더하기만 하고 흩어진 것을 안 지우면 정본은 **여덟째 사본**이 된다. 그래서 시험 ③ 은 「정본이 있는가」가 아니라 **「사본이 0 인가」**를 센다.

🔴 **2-B 이번 라운드 — 에러 코드(`ERROR_CODES`)는 살아 있고 잠겨 있다.** ① 소비처: `apps/web/test/error-codes.test.ts` 의 `WITHOUT_OWNER` 표가 **비어 있다**
= 코드 전부 `ApiError` 를 던지는 자리가 있다(「모든 코드가 실제로 내는 자리를 가졌다」) ② 「코드를 바꾸면 응답이 갈린다」 — 응답의 status·message 가
`ERROR_STATUS` 표를 따라간다. 새로 적을 것 없음.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 115(CLI 가 찍는 제안 주소가 앱에 없는 주소). 74바퀴가 닫았다 (`4d0ba9a`).


🔴 **고장은 없다. INBOX 순서 4 — 미해결 FINDINGS 를 구멍 → 격차 순으로.** 구멍 중 **122** 는 🙋 두 값(공개 저장소 URL · 제출 팀명)이 와야 하고,
**117**(`POST …/ask`)은 SPEC §14 **절삭 1번**이자 P3(🙋 Anthropic 키)의 몫이라 지금 만들면 픽스처 답만 내는 문이 된다 — 그래서 그 다음 구멍
**115**(CLI 가 찍는 제안 주소가 앱에 없는 `/p/{id}/…` 라 눌러도 404)부터. 115 의 「고칠 방향」 ①(주소를 안 찍고 「웹의 제안 탭에서 볼 수 있다」)이
싸고 주소 정본(slug)을 하나로 지킨다 — ② 전달 라우트는 주소를 둘로 만든다. 그 다음 구멍 114 · 113 · 111 · 110 · 108 · 106 · 105 · 104 · 103
→ 격차 121+135 · 119 · 118 · 116 · 112 · 131 · 132 · 133 · 134.

> **115 를 하는 법** — `plugin/contextops/src/cli/propose.ts`(번들 `bin/contextops-cli.mjs` 는 빌드 산출물 · 직접 고치지 마라)에서
> `${config.api_origin}/p/${config.project_id}/proposals/${id}` 줄을 찾아 정본은 SPEC §8.4 · §9(주소는 slug). 시험은 `plugin/contextops/test/`
> 의 `propose.test.ts` 에 「찍은 출력에 `/p/` 주소가 없다」 한 줄. 번들은 `plugin/contextops/package.json` 의 `build`(`tsx scripts/build.ts`) 로 다시 만든다.
> 73바퀴가 확인했다 — 그 줄은 `plugin/contextops/src/cli/propose.ts:113` 에 **아직 있다** (56바퀴 근거는 번들 줄 번호였다).

- PLAN 의 `- [ ]` 중 남은 것 다섯: P3 첫 행(🙋 Anthropic 키) · P4 둘째 행(GATE 3 · 눈 판정 — 70바퀴가 반 봤다) · P5 셋째 행(🙋 Vercel) · P6 두 행(🙋 영상 · 🙋 URL·팀명).
  **루프가 혼자 닫을 수 있는 PLAN 행은 없다** — 그래서 INBOX 순서 4 가 이번 뒤의 일이다.
- 대장의 대기(122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 113 · 112 · 111 · 110 · 108 · 106 · 105 · 104 · 103 · 131~135 …) — **고장 0** · 나머지는 **PLAN 을 막지 않는다.**

### 지난 바퀴 (72) — 제출서는 이미 있었다 · 장부만 닫았다 · CI RED 를 136 으로 (INBOX 순서 3 · FINDINGS 126 · `5e3a8a8`)

**72바퀴는 INBOX 순서 3 — FINDINGS 126(제출서)을 닫았다. 그런데 만든 게 아니라 「이미 있었다」를 확인한 바퀴다.**
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
「검사를 통과하면 커밋」의 예외로 읽지 마라 — 코드를 바꾼 바퀴였다면 커밋하지 않았을 것이다.

🔴 **배운 것 — 「고친 커밋」과 「장부를 닫는 커밋」은 다른 커밋이고, 둘째를 빼먹으면 게이트가 못 잡는다.** 67바퀴는 코드 커밋(`4f90239`)을
올리고 바로 INBOX 의 고장(127)으로 갔다. status-shape 의 ② 는 「가리키는 항목이 대기인가」이지 「대기인 항목이 실은 이미 커밋됐는가」가
아니다. 같은 일이 한 번 더 나면 게이트로 올린다 — 「FINDINGS N 이 대기인데 `git log` 의 메시지에 `FINDINGS N)` 이 든 커밋이 HEAD 에
있으면 FAIL」. 지금은 한 번이라 규칙만 적는다 (`loop/PROMPT.md` ④3 「고친 항목은 지우지 말고 ✅ 와 커밋 해시를 적는다」가 이미 그 규칙이다).

🔴 **2-B 그 라운드 — `enforcement` 4종은 살아 있고 잠겨 있다.** ① 소비처: `packages/compiler/src/sections.ts` 의 `ENFORCEMENT_LABEL`
표(4/4 값 → 말) 를 policy 줄 「강제: …」 가 읽는다 ② `packages/compiler/test/liveness.test.ts:77` 이 hook·review·permission·none 넷을
전부 돌려 출력이 갈리는지 잰다 · golden 입력은 셋(review·hook·permission)을 덮는다. 새로 적을 것 없음.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 136(고장 · CI RED) → 73바퀴가 닫았다 (`767a33e` · 훅 상한을 `vitest.base.ts` 한 곳으로 · 부하 100% 에서 33/33).
그 뒤 순서로 적어 둔 것(INBOX 순서 4 · 구멍 115 부터 · 「115 를 하는 법」)은 73 의 머리로 옮겼다.

---


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


### 지난 바퀴 (66) — README · KNOWN_LIMITATIONS 본문 (PLAN P6 둘째 행 ① · `0dc2e93`)

**66바퀴는 PLAN P6 둘째 행의 첫 조각 — README 와 KNOWN_LIMITATIONS 의 본문**을 만들었다. README 는 「루프와 명세만 있다」고
거짓말을 하고 있었고, 이제 랜딩과 같은 문장을 말하며 `apps/web/test/readme.test.ts` 15개가 그것을 잰다(헤드라인 · Before/After ·
3단계 · 신뢰 경계 · 설치 4줄 · 저장소 지도 40행의 경로 실존 · KNOWN_LIMITATIONS 가 단 FINDINGS 번호 5개가 전부 대기인가).

| | 전 | 후 |
|---|---|---|
| README 머리 | 「🚧 지금 이 저장소에는 **자율 개발 루프와 명세만** 있습니다」 — 제품 코드가 295파일(principles P2 셈)인데 | 지금 도는 것 — 신뢰 경계 7줄에 「무엇이 잰다」 칸 · Before/After · 3단계 · 설치 4줄 · CLI 8 · 검사 층 6 · 저장소 지도 |
| README 의 기술 스택 | Tailwind 4 + shadcn/ui · Node 20 — 둘 다 **코드에 없다** (`apps/web/package.json` 에 tailwind 0 · `engines.node >=22`) | 실제 의존만 (Next 15 · Drizzle · postgres · PGlite · Zod · vitest · Node 22) |
| README ↔ 랜딩 | 대조 없음 (Before/After 문장도 없었다) | `apps/web/test/readme.test.ts` **15개** — 헤드라인 · Before/After(질문 · 두 답 · Pack 의 그 줄 · `ctx:item_policy_retry`) · 3단계 · 신뢰 경계 10행 · 설치 4줄(같은 순서 · 같은 설명) · 마무리 문장을 **랜딩 표에서 들여와** 글자 그대로 대조 |
| README 가 가리키는 경로 | 아무도 안 셈 (옛 트리는 `src/app/(marketing)` 처럼 없는 경로였다) | 저장소 지도 표 **40행** · 마크다운 링크 · 백틱 경로 전부 `existsSync` — 첫 실행에서 CLI 표의 `scan` 이 걸려 절 범위를 좁혔다 |
| KNOWN_LIMITATIONS | 8줄 — SPEC §17 을 옮긴 것 · 코드 근거 없음 | 줄마다 코드에서 이름을 찾았다. **P1 이 못 막는 것** 절 신설(P1 근거 문서 §7 의 두 줄 + 문서 원문은 의도적으로 올라간다 + manifest 서명 없음) · 제품 절에 코드에서 확인한 아홉을 더했다 (production 없음 · `npx contextops` 없음 · `ask`·`demo` 문 없음 · 데모 항목 15 · zip 드롭존 없음 · `manual` 보고 없음 · e2e 없음 · 게스트 403 문구 · Codex/Cursor 는 거울 문서) |
| KNOWN_LIMITATIONS 가 단 FINDINGS 번호 | — | 5개(122 · 121 · 117 · 119 · 69) 전부 **대기**인지 시험이 센다 — 닫힌 것을 한계라고 적으면 빨개진다. 백틱 경로 실존도 |
| 서버측 AI 「4개 기능」의 실체 | README 는 「4개 기능 한정」만 | `features.ts` 표는 넷인데 라우트가 부르는 것은 **둘**(structure · conflict) — KNOWN_LIMITATIONS 에 적었다 (FINDINGS 117 · 126) |
| 웹 시험 | 565 | **580** (`readme` +15) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough 881 · docs → GREEN (`0dc2e93`) |

🔴 **「알려진 한계」는 코드에서 이름을 찾은 뒤에 적었다** — SPEC §17 의 여덟 줄 중 절반만 맞는 것이 있었고(거울 문서는 생겼다),
코드에만 있고 §17 에 없는 것이 아홉이었다. 특히 「서버측 AI 4종 중 둘은 문이 없다」는 principles 의 P3 줄이 매 바퀴 찍고 있었는데
아무도 한계로 읽지 않았다.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 126(제출서). 67바퀴는 INBOX 의 고장이 위여서 127 로 갔다 — 126 은 그대로 대기다.

---

### 지난 바퀴 (65) — scan 단계의 env 값 검사 · 64바퀴 미커밋 올림 (PLAN P5 둘째 행 ③ · `8d29737`)


**이번 바퀴는 둘을 했다.** ① 64바퀴가 CI GREEN 까지 확인하고 **커밋하지 못한** P1 근거 문서 작업을 같은 트리에서
전 층 CI 를 다시 돌려(GREEN · 관통 880) 그대로 올렸다 (`0018ce9`) — 58·59·60·61·63·64 **여섯 바퀴**다 (아래 「밟은 함정」).
② 64바퀴가 다음으로 지목한 **FINDINGS 125** — scan 단계의 「env 값 0건」 검사가 **잰 값이 0개**였던 것 — 를 닫았다
(`8d29737`). 주인은 `docs/PLAN.md` **P5 둘째 행**(보안 캡처 증거)이고 그 행의 ③ 줄로 적었다. 관통 7단계 초록 · 고장 0.
그 행의 나머지(Vercel 연결 · 첫 리셋 · 네트워크 탭 캡처 · fresh install)는 🙋 다.

🔴 **잰 것 — scan 단계의 P1 증언이 이제 실제로 무언가를 잰다. 그리고 두 단계가 같은 값을 심는다.**

| | 전 | 후 |
|---|---|---|
| scan 단계 「env 값 0건」 | **잰 값 0개** — 픽스처 `.env.example` 의 값만 찾았고 그 파일은 값이 0건이어야 한다(`fixtures.mjs` ③) | 픽스처를 **임시 사본**(`mkdtemp`)에 복사 → 값이 든 `.env` 를 심고 → 그 사본을 훑는다. **잰 값 2개 · 0건** · 0개면 FAIL |
| 스캐너가 `.env` 를 **열어 키만** 꺼냈다는 증거 (scan 쪽) | 안 잼 | `.env` 에만 있는 `SENTRY_DSN` 이 `env_keys` 에 **있다** — env 키 14 → 15 · 제외 1 → 2종 (`.env` · `.env.example` 둘 다 「키 이름만 읽었다」) |
| 심는 값의 정본 | payload 스크립트 안의 표 하나 | `tools/walkthrough-stage.ts` 의 `PLANTED_ENV` · `plantEnv(repoDir)` — 둘째 사용자가 생겨 올렸다. 두 단계가 **같은 값**을 심고 각자 「내 산출물에 없다」를 잰다 |
| 값 8자 하한 | 두 스크립트에 숫자 `8` | `ENV_VALUE_MIN_CHARS` 한 곳 |
| `scan.json` 의 `repo` | 폴더 이름 (사본이면 난수) | `--repo-name paylab-api` 로 고정 — 증거 문서에 복사한 것과 어긋나지 않게 |
| 음성 확인 | — | `values` 를 빈 배열로 바꾼 사본을 돌리면 **exit 1** 「env 값을 하나도 안 쟀다」 |
| scan 단계 검사 · 관통 | 49 · 880 | **50 · 881** |
| `p1-payload.md` | §3·§4·§7 에 「scan 은 아직 0개」 ⚠ 셋 | ⚠ 0 · §4 표가 실측(잰 값 2 · 키 15 · 제외 2) · 산출물 둘 다시 복사 |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough · docs → GREEN (`8d29737`) |

🔴 **「표를 둘이 따로 들면 갈라진다」를 이번엔 미리 막았다.** 64바퀴가 payload 스크립트 안에 둔 `PLANTED_ENV` 를 scan
스크립트에 **베끼면** 당장은 돌지만, 누가 한쪽 값을 바꾼 날부터 두 단계의 「이 값을 안 나른다」는 서로 다른 값에 대한 증언이
된다. 둘째 사용자가 생긴 순간이 정본으로 올릴 때다 (CLAUDE.md 「둘째 사용자가 생기면 그때 정본으로 올린다」). `packages/schema`
가 아니라 `tools/` 에 둔 이유는 그 파일 머리에 있다 — 개발 도구의 계약이지 제품의 계약이 아니다.

🔴 **scan 단계는 여전히 `openStage()` 를 안 쓴다.** 산출물이 CLI 가 쓰는 `ScanResult` 라 `checks` 배열을 담을 자리가 없고,
관통은 stdout 의 「검사 N개」 줄을 센다 (`walkthrough.ps1` 의 `count_log`). 그래서 이 단계의 실패 사유는 산출물이 아니라
**로그**에만 남는다 — 사람이 읽는 증거로 굳힐 때 payload 단계처럼 `sent` 를 남길 수 없다. 바꾸려면 산출물을 둘로
(`walkthrough-scan.json` = 단계 산출물 · `scan.json` 은 그 안이나 옆에) 나눠야 하는데, 지금 그 둘째 사용자는 없다 — 적어만 둔다.

**눈으로 읽었다** — `docs/evidence/2026-09-06-p1-payload/walkthrough-scan.json`: `repo: "paylab-api"` · `files` 48개 전부
`{path, language}` 두 칸 · `summary.env_keys` 15개에 `SENTRY_DSN` 이 있고 · `excluded` 두 줄이 `.env` 와 `.env.example` 을
각각 「키 이름만 읽었다 — 값은 안 읽는다」로 적는다 · 파일 안에 `PLANTED` **0건** (`grep -c`). scan 로그의 마지막 줄은
「코드 본문 0건 · env 값 0건 (잰 값 2개 · 심은 키 2개 산출물에 있음) (P1)」이다 — 잰 수가 로그에 있다.

**그 바퀴가 다음으로 지목한 것 = FINDINGS 122** → 66바퀴가 README·KNOWN_LIMITATIONS 의 본문을 썼다 (🙋 URL·팀명은 그대로 · 122 는 대기).


🔴 **122 는 FINDINGS 이지만 PLAN 을 앞지르는 것이 아니다** — 주인이 **PLAN P6 둘째 행**(제출서 · README · KNOWN_LIMITATIONS)
이고, 그 행에서 루프가 할 수 있는 조각이 **README 본문**이다. P5 둘째 행의 남은 것은 전부 🙋(계정)이고, P6 첫 행(2분 영상 ·
슬라이드 · 리허설)은 발표자와 production URL 이 있어야 재료가 된다. 122 의 🙋 URL(GitHub · Known limitations 링크)은 그대로
🙋 로 두되, **README 와 KNOWN_LIMITATIONS 의 본문**은 URL 없이도 쓸 수 있다 — 링크는 자리만 만들고 값은 사람이 꽂는다.

> **README 를 쓰는 법** — `docs/SPEC.md` §16(제출서 초안)·§17(Known Limitations)과 랜딩(`apps/web/src/components/landing.tsx`)의 문장이 재료다.
> 랜딩과 README 가 서로 다른 말을 하면 안 된다 — 한쪽을 정본으로 하고 다른 쪽은 그것을 읽게 하든지, 시험이 대조하게 해라.
> KNOWN_LIMITATIONS 에는 `docs/evidence/2026-09-06-p1-payload/p1-payload.md` §7 의 두 줄(배포에서 찍은 것이 아니다 ·
> `body` 에 사람이 코드를 붙여 넣으면 계약은 못 막는다)이 들어간다. ⚠ 만들기 전에 **코드에서 그 이름을 찾아라.**

- PLAN 의 `- [ ]` 중 **위의 셋은 사람이 막고 있다** (🙋 Supabase · 🙋 Anthropic 키 · GATE 3). P5 둘째 행의 코드 쪽은 다 됐다.
- 대장의 대기(122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 112 · 111 · 108 · 69 · 25 · 33 …)는
  **PLAN 을 막지 않는다** — 적어 두고, 그 항목의 주인이 될 PLAN 행을 할 때 같이 닫는다 (④3 ②).


---


### 지난 바퀴 (64) — P1 근거 문서 · payload 단계의 env 값 검사 (PLAN P5 둘째 행 ② · `0018ce9`)

> ⚠ 64바퀴도 CI GREEN 까지 가고 STATUS·PLAN·FINDINGS 를 다 쓴 뒤 **커밋하지 못한 채** 끝났다 — 58·59·60·61·63 에
> 이어 **여섯 번째**다. 65바퀴가 같은 트리에서 전 층 CI(GREEN · 880)를 다시 돌려 그대로 올렸다 (`0018ce9`).
> payload 스크립트가 지난 CI 결과(05:32)보다 **뒤에**(05:33) 고쳐져 있어서 그 CI 를 믿지 않고 다시 돌렸다.

**이번 바퀴는 둘을 했다.** ① 63바퀴가 CI GREEN 까지 확인하고 **커밋하지 못한** 데모 리셋 작업을 같은 트리에서
전 층 CI 를 다시 돌려(GREEN · 관통 880) 그대로 올렸다 (`f15c650`) — 58·59·60·61·63 **다섯 바퀴**다 (아래 「밟은 함정」).
② `docs/PLAN.md` **P5 둘째 행의 둘째 조각 — 보안 캡처 증거의 코드 쪽 절반**을 만들었다. 관통 7단계 초록 · 고장 0 이라
④3 의 ② 로 갔고, 그 행에서 루프가 계정 없이 할 수 있는 조각이 이것이었다. 그 행의 나머지(Vercel 연결 · 첫 리셋 ·
네트워크 탭 캡처 · fresh install)는 🙋 다.

🔴 **잰 것 — P1 을 「주장」이 아니라 관통 산출물에서 나온 표로 읽을 수 있다. 그리고 그 표의 한 줄이 거짓이었다.**

| | 전 | 후 |
|---|---|---|
| P1 을 사람이 읽는 문서 | **0** (관통 로그와 `.ci/*.json` 에만 · 관통마다 지워진다) | `docs/evidence/2026-09-06-p1-payload/p1-payload.md` + 관통 산출물 둘 복사 |
| 「어떤 필드가 나갔나」 | 스키마를 읽어야 안다 | payload 단계가 **나간 body 3건을 산출물에 그대로 남긴다** (`sent` · `finish(extra)`) — 문서 §2 가 그것을 읽는다 |
| 나가는 body 4종의 **없는 칸** | 어디에도 표가 없었다 | 문서 §1 표 — 엔드포인트 · 나가는 것 · **없는 것** · 누가 잰다 (payload ①②③⑤ · sync 「P1」) |
| 「env 값이 payload 에 0건」 검사 | **잰 값 0개** — 픽스처 `.env.example` 은 값이 0건이어야 해서(`fixtures.mjs` ③) 늘 빈 배열이었다 | 관통이 임시 저장소에 값이 든 `.env` 를 심는다(`PLANTED_ENV` 2개) · **0개면 FAIL** · detail 「잰 값 2개」 |
| 스캐너가 `.env` 를 열어 **키만** 꺼냈다는 증거 | 없음 (`.env.example` 의 키가 나갔다는 것만) | `.env` 에만 있는 `SENTRY_DSN` 이 body 에 있다 — env 키 14 → 15 |
| Memory · transcript 를 읽는 플러그인 코드 | 셈 안 함 | `transcript` · `.claude/projects` · `memory` 를 `grep -rni` → **0곳** (문서 §6) |
| payload 단계 검사 | 10 | 10 (둘을 갈아 끼웠다 — 수는 같다 · 재는 것이 달라졌다) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough · docs → GREEN (`0018ce9`) |

🔴 **「정의만 있고 아무 일도 안 하는 검사」를 관통 안에서 찾았다 (④2-B).** 「env 값이 payload 에 0건 (P1)」은 63바퀴 내내
초록이었는데 **잰 값이 0개**였다. 두 게이트가 서로를 무효화한 것이다 — fixtures.mjs ③ 은 픽스처에 값을 금지하고(옳다),
payload 검사는 그 픽스처의 값을 찾는다(그래서 늘 없다). 눈으로는 절대 안 잡힌다 — 로그에 `OK env 값이 payload 에 0건` 이
찍히니까. 고친 방향은 픽스처를 건드리지 않고 **관통이 임시 사본에 값을 심는 것**이다. 같은 구멍이 scan 단계에도 있다 —
FINDINGS 125 로 남겼다(다음 바퀴).

🔴 **증거 문서는 못 말하는 것을 §7 에 적었다.** 배포에서 찍은 것이 아니다(소켓은 진짜 · 서버는 관통의 짧은 것 · DB 는 PGlite) ·
scan 단계의 env 검사는 아직 0개 · `body` 한 줄에 사람이 코드를 붙여 넣으면 계약은 못 막는다(2,000자 상한만 · Skill 의 규칙이
막는다). 셋째는 KNOWN_LIMITATIONS 후보다 — P6 둘째 행에서.

**눈으로 읽었다** — `docs/evidence/2026-09-06-p1-payload/walkthrough-payload.json` 의 `sent` 3건: batch-draft 의 `items[0]`
은 id·title·body(한 줄)·scope·priority·source_refs(경로·줄)·tags·confidence·type·data 이고 `scan_summary.excluded` 가
`.env (키 이름만 읽었다 — 값은 안 읽는다)` 라고 스스로 말한다. progress 는 경로·줄만, proposals 는 근거 경로·줄만.
심은 값 두 개(`sk_live_PLANTED…` · `https://PLANTED…`)는 세 body 어디에도 없다.

**그 바퀴가 다음으로 지목한 것 = FINDINGS 125** → 65바퀴가 닫았다 (`8d29737`).

🔴 **125 는 FINDINGS 이지만 PLAN 을 앞지르는 것이 아니다** — 주인이 **PLAN P5 둘째 행**(지금 열려 있는 맨 위 행 중 루프가
할 수 있는 것)이고, 이 바퀴가 그 행에서 만든 증거 문서의 §4 가 「아직 잰 값 0개」라고 적어 둔 그 줄이다. ④3 ②의
「그 행을 할 때 같이 닫는다」에 해당한다.

> **125 를 닫는 법** — `plugin/contextops/scripts/walkthrough-scan.ts` 가 픽스처를 임시 폴더에 복사하고 값이 든 `.env` 를
> 심은 뒤 `scan --dir <임시>` 로 돌린다. 심은 값이 `scan.json` 에 없고 키는 있는지 — **잰 값이 0개면 FAIL**.
> payload 단계(`apps/web/scripts/walkthrough-payload.ts` 의 `PLANTED_ENV`)가 한 것과 같다 — 심는 값 표를 둘이 따로 들면
> 갈라지니 하나로 올릴지 그때 판단해라(둘째 사용자가 생겼다). 끝나면 `p1-payload.md` §4·§7 의 ⚠ 줄을 지운다.
> 그 다음은 P5 둘째 행의 나머지가 전부 🙋 라 **P6 둘째 행**(제출서 · README · KNOWN_LIMITATIONS) 중 README 다 —
> FINDINGS 122 의 🙋 URL 이 없어도 본문은 쓸 수 있고, KNOWN_LIMITATIONS 에는 위 §7 셋째 줄이 들어간다.

- PLAN 의 `- [ ]` 중 **위의 셋은 사람이 막고 있다** (🙋 Supabase · 🙋 Anthropic 키 · GATE 3).
- 대장의 대기(122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 112 · 111 · 108 · 69 · 25 · 33 …)는
  **PLAN 을 막지 않는다** — 적어 두고, 그 항목의 주인이 될 PLAN 행을 할 때 같이 닫는다 (④3 ②).

---

### 지난 바퀴 (63) — 데모 리셋 · GET /cron/demo-reset · 시드를 제품 코드로 (PLAN P5 둘째 행 ① · `f15c650`)


**63바퀴는 `docs/PLAN.md` P5 둘째 행의 첫 조각 — Cron 이 부르는 데모 리셋 문**을 만들었다
(FINDINGS 120 닫음). 관통은 7단계 866 검사 초록 · 고장 0 이라 ④3 의 ② 로 갔다 — PLAN 의 `- [ ]`
중 위의 셋은 사람이 막고 있고(🙋 Supabase · 🙋 Anthropic 키 · GATE 3), P5 둘째 행에서 루프가
계정 없이 할 수 있는 조각이 이것이었다. 그 행의 나머지(Vercel 연결 · 보안 캡처 · fresh install)는
🙋 다.

🔴 **잰 것 — 데모를 배포 DB 에 심는 문이 생겼고, 자물쇠 뒤에 있으며, 두 번 돌려도 하나다.**

| | 전 | 후 |
|---|---|---|
| 데모를 심는 길 | `scripts/demo-server.ts`(PGlite · 개발 기계) 하나 | + **`GET /api/v1/cron/demo-reset`** — 배포 DB 에 **지우고 다시 심는다** (`lib/demo/reset.ts`) |
| 시드가 사는 곳 | `scripts/seed.ts` · `scripts/demo-seed.ts` (`test/helpers/db` 의존 — 120 의 「유일한 걸림돌」) | `src/lib/demo/seed.ts` · `seed-demo.ts` — `src/` 에서 `test/`·`scripts/` import **0** (시험이 센다) |
| `req/params/dataOf` 의 정본 | `test/helpers/db.ts` | `src/lib/demo/inproc.ts` — 시험 도우미는 다시 내보내기만 |
| 세션 서명 | `signGuestJwt` (게스트 한 곳) | `signSessionJwt` — 둘째 사용자(시드)가 생겨 올렸다 · 없는 claim 은 안 적는다 |
| 자물쇠 | — | `CRON_SECRET` (`lib/api/cron.ts`) — 없음·틀림·세션 토큰·기기 토큰 전부 **401** · `timingSafeEqual` |
| 팀을 통째로 지우는 자리 | **0곳** (FK cascade 없음 · slug 전역 유일) | `lib/demo/teardown.ts` — `PROJECT_SCOPED` 11표 순서 · 시험이 「`project_id` 가진 표가 전부 목록에 있나」를 스키마와 대조 |
| 심다가 던지면 | — | 다시 지운다 → `/demo/session` 404 (`demo-reset-rollback.test.ts` — 팀이 생긴 **뒤에** 던지게 갈아 끼워 잼) |
| Cron | `vercel.json` 없음 | `apps/web/vercel.json` — health `0 */6 * * *` · demo-reset `0 18 * * *`(= 03:00 KST · 시험이 `DEMO_TENANT.resetAt` + `resetUtcOffsetHours` 로 셈) · 경로마다 `route.ts` 실존 |
| 픽스처가 배포 함수에 | — | `next.config.ts` `outputFileTracingIncludes` + `fixturesRoot()` 가 cwd 에서 위로 찾는다 (못 찾으면 **그 줄을 가리키며 던진다**) |
| 웹 시험 | 551 | **565** (CI test 층 실측 · `demo-reset` +13 · `demo-reset-rollback` +1) |
| 리셋 한 번 (PGlite) | — | 첫 심기 292ms · 리셋 243ms · 팀 1 · 기기 12 · 사람 7 — **두 번 뒤에도 같다** |
| CI | — | principles OK · typecheck · test · build · walkthrough · docs → GREEN (`f15c650`) |

🔴 **GET 으로 상태를 바꾸는 유일한 문이다.** Vercel Cron 은 GET 으로만 부른다. 이 저장소의
게스트 읽기 전용은 「GET 은 안 바꾼다」(`route.ts` 의 `SAFE_METHODS`)에 기대므로, 예외를
`/cron/` 밑에 격리하고 주체(`ctx.actor()`)가 아니라 secret 으로 잠갔다 — 사람·기기·게스트 토큰은
전부 401 이다. `/cron/` 밖에 이런 문을 더 만들면 그 근거가 사라진다 (route 주석에 적었다).

🔴 **지우고 심는다.** 심기만 하면 둘째 날 slug 가 겹쳐 400 이고, 「있으면 건너뛰기」로 두면
심사위원이 어제 만진 흔적이 남는다. 지우기와 심기는 한 트랜잭션이 아니다(심기는 라우트 수십 번 ·
각자 트랜잭션) — 그래서 「실패하면 지운다」가 대신 서 있다. **반쯤 심긴 데모보다 없는 데모가 낫다** —
없으면 `/demo/session` 이 404 로 말하고, 반쯤이면 링크는 열리는데 화면이 빈다.

🔴 **시드가 `app/` 의 라우트를 import 한다 — 방향이 거꾸로로 보이지만 그게 맞다.** 시드는 화면·
플러그인과 같은 **라우트의 클라이언트**다. 핸들러 안의 로직을 베껴 DB 에 넣으면 심어진 데모가
제품이 만드는 것과 다른 모양이 되고 화면에서는 안 보인다. 단 `lib/api/*` 가 시드를 import 하는
날 순환이 된다 — 부르는 쪽은 `cron/demo-reset` 라우트와 도구뿐이어야 한다 (seed.ts 머리).

🔴 **`teardown.ts` 는 표다.** `project_id` 를 가진 표 11개를 FK 자식부터 늘어놓고 `for` 로 지운다.
새 표를 더한 사람이 여기를 잊으면 리셋이 FK 위반으로 500 이 되는데, 그건 배포에서야 보인다 —
그래서 시험이 스키마의 표 목록과 이 목록을 **양방향**으로 대조한다 (「표에 한 줄」 · CLAUDE.md).
`project_id` 가 없는 자식 셋(pack_files · context_item_revisions · source_document_versions)과
순환 FK 둘(`official_version_id` · `current_version_id`)은 본문이 먼저 끊는다.

⚠ **배포에서 돌린 것이 아니다.** PGlite 위의 같은 라우트다. 못 잰 것 셋 — ① `/var/task` 에서
`fixturesRoot()` 가 실제로 `fixtures/` 를 찾나(`outputFileTracingRoot` 가 모노레포 뿌리라 상대
경로가 보존된다고 **믿고** 있다) ② Supabase 에서 리셋이 60초 안에 끝나나(라우트 ~70번 · PGlite 0.3초)
③ Vercel 의 Root Directory 가 `apps/web` 이어야 `vercel.json` 이 읽힌다. 셋 다 🙋 첫 리셋에서 본다.

**눈으로 읽었다** — `docs/evidence/2026-09-06-demo-reset/reset.txt` (`scripts/dump-demo-reset.ts`):
secret 없음 → 401 「CRON_SECRET 가 없다 — Cron 문이 잠겨 있다」 · 틀림 → 401 · 맞음 → 200
`{existed:false, official_version:"1.1.0", items:15, members:5, devices:12, reports:12, progress:6, proposals:4}`
· `/demo/session` 201 · 둘째 → `existed:true` 같은 수 · DB 팀 1 · 기기 12 · 사람 7 그대로.
응답에 `@`·`eyJ` 0 (이메일·토큰 없음 — 시험도 센다).




> **그 바퀴가 다음으로 지목한 것 = `docs/PLAN.md` **P5 둘째 행**의 남은 조각 중 루프가 계정 없이 할 수 있는 것 —
> **보안 캡처 증거**. 관통 payload 단계가 매번 남기는 `.ci/walkthrough-payload.json`(업로드
> payload 10검사 · 코드 본문 0건)과 scan 단계의 `.ci/walkthrough-scan.json` 을 `docs/evidence/` 로
> 정리해 「서버는 코드 본문·secret·기억·transcript 를 받지 않는다」(P1 · 심사 첫 질문)를 **사람이 읽는
> 문서**로 만든다 — 어떤 필드가 나갔고 어떤 필드가 **없는지**를 표로. ⚠ 새 코드를 만들 일이 아니다 —
> 관통이 이미 재는 것을 **증거로 굳히는** 일이다. 캡처(네트워크 탭)는 🙋 배포 뒤.
> 그것도 끝나면 P5 둘째 행의 나머지는 전부 🙋 라, 다음은 **P6 둘째 행**(제출서 · README ·
> KNOWN_LIMITATIONS) 중 README 다 — FINDINGS 122 의 🙋 URL 이 없어도 본문은 쓸 수 있다.
> ⚠ 만들기 전에 `docs/SPEC.md` §11 · §3.1 · §16 · §17 을 읽고 **코드에서 그 이름을 찾아라.**

- PLAN 의 `- [ ]` 중 **위의 셋은 사람이 막고 있다** (🙋 Supabase · 🙋 Anthropic 키 · GATE 3).
- 대장의 대기(122 · 121 · 119 · 118 · 117 · 116 · 115 · 114 · 112 · 111 · 108 · 69 · 25 · 33 …)는
  **PLAN 을 막지 않는다** — 적어 두고, 그 항목의 주인이 될 PLAN 행을 할 때 같이 닫는다 (④3 ②).

> ⚠ 63바퀴는 CI GREEN 까지 가고 STATUS·PLAN·FINDINGS 를 다 쓴 뒤 **커밋하지 못한 채** 끝났다 —
> 58·59·60·61 에 이어 **다섯 번째**다. 64바퀴가 같은 트리에서 전 층 CI(GREEN · 880)를 다시 돌려 그대로 올렸다
> (`f15c650`). 증거 폴더는 UTC 날짜(`2026-09-05-demo-reset`)로 남아 있었다 — 63 의 「밟은 함정」은 「손으로 옮겼다」고
> 적었지만 옮겨져 있지 않았다. 64 가 문서가 가리키는 `2026-09-06-demo-reset` 으로 옮겼다.


---


---


### 지난 바퀴 (62) — 터미널 재생 · 랜딩 C-3 (PLAN P5 첫 행 ③ · 행 닫음 · `8c3e8c5` `5b5b98b`)

**62바퀴는 둘을 했다.** ① 61바퀴가 CI 도중에 끊긴 채 **커밋하지 못한** 거울 문서 작업을 같은
트리에서 전 층 CI 를 다시 돌려(GREEN · 843) 그대로 올렸다 (`2a1db06`) — **58·59·60·61 네 바퀴
연속**이다 (아래 「밟은 함정」). ② `docs/PLAN.md` **P5 첫 행의 마지막 조각 — 터미널 재생**을
만들었다. **그 행이 닫혔다** (FINDINGS 123 닫음). 남은 `- [ ]` 는 P5 둘째 행부터다.

🔴 **잰 것 — 랜딩에 터미널이 섰고, 그 터미널의 모든 줄은 실제 도구가 찍은 것이다.**

| | 전 | 후 |
|---|---|---|
| `fixtures/replay/` | 없음 | `sync.json` **17줄** — 관통 sync 단계 ⑥ 이 **배포되는 번들**을 진짜 소켓으로 돌려 남긴 stdout · 손으로 쓴 줄 **0** |
| 이야기 | — | 훅 알림(적용 v0.9.0 · 공식 v1.0.0) → `> /contextops:sync`(파일 8개 적용 · backup · applied 보고) → `$ … progress --milestone PL-M1 …` → `보고했다 — PL-M1 · criterion_done · 근거 1건 · v1.0.0` |
| 녹화가 낡으면 | — | 관통이 **매번 다시 녹화해 픽스처와 대조**한다 (`t_ms` 제외 · backup 폴더의 시각만 가림). 다르면 FAIL + 「`.ci/walkthrough-replay.json` 을 복사해라」 |
| `<TerminalReplay>` | 0곳 | `components/terminal-replay.tsx` — 명령 줄(`> `·`$ `)만 타이핑 · 서버 렌더는 **전부 드러남**(JS 없이 글로 읽힘) · reduced-motion 이면 재생 안 함 · 끝나면 7초 뒤 처음부터 · **버튼 0** |
| 오른쪽 패널 | — | Roadmap 미니 — **왼쪽 줄을 읽어서** 바뀐다 (`panelState`): 근거 **0 / 3 → 1 / 3** · 마일스톤은 씨앗의 PL-M1 과 글자 그대로 (시험이 `paylabDrafts()` 와 대조) |
| 계약 | — | `ReplayFrames` (`packages/schema/src/replay.ts`) — 랜딩이 모듈 로드 때 한 번 판다 · 관통 녹화기도 같은 계약으로 잰다 |
| 관통 sync 검사 | 16 | **24** (녹화 준비 · P7 완료 기준 문장이 Pack 의 CLAUDE.md 에 있음 · 근거 경로 실존 · 세 명령 exit 0 · progress 가 서버에 닿음 · 계약 · 픽스처 대조) |
| 웹 시험 | 536 | **551** (`web-terminal-replay` +15) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough · docs → GREEN |

🔴 **녹화는 관통이 만든다 — SPEC 의 「수동 작성」을 지웠다.** §10.4 는 「`script` 명령 또는 수동
작성」이었는데, 손으로 쓴 대사는 CLI 가 문장을 바꾼 날부터 거짓말이 되고 아무도 모른다.
관통 sync 단계에 ⑥ 을 더해 진짜 번들의 stdout 을 `.ci/walkthrough-replay.json` 으로 남기고
픽스처와 대조한다. ★ 첫 실행이 「픽스처가 없다」로 **FAIL 한 것**이 이 게이트가 실제로 잰다는
증거다 — 복사한 뒤에야 초록이 됐다. 「작업」 구간(sync 와 progress 사이)은 녹화에 없다 —
지어 넣지 않았고 화면의 출처 문장이 「사이의 작업은 생략했다」고 말한다.

🔴 **패널에 별도 타임라인이 없다.** 보고 줄이 드러나는 순간 **바로 앞 명령의 `--criterion` 문장**이
✓ 가 된다 (CLI 는 보고 줄에 문장을 다시 찍지 않는다). 두 타임라인을 손으로 맞추면 CLI 문장이
바뀐 날 한쪽만 움직인다. `done_when` 에 글자 그대로 있는 문장만 센다 (P7).

🔴 **「BS-M2 1/3 → 2/3」은 목업이다 — 실제는 paylab PL-M1 0/3 → 1/3.** 보고 하나가 실제로
그만큼만 바꾼다. 데모의 2/3 을 흉내 내려면 보고를 지어내야 했다. DESIGN_BRIEF 에 그렇게 적었다.

🔴 **재생 속도는 표시용이다.** 실제 녹화는 **329ms** 에 끝난다(한 명령의 stdout 은 같은 시각).
`REPLAY_PACE` 가 줄 사이를 140ms~1.2s 로 누르고 명령은 글자당 22ms 로 친다 — 순서·내용은 안 건드린다.

🔴 **`packages/schema` 에 파일 하나를 더하니 CI 가 RED.** 플러그인 번들(`bin/contextops-cli.mjs`)이
schema 를 인라인해서 `bundle.test.ts` 가 「소스에서 방금 만든 번들과 byte 가 같다」에서 빨개졌다.
`pnpm --filter @contextops/plugin build` → GREEN. 「밟은 함정」에 이미 두 번 적혀 있던 것이다.

⚠ **`/sync` 상단에는 두지 않았다** (SPEC 문장을 코드에 맞췄다) — 그 화면은 실제 기기 표가 서는
자리라 녹화가 실데이터처럼 읽힌다. ⚠ **스텝 썸네일(C-2)은 그대로 없다** — production 캡처가
생긴 뒤(P5 둘째 행)이고, 캡처 없이 목업 그림을 넣지 않는다.

**눈으로 읽었다** — `docs/evidence/2026-09-06-replay/landing.txt` (`scripts/dump-landing.tsx`):
「어떻게 동작하나요」 다음에 터미널 17줄이 순서대로 서고 그 아래 패널이 `근거 1 / 3` · ✓○○ ·
`보고 1건 · v1.0.0 기준` 이다. accent 1 · `<button>` 0 · 「실시간」·「영상」 0.
⚠ 브라우저 캡처는 없다 — **타이핑이 실제로 움직이는가**는 아래 「눈 판정 대기」.

**그 바퀴가 다음으로 지목한 것**: PLAN P5 둘째 행 중 루프가 계정 없이 할 수 있는 조각 —
FINDINGS 120(데모 시드를 제품 코드로 · Cron 뒤에)을 권했다. 63바퀴가 그것을 했다.

### 지난 바퀴 (61) — AGENTS/cursor 타깃 · 거울 문서 (PLAN P5 첫 행 ② · `2a1db06`)

> ⚠ 61바퀴는 CI 를 **walkthrough 도중**(`.ci/logs/walkthrough.txt` 가 compile 단계에서 끊김)에
> 끝났고 STATUS·FINDINGS 도 못 적었다 — 58·59·60 에 이어 **네 바퀴 연속** 미커밋이다.
> 62바퀴가 같은 트리에서 전 층 CI(GREEN · 검사 843)를 다시 돌려 그대로 올렸고 FINDINGS 7 을
> 닫았다. 이 절은 62바퀴가 그 diff 를 읽고 적은 것이다.

**61바퀴는 PLAN P5 첫 행의 둘째 조각 — `AGENTS.md` · `.cursor/rules/contextops.mdc` 를 만들었다.**
`PACK_TARGETS` 3종 중 컴파일러가 내는 것이 `claude` 하나였고 enum 값 둘이 아무것도 안 바꿨다
(FINDINGS 7 · 2-B 의 그 종류).

🔴 **잰 것 — 타깃 3종이 전부 파일을 낸다.**

| | 전 | 후 |
|---|---|---|
| `DOCS` 표 | 7 문서 (전부 claude 타깃) | **9** — 거울 문서 `agents`·`cursor` (`compose`) |
| 거울이 항목을 얻는 길 | — | partition 표를 **읽기만** — `collect` 가 원본 문서들의 블록을 그대로 모은다 (같은 태그 · P7 그대로) |
| 거울에 항목을 직접 놓기 | — | **타입이 막는다** (`place()` 는 `PlaceableDocId` 만) |
| scoped 줄 | `- [must] … · 강제: …` | 끝에 `· 도메인: ledger` / `· 경로: infra/**` (`SCOPE_INLINE_LABEL`) — 원본 파일에서도 같은 줄 |
| 두 거울의 본문 | — | 머리말만 다르고 **byte 로 같다** (.mdc 는 `alwaysApply: true` frontmatter) |
| 분량 규칙 | — | 거울은 대상이 아니다 — `AGENTS-2.md` 는 sync allowlist 밖 |
| 템플릿 | 1.2 | **1.3** · golden 3종 갱신 (거울 파일 +2 · scoped 줄 끝 라벨) |
| 관통 sync 가 놓는 파일 | 6 | **8** — allowlist 는 두 경로를 이미 알고 있었다 |
| 컴파일러 시험 | 165 | **181** |

🔴 **partition 에 줄을 더하지 않은 이유** — 그러면 ItemType 을 하나 더할 때 「CLAUDE.md 에도,
AGENTS.md 에도」를 사람이 기억해야 하고 다음 사람은 반드시 하나를 빠뜨린다. 거울은 표를 읽기만
하므로 ItemType 이 늘어도 거울은 안 고친다. 새 타깃(`.windsurf/…`)을 더하는 절차 넷은
`templates/index.ts` 의 `MirrorDocId` 주석에 있다.

🔴 **scoped 줄이 제 범위를 말하게 됐다** — 거울은 domain-*·scoped-* 파일의 규칙을 **한 절**에
모으므로 파일 이름·frontmatter 가 나르던 범위가 거기서 사라진다. 줄이 스스로 말하지 않으면 경로
규칙이 전역 규칙처럼 읽힌다. 렌더가 하나라 원본 파일에서도 같은 줄이다.

**그 바퀴가 다음으로 지목한 것**: 적지 못했다 (STATUS 를 못 썼다). 남은 조각은 터미널 재생
하나였고 62바퀴가 했다.


### 지난 바퀴 (60) — Pack zip · GET …/packs/{semver}/zip (PLAN P5 첫 행 ① · `8faad6a`)


**60바퀴는 둘을 했다.** ① 59바퀴가 CI GREEN 까지 확인하고 **커밋하지 못한** 랜딩 v1 을
같은 트리에서 CI 를 다시 돌려(GREEN) 그대로 올렸다 (`8d30558`) — **58바퀴에 이어 두 바퀴
연속**이다 (아래 「밟은 함정」). ② `docs/PLAN.md` **P5 첫 행의 한 조각 — Pack zip** 을 만들었다.
셋 중 이걸 고른 이유: 절삭 순서에서 제일 늦게 잘리고(5번), 화면 9 의 `manual`(zip 수동 적용)이
가리키는 실체가 **없는 채로 화면에 서 있었다** (FINDINGS 69 · 105-B).

🔴 **잰 것 — Pack 을 손으로 받는 길이 생겼고, 그 zip 은 플러그인이 받는 것과 같다.**

| | 전 | 후 |
|---|---|---|
| `GET …/packs/{semver}/zip` | **0곳** (SPEC §5 에만) | 라우트 · `application/zip` · ETag=manifest_hash · 불변 캐시 · 304 |
| zip 을 만드는 코드 | — | `lib/api/zip.ts` — 압축 없음(store) · CRC-32 · **라이브러리 0** |
| zip 안의 `.contextops/manifest.json` | — | 플러그인 `sync` 가 쓰는 자리·모양 **글자 그대로** (Zod 순서) |
| 화면 7 상단 우측 | 「아직 없다」 주석 | [Pack 다운로드 (.zip)] · 「이 Pack을 받은 기기 N / M」 |
| 「받았다」의 기준 | — | `countReceived` — manifest_hash 하나 (화면 9 와 같은 문·같은 표) |
| 관통 publish 검사 | 28 | **31** (되읽기 · sha256/CRC · **두 번 받아 byte 같음**) |
| 독립 도구로 열었다 | — | `unzip -t` → 7 files OK (`docs/evidence/2026-09-06-zip/zip.txt`) |
| 웹 시험 | 525 | **536** (`api-pack-zip` +11) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough · docs → GREEN |

🔴 **라이브러리를 안 쓰고 압축도 안 한다 — P4 의 연장이다.** 필요한 것은 작은 Markdown
몇십 개를 담는 것뿐이고, deflate 는 라이브러리 버전이 바뀌면 바이트가 바뀔 수 있다.
store 는 그럴 자리가 없다. 항목 시각은 **Manifest 의 `generated_at`** 이다 — `now` 를 적으면
같은 버전을 두 번 받을 때 바이트가 달라진다. 그래서 ETag 를 `manifest_hash` 로 둘 수 있고
`{semver}` 와 같은 1년 캐시다. 파일 이름은 **서버가** 정한다 (`content-disposition` ·
`<slug>-v<semver>.zip`) — 화면이 지으면 화면마다 다른 이름으로 저장된다.

🔴 **시험이 잡은 것 — DB 가 Manifest 의 키 순서를 바꾼다.** jsonb 는 키를 제 순서(길이·알파벳)로
다시 늘어놓는다. 그 객체를 그대로 `JSON.stringify` 하니 zip 안 manifest.json 이 플러그인이
쓰는 것(Zod 로 판 것)과 **글자가 달랐다** — 같은 버전인데 zip 으로 받은 기기와 플러그인으로
받은 기기의 manifest.json 이 갈릴 뻔했다. `manifestJsonText()` 가 계약으로 **한 번 되판 뒤**
적는다. ★ 「플러그인이 쓰는 것과 글자 그대로 같다」를 시험이 재지 않았으면 초록이었다.

🔴 **SPEC 과 코드를 맞췄다 (§5 zip 줄).** SPEC 은 「member · 파일 ≤ 20개」였다. 기기 토큰을
막지 않는다 — 기기는 이미 파일을 하나씩 다 받을 수 있어서 막아도 지키는 것이 없다.
20 을 따로 세지 않는다 — Manifest 계약(`files.max`)이 이미 상한이고, 그 수에서 store 는
무겁지 않다. 없는 검사를 코드에 두면 「정의만 있고 아무 일도 안 하는」 그 종류가 된다.

🔴 **`<a href>` 로 걸지 않았다.** 세션 토큰은 `Authorization` 머리로만 나간다 — 링크로 걸면
브라우저가 머리 없이 열어서 **401 페이지를 zip 이름으로 저장**한다. 문은 `apiBlob` 하나
(`lib/web/api.ts`)이고 화면은 object URL 로 저장을 시킨다.

⚠ **`manual` 을 보고하는 쪽은 아직 없다.** 문은 생겼지만 플러그인 `status` 가 「우리
`cache/<semver>/` 가 없는데 manifest.json 과 파일이 다 맞는다」를 `manual` 로 판정하는
자리는 다음 몫이다 — FINDINGS 69 에 그 절차를 적어 두고 대기로 둔다 (주인은 플러그인 바퀴).

**눈으로 읽었다** — `docs/evidence/2026-09-06-zip/zip.txt`: 관통이 남긴 zip 을 우리 리더가
아니라 Info-ZIP `unzip -l`·`-t` 로 열었다. 7 항목 · 시각이 전부 Manifest 의 `generated_at`(UTC).
⚠ 브라우저에서 버튼을 눌러 저장 대화상자까지 본 적은 없다 — 아래 「눈 판정 대기」.

**그 바퀴가 다음으로 지목한 것**: PLAN P5 첫 행의 남은 두 조각(AGENTS/cursor · 터미널 재생) 중 하나.
61바퀴가 AGENTS/cursor 를, 62바퀴가 터미널 재생을 했다 — 그 행이 닫혔다.

### 지난 바퀴 (59) — 랜딩 v1 · 화면 1 (PLAN P4 둘째 행 ③ · `8d30558`)

> ⚠ 59바퀴도 CI GREEN 까지 확인하고 **커밋 전에 끝났다** — 58바퀴와 같은 일이 **두 바퀴
> 연속**이다. 60바퀴가 같은 트리에서 CI 를 다시 돌려(GREEN) 그대로 올렸다. 그래서 해시가
> 60바퀴의 것이다. 두 번째라 규칙으로 올렸다 — 아래 「밟은 함정」 첫 줄.

**59바퀴는 둘을 했다.** ① 58바퀴가 CI GREEN 까지 확인하고 **커밋하지 못한** 게스트 데모
작업을 같은 트리에서 CI 를 다시 돌려(GREEN) 그대로 올렸다 (`7510e07`). ② `docs/PLAN.md`
**P4 둘째 행의 마지막 조각 — 랜딩 v1** 을 만들었다. 이제 `/` 를 열면 첫 화면이 있고,
[샘플 팀으로 둘러보기] 하나로 `/demo` 에 들어간다.

🔴 **잰 것 — 심사위원이 `/` 를 열면 볼 것이 있다.**

| | 전 | 후 |
|---|---|---|
| `/` | 자리 표시 (제목 + `/api/v1/health` 안내) | 화면 1 — 헤드라인 · Before/After · 왜 git 인가 3+1 · 3단계 · 신뢰 경계 표 · 설치 4줄 · 푸터 |
| accent | — | **하나** (`btn-primary` 1개 · `/demo`) |
| `<button>` · `href="#"` | — | **0 · 0** (누르면 아무 일도 안 하는 것이 없다) |
| 세션을 읽는 코드 | — | **0줄** (`'use client'` 0 · `readSession` 0 — 시험이 주석을 빼고 센다) |
| Before/After 의 근거 | 목업(북스택) | **paylab** — 문서 §3.1 vs `retry.ts:11` · After = 데모 v1.1.0 의 `item_policy_retry` 그 줄 |
| 로그인 화면 「심사위원이신가요?」 | 「준비 중」 | `/demo` 링크 |
| 웹 시험 | 58바퀴 기록 505 | **525** (CI test 층 실측 · 24 파일 · `web-landing` +27) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough · docs → GREEN |

🔴 **After 의 답은 씨앗(v1.0.0)이 아니라 승인된 제안(v1.1.0)의 문장이다.** 처음엔 씨앗
`paylabDrafts()` 의 `data.rule` 을 적고 시험까지 초록이었다. 그런데 `demo-seed.ts` 를 읽으니
v1.1.0 은 **바로 그 항목**을 제안이 고친 판이다 — 게스트가 `/demo` 에서 여는 판의 문장은
「0.5s·1s·2s·4s·8s · 타임아웃과 5xx 만」이지 씨앗의 문장이 아니다. 첫 화면이 앱과 다른
문장을 말하는 걸 시험이 초록으로 통과시킨 셈이라, `DEMO_PROPOSALS` 를 내보내 **published
행의 `data.rule` 과 글자 그대로** 대조하게 바꿨다. ★ 「시험이 초록」이 「맞다」가 아닌
사례가 이번 바퀴에도 하나 나왔다 — 정본이 둘(씨앗·제안)이면 **어느 쪽이 화면에 서는지**를 먼저 물어라.

🔴 **없는 명령을 적지 않았다.** DESIGN_BRIEF 는 `npx contextops setup` 한 줄을 적지만
npm 에 그런 패키지가 없다. 설치 줄은 SPEC §8.3 과 `docs/evidence/2026-09-03-plugin` 이 실제로
찍은 네 줄이고, 시험이 `/contextops:<x>` 마다 `plugin/contextops/skills/<x>/SKILL.md` 와
`bin/contextops-cli.mjs` 의 존재를 센다. `<marketplace>` 는 `setup` 이 찍는 안내와 같은 빈칸이다 —
공개 URL 이 생기면 채운다 (FINDINGS 122).

**눈으로 읽었다** — `docs/evidence/2026-09-06-landing/landing.txt` (`scripts/dump-landing.tsx` ·
Node 가 `.css` 를 몰라 loader 훅으로 빈 모듈을 끼운다). 덤프가 잡은 것: 머리글과 히어로에
[로그인] 이 **둘** 서 있었다 → 히어로는 [샘플 팀으로 둘러보기] 하나로. 설치 블록이 한 줄로
뭉쳐 보였다 → `<pre>` 안에 진짜 개행.
⚠ **브라우저 캡처는 없다.** 「스크롤 없이 A·B·C 가 보이나」·「390px 에서 한 열로 접히나」는
아래 「눈 판정 대기」다.

🔴 **재다가 둘 나왔다** — **123** 스텝 썸네일·터미널 재생(§10.4)이 없다(주인 P5 첫 행) ·
**122** 푸터의 GitHub·Known limitations 링크가 없다(공개 URL 🙋).
121(게스트 403 문구)은 이 행의 몫인데 이번 바퀴에 **못 했다** — 다음에 데모를 만지는 바퀴가 닫는다.

**그 바퀴가 다음으로 지목한 것**: PLAN P5 첫 행 — 셋 중 하나. 60바퀴가 그중 **Pack zip** 을 했다.

### 지난 바퀴 (58) — 게스트 데모 테넌트 · 읽기 전용 게스트 (PLAN P4 둘째 행 ② · `7510e07`)

> ⚠ 58바퀴는 CI GREEN 까지 확인하고 **커밋 전에 끝났다.** 59바퀴가 같은 트리에서 CI 를 다시
> 돌려(GREEN) 그대로 올렸다 — 그래서 해시가 59바퀴의 것이다. **멈춘 자리에 커밋이 없으면
> 그 작업은 사라진다** (loop/PROMPT.md ⑤) — 이번엔 다음 바퀴가 주웠지만, 그건 운이다.

**58바퀴는 `docs/PLAN.md` **P4 둘째 행의 둘째 조각**을 만들었다 — **게스트 데모 테넌트**다.**
링크 하나(`/demo`)로 들어와서 **읽기만** 하는 길이 처음으로 끝까지 뚫렸다.
그 행의 완료 기준은 GATE 3(시크릿 창에서 링크만으로 3분 체험)이고, 남은 것은
**랜딩 v1** 과 `/demo/ai-once`(P3)다.

🔴 **잰 것 — 심사위원이 링크를 열면 볼 것이 있다.**

| | 전 | 후 |
|---|---|---|
| `/demo` | 없음 (404) | 세션 → `/t/demo/p/paylab-api/context` 로 보낸다 |
| 데모 테넌트를 심는 문 | **0곳** | `fixtures/seed/demo.json` + `scripts/demo-seed.ts` |
| 게스트가 보는 기기 | — | **12대** (applied 9 · outdated 2 · manual 1 — DESIGN_BRIEF §4 그대로) |
| 게스트가 보는 제안 | — | **4장** (published · approved · rejected · submitted) |
| 발행 | — | v1.0.0 → **v1.1.0** (승인된 제안이 실제로 Pack 을 바꿨다 · 해시가 다르다) |
| 주체 종류 | 사람 · 기기 | **사람 · 기기 · 게스트** (`ACTOR_RULES` — 새 축 `writes`) |
| 게스트의 쓰기 | — | **전부 403** (막는 자리는 `route.ts` 하나) |
| 웹 시험 | 488 | **505** |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough · docs → GREEN |

🔴 **57바퀴가 「정하고 시작하라」고 남긴 질문에 답했다 — 읽기 전용은 「등급」이 아니라
「주체 종류」다.** 고른 것은 셋째 길이다: `ROLE_RANK` 에 칸을 파지도 않았고, 데모 팀에
그냥 member 를 만들지도 않았다. **게스트는 데모 팀의 member 이면서 주체 종류가 다르다.**
- ★ 왜 등급이 아닌가 — 등급을 파면 **모든 GET 라우트가 요구 등급을 같이 낮춰야** 한다
  (지금은 읽기도 전부 `'member'` 다). 서른 곳 중 하나만 안 낮추면 게스트가 그 화면에서만
  빈손이 되고, **반대로 하나를 잘못 낮추면 P1 의 방어선 옆에 구멍**이 난다.
- ★ `ACTOR_RULES` 에 축을 하나 더하니 **라우트는 한 줄도 안 고쳤다.**
  막는 자리는 `lib/api/route.ts` 의 `refuseWrite()` 하나이고 기준은 **HTTP 안전 메서드**다.
  ⚠ 그리고 그것이 `ctx.actor()` 안이라 **body 를 읽기 전에** 끊긴다 — 잘못된 body 를
  실어 보내도 400 이 아니라 403 이다 (시험이 그것을 잰다).
- ⚠ 게스트가 부를 쓰기 문이 생기면(§7.4 `POST /demo/ai-once`) **그 라우트 이름 하나만**
  예외로 적어라. 「게스트도 POST 할 수 있다」로 넓히면 이 검사가 사실상 사라진다.

🔴 **세션은 쿠키가 아니라 로그인과 같은 자리다** (SPEC §9 를 코드에 맞춰 고쳤다).
저장 자리를 하나 더 만들면 로그아웃이 한쪽만 지우고 `Authorization` 조립이 두 갈래가 된다.
게스트도 **진짜 세션으로 진짜 라우트**를 지난다 — 다른 것은 못 바꾼다는 것뿐이다.
게스트 토큰은 `sub` 하나로 갈린다(`DEMO_GUEST_SUBJECT`) — Supabase 의 sub 는 uuid 라
진짜 로그인과 절대 안 겹친다. **이메일은 안 실린다** (payload 를 열어 시험이 센다).

🔴 **없으면 404 라고 말한다.** 데모 팀·프로젝트·게스트 행·그 소속이 **넷 다** 있어야
세션이 나간다. 「일단 토큰은 주고 화면에서 빈 목록을 보게」 하면 심사위원이 보는 것은
빈 앱이고 **원인은 화면에 안 적힌다.**

🔴 **덤프가 시험이 못 잡은 것을 잡았다** (`docs/evidence/2026-09-06-demo/demo.txt`).
화면 9 의 「팀원」 칸과 화면 6 의 「작성자」 칸에 **`demo-member-haeun` 같은 sub 가
그대로** 그려지고 있었다. 원인은 `sessionActor()` 가 로그인마다 `users.name` 을
**claims 로 덮기** 때문이다 (진짜 OAuth 도 그렇게 돈다 — 그게 이름의 출처다).
시드가 이름을 행에 심어도 기기 토큰을 발급받는 순간 지워졌다. **이름의 정본은 픽스처이고
그 이름이 claims 를 타고 들어가야 한다** (`memberJwt()`). 시험으로 잠갔다.
⚠ 이 덤프는 앞선 덤프들과 다르다 — 손으로 만든 props 가 아니라 **진짜 게스트 토큰으로
진짜 라우트**를 부른다. 그래서 답하는 물음이 「컴포넌트가 예쁜가」가 아니라
**「링크를 열면 볼 것이 있는가」**다.

**눈으로 읽었다** — `docs/evidence/2026-09-06-demo/demo.txt`
(`apps/web/scripts/dump-demo.tsx`). 요약이 `기기 12 · applied 9 · outdated 2 · manual 1`
이고, outdated 두 대는 **앞 버전(v1.0.0)** 을 보고했고 「4일 전」·「5일 전」이다.
로드맵은 `PL-M1 · done_candidate` 에 [완료 확인 대기] 가 서고 **로드맵 외 1건**이 있다
(`PROGRESS_STATUSES.none` 이 화면에 서는 자리).

🔴 **재다가 셋 나왔다** — **121** 게스트가 member 버튼을 눌러 받은 403 을 화면이
「이 작업은 팀 owner만 할 수 있습니다」로 옮긴다(게스트에겐 거짓말이다) ·
**120** 데모를 **production 에 심는 문이 없다**(지금은 개발용 하네스뿐 · 주인은 P5) ·
**119** 데모의 항목이 15개다(§10.3 은 60을 적는다 — 픽스처를 넓히는 것이 정답이고
데모용으로 지어내면 관통과 갈린다).

**그 바퀴가 다음으로 지목한 것**: PLAN P4 둘째 행의 마지막 조각 — 「랜딩 v1」. 59바퀴가 했다.


### 지난 바퀴 (57) — 웹 화면 9 (Sync) · 이름을 내는 문 (PLAN P4 둘째 행 ① · `8c3e8c5` `aee5de2`)

**이번 바퀴는 `docs/PLAN.md` **P4 둘째 행의 첫 조각**을 만들었다 — 웹 **화면 9(Sync)** 다.**
그 행의 완료 기준은 GATE 3(시크릿 창에서 링크만으로 3분 체험)이라 한 바퀴에 안 끝난다.
56바퀴가 지목한 대로 **표부터** 했다.

🔴 **잰 것 — 발행한 규칙이 각 기기에 실제로 닿았는지가 화면에서 보인다.**

| | 전 | 후 |
|---|---|---|
| `GET …/sync-status` 를 읽는 화면 | **0곳** | `…/sync` (좌측 내비에 탭 한 줄) |
| `SYNC_CHIP` 5종을 그리는 자리 | **0곳** (정의만 있었다) | 화면 9 의 표 · 요약 · 각주 |
| uuid → **이름**을 내는 문 | **0곳** | `lib/api/user.ts` (`{id,name}` 둘뿐 · 이메일 없음) |
| 화면 6 의 「작성자」 칸 | 없었다 | 이름으로 그린다 (FINDINGS **113** 닫음) |
| 「Realtime」 상수 | `ROADMAP_POLL_MS` (화면 8 전용 이름) | `REALTIME_POLL_MS` (**둘째 사용자**) |
| 웹 시험 | 467 | **488** |
| 관통 검사 | 741 | **762** |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough **762** · docs → GREEN |

🔴 **56바퀴가 「정하고 시작하라」고 남긴 질문에 답했다 — 이름을 내는 문을 만들었다.**
화면 6 과 화면 9 가 **같은 문**을 기다리고 있었다 (FINDINGS 113). 그 문의 모양이 이번
바퀴의 결정이다: **나가는 칸은 `{id, name}` 둘뿐이고 이메일은 없다.** ★ 왜 문을 하나로
두나 — 라우트마다 `select` 를 손으로 적으면 어느 라우트가 이메일까지 실어 보내게 되고,
**그 응답은 이미 브라우저에 도착한 뒤라 되돌릴 수 없다.** 여기 한 줄을 더하면 모든 화면이
같이 넓어진다.
⚠ **P5 와 헷갈리지 마라.** 금지된 것은 개인 생산성 점수·순위지 「누가 냈나」·「어느
팀원의 노트북이 낡았나」가 아니다 — 그건 팀이 할 일을 정하는 사실이다. 시험이 표에서
`점수`·`순위`·`횟수`·`기여` 라는 낱말을 센다.

🔴 **`user_id` 를 `user` 로, `author_id` 를 `author` 로 바꿨다 — 더한 게 아니라 대신했다.**
둘 다 실으면 같은 사람이 두 칸에 앉고 화면은 어느 쪽을 읽을지 고르게 된다.
⚠ 제안의 join 은 **left** 다 (`author_id` 가 nullable) — inner 로 두면 주인 없는 제안이
목록에서 **조용히 사라진다**. 기기의 join 은 **inner** 다 (`devices.user_id` 는 NOT NULL
FK) — left 로 두면 있을 수 없는 갈래를 화면이 그려야 한다. 둘이 다른 것이 실수가 아니다.

🔴 **표 셋이 늘었고 시험이 잠근다.** `SYNC_ORDER`(급한 것이 위 — outdated → modified →
보고 없음 → manual → applied) · `SYNC_APPLY`(플러그인 / zip 수동 / 모름) ·
`SYNC_MEANING`(다섯 상태의 **뜻**). `SYNC_MEANING` 은 `chips.tsx` 로 올렸다 — 툴팁과
화면 9 각주가 **같은 표**를 읽는다. 56바퀴까지는 `applied` 하나만 문장이 있었고 나머지
넷은 칩만 보고 뜻을 짐작해야 했다.
⚠ `SYNC_APPLY` 만 표 시험의 ②(「값이 전부 다르다」)를 **안 쓴다** — 방식은 셋뿐이고 상태
다섯이 그 셋에 모인다. 전부 다르라고 강요하면 **없는 방식을 지어내게 된다.** 대신
갈려야 하는 자리(manual ≠ applied · unknown ≠ applied)를 직접 잰다.

🔴 **없는 것을 지어내지 않는다.** 보고가 없는 기기는 버전 `—` · 「아직 보고가 없습니다」 ·
적용 방식 `—` 다. `v0.0.0` 을 채우면 「낡은 버전을 쓰는 기기」로 보이고, 적용 방식에
「플러그인」을 적으면 **화면이 사실이 아닌 것을 말한다** (한 번도 안 왔으니 모른다).

**눈으로 읽었다** — `docs/evidence/2026-09-06-sync/sync.txt` (모양 20여 개 ·
`apps/web/scripts/dump-sync.tsx`). 🔴 **덤프가 재게 해 준 것**: 13대짜리 팀에서 표가
`outdated 2 → 보고 없음 1 → manual 1 → applied 9` 순으로 서고, 상단 요약이
`기기 13 · applied 9 · outdated 2 · manual 1 · 보고 없음 1` 로 DESIGN_BRIEF §4 의 예시와
맞는다. **그리고 덤프에서 새 격차가 보였다** — 아래 118.

🔴 **재다가 셋 나왔다** — **118** 표가 `v1.1.0 · outdated` 라고만 말하고 **공식 버전이
무엇인지**는 어디에도 없다(무엇으로 맞춰야 하는지 모른다 · 화면 8 은 그 줄이 있다) ·
**117** `POST …/ask` 가 0곳이라 질의창을 만들 문이 없다(§14 절삭 **1번**이라 자를 수 있다) ·
**116** `decided_by` 는 아직 uuid 뿐이다(113 과 같은 종류 · 이제 join 한 번이지만 **그릴
자리가 화면에 없다**).

**그 바퀴가 다음으로 지목한 것**: PLAN P4 둘째 행의 남은 조각 — 「게스트 데모 · 랜딩 v1」.
58바퀴가 그중 **게스트 데모**를 했다. 같이 던진 물음(「읽기 전용 게스트를 등급으로 만들지
데모 팀에 진짜 member 를 만들지 정하고 시작해라」)에는 **셋째 길**로 답했다 — 게스트는
데모 팀의 member 이면서 **주체 종류가 다르다** (`ACTOR_RULES` 의 `writes` 축).


### 지난 바퀴 (56) — 웹 화면 6 (Proposals 목록·상세) (PLAN P4 첫 행 닫음 · `e1e79d5`)

**56바퀴는 PLAN P4 첫 행을 닫았다 — 남아 있던 절반, 화면 6(`…/proposals`)의 목록과
상세다.** 제안이 화면에서 승인·거절되고 그 판단의 근거가 화면에 있다.

🔴 **문을 하나 더 만든 것이 그 바퀴의 결정이다** — `GET /proposals/{id}`. 목록이 `items`
까지 통째로 내므로 상세를 목록으로 그릴 수는 있지만, 목록은 `?limit=50` 이라 **51번째
제안의 상세를 영원히 못 연다.** 주소가 가리키는 것이 목록의 어느 쪽에 있느냐로 정해지면
그건 주소가 아니다. 그 문이 `targets`(diff 의 **before**)를 같이 낸다 — 화면이 항목
목록에서 찾으면 같은 상한에 다시 걸린다. ⚠ **없는 대상은 안 싣는다** (빈 before 로 그리면
`update` 가 `add` 처럼 보인다).

🔴 **`PROPOSAL_DECISIONS` 가 `packages/schema` 로 올라갔다** — 화면이 「지금 어떤 버튼을
그릴 수 있나」를 물으면서 **둘째 사용자**가 됐다. 서버(`decide()`)와 화면이 같은 표를
읽어서, 갈리면 **화면이 그린 버튼이 400 을 받는다.** 상태 5종 × 등급 2종 열 갈래를
시험이 표와 대조한다. 🔴 **거절은 사유가 필수**가 됐다 (`noteRequired` — 화면만 막으면
CLI 로 사유 없는 거절이 들어오고, 그때 제안을 쓴 사람은 무엇을 고칠지 알 자리가 없다).

**잰 것**: 웹 시험 430 → 467 · 관통 704 → 741 · 표 넷이 늘었고 시험이 잠근다
(`PROPOSAL_STATUS_CHIP` · `PROPOSAL_OPERATION_CHIP` · `DECIDED_TEXT` · `DIFF_MISSING_TEXT`).
diff 는 순수 함수 하나다 (`lib/web/diff.ts` — LCS).

**눈으로 읽었다** — `docs/evidence/2026-09-06-proposals/proposals.txt` (모양 25개).
🔴 **덤프가 시험이 못 잡은 것 둘을 잡았다**: ① 화면이 `approved` 같은 **영어 enum 값을
사람에게 그대로** 보여 줬다 (→ `DECIDED_TEXT` — 「무엇이 되었나」가 아니라 「이제 무슨 일이
일어나나」를 적는다) ② `add` 항목 카드에 **역추적 태그가 없었다** — 대상이 없다고 id 가
없는 게 아니다 (`draft.id` 가 그 항목이 받을 id 다 · P7).

**그 바퀴가 다음으로 지목한 것**: PLAN P4 둘째 행의 화면 9 — 57바퀴에 만들었다
(`8c3e8c5`). 같이 던진 물음(「`author`/`user` 이름 한 칸을 낼지 정하고 시작해라」)에도
답했다: **냈다** (`lib/api/user.ts` · FINDINGS 113 닫음 · `aee5de2`).


### 지난 바퀴 (55) — 웹 화면 8 (Roadmap · Realtime) (PLAN P4 첫 행 ① · `7398e44`)

**55바퀴는 PLAN P4 첫 행의 절반을 만들었다 — 화면 8(`…/roadmap`)과 그 행이 말하는
「Realtime」이다.** 기기가 `POST …/progress` 로 보고하면 그 수가 행에서 갈리고
(`evidence_count`·`status`·`last_report_at`), **행은 마일스톤이다** (P5 — 응답에도 화면에도
`device_id`·`confirmed_by` 가 없고 그것을 시험이 센다). Realtime 은 **폴링 10초**다
(`ROADMAP_POLL_MS` · SPEC §14 절삭 8) — job 폴링과 달리 **끝나는 일이 아니라서** 화면을
연 내내 돈다.

🔴 **[완료 확인] 은 만들 수가 없었다.** `POST /progress/{id}/confirm` 은 **보고 하나의 id**
로 부르는데 그 id 를 내는 문이 하나도 없었다 — 보고를 만든 것은 기기이고 그 응답은
사람의 브라우저에 안 온다. 라우트가 **`confirmable`**(아직 확정 안 된 제일 최근
`done_candidate` **하나**)을 내면서 그 버튼이 처음 존재할 수 있게 됐다. 목록으로 안 낸다 —
여럿을 내면 「어느 것을 확정하나」를 화면이 고르게 되고 그 규칙이 서버와 갈린다.

🔴 **`PROGRESS_STATUSES` 의 `none` 이 처음으로 무언가를 바꿨다** (④2-B) — 「어느 마일스톤도
아니다」 보고는 어디에도 안 보였다. 화면 8 하단의 「로드맵 외 작업 N」이 그 자리이고,
가르는 규칙은 **하나**다(지금 Manifest 의 마일스톤 id 가 아닌 것) — 지난 Pack 에만 있던
마일스톤도 같이 걸린다.

표 둘이 늘었다: `MILESTONE_CHIP`(4종 — `done_candidate` 가 `ok` 로 보이면 확정이 끝난 것처럼
읽혀서 **tone 까지** 잠갔다) · `PROGRESS_SOURCE_LABEL`(3종). `MILESTONE_STATUSES` 는 둘째
사용자가 생겨 `packages/schema` 로, 진행 막대는 `job-progress.module.css` 가 예고한 대로
`globals.css` 로 올라갔다. 웹 시험 396 → **430** · 관통 670 → **704**.
**눈으로 읽었다** — `docs/evidence/2026-09-06-roadmap/roadmap.txt` (20모양). 덤프가 시험이
못 잡는 **거짓 문장 하나**를 잡았다: 마일스톤이 0개인데 타일이 「전부 한 번은
보고됐습니다」라고 말했다.

🔴 재다가 둘 나왔다: **Manifest 마일스톤에 `due` 가 없다**(FINDINGS **111** — 계약과 Pack
본문에는 있는데 Manifest 만 안 나른다) · **화면 9 가 없어 `SYNC_CHIP` 5종을 그리는 곳이
0곳이다**(**110**).

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
PLAN P4 첫 행의 나머지 절반 — **웹 화면 6**. 56바퀴가 만들었고 그 행이 닫혔다.


### 지난 바퀴 (54) — 화면이 항목을 만드는 문 셋을 Pack 까지 쟀다 (FINDINGS **35** · `130b5f2`)

**54바퀴는 제품을 새로 만들지 않고 쟀다** — 「화면에서 항목을 새로 만들 수 없다」
(FINDINGS **35**)를 재고 닫았고, 같이 재던 PLAN P3 둘째 행(웹 화면 3·4)도 닫았다.

🔴 **잰 결과 — 화면이 항목을 만드는 문은 셋이고, 셋 다 Pack 까지 간다.**
A 씨앗 질문에 답한다(`manual:<씨앗 질문 문장>`) · B 열린 질문에 **자리를 골라**
답한다(`manual:<그 질문>`) · C 구조화 후보를 받아들인다(`doc:{version}#0-40`).
문 쪽 시험들은 「행이 생기는 데까지」만 재서 문 하나가 Pack 앞에서 끊겨도 초록이었다 —
그래서 셋을 **한 프로젝트에서 섞어** 발행까지 가는 자리를 새로 뒀다
(`apps/web/test/web-item-doors.test.ts`). 관통 666 → **670**.

문 A 로 만든 v1.0 은 ⑧ 이후 처음 다시 쟀는데 2026-09-04 산출물과 **본문이 한 글자도
안 다르다** (다른 것은 `snapshot_hash` 뿐이고 그건 `project_id` 가 지문에 들어가서다).
눈으로 읽은 것: `docs/evidence/2026-09-06-item-doors/`.

🔴 **재다가 하나 나왔다 (FINDINGS 108).** `CONFLICT_KIND_RULES.open_question.answerSlot`
을 `'none'` 으로 뒤집으니 **화면 시험 7개는 빨개지는데 API 시험은 하나도 안 빨개진다** —
라우트가 `slot === 'seeded'` 인지만 보고 나머지를 한 갈래로 묶는다. ⚠ 지금은 닿을 수
없어서(답할 수 있는 종류가 `seeded`·`ask` 둘뿐) 고장이 아니라 구멍이다.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
PLAN **P4 첫 행** — 웹 화면 6·8. 55바퀴가 그중 화면 8 을 만들었다.

---


### 지난 바퀴 (53) — 화면 3 의 질문 스택도 열린 질문에 자리를 묻는다 (FINDINGS **106** · `8d19a50`)

**53바퀴는 52바퀴가 화면 4 에서 닫은 구멍의 **다른 화면**을 닫았다.** 화면 3 의
「질문에 답하기」 스택은 `save_as` 를 하나도 안 보냈고, `kind` 라는 낱말이
`question-stack.tsx` 에 **0번** 나왔다 — 그 스택은 `fetchQuestions(status:'open')` 이
낸 것을 종류를 안 보고 다 그리므로, 문서를 올린 뒤에는 §7.1 이 남긴 열린 질문이 섞이고
거기서 답하면 **고치기 전과 똑같이 기록만** 됐다.

🔴 **새 표도 새 계약도 안 만들었다** — 화면 4 가 세운 표를 읽기만 한다
(`CONFLICT_KIND_RULES[kind].answerSlot` · `ANSWER_SLOT_KEYS`·`ANSWER_SLOTS`).
새로 정한 것은 둘뿐이다: **고른 자리를 답과 따로 든다**(`saveAs` — 한 장씩 넘기는
흐름이라 [이전] 로 돌아왔다 나가면 답에 묶인 값은 사라진다) · **요약이 「몇 개가 항목이
되나」를 저장 전에 말한다**(`becomingItems` — 씨앗만 있던 때는 「답한 것 = 항목」이 늘
참이라 그 말이 필요 없었다). 씨앗 카드에는 안 그린다 (실으면 서버가 400).

**잰 것**: 화면 3 에서 열린 질문에 답하면 항목 0개 → **초안 1개** · `ANSWER_SLOTS` 를
읽는 곳 셋 → **넷** · `web-question-stack` 시험 16 → **22** · 관통 659 → **666**.

**빨개지는 것을 봤다** — `answerSlot` 을 `seeded` 로 뒤집으니 카드 시험 둘에서 **8개**.
🔴 그중 「묻는 카드인가는 표가 정한다」는 **안 빨개진다** — 기대를 표에서 파생시켰으니
표가 뒤집히면 같이 뒤집힌다 (103·104-B 가 배운 그 모양). 손으로 적은 줄을 하나 더 뒀다.

**눈으로 읽었다** (`docs/evidence/2026-09-06-question-stack-slot/stack.txt`) — 덤프가
시험이 못 잡는 두 문장을 잡았다: ⑫ 가 같은 수를 두 번 말했고, ⑨ 의 「그 답을 항목으로
만드는 것은 정리 화면의 일입니다」는 이 고침으로 **거짓이 됐다**.
★ **고친 화면이 옆 문장을 거짓으로 만든다.** 시험은 그 줄이 있는지만 봤다.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
FINDINGS **35** — 재서 닫으라고 했고, 54바퀴가 재서 닫았다.

---


### 지난 바퀴 (52) — 열린 질문에 답하면 항목이 생기게 했다 (FINDINGS **105** · `7b7f521`)

**52바퀴는 열린 질문에 답해도 항목이 안 생기던 구멍을 닫았다 — 답이 갈 자리를
**사람이 고르게** 하고, 그 자리를 아는 표를 하나로 세웠다** (FINDINGS **105** · `7b7f521`).

🔴 **무엇이 문제였나.** 화면 4 의 열린 질문 카드에 답을 적고 [답 저장하기] 를 누르면
질문은 닫히고 「저장됐다」가 뜨는데 **항목이 하나도 안 생겼다.** 답이 항목이 되는 길은
`AnswerQuestions.draft`(초안을 통째로 실어 보내기) 하나였는데 **그 칸을 보내는 제품
코드가 한 곳도 없었다** — 시험만 부르는 칸이었다 (2-B 가 찾는 바로 그 모양이다).

🔴 **대장의 ①을 골랐지만 ①이 스스로 적어 둔 대가는 피했다.** 105 의 ①은 「화면이
타입을 고르고 `draft` 를 만들어 보낸다」인데, 그러면 「답변이 어느 칸으로 가나」를 아는
표가 **화면에도** 생긴다. 그래서 화면은 **고른 자리의 이름만** 보낸다 (`save_as`) —
옮기는 것은 서버이고 표는 `ANSWER_SLOTS` 하나다 (`packages/schema/src/item.ts`).
- **②(서버가 §7.1 출력에서 자리를 받는다)를 안 고른 이유**: 그 자리는 모델이 정하게
  되고, **API 키가 없어 잴 수 없는 것 위에 짓게 된다.** ①' 은 오늘 관통으로 잰다.
  ⚠ 둘은 배타가 아니다 — ②가 오면 그 값이 이 칸의 **기본 선택**이 되면 된다.
- **③(못 한다고 말한다)은 기본값으로 남겼다**: 안 고르면 카드가 「이 답은 기록으로만
  남습니다」라고 말하고 **실제로 그렇다.** 서버가 자리를 대신 고르지 않는다.

🔴 **표가 다섯 줄뿐인 것은 실수가 아니다.** 기준은 「한 문장으로 그 타입의 **필수 칸이
전부 차는가**」다 — `roadmap`(milestone_id·done_when)·`workflow`(trigger·steps)·
`architecture`(component)·`domain`(name)·`adr`(3칸)는 서버가 없는 값을 지어내야 한다.
`policy` 가 두 줄인 것은 `severity` 에 기본값이 없어서다 (서버가 고르면 사람이 안 한 판단).

**잰 것:**

| | 전 | 후 |
|---|---|---|
| 화면 4 에서 열린 질문에 답하면 | 기록만 · **항목 0개** | 고른 자리로 **초안 1개** |
| `save_as` 를 보내는 제품 코드 | — | 화면 4 (`review/page.tsx`) |
| `draft` 를 보내는 제품 코드 | **0곳** (시험만) | 칸을 **지웠다** |
| 답 → `data` 를 아는 표 | 씨앗 표 하나 (열린 질문엔 없음) | `ANSWER_SLOTS` 하나 (둘이 읽는다) |
| 씨앗 질문에 `save_as` | — | **400** (조용히 무시하지 않는다) |
| 초안을 짓는 자리 | 둘 (씨앗 · 라우트) | **`answerDraft()` 하나** |
| 관통 검사 | 654 | **659** (web api 380 → 385) |
| schema 시험 | 119 | **140** |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough **659** · docs → GREEN |

**빨개지는 것을 봤다** — `CONFLICT_KIND_RULES.open_question.answerSlot` 을 `seeded` 로
뒤집으니 **다섯**이 빨개진다 (카드 2 · 라우트 2 · 스키마 축 대조 1).
**눈으로 읽은 것**은 카드 열여섯 모양이다
(`docs/evidence/2026-09-06-answer-slot/conflict-card.txt`) — ⑪ 은 고르기 전이라
「이 답은 기록으로만 남습니다」이고, ⑪-B 는 고른 뒤라 「이 답이 「정책(반드시) — 어기면
안 되는 것」 초안 항목 한 개가 됩니다」다. 두 줄이 **서로 다른 약속**을 한다.

🔴 **고치는 동안 같은 구멍의 다른 화면이 나왔다 (FINDINGS 106).** 화면 **3** 의 질문
스택은 `save_as` 를 안 보내고, `kind` 라는 낱말이 그 파일에 0번 나온다 — 문서를 올린
뒤에는 §7.1 이 남긴 열린 질문이 그 스택에 섞이므로, 거기서 답하면 **고치기 전과 똑같이**
기록만 된다. 서버 쪽은 이미 준비돼 있다 (`answerSlot:'ask'`).

**2-B 52바퀴 라운드**: `confidence` 3단계 · sync 상태 `manual`.
`confidence` 는 ①② 살아 있고 **잠겨 있다** — 태그의 `conf:` 칸이고
(`compiler/src/tag.ts:79`), `liveness.test.ts` 가 **세 값의 지문이 서로 다른지**를 잰다.
`manual` 은 **69 그대로 찍는 코드가 0곳**이다. ★ 이번에 새로 안 것: 그 값의 뜻이
「zip 을 손으로 풀어 적용했다」라서 **zip 문(67 ①)이 먼저다** — 69 는 배선을 빠뜨린 것이
아니라 **아직 안 만든 기능의 그림자**다. 그 순서를 105-B 에 적었다.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다): FINDINGS **106** — 53바퀴에 닫았다 (`8d19a50`).

🔴 **왜 106 인가 — `loop/PROMPT.md` ④3 의 순서 그대로다.** 고장은 없다 (관통 659 초록).
PLAN 의 `- [ ]` 맨 위 둘은 **사람이 막고 있고**(🙋 Supabase · 🙋 Anthropic 키), 루프가
움직일 수 있는 맨 위 행은 **「웹 화면 3·4」**다. 그 행이 주인인 대기는
**106**(구멍) · 59 · 63(격차)이고, 순서는 **구멍 → 격차**다.
⚠ 106 은 화면 4 에서 **이미 만든 표를 읽기만** 하면 된다 (`ANSWER_SLOTS` ·
`CONFLICT_KIND_RULES[kind].answerSlot`). 새로 정할 것은 하나뿐이다 —
**한 장씩 넘기는 스택**에서 고른 자리를 어디에 들고, 마지막 요약이 「몇 개가 항목이
되나」를 어떻게 말할 것인가. 카드 하나짜리 변경이 아니라서 이번 바퀴에 안 묶었다.

---


---


### 지난 바퀴 (51) — 질문에 답해 만든 항목이 그 질문과 이어지게 했다 (FINDINGS **56** · `69c9a80`)

**51바퀴는 질문에 답해서 만든 항목이 그 질문과 이어지지 않던 구멍을 닫았다 —
서버가 근거 한 줄을 붙이고, 대장이 적어 둔 「고칠 방향 ①」은 **틀렸다고 판단해서 안 했다**
(FINDINGS **56** · `69c9a80`).

🔴 **무엇이 문제였나.** 답변이 항목이 되는 길은 둘이다 — 씨앗 질문 10장(표가 자리를
정한다)과, **초안(`draft`)을 실어 보내는 열린 질문**. 뒤의 길은 그 항목의 근거를
**부르는 쪽이 통째로** 정했다. 그래서 그 항목이 Pack 에 나간 뒤 「사람이 어느 질문에
답한 것인가」로 갈 길이 하나도 없었다 (P7).

🔴 **대장의 ①을 그대로 하지 않았다 — 그게 그 바퀴의 판단이다.**
56 은 「질문이 물고 있던 `a_ref`(원문 구간)를 항목에 물려주라」고 적어 뒀다. 그런데
`a_ref` 는 §7.1 이 문서를 읽다 **질문을 남긴 자리**이지 답이 적혀 있던 자리가 아니다.
사람이 머리로 쓴 문장에 문서 구간을 근거로 달면 **원문에 없는 문장이 원문을 근거로**
배포된다 — SPEC §5 `AcceptJobItems` 가 「본문을 같이 받지 않는」 이유와 **같은 고장**이고,
101 이 잡은 것(범위는 맞는데 낱말이 다르다)의 더 나쁜 판이다.
⚠ **56 이 ①의 근거로 든 사실이 틀렸다** — 「아무것도 안 주면 근거 0개인 항목이 생긴다」고
적혀 있는데 `ContextItemDraft.source_refs` 는 `min(1)` 이다. **대장의 증상을 다시 재지
않고 그 위에 지었으면 잘못된 자리를 고쳤을 것이다.**

그래서 붙인 것은 **질문 그 자체**다: `{kind:'manual', note:<질문 문장>}`.
짓는 자리는 `questionRef()` 하나(`lib/api/conflict.ts`)이고 붙이는 자리는 **이미 있던 문**
`appendSourceRef()` 다 — 그 함수 주석이 「새 붙이는 자리가 생기면 여기를 부르고 자리가
없을 때 무엇을 답할지만 정해라」라고 적어 둔 그대로 **셋째 사용자**가 됐다.
씨앗 초안은 같은 줄을 이미 들고 있어 `same` 이 잡는다 — **씨앗 길의 Pack 바이트는 그대로다.**

**잰 것:**

| | 전 | 후 |
|---|---|---|
| 초안을 실어 답한 항목이 질문을 가리키나 | **아니오** | 예 — 태그 끝에 `manual:<질문>` |
| 근거가 가득 찼을 때 | 파싱에서 터진다 | **400** 이고 질문이 안 닫힌다 |
| 질문이 note 상한(200)보다 길 때 | **500** | 머리를 남기고 자른다 |
| `MANUAL_NOTE_MAX` | 세 자리에 흩어진 `200` | `packages/schema` 상수 하나 |
| web 시험 | 337 | **340** |
| 관통 검사 | 651 | **654** |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough **654** · docs → GREEN |

**빨개지는 것을 봤다** — 붙이는 줄(`source_refs: refs`)을 지우니 시험 2개가 빨개졌다.
**눈으로 읽은 것**은 Pack 태그다 (`traceTag` 를 직접 굴려서):
`<!-- ctx:item_refund_days rev:1 conf:high src:repo:paylab-api:src/payment/retry.ts:14,manual:환불은 며칠 안에 되는가? -->`
부르는 쪽이 준 근거는 **그대로 남고** 질문이 뒤에 붙는다 — 두 갈래가 다 살아 있다.

🔴 **고치는 동안 더 큰 구멍이 나왔다 (FINDINGS 105).** 그 바퀴가 근거를 채워 준 그 길로
**들어오는 제품 트래픽이 0** 이다. `AnswerQuestions.draft` 를 보내는 코드가 화면에도
`lib/web/queries.ts` 에도 없고 **시험 하나뿐**이다. 즉 화면 4 에서 열린 질문에 답하면
질문은 닫히고 「저장됐다」가 뜨는데 **항목은 안 생긴다.** 사람이 적은 문장은
`resolution.note` 에만 남는다.

**2-B 51바퀴 라운드**: `SourceRef` 4종 · `enforcement` 4종. **둘 다 ①② 살아 있고
잠겨 있다** — `test/liveness.test.ts` 가 4종의 지문이 **서로 다른지**를 재고,
`SourceRef` 는 **쓰고 되읽는 왕복**(`srcTag` → `srcKindOf`)까지 잠근다. 그 바퀴의
변경으로 `manual` 은 생산자가 셋이 됐다(충돌 정리 · 씨앗 답변 · 열린 질문 답변).
★ 103·104-B 가 남긴 물음(「기대의 출처가 표 밖에 있나」)으로 다시 보면 —
`SOURCE_REF_KINDS` 를 도는 시험이라 표에서 파생되지만, **표본 객체(`SAMPLES`)가 표 밖에
손으로 적혀 있어서** 종류를 지우면 `Object.keys(SAMPLES)` 대조가 빨개진다. 안전하다.

**그 바퀴가 다음으로 지목한 것**: FINDINGS 105 (「열린 질문에 답하면 답만 남고
항목이 안 생긴다」) — 52바퀴에 닫았다 (`7b7f521`).


### 지난 바퀴 (50) — 종이가 원문에 없는 낱말을 말하던 것 (FINDINGS **101** · `fb80f64`)

**50바퀴는 종이가 원문에 없는 낱말을 말하던 것을 멈췄다 — `지표:` 한 칸을 고치고,
「어느 `data` 칸이 인용인가」를 표로 세워 관통이 Pack 태그를 따라가 판정하게 했다**
(FINDINGS **101** · `fb80f64`).

🔴 **무엇이 문제였나.** Pack 의 Goals 줄은 `지표: 주간 승인 성공률` 이라고 말했는데,
그 줄의 근거 범위가 가리키는 원문(goals.md §2 G1 행)의 지표 칸은
「**PSP 장애 구간을 포함한** 주간 성공률」이다. 「주간 승인 성공률」이라는 문자열은
픽스처 문서 어디에도 없었다 (`grep` 0건). **범위는 맞는데 옮겨 적은 낱말이 달랐고**,
「PSP 장애 구간을 포함한」이라는 조건이 통째로 사라졌다.
★ **90 과 다른 고장이다** — 거기는 **범위**가 틀렸고 여기는 범위가 맞는데 **글자**가 다르다.
「범위가 맞나」와 「낱말이 맞나」는 다른 질문이고, 뒤의 것을 아무도 안 물었다.

🔴 **한 칸을 고치고 끝내지 않았다. 그런데 「전부 인용이어야 한다」도 틀렸다.**
항목이 시킨 대로 다른 `data` 칸을 훑고 나서 안 것이다 — 칸은 **두 갈래**다.

| 갈래 | 예 | 글자가 원문과 |
|---|---|---|
| **인용 칸** — 문서에 있던 값을 옮긴 것 | 목표 표 3칸 · 용어 표 · 완료 기준 목록 · 구성요소 이름 | **같아야 한다** |
| **진술 칸** — 팀이 그 문단을 읽고 스스로 적은 문장 | `rule`·`statement`·`responsibility`·`invariants` | 달라도 옳다 |

기준을 「전부 인용」으로 내리면 `'PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다'`
같은 **정상적인 진술이 전부 빨개진다** — 늘 빨간 게이트는 다음 사람이 끈다 (100 의 판단과 같다).
그래서 갈래를 **표**로 적었다: `QUOTED_DATA` (`apps/web/scripts/seed.ts`).
`goal: outcome·metric·deadline` · `domain: glossary` · `roadmap: paths·done_when` ·
`architecture: component` · `mission`·`policy`·`constraint` 는 `[]`.
**새 ItemType 은 표에 한 줄**이고, 줄이 없는 타입을 만나면 `fromDoc()` 이 **던진다**.

판정은 **관통이 Pack 태그를 따라가서** 한다 (`walkthrough-publish.ts` 의 `followEvidence`) —
항목이 그려 준 그대로다. 이미 `doc:`·`repo:` 범위를 원문에서 잘라 보고 있었으므로
**같은 조각 안에서** 인용 칸을 찾게 했다. 기대의 출처는 표가 아니라 **픽스처 원문**이다
(103·104-B 가 남긴 조건을 그대로 만족한다).

**잰 것:**

| | 전 | 후 |
|---|---|---|
| 종이의 `지표:` | `주간 승인 성공률` (픽스처에 **0건**) | `PSP 장애 구간을 포함한 주간 성공률` |
| 인용 칸을 따라가는 검사 | **0개** | **1개** · 따라간 칸 **44개** |
| 새 ItemType 이 인용 칸을 선언 안 하면 | 조용히 안 재진다 | 씨앗이 **던진다** |
| 관통 검사 | 650 | **651** |
| 컴파일러·템플릿 | — | **한 글자도 안 건드렸다** (고친 것은 씨앗의 칸 하나) |
| CI | — | principles OK 9 · typecheck · test · build · walkthrough **651** · docs → GREEN |

**빨개지는 것을 둘 다 봤다** — `metric` 을 예전 값으로 되돌리니 그 칸을 짚으며 FAIL 했고
(`item_goal_success_rate: paylab-docs/goals.md#499-560 안에 「주간 승인 성공률」 가 없다`),
`QUOTED_DATA` 의 `goal` 줄 이름을 바꾸니 씨앗이 던졌다.

**눈으로 읽고 주석 하나를 고쳤다.** `item_domain_payment` 옆에 「glossary 와 invariant
둘 다 표 안에 글자 그대로 있다」고 적혀 있었는데, `invariants` 는 표의 문장
(`돈의 움직임을 한 줄씩 append 하는 표. 수정·삭제 없음`)을 **불변식으로 다시 적은 것**이라
글자가 다르다. 뜻은 같으니 고칠 것은 항목이 아니라 **주석**이었다.
**기계는 이걸 안 잡는다** — 게이트는 인용 칸만 세고 주석은 안 읽는다.

⚠ **게이트가 못 잡는 것을 적어 둔다.** 어느 칸이 「인용」인지는 **사람이 정한다.**
진술이라고 적어 둔 칸은 영원히 안 재진다. 그래서 표 옆에 칸마다 **왜 진술인지**를
적어 뒀다 — 다음 사람이 그 판단을 다시 볼 수 있어야 한다.

**2-B 50바퀴 라운드** (`101-B`): 100-B 가 남긴 후보에서 **플러그인의 경로 표**를 골랐다
(`LOCAL_FILES` 8종 · `IGNORED_LOCAL_PATHS` 3종). **둘 다 살아 있고 잠겨 있다 —
그런데 하나는 자물쇠가 vitest 밖에 있다.**
- `latestCache` 를 `cache/zz-latest.json` 으로 바꾸니 **플러그인 시험 4개**가 빨개졌다.
  훅(`scripts/session-start.mjs`)이 import 를 못 해 경로를 **자기 글자로** 들고 있어서,
  표와 갈리면 훅이 캐시를 못 찾는다. 되돌렸다.
- `IGNORED_LOCAL_PATHS` 에서 `pending-proposal.json` 을 빼니 **`npx vitest run` 은
  1개(번들 바이트)만 빨개졌고, 번들을 다시 빌드하니 173개가 전부 초록**이었다 —
  이 표를 재는 시험(`sync.test.ts`)이 기대를 **표에서 파생**시키기 때문이다
  (103·104-B 와 똑같은 모양). **잡은 것은 `tools/principles.ps1` 의 P6** 이다:
  `hooks.json` 의 `_writes` 에 **글자로 적힌** `.contextops/pending-proposal.json` 이
  ignore 목록 밖으로 나가 FAIL 했다. 되돌렸다.
- ★ **「어떤 시험을 돌렸나」가 2-B 의 답을 바꾼다.** 패키지 시험만 돌리면 이 표는
  「살아 있는데 안 잠겼다」로 보인다. ②단계는 `tools/ci.ps1` **전 층**을 기준으로 물어라 —
  이 저장소의 자물쇠 절반은 `principles.ps1` 에 있다.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
FINDINGS **87** — 「근거 글자가 어느 문서인지 안 말한다」.

그때 대장의 대기는 하나로 보였다 — **87** (근거 글자가 어느 문서인지 안 말한다) ·
[격차]. 고장·구멍은 없다.
🔴 **87 은 화면 쪽 일이고, 항목이 「어디까지 갈 수 있나」를 이미 재 놨다** —
`SRC_LABEL.source_document` 가 `문서 §결제 › 재시도 · 1240–1520자` 만 내고
**어느 문서인지**를 안 말한다. 화면 5·7 은 항목마다 다른 문서에서 온 근거가 나란히 서는
자리라 거기서 사슬이 사람 눈앞에서 끊긴다.
★ **표 하나(`SRC_LABEL`)만 고친다** — 화면마다 조립하면 어디선가 빠진다. 첫 걸음은
`document_version_id` 앞 8자를 `mono` 로 붙이는 것이고(`proposal` 이 이미 그 모양이다),
문서 **제목**까지 가려면 응답에 그 이름이 없어서 **문서 목록을 내는 문**이 먼저 필요하다.
★ 그 바퀴가 남긴 질문 — **「기대의 출처가 표 밖에 있나」**, 그리고
**「그 자물쇠가 `vitest` 안에 있나 `principles.ps1` 에 있나」**. 87 의 게이트는
`web-tables.test.ts` 의 「4종이 서로 다른 문자열을 낸다」이고, 그건 기대를 표에서
파생시키지 않는다 — 네 갈래가 **서로 다른지**를 재므로 한 갈래만 베껴도 잡힌다.

---

### 지난 바퀴 (49) — 종이가 같은 말을 두 번 하던 것 (FINDINGS **99**·**100**·**104** · `a87994d` + `3c4ad2f`)

**49바퀴는 항목 하나가 낸 줄 안에서 같은 문장이 글자까지 똑같이 두 번 나오던 세 자리를,
씨앗의 제목 칸만 고쳐서 닫았다.**

🔴 세 절이 각자 다른 모양으로 겹쳤는데 원인은 하나였다 — **씨앗이 제목을 데이터와 같게 줬다.**

| 절 | 종이에 나온 것 | 왜 |
|---|---|---|
| `architecture` | `### payment — 승인·매입을 맡는다…` + `- 책임: 승인·매입을 맡는다…` | 제목을 ``${component} — ${responsibility}`` 로 **만들고** 있었다 |
| `goal` | `- **결제 승인 성공률 99.5%** — 결제 승인 성공률 99.5%` | 제목과 `outcome` 이 같은 문자열이었다 |
| `roadmap` | `- **PL-M1 M1 — 재시도·타임아웃 정리**` | 제목이 `M1 — ` 으로 시작했다 |

🔴 **템플릿을 깎지 않았다.** 제목이 데이터와 같은 것은 **이 픽스처의 선택**이지 템플릿의
잘못이 아니다 — 다른 팀의 항목은 제목이 다르다. 고친 것은 씨앗의 제목 칸 셋뿐이다.

**잰 것:** 같은 문장을 두 번 적는 항목 5자리 → **0** · 그것을 세는 검사 0개 → **1개**
(`pack-echo.ts` · 세 절을 같이 잠근다) · 컴파일러 시험 150 → **151** · 관통 648 → **650**.
**게이트가 자기 몫을 했다** — 눈으로 본 것은 두 자리인데 검사가 **셋째**를 짚어 줬다
(관통이 제안으로 넣는 G3 도 제목과 `outcome` 이 같았다).

🔴 **한 가지가 더 필요했다 (FINDINGS 104).** 게이트가 「항목 하나가 낸 줄」을 물으려면
그 물음의 정본(`traceLines`)이 맞아야 하는데, 그게 `startsWith('#')` 로 **h3까지** 절 머리로
끊고 있었다. 그래서 `### 제목` 줄이 **어느 항목에도 안 칠해졌고** 화면 7 에서 그 줄만
근거가 사라진다. 경계를 `^#{1,2} ` 로 좁히고 「`###` 줄은 반드시 칠해진다」를 잠갔다.

**눈으로 읽고 하나를 더 고쳤다** (`3c4ad2f`). `ledger` 의 제목 `돈이 남는 기록` 은
「돈이 남아돈다」로도 읽힌다 — `돈이 쌓이는 장부` 로 바꿨다. **기계는 이걸 안 잡는다.**
근거 캡처: `docs/evidence/2026-09-05-echo/`.

⚠ **게이트가 못 잡는 것** — 이 검사는 **문장**이 두 번 나오는 것을 세지 **낱말** 겹침을
안 센다. `**PL-M1 M1 — …**` 는 사람 눈이 잡은 것이고 지금도 게이트로는 안 잡힌다.
기준을 낱말까지 내리면 정상적인 되풀이가 전부 빨개진다.

**2-B 49바퀴 라운드** (`104-B`): `SRC_TAG` 접두사 4종 · `AI_FEATURE_LIMITS` 빈도 표.
둘 다 잠겨 있다 — 왕복 시험은 접두사를 바꿔도 초록이지만 **golden 이 태그 본문을 글자로**
들고 있어 10개가 빨개졌고, 빈도 표는 상한 `3` 을 **손으로 적은** 시험이 잡았다.
★ **표 밖에 있는 무언가가 기대의 출처여야 한다** — SPEC 문장이든 산출물 본문 사본이든
손으로 적은 수든.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
FINDINGS **101** — 「`지표:` 의 낱말이 근거 원문에 없다」.

---

### 지난 바퀴 (48) — P4 의 심장(`SCOPE_ORDER`)에 자물쇠를 걸었다 (FINDINGS **103** · `1606e37`)

**48바퀴는 `packages/compiler/src/sort.ts` 의 `SCOPE_ORDER` 를 정반대로 뒤집어도
컴파일러 시험 147개가 전부 초록이던 것을 「빨개진다」로 바꿨다** (FINDINGS **103**).

🔴 그 표는 **죽은 것이 아니었다** — 값을 바꾸면 `CLAUDE.md` 안의 줄 순서가 실제로
갈린다. 그런데 그걸 세는 시험이 **0개**였다. 「손을 대도 CI 가 초록」이면
「같은 snapshot → byte-identical Pack」은 사람의 조심성에 걸려 있는 주장이다.

🔴 **왜 golden 이 못 잡았나.** `SCOPE_ORDER` 는 **priority 가 같고 scope 만 다른 두
항목이 한 절에 설 때만** 일한다. `policy`·`constraint` 는 `byScope()` 가 scope 별로
**다른 파일**로 보내서 그 조건이 안 생기고, 픽스처·golden 어디에도 그런 짝이 없었다.
**golden 은 픽스처가 밟는 길만 잠근다.**

**자물쇠가 셋인 이유** — ① 순서(재료는 `roadmap` 셋 · 같은 priority · scope 만 다르게 ·
제목·ID 는 기대와 **반대로** 매겨서 비교가 빠지면 정반대가 나오게) ② **방향**
(SPEC §4.1 3단계 `scope(project<domain<path)` 라는 **정본의 문장**으로 따로 잠갔다 —
기대를 표에서 파생시키면 표를 통째로 뒤집을 때 기대도 같이 뒤집혀 그대로 초록이다.
직접 뒤집어 돌려서 150개가 초록인 것을 봤다) ③ 메타(그 순서가 제목·ID 순과 **다름**).
컴파일러 시험 147 → 150 · **표의 값은 한 칸도 안 고쳤다.**

**이름도 하나 고쳤다** — 기존 describe 는 `scope.kind 3종 · 배치 (SCOPE_DOC)` 가 됐다.
「어느 파일로 가나」(배치)와 「누가 먼저 서나」(정렬)는 **다른 표 둘**인데 한 이름으로
묶여 보여서 정렬 쪽이 안 잠긴 채 남아 있었다.

**2-B 48바퀴 라운드** (`103-B`): 분량 한도 2개를 1000배로 올리니 **7개**가, `claude.slots`
의 절 순서 두 줄을 맞바꾸니 **golden 2개**가 빨개졌다. 둘 다 잠겨 있다.
★ **golden 은 픽스처가 밟는 길만 잠근다** — 다음 2-B 는 「이 값이 일하는 조건이
픽스처에 **있나**」를 먼저 물어라.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
FINDINGS **99**·**100** — 같은 고장의 다른 절이니 한 바퀴에 같이 고칠 것.

---

### 지난 바퀴 (N)` 이 **`STATUS_MAX_PAST_CYCLES` 개를 넘으면**
> 제일 오래된 것을 **잘라서 이 파일 맨 위에 붙인다.** 베끼지 마라 — **옮겨라.**
> (`tools/status-shape.mjs` 가 같은 바퀴 번호가 두 파일에 다 있으면 FAIL 한다.)
>
> ⚠ 아래 기록은 **형식이 두 가지**다. 37바퀴부터는 `### 지난 바퀴 (N)` 이고,
> 그 이전(10~36바퀴)은 `**N바퀴 · 제목**` + 표 하나다. **옛 기록을 새 형식으로
> 고쳐 쓰지 마라** — 그때 무엇을 봤는지의 기록이고, 고치면 기록이 아니게 된다.

---

### 지난 바퀴 (48) — P4 의 심장(`SCOPE_ORDER`)에 자물쇠를 걸었다 (FINDINGS **103** · `1606e37`)

**48바퀴는 `packages/compiler/src/sort.ts` 의 `SCOPE_ORDER` 를 정반대로 뒤집어도
컴파일러 시험 147개가 전부 초록이던 것을 「빨개진다」로 바꿨다** (FINDINGS **103**).

🔴 그 표는 **죽은 것이 아니었다** — 값을 바꾸면 `CLAUDE.md` 안의 줄 순서가 실제로
갈린다. 그런데 그걸 세는 시험이 **0개**였다. 「손을 대도 CI 가 초록」이면
「같은 snapshot → byte-identical Pack」은 사람의 조심성에 걸려 있는 주장이다.

🔴 **왜 golden 이 못 잡았나.** `SCOPE_ORDER` 는 **priority 가 같고 scope 만 다른 두
항목이 한 절에 설 때만** 일한다. `policy`·`constraint` 는 `byScope()` 가 scope 별로
**다른 파일**로 보내서 그 조건이 안 생기고, 픽스처·golden 어디에도 그런 짝이 없었다.
**golden 은 픽스처가 밟는 길만 잠근다.**

**자물쇠가 셋인 이유** — ① 순서(재료는 `roadmap` 셋 · 같은 priority · scope 만 다르게 ·
제목·ID 는 기대와 **반대로** 매겨서 비교가 빠지면 정반대가 나오게) ② **방향**
(SPEC §4.1 3단계 `scope(project<domain<path)` 라는 **정본의 문장**으로 따로 잠갔다 —
기대를 표에서 파생시키면 표를 통째로 뒤집을 때 기대도 같이 뒤집혀 그대로 초록이다.
직접 뒤집어 돌려서 150개가 초록인 것을 봤다) ③ 메타(그 순서가 제목·ID 순과 **다름**).
컴파일러 시험 147 → 150 · **표의 값은 한 칸도 안 고쳤다.**

**이름도 하나 고쳤다** — 기존 describe 는 `scope.kind 3종 · 배치 (SCOPE_DOC)` 가 됐다.
「어느 파일로 가나」(배치)와 「누가 먼저 서나」(정렬)는 **다른 표 둘**인데 한 이름으로
묶여 보여서 정렬 쪽이 안 잠긴 채 남아 있었다.

**2-B 48바퀴 라운드** (`103-B`): 분량 한도 2개를 1000배로 올리니 **7개**가, `claude.slots`
의 절 순서 두 줄을 맞바꾸니 **golden 2개**가 빨개졌다. 둘 다 잠겨 있다.
★ **golden 은 픽스처가 밟는 길만 잠근다** — 다음 2-B 는 「이 값이 일하는 조건이
픽스처에 **있나**」를 먼저 물어라.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
FINDINGS **99**·**100** — 같은 고장의 다른 절이니 한 바퀴에 같이 고칠 것.

---

### 지난 바퀴 (47) — `STATUS.md` 가 자기와 어긋나던 것 (FINDINGS **102** · `06dc1c8` + `03fb4f1`)

**47바퀴는 다음 할 일을 말하는 자리가 **둘**이고 둘이 다른 말을 하던 것을 고쳤다.**
머리는 「99 가 맨 위」라고 했고, 733줄의 `## 다음 바퀴가 할 일` 절은 「맨 위는 `97` 이다」로
시작했다 — **97 은 44바퀴에 닫혔다**(`7ba2feb`). `loop/PROMPT.md` ②표가 이 파일을
「**전체**」 읽으라고 지목하므로, 아래까지 읽는 바퀴는 **닫힌 항목을 다시 연다.**
두 바퀴가 그 절을 지나쳤다.

🔴 **왜 그 자리가 썩었나 — 손이 안 닿는 자리라서다.** 199,431바이트·2,250줄이었고 그중
900여 줄이 10~40바퀴 기록이었다. **같은 역사를 두 형식으로 두 곳에** 들고 있었고
`## 잰 것` 절이 **두 번** 있었다. ★ 크기가 고장이 아니라 **어긋남**이 고장이고,
크기는 그 어긋남이 생긴 **이유**다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| 다음 할 일을 말하는 자리 | **2곳** — 서로 다른 항목을 가리켰다 | **1곳** (머리 한 줄) |
| 그 자리가 가리키는 항목의 상태 | 아래쪽은 **닫힘**(97) | **대기**임을 게이트가 센다 |
| STATUS 크기 | 2,250줄 · 199,431바이트 | **1,062줄 · 82,238바이트** |
| 지난 바퀴 기록 | STATUS 안에 두 형식으로 21블록 | STATUS 는 **최근 5바퀴** · 나머지는 `docs/history/cycles.md` |
| 이 고장을 세는 게이트 | **0개** | **7가지** (`tools/status-shape.mjs`) |

**고친 방법은 「규칙을 더한다」가 아니라 「자리를 없앤다」였다.** 절 이름이 「다음 바퀴가
할 일」인 한 그 절은 계속 지목을 끌어들인다 — 그래서 이름을 `## 앞 바퀴들이 남긴 것` 으로
바꿨다. ⚠ **안에 있던 지식은 한 줄도 안 지웠다.** 지운 것은 97·96·98(셋 다 닫힘) 지목
38줄뿐이다 — 그 절이 썩은 것은 **지식이 아니라 지목**이었다.

**게이트가 세는 일곱** (`tools/status-shape.mjs` · `pnpm docs:check` · `ci.ps1` 의 `docs` 층):
① 지목하는 줄이 하나인가 ② 그 번호가 FINDINGS 에서 대기인가 ③ `## ` 절 제목이 서로
다른가 ④ 절 제목에 「다음 바퀴」가 없는가 ⑤ `### 지난 바퀴 (N)` 이 `STATUS_MAX_PAST_CYCLES`(5)
안인가 ⑥ 같은 바퀴 기록이 STATUS 와 history **양쪽에** 있지 않은가 ⑦ 정본 모양을
**흉내 내는** 줄이 없는가. **일곱이 빨개지는 것을 전부 봤다.**
★ **이 층만 「앞 층이 빨갛다」로 안 건너뛰고 제일 뒤에서 항상 돈다** — 문서가 어긋난 것과
타입이 갈린 것은 서로를 무의미하게 만들지 않는다.

🔴 **⑦ 은 시험이 아니라 눈 판정에서 나왔다** (`03fb4f1`). 자리를 하나로 만든 뒤 STATUS 를
다음 바퀴처럼 훑어 읽으니, 지난 바퀴 기록 셋이 각자 `**다음 바퀴의 일**: FINDINGS 97 …` 을
**그때의 지목**으로 들고 있었다(가리키는 98·97·94 는 전부 닫힘). 정본 모양이 아니라
게이트에는 안 걸리는데 **훑는 눈에는 똑같이 보인다.**
★ **「자리를 하나로 만들었다」와 「그 자리처럼 보이는 것이 하나다」는 다른 질문이다.**

**2-B 47바퀴 라운드** (`102-B`): `ROLE_RANK` 2종은 ①② 다 살아 있다(뒤집으니 웹 시험
**106개**가 빨개졌다). `SCOPE_ORDER` 3종은 **「살아 있는데 아무도 안 잠갔다」** — 뒤집어도
**147개가 전부 초록**인데 조건을 만들면 산출물이 갈린다. **103** 으로 냈다.
★ **2-B 의 답은 셋이다** — 살아 있다 / 죽었다 / **살아 있는데 안 잠겼다.** 셋째가 제일
위험하다: 죽은 것은 고쳐도 아무 일이 안 나지만, **안 잠긴 산 것은 고치면 조용히 산출물이
바뀌고 CI 는 초록**이다. ②단계에서 「시험이 빨개졌나」와 「산출물이 갈렸나」를 **따로** 물어라.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다):
FINDINGS **103** (구멍) — 99·100·101 (격차) 보다 위다. 순서는 항상 고장 → 구멍 → 격차다.


### 지난 바퀴 (46) — 아키텍처 다섯 줄이 §7 그림의 흐름 순서로 섰다 (FINDINGS **98** · `9f81396`)

**46바퀴는 아키텍처 다섯 줄이 §7 그림의 흐름 순서를 잃고 이름 순으로 서던 것을 고쳤고,
그 전에 「`priority` 를 읽는 순서로 써도 되나」에 먼저 답했다** (FINDINGS **98** · `9f81396`).

🔴 **무엇이 문제였나.** Pack 의 `## Quick Map` 과 `.claude/rules/architecture.md` 의
다섯 줄이 **ledger → payment → psp → refund → webhook** 이었다. 원문(goals.md §7)은
**payment → psp → webhook → refund → ledger** 이고 **그 순서가 그 문단의 뜻**이다
(「`payment` 는 PSP 를 직접 부르지 않고 `psp` 를 거친다」). 종이에서는 돈이 흐르는
화살표가 알파벳 목록이 됐다. 원인은 씨앗의 다섯이 전부 `priority: 60` 이라
정렬이 제목 코드포인트 순으로 떨어진 것이다.

🔴 **이 항목도 「고치지 마라」가 답일 수 있던 항목이다** — 그래서 **먼저 답을 쟀다.**
항목이 경계한 것은 「`priority`(우선순위)를 **읽는 순서**로 쓰면 다음 사람이 더 헷갈린다」였다.
**답은 「써도 된다」이고 이유가 하나 있다: `priority` 는 같은 타입 안에서만 견줘진다.**
읽는 곳이 둘인데 둘 다 타입 안에서만 본다 —
① 절(section)이 타입별로 갈려 있어 정렬은 그 절 안에서만 일어나고
(`compiler/src/partition.ts` — `quickmap`·`architecture` 절은 `architecture` 항목만 받는다),
② 150개 절삭도 「**type별** priority 상위」다 (SPEC §7.3 · `lib/ai/conflict.ts` 는
바뀐 항목과 **같은 타입**만 후보로 싣는다).
그래서 아키텍처 줄에 70~66 을 줘도 policy·goal 을 제치는 일이 **구조적으로 없다.**

⚠ **SPEC 은 이 뜻을 어디에도 안 적고 있었다** — §3 의 스키마에도 §4.1 의 정렬에도
「priority 가 무슨 뜻인가」가 한 줄도 없었다. 그래서 답을 정본 **두 곳**에 적었다:
`packages/schema/src/item.ts` 의 필드 옆(정의 자리)과 `docs/SPEC.md` §4.1 3단계(의도 자리).
**컴파일러는 안 고쳤다** — 정렬은 P4 의 심장이고 지금 맞다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| Quick Map · `architecture.md` 순서 | `ledger→payment→psp→refund→webhook` | **`payment→psp→webhook→refund→ledger`** |
| 태그의 문자 범위 | `#3466 → #3283 → …` (뒤죽박죽) | **`#3283 → #3338 → #3377 → #3423 → #3466`** (단조 증가) |
| 아키텍처 항목의 `priority` | 다섯 다 **60** | **70~66** (표의 줄 번호에서 뽑는다) |
| `priority` 의 뜻이 적힌 곳 | **0곳** | **2곳** (schema 필드 옆 · SPEC §4.1) |
| 관통 검사 | 644 | **645** |
| CI | — | principles OK · typecheck OK · test 69 · build OK · walkthrough 645 → **GREEN** |

★ **문자 범위가 단조 증가한다**는 것이 이번 바퀴의 진짜 측정이다 — 순서가 맞는지를
눈이 아니라 **숫자로** 볼 수 있다는 뜻이다. 종이가 원문의 순서를 그대로 따른다.

**고친 자리는 한 줄이다.** `ARCHITECTURE` 표는 이미 §7 순서였다. `priority` 를 **줄
번호에서 뽑는다** (`ARCHITECTURE_TOP_PRIORITY - i`). 손으로 칸을 채우게 하면 여섯째
줄을 더한 사람이 그 칸만 빠뜨리고 **그 줄만 조용히 뒤로 간다.** 꼭대기를 고정해서
줄을 더해도 이미 있는 값이 안 움직인다.

**게이트** (`apps/web/scripts/walkthrough-publish.ts`): 「씨앗 표에서 온 항목이 표에
적힌 순서 그대로 종이에 서는가」. 기대 순서는 `ARCHITECTURE` 를 **읽기만** 하고
(두 곳에 적으면 표에 줄을 더한 사람이 검사 쪽 목록을 고쳐서 초록을 만든다),
**파일 이름도 안 적는다** — Manifest 에서 그 항목들이 실린 파일을 찾는다(두 개다).
🔴 **빨개지는 것을 봤다**: `priority` 를 다섯 다 같게 되돌리니 두 파일을 **이름으로
짚으며** FAIL 했다 (`.claude/rules/architecture.md: item_arch_ledger → …` · `CLAUDE.md: …`).
되돌린 뒤 복구했다.

⚠ **플러그인 번들이 한 번 빨개졌다** — `packages/schema` 에 **주석만** 더했는데
번들 바이트가 갈렸다 (`plugin/…/test/bundle.test.ts`). esbuild 가 주석을 싣는다.
`pnpm --filter @contextops/plugin build` 를 돌려 같이 커밋했다.
★ 다음 바퀴가 알아 둘 것: **schema 는 주석 한 줄만 고쳐도 번들을 다시 만들어야 한다.**

**눈 판정** — 관통을 다시 돌려 나온 Pack 을 읽었다. Quick Map 과 `architecture.md` 가
둘 다 §7 그림 순서이고, 두 파일의 순서가 서로 같다.
📎 `docs/evidence/2026-09-05-arch-order/` (`.ci/` 밖 · 사본 2개)

**2-B 46바퀴 라운드** (`100-B`): 이번에는 **`apps/web` 의 작은 표**를 돌았다 — 지난
라운드들이 `schema`·`compiler`·`plugin` 의 큰 enum 에 몰려 있었다.
`SEMVER_RULE` 3종 · `CACHE_CONTROL` 2종 **둘 다 ②단계까지 살아 있다.**
`minor` 의 설명 문장을 `patch` 와 같게 하니 「세 등급이 서로 다른 값을 낸다」가,
`immutable` 을 `'no-cache'` 로 바꾸니 「{semver} manifest 는 불변 캐시다」가 빨개졌다.
둘 다 되돌렸다.
⚠ (참고) **`AI_FEATURES` 4종은 절반만 제품 경로에 있다** — `ask`·`demo` 는 `withBudget`
호출부가 **0곳**이다. **새 고장이 아니다**: 49 의 ✅ 줄이 이미 적어 뒀고 주인은 §7.3·§7.4 다.

🔴 **이번 바퀴에 새로 밟은 것 하나 — 종이가 아니라 「이 파일」에서 나왔다**

- **FINDINGS 102 [고장]** — 🔴 **이 파일이 자기와 어긋난다.** 다음 할 일을 말하는 자리가
  **둘**이고 둘이 다른 말을 한다: 머리의 「다음 바퀴의 일」(지금 **99**)과
  `## 다음 바퀴가 할 일` 절(733줄, 「🔴 **맨 위는 `97` 이다**」 + 「시작하기 전에 아는 것(97)」
  20여 줄). **97 은 44바퀴에 닫혔다**(`7ba2feb`) — **두 바퀴가 그 절을 지나쳤다.**
  `loop/PROMPT.md` ②표가 이 파일을 「**전체**」 읽으라고 지목하므로, 아래까지 읽는 바퀴는
  **닫힌 항목을 다시 연다.**
  쟀다: `## ` 절이 7개인데 **`## 잰 것` 이 두 번**(1060·1075줄) · `**N바퀴 · ` 블록이 **21개**
  (24~36바퀴는 `## 잰 것` 아래, 37~45바퀴는 `### 지난 바퀴 (N)` 로 머리에 — **같은 역사를 두
  형식으로 두 곳에** 들고 있다) · **199,431바이트 · 2,250줄**.
  ★ 크기가 고장이 아니라 **어긋남**이 고장이다. 크기는 그 어긋남이 생긴 이유다 —
  아무도 끝까지 안 읽는 자리라서 손이 안 닿았다.
  ⚠ 고칠 때 **규칙을 더하지 말고 자리를 없애라.** 그리고 게이트를 같이 올려라 —
  「STATUS 가 다음 할 일로 지목한 `FINDINGS N` 이 하나이고 그 N 이 **대기**인가」.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다): **102**([고장]) 하나 · 그 다음이 [격차] 셋(**99**·**100**·**101**).

---

### 지난 바퀴 (45) — 관통 단계 산출물의 정본을 하나 만들었다 (FINDINGS **96** · `92a5f57`)

**45바퀴는 관통 단계 셋이 각자 복사해 들고 있던 `check()` 와 산출물 모양을
정본 하나로 모았다** (FINDINGS **96** · `92a5f57`).

🔴 **무엇이 문제였나.** `tools/walkthrough.ps1` 은 스스로 「관통의 계약」이라고 적어 뒀는데,
그 계약의 **나머지 절반**(단계가 무엇을 남기나)이 어디에도 없었다.
`walkthrough-publish.ts` · `walkthrough-payload.ts` · `walkthrough-sync.ts` 가
글자까지 같은 6줄을 각자 들고 있었고, 산출물 키는 셋 다 달랐다
(`{checks,coverage,versions,pack_dir}` · `{checks,failed}` · `{at,pack,checks}`).
산출물 **파일 이름**은 스크립트와 단계 표 **두 곳**에 손으로 적혀 있었다 (× 3 = 6군데).

🔴 **이 항목은 「고치지 마라」가 답일 수도 있던 항목이다** — 그래서 값을 먼저 쟀다.
항목이 경계한 것은 「공용 자리를 만들면 `schema ← compiler ← web/plugin` 의존 방향에
개발 도구를 얹게 된다」였다. **그 경계를 그대로 지켰다**: `packages/schema` 가 아니라
**`tools/walkthrough-stage.ts`** 를 냈다. 이 계약을 **읽는 쪽**이 `tools/walkthrough.ps1`
이고, 제품의 공개 API 는 좁게 둔다 (`CLAUDE.md`).
셋을 한 파일로 합치지도 **않았다** — 단계가 갈라져 있는 것이 관통의 계약이다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| `function check` 복사 | **3** | **0** |
| 산출물 파일 이름이 적힌 곳 | **6** (스크립트 3 + 단계 표 3) | **3** (`openStage('<이름>')` 인자뿐) |
| 산출물 키 | 셋 다 다름 | `{at, stage, checks, …단계별 칸}` |
| publish 가 「검사 N개」를 찍나 | **안 찍음** | 찍는다 |
| 세 스크립트 | — | **-62줄 / +20줄** (새 정본 +81줄, 절반이 왜-주석) |
| 관통 검사 | 644 | **644** (검사를 더하거나 뺀 것이 아니다) |
| TS 소스 덮임 | 208 | **211개 전부** (새 파일도 검사 안) |
| CI | — | principles OK · typecheck OK · test OK · build OK · walkthrough 644 → **GREEN** |

**게이트** (`tools/walkthrough-stage.ts` + `tools/walkthrough.ps1`): 산출물이 `stage`
도장을 찍고, 관통이 그것이 **그 단계 이름과 같은지** 본다. 손으로 만든 산출물은 그 칸이
없어서 「검사 수를 못 셌다」로 **FAIL** 한다 — 정본을 안 쓰면 초록이 안 나온다.
🔴 **빨개지는 것을 봤다**: 도장을 `${name}-tampered` 로 바꾸니 publish 가 FAIL 하고
뒤 세 단계가 전부 SKIP 됐다 (`관통이 [publish] 에서 막혔다`). 되돌린 뒤 복구했다.

**2-B 45바퀴 라운드** (`99-B`): 이번에는 **`plugin/` 의 표**를 돌았다 — 지난 라운드들이
`schema`·`compiler` 에만 몰려 있었다. `EXIT` 7종 · `COMMANDS` 8종 **둘 다 ②단계까지
살아 있다.** `NETWORK: 20 → 21` 로 바꾸니 시험 **3개**가 빨개졌고(도움말 · Skill · 번들),
`status` 키를 `stat` 으로 바꾸니 **10개**가 빨개졌다. 둘 다 되돌렸다.
★ `EXIT` 의 값은 **소비처가 셋**이라는 것이 값이다 — 그 숫자를 읽는 것은 사람이 아니라
도움말 · Skill 문서 · 번들이다.

🔴 **이번 바퀴에 새로 밟은 것 둘 — 둘 다 종이(Pack)에서 나왔다**

- **FINDINGS 100 [격차]** — **99 는 아키텍처만이 아니었다.** `## Goals` 의 한 줄이
  `- **결제 승인 성공률 99.5%** — 결제 승인 성공률 99.5% · …` 로 **같은 문장을 두 번**
  적는다 (씨앗의 `title` 과 `data.outcome` 이 글자까지 같다). `## Roadmap` 은
  `**PL-M1 M1 — …**` 로 「M1」이 두 번이다.
  ⚠ **99 를 아키텍처만 보고 닫지 마라** — 고칠 자리가 같고(씨앗의 제목 칸), 한 절만
  고치면 나머지가 남는다. 30·91·97 이 세 번 적힌 이유가 「같은 고장의 다른 자리」다.
- **FINDINGS 101 [격차]** — Pack 이 `지표: 주간 승인 성공률` 이라고 하는데 그 문자열은
  **픽스처 문서 어디에도 없다** (원문 칸은 「PSP 장애 구간을 포함한 주간 성공률」).
  범위는 맞다 — **90(범위가 원문을 안 가리킨다)과 다른 고장**이고, 옮겨 적은 낱말이 다르다.
  「환각 차단」이 이 제품의 말인데 데모가 그 말을 흐린다.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다): 대기는 넷이고 전부 [격차]다 — **98**(아키텍처 다섯 줄이 §7 의 흐름
순서를 잃고 이름 순) · **99**(아키텍처 블록의 메아리) · **100**(위) · **101**(위).
대장 순서대로 **98** 이 맨 위다.
⚠ **99 와 100 은 한 바퀴에 같이 고쳐라** — 같은 고장의 다른 절이고 고칠 자리가 같다.
⚠ 98 은 「고치지 않는 것」이 답일 수 있다 — 그 항목이 적어 둔 대로 `priority` 가
「읽는 순서」로 쓰여도 되는 값인지 **SPEC §3 을 먼저 읽어라.**

---

### 지난 바퀴 (44) — `domain-{slug}.md` 가 어느 도메인인지 본문에 안 적었다 (FINDINGS **97**·**91**·**30** · `7ba2feb`)

**44바퀴는 `domain-{slug}.md` 가 어느 도메인인지 본문에 한 번도 안 적던 것을 고쳤고,
그것을 게이트로 올렸다** (FINDINGS **97** · **91** · **30** · `7ba2feb`).

🔴 **무엇이 문제였나 — 그리고 왜 이번 바퀴의 핵심이 「고친 것」이 아닌가.**
`.claude/rules/domain-refund.md` 본문에 「refund」라는 낱말이 **하나도 없었다.**
어느 도메인 규칙인지 아는 길이 **파일 이름뿐**이라, 심사자가 한 파일만 화면에 띄우거나
agent 가 한 조각을 인용하는 순간 그 정보가 사라진다. 고치는 데 든 것은 **템플릿 한 줄**이다
(`head: (v) => ['# 도메인', notice(v)]` → `` `# 도메인 — ${v.title}` ``).
재료(`DocVars.title`)는 **처음부터 채워져 있었다** — 아무도 안 읽었을 뿐이다.

🔴 **한 줄짜리 고장이 세 번 적히고 34바퀴를 살았다.**
**30**(9바퀴) → **91**(39바퀴) → **97**(43바퀴). 셋 다 같은 줄이고, 셋 다 「고칠 방향」까지
정확히 같았다(`# 도메인 — ${title}`). 30 은 원인(「domain 항목이 없는 프로젝트가 이 고장을
만든다」)까지 맞혔다. **그런데 세 바퀴가 적기만 하고 안 고쳤다.**
→ 이게 이번 바퀴가 남길 교훈이다: **대장에 적는 것은 고치는 것이 아니다.**
그래서 고치는 것으로 끝내지 않고 게이트를 세웠다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| `domain-refund.md` 에 「refund」 | **0번** | 1번 (첫 줄) |
| 같은 갈래 파일 둘의 머리말 | `domain-payment.md` 만 이름을 말함 | **둘 다** 말함 |
| 이 규칙을 재는 시험 | **없음** (세 바퀴가 눈으로만 봤다) | `test/naming.test.ts` **5개** |
| `TEMPLATE_VERSION` | 1.1 | **1.2** (golden 3케이스 input/expected 갱신) |
| 관통 검사 | 639 | **644** |
| CI | — | principles OK · typecheck OK · test OK · build OK · walkthrough 644 → **GREEN** |

**게이트가 재는 것 둘** (`packages/compiler/test/naming.test.ts`):

1. **대상을 표에서 찾는다** — `DOCS[id].path('a') !== DOCS[id].path('b')` 인 문서,
   즉 **파일 이름이 정보를 나르는 문서**가 전부 대상이다. 그 문서의 `head` 가 `title` 을
   적는지 본다. ★ 왜 이름 목록을 안 드나 — 목록을 손으로 들면 **다음 문서 종류에서
   똑같이 빠진다.** 이 고장이 세 번 난 이유가 그거다.
   ⚠ `paths` 를 제목과 **다르게** 줘서 `scoped` 의 frontmatter(`paths:`)가 우연히
   초록을 만드는 것을 막았다 — 재는 것은 `title` 이다.
2. **91·97 의 조건을 그대로 컴파일한다** — `scope.kind:'domain'` 규칙만 있고 그 도메인의
   `domain` **항목은 없는** snapshot. 이름을 적을 사람이 아무도 없던 바로 그 경우다.

🔴 **빨개지는 것을 봤다**: `head` 를 옛 모양으로 되돌리니 **2개 FAIL**
(머리말 시험 + 컴파일 시험). 되돌린 뒤 복구했다.

**golden 을 갱신한 이유**(`loop/PROMPT.md` ⑤): 머리말 한 줄이 바뀌어서다. 바뀐 것은
domain 파일 **3개의 첫 줄**과 그 `sha256`·`manifest_hash`·`template_version` **뿐**이고
diff 를 눈으로 대조했다. `input.json` 의 `templateVersion` 도 같이 올렸다 —
`CompileInput.templateVersion` 이 `z.literal(TEMPLATE_VERSION)` 이라 안 올리면
`INVALID_INPUT` 으로 막힌다(그 자체가 「템플릿을 고치면 버전을 올려라」의 기계 검사다).

**눈 판정** — 관통을 다시 돌려 나온 Pack 을 읽었다. `domain-refund.md` 첫 줄이
`# 도메인 — refund` · `domain-payment.md` 는 `# 도메인 — payment` 이고 그 아래
`## payment` 절과 **층이 다르다**(파일 제목 · 절 제목). `scoped-src-webhook.md` 의
`# 경로 규칙 — src/webhook` 과 모양이 같아졌다.
📎 `docs/evidence/2026-09-05-domain-name/` (`.ci/` 밖 · 사본 3개)

**2-B 44바퀴 라운드** (`98-B`): 이번에는 **컴파일러의 표**를 돌았다 (지금까지 라운드가
`packages/schema` 쪽에만 몰려 있었다). `DocId` 7종 · `SectionKey` 12종 **둘 다 ②단계까지
살아 있다.** 일곱째 문서 `policies` 는 평소 컴파일에 안 나오는데 **죽은 게 아니라
조건이 있는 것**이다 (CLAUDE.md 12,000자 초과 · golden `case-3-overflow` 에 있다).
`SectionKey` 는 슬롯에 없는 절 0개 · 아무 항목도 못 가는 절 0개다.

🔴 **44바퀴에 새로 밟은 것 하나**

- **FINDINGS 99 [격차]** — 아키텍처 다섯 블록이 **같은 문장을 연달아 두 번** 적는다.
  `### ledger — append only 다…` 바로 아래에 `- 책임: append only 다…` 가 글자까지
  똑같이 또 나온다 (구성요소 이름도 두 번). **네 줄이 말하는 사실은 둘**이다.
  원인은 씨앗의 제목(`seed.ts:396` 이 `` `${component} — ${responsibility}` ``)과
  절 템플릿(`sections.ts:115`)의 **조합**이다 — 둘 다 혼자서는 맞다.
  ⚠ **템플릿을 씨앗에 맞춰 깎지 마라** — 제목이 「구성요소 — 책임」인 것은 이 픽스처의
  선택이고, 다른 팀의 항목은 제목이 다르다. 씨앗 표에 **제목 칸 하나**가 값싸다.

---

### 지난 바퀴 (43) — 데모 Pack 이 `ItemType` 10종 중 다섯만 보여 줬다 (FINDINGS **94** · `8b96ef5`)

**43바퀴는 데모 Pack 이 `ItemType` 10종 중 다섯만 보여 주던 것을 일곱으로 만들고,
안 서는 셋 중 하나는 「구조적으로 못 선다」는 것을 표 옆에 못 박았다**
(FINDINGS **94** · `8b96ef5`).

🔴 **무엇이 문제였나.** 표는 살아 있었다 — 94-B 가 `ItemType` 10종을 ②단계까지 쟀고
`liveness.test.ts` 가 「열 타입이 서로 다른 줄을 낸다」를 여러 바퀴 초록으로 잠갔다.
그런데 **심사자가 읽는 종이**에 서는 타입은 다섯뿐이었다. CLAUDE.md 에 `## Quick Map`
절이 통째로 없었고 `.claude/rules/architecture.md` 라는 Pack 파일 갈래가 아예 없었다 —
「이 코드가 어느 구성요소인가」가 종이에 **한 줄도** 없었다는 뜻이다.
**89·93 과 같은 모양의 셋째 표다.**

**잰 것:**

| | 전 | 후 |
|---|---|---|
| 종이에 서는 `ItemType` | **5** (mission·goal·roadmap·policy·constraint) | **7** (+ architecture · domain) |
| Pack 파일 (manifest) | **4** | **6** (+ `architecture.md` · `domain-payment.md`) |
| CLAUDE.md 의 `## Quick Map` | **없음** | 5줄 (§7 그림 다섯 구성요소) |
| 씨앗 항목 | 9 | **15** |
| `PACK_COVERAGE` 의 `ItemType` min | 5 | **7** (축은 그대로 넷) |
| 관통 검사 | 639 | **639** (새 `check()` 를 안 더했다 — 축 검사는 표를 읽는다) |
| CI | — | principles OK · typecheck OK · test 69 · build OK · walkthrough 검사 639개 → **GREEN** |

⚠ **커밋 `8b96ef5` 의 메시지는 Pack 파일을 「5 → 7」로 적었는데 틀렸다.** manifest 를
직접 세면 **4 → 6** 이다. 93 의 「4 → 5」를 **안 세고 이어 적어서** 났다 —
**95 가 고친 고장(숫자를 재지 않고 이어 적기)과 같은 종류**이고, 고친 바로 다음 바퀴에
같은 손버릇이 나왔다. FINDINGS 94 에 정정을 적었다. **숫자는 이어 적지 말고 세라.**

**바꾼 것 넷:**

1. **`architecture` 5종** — goals.md §7 「아키텍처 한 장」의 다섯 줄을 그대로 올렸다
   (payment·psp·webhook·refund·ledger). 지어낸 문장이 하나도 없다.
   ★ 다섯을 다 넣은 이유 — §7 은 **한 장짜리 그림**이다. 둘만 넣으면 Quick Map 이
     그림의 일부만 그리고, 빠진 셋이 **없는 건지 안 옮긴 건지** 심사자가 모른다.
   ★ `ARCHITECTURE` **표 하나**로 모았다 (다섯이 글자만 다르고 모양이 같다) —
     구성요소를 하나 더하는 절차가 「이 표에 한 줄」이다.

2. **`domain` 1종** — goals.md §6 용어 표에서 왔다 (`domain-payment.md`).
   glossary 5개·불변식 2개가 **그 표 안에 글자 그대로** 있다.
   ⚠ `scope.kind='domain'` 이 만드는 `domain-refund.md` 와 **다른 축**이다.

3. **경로를 적지 않고 잰다** — `fixtureDir()` 이 `fixtures/paylab-api/src/{component}`
   가 정말 있는지 보고 없으면 **던진다.** 손으로 적으면 픽스처가 바뀌었을 때 조용히
   없는 폴더를 가리킨다 (90 과 같은 고장의 **코드 쪽 판**).

4. **게이트는 `min` 한 칸** — 93 이 만든 `PACK_COVERAGE` 의 `ItemType` 줄을 5 → 7 로
   올린 것이 전부다. **관통(`walkthrough-publish.ts`)은 한 줄도 안 고쳤다** — 축이
   늘어도 검사를 복사하지 않는다는 93 의 설계가 이번 바퀴에 실제로 값을 냈다.

🔴 **94 가 적은 고칠 방향 하나가 틀렸다 — `open_question` 은 못 세운다.**
§5 「아직 정하지 못한 것」에 원문이 있어도 `compiler/src/partition.ts:118` 이 그 타입을
`exclude` 로 보낸다(「답이 없는 질문을 규칙처럼 배포하지 않는다」 — **고장이 아니라 설계**).
**이 축의 최대치는 10 이 아니라 9 다.** 그 이유를 `PACK_COVERAGE` 의 그 줄 옆에 적었다 —
다음 사람이 씨앗에 넣어 보고 「왜 안 오르지」로 한 바퀴를 쓰지 않게.
남은 `adr`·`workflow` 는 픽스처 문서에 **원문이 없다** (문서를 먼저 늘려야 한다 · 89 의 규칙).

**빨개지는 것을 두 번 봤다**: ① 구성요소 이름을 없는 폴더로 바꾸니
「`paylab-api/src/ledgerX` 폴더가 픽스처에 없다」로 씨앗이 던졌다 ·
② architecture 항목을 빼니 「Pack 이 항목 종류(ItemType) 를 **6갈래**로 보여 준다
(최소 7) — 없는 갈래: architecture · adr · workflow · open_question」로 FAIL · exit 1.

**눈 판정** — 나온 Pack 여섯 파일을 다 읽었다. `architecture.md` 는 다섯 구성요소가
각각 책임·경로를 말하고 줄마다 태그가 붙어 있다. `domain-payment.md` 는 용어 5개와
불변식 2개를 낸다. 사본을 `.ci/` 밖에 뒀다 —
📎 `docs/evidence/2026-09-04-itemtype-coverage/` (CLAUDE.md · architecture.md ·
domain-payment.md · domain-refund.md)

**2-B 43바퀴 라운드** (`97-B`): `MILESTONE_STATUSES` 4종은 ②단계까지 살아 있다
(`RANK` 표가 정본 · 네 값이 다 나오고 `done` 은 **표 밖에서** 사람의 confirm 으로만 온다 —
그게 P5 의 자리다). `PROGRESS_SOURCES` 3종은 **85-B 그대로** 값으로 갈리는 코드가 0곳인데,
**죽은 표가 아니라 읽을 화면이 아직 없는 것**이다 (PLAN 「웹 화면 6·8」 · 8·69 와 같은 갈래).
쓰는 자리는 둘이 진짜로 있다 — `hook`(`stop.mjs:166`) · `agent`(`cli/progress.ts:98`).

🔴 **이번 바퀴에 새로 밟은 것 둘**

- **FINDINGS 97 [구멍]** — `domain-refund.md` 가 **어느 도메인인지 본문에 한 번도
  안 적는다.** 「`# 도메인`」 → 「`## 이 도메인의 규칙`」뿐이고 「refund」라는 낱말이
  파일 안에 없다. 아는 길은 파일 이름뿐이라 **발췌하는 순간 사라진다.**
  ⚠ **94 를 고치기 전에는 안 보였다** — 이번에 이름을 적는 `domain-payment.md` 가
  옆에 생겨서 같은 갈래 파일 둘 중 **한쪽만 이름을 말한다**는 것이 드러났다.
  머리말이 쓸 재료(`DocVars.title`)는 **이미 채워져 있다.**
- **FINDINGS 98 [격차]** — 아키텍처 다섯 줄이 §7 그림의 **흐름 순서를 잃고 이름 순**
  으로 나온다 (다섯이 전부 `priority: 60` 이라 제목 순으로 떨어진다).
  ⚠ **정렬을 고치지 마라 — 그건 P4 의 심장이고 지금 맞다.** 순서를 말하는 자리는
  `priority` 이고, 그 값이 「중요도」인지 「읽는 순서」인지를 SPEC §3 에서 먼저 읽어라.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다): FINDINGS **97** (구멍) — 96·98 (격차) 보다 위다.
순서는 항상 고장 → 구멍 → 격차다.

---

### 지난 바퀴 (42) — 관통이 「검사 몇 개를 돌았나」를 안 찍었다 (FINDINGS **95** · `843bfd1`)

**42바퀴는 관통이 「검사 몇 개를 돌았나」를 아무 데도 안 찍던 것을 고쳤고,
그것을 못 세는 단계를 FAIL 로 만드는 게이트를 세웠다** (FINDINGS **95** · `843bfd1`).

🔴 **무엇이 문제였나.** 단계가 내는 것이 `note = "3초"` 하나였다. 검사 개수를 내는
줄이 어디에도 없었고, 칸 이름이 `note` 라 개수처럼 읽혔다. 그래서 **이 STATUS 가
세 바퀴 동안 그 초를 개수로 옮겨 적었다** — 38바퀴 「72 → 73개」·39바퀴 「73 → 75개」가
전부 초다. 그때 실제 publish 검사는 20개 안팎이었다.
**숫자가 커서 그럴듯하게 읽히는 종류의 거짓말**이고, 기계가 아니라 사람이 만든 거짓말이다.
⚠ 지난 절들의 틀린 숫자는 **고치지 않았다** — 그때 무엇을 봤는지의 기록이다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| 관통이 내는 검사 개수 | **없다** (초만 있다) | 단계별 + 합계 **639** |
| 단계 산출물의 칸 | `note`(초) 하나 | `sec`(초) · `checks`(개수) **따로** |
| 검사 수를 세는 자리 | — | 단계 표 한 칸 (`count_json` / `count_log`) |
| 못 세는 단계 | 조용히 초록 | **FAIL** (빨개지는 것을 봤다) |
| CI 한 줄의 walkthrough | `72초` | `검사 639개 · 72초` |
| CI | — | principles OK · typecheck OK · test OK · build OK · walkthrough OK → **GREEN** |

단계별 검사 수 — fixture **20** · compile **142** · api **377** · publish **25** ·
scan **49** · payload **10** · sync **16** · shots SKIP.
⚠ **이 639를 「관통 시나리오 검사 639개」로 읽지 마라.** 단위가 섞여 있다 —
compile·api 는 vitest 테스트 수이고 publish·payload·sync 는 관통 단계의 검사 수다.
**다음 바퀴는 합계만 적지 말고 단계별로 적어라** (`.ci/walkthrough.json` 이 그렇게 낸다).
이 항목이 고친 고장이 바로 「합쳐 놓으니 무엇을 센 건지 아무도 몰랐다」이다.

**바꾼 것 넷:**

1. **단계 표에 칸 하나** (`tools/walkthrough.ps1`) — `count_json`(산출물 JSON 의
   `checks` 배열 길이 · publish·payload·sync) / `count_log`(그 단계 로그의 정규식
   첫 캡처 그룹 · fixture·vitest·scan).
   ★ **수의 정본은 각 단계의 산출물이고 관통은 읽기만 한다.** 관통에 수를 한 번도
     적지 않았다 — 두 곳에 적으면 한쪽만 고쳐지고 그 칸이 다시 거짓말을 한다.

2. **초와 개수를 다른 칸에 담았다.** `.ci/walkthrough.json` 이 `stages[].sec` 과
   `stages[].checks` 를 따로 내고 맨 위에 합계 `checks` 를 낸다. `note` 는 이제
   실패·SKIP 사유만 담는다. **이 고장은 한 칸에 담아서 났다.**

3. **게이트** — 단계가 지났는데 **몇 개를 쟀는지 말을 못 하면 FAIL** 이다.
   ★ 0 으로 떨어뜨리지 않는 이유 — 0 은 「검사가 0개였다」와 「셀 줄 몰랐다」를 같아
     보이게 한다. 그 침묵이 이 항목의 고장 그 자체다.
   🔴 **빨개지는 것을 봤다**: fixture 의 정규식을 안 맞는 것으로 바꾸니
   「검사 수를 못 셌다 — 이 단계의 count_json/count_log 를 표에 적어라」로 FAIL,
   뒤 단계 전부 SKIP, exit 1.
   ⚠ **이번 관통이 낸 것만 센다** — 단계를 돌리기 전에 그 단계의 산출물 JSON 을 지운다.
   남아 있으면 막힌 단계가 지난 바퀴의 검사 수를 자기 것처럼 보고한다.

4. **`walkthrough-scan.ts` 가 자기 검사 수를 찍는다** (그 단계 산출물은 CLI 가 쓰는
   `ScanResult` 라 `checks` 를 담을 자리가 없다). 수는 손으로 안 적고 파일 목록에서
   센다 — 픽스처가 늘면 따라 늘어야 한다. `ci.ps1` 의 walkthrough 층도 「검사 N개 · M초」로
   찍고, 못 읽으면 `?` 다 (0 은 「검사가 없었다」로 읽힌다).

**2-B 42바퀴 라운드** (`96-B`): `CONFLICT_KINDS` 6종 · `PROGRESS_STATUSES` 4종 둘 다
②단계까지 살아 있다. 전자는 `CONFLICT_KIND_RULES` 표에서 `DETECTED`(4) ·
`QUESTION`(2) 목록이 **타입으로 파생**되고 카드·프롬프트·칩이 갈래마다 다른 것을 낸다.
후자는 `PROGRESS_EFFECT` 가 네 값을 **세 갈래**로 접고, 표에 `done` 이 없는 것이 P5 의
자리다(보고만으로는 done 이 안 된다).

🔴 **이번 바퀴에 새로 밟은 것 (FINDINGS 96 · [격차])** — 관통 스크립트 셋이
`check()` 6줄을 **글자까지 같게 각자 복사**해서 들고 있다
(`walkthrough-publish.ts:45` · `walkthrough-payload.ts:42` · `walkthrough-sync.ts:34`).
95 를 고치면서 관통이 그 JSON 의 `checks` 모양에 의존하게 됐는데 그 모양의 정본이 없다.
⚠ 세 파일은 **패키지가 둘**이라(`apps/web` · `plugin/contextops`) 공용 자리를 만드는 것이
의존 방향에 개발 도구를 얹는 일이 된다 — 값이 그만한지 먼저 재라. FINDINGS 96 에 적었다.

**그 바퀴가 다음으로 지목한 것** (그때의 기록이다 · 지금의 지목은 머리 한 줄뿐이다): FINDINGS **94** (데모 Pack 이 `ItemType` 10종 중 다섯만 보여 준다 ·
`PACK_COVERAGE` 의 `ItemType` 줄 `min` 을 올리는 것) — 96 보다 위다.

---

### 지난 바퀴 (41) — 데모 Pack 이 근거를 두 갈래로만 말했다 (FINDINGS **93** · `ed30a89`)

**41바퀴는 데모 Pack 이 「이 줄이 어디서 왔나」를 두 갈래로만 말하던 것을 네 갈래로
만들고, 「데모가 표의 몇 갈래를 보여 주나」를 세는 게이트를 축마다 흩지 않고 표 하나로
모았다** (FINDINGS **93** · `ed30a89`).

🔴 **무엇이 문제였나.** 표는 살아 있었다 — 93-B 가 `SourceRef` 4종·`scope.kind` 3종을
②단계까지 쟀고 초록이었다. 그런데 **심사자가 읽는 종이**에는 근거가 `doc` 14개 ·
`proposal` 1개뿐이었다. `repo`(코드가 근거)와 `manual`(사람이 정리한 근거)이 데모에
한 번도 안 나왔고, scope 도 `project`·`domain` 뿐이라
**`.claude/rules/scoped-*.md` 라는 Pack 파일 갈래가 통째로 없었다.**
**89 와 정확히 같은 모양의 고장이고, 89 는 표 하나만 고쳤다.**

**잰 것:**

| | 전 | 후 |
|---|---|---|
| Pack 태그의 근거 종류 | **2** (`doc` 14 · `proposal` 1) | **4** (`doc` 15 · `repo` 2 · `proposal` 1 · `manual` 2) |
| scope 갈래 | 2 (`project`·`domain`) | **3** (`+ path`) |
| Pack 파일 | 4 | **5** (`+ .claude/rules/scoped-src-webhook.md`) |
| 갈래를 세는 상수·검사 | 축 하나(`PACK_ENFORCEMENT_MIN`) | **표 하나 네 줄**(`PACK_COVERAGE`) |
| 관통 publish 검사 | 21 | **25** |
| CI | — | principles OK · typecheck OK · test 68 · build OK · walkthrough OK → **GREEN** |

**바꾼 것 넷:**

1. **셋 다 지어내지 않고 픽스처에서 꺼냈다.**
   · `path` scope — goals.md §3.5 로 `item_policy_webhook_sig` 하나
     (경로 `src/webhook` 의 근거는 같은 문서 §7 아키텍처 그림).
   · `repo` 근거 — `item_policy_retry` 에 `src/payment/retry.ts:11-14` 한 칸.
     태그가 `doc:…,repo:…` 로 나오고 **「문서는 5회 백오프 · 코드는 3회 고정」이
     한 줄 안에서 눈에 보인다** (SPEC §10.1 「의도된 어긋남」의 첫째).
     🔴 줄 번호는 **적지 않고 잰다**(`withRepo` 가 `quote` 를 코드에서 찾아 계산) —
     손으로 적으면 90 을 코드 쪽에 그대로 다시 만든다.
     ⚠ 코드 본문은 서버로 안 간다 (P1 — 실리는 것은 repo·경로·줄 번호뿐).
   · `manual` 근거 — 🔴 **FINDINGS 93 이 적은 방향이 틀렸다.**
     `conflicts/{id}/resolve` 가 붙이는 `manual` 은 **진 항목**에 붙고 진 항목은
     `deprecated` 라 Pack 에서 빠진다 — 그 길로는 이 갈래가 **영원히 종이에 안 선다.**
     종이에 서는 길은 **씨앗 질문 답변**이고(LLM 없음 · `seedDraft`), 관통이 이제
     그 한 칸을 밟는다. 「문서가 없어도 답만 하면 항목이 된다」(화면 3 ③)가
     관통에서 **처음** 돌았다.

2. **게이트를 표 하나로 모았다** — `apps/web/scripts/pack-coverage.ts` 의 `PACK_COVERAGE`
   네 줄(`enforcement` · `SourceRef` · `scope.kind` · **`ItemType`**)이 정본이고
   관통은 **읽기만** 한다. 89 가 만든 `PACK_ENFORCEMENT_MIN` 은 지웠다.
   ★ 축마다 상수를 만들면 넷이 되고 관통에 검사가 네 벌 복사된다 —
     **축을 더하는 것이 「표에 한 줄」이어야 한다** (`CLAUDE.md`).
   ★ 각 줄에 **「지금 몇 갈래이고 왜 그 수인가」**가 적혀 있다. `all` 은 정본 패키지
     배열을 그대로 쓴다 — 베끼면 표가 늘어도 이 검사가 옛 갈래 수로 계속 초록을 낸다.
   🔴 **94 는 이제 「그 표의 `ItemType` 줄 `min` 을 5에서 올리는 것」이다.**

3. **표가 갈라질 자리 둘을 없앴다.**
   · `SRC_TAG` 를 `{prefix, body}` 로 바꾸고 `srcKindOf()` 를 그 표에서 **뒤집어** 만들었다.
     접두사를 되읽는 쪽에 다시 적으면 한쪽만 고쳐지고 **역추적이 조용히 끊긴다**
     (태그는 멀쩡한데 아무도 그 종류를 못 알아본다). 왕복을 `liveness.test.ts` 가 잠근다.
   · `byScope` 의 `if` 사슬을 `SCOPE_DOC` 표로 바꾸고 `scopePackPath()` 를 내보냈다 —
     「이 scope 는 어느 Pack 파일로 가나」를 답하는 자리가 하나가 됐다.

4. **관통이 코드 근거도 따라간다.** `repo:` 태그의 줄 범위를 픽스처 파일에서 잘라 보고
   그 줄이 있는지 센다 (90 이 문서 쪽에 세운 것을 코드 쪽에도 세웠다).
   기대값은 **(항목 × 근거 종류)** 단위로 센다 — 항목 단위로 세면 한 항목의
   **둘째 근거만** 빠지는 것이 안 보인다.

**빨개지는 것을 봤다** (④2-B ②단계) — 고장 셋을 되돌려 넣고 관통을 돌렸다: **4곳 FAIL.**
`path` scope 제거 → 「적용 범위 2갈래(없는 갈래: path)」 · 질문 답변 제거 →
「근거 종류 3갈래(없는 갈래: manual)」 + 「씨앗 질문에 답한 것이 항목이 됐다」 ·
줄 번호를 손으로 적기 → 「`retry.ts:1-2` 안에 그 줄이 없다」.

**눈 판정** — 나온 Pack 다섯 파일을 다 읽었다. Policies 세 줄이 **서로 다른 것**을 말한다:
강제 수단 두 갈래 · 근거 세 갈래(문서 · 문서+코드 · 사람의 답변) · severity 두 갈래.
근거는 전부 직접 따라가 원문을 잘라 봤다.
📎 `docs/evidence/2026-09-04-pack-coverage/coverage.md` (`.ci/` 밖 · 종이 사본 2개)

**2-B 41바퀴 라운드** (`95-B`): `ITEM_STATUSES` 4종은 ②단계까지 살아 있다
(`web-item-status.test.ts:62` 가 「네 상태가 서로 다른 화면을 낸다」를 잰다).
`PACK_TARGETS` 3종은 여전히 `claude` 하나뿐인데 **FINDINGS 8 이 이미 그 자리에 있고
게이트도 서 있다** — 죽은 표가 아니라 아직 안 만든 기능이다 (PLAN P5).

🔴 **그 바퀴에 새로 밟은 것 (FINDINGS 95 — 42바퀴에 닫았다 · `843bfd1`)** — 관통이 「검사 몇 개를 돌았나」를
**아무 데도 안 찍는다.** `ci.ps1` 도 `walkthrough.ps1` 도 찍는 것은 **경과 초**다.
그래서 이 STATUS 가 지난 세 바퀴 적어 온 **「관통 검사 72개 → 73개 → 75개」는 전부 초였다.**
실제 publish 단계 검사는 그때 20개 안팎이었다 (이번 바퀴에 21 → 25).
⚠ 지난 기록의 숫자는 **고치지 않았다** — 그때 무엇을 봤는지의 기록이다.

---

### 지난 바퀴 (40) — 타입 검사가 무엇을 봤나 (FINDINGS **92** · `95c525e`)

**이번 바퀴는 「타입 검사가 무엇을 봤나」를 아무도 안 세던 것을 고쳤고,
그것을 세는 게이트를 세웠다** (FINDINGS **92** · `95c525e`).

🔴 **무엇이 문제였나.** `apps/web/tsconfig.json` 의 `include` 가
`["*.ts", "src", "test", …]` 였고 `*.ts` 는 **맨 위 한 층**이다. 그래서 `scripts/` 가
통째로 빠져 있었다 — `seed.ts` · `walkthrough-publish.ts` · `dev-server.ts` ·
`dump-*.ts` **열 개**가 여러 바퀴 동안 타입을 한 번도 안 봤는데 `typecheck` 층은
계속 초록이었다. **관통을 만드는 코드**, 즉 「제품이 진짜로 도는가」를 증명하는 자리가
검사 밖에 있었다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| `tsc` 가 보는 `apps/web/scripts/` 파일 | **0개** | **10개** |
| 덮임을 세는 게이트 | 없음 | `tools/tsconfig-coverage.mjs` (`pnpm typecheck` 첫 줄) |
| 덮인 TS 소스 | 안 셌다 | **208개 / 208개** (프로젝트 5개 · 면제 `fixtures/` 하나) |
| 폴더 이름을 손으로 적는 `include` | 4곳 | **0곳** (전부 글로브) |
| 새로 드러난 미사용 변수(TS6133) | — | 3개 지움 |
| CI | — | principles OK · typecheck OK · test OK · build OK · walkthrough OK → **GREEN** |

**바꾼 것 셋:**

1. **`include` 를 글로브로 바꿨다** (`apps/web` · `packages/compiler` · `packages/schema` ·
   `plugin/contextops` 넷 다 `["**/*.ts", "**/*.tsx"]`).
   🔴 **「`scripts` 한 줄을 더한다」로 끝내지 않은 이유** — 그러면 **다음 폴더에서
   똑같이 빠진다.** 잊을 자리 자체를 없앤 것이다. 반대로 어떤 폴더를 검사에서 빼려면
   `exclude` 에 적는다: **빼는 것은 눈에 보여야 하고, 빠뜨리는 것은 안 보인다.**
   ⚠ `apps/web` 의 `next-env.d.ts` · `.next/types/**/*.ts` 두 줄은 그대로 뒀다 —
   next 가 스스로 써 넣는 줄이라 지우면 `next build` 가 다시 써서 working tree 가 더러워진다.

2. **덮임 게이트를 세웠다** — `tools/tsconfig-coverage.mjs`. 저장소의 모든 TS 소스가
   **어떤 tsconfig 에는** 들어 있는지 센다. `pnpm typecheck` 이 tsc 보다 **먼저** 부르므로
   `tools/ci.ps1` 과 `.github/workflows/ci.yml` 이 **둘 다 자동으로 받는다**
   (검사 명령의 정본은 루트 `package.json` 하나다 — 세 곳에 적으면 갈라진다).
   ★ include/exclude 글로브 규칙을 **다시 구현하지 않는다** — `tsc --listFilesOnly` 에게
     묻는다. 다시 구현하면 그 구현이 tsc 와 갈리는 순간 게이트가 거짓말을 한다.
   ★ 프로젝트 목록도 **적지 않고 찾는다**(`tsconfig.json` 을 훑는다). 목록을 손으로 들면
     새 패키지가 조용히 검사 밖에 선다 — 이 게이트가 막으려는 고장 그 자체다.
     tsconfig 가 아예 없는 새 패키지도 잡힌다(그 소스가 어느 목록에도 안 나온다).
   🔴 **빨개지는 것을 두 번 봤다** — ① `include` 를 옛 모양으로 되돌리니 빠진 파일
     10개를 이름으로 전부 짚었다 ② 면제 목록의 경로를 없는 것으로 바꾸니
     「죽은 면제를 지워라」로 FAIL 했다(면제 목록이 조용히 썩는 것을 막는다).
     면제는 `fixtures/` 하나이고 **이유가 옆에 적혀 있다**(데모용 가짜 저장소 · SPEC §10.1).

3. **새로 보이게 된 미사용 변수 3개를 지웠다** — `dump-resolve-effect.ts` 의 결과를
   안 쓰는 `select` 한 문장 · `walkthrough-publish.ts` 의 `sessionJwt` import 와 `db`.

**같이 확인한 것:** `packages/*` · `plugin` 의 `include` 에는 빠진 폴더가 **없었다**
(`schema`·`plugin` 은 이미 `"scripts"` 가 있었고 `compiler` 는 그 폴더가 없다).
`next build` 는 `include` 를 tsc 와 같이 읽는데 **아프지 않았다**(19초 OK).

---

### 지난 바퀴 (39) — 태그를 따라가면 그 문장이 있나 (FINDINGS **90** · `800372f`)

**39바퀴는 Pack 의 역추적 태그가 「어디를 가리키는지」를 손으로 적는 것에서
원문에서 재는 것으로 바꿨고, 「따라가면 그 문장이 있나」를 세는 게이트를 세웠다**
(FINDINGS **90** · `800372f`).

🔴 **무엇이 문제였나.** `seed.ts` 의 `fromDoc()` 이 **모든** 항목에 같은 근거를 붙였다 —
`start_char: 0, end_char: 400`, `heading_path: ['paylab 결제 서비스']`. Pack 의 태그가
전부 `#0-400` 이었고 **일곱 중 여섯은 그 범위 안에 그 항목이 주장하는 문장이 없었다.**
제일 아픈 것은 `item_road_m1` 로, 근거가 폐기된 `old-roadmap.md`(M1 = 「웹훅 수신 v1」·
`src/webhook/`)를 가리키는데 내용은 goals.md §4 의 M1 이었다 — **문서 자체가 달랐다.**
관통은 「태그가 붙어 있나」(`untagged === 0`)까지만 셌다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| Pack 태그가 가리키는 자리 | 8줄이 전부 `#0-400` | **8줄이 8자리** (`#260-311` … `#1880-2056`) |
| 그 범위 안에 그 문장이 있는 줄 | 1 / 7 | **8 / 8** |
| 손으로 적은 `heading_path` | 7개(전부 `['paylab 결제 서비스']`) | **0개** (위치에서 계산) |
| 근거를 손으로 적는 자리 | 2곳(`seed.ts` · `walkthrough-publish.ts`) | **1곳** |
| 관통 검사 | 73개 | **75개** (따라가기 · 빠짐 없음) |
| CI | — | principles OK · typecheck OK · test OK · build OK · walkthrough OK → **GREEN** |

**바꾼 것 넷:**

1. **`fromDoc()` 이 문장을 받아 위치를 잰다.** 넷째 인자가 **원문에서 그대로 잘라 온
   문장**이고, `문서.indexOf(quote)` 로 `start_char` 를, 그 위치의 제목 사슬로
   `heading_path` 를 계산한다. 🔴 **못 찾거나 두 번 이상 나오면 던진다** — 조용히 `0` 으로
   떨어지면 전과 같은 상태가 되고, 두 번 나오면 심사자가 따라간 자리가 우리가 뜻한
   자리가 아닐 수 있다.

2. **`item_road_m1` 의 근거 문서를 `goals.md` §4 로 옮기고 글자도 그 문단에 맞췄다.**
   제목 `M1 — 재시도·타임아웃 정리` · `paths: src/payment, src/psp` · done_when 3개.
   ⚠ **근거만 옮기고 글자를 두면 안 된다** — 태그는 맞는 자리를 가리키는데 읽어 보면
   딴 소리가 적혀 있다. 관통 ⑩ 의 progress `criterion` 도 같이 바꿨다 (done_when[0] 과
   글자가 같아야 그 기준이 채워진다).
   ⚠ 이제 **`old-roadmap.md` 에서 오는 항목은 0개다.** 그 문서는 「폐기된 로드맵
   (stale 탐지용)」이고 (SPEC §10.1) 그게 맞는 상태다 — 그 판단을 `paylabDrafts()`
   주석에 적어 뒀다.

3. **관통이 들고 있던 둘째 `fromDoc()` 사본을 지웠다.** 제안 초안
   (`item_goal_settlement`)도 씨앗과 같은 문으로 만든다. 근거를 손으로 적는 자리가
   둘이면 한 곳만 고쳐진다 — 실제로 그 사본이 `0-400` 을 하나 더 들고 있었다.

4. **게이트를 올렸다** (`followEvidence()` · 관통 `publish` 단계). 태그의
   `doc:<uuid>#start-end` 를 **원문 파일에서 잘라 보고** 그 안에 그 문장이 있는지 센다.
   uuid 가 다르면 「딴 문서를 가리킨다」로 걸린다. 기대 문장은 씨앗이 내는
   `SeedResult.evidence` 를 **읽기만** 한다 — 검사 쪽에 다시 적으면 픽스처를 고친 사람이
   검사 쪽 문장을 고쳐서 초록을 만든다. 항목이 Pack 에서 통째로 빠지면 셀 것이 없어
   초록이 되므로 **「기대한 항목이 전부 종이에 있었나」를 따로** 센다.

**빨개지는 것을 봤다** (④2-B ②단계) — `start_char: 0, end_char: 400` 을 되돌려 넣고
관통을 돌렸다: **12곳 FAIL**, `item_mission_paylab` 하나만 통과(0-400 이 넓어서 우연히
들어왔다 — 전 바퀴가 잰 표와 정확히 같다). 문장을 한 글자 바꾸는 것도 시험했다 —
`[seed] item_constraint_card: 근거 문장을 goals.md 에서 못 찾았다` 로 관통이 그 자리에서
멈춘다.

**눈 판정** — 여덟 줄의 태그를 **직접 따라가** 원문을 잘라 읽었다:
`docs/evidence/2026-09-04-evidence-follow/follow.md` (`.ci/` 밖이다). 예를 들어
`item_policy_retry` 의 `#841-964` 를 자르면 「PSP 호출이 실패하면 **최대 5회까지
재시도**한다 … **고정 간격 재시도는 금지한다.**」가 그대로 나온다.

**2-B 39바퀴 라운드** (`93-B`): `SourceRef` 4종 · `scope.kind` 3종 — 둘 다 ②단계까지
살아 있다 (`liveness.test.ts:81`·`:92` 가 잰다). ⚠ 다만 **데모 Pack 은 근거 4종 중 둘
(`doc` 14 · `proposal` 1) · scope 3종 중 둘만** 보여 준다 — 그것만 따로 **93** 으로 냈다.

---

### 지난 바퀴 (38) — 데모 Pack 이 강제 수단을 한 갈래로만 보여 줬다 (FINDINGS **89** · `5858fbb`)

**38바퀴는 데모 Pack 이 「이 정책을 무엇이 강제하나」를 한 갈래로만 말하던 것을
두 갈래로 만들고, 「표가 살아 있나」가 아니라 「데모가 그걸 보여 주나」를 세는 게이트를
세웠다** (FINDINGS **89** · `5858fbb`).

🔴 **무엇이 문제였나.** 관통이 낸 Pack 세 파일의 정책 줄이 전부 `강제: 리뷰에서 본다`
였다. 죽은 코드는 아니었다 — `ENFORCEMENT_LABEL` 네 값이 다 Pack 을 바꾸고
`compiler/test/liveness.test.ts:72` 가 그걸 잠근다. 그런데 **심사자가 실제로 읽는 종이에는
한 갈래뿐**이었다. 같은 말이 모든 줄에 붙어 있으면 사람은 그게 값이 아니라 장식인 줄 안다.

🔴 **고친 방법은 값을 바꾸는 게 아니었다.** 기존 둘(`item_policy_retry`·`item_policy_refund`)은
**지금 값이 사실이다** — 리뷰어가 diff 에서 볼 수 있는 규칙이다. 대신 SPEC §10.1 이 말하는
「의도된 어긋남 3곳」(재시도 / 환불 SLA / **PII 로그 금지**) 중 셋째가 **항목으로 아예
없었다.** goals.md §3.3 이 근거인 `item_policy_pii_log` 를 `enforcement: 'hook'` 로 더했다.

**잰 것:**

| | 전 | 후 |
|---|---|---|
| 씨앗 초안 | 6개 | **7개** |
| Pack 이 보여 주는 강제 수단 갈래 | **1** (`리뷰에서 본다`) | **2** (`+ Hook 이 막는다`) |
| 관통 검사 | 72개 | **73개** (갈래 수를 세는 한 줄) |
| CI | — | principles OK · typecheck OK · test 66 · build OK · walkthrough 73 → **GREEN** |

**바꾼 것 셋:**

1. **픽스처에 항목 하나** (`seed.ts`). `hook` 인 이유를 그 자리 주석에 적었다 — 로그 호출은
   저장소에 흩어져 있어 리뷰어가 매번 전부 볼 수 없고, 자동으로 막을 수 있는 것은 hook
   뿐이다 (M3 「PII 마스킹과 감사 로그」가 그걸 만드는 마일스톤이다).
   ⚠ **`permission`·`none` 은 일부러 안 넣었다.** 픽스처의 모든 줄은 문서까지 역추적된다
   (P7) — 갈래를 채우겠다고 goals.md 에 없는 규칙을 씨앗에 적으면 근거 없는 줄이 생긴다.
   **넷을 다 보이려면 문서를 먼저 늘려야 한다.**

2. **게이트를 올렸다** (관통 `publish` 단계). 「Pack 이 강제 수단을 몇 갈래로 보여 주나」를
   센다. 기준 상수는 `PACK_ENFORCEMENT_MIN`(2)이고 **왜 2 인지와 왜 4 가 아닌지**를 그
   상수 옆에 적었다. 네 갈래의 말을 검사 쪽에 복사하지 않으려고 `ENFORCEMENT_LABEL` 을
   `packages/compiler/src/index.ts` 로 내보냈다.

3. **픽스처 개수를 세는 자리를 하나로 모았다.** 관통이 `=== 6` 을 두 곳에 적고 있었다 —
   픽스처에 한 줄을 더한 사람이 관통을 빨갛게 만들고, 그러면 **검사 쪽 숫자를 고쳐서
   초록을 만든다.** 이제 `SeedResult.drafted` 와 견준다.

**눈 판정** — 나온 Pack 네 파일을 다 읽었다. `CLAUDE.md` 의 Policies 두 줄이 서로 다른
강제 수단을 말하고, 모든 본문 줄에 `ctx:` 태그가 있다. 팀 규칙으로 배포할 만하다.
⚠ 읽다가 **둘을 새로 밟았다** — `.claude/rules/domain-refund.md` 안에 「환불」이라는 말이
0번 나오고(**91**), 태그의 근거 범위가 전부 `#0-400` 인데 그 범위에 그 문장이 없다(**90**).

**2-B 이번 라운드** (`91-B`): `confidence` 3단계와 에러 코드 — 둘 다 ②단계까지 살아 있다.
⚠ 에러 코드는 **9종이 아니라 11종**이다 (`INTERNAL`·`AI_OUTPUT_INVALID` 가 뒤에 들어왔다).
`loop/PROMPT.md` ④2-B 와 `CLAUDE.md` 의 후보 목록에 적힌 「9종」이 낡았다 — 게이트는
정확하다. ⚠ `confidence` 도 데모가 `high` 한 갈래뿐이지만 **89 와 달리 고칠 것이 아니다**:
씨앗 항목은 사람이 손으로 옮긴 것이라 `high` 가 사실이고, `medium`·`low` 는 AI 구조화가
내는 값인데 그 길은 키가 필요해 관통에 없다.

---

### 지난 바퀴 (37) — 안 보이는 색으로 그린 문장 다섯 (FINDINGS **88** · `6f06881`)

**37바퀴는 안 보이는 색으로 그린 문장 다섯을 읽히는 색으로 옮기고, 다시 쌓이지
않게 게이트를 세웠다** (FINDINGS **88** · `6f06881`).

🔴 **무엇이 문제였나.** `DESIGN_BRIEF` §3 토큰 표에서 `ink-4` 의 용도는 **「비활성」**
한 낱말인데, 화면 다섯 자리가 그 색으로 **읽어야 하는 것**을 그렸다. 제일 아픈 둘은
근거 쪽이다 — 하나는 **P1 을 설명하는 문장**(「코드 본문은 서버에 없습니다」 · 심사 첫
질문의 답)이고, 하나는 **P7 을 눈으로 재는 값**(Pack 본문 줄 번호 — 역추적 태그가 몇
줄째인지 그걸로 센다)이다.

🔴 **잰 것.** `globals.css` 의 `:root` 값으로 WCAG 대비를 계산했다 (계산 결과는
`docs/evidence/2026-09-04-ink4-contrast/ink4.md` 에 있다):

| 글자 토큰 | on `bg` | on `surface` | on `surface-hi` |
|---|---|---|---|
| `ink-3` | 8.91:1 | **8.64:1** | 8.62:1 |
| `ink-4` | 1.91:1 | **1.85:1** | 1.84:1 |

`ink-4` 는 어느 바탕에서도 **2:1 을 못 넘는다.** AA 본문 기준(4.5:1)의 절반도 안 되고
큰 글자 기준(3:1)에도 못 미친다 — 발표 영상·인쇄된 심사 자료에서는 **글자가 없는 것과
같다.** (88 항목에 「1.6:1」로 적었던 것은 어림이었다. 결론은 같다.)

**바꾼 것 둘:**

1. **다섯 자리를 읽히는 색으로 옮겼다** — 「쓰는 쪽을 고친다」 갈래다. **토큰 표는 안
   건드렸다**: 「아주 옅은 보조」가 정말 필요한 자리가 다섯 중 하나도 없었다.
   `evidence.tsx:73`·`context/page.tsx:419` → `meta`(이미 ink-3) ·
   `packs/[semver]/page.tsx:120`(파일 sha 4자)·`:187`(**Pack 줄 번호**) → `ink-3` ·
   `chips.tsx:219`(`· rev N`) → **클래스를 뺐다** (`.ctx-tag` 가 이미 ink-3 다 —
   색을 두 곳에 적으면 갈린다).
   `versions.tsx:51` 의 빈 칸 `—` 는 **장식이 맞아서 `ink-4` 로 뒀고**, 대신
   `aria-hidden` 을 붙여 **왜 허용되는지를 마크업이 말하게** 했다.

2. **게이트를 올렸다** (`design-tokens.test.ts` 에 두 줄) — 그 시험은 「임의 색 리터럴이
   없나」만 셌다. **토큰을 제대로 썼는데 용도가 틀린** 경우는 아무도 안 세서 다섯 자리가
   조용히 쌓였다.
   ① `.tsx` 의 `className` 에 `ink-4` 가 있으면 **같은 줄에 `aria-hidden`** 이 있어야 한다
   ② `globals.css` 의 `var(--ink-4)` 는 `.ink-4` 유틸리티와 `:disabled` 규칙에만
   `evidence.tsx:73` 을 되돌려 넣어 **실제로 빨개지는 것을 봤다** (④2-B ②단계) —
   `1 failed | 6 passed`. 규칙의 정본은 `DESIGN_BRIEF` §3 색 표 밑 한 줄에 올렸다.

**눈 판정** — 37바퀴의 고장은 **색**이라 글자만 뽑는 캡처로는 안 보인다. 그래서
`renderToStaticMarkup` 으로 그린 것에서 **태그를 안 지우고** class 를 그대로 읽었다:
`<span class="meta">코드 본문은 서버에 없습니다 …</span>` ·
`<span class="ctx-tag">item_bs_m2<span>· rev 6</span></span>`. 근거는
`docs/evidence/2026-09-04-ink4-contrast/ink4.md` (`.ci/` 밖이다).

**2-B 37바퀴 라운드** (`88-B`): `enforcement` 4종(**한 번도 안 팠던 축**)과 `ItemType`
10종 재확인 — 둘 다 ②단계까지 살아 있다. `ENFORCEMENT_LABEL` 네 값이 Pack 을 바꾸고
`compiler/test/liveness.test.ts:72` 가 그걸 잰다. ⚠ 다만 **데모 Pack 은 `review` 하나만
낸다** — 그것만 따로 **89** 로 냈다.

---

## 잰 것

**36바퀴 · 후보 줄에 근거가 붙었다** (`c6905df` + `b1d2190`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 66초 / build 18초 / walkthrough 71초 **7단계** |
| 새 시험 | **+11** — `web-structure-candidates.test.ts` `it` 12 → **23**. 웹 합계 **375** (`vitest run` 이 센 수) |
| DB · 계약 | **둘 다 안 바뀌었다.** 새 필드도 새 라우트도 없다 — `source_refs` 는 §7.1 이 이미 채워 두던 값이고 화면이 안 꺼냈을 뿐이다. `acceptJobItems` 는 여전히 **id 만** 싣는다 (P7) |
| 정본 하나로 모은 것 | **`StructureCandidate`** 가 `lib/web/queries.ts` 로 갔다 (카드가 따로 적던 모양). 근거 그리기는 화면 7 과 **같은 `EvidenceLink`** — 새 문자열 조립 0곳 |
| 하드코딩 안 한 것 | `CANDIDATE_BODY_CHARS`(120) — 시험이 그 상수를 읽어서 잰다 (`'ㄱ'.repeat(N+10)`) |
| 🔴 값이 갈리는 것을 봤나 | **봤다** (2-B ②단계). `start_char`·`heading_path` 를 뒤집으면 카드 글자가 갈리고 **서로를 배제한다**(`not.toContain`) · 근거가 없거나 어긋나면 줄이 남고 「근거 없음」이 나온다 · `body` 가 문자열이 아니면 `undefined` 가 아니라 빈 문자열이다 |
| 🔴 눈으로 읽었나 | **읽었다.** `docs/evidence/2026-09-04-candidate-evidence/card.txt` — 일곱 상태. 거기서 **88** 을 찾았고 그 자리에서 **내 코드부터 고쳤다**(`b1d2190`) |
| 2-B 한 라운드 | `CONFLICT_ANCHORS` 3종 · `CONFLICT_CHOICES` 4종 · `SCOPE_KINDS` 3종 — **셋 다 ②단계까지 살아 있다** (**87-B**) |


**35바퀴 · 문서에서 뽑은 후보가 항목이 된다** (`c57b3fb`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 5초 / test 67초 / build 18초 / walkthrough 73초 **7단계** |
| 새 시험 | **+20** — `ai-job.test.ts` 43 → **51**(`it` 수) · `web-structure-candidates.test.ts` **12**(새 파일). 웹 합계 **352** |
| 새 라우트 | **`POST /projects/{id}/jobs/{jobId}/items`** — 라우트 파일 29 → **30**개 |
| 계약에 는 것 | **`AcceptJobItems`**(`{item_ids[]}`) · `API_REQUESTS` 에 한 줄. 응답은 `batch-draft` 와 **같은 모양**(`{accepted,rejected}`)이라 새 계약을 안 만들었다 |
| 걷어낸 것 | 초안 insert 가 **두 곳 → 한 곳** (`insertDrafts()`). `batch-draft` 라우트에서 `contextItems`·`contextItemRevisions` import 가 빠졌다 |
| DB | **안 바뀌었다** — `0006` 그대로. 새 컬럼도 새 enum 값도 없다. `origin:'doc'` 은 **이미 있던 pgEnum 값**이고 찍는 자리만 없었다 |
| 번들 | `packages/schema` 가 바뀌어 `plugin/contextops/bin/contextops-cli.mjs` 를 다시 만들었다 (815,526바이트) |

**31바퀴 · 항목이 「언제 것인가」를 화면이 본다** (`a45cef0`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 5초 / test 55초 / build 17초 / walkthrough 61초 **7단계** |
| 새 시험 | **+7** — schema 113 → **117**(`ContextItemView` 4) · web 322 → **325**(카드 날짜 3 · `dateText` 3 인데 `api-routes` 는 새 `it` 없이 **기존 것을 좁혔다**). 합계 **752** (skip 1 포함) |
| 계약에 는 것 | **`ContextItemView`** — `ContextItem` + `updated_at` 한 칸. 갈래를 만드는 자리는 `variantsOf` 를 도는 **기존 한 줄**이라 ItemType 10종은 그대로 따라온다 |
| DB | **안 바뀌었다.** `context_items.updated_at` 은 이미 있었다 — 응답이 안 실어 나르고 있었을 뿐이다 (`0006` 그대로) |
| 정본 하나로 모은 것 | **`dateText`**(`lib/web/time.ts`) — 화면 4·5 가 같은 함수를 쓴다. `sinceText`(경과)와 **따로** 둔 이유를 그 옆에 적었다 |
| 🔴 P4 를 지켰나 | **지켰다.** 시각은 `ContextItem` 에 **안 들어간다** — 컴파일러가 받는 snapshot 이 그 계약이고 `snapshotHash()` 가 항목을 통째로 잰다. golden·manifest_hash **하나도 안 바뀌었다** (compiler 136 그대로) |
| 🔴 갈리는 것을 봤나 | **봤다.** ① 응답은 `ContextItemView` 로는 파싱되고 `ContextItem` 으로는 **거부된다** ② 항목의 `updated_at` 을 바꾸면 카드의 날짜가 따라 바뀐다(`2026-08-04` → `2027-01-02`) ③ `dateText('2026-07-12T23:30:00Z')` 가 UTC+9 에서도 `2026-07-12` 다 |
| 🔴 눈으로 읽었나 | **읽었다** (화면 4). `docs/evidence/2026-09-04-screen4-updated/item-updated-at.txt` — 「오래됨」 카드에 두 날짜가 나란히 서고, **항목을 못 찾은 카드**·**질문 카드**에는 날짜가 없다. ⚠ **화면 5 표는 못 봤다** (「눈 판정 대기」) |
| 같이 고친 것 | 플러그인 번들 재빌드 (`bin/contextops-cli.mjs` — 스키마를 통째로 싣는다. 안 하면 `bundle.test.ts` 가 바이트 차이로 빨개진다) |
| 닫은 FINDINGS | **72③** ✅ (①② 는 대기 — 76 과 같은 자리) |
| 새 FINDINGS | **78**(2-B 라운드 기록) |
| 2-B 확인 (죽은 정의 찾기) | **`ItemStatus` 4종 살아 있다** — `EXCLUDE_BY_STATUS`(`compiler/src/partition.ts:102`)가 정본이고 `active` 만 Pack 에 나간다. 나머지 셋은 **서로 다른 이유 문장**이며 `liveness.test.ts:46` 이 네 지문이 갈리는 것을 잠근다 · **`ChipSpec` 표 8개 전부 `assertLiveTable` 로 잠겨 있다**. 여덟 중 **`SYNC_CHIP` 하나만 그리는 화면이 0곳**(77 그대로 — 화면 9 가 아직 없다). 다음 라운드 후보: `SourceRef` 4종(**31**·**68**) · 에러 코드 11종 · `enforcement` 4종 · `scope.kind` 3종 |

**🔴 결정 — 시각을 `ItemBase` 에 넣지 않고 계약을 하나 더 뒀다**

넣으면 한 줄이고 화면은 똑같이 돈다. 대신 **컴파일러가 받는 항목 안에 시각이 들어간다** —
`snapshotHash()` 는 항목을 통째로 재므로 내용이 같은 묶음이 **매번 다른 지문**을 갖고,
「같은 snapshot 인가」를 물어볼 수 없게 된다. 그건 P4 가 서 있는 자리다.
⚠ 대가는 **변형이 셋**이 된 것이다(항목·초안·화면). 넷째를 더하기 전에 「정말 다른
**계약**인가, 아니면 같은 것의 다른 **표시**인가」를 물어라 — 뒤쪽이면 화면이 골라 그린다.
그 문장을 `ContextItemView` 옆에 같이 적어 뒀다.

**28바퀴 · 결정이 Pack 을 바꾼다** (`a201a51` + 근거 `6d535f1`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 59초 / build 18초 / walkthrough 63초 **7단계** |
| 새 시험 | **+6** — web 307 → **313** (`api-routes` +5 · `api-publish` +1). 합계 **736** |
| 새 파일 | `scripts/dump-resolve-effect.ts` · `docs/evidence/2026-09-04-resolve-effect/pack-before-after.txt` |
| 표에 한 줄로 늘어난 것 | **`RESOLUTION_ITEM_OUTCOME`(4)** — 새 선택을 더하는 절차 넷을 그 표 옆 주석에 적었다. 잇는 문은 `itemOutcomeOf()` 하나 |
| 정본으로 올린 것 | **`appendSourceRef()`** (`lib/api/item.ts`) — 근거를 더 붙이는 자리가 둘이 됐다(`proposal`·`manual`). `withProposalRef()` 가 이제 이것을 부른다 |
| DB | **안 바뀌었다.** `0006` 그대로 — 새 컬럼도 새 enum 값도 없다 |
| 🔴 갈리는 것을 봤나 | **봤다.** 선택 4개가 **세 가지 결과**를 낸다 (`a`→B 폐기 · `b`→A 폐기 · `both`·`dismiss`→아무것도 안 함). 답을 손으로 안 적고 **표에서 읽어 대조**한다 — 표를 고치면 시험이 따라온다. `anchor` 가 `items` 가 아닌 종류는 항목이 0개 |
| 🔴 헛도는 시험이 아닌가 | **확인했다.** Pack 시험의 `choice` 를 `a`→`both` 로 뒤집으니 `ctx:item_policy_one` 이 그대로 남아 **빨개졌다.** 되돌렸다 |
| 🔴 눈으로 읽었나 | **읽었다.** `docs/evidence/2026-09-04-resolve-effect/pack-before-after.txt` — **결정 전 CLAUDE.md 에 모순되는 `must` 두 줄이 나란히** 있었다(「지수 백오프 5회」+「고정 간격 3회」). 결정 후엔 진 줄만 사라지고 로드맵 `done_when` 과 이긴 규칙은 그대로. 진 항목: `status=deprecated · origin=manual · created_by 있음 · 근거 둘`(원래 `repository_path` 를 **안 밀어냈다**) |
| 게이트로 올린 것 | 선택마다 **다른 쪽**이 진다(표에서 읽어 대조) · 이긴 쪽은 `status`·`revision` 이 그대로다 · 폐기 개정에 `manual` 근거가 붙고 원문 근거를 안 밀어낸다 · 본문이 안 바뀐다(P4) · `anchor` 가 `items` 가 아니면 항목이 0개 · 근거 20개면 **400 이고 충돌도 안 닫힌다**(트랜잭션 하나) · **진 줄이 Pack 어느 파일에도 없다**(`source_map` 도) |
| 닫은 FINDINGS | **71** ✅ |
| 새 FINDINGS | **74**(화면이 「A가 맞음 → B 폐기」를 안 알린다 · 격차) · **75**(2-B 라운드 기록) |
| 2-B 확인 (죽은 정의 찾기) | **`AI_JOB_STATUS` 4종 살아 있다** — 넷 다 찍는 자리가 있고(`queued`=default · 나머지 `lib/ai/job.ts:276·309·324`) `AI_JOB_STATUS_RULES` 가 **DB CHECK 넷을 생성**해 값마다 채워야 하는 칸이 다르다 · 🔴 **`origin` 4종 — `doc` 이 여전히 0곳** (**31** 그대로. `manual` 3·`code` 1·`proposal` 1). **§7.1 러너는 개정을 아예 안 만든다** — 31 이 지목한 자리가 코드에 아직 없다. 그런데 `lib/ai/conflict.ts:99` 는 프롬프트에 `origin=` 을 이미 싣는다 → `doc_vs_code` 는 영원히 0건 · 🔴 **`SourceDocumentKind` 6종 — `65` 그대로**, 저장·선택·칩 색은 갈리는데 **어떤 판정도 안 읽는다**(`prompt.ts`·`structure.ts` 에 `kind` 0건 — 2단계 실패). 다음 라운드 후보: sync 상태 5종(**69**) · `ConflictStatus` 3종 · `ChipSpec` 표 8개 · `PRODUCT_TEXT_PACK_FILES` |

**🔴 결정 — 「선택 → 항목」을 `RESOLUTION_OUTCOME` 에 접지 않고 표를 하나 더 뒀다**

접으면 한 줄이 두 가지를 말해야 한다: `both` 는 충돌을 **닫지만** 항목은 **안 건드린다.**
`ConflictStatus` 를 항목 상태로도 쓰는 순간 그 차이를 적을 자리가 없어지고, 라우트에
`if (choice === 'both')` 가 되살아난다. 표 둘 + 잇는 문 하나(`itemOutcomeOf()`)면
선택이 늘 때 고칠 자리가 **표 한 줄**이고, 종류가 늘 때는 **고칠 자리가 없다**
(`CONFLICT_KIND_RULES` 를 읽기만 한다).

**🔴 결정 — 진 쪽만 옮긴다. 이긴 쪽은 안 건드린다**

SPEC §5 는 「→ 항목 상태 갱신」이라고만 적고 FINDINGS 71 은 「이긴 쪽이 `review` 로
오지도 않는다」를 증상으로 적었다. **이긴 쪽을 건드리지 않기로 했다** — 이미 `active`
인 항목을 `review` 로 되돌리면 **다음 발행에서 Pack 밖으로 나간다.** 「A가 맞다」를
누른 사람이 A를 잃는다. 결정의 뜻과 정반대다.

**⚠ 사람이 적은 `note` 를 근거에 이어 붙이지 않기로 했다**

`{kind:'manual', note}` 는 200자 상한이고 `resolution.note` 는 길이가 제멋대로다.
이어 붙이면 **잘린다** — 잘린 근거는 근거가 없는 것과 같다. 충돌 id 하나만 실으면
그 행에 질문·선택·사람·시각이 전부 그대로 있다. 조사(助詞)도 안 쓴다 (id 끝 글자가
매번 달라서 「을/를」이 갈린다 — 27바퀴와 같은 판단).

---

**27바퀴 · 화면 4(정리) — 결정이 일어나는 자리** (`706e334`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 15초 / test 88초 / build 18초 / walkthrough 101초 **7단계** |
| 새 시험 | **+20** — web 287 → **307** (`web-conflict-card` **18** · `web-tables` +2). 합계 **730** |
| 새 파일 | `components/conflict-card.tsx` · `app/…/review/page.tsx` · `scripts/dump-conflict-card.tsx` · `test/web-conflict-card.test.ts` |
| 표에 한 줄로 늘어난 것 | `ConflictKindRule` 에 **축 `byAi`** · `CONFLICT_KIND_CHIP`(6) · `CONFLICT_SEVERITY_CHIP`(3) · `CONFLICT_SIDES`(4) · `CHOICE_LABEL`(4) · `ANCHOR_BODY`(3) · `TABS` 에 「정리」 한 줄 |
| DB | **안 바뀌었다.** `0006` 그대로 — `byAi` 축에서 나오는 CHECK 이 없다 (제약은 `anchor`·`needsB`·`detected` 에서만 생성된다) |
| 🔴 갈리는 것을 봤나 | **봤다.** 탐지 4종이 **서로 다른 버튼 문구**를 낸다 (`A가 맞음` / `A가 최신` / `A로 합침` / `문서가 맞음 (코드 수정 필요)`) · `anchor` 3종이 **서로 다른 본문**을 낸다 (항목 태그+근거 / 문서 구간 / 아무 근거도 없음) · `byAi` 가 `open_question` 에는 배지를 달고 `seed_question` 에는 안 단다 (**둘 다 `detected:false` 다** — `detected` 로 갈랐으면 이 시험이 빨개진다) |
| 🔴 눈으로 읽었나 | **읽었다 — 그리고 셋을 고쳤다.** `docs/evidence/2026-09-04-screen4/conflict-card-states.txt` (열다섯 모양). ① 「「무시」**으로** 정했습니다」 — 조사가 앞 낱말 받침에 따라 갈리는데 버튼 문구가 넷 다 제각각이다 ② 한쪽뿐인 카드에 「A」가 붙어 **사람이 없는 B 를 찾게** 했다 ③ 「답이 근거가 **됩니다**」가 답한 뒤에도 남았다 |
| 게이트로 올린 것 | 열다섯 모양이 **서로 다른 마크업**을 낸다 · 결정 문구에 조사가 안 붙는다 (넷 다 그려서 본다) · 한쪽뿐인 카드에 「A」가 없다 · owner 가 아니면 `<button` 이 **하나도 없다**(그래도 근거는 보인다 · P7) · 항목이 0개면 「만들어졌습니다」라고 안 한다(FINDINGS 66 재발 방지) · 저장 **전에는** 무엇이 생기는지 약속하지 않는다 · 상한을 손으로 안 적는다 · 「실시간」 없다 · 점수·순위 없다(P5) |
| 닫은 FINDINGS | 없다 — **화면 4 는 대장 항목이 아니라 `docs/PLAN.md` P3 둘째 행의 ⑥이다** |
| 새 FINDINGS | **71**(결정해도 항목이 안 바뀐다 · 구멍) · **72**(화면 4 가 안 그린 세 칸 · 격차) · **73**(2-B 라운드 기록) |
| 2-B 확인 (죽은 정의 찾기) | **`ItemType` 10종** 살아 있다 (`compiler/src/partition.ts`·`sections.ts` · `liveness.test.ts` 가 잠근다) · **에러 코드 11종** 살아 있다 (열한 종 전부 `ERROR_HINT` 밖에 내는 자리가 있다 — 가장 적은 것이 `REVISION_CONFLICT`·`RATE_LIMITED`·`COMPILE_FAILED` 각 1곳) · 🔴 **`confidence` 3단계 — 살아 있지만 얇다**: `compiler/src/tag.ts:50` 이 `conf:{값}` 으로 Pack 줄에 넣어서 값을 바꾸면 바이트가 갈리는데, **아무 판정도 이 값을 안 읽는다** (`low` 가 Pack 에서 빠지지도 화면에서 걸러지지도 않는다). SPEC 도 §7 프롬프트 한 줄뿐이라 의도된 소비처가 없다. 다음 라운드 후보: sync 상태 5종(**69**) · `origin` 4종(**31**) · `SourceDocumentKind` 6종(**65**) · `AI_JOB_STATUS` 4종 |

**🔴 결정 — `ConflictKindRule` 에 축(`byAi`)을 더했다 (`detected` 로 갈음하지 않았다)**

지난 바퀴 STATUS 가 「갈래가 늘면 `ConflictKindRule` 에 축을 하나 더하는 쪽을 먼저
생각해라 — 지금 안 더한 이유는 **읽는 코드가 0곳이면 그게 죽은 정의**이기 때문이다」
라고 적어 두었다. 이번에 읽는 코드가 생겼다. 갈음이 안 되는 이유는 하나다:
**`open_question` 은 `detected: false` 인데 AI 가 만든 것**이다 (§7.1 이 문서를 읽다
남긴다). `detected` 로 배지를 달면 그 카드만 배지를 잃고 화면에서 **사람이 적은 질문처럼
보인다** — 신뢰 경계가 흐려지는 자리다 (DESIGN_BRIEF §3). 머리의 숫자도 같은 축이라야
씨앗 질문 10장이 「AI가 찾은 것」에 안 섞인다. 시험이 **`detected` 로 갈랐으면 빨개지게**
잡아 두었다.

**🔴 결정 — 결정한 카드를 목록에서 지우지 않는다**

지우면 방금 누른 사람은 자기가 무엇을 골랐는지 확인할 자리를 잃고, 잘못 눌렀는지도
모른다. 그래서 응답으로 온 행을 손에 든 목록에 **갈아 끼운다**(`useAsync.put`).
⚠ 되돌리는 버튼은 두지 않았다 — `POST :resolve` 가 「이미 처리된 충돌」을 400 으로
막는다. **없는 문을 그리면 누른 사람은 자기가 뭘 잘못한 줄 안다.**

**⚠ 조사(助詞)를 코드로 고르지 않기로 했다**

「「무시」**으로** 정했습니다」가 나왔다. 갈래 둘이었다: ① 받침을 보고 조사를 고르는
함수를 만든다 ② 조사가 필요 없는 문장으로 바꾼다. **②로 정했다** — 버튼 문구는 표에
있어서 앞으로도 늘고(`CONFLICT_SIDES`), 늘 때마다 ①의 함수가 맞는지 아무도 안 본다.
문장을 바꾸면 **문구가 늘어도 안 깨진다.** 시험이 넷을 다 그려서 `」+조사` 를 막는다.

**26바퀴 · FINDINGS 68 — 제안이 만든 줄이 그 제안으로 역추적된다** (`e0148d0`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 59초 / build 18초 / walkthrough 64초 **7단계** |
| 새 시험 | **+2** — web 285 → **287**. 합계 **710** (schema 113 · compiler 136 · plugin 174 · web 287) |
| 고친 자리 | `apps/web/src/lib/api/publish.ts` **한 파일** (붙이는 자리 하나) + 상수 한 줄이 스키마 세 자리로 |
| DB | **안 바뀌었다.** `0006` 그대로 — `source_refs` 는 jsonb 라 마이그레이션이 필요 없다 |
| 🔴 갈리는 것을 봤나 | **봤다.** 같은 초안을 제안으로 넣고 발행하면 Pack 줄의 `src:` 조각이 **하나 → 둘**이 된다. 근거가 `SOURCE_REFS_MAX` 개면 **201 이 아니라 400** 이고 `details.failures[0].reason` 이 「붙일 자리가 없다」다 |
| 🔴 눈으로 읽었나 | **읽었다.** `docs/evidence/2026-09-04-p7-proposal/pack-line.txt` — 시험에 임시로 `console.log` 를 넣어 Pack 본문의 그 줄을 그대로 찍고, 조각이 둘인지·원문이 안 밀려났는지·태그가 안 깨졌는지를 글자로 봤다. 찍는 줄은 커밋에 없다 |
| 게이트로 올린 것 | `api-publish.test.ts` +2 — ① **Pack 줄**에 `proposal:{id}` 와 `repo:` 가 둘 다 (개정 행이 아니라 `parseTraceTag()` 로 되읽는다) ② 상한이 차면 **조용히 버리지 않고** 400 |
| SPEC 에 적은 것 | §2.1 2단계 — 「이때 `{kind:'proposal'}` 을 붙인다 · 자리가 없으면 버리지 않고 실패로 돌린다」 |
| 닫은 FINDINGS | **68** |
| 새 FINDINGS | **70**(2-B 라운드 기록 · 고장 아님). **고장·구멍은 새로 못 찾았다** — 관통 7단계가 전부 지났다 |
| 2-B 확인 (죽은 정의 찾기) | 🔴 **`SourceRef` 4종 — 마지막 하나(`proposal`)가 이번 바퀴에 살아났다. 죽은 칸이 없다.** · **`enforcement` 4종** 살아 있다 (`compiler/src/sections.ts:53` 의 `ENFORCEMENT_LABEL` 이 값마다 다른 문장) · **`scope.kind` 3종** 살아 있다 (`partition.ts:68·69` 가 세 값을 **다른 파일**로 보낸다 · `sort.ts:17` 도 읽는다). 다음 라운드 후보: `ItemType` 10종 · 에러 코드 9종 · `confidence` 3단계 · sync 상태 5종(**69**) |

**🔴 결정 — 근거가 꽉 차면 하나를 버리지 않고 발행을 막는다**

`source_refs` 는 최대 20 이고 제안 근거를 붙이면 21 이 될 수 있다. 갈래 셋이었다:
① 조용히 하나 버린다 ② 상한을 늘린다 ③ 막는다. **①은 그 항목만 역추적이 한 칸 짧아지고
아무도 모른다** — P7 이 제일 싫어하는 모양이다. ②는 태그 한 줄이 길어져서 Pack 을
읽는 사람 쪽 비용이고, 늘려도 언젠가 같은 자리를 또 만난다. **③으로 정했다**:
이미 있는 「실패를 모아서 한 번에 돌려준다」 자리에 이유 한 줄을 더하면 끝이고,
사람이 읽을 수 있는 말(「근거를 하나 줄여라」)이 나온다.

**⚠ 골든과 조각 순서가 다르다 — 안 맞췄다**

골든 픽스처는 `src:proposal:…,repo:…`(제안이 앞)인데 발행은 `repo:…,proposal:…`(뒤)다.
태그를 읽는 `parseTraceTag()` 는 **순서를 안 본다.** 맞추려고 골든을 건드리면
P4 게이트(byte-identical)를 이유 없이 흔든다 — 그래서 두었다.

**25바퀴 · FINDINGS 67 ③ — 「문서가 없어도 됩니다」가 참말이 됐다** (`9f481a0` + `a24120e`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles **OK 9** / typecheck 6초 / test 52초 / build 15초 / walkthrough 56초 7단계 |
| 새 시험 | **+26** — web 259 → **285** (`api-seed-questions` **11** · `web-question-stack` **15**). 합계 **708** |
| 표에 한 줄로 늘어난 것 | `CONFLICT_KINDS` += `seed_question` · `CONFLICT_ANCHORS` += `none` · `QUESTION_CONFLICT_KINDS`(표에서 뽑는다). **라우트에서 손으로 세던 `kind='open_question'` 이 사라졌다** — 그게 박혀 있어서 씨앗을 심자마자 질문 화면이 그것을 못 봤다 |
| DB | **`0006`** — `ALTER TYPE conflict_kind ADD VALUE 'seed_question';` **한 줄뿐**이다. CHECK 다섯 줄은 `conflictShapeCheck()` 가 표에서 다시 만들어 SQL 이 안 바뀌었다 (표에서 제약을 만드는 값이 여기서 나왔다) |
| 갈리는 것을 봤나 | **봤다.** 답을 바꾸면 만들어진 항목의 `data` 가 달라진다 · 씨앗 질문 행은 네 칸이 **다 빈다**(`anchor:'none'`) · 답변이 501자면 400 이고 **아무 질문도 안 닫힌다**(트랜잭션 밖에서 먼저 만든다) · 만들어진 항목은 `draft`·`origin='manual'`·`confidence='high'` |
| 🔴 상수를 시험이 잠갔다 | `SEED_ANSWER_MAX`(500) 길이의 답변이 **표의 열 줄 전부에서** 통과하는지 잰다. 목적지 칸이 더 좁은 타입(`WorkflowData.steps` 300자)을 표에 더하면 그 자리에서 빨개진다 — 「오늘 열 줄이 맞다」가 아니라 **열한째 줄을 막는** 시험이다 |
| 🔴 눈으로 읽었나 | **읽었다 — 그리고 셋을 고쳤다.** `docs/evidence/2026-09-04-screen3-questions/question-stack-states.txt` (열 모양). ① 답한 것이 **0개**인 요약이 「초안 항목으로 만들어집니다」라고 말했다 (FINDINGS 66 과 **똑같은 고장이 새 화면에서 다시 났다**) ② 셋째 질문이 「무엇을 보면 **그것이**…」였는데 카드는 한 장씩 보여서 앞 카드가 없다 ③ 「답 3 · 항목 2」가 **왜 다른지**를 안 말했다 |
| 게이트로 올린 것 | `web-question-stack.test.ts` — 열 모양이 서로 다르다 · 「실시간」 없다 · 진행이 「n / 10」이고 사람 이름이 없다 (P5) · **질문 문구를 화면이 갖고 있지 않다**(행에 실려 온다) · 답 칸 상한을 손으로 안 적는다 · 첫 카드에 [이전] 이 없다 · **0개면 「만들어집니다」라고 안 한다** |
| 닫은 FINDINGS | **67 ③** (①(zip)은 남았다) |
| 새 FINDINGS | **69**(sync 상태 `manual` 을 찍는 코드가 0곳 · 격차) |
| 2-B 확인 (죽은 정의 찾기) | `SourceRef` 의 **`manual` — 이번 바퀴에 살아났다**: 씨앗 답이 만드는 항목이 `{kind:'manual', note:질문}` 을 단다 (지난 바퀴에 「0곳」으로 적어 둔 자리다). 🔴 **sync 상태 5종 — 하나가 죽어 있다**: `applied`·`outdated`·`modified` 는 `plugin/.../managed.ts:163·168·174` 가 찍고 `unknown` 은 서버(`lib/api/sync.ts:16`)가 매기는데, **`manual` 은 `grep -rn "manual" plugin/contextops/src` 가 0건**이다. SPEC §6 은 「zip 수동 적용」이라는데 그 길이 아직 없다 → FINDINGS **69** |

**🔴 결정 — 씨앗 질문을 「새 충돌 종류」로 심었다 (`open_question` 을 안 늘렸다)**

같은 `open_question` 으로 심는 것이 싸 보였다. 못 한 이유는 **DB 가 막는다**는 것이다:
그 종류는 `anchor:'document'` 라 `a_ref` 가 **차 있어야** 하고 (CHECK), 프로젝트를
만드는 순간에는 가리킬 문서가 없다. 채우려면 **아무 원문도 안 가리키는 근거를 지어내야**
하고 그게 P7 이 막는 바로 그 줄이다. 그래서 `anchor` 에 `none` 을 더했다 —
「아직 가리킬 것이 없다」를 값으로 말한다. 덤으로 FINDINGS 67 이 경고한 것
(「화면 4 가 사람이 심은 질문에도 `AI 제안` 배지를 단다」)도 같이 풀렸다: **종류가 다르다.**

**🔴 결정 — 답변 → 항목에 LLM 을 안 넣었다**

「자유 문장을 타입별 `data` 로 뜯는 것은 §7.1 의 일」이라고 라우트 주석이 적어 두었다.
그 말을 지키려면 **질문이 자기 답의 자리를 미리 알고 있어야** 한다. 그래서 표 한 줄이
`type` 과 `data(answer)` 를 갖는다 — 서버는 옮기기만 하고 아무것도 고르지 않는다.
그 결과 **정직하게 채울 수 없는 타입은 씨앗이 될 수 없다**: `roadmap` 은 `milestone_id`
와 `done_when` 을, `workflow` 는 `trigger` 와 단계 배열을 필수로 받는다. DESIGN_BRIEF 의
예시 둘을 `goal`·`policy` 로 바꿔 담고 **왜 바꿨는지를 표 옆에 적었다.**
⚠ 그래서 씨앗이 쓰는 타입은 넷(mission·goal·constraint·policy)뿐이다 — 나머지 여섯은
문서 구조화(§7.1)와 손으로 추가(화면 5)의 몫이다.

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

