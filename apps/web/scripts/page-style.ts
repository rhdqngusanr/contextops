import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// =====================================================================
//  헤드리스 Chrome 으로 **그림을 그리는 스크립트**가 쓰는 화면 재료 — 색 토큰과 글꼴 (2026-09-14)
//
//  ★ 왜 파일이 따로 생겼나 — 사용자가 **둘**이 됐다: `og-image.ts`(링크 미리보기)와
//    `submission-cards.ts`(제출 갤러리 그림). 하나뿐일 때는 og-image.ts 안에 있는 것이 맞았다
//    (CLAUDE.md 「사용자가 하나뿐이면 만들지 마라 · 둘째가 생기면 그때 정본으로 올린다」).
//    베껴 두면 글꼴 경로를 펴는 법이나 토큰을 읽는 법이 한쪽에서만 바뀐다.
//  ★ 색의 정본은 여전히 `src/app/globals.css` 의 `:root` 하나다 — 여기는 그것을 **통째로 읽어** HTML 에 넣는다.
//    그래서 `test/design-tokens.test.ts` 가 막는 hex 리터럴을 스크립트가 새로 만들지 않는다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))

/** `globals.css` 의 첫 `:root { … }` — 토큰을 복사하지 않고 통째로 넣는다. */
export function rootTokens(): string {
  const css = readFileSync(join(webRoot, 'src', 'app', 'globals.css'), 'utf8')
  const block = /:root\s*\{[\s\S]*?\}/.exec(css)
  if (!block) throw new Error('globals.css 에 :root 블록이 없다')
  return block[0]
}

/**
 * `fonts.css` 의 `@font-face` — 조각 주소만 저장소의 `public/fonts/` 절대 `file://` 로 편다.
 * ⚠ 그래서 그림 HTML 은 `data:` 가 아니라 **임시 파일**로 두고 열어야 한다 — `data:` 문서는 `file://` 글꼴을 못 받는다.
 */
export function fontFaces(): string {
  const css = readFileSync(join(webRoot, 'src', 'app', 'fonts.css'), 'utf8')
  const publicUrl = pathToFileURL(join(webRoot, 'public')).toString()
  return css.replace(/url\(\/fonts\//g, `url(${publicUrl}/fonts/`)
}
