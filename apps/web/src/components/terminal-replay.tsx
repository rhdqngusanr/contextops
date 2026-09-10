'use client'

import { useEffect, useState } from 'react'
import { REPLAY_PROMPTS, isReplayCommand, type ReplayFrame } from '@contextops/schema'

import { Chip, EVIDENCE_CHIP } from './chips'
import styles from './terminal-replay.module.css'

// =====================================================================
//  터미널 재생 (SPEC §10.4 · DESIGN_BRIEF 화면 1 C-3)
//
//  좌: 녹화된 줄이 순서대로 드러난다 (명령 줄은 타이핑) · 우: 같은 시각의 Roadmap 미니 패널.
//
//  🔴 **대사는 여기 없다.** 줄은 전부 `fixtures/replay/*.json` 에서 오고, 그 파일은 관통이
//     배포되는 플러그인을 실제로 돌려 남긴 stdout 이다 (`packages/schema` 의 `ReplayFrame` 주석).
//     화면이 문장을 하나라도 지어 넣으면 「실제 도구가 이렇게 말한다」가 거짓이 된다.
//
//  🔴 **오른쪽 패널은 왼쪽 줄을 읽어서 바뀐다** (`panelState`). 별도의 타임라인을 손으로
//     맞추지 않는다 — 두 타임라인을 따로 두면 CLI 문장이 바뀐 날 한쪽만 움직인다.
//     보고 줄의 모양(`보고했다 — <ID> · <status> · …`)은 CLI 가 정하고, 관통이 픽스처와
//     대조하므로 그 모양이 바뀌면 여기가 아니라 관통이 먼저 빨개진다.
//
//  ⚠ 서버 렌더는 **전부 드러난 상태**다 — JS 가 없어도 글로 다 읽히고, 시험이 그 마크업을
//    읽는다. 마운트 뒤에 처음부터 재생한다. `prefers-reduced-motion` 이면 재생하지 않는다.
//  ⚠ 버튼이 없다 — 랜딩은 정적 화면이고 「누르면 아무 일도 안 하는 것」을 두지 않는다.
//    끝나면 잠시 멈췄다가 처음부터 다시 돈다.
//  ⚠ 「실시간」이라고 쓰지 않는다 (DESIGN_BRIEF §2-3). 이건 녹화다.
// =====================================================================

export type ReplayMilestone = {
  id: string
  title: string
  done_when: readonly string[]
}

/**
 * 재생의 걸음 — **표시용**이다. 녹화의 `t_ms` 는 실제 지연(한 명령의 stdout 은 같은 시각에
 * 온다)이라 그대로 틀면 0.3초 만에 끝나 아무도 못 읽는다. 사람이 읽는 속도로 늘린 값이고,
 * 줄의 **순서와 내용**은 손대지 않는다.
 */
export const REPLAY_PACE = {
  /** 명령 한 글자 */
  type_ms: 22,
  /** 줄 사이 최소 — 같은 시각에 온 stdout 도 한 줄씩 보이게 */
  min_gap_ms: 140,
  /** 녹화의 긴 틈은 여기까지만 기다린다 */
  max_gap_ms: 1200,
  /** 명령을 다 친 뒤 Enter 까지 */
  enter_ms: 600,
  /** 첫 줄 앞 */
  lead_ms: 800,
  /** 끝난 뒤 처음으로 돌아가기 전 */
  hold_ms: 7000,
} as const

const PROMPT_LEN = REPLAY_PROMPTS[0].length

/** `frames[i]` 를 드러내기 전에 기다리는 시간 — 녹화의 틈을 읽을 수 있는 범위로 누른다. */
function gapBefore(frames: readonly ReplayFrame[], i: number): number {
  if (i === 0) return REPLAY_PACE.lead_ms
  const raw = (frames[i]?.t_ms ?? 0) - (frames[i - 1]?.t_ms ?? 0)
  return Math.min(REPLAY_PACE.max_gap_ms, Math.max(REPLAY_PACE.min_gap_ms, raw))
}

/**
 * 드러난 줄(`revealed`개)로 오른쪽 패널의 상태를 센다 — 순수 함수라 시험이 읽는다.
 * 보고 줄이 가리키는 완료 기준은 **바로 앞 명령 줄의 `--criterion "…"`** 이다 (CLI 는 보고 줄에
 * 문장을 다시 찍지 않는다). 마일스톤의 `done_when` 에 글자 그대로 있는 문장만 센다 (P7).
 */
export function panelState(
  frames: readonly ReplayFrame[],
  revealed: number,
  milestone: ReplayMilestone,
): { done: readonly string[]; reports: number; version: string | null } {
  const done: string[] = []
  let reports = 0
  let version: string | null = null
  let lastCriterion: string | undefined
  for (const frame of frames.slice(0, revealed)) {
    if (isReplayCommand(frame.text)) {
      lastCriterion = /--criterion "([^"]+)"/.exec(frame.text)?.[1]
      continue
    }
    const m = /^보고했다 — (\S+) · (\S+) · .* · v(\S+)$/.exec(frame.text)
    if (m === null || m[1] !== milestone.id) continue
    reports += 1
    version = m[3] ?? null
    if (m[2] === 'criterion_done' && lastCriterion !== undefined
      && milestone.done_when.includes(lastCriterion) && !done.includes(lastCriterion)) {
      done.push(lastCriterion)
    }
  }
  return { done, reports, version }
}

