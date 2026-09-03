# STATUS — 다음 바퀴의 유일한 기억

> **매 바퀴 끝에 이 파일을 갱신한다.** 안 쓰면 다음 바퀴는 아무것도 모르는 채로 시작한다.
>
> **한 일이 아니라 잰 것을 써라.**
> 「API 작업함」 ✗ / 「publish 409 재현 테스트 3개 초록, Pack 파일 6개, manifest_hash 고정」 ○

_마지막 갱신: 2026-09-03 · 루프 9바퀴 · `874ea95` `d9d507e`_

---

## 지금 어디인가

**🔴 GATE 1 을 통과했다.** P1 넷째 행(웹 화면 2·5·7)이 끝났고 **웹에서 항목 → 발행 →
Pack Explorer 역추적까지 브라우저로 직접 봤다.** 다음은 P2 첫 행 — 플러그인이다.

**P1 에 남은 것은 첫 행 하나뿐이고 그건 🙋 사람이다** (Supabase `DATABASE_URL`).
루프 몫은 끝났다 — 코드는 다 됐고 값만 꽂으면 닫힌다.

| 있는 것 | 없는 것 |
|---|---|
| `loop/` · `tools/` · pnpm workspace + catalog | **`plugin/contextops` 의 bin·skills·hooks** (P2) |
| `packages/schema` (계약 전부 · 테스트 105) | Supabase 프로젝트 (🙋 사람) · Vercel |
| `packages/compiler` (파이프라인 7단계 · 테스트 **124** · 태그 **읽기**) | 서버측 AI (`structureDocument`·`detectConflicts`) |
| `apps/web` — 라우트 **28개** · 테스트 **124** | 웹 화면 **1·3·4·6·8·9** (2·5·7 은 됐다) |
| **웹 화면 5개** — `/login` `/auth/callback` `/t/new` `/t/[team]/p/new` `/t/…/context` `/t/…/packs[/semver]` | 충돌을 **만드는** 코드 (P3 · FINDINGS 28) |
| **`globals.css` — 토큰 정본 하나** + 게이트 3개 | `packs/{semver}/zip` (P5 첫 행이 주인) |
| **`scripts/dev-server.ts` — 화면을 눈으로 볼 수 있는 씨앗 서버** | 화면에서 항목을 **새로 만드는 폼** (P3 · FINDINGS 35) |

검사 층: `principles OK 6 · typecheck 5초 · test 38초·멤버 3 · build 17초 ·
walkthrough 40초` → **GREEN**. 관통 4단계. 남은 SKIP 셋의 prereq 는
`walkthrough-payload.ts`(P2) · `plugin/.../contextops-cli.mjs`(P2) · `apps/web/e2e`(아래 참고).

## 다음 바퀴가 할 일

`docs/PLAN.md` **P2 첫 행**: 플러그인 레이아웃 · `setup` · `scan` · `validate` · credentials.
정본은 `SPEC.md` §8. 완료 기준은 「새 레포에서 `setup` 완료 · `credentials.json` 권한 0600 ·
`claude plugin validate` 통과」다.

🔴 **P2 를 시작하면 관통 SKIP 두 개가 같이 켜진다** — 그게 이 행의 진짜 값이다:
`payload`(업로드에 코드 본문 0건 · **P1 · 심사 첫 질문**)와 `sync`.
`tools/walkthrough.ps1` 의 단계 표가 prereq 파일 이름을 그대로 적어 뒀다.

**화면 작업이 다시 필요해지면 — 이제 눈으로 볼 수 있다:**

```
pnpm --filter web dev:db          # ① PGlite 를 TCP 로 열고 paylab 씨앗 + v1.0.0 발행
                                  #    DATABASE_URL 과 토큰을 찍어 준다
# ② 그 값으로 next 를 띄운다 (⚠ ?max=1 이 꼭 있어야 한다 — 아래 함정)
# ③ 브라우저를 /auth/callback?next=…#access_token=<토큰>&expires_in=3600 으로 보낸다
```

씨앗의 정본은 `apps/web/scripts/seed.ts` **하나**이고 관통도 그걸 쓴다 —
따로 만들면 관통이 보는 데이터와 화면이 보는 데이터가 갈린다.

