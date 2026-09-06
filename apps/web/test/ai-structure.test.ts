import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'

import { SOURCE_DOCUMENT_KINDS, type SourceDocumentKind } from '@contextops/schema'

import { closeDb, freshDb } from './helpers/db'
import { aiUsage } from '../src/db/schema'
import { setAiClientForTest } from '../src/lib/ai/client'
import { stubTransport, type SentRequest, type StubReply } from './helpers/ai'
import { UNTRUSTED_TAG } from '../src/lib/ai/prompt'
import {
  SOURCE_DOCUMENT_KIND_BRIEF,
  STRUCTURE_CHUNK_MAX_CHARS,
  STRUCTURE_CHUNK_MIN_CHARS,
  STRUCTURE_MAX_CHUNKS,
  STRUCTURE_RETRIES,
  chunkByHeading,
  structureDocument,
} from '../src/lib/ai/structure'
import { AI_FEATURE_LIMITS } from '../src/lib/ai/features'
import type { Db } from '../src/db/client'

// =====================================================================
//  문서 구조화 (SPEC §7.1 · P3) — 「부르는가」가 아니라 **「무엇이 갈리는가」**를 잰다
//
//  🔴 여기서 재는 것 넷:
//    ① chunk 는 순수 함수다 — 조각의 합이 문서 전체이고 두 번 돌려도 같다
//    ② 인용(quote) → **문서 offset** 계산 (P7 — 근거가 원문을 정확히 가리킨다 · 모델에게
//       숫자를 묻지 않는다 · FINDINGS 142)
//    ③ 계약과 다른 응답 → 오류 위치를 넣어 1회 재시도 → 재실패면 `AI_OUTPUT_INVALID`
//    ④ 문서 하나 = 장부 **한 줄** (SPEC §7.5 의 「시간당 5회」가 chunk 가 아니라 문서다)
//
//  ⚠ **키가 없어서 진짜 Claude 를 부른 것이 아니다.** 스텁 클라이언트로 잰다
//    (`setAiClientForTest`) — 실제 응답의 품질은 이 시험이 말하지 않는다.
// =====================================================================

let pg: PGlite | undefined
let db: Db
const ENV_KEYS = ['AI_DAILY_BUDGET_USD', 'AI_MAX_INPUT_TOKENS', 'GEMINI_MODEL'] as const
const saved: Record<string, string | undefined> = {}

const TEAM = '22222222-2222-4222-8222-222222222222'
const PROJECT = '11111111-1111-4111-8111-111111111111'
const DOC_VERSION = '33333333-3333-4333-8333-333333333333'
const NOW = new Date('2026-09-04T12:00:00.000Z')
/** 나머지 시험이 종류를 신경 쓰지 않을 때 쓰는 값 — 종류 자체를 재는 시험은 아래 따로 있다. */
const KIND: SourceDocumentKind = 'goal'

async function seedProject(): Promise<void> {
  await pg!.query(`insert into teams (id, slug, name) values ($1, 'paylab', 'paylab')`, [TEAM])
  await pg!.query(`insert into projects (id, team_id, slug, name) values ($1, $2, 'api', 'api')`, [PROJECT, TEAM])
}

// ---------------------------------------------------------------------
//  스텁 — `generateContent` 가 받는 것을 그대로 붙잡아 둔다 (`helpers/ai.ts` 가 모양을 안다)
// ---------------------------------------------------------------------

let sent: SentRequest[] = []

/** `reply(요청번호)` 가 그 회차의 응답을 정한다. */
function stubAi(reply: (n: number) => StubReply): void {
  setAiClientForTest(stubTransport((req) => {
    const n = sent.length
    sent.push(req)
    return reply(n)
  }))
}

