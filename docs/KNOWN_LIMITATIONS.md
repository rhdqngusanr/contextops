# 알려진 한계

> **정직하게 적는다.** 데모에서 안 보여 주는 것, 검증 안 한 것, 못 하는 것.
> 심사위원이 물어볼 것을 먼저 적어 두는 게 항상 낫다.
>
> ⚠ 여기 있는 항목을 「곧 고칠 것」으로 흐리게 쓰지 마라. **지금 안 되는 것**으로 적는다.
> 각 줄의 근거는 코드다 — 적기 전에 그 이름을 코드에서 찾았다 (`CLAUDE.md` 「SPEC 을 현실로 믿지 마라」).
> `FINDINGS N` 을 단 줄은 `docs/feedback/FINDINGS.md` 의 그 항목이 **대기**여야 한다 — 닫히면 이 줄도 지운다
> (`apps/web/test/readme.test.ts` 가 센다).

## 신뢰 경계 (P1) 가 못 막는 것

- **`upload-draft` 의 `body` 에 사람이 코드를 붙여 넣으면 계약은 못 막는다.** `body` 는 사람(또는 init Skill)이 쓴
  한 줄 문장이고 상한은 2,000자뿐이다 (SPEC §3.1). Skill 의 규칙이 「본문에 코드를 붙이지 마라」이고, 관통은
  「규칙대로 썼을 때 파이프라인이 본문을 안 나른다」를 잰다. **붙여 넣은 코드를 서버가 거절하는 검사는 없다**
  (`docs/evidence/2026-09-06-p1-payload/p1-payload.md` §7).
- **P1 근거는 배포에서 찍은 것이 아니다.** 소켓은 진짜지만 서버는 관통이 띄운 짧은 것이고 DB 는 PGlite 다.
  Vercel 의 함수 로그가 실제로 `apps/web/src/lib/api/log.ts` 의 필드만 남기는지는 🙋 배포 뒤 첫 요청에서 본다.
  브라우저 네트워크 탭 캡처도 그때다.
- **팀장이 올리는 문서 원문은 서버에 간다.** `POST /documents` 의 `content` 는 의도한 것이다 — 코드가 아니라
  팀장이 등록하는 규칙 문서다 (SPEC §5). 「서버는 코드 본문을 받지 않는다」는 저장소 파일에 대한 말이지
  팀장이 붙여 넣는 문서에 대한 말이 아니다.
- **Manifest 에 발행자 서명이 없다.** `sync` 는 파일마다 sha256 을 대조하지만 그 manifest 가 우리 서버에서 왔다는
  것은 TLS 만 보증한다 (SPEC §8.5 preflight 주석 · `packages/schema/src/manifest.ts` 에 서명 칸 없음).

## 제품

- **production 이 아직 없다.** Vercel · Supabase 연결은 🙋 사람이 한다 (`docs/STATUS.md` 「막힌 것」). 지금까지의
  모든 관통·데모·캡처는 개발 기계의 PGlite 위에서 돌았다. 배포에서만 볼 수 있는 셋 — 함수 안에서 `fixtures/` 를
  찾는가 · Supabase 에서 데모 리셋이 60초 안에 끝나는가 · Root Directory 설정이 `vercel.json` 을 읽게 하는가 — 은
  아직 못 쟀다.
- **`npx contextops` 는 없다.** npm 에 올린 적이 없다. 설치는 `claude plugin marketplace add <marketplace>` 부터이고
  그 `<marketplace>` 주소는 🙋 공개 저장소 URL 이 생겨야 채워진다 (FINDINGS 122).
- **Device code auth 미지원** — 웹에서 발급한 기기 토큰을 `setup` 에 붙여 넣는 방식이다
  (`plugin/contextops/src/cli/setup.ts`). 브라우저 콜백 서버는 없다.
- **권한이 2단계뿐** (owner / member · `packages/schema/src/api.ts` 의 `ROLE_RANK`). 세밀한 권한 모델 없음.
  게스트는 등급이 아니라 「쓸 수 없는 주체」로 만들었다 — GET·HEAD 만 지난다.
- **실시간이 아니다** — 모든 상태는 「마지막 보고 기준」이다. 화면은 폴링으로 갱신하고 「실시간」이라는 낱말을
  쓰지 않는다 (SPEC §6 · `apps/web/test/web-landing.test.ts` 가 랜딩에서 그 낱말을 센다).
- **서버측 AI 4종 중 둘은 문이 없다.** `apps/web/src/lib/ai/features.ts` 의 표는 `structure · conflict · ask · demo`
  넷인데, 라우트에서 `withBudget()` 을 부르는 자리는 문서 구조화와 충돌 탐지 둘뿐이다. **질의창(§7.3 ·
  `POST …/ask`)과 「AI 한 번 실행해보기」(§7.4 · `POST /demo/ai-once`)는 없다** — 화면 9 에 질의창이 없고 게스트
  배너에 그 버튼이 없는 이유다 (FINDINGS 117 · SPEC §14 절삭 순서 1번).
