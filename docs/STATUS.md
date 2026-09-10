# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-10 오후 · 사람 세션(루프 밖 · `loop/STOP` 그대로) · **프론트 리디자인 push·배포 완료** — 뉴트럴 모노크롬 · Codex 클레이 그림 + 스톱모션 · 한 줄 「팀의 기억과 AI의 기억을 한 방향으로」 · production <https://contextops-rosy.vercel.app> 이 새 벌 (`verify:prod` 44/0 · 15:0x) · INBOX 의 Claude 몫 전부 ✅ · 남은 것은 🙋 8줄 + 이 세션의 🙋 둘(Taste 영구 로그인 · Taste 샘플)._

---

## 🧑 사람 세션 (2026-09-10 낮 · 루프 밖) — **프론트 리디자인: 웜 화이트 한 벌 · Taste MCP 연결**

> 사용자 지시(차례대로): 「배포된 디자인이 너무 AI 느낌이고 개성이 없다 — buildwithtaste.com/product/mcp 를 연결해서 매력적인 프론트로」 →
> (내가 「종이·잉크·인장」 컨셉으로 짓기 시작하자) 「그 컨셉 아닌데, 제대로 후보군을 정해서 알려줘」 → 「추천해줘」 →
> 「Taste MCP 연결해줘」 → 「Taste 써서 AI 냄새 안 나는 프론트로 바꿔줘」.
> 방향은 **후보 넷을 렌더해 보여 준 뒤** 골랐다 (`docs/evidence/2026-09-10-redesign/candidates/`). 결정의 정본은 `docs/DESIGN_BRIEF.md` §3 「테마」.

🔴 **Taste MCP 는 붙었지만 계정이 비어 있었다** — 잰 것:
`claude mcp add --transport http --scope local taste https://mcp.buildwithtaste.com/mcp` 로 등록 · `claude mcp login taste` 는 이 세션에서
「stdin isn't a terminal」로 끝남 → 표준 OAuth(동적 등록 `/oauth/register` · PKCE · 콜백 `localhost:8791`)를 스크래치 스크립트로 밟고
사용자가 브라우저에서 로그인해 세션 토큰(scope `taste.read` · 1h)을 받았다. 도구 24개 중 읽어 본 것: `list_collections` 0 ·
`search_samples` 0 · `get_taste_profile` 「아직 생성 안 됨」 · `list_portfolio_projects` 0 · `get_design_judgment_profile` 「MCP 에 공개 안 됨」.
**실제로 쓸 수 있던 것은 `get_anti_slop_guardrails` 한 벌** — 원문 `docs/evidence/2026-09-10-redesign/taste-anti-slop.md`. 그 지침이 이번 벌의 근거다.

🔴 **한 벌을 다크에서 웜 화이트로 바꿨다** (토큰 표 교체 · 화면 코드는 토큰만 읽어서 앱 7화면이 그대로 따라왔다):

| 무엇 | 잰 것 |
|---|---|
| 토큰 | 26개 (새로 `sand`·`on-accent`·`term-bg`·`term-ink`·`term-ink-2`) · 대비 전부 AA — 본문 9.1 · 메타 5.3 · 링크 12.3 · 칩 ok 5.0/warn 4.8/bad 4.9 · 버튼 18.9 (`design-tokens.test` 가 표↔`:root` 대조) |
| 글꼴 | 저장소 안 4.1MB — Pretendard Variable 92조각 2.9MB · IBM Plex Sans KR 600 94조각 1.2MB · JetBrains Mono 12조각 0.13MB (`pnpm --filter web fonts:vendor` · `public/fonts/LICENSES.md`) · 빌드·런타임 네트워크 0 |
| 표제체 | 넷(Pretendard 800 · Plex 600 · Plex 700 · Gothic A1 800)을 같은 문장으로 렌더해 눈으로 골랐다 (`candidates/heading-font-compare.png`) — h1·h2 Plex 600, h3·h4 Pretendard 700 |
| 랜딩 | 히어로 7/5 · 절 머리 4/8 · 「왜 git」 정의 목록 5/7 · 「어떻게」 번호 목록 · 제품 캡처 큰 1 + 작은 2 · 절 위 여백이 서로 다르다 · 머리글에 절 링크 셋(`/#why` …) · 아이콘·그라데이션·그림자 0 |
| 앱 화면 | e2e 61/0 (context·import·review·proposals·packs·roadmap·sync 전부 skeleton 0 · 가로 밀림 0) · 눈으로 본 것 6장 · 고친 곳 셋 — 폭 100% 행 버튼(`.tree-item`)은 알약이 아니라 10px · 입력 칸 바탕 `surface` · 내비 바탕 `bg` |
| 미리보기 | `og.png` 다시 그림(Plex · `file://` 로 저장소 글꼴을 읽는다) · `icon.svg` 검정 둥근 사각 + 확인 표시 (색 둘 다 표의 값) |
| 시험 | vitest 1014/1014 · typecheck OK · `tools/ci.ps1` **GREEN** (2026-09-10 12:51 · principles 9 · typecheck · test · build 25초 · walkthrough 검사 1426개 · docs) |

★ 왜 검정 버튼·남색 링크인가 — anti-slop 지침이 「blue-500/indigo 주요색 · gray-50 바탕 · Inter 단독 · 3열 같은 카드 · 눈썹칩+표제+부제+버튼 둘」을
AI 산출물의 통계적 기본값으로 짚는다. 배포돼 있던 화면이 정확히 그 다섯이었다. 지침 → 우리 자리 대응표는 DESIGN_BRIEF §3 「테마」에 있다.

⚠ **밟은 함정 둘** — ① 머리글 링크를 `href="/#landing-why"` 로 적자 「제품 화면이 왜 git 보다 먼저」 시험(`web-landing-shots` ⑤)이
머리글의 그 글자를 절로 세어 빨개졌다 → 닻은 절을 감싸는 `<div id="why">` 로, h2 의 id 는 머리글에 안 쓴다.
② python heredoc 의 `'\\n'` 이 파일에 진짜 개행으로 들어가 esbuild 가 죽었다(세 번째) — `.py` 를 Write 로 쓰고 돌렸다.

🔴 **같은 날 둘째 판 — 웜 화이트를 뉴트럴 모노크롬으로** (사용자: 「색이 여전히 이상하고 AI 냄새가 심하다」). 원인은 크림 바탕 + 남색 링크·막대 +
흙빛 초록·노랑·주황 칩 면이 한 화면에 섞인 것. 같은 실제 화면(랜딩·Context·정리)에 색 처리만 다른 셋(뉴트럴 · 웜+점 · 쿨그레이+주황)을
덮어 찍어 보였고(`evidence/…/variants/`) 사용자가 **뉴트럴**을 골랐다. 잰 것: 토큰 26개 교체(순백 바탕 · 회색 괘선 · 잉크 링크) · **칩에 색 배경 0** —
`tone-*` 는 `.chip-icon` 만 칠한다 · 대비 흰 바탕 ink-3 5.3 / surface-hi 위 4.8 · 상태 글자 ok 5.0 · warn 5.0 · bad 6.5 · llm 5.2 ·
`tools/ci.ps1` **GREEN** (14:03 · 관통 1426). ⚠ 첫 재실행은 `plugin/contextops` 의 `hooks.test` 「stop 이 바꾼 경로」가 0 으로 빨갰다 — 코드 변경과 무관한
시간 민감 시험(훅 4.5s 예산)이고, `CLAUDE_CODE_SESSION_ID` 를 뺀 재실행은 초록. 세 번째 나면 게이트로 올려라.
이미지: 사용자가 「코드로 그린 그림 금지 · Higgsfield 금지 · 로컬 Codex CLI 로」 — `codex exec`(imagegen 스킬)로 히어로 후보 4장을 뽑아 보였고
④ 클레이 카드(한 Pack → 세 기기)를 골랐다 (`public/art/hero-pack.webp` 16KB · 다음 커밋).

🔴 **셋째 판 — 그림이 들어갔다** (사용자: 「로티·이미지 넣어도 되니 여러 방향으로」 → 「절대 코드로 이미지는 만들지 마」 → 「힉스필드 말고 로컬 Codex CLI 로」).
`codex exec -s workspace-write --json -o last.md - < prompt.txt`(imagegen 스킬 · gpt-6-astra)로 히어로 후보 4장(나침반 바늘 · 한 줄 드로잉 · 화살표 격자 · 클레이 카드)을 뽑아
보였고 사용자가 **④ 클레이 카드(한 Pack → 세 기기)** 를 골랐다 · 「어떻게」 절에도 그림을 넣기로 해 같은 스타일로 단계 그림 3장을 `-i hero-4.png` 참고로 더 뽑았다.
잰 것: `public/art/*.webp` 넷 = 68KB(1536×1024 · q86) · 정본 `lib/web/art.ts`(경로·크기·alt) · 히어로 6/6 에 그림, Before/After 는 아래 두 열 ·
「어떻게」는 그림 위 + 번호·글 아래 3열(`ART.steps` 가 단계 수와 같을 때만) · `web-landing-shots` ⑤ 는 `/shots/` `<img>` 만 센다(그림은 별도) ·
가로 밀림 0(1440·375) · DESIGN_BRIEF §3 「그림」 절 신설 · 원본 PNG·프롬프트는 `evidence/…/art/`.
`tools/ci.ps1`: 2026-09-10 14:18 | principles OK | typecheck OK | test OK | build OK | walkthrough OK | docs OK => GREEN

🔴 **넷째 판 — 문구와 움직임** (사용자: 「정적 이미지 한 장뿐이야? 애니메이션은?」 · 「문구도 팀의 기억과 AI 기억을 한 방향으로 이런 식으로」).
문구: 한 줄의 정본 `lib/web/site.ts` 를 「팀의 기억과 AI의 기억을 한 방향으로」로, 부제를 「…같은 버전으로 닿고, 진행은 근거와 함께 보입니다」로 —
랜딩·로그인(글자 대신 `SITE.tagline` 을 읽게 고침)·`<head>`·og.png·README·SUBMISSION·SPEC·DESIGN_BRIEF·PITCH·`loop/env.ps1` 이 같은 문장.
움직임: Codex 의 이미지 도구는 정지 이미지만 만든다 → 셋(스톱모션 · mp4 · Lottie)을 보였고 사용자가 **클레이 스톱모션**을 골랐다.
`codex exec -i hero-4.png` 로 같은 장면 5장(실이 위 카드에서 세 기기로 내려오는 중간 장면)을 뽑았고 카드 위치가 전부 같았다(sheet 로 봄).
잰 것: 완성 장면(5번)이 바닥 `hero-pack.webp`, 1~4번이 `hero-frame-*.webp`(13~17KB · 넷 합 62KB) · `ART.heroFrames` · `landing.module.css` 의
`hero-stop`(6초 한 바퀴 = 0.8초 × 4 + 완성 장면 2.8초 · `steps(1)` · nth-child 지연) · 움직임 줄이기는 `globals.css` 한 블록이 끝내 바닥만 남는다 ·
가로 밀림 0(1440·375) · 원본 PNG·프롬프트 `evidence/…/art/hero-frame-*.png`.
⚠ 훅 시험이 **두 번째로** 빨갰다(14:41 · 같은 자리) → 원인을 잡았다: `GIT_TIMEOUT_MS` 1000 이 바쁜 Windows 에서 모자라 `changedPaths` 가 비어
「변경 없음」으로 조용히 끝났다. git 1400 · 네트워크 2000 (합 4800 < 5000 · 시험이 센다) · 고친 뒤 `hooks.test` 3회 연속 초록.
`tools/ci.ps1`: 2026-09-10 14:51 | principles OK | typecheck OK | test OK | build OK | walkthrough OK | docs OK => GREEN

🔴 **다섯째 판 — push·배포, 그리고 클레이에 글씨** (사용자: 「클레이에 글씨들이 없잖아 · 문구 다 바꿨으면 push 배포도 해줘」).
push: `375be95..504bb66` 일곱 커밋 → Vercel 이 새 벌을 냈다 — 랜딩 200 · `/art/hero-pack.webp` 200 · `/fonts/…` 200 · `verify:prod --url` **44/0** (`evidence/…/production/`).
글씨: 여덟 장을 `-i` 참고로 주고 새겨진 글씨만 더해 Codex 로 다시 뽑았다 — 위 카드 `CLAUDE.md` · 아래 `A`·`B`·`C` · 단계 2 `v1.1.0` · 단계 3 `Roadmap`
(전부 제품에 실제로 있는 이름·버전 · 없는 숫자·판정은 새기지 않았다). 다섯 프레임의 구도가 그대로였다(시트 `evidence/…/art/labeled/`). WebP 여덟 합 152KB · alt 갱신.
⚠ 밟은 것: `art.ts` 머리 주석에 `//` 없는 줄을 끼워 넣어 typecheck·시험 셋이 빨갰다 — 주석 블록에 줄을 더할 때는 앞머리까지 같이.
`tools/ci.ps1`: 2026-09-10 15:13 | principles OK | typecheck OK | test OK | build OK | walkthrough OK | docs OK => GREEN

🔴 **여섯째 판 — 문구 전체를 심사위원 기준으로** (사용자: 「팀장이 git 을 안 쓴다가 웃겨」 · 「문구·설명이 뭘 의도하는지 안 와닿아서 원티드에서 망할 것 같아, 제대로 해줘」 · 「캡처 속도 더 빨리」).
문구: 부제가 문제(같은 팀, AI 마다 다른 답)부터 말한다 · Before/After 위에 「같은 질문을 두 사람의 Claude Code 에 던졌다」 한 줄 · 카드 제목·발 「지금 — 사람마다 다른 답 / A 는 문서를, B 는 코드를…」
「ContextOps — v1.1.0 / 팀장이 승인한 이 한 문장을 A·B·C 모두 같은 버전으로」 · 「왜 git」 제목을 심사위원의 질문(「CLAUDE.md 를 git 에 올리면 되지 않나요?」)으로, 첫 줄을 「결정은 레포 밖에서 납니다」로
· 「어떻게」 세 단계를 문장으로(가져와서 정리한다 → 승인해서 발행한다 → 진행이 근거와 함께 보인다) · **새 절 「AI 는 어디까지 쓰나요」**(후보 · 충돌 질문 · 승인 뒤 LLM 0 · 훅은 보고만 — 심사 기준 「AI 활용 적절성」의 답)
· 신뢰 절 제목 「서버는 코드를 보지 않습니다」 · 설치 절 문장 존댓말 · 머리글 링크는 짧은 낱말 넷. `readme.test` ① 이 README·SUBMISSION 에 같은 문장을 요구해 두 문서도 같이 고쳤다 (124/124).
스톱모션은 6초 → 3.4초(프레임 0.45초 × 4 + 완성 1.6초). og.png 다시 그림. 캡처 1440·375 가로 밀림 0 (`evidence/…/after/`).
`tools/ci.ps1`: 2026-09-10 16:09 | principles OK | typecheck OK | test OK | build OK | walkthrough OK | docs OK => GREEN

🔴 **일곱째 판 — 심사위원 3분 코스** (사용자: 「데모 예시들이 하나도 안 와닿고 심사위원 입장에서 3분 만에 이해 못 할 것 같다」 · 「샘플 데모 텍스트도 이해하기 쉽게」).
진단: 게스트가 [샘플 팀으로 둘러보기]를 누르면 Context 표 30줄에 떨어졌고, 무엇을 봐야 하는지 아무 화면도 말하지 않았다.
만든 것: 코스의 정본 `lib/web/tour.ts`(걸음 넷 — 정리 → Pack Explorer → Roadmap → Sync · 걸음마다 「볼 것」 한 문장) · 게스트 배너가 둘째 줄에 걸음 넷(지금 걸음은 잉크로),
셋째 줄에 「볼 것」을 띄운다 · `/demo` 가 첫 걸음(정리 — AI 가 찾은 충돌 3건)으로 보낸다(`DEMO_ENTRY_PATH`) · 랜딩의 「3분이면 됩니다」 절이 같은 네 걸음의 캡처를 싣고
캡처 밑에 「볼 것」을 그대로 적는다(`e2e/plan.ts` `PUBLISHED` = 코스의 네 화면) · 제출서에 「심사위원이 3분에 보는 길」 절.
게이트: `test/web-demo-tour.test.ts` — 걸음 path ⊂ 화면 표 · 차례 = 표의 차례 · 문장의 숫자(충돌 3건 · 기기 14대 · 근거 n / 3)가 씨앗과 같다 · `/demo` = 첫 걸음 · 캡처 = 걸음.
샘플 텍스트: 항목 **제목**만 비유 대신 하는 일로(「밖으로 나가는 문」→「결제사 호출」 · 「돈이 쌓이는 장부」→「원장 — 돈의 기록」 · 목표 둘 · 열린 질문 넷을 질문 꼴로) —
`quote` 는 문서 원문이라 그대로(관통이 원문 대조) · 마일스톤 제목은 `goals.md` 인용이라 그대로. 랜딩 Before/After 는 「결제사(PSP) 호출…」 「문서에는 …」 「코드에는 …」로 풀었다(README·SUBMISSION 동기).
`tools/ci.ps1`: 2026-09-10 17:18 | principles OK | typecheck OK | test OK | build OK | walkthrough OK | docs OK => GREEN

🔴 **여덟째 판 — 충돌 카드의 차례 · 비개발자 문장** (사용자: 「이런 섹션의 내용이 눈에 확 안 들어와서 뭐를 뜻하는지 안 느껴져」 · 「비개발자가 봐도 이해할 수 있는 텍스트, 메인·데모 전부」).
카드: 첫 줄에 종류별 한 문장(`CONFLICT_HEADLINE` — 「두 규칙이 서로 다르게 말합니다」…) → A·B 두 쪽을 **나란히**(`.sides` · 좁은 폭은 위아래) · 각 쪽은 제목이 크게(`.side-title`) →
AI 의 질문 문단은 「AI 가 올린 질문」으로 아래에 작게. 질문 카드(탐지가 아닌 것)는 질문이 본문이라 그대로 크게. 시험 16모양·A/B·anchor 셋 전부 초록.
말: Sync 칩 applied/outdated/modified/manual → 적용됨/옛 버전/손으로 고침/수동 적용 · confidence high/medium/low → 근거 확실/보통/약함(값·아이콘·색은 그대로 · 시험은 값을 센다) ·
Context 표 머리 scope/confidence/rev → 범위/근거 확신/개정 · 랜딩의 「해시」→「확인표(해시)」 · 「훅」→「설치된 플러그인」 · 「스냅샷」→「승인본」 · 신뢰 표의 secret/Memory/CLAUDE.local.md 에 한글 설명 ·
코스 Sync 문장. README·SUBMISSION 거울(readme.test ①) 동기. 남긴 것: 근거 줄(문서 해시·글자 offset·코드 줄)은 P7 의 얼굴이라 그대로 — 대신 작게 선다.
`tools/ci.ps1`: 2026-09-10 17:56 | principles OK | typecheck OK | test OK | build OK | walkthrough OK | docs OK => GREEN

🙋 **사람이 할 것**: ① 터미널에서 `claude mcp login taste` 한 번 (이 세션의 토큰은 1시간짜리 스크래치다) ② Taste 앱에서 샘플을 저장하고
「Generate profile」 — 그래야 `get_design_context` 가 내용을 준다 ③ Vercel 이 이 커밋을 배포한 뒤 production 을 눈으로 본다
(글꼴 4.1MB 가 저장소에 들어갔다 — 첫 화면은 조각 30~40개 · 수백 KB 만 받는다).

## 🧑 사람 세션 (2026-09-09 · 루프 밖) — **대회 감사 · 배포를 막던 코드 4건 · 일감을 INBOX 로**

> 사용자 지시: 「루프 말고 직접, 지금까지의 상태를 확인하고 원티드 AI 챔피언십 기준으로 부족한 점·추가할 점을 확실히 파악해라」 →
> 에이전트 65개(영역 감사 11 · 모의 심사위원 4 · 반박 검증 · 종합 · 완전성 비평 + 추가 조사 4)로 감사했다. 발견 122 → 생존 97.
> 결과는 `docs/evidence/2026-09-09-audit/` 와 INBOX 맨 위 절. 그 뒤 사용자 지시 「블로커 1(INBOX 이관)과 블로커 2(코드 4건)를 전부 해라」.

🔴 **대회 규칙을 처음으로 원문으로 읽었다** (공식 랜딩은 SPA 안 iframe · FAQ 는 브라우저 JS 로 펼쳐야 보인다 · 약관은 고객센터 문서):
참가 접수 **9/18 23:59:59** 와 과제 제출 **9/20 23:59:59** 가 별개의 마감 · 제출물은 링크(정상 작동 필수)·해결 문제·AI 활용·**AI 툴(필수 기재)** 넷뿐 ·
영상·슬라이드 요구 없음 · **심사 기간 링크 미접속 = 제외 가능** · 예선 심사 80% + 투표 20% · 리더보드 50 · 제3자 평가 솔루션 가능. 저장소 어디에도 없던 것이라 INBOX 와 evidence 에 적었다.

🔴 **이 세션이 직접 잰 것** (에이전트 주장이 아니라 명령·요청으로 재확인):