/** 계약을 만족하는 항목 하나. `quote` 는 **조각 원문 그대로**여야 한다 (그게 계약이다). */
function policyItem(id: string, title: string, quote: string) {
  return {
    id,
    type: 'policy',
    title,
    body: '문서에 적힌 규칙을 그대로 옮겼다.',
    scope: { kind: 'project' },
    data: { rule: '환불은 접수 후 24시간 안에 종결한다', severity: 'must', enforcement: 'review' },
    span: { quote },
  }
}

/** goals.md 에 **한 번만** 있는 문장 — 픽스처를 근거로 쓰는 시험의 인용. */
const REFUND_QUOTE = '환불 요청은 **접수 후 24시간 안에 종결**한다'

/** `doc()` 문서의 조각 `n` 안에서 한 곳에만 있는 글 — 조각의 첫 줄(heading)이다. */
function headingOf(chunks: readonly { text: string }[], n: number): string {
  return chunks[n]!.text.split('\n')[0]!
}

function output(items: unknown[], openQuestions: unknown[] = []): unknown {
  return { items, open_questions: openQuestions }
}

// ---------------------------------------------------------------------
//  문서 만들기
// ---------------------------------------------------------------------

function body(chars: number): string {
  const line = '이 문단은 결제 규칙을 설명한다. 재시도는 지수 백오프로 한다.\n'
  let out = ''
  while (out.length < chars) out += line
  return out.slice(0, chars)
}

/** 절 `sections` 개 · 절마다 `each` 자. */
function doc(sections: number, each: number): string {
  let out = '# paylab 문서\n\n머리말이다.\n\n'
  for (let i = 1; i <= sections; i++) out += `## ${i}. 절\n\n${body(each)}\n`
  return out
}

const PAYLAB_GOALS = readFileSync(
  fileURLToPath(new URL('../../../fixtures/paylab-docs/goals.md', import.meta.url)),
  'utf8',
)

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
  sent = []
  const fresh = await freshDb()
  pg = fresh.pg
  db = fresh.db
  await seedProject()
})

afterEach(async () => {
  setAiClientForTest(undefined)
  await closeDb(pg)
  pg = undefined
})

// ---------------------------------------------------------------------
describe('chunk 는 순수 함수다 (SPEC §7.1)', () => {
  it('빈 문서는 조각이 없다 — 부를 것이 없으면 부르지 않는다', () => {
    expect(chunkByHeading('')).toEqual([])
  })

  it('조각의 합이 문서 전체이고 서로 겹치지 않는다', () => {
    const content = doc(9, 4_000)
    const chunks = chunkByHeading(content)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0]!.startChar).toBe(0)
    expect(chunks[chunks.length - 1]!.endChar).toBe(content.length)
    for (const c of chunks) {
      expect(c.text).toBe(content.slice(c.startChar, c.endChar))
    }
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i]!.startChar).toBe(chunks[i - 1]!.endChar)
    }
  })

  it('모든 조각이 상한 이하이고, 마지막을 빼면 하한 이상이다', () => {
    const chunks = chunkByHeading(doc(9, 4_000))
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(STRUCTURE_CHUNK_MAX_CHARS)
    for (const c of chunks.slice(0, -1)) {
      expect(c.text.length).toBeGreaterThanOrEqual(STRUCTURE_CHUNK_MIN_CHARS)
    }
  })

  it('heading 하나가 상한보다 커도 잘린다 — 조각이 상한을 넘는 일은 없다', () => {
    const huge = `# 한 절뿐인 문서\n\n${body(STRUCTURE_CHUNK_MAX_CHARS * 3)}`
    const chunks = chunkByHeading(huge)
    expect(chunks.length).toBeGreaterThanOrEqual(3)
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(STRUCTURE_CHUNK_MAX_CHARS)
    expect(chunks.map((c) => c.text).join('')).toBe(huge)
  })

  it('heading 계보가 조각에 붙는다 — 근거의 heading_path 가 된다', () => {
    const content = '# 문서\n\n머리말\n\n## 3. 규칙\n\n본문\n\n### 3.1 재시도\n\n본문\n'
    const [only] = chunkByHeading(content)
    //  한 조각이므로 계보는 **조각이 시작하는 자리**의 것이다 (문서의 첫 heading).
    expect(only!.headingPath).toEqual(['문서'])
    //  같은 문서를 통째로 다시 자르면 절 계보가 쌓인 것을 볼 수 있다.
    const deep = chunkByHeading(content.slice(content.indexOf('### 3.1')))
    expect(deep[0]!.headingPath).toEqual(['3.1 재시도'])
  })

  it('같은 문서는 항상 같은 조각으로 갈린다 (결정론)', () => {
    const content = doc(9, 4_000)
    expect(chunkByHeading(content)).toEqual(chunkByHeading(content))
  })

  it('paylab 픽스처(goals.md)는 한 조각이다', () => {
    expect(PAYLAB_GOALS.length).toBeLessThan(STRUCTURE_CHUNK_MAX_CHARS)
    expect(chunkByHeading(PAYLAB_GOALS).length).toBe(1)
  })
})

