import type { PgColumn } from 'drizzle-orm/pg-core'

import { users } from '../../db/schema'

// =====================================================================
//  사람을 화면에 내보내는 **유일한 문** (SPEC §5 — `sync-status` 의 `user`)
//
//  🔴 **이름 하나다.** 이메일·avatar·가입일은 나가지 않는다.
//     ★ 왜 문을 하나로 두나 — 라우트마다 `select` 를 손으로 적으면 어느 라우트는
//       이메일까지 실어 보내게 되고, 그 응답은 이미 브라우저에 도착한 뒤라 되돌릴 수
//       없다. 여기 한 줄을 더하는 순간 **모든 화면이 같이 넓어진다** — 그래서 더하기
//       전에 「그 칸 없이 화면이 할 일을 못 하나」를 먼저 물어라.
//
//  ⚠ **P5 와 헷갈리지 마라.** 금지된 것은 개인 생산성 점수·순위지 「누가 냈나」가
//    아니다. 제안을 누가 올렸는지, 어느 팀원의 노트북이 낡았는지는 **팀이 결정을
//    내리는 데 필요한 사실**이다. 여기에 「누가 제일 자주 sync 했나」류의 집계를
//    더하는 순간 그게 P5 위반이다.
//
//  ★ 새 소비처 절차: ① `userRefColumns(자리, 표)` 를 그대로 `select` 에 편다 —
//    한 질의에 사람이 **둘 이상**이면 `alias(users, …)` 로 표를 하나 더 만들어 넘긴다
//    ② nullable FK 면 `userRefOf(row, 자리)` 로 접는다 ③ 응답 타입
//    (`lib/web/queries.ts`)에 `UserRef` 를 쓴다.
// =====================================================================

/** 화면이 사람에 대해 아는 전부. `id` 는 같은 사람을 묶는 열쇠고, 그리는 것은 `name` 이다. */
export type UserRef = { id: string; name: string }

/** `users` 표 자신이거나 그것의 별칭(`alias(users, …)`) — 둘 다 `id`·`name` 을 가진다. */
type UsersLike = { id: PgColumn; name: PgColumn }

/**
 * `select` 에 그대로 펴서 쓰는 칸 표를 **자리 이름 하나로** 만든다 —
 * `.select({ ...userRefColumns('decider', deciders), … })`.
 *
 * 🔴 **한 질의에 사람이 둘 이상 붙을 수 있다** (제안: 작성자 + 결정자 · FINDINGS 116).
 *   그때 `users` 를 **별칭 없이** 두 번 join 하면 조용히 한쪽 이름이 다른 칸에 들어간다 —
 *   화면에는 멀쩡한 사람 이름이 뜨므로 **눈으로 절대 안 잡힌다.** 그래서 칸 이름(`prefix`)과
 *   읽을 표(`table`)를 **같이** 받는다: 자리를 하나 늘리는 것이 여기서 한 줄이다.
 * ⚠ `users.email` 을 여기 넣지 마라 (위 주석).
 */
export function userRefColumns<P extends string, T extends UsersLike>(prefix: P, table: T) {
  return { [`${prefix}_id`]: table.id, [`${prefix}_name`]: table.name } as
    Record<`${P}_id`, T['id']> & Record<`${P}_name`, T['name']>
}

/** 기본 자리 — `user_id`·`user_name` (`sync-status` 의 `user`). */
export const USER_REF_COLUMNS = userRefColumns('user', users)

/**
 * `leftJoin` 이 못 찾은 사람을 `null` 로 접는다 — **지어내지 않는다.**
 *
 * ★ 왜 필요한가 — `proposals.author_id` 처럼 nullable 인 FK 가 있다 (기기가 올린 제안,
 *   탈퇴한 사람). 그때 이름 자리에 uuid 나 「알 수 없음」을 서버가 채우면 화면은 그것을
 *   **사람 이름으로** 그린다. `null` 이면 화면이 「기기」·「—」 중 무엇을 그릴지 스스로
 *   정할 수 있다.
 */
export function userRefOf<P extends string>(
  row: Record<`${P}_id`, string | null> & Record<`${P}_name`, string | null>,
  prefix: P,
): UserRef | null {
  const id = row[`${prefix}_id` as keyof typeof row] as string | null
  const name = row[`${prefix}_name` as keyof typeof row] as string | null
  if (id === null || name === null) return null
  return { id, name }
}
