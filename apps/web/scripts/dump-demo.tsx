import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { POST as demoSession } from '../src/app/api/v1/demo/session/route'
import { GET as listItems } from '../src/app/api/v1/projects/[id]/context-items/route'
import { GET as listProposals } from '../src/app/api/v1/projects/[id]/proposals/route'
import { GET as roadmap } from '../src/app/api/v1/projects/[id]/roadmap/route'
import { GET as syncStatus } from '../src/app/api/v1/projects/[id]/sync-status/route'
import { POST as createDocument } from '../src/app/api/v1/projects/[id]/documents/route'
import { demoBannerText, DEMO_ENTRY_PATH } from '../src/lib/demo/tenant'
import type { DeviceSyncRow } from '../src/lib/web/queries'
import { seedDemo } from './demo-seed'
import { bodyOf, closeDb, dataOf, freshDb, params, req, TEST_JWT_SECRET } from '../test/helpers/db'

//  ⚠ `tsconfig.json` 의 `jsx` 는 Next 가 요구하는 `preserve` 라 tsx(esbuild)가 JSX 를
//    옛 방식(`React.createElement`)으로 바꾼다 — 전역에 꽂은 뒤에 불러온다
//    (`dump-sync.tsx` 와 같은 이유).
;(globalThis as { React?: unknown }).React = React
const { DeviceTable, SyncSummary } = await import('../src/components/sync')

// =====================================================================
//  🔴 **게스트가 실제로 보는 것을 글자로 뽑는다** (loop/PROMPT.md ④2)
//
//  ★ 앞선 덤프들(`dump-sync` 등)은 **손으로 만든 props** 를 그렸다. 이건 다르다 —
//    데모 테넌트를 진짜로 심고, `/demo/session` 이 낸 **진짜 게스트 토큰**으로
//    진짜 라우트를 불러서, 그 응답으로 화면을 그린다. 그래서 이 파일이 답하는 물음은
//    「컴포넌트가 예쁜가」가 아니라 **「심사위원이 링크를 열면 볼 것이 있는가」**다.
//
//  실행: pnpm --filter web exec tsx scripts/dump-demo.tsx
// =====================================================================

const NOW = new Date('2026-09-06T12:00:00.000Z')

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' | ')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/(\s*\|\s*)+/g, ' | ')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim()
}

function head(title: string): void {
  console.log('')
  console.log(`◆ ${title}`)
  console.log('─'.repeat(72))
}

async function main(): Promise<void> {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const { pg } = await freshDb()

  const seeded = await seedDemo(NOW)
  const session = await dataOf(await demoSession(req('POST', '/api/v1/demo/session'), params({})))
  const guest = session.access_token as string
  const id = seeded.projectId

  head('링크 하나로 들어오는 길')
  console.log(`  POST /demo/session → 201 · entry_path = ${session.entry_path as string}`)
  console.log(`  (상수 정본과 같은가: ${String(session.entry_path === DEMO_ENTRY_PATH)})`)
  console.log(`  토큰 payload 에 이메일이 있나: ${String(JSON.stringify(session).includes('@'))}`)

  head('앱 화면 맨 위 — 게스트 배너')
  console.log(`  ${demoBannerText()}`)

  head('화면 9(Sync) — 게스트 토큰으로 부른 진짜 응답')
  const sync = await dataOf(await syncStatus(
    req('GET', `/api/v1/projects/${id}/sync-status`, { auth: guest }), params({ id }),
  ))
  const devices = sync.devices as DeviceSyncRow[]
  console.log(`  ${text(renderToStaticMarkup(<SyncSummary devices={devices} />))}`)
  console.log('')
  for (const line of text(renderToStaticMarkup(
    <DeviceTable devices={devices} emptyMessage="아직 기기가 없습니다" now={NOW} />,
  )).split(' | 팀원 | ')) {
    console.log(`  ${line}`)
  }

  head('화면 8(Roadmap) — 마일스톤 행과 근거')
  const road = await dataOf(await roadmap(req('GET', `/api/v1/projects/${id}/roadmap`, { auth: guest }), params({ id })))
  console.log(`  공식 v${road.context_version as string}`)
  for (const m of road.milestones as {
    milestone: string
    status: string
    done_when: { text: string; evidence_count: number }[]
    confirmable: { summary: string } | null
  }[]) {
    console.log(`  ${m.milestone} · ${m.status}`)
    for (const c of m.done_when) console.log(`    - ${c.text} (근거 ${c.evidence_count})`)
    if (m.confirmable) console.log(`    [완료 확인 대기] ${m.confirmable.summary}`)
  }
  console.log(`  로드맵 외 ${String(road.off_roadmap_total)}건`)

  head('화면 6(제안) — 네 갈래가 다 서는가')
  const props = await dataOf(await listProposals(
    req('GET', `/api/v1/projects/${id}/proposals`, { auth: guest }), params({ id }),
  ))
  for (const p of props.proposals as { status: string; title: string; author?: { name: string } | null }[]) {
    console.log(`  [${p.status}] ${p.title} — ${p.author?.name ?? '작성자 없음'}`)
  }

  head('화면 5(Context) — 항목 수')
  const items = await dataOf(await listItems(
    req('GET', `/api/v1/projects/${id}/context-items?limit=100`, { auth: guest }), params({ id }),
  ))
  console.log(`  항목 ${(items.items as unknown[]).length}개 · 공식 v${seeded.versions.official.semver}`)

  head('🔴 게스트가 바꾸려 하면')
  const blocked = await createDocument(req('POST', `/api/v1/projects/${id}/documents`, {
    auth: guest, body: { title: '몰래 올린 문서', kind: 'goal', content: '이 줄은 저장되면 안 된다' },
  }), params({ id }))
  const envelope = await bodyOf(blocked)
  console.log(`  POST /documents → ${blocked.status} ${JSON.stringify((envelope.error as { code: string }).code)}`)
  console.log(`  서버가 하는 말: ${(envelope.error as { message: string }).message}`)

  await closeDb(pg)
}

await main()
