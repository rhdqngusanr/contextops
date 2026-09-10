import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'

import { closeDb, freshDb } from './helpers/db'
import { aiUsage } from '../src/db/schema'
import { ApiError } from '../src/lib/api/error'
import {
  AI_FEATURES,
  AI_FEATURE_LIMITS,
  AI_MODELS,
  DEFAULT_AI_MODEL,
  DEFAULT_DAILY_BUDGET_USD,
  DEFAULT_MAX_INPUT_TOKENS,
  DEFAULT_MONTHLY_BUDGET_USD,
  DEFAULT_PROJECT_DAILY_BUDGET_USD,
  GEMINI_36_INTRO_PRICE_UNTIL,
  costMicros,
  estimateTokens,
} from '../src/lib/ai/features'
import { currentModel } from '../src/lib/ai/model'
import { actorHash, budgetStatus, dailyBudgetUsd, maxInputTokens, monthlyBudgetUsd, projectDailyBudgetUsd, utcDay, utcMonth, withBudget } from '../src/lib/ai/budget'
import type { Db } from '../src/db/client'

// =====================================================================
//  예산 가드 (SPEC §7.5 · P3) — 「막는가」와 「값을 바꾸면 갈리는가」를 잰다
//
//  ★ 왜 이 시험이 있나 — `tools/principles.ps1` 의 P3 는 「호출부에 withBudget 이라는
//    **글자가** 있나」만 본다. 글자가 있어도 그 함수가 아무것도 안 막으면 초록이다.
//    그래서 여기서는 **실제로 던지는지** 와 **장부에 남는지** 를 잰다.
//
//  ⚠ `AI_FEATURE_LIMITS` 표의 모든 줄이 무언가를 바꾼다는 것도 여기서 잠근다 —
//    「정의만 있고 아무 일도 안 하는」 표가 이 저장소의 단골 고장이다 (CLAUDE.md).
// =====================================================================

let pg: PGlite | undefined
let db: Db
const ENV_KEYS = ['AI_DAILY_BUDGET_USD', 'AI_PROJECT_DAILY_BUDGET_USD', 'AI_MONTHLY_BUDGET_USD', 'AI_MAX_INPUT_TOKENS', 'GEMINI_MODEL', 'AI_DISABLED'] as const
const saved: Record<string, string | undefined> = {}

const TEAM = '22222222-2222-4222-8222-222222222222'
const PROJECT = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-09-04T12:00:00.000Z')

/** 프로젝트 FK 사슬. `ai_usage.project_id` 가 진짜 FK 라서 없으면 INSERT 가 막힌다. */
async function seedProject(): Promise<void> {
  await pg!.query(`insert into teams (id, slug, name) values ($1, 'paylab', 'paylab')`, [TEAM])
  await pg!.query(
    `insert into projects (id, team_id, slug, name) values ($1, $2, 'api', 'api')`,
    [PROJECT, TEAM],
  )
}

/** 예산을 안 태우는 가짜 호출. `client.ts` 의 `callModel()` 가 내는 모양과 같다. */
function fakeCall(inputTokens = 100, outputTokens = 50) {
  return async () => ({ value: 'ok', model: currentModel(), inputTokens, outputTokens })
}

beforeAll(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k]
})

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

beforeEach(async () => {
  for (const k of ENV_KEYS) delete process.env[k]
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
  await seedProject()
})

afterEach(async () => {
  await closeDb(pg)
  pg = undefined
})

