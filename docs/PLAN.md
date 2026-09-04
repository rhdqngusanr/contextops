# PLAN — Phase 체크리스트

> `docs/SPEC.md` §13 의 18일 WBS 를 **루프가 읽을 수 있는 형태**로 옮긴 것이다.
> 정본은 SPEC 이고, 여기는 **순서와 완료 기준**만 산다.
>
> **한 바퀴에 한 행.** 루프는 `- [ ]` 중 **맨 위 하나**를 골라 그 행의 완료 기준을
> 만족시킨다. 다 되면 `- [x]` 로 바꾸고 커밋 해시를 붙인다.
>
> ⚠ **날짜에 맞추려고 여러 행을 한 바퀴에 하지 마라.** 반쯤 된 것 셋보다 끝난 것 하나가 낫다.
> 일정이 밀리면 행을 빨리 하는 게 아니라 §14 **절삭 순서**로 행을 **줄인다.**

**대회**: Wanted AI Championship 2026 · 제출 2026-09-20 · 개발 1인 + Claude Code

---

## P0 — 뼈대와 정본 (SPEC 9/2~9/3)

- [x] **모노레포 뼈대** — pnpm workspace(`apps/*`, `packages/*`, `plugin`) · `tsconfig.base.json` ·
      vitest · `.github/workflows/ci.yml` — `5dfefb4`
      **완료 기준**: `pnpm -r test` 가 0개 테스트로라도 초록. `tools/ci.ps1` 의 typecheck·test 층이 SKIP 이 아니게 됨
- [x] **`packages/schema` 전체** — SPEC §3 의 Zod 계약 전부 (ItemType 10종 · SourceRef 4종 ·
      type별 data · Proposal · ProgressEvent · Manifest) + JSON Schema export — `a4ac92d`
      **완료 기준**: 스키마 단위 테스트 초록 · `plugin/contextops/schemas/*.json` 생성 ·
      **업로드 스키마에 `content`류 필드 0건** (P1 — `tools/principles.ps1` 이 센다)
- [x] **`packages/compiler` 전체** — partition · sort · render · sourcemap · hash (SPEC §4) — `8e02f48`
      **완료 기준**: golden 3종 byte 일치 · **항목 순서를 셔플해도 출력 동일** ·
      `manifest_hash` 고정값 일치 · `Date.now`/`Math.random`/네트워크 0건 (P4)
- [x] **paylab 픽스처** — `fixtures/paylab-api`(TS 42파일, 의도된 어긋남 3곳) ·
      `fixtures/paylab-docs`(151줄 + 폐기 로드맵 1개) — `0236e36`
      **완료 기준**: SPEC §10.1 의 기대 결과(충돌 3 · open_question 4 · M1~M3)를 낼 재료가 다 있음
      → `tools/fixtures.mjs` 가 20종을 센다. 관통(`walkthrough.ps1`) 첫 단계로 붙어서
      픽스처가 조용히 상하면 관통이 막힌다

## P1 — API 와 발행 (SPEC 9/4~9/6)

- [ ] **DB 스키마 · Drizzle 마이그레이션** (SPEC §2) + Supabase 연결
      **완료 기준**: 마이그레이션이 로컬에서 적용됨 · 인덱스 5개 존재
      🙋 **Supabase 프로젝트 생성은 사람이 한다.** 루프는 스키마·마이그레이션·`.env.example` 까지
      → 루프가 할 몫은 끝났다 (`389c7f2`): 표 16 · 인덱스 5 · enum 14 를 **PGlite 에
      실제로 적용**하고 시험 11개로 잠갔다. `- [x]` 로 바꾸지 않은 이유는 **Supabase 연결**
      한 조각이 남아서다 — 사람이 프로젝트를 만들고 `DATABASE_URL` 을 주면 닫힌다
