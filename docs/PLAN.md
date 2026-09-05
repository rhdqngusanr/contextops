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
- [x] **웹 화면 3·4** — 가져오기 · 정리 · 질문 카드 10장 — `130b5f2` (⑪ 에서 재고 닫음)
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
      ⑧ ✅ **초안을 승인하는 문** (`1aebc22` · FINDINGS **79**) — 화면에는 항목의 상태를 바꿀
      문이 **하나도 없었다.** 라우트가 `PATCH /context-items/{uuid}` 인데 항목을 내는 문이
      돌려주는 `id` 는 `public_id` 라 **화면이 부를 수가 없었다.** 문을
      `PATCH /projects/{id}/context-items/{itemId}`(public id)로 옮기고 전역 문은 지웠다
      (SPEC §5 를 같이 고쳤다). 화면 5 드로어의 버튼은 `ITEM_STATUS_ACTIONS` 표가 정하고,
      버튼 밑의 「무엇이 되나」는 `ITEM_STATUS_EXCLUDE_REASON`(`packages/schema` 로 올렸다)을
      **읽어서** 그린다 — 그 표가 곧 컴파일러가 하는 일이다. 웹 시험 313→**338**.
      🔴 **이 행의 완료 기준을 처음으로 쟀다 — 「문서 없이 질문만으로 v1.0 발행 가능」이
      실제로 된다.** 질문 10장 → 답 → 승인 → v1.0.0 이고, 그 CLAUDE.md 의 열 줄이 전부
      `src:manual:<질문 문장>` 으로 역추적된다 (P7). 잰 자리는
      `test/api-seed-questions.test.ts` 마지막 describe 이고, 사람이 읽을 전문은
      `docs/evidence/2026-09-04-questions-only/pack.txt` 다.
      🔴 **그래도 이 행은 안 닫는다** — 거기서 새 고장이 나왔다: **승인된 항목이 0건이어도
      발행이 201 이다** (FINDINGS **80**). 규칙 한 줄 없는 v1.0.0 이 공식이 되고 기기들이
      그것을 `applied` 로 받아 간다. 「발행 가능」과 「발행이 옳다」는 다르다.
      ⚠ 여전히 **진짜 키로 부른 적이 없다** — 완료 기준(「paylab 문서 → 항목 12 + 충돌 3」)은
      키가 있어야 잰다 (🙋).
      ⚠ **캡처로 본 적이 없다** — 이 환경에 브라우저가 없다 (`docs/STATUS.md` 「눈 판정 대기」).
      ⑨ ✅ **열린 질문의 답도 항목이 된다 — 자리를 사람이 고른다** (`7b7f521` · FINDINGS **105**)
      — 화면 4 의 열린 질문 카드는 답을 저장해도 **항목이 0개**였다. 답이 항목이 되는 길이
      `AnswerQuestions.draft` 하나였는데 **그 칸을 보내는 제품 코드가 0곳**이었다(시험만).
      이제 화면은 초안을 조립하지 않고 **고른 자리의 이름만** 보낸다(`save_as`) — 옮기는
      것은 서버이고 표는 `ANSWER_SLOTS` 하나다. 어느 카드가 자리를 묻나는
      `CONFLICT_KIND_RULES` 의 **새 축 `answerSlot`** 이 정한다(`seeded`·`ask`·`none`) —
      화면에도 라우트에도 `kind ===` 갈래가 없다. 초안을 짓는 자리도 하나로 모았다
      (`lib/api/answer.ts` 의 `answerDraft()` — 씨앗 길과 공용). 관통 654→**659**.
      🔴 **남은 것: 화면 3 의 질문 스택은 아직 안 묻는다** (FINDINGS **106**) — 문서를
      올린 뒤 그 스택에 섞이는 열린 질문은 여전히 기록만 된다. → ⑩ 에서 닫았다.
      ⑩ ✅ **화면 3 의 질문 스택도 묻는다** (`8d19a50` · FINDINGS **106**) — 같은 구멍의
      다른 화면이었다. `question-stack.tsx` 에 `kind` 가 **0번** 나왔고, 그래서 씨앗 질문과
      열린 질문을 똑같이 그렸다. 새 표도 새 계약도 안 만들었다 — ⑨ 가 세운
      `CONFLICT_KIND_RULES[kind].answerSlot` 과 `ANSWER_SLOTS` 를 **읽기만** 한다
      (`ANSWER_SLOTS` 를 읽는 곳이 셋 → **넷**). 새로 정한 것은 둘뿐이다:
      고른 자리를 **답과 따로** 든다(`saveAs` — 한 장씩 넘기는 흐름이라 [이전] 로 돌아왔다
      나가면 답에 묶인 값은 사라진다) · 요약이 **「몇 개가 항목이 되나」를 저장 전에** 말한다
      (`becomingItems` — 씨앗만 있던 때는 「답한 것 = 항목」이 늘 참이라 그 말이 필요 없었다).
      씨앗 카드에는 안 그린다(실으면 서버가 400). 시험 16→**22** · 관통 659→**666**.
      덤프를 읽어 **옆 문장 하나가 거짓이 된 것**을 잡았다 — 저장 결과의 「그 답을 항목으로
      만드는 것은 정리 화면의 일입니다」는 이제 참이 아니다
      (`docs/evidence/2026-09-06-question-stack-slot/stack.txt`).
      🔴 **남은 것: 이 행의 완료 기준을 ⑧ 이후로 다시 안 쟀다.** ⑧ 이 「된다」를 한 번 쟀고
      그 뒤로 ⑨·⑩ 이 길을 하나 더 텄다 — **다시 재고 이 행을 닫을지 정해라**
      (FINDINGS **35** · 자는 `apps/web/scripts/dump-questions-only-pack.ts`). → ⑪ 에서 쟀다.
      ⑪ ✅ **다시 재고 이 행을 닫았다** (`130b5f2` · 54바퀴 · FINDINGS **35** 닫음) — 화면이 항목을
      만드는 문은 셋이고(A 씨앗 질문 · B 열린 질문+`save_as` · C 구조화 후보 받아들이기),
      **셋 다 승인 → 발행까지 가고 줄마다 자기 문으로 역추적된다** (P7 — `manual:<질문>` ·
      `manual:<열린 질문>` · `doc:{version}#0-40`). 문 A 하나로 v1.0 이 나가는 것도
      ⑧ 이후 처음 다시 쟀다 — 2026-09-04 산출물과 **본문이 한 글자도 안 다르다**
      (다른 것은 `snapshot_hash` 뿐이고 그건 `project_id` 가 지문에 들어가서다).
      새 자리 `apps/web/test/web-item-doors.test.ts` 는 셋을 **한 프로젝트에서 섞어**
      지난다 — 문 쪽 시험들은 「행이 생기는 데까지」만 재서 문 하나가 Pack 앞에서 끊겨도
      초록이었다. 관통 666 → **670**. 눈으로 읽은 것: `docs/evidence/2026-09-06-item-doors/`.
      ⚠ **§7.1 은 여전히 스텁이다** — 진짜 키로 부른 적이 없다 (🙋). 그건 이 행이 아니라
      **P3 첫 행**의 완료 기준이다.
      ⚠ **브라우저 캡처는 아직 없다** — 이 환경에 브라우저가 없다 (`docs/STATUS.md`
      「눈 판정 대기」). 화면 3·4 의 눈 판정은 마크업을 읽는 시험으로 대신했다 (④⑥).
      🔴 재다가 나온 것: 라우트가 `answerSlot` 3종을 **두 갈래로만** 읽는다
      (FINDINGS **108** — 지금은 닿을 수 없어 구멍이다).

