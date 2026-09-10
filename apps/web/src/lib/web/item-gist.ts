import type { ContextItemView, ItemType } from '@contextops/schema'

// =====================================================================
//  항목의 **한 줄** — `data` 를 사람 말로 (2026-09-10 저녁 · 사용자: 「데모 사이트들도 알아듣기 어려운 텍스트」)
//
//  ★ 왜 생겼나 — Context 드로어는 「타입별 값」이라며 JSON 을 그대로 찍었고, 충돌 카드의 A/B 는 제목과 설명(body)만
//    보여서 **정작 부딪히는 문장**(정책의 rule · 제약의 statement)은 화면에 없었다. 심사위원은 「무엇과 무엇이 다른지」를
//    JSON 에서 읽어야 했다.
//  🔴 타입마다 한 줄이다 — `Record` 라 새 ItemType 을 더하고 여기를 안 더하면 타입이 막는다. `test/web-item-gist.test.ts` 가
//    10종 전부가 빈 문자열이 아닌 것을 센다 (「정의만 있고 아무 일도 안 하는 것」 방지).
//  ⚠ 판단을 말하지 않는다 — 값을 옮길 뿐이다. 없는 값(metric·due)은 안 적는다 — 지어내지 않는다.
// =====================================================================

type DataOf<K extends ItemType> = Extract<ContextItemView, { type: K }>['data']

export const ITEM_GIST: { [K in ItemType]: (data: DataOf<K>) => string } = {
  mission: (d) => d.statement,
  goal: (d) => (d.metric === undefined ? d.outcome : `${d.outcome} — 잣대: ${d.metric}`),
  roadmap: (d) => `완료 조건 ${d.done_when.length}개${d.due === undefined ? '' : ` · 기한 ${d.due}`}`,
  architecture: (d) => `${d.component} — ${d.responsibility}`,
  domain: (d) => d.invariants[0] ?? `용어 ${d.glossary.length}개`,
  policy: (d) => d.rule,
  adr: (d) => d.decision,
  workflow: (d) => `${d.trigger} → 단계 ${d.steps.length}개`,
  constraint: (d) => d.statement,
  open_question: (d) => d.question,
}

/** 한 줄 앞의 이름표 — 그 줄이 무엇인지(「규칙」「제약」…). 카드·드로어가 `key-line` 의 모노 이름표로 그린다. */
export const ITEM_GIST_KEY: Record<ItemType, string> = {
  mission: '사명',
  goal: '목표',
  roadmap: '완료 조건',
  architecture: '역할',
  domain: '용어',
  policy: '규칙',
  adr: '결정',
  workflow: '절차',
  constraint: '제약',
  open_question: '질문',
}

/** 항목 하나의 한 줄. 타입은 항목이 말하고, 모양은 위 표가 고른다 — 화면에 `switch` 가 없다. */
export function itemGist(item: Pick<ContextItemView, 'type' | 'data'>): string {
  return (ITEM_GIST[item.type] as unknown as (data: unknown) => string)(item.data)
}
