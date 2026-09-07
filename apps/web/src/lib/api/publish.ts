import { and, asc, eq, isNull } from 'drizzle-orm'
import { COMPILER_VERSION, CompileError, TEMPLATE_VERSION, compile, type CompileErrorCode, type Snapshot } from '@contextops/compiler'
import { parseContextItemDraft, SOURCE_REFS_MAX } from '@contextops/schema'
import type { ContextItem, ContextItemDraft, ErrorCode, Proposal, PublishVersion, SourceRef } from '@contextops/schema'

import type { Db } from '../../db/client'
import { contextItemRevisions, contextItems, contextVersions, packFiles, projects, proposals } from '../../db/schema'
import type { Actor } from './auth'
import { fail } from './error'
import { appendSourceRef, CURRENT_REVISION_JOIN, ITEM_COLUMNS, ITEM_OWNER_JOIN, itemOwners, toContextItem } from './item'

// =====================================================================
//  🔴 발행 트랜잭션 — 정본은 docs/SPEC.md §2.1. 여덟 단계가 **이 파일 하나**에 있다.
//
//  ★ 왜 라우트가 아니라 여기인가 — 여덟 단계 중 하나라도 트랜잭션 밖으로 새면
//    「실패하면 전부 롤백」이 거짓이 되고, 그 프로젝트는 **중간 상태로 남아서 못 쓴다.**
//    라우트에 흩어 놓으면 나중에 「여기 한 줄만 밖에서」가 반드시 생긴다.
//
//  🔴 **이 함수 안에 LLM 이 없다 (P4).** 승인 이후의 파이프라인은 컴파일러 하나이고,
//    컴파일러는 순수 함수다. 같은 snapshot → byte-identical Pack.
//    ⚠ `generated_at` 은 **여기서 만들어 컴파일러에 넘긴다.** 컴파일러가 시각을 읽으면
//      같은 snapshot 이 매번 다른 Manifest 를 내고 재현 주장이 무너진다.
// =====================================================================

export type PublishedVersion = {
  id: string
  semver: string
  snapshot_hash: string
  manifest_hash: string
  file_count: number
  published_at: string
  applied_proposal_ids: string[]
}

/** 제안 하나가 실패했을 때 에러 details 로 나가는 모양 (SPEC §2.1 8단계). */
type ItemFailure = { proposal_id: string; item_id: string | undefined; reason: string }

/**
 * 🔴 **컴파일 실패 중 「사람 잘못」인 것의 정본 표.** 나머지는 전부 500 이다.
 *
 * ★ 왜 표인가 — 「승인된 항목이 0개다」는 서버가 터진 게 아니라 **사람이 아직
 *   승인을 안 한 것**이다. 그걸 500 으로 내면 화면은 「다시 해 보세요」밖에 못 고르고,
 *   운영자는 없는 버그를 찾는다. 판정 자체는 컴파일러 하나가 한다 (`EMPTY_SNAPSHOT`) —
 *   여기서 항목 수를 다시 세면 「무엇이 빈 Pack 인가」가 두 곳이 되고 조용히 갈라진다.
 *   ⚠ 라우트가 세면 「항목은 있는데 전부 제외된」 경우를 놓친다. 컴파일러는 안 놓친다.
 * ★ 여기 한 줄을 더하는 절차: ① `packages/compiler` 의 `CompileErrorCode` 에 값 추가
 *   ② **이 표에 한 줄** — ①만 하면 여기서 타입 검사가 막힌다. 서버 잘못이면 `null`.
 */
const COMPILE_ERROR_FAULT: Record<CompileErrorCode, { code: ErrorCode; message: string } | null> = {
  //  DB 의 항목이 지금의 계약과 안 맞는다 — 사람이 고칠 수 있는 것이 아니다.
  INVALID_ITEM: null,
  INVALID_INPUT: null,
  EMPTY_SNAPSHOT: {
    code: 'VALIDATION_FAILED',
    message: '승인된 항목이 하나도 없습니다 — Context 에서 초안을 승인한 뒤에 발행하세요',
  },
}

