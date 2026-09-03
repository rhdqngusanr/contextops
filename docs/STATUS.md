# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 5바퀴 · `dc66593` `a4ac92d` `8e02f48` `84ce3ea` `0236e36`_

---

## 지금 어디인가

**🔴 P0 이 끝났다. 네 행 전부 `- [x]` 다. 다음은 P1 첫 행(DB·Drizzle)이다.**
이번 바퀴에 paylab 픽스처를 만들면서 **관통의 입구가 생겼다** — 지금까지 관통은
「손으로 만든 항목 → Pack」에서 시작했는데, 이제 그 앞에 **문서와 코드**가 있다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | `apps/web` · Supabase · Vercel |
| `packages/schema` (계약 전부 · 테스트 71) | `plugin/contextops` 의 bin·skills·hooks |
| `packages/compiler` (파이프라인 7단계 · 테스트 112) | 서버측 AI (`structureDocument`·`detectConflicts`) |
| **`fixtures/paylab-api`(TS 42) · `fixtures/paylab-docs`(151줄 + 폐기 로드맵)** | |
| `plugin/contextops/schemas/*.json` 7개 | |
| `docs/SPEC.md` · `DESIGN_BRIEF.md` · `PLAN.md` | |

검사 층: `principles OK 6 · typecheck OK(멤버 2) · test OK(멤버 2) · build SKIP · walkthrough OK`.
**관통이 1 → 2 단계가 됐다** — `fixture` 단계가 새로 켜졌다 (`compile` 앞).
남은 SKIP 4개(`api`·`publish`·`payload`·`sync`)와 principles SKIP 2개(`P3`·`P6`)는
`apps/web`·`plugin` 이 없어서 나는 **맞는 SKIP** 이다.

## 다음 바퀴가 할 일

`docs/PLAN.md` **P1 첫 행**: DB 스키마 · Drizzle 마이그레이션 (SPEC §2 · §2.1) + `.env.example`.
완료 기준은 「마이그레이션이 로컬에서 적용됨 · 인덱스 5개 존재」.

⚠ **여기서 사람이 필요하다** (아래 「막힌 것」). Supabase 프로젝트 생성·키 발급은 루프가
못 한다. **루프는 스키마·마이그레이션 파일·`.env.example` 까지 하고 멈추고 여기 적는다.**
「마이그레이션이 로컬에서 적용됨」을 못 채우면 그 행을 `- [x]` 로 바꾸지 말고
어디까지 했는지 적어라 — 반쯤 된 것을 완료로 적으면 다음 바퀴가 그 위에 쌓는다.

⚠ **FINDINGS 「다음에 고칠 것」 맨 위 셋(12·7·13)은 주인이 뒤 Phase 행이라 지금 고치지 마라.**
셋 다 「소비처가 생길 때 같이 살린다」가 고칠 방향이고, 지금 스키마만 만들면
정의만 있고 아무 일도 안 하는 표가 하나 더 생긴다.
- 12번(에러 코드 9종) → **P1 「API 1군」 행이 주인. 다다음 바퀴다** — 그때 반드시 같이 해라
- 7번(agents·cursor 타깃) → P5 행 · 13번(ProgressEvent 상태 4종) → P2/P4 행

지금 손댈 수 있는 것 중 **값싼 것**은 FINDINGS 14번(`.ps1` 두 개가 LF)이다. 5분짜리다.

## 잰 것

