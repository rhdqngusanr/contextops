# ContextOps

**팀의 지식과 Claude의 기억을 같은 방향으로**

팀장이 승인한 목표·로드맵·결정을 모든 팀원의 Claude Code에 **같은 버전·같은 해시**로 배포하고,
로드맵이 실제로 진행되는지 **근거와 함께** 보여줍니다. 팀장은 브라우저에서 15분, 개발자는 명령 한 줄.

> Wanted AI Championship 2026 출품작 · 제출 2026-09-20 · 개발 1인 + Claude Code
>
> 제출 팀명 **퇴직했는데저좀이직시켜주세요** · 공개 저장소 <https://github.com/rhdqngusanr/contextops> (MIT)
> — 이 둘의 정본은 랜딩의 `SUBMISSION_IDENTITY`(`apps/web/src/components/landing.tsx`)이고 여기와 제출서가 같은 글자인지 시험이 잽니다.
> 🙋 production URL 은 Vercel 연결 뒤 여기 한 줄입니다. 지금 도는 것과 안 도는 것은 [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) 에 있습니다.

---

## 무엇을 푸는가

AI 코딩 도구는 `CLAUDE.md` 같은 파일로 팀 지식을 받습니다. 그런데 그 파일은 **git을 쓰는 개발자 개인이
각자 관리**합니다. 팀장의 목표·정책은 AI에 안 들어가고, 같은 팀인데 **팀원마다 AI가 다른 답**을 하며,
로드맵이 실제로 어디까지 왔는지 **아무도 모릅니다.**

같은 팀의 두 사람이 같은 질문을 했을 때 — 이것이 샘플 팀(`paylab`)의 실제 문서와 코드입니다:

> **$ PSP 호출이 실패하면 몇 번까지 재시도해?**
>
> | Before · 각자의 Claude | After · Team Context v1.1.0 |
> |---|---|
> | **A** (`paylab-docs/goals.md §3.1`) — 최대 5회까지 지수 백오프로 재시도합니다. 고정 간격은 금지라고 되어 있습니다. | PSP 호출은 최대 5회까지 재시도한다. 간격은 지수 백오프(0.5s·1s·2s·4s·8s)이고, 재시도 대상은 타임아웃과 5xx 뿐이다. |
> | **B** (`paylab-api/src/payment/retry.ts:11`) — MAX_RETRY = 3 이고 간격은 500ms 고정입니다. | must · 근거: `paylab-docs/goals.md §3.1` · `paylab-api/src/payment/retry.ts:11–14` · 팀장 승인 · `<!-- ctx:item_policy_retry -->` |
> | 같은 팀, 같은 질문, 다른 답 | A·B·C 모두 같은 답 |

After 의 문장은 예시가 아니라 **게스트가 `/demo` 에서 실제로 받는 Pack 의 그 줄**입니다.
랜딩(`apps/web/src/components/landing.tsx`)과 이 README 가 같은 문장을 말하는지 시험이 잽니다.

### 어떻게 동작하나

1. **만든다** — 문서·답변·코드에서 항목을 뽑고, 서로 어긋난 것은 사람이 결정합니다. 승인된 것만 남습니다.
2. **배포한다** — 같은 snapshot 은 언제나 같은 Pack 입니다. 모든 기기가 같은 버전·같은 해시를 받습니다.
3. **진행이 보인다** — 각자의 AI 가 작업 끝에 근거를 보고하고, 완료는 사람이 확인합니다. 행은 마일스톤입니다.

```
사용자 로컬 (Claude Code + 플러그인)                 ContextOps (Next.js · Postgres)
──────────────────────────────────────            ─────────────────────────────────
저장소 파일 · .env · 개인 Memory · 대화   ─┐          /api/v1/*  ← allowlist 스키마로만 통과
  (서버로 가지 않는다)                    │          항목 · 충돌 카드 · 제안 · 발행
CLAUDE.md · .claude/rules/*  ◀── Pack ───┼──────    컴파일러 (LLM 없음 · 결정론)
  (sync 할 때만 바뀐다)                   │          서버측 AI (우리 API 키 · 예산 가드)
훅: 알리기만 한다 · 파일을 안 바꾼다      ─┘          Roadmap: 마일스톤별 근거
```

