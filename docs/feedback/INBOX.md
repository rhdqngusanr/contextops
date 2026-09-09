# INBOX — 사람이 루프에게

> **루프가 매 바퀴 제일 먼저 읽는 파일이다.** 여기 뭐가 있으면 그게 이번 바퀴의 일이고,
> `PLAN.md`·`FINDINGS.md` 보다 위다.
>
> 사람은 여기에 적기만 하면 된다. 루프가 처리하면 **「끝난 것」으로 옮기고** 커밋 해시를 붙인다.
>
> ⚠ **루프도 이 파일을 고친다.** 그래서 사람이 미리 적어 둔 것이 루프의 커밋에 덮일 수 있다.
> 밤새 돌릴 지시는 여기 말고 `loop/HANDOFF.md` 에 적어라 — `relay.ps1` 이 1차 루프가
> **죽은 뒤에** 꽂아 넣어서 경쟁이 없다.

## 할 것

### 🔴 대회 제출 계획 — 2026-09-09 감사 (제출 마감 9/20 · 참가 접수 마감 9/18)

> **출처**: 사람 세션이 에이전트 65개로 저장소를 감사했다(영역 11 · 모의 심사위원 4 · 발견 122 → 반박 검증 생존 97).
> 상세·근거(file:line)는 `docs/evidence/2026-09-09-audit/`. 대회 규칙 원문(FAQ·약관)은 그 폴더의 README 에.
> **이 절이 비기 전에는 아래 옛 절·FINDINGS·PLAN 보다 위다.** 순서는 블로커 → 고장 → 고가치.
> 🙋 는 계정·녹화·결정이 필요해 **사람만** 할 수 있다 — 루프는 그 항목을 건너뛴다.
> 한 바퀴에 한 항목. 끝나면 「끝난 것」으로 옮기고 해시를 붙인다.

#### 대회가 요구하는 것 (공식 페이지 · 2026-09-09 확인)

- 제출물 = **배포된 서비스 링크(정상 작동 필수)** + 해결 문제 + AI 활용 방식 + **사용 AI 툴(필수 기재)**. 영상·슬라이드·썸네일은 요구 없음. 임시저장 불인정.
- 예선 = 내부 심사 80%(기획력 · 실현 가능성 · 확장성 · AI 활용 적절성) + 온라인 투표 20%. 본선 = 기획력 · 확장성 · 기술력 · 발표 전달력.
- **심사 기간(9/21~10/5) 링크 접속 불가 = 제외될 수 있음.** 개인정보·기밀 포함 금지. 유료 API 비용 본인 부담.

#### 블로커 — 이것 없이는 제출이 안 되거나 첫 질문에서 무너진다

| # | 무엇 | 누가 | 언제 | 완료 기준 | 상태 |
|---|---|---|---|---|---|
| B1 | 🙋 **참가 접수** + 제출 폼의 칸·글자 수·썸네일 규격 캡처(`docs/evidence/2026-09-09-submission-form/`) · 🙋 **밀린 커밋 push**(공개 저장소가 이틀 전 코드라 README 설치 첫 줄이 실패한다) · 이 계획의 INBOX 이관 | 사람 + Claude | 9/9 | 접수 완료 · origin/main == 로컬 · 이 절이 있다 | 이관 ✅(이 커밋) · 접수·push 🙋 |
| B2 | **배포를 막는 코드 4건 → production** — cron 하루 1회 · 함수 리전 서울 · `maxDuration` 300(정본 `apps/web/src/lib/api/vercel.ts`) · RLS 마이그레이션 0008 → 🙋 Vercel Import → 첫 리셋 curl → `verify:prod` 0 failed. 절차·시간은 `docs/DEPLOY.md` 「가장 빠른 길」 | Claude → 사람 5~8h | 9/9 코드 · 9/10 배포 | verify.json 이 evidence 에 · SUBMISSION 🙋 표에 https:// | 코드 4건 ✅(이 커밋) · 배포 🙋 |
| B3 | **Supabase 로그인 실제 통과 + Data API 끄기** — 실측: GitHub 공급자 OFF · 서명키 ES256(검증기는 HS256 만) · anon 키 REST 200. 🙋 대시보드 걸음(`docs/DEPLOY.md` ①-b) · Claude: `session.ts` alg 표 두 갈래(HS256 secret · ES256 JWKS kid · aud/iss) + 시험 3 · 이메일 문을 플래그 뒤로 숨기고 `/demo` 안내 · `e2e/production.ts` 에 로그인 문 검사 2 | 사람 1h + Claude 4.5h | 9/10 | GitHub 로그인 → 팀 생성 201 캡처 · anon REST 가 200 이 아님 | **코드 ✅**(세션 검증기 alg 표 HS256·ES256 + aud/iss · 이메일 문 플래그 뒤로 · 콜백 원인 코드 · `verify:prod` 가 공급자·JWKS·Data API·로그인 버튼을 잰다) · 🙋 대시보드 걸음 대기 |
| B4 | **플러그인 사용자 경로 실기** — SKILL.md 셋의 `$CLAUDE_PLUGIN_ROOT` 를 `${…}` 형태로(+ 그 반대를 강제하던 `skills.test` 뒤집기) · `/contextops:setup` · `/contextops:progress` Skill 추가 · Pack 진행 문단이 그 Skill 을 가르치게(TEMPLATE_VERSION↑ · golden 재생성) · 「기기 추가」 명령 문자열을 Skill 호출로 · 설치 첫 줄 「Node 20+」 · plugin.json repository/homepage/license → 🙋 이 기계에서 `claude plugin marketplace add ./` → install → 새 저장소 세션 → 훅 → setup → sync → progress 가 production Roadmap 을 움직이는지 transcript(`docs/evidence/2026-09-11-plugin-install/`) | Claude 6.5h + 사람 2.5h | 9/11 | transcript 가 있다 · skills.test 가 `${}` 를 강제 | **코드 ✅**(SKILL.md 셋 `${CLAUDE_PLUGIN_ROOT}` · `setup`·`progress` Skill 신설 · Pack 문단이 `/contextops:progress` 를 가르침(TEMPLATE_VERSION 1.6 · golden 재생성) · 「기기 추가」 줄의 머리가 `/contextops:setup` · 설치 안내에 Node 22 · plugin.json repository/license · 재생 픽스처 갱신) · 🙋 실기 설치 대기 |
| B5 | **게스트 데모에 AI 산출물 심기** — ① 9/12 `fixtures/paylab-docs/goals.md` 의 M1~M3·G1~G3 기한을 **같은 10자**(2026-10-31 · 11-30 · 12-31)로 교체(인용 offset 보존 · 따라오는 씨앗·시험·리플레이 갱신 · offset 대조 1회 · evidence README 에 변경 이력 한 줄) ② 9/13 씨앗에 `docs/evidence/2026-09-07-p3-gemini/` probe-87-run3 의 충돌 3장(a/b 항목 id 매핑) + AiBadge 「AI 제안 · gemini-3.5-flash」 + 본문 「2026-09-07 실측 기록 · 이 데모에서는 재실행되지 않습니다」 + 완료된 구조화 job 1건 · SUBMISSION 에 같은 문장 ③ 조건부(9/14 저녁 판단 · 앞이 다 닫혔을 때만 9/15) `POST /demo/ai-once`(게스트 IP 축 · 일 5회 · 24h 캐시) — 9/16 안에 안 끝나면 버린다 | Claude 6.5h (+9h 조건부) | 9/12~13 | 정리 화면에 AI 배지 카드 3장 · 카드 본문에 기록 문장 · Roadmap due 전부 미래 | 대기 |
| B6 | **제출 요건 문서·동결** — `docs/SUBMISSION.md` 맨 위에 「대회 규정 원문(2026-09-09 확인)」 절 + 「제출 폼 원문」 절(4칸 초안은 evidence 의 plan · 폼 상한으로 길이 시험) + 「URL 이 오면 지울 문장 목록」 + URL 이 있으면 세 문서에 「production 이 아직 없」 0건 시험 · 🙋 표에 「참가 접수」 행 · 9/15 랜딩 HTML 에 제출 4칸 텍스트(제3자 평가 솔루션용) · 🙋 9/18 저녁 `release` 브랜치 → Vercel Production Branch · Preview 끄기 · `loop/STOP` · 🙋 9/19 제출(임시저장 아님) | Claude 1.5h + 사람 1.5h | 9/10 · 9/18 · 9/19 | 폼 4칸 == SUBMISSION 절 · Production Branch=release · 제출 확인 캡처 | 대기 |

