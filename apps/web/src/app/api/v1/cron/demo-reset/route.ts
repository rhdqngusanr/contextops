import { requireCronSecret } from '../../../../../lib/api/cron'
import { route } from '../../../../../lib/api/route'
import { resetDemo } from '../../../../../lib/demo/reset'
import { DEMO_TENANT } from '../../../../../lib/demo/tenant'

// =====================================================================
//  `GET /cron/demo-reset` — 데모 테넌트를 지우고 다시 심는다 (SPEC §9 · §10.3 · §11)
//
//  ★ 부르는 것은 Vercel Cron 이다 (`apps/web/vercel.json` 의 `crons`). 매일
//    `DEMO_TENANT.resetAt`(KST) — Cron 표기는 UTC 라 `test/demo-reset.test.ts` 가
//    두 값이 같은 시각인지 센다.
//
//  🔴 **왜 GET 인가** — Vercel Cron 은 GET 으로만 부른다. 이 저장소의 라우트는 「GET 은
//     상태를 안 바꾼다」를 지키는데(`route.ts` 의 `SAFE_METHODS`), 이 문은 그 약속의 유일한
//     예외다. 그래서 `/cron/` 밑에 따로 산다 — 주체(`ctx.actor()`)가 아니라 `CRON_SECRET`
//     자물쇠로 잠기고, 게스트·기기·사람의 토큰으로는 열리지 않는다 (`requireCronSecret`).
//     ⚠ `/cron/` 밖에 GET 으로 상태를 바꾸는 문을 만들지 마라. 이 예외를 넓히면 게스트
//       읽기 전용의 근거가 사라진다.
//
//  ⚠ 응답은 **수**뿐이다 — 토큰·이름·이메일은 안 나간다 (Cron 로그는 사람이 못 보는 곳에
//    쌓이지 않는다).
//  ⚠ `maxDuration` — 시드는 라우트를 수십 번 부른다. 배포 DB 에서 10초 기본값을 넘길 수
//    있어서 올린다. 값의 정본과 이유(왜 300 · Fluid compute 전제 · 리전 서울)는 `lib/api/vercel.ts` 다 —
//    Next 는 리터럴만 읽어서 여기 숫자를 import 로 못 대신하고, 대신 시험(⑥)이 둘을 대조한다.
// =====================================================================

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export const GET = route('GET /cron/demo-reset', async (ctx) => {
  requireCronSecret(ctx.req)

  const { existed, seeded } = await resetDemo(ctx.now)
  ctx.note({ project_id: seeded.projectId })

  return ctx.ok({
    team_slug: DEMO_TENANT.teamSlug,
    existed,
    official_version: seeded.versions.official.semver,
    items: seeded.itemCount,
    members: seeded.memberCount,
    devices: seeded.deviceCount,
    reports: seeded.reportCount,
    progress: seeded.progressCount,
    proposals: seeded.proposalCount,
  })
})