| 무엇 | 잰 것 |
|---|---|
| 로컬 vs 원격 | `git rev-list --left-right --count origin/main...HEAD` = **0 10** — 공개 저장소에 `.claude-plugin/marketplace.json` 이 없어 README 설치 첫 줄이 실패하는 상태 · `loop/STOP` 이 있어 AutoPush 도 멈춤 |
| Supabase 프로젝트(공개 엔드포인트 · anon 키 · 값은 안 찍음) | `/auth/v1/settings` → external ON = **email 뿐**(GitHub OFF) · JWKS = **EC/ES256 하나** · `rest/v1/{users,teams,context_items,devices}` 가 **HTTP 200** (Content-Range `*/0` · 표는 비어 있음) → Data API 열림 + RLS 없음 |
| 마이그레이션 | 0000~0007 어디에도 RLS 0건 · 표 18개 전부 `public` |
| 배포 설정 | `vercel.json` health `0 */6`(Hobby 는 하루 1회) · 리전 없음 · cron 라우트 `maxDuration` 60 · `layout.tsx` metadata title·description 두 줄뿐 · `ci.yml` 에 build·관통 없음 |
| CI | `tools/ci.ps1` 6층 GREEN(20:08 · 관통 1306검사) — 고치기 전 기준선 |

🔴 **고친 것 — 블로커 2 의 코드 4건 (제품 코드 · 시험 · 문서)**

| 무엇 | 어디 | 잰 것 |
|---|---|---|
| health cron 하루 1회(`0 21 * * *` · 06:00 KST) · `regions: ["icn1"]` | `apps/web/vercel.json` | 시험 ⑥ 「모든 cron 의 분·시 칸이 숫자 하나」 · 「regions == [FUNCTION_REGION]」 |
| 배포 한도의 정본 표 — `FUNCTION_REGION` · `FUNCTION_MAX_DURATION_SEC` 300 · `LONG_RUNNING_ROUTES` 4문 | `apps/web/src/lib/api/vercel.ts`(새 파일) | Next 는 `maxDuration` 을 **리터럴만** 읽어서 import 로 못 대신한다 → 라우트 4개(cron · documents · batch-draft · retry)에 리터럴을 두고 시험 ⑥이 정본과 대조 · `startJob()` 을 부르는 route.ts 가 전부 표에 있는지도 잰다(표의 완전성) |
| RLS — 표 18개 `.enableRLS()` → `drizzle-kit generate` → **0008_lumpy_wind_dancer** (ALTER … ENABLE ROW LEVEL SECURITY × 18) | `apps/web/src/db/schema.ts` · `apps/web/drizzle/` | `migration.test` 「rowsecurity 꺼진 표 0」 · `scripts/migrate.ts` 가 `rls N/N` 을 찍고 다르면 FAIL · `migrate-script.test` 가 두 경로(migrator · helper)의 rls 모양까지 대조 |
| 문서 | `docs/DEPLOY.md`(「가장 빠른 길」 순서표 · Hobby 한도 표 · ①-b Supabase Auth 걸음 넷 + Data API 끄기 · ⑥-b anon REST 거부·로그인 실측) · SPEC §1.2·§5·§11 · README 지도 · PLAN P5 ⑤ | `deploy-doc.test` 가 키 전부·cron 경로·명령·경로 실존을 잰다 |

★ **왜 RLS 를 켜도 서버가 안 막히나** — 정책 없는 RLS 는 anon/authenticated 를 전면 거부하지만 **표 소유자**는 RLS 를 지나지 않는다. 마이그레이션을 돌린
`postgres` 역할이 소유자다(DEPLOY ① 에 확인 SQL). 시험의 PGlite 사용자는 superuser 라 기존 INSERT 시험은 그대로 지난다 — 그래서 켜짐 여부만 센다.
★ **왜 300 인가** — Fluid compute(새 프로젝트 기본) 위의 Hobby 는 300 이 기본·최대다. 60 이면 구조화 job(`after()` 안 조각 12 × 20~47초)이 중간에 죽는다.
⚠ **Fluid 가 꺼진 프로젝트면 300 이 배포를 거부한다** — DEPLOY ② 에 확인 걸음을 넣었다. 그 경우 고칠 자리는 정본 하나 + 리터럴 넷(시험이 안내한다).

🔴 **블로커 3 의 코드 쪽도 닫았다** (같은 세션 · 다음 커밋). `lib/api/session.ts` 가 서명 방식 **표**(HS256 secret · ES256 JWKS kid · 1시간 캐시)로
바뀌고 `aud`(authenticated)·`iss`(프로젝트 또는 우리 자신)를 처음으로 검사한다 — `test/session-jwt.test.ts` 13개(통과·실패 짝 · alg 혼동 · 다른 프로젝트 iss).
이메일 매직링크 문은 `NEXT_PUBLIC_AUTH_EMAIL_LOGIN` 뒤로 숨겼고(기본 SMTP 는 팀 멤버 주소만) 콜백 오류 카드가 원인 코드와 `/demo` 문을 보인다.
`verify:prod` 가 Supabase 프로젝트 쪽 넷(공급자 ON · JWKS alg ⊂ 표 · anon REST ≠ 200 · 로그인 버튼이 실제로 그려짐)을 잰다 — 셋 다 실측에서 어긋나 있던 것이다.

🔴 **블로커 4 의 코드 쪽도 닫았다** (같은 세션). 근거는 Claude Code 문서다 — `${CLAUDE_PLUGIN_ROOT}`(중괄호)만 **플러그인 Skill 본문 안에서** 치환되고
Bash 환경변수로는 안 주어진다. 그래서 ① SKILL.md 셋을 그 형태로(`skills.test` 가 bare 형태를 금지) ② `setup`·`progress` Skill 을 신설 — 사람이 웹 「기기 추가」가 준
`/contextops:setup --api-origin … --token …` 한 줄을 Claude Code 에 붙여 넣으면 Skill 이 경로를 채워 CLI 를 부른다(`SETUP_COMMAND_NAME` 이 그 머리) ·
Pack 의 진행 보고 문단은 `/contextops:progress …`(TEMPLATE_VERSION 1.5 → **1.6** · golden 3종 재생성 · 관통 재생 픽스처의 그 줄도 `> /contextops:progress …`) ③ 설치 안내
첫머리에 「Node 22 이상」(`INSTALL_STEPS.requires` · `.nvmrc` 와 같은지 시험) + CLI 가 낮은 Node 에 한 줄 경고(`src/cli/node.ts`) ④ plugin.json 에 repository·license·keywords.
🙋 **실기 설치는 사람 몫이다** — `claude plugin marketplace add ./` → install → 새 저장소 세션 → 훅 → `/contextops:setup` → `/contextops:sync` → `/contextops:progress` 가 Roadmap 을
움직이는지. Skill 본문 치환은 문서로만 확인했다 — 이 실기 없이는 어떤 수정도 확인된 것이 아니다.

🔴 **블로커 5 의 ①② 도 닫았다** (같은 세션). ① `goals.md` 의 기한을 **같은 10자**로 옮겼다(M1 10-31 · M2 11-30 · M3·G1~G3 12-31 —
심사일 기준 전부 지난 기한이었다). offset 은 그대로다 — `docs/evidence/2026-09-07-p3-gemini/FIXTURE-CHANGES.md` 에 적었다.
② 게스트가 보는 데모에 AI 가 만든 것이 0 이었다 → `seed.ts` 에 두 표를 더했다: `STALE_RULES`(폐기 문서 `old-roadmap.md` 「운영 규칙」 셋 ·
**draft 로 남긴다** — active 면 Pack 이 옛 규칙과 새 규칙을 동시에 말한다)와 `RECORDED_CONFLICTS`(probe-87-run3 의 실측 `contradiction` 3장 ·
질문은 모델 문장 그대로 · 본문 끝에 「이 데모에서는 다시 탐지하지 않습니다」). 정리 화면 머리글이 「AI가 찾은 결정이 필요한 것 3건」이 되고
카드에 「AI 제안」 배지가 선다(`CONFLICT_KIND_RULES.contradiction.byAi`). 관통 publish 단계가 「폐기 규칙이 Pack 에 0줄」·「카드가 심겼다」를
잰다. 데모 항목은 승인 27 + 초안 3 (SPEC §10.3 · KNOWN_LIMITATIONS). ⚠ 완료된 구조화 job 1건은 **안 심었다** — probe 의 후보 16개가
이미 승인된 항목과 겹쳐 화면 3 에 「후보 수락」이 서면 혼란만 는다.

🔴 **블로커 6 의 문서 쪽도 닫았다** (같은 세션). `docs/SUBMISSION.md` 에 「대회 규정 원문 — 2026-09-09 확인」(마감 둘 · 제출물 넷 · 링크 유지 · 심사 · 자격 ·
이 제출서가 답하는 자리) · 「제출 폼 원문 (4칸)」(한 줄 60자 · 문제 400자 · AI 활용 600자 · AI 툴 200자 — 괄호의 상한을 `readme.test` 가 잰다 ·
폼을 열어 본 뒤 실제 값으로 바꾼다) · 「production URL 이 오면 지울 문장」 · 🙋 표에 「참가 접수」 행. `readme.test` 게이트 셋: 🙋 자리는 🙋 이거나
https 링크여야 함 · URL 이 오면 세 문서에 「production 이 아직 없」 0건(지금은 🙋 라 그 문장이 **있어야** 통과) · 규정 절의 두 마감. SPEC §13 의 9/18 행이
「참가 접수 마감 · 동결」이 됐다.

🔴 **GitHub Actions 가 `9c84aa9` 에서 빨갰다** — `deploy-doc.test` ⑤ 가 `apps/web/.env.vercel` 을 「없다」고 했다. 로컬에는 있고(gitignore) 러너에는 없는 파일을 DEPLOY.md 가
백틱으로 가리킨 것이다. 문서를 고치고, 같은 종류가 다시 못 들어오게 그 시험이 **`git check-ignore` 로 gitignore 대상 경로도 FAIL** 로 만든다(로컬에서도 러너와 같은 판정).

🔴 **고장 G7~G15 아홉을 닫았다** (2026-09-10 · 같은 사람 세션 · 사용자 지시 「INBOX 것도 전부 · 사람 몫만 정리해 달라」). 전부 게이트를 같이 뒀다:
G7 Stop 훅이 **턴마다** 돌아 진행 이벤트가 쌓이던 것 — 보낸 뒤 훅 자신이 `cache/progress-<session>.json` 을 남기고(`_writes` 둘째 줄 · P6 시험이 실제 세션 id 로 대조) CLI 의 env 이름을
`CLAUDE_CODE_SESSION_ID` 로(이 세션의 Bash 에서 그 값이 훅 stdin 의 session_id 와 **같음을 직접 쟀다**) · git 두 번 + 네트워크 합이 timeout 안(4500<5000 · 시험이 합을 센다).
G8 `AI_OUTPUT_INVALID` 가 `retryable` 이 되고 **같은 행은 `MAX_JOB_REQUEUES`=2 번까지**(`ai_jobs.requeues` · 0009 마이그레이션 · 조건부 UPDATE 가 센다 · 화면은 「남은 n번」과 상한 뒤 「문서를 나눠 올려보세요」).
G9 키 없는 배포는 `INTERNAL` 이 아니라 **`AI_NOT_CONFIGURED`(503 · 「운영자에게」)** · `/health` 에 `ai` 칸(값 없이 boolean · `verify:prod` 가 잰다) · 「픽스처 결과로 떨어진다」 문서 7곳을 사실로(그 갈래는 코드에 없었다 · `readme.test ⑧` 이 긍정문을 막는다).
G10 Gemini 정가를 공개 정가 페이지에서 직접 읽어 고쳤다(3.5 Flash **1.50 / 9.00** · 3.6 Flash 0.75 / 3.75 는 2026-12-31 까지 도입가 — 시험이 날짜를 본다). 예전 값은 $3 가드가 $11~15 를 통과시켰다.
G11 clone 한 팀원이 `manual` 로 찍히던 것 — `manifest.json` 이 git 에 추적되면 `applied`(줄에 「clone 으로 받았다」). G12 승인 0개 발행이 「입력을 확인하라」로 뭉개지던 것 — `REASON_HINT`(details.code → 문장) + 모달의 [초안 보기].
G13 게스트에게 [승인 요청] 이 활성이고 「owner 만」·「낸 사람만」·「owner 가 합니다」가 거짓이던 것 — 결정 칸·충돌 카드가 `writeDoor()` 를 받아 닫혔으면 `GUEST_HINT` 를 말한다.
G14 경로의 `-->`·`,`·`"` 가 역추적 태그·scoped frontmatter 를 깨뜨리던 것 — `safe()` 가 경로도 지나고 `,`→`%2C` · `paths:` 는 `JSON.stringify` · **TEMPLATE_VERSION 1.6 → 1.7** · golden 3종 재생성.
G15 「브라우저 e2e 가 없다 · e2e 폴더가 없다」 — 사실로(CDP 헤드리스 Chrome 9파일 · 클릭 흐름 시나리오는 없음) · `readme.test ⑨` 가 「없다고 적은 경로가 실존하면 FAIL」 + 관통 9단계·표 18·enum 17 을 코드에서 세어 대조.

🔴 **고가치 H1~H8 · H10 을 닫았다** (2026-09-10 · 같은 세션 · H9 와 H11 의 절반이 남았다). 잰 것·만든 것:
H2 링크 미리보기 — `public/og.png`(1200×630 · 헤드리스 Chrome 으로 그렸고 눈으로 봤다) · `icon.svg`(색은 토큰 값뿐 · 시험이 DESIGN_BRIEF 표와 대조) · metadata 의 문장 정본 `lib/web/site.ts` 가 랜딩 머리와 같은 문장 · `NeedsLogin` 에 샘플 팀 문 · 게스트 TTL 24h.
H3 「AI 활용」의 숫자를 근거 JSON 에서 다시 센다 — `readme.test ⑩` 이 probe-87-run3.json 과 `AI_MODELS` 로 표의 줄을 만들어 README·제출서에 그 줄이 있는지 본다 (항목 후보 22 · 충돌 5 · 인용 26/26 · 약 29초 · **약 $0.08** — 예전 「$0.02」는 2.5 Flash 정가로 센 값).
H4 `/privacy` + 붙여넣기 칸 위의 전송 고지 — 문장을 고르는 것은 `GEMINI_DATA_TIER` 하나다(지금 `free`: 「Google 이 제품 개선에 쓸 수 있다」 — pricing 페이지에서 확인). 🙋 Tier 1 로 바꾸는 날 그 상수 한 줄.
H5 [예시 문서 붙여넣기](goals.md byte 그대로 · `sample:sync`) · Gemini 429 는 한 번 기다렸다 재전송(3s · Retry-After ≤10s · 두 번째 429 는 그대로 코드).
H6 리셋이 `demo-next` 에 먼저 심고 성공하면 자리를 바꾼다 — **심기가 죽어도 어제 데모가 산다**(시험이 실패를 일부러 만든다) · `watch-prod.yml`(30분 · 🙋 `PROD_ORIGIN`) · GitHub Actions 에 `next build` 층(.env.local 없이 지어짐을 확인) · DEPLOY 「심사 기간 런북」.
H7 쓰기 버튼 전부가 `writeDoor()` 를 지난다 — 게이트는 「queries.ts 의 쓰는 함수(post/patch)를 부르는 page.tsx 는 writeDoor() 를 읽는다」 · `ITEM_TYPE_LABEL` 10종 한글. H8 `docs/PITCH.md`(컷 표 · 슬라이드 뼈대 · 15분 스톱워치 절차 · 체크리스트). H10 첫 sync 가 기존 CLAUDE.md 를 덮지 않는다(--force · backups).
H9 `/t` 「내 팀」 홈 + `GET/POST /teams/{id}/members` — 이메일 초대는 자리표시 users 행(`invite:<email>`) + `invited`, 그 이메일로 처음 로그인하면 `sessionActor()` 가 승격한다(이메일은 소문자로 저장 — GitHub 은 대소문자를 섞어 준다). 초대 메일은 없다 — 화면이 그 사실을 먼저 말한다. 로그인 기본 목적지가 `/t` 가 됐다.
H11 프로젝트별 하루 예산 $1(전역 $3 안의 이중 상한) · 팀 3/계정 · 프로젝트 5/팀(`CREATION_LIMITS` 한 표 · 화면 문장도 그 숫자) · 항목 목록이 상한 200 을 청하고 닿으면 말한다.
**INBOX 의 Claude 몫은 전부 닫혔다** — 남은 것은 🙋 뿐이다 (아래 「사람이 지금 해야 하는 것」 · INBOX 날짜별).

🔴 **일감 이관** — INBOX 맨 위 「대회 제출 계획」: 블로커 6 · 고장 15(**전부 ✅** · G2 는 대시보드 🙋) · 고가치 11 · 하지 말 것 · 날짜별. 🙋 는 사람 몫이다.
루프는 `loop/STOP` 그대로 멈춰 있다 — 9/9~9/11 은 계정 작업과 섞여 사람이 붙은 세션이 맞고, 그 뒤 켤지는 사람이 정한다(INBOX B1).