⚠ **`apps/web/e2e` 는 아직 없다** (관통 `shots` 단계가 SKIP). 이번 바퀴의 캡처는
헤드리스 Chrome 을 **손으로** 불러서 찍었다. 자동화하려면 그 폴더와
`"test:e2e"` 스크립트를 만들면 관통이 저절로 켜진다.

**값싼 것들 (아무 바퀴에서나)**: FINDINGS **21·22·23·17·32** 는 SPEC 을 코드에 맞추는
**문서 한 줄**짜리다. **14**(`.ps1` 두 개가 LF)도 그렇다. **30**(domain 파일 제목)은
템플릿 한 줄인데 **golden 이 빨개진다** — `TEMPLATE_VERSION` 을 올려라.

⚠ FINDINGS **24·25·26·28·29·31·33·35** 는 전부 **P3 가 주인**이다. 지금 열지 마라.

## 잰 것

**9바퀴 · P1 넷째 행 — 웹 화면 2·5·7 · 🔴 GATE 1** (`874ea95` · `d9d507e`)

| | 값 |
|---|---|
| `tools/ci.ps1` 전 층 | GREEN — principles OK 6 / typecheck 5초 / test 38초 / build 17초 / walkthrough 40초 |
| 화면 | 0 → **5개** (`next build` 가 `/login` `/auth/callback` `/t/new` 를 ○, 나머지를 ƒ 로 낸다) |
| 라우트 | 27 → **28개** (`GET /teams` — 없으면 화면이 slug→uuid 를 못 바꾼다) |
| 새 시험 | **+41** — web 98 → **124** · compiler 112 → **124**. 전체 315 → **356** |
| 새 게이트 | **3개** (아래) |
| 마이그레이션 | **없다** — DB 를 안 건드렸다 |

**🔴 GATE 1 을 눈으로 확인했다** — 근거는 `docs/evidence/2026-09-03-screens/` 에 있다
(`.ci/shots/` 는 관통이 지운다. **적기 전에 복사했다**):

- `s5-context.png` — 공식 `v1.0.0 · e3624065` · 항목 6개. 표에 타입 아이콘 · 제목 +
  CtxTag(`item_policy_retry · rev 2`) · scope(`domain:refund`) · 상태 칩 · confidence ·
  근거 수 · rev. 버전 히스토리에 「공식 v1.0.0 · snapshot · 첫 정본 · [Pack 보기]」
- `s7-pack-trace.png` — **여기가 GATE 1 이다.** `CLAUDE.md` 9번 줄을 고르면 오른쪽에
  `item_goal_success_rate · rev 2` → goal · 적용 중 · high → 「결제 승인 성공률 99.5%」 →
  근거 `¶ 문서 §paylab 결제 서비스 · 0–400자`. **픽스처 문서에서 여기까지 끊긴 데가 없다** (P7)
- `s2-login.png` — 설정이 없으니 「로그인 서버가 아직 연결되지 않았습니다」 + 비활성 버튼.
  **아직 없는 것과 고장 난 것이 화면에서 구별된다**
- `s5-context-needslogin.png` — 401 이 「오류」가 아니라 「로그인하러 가기」로 나온다

**설계에서 한 판단 넷** — 다음 바퀴가 되돌리지 않게:

- **화면은 없는 숫자를 만들지 않는다.** DESIGN_BRIEF 는 「미발행 변경 7건」과 「semver 추천」을
  적지만 **둘 다 서버에 계산이 없다** (FINDINGS 33). 지어내면 「근거 없는 숫자는 화면에
  없다」가 깨진다 — 잰 것(항목 수·공식 버전·snapshot)만 내고, 발행 모달은 세 후보를
  SPEC §6 의 기준과 나란히 놓고 **사람이 고르게** 했다.
- **역추적 태그를 읽는 코드를 `packages/compiler/src/tag.ts`(쓰는 파일)에 뒀다.**
  화면 쪽에 적으면 형식이 두 곳에 살고, 태그를 한 글자 바꾸면 역추적이 조용히 끊긴다 —
  화면은 태연히 「해당 없음」을 표시한다. 왕복은 `test/tag.test.ts` 가 잠근다.