**5바퀴 · P0 마지막 행 — paylab 픽스처** (`0236e36`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK 6 / typecheck OK 3초·멤버 2개 / test OK 2초·멤버 2개 / build SKIP / **walkthrough OK 2단계** |
| 픽스처 코드 | `fixtures/paylab-api` — **TS 42파일** · 전체 49파일 (prisma·docker-compose·deploy.yml·.env.example 포함) |
| 픽스처 문서 | `goals.md` **151줄** · `old-roadmap.md`(갱신일 2025-09-04) |
| 새 게이트 | `tools/fixtures.mjs` — **검사 20종 전부 OK** (파일 9 · 분량 2 · P1 1 · 충돌 3 · 질문 1 · 로드맵 3 · stale 1) |
| 관통 | 1단계 → **2단계** (`fixture` OK 0초 · `compile` OK 1초) |
| 다른 파일 | `tools/walkthrough.ps1` +5줄(단계 하나). 그 외 0건 — **`packages/` 는 건드리지 않았다** |

**어긋남 3곳을 「양쪽에」 심었다** — 한쪽만 있으면 충돌이 아니라 그냥 규칙이거나 그냥 코드다.
SPEC §7.2 의 `doc_vs_code` 는 두 항목을 나란히 놓아야 만들어진다.

| # | 문서 쪽 (`goals.md`) | 코드 쪽 |
|---|---|---|
| ① | 「최대 **5회까지 재시도**」 + 「지수 백오프」 + 「고정 간격 금지」 | `src/payment/retry.ts` — `MAX_RETRY = 3` · `RETRY_DELAY_MS = 500` 고정 |
| ② | 「접수 후 **24시간 안에 종결**」 + 「기한 없이 pending 금지」 | `src/refund/policy.ts` — 「종결 기한은 두지 않는다」 · `REFUND_CALL_TIMEOUT_MS = 0` |
| ③ | 「로그에 **PII 를 남기지 않는다**」(이메일·생년월일·원본 payload) | `src/webhook/webhook.controller.ts` — `payer.email`·`birth_date`·`raw` 를 통째로 log |

**「초록」이 「검사했다」인지 직접 확인했다** — 값을 뒤집어 **4번 빨갛게 만들어 봤다.**
새 게이트가 처음부터 OK 20 이라 그대로 두면 「아무것도 안 세는 게이트」와 구별이 안 된다.

| 무엇을 뒤집었나 | 결과 |
|---|---|
| `MAX_RETRY` 3 → 5 (코드를 문서에 맞춤) | `FAIL 충돌 — 코드 쪽 1개 없음` · OK 19 |
| `.env.example` 에 `PSP_A_API_KEY=sk_live_…` | `FAIL P1 — 값 1건` · OK 19 |
| 「아직 정하지 못한 것」 4 → 3개 | `FAIL 질문 — 3개` (+ 줄 수가 150 아래로 떨어져 `FAIL 분량`) · OK 18 |
| `old-roadmap.md` 갱신일을 goals 보다 최신으로 | `FAIL stale — 2026-08-01 < 2026-03-11` · OK 19 |

넷 다 원복 후 **OK 20 · FAIL 0**. 게이트가 실제로 갈린다.

**답안지를 픽스처 안에 두지 않았다** — 어긋남 위치는 `tools/fixtures.mjs` 에만 산다.
★ 왜 — `fixtures/README.md` 에 적으면 픽스처를 **입력으로 받는 서버 AI**(P3)도 답을
먼저 본다. 픽스처는 답을 모르는 채로 읽혀야 시험이 된다. 파일 머리 주석에 이 이유를 적어 뒀다.

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드 2종 확인**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| `Manifest.milestones` · `excluded` | `compiler/src/compile.ts:80` `milestonesOf()` · `assemble.ts` | golden 3종이 **비어 있지 않다** — milestones 2/1/1 (`PL-M1`·`PL-M2`·`M1`) · excluded 2/0/0. byte 로 잠겨 있다 | **살아 있다** |
| **`ProgressEvent.status` 4종 · `source` 3종** | **`z.enum(...)` 자기 자신뿐** | 시험이 「4종이 전부 **통과한다**」만 본다 — 3종이 죽어도 초록 | **구멍** → FINDINGS 13번 |

⚠ 대비를 기억해라 — 옆의 `REPORTABLE_SYNC_STATUSES` 는 「`unknown` 을 뺀다」는 **차이**를
시험이 잡는다. 「전부 파싱된다」는 시험은 liveness 시험이 아니다.

**루프 실주행 기준선** — `logs/cycles/*.jsonl` 의 `result` 줄에서 읽었다

| | dry001·002 | c001 `5dfefb4` | c002 `a4ac92d` | c003 `8e02f48` | c004 `84ce3ea` |
|---|---|---|---|---|---|
| 한 일 | (dryrun) | 모노레포 뼈대 | `packages/schema` | `packages/compiler` | CI 가짜 OK 차단 |
| 시간 | 24초 · 21초 | 9.5분 | 18.2분 | 32.1분 | (다음 바퀴가 채워라) |
| 턴 | 7 · 7 | 52 | 93 | 92 | |
| 비용 | $0.42 · $0.41 | $4.02 | $9.07 | $13.90 | |

🔴 c003 이 `CycleTimeoutMin`(45분)의 71% 를 썼다. 9.5 → 18.2 → 32.1분으로 계속 올랐고
턴 수는 평평한데 시간·비용만 늘었다 — **한 턴이 무거워지고 있다**(읽을 코드가 늘어서).
→ 한도를 올리는 것은 사람의 결정이다 (`MaxCostUsd` 는 사용자가 30→50 으로 올렸다 · `dc7563d`).
대신 **한 바퀴에 한 행**을 지키면 「중간에 잘려서 통째로 날아가는」 일은 없다 —
⑤ 대로 검사 통과 즉시 커밋한다. 이번 바퀴도 그렇게 했다 (눈 판정 전에 `0236e36`).

⚠ **c004·c005 칸이 비어 있다. 다음 바퀴가 채워라** — `result` 줄은 바퀴가 **끝나야** 쓰인다.

## 눈 판정 대기

_(없음 — 5바퀴는 화면을 만들지 않았고 **Pack 산출물도 바꾸지 않았다**.
`packages/` 를 한 줄도 건드리지 않았으므로 golden 은 그대로고, 3바퀴의 Pack 눈 판정이
그대로 선다 — 그때 `case-1-small` 의 `CLAUDE.md` 를 통째로 읽고 「팀 규칙으로 배포해도
되겠다」에 ○ 했다.)_

**이번 바퀴에 눈으로 본 것** — 산출물이 픽스처라서 픽스처를 읽었다:
- `goals.md` 를 사람으로 읽었다. 「팀장이 쓴 문서」로 읽히고 **퍼즐로 읽히지 않는다** —
  어긋남 3곳이 규칙 절(3.1~3.3)에 자연스럽게 섞여 있고, 어디가 함정인지 문서가 말하지 않는다
- heredoc 으로 쓴 파일들의 **한글·따옴표가 안 깨졌는지** 직접 열어 확인했다
  (`money.ts`·`entry.ts`·`logger.service.ts`·`mask.ts`) — 멀쩡하다
- 코드 주석이 `old-roadmap.md` 를 가리키게 뒀다 (`retry.ts` 의 「2025 하반기 로드맵의
  3회·0.5초 고정 규칙 그대로다」). **답안지가 아니라 `stale` 판정의 근거다** —
  실제 저장소에도 이런 주석이 있고, 없으면 AI 가 「무엇이 무효인가」를 추측해야 한다

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| Supabase 프로젝트 생성 · 키 발급 | 계정·결제가 필요하다 | **🔴 다음 바퀴다 (P1 첫 행)** |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 | 계정 연결이 필요하다 | P5 |
| 실데이터 픽스처(`brain`) 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만 · SPEC §14 절삭 6번) |

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
- **heredoc 을 여러 개 이어 붙이면 통째로 죽는다 — 그리고 파일이 하나도 안 생긴다.**
  5바퀴에 `cat > a <<'EOF' … cat > h <<'EOF'` 를 8개 이어 보냈다가
  `unexpected EOF while looking for matching '` 로 **8개 전부 0바이트**였다.
  앞의 3~4개는 만들어져 있을 거라고 착각하기 쉽다 — `ls` 로 확인하니 **디렉터리만** 있었다.
  → 코드 파일은 Write 도구로 하나씩. 셸 heredoc 은 **한 번에 한두 개**까지만.
