import type { PGlite } from '@electric-sql/pglite'
import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { POST as aiOnce } from '../src/app/api/v1/demo/ai-once/route'
import type { Db } from '../src/db/client'
import { aiUsage, contextItems } from '../src/db/schema'
import { actorHash } from '../src/lib/ai/budget'
import { setAiClientForTest } from '../src/lib/ai/client'
import { AI_FEATURE_LIMITS } from '../src/lib/ai/features'
import { limitFor } from '../src/lib/api/rate-limit'
import { DEMO_AI_PRESETS, demoTryItemId } from '../src/lib/demo/ai-presets'
import { findDemoProject } from '../src/lib/demo/project'
import { seedDemo } from '../src/lib/demo/seed-demo'
import { stubTransport, type SentRequest, type StubReply } from './helpers/ai'
import { closeDb, dataOf, errorOf, freshDb, params, TEST_JWT_SECRET } from './helpers/db'

// =====================================================================
//  🔴 `POST /demo/ai-once` — 로그인 없는 사람이 AI 충돌 탐지를 **한 번 직접 돌린다** (SPEC §7.4 · 2026-09-13)
//
//  재는 것:
//    ① 없는 데모 · 표에 없는 메모 · 자유 입력은 **모델을 부르기 전에** 끝난다
//    ② 고른 메모가 샘플 팀의 같은 type **적용 중** 규칙과 같은 프롬프트로 견줘지고, 짝의 제목이 돌아온다
//    ③ **아무것도 저장하지 않는다** — 충돌 표·항목 표의 행 수가 그대로, 남는 것은 예산 장부 한 줄(IP 는 sha256)
//    ④ 모델이 지어낸 짝은 통과하지 못한다 (제품의 §7.2 와 같은 검증)
//    ⑤ 돈의 상한 — 샘플 팀 전체 하루 N회 뒤 RATE_LIMITED · 사람(IP)의 상한은 라우트 감싸기가 따로 센다
//    ⑥ 표의 메모마다 부딪힐 규칙이 샘플 팀에 **적용 중으로** 있다 — 버튼이 헛돌지 않는다
//  ⚠ 진짜 모델의 품질은 이 시험이 말하지 않는다 (스텁 transport · `helpers/ai.ts`).
// =====================================================================

let pg: PGlite | undefined
let db: Db
let sent: SentRequest[] = []
const NOW = new Date('2026-09-13T01:00:00.000Z')
const REFUND = DEMO_AI_PRESETS[0]

function stubAi(reply: (n: number) => StubReply): void {
  setAiClientForTest(stubTransport((req) => {
    const n = sent.length
    sent.push(req)
    return reply(n)
  }))
}

