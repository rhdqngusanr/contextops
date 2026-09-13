'use client'

import { useState } from 'react'

import { DEMO_AI_PRESETS } from '../lib/demo/ai-presets'
import { ApiClientError } from '../lib/web/api'
import { runDemoAiOnce, type DemoAiOnceResult } from '../lib/web/queries'
import { AiBadge, ConflictKindChip, ConflictSeverityChip, Note } from './chips'
import { CONFLICT_HEADLINE } from './conflict-card'
import { ErrorState } from './states'

// =====================================================================
//  정리 화면 머리의 「AI 에게 지금 직접 찾게 해 보기」 — **게스트에게만** (SPEC §7.4 · 2026-09-13)
//
//  ★ 왜 있나 — 게스트가 보는 AI 산출물은 2026-09-07 의 기록 카드 3장뿐이었다. 카드가 스스로 「기록」이라고 정직하게 말하지만,
//    그러면 로그인 없는 사람은 AI 가 **도는** 장면을 한 번도 못 본다. 이 조각이 그 한 번이다 — 제품과 같은 프롬프트·같은 검증.
//  ★ 누르는 것은 **고른 메모**다 (`lib/demo/ai-presets.ts`). 자유 입력 칸이 아닌 이유는 그 표의 머리 주석.
//  🔴 **결과는 저장되지 않는다** — 화면이 손에 든 값이 전부이고, 그 사실을 첫 문단과 결과 꼬리가 둘 다 말한다.
//     「방금 AI 가 찾은 것」과 「9월 7일의 기록」이 한 화면에 섞여도 헷갈리지 않게 **어느 것이 어느 것인지** 문장이 말한다.
//  ⚠ 어느 쪽이 맞는지는 여기서도 정하지 않는다 — 결정 버튼이 없다(아래 기록 카드가 결정의 자리다).
//  ⚠ 상한에 닿으면(`RATE_LIMITED`·`BUDGET_EXCEEDED`) [다시 시도] 를 그리지 않는다 — 오늘은 다시 눌러도 같은 답이다.
// =====================================================================

/** 이 조각의 글자 — 정리 화면은 아직 한국어 한 벌이다 (docs/STATUS.md 「영어화가 안 된 것」). 숫자는 적지 않는다(상한의 정본은 서버 표). */
export const DEMO_AI_WORDS = {
  title: 'AI 에게 지금 직접 찾게 해 보기',
  lead: '아래 카드는 9월 7일에 AI 가 찾은 기록입니다. 이 팀에 새 메모 한 줄이 들어왔다고 치고 하나를 고르면, 같은 AI(Gemini)가 승인된 규칙과 어긋나는 곳을 지금 찾아 질문으로 올립니다. 결과는 저장되지 않고, 어느 쪽이 맞는지도 정하지 않습니다.',
  chosen: '넣어 본 메모',
  running: '찾는 중입니다 — 보통 5~15초 걸립니다.',
  none: '어긋나는 규칙을 찾지 못했습니다. AI 는 확실하지 않으면 내지 않습니다 — 다른 메모로 다시 해 보세요.',
  other: '부딪히는 규칙',
  question: 'AI 가 올린 질문',
  notSaved: '저장되지 않음',
  capped: '오늘 체험할 수 있는 횟수를 다 썼습니다. 아래 카드는 같은 AI 가 실제로 찾은 기록입니다.',
} as const

/** 결과 꼬리 한 줄 — 무엇을(모델) 얼마나(초 · 토큰 · 값) 썼고 무엇과 견줬는지. 부풀리지 않고 서버가 잰 값 그대로다. */
export function demoAiMeta(result: DemoAiOnceResult): string {
  const tokens = `입력 ${result.input_tokens.toLocaleString('ko-KR')} · 출력 ${result.output_tokens.toLocaleString('ko-KR')} 토큰`
  const cost = `약 $${result.cost_usd < 0.01 ? result.cost_usd.toFixed(3) : result.cost_usd.toFixed(2)}`
  return [
    result.model,
    `${(result.duration_ms / 1000).toFixed(1)}초`,
    tokens,
    cost,
    `승인된 규칙 ${result.compared}개와 견줌`,
    DEMO_AI_WORDS.notSaved,
  ].join(' · ')
}

