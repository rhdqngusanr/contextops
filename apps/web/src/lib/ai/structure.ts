import {
  AiStructureOutput,
  ITEM_ID_BODY_MAX,
  parseContextItemDraft,
  toJsonSchemaOf,
  type AiSourceSpan,
  type ContextItemDraft,
  type ItemType,
  type SourceDocumentKind,
  type SourceRef,
} from '@contextops/schema'

import { ApiError } from '../api/error'
import { withBudget } from './budget'
import { callClaude, type ToolCallRequest } from './client'
import { currentModel } from './model'
import { AI_SYSTEM_COMMON, untrusted } from './prompt'

// =====================================================================
//  apps/web/src/lib/ai/structure.ts — 문서 구조화 (SPEC §7.1 · P3)
//
//  문서 하나 → 항목 초안 + 열린 질문 + 병합 후보.
//
//  🔴 **LLM 호출은 전부 `withBudget('structure', …)` 안에서 일어난다** (P3).
//
//  🔴 **왜 chunk 마다가 아니라 문서 하나에 `withBudget` 한 번인가**
//     SPEC §7.5 는 「문서 구조화는 프로젝트당 **시간당 5회**」다. `withBudget` 은
//     장부(`ai_usage`)의 **행 수**로 빈도를 세므로, chunk 마다 부르면 그 5회가
//     「문서 5개」가 아니라 「chunk 5개」가 된다 — 6조각짜리 문서 **하나**가
//     상한을 넘긴다. 그래서 한 문서의 모든 chunk 호출을 문 하나 안에 넣고,
//     장부에는 그 문서의 **합계** 토큰으로 한 줄을 남긴다.
//     ⚠ 그래서 하루 예산의 사전 추정도 **문서 전체 글자수**로 잰다. 12 chunk ×
//        10,000자 = 120,000자 ≈ 48,000 토큰이라 `AI_MAX_INPUT_TOKENS`(60k) 안이다 —
//        두 숫자가 서로 맞물려 있으니 한쪽을 고치면 다른 쪽을 같이 봐라.
//     ⚠ 도중에 실패하면 그때까지 쓴 **실제** 토큰 대신 추정치가 장부에 남는다
//        (`withBudget` 의 catch). 추정치가 더 크므로 예산을 적게 세지는 않는다.
//
//  ⚠ SPEC §11 — 문서 본문은 `<untrusted>` 로만 들어가고, 어디에도 로그하지 않는다.
// =====================================================================

// ---------------------------------------------------------------------
//  §7.1 의 수치 — 여기가 정본이다. 라우트·시험은 이 상수를 읽는다
// ---------------------------------------------------------------------

/** SPEC §7.1 「heading 기준 chunk(6~10k자)」의 상한. 한 chunk 는 이보다 크지 않다. */
export const STRUCTURE_CHUNK_MAX_CHARS = 10_000

/**
 * 같은 줄의 하한. **마지막 chunk 를 빼면** 모든 chunk 가 이보다 크다.
 * ★ 왜 하한이 필요한가 — heading 마다 끊으면 5백자짜리 chunk 가 열 개 나오고,
 *   호출 수가 곧 돈이다. 다음 조각이 안 들어갈 때 지금 chunk 가 하한에 못 미치면
 *   그 조각을 **쪼개서** 채운다.
 */
export const STRUCTURE_CHUNK_MIN_CHARS = 6_000

/** SPEC §7.1 「예산: 문서당 최대 12 chunk」. 넘는 조각은 읽지 않고 결과에 숫자로 밝힌다. */
export const STRUCTURE_MAX_CHUNKS = 12

/** SPEC §7 「실패 시 오류 위치를 넣어 **1회** 재시도」. */
export const STRUCTURE_RETRIES = 1

/** 재시도 프롬프트에 실어 보내는 오류 개수 — 전부 실으면 프롬프트가 오류로 가득 찬다. */
const MAX_REPORTED_ISSUES = 5

/** 한 chunk 응답의 출력 토큰 상한. 항목 40개 + 질문 20개가 들어갈 만큼이다. */
const CHUNK_MAX_OUTPUT_TOKENS = 8_000

const TOOL_NAME = 'record_context_items'

