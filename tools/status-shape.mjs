// =====================================================================
//  tools/status-shape.mjs — 루프 문서(`docs/STATUS.md`)가 **자기와 어긋나지 않는지**
//  센다. 루트 package.json 의 `docs:check` 스크립트가 부르고, `tools/ci.ps1` 의
//  `docs` 층과 `.github/workflows/ci.yml` 이 그 스크립트를 부른다.
//
//  ★ 왜 있나 (FINDINGS 102) — `STATUS.md` 는 「다음 바퀴의 유일한 기억」인데
//    **다음 할 일을 말하는 자리가 둘**이 됐고 둘이 다른 말을 했다. 머리는 「99」,
//    733줄의 `## 다음 바퀴가 할 일` 절은 「맨 위는 97 이다」 — **97 은 두 바퀴 전에
//    닫힌 항목**이었다. `loop/PROMPT.md` 는 이 파일을 「전체」 읽으라고 지목하므로,
//    아래까지 읽는 바퀴는 **닫힌 항목을 다시 연다.**
//    두 바퀴가 그 절을 지나쳤다 — **이 고장은 눈으로 안 잡힌다.** 그래서 게이트다.
//
//  ★ 무엇을 재나 — 「자리가 하나인가」와 「그 자리가 살아 있는 것을 가리키나」다.
//    ⚠ 문장을 읽지 않는다. 정해진 **한 줄의 모양**만 본다 — 산문을 파싱하기 시작하면
//      게이트가 문장을 고칠 때마다 빨개지고, 그러면 다음 사람이 게이트를 끈다.
//
//  종료 코드: 0 전부 통과 · 1 하나라도 어긋남
// =====================================================================
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

//  🔴 STATUS 가 들고 있어도 되는 「지난 바퀴」 기록의 수.
//     넘으면 제일 오래된 것을 `docs/history/cycles.md` 로 **옮긴다** (베끼지 않는다).
//     ★ 왜 상한이 필요한가 — 크기 자체는 고장이 아니다. 그런데 아무도 끝까지 안 읽는
//       길이가 되면 **아래쪽에 손이 안 닿고**, 손이 안 닿는 자리가 썩는다.
//       102 가 정확히 그렇게 났다 (200KB · 2,250줄 · 그중 900여 줄이 10~40바퀴 기록).
const STATUS_MAX_PAST_CYCLES = 5

const STATUS = 'docs/STATUS.md'
const FINDINGS = 'docs/feedback/FINDINGS.md'
const HISTORY = 'docs/history/cycles.md'

//  🔴 **다음 할 일을 말하는 유일한 줄의 모양.** STATUS 머리에 정확히 하나 있어야 한다.
//
//      **다음 바퀴의 일 — FINDINGS 102**
//      **다음 바퀴의 일 — FINDINGS 없음**   ← 대기가 하나도 없을 때
//
//  ⚠ 이 줄 뒤에 설명을 이어 쓰는 것은 자유다. 게이트는 **줄의 머리만** 본다.
//  ⚠ 「없음」은 거짓말을 강요하지 않으려고 있다 — 큐가 비면 그 바퀴의 일은
//    관통을 다시 돌려 **새로 찾는 것**이다 (`loop/PROMPT.md` ④3).
const NEXT_LINE = /^\*\*다음 바퀴의 일 — FINDINGS (\d+|없음)\*\*/gm

//  🔴 **모양이 조금 다른 「다음 바퀴의 일」도 잡는다.**
//    ★ 왜 (102 를 고치는 바퀴에 눈 판정으로 찾았다) — 지난 바퀴 기록 블록마다
//      `**다음 바퀴의 일**: FINDINGS 97 …` 같은 줄이 **그때의 지목**으로 남아 있었다.
//      `— FINDINGS` 가 아니라 `**:` 라서 위 정규식에는 안 걸리는데, **파일을 훑는
//      사람 눈에는 똑같이 보인다.** 102 의 고장이 정확히 그 모양이었다.
//      지나간 지목은 **다른 낱말**로 적어라 (「그 바퀴가 다음으로 지목한 것」).
const NEXT_LOOKALIKE = /^\*\*다음 바퀴의 일/

const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8')

const fails = []
const notes = []
const fail = (msg) => fails.push(msg)

const status = read(STATUS)
const findings = read(FINDINGS)

// ── ① 다음 할 일을 말하는 자리가 **하나**인가 ────────────────────────
const statusLines = status.split(/\r?\n/)
const hits = []
statusLines.forEach((line, i) => {
  NEXT_LINE.lastIndex = 0
  const m = NEXT_LINE.exec(line)
  if (m) hits.push({ line: i + 1, value: m[1] })
  else if (NEXT_LOOKALIKE.test(line)) {
    fail(
      `${STATUS}:${i + 1} 이 「다음 바퀴의 일」처럼 보이는데 모양이 다르다:\n` +
        `      ${line.slice(0, 60)}…\n` +
        `      정본 모양은 **다음 바퀴의 일 — FINDINGS <번호>** 하나뿐이다. ` +
        `지나간 바퀴의 지목이면 다른 낱말로 적어라 (「그 바퀴가 다음으로 지목한 것」) — ` +
        `같은 낱말이면 훑는 사람이 닫힌 항목을 집는다`,
    )
  }
})

if (hits.length === 0) {
  fail(
    `${STATUS} 에 「다음 바퀴의 일」 줄이 없다. 머리에 정확히 한 줄을 둬라:\n` +
      `      **다음 바퀴의 일 — FINDINGS <번호>**   (대기가 없으면 「FINDINGS 없음」)`,
  )
} else if (hits.length > 1) {
  fail(
    `${STATUS} 가 다음 할 일을 ${hits.length}곳에서 말한다 — 자리는 하나여야 한다:\n` +
      hits.map((h) => `      ${STATUS}:${h.line} → FINDINGS ${h.value}`).join('\n'),
  )
} else {
  notes.push(`다음 바퀴의 일 = FINDINGS ${hits[0].value} (${STATUS}:${hits[0].line})`)
}

