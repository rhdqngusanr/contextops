# 좁은 폭에서 껍데기가 내비를 접는다 — 진짜 브라우저에서 잰 것 (FINDINGS 160 · 101바퀴)

헤드리스 Chrome 을 CDP 로 몰아 **실제 `demo:db` + `next dev`(3111)** 위에서 쟀다.
들어간 길은 제품과 같다: `/demo` → 게스트 세션 → 앱 화면. 375×812 는
`Emulation.setDeviceMetricsOverride` 로 만든 **진짜 뷰포트**다 (`--window-size=375` 는
크롬 최소 창 폭 때문에 ~504 를 잘라낸 그림이라 못 쓴다).

## 잰 것 — 화면 3 (가져오기) · 375×812

| | 전 (99바퀴 · `../2026-09-07-scope-placeholder/03-after-375.png`) | 후 (`02-import-375.png`) |
|---|---|---|
| `document.documentElement.scrollWidth` | **444px** (뷰포트 375) | **375px** |
| 가로 스크롤 | **있다** | **없다** (`overflowPx: 0`) |
| `.main-inner` 의 `clientWidth` | **76px** | **343px** |
| `.shell` 의 `flex-direction` | `row` | **`column`** |
| `.nav` 의 폭 / 방향 | 220px · `column` | **375px · `row`**(가로 막대) |
| 탭 줄 `.nav-links` | 보인다(세로 7줄) | **`display: none`** — 갈 곳은 ⌘K 팔레트 |
| 팀·프로젝트 이름 · 팔레트 버튼 | 있다 | **그대로 있다** (`화면 이동 ⌘K`) |

## 껍데기는 하나다 — 앱 화면 **여덟 개 전부**를 375px 로 돌았다 (`report.json` 의 `sweep`)

`import` · `review` · `context` · `proposals` · `packs` · `packs/1.1.0` · `roadmap` · `sync`
→ **여덟 다 `overflowPx: 0` · `mainInner: 343` · 탭 줄 접힘 · 팔레트 버튼과 프로젝트 이름 보임.**

## 접힌 뒤 갈 곳이 실제로 열리나 (`03-palette-375.png`)

버튼을 눌러 봤다: 팔레트가 열리고(`open: true`) 폭 **309px** 로 뷰포트 안에 들어가며
(`fitsViewport: true`) 줄이 **8개**다 — 화면 7 + 프로젝트 1. **새 내비를 만들지 않았다.**
갈 곳의 정본은 `PROJECT_SCREENS` 표 하나이고 팔레트가 그것을 읽는다 (FINDINGS 132·157).

## 데스크톱은 안 건드렸다

`01-import-1440.png` · `06-packs-1440.png` (1440×900) — 내비 219px · `.main-inner` 1141px ·
Pack 3열 그대로 · `overflowPx: 0`. 접는 규칙은 `--bp-narrow`(720px) **아래에서만** 산다.

## 도중에 두 번 틀렸다 (둘 다 진짜 브라우저가 잡았다)

1. **`.nav-links { display: none }` 이 아무것도 안 접었다.** 블록을 파일 가운데(`.main-inner` 옆)에
   뒀는데, 아래에 있는 `.col-tight`(`display: flex`)가 **같은 특정도로 이겼다.** 규칙은 있는데
   화면은 그대로였다 — 「정의만 있고 아무 일도 안 하는 코드」의 CSS 판이다.
   → 블록을 **파일 맨 끝**으로 옮겼다. 시험이 「`.col-tight`·`.row` 가 폭 질의보다 앞이고
   질의 뒤에 아무 규칙도 없다」를 센다.
2. **내비를 접었는데도 화면 3 이 376px 였다** (1px). 범인은 `.drawer`(`flex: 0 0 360px`)다 —
   고정 폭이라 안 줄어든다. 화면 7 의 3열(`--pack-tree-w` 240 · `--pack-side-w` 320)은 더 심해서
   좁은 폭에서 **글자가 세로로 한 자씩** 섰다(`05-packs-375.png` 의 첫 판).
   → `.row { flex-wrap: wrap }` + 옆 칸 셋을 `flex: 1 1 100%` 로. 지금은 세로로 쌓인다.

## 게이트

`apps/web/test/design-tokens.test.ts` ⑨ 넷 — ① `--bp-narrow` 가 있다 ② 폭 질의가 **하나뿐**이고
그 수가 토큰과 같다 ③ 그 블록이 `.nav .nav-links` 를 접고 뼈대의 탭 줄이 그 이름을 단다
④ 블록이 파일 **맨 끝**이다. 다음 사람이 되돌리면 **캡처가 아니라 시험**이 먼저 빨개진다.

`measure.mjs` — 다음 바퀴가 같은 자리를 다시 재려면 이것을 쓴다
(`node docs/evidence/2026-09-07-narrow-shell-collapses-nav/measure.mjs <출력폴더>`).

## 못 본 것

- **진짜 손가락**은 안 눌러 봤다 — 팔레트 버튼을 CDP 로 `click()` 했다. 터치 표적 크기(44px)는 안 쟀다.
- 375 와 720 **사이**(예: 태블릿 768)는 안 봤다. 경계 위쪽은 데스크톱 레이아웃 그대로다.
- 랜딩(`/`)은 이 껍데기를 안 쓴다 — 거긴 INBOX 2026-09-06 이 이미 「가로 스크롤 0」을 쟀다.
