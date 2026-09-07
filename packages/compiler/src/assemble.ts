import type { ContextItem, PackTarget } from '@contextops/schema'
import { DOCS, type DocId, type DocVars, type SectionKey } from '../templates'
import { CLAUDE_MD_MAX_CHARS, RULES_MAX_CHARS } from './limits'
import { docKey, placeItem } from './partition'
import { SECTIONS, renderSection } from './sections'
import { sortItems } from './sort'
import { traceTag } from './tag'
import { normalizeText } from './hash'
import { compareCodepoints } from './text'

// =====================================================================
//  조립 — partition 이 정한 배치대로 문서를 만들고, 줄 번호를 재고, 분량을 맞춘다.
//  정본은 docs/SPEC.md §4.1 (2·3·4·5·6 단계).
//
//  ⚠ 이 파일은 **표를 읽기만** 한다. `switch (item.type)` 가 여기 생기면 그건
//    partition 표가 못 담은 규칙이 새어 나온 것이다 — 표를 고쳐라.
// =====================================================================

/** 항목 하나가 만든 줄 묶음. 역추적 태그는 **마지막 줄**에 붙는다 (P7). */
export type Block = { item_id: string; revision: number; tag: string; lines: readonly string[] }

export type DocDraft = {
  id: DocId
  slug: string
  title: string
  paths: string[]
  sections: Map<SectionKey, Block[]>
}

export type SourceMapEntry = { start_line: number; end_line: number; item_id: string; revision: number }

export type RenderedDoc = {
  path: string
  target: PackTarget
  text: string
  source_item_ids: string[]
  sourcemap: SourceMapEntry[]
}

export type Excluded = { item_id: string; reason: string }

function emptyDoc(id: DocId, slug = '', title = ''): DocDraft {
  return { id, slug, title, paths: [], sections: new Map() }
}

export type BaseVars = Omit<DocVars, 'title' | 'paths'>

// ---------------------------------------------------------------------
//  2·3단계 — 배치하고 정렬한다
// ---------------------------------------------------------------------

export function collect(items: readonly ContextItem[]): { docs: DocDraft[]; excluded: Excluded[] } {
  const byKey = new Map<string, DocDraft>()
  const excluded: Excluded[] = []

  // 🔴 항목이 없어도 나가는 문서를 **먼저** 만든다 (`DOCS` 표의 `always` · SPEC §4.3).
  //    ★ 왜 먼저인가 — 뒤에서 항목이 같은 키를 찾아 그대로 채운다. 나중에 채우면
  //      「항목이 있을 때」와 「없을 때」의 문서 생성 경로가 둘로 갈린다.
  for (const id of Object.keys(DOCS) as DocId[]) {
    if (DOCS[id].always !== true) continue
    byKey.set(docKey({ doc: id, slug: '', title: '', paths: [] }), emptyDoc(id))
  }

  // 🔴 여기서 한 번만 정렬한다. 뒤 단계는 순서를 건드리지 않는다 —
  //    입력 순서가 결과에 새어 들어갈 자리를 하나로 줄인다 (P4).
  for (const item of sortItems(items)) {
    for (const placement of placeItem(item)) {
      if (placement.kind === 'exclude') {
        excluded.push({ item_id: item.id, reason: placement.reason })
        continue
      }
      const { ref, section } = placement
      const key = docKey(ref)
      let doc = byKey.get(key)
      if (doc === undefined) {
        doc = emptyDoc(ref.doc, ref.slug, ref.title)
        byKey.set(key, doc)
      }
      // 제목의 주인은 그 문서의 본체다 — 도메인 파일 이름은 도메인 항목이 정하고,
      // 거기 얹히는 규칙(scoped_rule)이 제목을 덮어쓰지 않는다.
      if (section === 'domain' && ref.title.length > 0) doc.title = ref.title
      else if (doc.title.length === 0 && ref.title.length > 0) doc.title = ref.title
      for (const path of ref.paths) if (!doc.paths.includes(path)) doc.paths.push(path)

      const blocks = doc.sections.get(section) ?? []
      blocks.push({
        item_id: item.id,
        revision: item.revision,
        tag: traceTag(item),
        lines: renderSection(section, item),
      })
      doc.sections.set(section, blocks)
    }
  }

  // 🔴 거울 문서 (`DOCS[id].compose` · SPEC §4.1 「동일 내용」) — 위에서 배치가 **끝난 뒤** 만든다.
  //    다른 문서의 블록을 그대로 (같은 Block · 같은 태그) 모으므로 partition 은 거울을 모르고,
  //    ItemType 이 늘어도 여기는 안 고친다. slug 가 여럿인 문서는 slug 순으로 — 입력 순서가
  //    새어 들 자리를 막는다 (P4).
  for (const id of Object.keys(DOCS) as DocId[]) {
    const sources = DOCS[id].compose
    if (sources === undefined) continue
    const mirror = emptyDoc(id)
    for (const source of sources) {
      const instances = [...byKey.values()]
        .filter((d) => d.id === source)
        .sort((a, b) => compareCodepoints(a.slug, b.slug))
      for (const instance of instances) {
        for (const [section, blocks] of instance.sections) for (const block of blocks) append(mirror, section, block)
      }
    }
    //  블록이 하나도 없으면 만들지 않는다 — 머리말만 있는 파일은 근거 없는 파일이다 (P7 · Manifest 가 막는다).
    if (mirror.sections.size > 0) byKey.set(docKey({ doc: id, slug: '', title: '', paths: [] }), mirror)
  }

  excluded.sort((a, b) => (a.item_id < b.item_id ? -1 : a.item_id > b.item_id ? 1 : 0))
  return { docs: [...byKey.values()], excluded }
}