export async function publishVersion(args: {
  db: Db
  actor: Actor
  projectId: string
  body: PublishVersion
  now: Date
}): Promise<PublishedVersion> {
  const { db, actor, projectId, body, now } = args
  const generatedAt = now.toISOString()

  return db.transaction(async (tx) => {
    // ── 1단계. 기준 버전이 지금의 공식 버전인가 (SPEC §2.1 1단계) ──────────
    const [project] = await tx
      .select({ id: projects.id, teamId: projects.teamId, name: projects.name, official: projects.officialVersionId })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
    if (!project) fail('NOT_FOUND', '프로젝트를 찾을 수 없다')

    //  ⚠ `null` 끼리도 비교한다 — 첫 발행은 둘 다 null 이어야 지난다. 「없으면 통과」로
    //    두면 base 를 빠뜨린 요청이 낡은 기준으로 발행해 버린다.
    if ((project.official ?? null) !== (body.base_version_id ?? null)) {
      fail('STALE_BASE', undefined, {
        official_version_id: project.official,
        sent_base_version_id: body.base_version_id,
      })
    }

    //  같은 semver 를 두 번 발행하지 않는다 (DB 의 unique 가 잡기 **전에** 400 으로 답한다 —
    //  제약 위반을 그대로 두면 드라이버 예외가 INTERNAL 500 이 되고 화면이 이유를 못 읽는다).
    const [dupSemver] = await tx
      .select({ id: contextVersions.id })
      .from(contextVersions)
      .where(and(eq(contextVersions.projectId, projectId), eq(contextVersions.semver, body.semver)))
      .limit(1)
    if (dupSemver) fail('VALIDATION_FAILED', `이미 발행된 버전이다: ${body.semver}`)

    // ── 2단계. 승인된 제안을 적용한다 (add · update · deprecate) ───────────
    const approved = await tx
      .select({ id: proposals.id, items: proposals.items })
      .from(proposals)
      .where(and(eq(proposals.projectId, projectId), eq(proposals.status, 'approved')))
      .orderBy(asc(proposals.createdAt))

    const failures: ItemFailure[] = []
    for (const proposal of approved) {
      for (const item of proposal.items) {
        const problem = await applyProposalItem(tx, {
          projectId, item, proposalId: proposal.id, actorId: actor.userId, now,
        })
        if (problem) failures.push({ proposal_id: proposal.id, item_id: problem.itemId, reason: problem.reason })
      }
    }
    //  ⚠ 하나라도 실패하면 **전부** 롤백이다 (SPEC §2.1 8단계). 성공한 것만 남기면
    //    「무엇이 반영됐나」를 아무도 모르는 상태가 된다.
    if (failures.length > 0) fail('VALIDATION_FAILED', '승인된 제안을 적용하지 못했다', { failures })

    // ── 3단계. active 항목 + 현재 개정 → snapshot (ID 순) ──────────────────
    const rows = await tx
      .select(ITEM_COLUMNS)
      .from(contextItems)
      .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
      //  담당자 이름 (FINDINGS 168). ITEM_COLUMNS 를 쓰는 질의는 **전부** 이 join 이 필요하다.
      .leftJoin(itemOwners, ITEM_OWNER_JOIN)
      .where(and(
        eq(contextItems.projectId, projectId),
        eq(contextItems.status, 'active'),
        isNull(contextItems.deletedAt),
      ))
      .orderBy(asc(contextItems.publicId))
    const items: ContextItem[] = rows.map(toContextItem)

    const snapshot: Snapshot = {
      team_id: project.teamId,
      project_id: projectId,
      context_version: body.semver,
      generated_at: generatedAt,
      items,
    }

    // ── 5단계 먼저. 컴파일이 막히면 아무것도 INSERT 하지 않는다 ─────────────
    //     ★ SPEC 의 번호는 4(버전 INSERT) → 5(컴파일)지만, 컴파일 실패가 제일 흔하고
    //       DB 를 만지기 전에 알 수 있다. 결과는 같다(어차피 전부 롤백) — 순서를
    //       바꾼 이유는 **에러 details 가 더 정확해서**다. 제약 위반이 먼저 터지면
    //       「어느 항목이 문제인가」가 드라이버 메시지에 묻힌다.
    let compiled
    try {
      compiled = compile({
        snapshot,
        project: { name: project.name },
        templateVersion: TEMPLATE_VERSION,
        compilerVersion: COMPILER_VERSION,
      })
    } catch (err) {
      if (err instanceof CompileError) {
        //  사람 잘못인 종류는 4xx 로 내고, 나머지는 500 `COMPILE_FAILED` 다.
        const human = COMPILE_ERROR_FAULT[err.code]
        if (human) fail(human.code, human.message, { code: err.code })
        fail('COMPILE_FAILED', err.message, { code: err.code, item_id: err.item_id, issues: err.issues })
      }
      throw err
    }

    //  ⚠ 「내용이 안 바뀐 발행」은 지금 막지 못한다. `unique(project_id, snapshot_hash)`
    //    가 그 자리처럼 보이지만, `snapshot_hash` 는 `context_version`(=semver)을 품어서
    //    **버전 번호가 다르면 언제나 다른 해시**가 된다 — 그 제약은 절대 걸리지 않는다.
    //    여기에 검사를 손으로 넣지 마라: 「항목만의 지문」을 새로 계산하는 순간 해시
    //    규칙이 두 곳이 되고, 그게 P4 가 제일 싫어하는 모양이다 (FINDINGS 27).

    // ── 4단계. 버전 INSERT ────────────────────────────────────────────────
    const [version] = await tx
      .insert(contextVersions)
      .values({
        projectId,
        semver: body.semver,
        snapshotHash: compiled.manifest.snapshot_hash,
        snapshot,
        manifest: compiled.manifest,
        publishedBy: actor.userId,
        publishedAt: now,
        changeSummary: body.change_summary ?? '',
      })
      .returning({ id: contextVersions.id, publishedAt: contextVersions.publishedAt })
    if (!version) fail('INTERNAL', '버전 행을 만들지 못했다')

    // ── 5단계. Pack 파일 INSERT ───────────────────────────────────────────
    await tx.insert(packFiles).values(compiled.files.map((f) => ({
      versionId: version.id,
      path: f.path,
      content: f.text,
      sha256: f.sha256,
      //  ⚠ `f.sourcemap` 은 여기서 저장하지 않는다 (FINDINGS 34) — 역추적의 정본은
      //     본문에 박힌 `<!-- ctx:… -->` 태그다 (`db/schema.ts` 의 pack_files 주석).
      target: f.target,
    })))

    // ── 6단계. 공식 버전을 옮긴다 ─────────────────────────────────────────
    await tx.update(projects)
      .set({ officialVersionId: version.id, updatedAt: now })
      .where(eq(projects.id, projectId))

    // ── 7단계. 적용된 제안을 published 로 ─────────────────────────────────
    for (const proposal of approved) {
      await tx.update(proposals)
        .set({ status: 'published', updatedAt: now })
        .where(eq(proposals.id, proposal.id))
    }

    return {
      id: version.id,
      semver: body.semver,
      snapshot_hash: compiled.manifest.snapshot_hash,
      manifest_hash: compiled.manifest.manifest_hash,
      file_count: compiled.files.length,
      published_at: version.publishedAt.toISOString(),
      applied_proposal_ids: approved.map((p) => p.id),
    }
  })
}

