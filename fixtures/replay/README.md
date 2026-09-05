# fixtures/replay — 터미널 재생 녹화 (SPEC §10.4)

`[{t_ms, text}]` 한 줄씩. **손으로 쓰지 않는다.**

- `sync.json` — 관통 sync 단계(`plugin/contextops/scripts/walkthrough-sync.ts` ⑥)가
  **배포되는 번들**을 진짜 소켓으로 돌려 남긴 stdout 그대로다:
  SessionStart 훅 알림 → `/contextops:sync` → `contextops progress` 보고.
- 관통이 매번 다시 녹화해서 이 파일과 대조한다 (`t_ms` 제외 · backup 폴더의 시각만 가린다).
  CLI 의 문장이 바뀌면 관통이 빨개진다 — 그때 `.ci/walkthrough-replay.json` 을 여기로 복사한다.
- 읽는 곳: `apps/web/src/components/landing.tsx` (화면 1 C-3) → `<TerminalReplay>`.
  계약은 `packages/schema` 의 `ReplayFrames`.
