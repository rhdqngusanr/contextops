# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 1바퀴 (첫 실주행) · `5dfefb4`_

---

## 지금 어디인가

**P0 첫 행(모노레포 뼈대) 끝. 다음은 `packages/schema` 전체.**
제품 코드는 아직 **설정 파일뿐**이다 — `src/` 는 어느 패키지에도 없다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` (ci·principles·walkthrough) | `apps/web` · `plugin/contextops` |
| **pnpm workspace + catalog · `tsconfig.base.json` · `vitest.base.ts` · `.nvmrc` · `.github/workflows/ci.yml`** | `packages/schema/src` · `packages/compiler/src` (설정 셋만 있고 소스 없음) |
| `docs/SPEC.md` · `DESIGN_BRIEF.md` · `PLAN.md` | `fixtures/` · Supabase · Vercel |

검사 층: `principles OK · typecheck OK · test OK · build SKIP · walkthrough SKIP`.
**typecheck·test 가 SKIP 을 벗었다** — 이 바퀴의 완료 기준이었다.
`principles` 는 P2 하나만 OK 고 나머지 5개는 SKIP 이다 (**대상이 아직 없어서 맞는 SKIP**):
P1·P1b 는 `packages/schema/src` 가, P4·P4b 는 `packages/compiler/src` 가,
P6 는 `session-start.mjs` 가, P7 은 `compiler/templates` 가 생기면 저절로 풀린다.
→ **다음 바퀴에 schema 를 만들고도 P1·P1b 가 SKIP 이면 그게 고장이다.**

## 다음 바퀴가 할 일

`docs/PLAN.md` **P0 둘째 행**: `packages/schema` 전체 (SPEC §3 · §3.1).
관통 시나리오는 아직 못 돈다 (`walkthrough.ps1` 이 exit 2 = 「단계가 하나도 안 켜졌다」).

⚠ 지금 `packages/schema` 폴더에는 `package.json`·`tsconfig.json`·`vitest.config.ts`
**셋만** 있다. 새 패키지를 만드는 게 아니라 **`src/` 와 `test/` 를 채우는 일**이다.
`packages/compiler` 도 똑같은 상태다(셋째 행). 절차는 `pnpm-workspace.yaml` 주석에 있다.

## 잰 것

**P0 첫 행 · 모노레포 뼈대** (`5dfefb4`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK / typecheck OK / test OK / build SKIP / walkthrough SKIP |
| typecheck | 2초 (`tsc --noEmit` 루트 + `pnpm -r exec tsc --noEmit` 2패키지) |
| test | 1초 · 테스트 **0개** · vitest 4.1.11 `passWithNoTests` |
| principles | OK 1 · SKIP 5 · FAIL 0 (P2 가 SKIP → OK) |
| 워크스페이스 멤버 | 2 (`@contextops/schema` · `@contextops/compiler`) |
| 고정 버전 | node 22.22.2 · pnpm 11.25.0 · typescript 5.9.3 · vitest 4.1.11 |
| 설치 | 45 패키지 · 5.1초 |

**층이 공허하지 않은지 직접 확인했다** (「초록」이 「검사했다」인지):
- `packages/schema/vitest.config.ts` 에 `const broken: number = "…"` → typecheck **exit 1** (TS2322)
- `packages/schema/test/__probe.test.ts` 에 실패 테스트 1개 → test **exit 1** (1 failed)
- 둘 다 되돌린 뒤 0개 테스트로 초록
- `tsc --noEmit --listFiles` 에 `C:/dev/hackathon/vitest.base.ts` 포함 확인
  (워크스페이스 밖 파일이라 `pnpm -r exec tsc` 는 절대 못 본다 → 루트 `tsconfig.json` 을 따로 뒀다)

**루프 기준선** (2026-09-03 dryrun 2바퀴 · `logs/cycles/2026-09-03_dry00*.jsonl`)

| | 바퀴 1 | 바퀴 2 |
|---|---|---|
| 시간 | 24초 | 21초 |
| 턴 | 7 | 7 |
| 비용 | $0.42 | $0.41 |

⚠ 위 dryrun 은 「읽고 판단하는」 부분만 잰 것이다. **이번이 첫 실주행이고**
파일을 쓰고 CI 를 돌리고 커밋까지 갔다 — 실주행 시간·비용은 이 바퀴의
`logs/cycles/*.jsonl` 에서 읽어 다음 바퀴가 여기에 적어라. `CycleTimeoutMin`(45분)과
`MaxCostUsd`($30)를 그 숫자에 맞춘다.

## 눈 판정 대기

_(없음 — 이번 바퀴는 화면을 만들지 않았다. 산출물이 전부 설정 파일이라
눈 판정 대상이 아니고, CI 층 5개를 직접 읽어 판정했다.)_

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