/**
 * 🔴 **제안 연산 3종이 각각 무엇을 하나** (SPEC §3 `ProposalOperation` · §2.1 2단계).
 *
 * | 연산 | 필요한 것 | 결과 |
 * |---|---|---|
 * | `add` | `draft` | 새 항목이 **active** 로 생긴다 (개정 1) |
 * | `update` | `target_item_id` (+`draft` 선택) | draft 가 있으면 **새 개정**, 없으면 상태만 active |
 * | `deprecate` | `target_item_id` | 상태 → `deprecated` (행은 지우지 않는다 — P7) |
 *
 * ★ `add` 가 `draft` 가 아니라 `active` 로 들어가는 이유 — 승인된 제안이 만든 항목이
 *   초안으로 남으면 **snapshot(active 만)에 안 들어가서 Pack 에 안 나온다.** 승인의 뜻이
 *   「이 항목을 공식으로 삼는다」인데 결과가 초안이면 승인이 아무것도 안 한 것이다.
 *
 * ⚠ 실패를 던지지 않고 **돌려준다.** 던지면 첫 실패에서 멈춰서 「하나만 고치면 되는 줄
 *   알았는데 다음이 또 막히는」 반복이 된다. 전부 모아서 한 번에 보여 준다.
 */
async function applyProposalItem(
  tx: Db,
  args: { projectId: string; item: Proposal['items'][number]; proposalId: string; actorId: string; now: Date },
): Promise<{ itemId: string | undefined; reason: string } | undefined> {
  const { projectId, item, proposalId, actorId, now } = args

  //  ⚠ jsonb 에서 읽은 초안을 **다시 판다.** 「DB 에서 왔으니 믿는다」로 두면 계약이
  //    바뀐 뒤에 저장된 옛 제안이 조용히 이상한 항목이 된다 — 컴파일은 실패해야지
  //    이상해지면 안 된다 (`packages/compiler/src/input.ts` 와 같은 이유).
  let draft: ContextItemDraft | undefined
  let sourceRefs: SourceRef[] = []
  if (item.draft !== undefined) {
    try {
      draft = parseContextItemDraft(item.draft)
    } catch {
      return { itemId: item.target_item_id, reason: '저장된 초안이 지금의 계약과 맞지 않는다' }
    }
    //  ⚠ 근거를 여기서 한 번만 만든다 — `add` 와 `update` 두 갈래에 따로 적으면
    //    한쪽만 고쳐져서 「어떤 항목은 제안으로 역추적되고 어떤 항목은 안 되는」
    //    조용한 반쪽 사슬이 생긴다.
    const withProposal = withProposalRef(draft.source_refs, proposalId)
    if (!withProposal) {
      return {
        itemId: item.target_item_id ?? draft.id,
        reason: `근거가 ${SOURCE_REFS_MAX}개라 어느 제안이 만들었는지를 붙일 자리가 없다 — 근거를 하나 줄여라`,
      }
    }
    sourceRefs = withProposal
  }

  if (item.operation === 'add') {
    if (!draft) return { itemId: undefined, reason: 'add 인데 draft 가 없다' }
    const [exists] = await tx
      .select({ id: contextItems.id })
      .from(contextItems)
      .where(and(eq(contextItems.projectId, projectId), eq(contextItems.publicId, draft.id)))
      .limit(1)
    if (exists) return { itemId: draft.id, reason: '이미 있는 항목 id 다 — add 가 아니라 update 여야 한다' }

    const [created] = await tx
      .insert(contextItems)
      .values({
        projectId,
        publicId: draft.id,
        type: draft.type,
        status: 'active',
        currentRevision: 1,
        scope: draft.scope,
        priority: draft.priority,
        ownerId: draft.owner_id ?? null,
      })
      .returning({ id: contextItems.id })
    if (!created) return { itemId: draft.id, reason: '항목 행을 만들지 못했다' }
    await insertRevision(tx, { itemId: created.id, revision: 1, draft, sourceRefs, actorId })
    return undefined
  }

  const targetId = item.target_item_id
  if (!targetId) return { itemId: undefined, reason: `${item.operation} 인데 target_item_id 가 없다` }

  const [target] = await tx
    .select({ id: contextItems.id, revision: contextItems.currentRevision })
    .from(contextItems)
    .where(and(
      eq(contextItems.projectId, projectId),
      eq(contextItems.publicId, targetId),
      isNull(contextItems.deletedAt),
    ))
    .limit(1)
  if (!target) return { itemId: targetId, reason: '대상 항목이 없다' }

  if (item.operation === 'deprecate') {
    await tx.update(contextItems)
      .set({ status: 'deprecated', updatedAt: now })
      .where(eq(contextItems.id, target.id))
    return undefined
  }

  //  update — draft 가 있으면 새 개정을 쌓고, 없으면 「이 항목을 공식으로 올린다」만 한다.
  if (draft) {
    const next = target.revision + 1
    await insertRevision(tx, { itemId: target.id, revision: next, draft, sourceRefs, actorId })
    await tx.update(contextItems)
      .set({
        status: 'active',
        currentRevision: next,
        type: draft.type,
        scope: draft.scope,
        priority: draft.priority,
        ownerId: draft.owner_id ?? null,
        updatedAt: now,
      })
      .where(eq(contextItems.id, target.id))
  } else {
    await tx.update(contextItems)
      .set({ status: 'active', updatedAt: now })
      .where(eq(contextItems.id, target.id))
  }
  return undefined
}