// ---------------------------------------------------------------------
//  문서 종류 6종이 프롬프트에서 하는 일 (SPEC §7.1 · FINDINGS 82)
// ---------------------------------------------------------------------

/**
 * 🔴 **사람이 화면 3 에서 고른 `kind` 가 모델이 읽는 한 줄이 되는 자리다.**
 * 이 표가 없으면 「정책」으로 올리든 「회의록」으로 올리든 프롬프트가 한 글자도 다르지
 * 않다 — 고르는 칸만 있고 고른 값이 아무것도 안 바꾸는 상태였다 (FINDINGS 82).
 *
 * ★ 왜 화면 라벨(`components/chips.tsx` 의 `SOURCE_DOCUMENT_KIND_LABEL`)과 **따로** 두나
 *   저쪽은 사람이 고를 때 읽는 낱말이고 이쪽은 모델에게 주는 안내다. 한 글자를 두 곳에
 *   쓰면 화면 문구를 다듬는 바퀴가 §7.1 의 결과를 조용히 바꾼다 — 프롬프트는 화면이
 *   아니라 여기서만 바뀌어야 한다.
 * ⚠ 여기 적는 것은 **문서가 무엇인가**까지다. 「없으면 지어내라」로 읽힐 문장을 넣지
 *   마라 — 공통 금지(`AI_SYSTEM_COMMON`)와 싸우면 환각이 그 틈으로 들어온다.
 *
 * // 새 SourceDocumentKind 하나: ①`packages/schema` 의 `SOURCE_DOCUMENT_KINDS`
 * //   ②`db/schema.ts` 의 pgEnum(마이그레이션이 붙는다) ③화면 라벨
 * //   `SOURCE_DOCUMENT_KIND_LABEL` ④**이 표** ⑤`ai-structure.test.ts` 의
 * //   「여섯 종류가 서로 다른 프롬프트를 만든다」— ④를 빠뜨리면 타입이 막는다
 */
export const SOURCE_DOCUMENT_KIND_BRIEF: Record<SourceDocumentKind, string> = {
  goal: '팀이 무엇을 왜 하는지 적은 **목표 문서**다. 목표·미션이 주로 들어 있다.',
  policy: '팀이 지켜야 할 것을 적은 **정책 문서**다. 규칙과 그 강제 수단이 주로 들어 있다.',
  roadmap: '언제 무엇을 하는지 적은 **로드맵**이다. 마일스톤과 기한이 주로 들어 있다.',
  adr: '무엇을 왜 그렇게 정했는지 적은 **결정 기록(ADR)** 이다. 선택지와 그 근거가 주로 들어 있다.',
  notes: '회의나 논의를 적은 **메모**다. 아직 정해지지 않은 이야기가 섞여 있으니, 확정처럼 읽지 말고 애매하면 open_question 으로 낸다.',
  wiki: '팀이 오래 쌓아 온 **위키 문서**다. 여러 주제가 한 문서에 섞여 있을 수 있다.',
}

// ---------------------------------------------------------------------
//  chunk — 순수 함수다. LLM 도 시각도 난수도 없다
// ---------------------------------------------------------------------

/** 문서의 한 조각. `text` 는 항상 `content.slice(startChar, endChar)` 다. */
export interface DocChunk {
  readonly index: number
  readonly startChar: number
  readonly endChar: number
  readonly text: string
  /** 이 조각이 시작하는 자리의 heading 계보 (`['3. 규칙', '3.1 재시도']`). */
  readonly headingPath: readonly string[]
}

interface Segment {
  start: number
  end: number
  readonly path: readonly string[]
}

const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm
/** `SourceRef.heading_path` 의 원소 상한과 같다 (`packages/schema` 의 계약). */
const HEADING_TITLE_MAX = 200

/** heading 을 경계로 문서를 잘라 **빈틈 없이 이어지는** 구간 목록을 만든다. */
function segments(content: string): Segment[] {
  const marks: { start: number; level: number; title: string }[] = []
  HEADING.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = HEADING.exec(content)) !== null) {
    marks.push({ start: m.index, level: m[1]!.length, title: m[2]!.slice(0, HEADING_TITLE_MAX) })
  }

  const out: Segment[] = []
  //  첫 heading 앞의 머리말도 근거가 될 수 있다 — 버리지 않는다.
  const firstHeading = marks.length > 0 ? marks[0]!.start : content.length
  if (firstHeading > 0) out.push({ start: 0, end: firstHeading, path: [] })

  const stack: { level: number; title: string }[] = []
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]!
    while (stack.length > 0 && stack[stack.length - 1]!.level >= mark.level) stack.pop()
    stack.push(mark)
    out.push({
      start: mark.start,
      end: i + 1 < marks.length ? marks[i + 1]!.start : content.length,
      path: stack.map((s) => s.title),
    })
  }
  return out
}

