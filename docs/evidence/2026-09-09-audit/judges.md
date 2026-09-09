# 모의 심사위원 4명

## 기획력 — 문제 정의의 선명함 · 타깃 사용자 · 왜 지금 · 해결책-문제 적합성 · 스토리텔링 · 30초 이해
페르소나: 원티드랩 프로덕트 매니저 출신 예선 심사위원 (비개발자에 가깝다 · 채용/HR 테크 감각)

지금 5.5 → 배포·영상 뒤 7.5

【문제 정의 — 강함, 코드로 확인】 "같은 팀, 같은 질문, AI 마다 다른 답"을 결제 재시도 5회 vs 3회라는 한 장면으로 압축했고, 그 문장이 꾸민 예시가 아니라 픽스처(paylab)에서 실제로 나오는 Pack 의 줄이라는 점을 landing.tsx 의 표와 web-landing/readme 시험 파일이 잠그고 있다(존재 확인, 실행은 안 함). 이 정도로 문제를 "장면 하나"로 만든 참가작은 드물다.

【해결책-문제 적합성 — 대체로 확인】 "AI 는 묻기만 하고 사람이 정한다"는 review/page.tsx 의 충돌 카드와 owner 전용 resolve 라우트로 실재한다. 승인 이후 LLM 없음(P4)은 golden 3종이 있다. 진행 보고는 Pack 템플릿(progress-report.ts)이 사용자의 Claude 에게 `progress` 를 실행하라고 적어 두고 Stop 훅은 경로만 보고하는 구조 — 문서 그대로다. 서버 AI 는 표에 4종이 있으나 withBudget 호출부는 structure·conflict 둘뿐이고 ask·demo 는 라우트가 없다(KNOWN_LIMITATIONS 와 일치).

【타깃 사용자 — 흐림】 문구는 "팀장은 git 을 안 쓴다"고 팀장을 앞세우지만, 가치가 나오려면 팀원 전원이 Claude Code 플러그인을 깔고 `/contextops:sync` 를 눌러야 한다. 실사용자는 "Claude Code 를 이미 쓰는 개발팀 + 그 위의 리드"다. "팀장은 브라우저에서 15분"은 저장소 어디에도 측정치가 없다. 원티드 심사위원 관점에서 채용/HR 맥락과의 접점은 없다 — 순수 개발자 도구다.

【왜 지금 — 암묵적】 CLAUDE.md·플러그인 생태계가 막 표준화되는 시점이라는 시의성이 제품의 전제인데, 랜딩·제출서 어디에도 한 문장으로 적혀 있지 않다.

【30초 이해 — 비개발자에게 어렵다】 헤드라인 "팀의 지식과 Claude 의 기억을 같은 방향으로"는 추상적이고, 첫 스크롤 안에 Pack·snapshot·manifest·해시·PSP·sync 가 그대로 나온다. README 는 칸마다 쉬운 말을 붙였지만 랜딩(1440·375 캡처)에는 그 배려가 없다. 다만 Before/After 카드 자체는 비개발자도 5초면 읽힌다 — 그 카드가 이 제품의 30초다.

【지금 그대로 5.5 인 이유】 제출 요건인 "정상 작동하는 서비스 링크"가 없고, 게스트 데모는 읽기 전용에 데모 씨앗에 AI job 이 0건이라 심사위원이 "AI 가 작동하는" 장면을 어디서도 못 본다. 로그인은 Supabase 미연결로 "아직 연결되지 않았습니다"가 뜬다. 그리고 README·제출서의 "키가 없으면 픽스처 결과로 떨어진다"는 코드에 없다(structure/conflict 는 throw, job 은 INTERNAL 로 끝난다) — 정직함을 내세운 문서에 있는 한 줄이라 더 아프다.

【배포+영상 시 7.5 인 이유】 링크와 2분 영상이 있으면 "다른 답 → 카드 클릭 → 발행 → 터미널 sync → Roadmap 근거"라는 이야기 구조가 온전히 전달되고, 기획력 항목에서 상위권이다. 그래도 8 이상을 못 주는 것은 ① 타깃이 좁고 HR 접점이 없으며 ② 라이브 AI 장면이 데모에 없고 ③ 비개발 심사위원용 어휘 손질이 안 돼 있어서다.

점수를 올릴 행동:
- Vercel + Supabase 배포와 데모 씨앗 심기 (docs/DEPLOY.md 걸음 ②③④⑤⑧) → 정상 작동하는 /demo 링크 확보. 제출 요건이라 이것 없이는 예선 심사 자체가 성립하지 않는다. verify:prod 37검사로 완료를 잰다. [score_now → score_if_shipped 의 기준선 (약 +1.5). 링크 없으면 기획력 점수와 무관하게 탈락 위험 · 5h]
- 2분 영상: ① 개발자 둘이 같은 질문에 다른 답(10초) ② 정리 화면에서 카드 클릭으로 결정(30초) ③ 발행 → 터미널 재생의 sync(30초) ④ Roadmap 에 근거가 붙는 장면(20초) ⑤ '서버가 못 받는 것' 표(15초). 나레이션은 README 의 '쉬운 말로' 문장을 그대로 읽는다. 촬영 중 가져오기→정리→발행을 스톱워치로 재서 '15분'을 실측치로 바꾸거나 지운다. [비개발 심사위원의 30초 이해 확보 · 온라인 투표 20% 에도 직접 효과 (약 +0.8) · 4h]
- 랜딩 첫 스크롤을 비개발자 어휘로 손질 — landing.tsx 의 LANDING_HEAD 표만 고친다(JSX 불변, readme.test 동기화). 헤드라인을 장면형으로('같은 팀인데 AI 마다 답이 다르다면'), subtitle 에 '누구를 위한 것인가' 한 줄(Claude Code 를 쓰는 5~30명 개발팀과 그 리더), Pack·snapshot·해시는 첫 스크롤 아래로 내리고 README 처럼 각주를 단다. '왜 지금' 한 문장(CLAUDE.md·플러그인이 표준이 되는 지금, 팀 단위 정본이 없다)을 WHY_NOT_GIT 위에 둔다. [30초 이해·타깃 선명도·왜 지금 세 항목이 동시에 오른다 (약 +0.6) · 2.5h]
- 게스트가 'AI 가 실제로 돌았다'를 볼 수 있게 데모 씨앗에 완료된 structure job 1건과 conflict job 1건, 그리고 그 job 이 만든 AI 배지 카드 2~3장을 심는다(seed-demo.ts · 서버 AI 를 데모 중 부르지 않으므로 P3 예산·P4 결정론 모두 무관, P1 도 구조화된 항목만). 정리 화면 머리의 'AI 가 찾은 n건'이 0 이 아니게 된다. ['작동하는 AI 서비스' 강조 항목에 대한 반박 근거 제거 (약 +0.5) · 3h]
- 제출서·README 정직성 정비: ① '키가 없으면 픽스처 결과로 떨어진다' 문장을 코드 사실('키가 없으면 그 job 은 INTERNAL 로 실패한다')로 고치거나 KNOWN_LIMITATIONS 로 옮긴다 ② 'AI 활용 방식'을 심사 양식 어휘로 3줄 압축(어디에 AI 가 있고, 어디에 없고, 왜 없는가) ③ 확장성 한 문단 — Cursor/Codex 출력 파일이 이미 있고(PACK_TARGETS) ItemType 추가가 '표에 한 줄'이라는 점. [심사의 첫 질문이 '문서와 코드가 다르다'가 되는 것을 막는다 · 확장성 항목 가점 (약 +0.3) · 1.5h]

