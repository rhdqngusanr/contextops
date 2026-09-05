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
//  ★ 새 소비처 절차: ① `USER_REF` 를 그대로 `select` 에 편다 ② nullable FK 면
//    `userRefOf()` 로 접는다 ③ 응답 타입(`lib/web/queries.ts`)에 `UserRef` 를 쓴다.
// =====================================================================

/** 화면이 사람에 대해 아는 전부. `id` 는 같은 사람을 묶는 열쇠고, 그리는 것은 `name` 이다. */
export type UserRef = { id: string; name: string }

/**
 * `select` 에 그대로 펴서 쓰는 칸 표 — `.select({ ...USER_REF_COLUMNS, … })`.
 * ⚠ `users.email` 을 여기 넣지 마라 (위 주석).
 */
export const USER_REF_COLUMNS = { user_id: users.id, user_name: users.name } as const

/**
 * `leftJoin` 이 못 찾은 사람을 `null` 로 접는다 — **지어내지 않는다.**
 *
 * ★ 왜 필요한가 — `proposals.author_id` 처럼 nullable 인 FK 가 있다 (기기가 올린 제안,
 *   탈퇴한 사람). 그때 이름 자리에 uuid 나 「알 수 없음」을 서버가 채우면 화면은 그것을
 *   **사람 이름으로** 그린다. `null` 이면 화면이 「기기」·「—」 중 무엇을 그릴지 스스로
 *   정할 수 있다.
 */
export function userRefOf(row: { user_id: string | null; user_name: string | null }): UserRef | null {
  if (row.user_id === null || row.user_name === null) return null
  return { id: row.user_id, name: row.user_name }
}