🙋 **사람이 지금 해야 하는 것** (2026-09-10 밤 갱신 · 배포는 됐다 — <https://contextops-rosy.vercel.app>):
1. **참가 접수** — 9/18(금) 23:59:59 마감 · 접수 뒤 제출 폼의 칸·글자 수·썸네일 규격을 캡처해 `docs/SUBMISSION.md` 「제출 폼 원문」의 상한을 실제 값으로.
2. **로그인 실측** (DEPLOY ⑥-b · 10분) — 시크릿 창에서 https://contextops-rosy.vercel.app/login → [GitHub로 계속] → `/t` → 팀 만들기 → Network 의 `POST /api/v1/teams` 가 201 인지 캡처. 콜백에서 튕기면 화면의 원인 코드를 Claude 에게.
3. **GitHub 저장소 Variables 에 `PROD_ORIGIN`** = 위 URL — `watch-prod.yml` 이 30분마다 두드린다. 만든 날 일부러 틀린 값으로 dispatch 해 실패 메일이 오는지 확인 뒤 되돌린다.
4. **Gemini Tier 1 결정** — 빌링 연결 뒤 키 교체(Vercel env 갱신 + Redeploy) · `apps/web/src/lib/web/privacy.ts` 의 `GEMINI_DATA_TIER` 를 `'paid'` 로 · Cloud Billing 알림 $20.
5. **플러그인 실기 설치** (9/11) — `claude plugin marketplace add ./` → install → 새 저장소에서 `/contextops:setup`(웹 Sync 화면 [기기 추가]가 주는 한 줄) → `/contextops:sync` → `/contextops:progress` 가 Roadmap 을 움직이는지 · 세 장면 GIF(`docs/PITCH.md` §3).
6. **「15분」 스톱워치 실측** (`docs/PITCH.md` §4) — 넘으면 랜딩 문장(`SITE`/`LANDING_HEAD.note`)을 고친다.
7. **9/17 녹화** (`docs/PITCH.md` §1·§5) · **9/18 저녁** release 동결 · Preview 끄기 · 루프 STOP 유지 · **9/19 제출** · 루프 재개 여부는 사람이 정한다.
8. Vercel Project Settings → Data Preferences 의 「Improve models with this project's data」를 끈다(끄지 않았다면).

## 🧑 사람 세션 (2026-09-07 22:15~23:00 · 루프 밖) — **PLAN P5 첫 행을 열었다**

> 사용자 지시: 「지금까지 한 것 중 **부족한 것**을 확인하고 고쳐라」 → 감사한 뒤 **P5 배포**를 골랐다.
>
> 🔴 **루프를 세웠다.** `loop/ctl.ps1 stop` · 117바퀴를 마치고 정상 종료(4바퀴 · USD 21.67 · push 완료).
> 다시 켤 때는 `loop/ctl.ps1 start` 다 — `STOP` 파일은 start 가 지운다.

**이 행이 여러 바퀴 동안 안 움직인 이유는 「계정이 없다」만이 아니었다.** 실은 둘이 더 없었다:
① **절차가 한 곳에 없었다** (`.env.example` 주석 · `vercel.json` 의 `_comment` · PLAN 의 P5 행에 흩어져 있었다)
② **완료 기준이 「사람이 한 번 눈으로 밟는다」**라 무인 루프가 **영원히 못 닫는 모양**이었다 — 105바퀴가 GATE 3 을 관통에 넣은 것과 같은 종류의 고장이다.

| 무엇 | 어디 | 잰 것 |
|---|---|---|
| 배포 절차의 **정본** | `docs/DEPLOY.md` | 걸음 8개 · 🙋 표시가 사람 몫(②③④⑤⑧) |
| **완료 기준이 명령 한 줄**이 됐다 | `apps/web/e2e/production.ts` (`pnpm --filter web verify:prod -- --url …`) | 자체 시험 **37검사 0실패** |
| Chrome 띄우기를 정본으로 | `apps/web/e2e/chrome.ts` | 사용자 둘(`shots.ts`·`production.ts`) — 둘째가 생겨서 올렸다 |
| 절차가 코드와 갈라지지 않게 | `apps/web/test/deploy-doc.test.ts` | **8검사** |

🔴 **검증기는 배포만이 증명하는 것을 잰다.** 관통이 이미 재는 것을 또 재지 않는다 — ① 배포 함수가 **DB 에 닿는가**(`/health` 의 `db` · 로컬은 PGlite 라 늘 참이다) ② `CRON_SECRET` 자물쇠가 **배포 환경에 실제로 걸렸나**(변수를 안 넣으면 401 이 아니라 500 이고, 그 배포는 누구나 데모를 리셋한다) ③ 데모 테넌트가 **production DB 에 심어졌나**(404 면 걸음 ⑤ 를 아직 안 한 것이다) ④ 그 위에서 **GATE 3**(빈 창 · 링크만 · 3분)이 production 응답 속도로도 지나는가.

🔴 **자체 시험 — 로컬 데모 스택에 걸어 실제로 돌렸다** (`demo:db` + `next dev` · 포트 3123/55452): **37 passed, 0 failed** · GATE 3 **17.3초 / 180초** · navigate **1회** · 게스트 응답의 칸은 `access_token,entry_path,expires_at` **셋뿐**(P1).
⚠ **첫 판은 빨갰다** — `connectBrowser()` 가 Chrome 이 뜨기를 안 기다려 `fetch failed` 였다. `shots.ts` 는 앞의 `connectPage()` 기다림에 업혀 있었던 것이다. **기다림을 정본(`chrome.ts`) 안으로 옮겼다** — 부르는 쪽에 두면 부르는 쪽마다 빠뜨린다.

🔴 **게이트가 무는 것을 확인했다** — DEPLOY.md 의 `CRON_SECRET` 백틱을 지워 2 FAIL(①·③)을 보고 되돌렸다. 만들 때도 한 번 물었다(`lib/ai/features.ts` 라고 적었는데 실제 경로는 `src/lib/...` 였다 — 문서 쪽이 틀렸다).

🔴 **잰 것** (CI 22:55 · 관통 156초): principles OK 9 · typecheck OK · test OK 106초 · build OK · walkthrough **1275 → 1283검사** · docs OK → **GREEN 전 층**.

🙋 **남은 것은 전부 계정이다** — `docs/DEPLOY.md` 걸음 ②③④⑤⑧. 루프는 이 행을 못 닫는다.

---

## 🧑 같은 사람 세션 2부 — **대장을 25건 닫았다** (대기 33 → 7)

사용자 지시: 「남은 작업들 전부 하고 부족한 점들 알아서 고쳐라」. 순서는 CLAUDE.md 그대로
(고장 → 구멍 → 격차)이고, **자기 주석이 「지금 하지 마라」고 적은 8건은 안 건드렸다.**

| 묶음 | 닫은 것 | 커밋 |
|---|---|---|
| SPEC↔코드 드리프트 **12건** | 2·3·4·10·11·14·17·21·22·23·27·32 | `f736884` |
| 고장 하나 + 게이트 구멍 | **44**(플러그인이 성공한 업로드를 실패로 보고) · 63 · 61 · 57 · **50**(P3 게이트가 아무것도 안 재고 있었다) | `f781ae9` |
| 씨앗·근거·템플릿·설치 | 170 · 87 · 46 · 140 | `5d024ed` |
| 배포되는 계약 · 프롬프트 | 47 · 55 | `39c9b04` |
| 죽어 있던 enum 값 | **69**(`manual` 을 찍는 코드가 0곳이었다) | `9dd032b` |
| 죽어 있던 칸 | **168 절반**(`owner_id` 가 화면까지 산다) | `e800e59` |

🔴 **가장 큰 셋** — 셋 다 「초록인데 안 도는」 종류였다:
① **44 는 격차가 아니라 고장이었다.** 서버는 `{accepted, rejected, job}` 을 내는데 플러그인은
`.strict()` 계약으로 판다 — `upload-draft` 가 **성공한 업로드마다** 「서버 응답이 계약과 맞지
않는다」로 끝났다. 시험도 관통도 초록이던 이유는 **양쪽 픽스처가 서버가 내는 모양이 아니어서**다.
② **P3 게이트가 아무것도 안 재고 있었다.** 실측: 「2개 호출부」는 둘 다 예외 파일이었고
(budget.ts 는 **주석**의 글자로 세어졌다) 진짜 호출부 둘은 아예 안 세어졌다.
③ **`manual` 과 `owner_id`** — 값과 칸이 정의만 있고 아무도 안 읽었다.

🔴 **새 게이트 여섯.** 문서가 아니라 기계가 잰다:
`spec-drift.test.ts`(SPEC↔코드 6종 + `ITEM_COLUMNS` join) · `deploy-doc.test.ts`(배포 절차) ·
마켓플레이스 5검사 · JSON Schema 의 P7 예외 · §7.2 프롬프트 · 담당자 3검사.
**만들자마자 넷을 물었다** — 열한 번째 에러 코드(`AI_OUTPUT_INVALID`) · 없는 경로 둘 ·
발행 500(join 넷만 걺) · 데모 씨앗 400(`.strict()`). 넷 다 사람 눈으로는 안 잡히는 것이다.

🔴 **잰 것**: CI **GREEN 전 층** · 관통 **1283 → 1306검사** · `.ps1` 여덟이 BOM+CRLF ·
`TEMPLATE_VERSION` 1.4 → **1.5** · 플러그인 182 → 184.

**남은 7건은 전부 「지금 하면 안 되는」 것**이다 — 24·33(P3·P4 행이 주인) · 40(50파일 Pack 이
생길 때) · 45(시험이 잇고 있다) · 53(🙋 키) · 117(SPEC §14 절삭 1번 · 주인 행이 없다) ·
152(⛔ 다음 실패가 200자를 말할 때까지) · 156(🙋 배포 뒤에 잰다).
그중 **막지 않은 것은 45 하나**라 아래가 그것을 가리킨다.

---

---

## 지금 어디인가
**이번 바퀴(117)는 `FINDINGS 169` 를 닫았다 — 데모 씨앗의 `body` 가 제 `data` 를 말만 바꿔 되풀이하던 두 줄을, `data` 가 **안 말하는 것**으로 바꿨다.** 116이 지목해 둔 그대로다. INBOX 「할 것」비어 있음.
🟢 **CI GREEN 전 층 · 관통 1275검사 · 9단계 SKIP 0.**

🔴 **무엇이 문제였나.** `body` 가 종이에 나가기 시작하자(116 · FINDINGS 9) **같은 말을 두 번 하는 줄**이 종이에 섰다. 글자가 하나씩 달라 메아리 검사는 통과한다 — 116이 눈으로 읽다가 적어 둔 것이다.

🔴 **고친 자리 — 씨앗 두 줄. 템플릿은 안 건드렸다** (`pack-echo.ts` 머리말의 그 이유 그대로).

| 항목 | 전 `body` | 후 `body` (원문 어디서) |
|---|---|---|
| `item_goal_success_rate` | 「PSP 장애 구간을 포함한 주간 성공률로 잰다」 — `metric` 그대로에 꼬리만 | 「**G2 와 서로 당긴다** — 재시도를 늘리면 승인률은 오르지만 환불이 늦어지고, 둘이 부딪히면 G2 가 우선이다」 (goals.md **§2 표 아래 두 줄**) |
| `item_constraint_settlement_batch` | 「가맹점 정산은 즉시 일어나지 않는다 — 하루 한 번의 배치다」 — `statement` 를 뒤집어 말한 것 | 「**원장(`ledger`)은 append only 라**, 그날의 정산은 배치가 끝난 뒤에야 확정된다」 (goals.md **§7**) |

🔴 **말을 만든 자리도 같이 고쳤다.** `GOALS` 표 옆 주석이 「**줄여 쓴 요약이 필요하면 그 자리는 `body` 다**」라고 말하고 있었다 — 그 문장이 이 되풀이를 만든 원인이다. 「**`body` 는 세 칸이 안 말하는 것만 적는다**」로 바꾸고 어디서 왔는지를 같이 적었다.

🔴 **게이트로 올렸다 — 같은 지적 둘째다** (99·100 이 첫째). `pack-echo` 가 이제 **한 조각이 다른 조각 안에 통째로 들어 있는 것**도 문다: 「…주간 성공률」 ⊂ 「…주간 성공률로 잰다」. 꼬리만 붙인 되풀이 갈래가 다시 못 들어온다.
★ **길이 문턱은 따로 16자다** (`MIN_CONTAINED_ECHO_CHARS`) — 처음에 기존 6자로 세었더니 관통이 **20건**으로 빨개졌다: architecture 항목의 이름 `payment` 가 제 경로 `src/payment/` 안에 들어 있다(파일 5 × 항목 4). 잡히는 것이 이름과 경로뿐인 게이트는 **늘 빨개서 곧 꺼진다.** 169 가 잡으려는 것은 21자짜리 **문장**이다.
🔴 **무엇을 무는지도 처음으로 쟀다** — `test/pack-echo.test.ts` 5개. 이 검사는 **관통에서만** 불려서, 기준을 한 칸 느슨하게 고쳐도 관통은 초록이었다. 무는 것 둘(같음 · 들어 있음)과 **안 무는 것 둘**(이름⊂경로 · 말을 바꾼 되풀이)을 못 박았다 — 셋째가 무는 것으로 바뀌면 시험이 먼저 말한다.

🔴 **잰 것** (CI 22:31 · 관통 148초):

| | 전(116바퀴) | 후 |
|---|---|---|
| 씨앗의 되풀이 | **2** (+1 못 봤음 → 170) | **0** (170 은 남았다) |
| `pack-echo` 가 무는 갈래 | 같음 1가지 | **2가지** (+ 들어 있음 · 16자↑) |
| `pack-echo` 를 재는 시험 | **0** | **5** |
| 관통 검사 | 1270 | **1275** |
| CI | GREEN | **GREEN 전 층** |

🔴 **눈으로 읽었다 — `.ci/walkthrough-pack/CLAUDE.md`.** Goals 첫 줄은 이제 목표 아래에 「G2 와 서로 당긴다 … G2 가 우선이다」가 붙고, Constraints 첫 줄은 「원장은 append only 라 …」가 붙는다. 두 줄 다 **표에 없는 것**(왜 그런가)을 말한다 — 사람이 읽어 새로 아는 것이 있다.
🔴 **게이트가 무는지 봤다** — 문턱을 넣기 전 관통이 20건으로 FAIL 한 것이 그 증거고(위), 노리던 그 문장(「…주간 성공률」 ⊂ 「…로 잰다」)을 무는 것은 새 시험이 잰다.

⚠ **그러다 하나 더 봤다 — `item_goal_success_rate` 바로 두 줄 아래.** `item_goal_settlement_zero` 의 `body` 가 「일 배치 **뒤** 원장 대사 차액으로 잰다」이고 `metric` 은 「일 배치 **후** 원장 대사 차액」이다. 한 글자 차이라 새 게이트도 못 문다. **FINDINGS 170** 으로 적었다 — 169 를 쓴 바퀴가 종이를 읽을 때 못 본 줄이다.

🔴 **2-B 이번 라운드 — 안 셌다.** 이번 바퀴가 만진 것이 씨앗의 글자라 표를 새로 세지 않았다. 아직 안 센 표: 에러 코드 9종 · `AI_JOB_STATUSES` 4종(데모 씨앗에 job 이 **0개**다 — 셀 때 여기부터) · `SourceRef` 4종.

🔴 **새로 적은 것 하나** — **170**(`item_goal_settlement_zero` 의 같은 되풀이).

**다음 바퀴의 일 — FINDINGS 45**

<!-- 🔴 이 줄이 **다음 할 일을 말하는 유일한 자리**다 (FINDINGS 102).
     모양을 지켜라: `**다음 바퀴의 일 — FINDINGS <번호>**` (대기가 없으면 「FINDINGS 없음」).
     `tools/status-shape.mjs` 가 ① 이런 줄이 **하나**인지 ② 그 번호가 FINDINGS 에서
     **대기**인지를 센다. 닫힌 항목을 가리키면 `tools/ci.ps1` 의 `docs` 층이 FAIL 이다.
     ⚠ 「다음 할 일」을 여기 말고 다른 데 또 적지 마라 — 그게 102 의 고장이었다.
     ⚠ 지나간 바퀴의 지목은 **다른 낱말**로 적어라 (「그 바퀴가 다음으로 지목한 것」). -->

> 🔴 **왜 170 이 아니라 168 인가.** 순서는 **고장 → 구멍 → 격차**다 (④3). 170 은 방금 만든 격차 하나이고, 168 은 **구멍**이다 — Base 스키마의 네 칸(`tags`·`owner_id`·`valid_from`·`valid_until`)을 **아무도 안 읽는다.** 「정의만 있고 아무 일도 안 하는 코드」는 이 저장소의 단골 고장이고(④2-B), 116이 9 의 절반을 닫으며 남긴 나머지 절반이 바로 그것이다.
> ⚠ **한 바퀴에 하나만 골라라** — 넷을 다 살리려 들지 마라. 168 이 적어 둔 대로 `valid_until` 은 컴파일러가 시각을 못 읽어(P4) golden 이 같이 움직인다. **화면이 `tags` 를 읽게 하는 쪽이 값싸다.**
> PLAN 의 `- [ ]` 셋은 전부 사람 대기다 (아래 「막힌 것」).

- PLAN 의 `- [ ]` 중 남은 것 **셋**: P5 첫 행(🙋 Vercel · 새 PC) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(**168** · 170 · 156 · 152 · 140 · 117 · 33 · 24 · …) — **고장 0** · 이번 바퀴가 새로 찾은 것은 **하나(170)**. 관통은 GREEN(9단계 · 1275검사)이다.

### 지난 바퀴 (116) — 항목의 `body` 가 어느 절에서도 안 버려진다 (FINDINGS 9 ✅ 절반 · `5377fe9`)
**그 바퀴(116)는 `FINDINGS 9` 의 절반을 닫았다 — 사용자가 적은 설명(`body`)이 이제 **모든 절**에서 Pack 에 나간다.** 115가 지목해 둔 그대로다. INBOX 「할 것」비어 있음.
🟢 **CI GREEN 전 층 · 관통 1270검사 · 9단계 SKIP 0.**

🔴 **무엇이 죽어 있었나.** 컴파일러가 `bodyLine()` 을 부르는 절이 **넷**(architecture·adr_full·domain·workflow)뿐이었다. mission·goal·roadmap·policy·constraint 절에서는 `body` 가 **한 글자도 안 나갔다** — 화면에는 멀쩡히 떠서 눈으로는 절대 안 잡히는 종류다 (④2-B 의 원형).

🔴 **고친 방식 — 「부르는 걸 잊었나」를 「표의 빈 칸」으로 바꿨다.**

| 무엇 | 어떻게 |
|---|---|
| `SectionSpec` | **`body` 칸**을 더했다 (`BodyStyle` 4값). 안 고르면 **타입이 막는다** |
| 값 4개 | `block`(끝에 한 줄 · mission·architecture·adr_full·workflow) · `indent`(목록 줄 아래 두 칸 · goal·roadmap·policy·constraint·scoped_rule) · `own`(절이 자리를 정한다 — domain 은 용어·불변식보다 **앞**) · `elsewhere`(요약 절이라 다른 절이 낸다 — quickmap→architecture · adr_summary→adr_full) |
| 붙이는 자리 | `renderSection()` **하나**. `assemble` 은 그것만 부른다 — `render` 안에서 손으로 부르던 자리를 없앴다 |
| `TEMPLATE_VERSION` | 1.3 → **1.4** · golden case-1 의 mission `body` 한 줄이 파일 3개에 늘었다 (sha256·크기·`manifest_hash` 갱신) |

🔴 **게이트로 올렸다 — 지문으로 재지 않는다.** `test/liveness.test.ts` 「ItemType 10종의 body」가 타입마다 `body` 를 채워 **그 문장이 Pack 본문에 실제로 있나**를 잰다. Pack 에 안 나가는 타입(`open_question`)은 0건이어야 한다. 표가 빈 칸 없이 채워졌는지도 표를 **읽어서** 잰다.
★ **왜 지문(fingerprint)이 아닌가** — `body` 는 `snapshot_hash` 에도 들어가서 머리말의 `snapshot:` 한 줄이 **늘 바뀐다.** 지문으로 재면 body 를 통째로 버려도 초록이다. 처음에 그렇게 짰다가 이 사실을 시험이 알려 줘서 고쳤다.
🔴 **게이트가 무는지 봤다** — policy 의 칸을 `elsewhere` 로 되돌려 `policy 의 body 가 어느 파일에도 없다` FAIL 을 확인한 뒤 되돌렸다.

🔴 **살리자 겹침 둘이 드러났다 — 관통의 메아리 검사(99·100)가 잡았다.** 이게 이번 바퀴의 본체다:

| 어디 | 무엇이었나 | 어떻게 |
|---|---|---|
| `lib/api/answer.ts` | `answerDraft()` 가 답변 문장을 `body` **와** `data`(rule·statement) 양쪽에 넣고 있었다 | `body` 를 비운다 — 답변은 `data` 로 서고 절이 그것을 그린다. 죽은 `answer` 인자도 지웠다 |
| `lib/demo/seed.ts` 둘 | `item_constraint_card`·`item_policy_retry_scope` 의 `body` 가 제 `rule`·`statement` 를 되풀이했다 | 「왜 그런가」를 말하는 문장으로 바꿨다 (옆의 `item_policy_retry` 가 이미 그 모양이다) |

★ **셋 다 `body` 가 버려지던 동안 아무도 못 보던 것**이다. 살리는 일이 곧 찾는 일이었다.

🔴 **잰 것** (CI 22:06 · 관통 155초):

| | 전(115바퀴) | 후 |
|---|---|---|
| `body` 를 내는 절 | **4 / 12** | **10 / 12** (요약 절 둘은 `elsewhere`) |
| 관통 검사 | 1259 | **1270** |
| 컴파일러 시험 | 187 | **196** |
| `TEMPLATE_VERSION` | 1.3 | **1.4** |
| CI | GREEN | **GREEN 전 층** |

🔴 **눈으로 읽었다 — `.ci/walkthrough-pack/CLAUDE.md`.** 정책·제약·목표 줄마다 설명이 한 줄씩 들여쓰여 붙었고 태그는 그 줄 끝에 있다 (P7 그대로). 사람이 읽어서 「왜 이 규칙인가」가 종이에서 처음으로 읽힌다.
⚠ **그러다 새 격차를 봤다** — 씨앗 둘(`item_constraint_settlement_batch`·`item_goal_success_rate`)의 `body` 가 제 `data` 를 **말만 바꿔** 되풀이한다. 글자가 달라 메아리 검사는 통과한다. **FINDINGS 169** 로 적었다.

🔴 **2-B 이번 라운드 — `ItemType` 10종의 `body` 를 셌다.** 그게 이번 바퀴 자체다. 아직 안 센 표: 에러 코드 9종 · `AI_JOB_STATUSES` 4종(데모 씨앗에 job 이 **0개**다 — 셀 때 여기부터).

🔴 **새로 적은 것 둘** — **168**(9 의 남은 절반: `tags`·`owner_id`·`valid_from`·`valid_until` 은 아직 0곳이 읽는다) · **169**(씨앗의 되풀이 둘).

**그 바퀴가 다음으로 지목한 것 — FINDINGS 169**


> 🔴 **왜 169 인가.** 이번 바퀴가 **종이를 눈으로 읽다가 찾은 것**이고, 고칠 자리가 씨앗 두 줄로 좁고, **심사위원이 읽는 그 CLAUDE.md** 가 같은 말을 두 번 하는 자리다. 168 은 같은 9 의 남은 절반이지만 **주인이 화면(P1~P4 행)**이고 `valid_until` 은 golden 을 같이 움직인다 — 169 보다 크다.
> ⚠ 씨앗을 고치면 관통의 인용 검사가 원문(`fixtures/paylab-*`)과 대조한다. **원문에 있는 말**로 적어라.
> PLAN 의 `- [ ]` 셋은 전부 사람 대기다 (아래 「막힌 것」).

- PLAN 의 `- [ ]` 중 남은 것 **셋**: P5 첫 행(🙋 Vercel · 새 PC) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(**169** · 168 · 156 · 152 · 140 · 117 · 33 · 24 · …) — **고장 0** · 이번 바퀴가 새로 찾은 것은 **둘(168 · 169)**. 관통은 GREEN(9단계 · 1270검사)이다.

### 지난 바퀴 (115) — 빈 제안 목록도 「만든」이라고 말한다 (FINDINGS 167 ✅ · `05fd6e7`)
**그 바퀴(115)는 `FINDINGS 167` 을 닫았다 — 빈 제안 목록도 「만든」이라고 말한다. 낱말 `MADE` 를 `lib/web` 으로 내렸다.** 114가 지목해 둔 그대로다. INBOX 「할 것」비어 있음.
🟢 **CI GREEN 전 층 · 관통 1259검사 · 9단계 SKIP 0.**

🔴 **같은 낱말의 세 번째이자 마지막 자리였다.** 165(날짜 칸) · 166(목록 위 한 줄)을 고친 뒤에도 **제안이 하나도 없을 때의 문장**은 `아직 올라온 제안이 없습니다` 였다. `propose` 는 만들기만 하는 명령이고 안 올린 `draft` 도 이 목록에 뜨므로(163), 「올라온 것이 없다」는 이 목록의 조건이 아니다.

🔴 **왜 자리가 셋으로 갈라졌나 — 이번 바퀴의 본체다.** 166 이 만든 `MADE` 는 `components/proposals.tsx` 안에 있었고, 빈 목록의 문구는 `lib/web/screens.ts` 의 `EMPTY_PLACES` 가 정본이다. **`lib/` 는 `components/` 를 못 읽는다**(의존 방향). 낱말이 조각 쪽에 있는 한 이 문장만은 문자열을 한 벌 더 적을 수밖에 없었다 — **낱말을 아래로 내리는 것이 고침의 전부**이고, 문자열 하나를 더 고치는 것은 넷째 자리를 만드는 일이었다.

🔴 **고친 자리 — 낱말을 내렸다. 제품 로직 0줄.**

| 무엇 | 어떻게 |
|---|---|
| `MADE = '만든'` | `components/proposals.tsx` → **`lib/web/screens.ts`** (`EMPTY_PLACES` 바로 위 · export). 아래에 있으니 조각도 표도 같은 하나를 읽는다 |
| `EMPTY_PLACES['proposals.list']` | `` `아직 ${MADE} 제안이 없습니다. …` `` — 문자열을 한 벌 더 적지 않았다 |
| `components/proposals.tsx` | `import { MADE } from '../lib/web/screens'` 한 줄. 표 머리(`${MADE} 날`)와 `ProposalListIntro` 는 그대로다 |
| `DESIGN_BRIEF` §4 화면 6 | 빈 목록 문구 한 줄 + 정본이 왜 `lib/web` 인지(의존 방향) 두 줄 |

🔴 **게이트로 올렸다 — 셋을 잰다.** `web-proposals.test.ts` 「빈 목록도 같은 낱말로 말한다」가 ① 빈 문장이 `아직 {MADE} 제안이 없습니다` 인가 ② **표 머리와 목록 위 한 줄도 같은 `MADE` 를 읽는가** ③ `올라온|제출된` 이 없는가.
★ **②가 본체다** — ①③만 있으면 세 자리를 각자 고쳐도 초록이라, 낱말이 다시 갈라지는 것 자체는 안 잠긴다.
🔴 **게이트가 무는지 봤다** — 문구를 `아직 올라온 제안이 없습니다` 로 되돌려 `Expected: "아직 만든 제안이 없습니다"` FAIL 을 확인한 뒤 되돌렸다.

🔴 **잰 것** (CI 21:33 · 관통 155초):

| | 전(114바퀴) | 후 |
|---|---|---|
| 빈 제안 목록의 문장 | **「아직 올라온 제안이 없습니다」** | **「아직 만든 제안이 없습니다」** |
| 「만든」을 정하는 자리 | **둘**(`components` 의 `MADE` · `EMPTY_PLACES` 의 손글씨) | **하나**(`lib/web/screens.ts` 의 `MADE`) |
| 그 낱말을 읽는 자리 | 2(머리 · 목록 위 한 줄) | **3**(+ 빈 목록) |
| 관통 검사 | 1258 | **1259** |
| CI | GREEN | **GREEN 전 층** |

🔴 **눈으로 봤다 — 다만 브라우저 캡처는 없다.** 데모 씨앗이 제안 다섯 장을 세워서 **이 빈 상태는 화면에 안 나온다**(167 의 「근거」가 미리 적어 둔 그대로다). 대신 조각을 그려 마크업을 직접 읽었다:
`<div class="state-box">◌ <p>아직 만든 제안이 없습니다. Claude Code에서 /contextops:propose 를 실행하면 여기에 쌓입니다.</p><a class="btn" href="…/context">Context 항목 보기</a></div>`
같은 자리에서 표 머리는 `만든 날` · 목록 위 한 줄은 `…로 만든 변경 제안입니다. 올린 것만 …` 이다 — 세 자리가 같은 말을 한다.
⚠ 씨앗에 빈 제안 목록을 세우는 갈래는 없다(다섯 장이 랜딩 문장과 다른 시험들의 근거다). 이 빈 상태를 브라우저로 보려면 **데모와 다른 프로젝트**가 필요하다 — 지금 만들 이유는 없다.

🔴 **2-B 이번 라운드 — 안 셌다.** 이번 바퀴도 화면 6 의 같은 자리(문구)라 표를 새로 세지 않았다. 아직 안 센 표는 그대로다: `ItemType` 10종 · 에러 코드 9종 · `AI_JOB_STATUSES` 4종(데모 씨앗에 job 이 **0개**다 — 셀 때 여기부터).

🔴 **새로 찾은 것은 없다.** 165 → 166 → 167 로 이어진 「같은 낱말」 줄기가 여기서 끝났다 — `grep -rn "올라온" apps/web/src` 가 이제 이 세 자리에서 0건이다.

- PLAN 의 `- [ ]` 중 남은 것 **셋**: P5 첫 행(🙋 Vercel · 새 PC) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(**9** · 156 · 152 · 140 · 117 · 33 · 24 · …) — **고장 0** · 이번 바퀴가 새로 찾은 것은 **없다**. 관통은 GREEN(9단계 · 1259검사)이다.

### 지난 바퀴 (114) — 화면 6 목록 위 설명이 만든 것과 올린 것을 갈라 말한다 (FINDINGS 166 ✅ · `0fcf8b9`)

**이번 바퀴(114)는 `FINDINGS 166` 을 닫았다 — 화면 6 의 목록 위 설명도 「만든 것」과 「올린 것」을 갈라 말한다.** 113이 지목해 둔 그대로다. INBOX 「할 것」비어 있음.
🟢 **CI GREEN 전 층 · 관통 1258검사 · 9단계 SKIP 0.**

🔴 **165 의 남은 절반이었다 — 같은 거짓말이 한 자리 더 있었다.** 113이 표 머리를 「올라온 날」→「만든 날」로 고쳤는데, 그 표 **위 한 줄**은 여전히 `contextops propose 로 올라온 변경 제안입니다` 였다. 163 이 세운 `draft` 행은 `propose` 가 **만들어 놓기만 하고 안 올린 것**이라, 「초안」 칩을 눌러 그 한 장만 봐도 화면이 「올라온 제안입니다」라고 적었다.

🔴 **왜 165 의 게이트가 이걸 못 물었나 — 이번 바퀴의 진짜 교훈이다.** 그 문장이 `proposals/page.tsx` 안에 있었고, **시험이 그리는 것은 조각(`components/`)이지 페이지가 아니다.** 그래서 낱말을 잠근 게이트가 표 머리에만 걸렸다. 문장을 조각으로 옮기지 않으면 같은 일이 셋째 자리에서 또 난다.

🔴 **고친 자리 — 문장을 옮기고, 낱말을 하나로 묶었다.**

| 무엇 | 어떻게 |
|---|---|
| `ProposalListIntro` | 목록 위 한 줄의 정본이 **조각**이 됐다 (`components/proposals.tsx`). `page.tsx` 는 부르기만 한다 — 시험이 머리와 이 문장을 **함께** 읽는다 |
| `MADE = '만든'` | 표 머리(`` `${MADE} 날` ``)와 이 문장(`로 {MADE} 변경 제안입니다`)이 **낱말 하나**에서 나온다. 한쪽만 되돌리면 시험이 먼저 빨개진다 |
| 문장 | 「…로 **만든** 변경 제안입니다. **올린 것만** 승인 대기로 가고, 승인된 제안만 다음 발행에 들어갑니다.」 — 만든 것과 올린 것이 갈라졌다 |
| `DESIGN_BRIEF` §4 화면 6 | 그 문장과 정본 자리(`ProposalListIntro`·`MADE`)를 세 줄로 적었다 |

🔴 **게이트로 올렸다 — 넷을 잰다.** `web-proposals.test.ts` 가 문장을 그려서 ① `contextops propose` 가 남아 있나 ② **표 머리의 낱말**(`PROPOSAL_DATE_COLUMN.head` 의 첫 낱말)이 문장에도 있나 ③ `올라온|제출된` 이 없나 ④ **「올린 것만」이 있나**.
★ **④가 본체다** — ③만 있으면 「올린」을 통째로 지워도 초록이고, 그러면 `draft` 가 왜 승인 대기로 안 가는지 화면이 아무 말도 안 하게 된다. ②는 머리와 문장이 다시 갈라지는 것을 막는다.
🔴 **게이트가 무는지 봤다** — 문장을 「올라온 변경 제안입니다」로 되돌려 `expected … to contain '만든 변경 제안'` FAIL 을 확인한 뒤 되돌렸다.

🔴 **잰 것** (CI 21:11 · 관통 160초):

| | 전(113바퀴) | 후 |
|---|---|---|
| 목록 위 설명 | **「올라온 변경 제안입니다」**(초안이 섞인 목록에) | **「만든 변경 제안입니다 · 올린 것만 …」** |
| 그 문장을 적는 자리 | `page.tsx`(시험이 못 읽는다) | **조각** `ProposalListIntro` |
| 「만든」을 정하는 자리 | **둘**(표 머리 글자 · 문장 글자) | **하나**(`MADE`) |
| `apps/web` 시험 | 865 | **866** (+1) |
| 관통 검사 | 1257 | **1258** |
| CI | GREEN | **GREEN 전 층** |

🔴 **눈으로 봤다** — `docs/evidence/2026-09-07-proposal-list-intro/after-screen-proposals.png` (이번 관통이 찍은 진짜 브라우저 · `.ci/shots/` 밖으로 복사했다). 제목 아래 한 줄이 「Claude Code에서 `contextops propose` 로 만든 변경 제안입니다. 올린 것만 승인 대기로 가고, 승인된 제안만 다음 발행에 들어갑니다.」 이고, 첫 행은 `· 초안` · 「만든 날」 칸은 `2026-09-01` 이다 — 이제 한 화면 안에서 세 자리가 같은 말을 한다. 163 의 다섯 상태 · 164 의 마일스톤 칩(4/5행)도 그대로다.

🔴 **덤으로 하나 적었다 — FINDINGS 167.** 같은 낱말을 `grep -rn "올라온"` 으로 훑다 **셋째 자리**가 나왔다: 빈 제안 목록의 문장이 `아직 올라온 제안이 없습니다`(`lib/web/screens.ts:260`)다. ⚠ 고칠 때 낱말을 그냥 하나 더 적지 마라 — `MADE` 는 `components/` 안에 있고 `screens.ts` 는 그것을 못 읽는다(의존 방향). **`MADE` 를 어디로 올릴지**를 먼저 정해야 넷째 자리가 안 생긴다.

🔴 **2-B 이번 라운드 — 안 셌다.** 이번 바퀴도 화면 6 의 같은 자리라 표를 새로 세지 않았다. 아직 안 센 표는 그대로다: `ItemType` 10종 · 에러 코드 9종 · `AI_JOB_STATUSES` 4종(데모 씨앗에 job 이 **0개**다 — 셀 때 여기부터).

**그 바퀴가 다음으로 지목한 것 — FINDINGS 167** (이번 바퀴가 닫았다 · `05fd6e7`)

> 🔴 **왜 167 인가.** 이번 바퀴가 새로 찾은 것이고 **같은 낱말의 마지막 자리**다 — 165·166 을 고친 뒤에도 빈 목록만 「올라온」이라고 말한다. 다만 문자열 하나가 아니라 **`MADE` 를 어디에 둘 것인가**를 정하는 일이라(의존 방향 `schema ← compiler ← web`) 한 바퀴를 준다. 나머지 대기는 그대로 사람을 기다린다 — 156(배포 뒤) · 152(⛔ 다음 실패가 200자를 말할 때까지) · 140(🙋 새 PC) · 117(절삭 1번으로 잘랐다) · 33·24(「지금 열지 마라」). PLAN 의 `- [ ]` 셋도 전부 사람 대기다 (아래 「막힌 것」).

- PLAN 의 `- [ ]` 중 남은 것 **셋**: P5 첫 행(🙋 Vercel · 새 PC) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(**167** · 156 · 152 · 140 · 117 · 24 · …) — **고장 0** · 이번 바퀴가 새로 찾은 것은 **167 하나**(격차)다. 관통은 GREEN(9단계 · 1258검사)이다.

### 지난 바퀴 (113) — 화면 6 날짜 칸의 머리와 값을 맞췄다 (FINDINGS 165 ✅ · `49ce8e4`)

**이번 바퀴(113)는 `FINDINGS 165` 를 닫았다 — 화면 6 의 날짜 칸이 말하는 것과 값을 맞췄다.** 112가 지목해 둔 그대로다. INBOX 「할 것」비어 있음.
🟢 **CI GREEN 전 층 · 관통 1257검사 · 9단계 SKIP 0.**

🔴 **고장이 아니라 「화면이 거짓말을 한다」였다.** 표 머리는 「올라온 날」(= 제출한 날)인데 그리는 값은 `p.created_at`(만든 날)이었다. 넷이 전부 제출된 것이던 동안에는 둘이 사실상 같아서 안 보였고, **163 이 `draft` 행을 세우자** 아직 안 올라온 제안에 「올라온 날 2026-09-01」이 붙었다.
⚠ 대장이 권한 **①(머리를 값에 맞춘다)** 로 갔다. ②(`submitted_at` 을 낸다)는 `proposals` 표에 그 칸이 **없어서**(`db/schema.ts` — `decided_at` 은 「이 상태로 옮긴 시각」이라 `draft` 에선 늘 `null`) 표·스키마·라우트를 같은 바퀴에 고쳐야 한다.

🔴 **고친 자리 — 낱말 하나가 아니라 「머리와 값을 한 줄로 묶었다」.**

| 무엇 | 어떻게 |
|---|---|
| `PROPOSAL_DATE_COLUMN { head, of }` | 표 머리의 낱말과 그리는 칸이 **같은 한 줄**에서 나온다 (`components/proposals.tsx`). 화면은 읽기만 한다 |
| 표 머리 · 칸 | `<th>{…head}</th>` · `dateText(…of(p))` — 한쪽만 고치면 시험이 먼저 빨개진다 |
| `DESIGN_BRIEF` §4 화면 6 | 마지막 칸 「제출 시각」 → 「**만든 날**(`created_at`)」 + 왜 아닌지·고치려면 어디부터인지 두 줄 |

🔴 **게이트로 올렸다 — 셋을 잰다.** `web-proposals.test.ts` 가 **초안 행을 그려서** ① 머리가 표의 낱말이고 값이 그 표가 가리키는 칸인가 ② 머리가 `올라온|올린|제출` 을 말하지 않는가 ③ **`getTableColumns(proposals)` 에 `submittedAt` 이 없는가**.
★ **③이 본체다** — 낱말만 잠그면 누가 제출 시각 칸을 만드는 날에도 초록이라 **「칸은 생겼는데 화면은 영원히 만든 날」**이 된다. ③이 그날 빨개져서 머리 낱말을 다시 고를 자리로 데려온다.
🔴 **게이트가 무는지 봤다** — 머리를 「올라온 날」로 되돌려 `expected '올라온 날' not to match /올라온|올린|제출/` FAIL 을 확인한 뒤 되돌렸다.

🔴 **잰 것** (CI 14:27 · 관통 151초):

| | 전(112바퀴) | 후 |
|---|---|---|
| 초안 행의 날짜 머리 | **「올라온 날」**(안 올라온 것에) | **「만든 날」** |
| 머리와 값을 정하는 자리 | **둘**(`<th>` 글자 · `p.created_at`) | **하나**(`PROPOSAL_DATE_COLUMN`) |
| `apps/web` 시험 | 864 | **865** (+1) |
| 관통 검사 | 1256 | **1257** |
| CI | GREEN | **GREEN 전 층** |

🔴 **눈으로 봤다** — `docs/evidence/2026-09-07-proposal-date-column/after-screen-proposals.png` (이번 관통이 찍은 진짜 브라우저 · `.ci/shots/` 밖으로 복사했다). 표 머리가 「만든 날」이고 첫 행 `· 초안` 의 그 칸이 `2026-09-01` 이다 — 이제 거짓말이 아니다. 164 가 세운 마일스톤 칩(4/5행 · 칩 둘인 행 하나)과 163 의 다섯 상태도 그대로다.

🔴 **덤으로 하나 적었다 — FINDINGS 166.** 같은 캡처에서, 표 위 설명 한 줄이 아직 `… contextops propose 로 **올라온** 변경 제안입니다` 다 (`proposals/page.tsx:51`). 165 가 표 머리에서 고친 것과 **같은 거짓말**이 한 번 더 있고, 이번 게이트는 **표 머리만** 문다.

🔴 **2-B 이번 라운드 — 안 셌다.** 이번 바퀴가 고친 것이 화면 6 의 같은 자리라 표를 새로 세지 않았다. 아직 안 센 표는 그대로다: `ItemType` 10종 · 에러 코드 9종 · `AI_JOB_STATUSES` 4종(데모 씨앗에 job 이 **0개**다 — 셀 때 여기부터).

**그 바퀴가 다음으로 지목한 것 — FINDINGS 166** (이번 바퀴가 닫았다 · `0fcf8b9`)

> 🔴 **왜 166 인가.** 이번 바퀴가 같은 캡처에서 새로 찾은 것이고, 165 의 **남은 절반**이다 — 표 머리는 고쳤는데 그 위 설명이 여전히 「올라온」이라고 말한다. 문장 한 줄이고 제품 로직은 0줄이다. 나머지 대기는 그대로 사람을 기다린다 — 156(배포 뒤) · 152(⛔ 다음 실패가 200자를 말할 때까지) · 140(🙋 새 PC) · 117(절삭 1번으로 잘랐다) · 33·24(「지금 열지 마라」). PLAN 의 `- [ ]` 셋도 전부 사람 대기다 (아래 「막힌 것」).

- PLAN 의 `- [ ]` 중 남은 것 **셋**: P5 첫 행(🙋 Vercel · 새 PC) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(**166** · 156 · 152 · 140 · 117 · 24 · …) — **고장 0** · 이번 바퀴가 새로 찾은 것은 **166 하나**(격차)다. 관통은 GREEN(9단계 · 1257검사)이다.

### 지난 바퀴 (112) — 제안이 마일스톤을 가리킨다 (FINDINGS 164 ✅ · `73532f8`)

**이번 바퀴(112)는 `FINDINGS 164` 를 닫았다 — 화면 6 의 제안이 마일스톤을 가리킨다.** 111이 지목해 둔 그대로다. INBOX 「할 것」비어 있음.
🟢 **CI GREEN 전 층 · 관통 1256검사 · 9단계 SKIP 0.**

🔴 **162 · 163 과 같은 모양이다 — 죽은 것은 코드가 아니라 씨앗이다.** 배선은 다 살아 있었다: 계약이 `relates_to`(`packages/schema/src/upload.ts:111`) · 만드는 라우트가 `relatesTo: body.relates_to` 로 넣고(`proposals/route.ts:65`) · 표에 칸이 있고(`db/schema.ts:435`) · 화면이 칩으로 그린다(`proposals.tsx:132`·`205`). `DEMO_PROPOSALS` 가 그 키를 **한 줄도 안 썼을 뿐**이라 「관련 마일스톤」 칸이 **다섯 행 전부 「—」** 였다.
⚠ 그 줄은 **화면 6(제안)과 화면 8(로드맵)을 잇는 유일한 줄**이다. 없으면 두 화면이 이어진 적 없는 제품으로 보인다.

🔴 **고친 자리 — 씨앗뿐이다. 제품 코드 0줄.**

| 무엇 | 어떻게 |
|---|---|
| `DemoProposal.relatesTo` | 타입이 `MILESTONES` 의 id 칸을 **직접 읽는다** (`type DemoMilestoneId = (typeof MILESTONES)[number][1]`) — 없는 id 는 화면에 뜻 없는 칩을 세우는데, 여기서 **타입이 먼저** 빨개진다 |
| 다섯 줄 중 **넷**에 값 | 재시도 → `PL-M1` · 웹훅 서명 → `PL-M3` · 환불 SLA → `PL-M2`+`PL-M1`(칩 **둘**) · 초안(토큰 보관) → `PL-M3` |
| 성공률 목표 한 줄 | **일부러 비웠다** — 「—」도 화면의 한 갈래다 |
| 심는 반복문 | `relates_to: p.relatesTo ?? []` 로 라우트에 넘긴다 (계약의 기본값과 같다) |

🔴 **게이트로 올렸다 — 핵심은 162·163 과 같이 「종류를 표에서 센다」이다.** `demo-guest.test.ts` 의 새 시험이 넷을 잰다: ① **`MILESTONES` 를 돌며** 3종이 전부 한 번은 걸리나 ② 쓰인 id 가 전부 **씨앗이 심은 것**인가 ③ 빈 행이 하나 서나 ④ 칩 **둘**인 행이 하나 서나.
★ **①이 본체다** — 「빈 배열이 아닌 행이 있다」로 끝냈으면 한 줄만 채워도 초록이라 **`MILESTONES` 에 넷째가 붙는 날 그 마일스톤은 제안 화면에서 영원히 안 보인다.**
🔴 **게이트가 무는지 봤다** — `relatesTo: ['PL-M2', 'PL-M1']` 한 줄을 빼고 돌려 `제안 어디에도 PL-M2 를 가리키는 줄이 없다` FAIL 을 확인한 뒤 되돌렸다.

🔴 **잰 것** (CI 14:11 · 관통 149초):

| | 전(111바퀴) | 후 |
|---|---|---|
| 화면 6 의 「관련 마일스톤」 칸 | **0 / 5행**(전부 「—」) | **4 / 5행** |
| 제안이 가리키는 마일스톤 종류 | **0 / 3** | **3 / 3** (`PL-M1`·`PL-M2`·`PL-M3`) |
| `apps/web` 시험 | 863 | **864** (+1) |
| 관통 검사 | 1255 | **1256** |
| CI | GREEN | **GREEN 전 층** |

🔴 **눈으로 봤다** — `docs/evidence/2026-09-07-proposal-relates-to/after-screen-proposals.png` (이번 관통이 찍은 진짜 브라우저 · `.ci/shots/` 밖으로 복사했다). 표 5행의 「관련 마일스톤」 칸이 위에서부터 `PL-M3` · `PL-M2` `PL-M1` · `PL-M3` · `—` · `PL-M1` 이다. 칩 둘인 행이 한 줄 안에서 나란히 서고 가로 넘침은 없다.

🔴 **문서도 같이 옮겼다** — SPEC §10.3 에 「넷이 `relates_to` 로 마일스톤 3종을 전부 한 번씩」 · `DESIGN_BRIEF` §4 화면 6 의 「관련 마일스톤 칩」 칸에 같은 문장.

🔴 **2-B 이번 라운드 — 안 셌다.** 이번 바퀴가 닫은 것 자체가 2-B 의 「정의만 있고 아무 일도 안 하는 것」(씨앗 판)이라 같은 자리를 두 번 세지 않았다. 아직 안 센 표는 그대로다: `ItemType` 10종 · 에러 코드 9종 · `AI_JOB_STATUSES` 4종(데모 씨앗에 job 이 **0개**다 — 셀 때 여기부터).

**그 바퀴가 다음으로 지목한 것** — FINDINGS 165 (이번 바퀴가 닫았다).

<!-- 아래 주석은 지난 바퀴의 것이다 — 살아 있는 자리는 위 한 줄뿐이다 (FINDINGS 102).
     모양을 지켜라: `**다음 바퀴의 일 — FINDINGS <번호>**` (대기가 없으면 「FINDINGS 없음」).
     `tools/status-shape.mjs` 가 ① 이런 줄이 **하나**인지 ② 그 번호가 FINDINGS 에서
     **대기**인지를 센다. 닫힌 항목을 가리키면 `tools/ci.ps1` 의 `docs` 층이 FAIL 이다.
     ⚠ 「다음 할 일」을 여기 말고 다른 데 또 적지 마라 — 그게 102 의 고장이었다.
     ⚠ 지나간 바퀴의 지목은 **다른 낱말**로 적어라 (「그 바퀴가 다음으로 지목한 것」). -->

> 🔴 **왜 165 인가.** 111이 같은 캡처에서 찾아 적어 둔 마지막 한 줄이고, **이번 캡처에서 다시 보인다** — 「· 초안」 행의 오른쪽이 「올라온 날 2026-09-01」이다. 아직 안 올라온 제안에 붙은 날짜다. 대장이 **①(머리를 「만든 날」로)을 권**하고 있고 코드 0줄·문서 한 줄이다. 나머지 대기는 그대로 사람을 기다린다 — 156(배포 뒤) · 152(⛔ 다음 실패가 200자를 말할 때까지) · 140(🙋 새 PC) · 117(절삭 1번으로 잘랐다) · 33·24(「지금 열지 마라」). PLAN 의 `- [ ]` 셋도 전부 사람 대기다 (아래 「막힌 것」).

- PLAN 의 `- [ ]` 중 남은 것 **셋**: P5 첫 행(🙋 Vercel · 새 PC) · P6 두 행(🙋 영상 · 제출서는 production URL·영상만 🙋).
- 대장의 대기(**165** · 156 · 152 · 140 · 117 · 24 · …) — **고장 0** · 이번 바퀴가 새로 찾은 것은 **없다**(111이 적어 둔 165 가 캡처에서 그대로 다시 보였다). 관통은 GREEN(9단계 · 1256검사)이다.

## 앞 바퀴들이 남긴 것 — 다음 사람이 알아야 하는 것

> ⛔ **여기에 「다음 할 일」을 적지 마라.** 그 자리는 머리의 **「다음 바퀴의 일 — FINDINGS N」**
> **한 줄뿐**이고, `tools/status-shape.mjs` 가 그 줄이 **하나**인지 센다.
> ★ 왜 (FINDINGS **102**) — 이 절은 원래 「다음 바퀴가 할 일」이었다. 아무도 끝까지 안 읽는
> 자리라 **손이 안 닿았고**, 두 바퀴 전에 닫힌 항목(97)을 계속 가리키고 있었다.
> 규칙을 더해서 고치지 않고 **자리를 없앴다** — 여기는 이제 **지나간 바퀴의 지식**만 산다.
>
> ⚠ 아래의 「시작하기 전에 아는 것 (N)」 블록들은 **그 항목을 고르면 읽을 것**이지
> 「고르라」는 말이 아니다. **그 N 이 아직 대기인지는 `docs/feedback/FINDINGS.md` 에서
> 확인해라** — 여기 있는 것 중에는 이미 닫힌 것도 있다(76 등).

**94 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **FINDINGS 의 「고칠 방향」이 또 틀렸다 — 두 바퀴 연속이다.** 94 는 `open_question`
  을 §5 원문으로 채울 수 있다고 적었는데, `partition.ts:118` 이 그 타입을 **`exclude`**
  로 보낸다. 씨앗에 넣어도 그 축은 영원히 안 오른다. 93 의 `manual` 오독과 같은 모양이다.
  **대장의 방향도 SPEC 과 같은 지위다 — 코드를 먼저 열어라.**
- 🔴 **「표가 살아 있나」와 「데모가 그걸 보여 주나」는 정말로 다른 질문이다.**
  `liveness.test.ts` 는 10종을 여러 바퀴 초록으로 쟀는데 종이에는 다섯이었다.
  이 모양의 고장이 **넷째로 나왔다**(89 enforcement · 93 SourceRef·scope · 94 ItemType).
  표를 새로 만들 때는 「이 표의 갈래가 데모에 몇 개 서나」를 같이 물어라.
- 🔴 **93 이 만든 `PACK_COVERAGE` 가 값을 냈다** — 이번 바퀴에 고친 것은 `min: 5 → 7`
  **한 칸**이고 관통 스크립트는 한 줄도 안 고쳤다. 「축을 더하는 것이 표에 한 줄」이
  실제로 지켜졌다는 뜻이다.
- ⚠ **경로·줄 번호 같은 「밖을 가리키는 값」은 적지 말고 재라.** `fixtureDir()` 이
  세 번째 사례다 (`locate()` 문서 · `withRepo()` 코드 줄 · 이번엔 폴더).
  없으면 **던진다** — 조용히 넘어가면 아무도 안 센다.
- ⚠ **세다가 틀리기 쉬운 자리 둘은 그대로 있다.** `.claude/rules/domain-refund.md` 는
  `scope.kind='domain'` 축이고 `.claude/rules/workflow.md` 는 템플릿 안내문이다
  (`ctx:` 태그가 0개다). ItemType 축으로 세지 마라.

**93 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **FINDINGS 가 적어 둔 「고칠 방향」도 틀릴 수 있다.** 93 은 `manual` 근거가
  「충돌을 정리하면 붙는다」고 적었는데, 그 길이 붙이는 `manual` 은 **진 항목**에 붙고
  진 항목은 `deprecated` 라 **Pack 에서 빠진다.** 코드를 보기 전에 그 방향대로 만들었으면
  한 바퀴를 통째로 버렸다. **대장의 방향도 SPEC 과 같은 지위다 — 코드가 현실이다.**
- 🔴 **「표에 한 줄」로 만들려면 재는 재료도 한 곳에 모아야 한다.** `PACK_COVERAGE` 의
  네 축이 각각 다른 것을 본다(본문 글자 · 파일 경로 · 태그 조각 · 항목 타입). 그 넷을
  `PackView` 한 덩어리로 넘기니 축을 더하는 것이 정말로 한 줄이 됐다.
  축이 늘 때 `PackView` 에 칸이 하나 늘 수는 있고, 그건 그 절차 주석에 적혀 있다.
- 🔴 **접두사·파일 이름처럼 「형식」을 아는 코드가 둘이면 반드시 갈라진다.**
  이번에 둘을 없앴다 — `srcKindOf()` 는 `SRC_TAG` 표를 뒤집어 만들고,
  `scopePackPath()` 는 `SCOPE_DOC` + `DOCS` 를 잇는 유일한 문이다.
  **되읽는 함수는 쓰는 함수 옆에 두고, 왕복을 시험으로 잠가라.**
- ⚠ **근거가 여럿인 항목이 생겼다.** 검사를 항목 단위로 세면 **둘째 근거만 빠지는 것**이
  안 보인다. 이제 (항목 × 근거 종류)로 센다 — 새 근거를 더할 때 이 단위를 지켜라.
- ⚠ **씨앗 질문 표의 `question` 문장은 행에 저장된다.** 관통은 `SEED_QUESTIONS` 에서
  **id 로** 꺼내 문장을 짝짓는다 — 문장을 베끼지 않았으니, 표를 고치면 씨앗이 던진다.

**92 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **「검사가 돌았나」와 「그 검사가 이 파일을 봤나」는 다른 질문이다.** `typecheck` 층은
  여러 바퀴 「tsc 가 exit 0 이었다」를 초록으로 찍었고, 그 사이 관통을 만드는 코드 10개는
  타입을 한 번도 안 봤다. **90 이 남긴 것과 똑같은 모양이다** — 90 은 「태그가 있나」만
  세는 게이트가 「따라가면 그 문장이 있나」를 안 셌다. **두 바퀴 연속으로 같은 함정이다:
  게이트를 만들 때 「무엇을 안 세고 있나」를 반드시 물어라.**
- 🔴 **목록을 손으로 드는 자리는 전부 이 고장의 씨앗이다.** `include` 의 폴더 이름 ·
  게이트의 프로젝트 목록 · 면제 목록 — 셋 다 「한 줄 더하는 것을 잊으면 조용히 빠지는」
  모양이었다. 앞의 둘은 **찾게** 만들어 없앴고, 셋째(면제)는 없앨 수 없어서
  **죽으면 FAIL 하게** 만들었다. 목록을 꼭 들어야 하면 **썩었을 때 빨개지게** 해라.
- ⚠ **`.ci/result` 를 CI 가 끝나기 전에 읽으면 지난 바퀴의 GREEN 을 읽는다.**
  이번에 밟았다 — 층 출력에는 `build` 까지만 있는데 `.ci/result` 에는 `walkthrough OK
  => GREEN` 이 있어서 다 끝난 줄 알 뻔했다. **`.ci/result` 의 타임스탬프를 보고 판단해라**
  (`.ci/logs/*.txt` 의 mtime 이 더 정확하다).

**90 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **근거를 손으로 적지 마라 — 원문에서 재라.** 새 픽스처 항목을 더할 때는
  `fromDoc(id, type, doc, quote, extra)` 의 `quote` 에 **원문에서 잘라 온 문장**을 넣는다.
  숫자를 적을 자리가 이제 없다. 문서를 고쳤는데 문장을 안 고치면 **씨앗이 던져서**
  관통이 그 자리에서 멈춘다 — 그게 알림이다.
- 🔴 **「태그가 있나」와 「따라가면 그 문장이 있나」는 다른 질문이다.** 앞의 것만 세는 게이트가
  여러 바퀴 초록이었고 그 사이 여덟 줄 중 일곱이 엉뚱한 자리를 가리켰다.
  **「있나」를 세는 게이트를 만들면 항상 「맞나」도 셀 수 있는지 물어라.**

**89 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **「표가 살아 있나」와 「데모가 그걸 보여 주나」는 다른 질문이다.** `liveness.test.ts`
  는 여러 바퀴 「네 값이 서로 다른 줄을 낸다」를 재고 초록이었는데, 그 사이 심사자가 읽는
  종이에는 한 갈래만 있었다. **2-B ②단계를 통과한 축도 데모에서 한 갈래일 수 있다** —
  그건 죽은 코드가 아니라 **데모의 구멍**이고, 세는 자리가 다르다(관통이 센다).
- 🔴 **갈래를 채우겠다고 픽스처에 문장을 지어내지 마라.** 픽스처의 모든 줄은 문서까지
  역추적된다(P7). 갈래가 모자라면 **문서를 먼저 늘려라** — SPEC §10.1 이 그 문서의
  정본이다. 이번에 `permission`·`none` 을 비워 둔 이유가 이것이고, 그 판단은
  `PACK_ENFORCEMENT_MIN` 상수 옆에 적혀 있다.
- ⚠ **검사 쪽에 개수를 적지 마라.** 관통이 `=== 6` 을 두 곳에 적고 있어서, 픽스처를
  늘린 사람은 관통이 빨개지는 것을 보고 **검사 쪽 숫자를 고쳐 초록을 만든다.**
  이제 `SeedResult.drafted` 와 견준다 — 픽스처에 한 줄을 더하면 검사가 저절로 따라온다.

**88 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **토큰을 「제대로 썼나」와 「맞는 용도로 썼나」는 다른 질문이다.** `design-tokens.test.ts`
  는 여러 바퀴 동안 앞의 것만 셌고, 그 사이 뒤의 것이 다섯 자리 쌓였다. **표에 용도를
  적었으면 그 용도도 기계가 세게 해라** — 색 이름만 잠그면 반만 잠근 것이다.
- 🔴 **색 고장은 글자만 뽑는 캡처로 안 잡힌다.** 지난 바퀴들의 눈 판정 자료는 태그를
  지우고 글자만 남겼는데, 그러면 `class` 가 통째로 사라진다. **색을 판정할 때는 마크업을
  그대로 두고 읽어라.** 그리고 눈 대신 **대비를 계산해라** — 이 환경엔 브라우저가 없다.
- ⚠ **`ink-4` 를 쓰려면 같은 줄에 `aria-hidden` 이 있어야 한다** (게이트가 그렇게 잠겼다).
  장식이 아닌데 옅게 쓰고 싶으면 `ink-3`(`meta`)다. 정말로 그 사이 값이 필요하면
  `DESIGN_BRIEF` §3 표에 **먼저** 한 줄을 더해라 — `bad-bg` 가 그 길로 들어왔다.
- ⚠ **색 클래스를 두 곳에 적지 마라.** `chips.tsx` 의 `· rev N` 은 부모 `.ctx-tag` 가
  이미 ink-3 라 클래스를 뺐다. 부모가 정한 색을 자식이 또 적으면 한쪽만 고쳐진다.

**86 이 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **「소비처가 생겼다」로 끝내지 마라.** 86 은 「근거를 화면에 낸다」였는데, 냈지만
  **안 보이는 색**으로 그렸다. 시험 12개가 전부 초록이었고 `toContain` 은 색을 안 센다.
  **캡처를 읽는 단계가 아니었으면 이 바퀴는 「고쳤다」로 끝났을 것이다.**
- 🔴 **꺼내는 함수와 그리는 카드가 각자 모양을 적으면 칸이 빠져도 안 걸린다.**
  화면 한 줄의 모양은 `lib/web/queries.ts` 에 둔다 — 이 저장소의 기존 자리다.
- ⚠ **`design-tokens.test.ts` 는 주석 안의 색 리터럴도 센다.** 왜 그 색을 쓰지 말라고
  적을 때 값을 적지 마라 — **토큰 이름으로 적어라.**

**84 가 남긴 것 (다음 사람이 알아야 하는 것):**
**84 가 남긴 것 (다음 사람이 알아야 하는 것):**

- 🔴 **초안을 행으로 만드는 자리는 `insertDrafts()` 하나다** (`lib/api/item.ts`).
  새 문을 더하면 고를 것은 **`origin` 한 칸**뿐이고, 절차는 그 함수 옆 주석에 있다.
  ⛔ **라우트 안에서 `insert(contextItems)` 를 다시 적지 마라** — 그게 이번에 걷어낸
  모양이다 (두 라우트가 각자 네 가지를 따로 정하고 있었다).
- 🔴 **`REVISION_ORIGINS` 에 값을 더하면 찍는 자리를 같이 만들어라** (표 옆 주석).
  찍는 곳이 0곳인 값은 그 값을 **읽는 판정**(§7.2 의 `doc_vs_code`)을 영원히 0건으로
  만든다 — 31 이 여러 바퀴 그 상태였다.
- ⚠ **관통은 이 길을 아직 안 지난다.** `walkthrough.ps1` 은 `batch-draft`(scan 길)로만
  항목을 넣어서, 문서 → 후보 → 항목 길이 끊겨 있어도 **7단계 전부 초록**이었다.
  §7.1 이 키를 요구해서 관통에 넣기 어렵다 — 그래서 이 길의 게이트는 스텁을 쓰는
  `ai-job.test.ts` 다. **관통 초록을 「길이 이어졌다」로 읽지 마라.**
- ⚠ **화면 3 의 성공 카드는 이제 컴포넌트다** (`components/structure-candidates.tsx`).
  상태는 화면이 들고 카드는 받아서 그리기만 한다 — 브라우저가 없어서 눈 판정을
  마크업에서 뽑아 하기 때문이다. 상태를 카드 안에 넣으면 「저장 중」·「실패」·
  「만든 뒤」를 뽑아 볼 수 없다.

**빈 Pack 가드가 남긴 것 (80 이 남긴 것):**

- 🔴 **가드가 재는 값이 틀리면 가드가 없는 것보다 나쁘다.** 있으니까 아무도 다시 안 본다.
  `EMPTY_SNAPSHOT` 은 여러 바퀴 동안 「막고 있다」고 믿어졌는데 한 번도 안 걸렸다.
  **2-B 의 ②단계(값을 바꾸면 결과가 달라지나)가 이걸 잡는 유일한 잣대다.**
- 🔴 **판정과 표시를 나눠라.** 「이 snapshot 이 Pack 이 될 수 있나」는 컴파일러 하나가
  정하고, 「사람에게 무엇을 보여 주나」는 `COMPILE_ERROR_FAULT` 표가 정한다. 라우트가
  판정을 다시 하면 두 답이 갈린다 — 라우트가 항목 수를 세면 「항목은 있는데 전부
  제외된」 경우를 놓쳤을 것이다.
- ⚠ **컴파일러 에러를 API 코드로 옮기는 자리는 `lib/api/publish.ts` 한 곳이다.**
  새 `CompileErrorCode` 를 더하면 그 `Record` 가 타입 검사로 막는다.
- ⚠ `error-codes.test.ts` 는 `fail('CODE'` **문자열 리터럴**로 소비처를 센다. 표를 통해
  코드를 내면 그 코드의 「주인」이 사라져 보인다 — `COMPILE_FAILED` 의 리터럴 호출을
  남겨 둔 이유가 그것이다.

**표를 화면과 서버가 같이 읽을 때 아는 것 (79 가 남긴 것):**

- 🔴 **화면은 `packages/compiler` 를 import 할 수 없다** — 그 패키지가 `node:crypto` 를
  재수출한다. 컴파일러가 아는 것을 화면도 알아야 하면 표를 **`packages/schema` 로
  올려라** (`ITEM_STATUS_EXCLUDE_REASON` 이 그렇게 올라갔다).
- 🔴 **화면이 항목을 지목하는 이름은 `public_id` 다.** 응답에 uuid 가 없다 —
  새 라우트를 만들 때 「화면이 이 경로를 만들 수 있나」를 먼저 물어라. 못 만들면
  그 라우트는 있으나 마나다 (79 가 그 상태로 여러 바퀴 있었다).
- ⚠ **버튼 밑 캡션이 버튼 문구를 되풀이하지 않게 하라** (`actionCaption()`).
  「폐기 | 폐기 · …」는 캡션이 새 사실을 안 주는 것처럼 읽힌다.

**69 — sync 상태 `manual` 을 찍는 코드가 0곳이다** (격차). 다섯 중 하나가 죽어 있다.

**시작하기 전에 아는 것 (69):**

- 🔴 **먼저 정할 것은 「Pack zip 을 내려받는 길을 만드나」다** — 그 답이 이 항목의 답이다.
  만든다면 `manual` 은 **그 zip 을 손으로 푼 기기가 보고하는 값**이고, 안 만든다면
  `REPORTABLE_SYNC_STATUSES` 에서 빼고 SPEC §6 의 문장도 같이 지운다.
- ⚠ **`SYNC_STATUSES` 에서는 지우지 마라 — 직렬화된 enum 값이다** (`sync_status` pgEnum).
  중간을 지우면 옛 행을 못 읽는다.
- ⚠ **77·78 이 같이 본 것**: `SYNC_CHIP` 5종은 표가 잠겨 있는데 **그리는 화면이 0곳**이다.
  화면 9(기기별 상태)가 아직 없어서다 — 죽은 코드가 아니라 **아직 안 온 화면**이다.
  69 를 「살린다」로 고르면 그 화면과 같은 바퀴가 자연스럽다.

**72①② — 화면 4 가 DESIGN_BRIEF 의 나머지 두 칸을 안 그린다** (격차). 둘 다 **서버에
담을 자리나 문이 없어서** 안 그렸다. ①「용어: ___」를 담을 칸이 `resolution` 에 없다.
②「담당자 지정」은 충돌 행에 담당자 칸이 없고 사람 목록을 내는 문도 없다.

**시작하기 전에 아는 것 (72①②):**

- 🔴 **①은 이번 바퀴에 닫은 76 과 같은 자리다.** 76 을 「문구를 사실에 맞춘다」로
  닫았으므로, 중복 카드가 「같음/다름 + 용어」를 묻게 하려면 **먼저 서버가 그것을
  받아야 한다** — `resolution` 에 칸이 늘고, 그 값을 무엇이 읽는지도 같이 정해야 한다.
  ⚠ **읽는 곳을 안 정하고 칸만 늘리지 마라** — 그게 이 저장소의 단골 고장이다 (2-B).
- ⚠ **정말로 합치는 갈래**(진 쪽 `source_refs` 를 이긴 쪽에 잇기)를 고르면
  `SOURCE_REFS_MAX`(20) 초과 갈래를 정해야 한다. 지금 규칙은 **버리는 갈래는 없다**(=400).
  그때는 `CONFLICT_SIDES.duplicate` 문구도 같이 되돌리고,
  `web-conflict-card.test.ts` 의 첫 `expect`(표가 폐기만 한다)가 그 자리로 데려간다.

**76 — 「A로 합침」이 합치지 않는다** (고장). 중복 카드의 버튼은 「합침」이라고 묻는데
서버는 **진 쪽을 폐기할 뿐**이다. 이긴 쪽에 본문도 태그도 근거도 안 옮겨 온다.
사람은 합쳤다고 믿고 B 에만 있던 문장을 잃고, 되돌릴 문이 없다.

**시작하기 전에 아는 것 (76):**

- 🔴 **갈래가 둘이고 둘 중 하나만 골라라** — ① 문구를 사실에 맞춘다
  (`CONFLICT_SIDES.duplicate` 한 줄 · 싸다) · ② 정말로 합친다 (`appendSourceRef()` 로
  진 쪽 근거를 이긴 쪽에 잇는다 · 계약을 넓힌다).
- ⚠ **①을 고르면 DESIGN_BRIEF §4 의 「같음, 용어: ___」도 같이 고쳐라.** 반만 고치면
  화면과 정본이 갈려서 다음 바퀴가 어느 쪽이 맞는지 못 가린다.
- ⚠ **②를 고르면 72① 과 같은 자리다** (「용어」를 담을 칸이 `resolution` 에 없다).
  둘은 같이 정하는 것이 맞다. `SOURCE_REFS_MAX`(20)에서 넘치는 갈래도 같이 정해야
  하고, 지금 규칙은 **버리는 갈래는 없다**(=400)다.
- ⚠ **표에 종류별 갈래를 만들지 마라.** `RESOLUTION_ITEM_OUTCOME` 은 선택 축이고
  `duplicate` 만 다르게 하려면 그 축이 아니라 `CONFLICT_KIND_RULES` 에 칸이 는다.
  ①을 고르면 표는 아예 안 건드린다 — 그래서 ①이 싸다.

**표를 화면과 서버가 같이 읽을 때 아는 것 (74 가 남긴 것):**

- 🔴 **표가 `packages/schema` 로 올라가면 플러그인 번들이 갈린다.**
  `pnpm --filter @contextops/plugin build` 를 돌려야 `test/bundle.test.ts` 가 초록이다.
- 🔴 **선택을 하나 더할 때 고칠 자리는 다섯이고 절차는 표 옆 주석에 있다**
  (`RESOLUTION_ITEM_OUTCOME` 위). 앞의 둘은 타입 검사가 막는다.
- ⚠ **결정 전에 보여 준 문장과 결정 후에 남기는 문장은 같은 함수여야 한다.**
  두 문장을 따로 적으면 한쪽만 고쳐지고, 그게 「화면이 거짓말하는」 첫걸음이다.
- ⚠ **화면이 무엇을 다시 읽을지도 표에 물어라.** `if (choice !== 'dismiss')` 를 적으면
  선택이 늘 때 그 `if` 를 찾아야 한다.

**74 — 화면 4 가 「A가 맞음」의 결과를 안 알린다** (격차). 🔴 **이번 바퀴에 버튼의 뜻이
바뀌었다.** 어제까지 「A가 맞음」은 아무것도 안 지웠고, 오늘부터는 B 항목을 폐기해서
**다음 Pack 에서 사라지게 한다.** 화면은 그 말을 한 마디도 안 하고, 되돌리는 문도 없다
(`:resolve` 가 「이미 처리된 충돌」을 400 으로 막는다 — 27바퀴가 정한 것).

**시작하기 전에 아는 것 (74):**

- ⚠ **27바퀴 게이트와 부딪히지 않게 조심해라** — 「저장 **전에는** 무엇이 생기는지
  약속하지 않는다」는 *안 일어날 일을 약속하지 마라*는 뜻이다. 지금은 **일어난다.**
  약속이 아니라 **사실**을 적는 것이고, 그 사실은 표에서 온다.
- 🔴 **문구를 카드에 손으로 적지 마라.** `RESOLUTION_ITEM_OUTCOME`(`lib/api/conflict.ts`)이
  이미 「어느 쪽이 어디로 가나」를 들고 있다. 그 표를 읽어 그리면 선택이 늘어도 따라온다.
- ⚠ **그 표는 지금 서버 쪽에 있다.** 화면이 `lib/api/*` 를 import 하면 의존 방향이
  깨진다 (`schema ← compiler ← web`). **둘째 사용자가 생긴 것**이므로 `packages/schema`
  로 올리는 것이 그 표의 자리다 — 올리면 `pnpm --filter @contextops/plugin build` 가
  필요하다 (`test/bundle.test.ts`).
- ⚠ **모양을 뽑아 읽는 자리는 `scripts/dump-conflict-card.tsx`** 다. 시험을 쓴 뒤에
  **마크업을 직접 읽어라** — 지난 세 바퀴에 고친 여덟 개가 전부 글자를 읽어서 나왔다.

**그때 적어 둔 후보** (지목이 아니다 · 지금의 지목은 머리 한 줄뿐이다): **72**(화면 4 의 안 그린 세 칸 — ③ `updated_at` 이 제일 싸고 화면 5 도
같은 값을 기다린다 · `ITEM_COLUMNS` 에 한 줄이다) · **67 ①**(zip · SPEC §11 상한이 먼저다).

**결정 → 항목을 고칠 때 아는 것 (71 이 남긴 것):**

- 🔴 **표 둘을 접지 마라.** `RESOLUTION_OUTCOME`(선택 → 충돌 상태)과
  `RESOLUTION_ITEM_OUTCOME`(선택 → 진 쪽 항목 상태)은 같이 안 움직인다.
  둘을 잇는 문은 `itemOutcomeOf()` 하나다 — 라우트에 조립을 다시 만들지 마라.
- ⚠ **`anchor` 가 `items` 가 아니면 바꿀 항목이 없다.** `a_ref` 에서 항목을 추측하면
  엉뚱한 항목을 폐기한다 (`SourceRef` 는 원문까지 가는 사슬이지 항목 이름이 아니다).
- ⚠ **이긴 쪽은 안 건드린다.** 이미 `active` 인 항목을 `review` 로 되돌리면 다음
  발행에서 Pack 밖으로 나간다 — 「A가 맞다」의 뜻과 정반대다.
- ⚠ **근거를 더 붙이는 자리는 `appendSourceRef()` 하나다** (`lib/api/item.ts`).
  자리가 없으면 `undefined` 고, 부르는 쪽이 무엇을 답할지만 정한다. **버리는 갈래는 없다.**
- ⚠ **바뀔 것이 없으면 개정을 쌓지 마라.** 이미 `deprecated` 인 항목에 개정을 쌓으면
  `revision` 만 올라서 남이 들고 있던 낙관적 잠금이 이유 없이 409 가 된다.

**화면 4 를 고칠 때 아는 것:**

- 🔴 **종류별 갈래를 카드에 만들지 마라.** 셋 다 `CONFLICT_KIND_RULES` 가 정한다 —
  `anchor`(`ANCHOR_BODY` 3줄) · `detected`(버튼이냐 답 칸이냐) · `byAi`(배지·머리 숫자).
  카드에서 손댈 곳은 `CONFLICT_SIDES`(A·B 버튼 문구) **한 줄**뿐이다.
- 🔴 **머리의 두 수를 합치지 마라.** `GET /conflicts` 는 씨앗 질문 10장을 같이 낸다 —
  합치면 「AI가 찾은 N건」이 거짓이 된다.
- **결정 버튼은 owner 에게만.** `:resolve` 는 owner, `POST /questions` 는 member 다.
- **모양을 뽑아 읽는 자리는 `scripts/dump-conflict-card.tsx`** 다. 시험을 쓴 뒤에
  **마크업을 직접 읽어라** — 이번 바퀴에 고친 셋도 지난 두 바퀴에 고친 다섯도 전부
  글자를 읽어서 나왔다. (조사·라벨·시제는 시험이 먼저 못 잡는다.)

**앞 바퀴들이 남긴, 아직 유효한 것:**

- 🔴 **개정의 `source_refs` 는 초안의 것이 아니다** (`lib/api/publish.ts` 의
  `withProposalRef()`). 근거 상한은 `SOURCE_REFS_MAX` 다 (`packages/schema` · 20) —
  ⛔ 20 을 손으로 적지 마라.
- 🔴 **씨앗 질문의 정본은 `apps/web/src/lib/api/seed-questions.ts` 표 하나다.**
  ⛔ **`question` 문장을 고치지 마라 — 행에 그대로 저장되고 그 문장이 행과 표를 잇는
  열쇠다.** 고칠 일이 생기면 **줄을 하나 더해라.**
- **화면이 서버에 대해 아는 것은 `lib/web/queries.ts` 가 전부다.** 새 엔드포인트를
  화면 안에서 `apiJson('/…')` 로 조립하지 마라.
- **`usePolling(load, deps, again)`** — `again` 이 `null` 을 내면 멈춘다. 실패하면
  더 두드리지 않는다 (사람이 `reload()` 로 다시 시작한다).
- 🔴 **job 한 장을 그리는 자리는 `components/job-progress.tsx` 하나다.** 화면 4 가
  이번에 그 **둘째 사용자**가 됐다 (`conflict` job) — `feature ===` 갈래 없이 됐다.
- ⚠ **프로젝트를 만드는 라우트가 행 11개를 만든다.** 개수를 세는 시험에
  `SEED_QUESTIONS.length` 를 더해라.
- ⚠ **`packages/schema` 를 고치면 플러그인 번들이 갈린다.** `pnpm --filter
  @contextops/plugin build` 를 돌려야 `test/bundle.test.ts` 가 초록이다
  (이번 바퀴에 `byAi` 를 더해서 실제로 돌렸다).

✅ **P1 첫 행(DB·Supabase)은 닫혔다** (`389c7f2` PGlite · `adac632` Supabase 실제 적용 · 71바퀴). `pnpm --filter web db:status` 가 배포 DB 의 표·인덱스·남은 마이그레이션을 **읽기만 하고** 센다 · `db:migrate` 가 적용한다.
⚠ **Anthropic API 키도 사람이 준다.**

**값싼 것들 (아무 바퀴에서나)**: FINDINGS **21·22·23·17·32·44·57·61·63** 은
문서·한 줄짜리다. **14**(`.ps1` 두 개가 LF)도 그렇다. **55**(공통 프롬프트)는 §7.3 전이 제일 싸다.
🔴 **30 과 46 은 한 묶음이다** — 둘 다 템플릿 `head` 한 줄이고 둘 다 golden 을 깬다.
🔴 **50 은 여전히 값싸고 더 급해졌다** — `callClaude()` 를 부르는 제품 파일이 둘이고
그 게이트는 예산 가드를 건너뛰는 새 파일을 못 잡는다.

⚠ FINDINGS **24·25·29·33·35·56·59·63** 은 **P3 둘째 행**이, **36** 은
**P4 화면 9** 가, **53** 은 **API 키가 생긴 뒤**가, **69** 는 **「Pack zip 을 내려받는
길을 만드나」**가 주인이다. **26** 은 절반(구조화 job)이 닫혔고 zip 만 남았다
(**67 ①** 과 같은 자리다). ✅ **31·65 는 닫혔다** (`c57b3fb`·`5fe0068`).

## 눈 판정 대기

🟡 **데모 화면 3 을 375px 로 못 봤다** (98바퀴 · `2604b9f` · FINDINGS 137). 본 것은 1440×900 둘이다
(`docs/evidence/2026-09-07-demo-no-phantom-job/` · 진짜 `demo:db` + `next dev` + 헤드리스 Chrome).
못 본 것 둘: ① **375px 모바일** — 「구조화 진행」 칸이 빈 상태로 설 때 왼쪽 붙여넣기 칸 아래에서 어떻게 앉나
(94바퀴부터 밀린 것과 같은 자리 — 위 항목들과 **한 스크립트로 한 번에**) ② **키가 있는 배포에서의 모양** —
씨앗이 지우는 것은 *끝나지 않은* 행뿐이라, 러너가 진짜로 도는 Vercel 에서는 `succeeded` 카드가 남을 수 있다.
그게 보기 좋은지는 배포 뒤에 본다 (156 과 같은 자리).

🟡 **빈 상태 셋을 브라우저로 못 봤다** (96바퀴 · `e3e48fe` · FINDINGS 133). 본 것은 화면 7개다
(`docs/evidence/2026-09-07-empty-next-step/` · 진짜 `next dev` + 씨앗 DB + **빈 프로젝트** `paylab/blank`).
못 본 것 셋: ① **정리(review)의 빈 상태** — 새 프로젝트에도 씨앗 질문 10장이 떠서 `cards.length === 0` 이 안 됐다
(질문을 다 답하거나 씨앗 없이 만든 프로젝트가 필요하다) ② **Pack 파일 0개**(`pack.files`) — 발행이 없으면 그 화면을 못 연다
③ **375px 모바일** — 1440×900 만 찍었다. 빈 상태의 버튼이 좁은 화면에서 문장과 어떻게 앉나
(94바퀴부터 밀린 것과 같은 자리 — 아래 팔레트 항목과 **한 스크립트로 한 번에**).

🟡 **화면 6 목록 위의 상태 거르개 칩 여섯을 브라우저로 안 봤다** (91바퀴 · `25b9bad` · FINDINGS 112). 글자 모양은 덤프가 잰다(`docs/evidence/2026-09-07-proposal-filter/filter.txt` — 「전체」+5종 · 눌린 것 1개 · 걸러서 빈 문장). 못 본 것: 칩 여섯이 `row wrap` 으로 **몇 줄이 되나**(「승인됨 · 발행 대기」가 제일 길다) · 375px 에서 둘째 줄이 표 머리와 붙어 보이지 않나 · `aria-pressed` 가 눌린 칩을 **눈으로도** 다르게 만드나(`btn` 의 pressed 모양을 안 봤다 — 색만으로 구분하면 실패다). `demo:db` + `next dev` → `/demo` → proposals 탭에서 칩을 눌러 목록이 갈리면 끝 — 아래 화면 6 상세 항목과 같은 스크립트로 한 번에.

🟡 **화면 6 상세의 「승인한 사람 · 이름 · 날짜」 줄을 브라우저로 안 봤다** (90바퀴 · `0d60992`·`0b259ac` · FINDINGS 116). 글자 모양은 덤프가 잰다(`docs/evidence/2026-09-07-decided-by/proposals.txt` 상세 머리 ③~⑰ — 승인·거절·올림·못 찾음·`draft`). 못 본 것: `label` + `ink` + `meta mono` 세 칸이 「관련 마일스톤」 줄 바로 아래에서 어떻게 앉나 · 375px 에서 `row wrap` 이 날짜를 둘째 줄로 미나 · 거절된 제안에서 그 줄과 「결정 사유」 문단의 간격이 붙어 보이지 않나. `demo:db` + `next dev` → `/demo` → proposals 탭 → 제안 하나를 열면 끝 — 아래 화면 9·5·8 항목과 같은 스크립트로 한 번에.

🟡 **화면 9 요약의 「공식 v1.2.0 기준」 칸을 브라우저로 안 봤다** (89바퀴 · `eaaaf29` · FINDINGS 118). 글자 모양은 덤프가 잰다(`docs/evidence/2026-09-07-sync-official/sync.txt` 요약 ①~④ — 공식 있음 · 없음 · 못 읽음). 못 본 것: `mono ink` 한 칸이 `기기 13` 라벨과 같은 줄에서 어떻게 앉나 · 375px 에서 `row wrap` 이 그 칸을 첫 줄에 두나 · 버전 호출이 늦을 때 칸이 나중에 끼어들며 줄이 밀리나. `demo:db` + `next dev` → `/demo` → sync 탭에서 요약 맨 앞에 `공식 v…` 가 보이면 끝.

🟡 **화면 5·8 에 늘어난 항목이 서는 모습을 브라우저로 안 봤다** (88바퀴 · `70c3a73` · FINDINGS 119). 관통이 잰 것은 Pack 본문(`docs/evidence/2026-09-07-demo-items/`)과 라우트 응답(demo-guest 시험 · 로드맵 행에 PL-M1 `due`)까지다. 못 본 것: `demo:db` + `next dev` → `/demo` 화면 5 에 **27개**가 서고 「열린 질문」 배지 넷 · `conf:low` chip 이 어떻게 그려지나 · 화면 8 에 PL-M2(보고 2 · 기준 1/3)·PL-M3(보고 0) 행이 PL-M1 과 같은 모양인가 · 375px 에서 `deps: PL-M1` 줄이 넘치지 않나. 위 화면 8 `due` 항목과 같은 스크립트로 한 번에.

🟡 **화면 3(`/import`)에서 Gemini 구조화 job 을 브라우저로 본 적이 없다** (81·82바퀴 · `3b6ebef`). `pnpm --filter web p3:measure` 는 라우트를 프로세스 안에서 불러 goals.md → `succeeded` · 항목 12 · 질문 4 · 인용 21/21 이 제목과 같은 문장까지 봤다
(`docs/evidence/2026-09-06-p3-gemini/probe.txt` §5). 못 본 것: `demo:db` + `next start`(`.env.local` 의 키를 읽는다) → `/import` 에 goals.md 를 붙여 넣으면 진행 막대가 「1 조각 중 0 → 1」로 가나 · 후보 12장·질문 4장이 화면 4 에 서나 ·
근거 드로어가 잘라 보이는 문장이 제목과 맞나 — 142·143 이 닫혔으니 이제 볼 만하다(83바퀴 2회차는 충돌 3/3 까지 — `docs/evidence/2026-09-07-p3-gemini/probe.txt`). 145·146 뒤에 한 번에.

🟡 **화면 8 의 `due` 칸을 브라우저로 안 봤다** (76바퀴 · `4109f5e` · FINDINGS 111). 글자 모양은 `pnpm --filter web exec tsx scripts/dump-roadmap.tsx` 가 정본이고 13 모양 전부에
`due 2026-09-20` 이 마일스톤 ID 뒤 · chip 앞에 선다 (`docs/evidence/2026-09-06-manifest-due/probe.txt`). 못 본 것: 그 `meta mono` 칸이 375px 에서 chip 과 줄바꿈될 때 어색하지 않은가.
`demo:db` + `next dev` → `/demo` → roadmap 탭에서 PL-M1 행에 `due 2026-04-30` 이 보이면 끝 — 아래 「게스트 데모」 항목(roadmap 미확인)과 같은 스크립트로 한 번에.

🟡 **CLI 의 「어디서 보나」 줄을 진짜 서버에 대고 찍은 적이 없다** (74바퀴 · `4d0ba9a` · FINDINGS 115). 전/후는 fakeCli 의 stdout 이다
(`docs/evidence/2026-09-06-cli-web-hint/probe.txt`) — 코드 길은 같으니 모양은 같다. 확인하려면 `demo:db` + `next dev` 위에서 기기 토큰을 하나 발급해
`.contextops/project.json` 에 꽂고 `node plugin/contextops/bin/contextops-cli.mjs propose` — 마지막 줄이 `→ 웹 http://localhost:3000 에 로그인해 … 「제안」 탭 …` 이고
브라우저의 그 탭에 제목이 같은 제안이 뜨면 끝. 관통이 `propose` 를 안 부르는 것은 그대로다 (부르게 하려면 sync 단계처럼 `scripts/walkthrough-*.ts` 한 파일).

🔴 **Supabase 위에서 화면을 연 적이 없다** (71바퀴 · `adac632`). 마이그레이션만 적용했고 표는 비어 있다. 못 잰 것: ① `.env.local` 그대로 `next dev` 를 띄우고
**실제 Supabase Auth 로 로그인**이 도나 (`SUPABASE_JWT_SECRET` 도 꽂혀 있다 — 지금까지 로그인은 전부 시험용 JWT 였다) ② `CRON_SECRET` 을 `.env.local` 에 넣고(아직 없다 · 아무 난수)
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/v1/cron/demo-reset` 로 데모 테넌트를 심으면 60초 안에 끝나고 시크릿 창의 `/demo` 가 열리나.
둘 다 지나면 P5 둘째 행의 「Supabase 에서 60초 안에 끝나나」도 같이 닫힌다. ⚠ 배포 DB 에 쓰는 일이다 — 리셋은 데모 팀만 지운다지만(`demo-reset.test.ts`) 돌리기 전에 그 시험이 초록인지 본다.

🔴 **게스트 데모 — 고친 뒤 브라우저로 안 봤다** (67바퀴 · FINDINGS 127). → **70바퀴가 부분 봤다** (`docs/evidence/2026-09-06-focus-visible/probe.txt`):
새 프로필로 `/demo` → context 항목 15개 · packs/1.1.0 본문 · 5xx 0 · 「줄을 섰다」 0. **남은 것은 proposals · roadmap · sync** — 같은 폴더의
`focus-cdp.mjs` 둘째 url 만 바꿔 돌리면 된다 (`node focus-cdp.mjs <out> http://127.0.0.1:3000/demo 0 '.nav-link[aria-current="page"]' <url2> <selector2> 1`).
셋 다 지나면 GATE 3 이고 PLAN P4 둘째 행을 `- [x]` 로. 아래는 67 의 원문이다. API 는 잰다(`docs/evidence/2026-09-06-db-pool/probe.txt`:
순차·동시·화면 fan-out 전부 200). 못 잰 것은 **사람이 시크릿 창에서** 본다 (`pnpm --filter web demo:db` → `next dev` 에
`DATABASE_URL=…55432/postgres?max=1` · `SUPABASE_JWT_SECRET=contextops-test-jwt-secret` → `http://localhost:3000/demo`):
- Context 가 「서버에서 처리하지 못했습니다」 대신 항목 15개를 그리나 · Roadmap 이 `aria-busy="true"` 에서 내려오나
- 화면 사이를 오가며(context → packs → proposals → sync) 30초 멈춤이 한 번도 없나 — `demo:db` 터미널에 「둘째 DB 소켓이 줄을
  섰다」가 안 찍히나 (찍히면 풀이 둘이다 — 그 자리에서 고장이다)

🔴 **데모 리셋 — 배포에서 돌린 적이 없다** (63바퀴 · 🙋 Vercel 연결 뒤). PGlite 위에서는 읽었다
(`docs/evidence/2026-09-06-demo-reset/reset.txt`). 못 잰 것 셋: `/var/task` 에서 `fixturesRoot()`
가 `fixtures/` 를 찾나(못 찾으면 500 — Vercel Functions 로그의 `"kind":"error"` 줄에 던진 문구와 stack 「at …」 3줄이
남는다 · 68바퀴 FINDINGS 128 · 그 전엔 `Error` 이름뿐이었다) ·
Supabase 에서 60초 안에 끝나나 · Cron 로그에 200 이 찍히나. 첫 리셋 뒤 시크릿 창에서 `/demo`.

🔴 **화면 1 의 터미널 재생 — 브라우저에서 움직이는 것을 본 적이 없다** (62바퀴). 덤프는 읽었다
(`docs/evidence/2026-09-06-replay/landing.txt` — 17줄 순서 · 패널 1/3). 못 잰 것은 **사람이
브라우저에서** 본다 (`pnpm --filter web demo:db` → `http://localhost:3000/` → 스크롤):
- **타이핑이 실제로 움직이나** — 마운트 뒤 0.8초 비어 있다가 훅 세 줄 → `> /contextops:sync` 가
  글자씩 → 0.6초 뒤 적용 줄들. 명령 줄 끝의 커서(`accent-ink` 막대)가 깜빡이나.
- **보고 줄이 드러나는 순간 오른쪽 첫 기준이 ○ → ✓ 로, 막대가 0 → 33% 로 같이 바뀌나.**
- **재생 전 빈 카드(`min-height: 26em`)가 어색하지 않나** — 어색하면 첫 줄 앞(`lead_ms`)을 줄여라.
- **390px 에서 한 열로 접히나** · 긴 progress 명령이 `pre-wrap` 으로 접혀 본문이 안 밀리나.
- ~~`prefers-reduced-motion` 을 켜면 전부 드러난 채로 서 있나~~ → **97바퀴가 봤다** (FINDINGS 134 ·
  `docs/evidence/2026-09-07-reduced-motion/04-reduce-terminal.png`): 6초 시점에 **17/17 줄이 다 선 채 · 커서 0 ·
  Roadmap 「근거 1 / 3」**. ⚠ CDP 에뮬레이션이고 **진짜 OS 설정으로는 아직 안 켜 봤다** ·
  화면에 실제로 뜬 스켈레톤도 못 잡았다(랜딩에 `.skeleton` 이 없어 같은 스타일시트 아래 하나 붙여 쟀다) ·
  **375px 도 안 봤다**(1440×900 만).

🔴 **화면 7 의 [Pack 다운로드 (.zip)] — 브라우저에서 눌러 본 적이 없다** (60바퀴). zip 자체는
독립 도구로 열었다 (`docs/evidence/2026-09-06-zip/zip.txt`). 못 잰 것: 누르면 저장 대화상자에
`<slug>-v<semver>.zip` 이름이 서는가(`content-disposition` 을 브라우저가 읽는가) ·
「받는 중…」 동안 버튼이 비활성인가 · 실패 문구가 버튼 옆에 서는가 · 「이 Pack을 받은 기기
N / M」이 데모(v1.1.0 · 12대)에서 **9 / 12** 로 서는가 (`pnpm --filter web demo:db` →
`/t/demo/p/paylab-api/packs/1.1.0`). 게스트 토큰도 GET 이라 받을 수 있어야 한다.

🔴 **화면 1 랜딩 — 브라우저로 본 적이 없다** (59바퀴 · 랜딩 v1). 덤프는 읽었다
(`docs/evidence/2026-09-06-landing/landing.txt` — 문장 순서 · accent 1 · 죽은 링크 0).
못 잰 것 셋은 **사람이 시크릿 창에서** 본다 (`pnpm --filter web demo:db` →
`http://localhost:3000/` — 이게 GATE 3 의 첫 걸음이기도 하다):
- **스크롤 없이 A·B·C 가 보이나** — 1440px 에서 헤드라인(좌 3fr)·Before/After 두 카드(우 2fr)·
  [샘플 팀으로 둘러보기] 가 첫 화면 안인가. After 카드가 길어 접히면 `--fs-hero`(44px) 를
  줄이지 말고 카드의 근거 줄을 두 줄로 접어라.
- **390px 에서 한 열로 접히나** (`landing.module.css` 의 `@media (max-width: 900px)`) —
  설치 블록의 긴 명령이 `scroll-x` 안에서 가로 스크롤인가, 본문이 밀리는가.
- **[샘플 팀으로 둘러보기] → `/demo` → `/t/demo/p/paylab-api/context`** 가 3분 안에 끝까지 가나.
  가면 PLAN P4 둘째 행을 `- [x]` 로 바꿔라 (GATE 3).

🔴 **화면 3 의 후보 고르기 카드를 근거까지 넣어 다시 읽었다** (36바퀴 ·
`c6905df`+`b1d2190`). 잰 것: `docs/evidence/2026-09-04-candidate-evidence/card.txt` —
일곱 상태. 읽고 판정한 것:
- ✅ 다섯 줄이 전부 **제목 → 본문 한 줄 → 근거** 순서로 선다 ·
  근거 없는 줄은 「⚠ 근거 없음」이라고 말한다 · 여러 줄짜리 본문이 `…` 로 끝난다 ·
  근거 넷이 서로 다른 §과 글자 범위를 낸다.
- 🔴 **본문이 비활성 색이었다 → 그 자리에서 고쳤다**(`b1d2190`) · 나머지 다섯 자리는
  **FINDINGS 88**.
- 🔴 **근거가 어느 문서인지 안 말한다 → FINDINGS 87.**
못 잰 것 — **브라우저가 없어서 레이아웃은 못 봤다** (35바퀴의 세 가지가 그대로 남았고
근거 줄이 붙어서 **더 급해졌다**):
- **한 줄이 세 줄이 됐다.** 후보 5개면 15줄이고, §7.1 은 chunk 하나에 40개까지 낼 수
  있다 (`AI_MAX_ITEMS_PER_CHUNK`). **120줄짜리 카드**가 어떻게 보이는지 본 적이 없다 —
  접기·스크롤·「전부/해제」 토글 중 무엇이 필요한지는 캡처가 있어야 안다.
- **본문 120자가 한 줄에 안 들어간다.** 카드 폭에서 몇 줄로 접히는지 모른다.
  `CANDIDATE_BODY_CHARS` 는 **글자 수**만 자르고 줄 수는 안 잡는다.
- **체크박스가 `DESIGN_BRIEF` §3 토큰을 따르는지** — `globals.css` 에
  `input[type=checkbox]` 규칙이 여전히 **없다.**

---

🔴 **화면 3 의 후보 고르기 카드는 글자로 읽었고, 하나를 찾아 적었다** (35바퀴 · `c57b3fb`).
잰 것: `docs/evidence/2026-09-04-structure-candidates/card.txt` — 일곱 상태
(기본·부분선택·0개·저장중·실패·만든뒤·빈상태). 읽고 판정한 것:
- ✅ 고른 수가 버튼에 따라온다(5 → 3) · 0개면 버튼이 `disabled` 다 ·
  만든 뒤 문구가 **「승인」이 아니라 「초안」**이라고 말한다 · 타입을 아이콘만으로
  말하지 않는다(이름 병기) · 빈 상태에 다음 할 일이 있다.
- 🔴 **근거가 없다 → FINDINGS 86** (위에서 적었다).
못 잰 것 — **브라우저가 없어서 레이아웃은 못 봤다**:
- **후보가 12개일 때 카드가 얼마나 길어지는지.** §7.1 은 chunk 하나에 최대 40개까지
  낼 수 있다 (`AI_MAX_ITEMS_PER_CHUNK`). 40줄이 한 카드에 서면 그 화면은 못 쓴다 —
  스크롤·접기·「전부/해제」 토글 중 무엇이 필요한지는 **캡처가 있어야 안다.**
- **체크박스가 `DESIGN_BRIEF` §3 토큰을 따르는지.** `globals.css` 에 `input[type=checkbox]`
  규칙이 **없다** — 브라우저 기본 모양이 다크 바탕에서 어떻게 보이는지 본 적이 없다.
- **버튼이 accent 가 아닌 것이 맞는지.** 이 화면의 accent 는 [구조화하기] 이고
  후보 만들기는 `btn btn-sm` 이다 (화면당 accent 하나 · DESIGN_BRIEF §2). 의도한
  것이지만 사람이 그 버튼을 찾는지는 캡처가 있어야 안다.

---

🔴 **화면 5 드로어의 「상태 바꾸기」는 글자로만 읽었다** (32바퀴 · `1aebc22`).
잰 것: `docs/evidence/2026-09-04-item-status/status-actions.txt` — 네 상태 · 저장 중 ·
실패. 그걸 읽어서 하나를 고쳤다 (「폐기 | 폐기 · …」). 못 잰 것:
- **드로어가 또 길어졌다** — 칩 줄 · 본문 · 근거 · 타입별 값(`<pre>`) 밑에 버튼 줄이
  하나 더 붙었다. 초안 카드는 버튼이 **셋**이고 각각 캡션이 있다. 드로어 폭(360px)에서
  셋이 한 줄에 서는지, `col-tight` 셋이 어떻게 접히는지 **본 적이 없다.**
- **accent 가 여전히 [발행하기] 하나인지** — 상태 버튼은 전부 `btn btn-sm` 이라
  accent 가 아니지만, 셋이 나란히 서면 눈이 그리로 가는지는 봐야 안다.
  ⚠ [승인] 이 이 화면에서 제일 중요한 액션인데 **accent 가 아니다.** 의도한 것이지만
  (화면당 accent 하나 · DESIGN_BRIEF §2) 사람이 그것을 찾는지는 캡처가 있어야 안다.
- **캡션(`meta`)이 버튼 글씨보다 작게 읽히는지** · 「적용 중 · 다음 Pack 에 나갑니다」가
  한 줄에 서는지 두 줄로 접히는지.
- **member 가 볼 때** 「상태를 바꾸는 것은 팀 owner 만 할 수 있습니다.」 한 줄만 남는데,
  그 자리가 비어 보이지 않는지.

---

🔴 **문서 0건으로 만든 v1.0.0 은 글자로 읽었고, 읽을 만했다** (32바퀴 · `1aebc22`).
잰 것: `docs/evidence/2026-09-04-questions-only/pack.txt` — Mission 1 · Goals 2 ·
Policies 4 · Constraints 3 이고 줄마다 `src:manual:<질문 문장>` 이 붙는다 (P7).
읽고 남긴 판단 둘:
- ✅ **팀 규칙으로 배포할 만하다.** 문장이 사람이 쓴 그대로고 지어낸 것이 없다.
- ⚠ **Goals 두 줄의 순서가 뒤집혀 보인다** — 「완료 판정 기준」이 「이번 분기 목표」보다
  **먼저** 나온다 (정렬이 항목 id 순이라 `goal_done` < `goal_quarter`). 씨앗 표의
  순서(질문 순서)가 Pack 에서 사라진다. 사람은 목표 → 판정 기준으로 읽기를 기대한다.
  🔴 **아직 FINDINGS 에 안 적었다** — 정렬 규칙(`compiler/src/sort.ts`)을 건드리는 일이라
  golden 셋과 P4 를 흔든다. 다음에 `sort.ts` 를 여는 바퀴가 같이 판단할 자리다.

---

🔴 **화면 5(Context 표)의 「갱신」 칸은 아무도 본 적이 없다** (31바퀴 · `a45cef0`).
잰 것: typecheck 와 시험뿐이다. 화면 4 는 글자로 읽었다
(`docs/evidence/2026-09-04-screen4-updated/item-updated-at.txt`). 못 잰 것:
- **표에 칸이 하나 더 늘었다** — 여덟 칸(타입·제목·scope·상태·confidence·근거·갱신·rev)이
  좁은 화면에서 가로로 미는지. `overflow-x:auto` 안에 있는지 **눈으로 확인한 적이 없다.**
- **`2026-07-12` 가 `mono meta` 로 나가는데** 옆 칸(`근거`·`rev`)도 mono 라 세 칸이
  한 덩어리로 읽히는지.
- **화면 4 의 「갱신 2026-07-12」이 칩 줄 끝에 붙는다** — 칩 셋(`item_…` 태그·상태·
  confidence) 뒤라 좁은 화면에서 혼자 다음 줄로 넘어가면 어느 항목의 날짜인지 흐려진다.

---

🔴 **중복 카드의 새 문구도 글자로만 읽었다** (30바퀴 · `a39419c`).
잰 것: `docs/evidence/2026-09-04-screen4-merge/duplicate-card-wording.txt` — 탐지 4종의
버튼 줄에 「합침」류 낱말이 하나도 없다. 못 잰 것:
- **「A만 남김」과 「B 항목 → 「폐기」」가 같은 말을 두 번 하는 것처럼 읽히는지.**
  글자로는 짧은데 카드 안에서 두 줄이 붙으면 다르게 보일 수 있다.
- **「A만 남김」이 버튼으로서 짧은 편이라** 네 버튼의 폭이 들쭉날쭉해 보이는지
  (「문서가 맞음 (코드 수정 필요)」와 한 줄에 서면 차이가 크다).

---

🔴 **화면 4 의 「결과 줄」은 글자로만 읽었다** (29바퀴 · `094102b`).
잰 것: `docs/evidence/2026-09-04-screen4-effect/conflict-card-effect.txt` 의 열다섯
모양 — 탐지 4종 전부 버튼마다 결과가 붙고, 질문 카드에는 안 붙는다. 그걸 읽어서
**새 고장 하나**를 찾았다 (FINDINGS 76). 못 잰 것:
- **카드가 또 길어졌다** — 버튼 넷 밑에 캡션이 하나씩 붙었다. 스무 장이 쌓였을 때
  스크롤이 어떤지 여전히 본 적이 없다.
- **캡션(`meta`)이 버튼 글씨보다 작게 읽히는지** · 버튼과 캡션이 한 덩어리로 보이는지
  (좁은 화면에서 `col-tight` 넷이 어떻게 접히는지).
- **마지막 경고 줄(`ink-warn`)이 카드 안에서 너무 세지 않은지** — 이 화면에는 accent 가
  없는데 경고 색이 그 자리를 대신 차지하면 화면이 사람을 밀게 된다.

---

🔴 **화면 4 도 캡처로 본 적이 없다** (27바퀴 · `706e334`). 잰 것은
`docs/evidence/2026-09-04-screen4/conflict-card-states.txt` 의 **열다섯 모양**이고,
그걸 읽어서 셋을 고쳤다 (조사 · 한쪽뿐인 카드의 「A」 라벨 · 시제). 못 잰 것:
- **카드가 세로로 길다** — 항목 두 장 + 근거 + 버튼 넷이 한 카드다. 스무 장이 쌓였을 때
  스크롤이 어떤지 본 적이 없다 (DESIGN_BRIEF 는 「카드 10장」이라고 적는다).
- **A·B 두 칸이 좁은 화면에서 어떻게 접히나** — `.row.items-start.wrap` 이라 접히기는 한다.
- **거르개 칩 안에 칩이 들어 있다** (`<button>` 안 `ConflictKindChip`). 버튼 테두리와
  칩 테두리가 두 겹으로 보이지 않는지 **눈으로 봐야 한다.**
- **accent 가 빈 상태의 [Context로 이동] 하나뿐인 것이 맞는지** — 카드가 있을 때 이
  화면에는 accent 가 **없다.** 의도한 것이지만(선택 넷은 같은 무게여야 한다) 화면이
  「할 일이 없어 보이는지」는 봐야 안다.
- ⚠ **`GET /conflicts` 는 §7.2 가 돌아야 채워진다 — 키가 없어 이 화면을 진짜 데이터로
  본 적이 없다.** 지금 실제로 뜨는 것은 **씨앗 질문 10장뿐**이다.

---

🔴 **화면 3 을 캡처로 본 적이 없다 — 이 환경에 브라우저가 없다.**
`node_modules` 에 playwright·puppeteer 가 없고, 관통의 `shots` 층은 `apps/web/e2e` 가
없어서 여전히 SKIP 이다. 그래서 이번 바퀴의 눈 판정은 **두 층으로 갈렸다**:

**① 잰 것 (초록)** — 마크업을 글자로 읽었다.
`docs/evidence/2026-09-04-screen3/job-panel-states.txt` 에 여섯 모양 + `conflict` job
하나를 그려 놓았고, 그걸 읽어서 **둘을 고쳤다** (같은 수를 두 번 그림 · 가지도 않은
걸음을 「마지막 걸음」이라고 부름). 그 판정은 이제 `test/web-job-progress.test.ts` 가
붙잡는다.

**② 못 잰 것 (🔴 사람이 눈으로 봐야 한다)** — 캡처가 있어야 하는 것들:

- **간격·색·글꼴** — 토큰만 썼는지는 `design-tokens.test.ts` 가 기계로 막지만,
  **그 토큰들이 나란히 놓였을 때 읽히는지**는 못 잰다. 특히 두 칸(붙여넣기 폼 `grow` /
  진행 칸 `drawer` 360px)이 좁은 화면에서 어떻게 접히는지 본 적이 없다
  (`.row.wrap` 이라 접히기는 한다)
- **accent 가 하나인지** — [구조화하기] 하나만 `btn-primary` 로 뒀는데, 진행 막대의
  `--accent-ink` 가 그 옆에서 둘째 accent 로 보이지 않는지 눈으로 봐야 한다
- **`design/*.dc.html` 시안과 나란히 놓고 대조** — 한 번도 못 했다 (브라우저가 없다)
- **회전(`skeleton`)이 막대로 바뀌는 순간** — polling 이 2초마다 갈아 끼울 때
  깜빡이지 않는지. `usePolling` 이 손에 든 값을 안 버리게 만들었지만 **본 적은 없다**
- **긴 문서를 붙여넣었을 때 textarea 와 「N자」 카운터** — 40만 자 상한 근처에서 어떤지

**어떻게 보나** (다음에 브라우저가 생기면 그대로):
`pnpm --filter web dev:db` → 찍히는 `DATABASE_URL`·`SUPABASE_JWT_SECRET` 으로 `next dev` →
`/auth/callback?next=…#access_token=<토큰>&expires_in=3600` 으로 세션을 심고 `…/import`.
⚠ **키가 없으면 붙여넣기 뒤의 job 은 `failed`(`INTERNAL`)로 끝난다** — 그것도 볼 것이다
(실패 화면이 「몇 걸음에서 멈췄나」를 말하는지 보는 자리다).
⚠ `.ci/shots/` 는 관통마다 통째로 지워진다 — 근거로 인용할 거면 **적기 전에 밖으로 복사**해라.

**아직 눈으로 못 본 것** (화면 밖):

- 🔴 **Skill 셋이 Claude Code 안에서 실제로 도는 것** — `/contextops:init` 를 사람이
  한 번 눌러 봐야 한다 (GATE 2 의 나머지 절반). 무인 세션은 SKILL.md 의 **명령줄이
  실재하는지**까지만 잰다 (`test/skills.test.ts`)
- **Stop 훅이 진짜 Claude Code 세션에서 stdin JSON 을 받는 모양** — 시험은
  `{session_id}` 를 우리가 넣어 준다. 실제 payload 의 칸 이름이 다르면 훅은
  **조용히 「세션 id 를 모른다」로 물러선다** (그게 안전한 기본값이라 증상이 없다)
- 화면 5 의 **발행 모달** · **상세 드로어** — 헤드리스에서 버튼을 못 누른다
- 화면 7 의 **제외된 항목 접이식** — 이번 씨앗은 `excluded` 가 비어 있다
- **`setup` 의 물어보기 흐름** — TTY 가 있어야 도는 갈래다

⚠ 전부 **코드에는 있고 시험은 초록**이다. 그래서 더 위험하다 —
「컴파일 초록은 최소선이다」(loop/PROMPT.md ①③).

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| ~~Supabase 프로젝트 생성 · `DATABASE_URL` · `SUPABASE_JWT_SECRET`~~ | ✅ **2026-09-06 사람이 꽂았다** (`.env.local` · Session pooler · IPv4) | 71바퀴가 마이그레이션을 실제로 적용했다 (`adac632` · 표 18 · 인덱스 8). **표는 비어 있다** — 데모 테넌트는 Cron 리셋 문(`/api/v1/cron/demo-reset`)이 심는다. 같은 값을 Vercel 에도 꽂는 것은 아래 행 |
| ~~Anthropic API 키~~ → **Gemini 키** | ✅ **2026-09-06 사람이 꽂았다** (`GEMINI_API_KEY`·`GEMINI_MODEL=gemini-3.5-flash` · 79바퀴가 `836a0a9` 로 갈아끼웠다 · 진짜 호출 통과) | 🙋 남은 것 하나: **`gemini-3.5-flash`·`3.6-flash` 의 정가**를 `apps/web/src/lib/ai/features.ts` `AI_MODELS` 에 — 지금은 2.5 flash 공개가(0.30/2.50 USD/M)가 임시로 있다. 틀리면 하루 예산(`AI_DAILY_BUDGET_USD=3`)의 셈이 틀린다. 같은 값을 Vercel 에도 |
| **참가 접수**(원티드 · 9/18 23:59:59 마감 · 제출과 별개) + 제출 폼의 칸·글자 수·썸네일 규격 캡처 | 원티드 계정 | **🔴 오늘.** 접수 없이는 제출 화면이 안 열린다 (INBOX B1) |
| ~~`git push`~~ | ✅ **2026-09-10** — origin/main == 로컬 · GitHub Actions 초록 | — |
| ~~Supabase Auth 걸음 넷 + Data API 끄기~~ | ✅ **2026-09-10 사람이 했다** — 공개 엔드포인트로 재확인: 공급자 github·email ON · JWKS ES256 · anon REST 503 · 세션 만료 최대치 | — |
| ~~Vercel 프로젝트 연결 · env · 첫 배포 · 첫 리셋 · verify:prod~~ | ✅ **2026-09-10** — <https://contextops-rosy.vercel.app> · 마이그레이션 0009 까지(Claude) · 첫 리셋 7.6초 · verify:prod 44/0 · 근거 `docs/evidence/2026-09-10-production/` | 🙋 남은 것: 로그인 실측(⑥-b) · GitHub 변수 `PROD_ORIGIN` |
| Gemini **Tier 1** 결정(AI Studio 빌링 연결 → 키 교체 → Cloud Billing 알림 $20) — 무료 티어는 Google 약관상 입력이 학습에 쓰일 수 있고 심사 트래픽에서 429 | 결제 계정 | 9/10 계정 작업 묶음에 같이 — 결정이 `/privacy`·KNOWN_LIMITATIONS 의 문장을 정한다 (INBOX H4) |
| 실데이터 픽스처(`brain`) 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만 · SPEC §14 절삭 6번) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** 값은 `.env.local` 에만 산다 (P1).
🔴 `SUPABASE_JWT_SECRET` 이 없으면 **아무도 로그인하지 못한다** — 조용히 통과시키지 않는 것이
의도다 (`src/lib/api/session.ts`).

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