// ---------------------------------------------------------------------
describe('표가 실제로 무언가를 정한다', () => {
  it('P3 의 「4개 기능」이 표에도 4줄이다', () => {
    expect(AI_FEATURES.length).toBe(4)
    expect(Object.keys(AI_FEATURE_LIMITS).sort()).toEqual([...AI_FEATURES].sort())
  })

  it('기본 모델은 정가 표 안에 있다 — 없으면 예산을 못 센다', () => {
    expect(AI_MODELS[DEFAULT_AI_MODEL]).toBeDefined()
    expect(currentModel()).toBe(DEFAULT_AI_MODEL)
  })

  it('표에 없는 모델 이름은 조용히 지나가지 않고 죽는다', () => {
    process.env.GEMINI_MODEL = 'gemini-does-not-exist'
    expect(() => currentModel()).toThrow(/AI_MODELS/)
  })

  it('SPEC §7.5 의 기본값이 코드의 기본값이다', () => {
    expect(DEFAULT_DAILY_BUDGET_USD).toBe(3)
    expect(DEFAULT_MAX_INPUT_TOKENS).toBe(60_000)
    expect(dailyBudgetUsd()).toBe(DEFAULT_DAILY_BUDGET_USD)
    expect(maxInputTokens()).toBe(DEFAULT_MAX_INPUT_TOKENS)
  })

  it('환경변수가 숫자가 아니면 예산 가드를 끄지 않고 죽는다', () => {
    process.env.AI_DAILY_BUDGET_USD = 'three'
    expect(() => dailyBudgetUsd()).toThrow(/AI_DAILY_BUDGET_USD/)
  })

  it('토큰 추정은 글자수/2.5 이고 값이 클수록 커진다 (SPEC §7.5)', () => {
    expect(estimateTokens(0)).toBe(0)
    expect(estimateTokens(10)).toBe(4)
    expect(estimateTokens(100)).toBeGreaterThan(estimateTokens(50))
  })

  it('🔴 정가가 공개 정가와 같다 — 2026-09-10 ai.google.dev/gemini-api/docs/pricing 에서 읽은 값 (INBOX G10)', () => {
    //  ★ 왜 숫자를 여기 한 번 더 적나 — 표 자신을 기대값으로 쓰면 표를 잘못 고쳐도 아무도 안 막는다
    //    (닻 하나). 예전 값(0.30 · 2.50)은 2.5 Flash 의 것이라 $3 가드가 $11~15 를 통과시켰다.
    expect(AI_MODELS['gemini-3.5-flash']).toEqual({ inputPerMTokUsd: 1.5, outputPerMTokUsd: 9 })
    expect(AI_MODELS['gemini-3.6-flash']).toEqual({ inputPerMTokUsd: 0.75, outputPerMTokUsd: 3.75 })
    //  3.6 의 값은 **도입가**다 — 그 날이 지나면 이 시험이 빨개져 표를 올리게 한다 (2027-01-01 부터 1.50 · 7.50).
    expect(new Date().toISOString().slice(0, 10) <= GEMINI_36_INTRO_PRICE_UNTIL,
      `gemini-3.6-flash 도입가(${GEMINI_36_INTRO_PRICE_UNTIL} 까지)가 끝났다 — features.ts 의 정가를 1.50 · 7.50 으로 올려라`).toBe(true)
  })

  it('값은 정가 표에서 온다 — 표의 모든 줄이 입력·출력을 따로 세고, 0 인 줄은 없다', () => {
    //  ⚠ 「표의 값이 그대로 셈에 들어간다」를 잰다 — 어느 값이 맞는지의 닻은 위 시험 하나다.
    //    0 을 막는 이유: 정가 0 은 하루 예산을 조용히 무한으로 만든다 (P3).
    for (const [model, price] of Object.entries(AI_MODELS)) {
      expect(price.inputPerMTokUsd, model).toBeGreaterThan(0)
      expect(price.outputPerMTokUsd, model).toBeGreaterThan(0)
      expect(costMicros(model, 1_000_000, 0)).toBe(Math.ceil(price.inputPerMTokUsd * 1_000_000))
      expect(costMicros(model, 0, 1_000_000)).toBe(Math.ceil(price.outputPerMTokUsd * 1_000_000))
      expect(costMicros(model, 0, 1_000_000)).toBeGreaterThan(costMicros(model, 1_000_000, 0))
    }
    expect(() => costMicros('gemini-does-not-exist', 1, 1)).toThrow(/AI_MODELS/)
  })
})

