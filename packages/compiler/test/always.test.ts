import { Manifest, PRODUCT_TEXT_PACK_FILES } from '@contextops/schema'
import { describe, expect, it } from 'vitest'
import { compile, PROGRESS_REPORT } from '../src'
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