/** 줄 경계에서 자른다 — 문장 한가운데를 끊으면 근거 구간이 읽을 수 없게 된다. */
function cutPoint(content: string, after: number, target: number): number {
  const nl = content.lastIndexOf('\n', target - 1)
  return nl > after ? nl + 1 : target
}

/** heading 하나가 상한보다 크면 그 안에서 다시 자른다. */
function splitOversized(content: string, seg: Segment): Segment[] {
  const out: Segment[] = []
  let cursor = seg.start
  while (seg.end - cursor > STRUCTURE_CHUNK_MAX_CHARS) {
    const cut = cutPoint(content, cursor, cursor + STRUCTURE_CHUNK_MAX_CHARS)
    out.push({ start: cursor, end: cut, path: seg.path })
    cursor = cut
  }
  out.push({ start: cursor, end: seg.end, path: seg.path })
  return out
}

/**
 * 🔴 SPEC §7.1 의 「heading 기준 chunk(6~10k자)」. **순수 함수다** — 같은 문서는 항상
 * 같은 조각으로 갈린다. 조각의 합은 문서 전체이고 서로 겹치지 않는다 (시험이 잰다).
 */
export function chunkByHeading(content: string): DocChunk[] {
  if (content.length === 0) return []
  const queue = segments(content).flatMap((s) => splitOversized(content, s))

  const chunks: DocChunk[] = []
  let start = -1
  let end = -1
  let path: readonly string[] = []
  const flush = (): void => {
    chunks.push({ index: chunks.length, startChar: start, endChar: end, text: content.slice(start, end), headingPath: path })
    start = -1
  }

  let i = 0
  while (i < queue.length) {
    const seg = queue[i]!
    if (start < 0) {
      start = seg.start; end = seg.end; path = seg.path; i++
      continue
    }
    if (seg.end - start <= STRUCTURE_CHUNK_MAX_CHARS) {
      end = seg.end; i++
      continue
    }
    //  안 들어간다. 지금 chunk 가 하한을 넘었으면 여기서 끊고, 못 미치면 조각을 쪼갠다.
    if (end - start < STRUCTURE_CHUNK_MIN_CHARS) {
      const cut = cutPoint(content, seg.start, start + STRUCTURE_CHUNK_MAX_CHARS)
      if (cut > seg.start) {
        end = cut
        queue[i] = { start: cut, end: seg.end, path: seg.path }
      }
    }
    flush()
  }
  if (start >= 0) flush()
  return chunks
}

// ---------------------------------------------------------------------
//  LLM 왕복 한 번 — 부르고 · Zod 로 다시 판다
// ---------------------------------------------------------------------

/** 계약과 다른 응답. **1회 재시도의 근거**가 되는 문장을 들고 다닌다 (SPEC §7). */
class OutputInvalid extends Error {}

const SYSTEM = [
  AI_SYSTEM_COMMON,
  '',
  '이번 일: 팀 문서의 한 조각을 읽고 ContextOps 항목으로 옮겨 적는다.',
  '- 항목 하나 = 문서에 실제로 적힌 목표·규칙·결정·절차 하나다. 요약문을 새로 쓰지 않는다.',
  '- id 는 `item_` 으로 시작하는 소문자·숫자·밑줄 slug 다 (예: item_refund_sla).',
  '- span 은 그 항목의 근거가 있는 구간이다. **조각 기준 offset** 이고 end_char 는 exclusive 다.',
  '- 조각 밖을 가리키는 span 은 근거가 아니다. 범위를 벗어나면 응답 전체가 버려진다.',
  '- 문서가 무엇을 뜻하는지 판단이 필요하면 항목 대신 open_questions 에 질문으로 남긴다.',
].join('\n')

