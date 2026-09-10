// =====================================================================
//  바이트 수 → 사람 말 (2026-09-11 · 화면 7 의 `6310B` 는 단위가 개발자 낱말이었다)
//  ★ 값은 그대로고 낱말만 바뀐다 — 단위 배수는 `UNIT` 하나, 이름은 `NAMES` 표 하나(더 큰 단위는 끝에 한 줄).
// =====================================================================

const UNIT = 1024
const NAMES = ['B', 'KB', 'MB'] as const

/** `512` → `512 B` · `6310` → `6.2 KB` · `1048576` → `1.0 MB` (B 위로는 소수 1자리). */
export function formatBytes(n: number): string {
  let value = n
  let unit = 0
  while (value >= UNIT && unit < NAMES.length - 1) {
    value /= UNIT
    unit += 1
  }
  return unit === 0 ? `${n} ${NAMES[0]}` : `${value.toFixed(1)} ${NAMES[unit]}`
}
