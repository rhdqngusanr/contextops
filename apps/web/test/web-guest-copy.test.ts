import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CONFLICT_KIND_RULES, type ConflictKind, type ContextItemView } from '@contextops/schema'

import type { WriteDoor } from '../src/lib/web/actor'
import { ApiClientError, ERROR_HINT, GUEST_HINT, REASON_HINT, messageOf, reasonOf } from '../src/lib/web/api'
import type { ConflictCard as ConflictRow } from '../src/lib/web/queries'
import { ConflictCard, OWNER_DECIDES, blockedText, type ConflictCardHandlers, type ConflictCardState } from '../src/components/conflict-card'
import { ProposalDecisions, noActionText } from '../src/components/proposals'

// =====================================================================
//  🔴 화면이 **그 사람에게 참인 문장**만 말한다 — 게스트 문구 2곳 · 승인 0개 발행 (INBOX G12 · G13 · 2026-09-09)
//
//  ★ G13 — 게스트는 서버에서 등급이 member 다 (`ACTOR_RULES.guest.maxRole`). 그래서 등급만 보는 화면은
//    게스트에게 draft 제안의 [승인 요청] 을 **활성**으로 그렸고(누르면 403), 「승인·거절은 owner만」·
//    「승인 요청은 이 제안을 낸 사람만」·「이 결정은 팀 owner 가 합니다」를 띄웠다 — 셋 다 게스트에겐
//    거짓이다: 로그인해도 샘플 팀에서는 못 한다 (FINDINGS 121 과 같은 뿌리). 쓰기 문(`writeDoor()`)이
//    닫혔으면 등급 문장 대신 서버가 낼 문구(`GUEST_HINT.FORBIDDEN`)를 말한다.
//  ★ G12 — 승인 0개로 발행하면 서버는 `VALIDATION_FAILED` + `details.code:'EMPTY_SNAPSHOT'` 인데 화면은
//    「입력한 내용을 다시 확인해주세요」로 뭉갰다. 원인은 이미 `details` 에 있으니 그것을 읽는 표
//    (`REASON_HINT`)가 문장을 고르고, 모달은 [초안 보기] 로 다음 걸음을 준다.
//
//  ⚠ 여기서 `door` 를 손으로 짓는다 — `writeDoor()` 는 localStorage 세션을 읽는데 SSR 시험엔 없다.
//    문의 판정 자체(표에서 읽는가)는 `web-write-door.test.ts` 가 잰다. 여기는 **문이 닫혔을 때 화면이
//    무슨 말을 하나**만 잰다.
// =====================================================================

const OPEN: WriteDoor = { open: true }
const CLOSED: WriteDoor = { open: false, reason: GUEST_HINT.FORBIDDEN! }

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)
const text = (markup: string): string => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

describe('G13 ① 제안 결정 칸 — 문이 닫힌 주체에겐 등급 문장을 하지 않는다', () => {
  const decisions = (status: 'draft' | 'submitted', door: WriteDoor) => html(createElement(ProposalDecisions, {
    state: { status, role: 'member', note: '', busy: null, door },
    onNote: () => {}, onDecide: () => {},
  }))

  it('draft 제안 — 게스트에겐 [승인 요청] 이 없고, 「낸 사람만」 대신 읽기 전용 이유가 뜬다', () => {
    const guest = decisions('draft', CLOSED)
    expect(guest).not.toContain('<button')
    expect(text(guest)).toContain(CLOSED.reason)
    expect(guest).not.toContain('제안을 낸 사람만')
    //  같은 등급이라도 문이 열린 member 는 예전 그대로다 — 문이 갈랐지 등급이 가른 것이 아니다.
    const member = decisions('draft', OPEN)
    expect(member).toContain('승인 요청')
    expect(member).toContain('제안을 낸 사람만')
  })

  it('submitted 제안 — 게스트에겐 「owner만」이 아니라 읽기 전용 이유다', () => {
    const guest = decisions('submitted', CLOSED)
    expect(guest).not.toContain('<button')
    expect(text(guest)).toContain(CLOSED.reason)
    expect(guest).not.toContain('팀장만')
    expect(decisions('submitted', OPEN)).toContain('팀장만')
  })

  it('문장을 고르는 함수 하나 — 닫힌 문이 등급 문장보다 먼저다', () => {
    expect(noActionText('submitted', CLOSED)).toBe(CLOSED.reason)
    expect(noActionText('draft', CLOSED)).toBe(CLOSED.reason)
    expect(noActionText('submitted', OPEN)).toContain('팀장만')
    expect(noActionText('submitted')).toContain('팀장만')
    //  결정이 끝난 제안은 문과 무관하다 — 「이제 무슨 일이 일어나나」는 누구에게나 같은 참말이다.
    expect(noActionText('approved', CLOSED)).toBe(noActionText('approved', OPEN))
  })
})

