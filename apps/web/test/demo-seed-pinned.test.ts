import type { PGlite } from '@electric-sql/pglite'
import { afterEach, describe, expect, it } from 'vitest'

import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { seedPaylab } from '../src/lib/demo/seed'
import { closeDb, dataOf, freshDb, params, req, TEST_JWT_SECRET } from './helpers/db'
import { PINNED_EPOCH, pinDbDefaults, pinSeededClocks } from './helpers/pin'

// =====================================================================
//  🔴 **같은 씨앗 → 같은 `manifest_hash`** (FINDINGS 161 · P4 를 제품 수준에서)
//
//  ★ 무엇을 잠그나 — 관통이 찍는 캡처 두 장이 매 바퀴 달라졌고, 108바퀴가 픽셀로 재서
//    원인을 확정했다: **DB 가 만드는 값 둘**이다. 문서 버전 uuid 가 Pack 의 모든 줄
//    태그에 실려 `manifest_hash` 를 흔들고, `published_at` 이 표에 그대로 찍힌다.
//    `test/helpers/pin.ts` 가 그 둘을 결정론으로 바꾼다 — 이 시험이 **실제로 갈리는지**
//    잰다 (④2-B ② 「값을 바꾸면 결과가 달라지나」의 반대 방향이다).
//
//  ⚠ **박은 쪽과 안 박은 쪽을 둘 다 잰다.** 「박으면 같다」만 재면, `pinDbDefaults` 가
//    아무 일도 안 하게 되는 날(칸 이름이 바뀌거나 기본값 모양이 달라지는 날) 이 시험은
//    여전히 초록이다 — 안 박으면 **달라야** 한다는 것이 이 검사의 절반이다.
// =====================================================================

let pg: PGlite | undefined

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

/** 씨앗을 한 번 심고 v1.0.0 을 발행해서 「해시와 발행 시각」을 낸다. */
async function seedAndPublish(pin: boolean): Promise<{ hash: string; publishedAt: string; docId: string }> {
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const fresh = await freshDb()
  pg = fresh.pg
  if (pin) {
    const columns = await pinDbDefaults(fresh.pg)
    //  ⚠ 0칸이면 조용히 아무것도 안 한 것이다 — 그 상태로 아래가 초록이면 거짓말이다.
    expect(columns).toBeGreaterThan(0)
  }
  const seed = await seedPaylab('pin-owner')
  const version = await dataOf(await publish(
    req('POST', `/api/v1/projects/${seed.projectId}/versions/publish`, {
      auth: seed.owner, body: { semver: '1.0.0', base_version_id: null, change_summary: '첫 정본' },
    }),
    params({ id: seed.projectId }),
  ))
  if (pin) {
    //  ⚠ 발행 시각은 라우트가 준 값이라 기본값 고정으로는 안 잡힌다 — 심은 **뒤에** 되돌린다.
    expect(await pinSeededClocks(fresh.pg)).toBeGreaterThan(0)
  }
  const [row] = (await fresh.pg.query<{ published_at: string }>(
    'select published_at from context_versions where id = $1', [version.id as string],
  )).rows
  return {
    hash: version.manifest_hash as string,
    publishedAt: new Date(row!.published_at).toISOString(),
    docId: seed.goals.versionId,
  }
}

describe('고정 씨앗', () => {
  it('박으면 두 번 심어도 manifest_hash · 발행 시각 · 문서 버전 id 가 같다', async () => {
    const first = await seedAndPublish(true)
    await closeDb(pg)
    pg = undefined
    const second = await seedAndPublish(true)

    expect(second.hash).toBe(first.hash)
    expect(second.docId).toBe(first.docId)
    expect(second.publishedAt).toBe(first.publishedAt)
    //  발행 시각은 **고정 기준 시각 위**에 있다 (계수 시계라 같지는 않고 ms 만 앞선다).
    expect(Date.parse(second.publishedAt)).toBeGreaterThanOrEqual(Date.parse(PINNED_EPOCH))
    expect(Date.parse(second.publishedAt) - Date.parse(PINNED_EPOCH)).toBeLessThan(60_000)
  })

  it('안 박으면 달라진다 — 이 자가 진짜로 무언가를 하고 있다', async () => {
    const first = await seedAndPublish(false)
    await closeDb(pg)
    pg = undefined
    const second = await seedAndPublish(false)

    expect(second.docId).not.toBe(first.docId)
    expect(second.hash).not.toBe(first.hash)
  })
})
