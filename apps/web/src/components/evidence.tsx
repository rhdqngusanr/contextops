import { SOURCE_REF_KINDS, type SourceRef, type SourceRefKind } from '@contextops/schema'

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
//  ★ 새 SourceRef 종류를 더하는 절차 (화면 몫): 아래 `SRC_LABEL` 에 한 줄.
//    `packages/schema` 의 `SOURCE_REF` 표에 값을 더하면 여기서 타입 검사가 막고,
//    `test/web-tables.test.ts` 가 「네 종류가 서로 다른 문자열을 낸다」로 다시 막는다.
// =====================================================================

/** 종류별 한 줄 라벨. 값이 달라지면 문자열이 달라져야 한다 — 시험이 그걸 잰다. */
export const SRC_LABEL: Record<SourceRefKind, (ref: SourceRef) => string> = {
  source_document: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'source_document' }>
    const head = r.heading_path.length > 0 ? ` §${r.heading_path.join(' › ')}` : ''
    return `문서${head} · ${r.start_char}–${r.end_char}자`
  },
  repository_path: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'repository_path' }>
    //  줄 범위와 커밋은 있을 때만 붙인다 — 없는 것을 `?` 로 채우면 근거가 있는 척이 된다.
    const lines = r.start_line === undefined ? '' : `:${r.start_line}${r.end_line === undefined ? '' : `–${r.end_line}`}`
    const commit = r.commit_sha === undefined ? '' : ` · ${r.commit_sha.slice(0, 7)}`
    return `${r.repo}/${r.path}${lines}${commit}`
  },
  proposal: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'proposal' }>
    return `제안 ${r.proposal_id.slice(0, 8)}`
  },
  manual: (ref) => {
    const r = ref as Extract<SourceRef, { kind: 'manual' }>
    return `사람이 적음 · ${r.note}`
  },
}

export const SOURCE_REF_KEYS = SOURCE_REF_KINDS

/** 종류별 앞머리 글자. 라벨만으로 구별이 안 되는 자리(좁은 칸)에서 쓴다. */
export const SRC_ICON: Record<SourceRefKind, string> = {
  source_document: '¶',
  repository_path: '⌘',
  proposal: '↗',
  manual: '✍',
}

export function EvidenceLink({ ref: sourceRef }: { ref: SourceRef }) {
  return (
    <span className="mono meta scroll-x" title={sourceRef.kind}>
      <span aria-hidden="true">{SRC_ICON[sourceRef.kind]}</span>{' '}
      {SRC_LABEL[sourceRef.kind](sourceRef)}
    </span>
  )
}

/**
 * 근거 목록. **비어 있으면 비어 있다고 말한다** — 「근거 0」을 감추면
 * 근거 없는 항목이 있는 것처럼 보인다.
 */
export function EvidenceList({ refs }: { refs: SourceRef[] }) {
  if (refs.length === 0) {
    return <span className="meta ink-warn">⚠ 근거 없음</span>
  }
  return (
    <div className="col-tight">
      {refs.map((r, i) => <EvidenceLink key={`${r.kind}-${i}`} ref={r} />)}
      {refs.some((r) => r.kind === 'repository_path')
        ? <span className="meta">코드 본문은 서버에 없습니다 — 로컬에서 열어 보세요.</span>
        : null}
    </div>
  )
}