- [x] **API 1군** — teams · projects · repos · tokens · documents · context-items · conflicts · questions — `0a370d8` `5d26744`
      **완료 기준**: vitest api 초록 · 권한 2단계(owner/member) 검사 · 응답 형식 SPEC §5 준수
      → 라우트 13개 · 시험 37개(auth 17 · routes 20). 셋 다 만족했다:
      **① vitest api 초록** — 시험이 `route.ts` 의 export 를 **그대로** 부른다 (PGlite 연결을
      꽂아서). 핸들러 안의 로직을 베낀 시험이 아니다.
      **② 권한 2단계** — 같은 body·같은 프로젝트가 member 면 403, owner 면 201.
      기기 토큰은 owner 의 것이어도 member 까지다 (`ACTOR_MAX_ROLE` 표).
      **③ 응답 형식** — 모든 응답이 `{data, meta:{request_id}}` / `{error:{code,…}}` 이고,
      항목 응답은 `ContextItem.parse` 로 되판다.
      ⚠ 남은 몫은 FINDINGS 24·25·26 에 적었다 (zip 업로드 · 구조화 job · 충돌→항목 상태).
      전부 **주인이 P3** 라서 여기서 열지 않았다 — 반쯤 검사하는 zip 경로가 제일 나쁘다.
      Next 앱 뼈대도 여기서 세웠다 (`ci.ps1` 의 build 층이 SKIP 에서 풀렸다). 화면은 넷째 행이다
- [x] **API 2군 + 발행 트랜잭션** — proposals · versions/publish · packs · sync-reports · progress · roadmap — `e5f61c8` `6b990f9`
      **완료 기준**: 손으로 넣은 항목이 Pack 으로 나옴 · `STALE_BASE` 409 재현 테스트 ·
      실패 시 전체 롤백 테스트
      → 라우트 14개 · 시험 +40(web 59 → 98). 셋 다 만족했다:
      **① 손으로 넣은 항목이 Pack 으로 나온다** — 관통 `publish` 단계가 SKIP 에서 풀렸다.
      픽스처 문서 2개 → 초안 6개 → 발행 → `.ci/walkthrough-pack/` 에 Pack 을 남긴다.
      받은 본문의 sha256 을 **다시 재서** Manifest 와 대조한다.
      **② `STALE_BASE` 409** — 첫 발행에 base 를 실으면 409 · 발행 뒤 `null` 로 보내도 409.
      `base_version_id` 는 nullable 이고 **optional 이 아니다** — 빼도 되면 그 검사가 죽는다.
      **③ 실패 시 전체 롤백** — 대상 없는 `update` 제안을 승인해 두고 발행하면 400 이고,
      버전 수·항목 수·`official_version_id` 가 **전부 그대로**임을 잰다.
      ⚠ `packs/{semver}/zip` 은 안 만들었다 — PLAN P5 첫 행(「Pack zip」)이 주인이다.
      ⚠ 발행 트랜잭션은 `lib/api/publish.ts` **한 파일**이다. 라우트로 한 줄도 새지 않게 —
      새면 「실패하면 전부 롤백」이 거짓이 된다
- [x] **웹 화면 2·5·7** — 로그인 · Context · Pack Explorer — `874ea95` `d9d507e`
      **완료 기준**: 🔴 **GATE 1** — 웹에서 항목 입력 → 발행 → Pack Explorer 에서 역추적 확인
      → 화면 5개 · 시험 +41. **GATE 1 을 눈으로 확인했다**
      (`docs/evidence/2026-09-03-screens/s7-pack-trace.png`): 항목 6개 → v1.0.0 발행 →
      `CLAUDE.md` 9번 줄 → `item_goal_success_rate · rev 2` → 「결제 승인 성공률 99.5%」 →
      근거 `¶ 문서 §paylab 결제 서비스 · 0–400자`. **끊긴 데가 없다** (P7).
      실제로 브라우저를 띄워 봤다 — `pnpm --filter web dev:db` 가 PGlite 를 TCP 로 열고
      씨앗을 심으면 Next 는 평소처럼 `DATABASE_URL` 로 붙는다. **제품 코드를 안 고치고**
      인증도 `/auth/callback` 이라는 진짜 경로로 지난다.
      ⚠ 「항목 입력」은 **표에서 보고 발행**까지다 — 항목을 화면에서 **새로 만드는 폼**은
      없다 (가져오기는 화면 3 · P3). 눈으로 보고 고친 결함 7개는 `d9d507e` 에 적었다.
      ⚠ 게이트를 셋 더했다: 색 토큰 · 화면 표 4개 · 태그 왕복 (`docs/STATUS.md`)

