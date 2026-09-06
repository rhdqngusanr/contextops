import { ACTOR_RULES } from '../api/actor-rules'
import { hintText } from './api'
import { actorKindOf, readSession, type WebSession } from './session'

// =====================================================================
//  🔴 **화면이 「누르면 서버가 뭐라 할 것인가」를 미리 아는 자리** (FINDINGS 121·135)
//
//  ★ 왜 있나 — 게스트(읽기 전용)가 [발행하기] 를 누르면 **발행 모달이 열렸다.** 서버는
//    막지만(`ACTOR_RULES.writes` · `route.ts` 의 `refuseWrite`) 화면이 먼저 「할 수 있다」고
//    말한 것이다. 심사위원은 버전을 고르고 요약을 적은 뒤에야 403 을 봤다.
//
//  🔴 **판단은 서버와 같은 표(`ACTOR_RULES`)에서 읽는다.** `session.guest` 는 **종류를
//     알아내는 데만** 쓴다 — 「게스트면 막자」를 여기 적으면 표와 갈릴 수 있고, 갈리면
//     화면이 막았는데 서버는 열려 있거나 그 반대가 된다. localStorage 를 고친 사람은
//     여기를 지나도 서버가 403 이다 — **막는 것은 여전히 서버다.**
//
//  ⚠ 이 값으로 버튼을 **숨기지 마라.** 버튼은 그대로 두고, 누르면 **그 자리에서 이유**를
//    말한다. 숨기면 「이 제품엔 발행이 없다」로 읽히고, 그건 데모가 보여 줘야 할 것을 감추는 것이다.
// =====================================================================

/** 이 세션이 누르는 **쓰기** 문이 열려 있나 — `open` 이 아니면 `reason` 이 그 자리에 뜰 문장이다. */
export type WriteDoor = { readonly open: true } | { readonly open: false; readonly reason: string }

/**
 * 쓰기 버튼(발행·승인·답 저장)을 누르기 **전에** 서버가 뭐라 할지를 표에서 읽는다.
 * ⚠ 열려 있어도 서버는 등급(`maxRole`)을 또 본다 — 여기는 `writes` 축만이다.
 *   등급은 화면이 `team.role` 로 따로 읽는다 (`canEdit`).
 */
export function writeDoor(session: Pick<WebSession, 'guest'> | null = readSession()): WriteDoor {
  const kind = actorKindOf(session)
  if (ACTOR_RULES[kind].writes) return { open: true }
  //  서버가 이 주체에게 낼 코드는 FORBIDDEN 이다 (`refuseWrite`). 그 코드를 **그 주체의 문구**로.
  return { open: false, reason: hintText('FORBIDDEN', kind) }
}
