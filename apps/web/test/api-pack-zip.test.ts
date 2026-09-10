import type { PGlite } from '@electric-sql/pglite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Manifest } from '@contextops/schema'

import type { Db } from '../src/db/client'
import { contextItems } from '../src/db/schema'
import { POST as createTeam } from '../src/app/api/v1/teams/route'
import { POST as createProject } from '../src/app/api/v1/teams/[id]/projects/route'
import { POST as createRepo } from '../src/app/api/v1/projects/[id]/repos/route'
import { POST as batchDraft } from '../src/app/api/v1/projects/[id]/context-items/batch-draft/route'
import { PATCH as updateItem } from '../src/app/api/v1/projects/[id]/context-items/[itemId]/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { GET as semverManifest } from '../src/app/api/v1/projects/[id]/packs/[semver]/manifest/route'
import { GET as packZip } from '../src/app/api/v1/projects/[id]/packs/[semver]/zip/route'
import { manifestJsonText, ZIP_MANIFEST_PATH } from '../src/lib/api/pack'
import { crc32, dosDateTime, zipBytes } from '../src/lib/api/zip'
import { countReceived, SyncSummary } from '../src/components/sync'
import type { DeviceSyncRow } from '../src/lib/web/queries'
import { closeDb, dataOf, freshDb, params, req, sessionJwt, TEST_JWT_SECRET } from './helpers/db'
import { batchBody, draft } from './helpers/fixtures'
import { listZip } from './helpers/zip'

// =====================================================================
//  `GET /projects/{id}/packs/{semver}/zip` — Pack 한 벌을 손으로 받는 길 (SPEC §5 · §6 `manual`)
//
//  ★ 이 시험이 재는 것:
//    ① zip 을 **되읽으면** Manifest 의 파일 전부 + `.contextops/manifest.json` 이 있고,
//       본문의 sha256 이 Manifest 와 같다 — 플러그인으로 받은 것과 zip 으로 받은 것이 같다
//    ② 🔴 같은 버전을 두 번 받으면 **byte 가 같다** (P4 의 연장 — 시각·순서가 안 샌다)
//    ③ 머리: `application/zip` · 파일 이름은 서버가 정한다 · ETag=manifest_hash · 1년 캐시 · 304
//    ④ zip 안의 manifest.json 이 플러그인 `sync` 가 쓰는 것과 **글자 그대로** 같은 자리·모양이다
//  ⚠ 되읽는 코드는 `helpers/zip.ts` 다 — 쓰는 코드로 되읽으면 같은 오해를 공유한다.
// =====================================================================

let pg: PGlite | undefined
let db: Db

beforeEach(async () => {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
})

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

const root = join(fileURLToPath(import.meta.url), '..', '..', '..', '..')

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

let seedNo = 0

/** owner · 팀 · 프로젝트 · 항목 셋을 라우트로 만들고 v1.0.0 을 발행한다. */
async function published() {
  const n = ++seedNo
  const owner = sessionJwt(`zip-owner-${n}`)
  const team = await dataOf(await createTeam(
    req('POST', '/api/v1/teams', { auth: owner, body: { name: 'Paylab', slug: `paylab-zip-${n}` } }), params({}),
  ))
  const teamId = team.id as string
  const project = await dataOf(await createProject(
    req('POST', `/api/v1/teams/${teamId}/projects`, { auth: owner, body: { name: 'API', slug: `api-zip-${n}` } }),
    params({ id: teamId }),
  ))
  const projectId = project.id as string
  await createRepo(
    req('POST', `/api/v1/projects/${projectId}/repos`, { auth: owner, body: { name: 'paylab-api' } }),
    params({ id: projectId }),
  )
  await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
    auth: owner,
    body: batchBody([
      draft('item_mission_one', 'mission'),
      draft('item_policy_one', 'policy'),
      //  하위 경로 파일(`.claude/rules/domain-*.md`)이 하나는 있어야 zip 의 `/` 경로를 잰다.
      draft('item_policy_dom', 'policy', { scope: { kind: 'domain', value: 'billing' } }),
    ]),
  }), params({ id: projectId }))
  const rows = await db.select({ id: contextItems.publicId }).from(contextItems).where(eq(contextItems.projectId, projectId))
  for (const row of rows) {
    await updateItem(req('PATCH', `/api/v1/projects/${projectId}/context-items/${row.id}`, {
      auth: owner, body: { revision: 1, changes: { status: 'active' } },
    }), params({ id: projectId, itemId: row.id }))
  }
  const res = await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
    auth: owner, body: { semver: '1.0.0', base_version_id: null, change_summary: '첫 발행' },
  }), params({ id: projectId }))
  expect(res.status).toBe(201)
  return { owner, projectId, slug: `api-zip-${n}` }
}