## P2 — 플러그인 (SPEC 9/7~9/9)

- [x] **플러그인 레이아웃 · `setup` · `scan` · `validate` · credentials** — `b85c2c8`
      **완료 기준**: 새 레포에서 `setup` 완료 · `credentials.json` 권한 0600 ·
      `claude plugin validate` 통과 → **셋 다 확인했다.**
      근거는 `docs/evidence/2026-09-03-plugin/` (`.ci/` 는 관통이 지운다 — 밖으로 복사했다):
      씨앗 서버 + `next start` 를 띄우고 `POST /tokens` 로 진짜 토큰을 발급받아,
      `git init` 만 한 폴더에서 `setup` → `project.json`(토큰 0건) + `credentials.json`.
      틀린 토큰은 **진짜 서버의 401 로** exit 10 이었고 그 레포는 만들어지지도 않았다.
      `claude plugin validate` 는 2.1.233 으로 **Validation passed**.
      ⚠ 0600 은 두 겹으로 잰다 — 「0600 을 요구했는가」는 어느 플랫폼에서나,
      「실제 비트」는 리눅스 CI 에서 (`test/credentials.test.ts`). Windows 는 그 비트를
      저장하지 않아서 실제 비트만 재면 개발 기계에서 **검사 없이 초록**이 된다.
      ⚠ CLI 8개 중 셋만 만들었다 — 나머지는 아래 두 행이다. 명령 표에 **없는 명령은
      적지 않았다**: 표에 있으면 `--help` 가 「할 수 있다」고 말한다.
- [x] **`sync`(백업·atomic·post-verify) · `status` · SessionStart 훅** — 아래
      **완료 기준**: 훅 알림 → sync → `applied` 보고 · **hash 불일치에서 중단** ·
      **`session-start.mjs` 에 fs write 0건** (P6) · path traversal 거부
      → **넷 다 확인했다.** 관통 `sync` 단계(`plugin/contextops/scripts/walkthrough-sync.ts`)가
      **배포되는 번들을 진짜 소켓으로** 돌려 16개 검사를 낸다 (`.ci/walkthrough-sync.json`):
      앞 단계가 발행한 진짜 Manifest → 파일 2개 바이트 일치 → `applied` 보고 →
      서버가 한 줄 덧붙인 바이트를 주면 **exit 20 이고 Pack 파일을 하나도 안 썼다** →
      훅이 `적용 v0.9.0 · 공식 v1.0.0` 을 알리고 **저장소 바이트가 그대로다**.
      ⚠ P6 은 두 겹으로 잰다 — `tools/principles.ps1` 이 쓰기 API **이름**을 세고
      (`hooks.json` 이 가리키는 스크립트 전부), `test/hooks.test.ts` 가 훅을 **돌린 뒤
      모든 파일의 바이트와 mtime** 을 대조한다. 이름만 세면 새 쓰기 API 에 뚫린다.
      ⚠ CLI 8개 중 다섯이 됐다 — 나머지 셋(`upload-draft`·`propose`·`progress`)은 아래 행이다.
