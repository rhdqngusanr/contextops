import { traceLines } from '@contextops/compiler'

// =====================================================================
//  🔴 **「종이가 같은 말을 두 번 하지 않는가」의 정본** (FINDINGS 99 · 100)
//
//  ★ 무엇이 문제였나 — 항목 하나가 낸 줄들 안에서 **같은 문장이 글자까지 똑같이
//    두 번** 나왔다. 세 자리다:
//      ① `architecture` — `### {title}` 과 `- 책임: {responsibility}`
//         (제목이 ``${component} — ${responsibility}`` 였다)
//      ② `goal` — `- **{title}** — {data.outcome}` (제목과 outcome 이 같은 문자열이었다)
//      ③ `roadmap` — `- **{milestone_id} {title}**` (제목이 `M1 — …` 로 시작했다)
//    사람이 읽으면 「왜 같은 말을 또 하지」이고, agent 에게는 같은 문장을 두 번 실어
//    보내는 것이다. 다섯 블록 × 두 겹이면 종이의 절반이 메아리다.
//
//  ★ **왜 절마다 검사를 만들지 않았나** — 세 절이 각자 다른 모양으로 겹쳤는데 원인은
//    하나(씨앗의 제목 칸)다. 절마다 검사를 복사하면 넷째 절이 생겼을 때 아무도 안 센다.
//    **「항목 하나가 낸 줄에서 같은 조각이 두 번 나오나」** 하나로 세 절을 같이 잠근다.
//
//  ⚠ **템플릿을 씨앗에 맞춰 깎지 마라.** 제목이 데이터와 같은 것은 **이 픽스처의
//    선택**이지 템플릿의 잘못이 아니다 — 다른 팀의 항목은 제목이 다르다.
//    이 검사가 빨개지면 고칠 자리는 **씨앗의 제목 칸**이다.
//
//  ⚠ 이 검사가 잡는 것은 **문장**이 두 번 나오는 것이지 **낱말**이 겹치는 것이 아니다.
//    `**PL-M1 M1 — …**` 같은 낱말 겹침은 여기서 안 걸린다 (`PL-M1 M1` 이 조각 하나다).
//    그건 사람이 읽고 잡는다 — 여기서 잡으려고 기준을 낱말까지 내리면 `승인 성공률`
//    같은 정상적인 되풀이가 전부 빨개진다.
// =====================================================================

/**
 * 메아리로 셀 조각의 최소 길이(문자).
 *
 * ★ 왜 있나 — `경로`·`책임`·`지표` 같은 **꼬리표**는 한 항목 안에서 되풀이돼도
 *   메아리가 아니다. 짧은 것을 세면 이 검사가 늘 빨개지고, 늘 빨간 게이트는 꺼진다.
 * ⚠ 이 값을 올려서 초록을 만들지 마라 — 위 ①②③ 은 전부 10자를 훌쩍 넘는다.
 */
const MIN_ECHO_CHARS = 6

/**
 * **들어 있는 것**을 메아리로 셀 때의 최소 길이(문자). 위보다 훨씬 높다.
 *
 * 🔴 왜 따로 있나 — 짧은 조각은 **정상적으로** 긴 조각 안에 들어 있다:
 *   architecture 항목은 이름이 `payment` 이고 경로가 `src/payment/` 다. 6자 기준으로
 *   세면 그 넷이 전부 빨개진다 (실측 — 파일 5개 × 항목 4개 = 20건).
 * ⚠ 이 값을 내려서 「더 잡자」고 하지 마라. 잡히는 것은 이름과 경로뿐이고,
 *   **늘 빨간 게이트는 꺼진다.** 169 가 잡으려는 것(`…주간 성공률` ⊂ `…주간 성공률로 잰다`)은
 *   21자다 — 문장이지 이름이 아니다.
 */
const MIN_CONTAINED_ECHO_CHARS = 16

/**
 * 한 줄을 **사람이 읽는 조각**으로 자르는 자리들.
 *
 * ⚠ ` · ` 는 **앞뒤에 공백이 있을 때만** 자른다 — `승인·매입` 은 한 낱말이다.
 * ⚠ `. ` 는 문장 끝이다 (`append only 다. 여기서 계산이…` → 둘).
 */
const SPLIT_RE = / — | · |: |\. (?=\S)/