날카로운 질문:
- 첫 사용자는 정확히 누구입니까? '팀장은 git 을 안 쓴다'고 하지만 이 제품은 팀원 전원이 Claude Code 플러그인을 깔아야 값이 납니다. 비개발자 팀장이 혼자 '가져오기 → 정리 → 발행'을 15분에 끝낸 실측이 있습니까? 없다면 실제 구매자는 개발 리드 아닙니까 — 그러면 랜딩의 '팀장' 문구는 누구를 향한 것입니까?
- 심사위원이 '작동하는 AI' 를 어디서 봅니까? 게스트 데모는 읽기 전용이고 데모 씨앗에 AI job 이 0건, 로그인은 Supabase 미연결입니다. 서버 AI 는 '4개 기능' 이라 쓰여 있는데 코드에서 문이 있는 건 구조화·충돌 탐지 둘뿐입니다. 이 제품에서 AI 를 빼면 무엇이 남고, AI 가 틀리면(충돌을 못 찾거나 잘못 찾으면) 사용자는 어떻게 압니까?
- Notion/Confluence 에 규칙을 적고 CLAUDE.md 를 git 에 커밋해 팀이 공유하는 것과 무엇이 다릅니까? '왜 git 으로 안 되나' 카드 세 장은 실제 팀 인터뷰나 수치에서 나온 것입니까, 가설입니까? 그리고 Cursor·Codex 팀은 출력 파일만 받고 훅·진행 보고가 없는데, Claude Code 를 안 쓰는 팀에게 이 제품은 무엇입니까?

차별점:
- 문제를 '같은 질문, 다른 AI 답' 한 장면으로 압축했고 그 장면이 꾸민 예시가 아니라 픽스처에서 실제로 나오는 Pack 문장이며 시험이 그것을 잠근다(landing.tsx 표 · web-landing/readme 시험 존재 확인) — 스토리와 제품이 같은 문장을 말한다
- 'AI 는 묻기만, 결정은 사람' + 모든 줄의 역추적 태그 + '서버가 받을 수 없는 것' 표 — 신뢰 경계를 기획의 중심에 둔 점. 충돌 resolve 가 owner 전용 트랜잭션이고, 훅은 파일을 안 바꾸며, 업로드는 allowlist 스키마인 것을 코드에서 확인했다. 기업 도입 담당자가 가장 먼저 묻는 질문에 먼저 답한다
- 승인 이후 파이프라인에 LLM 이 없고 같은 snapshot 이면 같은 byte(P4 · golden 3종 존재 확인) — 'LLM 이 매번 생성' 하는 대다수 AI 참가작과 정반대 설계라 '팀 정본' 이라는 말이 성립한다
- KNOWN_LIMITATIONS 를 먼저 적고 '없는 버튼은 안 만든다' 는 규칙을 실제로 지킨다(영상 버튼 없음 · zip 드롭존 없음 · 로그인 미연결 시 이유를 적음) — 심사위원의 신뢰를 산다
- 개발 과정 자체가 Claude Code 자율 루프(296 커밋 · 문서를 기억으로 쓰는 헤드리스 세션)라 'AI 활용' 이야기가 제품 밖에서도 성립한다

약점:
- production 배포·영상·슬라이드가 없다 — 제출 요건 '정상 작동하는 서비스 링크' 미충족 (STATUS 의 '막힌 것' 은 전부 계정 작업)
- 첫 스크롤 어휘가 개발자 어휘다(Pack · snapshot · manifest · 해시 · PSP · sync). README 는 '쉬운 말로' 각주를 달았지만 랜딩 1440/375 캡처에는 없다 — 비개발 심사위원의 30초를 헤드라인이 아니라 Before/After 카드 하나에 의존한다
- 타깃이 흐리다 — '팀장' 을 앞세우지만 실사용은 Claude Code 를 쓰는 개발팀이고, '15분' 은 측정치가 없다. 원티드(채용/HR) 심사위원이 찾을 접점이 없다
- 데모에서 AI 가 도는 장면이 없다 — 게스트 읽기 전용 · 데모 씨앗 AI job 0건 · 로그인 미연결 · ask/demo 라우트 부재. 주최측의 '작동하는 AI 서비스' 강조와 어긋난다
- README·제출서의 '키가 없으면 픽스처 결과로 떨어진다' 는 코드에 없다 — structure/conflict 는 throw 하고 job 은 INTERNAL 로 끝난다. 정직함을 내세운 문서라 이 한 줄이 더 크게 보인다
- '왜 지금' 이 어디에도 명시돼 있지 않다 — CLAUDE.md·플러그인 표준화라는 시의성이 제품의 전제인데 문장으로 없다
- 확장 경로가 좁다 — Cursor/Codex 는 출력 파일만이고 훅·진행 보고·Skill 은 Claude Code 전용이다. 서버 AI 4종 표 중 2종만 존재한다
- 검증 대부분이 개발 기계의 PGlite 위에서만 돌았다 — CI/관통 초록, byte-identity, Gemini 출력 품질은 이번 심사에서 직접 확인하지 못했다

## 실현가능성 — 실제 구현·배포·운영 가능성 · 데모 신뢰성 · 설치 경로 · 기술 부채 · 1인 개발 완성도 · 「작동하는 AI 서비스」인가
페르소나: 크래프톤 엔지니어링 리더 — 문서가 아니라 코드와 산출물로 「실제로 도는가」를 본다

지금 4 → 배포·영상 뒤 8