#### 고장 15 — 심사 중 터질 수 있는 것 (B 에 든 것은 표시)

| # | 고장 | 근거 | 고침 | 시간 |
|---|---|---|---|---|
| G1 | ~~health cron 6시간 → Hobby 배포 거부~~ | `vercel.json` · `demo-reset.test.ts` | ✅ 이 커밋 (B2) | — |
| G2 | Supabase GitHub 공급자 꺼짐 — 로그인 버튼이 죽어 있음 | `/auth/v1/settings` external.github=false | 🙋 대시보드에서 켜기 (B3) · 검사 ✅ (`verify:prod` 가 external.github 를 잰다) | 0.5h |
| G3 | 세션 검증기 HS256 만 · 프로젝트 키는 ES256 | JWKS · `src/lib/api/session.ts:53` | ✅ (B3 코드) — alg 표(HS256·ES256) + aud/iss + `test/session-jwt.test.ts` 13 | — |
| G4 | 매직링크 실패가 사용자 탓으로 읽힘 — 기본 SMTP 는 외부 주소 거절 | `lib/web/auth.ts:55-62` | ✅ (B3 코드) — `NEXT_PUBLIC_AUTH_EMAIL_LOGIN` 플래그 뒤로 · 문구 · 콜백 원인 코드 + /demo 문 | — |
| G5 | SKILL.md 셋 + Pack 진행 문단의 `$CLAUDE_PLUGIN_ROOT`(중괄호 없음) | `skills/sync/SKILL.md:16,38,55` · `skills.test.ts:66-71` | ✅ (B4 코드) — `${…}` 형태 + 시험이 bare 형태를 금지 · 진행 보고는 `/contextops:progress` Skill | — |
| G6 | 「기기 추가」가 복사해 주는 `contextops setup …` 은 PATH 에 없다 | `schema/plugin.ts:81` → `sync.tsx:389` | ✅ (B4 코드) — `SETUP_COMMAND_NAME = '/contextops:setup'` · Skill 이 `setup $ARGUMENTS --no-browser` 로 CLI 를 부른다 | — |
| G7 | Stop 훅이 **매 턴** 돌아 진행 이벤트가 턴마다 쌓임 · 중복 방지 env 이름 오타(`CLAUDE_SESSION_ID`→`CLAUDE_CODE_SESSION_ID`) · 5.5s > timeout 5s | `stop.mjs:151-168` · `progress.ts:39` | SessionEnd 로 이전 또는 세션·마일스톤 표시 파일(`_writes` 선언) + 「두 번 → 1건」 시험 | 3h |
| G8 | `AI_OUTPUT_INVALID` retryable:false — 화면은 「다시 시도」인데 버튼이 없음 · 실측 실패율 약 1/3 은 비결정 | `schema/api.ts:107` · `retry/route.ts:17-21` | retryable:true + 재시도 상한 2 + 닻 시험 뒤집기 | 1.5h |
| G9 | 「GEMINI_API_KEY 없으면 픽스처 결과로 떨어진다」 문서 4곳이 거짓 — 실제는 INTERNAL | `.env.example:42,44,50` · `DEPLOY.md` · `SUBMISSION.md:130` · `README.md:243` · `lib/ai` 에 fixture 갈래 0 | 문서 정정 + `AI_NOT_CONFIGURED`(503) 코드 + `/health` 에 ai 칸 | 2h |
| G10 | AI 모델 정가가 실제의 1/5(입력)·1/3.6(출력) — $3 가드가 $11~15 통과 | `features.ts:142-143` | 🙋 정가 확인 뒤 두 줄 + 출처 주석 | 0.5h |
| G11 | manifest.json 이 커밋된 저장소를 clone 한 팀원이 `manual` 로 오판 | `managed.ts:179-190` | git 추적 중이면 applied · clone 시험 | 1h |
| G12 | 승인 0개 발행의 정답 문장이 「입력한 내용을 다시 확인해주세요」로 뭉개짐 | `publish.ts:52-56` · `lib/web/api.ts:85` | EMPTY_SNAPSHOT 이면 정본 문장 + [초안 보기] | 1h |
| G13 | 게스트에게 draft 제안 [승인 요청] 활성 · 「owner 가 합니다」 두 문장이 게스트에겐 거짓 | `proposals.tsx:425-429,463` · `conflict-card.tsx:186-189` | author 갈래 + `writeDoor().reason` 우선 + 게이트 | 1h |
| G14 | 경로가 escape 없이 태그·frontmatter·백틱에 들어감 — `-->`·`,` 한 글자로 P7 태그가 깨짐 | `tag.ts:38` · `common.ts:65-66` | 방어선만(safe + 치환 + JSON.stringify) · escape.test 표본 5 | 1.5h |
| G15 | KNOWN_LIMITATIONS 「브라우저 e2e 가 없다 · e2e 폴더가 없다」 — 실제 `apps/web/e2e` 9파일 | `KNOWN_LIMITATIONS.md:66-67` | 사실로 교체 + 「없다고 적은 경로가 실존하면 FAIL」 시험 | 0.5h |

#### 고가치 11 — 효과/시간 순 (블로커·고장이 닫힌 뒤)

