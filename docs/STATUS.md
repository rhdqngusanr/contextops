# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 0바퀴_

---

## 지금 어디인가

**P0 시작 전.** 저장소에는 **루프와 문서만** 있다. 제품 코드는 아직 한 줄도 없다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` — 자율 루프 일체 (env·loop·ctl·relay·PROMPT·HANDOFF) | `apps/web` · `packages/schema` · `packages/compiler` · `plugin/` |
| `tools/ci.ps1` · `principles.ps1` · `walkthrough.ps1` | `fixtures/` · `pnpm-workspace.yaml` · 테스트 |
| `docs/SPEC.md` · `DESIGN_BRIEF.md` · `PLAN.md` | Supabase 프로젝트 · Vercel 연결 |

→ 검사 층 대부분이 `SKIP` 이다. **P0 단계에서는 정상이다.**
대상이 생기면 SKIP 이 저절로 풀린다 — 안 풀리면 그게 고장이다.

## 다음 바퀴가 할 일

`docs/PLAN.md` **P0 첫 행**: 모노레포 뼈대.
관통 시나리오는 아직 돌 수 없다 (`PROMPT.md` ④0 을 따라 PLAN 에서 고른다).

## 잰 것

_(아직 없음. 첫 바퀴부터 여기에 숫자를 남긴다 — 테스트 수, 파일 수, 해시, 초.)_

## 눈 판정 대기

_(없음)_

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| Supabase 프로젝트 생성 · 키 발급 | 계정·결제가 필요하다 | P1 시작할 때 |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 | 계정 연결이 필요하다 | P5 |
| 실데이터 픽스처 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** `.env.example` 과 코드 배선까지만 하고
여기 적고 멈춘다.

## 밟은 함정

_(루프가 같은 벽에 두 번 부딪히면 여기 적는다. 두 번 나온 것은 `loop/PROMPT.md` ③ 의
규칙으로, 기계가 잴 수 있으면 `tools/principles.ps1` 의 검사로 올린다.)_
