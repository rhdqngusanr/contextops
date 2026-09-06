# 데모 화면 3 에 가짜 대기가 없다 — 진짜 브라우저에서 잰 것 (FINDINGS 137 · 98바퀴 · `2604b9f`)

헤드리스 Chrome 을 CDP 로 몰아 **실제 `demo:db` + `next dev`(3111)** 위에서 찍었다 (1440×900).
들어간 길은 제품과 같다: `/demo` → 게스트 세션 → `/t/demo/p/paylab-api/import`.

| 파일 | 무엇 | 잰 것 |
|---|---|---|
| `01-demo-import.png` | 화면 3 첫 화면 | 배너 · 붙여넣기 · 질문 스택. 「구조화 진행」은 접힌 아래에 있다 |
| `02-structure-panel.png` | 그 「구조화 진행」 칸 | job 카드가 **0개** · 자리에 빈 상태(`EMPTY_PLACES`)가 선다 |
| `shot.mjs` | 몰이 스크립트 | 다음 바퀴가 같은 자리를 다시 재려면 이것을 쓴다 |

콘솔로 같이 잰 것:

| | 전 (78바퀴 · `docs/evidence/2026-09-06-guest-door/04-import-after-structure-click.png`) | 후 |
|---|---|---|
| 게스트가 보는 job (`GET /projects/{id}/jobs?limit=50` · 진짜 HTTP) | 3 (structure 2 · conflict 1 · 전부 `queued`) | **0** |
| 화면에 「멈춘 것 같음」 | 있다 | **없다** (`document.body.innerText` 로 확인) |
| 화면에 「차례 기다리는 중」 | 있다 | **없다** |

⚠ **눈으로 보다 하나 잡았다** — 그 자리에 선 빈 상태 문구가 `아직 올린 문서가 없습니다.
왼쪽에 문서를 붙여넣어 보세요.` 다. 데모에는 문서가 **2건 있다**(씨앗이 올렸다) — 없는 것은
문서가 아니라 **도는 job** 이다. `EMPTY_PLACES` 의 그 한 줄 문제이고 **FINDINGS 159** 로 적었다.