1. **H1 문서 정직성 묶음**(3h) — G9 의 「픽스처」 4곳 · G15 · 「관통 7단계」(실제 9) · README 숫자(표 16→18) · SPEC §12 Playwright · readme.test 에 「없다고 적은 경로가 실존하면 FAIL」.
2. **H2 OG 태그·파비콘·metadataBase·게스트 재방문 복구**(2.5h) — `app/icon.svg` · `app/opengraph-image.png` 1200×630 · `layout.tsx` metadata · NeedsLogin 에 [샘플 팀 다시 열기 → /demo] · 게스트 TTL 24h. 온라인 투표 20%.
3. **H3 제출서·README·랜딩의 「AI 활용」을 숫자와 이유로**(5h) — 실측 표(3,900자 · 항목 16 · 충돌 5 · 인용 20/20 · 약 20초 · 약 $0.02) · 「왜 서버는 Gemini」(P2·P3 · 공급자 교체가 `client.ts` 하나) · 도구 3층 · 사업 모델 4문장(코어 MIT+셀프호스팅 · 팀 단위 과금 · 첫 고객 = Claude Code 표준 10~50인 조직) · 경쟁 카드 · 「왜 지금」 · 심사위원 3분 코스 · README 첫 스크롤 캡처 3장 · 랜딩 하단 제출 4칸 텍스트.
4. **H4 개인정보 처리방침 + Gemini 전송 고지 + 🙋 Gemini Tier 1 결정**(3h) — `app/privacy` · 랜딩 푸터·로그인 카드 링크 · PasteCard 에 「Google Gemini API 로 전송(국외)」 · KNOWN_LIMITATIONS 「AI 처리 데이터의 행방」. 🙋 AI Studio 빌링 연결이 문장을 정하므로 9/10 계정 작업에 같이.
5. **H5 라이브 구조화 실패 처리**(4h) — G8 · G10 · [예시 문서 붙여넣기] 버튼(goals.md · 실측 20/20) · 힌트 문구 · RATE_LIMITED 백오프 1회.
6. **H6 심사 기간을 견디는 장치**(4.5h) — `reset.ts` 를 「임시 slug 로 먼저 심고 성공 시 교체」로(실패 = 옛 데모 유지) · `.github/workflows/watch-prod.yml`(30분 · dispatch · 🙋 만든 날 일부러 깨서 메일 확인) · `ci.yml` 에 `pnpm --filter web build` · DEPLOY 「심사 기간 런북」 · 배너 「03시경」.
7. **H7 게스트 UX 2종**(6h) — `writeDoor()` 를 PasteCard·QuestionStack·Answer·ProposalDecisions 앞에 + G13 + 「쓰기 버튼은 전부 writeDoor 를 지난다」 게이트 · `ITEM_TYPE_LABEL` 표 · 칩 한글 · 드로어 KeyValue.
8. **H8 2분 영상**(Claude 3h + 🙋 4h) — `docs/PITCH.md` 컷 표 8컷 + 슬라이드 8장 뼈대 → 🙋 9/17 production 위에서 녹화 · 「15분」 스톱워치 실측 · 플러그인 세 장면 GIF · mp4 두 곳 보관 · `demo:db` 로컬 리허설(본선 보험). 규정상 필수 아님 — 투표·본선 자산.
9. **H9 로그인 뒤 「내 팀」 홈 + 팀원 초대 API**(7h) — `app/t/page.tsx` · `POST/GET /teams/{id}/members` · 첫 로그인 승격 · 시험 「초대 전 404 → 후 200 · member 는 publish 403」. 심사 두 번째 질문.
10. **H10 플러그인 고장 3건**(6h) — G7 · 첫 sync 가 기존 CLAUDE.md 를 경고 없이 교체(`preexisting` 게이트) · G11. 밀리면 첫 번째로 자른다.
11. **H11 발행 흐름 고장 2건 + AI 예산 actor 축 + 목록 상한**(5.5h) — G12 · G14 · `AI_FEATURE_LIMITS` 에 perActorDaily(팀별+전역 이중) · 팀 3/사용자 · 프로젝트 5/팀 · `fetchItems` limit 200 + 「200개까지만」.

#### 하지 말 것 (시간을 먹고 점수는 안 오른다 — 근거는 evidence 의 plan)

역추적 태그 형식 변경 · 제출 전 질의창(ask) · 9/16 이후 ai-once · 브라우저 e2e GATE1·진짜 Next 위 e2e-sync·관통 ubuntu 이식(합 17h) ·
CSP 헤더·프로세스 내 레이트 리밋·대안 배포 · refresh_token 갱신 코드·9/10 SMTP · 리셋 시각 이동을 실패 대응으로 삼기 ·
9/18 동결 뒤 스키마 변경·main 자동 배포 유지·Preview 켜 두기 · 씨앗 질문에 roadmap 추가 · RepoPath 정규식 조이기 ·
씨앗 AI 카드를 「방금 찾은」 것처럼 보이게 하기 · 랜딩 절 순서·팀명·i18n·STATUS 축약.

#### 날짜별 (하루 사람 + Claude 합 6~8h · 예비일은 9/20 하루)

9/9 접수·push·코드 4건(✅) → 9/10 배포·로그인 실측·Gemini 티어·SUBMISSION 규정 절 → 9/11 플러그인 실기(+ 저녁 루프 재개 여부 결정) →
9/12 기한 문자열 교체·구조화 실패 처리 → 9/13 AI 산출물 심기·문서 정직성·OG → 9/14 감시·리셋 구조·privacy · **저녁 판단 지점** →
9/15 AI 활용 문서·PITCH(또는 ai-once) → 9/16 팀원 초대·/t 홈·writeDoor → 9/17 🙋 녹화·한글 라벨·Stop 훅 → 9/18 최종 대조·🙋 release 동결·STOP →
9/19 🙋 제출 → 9/20 예비(손대지 않는다).

---

### 🔴 사람이 화면을 직접 열어 QC 했다 — 확인된 결함 넷 (2026-09-06)

`pnpm --filter web demo:db` + `next dev` 로 **실제로 띄워서** 브라우저로 봤다.
아래는 짐작이 아니라 **계산된 스타일·서버 로그에서 잰 것**이다.
먼저 이 넷을 `FINDINGS.md` 에 번호를 붙여 옮기고, 아래 「순서」대로 진행해라.

> 루프(67바퀴): 넷을 **FINDINGS 127 · 128 · 129 · 130** 으로 옮겼다. ① 은 닫았고(아래 「끝난 것」 · `2134011`)
> 68바퀴: ② 도 닫았다(`9319617` · 커밋은 69바퀴가). 69바퀴: ③ 도 닫았다(`0a3535e`). 70바퀴: ④ 도 닫았다(`1bc1da3`). **넷 다 끝났다** — 다음은 아래 「순서」 2(PLAN P1 첫 행)다.

#### ✅ 같이 잰 것 중 **통과**한 것 (지금 상태를 지켜라)

- **대비**: 제목 17.3 : 1 · 본문 14.2 : 1 · 메타 8.9 : 1 — 전부 WCAG AA(4.5)를 크게 넘는다
- **모바일(375px)**: 가로 스크롤 **0**. 긴 명령줄도 자기 컨테이너 안에서만 넘친다 — 설계대로다
- **에러 상태 자체의 짜임**: 아이콘 + 문장 + [다시 시도] + `request_id` 가 다 있다. 좋다

---

### 🔴 이 순서로 진행해라

1. **위 ①②③④ 를 `FINDINGS.md` 에 옮기고** ① → ② → ③ → ④ 순으로 닫는다.
   ①②는 **고장**이라 PLAN 보다 위다 (④3 규칙). ③④는 격차지만 **랜딩·데모가
   심사의 첫 화면**이라 이번만 PLAN P4 둘째 행의 몫으로 같이 닫는다.
2. ✅ **PLAN P1 첫 행(DB 마이그레이션)** — `apps/web/.env.local` 에 Supabase 값이 꽂혀 있고
   접속도 확인됐다(PostgreSQL 17.6). 마이그레이션을 실제로 돌려 표 16 · 인덱스 5 를
   확인하고 행을 닫아라. ⚠ 실패하면 **원인을 적고 멈춰라** — 지어내지 마라.
   > 루프(71바퀴): **닫았다** (`adac632` · 아래 「끝난 것」). 잰 수는 표 **18** · 인덱스 **8** 이다 — 「16 · 5」는 P0 때 수치고
   > 정본(`src/db/schema.ts` · `INDEX_NAMES`)이 P3 에서 `ai_usage`·`ai_jobs` 만큼 늘었다. 다음은 순서 3(FINDINGS 126).
