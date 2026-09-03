# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 4바퀴 · `dc66593` `a4ac92d` `8e02f48` `84ce3ea`_

---

## 지금 어디인가

**P0 셋째 행(`packages/compiler`) 끝. 다음은 P0 마지막 행 — paylab 픽스처.**
항목이 Pack 이 되는 길이 처음으로 **끝까지 이어졌다.** 손으로 만든 항목 12개를 넣으면
`CLAUDE.md` + `.claude/rules/*.md` 5개가 나오고, 모든 줄이 항목 ID 로 역추적된다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | `apps/web` · Supabase · Vercel |
| `packages/schema` (계약 전부 · 테스트 71) | `fixtures/paylab-*` |
| **`packages/compiler`** (파이프라인 7단계 · 테스트 112) | `plugin/contextops` 의 bin·skills·hooks |
| `plugin/contextops/schemas/*.json` 7개 | |
| `docs/SPEC.md` · `DESIGN_BRIEF.md` · `PLAN.md` | |

검사 층: `principles OK · typecheck OK(멤버 2개) · test OK(멤버 2개) · build SKIP · walkthrough OK`.
**이번 바퀴에 typecheck·test 층의 「가짜 OK」를 막았다** (FINDINGS 1번 ✅ `84ce3ea`) —
`pnpm -r` 이 멤버 0개에서 exit 0 이라 **아무것도 검사 안 하고 초록**이던 자리다.
이제 두 층이 멤버 수를 세고 note 에 남긴다.
**principles 가 OK 3 → OK 6 으로 늘었다** — `P4`(컴파일러 순수성)·`P4b`(golden 3종)·
`P7`(템플릿 역추적 태그 자리)이 **SKIP 을 벗었다.** 지난 바퀴가 「compiler 를 만들고도
P4·P4b·P7 이 SKIP 이면 그게 고장이다」라고 적어 둔 자리다.
**`walkthrough` 가 처음으로 SKIP 이 아니라 OK 다** — 6단계 중 `compile` 하나가 산다
(나머지 5개는 `apps/web`·`plugin` 이 없어서 맞는 SKIP).
남은 SKIP 2개: `P3` 은 `apps/web/src`, `P6` 은 `session-start.mjs` 가 생기면 풀린다.

## 다음 바퀴가 할 일

`docs/PLAN.md` **P0 마지막 행**: paylab 픽스처
(`fixtures/paylab-api` TS ~40파일 · 의도된 어긋남 3곳 · `fixtures/paylab-docs` 150줄).
완료 기준은 SPEC §10.1 의 기대 결과(충돌 3 · open_question 4 · M1~M3)를 **낼 재료가 다 있음**.

⚠ 픽스처는 **문서와 코드가 어긋나 있어야** 쓸모가 있다. 어긋남 3곳을 어디에 심었는지
`fixtures/README.md` 같은 데 적어 두지 마라 — 그건 답안지다. SPEC §10.1 이 정본이다.

⚠ 컴파일러가 준비돼 있으므로 픽스처를 만들면 **손으로 항목을 적어 컴파일해 볼 수 있다.**
`packages/compiler/test/golden/case-1-small/input.json` 이 그 형식의 예시다.

⚠ **P0 이 끝나면 P1 첫 행(DB·Drizzle)인데 거기서 사람이 필요하다** (아래 「막힌 것」).
루프는 스키마·마이그레이션·`.env.example` 까지 하고 멈춘다.

⚠ **FINDINGS 「다음에 고칠 것」 맨 위 두 개(12·7)는 주인이 뒤 Phase 행이라 지금 고치지 마라.**
12번(에러 코드 9종)은 P1 「API 1군」 행이 주인이고 — 소비처 없이 스키마만 만들면
정의만 있고 아무 일도 안 하는 표가 하나 더 생긴다. 7번(agents·cursor 타깃)은 P5 행이 주인이다.
**지금 손댈 수 있는 것은 PLAN P0 마지막 행이다.**

