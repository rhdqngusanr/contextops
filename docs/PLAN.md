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

- [ ] **플러그인 레이아웃 · `setup` · `scan` · `validate` · credentials**
      **완료 기준**: 새 레포에서 `setup` 완료 · `credentials.json` 권한 0600 ·
      `claude plugin validate` 통과
- [ ] **`sync`(백업·atomic·post-verify) · `status` · SessionStart 훅**
      **완료 기준**: 훅 알림 → sync → `applied` 보고 · **hash 불일치에서 중단** ·
      **`session-start.mjs` 에 fs write 0건** (P6) · path traversal 거부
- [ ] **`init` Skill · `upload-draft` · `propose` Skill · `progress` · Stop 훅**
      **완료 기준**: 🔴 **GATE 2** — Claude Code 에서 `init` → 웹 승인 → `sync` 관통 ·
      업로드 payload 캡처에 **코드 본문 0건** (P1)

## P3 — 서버 AI (SPEC 9/10~9/11)

- [ ] **7.1 문서 구조화 · 7.2 충돌 탐지 · 예산 가드**
      **완료 기준**: paylab 문서 → 항목 12 + 충돌 3 · **모든 AI 호출이 `withBudget()` 경유** (P3) ·
      `source_ref` offset 이 문서 범위 안
- [ ] **웹 화면 3·4** — 가져오기 · 정리 · 질문 카드 10장
      **완료 기준**: 문서 없이 **질문만으로 v1.0 발행 가능**

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