3. ✅ **PLAN P6 둘째 행의 제출서**(FINDINGS 126) — SPEC §16 을 저장소 문서로 만든다.
   🙋 공개 저장소 URL · 팀명 · 영상 링크는 **자리표시자**로 두고 그 자리를 명시해라.
   > 루프(72바퀴): **닫았다** — 그런데 만든 게 아니라 **이미 있던 것**을 확인했다. `docs/SUBMISSION.md` 는 67바퀴가 `4f90239` 로
   > 올렸는데 그 바퀴가 대장·PLAN·여기를 안 닫아서 네 바퀴가 「다음은 126」을 물려받았다. 제출서의 주장을 코드와 다시 대조해
   > 어긋난 곳 0 · 시험 32/32 (아래 「끝난 것」). 다음은 순서 4(구멍 → 격차) — 122 는 🙋 두 값이 와야 하고 117 은 절삭 1번이라 **115** 부터.
   > ⚠ 단, 이 바퀴 끝에 CI 가 코드와 무관하게 빨개졌다(게임이 켜진 부하에서 PGlite 기동이 10초 훅 상한을 넘김 · **FINDINGS 136 [고장]**) —
   > 고장은 순서보다 위라 다음 바퀴는 136 → 115 다.
   > 루프(73바퀴): **136 을 닫았다** (`767a33e` · 훅 상한을 `vitest.base.ts` 한 곳으로 · 부하 100% 에서도 33/33 · CI GREEN). 다음은 순서 4 의 **115**.
   > 루프(74바퀴): 순서 4 의 첫 항목 **115 를 닫았다** (`4d0ba9a` · CLI 가 웹 주소를 안 짓는다 — `upload-draft` 의 같은 줄도 · `where.ts` 한 곳 · 게이트 시험 3).
   > 다음은 **114** — 「항목별 승인/거절」은 **② 문서를 코드에 맞춘다**(DESIGN_BRIEF 의 그 줄을 「한 장 단위」로)로 간다. 🙋 ①(항목별 결정 표 + 발행 변경)을 원하면 여기 한 줄 적어라.
   > 루프(75바퀴): **114 를 ② 로 닫았다** (`e7e0513` · DESIGN_BRIEF 화면 6 + SPEC §9 6번 행을 「제안 한 장 단위」로 · 문서 ↔ 스키마 ↔ 화면 게이트 4 · 코드 0줄).
   > 🙋 ① 은 여전히 열려 있다 — 원하면 여기 한 줄. 113·110 은 이미 닫혀 있었고(57바퀴) 다음은 구멍 **111**(Manifest 마일스톤의 `due`).
   > 루프(76바퀴): **111 을 닫았다** (`4109f5e` · Manifest 마일스톤이 `due` 를 나른다 · 화면 8 행에 `due YYYY-MM-DD` · COMPILER_VERSION 0.2.0). 다음은 구멍 **108**(`answerSlot` 세 갈래), 그 뒤 격차(121+135 · 119 · …).
   > 루프(77바퀴): **108 을 닫았다** (`7e29d06` · `answerSlot` 값마다 한 줄인 표 `ANSWER_SLOT_DRAFTERS` · `none` 은 400 · 시험 +6). 구멍 중 루프가 혼자 닫을 것은 **다 떨어졌다** (122 🙋 · 117 절삭 1번). 다음은 격차 **121+135**(게스트 403 문구 · 읽기 전용 버튼), 그 뒤 119 · 118 · 116 · 112 · 131~134.
   > 루프(78바퀴): **121+135 를 같은 바퀴에 닫았다** (`816420b` · 화면이 서버와 같은 표 `ACTOR_RULES` 를 읽는다 · 게스트가 [발행하기] 를 누르면 모달 대신 그 자리에 이유 · 403 문구는 `GUEST_HINT` · 실제 브라우저로 dialog 0 · 「owner」 0 · 시험 +11). 🟡 E 도 이걸로 닫혔다(「다음 리셋까지 남은 시간」은 안 붙임 — 배너가 이미 03:00 을 말한다). 덤으로 **137**(데모 `/import` 의 시드 job 이 「멈춘 것 같음」) 을 적었다. 다음은 격차 **119**, 그 뒤 118 · 116 · 112 · 131~134 · 137.
   > 루프(90바퀴): **116 을 닫았다** (`0d60992`·`0b259ac` · 화면 6 이 「누가 결정했나」를 이름으로 · 칸 표가 자리 이름을 받는다 `userRefColumns(자리, 표)` · 결정자는 `alias(users,'deciders')`(별칭이 없으면 작성자 이름이 그 칸에 앉는다) · 낱말은 `DECIDED_BY_LABEL` · 시험 +6 · 덤프를 읽고 「올린 사람 —」 을 잡았다). 다음은 격차 **112**(제안 목록 거르개), 그 뒤 59 · 100 · 131~134 · 137.
   > 루프(91바퀴): **112 를 닫았다** (`25b9bad` · 화면 6 목록이 `?status` 로 걸린다 · 거르는 것은 **서버**(화면에서 거르면 `?limit=50` 안의 것만 걸러진다) · 칩은 `PROPOSAL_STATUSES`·`PROPOSAL_STATUS_CHIP` 표를 읽는다 · **개수는 안 적는다**(거른 목록만 손에 있는 화면은 그 수를 모른다) · `author` 거르개는 여전히 없다(고를 이름의 목록을 내는 문이 없다) · 시험 +4). 다음은 격차 **59**, 그 뒤 100 · 131~134 · 137.
   > 루프(92바퀴): **59 를 닫았다** (`175d339` · 실패한 job 을 다시 굴리는 문 · 되는 실패는 `ERROR_STATUS` 의 새 축 `retryable` 한 표가 정하고 서버와 화면 3 이 그 하나를 읽는다 · `BUDGET_EXCEEDED`·`RATE_LIMITED`·`INTERNAL` 셋만 true · 시험 +11).
   > ⚠ **CI 가 빨간 채로 커밋했다 — 이 변경 때문이 아니다.** 같은 시각에 **다른 세션이 README 를 고치는 중**이라(`b07bcb7`·`208bedf` · 둘 다 「사용자 지시」) `readme.test.ts` 넷이 빨갛다 (**FINDINGS 155 [고장]**). 나머지 717 전부 초록 · principles·typecheck·docs OK. 루프는 README·랜딩을 안 건드렸고 **건드리지 않는다**(문장의 정본이 랜딩 상수라 둘을 같이 고쳐야 한다).
   > 다음 바퀴는 CI 를 한 번 돌려 그 넷이 초록인지 보고(155 확인), 그 뒤 **154**(멈춘 job 을 되살릴 문 · 이번 바퀴가 지었다) → 100 → 131~134 → 137.
   > 루프(93바퀴): **154 를 닫았다** (`f0e2f25` · 멈춘 job 은 되돌리지 않고 **닫고 새로 만든다** · 갈래의 정본은 `AI_JOB_RETRY_RULES` 한 표 · 서버와 화면 3 이 `jobRetryMode()` 하나를 부른다 · 시험 +8 · 725 통과).
   > **155 는 아직 빨갛다** — CI 를 두 번(05:50 · 06:04) 돌렸고 같은 `readme.test.ts` 넷이다. 그 세션이 README 를 계속 고치는 중(마지막 `eceaaab`)이라 **확인만** 했다. 덤으로 **156**(집히지 않은 채 `queued` 로 남는 job)을 적었다.
   > **100 은 이미 닫혀 있었다**(`a87994d`) — STATUS 가 여러 바퀴 동안 대기로 나열하고 있었다. 다음은 **132**(⌘K 명령 팔레트)다 — 131 은 `landing.tsx` 가 남의 세션 손에 있고 관통 `shots` 단계가 아직 SKIP 이라 155 뒤로 미뤘다.
   > 루프(94바퀴): **132 를 닫았다** (`d2ac4bb` · 명령 팔레트 `⌘K` — **이동과 검색만** · 갈 곳의 정본을 `layout.tsx` 의 `TABS` 에서 `lib/web/screens.ts` 의 `PROJECT_SCREENS` 로 올려 내비·팔레트·plugin 게이트 셋이 그 하나를 읽는다 · 시험 +19 · 진짜 브라우저로 봤다 `docs/evidence/2026-09-07-command-palette/`: option 7줄 · `Enter` → `/…/sync` 로 실제 이동 · `esc` → dialog 0).
   > 🙋 **B 중 「프로젝트 전환」은 못 했다** — 「내가 볼 수 있는 프로젝트」를 내주는 문이 0곳이라(POST 뿐) 목록을 지어내면 남의 팀이 보인다. **FINDINGS 157**(구멍)로 적었고 다음 바퀴가 그 문부터 연다.
   > **155 는 세 바퀴째 빨갛다** — CI 두 번(06:12 · 06:21) 같은 `readme.test.ts` 넷이고 그 세션의 커밋은 `eceaaab` 에서 안 늘었다. 확인만 했다.

