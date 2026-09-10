import type { ContextItemView, DetectedConflictKind } from '@contextops/schema'

// =====================================================================
//  충돌 카드의 두 쪽 **이름** — 「A」「B」 대신 (2026-09-10 저녁 · 사용자: 「A, B 로 하지 말고 좀 더 쉽게 와닿는 설명 없어?」)
//
//  ★ 왜 — 「A가 맞음」은 사람이 위에서 A 를 찾아야 하는 문구다. 두 쪽이 **무엇인지**로 부르면 찾을 것이 없다:
//    「지금 적용 중인 규칙」 vs 「옛 문서에 남은 규칙」 · 「문서가 말하는 것」 vs 「코드가 말하는 것」.
//  🔴 이름은 항목의 **사실**에서 온다 — 근거의 종류(코드/문서) · 폐기 표시(태그·상태·제목) · 상태(적용 중/초안) · 갱신 시각.
//    판단(「맞다」)은 말하지 않는다. 사실이 같아 가를 수 없으면 「첫째」「둘째」다 — 지어내지 않는다.
//  ⚠ 버튼 문구는 `{a} 쪽이 맞음` 처럼 **「쪽」 뒤에 조사**를 붙인다 — 이름의 받침이 무엇이든 조사가 안 깨진다.
// =====================================================================

/**
 * `tone` — 이름의 **색** (2026-09-11 · 사용자: 「색깔이 다르게 하든지 뭔가 더 눈에 잘 보이면」). 제품의 칩과 같은 뜻의 색만 쓴다:
 * 지금 적용 중 = `ok`(「적용 중」 칩) · 옛 문서 = `warn`(「옛 버전」 칩) · 코드 = `code`(모노) · 제안이 바꾸자는 쪽 = `new`(잉크 괘선 · 제안 상세) · 나머지 = `neutral`.
 * ⚠ 색은 사실(적용 중인가 · 옛 문서인가)이지 판단(「맞다」)이 아니다 — 초록이 「맞는 쪽」을 뜻하지 않는다. 결정은 사람 몫이다.
 */
export type SideTone = 'ok' | 'warn' | 'code' | 'neutral' | 'new'
export type SideName = { readonly short: string; readonly long: string; readonly tone: SideTone }
export type SideNames = { readonly a: SideName; readonly b: SideName }

const CODE: SideName = { short: '코드', long: '코드가 말하는 것', tone: 'code' }
const DOC: SideName = { short: '문서', long: '문서가 말하는 것', tone: 'neutral' }
const OLD: SideName = { short: '옛 규칙', long: '옛 문서에 남은 규칙', tone: 'warn' }
const NOW: SideName = { short: '지금 규칙', long: '지금 적용 중인 규칙', tone: 'ok' }
const NEW: SideName = { short: '새 초안', long: '새로 올라온 초안', tone: 'neutral' }
const LATER: SideName = { short: '최근 것', long: '더 최근에 고친 규칙', tone: 'neutral' }
const EARLIER: SideName = { short: '이전 것', long: '먼저 있던 규칙', tone: 'neutral' }

/** 사실로 가를 수 없을 때 — 그리고 한쪽이 없을 때. */
export const FALLBACK_NAMES: SideNames = { a: { short: '첫째', long: '첫째 규칙', tone: 'neutral' }, b: { short: '둘째', long: '둘째 규칙', tone: 'neutral' } }

function sourceKind(item: ContextItemView): 'code' | 'doc' | 'other' {
  const refs = item.source_refs
  if (refs.length > 0 && refs.every((r) => r.kind === 'repository_path')) return 'code'
  if (refs.some((r) => r.kind === 'source_document')) return 'doc'
  return 'other'
}

/** 폐기된 문서에서 온 것인가 — 씨앗은 `stale` 태그와 「(폐기 문서)」 제목을, 결정은 `deprecated` 상태를 남긴다. */
function isOld(item: ContextItemView): boolean {
  return item.tags.includes('stale') || item.status === 'deprecated' || item.title.startsWith('(폐기')
}

function nowOrNew(item: ContextItemView): SideName {
  return item.status === 'active' ? NOW : NEW
}

/** 한쪽뿐인 카드(열린 질문)의 자리 이름 — 짝이 없으니 「근거」다. */
export const SOLO_NAME: SideName = { short: '근거', long: '근거', tone: 'neutral' }

export function sideNames(a: ContextItemView | null, b: ContextItemView | null): SideNames {
  if (a === null || b === null) return FALLBACK_NAMES
  const ka = sourceKind(a)
  const kb = sourceKind(b)
  if (ka === 'code' && kb !== 'code') return { a: CODE, b: DOC }
  if (kb === 'code' && ka !== 'code') return { a: DOC, b: CODE }
  const oa = isOld(a)
  const ob = isOld(b)
  if (oa !== ob) return oa ? { a: OLD, b: nowOrNew(b) } : { a: nowOrNew(a), b: OLD }
  const aa = a.status === 'active'
  const ab = b.status === 'active'
  if (aa !== ab) return aa ? { a: NOW, b: NEW } : { a: NEW, b: NOW }
  if (a.updated_at !== b.updated_at) return a.updated_at > b.updated_at ? { a: LATER, b: EARLIER } : { a: EARLIER, b: LATER }
  return FALLBACK_NAMES
}

/** 머리 문장의 꼬리 — 종류마다 「무엇을 정해 달라는지」. `Record` 라 종류가 늘면 타입이 막는다. */
export const CONFLICT_ASK: Record<DetectedConflictKind, string> = {
  contradiction: '둘 중 어느 쪽을 따를지 정해 주세요.',
  stale: '어느 쪽이 최신인지 정해 주세요.',
  duplicate: '하나만 남겨 주세요. 나머지는 폐기됩니다.',
  doc_vs_code: '어느 쪽에 맞출지 정해 주세요.',
}

/** 카드 머리의 사람 말 한 문장 — 「지금 적용 중인 규칙은 「…」, 옛 문서에 남은 규칙은 「…」입니다. 둘 중 …」 */
export function conflictSentence(kind: DetectedConflictKind, names: SideNames, titleA: string, titleB: string): string {
  //  긴 이름은 전부 「…것」「…규칙」「…초안」으로 끝난다 — 조사는 늘 「은」이다.
  return `${names.a.long}은 「${titleA}」, ${names.b.long}은 「${titleB}」입니다. ${CONFLICT_ASK[kind]}`
}