/** 조각 하나를 견줄 수 있는 모양으로 — 목록 표시·강조·따옴표는 뜻이 아니다. */
function normalize(fragment: string): string {
  return fragment
    .replace(/[`*_「」]/g, '')
    .replace(/^\s*(?:[-*>]|#{1,6})\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,·]$/, '')
}

/** 줄 하나 → 조각들. 역추적 태그는 사람이 읽는 글이 아니라 뺀다. */
function fragmentsOf(line: string): string[] {
  return line
    .replace(/<!--.*?-->/g, '')
    .split(SPLIT_RE)
    .map(normalize)
    .filter((f) => f.length >= MIN_ECHO_CHARS)
}

/** 한 항목이 한 파일에서 같은 문장을 두 번 적은 자리. */
export type Echo = {
  /** 그 항목의 id (`ctx:` 태그에서 읽는다) */
  itemId: string
  /** 어느 Pack 파일에서 났나 */
  path: string
  /** 두 번 나온 조각 */
  fragment: string
}

/** 「메아리를 세는 재료」 — 관통이 받아 든 Pack 파일 그대로다. */
export type PackFiles = ReadonlyMap<string, string>

/**
 * 🔴 Pack 을 훑어 **같은 문장을 두 번 적는 항목**을 낸다. 비어야 한다.
 *
 * ★ 블록을 나누는 것은 **`traceLines` 하나**다 (`compiler/src/tag.ts`) — 「이 줄은 어느
 *   항목에서 왔나」의 정본이고 화면 7 이 P7 을 보이는 데 쓰는 그 함수다. 여기서 다시
 *   나누면 정의가 둘이 되고, 한쪽만 고쳐지는 순간 이 검사가 딴 것을 재게 된다.
 * ⚠ **파일마다 따로 센다.** 같은 항목이 `CLAUDE.md`(Quick Map 한 줄)와
 *   `architecture.md`(블록)에 둘 다 서는 것은 메아리가 아니다 — 요약과 본문이다.
 */
export function findEchoes(files: PackFiles): Echo[] {
  const echoes: Echo[] = []
  for (const [path, text] of files) {
    const lines = text.split('\n')
    const painted = traceLines(text)
    /** 항목 id → 그 항목이 이 파일에서 낸 조각들 */
    const byItem = new Map<string, string[]>()
    for (let i = 0; i < lines.length; i++) {
      const itemId = painted.get(i)?.itemId
      if (itemId === undefined) continue
      byItem.set(itemId, [...(byItem.get(itemId) ?? []), ...fragmentsOf(lines[i] ?? '')])
    }
    for (const [itemId, fragments] of byItem) {
      const seen = new Set<string>()
      for (const f of fragments) {
        if (seen.has(f)) echoes.push({ itemId, path, fragment: f })
        seen.add(f)
      }
      //  🔴 **조각 하나가 다른 조각 안에 통째로 들어 있는 것도 메아리다** (FINDINGS 169).
      //  ★ 왜 더했나 — `body` 가 종이에 나가기 시작하자(FINDINGS 9) 씨앗이 제 `data` 를
      //    그대로 베끼고 **꼬리만 붙이는** 자리가 나왔다: `지표: PSP 장애 구간을 포함한 주간 성공률`
      //    옆에 `PSP 장애 구간을 포함한 주간 성공률로 잰다`. 글자가 하나 달라 위의 **같음** 검사는
      //    통과하고, 사람이 읽으면 같은 말이 두 번이다. 그 갈래를 여기서 잠근다.
      //  ⚠ 여기서도 고칠 자리는 **씨앗**이다 — 템플릿을 깎지 마라 (머리말의 그 이유 그대로).
      //  ⚠ 말을 **바꿔** 되풀이하는 것(`하루 1회 배치` ↔ `하루 한 번의 배치`)은 여기서 안 걸린다.
      //    그건 사람이 읽고 잡는다 — 기준을 낱말까지 내리면 이 게이트가 늘 빨개진다.
      const unique = [...seen]
      for (const short of unique) {
        if (short.length < MIN_CONTAINED_ECHO_CHARS) continue
        if (unique.some((long) => long !== short && long.includes(short))) {
          echoes.push({ itemId, path, fragment: short })
        }
      }
    }
  }
  return echoes
}
