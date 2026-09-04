import { Manifest, PRODUCT_TEXT_PACK_FILES } from '@contextops/schema'
import { describe, expect, it } from 'vitest'
import { CompileError, compile, PROGRESS_REPORT } from '../src'
import { DOCS, type DocId } from '../templates'
import { ANCHOR, makeInput, makeItem } from './fixtures'

// =====================================================================
//  🔴 「항목이 없어도 나가는 문서」가 실제로 나가는가 (SPEC §4.3 · FINDINGS 43).
//
//  ★ 왜 이 시험이 있나 — 이 고장은 **눈으로 절대 안 잡힌다.** Pack 은 멀쩡히 만들어지고
//    화면은 「아직 보고가 없다」로 뜬다. workflow 항목이 하나도 없는 저장소만 조용히
//    진행 보고 방법을 못 배우고, 그 팀의 Roadmap 은 영원히 0건이다.
//
//  잠그는 것은 셋이다:
//    ① `always: true` 인 문서는 항목이 0개여도 Pack 에 있다
//    ② 그 경로가 계약(`PRODUCT_TEXT_PACK_FILES`)에 이름으로 적혀 있다 — P7 의 예외 표
//    ③ 항목이 붙으면 **같은 파일**에 들어간다 (문서가 둘로 갈라지지 않는다)
// =====================================================================

const ALWAYS = (Object.keys(DOCS) as DocId[]).filter((id) => DOCS[id].always === true)

describe('always 문서 (P7 의 예외 표)', () => {
  it('표에 하나 이상 있다 — 없으면 아래 시험들이 아무것도 안 잰다', () => {
    expect(ALWAYS.length).toBeGreaterThan(0)
  })

  it.each(ALWAYS)('%s 의 경로가 schema 의 PRODUCT_TEXT_PACK_FILES 에 있다', (id) => {
    expect([...PRODUCT_TEXT_PACK_FILES]).toContain(DOCS[id].path(''))
  })

  it.each(ALWAYS)('%s 는 항목이 하나도 없어도 Pack 에 나간다', (id) => {
    //  ANCHOR 는 mission 하나다 — always 문서로 가는 항목이 없는 snapshot 이다.
    const result = compile(makeInput([ANCHOR]))
    expect(result.files.map((f) => f.path)).toContain(DOCS[id].path(''))
  })
})

describe('진행 보고 문단 (SPEC §4.3)', () => {
  it('workflow 항목이 0개인 Pack 에도 있다 — 이게 FINDINGS 43 이 막힌 자리다', () => {
    const result = compile(makeInput([ANCHOR]))
    const workflow = result.files.find((f) => f.path === '.claude/rules/workflow.md')?.text as string
    for (const line of PROGRESS_REPORT) expect(workflow).toContain(line)
  })

  it('근거가 없으므로 source_item_ids 가 비고, 그래도 Manifest 가 계약을 지난다', () => {
    const result = compile(makeInput([ANCHOR]))
    const entry = result.manifest.files.find((f) => f.path === '.claude/rules/workflow.md')
    expect(entry?.source_item_ids).toEqual([])
    expect(Manifest.safeParse(result.manifest).success).toBe(true)
  })

  it('workflow 항목이 있으면 같은 파일에 함께 들어간다 (파일이 둘로 갈라지지 않는다)', () => {
    const result = compile(makeInput([ANCHOR, makeItem('workflow')]))
    const same = result.files.filter((f) => f.path === '.claude/rules/workflow.md')
    expect(same).toHaveLength(1)
    expect(same[0]?.text).toContain('ctx:item_t_workflow')
    for (const line of PROGRESS_REPORT) expect(same[0]?.text).toContain(line)
  })
})

// =====================================================================
//  🔴 **always 문서의 그림자 — 「빈 Pack」이 빈 것으로 안 보인다** (FINDINGS 80)
//
//  ★ 왜 이 파일인가 — 위의 시험이 잠근 것(「항목이 0개여도 workflow.md 는 나간다」)이
//    바로 `EMPTY_SNAPSHOT` 가드를 죽인 원인이다. 둘을 다른 파일에 두면 한쪽을 고치는
//    사람이 다른 쪽을 안 읽는다.
//
//  ⚠ 재는 것은 「던진다」가 아니라 **「무엇이 있으면 지나고 없으면 막히는가」**다 —
//    항목 하나만 뺐다 넣었다 하며 결과가 갈리는지 본다 (loop/PROMPT.md ④2-B ②단계).
// =====================================================================

describe('🔴 팀의 항목이 한 줄도 없는 Pack 은 나가지 않는다 (EMPTY_SNAPSHOT)', () => {
  it('snapshot 이 비면 막힌다 — always 문서가 파일 수를 채워도', () => {
    //  ⚠ 예전 조건(`files.length === 0`)은 여기서 **절대 참이 되지 않았다.**
    expect(compile(makeInput([ANCHOR])).files.length).toBeGreaterThan(0)
    expect(() => compile(makeInput([]))).toThrow(CompileError)
    try {
      compile(makeInput([]))
      expect.unreachable('빈 snapshot 이 컴파일됐다')
    } catch (err) {
      expect((err as CompileError).code).toBe('EMPTY_SNAPSHOT')
    }
  })

  it('🔴 항목이 있어도 **전부 제외되면** 똑같이 막힌다 (초안만 있는 프로젝트)', () => {
    //  ★ 이게 「항목 수를 세면 놓치는」 경우다. 승인 전 항목은 status 로 빠지고,
    //    open_question 은 타입으로 빠진다 — 둘 다 Pack 에 아무것도 안 남긴다.
    for (const items of [
      [makeItem('mission', { status: 'draft' })],
      [makeItem('policy', { status: 'review' }), makeItem('goal', { status: 'deprecated' })],
      [makeItem('open_question')],
    ]) {
      expect(() => compile(makeInput(items)), JSON.stringify(items.map((i) => [i.type, i.status])))
        .toThrow(/항목에서 온 줄이 하나도 없다/)
    }
  })

  it('항목 하나가 **살아나면 지난다** — 같은 입력에서 status 만 뒤집는다', () => {
    const draft = makeItem('mission', { status: 'draft' })
    expect(() => compile(makeInput([draft]))).toThrow(CompileError)

    const active = makeItem('mission', { status: 'active' })
    const result = compile(makeInput([active]))
    expect(result.manifest.files.some((f) => f.source_item_ids.length > 0)).toBe(true)
  })

  it('그래도 workflow.md 혼자서는 Pack 을 채우지 못한다 — 근거가 비어 있어서다 (P7)', () => {
    const result = compile(makeInput([ANCHOR]))
    const workflow = result.manifest.files.find((f) => f.path === '.claude/rules/workflow.md')
    expect(workflow?.source_item_ids).toEqual([])
    //  즉 「파일이 있다」는 「팀의 것이 있다」가 아니다. 가드가 재는 값이 이것이다.
    expect(result.manifest.files.filter((f) => f.source_item_ids.length > 0).length).toBeGreaterThan(0)
  })
})
