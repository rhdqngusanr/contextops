// =====================================================================
//  캡처 계획 — **무엇을 찍고 무엇을 랜딩으로 넘기나**의 정본 (FINDINGS 131)
//
//  ★ 왜 표 하나인가 — 찍는 쪽(`e2e/shots.ts`)과 옮기는 쪽(`e2e/publish-shots.ts`)이
//    각자 목록을 가지면 한쪽만 늘어나고, 그러면 「랜딩이 읽는 그림이 낡았는데 아무도
//    모르는」 상태가 생긴다. 두 스크립트는 이 표를 **읽기만** 한다.
//
//  🔴 **앱 화면 줄은 손으로 적지 않는다** — `PROJECT_SCREENS`(화면 표의 정본)에서
//     그대로 만든다. 화면을 하나 더하면 캡처도 저절로 하나 는다.
//     `apps/web/test/e2e-plan.test.ts` 가 「표의 모든 화면이 계획에 있다」를 센다.
//
//  🔴 **새 캡처를 랜딩에 쓰려면**: ① 아래 `PUBLISHED` 에 화면 이름과 대체텍스트 한 줄
//     ② 관통을 돌린다 (`shots` → `shotcopy` 가 `apps/web/public/shots/` 로 옮긴다)
//     ③ 랜딩은 `public/shots/manifest.json` 을 읽는다 — 파일 이름을 화면 코드에 적지 마라.
// =====================================================================

import { DEMO_TENANT } from '../src/lib/demo/tenant'
import { PROJECT_SCREENS } from '../src/lib/web/screens'

export type Shot = {
  /** `.ci/shots/<name>.png` — 이름이 곧 파일 이름이다 */
  readonly name: string
  /** 열 주소 (호스트 없이) */
  readonly path: string
  /** 이 selector 가 실제로 보여야 「그 화면이 그려졌다」다 */
  readonly needs: string
  readonly width: number
  readonly height: number
  /** `public/shots/` 로 옮길 파일 이름. `null` 이면 눈 판정 재료로만 쓴다 */
  readonly publish: string | null
  /** 랜딩이 쓸 대체텍스트 (`publish` 가 있을 때만 의미가 있다) */
  readonly alt: string
}

/** 게스트 데모가 앉는 자리 — 슬러그의 정본은 `DEMO_TENANT` 하나다 */
const BASE = `/t/${DEMO_TENANT.teamSlug}/p/${DEMO_TENANT.projectSlug}`

/**
 * 랜딩으로 넘길 화면과 그 대체텍스트.
 * ⚠ 여기 없는 화면은 찍기만 하고 `public/` 으로 안 간다 — 랜딩에 쓸 그림은 **적게** 둔다.
 *   저장소에 들어가는 바이너리라 한 장이 늘면 매 관통마다 그만큼 diff 가 는다.
 */
const PUBLISHED: Record<string, string> = {
  context: '팀 Context 화면 — 항목마다 원문 근거가 옆에 붙어 있다',
  packs: 'Pack Explorer — 발행된 CLAUDE.md 와 그 줄의 출처',
  sync: 'Sync 화면 — 기기마다 어느 버전이 적용됐나',
}

/** 앱 껍데기가 붙는 화면인지 (랜딩은 껍데기를 안 쓴다) */
const APP_SHELL = '.main-inner'

export const SHOT_PLAN: readonly Shot[] = [
  //  랜딩 — 심사위원이 제일 먼저 보는 화면. 좁은 폭도 같이 찍는다 (FINDINGS 160 이 잰 자리).
  { name: 'landing-1440', path: '/', needs: '.btn-primary', width: 1440, height: 900, publish: null, alt: '' },
  { name: 'landing-375', path: '/', needs: '.btn-primary', width: 375, height: 812, publish: null, alt: '' },

  //  앱 화면 — 표에서 그대로 만든다. 손으로 한 줄도 더하지 마라.
  ...PROJECT_SCREENS.map((screen): Shot => ({
    name: `screen-${screen.path}`,
    path: `${BASE}/${screen.path}`,
    needs: APP_SHELL,
    width: 1440,
    height: 900,
    publish: PUBLISHED[screen.path] ? `screen-${screen.path}.png` : null,
    alt: PUBLISHED[screen.path] ?? '',
  })),
]

/** `public/shots/` 로 옮길 줄만. 옮기는 쪽과 시험이 같은 것을 본다. */
export const PUBLISHED_SHOTS: readonly Shot[] = SHOT_PLAN.filter((s) => s.publish !== null)