- 🔴 **FINDINGS 를 ✅ 로 바꾸는 문서 커밋은 `KNOWN_LIMITATIONS.md` 의 그 번호 줄을 같이 지워야 한다 — 그리고 `pnpm docs:check` 를 돌려라** (79바퀴 · 138). 78 의 문서 커밋이 121 을 닫으며 그 줄을 남겨
  다음 바퀴의 관통이 api 단계에서 빨갛게 시작했다. 이제 `docs` 층(`tools/status-shape.mjs` ②-B)이 잡는다 — test 층(85초)까지 안 돌려도 된다.
- **문자열 게이트를 확인할 probe 파일에 게이트가 찾는 낱말을 주석으로도 적지 마라** (79바퀴). `withBudget 없이` 라고 적은 주석이 P3 검사(`-notmatch "withBudget"`)를 통과시켰다. 확인이 「통과」로 끝나면 먼저 probe 를 의심해라.
- **Gemini `responseJsonSchema` 는 `$ref`·`const` 를 받되 `const` 는 안 지키고 `minItems`·`maxItems` 는 이유 없이 400 이다** (79바퀴 · 실측). 새 키워드가 거절되면 `client.ts` 의 `GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS` 한 줄 — 스키마를 고치지 마라. `pnpm --filter web ai:smoke` 가 진짜 호출 한 번의 문이다(돈이 든다 · CI 밖).
- **「부하에서도 초록」을 재야 하는데 부하가 사라졌으면 합성 부하로 잰다** (73바퀴). `Start-Process node -ArgumentList '-e','"while(true){}"' -PassThru` 를
  N 개(16 논리코어에 12개 ≈ 62% · 15개 = 100%) 띄우고 `try { … } finally { Stop-Process }` 로 반드시 거둔다 — 끝난 뒤 `Get-Process node | ? CommandLine -like '*while(true)*'`
  로 0 을 확인해라. 부하는 `(Get-CimInstance Win32_Processor).LoadPercentage` 로 읽는다. ⚠ Bash 도구에서 `cmd.exe /c "pnpm test >> file 2>&1"` 은 **pnpm 을 안 돌리고
  cmd 배너만 찍고 exit 0** 이다(따옴표가 접힌다) — Bash 에서는 그냥 `pnpm test >> file 2>&1`, PowerShell 에서는 `cmd.exe /c` 를 써라.
