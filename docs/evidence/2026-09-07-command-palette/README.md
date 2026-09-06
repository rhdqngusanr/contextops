# 명령 팔레트 `⌘K` — 진짜 브라우저에서 잰 것 (FINDINGS 132 · 94바퀴 · `d2ac4bb`)

헤드리스 Chrome 을 CDP 로 몰아 **실제 `next dev` + 데모 DB** 위에서 찍었다 (1440×900).
들어간 자리는 `/demo` → `/t/demo/p/paylab-api/context` (게스트 세션).

| 파일 | 무엇 | 잰 것 |
|---|---|---|
| `01-nav-trigger.png` | 내비의 [화면 이동 `⌘K`] | accent 아님 — 화면의 accent 는 [발행하기] 하나뿐이다 |
| `02-open.png` | `Ctrl+K` 로 연 팔레트 | `role="dialog"` · `role="option"` **7줄** = 표의 7줄 · 고른 줄에 `›` + `accent-soft` · Context 는 「지금 여기」 |
| `03-search.png` | 「로드」 검색 | 남는 줄 **2**: 가져오기(keyword `업로드`) · Roadmap(keyword `로드맵`) — keywords 가 실제로 거른다 |
| `04-empty.png` | 「zzz」 검색 | 「그런 화면이 없습니다」 · 목록(`listbox`) 자체가 사라진다 |
| `05-after-enter-sync.png` | ↓ 6번 뒤 `Enter` | 고른 줄 `Sync` → 주소가 `/t/demo/p/paylab-api/sync` 로 **실제로 갔다** |

그 밖에 콘솔로 확인한 것:
- `↓↓` → 고른 줄이 `Context` 로 옮겨진다 (값이 화면을 바꾼다)
- `esc` → `[role="dialog"]` 가 **0개**가 된다

⚠ 배경(scrim)은 이 제품의 다른 모달과 **같은 불투명 `--bg`** 다. 팔레트만 반투명으로
만들지 않았다 — 「지금 무엇이 떠 있나」의 모양이 화면마다 다르면 그때부터 두 번째 방언이다
(DESIGN_BRIEF §3). 바꾸려면 `--scrim` 을 §3 색 표에 먼저 한 줄 더하고 **모든 모달**이 같이 바뀐다.
