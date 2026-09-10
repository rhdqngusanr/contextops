import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// =====================================================================
//  글꼴을 저장소 안으로 들인다 — `public/fonts/` + `src/app/fonts.css` (DESIGN_BRIEF §3 「타이포」)
//
//    pnpm --filter web fonts:vendor
//
//  ★ 왜 스크립트로 들이나 — 배포된 화면이 시스템 글꼴(맑은 고딕·Apple SD Gothic)로 그려지면
//    어느 기계에서나 「기본값」으로 보이고, 그게 심사위원이 첫 3초에 읽는 인상이다. 그런데
//    ① 빌드가 네트워크에 기대면 오프라인에서 못 짓고(`globals.css` 머리의 원칙) ② 심사 기간에
//    CDN 이 막히면 글꼴이 통째로 빠진다. 그래서 **한 번 받아서 커밋**한다 — 빌드도 런타임도
//    네트워크를 안 탄다. 이 스크립트만 네트워크를 쓴다 (`og:image` 처럼 산출물을 커밋하는 도구다).
//
//  🔴 세 벌이고 전부 SIL OFL 1.1 이다 (원문은 `public/fonts/LICENSES.md` 에 같이 받는다):
//    · Pretendard Variable — 본문·UI (동적 서브셋 · 92조각 · jsDelivr 의 배포본 그대로)
//    · IBM Plex Sans KR 600 — 표제 h1·h2 (Google Fonts 가 자르는 unicode-range 조각 그대로 · 한 굵기만)
//    · JetBrains Mono 400/500 — 버전·해시·경로 (라틴 조각만 — 한글은 본문체가 맡는다)
//  ⚠ 조각 파일은 **이름을 `<family>.<n>.woff2` 로 바꿔** 둔다 — `unicode-range` 는 CSS 가 들고
//    있으니 차례만 지키면 짝이 안 갈린다. 원본 이름(해시)은 아무것도 말해 주지 않는다.
//  ⚠ 버전을 올릴 때는 아래 `SOURCES` 한 곳이다. 손으로 파일을 더하지 마라 — CSS 와 갈린다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(webRoot, 'public', 'fonts')
const cssOut = join(webRoot, 'src', 'app', 'fonts.css')

/** Google Fonts 는 UA 를 보고 woff2 + unicode-range 를 준다 — 오래된 UA 면 ttf 한 덩어리다. */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

type Source = {
  /** 폴더 이름이자 조각 파일 이름의 머리 */
  readonly family: string
  /** `@font-face` 목록을 주는 CSS */
  readonly css: string
  /** CSS 안의 상대 url 을 절대 주소로 펴는 기준 (Google 은 절대 주소라 필요 없다) */
  readonly base?: string
  /** 라이선스 원문 */
  readonly license: string
  readonly note: string
}

const PRETENDARD = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9'

const SOURCES: readonly Source[] = [
  {
    family: 'pretendard',
    css: `${PRETENDARD}/dist/web/variable/pretendardvariable-dynamic-subset.css`,
    base: `${PRETENDARD}/dist/web/variable/`,
    license: `${PRETENDARD}/LICENSE`,
    note: 'Pretendard Variable v1.3.9 — 본문·UI · orioncactus/pretendard',
  },
  {
    family: 'ibm-plex-sans-kr',
    css: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@600&display=swap',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsanskr/OFL.txt',
    note: 'IBM Plex Sans KR 600 — 표제(h1·h2) · Google Fonts',
  },
  {
    family: 'jetbrains-mono',
    css: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/OFL.txt',
    note: 'JetBrains Mono 400·500 — 버전·해시·경로 · Google Fonts',
  },
]

async function text(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

async function bytes(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'user-agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

/** `url(…)` 하나를 `/fonts/<family>/<family>.<n>.woff2` 로 바꾸고 받을 목록을 모은다. */
function relink(css: string, source: Source): { css: string; files: Array<{ url: string; name: string }> } {
  const files: Array<{ url: string; name: string }> = []
  const out = css.replace(/url\(([^)]+)\)/g, (_m, raw: string) => {
    const cleaned = raw.trim().replace(/^['"]|['"]$/g, '')
    const abs = source.base ? new URL(cleaned, source.base).toString() : cleaned
    if (!abs.endsWith('.woff2')) throw new Error(`woff2 가 아니다: ${abs}`)
    const name = `${source.family}.${files.length}.woff2`
    files.push({ url: abs, name })
    return `url(/fonts/${source.family}/${name})`
  })
  return { css: out, files }
}

async function main(): Promise<void> {
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const sections: string[] = []
  const licenses: string[] = ['# 글꼴 라이선스\n', '세 벌 모두 SIL Open Font License 1.1 이다. `scripts/vendor-fonts.ts` 가 원문을 여기 같이 받는다.\n']
  let total = 0

  for (const source of SOURCES) {
    const dir = join(outDir, source.family)
    mkdirSync(dir)
    const { css, files } = relink(await text(source.css), source)
    let size = 0
    //  조각이 92개다 — 여덟씩 받는다 (하나씩이면 분 단위다).
    for (let i = 0; i < files.length; i += 8) {
      const chunk = files.slice(i, i + 8)
      const bodies = await Promise.all(chunk.map((f) => bytes(f.url)))
      chunk.forEach((f, k) => {
        const body = bodies[k] as Buffer
        size += body.length
        writeFileSync(join(dir, f.name), body)
      })
    }
    total += size
    console.log(`  ${source.family}: 조각 ${files.length} · ${(size / 1024).toFixed(0)} KB`)
    sections.push(`/* ── ${source.note} — 조각 ${files.length} · 원본 ${source.css} ── */\n${css.trim()}\n`)
    licenses.push(`\n## ${source.note}\n\n출처: ${source.css}\n\n\`\`\`\n${(await text(source.license)).trim()}\n\`\`\`\n`)
  }

  const head = `/* =====================================================================
   글꼴 — \`scripts/vendor-fonts.ts\` 가 만든다. **손으로 고치지 마라.**
   조각은 \`public/fonts/<family>/\` 에 있고 라이선스는 \`public/fonts/LICENSES.md\` 다.
   ★ 왜 저장소 안인가 — 빌드도 심사 기간의 런타임도 네트워크를 안 탄다 (스크립트 머리말).
   ⚠ 글꼴 이름·굵기의 정본은 DESIGN_BRIEF §3 「타이포」다. 벌을 바꾸려면 스크립트의 SOURCES 한 곳.
   ===================================================================== */

`
  writeFileSync(cssOut, head + sections.join('\n'))
  writeFileSync(join(outDir, 'LICENSES.md'), licenses.join(''))
  console.log(`fonts — ${cssOut} · ${outDir} (${(total / 1024 / 1024).toFixed(1)} MB)`)
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
