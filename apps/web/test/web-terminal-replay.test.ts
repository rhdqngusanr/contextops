import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReplayFrames, isReplayCommand } from '@contextops/schema'

import { Landing, REPLAY_FRAMES, TERMINAL_REPLAY } from '../src/components/landing'
import { REPLAY_PACE, TerminalReplay, panelState } from '../src/components/terminal-replay'
import { paylabDrafts } from '../src/lib/demo/seed'

// =====================================================================
//  🔴 화면 1 C-3 — 터미널 재생을 **그려서 읽는다** (SPEC §10.4 · loop/PROMPT.md ⑦3층)
//
//  재는 것:
//    ① 🔴 **녹화는 지어낸 것이 아니다** — `fixtures/replay/sync.json` 이 계약(`ReplayFrames`)을
//      지나고, 이야기(훅 알림 → /contextops:sync → progress 보고)가 그 줄에 실제로 있다.
//      (그 줄이 **지금 CLI 의 출력과 같은가**는 관통 sync 단계가 매번 다시 녹화해 잰다 —
//      여기서는 못 잰다. 관통이 그 게이트다.)
//    ② 🔴 **P7** — 오른쪽 패널의 마일스톤은 씨앗의 PL-M1 과 글자 그대로 같고, 보고 줄이
//      가리키는 완료 기준은 그 done_when 안의 문장이다
//    ③ 패널은 왼쪽 줄을 읽어서 바뀐다 — 0줄이면 근거 0 / 3, 다 드러나면 1 / 3 (보고 하나가
//      실제로 그만큼만 바꾼다)
//    ④ 서버 렌더는 전부 드러난 상태다 — JS 없이도 글로 다 읽힌다 · 버튼 없음 · 「실시간」 없음
//    ⑤ 재생 속도는 표시용 상수이고 줄의 순서·내용을 바꾸지 않는다
//
//  ⚠ 이 시험이 재지 **못하는** 것: 타이핑이 실제로 움직이는가 · 390px 에서 한 열로 접히는가.
//    그건 브라우저 캡처가 있어야 한다 (docs/STATUS.md 「눈 판정 대기」).
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = join(webRoot, '..', '..')
const fixtures = join(repoRoot, 'fixtures')

/** React 는 글 안의 따옴표를 `&quot;` 로 낸다 — 녹화 줄에는 따옴표가 있다. */
function escaped(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

function html(): string {
  return renderToStaticMarkup(createElement(TerminalReplay, { frames: REPLAY_FRAMES, milestone: TERMINAL_REPLAY.milestone }))
}

describe('🔴 ① 녹화는 관통이 남긴 실제 출력이다 (fixtures/replay/sync.json)', () => {
  it('파일이 ReplayFrames 계약을 지나고, 랜딩이 읽는 것이 그 파일이다', () => {
    const raw = JSON.parse(readFileSync(join(fixtures, 'replay', 'sync.json'), 'utf8'))
    expect(ReplayFrames.parse(raw)).toEqual(REPLAY_FRAMES)
    expect(REPLAY_FRAMES.length).toBeGreaterThan(5)
  })

  it('이야기가 줄에 있다 — 훅 알림 → /contextops:sync → progress 보고', () => {
    const texts = REPLAY_FRAMES.map((f) => f.text)
    const hookAt = texts.findIndex((t) => t.startsWith('ContextOps: '))
    const syncAt = texts.findIndex((t) => t === '> /contextops:sync')
    const appliedAt = texts.findIndex((t) => /^v\S+ → v\S+ · 파일 \d+개를 적용했다$/.test(t))
    const progressAt = texts.findIndex((t) => t.startsWith('$ ') && t.includes(' progress --milestone '))
    const reportAt = texts.findIndex((t) => t.startsWith(`보고했다 — ${TERMINAL_REPLAY.milestone.id} · criterion_done`))
    expect(hookAt).toBeGreaterThanOrEqual(0)
    expect(syncAt).toBeGreaterThan(hookAt)
    expect(appliedAt).toBeGreaterThan(syncAt)
    expect(progressAt).toBeGreaterThan(appliedAt)
    expect(reportAt).toBeGreaterThan(progressAt)
    //  훅은 「파일을 변경하지 않는다」고 스스로 말한다 (P6) — 그 줄이 녹화에 있다.
    expect(texts.some((t) => t.includes('Hook은 파일을 변경하지 않습니다'))).toBe(true)
  })

  it('명령 줄은 둘뿐이고 (사용자의 슬래시 명령 · agent 의 progress) 나머지는 stdout 이다', () => {
    const commands = REPLAY_FRAMES.filter((f) => isReplayCommand(f.text))
    expect(commands).toHaveLength(2)
    //  progress 명령은 Pack 의 고정 문단(SPEC §4.3)이 가르치는 모양 그대로다.
    const progress = commands[1]?.text ?? ''
    expect(progress).toContain('node "$CLAUDE_PLUGIN_ROOT/bin/contextops-cli.mjs" progress --milestone ')
    expect(progress).toMatch(/--criterion "[^"]+"/)
    expect(progress).toMatch(/--evidence \S+:\d+-\d+/)
    expect(progress).toMatch(/--summary "[^"]+"/)
  })
})

describe('🔴 ② P7 — 패널의 마일스톤은 씨앗의 PL-M1 이다', () => {
  it('id · 제목 · done_when 이 paylabDrafts() 의 로드맵 초안과 글자 그대로 같다', () => {
    const goalsText = readFileSync(join(fixtures, 'paylab-docs', 'goals.md'), 'utf8')
    const retryText = readFileSync(join(fixtures, 'paylab-api', 'src', 'payment', 'retry.ts'), 'utf8')
    const drafts = paylabDrafts(
      { file: 'paylab-docs/goals.md', versionId: 'replay-test', text: goalsText },
      { repo: 'paylab-api', path: 'src/payment/retry.ts', text: retryText },
    )
    const m1 = drafts
      .map((d) => d.draft as { type: string; title: string; data?: { milestone_id?: string; done_when?: string[] } })
      .find((d) => d.type === 'roadmap' && d.data?.milestone_id === TERMINAL_REPLAY.milestone.id)
    expect(m1, '씨앗에 PL-M1 이 없다').toBeDefined()
    expect(m1?.title).toBe(TERMINAL_REPLAY.milestone.title)
    expect(m1?.data?.done_when).toEqual([...TERMINAL_REPLAY.milestone.done_when])
  })

  it('보고 줄이 가리키는 완료 기준이 done_when 안의 문장이고, 근거는 픽스처 저장소의 경로다', () => {
    const progress = REPLAY_FRAMES.find((f) => f.text.startsWith('$ ') && f.text.includes(' progress '))?.text ?? ''
    const criterion = /--criterion "([^"]+)"/.exec(progress)?.[1]
    expect(criterion).toBeDefined()
    expect(TERMINAL_REPLAY.milestone.done_when).toContain(criterion)
    const evidence = /--evidence (\S+):\d+-\d+/.exec(progress)?.[1] ?? ''
    expect(readFileSync(join(fixtures, 'paylab-api', ...evidence.split('/')), 'utf8').length).toBeGreaterThan(0)
  })
})