## P4 — 나머지 화면과 데모 (SPEC 9/12~9/13)

- [x] **웹 화면 6·8** — Proposal · Roadmap · Realtime
      **완료 기준**: agent progress → Roadmap 갱신 · **Roadmap 기본 행이 마일스톤** (P5)
      ① ✅ **웹 화면 8 — Roadmap · Realtime** (`7398e44` · 55바퀴) — `…/roadmap`.
      **이 행의 완료 기준 절반을 쟀다**: 기기가 `POST …/progress` 로 보고하면 그 수가
      Roadmap 의 행에서 갈리고(`evidence_count`·`status`·`last_report_at`), **행은
      마일스톤이다** (P5 — 응답에도 화면에도 `device_id`·`confirmed_by` 가 없고,
      그것을 시험이 센다). Realtime 은 **폴링 10초**다 (SPEC §14 절삭 8 · `ROADMAP_POLL_MS`) —
      job 폴링과 달리 **끝나는 일이 아니라서** 화면을 연 내내 돈다.
      🔴 **[완료 확인] 은 만들 수가 없었다.** `POST /progress/{id}/confirm` 은 **보고
      하나의 id** 로 부르는데 그 id 를 내는 문이 하나도 없었다 — 보고를 만든 것은 기기이고
      그 응답은 사람의 브라우저에 안 온다. 라우트가 **`confirmable`**(아직 확정 안 된 제일
      최근 `done_candidate` **하나**)을 내면서 그 버튼이 처음 존재할 수 있게 됐다.
      목록으로 안 낸다 — 여럿을 내면 「어느 것을 확정하나」를 화면이 고르게 되고 그 규칙이
      서버와 갈린다. ★ 이게 「agent 는 스스로 완료를 선언하지 못한다」의 **화면 쪽 절반**이다.
      🔴 **`PROGRESS_STATUSES` 의 `none` 이 처음으로 무언가를 바꾼다** (④2-B) — 「어느
      마일스톤도 아니다」 보고는 `PROGRESS_EFFECT.none === undefined` 라 **어디에도 안
      보였다.** `off_roadmap` 이 그 자리다. 가르는 규칙은 **하나**(지금 Manifest 의
      마일스톤 id 가 아닌 것)라 지난 Pack 에만 있던 마일스톤도 같이 걸린다.
      표 둘이 늘었다: `MILESTONE_CHIP`(4종 — **`done_candidate`≠`done` 이 제품의 약속
      하나를 통째로 들고 있어서 tone 까지 시험이 잠근다**) · `PROGRESS_SOURCE_LABEL`(3종).
      `MILESTONE_STATUSES` 는 **둘째 사용자(화면)가 생겨** `packages/schema` 로 올라갔고,
      진행 막대는 `job-progress.module.css` 가 예고한 대로 **둘째 사용자가 와서**
      `globals.css` 로 올라갔다 (`.bar`/`.bar-fill`).
      웹 시험 396 → **430** · 관통 670 → **704**.
      **눈으로 읽었다** — `docs/evidence/2026-09-06-roadmap/roadmap.txt` (20모양).
      덤프를 읽어 **거짓 문장 하나**를 잡았다: 마일스톤이 0개인데 타일이 「전부 한 번은
      보고됐습니다」라고 말했다 (아무것도 없는데 전부 됐다고 한다).
      **빨개지는 것을 봤다** — 라우트에서 `confirmedAt === null` 을 빼면 확정한 뒤에도
      버튼이 남고(API 시험 빨감) · 화면에서 충돌 수를 행마다 더하면 「3」이 「6」이 된다.
      🔴 재다가 나온 것: **Manifest 마일스톤에 `due` 가 없다** (FINDINGS **111** — 계약과
      Pack 본문에는 있는데 Manifest 만 안 나른다) · **화면 9 가 아직 없어 `SYNC_CHIP` 5종을
      그리는 곳이 0곳이다** (FINDINGS **110** — 주인은 이 Phase 둘째 행).
      ⚠ **브라우저 캡처는 아직 없다** — 이 환경에 브라우저가 없다. 눈 판정은 마크업을
      읽는 시험 + 위 덤프로 대신했다.
      ② ✅ **웹 화면 6 — Proposals 목록·상세** (`e1e79d5` · 56바퀴) — `…/proposals` · `…/proposals/[id]`.
      🔴 **문을 하나 더 만들었다: `GET /proposals/{id}`.** 목록이 `items` 까지 통째로 내서
      상세를 목록으로 그릴 수는 있었지만, 목록은 `?limit=50` 이라 **51번째 제안의 상세를
      영원히 못 연다.** 그 문이 `targets`(대상 항목의 **지금** 모습)를 같이 내고 그것이
      before/after Diff 의 **before** 다 — 화면이 항목 목록을 훑으면 같은 상한에 다시
      걸리고, 못 찾은 것을 「빈 before」로 그리면 **update 가 add 처럼** 보인다.
      ⚠ 없는 대상은 안 싣는다 — 화면이 「대상 항목을 찾을 수 없습니다」라고 말한다
      (발행이 그 제안에서 롤백되는 것과 같은 사실이다).
      🔴 **`PROPOSAL_DECISIONS` 가 `packages/schema` 로 올라갔다** — 화면이 「지금 어떤
      버튼을 그릴 수 있나」를 묻는 **둘째 사용자**가 됐다. 서버(`decide()`)와 화면이 같은
      표를 읽어서, 상태 5종 × 등급 2종 열 갈래를 시험이 표와 대조한다. `PROPOSAL_STATUSES`
      도 같이 올라갔다 (화면이 상태마다 다른 칩을 그린다).
      🔴 **거절은 사유가 필수가 됐다** (`noteRequired` · DESIGN_BRIEF §4 화면 6). 화면만
      막지 않고 **서버도 같은 표로 막는다** — 화면만 막으면 CLI 로 사유 없는 거절이 들어오고,
      그때 제안을 쓴 사람은 무엇을 고쳐야 하는지 알 자리가 없다.
      표 넷이 늘었고 시험이 잠근다: `PROPOSAL_STATUS_CHIP`(5종) · `PROPOSAL_OPERATION_CHIP`(3종) ·
      `DECIDED_TEXT`(3종) · `DIFF_MISSING_TEXT`(2종). diff 는 순수 함수 하나다
      (`lib/web/diff.ts` — LCS).
      웹 시험 430 → **467** · 관통 704 → **741**.
      **눈으로 읽었다** — `docs/evidence/2026-09-06-proposals/proposals.txt` (모양 25개).
      덤프가 시험이 못 잡은 것 둘을 잡았다: ① 화면이 `approved` 같은 **영어 enum 값을
      사람에게 그대로** 보여 줬다 (→ `DECIDED_TEXT`) ② `add` 항목에 **역추적 태그가
      없었다** — 대상이 없다고 id 가 없는 게 아니다 (`draft.id` 가 그 항목이 받을 id 다 · P7).
      **빨개지는 것을 봤다** — 「대상이 없다」와 「바꿀 본문이 없다」를 한 문장으로 합치면
      시험이 빨개진다 (둘은 사람이 할 일이 다르다).
      🔴 재다가 넷 나왔다: **작성자 이름을 내는 문이 없다**(FINDINGS **113**) ·
      **항목별 승인/거절을 담을 자리가 서버에 없다**(**114**) · **목록 거르개가 없다**(**112**) ·
      **CLI 가 찍는 제안 주소가 앱에 없는 주소다**(**115**).