- 🔴 **CI 가 빨개지면 「무엇이 빨간가」보다 「무엇이 바뀌었나」를 먼저 봐라 — 코드 변화 0 인데 빨가면 기계다.** 72바퀴: 같은 트리가 16:46 GREEN,
  17:06·17:10 RED. 차이는 16:50:55 에 뜬 사람의 게임(CPU 74~80%)뿐이었고, 빨간 10 파일은 전부 `freshDb()` 첫 훅의 10초 상한이었다.
  잰 방법: `Get-Process` 3초 델타로 누가 CPU 를 먹는지 · 게임 프로세스의 `StartTime` · 빨간 파일만 `npx vitest run <files>` 로 따로(10/10 초록).
  ⚠ 사람이 쓰는 프로세스는 죽이지 마라. 게이트 쪽을 고친다 (FINDINGS 136) — 그리고 `loop/PROMPT.md` ③ 「한 번에 하나」처럼 **CI 는 한 번 더
  돌려 보고** 같은 자리에서 같은 모양이면 그때 기계로 본다.
- **탭 포커스·클릭·계산된 스타일은 `--screenshot` 이 아니라 CDP 로 잰다.** headless Chrome 을 `--remote-debugging-port` 로 띄우고 Node 22 의 내장
  WebSocket 으로 `Input.dispatchKeyEvent`(Tab) · `Runtime.evaluate` · `Page.captureScreenshot` — 의존성 0 (`docs/evidence/2026-09-06-focus-visible/focus-cdp.mjs`).
  ⚠ 마우스 대조군으로 **링크**를 누르면 화면이 넘어가 대조군이 없어진다 — 버튼을 눌러라 (70바퀴가 밟았다). `nextjs-portal` 이 탭 순서에 끼는 것은 dev 오버레이다.