**올라가는 것**: 항목 초안 JSON · Proposal · Progress 이벤트(경로·줄·커밋) · sync 보고(버전·hash)
**내려오는 것**: manifest · Pack 파일

---

## 🔒 신뢰 경계 — 이게 제품의 전부입니다

이 프로젝트에는 **깨면 안 되는 원칙 7개**가 있고, [`tools/principles.ps1`](tools/principles.ps1) 이
매 커밋마다 **기계로 셉니다.** 문서에 적는 것만으로는 안 지켜지기 때문입니다.

| # | 원칙 | 무엇이 잰다 |
|---|---|---|
| **P1** | 서버는 저장소 **코드 본문·secret·개인 Memory·대화 transcript를 절대 받지 않습니다.** 업로드는 `.strict()` allowlist 스키마로만 통과 | 스키마 금지어 0건 · 관통이 진짜 소켓으로 나간 body 를 받아 코드 본문 0건·심은 env 값 0건을 잽니다 |
| **P2** | 제품 코드는 **사용자의 Claude를 대신 호출하지 않습니다.** Claude는 사용자가 Skill을 직접 실행할 때만 동작 | `claude -p`·Agent SDK 가 `plugin/`·`packages/`·`apps/` 에 0건 |
| **P3** | 서버측 LLM은 **우리 API 키**로만 · 4개 기능 한정 · 일일 예산·rate limit | 모든 호출이 `withBudget()` 경유 |
| **P4** | **승인 이후 파이프라인에는 LLM이 없습니다.** 같은 snapshot → byte-identical Pack | 컴파일러에 시각·난수·네트워크 0건 · golden 3종 · 항목 순서를 셔플해도 같은 byte |
| **P5** | 진행은 **마일스톤 단위만.** 개인 생산성 점수·순위를 만들지 않습니다 | 기계로 못 잽니다 — 눈 판정 항목 |
| **P6** | Hook은 **사용자의 파일을 변경하지 않습니다.** 변경은 사용자가 `/contextops:sync` 를 실행할 때만 | 훅이 쓰는 경로는 `hooks.json` 의 `_writes` 에 선언한 git-ignore 경로뿐 · 훅을 프로세스로 돌린 뒤 바이트 대조 |
| **P7** | 모든 Pack 줄은 항목 ID → 원문(문서 offset 또는 `path:line`)으로 **역추적**됩니다 | Pack 전 줄에 `<!-- ctx:… -->` 태그 · 태그 없는 줄이 하나라도 있으면 실패 |

전문은 [`docs/SPEC.md`](docs/SPEC.md) §0.1. **P1 의 근거 문서**는
[`docs/evidence/2026-09-06-p1-payload/p1-payload.md`](docs/evidence/2026-09-06-p1-payload/p1-payload.md) —
어떤 필드가 나갔고 어떤 필드가 **없는지**를 관통 산출물 그대로 적었습니다.

| ✓ 서버가 아는 것 | ✕ 서버가 모르는 것 |
|---|---|
| 팀·프로젝트 ID | 저장소 코드 본문 |
| 구조화된 항목 (제목·규칙·마일스톤) | 환경변수 · secret |
| 팀장이 직접 등록한 문서 원문 | 개인 CLAUDE.local.md |
| 경로 · 줄 번호 · 커밋 해시 | Auto Memory |
| 버전 · manifest 해시 | Claude 대화 내용 |

---

## 둘러보기

- **샘플 팀** — `/demo` 를 열면 게스트 세션으로 샘플 팀에 들어갑니다. 읽기 전용이고 매일 03:00(KST) 초기화됩니다.
  로그인 없이 앱 화면(가져오기 · 정리 · Context · 제안 · Pack Explorer · Roadmap · Sync)을 그대로 봅니다.
