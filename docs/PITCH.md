# PITCH — 2분 영상 · 8장 슬라이드 · 「15분」 실측

> 규정상 영상·슬라이드는 **필수가 아니다** (제출물은 링크·문제·AI 활용·AI 툴 넷 · `docs/SUBMISSION.md` 「대회 규정 원문」).
> 그래도 만드는 이유는 둘 — 예선 **온라인 투표 20%** 는 링크를 안 눌러 본 사람이 찍고, 본선은 **발표 전달력**이 심사 항목이다.
> 이 문서는 컷 표·대본·체크리스트다. 🙋 녹화는 production 위에서 사람이 한다 (9/17 · `docs/feedback/INBOX.md` 날짜별).

---

## 0. 한 문장 · 세 문장

- **한 문장** — 팀장이 승인한 컨텍스트 하나를 모든 팀원의 Claude Code 에 같은 버전으로, 모든 줄에 근거를 달고.
- **세 문장** — AI 코딩 도구는 CLAUDE.md 로 팀 규칙을 읽지만 그 파일은 개발자 각자의 것이다. 그래서 같은 팀인데 팀원마다 AI 가 다른 답을 하고, 계획이 어디까지 왔는지 아무도 모른다.
  ContextOps 는 팀장이 브라우저에서 승인한 것 하나를 모두에게 같은 버전으로 배포하고, 배포된 모든 줄을 원문으로 되짚고, 마일스톤 진행을 근거와 함께 보여 준다.

---

## 1-A. 🔴 38초 무음 클립 — **한 줄로 만들어진다** (2026-09-12)

> **규정상 영상은 필수가 아니다**(위 머리말). 그래서 먼저 만든 것은 2분 내레이션 영상이 아니라
> **짧은 무음 클립**이다 — 한 번 찍어 **세 군데**에 쓴다: 온라인 투표 페이지 · 레딧 글 · README 머리.
>
> ```
> powershell -ExecutionPolicy Bypass -File tools/record-demo.ps1            # 한국어
> powershell -ExecutionPolicy Bypass -File tools/record-demo.ps1 -Locale en # 영어
> ```
>
> 사람이 누를 버튼이 없다. 화면은 `apps/web/scripts/demo-drive.ts` 가 **production 을 진짜로 클릭해서**
> 몰고, ffmpeg 이 그 창만 찍고 정해진 초에 스스로 멈춘다. 망친 판은 다시 돌리면 그만이다.

### 왜 이렇게 만드나

- **운전이 제일 어렵다.** 2분을 한 번에 찍으면 마우스가 흔들리고 로딩이 판마다 다르고, 한 군데
  틀리면 처음부터다. 이 저장소엔 이미 production 을 클릭해 훑는 코드가 있었다(`e2e/gate3.ts`) —
  그걸 사람 눈 속도로 늦춘 것이 전부다.
- 🔴 **화면에 아무것도 덧그리지 않는다.** 가짜 커서도 강조 테두리도 자막도 없다. 찍히는 것은
  제품이 실제로 그리는 것뿐이다 — 「화면이 거짓을 말하지 않는다」는 녹화에도 그대로다.
  설명은 **나중에 자막으로** 얹는다 (§6).
- **무음이 맞다.** 레딧·X·투표 페이지는 자동재생이 음소거다. 내레이션을 얹고 싶으면
  `-Hold 2` 로 늘려 찍고 그 위에 목소리를 올려라.

### 컷 표 — **잰 값이다** (`demo:drive` 가 찍은 초 · 2026-09-12)

