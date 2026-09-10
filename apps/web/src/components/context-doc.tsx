import type { ContextItemView } from '@contextops/schema'

import { CONTEXT_SECTION_LEAD, contextSections, sectionNote } from '../lib/web/context-doc'
import { ITEM_GIST_KEY, itemGist } from '../lib/web/item-gist'
import { CONFIDENCE_CHIP, CtxTag, ITEM_STATUS_CHIP, ITEM_TYPE_LABEL, ItemStatusChip, SCOPE_KIND_LABEL } from './chips'

// =====================================================================
//  화면 5 · 문서로 보기 — 절(타입)마다 머리 한 줄, 항목마다 블록 하나 (2026-09-11 · 「Context 화면도 문서처럼 읽기 쉽게」)
//
//  ★ 블록의 차례 — 제목(굵게) → 한 줄(타입별 `ITEM_GIST_KEY` 이름표 + 값) → 설명(body) → 발치(근거 수·확신 · 범위 · 꼬리표).
//    「적용 중」이 아닌 항목에만 상태 칩이 붙고 왼쪽 괘선이 그 색이다 — 문서의 기본은 승인된 것이고 **예외만 눈에 띈다**.
//  🔴 낱말은 전부 표에서 온다 (`ITEM_TYPE_LABEL`·`ITEM_STATUS_CHIP`·`CONFIDENCE_CHIP`·`SCOPE_KIND_LABEL`·`ITEM_GIST_KEY`) — 여기서 지어내지 않는다.
//  ⚠ 누르면 표와 같은 드로어가 열린다 (`onSelect`). 화면 7 의 `.pack-block` 과 같은 색·같은 괘선이라 두 화면이 한 장치로 읽힌다.
// =====================================================================

export function ContextDoc({
  items,
  selected,
  onSelect,
}: {
  items: readonly ContextItemView[]
  selected: ContextItemView | null
  onSelect: (item: ContextItemView) => void
}) {
  return (
    <div className="context-doc">
      {contextSections(items).map((section) => (
        <section key={section.type} className="context-section" aria-label={ITEM_TYPE_LABEL[section.type]}>
          <header className="col-tight">
            <h2 className="context-section-title">
              {ITEM_TYPE_LABEL[section.type]}
              <span className="meta">{sectionNote(section.items, (s) => ITEM_STATUS_CHIP[s].label)}</span>
            </h2>
            <p className="meta">{CONTEXT_SECTION_LEAD[section.type]}</p>
          </header>
          {section.items.map((item) => (
            <DocItem key={item.id} item={item} selected={selected?.id === item.id} onSelect={() => onSelect(item)} />
          ))}
        </section>
      ))}
    </div>
  )
}

/** 근거 발치 한 줄 — 「근거 2건 · 근거 확실」. 0 이면 「근거 없음」이고 색이 거든다 (숫자만 두지 않는다). */
export function evidenceNote(item: Pick<ContextItemView, 'source_refs' | 'confidence'>): { text: string; warn: boolean } {
  if (item.source_refs.length === 0) return { text: '근거 없음', warn: true }
  return { text: `근거 ${item.source_refs.length}건 · ${CONFIDENCE_CHIP[item.confidence].label}`, warn: item.confidence === 'low' }
}

function DocItem({ item, selected, onSelect }: { item: ContextItemView; selected: boolean; onSelect: () => void }) {
  const tone = ITEM_STATUS_CHIP[item.status].tone
  const evidence = evidenceNote(item)
  return (
    <div
      role="button"
      tabIndex={0}
      className="doc-item"
      aria-selected={selected}
      data-tone={item.status === 'active' ? undefined : tone}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
    >
      <div className="row-between wrap">
        <span className="doc-item-title">{item.title}</span>
        {item.status === 'active' ? null : <ItemStatusChip status={item.status} />}
      </div>
      <p className="key-line"><span className="key">{ITEM_GIST_KEY[item.type]}</span>{itemGist(item)}</p>
      {item.body.trim() === '' ? null : <p className="doc-item-body">{item.body}</p>}
      <div className="row wrap doc-item-foot">
        <span className={evidence.warn ? 'meta ink-warn' : 'meta'}>{evidence.text}</span>
        {/* 범위는 낱말 · 값 — 표(`ItemTable`)와 같은 모양이다 (2026-09-11 · 「업무 refund」처럼 붙어 있었다). */}
        {item.scope.kind === 'project' ? null : (
          <span className="meta">{SCOPE_KIND_LABEL[item.scope.kind]}{item.scope.value ? <span className="mono"> · {item.scope.value}</span> : null}</span>
        )}
        <CtxTag itemId={item.id} revision={item.revision} title={item.title} />
      </div>
    </div>
  )
}