## 잰 것

**4바퀴 · CI 게이트** (`84ce3ea`) — PLAN 행이 아니라 **FINDINGS 1번**을 고친 바퀴다

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK 6 / **typecheck OK 4초·멤버 2개** / **test OK 3초·멤버 2개** / build SKIP / walkthrough OK 2초 |
| 고친 것 | `ci.ps1` +42줄 (함수 2개 · 2·3층 분기) · 다른 파일 0건 |
| 게이트가 갈리는지 | AST 로 함수를 꺼내 두 워크스페이스에 돌림 — 빈 곳 **0개**(SKIP 경로) / 이 저장소 **2개·testable 2개**(OK 경로) |
| 증상 재현 | 빈 워크스페이스 `pnpm -r test` → `No projects matched the filters` · **EXIT=0** |

**관통은 지난 바퀴와 같다** — `compile OK` 1단계, 나머지 5개는 `apps/web`·`plugin` 이
없어서 맞는 SKIP. 이번 바퀴는 산출물(Pack)을 바꾸지 않았으므로 3바퀴의 눈 판정이 그대로 선다.

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드 3종 확인**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| `ItemType` 10종 | `compiler/src/partition.ts` 의 `Record<ItemType, …>` 표 · `sections.ts` | `liveness.test.ts` 「10종을 넣으면 산출물이 달라진다」 | **살아 있다** |
| sync 상태 5종 | `schema/src/upload.ts` — `REPORTABLE_SYNC_STATUSES` 가 `unknown` 을 뺀다 | `upload-allowlist.test.ts:144` 가 두 목록의 차이를 잠갔다 | **살아 있다** (소비처인 plugin 은 P2) |
| **에러 코드 9종** | **0건** — `grep -rn "STALE_BASE\|BUDGET_EXCEEDED\|ERROR_CODE" packages apps plugin tools` | 코드에 없어서 잴 것이 없다 | **구멍** → FINDINGS 12번 |