// ---------------------------------------------------------------------
describe('withBudget 이 실제로 막는다', () => {
  it('통과하면 장부에 한 줄이 남는다 — 본문이 들어갈 칸은 없다 (P1)', async () => {
    const out = await withBudget('conflict', { projectId: PROJECT, inputChars: 100, now: NOW }, fakeCall())
    expect(out).toBe('ok')

    const rows = await db.select().from(aiUsage)
    expect(rows.length).toBe(1)
    expect(rows[0]!.feature).toBe('conflict')
    expect(rows[0]!.day).toBe('2026-09-04')
    expect(rows[0]!.inputTokens).toBe(100)
    expect(rows[0]!.costMicros).toBe(costMicros(DEFAULT_AI_MODEL, 100, 50))
    //  본문이 들어갈 칸 자체가 없다 — 컬럼 이름으로 확인한다.
    const columns = Object.keys(rows[0]!)
    for (const forbidden of ['prompt', 'content', 'body', 'response']) {
      expect(columns).not.toContain(forbidden)
    }
  })

  it('행위자는 원문이 아니라 sha256 으로 남는다 (SPEC §11)', async () => {
    await withBudget('ask', { projectId: PROJECT, actor: '203.0.113.7', inputChars: 10, now: NOW }, fakeCall())
    const rows = await db.select().from(aiUsage)
    expect(rows[0]!.actorHash).toBe(actorHash('203.0.113.7'))
    expect(rows[0]!.actorHash).not.toContain('203.0.113')
  })

  it('한 번의 입력이 상한을 넘으면 BUDGET_EXCEEDED — 호출은 아예 안 나간다', async () => {
    process.env.AI_MAX_INPUT_TOKENS = '10'
    let called = false
    const fn = async () => {
      called = true
      return { value: 'x', model: DEFAULT_AI_MODEL, inputTokens: 1, outputTokens: 1 }
    }
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 1000, now: NOW }, fn))
      .rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })
    expect(called).toBe(false)
    expect((await db.select().from(aiUsage)).length).toBe(0)
  })

  it('하루 예산을 다 쓰면 BUDGET_EXCEEDED — 상한만 올리면 같은 호출이 지나간다', async () => {
    process.env.AI_DAILY_BUDGET_USD = '0'
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 1000, now: NOW }, fakeCall()))
      .rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })

    process.env.AI_DAILY_BUDGET_USD = '3'
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 1000, now: NOW }, fakeCall()))
      .resolves.toBe('ok')
  })

  it('어제 쓴 값은 오늘의 예산을 먹지 않는다 (창은 UTC 하루)', async () => {
    const yesterday = new Date('2026-09-03T12:00:00.000Z')
    expect(utcDay(yesterday)).toBe('2026-09-03')
    //  어제 예산을 거의 다 쓴 상태를 만든다.
    await withBudget('conflict', { projectId: PROJECT, inputChars: 1, now: yesterday }, fakeCall(200_000, 200_000))
    process.env.AI_DAILY_BUDGET_USD = '3'
    //  오늘 첫 호출은 어제 줄을 세지 않는다.
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 1, now: NOW }, fakeCall(1, 1)))
      .resolves.toBe('ok')
  })

  it('실패한 호출도 장부에 남는다 — 실패 루프가 장부 밖에서 예산을 태우지 않는다', async () => {
    const boom = async (): Promise<never> => { throw new Error('upstream 500') }
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 250, now: NOW }, boom))
      .rejects.toThrow('upstream 500')
    const rows = await db.select().from(aiUsage)
    expect(rows.length).toBe(1)
    //  예약이 그대로 남는다 — 출력도 입력만큼(보수적). 실패한 호출을 적게 세는 쪽으로는 안 틀린다 (2026-09-11).
    expect(rows[0]!.inputTokens).toBe(estimateTokens(250))
    expect(rows[0]!.outputTokens).toBe(estimateTokens(250))
  })
})