【코드로 확인한 것】 ① 규모·검증: 제품 코드 약 28k LOC(apps/web·packages·plugin), 테스트 파일 81개·케이스 약 1,100개, 로컬 CI 결과 파일(.ci/result)이 오늘(2026-09-09 20:08) 6층 전부 GREEN. 관통 스크립트는 fixture→compile→api→publish→scan→payload→sync→shots→shotcopy 9단계이고 실제 소켓으로 배포 번들을 돌린다. ② P3 「withBudget 한 문」: 실제 호출부는 structure.ts:613·conflict.ts:294 둘뿐이고 client.ts 가 유일한 fetch 자리다 — 문서 주장과 일치. 반면 AI_FEATURES 4종 중 ask·demo 는 라우트가 0개(문서도 인정). ③ P4: packages/compiler/src 에 Date.now·Math.random·fetch·new Date 0건, golden 3케이스 존재. ④ P1: upload.ts 에 .strict() 15개. ⑤ P6: session-start.mjs 는 읽기·stdout 뿐, stop.mjs 는 .contextops/pending-proposal.json 하나만 쓴다. 둘 다 LLM 호출 없음. ⑥ sync.ts: 받아서 sha256 검증→backup→atomic 교체→post-verify→불일치 시 전부 복원 — 실제 구현돼 있다. ⑦ 플러그인 번들 bin/contextops-cli.mjs 824KB 커밋됨, marketplace.json·plugin.json 존재. ⑧ 캡처 7장은 CDP 헤드리스 Chrome 이 찍은 진짜 화면이며 데모 데이터(항목 27·기기 14·제안 4·마일스톤 3)가 일관된다. ⑨ 진짜 Gemini 실측 근거(docs/evidence/2026-09-07-p3-gemini/probe.txt)가 있고 — 항목 16·충돌 5 는 나오지만 「인용 실패가 실행의 약 1/3」「두 번 연속 재시도 0 은 못 봤다」고 스스로 적었다. 【확인 못 했거나 위험】 ⓐ production 없음 — 제출 요건 「서비스 접속 링크(정상 작동 필수)」가 지금 비어 있다. 이것만으로 예선에서는 치명적. ⓑ 로컬 main 이 origin/main 보다 10커밋 앞서 있고(마지막 push 09-07 22:34), `.claude-plugin/marketplace.json` 이 GitHub 에 없다 → README·랜딩 설치 첫 줄 `claude plugin marketplace add rhdqngusanr/contextops` 는 **지금 공개 저장소로는 실패한다.** 미푸시 커밋에는 「플러그인이 성공한 업로드를 실패로 보고」하던 고장(FINDINGS 44) 수정도 들어 있다 — 공개 번들은 아직 그 버그를 갖고 있다. ⓒ 게스트 데모는 GET/HEAD 만 허용 → 심사위원은 /demo 에서 **AI 가 도는 장면을 한 번도 볼 수 없다**(씨앗된 충돌 카드 9장만 본다). 「작동하는 AI 서비스」의 AI 부분이 계정 없이는 시연 불가. ⓓ `/contextops:init` 를 사람이 Claude Code 안에서 끝까지 돌린 기록이 없다(Skill 은 모델이 읽는 문서라 CI 가 못 잰다 — 문서가 인정). 설치·관통 전부 Windows 단일 OS. ⓔ session.ts 가 HS256 만 받는다 — Supabase 가 프로젝트에 비대칭 서명키(ES256)를 쓰고 있으면 로그인 전원 불가. DEPLOY.md 에 GitHub OAuth provider 설정 걸음도 없다. ⓕ vercel.json 의 health cron `0 */6 * * *` 은 Vercel Hobby 플랜에서 허용되지 않는 빈도일 수 있다(Hobby 는 일 1회) — 배포가 거절되거나 cron 이 통째로 빠질 위험. demo-reset 이 함수 시간 안에 끝나는지도 미측정(문서 인정). ⓖ KNOWN_LIMITATIONS 의 「브라우저 e2e 가 없다·shots 단계는 SKIP」 줄은 낡았다(apps/web/e2e 가 있고 관통 SKIP 0) — 과소 주장이지만 문서 드리프트다. 【판정】 지금 그대로는 심사위원이 접속할 것이 없고 설치 경로마저 깨져 있어 4점. 배포·영상이 되고 verify:prod 가 0 failed 라면, 결정론 컴파일러·atomic sync·진짜 플러그인·기계 검사 게이트라는 실체가 해커톤 평균을 훌쩍 넘어 8점 — 다만 AI 가 게스트에게 안 보이는 것과 Claude Code 쪽 미검증이 9점을 막는다.

점수를 올릴 행동:
- push → Vercel 배포 → 검증 완주. ① `git push`(마켓플레이스 파일·FINDINGS 44 수정 포함 10커밋) ② Vercel Root Directory=apps/web · .env.vercel Import ③ 배포 전 Supabase 대시보드에서 JWT Signing Keys 가 legacy HS256 secret 인지 확인(아니면 session.ts 를 JWKS 검증으로 고치거나 legacy 유지) ④ Vercel 플랜 확인 — Hobby 면 health cron 을 일 1회로 바꾸거나 Pro 로 ⑤ curl demo-reset → `pnpm --filter web verify:prod -- --url …` 0 failed → .ci/production 을 docs/evidence 로 복사 ⑥ SUBMISSION 🙋 표·README 머리에 URL 기입 [score_now 4 → 7. 제출 필수 요건 충족 + 「설치 첫 줄이 실패한다」는 첫 질문 제거 · 5h]
- 심사위원이 AI 를 직접 보게 만든다. AI_FEATURES 표에 이미 있는 `demo`(IP당 일 5회 · withBudget 경유)를 `POST /demo/ai-once` 로 실제로 잇고, 고정 샘플 문서 하나를 구조화해 결과 카드를 보여 준다(키 없음·429·예산 초과 시 픽스처 결과로 낙하 — 이미 설계된 갈래). 게스트 배너에 버튼 하나. 라우트+시험+ai-budget 「죽은 기능」 시험 갱신. P2·P3 안이다 [「작동하는 AI 서비스」 항목에서 결정적 — 지금은 게스트가 AI 를 0번 본다. if_shipped 8 → 9 의 핵심 · 6h]
- 다른 기계(가능하면 macOS 또는 Linux)에서 README 4줄만 보고 fresh install: marketplace add → install → setup(토큰은 웹에서 발급) → Claude Code 안에서 `/contextops:init` 를 모델이 실제로 실행 → 웹 승인 → `/contextops:sync` → Roadmap 갱신. 화면 녹화하고 깨진 것을 그 자리에서 고친다(credentials 0600·훅 timeout 3초·경로 구분자) [Claude Code 측 절반이 처음으로 검증된다 · 영상의 핵심 장면 확보 · 단일 OS 약점 해소 · 4h]
- 2분 영상 + 슬라이드 8장. 구성: Before/After(랜딩 카드) → 정리 화면에서 충돌 카드 결정 → 발행 → 터미널 sync(실제 녹화) → Roadmap 근거 갱신 → 브라우저 네트워크 탭에서 upload payload 에 코드 본문이 없음을 보여 주는 10초(P1 근거 — 지금 문서가 「배포 뒤 찍는다」고 미뤄 둔 것). production URL 위에서 찍는다 [온라인 투표 20% 와 발표 전달력에 직결 · 신뢰 경계를 말이 아니라 화면으로 · 5h]
- 심사 전 문서 정합: KNOWN_LIMITATIONS 의 낡은 줄(e2e 없음·shots SKIP) 삭제, DEPLOY.md 에 Supabase Auth GitHub OAuth provider·redirect URL 걸음과 JWT 서명키 확인 걸음 추가, README 머리에 영어 3문장 요약(심사위원이 GitHub 를 열었을 때 10초 안에 이해), STATUS.md 는 history 로 내려 300줄 이하로 [저장소를 여는 심사위원의 첫인상과 재현성. 작지만 싸다 · 2h]