// ---------------------------------------------------------------------
//  4·6단계 — 렌더와 source map
// ---------------------------------------------------------------------

export function docPath(doc: DocDraft, part = 1): string {
  const base = DOCS[doc.id].path(doc.slug)
  if (part <= 1) return base
  return base.replace(/\.(\w+)$/, `-${part}.$1`)
}

function partNote(part: number, total: number): string[] {
  if (total <= 1) return []
  return [`> 이 파일은 ${total} 개로 나뉘었다 — ${part}/${total}.`]
}

export function renderDoc(doc: DocDraft, base: BaseVars, part = 1, totalParts = 1): RenderedDoc {
  const spec = DOCS[doc.id]
  const vars: DocVars = { ...base, title: doc.title, paths: doc.paths }
  const lines: string[] = []
  const sourcemap: SourceMapEntry[] = []
  const ids: string[] = []

  // 빈 줄은 여기서만 만든다 — 나중에 접으면 source map 의 줄 번호가 어긋난다.
  const blank = (): void => {
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('')
  }

  lines.push(...spec.head(vars), ...partNote(part, totalParts))

  for (const slot of spec.slots) {
    const blocks = doc.sections.get(slot.section) ?? []
    if (blocks.length === 0) continue          // 빈 절은 제목째로 빠진다
    blank()
    if (slot.heading !== undefined) lines.push(slot.heading)
    if (slot.lead !== undefined) lines.push(slot.lead)

    const spaced = SECTIONS[slot.section].spaced
    blocks.forEach((block, i) => {
      if (spaced && i > 0) blank()
      const start = lines.length + 1
      const body = [...block.lines]
      const last = body.length - 1
      body[last] = `${body[last] as string} ${block.tag}`   // P7 — 블록의 끝에 역추적 태그
      lines.push(...body)
      sourcemap.push({ start_line: start, end_line: lines.length, item_id: block.item_id, revision: block.revision })
      if (!ids.includes(block.item_id)) ids.push(block.item_id)
    })
  }

  if (spec.foot !== undefined) {
    blank()
    lines.push(...spec.foot(vars))
  }

  return {
    path: docPath(doc, part),
    target: spec.target,
    text: normalizeText(lines.join('\n')),
    source_item_ids: [...ids].sort(),
    sourcemap,
  }
}

// ---------------------------------------------------------------------
//  5단계 — 분량 (SPEC §4.1)
// ---------------------------------------------------------------------

/** 블록 하나가 차지하는 대략의 글자 수. 파트 나누기의 저울이다. */
function blockCost(block: Block): number {
  return block.lines.reduce((n, line) => n + line.length + 1, 0) + block.tag.length + 1
}

function emptyDraft(from: DocDraft, id: DocId = from.id): DocDraft {
  return { id, slug: from.slug, title: from.title, paths: from.paths, sections: new Map() }
}

function append(doc: DocDraft, section: SectionKey, block: Block): void {
  doc.sections.set(section, [...(doc.sections.get(section) ?? []), block])
}

/**
 * CLAUDE.md 가 12,000자를 넘으면 정책·제약을 `.claude/rules/policies.md` 로 옮긴다.
 * ★ 왜 정책·제약인가 — 미션·목표·로드맵은 **모든 세션이 읽어야 하는 것**이고,
 *   정책은 그 파일을 만질 때 읽어도 늦지 않다 (SPEC §4.1 5단계).
 */