function toolRequest(chunk: DocChunk, totalChunks: number, kind: SourceDocumentKind, complaint?: string): ToolCallRequest {
  const head = [
    //  🔴 사람이 고른 문서 종류가 모델에게 전달되는 유일한 자리다 (FINDINGS 82).
    `이 문서는 ${SOURCE_DOCUMENT_KIND_BRIEF[kind]}`,
    `문서를 ${totalChunks}조각으로 나눈 것 중 ${chunk.index + 1}번째다.`,
    chunk.headingPath.length > 0
      ? `이 조각이 속한 제목: ${chunk.headingPath.join(' > ')}`
      : '이 조각은 문서 머리말이다.',
    `span 의 offset 은 아래 블록 기준이고 0 이상 ${chunk.text.length} 이하여야 한다.`,
  ]
  if (complaint) {
    //  🔴 SPEC §7 「실패 시 **오류 위치를 넣어** 1회 재시도」.
    head.push('', `⚠ 직전 응답이 계약과 맞지 않았다. 아래를 고쳐서 다시 내라: ${complaint}`)
  }
  return {
    system: SYSTEM,
    user: `${head.join('\n')}\n\n${untrusted(chunk.text)}`,
    toolName: TOOL_NAME,
    toolDescription: '이 조각에서 찾은 팀 컨텍스트 항목과 열린 질문을 기록한다.',
    //  SPEC §7 「input_schema = 해당 Zod 의 JSON Schema」 — 계약이 두 벌이 되지 않는다.
    inputSchema: toJsonSchemaOf(AiStructureOutput),
    maxTokens: CHUNK_MAX_OUTPUT_TOKENS,
  }
}

function issueText(issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[]): string {
  return issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join(' · ')
}

/** chunk offset → 문서 offset. **범위 밖이면 재시도한다** (SPEC §7.1). */
function toSourceRef(span: AiSourceSpan, chunk: DocChunk, documentVersionId: string, where: string): SourceRef {
  if (span.end_char <= span.start_char || span.end_char > chunk.text.length) {
    throw new OutputInvalid(
      `${where} 의 span 이 조각 밖이다 (${span.start_char}~${span.end_char}) — 0 이상 ${chunk.text.length} 이하여야 하고 end_char 가 더 커야 한다`,
    )
  }
  return {
    kind: 'source_document',
    document_version_id: documentVersionId,
    start_char: chunk.startChar + span.start_char,
    end_char: chunk.startChar + span.end_char,
    heading_path: span.heading_path.length > 0 ? span.heading_path : [...chunk.headingPath],
  }
}

/** 열린 질문 하나 — SPEC §7.1 출력의 `open_questions` 다. */
export interface OpenQuestion {
  readonly question: string
  readonly source_ref: SourceRef
}

interface ChunkYield {
  readonly items: ContextItemDraft[]
  readonly questions: OpenQuestion[]
}

/** 도구가 낸 `unknown` 을 **계약으로 다시 판다.** 여기가 P1 의 방어선이다. */
function convert(raw: unknown, chunk: DocChunk, documentVersionId: string): ChunkYield {
  const parsed = AiStructureOutput.safeParse(raw)
  if (!parsed.success) throw new OutputInvalid(issueText(parsed.error.issues))
  //  ⚠ `item.ts` 의 `parseContextItem` 과 같은 자리의 캐스트다 — 표를 도는 유니온은
  //     런타임은 정확한데 TS 추론이 느슨해진다. 정밀한 타입은 손으로 적은 쪽이다.
  const data = parsed.data as AiStructureOutput

  const items = data.items.map((item) => {
    const { span, ...rest } = item
    const source_refs = [toSourceRef(span, chunk, documentVersionId, `항목 ${item.id}`)]
    try {
      //  ⚠ AI 계약이 아니라 **진짜 초안 계약**으로 한 번 더 판다 — 근거를 붙인 뒤의
      //    모양이 서버가 받는 모양과 같아야 한다 (SPEC §3.1 allowlist).
      return parseContextItemDraft({ ...rest, source_refs })
    } catch {
      throw new OutputInvalid(`항목 ${item.id} 이 초안 계약과 맞지 않는다`)
    }
  })

  const questions = data.open_questions.map((q) => ({
    question: q.question,
    source_ref: toSourceRef(q.span, chunk, documentVersionId, `질문 "${q.question.slice(0, 30)}"`),
  }))

  return { items, questions }
}

