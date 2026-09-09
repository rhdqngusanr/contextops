import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import {
  AiConflictOutput,
  CONFLICT_KIND_RULES,
  CONFLICT_SEVERITY_RANK,
  DETECTED_CONFLICT_KINDS,
  toJsonSchemaOf,
  type AiConflict,
  type ItemType,
  type Scope,
} from '@contextops/schema'

import { getDb } from '../../db/client'
import { contextItemRevisions, contextItems, REVISION_ORIGINS } from '../../db/schema'
import { ApiError } from '../api/error'
import { CURRENT_REVISION_JOIN } from '../api/item'
import { withBudget } from './budget'
import { OUTPUT_TRUNCATED_COMPLAINT, callModel, type ToolCallRequest } from './client'
import { currentModel } from './model'
import { AI_SYSTEM_COMMON, untrusted } from './prompt'

// =====================================================================
//  apps/web/src/lib/ai/conflict.ts — 충돌·오래됨 탐지 (SPEC §7.2 · P3)
//
//  바뀐 항목 + 같은 type 의 기존 active 항목 → **질문 카드**.
//  (scope 는 후보를 거르는 조건이 아니라 프롬프트의 `scope=` 줄이다 — FINDINGS 146)
//
//  🔴 **LLM 은 「어느 쪽이 맞다」를 판단하지 않는다** (SPEC §7.2 마지막 줄).
//     질문만 만든다. 고르는 것은 사람이고 그 결정은 `conflicts.resolution` 에 남는다.
//
//  🔴 **LLM 호출은 전부 `withBudget('conflict', …)` 안에서 일어난다** (P3).
//
//  🔴 **왜 `detectConflicts()` 한 번이 `withBudget` 한 번인가**
//     `withBudget` 은 장부(`ai_usage`)의 **행 수**로 빈도를 센다. 그래서 「무엇마다
//     한 번인가」가 곧 빈도 상한의 뜻이다. 이 기능은 사람이 누르는 것이 아니라
//     **항목이 바뀐 묶음마다** 서버가 부르는 것이라, 세는 단위는 **탐지 한 번**이다
//     (§7.1 이 「문서 하나」인 것과 같은 자리의 결정 · `features.ts` 의 `conflict` 칸).
//     ⚠ 그래서 이 함수 안의 LLM 왕복은 **한 번(+재시도 1회)**이다. 항목을 나눠 여러 번
//        부르기 시작하면 그 순간 빈도 상한이 「탐지 N회」가 아니라 「묶음 N개」가 된다.
//
//  ⚠ SPEC §11 — 항목 본문은 `<untrusted>` 로만 들어가고, 어디에도 로그하지 않는다.
// =====================================================================

// ---------------------------------------------------------------------
//  §7.2 의 수치 — 여기가 정본이다. 라우트·시험은 이 상수를 읽는다
// ---------------------------------------------------------------------

/** SPEC §7.2 「같은 type 의 기존 active 항목(**최대 40개**)」. */
export const CONFLICT_MAX_CANDIDATES = 40

/** SPEC §7.2 「body 요약 **300자**」. 넘으면 잘라서 싣는다. */
export const CONFLICT_BODY_CHARS = 300

/** SPEC §7 「실패 시 오류 위치를 넣어 **1회** 재시도」. */
export const CONFLICT_RETRIES = 1

/** 재시도 프롬프트에 실어 보내는 오류 개수 — 전부 실으면 프롬프트가 오류로 가득 찬다. */
const MAX_REPORTED_ISSUES = 5

/** 응답의 출력 토큰 상한. 충돌 20장(`AI_MAX_CONFLICTS`)이 들어갈 만큼이다. */
const MAX_OUTPUT_TOKENS = 4_000

// ---------------------------------------------------------------------
//  프롬프트에 실리는 항목 한 줄 — 본문이 아니라 **요약**이다
// ---------------------------------------------------------------------

type RevisionOrigin = (typeof REVISION_ORIGINS)[number]

/** 프롬프트가 아는 항목의 전부. 여기 없는 칸은 모델도 못 본다. */
interface ItemBrief {
  readonly id: string
  readonly type: ItemType
  readonly scope: Scope
  readonly title: string
  readonly body: string
  /** `doc_vs_code` 는 이 칸이 없으면 판정이 불가능하다 (표의 `hint` 가 이 이름을 쓴다). */
  readonly origin: RevisionOrigin
  readonly valid_until: string | null
}

/** `project` · `domain:billing` 처럼 한 줄로 접는다 — 같은 scope 를 문자열로 견준다. */
function scopeKey(scope: Scope): string {
  return scope.kind === 'project' ? 'project' : `${scope.kind}:${scope.value}`
}