- 🔴 **headless Chrome 의 `--window-size=375,…` 는 375 가 아니다.** Windows 의 Chrome 은 창 최소 너비(약 500px)를 강제해서 **~504 뷰포트를
  375 로 자른 그림**이 나온다 — 「모바일에서 넘친다」로 오독하기 딱 좋다 (가운데 정렬 카드가 x=32 에서 시작하면 그 신호다). 좁은 뷰포트는
  **375px iframe 에 넣어** 찍어라 (`docs/evidence/2026-09-06-keep-all/probe.txt` · 미디어 쿼리는 iframe 너비에 반응한다). 단 iframe 안의
  fetch 는 `--virtual-time-budget` 을 안 기다려서 API 를 부르는 화면은 스켈레톤으로 찍힌다 (69바퀴).
- 🔴 **68바퀴는 CI 를 배경으로 띄우고 「알림을 기다리겠다」며 턴을 끝냈다 — 그 턴이 마지막 턴이라 커밋 0.** `loop/PROMPT.md` ⑥ 그대로다.
  69 가 같은 트리에서 앞단 CI 를 돌려 올렸다 (`9319617`). 문서에 자리표시자(`__HASH68__` · `__CI68__`)를 남겨 둔 덕에 채워 넣기만 하면 됐다 —
  그 습관은 지켜라. 그리고 개발 서버를 배경에 띄웠으면 **끝나기 전에** 포트의 PID 를 죽여라 (69 는 `Stop-Process -Id <pid>`).