날카로운 질문:
- 게스트 데모는 읽기 전용이라 심사위원은 서버측 AI(구조화·충돌 탐지)가 실제로 도는 것을 한 번도 볼 수 없습니다. 「작동하는 AI 서비스」라는 것을 심사 자리에서 어떻게 증명할 겁니까? 그리고 진짜 Gemini 실측에서 인용 실패가 실행의 1/3(FINDINGS 152 미해결)인데, 발표 중 AI_OUTPUT_INVALID 가 나면 어떤 화면이 보입니까?
- 공개 저장소(origin/main)에는 `.claude-plugin/marketplace.json` 이 없고 로컬이 10커밋 앞서 있습니다. 즉 README 의 설치 첫 줄은 지금 실패합니다. 새 PC 에서 4줄 설치 → `/contextops:init` 를 Claude Code 가 끝까지 실행한 기록이 있습니까? macOS/Linux 에서는요? Skill 은 모델이 읽는 문서라 CI 가 못 잰다고 스스로 적었는데, 그 검증은 누가 언제 합니까?
- Vercel 서버리스 + Supabase 로 올릴 때 코드에 박힌 가정 셋 — session.ts 가 HS256 만 받는 것(새 Supabase 프로젝트의 비대칭 서명키와 충돌 가능), vercel.json 의 6시간 health cron(Hobby 플랜 제한), demo-reset 이 함수 시간 제한 안에 27개 항목·14기기를 지우고 다시 심는 것 — 셋 다 「아직 못 쟀다」고 문서에 있습니다. 배포 첫날 무엇이 먼저 깨질 것 같고, 깨지면 심사위원이 보는 화면은 무엇입니까?

차별점:
- 챗 래퍼가 아니라 실제 Claude Code 플러그인이다 — 훅 2개(파일 미변경·LLM 미호출을 코드로 확인) · Skill 3개 · 824KB 단일 번들 CLI 8명령, sync 는 sha256 검증→backup→atomic→post-verify→복원까지 구현돼 있다
- 승인 이후 파이프라인이 결정론이다 — 컴파일러에 시각·난수·네트워크 0건, golden 3종, 모든 Pack 줄에 역추적 태그. 「같은 snapshot → 같은 byte」를 해커톤에서 실제로 잠근 팀은 드물다
- 신뢰 경계를 문서가 아니라 기계가 잰다 — .strict() allowlist 15개, principles.ps1 이 P1~P7 을 커밋마다 세고, 관통이 진짜 소켓으로 나간 payload 에 코드 본문 0건을 잰다. 기업 도입 시 첫 질문(「우리 코드가 남의 서버로 가나」)에 코드로 답할 수 있다
- 정직한 KNOWN_LIMITATIONS 와 시험으로 묶인 문구 — 랜딩 Before/After 문장이 실제 Pack 의 그 줄과 글자 그대로 같은지 테스트가 잰다. 심사위원이 「이거 진짜냐」를 물을 자리를 미리 막았다
- 개발 과정 자체가 AI 활용 사례다 — 117바퀴 자율 루프(claude -p)가 296커밋을 만들었고 근거 캡처 208개가 남아 있다. 「AI 활용 방식」 항목에 제품 안팎 두 겹의 이야기가 있다

약점:
- production 이 없고 영상·슬라이드가 없다 — 제출 필수 요건 미충족. 지금 심사위원이 접속할 수 있는 것은 GitHub 뿐이고, 그 GitHub 는 로컬보다 10커밋 뒤라 설치 첫 줄이 실패하며 「업로드 성공을 실패로 보고」하는 플러그인 버그(FINDINGS 44)가 그대로 있다
- AI 가 게스트에게 보이지 않는다 — 서버측 AI 4종 중 2종만 존재하고, 그 2종도 쓰기 권한이 필요해 /demo 에서는 실행 불가. 심사위원이 보는 것은 씨앗된 결과뿐이라 「작동하는 AI 서비스」 주장이 데모에서 증명되지 않는다
- Claude Code 측(init Skill → 승인 → sync)을 사람이 끝까지 밟은 기록이 없고 검증은 Windows 단일 OS 다. Gemini 실측은 인용 실패 1/3·충돌 수가 실행마다 다름(4·5·3) 등 비결정성이 남아 있다
- 배포 가정이 미검증이다 — HS256 전용 JWT 검증, Hobby 플랜과 맞지 않을 수 있는 6시간 cron, 함수 시간 안의 데모 리셋, 픽스처 파일 추적. DEPLOY.md 에 GitHub OAuth provider 설정도 없다. 1인 개발이라 배포 첫날 문제를 병렬로 처리할 사람이 없다
- 기술 부채는 코드가 아니라 문서에 있다 — STATUS.md 1,078줄, 주석이 FINDINGS 번호를 인용해 외부 기여자는 대장을 같이 읽어야 한다. KNOWN_LIMITATIONS 일부 줄이 낡았다(e2e/shots). 오픈소스로 공개한다면 진입 장벽이 된다
- 제품 가치 가정이 미검증이다 — 「팀장은 브라우저에서 15분」은 실사용자 0명 기준의 주장이고, 권한 2단계·manifest 미서명·기기 토큰 붙여넣기 방식은 실제 팀 도입 시 첫 번째 반대 사유가 된다

## 확장성 — 시장 크기 · 비즈니스 모델 · 팀→조직 · Claude Code 밖(Cursor/Codex)으로의 확장 · 경쟁 대비 해자 · 기술적 확장성
페르소나: 스파크랩 VC 심사역 (시장·사업 모델·확장 경로를 본다)

지금 4.5 → 배포·영상 뒤 6.5

