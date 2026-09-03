import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { CreateDocument } from '@contextops/schema'

import { sourceDocumentVersions, sourceDocuments } from '../../../../../../db/schema'
import { createJob, startJob } from '../../../../../../lib/ai/job'
import { fail } from '../../../../../../lib/api/error'
import { requireProject } from '../../../../../../lib/api/guard'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'

// =====================================================================
//  `POST /projects/{id}/documents` — member (SPEC §5)
//
//  ⚠ SPEC 은 「multipart(zip) 또는 {title, kind, content}」이고, 여기 있는 것은
//    **뒤쪽 하나**다. zip 업로드는 경로 검사·개수·용량 상한(SPEC §11)이 따로 필요해서
//    그 몫으로 다룬다 — 반쯤 검사하는 zip 경로를 여는 것이 제일 나쁘다.
//
//  🔴 「구조화 job 시작 (§7.1)」은 **트랜잭션 밖**이다. 문서를 만든 트랜잭션이
//     커밋된 **뒤에** job 행을 만들고, 굴리는 것은 응답을 보낸 뒤다 (`startJob()`).
//     ★ 왜 밖인가 — 안에서 만들면 러너가 아직 커밋되지 않은 문서 버전을 읽으러
//       가서 `NOT_FOUND` 로 죽는다. job 은 「이미 있는 것」을 가리켜야 한다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /projects/{id}/documents', async (ctx) => {
  const actor = await ctx.actor()
  const projectId = pathUuid(ctx.params.id, 'project id')
  ctx.note({ project_id: projectId })

  await requireProject(ctx.db, actor, projectId, 'member')
  const body = await parseBody(ctx.req, CreateDocument)

  const contentHash = createHash('sha256').update(body.content, 'utf8').digest('hex')

  const doc = await ctx.db.transaction(async (tx) => {
    const [document] = await tx
      .insert(sourceDocuments)
      .values({ projectId, title: body.title, kind: body.kind })
      .returning({ id: sourceDocuments.id })
    if (!document) fail('INTERNAL', '문서 행을 만들지 못했다')

    const [version] = await tx
      .insert(sourceDocumentVersions)
      .values({
        documentId: document.id,
        revision: 1,
        content: body.content,
        contentHash,
        createdBy: actor.userId,
      })
      .returning({ id: sourceDocumentVersions.id, revision: sourceDocumentVersions.revision })
    if (!version) fail('INTERNAL', '문서 개정을 만들지 못했다')

    //  ⚠ 두 표가 서로를 가리킨다. 여기서 이어 두지 않으면 `current_version_id` 가
    //    영원히 null 이고, 「지금 문서」를 아무도 못 찾는다.
    await tx
      .update(sourceDocuments)
      .set({ currentVersionId: version.id })
      .where(eq(sourceDocuments.id, document.id))

    return { document, version }
  })

  //  🔴 SPEC §5 「document + **구조화 job 시작**(§7.1)」. 화면 3 은 이 `job.id` 를
  //     polling 한다 (`GET /projects/{id}/jobs/{jobId}`).
  const job = await createJob(ctx.db, {
    projectId,
    feature: 'structure',
    input: { document_version_id: doc.version.id },
  })
  startJob(job.id)

  return ctx.ok({
    id: doc.document.id,
    project_id: projectId,
    title: body.title,
    kind: body.kind,
    current_version_id: doc.version.id,
    revision: doc.version.revision,
    content_hash: contentHash,
    job,
  }, 201)
})