// ---------------------------------------------------------------------
const NOOP: ConflictCardHandlers = { onDraft: () => {}, onSaveAs: () => {}, onChoose: () => {}, onAnswer: () => {} }

function item(over: Partial<ContextItemView> = {}): ContextItemView {
  return {
    id: 'item_retry_policy',
    project_id: '00000000-0000-4000-8000-000000000000',
    type: 'policy',
    title: '결제 재시도는 5회까지',
    body: '',
    status: 'active',
    scope: { kind: 'project' },
    priority: 50,
    source_refs: [{ kind: 'repository_path', repo: 'paylab-api', path: 'src/payment/retry.ts' }],
    tags: [],
    confidence: 'high',
    revision: 3,
    data: { rule: '재시도 5회', severity: 'must', enforcement: 'review' },
    updated_at: '2026-07-12T09:00:00.000Z',
    ...over,
  } as ContextItemView
}

function row(kind: ConflictKind): ConflictRow {
  const rule = CONFLICT_KIND_RULES[kind]
  return {
    id: `c-${kind}`,
    project_id: '00000000-0000-4000-8000-000000000000',
    kind,
    a_item_id: rule.anchor === 'items' ? 'item_retry_policy' : null,
    b_item_id: rule.anchor === 'items' && rule.needsB ? 'item_retry_code' : null,
    a_ref: null,
    b_ref: null,
    question: '어느 쪽이 현재 상태인가요?',
    severity: rule.detected ? 'high' : null,
    status: 'open',
    resolution: null,
    resolved_at: null,
    created_at: '2026-08-04T09:00:00.000Z',
  } as unknown as ConflictRow
}

function card(over: Partial<ConflictCardState>): string {
  const state: ConflictCardState = {
    conflict: row('contradiction'),
    canDecide: false,
    a: item(),
    b: item({ id: 'item_retry_code', title: '코드의 재시도는 3회', revision: 1 }),
    draft: '',
    saveAs: '',
    busy: false,
    error: null,
    created: null,
    ...over,
  }
  return html(createElement(ConflictCard, { state, on: NOOP }))
}

//  🔴 2026-09-11 — 게스트에게도 결정·답 칸을 **그린다.** 전부 `disabled` 이고 그 밑에 `ReadOnlyNotice`(읽기 전용 이유 +
//     [내 팀으로 시작하기]) 가 선다 — DESIGN_BRIEF §5 「버튼을 숨기지는 않는다 — 막는 것은 서버다」. 심사위원이 3분 코스의
//     첫 걸음에서 「결정이 무엇인지」(선택지 넷 · 고르면 진 쪽이 폐기)를 한 번은 봐야 한다. 잠긴 버튼은 403 을 낼 수 없다.
/** 모든 `<button>`·`<textarea>` 가 잠겨 있나 — 하나라도 활성이면 그 태그를 돌려준다. */
const liveControls = (markup: string): string[] =>
  (markup.match(/<(button|textarea|select)[^>]*>/g) ?? []).filter((tag) => !tag.includes('disabled=""'))

describe('G13 ② 충돌 카드 — 문이 닫힌 사람에겐 결정·답 칸이 잠기고 그 밑에 읽기 전용 이유가 선다', () => {
  it('탐지 카드 · 게스트 — 버튼 넷이 있되 전부 잠김, owner 문장 대신 읽기 전용 이유, 근거는 그대로', () => {
    const guest = card({ door: CLOSED })
    expect(guest.match(/<button[^>]*>/g)?.length, '버튼이 없다 — 숨기지 말고 잠가라').toBe(4)
    expect(liveControls(guest)).toEqual([])
    //  이유는 다른 쓰기 버튼과 같은 조각(`ReadOnlyNotice` · role="status" · [내 팀으로 시작하기]) 이다.
    expect(guest).toContain('role="status"')
    expect(guest).toContain('내 팀으로 시작하기')
    const t = text(guest)
    expect(t).toContain(CLOSED.reason)
    expect(t).not.toContain(OWNER_DECIDES)
    //  선택지와 「고르면 무슨 일이 나나」가 보인다 — 잠겼을 뿐이다.
    expect(t).toContain('둘 다 보류')
    expect(t).toContain('→ 「폐기」')
    //  🔴 근거는 여전히 보인다 — 읽기 전용은 「못 바꾼다」지 「못 본다」가 아니다 (P7).
    expect(t).toContain('paylab-api/src/payment/retry.ts')
    //  member(문 열림 · owner 아님)는 예전 문장 그대로다 — 잠긴 버튼 밑에 owner 문장, `ReadOnlyNotice` 는 아니다.
    const member = card({ door: OPEN })
    expect(text(member)).toContain(OWNER_DECIDES)
    expect(member).not.toContain('role="status"')
    expect(text(card({}))).toContain(OWNER_DECIDES)
  })

  it('질문 카드 · 게스트 — 답 칸과 [답 저장하기] 가 있되 잠겨 있고 이유가 뜬다', () => {
    const question = { conflict: row('seed_question'), a: null, b: null }
    const guest = card({ ...question, door: CLOSED })
    expect(guest).toContain('<textarea')
    expect(guest).toContain('답 저장하기')
    expect(liveControls(guest)).toEqual([])
    expect(guest).toContain('role="status"')
    expect(text(guest)).toContain(CLOSED.reason)
    //  member 는 답할 수 있다 (`POST /questions` 는 member 다) — 문이 열려 있으면 답 칸이 살아 있다.
    const member = card({ ...question, door: OPEN })
    expect(text(member)).toContain('답 저장하기')
    expect(member).toMatch(/<textarea(?![^>]*disabled="")[^>]*>/)
    expect(member).not.toContain('role="status"')
  })

  it('문장을 고르는 함수 하나 — 닫힌 문이 owner 문장보다 먼저다', () => {
    expect(blockedText({ door: CLOSED })).toBe(CLOSED.reason)
    expect(blockedText({ door: OPEN })).toBe(OWNER_DECIDES)
    expect(blockedText({})).toBe(OWNER_DECIDES)
  })

  it('두 화면이 문을 실제로 넘긴다 — 상세 제안 · 검토 화면이 `writeDoor()` 를 읽어 `door` 로 준다', () => {
    const root = fileURLToPath(new URL('../src/app/t/[team]/p/[project]/', import.meta.url))
    const proposal = readFileSync(`${root}proposals/[id]/page.tsx`, 'utf8')
    const review = readFileSync(`${root}review/page.tsx`, 'utf8')
    expect(proposal).toMatch(/door: writeDoor\(\)/)
    expect(review).toMatch(/const door = writeDoor\(\)/)
    expect(review).toMatch(/^\s+door,$/m)
  })
})

