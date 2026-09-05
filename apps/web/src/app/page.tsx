import { Landing } from '../components/landing'

// =====================================================================
//  `/` — 화면 1 랜딩 (SPEC §9 표 1행 · DESIGN_BRIEF §4 「화면 1」)
//
//  ★ 여기는 한 줄이다. 문구·표·모양은 전부 `components/landing.tsx` 에 산다 —
//    시험이 그 표를 들여와 「Before/After 가 진짜 Pack 규칙과 같은가」를 재기 때문이다.
//
//  🔴 **정적이다.** `'use client'` 도 세션 읽기도 없다 (SPEC §9 표의 「상태」 칸).
//     시크릿 창에서 여는 첫 화면이 로그인 상태에 따라 갈리면 GATE 3 이 두 모양이 된다.
// =====================================================================
export default function Home() {
  return <Landing />
}