- [ ] **웹 화면 9 · 게스트 데모 · 랜딩 v1**
      **완료 기준**: 🔴 **GATE 3** — 시크릿 창에서 링크만으로 3분 체험
      → ① **화면 9(`…/sync`) 는 됐다** (`8c3e8c5` · 57바퀴). 팀원|기기|버전|상태|
      마지막 보고|적용 방식 표 · 상태 요약 · 각주. `SYNC_CHIP` 5종이 **처음으로 그려진다**
      (FINDINGS 110 — 표는 있었는데 읽는 화면이 0곳이었다).
      🔴 **이름을 내는 문을 만들었다** (`lib/api/user.ts`) — 나가는 칸은 `{id,name}`
      둘뿐이고 이메일은 없다. 라우트마다 select 를 손으로 적으면 어느 라우트가 이메일까지
      실어 보내고, 그 응답은 이미 브라우저에 도착한 뒤라 되돌릴 수 없다. 같은 문이
      화면 6 의 「작성자」 칸도 열었다 (FINDINGS **113** 닫음 · `aee5de2`).
      표 셋이 늘었고 시험이 잠근다: `SYNC_MEANING`(툴팁과 각주가 같이 읽는다) ·
      `SYNC_ORDER`(outdated 먼저) · `SYNC_APPLY`(방식 3가지에 상태 5종이 모인다 —
      여기만 「값이 전부 다르다」를 안 잰다. 강요하면 없는 방식을 지어내게 된다).
      `ROADMAP_POLL_MS` → `REALTIME_POLL_MS`: 화면 8·9 가 같은 「Realtime(폴링 10초)」라
      **둘째 사용자**가 생겼다 (§14 절삭 8).
      웹 시험 467 → **488** · 관통 741 → **762**.
      **눈으로 읽었다** — `docs/evidence/2026-09-06-sync/sync.txt` (모양 20여 개).
      → ② **게스트 데모 테넌트·시드·읽기 전용 게스트는 됐다** (58바퀴). `/demo` 를 열면
      `POST /demo/session` 이 **게스트 세션 하나**를 서명해 주고, 그 토큰으로 화면
      5·6·8·9 가 **실제 데이터로** 열린다 (기기 12 = applied 9/outdated 2/manual 1 ·
      제안 4갈래 · 마일스톤 근거 · 로드맵 외 1).
      🔴 **읽기 전용을 등급이 아니라 「주체 종류」로 만들었다** — `ACTOR_RULES` 에 `writes`
      축 한 줄이고 막는 자리는 `lib/api/route.ts` 하나다 (기준은 HTTP 안전 메서드).
      등급 사다리에 칸을 팠으면 **모든 GET 라우트의 요구 등급**을 같이 낮춰야 했고,
      서른 곳 중 하나만 어긋나면 그게 P1 옆의 구멍이다.
      시드 정본은 `fixtures/seed/demo.json`(팀원·기기·보고·진행) + `src/lib/demo/seed-demo.ts`
      (제안 표 — 대상 항목 id 가 코드에만 있다 · 63바퀴에 `scripts/` 에서 제품 코드로 올라왔다).
      항목·문서는 `src/lib/demo/seed.ts` 하나에서 온다 — 데모용으로 베끼면 데모와 관통이 갈린다.
      웹 시험 488 → **505** · SPEC §5·§9·§10.3 을 코드와 같게 고쳤다.
      **눈으로 읽었다** — `docs/evidence/2026-09-06-demo/demo.txt` (`scripts/dump-demo.tsx` 가
      **진짜 게스트 토큰으로 진짜 라우트**를 부른다). 덤프가 시험이 못 잡은 것을 하나 잡았다:
      화면 9 의 「팀원」 칸에 **`demo-member-haeun` 같은 sub 가 그대로** 그려졌다 —
      `sessionActor()` 가 로그인마다 `users.name` 을 claims 로 덮기 때문이다.
      → ③ **랜딩 v1 은 됐다** (59바퀴). `/` 가 **정적** 화면 1 이다 — 헤드라인 ·
      Before/After · 왜 git 인가 3+1 · 3단계 · 신뢰 경계 표 · 설치 4줄 · 푸터.
      accent 는 [샘플 팀으로 둘러보기] **하나**이고 `/demo` 로 간다. 로그인 화면의
      「심사위원이신가요?」도 같은 `/demo` 다 (게스트 입구는 하나).
      🔴 **Before/After 는 paylab 픽스처의 사실이다** — 문서 §3.1(5회 · 지수 백오프) 대
      코드 `retry.ts:11`(3회 · 500ms), 그리고 After 의 답은 **게스트가 v1.1.0 에서 실제로 보는
      `item_policy_retry` 의 그 줄**이다. 씨앗(v1.0.0)의 문장이 아니라 승인된 제안의 문장이라
      `DEMO_PROPOSALS` 를 내보내 `test/web-landing.test.ts` 가 글자 그대로 대조한다 —
      첫 화면과 앱이 다른 문장을 말하면 시험이 빨개진다.
      🔴 **없는 것은 안 만들었다**: [2분 영상 보기](영상 없음 · P6) · 터미널 재생·스텝
      썸네일(FINDINGS **123** · P5 첫 행) · GitHub/Known limitations 링크(**122** · 🙋 URL) ·
      `npx contextops`(npm 에 없다 — 설치 줄은 SPEC §8.3 의 **실제 명령** 4줄이고 시험이
      Skill 폴더와 CLI 파일의 존재를 센다).
      웹 시험 **525** (CI test 층 실측 · 24 파일 · `web-landing` 27개). **눈으로 읽었다** — `docs/evidence/2026-09-06-landing/landing.txt`
      (`scripts/dump-landing.tsx`). 덤프가 잡은 것: 머리글과 히어로에 [로그인]이 **둘** 서서
      하나로 줄였다. ⚠ 브라우저 캡처는 없다 — 「스크롤 없이 A·B·C 가 보이나」는 사람 몫이다.
      → ④ 남은 것: **GATE 3 을 사람이 시크릿 창에서 한 번 밟는다** (`pnpm --filter web demo:db`
      → `http://localhost:3000/`) · `/demo/ai-once`(P3 · FINDINGS 117 · 🙋 Anthropic 키) ·
      production 시드(Cron · **120** · P5 둘째 행).
      ⚠ 화면 9 의 **질의창(§7.3)은 안 만들었다** — 부르는 문(`POST …/ask`)이 0곳이고
      §14 **절삭 순서 1번**이다 (FINDINGS **117**). 누르면 아무 일도 안 하는 입력칸을
      두지 않았다. GATE 3 은 질의창 없이도 선다