const ITEM_BRIEF_COLUMNS = {
  id: contextItems.publicId,
  type: contextItems.type,
  scope: contextItems.scope,
  title: contextItemRevisions.title,
  body: contextItemRevisions.body,
  origin: contextItemRevisions.origin,
  valid_until: contextItemRevisions.validUntil,
} as const

/** 한 항목을 프롬프트 한 덩어리로. **본문은 `CONFLICT_BODY_CHARS` 까지만 싣는다.** */
function renderItem(item: ItemBrief): string {
  const head = `[${item.id}] type=${item.type} scope=${scopeKey(item.scope)} origin=${item.origin}`
  const until = item.valid_until === null ? '' : ` valid_until=${item.valid_until}`
  const body = item.body.length > CONFLICT_BODY_CHARS
    ? `${item.body.slice(0, CONFLICT_BODY_CHARS)}…(잘림)`
    : item.body
  return `${head}${until}\n제목: ${item.title}\n내용: ${body}`
}

const SYSTEM = [
  AI_SYSTEM_COMMON,
  '',
  '이번 일: 팀 항목들 사이에서 **어긋나는 짝**을 찾아 사람에게 물을 질문을 만든다.',
  '- 🔴 어느 쪽이 맞는지 **판단하지 마라.** 최신·정답을 고르는 것은 사람이다.',
  '  네가 내는 것은 판정이 아니라 **질문**이다.',
  '- 짝은 프롬프트에 실린 항목 id 로만 가리킨다. 실리지 않은 id 를 쓰면 응답 전체가 버려진다.',
  '- 확실히 어긋나는 것만 낸다. 애매하면 내지 마라 — 빈 목록도 옳은 답이다.',
  '- 같은 짝을 두 번 내지 않는다.',
  '',
  '충돌 종류:',
  //  🔴 표(`CONFLICT_KIND_RULES`)를 **읽어서** 싣는다. 종류가 늘면 이 문단이 따라온다 —
  //     여기에 손으로 적으면 표에 줄을 더한 다음 사람이 이 문장을 반드시 빠뜨린다.
  ...DETECTED_CONFLICT_KINDS.map((kind) => `- ${kind}: ${CONFLICT_KIND_RULES[kind].hint}`),
  '',
  `두 쪽이 필요한 종류는 b_item_id 를 반드시 채운다: ${DETECTED_CONFLICT_KINDS.filter((k) => CONFLICT_KIND_RULES[k].needsB).join(', ')}`,
].join('\n')

function toolRequest(changed: readonly ItemBrief[], candidates: readonly ItemBrief[], complaint?: string): ToolCallRequest {
  const head = [
    `바뀐 항목 ${changed.length}개와, 같은 type 의 기존 항목 ${candidates.length}개가 아래에 있다.`,
    '각 항목의 scope= 줄이 그 규칙이 미치는 범위다 — scope 가 다른 둘은 범위가 안 겹치면 어긋난 것이 아니다.',
    '바뀐 항목이 **적어도 한쪽에 있는** 짝만 낸다.',
  ]
  if (complaint) {
    //  🔴 SPEC §7 「실패 시 **오류 위치를 넣어** 1회 재시도」.
    head.push('', `⚠ 직전 응답이 계약과 맞지 않았다. 아래를 고쳐서 다시 내라: ${complaint}`)
  }
  const bodyText = [
    '## 바뀐 항목',
    changed.map(renderItem).join('\n\n'),
    '',
    '## 기존 항목',
    candidates.length > 0 ? candidates.map(renderItem).join('\n\n') : '(없다)',
  ].join('\n')

  return {
    system: SYSTEM,
    user: `${head.join('\n')}\n\n${untrusted(bodyText)}`,
    //  SPEC §7 「responseJsonSchema = 해당 Zod 의 JSON Schema」 — 계약이 두 벌이 되지 않는다.
    //  (도구 이름·설명은 없다 — Gemini 는 스키마로 출력을 고정한다. 2026-09-06 INBOX)
    inputSchema: toJsonSchemaOf(AiConflictOutput),
    maxTokens: MAX_OUTPUT_TOKENS,
  }
}

// ---------------------------------------------------------------------
//  LLM 왕복 한 번 — 부르고 · Zod 로 다시 판다
// ---------------------------------------------------------------------

/** 계약과 다른 응답. **1회 재시도의 근거**가 되는 문장을 들고 다닌다 (SPEC §7). */
class OutputInvalid extends Error {}

function issueText(issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[]): string {
  return issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join(' · ')
}