[코드로 확인한 것] ① 기술적 확장성은 해커톤 출품작 기준으로 상위권이다. ItemType 10종(`packages/schema/src/item.ts` ITEM_DATA) · Pack 타깃 3종(`manifest.ts` PACK_TARGETS → `templates/index.ts` DOCS 의 compose 거울 문서 → `plugin/.../managed.ts` MANAGED_PATHS) · 서버 AI 기능 4종(`lib/ai/features.ts`) · CLI 명령 8종(`commands.ts`) · 훅 2종(`hooks.json` _writes) 이 전부 「표 하나 + 옆에 더하는 절차 주석 + liveness 시험」 구조다. 새 타깃(예: .windsurf)을 더하는 절차가 4단계로 코드에 적혀 있고 partition 은 거울 문서를 모르게 타입으로 막아 뒀다 — 이건 말이 아니라 구조다. ② 멀티테넌시 뼈대는 있다: teams/team_members/projects/repos 표(`db/schema.ts`), `/t/new`·`/t/[team]/p/new` 온보딩 화면, 프로젝트 하나에 repos 여러 개(pathPrefix 포함)라 「한 Pack → 여러 레포」가 데이터 모델상 가능하고 `setup` 이 `project_id`(+선택 repo_id)만 든다. ③ 신뢰 경계(P1 allowlist `.strict()` · P4 결정론 · P7 `ManifestFile.refine` 으로 근거 없는 파일 거부)는 실제 코드에 있고, SessionStart 훅은 5분 캐시·2초 타임아웃·ETag 304 라 세션당 서버 부하가 작다 — 기기 수가 늘어도 버틸 설계다. ④ Cursor/Codex 는 `AGENTS.md`·`.cursor/rules/contextops.mdc` 거울 문서를 내는 것까지만이다. sync·훅·Skill·진행 보고 루프는 Claude Code 플러그인 전용이고 배포 채널도 `claude plugin marketplace` 하나다. CLI 번들(824KB · 런타임 의존 0)은 이론상 Claude Code 없이 돌지만 그 경로를 문서·시험이 잰 흔적은 없다. ⑤ 사업 모델·시장이 저장소 어디에도 없다 — `가격|요금|시장|B2B|과금` 이 docs 전체에서 0건이고, 경쟁 언급은 랜딩의 DeepWiki 한 줄뿐이다. ⑥ 멀티테넌트 SaaS 로 가는 데 실제 걸림돌 하나를 코드에서 찾았다: `budget.ts` 의 `spentMicrosToday(db, day)` 가 프로젝트·팀 필터 없이 `ai_usage` 전체를 합산한다 → 하루 예산 $3 가 **전 테넌트 공용**이다. 한 팀이 오전에 다 쓰면 나머지 팀 전부 `BUDGET_EXCEEDED` 다. 빈도 상한만 project 단위다. ⑦ 프롬프트(`prompt.ts` AI_SYSTEM_COMMON)와 Pack 제목(`# 아키텍처`·`## 결정 요약`·`# 도메인 — …`)이 한국어 고정이고 locale 표가 없다 — 비한국어 팀의 CLAUDE.md 에 한국어 제목이 박힌다. [못 확인한 것] production 이 없어 Vercel 서버리스에서 데모 리셋·픽스처 로딩이 실제로 도는지, `claude plugin install` 로 새 PC 에 깔리는지(기록 없음 · KNOWN_LIMITATIONS 인정), `teams.settings` 의 auto_apply/auto_submit 이 무언가를 실제로 바꾸는지, 데모가 프로젝트 하나에 레포 둘 이상을 보여 주는지(씨앗은 paylab-api 하나)는 확인하지 못했다. [점수] 지금(4.5): 기술 확장성 8 · 팀→조직 4(권한 2단계 · 조직 층 없음 · SSO/감사 없음) · 타 도구 확장 4 · 시장/BM 2 · 해자 4 를 VC 가중(시장·BM 을 무겁게)으로 합친 값이다. 배포+영상 가정(6.5): 「실제로 여러 팀이 한 서버에 산다」가 증명되고 영상이 문제 정의를 팔 수 있어 실현 신뢰가 오르지만, BM·글로벌·타 도구 경로는 배포만으로는 안 채워진다.

점수를 올릴 행동:
- P5 셋째 행을 닫아라 — Vercel+Supabase production 배포(`docs/DEPLOY.md` 걸음 ②③④⑤⑧) → `verify:prod` 0 failed → 두 번째 PC 에서 `claude plugin marketplace add → install → /contextops:init → sync` 까지 실제로 밟고 그 터미널 캡처를 docs/evidence 에 남긴다. 「서비스 접속 링크 정상 작동 필수」인 대회에서 이것 없이는 확장성 점수 자체가 산정되지 않는다. [score_now → score_if_shipped 구간 전부(+2). 「멀티테넌트가 실제 서버에서 돈다」는 첫 증거 · 6h]
- AI 예산을 테넌트 단위로 갈라라 — `apps/web/src/lib/ai/budget.ts` 의 `spentMicrosToday` 옆에 `teamId`(또는 projectId) 필터를 받는 한 줄과 `AI_FEATURE_LIMITS` 표에 `dailyBudgetUsd` 축을 더해 팀별 상한 + 전역 상한 이중으로 잰다(여전히 `withBudget()` 한 문 경유라 P3 그대로). 시험은 「팀 A 가 다 써도 팀 B 는 부른다」 하나. 발표에서 「팀 100개가 동시에 눌러도」에 답할 수 있는 근거가 된다. [+0.8 · 심사 질문 2번의 정답이 생기고 「SaaS 가 될 수 있는 구조」로 읽힌다 · 3h]
- 제출서·README·랜딩 푸터 위에 「누가 돈을 내나」 한 절을 써라(코드 0줄): ICP = AI 코딩 도구를 도입한 10~50인 개발조직의 팀장/EM · 가격 가설 = 기기 5대까지 무료 → 기기당 월 과금 → self-host(MIT 라 가능) · 경쟁표 4행(Cursor Team Rules · Claude Code managed policy · GitHub Copilot org instructions · DeepWiki/Context7)에 「배포는 그들도 하지만 승인 워크플로·줄 단위 역추적·마일스톤 진행 보고는 없다」를 칸으로. 확장 경로는 이미 코드에 있는 것만 적어라(PACK_TARGETS 4단계 · repos 다중). [+0.8 · 지금 0점인 시장/BM 칸을 채운다. VC 심사역이 보는 첫 페이지 · 3h]
- 「표에 한 줄」을 무대에서 증명하라 — `templates/index.ts` 주석의 4단계 절차 그대로 넷째 타깃 `copilot`(`.github/copilot-instructions.md` · 거울 문서 compose 재사용)을 더하고, 그 커밋 diff(스키마 1줄 · DOCS 1항목 · MANAGED_PATHS 1줄)를 영상 10초로 보여 준다. 동시에 README 에 「Cursor/Codex 팀은 Claude Code 없이 `node contextops-cli.mjs sync` 로 받는다」를 관통 한 단계(`$CLAUDE_PLUGIN_ROOT` 없이 sync)로 잠근다. [+0.6 · 「Claude Code 전용 아니냐」에 코드로 답한다 · 설치 기반이 가장 큰 Copilot 까지 도달 · 3h]
- 랜딩의 「컨텍스트는 레포 하나에 갇히지 않습니다」를 데모로 뒷받침하라 — `fixtures/seed/demo.json` 에 둘째 레포(paylab-webhook · pathPrefix 사용) 와 그 레포에 붙은 기기 2~3대를 심어 Sync 화면이 「같은 v1.1.0 · 레포 2」를 보여 주게 한다(repos 표·project.json 은 이미 준비돼 있다). 시험은 「데모 프로젝트의 repos ≥ 2」 한 줄. [+0.4 · 팀→조직 확장의 첫 단계(프로젝트 하나 = 레포 여럿)가 눈에 보인다 · 3h]

