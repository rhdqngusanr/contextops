import { eq } from 'drizzle-orm'

import { getDb } from '../../db/client'
import { teams } from '../../db/schema'
import { demoSubjects, readDemoSeedFile, seedDemo, type DemoSeedResult } from './seed-demo'
import { deleteTeamBySlug, deleteUsersBySubject } from './teardown'
import { DEMO_TENANT } from './tenant'

// =====================================================================
//  데모 테넌트 **리셋** — 옆자리에 먼저 심고, 성공하면 자리를 바꾼다 (SPEC §9 「시드 스크립트로 매일 03:00 리셋」)
//
//    부르는 자리: `GET /cron/demo-reset` 하나 (Vercel Cron · `CRON_SECRET` 뒤).
//
//  ★ 왜 「지우고 심기」가 아니라 「심고 바꾸기」인가 (INBOX H6 · 2026-09-10) — 예전엔 먼저 지우고 심었다. 심기가
//    중간에 죽으면(무료 DB 가 잠들어 있거나 · 마이그레이션이 덜 됐거나) **그날 데모가 없었다** — 심사 기간에
//    그 아침 링크를 연 심사위원은 「데모 테넌트가 심어져 있지 않다」를 본다. 이제는 `demo-next` 라는 옆자리에
//    끝까지 심은 뒤에야 옛 팀을 지우고 새 팀의 slug 를 `demo` 로 바꾼다 — **실패하면 어제 데모가 그대로 산다.**
//
//  ★ 왜 「있으면 건너뛰기」가 아닌가 — 심사위원이 어제 만진 흔적(제안 결정·확인)이 그대로 남는다. 리셋의 뜻은
//    **매일 같은 데모**다.
//
//  ⚠ 지우기와 바꾸기 사이에 몇 ms 의 틈이 있다 — 그 순간 `/demo/session` 은 404 다. 심기(수십 초)가 아니라
//    UPDATE 하나의 길이라 받아들였다. 사람(users)은 지우지 않는다 — 같은 subject 로 upsert 되므로 새 팀의
//    멤버십이 같은 행을 가리키고, 남는 행도 없다.
//  ⚠ 옆자리에 심다 죽으면 옆자리만 지운다. 지난 리셋이 옆자리를 남긴 채 죽었을 수도 있어 시작할 때 한 번 더 지운다.
// =====================================================================

/** 심는 동안 쓰는 임시 slug. 정본 slug 뒤에 붙여 화면 어디에도 안 뜬다 — 바꾸기 전엔 `/demo/session` 이 이 팀을 모른다. */
export const DEMO_STAGING_SLUG = `${DEMO_TENANT.teamSlug}-next`

export type DemoResetResult = {
  /** 바꾸기 전에 데모 팀이 있었나 — 첫 심기인지 리셋인지 로그에서 가른다. */
  existed: boolean
  seeded: DemoSeedResult
}

/** 시험이 심기 실패를 만들 수 있게 심는 함수를 바꿔 끼운다 — 제품 코드는 기본값만 쓴다. */
export type DemoSeeder = (now: Date, into: { teamSlug?: string }) => Promise<DemoSeedResult>

export async function resetDemo(now: Date = new Date(), seed: DemoSeeder = seedDemo): Promise<DemoResetResult> {
  const db = getDb()

  //  지난 리셋이 옆자리를 남기고 죽었을 수 있다 — 먼저 비운다.
  await deleteTeamBySlug(db, DEMO_STAGING_SLUG)

  const [current] = await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, DEMO_TENANT.teamSlug)).limit(1)

  let seeded: DemoSeedResult
  try {
    seeded = await seed(now, { teamSlug: DEMO_STAGING_SLUG })
  } catch (err) {
    //  🔴 옛 데모는 손대지 않았다 — 옆자리만 치우고 그대로 던진다. 링크는 어제 그대로 열린다.
    //     사람 행은 **소속이 없는 것만** 지운다 (`deleteUsersBySubject` 가 그렇게 돈다) — 옛 팀의 팀원은 그대로다.
    await deleteTeamBySlug(db, DEMO_STAGING_SLUG)
    await deleteUsersBySubject(db, demoSubjects(readDemoSeedFile()))
    throw err
  }

  const [staged] = await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, DEMO_STAGING_SLUG)).limit(1)
  if (!staged) throw new Error(`[demo-reset] 옆자리(${DEMO_STAGING_SLUG})에 심었다는데 팀이 없다`)

  //  ── 바꾸기 — 옛 팀을 지우고 새 팀이 정본 slug 를 받는다 ─────────────
  if (current) await deleteTeamBySlug(db, DEMO_TENANT.teamSlug)
  await db.update(teams).set({ slug: DEMO_TENANT.teamSlug }).where(eq(teams.id, staged.id))

  return { existed: current !== undefined, seeded: { ...seeded, teamSlug: DEMO_TENANT.teamSlug } }
}