function aiOnceReq(body: unknown, ip = '203.0.113.9'): Request {
  return new Request('https://contextops.example/api/v1/demo/ai-once', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

async function rowCount(table: 'conflicts' | 'context_items'): Promise<number> {
  const res = await pg!.query<{ n: number }>(`select count(*)::int as n from ${table}`)
  return res.rows[0]!.n
}

beforeEach(async () => {
  sent = []
  delete process.env.AI_DISABLED
  //  씨앗(`seedDemo`)이 팀원 세션을 서명해 심는다 — 이 문은 세션을 안 묻지만 씨앗은 비밀이 있어야 돈다 (demo-guest.test 와 같다).
  process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
})

afterEach(async () => {
  setAiClientForTest(undefined)
  await closeDb(pg)
  pg = undefined
})

describe('POST /demo/ai-once — 게스트의 AI 한 번 (SPEC §7.4)', () => {
  it('데모가 심어져 있지 않으면 404 이고 모델을 부르지 않는다', async () => {
    stubAi(() => ({ input: { conflicts: [] } }))
    const res = await aiOnce(aiOnceReq({ preset: REFUND.id }), params({}))
    expect(res.status).toBe(404)
    expect((await errorOf(res)).code).toBe('NOT_FOUND')
    expect(sent).toHaveLength(0)
  })

  it('표에 없는 메모 이름 · 자유 입력은 400 이고 모델을 부르지 않는다', async () => {
    await seedDemo(NOW, {})
    stubAi(() => ({ input: { conflicts: [] } }))
    expect((await aiOnce(aiOnceReq({ preset: 'no_such_memo' }), params({}))).status).toBe(400)
    //  🔴 본문을 같이 실어도 계약(`.strict()`)이 막는다 — 자격증명 없는 문으로 아무 글이나 모델에 가지 않는다.
    expect((await aiOnce(aiOnceReq({ preset: REFUND.id, text: '아무 글이나 모델에' }), params({}))).status).toBe(400)
    expect(sent).toHaveLength(0)
  })

  it('🔴 고른 메모를 샘플 팀의 적용 중 규칙과 견주고 짝의 제목을 돌려준다 — 아무것도 저장하지 않는다', async () => {
    await seedDemo(NOW, {})
    const { projectId } = await findDemoProject(db)
    const tryId = demoTryItemId(REFUND.id)
    const before = { conflicts: await rowCount('conflicts'), items: await rowCount('context_items') }
    stubAi(() => ({
      input: {
        conflicts: [{
          kind: 'contradiction', a_item_id: tryId, b_item_id: REFUND.clashesWith,
          question: '환불 기한이 24시간인가요, 3영업일인가요?', severity: 'high',
        }],
      },
      inputTokens: 2109,
      outputTokens: 663,
    }))

    const res = await aiOnce(aiOnceReq({ preset: REFUND.id }), params({}))
    expect(res.status).toBe(200)
    const data = (await dataOf(res)) as unknown as {
      preset: string; compared: number; model: string; input_tokens: number; output_tokens: number; cost_usd: number
      conflicts: { kind: string; severity: string; question: string; other: { id: string; title: string } | null }[]
    }
    expect(data.preset).toBe(REFUND.id)
    expect(data.conflicts).toEqual([{
      kind: 'contradiction', severity: 'high', question: '환불 기한이 24시간인가요, 3영업일인가요?',
      other: { id: REFUND.clashesWith, title: '환불은 24시간 안에 종결한다' },
    }])
    expect(data.input_tokens).toBe(2109)
    expect(data.output_tokens).toBe(663)
    expect(data.cost_usd).toBeGreaterThan(0)
    expect(data.compared).toBeGreaterThan(1)

    //  프롬프트: 메모가 「바뀐 항목」으로, 부딪힐 규칙이 「기존 항목」 중 하나로 실렸다 — 정답을 따로 알려 주지 않는다.
    expect(sent).toHaveLength(1)
    expect(sent[0]!.user).toContain(REFUND.title)
    expect(sent[0]!.user).toContain(`[${REFUND.clashesWith}]`)
    expect(sent[0]!.user).not.toContain('clashesWith')

    //  🔴 저장 0 — 샘플 팀의 정리 화면이 방문자마다 늘지 않는다.
    expect(await rowCount('conflicts')).toBe(before.conflicts)
    expect(await rowCount('context_items')).toBe(before.items)

    //  장부 한 줄 — 기능 demo · 샘플 팀 프로젝트 · IP 는 sha256 으로만 (P1 · SPEC §11).
    const ledger = await db.select().from(aiUsage).where(eq(aiUsage.feature, 'demo'))
    expect(ledger).toHaveLength(1)
    expect(ledger[0]!.projectId).toBe(projectId)
    expect(ledger[0]!.actorHash).toBe(actorHash('203.0.113.9'))
    expect(JSON.stringify(ledger)).not.toContain('203.0.113.9')
  })

  it('🔴 질문 문장 안의 항목 id 는 제목으로 바뀐다 — 긴 id 가 짧은 id 에 먹히지 않고, 낱말은 그대로다', async () => {
    //  2026-09-13 production 실측: 진짜 모델이 질문에 `'item_try_float_money'` · `item_policy_integer_money` 를 그대로 적었다.
    await seedDemo(NOW, {})
    const tryId = demoTryItemId(REFUND.id)
    stubAi(() => ({
      input: {
        conflicts: [{
          kind: 'contradiction', a_item_id: tryId, b_item_id: 'item_policy_refund_escalation', severity: 'medium',
          question: `'${tryId}'는 3영업일인데 기존 항목(item_policy_refund_escalation)과 item_policy_refund 는 하루를 말합니다. 어느 쪽인가요?`,
        }],
      },
    }))
    const res = await aiOnce(aiOnceReq({ preset: REFUND.id }), params({}))
    expect(res.status).toBe(200)
    const question = ((await dataOf(res)) as unknown as { conflicts: { question: string }[] }).conflicts[0]!.question
    expect(question).toBe(
      `「${REFUND.title}」는 3영업일인데 기존 항목(「하루 넘게 손대지 않은 환불은 자동으로 윗선에 올라간다」)과 「환불은 24시간 안에 종결한다」 는 하루를 말합니다. 어느 쪽인가요?`,
    )
    expect(question).not.toMatch(/item_/)
  })

  it('모델이 프롬프트에 없는 규칙을 짝으로 내면 한 번 다시 묻는다 — 지어낸 짝은 통과하지 못한다', async () => {
    await seedDemo(NOW, {})
    const tryId = demoTryItemId(REFUND.id)
    stubAi((n) => n === 0
      ? { input: { conflicts: [{ kind: 'contradiction', a_item_id: tryId, b_item_id: 'item_made_up_rule', question: '지어낸 짝과 어긋나지 않나요?', severity: 'high' }] } }
      : { input: { conflicts: [] } })

    const res = await aiOnce(aiOnceReq({ preset: REFUND.id }), params({}))
    expect(res.status).toBe(200)
    expect(sent).toHaveLength(2)
    expect(sent[1]!.user).toContain('item_made_up_rule')
    expect(((await dataOf(res)) as unknown as { conflicts: unknown[] }).conflicts).toEqual([])
  })

  it('🔴 샘플 팀 전체의 하루 상한 — 서로 다른 주소에서 상한만큼 부른 뒤에는 RATE_LIMITED 이고 모델을 안 부른다', async () => {
    await seedDemo(NOW, {})
    stubAi(() => ({ input: { conflicts: [] } }))
    const cap = AI_FEATURE_LIMITS.demo.rate.calls
    for (let i = 0; i < cap; i += 1) {
      const res = await aiOnce(aiOnceReq({ preset: REFUND.id }, `198.51.100.${i + 1}`), params({}))
      expect(res.status, `${i + 1}번째 요청`).toBe(200)
    }
    const over = await aiOnce(aiOnceReq({ preset: REFUND.id }, '192.0.2.77'), params({}))
    expect(over.status).toBe(429)
    expect((await errorOf(over)).code).toBe('RATE_LIMITED')
    expect(sent).toHaveLength(cap)
  })

  it('한 주소의 상한은 라우트 감싸기가 따로 센다 — 하루 창이고, 샘플 팀 전체 상한보다 작다', () => {
    const perIp = limitFor('POST /demo/ai-once')
    expect(perIp.windowSeconds).toBe(86_400)
    expect(perIp.calls).toBeLessThan(AI_FEATURE_LIMITS.demo.rate.calls)
  })

  it.each(DEMO_AI_PRESETS.map((p) => [p.id, p.clashesWith] as const))(
    '🔴 메모 %s 가 부딪힐 규칙 %s 가 샘플 팀에 적용 중으로 있다 — 버튼이 헛돌지 않는다',
    async (_id, clashesWith) => {
      await seedDemo(NOW, {})
      const { projectId } = await findDemoProject(db)
      const [row] = await db
        .select({ status: contextItems.status, type: contextItems.type })
        .from(contextItems)
        .where(and(eq(contextItems.projectId, projectId), eq(contextItems.publicId, clashesWith)))
      expect(row?.status).toBe('active')
      //  메모는 `policy` 로 실린다(라우트) — 같은 type 이어야 후보에 든다 (§7.2).
      expect(row?.type).toBe('policy')
    },
  )
})
