# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 8바퀴 · `e5f61c8` `6b990f9`_

---

## 지금 어디인가

**P1 셋째 행(API 2군 + 발행 트랜잭션)이 끝났다. 다음은 P1 넷째 행 — 웹 화면 2·5·7 이고
그게 🔴 GATE 1 이다.**

🔴 **관통이 3단계에서 4단계가 됐다.** `publish` 가 SKIP 에서 풀렸다 —
픽스처 문서를 넣고 **한 번도 안 멈추고 Pack 파일까지** 간다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | **웹 화면 9개** (`app/` 에 자리 표시 하나뿐) |
| `packages/schema` (계약 전부 + API 계약 · 테스트 **105**) | Supabase 프로젝트 (🙋 사람) · Vercel |
| `packages/compiler` (파이프라인 7단계 · 테스트 112 · `COMPILER_VERSION`) | `plugin/contextops` 의 bin·skills·hooks |
| **`apps/web` — 라우트 27개 · 테스트 98** | 서버측 AI (`structureDocument`·`detectConflicts`) |
| **발행 트랜잭션** (`lib/api/publish.ts` · SPEC §2.1 여덟 단계) | `packs/{semver}/zip` (P5 첫 행이 주인) |
| `apps/web/src/db` (표 16 · 인덱스 5 · enum 14 · 마이그레이션 2) | 충돌을 **만드는** 코드 (P3 · FINDINGS 28) |
| `fixtures/paylab-*` · `plugin/contextops/schemas/*.json` 7개 | |

검사 층: `principles OK 6 · typecheck OK 7초 · test OK 37초·멤버 3 · build OK 16초 ·
walkthrough OK 40초` → **GREEN**.
관통 4단계 (`fixture`·`compile`·`api`·`publish`). 남은 SKIP 셋의 prereq 는
`walkthrough-payload.ts`(P2) · `plugin/.../contextops-cli.mjs`(P2) · `apps/web/e2e`(화면).

## 다음 바퀴가 할 일

`docs/PLAN.md` **P1 넷째 행**: 웹 화면 2·5·7 (로그인 · Context · Pack Explorer).
**🔴 GATE 1 이다** — 「웹에서 항목 입력 → 발행 → Pack Explorer 에서 역추적 확인」.
정본은 `SPEC.md` §9 **+ `docs/DESIGN_BRIEF.md` §3(토큰 정본)** · 참고 시안 `design/*.dc.html`.

**API 는 다 깔려 있다. 화면이 새 문을 만들 필요가 없다:**

| 화면이 필요한 것 | 이미 있는 라우트 |
|---|---|
| 항목 목록·필터 | `GET /projects/{id}/context-items?type&status&scope` |
| 항목 고치기 | `PATCH /context-items/{id}` (`{revision, changes}` · 409 낙관적 잠금) |
| 발행 | `POST /projects/{id}/versions/publish` (`base_version_id` 는 **null 도 명시**) |
| 버전 목록 | `GET /projects/{id}/versions` (`is_official` 이 같이 온다) |
| Pack Explorer | `GET /packs/latest/manifest` · `/packs/{semver}/files/{path}` (**text/plain**) |
| 역추적 | `pack_files.source_map` (줄 범위 → 항목 ID) · 본문의 `<!-- ctx:… -->` |
| 기기 상태 | `GET /projects/{id}/sync-status` (`unknown` 은 서버가 매긴다) |
| Roadmap | `GET /projects/{id}/roadmap` (행은 **마일스톤** — P5) |

⚠ **눈 판정 합격선은 8개, 6개 미만이면 미완성**이다 (`loop/PROMPT.md` ⑦3층).
`DESIGN_BRIEF` §3 토큰만 쓰고, loading/empty/error **세 상태를 전부** 찍어라.
**「실시간」이라는 단어를 쓰지 마라** — "마지막 보고: 8분 전, v1.3, applied" 형식이다.

**값싼 것들 (아무 바퀴에서나 · 화면 작업 중 막히면 이걸로 돌려라)**:
FINDINGS **21·22·23·17** 은 SPEC 을 코드에 맞추는 **문서 한 줄**짜리다.
**14**(`.ps1` 두 개가 LF)도 그렇다. **30**(domain 파일 제목)은 템플릿 한 줄인데
**golden 이 빨개진다** — `TEMPLATE_VERSION` 을 올리고 이유를 커밋 메시지에 써야 한다.

