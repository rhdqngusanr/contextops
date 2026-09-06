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

### 🔴 사람이 화면을 직접 열어 QC 했다 — 확인된 결함 넷 (2026-09-06)

`pnpm --filter web demo:db` + `next dev` 로 **실제로 띄워서** 브라우저로 봤다.
아래는 짐작이 아니라 **계산된 스타일·서버 로그에서 잰 것**이다.
먼저 이 넷을 `FINDINGS.md` 에 번호를 붙여 옮기고, 아래 「순서」대로 진행해라.

> 루프(67바퀴): 넷을 **FINDINGS 127 · 128 · 129 · 130** 으로 옮겼다. ① 은 닫았고(아래 「끝난 것」 · `2134011`)
> 68바퀴: ② 도 닫았다(`9319617` · 커밋은 69바퀴가). 69바퀴: ③ 도 닫았다(`0a3535e`). ④ 는 130 으로 대기 중이다 — 다음 바퀴의 일이다.

#### ④ [격차] 키보드 포커스가 안 보인다 — `:focus-visible` 규칙 **0개**

- **근거**: 스타일시트 전체에서 `:focus-visible` 을 쓰는 규칙 **0개**,
  `outline: none` 으로 지우는 규칙 **1개**. 탭으로 넘기면 지금 어디 있는지 알 수 없다.
- **왜 중요한가**: 접근성이자 **개발자 도구의 기본기**다. Linear·Stripe·GitHub 전부
  또렷한 포커스 링이 있다. 심사에서 키보드로 훑는 사람이 있으면 바로 보인다.
- **고칠 방향**: 버튼·링크·입력·행에 `:focus-visible { outline: 2px solid var(--accent-ink);
  outline-offset: 2px }`. 토큰 옆 한 곳에 두고 컴포넌트가 읽게 해라.

#### ✅ 같이 잰 것 중 **통과**한 것 (지금 상태를 지켜라)

- **대비**: 제목 17.3 : 1 · 본문 14.2 : 1 · 메타 8.9 : 1 — 전부 WCAG AA(4.5)를 크게 넘는다
- **모바일(375px)**: 가로 스크롤 **0**. 긴 명령줄도 자기 컨테이너 안에서만 넘친다 — 설계대로다
- **에러 상태 자체의 짜임**: 아이콘 + 문장 + [다시 시도] + `request_id` 가 다 있다. 좋다

---

### 🔴 이 순서로 진행해라

1. **위 ①②③④ 를 `FINDINGS.md` 에 옮기고** ① → ② → ③ → ④ 순으로 닫는다.
   ①②는 **고장**이라 PLAN 보다 위다 (④3 규칙). ③④는 격차지만 **랜딩·데모가
   심사의 첫 화면**이라 이번만 PLAN P4 둘째 행의 몫으로 같이 닫는다.
2. **PLAN P1 첫 행(DB 마이그레이션)** — `apps/web/.env.local` 에 Supabase 값이 꽂혀 있고
   접속도 확인됐다(PostgreSQL 17.6). 마이그레이션을 실제로 돌려 표 16 · 인덱스 5 를
   확인하고 행을 닫아라. ⚠ 실패하면 **원인을 적고 멈춰라** — 지어내지 마라.
3. **PLAN P6 둘째 행의 제출서**(FINDINGS 126) — SPEC §16 을 저장소 문서로 만든다.
   🙋 공개 저장소 URL · 팀명 · 영상 링크는 **자리표시자**로 두고 그 자리를 명시해라.
4. 그 다음 **미해결 FINDINGS 를 구멍 → 격차 순**으로 소진한다.

⚠ 나머지 PLAN 행(P3 서버 AI · P5 Vercel · P6 영상)은 **사람이 키·계정을 줘야 열린다.**
거기 닿으면 건너뛰고 `STATUS.md` 「막힌 것」에 적어라.

_(비어 있음)_

## 끝난 것

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
