import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { and, eq } from 'drizzle-orm'

import { conflicts, contextItemRevisions, contextItems, packFiles } from '../src/db/schema'
import { conflictRow } from '../src/lib/api/conflict'
import { POST as batchDraft } from '../src/app/api/v1/projects/[id]/context-items/batch-draft/route'
import { PATCH as updateItem } from '../src/app/api/v1/projects/[id]/context-items/[itemId]/route'
import { POST as resolveConflict } from '../src/app/api/v1/conflicts/[id]/resolve/route'
import { POST as publish } from '../src/app/api/v1/projects/[id]/versions/publish/route'
import { closeDb, dataOf, freshDb, params, req, TEST_JWT_SECRET } from '../test/helpers/db'
import { seedPaylab } from '../src/lib/demo/seed'

// =====================================================================
//  「충돌을 결정하면 진 항목이 Pack 에서 빠진다」를 **글자로** 뽑는다 (FINDINGS 71)
//    loop/PROMPT.md ④2 「산출물을 눈으로 읽는다」의 재료다.
//
//  ★ 왜 시험이 아니라 이것도 있나 — 시험은 「그 문자열이 없다」까지만 말한다.
//    **남은 줄이 사람이 읽어서 말이 되는가**(폐기된 규칙만 빠지고 나머지는 멀쩡한가)는
//    눈으로 봐야 보인다. 관통은 §7.2 를 안 지나므로(키가 없다) 여기서 대신 지난다.
//
//  실행: pnpm --filter web exec tsx scripts/dump-resolve-effect.ts
//  결과: docs/evidence/2026-09-04-resolve-effect/pack-before-after.txt
// =====================================================================

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const out = join(root, 'docs', 'evidence', '2026-09-04-resolve-effect')

type PackFile = { path: string; content: string; versionId: string }

const lines: string[] = []
function say(text = ''): void {
  lines.push(text)
  console.log(text)
}

/** Pack 전체에서 한 낱말이 들어간 줄만 뽑는다 — 파일 이름과 같이 낸다. */
function grep(files: PackFile[], word: string): string[] {
  return files.flatMap((f) => f.content.split('\n')
    .filter((l) => l.includes(word))
    .map((l) => `  ${f.path} │ ${l.trim()}`))
}

process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
const { pg, db } = await freshDb()

try {
  const { owner, projectId } = await seedPaylab('resolve-effect')

  //  SPEC §10.1 의 어긋남 그대로다 — 문서는 「지수 백오프 5회」, 코드는 「고정 간격 3회」.
  //  §7.2 가 찾을 것을 여기서는 손으로 넣는다 (API 키가 없다).
  const added = await dataOf(await batchDraft(req('POST', `/api/v1/projects/${projectId}/context-items/batch-draft`, {
    auth: owner,
    body: {
      items: [{
        id: 'item_policy_retry_code',
        type: 'policy',
        title: '재시도는 고정 간격 3회',
        body: '코드가 실제로 하는 일이다.',
        scope: { kind: 'project' },
        priority: 60,
        source_refs: [{ kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts', start_line: 14 }],
        tags: ['payment'],
        confidence: 'high',
        data: { rule: 'PSP 호출 실패는 1초 간격으로 3회 재시도한다', severity: 'must', enforcement: 'hook' },
      }],
      repo: 'paylab-api',
      scan_summary: { file_count: 42, languages: ['ts'] },
    },
  }), params({ id: projectId })))
  if ((added.rejected as unknown[]).length > 0) throw new Error(JSON.stringify(added.rejected))

  await updateItem(req('PATCH', `/api/v1/projects/${projectId}/context-items/item_policy_retry_code`, {
    auth: owner, body: { revision: 1, changes: { status: 'active' } },
  }), params({ id: projectId, itemId: 'item_policy_retry_code' }))

  const [row] = await db.insert(conflicts).values(conflictRow({
    projectId,
    kind: 'contradiction',
    aItemId: 'item_policy_retry',
    bItemId: 'item_policy_retry_code',
    question: '재시도는 지수 백오프 5회인가, 고정 간격 3회인가?',
    severity: 'high',
  })).returning({ id: conflicts.id })
  const conflictId = row!.id

  async function packOf(semver: string, base: string | null): Promise<PackFile[]> {
    const version = await dataOf(await publish(req('POST', `/api/v1/projects/${projectId}/versions/publish`, {
      auth: owner, body: { semver, base_version_id: base, change_summary: semver },
    }), params({ id: projectId })))
    const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id as string))
    return files.map((f) => ({ path: f.path, content: f.content, versionId: version.id as string }))
  }

  say('=== 충돌을 결정하면 진 항목이 Pack 에서 빠진다 (FINDINGS 71) ===')
  say(`충돌 ${conflictId}`)
  say('  A item_policy_retry       — PSP 호출 실패는 지수 백오프로 최대 5회 재시도한다')
  say('  B item_policy_retry_code  — PSP 호출 실패는 1초 간격으로 3회 재시도한다')
  say()

  const before = await packOf('1.0.0', null)
  say('── 결정 전 · v1.0.0 의 재시도 줄 ──────────────────────────────')
  for (const l of grep(before, '재시도')) say(l)
  say()

  const resolved = await dataOf(await resolveConflict(
    req('POST', `/api/v1/conflicts/${conflictId}/resolve`, {
      auth: owner, body: { choice: 'a', note: '문서 쪽이 맞다 — 코드를 고친다' },
    }),
    params({ id: conflictId }),
  ))
  say(`── 결정: choice=${(resolved.resolution as { choice: string }).choice} · 충돌 status=${resolved.status} ──`)
  say()

  const after = await packOf('1.1.0', before[0]!.versionId)
  say('── 결정 후 · v1.1.0 의 재시도 줄 ──────────────────────────────')
  for (const l of grep(after, '재시도')) say(l)
  say()

  const [item] = await db
    .select({ uuid: contextItems.id, status: contextItems.status, revision: contextItems.currentRevision })
    .from(contextItems)
    .where(and(eq(contextItems.projectId, projectId), eq(contextItems.publicId, 'item_policy_retry_code')))
  const [rev] = await db
    .select()
    .from(contextItemRevisions)
    .where(and(eq(contextItemRevisions.itemId, item!.uuid), eq(contextItemRevisions.revision, item!.revision)))

  say('── 진 항목 item_policy_retry_code 의 지금 모습 ────────────────')
  say(`  status=${item!.status} · revision=${item!.revision}`)
  say(`  개정 ${rev!.revision} · origin=${rev!.origin} · created_by=${rev!.createdBy === null ? 'null' : '있다'}`)
  say('  근거:')
  for (const r of rev!.sourceRefs) say(`    ${JSON.stringify(r)}`)
  say()
  say('  ⚠ 「왜 폐기했나」는 근거의 충돌 id 로 간다 — 그 행에 질문·선택·사람·시각이 있다.')

  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'pack-before-after.txt'), lines.join('\n') + '\n', 'utf8')
  console.log(`\n  → ${join(out, 'pack-before-after.txt')}`)
} finally {
  await closeDb(pg)
}