4. 그 다음 **미해결 FINDINGS 를 구멍 → 격차 순**으로 소진한다.

⚠ 나머지 PLAN 행(P3 서버 AI · P5 Vercel · P6 영상)은 **사람이 키·계정을 줘야 열린다.**
거기 닿으면 건너뛰고 `STATUS.md` 「막힌 것」에 적어라.

---

### 🟡 더하면 좋을 것 다섯 — **위 결함 ①~④ 를 다 닫은 뒤에** 손대라

> 사람이 유명 서비스(Linear · Vercel · Stripe · Supabase · GitHub)와 나란히 놓고 본 뒤
> 고른 것이다. **고장이 아니라 「있으면 점수가 갈리는 것」**이라 순서가 뒤다.
> ⚠ 하나씩, `FINDINGS.md` 에 [격차]로 번호를 붙여 옮긴 뒤 한 바퀴에 하나만.

> 루프(71바퀴): 다섯을 **FINDINGS 131(A) · 132(B) · 133(C) · 134(D) · 135(E)** 로 옮겼다 — 전부 [격차] · 주인은 PLAN P4 둘째 행.
> 순서는 위 「이 순서로」의 3(126 제출서) → 4(구멍 → 격차) 그대로다.
> 루프: **B ✅**(132 · 94바퀴 `d2ac4bb` · 프로젝트 전환은 157 로 95바퀴 `d95f7ca`) · **C ✅**(133 · 96바퀴 `e3e48fe`) ·
> **D ✅**(134 · 97바퀴 `fe7cc98`) · **E ✅**(135 · 78바퀴 `816420b`). 남은 것은 **A**(131 · 랜딩의 제품 화면)뿐이고,
> 그건 155 가 닫힌 뒤다 — 랜딩을 다른 세션이 고치는 중이다.

| # | 무엇 | 왜 |
|---|---|---|
| **A** | **랜딩 첫 화면에 제품이 움직이는 그림** — 실제 스크린샷 또는 20~30초 GIF | 지금 Before/After 가 **텍스트 카드**다. Linear·Vercel·Supabase 랜딩의 공통점은 **제품 화면이 첫 스크롤 안에** 있다는 것이다. 심사위원은 10초 안에 판단한다. ★ `.ci/shots/` 로 캡처를 찍는 구조가 이미 있으니 그걸 랜딩이 읽게 하면 된다 — **손으로 만든 그림을 넣지 마라.** 관통이 낸 진짜 화면이어야 한다 |
| **B** | **명령 팔레트 `⌘K`** — 화면 9개 · 프로젝트 전환 · 항목 검색 | 개발자 도구에서 이건 거의 **기대치**다 (Linear · Vercel · GitHub). 화면을 오가는 제품이라 효과가 크다. ⚠ 과설계 금지 — **화면 이동과 검색만**. 하나뿐인 구현에 추상을 만들지 마라 |
| **C** | **빈 상태에 다음 행동을 붙인다** | 로딩·에러는 잘 돼 있는데(아이콘+문장+재시도+`request_id`) **「항목이 없습니다」에서 갈 곳이 없다.** 첫 사용자가 거기서 막힌다. 예: 항목 0개 → `[가져오기로 이동]` · 제안 0개 → `[Context 에서 만들기]` |
| **D** | **`prefers-reduced-motion` 대응** | 접근성 점검에 잘 걸리는 항목이고 CSS 몇 줄이다. 애니메이션이 있는 곳(스켈레톤·전환)에서 움직임을 끈다 |
| **E** | **`/demo` 가 「저장되지 않는다」를 더 분명히** | 배너는 있지만, 심사위원이 버튼을 눌러 보다 **「왜 저장이 안 되지」** 하고 헤맬 자리가 있다. 읽기 전용 버튼에 이유를 붙이거나(FINDINGS 121 과 같은 자리) 다음 리셋까지 남은 시간을 보여 준다 |

⚠ **A 를 할 때 주의** — 랜딩은 정적 화면이라 캡처를 저장소에 넣게 된다.
`.ci/shots/` 는 관통마다 지워지므로 **거기서 읽지 말고**, 관통이 낸 것을
`apps/web/public/` 아래로 **복사하는 단계**를 관통에 두고 그 파일을 랜딩이 읽어라.
그래야 「그림이 낡았는데 아무도 모르는」 상태가 안 생긴다.

_(비어 있음)_

## 끝난 것

### ✅ 값이 생겼다 — 공개 저장소 URL · 제출 팀명 → `846530a` (2026-09-06 · 80바퀴 · FINDINGS 122 ✅ · 140 기록)

- **정본 하나**: `apps/web/src/components/landing.tsx` 의 `SUBMISSION_IDENTITY { team, repoUrl, limitsPath }`. 푸터 `LANDING_FOOT` 은 그것을 읽어
  팀명 · GitHub · Known limitations(저장소의 `docs/KNOWN_LIMITATIONS.md` — 앱에 페이지를 또 만들지 않았다) 셋을 낸다.
- README 머리의 「🙋 … 아직 없습니다」 문단은 지우고 팀명 · URL · 정본이 어디인지 한 줄 · 🙋 production URL 만 남겼다. `docs/SUBMISSION.md` 🙋 표는 둘을 채우고 셋(production URL · 영상 · 슬라이드)은 🙋 그대로.
  마크다운은 상수를 못 읽으니 `apps/web/test/readme.test.ts` ①-B(6) 가 세 곳 동일 · `.git/config` origin 동일 · 팀명 공백 0 · 「아직 없」 문장 0 을 센다. `web-landing.test.ts` 는 밖 링크가 repoUrl 아래뿐 · `rel="noreferrer"` 2.
- 팀명은 적어 준 그대로 `퇴직했는데저좀이직시켜주세요` (공백 없음 · 시험이 잠근다).
- ⚠ **`<marketplace>` 는 못 채웠다** — 값이 없어서가 아니라 저장소에 `.claude-plugin/marketplace.json` 이 없어 URL 을 넣으면 첫 명령이 실패하기 때문이다. **FINDINGS 140**(구멍 · 주인 PLAN P5 둘째 행)으로 적었다.
  목록 파일을 두는 것은 루프가 할 수 있지만 「새 PC 에서 `marketplace add → install → /contextops:init` 이 지난다」까지가 완료라 🙋 새 PC 와 같이.
- FINDINGS 126(제출서)은 이미 닫혀 있었고(72바퀴) 팀명 자리만 이번에 채웠다.

<details><summary>원문</summary>

**원문 — 🔴 값이 생겼다 — 자리표시자를 실제 값으로 채워라 (사람이 정함 · 2026-09-06)**

지금까지 「🙋 사람이 줘야 열린다」로 비워 둔 것 둘이 정해졌다.
**이 값들을 지어내지 말고 아래 것만 써라.**

| 무엇 | 값 |
|---|---|
| **공개 저장소** | `https://github.com/rhdqngusanr/contextops` (PUBLIC · MIT · 커밋 186) |
| **제출 팀명** | `퇴직했는데저좀이직시켜주세요` |