- [x] **`init` Skill · `upload-draft` · `propose` Skill · `progress` · Stop 훅** —
      `9179ffc` `bfc9d60` `eaae9f5` `f688724`
      **완료 기준**: 🔴 **GATE 2** — Claude Code 에서 `init` → 웹 승인 → `sync` 관통 ·
      업로드 payload 캡처에 **코드 본문 0건** (P1)
      → **payload 쪽은 확인했다.** 관통이 **7단계**가 됐고, 새 `payload` 단계
      (`apps/web/scripts/walkthrough-payload.ts`)가 **배포되는 번들**을 픽스처 저장소에서
      돌려(scan → upload-draft → progress → propose) 나간 요청 body 를 **진짜 소켓으로
      받아** 잰다 — 검사 10개 전부 OK (`.ci/walkthrough-payload.json`):
      나간 3건이 업로드 계약을 지나고, **픽스처 48개 파일의 가장 긴 줄이 payload 에 0건**,
      env 값 0건(키 이름은 실제로 나갔다), 토큰은 body 에 0건, 그리고 초안에
      `file_body` 를 끼워 넣으면 **exit 2 이고 요청이 아예 안 나간다.**
      초안 body 에 실제 소스를 넣어 **빨개지는 것도 봤다.**
      ⚠ **「Claude Code 에서 `init`」은 아직 사람이 해 봐야 한다** — Skill 은 모델이
      실행하는 문서라 무인 세션이 스스로 재는 것은 여기까지다. `test/skills.test.ts` 가
      SKILL.md 의 명령줄을 뽑아 `COMMANDS`·플래그·계약 이름·`EXIT` 표와 대조한다
      (틀린 이름은 **사용자의 기계에서만** 조용히 실패하고 우리 CI 는 못 본다).
      ⚠ CLI 는 SPEC §8.3 의 **여덟이 다 됐다**. `test/commands.test.ts` 가 SPEC 표와
      코드 표를 대조하므로 한쪽만 늘면 빨개진다.
      🔴 **P6 을 결정했다** (FINDINGS 42): 훅이 쓸 수 있는 자리는 `.contextops/` 의
      git-ignore 경로뿐이고 `hooks/hooks.json` 의 `_writes` 에 **선언한** 것으로 한정된다.
      게이트 둘(`principles.ps1` · `test/hooks.test.ts`)이 그 경계를 재고, 선언을 지우거나
      선언을 ignore 밖으로 옮기면 **둘 다 빨개지는 것을 봤다.**
      🔴 **남은 구멍**: `workflow` 항목이 없으면 `workflow.md` 가 안 나가고, 그러면
      **agent 가 `progress` 를 배우지 못한다** (FINDINGS 43 — 다음 바퀴의 첫 줄)

## P3 — 서버 AI (SPEC 9/10~9/11)

- [ ] **7.1 문서 구조화 · 7.2 충돌 탐지 · 예산 가드**
      **완료 기준**: paylab 문서 → 항목 12 + 충돌 3 · **모든 AI 호출이 `withBudget()` 경유** (P3) ·
      `source_ref` offset 이 문서 범위 안
      ① ✅ **예산 가드** (`fdf098b`) — `withBudget()` · AI 경계(`lib/ai/client.ts`) ·
      `ai_usage` 장부 · `AI_FEATURES`/`AI_FEATURE_LIMITS`/`AI_MODELS` 표.
      `principles.ps1` 의 **P3·P3b 가 SKIP 에서 켜졌다** (OK 7 → OK 9).
      ② ✅ **`structureDocument`** (`34eb766`) — `lib/ai/structure.ts` · `lib/ai/prompt.ts` ·
      `AiStructureOutput`(§7.1 출력 계약) · `AI_OUTPUT_INVALID`(FINDINGS 48). 시험 24개.
      `withBudget()` 이 제품 소비처를 가졌다 (FINDINGS 49 닫음). 에러 코드 **11종 전부**
      내는 자리를 가졌다. ⚠ **API 키가 없어 스텁으로만 쟀다** — 진짜 응답은 못 봤다.
      ③ ✅ **`detectConflicts`** (`7cf9d50`) — `lib/ai/conflict.ts` · `CONFLICT_KIND_RULES` 표 ·
      `AiConflictOutput`(§7.2 출력 계약) · `CONFLICT_SEVERITIES`. 시험 24개.
      빈도 상한을 정했다 — 프로젝트당 시간당 10회, 세는 단위는 **탐지 한 번** (FINDINGS 51 닫음).
      🔴 **남은 구멍**: 부르는 자리가 없고 `conflicts` 표가 `a_item_id`·`severity` 를
      담지 못한다 (FINDINGS **54** — 25·29 와 한 묶음, 주인은 P3 둘째 행).
      ⚠ **API 키가 없어 스텁으로만 쟀다** — 진짜 응답은 못 봤다.
      🔴 **①②③이 다 끝났는데도 이 행은 열려 있다.** 완료 기준(「paylab 문서 → 항목 12 +
      충돌 3」)은 **진짜 키와 부르는 라우트**가 있어야 잴 수 있다. 키는 사람이 주고
      (🙋), 라우트는 다음 행(화면 3·4)이 만든다. **재지 않은 것을 체크하지 마라.**