export function TerminalReplay({ frames, milestone }: { frames: readonly ReplayFrame[]; milestone: ReplayMilestone }) {
  //  서버와 첫 클라이언트 렌더는 **전부 드러난 상태**로 같다 (hydration 이 어긋나지 않게).
  const [shown, setShown] = useState(frames.length)
  const [typed, setTyped] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setShown(0)
    setTyped(0)
    setPlaying(true)
  }, [])

  useEffect(() => {
    if (!playing) return
    const current = frames[shown]
    let delay: number
    let step: () => void
    if (current === undefined) {
      delay = REPLAY_PACE.hold_ms
      step = () => { setShown(0); setTyped(0) }
    } else if (isReplayCommand(current.text) && typed < current.text.length) {
      //  프롬프트(`> `·`$ `)는 한 번에 서고, 그 뒤부터 한 글자씩이다.
      delay = typed === 0 ? gapBefore(frames, shown) : REPLAY_PACE.type_ms
      step = () => setTyped(typed === 0 ? PROMPT_LEN : typed + 1)
    } else if (isReplayCommand(current.text)) {
      delay = REPLAY_PACE.enter_ms
      step = () => { setShown(shown + 1); setTyped(0) }
    } else {
      delay = gapBefore(frames, shown)
      step = () => setShown(shown + 1)
    }
    const timer = window.setTimeout(step, delay)
    return () => window.clearTimeout(timer)
  }, [playing, shown, typed, frames])

  const typing = playing ? frames[shown] : undefined
  const panel = panelState(frames, shown, milestone)

  return (
    <div className={styles.replay}>
      <div className={`card scroll-x ${styles.term}`}>
        <pre className={styles.pre} aria-label="터미널 녹화">
          {frames.slice(0, shown).map((f, i) => (
            <span key={i} className={isReplayCommand(f.text) ? styles.cmd : styles.out}>
              {i > 0 ? '\n' : ''}
              {f.text}
            </span>
          ))}
          {typing !== undefined && isReplayCommand(typing.text) && typed > 0 ? (
            <span className={styles.cmd}>
              {shown > 0 ? '\n' : ''}
              {typing.text.slice(0, typed)}
              <span className={styles.caret} aria-hidden="true" />
            </span>
          ) : null}
        </pre>
      </div>
      <MiniRoadmap milestone={milestone} state={panel} />
    </div>
  )
}

/** 화면 8 의 행 하나를 축소한 것 — 「근거 n / m」만 말한다 (`roadmap.tsx` 의 머리 주석과 같은 이유). */
function MiniRoadmap({ milestone, state }: { milestone: ReplayMilestone; state: ReturnType<typeof panelState> }) {
  const total = milestone.done_when.length
  const withEvidence = state.done.length
  const pct = total > 0 ? Math.round((withEvidence / total) * 100) : 0
  return (
    <div className={`card pad-sm col-tight ${styles.panel}`}>
      <span className="label">Roadmap · 같은 시각</span>
      <div className="row wrap">
        <span className="mono ink">{milestone.id}</span>
        <span className="ink">{milestone.title}</span>
      </div>
      <div className="row">
        <div
          className="bar grow"
          role="progressbar"
          aria-valuenow={withEvidence}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`완료 조건 ${total}개 중 근거 있는 것 ${withEvidence}개`}
        >
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="meta mono">근거 {withEvidence} / {total}</span>
      </div>
      <ul className={styles.criteria}>
        {milestone.done_when.map((c) => {
          const done = state.done.includes(c)
          //  🔴 진짜 Roadmap 행(`roadmap.tsx`)과 **같은 표**(`EVIDENCE_CHIP`)를 읽는다 — 랜딩의 축소판이 앱과 다른 얼굴이면
          //    심사위원이 [샘플 팀으로 둘러보기]로 들어갔을 때 같은 것을 두 번 배운다. 기호(✓/○) 대신 색점 + 「근거 있음/없음」 낱말 (2026-09-11).
          return (
            <li key={c} className="row wrap">
              <Chip spec={EVIDENCE_CHIP[done ? 'yes' : 'no']} />
              <span className={done ? 'ink' : 'meta'}>{c}</span>
            </li>
          )
        })}
      </ul>
      {/* 🔴 「마지막 보고」는 늘 있었던 일이다 — 「지금 이렇다」를 말하지 않는다 (DESIGN_BRIEF §2-3). */}
      <span className="meta mono">
        {state.reports === 0 ? '아직 보고가 없습니다' : `보고 ${state.reports}건 · v${state.version ?? '—'} 기준`}
      </span>
    </div>
  )
}
