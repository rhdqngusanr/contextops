import { getDb } from '../../db/client'
import { demoSubjects, readDemoSeedFile, seedDemo, type DemoSeedResult } from './seed-demo'
import { deleteTeamBySlug, deleteUsersBySubject } from './teardown'
import { DEMO_TENANT } from './tenant'

// =====================================================================
//  데모 테넌트 **리셋** — 지우고 다시 심는다 (SPEC §9 「시드 스크립트로 매일 03:00 리셋」)
//
//    부르는 자리: `GET /cron/demo-reset` 하나 (Vercel Cron · `CRON_SECRET` 뒤).
//
//  ★ 왜 「지우고 심기」인가 — 심기만 하면 둘째 날 `teams.slug` 가 겹쳐 400 이고,
//    「있으면 건너뛰기」로 두면 심사위원이 어제 만진 흔적(제안 결정·확인)이 그대로 남는다.
//    리셋의 뜻은 **매일 같은 데모**다.
//
//  🔴 **반쯤 심긴 데모보다 없는 데모가 낫다.** 심다가 던지면 다시 지운다 — 그러면
//     `/demo/session` 이 404 로 「심어져 있지 않다」고 말한다. 반쯤 남기면 링크는 열리는데
//     화면이 비고, 원인은 화면에 안 적힌다 (그 라우트의 주석).
//     ⚠ 지우기와 심기가 **한 트랜잭션이 아니다** — 심기는 라우트를 수십 번 부르고
//       라우트마다 제 트랜잭션이 있다. 그래서 「실패하면 지운다」가 대신 서 있다.
// =====================================================================

export type DemoResetResult = {
  /** 지우기 전에 데모 팀이 있었나 — 첫 심기인지 리셋인지 로그에서 가른다. */
  existed: boolean
  seeded: DemoSeedResult
}

export async function resetDemo(now: Date = new Date()): Promise<DemoResetResult> {
  const db = getDb()
  const subjects = demoSubjects(readDemoSeedFile())

  const existed = (await deleteTeamBySlug(db, DEMO_TENANT.teamSlug)) !== undefined
  //  ⚠ 사람은 팀 다음에 지운다 — 소속이 남아 있으면 `deleteUsersBySubject` 가 그 사람을 남긴다.
  await deleteUsersBySubject(db, subjects)

  try {
    const seeded = await seedDemo(now)
    return { existed, seeded }
  } catch (err) {
    await deleteTeamBySlug(db, DEMO_TENANT.teamSlug)
    await deleteUsersBySubject(db, subjects)
    throw err
  }
}