- [ ] **웹 화면 3·4** — 가져오기 · 정리 · 질문 카드 10장
      **완료 기준**: 문서 없이 **질문만으로 v1.0 발행 가능**
      ⓪ ✅ **`conflicts` 표가 §7.2 의 출력을 담는다** (`8cde1f5` · FINDINGS 54) —
      `a_item_id`·`b_item_id`·`severity` 추가 · `a_ref` 는 `anchor:'document'` 전용.
      `CONFLICT_KIND_RULES` 의 새 축 `anchor` 에서 **CHECK 제약 5개가 생성된다**
      (`conflictShapeCheck()`) · 복합 FK 로 없는 항목을 가리키는 카드를 막는다 (P7).
      마이그레이션 `0003` · 시험 190→194. SPEC §2·§7.2 를 코드와 같게 고쳤다.
      ① ✅ **job 자리 — §7.1·§7.2 를 부르는 첫 코드** (`a1f0a79` · FINDINGS **52·28** 닫음) —
      `ai_jobs` 표 하나로 구조화와 탐지가 **같은 자리**를 쓴다 (마이그레이션 `0004`).
      `AI_FEATURE_LIMITS` 의 새 축 `job` 에서 `AiJobFeature` 유니온과 DB CHECK 이
      **생성되고**, `AI_JOB_STATUS_RULES` 에서 수명 CHECK 4개가 생성된다.
      `lib/ai/job.ts` 가 낸 것을 **행으로 옮기는 유일한 자리**다 — 충돌 표가 처음 찬다.
      라우트 셋(`POST /documents` · `batch-draft` · `GET …/jobs/{jobId}`). 시험 194→213.
      ② ✅ **도는 job 을 다시 찾는 문** (`a4a2682` · FINDINGS **58** 닫음) —
      `GET /projects/{id}/jobs?feature&status&limit&offset` · 최신순. 질의 계약 `AiJobQuery`
      (`ListQuery` 를 넓힌다 — `feature` 의 값이 서버 전용 표에서 와서 계약 패키지로 못 올린다).
      시험 213→220. `ai_jobs_project_created_idx` 가 처음으로 읽는 코드를 가졌다.
      ③ ✅ **목록이 무거워지지 않는다** (`91ede81` · FINDINGS **60** 닫음) —
      `AI_JOB_FIELDS` 표에 `heavy` 축을 두어 `AI_JOB_COLUMNS`(상세)·`AI_JOB_LIST_COLUMNS`(목록)가
      **생성된다.** 목록은 `result` 를 안 나르고, 응답의 `shape:'summary'|'full'` 이 화면에게
      어느 쪽을 받았는지 말한다. 시험 220→225. 목록 953바이트 vs 상세 2063바이트를 눈으로 읽었다
      (`docs/evidence/2026-09-04-jobs-shape/`).
      ④ ✅ **웹 화면 3 — 가져오기** (`85c6ac2`+`0173c96`) — `…/import`. 문서 붙여넣기
      (제목·종류 6종·본문) → `POST /documents` → **polling 으로 구조화 진행**을 그린다.
      `usePolling` 은 다시 읽는 동안 손에 든 값을 안 버리고, **끝나면 멈춘다**
      (`finished_at` — 상태 이름을 손으로 안 센다). `progress:null` 은 회전 · 있으면 막대이고
      가운뎃말은 `unit` 그대로라 **화면에 `feature ===` 갈래가 없다.** `stalled` 는 서버가
      낸 판정이라 화면이 다시 재지 않고 근거(`updated_at`)를 옆에 같이 낸다.
      job 한 장을 그리는 자리는 `components/job-progress.tsx` 하나다 — 화면 4 의
      `conflict` job 이 둘째 사용자다. 여섯 모양(대기·회전·막대·멈춤·실패·완료)을 전부
      그려서 마크업을 읽는 시험이 **눈 판정을 게이트로** 올렸다. 시험 236→258.
      `AI_JOB_STATUSES` 가 `packages/schema` 로 올라갔다 (둘째 사용자 = 화면).
      ⑤ ✅ **질문 카드 10장 — 「문서가 없어도 됩니다」** (`9f481a0`+`a24120e` · FINDINGS
      **67 ③**) — 씨앗 질문 10장이 **프로젝트를 만드는 트랜잭션 안에서** 심긴다.
      `CONFLICT_KINDS` 에 `seed_question` · `CONFLICT_ANCHORS` 에 `none` 한 줄씩
      (마이그레이션 `0006` 은 enum 값 하나뿐이다 — CHECK 다섯 줄은 표에서 다시 생성된다).
      「어느 종류가 질문인가」는 `QUESTION_CONFLICT_KINDS` 가 정한다 — 라우트에
      `kind='open_question'` 이 박혀 있어서 씨앗을 심자마자 화면이 그것을 못 봤다.
      답변 → 항목은 표(`lib/api/seed-questions.ts`)가 정한 자리로 **옮기기만** 하고
      **LLM 이 없다.** 화면은 카드 스택(`components/question-stack.tsx` · `n / 10` ·
      건너뛰기 · 요약)이고 훅이 없어 시험이 **열 모양**을 다 그린다. 시험 259→**285**.
      ⑥ ✅ **웹 화면 4 — 정리** (`706e334`) — `…/review`. `GET /conflicts` 가 내는 것을
      카드로 그리고 `POST :resolve`(탐지 카드)·`POST /questions`(질문 카드)로 결정을 보낸다.
      **종류마다 갈리는 것 셋이 전부 `CONFLICT_KIND_RULES` 한 표에서 온다** —
      `anchor`(무엇을 그리나 · `ANCHOR_BODY` 3줄) · `detected`(결정 버튼이냐 답 칸이냐) ·
      **새 축 `byAi`**(`AI 제안` 배지와 머리의 「AI가 찾은 N건」). `byAi` 를 더한 이유는
      `open_question` 이 `detected:false` 인데 **AI 가 만든 것**이라서다 — `detected` 로
      배지를 달면 그 카드만 사람이 적은 것처럼 보인다. 카드 코드에 `kind ===` 갈래가 없다.
      결정 버튼은 **owner 에게만** 그린다 (`:resolve` 가 owner 전용 — 누르면 403 인 버튼을
      두지 않는다). 열다섯 모양을 전부 그려 마크업을 읽는 시험이 눈 판정을 게이트로 올렸다
      (`test/web-conflict-card.test.ts` 18). 시험 287→**307**.
      ⑦ ✅ **결정이 항목을 바꾼다** (`a201a51` · FINDINGS **71**) — 「A가 맞음」을 누르면
      진 쪽 항목이 `deprecated` 로 가고 **다음 Pack 에서 그 줄이 사라진다.** 선택 4개 →
      진 쪽 항목의 다음 상태는 `RESOLUTION_ITEM_OUTCOME` 표고, 그 표와
      `CONFLICT_KIND_RULES`(anchor)를 잇는 문은 `itemOutcomeOf()` 하나다 — 라우트에
      `choice ===` 도 `kind ===` 도 없다. `both`·`dismiss` 는 항목을 안 건드린다
      (보류·무시는 결정이 아니다). 폐기는 **개정을 하나 쌓고** 그 근거에
      `{kind:'manual', note:'충돌 정리 — {충돌id} · 선택 a'}` 가 붙어 「누가 왜」로 간다 (P7).
      트랜잭션 하나다 — 충돌만 닫히면 「이미 처리된 충돌」 400 때문에 다시 누를 문이 없다.
      잰 것은 상태가 아니라 **Pack**이다(`choice` 를 `both` 로 뒤집어 시험이 빨개지는 것을
      확인했다). 눈으로 읽은 것: `docs/evidence/2026-09-04-resolve-effect/` — **결정 전
      CLAUDE.md 에 모순되는 `must` 두 줄이 나란히** 있었다. 시험 307→**313**.
      🔴 **남은 것: 세 길 중 하나**(zip — FINDINGS 26+67 ① · SPEC §11 상한이 먼저다) ·
      실패한 job 재시도 (**59**) · **화면이 「A가 맞음 → B 폐기」를 안 알린다** (FINDINGS **74**).
      🔴 **이 행의 완료 기준(「문서 없이 질문만으로 v1.0 발행 가능」)은 아직 안 쟀다** —
      질문에 답해 **초안 항목**이 생기고 화면 4 에서도 답할 수 있는 데까지 왔다. 그 초안을
      골라 v1.0 으로 발행하는 것은 화면 5 의 [발행하기]이고 **눌러 본 적이 없다.**
      **재지 않은 것을 체크하지 마라.**
      ⚠ 여전히 **진짜 키로 부른 적이 없다** — 완료 기준(「paylab 문서 → 항목 12 + 충돌 3」)은
      키가 있어야 잰다 (🙋).
      ⚠ **캡처로 본 적이 없다** — 이 환경에 브라우저가 없다 (`docs/STATUS.md` 「눈 판정 대기」).