async function getZip(owner: string, projectId: string, semver = '1.0.0', headers: Record<string, string> = {}) {
  return packZip(
    req('GET', `/api/v1/projects/${projectId}/packs/${semver}/zip`, { auth: owner, headers }),
    params({ id: projectId, semver }),
  )
}

describe('🔴 zip 을 되읽으면 플러그인이 받는 것과 같은 Pack 이다', () => {
  it('Manifest 의 파일 전부 + manifest.json 이 있고 본문 sha256 이 Manifest 와 같다', async () => {
    const { owner, projectId } = await published()
    const manifest = Manifest.parse(await dataOf(await semverManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/manifest`, { auth: owner }),
      params({ id: projectId, semver: '1.0.0' }),
    )))

    const res = await getZip(owner, projectId)
    expect(res.status).toBe(200)
    const entries = listZip(new Uint8Array(await res.arrayBuffer()))

    //  파일 수 = Manifest 의 파일 + manifest.json 하나. 더도 덜도 아니다.
    expect(entries.map((e) => e.path).sort()).toEqual([...manifest.files.map((f) => f.path), ZIP_MANIFEST_PATH].sort())
    //  하위 경로가 실제로 하나는 있다 — 없으면 이 검사가 `/` 를 안 잰 것이다.
    expect(entries.some((e) => e.path.includes('/') && e.path !== ZIP_MANIFEST_PATH)).toBe(true)

    for (const f of manifest.files) {
      const entry = entries.find((e) => e.path === f.path)
      expect(entry, f.path).toBeDefined()
      expect(sha256(entry!.text)).toBe(f.sha256)
      expect(entry!.crcOk).toBe(true)
      //  압축 없음(store) — 라이브러리 버전이 바이트를 바꿀 자리가 없다.
      expect(entry!.method).toBe(0)
    }

    //  🔴 manifest.json 은 **계약으로 되파싱**되고 해시가 같다 — 손으로 푼 기기가 `status` 로 판정받는 재료다.
    const inside = entries.find((e) => e.path === ZIP_MANIFEST_PATH)!
    expect(Manifest.parse(JSON.parse(inside.text)).manifest_hash).toBe(manifest.manifest_hash)
    expect(inside.text).toBe(manifestJsonText(manifest))
  })

  it('🔴 P4 — 같은 버전을 두 번 받으면 byte 가 같다 · 항목 시각은 generated_at 이다', async () => {
    const { owner, projectId } = await published()
    const a = new Uint8Array(await (await getZip(owner, projectId)).arrayBuffer())
    const b = new Uint8Array(await (await getZip(owner, projectId)).arrayBuffer())
    expect(a.length).toBeGreaterThan(22)
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)

    const manifest = Manifest.parse(await dataOf(await semverManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/manifest`, { auth: owner }),
      params({ id: projectId, semver: '1.0.0' }),
    )))
    const want = dosDateTime(new Date(manifest.generated_at))
    for (const e of listZip(a)) {
      expect({ date: e.date, time: e.time }).toEqual(want)
    }
    //  경로순이다 — 입력 순서가 바이트에 새지 않는다.
    const paths = listZip(a).map((e) => e.path)
    expect(paths).toEqual([...paths].sort())
  })

  it('머리 — application/zip · 서버가 정한 파일 이름 · ETag=manifest_hash · 불변 캐시 · 304', async () => {
    const { owner, projectId, slug } = await published()
    const res = await getZip(owner, projectId)
    expect(res.headers.get('content-type')).toBe('application/zip')
    expect(res.headers.get('content-disposition')).toBe(`attachment; filename="${slug}-v1.0.0.zip"`)
    expect(res.headers.get('cache-control')).toContain('immutable')
    expect(res.headers.get('x-request-id')).toBeTruthy()
    const bytes = await res.arrayBuffer()
    expect(res.headers.get('content-length')).toBe(String(bytes.byteLength))

    const manifest = Manifest.parse(await dataOf(await semverManifest(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/manifest`, { auth: owner }),
      params({ id: projectId, semver: '1.0.0' }),
    )))
    const etag = res.headers.get('etag')
    expect(etag).toBe(`"${manifest.manifest_hash}"`)

    const again = await getZip(owner, projectId, '1.0.0', { 'if-none-match': etag as string })
    expect(again.status).toBe(304)
    expect(await again.text()).toBe('')
  })

  it('없는 버전은 404 · semver 가 아니면 400 · 인증 없으면 401 · 남의 프로젝트는 404', async () => {
    const { owner, projectId } = await published()
    expect((await getZip(owner, projectId, '9.9.9')).status).toBe(404)
    expect((await getZip(owner, projectId, 'latest')).status).toBe(400)
    expect((await packZip(
      req('GET', `/api/v1/projects/${projectId}/packs/1.0.0/zip`), params({ id: projectId, semver: '1.0.0' }),
    )).status).toBe(401)
    expect((await getZip(sessionJwt('zip-stranger'), projectId)).status).toBe(404)
  })
})

describe('zip 인코더 — 규격의 고정값과 우리 규칙', () => {
  it('CRC-32 의 표준 검증값 (「123456789」 → cbf43926)', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926')
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it('MS-DOS 시각은 UTC · 2초 단위 · 1980 년 미만은 1980 으로', () => {
    expect(dosDateTime(new Date('2026-09-06T04:05:07Z'))).toEqual({
      date: ((2026 - 1980) << 9) | (9 << 5) | 6,
      time: (4 << 11) | (5 << 5) | 3,
    })
    expect(dosDateTime(new Date('1970-01-01T00:00:00Z')).date >> 9).toBe(0)
  })

  it('같은 경로가 둘이면 던진다 · 빈 목록도 규격에 맞는 zip 이다', () => {
    const at = new Date('2026-09-06T00:00:00Z')
    expect(() => zipBytes([{ path: 'a.md', text: '1' }, { path: 'a.md', text: '2' }], at)).toThrow(/같은 경로/)
    expect(listZip(zipBytes([], at))).toEqual([])
  })

  it('한글 경로도 그대로 돌아온다 (UTF-8 flag)', () => {
    const at = new Date('2026-09-06T00:00:00Z')
    const entries = listZip(zipBytes([{ path: '.claude/rules/도메인-결제.md', text: '# 결제\n' }], at))
    expect(entries[0]?.path).toBe('.claude/rules/도메인-결제.md')
    expect(entries[0]?.text).toBe('# 결제\n')
    expect(entries[0]?.crcOk).toBe(true)
  })
})

describe('zip 안의 manifest.json 자리는 플러그인 sync 가 쓰는 자리와 같다', () => {
  it('`ZIP_MANIFEST_PATH` 가 SPEC §8.2 · plugin `LOCAL_FILES.manifest` 와 같다', () => {
    //  플러그인 안쪽을 import 하지 않는다 (공개 API 는 index 하나 · CLAUDE.md) — 글자로 잰다.
    const paths = readFileSync(join(root, 'plugin', 'contextops', 'src', 'cli', 'paths.ts'), 'utf8')
    expect(paths).toContain("LOCAL_DIR = '.contextops'")
    expect(paths).toContain('manifest: `${LOCAL_DIR}/manifest.json`')
    expect(ZIP_MANIFEST_PATH).toBe('.contextops/manifest.json')

    const spec = readFileSync(join(root, 'docs', 'SPEC.md'), 'utf8')
    expect(spec).toContain('<repo>/.contextops/manifest.json')
    //  모양도 같다 — `sync.ts` 가 쓰는 줄과 글자 그대로.
    const sync = readFileSync(join(root, 'plugin', 'contextops', 'src', 'cli', 'sync.ts'), 'utf8')
    expect(sync).toContain('`${JSON.stringify(official, null, 2)}\\n`')
  })
})

describe('화면 7 — [Pack 다운로드 (.zip)] · 이 Pack 을 받은 기기', () => {
  const page = readFileSync(
    join(root, 'apps', 'web', 'src', 'app', 't', '[team]', 'p', '[project]', 'packs', '[semver]', 'page.tsx'), 'utf8',
  )

  it('버튼이 실제 문(`downloadPackZip`)을 부르고, 「아직 없다」 주석이 남아 있지 않다', () => {
    expect(page).toContain('downloadPackZip(')
    expect(page).toContain('Pack 다운로드 (.zip)')
    expect(page).not.toContain('버튼은 아직 없다')
    //  `<a href>` 로 걸지 않는다 — 세션 토큰은 머리로만 나간다.
    expect(page).not.toMatch(/href=\{?["'`][^"'`]*\/zip/)
  })

  it('지금 보는 판이 공식인지 옛 판인지 말한다 — 목록과 같은 문(fetchVersions)을 읽는다', () => {
    //  목록에는 「공식」 칩이 있는데 상세로 들어오면 사라져서, v1.0.0 을 열어도 화면이 똑같이 생겼다 (2026-09-11).
    expect(page).toContain('fetchVersions(')
    expect(page).toContain('official={official === semver}')
    expect(page).toContain('지금 팀의 공식 판입니다')
    expect(page).toContain('옛 판입니다')
    //  못 읽었거나 공식 판이 없으면 아무 말도 안 한다 — 지어내지 않는다.
    expect(page).toContain("typeof official === 'string'")
  })

  it('「받았다」는 manifest_hash 하나로 센다 — 상태가 아니다', () => {
    const hash = 'a'.repeat(64)
    const row = (over: Partial<DeviceSyncRow>): DeviceSyncRow => ({
      device_id: '00000000-0000-4000-8000-000000000001', device_name: 'd', user: { id: 'u', name: '팀원' },
      status: 'applied', version: '1.0.0', manifest_hash: hash, reported_at: '2026-09-06T00:00:00Z', ...over,
    })
    const devices = [
      row({}),
      row({ status: 'modified' }),
      row({ status: 'manual' }),
      row({ status: 'outdated', manifest_hash: 'b'.repeat(64) }),
      row({ status: 'unknown', manifest_hash: null, version: null, reported_at: null }),
    ]
    expect(countReceived(devices, hash)).toBe(3)
    expect(countReceived(devices, 'c'.repeat(64))).toBe(0)
    //  화면 9 의 요약과 같은 표에서 왔다 — 둘이 다른 수를 말하지 않는다.
    const html = renderToStaticMarkup(createElement(SyncSummary, { devices }))
    //  사실 한 줄은 수를 `<b>` 로 굵게 싸므로 태그를 벗기고 견준다 (2026-09-11 · 칩 줄을 걷어 냈다).
    expect(html.replace(/<[^>]+>/g, '')).toContain('기기 5대')
  })
})
