import { and, eq, isNull, sql } from 'drizzle-orm'
import { CreateProject } from '@contextops/schema'

import { conflicts, projects } from '../../../../../../db/schema'
import { conflictRow } from '../../../../../../lib/api/conflict'
import { CREATION_LIMITS } from '../../../../../../lib/api/limits'
import { fail } from '../../../../../../lib/api/error'
import { requireTeam } from '../../../../../../lib/api/guard'
import { parseBody, pathUuid, route } from '../../../../../../lib/api/route'
import { SEED_QUESTIONS } from '../../../../../../lib/api/seed-questions'

// =====================================================================
//  `POST /teams/{id}/projects` — owner (SPEC §5)
//
//  🔴 **프로젝트가 생기는 순간 씨앗 질문 10장이 같이 생긴다** (SPEC §9 화면 3 ③).
//     ★ 왜 여기인가 — 화면 3 은 「문서가 없어도 됩니다」라고 약속한다. 질문을 만드는
//       자리가 §7.1(문서 구조화) 하나뿐이면 그 문장은 거짓이다 (FINDINGS 67).
//       프로젝트를 만드는 이 자리가 **문서보다 먼저 있는 유일한 자리**다.
//     ⚠ 프로젝트 INSERT 와 **같은 트랜잭션**이다. 밖에서 넣으면 「질문 없는 프로젝트」가
//       조용히 생기고, 그 프로젝트는 문서를 올릴 때까지 화면 3 이 비어 있다.
// =====================================================================

export const dynamic = 'force-dynamic'

export const POST = route<{ id: string }>('POST /teams/{id}/projects', async (ctx) => {
  const actor = await ctx.actor()

  const teamId = pathUuid(ctx.params.id, 'team id')
  await requireTeam(ctx.db, actor, teamId, 'owner')

  const body = await parseBody(ctx.req, CreateProject)

  //  🔴 상한 — 한 팀의 (지워지지 않은) 프로젝트 수 (`CREATION_LIMITS` · INBOX H11).
  const existing = await ctx.db
    .select({ n: sql<string | null>`count(*)` })
    .from(projects)
    .where(and(eq(projects.teamId, teamId), isNull(projects.deletedAt)))
  if (Number(existing[0]?.n ?? 0) >= CREATION_LIMITS.PROJECT_LIMIT.max) {
    fail('VALIDATION_FAILED', `${CREATION_LIMITS.PROJECT_LIMIT.what}는 ${CREATION_LIMITS.PROJECT_LIMIT.max}개까지다`, { code: 'PROJECT_LIMIT', limit: CREATION_LIMITS.PROJECT_LIMIT.max })
  }

  const row = await ctx.db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projects)
      .values({ teamId, slug: body.slug, name: body.name, description: body.description ?? null })
      //  slug 는 **팀 안에서** 유일하다 (SPEC §2 `unique(team_id,slug)`).
      .onConflictDoNothing({ target: [projects.teamId, projects.slug] })
      .returning({
        id: projects.id,
        team_id: projects.teamId,
        slug: projects.slug,
        name: projects.name,
        description: projects.description,
        official_version_id: projects.officialVersionId,
      })
    if (!created) fail('VALIDATION_FAILED', '이 팀에 이미 있는 slug 다', [{ path: 'slug', message: '이 팀에 이미 있는 slug 다' }])

    //  ⚠ 어느 칸이 차고 어느 칸이 비는지는 여기가 아니라 `CONFLICT_KIND_RULES` 가
    //     정한다 (`seed_question` 은 `anchor:'none'` 이라 넷 다 빈다). 그 판정은
    //     DB CHECK 이 다시 한 번 막는다 — 여기서 손으로 null 을 적지 마라.
    await tx.insert(conflicts).values(
      SEED_QUESTIONS.map((q) => conflictRow({
        projectId: created.id,
        kind: 'seed_question',
        question: q.question,
      })),
    )
    return created
  })

  ctx.note({ project_id: row.id })
  return ctx.ok(row, 201)
})
