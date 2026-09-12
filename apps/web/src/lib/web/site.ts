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

import { localized } from '../i18n/localized'

/**
 * 🔴 **언어를 타는 세 문장** (2026-09-12). 나머지(이름·이미지·아이콘)는 언어가 없다.
 *
 * ★ 왜 `SITE` 에서 갈라 냈나 — `SITE` 는 「탭과 링크 미리보기에 나가는 것」의 표이고
 *   그중 **글자만** 언어를 탄다. 표 전체를 언어별로 두면 `ogImage.width` 같은 값이
 *   언어마다 한 벌씩 생기고, 한쪽만 고치면 조용히 갈라진다.
 * ⚠ 영어 문장은 한국어의 번역이 아니라 **같은 일을 하는 문장**이다 — 「무슨 물건인가」를
 *   먼저 말하고(eyebrow), 문제부터 꺼낸다(description). 결이 다르면 그 언어에서만 안 통한다.
 */
export const SITE_TEXT = localized({
  ko: {
    /**
     * 표제 위 한 줄 — **이게 무엇인가**를 먼저 말한다.
     * 🔴 2026-09-11: `Team Context for Claude Code` 였다. 한국 비개발자가 이 사이트에서
     *    **가장 먼저 읽는 글자**인데 뜻이 없었다 — 표제는 울림은 있어도 **이게 무슨 물건인지는
     *    말하지 않으므로**, 그 일을 이 줄이 해야 한다.
     * ⚠ 「Claude Code」는 고유명사라 그대로 둔다 — 이 제품의 대상을 가리키는 이름이다.
     */
    eyebrow: 'Claude Code 를 쓰는 팀의 공용 규칙',
    //  2026-09-10 사용자 지시: 「팀의 기억과 AI 기억을 한 방향으로」 결로 — 짧고 곧게. 「지식」→「기억」, 「같은」→「한」.
    tagline: '팀의 기억과 AI의 기억을 한 방향으로',
    //  2026-09-10 사용자: 「문구가 뭘 의도하는지 안 와닿는다」 — 문제(같은 팀, 다른 답)부터 말한다.
    description:
      '같은 팀인데 AI 마다 답이 다릅니다. 팀의 목표·규칙·결정을 팀장이 한 번 승인하면 '
      + '모든 팀원의 Claude Code 가 같은 내용을 받고, 로드맵이 실제로 어디까지 됐는지 근거와 함께 보입니다.',
  },
  en: {
    eyebrow: 'Shared rules for teams on Claude Code',
    tagline: "Your team's memory and your AI's, pointing the same way",
    description:
      'Same team, different answers from every AI. Approve your goals, rules and decisions once, '
      + "and every teammate's Claude Code gets the same context — with a roadmap that shows how far the work actually got, and the evidence for it.",
  },
})

export const SITE = {
  name: 'ContextOps',
  //  🔴 **글자 셋(eyebrow · tagline · description)은 위 `SITE_TEXT` 로 옮겼다** (2026-09-12 · 영어 모드).
  //     ★ 왜 — 그 셋만 언어를 타고 나머지는 안 탄다. 여기 한국어로 한 벌 더 두면 정본이 둘이 되고,
  //       한쪽만 고친 날 탭 제목과 랜딩 머리가 다른 문장을 말한다.
  //     ⚠ `SITE.tagline` 을 찾고 있었다면 `pick(SITE_TEXT, locale).tagline` 이다.
  //  ★ 그 셋이 원래 왜 그 문장인가(2026-09-10·09-11 의 결정)는 `SITE_TEXT` 의 주석에 옮겨 두었다.
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
