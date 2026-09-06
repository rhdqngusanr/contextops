# 움직임 줄이기 (FINDINGS 134 · 97바퀴 · `fe7cc98`)

헤드리스 Chrome 을 CDP 로 몰아 **실제 `next dev`** 위에서 찍었다 (1440×900).
이건 **캡처만으로는 판정이 안 되는 것**이다 — OS 설정을 켜야 보이므로, 같은 페이지를
`Emulation.setEmulatedMedia` 로 **켠 상태(reduce)와 안 켠 상태(control)** 로 두 번 열고
**계산된 스타일을 직접 읽었다.** 값은 전부 `report.json` 에 있다.

## 잰 것 — 같은 페이지, 설정만 다르다

| | control (설정 없음) | reduce (움직임 줄이기 켬) |
|---|---|---|
| `matchMedia('(prefers-reduced-motion: reduce)')` | `false` | `true` |
| 진행 막대 `.bar-fill` 의 `transition-duration` | **0.3s** | **1e-05s** |
| `.skeleton` 의 `animation-duration` | **1.4s** | **1e-05s** |
| `.skeleton` 의 `animation-iteration-count` | **infinite** | **1** |
| 터미널 커서(`.caret`) 개수 | **1** | **0** |
| 터미널에 선 줄 (6초 시점) | **16 / 17** (아직 타이핑 중) | **17 / 17** (마지막 프레임이 처음부터) |

⚠ `.skeleton` 은 랜딩에 없다. 그래서 **같은 스타일시트 아래에** `<div class="skeleton">` 을
하나 붙여 계산된 값을 읽고 지웠다 (`report.json` 의 `skeleton_*`). 규칙이 그 클래스에
적용되는지를 잰 것이지, 화면에 있는 스켈레톤을 본 것이 아니다.

## 눈으로 본 것

| 파일 | 무엇 |
|---|---|
| `01-control-landing.png` · `02-reduce-landing.png` | 랜딩 첫 화면 — 둘이 **같아 보인다.** 맞다. 움직임은 위쪽에 없다 |
| `03-control-terminal.png` | 6초 시점: 명령이 `$ node … progre` 에서 **끊겨 있고** 커서가 서 있다 · 오른쪽 Roadmap 은 「근거 **0 / 3**」 · 「아직 보고가 없습니다」 |
| `04-reduce-terminal.png` | 같은 6초 시점인데 **17줄이 다 서 있다** · 커서 없음 · Roadmap 은 「근거 **1 / 3**」 · 막대가 채워진 채 · 「보고 1건 · v1.0.0 기준」 |

→ 움직임을 껐을 때 화면이 **비는 것이 아니라 끝난 상태로 선다.** 이게 `animation: none`
대신 `0.01ms + 1회` 를 고른 이유다 — `none` 이면 재생 중이던 것이 시작 상태로 돌아간다.

## 못 본 것

- **진짜 OS 설정** — CDP 의 `setEmulatedMedia` 로 켠 것이다. 브라우저가 보는 값은 같지만
  OS 쪽에서 켜 본 것은 아니다.
- **화면에 실제로 뜬 스켈레톤** — 로딩이 순식간이라 6초 시점에 잡히지 않았다 (위 ⚠).
- **375px 모바일** — 1440×900 만 찍었다 (94바퀴부터 밀린 것과 같은 자리).
