import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SETUP_COMMAND_FLAGS, SETUP_COMMAND_NAME, setupCommandLine } from '@contextops/schema'

import { ADD_DEVICE, AddDevice, type AddDeviceState } from '../src/components/sync'
import { ApiClientError } from '../src/lib/web/api'
import { EMPTY_PLACES } from '../src/lib/web/screens'

// =====================================================================
//  🔴 **`setup` 이 가리키던 토큰 발급 화면** — 네 모양을 다 그려서 읽는다 (FINDINGS 36)
//
//  ★ 무엇이 고장이었나 — `contextops setup` 은 「브라우저에서 기기 토큰을 발급받아
//    붙여 넣어라」고 안내하는데 웹에 그 화면이 **없었다.** 토큰을 만드는 길은
//    `POST /projects/{id}/tokens` 를 손으로 부르는 것뿐이었다.
//
//  재는 것 여섯:
//    ① 네 모양(`closed`·`denied`·`form`·`issued`)이 **전부 그려진다** — 브라우저로는
//      그때 마침 그 모양인 하나밖에 못 본다
//    ② 🔴 **한 줄이 통째로 있다** — 플래그 넷이 다 있고 값이 다 박혀 있다
//      (사람이 uuid 를 손으로 옮기면 반드시 하나를 흘린다)
//    ③ 🔴 **줄을 화면이 짓지 않는다** — `components/sync.tsx` 에 `--api-origin` 같은
//      플래그 글자가 0건이다. 정본은 `packages/schema` 의 `setupCommandLine` 하나다
//    ④ 🔴 **「한 번만 보인다」를 말한다** — 서버에는 sha256 만 남는다 (라우트 머리 주석)
//    ⑤ accent 는 **화면당 하나** — 이 칸에서 `btn-primary` 는 [기기 추가] 뿐이다
//    ⑥ 게스트는 **누른 자리에서** 이유를 듣는다 (FINDINGS 135 와 같은 문)
//
//  ⚠ 이 시험이 재지 **못하는** 것: 간격·색·글꼴, 그리고 클립보드가 실제로 붙여넣어지나.
//    앞의 둘은 캡처가, 뒤의 하나는 사람이 본다.
// =====================================================================

const ORIGIN = 'https://contextops.example.com'
const PROJECT = '11111111-2222-4333-8444-555555555555'
const DEVICE = '66666666-7777-4888-8999-aaaaaaaaaaaa'
const TOKEN = 'ctx_abcdefghijklmnopqrstuvwxyz0123456789ABCDEF'

const ISSUED = { token: TOKEN, device_id: DEVICE, expires_at: '2026-12-31T09:00:00.000Z' }

const NO_OP = {
  open: () => undefined,
  close: () => undefined,
  name: () => undefined,
  submit: () => undefined,
  copy: () => undefined,
}

function html(state: AddDeviceState): string {
  return renderToStaticMarkup(createElement(AddDevice, {
    state, apiOrigin: ORIGIN, projectId: PROJECT, on: NO_OP,
  }))
}

const SOURCE = readFileSync(fileURLToPath(new URL('../src/components/sync.tsx', import.meta.url)), 'utf8')

describe('① 네 모양이 전부 그려진다', () => {
  it('닫힌 모양 — [기기 추가] 버튼과 무엇을 발급하는지 한 줄', () => {
    const markup = html({ kind: 'closed' })
    expect(markup).toContain(ADD_DEVICE.open)
    expect(markup).toContain(ADD_DEVICE.why)
    expect(markup).toContain('aria-expanded="false"')
    //  아직 아무것도 열지 않았다 — 입력칸도 토큰도 없다.
    expect(markup).not.toContain(ADD_DEVICE.nameLabel)
    expect(markup).not.toContain(TOKEN)
  })

  it('폼 모양 — 이름 입력칸 · [토큰 발급] · 빈 이름이면 못 누른다', () => {
    const empty = html({ kind: 'form', name: '', busy: false, error: null })
    expect(empty).toContain(ADD_DEVICE.nameLabel)
    expect(empty).toContain(ADD_DEVICE.submit)
    expect(empty).toContain('disabled')
    expect(empty).toContain('aria-expanded="true"')

    const typed = html({ kind: 'form', name: 'mac-노트북', busy: false, error: null })
    expect(typed).toContain('mac-노트북')
    expect(typed).not.toContain('disabled')
  })

  it('폼 모양 — 발급 중에는 못 누르고, 실패하면 그 자리에서 오류를 말한다', () => {
    const busy = html({ kind: 'form', name: 'mac', busy: true, error: null })
    expect(busy).toContain(ADD_DEVICE.busy)
    expect(busy).toContain('disabled')

    const failed = html({
      kind: 'form', name: 'mac', busy: false, error: new ApiClientError('FORBIDDEN', 403, undefined, 'req_1'),
    })
    //  오류 상태의 짜임은 `ErrorState` 것이다 — 여기서 다시 짓지 않는다.
    expect(failed).toContain('req_1')
  })

  it('발급된 모양 — 토큰 · 한 줄 · 만료일 · [닫기] 뒤에 무엇이 달라지나', () => {
    const markup = html({ kind: 'issued', issued: ISSUED, copied: null })
    expect(markup).toContain(TOKEN)
    expect(markup).toContain(ADD_DEVICE.expires('2026-12-31'))
    expect(markup).toContain(ADD_DEVICE.after)
  })

  it('복사한 뒤에는 그 버튼이 「복사했습니다」라고 말한다 — 누른 자리에서', () => {
    const token = html({ kind: 'issued', issued: ISSUED, copied: 'token' })
    expect(token).toContain(ADD_DEVICE.copied)
    expect(token).not.toContain(ADD_DEVICE.copyToken)
    //  ⚠ 다른 버튼은 그대로다 — 하나를 누르면 둘 다 「복사했습니다」가 되면 거짓말이다.
    expect(token).toContain(ADD_DEVICE.copyCommand)

    const command = html({ kind: 'issued', issued: ISSUED, copied: 'command' })
    expect(command).toContain(ADD_DEVICE.copyToken)
    expect(command).not.toContain(ADD_DEVICE.copyCommand)
  })
})