날카로운 질문:
- Anthropic 이 Claude Code 에 조직 단위 managed CLAUDE.md/정책 배포를 붙이고(이미 enterprise managed settings 가 있다) Cursor 가 Team Rules 를 넓히면, ContextOps 에 남는 것은 승인 워크플로와 역추적뿐이다. 그것만으로 팀장이 월 얼마를 낼 것이며, 그 가격의 근거 고객 인터뷰가 몇 건인가?
- `budget.ts` 의 하루 예산 $3 는 전 테넌트 합산이다. 유료 팀 100개가 같은 날 문서 구조화를 누르면 어떻게 되나 — 테넌트당 AI 원가와 기기당 가격을 숫자로 말해 달라. 그리고 그 셈에 Gemini 무료 티어 분당 제한은 어디에 들어가나?
- 「팀장은 브라우저에서 15분」이라 했는데 배포 채널은 `claude plugin marketplace` 하나로 개발자 채널이다. 첫 10팀은 누구이고 팀장은 어디서 이 제품을 만나나? 그리고 그 팀에 Cursor 를 쓰는 개발자가 셋 있으면 그 셋은 어떻게 sync 하고 진행 보고는 누가 하나?

차별점:
- 승인 이후 LLM 을 구조적으로 제거한 결정론 파이프라인 — 같은 snapshot 이면 byte 동일 Pack(golden 3종 · 순서 셔플 시험)이고 모든 줄이 항목 ID 로 역추적된다(`ManifestFile.refine` 이 근거 없는 파일을 계약에서 거부). LLM 을 감싸기만 한 출품작들과 정반대 방향이고, 코드로 확인됐다
- 신뢰 경계를 문서가 아니라 기계가 잰다 — 업로드는 `.strict()` allowlist, 훅은 `_writes` 선언 경로만, `tools/principles.ps1` 이 매 커밋 P1~P7 을 센다. 「회사 코드를 남의 서버에 안 올린다」를 B2B 영업 문장이 아니라 검사로 갖고 있다
- 확장이 「표에 한 줄」인 것을 코드가 증명한다 — ItemType · PackTarget · AI 기능 · CLI 명령 · 훅 다섯 표 모두 옆에 더하는 절차 주석 + 정의만 있고 안 도는 줄을 잡는 liveness 시험이 있다. 오픈소스 기여를 받을 수 있는 모양이다
- 가입 없는 게스트 데모(`/demo` · 진짜 라우트 · 매일 03:00 Cron 리셋) · 랜딩 캡처가 관통이 방금 찍은 실제 화면 · KNOWN_LIMITATIONS 가 줄마다 코드 이름을 달고 정직하다 — 심사위원의 첫 3분을 설계했다
- 1인 + 자율 루프로 6일 296 커밋 · 시험 700+ · 관통 1,233 검사 — 「팀이 작아도 산출이 조직처럼 확장된다」는 것 자체가 AI 활용 사례이자 개발 조직 확장 답변이다(단, 루프는 Windows 전용)

약점:
- production 이 없다 · `claude plugin install` 로 깐 기록이 없다 · 단일 OS 검증 — 「작동하는 AI 서비스로 승부」인 대회에서 확장성 이전에 접속 링크가 없다
- 비즈니스 모델·시장 규모·가격·ICP 가 저장소 어디에도 없다(docs 전체 grep 0건). 경쟁 언급은 DeepWiki 한 줄뿐이고 진짜 경쟁자(Cursor Team Rules · Claude Code managed policy · Copilot org instructions)는 이름조차 없다
- 하루 AI 예산이 전 테넌트 공용이다(`budget.ts` `spentMicrosToday` 에 팀 필터 없음) — 지금 구조로는 두 번째 유료 팀을 받는 순간 서로의 예산을 잠근다. 멀티테넌트 SaaS 로 못 간다
- Cursor/Codex 는 거울 파일 출력까지다 — sync·훅·Skill·진행 보고 루프와 배포 채널(plugin marketplace)이 전부 Claude Code 전용이라 제품의 절반(진행이 보인다)이 Claude Code 밖에서는 없다
- 프롬프트와 Pack 제목이 한국어 고정(`# 아키텍처` · `## 결정 요약`) · locale 표 없음 — 글로벌 확장을 말하려면 첫 고객이 영어 팀인 순간 CLAUDE.md 에 한국어 헤더가 박힌다
- 해자가 얇다 — 「승인된 규칙 파일을 팀에 배포」의 절반은 도구 벤더가 플랫폼 기능으로 흡수할 수 있다. 남는 것(승인 워크플로 · 역추적 · 마일스톤 보고)의 지불 의사가 검증된 적이 없다
- 팀→조직 층이 없다 — 권한 owner/member 2단계 · 팀 위 조직 없음 · SSO/SCIM/감사 로그 없음 · manifest 서명 없음(TLS 만). 엔터프라이즈 확장은 전부 앞에 남아 있다
- 공개 데모의 AI 가 Gemini 무료 티어 분당 제한 위에 있다 — 투표 기간(온라인 20%)에 여러 명이 동시에 누르면 429 를 본다(KNOWN_LIMITATIONS 인정)
- 미확인: `teams.settings` 의 auto_apply/auto_submit 이 실제로 무언가를 바꾸는지 · 프로젝트 하나에 레포 여럿이 어디서든 실제로 쓰이는지(데모 씨앗은 레포 하나) — 랜딩의 「레포 하나에 갇히지 않습니다」는 데이터 모델로만 뒷받침된다

## AI활용 — AI 활용의 적절성 (필요한 자리·과소/과다·환각 방지·출력 검증·데모 체감·모델 선택·Claude Code 플러그인 활용의 독창성)
페르소나: 라이너(AI 검색 서비스) AI 리드 — AI 를 어디에 어떻게 썼는지, 환각·안전, 사용자가 AI 가치를 체감하는지를 본다

지금 4.5 → 배포·영상 뒤 7