// ---------------------------------------------------------------------
describe('근거는 모델의 숫자가 아니라 **인용에서 계산한 문서 offset** 이다 (P7 · SPEC §7.1 · FINDINGS 142)', () => {
  it('🔴 모델에게 숫자를 묻지 않는다 — 보내는 스키마에 start_char·end_char 가 없고 quote 가 있다', async () => {
    stubAi(() => ({ input: output([]) }))
    await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })
    const schema = JSON.stringify(sent[0]!.schema)
    expect(schema).not.toContain('start_char')
    expect(schema).not.toContain('end_char')
    expect(schema).toContain('"quote"')
    //  프롬프트도 같은 말을 한다 — 스키마만 바꾸고 지시는 offset 을 말하면 모델이 헷갈린다.
    expect(sent[0]!.system).toContain('원문 그대로')
    expect(sent[0]!.system).not.toContain('offset')
    expect(sent[0]!.user).not.toContain('offset')
  })

  it('두 번째 조각의 인용은 조각 시작만큼 밀린 문서 offset 이 된다', async () => {
    const content = doc(3, 4_000)
    const chunks = chunkByHeading(content)
    expect(chunks.length).toBe(2)

    stubAi((n) => ({ input: output([policyItem(`item_rule_${n}`, `규칙 ${n}`, headingOf(chunks, n))]) }))

    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content, now: NOW,
    })

    expect(result.items.length).toBe(2)
    const second = result.items[1]!.source_refs[0]!
    if (second.kind !== 'source_document') throw new Error('근거가 문서가 아니다')
    const quote = headingOf(chunks, 1)
    //  조각 기준이 아니라 **문서** 기준이다 — 문서에서 그 글자를 찾은 자리와 같다.
    expect(second.start_char).toBe(content.indexOf(quote))
    expect(second.start_char).toBe(chunks[1]!.startChar + chunks[1]!.text.indexOf(quote))
    expect(second.end_char).toBe(second.start_char + quote.length)
    expect(second.document_version_id).toBe(DOC_VERSION)
  })

  it('paylab 픽스처의 근거가 원문을 정확히 가리킨다 — 잘라 내면 인용 그대로다', async () => {
    expect(PAYLAB_GOALS.indexOf(REFUND_QUOTE)).toBeGreaterThan(0)
    stubAi(() => ({ input: output([policyItem('item_refund_sla', '환불 SLA', REFUND_QUOTE)]) }))

    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })
    const ref = result.items[0]!.source_refs[0]!
    if (ref.kind !== 'source_document') throw new Error('근거가 문서가 아니다')
    //  🔴 P7 — 근거 offset 으로 원문을 도로 꺼내면 **모델이 인용한 그 문장**이다.
    expect(PAYLAB_GOALS.slice(ref.start_char, ref.end_char)).toBe(REFUND_QUOTE)
  })

  it('🔴 「범위 안」인 숫자만으로는 못 지난다 — 원문에 없는 인용은 재시도로 간다', async () => {
    stubAi((n) => ({
      input: output([
        n === 0
          ? policyItem('item_bad', '없는 문장', '환불은 접수 후 48시간 안에 종결한다')
          : policyItem('item_okay', '있는 문장', REFUND_QUOTE),
      ]),
    }))

    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })
    expect(sent.length).toBe(2)
    expect(result.items[0]!.id).toBe('item_okay')
    //  🔴 SPEC §7 「**오류 위치를 넣어** 1회 재시도」 — 무엇이 틀렸는지가 프롬프트에 있다.
    expect(sent[1]!.user).toContain('직전 응답이 계약과 맞지 않았다')
    expect(sent[1]!.user).toContain('item_bad')
    expect(sent[1]!.user).toContain('원문에 없다')
  })

  it('여러 곳에 있는 인용도 재시도로 간다 — 어느 문장인지 정할 수 없으면 근거가 아니다', async () => {
    //  「재시도」는 goals.md 에 여러 번 나온다.
    expect(PAYLAB_GOALS.indexOf('재시도', PAYLAB_GOALS.indexOf('재시도') + 1)).toBeGreaterThan(0)
    stubAi((n) => ({
      input: output([n === 0 ? policyItem('item_vague', '낱말 하나', '재시도') : policyItem('item_okay', '문장', REFUND_QUOTE)]),
    }))

    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })
    expect(sent.length).toBe(2)
    expect(result.items[0]!.id).toBe('item_okay')
    expect(sent[1]!.user).toContain('여러 곳')
  })

  it('두 번 다 원문에 없으면 AI_OUTPUT_INVALID — 인용을 못 찾은 항목은 근거 없이 살아남지 않는다', async () => {
    stubAi(() => ({ input: output([policyItem('item_bad', '없는 문장', '이 문장은 문서에 없다')]) }))
    await expect(structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' })
    expect(sent.length).toBe(STRUCTURE_RETRIES + 1)
  })

  it('원문에 `</` 가 있어도 찾는다 — untrusted 블록의 치환을 되돌린다', async () => {
    const content = '# 규칙\n\n응답 본문은 `</body>` 로 닫는다. 그 뒤에는 아무것도 붙이지 않는다.\n'
    //  모델은 `<\body>` 로 바뀐 글을 읽었으니 그대로 인용해 온다.
    stubAi(() => ({ input: output([policyItem('item_close', '닫기', '응답 본문은 `<\\body>` 로 닫는다.')]) }))
    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content, now: NOW,
    })
    const ref = result.items[0]!.source_refs[0]!
    if (ref.kind !== 'source_document') throw new Error('근거가 문서가 아니다')
    expect(content.slice(ref.start_char, ref.end_char)).toBe('응답 본문은 `</body>` 로 닫는다.')
  })
})

