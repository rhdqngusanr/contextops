import { Landing } from '../components/landing'
import { serverLocale } from '../lib/i18n/server'

// =====================================================================
//  `/` — 화면 1 랜딩 (SPEC §9 표 1행 · DESIGN_BRIEF §4 「화면 1」)
//
//  ★ 여기는 한 줄이다. 문구·표·모양은 전부 `components/landing.tsx` 에 산다 —
//    시험이 그 표를 들여와 「Before/After 가 진짜 Pack 규칙과 같은가」를 재기 때문이다.
//
//  🔴 **정적이다.** `'use client'` 도 세션 읽기도 없다 (SPEC §9 표의 「상태」 칸).
//     시크릿 창에서 여는 첫 화면이 로그인 상태에 따라 갈리면 GATE 3 이 두 모양이 된다.
// =====================================================================
//  🔴 **요청을 읽는 것은 이 한 줄이다** (2026-09-12 · 영어 모드). `Landing` 안에서 읽지 않는
//     이유 — 그 컴포넌트는 시험과 덤프 스크립트가 **요청 없이** 그린다 (`Landing` 의 주석).
//  ⚠ `serverLocale()` 이 쿠키·머리를 읽으므로 이 라우트는 이제 **동적 렌더**다. 세션은 여전히
//    안 읽는다 — 로그인 상태에 따라 갈리지 않으므로 GATE 3 의 전제는 그대로다.
export default async function Home() {
  return <Landing locale={await serverLocale()} />
}
