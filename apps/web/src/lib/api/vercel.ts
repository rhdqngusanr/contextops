// =====================================================================
//  apps/web/src/lib/api/vercel.ts — 배포(Vercel) 한도의 **정본 표** (docs/DEPLOY.md · SPEC §1.2 · §11)
//
//  🔴 왜 파일 하나인가 — 이 값들은 세 곳에 흩어질 운명이었다: `vercel.json`(리전) ·
//     라우트 파일의 `export const maxDuration`(Next 는 **리터럴만** 읽어서 import 를 못 쓴다) ·
//     문서. 흩어지면 하나만 고쳐지고, 고장은 배포 첫날에 난다. 그래서 값은 여기 하나에 두고
//     나머지 자리는 **시험이 이 표와 대조**한다 (`test/demo-reset.test.ts` ⑥).
//
//  ★ 값을 바꾸는 절차: ① 여기 ② `vercel.json` 의 `regions` ③ `LONG_RUNNING_ROUTES` 의 각
//    route.ts 리터럴 — ②③을 빠뜨리면 시험이 빨개진다. 문서(DEPLOY.md)는 숫자를 들지 않는다.
//
//  2026-09-09 감사에서 생겼다: health cron 이 6시간 주기(Hobby 는 하루 1회가 상한 → 첫 배포 거부),
//  리전 미지정(iad1 → 서울 DB 왕복), maxDuration 60(구조화 job 이 중간에 죽는 값) 셋이 한꺼번에 있었다.
//
//  🔴 **`vercel.json` 에는 주석을 넣을 수 없다** (2026-09-10 · Vercel Import 가 `should NOT have additional
//     property _comment` 로 프로젝트 생성 자체를 거부했다). 그 파일이 하던 말은 전부 여기 있다 —
//     `test/demo-reset.test.ts` ⑥ 이 그 파일의 최상위 키가 Vercel 이 아는 것뿐인지 잰다.
//   · Root Directory 는 `apps/web` — vercel.json 은 그 자리에서만 읽힌다.
//   · `regions`: 서울 icn1 한 곳 (아래 FUNCTION_REGION · Hobby 는 리전 하나).
//   · `crons` 의 시각은 UTC 다. demo-reset 18:00 UTC = 03:00 KST — 그 셈의 정본은 `lib/demo/tenant.ts` 의
//     `DEMO_TENANT.resetAt`·`resetUtcOffsetHours` 이고 시험이 두 파일이 같은 시각인지 센다. health 는 21:00 UTC
//     (06:00 KST · SPEC §11 「Supabase pause 방지」) — 두 문이 하루 두 번 DB 를 깨운다.
//   · 모든 cron 은 **하루 1회 이하** — Hobby 는 더 잦은 표현식을 배포 단계에서 거부한다. 정각이 아니라 그 시간 안
//     임의 분에 돈다(최대 59분 늦음) — 배너가 「03:00」이라고 못 박지 않는 이유다.
//   · Cron 은 `CRON_SECRET` 이 있으면 `Authorization: Bearer <값>` 을 붙여 GET 으로 부른다 (`lib/api/cron.ts`).
//     그 변수가 없으면 demo-reset 은 401 이다 — 의도다.
// =====================================================================

/**
 * 함수가 도는 리전. Supabase 프로젝트(ap-northeast-2 · 서울)와 같은 도시다 — 데모 리셋은 DB 를
 * 수백 번 왕복하므로 워싱턴(기본 iad1)에서 돌면 상한을 넘긴다. Hobby 는 리전 하나만 허용한다.
 */
export const FUNCTION_REGION = 'icn1'

/**
 * 오래 도는 문의 `maxDuration`(초).
 * ★ 왜 300 인가 — Fluid compute(새 프로젝트 기본 켜짐) 위의 Hobby 는 기본·최대가 300 이다.
 *   ⚠ Fluid 가 꺼진 프로젝트의 Hobby 상한은 60 이라 300 이면 배포가 거부된다 — 배포 전
 *     Project Settings → Functions 에서 Fluid compute 가 켜져 있는지 본다 (docs/DEPLOY.md 걸음 ②).
 * ★ 왜 60 이 아닌가 — 구조화 job 은 응답 뒤 `after()` 안에서 조각 최대 12개 × 20~47초를 돈다
 *   (`lib/ai/job.ts` 의 `startJob`). 60 이면 큰 문서는 늘 중간에 죽고 job 은 영원히 `running` 이다.
 */
export const FUNCTION_MAX_DURATION_SEC = 300

/**
 * `maxDuration` 을 올려야 하는 문 — 응답 뒤에 일하거나(`startJob()` 의 `after()`) DB 를 수백 번
 * 두드리는 것. 경로는 `src/app/` 아래 폴더 그대로다.
 * ★ 새 문이 `startJob()` 을 부르게 되면 여기 한 줄 + 그 route.ts 에 `export const maxDuration = 300`
 *   한 줄 — 둘 중 하나만 하면 시험(⑥)이 「표에 없는 호출부」 또는 「리터럴 없음」으로 빨개진다.
 */
export const LONG_RUNNING_ROUTES = [
  'api/v1/cron/demo-reset',
  'api/v1/projects/[id]/documents',
  'api/v1/projects/[id]/context-items/batch-draft',
  'api/v1/projects/[id]/jobs/[jobId]/retry',
] as const
