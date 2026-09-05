import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

// =====================================================================
//  관통이 임시 저장소에 심는 **값이 든 `.env`** — secret 유출 검사가 실제로 무언가를 재게
//  (FINDINGS 124 · 125)
//
//  ★ 왜 — 픽스처의 `.env.example` 은 **값이 0건**이어야 한다 (`tools/fixtures.mjs` ③ 이
//    잠근다 · 저장소에 secret 을 들이지 않는다). 그래서 그 파일의 값만 재던 예전 검사는
//    **잰 값이 0개**인 채로 63바퀴 내내 초록이었다 — 두 게이트가 서로를 무효화했다.
//    값은 관통이 **임시 사본**에 심고(픽스처는 그대로), 심은 값이 산출물 어디에도 없고
//    **키 이름은** 나갔는지 둘 다 본다.
//  ★ 왜 여기 있나 — scan 단계와 payload 단계가 **같은 값**을 심어야 한다. 표를 둘이 따로
//    들면 한쪽만 고쳐지고, 그 순간 「스캐너가 이 값을 안 나른다」는 두 단계의 증언이 서로
//    다른 값에 대한 것이 된다.
//  ⚠ 값은 진짜 secret 처럼 길고 유일하게 — 우연히 겹칠 수 없는 글자로.
// =====================================================================

export const PLANTED_ENV: Readonly<Record<string, string>> = {
  //  `.env.example` 에도 있는 키 — 값만 심는다
  PSP_A_API_KEY: 'sk_live_PLANTED_paylab_walkthrough_secret_7f3a9c1e',
  //  `.env` 에만 있는 키 — 스캐너가 이 파일을 실제로 열어 키만 꺼냈다는 증거
  SENTRY_DSN: 'https://PLANTED_walkthrough_dsn_4b8d2e6f@o0.ingest.sentry.io/0',
}

/** 이보다 짧은 env 값은 재지 않는다 — `0` · `true` 같은 값은 어디에나 우연히 있다. */
const ENV_VALUE_MIN_CHARS = 8

export type PlantedEnv = {
  /** 심은 키 이름 — 산출물에 **있어야** 한다 (SPEC §3.1 · 키 이름은 나가도 된다). */
  keys: string[]
  /** 산출물에 **없어야** 하는 값 전부 — 심은 값 + `.env.example` 의 값(있다면). */
  values: string[]
}

/**
 * 임시 저장소 `repoDir` 에 값이 든 `.env` 를 쓰고, 잴 값·키를 돌려준다.
 * ⚠ 부르는 쪽은 `values.length === 0` 을 **FAIL** 로 다뤄라 — 「잴 것이 없어서 초록」이
 *   이 표가 생긴 고장 그 자체다.
 */
export function plantEnv(repoDir: string): PlantedEnv {
  writeFileSync(
    join(repoDir, '.env'),
    `${Object.entries(PLANTED_ENV).map(([k, v]) => `${k}=${v}`).join('\n')}\n`,
    'utf8',
  )
  let values = Object.values(PLANTED_ENV)
  try {
    values = values.concat(readFileSync(join(repoDir, '.env.example'), 'utf8')
      .split('\n')
      .map((line) => line.split('=').slice(1).join('=').trim())
      .filter((value) => value.length >= ENV_VALUE_MIN_CHARS))
  } catch {
    /* 픽스처에 .env.example 이 없으면 심은 값만 잰다 */
  }
  return { keys: Object.keys(PLANTED_ENV), values }
}