**AI 를 「사람이 결정하기 전」에만 두고 승인 이후는 결정론(P4)으로 못 박은 설계는 이 대회에서 보기 드물게 명확하다.** 코드로 확인한 것: 서버측 LLM 은 Gemini `generateContent` 를 `fetch` 로 직접 부르고, 출력 스키마는 Zod 계약(`AiStructureOutput`·`AiConflictOutput`)에서 `toJsonSchemaOf()` 로 뽑아 `responseJsonSchema` 에 싣는다(계약이 두 벌이 아니다). 모든 호출은 `withBudget()` 한 문을 지나고(`principles.ps1` P3 가 파일 단위로 센다), 실패한 호출도 장부에 남는다. 환각 방지는 문장이 아니라 구조다 — 모델은 offset 이 아니라 `quote` 를 내고 서버가 `indexOf` 로 offset 을 계산하며(0곳·2곳 이상이면 재시도 → `AI_OUTPUT_INVALID`), 충돌 탐지는 프롬프트에 없던 항목 id 를 가리키면 응답 전체를 버리고, 문서 본문은 `<untrusted>` 로만 들어간다. 이것들이 시험 85개(ai-structure 41 · ai-conflict 26 · ai-budget 18)로 잠겨 있고, **진짜 Gemini 실측 3회(`probe-87-run1~3`)를 실패까지 그대로 남겼다** — run1·run3 은 항목 16 · 충돌 카드 5 · 비용 ≈$0.02~0.035, run2 는 goals.md 가 인용 불일치로 재시도까지 죽었다(1/3). 플러그인 쪽은 사용자 본인의 Claude Code 를 로컬 추출기로 쓰되 Skill 셋이 전부 `disable-model-invocation: true` 이고 validate → `--dry-run` → 명시적 확인을 강제하며 훅 둘은 LLM 을 안 부른다(P6 · 쓰기 allowlist 를 게이트가 센다). 「챗봇 껍데기」가 아닌 **거버넌스가 걸린 플러그인 활용**이라 독창성 점수는 높다.

**그런데 심사위원이 실제로 만지는 `/demo` 에는 AI 가 만든 것이 한 개도 없다.** `actor-rules.ts` 가 게스트를 `writes:false` 로 두어 문서를 올릴 수 없고, `lib/demo/` 는 job 러너를 한 번도 부르지 않으며, `conflicts` 행을 만드는 자리는 프로젝트 생성(씨앗 질문 10장 · `byAi:false`)과 AI 러너 둘뿐이다. 따라서 데모 Roadmap 의 「열린 충돌 9」는 씨앗 질문 9장이고 정리 화면 머리는 「AI가 찾은 … 0건」이 된다. 항목 27개와 랜딩 Before/After 도 픽스처 시드다. README 의 「서로 어긋난 것을 AI가 찾아 카드로 물어보는 화면 | 정리」는 게스트에게는 성립하지 않는다. 랜딩 문구 표에서 AI 가 무엇을 하는지 말하는 줄은 한 줄(「팀의 결정을 AI에게 꽂습니다」)뿐이다. AI 챔피언십에서 「사용자가 AI 를 체감하나」 축은 지금 사실상 0 이다.

또 하나 — README·제출서의 「서버측 AI 는 키가 없으면 픽스처 결과로 떨어집니다」는 **코드에 없다.** `job.ts` 는 키 없음을 `INTERNAL` 로 적고 화면은 「서버에서 처리하지 못했습니다」를 본다. 픽스처 폴백 구현은 어디에도 없고 주석만 「화면의 일」이라 한다(KNOWN_LIMITATIONS 조차 그 갈래는 존재하지 않는 §7.4 에만 있다고 적었다). 4개 기능 중 `ask`·`demo` 는 표에만 있고 라우트가 없어 — 정직하게 적혀 있긴 하나 — 가장 사용자가 체감할 「승인된 항목만 근거로 답하기」가 빠져 있다. 모델 정가 표는 코드 스스로 🙋 자리표시자(2.5 Flash 값을 3.5/3.6 에 임시 적용)라 예산 산정의 근거가 약하다. 탐지는 의도된 어긋남 3개에서 카드 5장을 냈다(재시도 규칙 하나가 3장) — 중복 검사가 「같은 짝」만 잡아서다.

**score_now 4.5** — 접속 링크·영상이 없고, 있다 해도 게스트는 AI 를 못 본다. AI 층의 공학 품질은 8점대인데 「작동하는 AI 서비스로 승부」라는 채점 축에서 보여 줄 게 없다. **score_if_shipped 7** — 배포 + 영상으로 owner 흐름(문서 붙여넣기 → 진행 막대 → 인용 붙은 후보 → 충돌 카드 → 결정 → 발행 → 터미널 sync)이 보이면 「어디에 AI 를 썼고 어떻게 막았나」가 전달된다. 8 이상은 데모 자체에서 AI 를 체감하게 만들어야 나온다(아래 1번).

점수를 올릴 행동:
- 게스트 데모에 「AI 한 번」을 넣는다 — SPEC §7.4 대로 `POST /demo/ai-once` (픽스처 goals.md + old-roadmap 을 §7.1→§7.2 에 넣어 카드 생성 · 결과 24h 캐시 · 게스트 IP 일 5회). `AI_FEATURES.demo` 와 한도 표는 이미 있고 필요한 건 라우트 + 게스트 쓰기 예외 한 줄 + 정리 화면의 버튼이다. 캐시가 있으니 두 번째 심사위원부터는 비용 0. 시간이 없으면 차선: `probe-87-run3.json` 의 실제 카드 5장을 데모 씨앗에 `contradiction` 행으로 심고 「2026-09-06 실측 결과」라고 적는다(지어낸 것이 아니다 · P7 은 a/b 항목 id 를 데모 항목에 매핑해야 지켜진다) [「데모에서 AI 체감 0」이 사라진다. 이 축에서 +2 — 가장 크다 · 8h]
- 2분 영상은 owner 로 로그인해 AI 가 도는 장면을 찍는다: 문서 붙여넣기 → 조각 진행 막대 → 후보 항목마다 원문 인용(quote)이 붙어 있음 → 「AI 제안」 배지가 붙은 충돌 카드에서 문서/코드 중 하나를 사람이 고름 → 발행 → 터미널에서 /contextops:sync. 마지막 10초에 「AI 는 질문만 하고 결정은 사람이 · 승인 뒤엔 LLM 없음」한 장 [데모를 안 눌러 보는 심사위원에게도 AI 자리 셋이 전달된다. +1 · 4h]
- README·SUBMISSION 의 「키가 없으면 픽스처 결과로 떨어진다」를 코드와 맞춘다 — 구현하거나(키 없음·BUDGET_EXCEEDED 일 때 `probe-87-run3` 기록을 결과로 보여 주고 「기록된 결과」 배지) 문장을 지운다. `readme.test.ts` 가 이런 주장을 못 잡는 것도 같이 본다 [심사 첫 질문이 될 거짓 주장을 없앤다. 신뢰도 방어 +0.5 · 1h]
- 랜딩 첫 스크롤에 「AI 가 하는 일 / 안 하는 일」 절을 넣는다 — 자리 셋(문서 구조화 · 충돌 질문 · 사용자의 Claude Code 로컬 추출)과 실측 카드 한 장(run3 의 「5회 백오프 vs 3회 고정」 질문 원문), 그리고 「승인 이후 LLM 없음 · 같은 snapshot → 같은 byte」. 문구는 `landing.tsx` 표에 두고 시험이 카드 문장을 probe 기록과 대조하게 한다 [AI 챔피언십 심사위원이 10초 안에 「AI 를 어디에 썼나」를 읽는다. +0.5 · 2h]
- 충돌 카드 과생성을 줄인다 — 같은 (a,b) 항목 쌍에서 나온 카드는 서버가 한 장으로 접고(질문은 첫 것 · 나머지는 note), SYSTEM 에 「같은 두 항목 사이의 어긋남은 한 장」 한 줄. 같은 김에 실측 실패율(3회 중 1회 문서 전체 실패)을 화면 문구에 반영해 「다시 시도」 버튼이 왜 있는지 말한다 [사람이 같은 결정을 세 번 하는 일이 없어지고 탐지 품질 질문에 답이 생긴다. +0.5 · 3h]