/**
 * 도구가 낸 `unknown` 을 **계약으로 다시 판다.** 여기가 P1 의 방어선이고,
 * Zod 가 못 재는 셋을 더 잰다:
 *   ① 프롬프트에 없던 항목 id → **모델이 지어낸 근거다** (P7 이 무너지는 자리)
 *   ② 표가 두 쪽을 요구하는 종류인데 `b_item_id` 가 없다 (`CONFLICT_KIND_RULES.needsB`)
 *   ③ 자기 자신과의 충돌 · 같은 짝의 중복
 */
function convert(raw: unknown, known: ReadonlySet<string>, changed: ReadonlySet<string>): AiConflict[] {
  const parsed = AiConflictOutput.safeParse(raw)
  if (!parsed.success) throw new OutputInvalid(issueText(parsed.error.issues))

  const seen = new Set<string>()
  for (const c of parsed.data.conflicts) {
    const where = `충돌 "${c.question.slice(0, 30)}"`
    for (const id of [c.a_item_id, c.b_item_id]) {
      if (id !== undefined && !known.has(id)) {
        throw new OutputInvalid(`${where} 이 프롬프트에 없는 항목 ${id} 를 가리킨다`)
      }
    }
    if (CONFLICT_KIND_RULES[c.kind].needsB && c.b_item_id === undefined) {
      throw new OutputInvalid(`${where} 의 kind=${c.kind} 는 b_item_id 가 있어야 한다`)
    }
    if (c.a_item_id === c.b_item_id) {
      throw new OutputInvalid(`${where} 이 같은 항목 ${c.a_item_id} 를 양쪽에 두었다`)
    }
    //  바뀐 항목이 한쪽에도 없으면 이번 탐지의 결과가 아니다 — 그냥 옛 항목 둘이다.
    if (!changed.has(c.a_item_id) && !(c.b_item_id !== undefined && changed.has(c.b_item_id))) {
      throw new OutputInvalid(`${where} 에 이번에 바뀐 항목이 한쪽도 없다`)
    }
    //  짝의 순서가 뒤집혀도 같은 짝이다 — 카드가 두 장 뜨면 사람이 같은 것을 두 번 본다.
    const pair = [c.a_item_id, c.b_item_id ?? ''].sort().join('|')
    const key = `${c.kind} ${pair}`
    if (seen.has(key)) throw new OutputInvalid(`${where} 이 같은 짝(${pair})을 두 번 냈다`)
    seen.add(key)
  }
  return parsed.data.conflicts
}

// ---------------------------------------------------------------------
//  공개 문
// ---------------------------------------------------------------------

export interface ConflictInput {
  readonly projectId: string
  /** 바뀐 항목의 **`item_<slug>`** 다 (uuid 가 아니다 — 모델이 보는 이름이 이것이다). */
  readonly changedItemIds: readonly string[]
  /** 빈도의 열쇠가 아니다 (`conflict` 는 project 범위다) — 장부의 행위자다. */
  readonly actor?: string
  readonly now?: Date
}

export interface ConflictResult {
  /** **심각도가 높은 것부터.** 화면 4 는 카드 10장만 보여 준다 (§9). */
  readonly conflicts: AiConflict[]
  /**
   * 견줄 상대로 실은 기존 항목 수와, 같은 type 으로 찾은 전체 수.
   * **`used < total` 이면 뒤를 안 본 것이다** — 화면이 그 사실을 사람에게 말해야 한다.
   */
  readonly candidates: { readonly used: number; readonly total: number }
}

/** 심각도 내림차순 → 같으면 항목 id 순. **같은 입력은 같은 순서다.** */
function bySeverity(a: AiConflict, b: AiConflict): number {
  const rank = CONFLICT_SEVERITY_RANK[b.severity] - CONFLICT_SEVERITY_RANK[a.severity]
  if (rank !== 0) return rank
  return a.a_item_id < b.a_item_id ? -1 : a.a_item_id > b.a_item_id ? 1 : 0
}

/**
 * 🔴 SPEC §7.2 `detectConflicts(projectId, changedItemIds)` — 어긋난 짝을 질문으로 만든다.
 *
 * ⚠ **이 함수는 `conflicts` 표에 쓰지 않는다.** 낸 것을 행으로 만드는 것은 부르는
 *   쪽의 일이다 (docs/feedback/FINDINGS.md — 아직 그 자리가 없다).
 *
 * @throws ApiError `BUDGET_EXCEEDED`·`RATE_LIMITED` — 예산 가드가 막았다 (SPEC §7.5).
 * @throws ApiError `AI_OUTPUT_INVALID` — 재시도까지 계약과 다른 응답이 왔다 (SPEC §7).
 * @throws ApiError `AI_NOT_CONFIGURED` — 키 없는 배포 (`client.ts` · INBOX G9). 픽스처로 떨어지는 갈래는 없다.
 */