/** 모양 넷 — 시험이 전부 그려서 읽는다 (`test/web-demo-ai-once.test.ts`). */
export type DemoAiOnceState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'running'; readonly preset: string }
  | { readonly phase: 'done'; readonly preset: string; readonly result: DemoAiOnceResult }
  | { readonly phase: 'failed'; readonly preset: string; readonly error: unknown }

/** 훅이 없는 조각 — 상태를 받아 그리기만 한다. */
export function DemoAiOnceView({ state, onPick }: { state: DemoAiOnceState; onPick: (preset: string) => void }) {
  const busy = state.phase === 'running'
  const chosen = state.phase === 'idle' ? undefined : DEMO_AI_PRESETS.find((p) => p.id === state.preset)
  return (
    <section className="card pad col-tight" data-demo-ai={state.phase} aria-busy={busy}>
      <div className="row-between">
        <h2 className="text-section">{DEMO_AI_WORDS.title}</h2>
        <AiBadge />
      </div>
      <p className="ink-2">{DEMO_AI_WORDS.lead}</p>
      <div className="row wrap">
        {DEMO_AI_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-sm"
            title={p.title}
            aria-pressed={chosen?.id === p.id}
            disabled={busy}
            onClick={() => onPick(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {chosen ? <p className="meta">{DEMO_AI_WORDS.chosen} — 「{chosen.title}」</p> : null}
      {state.phase === 'running' ? <p className="ink-2">{DEMO_AI_WORDS.running}</p> : null}
      {state.phase === 'failed' ? <DemoAiFailure preset={state.preset} error={state.error} onPick={onPick} /> : null}
      {state.phase === 'done' ? <DemoAiResult result={state.result} /> : null}
    </section>
  )
}

function DemoAiFailure({ preset, error, onPick }: { preset: string; error: unknown; onPick: (preset: string) => void }) {
  const capped = error instanceof ApiClientError && (error.code === 'RATE_LIMITED' || error.code === 'BUDGET_EXCEEDED')
  if (capped) return <Note tone="warn">{DEMO_AI_WORDS.capped}</Note>
  return <ErrorState error={error} retry={() => onPick(preset)} />
}

function DemoAiResult({ result }: { result: DemoAiOnceResult }) {
  return (
    <div className="col-tight">
      {result.conflicts.length === 0
        ? <p className="ink-2">{DEMO_AI_WORDS.none}</p>
        : result.conflicts.map((c, i) => (
          //  정리 카드와 같은 모양(`conflict-card` · 심각도 괘선)이되 결정 칸이 없다 — 저장되지 않는 결과라서.
          <article key={`${c.kind}-${c.other?.id ?? i}`} className="card pad-sm col-tight conflict-card" data-severity={c.severity}>
            <div className="row wrap">
              <ConflictKindChip kind={c.kind} />
              <ConflictSeverityChip severity={c.severity} />
              <AiBadge />
            </div>
            <h3 className="conflict-head">{CONFLICT_HEADLINE[c.kind]}</h3>
            {c.other ? <p><span className="label">{DEMO_AI_WORDS.other}</span> {c.other.title}</p> : null}
            <span className="label">{DEMO_AI_WORDS.question}</span>
            <p className="ink-2">{c.question}</p>
          </article>
        ))}
      <p className="meta">{demoAiMeta(result)}</p>
    </div>
  )
}

/** 화면이 쓰는 문 — 상태 넷을 들고 서버를 부른다. */
export function DemoAiOnce() {
  const [state, setState] = useState<DemoAiOnceState>({ phase: 'idle' })
  function pick(preset: string): void {
    setState({ phase: 'running', preset })
    runDemoAiOnce(preset).then(
      (result) => setState({ phase: 'done', preset, result }),
      (error: unknown) => setState({ phase: 'failed', preset, error }),
    )
  }
  return <DemoAiOnceView state={state} onPick={pick} />
}
