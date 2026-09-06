# 빈 상태의 다음 행동 (FINDINGS 133 · 96바퀴 · `e3e48fe`)

헤드리스 Chrome 을 CDP 로 몰아 **실제 `next dev` + 개발용 씨앗 DB**(`demo:db`) 위에서 찍었다 (1440×900).
로그인은 진짜 경로(`/auth/callback#access_token=…`)다.

⚠ 씨앗 프로젝트(`paylab-api`)는 항목 27개라 빈 화면이 안 나온다. 그래서 **제품의 문으로**
(`POST /api/v1/teams/{id}/projects`) `paylab/blank`(「새 프로젝트」)를 하나 만들고 그 프로젝트를 봤다 —
화면에 빈 상태를 억지로 그린 것이 아니라 **정말 아무것도 없는 프로젝트**다.

측정값 전부는 `report.json` 에 있다 (`.state-box` 의 글자 · 버튼의 `href`·`className`·계산된 배경색 ·
그 화면의 `.btn-primary` 개수).

| 파일 | 화면 | 잰 것 |
|---|---|---|
| `01-context.png` | Context | 「아직 항목이 없습니다 …」 + **[가져오기로 이동]** → `/t/paylab/p/blank/import` · `class="btn"`(배경 투명) — 머리의 [발행하기] 가 이 화면의 accent 하나라서 outline 이다 (`.btn-primary` **1개**) |
| `04-proposals.png` | 제안 | 「… `/contextops:propose` 를 실행하면 …」 + **[Context 항목 보기]** (`btn`) — 제안을 만드는 곳은 CLI 라 「만들기」라고 하지 않는다 |
| `05-packs.png` | Pack Explorer | 「아직 발행된 버전이 없습니다 …」 + **[Context로 이동]** · `btn btn-primary` · 계산된 배경 `rgb(31, 78, 224)` = `--accent` — 이 화면엔 다른 주요 액션이 없다 |
| `07-sync.png` | Sync | 버튼 **없음**. 기기를 붙이는 것은 CLI 이고, 웹에 그 문이 없다 (`noNext`) — **아무 데도 안 가는 버튼을 두지 않았다** |
| `08-after-click.png` | Context 의 버튼을 실제로 눌렀다 | 주소가 **`/t/paylab/p/blank/import`** 로 갔다 (`report.json` 의 `clicked`) — 404 가 아니다 |

## 고친 것이 실제로 보이나

- 전(95바퀴): 빈 자리 **10곳 중 8곳에 버튼이 없었다.** 「Context 화면에서 [발행하기]를 눌러보세요」처럼
  **갈 곳을 글로만** 말했다.
- 후: 7곳에 버튼 · 3곳은 `noNext` 에 이유(같은 화면의 다른 칸 · 같은 화면 머리의 [발행하기] · CLI).

## 못 본 것

- **정리(review)의 빈 상태** — 새 프로젝트에도 씨앗 질문 10장이 뜨므로 `cards.length === 0` 이 안 됐다.
  이 자리는 133 이전부터 버튼이 있던 둘 중 하나라 문구·목적지가 안 바뀌었다 (표로 옮겼을 뿐).
- **Pack 파일 0개**(`pack.files`) — 발행이 없으면 그 화면을 열 수 없다.
- **375px 모바일** — 1440×900 만 찍었다 (94바퀴부터 밀린 것과 같은 자리).

## 곁다리로 눈에 걸린 것 → FINDINGS 158

`01-context.png` 의 scope 칸: placeholder `project · domain:billing` 이 입력칸 폭을 넘겨
**`domain:billin` 에서 잘린다.** 133 과 무관한 자리라 이번 바퀴에 안 고쳤다.
