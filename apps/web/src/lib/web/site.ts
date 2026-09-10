// =====================================================================
//  사이트의 **이름표** 하나 (INBOX H2 · 2026-09-10)
//
//  ★ 왜 파일이 따로인가 — 같은 문장을 세 자리가 쓴다: 랜딩 머리(`components/landing.tsx` 의
//    `LANDING_HEAD`) · `<head>` 의 metadata(`app/layout.tsx` · OG 카드가 읽는 것) · OG 이미지를
//    그리는 스크립트(`scripts/og-image.ts`). 랜딩 컴포넌트는 CSS module 과 픽스처 JSON 을 import 하므로
//    layout·스크립트가 그것을 import 하면 무거워지고 tsx 는 CSS 를 못 읽는다. 문장만 여기 두고 셋이 읽는다.
//
//  ⚠ 여기에 화면 문구를 쌓지 마라 — 랜딩의 문장 표는 여전히 `landing.tsx` 다. 여기 있는 것은
//    **링크 미리보기와 탭에 나가는 것**뿐이다: 이름 · 한 줄 · 설명 · 이미지 · 아이콘.
// =====================================================================

export const SITE = {
  name: 'ContextOps',
  eyebrow: 'Team Context for Claude Code',
  /** 랜딩 제목과 같은 문장이다 (`LANDING_HEAD.title` 이 이 값을 읽는다). */
  //  2026-09-10 사용자 지시: 「팀의 기억과 AI 기억을 한 방향으로」 결로 — 짧고 곧게. 「지식」→「기억」, 「같은」→「한」.
  tagline: '팀의 기억과 AI의 기억을 한 방향으로',
  /** 랜딩 부제와 같은 문장이다 (`LANDING_HEAD.subtitle`). 링크 미리보기의 설명 칸에 그대로 나간다. */
  description:
    '팀장이 승인한 목표·로드맵·결정이 모든 팀원의 Claude Code에 같은 버전으로 닿고, '
    + '진행은 근거와 함께 보입니다.',
  /** `public/og.png` — `pnpm --filter web og:image` 가 헤드리스 Chrome 으로 그린다 (1200×630). */
  ogImage: { path: '/og.png', width: 1200, height: 630 },
  /** `public/icon.svg` — 탭·북마크 아이콘. 색은 DESIGN_BRIEF §3 의 토큰 값 그대로다. */
  icon: '/icon.svg',
  event: 'Wanted AI Championship 2026',
} as const

/**
 * 절대 URL 의 기준 — OG 이미지 경로를 절대 주소로 펴는 데 쓴다 (`metadataBase`).
 *
 * ★ 순서 — ① `NEXT_PUBLIC_SITE_ORIGIN`(사람이 정한 값) ② Vercel 이 빌드마다 주는 production 호스트
 *   ③ 로컬. 🙋 production URL 이 정해지면 ①을 Vercel env 에 넣는다 — 없어도 ②로 맞는 값이 나온다.
 * ⚠ 값이 틀리면 링크 미리보기의 이미지만 깨진다 — 앱은 그대로 돈다.
 */
export function siteOrigin(env: Record<string, string | undefined> = process.env): string {
  if (env.NEXT_PUBLIC_SITE_ORIGIN) return env.NEXT_PUBLIC_SITE_ORIGIN.replace(/\/$/, '')
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}
