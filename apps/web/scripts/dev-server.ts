import { createServer } from 'node:http'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { seedDemo } from './demo-seed'
import { seedPaylab } from './seed'
import { closeDb, dataOf, freshDb, params, req, TEST_JWT_SECRET } from '../test/helpers/db'

// =====================================================================
//  🔴 **화면을 눈으로 보기 위한 개발용 씨앗 서버** (loop/PROMPT.md ⑦3층 · GATE 1)
//
//    pnpm --filter web dev:db
//
//  ★ 왜 필요한가 — 화면 5·7 은 **데이터가 있어야** 판정할 수 있다. Supabase 는 사람이
//    만들어야 하고(docs/STATUS.md 「막힌 것」), 그때까지 화면을 못 보면 「빌드는 초록인데
//    아무도 본 적 없는 화면」이 쌓인다. 그게 이 저장소가 제일 경계하는 상태다.
//
//  ★ 무엇을 하나 — 셋이다. 셋 다 **제품 코드를 한 줄도 안 고치고** 한다:
//    ① PGlite 를 띄우고 마이그레이션을 먹인 뒤 **TCP 로 노출**한다 (pglite-socket).
//       그래서 Next 는 평소처럼 `DATABASE_URL` 로 postgres-js 를 쓴다 — 배포와 같은 길이다.
//       ⚠ `setDbForTest` 를 배포 코드에 끌어들이지 않는 것이 요점이다.
//    ② paylab 씨앗을 심고 v1.0.0 을 발행한다 (씨앗의 정본은 `scripts/seed.ts` 하나)
//    ③ 세션 JWT 를 하나 찍어 준다. `SUPABASE_JWT_SECRET` 만 맞으면 **진짜 인증 경로**를
//       그대로 지난다 — 인증을 우회하는 문을 만들지 않는다. 그 문은 배포에도 남는다.
//
//  🔴 **배포용이 아니다.** `scripts/` 는 제품에 안 들어가고 `pglite-socket` 은 devDependency 다.
//  ⚠ 프로세스를 끄면 DB 가 사라진다. 메모리 위의 Postgres 라서 그게 맞다 — 개발용 상태가
//    디스크에 남으면 다음 사람이 「왜 내 화면에 남의 데이터가 있지」로 시작한다.
// =====================================================================

const DB_PORT = Number(process.env.DEV_DB_PORT ?? 55432)
const INFO_PORT = Number(process.env.DEV_INFO_PORT ?? 55433)

/** e2e·캡처 스크립트가 「무엇으로 로그인하고 어디로 가나」를 물어보는 모양. */
export type SeededDemo = {
  team_slug: string
  project_slug: string
  project_id: string
  semver: string
  access_token: string
  item_count: number
}

/**
 * 🔴 **게스트 데모 테넌트도 같이 심을까** (`DEV_SEED=demo`).
 *
 * ★ 왜 스위치 하나인가 — 데모 테넌트는 paylab 씨앗의 **위**에 얹히는 것이라(팀원·기기·
 *   보고·제안), 서버를 하나 더 만들면 두 하네스가 같은 소켓·같은 포트 코드를 베끼게 된다.
 * ⚠ 켜면 그만큼 느리다 (라우트를 수십 번 더 부른다). 화면 5·7 만 볼 때는 끄고 쓴다.
 */
const SEED_DEMO = process.env.DEV_SEED === 'demo'