- **터미널에서는** — 랜딩의 터미널 재생은 손으로 쓴 줄이 아니라 관통 시나리오가 배포되는 플러그인을
  실제로 돌려 남긴 출력입니다 (`fixtures/replay/sync.json`).

### 개발자 설치

```
claude plugin marketplace add <marketplace>                      # 플러그인 저장소를 등록한다
claude plugin install contextops                                 # 플러그인을 깐다 (훅 · Skill · CLI)
node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" setup          # 이 저장소를 프로젝트에 잇는다 — 토큰은 저장소 밖에
/contextops:init                                                 # Claude Code 안에서 한 번. 저장소를 훑어 첫 항목을 올린다
```

그 다음은 팀장이 웹에서 승인하고, /contextops:sync 로 받는다.

`setup` 이 남기는 것은 둘뿐입니다 — `<repo>/.contextops/project.json`(커밋 · secret 없음) 과
`~/.contextops/credentials.json`(0600 · 저장소 밖). 토큰은 웹에서 발급해 붙여 넣습니다.

| CLI | 하는 일 |
|---|---|
| `scan` | 저장소를 결정론으로 훑어 `.contextops/cache/scan.json` 을 만든다 — 경로·언어·env **키 이름**만. 본문 없음 |
| `validate <json>` | 초안·제안 JSON 이 계약과 맞는지 네트워크 없이 판다 (번들에 같은 Zod 가 들어 있다) |
| `upload-draft` | 초안을 올린다. `--dry-run` 이면 보낼 payload 를 그대로 보여 주고 보내지 않는다 |
| `status` | 무엇이 적용돼 있나 — applied / outdated / modified. 파일을 안 바꾼다 |
| `sync` | 발행된 Pack 을 적용한다 — backup → atomic rename → 적용 뒤 hash 재검증 → 실패하면 전부 복원 |
| `propose` | 변경 제안을 공식 버전 기준으로 올린다 (근거는 `path:line`) |
| `progress` | 마일스톤 진행을 보고한다 — 근거는 경로와 줄 번호뿐 |

Skill 셋(`/contextops:init` · `sync` · `propose`)과 훅 둘(`SessionStart` · `Stop`)은
[`plugin/contextops`](plugin/contextops) 에 있습니다. `SessionStart` 훅은 새 버전이 있으면 **알리기만** 하고,
`Stop` 훅은 바뀐 경로만으로 진행 이벤트를 보고합니다 — 둘 다 LLM 을 부르지 않습니다.

---

## 로컬에서 돌리기

계정이 없어도 전부 돕니다 — DB 는 프로세스 안의 PGlite 이고 서버측 AI 는 키가 없으면 픽스처 결과로 떨어집니다.

```
pnpm install
pnpm --filter web demo:db      # PGlite + paylab 씨앗 + 게스트 데모. DATABASE_URL 등을 찍어 준다
pnpm --filter web dev          # 위가 찍은 값을 환경변수로 주고 띄운다 → http://localhost:3000/demo
```

배포에 필요한 환경변수의 정본은 [`apps/web/.env.example`](apps/web/.env.example) 입니다 (값은 적지 않습니다 — P1).

### 검사

```
powershell -ExecutionPolicy Bypass -File tools/ci.ps1          # 전 층 검사 → .ci/result 한 줄
powershell -ExecutionPolicy Bypass -File tools/principles.ps1  # 원칙만 (빠름)
powershell -ExecutionPolicy Bypass -File tools/walkthrough.ps1 # 관통 시나리오
```

| 층 | 무엇을 보장하나 |
|---|---|
| `principles` | P1·P2·P3·P4·P6·P7 을 기계로 센다 |
| `typecheck` · `test` | 전 패키지 `tsc` · vitest (schema · compiler golden · api · plugin CLI · 화면을 그려서 읽는 시험) |
| `build` | `next build` |
| `walkthrough` | 픽스처 → 항목 → 발행 → Pack → 배포되는 번들이 진짜 소켓으로 `scan → upload → sync → applied` 까지 **실제로 지난다.** 7단계 |
| `docs` | 루프 문서가 자기와 어긋나지 않는가 |

