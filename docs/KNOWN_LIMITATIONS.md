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

- **production 은 Vercel Hobby 위다** (<https://contextops-rosy.vercel.app> · 2026-09-10 첫 배포 · `docs/evidence/2026-09-10-production/`).
  배포에서만 볼 수 있던 셋은 그날 쟀다 — 함수가 `fixtures/` 를 찾았고(첫 리셋 200) · 데모 리셋은 **7.6초**였고 ·
  Root Directory `apps/web` 이 `vercel.json` 을 읽었다(Cron 둘 · 리전 icn1). Hobby 의 한도는 그대로 남는다: cron 하루 1회
  (정각이 아니라 그 시간 안 임의 분) · 함수 300초 · 비상업 이용. 실제 GitHub 로그인 → 팀 생성 201 은 🙋 사람이 손으로 잰다.
- **기기 토큰이 `/contextops:setup` 의 인자로 Claude Code 를 지난다.** 웹이 준 한 줄을 사람이 Claude Code 에 붙여 넣고 Skill 이
  CLI 를 부르므로, 그 토큰 문자열은 사용자 자신의 모델 컨텍스트(그 세션의 대화)에 한 번 실린다. 서버에는 해시만 남고 저장은
  `~/.contextops/credentials.json`(저장소 밖)뿐이다. 터미널에 직접 치는 길(`node <플러그인 경로>/bin/contextops-cli.mjs setup …`)은
  플러그인 설치 폴더를 사람이 찾아야 해서 안내하지 않는다.
- **`npx contextops` 는 없다.** npm 에 올린 적이 없다. 설치는 `claude plugin marketplace add rhdqngusanr/contextops`
  부터이고, 그 이름과 목록 파일(`.claude-plugin/marketplace.json`)은 이제 저장소에 있다 (`5d024ed`).
  ⚠ 다만 **`claude plugin install` 로 깐 기록이 아직 없다** — 새 PC 에서 add → install → `/contextops:init` 까지
  밟는 것은 🙋 사람 몫이다 (PLAN P5 둘째 행). 관통과 근거(`docs/evidence/2026-09-03-plugin/setup-new-repo.md`)는
  `node plugin/contextops/bin/contextops-cli.mjs` 를 직접 부른다.
- **이메일 매직링크 문은 숨겨져 있다** — Supabase 기본 SMTP 는 프로젝트 팀 멤버 주소로만 보내고 시간당 몇 통이라,
  심사위원이 눌러도 메일이 오지 않는다. 그래서 `NEXT_PUBLIC_AUTH_EMAIL_LOGIN` 이 비어 있으면 로그인 화면이 그 문 대신
  `/demo` 를 안내한다 (`apps/web/src/lib/web/auth.ts`). 커스텀 SMTP 를 붙이기 전까지 로그인 공급자는 GitHub 하나다.
- **세션 갱신이 없다** — access token 이 만료되면 다시 로그인이다(`refresh_token` 을 쓰지 않는다). 배포에서는 Supabase
  대시보드의 만료 시간을 길게 잡는 것으로 대신한다 (`docs/DEPLOY.md` ①-b).
- **Device code auth 미지원** — 웹에서 발급한 기기 토큰을 `setup` 에 붙여 넣는 방식이다
  (`plugin/contextops/src/cli/setup.ts`). 브라우저 콜백 서버는 없다.
- **권한이 2단계뿐** (owner / member · `packages/schema/src/api.ts` 의 `ROLE_RANK`). 세밀한 권한 모델 없음.
  게스트는 등급이 아니라 「쓸 수 없는 주체」로 만들었다 — GET·HEAD 만 지난다.
- **실시간이 아니다** — 모든 상태는 「마지막 보고 기준」이다. 화면은 폴링으로 갱신하고 「실시간」이라는 낱말을
  쓰지 않는다 (SPEC §6 · `apps/web/test/web-landing.test.ts` 가 랜딩에서 그 낱말을 센다).
- **서버측 AI 는 Gemini 무료 티어의 분당 요청 제한 안에서 돈다.** 키는 우리 것이고(P3) 호출은 전부 `withBudget()` 을
  거치지만, 무료 티어의 **분당 요청 제한**은 우리 예산 가드 바깥의 상한이다 — 데모 중 여러 사람이 동시에 구조화를 누르면
  429 로 돌아오고 그 job 은 `RATE_LIMITED` 로 끝나 화면은 「요청이 너무 잦습니다」와 [다시 시도] 를 본다
  (`apps/web/src/lib/ai/client.ts` 의 `GEMINI_HTTP_ERROR_CODES` · SPEC §7.5). **픽스처 결과로 떨어지는 갈래는 어디에도
  없다** — 키가 없는 배포는 `AI_NOT_CONFIGURED`(503)로 끝나고 `/api/v1/health` 의 `ai:false` 가 그것을 미리 말한다 (INBOX G9).
- **서버측 AI 4종 중 둘은 문이 없다.** `apps/web/src/lib/ai/features.ts` 의 표는 `structure · conflict · ask · demo`
  넷인데, 라우트에서 `withBudget()` 을 부르는 자리는 문서 구조화와 충돌 탐지 둘뿐이다. **질의창(§7.3 ·
  `POST …/ask`)과 「AI 한 번 실행해보기」(§7.4 · `POST /demo/ai-once`)는 없다** — 화면 9 에 질의창이 없고 게스트
  배너에 그 버튼이 없는 이유다 (FINDINGS 117 · SPEC §14 절삭 순서 1번).
- **초대 메일은 보내지 않는다.** 팀원 초대(`/t` 의 owner 폼 · `POST /teams/{id}/members`)는 이메일을 적어 두는 것까지고, 그 사람은
  owner 가 전한 `/login` 주소로 GitHub 로그인해야 팀원이 된다(첫 로그인에 승격). 발신 SMTP 가 없어서다 (`docs/DEPLOY.md` ①-b) —
  화면이 그 사실을 초대 폼 위에 말한다 (INBOX H9).
- **AI 처리 데이터의 행방 — 붙여넣은 문서는 Google Gemini API(국외)로 간다.** 지금 키는 **무료 티어**라 Google 약관상 그 입력이
  제품 개선에 쓰일 수 있다 (ai.google.dev/gemini-api/docs/pricing · 2026-09-10 확인). 그래서 붙여넣기 칸 바로 밑과 `/privacy` 가
  그 사실을 말하고(문장의 정본은 `apps/web/src/lib/web/privacy.ts` 의 `AI_TRANSFER_NOTICE` · 티어 상수 하나가 문장을 고른다),
  🙋 Tier 1(빌링 연결)로 바꾸면 그 상수를 `paid` 로 고친다. 어느 티어든 비밀·개인정보를 붙여넣지 말라는 말은 남는다.
- **데모 항목은 승인 27 + 초안 3 이다** — 정본은 픽스처 둘(`fixtures/paylab-docs/goals.md` · 폐기된 `old-roadmap.md`)이고 그 문서에서
  문장 하나까지 역추적되는 전부다. 데모용 항목을 따로 지어내지 않는다 — 지어내면 데모에서 본 것과 관통이 잰 것이 갈린다 (SPEC §10.3).
- **데모의 「AI 제안」 충돌 카드 3장은 기록물이다** — 2026-09-07 gemini-3.5-flash 가 같은 두 문서에서 실제로 찾은 모순을
  씨앗이 다시 심는 것이고, 카드 본문이 그 사실을 말한다. 게스트는 쓸 수 없으므로 **데모 안에서 AI 가 새로 도는 장면은 없다**
  (구조화·충돌 탐지는 로그인한 팀장이 문서를 붙여 넣을 때 돈다 · `POST /demo/ai-once` 는 없다 — FINDINGS 117).
- **가져오기의 zip 드롭존이 없다** — 문서 붙여넣기만 있다. 서버에 경로 검사·개수·용량 상한(SPEC §11)이 먼저
  서야 한다 (`apps/web/src/app/t/[team]/p/[project]/import/page.tsx` 머리).
- **sync 상태 `manual` 을 사람이 실제로 밟은 적은 없다.** 찍는 쪽은 생겼다 — `judge()` 가 「우리 캐시에 그 버전의
  자취가 없는데 파일은 Manifest 와 다 맞다」를 `manual` 로 본다 (`9dd032b`). 다만 **zip 을 받아 손으로 푼 뒤
  `status` 를 부르는 걸음**은 시험 안에서만 돌았다 — 사람이 브라우저로 zip 을 내려받아 밟는 것은 🙋 배포 뒤다.
- **Claude가 지침을 100% 따른다고 보장하지 않는다** — Pack은 컨텍스트지 강제가 아니다.
- **Codex / Cursor는 출력 파일만** 지원한다 — `AGENTS.md` · `.cursor/rules/contextops.mdc` 는 `CLAUDE.md` 와 본문이
  byte 로 같은 거울 문서다 (`packages/schema/src/manifest.ts` 의 `PACK_TARGETS`). 훅·Skill 연동은 없다.
- **대형 저장소(1,000파일 이상) `init` 미검증** — 관통이 훑는 픽스처는 48파일이다.
- **개인 Memory와의 로컬 충돌 검사 미구현** — 플러그인은 Memory 를 읽지 않는다 (P1 · 근거 문서 §6). 그래서
  「내 Memory 와 팀 규칙이 어긋난다」를 알려 줄 수도 없다.
- **단일 OS 설치 검증** — 관통과 `docs/evidence/2026-09-03-plugin/setup-new-repo.md` 는 Windows 개발 기계에서
  돌았다. macOS·Linux 에서의 fresh install 은 🙋 새 PC 에서 본다 (PLAN P5 둘째 행).
- **브라우저 e2e 는 캡처와 배포 검증까지다 — 사람처럼 클릭해 가며 흐름을 밟는 시나리오는 없다.** `apps/web/e2e/` 는
  헤드리스 Chrome 을 CDP 로 직접 몰아(Playwright 없이) 화면 9개를 찍고(`shots.ts` · 관통 `shots` 단계) GATE 3 을
  재고(`gate3.ts`) 배포를 두드린다(`production.ts`). 「import → review → publish → pack explorer」를 한 세션의 클릭으로
  잇는 시험은 없다 — 그 흐름은 API 시험(`apps/web/test/`)과 SSR 로 그려 읽는 화면 시험이 나눠 잰다 (INBOX G15).
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