function relieveClaudeMd(docs: DocDraft[], base: BaseVars, warnings: string[]): DocDraft[] {
  const claude = docs.find((d) => d.id === 'claude')
  if (claude === undefined) return docs
  const size = renderDoc(claude, base).text.length
  if (size <= CLAUDE_MD_MAX_CHARS) return docs

  const moved: DocDraft = { id: 'policies', slug: '', title: '', paths: [], sections: new Map() }
  for (const section of ['policy', 'constraint'] as const) {
    for (const block of claude.sections.get(section) ?? []) append(moved, section, block)
    claude.sections.delete(section)
  }
  if (moved.sections.size === 0) {
    warnings.push(`CLAUDE.md 가 ${size}자로 한도(${CLAUDE_MD_MAX_CHARS}자)를 넘었지만 옮길 정책·제약이 없다`)
    return docs
  }
  warnings.push(`CLAUDE.md 가 ${size}자여서 정책·제약을 ${DOCS.policies.path('')} 로 옮겼다 (한도 ${CLAUDE_MD_MAX_CHARS}자)`)
  return [...docs, moved]
}

/**
 * `.claude/rules/*` 가 30,000자를 넘으면 **항목 경계에서** 파트로 나눈다 (SPEC §4.1 5단계).
 * ⚠ 줄 가운데서 자르지 않는다 — 잘린 문장이 규칙으로 배포되면 사람이 반대로 읽는다.
 */
function splitLongDoc(doc: DocDraft, base: BaseVars, warnings: string[]): DocDraft[] {
  if (doc.id === 'claude') return [doc]                    // CLAUDE.md 는 위 12,000자 규칙이 맡는다
  //  거울 문서는 나누지 않는다 — 원본들이 이미 각자 한도 안이고, `AGENTS-2.md` 는 sync allowlist 밖이다
  //  (`templates/index.ts` 의 `compose` 주석).
  if (DOCS[doc.id].compose !== undefined) return [doc]
  const rendered = renderDoc(doc, base)
  if (rendered.text.length <= RULES_MAX_CHARS) return [doc]

  const blocks = [...doc.sections.values()].flat()
  const overhead = Math.max(rendered.text.length - blocks.reduce((n, b) => n + blockCost(b), 0), 0)
  const budget = Math.max(RULES_MAX_CHARS - overhead, 1)   // 파트 하나가 담을 수 있는 항목 분량

  const parts: DocDraft[] = []
  let current: DocDraft | undefined
  let used = 0

  for (const slot of DOCS[doc.id].slots) {
    for (const block of doc.sections.get(slot.section) ?? []) {
      const cost = blockCost(block)
      if (current === undefined || (used > 0 && used + cost > budget)) {
        current = emptyDraft(doc)
        parts.push(current)
        used = 0
      }
      append(current, slot.section, block)
      used += cost
    }
  }

  if (parts.length <= 1) return [doc]
  warnings.push(`${rendered.path} 가 ${rendered.text.length}자여서 ${parts.length}개로 나눴다 (한도 ${RULES_MAX_CHARS}자)`)
  return parts
}

/** 5단계 전체. 옮기고 나눈 뒤의 문서 목록과 경고를 낸다. */
export function applyBudget(docs: DocDraft[], base: BaseVars): { docs: DocDraft[]; warnings: string[] } {
  const warnings: string[] = []
  const out: DocDraft[] = []
  for (const doc of relieveClaudeMd(docs, base, warnings)) out.push(...splitLongDoc(doc, base, warnings))
  return { docs: out, warnings }
}

function keyOf(doc: DocDraft): string {
  return docKey({ doc: doc.id, slug: doc.slug, title: doc.title, paths: doc.paths })
}

/** 나뉜 파트에 번호를 매겨 전부 렌더한다 (`applyBudget` 의 결과를 그대로 받는다). */
export function renderAll(docs: DocDraft[], base: BaseVars): RenderedDoc[] {
  const total = new Map<string, number>()
  for (const doc of docs) total.set(keyOf(doc), (total.get(keyOf(doc)) ?? 0) + 1)
  const seen = new Map<string, number>()
  return docs.map((doc) => {
    const key = keyOf(doc)
    const part = (seen.get(key) ?? 0) + 1
    seen.set(key, part)
    return renderDoc(doc, base, part, total.get(key) ?? 1)
  })
}