| # | 클립 시각 | 화면 | 무엇이 보이나 |
|---|---|---|---|
| 1 | 2.0s | 랜딩 머리 | 한 줄이 **무슨 물건인지** 말한다 |
| 2 | 6.0s | Before/After | 같은 질문에 두 사람의 AI 가 다른 답 → 승인된 한 줄 |
| 3 | 13.5s | 정리 화면 | [샘플 팀으로 둘러보기] → AI 가 찾은 충돌 카드 3장 |
| 4 | 20.7s | Context | 팀장이 승인한 규칙 목록 |
| 5 | 25.8s | Roadmap | 마일스톤이 근거로 채워짐 · 완료 확인은 사람 |
| 6 | 30.9s | Sync | 기기 14대가 받은 버전 |
| — | 38s | 끝 | |

⚠ **`hold` 의 합(27초)과 실제(34초)는 다르다** — 클릭·도착·그려짐을 기다리는 시간이 약 7초 더 붙는다.
33초로 찍었다가 **마지막 Sync 컷이 통째로 잘렸다.** 컷 표를 고치면 `pnpm --filter web demo:drive` 를
한 번 돌려 초를 **다시 재라** — 그 출력이 위 숫자와 `tools/record-demo.ps1` 기본값의 근거다.

⚠ 영어판(`-Locale en`)은 **랜딩·내비·칩까지가 영어**다. 앱 안쪽 화면 문구는 아직 한국어라
(`docs/STATUS.md` 「다음 판」) 컷 3~6 에 한국어가 섞인다. 레딧에 올릴 때 그 사실을 한 줄로 밝혀라.

---

## 1. 2분 영상 — 컷 표 8컷 (총 120초)

> ⚠ **이건 아직 안 찍었다** (선택 사항 · 위 §1-A 가 먼저다). 아래 대본은 2026-09-10 에 쓴 것이라
> 그 뒤에 바뀐 화면이 반영돼 있지 않다 — 머리글에 **KO/EN 토글**이 생겼고 절 차례가 바뀌었다.
> 찍기 전에 `components/landing.tsx` 의 `SECTIONS` 와 대조해라.

녹화는 **production** 에서 (`https://<production>/demo` 가 열리는 상태 · `verify:prod` 초록 뒤). 마우스는 천천히, 클릭 전 0.5초 멈춤. 내레이션은 대본 그대로 읽는다 — 애드리브가 시간을 먹는다.