- 🔴 **Next dev 는 라우트마다 모듈을 새로 평가한다 — 프로세스 단위 자원(DB 풀 · 캐시)을 모듈 변수에 두면 라우트 수만큼 생긴다.**
  `let cached` 가 그랬고 게스트 데모의 모든 화면이 30초 뒤 500 이었다 (FINDINGS 127). 그런 자원은 `globalThis[Symbol.for(…)]` 에
  두고, **시험이 `setDbForTest` 로 우회하는 길이 아니라 진짜 길**(`postgres()` 를 만드는 길)을 하나는 지나게 해라 (`test/db-pool.test.ts`).
- 🔴 **개발용 서버를 배경에서 띄웠다가 멈출 때 pnpm 만 죽고 node 자식이 산다.** 55432·3000 이 잡힌 채로 다음 `demo:db` 가 EADDRINUSE 로
  죽는다. 멈춘 뒤 `Get-NetTCPConnection -State Listen` 으로 포트를 보고 **그 PID 를** 끝내라 (67바퀴).
- 🔴 **「잴 것이 없어서 초록」은 초록이 아니다.** payload 단계의 「env 값이 payload 에 0건」은 픽스처
  `.env.example` 의 값을 찾았는데, 다른 게이트(`fixtures.mjs` ③)가 그 파일에 값을 **금지**한다 — 두 게이트가
  서로를 무효화해 검사가 63바퀴 내내 0개를 재고 OK 를 찍었다 (FINDINGS 124 · 125). **「N 개를 재어 0건」처럼
  잰 수를 detail 에 찍고, 0개면 FAIL 로 만들어라.** 로그에 OK 만 찍히는 검사는 눈으로 절대 못 잡는다.