## P5 — 배포와 마감 (SPEC 9/14~9/15)

- [x] **AGENTS/cursor 타깃 · Pack zip · 터미널 재생 컴포넌트** — `8faad6a` `2a1db06` `8c53a89`
      → ① **Pack zip 은 됐다** (60바퀴). `GET …/packs/{semver}/zip` — 압축 없이(store) 담고
      항목 시각은 Manifest 의 `generated_at` 이라 **같은 버전은 같은 byte** 다 (P4 의 연장 ·
      라이브러리 0 · `lib/api/zip.ts`). zip 안에 `.contextops/manifest.json` 이 플러그인
      `sync` 가 쓰는 자리·모양 그대로 든다 — 손으로 푼 기기가 `status` 로 판정받는 재료다.
      화면 7 상단 우측에 [Pack 다운로드 (.zip)] 과 「이 Pack을 받은 기기 N / M」이 섰다
      (`countReceived` — 화면 9 와 같은 문 · 같은 표). 관통 publish 단계가 zip 을 되읽고
      byte 동일성을 잰다(28 → 31) · 독립 도구 `unzip -t` 로 열었다
      (`docs/evidence/2026-09-06-zip/zip.txt`). 🔴 시험이 잡은 것: DB jsonb 가 Manifest 의
      키를 제 순서로 늘어놓아 zip 안 manifest.json 이 플러그인 것과 **글자가 달랐다** →
      계약으로 되판 뒤 적는다. ⚠ `manual` 을 **보고하는** 쪽(플러그인 `status`)은 아직
      없다 — FINDINGS 69 는 그대로 대기이고 주인은 플러그인을 만지는 바퀴다.
      → ② **AGENTS/cursor 타깃은 됐다** (61바퀴 · 템플릿 1.2 → 1.3 · FINDINGS 7 닫음).
      `DOCS` 표에 **거울 문서** 둘(`agents` → `AGENTS.md` · `cursor` → `.cursor/rules/contextops.mdc`)
      — partition 에 줄을 더하지 않고 `compose` 가 원본 문서들의 블록을 **그대로** 모은다
      (같은 태그 · P7 그대로). 둘은 머리말만 다르고 본문이 byte 로 같다. `PACK_TARGETS` 3종이
      전부 파일을 낸다 — liveness 시험이 `PACK_TARGETS` 를 돌며 잠근다. scoped 줄이 끝에
      `· 도메인:`/`· 경로:` 를 적게 됐다(한 절에 모이면 범위가 사라져서). 플러그인 allowlist 는
      이미 두 경로를 알고 있었다 — 관통 sync 가 실제로 쓴다.
      → ③ **터미널 재생은 됐다** (62바퀴 `8c53a89` · FINDINGS 123 닫음). 녹화 `fixtures/replay/sync.json` 은
      **관통 sync 단계가 배포되는 번들을 돌려 남긴 stdout** 이다(훅 알림 → `/contextops:sync` →
      `progress` 보고 · 17줄) — 손으로 쓴 줄이 0 이고, 관통이 매번 다시 녹화해 대조한다(`t_ms` 제외).
      `<TerminalReplay>` 가 랜딩 C-3 에 섰고 오른쪽 Roadmap 미니 패널은 왼쪽 줄을 읽어서 바뀐다
      (근거 0/3 → 1/3 · 마일스톤은 씨앗의 PL-M1 과 글자 그대로). 계약 `ReplayFrames` 는 schema 에.
      ⚠ 스텝 썸네일(C-2)은 production 캡처가 생긴 뒤다 — 둘째 행의 몫.