「테스트 초록」은 완성이 아닙니다. **관통이 지나야** 「된다」이고, 화면은 캡처를 눈으로 보고 판정합니다.

---

## 저장소 지도

| 경로 | 무엇 |
|---|---|
| `packages/schema/` | Zod 계약의 정본 — ItemType 10종 · SourceRef 4종 · 업로드 allowlist · Manifest. 모든 곳이 여기서 import 한다 |
| `packages/compiler/` | 결정론 컴파일러 — partition · sort · render · 역추적 태그 · hash. 순수 함수만 |
| `packages/compiler/templates/` | 버전 고정 템플릿 (`CLAUDE.md` · `.claude/rules/*` · `AGENTS.md` · `.cursor/rules/*.mdc`) |
| `packages/compiler/test/golden/` | 같은 snapshot → 같은 byte 를 잠그는 golden 3종 (P4) |
| `apps/web/src/app/` | Next.js 15 App Router — 화면 9개 + `/demo` |
| `apps/web/src/app/api/v1/` | Route Handlers — 모든 외부 입력은 `packages/schema` 로 판다 |
| `apps/web/src/db/` | Drizzle 스키마·마이그레이션 (표 16 · enum 14) |
| `apps/web/src/lib/api/` | 인증 · 권한 · 에러 코드 · 요청 로그(필드 표 하나) · Cron 자물쇠 |
| `apps/web/src/lib/ai/` | 서버측 AI — `withBudget()` · 기능 4종 표 · 문서 구조화 · 충돌 탐지 |
| `apps/web/src/lib/demo/` | 데모 테넌트 — 시드 · 리셋 · 지우기 (제품 코드다 · Cron 이 부른다) |
| `apps/web/src/components/` | 화면 컴포넌트 — 문구는 표에, JSX 는 표를 읽기만 |
| `apps/web/scripts/` | 개발용 씨앗 서버 · 화면 덤프 · 관통 단계 스크립트 (제품에 안 들어간다) |
| `apps/web/vercel.json` | Cron 둘 — health 6시간마다 · 데모 리셋 매일 |
| `plugin/contextops/` | Claude Code 플러그인 — `skills/` 3 · `hooks/hooks.json` · `scripts/` 훅 2 · `bin/contextops-cli.mjs` 단일 번들 |
| `plugin/contextops/src/cli/` | CLI 소스 — 명령 표 하나(`commands.ts`) · exit 코드 표 하나 |
| `plugin/contextops/schemas/` | `packages/schema` 에서 낸 JSON Schema (로컬 검증용) |
| `fixtures/paylab-api/` | 샘플 저장소 (TS 48파일 · 의도된 어긋남 3곳) — 값이 든 secret 은 0건 |
| `fixtures/paylab-docs/` | 팀장 문서 + 폐기 로드맵 1개 |
| `fixtures/replay/` | 랜딩 터미널 재생 녹화 — 관통이 매번 다시 녹화해 대조한다 |
| `fixtures/seed/` | 데모 테넌트 시드 |
| `tools/ci.ps1` | 전 층 검사 |
| `tools/principles.ps1` | P1~P7 기계 검사 |
| `tools/walkthrough.ps1` | 관통 시나리오 7단계 |
| `tools/fixtures.mjs` | 픽스처가 조용히 상하지 않았나 (관통 첫 단계) |
| `tools/status-shape.mjs` | 루프 문서가 자기와 어긋나지 않나 |
| `loop/` | 🔁 자율 개발 루프 — 이 저장소를 만드는 도구 |
| `docs/SPEC.md` | 정본 명세 — 무엇을 만들 것인가 |
| `docs/DESIGN_BRIEF.md` | 화면 토큰·컴포넌트 정본 |
| `docs/PLAN.md` | Phase 체크리스트 — 루프가 여기서 일을 고른다 |
| `docs/STATUS.md` | 지금 어디인가 (= 다음 바퀴의 기억) |
| `docs/feedback/INBOX.md` | 사람 → 루프. 최우선 |
| `docs/feedback/FINDINGS.md` | 관통이 찾아 놓은 대장 — 고장·구멍·격차 |
| `docs/evidence/` | 바퀴마다 남긴 근거 — 캡처 · 덤프 · 관통 산출물 복사본 |
| `docs/history/` | STATUS 에서 내려온 지난 바퀴 기록 |
| `docs/KNOWN_LIMITATIONS.md` | 알려진 한계 — 지금 안 되는 것 |
| `docs/SUBMISSION.md` | 제출서 원문 — 랜딩·README 와 같은 문장인지 시험이 잰다 · 🙋 자리(production URL · 영상 · 슬라이드) |
| `CLAUDE.md` | 저장소 개발 규칙 — 사람과 AI 세션이 같이 지킨다 |
| `LICENSE` | MIT |