// ---------------------------------------------------------------------
describe('🔴 한 달 천장 — 청구서가 $10 을 넘지 않는다 (2026-09-11 · 「AI API 한 달 요금 10달러 이상 안 나오게」)', () => {
  it('기본값은 $10 이고 하루 예산보다 크다 — 하루가 달을 넘길 수 없다', () => {
    expect(DEFAULT_MONTHLY_BUDGET_USD).toBe(10)
    expect(monthlyBudgetUsd()).toBe(DEFAULT_MONTHLY_BUDGET_USD)
    expect(DEFAULT_MONTHLY_BUDGET_USD).toBeGreaterThanOrEqual(DEFAULT_DAILY_BUDGET_USD)
    process.env.AI_MONTHLY_BUDGET_USD = '4.5'
    expect(monthlyBudgetUsd()).toBe(4.5)
  })

  it('이번 달 장부가 천장에 닿으면 BUDGET_EXCEEDED — 오늘 예산이 남아 있어도 · 천장을 올리면 같은 호출이 지나간다', async () => {
    process.env.AI_DAILY_BUDGET_USD = '100'
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '100'
    process.env.AI_MONTHLY_BUDGET_USD = '2'
    //  같은 달의 다른 날에 $2.1 어치를 썼다 (200k 입력 · 200k 출력 · 3.5 Flash 정가).
    const earlier = new Date('2026-09-01T09:00:00.000Z')
    expect(utcMonth(earlier)).toBe(utcMonth(NOW))
    await withBudget('conflict', { projectId: PROJECT, inputChars: 1, now: earlier }, fakeCall(200_000, 200_000))
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fakeCall(1, 1)))
      .rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })
    process.env.AI_MONTHLY_BUDGET_USD = '10'
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fakeCall(1, 1))).resolves.toBe('ok')
  })

  it('지난달 쓴 값은 이번 달 천장을 먹지 않는다 (창은 UTC 달)', async () => {
    process.env.AI_DAILY_BUDGET_USD = '100'
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '100'
    process.env.AI_MONTHLY_BUDGET_USD = '0.01'
    const lastMonth = new Date('2026-08-31T23:00:00.000Z')
    expect(utcMonth(lastMonth)).toBe('2026-08')
    await withBudget('conflict', { projectId: PROJECT, inputChars: 1, now: lastMonth }, fakeCall(200_000, 200_000))
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fakeCall(1, 1))).resolves.toBe('ok')
  })

  it('천장 앞에서는 출력도 입력만큼 나온다고 보수적으로 잰다 — 입력만 세면 마지막 호출이 천장을 넘긴다', async () => {
    process.env.AI_DAILY_BUDGET_USD = '100'
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '100'
    //  4,000자 → 1,600 토큰. 입력만이면 $0.0024, 입력+출력이면 $0.0168 — 천장을 그 사이에 둔다.
    const est = estimateTokens(4_000)
    const inputOnly = costMicros(currentModel(), est, 0) / 1_000_000
    const both = costMicros(currentModel(), est, est) / 1_000_000
    process.env.AI_MONTHLY_BUDGET_USD = String((inputOnly + both) / 2)
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 4_000, now: NOW }, fakeCall(1, 1)))
      .rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })
  })
})