- [ ] **Vercel production · Cron · 보안 캡처 증거 · 새 PC fresh install**
      **완료 기준**: production 으로 발표 시나리오 1회 완주
      → ① **Cron 의 코드 쪽은 됐다** (63바퀴 · FINDINGS 120 닫음). `GET /cron/demo-reset` 이
      데모 테넌트를 **지우고 다시 심는다** (`lib/demo/reset.ts` · `teardown.ts`) — `CRON_SECRET`
      자물쇠 뒤(`lib/api/cron.ts` · 없으면 401), 심다가 던지면 다시 지운다. 시드 둘이 `scripts/`
      에서 제품 코드(`src/lib/demo/`)로 올라왔고 `test/helpers` 의존이 0 이 됐다(시험이 센다).
      `apps/web/vercel.json` 에 cron 둘(health 6시간 · demo-reset 18:00 UTC = 03:00 KST —
      시험이 `DEMO_TENANT.resetAt` 과 대조). 픽스처는 `next.config.ts` 의
      `outputFileTracingIncludes` 로 배포 함수에 싣는다. 시험 14개 (`demo-reset` · `-rollback`).
      → ② **보안 캡처 증거의 코드 쪽 절반은 됐다** (64바퀴 · FINDINGS 124 닫음).
      `docs/evidence/2026-09-06-p1-payload/p1-payload.md` — 관통 scan·payload·sync 단계가 매번 재는 P1 을
      사람이 읽는 표로: 나가는 body 4종의 **있는 필드와 없는 필드** · 실제로 나간 body 3건의 필드 전부(관통
      산출물 `sent` 그대로) · 계약 밖 키는 exit 2 · 요청 0건 · 48파일 본문 0건 · 심은 env 값 2개 0건 · 토큰 0건 ·
      서버 로그 필드표 · Memory/transcript 읽는 코드 0곳. 🔴 고친 것: payload 단계의 env 값 검사가 **잰 값이 0개**
      였다(픽스처 `.env.example` 은 값이 0건이어야 해서) → 관통이 임시 저장소에 값을 심고, 0개면 FAIL.
      → ③ **scan 단계의 같은 구멍도 닫았다** (65바퀴 · FINDINGS 125 닫음). 관통이 픽스처를 임시 사본에 복사해
      값이 든 `.env` 를 심고 그 사본을 훑는다 — 심는 값의 정본은 `tools/walkthrough-stage.ts` 의 `PLANTED_ENV`
      하나(payload 단계와 같은 값). 잰 값 2개 · 0건 · 심은 키가 `env_keys` 에 있음(14 → 15) · **잰 값 0개면 FAIL**.
      scan 단계 49 → 50검사. 브라우저 네트워크 탭 캡처는 🙋 배포 뒤.
      🙋 **남은 것은 전부 계정이 필요하다** — Vercel 연결(Root Directory `apps/web` ·
      `CRON_SECRET`·`SUPABASE_JWT_SECRET`·`DATABASE_URL`) → 첫 리셋을 손으로 한 번
      (`curl -H "Authorization: Bearer $CRON_SECRET" …/api/v1/cron/demo-reset`) → `/demo` 가
      production 에서 열리는지 → 보안 캡처 · fresh install.