- **데모 항목이 15개다** — SPEC §10.3 은 60개를 적는다. 정본은 픽스처 하나(`paylab`)라 데모용 항목을 따로 지어내지
  않았다. Pack 이 얇다 (FINDINGS 119).
- **가져오기의 zip 드롭존이 없다** — 문서 붙여넣기만 있다. 서버에 경로 검사·개수·용량 상한(SPEC §11)이 먼저
  서야 한다 (`apps/web/src/app/t/[team]/p/[project]/import/page.tsx` 머리).
- **sync 상태 `manual` 을 보고하는 쪽이 없다.** Pack zip 을 내려받아 손으로 푸는 길은 있지만, 그 기기가 `status`
  로 「manual」이라고 찍는 코드는 0곳이라 화면 9 는 네 값(applied · outdated · modified · unknown)만 그린다
  (FINDINGS 69).
- **Claude가 지침을 100% 따른다고 보장하지 않는다** — Pack은 컨텍스트지 강제가 아니다.
- **Codex / Cursor는 출력 파일만** 지원한다 — `AGENTS.md` · `.cursor/rules/contextops.mdc` 는 `CLAUDE.md` 와 본문이
  byte 로 같은 거울 문서다 (`packages/schema/src/manifest.ts` 의 `PACK_TARGETS`). 훅·Skill 연동은 없다.
- **대형 저장소(1,000파일 이상) `init` 미검증** — 관통이 훑는 픽스처는 48파일이다.
- **개인 Memory와의 로컬 충돌 검사 미구현** — 플러그인은 Memory 를 읽지 않는다 (P1 · 근거 문서 §6). 그래서
  「내 Memory 와 팀 규칙이 어긋난다」를 알려 줄 수도 없다.
- **단일 OS 설치 검증** — 관통과 `docs/evidence/2026-09-03-plugin/setup-new-repo.md` 는 Windows 개발 기계에서
  돌았다. macOS·Linux 에서의 fresh install 은 🙋 새 PC 에서 본다 (PLAN P5 둘째 행).
- **브라우저 e2e 가 없다.** SPEC §12 의 Playwright 1 시나리오는 없고 관통의 `shots` 단계는 SKIP 이다
  (e2e 폴더가 없다). 화면 판정은 SSR 로 그린 HTML 덤프(`apps/web/scripts/` 의 `dump-*.tsx`)와 눈이다.
- **다크 테마 고정 — 라이트 모드가 없다.**
  ★ 왜 — 두 벌을 만들면 두 벌 다 어중간해진다. 18일에 한 벌을 제대로 하는 편이 낫다.
  토큰은 `docs/DESIGN_BRIEF.md` §3 한 곳에 있어서, 나중에 라이트를 더할 때 고칠 자리는 한 곳이다

## 개발 루프

- **Windows PowerShell 5.1 전용이다.** `loop/*.ps1` 은 작업 스케줄러에 기대고 있어서
  macOS·Linux에서 돌지 않는다.
  ★ 왜 포팅하지 않았나 — 한 개념을 두 파일로 나누면 **반드시 갈라진다.** 루프는
  제품이 아니라 우리가 이 저장소를 만드는 도구라, 우리가 쓰는 OS 하나만 지원한다.
  옮길 사람은 `loop/README.md` 의 「다른 프로젝트에 옮겨 쓰려면」을 보면 된다 —
  바꿔야 하는 것은 넷뿐이다
- **한 바퀴를 턴 수로 자르지 못한다** — CLI에 `--max-turns` 가 없어서 **시간**으로 자른다.
  실제 턴 수는 `stream-json` 결과의 `num_turns` 로 사후에 잰다
- **비용 상한이 CLI 응답에 의존한다** — 결과 줄에 `total_cost_usd` 가 없으면
  (구독 플랜 등) 누적이 0으로 남아 `MaxCostUsd` 가 사실상 꺼진다.
  그때는 `MaxCycles` 가 유일한 울타리다
- **`tools/principles.ps1` 은 P5를 못 잰다** — 「개인 순위를 만들지 않는다」는 눈 판정이다.
  이 검사가 초록이라고 P5가 지켜진 게 아니다
- **`principles.ps1` 의 P7 검사는 「템플릿에 태그 자리가 있는가」까지만** 본다.
  「생성된 Pack의 전 줄에 실제로 붙었는가」는 컴파일러 테스트(`packages/compiler/test/traceability.test.ts`)가 잰다