describe('🔴 예약이 먼저다 — 검사와 기록이 한 자물쇠 안에 있다 (2026-09-11 · 「문구 말고 진짜 제대로」)', () => {
  it('호출이 도는 동안 이미 장부에 예약 한 줄이 있고(추정치 · 출력 = 입력), 끝나면 실제 토큰으로 갱신된다', async () => {
    let during: { input: number; output: number; cost: number }[] = []
    const fn = async () => {
      const rows = await db.select().from(aiUsage)
      during = rows.map((r) => ({ input: r.inputTokens, output: r.outputTokens, cost: r.costMicros }))
      return { value: 'ok', model: currentModel(), inputTokens: 7, outputTokens: 3 }
    }
    await withBudget('conflict', { projectId: PROJECT, inputChars: 250, now: NOW }, fn)
    const est = estimateTokens(250)
    expect(during).toEqual([{ input: est, output: est, cost: costMicros(currentModel(), est, est) }])
    const after = await db.select().from(aiUsage)
    expect(after).toHaveLength(1)
    expect(after[0]).toMatchObject({ inputTokens: 7, outputTokens: 3, costMicros: costMicros(currentModel(), 7, 3) })
  })

  it('호출 중인 예약이 다음 요청의 천장 계산에 든다 — 동시 호출이 천장을 두 배로 못 뚫는다', async () => {
    process.env.AI_DAILY_BUDGET_USD = '100'
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '100'
    //  천장을 「호출 하나의 예약」보다 조금 크게 둔다 — 첫 호출은 지나가고, 그 호출이 도는 동안 온 둘째는 막혀야 한다.
    const est = estimateTokens(4_000)
    process.env.AI_MONTHLY_BUDGET_USD = String(costMicros(currentModel(), est, est) / 1_000_000 * 1.5)
    let secondFailed: unknown = null
    const fn = async () => {
      //  첫 호출이 도는 동안 둘째 호출이 온다 — 첫 예약이 이미 장부에 있어 막혀야 한다.
      try { await withBudget('conflict', { projectId: PROJECT, inputChars: 4_000, now: NOW }, fakeCall(1, 1)) } catch (e) { secondFailed = e }
      return { value: 'ok', model: currentModel(), inputTokens: 1, outputTokens: 1 }
    }
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 4_000, now: NOW }, fn)).resolves.toBe('ok')
    expect(secondFailed).toMatchObject({ code: 'BUDGET_EXCEEDED' })
  })

  it('AI_DISABLED=1 이면 DB 도 안 보고 막는다 — 비상 스위치', async () => {
    process.env.AI_DISABLED = '1'
    let called = false
    const fn = async () => { called = true; return { value: 'ok', model: currentModel(), inputTokens: 1, outputTokens: 1 } }
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fn)).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })
    expect(called).toBe(false)
    expect((await db.select().from(aiUsage)).length).toBe(0)
  })

  it('보는 눈 — budgetStatus 가 이번 달 지출(USD)과 천장·스위치를 낸다', async () => {
    expect(await budgetStatus(db, NOW)).toEqual({ monthly_usd: 10, spent_month_usd: 0, disabled: false })
    await withBudget('conflict', { projectId: PROJECT, inputChars: 1, now: NOW }, fakeCall(200_000, 200_000))
    const status = await budgetStatus(db, NOW)
    expect(status.spent_month_usd).toBeCloseTo(costMicros(currentModel(), 200_000, 200_000) / 1_000_000, 3)
  })
})

describe('빈도 제한 — AI_FEATURE_LIMITS 의 줄마다 결과가 갈린다', () => {
  it('ask 는 분당 3회에서 RATE_LIMITED (SPEC §7.5)', async () => {
    const ctx = { projectId: PROJECT, actor: 'user-a', inputChars: 10, now: NOW }
    for (let i = 0; i < AI_FEATURE_LIMITS.ask.rate!.calls; i++) {
      await expect(withBudget('ask', ctx, fakeCall(1, 1))).resolves.toBe('ok')
    }
    await expect(withBudget('ask', ctx, fakeCall(1, 1))).rejects.toMatchObject({ code: 'RATE_LIMITED' })

    //  ★ 다른 행위자는 안 막힌다 — scope 가 'actor' 라는 뜻이다.
    await expect(withBudget('ask', { ...ctx, actor: 'user-b' }, fakeCall(1, 1))).resolves.toBe('ok')
  })

  it('창이 지나면 다시 지나간다 — windowSeconds 가 살아 있다', async () => {
    const ctx = { projectId: PROJECT, actor: 'user-a', inputChars: 10, now: NOW }
    for (let i = 0; i < 3; i++) await withBudget('ask', ctx, fakeCall(1, 1))
    await expect(withBudget('ask', ctx, fakeCall(1, 1))).rejects.toMatchObject({ code: 'RATE_LIMITED' })

    const later = new Date(NOW.getTime() + (AI_FEATURE_LIMITS.ask.rate!.windowSeconds + 1) * 1000)
    await expect(withBudget('ask', { ...ctx, now: later }, fakeCall(1, 1))).resolves.toBe('ok')
  })

  it('structure 는 프로젝트마다 센다 — 셀 열쇠가 없으면 지어내지 않고 막는다', async () => {
    const ctx = { projectId: PROJECT, inputChars: 10, now: NOW }
    for (let i = 0; i < AI_FEATURE_LIMITS.structure.rate!.calls; i++) {
      await withBudget('structure', ctx, fakeCall(1, 1))
    }
    await expect(withBudget('structure', ctx, fakeCall(1, 1)))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' })
    await expect(withBudget('structure', { inputChars: 10, now: NOW }, fakeCall(1, 1)))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('conflict 도 프로젝트마다 센다 — §7.2 가 「탐지 한 번」으로 정했다', async () => {
    //  ⚠ 15바퀴까지 이 칸은 `rate: null`(상한 없음)이었다. §7.2 를 만든 바퀴가
    //     「무엇마다 세나」를 정하면서 채웠다 (SPEC §7.5 · FINDINGS 51).
    const rate = AI_FEATURE_LIMITS.conflict.rate
    expect(rate).toEqual({ calls: 10, windowSeconds: 3600, scope: 'project' })
    const ctx = { projectId: PROJECT, inputChars: 10, now: NOW }
    for (let i = 0; i < rate!.calls; i++) await withBudget('conflict', ctx, fakeCall(1, 1))
    expect((await db.select().from(aiUsage)).length).toBe(rate!.calls)
    await expect(withBudget('conflict', ctx, fakeCall(1, 1)))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' })
    //  창이 지나면 다시 된다 — 상한은 「영원히 막는 것」이 아니라 폭주를 끊는 것이다.
    const later = new Date(NOW.getTime() + rate!.windowSeconds * 1000 + 1)
    await withBudget('conflict', { ...ctx, now: later }, fakeCall(1, 1))
  })

  it('던지는 것은 전부 ApiError 다 — 라우트가 봉투로 낼 수 있어야 한다 (SPEC §5)', async () => {
    process.env.AI_DAILY_BUDGET_USD = '0'
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fakeCall()))
      .rejects.toBeInstanceOf(ApiError)
  })
})