## P4 — 나머지 화면과 데모 (SPEC 9/12~9/13)

- [ ] **웹 화면 6·8** — Proposal · Roadmap · Realtime
      **완료 기준**: agent progress → Roadmap 갱신 · **Roadmap 기본 행이 마일스톤** (P5)
- [ ] **웹 화면 9 · 게스트 데모 · 랜딩 v1**
      **완료 기준**: 🔴 **GATE 3** — 시크릿 창에서 링크만으로 3분 체험

## P5 — 배포와 마감 (SPEC 9/14~9/15)

- [ ] **AGENTS/cursor 타깃 · Pack zip · 터미널 재생 컴포넌트**
- [ ] **Vercel production · Cron · 보안 캡처 증거 · 새 PC fresh install**
      **완료 기준**: production 으로 발표 시나리오 1회 완주

## P6 — 발표 (SPEC 9/16~9/17)

- [ ] **2분 영상 · 슬라이드 · 리허설**
- [ ] **제출서 · README · KNOWN_LIMITATIONS**
      **완료 기준**: 제출 가능

---

## 절삭 순서 (Gate 실패 시 — SPEC §14)

밀리면 **이 순서로 자른다.** 자를지 말지 고민하지 말고 위에서부터 지운다:

1. 질의창(§7.3) → 2. 터미널 재생 → 3. Roadmap 「완료 확인」 UI → 4. AGENTS/cursor 타깃 →
5. Pack zip → 6. 실데이터 픽스처(paylab만) → 7. Stop 훅의 pending-proposal →
8. Realtime(폴링 10초)

**절대 자르지 않는 것**: 스키마 · 컴파일러 · 발행 트랜잭션 · setup · sync ·
SessionStart 훅 · init Skill · 충돌 카드 · 게스트 데모 · 랜딩 before/after