// ---------------------------------------------------------------------
describe('계약과 다른 응답은 AI_OUTPUT_INVALID 다 (SPEC §7)', () => {
  it('두 번 다 어긋나면 AI_OUTPUT_INVALID — 시도 횟수는 1 + 재시도다', async () => {
    stubAi(() => ({ input: output([{ id: 'nope', type: 'policy' }]) }))

    await expect(structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' })
    expect(sent.length).toBe(STRUCTURE_RETRIES + 1)
  })

  it('도구 블록이 없는 응답도 같은 길로 간다 — 조용히 빈 결과가 되지 않는다', async () => {
    stubAi(() => ({ text: '네, 정리해 드리겠습니다.' }))

    await expect(structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' })
  })

  it('초안 계약(strict)을 어기는 여분의 키는 통과하지 못한다 (P1)', async () => {
    stubAi(() => ({
      input: output([{ ...policyItem('item_x', '규칙', REFUND_QUOTE), source_code: 'function f(){}' }]),
    }))

    await expect(structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' })
  })
})

// ---------------------------------------------------------------------
describe('예산 가드를 지난다 — 문서 하나가 장부 한 줄이다 (P3 · SPEC §7.5)', () => {
  it('세 조각을 읽어도 장부는 한 줄이고 토큰은 합계다', async () => {
    const content = doc(5, 4_000)
    expect(chunkByHeading(content).length).toBe(3)
    stubAi(() => ({
      input: output([]),
      inputTokens: 1_000,
      outputTokens: 200,
    }))

    await structureDocument({ projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content, now: NOW })

    expect(sent.length).toBe(3)
    const rows = await db.select().from(aiUsage)
    expect(rows.length).toBe(1)
    expect(rows[0]!.feature).toBe('structure')
    expect(rows[0]!.inputTokens).toBe(3_000)
    expect(rows[0]!.outputTokens).toBe(600)
  })

  it('SPEC §7.5 의 「시간당 5회」가 chunk 가 아니라 **문서**를 센다', async () => {
    const limit = AI_FEATURE_LIMITS.structure.rate!
    expect(limit.calls).toBe(5)
    stubAi(() => ({ input: output([]) }))

    for (let i = 0; i < limit.calls; i++) {
      await expect(structureDocument({
        projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
      })).resolves.toBeTruthy()
    }
    await expect(structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('하루 예산을 다 썼으면 호출이 아예 안 나간다', async () => {
    process.env.AI_DAILY_BUDGET_USD = '0'
    stubAi(() => ({ input: output([]) }))

    await expect(structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' })
    expect(sent.length).toBe(0)
  })

  it('장부에 문서 본문이 남지 않는다 (P1 · SPEC §11)', async () => {
    stubAi(() => ({ input: output([]) }))
    await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, actor: 'user-a', now: NOW,
    })
    const rows = await db.select().from(aiUsage)
    expect(JSON.stringify(rows)).not.toContain('환불')
    expect(JSON.stringify(rows)).not.toContain('user-a')
  })
})

// ---------------------------------------------------------------------
describe('문서 전체를 본다 — 중복과 잘림을 숨기지 않는다 (SPEC §7.1)', () => {
  it('두 조각이 같은 id 를 내면 뒤엣것을 갈라 준다', async () => {
    const content = doc(3, 4_000)
    const chunks = chunkByHeading(content)
    stubAi((n) => ({ input: output([policyItem('item_refund_sla', '환불 SLA', headingOf(chunks, n))]) }))

    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content, now: NOW,
    })
    expect(result.items.map((i) => i.id)).toEqual(['item_refund_sla', 'item_refund_sla_2'])
  })

  it('같은 type·title 이 두 번 나오면 병합 후보로 표시된다 — 지우지는 않는다', async () => {
    const content = doc(3, 4_000)
    const chunks = chunkByHeading(content)
    stubAi((n) => ({
      input: output([policyItem(`item_sla_${n}`, ' 환불  SLA ', headingOf(chunks, n))]),
    }))

    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content, now: NOW,
    })
    expect(result.items.length).toBe(2)
    expect(result.merge_candidates.length).toBe(1)
    expect(result.merge_candidates[0]!.type).toBe('policy')
    expect(result.merge_candidates[0]!.item_ids).toEqual(['item_sla_0', 'item_sla_1'])
  })

  it('제목이 다르면 병합 후보가 아니다 — 표가 아무 때나 켜지지 않는다', async () => {
    const content = doc(3, 4_000)
    const chunks = chunkByHeading(content)
    stubAi((n) => ({
      input: output([policyItem(`item_sla_${n}`, `규칙 ${n}`, headingOf(chunks, n))]),
    }))
    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content, now: NOW,
    })
    expect(result.merge_candidates).toEqual([])
  })

  it('12조각을 넘는 문서는 앞 12개만 읽고 그 사실을 숫자로 밝힌다', async () => {
    const content = doc(39, 3_000)
    const total = chunkByHeading(content).length
    expect(total).toBeGreaterThan(STRUCTURE_MAX_CHUNKS)
    stubAi(() => ({ input: output([]) }))

    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content, now: NOW,
    })
    expect(sent.length).toBe(STRUCTURE_MAX_CHUNKS)
    expect(result.chunks).toEqual({ used: STRUCTURE_MAX_CHUNKS, total })
  })

  it('열린 질문도 문서 offset 근거를 갖는다 — 근거 없는 질문은 없다', async () => {
    stubAi(() => ({
      input: output([], [{ question: '재시도 상한이 5회인가 3회인가?', span: { quote: REFUND_QUOTE } }]),
    }))
    const result = await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })
    expect(result.open_questions.length).toBe(1)
    expect(result.open_questions[0]!.source_ref.kind).toBe('source_document')
  })
})

