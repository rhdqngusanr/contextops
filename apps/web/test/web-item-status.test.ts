import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ITEM_STATUSES, ITEM_STATUS_EXCLUDE_REASON, parseContextItem,
  type ContextItem, type ItemStatus,
} from '@contextops/schema'
import { COMPILER_VERSION, TEMPLATE_VERSION, compile } from '@contextops/compiler'

import { ITEM_STATUS_CHIP } from '../src/components/chips'
import {
  ITEM_STATUS_ACTIONS, ItemStatusActions, actionCaption, packEffectOf,
} from '../src/components/item-status-actions'

// =====================================================================
//  🔴 **초안을 승인하는 문**이 실제로 있고, 그 문이 표를 읽어서 그린다 (FINDINGS 79)
//
//  ★ 왜 이 파일이 생겼나 — 화면에는 항목의 상태를 바꿀 문이 **하나도 없었다.**
//    씨앗 질문에 답해 만든 항목은 `draft` 로 남고 `active` 만 Pack 에 나가서, 열 개에
//    다 답하고 발행해도 **자기 답이 하나도 없는 Pack** 이 나왔다.
//
//  재는 것 — 세 단계이고 앞의 둘만으로는 아무것도 증명하지 않는다:
//    ① 표의 키가 `ITEM_STATUSES` 와 같고, 나가는 문이 없는 상태가 없다
//    ② 상태마다 **다른 버튼 묶음**이 나온다 (넷이 같은 화면이면 표가 죽은 것이다)
//    ③ 🔴 캡션이 **컴파일러가 실제로 하는 일**과 같다 — 같은 항목의 status 만 뒤집어
//       컴파일하고, Pack 에 그 줄이 있는지로 잰다. 문장을 베껴 적으면 여기서 빨개진다.
// =====================================================================

function render(status: ItemStatus): string {
  return renderToStaticMarkup(createElement(ItemStatusActions, {
    state: { status, busy: null, error: null },
    onChange: () => {},
  }))
}

describe('🔴 상태 전이 표 — 키가 enum 과 같고 막다른 골목이 없다', () => {
  it('네 상태가 전부 표에 있다', () => {
    expect(Object.keys(ITEM_STATUS_ACTIONS).sort()).toEqual([...ITEM_STATUSES].sort())
  })

  it('나가는 문이 없는 상태가 없다 — 드로어가 막다른 골목이 되지 않는다', () => {
    for (const status of ITEM_STATUSES) {
      expect(ITEM_STATUS_ACTIONS[status].length, status).toBeGreaterThan(0)
    }
  })

  it('제자리로 가는 문은 없고, 목적지가 겹치지 않는다', () => {
    for (const status of ITEM_STATUSES) {
      const targets = ITEM_STATUS_ACTIONS[status].map((a) => a.to)
      expect(targets, status).not.toContain(status)
      expect(new Set(targets).size, status).toBe(targets.length)
    }
  })

  it('네 상태 어디로든 갈 수 있다 — 아무도 못 만드는 상태가 없다', () => {
    const reachable = new Set(ITEM_STATUSES.flatMap((s) => ITEM_STATUS_ACTIONS[s].map((a) => a.to)))
    expect([...reachable].sort()).toEqual([...ITEM_STATUSES].sort())
  })

  it('🔴 상태마다 화면이 갈린다 — 값을 바꾸면 다른 버튼이 나온다', () => {
    const drawn = ITEM_STATUSES.map(render)
    expect(new Set(drawn).size, `네 상태가 같은 화면을 낸다`).toBe(ITEM_STATUSES.length)
  })
})

