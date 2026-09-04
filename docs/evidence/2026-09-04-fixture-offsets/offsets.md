# paylab 픽스처의 근거 범위가 원문을 안 가리킨다 (P7)

_잰 날: 2026-09-04 · 루프 38바퀴 · 근거는 `.ci/` 밖이다 (다음 관통이 지우지 않는다)_

`apps/web/scripts/seed.ts` 의 `fromDoc()` 이 **모든** 항목에 같은 `source_refs` 를 붙인다 —
`start_char: 0, end_char: 400`, `heading_path: ['paylab 결제 서비스']`.
그래서 Pack 의 역추적 태그가 전부 `src:doc:<uuid>#0-400` 이다.

아래는 그 범위 안에 **그 항목이 주장하는 문장이 실제로 있는지**를 문서에서 찾아 잰 것이다.
찾은 방법: `fs.readFileSync(문서).indexOf(문장)`.

| 항목 | 근거가 가리키는 곳 | 그 문장이 실제로 있는 곳 | 0-400 안인가 |
|---|---|---|---|
| `item_mission_paylab` | goals.md 0–400자 | 284자 | ○ |
| `item_goal_success_rate` | goals.md 0–400자 | 506자 | ✗ |
| `item_policy_retry` | goals.md 0–400자 | 856자 | ✗ |
| `item_policy_pii_log` | goals.md 0–400자 | 1437자 | ✗ |
| `item_constraint_card` | goals.md 0–400자 | 405자 | ✗ |
| `item_policy_refund` | goals.md 0–400자 | 1154자 | ✗ |
| `item_road_m1` | old-roadmap.md 0–400자 | **그 문서에 없다** | ✗ (문서가 다르다) |

goals.md 길이 3513자 · old-roadmap.md 길이 707자

## 읽는 법

- **일곱 중 여섯이 빗나간다.** 맞는 것은 `item_mission_paylab` 하나뿐이고, 그것도
  0–400 이 넓어서 우연히 들어온 것이다.
- **`item_road_m1` 은 문서가 다르다.** 근거가 `old-roadmap.md`(폐기된 로드맵)를 가리키는데,
  항목의 내용(`M1 — 재시도 정책 통일` · `paths: src/payment`)은 `goals.md` §4 의 M1 이다.
  `old-roadmap.md` 의 M1 은 「웹훅 수신 v1」이고 경로도 `src/webhook/` 다.
- `heading_path` 는 일곱 개가 전부 `['paylab 결제 서비스']` 다. `old-roadmap.md` 에는
  그런 제목이 아예 없다.

## 왜 이게 아픈가

P7 은 「모든 Pack 줄은 항목 ID → 원문으로 역추적된다」이다. 지금 관통이 재는 것은
**태그가 붙어 있는가**(`untagged === 0`)까지이고, **그 태그를 따라가면 그 문장이 있는가**는
아무도 안 센다. 발표 2:40 이 「Pack Explorer 역추적」이다 (SPEC §10.5) — 심사자가 한 번만
따라가 보면 종이가 가리킨 자리에 그 문장이 없다.