| # | 초 | 화면 | 보이는 동작 | 내레이션 (한다체 금지 · 존댓말) | 근거 |
|---|---|---|---|---|---|
| 1 | 0–12 | 랜딩 `/` 상단 | 스크롤 없이 머리 문장 · **Before/After** 카드로 내려감 | 「같은 팀인데 팀원마다 AI 가 다른 답을 합니다. 재시도는 5회인지 3회인지, 환불 SLA 는 있는지 — 각자의 CLAUDE.md 가 다르기 때문입니다.」 | `apps/web/src/components/landing.tsx` `BEFORE_AFTER`(paylab 픽스처의 사실) |
| 2 | 12–27 | `/demo` → 정리 화면 `…/review` | [샘플 팀으로 둘러보기] 클릭 → 게스트 배너 → **AI 제안 충돌 카드 3장** | 「팀장이 문서를 붙여 넣으면 Gemini 가 항목 후보와 어긋남을 찾아 **질문**으로 냅니다. 판정은 하지 않습니다 — 결정은 사람이 합니다.」 | `seed.ts` `RECORDED_CONFLICTS`(2026-09-07 실측 기록 · 카드 본문이 그 사실을 말함) |
| 3 | 27–42 | Context `…/context` | 승인 항목 표 → [발행하기] (게스트라 **읽기 전용 이유**가 그 자리에 뜸) | 「승인된 것만 발행됩니다. 발행 이후에는 AI 가 없습니다 — 같은 입력이면 byte 단위로 같은 결과라, 두 번 눌러도 해시가 같습니다.」 | P4 · `packages/compiler/test/golden` · `ReadOnlyNotice`(FINDINGS 135) |
| 4 | 42–60 | Pack Explorer `…/packs/1.1.0` | `CLAUDE.md` 한 줄 클릭 → 오른쪽에 **원문 근거**(문서 offset · `path:line`) | 「배포된 모든 줄은 항목 ID 를 거쳐 원문으로 되짚힙니다. 환각이 섞일 자리가 없습니다.」 | P7 · `<!-- ctx:… -->` 태그 · `traceability.test` |
| 5 | 60–78 | 랜딩의 **터미널 재생** (또는 실기 Claude Code) | `/contextops:sync` → `applied v1.1.0` · `CLAUDE.md`·`.claude/rules/*` 가 생김 | 「개발자는 Claude Code 에서 명령 한 줄입니다. 훅은 알리기만 하고 파일을 바꾸지 않습니다 — 바꾸는 건 사람이 sync 를 부를 때뿐입니다.」 | `fixtures/replay/sync.json`(관통이 진짜 번들로 녹화) · P6 |
| 6 | 78–96 | Roadmap `…/roadmap` | 마일스톤 행 → **진행 이벤트**(경로 · 줄 · 커밋) · 「완료 확인」은 사람 | 「각자의 Claude 가 작업 끝에 근거를 보고하고, 완료는 팀장이 확인합니다. 개인 점수도 순위도 없습니다 — 행은 마일스톤입니다.」 | P5 · `POST /progress` · `progress-report.ts` |
| 7 | 96–110 | 랜딩 「서버가 아는 것 / 모르는 것」 표 | 표를 천천히 스크롤 | 「서버는 코드 본문·secret·대화를 받을 수 없습니다. 안 보내는 게 아니라 **받을 수 없게** 스키마가 막고, 그걸 매 커밋 기계가 검사합니다.」 | P1 · `tools/principles.ps1` · `docs/evidence/2026-09-06-p1-payload` |
| 8 | 110–120 | 랜딩 설치 4줄 + 저장소 | `claude plugin marketplace add rhdqngusanr/contextops` 줄 | 「MIT 공개 저장소입니다. 팀장은 브라우저에서 15분, 개발자는 명령 한 줄. ContextOps 였습니다.」 | `INSTALL_STEPS` · `SUBMISSION_IDENTITY` |

⚠ 컷 3 은 **게스트로** 찍는다 — 「읽기 전용으로 둘러보는 중입니다」가 뜨는 것이 제품이 정직하다는 장면이다. 발행 성공 장면이 필요하면 컷 3 을 팀장 계정(🙋 로그인 실측 뒤)으로 한 번 더 찍어 붙인다.
⚠ 컷 5 는 랜딩 재생으로 충분하다 — 실기 Claude Code 화면은 글자가 작아 2분 영상에서 안 읽힌다. 실기는 §3 의 GIF 로 따로.

### 자막
- 각 컷 첫 프레임에 **동작 한 줄** 자막 (예: 「게스트로 둘러보기 → 정리 화면」). 내레이션은 자막으로 겹치지 않는다.
- 마지막 프레임 3초: 저장소 URL · `/demo` 주소 · 팀명.

---

## 2. 슬라이드 8장 뼈대 (본선용 · 5분 발표 기준)

