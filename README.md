# ContextOps

**팀의 지식과 Claude의 기억을 같은 방향으로.**

팀의 목표·로드맵·기술 결정을 하나의 승인된 AI Context로 만들어 **모든 팀원의 Claude Code에
같은 버전·같은 해시로 배포**하고, 로드맵이 실제로 진행되는지를 **근거와 함께** 보여줍니다.

> 🚧 **개발 중입니다.** 지금 이 저장소에는 **자율 개발 루프와 명세**만 있습니다.
> 제품 코드는 루프가 `docs/PLAN.md` 를 따라 만들어 갑니다. 현재 상태는
> [`docs/STATUS.md`](docs/STATUS.md) 에 있습니다.
>
> Wanted AI Championship 2026 출품작 · 제출 2026-09-20

---

## 무엇을 푸는가

AI 코딩 도구는 `CLAUDE.md` 같은 파일로 팀 지식을 받습니다. 그런데 그 파일은
**git을 쓰는 개발자 개인이 각자 관리**합니다. 그래서:

- 팀장의 목표·정책은 AI에 안 들어갑니다
- 같은 팀인데 **팀원마다 AI가 다른 답**을 합니다
- 로드맵이 실제로 어디까지 왔는지 **아무도 모릅니다**

ContextOps는 기존 문서·팀장 답변·코드에서 뽑은 항목을 정해진 형식으로 구조화하고,
**충돌을 찾아 사람이 결정하게 하고**, 승인된 것만 모든 팀원의 Claude Code에
같은 버전으로 배포하며, 각자의 AI가 작업 끝에 로드맵 진행을 **근거와 함께** 보고합니다.

---

## 🔒 신뢰 경계 — 이게 제품의 전부입니다

이 프로젝트에는 **깨면 안 되는 원칙 7개**가 있고, [`tools/principles.ps1`](tools/principles.ps1) 이
매 커밋마다 **기계로 셉니다.** 문서에 적는 것만으로는 안 지켜지기 때문입니다.

| # | 원칙 |
|---|---|
| **P1** | 서버는 저장소 **코드 본문·secret·개인 Memory·대화 transcript를 절대 받지 않습니다.** 업로드는 allowlist 스키마로만 통과 |
| **P2** | 제품 코드는 **사용자의 Claude를 대신 호출하지 않습니다.** Claude는 사용자가 Skill을 직접 실행할 때만 동작 |
| **P3** | 서버측 LLM은 API 키(종량제)로만 · 4개 기능 한정 · 일일 예산·rate limit 존재 |
| **P4** | **승인 이후 파이프라인에는 LLM이 없습니다.** 같은 snapshot → byte-identical Pack |
| **P5** | 진행은 **마일스톤 단위만.** 개인 생산성 점수·순위를 만들지 않습니다 |
| **P6** | Hook은 **파일을 변경하지 않습니다.** 변경은 사용자가 `/contextops:sync` 를 실행할 때만 |
| **P7** | 모든 Pack 줄은 항목 ID → 원문(문서 offset 또는 `path:line`)으로 **역추적**됩니다 |

전문: [`docs/SPEC.md`](docs/SPEC.md) §0.1

**올라가는 것**: Context Item 초안 JSON · Proposal · Progress 이벤트 · sync 보고(버전·hash)
**내려오는 것**: manifest · Pack 파일

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

**대화를 이어 붙이지 않습니다. 기억은 파일에 삽니다.**

자세히: [`loop/README.md`](loop/README.md) · 한 바퀴의 전부: [`loop/PROMPT.md`](loop/PROMPT.md)

```bash
powershell -ExecutionPolicy Bypass -File loop/ctl.ps1 install
powershell -ExecutionPolicy Bypass -File loop/ctl.ps1 dryrun   # 안전 — 아무것도 안 고침
powershell -ExecutionPolicy Bypass -File loop/ctl.ps1 start
```

---

## 저장소 구조

```
contextops/
├── loop/                  # 🔁 자율 개발 루프 (이 저장소를 만드는 도구)
├── tools/                 # 게이트 — ci.ps1 · principles.ps1 · walkthrough.ps1
├── docs/
│   ├── SPEC.md            # 정본 명세 (무엇을 만들 것인가)
│   ├── DESIGN_BRIEF.md    # 화면 토큰·컴포넌트
│   ├── PLAN.md            # Phase 체크리스트 — 루프가 여기서 일을 고른다
│   ├── STATUS.md          # 지금 어디인가 (= 다음 바퀴의 기억)
│   └── feedback/
│       ├── INBOX.md       # 사람 → 루프. 최우선
│       └── FINDINGS.md    # 관통이 찾아 놓은 대장
│
│   ↓ 아래는 루프가 만들어 간다 (docs/PLAN.md 순서대로)
├── apps/web/              # Next.js 15 — 화면 + API
├── packages/schema/       # Zod 계약 (모든 곳이 import)
├── packages/compiler/     # 결정론 컴파일러 (LLM 없음)
├── plugin/contextops/     # Claude Code 플러그인 (Skills 3 · Hooks 2)
└── fixtures/              # 데모용 합성 저장소·문서
```

---

## 기술 스택

TypeScript 5 / Node 20 · Next.js 15 (App Router) · Supabase (Postgres · Auth · Realtime) ·
Drizzle ORM · Tailwind 4 + shadcn/ui · Zod · vitest · Vercel

서버측 AI: `@anthropic-ai/sdk` (tool use 구조화 출력, 예산 가드 필수)
플러그인: Claude Code 공식 plugin 레이아웃, esbuild 단일 ESM 번들 (런타임 의존 0)

---

## 개발

```bash
pnpm install
powershell -ExecutionPolicy Bypass -File tools/ci.ps1          # 전 층 검사
powershell -ExecutionPolicy Bypass -File tools/principles.ps1  # 원칙만 (빠름)
```

기여하기 전에 [`CLAUDE.md`](CLAUDE.md) 를 읽어 주세요 — 사람과 AI 세션이 함께 지키는
저장소 규칙입니다. 특히 **P1~P7 을 어기는 PR 은 받지 않습니다.**

**알려진 한계**는 [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) 에 정직하게 적습니다.

---

## 라이선스

MIT — [`LICENSE`](LICENSE)