/**
 * 🔴 **제안이 만든 개정에 「어느 제안인가」를 붙인다 (P7).**
 *
 * ★ 왜 필요한가 — 클라이언트가 보낸 `draft.source_refs` 는 원문(문서·저장소)만 가리키고,
 *   `origin:'proposal'` 은 **개정 행에만** 있어서 Pack 줄에서는 안 보인다. Pack 줄의
 *   `src:proposal:{id}` 가 있어야 「이 규칙은 어느 제안이 만들었나」로 되짚어 간다.
 *   그게 없으면 사슬이 원문에서만 끊기지 않고 **승인 기록에서 끊긴다.**
 *
 * ⚠ 같은 제안 id 가 이미 있으면 더하지 않는다 — 한 제안이 같은 항목을 두 번 건드리면
 *   근거가 중복되고 태그만 길어진다.
 * ⚠ 자리가 없으면 `undefined` 다. **몰래 하나를 버리지 않는다** — 근거를 버리는 순간
 *   그 항목의 역추적이 조용히 한 칸 짧아지고, 그건 P7 이 제일 싫어하는 모양이다.
 */
function withProposalRef(refs: SourceRef[], proposalId: string): SourceRef[] | undefined {
  return appendSourceRef(
    refs,
    { kind: 'proposal', proposal_id: proposalId },
    (r) => r.kind === 'proposal' && r.proposal_id === proposalId,
  )
}

/**
 * 개정 행 하나. `origin` 은 `proposal` 로 고정이다 — 이 경로로 들어온 것은 전부 제안이다.
 *
 * ⚠ `sourceRefs` 는 초안의 것이 **아니다** — 호출부가 `withProposalRef()` 로 제안 근거를
 *   붙여서 넘긴다. 여기서 `draft.source_refs` 를 다시 읽으면 그 한 칸이 사라진다.
 */
async function insertRevision(
  tx: Db,
  args: { itemId: string; revision: number; draft: ContextItemDraft; sourceRefs: SourceRef[]; actorId: string },
): Promise<void> {
  const { draft } = args
  await tx.insert(contextItemRevisions).values({
    itemId: args.itemId,
    revision: args.revision,
    title: draft.title,
    body: draft.body,
    tags: draft.tags,
    validFrom: draft.valid_from ?? null,
    validUntil: draft.valid_until ?? null,
    data: draft.data,
    sourceRefs: args.sourceRefs,
    confidence: draft.confidence,
    createdBy: args.actorId,
    origin: 'proposal',
  })
}