describe('🔴 캡션이 컴파일러가 하는 일과 같다 (표를 베껴 적지 않았다)', () => {
  const PROJECT = '00000000-0000-4000-8000-000000000000'
  const RULE = { rule: 'PSP 호출은 5회까지 재시도한다', severity: 'must', enforcement: 'review' }

  //  ⚠ 캐스트하지 않고 **계약으로 판다** — 표본이 계약을 어기면 여기서 먼저 터진다.
  function item(id: string, status: ItemStatus, data: Record<string, unknown>, type: 'mission' | 'policy'): ContextItem {
    return parseContextItem({
      id,
      project_id: PROJECT,
      type,
      title: `${type} 표본`,
      body: '',
      status,
      scope: { kind: 'project' },
      priority: 50,
      source_refs: [{ kind: 'manual', note: '팀 합의' }],
      tags: [],
      confidence: 'high',
      revision: 1,
      data,
    })
  }

  /**
   * policy 항목 하나의 `status` 만 뒤집어 Pack 을 만든다.
   * ⚠ mission 하나를 늘 같이 넣는다 — Pack 이 통째로 비면 컴파일이 실패해서
   *   「빠졌다」와 「못 만들었다」를 구별할 수 없다.
   */
  function packOf(status: ItemStatus): string {
    const result = compile({
      snapshot: {
        team_id: '00000000-0000-4000-8000-000000000001',
        project_id: PROJECT,
        context_version: '1.0.0',
        generated_at: '2026-09-04T00:00:00.000Z',
        items: [
          item('item_anchor_mission', 'active', { statement: '결제를 안전하게 만든다.' }, 'mission'),
          item('item_retry_policy', status, RULE, 'policy'),
        ],
      },
      project: { name: 'paylab-api' },
      templateVersion: TEMPLATE_VERSION,
      compilerVersion: COMPILER_VERSION,
    })
    return result.files.map((f) => f.text).join('\n')
  }

  it('「다음 Pack 에 나갑니다」라고 적은 상태만 실제로 나간다', () => {
    for (const status of ITEM_STATUSES) {
      const inPack = packOf(status).includes(RULE.rule)
      expect(packEffectOf(status) === '다음 Pack 에 나갑니다', `${status}: 캡션과 Pack 이 다르다`)
        .toBe(inPack)
    }
  })

  it('캡션의 정본이 `ITEM_STATUS_EXCLUDE_REASON` 이다 — 화면이 따로 세지 않는다', () => {
    for (const status of ITEM_STATUSES) {
      expect(packEffectOf(status), status).toBe(
        ITEM_STATUS_EXCLUDE_REASON[status] === null ? '다음 Pack 에 나갑니다' : '다음 Pack 에서 빠집니다',
      )
    }
  })
})

describe('버튼 밑에 「무엇이 되나」가 상태 이름과 Pack 둘 다로 붙는다', () => {
  it('🔴 캡션이 버튼 문구를 되풀이하지 않는다 — 「폐기 · 폐기」가 없다', () => {
    for (const status of ITEM_STATUSES) {
      for (const action of ITEM_STATUS_ACTIONS[status]) {
        const caption = actionCaption(action)
        const name = ITEM_STATUS_CHIP[action.to].label
        //  버튼이 이미 그 이름을 담고 있으면 캡션에 또 나오면 안 된다.
        if (action.label.includes(name)) expect(caption, `${status}/${action.to}`).not.toContain(name)
        //  담고 있지 않으면 **반드시** 알려 줘야 한다 — 안 그러면 어디로 가는지 모른다.
        else expect(caption, `${status}/${action.to}`).toContain(name)
        expect(caption).toContain(packEffectOf(action.to))
      }
    }
  })

  it('초안 카드는 승인·검토 요청·버리기 셋을 그리고, 승인만 「나갑니다」다', () => {
    const html = render('draft')
    for (const action of ITEM_STATUS_ACTIONS.draft) {
      expect(html).toContain(action.label)
      expect(html).toContain(actionCaption(action))
    }
    //  ⚠ 「나갑니다」는 딱 한 번이어야 한다 — 초안에서 갈 수 있는 곳 중 Pack 에 나가는
    //     것은 `active` 하나다. 두 번 나오면 표나 캡션 중 하나가 거짓말한다.
    expect(html.split('다음 Pack 에 나갑니다').length - 1).toBe(1)
  })

  it('저장하는 중에는 버튼이 전부 잠긴다 — 두 번 누르면 409 다', () => {
    const html = renderToStaticMarkup(createElement(ItemStatusActions, {
      state: { status: 'draft', busy: 'active', error: null },
      onChange: () => {},
    }))
    expect(html).toContain('저장하는 중입니다')
    expect(html.split('disabled=""').length - 1).toBe(ITEM_STATUS_ACTIONS.draft.length)
  })

  it('실패하면 서버가 낸 문구를 그대로 낸다 — 화면이 지어내지 않는다', () => {
    const html = renderToStaticMarkup(createElement(ItemStatusActions, {
      state: { status: 'active', busy: null, error: '항목이 그 사이 바뀌었다 — 다시 읽고 보내라' },
      onChange: () => {},
    }))
    expect(html).toContain('항목이 그 사이 바뀌었다')
  })
})