**P0 셋째 행 · `packages/compiler`** (`8e02f48`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK / typecheck OK / test OK / build SKIP / **walkthrough OK** |
| principles | **OK 6** · SKIP 2 · FAIL 0 (P4 = 12파일 · P4b = 3케이스 · P7 = 1/2 템플릿) |
| test | 컴파일러 **112개** 초록 (6파일) · schema 71개 초록 · 합 183개 |
| 컴파일러 소스 | `src` 12파일 + `templates` 2파일 · 1,148줄 |
| 테스트 소스 | 6파일 · 582줄 |
| golden | 3케이스 · 19파일 · 169KB (`case-1-small` 12항목 → Pack 5파일) |
| 새 의존성 | 없음 (schema·zod·vitest 만 씀) |

**산출물을 눈으로 읽었다** — `case-1-small` 의 `CLAUDE.md` 를 통째로 읽고 판정했다:
「이걸 팀 규칙이라고 배포해도 되겠다」에 ○. 근거는 아래 셋.
- **모든 줄에 역추적 태그가 붙어 있다** (P7). 태그 없는 줄은 제목·frontmatter·
  SPEC §4.3 고정 텍스트뿐이고, **그걸 시험이 센다** (`traceability.test.ts` 의
  「태그 없는 줄은 전부 템플릿 줄이다」 — 항목이 슬쩍 한 줄 더 뱉으면 빨개진다)
- 빈 절은 제목째로 빠진다 — `## Goals` 만 있고 아래가 없는 Pack 이 안 나온다
- 눈으로 보고 **두 곳을 고쳤다**: `# 도메인 — payment` 아래 `## payment` 가 겹쳐서
  머리말에서 이름을 뺐고, `decisions.md` 의 ADR 제목이 `###` 로 떠 있어 `##` 로 내렸다

**「초록」이 「검사했다」인지 직접 확인했다** — 시험이 실제로 고장을 잡았다:
- `esc()` 의 `|`·선행 `#` escape 가 **조용히 안 먹고 있었다.** `escape.test.ts` 가 잡았다.
  원인은 아래 「밟은 함정」의 백슬래시 건이다. `<!--` 만 멀쩡했다 —
  **셋 중 하나만 시험했으면 못 잡았다**
- `principles.ps1` 의 P4 가 **주석에 적은 `Date.now()` 를 FAIL 로 잡았다.** 게이트가
  줄 단위로 세기 때문이다. 무디지만 그 무딤이 힘이다 — 주석을 고쳐서 통과시켰다

**분량 규칙(SPEC §4.1 5단계)은 실제로 일어난다**
- `case-3-overflow`: CLAUDE.md 가 **18,009자** → 정책 56개를 `.claude/rules/policies.md`
  로 옮기고 CLAUDE.md 는 444자가 됐다. 경고 문자열이 `warnings` 에 남는다
- 30,000자 분할은 `budget.test.ts` 가 90개 규칙으로 만들어 잰다 (골든으로 하면 픽스처가
  너무 커진다). **줄 가운데서 자르지 않는다**를 시험이 잠갔다

**루프 실주행 기준선** — 지난 바퀴가 「읽어서 적어라」고 남긴 자리다. **읽었다**
(`logs/cycles/*.jsonl` 의 `result` 줄)

| | dry001·002 | c001 `5dfefb4` | c002 `a4ac92d` | **c003 `8e02f48`** |
|---|---|---|---|---|
| 한 일 | (dryrun) | 모노레포 뼈대 | `packages/schema` | **`packages/compiler`** |
| 시간 | 24초 · 21초 | 9.5분 | 18.2분 | **32.1분** |
| 턴 | 7 · 7 | 52 | 93 | 92 |
| 비용 | $0.42 · $0.41 | $4.02 | $9.07 | **$13.90** |

🔴 **c003 이 `CycleTimeoutMin`(45분)의 71% 를 썼다.** 세 바퀴가 9.5 → 18.2 → **32.1분**
으로 계속 올랐고, 턴 수는 92~93 에서 평평한데 시간·비용만 늘었다 — **한 턴이 무거워지고
있다**(읽을 코드가 늘어서). 다음 큰 행(API 1군 · 웹 화면)은 c003 보다 크다.
→ **한도를 올리는 것은 사람의 결정이다**(`MaxCostUsd` 는 사용자가 30→50 으로 올렸다 —
`dc7563d`). 루프는 여기 적고 지나간다. 대신 **한 바퀴에 한 행**을 지키면
「중간에 잘려서 통째로 날아가는」 일은 없다 — ⑤ 대로 검사 통과 즉시 커밋한다.

⚠ 이 표를 다음 바퀴가 다시 채워라. c004(이 바퀴)의 `result` 줄은 **바퀴가 끝나야** 쓰인다.

## 눈 판정 대기

_(없음 — 4바퀴도 화면을 만들지 않았고 **산출물을 바꾸지도 않았다**(고친 것은 `tools/ci.ps1`
하나뿐이고 golden 은 그대로다). 그래서 3바퀴의 Pack 눈 판정이 그대로 선다 — 그때
`case-1-small` 의 `CLAUDE.md` 를 통째로 읽고 「팀 규칙으로 배포해도 되겠다」에 ○ 했고,
눈으로 본 것 두 가지를 고쳐서 golden 을 다시 냈다.)_

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| Supabase 프로젝트 생성 · 키 발급 | 계정·결제가 필요하다 | **P1 시작할 때 — 다다음 바퀴다** |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 | 계정 연결이 필요하다 | P5 |
| 실데이터 픽스처 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 합성 픽스처만) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** `.env.example` 과 코드 배선까지만 하고
여기 적고 멈춘다.

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

