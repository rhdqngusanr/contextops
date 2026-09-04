import { describe, expect, it } from 'vitest'
import { compile } from '../src'
import { DOCS, type DocId, type DocVars } from '../templates'
import { ANCHOR, makeInput, makeItem } from './fixtures'

// =====================================================================
//  🔴 **파일 이름이 말하는 것을 본문도 말한다** (FINDINGS 91 · 97).
//
//  ★ 왜 이 시험이 있나 — `domain-refund.md` 의 본문이 「`# 도메인`」 → 「`## 이 도메인의
//    규칙`」 → 규칙 한 줄이었다. **「refund」라는 낱말이 파일 안에 하나도 없었다.**
//    어느 도메인인지 아는 길이 **파일 이름뿐**이라, 심사자가 한 파일만 화면에 띄우거나
//    agent 가 한 조각을 인용하는 순간 그 정보가 사라진다.
//    같은 지적이 두 번(91 · 97) 나왔다 — 그래서 규칙이 아니라 **게이트로 올린다**
//    (`CLAUDE.md` 「같은 지적이 두 번 나오면 게이트로」).
//
//  ⚠ 이 고장은 눈으로 안 잡힌다: 파일 이름이 옆에 있는 동안에는 멀쩡히 읽힌다.
//    그리고 **표에 문서를 하나 더할 때 똑같이 빠뜨린다** — 그래서 문서를 이름으로 세지 않고
//    `DOCS` 표에서 **찾는다**(slug 로 경로가 갈리는 문서가 대상이다).
// =====================================================================

/** slug 로 경로가 갈리는 문서 = 파일 이름이 정보를 나르는 문서. 여기가 이 시험의 대상이다. */
const SLUGGED = (Object.keys(DOCS) as DocId[]).filter((id) => DOCS[id].path('a') !== DOCS[id].path('b'))

function vars(title: string): DocVars {
  //  ⚠ `paths` 를 제목과 **다르게** 준다. scoped 의 frontmatter(`paths:`)가 제목을
  //    우연히 적어 주는 바람에 초록이 되는 것을 막는다 — 재는 것은 `title` 이다.
  return { projectName: '표본 프로젝트', version: '1.0.0', snapshotShort: 'abcd1234', title, paths: ['pp/qq'] }
}

describe('slug 로 갈라지는 문서는 머리말에서 제 이름을 말한다', () => {
  it('대상이 하나 이상이다 — 없으면 아래 시험이 아무것도 안 잰다', () => {
    expect(SLUGGED.length).toBeGreaterThan(0)
  })

  it.each(SLUGGED)('%s 의 머리말에 title 이 있다', (id) => {
    expect(DOCS[id].head(vars('zzname')).join('\n')).toContain('zzname')
  })
})

describe('🔴 컴파일 결과에서도 그렇다 (91 · 97 이 막힌 자리)', () => {
  //  ★ 91·97 의 조건을 그대로 만든다: `scope.kind:'domain'` 규칙만 있고 그 도메인의
  //    `domain` **항목은 없다** — 이름을 적을 사람이 아무도 없던 경우다.
  const result = compile(
    makeInput([
      ANCHOR,
      makeItem('policy', { scope: { kind: 'domain', value: 'refund' } }),
      makeItem('constraint', { scope: { kind: 'path', value: 'src/webhook' } }),
    ]),
  )

  function text(path: string): string {
    const file = result.files.find((f) => f.path === path)
    expect(file, `${path} 가 Pack 에 없다`).toBeDefined()
    return file?.text as string
  }

  it('domain 항목이 없어도 domain-refund.md 가 「refund」를 적는다', () => {
    expect(text('.claude/rules/domain-refund.md')).toContain('refund')
  })

  it('scoped-src-webhook.md 가 제목 줄에서 경로를 적는다 (frontmatter 말고)', () => {
    const body = text('.claude/rules/scoped-src-webhook.md').split('---\n')[2] as string
    expect(body).toContain('src/webhook')
  })
})