async function main(): Promise<void> {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const { pg } = await freshDb()

  //  ⚠ 데모 테넌트는 **자기 팀**(slug `demo`)에 앉는다 — 아래 paylab 씨앗과 안 겹친다.
  //    그래서 한 DB 에서 「로그인한 팀」과 「게스트가 보는 팀」을 나란히 볼 수 있다.
  const demo = SEED_DEMO ? await seedDemo() : undefined

  const seed = await seedPaylab('dev-owner')
  //  화면 5 의 「버전 히스토리」와 화면 7 이 **볼 것이 있어야** 판정이 된다.
  const version = await dataOf(await publish(req('POST', `/api/v1/projects/${seed.projectId}/versions/publish`, {
    auth: seed.owner, body: { semver: '1.0.0', base_version_id: null, change_summary: '첫 정본' },
  }), params({ id: seed.projectId })))

  const info: SeededDemo = {
    team_slug: seed.teamSlug,
    project_slug: seed.projectSlug,
    project_id: seed.projectId,
    semver: version.semver as string,
    access_token: seed.owner,
    item_count: seed.itemUuids.length,
  }

  const socket = new PGLiteSocketServer({ db: pg, port: DB_PORT, host: '127.0.0.1' })
  await socket.start()

  //  ⚠ 이 프로세스가 살아 있어야 DB 가 산다. 붙잡아 두는 김에 **다른 프로세스가
  //    물어볼 수 있는 문**을 연다 — 토큰을 로그에서 긁어 가지 않게.
  createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(info))
  }).listen(INFO_PORT, '127.0.0.1')

  const base = `/t/${info.team_slug}/p/${info.project_slug}`
  console.log('')
  console.log('=== 개발용 씨앗 DB 가 떴다 (배포용 아님) ===')
  //  🔴 `?max=1` 이 꼭 있어야 한다. pglite-socket 은 연결을 **한 번에 하나씩** 처리하고,
  //     postgres-js 는 기본이 풀 10개다. 화면 5 처럼 두 요청이 동시에 나가면 둘째가
  //     큐에서 굶다가 30초 뒤 500 이 된다 — 눈으로 확인했다 (.ci/shots/s5-context.png 첫 판:
  //     항목은 떴는데 버전 히스토리만 영원히 skeleton).
  //     ⚠ 제품 코드가 아니라 **이 개발용 하네스의 한계**다. 배포의 Supabase 는 풀을 받는다.
  console.log(`  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?max=1`)
  console.log(`  SUPABASE_JWT_SECRET=${TEST_JWT_SECRET}`)
  console.log(`  씨앗 정보  : http://127.0.0.1:${INFO_PORT}`)
  console.log('')
  //  ⚠ 화면 3 은 씨앗이 없어도 열린다 — 「아직 올린 문서가 없습니다」가 그 화면의 empty 다.
  //    ⚠ **키가 없으면** 붙여넣기 뒤의 job 은 `failed`(`INTERNAL`)로 끝난다. 그것도 눈으로
  //      볼 것이다 — 실패 화면이 「몇 걸음에서 멈췄나」를 말하는지 보는 자리다.
  console.log(`  화면 3     : ${base}/import`)
  console.log(`  화면 5     : ${base}/context   (항목 ${info.item_count}개 · 공식 v${info.semver})`)
  console.log(`  화면 7     : ${base}/packs/${info.semver}`)
  if (demo) {
    console.log('')
    console.log(`  게스트 데모: /demo   → ${demo.teamSlug}/${demo.projectSlug} `
      + `(기기 ${demo.deviceCount} · 제안 ${demo.proposalCount} · 공식 v${demo.versions.official.semver})`)
    console.log('             ⚠ 시크릿 창에서 열어라 — 로그인 세션이 있으면 배너가 안 뜬다')
  } else {
    console.log('  게스트 데모: DEV_SEED=demo 로 다시 띄우면 /demo 가 열린다')
  }
  console.log('')
  console.log('  브라우저에 세션을 심는 길은 **진짜 로그인 경로**다:')
  console.log(`    /auth/callback?next=${encodeURIComponent(`${base}/context`)}#access_token=<토큰>&expires_in=3600`)
  console.log('')

  //  🔴 클라이언트(Next)가 갑자기 죽으면 소켓이 ECONNRESET 을 던지고, 그게 잡히지 않으면
  //     **이 프로세스가 통째로 죽는다.** 그러면 DB 가 사라지고, 다음 캡처는 화면에
  //     「그런 프로젝트를 찾을 수 없습니다」를 조용히 띄운다 — 원인을 화면에서 알 수 없다.
  //     실제로 그렇게 한 번 헤맸다. 개발용 서버는 붙었다 떨어지는 것을 견뎌야 한다.
  process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') return
    console.error('dev-server:', err.name)
    process.exit(1)
  })

  const stop = async (): Promise<void> => {
    await socket.stop()
    await closeDb(pg)
    process.exit(0)
  }
  process.on('SIGINT', () => void stop())
  process.on('SIGTERM', () => void stop())
}

await main()