- **컴파일러에 공개 문을 하나 더 뒀다** (`@contextops/compiler/tag`). index 는
  `node:crypto` 를 재수출해서 브라우저 번들에 못 들어간다 (`sideEffects:false` 로도 안 된다 —
  번들러는 흔들기 전에 먼저 해석한다). **둘 다 package.json 에 선언**했으니 ad-hoc
  깊은 import 가 아니다.
- **`GET /teams` 를 더했다.** SPEC §5 에 없었는데, 화면 주소는 slug 이고(§9) 라우트는 uuid 를
  받는다. 이 문이 없으면 로그인한 사람이 **자기 프로젝트로 갈 수가 없다.** SPEC 을 고쳤다.

**게이트 3개를 더했다 — 「같은 지적이 두 번 나오면 게이트로」**:

| 게이트 | 무엇을 막나 | 갈리는지 확인했나 |
|---|---|---|
| `test/design-tokens.test.ts` | DESIGN_BRIEF §3 색 표 ↔ `globals.css :root` **양방향** · 화면 코드의 색 리터럴 · padding/margin/gap 의 px | **예** — `#ABCDEF` 를 심어 빨개지는 것을 보고 되돌렸다 |
| `test/web-tables.test.ts` | 칩 4표·근거 4종·에러 10종·semver 3등급이 ① enum 과 키가 같고 ② **값마다 다른 것을 낸다** | 표 하나가 같은 아이콘을 두 번 쓰면 빨개진다 |
| `packages/compiler/test/tag.test.ts` | 쓴 태그를 그대로 되읽는 왕복 · golden 3종에서 「절 머리·빈 줄은 칠해지지 않는다」 | golden 전 파일을 돈다 |

**눈으로 보고 고친 결함 7개** (`d9d507e`) — 전부 컴파일 초록이었고 캡처로만 보였다:
비활성 accent 링크 · 버튼 글자 접힘 · 한글 UI 의 영문만 대문자 · 라벨 접힘 ·
CtxTag 가 칸 전체로 늘어남 · **3열이 세로 가운데로 어긋남**(`.items-start` 가 `.row` 보다
위에 있어 특이도에서 졌다) · 파일 트리에서 경로 잘림과 sha 쪼개짐.

**④2-B · 정의만 있고 아무 일도 안 하는 것 — 이번 라운드**

| 후보 | 소비처가 있나 | 값을 바꾸면 결과가 갈리나 | 판정 |
|---|---|---|---|
| **`ITEM_TYPES` 10종** | `ITEM_TYPE_ICON` 표 (화면 5 의 첫 칸) | 10종이 **서로 다른 아이콘**을 낸다 (시험이 중복을 잡는다) | **살렸다** |
| **`ITEM_STATUSES` 4종** | `ITEM_STATUS_CHIP` + 필터 | 넷이 아이콘·라벨·색이 다 다르다 | **살렸다** |
| **`CONFIDENCE_LEVELS` 3단계** | `CONFIDENCE_CHIP` + 컴파일러의 `conf:` | 화면과 Pack 둘 다에서 갈린다 | **살렸다** |
| **`ERROR_CODES` 10종** | `ERROR_HINT` 표 (화면 문구) | 열이 **서로 다른 존댓말 문장**을 낸다 | **살렸다** — 이제 화면에서도 안 죽는다 |
| **`SOURCE_REF_KINDS` 4종** | `SRC_LABEL`·`SRC_ICON` (화면) + `SRC_TAG` (컴파일러) | 값을 바꾸면 라벨이 갈린다 (`r/a.ts` vs `…:14–30`) | **살렸다** |
| `SYNC_STATUSES` 5종 | `SYNC_CHIP` 표는 만들었는데 **쓰는 화면이 아직 없다** (화면 9 는 P4) | — | **절반** — 표만 있다. 화면 9 가 주인 |
| `pack_files.source_map` | INSERT 한 곳뿐 · **읽는 라우트 0곳** | 늘 안 읽힌다 | **죽어 있다** → FINDINGS 34 |

**루프 실주행 기준선** — `logs/cycles/*.jsonl` 의 **마지막** result 줄 · `duration_api_ms`

