/**
 * 표(Record)를 유니온으로 올릴 때 쓰는 한 줄짜리 도구.
 *
 * ★ 왜 있나 — `Object.values(표)` 나 `keys.map(...)` 은 「비어 있지 않다」를 타입이 모른다.
 *   `z.discriminatedUnion` 은 비어 있지 않은 튜플을 요구한다. 여기서 한 번만 좁히면
 *   호출부마다 `as [T, ...T[]]` 캐스트를 흩뿌리지 않아도 된다.
 */
export function nonEmpty<T>(items: readonly T[]): [T, ...T[]] {
  const [first, ...rest] = items
  if (first === undefined) throw new Error('표가 비어 있다 — 유니온으로 올릴 것이 없다')
  return [first, ...rest]
}
