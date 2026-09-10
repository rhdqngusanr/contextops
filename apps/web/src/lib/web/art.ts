// =====================================================================
//  랜딩의 **그림** 정본 — 경로·크기·대체텍스트·출처가 여기 하나에 있다 (DESIGN_BRIEF §3 「그림」 · 2026-09-10)
//
//  ★ 왜 파일이 따로인가 — ① `landing.tsx` 는 캡처 파일 이름을 못 적는다(`web-landing-shots.test` ①: 화면 코드에
//    `.png` 0건). 그림 경로가 화면 코드에 박히면 그 규칙이 무너진다. ② og 이미지·랜딩이 같은 그림을 읽는다.
//  ★ 그림은 **사람이 고른 생성 이미지**다 — 로컬 Codex CLI(imagegen)가 만든 후보를 보여 주고 사용자가 골랐다
//    (`docs/evidence/2026-09-10-redesign/art/`). 코드로 그린 그림(SVG·Pillow)은 두지 않는다 — 사용자 지시.
//  ⚠ 파일은 `public/art/` 의 WebP 다 (1536×1024 · 클레이 그림이라 20KB 안팎). 원본 PNG 는 evidence 에.
//  ⚠ 카드에는 글씨가 새겨져 있다(2026-09-10 사용자: 「클레이에 글씨들이 없잖아」) — 위 카드 `CLAUDE.md` · 아래 `A`·`B`·`C` · 단계 2 의 `v1.1.0` ·
//     단계 3 의 `Roadmap`. 전부 제품에 실제로 있는 이름·버전(데모 v1.1.0 · Before/After 의 A·B·C)이다 — 없는 숫자·판정을 새기지 마라.
//  ⚠ 대체텍스트는 **그림이 무엇인지**만 말한다 — 제품의 주장(숫자·판정)을 그림에 싣지 않는다 (DESIGN_BRIEF §2-1).
// =====================================================================

export type Artwork = {
  readonly src: string
  readonly width: number
  readonly height: number
  readonly alt: string
}

export const ART = {
  /** 히어로 오른쪽 — 두꺼운 카드 한 장에서 실이 셋으로 갈라져 같은 카드 셋에 닿는다 (한 Pack → 모든 기기). */
  hero: {
    src: '/art/hero-pack.webp',
    width: 1536,
    height: 1024,
    alt: '「CLAUDE.md」라 새겨진 두꺼운 카드 한 장에서 검은 실 세 가닥이 갈라져 아래의 A·B·C 카드 셋에 닿는 클레이 그림 — 승인된 Pack 하나가 모든 기기에 같은 버전으로 닿는다',
  },
  /**
   * 히어로 스톱모션 — 같은 장면을 Codex 가 4장 더 뽑았다(실이 위 카드에서 세 기기로 내려오는 중간 장면 · 실 길이만 다르다).
   * 완성 장면은 `hero` 자체다. 화면은 이 넷을 `hero` 위에 차례로 띄우고 완성 장면에서 쉰다 (`landing.module.css` 의 `hero-stop`).
   * alt 는 비어 있다 — 장식 반복이라 `hero` 의 alt 하나면 된다. 비어 있으면 그림 한 장만 선다.
   * 움직임 줄이기 설정에서는 `globals.css` 의 한 블록이 애니메이션을 끝내 완성 장면만 남는다.
   */
  heroFrames: [
    { src: '/art/hero-frame-1.webp', width: 1536, height: 1024, alt: '' },
    { src: '/art/hero-frame-2.webp', width: 1536, height: 1024, alt: '' },
    { src: '/art/hero-frame-3.webp', width: 1536, height: 1024, alt: '' },
    { src: '/art/hero-frame-4.webp', width: 1536, height: 1024, alt: '' },
  ] as readonly Artwork[],
  /**
   * 「어떻게 동작하나요」 세 단계 — 순서는 `HOW_IT_WORKS.steps`(만든다 · 배포한다 · 진행이 보인다)와 같다.
   * 히어로와 같은 시리즈다 — Codex 에 히어로 그림을 `-i` 로 참고로 주고 뽑았다. 단계 수와 다르면 화면은 글로만 선다.
   */
  steps: [
    {
      src: '/art/step-make.webp',
      width: 1536,
      height: 1024,
      alt: '얇은 클레이 판 다섯 장이 쌓여 있고 거기서 나온 검은 실들이 오른쪽의 「CLAUDE.md」 카드 한 장으로 모이는 그림 — 문서에서 항목을 뽑아 하나로 정리한다',
    },
    {
      src: '/art/step-distribute.webp',
      width: 1536,
      height: 1024,
      alt: 'A·B·C 라 새겨진 클레이 카드 셋(각각 v1.1.0)이 한 줄로 서 있고 검은 실 하나가 셋을 같은 높이로 꿰뚫는 그림 — 같은 버전이 모두에게 닿는다',
    },
    {
      src: '/art/step-progress.webp',
      width: 1536,
      height: 1024,
      alt: '「Roadmap」이라 새겨진 긴 클레이 레일에 검은 조각이 왼쪽부터 삼분의 일 채워져 있고 옆에 확인 표시가 새겨진 작은 타일이 있는 그림 — 진행은 근거만큼 차고 완료는 사람이 확인한다',
    },
  ] as readonly Artwork[],
} as const
