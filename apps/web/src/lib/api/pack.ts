import { and, eq } from 'drizzle-orm'
import type { Manifest } from '@contextops/schema'

import type { Db } from '../../db/client'
import { contextVersions, projects } from '../../db/schema'
import { fail } from './error'
import { CACHE_CONTROL } from './respond'

// =====================================================================
//  발행된 Pack 을 꺼내는 자리 (SPEC §5 packs 세 줄)
//
//  ★ `latest` 와 `{semver}` 는 **캐시 규칙이 정반대**다:
//    - `latest` 는 가리키는 대상이 발행마다 바뀐다 → `no-cache` · ETag 로만 아낀다
//    - `{semver}` 는 불변이다 → 1년 캐시
//    그 둘을 고르는 자리가 여기 하나여서, 라우트는 어느 쪽인지만 말한다.
//    ⚠ 숫자는 `respond.ts` 의 `CACHE_CONTROL` 표가 정본이다 — 여기 적지 마라.
// =====================================================================

export type ResolvedVersion = {
  id: string
  semver: string
  manifest: Manifest
  cacheControl: string
}

/** 지금의 공식 버전 (`projects.official_version_id`). 발행 전이면 404. */
export async function latestVersion(db: Db, projectId: string): Promise<ResolvedVersion> {
  const [row] = await db
    .select({ id: contextVersions.id, semver: contextVersions.semver, manifest: contextVersions.manifest })
    .from(projects)
    .innerJoin(contextVersions, eq(contextVersions.id, projects.officialVersionId))
    .where(eq(projects.id, projectId))
    .limit(1)
  //  ⚠ 「아직 한 번도 발행하지 않았다」와 「그런 프로젝트가 없다」를 같은 404 로 둔다.
  //    권한은 이미 위에서 봤고, 둘을 구별해 줄 이유가 없다.
  if (!row) fail('NOT_FOUND', '아직 발행된 버전이 없다')
  return { ...row, cacheControl: CACHE_CONTROL.mutable }
}

/** 특정 버전. 불변이라 오래 캐시한다. */
export async function versionBySemver(db: Db, projectId: string, semver: string): Promise<ResolvedVersion> {
  const [row] = await db
    .select({ id: contextVersions.id, semver: contextVersions.semver, manifest: contextVersions.manifest })
    .from(contextVersions)
    .where(and(eq(contextVersions.projectId, projectId), eq(contextVersions.semver, semver)))
    .limit(1)
  if (!row) fail('NOT_FOUND', '그런 버전이 없다')
  return { ...row, cacheControl: CACHE_CONTROL.immutable }
}
