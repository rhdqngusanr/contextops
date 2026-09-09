import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// =====================================================================
//  `src/lib/web/sample-document.ts` 의 본문을 픽스처에서 다시 만든다 (INBOX H5).
//
//    pnpm --filter web sample:sync
//
//  ★ 왜 스크립트인가 — 브라우저는 `fixtures/` 를 못 읽어 글자를 코드에 옮겨 둬야 하는데, 옮긴 글자는
//    픽스처가 바뀌는 날 조용히 낡는다. 그래서 손으로 옮기지 않고 이 스크립트가 옮기고,
//    `test/web-sample-document.test.ts` 가 둘이 byte 로 같은지 잰다.
// =====================================================================

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const fixture = join(webRoot, '..', '..', 'fixtures', 'paylab-docs', 'goals.md')
const target = join(webRoot, 'src', 'lib', 'web', 'sample-document.ts')

const content = readFileSync(fixture, 'utf8')
const source = readFileSync(target, 'utf8')
const start = source.indexOf('  content: ')
const end = source.indexOf(',\n}', start)
if (start < 0 || end < 0) throw new Error('sample-document.ts 에서 content 칸을 못 찾았다')

//  ⚠ `String.prototype.replace` 의 치환 문자열을 쓰지 않는다 — 본문에 `$&` 가 있으면 뜻이 바뀐다.
const next = `${source.slice(0, start)}  content: ${JSON.stringify(content)}${source.slice(end)}`
writeFileSync(target, next, 'utf8')
console.log(`sample:sync — ${target} (${content.length}자)`)
