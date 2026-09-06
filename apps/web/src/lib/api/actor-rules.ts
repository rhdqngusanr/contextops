import type { TeamRole } from '@contextops/schema'

// =====================================================================
//  🔴 **주체별 권한 표의 정본 하나** — 서버(`lib/api/auth.ts`)와 화면(`lib/web/actor.ts`)이
//     **같은 표**를 읽는다 (SPEC §9 「읽기 전용은 등급이 아니라 주체 종류」 · FINDINGS 121·135)
//
//  🔴 **여기엔 import 가 없다** (타입만). `auth.ts` 는 drizzle·DB 를 끌어오므로 클라이언트
//     컴포넌트가 거기서 이 표를 읽을 수 없었다 — 그래서 화면은 `session.guest` 를 보고
//     「막힐 것」을 **짐작**했고, 짐작은 서버와 갈릴 수 있다 (`lib/demo/tenant.ts` 와 같은 이유).
//     이 파일이 값만 살면 화면이 서버와 같은 줄을 읽는다. ⚠ 여기에 DB·스키마 import 를 더하지 마라.
//
//  ★ 두 축이다 — 「어느 등급까지 할 수 있나」(`maxRole`)와 「쓸 수 있나」(`writes`).
//    왜 `writes` 가 등급이 아니라 따로 있나는 `auth.ts` 머리 주석에 있다 (모든 GET 라우트를
//    안 고치려고). 화면은 이 중 **`writes` 만** 읽는다 — 「누를 수 있나」가 아니라
//    「누르면 서버가 뭐라 할 것인가」를 미리 말하려고. 막는 것은 여전히 서버다.
//
//  ★ 새 주체: ①`ACTOR_KINDS` 끝에 값 ②이 표 한 줄 ③`auth.ts` 의 `Actor` 유니온과
//    `sessionActor`/`deviceActor` 중 어디서 나오나 ④`lib/web/actor.ts` 의 `actorKindOf` 가
//    세션에서 그 종류를 알아낼 수 있나 ⑤`test/api-auth.test.ts` 「표의 세 주체」 시험.
//    라우트는 고칠 것이 없다.
// =====================================================================

/** 주체의 종류. 서버의 `Actor['kind']` 와 같아야 한다 — `auth.ts` 가 타입으로 잠근다. */
export const ACTOR_KINDS = ['user', 'device', 'guest'] as const
export type ActorKind = (typeof ACTOR_KINDS)[number]

export const ACTOR_RULES: Record<ActorKind, { maxRole: TeamRole; writes: boolean }> = {
  user: { maxRole: 'owner', writes: true },
  device: { maxRole: 'member', writes: true },
  //  🔴 게스트 = `/demo` 로 들어온 사람. 사람인 것은 맞지만 **아무것도 바꿀 수 없다.**
  guest: { maxRole: 'member', writes: false },
}