interface ChunkCall extends ChunkYield {
  readonly model: string
  readonly inputTokens: number
  readonly outputTokens: number
}

/**
 * chunk 하나: 부르고 → Zod 로 다시 판다 → 어긋나면 **오류 위치를 넣어 1회 재시도** →
 * 재실패면 `AI_OUTPUT_INVALID` (SPEC §7 공통 규약).
 */
async function structureChunk(
  chunk: DocChunk,
  totalChunks: number,
  kind: SourceDocumentKind,
  documentVersionId: string,
): Promise<ChunkCall> {
  let inputTokens = 0
  let outputTokens = 0
  let model = currentModel()
  let complaint: string | undefined

  for (let attempt = 0; attempt <= STRUCTURE_RETRIES; attempt++) {
    const call = await callClaude(toolRequest(chunk, totalChunks, kind, complaint))
    //  ⚠ 실패한 시도의 토큰도 더한다. 안 더하면 재시도가 장부 밖에서 예산을 태운다.
    inputTokens += call.inputTokens
    outputTokens += call.outputTokens
    model = call.model
    try {
      const { items, questions } = convert(call.value, chunk, documentVersionId)
      return { items, questions, model, inputTokens, outputTokens }
    } catch (err) {
      if (!(err instanceof OutputInvalid)) throw err
      complaint = err.message
    }
  }
  throw new ApiError('AI_OUTPUT_INVALID', `AI 응답이 계약과 맞지 않는다 (${STRUCTURE_RETRIES + 1}회): ${complaint}`)
}

// ---------------------------------------------------------------------
//  문서 전체 — 중복 id 를 가르고 병합 후보를 표시한다 (LLM 없이)
// ---------------------------------------------------------------------