- 🔴 **PowerShell 도구의 작업 폴더가 바퀴 도중에 옮겨진다 — `-File tools/ci.ps1` 이 「does not exist」로 안 돌았는데 종료 코드는 0 이었다.**
  배경 실행이라 결과 줄만 보면 성공처럼 보인다. CI 는 **절대 경로**(`C:\dev\hackathon\tools\ci.ps1`)로 부르고, 결과는 종료 코드가
  아니라 출력의 `=> GREEN` 줄과 `.ci/result` 의 시각으로 확인해라 (65바퀴).
- 🔴 **여섯 바퀴(58·59·60·61·63·64) CI GREEN 까지 가고 커밋 없이 끝났다.** 64 는 커밋 메시지(`.ci/commit-64.txt`)까지 써 두고
  끝났다 — 65 가 그 메시지 그대로 올렸다. **CI GREEN 이면 STATUS 를 쓰기 전에 커밋해라.** 63 은 STATUS·PLAN·FINDINGS 까지 다 쓴 뒤
  끝났다. 그리고 63 의 함정 메모(「손으로 옮겼다」)는 **옮겨지지 않은 채**였다 — 적은 것과 디스크가 달랐다.
  **적기 전에 `ls` 로 한 번 봐라.** 64 는 CI GREEN 직후 코드·PLAN·FINDINGS 를 첫 커밋으로, STATUS 를 둘째로 했다.
- **`new Date().toISOString().slice(0, 10)` 은 UTC 날짜다.** KST 새벽에 돌린 덤프가 `docs/evidence/`
  에 **어제 날짜** 폴더를 만들었다 (63바퀴 · 64바퀴가 옮겼다). 증거 폴더 이름은
  `toLocaleDateString('sv-SE')` 로 — 다른 덤프 스크립트는 날짜를 손으로 박아서 이 함정이 없다.
- 🔴 **네 바퀴 연속(58·59·60·61) CI GREEN 근처까지 가고 커밋 없이 끝났다.** 61 은 CI 가
  walkthrough 도중에 끊긴 채였다. 62바퀴는 **코드·PLAN·FINDINGS 를 CI GREEN 직후 첫 커밋으로**
  올리고 STATUS 는 둘째 커밋으로 했다 — 이 순서를 지켜라 (loop/PROMPT.md ⑤).
- 🔴 **Bash 도구의 heredoc 이 역슬래시를 한 겹 벗긴다 — 세 번째다.** 이번엔 TS 정규식의
  CR·개행 이스케이프가 진짜 CR·개행이 되어 esbuild 가 「Unterminated regular expression」으로
  죽었다. python heredoc 으로 그 자리를 다시 고치려다 **또** 접혔다(python 이 한 겹 더 벗긴다).
  그리고 heredoc 본문 안의 **작은따옴표**도 도구 쪽 파서에 걸려 「unexpected EOF」로 죽는다.
  **이스케이프나 따옴표가 든 내용은 Edit/Write 도구로 써라** — 긴 python 스크립트도 Write 로
  `.ci/*.py` 에 두고 `python 파일` 로 돌려라. 위에 두 번 적혀 있었는데 또 밟았다.

- 🔴 **두 바퀴 연속(58·59) CI GREEN 까지 가고 커밋 없이 끝났다.** 둘 다 CI 뒤에 STATUS·PLAN·
  FINDINGS 를 길게 쓰다가 바퀴가 끝났다. 다음 바퀴가 주워서 올렸지만 그건 운이다 — 한 번만
  `.ci/` 를 지우는 다른 세션이 끼면 그 작업은 사라진다. **CI 가 GREEN 인 순간 코드·시험·
  PLAN 한 줄만 먼저 커밋하고, STATUS 는 둘째 커밋으로** (loop/PROMPT.md ⑤ 는 이미 그렇게
  적혀 있다 — 지키지 않은 것이 문제다). 60바퀴는 그렇게 했다.
- 🔴 **`next dev` 로 API 를 두드리지 마라.** 렌더 워커가 한 번 죽으면 그 뒤의 모든 라우트가
  **500 을 HTML 로** 낸다 (`Jest worker encountered 2 child process exceptions`).
  JSON 을 기대한 스크립트는 `Unexpected token '<'` 로 죽는다. `pnpm --filter web build` →
  `next start` 로 가라 — 이번 바퀴에 30분을 여기서 썼다.
  ⚠ 그리고 **`next dev` 는 `.next` 를 개발용으로 덮어쓴다.** 그 뒤 `next start` 는
  「production build 가 없다」로 죽는다. 순서는 언제나 **build → start** 다.
- 🔴 **`Get-Content -Raw` 는 PS 5.1 에서 ANSI 로 읽는다** — UTF-8 한글이 깨지고
  `ConvertFrom-Json` 이 「잘못된 배열이 전달되었습니다」로 죽는다. **증상이 원인을 안 가리킨다**
  (이번엔 「hooks.json 의 `_writes` 선언이 없다」로 보였다). JSON 을 읽을 거면
  `[System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)` 를 써라.
- 🔴 **`python - <<'PY'` 안의 `\n` 이 `
`(진짜 개행)으로 접힌다.** 이번에 시험 파일의
  `'# 남의 파일
'` 이 두 줄로 갈라져 TS 가 깨졌다. STATUS 에 이미 있던 함정
  (「heredoc 으로 파일을 쓰면 `\` 가 `\` 로 접힌다」)과 같은 것이다 —
  **파일 편집은 Edit/Write 도구로 해라.** 특히 이스케이프가 든 코드는.
- 🔴 **`Get-Content -Raw` 는 PS 5.1 에서 ANSI 로 읽는다.** UTF-8 한글이 깨지고
  `ConvertFrom-Json` 이 「잘못된 배열이 전달되었습니다」로 죽는다. **증상이 원인을
  하나도 안 가리킨다** — 이번엔 「hooks.json 의 `_writes` 선언이 없다」로 보였다.
  JSON 을 읽을 거면 `[System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)`.
- 🔴 **`python - <<'PY'` 안에서도 역슬래시가 접힌다.** 이번엔 TS 문자열의 개행
  이스케이프가 **진짜 개행**이 되어 시험 파일이 두 줄로 갈라졌다. STATUS 에 이미 있던
  함정(「heredoc 으로 파일을 쓰면 역슬래시가 접힌다」)과 같은 것이다 —
  **이스케이프가 든 코드는 Edit/Write 도구로 써라.** 두 바퀴 연속으로 밟았다.
- 🔴 **서버를 같은 프로세스에서 띄운 채 `execFileSync` 를 부르면 영원히 안 끝난다.**
  동기 호출이 이벤트 루프를 잡아서 서버가 응답을 못 한다 — 자식은 timeout 까지 기다렸다
  죽고, 증상은 **「이유 없이 exit -1, 출력 없음」**이다 (원인이 하나도 안 보인다).
  `execFile` + Promise 로 가라 (`plugin/contextops/scripts/walkthrough-sync.ts`).
- **`execFileSync`·`execFile` 은 실패해도 `stderr` 가 빈 문자열일 수 있다.** 못 띄운
  경우(spawn 실패·timeout)는 `err.message` 가 유일한 단서다. `e.status`(또는 `e.code`)가
  숫자가 아니면 **프로세스가 안 돌았다**는 뜻이니 둘을 구별해서 남겨라.
- 🔴 **파일을 셸 heredoc(`<<'PY'`)으로 쓰면 `\\` 가 `\` 로 접힌다.** 이번에도 밟았다 —
  `walkthrough.ps1` 의 `plugin\contextops\...` 경로를 파이썬 heredoc 으로 고치려다
  `\c` 가 되어 assert 가 터졌다. **파일 편집은 Edit/Write 도구로 해라.**
- **`.ps1` 중 `walkthrough.ps1` 은 LF 다** (FINDINGS 14). 고칠 때 CRLF 로 바꾸지 마라 —
  줄바꿈만 바뀐 커밋이 전체 파일 diff 로 보인다. BOM 은 있어야 한다.
- 🔴 **Windows 는 POSIX 권한 비트를 저장하지 않는다.** `statSync().mode & 0o777` 로만
  0600 을 재면 개발 기계에서 **그 규칙이 검사되지 않고 초록**이다. 「무엇을 요구했나」를
  잴 수 있게 `chmod` 를 주입받아라 (`writeSecretFile`).
- **vite 8 은 oxc 로 변환한다.** `esbuild: { jsx }` 는 경고만 하고 조용히 안 먹는다.
- 🔴 **`node:crypto` 를 재수출하는 index 는 브라우저 번들에 못 들어간다.**
  `package.json` 의 `exports` 에 문을 하나 더 선언해라 (`./tag`).
- 🔴 **CSS 특이도는 소스 순서로 갈린다.** 유틸리티 클래스는 **아래에** 두어라.
- 🔴 **`<a>` 에는 `:disabled` 가 안 먹는다.** 태그를 바꿔라.
- **pglite-socket 은 연결을 한 번에 하나씩 처리한다** — `?max=1` 을 붙여라.
  ⚠ 클라이언트가 죽으면 ECONNRESET 이 씨앗 서버를 통째로 죽인다 (`dev-server.ts` 가 삼킨다).
- **헤드리스 Chrome 은 `--timeout` 보다 `--virtual-time-budget`** 이 낫다.
  ⚠ 리다이렉트하는 페이지에서는 반대다.
- **PowerShell 로 캡처 경로를 줄 때는 절대 경로여야 한다.**
- 🔴 **`snapshot_hash` 는 semver 를 품는다** — 「같은 내용은 두 번 발행 못 한다」를
  막을 방법이 지금 없다 (FINDINGS 27).
- 🔴 **catch-all 구간(`[...path]`)의 params 는 배열이다** — `string | string[]` 로 넓혀라.
- 🔴 **PowerShell 은 `[id]` 를 와일드카드로 읽는다.** 경로는 언제나 `-LiteralPath`.
  **bash 도 글로브로 읽는다** — `git add 'apps/.../[id]/...'` 는 따옴표로 감싸라.
- **파이썬은 Git Bash 의 `/tmp` 를 못 본다.** 저장소 안에 쓰고 지워라.
- **`python - <<'PY'` 안에서 한글을 `print` 하면 죽는다** (`cp949`) — `python -X utf8`.
  ⚠ **쓰기는 이미 끝난 뒤에 죽는다.**
- **워크스페이스 패키지의 의존성은 그 패키지에 적어야 한다** (유령 의존성 금지).
- **유니온 Zod 스키마의 `z.infer` 는 느슨하다** — 정밀 타입은 mapped type 으로 따로 온다.
- **`ItemId` 는 `item_` 뒤에 3자 이상**이다.
- **한 시험 파일 안에서 seed 를 여러 번 부르면 slug 가 부딪힌다.**
- **`tools/ci.ps1` 을 하위 디렉터리에서 부르면 가짜 RED 였다.**
  ⚠ **Bash 도구의 cwd 는 `cd` 후에도 남는다.** `cd` 를 쓴 다음 명령은 절대 경로로 시작해라.
- **`Object.values(모듈)` 로 drizzle 표를 걸러내면 타입 검사가 막힌다.**
- **PGlite 는 Docker 없이 마이그레이션을 실제로 적용한다** (`test/helpers/db.ts` 하나).
- **`tools/principles.ps1` 은 주석도 센다.** `packages/schema/src` 에서는
  `patch`·`diff`·`memory`·`secret:` 등이 금지어다 — 게이트를 똑똑하게 만들려 하지 마라.
- **`.ps1` 을 고칠 때는 BOM 과 줄바꿈을 지켜라** (`utf-8-sig` + `newline=''` 둘 다).
- **`git commit` 이 「Author identity unknown」으로 죽었다.** 로컬로 박아 뒀다.
- **`pnpm -r` 은 멤버가 0개면 조용히 exit 0 이다** (FINDINGS 1). **pnpm 11 의 설치 스크립트
  허용 키는 `allowBuilds` 다** (FINDINGS 6). **`z.toJSONSchema` 는 기본이 인라인이다** —
  `reused: 'ref'`. **`as const satisfies Record<K,V>` 는 표를 읽는 쪽을 망가뜨린다.**
