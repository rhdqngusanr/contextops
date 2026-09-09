import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { ERROR_CODES, type ErrorCode } from '@contextops/schema'

import { ACTOR_KINDS, ACTOR_RULES } from '../src/lib/api/actor-rules'
import { ACTOR_RULES as SERVER_ACTOR_RULES } from '../src/lib/api/auth'
import { writeDoor } from '../src/lib/web/actor'
import { ApiClientError, ERROR_HINT, GUEST_HINT, hintText, messageOf } from '../src/lib/web/api'
import { actorKindOf } from '../src/lib/web/session'
import { ReadOnlyNotice } from '../src/components/states'

// =====================================================================
//  🔴 **게스트가 누른 뒤에 아는 것**을 누르기 전에 · 누른 자리에서 말한다 (FINDINGS 121 · 135)
//
//  ★ 121 — 게스트의 403 을 화면이 「이 작업은 팀 owner만 할 수 있습니다」로 옮겼다.
//    게스트에게 그건 거짓말이다 (로그인해도 샘플 팀에서는 못 한다). 코드 하나에 문구 하나인
//    `ERROR_HINT` 는 그대로 두고, **게스트일 때만 덮는 표** `GUEST_HINT` 를 옆에 뒀다.
//  ★ 135 — 게스트가 [발행하기] 를 누르면 발행 모달이 열렸다 (70바퀴 캡처
//    `docs/evidence/2026-09-06-focus-visible/control/mouse-click.png`). 화면이 서버와 **같은 표**
//    (`ACTOR_RULES.writes`)를 읽어, 게스트에게는 모달 대신 그 자리에서 이유를 말한다.
//
//  재는 것은 두 단계다 (④2-B) — ① 소비처가 있나 ② 값을 뒤집으면 결과가 갈리나:
//    · 표가 하나다 — 서버(`auth.ts`)가 되내보내는 것과 화면이 읽는 것이 **같은 객체**다
//    · 세션이 게스트면 403 문구가 `GUEST_HINT` 것이고, 아니면 `ERROR_HINT` 그대로다
//    · 문의 판정은 `session.guest` 가 아니라 **표**에서 온다 — 표의 `writes` 를 뒤집으면 문이 열린다
//    · 게스트에게 뜨는 것은 모달(`role="dialog"`)이 아니라 이유(`role="status"`)다
//    · 화면 5 가 모달을 여는 자리는 하나이고, 그 자리는 문을 먼저 읽는다 (본문을 센다)
// =====================================================================

const GUEST = { guest: true }
const USER = { guest: false }

describe('🔴 표가 하나다 — 서버와 화면이 같은 `ACTOR_RULES` 를 읽는다', () => {
  it('`auth.ts` 가 되내보내는 것이 `actor-rules.ts` 의 그 객체다', () => {
    expect(SERVER_ACTOR_RULES).toBe(ACTOR_RULES)
  })

  it('표의 키가 `ACTOR_KINDS` 와 같고, 쓸 수 없는 주체는 guest 하나다', () => {
    expect(Object.keys(ACTOR_RULES).sort()).toEqual([...ACTOR_KINDS].sort())
    expect(ACTOR_KINDS.filter((k) => !ACTOR_RULES[k].writes)).toEqual(['guest'])
  })

  it('세션 → 주체 종류: guest 표시가 있으면 guest, 없거나 세션이 없으면 user', () => {
    expect(actorKindOf(GUEST)).toBe('guest')
    expect(actorKindOf(USER)).toBe('user')
    expect(actorKindOf({})).toBe('user')
    expect(actorKindOf(null)).toBe('user')
  })
})

describe('🔴 FINDINGS 121 — 게스트의 403 은 「읽기 전용」이지 「owner 만」이 아니다', () => {
  it('`GUEST_HINT` 는 에러 코드의 부분집합이고, 덮는 문구는 원래 문구와 다르다', () => {
    const codes = Object.keys(GUEST_HINT) as ErrorCode[]
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) {
      expect(ERROR_CODES, code).toContain(code)
      const text = GUEST_HINT[code]
      expect(text, code).toBeTruthy()
      expect(text, `${code}: 덮는 문구가 원래 문구와 같다 — 표가 장식이다`).not.toBe(ERROR_HINT[code])
    }
    //  🔴 게스트에게 「owner」라는 낱말은 거짓말이다 — 덮는 문구 어디에도 없어야 한다.
    for (const text of Object.values(GUEST_HINT)) expect(text).not.toMatch(/owner/i)
  })

  it('`hintText` — 게스트면 덮고, 아니면 `ERROR_HINT` 그대로. 덮는 줄이 없는 코드는 둘이 같다', () => {
    expect(hintText('FORBIDDEN', 'guest')).toBe(GUEST_HINT.FORBIDDEN)
    expect(hintText('FORBIDDEN', 'user')).toBe(ERROR_HINT.FORBIDDEN)
    expect(hintText('FORBIDDEN', 'device')).toBe(ERROR_HINT.FORBIDDEN)
    for (const code of ERROR_CODES) {
      if (code in GUEST_HINT) continue
      expect(hintText(code, 'guest'), code).toBe(ERROR_HINT[code])
    }
  })

  it('`ApiClientError` → `messageOf` — 같은 403 이 주체에 따라 다른 문장이 된다', () => {
    const asGuest = new ApiClientError('FORBIDDEN', 403, undefined, 'req_1', 'guest')
    const asUser = new ApiClientError('FORBIDDEN', 403, undefined, 'req_2', 'user')
    const byDefault = new ApiClientError('FORBIDDEN', 403)
    expect(messageOf(asGuest)).toBe(GUEST_HINT.FORBIDDEN)
    expect(messageOf(asUser)).toBe(ERROR_HINT.FORBIDDEN)
    expect(messageOf(byDefault)).toBe(ERROR_HINT.FORBIDDEN)
    expect(messageOf(asGuest)).not.toBe(messageOf(asUser))
    //  코드·상태·request_id 는 그대로다 — 문구만 갈린다.
    expect(asGuest.code).toBe('FORBIDDEN')
    expect(asGuest.status).toBe(403)
    expect(asGuest.requestId).toBe('req_1')
  })
})

