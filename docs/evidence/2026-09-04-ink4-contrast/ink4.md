# FINDINGS 88 — 비활성 색으로 그린 문장 다섯 (눈 판정 근거)

_2026-09-04 · 루프 37바퀴 · `6f06881`_

이 바퀴의 고장은 **색**이라 글자만 뽑는 캡처로는 안 보인다. 그래서 재는 것을 둘로 나눴다:
**① 토큰의 대비를 계산**하고, **② 고친 자리의 class 를 마크업에서 그대로 뽑았다.**

---

## ① 왜 안 보이는가 — 대비를 쟀다

`apps/web/src/app/globals.css` 의 `:root` 에서 읽은 값 · WCAG 2.1 상대휘도.

| 글자 토큰 | 값 | on `bg` | on `surface` | on `surface-hi` |
|---|---|---|---|---|
| `ink` | `#EDEFF3` | 17.30:1 | 16.78:1 | 16.73:1 |
| `ink-2` | `#D5DAE2` | 14.19:1 | 13.76:1 | 13.71:1 |
| `ink-3` | `#A7AEB9` | 8.91:1 | 8.64:1 | 8.62:1 |
| `ink-4` | `#3A404A` | **1.91:1** | **1.85:1** | **1.84:1** |

🔴 `ink-4` 는 어느 바탕에서도 **2:1 을 못 넘는다.** WCAG AA 본문 기준(4.5:1)의 절반도 안 되고,
큰 글자 기준(3:1)에도 못 미친다. **읽으라고 낸 글자에 쓸 수 있는 값이 아니다** —
표에서 용도가 「비활성」 한 낱말인 이유가 이 숫자다.
`ink-3` 은 8.64:1 로 AA·AAA 를 다 넘는다. 보조 글자는 여기로 간다.

(FINDINGS 88 에 「1.6:1」로 적었는데 실제로 재 보니 `surface` 위에서 **1.85:1** 이다.
결론은 같다 — 어느 쪽이든 발표 영상·인쇄 자료에서는 글자가 없는 것과 같다.)

---

## ② 고친 자리 — 마크업에서 뽑은 class

`renderToStaticMarkup` 으로 그린 것에서 태그를 안 지우고 그대로 뒀다.
**class 가 근거이므로 지우면 아무것도 안 보인다.**

### 제일 아픈 하나 — P1 을 설명하는 문장 (`EvidenceList`)

```html
<div class="col-tight"><span class="mono meta scroll-x" title="repository_path"><span aria-hidden="true">⌘</span> paylab/api/src/pay/retry.ts:12–40</span><span class="meta">코드 본문은 서버에 없습니다 — 로컬에서 열어 보세요.</span></div>
```

`class="meta"` 다 (전: `class="meta ink-4"`). `meta` 는 `globals.css` 에서 `ink-3` 이다 — **8.64:1.**
심사 첫 질문(「코드 본문을 서버가 받나?」)의 답이 이제 화면에서 읽힌다.

### P7 의 얼굴 — `CtxTag` 의 `· rev N`

```html
<span class="ctx-tag">item_bs_m2<span>· rev 6</span></span>
```

색 클래스를 **뺐다** (전: `class="ink-4"`). `.ctx-tag` 가 이미 `ink-3` 이라 상속으로 충분하고,
색 클래스를 또 적으면 두 곳이 갈린다.

### 나머지 셋 (server component 라 데이터 없이 못 그린다 — 소스로 남긴다)

| 자리 | 전 | 후 |
|---|---|---|
| `packs/[semver]/page.tsx:120` 파일 sha 4자 | `mono ink-4 tree-sha` | `mono ink-3 tree-sha` |
| `packs/[semver]/page.tsx:187` **Pack 줄 번호** | `pack-lineno ink-4` | `pack-lineno ink-3` |
| `context/page.tsx:419` 「첫 발행은 v1.0.0」 | `meta ink-4` | `meta` |

줄 번호가 이 목록에 있는 이유 — **P7 을 눈으로 재는 값이다.** 역추적 태그가 몇 줄째인지
그것으로 센다. 안 보이면 「모든 Pack 줄이 역추적된다」를 사람이 확인할 방법이 없다.

---

## ③ 남은 `ink-4` 여섯 자리는 장식이 맞다

`◌`(로딩·빈 상태 표식) 다섯과 빈 칸 `—` 하나. 전부 `aria-hidden="true"` 다 —
`versions.tsx:51` 의 `—` 에는 이번에 붙였다. 값이 없다는 표식이지 읽는 글자가 아니다.

## ④ 게이트

`apps/web/test/design-tokens.test.ts` 에 두 줄을 더했다. **다시 쌓이지 않게 하는 것이
이 항목의 절반이다** — 전까지 그 시험은 「임의 색 리터럴이 없나」만 셌고,
**토큰을 제대로 썼는데 용도가 틀린** 경우는 아무도 안 세서 다섯 자리가 조용히 쌓였다.

- `.tsx` 의 `className` 에 `ink-4` 가 있으면 같은 줄에 `aria-hidden` 이 있어야 한다
- `globals.css` 의 `var(--ink-4)` 는 `.ink-4` 유틸리티와 `:disabled` 규칙에만

`evidence.tsx:73` 을 원래대로 되돌려 넣어 **실제로 빨개지는 것을 봤다** (`loop/PROMPT.md` ④2-B ②단계):

```
- []
+ [ "components\\evidence.tsx:73" ]
 ❯ test/design-tokens.test.ts:143
 Tests  1 failed | 6 passed (7)
```

되돌린 뒤 `tools/ci.ps1` 전 층 초록: principles OK 9 · typecheck · test · build · walkthrough.