// ---------------------------------------------------------------------
describe('프로젝트별 하루 상한 — 전역 안의 이중 상한 (INBOX H11)', () => {
  const OTHER = '33333333-3333-4333-8333-333333333333'

  it('SPEC §7.5 의 기본값 — 프로젝트 하나는 1달러', () => {
    expect(DEFAULT_PROJECT_DAILY_BUDGET_USD).toBe(1)
    expect(projectDailyBudgetUsd()).toBe(DEFAULT_PROJECT_DAILY_BUDGET_USD)
    //  전역보다 작아야 뜻이 있다 — 크면 전역이 먼저 걸려 이 상한은 죽은 줄이다.
    expect(DEFAULT_PROJECT_DAILY_BUDGET_USD).toBeLessThan(DEFAULT_DAILY_BUDGET_USD)
  })

  it('🔴 한 프로젝트가 제 상한을 다 써도 다른 프로젝트는 그대로 돈다', async () => {
    await pg!.query(`insert into projects (id, team_id, slug, name) values ($1, $2, 'other', 'other')`, [OTHER, TEAM])
    process.env.AI_DAILY_BUDGET_USD = '100'
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '0'
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fakeCall()))
      .rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })
    //  상한을 올리면 같은 호출이 지나간다 — 전역이 아니라 프로젝트 상한이 막은 것이었다.
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '1'
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fakeCall(300_000, 30_000)))
      .resolves.toBe('ok')
    //  이제 이 프로젝트는 오늘치를 다 썼다($0.72 + 다음 추정) — 다른 프로젝트는 막히지 않는다.
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '0.5'
    await expect(withBudget('conflict', { projectId: PROJECT, inputChars: 10, now: NOW }, fakeCall()))
      .rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })
    await expect(withBudget('conflict', { projectId: OTHER, inputChars: 10, now: NOW }, fakeCall()))
      .resolves.toBe('ok')
  })

  it('프로젝트가 없는 호출(게스트 데모)은 전역 상한만 본다', async () => {
    process.env.AI_PROJECT_DAILY_BUDGET_USD = '0'
    await expect(withBudget('demo', { actor: '203.0.113.9', inputChars: 10, now: NOW }, fakeCall()))
      .resolves.toBe('ok')
  })
})