- 🔴 **파일을 셸 heredoc(`<<'EOF'`) 으로 쓰면 `\\` 가 `\` 로 접힌다.** 따옴표를 씌운
  heredoc 인데도 그렇다. `'\\|'` 로 적은 JS 문자열이 파일에는 `'\|'` 로 들어갔고,
  `'\|' === '|'` 이라 **escape 가 아무 일도 안 하게 됐다.** 정규식 안의 홑 백슬래시
  (`/\r\n?/`)는 멀쩡했다 — **`\\` 만 접힌다.**
  → 코드 파일은 **Write 도구로 써라.** 꼭 셸로 써야 하면 `String.raw` 를 쓰고,
  쓴 뒤에 `grep` 으로 백슬래시를 눈으로 확인해라. **조용히 틀리는 종류다.**
- **`tools/principles.ps1` 은 주석도 센다.** `packages/compiler/src` 안에서는
  `Date.now(`·`Math.random(`·`process.env` 를 **주석에도 쓰면 안 된다** (P4 FAIL).
  게이트를 똑똑하게 만들려 하지 마라 — 무딘 게이트가 우회할 구멍이 없다.
- **`git commit` 이 「Author identity unknown」으로 죽었다.** 전역 `.gitconfig` 에
  `user.name` 만 있고 `user.email` 이 없었다. 이 저장소에 로컬로 박아 두고 지나갔다
  (`git config user.email rhdqngusanr@gmail.com`). **무인 세션은 물어볼 사람이 없어서
  여기서 통째로 막힌다** — 새 기계에서 루프를 켜면 제일 먼저 확인해라.
- **`.ps1` 을 고칠 때는 Edit 도구를 써라 — BOM 과 CRLF 를 그대로 둔다.** 4바퀴에
  `ci.ps1` 을 42줄 고치고 확인했다: `CRLF 202 · bare LF 0 · BOM True`.
  **확인은 `file`·`grep`·`awk` 로 하지 마라** — Git Bash 의 그 도구들은 `\r` 을 삼켜서
  CRLF 202줄인 파일을 **「CRLF 0줄」로 보고한다.** 바이트로 세라:
  `python -c "d=open(p,'rb').read(); print(d.count(b'\r\n'))"`.
- **파이썬으로 `.ps1` 을 고치면 CRLF 가 LF 로 바뀐다.** `io.open` 은 텍스트 모드로
  읽을 때 줄바꿈을 LF 하나로 번역해 버린다. `.gitattributes` 가 `*.ps1 text eol=crlf`
  라서 `git add` 가 경고로 알려 줬다 — 읽을 때 `newline=''` 를 주고, BOM(`utf-8-sig`)과
  CRLF **둘 다** 지켜야 한다.
- **`pnpm -r` 은 멤버가 0개면 조용히 exit 0 이다.** FINDINGS 1번으로 올렸다.
- **pnpm 11 에서 설치 스크립트를 허용하는 키는 `allowBuilds` 다.**
  `onlyBuiltDependencies`·`ignoredBuiltDependencies` 는 `pnpm config get` 에는 보이는데
  **설치를 통과시키지 못한다.** FINDINGS 6번.
- **`z.toJSONSchema` 는 기본이 인라인이다.** 항목 10종 유니온이 통째로 복사돼
  `proposal.json` 이 109KB 가 됐다. `reused: 'ref'` 로 30KB — **산출물을 열어 보지 않으면**
  테스트는 초록인 채로 사람이 못 읽는 파일을 배포한다.
- **`as const satisfies Record<K, V>` 는 표를 읽는 쪽을 망가뜨린다.** 리터럴 타입이 남아서
  optional 필드(`heading` 없는 slot)를 **읽을 수 없다.** 표는 `const X: Record<K, V> = {…}`
  로 **타입을 명시**해라 — 키 누락 검사는 그대로 받고, 읽는 쪽은 한 가지 타입만 본다.