## P6 — 발표 (SPEC 9/16~9/17)

- [ ] **2분 영상 · 슬라이드 · 리허설**
- [ ] **제출서 · README · KNOWN_LIMITATIONS**
      **완료 기준**: 제출 가능
      → ① **README · KNOWN_LIMITATIONS 의 본문은 됐다** (66바퀴 `0dc2e93` · FINDINGS 122 의 본문 쪽). README 는
      「이 저장소에는 루프와 명세만 있다」던 옛 문장을 지우고 **지금 도는 것**을 적었다 — 신뢰 경계 7줄에
      「무엇이 잰다」 칸 · Before/After(랜딩 표와 글자 그대로) · 설치 4줄 · CLI 8 · 검사 층 · 저장소 지도.
      KNOWN_LIMITATIONS 는 줄마다 코드에서 이름을 찾아 다시 썼고, P1 근거 문서 §7 의 두 줄에 코드에서 확인한
      것(production 없음 · `npx` 없음 · `ask`·`demo` 문 없음 · 데모 15개 · zip 드롭존 없음 · `manual` 보고 없음 ·
      manifest 서명 없음 · e2e 없음 · 게스트 403 문구)을 더했다. `apps/web/test/readme.test.ts` 가
      README ↔ 랜딩 표(문장 글자 그대로) · README 가 가리키는 경로 전부 실존 · KNOWN_LIMITATIONS 가 단
      FINDINGS 번호가 전부 **대기**인지를 잰다 — 닫힌 것을 한계라고 적으면 빨개진다.
      → 남은 것: **제출서**(FINDINGS 126 · 루프가 할 수 있다) · 🙋 공개 저장소 URL · 제출 팀명 (FINDINGS 122) ·
      🙋 영상 링크 (첫 행이 끝나야).

---

## 절삭 순서 (Gate 실패 시 — SPEC §14)

밀리면 **이 순서로 자른다.** 자를지 말지 고민하지 말고 위에서부터 지운다:

1. 질의창(§7.3) → 2. 터미널 재생 → 3. Roadmap 「완료 확인」 UI → 4. AGENTS/cursor 타깃 →
5. Pack zip → 6. 실데이터 픽스처(paylab만) → 7. Stop 훅의 pending-proposal →
8. Realtime(폴링 10초)

**절대 자르지 않는 것**: 스키마 · 컴파일러 · 발행 트랜잭션 · setup · sync ·
SessionStart 훅 · init Skill · 충돌 카드 · 게스트 데모 · 랜딩 before/after
