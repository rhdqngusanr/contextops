// =====================================================================
//  문자열 원자 — 렌더가 쓰는 순수 함수만. 정본은 docs/SPEC.md §4.1 4단계.
//
//  ⚠ 여기 있는 것은 전부 **순수 함수**여야 한다 (P4). 시각·난수·환경변수가
//    하나라도 섞이면 「같은 snapshot → byte-identical Pack」이 거짓이 된다.
// =====================================================================

/**
 * 인라인 필드로 만든다 — 줄바꿈과 연속 공백을 공백 하나로 접는다.
 * ★ 왜 필요한가 — 역추적 태그는 **줄 끝**에 붙는다 (P7). 본문에 줄바꿈이 남으면
 *   태그 없는 줄이 Pack 에 생기고, 그 줄은 어느 항목에서 왔는지 알 수 없게 된다.
 */
export function inline(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Markdown escape (SPEC §4.1 4단계) — `|` · 선행 `#` · `<!--`.
 *   `|`     표를 깨뜨린다
 *   선행 `#` 항목 본문이 제목으로 승격돼 문서 구조가 뒤집힌다
 *   `<!--`  🔴 주석을 열어 **뒤에 오는 역추적 태그를 통째로 삼킨다** (P7 이 뚫린다)
 */
export function esc(value: string): string {
  return inline(value)
    .replace(/\|/g, String.raw`\|`)
    .replace(/<!--/g, '&lt;!--')
    .replace(/^#/, String.raw`\#`)
}

/**
 * 파일 이름에 쓰는 slug. `domain-{slug}.md` · `scoped-{slug}.md` 가 이걸로 만들어진다.
 * ⚠ 한글을 지우지 않는다 — 지우면 도메인 「결제」와 「정산」이 같은 파일로 합쳐진다.
 *   (합쳐질 위험은 compile 이 경고로 낸다)
 */
export function slugify(value: string): string {
  const s = value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
  return s.length > 0 ? s.slice(0, 60) : 'unnamed'
}

/**
 * 코드포인트 순 비교. `localeCompare` 를 쓰지 마라 — **로케일에 따라 순서가 달라져서**
 * 같은 snapshot 이 기계마다 다른 Pack 을 낸다 (P4 위반). SPEC §4.1 3단계가 명시한다.
 */
export function compareCodepoints(a: string, b: string): number {
  const ca = Array.from(a)
  const cb = Array.from(b)
  const n = Math.min(ca.length, cb.length)
  for (let i = 0; i < n; i++) {
    const x = ca[i] as string
    const y = cb[i] as string
    if (x !== y) return (x.codePointAt(0) as number) - (y.codePointAt(0) as number)
  }
  return ca.length - cb.length
}

/**
 * 키 순서를 정렬한 JSON. snapshot_hash 가 **키 순서에 흔들리지 않게** 하는 자리다.
 * (DB 가 컬럼을 어떤 순서로 내놓든 같은 해시여야 한다)
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => compareCodepoints(a, b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`
}
