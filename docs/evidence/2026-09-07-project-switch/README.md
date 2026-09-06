# 팔레트의 둘째 묶음 — 프로젝트 전환 (FINDINGS 157 · 95바퀴 · `d95f7ca`)

헤드리스 Chrome 을 CDP 로 몰아 **실제 `next dev` + 개발용 씨앗 DB**(`demo:db`) 위에서 찍었다 (1440×900).
로그인은 진짜 경로(`/auth/callback#access_token=…`)이고, 들어간 자리는 `/t/paylab/p/paylab-api/sync`.

⚠ 씨앗에는 프로젝트가 **하나**뿐이라, 전환을 보려면 둘이 필요하다. 그래서 캡처 전에
**제품의 문으로**(`POST /api/v1/teams/{id}/projects`) `paylab/ledger`(「정산 원장」)를 하나 더 만들었다 —
화면에 목록을 지어 넣은 것이 아니다.

| 파일 | 무엇 | 잰 것 |
|---|---|---|
| `01-sync-before.png` | 전환 전 화면 9 (Sync) | 내비가 `paylab/paylab-api` |
| `02-open-two-groups.png` | `Ctrl+K` | 묶음 **둘**(「화면」·「프로젝트」) · `role="option"` **9줄** = 화면 7 + 프로젝트 2 · 지금 화면(Sync)과 지금 프로젝트(paylab-api) 둘 다 「지금 여기」 · 프로젝트 줄의 링크가 **`…/ledger/sync`** (보던 화면을 들고 간다) |
| `03-search-project.png` | 「정산」 검색 | 남는 줄 **1** — 「화면」 묶음은 제목째 사라진다(빈 묶음을 안 남긴다) |
| `04-after-enter.png` | `Enter` | 주소가 **`/t/paylab/p/ledger/sync`** 로 실제로 갔다 · 내비가 `paylab/ledger` · 새 프로젝트라 empty 상태(「아직 등록된 기기가 없습니다」) |
| `05-empty.png` | 「zzz」 검색 | 「그런 화면도 프로젝트도 없습니다」 · `listbox` **0개** |

콘솔로 같이 확인한 것:
- 서버가 내주는 목록은 `paylab/ledger` · `paylab/paylab-api` 둘 — 화면에 그려진 두 줄과 **같다**
- `esc` → `[role="dialog"]` **0개**

🔴 **눈으로 보고 고친 것 하나** — 첫 판(`--palette-list-h: 320px`)에서는 목록이 화면 7줄에서
잘려 **「프로젝트」 묶음이 접힌 자리에 있었다.** DOM 에는 9줄이 다 있었고 시험도 초록이었다 —
사람에게는 전환이 **없는 것처럼 보인다.** 토큰을 `420px` 로 올려 화면 7줄과 프로젝트 묶음이
같이 보이게 했다 (그보다 길어지면 그때부터 스스로 스크롤한다).
