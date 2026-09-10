import type { ReactNode } from 'react'
import { SOURCE_REF_KINDS, type SourceRef, type SourceRefKind } from '@contextops/schema'
import { Note } from './chips'

// =====================================================================
//  EvidenceLink — 근거를 숫자·판정 **옆에** 놓는 자리 (DESIGN_BRIEF §2-1 · §3)
//
//  🔴 「근거 없는 숫자·판정은 화면에 없다」가 이 제품의 첫 디자인 원칙이다.
//     그래서 근거를 그리는 함수가 하나여야 한다 — 화면마다 문자열을 조립하면
//     어느 화면에서는 커밋이 빠지고, 어느 화면에서는 줄 번호가 빠진다.
//
//  🔴 **코드 본문은 여기에 없다** (P1). 서버가 아는 것은 경로·줄·커밋뿐이고,
//     본문은 각자 로컬에 있다. 그래서 「로컬에서 열기」 안내만 붙는다.
//
//  ★ 새 SourceRef 종류를 더하는 절차 (화면 몫): 아래 `SRC_LABEL`·`SRC_FONT`·`SRC_MEANING` 에 한 줄씩.
//    `packages/schema` 의 `SOURCE_REF` 표에 값을 더하면 여기서 타입 검사가 막고,
//    `test/web-tables.test.ts` 가 「네 종류가 서로 다른 문자열을 낸다」로 다시 막는다.
// =====================================================================

/** 종류별 한 줄 라벨. 값이 달라지면 문자열이 달라져야 한다 — 시험이 그걸 잰다. */
export const SRC_LABEL: Record<SourceRefKind, (ref: SourceRef) => string> = {
  source_document: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'source_document' }>
    //  사람이 읽는 차례 (2026-09-10 저녁): 문서 제목(첫 제목) / 마지막 절 · 글자 범위 · #문서판 앞 8자 — 같은 제목의 다른 판을 가른다 (FINDINGS 87).
    const heads = r.heading_path
    const where = heads.length === 0
      ? ''
      : heads.length === 1 ? ` 「${heads[0] ?? ''}」` : ` 「${heads[0] ?? ''}」 / ${heads[heads.length - 1] ?? ''}`
    //  🔴 **어느 문서인지 말한다** (FINDINGS 87). 예전엔 「문서 §보안 · 2100–2260자」였고,
    //     화면 5·7 처럼 **다른 문서에서 온 근거가 나란히 놓이는 자리**에서 둘이 구별되지
    //     않았다 — P7 은 「항목 ID → 원문」인데 그 사슬이 사람 눈앞에서 끊긴다.
    //  ⚠ 문서 **제목**이 아니라 버전 id 앞 8자다. 제목까지 가려면 화면이 그 이름을 알아야
    //    하는데 응답에 없다 (문서 목록을 내는 문이 아직 없다 — 지어내지 않는다).
    //    `proposal` 이 이미 같은 모양이다 (`제안 c0ffee00`).
    //  🔴 **끝 8자 + 낱말** (2026-09-11) — 고정 씨앗의 id 는 앞 8자가 전부 0 이라 「0 여덟 개」가 빈 자리로 읽혔다. 진짜 uuid 는 앞뒤가 같이 무작위라 잃는 것이 없다.
    return `문서${where} · ${r.start_char}–${r.end_char}번째 글자 · 문서판 ${r.document_version_id.slice(-8)}`
  },
  repository_path: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'repository_path' }>
    //  줄 범위와 커밋은 있을 때만 붙인다 — 없는 것을 `?` 로 채우면 근거가 있는 척이 된다.
    const lines = r.start_line === undefined ? '' : `:${r.start_line}${r.end_line === undefined ? '' : `–${r.end_line}`}`
    const commit = r.commit_sha === undefined ? '' : ` · ${r.commit_sha.slice(0, 7)}`
    return `코드 ${r.repo}/${r.path}${lines}${commit}`
  },
  proposal: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'proposal' }>
    return `제안 번호 ${r.proposal_id.slice(-8)}`
  },
  manual: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'manual' }>
    //  「누가 적었나」를 사람 말로 — 앞말이 「사람 수가 적다」로도 읽혔다 (2026-09-11 · `PROGRESS_SOURCE_LABEL.manual` 과 같은 낱말).
    return `직접 적은 근거 · ${r.note}`
  },
}