⚠ FINDINGS **24·25·26·28·29·31** 은 전부 **P3 가 주인**이다. 지금 열지 마라.

## 잰 것

**8바퀴 · P1 셋째 행 — API 2군 + 발행 트랜잭션** (`e5f61c8` · `6b990f9`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK 6 / typecheck 7초 / test 37초 / build 16초 / **walkthrough 40초·4단계** |
| 라우트 | 13 → **27개** (`next build` 가 전부 `ƒ (Dynamic)` 로 낸다) |
| 새 시험 | **+49** — web 59 → **98** · schema 95 → **105**. 전체 266 → **315** |
| 새 파일 | `lib/api/{publish,proposal,progress,sync,pack}.ts` · 라우트 14개 · 시험 2개 · `scripts/walkthrough-publish.ts` · `packages/compiler/src/version.ts` |
| 마이그레이션 | **없다** — 표 16개로 다 됐다. DB 를 안 건드린 것이 의도다 |

**관통 `publish` 단계가 실제로 지나는 것** (검사 13개 · 2초):
픽스처 문서 2개 업로드 → 초안 6개 → 전부 active → `1.0.0` 발행 → Manifest 를
`Manifest.parse` 로 되팜 → **파일마다 받은 본문의 sha256 을 다시 재서** Manifest 와 대조 →
같은 ETag 로 다시 부르면 304 → 낡은 base 는 409 `STALE_BASE` → 제안 submit·approve →
`1.1.0` 발행 → **새 항목이 Pack 본문에 나옴** → 기기 둘 중 하나만 보고 →
`applied`/`unknown` → 진행 보고 하나가 roadmap 을 `not_started → in_progress` 로 바꿈.

**설계에서 한 판단 다섯** — 다음 바퀴가 되돌리지 않게 이유를 남긴다:

- **`base_version_id` 는 nullable 이고 optional 이 아니다.** 첫 발행은 `null` 인데 그걸
  「빼도 되는 필드」로 두면 **낡은 기준을 빠뜨린 요청과 구별할 수 없다** — `STALE_BASE`
  검사가 통째로 무력해진다. 「기준이 없다」는 명시적으로 말해야 한다.
- **컴파일을 DB INSERT 보다 먼저 한다.** SPEC §2.1 의 번호는 4(버전)→5(컴파일)지만
  순서를 바꿨다. 결과는 같고(어차피 전부 롤백) **에러 details 가 정확해진다** —
  제약 위반이 먼저 터지면 「어느 항목이 문제인가」가 드라이버 메시지에 묻힌다.
- **승인된 제안의 `add` 는 항목을 `active` 로 만든다.** `draft` 로 넣으면 snapshot(active
  만)에 안 들어가서 **Pack 에 안 나온다** — 승인이 아무것도 안 한 것이 된다.
- **`sync-reports`·`progress` 는 기기 토큰만 할 수 있다.** 사람이 브라우저에서 대신 적을 수
  있으면 「마지막 보고」가 무엇의 시각인지 말할 수 없다. 손으로 올리고 싶으면 CLI 를 통한다
  (`source:'manual'`).
- **모르는 버전의 sync 보고도 받는다** (`version_id` = null). 버리면 zip 을 손으로 푼 기기가
  **영원히 `unknown`** 으로 남아서 화면이 「보고가 없다」고 거짓말한다.

**게이트가 갈리는지 3번 확인했다** (전부 되돌렸다):

| 무엇을 뒤집었나 | 결과 |
|---|---|
| `WITHOUT_OWNER` 를 그대로 둔 채 `fail('STALE_BASE')` 를 만듦 | `이제 내는 자리가 생겼다 — WITHOUT_OWNER 에서 지워라: STALE_BASE, COMPILE_FAILED` |
| 「내용 안 바뀐 발행」 검사를 넣어 봄 | 시험이 **201 을 잡아냈다** → 그 검사는 죽은 코드였다. 빼고 FINDINGS 27 에 적었다 |
| catch-all(`[...path]`) 라우트를 시험에서 부름 | `params<P extends Record<string,string>>` 이 **타입 검사에서 막았다** → `as any` 로 뚫지 않고 헬퍼를 넓혔다 |

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| **`SYNC_STATUSES` 5종** | `statusOfDevice` + sync-status 라우트 | 보고한 기기 `applied` / 안 한 기기 `unknown` | **살렸다** → FINDINGS 16 ✅ |
| **`PROGRESS_STATUSES` 4종** | `PROGRESS_EFFECT` 표 + roadmap | 네 값이 **세 갈래**로 갈린다 | **살렸다** → FINDINGS 13 ✅(절반) |
| **`PROPOSAL_STATUSES` 5종** | 생성 · `PROPOSAL_DECISIONS` 표 · 발행 7단계 | 다섯을 전부 만드는 코드가 생겼다 | **살렸다** |
| `SOURCE_REF_KINDS` 4종 | `SRC_TAG` 표 (컴파일러) | 종류마다 태그 문자열이 다르다 | **살아 있다** |
| `enforcement` 4종 · `confidence` 3단계 | `ENFORCEMENT_LABEL` · `traceTag` 의 `conf:` | 관통 산출물에서 직접 봤다 | **살아 있다** |
| `PROGRESS_SOURCES` 3종 | 저장만 한다 | 읽는 코드 0곳 | **절반** → FINDINGS 13 에 남겼다 (P4 화면이 주인) |
| `REVISION_ORIGINS` 4종 | `code`·`manual`·`proposal` 3종만 | `doc` 을 만드는 곳 0곳 | **절반** → FINDINGS 31 |
| `CONFLICT_KINDS` 5종 | 읽는 라우트는 있는데 **만드는 곳 0곳** | 늘 빈 목록 | **죽어 있다** → FINDINGS 28 |

**루프 실주행 기준선** — `logs/cycles/*.jsonl` 의 **마지막** result 줄 · `duration_api_ms`

| | dry001·002 | c001 | c002 | c003 `8e02f48` | c004 `84ce3ea` |
|---|---|---|---|---|---|
| 시간 | 0.3분 · 0.3분 | 15.1분 | **result 줄 없음** | 30.2분 | **7.1분** |
| 턴 | 7 · 7 | 77 | (잘렸다) | 92 | **46** |
| 비용 | $0.42 · $0.41 | $6.28 | | $13.90 | **$3.05** |

⚠ **5~8바퀴는 `logs/cycles/` 에 파일이 없다.** 루프 러너가 아니라 직접 연 세션으로 돌았다.
다음 바퀴가 러너로 돌면 이 표를 이어 적어라 (기준: 마지막 result · `duration_api_ms`).

## 눈 판정 대기

_(없음)_

**이번 바퀴에 눈으로 본 것** — 관통이 만든 **Pack 을 직접 열어 읽었다**
(`.ci/walkthrough-pack/` · 재생성은 `pnpm --filter web exec tsx scripts/walkthrough-publish.ts`):

- `CLAUDE.md` 의 **모든 내용 줄에 역추적 태그가 있다** (P7). 태그가
  `ctx:item_mission_paylab rev:2 conf:high src:doc:{uuid}#0-400` 이라 **항목 ID → 문서 →
  문자 범위**까지 이어진다. 픽스처 문서에서 시작해 여기까지 끊긴 데가 없다
- 머리말이 `# paylab-api — Team Context v1.0.0` + `snapshot:8328aa7e` + 「Do not edit by
  hand; run /contextops:propose」다. **팀 규칙으로 배포해도 되겠다**고 읽힌다
- `v1.1.0/CLAUDE.md` 의 Goals 절에 승인된 제안의 항목(`item_goal_settlement`)이
  `rev:1` 로 새로 붙었다 — 제안 → 승인 → 발행이 **산출물에서 보인다**
- 🔴 **여기서 고장을 하나 찾았다**: `.claude/rules/domain-refund.md` 의 제목이 그냥
  `# 도메인` 이다. 도메인 이름이 **파일 이름에만** 있다 — agent 가 여러 도메인 파일을
  한 맥락에 읽으면 어느 규칙이 어느 도메인 것인지 구별할 수 없다 (FINDINGS 30).
  `DocVars.title` 에 값이 이미 와 있는데 `domain` 템플릿이 안 읽는다
- **FINDINGS 9 를 눈으로 재확인했다**: policy 항목의 `body`(「고정 간격 재시도는
  금지한다」)가 Pack 어디에도 없다. 짧은 절은 `body` 를 버린다 — 사용자가 적은 설명이
  **조용히 사라진다**
- 화면은 만들지 않았다. **`DESIGN_BRIEF` 토큰을 아직 하나도 쓰지 않았다** (화면은 다음 행)
- `packages/compiler` 는 `version.ts` 하나만 더했다 (`COMPILER_VERSION`) — 파이프라인은
  한 줄도 안 건드렸다. golden 은 그대로고 3바퀴의 Pack 눈 판정이 그대로 선다

## 막힌 것 — 🙋 사람이 해야 하는 것

| 무엇 | 왜 루프가 못 하나 | 언제 필요한가 |
|---|---|---|
| Supabase 프로젝트 생성 · `DATABASE_URL` · **`SUPABASE_JWT_SECRET`** | 계정·결제가 필요하다 | **🔴 지금.** 코드는 다 됐다 — 값만 꽂으면 P1 첫 행이 닫히고 실제 로그인이 돈다. 필요한 값은 `apps/web/.env.example` 에 전부 있다. **다음 행(화면)은 실제 로그인이 있어야 눈으로 볼 수 있다** |
| Anthropic API 키 (서버측 AI 용, 종량제) | 키 발급은 사람이 | P3 시작할 때 |
| Vercel 프로젝트 연결 · 환경변수 | 계정 연결이 필요하다 | P5 |
| 실데이터 픽스처(`brain`) 공개 가능 여부 판단 | 제품 결정이다 | P5 (안 되면 paylab 만 · SPEC §14 절삭 6번) |

⚠ 루프는 위 항목을 **추측으로 진행하지 않는다.** 값은 `.env.local` 에만 산다 (P1).
🔴 `SUPABASE_JWT_SECRET` 이 없으면 **아무도 로그인하지 못한다** — 조용히 통과시키지 않는 것이
의도다 (`src/lib/api/session.ts`).

## 밟은 함정

> 같은 벽에 두 번 부딪히면 `loop/PROMPT.md` ③ 의 규칙으로, 기계가 잴 수 있으면
> `tools/principles.ps1` 의 검사로 올린다.

- 🔴 **`snapshot_hash` 는 semver 를 품는다.** 「같은 내용은 두 번 발행 못 한다」는 검사를
  넣었다가 시험이 「막힐 줄 알았는데 201」로 잡아냈다 — 번호만 올리면 언제나 다른 해시다.
  **막을 방법이 지금 없다** (FINDINGS 27). 손으로 두 번째 해시를 계산하지 마라.
- 🔴 **catch-all 구간(`[...path]`)의 params 는 배열이다.** `route<P extends
  Record<string,string>>` 로 잡으면 그 라우트를 시험에서 못 부른다. `string | string[]` 로
  넓혀라 — `src/lib/api/route.ts` 와 `test/helpers/db.ts` **둘 다**.
- **`tsx` 는 hoist 돼 있어서 그냥 돌았다** — 유령 의존성이다. `apps/web` 의
  devDependency 로 **선언했다**. pnpm 은 언제든 이 hoist 를 끊는다.
- 🔴 **PowerShell 은 `[id]` 를 와일드카드로 읽는다.** `Get-Content <...>/[id]/route.ts` 는
  **0줄**을 읽고 `-ErrorAction SilentlyContinue` 와 만나면 **조용히 통과**한다.
  → **경로는 언제나 `-LiteralPath`.** (FINDINGS 18) · **bash 도 글로브로 읽는다** —
  `git add 'apps/.../[id]/...'` 는 **따옴표로 감싸라.**
- **파이썬은 Git Bash 의 `/tmp` 를 못 본다.** bash 로 쓴 임시 파일을 파이썬으로 읽으면
  `FileNotFoundError` 다 — **저장소 안에 쓰고 지워라.**
- **`python - <<'PY'` 안에서 한글을 `print` 하면 죽는다** (`cp949`). `python -X utf8` 로
  불러라. ⚠ **쓰기는 이미 끝난 뒤에 죽는다** — 오류만 보고 「실패했다」고 판단하지 마라.
- **워크스페이스 패키지의 의존성은 그 패키지에 적어야 한다.** pnpm 은 유령 의존성을
  허용하지 않는다 — 하나가 빠지면 **파일 전체가 `any`** 가 되어 엉뚱한 오류 20줄이 난다.
- **유니온 Zod 스키마의 `z.infer` 는 느슨하다.** 정밀한 타입은 `packages/schema` 가 mapped
  type 으로 **따로** 내보낸다 → `import { X }` + `import type { X as XType }`.
  ⚠ jsonb 에서 읽은 초안은 `parseContextItemDraft` 로 **다시 판다** — 타입도 풀리고,
  「DB 에서 왔으니 믿는다」로 두면 계약이 바뀐 뒤 옛 제안이 조용히 이상한 항목이 된다.
- **`ItemId` 는 `item_` 뒤에 3자 이상**이다 (`/^item_[a-z0-9_]{3,40}$/`).
- **한 시험 파일 안에서 seed 를 여러 번 부르면 slug 가 부딪힌다** — `paylab-${n}` 처럼
  번호를 올려라. 첫 증상은 「성공 봉투가 아니다: 이미 쓰이는 slug 다」로 **엉뚱한 곳**에 뜬다.
- **`tools/ci.ps1` 을 하위 디렉터리에서 부르면 가짜 RED 였다** (`7f904a2`).
  ⚠ Bash 도구의 cwd 는 `cd` 후에도 **남는다.** `cd` 를 쓴 다음 명령은 절대 경로로 시작해라.
- **`Object.values(모듈)` 로 drizzle 표를 걸러내면 타입 검사가 막힌다.**
  → `const exported: unknown[] = Object.values(schema)` 로 **먼저 받고** 좁혀라.
- **PGlite 는 Docker 없이 마이그레이션을 실제로 적용한다.** 마이그레이션을 읽고 먹이는
  절차는 `apps/web/test/helpers/db.ts` **하나**다 — 관통 스크립트도 그걸 들여온다.
- 🔴 **파일을 셸 heredoc(`<<'EOF'`) 으로 쓰면 `\\` 가 `\` 로 접힌다.** 코드 파일은
  **Write 도구로 써라.** **heredoc 을 여러 개 이어 붙이면 통째로 죽는다** — 한 명령에 하나.
- **`tools/principles.ps1` 은 주석도 센다.** `packages/compiler/src` 에서는
  `Date.now(`·`Math.random(`·`process.env` 를 **주석에도** 쓰면 안 된다.
  ⚠ **`packages/schema/src` 에서는 `patch`·`diff`·`memory`·`secret:` 등이 금지어다** —
  그래서 semver 를 설명할 때도 그 단어를 못 쓴다 (「major.minor.수정」으로 적었다).
  게이트를 똑똑하게 만들려 하지 마라 — 무딘 게이트가 우회할 구멍이 없다.
- **`.ps1` 을 고칠 때는 BOM 과 줄바꿈을 지켜라** (`utf-8-sig` + `newline=''` 둘 다).
  확인은 바이트로: `python -c "d=open(p,'rb').read(); print(d[:3]==b'\xef\xbb\xbf', d.count(b'\r\n'))"`.
- **`git commit` 이 「Author identity unknown」으로 죽었다.** 이 저장소에 로컬로 박아 뒀다.
- **`pnpm -r` 은 멤버가 0개면 조용히 exit 0 이다** (FINDINGS 1). **pnpm 11 의 설치 스크립트
  허용 키는 `allowBuilds` 다** (FINDINGS 6). **`z.toJSONSchema` 는 기본이 인라인이다** —
  `reused: 'ref'`. **`as const satisfies Record<K,V>` 는 표를 읽는 쪽을 망가뜨린다** —
  표는 `const X: Record<K, V> = {…}` 로 타입을 명시해라.
