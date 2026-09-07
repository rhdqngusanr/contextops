// =====================================================================
//  캡처 단계가 **관통에게 말하는 줄** — 두 줄의 정본 (FINDINGS 131)
//
//  ★ 왜 따로 있나 — 이 줄의 모양은 `tools/walkthrough.ps1` 의 `count_log` 정규식과
//    **짝**이다. 스크립트 안에 문자열로 묻혀 있으면 한쪽만 바뀌고, 그러면 관통이
//    「검사 수를 못 셌다」로 FAIL 한다 (`shots` 단계 주석 · FINDINGS 95 · 96).
//    자리를 하나로 두고 `apps/web/test/e2e-plan.test.ts` 가 **정규식을 실제로 걸어 본다.**
// =====================================================================

/** `shots` 단계의 마지막 줄 */
export function shotsSummary(passed: number, failed: number): string {
  return `e2e: ${passed} passed, ${failed} failed — 캡처는 .ci/shots/`
}

/** `shotcopy` 단계의 마지막 줄 */
export function copySummary(checks: number, failed: number, outDir: string): string {
  return `shotcopy: 검사 ${checks}개 · 실패 ${failed}개 — ${outDir}`
}
