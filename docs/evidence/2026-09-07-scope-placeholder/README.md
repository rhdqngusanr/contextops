# scope 거르개의 placeholder 가 안 잘린다 — 폭을 실제로 재고 고쳤다 (FINDINGS 158 · 99바퀴)

헤드리스 Chrome 을 CDP 로 몰아 **실제 `demo:db` + `next dev`(3111)** 위에서 찍었다.
들어간 길은 제품과 같다: `/demo` → 게스트 세션 → `/t/demo/p/paylab-api/context`.

## 잰 것 (1440×900 · `report-before.json` · `report-after.json`)

| | 전 (`01-before-1440.png`) | 후 (`02-after-1440.png`) |
|---|---|---|
| 화면에 보이는 문구 | `project · domain:billin` — **`g` 가 잘렸다** | `project · domain:billing` — 다 보인다 |
| 칸 바깥 폭 | 221px | **247px** |
| 칸 안쪽(패딩 뺀) 폭 | 195px | **221px** |
| 문구의 실제 글자 폭 (같은 계산 폰트) | 203.91px | 203.91px |
| 모자란 폭 | **+8.91px 모자람** | **−17.09px (남는다)** |
| 사람이 친 값 `domain:billing` | 안 잘림 (`scrollWidth === clientWidth`) | 안 잘림 |

폰트는 `14.5px "JetBrains Mono", …` 로 둘이 같다 — 바뀐 것은 **폭 하나**다.

## 어떻게 고쳤나

`--filter-input-ch: 26`(글자 수) → `--filter-input-w: calc(… * 1ch + var(--sp-3) * 2 + 2px)` 한 자리가 정본이고
`.input-filter` 가 그것을 읽는다. **px 가 아니라 `ch`** 다 — mono 라 글꼴이 폴백으로 바뀌어도 문구와 같이 늘어난다.
`.input` 은 안 건드렸다(다른 화면도 쓴다). `design-tokens.test.ts` ⑧ 이 **문구의 글자 수 + 여유 2자 ≤ 26** 을 센다 —
다음 사람이 문구를 늘리면 캡처가 아니라 **시험**이 먼저 빨개진다.

## 못 본 것 / 같이 잡은 것

- **375px 은 이 고침으로 좋아지지 않는다** (`03-after-375.png`). 앱 껍데기가 내비 220px 를 안 접어서
  `.main-inner` 가 **76px** 이고, 이 화면은 그 전에 이미 가로로 밀려 있다 (문서 폭 444px · 이번 변경 뒤 543px).
  `max-width: 100%` 를 걸어 뒀지만 라벨이 내용 폭 그대로 커져서 지금은 아무 일도 안 한다 —
  **FINDINGS 160** 으로 적었다. 여기서 breakpoint 를 새로 들이지 않았다.
- `measure.mjs` — 다음 바퀴가 같은 자리를 다시 재려면 이것을 쓴다.