// ── ② 그 자리가 **살아 있는 항목**을 가리키나 ────────────────────────
//  ★ 왜 — 102 의 고장은 「자리가 둘」이 아니라 **「닫힌 것을 가리킨다」**로 드러났다.
//    자리를 하나로 만들어도 그 하나가 썩으면 같은 일이 난다.
if (hits.length === 1 && hits[0].value !== '없음') {
  const n = hits[0].value
  //  FINDINGS 의 항목 머리는 `### N. <제목>` 이고 상태는 그 아래 첫 `- **상태**:` 다.
  const head = new RegExp(`^### ${n}\\. `, 'm')
  const at = head.exec(findings)
  if (!at) {
    fail(`${STATUS} 가 FINDINGS ${n} 을 가리키는데 ${FINDINGS} 에 「### ${n}.」 항목이 없다`)
  } else {
    const rest = findings.slice(at.index)
    const st = /^- \*\*상태\*\*: *(.+)$/m.exec(rest)
    if (!st) {
      fail(`${FINDINGS} 의 ${n} 번 항목에 「- **상태**:」 줄이 없다`)
    } else if (!st[1].startsWith('대기')) {
      fail(
        `${STATUS} 가 **이미 닫힌** FINDINGS ${n} 을 다음 할 일로 가리킨다 ` +
          `(상태: ${st[1].trim()}). 대기 중인 항목으로 바꿔라 — 이게 102 의 고장 그 자체다`,
      )
    } else {
      notes.push(`FINDINGS ${n} 상태 = 대기`)
    }
  }
}

// ── ③ `## ` 절 제목이 서로 다른가 · 「다음 바퀴」를 이름에 쓰지 않는가 ──
//  ★ 왜 — 102 의 STATUS 에는 `## 잰 것` 이 **두 번** 있었다. 같은 이름의 절이 둘이면
//    사람도 게이트도 어느 쪽이 정본인지 못 가린다.
//  ★ 왜 이름을 막나 — 「다음 바퀴가 할 일」이라는 **절**이 있으면 그 절이 ① 의
//    한 줄과 경쟁한다. 규칙을 더하는 대신 **자리를 없앤 것**을 잠근다.
const headings = statusLines
  .map((l, i) => ({ line: i + 1, text: l }))
  .filter((h) => h.text.startsWith('## '))
const seen = new Map()
for (const h of headings) {
  const name = h.text.slice(3).trim()
  if (seen.has(name)) fail(`${STATUS} 에 같은 절 제목이 둘이다: 「${name}」 (${seen.get(name)}줄 · ${h.line}줄)`)
  else seen.set(name, h.line)
  if (name.includes('다음 바퀴')) {
    fail(
      `${STATUS}:${h.line} 절 제목에 「다음 바퀴」가 있다: 「${name}」 — ` +
        `다음 할 일을 말하는 자리는 머리의 한 줄뿐이다 (① 참고)`,
    )
  }
}

// ── ④ 지난 바퀴 기록이 상한 안인가 · 옮긴 것이 두 곳에 있지 않은가 ────
const cyclesIn = (text) => {
  const set = new Set()
  //  37바퀴부터의 형식 · 그 이전(10~36바퀴)의 형식 둘 다 센다.
  for (const m of text.matchAll(/^### 지난 바퀴 \((\d+)\)/gm)) set.add(Number(m[1]))
  for (const m of text.matchAll(/^\*\*(\d+)바퀴 · /gm)) set.add(Number(m[1]))
  return set
}

const inStatus = cyclesIn(status)
if (inStatus.size > STATUS_MAX_PAST_CYCLES) {
  const oldest = [...inStatus].sort((a, b) => a - b).slice(0, inStatus.size - STATUS_MAX_PAST_CYCLES)
  fail(
    `${STATUS} 가 지난 바퀴 기록 ${inStatus.size}개를 들고 있다 (상한 ${STATUS_MAX_PAST_CYCLES}). ` +
      `제일 오래된 ${oldest.join('·')}바퀴를 ${HISTORY} 맨 위로 **옮겨라** (베끼지 마라)`,
  )
} else {
  notes.push(`STATUS 의 지난 바퀴 기록 ${inStatus.size}개 (상한 ${STATUS_MAX_PAST_CYCLES})`)
}

if (!existsSync(path.join(ROOT, HISTORY))) {
  if (inStatus.size > 0) fail(`${HISTORY} 가 없다 — 내려온 바퀴 기록이 갈 자리다`)
} else {
  const inHistory = cyclesIn(read(HISTORY))
  const both = [...inStatus].filter((n) => inHistory.has(n))
  //  ★ 왜 겹침을 막나 — 「옮겨라」를 「베껴라」로 하면 같은 기록이 두 곳에서 갈라진다.
  //    102 가 난 이유가 정확히 그것이다 (같은 역사를 두 형식으로 두 곳에 들고 있었다).
  if (both.length) fail(`${both.join('·')}바퀴 기록이 ${STATUS} 와 ${HISTORY} **양쪽에** 있다 — 옮기고 지워라`)
  else notes.push(`${HISTORY} 의 바퀴 기록 ${inHistory.size}개 · 겹침 0`)
}

// ── 한 줄 결과 ────────────────────────────────────────────────────
if (fails.length === 0) {
  console.log(`status-shape OK — ${notes.join(' · ')}`)
  process.exit(0)
}
console.error(`status-shape FAIL ${fails.length}건`)
for (const f of fails) console.error(`  ✗ ${f}`)
process.exit(1)