| # | 제목 | 몸통 (한 장에 한 생각) | 그림 |
|---|---|---|---|
| 1 | 팀의 기억과 AI의 기억을 한 방향으로 | 한 문장 · 팀명 · 저장소 | 랜딩 OG 이미지 (`apps/web/public/og.png`) |
| 2 | 같은 팀, 다른 답 | Before/After 카드 그대로 — 재시도 5회 vs 3회 · 환불 SLA | 랜딩 캡처 |
| 3 | 왜 지금 생기는 문제인가 | CLAUDE.md 는 **개인 파일**이다 · 팀 규칙이 AI 에 들어가는 문이 없다 · 진행은 아무도 모른다 | 개념도 (`docs/diagrams/`) |
| 4 | 세 걸음 | 모은다(구조화 · 질문) → 사람이 정한다(승인 · 발행) → 모두에게 같은 것을(sync · 근거) | 화면 3 → 5 → 7 캡처 셋 |
| 5 | 깨면 안 되는 원칙 7개 — 그리고 그걸 재는 검사 | P1~P7 한 줄씩 · 「문서가 아니라 게이트」 (`tools/principles.ps1` 9 OK) | 신뢰 경계 표 |
| 6 | AI 는 어디에 · 얼마나 | 실측 표 (항목 후보 22 · 충돌 5 · 인용 26/26 · 약 29초 · 약 $0.08) · 승인 이후 모델 0 | `docs/SUBMISSION.md` 「실측」 표 |
| 7 | 무엇이 검증돼 있나 | CI 6층 · 관통 9단계(진짜 소켓 · 진짜 번들) · 시험 수 · 골든 3종 · 이 저장소를 만든 자율 루프 | `tools/ci.ps1` 결과 캡처 |
| 8 | 다음 | 팀원 초대 · 다른 에이전트 타깃(AGENTS.md · Cursor 는 이미 거울 문서) · 지속 계획(코어 MIT · 호스팅 팀 플랜) | 로드맵 화면 |

발표 순서는 슬라이드가 아니라 **데모가 먼저**다 — 1·2 장 뒤에 바로 `/demo` 를 열고 4장의 세 걸음을 화면으로 밟은 뒤 5~8 장으로 돌아온다. 5분이면 데모 2분 30초 · 슬라이드 2분 30초.

---

## 3. 플러그인 실기 세 장면 (GIF · 각 15초 안)

랜딩의 터미널 재생은 관통이 녹화한 것이라 진짜지만, 심사위원은 「진짜 Claude Code 에서 도는가」를 묻는다. 세 장면을 GIF 로 남긴다 (🙋 실기 설치 뒤 · `docs/evidence/2026-09-1x-plugin-live/`).

| 장면 | 명령 | 보여야 하는 것 |
|---|---|---|
| A | `/contextops:setup <Sync 화면이 준 인자>` | 「연결됐다 · 프로젝트 이름」 한 줄 · `.contextops/project.json` 이 생김 |
| B | `/contextops:sync` | `applied v1.1.0` · `CLAUDE.md` · `.claude/rules/*.md` · 훅 문구 「Hook은 파일을 변경하지 않습니다」 |
| C | 작업 뒤 `/contextops:progress --milestone M1 --evidence src/x.ts:12-30 --summary "…"` | 「보고했다 — M1 · in_progress · 근거 1건」 → 웹 Roadmap 에 행이 뜸 |

---

## 4. 「팀장은 브라우저에서 15분」 — 스톱워치 실측

랜딩 머리에 적힌 숫자다 (`LANDING_HEAD.note`). **재지 않은 숫자는 적지 않는다**가 이 저장소의 규칙이라, 녹화 전에 한 번 잰다.

1. production 에 팀장 계정으로 로그인 (🙋 GitHub OAuth 가 켜진 뒤).
2. 스톱워치 시작 → 팀 만들기 → 프로젝트 만들기 → 가져오기에 `fixtures/paylab-docs/goals.md` 붙여넣기(화면 3 의 [예시 문서 붙여넣기]) → 구조화 완료 대기 → 후보 수락 → 정리 화면의 질문·충돌 결정 → Context 에서 승인 → 발행 → Sync 화면에서 [기기 추가] 까지.
3. 스톱워치 정지. **결과를 `docs/evidence/2026-09-1x-fifteen-minutes.md` 에 적는다** — 걸린 시간 · 막힌 자리 · 그 자리의 화면 캡처.
4. 15분을 넘으면 랜딩 문장을 고친다 (`SITE`/`LANDING_HEAD.note`) — 숫자를 지키려고 걸음을 빼지 않는다.

---

## 5. 녹화 체크리스트 (🙋)