| | dry001·002 | c001 | c002 | c003 `8e02f48` | c004 `84ce3ea` |
|---|---|---|---|---|---|
| 시간 | 0.3분 · 0.3분 | 15.1분 | **result 줄 없음** | 30.2분 | **7.1분** |
| 턴 | 7 · 7 | 77 | (잘렸다) | 92 | **46** |
| 비용 | $0.42 · $0.41 | $6.28 | | $13.90 | **$3.05** |

⚠ **5~8바퀴는 `logs/cycles/` 에 파일이 없다.** 루프 러너가 아니라 직접 연 세션으로 돌았다.
다음 바퀴가 러너로 돌면 이 표를 이어 적어라 (기준: 마지막 result · `duration_api_ms`).

## 눈 판정 대기

_(없음)_ — 이번 바퀴에 만든 화면 셋을 **전부 브라우저로 띄워서 봤다.**
근거는 `docs/evidence/2026-09-03-screens/` 4장이고, 보고 고친 것은 `d9d507e` 에 있다.

**아직 눈으로 못 본 것** (다음에 화면을 건드리면 여기부터):

- 화면 5 의 **발행 모달** — 코드는 있는데 캡처를 못 찍었다 (헤드리스에서 버튼을 못 누른다).
  `apps/web/e2e` 가 생기면 자동으로 찍힌다
- 화면 5 의 **상세 드로어** — 같은 이유. 행을 눌러야 열린다
- **empty 상태** — 항목이 0개인 프로젝트를 만들어야 본다 (씨앗은 6개를 넣는다)
- 화면 7 의 **제외된 항목 접이식** — 이번 씨앗은 `excluded` 가 비어 있다

⚠ 넷 다 **코드에는 있고 시험은 초록**이다. 그래서 더 위험하다 —
「컴파일 초록은 최소선이다」(loop/PROMPT.md ①③).

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

- 🔴 **vite 8 은 oxc 로 변환한다.** `esbuild: { jsx }` 는 「무시한다」고 **경고만 하고
  조용히 안 먹는다.** `.tsx` 를 시험에서 들여오려면 `oxc: { jsx: { runtime: 'automatic' } }`
  다 — 문자열 `'automatic'` 은 타입에서 막힌다 (`vitest.base.ts`).
- 🔴 **`node:crypto` 를 재수출하는 index 는 브라우저 번들에 못 들어간다.**
  `sideEffects: false` 로도 안 된다 — 번들러는 흔들기 전에 **먼저 해석**한다.
  `package.json` 의 `exports` 에 문을 하나 더 선언해라 (`./tag`).
- 🔴 **CSS 특이도는 소스 순서로 갈린다.** `.items-start` 를 `.row` **위에** 적었더니
  `.row { align-items: center }` 가 이겨서 3열이 세로 가운데로 어긋났다. 눈으로만 보였다.
  유틸리티 클래스는 **아래에** 두거나 `.row.items-start` 로 올려라.
- 🔴 **`<a>` 에는 `:disabled` 가 안 먹는다.** 「비활성 accent 링크」는 눌러도 아무 일이
  없는 파란 버튼이고, 그건 「아직 없다」가 아니라 **「고장」으로 읽힌다.** 태그를 바꿔라.
- **pglite-socket 은 연결을 한 번에 하나씩 처리한다.** postgres-js 는 기본 풀이 10개라
  화면 하나가 두 요청을 동시에 내면 **둘째가 30초 굶다가 500** 이다. `?max=1` 을 붙여라.
  ⚠ 그리고 클라이언트가 갑자기 죽으면 **ECONNRESET 이 씨앗 서버를 통째로 죽인다** —
  `dev-server.ts` 가 그걸 삼킨다. 안 삼키면 다음 캡처가 「프로젝트를 찾을 수 없습니다」다.
- **헤드리스 Chrome 은 `--timeout` 보다 `--virtual-time-budget` 이 낫다.** 전자는
  fetch 가 끝나기 전에 찍어서 **skeleton 만 담긴 캡처**를 낸다. ⚠ 리다이렉트하는 페이지
  (`/auth/callback`)에 `--virtual-time-budget` 을 쓰면 **안 끝난다** — 거기서만 `--timeout`.
- **PowerShell 로 캡처 경로를 줄 때는 절대 경로여야 한다.** Chrome 은 상대 경로를
  자기 cwd 로 풀어서 「지정된 경로를 찾을 수 없습니다」로 조용히 실패한다.
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