/** SPEC §7.1 「전체 title/type 중복 병합 후보 표시」. **결정은 사람이 한다.** */
export interface MergeCandidate {
  readonly type: ItemType
  readonly title: string
  readonly item_ids: string[]
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * 같은 id 를 두 chunk 가 내면 뒤엣것에 `_2` 를 붙여 가른다.
 * ★ 왜 버리지 않나 — 같은 slug 를 골랐다고 같은 항목이라는 보장이 없다. 판단은 사람이
 *   하고(병합 후보), 여기서는 **뒤에서 터지지 않게** 이름만 갈라 둔다.
 *   ⚠ 항목 id 는 프로젝트 안에서 유일하다 (`context_items` 의 unique 제약).
 */
function uniqueId(id: string, taken: Set<string>): string {
  if (!taken.has(id)) return id
  const body = id.slice('item_'.length)
  for (let n = 2; n < 100; n++) {
    const suffix = `_${n}`
    const next = `item_${body.slice(0, ITEM_ID_BODY_MAX - suffix.length)}${suffix}`
    if (!taken.has(next)) return next
  }
  throw new ApiError('AI_OUTPUT_INVALID', `같은 항목 id 가 너무 많다: ${id}`)
}

function mergeCandidates(items: readonly ContextItemDraft[]): MergeCandidate[] {
  const groups = new Map<string, { type: ItemType; title: string; item_ids: string[] }>()
  for (const item of items) {
    const key = `${item.type} ${normalizeTitle(item.title)}`
    const found = groups.get(key)
    if (found) found.item_ids.push(item.id)
    else groups.set(key, { type: item.type, title: item.title, item_ids: [item.id] })
  }
  return [...groups.values()].filter((g) => g.item_ids.length > 1)
}

export interface StructureInput {
  readonly projectId: string
  /** 근거가 가리킬 문서 버전. **모델이 아니라 서버가 아는 값이다** (P7). */
  readonly documentVersionId: string
  /**
   * 사람이 올릴 때 고른 문서 종류. **없어도 되는 값으로 두지 않는다** — 기본값을 주면
   * 부르는 자리가 넘기는 것을 잊어도 조용히 돌고, 그게 이 값이 죽어 있던 이유다
   * (FINDINGS 82). 무엇이 되는지는 `SOURCE_DOCUMENT_KIND_BRIEF` 표가 정한다.
   */
  readonly kind: SourceDocumentKind
  readonly content: string
  /** 빈도 제한의 열쇠가 아니다 (`structure` 는 project 범위다) — 장부의 행위자다. */
  readonly actor?: string
  readonly now?: Date
  /**
   * 🔴 조각 하나를 읽을 때마다 부른다 (FINDINGS 62). **첫 번은 읽기 전에**
   * `(0, total)` 이다 — 화면이 「몇 조각짜리 일인가」를 첫 polling 에 알아야
   * 회전이 막대가 된다.
   *
   * ★ 왜 여기서 DB 에 쓰지 않나 — 이 파일은 값을 낼 뿐 행을 쓰지 않는다
   *   (파일 머리 주석 · 쓰는 자리는 `lib/ai/job.ts` 하나다). 그래서 진행도
   *   **부르는 쪽이** 어디에 남길지 정한다.
   * ⚠ `total` 은 12 chunk 상한에서 **잘린 뒤**의 수다 — 실제로 읽을 조각만 센다.
   *   잘렸다는 사실은 끝난 뒤 `chunks {used,total}` 이 말한다.
   */
  readonly onProgress?: (done: number, total: number) => Promise<void> | void
}

export interface StructureResult {
  readonly items: ContextItemDraft[]
  readonly open_questions: OpenQuestion[]
  readonly merge_candidates: MergeCandidate[]
  /**
   * 읽은 조각 수와 전체 조각 수. **`used < total` 이면 문서의 뒤를 안 읽은 것이다** —
   * 화면이 그 사실을 사람에게 말해야 한다 (조용히 자르지 않는다).
   */
  readonly chunks: { readonly used: number; readonly total: number }
}

/**
 * 🔴 SPEC §7.1 `structureDocument(docVersion)` — 문서 하나를 항목 초안으로 옮긴다.
 *
 * @throws ApiError `BUDGET_EXCEEDED`·`RATE_LIMITED` — 예산 가드가 막았다 (SPEC §7.5).
 *                  화면은 이때 픽스처 결과를 보여 준다.
 * @throws ApiError `AI_OUTPUT_INVALID` — 재시도까지 계약과 다른 응답이 왔다 (SPEC §7).
 * @throws Error `ANTHROPIC_API_KEY 가 없다` — 키 없는 배포. 고장이 아니라 §7.5 의
 *               「픽스처 결과로 떨어지는」 갈래가 받을 자리다 (화면의 일).
 */
export async function structureDocument(input: StructureInput): Promise<StructureResult> {
  const all = chunkByHeading(input.content)
  const used = all.slice(0, STRUCTURE_MAX_CHUNKS)
  if (used.length === 0) {
    return { items: [], open_questions: [], merge_candidates: [], chunks: { used: 0, total: 0 } }
  }

  const collected = await withBudget(
    'structure',
    {
      projectId: input.projectId,
      actor: input.actor,
      //  ⚠ 본문이 아니라 **글자수**만 넘긴다 (P1). 예산 가드는 문서를 보지 않는다.
      inputChars: used.reduce((sum, c) => sum + c.text.length, 0),
      now: input.now,
    },
    async () => {
      const items: ContextItemDraft[] = []
      const questions: OpenQuestion[] = []
      let inputTokens = 0
      let outputTokens = 0
      let model = currentModel()
      //  ⚠ 첫 조각을 부르기 **전에** 한 번 — 이 한 줄이 회전과 막대를 가른다.
      let done = 0
      await input.onProgress?.(done, used.length)
      for (const chunk of used) {
        const call = await structureChunk(chunk, used.length, input.kind, input.documentVersionId)
        items.push(...call.items)
        questions.push(...call.questions)
        inputTokens += call.inputTokens
        outputTokens += call.outputTokens
        model = call.model
        await input.onProgress?.(++done, used.length)
      }
      return { value: { items, questions }, model, inputTokens, outputTokens }
    },
  )

  const taken = new Set<string>()
  const items = collected.items.map((item) => {
    const id = uniqueId(item.id, taken)
    taken.add(id)
    return (id === item.id ? item : { ...item, id }) as ContextItemDraft
  })

  return {
    items,
    open_questions: collected.questions,
    merge_candidates: mergeCandidates(items),
    chunks: { used: used.length, total: all.length },
  }
}
