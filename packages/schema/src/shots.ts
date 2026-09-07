import { z } from 'zod'

// =====================================================================
//  랜딩이 읽는 캡처 목록 (`apps/web/public/shots/manifest.json`) 의 모양 — FINDINGS 131
//
//  🔴 **쓰는 쪽과 읽는 쪽이 같은 계약을 본다.**
//     쓰는 쪽: 관통의 `shotcopy` 단계 (`apps/web/e2e/publish-shots.ts`)
//     읽는 쪽: 화면 1 랜딩 (`apps/web/src/components/landing.tsx`)
//     ★ 왜 — 둘이 각자 모양을 알면 한쪽만 바뀌어도 아무도 모른다. 랜딩은 그림이 안 뜨는
//       채로 배포되고, 그게 심사위원이 보는 첫 화면이다.
//
//  🔴 **파일 이름은 여기에도 없다.** 이름의 정본은 `apps/web/e2e/plan.ts` 의 `PUBLISHED`
//     하나이고, 계약은 「모양」만 잰다. 화면 코드에 `screen-context.png` 를 적는 순간
//     계획에 한 줄을 더해도 랜딩이 안 따라온다.
//
//  ⚠ 이 계약은 서버가 받는 것이 아니다 (업로드 allowlist 와 무관 · P1 과 무관).
//    `replay.ts` 와 같은 자리다 — 우리 파일 둘이 같은 모양을 읽고 쓰기 위한 것.
// =====================================================================

/**
 * 캡처 한 장.
 * - `file` — 웹에서 여는 주소. `public/shots/` 아래에 있으므로 항상 `/shots/` 로 시작한다
 * - `src`  — **무엇을 찍은 것인가.** 이 화면의 실제 주소다 (근거 · P7 의 정신)
 * - `alt`  — 대체텍스트. 비어 있으면 그림이 화면 낭독기에 없는 것과 같다
 * - `width`·`height` — 찍은 크기. 랜딩이 그대로 `<img>` 에 실어 **레이아웃이 안 튀게** 한다
 */
export const ShotEntry = z.object({
  file: z.string().startsWith('/shots/').endsWith('.png'),
  src: z.string().startsWith('/'),
  alt: z.string().min(1).max(200),
  width: z.int().positive(),
  height: z.int().positive(),
}).strict()

/**
 * ⚠ `min(1)` 이다 — 빈 목록을 통과시키면 **그림 0장인 랜딩이 조용히 배포된다.**
 *   그건 이 항목(FINDINGS 131)이 막으려는 바로 그 상태다. 빈 파일이면 빌드에서 죽는 게 맞다.
 * ⚠ `max` 는 저장소에 커밋되는 바이너리라 적게 둔다 (`plan.ts` 의 `PUBLISHED` 주의).
 */
export const ShotsManifest = z.object({
  shots: z.array(ShotEntry).min(1).max(6),
}).strict()

export type ShotEntry = z.infer<typeof ShotEntry>
export type ShotsManifest = z.infer<typeof ShotsManifest>