이걸로 닫히는 것:

- **FINDINGS 122** — 랜딩 푸터에 GitHub · Known limitations 링크
- **FINDINGS 126** — 제출서(SPEC §16)를 저장소 문서로. 팀명 자리가 이제 채워진다
- `README.md` 머리의 「🙋 공개 저장소 URL · 제출 팀명 … 은 아직 없습니다」 문단 —
  **그 문단을 지우고** 실제 값으로 바꿔라

⚠ **아직 없는 값은 그대로 자리표시자로 둬라** — production URL(Vercel 연결 전) ·
영상 링크(녹화 전). 없는 것을 있는 것처럼 적지 마라.

⚠ 팀명은 **사람이 적어 준 그대로** 쓴다. 띄어쓰기를 임의로 넣거나 빼지 마라.

⚠ 값이 여러 곳에 들어간다 — **정본을 하나 정하고 나머지가 그걸 읽게 해라.**
지금처럼 README·랜딩·제출서 세 곳에 문자열을 복사해 두면 반드시 갈라진다.
(랜딩은 컴포넌트라 상수를, 문서는 서로를 가리키게)

</details>

### ✅ 서버측 AI 를 Anthropic → Gemini 로 → `836a0a9` (2026-09-06 · 79바퀴 · FINDINGS 139 기록)

- `client.ts` 하나를 갈아끼웠다 — SDK 없이 `fetch` 로 `generateContent` · `responseMimeType: application/json` + `responseJsonSchema`. `callClaude` → `callModel`, 죽은 `toolName`·`toolDescription` 은 뺐다(부르는 두 파일 각 2줄).
  `structure.ts`·`conflict.ts`·`job.ts`·`budget.ts` 의 프롬프트·흐름은 손대지 않았다.
- **진짜 API 로 끝까지 봤다** (`docs/evidence/2026-09-06-gemini/probe.txt`): `responseJsonSchema` 는 `$defs`·`$ref`·`const`·`additionalProperties` 를 받는데 **`minItems`·`maxItems` 만 400** 이고, `const` 는 받되 **지키지 않아**
  `type` 이 표 밖으로 왔다 → `toGeminiSchema()`(둘을 벗기고 `const`→`enum`) 뒤 policy 2 · Zod 통과 · 토큰 83/252. 문: `pnpm --filter web ai:smoke`.
- **P3 게이트**: `tools/principles.ps1` 패턴에 `generateContent` — 요구한 대로 `withBudget` 없는 파일을 하나 두고 **FAIL 을 확인한 뒤 지웠다** (probe.txt §4).
- 같이 맞춘 것: `.env.example`(`GEMINI_API_KEY`·`GEMINI_MODEL` · 값 없음) · SPEC §1.2(`AI_MODELS` 한 곳만 버전을 든다)·§7·§16 · README P3 행은 「우리 API 키」 그대로 · KNOWN_LIMITATIONS 에 무료 티어 분당 제한 한 줄 ·
  `@anthropic-ai/sdk` 를 catalog·package·lock 에서 뺐다 · 시험 스텁을 `test/helpers/ai.ts` 한 곳으로 · `ai-client.test.ts` 9 · CI GREEN 21:56 · 관통 api 단계 OK(985).
- 🙋 **하나 남았다**: `gemini-3.5-flash`·`3.6-flash` 의 정가. `AI_MODELS` 에 2.5 flash 공개가(0.30/2.50 USD/M)를 임시로 적었다 — 0 이면 하루 예산이 무한이 돼서. 맞는 값을 알면 그 두 줄만.

<details><summary>원문</summary>

**원문 — 🔴 서버측 AI 를 Anthropic → Gemini 로 바꾼다 (사용자 지시 · 2026-09-06)**

사람이 이미 쓰고 있는 키를 재사용한다. **`apps/web/.env.local` 에 값이 이미 들어 있다** —
`GEMINI_API_KEY` · `GEMINI_MODEL=gemini-3.5-flash`. 너는 키를 만들 필요도, 볼 필요도 없다.

**사람이 미리 확인한 것** (짐작 아님 · 그대로 믿어라):
- `gemini-3.5-flash` · `gemini-3.6-flash` 둘 다 `generateContent` **HTTP 200**
- **구조화 출력이 된다** — `generationConfig.responseMimeType:"application/json"` +
  `responseSchema` 로 `{"colors":["blue","red"]}` 를 받았다. 지금 코드의 **tool use 자리를
  그대로 대체**할 수 있다
- 엔드포인트: `POST https://generativelanguage.googleapis.com/v1beta/models/<모델>:generateContent`
  헤더 `x-goog-api-key`

#### 왜 바꿀 수 있나 — 한 파일이다

```
@anthropic-ai/sdk 를 import 하는 파일 : 1개  (apps/web/src/lib/ai/client.ts · 86줄)
messages.create 부르는 곳             : 1곳  (client.ts:63)
```

「접근은 한 문으로」가 여기서 값을 한다. **`client.ts` 하나만 갈아끼운다.**
`structure.ts`·`conflict.ts`·`job.ts`·`budget.ts`(1,800줄)는 **손대지 마라** —
`callClaude(...)` 의 **입출력 모양을 그대로 유지**하면 그대로 돈다.
⚠ 이름이 `callClaude` 라 헷갈리면 함수명만 바꾸고 호출부를 따라 고쳐라. 동작은 그대로다.

#### ⛔ 반드시 같이 고쳐야 하는 것 — **안 고치면 P3 가 눈을 감는다**

`tools/principles.ps1` 의 P3 검사가 이렇게 돼 있다:

```powershell
if ($raw -match "messages\.create|messages\.stream") { $callers += $f }
...
if ($callers.Count -eq 0) { Add-Row "P3" "..." "SKIP" "아직 LLM 호출 없음" }
```

**Gemini 로 바꾸면 `messages.create` 가 사라져서 이 검사가 「LLM 호출 없음」으로 SKIP 한다.**
예산 가드가 통째로 안 지켜져도 초록이 된다 — 우리가 이미 **두 번 잡은
「가짜 OK」와 똑같은 종류**다 (FINDINGS 1 · 15).

→ 정규식에 `generateContent` 를 **같이** 넣어라. 그리고 **이번 바퀴에 그 게이트가
   실제로 무는지 확인해라** — 일부러 `withBudget` 없이 부르는 파일을 하나 만들어
   FAIL 이 나는지 보고, 확인 뒤 지워라. 안 해 보면 안 무는 게이트가 남는다.

#### 같이 맞출 것 (한쪽만 고치면 갈라진다)

| 어디 | 무엇 |
|---|---|
| `apps/web/.env.example` | `ANTHROPIC_*` → `GEMINI_API_KEY`·`GEMINI_MODEL`. **값은 적지 마라** |
| `docs/SPEC.md` §1.2 | 「`@anthropic-ai/sdk`, 모델 `claude-sonnet-4-5`」 → Gemini. **버전 숫자는 한 곳에만** |
| `docs/SPEC.md` §7 | 「tool use 로 구조화 출력」 → `responseSchema` 로 |
| `docs/SPEC.md` §16 제출서 | 「Claude API(tool use)」 문구 |
| `README.md` 신뢰 경계 표 P3 | 「우리 API 키」는 그대로 · 공급자 이름만 |
| `docs/KNOWN_LIMITATIONS.md` | 무료 티어 **분당 요청 제한**이 있다 — 데모 중 걸릴 수 있다고 적어라 |