// ---------------------------------------------------------------------
describe('G12 승인 0개 발행 — 원인이 `details` 에 있으면 그 문장이 먼저다', () => {
  it('`EMPTY_SNAPSHOT` 이면 「승인된 항목이 없다」를 말하고 「입력을 확인하라」고 하지 않는다', () => {
    const err = new ApiClientError('VALIDATION_FAILED', 400, { code: 'EMPTY_SNAPSHOT' })
    expect(err.message).toBe(REASON_HINT.EMPTY_SNAPSHOT)
    expect(messageOf(err)).toBe(REASON_HINT.EMPTY_SNAPSHOT)
    expect(err.message).not.toBe(ERROR_HINT.VALIDATION_FAILED)
    expect(err.message).toContain('승인')
    //  다음 걸음이 문장 안에 있다 — 어디로 가서 무엇을 하나.
    expect(err.message).toContain('Context')
  })

  it('원인이 없거나 모르는 원인이면 코드의 일반 문장 그대로다 — 지어내지 않는다', () => {
    expect(new ApiClientError('VALIDATION_FAILED', 400).message).toBe(ERROR_HINT.VALIDATION_FAILED)
    expect(new ApiClientError('VALIDATION_FAILED', 400, { code: 'SOMETHING_ELSE' }).message).toBe(ERROR_HINT.VALIDATION_FAILED)
    expect(new ApiClientError('VALIDATION_FAILED', 400, { path: ['semver'] }).message).toBe(ERROR_HINT.VALIDATION_FAILED)
    expect(reasonOf(undefined)).toBeUndefined()
    expect(reasonOf({ code: 'INVALID_ITEM' })).toBeUndefined()
    expect(reasonOf({ code: 'EMPTY_SNAPSHOT' })).toBe('EMPTY_SNAPSHOT')
  })

  it('서버는 그 원인을 실제로 싣고, 발행 모달은 [초안 보기] 로 데려간다', () => {
    const publish = readFileSync(fileURLToPath(new URL('../src/lib/api/publish.ts', import.meta.url)), 'utf8')
    //  `COMPILE_ERROR_FAULT` 의 사람 잘못 갈래는 `{ code: err.code }` 를 details 로 낸다.
    expect(publish).toMatch(/fail\(human\.code, human\.message, \{ code: err\.code \}\)/)
    const page = readFileSync(fileURLToPath(new URL('../src/app/t/[team]/p/[project]/context/page.tsx', import.meta.url)), 'utf8')
    expect(page).toContain("reasonOf(err.details) === 'EMPTY_SNAPSHOT'")
    expect(page).toContain('초안 보기')
    //  버튼이 가는 곳은 **초안 거르개**다 — 다른 화면이 아니라 같은 목록의 초안이다.
    expect(page).toMatch(/onShowDrafts=\{\(\) => \{ setPublishing\(false\); setFilter\(\{ \.\.\.filter, status: 'draft' \}\) \}\}/)
  })

  it('화면 문구는 존댓말이고 서버 문구(한다체)와 다르다', () => {
    for (const said of Object.values(REASON_HINT)) expect(said).toMatch(/(습니다|하세요|해주세요)/)
  })
})