describe('🔴 FINDINGS 135 — 쓰기 문은 누르기 전에 표를 읽는다', () => {
  const original = ACTOR_RULES.guest.writes
  afterEach(() => { ACTOR_RULES.guest.writes = original })

  it('게스트 세션이면 문이 닫혀 있고, 이유는 게스트의 403 문구와 **같은 문장**이다', () => {
    const door = writeDoor(GUEST)
    expect(door.open).toBe(false)
    if (door.open) return
    expect(door.reason).toBe(GUEST_HINT.FORBIDDEN)
    expect(door.reason).toBe(messageOf(new ApiClientError('FORBIDDEN', 403, undefined, undefined, 'guest')))
  })

  it('로그인한 세션이면 열려 있다 (등급은 여기서 안 본다 — `canEdit` 의 몫)', () => {
    expect(writeDoor(USER)).toEqual({ open: true })
    expect(writeDoor(null)).toEqual({ open: true })
  })

  it('🔴 판정은 `session.guest` 가 아니라 **표**에서 온다 — `writes` 를 뒤집으면 같은 게스트 세션에 문이 열린다', () => {
    expect(writeDoor(GUEST).open).toBe(false)
    ACTOR_RULES.guest.writes = true
    expect(writeDoor(GUEST).open, '표를 뒤집었는데 화면이 여전히 막는다 — 화면이 자기 갈래를 갖고 있다').toBe(true)
  })

  it('게스트에게 뜨는 것은 모달이 아니라 이유다 — `role="status"` · 다음 걸음 · dialog 마크업 0', () => {
    const door = writeDoor(GUEST)
    if (door.open) throw new Error('게스트에게 문이 열려 있다')
    const html = renderToStaticMarkup(createElement(ReadOnlyNotice, { reason: door.reason, onClose: () => {} }))
    expect(html).toContain('role="status"')
    expect(html).toContain(GUEST_HINT.FORBIDDEN as string)
    expect(html).toContain('href="/login"')
    expect(html).toContain('내 팀으로 시작하기')
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toMatch(/owner/i)
  })

  it('화면 5 가 모달을 여는 자리는 하나이고, 그 자리는 `writeDoor()` 를 먼저 읽는다', () => {
    const page = readFileSync(
      fileURLToPath(new URL('../src/app/t/[team]/p/[project]/context/page.tsx', import.meta.url)), 'utf8')
    const opens = page.match(/setPublishing\(true\)/g) ?? []
    expect(opens.length, '모달을 여는 자리가 둘 이상이면 하나는 문을 안 읽는다').toBe(1)
    const fn = page.slice(page.indexOf('function openPublish'), page.indexOf('setPublishing(true)'))
    expect(fn).toContain('writeDoor()')
    expect(page).toContain('<ReadOnlyNotice')
    //  드로어의 「owner 만」 캡션도 같은 문을 읽는다 — 게스트에게 그 문장을 그대로 내지 않는다.
    expect(page).not.toMatch(/<span className="meta">상태를 바꾸는 것은 팀 owner 만/)
  })
})

describe('🔴 INBOX H7 — 쓰기 버튼이 있는 화면은 전부 같은 문을 지난다', () => {
  const webSrc = fileURLToPath(new URL('../src', import.meta.url))
  const queries = readFileSync(`${webSrc}/lib/web/queries.ts`, 'utf8')

  /** `queries.ts` 에서 `post(`·`patch(` 로 서버에 **쓰는** 함수 이름을 뽑는다 — 목록을 손으로 적지 않는다. */
  //  ⚠ 함수의 끝은 줄 머리의 `}` 다음 줄바꿈이다 — 반환 타입의 `}> {` 에서 끊기지 않게 `\n}\n` 까지 읽는다.
  const WRITE_QUERIES = [...queries.matchAll(/export (?:async )?function (\w+)\([\s\S]*?\n\}\n/g)]
    .filter((m) => /\b(?:post|patch|del)\(/.test(m[0]))
    .map((m) => m[1] as string)

  function pages(dir: string, found: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const full = `${dir}/${name}`
      if (statSync(full).isDirectory()) pages(full, found)
      else if (name === 'page.tsx') found.push(full)
    }
    return found
  }

  it('쓰는 함수 목록이 비어 있지 않다 — 비면 아래 시험은 공짜 통과다', () => {
    expect(WRITE_QUERIES).toContain('createDocument')
    expect(WRITE_QUERIES).toContain('publishVersion')
    expect(WRITE_QUERIES.length).toBeGreaterThan(5)
  })

  it.each(pages(`${webSrc}/app/t`).map((f) => [f.slice(webSrc.length + 1), f] as const))(
    '%s — 쓰는 함수를 부르면 `writeDoor()` 를 읽는다',
    (_name, file) => {
      const source = readFileSync(file, 'utf8')
      const writes = WRITE_QUERIES.filter((fn) => new RegExp(`\\b${fn}\\(`).test(source))
      if (writes.length === 0) return
      //  ⚠ 어떻게 읽든(직접 · `door` prop 으로 내려보내든) 이 파일 어딘가에서 `writeDoor()` 가 불려야 한다.
      expect(source, `${writes.join('·')} 를 부르는데 writeDoor() 를 안 읽는다`).toContain('writeDoor()')
    },
  )
})
