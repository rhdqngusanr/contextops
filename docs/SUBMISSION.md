# 제출서 — ContextOps

> **Wanted AI Championship 2026** · 제출 2026-09-20 · 개발 1인 + Claude Code
>
> 이 문서는 대회 제출 양식에 옮겨 적을 **원문**이다. 재료는 `docs/SPEC.md` §16(초안)과 `README.md` 이고,
> 랜딩(`apps/web/src/components/landing.tsx`)과 **같은 문장**을 말하는지 `apps/web/test/readme.test.ts` 가 잰다.
> 여기 적힌 기능은 전부 **지금 코드에 있는 것**이다 — 없는 것은 [`docs/KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) 에 있다.
> 없는 기능을 제출서에 적으면 심사의 첫 질문이 그것이 된다.

## 🙋 사람이 채우는 자리

| 항목 | 값 | 어디에도 같이 적나 |
|---|---|---|
| 제출 팀명 | 퇴직했는데저좀이직시켜주세요 | 정본은 랜딩의 `SUBMISSION_IDENTITY`(`apps/web/src/components/landing.tsx`) · README 머리 · 랜딩 푸터 (`LANDING_FOOT`) — 셋이 같은 글자인지 `apps/web/test/readme.test.ts` 가 잰다 |
| 공개 저장소 URL | <https://github.com/rhdqngusanr/contextops> (PUBLIC · MIT) | 같은 정본 · README 머리 · 랜딩 푸터의 GitHub · Known limitations 링크. 설치 첫 줄의 마켓플레이스 이름(`rhdqngusanr/contextops`)도 이 URL 에서 파생된다 — 목록 파일은 저장소 뿌리의 `.claude-plugin/marketplace.json` 이다 |
| production URL | 🙋 (Vercel · Supabase 연결 뒤) | README 머리 — `docs/STATUS.md` 「막힌 것」 |
| 2분 영상 링크 | 🙋 (PLAN P6 첫 행 · 규정상 필수는 아니다 — 투표·본선 자산) | — |
| 슬라이드 링크 | 🙋 (PLAN P6 첫 행 · 규정상 필수는 아니다) | — |
| 참가 접수 | 🙋 (원티드 계정 · **2026-09-18(금) 23:59:59 마감** · 제출과 별개의 마감이다) | 접수 없이는 제출 화면이 안 열린다. 접수 뒤 폼의 칸·글자 수·썸네일 규격을 캡처해(`docs/evidence/` 아래 2026-09-09-submission-form 폴더) 아래 「제출 폼 원문」의 괄호 상한을 그 값으로 바꾼다 |

---

## 대회 규정 원문 — 2026-09-09 확인

> 공식 랜딩(iframe) · FAQ · 「AI챔피언십 홈페이지 이용 및 대회 참가약관」에서 옮겼다. 사본과 출처 URL 은 `docs/evidence/2026-09-09-audit/README.md`.
> 이 제출서의 날짜·요건은 전부 여기서 온다 — 저장소 어디에도 없던 것이라 처음으로 적는다.

- **마감 둘** — 참가 접수 **2026-09-18(금) 23:59:59** · 과제 제출 **2026-09-20(일) 23:59:59**. 마감 전에는 자유 수정. 접수만 하고 제출하지 않으면 심사·투표에서 제외.
- **제출물 넷** — 배포된 **서비스 링크(정상 작동 필수)** · 해결하고자 한 문제 · AI 활용 방식 · **사용한 AI 툴 이름과 활용 방식(필수 기재)**. 임시저장은 제출로 인정하지 않는다. 영상·슬라이드·썸네일은 요구하지 않는다.
- **링크 유지** — 심사 기간(예선 9/21~10/5 · 본선 TOP20 이면 10/17 까지) 동안 링크 접속이 안 되면 심사 대상에서 제외될 수 있다. Vercel·Railway 등 배포 도구는 자유.
- **심사** — 예선 = 원티드 내부 심사 80% + 온라인 투표 20% (기획력 · 실현 가능성 · 확장성 · AI 활용 적절성) · 본선(TOP20 · 10/7 발표 · 10/17 Demo Day) = 심사위원 100% (기획력 · 확장성 · 기술력 · 발표 전달력) · 인기상 = TOP20 중 최다 득표 · 리더보드 상위 50 공개 · 제3자 평가 솔루션이 과제를 분석할 수 있다(약관 §6.3).
- **자격·규정** — 원티드 회원 · 만 19세 이상 · 1인 1회 · 팀 최대 5인 · 직무발명·업무상저작물 불가 · **개인정보·회사 기밀 포함 금지** · 오픈소스·외부 API·생성형 AI 의 라이선스 준수 · 유료 API 비용 본인 부담 · IP 는 참가자 귀속(주최사는 운영·심사·홍보 범위에서 무상 이용 · 종료 후 게재 철회 가능) · 매크로·다중계정 투표 실격.
- **이 제출서가 그 규정에 답하는 자리** — 링크 → 🙋 표의 production URL(`/demo` · 로그인 벽 없음) · 문제·AI 활용·AI 툴 → 아래 「제출 폼 원문」 · 개인정보 → 데모 데이터는 전부 합성 팀(`paylab`)이고 실제 개인정보가 0건 · 라이선스 → MIT(`LICENSE`) · Gemini API 이용 조건은 `docs/KNOWN_LIMITATIONS.md` 「AI 처리 데이터의 행방」이 맡는다(INBOX 고가치 4).

## 제출 폼 원문 (4칸)

> 폼에 **글자 그대로** 붙여 넣는 원문이다. 괄호의 글자 수 상한은 폼을 열어 본 뒤(🙋 접수) 실제 값으로 바꾼다 — 그 수를
> `apps/web/test/readme.test.ts` 가 재서, 마감일에 급히 자르다 차별점이 빠지는 일을 막는다. 코드에 없는 기능은 적지 않았다.

### 서비스 링크

`https://<production>/demo` — 로그인 없이 열린다. 🙋 표의 production URL 이 오면 여기도 같은 값이다.

### 한 줄 (≤ 60자)

팀장이 승인한 컨텍스트 하나를 모든 팀원의 Claude Code 에 같은 버전으로, 모든 줄에 근거를 달고.

### 해결하고자 한 문제 (≤ 400자)

AI 코딩 도구는 CLAUDE.md 같은 파일로 팀 규칙을 읽지만, 그 파일은 개발자 개인이 각자 관리합니다. 팀장이 정한 목표·정책은 AI 에 들어가지 않고, 같은 팀인데 팀원마다 AI 가 다른 답을 하며, 계획이 어디까지 왔는지 아무도 모릅니다. ContextOps 는 팀장이 브라우저에서 승인한 팀 컨텍스트 하나를 모든 팀원의 Claude Code 에 같은 버전으로 배포하고, 배포된 모든 줄을 원문 근거로 되짚으며, 마일스톤 진행을 근거와 함께 보여 줍니다. 서버는 코드 본문·secret·대화를 받지 않습니다.

### AI 활용 방식 (≤ 600자)

AI 는 사람이 결정하기 전 단계에만 있습니다. ① 서버(Gemini API)가 팀장이 올린 문서를 항목 10종으로 구조화하고 원문 인용을 근거로 붙입니다. 모델은 위치가 아니라 인용문만 내고 서버가 원문에서 찾아 검증하며, 못 찾으면 버립니다. ② 항목 사이의 어긋남을 찾아 판정 대신 질문 카드를 만들고, 결정은 팀장이 합니다. ③ 팀원의 Claude Code 플러그인(Skill·훅)이 저장소를 로컬에서 훑어 코드 근거와 진행을 보고합니다. 코드 본문은 서버로 가지 않습니다. 승인 이후 컴파일·배포에는 LLM 이 없어 같은 입력이면 byte 단위로 같은 결과입니다. 서버 호출은 예산 문 하나를 지나 일일 한도가 걸립니다. 실측: 3,900자 문서에서 항목 16개 · 충돌 5개 · 인용 20/20 일치 · 약 20초.

### 사용한 AI 툴 (≤ 200자)

Claude Code — 개발 전 과정(자율 루프 · 6일 300여 커밋)과 제품 플러그인의 실행 환경(Skill · 훅). Gemini API(3.5 Flash) — 서버측 문서 구조화·충돌 탐지, 우리 API 키 · JSON 스키마 출력 · 일일 예산, SDK 없이 fetch.

## production URL 이 오면 지울 문장

URL 이 🙋 표에 적히는 순간 아래 문장은 거짓이 된다 — 남기면 심사의 첫 질문이 된다. `apps/web/test/readme.test.ts` 가 「🙋 표의 production URL 에 `https://` 가 있으면 세 문서에 이 문장이 0건」을 잰다.

- 이 문서 「알려진 한계」의 첫 줄 — 「production 이 아직 없습니다」
- `docs/KNOWN_LIMITATIONS.md` 의 「production 이 아직 없다」 항목 (그 항목의 나머지 문장은 「배포 뒤 첫 리셋에서 잰다」로 바꾼다)
- README 머리에 URL 을 적는다 (지금은 자리가 없다 — 적으면서 「직접 보기」의 `/demo` 를 실제 주소로)

---

## 한 줄

**팀의 지식과 Claude의 기억을 같은 방향으로**

팀장이 승인한 목표·로드맵·결정을 모든 팀원의 Claude Code에 같은 버전으로 배포하고, 로드맵이 실제로 진행되는지
근거와 함께 보여줍니다. 팀장은 브라우저에서 15분, 개발자는 명령 한 줄.

## 문제

AI 코딩 도구는 `CLAUDE.md` 같은 파일로 팀 지식을 받습니다. 그런데 그 파일은 **git을 쓰는 개발자 개인이 각자
관리**합니다. 팀장의 목표·정책은 AI에 안 들어가고, 같은 팀인데 **팀원마다 AI가 다른 답**을 하며, 로드맵이 실제로
어디까지 왔는지 **아무도 모릅니다.**

같은 팀의 두 사람이 같은 질문을 했을 때 — 샘플 팀(`paylab`)의 실제 문서와 코드입니다:

> **$ PSP 호출이 실패하면 몇 번까지 재시도해?**
>
> | Before · 각자의 Claude | After · Team Context v1.1.0 |
> |---|---|
> | **A** (`paylab-docs/goals.md §3.1`) — 최대 5회까지 지수 백오프로 재시도합니다. 고정 간격은 금지라고 되어 있습니다. | PSP 호출은 최대 5회까지 재시도한다. 간격은 지수 백오프(0.5s·1s·2s·4s·8s)이고, 재시도 대상은 타임아웃과 5xx 뿐이다. |
> | **B** (`paylab-api/src/payment/retry.ts:11`) — MAX_RETRY = 3 이고 간격은 500ms 고정입니다. | must · 근거: `paylab-docs/goals.md §3.1` · `paylab-api/src/payment/retry.ts:11–14` · 팀장 승인 · `<!-- ctx:item_policy_retry -->` |
> | 같은 팀, 같은 질문, 다른 답 | A·B·C 모두 같은 답 |

After 의 문장은 예시가 아니라 **게스트가 `/demo` 에서 실제로 받는 Pack 의 그 줄**입니다. 줄 끝의 역추적 태그가
그 문장이 어느 항목에서 왔는지를 말합니다.

## 해결

ContextOps는 기존 문서·팀장 답변·코드에서 뽑은 항목을 AI가 정해진 형식으로 구조화하고, 충돌을 찾아 사람이
결정하게 하고, 승인된 것을 모든 팀원의 Claude Code에 같은 버전·같은 해시로 배포하며, 각 팀원의 AI가 작업 끝에
로드맵 진행을 근거와 함께 보고합니다.

1. **만든다** — 문서·답변·코드에서 항목을 뽑고, 서로 어긋난 것은 사람이 결정합니다. 승인된 것만 남습니다.
2. **배포한다** — 같은 snapshot 은 언제나 같은 Pack 입니다. 모든 기기가 같은 버전·같은 해시를 받습니다.
3. **진행이 보인다** — 각자의 AI 가 작업 끝에 근거를 보고하고, 완료는 사람이 확인합니다. 행은 마일스톤입니다.

## AI 활용

AI 가 있는 자리는 셋 — **서버측 둘**(우리 API 키)과 **사용자 로컬 하나**(사용자 본인의 Claude Code) — 이고,
셋 다 **사람이 결정하기 전** 단계에만 있습니다.

1. **문서·답변 → 스키마 항목 구조화** (`apps/web/src/lib/ai/structure.ts`) — 팀장이 등록한 문서를 항목 10종 중
   하나로 나누고, 각 항목에 **원문 offset 근거**를 붙입니다. 근거 ID 는 입력에 존재하는 것만 허용해 환각을
   구조적으로 차단합니다. Gemini API 의 `responseJsonSchema` 로 출력 형식을 고정합니다 (`lib/ai/client.ts`).
2. **항목 간 충돌·오래됨·중복 탐지** (`apps/web/src/lib/ai/conflict.ts`) — AI 는 판정하지 않고 **질문 카드**를
   만듭니다. 결정은 팀장이 클릭으로 합니다.
3. **사용자 본인의 Claude Code 가 로컬에서** 코드 근거 추출·변경 제안·진행 보고 (`plugin/contextops/skills/`) —
   저장소 파일은 사용자 기계에서 읽히고, 서버로는 **경로·줄 번호·구조화된 항목**만 갑니다. 코드 본문은 가지 않습니다.

승인 이후의 컴파일·해시·배포에는 **LLM 이 없습니다** — 같은 snapshot 은 언제나 같은 byte 의 Pack 입니다
(`packages/compiler` · golden 3종). 서버측 호출은 전부 우리 API 키로, `withBudget()` 한 문을 거쳐 일일 예산과
빈도 상한 안에서만 일어납니다 (`apps/web/src/lib/ai/budget.ts`).

⚠ SPEC §16 초안의 「(4) 승인 항목만 근거로 답하는 질의」는 **문이 없습니다** — 라우트가 없어 화면에도 질의창이
없습니다. 이 제출서는 그 기능을 적지 않습니다 (`docs/KNOWN_LIMITATIONS.md` 「서버측 AI 4종 중 둘은 문이 없다」 · FINDINGS 117).

## 신뢰 경계 — 깨면 안 되는 원칙 7개

[`tools/principles.ps1`](../tools/principles.ps1) 이 매 커밋마다 **기계로 셉니다.** 문장은 README 와 같습니다.

| # | 원칙 | 무엇이 잰다 |
|---|---|---|
| **P1** | 서버는 저장소 **코드 본문·secret·개인 Memory·대화 transcript를 절대 받지 않습니다.** 업로드는 `.strict()` allowlist 스키마로만 통과 | 스키마 금지어 0건 · 관통이 진짜 소켓으로 나간 body 를 받아 코드 본문 0건·심은 env 값 0건을 잽니다 |
| **P2** | 제품 코드는 **사용자의 Claude를 대신 호출하지 않습니다.** Claude는 사용자가 Skill을 직접 실행할 때만 동작 | `claude -p`·Agent SDK 가 `plugin/`·`packages/`·`apps/` 에 0건 |
| **P3** | 서버측 LLM은 **우리 API 키**로만 · 4개 기능 한정 · 일일 예산·rate limit | 모든 호출이 `withBudget()` 경유 |
| **P4** | **승인 이후 파이프라인에는 LLM이 없습니다.** 같은 snapshot → byte-identical Pack | 컴파일러에 시각·난수·네트워크 0건 · golden 3종 · 항목 순서를 셔플해도 같은 byte |
| **P5** | 진행은 **마일스톤 단위만.** 개인 생산성 점수·순위를 만들지 않습니다 | 기계로 못 잽니다 — 눈 판정 항목 |
| **P6** | Hook은 **사용자의 파일을 변경하지 않습니다.** 변경은 사용자가 `/contextops:sync` 를 실행할 때만 | 훅이 쓰는 경로는 `hooks.json` 의 `_writes` 에 선언한 git-ignore 경로뿐 · 훅을 프로세스로 돌린 뒤 바이트 대조 |
| **P7** | 모든 Pack 줄은 항목 ID → 원문(문서 offset 또는 `path:line`)으로 **역추적**됩니다 | Pack 전 줄에 `<!-- ctx:… -->` 태그 · 태그 없는 줄이 하나라도 있으면 실패 |

| ✓ 서버가 아는 것 | ✕ 서버가 모르는 것 |
|---|---|
| 팀·프로젝트 ID | 저장소 코드 본문 |
| 구조화된 항목 (제목·규칙·마일스톤) | 환경변수 · secret |
| 팀장이 직접 등록한 문서 원문 | 개인 CLAUDE.local.md |
| 경로 · 줄 번호 · 커밋 해시 | Auto Memory |
| 버전 · manifest 해시 | Claude 대화 내용 |

P1 의 근거 문서는 [`docs/evidence/2026-09-06-p1-payload/p1-payload.md`](evidence/2026-09-06-p1-payload/p1-payload.md) —
관통 시나리오가 진짜 소켓으로 받은 body 4종의 **있는 필드와 없는 필드**를 산출물 그대로 적었습니다.

## 도구와 기술

- **Claude Code Plugin** — Skill 5(`/contextops:init` · `sync` · `propose` · `setup` · `progress`) · 훅 2(`SessionStart` · `Stop`) · CLI 단일 번들
  (`plugin/contextops/bin/contextops-cli.mjs`). 훅은 알리기만 하고 LLM 을 부르지 않습니다. `setup`·`progress` 는 CLI 경로를
  사용자 대신 채우는 Skill 입니다 — 진행 보고는 팀원의 Claude 가 작업 끝에 `/contextops:progress` 를 스스로 실행합니다.
- **Gemini API** — SDK 없이 `fetch` · `responseJsonSchema` 구조화 출력 · `withBudget()` 필수 · 우리 API 키(사용자의 Claude 구독이 아닙니다).
- **웹·서버** — TypeScript 5 / Node 22 · Next.js 15 (App Router · Route Handlers) · Postgres (Supabase) + Drizzle ORM ·
  PGlite (시험·로컬) · Zod · vitest · Vercel (Cron 포함).
- **개발 전 과정 Claude Code** — 이 저장소는 자율 루프(`loop/`)가 만들었습니다. 한 바퀴마다 새 헤드리스 세션이
  문서에서 할 일을 읽고, 하나만 고치고, 검사하고, 커밋하고, 다음 바퀴를 위한 기록(`docs/STATUS.md`)을 남깁니다.
  이 루프는 배포되는 제품이 아니라 개발 도구이므로 P2 의 예외입니다 (`CLAUDE.md`).

## 어떻게 보나

**샘플 팀** — `/demo` 를 열면 게스트 세션으로 샘플 팀에 들어갑니다. 읽기 전용이고 매일 03:00(KST) 초기화됩니다.
로그인 없이 앱 화면(가져오기 · 정리 · Context · 제안 · Pack Explorer · Roadmap · Sync)을 그대로 봅니다.
「정리」의 **AI 제안 카드 3장**은 2026-09-07 에 gemini-3.5-flash 가 샘플 팀의 두 문서에서 실제로 찾은 모순의 기록이고, 카드 본문이
「이 데모에서는 다시 탐지하지 않습니다」라고 스스로 말합니다 — 게스트는 쓸 수 없어서, AI 가 새로 도는 장면은 로그인한 팀장이
문서를 붙여 넣을 때 봅니다.

**개발자 설치**

Node 22 이상이 필요하다 (node -v) — 훅과 CLI 가 Node 로 돈다.

```
claude plugin marketplace add rhdqngusanr/contextops             # 플러그인 저장소를 등록한다
claude plugin install contextops                                 # 플러그인을 깐다 (훅 · Skill · CLI)
/contextops:setup <Sync 화면이 준 인자>                           # Claude Code 안에서. 웹의 Sync → [기기 추가] 가 이 줄을 통째로 준다 — 토큰은 저장소 밖에
/contextops:init                                                 # Claude Code 안에서 한 번. 저장소를 훑어 첫 항목을 올린다
```

그 다음은 팀장이 웹에서 승인하고, /contextops:sync 로 받는다.

**로컬에서** — 계정이 없어도 전부 돕니다. DB 는 프로세스 안의 PGlite 이고, 서버측 AI(문서 구조화·충돌 탐지)만
`GEMINI_API_KEY` 가 필요합니다 — 키가 없으면 그 job 은 `AI_NOT_CONFIGURED` 로 끝나고 화면이 그 사실을 말합니다
(`README.md` 「로컬에서 돌리기」).

## 무엇이 검증돼 있나

- **관통 시나리오** ([`tools/walkthrough.ps1`](../tools/walkthrough.ps1)) — 픽스처 → 항목 → 발행 → Pack → 배포되는
  번들이 진짜 소켓으로 `scan → upload → sync → applied` 까지 **실제로 지난다.** 9단계 (마지막 둘은 헤드리스 Chrome
  캡처와 그 캡처를 랜딩으로 옮기기).
- **원칙 검사** ([`tools/principles.ps1`](../tools/principles.ps1)) — P1·P2·P3·P4·P6·P7 을 기계로 센다.
- **golden** ([`packages/compiler/test/golden/`](../packages/compiler/test/golden/)) — 같은 snapshot → 같은 byte 를 잠근다.
- 전 층은 [`tools/ci.ps1`](../tools/ci.ps1) 한 줄 — 「테스트 초록」은 완성이 아니고, **관통이 지나야** 「된다」입니다.

## 알려진 한계

정직하게 적습니다 — 전부 [`docs/KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) 에 있고, 각 줄은 코드에서 이름을 찾은 뒤 적었습니다.
심사 전에 읽어 두시면 좋은 것 넷:

- **production 이 아직 없습니다** — 모든 관통·데모·캡처는 개발 기계의 PGlite 위에서 돌았습니다.
- **`upload-draft` 의 `body` 에 사람이 코드를 붙여 넣으면 계약은 못 막습니다** — P1 은 「규칙대로 썼을 때 파이프라인이 본문을 안 나른다」까지입니다.
- **서버측 AI 4종 중 둘(질의 · 데모 AI 한 번)은 문이 없습니다** (FINDINGS 117).
- **모든 상태는 「마지막 보고 기준」입니다** — 화면은 폴링으로 갱신됩니다. 라이브 갱신은 없습니다.

## 라이선스

MIT — [`LICENSE`](../LICENSE)
