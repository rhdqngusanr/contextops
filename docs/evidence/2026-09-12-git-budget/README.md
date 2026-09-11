# 2026-09-12 — stop 훅의 git 예산을 **재고 나서** 고쳤다

`plugin/contextops/test/hooks.test.ts` 의 「stop 이 바꾼 경로가 `_writes` 선언과 정확히 같다」가
코드와 무관하게 간헐적으로 `expected 0 to be greater than 0` 으로 빨개지던 자리의 근거다.

⚠ **이것은 FINDINGS 153 이 아니다.** 153 은 `testTimeout`(vitest 가 시험을 죽이는 시간)이고
`30f0fd8` 로 이미 닫혔다. 여기는 **훅 자신의 git 한도**다 — 시험은 시간 초과로 죽은 것이 아니라
끝까지 돌고 **단언에서** 실패했다(4670ms · 상한 30초). 증상이 비슷해 한 번 잘못 묶었다.

## 왜 조용히 실패하나

`stop.mjs` 의 `git()` 은 `execFileSync(..., { timeout: GIT_TIMEOUT_MS })` 를 `try/catch` 로 감싸고
실패하면 `''` 를 돌려준다. 그래서 **「저장소가 아니다」와 「시간 초과」가 같은 값**이 된다.
시간 초과가 나면 `changedPaths()` 가 빈 배열이 되고 훅은 「변경 없음」으로 물러선다 —
훅으로서는 옳은 동작이지만, 그 시험은 훅이 **무언가 썼다**는 것을 전제로 한다.

## 잰 것

`measure-git.mjs` — `stop.mjs` 가 실제로 부르는 두 명령(`git diff --name-only HEAD`,
`git ls-files --others --exclude-standard`)을 같은 모양으로 띄워서 잰다.

| 조건 | 두 호출 합 | 한 번 최악 |
|---|---|---|
| 한가할 때 (12회) | 62 · 68 · 92 (min·중앙·max) | 39ms |
| CPU 16개 부하 (12회) | 154 · 266 · 420 | — |
| **실제 `pnpm -r test` 가 도는 중 (25회)** | 68 · 93 · **1393** | **1235ms** |

```
node docs/evidence/2026-09-12-git-budget/measure-git.mjs idle 12
node docs/evidence/2026-09-12-git-budget/measure-git.mjs load 12 16
# 세 번째 줄은 다른 창에서 `pnpm -r test` 를 돌리는 동안 idle 모드로 잰 것이다
```

🔴 **부하에서 git 한 번이 한가할 때의 약 32배**(39 → 1235ms)가 된다.
CPU 경합만으로는 420ms 까지밖에 안 가므로, 느리게 만드는 것은 CPU 가 아니라
**동시에 도는 vitest 넷이 만드는 프로세스 생성·파일 I/O** 다.

## 왜 한도를 올리는 것으로는 못 고치나

옛 한도는 `GIT_TIMEOUT_MS = 1400` 이고 실측 최악 1235ms 의 **1.13배**뿐이었다.
그런데 더 올릴 수가 없다 — `hooks.json` 의 timeout 이 5초이고, 단계마다 고정 한도를 주면
최악이 `2 × git + 네트워크` 라서 **git 은 1500 위로 못 간다** (네트워크를 0 으로 해도).
2026-09-10 에 1000 → 1400 으로 올린 것이 이 한계에 부딪힌 시도였고, 09-11 에 또 났다.

## 고친 방향 — 단계별 한도 대신 **마감 하나**

`HOOK_BUDGET_MS = 4800` 을 두고, 각 단계는 「자기 상한」과 「마감까지 남은 시간」 중
**작은 쪽**을 쓴다 (`withinBudget()`).

- 보통: git 이 60ms 에 끝나므로 남은 예산이 거의 그대로 네트워크로 간다.
- 느린 날: git 이 **안 쓰인 예산을 빌려** 최대 2800ms 까지 버틴다 — 실측 최악의 **2.3배**.
- 합은 어떤 경우에도 4800ms 를 못 넘는다 < `hooks.json` 의 5000ms.

## 게이트 — 뒤집어 확인했다

`test/hooks.test.ts` 「timeout 이 …」에 셋을 더했고, 셋 다 **실제로 빨개지는 것을 봤다**:

| 뒤집은 것 | 나온 말 |
|---|---|
| `GIT_TIMEOUT_MS` 2800 → 9000 | `stop.mjs: git 상한 9000ms 가 마감 4800ms 보다 크다 — 걸릴 일이 없는 수다` |
| `withinBudget(GIT_TIMEOUT_MS)` → `GIT_TIMEOUT_MS` | `stop.mjs: GIT_TIMEOUT_MS 를 withinBudget() 없이 쓴 자리가 있다` |
| (기존) 마감 > `hooks.json` timeout | `stop.mjs: 최악 …ms (마감 …)` |

⚠ 마감을 선언하지 않은 훅(`session-start.mjs`)은 예전 셈(`네트워크 + git × 호출 수`)을 그대로 쓴다.

## 확인

- `plugin` 단독 3회 연속 — 200 통과 · 1 skip (201)
- `tools/ci.ps1` **GREEN** (2026-09-12 05:27 · principles 9 · 관통 1529)
