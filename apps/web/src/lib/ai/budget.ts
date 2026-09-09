import { and, eq, gte, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'

import { getDb, type Db } from '../../db/client'
import { aiUsage } from '../../db/schema'
import { ApiError } from '../api/error'
import {
  AI_FEATURE_LIMITS,
  DEFAULT_DAILY_BUDGET_USD,
  DEFAULT_PROJECT_DAILY_BUDGET_USD,
  DEFAULT_MAX_INPUT_TOKENS,
  costMicros,
  estimateTokens,
  type AiFeature,
} from './features'
//  ⚠ 모델 이름의 답은 `model.ts` 하나다 — 여기서 env 를 다시 읽으면
//    예산은 A 모델 값으로 세고 호출은 B 모델로 나간다.
import { currentModel } from './model'

// =====================================================================
//  apps/web/src/lib/ai/budget.ts — 서버 AI 로 들어가는 **문 하나** (SPEC §7.5 · P3)
//
//  🔴 P3: 「서버측 LLM 은 API 키로만 · 4개 기능 한정 · **withBudget() 경유**」.
//     `tools/principles.ps1` 이 `generateContent` 를 부르는 파일을 세고, 그 파일에
//     `withBudget` 이 없으면 **FAIL** 이다. 예외는 이 파일과 `client.ts` 둘뿐이다.
//
//  ★ 왜 문이 하나여야 하나 — 한 곳만 새도 하룻밤에 예산이 탄다. 그리고 새는 자리는
//    항상 「급해서 임시로」 직접 부른 자리다 (loop/PROMPT.md ③).
//
//  이 문이 막는 것 셋 — 순서대로 싸다:
//    ① 호출 하나의 입력이 `AI_MAX_INPUT_TOKENS` 를 넘나          → BUDGET_EXCEEDED
//    ② 그 기능의 빈도 상한을 넘었나 (`AI_FEATURE_LIMITS`)         → RATE_LIMITED
//    ③ 오늘 쓴 값 + 이번 추정치가 `AI_DAILY_BUDGET_USD` 를 넘나   → BUDGET_EXCEEDED
//
//  ⚠ **실패한 호출도 장부에 남는다.** 예외가 나면 추정치로 기록한다 — 안 그러면
//    계속 실패하는 루프가 예산을 무한히 쓰면서 장부에는 한 줄도 안 남는다.
// =====================================================================

/** 부르는 쪽이 주는 맥락. 본문은 받지 않는다 — 글자수만 받는다 (P1). */
export interface BudgetContext {
  /** 게스트 데모(§7.4)는 없다. */
  readonly projectId?: string
  /** 사용자 ID 나 게스트 IP. **여기서 sha256 으로 바꿔 저장한다** (SPEC §11). */
  readonly actor?: string
  /** 프롬프트로 들어갈 **글자수**. 본문이 아니다 — 이 문은 본문을 보지 않는다. */
  readonly inputChars: number
  /** 시각 주입구. 시험이 창(window) 경계를 재현하려면 필요하다. */
  readonly now?: Date
}

/** LLM 한 번의 결과 + 실제로 쓴 토큰. `client.ts` 가 이 모양으로 낸다. */
export interface AiCall<T> {
  readonly value: T
  readonly model: string
  readonly inputTokens: number
  readonly outputTokens: number
}

/** UTC 날짜 문자열 — 하루 예산의 창이다. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** 원문을 저장하지 않기 위한 단방향 변환 (SPEC §11 「로그에 토큰·본문 금지」와 같은 이유). */
export function actorHash(actor: string): string {
  return createHash('sha256').update(actor).digest('hex')
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  //  🔴 조용히 NaN 으로 돌지 않게 여기서 죽인다 (.env.example ③). NaN 과의 비교는
  //     전부 false 라서, 잘못 적힌 환경변수는 **예산 가드를 통째로 끈다.**
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} 이 숫자가 아니다: ${raw}`)
  return n
}

/** 하루 예산(USD)의 현재값. */
export function dailyBudgetUsd(): number {
  return envNumber('AI_DAILY_BUDGET_USD', DEFAULT_DAILY_BUDGET_USD)
}

/** 프로젝트 하나의 하루 예산(USD) — 전역 예산 **안에서** 다시 가르는 상한 (INBOX H11). */
export function projectDailyBudgetUsd(): number {
  return envNumber('AI_PROJECT_DAILY_BUDGET_USD', DEFAULT_PROJECT_DAILY_BUDGET_USD)
}

/** 호출 하나의 입력 토큰 상한. */
export function maxInputTokens(): number {
  return envNumber('AI_MAX_INPUT_TOKENS', DEFAULT_MAX_INPUT_TOKENS)
}

async function spentMicrosToday(db: Db, day: string, projectId?: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string | null>`coalesce(sum(${aiUsage.costMicros}), 0)` })
    .from(aiUsage)
    .where(projectId === undefined ? eq(aiUsage.day, day) : and(eq(aiUsage.day, day), eq(aiUsage.projectId, projectId)))
  return Number(row?.total ?? 0)
}

async function callsInWindow(
  db: Db, feature: AiFeature, ctx: BudgetContext, since: Date,
): Promise<number> {
  const limit = AI_FEATURE_LIMITS[feature].rate
  if (!limit) return 0
  //  범위가 없는 요청(프로젝트 없는 structure · actor 없는 ask)은 셀 열쇠가 없다.
  //  그런 요청은 애초에 만들지 않는 것이 맞아서, 세지 못하면 **막는다**.
  const key = limit.scope === 'project'
    ? (ctx.projectId ? eq(aiUsage.projectId, ctx.projectId) : undefined)
    : (ctx.actor ? eq(aiUsage.actorHash, actorHash(ctx.actor)) : undefined)
  if (!key) {
    throw new ApiError('VALIDATION_FAILED', `${feature} 는 ${limit.scope} 범위가 있어야 부를 수 있다`)
  }
  const [row] = await db
    .select({ n: sql<string | null>`count(*)` })
    .from(aiUsage)
    .where(and(eq(aiUsage.feature, feature), key, gte(aiUsage.createdAt, since)))
  return Number(row?.n ?? 0)
}

async function record(
  db: Db, feature: AiFeature, ctx: BudgetContext,
  model: string, inputTokens: number, outputTokens: number, now: Date,
): Promise<void> {
  await db.insert(aiUsage).values({
    projectId: ctx.projectId ?? null,
    feature,
    actorHash: ctx.actor ? actorHash(ctx.actor) : null,
    model,
    inputTokens,
    outputTokens,
    costMicros: costMicros(model, inputTokens, outputTokens),
    day: utcDay(now),
    //  ⚠ `defaultNow()` 에 맡기지 않는다. 창(window) 계산은 `now` 로 하는데 행은 DB 시각으로
    //     남으면 **두 시계가 갈린다** — 빈도 제한이 조용히 안 걸리는 자리가 정확히 여기다.
    createdAt: now,
  })
}

/**
 * 🔴 **서버측 LLM 을 부르는 유일한 방법.**
 *
 * @param feature `AI_FEATURES` 표의 넷 중 하나 — 표 밖의 이름은 타입이 막는다.
 * @param ctx     프로젝트·행위자·입력 **글자수**. 본문은 받지 않는다 (P1).
 * @param fn      실제 호출. `client.ts` 의 `callModel()` 가 이 모양을 낸다.
 *
 * @throws ApiError `BUDGET_EXCEEDED` — 입력 상한 초과 또는 하루 예산 소진.
 *                  화면은 그 사실만 말한다 (SPEC §7.5 · 픽스처로 떨어지는 갈래는 없다 — FINDINGS 66).
 * @throws ApiError `RATE_LIMITED` — 그 기능의 빈도 상한 초과.
 */
export async function withBudget<T>(
  feature: AiFeature,
  ctx: BudgetContext,
  fn: () => Promise<AiCall<T>>,
): Promise<T> {
  const db = getDb()
  const now = ctx.now ?? new Date()
  const estimated = estimateTokens(ctx.inputChars)

  //  ① 호출 하나의 입력 상한 — 제일 싸다. DB 를 안 본다.
  const cap = maxInputTokens()
  if (estimated > cap) {
    throw new ApiError('BUDGET_EXCEEDED', `입력이 한 번의 상한을 넘었다 (${estimated} > ${cap} 토큰)`)
  }

  //  ② 빈도.
  const rate = AI_FEATURE_LIMITS[feature].rate
  if (rate) {
    const since = new Date(now.getTime() - rate.windowSeconds * 1000)
    const used = await callsInWindow(db, feature, ctx, since)
    if (used >= rate.calls) {
      throw new ApiError('RATE_LIMITED', `${feature} 는 ${rate.windowSeconds}초에 ${rate.calls}회까지다`)
    }
  }

  //  ③ 하루 예산. 아직 안 쓴 값을 **추정치로 미리 세어** 넘을 호출을 막는다.
  //     ⚠ 출력 토큰은 부르기 전에 알 수 없다 — 입력만으로 보수적으로 잰다.
  const model = currentModel()
  const budgetMicros = Math.round(dailyBudgetUsd() * 1_000_000)
  const spent = await spentMicrosToday(db, utcDay(now))
  if (spent + costMicros(model, estimated, 0) > budgetMicros) {
    throw new ApiError('BUDGET_EXCEEDED', '오늘 AI 예산을 다 썼다')
  }
  //  🔴 이중 상한 — 프로젝트 하나가 전역 예산을 혼자 태우지 못하게 (INBOX H11). 프로젝트가 없는 호출(게스트 데모)은 전역만 본다.
  if (ctx.projectId !== undefined) {
    const projectMicros = Math.round(projectDailyBudgetUsd() * 1_000_000)
    const spentHere = await spentMicrosToday(db, utcDay(now), ctx.projectId)
    if (spentHere + costMicros(model, estimated, 0) > projectMicros) {
      throw new ApiError('BUDGET_EXCEEDED', '이 프로젝트의 오늘 AI 예산을 다 썼다')
    }
  }

  try {
    const call = await fn()
    await record(db, feature, ctx, call.model, call.inputTokens, call.outputTokens, now)
    return call.value
  } catch (err) {
    //  ⚠ 실패해도 토큰은 탔다. 추정치로라도 남긴다 — 안 남기면 실패 루프가
    //    장부 밖에서 예산을 태운다. 기록 자체가 실패하면 원래 오류를 덮지 않는다.
    await record(db, feature, ctx, model, estimated, 0, now).catch(() => undefined)
    throw err
  }
}