의존 방향은 한쪽입니다: `schema ← compiler ← web / plugin`. 패키지는 `index.ts` 하나로만 내보냅니다.

### 기술 스택

TypeScript 5 / Node 22 · pnpm workspace · Next.js 15 (App Router · Route Handlers) · Postgres (Supabase) + Drizzle ORM ·
PGlite (시험·로컬) · Zod · vitest · Vercel (Cron 포함)

서버측 AI: Gemini `generateContent` — SDK 없이 `fetch` (`responseJsonSchema` 구조화 출력 · `withBudget()` 필수)
플러그인: Claude Code 공식 plugin 레이아웃 · esbuild 단일 ESM 번들 (런타임 의존 0)

---

## 🔁 이 저장소는 자율 루프가 만듭니다

개발 자체가 **루프 엔지니어링**으로 돌아갑니다. 한 바퀴마다 새 헤드리스 Claude Code
세션이 열려서, 문서에서 이번에 뭘 할지 읽고, **하나만** 고치고, 검사하고, 커밋하고,
다음 바퀴를 위한 기록을 남깁니다.

```
claude -p "Read loop/PROMPT.md and follow it exactly."
   │
   ├─ ① 읽는다   INBOX → FINDINGS → PLAN → STATUS → SPEC 해당 §
   ├─ ② 고친다   관통 시나리오가 막힌 자리 하나 → tools/ci.ps1 → 커밋
   └─ ③ 남긴다   docs/STATUS.md · FINDINGS.md  (= 다음 바퀴의 유일한 기억)
```

**대화를 이어 붙이지 않습니다. 기억은 파일에 삽니다.** 이 루프는 `claude -p` 로 돌지만
P2 위반이 아닙니다 — `loop/`·`tools/` 는 배포되는 제품이 아니라 우리 자신의 구독으로 이 저장소를 만드는 개발 도구입니다.

자세히: [`loop/README.md`](loop/README.md) · 한 바퀴의 전부: [`loop/PROMPT.md`](loop/PROMPT.md)

```bash
powershell -ExecutionPolicy Bypass -File loop/ctl.ps1 install
powershell -ExecutionPolicy Bypass -File loop/ctl.ps1 dryrun   # 안전 — 아무것도 안 고침
powershell -ExecutionPolicy Bypass -File loop/ctl.ps1 start
```

---

## 기여

기여하기 전에 [`CLAUDE.md`](CLAUDE.md) 를 읽어 주세요 — 사람과 AI 세션이 함께 지키는 저장소 규칙입니다.
특히 **P1~P7 을 어기는 PR 은 받지 않습니다.** 확장은 「표에 한 줄」이어야 합니다 — 타입·명령·기능을 더하는 절차는
그 표 옆 주석에 적혀 있습니다.

**알려진 한계**는 [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) 에 정직하게 적습니다.

## 라이선스

MIT — [`LICENSE`](LICENSE)