날카로운 질문:
- `/demo` 에 들어가면 AI 가 만든 카드가 한 장도 없고 항목 27개도 픽스처 시드입니다. 게스트는 `writes:false` 라 구조화를 누를 수도 없는데, 심사위원은 이 서비스에서 AI 가 동작하는 것을 정확히 어디서 봅니까? 그리고 README 의 「키가 없으면 픽스처 결과로 떨어진다」는 코드 어디에 있습니까?
- 진짜 Gemini 실측 3회 중 1회는 goals.md 문서 전체가 인용 불일치 하나로 `AI_OUTPUT_INVALID` 였습니다. 항목 단위 부분 성공 대신 문서 단위 all-or-nothing 을 고른 이유는 무엇이고, 실패율을 얼마로 보고 있으며, 「기준을 낮추지 않는다」는 원칙이 사용자에게는 「문서 하나 통째로 다시 올려라」로 보이는 것을 어떻게 설명합니까?
- P3 는 「4개 기능 한정」인데 `ask`·`demo` 는 표에만 있고 라우트가 없으니 실제로는 2개입니다. 가장 사용자가 체감할 「승인된 항목만 근거로 답하기」를 왜 절삭 1순위로 뒀습니까? 또 의도된 어긋남 3개에서 카드 5장(재시도 규칙만 3장)이 나왔는데 이것을 왜 중복으로 보지 않습니까? 덧붙여 `AI_MODELS` 의 3.5/3.6 Flash 정가가 2.5 Flash 값의 임시 복사라고 코드에 적혀 있는데, 하루 $3 예산은 무엇을 근거로 지켜집니까?

차별점:
- AI 의 자리가 「사람이 결정하기 전」으로만 한정되고 승인 이후는 LLM 없이 byte-identical 로 컴파일된다(P4 · golden 3종 · 셔플 테스트). 대부분의 참가작이 「AI 가 답한다」에서 끝나는 것과 달리 「AI 는 묻기만 하고 결정은 사람이」가 코드 구조로 강제돼 있다
- 환각 방지가 프롬프트가 아니라 검증 구조다 — 모델은 quote 를 내고 서버가 offset 을 계산(0곳·2곳 이상이면 재시도), 프롬프트에 없던 id 는 응답 전체 폐기, strict Zod 재검증, `<untrusted>` 감싸기(길이 보존 이스케이프). 시험 85개와 실패까지 기록한 진짜 Gemini 실측(probe-87)이 붙어 있다
- Claude Code 플러그인을 「사용자 본인의 Claude 를 거버넌스 아래 두는 로컬 추출기」로 쓴다 — Skill 셋 전부 `disable-model-invocation:true`, validate → --dry-run → 명시적 확인 강제, 훅은 LLM 없이 알림·힌트만(P6 쓰기 allowlist 를 게이트가 센다). 서버는 사용자의 Claude 구독을 절대 대신 부르지 않는다(P2)
- 서버 LLM 진입점이 `withBudget()` 하나이고 기계 게이트(`principles.ps1` P3)가 우회를 잡는다 — 입력 상한·기능별 빈도·일일 예산·실패 호출 기록까지 한 문에서. 해커톤에서 예산 장부를 DB 행으로 남기는 팀은 드물다
- KNOWN_LIMITATIONS 가 줄마다 코드 이름을 대며 「지금 안 되는 것」을 적었고 시험이 그 문서와 FINDINGS 를 대조한다 — 없는 기능(`ask`)을 제출서에 안 적는 정직함

약점:
- 게스트 데모에 AI 산출물이 0 — 충돌 카드는 전부 씨앗 질문(byAi:false), 항목 27개는 픽스처 시드, 게스트는 구조화를 누를 수 없다. 「사용자가 데모에서 AI 를 체감하나」 축이 비어 있다
- README·제출서의 「키가 없으면 픽스처 결과로 떨어진다」에 대응하는 코드가 없다(키 없음 → INTERNAL → 「서버에서 처리하지 못했습니다」). 문서와 코드가 어긋난 채 제출되면 첫 질문이 된다
- AI 기능 4종 중 `ask`·`demo` 라우트가 없다 — 가장 체감이 큰 「승인된 항목만 근거로 답하기」가 없어 AI 가치가 팀장의 정리 단계에만 머문다
- 강건성 — 최근 실측 3회 중 1회가 문서 전체 실패(재시도 후 AI_OUTPUT_INVALID). 항목 단위 부분 성공이 없어 사용자는 문서를 다시 올려야 하고, 그것이 시간당 5회 상한을 태운다
- 충돌 탐지 과생성 — 의도된 어긋남 3개에서 카드 5장. 중복 검사가 「같은 (a,b) 짝」만 봐서 같은 주제가 여러 장으로 갈린다
- 모델 정가 표가 코드 스스로 자리표시자(3.5/3.6 Flash 에 2.5 Flash 값)라 일일 예산 $3 의 산정 근거가 약하고, Gemini 무료 티어 분당 제한은 예산 가드 밖이라 동시 심사 시 429 가 난다
- 랜딩·README 가 「AI 를 어디에 썼나」를 거의 말하지 않는다 — 랜딩 문구 표에서 AI 역할 문장은 한 줄뿐. AI 챔피언십 심사 축과 첫 화면이 안 맞는다
- production 이 없어 AI 층이 개발 기계(PGlite · .env.local 키) 밖에서 돈 근거가 0 — Vercel 함수에서 `fixtures/` 탐색·환경변수·타임아웃(goals.md 구조화 19~35초)이 될지 미검증