- [ ] `verify:prod` 초록 · `/api/v1/health` 의 `ai:true` · 데모 리셋이 그날 03:00 에 돌았음 (`/demo/session` 200)
- [ ] 브라우저 1440×900 · 확대 100% · 북마크바 숨김 · OS 테마 무관(앱은 뉴트럴 모노크롬 한 벌 · 라이트 고정)
- [ ] 마이크 테스트 30초 · 대본 인쇄 · 컷마다 따로 녹화한 뒤 이어 붙임 (한 번에 찍지 않는다)
- [ ] 자막 폰트는 화면 글꼴과 다른 것 하나만 · 로고·효과음 없음
- [ ] mp4 두 곳 보관 — 저장소 밖(드라이브)과 `docs/evidence/2026-09-17-video/` (파일은 링크만 · 저장소에 mp4 를 넣지 않는다)
- [ ] 제출 폼의 영상 칸이 **선택**임을 확인하고 링크만 붙인다 (`docs/SUBMISSION.md` 🙋 표)
- [ ] 로컬 리허설 — `pnpm --filter web demo:db` 로 같은 데모를 로컬에서 한 번 밟는다 (본선 당일 네트워크 보험)

---

## 6. 찍은 뒤 — 자막 · GIF · 잘라내기 (ffmpeg)

> 클립은 `.ci/video/` 에 떨어진다. ⚠ **저장소에 mp4·gif 를 넣지 마라** (§5 의 같은 규칙) —
> `.ci/` 는 `.gitignore` 가 막고 있고, 근거로 남길 것은 **파일이 아니라 만드는 명령**이다.

### 자막 · 음악 — 한 줄 (`tools/burn-captions.ps1`)

```
powershell -ExecutionPolicy Bypass -File tools/burn-captions.ps1 `
  -Video .ci/video/demo-ko-<stamp>.mp4 -Srt docs/evidence/2026-09-12-video/ko.srt
```

음악까지 (파일은 직접 구해야 한다 — 아래 「음악은 어디서」):

```
powershell -ExecutionPolicy Bypass -File tools/burn-captions.ps1 `
  -Video .ci/video/demo-en-<stamp>.mp4 -Srt docs/evidence/2026-09-12-video/en.srt `
  -Font "Segoe UI" -Music path/to/track.mp3 -MusicVolume 0.22
