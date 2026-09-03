# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 2바퀴 · `dc66593` `a4ac92d`_

---

## 지금 어디인가

**P0 둘째 행(`packages/schema`) 끝. 다음은 `packages/compiler` 전체.**
제품 코드가 처음으로 생겼다 — `packages/schema/src` 7파일 · 547줄 · 테스트 71개.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | `apps/web` |
| **`packages/schema/src`** (계약 전부) · **`packages/schema/test`** (71개) | `packages/compiler/src` (설정 셋만) |
| **`plugin/contextops/schemas/*.json`** 7개 (121KB) | `plugin/contextops` 의 나머지(bin·skills·hooks) |
| `docs/SPEC.md` · `DESIGN_BRIEF.md` · `PLAN.md` | `fixtures/` · Supabase · Vercel |

검사 층: `principles OK · typecheck OK · test OK · build SKIP · walkthrough SKIP`.
**principles 가 OK 1 → OK 3 으로 늘었다** — `P1`(코드·secret·기억 필드 0건)과
`P1b`(업로드 스키마 `.strict()`)가 **SKIP 을 벗었다.** 지난 바퀴가 「schema 를 만들고도
P1 이 SKIP 이면 그게 고장이다」라고 적어 둔 자리다.
남은 SKIP 4개는 아직 대상이 없어서 맞는 SKIP 이다:
P4·P4b 는 `packages/compiler/src`, P7 은 `compiler/templates`, P3 은 `apps/web/src`,
P6 은 `session-start.mjs` 가 생기면 풀린다.
→ **다음 바퀴에 compiler 를 만들고도 P4·P4b·P7 이 SKIP 이면 그게 고장이다.**

## 다음 바퀴가 할 일

`docs/PLAN.md` **P0 셋째 행**: `packages/compiler` 전체 (SPEC §4).
관통 시나리오는 아직 못 돈다 (`walkthrough.ps1` 이 exit 2).

⚠ `packages/compiler` 는 지금 `package.json`·`tsconfig.json`·`vitest.config.ts` **셋만** 있다.
`src/`·`test/`·`templates/` 를 채우는 일이다. 절차는 `pnpm-workspace.yaml` 주석에 있다.

⚠ **컴파일러를 짜기 전에 `docs/feedback/FINDINGS.md` 5번을 읽어라.** `confidence`·
`enforcement`·항목 `status` 를 **거기서 살리거나 지운다.** 어중간하게 두면 「값은 있는데
아무도 안 읽는」 상태가 굳는다.

입력 계약은 이미 있다 — `import { ContextItem, Manifest } from '@contextops/schema'`.
패키지 안쪽(`src/item`)을 직접 import 하지 마라 (공개 API 는 `src/index.ts` 하나).

## 잰 것

**P0 둘째 행 · `packages/schema`** (`a4ac92d`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK / typecheck OK / test OK / build SKIP / walkthrough SKIP |
| principles | **OK 3** · SKIP 4 · FAIL 0 (P1 = 7파일 · P1b = `.strict()` 4파일) |
| test | 테스트 **71개** 초록 · 5파일 · 296ms |
| typecheck | 3초 (루트 + 2패키지) |
| 스키마 소스 | 7파일 · 547줄 (`common`·`item`·`upload`·`manifest`·`json-schema`·`table`·`index`) |
| JSON Schema 산출 | 7파일 · 121KB (`reused:'ref'` 로 `proposal.json` 109KB → 30KB) |
| 새 의존성 | zod 4.5.4 · tsx 4.23.13 · @types/node 22.20.1 (전부 catalog) |

**「초록」이 「검사했다」인지 직접 확인했다** — 두 번 일부러 깨 보고 되돌렸다:
- `ITEM_DATA.constraint` 를 `MissionData` 로 바꿔치기 → **7 failed**
  (「한 타입의 data 는 그 타입에서만 통과한다」 10x10 행렬 + JSON Schema 표류 검사가 같이 잡았다)
- `SyncReport` 에서 `.strict()` 제거 → **2 failed** (P1 allowlist 테스트가 잡았다)
- 산출물을 눈으로 읽었다: `sync-report.json`·`progress-event.json` 전 계층에
  `additionalProperties:false` · 경로 pattern 이 `/`·`..`·`C:` 를 거부 ·
  progress 근거의 속성이 `path`/`start_line`/`end_line`/`commit_sha` **넷뿐**

**루프 실주행 기준선** (dryrun 이 아니라 파일을 쓰고 커밋까지 간 바퀴)

| | dryrun 2바퀴 | 실주행 c001 (`5dfefb4`) |
|---|---|---|
| 시간 | 24초 · 21초 | **9분 30초** |
| 턴 | 7 · 7 | **52** |
| 비용 | $0.42 · $0.41 | **$4.02** |

→ `CycleTimeoutMin`(45분)·`MaxCostUsd`($30)는 실주행 c001 기준 **4~7배 여유**다. 그대로 둔다.
이 바퀴(c002)는 INBOX 지시 + PLAN 한 행을 함께 해서 c001 보다 길다 —
끝난 뒤 `logs/cycles/2026-09-03_c002.jsonl` 의 `result` 줄에서 읽어 다음 바퀴가 여기 적어라.

## 눈 판정 대기

_(없음 — 이번 바퀴는 화면을 만들지 않았다. 산출물인 JSON Schema 7개는 위 「잰 것」에
적은 대로 직접 열어 읽고 판정했다.)_

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| Supabase 프로젝트 생성 · 키 발급 | 계정·결제가 필요하다 | P1 시작할 때 |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 | 계정 연결이 필요하다 | P5 |
| 실데이터 픽스처 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 합성 픽스처만) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** `.env.example` 과 코드 배선까지만 하고
여기 적고 멈춘다.

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

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
  **설치를 통과시키지 못한다.** `tsx` 를 넣자 모든 `pnpm install` 이 exit 1 이 됐고,
  `pnpm approve-builds esbuild` 를 돌려야 풀렸다 (그 명령이 yaml 을 고친다). FINDINGS 6번.
- **`z.toJSONSchema` 는 기본이 인라인이다.** 항목 10종 유니온이 통째로 복사돼
  `proposal.json` 이 109KB 가 됐다. `reused: 'ref'` 로 30KB — **산출물을 열어 보지 않으면**
  테스트는 초록인 채로 사람이 못 읽는 파일을 배포한다.
