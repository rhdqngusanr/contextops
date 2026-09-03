# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 3바퀴 · `dc66593` `a4ac92d` `8e02f48`_

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

검사 층: `principles OK · typecheck OK · test OK · build SKIP · walkthrough OK`.
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

## 잰 것

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

**루프 실주행 기준선**

| | dryrun 2바퀴 | 실주행 c001 (`5dfefb4`) |
|---|---|---|
| 시간 | 24초 · 21초 | **9분 30초** |
| 턴 | 7 · 7 | **52** |
| 비용 | $0.42 · $0.41 | **$4.02** |

→ `CycleTimeoutMin`(45분)·`MaxCostUsd`($50)는 c001 기준으로 넉넉하다. 그대로 둔다.
c002·c003 의 실제 값은 `logs/cycles/2026-09-03_c00*.jsonl` 의 `result` 줄에 있다 —
읽어서 다음 바퀴가 여기 적어라 (특히 **c003 은 컴파일러를 통째로 만든 바퀴**라
「한 행이 얼마나 드나」의 상한에 가깝다).

## 눈 판정 대기

_(없음 — 이번 바퀴는 화면을 만들지 않았다. 산출물인 Pack 3벌은 위 「잰 것」에 적은 대로
직접 열어 읽고 판정했고, 눈으로 본 것 두 가지를 고쳐서 golden 을 다시 냈다.)_

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