⚠ **P2·P3 의 뜻은 안 바뀐다.** P3 는 「서버측 LLM 은 **API 키(종량제)로만** ·
4개 기능 한정 · `withBudget()` 경유」다 — 공급자를 안 박아뒀다. Gemini 키도 이 조건을 만족한다.
P2 는 여전히 「사용자의 Claude 구독을 대신 부르지 않는다」이고, 그건 더 확실해진다.

⚠ **한 바퀴에 이것만 해라.** 끝나면 `pnpm --filter web test` 와 `tools/ci.ps1` 이 초록이어야 하고,
관통의 `api` 단계가 여전히 지나야 한다.

</details>

### ✅ 순서 3 · PLAN P6 둘째 행의 제출서 — 이미 `4f90239`(67바퀴)에 있었고 72바퀴가 장부를 닫았다 (2026-09-06 · FINDINGS 126)

- `docs/SUBMISSION.md` — 한 줄 · 문제(Before/After 표는 랜딩 표와 글자 그대로) · 해결 3단계 · AI 활용 셋(서버측 둘 + 사용자 로컬 하나 ·
  §16 의 「(4) 질의」는 문이 없어 적지 않고 KNOWN_LIMITATIONS 를 가리킨다) · 신뢰 경계 P1~P7(README 와 글자 그대로) · 도구 · 어떻게 보나 ·
  검증 · 한계 넷. 요구한 **🙋 자리표시자**는 머리의 표 5행(제출 팀명 · 공개 저장소 URL · production URL · 2분 영상 · 슬라이드)이고
  각 행에 「어디에도 같이 적나」(README 머리 · `LANDING_FOOT` · KNOWN_LIMITATIONS 의 `<marketplace>`)를 적어 뒀다.
- **잰 것** (72바퀴): `apps/web/test/readme.test.ts` **32/32** — README·제출서 둘 다 랜딩 표 문장 · 경로 실존 · FINDINGS 번호(122 · 117)가 대기 ·
  P1~P7 행 동일 · Skill 3 · 훅 2 · 「질의」 줄은 전부 「없다」 · 🙋 행. 제출서의 수치를 코드에서 다시 봤다 — 크론 `0 18 * * *` UTC(= 03:00 KST) ·
  관통 7단계(`.ci/walkthrough.json` ran 7) · golden 3 · principles 에 P7 · Node ≥22 · MIT — 어긋난 곳 **0**.
- ⚠ 67바퀴의 코드 커밋(`4f90239`)은 있었는데 FINDINGS 의 상태 줄이 「대기」 그대로였다 — `tools/status-shape.mjs` 는 「대기를 가리키나」만
  세므로 초록이었다. 이 바퀴는 코드 0줄, 문서만이다.

### ✅ 순서 2 · PLAN P1 첫 행 — 마이그레이션을 Supabase 에 실제로 적용했다 → `adac632` (2026-09-06 · 71바퀴)

- 문 하나를 더했다: `pnpm --filter web db:migrate` (`apps/web/scripts/migrate.ts` · drizzle-orm 의 postgres-js migrator · `db:status` 는 읽기만).
  `drizzle-kit migrate` 대신인 이유는 config 에 접속 정보를 넣으면 `generate` 까지 env 를 요구하게 돼서다. 같은 `drizzle/` 폴더·journal 을 읽고
  `drizzle.__drizzle_migrations` 장부에 적어서 **두 번 돌려도 두 번째는 +0** 이다. 적용된 파일의 hash 가 장부와 다르면 멈춘다.
- **잰 것** (`docs/evidence/2026-09-06-supabase-migrate/`): `aws-0-ap-northeast-2.pooler.supabase.com:5432` · PostgreSQL 17.6 ·
  전 — 표 0 · 남은 7 · 장부 없음 → 후 — 적용 **7/7** · `information_schema.tables` **18** (= `src/db/schema.ts` 의 표 18) ·
  `pg_indexes` 에 `INDEX_NAMES` **8/8** · enum **17** → `db:status`·`db:migrate` 를 다시 돌리면 둘 다 **+0**.
  요청서의 「표 16 · 인덱스 5」는 P0 때 수치다 — P3 가 `ai_usage`·`ai_jobs` 와 인덱스 셋을 더했다 (SPEC §2 마지막 줄).
- NOTICE 하나: `source_documents` 의 FK 이름이 66자라 Postgres 가 63자로 자른다. 참조하는 곳 0 · 기능 영향 없음 · PGlite 도 같다.
- 시험 4개(`apps/web/test/migrate-script.test.ts`)가 pglite-socket → TCP → postgres-js 같은 길로 「dryRun 은 아무것도 안 만든다 ·
  적용 7 · 다시 돌리면 +0 · migrator 와 시험 helper 가 만든 모양이 같다」를 잠근다. `.env.example` 의 「pooler 로 돌리지 마라」를
  Transaction pooler(6543)만으로 좁혔다 — Session pooler(5432)가 IPv4 망의 유일한 길이다.
- ⚠ 안 한 것: Supabase 위에서 `next dev` 를 띄워 화면을 연 적은 없다 (마이그레이션만). `docs/STATUS.md` 「눈 판정 대기」.

### ✅ ④ 키보드 포커스가 안 보인다 → `1bc1da3` (2026-09-06 · FINDINGS 130)

- 요구한 대로 토큰 옆 **한 곳**(`globals.css`)에 `:focus-visible { outline: 2px solid var(--accent-ink); outline-offset: 2px }` — 버튼·링크·입력·행·탭이
  전부 그 한 줄을 읽는다. `outline: none` 은 뺐다(입력은 테두리 색만). `.scroll-x` 안의 폭 100% 행(Pack 줄)만 안쪽 링(-2px).
- 정본 `docs/DESIGN_BRIEF.md` §3 에 「접근성」 절 · `apps/web/test/design-tokens.test.ts` +3 이 규칙의 존재 · 홀로 있는 `outline: none` 0개 · 문서 ↔ 코드를 센다.
- **탭을 눌러 봤다** (`docs/evidence/2026-09-06-focus-visible/`): CDP 로 Tab 을 보내 landing 3 · context 9 · packs 22 = 34/34 요소가 accent-ink 2px 링 ·
  스타일시트 셈 `:focus-visible` 0 → 2 · 홀로 `outline: none` 1 → 0 · 마우스로 누른 버튼엔 링이 **안** 뜬다. 같은 서버에서 ① 의 데모도 새 프로필로 열렸다
  (context 항목 15개 · 5xx 0).

<details><summary>원문</summary>

#### ④ [격차] 키보드 포커스가 안 보인다 — `:focus-visible` 규칙 **0개**

- **근거**: 스타일시트 전체에서 `:focus-visible` 을 쓰는 규칙 **0개**,
  `outline: none` 으로 지우는 규칙 **1개**. 탭으로 넘기면 지금 어디 있는지 알 수 없다.
- **왜 중요한가**: 접근성이자 **개발자 도구의 기본기**다. Linear·Stripe·GitHub 전부
  또렷한 포커스 링이 있다. 심사에서 키보드로 훑는 사람이 있으면 바로 보인다.
- **고칠 방향**: 버튼·링크·입력·행에 `:focus-visible { outline: 2px solid var(--accent-ink);
  outline-offset: 2px }`. 토큰 옆 한 곳에 두고 컴포넌트가 읽게 해라.

</details>

### ✅ ③ 한글이 낱말 중간에서 잘린다 → `0a3535e` (2026-09-06 · FINDINGS 129)

- 요구한 대로 토큰이 사는 곳(`globals.css` 의 `html, body`)에 `word-break: keep-all; overflow-wrap: break-word` **한 줄** — 시안의 `body` 와 같은 값.
  mono(`.tree-item` · `.pack-linetext` · `.diff-text` · module.css 의 명령줄)에는 안 걸었다 — 자기 규칙이 덮는다.
