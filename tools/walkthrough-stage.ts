import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// =====================================================================
//  tools/walkthrough-stage.ts — **관통 한 단계의 산출물 모양**의 정본 (FINDINGS 96)
//
//  ★ 왜 여기 있나 — 이걸 읽는 것은 `tools/walkthrough.ps1` 이다. 그 파일이
//    「관통의 계약」이라고 스스로 적어 뒀고, 그 계약의 나머지 절반(단계가 **무엇을
//    남기나**)이 지금까지 어디에도 없었다. 세 스크립트가 글자까지 같은 6줄을
//    각자 복사해 들고 있었고, 산출물 키는 셋 다 달랐다.
//    ⚠ `packages/schema` 에 두지 않는 이유 — 이건 **개발 도구**의 계약이지 제품의
//      계약이 아니다. 제품의 공개 API(`schema` 의 `index.ts`)에 개발 도구를 얹으면
//      의존 방향(`schema ← compiler ← web/plugin`)에 도구가 끼어든다.
//    ⚠ 그래서 `apps/web` 과 `plugin/contextops` **둘 다** 여기를 상대 경로로 들여온다.
//      번들에는 안 들어간다 — 번들 entry 는 `plugin/contextops/src/cli/main.ts` 하나다.
//
//  ★ 파일 이름을 부르는 쪽이 짓지 않는다 — `openStage('publish')` 가
//    `.ci/walkthrough-publish.json` 을 정한다. 예전엔 그 이름이 스크립트와
//    `walkthrough.ps1` **두 곳**에 손으로 적혀 있었다.
//
//  ★ 산출물에 `stage` 를 찍는다 — 관통이 「이 파일이 정말 이 단계의 것인가」를
//    본다. 손으로 만든 산출물은 그 칸이 없어서 **FAIL 한다.** 그게 이 정본을
//    지키는 게이트다 (문서가 아니라 게이트로 — CLAUDE.md).
//
//  새 관통 단계를 더하는 절차:
//    ① 스크립트에서 `openStage('<이름>')` 을 부른다
//    ② `check(...)` 로 잰 것을 쌓고 마지막에 `finish()` 의 반환값을 종료 코드로 쓴다
//    ③ `tools/walkthrough.ps1` 의 `$stages` 에 한 줄 (`count_json = $true`)
// =====================================================================

/** 단계가 잰 것 하나. 이 모양이 `walkthrough.ps1` 의 `count_json` 이 세는 것이다. */
export type WalkthroughCheck = { name: string; ok: boolean; detail: string }

export interface WalkthroughStage {
  /** 하나 재고 한 줄 찍는다. 로그가 곧 사람이 읽는 관통 기록이다. */
  check(name: string, ok: boolean, detail?: string): void
  /** 지금까지 잰 것 (읽기 전용 — 쌓는 문은 `check()` 하나다). */
  readonly checks: readonly WalkthroughCheck[]
  /**
   * 산출물을 쓰고 요약을 찍는다. 돌려주는 것은 **종료 코드**다 (0 통과 · 1 실패).
   * ★ 여기서 `process.exit()` 를 부르지 않는다 — 단계마다 뒷정리(서버 close ·
   *   임시 폴더 삭제)가 다르고, 그 자리를 뺏으면 부르는 쪽이 정리를 못 한다.
   * @param extra 그 단계만의 칸 (`coverage` · `pack` · `versions` …). `checks` 는 못 덮는다.
   */
  finish(extra?: Record<string, unknown>): number
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export function openStage(name: string): WalkthroughStage {
  const checks: WalkthroughCheck[] = []
  const relPath = `.ci/walkthrough-${name}.json`

  return {
    checks,

    check(checkName: string, ok: boolean, detail = ''): void {
      checks.push({ name: checkName, ok, detail })
      process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${checkName}${detail === '' ? '' : ` — ${detail}`}\n`)
    },

    finish(extra: Record<string, unknown> = {}): number {
      const failed = checks.filter((c) => !c.ok)
      const outPath = join(repoRoot, ...relPath.split('/'))
      mkdirSync(dirname(outPath), { recursive: true })
      //  `stage` 와 `checks` 는 계약이라 `extra` 뒤에 둔다 — 단계가 실수로 못 덮는다.
      writeFileSync(
        outPath,
        `${JSON.stringify({ at: new Date().toISOString(), ...extra, stage: name, checks }, null, 2)}\n`,
        'utf8',
      )
      process.stdout.write(`\n  검사 ${checks.length}개 · 실패 ${failed.length}개 → ${relPath}\n`)
      if (failed.length > 0) {
        process.stderr.write(`\n  관통이 ${failed.length}곳에서 막혔다: ${failed.map((f) => f.name).join(' · ')}\n`)
        return 1
      }
      return 0
    },
  }
}