```

★ **자막은 화면 위가 아니라 아래 띠에 얹는다.** 이 클립의 주인공은 제품 화면이라, 그 위에
  자막을 올리면 보여 주려던 것을 가린다. 스크립트가 아래에 96px 띠를 붙이고 거기에 그린다.
★ **문장의 정본은 `.srt` 다** — 사람이 고치고, 유튜브에는 자막 트랙으로 그대로 올린다.
  스크립트가 굽기 직전에 `.ass` 로 바꿔 쓰고 버린다 (문장을 두 곳에 두지 않는다).
★ 음악은 **반복되고 끝 2초가 페이드 아웃**이다. 음원이 영상보다 짧아도 되고, 뚝 끊기지 않는다.

⚠ **왜 raw ffmpeg `subtitles=...force_style` 로 안 하나** — libass 는 자막에 해상도 정보가
  없으면 기준을 **288** 로 잡고 글자를 그 비율로 늘린다. `FontSize=23` 이라고 적어도 956px
  영상에서는 **약 76px** 로 그려져 띠 밖으로 삐져나온다 (`original_size` 로도 안 잡혔다 · 2026-09-12
  에 두 번 밟았다). 스크립트는 `.ass` 헤더에 `PlayResX/PlayResY` 를 영상 크기로 박아서
  **1 단위 = 1 픽셀**로 만든다.

### 음악은 어디서 — ⚠ 라이선스가 걸린다

대회 약관이 **오픈소스·외부 API·생성형 AI 의 라이선스 준수**를 요구한다(`docs/SUBMISSION.md`
「대회 규정 원문」). 저작권 있는 곡을 깔면 유튜브·레딧에서 막히는 것보다 **규정 쪽이 먼저 문제**다.

| 어디 | 조건 |
|---|---|
| YouTube 오디오 보관함 | 무료 · 상당수 저작자 표시 불필요 · 유튜브에 올릴 거면 제일 안전 |
| Pixabay Music · Free Music Archive | CC0/CC-BY 가 섞여 있다 — **곡마다** 조건을 확인하고 CC-BY 면 크레딧을 넣어라 |
| 생성형 AI 로 만들기 | 그 서비스의 상업적 이용 조건을 확인하고, **제출서의 「사용한 AI 툴」에 적어라** (필수 기재 항목이다) |

🔴 **음악이 꼭 필요한지 먼저 물어라.** 이 클립은 38초 무음이고, 레딧·X·투표 페이지는
   **자동재생이 음소거**다 — 거기서 음악은 아무 일도 안 한다. 값이 있는 곳은 유튜브에 올려
   링크로 걸 때뿐이다. **자막이 음악보다 훨씬 중요하다.**

### GIF — 레딧 글에 붙일 것

실측 2.46 MB (760px · 12fps · 38초). 팔레트를 따로 뽑아야 색이 안 뭉갠다:

```bash
ffmpeg -y -i .ci/video/demo-en-<stamp>.mp4 -vf "fps=12,scale=760:-1:flags=lanczos,palettegen=stats_mode=diff" .ci/video/palette.png
```
```bash
ffmpeg -y -i .ci/video/demo-en-<stamp>.mp4 -i .ci/video/palette.png -lavfi "fps=12,scale=760:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" .ci/video/demo-en.gif
```

### 잘라내기 · 빠르게

```bash
ffmpeg -y -ss 2 -to 34 -i .ci/video/demo-ko-<stamp>.mp4 -c copy .ci/video/demo-ko-trim.mp4
```
```bash
ffmpeg -y -i .ci/video/demo-ko-<stamp>.mp4 -vf "setpts=0.7*PTS" -an .ci/video/demo-ko-fast.mp4
```

### 밟은 함정 넷 (2026-09-12 · 다시 밟지 마라)

| 증상 | 원인 | 고친 법 |
|---|---|---|
| `Failed to capture image (error 8)` · 0.05 MB 파일 | gdigrab 의 **창** 캡처가 GPU 로 합성된 Chrome 창을 못 뜬다 | 창 대신 **데스크톱의 그 영역**을 찍는다 (`-offset_x/-offset_y/-video_size`) |
| 앞 15초가 가만히 있는 첫 화면 | 녹화기는 창이 뜨자마자 찍는데 운전은 그 뒤에도 카운트다운을 셌다 — **초를 양쪽에서 지어냈다** | 운전이 **신호 파일**을 남기고 녹화기가 그걸 보고 시작 |
| 위에 제목 표시줄이 찍힘 | Chrome 앱 창은 제목 줄을 **클라이언트 영역 안에** 그려서 `GetClientRect` 로 안 걷힌다 | 브라우저에게 직접 묻는다 — `screenX/screenY` + 창·뷰포트 크기 차이로 테두리·제목 줄을 센다 |
| 영어판 오른쪽 위를 번역 풍선이 가림 | 브라우저는 한국어인데 페이지가 영어 (`--disable-features=Translate` 는 **안 먹었다**) | `--lang` 으로 **브라우저 언어를 페이지와 맞춘다** |
| 자막이 3배 크기로 띠 밖에 그려짐 | libass 가 해상도 정보 없는 SRT 를 **288 기준**으로 늘린다 | `.ass` 헤더에 `PlayResX/PlayResY` 를 박는다 (`tools/burn-captions.ps1`) |
| `afade` 가 `st==2` 로 죽음 | PowerShell 이 `$fadeStart:` 를 **이름공간 문법**(`$env:PATH` 같은)으로 읽는다 | `${fadeStart}` 로 감싼다 |
