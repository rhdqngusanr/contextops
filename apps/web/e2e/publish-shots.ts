// =====================================================================
//  관통의 `shotcopy` 단계 — 캡처를 **랜딩이 읽는 자리**로 옮긴다 (FINDINGS 131)
//
//    pnpm --filter web exec tsx e2e/publish-shots.ts
//
//  ★ 왜 옮기나 — `.ci/shots/` 는 **관통마다 통째로 지워진다**
//    (`tools/walkthrough.ps1` 첫머리). 랜딩이 거기서 읽으면 배포된 화면의 그림이
//    사라지거나, 더 나쁘게는 **낡은 그림이 남아 아무도 모른다.**
//    그래서 관통이 「방금 찍은 것」만 `apps/web/public/shots/` 로 옮기고,
//    랜딩은 이 폴더의 `manifest.json` 만 본다 — 화면 코드에 파일 이름을 적지 않는다.
//
//  ⚠ 이 폴더는 **저장소에 커밋된다.** 배포(Vercel)는 저장소에서 빌드하니까
//    커밋 안 하면 배포된 랜딩에 그림이 없다. 그래서 옮기는 장수를 적게 둔다
//    (`e2e/plan.ts` 의 `PUBLISHED`).
//
//  🔴 끝에 `검사 N개` 를 찍는다 — 관통이 그 수를 읽는다 (`count_log`).
// =====================================================================

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type ShotEntry, ShotsManifest } from '@contextops/schema'

import { PUBLISHED_SHOTS } from './plan'
import { decodePng, pixelDiff } from './png'
import { copySummary } from './report'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const shotsDir = join(webRoot, '..', '..', '.ci', 'shots')
const outDir = join(webRoot, 'public', 'shots')

/**
 * 랜딩이 읽는 한 줄. **파일 이름의 정본은 이 파일이 아니라 `plan.ts` 다.**
 * 🔴 **모양의 정본은 `@contextops/schema` 의 `ShotEntry` 하나다** — 랜딩이 같은 계약으로
 *   되판다. 여기서 모양을 따로 적으면 쓰는 쪽과 읽는 쪽이 조용히 갈린다 (FINDINGS 131).
 */
type ManifestEntry = ShotEntry

let ok = 0
let bad = 0
function check(name: string, pass: boolean, detail = ''): void {
  if (pass) ok++
  else bad++
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

mkdirSync(outDir, { recursive: true })

const entries: ManifestEntry[] = []
for (const shot of PUBLISHED_SHOTS) {
  const from = join(shotsDir, `${shot.name}.png`)
  const target = shot.publish
  if (target === null) continue

  //  ⚠ 「없으면 건너뛴다」로 두지 마라 — 그러면 `shots` 단계가 죽은 날에도 이 단계가
  //    초록이고, 랜딩은 **지난주 그림**을 계속 보여 준다. 그게 이 항목이 막는 상태다.
  const has = existsSync(from)
  check(`${shot.name}: 방금 찍은 캡처가 있다`, has, from)
  if (!has) continue

  const bytes = statSync(from).size
  check(`${shot.name}: 빈 파일이 아니다`, bytes > 5_000, `${bytes} bytes`)

  const to = join(outDir, target)
  //  🔴 **그림이 그대로면 안 옮긴다** (FINDINGS 161). 견주는 것은 파일 바이트가 아니라
  //     **픽셀**이다 — 같은 화면을 다시 찍어도 인코더가 몇 바이트를 다르게 쓸 수 있고,
  //     그걸 옮기면 코드와 무관한 diff 가 매 관통마다 커밋에 섞인다.
  //  ⚠ 반대로 픽셀이 하나라도 달라졌으면 **반드시** 옮긴다 — 랜딩이 지난주 그림을
  //    보여 주는 것이 이 단계가 막는 상태다 (FINDINGS 131).
  const diff = existsSync(to)
    ? pixelDiff(decodePng(readFileSync(to)), decodePng(readFileSync(from)))
    : null
  if (diff !== null && diff.changed === 0) {
    check(`${shot.name}: 그림이 그대로다 — 안 옮겼다`, statSync(to).size > 0, '달라진 픽셀 0개')
    entries.push({ file: `/shots/${target}`, src: shot.path, alt: shot.alt, width: shot.width, height: shot.height })
    continue
  }

  copyFileSync(from, to)
  const copied = existsSync(to) && statSync(to).size === bytes
  //  🔴 **얼마나 달라졌는지를 남긴다** — 「매 바퀴 그림이 바뀐다」를 짐작으로 두지 않으려고
  //     관통 로그에 수를 찍는다. 107바퀴까지 이 수를 아무도 안 쟀다 (FINDINGS 161).
  const why = diff === null
    ? '처음 옮긴다'
    : `달라진 픽셀 ${diff.changed}개 / ${diff.total} · 줄 ${diff.rows?.[0]}-${diff.rows?.[1]}`
  check(`${shot.name}: public/shots/${target} 로 옮겼다`, copied, why)

  entries.push({ file: `/shots/${target}`, src: shot.path, alt: shot.alt, width: shot.width, height: shot.height })
}

//  ⚠ 시각도 파일 크기도 적지 마라 — 캡처는 관통마다 몇 바이트씩 달라지므로, 그 수를 여기 적으면
//    manifest 가 **계획이 그대로인데도** 매 관통마다 바뀐다. 이 파일은 계획이 바뀔 때만 바뀌어야 한다.
//  🔴 **쓰기 전에 계약으로 판다** — 랜딩은 같은 계약으로 되판다 (`ShotsManifest`).
//    여기서 통과 못 할 것을 써 두면 터지는 자리가 관통이 아니라 **랜딩 빌드**가 된다.
const parsed = ShotsManifest.safeParse({ shots: entries })
check('manifest 가 ShotsManifest 계약을 지킨다', parsed.success,
  parsed.success ? '' : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '))
if (parsed.success) {
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(parsed.data, null, 2)}\n`, 'utf8')
}
check('manifest 에 계획한 장수가 다 있다', entries.length === PUBLISHED_SHOTS.length,
  `${entries.length}/${PUBLISHED_SHOTS.length}`)

console.log('')
console.log(copySummary(ok + bad, bad, outDir))
process.exit(bad > 0 ? 1 : 0)