describe('② 🔴 한 줄이 통째로 있다 — 사람이 uuid 를 손으로 옮기지 않는다', () => {
  const markup = html({ kind: 'issued', issued: ISSUED, copied: null })
  const line = setupCommandLine({
    api_origin: ORIGIN, project_id: PROJECT, token: TOKEN, device_id: DEVICE,
  })

  it('화면에 그 줄이 글자 그대로 있다', () => {
    expect(markup).toContain(SETUP_COMMAND_NAME)
    expect(markup).toContain(line)
  })

  it('플래그 넷이 다 있고 값이 다 박혀 있다 — 특히 `device_id`', () => {
    for (const flag of SETUP_COMMAND_FLAGS) expect(line, flag).toContain(`--${flag} `)
    for (const value of [ORIGIN, PROJECT, TOKEN, DEVICE]) expect(line).toContain(value)
    //  🔴 `device_id` 는 발급 응답에만 있는 값이다. 이 줄이 없으면 늘 빠지고,
    //     그러면 「이 기기만 끊기」(`DELETE /devices/{id}`)가 영원히 안 된다.
    expect(line).toContain(`--device-id ${DEVICE}`)
  })

  it('긴 줄이 자기 칸 안에서만 넘친다 — 본문이 가로로 밀리지 않는다 (⑦3층)', () => {
    expect(markup).toContain('scroll-x')
  })
})

describe('③ 🔴 줄을 화면이 짓지 않는다 — 정본은 스키마 하나다', () => {
  it('`components/sync.tsx` 에 setup 플래그 글자가 0건이다', () => {
    for (const flag of SETUP_COMMAND_FLAGS) {
      expect(SOURCE, `--${flag} 를 화면이 손으로 적었다 — CLI 와 갈린다`).not.toContain(`--${flag}`)
    }
  })

  it('그리고 `setupCommandLine` 을 부른다 — 부르지 않으면 위 검사는 그냥 통과한다', () => {
    expect(SOURCE).toContain('setupCommandLine')
  })
})

describe('④ 🔴 「한 번만 보인다」를 말한다', () => {
  it('경고가 아이콘과 글자를 같이 낸다 — 색만으로 말하지 않는다', () => {
    const markup = html({ kind: 'issued', issued: ISSUED, copied: null })
    expect(markup).toContain(ADD_DEVICE.once)
    expect(markup).toContain('⚠')
    expect(ADD_DEVICE.once).toContain('한 번만')
  })
})

describe('⑤ accent 는 이 화면에 하나다 (DESIGN_BRIEF §3)', () => {
  it('어떤 모양에서도 `btn-primary` 는 최대 하나다', () => {
    const states: AddDeviceState[] = [
      { kind: 'closed' },
      { kind: 'denied', reason: '읽기 전용으로 둘러보는 중입니다.' },
      { kind: 'form', name: 'mac', busy: false, error: null },
      { kind: 'issued', issued: ISSUED, copied: null },
    ]
    for (const state of states) {
      const count = html(state).split('btn-primary').length - 1
      expect(count, state.kind).toBeLessThanOrEqual(1)
    }
  })
})

describe('⑥ 게스트는 누른 자리에서 이유를 듣는다 (FINDINGS 135)', () => {
  it('거절된 모양은 이유와 [내 팀으로 시작하기] 를 그린다 — 발급 칸은 안 열린다', () => {
    const reason = '읽기 전용으로 둘러보는 중입니다. 바꾸려면 내 팀으로 시작해야 합니다.'
    const markup = html({ kind: 'denied', reason })
    expect(markup).toContain(reason)
    expect(markup).toContain('/login')
    expect(markup).not.toContain(ADD_DEVICE.submit)
  })
})

describe('🔴 빈 상태가 이제 그 문을 가리킨다 — 「웹에 그 문이 없다」가 아니다', () => {
  it('`sync.devices` 의 문구와 이유가 [기기 추가] 를 말한다', () => {
    const place = EMPTY_PLACES['sync.devices']
    expect(place.message).toContain(ADD_DEVICE.open)
    expect(place.noNext).toContain(ADD_DEVICE.open)
  })
})
