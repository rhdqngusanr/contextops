import { Fragment, type ReactNode } from 'react'

import { SETUP_COMMAND_NAME } from '@contextops/schema'

// =====================================================================
//  안내 문장의 모양 — **할 일은 번호 걸음 · 이유는 접는다 · 명령은 떠 보인다** (DESIGN_BRIEF §3 「공통 컴포넌트」 · FINDINGS 177)
//
//  ★ 왜 생겼나 — 2026-09-15 사용자: 「명령들 텍스트를 눈에 잘 보이게 해 줘 — 지금은 엄청 긴 설명문 보는 느낌이야」.
//    화면마다 무엇을 하라는 문장(「이름을 적으세요」·「이 한 줄을 붙여넣으세요」)과 명령(`/contextops:sync`)이 설명과 같은
//    11.5px 회색 문단에 섞여 있었다. 시안 셋(굵은 한 줄 · 번호 걸음과 접는 설명 · 할 일 상자) 중 **번호 걸음과 접는 설명**을 골랐다.
//  🔴 **화면이 이 모양을 손으로 다시 짓지 않는다** — `ol`·`details` 를 화면마다 적으면 한 화면만 번호가 빠지고
//     한 화면만 설명이 펼쳐진 채로 남는다. 모양은 여기 하나, 문장은 각 화면의 문장 표(`SETUP_TEXT` · `ADD_DEVICE` …)다.
//     모양의 클래스 이름이 이 파일 밖(`globals.css` 제외)에 적히면 `test/web-guide.test.ts` 가 빨개진다.
//  ⚠ 접는 것은 **이유·배경**뿐이다. 누르기 전에 반드시 읽어야 하는 문장(토큰은 한 번만 보임 · AI 전송 고지 · 버튼이 잠긴 이유)은 접지 않는다.
//  ⚠ 훅이 없다 — 시험이 브라우저 없이 그린다.
// =====================================================================

/** 번호 걸음. 번호는 CSS 카운터가 매긴다 — 차례가 곧 번호라 손으로 적지 않는다. */
export function Steps({ label, children }: { label?: string; children: ReactNode }) {
  return <ol className="guide-steps" aria-label={label}>{children}</ol>
}

/**
 * 걸음 하나 — 제목(할 일)만 굵다.
 * ★ `htmlFor` 를 주면 제목이 곧 그 칸의 이름표다 — 「팀 이름」을 제목과 라벨로 두 번 적지 않는다.
 */
export function Step({
  title,
  htmlFor,
  optional,
  children,
}: {
  title: string
  htmlFor?: string
  /** 「선택」 같은 꼬리표 — 제목 옆에 흐리게 선다. */
  optional?: string
  children?: ReactNode
}) {
  const head = (
    <>
      {title}
      {optional ? <span className="guide-optional">{optional}</span> : null}
    </>
  )
  return (
    <li className="guide-step">
      <div className="guide-step-body">
        {htmlFor ? <label className="guide-step-title" htmlFor={htmlFor}>{head}</label> : <p className="guide-step-title">{head}</p>}
        {children}
      </div>
    </li>
  )
}

/** 접는 설명 — 질문(요약줄)만 보이고, 누르면 답이 펼쳐진다. 요약줄은 질문으로 적는다(「~되나요?」). */
export function Why({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="guide-why">
      <summary>{summary}</summary>
      <div className="guide-why-body">{children}</div>
    </details>
  )
}

/**
 * 복사해서 붙여넣을 명령 한 줄 — 검은 상자. 긴 줄은 상자 안에서 접히고, 복사 버튼은 부르는 쪽이 준다(상태를 들지 않는다).
 * ⚠ 바깥은 `scroll-x` 다 — 접을 곳이 없는 글자도 본문을 가로로 밀지 않게 (DESIGN_BRIEF §3 「레이아웃」).
 */
export function CommandBox({ command, action }: { command: string; action?: ReactNode }) {
  return (
    <div className="scroll-x">
      <div className="cmd-box">
        <code>{command}</code>
        {action}
      </div>
    </div>
  )
}

/**
 * 문장 속 명령의 머리 — `/contextops:`. 🔴 플러그인 이름을 여기서 적지 않는다: 정본은 스키마의 `SETUP_COMMAND_NAME`
 * (`/contextops:setup`)이고 이름 앞까지만 자른다 — 플러그인 이름이 바뀌면 이 줄이 저절로 따라간다.
 */
const COMMAND_HEAD = SETUP_COMMAND_NAME.slice(0, SETUP_COMMAND_NAME.indexOf(':') + 1)

/** 문장에서 명령(`/contextops:sync`)을 찾는 식. 괄호로 싸서 `split` 이 명령을 홀수 칸에 남긴다. */
export const COMMAND_IN_TEXT = new RegExp(`(${COMMAND_HEAD.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}[a-z][a-z-]*)`)

/**
 * 문장은 그대로 두고 **명령만 떠 보이게** 그린다 — 「Claude Code 에서 `/contextops:propose` 를 실행하면」.
 * ★ 문장을 쪼개 표에 따로 적지 않는 이유 — 빈 상태·요약 문장은 한 벌의 문장 표(`EMPTY_WORDS` 등)가 정본이고,
 *   명령을 칸으로 빼면 언어마다 어순이 달라 표가 둘로 갈린다. 그릴 때 찾는다.
 */
export function CommandText({ text }: { text: string }) {
  return (
    <>
      {text.split(COMMAND_IN_TEXT).map((part, i) => (
        i % 2 === 1 ? <code key={i} className="cmd-inline">{part}</code> : <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  )
}