export async function detectConflicts(input: ConflictInput): Promise<ConflictResult> {
  const db = getDb()
  const empty: ConflictResult = { conflicts: [], candidates: { used: 0, total: 0 } }
  if (input.changedItemIds.length === 0) return empty

  const changed = (await db
    .select(ITEM_BRIEF_COLUMNS)
    .from(contextItems)
    .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
    .where(and(
      eq(contextItems.projectId, input.projectId),
      inArray(contextItems.publicId, [...input.changedItemIds]),
    ))
    .orderBy(asc(contextItems.publicId))) as ItemBrief[]

  //  없는 항목을 물어봤다면 부를 것이 없다. **지어내지 않는다** — 빈 결과가 답이다.
  if (changed.length === 0) return empty

  //  🔴 SPEC §7.2 「같은 type 의 기존 active 항목」. type 만 DB 가 좁힌다 — 한 프로젝트의
  //     active 항목 수는 §7.3 이 150개로 묶어 두었으므로 전부 읽어도 한 줌이다.
  //  ⚠ scope 로는 거르지 않는다 (FINDINGS 146). scope 는 §7.1 에서 **모델이 항목마다
  //     고르는** 값이라, 그것으로 후보를 거르면 같은 규칙이 실행마다 `project` 와
  //     `path:src/…` 사이를 오가며 후보가 3 ↔ 0 으로 갈렸다. scope 는 `renderItem` 의
  //     `scope=` 줄에 실려 모델이 견준다 — 범위가 안 겹치는 둘은 모델이 짝으로 내지 않는다.
  const changedIds = new Set(changed.map((c) => c.id))
  const sameType = (await db
    .select(ITEM_BRIEF_COLUMNS)
    .from(contextItems)
    .innerJoin(contextItemRevisions, CURRENT_REVISION_JOIN)
    .where(and(
      eq(contextItems.projectId, input.projectId),
      eq(contextItems.status, 'active'),
      inArray(contextItems.type, [...new Set(changed.map((c) => c.type))]),
    ))
    //  ⚠ 40개로 자를 때 **무엇이 잘리는가**가 곧 무엇을 못 보는가다. 우선순위 높은
    //     항목부터 싣고, 같으면 id 순으로 고정한다 (같은 입력 → 같은 프롬프트).
    .orderBy(desc(contextItems.priority), asc(contextItems.publicId))) as ItemBrief[]

  const matched = sameType.filter((i) => !changedIds.has(i.id))
  const candidates = matched.slice(0, CONFLICT_MAX_CANDIDATES)

  //  견줄 상대가 없고 바뀐 항목도 하나뿐이면 짝이 나올 수 없다 — 부르지 않는다.
  if (candidates.length === 0 && changed.length < 2) {
    return { conflicts: [], candidates: { used: 0, total: matched.length } }
  }

  const known = new Set([...changedIds, ...candidates.map((c) => c.id)])
  const inputChars = [...changed, ...candidates].reduce((sum, i) => sum + renderItem(i).length, 0)

  const conflicts = await withBudget(
    'conflict',
    {
      projectId: input.projectId,
      actor: input.actor,
      //  ⚠ 본문이 아니라 **글자수**만 넘긴다 (P1). 예산 가드는 항목을 보지 않는다.
      inputChars,
      now: input.now,
    },
    async () => {
      let inputTokens = 0
      let outputTokens = 0
      let model = currentModel()
      let complaint: string | undefined

      for (let attempt = 0; attempt <= CONFLICT_RETRIES; attempt++) {
        const call = await callModel(toolRequest(changed, candidates, complaint))
        //  ⚠ 실패한 시도의 토큰도 더한다. 안 더하면 재시도가 장부 밖에서 예산을 태운다.
        inputTokens += call.inputTokens
        outputTokens += call.outputTokens
        model = call.model
        try {
          //  🔴 잘린 응답은 계약 위반보다 먼저 가른다 — `structure.ts` 와 같은 판단 (FINDINGS 144).
          if (call.truncated) throw new OutputInvalid(OUTPUT_TRUNCATED_COMPLAINT)
          return { value: convert(call.value, known, changedIds), model, inputTokens, outputTokens }
        } catch (err) {
          if (!(err instanceof OutputInvalid)) throw err
          complaint = err.message
        }
      }
      throw new ApiError(
        'AI_OUTPUT_INVALID',
        `AI 응답이 계약과 맞지 않는다 (${CONFLICT_RETRIES + 1}회): ${complaint}`,
      )
    },
  )

  return {
    conflicts: [...conflicts].sort(bySeverity),
    candidates: { used: candidates.length, total: matched.length },
  }
}