export const SOURCE_REF_KEYS = SOURCE_REF_KINDS

/** 종류별 서체 — 한글 문장(문서 제목·절·직접 적은 메모)을 모노로 찍으면 글자 사이가 벌어져 「깨진 화면」으로 읽힌다 (2026-09-11). 경로·번호만 모노. */
export const SRC_FONT: Record<SourceRefKind, 'mono' | 'text'> = {
  source_document: 'text',
  repository_path: 'mono',
  proposal: 'mono',
  manual: 'text',
}

/** 툴팁 — 영어 값(`source_document`)이 그대로 떴다 (2026-09-11). 「어디서 왔나」를 사람 말로. */
export const SRC_MEANING: Record<SourceRefKind, string> = {
  source_document: '팀장이 올린 문서의 이 자리에서 왔습니다',
  repository_path: '개발자 저장소의 이 파일·줄에서 왔습니다 — 코드 내용은 서버에 없습니다',
  proposal: '개발자가 올린 변경 제안에서 왔습니다',
  manual: '사람이 손으로 적은 근거입니다',
}

/** 글자 범위(`841–964번째 글자`)가 「–」 뒤에서 접혀 두 값처럼 읽혔다 — 그 조각만 안 접히게 (2026-09-11). 문자열(`SRC_LABEL`)은 그대로다. */
function keepRanges(text: string): ReactNode[] {
  return text.split(/(\d+–\d+번째 글자)/).map((piece, i) => (
    /^\d+–\d+번째 글자$/.test(piece) ? <span key={i} className="evidence-range">{piece}</span> : piece
  ))
}

export function EvidenceLink({ ref: sourceRef }: { ref: SourceRef }) {
  return (
    <span className={SRC_FONT[sourceRef.kind] === 'mono' ? 'mono meta' : 'meta'} title={SRC_MEANING[sourceRef.kind]}>
      {keepRanges(SRC_LABEL[sourceRef.kind](sourceRef))}
    </span>
  )
}

/**
 * 근거 목록. **비어 있으면 비어 있다고 말한다** — 「근거 0」을 감추면
 * 근거 없는 항목이 있는 것처럼 보인다.
 */
export const CODE_STAYS_LOCAL = '코드 본문은 서버에 없습니다 — 개발자가 자기 컴퓨터에서 엽니다.'

/**
 * `heading` — 목록의 머리(「근거」). 호출처 넷 중 하나(충돌 카드)만 머리가 없어서 세 줄이 무엇인지 안 읽혔다 (2026-09-11).
 * 기본이 「근거」이고 `null` 이면 안 그린다.
 */
export function EvidenceList({ refs, heading = '근거' }: { refs: SourceRef[]; heading?: string | null }) {
  const head = heading === null ? null : <span className="label">{heading}</span>
  if (refs.length === 0) {
    return <div className="col-tight">{head}<Note tone="warn">근거 없음</Note></div>
  }
  return (
    <div className="col-tight">
      {head}
      {refs.map((r, i) => <EvidenceLink key={`${r.kind}-${i}`} ref={r} />)}
      {/* 「로컬에서 열어 보세요」는 개발자 말이고, 저장소가 없는 심사위원에게 할 수 없는 일을 시켰다 (2026-09-11). */}
      {refs.some((r) => r.kind === 'repository_path')
        ? <span className="meta">{CODE_STAYS_LOCAL}</span>
        : null}
    </div>
  )
}
