import { z } from 'zod'

// =====================================================================
//  터미널 재생 녹화 (docs/SPEC.md §10.4) — `fixtures/replay/*.json` 의 모양
//
//  🔴 **녹화는 지어내지 않는다.** 정본 파일은 관통(`plugin/contextops/scripts/walkthrough-sync.ts`)이
//     **배포되는 번들**을 진짜 소켓으로 돌려 남긴 stdout 그대로다. 관통이 매번 다시 녹화해서
//     픽스처와 대조한다 — CLI 의 문장이 바뀌면 관통이 빨개지고, 그때 픽스처를 새 녹화로 바꾼다.
//     ★ 왜 — 랜딩의 터미널이 「실제 도구가 이렇게 말한다」고 보여 주는 자리인데, 손으로 쓴
//       대사면 그 화면은 첫 화면에서부터 근거 없는 줄이다 (P7 의 정신).
//
//  ⚠ 이 계약은 서버가 받는 것이 아니다 (업로드 allowlist 와 무관 · P1 과 무관).
//    화면(`apps/web`)과 관통 스크립트가 **같은 모양**을 읽고 쓰기 위한 자리다.
// =====================================================================

/**
 * 한 줄. `t_ms` 는 녹화 시작부터의 경과이고 **줄 순서대로 늘어난다.**
 * ⚠ 명령 줄은 `> `(Claude Code 의 슬래시 명령) 또는 `$ `(셸) 로 시작한다 — 재생기가
 *   그 줄만 타이핑으로 그린다. 나머지는 그대로 stdout 이다.
 */
export const ReplayFrame = z.object({
  t_ms: z.int().min(0),
  text: z.string().max(400),
}).strict()

export const ReplayFrames = z.array(ReplayFrame).min(1).max(200)
  .refine((frames) => frames.every((f, i) => i === 0 || f.t_ms >= (frames[i - 1] as { t_ms: number }).t_ms),
    { message: 't_ms 는 줄 순서대로 늘어나야 한다' })

export type ReplayFrame = z.infer<typeof ReplayFrame>

/** 명령 줄의 머리 — 재생기와 녹화기가 같은 표를 읽는다. */
export const REPLAY_PROMPTS = ['> ', '$ '] as const

export function isReplayCommand(text: string): boolean {
  return REPLAY_PROMPTS.some((p) => text.startsWith(p))
}
