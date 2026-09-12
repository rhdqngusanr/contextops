import { and, asc, eq } from 'drizzle-orm'
import { Manifest } from '@contextops/schema'

import type { Db } from '../../db/client'
import { contextVersions, packFiles, projects } from '../../db/schema'
import { fail } from './error'
import { CACHE_CONTROL } from './respond'
import { zipBytes } from './zip'

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

/**
 * zip 안의 `.contextops/manifest.json` 경로. 플러그인 `sync` 가 쓰는 자리와 같다
 * (SPEC §8.2 · `plugin/contextops/src/cli/paths.ts` 의 `LOCAL_FILES.manifest`).
 * ⚠ 플러그인 코드를 여기서 import 할 수 없다 (의존 방향 `schema ← compiler ← web/plugin`).
 *   그래서 글자가 두 곳에 있다 — `test/api-pack-zip.test.ts` 가 둘이 같은지 센다.
 */
export const ZIP_MANIFEST_PATH = '.contextops/manifest.json'

/**
 * 손으로 풀어 적용한 기기(`manual`)가 `status` 로 판정받으려면 Manifest 도 같이 풀려야 한다
 * — 그래서 zip 에 `.contextops/manifest.json` 을 넣는다. 모양은 `sync` 가 쓰는 것과
 * **글자 그대로** 같다 (`JSON.stringify(manifest, null, 2)` + 개행). 다르면 같은 버전을
 * 플러그인으로 받은 기기와 zip 으로 받은 기기가 다른 manifest.json 을 갖는다.
 */
export function manifestJsonText(manifest: Manifest): string {
  //  🔴 계약으로 **한 번 되판 뒤** 적는다 — 키 순서를 스키마가 정하게.
  //  ★ 왜 — DB 의 jsonb 는 키를 제 순서(길이·알파벳)로 다시 늘어놓는다. 그 객체를 그대로
  //    적으면 플러그인이 쓰는 manifest.json(Zod 로 판 것 · 스키마 순서)과 **글자가 다르다.**
  //    같은 버전인데 zip 으로 받은 기기와 플러그인으로 받은 기기의 manifest.json 이 갈린다.
  //    시험이 실제로 그것을 잡았다 (`test/api-pack-zip.test.ts`).
  return `${JSON.stringify(Manifest.parse(manifest), null, 2)}\n`
}

/**
 * Pack 한 벌을 zip 바이트로 (SPEC §5 `GET …/packs/{semver}/zip`).
 *
 * ★ 같은 버전은 언제나 같은 바이트다 — 항목 시각은 Manifest 의 `generated_at` 이고
 *   순서는 `zipBytes` 가 경로순으로 정한다. 그래서 ETag 를 `manifest_hash` 로 둘 수 있다.
 * ★ 파일 수 상한을 여기서 따로 세지 않는다 — Manifest 계약(`files.max`)이 이미 막고,
 *   zip 은 압축 없이 이어 붙이는 것뿐이라 그 수에서 동기 생성이 무겁지 않다.
 */
export async function packZipOf(
  db: Db,
  projectId: string,
  version: ResolvedVersion,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const filename = await packZipName(db, projectId, version)
  return { bytes: await packZipBytes(db, version), filename }
}

/**
 * 저장될 **파일 이름**만 (`<slug>-v<semver>.zip`).
 *
 * 🔴 왜 갈랐나 (2026-09-12 · R2) — 응답이 304 인지 아닌지는 ETag 로 갈리는데, 그 판정에
 *    필요한 것은 이름뿐이다. 예전엔 이름과 바이트를 한 함수가 같이 냈고, 그래서 라우트가
 *    **304 로 끝날 요청에도 파일 수십 개를 먼저 이어 붙였다.** 게스트 토큰 하나로 CPU 와
 *    전송량을 증폭시킬 수 있는 자리였다 (인덱스가 있는 작은 질의 하나 ↔ 표 전체 읽기 + 조립).
 */
export async function packZipName(db: Db, projectId: string, version: ResolvedVersion): Promise<string> {
  const [project] = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) fail('NOT_FOUND', '프로젝트를 찾을 수 없다')
  return `${project.slug}-v${version.semver}.zip`
}

/** zip 바이트 — **비싼 쪽**이다. 304 가 아닐 때만 부른다 (`ctx.cached` 의 body). */
export async function packZipBytes(db: Db, version: ResolvedVersion): Promise<Uint8Array> {
  const rows = await db
    .select({ path: packFiles.path, text: packFiles.content })
    .from(packFiles)
    .where(eq(packFiles.versionId, version.id))
    .orderBy(asc(packFiles.path))

  return zipBytes(
    [...rows, { path: ZIP_MANIFEST_PATH, text: manifestJsonText(version.manifest) }],
    new Date(version.manifest.generated_at),
  )
}