- 정본 `docs/DESIGN_BRIEF.md` §3 「타이포」에 같은 값을 적었고, `apps/web/test/design-tokens.test.ts` +3 이 문서 ↔ 코드 · mono 예외를 센다.
- **눈으로 봤다** (`docs/evidence/2026-09-06-keep-all/`): 1280 헤드라인 「팀의 지식과 Claude의 기억을 / 같은 방향으로」 · 375 「팀의 지식과 /
  Claude의 기억을 / 같은 방향으로」 · 에러 카드 「잠시 후 다시 / 시도해주세요.」 — 전부 낱말 경계, 375 가로 넘침 0.
  같은 서버에서 ② 의 오류 로그도 `next dev` stdout 으로 확인했다 (`cause.code: ECONNREFUSED` · 질의문 0).

<details><summary>원문</summary>

#### ③ [격차] 한글이 낱말 중간에서 잘린다 — `word-break: keep-all` 이 **한 곳도 없다**

- **증상**: 랜딩 헤드라인이 「팀의 지식과 Claude의 기억을 같 / 은 방향으로」로 그려진다.
  에러 카드도 「잠시 후 다시 시 / 도해주세요」로 잘린다.
- **근거**: `document.querySelectorAll('body *')` 중 `word-break:keep-all` 인 요소 **0개**.
  `<html lang="ko">` 인데 `h1`·`body` 모두 `word-break: normal` 이다.
- **왜 중요한가**: 한국어 서비스에서 이건 **기본기**다. 토스·배민·네이버·카카오가 전부
  `keep-all` 을 쓴다. 이거 하나로 화면 전체가 아마추어처럼 읽힌다.
- **고칠 방향**: 토큰이 사는 곳(`globals.css` 의 `:root`/`body`)에 `word-break: keep-all`
  **한 줄**. 시안(`design/*.dc.html`)에는 이미 있다 — 구현으로 옮길 때 빠진 것이다.
  ⚠ 코드·경로·해시(mono)에는 걸지 마라 — 거긴 `break-all` 이 맞다.

</details>

### ✅ ② 오류 로그에 메시지도 스택도 없다 → `9319617` (2026-09-06 · FINDINGS 128)

- 요구한 대로 **남기는 것과 남기지 않는 것을 표 하나**(`apps/web/src/lib/api/log.ts` 의 `ERROR_FIELD_RULES`)로 만들고 로거가 그 표만 읽는다.
  남기는 것: `request_id` · route · `name` · `code` · `message`(200자 · 질의문을 품으면 통째로 뺀다) · stack 「at …」 3줄 · `cause` 사슬.
  안 남기는 것: `query` · `params` · `parameters` · `detail` · `hint` · `where` · `internal_query` · 표에 없는 모든 필드.
- 밝혀진 것: 저 「Error」는 drizzle `DrizzleQueryError` 였다 (name 을 안 정한다 · message 에 질의문이 통째로 든다). 이제 `name` 은 클래스
  이름이고 원인은 `cause` 에 `CONNECT_TIMEOUT` 같은 code 와 함께 남는다. 실물: `docs/evidence/2026-09-06-error-log/probe.txt`.
- 시험 21개(`apps/web/test/error-log.test.ts`) — 진짜 drizzle 질의로 죽인 라우트의 로그 한 줄 전체에 `select` 가 없고 SQLSTATE 는 있다.
- ⚠ `next dev` stdout 에서 다시 찍지는 않았다 (vitest 안에서 같은 `route()` 로 찍었다) — `docs/STATUS.md` 「눈 판정 대기」.

<details><summary>원문</summary>

#### ② [고장] 오류 로그에 메시지도 스택도 없다 — `{"kind":"unhandled","error":"Error"}`

- **증상**: 위 500 의 원인을 **로그만으로는 알 수 없다.** 남는 건 저 한 줄뿐이다.
- **근거**: `/tmp` 가 아니라 실제 서버 stdout. 500 이 날 때마다 저 줄만 찍힌다.
- **고칠 방향**: P1 은 「**body·토큰·문서 본문**을 안 남긴다」이지 「에러 메시지를 안 남긴다」가
  아니다. `error.name` · `error.message` · `stack` 첫 3줄은 **남겨야 한다** —
  운영에서 이걸 못 보면 아무것도 못 고친다. 남기지 말아야 할 것과 남겨야 할 것을
  **표 하나**로 만들고 로거가 그 표를 읽게 해라.

</details>

### ✅ ① 게스트 데모가 안 열린다 — `GET /api/v1/teams` 30초 500 → `2134011` (2026-09-06 · FINDINGS 127)

- 재현했다 — 순차 요청도 죽었다(「단독은 200」이 아니었다). 원인은 동시성이 아니라 **Next dev 가 라우트마다 모듈을 새로 평가해
  풀이 라우트 수만큼 생긴 것**. `client.ts` 가 풀을 `globalThis` 에 두게 했고, 요구한 「동시 요청을 재는 시험」은
  `apps/web/test/db-pool.test.ts` — 개발용 서버와 같은 길(pglite-socket → postgres-js `?max=1`)로 동시 5번 + 새 모듈
  인스턴스를 잰다. 고치기 전 코드로 돌리면 26ms 만에 빨갛다. 전/후 수치는 `docs/evidence/2026-09-06-db-pool/probe.txt`.
- ⚠ 브라우저로는 안 봤다 — `docs/STATUS.md` 「눈 판정 대기」.

<details><summary>원문</summary>

#### ① [고장] 게스트 데모가 안 열린다 — `GET /api/v1/teams` 가 30초 뒤 500

- **증상**: `/demo` → `/t/demo/p/paylab-api/*` 의 **모든 화면**이 에러 상태이거나
  스켈레톤에서 안 넘어간다. Context 는 「서버에서 처리하지 못했습니다」, Roadmap 은
  `aria-busy="true"` 로 멈춘다.
- **근거**: 서버 로그에 `route:"GET /teams" status:500 latency_ms:30026` 이 **반복**된다
  (30022 · 30016 · 37904 · 30372 …). 정확히 30초 = 연결 대기 타임아웃이다.
  단독 요청일 땐 200(1.9초)이 나오고, **동시 요청이 겹치면** 500이 난다.
- **의심**: 데모 DB URL 이 `?max=1` 이다 (연결 **한 개**). 화면 하나가 여러 요청을
  동시에 던지면 뒤엣것이 풀을 못 얻고 30초를 기다리다 죽는다.
- **왜 최우선인가**: 이게 **GATE 3(「시크릿 창에서 링크만으로 3분 체험」)** 이다.
  심사위원이 제일 먼저 누르는 자리가 지금 빈 화면이다.
- ⚠ 이건 **관통이 못 잡는 종류**다 — 관통은 단계를 하나씩 순서대로 부르므로 동시성이 없다.
  고칠 때 **동시 요청을 재는 시험**을 같이 만들어라. 안 만들면 다시 돌아온다.

</details>

### ✅ 픽스처 서사는 「결정 대기」가 아니다 — `dc66593` (2026-09-03)

- `docs/STATUS.md` 「막힌 것」 표의 데모 픽스처 행과 「픽스처 서사가 세 곳에서 갈렸다」 절을 지웠다
- `docs/DESIGN_BRIEF.md` 화면 1 Before/After · 화면 4 머리에 「예시 문구는 목업용 ·
  픽스처 정본은 SPEC §10.1(paylab)」 주의 두 줄을 넣었다
- 같은 바퀴에서 `docs/PLAN.md` 다음 행(`packages/schema` 전체)까지 이어서 했다 — `a4ac92d`