// ---------------------------------------------------------------------
describe('프롬프트가 SPEC §7 · §11 을 따른다', () => {
  it('문서 본문은 <untrusted> 블록 안에만 들어간다', async () => {
    stubAi(() => ({ input: output([]) }))
    await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })
    const { user, system } = sent[0]!
    const open = user.indexOf(`<${UNTRUSTED_TAG}>`)
    expect(open).toBeGreaterThan(-1)
    //  본문은 블록이 열린 **뒤에** 있다.
    expect(user.indexOf('환불')).toBeGreaterThan(open)
    //  공통 금지가 시스템 프롬프트에 있다 (SPEC §7).
    expect(system).toContain('입력에 없는 사실·수치·기한을 만들지 않는다')
  })

  it('🔴 **종류만 바꾸면 프롬프트가 달라진다** — 여섯 값이 전부 다른 한 줄을 만든다 (FINDINGS 82)', async () => {
    const heads = new Map<SourceDocumentKind, string>()

    for (const [i, kind] of SOURCE_DOCUMENT_KINDS.entries()) {
      sent = []
      stubAi(() => ({ input: output([]) }))
      //  ⚠ 시간을 한 시간씩 민다 — 안 그러면 여섯째가 §7.5 의 「시간당 5회」에 걸린다.
      //     여기서 재는 것은 빈도가 아니라 프롬프트다.
      await structureDocument({
        projectId: PROJECT,
        documentVersionId: DOC_VERSION,
        kind,
        content: PAYLAB_GOALS,
        now: new Date(NOW.getTime() + i * 3_600_000),
      })
      //  본문이 시작하기 **전**의 머리말만 본다 — 문서 본문은 여섯 번 다 같다.
      const user = sent[0]!.user
      heads.set(kind, user.slice(0, user.indexOf(`<${UNTRUSTED_TAG}>`)))
    }

    for (const kind of SOURCE_DOCUMENT_KINDS) {
      //  ① 고른 값이 프롬프트에 있다 — 표를 읽어서 싣는다 (시험이 문장을 손으로 안 적는다).
      expect(heads.get(kind), `${kind} 의 머리말`).toContain(SOURCE_DOCUMENT_KIND_BRIEF[kind])
    }
    //  ② 🔴 여섯이 서로 **다르다.** 하나라도 겹치면 그 값은 골라도 결과가 같은 값이다.
    expect(new Set(heads.values()).size).toBe(SOURCE_DOCUMENT_KINDS.length)
  }, 30_000)

  it('도구 스키마가 Zod 계약에서 나온다 — 두 벌이 아니다', async () => {
    stubAi(() => ({ input: output([]) }))
    await structureDocument({
      projectId: PROJECT, documentVersionId: DOC_VERSION, kind: KIND, content: PAYLAB_GOALS, now: NOW,
    })
    const schema = sent[0]!.schema as { properties?: Record<string, unknown> }
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual(['items', 'open_questions'])
  })
})
