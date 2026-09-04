# 데모 Pack 이 표의 몇 갈래를 보여 주나 — 41바퀴 눈 판정 (FINDINGS 93)

> `.ci/` 는 관통마다 통째로 지워진다. 그래서 **적기 전에** 여기로 복사했다.
> 같은 폴더의 `CLAUDE.md` · `scoped-src-webhook.md` 가 그때 나온 종이 그대로다.

## 잰 것

| 축 | 전 (40바퀴) | 후 (41바퀴) | 표는 |
|---|---|---|---|
| 강제 수단(`enforcement`) | 2 (`review`·`hook`) | 2 (그대로) | 4 |
| **근거 종류(`SourceRef`)** | **2** (`doc` 14 · `proposal` 1) | **4** (`doc` 15 · `repo` 2 · `proposal` 1 · `manual` 2) | 4 |
| **적용 범위(`scope.kind`)** | **2** (`project`·`domain`) | **3** (`+ path`) | 3 |
| 항목 종류(`ItemType`) | 5 | 5 (그대로 — FINDINGS 94) | 10 |
| Pack 파일 | 4 | **5** (`+ .claude/rules/scoped-src-webhook.md`) | — |

세는 방법:
```
grep -oh "src:[^ ]*" .ci/walkthrough-pack/CLAUDE.md .ci/walkthrough-pack/.claude/rules/*.md \
  .ci/walkthrough-pack/v1.1.0/CLAUDE.md | sed 's/^src://' | tr ',' '\n' | sed 's/:.*//' | sort | uniq -c
```
→ 전: `14 doc` · `1 proposal` / 후: `15 doc` · `2 manual` · `1 proposal` · `2 repo`

## 종이에 실제로 뭐가 섰나

**① 코드가 근거다** (`CLAUDE.md` Policies 첫 줄) — 태그에 근거가 **둘**이다:

```
- [must] PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다 · 강제: 리뷰에서 본다
  <!-- ctx:item_policy_retry rev:2 conf:high
       src:doc:f7e07264-…#841-964,repo:paylab-api:src/payment/retry.ts:11-14 -->
```

따라가 본 것:

- `doc:…#841-964` → goals.md §3.1 「PSP 호출이 실패하면 **최대 5회까지 재시도**한다 …
  **고정 간격 재시도는 금지한다.**」
- `repo:paylab-api:src/payment/retry.ts:11-14` →
  ```
  export const MAX_RETRY = 3;

  /** 재시도 간격(ms). 고정이다 — 늘리지 않는다. */
  export const RETRY_DELAY_MS = 500;
  ```

**문서는 「5회 · 지수 백오프」인데 코드는 「3회 · 500ms 고정」이다.**
SPEC §10.1 이 말하는 「의도된 어긋남 3곳」의 첫째가 이제 **한 줄 안에서 눈에 보인다.**
전에는 규칙만 종이에 있었고 「그게 지금 코드 어디서 깨지나」가 없었다.

**② 사람의 답변이 근거다** (`CLAUDE.md` Policies 셋째 줄):

```
- [should] 외부 호출마다 타임아웃을 건다 — 기본 5초, 환불 승인 호출만 10초다.
  · 강제: 리뷰에서 본다
  <!-- ctx:item_seed_policy_review rev:2 conf:high
       src:manual:코드 리뷰에서 늘 지적되는 것은 무엇인가요? -->
```

「문서가 없어도 10개 질문에 답하면 첫 버전이 만들어집니다」(화면 3 ③)가 **관통에서
실제로 도는 것**을 처음 확인했다. 근거는 지어낸 문장이 아니라 **그 사람이 답한 질문**이고,
답변 원문은 충돌 행의 `resolution.note` 에 남는다 (P7 의 끝점).

**③ 경로 규칙 파일 하나** (`scoped-src-webhook.md`) — frontmatter 에 `paths:` 가 있다:

```
---
paths:
  - "src/webhook"
---
# 경로 규칙 — src/webhook
- [must] 웹훅 payload 는 서명 검증 후에만 파싱·저장한다 · 강제: 리뷰에서 본다
  <!-- ctx:item_policy_webhook_sig rev:2 conf:high src:doc:f7e07264-…#1790-1862 -->
```

`#1790-1862` 를 goals.md 에서 자르면 §3.5 「서명 검증 전에는 payload 를 파싱하지도
저장하지도 않는다. 검증 실패는 401 로 끊고, 재전송은 PSP 가 알아서 한다.」가 그대로 나온다.
`src/webhook` 이라는 경로의 근거는 같은 문서 §7 아키텍처 그림이다
(「`webhook` 은 PSP 콜백을 받아 상태를 맞춘다. 서명 검증이 먼저다.」).

## 팀 규칙으로 배포할 만한가

읽어 봤다. **된다.**

- 모든 본문 줄에 `ctx:` 태그가 있다 (P7) — 제품 고정 텍스트(`workflow.md`)만 예외이고
  그건 계약(`PRODUCT_TEXT_PACK_FILES`)에 이름으로 적혀 있다.
- Policies 세 줄이 **서로 다른 것**을 말한다: 강제 수단 두 갈래(리뷰·Hook),
  근거 세 갈래(문서·문서+코드·사람의 답변), severity 두 갈래(must·should).
  전 바퀴들처럼 같은 말이 모든 줄에 붙어 있지 않다.
- 규칙이 어디에 걸리는지가 파일로 갈린다 — 전역(`CLAUDE.md`) · 도메인(`domain-refund.md`) ·
  경로(`scoped-src-webhook.md`).

## 아직 아닌 것

- **`ItemType` 은 여전히 다섯**이다 (`architecture`·`domain`·`adr`·`workflow`·`open_question`
  없음). 앞의 셋은 goals.md §5·§6·§7 에 **원문이 이미 있는데 씨앗이 안 읽는다** —
  FINDINGS **94** 이고, `pack-coverage.ts` 의 `항목 종류(ItemType)` 줄의 `min` 을
  올리는 것이 그 일이다.
- **`enforcement` 는 둘**이다 (`permission`·`none` 없음). 이건 고칠 것이 아니라
  **문서를 먼저 늘려야 하는 것**이다 (FINDINGS 89 · P7).