describe('③ 패널은 왼쪽 줄을 읽어서 바뀐다 (panelState)', () => {
  it('0줄이면 근거 0 / 3 · 보고 0건', () => {
    expect(panelState(REPLAY_FRAMES, 0, TERMINAL_REPLAY.milestone)).toEqual({ done: [], reports: 0, version: null })
  })

  it('다 드러나면 근거 1 / 3 — 보고 하나가 실제로 그만큼만 바꾼다', () => {
    const state = panelState(REPLAY_FRAMES, REPLAY_FRAMES.length, TERMINAL_REPLAY.milestone)
    expect(state.reports).toBe(1)
    expect(state.done).toEqual([TERMINAL_REPLAY.milestone.done_when[0]])
    expect(state.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('보고 줄 직전까지는 0 이고, 그 줄에서 1 이 된다 (같은 시각)', () => {
    const reportAt = REPLAY_FRAMES.findIndex((f) => f.text.startsWith('보고했다 — '))
    expect(panelState(REPLAY_FRAMES, reportAt, TERMINAL_REPLAY.milestone).done).toEqual([])
    expect(panelState(REPLAY_FRAMES, reportAt + 1, TERMINAL_REPLAY.milestone).done).toHaveLength(1)
  })

  it('다른 마일스톤의 보고는 세지 않는다', () => {
    const other = { ...TERMINAL_REPLAY.milestone, id: 'PL-M2' }
    expect(panelState(REPLAY_FRAMES, REPLAY_FRAMES.length, other)).toEqual({ done: [], reports: 0, version: null })
  })
})

describe('④ 서버 렌더 — 전부 드러난 상태로 글로 읽힌다', () => {
  it('녹화의 모든 줄이 마크업에 있다', () => {
    const out = html()
    for (const f of REPLAY_FRAMES) expect(out, f.text).toContain(escaped(f.text))
  })

  it('패널이 근거 1 / 3 을 말하고, 세 완료 기준이 전부 서 있다 — 기호(✓/○)와 글자로 갈린다', () => {
    const out = html()
    expect(out).toContain('근거 1 / 3')
    for (const c of TERMINAL_REPLAY.milestone.done_when) expect(out).toContain(c)
    expect(out).toContain('>✓</span>')
    expect(out).toContain('>○</span>')
    expect(out).toContain('role="progressbar"')
    expect(out).toContain('aria-valuenow="1"')
  })

  it('버튼이 없고 「실시간」이 없고, 터미널은 scroll-x 안의 <pre> 다', () => {
    const out = html()
    expect(out).not.toContain('<button')
    expect(out).not.toContain('실시간')
    expect(out).toMatch(/scroll-x[^>]*><pre/)
  })

  it('랜딩이 이 절을 그린다 — 제목 · 설명 · 출처', () => {
    const out = renderToStaticMarkup(createElement(Landing))
    expect(out).toContain(TERMINAL_REPLAY.title)
    expect(out).toContain(TERMINAL_REPLAY.lead)
    expect(out).toContain(escaped(TERMINAL_REPLAY.source))
    expect(out).toContain('> /contextops:sync'.replace('>', '&gt;'))
  })
})

describe('⑤ 재생 속도는 표시용이다', () => {
  it('걸음 상수가 전부 양수이고, 줄 사이 최소가 최대보다 작다', () => {
    for (const v of Object.values(REPLAY_PACE)) expect(v).toBeGreaterThan(0)
    expect(REPLAY_PACE.min_gap_ms).toBeLessThan(REPLAY_PACE.max_gap_ms)
  })

  it('녹화의 t_ms 는 줄 순서대로 늘어난다 (계약이 잰다 — 여기서는 첫 줄이 0 근처인지만)', () => {
    expect(REPLAY_FRAMES[0]?.t_ms).toBeLessThan(1000)
  })
})