- **`tools/principles.ps1` 은 주석도 센다.** `packages/compiler/src` 안에서는
  `Date.now(`·`Math.random(`·`process.env` 를 **주석에도 쓰면 안 된다** (P4 FAIL).
  게이트를 똑똑하게 만들려 하지 마라 — 무딘 게이트가 우회할 구멍이 없다.
  (⚠ `fixtures/` 는 principles 가 세지 않는다. paylab 코드에 `Date.now()`·`fetch()` 가
  있어도 초록인 게 맞다 — 그건 **픽스처가 흉내 내는 남의 저장소**다)
- **`git commit` 이 「Author identity unknown」으로 죽었다.** 전역 `.gitconfig` 에
  `user.name` 만 있고 `user.email` 이 없었다. 이 저장소에 로컬로 박아 두고 지나갔다
  (`git config user.email rhdqngusanr@gmail.com`). **무인 세션은 물어볼 사람이 없어서
  여기서 통째로 막힌다** — 새 기계에서 루프를 켜면 제일 먼저 확인해라.
- **`.ps1` 을 고칠 때는 Edit 도구를 써라 — BOM 과 CRLF 를 그대로 둔다.** 4바퀴에
  `ci.ps1` 을 42줄 고치고 확인했다: `CRLF 202 · bare LF 0 · BOM True`.
  **확인은 `file`·`grep`·`awk` 로 하지 마라** — Git Bash 의 그 도구들은 `\r` 을 삼켜서
  CRLF 202줄인 파일을 **「CRLF 0줄」로 보고한다.** 바이트로 세라:
  `python -c "d=open(p,'rb').read(); print(d.count(b'\r\n'))"`.
  (5바퀴에 그렇게 세다가 **`walkthrough.ps1`·`principles.ps1` 이 LF 로 갈려 있는 것**을
  찾았다 → FINDINGS 14번. Edit 도구는 원래 줄바꿈을 지키므로 **내가 만든 게 아니다**)
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
