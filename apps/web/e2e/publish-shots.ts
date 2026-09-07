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

import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PUBLISHED_SHOTS } from './plan'
import { copySummary } from './report'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const shotsDir = join(webRoot, '..', '..', '.ci', 'shots')
const outDir = join(webRoot, 'public', 'shots')

/** 랜딩이 읽는 한 줄. **파일 이름의 정본은 이 파일이 아니라 `plan.ts` 다** */
type ManifestEntry = {
  file: string
  src: string
  alt: string
  width: number
  height: number
}

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
  copyFileSync(from, to)
  const copied = existsSync(to) && statSync(to).size === bytes
  check(`${shot.name}: public/shots/${target} 로 옮겼다`, copied)

  entries.push({ file: `/shots/${target}`, src: shot.path, alt: shot.alt, width: shot.width, height: shot.height })
}

//  ⚠ 시각도 파일 크기도 적지 마라 — 캡처는 관통마다 몇 바이트씩 달라지므로, 그 수를 여기 적으면
//    manifest 가 **계획이 그대로인데도** 매 관통마다 바뀐다. 이 파일은 계획이 바뀔 때만 바뀌어야 한다.
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify({ shots: entries }, null, 2)}\n`, 'utf8')
check('manifest 에 계획한 장수가 다 있다', entries.length === PUBLISHED_SHOTS.length,
  `${entries.length}/${PUBLISHED_SHOTS.length}`)

console.log('')
console.log(copySummary(ok + bad, bad, outDir))
process.exit(bad > 0 ? 1 : 0)
