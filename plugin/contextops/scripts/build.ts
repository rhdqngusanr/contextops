import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type BuildOptions } from 'esbuild'

// =====================================================================
//  `src/cli` → `bin/contextops-cli.mjs` 단일 ESM 번들 (docs/SPEC.md §1.2)
//
//  ★ 왜 번들인가 — 플러그인을 깐 사람은 `pnpm install` 을 하지 않는다.
//    Claude Code 는 `node "${CLAUDE_PLUGIN_ROOT}/bin/contextops-cli.mjs"` 를 부를 뿐이다.
//    의존이 하나라도 밖에 있으면 그 순간 「내 기계에서는 안 돈다」가 된다.
//
//  🔴 **설정은 이 파일 하나다.** 시험(`test/bundle.test.ts`)이 같은 옵션으로 다시 빌드해
//    커밋된 바이트와 대조한다 — 그래서 옵션을 두 곳에 적으면 시험이 영원히 빨갛다.
//    ⚠ 그러려면 산출이 **결정론**이어야 한다: 시각도 난수도 절대 경로도 들어가지 않게
//      `absWorkingDir` 를 저장소 안으로 고정하고 sourcemap 을 끈다.
// =====================================================================

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const BUNDLE_ENTRY = 'src/cli/main.ts'
export const BUNDLE_OUT = 'bin/contextops-cli.mjs'

export const BUNDLE_OPTIONS: BuildOptions = {
  absWorkingDir: packageRoot,
  entryPoints: [BUNDLE_ENTRY],
  bundle: true,
  format: 'esm',
  platform: 'node',
  //  .nvmrc(22)와 맞춘다. 낮추면 없는 문법으로 내려가고, 높이면 옛 노드에서 죽는다.
  target: 'node22',
  //  ⚠ minify 하지 마라 — 이 파일은 **사람이 열어 볼 수 있어야 한다.** 「서버로 뭘
  //    보내는지」를 확인하려는 사람에게 압축된 한 줄을 주는 것이 P1 의 정반대다.
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  banner: { js: '#!/usr/bin/env node' },
}

/** 번들 텍스트를 만든다. 파일로 쓰지 않는다 — 시험이 같은 함수를 쓴다. */
export async function bundleText(): Promise<string> {
  const result = await build({ ...BUNDLE_OPTIONS, write: false })
  const file = result.outputFiles?.[0]
  if (file === undefined) throw new Error('esbuild 가 산출물을 내지 않았다')
  return file.text
}

//  스크립트로 직접 부를 때만 파일을 쓴다 (시험은 위 함수만 부른다).
if (process.argv[1] !== undefined && process.argv[1].endsWith('build.ts')) {
  const { writeFileSync, mkdirSync } = await import('node:fs')
  const text = await bundleText()
  mkdirSync(join(packageRoot, 'bin'), { recursive: true })
  //  ⚠ LF 로 쓴다 — .gitattributes 가 저장소 안을 LF 하나로 잡는다. CRLF 로 쓰면
  //    Windows 에서 만든 번들과 리눅스에서 만든 번들이 영원히 다르다.
  writeFileSync(join(packageRoot, BUNDLE_OUT), text, 'utf8')
  process.stdout.write(`  ${BUNDLE_OUT} — ${text.length}바이트\n`)
}
